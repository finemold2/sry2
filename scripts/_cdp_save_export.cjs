// 저장/내보내기/백업 라이프사이클 실동작 검증(양 스킨) — ⌘S 저장(dirty 정리), 컴파일 모달 전 형식
// 내보내기 무크래시, .sry 내보내기 명령 생존, 백업 생성→복원→삭제, 프로젝트 목록 현재표시/삭제 가드.
// 클릭/입력 기반(드래그 없음)이므로 Runtime.enable 로 콘솔/예외를 캡처해 '무크래시' 를 단언한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 내보내기 형식 버튼(컴파일 모달 하단). 헤드리스라 실제 다운로드 대신 빌드 경로만 돌리고 예외/콘솔에러 0 을 본다.
const FORMATS = ['TXT', 'HTML', 'Markdown', 'Fountain', 'FDX', 'LaTeX', 'ODT', 'ePub', 'DOCX', 'PDF', 'RTF']
// 본문이 비면 모든 형식 버튼이 disabled 가 되므로, 검증 전 활성 문서에 실제 RTF 본문을 넣어 documentCount>0 보장.
const SAMPLE_RTF = '{\\rtf1\\ansi\\ansicpg949\\deff0{\\fonttbl{\\f0 Malgun Gothic;}}\\f0 Export lifecycle test body. 내보내기 본문 테스트입니다.\\par}'

// PDF 는 새 창(window.open)+print 를 띄우므로 헤드리스 안정성을 위해 open 을 무해 스텁으로 대체.
const STUB_DIALOGS =
  "window.confirm=function(){return true};window.alert=function(){};" +
  "window.open=function(){return {document:{write:function(){},close:function(){}},focus:function(){},print:function(){},closed:false}};return 1"

// 현재 떠 있는 모달을 제목(h2)으로 식별 — 모달 스택/스킨에 무관하게 안정적.
const modalByTitle = (re) => "var hs=[].slice.call(document.querySelectorAll('.modal h2'));return hs.some(function(h){return /" + re + "/.test(h.textContent||'')})"

async function clickBtnByText(ws, sid, scopeSel, text) {
  return ev(ws, sid,
    "var s=document.querySelector(\"" + scopeSel + "\");if(!s)return false;" +
    "var b=[].slice.call(s.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()==='" + text + "'&&!x.disabled});" +
    "if(b){b.click();return true}return false")
}

