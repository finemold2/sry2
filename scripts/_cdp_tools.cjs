// 헤드리스 Chrome(CDP)으로 도구 허브의 모든 유틸리티 도구를 하나씩 열어 mount/예외/언마운트를 검증한다.
// 사용: node scripts/_cdp_tools.cjs "id1,id2,..."
const APP = 'http://localhost:4178/'
const HUB = 'http://localhost:9222'
const IDS = (process.argv[2] || '').split(',').map((s) => s.trim()).filter(Boolean)

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function getBrowserWs() {
  const r = await fetch(HUB + '/json/version')
  const j = await r.json()
  return j.webSocketDebuggerUrl
}

let _id = 0
function rpc(ws, method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++_id
    const msg = { id, method, params: params || {} }
    if (sessionId) msg.sessionId = sessionId
    const onMsg = (ev) => {
      let d; try { d = JSON.parse(ev.data) } catch { return }
      if (d.id === id) { ws.removeEventListener('message', onMsg); d.error ? reject(new Error(d.error.message)) : resolve(d.result) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify(msg))
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + method)) }, 30000)
  })
}

async function evalP(ws, sid, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result?.value
}

async function main() {
  const bws = await getBrowserWs()
  const ws = new WebSocket(bws)
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })

  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const sid = sessionId

  let current = ''
  const events = [] // {id, kind, text}
  ws.addEventListener('message', (ev) => {
    let d; try { d = JSON.parse(ev.data) } catch { return }
    if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails
      const t = e.exception?.description || e.text || 'exception'
      events.push({ id: current, kind: 'exception', text: String(t).split('\n')[0].slice(0, 200) })
    } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      const t = (d.params.args || []).map((a) => a.value || a.description || a.unserializableValue || '').join(' ')
      events.push({ id: current, kind: 'console.error', text: String(t).slice(0, 200) })
    }
  })

  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Log.enable', {}, sid)
  await rpc(ws, 'Page.enable', {}, sid)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, sid)
  await rpc(ws, 'Page.navigate', { url: APP }, sid)

  // 앱 로드 대기
  let ready = false
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try { if ((await evalP(ws, sid, 'typeof window.__openTool')) === 'function') { ready = true; break } } catch {}
  }
  if (!ready) { console.log(JSON.stringify({ fatal: 'app not ready (__openTool missing)' })); ws.close(); return }
  await sleep(800)

  const results = []
  for (const id of IDS) {
    current = id
    const before = events.length
    let mounted = false, snippet = ''
    try {
      await evalP(ws, sid, `window.__openTool(${JSON.stringify(id)})`)
      await sleep(1500)
      const info = await evalP(ws, sid, `(function(){var w=document.querySelectorAll('.toolwin');if(!w.length)return{m:false,s:''};var last=w[w.length-1];return{m:true,s:(last.innerText||'').replace(/\\s+/g,' ').trim().slice(0,80)}})()`)
      mounted = !!(info && info.m)
      snippet = (info && info.s) || ''
      await evalP(ws, sid, `window.__closeTool(${JSON.stringify(id)})`)
      await sleep(250)
    } catch (e) {
      events.push({ id, kind: 'driver', text: String(e.message).slice(0, 200) })
    }
    const errs = events.slice(before).filter((e) => e.id === id)
    results.push({ id, mounted, snippet, errs })
  }

  // 요약 출력
  const bad = results.filter((r) => !r.mounted || r.errs.length)
  console.log('=== TOOL RENDER REPORT ===')
  console.log('total=' + results.length + ' ok=' + (results.length - bad.length) + ' problems=' + bad.length)
  for (const r of results) {
    const flag = (!r.mounted ? '✗NOMOUNT ' : '') + (r.errs.length ? '⚠' + r.errs.length + 'err' : '')
    if (flag) console.log(`- ${r.id}: ${flag}`)
    for (const e of r.errs) console.log(`    [${e.kind}] ${e.text}`)
  }
  if (!bad.length) console.log('ALL TOOLS MOUNTED CLEANLY ✓')
  ws.close()
}
main().catch((e) => { console.log('SCRIPT ERR: ' + e.message); process.exit(1) })
