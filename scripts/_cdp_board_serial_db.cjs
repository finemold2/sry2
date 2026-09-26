// 칸반/연재/DB '실동작' 세밀 QA — 사소한 컨트롤까지 '조작→사용자가 원하는 결과'로 단언한다(코드리뷰 금지).
//  대상(소스): src/components/Board.tsx, src/components/SerialDashboard.tsx, src/components/DatabaseView.tsx
//
//  검증 항목
//   [칸반] 컬럼 '+'(board-col-add)로 그 칸에 카드 추가(컬럼 카운트 +1, 총 문서 +1) / 그룹 select 라벨↔상태 토글
//          → localStorage('board.groupBy') 영속 + 컬럼 헤더가 라벨/상태 세트로 실제 교체.
//   [연재] DB 에서 만든 회차가 파이프라인에 노출 / DB '완성(ready)' 설정 → 연재 '완성·비축' 컬럼 + 비축분(readyCount) 반영 /
//          파이프라인 카드 드래그(완성→발행) → '발행됨' 컬럼으로 이동·비축분 감소 / 성과 탭 입력 후 탭 왕복 잔존.
//   [DB ] 회차번호 인라인 입력(88) → 연재 카드 '88화' 전파 / 발행 select 변경 → 연재뷰 전파 / 드래그로 바뀐 발행상태가 DB 로 역전파.
//
//  [DnD 구동 — 중요] Board/Serial 카드는 HTML5 네이티브 draggable 이다. 헤드리스 Chrome 의 실제 마우스
//   (Input.dispatchMouseEvent)는 네이티브 HTML5 드래그를 가로채 페이지로 dragstart/drop 을 전달하지 않으므로,
//   이 저장소에서 검증된 방식(같은 dataTransfer 목(mock)으로 dragstart→dragenter→dragover→drop→dragend 를
//   dispatch — React 는 이벤트 type 기준 루트 위임이라 onDragStart/onDrop 가 실제 발화)을 쓴다. 합성 PointerEvent/
//   DragEvent 생성자는 쓰지 않는다. 뷰 전환은 스킨 무관 훅 window.__setView 로 한다. 양 스킨(classic/studio) 검증.
//   (Input 미사용이므로 Runtime.enable 로 콘솔에러도 함께 감시한다.)
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 페이지 컨텍스트 헬퍼(매 ev 앞에 prepend) — 보드/연재/DB 조회 + 입력 헬퍼.
const PRE = `
function colByName(n){return [].slice.call(document.querySelectorAll('.board-col')).find(function(c){var e=c.querySelector('.board-col-name');return e&&e.textContent.trim()===n});}
function colCount(n){var c=colByName(n);if(!c)return -1;var e=c.querySelector('.board-col-count');return e?parseInt(e.textContent,10):-1;}
function colNames(){return [].slice.call(document.querySelectorAll('.board-col-name')).map(function(e){return (e.textContent||'').trim()});}
function bcardsIn(n){var c=colByName(n);if(!c)return [];return [].slice.call(c.querySelectorAll('.board-card'));}
function epCard(tt){return [].slice.call(document.querySelectorAll('.serial-card')).find(function(c){var e=c.querySelector('.serial-card-title');return e&&(e.textContent||'').trim()===tt});}
function epCardAll(tt){return [].slice.call(document.querySelectorAll('.serial-card')).filter(function(c){var e=c.querySelector('.serial-card-title');return e&&(e.textContent||'').trim()===tt});}
function epCols(){return [].slice.call(document.querySelectorAll('.serial-col'));}
function epCardCol(card){var cols=epCols();for(var i=0;i<cols.length;i++){if(card&&cols[i].contains(card))return i;}return -1;}
function readyCount(){var b=document.querySelector('.serial-buffer b');return b?parseInt(b.textContent,10):-1;}
function serTab(label){var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()===label});if(b)b.click();return !!b;}
function dbRow(tt){return [].slice.call(document.querySelectorAll('.db-table tbody tr')).find(function(tr){var inp=tr.querySelector('input.db-cell');return inp&&inp.value===tt});}
function dbNum(tt){var tr=dbRow(tt);return tr?tr.querySelector('input[type=number].db-cell'):null;}
function dbPub(tt){var tr=dbRow(tt);return tr?[].slice.call(tr.querySelectorAll('select.db-cell')).find(function(s){return [].slice.call(s.options).some(function(o){return o.value==='published'})}):null;}
function setVal(el,v){var p=el.tagName==='SELECT'?HTMLSelectElement.prototype:(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype);var s=Object.getOwnPropertyDescriptor(p,'value').set;s.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));}
function selVal(el,v){var s=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;s.call(el,String(v));el.dispatchEvent(new Event('change',{bubbles:true}));}
function commit(el){el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:false}));el.dispatchEvent(new Event('focusout',{bubbles:true}));}
function items(){return (window.__scriv&&window.__scriv.state().items)||-1;}
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

const SI = '시작 전' // 기본 프로젝트 상태 컬럼명
const LBL = '아이디어' // 기본 프로젝트 라벨명

async function runSkin(ws, skin) {
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 콘솔/예외 감시
  const errs = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push('[' + skin + '] ' + m)
  const U = skin.slice(0, 2) + '연재테스트-' + Math.random().toString(36).slice(2, 6) // 추적용 고유 회차 제목

  // 훅 준비 대기
  const waitHook = async () => { for (let i = 0; i < 40; i++) { await sleep(300); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }
  t(await waitHook(), '앱 로드 + 테스트 훅(__setView) 준비')
  // 환영/투어 닫기
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  // 스킨 적용 확인
  const isStudio = await ev(ws, sid, "var a=document.querySelector('.app');return a?a.classList.contains('app-studio'):/app-studio/.test(document.body.innerHTML)")
  t(skin === 'studio' ? !!isStudio : !isStudio, '스킨 적용=' + skin + ' (app-studio=' + isStudio + ')')
  errs.length = 0

  // ───────────────────────── [칸반] 보드 세밀 ─────────────────────────
  await ev(ws, sid, "window.__setView('board');return 1"); await sleep(500)
  t(await ev(ws, sid, "return !!document.querySelector('.board')"), '칸반 보드 뷰 마운트(.board)')
  // 그룹 기준을 '상태별'로 고정 + 컨테이너를 원고 루트로(원고 하위 텍스트가 카드로 모이도록)
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'status');return 1"); await sleep(350)
  await ev(ws, sid, "var r=[].slice.call(document.querySelectorAll('.binder-title')).find(function(x){return (x.textContent||'').trim()==='원고'});if(r)r.click();return 1"); await sleep(350)
  t(await ev(ws, sid, PRE + "return !!colByName('" + SI + "')"), "상태 컬럼 '" + SI + "' 렌더됨")

  // (1) 컬럼 '+' 추가: '시작 전' 칸에 새 문서 → 컬럼 카운트 +1, 총 문서 +1
  const colBefore = await ev(ws, sid, PRE + "return colCount('" + SI + "')")
  const itemsBefore = await ev(ws, sid, PRE + "return items()")
  await ev(ws, sid, PRE + "var c=colByName('" + SI + "');var b=c&&c.querySelector('.board-col-add');if(b)b.click();return 1"); await sleep(500)
  const colAfter = await ev(ws, sid, PRE + "return colCount('" + SI + "')")
  const itemsAfter = await ev(ws, sid, PRE + "return items()")
  t(colAfter === colBefore + 1, "컬럼 '+' 추가 → '" + SI + "' 카드 카운트 +1 (" + colBefore + '→' + colAfter + ')')
  t(itemsAfter === itemsBefore + 1, '컬럼 추가가 실제 문서 생성으로 영속 (총 항목 ' + itemsBefore + '→' + itemsAfter + ')')
  // 인라인 이름편집(renameId) 종료 — Esc 로 닫아 후속 조작 방해 방지
  await ev(ws, sid, "var i=document.querySelector('.binder-rename');if(i)i.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1"); await sleep(250)

  // (2) 그룹 라벨↔상태 토글: 라벨로 → localStorage 영속 + 라벨 컬럼으로 교체
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'label');return 1"); await sleep(450)
  const lsLabel = await ev(ws, sid, "return localStorage.getItem('board.groupBy')")
  const labelColShown = await ev(ws, sid, PRE + "return colNames().indexOf('" + LBL + "')>=0 && colNames().indexOf('" + SI + "')<0")
  t(lsLabel === 'label', "그룹 토글(라벨) → localStorage('board.groupBy')='label' (실제=" + lsLabel + ')')
  t(labelColShown, "라벨 토글 → 컬럼 헤더가 라벨 세트('" + LBL + "' 등)로 교체, 상태 컬럼 사라짐")
  // 상태로 복귀 → localStorage 'status' + 상태 컬럼 복귀
  await ev(ws, sid, PRE + "var s=document.querySelector('.board-toolbar select');if(s)selVal(s,'status');return 1"); await sleep(450)
  const lsStatus = await ev(ws, sid, "return localStorage.getItem('board.groupBy')")
  const statusColBack = await ev(ws, sid, PRE + "return colNames().indexOf('" + SI + "')>=0")
  t(lsStatus === 'status' && statusColBack, "그룹 토글(상태 복귀) → localStorage='status' + 상태 컬럼 복귀 (실제=" + lsStatus + ')')

  // ── 추적용 고유 회차 U 생성: '시작 전' 칸에 추가 후 바인더 인라인 이름편집으로 고유 제목 부여 ──
  await ev(ws, sid, PRE + "var c=colByName('" + SI + "');var b=c&&c.querySelector('.board-col-add');if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "var i=document.querySelector('.binder-rename');if(!i)return 'no-input';i.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + JSON.stringify(U) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 'ok'"); await sleep(450)

  // ───────────────────────── [연재] 생성 회차 노출 ─────────────────────────
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(500)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(300)
  t(await ev(ws, sid, "return !!document.querySelector('.serial-board')"), '연재 파이프라인 뷰 마운트(.serial-board)')
  t(await ev(ws, sid, PRE + "return !!epCard(" + JSON.stringify(U) + ")"), '원고에 추가한 문서가 연재 회차 카드로 노출')

  // ───────────────────────── [DB] 회차번호 인라인 입력 + 발행 select 변경 ─────────────────────────
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(550)
  t(await ev(ws, sid, "return !!document.querySelector('.db-table')"), '데이터베이스 뷰 마운트(.db-table)')
  t(await ev(ws, sid, PRE + "return !!dbRow(" + JSON.stringify(U) + ") && !!dbNum(" + JSON.stringify(U) + ")"), 'DB 에서 추적 회차 행 + 회차번호 입력칸(원고 문서=isEpisodic) 존재')
  // 회차번호 88 입력
  await ev(ws, sid, PRE + "var n=dbNum(" + JSON.stringify(U) + ");if(n){setVal(n,'88');commit(n);}return 1"); await sleep(450)
  // 발행 select → '완성(ready)'
  await ev(ws, sid, PRE + "var s=dbPub(" + JSON.stringify(U) + ");if(s)selVal(s,'ready');return 1"); await sleep(450)
  const pubValSet = await ev(ws, sid, PRE + "var s=dbPub(" + JSON.stringify(U) + ");return s?s.value:'?'")
  t(pubValSet === 'ready', "DB 발행 select 변경 적용(ready) (실제=" + pubValSet + ')')

  // ── DB→연재 전파: 회차번호/발행상태가 파이프라인에 반영 ──
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(500)
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(350)
  const numText = await ev(ws, sid, PRE + "var c=epCard(" + JSON.stringify(U) + ");var e=c&&c.querySelector('.serial-card-num');return e?(e.textContent||'').trim():'?'")
  t(/88/.test(String(numText)), 'DB 회차번호(88) → 연재 카드 회차표기 전파 (실제=' + numText + ')')
  const colReady = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(U) + "))")
  t(colReady === 1, "DB 발행상태(완성) → 연재 '완성·비축' 컬럼(idx1)으로 전파 (실제 idx=" + colReady + ')')
  const rcReady = await ev(ws, sid, PRE + "return readyCount()")
  t(rcReady >= 1, '비축분(readyCount) 표시 반영 (완성 회차 ' + rcReady + '화)')

  // ───────────────────────── [연재] 성과 탭 입력 + 탭 왕복 잔존 ─────────────────────────
  await ev(ws, sid, PRE + "return serTab('성과')"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.serial-perf')"), '성과 탭 렌더(.serial-perf)')
  await ev(ws, sid, PRE + "var p=document.querySelector('.perf-input');if(p){setVal(p,'1234');commit(p);}return 1"); await sleep(400)
  // 탭 왕복(성과→파이프라인→성과) 후 첫 행 입력값 잔존
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(300)
  await ev(ws, sid, PRE + "serTab('성과');return 1"); await sleep(400)
  const perfPersist = await ev(ws, sid, "var p=document.querySelector('.perf-input');return p?p.value:'?'")
  t(perfPersist === '1234', '성과 입력(조회수 1234)이 탭 왕복 후 잔존(영속) (실제=' + perfPersist + ')')

  // ───────────────────────── [연재] 파이프라인 카드 드래그(완성→발행) ─────────────────────────
  await ev(ws, sid, PRE + "serTab('파이프라인');return 1"); await sleep(400)
  const rcBeforeDrag = await ev(ws, sid, PRE + "return readyCount()")
  const colBeforeDrag = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(U) + "))")
  const rDnd = await ev(ws, sid, dndJS("epCard(" + JSON.stringify(U) + ")", "epCols()[3]", "ready2published")); await sleep(600)
  t(String(rDnd).indexOf('fired') === 0, '완성→발행 드래그 발화 (' + rDnd + ')')
  const colAfterDrag = await ev(ws, sid, PRE + "return epCardCol(epCard(" + JSON.stringify(U) + "))")
  t(colBeforeDrag === 1 && colAfterDrag === 3, "드래그로 카드가 '발행됨' 컬럼(idx3)으로 이동 (" + colBeforeDrag + '→' + colAfterDrag + ')')
  const rcAfterDrag = await ev(ws, sid, PRE + "return readyCount()")
  t(rcAfterDrag === rcBeforeDrag - 1, '발행 처리로 비축분(readyCount) 1 감소 (' + rcBeforeDrag + '→' + rcAfterDrag + ')')
  // 데이터 안전: 드래그 후에도 추적 카드는 정확히 1개(유실/중복 없음)
  t(await ev(ws, sid, PRE + "return epCardAll(" + JSON.stringify(U) + ").length") === 1, '드래그 후 추적 회차 카드 정확히 1개(유실·중복 없음)')

  // ── 연재→DB 역전파: 드래그로 바뀐 발행상태('발행됨')가 DB select 에 반영 ──
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(550)
  const pubBack = await ev(ws, sid, PRE + "var s=dbPub(" + JSON.stringify(U) + ");return s?s.value:'?'")
  t(pubBack === 'published', '연재 드래그로 바뀐 발행상태가 DB 발행 select 로 역전파(published) (실제=' + pubBack + ')')

  // 콘솔에러 무발생(전 조작 통틀어)
  t(errs.length === 0, '전 조작 통틀어 콘솔에러/예외 0건 (실제=' + errs.length + ')')

  await rpc(ws, 'Target.closeTarget', { targetId }).catch(() => {})
  return { ok, bad }
}

// ── 실행: 부트스트랩 타깃에 스킨 심고, 양 스킨 검증 ──
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
    catch (e) { allBad.push('[' + skin + '] FATAL ' + e.message); continue }
    res.ok.forEach(m => allOk.push(m)); res.bad.forEach(m => allBad.push(m))
  }
  await rpc(ws, 'Target.closeTarget', { targetId: bt }).catch(() => {})
  console.log('=== 칸반/연재/DB 실동작 세밀 검증(classic+studio) ===')
  allOk.forEach(m => console.log('  ✓ ' + m)); allBad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + allOk.length + ' 통과 / ' + allBad.length + ' 실패')
  ws.close(); process.exit(allBad.length ? 1 : 0)
})().catch(e => { console.log('FATAL', e.message); process.exit(2) })
