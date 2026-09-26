// 접근성 + 양 스킨(클래식/스튜디오) 마감 검증 — 박사급 QA/UX 실사용 시뮬레이션.
//   "코드리뷰가 아니라 실제 사용자가 키보드/마우스로 글을 쓰는 상황"을 그대로 재현해,
//   상식적으로 당연한데 안 되는 접근성 결함을 잡는다. 위반은 console.log('[ISSUE] …') + 실패로 카운트.
// 점검: ① 주요 버튼에 접근가능한 이름(aria-label/title/텍스트) 존재
//       ② 모달은 role=dialog + aria-modal=true, 열리면 첫 포커스가 모달 안으로, Esc 로 닫힘
//       ③ 키보드 포커스 시 포커스 링이 눈에 보임(:focus-visible → outline/box-shadow)
//       ④ 키보드만으로 핵심 흐름 가능: 뷰 전환(⌘1/⌘2)·저장(⌘S)·도구 열기(⌘K 팔레트)
//       ⑤ 클래식 ↔ 스튜디오에서 동일 기능 도달(저장·뷰 전환·도구 허브)
// 하니스 규약: Target.createTarget(url) 직접 + attachToTarget flatten(about:blank+navigate 금지),
//   훅 __setView/__setModal/__openTool/__closeTool/__scriv, 키보드는 Input.dispatchKeyEvent.
//   ※ 작성 전용(실행 금지). node --check 통과 목표.
const HUB = 'http://localhost:9222'; let _id = 0
const APP = 'http://localhost:4178/'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// ---- 키보드(Input.dispatchKeyEvent) — 실제 사용자 타건 재현 ----
const K = { s: ['s', 'KeyS', 83], k: ['k', 'KeyK', 75], d1: ['1', 'Digit1', 49], d2: ['2', 'Digit2', 50], tab: ['Tab', 'Tab', 9], esc: ['Escape', 'Escape', 27], down: ['ArrowDown', 'ArrowDown', 40], enter: ['Enter', 'Enter', 13] }
async function press(ws, sid, spec, mods) {
  const [key, code, vk] = spec; const m = mods || 0
  await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', modifiers: m, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid)
  await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', modifiers: m, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid)
  await sleep(70)
}
const CTRL = 2 // CDP modifiers 비트마스크: Alt=1, Ctrl=2, Meta=4, Shift=8 (Windows → Ctrl)
const blur = (ws, sid) => ev(ws, sid, "var a=document.activeElement;if(a&&a.blur)a.blur();return document.activeElement?document.activeElement.tagName:'none'")

// 양 스킨 공통: 환영/투어/모달 닫기
async function dismissWelcome(ws, sid) {
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(250)
}

// 모달 dialog(도구창 제외, aria-modal=true, 화면에 보이는 것) 카운트
const DIALOG_OPEN = "return [].slice.call(document.querySelectorAll('[role=dialog]')).filter(function(d){return !d.closest('.toolwin')&&!d.classList.contains('tour-bubble')&&d.getAttribute('aria-modal')==='true'&&d.getClientRects().length>0}).length"

