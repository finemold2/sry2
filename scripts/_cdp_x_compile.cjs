// 컴파일/내보내기 실사용 베타 — 박사급 QA/UX 관점.
// '코드리뷰'가 아니라 실제로 작가가 원고를 내보내는 상황을 그대로 조작한다:
//   · 컴파일 모달 전 형식(TXT/HTML/MD/Fountain/FDX/LaTeX/ODT/ePub/DOCX/PDF/RTF) 무크래시 + 결과(파일) 생성
//     (헤드리스라 a[download].click / window.open 을 스텁해 '진짜 내보내졌는지'를 캡처)
//   · 옵션 변경이 미리보기/결과에 반영, 각본 미리보기 토글, 낡은 '내보냄' 표시 초기화(오인 방지)
//   · 모달 첫 입력 자동 포커스, Esc 로 닫힘, 도구창 위에 모달이 뜸(가려지지 않음)
//   · 플랫폼별 발행(프리셋 변경·회차 분리·다운로드), 웹소설 독자뷰 미리보기(칩 전환·글자크기)
//   · 본문 없을 때 안내 + 내보내기 버튼 비활성화
// '상식적으로 당연한데 안 되는 것'은 [ISSUE] 로 출력하고 실패로 카운트한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// 내보낼 본문(RTF). 제목 표시가 켜져 있으면 미리보기에 <h2>제1장</h2> 헤딩이 생긴다.
const BODY_RTF = '{\\rtf1\\ansi\\deff0 \\pard 검증용 본문 첫 문장입니다. 둘 셋 넷.\\par 둘째 문단의 텍스트입니다.\\par 셋째 문단도 있습니다.\\par}'
// 빈 상태 검증용: 본문을 ''(빈 문자열)로 비운다. compile() 은 bodyRtf 가 truthy 면(빈 RTF 문서라도)
// docCount 를 올리므로, 진짜 빈 상태(documentCount 0)를 만들려면 bodyRtf 자체를 비워야 한다.
const EMPTY_RTF = ''
// run() 의 라벨과 다운로드 확장자(라벨은 컴파일 푸터 버튼 텍스트와 동일).
const FORMATS = [
  ['TXT', '.txt'], ['HTML', '.html'], ['Markdown', '.md'], ['Fountain', '.fountain'],
  ['FDX', '.fdx'], ['LaTeX', '.tex'], ['ODT', '.odt'], ['ePub', '.epub'],
  ['DOCX', '.docx'], ['RTF', '.rtf'],
]

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // 콘솔 에러/예외 캡처(클릭·입력만 하므로 Runtime.enable 안전 — 포인터 드래그 없음).
  const errs = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)

  const ok = [], bad = []
  const t = (c, m) => { if (c) { ok.push(m) } else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // 공통 헬퍼들
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setModal==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }
  const waitFor = async (expr, ms) => { const end = Date.now() + (ms || 3000); while (Date.now() < end) { let v = false; try { v = await ev(ws, sid, expr) } catch { /* transient */ } if (v) return true; await sleep(120) } return false }
  const modalText = () => ev(ws, sid, "return ((document.querySelector('.modal')||{}).textContent||'')")
  const clickByText = (scope, label) => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll(" + JSON.stringify(scope) + ")).find(function(x){return (x.textContent||'').trim()===" + JSON.stringify(label) + "});if(b){b.click();return true}return false")
  const footDisabled = (label) => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal-foot button')).find(function(x){return (x.textContent||'').trim()===" + JSON.stringify(label) + "});return b? !!b.disabled : null")
  const clickCheckbox = (sub) => ev(ws, sid, "var ls=[].slice.call(document.querySelectorAll('.modal label'));var l=ls.find(function(x){return (x.textContent||'').indexOf(" + JSON.stringify(sub) + ")>=0});if(l){var c=l.querySelector('input[type=checkbox]');if(c){c.click();return true}}return false")
  const setSelectValue = (scope, value) => ev(ws, sid, "var s=document.querySelector(" + JSON.stringify(scope) + ");if(!s)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s," + JSON.stringify(value) + ");s.dispatchEvent(new Event('change',{bubbles:true}));return true")
  const openModal = async (name) => { await ev(ws, sid, "window.__setModal(" + JSON.stringify(name) + ");return 1"); await sleep(380) }
  const closeModal = async () => { await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(220) }

  // ── 0) 로드 + 환영/투어 닫기 + 스텁/플래시 레코더 설치 + 본문 주입 ──────────────
  t(await waitHook(), '앱 로드 + 테스트 훅 준비')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  // 다운로드(a[download].click) / PDF 인쇄창(window.open) / 안내 플래시(scriv:flash) 를 캡처용으로 스텁.
  await ev(ws, sid,
    "window.__downloads=[];window.__opens=[];window.__flashes=[];" +
    "if(!window.__compileStub){window.__compileStub=true;" +
    "var _ac=HTMLAnchorElement.prototype.click;" +
    "HTMLAnchorElement.prototype.click=function(){if(this.download){window.__downloads.push({name:String(this.download),href:String(this.href||'')});return}return _ac.apply(this,arguments)};" +
    "window.open=function(){window.__opens.push(Date.now());var doc={write:function(){},close:function(){}};return {document:doc,focus:function(){},print:function(){},close:function(){},closed:false}};" +
    "window.addEventListener('scriv:flash',function(e){try{window.__flashes.push(String((e&&e.detail)||''))}catch(_){}})}" +
    "return 1")
  // 본문 주입(원고에 실제 문서 내용이 있어야 컴파일 대상이 생긴다).
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(120); await ev(ws, sid, "window.__scriv.setBody(" + JSON.stringify(BODY_RTF) + ");return 1"); await sleep(250)

  // ── 1) 컴파일 모달 기본 동작 ───────────────────────────────────────────────
  await openModal('compile')
  t(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')&&/컴파일/.test(((document.querySelector('.modal h2')||{}).textContent||''))"), '컴파일 모달 열림(.modal-backdrop + 제목)')
  // 모달 열면 첫 입력(컴파일 대상 select)에 포커스가 가야 한다.
  t(await ev(ws, sid, "var a=document.activeElement;return !!(a&&a.closest&&a.closest('.modal-backdrop')&&a!==document.body)"), '모달 열면 첫 입력에 자동 포커스(모달 내부 요소)')
  // 대상 문서 수가 본문 주입을 반영해야 한다(문서 1개 이상).
  const docCount = await ev(ws, sid, "var m=(((document.querySelector('.compile-opts')||{}).textContent||'').match(/문서\\s*(\\d+)\\s*개/));return m?+m[1]:-1")
  t(docCount >= 1, '컴파일 대상 문서 수가 본문 반영(문서 ' + docCount + '개)')

  // 각본(Fountain) 미리보기 토글 → <pre> 로 전환 + aria-pressed, 다시 일반으로 복귀.
  await clickByText('.modal button', '각본 미리보기'); await sleep(300)
  const scriptOn = await ev(ws, sid, "return !!document.querySelector('pre.compile-preview')&&!!document.querySelector('.modal button[aria-pressed=\"true\"]')")
  await clickByText('.modal button', '일반 미리보기'); await sleep(250)
  const scriptOff = await ev(ws, sid, "return !document.querySelector('pre.compile-preview')&&!!document.querySelector('div.compile-preview')")
  t(scriptOn && scriptOff, '각본 미리보기 토글(↔ 일반 미리보기, <pre> + aria-pressed)')

  // ── 2) 전 형식 내보내기(무크래시 + 결과 파일 생성) ────────────────────────────
  await ev(ws, sid, "window.__downloads=[];return 1")
  const errBeforeExports = errs.length
  for (const [label, ext] of FORMATS) {
    const clicked = await clickByText('.modal-foot button', label)
    const got = await waitFor("return (window.__downloads||[]).some(function(d){return (d.name||'').toLowerCase().endsWith(" + JSON.stringify(ext.toLowerCase()) + ")})", 6000)
    t(clicked && got, '컴파일 ' + label + ' 내보내기(무크래시 + ' + ext + ' 파일 생성)')
  }
  // PDF: 헤드리스라 인쇄창(window.open) 스텁 호출 + 안내 플래시.
  const opensBefore = await ev(ws, sid, "return (window.__opens||[]).length")
  await clickByText('.modal-foot button', 'PDF')
  const pdfOpened = await waitFor("return (window.__opens||[]).length > " + opensBefore, 4000)
  const pdfFlash = await waitFor("return (window.__flashes||[]).some(function(s){return /PDF\\s*인쇄\\s*창/.test(s)})", 4000)
  t(pdfOpened && pdfFlash, 'PDF 내보내기(인쇄창 window.open 호출 + 안내 표시)')
  // 내보내기 도중 콘솔 에러/예외가 없어야 한다.
  t(errs.length === errBeforeExports, '전 형식 내보내기 중 콘솔 에러/예외 없음(' + (errs.length - errBeforeExports) + '건)')
  // 성공 시 '내보냄' 표시가 떠야 한다.
  t(await waitFor("return /내보냄/.test(((document.querySelector('.modal')||{}).textContent||''))", 3000), '내보내기 성공 후 ‘내보냄’ 표시가 보임')

  // ── 3) 옵션 변경 반영 ────────────────────────────────────────────────────
  // (a) 옵션을 바꾸면 직전 '내보냄' 성공표시가 사라져 낡은 결과를 방금 내보낸 것으로 오인하지 않게 한다.
  const hadMsg = await waitFor("return /내보냄/.test(((document.querySelector('.modal')||{}).textContent||''))", 2000)
  await clickCheckbox('활자 치환'); await sleep(200)
  const clearedMsg = await waitFor("return !/내보냄/.test(((document.querySelector('.modal')||{}).textContent||''))", 3000)
  t(hadMsg && clearedMsg, '옵션 변경 시 직전 ‘내보냄’ 표시 초기화(낡은 결과 오인 방지)')
  // (b) '제목 표시'를 끄면 미리보기에서 제목 헤딩이 사라져야 한다.
  const hBefore = await ev(ws, sid, "var p=document.querySelector('.compile-preview');return p?p.querySelectorAll('h1,h2,h3,h4').length:0")
  await clickCheckbox('제목 스타일로 포함'); await sleep(300)
  const hAfter = await ev(ws, sid, "var p=document.querySelector('.compile-preview');return p?p.querySelectorAll('h1,h2,h3,h4').length:0")
  t(hBefore >= 1 && hAfter === 0, '옵션(제목 표시 끄기) 변경이 미리보기에 반영(제목 헤딩 ' + hBefore + '→' + hAfter + ')')
  await clickCheckbox('제목 스타일로 포함'); await sleep(150) // 복원

  // ── 4) Esc 로 모달 닫힘 ─────────────────────────────────────────────────
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return 1"); await sleep(320)
  t(!(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')")), 'Esc 로 컴파일 모달이 닫힘')

  // ── 5) 도구창 위에 컴파일 모달이 떠야 한다(가려지지 않음) ──────────────────────
  for (const id of ['name-mixer', 'character-forge', 'plot-twist-deck']) { await ev(ws, sid, "window.__openTool(" + JSON.stringify(id) + ");return 1"); await sleep(380) }
  const maxToolZ = await ev(ws, sid, "return Math.max.apply(null,[].slice.call(document.querySelectorAll('.toolwin')).map(function(w){return parseInt(getComputedStyle(w).zIndex||'0',10)||0}).concat([0]))")
  await openModal('compile')
  const modalZ = await ev(ws, sid, "var b=document.querySelector('.modal-backdrop');return b?parseInt(getComputedStyle(b).zIndex||'0',10)||0:-1")
  const centerOnTop = await ev(ws, sid, "var el=document.elementFromPoint(Math.round(innerWidth/2),Math.round(innerHeight/2));if(!el)return false;return !!el.closest('.modal-backdrop')&&!el.closest('.toolwin')")
  t(modalZ > maxToolZ && centerOnTop, '도구창 위에 컴파일 모달이 뜸(modalZ ' + modalZ + ' > toolZ ' + maxToolZ + ', 중앙 최상위=' + centerOnTop + ')')
  await closeModal()
  for (const id of ['name-mixer', 'character-forge', 'plot-twist-deck']) { await ev(ws, sid, "window.__closeTool(" + JSON.stringify(id) + ");return 1"); await sleep(100) }

  // ── 6) 플랫폼별 발행 내보내기 ─────────────────────────────────────────────
  await openModal('platformPublish')
  const pubOpen = await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')&&/플랫폼별 발행/.test(((document.querySelector('.modal h2')||{}).textContent||''))")
  const pubText0 = await ev(ws, sid, "var ta=document.querySelector('.modal textarea');return ta?(ta.value||''):''")
  t(pubOpen && pubText0.trim().length > 0, '플랫폼별 발행 모달 열림 + 미리보기 텍스트 생성')
  // 프리셋(대상 플랫폼) 변경 → 평문(문피아) → HTML(노벨피아) 로 출력이 바뀌어야 한다.
  await setSelectValue('.modal select.field', 'novelpia'); await sleep(350)
  const pubText1 = await ev(ws, sid, "var ta=document.querySelector('.modal textarea');return ta?(ta.value||''):''")
  t(pubText1 !== pubText0 && /</.test(pubText1), '대상 플랫폼 변경이 출력에 반영(평문→HTML 태그 포함)')
  // 회차(문서)별 분리 → 회차별 복사/다운로드 UI + 실제 다운로드 동작.
  await clickCheckbox('회차'); await sleep(350)
  const epUI = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal .minibtn')).some(function(b){return (b.textContent||'').trim()==='다운로드'})")
  await ev(ws, sid, "window.__downloads=[];return 1")
  await clickByText('.modal .minibtn', '다운로드')
  const epDl = await waitFor("return (window.__downloads||[]).length>0", 4000)
  t(epUI && epDl, '플랫폼 발행 회차별 분리 UI + 회차 다운로드 동작')
  await closeModal()

  // ── 7) 웹소설 플랫폼 독자뷰 미리보기 ───────────────────────────────────────
  await openModal('platformPreview')
  const prevOpen = await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')&&/독자뷰 미리보기/.test(((document.querySelector('.modal h2')||{}).textContent||''))")
  const prevBody = await ev(ws, sid, "return document.querySelectorAll('.modal p').length>0")
  t(prevOpen && prevBody, '독자뷰 미리보기 열림 + 회차 본문 렌더(빈 상태 아님)')
  // 플랫폼 칩(노벨피아) 전환 → active 표시.
  await clickByText('.modal .minibtn', '노벨피아'); await sleep(250)
  const chipActive = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal .minibtn')).find(function(x){return (x.textContent||'').trim()==='노벨피아'});return !!(b&&/\\bactive\\b/.test(b.className))")
  t(chipActive, '독자뷰 플랫폼 칩 전환(노벨피아 활성화)')
  // 글자크기 A+ → 표시 px 증가.
  const pxBefore = await ev(ws, sid, "var sp=[].slice.call(document.querySelectorAll('.modal span')).find(function(x){return /^\\d+px$/.test((x.textContent||'').trim())});return sp?parseInt(sp.textContent,10):0")
  await clickByText('.modal .minibtn', 'A+'); await sleep(250)
  const pxAfter = await ev(ws, sid, "var sp=[].slice.call(document.querySelectorAll('.modal span')).find(function(x){return /^\\d+px$/.test((x.textContent||'').trim())});return sp?parseInt(sp.textContent,10):0")
  t(pxBefore > 0 && pxAfter > pxBefore, '독자뷰 글자크기 A+ 반영(' + pxBefore + 'px→' + pxAfter + 'px)')
  await closeModal()

  // ── 8) 본문 없을 때 안내 + 내보내기 버튼 비활성화 ─────────────────────────────
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(120); await ev(ws, sid, "window.__scriv.setBody(" + JSON.stringify(EMPTY_RTF) + ");return 1"); await sleep(250)
  await openModal('compile')
  const emptyWarn = /문서를 선택|포함된 문서가 없|대상에 문서가 없|선택한 문서가 없습니다|비활성화되어 있습니다/.test(await modalText())
  const rtfOff = await footDisabled('RTF')
  const txtOff = await footDisabled('TXT')
  const pdfOff = await footDisabled('PDF')
  t(emptyWarn && rtfOff === true && txtOff === true && pdfOff === true, '본문 없을 때 안내 표시 + 내보내기 버튼(RTF/TXT/PDF) 비활성화')
  await closeModal()

  console.log('=== 컴파일/내보내기 실사용 베타 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
