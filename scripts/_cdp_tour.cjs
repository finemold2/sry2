// 인터랙티브 가이드 투어(온보딩 도움말) 실동작 검증 — 자동시작·다음/이전·스포트라이트·그만보기·재열기.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
const clickTourBtn = (re) => `(()=>{const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>${re}.test((x.textContent||'').trim()));if(b){b.click();return 'ok'}return 'no'})()`
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 깨끗한 첫 방문 보장: tour-done 키 제거 후 리로드
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(2500)
  await ev(ws, sid, `try{localStorage.removeItem('sry:tour:done')}catch(e){}; return 1`)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 1) 앱 시작 시 자동으로 투어 말풍선 등장
  t(await ev(ws, sid, `return !!document.querySelector('.tour-bubble')`), '앱 시작 시 가이드 투어 자동 시작(말풍선 등장)')
  t(/1 \/ \d/.test(await ev(ws, sid, `const e=document.querySelector('.tour-count');return e?e.textContent:''`)), '첫 단계 표시(1 / N)')
  t(/처음이시죠|안녕/.test(await ev(ws, sid, `const e=document.querySelector('.tour-bubble');return e?e.textContent:''`)), '대화형 인사 문구 표시')

  // 2) '다음'으로 진행 → 2단계 + 실제 UI 스포트라이트
  await ev(ws, sid, clickTourBtn('/다음/')); await sleep(500)
  t(/2 \/ \d/.test(await ev(ws, sid, `const e=document.querySelector('.tour-count');return e?e.textContent:''`)), "'다음' 클릭 → 2단계로 진행")
  t(await ev(ws, sid, `return !!document.querySelector('.tour-spotlight')`), '실제 UI 요소 스포트라이트 표시(바인더)')
  // 스포트라이트가 바인더 영역과 겹치는지(대략)
  t(await ev(ws, sid, `const s=document.querySelector('.tour-spotlight'),b=document.querySelector('.binder');if(!s||!b)return false;const r1=s.getBoundingClientRect(),r2=b.getBoundingClientRect();return Math.abs(r1.left-r2.left)<20&&Math.abs(r1.top-r2.top)<20`), '스포트라이트가 바인더 위치에 정렬됨')

  // 3) '이전'으로 복귀
  await ev(ws, sid, clickTourBtn('/이전/')); await sleep(400)
  t(/1 \/ \d/.test(await ev(ws, sid, `const e=document.querySelector('.tour-count');return e?e.textContent:''`)), "'이전' 클릭 → 1단계로 복귀")

  // 4) 진행 점(dots) 클릭으로 점프
  await ev(ws, sid, `const d=document.querySelectorAll('.tour-dot');if(d[4])d[4].click();return 1`); await sleep(400)
  t(/5 \/ \d/.test(await ev(ws, sid, `const e=document.querySelector('.tour-count');return e?e.textContent:''`)), '진행 점 클릭으로 단계 점프')

  // 5) '그만 보기'로 닫힘 + 기록 + 자동 재등장 안 함
  await ev(ws, sid, clickTourBtn('/그만 보기/')); await sleep(400)
  t(!(await ev(ws, sid, `return !!document.querySelector('.tour-root')`)), "'그만 보기' 클릭 → 투어 즉시 사라짐")
  t(await ev(ws, sid, `try{return localStorage.getItem('sry:tour:done')==='1'}catch(e){return false}`), '닫음 기록(sry:tour:done) 저장')

  // 6) '?' 버튼/훅으로 다시 열기
  await ev(ws, sid, `const b=[...document.querySelectorAll('.tbtn')].find(x=>(x.getAttribute('aria-label')||'')==='도움말');if(b){b.click();return'btn'}if(window.__startTour){window.__startTour();return'hook'}return'no'`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.tour-bubble')`), "'?' 도움말 버튼으로 투어 다시 열기")

  // 7) 마지막 단계 → '글쓰기 시작'으로 닫힘
  for (let k = 0; k < 30; k++) { const lastBtn = await ev(ws, sid, `const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>/글쓰기 시작/.test(x.textContent||''));return !!b`); if (lastBtn) break; await ev(ws, sid, clickTourBtn('/다음/')); await sleep(200) }
  t(await ev(ws, sid, `return !!document.querySelector('.tour-bubble button')&&[...document.querySelectorAll('.tour-bubble button')].some(b=>/글쓰기 시작/.test(b.textContent||''))`), '마지막 단계 ‘글쓰기 시작’ 버튼 표시')
  await ev(ws, sid, clickTourBtn('/글쓰기 시작/')); await sleep(400)
  t(!(await ev(ws, sid, `return !!document.querySelector('.tour-root')`)), "‘글쓰기 시작’으로 투어 종료")

  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')
  console.log('=== 인터랙티브 가이드 투어 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
