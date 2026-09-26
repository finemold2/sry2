// 스냅샷(데이터안전) 실동작 검증 — 탭 진입 무크래시 + 찍기(+1) + 본문변경 후 되돌리기로 원복 + 자동백업 스냅샷.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  const docId = await ev(ws, sid, `return window.__scriv.state().activeId`)
  t(!!docId, '문서 자동 선택됨(activeId)')
  // 스냅샷 탭 진입 — 과거 무한루프(React#185)로 인스펙터가 통째로 언마운트되던 회귀 가드
  await ev(ws, sid, `document.querySelector('#insp-tab-snapshots').click();return 1`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.inspector')`), '스냅샷 탭 진입 후 인스펙터 생존(무한루프 회귀 없음)')
  t(await ev(ws, sid, `return document.querySelector('#insp-tab-snapshots').getAttribute('aria-selected')==='true'`), '스냅샷 탭 활성화')
  t(await ev(ws, sid, `return !!document.querySelector('.snap-take')`), '스냅샷 작성 UI(.snap-take) 렌더')

  const sb = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.snap-take button,#insp-panel button')].find(x=>/지금 찍기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(500)
  const sa = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  t(sa === sb + 1, `"지금 찍기"로 스냅샷 1개 생성 (${sb}→${sa})`)

  // 본문 변경 후 되돌리기 → 스냅샷 시점으로 원복
  await ev(ws, sid, `window.__scriv.setBody('{\\\\rtf1\\\\ansi 완전히바뀐본문ABC\\\\par}');return 1`); await sleep(300)
  const changed = await ev(ws, sid, `return (window.__scriv.bodyOf(window.__scriv.state().activeId)||'')`)
  t(/바뀐본문ABC/.test(changed), '본문 변경 반영')
  await ev(ws, sid, `window.confirm=()=>true;const b=[...document.querySelectorAll('.snap-item .snap-actions button')].find(x=>/되돌리기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(500)
  const restored = await ev(ws, sid, `return (window.__scriv.bodyOf(window.__scriv.state().activeId)||'')`)
  t(!/바뀐본문ABC/.test(restored), '되돌리기로 본문이 스냅샷 시점으로 원복(변경분 사라짐)')
  // 되돌리기 직전 자동백업 스냅샷이 추가되어 직전 원고도 보존
  const sc = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  t(sc >= sa + 1, `되돌리기 직전 자동백업 스냅샷 생성(직전 원고 보존, ${sa}→${sc})`)

  // 비교 화면 진입
  await ev(ws, sid, `const b=[...document.querySelectorAll('.snap-item .snap-actions button')].find(x=>/비교/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  t(await ev(ws, sid, `return !!document.querySelector('.snap-compare-head,.snap-diff')`), '비교 화면 진입·렌더')

  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')
  console.log('=== 스냅샷(데이터안전) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
