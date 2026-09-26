// 칸반 보드 '실동작' QA — 카드를 다른 상태 컬럼으로 드래그하면 (1)소스 컬럼 -1 (2)대상 컬럼 +1
//  (3)그 카드가 대상 컬럼에 실제로 존재(상태 변경 영속) + 컬럼 내 재정렬까지 '조작→효과'로 단언한다.
//  소스: src/components/Board.tsx (BoardCard.onDragStart setData('text/scriv-id'), 컬럼 onDrop→setStatus,
//        카드 onDrop→moveItem 재정렬), store setStatus/moveItem.
//
// [DnD 구동 방식 — 중요]
//  Board 의 카드는 HTML5 네이티브 draggable(=draggable + dataTransfer) 이다. 헤드리스 Chrome 은
//  Input.dispatchMouseEvent(실제 마우스) 로 네이티브 HTML5 드래그를 '가로채(intercept)' 페이지로
//  dragstart/drop 을 전달하지 않으므로 실제 마우스로는 이 보드 DnD 를 구동할 수 없다. (실제 마우스 패턴은
//  포인터 기반 커스텀 DnD — 예: 수집함 자유이동 — 전용이다.) 따라서 이 저장소에서 검증된 방식
//  (_cdp_views_core 코르크보드 DnD 와 동일: dragstart/dragenter/dragover/drop/dragend 를 '같은
//  dataTransfer 목(mock)' 으로 dispatch — React 는 이벤트 type 기준으로 루트에서 위임 처리하므로
//  onDragStart/onDrop 핸들러가 실제로 발화한다) 을 사용한다. 합성 PointerEvent/DragEvent 생성자는
//  쓰지 않는다(빈 dataTransfer 로 핸들러가 깨짐). 양 스킨(classic/studio) 모두 검증한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 페이지 컨텍스트 헬퍼(매 ev 앞에 prepend) — 컬럼/카드 조회.
const PRE = `
function colByName(n){return [].slice.call(document.querySelectorAll('.board-col')).find(function(c){var e=c.querySelector('.board-col-name');return e&&e.textContent.trim()===n});}
function cardTitle(el){var e=el.querySelector('.board-card-title');return e?(e.textContent||'').trim():'';}
function cardsIn(n){var c=colByName(n);if(!c)return [];return [].slice.call(c.querySelectorAll('.board-card'));}
function colCount(n){var c=colByName(n);if(!c)return -1;var e=c.querySelector('.board-col-count');return e?parseInt(e.textContent,10):-1;}
function findCard(tag){return [].slice.call(document.querySelectorAll('.board-card')).find(function(el){return cardTitle(el)===tag});}
function tagsIn(n,pfx){return cardsIn(n).map(cardTitle).filter(function(t){return t.indexOf(pfx)===0});}
function allTags(pfx){return [].slice.call(document.querySelectorAll('.board-card-title')).map(function(e){return (e.textContent||'').trim()}).filter(function(t){return t.indexOf(pfx)===0});}
`

// 같은 dataTransfer 목으로 네이티브 HTML5 드래그 시퀀스를 발화하는 JS(소스→타깃).
function dndJS(srcExpr, dstExpr, label) {
  return PRE + `
    var src=${srcExpr}; var dst=${dstExpr};
    if(!src||!dst)return 'no:'+(src?'':'src')+(dst?'':'dst');
    var store={};
    var dt={types:['text/scriv-id'],setData:function(k,v){store[k]=v;if(dt.types.indexOf(k)<0)dt.types.push(k);},getData:function(k){return store[k]||''},effectAllowed:'',dropEffect:'',setDragImage:function(){}};
    var fire=function(el,type){var e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:dt,configurable:true});return el.dispatchEvent(e);};
    fire(src,'dragstart');fire(dst,'dragenter');fire(dst,'dragover');fire(dst,'drop');fire(src,'dragend');
    return 'fired:${label}';`
}

const SI = '시작 전', JI = '집필 중' // 기본 프로젝트 상태 컬럼명

