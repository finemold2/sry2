// 보조(플로팅) 패널 실사용 베타 — 박사급 QA/UX. '코드리뷰'가 아니라 '실제로 글 쓰며 패널을 띄워 쓰는' 상황을 재현.
// 담당 영역: 소리내어 읽기(TTS) · 집필 스프린트 타이머 · 라이팅 프롬프트 · 스크래치패드 · 퀵 레퍼런스.
// 점검: [양 스킨(classic/studio)] 메뉴로 열림 → 실제 작동 → 닫힘 + "당연한데 안 되는 것":
//   · 모달/패널을 열면 첫 입력에 포커스가 가야 한다(스크래치패드 autoFocus).
//   · 빈 상태엔 안내가 보여야 한다(TTS — 읽을 문서가 없으면 안내).
//   · 저장/영속이 되면 그대로 남아야 한다(스크래치패드 localStorage).
//   · z: 다른 창(도구창)이 위를 덮어 보조 패널의 닫기 버튼을 가리면 안 된다 — 가리면 보조 패널을 다시 쓸 수 없다.
// 기대 동작을 단언으로 인코딩하고, 위반 시 console.log("[ISSUE] ...") 를 출력(실패로도 카운트).
// 주의: 포인터 클릭에 Input.dispatchMouseEvent 를 쓰므로 Runtime.enable 은 호출하지 않는다(콘솔에러 캡처 미사용).
// 작성 전용(실행 금지). node --check 통과 목표.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// ── 공통 eval 스니펫(스킨 무관) ──────────────────────────────────────────────
const CLOSE_WELCOME = "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"
// '도구' 메뉴 트리거(.menu-wrap > button, 텍스트 '도구' — 클래식/스튜디오 공통)
const OPEN_TOOLS_MENU = "var w=[].slice.call(document.querySelectorAll('.menu-wrap')).find(function(m){var b=m.querySelector('button');return b&&(b.textContent||'').trim()==='도구'});if(!w)return 'no-menu';w.querySelector('button').click();return 'opened'"
const clickDropItem = (label) => "var b=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return ((x.textContent||'').replace(/\\s+/g,' ')).indexOf('" + label + "')>=0});if(!b){document.body.click();return 'no-item';}b.click();return 'ok'"
// 바인더 보장(없으면 토글 버튼 클릭)
const ENSURE_BINDER = "if(!document.querySelector('.binder')){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();}return !!document.querySelector('.binder')"
// 원고 폴더 펼치기(텍스트 문서가 트리에 보이도록)
const EXPAND_DRAFT = "var rows=[].slice.call(document.querySelectorAll('.binder-row'));var f=rows.find(function(r){return /원고/.test(r.getAttribute('aria-label')||'')});if(f){var tx=window.__scriv.entries().find(function(e){return e.type==='text'});var has=rows.some(function(r){return (r.getAttribute('aria-label')||'')===(tx&&tx.title)});if(!has){var d=f.querySelector('.disclosure');if(d)d.click();}}return 1"
// 첫 텍스트 문서를 바인더에서 클릭해 활성화 + 본문(ASCII RTF) 채움 → activeId 반환(퀵레퍼런스/TTS 전제)
const CLICK_TEXT_ROW = "var sc=window.__scriv;var tx=sc.entries().find(function(e){return e.type==='text'});if(!tx)return null;try{sc.setBody('{\\\\rtf1\\\\ansi\\\\deff0{\\\\fonttbl{\\\\f0 Calibri;}}\\\\f0 This is an aux panel beta sentence. Second sentence here for TTS.}')}catch(e){};var row=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return (r.getAttribute('aria-label')||'')===tx.title});if(row)row.click();return sc.state().activeId"

