// 수집함 메모 → 원고 삽입 검증 + 도구창에 'UI 통째 긁기' 수집함 버튼이 사라졌는지 확인.
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
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'&&typeof window.__scriv==='object'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  const MARK = 'STASHINS' + (Math.floor(Date.now() / 1000) % 100000)

  // 에디터 뷰 + 활성 문서 확보(없으면 첫 텍스트 선택)
  await ev(ws, sid, "window.__setView&&window.__setView('editor');return 1"); await sleep(300)
  await ev(ws, sid, "var s=window.__scriv.state();if(!s.activeId){var ft=Object.values(s.project.items).find(function(x){return x.type==='text'});if(ft)window.__scriv&&window.__scriv;return ft?ft.id:''}return s.activeId")
  const activeId = await ev(ws, sid, "return window.__scriv.state().activeId||''")
  // 본문 기준선(삽입 전 마커 없음)
  const before = await ev(ws, sid, "var p=document.querySelector('.paper');return p?(p.textContent||''):''")

  // 수집함 열고 메모 추가
  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-win')"), '수집함 창 열림')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'').indexOf('메모 추가')===0});if(b)b.click();return 1"); await sleep(350)
  // 메모 텍스트 입력 + 커밋(blur)
  await ev(ws, sid, "var ta=document.querySelector('.stash-memo-edit');if(ta){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(ta,'" + MARK + " 수집함에서 원고로 보낸 메모');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.blur()}return 1"); await sleep(400)
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.stash-win .stash-item')).some(function(e){return /" + MARK + "/.test(e.textContent||'')})"), '메모가 수집함에 담김')
  // '원고에 삽입' 버튼 존재 + 클릭
  t(await ev(ws, sid, "return !!document.querySelector('.stash-item-insert')"), '메모에 ‘원고에 삽입’(⤵) 버튼 있음')
  await ev(ws, sid, "var b=document.querySelector('.stash-item-insert');if(b)b.click();return 1"); await sleep(600)

  // 본문에 마커가 실제로 들어갔는지
  const after = await ev(ws, sid, "var p=document.querySelector('.paper');return p?(p.textContent||''):''")
  t(after.indexOf(MARK) >= 0 && before.indexOf(MARK) < 0, '메모 텍스트가 원고(.paper)에 삽입됨')
  // 영속(RTF 본문에 반영)
  await sleep(300)
  const persisted = await ev(ws, sid, "var id=window.__scriv.state().activeId;return id?(window.__scriv.bodyOf(id)||''):''")
  t(persisted.indexOf(MARK) >= 0, '삽입 텍스트가 RTF 본문(bodyRtf)에 반영' + (activeId ? '' : ' (activeId 없음 주의)'))

  // 도구창에 일반 '수집함에 담기' 버튼이 사라졌는지
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(800)
  t(await ev(ws, sid, "return !!document.querySelector('.toolwin[data-tool-id=\"name-mixer\"]')"), '도구창 열림(name-mixer)')
  t(!(await ev(ws, sid, "return !!document.querySelector('.toolwin[data-tool-id=\"name-mixer\"] [aria-label=\"수집함에 담기\"]')")), '도구창에서 일반 ‘수집함에 담기’ 버튼 제거됨')

  console.log('=== 수집함→원고 삽입 + 도구창 버튼 제거 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
