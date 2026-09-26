// 바인더 전(全) 동작 실사용 검증 — 우클릭 컨텍스트메뉴 전 항목(이름 바꾸기·복제·폴더로 묶기·그룹 해제·
// 텍스트/폴더 변환·휴지통으로·휴지통에서 복원)·＋글/＋폴더·키보드 내비(방향키·Enter·F2·Delete·Alt±이동)를
// 실제 마우스/키보드 이벤트로 조작하고 __scriv.entries()/바인더 DOM 으로 효과를 확인한다. 양 스킨(classic/studio).
// 콘솔에러 캡처(클릭/키 테스트라 Runtime.enable OK; 드래그 미사용). 작성 전용 — 실행은 하니스가.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }
const J = (v) => JSON.stringify(v)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // ---- 페이지 헬퍼(모두 방어적으로 문자열/불리언 반환) ----
  const E = (x) => ev(ws, sid, x)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }
  const closeWelcome = () => E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")
  const ensureBinder = async () => {
    if (await E("return !!document.querySelector('.binder')")) return true
    await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();return 1"); await sleep(300)
    return await E("return !!document.querySelector('.binder')")
  }
  const setView = (v) => E("window.__setView(" + J(v) + ");return 1")
  const activeId = () => E("return window.__scriv.state().activeId")
  const entry = async (title) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.title===" + J(title) + "})[0]||null)"))
  const entryById = async (id) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.id===" + J(id) + "})[0]||null)"))
  const exists = (title) => E("return window.__scriv.entries().some(function(e){return e.title===" + J(title) + "})")
  const domLabels = async () => JSON.parse(await E("return JSON.stringify([].slice.call(document.querySelectorAll('.binder-row')).map(function(r){return r.getAttribute('aria-label')}))"))

  const addNew = (kind) => E(
    "var t=" + J(kind === 'folder' ? '새 폴더' : '새 글') + ";" +
    "var b=[].slice.call(document.querySelectorAll('.binder button')).find(function(x){return (x.getAttribute('title')||'')===t});" +
    "if(!b)return 'NOBTN'; b.click(); return 'OK';")
  const nameInline = (name) => E(
    "var inp=document.querySelector('.binder-rename'); if(!inp) return 'NOINPUT';" +
    "var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;" +
    "set.call(inp," + J(name) + "); inp.dispatchEvent(new Event('input',{bubbles:true}));" +
    "inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 'OK';")
  const create = async (kind, name) => { await addNew(kind); await sleep(340); const r = await nameInline(name); await sleep(280); return r }

  const clickRow = (label, ctrl) => E(
    "var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "});" +
    "if(!r)return 'NOROW'; r.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:" + (ctrl ? 'true' : 'false') + "})); return 'OK';")
  const keyRow = (label, key, opts) => E(
    "var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "});" +
    "if(!r)return 'NOROW'; r.focus();" +
    "r.dispatchEvent(new KeyboardEvent('keydown',{key:" + J(key) + ",bubbles:true,altKey:" + (opts && opts.alt ? 'true' : 'false') + ",ctrlKey:" + (opts && opts.ctrl ? 'true' : 'false') + "})); return 'OK';")
  const openCtxLabel = async (label) => { const r = await E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); if(!r)return 'NOROW'; var c=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(c.left+12),clientY:Math.round(c.top+8)})); return 'OK';"); await sleep(240); return r }
  const openCtxSelected = async () => { const r = await E("var r=document.querySelector('.binder-row.selected'); if(!r)return 'NOROW'; var c=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(c.left+12),clientY:Math.round(c.top+8)})); return 'OK';"); await sleep(240); return r }
  const clickMenu = async (text, contains) => { const r = await E("var btns=[].slice.call(document.querySelectorAll('.context-menu button')); var w=" + J(text) + "; var b=btns.find(function(x){return (x.textContent||'').trim()===w}); if(!b&&" + (contains ? 'true' : 'false') + ")b=btns.find(function(x){return (x.textContent||'').trim().indexOf(w)>=0}); if(!b)return 'NOITEM:'+btns.map(function(x){return (x.textContent||'').trim()}).join('|'); b.click(); return 'OK';"); await sleep(300); return r }
  const ctxAction = async (label, text, contains) => { const o = await openCtxLabel(label); if (o !== 'OK') return o; return clickMenu(text, contains) }

  async function runSkin(skin) {
    const P = '[' + skin + '] '
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await E("try{localStorage.setItem('sry:uiSkin'," + J(skin) + ")}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    const ready = await waitHook()
    t(ready, P + '앱 로드 + 테스트 훅 준비')
    if (!ready) return
    // 파괴적 동작의 window.confirm 차단을 막기 위해 자동 승인(폴더+하위 휴지통/영구삭제 확인).
    await E("window.confirm=function(){return true}; window.prompt=function(){return null}; return 1")
    await closeWelcome(); await sleep(300)
    t(await ensureBinder(), P + '바인더 패널 표시')
    errs.length = 0
    const tag = skin.slice(0, 2) + '-' + Math.random().toString(36).slice(2, 7)
    const A = tag + '-A', B = tag + '-B', C = tag + '-C', FLD = tag + '-FLD'

    // ── ＋글 / ＋폴더 ──────────────────────────────────────────────
    await create('text', A)
    const eA0 = await entry(A)
    t(!!eA0 && eA0.type === 'text', P + '＋글 → 새 텍스트 생성(' + (eA0 ? eA0.type : '없음') + ')')
    await create('text', B)
    await create('text', C)
    t((await exists(B)) && (await exists(C)), P + '＋글 연속 추가 B·C 생성')
    const eA = await entry(A), eB = await entry(B), eC = await entry(C)
    const sib = eA && eB && eC && eA.parentId === eB.parentId && eB.parentId === eC.parentId
    t(sib, P + 'A·B·C 동일 부모(형제)로 생성 — ' + (eA ? eA.parentId : '?'))
    const pA = eA ? eA.parentId : null
    await create('folder', FLD)
    const eF = await entry(FLD)
    t(!!eF && eF.type === 'folder', P + '＋폴더 → 새 폴더 생성(' + (eF ? eF.type : '없음') + ')')

    // ── 키보드 내비: 방향키 ───────────────────────────────────────
    await setView('editor'); await sleep(150)
    await clickRow(A); await sleep(150)
    t(await E("return window.__scriv.state().activeId===" + J(eA.id)), P + '행 클릭 → 활성 A')
    await keyRow(A, 'ArrowDown'); await sleep(180)
    t(await E("return window.__scriv.state().activeId===" + J(eB.id)), P + '↓ 키 → 다음 항목(B) 선택 이동')
    await keyRow(B, 'ArrowUp'); await sleep(180)
    t(await E("return window.__scriv.state().activeId===" + J(eA.id)), P + '↑ 키 → 이전 항목(A) 선택 복귀')

    // ── 키보드 내비: Enter(텍스트 → 에디터 열기) ──────────────────
    await setView('corkboard'); await sleep(200)
    await clickRow(A); await sleep(120)
    await keyRow(A, 'Enter'); await sleep(250)
    t(await E("return !!document.querySelector('.paper')"), P + 'Enter(텍스트) → 에디터(.paper) 열림')

    // ── 키보드 내비: F2(인라인 이름 편집 시작) ───────────────────
    await keyRow(A, 'F2'); await sleep(220)
    const f2 = await E("return !!document.querySelector('.binder-rename')")
    t(f2, P + 'F2 → 인라인 이름 편집 입력 표시')
    await E("var inp=document.querySelector('.binder-rename'); if(inp)inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return 1"); await sleep(180)

    // ── 키보드 내비: Alt+↓(형제 순서 이동) ────────────────────────
    const before = await domLabels()
    await clickRow(B); await sleep(120)
    await keyRow(B, 'ArrowDown', { alt: true }); await sleep(250)
    const after = await domLabels()
    const moved = after.indexOf(B) > after.indexOf(C) && before.indexOf(B) < before.indexOf(C)
    t(moved, P + 'Alt+↓ → 형제 순서 재배치(B가 C 뒤로)')

    // ── 컨텍스트메뉴: 이름 바꾸기 ─────────────────────────────────
    const RN = tag + '-RN'
    t((await ctxAction(C, '이름 바꾸기')) === 'OK', P + '우클릭 메뉴 "이름 바꾸기" 클릭')
    await sleep(220); await nameInline(RN); await sleep(280)
    const eRN = await entry(RN)
    t(!!eRN && eRN.id === eC.id, P + '이름 바꾸기 반영(C → ' + RN + ')')

    // ── 컨텍스트메뉴: 복제 ────────────────────────────────────────
    t((await ctxAction(RN, '복제')) === 'OK', P + '우클릭 메뉴 "복제" 클릭')
    await sleep(280)
    t(await exists(RN + ' 사본'), P + '복제본 생성(' + RN + ' 사본)')

    // ── 컨텍스트메뉴: 폴더로 변환 / 글로 변환 ─────────────────────
    t((await ctxAction(A, '폴더로 변환')) === 'OK', P + '우클릭 메뉴 "폴더로 변환" 클릭')
    await sleep(220)
    t((await entryById(eA.id)).type === 'folder', P + '텍스트 → 폴더 변환 반영')
    t((await ctxAction(A, '글로 변환')) === 'OK', P + '우클릭 메뉴 "글로 변환" 클릭')
    await sleep(220)
    t((await entryById(eA.id)).type === 'text', P + '폴더 → 글(텍스트) 변환 반영')

    // ── 컨텍스트메뉴: 폴더로 묶기(그룹) ───────────────────────────
    await clickRow(A); await sleep(120); await clickRow(B, true); await sleep(160)
    t((await ctxAction(B, '묶기', true)) === 'OK', P + '다중 선택 후 "선택 N개 묶기" 클릭')
    await sleep(280)
    const gA = await entryById(eA.id), gB = await entryById(eB.id)
    const grpId = gA ? gA.parentId : null
    const grpFolder = grpId ? await entryById(grpId) : null
    const grouped = !!gA && !!gB && gA.parentId === gB.parentId && grpId !== pA && grpFolder && grpFolder.type === 'folder'
    t(grouped, P + '폴더로 묶기 → 새 폴더가 A·B 부모로(' + grpId + ')')

    // ── 컨텍스트메뉴: 그룹 해제 ───────────────────────────────────
    t((await openCtxSelected()) === 'OK', P + '새 그룹 폴더 우클릭(선택된 행)')
    t((await clickMenu('그룹 해제')) === 'OK', P + '우클릭 메뉴 "그룹 해제" 클릭')
    await sleep(280)
    const uA = await entryById(eA.id)
    const folderGone = grpId ? !(await entryById(grpId)) : true
    t(!!uA && uA.parentId === pA && folderGone, P + '그룹 해제 → 자식 상위 복귀 + 폴더 제거')

    // ── 컨텍스트메뉴: 휴지통으로 이동 ─────────────────────────────
    t((await ctxAction(RN, '휴지통으로 이동')) === 'OK', P + '우클릭 메뉴 "휴지통으로 이동" 클릭')
    await sleep(280)
    t((await entryById(eC.id)).parentId === 'root-trash', P + '휴지통으로 이동 → parentId=root-trash')

    // ── 컨텍스트메뉴: 휴지통에서 복원 ─────────────────────────────
    await E("var tr=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return r.getAttribute('aria-label')==='휴지통'}); if(tr&&tr.getAttribute('aria-expanded')==='false'){var d=tr.querySelector('.disclosure'); if(d)d.click();} return 1"); await sleep(220)
    t((await ctxAction(RN, '휴지통에서 복원')) === 'OK', P + '우클릭 메뉴 "휴지통에서 복원" 클릭')
    await sleep(280)
    t((await entryById(eC.id)).parentId !== 'root-trash', P + '휴지통에서 복원 → 휴지통 밖으로 이동')

    // ── 키보드: Delete(휴지통 이동) ───────────────────────────────
    const DEL = tag + '-DEL'
    await clickRow(RN); await sleep(120)
    await create('text', DEL)
    const eDEL = await entry(DEL)
    await clickRow(DEL); await sleep(120)
    await keyRow(DEL, 'Delete'); await sleep(280)
    t(!!eDEL && (await entryById(eDEL.id)).parentId === 'root-trash', P + 'Delete 키 → 휴지통으로 이동')

    // ── 왕복 후 잔존(뷰 전환에도 영속) ────────────────────────────
    await setView('outliner'); await sleep(200); await setView('editor'); await sleep(200)
    t((await exists(A)) && (await exists(B)) && (await exists(RN + ' 사본')), P + '뷰 왕복 후 항목 잔존(영속)')

    t(errs.length === 0, P + '조작 중 콘솔에러 0 (' + errs.length + ')')
  }

  for (const skin of ['classic', 'studio']) {
    try { await runSkin(skin) } catch (e) { t(false, '[' + skin + '] 예외: ' + e.message) }
  }

  console.log('=== 바인더 전 동작 실사용 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
