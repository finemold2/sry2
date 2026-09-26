// 도구창 여러 개가 떠 있을 때 메뉴에서 모달(도구 허브 등)을 열면 그 모달이 '맨 위'에 떠야 한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

const MODALS = ['toolhub', 'compile', 'settings', 'genrebox', 'creative']
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'&&typeof window.__setModal==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // 도구창 3개 열기(각 openTool 이 bringToFront → z 증가)
  for (const id of ['name-mixer', 'character-forge', 'plot-twist-deck']) { await ev(ws, sid, "window.__openTool('" + id + "');return 1"); await sleep(400) }
  const nWin = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  t(nWin >= 3, '도구창 3개 떠 있음(' + nWin + ')')
  const maxToolZ = await ev(ws, sid, "return Math.max.apply(null,[].slice.call(document.querySelectorAll('.toolwin')).map(function(w){return parseInt(getComputedStyle(w).zIndex||'0',10)||0}).concat([0]))")

  for (const m of MODALS) {
    await ev(ws, sid, "window.__setModal('" + m + "');return 1")
    // 무거운 모달(창작 스튜디오 등)은 지연로딩(lazy)이라 늦게 뜸 — .modal-backdrop 출현까지 폴링.
    let present = false
    for (let k = 0; k < 16; k++) { await sleep(180); present = await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"); if (present) break }
    const modalZ = await ev(ws, sid, "var b=document.querySelector('.modal-backdrop');return b?parseInt(getComputedStyle(b).zIndex||'0',10)||0:-1")
    // 화면 중앙(모달 콘텐츠 위치)에서 가장 위 요소가 모달 안쪽인지 — 도구창이 위를 덮지 않아야 함
    const onTop = await ev(ws, sid, "var el=document.elementFromPoint(Math.round(innerWidth/2),Math.round(innerHeight/2));if(!el)return false;return !!el.closest('.modal-backdrop')&&!el.closest('.toolwin')")
    t(present && modalZ > maxToolZ && onTop, '[' + m + '] 모달이 도구창 위(modalZ ' + modalZ + ' > toolZ ' + maxToolZ + ', 중앙 최상위=' + onTop + ')')
    await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)
  }

  console.log('=== 모달이 도구창 위에 뜨는지 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
