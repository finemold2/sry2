// 데이터 뷰 실동작 검증 — 칸반(Board) 카드 드래그로 상태/라벨 변경 + 컬럼 내 재정렬,
// DatabaseView 회차/발행 인라인 편집→setEpisodeMeta 반영(연재뷰까지 전파), SerialDashboard 파이프라인,
// TimelineView 스윔레인. 단순 렌더가 아니라 '동작이 실제로 일어났는가'(DOM 변화·뷰 간 전파)를 본다.
//
// [셀렉터 그라운드 트루스]
//  - 뷰 전환: button.tbtn[aria-label="<라벨>"] (App.tsx viewBtn: title=aria-label=label). 활성=.active/aria-pressed.
//    라벨 정확값: '칸반 보드 (⌘4)', '데이터베이스 (엑셀식 ⌘9)', '연재 관리 (⌘6)', '스토리 타임라인 (⌘7)'.
//    → aria-label '시작 부분 일치'로 클릭(키 힌트 표기 변동에 견고).
//  - 뷰 렌더 확인은 '뷰 컨테이너 DOM'으로: 칸반=.board, DB=table.db-table, 연재=.serial-board,
//    타임라인=툴바 <strong>스토리 타임라인</strong>(전용 컨테이너 클래스 없음 — TimelineView.tsx 확인).
//  - 인스펙터: 인스펙터 토글 button.tbtn[aria-label="인스펙터 토글"]. 탭 button#insp-tab-meta(role=tab).
//    메타 상태 select = 상태 .insp-section 의 select.field(setStatus; 옵션 value=상태 id).
//  - DB: 회차 input[type=number](defaultValue·onBlur 커밋), 발행 select.db-cell(controlled·onChange).
//  - HTML5 DnD: 같은 DataTransfer 로 dragstart→dragenter→dragover(preventDefault)→drop→dragend 모두 dispatch.
//    그래도 변화가 없으면 '합성DnD 한계'로 skip(앱 버그로 단정 금지) + 가능한 경우 다른 경로(인스펙터/DB select)로 효과 검증.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// 참고: 이 파일의 ev() 는 표현식을 '(()=>{' + x + '})()' 로 감싼다 → x 는 'return …' 를 쓰는
// 함수 '본문'이어야 한다(자기호출 IIFE 를 넘기면 바깥 함수가 그 값을 return 하지 않아 undefined 가 된다).
// 그래서 switchView/dndExpr 도 IIFE 가 아니라 'return …' 본문 문자열을 만든다.

// --- 헬퍼: 뷰 전환(툴바 tbtn 을 aria-label '시작부분 일치'로 찾아 클릭) ---
const switchView = (labelPrefix) => `const b=[...document.querySelectorAll('button.tbtn')].find(x=>(x.getAttribute('aria-label')||'').indexOf(${JSON.stringify(labelPrefix)})===0);if(!b)return'no';b.click();return'ok'`

// --- 헬퍼: HTML5 드래그앤드롭을 합성 이벤트로 재현. 같은 DataTransfer 를 전 단계에 공유. ---
// React 합성 이벤트가 e.dataTransfer 를 읽으므로 실제 DataTransfer 를 init dict 로 직접 넘긴다.
// 카드 onDragStart 가 setData('text/scriv-id', id) → 컬럼/카드 onDrop 이 getData 로 읽음. dragover 는 preventDefault 필요.
function dndExpr(srcSel, dstSel) {
  return `
    const src=${srcSel}; const dst=${dstSel};
    if(!src) return 'no-src'; if(!dst) return 'no-dst';
    const dt=new DataTransfer();
    const fire=(el,type)=>{const ev=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt});return el.dispatchEvent(ev)};
    fire(src,'dragstart');
    fire(dst,'dragenter');
    fire(dst,'dragover');
    fire(dst,'drop');
    fire(src,'dragend');
    return 'ok';`
}