async function runSkin(ws, sid, skin, t, R) {
  R[skin] = {}
  // ---- 로드 + 훅 준비 ----
  const ready = await (async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false })()
  t(ready, '[' + skin + '] 앱 로드 + 테스트 훅 준비')
  await dismissWelcome(ws, sid)
  await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(300)

  // ---- ① 주요 버튼 접근가능한 이름(aria-label / title / 보이는 텍스트) ----
  const btnRes = JSON.parse(await ev(ws, sid,
    "var sel='header button,.toolbar button,.menu-wrap button,.st-rail-btn,.st-icon-btn,.st-topbar button,.save-btn,.tbtn,.st-save';" +
    "var seen=new Set();var btns=[].slice.call(document.querySelectorAll(sel)).filter(function(b){if(seen.has(b))return false;seen.add(b);return b.offsetParent!==null});" +
    "var bad=btns.filter(function(b){var n=(b.getAttribute('aria-label')||'').trim()||(b.getAttribute('title')||'').trim()||(b.textContent||'').replace(/\\s+/g,' ').trim();return !n});" +
    "return JSON.stringify({total:btns.length,bad:bad.length,sample:bad.slice(0,4).map(function(b){return b.className||b.tagName})})"))
  t(btnRes.total > 0 && btnRes.bad === 0, '[' + skin + '] 주요 버튼 ' + btnRes.total + '개 모두 접근가능 이름 보유' + (btnRes.bad ? ' — 무명 ' + btnRes.bad + '개: ' + JSON.stringify(btnRes.sample) : ''))

  // ---- ③ 키보드 포커스 시 포커스 링이 보임(:focus-visible → outline 또는 box-shadow) ----
  await blur(ws, sid)
  let fvHit = null
  for (let i = 0; i < 6 && !fvHit; i++) {
    await press(ws, sid, K.tab, 0)
    const info = JSON.parse(await ev(ws, sid,
      "var a=document.activeElement;if(!a||a===document.body)return JSON.stringify({tag:a?a.tagName:'none',fv:false,ring:false});" +
      "var fv=false;try{fv=a.matches(':focus-visible')}catch(e){fv=false}" +
      "var cs=getComputedStyle(a);var outline=cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth||'0')>0;var shadow=!!cs.boxShadow&&cs.boxShadow!=='none';" +
      "return JSON.stringify({tag:a.tagName,cls:String(a.className||''),fv:fv,ring:outline||shadow})"))
    if (info.fv && info.ring) fvHit = info
  }
  t(!!fvHit, '[' + skin + '] 키보드 Tab 포커스 시 포커스 링 보임(:focus-visible+outline/box-shadow)' + (fvHit ? ' @' + fvHit.tag : ' — 6회 Tab 동안 보이는 링 없음'))

  // ---- ④-a 키보드로 뷰 전환(⌘2 → 코르크보드, ⌘1 → 에디터) ----
  await blur(ws, sid)
  await press(ws, sid, K.d2, CTRL); await sleep(450)
  const cork = await ev(ws, sid, "return !!document.querySelector('.corkboard')")
  await blur(ws, sid)
  await press(ws, sid, K.d1, CTRL); await sleep(450)
  const edi = await ev(ws, sid, "return !!document.querySelector('.paper')")
  R[skin].viewKb = cork && edi
  t(cork && edi, '[' + skin + '] 키보드만으로 뷰 전환 가능(⌘2 코르크보드=' + cork + ', ⌘1 에디터=' + edi + ')')

  // ---- ④-b 키보드로 저장(⌘S) → "저장됨" 알림(role=status 토스트) ----
  // 비-dirty 시 저장 버튼 텍스트는 처음부터 '저장됨'이라 신뢰할 수 없음 → ⌘S 가 띄우는 토스트(role=status)로 확인.
  await press(ws, sid, K.s, CTRL); await sleep(900)
  const saved = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('[role=status]')).some(function(s){return /저장/.test(s.textContent||'')})")
  R[skin].saveKb = saved
  t(saved, '[' + skin + '] 키보드 ⌘S 저장 후 "저장됨" 토스트(role=status) 노출')

  // ---- ④-c 명령 팔레트(⌘K) 열림 + 첫 입력 자동 포커스 ----
  await blur(ws, sid)
  await press(ws, sid, K.k, CTRL); await sleep(450)
  const palOpen = await ev(ws, sid, "return !!document.querySelector('.cmd-palette')")
  const palFocus = await ev(ws, sid, "var a=document.activeElement;return !!a&&(a.classList.contains('cmd-input')|| (a.closest&&!!a.closest('.cmd-palette')))")
  t(palOpen && palFocus, '[' + skin + '] ⌘K 팔레트 열림 + 첫 입력 자동 포커스(open=' + palOpen + ', focus=' + palFocus + ')')

  // ---- 모달 닫힘 상식: Esc 로 팔레트가 닫혀야 한다 ----
  await press(ws, sid, K.esc, 0); await sleep(350)
  const palClosed = !(await ev(ws, sid, "return !!document.querySelector('.cmd-palette')"))
  t(palClosed, '[' + skin + '] 팔레트가 Esc 로 닫힘')

  // ---- ④-d 키보드만으로 도구 열기: ⌘K → 검색 → ↓ 로 도구 항목 → Enter → 도구창 ----
  await blur(ws, sid)
  await press(ws, sid, K.k, CTRL); await sleep(400)
  await ev(ws, sid, "var i=document.querySelector('.cmd-input');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'도구');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(350)
  const toolIdx = await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.cmd-item'));return its.findIndex(function(it){var s=it.querySelector('.cmd-section');return s&&/🧰/.test(s.textContent||'')})")
  if (toolIdx >= 0) { for (let i = 0; i < toolIdx; i++) { await press(ws, sid, K.down, 0) } }
  await press(ws, sid, K.enter, 0); await sleep(800)
  const toolWin = await ev(ws, sid, "return !!document.querySelector('.toolwin')")
  R[skin].toolKb = toolWin
  t(toolIdx >= 0 && toolWin, '[' + skin + '] 키보드만으로 도구 열기(팔레트 검색→↓→Enter→도구창=' + toolWin + ', idx=' + toolIdx + ')')
  // 정리: 열린 도구창 닫기(다음 ⌘K 가 도구창 존재로 막히지 않게)
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin')).forEach(function(w){var id=w.getAttribute('data-tool-id');if(id&&window.__closeTool)window.__closeTool(id)});return 1"); await sleep(300)

  // ---- ⑤ 도구 허브 도달성(스킨별 어포던스) ----
  const hubReach = await ev(ws, sid,
    "if([].slice.call(document.querySelectorAll('[aria-label]')).some(function(b){return /도구 ?허브/.test(b.getAttribute('aria-label')||'')}))return true;" +
    "var mb=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='도구'});if(mb)mb.click();" +
    "var has=[].slice.call(document.querySelectorAll('.dropdown button')).some(function(x){return /도구 허브/.test(x.textContent||'')});document.body.click();return has")
  R[skin].hub = hubReach
  await ev(ws, sid, "document.body.click();return 1"); await sleep(150)

  // ---- 스튜디오 전용: 좌측 레일 내비 버튼은 아이콘 전용 → 반드시 aria-label ----
  if (skin === 'studio') {
    const railRes = JSON.parse(await ev(ws, sid, "var r=[].slice.call(document.querySelectorAll('.st-rail-btn'));var bad=r.filter(function(b){return !(b.getAttribute('aria-label')||'').trim()});return JSON.stringify({total:r.length,bad:bad.length})"))
    t(railRes.total > 0 && railRes.bad === 0, '[studio] 좌측 레일 내비 버튼 ' + railRes.total + '개 모두 aria-label 보유' + (railRes.bad ? ' — 누락 ' + railRes.bad : ''))
  }
}

