// 바인더 이름변경/추가 검증 — 새 항목 자동 인라인 편집 + 우클릭 '이름 바꾸기'.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  // 첫 실행 환영 모달 닫기(있으면)
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('.modal button')).find(x=>/시작하기|다시 보지/.test(x.textContent||''));if(b)b.click()})()`); await sleep(300)
  // 1) 새 글 버튼 → 인라인 편집 input 등장
  await ev(ws, sid, `(()=>{const b=document.querySelector('.binder .minibtn[title="새 글"]')||document.querySelector('.binder .minibtn[title="새 텍스트"]');if(b)b.click()})()`); await sleep(500)
  t(await ev(ws, sid, `!!document.querySelector('.binder-rename')`), '새 텍스트 추가 시 인라인 이름편집 입력칸 등장')
  await ev(ws, sid, `(()=>{const i=document.querySelector('.binder-rename');if(i){i.value='테스트장면';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}})()`); await sleep(400)
  t(await ev(ws, sid, `/테스트장면/.test((document.querySelector('.binder')||document.body).innerText||'')`), '입력한 파일명이 반영됨')
  // 2) 우클릭 → 이름 바꾸기
  await ev(ws, sid, `(()=>{const rows=Array.from(document.querySelectorAll('.binder .binder-row'));const r=rows.find(x=>/테스트장면/.test(x.textContent||''))||rows[rows.length-1];if(r){const rc=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rc.left+20,clientY:rc.top+8}))}})()`); await sleep(400)
  t(await ev(ws, sid, `Array.from(document.querySelectorAll('.context-menu button')).some(b=>/이름 바꾸기/.test(b.textContent||''))`), '우클릭 메뉴에 이름 바꾸기 항목 있음')
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('.context-menu button')).find(b=>/이름 바꾸기/.test(b.textContent||''));if(b)b.click()})()`); await sleep(400)
  t(await ev(ws, sid, `!!document.querySelector('.binder-rename')`), '이름 바꾸기 클릭 시 인라인 편집 시작')
  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 바인더 이름변경/추가 검증 ==='); ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m)); console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
