// 빈/오류/엣지 실사용 QA — '코드리뷰'가 아니라 '글 쓰는 사람이 비정상/극단 상황을 마주친다'는 가정으로
// 빈 뷰 안내·빈 폴더 안내·아주 긴 본문 붙여넣기(렉/크래시)·잘못된 URL 수집함·삭제(휴지통) 되돌리기·
// 삭제된 문서의 링크 후보 제외·도구 0개 검색결과 막다른 길 방지·모달 첫 입력 포커스/Esc 닫힘 을
// 실제 클릭/키/합성이벤트로 조작해 검증한다. '상식적으로 당연한데 안 되는 것'은 위반 시 [ISSUE] 로 출력(=실패).
// 작성 전용 — 실행은 하니스가 한다. node --check 통과. (Input 포인터 드래그 미사용 → 콘솔에러 캡처용 Runtime.enable 안전.)
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const J = (v) => JSON.stringify(v)

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  // 타깃 직접 생성 + flatten attach (about:blank+navigate 금지)
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)

  const ok = [], bad = []
  // 위반(=실패)은 [ISSUE] 로도 출력 — '당연한데 안 되는 것'을 눈에 띄게.
  const t = (c, m) => { (c ? ok : bad).push(m); if (!c) console.log('[ISSUE] ' + m) }
  const E = (x) => ev(ws, sid, x)

  // ───────────────────────── 공용 헬퍼 ─────────────────────────
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'&&typeof window.__setModal==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }
  const closeWelcome = () => E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")
  const ensureBinder = async () => { if (await E("return !!document.querySelector('.binder')")) return true; await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();return 1"); await sleep(300); return await E("return !!document.querySelector('.binder')") }
  const setView = (v) => E("window.__setView(" + J(v) + ");return 1")
  const setModal = (m) => E("window.__setModal(" + J(m) + ");return 1")
  const escWin = () => E("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1")

  // 상태/엔트리
  const stateActive = () => E("return window.__scriv.state().activeId")
  const entry = async (title) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.title===" + J(title) + "})[0]||null)"))
  const entryById = async (id) => JSON.parse(await E("return JSON.stringify(window.__scriv.entries().filter(function(e){return e.id===" + J(id) + "})[0]||null)"))

  // 바인더 조작(네이티브 DnD/Input 미사용 — 합성 이벤트만)
  const addNew = (kind) => E("var t=" + J(kind === 'folder' ? '새 폴더' : '새 글') + ";var b=[].slice.call(document.querySelectorAll('.binder button')).find(function(x){return (x.getAttribute('title')||'')===t});if(!b)return 'NOBTN'; b.click(); return 'OK';")
  const nameInline = (name) => E("var inp=document.querySelector('.binder-rename'); if(!inp) return 'NOINPUT';var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(inp," + J(name) + "); inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 'OK';")
  const create = async (kind, name) => { await addNew(kind); await sleep(340); const r = await nameInline(name); await sleep(280); return r }
  const clickRow = (label) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "});if(!r)return 'NOROW'; r.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 'OK';")
  const rowExists = (label) => E("return [].slice.call(document.querySelectorAll('.binder-row')).some(function(r){return r.getAttribute('aria-label')===" + J(label) + "})")
  const rowAttr = (label, attr) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); return r?String(r.getAttribute(" + J(attr) + ")):'NOROW';")
  const toggleDisc = (label) => E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); if(!r)return 'NOROW'; var d=r.querySelector('.disclosure'); if(d)d.click(); return 'OK';")
  const expandTrash = () => E("var tr=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return r.getAttribute('aria-label')==='휴지통'}); if(tr&&tr.getAttribute('aria-expanded')==='false'){var d=tr.querySelector('.disclosure'); if(d)d.click();} return 1;")
  const openCtxLabel = async (label) => { const r = await E("var r=[].slice.call(document.querySelectorAll('.binder-row')).find(function(x){return x.getAttribute('aria-label')===" + J(label) + "}); if(!r)return 'NOROW'; var c=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(c.left+12),clientY:Math.round(c.top+8)})); return 'OK';"); await sleep(240); return r }
  const clickMenu = async (text, contains) => { const r = await E("var btns=[].slice.call(document.querySelectorAll('.context-menu button')); var w=" + J(text) + "; var b=btns.find(function(x){return (x.textContent||'').trim()===w}); if(!b&&" + (contains ? 'true' : 'false') + ")b=btns.find(function(x){return (x.textContent||'').trim().indexOf(w)>=0}); if(!b)return 'NOITEM'; b.click(); return 'OK';"); await sleep(300); return r }
  const ctxAction = async (label, text, contains) => { const o = await openCtxLabel(label); if (o !== 'OK') return o; return clickMenu(text, contains) }

  // ──────────────────── 0) 로드 + 훅 + 환영 닫기 ────────────────────
  const ready = await waitHook()
  t(ready, '앱 로드 + 테스트 훅(__setView/__setModal/__openTool/__scriv) 준비')
  if (!ready) { console.log('결과: 0 통과 / 1 실패'); ws.close(); return process.exit(1) }
  // 파괴적 확인창(휴지통 등) 자동 승인. 기본 prompt 는 취소(컬렉션 모달 등 방해 차단).
  await E("window.confirm=function(){return true}; window.prompt=function(){return null}; return 1")
  await closeWelcome(); await sleep(300)
  t(await ensureBinder(), '바인더 패널 표시')

  const RAND = Math.random().toString(36).slice(2, 7)

  try {
    // ──────────────── 1) 모든 뷰: 빈/기본 상태에서 '백지'가 아니어야 ────────────────
    // 새 사용자가 어떤 뷰로 들어가도 중앙 패널은 콘텐츠 또는 안내가 보여야 한다(완전 백지=[ISSUE]).
    const VIEWS = ['editor', 'corkboard', 'outliner', 'board', 'canvas', 'serial', 'timeline', 'references', 'argument', 'database']
    for (const v of VIEWS) {
      await setView(v); await sleep(360)
      const info = JSON.parse(await E("var c=document.querySelector('.st-center')||document.querySelector('.center'); if(!c)return JSON.stringify({no:1}); var txt=(c.textContent||'').replace(/\\s+/g,'').length; var kids=c.querySelectorAll('*').length; var h=c.offsetHeight||0; var media=!!c.querySelector('svg,canvas,img,table,input,textarea,button'); return JSON.stringify({kids:kids,txt:txt,h:h,media:media});"))
      const okView = !info.no && info.kids > 0 && info.h > 0 && (info.txt > 0 || info.media)
      t(okView, '뷰[' + v + '] 중앙 패널 비백지(콘텐츠/안내 표시 · 요소 ' + (info.kids || 0) + '개, 높이 ' + (info.h || 0) + ')')
    }
    await setView('editor'); await sleep(150)

    // ──────────────── 2) 빈 폴더의 빈-상태 안내(코르크보드/아웃라이너/에디터) ────────────────
    // 빈 폴더로 들어가면 '비었음 + 무엇을 할지'가 보여야 한다(그냥 회색 백지면 [ISSUE]).
    const EF = 'EDGE-EMPTY-' + RAND
    await create('folder', EF)
    const efE = await entry(EF)
    t(!!efE && efE.type === 'folder', '빈 테스트 폴더 생성(' + EF + ')')
    await clickRow(EF); await sleep(160) // 폴더 활성화(=빈 컨텍스트)

    await setView('corkboard'); await sleep(320)
    t(await E("var c=document.querySelector('.corkboard')||document.querySelector('.center')||document.querySelector('.st-center'); return /카드가 없습니다|비어|없습니다/.test(c?(c.textContent||''):'');"), '빈 폴더 코르크보드 → "카드가 없습니다" 빈-상태 안내')

    await setView('outliner'); await sleep(320)
    t(await E("var c=document.querySelector('.empty-state'); return !!c && ((c.textContent||'').replace(/\\s+/g,'').length>0);"), '빈 폴더 아웃라이너 → 빈-상태(.empty-state) 안내 표시')

    await setView('editor'); await sleep(320)
    t(await E("var c=document.querySelector('.st-center')||document.querySelector('.center'); var h=c?c.querySelector('.empty-hint'):null; return !!h || /문서가 없습니다|새 글|문서를 선택/.test(c?(c.textContent||''):'');"), '빈 폴더 에디터 → 안내(.empty-hint: "문서가 없습니다"/새 글 유도) 표시')

    // ──────────────── 3) 아주 긴 본문 붙여넣기 — 렉/크래시 없이 처리 + 무손실 ────────────────
    const LONG = 'EDGE-LONG-' + RAND
    await clickRow(EF); await sleep(120) // 빈 폴더 안에 생성
    await create('text', LONG)
    const longId = (await entry(LONG) || {}).id || ''
    t(!!longId, '긴-본문 테스트 문서 생성(' + LONG + ')')
    // 12만 자 본문을 페이지 안에서 직접 만들어 setBody(대용량 전송 회피).
    await E("var big='{\\\\rtf1\\\\ansi\\\\deff0 '+'가나다라마'.repeat(24000)+'}'; window.__scriv.setBody(big); return 1"); await sleep(300)
    await setView('editor'); await sleep(800)
    const noCrash = (await stateActive()) === longId && (await E("return !!document.querySelector('.paper')")) && errs.length === 0
    t(noCrash, '아주 긴 본문 로드 후에도 에디터(.paper) 정상 렌더 + 활성 유지 + 콘솔에러 0(크래시 없음)')
    // 응답성: 거대한 .paper 를 조회하는 왕복이 합리적 시간 내 끝나야(행/무한렉이면 rpc 타임아웃→예외→[ISSUE]).
    const t0 = Date.now()
    const plen = await E("return (document.querySelector('.paper')?(document.querySelector('.paper').textContent||'').length:0)")
    const dt = Date.now() - t0
    t(dt < 5000 && plen > 50000, '긴 본문 응답성 정상(조회 ' + dt + 'ms, .paper 길이 ' + plen + ' — 렉/행 없음)')
    const blen = await E("var id=window.__scriv.state().activeId; return id?(window.__scriv.bodyOf(id)||'').length:0")
    t(blen > 50000, '긴 본문이 RTF(bodyRtf)에 그대로 보존(길이 ' + blen + ' — 데이터 무손실)')

    // ──────────────── 4) 도구 허브: 첫 입력 포커스 · 0개 검색결과 안내 · 복구 · Esc 닫힘 ────────────────
    await setModal('toolhub'); await sleep(500)
    const focus1 = JSON.parse(await E("var a=document.activeElement; return JSON.stringify({tag:a?a.tagName:'', inModal: !!(a&&a.closest&&a.closest('.modal'))});"))
    t(focus1.tag === 'INPUT' && focus1.inModal, '도구 허브 열면 첫 입력(검색창)에 자동 포커스(' + focus1.tag + ')')
    // 절대 없을 검색어 → 막다른 길이 아니라 '없습니다 + 복구 버튼'이 보여야 한다.
    const NOQ = 'zzq없는도구' + RAND
    await E("var inp=document.querySelector('.modal-backdrop input'); if(inp){var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp," + J(NOQ) + "); inp.dispatchEvent(new Event('input',{bubbles:true}));} return 1"); await sleep(300)
    const zeroState = JSON.parse(await E("var m=document.querySelector('.modal-backdrop'); var hasMsg=/결과가 없습니다|없습니다/.test(m?(m.textContent||''):''); var cards=m?m.querySelectorAll('.toolhub-card').length:0; var clr=[].slice.call(m?m.querySelectorAll('button'):[]).some(function(b){return (b.textContent||'').trim()==='검색 지우기'}); return JSON.stringify({hasMsg:hasMsg,cards:cards,clr:clr});"))
    t(zeroState.hasMsg && zeroState.cards === 0 && zeroState.clr, '도구 0개 검색결과 → "결과가 없습니다" 안내 + "검색 지우기" 복구 버튼(막다른 길 아님)')
    await E("var b=[].slice.call(document.querySelectorAll('.modal-backdrop button')).find(function(x){return (x.textContent||'').trim()==='검색 지우기'}); if(b)b.click(); return 1"); await sleep(300)
    t(await E("return document.querySelectorAll('.modal-backdrop .toolhub-card').length>0"), '"검색 지우기" 클릭 → 도구 목록 복구(카드 다시 표시)')
    await escWin(); await sleep(300)
    t(!(await E("return !!document.querySelector('.modal-backdrop')")), 'Esc 로 도구 허브 모달 닫힘')

    // ──────────────── 5) 문서 링크 삽입: 후보 표시/빈검색 안내/첫 입력 포커스 ────────────────
    // 링크 대상 후보를 만들고(타깃), 다른 문서를 활성으로 둔다(자기 자신은 후보에서 빠지므로).
    await clickRow('원고'); await sleep(120)
    if ((await rowAttr('원고', 'aria-expanded')) === 'false') { await toggleDisc('원고'); await sleep(150) }
    const TGT = 'EDGE-DOC-' + RAND, OTH = 'EDGE-OTHER-' + RAND
    await create('text', TGT)
    const tgtE = await entry(TGT); const tgtId = tgtE ? tgtE.id : ''; const tgtParent = tgtE ? tgtE.parentId : ''
    await create('text', OTH) // 이걸 활성으로 → TGT 는 링크 후보로 노출돼야
    t(!!tgtId && (await stateActive()) !== tgtId, '링크 대상/활성 문서 분리 생성(대상=' + TGT + ')')

    await setModal('docLink'); await sleep(420)
    const dlFocus = await E("var a=document.activeElement; return !!(a&&a.tagName==='INPUT'&&a.closest&&a.closest('.modal'));")
    t(dlFocus, '문서 링크 모달 열면 검색 입력에 자동 포커스')
    const typeDL = (q) => E("var inp=document.querySelector('.modal input'); if(inp){var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(inp," + J(q) + "); inp.dispatchEvent(new Event('input',{bubbles:true}));} return 1")
    await typeDL(RAND); await sleep(280)
    t(await E("return [].slice.call(document.querySelectorAll('.modal button')).some(function(b){return (b.textContent||'').indexOf(" + J(TGT) + ")>=0})"), '활성 아닌 일반 문서는 링크 후보로 노출됨(' + TGT + ')')
    await typeDL('zzz없는문서' + RAND); await sleep(280)
    t(await E("var m=document.querySelector('.modal'); return /일치하는 문서가 없습니다/.test(m?(m.textContent||''):'')"), '일치 없는 검색어 → "일치하는 문서가 없습니다" 안내(빈-상태)')
    await setModal(null); await sleep(220)

    // ──────────────── 6) 삭제는 되돌릴 수 있어야(휴지통) + 삭제된 문서는 링크 후보 제외 ────────────────
    t((await ctxAction(TGT, '휴지통으로 이동')) === 'OK', '대상 문서 우클릭 → "휴지통으로 이동"')
    await sleep(280)
    const trashed = await entryById(tgtId)
    t(!!trashed && trashed.parentId === 'root-trash', '삭제 = 영구소실 아님 → parentId=root-trash(되돌릴 수 있는 삭제)')
    // 삭제된 문서는 끊긴 링크를 만들지 못하도록 링크 후보에서 빠져야 한다.
    await setModal('docLink'); await sleep(380)
    await typeDL(RAND); await sleep(280)
    t(!(await E("return [].slice.call(document.querySelectorAll('.modal button')).some(function(b){return (b.textContent||'').indexOf(" + J(TGT) + ")>=0})")), '삭제(휴지통)된 문서는 링크 후보에서 제외(끊긴 링크 생성 차단)')
    await setModal(null); await sleep(200)
    // 복원 → 원위치 복귀(삭제 되돌리기 동작)
    await expandTrash(); await sleep(240)
    t((await ctxAction(TGT, '휴지통에서 복원')) === 'OK', '휴지통 항목 우클릭 → "휴지통에서 복원"')
    await sleep(300)
    const restored = await entryById(tgtId)
    t(!!restored && restored.parentId === tgtParent, '복원 → 원래 위치로 복귀(삭제 되돌리기 정상 — 데이터 안전)')

    // ──────────────── 7) 잘못된 URL 수집함 — 깨진 항목 만들지 않기(유효성) ────────────────
    await setView('editor'); await sleep(120)
    await E("var i=document.querySelector('.stash-icon'); if(i)i.click(); return 1"); await sleep(420)
    t(await E("return !!document.querySelector('.stash-win')"), '수집함 창 열림')
    const countUrl = () => E("return document.querySelectorAll('.stash-win .k-url').length")
    const before = await countUrl()
    // 잘못된 URL 입력 → 추가되면 안 된다(깨진 링크 방지).
    await E("window.prompt=function(){return 'http 가 아닌 그냥 글자 입니다'}; return 1")
    await E("var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.getAttribute('title')||'')==='URL 추가'}); if(b)b.click(); return 1"); await sleep(350)
    t((await countUrl()) === before, '잘못된 URL → 수집함에 깨진 항목 추가 안 됨(유효성 검사, 개수 ' + before + ' 유지)')
    // 양성 대조: 정상 URL 은 추가돼야 한다.
    const GOOD = 'https://example.org/edge-' + RAND
    await E("window.prompt=function(){return " + J(GOOD) + "}; return 1")
    await E("var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.getAttribute('title')||'')==='URL 추가'}); if(b)b.click(); return 1"); await sleep(380)
    t((await countUrl()) === before + 1, '정상 URL 은 수집함에 추가됨(양성 대조)')
    await E("window.prompt=function(){return null}; return 1") // 이후 prompt 차단 복구
    // 자기정리: 방금 추가한 정상 URL 항목 제거(상태 오염 최소화)
    await E("var its=[].slice.call(document.querySelectorAll('.stash-win .k-url')); var it=its[its.length-1]; if(it){var x=it.querySelector('.stash-item-x'); if(x)x.click();} return 1"); await sleep(200)

    // ──────────────── 8) 전체 엣지 조작 중 콘솔에러/예외 0 ────────────────
    t(errs.length === 0, '빈/오류/엣지 전 과정에서 콘솔에러·예외 0 (' + errs.length + ')')
  } catch (e) {
    t(false, '엣지 시나리오 도중 예외: ' + (e && e.message))
  }

  console.log('=== 빈/오류/엣지 실사용 QA ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