const sq = (s) => s.replace(/"/g, '\\"') // 셀렉터를 ev 내부 querySelector(\"...\") 에 안전 삽입

const PANELS = [
  { key: 'readaloud', name: '소리내어 읽기(TTS)', menu: '소리내어 읽기', sel: '.readaloud', closeBtn: ".readaloud button[aria-label='닫기']" },
  { key: 'sprint', name: '집필 스프린트 타이머', menu: '집필 스프린트 타이머', sel: '.sprintbar', closeBtn: ".sprintbar button[aria-label='스프린트 닫기']" },
  { key: 'prompt', name: '라이팅 프롬프트', menu: '라이팅 프롬프트', sel: '.promptdeck', closeBtn: ".promptdeck button[aria-label='닫기']" },
  { key: 'scratch', name: '스크래치패드', menu: '스크래치패드', sel: '.scratchpad', closeBtn: ".scratchpad button[aria-label='스크래치패드 닫기']" },
  { key: 'quickref', name: '퀵 레퍼런스', menu: '퀵 레퍼런스', sel: '.quickref', closeBtn: ".quickref button[aria-label='퀵 레퍼런스 닫기']" },
]

const present = (ws, sid, sel) => ev(ws, sid, "return !!document.querySelector(\"" + sq(sel) + "\")")

async function openAux(ws, sid, p) {
  if (await present(ws, sid, p.sel)) return true // 이미 열려 있으면 그대로
  if (await ev(ws, sid, OPEN_TOOLS_MENU) !== 'opened') return false
  await sleep(280)
  const r = await ev(ws, sid, clickDropItem(p.menu))
  await sleep(420)
  if (r !== 'ok') { await ev(ws, sid, "document.body.click();return 1"); return false }
  return await present(ws, sid, p.sel)
}

async function closeAux(ws, sid, p) {
  await ev(ws, sid, "var b=document.querySelector(\"" + sq(p.closeBtn) + "\");if(b)b.click();return 1")
  await sleep(280)
  return !(await present(ws, sid, p.sel))
}

// ── z(겹침) 검사: 보조 패널이 떠 있을 때, 도구창을 그 닫기버튼 위로 띄우고
//    사용자가 패널을 다시 클릭해 앞으로 가져오려 해도 도구창이 계속 덮으면 [ISSUE].
//    (보조 패널 z: quickref/readaloud 60, 그 외 150. 도구창 z: 160~289. 보조 패널엔 bring-to-front 가 없음.)
async function zCheck(ws, sid, skin, p, t, M) {
  const info = JSON.parse(await ev(ws, sid,
    "var pan=document.querySelector(\"" + sq(p.sel) + "\");var cb=document.querySelector(\"" + sq(p.closeBtn) + "\");" +
    "if(!pan||!cb)return JSON.stringify({ok:false});var pr=pan.getBoundingClientRect();var cr=cb.getBoundingClientRect();" +
    "return JSON.stringify({ok:true,cx:cr.left+cr.width/2,cy:cr.top+cr.height/2,pl:pr.left,pt:pr.top,pw:pr.width,ph:pr.height,z:parseInt(getComputedStyle(pan).zIndex||'0',10)||0})"))
  if (!info.ok) { t(false, '[' + skin + '] ' + p.name + ' z검사 준비 실패(패널/닫기버튼 없음)'); return }

  // 도구창을 닫기버튼 위로 강제 배치(localStorage 박스) 후 연다.
  const bx = Math.round(info.cx - 40), by = Math.round(info.cy - 40)
  await ev(ws, sid, "try{localStorage.setItem('sry:toolwin:name-mixer',JSON.stringify({x:" + bx + ",y:" + by + ",w:300,h:240}))}catch(e){};return 1")
  await ev(ws, sid, "window.__openTool&&window.__openTool('name-mixer');return 1"); await sleep(560)
  const tool = JSON.parse(await ev(ws, sid,
    "var w=document.querySelector('.toolwin[data-tool-id=\"name-mixer\"]')||document.querySelector('.toolwin');if(!w)return JSON.stringify({ok:false});" +
    "var r=w.getBoundingClientRect();return JSON.stringify({ok:true,l:r.left,tp:r.top,r:r.right,b:r.bottom,z:parseInt(getComputedStyle(w).zIndex||'0',10)||0})"))
  if (!tool.ok) { t(false, '[' + skin + '] ' + p.name + ' z검사용 도구창(name-mixer) 열기 실패'); return }

  const overlap = info.cx >= tool.l && info.cx <= tool.r && info.cy >= tool.tp && info.cy <= tool.b
  const isCovered = () => ev(ws, sid, "var el=document.elementFromPoint(" + Math.round(info.cx) + "," + Math.round(info.cy) + ");if(!el)return false;return !!el.closest('.toolwin')&&!el.closest(\"" + sq(p.sel) + "\")")
  // 사용자가 패널의 보이는(겹치지 않은) 왼쪽 부분을 실제 마우스로 클릭 → 앞으로 가져오려 시도
  const clickX = Math.round(info.pl + 18), clickY = Math.round(info.cy)
  await M('mousePressed', clickX, clickY); await M('mouseReleased', clickX, clickY); await sleep(220)
  const coveredAfter = await isCovered()

  // 정리: 도구창 닫고 강제 위치 키 제거(다른 패널 검사 오염 방지)
  await ev(ws, sid, "window.__closeTool&&window.__closeTool('name-mixer');return 1")
  await ev(ws, sid, "try{localStorage.removeItem('sry:toolwin:name-mixer')}catch(e){};return 1"); await sleep(160)

  if (!overlap) { t(true, '[' + skin + '] ' + p.name + ' — 도구창이 닫기버튼과 겹치지 않음(가림 없음, auxZ ' + info.z + '/toolZ ' + tool.z + ')'); return }
  // overlap 인데 클릭해도 못 끌어올림 → 영구 가림 → [ISSUE]
  t(!coveredAfter, '[' + skin + '] ' + p.name + ' 패널이 도구창에 가려지지 않고 닫기버튼을 클릭할 수 있어야 함(클릭해도 앞으로 못 옴, auxZ ' + info.z + ' < toolZ ' + tool.z + ')')
}

// ── 패널별 실제 작동(open→work→close) + z ─────────────────────────────────────
async function testReadAloud(ws, sid, skin, t, M) {
  const p = PANELS[0]
  const open = await openAux(ws, sid, p)
  t(open, '[' + skin + '] 도구 메뉴 → 소리내어 읽기(TTS) 열림(' + p.sel + ')')
  if (!open) return
  t(await ev(ws, sid, "var h=document.querySelector('.readaloud .readaloud-head');return !!h&&/소리내어 읽기/.test(h.textContent||'')"), '[' + skin + '] TTS 헤더 제목 렌더')
  // 빈 상태/정상 상태 모두 본문 안내가 보여야(블랭크 금지): 컨트롤(재생) 또는 안내 문구
  const bodyOk = await ev(ws, sid, "var b=document.querySelector('.readaloud-body');if(!b)return false;var hasCtrl=!!b.querySelector('.readaloud-ctrls button');var txt=(b.textContent||'').trim();return hasCtrl||txt.length>3")
  t(bodyOk, '[' + skin + '] TTS 본문 안내/컨트롤 표시(빈 상태에도 안내 — 블랭크 아님)')
  await zCheck(ws, sid, skin, p, t, M)
  t(await closeAux(ws, sid, p), '[' + skin + '] TTS 닫기 버튼으로 닫힘')
}

async function testSprint(ws, sid, skin, t, M) {
  const p = PANELS[1]
  const open = await openAux(ws, sid, p)
  t(open, '[' + skin + '] 도구 메뉴 → 집필 스프린트 타이머 열림(' + p.sel + ')')
  if (!open) return
  await ev(ws, sid, "var s=document.querySelector('.sprintbar select');if(s){var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,'5');s.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(150)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.sprintbar button')).find(function(x){return /시작/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350)
  t(await ev(ws, sid, "return !!document.querySelector('.sprint-time')"), '[' + skin + '] 스프린트 시작 → 카운트다운(.sprint-time) 표시')
  const stopped = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.sprintbar button')).find(function(x){return /중지/.test(x.textContent||'')});if(b)b.click();return !document.querySelector('.sprint-time')")
  t(stopped, '[' + skin + '] 스프린트 중지 → 설정 화면 복귀(.sprint-time 사라짐)')
  await zCheck(ws, sid, skin, p, t, M)
  t(await closeAux(ws, sid, p), '[' + skin + '] 스프린트 타이머 닫기 버튼으로 닫힘')
}

async function testPrompt(ws, sid, skin, t, M) {
  const p = PANELS[2]
  const open = await openAux(ws, sid, p)
  t(open, '[' + skin + '] 도구 메뉴 → 라이팅 프롬프트 열림(' + p.sel + ')')
  if (!open) return
  t(await ev(ws, sid, "var e=document.querySelector('.promptdeck .prompt-text');return !!e&&(e.textContent||'').trim().length>0"), '[' + skin + '] 라이팅 프롬프트 초기 글감 카드 표시')
  const clicked = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.promptdeck button')).find(function(x){return /다른 글감/.test(x.textContent||'')});if(!b)return 'no';b.click();return 'ok'"); await sleep(250)
  t(clicked === 'ok' && await ev(ws, sid, "var e=document.querySelector('.promptdeck .prompt-text');return !!e&&(e.textContent||'').trim().length>0"), '[' + skin + '] "다른 글감" → 새 글감 카드 표시')
  t(await ev(ws, sid, "var s=document.querySelector('.promptdeck select');if(!s||s.options.length<2)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,s.options[1].value);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value===s.options[1].value"), '[' + skin + '] 라이팅 프롬프트 카테고리 선택 컨트롤 동작')
  await zCheck(ws, sid, skin, p, t, M)
  t(await closeAux(ws, sid, p), '[' + skin + '] 라이팅 프롬프트 닫기 버튼으로 닫힘')
}

async function testScratch(ws, sid, skin, t, M) {
  const p = PANELS[3]
  const open = await openAux(ws, sid, p)
  t(open, '[' + skin + '] 도구 메뉴 → 스크래치패드 열림(' + p.sel + ')')
  if (!open) return
  // 패널을 열면 첫 입력(textarea)에 포커스가 가야 한다(autoFocus)
  await sleep(250)
  t(await ev(ws, sid, "var a=document.activeElement;return !!a&&a.classList&&a.classList.contains('scratchpad-body')"), '[' + skin + '] 스크래치패드 열면 본문 입력란에 자동 포커스')
  // 빈 상태 placeholder 안내
  t(await ev(ws, sid, "var t=document.querySelector('.scratchpad-body');return !!t&&(t.getAttribute('placeholder')||'').length>3"), '[' + skin + '] 스크래치패드 빈 상태 placeholder 안내 표시')
  // 타이핑 → localStorage 영속(저장됨 == 그대로 남음)
  const mark = 'AUXSCR' + skin + (Math.floor(Date.now() / 1000) % 100000)
  await ev(ws, sid, "var t=document.querySelector('.scratchpad-body');if(t){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(t,'" + mark + " 스크래치 메모');t.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(500)
  t(await ev(ws, sid, "try{return (localStorage.getItem('sry:scratchpad')||'').indexOf('" + mark + "')>=0}catch(e){return false}"), '[' + skin + '] 스크래치패드 타이핑 → localStorage 영속(저장됨)')
  await zCheck(ws, sid, skin, p, t, M)
  t(await closeAux(ws, sid, p), '[' + skin + '] 스크래치패드 닫기 버튼으로 닫힘')
}

async function testQuickRef(ws, sid, skin, t, M) {
  const p = PANELS[4]
  const open = await openAux(ws, sid, p)
  t(open, '[' + skin + '] 도구 메뉴 → 현재 문서 퀵 레퍼런스 열림(' + p.sel + ')')
  if (!open) return
  const title = await ev(ws, sid, "var q=document.querySelector('.quickref .quickref-title');return q?(q.textContent||'').trim():''")
  t(!!title, '[' + skin + '] 퀵 레퍼런스 현재 문서 제목 표시(' + title + ')')
  t(await ev(ws, sid, "return !!document.querySelector('.quickref .quickref-body')"), '[' + skin + '] 퀵 레퍼런스 본문 영역 렌더')
  await zCheck(ws, sid, skin, p, t, M)
  t(await closeAux(ws, sid, p), '[' + skin + '] 퀵 레퍼런스 닫기 버튼으로 닫힘')
}

async function runSkin(ws, sid, skin, t, M) {
  // 활성 텍스트 문서 보장(퀵 레퍼런스/TTS 전제)
  await ev(ws, sid, ENSURE_BINDER); await sleep(200)
  await ev(ws, sid, EXPAND_DRAFT); await sleep(250)
  const activeId = await ev(ws, sid, CLICK_TEXT_ROW); await sleep(250)
  t(!!activeId, '[' + skin + '] 활성 텍스트 문서 설정(바인더 클릭) activeId=' + activeId)

  await testReadAloud(ws, sid, skin, t, M)
  await testSprint(ws, sid, skin, t, M)
  await testPrompt(ws, sid, skin, t, M)
  await testScratch(ws, sid, skin, t, M)
  await testQuickRef(ws, sid, skin, t, M)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // beforeunload(원고 안전) 다이얼로그가 헤드리스에서 Page.navigate 를 막지 않도록 자동 수락(Page 도메인 — Input 마우스와 무관).
  await rpc(ws, 'Page.enable', {}, sid).catch(() => {})
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })
  // [ISSUE] 출력 + 실패 카운트를 함께 처리
  const ok = [], bad = []
  const t = (cond, msg) => { (cond ? ok : bad).push(msg); if (!cond) console.log('[ISSUE] ' + msg) }
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1300)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await ev(ws, sid, CLOSE_WELCOME); await sleep(400)
    // 스킨 실제 적용 확인(클래식=.toolbar, 스튜디오=.app-studio/.st-rail)
    const skinOk = await ev(ws, sid, "return " + (skin === 'studio' ? "(document.querySelector('.app-studio')||document.querySelector('.st-rail'))!=null" : "(document.querySelector('.toolbar')||document.querySelector('.menu-wrap'))!=null"))
    t(!!skinOk, '[' + skin + '] 스킨 적용 확인')
    await runSkin(ws, sid, skin, t, M)
  }

  console.log('=== 보조 패널 실사용 베타(소리내어읽기·스프린트·프롬프트·스크래치패드·퀵레퍼런스 / 양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