async function runSkin(ws, skin) {
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await sleep(3800)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push('[' + skin + '] ' + m)
  const tok = skin.slice(0, 2) + '-' + Math.random().toString(36).slice(2, 6)
  const tA = tok + '-A', tB = tok + '-B', tC = tok + '-C', tZ = tok + '-Z'

  // 환영/투어 닫기
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  // 스킨 적용 확인(app-studio 클래스)
  const isStudio = await ev(ws, sid, "return document.querySelector('.app')?document.querySelector('.app').classList.contains('app-studio'):/app-studio/.test(document.body.innerHTML)")
  t(skin === 'studio' ? !!isStudio : !isStudio, '스킨 적용=' + skin + ' (app-studio=' + isStudio + ')')

  // 칸반 보드 뷰로 전환(양 스킨 공통: title 에 "칸반 보드" 포함된 버튼)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button[title]')).find(function(x){return /칸반 보드/.test(x.getAttribute('title')||'')});if(b)b.click();return 1"); await sleep(600)
  const mounted = await ev(ws, sid, "return !!document.querySelector('.board')")
  const pressed = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button[title]')).find(function(x){return /칸반 보드/.test(x.getAttribute('title')||'')});return b?b.getAttribute('aria-pressed'):null")
  t(mounted && pressed === 'true', '칸반 보드 뷰 마운트(.board) + 버튼 aria-pressed=true (' + pressed + ')')

  // 그룹 기준을 '상태별'로 고정(컬럼명으로 조회하므로)
  await ev(ws, sid, "var s=document.querySelector('.board-toolbar select');if(s){var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,'status');s.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(400)
  // 컨테이너를 원고 루트로 고정(원고 하위 텍스트가 카드로 모이도록)
  await ev(ws, sid, "var r=[].slice.call(document.querySelectorAll('.binder-title')).find(function(x){return (x.textContent||'').trim()==='원고'});if(r)r.click();return 1"); await sleep(400)
  t(await ev(ws, sid, PRE + "return !!colByName('" + SI + "') && !!colByName('" + JI + "')"), "상태 컬럼 '" + SI + "'/'" + JI + "' 렌더됨")

  // ── 카드 준비: '시작 전'에 A,B,C / '집필 중'에 Z 추가 후 각각 고유 제목 부여(바인더 인라인 이름편집) ──
  const addTo = async (colName, tag) => {
    await ev(ws, sid, PRE + "var c=colByName(" + JSON.stringify(colName) + ");if(!c)return 'no-col';var b=c.querySelector('.board-col-add');if(!b)return 'no-add';b.click();return 'ok'"); await sleep(350)
    // addItem(제목 미지정)이 renameId 를 켜 바인더에 .binder-rename 입력이 뜸 → 고유 제목 입력
    await ev(ws, sid, "var i=document.querySelector('.binder-rename');if(!i)return 'no-input';i.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + JSON.stringify(tag) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 'ok'"); await sleep(350)
  }
  await addTo(SI, tA); await addTo(SI, tB); await addTo(SI, tC); await addTo(JI, tZ)

  const setupSI = await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(SI) + "," + JSON.stringify(tok) + "))")
  const setupJI = await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(JI) + "," + JSON.stringify(tok) + "))")
  const si0 = JSON.parse(setupSI), ji0 = JSON.parse(setupJI)
  t(si0.length === 3 && ji0.length === 1, "준비: '" + SI + "' 3카드 + '" + JI + "' 1카드 (SI=" + si0.join(',') + ' | JI=' + ji0.join(',') + ')')

  // ── 효과①: 컬럼 내 재정렬 — C 카드를 A 카드 위로 드래그(같은 부모 형제 → moveItem). ──
  //  카드 onDrop 은 moveItem(dragId, parent, siblings.indexOf(targetCard)) → C 가 A 앞으로 이동.
  const beforeOrder = si0.slice() // [A,B,C]
  const r1 = await ev(ws, sid, dndJS("findCard(" + JSON.stringify(tC) + ")", "findCard(" + JSON.stringify(tA) + ")", "reorder")); await sleep(550)
  const afterOrderRaw = await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(SI) + "," + JSON.stringify(tok) + "))")
  const afterOrder = JSON.parse(afterOrderRaw)
  const idxC = afterOrder.indexOf(tC), idxA = afterOrder.indexOf(tA)
  t(String(r1).indexOf('fired') === 0, '재정렬 DnD 발화(C→A) (' + r1 + ')')
  t(afterOrder.join(',') !== beforeOrder.join(',') && idxC >= 0 && idxA >= 0 && idxC < idxA,
    "컬럼 내 재정렬 효과: '" + SI + "' [" + beforeOrder.join(',') + "] → [" + afterOrder.join(',') + '] (C가 A 앞으로)')
  // 재정렬은 컬럼 내부 이동일 뿐 — 컬럼 카드 수는 그대로(상태 불변)
  t(afterOrder.length === 3 && JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(JI) + "," + JSON.stringify(tok) + "))")).length === 1,
    '재정렬은 상태 미변경: SI=3 / JI=1 유지')

  // ── 효과②: 크로스 컬럼 드래그 — A 카드를 '집필 중' 컬럼으로 드래그 → setStatus(A, 집필중). ──
  const siBefore = afterOrder.length // 3
  const jiBefore = JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(JI) + "," + JSON.stringify(tok) + "))")).length // 1
  const dirtyBefore = await ev(ws, sid, "return !!(window.__scriv && window.__scriv.state().dirty)")
  const r2 = await ev(ws, sid, dndJS("findCard(" + JSON.stringify(tA) + ")", "colByName(" + JSON.stringify(JI) + ")", "status")); await sleep(600)
  t(String(r2).indexOf('fired') === 0, '크로스 컬럼 DnD 발화(A→' + JI + ' 컬럼) (' + r2 + ')')

  const siAfter = JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(SI) + "," + JSON.stringify(tok) + "))"))
  const jiAfter = JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(tagsIn(" + JSON.stringify(JI) + "," + JSON.stringify(tok) + "))"))
  t(siAfter.length === siBefore - 1, "소스 컬럼 '" + SI + "' 카드 -1 (" + siBefore + '→' + siAfter.length + ')')
  t(jiAfter.length === jiBefore + 1, "대상 컬럼 '" + JI + "' 카드 +1 (" + jiBefore + '→' + jiAfter.length + ')')
  t(jiAfter.indexOf(tA) >= 0 && siAfter.indexOf(tA) < 0,
    "드래그한 카드 A 가 대상 컬럼에 존재 + 소스 컬럼에서 사라짐(상태 변경 영속) (대상=" + jiAfter.join(',') + ')')

  // 데이터 안전: 내 카드 총수 불변(유실/중복 없음)
  const totalAll = JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(allTags(" + JSON.stringify(tok) + "))"))
  t(totalAll.length === 4, '드래그 전후 내 카드 총수 불변=4 (데이터 안전, 실제=' + totalAll.length + ')')

  // 상태 변경이 스토어에 반영(영속 대기) — setStatus 가 dirty 를 세움
  const dirtyAfter = await ev(ws, sid, "return !!(window.__scriv && window.__scriv.state().dirty)")
  t(dirtyAfter === true, '상태 변경이 스토어 반영: dirty=true(미저장 영속 대기, before=' + dirtyBefore + ')')

  await rpc(ws, 'Target.closeTarget', { targetId })
  return { ok, bad }
}

