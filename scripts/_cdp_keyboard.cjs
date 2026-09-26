// 키보드 단축키 전수 실동작 검증(양 스킨) — App.tsx 의 window keydown 핸들러를 실제 키 이벤트로 두드려
//   '키 → 사용자가 원하는 결과(뷰 전환·모달·패널·테마·문서점프·되돌리기·분할·저장)' 를 DOM/__scriv 로 단언한다.
// 콘솔/예외 캡처가 아니라 키 입력 → 효과 확인만 하므로 Runtime.enable 불필요(드래그도 안 씀).
// 키는 window 레벨 리스너이므로 합성 KeyboardEvent 를 window 에 dispatch 하면 그대로 발화한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// ─── 합성 키 입력: ⌘/Ctrl 조합은 ctrlKey+metaKey 동시(플랫폼 무관), Alt 조합은 altKey ───
// blur 로 활성 입력 포커스를 해제해 isTyping() 가드(디지트·패널·논증 단축키)에 막히지 않게 한다.
function kdExpr(key, o) { o = o || {}; const ctrl = !!o.ctrl, shift = !!o.shift, alt = !!o.alt, blur = o.blur !== false
  return (blur ? "try{if(document.activeElement&&document.activeElement!==document.body&&document.activeElement.blur)document.activeElement.blur()}catch(e){};" : '')
    + "var e=new KeyboardEvent('keydown',{key:" + JSON.stringify(key) + ",ctrlKey:" + ctrl + ",metaKey:" + ctrl + ",shiftKey:" + shift + ",altKey:" + alt + ",bubbles:true,cancelable:true});window.dispatchEvent(e);return 1"
}
const press = (ws, sid, key, o) => ev(ws, sid, kdExpr(key, o))

// 현재 화면이 뷰 v 인지 — 컨테이너 클래스(에디터/코르크/아웃라이너/칸반/캔버스/연재/DB) 또는
// 본문 영역의 고유 텍스트(타임라인/참고문헌/논증)로 판별. 스킨 무관(.center|.st-center).
const VIEW_DETECT = "var V=__V__;var c=document.querySelector('.st-center,.center')||document.body;var t=(c.textContent||'');switch(V){case 'editor':return !!document.querySelector('.paper');case 'corkboard':return !!document.querySelector('.corkboard');case 'outliner':return !!document.querySelector('.outliner');case 'board':return !!document.querySelector('.board');case 'canvas':return !!document.querySelector('.canvas-area');case 'serial':return !!document.querySelector('.serial-board');case 'timeline':return /스윔레인|타임라인/.test(t);case 'references':return /참고문헌|서지/.test(t);case 'argument':return (/주제문/.test(t)&&/반박/.test(t));case 'database':return !!document.querySelector('.db-table');}return false"
const viewIs = (ws, sid, v) => ev(ws, sid, VIEW_DETECT.replace('__V__', JSON.stringify(v)))
const activeId = (ws, sid) => ev(ws, sid, "return (window.__scriv&&window.__scriv.state().activeId)||null")
const dirty = (ws, sid) => ev(ws, sid, "return !!(window.__scriv&&window.__scriv.state().dirty)")
const textDocs = (ws, sid) => ev(ws, sid, "return (window.__scriv?window.__scriv.entries().filter(function(e){return e.type==='text'}).length:0)")
const has = (ws, sid, sel) => ev(ws, sid, "return !!document.querySelector(" + JSON.stringify(sel) + ")")
const itemCount = (ws, sid) => ev(ws, sid, "return window.__scriv?window.__scriv.state().items:0")

async function waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { try { if (await fn()) return true } catch { /* re */ } await sleep(120) } return false }

// 디지트 1~9 → 뷰 매핑(⌘1 에디터 … ⌘9 데이터베이스)
const DIGIT_VIEW = [['1', 'editor'], ['2', 'corkboard'], ['3', 'outliner'], ['4', 'board'], ['5', 'canvas'], ['6', 'serial'], ['7', 'timeline'], ['8', 'references'], ['9', 'database']]

