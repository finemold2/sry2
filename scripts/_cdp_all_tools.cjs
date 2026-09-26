// 레지스트리의 '모든 도구(555개)'를 하나도 빠짐없이 열어 렌더 + 콘솔에러 0 확인(전수 스모크).
//  · 각 도구: __openTool → .toolwin[data-tool-id] 출현 + 본문 비어있지 않음 + 그 사이 콘솔에러/예외 0 → __closeTool.
const fs = require('fs')
const path = require('path')
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, '_toolids.json'), 'utf8'))
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) return '__EXC__'; return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  let errBuf = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errBuf.push('exc:' + ((d.params.exceptionDetails.exception || {}).description || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errBuf.push('err:' + (d.params.args || []).map(a => String(a.value || a.description || '')).join(' ').slice(0, 80)) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  const noRender = [], blank = [], errored = []
  let okCount = 0
  for (const id of IDS) {
    errBuf = []
    const opened = await ev(ws, sid, "try{window.__openTool('" + id + "')}catch(e){return 'throw:'+e.message}return 1")
    await sleep(230)
    const sel = '.toolwin[data-tool-id="' + id + '"]'
    const rendered = await ev(ws, sid, "return !!document.querySelector('" + sel + "')")
    let bodyOk = false
    if (rendered) bodyOk = await ev(ws, sid, "var w=document.querySelector('" + sel + "');var b=w&&w.querySelector('.toolwin-body');return !!b&&((b.textContent||'').trim().length>0||b.querySelector('input,button,textarea,canvas,svg,select,img'))")
    const errs = errBuf.filter(e => !/ResizeObserver|Download the React DevTools|favicon/i.test(e))
    if (!rendered) noRender.push(id)
    else if (!bodyOk) blank.push(id)
    else if (errs.length) errored.push(id + ' « ' + errs[0])
    else okCount++
    await ev(ws, sid, "try{window.__closeTool&&window.__closeTool('" + id + "')}catch(e){}return 1"); await sleep(60)
    // 잔여 도구창이 쌓이면 정리(누수 방지)
    if ((IDS.indexOf(id) % 40) === 39) { await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin')).forEach(function(w){var id=w.getAttribute('data-tool-id');if(id&&window.__closeTool)window.__closeTool(id)});return 1"); await sleep(150) }
  }

  console.log('=== 모든 도구(555) 전수 스모크 ===')
  console.log('정상 렌더+무에러: ' + okCount + ' / ' + IDS.length)
  if (noRender.length) console.log('[ISSUE] 렌더 안 됨(' + noRender.length + '): ' + noRender.slice(0, 40).join(', '))
  if (blank.length) console.log('[ISSUE] 본문 비어있음(' + blank.length + '): ' + blank.slice(0, 40).join(', '))
  if (errored.length) console.log('[ISSUE] 콘솔에러/예외(' + errored.length + '):\n  - ' + errored.slice(0, 40).join('\n  - '))
  const bad = noRender.length + blank.length + errored.length
  console.log('결과: ' + okCount + ' 통과 / ' + bad + ' 실패')
  ws.close(); process.exit(bad ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
