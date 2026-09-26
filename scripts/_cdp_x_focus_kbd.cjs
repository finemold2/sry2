// 포커스/키보드 UX 실사용 베타 — '코드리뷰'가 아니라 실제 사용자가 키보드로 조작하는 흐름을 재현한다.
// 점검: 모달/검색창 열면 첫 입력 autofocus, Esc 로 닫힘, 닫은 뒤 포커스 복귀, ⌘K 팔레트 타이핑→화살표 이동→Enter 실행,
//      ⌘F 찾기 포커스, 모달 떠 있을 때 배경 클릭/스크롤 차단(백드롭 가로막힘), 그리고 이 모든 조작 중 콘솔 에러 0.
// 기대 동작을 단언으로 인코딩하고, 위반 시 console.log("[ISSUE] ...") 로 출력하며 실패로 카운트한다.
// 주의: 키보드는 Input.dispatchKeyEvent(실제 키)로만 보낸다(마우스 Input 미사용 → Runtime.enable 와의 알려진 충돌 회피).
//       콘솔 에러 캡처를 위해 Runtime.enable 을 켠다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// 실제 키 입력(keyDown→keyUp). mods 비트: Alt=1, Ctrl=2, Meta=4, Shift=8.
async function key(ws, sid, k, code, vk, mods) {
  const base = { modifiers: mods || 0, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  await rpc(ws, 'Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base), sid)
  await rpc(ws, 'Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base), sid)
}
const K = {
  cmdK: (ws, sid) => key(ws, sid, 'k', 'KeyK', 75, 2),
  cmdF: (ws, sid) => key(ws, sid, 'f', 'KeyF', 70, 2),
  down: (ws, sid) => key(ws, sid, 'ArrowDown', 'ArrowDown', 40, 0),
  up: (ws, sid) => key(ws, sid, 'ArrowUp', 'ArrowUp', 38, 0),
  enter: (ws, sid) => key(ws, sid, 'Enter', 'Enter', 13, 0),
  esc: (ws, sid) => key(ws, sid, 'Escape', 'Escape', 27, 0),
}
// 제어 input/textarea 값 주입(React 호환: 네이티브 setter + input 이벤트), 포커스 유지.
async function setInput(ws, sid, sel, val) {
  return ev(ws, sid, "var el=document.querySelector(" + JSON.stringify(sel) + ");if(!el)return false;var P=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var s=Object.getOwnPropertyDescriptor(P,'value').set;s.call(el," + JSON.stringify(val) + ");el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();return true")
}
// .cmd-item.sel 의 인덱스(현재 선택 강조)
const SELIDX = "var its=[].slice.call(document.querySelectorAll('.cmd-item'));var s=document.querySelector('.cmd-item.sel');return s?its.indexOf(s):-1"

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // 콘솔 에러/예외 캡처(우리 세션 한정)
  const errs = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails && d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 120)) })
  await rpc(ws, 'Runtime.enable', {}, sid)

  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // 로드 대기 + 환영/투어 닫기
  let loaded = false
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'&&typeof window.__openTool==='function'")) { loaded = true; break } } catch { /* loading */ } }
  t(loaded, '앱 로드 + 테스트 훅 준비')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  // 에디터 뷰 + 모달/도구창 정리, 콘솔 에러 카운터 초기화(로드시 무관한 경고 제외)
  await ev(ws, sid, "window.__setModal(null);window.__setView('editor');return 1"); await sleep(350)
  errs.length = 0

  // ──────────────────────────────────────────────────────────────
  // [A] ⌘K 명령 팔레트: 열림 → autofocus → 배경차단 → 타이핑 narrow → ↓/↑ 이동 → Esc 닫힘 → 포커스 복귀
  // ──────────────────────────────────────────────────────────────
  // 트리거 버튼에 포커스(닫은 뒤 여기로 복귀해야 함)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap>button, header button, .tbtn, button')).find(function(x){return x.offsetParent!==null&&!x.disabled});window.__TRIG=b||null;if(b)b.focus();return !!b")
  await K.cmdK(ws, sid); await sleep(420)
  t(await ev(ws, sid, "return !!document.querySelector('.cmd-palette')&&!!document.querySelector('.modal-backdrop')"), '⌘K 로 명령 팔레트 열림(.cmd-palette + 백드롭)')
  // 1) 열면 첫 입력(검색창)에 autofocus
  t(await ev(ws, sid, "var a=document.activeElement;return !!a&&a.classList&&a.classList.contains('cmd-input')"), '팔레트 열면 검색 입력(.cmd-input)에 자동 포커스')
  // 2) 배경 클릭/스크롤 차단 — 화면 모서리(팔레트 밖)는 백드롭이 가로막아야 함(아래 본문/메뉴가 클릭되면 안 됨)
  t(await ev(ws, sid, "var el=document.elementFromPoint(24,24);return !!(el&&el.closest('.modal-backdrop'))&&!(el&&el.closest('.toolwin'))"), '팔레트 떠 있을 때 배경 모서리가 백드롭에 가로막힘(배경 클릭/스크롤 차단)')
  // 3) 타이핑하면 목록이 좁혀짐
  const before = await ev(ws, sid, "return document.querySelectorAll('.cmd-item').length")
  await setInput(ws, sid, '.cmd-input', '보기'); await sleep(300)
  const after = await ev(ws, sid, "return document.querySelectorAll('.cmd-item').length")
  t(after > 1 && after < before, '검색어 입력 시 목록 필터링(' + before + '→' + after + '개)')
  // 4) ↓ 화살표로 선택 이동(0→1)
  await ev(ws, sid, "var i=document.querySelector('.cmd-input');if(i)i.focus();return 1")
  const sel0 = await ev(ws, sid, SELIDX)
  await K.down(ws, sid); await sleep(160)
  const sel1 = await ev(ws, sid, SELIDX)
  t(sel0 === 0 && sel1 === 1, '↓ 화살표로 선택 항목 이동(' + sel0 + '→' + sel1 + ')')
  // 5) ↑ 화살표로 선택 복귀(1→0)
  await K.up(ws, sid); await sleep(160)
  const sel2 = await ev(ws, sid, SELIDX)
  t(sel2 === 0, '↑ 화살표로 선택 항목 복귀(' + sel1 + '→' + sel2 + ')')
  // 6) Esc 로 닫힘
  await K.esc(ws, sid); await sleep(300)
  t(!(await ev(ws, sid, "return !!document.querySelector('.cmd-palette')")), 'Esc 로 명령 팔레트 닫힘')
  // 7) 닫은 뒤 포커스가 연 위치(트리거 버튼)로 복귀
  t(await ev(ws, sid, "return !!window.__TRIG&&document.activeElement===window.__TRIG"), '팔레트 닫은 뒤 포커스가 트리거 버튼으로 복귀')

  // ──────────────────────────────────────────────────────────────
  // [B] ⌘K 팔레트로 명령 실제 실행: 타이핑 → Enter → 명령 수행(뷰 전환) + 팔레트 닫힘
  // ──────────────────────────────────────────────────────────────
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(250)
  await K.cmdK(ws, sid); await sleep(380)
  await setInput(ws, sid, '.cmd-input', '코르크보드'); await sleep(300)
  const topTitle = await ev(ws, sid, "var s=document.querySelector('.cmd-item.sel .cmd-title')||document.querySelector('.cmd-item .cmd-title');return s?(s.textContent||'').trim():''")
  await ev(ws, sid, "var i=document.querySelector('.cmd-input');if(i)i.focus();return 1")
  await K.enter(ws, sid); await sleep(500)
  const ran = await ev(ws, sid, "return !!document.querySelector('.corkboard')")
  const closedAfterEnter = !(await ev(ws, sid, "return !!document.querySelector('.cmd-palette')"))
  t(ran && closedAfterEnter, 'Enter 로 선택 명령 실행(상단=' + JSON.stringify(topTitle) + '→코르크보드 전환) + 팔레트 닫힘')
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)

  // ──────────────────────────────────────────────────────────────
  // [C] ⌘F 문서 내 찾기: 열림 → 찾기 입력 autofocus → Esc 닫힘 → 포커스 복귀(에디터)
  // ──────────────────────────────────────────────────────────────
  // 본문(.paper)에 포커스(닫은 뒤 캐럿 복귀 확인용). 없으면 버튼 폴백.
  await ev(ws, sid, "var p=document.querySelector('.paper');var b=p||[].slice.call(document.querySelectorAll('button')).find(function(x){return x.offsetParent!==null&&!x.disabled});window.__TRIGF=b||null;if(b)b.focus();return !!b")
  await K.cmdF(ws, sid); await sleep(380)
  t(await ev(ws, sid, "return !!document.querySelector('.findbar')"), '⌘F 로 문서 내 찾기 바 열림(.findbar)')
  t(await ev(ws, sid, "var a=document.activeElement;return !!a&&a.tagName==='INPUT'&&(a.getAttribute('aria-label')==='찾을 내용'||a.getAttribute('placeholder')==='찾기')&&!!a.closest('.findbar')"), '찾기 바 열면 찾기 입력칸에 자동 포커스')
  await K.esc(ws, sid); await sleep(280)
  t(!(await ev(ws, sid, "return !!document.querySelector('.findbar')")), 'Esc 로 찾기 바 닫힘')
  t(await ev(ws, sid, "return !!window.__TRIGF&&document.activeElement===window.__TRIGF"), '찾기 바 닫은 뒤 포커스가 직전 위치(에디터/캐럿)로 복귀')

  // ──────────────────────────────────────────────────────────────
  // [D] 일반 모달(프로젝트 통계): autofocus → 배경차단 → Esc 닫힘 → 포커스 복귀
  // ──────────────────────────────────────────────────────────────
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap>button, header button, .tbtn, button')).find(function(x){return x.offsetParent!==null&&!x.disabled});window.__TRIGM=b||null;if(b)b.focus();if(window.__setModal)window.__setModal('stats');return !!b"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop .modal[role=\"dialog\"]')"), '일반 모달(프로젝트 통계) 열림')
  t(await ev(ws, sid, "var a=document.activeElement;return !!a&&!!a.closest('.modal-backdrop')"), '모달 열면 모달 내부 요소로 자동 포커스(autofocus)')
  t(await ev(ws, sid, "var el=document.elementFromPoint(24,24);return !!(el&&el.closest('.modal-backdrop'))&&!(el&&el.closest('.toolwin'))"), '모달 떠 있을 때 배경 모서리가 백드롭에 가로막힘(배경 클릭/스크롤 차단)')
  await K.esc(ws, sid); await sleep(350)
  t(!(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop .modal[role=\"dialog\"]')")), 'Esc 로 일반 모달 닫힘')
  t(await ev(ws, sid, "return !!window.__TRIGM&&document.activeElement===window.__TRIGM"), '모달 닫은 뒤 포커스가 트리거 버튼으로 복귀')

  // ──────────────────────────────────────────────────────────────
  // [E] 위 모든 키보드/포커스 조작 동안 콘솔 에러 0
  // ──────────────────────────────────────────────────────────────
  await sleep(200)
  t(errs.length === 0, '키보드/포커스 조작 중 콘솔 에러 0' + (errs.length ? ' — ' + JSON.stringify(errs.slice(0, 5)) : ''))

  console.log('=== 포커스/키보드 UX 베타 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