async function runSkin(ws, sid, skin, t, errs) {
  // ── 0) 환영/투어 닫기 ──
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, STUB_DIALOGS)
  await ev(ws, sid, "window.__setView&&window.__setView('editor');window.__setModal&&window.__setModal(null);return 1"); await sleep(250)

  // ── 1) ⌘S 저장: dirty(true)→저장→dirty(false) ──
  await ev(ws, sid, "window.__scriv.setBody(" + JSON.stringify(SAMPLE_RTF) + ");return 1"); await sleep(150)
  const dirtyBefore = await ev(ws, sid, "return window.__scriv.state().dirty===true")
  errs.length = 0
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}));return 1")
  let saved = false
  for (let i = 0; i < 25; i++) { await sleep(160); if (await ev(ws, sid, "return window.__scriv.state().dirty===false")) { saved = true; break } }
  t(dirtyBefore && saved && errs.length === 0, '[' + skin + '] ⌘S 저장 → dirty true→false(무에러)')

  // ── 2) 컴파일 모달: 본문 있음 → 형식 버튼 활성 ──
  errs.length = 0
  await ev(ws, sid, "window.__setModal('compile');return 1"); await sleep(450)
  const compileOpen = await ev(ws, sid, modalByTitle('컴파일'))
  const notEmpty = await ev(ws, sid, "var s=document.querySelector('.modal-foot');if(!s)return false;var b=[].slice.call(s.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()==='TXT'});return !!b&&!b.disabled")
  t(compileOpen && notEmpty, '[' + skin + '] 컴파일 모달 열림 + 본문 있어 형식 버튼 활성')

  // ── 3) 전 형식 내보내기 무크래시(예외/콘솔에러 0) ──
  let clicked = 0
  for (const f of FORMATS) {
    if (await clickBtnByText(ws, sid, '.modal-foot', f)) clicked++
    await sleep(600) // docx/epub/odt 는 비동기 빌드
  }
  const stillOpen = await ev(ws, sid, modalByTitle('컴파일'))
  t(clicked >= FORMATS.length - 1 && stillOpen && errs.length === 0, '[' + skin + '] 형식 ' + clicked + '/' + FORMATS.length + ' 내보내기 클릭 무크래시(모달 생존·에러0)')

  // ── 4) 다운로드 형식 성공 피드백(lastMsg "내보냄") ──
  await clickBtnByText(ws, sid, '.modal-foot', 'RTF'); await sleep(500)
  const okMsg = await ev(ws, sid, "var d=document.querySelector('.modal');return !!d&&/내보냄/.test(d.textContent||'')")
  t(okMsg, '[' + skin + '] RTF 내보내기 성공 메시지 표시(내보냄)')

  // ── 5) 작성자 입력(localStorage 영속) — 사소한 컨트롤까지 ──
  await ev(ws, sid,
    "var i=document.querySelector('.modal input[aria-label=\"작성자\"]');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'테스트저자');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(200)
  const authorSaved = await ev(ws, sid, "try{return localStorage.getItem('compile.author')==='테스트저자'}catch(e){return false}")
  t(authorSaved, '[' + skin + '] 컴파일 작성자 입력 localStorage 영속')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(250)

  // ── 6) .sry 내보내기 명령 생존(팔레트에서 검색되는지) — 다운로드 전환은 실행하지 않음 ──
  errs.length = 0
  await ev(ws, sid, "window.__setModal('palette');return 1"); await sleep(350)
  await ev(ws, sid, "var i=document.querySelector('.cmd-input');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'.sry');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(350)
  const srySurvives = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.cmd-title')).some(function(x){return /\\.sry 파일로 내보내기/.test(x.textContent||'')})")
  t(srySurvives && errs.length === 0, '[' + skin + '] .sry 파일로 내보내기 명령 생존(팔레트)')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(250)

  // ── 7) 백업 생성 → 행 출현 ──
  errs.length = 0
  await ev(ws, sid, "window.__setModal('backup');return 1"); await sleep(450)
  t(await ev(ws, sid, modalByTitle('백업')), '[' + skin + '] 백업 모달 열림')
  await clickBtnByText(ws, sid, '.modal', '지금 백업')
  let backupRows = 0
  for (let i = 0; i < 25; i++) { await sleep(200); backupRows = await ev(ws, sid, "return document.querySelectorAll('.modal .snap-item .snap-actions').length"); if (backupRows >= 1) break }
  const backupMsg = await ev(ws, sid, "var d=document.querySelector('.modal');return !!d&&/백업/.test(d.textContent||'')")
  t(backupRows >= 1 && backupMsg && errs.length === 0, '[' + skin + '] 백업 생성 → 목록 행 출현(' + backupRows + ')')

  // ── 8) 백업 삭제 가드: 삭제 시 행 감소 ──
  const beforeDel = await ev(ws, sid, "return document.querySelectorAll('.modal .snap-item .snap-actions').length")
  await ev(ws, sid, "var r=document.querySelector('.modal .snap-item .snap-actions .danger');if(r)r.click();return 1")
  let afterDel = beforeDel
  for (let i = 0; i < 20; i++) { await sleep(180); afterDel = await ev(ws, sid, "return document.querySelectorAll('.modal .snap-item .snap-actions').length"); if (afterDel < beforeDel) break }
  t(afterDel < beforeDel, '[' + skin + '] 백업 삭제 → 행 감소(' + beforeDel + '→' + afterDel + ')')

  // ── 9) 백업 복원: confirm 스텁 → 모달 닫힘(무크래시) ──
  // 복원할 행이 없으면 다시 하나 생성.
  if (afterDel < 1) { await clickBtnByText(ws, sid, '.modal', '지금 백업'); for (let i = 0; i < 20; i++) { await sleep(200); if (await ev(ws, sid, "return document.querySelectorAll('.modal .snap-item .snap-actions').length") >= 1) break } }
  errs.length = 0
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal .snap-item .snap-actions button')).find(function(x){return (x.textContent||'').trim()==='복원'});if(b)b.click();return 1")
  let restoredClosed = false
  for (let i = 0; i < 25; i++) { await sleep(200); if (!(await ev(ws, sid, modalByTitle('백업')))) { restoredClosed = true; break } }
  const projAlive = await ev(ws, sid, "var s=window.__scriv.state();return s.items>0&&!!s.id")
  t(restoredClosed && projAlive && errs.length === 0, '[' + skin + '] 백업 복원 → 모달 닫힘·원고 생존(무에러)')

  // ── 10) 프로젝트 목록: 현재 프로젝트 표시 + 현재행 삭제 가드(액션 없음) ──
  errs.length = 0
  await ev(ws, sid, "window.__setModal('projects');return 1"); await sleep(450)
  t(await ev(ws, sid, modalByTitle('프로젝트 목록')), '[' + skin + '] 프로젝트 목록 모달 열림')
  const curShown = await ev(ws, sid, "var d=document.querySelector('.modal');return !!d&&/현재 열림/.test(d.textContent||'')")
  // 현재 프로젝트 행(accent 테두리)에는 열기/삭제 액션이 없어야(자기 자신 삭제 가드).
  const curGuard = await ev(ws, sid, "var cur=[].slice.call(document.querySelectorAll('.modal .snap-item')).find(function(e){return /현재 열림/.test(e.textContent||'')});return !!cur&&!cur.querySelector('.snap-actions')")
  t(curShown && curGuard && errs.length === 0, '[' + skin + '] 프로젝트 목록: 현재 표시 + 현재행 삭제 액션 없음(가드)')

  // ── 11) 닫기 버튼으로 모달 종료 ──
  await clickBtnByText(ws, sid, '.modal', '닫기'); await sleep(300)
  const closed = !(await ev(ws, sid, modalByTitle('프로젝트 목록')))
  t(closed, '[' + skin + '] 프로젝트 목록 닫기 버튼으로 종료')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'&&!!window.__scriv")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await runSkin(ws, sid, skin, t, errs)
  }
  console.log('=== 저장/내보내기/백업 라이프사이클 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
