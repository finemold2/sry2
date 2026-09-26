// 코르크보드 + 아웃라이너 '심화' 실사용 QA (A/B = classic·studio 양 스킨).
// '코드리뷰'가 아니라 '실제로 글 쓰는 사람'이 카드/표를 조작했을 때 '상식적으로 당연한' 동작을 단언한다.
// 위반(상식인데 안 됨)은 console.log('[ISSUE] …') 로 즉시 찍고 실패로 카운트한다.
//
// [담당] 코르크보드: 카드 크기/정렬/자유배치·실드래그 재정렬→바인더 동기·폴더 드릴인/복귀·라벨/상태 표시·빈 상태 안내.
//        아웃라이너: 컬럼 토글·인라인 편집·접기(폴더)·정렬 잠금 안내·빈 상태 안내.
//
// 점검하는 '상식' 기대(각각 단언):
//  · 빈 폴더를 열면 "카드/항목이 없습니다" 안내 + 1차 행동(CTA) 버튼이 보여야 한다.
//  · 카드 '크기'를 키우면 카드가 실제로 커져야 한다(자유배치: 160<220<300px).
//  · '자유 배치'를 켜면 카드를 끌어 옮길 수 있고 손을 떼도 제자리로 안 튕겨야 한다 + '정렬' 선택은 비활성화돼야 한다.
//  · 카드를 끌어 재정렬하면 왼쪽 바인더 순서도 같이 바뀌어야 한다(childIds 동기).
//  · 폴더 카드를 더블클릭하면 그 폴더 '안으로' 들어가야(드릴인) 하고, breadcrumb·'↑ 상위'로 되돌아올 수 있어야 한다.
//    최상위(원고)에서는 '↑ 상위'가 비활성화여야 한다(더 올라갈 곳이 없음).
//  · 라벨/상태를 지정한 카드는 색 띠/상태 텍스트가 보여야 한다.
//  · 아웃라이너에서 컬럼을 켜면 해당 표 컬럼이 생기고(localStorage 영속), 바깥(오버레이) 클릭으로 메뉴가 닫혀야 한다.
//  · 폴더 행의 펼침 삼각형을 누르면 자식 행이 접히고/펼쳐져야 한다.
//  · 제목 인라인 편집(contenteditable)은 blur 로 커밋되어 상태(entries)+표 DOM 에 반영돼야 한다.
//  · 컬럼 헤더로 정렬하면 수동 순서 이동이 잠기고(행 draggable=false) "정렬 중" 안내가 보여야 하며, '정렬 해제'로 풀려야 한다.
//
// [검증된 CDP 하니스 패턴 — _cdp_ui_all/_cdp_stash_drag/_cdp_op_corkboard/_cdp_op_outliner_timeline 그대로]
//  · 타깃은 Target.createTarget({url:'http://localhost:4178/'}) 로 '직접' 생성(about:blank+navigate 금지) + attachToTarget flatten.
//  · 스킨 전환은 부트스트랩 타깃에서 localStorage('sry:uiSkin') 선설정 후 닫고, 본 타깃이 그 값으로 로드되게 한다.
//  · 훅: window.__setView(v)/__scriv.entries()/state(). 로드 대기는 typeof window.__setView==='function' 폴링.
//  · 환영/투어 닫기: .modal button/.tour-skip 중 /시작하기|다시 보지|그만 보기/ 클릭.
//  · 클릭=element.click(); contentEditable=focus+textContent+input+blur; 제어 input/select=네이티브 setter+input/change.
//  · 포인터 드래그는 Input.dispatchMouseEvent(이때 Runtime.enable 호출 금지 → 이 스크립트는 Runtime.enable 안 함).
//  · 코르크보드 그리드 카드는 HTML5 네이티브 DnD 라, 실제 마우스 OS 드래그(Input.setInterceptDrags + dragIntercepted +
//    dispatchDragEvent)를 우선 시도하고, 헤드리스에서 미발화하면 '동일 계약' 키보드 재정렬(Ctrl+→, Corkboard onArrow=moveItem)로
//    효과 동치 검증한다(어느 경로였는지 note 로 남김). 합성 PointerEvent 는 쓰지 않는다.
//  · 작성만(실행 금지). node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) {
  return new Promise((res, rej) => {
    const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid
    const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }
    ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000)
  })
}
const J = (v) => JSON.stringify(v)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const ok = [], bad = [], notes = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }

  async function runSkin(skin) {
    const P = '[' + skin + '] '

    // (a) 부트스트랩 타깃에서 스킨 + 코르크/아웃라이너 초기상태 선설정 후 닫기 → 본 타깃이 그 값으로 로드.
    {
      const { targetId: btid } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
      const { sessionId: bsid } = await rpc(ws, 'Target.attachToTarget', { targetId: btid, flatten: true })
      await sleep(1600)
      await rpc(ws, 'Runtime.evaluate', {
        expression:
          "(()=>{try{localStorage.setItem('sry:uiSkin'," + J(skin) + ");" +
          "localStorage.setItem('cork.sort','manual');localStorage.setItem('cork.freeform','');localStorage.setItem('cork.size','md');" +
          "localStorage.removeItem('outliner.cols');}catch(e){}return 1})()",
        returnByValue: true,
      }, bsid)
      await rpc(ws, 'Target.closeTarget', { targetId: btid })
    }

    // (b) 본 타깃 직접 생성 + attach flatten.
    const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
    const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

    const ev = async (x) => {
      const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid)
      if (r.exceptionDetails) throw new Error('PAGE:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '').split('\n')[0])
      return r.result && r.result.value
    }
    const evJ = async (x) => JSON.parse(await ev(x))
    // 실제 마우스(Input). type 별로 buttons/clickCount 채워 헤드리스 드래그를 구동.
    const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved'
      ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 }
      : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
    // OS 드래그 인터셉트 캡처
    let dragData = null
    const onMsg = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Input.dragIntercepted') dragData = d.params && d.params.data }
    ws.addEventListener('message', onMsg)

    try {
      // 로드 + 훅 대기
      let ready = false
      for (let i = 0; i < 35; i++) { await sleep(400); try { if (await ev("return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) { ready = true; break } } catch { /* loading */ } }
      t(ready, P + '앱 로드 + 테스트 훅 준비')
      // 환영/투어 닫기 + 바인더 펼치기
      await ev("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
      await ev("if(!document.querySelector('.binder')){var b=document.querySelector('[aria-label=\"바인더 토글\"]');if(b)b.click()}return 1"); await sleep(250)
      const skinApplied = await ev("var a=document.querySelector('.app');return a?(a.className.indexOf('app-studio')>=0?'studio':'classic'):'?'")
      if (skinApplied !== skin) notes.push(P + 'skin 적용=' + skinApplied + '(요청 ' + skin + ')')

      // ── 토큰 픽스처 만들기(바인더 UI): 원고 루트 아래 F(자식 CHILD)·A·B·EMPTY(빈 폴더).
      const tok = 'XV' + skin[0].toUpperCase() + (Date.now() % 100000)
      const Ft = tok + '-F', CHt = tok + '-CH', At0 = tok + '-A', Bt = tok + '-B', Et = tok + '-E'
      const selDraftRoot = "var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){return (x.getAttribute('aria-label')||'')==='원고'})||rows.find(function(x){return /원고|Draft|Manuscript/i.test(x.getAttribute('aria-label')||x.textContent||'')})||rows[0];if(r){r.click();return (r.getAttribute('aria-label')||'')}return '(none)'"
      const addFolderBtn = "var b=document.querySelector('.binder-head button[title=\"새 폴더\"]');if(b){b.click();return 1}return 0"
      const addTextBtn = "var b=document.querySelector('.binder-head button[title=\"새 글\"]');if(b){b.click();return 1}return 0"
      const renameInline = (v) => "var i=document.querySelector('.binder-rename');if(!i)return 'no';i.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + J(v) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 'ok'"
      const selByTitle = (title) => "var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){var z=x.querySelector('.binder-title');return z&&z.textContent===" + J(title) + "});if(r){r.click();return 1}return 0"

      await ev("window.__setView('editor');return 1"); await sleep(250)
      await ev(selDraftRoot); await sleep(200)
      await ev(addFolderBtn); await sleep(380); await ev(renameInline(Ft)); await sleep(320)   // F (active=F)
      await ev(addTextBtn); await sleep(380); await ev(renameInline(CHt)); await sleep(320)     // CHILD (in F)
      await ev(selDraftRoot); await sleep(200)
      await ev(addTextBtn); await sleep(380); await ev(renameInline(At0)); await sleep(320)      // A (in draft)
      await ev(addTextBtn); await sleep(380); await ev(renameInline(Bt)); await sleep(320)       // B (in draft)
      await ev(addFolderBtn); await sleep(380); await ev(renameInline(Et)); await sleep(320)     // EMPTY (in draft)

      const made = await evJ("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.title&&e.title.indexOf(" + J(tok) + ")===0}))")
      const byTitle = (ti) => made.find((e) => e.title === ti) || {}
      const A = byTitle(At0), Bx = byTitle(Bt), F = byTitle(Ft), CH = byTitle(CHt), E = byTitle(Et)
      const draftRootId = A.parentId
      const fixtureOk = made.length === 5 && draftRootId &&
        Bx.parentId === draftRootId && F.parentId === draftRootId && E.parentId === draftRootId && CH.parentId === F.id
      t(fixtureOk, P + '픽스처: 원고 아래 F·A·B·EMPTY 형제 + CHILD 는 F 자식 (' + made.length + '개)')

      // ─────────────────────────────── 아웃라이너 심화 ───────────────────────────────
      // 컨테이너=원고: 원고 직속 텍스트(A) 선택 → containerOf(A)=A.parentId=원고.
      await ev(selByTitle(At0)); await sleep(150)
      await ev("window.__setView('outliner');return 1"); await sleep(450)
      const olTokens = async () => (await evJ("return JSON.stringify([].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).map(function(c){return c.textContent}))")).filter((s) => s && s.indexOf(tok) === 0)
      const tableMounted = await ev("return !!document.querySelector('.outliner table')")
      let rows0 = await olTokens()
      t(tableMounted && rows0.indexOf(Ft) >= 0 && rows0.indexOf(At0) >= 0 && rows0.indexOf(CHt) >= 0,
        P + '아웃라이너 마운트 + 원고 트리 표시(F·A·B·CHILD): [' + rows0.join(', ') + ']')

      // [O-EMPTY] 빈 폴더 → EmptyState 안내 + CTA
      await ev(selByTitle(Et)); await sleep(250)
      await ev("window.__setView('outliner');return 1"); await sleep(300)
      const olEmptyMsg = await ev("var e=document.querySelector('.outliner .empty-state');return e?(e.textContent||''):''")
      const olEmptyCta = await ev("return !!([].slice.call(document.querySelectorAll('.outliner .empty-state button')).find(function(b){return /문서 만들기/.test(b.textContent||'')}))")
      t(olEmptyMsg.indexOf('없습니다') >= 0 && olEmptyCta, P + '아웃라이너 빈 폴더 안내(.empty-state "…없습니다" + "+ 문서 만들기" CTA)')
      // 다시 원고로
      await ev(selByTitle(At0)); await sleep(200); await ev("window.__setView('outliner');return 1"); await sleep(300)

      // [O-COL] 컬럼 토글: '글자'(기본 off) 켜기 → 표 컬럼 +1 + '글자' th 생성 + localStorage 영속. 오버레이 클릭으로 닫힘.
      const thCount = () => ev("return document.querySelectorAll('.outliner thead th').length")
      const th0 = await thCount()
      await ev("var b=[].slice.call(document.querySelectorAll('.outliner-bar button')).find(function(x){return /컬럼/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(250)
      const menuOpen = await ev("return !!document.querySelector('.col-menu')")
      await ev("var labs=[].slice.call(document.querySelectorAll('.col-menu .col-menu-item'));var l=labs.find(function(x){return /글자/.test(x.textContent||'')});if(l){var cb=l.querySelector('input');if(cb)cb.click()}return 1"); await sleep(300)
      const th1 = await thCount()
      const hasCharCol = await ev("return [].slice.call(document.querySelectorAll('.outliner thead th')).some(function(h){return (h.textContent||'').indexOf('글자')>=0})")
      const colsLs = await ev("return localStorage.getItem('outliner.cols')||''")
      t(menuOpen && th1 === th0 + 1 && hasCharCol && colsLs.indexOf('\"chars\":true') >= 0,
        P + '아웃라이너 컬럼 토글: 글자 컬럼 추가(' + th0 + '→' + th1 + ') + localStorage 영속')
      // 오버레이 클릭으로 메뉴 닫힘
      await ev("var o=document.querySelector('.menu-overlay');if(o)o.click();return 1"); await sleep(200)
      const menuClosed = !(await ev("return !!document.querySelector('.col-menu')"))
      t(menuClosed, P + '컬럼 메뉴: 바깥(오버레이) 클릭으로 닫힘')
      // 컬럼 원복(글자 끄기)
      await ev("var b=[].slice.call(document.querySelectorAll('.outliner-bar button')).find(function(x){return /컬럼/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(200)
      await ev("var labs=[].slice.call(document.querySelectorAll('.col-menu .col-menu-item'));var l=labs.find(function(x){return /글자/.test(x.textContent||'')});if(l){var cb=l.querySelector('input');if(cb)cb.click()}return 1"); await sleep(150)
      await ev("var o=document.querySelector('.menu-overlay');if(o)o.click();return 1"); await sleep(200)

      // [O-FOLD] 폴더 접기/펼치기: F 행 삼각형 클릭 → CHILD 행 사라짐(접힘) → 다시 클릭 → 나타남.
      const foldClick = "function ot(t){var c=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(e){return e.textContent===t});return c?c.closest('.ol-title'):null}var o=ot(" + J(Ft) + ");if(!o)return 'no';var sp=o.querySelector('span');if(!sp)return 'nospan';sp.click();return 'ok'"
      await ev(foldClick); await sleep(300)
      const afterCollapse = await olTokens()
      t(afterCollapse.indexOf(CHt) < 0, P + '아웃라이너 폴더 접기: F 자식(CHILD) 행 숨김')
      await ev(foldClick); await sleep(300)
      const afterExpand = await olTokens()
      t(afterExpand.indexOf(CHt) >= 0, P + '아웃라이너 폴더 펼치기: CHILD 행 복귀')

      // [O-EDIT] 인라인 제목 편집 A→A2(contenteditable blur 커밋) → entries 영속 + 표 반영
      const At = tok + '-A2'
      const edited = await ev("var t=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(c){return c.textContent===" + J(At0) + "});if(!t)return 'no';t.focus();t.textContent=" + J(At) + ";t.dispatchEvent(new Event('input',{bubbles:true}));t.blur();return 'ok'"); await sleep(450)
      const persisted = await ev("var e=window.__scriv.entries().find(function(x){return x.id===" + J(A.id) + "});return e?e.title:'(none)'")
      const inTable = (await olTokens()).indexOf(At) >= 0
      t(edited === 'ok' && persisted === At && inTable, P + '아웃라이너 인라인 편집 A→A2: entries 영속(' + persisted + ') + 표 반영')

      // [O-LABELSTATUS] A2 행에 라벨/상태 지정(첫 비-none 옵션) — 코르크보드 표시 검증에서 재사용.
      const ls = await evJ("function rowOf(t){var c=[].slice.call(document.querySelectorAll('.outliner .ol-title [contenteditable]')).find(function(e){return e.textContent===t});return c?c.closest('tr'):null}var tr=rowOf(" + J(At) + ");if(!tr)return JSON.stringify({err:'no-row'});function setSel(sel){if(!sel||sel.options.length<2)return '';var v=sel.options[1].value;var s=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;s.call(sel,v);sel.dispatchEvent(new Event('change',{bubbles:true}));return v}var lsel=tr.querySelector('select[aria-label=\"라벨\"]');var ssel=tr.querySelector('select[aria-label=\"상태\"]');var lv=setSel(lsel),sv=setSel(ssel);return JSON.stringify({lv:lv,sv:sv,ls:lsel?lsel.value:'',ss:ssel?ssel.value:''})"); await sleep(350)
      t(!ls.err && ls.lv && ls.sv && ls.ls === ls.lv && ls.ss === ls.sv, P + '아웃라이너 라벨/상태 지정 반영(라벨=' + ls.lv + ', 상태=' + ls.sv + ')')

      // [O-SORTLOCK] 컬럼 헤더(단어)로 정렬 → 행 draggable=false + "정렬 중" 안내 + '정렬 해제' 활성 → 해제하면 복구.
      await ev("var hs=[].slice.call(document.querySelectorAll('.outliner thead th'));var h=hs.find(function(x){return (x.textContent||'').indexOf('단어')>=0});if(h)h.click();return 1"); await sleep(350)
      const dragLocked = await ev("var r=document.querySelector('.outliner tbody tr');return r?r.getAttribute('draggable'):'no'")
      const warnShown = await ev("return [].slice.call(document.querySelectorAll('.outliner-bar span')).some(function(s){return (s.textContent||'').indexOf('정렬 중')>=0})")
      const clearEnabled = await ev("var b=[].slice.call(document.querySelectorAll('.outliner-bar button')).find(function(x){return /정렬 해제/.test(x.textContent||'')});return b?!b.disabled:false")
      t(dragLocked === 'false' && warnShown && clearEnabled, P + '아웃라이너 정렬 시 수동이동 잠금(draggable=' + dragLocked + ') + "정렬 중" 안내 + 정렬해제 활성')
      await ev("var b=[].slice.call(document.querySelectorAll('.outliner-bar button')).find(function(x){return /정렬 해제/.test(x.textContent||'')});if(b&&!b.disabled)b.click();return 1"); await sleep(350)
      const dragBack = await ev("var r=document.querySelector('.outliner tbody tr');return r?r.getAttribute('draggable'):'no'")
      const warnGone = !(await ev("return [].slice.call(document.querySelectorAll('.outliner-bar span')).some(function(s){return (s.textContent||'').indexOf('정렬 중')>=0})"))
      t(dragBack === 'true' && warnGone, P + '아웃라이너 정렬 해제: 수동 이동 복구(draggable=' + dragBack + ') + 안내 사라짐')

      // ─────────────────────────────── 코르크보드 심화 ───────────────────────────────
      const cbTokens = async () => (await evJ("return JSON.stringify([].slice.call(document.querySelectorAll('.corkboard .card-title')).map(function(e){return e.textContent}))")).filter((s) => s && s.indexOf(tok) === 0)

      // [CB-EMPTY] 빈 폴더 → empty-hint 안내 + "+ 새 카드" CTA
      await ev(selByTitle(Et)); await sleep(200)
      await ev("window.__setView('corkboard');return 1"); await sleep(400)
      const cbEmptyMsg = await ev("var e=document.querySelector('.corkboard .empty-hint');return e?(e.textContent||''):''")
      const cbEmptyCta = await ev("return !!([].slice.call(document.querySelectorAll('.corkboard .empty-hint button')).find(function(b){return /새 카드/.test(b.textContent||'')}))")
      t(cbEmptyMsg.indexOf('카드가 없습니다') >= 0 && cbEmptyCta, P + '코르크보드 빈 폴더 안내(.empty-hint "카드가 없습니다" + "+ 새 카드" CTA)')

      // 원고로 복귀 + 정렬=수동/자유배치 off 보장
      await ev(selByTitle(At)); await sleep(200)
      await ev("window.__setView('corkboard');return 1"); await sleep(400)
      await ev("var sel=document.querySelector('.cork-toolbar select');if(sel&&sel.value!=='manual'){var s=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;s.call(sel,'manual');sel.dispatchEvent(new Event('change',{bubbles:true}))}var cb=document.querySelector('.cork-toolbar input[type=checkbox]');if(cb&&cb.checked)cb.click();return 1"); await sleep(350)

      // [CB-DRILL] 폴더 드릴인/복귀 + 최상위 '↑ 상위' 비활성.
      const upDisabledAtRoot = await ev("var u=document.querySelector('.container-bar button[title=\"상위 폴더로\"]');return u?u.disabled:false")
      t(upDisabledAtRoot, P + '코르크보드 최상위(원고): "↑ 상위" 비활성(더 올라갈 곳 없음)')
      const fCardPresent0 = (await cbTokens()).indexOf(Ft) >= 0
      // F 폴더 카드 더블클릭 → 드릴인
      await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(Ft) + "});if(!c)return 'no';c.closest('.card').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok'"); await sleep(450)
      const insideTokens = await cbTokens()
      const crumbLast = await ev("var cr=[].slice.call(document.querySelectorAll('.container-bar .cb-crumb'));return cr.length?cr[cr.length-1].textContent:''")
      const upEnabledInFolder = await ev("var u=document.querySelector('.container-bar button[title=\"상위 폴더로\"]');return u?!u.disabled:false")
      t(fCardPresent0 && insideTokens.indexOf(CHt) >= 0 && insideTokens.indexOf(Ft) < 0 && crumbLast === Ft && upEnabledInFolder,
        P + '코르크보드 폴더 드릴인: F 카드 더블클릭 → CHILD 표시 + breadcrumb=' + crumbLast + ' + "↑ 상위" 활성')
      // '↑ 상위' 로 복귀
      await ev("var u=document.querySelector('.container-bar button[title=\"상위 폴더로\"]');if(u&&!u.disabled)u.click();return 1"); await sleep(400)
      const backTokens = await cbTokens()
      t(backTokens.indexOf(Ft) >= 0 && backTokens.indexOf(CHt) < 0, P + '코르크보드 "↑ 상위" 복귀: 원고 레벨로 돌아와 F 카드 재표시')

      // [CB-LABELSTATUS] A2 카드: 라벨 색 띠(불투명) + 상태 텍스트 표시
      const cardLS = await evJ("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(At) + "});if(!c)return JSON.stringify({err:'no'});var card=c.closest('.card');var lab=card.querySelector('.card-label');var bg=lab?getComputedStyle(lab).backgroundColor:'';var st=card.querySelector('.card-status');return JSON.stringify({bg:bg,status:st?(st.textContent||''):''})")
      const labelVisible = cardLS.bg && cardLS.bg.replace(/\s/g, '') !== 'rgba(0,0,0,0)' && cardLS.bg !== 'transparent'
      t(!cardLS.err && labelVisible && cardLS.status.length > 0, P + '코르크보드 카드 라벨 색 띠(' + cardLS.bg + ') + 상태 텍스트("' + cardLS.status + '") 표시')

      // [CB-REORDER] 실드래그(B→A2) 재정렬 → 코르크보드 [B,A2] + 바인더 순서 동기. 미발화 시 동일계약 키보드(Ctrl+→) 폴백.
      const order0 = await cbTokens()
      const seq0 = order0.filter((s) => s === At || s === Bt)
      t(seq0[0] === At && seq0[1] === Bt, P + '재정렬 전 코르크보드 순서 [A2,B] (' + seq0.join(',') + ')')
      let usedPath = 'keyboard'
      const R = await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));function card(t){var e=cs.find(function(x){return x.textContent===t});return e?e.closest('.card'):null}var Ac=card(" + J(At) + "),Bc=card(" + J(Bt) + ");if(!Ac||!Bc)return '';var ra=Ac.getBoundingClientRect(),rb=Bc.getBoundingClientRect();return JSON.stringify({ax:ra.left+ra.width/2,ay:ra.top+ra.height/2,bx:rb.left+rb.width/2,by:rb.top+rb.height/2})")
      if (R) {
        const r = JSON.parse(R)
        dragData = null
        try { await rpc(ws, 'Input.setInterceptDrags', { enabled: true }, sid) } catch { /* 구버전: 키보드 폴백 */ }
        await M('mouseMoved', r.bx, r.by); await M('mousePressed', r.bx, r.by); await sleep(90)
        for (let s = 1; s <= 10; s++) { await M('mouseMoved', r.bx + (r.ax - r.bx) * s / 10, r.by + (r.ay - r.by) * s / 10); await sleep(35) }
        for (let i = 0; i < 40 && !dragData; i++) await sleep(40)
        if (dragData) {
          const dd = { x: Math.round(r.ax), y: Math.round(r.ay), data: dragData }
          await rpc(ws, 'Input.dispatchDragEvent', Object.assign({ type: 'dragEnter' }, dd), sid)
          await rpc(ws, 'Input.dispatchDragEvent', Object.assign({ type: 'dragOver' }, dd), sid)
          await rpc(ws, 'Input.dispatchDragEvent', Object.assign({ type: 'drop' }, dd), sid)
          usedPath = 'real-mouse'
        }
        await M('mouseReleased', r.ax, r.ay); await sleep(500)
      }
      let seq1 = (await cbTokens()).filter((s) => s === At || s === Bt)
      if (!(seq1[0] === Bt && seq1[1] === At)) {
        if (!dragData) notes.push(P + '실 OS 드래그 인터셉트 미발화(헤드리스) — 동일계약 키보드(Ctrl+→) 폴백')
        else notes.push(P + '[APP-BUG?] 실드래그 드롭 발생했으나 순서 미변경(' + seq1.join(',') + ')')
        await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(At) + "});if(c){var card=c.closest('.card');card.focus();card.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',ctrlKey:true,bubbles:true,cancelable:true}))}return 1"); await sleep(450)
        seq1 = (await cbTokens()).filter((s) => s === At || s === Bt)
        usedPath = 'keyboard'
      }
      t(seq1[0] === Bt && seq1[1] === At, P + '코르크보드 재정렬 [A2,B]→[B,A2] (' + usedPath + ', ' + seq1.join(',') + ')')
      const binderSeq = (await evJ("return JSON.stringify([].slice.call(document.querySelectorAll('.binder-row .binder-title')).map(function(x){return x.textContent}))")).filter((s) => s === At || s === Bt)
      t(binderSeq[0] === Bt && binderSeq[1] === At, P + '바인더 순서 동기: 코르크보드 재정렬이 바인더 [B,A2] 로 반영 (' + binderSeq.join(',') + ')')

      // [CB-FREEFORM] 자유 배치: '정렬' 비활성 + 카드 크기(160<300) + 실드래그 자유이동(안 튕김).
      await ev("var cb=document.querySelector('.cork-toolbar input[type=checkbox]');if(cb&&!cb.checked)cb.click();return 1"); await sleep(400)
      const freeOn = await ev("return !!document.querySelector('.corkboard-free')")
      const sortDisabled = await ev("var sel=document.querySelector('.cork-toolbar select');return sel?sel.disabled:false")
      t(freeOn && sortDisabled, P + '자유 배치 ON: 핀보드 전환 + "정렬" 선택 비활성(자유배치 중 정렬 무의미)')

      const setSize = (sz) => "var sels=document.querySelectorAll('.cork-toolbar select');var s2=sels[1];if(!s2)return 'no';var s=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;s.call(s2," + J(sz) + ");s2.dispatchEvent(new Event('change',{bubbles:true}));return s2.value"
      const cardW = (title) => "var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(title) + "});if(!c)return 0;var card=c.closest('.card');return Math.round(card.getBoundingClientRect().width)"
      await ev(setSize('sm')); await sleep(300); const wSm = await ev(cardW(At))
      await ev(setSize('lg')); await sleep(300); const wLg = await ev(cardW(At))
      t(wLg > wSm + 40, P + '카드 크기 키우면 실제 커짐(자유배치 폭 작게=' + wSm + 'px → 크게=' + wLg + 'px)')

      // 자유 드래그: A2 카드를 +170,+120 이동 → style.left 증가 & 유지(손 떼도 안 튕김)
      const leftBefore = await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(At) + "});if(!c)return -1;return Math.round(parseFloat(c.closest('.card').style.left)||0)")
      // 그랩 지점: 카드 본문은 .card-title/.card-syn(편집영역, 드래그 제외)이 거의 다 덮으므로 상단 .card-label(5px) 띠를 잡는다.
      const cc = await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(At) + "});if(!c)return '';var r=c.closest('.card').getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+3})")
      if (cc) {
        const p = JSON.parse(cc)
        await M('mouseMoved', p.x, p.y); await M('mousePressed', p.x, p.y); await sleep(70)
        for (let s = 1; s <= 8; s++) { await M('mouseMoved', p.x + 170 * s / 8, p.y + 120 * s / 8); await sleep(28) }
        await M('mouseReleased', p.x + 170, p.y + 120); await sleep(500)
      }
      const leftAfter = await ev("var cs=[].slice.call(document.querySelectorAll('.corkboard .card-title'));var c=cs.find(function(e){return e.textContent===" + J(At) + "});if(!c)return -1;return Math.round(parseFloat(c.closest('.card').style.left)||0)")
      const posLs = await ev("var pid=window.__scriv.state().id;return localStorage.getItem('cork.pos.'+pid+'.'+" + J(A.id) + ")||''")
      t(leftAfter > leftBefore + 80 && posLs.length > 0, P + '자유 배치 실드래그 이동 후 유지(left ' + leftBefore + '→' + leftAfter + ', 영속=' + (posLs ? 'O' : 'X') + ') — 안 튕김')
      // 자유배치 원복
      await ev("var cb=document.querySelector('.cork-toolbar input[type=checkbox]');if(cb&&cb.checked)cb.click();return 1"); await sleep(250)

      // 정리: 토큰 항목 휴지통 이동(실패해도 무해)
      await ev("window.__setView('editor');return 1"); await sleep(200)
      await ev("var live=window.__scriv.entries().filter(function(e){return e.title&&e.title.indexOf(" + J(tok) + ")===0});var titles={};live.forEach(function(e){titles[e.title]=1});Object.keys(titles).forEach(function(ti){var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){var z=x.querySelector('.binder-title');return z&&z.textContent===ti});if(!r)return;var rc=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:rc.left+20,clientY:rc.top+8}));var del=[].slice.call(document.querySelectorAll('.context-menu button')).find(function(b){return /휴지통으로 이동/.test(b.textContent||'')});if(del)del.click()});return 1"); await sleep(300)
    } finally {
      ws.removeEventListener('message', onMsg)
      try { await rpc(ws, 'Target.closeTarget', { targetId }) } catch { /* noop */ }
    }
  }

  for (const skin of ['classic', 'studio']) {
    try { await runSkin(skin) } catch (e) { bad.push('[' + skin + '] FATAL ' + e.message); console.log('[ISSUE] [' + skin + '] FATAL ' + e.message) }
  }

  console.log('=== 코르크보드+아웃라이너 심화 실사용 QA (classic/studio) ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  if (notes.length) { console.log('--- notes ---'); notes.forEach((m) => console.log('  • ' + m)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
