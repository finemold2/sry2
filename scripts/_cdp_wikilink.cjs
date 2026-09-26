// [[ 위키 링크 자동완성 헤비 스모크: 정상 타이핑 비간섭 + 팝업 + 링크 삽입 + 삽입 후 타이핑 + 콘솔 에러 0.
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
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + method)) }, 25000)
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

  // 문서 여러 개 생성(추천 후보 확보) — "+ 글" 버튼(title=새 텍스트). count 가 오를 때까지 반복.
  let docCount = 0
  for (let i = 0; i < 8 && docCount < 4; i++) {
    await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('title')==='새 글'||x.getAttribute('title')==='새 텍스트');if(b)b.click()})()`)
    await sleep(450)
    docCount = await ev(ws, sid, `window.__scriv?window.__scriv.entries().filter(e=>e.type==='text').length:0`)
  }
  ok(docCount >= 2, `문서 ${docCount}개 생성(추천 후보 확보)`)
  await sleep(300)

  // 에디터 .paper 가 떴는지 확인 후 포커스 + 캐럿 끝으로(null 가드).
  const hasPaper = await ev(ws, sid, `!!document.querySelector('.paper')`)
  ok(hasPaper, '에디터 .paper 존재')
  const focusPaper = `(()=>{const el=document.querySelector('.paper');if(!el)return false;el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);return true})()`
  await ev(ws, sid, focusPaper)
  await sleep(150)

  // 1) 정상 타이핑 비간섭
  await rpc(ws, 'Input.insertText', { text: '평범한 문장을 먼저 적는다.' }, sid)
  await sleep(250)
  const normal = await ev(ws, sid, `((document.querySelector('.paper')||{}).textContent||'').includes('평범한 문장')`)
  ok(normal, '정상 타이핑 반영(비간섭)')
  const popAfterNormal = await ev(ws, sid, `!document.querySelector('.wikilink-pop')`)
  ok(popAfterNormal, '일반 타이핑 중 팝업 안 뜸')

  // 2) [[ 입력 → 팝업 (실제 타이핑처럼 keyup 도 발생)
  await rpc(ws, 'Input.insertText', { text: ' [[' }, sid)
  await ev(ws, sid, `(document.querySelector('.paper')||document.createElement('div')).dispatchEvent(new KeyboardEvent('keyup',{key:'[',bubbles:true}))`)
  await sleep(400)
  const popShown = await ev(ws, sid, `!!document.querySelector('.wikilink-pop')`)
  ok(popShown, '[[ 입력 시 추천 팝업 표시')
  const itemCount = await ev(ws, sid, `document.querySelectorAll('.wikilink-item').length`)
  ok(itemCount >= 1, `추천 항목 ${itemCount}개`)

  // 3) 첫 항목 선택(mousedown) → 내부 링크 삽입
  await ev(ws, sid, `(()=>{const it=document.querySelector('.wikilink-item');if(it)it.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}))})()`)
  await sleep(350)
  const linkInserted = await ev(ws, sid, `!!document.querySelector('.paper a[href^="scriv://"]')`)
  ok(linkInserted, '내부 링크(scriv://) 삽입됨')
  const popClosed = await ev(ws, sid, `!document.querySelector('.wikilink-pop')`)
  ok(popClosed, '선택 후 팝업 닫힘')
  const bracketGone = await ev(ws, sid, `!((document.querySelector('.paper')||{}).textContent||'').includes('[[')`)
  ok(bracketGone, '[[ 잔여물 제거됨')

  // 4) 링크 삽입 후 정상 타이핑 지속
  await ev(ws, sid, focusPaper)
  await rpc(ws, 'Input.insertText', { text: ' 계속 이어서 쓴다.' }, sid)
  await sleep(250)
  const after = await ev(ws, sid, `((document.querySelector('.paper')||{}).textContent||'').includes('계속 이어서')`)
  ok(after, '링크 삽입 후 정상 타이핑 지속')

  // 5) Esc 로 닫기 동작
  await rpc(ws, 'Input.insertText', { text: ' [[' }, sid)
  await ev(ws, sid, `(document.querySelector('.paper')||document.createElement('div')).dispatchEvent(new KeyboardEvent('keyup',{key:'[',bubbles:true}))`)
  await sleep(300)
  const pop2 = await ev(ws, sid, `!!document.querySelector('.wikilink-pop')`)
  await ev(ws, sid, `(()=>{const el=document.querySelector('.paper');if(el)el.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))})()`)
  await sleep(250)
  const escClosed = await ev(ws, sid, `!document.querySelector('.wikilink-pop')`)
  ok(pop2 && escClosed, 'Esc 로 팝업 닫힘')

  console.log('=== [[ 위키 링크 자동완성 스모크 ===')
  pass.forEach((p) => console.log('  ✓ ' + p))
  fail.forEach((f) => console.log('  ✗ ' + f))
  console.log(`결과: ${pass.length} 통과 / ${fail.length} 실패`)
  if (errs.length) { console.log('--- 콘솔/예외 ---'); [...new Set(errs)].slice(0, 12).forEach((e) => console.log('  ' + e)) }
  else console.log('콘솔 에러/예외: 없음')
  ws.close()
  process.exit(fail.length || errs.length ? 1 : 0)
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(2) })
