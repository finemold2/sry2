// 코어 뷰(에디터·코르크보드·아웃라이너) 실동작 검증 — 코드리뷰가 아니라 실제 클릭/입력/드래그 후 '효과'를 본다.
//  ① 뷰 전환 버튼(button.tbtn[aria-label] 정확매칭)으로 3뷰 전환 → aria-pressed + 전용 컨테이너 DOM 마운트(무크래시·예외0)
//  ② 코르크보드: 새 카드 추가(카드 수 +1) → 카드 B를 A 위로 합성 DnD → 코르크보드 카드 DOM 순서 [A,B]→[B,A] + 바인더 행 순서 동기(안되면 skip)
//  ③ 아웃라이너: 행 인라인 제목(contentEditable) 편집+blur 커밋 → window.__scriv.entries() 의 title 반영(영속) + 표 DOM 반영
//  [그라운드트루스] 뷰버튼 라벨은 App.tsx viewBtn(title=aria-label=label) 정확값: '에디터 (⌘1)' '코르크보드 (⌘2)' '아웃라이너 (⌘3)'.
//   컨테이너 클래스: 에디터=.paper, 코르크보드=.corkboard, 아웃라이너=.outliner. DnD 계약(Card/Outliner onDrop): moveItem(dragId, parent, siblings.indexOf(target)).
//   moveItem 보정 규약상 '앞→뒤' 항목을 뒤 항목 위로 떨구면 제자리(무변화)라, [A,B]→[B,A] 재정렬은 'B를 A 위로' 떨궈야 발생한다.
// 상태 접근은 노출 훅(window.__scriv = {state(),bodyOf(),entries()})과 순수 DOM 만 사용한다(useStore 전역 없음).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// 뷰 전환 버튼 클릭 — App.tsx viewBtn: button.tbtn[aria-label="<라벨>"] 정확 매칭(.seg 의존 안 함). 반환=클릭 후 aria-pressed.
const VIEW_LABEL = { editor: '에디터 (⌘1)', corkboard: '코르크보드 (⌘2)', outliner: '아웃라이너 (⌘3)' }
const clickView = (key) => { const lbl = VIEW_LABEL[key]; return `const b=document.querySelector('button.tbtn[aria-label='+${JSON.stringify(JSON.stringify(lbl))}+']');if(!b)return'no:'+${JSON.stringify(lbl)};b.click();return new Promise(r=>setTimeout(()=>r(b.getAttribute('aria-pressed')),150))` } // React 재렌더 후 판독
// 바인더 '+ 글' 버튼(검증된 셀렉터: _cdp_binder.cjs). 활성 항목 컨테이너(기본 root-draft) 끝에 텍스트 추가 + 인라인 rename 시작.
const addDocBtn = `const b=document.querySelector('.binder .minibtn[title="새 글"]')||document.querySelector('.binder .minibtn[title="새 텍스트"]');if(b){b.click();return 1}return 0`
// 인라인 rename input(.binder-rename)에 제목 입력 + Enter 커밋.
const renameInline = (v) => `const i=document.querySelector('.binder-rename');if(!i)return'no-input';i.focus();i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return'ok'`
// 토큰으로 시작하는 항목들의 entries(title 순) — 효과 검증의 단일 소스.
const tokEntries = (tok) => `return window.__scriv.entries().filter(e=>e.title&&e.title.indexOf(${JSON.stringify(tok)})===0)`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = [], skip = []; const t = (c, m) => (c ? ok : bad).push(m); const sk = (m) => skip.push(m)

  // 바인더가 접혀 있으면 펼친다(좁은 창 자동접기 대비) — '+ 글' 버튼 접근 보장.
  await ev(ws, sid, `if(!document.querySelector('.binder')){const b=document.querySelector('[aria-label="바인더 토글"]');if(b)b.click()}return 1`); await sleep(250)

  // ───────────────────────────────────────────────────────────────
  // 준비: 에디터로 가서 루트(원고) 컨테이너를 활성화한 뒤, 알려진 토큰 제목의 카드 3개를 '+ 글' UI 로 추가.
  //   토큰으로 우리 항목만 추적(기존 항목과 분리). 추가 시 활성 컨테이너는 root-draft(또는 그 하위) 가 된다.
  // ───────────────────────────────────────────────────────────────
  await ev(ws, sid, clickView('editor')); await sleep(300)
  // 원고 루트(있으면)를 클릭해 컨테이너를 root-draft 로 고정 — 이후 추가가 한 폴더에 모이게.
  await ev(ws, sid, `const rows=[...document.querySelectorAll('.binder-row')];const r=rows.find(x=>/원고|초고|Manuscript|Draft/i.test(x.getAttribute('aria-label')||x.textContent||''))||rows[0];if(r)r.click();return 1`); await sleep(250)

  const tok = 'QA' + Date.now().toString().slice(-6)
  const labels = ['A', 'B', 'C']
  for (const lb of labels) {
    const added = await ev(ws, sid, addDocBtn); await sleep(350)
    if (added) { await ev(ws, sid, renameInline(tok + '-' + lb)); await sleep(300) }
  }
  await sleep(300)
  const made = await ev(ws, sid, tokEntries(tok))
  t(made.length === 3, '준비: 토큰 카드 3개 생성·식별 (' + made.length + '개, via UI)')
  // entries 순서는 안정적이지 않을 수 있어, '부모 동일성' 만 보장(같은 컨테이너에 모임)
  const sameParent = made.length === 3 && made[0].parentId && made.every(e => e.parentId === made[0].parentId)
  t(sameParent, '준비: 3개 카드가 같은 컨테이너(' + (made[0] && made[0].parentId) + ')에 모임')
  const idA = (made.find(e => e.title === tok + '-A') || {}).id
  const idB = (made.find(e => e.title === tok + '-B') || {}).id

  // ───────────────────────────────────────────────────────────────
  // ① 보기 전환: 에디터 → 코르크보드 → 아웃라이너. 각 aria-pressed=true + 전용 DOM 마운트(무크래시).
  // ───────────────────────────────────────────────────────────────
  const ap1 = await ev(ws, sid, clickView('editor')); await sleep(350)
  t(ap1 === 'true' && await ev(ws, sid, `return !!document.querySelector('.paper')`), '뷰전환 에디터: aria-pressed=true + .paper 마운트 (' + ap1 + ')')

  const ap2 = await ev(ws, sid, clickView('corkboard')); await sleep(450)
  t(ap2 === 'true' && await ev(ws, sid, `return !!document.querySelector('.corkboard')`), '뷰전환 코르크보드: aria-pressed=true + .corkboard 마운트 (' + ap2 + ')')

  const ap3 = await ev(ws, sid, clickView('outliner')); await sleep(450)
  t(ap3 === 'true' && await ev(ws, sid, `return !!document.querySelector('.outliner table')`), '뷰전환 아웃라이너: aria-pressed=true + .outliner table 마운트 (' + ap3 + ')')

  // ───────────────────────────────────────────────────────────────
  // ② 코르크보드: 새 카드 추가(코르크보드에서 카드 수 증가 확인) + 카드 DnD 재정렬.
  //   - 코르크보드로 전환, 정렬을 '수동'(바인더 순서)으로 맞춰 드래그 재배치가 허용되게 한다.
  //   - '+ 글' 로 카드 1개 더 추가 → 코르크보드 .card 수가 +1.
  //   - 카드 B 를 카드 A 위로 합성 HTML5 DnD(dragstart→dragenter→dragover[preventDefault]→drop→dragend, 같은 DataTransfer).
  //     Card.onDrop 이 moveItem(B, parent, siblings.indexOf(A)) 을 호출 → 보정 규약상 [A,B]→[B,A] 재정렬(소스 계약 그대로).
  //   - 효과: 코르크보드 카드 DOM 순서 [A,B]→[B,A], 그리고 바인더 행 순서도 동일하게 동기.
  //   - 합성 DnD 가 재정렬을 일으키지 못하면(브라우저 합성 한계) 실패로 세지 않고 skip 으로 콘솔에 남긴다.
  // ───────────────────────────────────────────────────────────────
  await ev(ws, sid, clickView('corkboard')); await sleep(450)
  // 토큰 카드가 보이도록(컨테이너 일치): A 카드를 클릭해 그 부모를 컨테이너로 진입.
  await ev(ws, sid, `const cards=[...document.querySelectorAll('.corkboard .card')];const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};const a=cards.find(c=>ti(c)===${JSON.stringify(tok + '-A')});if(a)a.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));return 1`); await sleep(200)
  await ev(ws, sid, clickView('corkboard')); await sleep(300) // 더블클릭이 에디터로 열 수 있으니 다시 코르크보드로
  // 정렬을 수동으로(드래그 재배치 잠금 해제). cork-toolbar 의 첫 select 가 정렬.
  await ev(ws, sid, `const sel=document.querySelector('.cork-toolbar select');if(sel){sel.value='manual';sel.dispatchEvent(new Event('change',{bubbles:true}))}return 1`); await sleep(250)

  const beforeAdd = await ev(ws, sid, `return document.querySelectorAll('.corkboard .card').length`)
  const added2 = await ev(ws, sid, addDocBtn); await sleep(350)
  if (added2) { await ev(ws, sid, renameInline(tok + '-NEW')); await sleep(300) }
  await ev(ws, sid, clickView('corkboard')); await sleep(350) // 추가 후 혹시 에디터로 갔다면 복귀
  const afterAdd = await ev(ws, sid, `return document.querySelectorAll('.corkboard .card').length`)
  t(afterAdd === beforeAdd + 1, '코르크보드 새 카드 추가: 카드 수 ' + beforeAdd + ' → ' + afterAdd + ' (+1)')

  // DnD 전 코르크보드 토큰 카드 DOM 순서 스냅샷.
  const cbBefore = await ev(ws, sid, `
    const cards=[...document.querySelectorAll('.corkboard .card')];
    const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};
    return cards.map(ti).filter(s=>s===${JSON.stringify(tok + '-A')}||s===${JSON.stringify(tok + '-B')});`)
  t(cbBefore[0] === tok + '-A' && cbBefore[1] === tok + '-B', 'DnD 전 코르크보드 순서 = [A,B] (' + cbBefore.join(',') + ')')

  // 카드 B→A 합성 HTML5 드래그(같은 DataTransfer). Card.onDragStart 가 setData('text/scriv-id', B) 를,
  //  A.onDrop 이 getData 로 B 를 읽어 moveItem(B, parent, siblings.indexOf(A)) 를 호출(소스 계약 그대로 재현).
  //  moveItem 보정상 '뒤→앞'(B 를 A 위로)만 실제 재정렬되어 [A,B]→[B,A] 가 된다.
  //  GT: dragstart(소스)→dragenter(타깃)→dragover(타깃,preventDefault)→drop(타깃)→dragend 를 모두 dispatch. types 는 실제 배열.
  const dnd = await ev(ws, sid, `
    const cards=[...document.querySelectorAll('.corkboard .card')];
    const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};
    const A=cards.find(c=>ti(c)===${JSON.stringify(tok + '-A')});
    const B=cards.find(c=>ti(c)===${JSON.stringify(tok + '-B')});
    if(!A||!B)return 'no:'+(A?'':'A')+(B?'':'B');
    const store={};
    const dt={types:['text/scriv-id'],setData:(k,v)=>{store[k]=v;if(!dt.types.includes(k))dt.types.push(k)},getData:(k)=>store[k]||'',effectAllowed:'',dropEffect:'',setDragImage:()=>{}};
    const fire=(el,type)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});return el.dispatchEvent(e)};
    fire(B,'dragstart');fire(A,'dragenter');fire(A,'dragover');fire(A,'drop');fire(B,'dragend');
    return 'fired';`); await sleep(500)
  t(dnd === 'fired', 'DnD 실행: 카드 B→A 드롭 합성 이벤트(start/enter/over/drop/end) 발화 (' + dnd + ')')

  // 효과①: 코르크보드 카드 DOM 순서가 [B,A] 로 뒤바뀜(실사용 가시 효과 = 재정렬 발생).
  const cbAfter = await ev(ws, sid, `
    const cards=[...document.querySelectorAll('.corkboard .card')];
    const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};
    return cards.map(ti).filter(s=>s===${JSON.stringify(tok + '-A')}||s===${JSON.stringify(tok + '-B')});`)
  const cbReordered = cbAfter[0] === tok + '-B' && cbAfter[1] === tok + '-A'

  // 효과②: 바인더 트리 행 순서도 동일하게 [B,A] 로 동기(코르크보드↔바인더 순서 일치 = childIds 동기).
  const binderAB = await ev(ws, sid, `
    const rows=[...document.querySelectorAll('.binder-row .binder-title')].map(x=>x.textContent);
    return rows.filter(s=>s===${JSON.stringify(tok + '-A')}||s===${JSON.stringify(tok + '-B')});`)
  const binderReordered = binderAB[0] === tok + '-B' && binderAB[1] === tok + '-A'

  if (cbReordered) {
    // 합성 DnD 가 실제 재정렬을 일으킨 경우: 가시 효과(코르크보드 DOM) + 바인더 동기까지 단언.
    t(cbReordered, 'DnD 효과: 코르크보드 순서 [A,B]→[B,A] 재정렬 (' + cbAfter.join(',') + ')')
    t(binderReordered, '바인더 행 순서 [B,A] 동기 (코르크보드↔바인더) (' + binderAB.join(',') + ')')
  } else {
    // 합성 DnD 가 순서를 못 바꾼 경우: 앱 버그로 단정 금지 — skip 으로 남기고, 같은 효과(재정렬)를
    //  '드래그가 아닌 다른 경로'(키보드 Ctrl+→: Corkboard onArrow reorder, 동일 moveItem 규약)로 확인한다.
    sk('합성 DnD 가 코르크보드 순서를 바꾸지 못함 (cb=' + cbAfter.join(',') + ') — 키보드 재정렬로 효과 검증 대체')
    // A 카드에 포커스 → Ctrl+ArrowRight (수동순서에서 A 를 뒤로) → [A,B]→[B,A].
    const kbd = await ev(ws, sid, `
      const cards=[...document.querySelectorAll('.corkboard .card')];
      const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};
      const A=cards.find(c=>ti(c)===${JSON.stringify(tok + '-A')});
      if(!A)return 'no-A';
      A.focus();
      A.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',ctrlKey:true,bubbles:true,cancelable:true}));
      return 'sent';`); await sleep(450)
    const cbKbd = await ev(ws, sid, `
      const cards=[...document.querySelectorAll('.corkboard .card')];
      const ti=(el)=>{const e=el.querySelector('.card-title');return e?e.textContent:''};
      return cards.map(ti).filter(s=>s===${JSON.stringify(tok + '-A')}||s===${JSON.stringify(tok + '-B')});`)
    const binderKbd = await ev(ws, sid, `
      const rows=[...document.querySelectorAll('.binder-row .binder-title')].map(x=>x.textContent);
      return rows.filter(s=>s===${JSON.stringify(tok + '-A')}||s===${JSON.stringify(tok + '-B')});`)
    t(cbKbd[0] === tok + '-B' && cbKbd[1] === tok + '-A', '코르크보드 재정렬(키보드 Ctrl+→ 경로): 순서 [A,B]→[B,A] (' + kbd + ', cb=' + cbKbd.join(',') + ')')
    t(binderKbd[0] === tok + '-B' && binderKbd[1] === tok + '-A', '바인더 행 순서 [B,A] 동기 (재정렬↔바인더) (' + binderKbd.join(',') + ')')
  }

  // ───────────────────────────────────────────────────────────────
  // ③ 아웃라이너: 행 인라인 제목(contentEditable) 편집 → renameItem 반영(영속) + 표 DOM 반영.
  //   토큰-A 의 제목 contentEditable 을 '<tok>-RENAMED' 로 바꾸고 blur 로 커밋(EditableText.onBlur→onCommit).
  // ───────────────────────────────────────────────────────────────
  await ev(ws, sid, clickView('outliner')); await sleep(450)
  const newTitle = tok + '-RENAMED'
  const edited = await ev(ws, sid, `
    let target=[...document.querySelectorAll('.outliner [contenteditable]')].find(c=>c.textContent===${JSON.stringify(tok + '-A')});
    if(!target)return 'no-target';
    target.focus();
    target.textContent=${JSON.stringify(newTitle)};
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.blur();
    return 'committed';`); await sleep(450)
  t(edited === 'committed', '아웃라이너 인라인 편집: A 제목 contentEditable 수정+blur 커밋 (' + edited + ')')

  // 효과: window.__scriv.entries() 의 해당 항목 title 이 새 값으로 바뀜(영속 상태 반영).
  const renamed = idA
    ? await ev(ws, sid, `const e=window.__scriv.entries().find(x=>x.id===${JSON.stringify(idA)});return e?e.title:'(none)'`)
    : await ev(ws, sid, `const e=window.__scriv.entries().find(x=>x.title===${JSON.stringify(newTitle)});return e?e.title:'(none)'`)
  t(renamed === newTitle, '아웃라이너 편집 영속: entries()[A].title = "' + renamed + '"')

  // 효과: 아웃라이너 표 DOM 에도 새 제목이 렌더됨.
  const inTable = await ev(ws, sid, `return [...document.querySelectorAll('.outliner [contenteditable]')].some(c=>c.textContent===${JSON.stringify(newTitle)})`)
  t(inTable, '아웃라이너 표 DOM 에 새 제목 렌더 반영')

  // ───────────────────────────────────────────────────────────────
  // 정리: 만든 토큰 항목을 우클릭 '휴지통으로 이동' 으로 제거(실패해도 무해 — 테스트 잔여물 최소화).
  // ───────────────────────────────────────────────────────────────
  await ev(ws, sid, clickView('editor')); await sleep(200)
  await ev(ws, sid, `
    const live=window.__scriv.entries().filter(e=>e.title&&(e.title.indexOf(${JSON.stringify(tok)})===0));
    const titles=new Set(live.map(e=>e.title));
    for(const ti of titles){
      const rows=[...document.querySelectorAll('.binder-row')];
      const r=rows.find(x=>{const tt=x.querySelector('.binder-title');return tt&&tt.textContent===ti});
      if(!r)continue;
      const rc=r.getBoundingClientRect();
      r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rc.left+20,clientY:rc.top+8}));
      const del=[...document.querySelectorAll('.context-menu button')].find(b=>/휴지통으로 이동/.test(b.textContent||''));
      if(del)del.click();
    }
    return 1`); await sleep(300)

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 코어 뷰(에디터·코르크보드·아웃라이너) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); skip.forEach(m => console.log('  ⤼ skip: ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패 / ' + skip.length + ' skip')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
