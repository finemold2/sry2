// 수집함 자유 이동 — 실제 마우스로 항목을 드래그하면 자유 이동하고 손 떼도 제자리로 안 튕기는지(버그: onItemMove 가 itemsRef 미갱신 → 튕김).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await sleep(3800)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  const clickAt = async (x, y) => { await M('mousePressed', x, y); await M('mouseReleased', x, y) }

  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(400)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-canvas')"), '수집함 캔버스 뷰 열림')
  const cb = JSON.parse(await ev(ws, sid, "var c=document.querySelector('.stash-canvas');var r=c.getBoundingClientRect();return JSON.stringify({l:r.left,t:r.top,w:r.width,h:r.height})"))
  for (let k = 0; k < 2; k++) {
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'').indexOf('메모 추가')===0});if(b)b.click();return 1"); await sleep(250)
    await ev(ws, sid, "var t=document.querySelector('.stash-memo-edit');if(t){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(t,'메모" + (k + 1) + "');t.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(120)
    await clickAt(cb.l + cb.w - 22, cb.t + cb.h - 22); await sleep(250) // 빈 캔버스 클릭 → 편집 종료(커밋)
  }
  t(await ev(ws, sid, "return document.querySelectorAll('.stash-item').length") >= 2, '텍스트 메모 2개 추가됨')
  t(await ev(ws, sid, "return !document.querySelector('.stash-memo-edit')"), '편집모드 종료(드래그 가능)')

  // 맨 위 항목을 실제 마우스로 +170,+120 드래그
  const c = JSON.parse(await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.stash-item'));var e=its[its.length-1];var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})"))
  await M('mouseMoved', c.x, c.y)
  await M('mousePressed', c.x, c.y); await sleep(60)
  for (let s = 1; s <= 8; s++) { await M('mouseMoved', c.x + 170 * s / 8, c.y + 120 * s / 8); await sleep(28) }
  await M('mouseReleased', c.x + 170, c.y + 120); await sleep(450)

  const after = JSON.parse(await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.stash-item'));return JSON.stringify(its.map(function(e){return {l:Math.round(parseFloat(e.style.left)||0),t:Math.round(parseFloat(e.style.top)||0)}}))"))
  const moved = after.find(a => a.l > 120 && a.t > 80)
  const stay = after.find(a => a.l < 80 && a.t < 80)
  t(!!moved, '드래그한 항목이 자유 이동(' + (moved ? moved.l + ',' + moved.t : '없음') + ') — 손 떼도 안 튕김')
  t(!!stay, '드래그 안 한 항목은 제자리(독립 이동)')
  const pmax = await ev(ws, sid, "var pid=window.__scriv.state().id;var arr=JSON.parse(localStorage.getItem('sry:stash:items:'+pid)||'[]');return Math.max.apply(null,arr.map(function(i){return Math.round(i.x)}).concat([0]))")
  t(pmax > 120, 'localStorage 에 이동 위치 영속(최대 x=' + pmax + ')')

  console.log('=== 수집함 자유 이동 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