async function runSkin(ws, sid, skin, t, bugs) {
  const TA = async (fn, msg) => { try { t(await fn(), msg) } catch (e) { t(false, msg + ' [' + e.message + ']') } }
  // 깨끗한 상태 보장: 모달/팔레트 닫기(busy 가드 해제)
  await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(200)

  // ── ⌘1~9 뷰 전환 ──
  for (const [d, v] of DIGIT_VIEW) {
    await press(ws, sid, d, { ctrl: true }); await sleep(420)
    await TA(() => viewIs(ws, sid, v), '[' + skin + '] ⌘' + d + ' → ' + v + ' 뷰 전환')
  }

  // ── ⌘⇧A 논증 작업대 ──
  await press(ws, sid, '1', { ctrl: true }); await sleep(300)
  await press(ws, sid, 'a', { ctrl: true, shift: true }); await sleep(450)
  await TA(() => viewIs(ws, sid, 'argument'), '[' + skin + '] ⌘⇧A → 논증 작업대 뷰')
  await press(ws, sid, '1', { ctrl: true }); await sleep(300)

  // ── ⌘K 명령 팔레트 토글(열림 → 닫힘) ──
  await press(ws, sid, 'k', { ctrl: true }); await sleep(350)
  const palOpen = await has(ws, sid, '.cmd-palette')
  await press(ws, sid, 'k', { ctrl: true }); await sleep(350) // 같은 키로 토글 닫힘
  const palClosed = !(await has(ws, sid, '.cmd-palette'))
  await TA(async () => palOpen && palClosed, '[' + skin + '] ⌘K 팔레트 열기→토글 닫기')
  await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(150)

  // ── ⌘F 찾기 바 ──
  await press(ws, sid, 'f', { ctrl: true }); await sleep(350)
  await TA(() => has(ws, sid, '.findbar'), '[' + skin + '] ⌘F → 찾기·바꾸기 바 열림')
  await ev(ws, sid, "var b=document.querySelector('button[aria-label=\"찾기 닫기\"]');if(b)b.click();return 1"); await sleep(250)
  await TA(async () => !(await has(ws, sid, '.findbar')), '[' + skin + '] 찾기 바 닫기')

  // ── ⌘⇧I 인스펙터 토글(상태 변화 → 복원) ──
  const insp0 = await has(ws, sid, '.inspector')
  await press(ws, sid, 'i', { ctrl: true, shift: true }); await sleep(380)
  const insp1 = await has(ws, sid, '.inspector')
  await TA(async () => insp0 !== insp1, '[' + skin + '] ⌘⇧I 인스펙터 토글(' + insp0 + '→' + insp1 + ')')
  await press(ws, sid, 'i', { ctrl: true, shift: true }); await sleep(350) // 복원

  // ── ⌘⇧B 바인더 토글(상태 변화 → 복원) ──
  const bnd0 = await has(ws, sid, '.binder')
  await press(ws, sid, 'b', { ctrl: true, shift: true }); await sleep(380)
  const bnd1 = await has(ws, sid, '.binder')
  await TA(async () => bnd0 !== bnd1, '[' + skin + '] ⌘⇧B 바인더 토글(' + bnd0 + '→' + bnd1 + ')')
  await press(ws, sid, 'b', { ctrl: true, shift: true }); await sleep(350) // 복원

  // ── ⌘⇧L 테마 순환(data-theme 변경) ──
  const th0 = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||'light'")
  await press(ws, sid, 'l', { ctrl: true, shift: true }); await sleep(350)
  const th1 = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||'light'")
  await TA(async () => th0 !== th1, '[' + skin + '] ⌘⇧L 테마 전환(' + th0 + '→' + th1 + ')')

  // ── ⌘⇧↵ 집중 모드 토글(.composition on→off) ──
  await press(ws, sid, '1', { ctrl: true }); await sleep(250)
  await press(ws, sid, 'Enter', { ctrl: true, shift: true }); await sleep(420)
  const comp1 = await has(ws, sid, '.composition')
  await press(ws, sid, 'Enter', { ctrl: true, shift: true }); await sleep(420)
  const comp2 = await has(ws, sid, '.composition')
  await TA(async () => comp1 && !comp2, '[' + skin + '] ⌘⇧↵ 집중 모드 토글(on=' + comp1 + '→off=' + !comp2 + ')')

  // ── ⌘S 저장(원고 변경 → dirty true → 저장 후 false) ──
  await press(ws, sid, '1', { ctrl: true }); await sleep(250)
  await ev(ws, sid, "if(window.__scriv)window.__scriv.setBody('{\\\\rtf1\\\\ansi kbd-test-' + Date.now() + '}');return 1"); await sleep(200)
  const dBefore = await dirty(ws, sid)
  await press(ws, sid, 's', { ctrl: true }); await sleep(250)
  const saved = await waitFor(async () => !(await dirty(ws, sid)), 4000)
  await TA(async () => dBefore && saved, '[' + skin + '] ⌘S 저장(dirty ' + dBefore + ' → false=' + saved + ')')

  // ── ⌘PgUp/PgDn 문서 점프 + Alt←/→ 뒤로/앞으로 ──
  const nDocs = await textDocs(ws, sid)
  if (nDocs >= 2) {
    await press(ws, sid, '1', { ctrl: true }); await sleep(250)
    for (let i = 0; i < 8; i++) { await press(ws, sid, 'PageUp', { ctrl: true }); await sleep(140) } // 맨 처음 텍스트 문서로
    const first = await activeId(ws, sid)
    await press(ws, sid, 'PageDown', { ctrl: true }); await sleep(350)
    const second = await activeId(ws, sid)
    await TA(async () => !!second && second !== first, '[' + skin + '] ⌘PgDn 다음 문서로 점프(' + first + '→' + second + ')')
    await press(ws, sid, 'PageUp', { ctrl: true }); await sleep(350)
    await TA(async () => (await activeId(ws, sid)) === first, '[' + skin + '] ⌘PgUp 이전 문서로 복귀')
    // 뒤로/앞으로 내비게이션: 현재 first → PgDn(second 푸시) → Alt← first → Alt→ second
    await press(ws, sid, 'PageDown', { ctrl: true }); await sleep(350)
    await press(ws, sid, 'ArrowLeft', { alt: true }); await sleep(350)
    const back = await activeId(ws, sid)
    await TA(async () => back === first, '[' + skin + '] Alt+← 뒤로(이전 문서 ' + back + ')')
    await press(ws, sid, 'ArrowRight', { alt: true }); await sleep(350)
    const fwd = await activeId(ws, sid)
    await TA(async () => fwd === second, '[' + skin + '] Alt+→ 앞으로(다음 문서 ' + fwd + ')')
  } else {
    bugs.push('[' + skin + '] 텍스트 문서 < 2 개라 ⌘PgUp/PgDn·Alt←/→ 점프 단언 생략(시드 부족)')
  }

  // ── ⌘= / ⌘0 UI 확대·원복(documentElement.style.zoom) ──
  await press(ws, sid, '1', { ctrl: true }); await sleep(200)
  const z0 = await ev(ws, sid, "return parseFloat(document.documentElement.style.zoom||'1')||1")
  await press(ws, sid, '=', { ctrl: true }); await sleep(300)
  const z1 = await ev(ws, sid, "return parseFloat(document.documentElement.style.zoom||'1')||1")
  await TA(async () => z1 > z0 + 0.05, '[' + skin + '] ⌘= UI 확대(zoom ' + z0 + '→' + z1 + ')')
  await press(ws, sid, '0', { ctrl: true }); await sleep(300)
  const z2 = await ev(ws, sid, "return parseFloat(document.documentElement.style.zoom||'1')||1")
  await TA(async () => Math.abs(z2 - 1) < 0.001, '[' + skin + '] ⌘0 UI 배율 100% 원복(zoom=' + z2 + ')')

  // ── ⌘⇧K 분할: 에디터 본문에 캐럿 두고 → 문서 분할 → 항목 +1 ──
  await press(ws, sid, '1', { ctrl: true }); await sleep(300)
  const cnt0 = await itemCount(ws, sid)
  const caretOk = await ev(ws, sid, "var p=document.querySelector('.paper');if(!p)return false;p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(true);var s=window.getSelection();s.removeAllRanges();s.addRange(r);return document.activeElement===p")
  await press(ws, sid, 'k', { ctrl: true, shift: true, blur: false }); await sleep(500) // blur 금지: 에디터 포커스 유지해야 onSplit 동작
  const cnt1 = await itemCount(ws, sid)
  if (caretOk) await TA(async () => cnt1 > cnt0, '[' + skin + '] ⌘⇧K 캐럿 위치 문서 분할(항목 ' + cnt0 + '→' + cnt1 + ')')
  else bugs.push('[' + skin + '] .paper 캐럿 설정 실패 — ⌘⇧K 분할 단언 생략')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = [], bugs = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    // 환영/투어 닫기 + 모달 정리
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(300)
    await runSkin(ws, sid, skin, t, bugs)
  }
  console.log('=== 키보드 단축키 전수 실동작 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  if (bugs.length) { console.log('--- [APP-BUG]/생략 ---'); bugs.forEach(m => console.log('  ! ' + m)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
