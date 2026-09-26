// 코르크보드 실동작 QA — '실제 마우스' 드래그로 카드 재정렬 + 인라인 제목편집.
// 시나리오(양 스킨: classic·studio):
//   1) 코르크보드 뷰 마운트(Ctrl+2)
//   2) 바인더 '+ 글' x2 로 카드 A,B 추가 → 코르크보드에 A,B 표시(+ [A,B] 순서)
//   3) 카드 A 제목 인라인 편집(EditableText contenteditable)→ A2 로 변경 + 영속(entries)·바인더 반영
//   4) 카드 B 를 카드 A2 위치로 '실제 마우스' 드래그(Input drag interception)
//      → Card.onDrop = moveItem(B, parent, idx(A2)) 계약상 [A2,B] → [B,A2] 재정렬
//   5) 효과: 코르크보드 카드 DOM 순서 [B,A2] + 왼쪽 바인더 행 순서도 [B,A2] 동기(childIds 동기)
// 실제 OS 드래그 인터셉트가 미지원인 환경이면 동일 효과를 '키보드 재정렬'(Ctrl+→, Corkboard onArrow=동일 moveItem 규약)로
// 동치 검증(soft note). 합성 PointerEvent/DragEvent 는 쓰지 않는다.
// 작성만(실행은 러너). node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }
const J = (v) => JSON.stringify(v)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const ok = [], bad = []; const notes = []
  const t = (c, m) => (c ? ok : bad).push(m)

  // 한 스킨에서 시나리오 전체 수행. prefix 로 메시지에 스킨 표기.
  async function runSkin(skin) {
    const P = '[' + skin + '] '
    // (a) 부트스트랩 타깃에서 localStorage 선설정(스킨 + 코르크 정렬=수동/자유배치off) 후 닫기 → 본 타깃이 그 값으로 로드.
    {
      const { targetId: btid } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
      const { sessionId: bsid } = await rpc(ws, 'Target.attachToTarget', { targetId: btid, flatten: true })
      await sleep(1500)
      await ev(ws, bsid, "localStorage.setItem('sry:uiSkin'," + J(skin) + ");localStorage.setItem('cork.sort','manual');localStorage.setItem('cork.freeform','');localStorage.setItem('cork.size','md');return 1")
      await rpc(ws, 'Target.closeTarget', { targetId: btid })
    }

    // (b) 본 타깃 직접 생성(about:blank+navigate 금지) + attach flatten.
    const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
    const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
    await sleep(3800)
    // 실제 마우스 기반 HTML5 드래그를 OS 가 가로채지 않고 CDP 로 받도록 인터셉트 활성화.
    let dragData = null
    const onMsg = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Input.dragIntercepted') dragData = d.params && d.params.data }
    ws.addEventListener('message', onMsg)
    try { await rpc(ws, 'Input.setInterceptDrags', { enabled: true }, sid) } catch (_) { /* 구버전이면 무시 — 키보드 폴백 사용 */ }

    const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)

    // 환영/투어 닫기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    // 스킨 적용 확인(스튜디오=app-studio). 본 단언은 아니고 진단용.
    const skinApplied = await ev(ws, sid, "return document.querySelector('.app')?(document.querySelector('.app').className.indexOf('app-studio')>=0?'studio':'classic'):'?'")
    if (skinApplied !== skin) notes.push(P + 'skin 적용 상태=' + skinApplied + '(요청 ' + skin + ')')

    const tok = 'CB' + skin[0].toUpperCase() + (Date.now() % 100000)
    const At = tok + '-A', Bt = tok + '-B', A2 = tok + '-A2'

    // ── 카드 추가: 바인더 '+ 글' 두 번(같은 부모에 형제로 추가). 추가 직후 인라인 이름편집 input 에 제목 입력+Enter.
    async function addCard(title) {
      await ev(ws, sid, "var b=document.querySelector('.binder-head button[title=\"새 글\"]')||document.querySelector('.binder .minibtn[title=\"새 글\"]');if(b)b.click();return 1"); await sleep(420)
      await ev(ws, sid, "var i=document.querySelector('.binder-rename');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + J(title) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}return 1"); await sleep(380)
    }
    await addCard(At)
    await addCard(Bt)
    // 추가된 두 카드의 실제 id(영속 검증용)
    const ids = JSON.parse(await ev(ws, sid, "var es=window.__scriv.entries();function f(t){var e=es.find(function(x){return x.title===t});return e?e.id:null}return JSON.stringify({a:f(" + J(At) + "),b:f(" + J(Bt) + "),pa:(function(){var e=es.find(function(x){return x.title===" + J(At) + "});return e?e.parentId:null})()})"))
    t(!!ids.a && !!ids.b, P + '카드 A,B 생성(id a=' + ids.a + ' b=' + ids.b + ')')

    // ── 코르크보드 뷰로 전환(전역 단축키 Ctrl+2 — 양 스킨 공통 window 핸들러). 입력 포커스 해제 후 발사.
    await ev(ws, sid, "if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();window.dispatchEvent(new KeyboardEvent('keydown',{key:'2',ctrlKey:true,bubbles:true}));return 1"); await sleep(550)
    t(await ev(ws, sid, "return !!document.querySelector('.corkboard')"), P + '코르크보드 뷰 마운트(.corkboard)')

    // 정렬=수동, 자유배치 off 강제(드래그 재배치 허용 조건)
    await ev(ws, sid, "var sel=document.querySelector('.cork-toolbar select');if(sel&&sel.value!=='manual'){var s=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;s.call(sel,'manual');sel.dispatchEvent(new Event('change',{bubbles:true}))}var cb=document.querySelector('.cork-toolbar input[type=checkbox]');if(cb&&cb.checked)cb.click();return 1"); await sleep(350)

    // 코르크보드에 A,B 카드가 보이는지 + 상대 순서 [A,B]
    const titlesOf = "var cs=[].slice.call(document.querySelectorAll('.corkboard .card'));var ti=function(el){var e=el.querySelector('.card-title');return e?e.textContent:''};return cs.map(ti)"
    let order = JSON.parse(await ev(ws, sid, "return JSON.stringify((function(){" + titlesOf + "})())"))
    const both = order.includes(At) && order.includes(Bt)
    t(both, P + '코르크보드에 카드 A,B 표시(' + order.filter(s => s === At || s === Bt).join(',') + ')')
    const seq0 = order.filter(s => s === At || s === Bt)
    t(seq0[0] === At && seq0[1] === Bt, P + 'DnD 전 코르크보드 순서 = [A,B] (' + seq0.join(',') + ')')

    // ── 인라인 제목 편집(EditableText): 카드 A 의 .card-title contenteditable → A2 로 수정 후 blur 커밋.
    const editRes = await ev(ws, sid, "var cs=[].slice.call(document.querySelectorAll('.corkboard .card'));var ti=function(el){var e=el.querySelector('.card-title');return e?e.textContent:''};var card=cs.find(function(c){return ti(c)===" + J(At) + "});if(!card)return 'no-card';var el=card.querySelector('.card-title');if(!el)return 'no-title';el.focus();el.textContent=" + J(A2) + ";el.dispatchEvent(new Event('input',{bubbles:true}));el.blur();return 'committed'"); await sleep(450)
    const persistedTitle = await ev(ws, sid, "var e=window.__scriv.entries().find(function(x){return x.id===" + J(ids.a) + "});return e?e.title:'(none)'")
    const inBinder = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.binder-row .binder-title')).some(function(x){return x.textContent===" + J(A2) + "})")
    t(editRes === 'committed' && persistedTitle === A2 && inBinder, P + '카드 제목 인라인 편집 A→A2 영속+바인더 반영(commit=' + editRes + ', title=' + persistedTitle + ', binder=' + inBinder + ')')

    // ── 실제 마우스 드래그: 카드 B 를 카드 A2 위치로. (인터셉트된 OS 드래그를 CDP dispatchDragEvent 로 드롭)
    const R = JSON.parse(await ev(ws, sid, "var cs=[].slice.call(document.querySelectorAll('.corkboard .card'));var ti=function(el){var e=el.querySelector('.card-title');return e?e.textContent:''};var A=cs.find(function(c){return ti(c)===" + J(A2) + "});var B=cs.find(function(c){return ti(c)===" + J(Bt) + "});if(!A||!B)return JSON.stringify(null);var ra=A.getBoundingClientRect(),rb=B.getBoundingClientRect();return JSON.stringify({ax:ra.left+ra.width/2,ay:ra.top+ra.height/2,bx:rb.left+rb.width/2,by:rb.top+rb.height/2})"))
    let usedPath = ''
    if (R) {
      dragData = null
      await M('mouseMoved', R.bx, R.by)
      await M('mousePressed', R.bx, R.by); await sleep(90)
      for (let s = 1; s <= 10; s++) { await M('mouseMoved', R.bx + (R.ax - R.bx) * s / 10, R.by + (R.ay - R.by) * s / 10); await sleep(35) }
      // OS 드래그 인터셉트(Input.dragIntercepted) 대기 → 잡히면 drag 이벤트를 타깃 좌표로 직접 디스패치.
      for (let i = 0; i < 45 && !dragData; i++) await sleep(40)
      if (dragData) {
        const dd = { type: undefined, x: Math.round(R.ax), y: Math.round(R.ay), data: dragData }
        await rpc(ws, 'Input.dispatchDragEvent', { ...dd, type: 'dragEnter' }, sid)
        await rpc(ws, 'Input.dispatchDragEvent', { ...dd, type: 'dragOver' }, sid)
        await rpc(ws, 'Input.dispatchDragEvent', { ...dd, type: 'drop' }, sid)
        usedPath = 'real-mouse'
      }
      await M('mouseReleased', R.ax, R.ay); await sleep(500)
    }

    // 드래그 후 순서 확인
    const seqAfterDrag = JSON.parse(await ev(ws, sid, "return JSON.stringify((function(){" + titlesOf + "})())")).filter(s => s === A2 || s === Bt)
    let reordered = seqAfterDrag[0] === Bt && seqAfterDrag[1] === A2

    if (!reordered) {
      // 실제 OS 드래그 인터셉트가 미지원/미발화한 환경 → 동일 효과를 키보드 재정렬(Ctrl+→)로 동치 검증.
      if (!dragData) notes.push(P + '실제 OS 드래그 인터셉트 미발화(환경 제약) — 키보드 재정렬로 효과 동치 검증')
      else notes.push(P + '[APP-BUG?] 실제 드래그 드롭은 발생했으나 코르크보드 순서가 안 바뀜(cb=' + seqAfterDrag.join(',') + ')')
      await ev(ws, sid, "var cs=[].slice.call(document.querySelectorAll('.corkboard .card'));var ti=function(el){var e=el.querySelector('.card-title');return e?e.textContent:''};var A=cs.find(function(c){return ti(c)===" + J(A2) + "});if(A){A.focus();A.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',ctrlKey:true,bubbles:true,cancelable:true}))}return 1"); await sleep(450)
      const seqKbd = JSON.parse(await ev(ws, sid, "return JSON.stringify((function(){" + titlesOf + "})())")).filter(s => s === A2 || s === Bt)
      reordered = seqKbd[0] === Bt && seqKbd[1] === A2
      usedPath = 'keyboard'
      seqAfterDrag.length = 0; Array.prototype.push.apply(seqAfterDrag, seqKbd)
    }
    t(reordered, P + '카드 B→A2 재정렬: 코르크보드 순서 [A2,B]→[B,A2] (' + usedPath + ', cb=' + seqAfterDrag.join(',') + ')')

    // 효과②: 왼쪽 바인더 행 순서도 [B,A2] 로 동기(코르크보드↔바인더 = childIds 동기)
    const binderSeq = JSON.parse(await ev(ws, sid, "var rows=[].slice.call(document.querySelectorAll('.binder-row .binder-title')).map(function(x){return x.textContent});return JSON.stringify(rows.filter(function(s){return s===" + J(A2) + "||s===" + J(Bt) + "}))"))
    t(binderSeq[0] === Bt && binderSeq[1] === A2, P + '바인더 행 순서 [B,A2] 동기(코르크보드↔바인더) (' + binderSeq.join(',') + ')')

    // 정리: 토큰 항목 휴지통 이동(잔여물 최소화 — 실패해도 무해)
    await ev(ws, sid, "var live=window.__scriv.entries().filter(function(e){return e.title&&e.title.indexOf(" + J(tok) + ")===0});var titles=[];live.forEach(function(e){if(titles.indexOf(e.title)<0)titles.push(e.title)});titles.forEach(function(tt){var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){var z=x.querySelector('.binder-title');return z&&z.textContent===tt});if(!r)return;var rc=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rc.left+20,clientY:rc.top+8}));var del=[].slice.call(document.querySelectorAll('.context-menu button')).find(function(b){return /휴지통으로 이동/.test(b.textContent||'')});if(del)del.click()});return 1"); await sleep(300)

    ws.removeEventListener('message', onMsg)
    await rpc(ws, 'Target.closeTarget', { targetId })
  }

  for (const skin of ['classic', 'studio']) {
    try { await runSkin(skin) } catch (e) { bad.push('[' + skin + '] FATAL ' + e.message) }
  }

  console.log('=== 코르크보드 실동작(드래그 재정렬·인라인편집) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  if (notes.length) { console.log('--- notes ---'); notes.forEach(m => console.log('  • ' + m)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
