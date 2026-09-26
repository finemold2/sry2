// 도움말 스튜디오 스킨 호환 검증 — 스튜디오 UI(메뉴/뷰 위치 다름)에서도 투어·매뉴얼이 제대로 동작하는지.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 스튜디오 스킨으로 설정 후 로드
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(2500)
  await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','studio');localStorage.removeItem('sry:tour:done')}catch(e){}; return 1`)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  t(await ev(ws, sid, `return !!document.querySelector('.app-studio')&&!!document.querySelector('.st-menubar')`), '스튜디오 스킨 활성(.app-studio/.st-menubar)')
  // 자동 투어가 스튜디오에서도 뜸 + 메뉴/레일 타깃 정렬
  t(await ev(ws, sid, `return !!document.querySelector('.tour-bubble')`), '스튜디오에서 가이드 투어 자동 시작')
  // 스튜디오에 투어가 가리키는 메뉴/레일 타깃이 실제로 존재(스킨 호환 셀렉터) + 진행 중 메뉴 스포트라이트 정렬(가능하면)
  t(await ev(ws, sid, `return [...document.querySelectorAll('.menu-wrap>button')].some(b=>(b.textContent||'').trim()==='도구')&&[...document.querySelectorAll('.menu-wrap>button')].some(b=>(b.textContent||'').trim()==='파일')`), '스튜디오 메뉴버튼(도구/파일)이 투어 타깃으로 해결됨')
  let menuAligned = false
  for (let k = 0; k < 26; k++) {
    await sleep(320)
    const r = JSON.parse(await ev(ws, sid, `const sp=document.querySelector('.tour-spotlight');const mb=[...document.querySelectorAll('.menu-wrap>button')].find(b=>(b.textContent||'').trim()==='도구');let aligned=false;if(sp&&mb){const a=sp.getBoundingClientRect(),b=mb.getBoundingClientRect();aligned=Math.abs(a.left-b.left)<40&&Math.abs(a.top-b.top)<40}return JSON.stringify({lastBtn:[...document.querySelectorAll('.tour-bubble button')].some(b=>/글쓰기 시작/.test(b.textContent||'')),aligned})`))
    if (r.aligned) menuAligned = true
    if (r.lastBtn || menuAligned) break
    await ev(ws, sid, `const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>/다음/.test(x.textContent||''));if(b)b.click();return 1`)
  }
  t(menuAligned, '투어 도구 메뉴 스포트라이트가 스튜디오 메뉴버튼에 정렬(스킨 호환)')
  await ev(ws, sid, `const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>/글쓰기 시작|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  t(!(await ev(ws, sid, `return !!document.querySelector('.tour-root')`)), '스튜디오에서 투어 정상 종료')

  // 매뉴얼을 스튜디오에서 끝까지 — 실습 효과(연습폴더·문장·실습완료·도구창) 검증
  await ev(ws, sid, `window.__startManual();return 1`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.manual-bubble')`), '스튜디오에서 매뉴얼 시작')
  let tasksDone = 0, tasksFail = 0, maxTool = 0, folderSeen = false, maxText = 0, steps = 0, ended = false
  for (let k = 0; k < 120; k++) {
    const st = JSON.parse(await ev(ws, sid, `return JSON.stringify({bubble:!!document.querySelector('.manual-bubble'),choices:document.querySelectorAll('.manual-choice').length,task:!!document.querySelector('.manual-task'),done:!!document.querySelector('.manual-task.done'),btns:[...document.querySelectorAll('.manual-bubble button')].map(b=>(b.textContent||'').trim()),tool:document.querySelectorAll('.toolwin').length})`))
    if (!st.bubble) { ended = true; break }
    steps++
    if (st.tool > maxTool) maxTool = st.tool
    if (k % 2 === 0) { const ev2 = JSON.parse(await ev(ws, sid, `const es=window.__scriv.entries();let mx=0;es.filter(e=>e.type==='text').forEach(e=>{const l=(window.__scriv.bodyOf(e.id)||'').length;if(l>mx)mx=l});return JSON.stringify({folder:es.some(e=>e.type==='folder'&&/연습/.test(e.title||'')),tlen:mx})`)); if (ev2.folder) folderSeen = true; if (ev2.tlen > maxText) maxText = ev2.tlen }
    if (st.choices > 0) { await ev(ws, sid, `const b=document.querySelector('.manual-choice');if(b)b.click();return 1`); await sleep(450); continue }
    if (st.task && !st.done && st.btns.some(b => /대신 해줄게요/.test(b))) { await ev(ws, sid, `const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>/대신 해줄게요/.test(x.textContent||''));if(b)b.click();return 1`); let d = false; for (let w = 0; w < 8; w++) { await sleep(400); if (await ev(ws, sid, `return !!document.querySelector('.manual-task.done')`)) { d = true; break } } if (d) tasksDone++; else tasksFail++ }
    if (st.btns.some(b => /끝내기/.test(b))) { await ev(ws, sid, `const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>/끝내기/.test(x.textContent||''));if(b)b.click();return 1`) }
    else await ev(ws, sid, `const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>/다음|건너뛰기/.test(x.textContent||''));if(b)b.click();return 1`)
    await sleep(260)
  }
  t(folderSeen, '스튜디오: 연습 폴더 실제 생성')
  t(maxText > 20, `스튜디오: 본문 입력됨(${maxText}자)`)
  t(tasksDone >= 8 && tasksFail === 0, `스튜디오: 실습 완료(✓) ${tasksDone}건 / 실패 ${tasksFail}`)
  t(maxTool >= 1, `스튜디오: 도구 창 열림(${maxTool})`)
  t(ended, '스튜디오: 매뉴얼 끝까지 진행')
  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')

  console.log('=== 도움말 스튜디오 스킨 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  // 스킨 원복(다른 테스트 영향 방지)
  try { await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','classic')}catch(e){}; return 1`) } catch (e) { /* noop */ }
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
