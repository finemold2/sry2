// 실습형 매뉴얼(GuidedManual) 실동작 검증 — 실제 사용자처럼 끝까지 따라가며 각 실습의 '효과'를 확인.
//  · 각 실습 단계는 '대신 해줄게요'로 실행 → 매뉴얼 자체 완료조건(✓ done)이 통과해야 진짜 효과가 난 것.
//  · 연습 폴더/글 생성·본문 입력·도구 창·끝까지 진행·그만보기 닫힘을 검증.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
const clickBtn = (re) => `(()=>{const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>${re}.test((x.textContent||'').trim()));if(b){b.click();return 'ok'}return 'no'})()`
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 매뉴얼 시작
  await ev(ws, sid, `window.__startManual();return 1`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.manual-bubble')`), '‘더 알아보기’ 매뉴얼 시작(말풍선 등장)')
  t(/챕터 \d+\/\d+/.test(await ev(ws, sid, `const e=document.querySelector('.manual-chapter');return e?e.textContent:''`)), '챕터 진행 표시')
  t(/반가워요|같이/.test(await ev(ws, sid, `const e=document.querySelector('.manual-bubble');return e?e.textContent:''`)), '대화형 인사말')

  // 끝까지 따라가기(실제 사용자처럼): 선택지는 첫 번째, 실습은 '대신 해줄게요'→✓ 확인→다음
  let tasksDone = 0, tasksFail = 0, maxTool = 0, folderSeen = false, maxText = 0, steps = 0, ended = false; const failSteps = []
  for (let k = 0; k < 120; k++) {
    const st = JSON.parse(await ev(ws, sid, `return JSON.stringify({bubble:!!document.querySelector('.manual-bubble'),choices:document.querySelectorAll('.manual-choice').length,task:!!document.querySelector('.manual-task'),done:!!document.querySelector('.manual-task.done'),btns:[...document.querySelectorAll('.manual-bubble button')].map(b=>(b.textContent||'').trim()),tool:document.querySelectorAll('.toolwin').length})`))
    if (!st.bubble) { ended = true; break }
    steps++
    if (st.tool > maxTool) maxTool = st.tool
    // 증거 수집(가끔)
    if (k % 2 === 0) {
      const ev2 = JSON.parse(await ev(ws, sid, `const es=window.__scriv.entries();let mx=0;es.filter(e=>e.type==='text').forEach(e=>{const l=(window.__scriv.bodyOf(e.id)||'').length;if(l>mx)mx=l});return JSON.stringify({folder:es.some(e=>e.type==='folder'&&/연습/.test(e.title||'')),tlen:mx})`))
      if (ev2.folder) folderSeen = true
      if (ev2.tlen > maxText) maxText = ev2.tlen
    }
    if (st.choices > 0) { await ev(ws, sid, `const b=document.querySelector('.manual-choice');if(b)b.click();return 1`); await sleep(450); continue }
    if (st.task && !st.done && st.btns.some(b => /대신 해줄게요/.test(b))) {
      await ev(ws, sid, clickBtn('/대신 해줄게요/'))
      let d = false // 도구 lazy 로드 등으로 늦게 완료될 수 있어 최대 ~3.2s 폴링
      for (let w = 0; w < 8; w++) { await sleep(400); if (await ev(ws, sid, `return !!document.querySelector('.manual-task.done')`)) { d = true; break } }
      if (d) tasksDone++; else { tasksFail++; failSteps.push(await ev(ws, sid, `const c=document.querySelector('.tour-count'),h=document.querySelector('.tour-title');return ((c?c.textContent:'')+' '+(h?h.textContent:'')).trim()`)) }
    }
    if (st.btns.some(b => /끝내기/.test(b))) { await ev(ws, sid, clickBtn('/끝내기/')); await sleep(300); }
    else await ev(ws, sid, clickBtn('/다음|건너뛰기/'))
    await sleep(280)
  }

  t(steps >= 20, `매뉴얼 단계 충분히 진행(${steps}단계)`)
  t(folderSeen, '실습 중 ‘🎓 연습’ 폴더 실제 생성됨')
  t(maxText > 20, `편집기에 실제 문장 입력됨(본문 ${maxText}자)`)
  t(tasksDone >= 8, `실습 단계 ‘대신 해줄게요’→완료(✓) 검증 ${tasksDone}건(효과 실제 발생)`)
  t(tasksFail === 0, `완료 실패한 실습 0건(실측 실패 ${tasksFail}${failSteps.length ? ' → ' + failSteps.join(' | ') : ''})`)
  t(maxTool >= 1, `도구 창이 실제로 열림(최대 ${maxTool}개 동시)`)
  t(ended, '끝까지 진행되어 매뉴얼 정상 종료')

  // 다시 열고 '그만 보기'로 즉시 닫힘
  await ev(ws, sid, `window.__startManual();return 1`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.manual-bubble')`), '매뉴얼 다시 열기')
  await ev(ws, sid, clickBtn('/그만 보기/')); await sleep(400)
  t(!(await ev(ws, sid, `return !!document.querySelector('.manual-root')`)), "‘그만 보기’로 매뉴얼 즉시 닫힘")

  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')
  console.log('=== 실습형 매뉴얼 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
