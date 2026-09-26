// 스토리 캔버스 실동작 검증 — '+ 카드'로 노드를 추가하고, 노드를 '실제 마우스'로 드래그하면
// left/top(월드 좌표)이 변하고, 드래그 안 한 카드는 제자리(독립 이동)이며, 뷰 왕복(에디터↔캔버스)과
// 타깃 재생성(리로드/IDB) 후에도 좌표가 영속(setCanvas)되는지를 '조작→효과'로 단언한다.
// 검증된 CDP 하니스 패턴(_cdp_stash_drag.cjs) 그대로: 타깃 직접 생성, attach flatten, sleep(3800),
// Runtime.enable 호출 안 함, ev()=Runtime.evaluate returnByValue, 드래그는 Input 실마우스, 뷰전환은
// 윈도 keydown(ctrl+숫자) 디스패치(스킨 무관). classic·studio 양 스킨 모두 테스트.
const HUB = 'http://localhost:9222'; const URL = 'http://localhost:4178/'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 노드 목록(text/file 카드만; group 제외) → [{id,l,t}], l/t 는 월드 좌표(style.left/top)
const READ_NODES = "var ns=[].slice.call(document.querySelectorAll('.canvas-node'));return JSON.stringify(ns.map(function(e){return {id:e.getAttribute('data-node-id'),l:Math.round(parseFloat(e.style.left)||0),t:Math.round(parseFloat(e.style.top)||0)}}))"
const READ_IDS = "var ns=[].slice.call(document.querySelectorAll('.canvas-node'));return JSON.stringify(ns.map(function(e){return e.getAttribute('data-node-id')}))"
// 맨 위(마지막 DOM=가장 최근 추가=z 최상단) 카드의 화면 중심 + id
const READ_LAST = "var ns=[].slice.call(document.querySelectorAll('.canvas-node'));var e=ns[ns.length-1];var r=e.getBoundingClientRect();return JSON.stringify({id:e.getAttribute('data-node-id'),x:r.left+r.width/2,y:r.top+r.height/2})"
const byId = (arr, id) => arr.find(n => n.id === id)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 타깃 직접 생성(about:blank+navigate 금지) → attach(flatten) → 초기화 대기
  async function newTarget() {
    const { targetId } = await rpc(ws, 'Target.createTarget', { url: URL })
    const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
    await sleep(3800)
    return { targetId, sid }
  }
  // 실제 마우스 이벤트(합성 PointerEvent 금지 — React 핸들러 미발화)
  const M = (sid, type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  // 윈도 keydown 디스패치(앱은 window keydown 에서 ctrl+숫자=뷰 전환을 처리; 스킨 무관)
  const keyView = (sid, key) => ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'" + key + "',ctrlKey:true,bubbles:true,cancelable:true}));return 1")
  const closeModal = (sid) => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")

  // 한 스킨에서: 캔버스 진입 → 카드 2개 추가 → 맨 위 카드를 +160,+110 드래그 → 효과·독립·뷰왕복 단언.
  async function scenario(sid, label) {
    await closeModal(sid); await sleep(400)
    await keyView(sid, '5'); await sleep(750) // 스토리 캔버스로 전환
    t(await ev(ws, sid, "return !!document.querySelector('.canvas-area')"), label + ' 캔버스 뷰 열림')

    const beforeIds = JSON.parse(await ev(ws, sid, READ_IDS))
    for (let k = 0; k < 2; k++) {
      await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.canvas-toolbar button')).find(function(x){return (x.textContent||'').trim()==='+ 카드'});if(b)b.click();return !!b"); await sleep(280)
      await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1"); await sleep(200) // 편집모드(textarea) 종료 → 드래그 가능
    }
    const nodes2 = JSON.parse(await ev(ws, sid, READ_NODES))
    const newIds = nodes2.filter(n => !beforeIds.includes(n.id)).map(n => n.id)
    t(newIds.length >= 2, label + ' 새 카드 2개 추가됨(' + newIds.length + ')')
    t(await ev(ws, sid, "return !document.querySelector('.canvas-node-text')"), label + ' 편집모드 종료(드래그 가능)')

    // 맨 위(마지막 추가) 카드를 드래그 대상으로
    const tgt = JSON.parse(await ev(ws, sid, READ_LAST))
    const draggedId = tgt.id
    const otherId = newIds.find(id => id !== draggedId) || null
    const bDr = byId(nodes2, draggedId), bOth = otherId ? byId(nodes2, otherId) : null

    // 실제 마우스로 +160,+110 단계 드래그(임계값 통과하도록 8단계)
    await M(sid, 'mouseMoved', tgt.x, tgt.y)
    await M(sid, 'mousePressed', tgt.x, tgt.y); await sleep(60)
    for (let s = 1; s <= 8; s++) { await M(sid, 'mouseMoved', tgt.x + 160 * s / 8, tgt.y + 110 * s / 8); await sleep(28) }
    await M(sid, 'mouseReleased', tgt.x + 160, tgt.y + 110); await sleep(450)

    const nodes3 = JSON.parse(await ev(ws, sid, READ_NODES))
    const aDr = byId(nodes3, draggedId), aOth = otherId ? byId(nodes3, otherId) : null
    t(aDr && (aDr.l - bDr.l) >= 120, label + ' 드래그 카드 left 좌표 증가(' + (bDr ? bDr.l : '?') + '→' + (aDr ? aDr.l : '?') + ')')
    t(aDr && (aDr.t - bDr.t) >= 80, label + ' 드래그 카드 top 좌표 증가(' + (bDr ? bDr.t : '?') + '→' + (aDr ? aDr.t : '?') + ')')
    t(!!(aOth && bOth && Math.abs(aOth.l - bOth.l) < 5 && Math.abs(aOth.t - bOth.t) < 5), label + ' 드래그 안 한 카드는 제자리(독립 이동)')

    // 뷰 왕복: 에디터로 갔다가 캔버스로 복귀해도 좌표 유지(컴포넌트 재마운트가 project.canvas 에서 복원)
    await keyView(sid, '1'); await sleep(500)
    await keyView(sid, '5'); await sleep(650)
    const nodes4 = JSON.parse(await ev(ws, sid, READ_NODES))
    const rDr = byId(nodes4, draggedId)
    t(!!(rDr && Math.abs(rDr.l - aDr.l) < 5 && Math.abs(rDr.t - aDr.t) < 5), label + ' 뷰 왕복 후 좌표 영속(' + (rDr ? rDr.l + ',' + rDr.t : '없음') + ')')
    return { draggedId, pos: aDr }
  }

  // ── classic 스킨(기본) ──
  const c0 = await newTarget()
  await ev(ws, c0.sid, "try{localStorage.setItem('sry:uiSkin','classic')}catch(e){}return 1")
  const classic = await scenario(c0.sid, '[classic]')

  // 변경분이 IDB 자동저장될 때까지 dirty 가 내려가길 대기(최대 ~8s)
  for (let i = 0; i < 16; i++) { const d = await ev(ws, c0.sid, "try{return !!window.__scriv.state().dirty}catch(e){return false}"); if (!d) break; await sleep(500) }

  // ── 타깃 재생성(리로드) 후 IDB 영속 검증 ──
  const c1 = await newTarget()
  await closeModal(c1.sid); await sleep(300)
  await keyView(c1.sid, '5'); await sleep(800)
  let nodesR = []
  for (let i = 0; i < 10; i++) { try { nodesR = JSON.parse(await ev(ws, c1.sid, READ_NODES)) } catch (e) { nodesR = [] } if (nodesR.length) break; await sleep(500) }
  const pDr = byId(nodesR, classic.draggedId)
  t(!!(pDr && Math.abs(pDr.l - classic.pos.l) < 6 && Math.abs(pDr.t - classic.pos.t) < 6), '[classic] 타깃 재생성(리로드) 후 드래그 좌표 IDB 영속(setCanvas) ' + (pDr ? pDr.l + ',' + pDr.t : '없음(영속 실패)'))

  // ── studio 스킨 ──
  await ev(ws, c0.sid, "try{localStorage.setItem('sry:uiSkin','studio')}catch(e){}return 1")
  const s0 = await newTarget()
  t(await ev(ws, s0.sid, "return !!document.querySelector('.app-studio')"), '[studio] 스튜디오 스킨 로드')
  await scenario(s0.sid, '[studio]')

  // 정리: 스킨 원복(사용자를 studio 에 남기지 않음)
  await ev(ws, s0.sid, "try{localStorage.setItem('sry:uiSkin','classic')}catch(e){}return 1")

  console.log('=== 스토리 캔버스 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
