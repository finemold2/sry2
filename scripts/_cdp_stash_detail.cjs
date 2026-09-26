// 수집함(StashBox) 세밀 실동작 검증(양 스킨) — 메모/URL 추가·메모 편집 커밋·목록↔캔버스 토글·
// 항목 뷰어 열기/닫기·항목 제거·캔버스 실제 마우스 자유드래그 이동+영속.
// 자유드래그(Input.dispatchMouseEvent)를 쓰므로 Runtime.enable 미사용(Input 타임아웃 회피·콘솔감시는 스냅샷 테스트가 담당).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result && r.result.value }

const CLOSE_WELCOME = "(()=>{var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1})()"
const OVERRIDE_PROMPT = "(()=>{window.prompt=function(){return 'https://example.org/page'};return 1})()"
const RESET_STASH = "(()=>{var pid=window.__scriv.state().id;try{localStorage.removeItem('sry:stash:items:'+pid)}catch(e){};window.dispatchEvent(new Event('sry:stash-reload'));return pid})()"
const OPEN_STASH = "(()=>{var i=document.querySelector('.stash-icon');if(i){i.click();return true}return false})()"
const ENSURE_CANVAS = "(()=>{if(document.querySelector('.stash-canvas'))return true;var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return /캔버스 보기/.test(x.getAttribute('aria-label')||x.title||'')});if(b)b.click();return new Promise(function(r){setTimeout(function(){r(!!document.querySelector('.stash-canvas'))},250)})})()"
const ENSURE_LIST = "(()=>{if(document.querySelector('.stash-list'))return true;var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return /목록 보기/.test(x.getAttribute('aria-label')||x.title||'')});if(b)b.click();return new Promise(function(r){setTimeout(function(){r(!!document.querySelector('.stash-list'))},250)})})()"
const ADD_MEMO = "(()=>{var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'').indexOf('메모 추가')===0});if(b){b.click();return true}return false})()"
const COMMIT_MEMO = "(()=>{var t=document.querySelector('.stash-memo-edit');if(!t)return false;var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(t,'수집메모하나');t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));t.blur();return true})()"
const ADD_URL = "(()=>{var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'')==='URL 추가'});if(b){b.click();return true}return false})()"
const MEMO_LABEL_OK = "(()=>{return [].slice.call(document.querySelectorAll('.stash-item-label')).some(function(x){return /수집메모하나/.test(x.textContent||'')})})()"
const URL_PRESENT = "(()=>{return (document.querySelectorAll('.stash-item.k-url').length+document.querySelectorAll('.stash-row.k-url').length)>0})()"
const ITEM_COUNT = "(()=>{return document.querySelectorAll('.stash-item').length})()"
const CLICK_URL_ROW = "(()=>{window.__opened=[];window.open=function(u){window.__opened.push(String(u));return null};var r=document.querySelector('.stash-row.k-url');if(r){r.click();return true}return false})()"
const VIEWER_OPEN = "(()=>{return !!document.querySelector('.stash-viewer')||((window.__opened||[]).length>0)})()" // #24: URL 은 새 탭(window.open)
const CLOSE_VIEWER = "(()=>{if(!document.querySelector('.stash-viewer'))return true;var b=[].slice.call(document.querySelectorAll('.stash-viewer-head button')).find(function(x){return /닫기/.test(x.textContent||'')});if(b){b.click();return true}var bk=document.querySelector('.stash-viewer-backdrop');if(bk){bk.click();return true}return false})()" // 뷰어가 없으면(새 탭 방식) 닫기 불필요
const MEMO_DOM_LEFT = "(()=>{var it=document.querySelector('.stash-item.k-memo');return it?Math.round(parseFloat(it.style.left)||0):-1})()"
const MEMO_PERSIST_X = "(()=>{var pid=window.__scriv.state().id;var arr=JSON.parse(localStorage.getItem('sry:stash:items:'+pid)||'[]');var m=arr.find(function(i){return i.kind==='memo'});return m?Math.round(m.x):-1})()"
const MEMO_RECT = "(()=>{var it=document.querySelector('.stash-item.k-memo');if(!it)return '';var r=it.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()"
const REMOVE_URL = "(()=>{var it=document.querySelector('.stash-item.k-url')||document.querySelector('.stash-item');if(!it)return false;var x=it.querySelector('.stash-item-x');if(x){x.click();return true}return false})()"

