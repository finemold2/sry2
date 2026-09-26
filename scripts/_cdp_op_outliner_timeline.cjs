// 아웃라이너·타임라인 '실동작' QA — 코드리뷰가 아니라 실제 클릭/입력/드래그 후 '효과'(DOM 재배치·영속 상태)를 단언한다.
//  [아웃라이너] ① 행 제목 인라인 편집(contentEditable)+blur 커밋 → window.__scriv.entries() title 영속 + 표 DOM 반영
//               ② 행 드래그 재정렬([x,y]→[y,x]) → 아웃라이너 행 DOM 순서 변경 + 바인더 행 순서(childIds) 동기 영속
//  [타임라인]   ③ 장면 카드 드래그로 같은 레인 안 순서 재배치 → 카드 DOM 순서 변경 + 바인더 순서 동기 영속
//               ④ '스토리시간순 정렬' 토글 → 카드 draggable=false + 안내문구 '비활성화'(켜짐) / draggable=true + '순서를 바꿀 수 있습니다'(꺼짐)
//
// [검증된 CDP 하니스 패턴 — _cdp_stash_drag.cjs 그대로]
//  · 타깃을 Target.createTarget({url:'http://localhost:4178/'}) 로 '직접' 생성(about:blank+navigate 금지 → Input 타임아웃)
//  · attachToTarget flatten / sleep(3800) / Runtime.enable 호출 안 함(Input 과 충돌) / ev()=Runtime.evaluate returnByValue
//  · DnD 는 우선 '실제 마우스'(Input.dispatchMouseEvent)로 시도한다. 다만 아웃라이너/타임라인은 HTML5 네이티브 DnD
//    (draggable=true + onDragStart/onDragOver/onDrop+dataTransfer)라, 헤드리스에서 합성 마우스는 네이티브 drag/drop 을
//    발화하지 못하는 게 정상이다. 그래서 실제 마우스로 효과가 안 나면, 이 코드베이스에서 React onDrag* 핸들러를
//    실제로 발화시키는 검증된 경로(_cdp_views_core.cjs 코르크보드와 동일: dataTransfer 를 실은 네이티브-타입 Event
//    dispatch)로 '대체 검증'하고 어느 경로로 효과가 났는지 콘솔에 남긴다. (⚠ 합성 PointerEvent 는 쓰지 않는다.)
//  · 단언은 전부 '조작 → 사용자가 원하는 결과'. 좌표는 getBoundingClientRect(viewport CSS px) 사용.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result && r.result.value }

