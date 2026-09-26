// 칸반·연재·DB '실사용자' QA/UX 베타 — 코드리뷰가 아니라 '글 쓰는 사람이 당연히 기대하는 동작'을 그대로
//  조작해 검증한다. 크래시뿐 아니라 "상식적으로 당연한데 안 되는 것"을 [ISSUE] 로 잡아낸다.
//  대상(소스): src/components/Board.tsx, src/components/SerialDashboard.tsx, src/components/DatabaseView.tsx,
//             src/components/ProjectSettingsModal.tsx(상태=칸반 컬럼 추가), src/components/useModal.ts(포커스/Esc)
//
//  담당 영역: 칸반(컬럼 추가/그룹전환/카드 드래그 상태변경)·연재(파이프라인 드래그·성과탭·비축·예약 안전)·
//            DB(인라인 회차/발행 편집→연재 전파·검색·정렬·빈 상태). 기대 동작을 단언으로 인코딩,
//            위반 시 console.log('[ISSUE] …') 출력(실패로도 카운트).
//
//  [DnD 구동 — 중요] Board/Serial 카드는 HTML5 네이티브 draggable 이다. 헤드리스 Chrome 의 실제 마우스
//   (Input.dispatchMouseEvent)는 네이티브 HTML5 드래그를 가로채 페이지로 dragstart/drop 을 전달하지 않으므로,
//   이 저장소에서 검증된 방식(같은 dataTransfer 목(mock)으로 dragstart→dragenter→dragover→drop→dragend 를
//   dispatch — React 는 이벤트 type 기준 루트 위임이라 onDragStart/onDrop 가 실제 발화)을 쓴다. 합성
//   PointerEvent/DragEvent 생성자는 쓰지 않는다(빈 dataTransfer 로 핸들러가 깨짐). 뷰 전환은 스킨 무관 훅
//   window.__setView 로 한다. Input 마우스를 쓰지 않으므로 Runtime.enable 로 콘솔에러도 함께 감시한다.
//   '예약' 드롭은 window.prompt 를 띄우므로 Page.enable + javascriptDialogOpening 핸들러로 응답한다.
//   양 스킨(classic/studio) 모두 — 가려짐(occlusion) 같은 스킨별 UX 결함도 본다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 페이지 컨텍스트 헬퍼(매 ev 앞에 prepend) — 보드/연재/DB/성과/캘린더 조회 + 입력 헬퍼.
const PRE = `
function colByName(n){return [].slice.call(document.querySelectorAll('.board-col')).find(function(c){var e=c.querySelector('.board-col-name');return e&&e.textContent.trim()===n});}
function colCount(n){var c=colByName(n);if(!c)return -1;var e=c.querySelector('.board-col-count');return e?parseInt(e.textContent,10):-1;}
function colNames(){return [].slice.call(document.querySelectorAll('.board-col-name')).map(function(e){return (e.textContent||'').trim()});}
function bcardsIn(n){var c=colByName(n);if(!c)return [];return [].slice.call(c.querySelectorAll('.board-card'));}
function colEmptyShown(n){var c=colByName(n);if(!c)return false;return !!c.querySelector('.board-col-empty');}
function cardTitle(el){var e=el.querySelector('.board-card-title');return e?(e.textContent||'').trim():'';}
function findCard(tag){return [].slice.call(document.querySelectorAll('.board-card')).find(function(el){return cardTitle(el)===tag});}
function allTags(pfx){return [].slice.call(document.querySelectorAll('.board-card-title')).map(function(e){return (e.textContent||'').trim()}).filter(function(t){return t.indexOf(pfx)===0});}
function centerHit(sel){var el=document.querySelector(sel);if(!el)return 'noel';var r=el.getBoundingClientRect();var x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);var top=document.elementFromPoint(x,y);if(!top)return 'nohit';return (el===top||el.contains(top)||top.contains(el))?'ok':((top.tagName||'?')+'.'+(typeof top.className==='string'?top.className:''));}
function epCard(tt){return [].slice.call(document.querySelectorAll('.serial-card')).find(function(c){var e=c.querySelector('.serial-card-title');return e&&(e.textContent||'').trim()===tt});}
function epCardAll(tt){return [].slice.call(document.querySelectorAll('.serial-card')).filter(function(c){var e=c.querySelector('.serial-card-title');return e&&(e.textContent||'').trim()===tt});}
function epCols(){return [].slice.call(document.querySelectorAll('.serial-col'));}
function epCardCol(card){var cols=epCols();for(var i=0;i<cols.length;i++){if(card&&cols[i].contains(card))return i;}return -1;}
function readyCount(){var b=document.querySelector('.serial-buffer b');return b?parseInt(b.textContent,10):-1;}
function serTab(label){var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()===label});if(b)b.click();return !!b;}
function perfRow(tt){return [].slice.call(document.querySelectorAll('.perf-table tbody tr')).find(function(tr){var c=tr.querySelector('.perf-title');return c&&(c.textContent||'').trim()===tt});}
function perfViews(tt){var tr=perfRow(tt);return tr?tr.querySelector('input.perf-input'):null;}
function calRowMatch(tt,date){return [].slice.call(document.querySelectorAll('.serial-cal-row')).some(function(r){var t=r.querySelector('.serial-cal-title'),d=r.querySelector('.serial-cal-date');return t&&d&&(t.textContent||'').trim()===tt&&(d.textContent||'').trim()===date});}
function dbRow(tt){return [].slice.call(document.querySelectorAll('.db-table tbody tr')).find(function(tr){var inp=tr.querySelector('input.db-cell');return inp&&inp.value===tt});}
function dbNum(tt){var tr=dbRow(tt);return tr?tr.querySelector('input[type=number].db-cell'):null;}
function dbPub(tt){var tr=dbRow(tt);return tr?[].slice.call(tr.querySelectorAll('select.db-cell')).find(function(s){return [].slice.call(s.options).some(function(o){return o.value==='published'})}):null;}
function dbDataRows(){return [].slice.call(document.querySelectorAll('.db-table tbody tr')).filter(function(tr){return !!tr.querySelector('input.db-cell')}).length;}
function dbEmptyShown(){var b=document.querySelector('.db-table tbody');return !!b&&/표시할 항목이 없습니다|조건에 맞는 항목이 없습니다/.test(b.textContent||'') /* 검색 중엔 원인 안내 문구(개선)로 대체됨 */;}
function dbSearch(){return [].slice.call(document.querySelectorAll('input.field')).find(function(i){return /검색/.test(i.placeholder||'')});}
function dbTh(label){return [].slice.call(document.querySelectorAll('.db-table thead th')).find(function(th){return (th.textContent||'').indexOf(label)===0});}
function thArrow(label){var th=dbTh(label);if(!th)return '';var t=th.textContent||'';return /▲/.test(t)?'▲':(/▼/.test(t)?'▼':'');}
function settingsStatusInput(){return [].slice.call(document.querySelectorAll('.modal input.field')).find(function(i){return (i.placeholder||'')==='새 상태'});}
function setVal(el,v){var p=el.tagName==='SELECT'?HTMLSelectElement.prototype:(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype);var s=Object.getOwnPropertyDescriptor(p,'value').set;s.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));}
function selVal(el,v){var s=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;s.call(el,String(v));el.dispatchEvent(new Event('change',{bubbles:true}));}
function commit(el){el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:false}));el.dispatchEvent(new Event('focusout',{bubbles:true}));}
function items(){return (window.__scriv&&window.__scriv.state().items)||-1;}
function dirty(){return !!(window.__scriv&&window.__scriv.state().dirty);}
`

