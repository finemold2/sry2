// 투어 커버리지 — 모든 중간 단계가 '실제 UI 요소'를 스포트라이트하는지(가운데 설명 카드는 환영/마무리 2개만) + 스튜디오 메뉴 드롭다운이 위로 열리는지.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

async function walkTour(ws, sid) {
  const centers = []; let reachedLast = false, spotCount = 0
  for (let k = 0; k < 30; k++) {
    await sleep(380)
    const st = JSON.parse(await ev(ws, sid, `return JSON.stringify({bubble:!!document.querySelector('.tour-bubble'),spot:!!document.querySelector('.tour-spotlight'),title:((document.querySelector('.tour-title')||{}).textContent||'').slice(0,18),count:(document.querySelector('.tour-count')||{}).textContent||'',last:[...document.querySelectorAll('.tour-bubble button')].some(b=>/글쓰기 시작/.test(b.textContent||''))})`))
    if (!st.bubble) break
    if (st.spot) spotCount++; else centers.push((st.count || '').trim() + ' ' + st.title)
    if (st.last) { reachedLast = true; break }
    await ev(ws, sid, `const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>/다음/.test(x.textContent||''));if(b)b.click();return 1`)
  }
  return { centers, reachedLast, spotCount }
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(2500)
    await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','${skin}');localStorage.removeItem('sry:tour:done');localStorage.removeItem('sry:tour:step')}catch(e){}; return 1`) // 이어보기 키도 리셋(스킨별 1단계부터 걷기)
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
    t(await ev(ws, sid, `return !!document.querySelector('.tour-bubble')`), `[${skin}] 투어 자동 시작`)
    const w = await walkTour(ws, sid)
    t(w.reachedLast, `[${skin}] 마지막(글쓰기 시작)까지 진행`)
    t(w.spotCount >= 15, `[${skin}] 실제 UI 스포트라이트 단계 ${w.spotCount}개(메뉴·기능·도구로 이동)`)
    t(w.centers.length <= 2, `[${skin}] 가운데 설명 카드는 환영·마무리 2개뿐 (실측 ${w.centers.length}${w.centers.length > 2 ? ' → 비-스포트라이트: ' + w.centers.slice(0, 6).join(' | ') : ''})`)
    // 투어 종료
    await ev(ws, sid, `const b=[...document.querySelectorAll('.tour-bubble button')].find(x=>/글쓰기 시작|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  }

  // 스튜디오 메뉴 드롭다운이 본문 위로(클릭 가능하게) 열리는지 — z-index 회귀 가드
  await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','studio')}catch(e){};return 1`)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.menu-wrap>button')].find(x=>(x.textContent||'').trim()==='도구');if(b)b.click();return 1`); await sleep(400)
  const dd = JSON.parse(await ev(ws, sid, `const d=document.querySelector('.st-menubar .dropdown')||document.querySelector('.dropdown');if(!d)return JSON.stringify({open:false});const r=d.getBoundingClientRect();const cx=r.left+Math.min(30,r.width/2),cy=r.top+Math.min(30,r.height/2);const el=document.elementFromPoint(cx,cy);const onTop=!!el&&(el===d||d.contains(el));return JSON.stringify({open:true,onTop,tag:el?el.className||el.tagName:'none'})`))
  t(dd.open, '스튜디오: 도구 메뉴 클릭 시 드롭다운 열림')
  t(dd.onTop, '스튜디오: 드롭다운이 본문 위에 보임(가려지지 않음, 클릭 가능) — at=' + dd.tag)

  await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','classic')}catch(e){};return 1`)
  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')
  console.log('=== 투어 커버리지 + 스튜디오 드롭다운 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