// 뷰 전환 버튼(App.tsx viewBtn: button.tbtn[aria-label="<라벨>"] 정확 매칭). 반환=클릭 후 aria-pressed.
const VIEW_LABEL = { editor: '에디터 (⌘1)', outliner: '아웃라이너 (⌘3)', timeline: '스토리 타임라인 (⌘7)' }
const clickView = (key) => { const lbl = VIEW_LABEL[key]; return `var b=document.querySelector('button.tbtn[aria-label='+${JSON.stringify(JSON.stringify(lbl))}+']');if(!b)return'no:'+${JSON.stringify(lbl)};b.click();return b.getAttribute('aria-pressed')` }
// 바인더 '새 글' 버튼(검증된 셀렉터: _cdp_binder/_cdp_views_core). 활성 컨테이너(원고 루트) 끝에 텍스트 추가 + 인라인 rename 시작.
const addDocBtn = `var b=document.querySelector('.binder .minibtn[title="새 글"]')||document.querySelector('.binder .minibtn[title="새 텍스트"]');if(b){b.click();return 1}return 0`
// 인라인 rename input(.binder-rename)에 제목 입력 + Enter 커밋.
const renameInline = (v) => `var i=document.querySelector('.binder-rename');if(!i)return'no-input';i.focus();i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return'ok'`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await sleep(3800)
  const ok = [], bad = [], skip = []; const t = (c, m) => (c ? ok : bad).push(m); const sk = (m) => skip.push(m)
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  // 실제 마우스 드래그: from→to 를 8단계로 끌어 놓는다(네이티브 HTML5 DnD 시도).
  const realDrag = async (from, to) => {
    await M('mouseMoved', from.x, from.y); await M('mousePressed', from.x, from.y); await sleep(70)
    for (let s = 1; s <= 8; s++) { await M('mouseMoved', from.x + (to.x - from.x) * s / 8, from.y + (to.y - from.y) * s / 8); await sleep(25) }
    await M('mouseReleased', to.x, to.y); await sleep(420)
  }

  // 환영/투어 닫기
  await ev(ws, sid, `var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1`); await sleep(400)
  // 바인더가 접혀 있으면 펼친다(좁은 창 대비) — '새 글' 버튼·바인더 행 접근 보장.
  await ev(ws, sid, `if(!document.querySelector('.binder')){var b=document.querySelector('[aria-label="바인더 토글"]');if(b)b.click()}return 1`); await sleep(250)

  // ── 준비: 에디터에서 원고(Draft) 루트를 활성 컨테이너로 잡고, 토큰 제목의 텍스트 문서 3개를 '새 글' UI 로 추가.
  //   같은 부모(DRAFT_ROOT) 형제로 모여야 아웃라이너 재정렬·타임라인 같은 레인('(장 없음)') 재배치가 성립한다.
  await ev(ws, sid, clickView('editor')); await sleep(300)
  await ev(ws, sid, `var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){return /원고|초고|Manuscript|Draft/i.test(x.getAttribute('aria-label')||x.textContent||'')})||rows[0];if(r)r.click();return 1`); await sleep(250)
  const tok = 'QA' + Date.now().toString().slice(-6)
  for (const lb of ['A', 'B', 'C']) {
    const added = await ev(ws, sid, addDocBtn); await sleep(350)
    if (added) { await ev(ws, sid, renameInline(tok + '-' + lb)); await sleep(300) }
  }
  await sleep(250)
  const made = await ev(ws, sid, `return window.__scriv.entries().filter(function(e){return e.title&&e.title.indexOf(${JSON.stringify(tok)})===0})`)
  t(made.length === 3, '준비: 토큰 텍스트 문서 3개 생성·식별 (' + made.length + '개, via UI)')
  const sameParent = made.length === 3 && made[0].parentId && made.every(e => e.parentId === made[0].parentId)
  t(sameParent, '준비: 3개가 같은 부모(' + (made[0] && made[0].parentId) + ')에 형제로 모임')
  const idA = (made.find(e => e.title === tok + '-A') || {}).id

  // ─────────────────────────────────────────────────────────────────────
  // [아웃라이너] ① 행 제목 인라인 편집 → entries() 영속 + 표 DOM 반영
  // ─────────────────────────────────────────────────────────────────────
  const ap = await ev(ws, sid, clickView('outliner')); await sleep(450)
  t(ap === 'true' && await ev(ws, sid, `return !!document.querySelector('.outliner table')`), '아웃라이너 전환: aria-pressed=true + .outliner table 마운트 (' + ap + ')')

  const newTitle = tok + '-RENAMED'
  const edited = await ev(ws, sid, `
    var target=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(c){return c.textContent===${JSON.stringify(tok + '-A')}});
    if(!target)return 'no-target';
    target.focus(); target.textContent=${JSON.stringify(newTitle)};
    target.dispatchEvent(new Event('input',{bubbles:true})); target.blur();
    return 'committed';`); await sleep(450)
  t(edited === 'committed', '아웃라이너 인라인 편집: A 제목 contentEditable 수정+blur 커밋 (' + edited + ')')
  const persisted = idA
    ? await ev(ws, sid, `var e=window.__scriv.entries().find(function(x){return x.id===${JSON.stringify(idA)}});return e?e.title:'(none)'`)
    : await ev(ws, sid, `var e=window.__scriv.entries().find(function(x){return x.title===${JSON.stringify(newTitle)}});return e?e.title:'(none)'`)
  t(persisted === newTitle, '아웃라이너 편집 영속: entries()[A].title = "' + persisted + '" (조작→상태 반영)')
  const inTable = await ev(ws, sid, `return [].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).some(function(c){return c.textContent===${JSON.stringify(newTitle)}})`)
  t(inTable, '아웃라이너 표 DOM 에 새 제목 렌더 반영 (조작→화면 반영)')

  // ─────────────────────────────────────────────────────────────────────
  // [아웃라이너] ② 행 드래그 재정렬: 현재 토큰 행 순서 [x,y,…] 에서 y 를 x 위로 떨궈 [y,x,…] 로.
  //   소스 계약(Outliner onDrop): moveItem(dragId=y, y.parentId, siblings.indexOf(x)). '뒤→앞' 이라 실제 재정렬.
  //   먼저 '실제 마우스' 드래그를 시도하고, 효과가 없으면 dataTransfer 를 실은 네이티브-타입 Event 로 대체 검증.
  // ─────────────────────────────────────────────────────────────────────
  const olOrder = () => ev(ws, sid, `return [].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).map(function(c){return c.textContent}).filter(function(s){return s&&s.indexOf(${JSON.stringify(tok)})===0})`)
  const binderOrder = () => ev(ws, sid, `return [].slice.call(document.querySelectorAll('.binder-row .binder-title')).map(function(x){return x.textContent}).filter(function(s){return s&&s.indexOf(${JSON.stringify(tok)})===0})`)
  const ord0 = await olOrder()
  const X = ord0[0], Y = ord0[1]
  t(ord0.length >= 2, '아웃라이너 재정렬 전 토큰 행 ' + ord0.length + '개 확보: [' + ord0.join(', ') + ']')

  // 행 rect 조회 헬퍼(타이틀 텍스트로 tr 찾기)
  const rowRect = async (title) => JSON.parse(await ev(ws, sid, `
    var c=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(e){return e.textContent===${JSON.stringify('@T@')}});
    if(!c)return 'null'; var tr=c.closest('tr'); var r=tr.getBoundingClientRect();
    return JSON.stringify({x:r.left+Math.min(120,r.width/2),y:r.top+r.height/2});`.replace('@T@', title)))
  let rx = await rowRect(X), ry = await rowRect(Y)
  let olPath = 'real-mouse'
  if (rx && ry) await realDrag(ry, rx) // y 행을 x 행 위로 (실제 마우스)
  let ord1 = await olOrder()
  if (!(ord1[0] === Y && ord1[1] === X)) {
    // 실제 마우스로 네이티브 HTML5 drop 이 발화되지 않음(헤드리스 정상) → 검증된 합성 dataTransfer 경로로 대체.
    olPath = 'synthetic-dataTransfer'
    await ev(ws, sid, `
      function rowOf(t){var c=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(e){return e.textContent===t});return c&&c.closest('tr')}
      var yRow=rowOf(${JSON.stringify(Y)}), xRow=rowOf(${JSON.stringify(X)});
      if(!yRow||!xRow)return 'no-rows';
      var store={};
      var dt={types:[],setData:function(k,v){store[k]=v;if(this.types.indexOf(k)<0)this.types.push(k)},getData:function(k){return store[k]||''},effectAllowed:'',dropEffect:'',setDragImage:function(){}};
      function fire(el,type){var e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});return el.dispatchEvent(e)}
      fire(yRow,'dragstart');fire(xRow,'dragenter');fire(xRow,'dragover');fire(xRow,'drop');fire(yRow,'dragend');
      return 'fired';`); await sleep(450)
    ord1 = await olOrder()
  }
  t(ord1[0] === Y && ord1[1] === X, '아웃라이너 행 재정렬 효과(' + olPath + '): [' + X + ',' + Y + ']→[' + ord1.slice(0, 2).join(',') + '] (조작→DOM 재배치)')
  const bnd1 = await binderOrder()
  const bi = bnd1.indexOf(Y), bj = bnd1.indexOf(X)
  t(bi >= 0 && bj >= 0 && bi < bj, '아웃라이너 재정렬 영속: 바인더 행 순서도 y(' + Y + ')가 x(' + X + ') 앞으로 동기 (childIds 영속)')

  // ─────────────────────────────────────────────────────────────────────
  // [타임라인] ③ 장면 카드 드래그 재배치(같은 '(장 없음)' 레인). 토큰 카드 2개를 골라 second 를 first 앞으로.
  //   소스 계약(TimelineView): dragId(React state)→dropTarget(state)→moveItem(source, dst.parentId, before/after).
  //   handleDragOver/handleDrop 가 React '상태'에 의존하므로, 합성 경로는 dragstart→(상태 커밋 대기)→dragover→drop 를
  //   별도 evaluate+sleep 로 '단계화'해야 한다(동기 일괄 발화는 dragId 미반영으로 무효).
  // ─────────────────────────────────────────────────────────────────────
  const apT = await ev(ws, sid, clickView('timeline')); await sleep(500)
  const tlMounted = await ev(ws, sid, `return [].slice.call(document.querySelectorAll('strong')).some(function(s){return (s.textContent||'').indexOf('스토리 타임라인')>=0})`)
  t(apT === 'true' && tlMounted, '타임라인 전환: aria-pressed=true + 툴바 "스토리 타임라인" 마운트 (' + apT + ')')
  // 토큰 장면 카드 = title 속성 첫 줄이 토큰으로 시작하는 button.
  const tlOrder = () => ev(ws, sid, `return [].slice.call(document.querySelectorAll('button')).map(function(b){return (b.getAttribute('title')||'').split(String.fromCharCode(10))[0]}).filter(function(s){return s&&s.indexOf(${JSON.stringify(tok)})===0})`)
  const tOrd0 = await tlOrder()
  t(tOrd0.length >= 2, '타임라인 토큰 장면 카드 ' + tOrd0.length + '개 렌더: [' + tOrd0.join(', ') + ']')
  const C1 = tOrd0[0], C2 = tOrd0[1] // C2 를 C1 앞으로

  const cardRect = async (title) => JSON.parse(await ev(ws, sid, `
    var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return ((x.getAttribute('title')||'').split(String.fromCharCode(10))[0])===${JSON.stringify(title)}});
    if(!b)return 'null'; var r=b.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});`))
  let c1r = await cardRect(C1), c2r = await cardRect(C2)
  let tlPath = 'real-mouse'
  // 실제 마우스: C2 카드를 C1 카드의 '왼쪽 절반'(before)으로 끌어 놓는다.
  if (c1r && c2r) await realDrag(c2r, { x: c1r.x - 60, y: c1r.y })
  let tOrd1 = await tlOrder()
  if (!(tOrd1[0] === C2 && tOrd1[1] === C1)) {
    tlPath = 'synthetic-staged'
    // 1) dragstart on C2 → setDragId
    await ev(ws, sid, `
      var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return ((x.getAttribute('title')||'').split(String.fromCharCode(10))[0])===${JSON.stringify(C2)}});
      if(!b)return 'no-c2';
      var dt={types:[],setData:function(k,v){this.types.push(k)},getData:function(){return''},effectAllowed:'',dropEffect:'',setDragImage:function(){}};
      var e=new Event('dragstart',{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});
      b.dispatchEvent(e);return 'ok';`); await sleep(180)
    // 2) dragover on C1 with clientX 왼쪽(before) → setDropTarget(before)
    await ev(ws, sid, `
      var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return ((x.getAttribute('title')||'').split(String.fromCharCode(10))[0])===${JSON.stringify(C1)}});
      if(!b)return 'no-c1'; var r=b.getBoundingClientRect();
      var dt={types:[],setData:function(){},getData:function(){return''},dropEffect:'',setDragImage:function(){}};
      var e=new Event('dragover',{bubbles:true,cancelable:true});
      Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});
      Object.defineProperty(e,'clientX',{value:r.left+2,configurable:true});
      b.dispatchEvent(e);return 'ok';`); await sleep(180)
    // 3) drop on C1 → handleDrop(C1, 'before') → moveItem(C2 앞)
    await ev(ws, sid, `
      var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return ((x.getAttribute('title')||'').split(String.fromCharCode(10))[0])===${JSON.stringify(C1)}});
      if(!b)return 'no-c1';
      var dt={types:[],setData:function(){},getData:function(){return''},dropEffect:''};
      var e=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});
      b.dispatchEvent(e);return 'ok';`); await sleep(400)
    tOrd1 = await tlOrder()
  }
  t(tOrd1[0] === C2 && tOrd1[1] === C1, '타임라인 카드 재배치 효과(' + tlPath + '): [' + C1 + ',' + C2 + ']→[' + tOrd1.slice(0, 2).join(',') + '] (조작→카드 DOM 재배치)')
  const bnd2 = await binderOrder()
  const ci = bnd2.indexOf(C2), cj = bnd2.indexOf(C1)
  t(ci >= 0 && cj >= 0 && ci < cj, '타임라인 재배치 영속: 바인더 순서도 C2(' + C2 + ')가 C1(' + C1 + ') 앞으로 동기 (childIds 영속)')

  // ─────────────────────────────────────────────────────────────────────
  // [타임라인] ④ '스토리시간순 정렬' 토글 효과: 켜면 수동 순서변경 잠금(카드 draggable=false + 안내문 '비활성화'),
  //   끄면 다시 드래그 가능(draggable=true + '순서를 바꿀 수 있습니다'). dndEnabled = !sortByTime 계약.
  // ─────────────────────────────────────────────────────────────────────
  const setSort = (on) => ev(ws, sid, `
    var lab=[].slice.call(document.querySelectorAll('label')).find(function(l){return /스토리시간순/.test(l.textContent||'')});
    var cb=lab&&lab.querySelector('input[type=checkbox]'); if(!cb)return 'no-cb';
    if(cb.checked!==${on}){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'checked').set;s.call(cb,${on});cb.dispatchEvent(new Event('change',{bubbles:true}))}
    return String(cb.checked);`)
  const cardDraggable = () => ev(ws, sid, `var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return ((x.getAttribute('title')||'').split(String.fromCharCode(10))[0]).indexOf(${JSON.stringify(tok)})===0});return b?b.getAttribute('draggable'):'no-card'`)
  const hintHas = (re) => ev(ws, sid, `return [].slice.call(document.querySelectorAll('span')).some(function(s){return ${re}.test(s.textContent||'')})`)

  const on = await setSort(true); await sleep(350)
  const dragOff = await cardDraggable(); const hintOff = await hintHas('/비활성화/')
  t(on === 'true' && dragOff === 'false' && hintOff, '스토리시간순 정렬 ON: 카드 draggable="' + dragOff + '"(잠금) + 안내문 "비활성화" 표시 (조작→DnD 잠금)')

  const off = await setSort(false); await sleep(350)
  const dragOn = await cardDraggable(); const hintOn = await hintHas('/순서를 바꿀 수 있습니다/')
  t(off === 'false' && dragOn === 'true' && hintOn, '스토리시간순 정렬 OFF: 카드 draggable="' + dragOn + '"(해제) + 안내문 "순서를 바꿀 수 있습니다" 복귀 (조작→DnD 복구)')

  // ── 정리: 만든 토큰 항목을 우클릭 '휴지통으로 이동' 으로 제거(실패해도 무해).
  await ev(ws, sid, clickView('editor')); await sleep(200)
  await ev(ws, sid, `
    var live=window.__scriv.entries().filter(function(e){return e.title&&e.title.indexOf(${JSON.stringify(tok)})===0});
    var titles={}; live.forEach(function(e){titles[e.title]=1});
    Object.keys(titles).forEach(function(ti){
      var rows=[].slice.call(document.querySelectorAll('.binder-row'));
      var r=rows.find(function(x){var tt=x.querySelector('.binder-title');return tt&&tt.textContent===ti});
      if(!r)return; var rc=r.getBoundingClientRect();
      r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rc.left+20,clientY:rc.top+8}));
      var del=[].slice.call(document.querySelectorAll('.context-menu button')).find(function(b){return /휴지통으로 이동/.test(b.textContent||'')});
      if(del)del.click();
    });
    return 1`); await sleep(300)

  console.log('=== 아웃라이너·타임라인 실동작(조작→효과) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); skip.forEach(m => console.log('  ⤼ skip: ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패' + (skip.length ? ' / ' + skip.length + ' skip' : ''))
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
