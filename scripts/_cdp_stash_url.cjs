// 수집함에 URL 추가 후 클릭 → iframe 임베드(연결 거부 빈 화면)가 아니라 '새 탭(window.open)'으로 열리는지 검증.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__scriv==='object'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-win')"), '수집함 창 열림')
  const URL = 'https://example.org/stash-link-test'
  // prompt 를 가로채 URL 반환 → 'URL 추가' 버튼
  await ev(ws, sid, "window.prompt=function(){return '" + URL + "'};return 1")
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'')==='URL 추가'});if(b)b.click();return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-item.k-url')"), 'URL 항목이 수집함에 추가됨')

  // window.open 가로채기
  await ev(ws, sid, "window.__opened=[];window.open=function(u){window.__opened.push(String(u));return {closed:false}};return 1")
  // URL 항목을 실제 마우스로 클릭(캔버스 아이템은 pointerup 에서 열림)
  const c = JSON.parse(await ev(ws, sid, "var e=document.querySelector('.stash-item.k-url');if(!e)return 'null';var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})"))
  await M('mouseMoved', c.x, c.y); await M('mousePressed', c.x, c.y); await sleep(50); await M('mouseReleased', c.x, c.y); await sleep(500)

  const opened = await ev(ws, sid, "return (window.__opened||[]).join(',')")
  t(opened.indexOf('example.org') >= 0, '클릭 시 새 탭(window.open)으로 열림 — opened=' + JSON.stringify(opened))
  t(!(await ev(ws, sid, "return !!document.querySelector('.stash-viewer')")), 'iframe 임베드 뷰어(연결 거부 빈 화면) 안 뜸')

  console.log('=== 수집함 URL 새 탭 열기 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