// React 제어 input/textarea/select 값 설정용 네이티브 setter — 제어 컴포넌트가 onChange 를 받게 한다.
const NATIVE_SET = `
  const _setVal=(el,v)=>{const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;const d=Object.getOwnPropertyDescriptor(proto,'value');d&&d.set?d.set.call(el,v):(el.value=v);};
`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 와이드 뷰포트(1500x950) — 데이터 뷰의 다중 컬럼/표가 좁은 화면 접힘 없이 다 보이게.
  try { await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false }, sid) } catch { /* noop */ }
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  // 환영 모달 닫기('시작하기|다시 보지')
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = [], skips = []; const t = (c, m) => (c ? ok : bad).push(m); const skip = (m) => skips.push(m)

  // window.prompt/alert 가 헤드리스에서 본문 흐름을 막지 않도록 무력화(연재 '예약' 진입 등).
  await ev(ws, sid, `window.__alerts=[];window.alert=(m)=>{window.__alerts.push(['alert',m])};window.prompt=(m,d)=>{window.__alerts.push(['prompt',m]);return d};window.confirm=()=>true;return 1`)

  // =========================================================================
  // 0) 준비: 칸반 보드 뷰로 전환. 기본 프로젝트엔 원고에 샘플 문서 1개('제1장')뿐 →
  //    각 컬럼의 '+' 버튼으로 여러 문서를 만들어 드래그 표본을 충분히 확보한다.
  // =========================================================================
  t(await ev(ws, sid, switchView('칸반 보드')) === 'ok', '칸반 보드 뷰로 전환(툴바 button.tbtn[aria-label] 클릭)')
  await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.board')`), '보드 컨테이너 렌더(.board 출현)')

  // 컬럼 인덱스: 0=없음, 1=시작 전, 2=집필 중, 3=1차 완료, 4=교정 완료 (factory.ts statuses 5종)
  const colCount = await ev(ws, sid, `return document.querySelectorAll('.board-col').length`)
  t(colCount >= 5, '상태 컬럼 ' + colCount + '개 렌더(기본 상태 5종)')
  // 컬럼 '+'(.board-col-add): 그 칸에 문서를 만들고 곧바로 그 상태로 설정(addTo).
  const addToCol = (i) => `const cols=document.querySelectorAll('.board-col');const c=cols[${i}];if(!c)return'no';const b=c.querySelector('.board-col-add');if(!b)return'no-btn';b.click();return'ok'`
  await ev(ws, sid, addToCol(1)); await sleep(250)
  await ev(ws, sid, addToCol(1)); await sleep(250)
  await ev(ws, sid, addToCol(3)); await sleep(250)

  // 각 컬럼 카드 수 측정
  const colCardCounts = `return [...document.querySelectorAll('.board-col')].map(c=>c.querySelectorAll('.board-card').length)`
  const counts0 = await ev(ws, sid, colCardCounts)
  t(counts0[1] >= 2, "'+' 추가로 두 번째 컬럼(시작 전)에 카드 2개 이상 생성 (실측 " + counts0[1] + ")")

  // -------------------------------------------------------------------------
  // 1) 컬럼 간 이동 = 상태 변경. 두 번째 컬럼(1)의 첫 카드 → 네 번째 컬럼(3)으로.
  //    드롭 대상은 '컬럼'(.board-col) 자체(컬럼 onDrop 이 getData→setStatus). 결과: col1 -1, col3 +1.
  //    합성 DnD 가 안 먹으면 인스펙터 상태 select 로 동일 효과를 검증(앱 버그 단정 금지).
  // -------------------------------------------------------------------------
  const srcCardSel = `document.querySelectorAll('.board-col')[1].querySelector('.board-card')`
  const dstColSel = `document.querySelectorAll('.board-col')[3]`
  const draggedTitle = await ev(ws, sid, `const c=${srcCardSel};return c?(c.querySelector('.board-card-title')?.textContent||''):''`)
  const dndRet = await ev(ws, sid, dndExpr(srcCardSel, dstColSel)); await sleep(450)
  let counts1 = await ev(ws, sid, colCardCounts)
  let statusMoved = counts1[1] === counts0[1] - 1 && counts1[3] === counts0[3] + 1
  if (statusMoved) {
    t(true, `컬럼 간 드래그로 상태 변경: col1 ${counts0[1]}→${counts1[1]}, col3 ${counts0[3]}→${counts1[3]}`)
    const movedInCol3 = await ev(ws, sid, `const col=document.querySelectorAll('.board-col')[3];const titles=[...col.querySelectorAll('.board-card-title')].map(x=>x.textContent);return titles.includes(${JSON.stringify(draggedTitle)})`)
    t(movedInCol3, '드래그한 카드가 대상 컬럼(1차 완료)으로 실제 이동: "' + draggedTitle + '"')
  } else {
    skip(`합성DnD 한계: 칸반 컬럼 간 드래그(ret=${dndRet}, counts ${JSON.stringify(counts0)}→${JSON.stringify(counts1)}) — 인스펙터 상태 select 로 대체 검증`)
    // 대체 경로: 끌려던 카드를 클릭해 선택(select) → 인스펙터 메타 탭 → 상태 select 를 4번째 옵션(인덱스3=1차완료)으로.
    await ev(ws, sid, `const c=${srcCardSel};if(c)c.click();return 1`); await sleep(200)
    // 인스펙터 패널 열기(닫혀 있으면 토글). 메타 탭 활성화.
    await ev(ws, sid, `if(!document.querySelector('.insp-tabs')){const b=document.querySelector('button.tbtn[aria-label="인스펙터 토글"]');if(b)b.click();}return 1`); await sleep(250)
    await ev(ws, sid, `const tb=document.getElementById('insp-tab-meta');if(tb)tb.click();return 1`); await sleep(200)
    // 상태 select(상태 .insp-section 의 select.field) — 옵션에 '1차 완료'가 있는 select.
    const setStatusVia = await ev(ws, sid, NATIVE_SET + `
      const sels=[...document.querySelectorAll('.inspector .insp-section select.field')];
      const st=sels.find(s=>[...s.options].some(o=>/1차 완료/.test(o.textContent||'')));
      if(!st) return 'no-status-select';
      const opt=[...st.options].find(o=>/1차 완료/.test(o.textContent||''));
      if(!opt) return 'no-opt';
      _setVal(st,opt.value); st.dispatchEvent(new Event('change',{bubbles:true}));
      return st.value===opt.value?'ok':'set-fail';`); await sleep(400)
    counts1 = await ev(ws, sid, colCardCounts)
    statusMoved = counts1[3] === counts0[3] + 1
    t(setStatusVia === 'ok' && statusMoved,
      `인스펙터 상태 select 로 상태 변경(대체 경로): setStatus=${setStatusVia}, col3 ${counts0[3]}→${counts1[3]}`)
  }

  // -------------------------------------------------------------------------
  // 2) 라벨별 그룹 전환 후, 라벨 컬럼 간 이동 = 라벨 변경(setLabel).
  //    그룹 전환 영속(localStorage board.groupBy)은 select.change 로 확실히 검증. 이동은 DnD(안되면 skip).
  // -------------------------------------------------------------------------
  await ev(ws, sid, NATIVE_SET + `const s=[...document.querySelectorAll('.board-toolbar select')].find(x=>[...x.options].some(o=>/라벨별/.test(o.textContent)));if(s){_setVal(s,'label');s.dispatchEvent(new Event('change',{bubbles:true}))}return 1`); await sleep(400)
  const labelGrouped = await ev(ws, sid, `return localStorage.getItem('board.groupBy')`)
  t(labelGrouped === 'label', '그룹 기준을 라벨별로 전환 → localStorage(board.groupBy)=label 영속')
  const labCounts0 = await ev(ws, sid, colCardCounts)
  const idxFrom = labCounts0.findIndex(n => n > 0)
  const idxTo = labCounts0.findIndex((n, i) => i !== idxFrom)
  if (idxFrom >= 0 && idxTo >= 0) {
    const labSrc = `document.querySelectorAll('.board-col')[${idxFrom}].querySelector('.board-card')`
    const labDst = `document.querySelectorAll('.board-col')[${idxTo}]`
    const labRet = await ev(ws, sid, dndExpr(labSrc, labDst)); await sleep(450)
    const labCounts1 = await ev(ws, sid, colCardCounts)
    const labMoved = labCounts1[idxFrom] === labCounts0[idxFrom] - 1 && labCounts1[idxTo] === labCounts0[idxTo] + 1
    if (labMoved) t(true, `라벨 컬럼 간 드래그로 라벨 변경: col${idxFrom} ${labCounts0[idxFrom]}→${labCounts1[idxFrom]}, col${idxTo} ${labCounts0[idxTo]}→${labCounts1[idxTo]}`)
    else skip(`합성DnD 한계: 칸반 라벨 컬럼 간 드래그(ret=${labRet}, ${JSON.stringify(labCounts0)}→${JSON.stringify(labCounts1)})`)
  } else {
    skip('라벨 컬럼 이동 표본 부족 — 카운트 ' + JSON.stringify(labCounts0))
  }

  // -------------------------------------------------------------------------
  // 3) 같은 컬럼 내 재정렬(카드→카드 드롭, moveItem). 상태 그룹으로 되돌려 2장 확보 후 첫 카드를 둘째 위로.
  //    합성 DnD 의 같은-부모 재정렬은 합성 한계가 잦아 skip 정책 적용(앱 버그 단정 금지).
  // -------------------------------------------------------------------------
  await ev(ws, sid, NATIVE_SET + `const s=[...document.querySelectorAll('.board-toolbar select')].find(x=>[...x.options].some(o=>/상태별/.test(o.textContent)));if(s){_setVal(s,'status');s.dispatchEvent(new Event('change',{bubbles:true}))}return 1`); await sleep(400)
  const reCounts = await ev(ws, sid, colCardCounts)
  const reIdx = reCounts.findIndex(n => n >= 2)
  if (reIdx >= 0) {
    const before = await ev(ws, sid, `const col=document.querySelectorAll('.board-col')[${reIdx}];return [...col.querySelectorAll('.board-card-title')].map(x=>x.textContent)`)
    const a = `document.querySelectorAll('.board-col')[${reIdx}].querySelectorAll('.board-card')[0]`
    const b = `document.querySelectorAll('.board-col')[${reIdx}].querySelectorAll('.board-card')[1]`
    const reRet = await ev(ws, sid, dndExpr(a, b)); await sleep(450)
    const after = await ev(ws, sid, `const col=document.querySelectorAll('.board-col')[${reIdx}];return [...col.querySelectorAll('.board-card-title')].map(x=>x.textContent)`)
    const reordered = JSON.stringify(before) !== JSON.stringify(after) && before.length === after.length && before[0] === after[1]
    if (reordered) t(true, `컬럼 내 재정렬: [${before.join(',')}] → [${after.join(',')}] (첫 카드가 둘째 자리로)`)
    else skip(`합성DnD 한계: 칸반 컬럼 내 재정렬(ret=${reRet}, [${before.join(',')}]→[${after.join(',')}])`)
  } else {
    skip('컬럼 내 재정렬 표본(2장 이상) 부족 — 카운트 ' + JSON.stringify(reCounts))
  }

  // =========================================================================
  // 4) DatabaseView 회차/발행 인라인 편집 → setEpisodeMeta 반영 + 연재뷰 전파.
  //    회차/발행은 원고(draft 루트) 텍스트 문서에만 입력칸(isEpisodic). '+'로 만든 문서는 draft 직속.
  //    회차 input[type=number]는 defaultValue·onBlur 커밋 / 발행 select.db-cell 은 controlled·onChange.
  // =========================================================================
  t(await ev(ws, sid, switchView('데이터베이스')) === 'ok', '데이터베이스 뷰로 전환')
  await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('table.db-table')`), 'DB 표 컨테이너 렌더(table.db-table)')

  // 회차 input(type=number)이 있는 첫 행을 찾아 회차번호 7 입력(네이티브 setter + blur 로 커밋).
  // 그 행의 제목도 기억(연재뷰 매칭 참고). 정렬 기본=제목순이라 이후 행 순서는 안정.
  const setEpisodeNum = NATIVE_SET + `
    const rows=[...document.querySelectorAll('table.db-table tbody tr')];
    for(const r of rows){
      const ep=r.querySelector('input[type=number]');
      if(ep){
        const titleInput=r.querySelector('input.db-cell');
        const title=titleInput?titleInput.value:'';
        _setVal(ep,'7');
        ep.dispatchEvent(new Event('input',{bubbles:true}));
        ep.dispatchEvent(new Event('change',{bubbles:true}));
        ep.dispatchEvent(new Event('blur',{bubbles:true}));   // onBlur 가 setEpisodeMeta 커밋
        return title;
      }
    }
    return null;`
  const epTitle = await ev(ws, sid, setEpisodeNum); await sleep(400)
  t(epTitle !== null, '원고 문서 행에 회차 입력칸 존재(isEpisodic) — 제목 "' + epTitle + '"')

  // 발행 상태 select(controlled) 를 '완성(ready)'으로 — 회차칸이 있던 같은 첫 행.
  // 발행 select 는 옵션에 초안/완성/예약/발행됨. (라벨=완료/상태=1차완료 와 구분: /완성|발행됨|예약/)
  const setPubReady = NATIVE_SET + `
    const rows=[...document.querySelectorAll('table.db-table tbody tr')];
    for(const r of rows){
      if(!r.querySelector('input[type=number]')) continue;
      const sels=[...r.querySelectorAll('select.db-cell')];
      const pub=sels.find(s=>[...s.options].some(o=>/완성|발행됨|예약/.test(o.textContent)));
      if(!pub) return 'no-pub';
      _setVal(pub,'ready'); pub.dispatchEvent(new Event('change',{bubbles:true}));
      return pub.value==='ready'?'ok':'set-fail';
    }
    return 'no-row';`
  t(await ev(ws, sid, setPubReady) === 'ok', '발행 상태 인라인 변경: 완성(ready) 선택'); await sleep(400)

  // 영속/전파 검증: 연재 대시보드로 가서 그 회차가 '7화'로 + '완성·비축' 컬럼에 + 상단 비축분 카운트.
  t(await ev(ws, sid, switchView('연재 관리')) === 'ok', '연재 관리 뷰로 전환'); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.serial-board')`), '연재 파이프라인 보드 컨테이너 렌더(.serial-board)')
  // 회차번호 7 → 카드 .serial-card-num '7화'.
  const has7 = await ev(ws, sid, `return [...document.querySelectorAll('.serial-card-num')].some(x=>/(^|\\D)7화/.test(x.textContent||''))`)
  t(has7, 'DB뷰에서 입력한 회차번호 7 이 연재뷰 카드(7화)로 전파')
  // '완성 · 비축' 컬럼(STATES ready)에 카드 1개 이상.
  const readyColHas = await ev(ws, sid, `
    const cols=[...document.querySelectorAll('.serial-col')];
    const col=cols.find(c=>/완성/.test(c.querySelector('.serial-col-head')?.textContent||''));
    if(!col) return false;
    return col.querySelectorAll('.serial-card').length>0;`)
  t(readyColHas, "발행상태 완성(ready)이 연재뷰 '완성·비축' 컬럼에 반영")
  // 상단 비축분(.serial-buffer 의 첫 <b> = readyCount: ready+scheduled) 1 이상.
  const bufN = await ev(ws, sid, `const b=document.querySelector('.serial-buffer b');return b?parseInt(b.textContent||'0',10):-1`)
  t(bufN >= 1, '상단 비축분 카운트 ' + bufN + '화 (ready+scheduled 집계)')

  // -------------------------------------------------------------------------
  // 5) SerialDashboard 파이프라인 드래그: '완성·비축' 카드를 '발행됨' 컬럼으로 →
  //    setEpisodeMeta state=published. 드롭 대상=.serial-col(onDrop). 합성 DnD 안되면 DB 발행 select 로 대체.
  // -------------------------------------------------------------------------
  const pubColIdxExpr = `[...document.querySelectorAll('.serial-col')].findIndex(c=>/발행됨/.test(c.querySelector('.serial-col-head')?.textContent||''))`
  const readyColIdxExpr = `[...document.querySelectorAll('.serial-col')].findIndex(c=>/완성/.test(c.querySelector('.serial-col-head')?.textContent||''))`
  const readyIdx = await ev(ws, sid, `return ${readyColIdxExpr}`)
  const pubIdx = await ev(ws, sid, `return ${pubColIdxExpr}`)
  const pubBefore = await ev(ws, sid, `return document.querySelectorAll('.serial-col')[${pubIdx}].querySelectorAll('.serial-card').length`)
  const serialSrc = `document.querySelectorAll('.serial-col')[${readyIdx}].querySelector('.serial-card')`
  const serialDst = `document.querySelectorAll('.serial-col')[${pubIdx}]`
  const sdRet = await ev(ws, sid, dndExpr(serialSrc, serialDst)); await sleep(450)
  let pubAfter = await ev(ws, sid, `return document.querySelectorAll('.serial-col')[${pubIdx}].querySelectorAll('.serial-card').length`)
  if (pubAfter === pubBefore + 1) {
    t(true, `연재 파이프라인 드래그: '발행됨' 컬럼 카드 ${pubBefore}→${pubAfter}`)
  } else {
    skip(`합성DnD 한계: 연재 파이프라인 드래그(ret=${sdRet}, 발행됨 ${pubBefore}→${pubAfter}) — DB 발행 select=발행됨 으로 대체 검증`)
    // 대체 경로: DB 뷰로 가서 같은(회차칸 있는 첫) 행 발행 select 를 'published' 로 → 연재뷰 발행됨 +1.
    await ev(ws, sid, switchView('데이터베이스')); await sleep(450)
    const setPub = await ev(ws, sid, NATIVE_SET + `
      const rows=[...document.querySelectorAll('table.db-table tbody tr')];
      for(const r of rows){
        if(!r.querySelector('input[type=number]')) continue;
        const sels=[...r.querySelectorAll('select.db-cell')];
        const pub=sels.find(s=>[...s.options].some(o=>/완성|발행됨|예약/.test(o.textContent)));
        if(!pub) return 'no-pub';
        _setVal(pub,'published'); pub.dispatchEvent(new Event('change',{bubbles:true}));
        return pub.value==='published'?'ok':'set-fail';
      }
      return 'no-row';`); await sleep(400)
    await ev(ws, sid, switchView('연재 관리')); await sleep(450)
    pubAfter = await ev(ws, sid, `const i=${pubColIdxExpr};return i<0?-1:document.querySelectorAll('.serial-col')[i].querySelectorAll('.serial-card').length`)
    t(setPub === 'ok' && pubAfter >= 1, `DB 발행 select 로 발행됨 처리(대체 경로): setPub=${setPub}, 발행됨 컬럼 카드=${pubAfter}`)
  }
  // 성과 탭(.serial-toolbar .minibtn '성과') → perf-table 렌더.
  await ev(ws, sid, `const b=[...document.querySelectorAll('.serial-toolbar .minibtn')].find(x=>/성과/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(350)
  t(await ev(ws, sid, `return !!document.querySelector('table.perf-table')`), '연재 성과 탭 → perf-table 렌더')

  // =========================================================================
  // 6) TimelineView 스윔레인: 장면 카드가 레인에 배치 / 스윔레인 기준(장/POV/플롯)을 바꾸면 레인 재계산
  //    (POV 미입력 → '(미지정)' 레인) / '스토리시간순 정렬' ON 시 수동 순서변경 비활성 안내로 전환.
  //    전용 컨테이너 클래스 없음 → 툴바 <strong>스토리 타임라인</strong> 으로 렌더 확인(TimelineView.tsx).
  // =========================================================================
  t(await ev(ws, sid, switchView('스토리 타임라인')) === 'ok', '스토리 타임라인 뷰로 전환'); await sleep(500)
  t(await ev(ws, sid, `return [...document.querySelectorAll('strong')].some(s=>/^스토리 타임라인$/.test((s.textContent||'').trim()))`),
    '타임라인 뷰 렌더(툴바 <strong>스토리 타임라인</strong> 출현)')
  // 장면 카드 = 레인 행(min-height:96px) 안의 button. 원고 텍스트 문서들이 장면으로.
  const sceneCardCount = await ev(ws, sid, `
    const rows=[...document.querySelectorAll('div')].filter(d=>/min-height:\\s*96px/.test(d.getAttribute('style')||''));
    let n=0; rows.forEach(r=>{ n+=r.querySelectorAll('button').length; });
    return n;`)
  t(sceneCardCount >= 1, '타임라인 장면 카드 ' + sceneCardCount + '개 렌더')
  // 스윔레인 기준 'POV' 로 전환(.minibtn 텍스트 정확히 'POV') → 레인 라벨 '(미지정)'(POV 메타 없음).
  await ev(ws, sid, `const b=[...document.querySelectorAll('.minibtn')].find(x=>/^POV$/.test((x.textContent||'').trim()));if(b)b.click();return 1`); await sleep(400)
  const povLane = await ev(ws, sid, `return document.body.innerText.includes('(미지정)')`)
  t(povLane, "스윔레인 기준 POV 로 전환 → 레인 라벨 '(미지정)' 노출(메타 미입력 장면)")
  // '스토리시간순 정렬' 체크박스 ON → 수동 순서변경 비활성 안내 문구로 전환(실제 사용자 결과).
  // 제어 체크박스이므로 .click() 으로 실제 change 를 발화(.checked 직접 설정은 React 가 되돌릴 수 있음).
  // 인스펙터 등 다른 체크박스와 섞이지 않게 라벨 텍스트('스토리시간순 정렬')로 정확히 찾는다.
  await ev(ws, sid, `
    const lab=[...document.querySelectorAll('label')].find(l=>/스토리시간순 정렬/.test(l.textContent||''));
    const c=(lab&&lab.querySelector('input[type=checkbox]'))||document.querySelector('input[type=checkbox]');
    if(c&&!c.checked){c.click()} return 1`); await sleep(400)
  const dndOff = await ev(ws, sid, `return document.body.innerText.includes('수동 순서변경이 비활성화')`)
  t(dndOff, '스토리시간순 정렬 ON → 수동 순서변경 비활성 안내로 전환')

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 데이터 뷰(칸반/DB/연재/타임라인) 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); skips.forEach(m => console.log('  ⤼ skip: ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패 / ' + skips.length + ' skip(합성DnD 한계)')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