// ── 실행 ──
;(async () => {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  // 부트스트랩 타깃: 스킨 전환을 위해 localStorage('sry:uiSkin') 를 origin 에 미리 심는다.
  const { targetId: bt } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: bsid } = await rpc(ws, 'Target.attachToTarget', { targetId: bt, flatten: true })
  await sleep(2500)
  const allOk = [], allBad = []
  for (const skin of ['classic', 'studio']) {
    await ev(ws, bsid, "try{localStorage.setItem('sry:uiSkin'," + JSON.stringify(skin) + ")}catch(e){};return 1")
    let res
    try { res = await runSkin(ws, skin) }
    catch (e) { allBad.push('[' + skin + '] FATAL ' + e.message); continue }
    res.ok.forEach(m => allOk.push(m)); res.bad.forEach(m => allBad.push(m))
  }
  await rpc(ws, 'Target.closeTarget', { targetId: bt }).catch(() => { })
  console.log('=== 칸반 보드 실동작 검증(classic+studio) ===')
  allOk.forEach(m => console.log('  ✓ ' + m)); allBad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + allOk.length + ' 통과 / ' + allBad.length + ' 실패')
  ws.close(); process.exit(allBad.length ? 1 : 0)
})().catch(e => { console.log('FATAL', e.message); process.exit(2) })
