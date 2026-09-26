// 코르크보드 DnD → 바인더 실시간 동기(신뢰 버전): 뷰버튼으로 전환, 바인더로 카드 2개(고유 제목) 추가,
// 카드 B를 카드 A 위로 실제 DnD(dataTransfer) → 코르크보드 순서 [A,B]→[B,A] + 왼쪽 바인더 행 순서도 동기.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true }); await sleep(3800)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  const TK = 'CB' + Math.floor(Date.now() / 1000) % 100000

  // 코르크보드 전환(뷰 버튼)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button.tbtn,button.st-rail-btn')).find(function(x){return /코르크보드/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();return 1"); await sleep(600)
  t(await ev(ws, sid, "return !!document.querySelector('.corkboard')"), '코르크보드 뷰 마운트')

  // 카드 2개 추가(바인더 + 글) → 바인더 인라인 rename 은 Esc 로 닫고, 코르크보드 카드 제목을 직접 rename
  async function addCard(title) {
    const before = await ev(ws, sid, "return document.querySelectorAll('.corkboard .card').length")
    await ev(ws, sid, "var b=document.querySelector('.binder-head button[title=\"새 글\"]');if(b)b.click();return 1"); await sleep(400)
    await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1"); await sleep(250)
    const after = await ev(ws, sid, "return document.querySelectorAll('.corkboard .card').length")
    t(after === before + 1, '코르크보드 카드 추가됨(' + before + '→' + after + ')')
    // 마지막(새) 카드의 제목 EditableText 를 title 로 rename
    await ev(ws, sid, "var cs=document.querySelectorAll('.corkboard .card');var c=cs[cs.length-1];if(!c)return 'no';var tt=c.querySelector('.card-title');if(!tt)return 'no-title';tt.focus();tt.textContent='" + title + "';tt.dispatchEvent(new Event('input',{bubbles:true}));tt.dispatchEvent(new FocusEvent('blur',{bubbles:true}));tt.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));return 'ok'"); await sleep(400)
  }
  await addCard(TK + 'A'); await addCard(TK + 'B')
  const cardsBefore = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.corkboard .card .card-title')).map(function(e){return (e.textContent||'').trim()}).filter(function(s){return s.indexOf('" + TK + "')===0}).join(',')")
  t(/A.*B/.test(cardsBefore.replace(/[^AB]/g, '')) || cardsBefore.indexOf(TK + 'A') >= 0, '코르크보드에 카드 A,B 표시 (' + cardsBefore + ')')

  // 카드 B 를 카드 A 위로 실제 DnD(dataTransfer) — Corkboard onDragStart(setData scriv-id)→onDrop(moveItem)
  const dndRes = await ev(ws, sid,
    "var cards=[].slice.call(document.querySelectorAll('.corkboard .card'));" +
    "function byTok(suf){return cards.find(function(c){var tEl=c.querySelector('.card-title');return tEl&&(tEl.textContent||'').trim()==='" + TK + "'+suf})}" +
    "var A=byTok('A'),B=byTok('B');if(!A||!B)return 'no-cards';" +
    "var dt=new DataTransfer();" +
    "B.setAttribute('draggable','true');" +
    "B.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "A.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "A.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "A.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "B.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "return 'ok'"); await sleep(500)
  t(dndRes === 'ok', 'DnD 디스패치(카드 B→A)')
  const cardsAfter = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.corkboard .card .card-title')).map(function(e){return (e.textContent||'').trim()}).filter(function(s){return s.indexOf('" + TK + "')===0}).join(',')")
  // [A,B] → [B,A]
  t(cardsAfter.indexOf(TK + 'B') < cardsAfter.indexOf(TK + 'A') && cardsAfter.indexOf(TK + 'B') >= 0, '코르크보드 순서 재정렬 [A,B]→[B,A] (' + cardsAfter + ')')

  // 왼쪽 바인더 행 순서도 동기
  const binderOrder = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.binder-title,.binder-row .binder-title')).map(function(e){return (e.textContent||'').trim()}).filter(function(s){return s.indexOf('" + TK + "')===0}).join(',')")
  t(binderOrder.indexOf(TK + 'B') < binderOrder.indexOf(TK + 'A') && binderOrder.indexOf(TK + 'B') >= 0, '바인더 행 순서도 [B,A] 동기 (' + binderOrder + ')')
  t(await ev(ws, sid, "return String(window.__scriv.state().dirty)") === 'true', '재정렬이 스토어에 반영(dirty=true)')

  console.log('=== 코르크보드 DnD→바인더 동기 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
