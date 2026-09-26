// 심화 베타: 각 도구를 열고 실제로 버튼 클릭 + 입력칸 타이핑을 수행하며 런타임 예외/콘솔에러를 수집한다.
// 렌더(mount)만이 아니라 이벤트 핸들러 오류까지 잡는다. 사용: node scripts/_cdp_interact.cjs "id1,id2,..."
const APP = 'http://localhost:4178/'
const HUB = 'http://localhost:9222'
const IDS = (process.argv[2] || '').split(',').map((s) => s.trim()).filter(Boolean)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getBrowserWs() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _id = 0
function rpc(ws, method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId
    const onMsg = (ev) => { let d; try { d = JSON.parse(ev.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', onMsg); d.error ? reject(new Error(d.error.message)) : resolve(d.result) } }
    ws.addEventListener('message', onMsg); ws.send(JSON.stringify(msg))
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + method)) }, 30000)
  })
}
async function evalP(ws, sid, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result?.value
}

// 페이지 안에서 실행될 상호작용 함수(문자열로 주입). 마지막 도구창(.toolwin) 안에서:
// 1) 입력칸/textarea 에 네이티브 setter 로 값 주입+input 이벤트 2) 액션 버튼 최대 3개 클릭(삭제/닫기/위험 제외)
const INTERACT = `
(async function(){
  function setNative(el,val){
    var proto = el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
    var d=Object.getOwnPropertyDescriptor(proto,'value'); if(d&&d.set){d.set.call(el,val);} else {el.value=val;}
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  var wins=document.querySelectorAll('.toolwin'); if(!wins.length) return {acted:false};
  var w=wins[wins.length-1];
  var acted=0;
  // 텍스트 입력
  var inp=w.querySelector('input[type=text],input:not([type]),textarea,input[type=search]');
  if(inp){ inp.focus(); setNative(inp, '베타테스트 입력 가나다 ABC 123'); acted++; await new Promise(r=>setTimeout(r,150)); inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); }
  // 숫자 입력
  var num=w.querySelector('input[type=number]'); if(num){ num.focus(); setNative(num,'3'); acted++; }
  // 셀렉트 변경
  var sel=w.querySelector('select'); if(sel&&sel.options.length>1){ sel.selectedIndex=Math.min(1,sel.options.length-1); sel.dispatchEvent(new Event('change',{bubbles:true})); acted++; }
  await new Promise(r=>setTimeout(r,150));
  // 안전한 액션 버튼 클릭(삭제/지우기/닫기/비우기 제외)
  var btns=[].slice.call(w.querySelectorAll('button'));
  var danger=/삭제|지우기|비우기|초기화|닫기|제거|reset|delete|clear|remove|×|✕/i;
  var clicked=0;
  for(var i=0;i<btns.length && clicked<3;i++){
    var b=btns[i]; var t=(b.innerText||b.title||'').trim();
    if(danger.test(t)) continue;
    if(b.disabled) continue;
    try{ b.click(); clicked++; acted++; }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  return {acted:acted>0, inputs: acted, buttons: clicked, key: 'scrivweb:tool:'};
})()
`

async function main() {
  const ws = new WebSocket(await getBrowserWs())
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  let current = ''; const events = []
  ws.addEventListener('message', (ev) => {
    let d; try { d = JSON.parse(ev.data) } catch { return } if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; events.push({ id: current, kind: 'exception', text: String(e.exception?.description || e.text || 'ex').split('\n')[0].slice(0, 220) }) }
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { const t = (d.params.args || []).map((a) => a.value || a.description || '').join(' '); events.push({ id: current, kind: 'console.error', text: String(t).slice(0, 220) }) }
  })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Log.enable', {}, sid); await rpc(ws, 'Page.enable', {}, sid)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, sid)
  await rpc(ws, 'Page.navigate', { url: APP }, sid)
  let ready = false
  for (let i = 0; i < 40; i++) { await sleep(500); try { if ((await evalP(ws, sid, 'typeof window.__openTool')) === 'function') { ready = true; break } } catch {} }
  if (!ready) { console.log('FATAL app not ready'); ws.close(); return }
  await sleep(700)
  const results = []
  for (const id of IDS) {
    current = id; const before = events.length; let acted = false
    try {
      await evalP(ws, sid, `window.__openTool(${JSON.stringify(id)})`)
      await sleep(900)
      const r = await evalP(ws, sid, INTERACT)
      acted = !!(r && r.acted)
      await sleep(400)
      await evalP(ws, sid, `window.__closeTool(${JSON.stringify(id)})`)
      await sleep(200)
    } catch (e) { events.push({ id, kind: 'driver', text: String(e.message).slice(0, 220) }) }
    const errs = events.slice(before).filter((e) => e.id === id)
    results.push({ id, acted, errs })
  }
  const bad = results.filter((r) => r.errs.length)
  const noact = results.filter((r) => !r.acted)
  console.log('=== INTERACTION BETA REPORT ===')
  console.log('total=' + results.length + ' clean=' + (results.length - bad.length) + ' withErrors=' + bad.length + ' (noInteractiveEl=' + noact.length + ')')
  for (const r of results) { if (r.errs.length) { console.log('- ' + r.id + ': ⚠' + r.errs.length); for (const e of r.errs) console.log('    [' + e.kind + '] ' + e.text) } }
  if (!bad.length) console.log('NO RUNTIME ERRORS DURING INTERACTION ✓')
  if (noact.length) console.log('no interactive element acted: ' + noact.map((r) => r.id).join(', '))
  ws.close()
}
main().catch((e) => { console.log('SCRIPT ERR: ' + e.message); process.exit(1) })