// 같은 dataTransfer 목으로 네이티브 HTML5 드래그 시퀀스를 발화(소스→타깃). srcExpr/dstExpr 는 PRE 헬퍼로 요소를 찾는 식.
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

const SI = '시작 전'   // 기본 프로젝트 상태 컬럼명
const JI = '집필 중'   // 기본 프로젝트 상태 컬럼명
const LBL = '아이디어' // 기본 프로젝트 라벨명

// 미래 날짜(YYYY-MM-DD) — '예약' 날짜 입력 검증용(오늘 이후라야 'overdue' 가 아님)
const FD = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10)

async function closeWelcome(ws, sid) {
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
}
async function waitHook(ws, sid) { for (let i = 0; i < 40; i++) { await sleep(300); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }

async function runSkin(ws, skin) {
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // 콘솔/예외 감시 + 다이얼로그(prompt/alert/beforeunload) 응답기
  const errs = []
  const dlg = { type: 'cancel', text: '' } // 'accept' 일 때만 prompt 수락(text 반환)
  ws.addEventListener('message', e => {
    let d; try { d = JSON.parse(e.data) } catch { return }
    if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') errs.push('exc')
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err')
    if (d.method === 'Page.javascriptDialogOpening') {
      const ty = d.params.type
      let accept = true, promptText
      if (ty === 'prompt') { accept = dlg.type === 'accept'; promptText = dlg.text }
      const params = { accept }; if (promptText !== undefined) params.promptText = promptText
      rpc(ws, 'Page.handleJavaScriptDialog', params, sid).catch(() => { })
    }
  })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Page.enable', {}, sid)

  const ok = [], bad = []
  // 기대 위반 시 [ISSUE] 출력(실패로도 카운트). issue 미지정 시 msg 사용.
  const t = (cond, msg, issue) => {
    if (cond) ok.push('[' + skin + '] ' + msg)
    else { bad.push('[' + skin + '] ' + msg); console.log('[ISSUE] [' + skin + '] ' + (issue || msg)) }
  }

  const tok = skin.slice(0, 2) + 'QA' + Math.random().toString(36).slice(2, 6)
  const C_DRAG = tok + '-DRAG', C_EMPTY = tok + '-EMPTY', C_BUF = tok + '-BUF', C_SCH = tok + '-SCH'
  const NEWCOL = tok + '칸'

  // 0) 로드 + 훅 + 환영 닫기 + 스킨 적용
  t(await waitHook(ws, sid), '앱 로드 + 테스트 훅(__setView) 준비', '앱이 로드되지 않거나 __setView 훅이 없음(자동화/검증 불가)')
  await closeWelcome(ws, sid)
  const isStudio = await ev(ws, sid, "var a=document.querySelector('.app');return a?a.classList.contains('app-studio'):/app-studio/.test(document.body.innerHTML)")
  t(skin === 'studio' ? !!isStudio : !isStudio, '스킨 적용=' + skin + ' (app-studio=' + isStudio + ')', '요청한 스킨(' + skin + ')이 적용되지 않음')
  errs.length = 0

  // ───────────────────────── [칸반] ─────────────────────────
  await ev(ws, sid, "window.__setView('board');return 1"); await sleep(500)
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'status');return 1"); await sleep(300)
  await ev(ws, sid, "var r=[].slice.call(document.querySelectorAll('.binder-title')).find(function(x){return (x.textContent||'').trim()==='원고'});if(r)r.click();return 1"); await sleep(350)
  t(await ev(ws, sid, "return !!document.querySelector('.board')") && await ev(ws, sid, PRE + "return !!colByName('" + SI + "')"),
    '칸반 보드 마운트 + 상태 컬럼 렌더', '칸반 보드 또는 상태 컬럼이 렌더되지 않음')

  // 상식: 그룹 select 같은 주요 컨트롤이 다른 요소에 가려지면 안 된다(스킨 크롬에 클릭이 먹히지 않음).
  const hit = await ev(ws, sid, PRE + "return centerHit('.board-toolbar select')")
  t(hit === 'ok', '그룹 select 가 클릭 가능(가려지지 않음) (hit=' + hit + ')', '보드 툴바의 그룹 select 중심이 다른 요소(' + hit + ')에 가려져 클릭이 막힘')

  // 상식: '상태'를 새로 추가하면 칸반에 새 컬럼이 즉시 생겨야 하고, 그 빈 컬럼은 비었다고 안내해야 한다.
  await ev(ws, sid, "window.__setModal('settings');return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"), '프로젝트 설정 모달 열림', '설정 모달이 열리지 않음(컬럼 추가 경로 진입 불가)')
  // 상식: 모달을 열면 첫 입력으로 포커스가 가야 한다.
  const focusedInModal = await ev(ws, sid, "var a=document.activeElement;return !!(a&&a.closest&&a.closest('.modal'))")
  t(focusedInModal, '설정 모달 열면 첫 입력으로 포커스 이동', '모달을 열어도 포커스가 모달 안으로 들어오지 않음(키보드 사용자 불편)')
  await ev(ws, sid, PRE + "var i=settingsStatusInput();if(i){i.focus();setVal(i," + JSON.stringify(NEWCOL) + ");var b=i.parentElement&&i.parentElement.querySelector('button.minibtn');if(b)b.click();}return 1"); await sleep(450)
  // 상식: Esc 로 모달이 닫혀야 한다.
  await ev(ws, sid, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1"); await sleep(350)
  const escClosed = !(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"))
  t(escClosed, 'Esc 로 설정 모달 닫힘', 'Esc 를 눌러도 설정 모달이 닫히지 않음')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(300) // 안전 닫기
  const colNamesNow = JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(colNames())"))
  t(colNamesNow.indexOf(NEWCOL) >= 0, "추가한 상태가 칸반 새 컬럼('" + NEWCOL + "')으로 즉시 반영", '설정에서 상태를 추가했는데 칸반 보드에 새 컬럼이 나타나지 않음')
  t(await ev(ws, sid, PRE + "return colEmptyShown(" + JSON.stringify(NEWCOL) + ")"), "새 빈 컬럼에 '비어 있음' 안내 표시", '카드가 0개인 컬럼에 빈 상태 안내가 없어, 비었는지 깨졌는지 사용자가 알 수 없음')

  // 카드 4장 시드(고유 제목) — 칸반/연재/DB 추적용. board-col-add → 바인더 인라인 이름편집.
  const seed = async (tag) => {
    await ev(ws, sid, PRE + "var c=colByName(" + JSON.stringify(SI) + ");var b=c&&c.querySelector('.board-col-add');if(b)b.click();return 1"); await sleep(420)
    await ev(ws, sid, "var i=document.querySelector('.binder-rename');if(!i)return 0;i.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + JSON.stringify(tag) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1"); await sleep(450)
  }
  const colBeforeSeed = await ev(ws, sid, PRE + "return colCount('" + SI + "')")
  const itemsBeforeSeed = await ev(ws, sid, PRE + "return items()")
  await seed(C_DRAG); await seed(C_EMPTY); await seed(C_BUF); await seed(C_SCH)
  const colAfterSeed = await ev(ws, sid, PRE + "return colCount('" + SI + "')")
  const itemsAfterSeed = await ev(ws, sid, PRE + "return items()")
  t(colAfterSeed === colBeforeSeed + 4 && itemsAfterSeed === itemsBeforeSeed + 4,
    "컬럼 '+' 로 추가한 4장이 '" + SI + "' 칸 + 실제 문서로 영속 (컬럼 " + colBeforeSeed + '→' + colAfterSeed + ', 문서 ' + itemsBeforeSeed + '→' + itemsAfterSeed + ')',
    "컬럼 '+' 추가가 그 칸/문서 수에 정확히 반영되지 않음")
  const seenAll = await ev(ws, sid, PRE + "var t=[" + JSON.stringify(C_DRAG) + "," + JSON.stringify(C_EMPTY) + "," + JSON.stringify(C_BUF) + "," + JSON.stringify(C_SCH) + "];return t.every(function(x){return !!findCard(x)})")
  t(seenAll, '시드한 4장 모두 고유 제목 카드로 렌더', '시드한 카드가 칸반에 보이지 않음(이름편집/추가 흐름 깨짐)')

  // 상식: 컬럼 헤더의 카운트 배지는 실제 카드 수와 일치해야 한다.
  const badge = await ev(ws, sid, PRE + "return colCount('" + SI + "')")
  const real = await ev(ws, sid, PRE + "return bcardsIn('" + SI + "').length")
  t(badge === real, "'" + SI + "' 카운트 배지=실제 카드수 일치 (배지 " + badge + ' / 실제 ' + real + ')', '컬럼 카운트 배지가 실제 카드 수와 다름')

  // 상식: 카드를 다른 상태 컬럼으로 끌면 그 상태로 바뀌어야(소스 -1, 대상 +1), 그리고 카드가 사라지면 안 된다.
  const totBefore = (JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(allTags(" + JSON.stringify(tok) + "))"))).length
  const siB = await ev(ws, sid, PRE + "return bcardsIn('" + SI + "').length")
  const jiB = await ev(ws, sid, PRE + "return bcardsIn('" + JI + "').length")
  const r1 = await ev(ws, sid, dndJS("findCard(" + JSON.stringify(C_DRAG) + ")", "colByName(" + JSON.stringify(JI) + ")", "status"))
  await sleep(550)
  const siA = await ev(ws, sid, PRE + "return bcardsIn('" + SI + "').length")
  const jiA = await ev(ws, sid, PRE + "return bcardsIn('" + JI + "').length")
  const inJI = await ev(ws, sid, PRE + "return bcardsIn('" + JI + "').map(cardTitle).indexOf(" + JSON.stringify(C_DRAG) + ")>=0")
  t(String(r1).indexOf('fired') === 0 && siA === siB - 1 && jiA === jiB + 1 && inJI,
    "카드 드래그로 상태변경: '" + SI + "'-1 / '" + JI + "'+1 + 대상에 카드 존재 (SI " + siB + '→' + siA + ', JI ' + jiB + '→' + jiA + ')',
    '카드를 다른 컬럼으로 끌어도 상태가 바뀌지 않거나 카드가 옮겨지지 않음')
  const totAfter = (JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(allTags(" + JSON.stringify(tok) + "))"))).length
  t(totAfter === totBefore, '상태변경 드래그 후 내 카드 총수 불변=' + totBefore + ' (유실·중복 없음) [데이터 안전]', '드래그 도중 카드가 사라지거나 중복됨(원고 유실 위험)')
  t(await ev(ws, sid, PRE + "return dirty()") === true, '상태변경이 스토어에 반영(dirty=true, 저장 대기)', '상태변경이 스토어에 반영되지 않아 저장되지 않을 수 있음')

  // 상식: 빈 컬럼도 정상 드롭 대상이어야 한다(카드 0개라고 못 떨구면 안 됨).
  const r2 = await ev(ws, sid, dndJS("findCard(" + JSON.stringify(C_EMPTY) + ")", "colByName(" + JSON.stringify(NEWCOL) + ")", "toEmpty"))
  await sleep(550)
  const newColCnt = await ev(ws, sid, PRE + "return bcardsIn(" + JSON.stringify(NEWCOL) + ").length")
  const newEmptyGone = !(await ev(ws, sid, PRE + "return colEmptyShown(" + JSON.stringify(NEWCOL) + ")"))
  t(String(r2).indexOf('fired') === 0 && newColCnt === 1 && newEmptyGone,
    "빈 컬럼으로 드래그 → 카드 안착(1) + '비어 있음' 사라짐", '빈 컬럼이 드롭을 받지 못하거나, 카드를 넣어도 빈 안내가 남음')

  // 상식: 그룹을 라벨↔상태로 바꾸면 컬럼 세트가 교체되고, 그 선택이 기억(localStorage)되어야 한다.
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'label');return 1"); await sleep(450)
  const lsLabel = await ev(ws, sid, "return localStorage.getItem('board.groupBy')")
  const labelCols = await ev(ws, sid, PRE + "return colNames().indexOf('" + LBL + "')>=0 && colNames().indexOf('" + SI + "')<0")
  t(lsLabel === 'label' && labelCols, "그룹 토글(라벨) → 라벨 컬럼 교체 + localStorage='label' (실제=" + lsLabel + ')', '그룹을 라벨로 바꿔도 컬럼이 안 바뀌거나 선택이 저장되지 않음')
  // 상식: 그룹을 바꿔도 카드가 사라지면 안 된다(데이터 안전).
  const totRegroup = (JSON.parse(await ev(ws, sid, PRE + "return JSON.stringify(allTags(" + JSON.stringify(tok) + "))"))).length
  t(totRegroup === totBefore, '그룹 전환 후에도 내 카드 총수 불변=' + totBefore + ' (regroup 시 유실·중복 없음)', '그룹 기준을 바꾸면 일부 카드가 사라짐')
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'status');return 1"); await sleep(400)

  // ───────────────────────── [연재] ─────────────────────────
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(500)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(300)
  t(await ev(ws, sid, "return !!document.querySelector('.serial-board')") && await ev(ws, sid, PRE + "return !!epCard(" + JSON.stringify(C_BUF) + ")"),
    '연재 파이프라인 마운트 + 원고 문서가 회차 카드로 노출', '연재 파이프라인이 안 뜨거나, 원고 문서가 회차로 나타나지 않음')

  // 상식: 회차를 '완성·비축'으로 끌면 비축분(주간 분량)이 늘어야 한다.
  const rcB = await ev(ws, sid, PRE + "return readyCount()")
  await ev(ws, sid, dndJS("epCard(" + JSON.stringify(C_BUF) + ")", "epCols()[1]", "toReady")); await sleep(550)
  const colReady = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_BUF) + "))")
  const rcReady = await ev(ws, sid, PRE + "return readyCount()")
  t(colReady === 1 && rcReady === rcB + 1, "회차→'완성·비축' 드래그 → 비축분 +1 (" + rcB + '→' + rcReady + ')', "완성·비축으로 끌어도 비축분이 늘지 않음")

  // 상식: '완성'을 '발행됨'으로 끌면 발행 처리되고 비축분은 줄어야 한다.
  await ev(ws, sid, dndJS("epCard(" + JSON.stringify(C_BUF) + ")", "epCols()[3]", "toPub")); await sleep(550)
  const colPub = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_BUF) + "))")
  const rcPub = await ev(ws, sid, PRE + "return readyCount()")
  t(colPub === 3 && rcPub === rcReady - 1, "'완성'→'발행됨' 드래그 → 발행 이동 + 비축분 -1 (" + rcReady + '→' + rcPub + ')', '완성→발행 드래그가 반영되지 않거나 비축분이 그대로')
  t(await ev(ws, sid, PRE + "return epCardAll(" + JSON.stringify(C_BUF) + ").length") === 1, '연재 드래그 후 추적 회차 카드 정확히 1개(유실·중복 없음)', '연재 드래그로 회차 카드가 사라지거나 중복됨')

  // 상식: 성과 탭에 적은 수치는 탭을 옮겼다 와도 남아 있어야 한다.
  await ev(ws, sid, PRE + "return serTab('성과')"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.serial-perf')"), '성과 탭 렌더', '성과 탭이 열리지 않음')
  await ev(ws, sid, PRE + "var p=perfViews(" + JSON.stringify(C_BUF) + ");if(p){setVal(p,'4321');commit(p);}return 1"); await sleep(400)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(300)
  await ev(ws, sid, PRE + "serTab('성과');return 1"); await sleep(400)
  const perfKept = await ev(ws, sid, PRE + "var p=perfViews(" + JSON.stringify(C_BUF) + ");return p?p.value:'?'")
  t(perfKept === '4321', '성과 입력(조회수 4321)이 탭 왕복 후 잔존(영속) (실제=' + perfKept + ')', '성과 탭에 입력한 수치가 탭을 옮기면 사라짐')

  // 상식: '예약'에 떨굴 때 날짜 입력을 취소하면 아무 일도 없어야 한다(날짜 없는 유령 예약 금지).
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(350)
  const schColB = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_SCH) + "))")
  dlg.type = 'cancel'
  await ev(ws, sid, dndJS("epCard(" + JSON.stringify(C_SCH) + ")", "epCols()[2]", "schedCancel")); await sleep(600)
  const schColAfterCancel = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_SCH) + "))")
  t(schColAfterCancel === schColB && schColAfterCancel !== 2,
    "'예약' 날짜 입력 취소 → 상태 불변(유령 예약 안 생김) (col " + schColB + '→' + schColAfterCancel + ')',
    '예약 날짜를 취소했는데도 회차가 날짜 없이 예약 컬럼으로 옮겨짐(유령 예약)')

  // 상식: '예약'에 떨구고 날짜를 입력하면 예약 컬럼으로 이동하고, 캘린더에 그 날짜로 떠야 한다.
  dlg.type = 'accept'; dlg.text = FD
  await ev(ws, sid, dndJS("epCard(" + JSON.stringify(C_SCH) + ")", "epCols()[2]", "schedDate")); await sleep(650)
  const schCol = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_SCH) + "))")
  t(schCol === 2, "'예약'에 날짜 입력 → 예약 컬럼(idx2)으로 이동 (실제=" + schCol + ')', '예약 날짜를 입력해도 예약 컬럼으로 가지 않음')
  await ev(ws, sid, PRE + "serTab('발행 캘린더');return 1"); await sleep(400)
  t(await ev(ws, sid, PRE + "return calRowMatch(" + JSON.stringify(C_SCH) + "," + JSON.stringify(FD) + ")"),
    "발행 캘린더에 예약 회차가 날짜(" + FD + ')와 함께 노출', '예약했는데 발행 캘린더 일정에 그 회차/날짜가 보이지 않음')
  dlg.type = 'cancel'; dlg.text = ''

  // ───────────────────────── [DB] ─────────────────────────
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(550)
  t(await ev(ws, sid, "return !!document.querySelector('.db-table')") && await ev(ws, sid, PRE + "return !!dbRow(" + JSON.stringify(C_DRAG) + ") && !!dbNum(" + JSON.stringify(C_DRAG) + ")"),
    'DB 마운트 + 원고 회차 행/회차번호 입력칸 존재', 'DB 가 안 뜨거나, 원고 문서인데 회차번호를 입력할 수 없음')

  // 상식: DB 에서 회차번호를 고치면 연재 파이프라인 카드의 회차 표기에 전파돼야 한다.
  await ev(ws, sid, PRE + "var n=dbNum(" + JSON.stringify(C_DRAG) + ");if(n){setVal(n,'77');commit(n);}return 1"); await sleep(450)
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(450)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(350)
  const numText = await ev(ws, sid, PRE + "var c=epCard(" + JSON.stringify(C_DRAG) + ");var e=c&&c.querySelector('.serial-card-num');return e?(e.textContent||'').trim():'?'")
  t(/77/.test(String(numText)), 'DB 회차번호(77) → 연재 카드 회차표기 전파 (실제=' + numText + ')', 'DB 에서 바꾼 회차번호가 연재 카드에 반영되지 않음')

  // 상식: DB 에서 발행상태를 '발행됨'으로 바꾸면 연재 '발행됨' 컬럼으로 전파돼야 한다.
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(500)
  await ev(ws, sid, PRE + "var s=dbPub(" + JSON.stringify(C_EMPTY) + ");if(s)selVal(s,'published');return 1"); await sleep(450)
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(450)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(350)
  const pubCol = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(C_EMPTY) + "))")
  t(pubCol === 3, "DB 발행상태(발행됨) → 연재 '발행됨' 컬럼(idx3) 전파 (실제=" + pubCol + ')', 'DB 에서 발행됨으로 바꿔도 연재 파이프라인에 전파되지 않음')

  // 상식: DB 검색은 결과를 좁히고 카운트가 줄어야 하며, 일치가 없으면 '없음' 안내가 떠야 한다.
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(500)
  const rowsAll = await ev(ws, sid, PRE + "return dbDataRows()")
  await ev(ws, sid, PRE + "var s=dbSearch();if(s)setVal(s," + JSON.stringify(tok) + ");return 1"); await sleep(450)
  const rowsHit = await ev(ws, sid, PRE + "return dbDataRows()")
  const hasMine = await ev(ws, sid, PRE + "return !!dbRow(" + JSON.stringify(C_DRAG) + ")")
  t(rowsHit > 0 && rowsHit < rowsAll && hasMine, 'DB 검색이 결과를 좁힘 + 내 행 잔존 (전체 ' + rowsAll + ' → 일치 ' + rowsHit + ')', 'DB 검색이 결과를 좁히지 못함')
  await ev(ws, sid, PRE + "var s=dbSearch();if(s)setVal(s,'ZZX없는검색" + tok + "');return 1"); await sleep(450)
  t(await ev(ws, sid, PRE + "return dbEmptyShown() && dbDataRows()===0"), "DB 검색 결과 0건 → '표시할 항목이 없습니다' 빈 상태 안내", '일치 항목이 없을 때 빈 표만 보이고 안내가 없음(사용자 혼란)')
  await ev(ws, sid, PRE + "var s=dbSearch();if(s)setVal(s,'');return 1"); await sleep(400)

  // 상식: 열 머리글을 누르면 정렬되고, 다시 누르면 오름/내림이 토글(화살표 방향이 바뀜)돼야 한다.
  await ev(ws, sid, PRE + "var th=dbTh('회차');if(th)th.click();return 1"); await sleep(350)
  const arr1 = await ev(ws, sid, PRE + "return thArrow('회차')")
  await ev(ws, sid, PRE + "var th=dbTh('회차');if(th)th.click();return 1"); await sleep(350)
  const arr2 = await ev(ws, sid, PRE + "return thArrow('회차')")
  t(arr1 === '▲' && arr2 === '▼', "회차 열 정렬 토글(오름 ▲ → 내림 ▼) (실제 " + arr1 + '→' + arr2 + ')', '열 머리글을 눌러도 정렬 방향이 토글되지 않음')

  // 콘솔에러 무발생(전 조작 통틀어) — reload 전 스냅샷.
  t(errs.length === 0, '전 조작 통틀어 콘솔에러/예외 0건 (실제=' + errs.length + ')', '조작 중 콘솔에러/예외가 발생함(' + errs.length + '건)')

  // ───────────────────────── [영속] 그룹 선택은 reload 후에도 기억돼야 한다. ─────────────────────────
  await ev(ws, sid, "window.__setView('board');return 1"); await sleep(400)
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'label');return 1"); await sleep(400)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  await waitHook(ws, sid)
  await closeWelcome(ws, sid)
  await ev(ws, sid, "window.__setView('board');return 1"); await sleep(500)
  const persisted = await ev(ws, sid, "return localStorage.getItem('board.groupBy')")
  const labelColsAfterReload = await ev(ws, sid, PRE + "return colNames().indexOf('" + LBL + "')>=0 && colNames().indexOf('" + SI + "')<0")
  t(persisted === 'label' && labelColsAfterReload, "reload 후에도 그룹 선택(라벨) 기억 (localStorage=" + persisted + ')', '새로고침하면 보드 그룹 기준이 기본값으로 초기화됨(설정이 기억되지 않음)')

  await rpc(ws, 'Target.closeTarget', { targetId }).catch(() => { })
  return { ok, bad }
}

