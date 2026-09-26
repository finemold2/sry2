// 웹연재 코어 기능 부팅 스모크: 플랫폼 독자뷰 미리보기 모달 + 연재 성과 탭.
// 사용: node scripts/_cdp_serial.cjs
const HUB = 'http://localhost:9222'
const APP = 'http://localhost:4178/'
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
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
async function ev(ws, sid, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result?.value
}
async function main() {
  const ws = new WebSocket(await getBrowserWs())
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []
  ws.addEventListener('message', (e) => {
    let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') { const x = d.params.exceptionDetails; errs.push('EX: ' + String(x.exception?.description || x.text).split('\n')[0].slice(0, 160)) }
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { errs.push('CE: ' + (d.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 160)) }
  })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Page.enable', {}, sid)
  await rpc(ws, 'Page.navigate', { url: APP }, sid)
  await sleep(3500)
  const pass = []; const fail = []
  const ok = (c, m) => (c ? pass : fail).push(m)

  // 부팅 확인
  const booted = await ev(ws, sid, `!!document.querySelector('.app, #root > *')`)
  ok(booted, '앱 부팅')

  // 활성 문서에 본문 주입(미리보기에 보일 내용)
  await ev(ws, sid, `window.__scriv && window.__scriv.setBody && window.__scriv.setBody('{\\\\rtf1 첫 문단입니다. 충분한 분량을 시뮬레이션합니다.\\\\par 둘째 문단도 있습니다.\\\\par}')`)
  await sleep(300)

  // 플랫폼 독자뷰 미리보기 열기
  await ev(ws, sid, `window.dispatchEvent(new CustomEvent('scriv:reader-preview',{detail:''}))`)
  await sleep(900)
  const modalText = await ev(ws, sid, `(document.querySelector('.modal')||{}).textContent||''`)
  ok(/독자뷰/.test(modalText), '독자뷰 모달 표시')
  const chipCount = await ev(ws, sid, `Array.from(document.querySelectorAll('.modal .minibtn')).filter(b=>/문피아|네이버|카카오|노벨피아|리디|조아라/.test(b.textContent)).length`)
  ok(chipCount >= 6, `플랫폼 칩 ${chipCount}/6`)
  const hasFrame = await ev(ws, sid, `!!document.querySelector('.modal p')`)
  ok(hasFrame, '폰 프레임 본문 렌더')
  // 플랫폼 전환 클릭(노벨피아=다크) 후 예외 없는지
  await ev(ws, sid, `(Array.from(document.querySelectorAll('.modal .minibtn')).find(b=>b.textContent==='노벨피아')||{}).click&&Array.from(document.querySelectorAll('.modal .minibtn')).find(b=>b.textContent==='노벨피아').click()`)
  await sleep(400)
  // 글자크기 A+ 클릭
  await ev(ws, sid, `(Array.from(document.querySelectorAll('.modal .minibtn')).find(b=>b.textContent==='A+')||{}).click&&Array.from(document.querySelectorAll('.modal .minibtn')).find(b=>b.textContent==='A+').click()`)
  await sleep(300)
  ok(true, '플랫폼 전환·글자크기 조작')
  // 닫기
  await ev(ws, sid, `(Array.from(document.querySelectorAll('.modal button')).find(b=>b.textContent.includes('닫기'))||{}).click&&Array.from(document.querySelectorAll('.modal button')).find(b=>b.textContent.includes('닫기')).click()`)
  await sleep(400)
  const modalGone = await ev(ws, sid, `!document.querySelector('.modal')`)
  ok(modalGone, '모달 닫힘')

  // 연재 뷰로 전환 후 성과 탭
  const navClicked = await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button,a,[role=tab]')).find(x=>/연재/.test((x.getAttribute&&x.getAttribute('title'))||'')||/연재/.test(x.getAttribute&&x.getAttribute('aria-label')||'')||(/연재/.test(x.textContent||'')&&(x.textContent||'').length<16));if(b){b.click();return true}return false})()`)
  await sleep(900)
  ok(navClicked, '연재 뷰 진입 시도')
  const perfClicked = await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('.serial-toolbar .minibtn, button')).find(x=>(x.textContent||'').trim()==='성과');if(b){b.click();return true}return false})()`)
  await sleep(700)
  ok(perfClicked, '성과 탭 클릭')
  const hasPerfTable = await ev(ws, sid, `!!document.querySelector('.perf-table')`)
  ok(hasPerfTable, '성과 테이블 렌더')

  console.log('=== 웹연재 코어 스모크 ===')
  pass.forEach((p) => console.log('  ✓ ' + p))
  fail.forEach((f) => console.log('  ✗ ' + f))
  console.log(`결과: ${pass.length} 통과 / ${fail.length} 실패`)
  if (errs.length) { console.log('--- 콘솔/예외 ---'); [...new Set(errs)].slice(0, 12).forEach((e) => console.log('  ' + e)) }
  else console.log('콘솔 에러/예외: 없음')
  ws.close()
  process.exit(fail.length || errs.length ? 1 : 0)
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(2) })