// ---- ② 모달 접근성(스킨 무관 — 클래식에서 1회): role=dialog + aria-modal + 첫 포커스 + Esc 닫힘 ----
async function runModalA11y(ws, sid, t) {
  const FULL = ['compile', 'settings', 'toolhub']      // 존재 + 첫포커스 + Esc 닫힘
  const PRESENCE = ['backup', 'newProject', 'stats']    // 존재만
  for (const m of FULL) {
    await ev(ws, sid, "window.__setModal('" + m + "');return 1"); await sleep(420)
    const has = (await ev(ws, sid, DIALOG_OPEN)) >= 1
    t(has, '[modal] ' + m + ' 가 role=dialog + aria-modal=true 로 렌더')
    const focusIn = await ev(ws, sid, "var d=[].slice.call(document.querySelectorAll('[role=dialog][aria-modal=\"true\"]')).filter(function(x){return x.getClientRects().length>0})[0];return !!(d&&document.activeElement&&d.contains(document.activeElement))")
    t(focusIn, '[modal] ' + m + ' 열리면 첫 포커스가 모달 내부로 이동')
    await press(ws, sid, K.esc, 0); await sleep(380)
    const closed = (await ev(ws, sid, DIALOG_OPEN)) === 0
    t(closed, '[modal] ' + m + ' 가 Esc 로 닫힘')
    await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(180)
  }
  for (const m of PRESENCE) {
    await ev(ws, sid, "window.__setModal('" + m + "');return 1"); await sleep(380)
    const has = (await ev(ws, sid, DIALOG_OPEN)) >= 1
    t(has, '[modal] ' + m + ' 가 role=dialog + aria-modal=true 로 렌더')
    await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(160)
  }
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: APP })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // beforeunload(원고 안전) 다이얼로그가 헤드리스에서 Page.navigate 를 막지 않도록 자동 수락.
  await rpc(ws, 'Page.enable', {}, sid).catch(() => {})
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })
  const ok = [], bad = []
  const t = (c, m) => { (c ? ok : bad).push(m); if (!c) console.log('[ISSUE] ' + m) }
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }
  const R = {}

  for (const skin of ['classic', 'studio']) {
    // 스킨 전환은 localStorage + reload (같은 타깃 유지)
    await rpc(ws, 'Page.navigate', { url: APP }, sid); await sleep(1400)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: APP }, sid); await waitHook()
    await runSkin(ws, sid, skin, t, R)
    if (skin === 'classic') await runModalA11y(ws, sid, t)
  }

  // ---- ⑤ 클래식 ↔ 스튜디오 기능 도달 패리티 ----
  t(!!(R.classic && R.studio && R.classic.saveKb && R.studio.saveKb), '[parity] 저장(⌘S)이 양 스킨 모두에서 동작 + "저장됨" 노출')
  t(!!(R.classic && R.studio && R.classic.viewKb && R.studio.viewKb), '[parity] 키보드 뷰 전환이 양 스킨 모두에서 동작')
  t(!!(R.classic && R.studio && R.classic.hub && R.studio.hub), '[parity] 도구 허브가 양 스킨 모두에서 도달 가능(레일 버튼/메뉴)')
  t(!!(R.classic && R.studio && R.classic.toolKb && R.studio.toolKb), '[parity] 키보드만으로 도구 열기가 양 스킨 모두에서 가능')

  console.log('=== 접근성 + 양 스킨 마감 검증 (a11y · parity) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