// ── 실행: 부트스트랩 타깃에 스킨 심고, 양 스킨(classic/studio) 검증 ──
;(async () => {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId: bt } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: bsid } = await rpc(ws, 'Target.attachToTarget', { targetId: bt, flatten: true })
  await sleep(2500)
  const allOk = [], allBad = []
  for (const skin of ['classic', 'studio']) {
    await ev(ws, bsid, "try{localStorage.setItem('sry:uiSkin'," + JSON.stringify(skin) + ")}catch(e){};return 1")
    let res
    try { res = await runSkin(ws, skin) }
    catch (e) { allBad.push('[' + skin + '] FATAL ' + e.message); console.log('[ISSUE] [' + skin + '] 스킨 검증 중 치명 오류: ' + e.message); continue }
    res.ok.forEach(m => allOk.push(m)); res.bad.forEach(m => allBad.push(m))
  }
  await rpc(ws, 'Target.closeTarget', { targetId: bt }).catch(() => { })
  console.log('=== 칸반·연재·DB 실사용자 QA/UX 검증(classic+studio) ===')
  allOk.forEach(m => console.log('  ✓ ' + m)); allBad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + allOk.length + ' 통과 / ' + allBad.length + ' 실패')
  ws.close(); process.exit(allBad.length ? 1 : 0)
})().catch(e => { console.log('FATAL', e.message); process.exit(2) })