async function runSkin(ws, sid, skin, t, M) {
  await ev(ws, sid, OVERRIDE_PROMPT)
  await ev(ws, sid, RESET_STASH); await sleep(200) // 항목 초기화 → 결정적 카운트
  t(await ev(ws, sid, OPEN_STASH), '[' + skin + '] 🧺 아이콘 클릭 → 수집함 열림')
  await sleep(350)
  t(await ev(ws, sid, ENSURE_CANVAS), '[' + skin + '] 캔버스 뷰 표시')

  // 메모 추가 + 편집 커밋
  await ev(ws, sid, ADD_MEMO); await sleep(300)
  t(await ev(ws, sid, COMMIT_MEMO), '[' + skin + '] 메모 추가 후 텍스트 입력(편집창)')
  await sleep(300)
  t((await ev(ws, sid, ITEM_COUNT)) >= 1 && (await ev(ws, sid, MEMO_LABEL_OK)), '[' + skin + '] 메모 커밋 → 항목 라벨 반영')

  // URL 추가(prompt)
  await ev(ws, sid, ADD_URL); await sleep(350)
  t(await ev(ws, sid, URL_PRESENT), '[' + skin + '] URL 항목 추가됨')

  // 목록 ↔ 캔버스 토글
  t(await ev(ws, sid, ENSURE_LIST), '[' + skin + '] 목록 보기 토글(.stash-list)')
  await sleep(250)
  // 항목 뷰어 열기/닫기(목록의 URL 행 클릭)
  t(await ev(ws, sid, CLICK_URL_ROW), '[' + skin + '] URL 행 클릭')
  await sleep(350)
  t(await ev(ws, sid, VIEWER_OPEN), '[' + skin + '] 항목 뷰어 열림')
  t(await ev(ws, sid, CLOSE_VIEWER), '[' + skin + '] 뷰어 닫기 버튼 클릭')
  await sleep(300)
  t(!(await ev(ws, sid, "(()=>{return !!document.querySelector('.stash-viewer')})()")), '[' + skin + '] 뷰어 닫힘(새 탭 방식이면 뷰어 없음)')
  t(await ev(ws, sid, ENSURE_CANVAS), '[' + skin + '] 캔버스 보기로 복귀(.stash-canvas)')
  await sleep(250)

  // 캔버스에서 메모 항목 실제 마우스 자유드래그(+160,+110)
  const before = await ev(ws, sid, MEMO_DOM_LEFT)
  const rectRaw = await ev(ws, sid, MEMO_RECT)
  t(!!rectRaw, '[' + skin + '] 드래그 대상 메모 항목 존재')
  if (rectRaw) {
    const c = JSON.parse(rectRaw)
    await M('mouseMoved', c.x, c.y)
    await M('mousePressed', c.x, c.y); await sleep(60)
    for (let s = 1; s <= 8; s++) { await M('mouseMoved', c.x + 160 * s / 8, c.y + 110 * s / 8); await sleep(28) }
    await M('mouseReleased', c.x + 160, c.y + 110); await sleep(450)
  }
  const after = await ev(ws, sid, MEMO_DOM_LEFT)
  t(after > 100 && after > before, '[' + skin + '] 메모 자유 이동(left ' + before + '→' + after + ') — 손 떼도 안 튕김')
  t((await ev(ws, sid, MEMO_PERSIST_X)) > 100, '[' + skin + '] 이동 위치 localStorage 영속(메모 x=' + (await ev(ws, sid, MEMO_PERSIST_X)) + ')')

  // 항목 제거(원본 무관)
  const n0 = await ev(ws, sid, ITEM_COUNT)
  t(await ev(ws, sid, REMOVE_URL), '[' + skin + '] 항목 × 제거 버튼 클릭')
  await sleep(300)
  const n1 = await ev(ws, sid, ITEM_COUNT)
  t(n1 === n0 - 1, '[' + skin + '] 제거 후 항목 1개 감소(' + n0 + '→' + n1 + ')')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "(typeof window.__scriv==='object'&&!!window.__scriv&&typeof window.__scriv.state==='function')")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "(function(){try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){}return 1})()")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await ev(ws, sid, CLOSE_WELCOME); await sleep(400)
    try { await runSkin(ws, sid, skin, t, M) } catch (e) { bad.push('[' + skin + '] 예외: ' + e.message) }
  }
  console.log('=== 수집함 세밀 검증(양 스킨) ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
