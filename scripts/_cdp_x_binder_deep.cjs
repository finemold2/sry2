// 바인더 '심화' 실사용 QA — 코드리뷰가 아니라 '글 쓰는 사람이 바인더를 진짜로 만진다'는 가정으로
// 새 글/폴더·자동 포커스·이름변경(빈 이름 방어)·Esc 취소·위/아래 이동(경계 no-op)·HTML5 드래그 재배치/폴더로 드롭·
// 다중선택(Ctrl 토글·Shift 범위)·폴더로 묶기/그룹 해제·복제(본문 동반)·휴지통→복원(원위치+본문 보존, 데이터 안전)·
// 접힘 상태(자식 숨김)·검색 빈 상태 안내·컨텍스트메뉴 비가림 을 실제 마우스/키보드/드래그 이벤트로 조작해 검증한다.
// '상식적으로 당연한데 안 되는 것'은 위반 시 [ISSUE] 로 출력(실패로 카운트). 양 스킨(classic/studio).
// 콘솔에러 캡처용으로 Runtime.enable 사용(클릭/키/합성 DragEvent 만 쓰고 Input 포인터 드래그는 안 쓰므로 안전).
// 작성 전용 — 실행은 하니스가. node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const J = (v) => JSON.stringify(v)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)

  const ok = [], bad = []
  // 위반(=실패)은 [ISSUE] 로도 출력해 '당연한데 안 되는 것'을 눈에 띄게 한다.
  const t = (c, m) => { (c ? ok : bad).push(m); if (!c) console.log('[ISSUE] ' + m) }

  const E = (x) => ev(ws, sid, x)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }
  const closeWelcome = () => E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")
  const ensureBinder = async () => {
    if (await E("return !!document.querySelector('.binder')")) return true
    await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();return 1"); await sleep(300)
    return await E("return !!document.querySelector('.binder')")
  }
  const setView = (v) => E("window.__setView(" + J(v) + ");return 1")
  const setSearch = (q) => E("var inp=document.querySelector('.search-bar input'); if(!inp)return 'NOIN'; var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp," + J(q) + "); inp.dispatchEvent(new Event('input',{bubbles:true})); return 'OK';")

  // ---- 상태 조회(엔트리/DOM) ----
  const stateActive = () => E("return window.__scriv.state().activeId")
  const entry = async (title) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.title===" + J(title) + "})[0]||null)"))
  const entryById = async (id) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.id===" + J(id) + "})[0]||null)"))
  const exists = (title) => E("return window.__scriv.entries().some(function(e){return e.title===" + J(title) + "})")
  const bodyOf = (id) => E("return window.__scriv.bodyOf(" + J(id) + ")||''")
  const domLabels = async () => JSON.parse(await E("return JSON.stringify([].slice.call(document.querySelectorAll('.binder-row')).map(function(r){return r.getAttribute('aria-label')}))"))
  const selectedLabels = async () => JSON.parse(await E("return JSON.stringify([].slice.call(document.querySelectorAll('.binder-row.selected')).map(function(r){return r.getAttribute('aria-label')}))"))
  const rowExists = (label) => E("return [].slice.call(document.querySelectorAll('.binder-row')).some(function(r){return r.getAttribute('aria-label')===" + J(label) + "})")
  const rowAttr = (label, attr) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); return r?String(r.getAttribute(" + J(attr) + ")):'NOROW';")
  const activeIsRename = () => E("var a=document.activeElement; return !!(a&&a.classList&&a.classList.contains('binder-rename'));")

  // ---- 조작 ----
  const addNew = (kind) => E("var t=" + J(kind === 'folder' ? '새 폴더' : '새 글') + ";var b=[].slice.call(document.querySelectorAll('.binder button')).find(function(x){return (x.getAttribute('title')||'')===t});if(!b)return 'NOBTN'; b.click(); return 'OK';")
  const nameInline = (name) => E("var inp=document.querySelector('.binder-rename'); if(!inp) return 'NOINPUT';var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(inp," + J(name) + "); inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 'OK';")
  const create = async (kind, name) => { await addNew(kind); await sleep(340); const r = await nameInline(name); await sleep(280); return r }
  const clickRow = (label, opts) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "});if(!r)return 'NOROW'; r.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:" + (opts && opts.ctrl ? 'true' : 'false') + ",shiftKey:" + (opts && opts.shift ? 'true' : 'false') + "})); return 'OK';")
  const keyRow = (label, key, opts) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "});if(!r)return 'NOROW'; r.focus();r.dispatchEvent(new KeyboardEvent('keydown',{key:" + J(key) + ",bubbles:true,altKey:" + (opts && opts.alt ? 'true' : 'false') + ",ctrlKey:" + (opts && opts.ctrl ? 'true' : 'false') + "})); return 'OK';")
  const toggleDisc = (label) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); if(!r)return 'NOROW'; var d=r.querySelector('.disclosure'); if(d)d.click(); return 'OK';")
  const expandTrash = () => E("var tr=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return r.getAttribute('aria-label')==='휴지통'}); if(tr&&tr.getAttribute('aria-expanded')==='false'){var d=tr.querySelector('.disclosure'); if(d)d.click();} return 1;")

  const openCtxLabel = async (label) => { const r = await E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); if(!r)return 'NOROW'; var c=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(c.left+12),clientY:Math.round(c.top+8)})); return 'OK';"); await sleep(240); return r }
  const openCtxSelected = async () => { const r = await E("var r=document.querySelector('.binder-row.selected'); if(!r)return 'NOROW'; var c=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(c.left+12),clientY:Math.round(c.top+8)})); return 'OK';"); await sleep(240); return r }
  const clickMenu = async (text, contains) => { const r = await E("var btns=[].slice.call(document.querySelectorAll('.context-menu button')); var w=" + J(text) + "; var b=btns.find(function(x){return (x.textContent||'').trim()===w}); if(!b&&" + (contains ? 'true' : 'false') + ")b=btns.find(function(x){return (x.textContent||'').trim().indexOf(w)>=0}); if(!b)return 'NOITEM:'+btns.map(function(x){return (x.textContent||'').trim()}).join('|'); b.click(); return 'OK';"); await sleep(300); return r }
  const ctxAction = async (label, text, contains) => { const o = await openCtxLabel(label); if (o !== 'OK') return o; return clickMenu(text, contains) }
  const closeMenus = () => E("document.body.click(); return 1")

  // ---- HTML5 드래그 시뮬레이션(바인더는 네이티브 DnD) — 같은 DataTransfer 로 dragstart→over→drop ----
  // frac: 타깃 행 안의 세로 위치(0=위쪽=before, 0.5=가운데(폴더=into), 1=아래=after).
  const dnd = (srcLabel, tgtLabel, frac) => E(
    "var rows=[].slice.call(document.querySelectorAll('.binder-row'));" +
    "var s=rows.find(function(r){return r.getAttribute('aria-label')===" + J(srcLabel) + "});" +
    "var g=rows.find(function(r){return r.getAttribute('aria-label')===" + J(tgtLabel) + "});" +
    "if(!s||!g)return 'NOROW';" +
    "var dt=new DataTransfer();" +
    "s.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "var r=g.getBoundingClientRect();var y=r.top+r.height*" + frac + ";var x=r.left+r.width/2;" +
    "g.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));" +
    "g.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));" +
    "g.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:x,clientY:y}));" +
    "s.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:dt}));" +
    "return 'OK';")

  async function runSkin(skin) {
    const P = '[' + skin + '] '
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await E("try{localStorage.setItem('sry:uiSkin'," + J(skin) + ")}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    const ready = await waitHook()
    t(ready, P + '앱 로드 + 테스트 훅 준비')
    if (!ready) return
    // 파괴적 확인창(휴지통/영구삭제) 자동 승인, prompt 는 취소로(컬렉션 모달 등 방해 차단).
    await E("window.confirm=function(){return true}; window.prompt=function(){return null}; return 1")
    await closeWelcome(); await sleep(300)
    t(await ensureBinder(), P + '바인더 패널 표시')
    errs.length = 0
    const tag = skin.slice(0, 2) + '-' + Math.random().toString(36).slice(2, 7)
    const TG = tag + '-TG', A = tag + '-A', B = tag + '-B', C = tag + '-C', TF = tag + '-TF'
    const R = tag + '-R', RX = tag + '-RX', D = tag + '-D', K = tag + '-K'

    // ── 새 폴더 생성(+폴더) + 이름 커밋 ──────────────────────────────
    await create('folder', TG)
    const eTG = await entry(TG)
    t(!!eTG && eTG.type === 'folder', P + '＋폴더 → 새 폴더 생성 + 이름 커밋 반영(' + (eTG ? eTG.type : '없음') + ')')
    const TGid = eTG ? eTG.id : ''

    // ── 새 글: '활성 폴더 안에' 생기고, 생성 즉시 첫 입력(인라인 이름)에 포커스 ──
    await clickRow(TG); await sleep(150) // 폴더를 활성화 → 새 글이 그 안에 생겨야 함
    await addNew('text'); await sleep(360)
    t(await E("return !!document.querySelector('.binder-rename')"), P + '＋글 직후 인라인 이름 입력 표시(바로 명명 유도)')
    t(await activeIsRename(), P + '＋글 직후 첫 입력에 자동 포커스(클릭 없이 바로 타이핑)')
    await nameInline(A); await sleep(280)
    const eA = await entry(A)
    t(!!eA && eA.type === 'text', P + '＋글 → 새 텍스트 생성')
    t(!!eA && eA.parentId === TGid, P + '활성 폴더 안에 새 글 생성(부모=' + TG + ')')
    await create('text', B); await create('text', C)
    const eB = await entry(B), eC = await entry(C)
    t(!!eB && !!eC && eA.parentId === eB.parentId && eB.parentId === eC.parentId, P + 'A·B·C 동일 폴더 형제로 연속 생성')
    const Aid = eA ? eA.id : '', Bid = eB ? eB.id : '', Cid = eC ? eC.id : ''

    // ── 키보드 내비: ↓/↑ 선택 이동, Enter(텍스트→에디터) ─────────────
    await setView('corkboard'); await sleep(150)
    await clickRow(A); await sleep(120)
    t((await stateActive()) === Aid, P + '행 클릭 → 활성 A')
    await keyRow(A, 'ArrowDown'); await sleep(160)
    t((await stateActive()) === Bid, P + '↓ 키 → 다음 항목(B)로 선택 이동')
    await keyRow(B, 'ArrowUp'); await sleep(160)
    t((await stateActive()) === Aid, P + '↑ 키 → 이전 항목(A)로 선택 복귀')
    await keyRow(A, 'Enter'); await sleep(220)
    t((await E("return !!document.querySelector('.paper')")) && (await stateActive()) === Aid, P + 'Enter(텍스트) → 에디터(.paper) 열림')

    // ── 다중선택: Ctrl 토글(추가/해제) ──────────────────────────────
    await clickRow(A); await sleep(100) // 단일 선택 리셋
    await clickRow(C, { ctrl: true }); await sleep(140)
    let sel = await selectedLabels()
    t(sel.indexOf(A) >= 0 && sel.indexOf(C) >= 0, P + 'Ctrl+클릭 → 선택 추가(A·C 동시 선택)')
    await clickRow(C, { ctrl: true }); await sleep(140)
    sel = await selectedLabels()
    t(sel.indexOf(C) < 0 && sel.indexOf(A) >= 0, P + 'Ctrl+클릭 재차 → 선택 토글 해제(C 빠짐, A 유지)')

    // ── 다중선택: Shift 범위 선택 ───────────────────────────────────
    await clickRow(A); await sleep(100)
    await clickRow(C, { shift: true }); await sleep(160)
    sel = await selectedLabels()
    t(sel.indexOf(A) >= 0 && sel.indexOf(B) >= 0 && sel.indexOf(C) >= 0, P + 'Shift+클릭 → 범위 선택(A~C 전부 = ' + sel.length + '개)')

    // ── 위/아래 이동: Alt+↓ / Alt+↑ + 경계 no-op ───────────────────
    const before1 = await domLabels()
    await clickRow(B); await sleep(100)
    await keyRow(B, 'ArrowDown', { alt: true }); await sleep(200)
    const after1 = await domLabels()
    t(before1.indexOf(B) < before1.indexOf(C) && after1.indexOf(B) > after1.indexOf(C), P + 'Alt+↓ → 형제 순서 아래로(B가 C 뒤)')
    await keyRow(B, 'ArrowUp', { alt: true }); await sleep(200)
    const after2 = await domLabels()
    t(after2.indexOf(B) < after2.indexOf(C), P + 'Alt+↑ → 형제 순서 위로 복귀(B가 C 앞)')
    const beforeEdge = await domLabels()
    await clickRow(C); await sleep(100)
    await keyRow(C, 'ArrowDown', { alt: true }); await sleep(200) // C 가 마지막 형제 → 무동작이어야
    const afterEdge = await domLabels()
    t(JSON.stringify(beforeEdge) === JSON.stringify(afterEdge) && errs.length === 0, P + '마지막 형제 Alt+↓ → 무동작(순서 불변·무에러)')

    // ── 드래그 재배치(네이티브 DnD): A 를 C 뒤로 ────────────────────
    const dBefore = await domLabels()
    t((await dnd(A, C, 0.8)) === 'OK', P + 'A 행을 C 행 하단으로 드래그')
    await sleep(300)
    const dAfter = await domLabels()
    t(dBefore.indexOf(A) < dBefore.indexOf(C) && dAfter.indexOf(A) > dAfter.indexOf(C), P + '드래그 재배치 → A가 C 뒤로 이동(놓은 자리에 안착)')

    // ── 드래그로 '폴더 안에' 드롭(into) ─────────────────────────────
    await clickRow(C); await sleep(100) // 활성 텍스트 → TF 가 TG 하위에 생기도록
    await create('folder', TF)
    const eTF = await entry(TF)
    t((await dnd(B, TF, 0.5)) === 'OK', P + 'B 행을 폴더(TF) 가운데로 드래그')
    await sleep(300)
    t(!!eTF && (await entryById(Bid)).parentId === eTF.id, P + '폴더 안으로 드롭 → 자식으로 편입(부모=TF)')

    // ── 폴더로 묶기(다중선택 → 그룹) ────────────────────────────────
    await clickRow(C); await sleep(100); await clickRow(A, { ctrl: true }); await sleep(140)
    t((await openCtxLabel(A)) === 'OK', P + '선택 유지한 채 우클릭(컨텍스트메뉴)')
    t((await clickMenu('묶기', true)) === 'OK', P + '메뉴 "선택 N개 묶기" 클릭')
    await sleep(300)
    const gA = await entryById(Aid), gC = await entryById(Cid)
    const grpId = gA ? gA.parentId : null
    const grpFolder = grpId ? await entryById(grpId) : null
    t(!!gA && !!gC && gA.parentId === gC.parentId && grpId !== TGid && grpFolder && grpFolder.type === 'folder', P + '폴더로 묶기 → 새 폴더가 A·C 부모로')

    // ── 그룹 해제 ───────────────────────────────────────────────────
    t((await openCtxSelected()) === 'OK', P + '새 그룹 폴더 우클릭(선택된 행)')
    t((await clickMenu('그룹 해제')) === 'OK', P + '메뉴 "그룹 해제" 클릭')
    await sleep(300)
    const uA = await entryById(Aid)
    t(!!uA && uA.parentId === TGid && (grpId ? !(await entryById(grpId)) : true), P + '그룹 해제 → 자식 원부모(TG) 복귀 + 폴더 제거')

    // ── 복제: 본문까지 함께 복제(데이터 안전) ───────────────────────
    await clickRow(C); await sleep(100)
    await create('text', D)
    const eD = await entry(D); const Did = eD ? eD.id : ''
    await clickRow(D); await sleep(120)
    const DUPMARK = 'DUP' + Math.random().toString(36).slice(2, 7)
    await E("window.__scriv.setBody(" + J('{\\\\rtf1\\\\ansi ' + DUPMARK + '의 원본 본문}') + "); return 1"); await sleep(200)
    t((await ctxAction(D, '복제')) === 'OK', P + '우클릭 메뉴 "복제" 클릭')
    await sleep(280)
    const eDup = await entry(D + ' 사본')
    t(!!eDup, P + '복제본 생성(' + D + ' 사본)')
    const dupBody = eDup ? await bodyOf(eDup.id) : ''
    t(dupBody.indexOf(DUPMARK) >= 0, P + '복제본에 원본 본문까지 복사됨(빈 사본 아님 — 데이터 안전)')

    // ── 휴지통 이동 → 복원: 원위치 + 본문 보존(데이터 안전) ─────────
    await clickRow(D); await sleep(100)
    await create('text', K)
    const eK = await entry(K); const Kid = eK ? eK.id : ''
    await clickRow(K); await sleep(120)
    const TRMARK = 'TRH' + Math.random().toString(36).slice(2, 7)
    await E("window.__scriv.setBody(" + J('{\\\\rtf1\\\\ansi ' + TRMARK + ' 소중한 원고 한 줄}') + "); return 1"); await sleep(200)
    t((await ctxAction(K, '휴지통으로 이동')) === 'OK', P + '우클릭 메뉴 "휴지통으로 이동" 클릭')
    await sleep(280)
    const tK = await entryById(Kid)
    t(!!tK && tK.parentId === 'root-trash', P + '휴지통으로 이동 → parentId=root-trash(되돌릴 수 있는 삭제)')
    t((await stateActive()) !== Kid, P + '휴지통 항목은 활성 해제(닫혀 편집 차단)')
    await expandTrash(); await sleep(220)
    t((await ctxAction(K, '휴지통에서 복원')) === 'OK', P + '우클릭 메뉴 "휴지통에서 복원" 클릭')
    await sleep(300)
    const rK = await entryById(Kid)
    t(!!rK && rK.parentId === TGid, P + '복원 → 원래 폴더(TG)로 복귀(root-draft 로 안 흘러감)')
    t((await bodyOf(Kid)).indexOf(TRMARK) >= 0, P + '복원된 글의 본문 그대로 보존(원고 무손실 — 데이터 안전)')

    // ── 이름변경: 반영 / 빈 이름 방어 / Esc 취소 ────────────────────
    await clickRow(C); await sleep(100); await create('text', R)
    t(await exists(R), P + '이름변경 대상 R 생성(생성 시 명명 커밋)')
    await keyRow(R, 'F2'); await sleep(220)
    t(await E("return !!document.querySelector('.binder-rename')") && await activeIsRename(), P + 'F2 → 인라인 이름 편집 + 입력 포커스')
    await nameInline(RX); await sleep(260)
    t((await exists(RX)) && !(await exists(R)), P + '이름변경 → 새 이름 반영(R→RX)')
    // 빈(공백) 이름으로 커밋 시도 → 제목이 지워지면 안 된다(데이터 안전)
    await keyRow(RX, 'F2'); await sleep(200)
    await nameInline('   '); await sleep(240)
    t(await exists(RX), P + '공백만 입력 후 Enter → 기존 제목 보존(이름 증발 방지)')
    // Esc 로 편집 취소 → 입력값이 반영되면 안 된다
    await keyRow(RX, 'F2'); await sleep(200)
    await E("var inp=document.querySelector('.binder-rename'); if(inp){var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp,'ESC_SHOULD_NOT_APPLY'); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));} return 1"); await sleep(240)
    t((await exists(RX)) && !(await exists('ESC_SHOULD_NOT_APPLY')), P + 'Esc → 이름변경 취소(입력값 미반영)')

    // ── 접힘 상태: 폴더 접으면 자식 행이 사라져야(트리 관습) ─────────
    await setView('editor'); await sleep(120)
    t(await rowExists(D), P + '(사전) 폴더 펼침 상태에서 자식(D) 행 보임')
    await toggleDisc(TG); await sleep(220)
    t((await rowAttr(TG, 'aria-expanded')) === 'false' && !(await rowExists(D)), P + '폴더 접기 → 자식 행 숨김(aria-expanded=false)')
    await toggleDisc(TG); await sleep(220)
    t((await rowAttr(TG, 'aria-expanded')) === 'true' && (await rowExists(D)), P + '폴더 펼치기 → 자식 행 복귀')

    // ── 빈 상태 안내: 검색 무결과 시 '결과 없음' ────────────────────
    await setSearch('zzznomatch' + Math.random().toString(36).slice(2, 6)); await sleep(300)
    t(await E("var tr=document.querySelector('.binder-tree'); return !!tr && /결과 없음/.test(tr.textContent||'');"), P + '검색 무결과 → "결과 없음" 빈 상태 안내 표시')
    await setSearch(''); await sleep(220)

    // ── 컨텍스트메뉴 비가림: 첫 항목이 다른 요소에 가려지면 안 됨 ────
    t((await openCtxLabel(TG)) === 'OK', P + '폴더 우클릭 → 컨텍스트메뉴 열림')
    t(await E("var b=document.querySelector('.context-menu button'); if(!b)return false; var r=b.getBoundingClientRect(); var el=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)); return !!(el&&el.closest('.context-menu'));"), P + '컨텍스트메뉴 항목이 클릭 가능(다른 요소에 안 가려짐)')
    await closeMenus(); await sleep(150)

    // ── 잔존(뷰 왕복에도 영속) + 조작 중 콘솔에러 0 ─────────────────
    await setView('outliner'); await sleep(180); await setView('editor'); await sleep(180)
    t((await exists(A)) && (await exists(RX)) && (await exists(D + ' 사본')) && (await exists(K)), P + '뷰 왕복 후 항목 잔존(영속)')
    t(errs.length === 0, P + '바인더 조작 전체에서 콘솔에러 0 (' + errs.length + ')')
  }

  for (const skin of ['classic', 'studio']) {
    try { await runSkin(skin) } catch (e) { t(false, '[' + skin + '] 예외: ' + (e && e.message)) }
  }

  console.log('=== 바인더 심화 실사용 QA(양 스킨) ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
