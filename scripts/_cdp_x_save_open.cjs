// 저장/열기/백업(영속) 실사용 UX 검증 — '코드리뷰'가 아니라 실제 사용자가 글을 쓰다 저장/복구하는 흐름을 재현한다.
// 점검: ⌘S 저장 시 dirty→saved 표시·토스트 / 자동저장(안 눌러도 저장됨) / 새로고침 후 원고 유지(IDB 영속)
//      / .sry 내보내기·열기 왕복 무결 / 백업 생성→복원→삭제 / 프로젝트 목록 열기·현재 삭제가드 / 모달 기본기(포커스·Esc·backdrop).
// 기대 동작을 단언으로 인코딩하고, 위반 시 console.log("[ISSUE] …") 를 출력(실패로 카운트).
// 소스: src/App.tsx(saveNow/자동저장/requestSwitch/__scriv·__sryfmt 훅), components/BackupModal.tsx, ProjectListModal.tsx, useModal.ts.
//
// ⚠ 반드시 DEV 서버(서비스워커 없음)에서 실행하세요.
//   이 스크립트는 '실제 새로고침(Page.navigate)'으로 IndexedDB 영속을 검증합니다. 프로덕션 preview(빌드)에는
//   서비스워커가 있어 옛 번들/캐시를 돌려줄 수 있고, 그러면 새로고침 결과가 가려져(=거짓 통과/실패) 검증이 무의미해집니다.
//   예) 터미널A:  npm run dev                      (Vite DEV 서버, 5173, SW 없음)
//       터미널B:  SRY_URL=http://localhost:5173/ node scripts/_cdp_x_save_open.cjs
//   (CDP 허브: 크롬을 --remote-debugging-port=9222 로 띄워 두어야 합니다. preview 로 굳이 돌리려면 SRY_URL=http://localhost:4178/ )
//
// 작성 전용(실행 금지) · node --check 통과 대상.
const HUB = process.env.CDP_HUB || 'http://localhost:9222'
const APP = process.env.SRY_URL || 'http://localhost:5173/' // DEV 서버 기본값(서비스워커 없음)
let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) {
  return new Promise((res, rej) => {
    const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid
    const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }
    ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000)
  })
}
// async 표현식 지원(__sryfmt.build/read 등 await 필요) — returnByValue + awaitPromise.
async function ev(ws, sid, x) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: '(async()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('PAGE:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '').split('\n')[0])
  return r.result && r.result.value
}
// 실제 키 입력(Input.dispatchKeyEvent) — Runtime.enable 와 충돌하는 건 '포인터 드래그(마우스)' 뿐이라 키보드는 안전.
async function key(ws, sid, k, mods) {
  const vk = k === 's' ? 83 : k === 'Escape' ? 27 : 0
  const code = k === 's' ? 'KeyS' : k === 'Escape' ? 'Escape' : k
  const base = { key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods || 0 }
  await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sid)
  await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sid)
}

const RTF = (mark) => '{\\rtf1\\ansi\\deff0 ' + mark + '\\par}' // 최소 유효 RTF + 고유 마커
// 메뉴(클래식/스튜디오 공통: .menu-wrap > button 트리거, .dropdown button 항목) 인터랙션
const openMenu = (label) => "(()=>{var m=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(b){return (b.textContent||'').trim()===" + JSON.stringify(label) + "});if(!m)return'no';m.click();return'ok'})()"
const clickItem = (label) => "(()=>{var it=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(b){return (b.textContent||'').includes(" + JSON.stringify(label) + ")});if(!it)return'no';it.click();return'ok'})()"
// 백업 모달의 '이 프로젝트' 섹션 행 수만 정확히 센다('다른 프로젝트' 섹션 제외).
const countMine = "(()=>{var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /백업/.test((x.querySelector('h2')||{}).textContent||'')});if(!m)return -1;var kids=[].slice.call(m.querySelector('.modal-body').children);var counting=false,n=0;kids.forEach(function(el){var tx=(el.textContent||'').trim();if(/^이 프로젝트$/.test(tx)){counting=true;return}if(/^다른 프로젝트$/.test(tx)){counting=false;return}if(counting&&el.classList.contains('snap-item'))n++});return n})()"

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  // 규칙: about:blank+navigate 금지 — 앱 URL 로 타깃을 직접 생성하고 flatten 으로 attach.
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: APP })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 콘솔/예외 캡처(클릭·키 입력만 쓰므로 Runtime.enable 허용).
  const exc = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push((d.params.exceptionDetails && d.params.exceptionDetails.text) || 'exc') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // beforeunload(원고 안전) 다이얼로그가 헤드리스에서 Page.navigate 를 막지 않도록 자동 수락.
  await rpc(ws, 'Page.enable', {}, sid).catch(() => {})
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })

  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }
  const waitHook = async () => { for (let i = 0; i < 75; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__scriv==='object'&&typeof window.__setModal==='function'&&typeof window.__sryfmt==='object'")) return true } catch { /* loading */ } } return false }
  const dismiss = () => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1").catch(() => {})

  // ── 결정성 확보: 클래식 스킨으로 고정(저장 버튼 .save-btn 확인용) 후 1회 새로고침 ──
  t(await waitHook(), '앱 로드 + 테스트 훅 준비(__scriv/__setModal/__sryfmt)')
  await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','classic')}catch(e){};return 1")
  await rpc(ws, 'Page.navigate', { url: APP }, sid)
  t(await waitHook(), '클래식 스킨 적용 + 재로드 후 훅 재준비')
  await dismiss(); await sleep(300)

  // ============================================================================
  // [1] ⌘S 저장: 편집하면 '미저장' 표시 → 저장하면 '저장됨' 표시 + 저장 피드백 토스트
  // ============================================================================
  const M1 = 'XSAVE-M1-' + Date.now()
  // 빈 문서 오토포커스(#23) 대비: 포커스된 에디터는 외부 setBody 를 무시하고 blur 시 옛 DOM 으로 되덮는다 → 먼저 blur.
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(150)
  const seed = await ev(ws, sid, "var id=window.__scriv.setBody(" + JSON.stringify(RTF(M1)) + ");var s=window.__scriv.state();return {id:id,projId:s.id,dirty:s.dirty}")
  t(!!(seed && seed.id), '편집 대상 문서 확보(__scriv.setBody → docId=' + (seed && seed.id) + ')')
  const docId = seed && seed.id, projId = seed && seed.projId
  await sleep(350)
  const sbDirty = await ev(ws, sid, "var b=document.querySelector('.save-btn');return b?{cls:b.className,txt:(b.textContent||'').trim()}:null")
  t(!!sbDirty && /\bdirty\b/.test(sbDirty.cls) && !/\bsaved\b/.test(sbDirty.cls) && /저장/.test(sbDirty.txt) && !/저장됨/.test(sbDirty.txt),
    "편집 직후 저장 버튼이 '미저장' 상태로 보임(class=dirty, 라벨 '저장') — 사용자가 미저장임을 인지" + (sbDirty ? ' [' + sbDirty.txt + ']' : ''))

  await key(ws, sid, 's', 2) // 실제 Ctrl+S
  await sleep(900)           // idbSave(되읽기검증) → markSaved → flash
  const sbSaved = await ev(ws, sid, "var b=document.querySelector('.save-btn');var st=document.querySelector('[role=\"status\"]');return {cls:b?b.className:'',txt:b?(b.textContent||'').trim():'',dirty:window.__scriv.state().dirty,toast:st?(st.textContent||''):''}")
  t(!!sbSaved && sbSaved.dirty === false && /\bsaved\b/.test(sbSaved.cls) && /저장됨/.test(sbSaved.txt),
    "⌘S 저장 후 dirty→saved 전환 + 저장 버튼 '저장됨' 표시 [" + (sbSaved ? sbSaved.txt : '') + ']')
  t(!!sbSaved && /저장됨/.test(sbSaved.toast || ''),
    "저장 시 '저장됨' 피드백 토스트(role=status) 노출 — 저장됐는지 사용자에게 확인" + (sbSaved ? ' ["' + (sbSaved.toast || '').slice(0, 24) + '"]' : ''))

  // ============================================================================
  // [2] 자동저장: 저장 버튼을 누르지 않아도 잠시 뒤 자동으로 저장되어 dirty 가 풀려야 한다
  // ============================================================================
  const M2 = 'XSAVE-M2-' + Date.now()
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(150)
  await ev(ws, sid, "window.__scriv.setBody(" + JSON.stringify(RTF(M2)) + ");return 1")
  await sleep(200)
  const reDirty = await ev(ws, sid, "return window.__scriv.state().dirty")
  t(reDirty === true, '재편집 직후 dirty=true(미저장 상태 진입)')
  await sleep(3000) // 자동저장 디바운스(기본 1.5s) + idbSave 여유
  const auto = await ev(ws, sid, "var b=document.querySelector('.save-btn');return {dirty:window.__scriv.state().dirty,cls:b?b.className:''}")
  t(!!auto && auto.dirty === false && /\bsaved\b/.test(auto.cls),
    '저장 버튼을 누르지 않아도 자동저장이 dirty 를 해제(자동저장 동작)')

  // ============================================================================
  // [3] 새로고침 후 원고 유지(IndexedDB 영속) — 메모리가 아니라 디스크 영속을 본다
  // ============================================================================
  await rpc(ws, 'Page.navigate', { url: APP }, sid)
  t(await waitHook(), '새로고침 후 앱 재기동 + 훅 재준비')
  await dismiss(); await sleep(400)
  const after = await ev(ws, sid, "var s=window.__scriv.state();var has=!!window.__scriv.entries().find(function(e){return e.id===" + JSON.stringify(docId) + "});var body=window.__scriv.bodyOf(" + JSON.stringify(docId) + ");return {projId:s.id,has:has,body:body||''}")
  t(!!(after && after.projId === projId), '새로고침 후 같은 프로젝트 복원(id 일치)')
  t(!!(after && after.has && after.body.includes(M2)),
    '새로고침 후 같은 문서 본문(마커) 유지 — IDB 자동저장 영속 확인(핵심)')

  // ============================================================================
  // [4] .sry 내보내기/열기 왕복 무결 — 네이티브 파일 대화상자 대신 __sryfmt 훅으로 데이터 경로 검증
  //     (메뉴의 '.sry 파일로 내보내기'=fileMapToZip(buildSryFileMap), '.sry 파일 열기'=readSryFileMap 와 동일 경로)
  // ============================================================================
  const exp = await ev(ws, sid, "var fm=await window.__sryfmt.build();window.__x_fm=fm;var all=Object.keys(fm).map(function(k){return fm[k]}).join('\\n');return {keys:Object.keys(fm).length,hasMark:all.indexOf(" + JSON.stringify(M2) + ")>=0,hasIdx:!!(fm['sry.json']||fm['project.json'])}")
  t(!!(exp && exp.hasIdx && exp.hasMark),
    '.sry 내보내기에 현재 원고 본문(마커)이 자체완결로 포함(export 무결, 파일 ' + (exp ? exp.keys : '?') + '개)')
  const imp = await ev(ws, sid, "var p=await window.__sryfmt.read(window.__x_fm);var it=p&&p.items&&p.items[" + JSON.stringify(docId) + "];return {sameId:!!(p&&p.id===" + JSON.stringify(projId) + "),body:(it&&it.bodyRtf)||''}")
  t(!!(imp && imp.sameId && imp.body.includes(M2)),
    '.sry 열기(왕복) 후 같은 프로젝트·본문 마커 보존(export→open 무결)')

  // ============================================================================
  // [5] 백업 생성 → 복원 → 삭제 (파일 메뉴 → 백업/복원, 실제 메뉴 인터랙션)
  // ============================================================================
  t(await ev(ws, sid, openMenu('파일')) === 'ok', "파일 메뉴 열림")
  await sleep(250)
  t(await ev(ws, sid, clickItem('백업')) === 'ok', "파일 메뉴에 '백업 / 복원…' 항목 존재")
  await sleep(600)
  t(await ev(ws, sid, "return /백업/.test(([].slice.call(document.querySelectorAll('.modal h2')).map(function(h){return h.textContent}).join(' ')))") ,
    '백업/복원 모달이 열림')
  // 모달 기본기: 열리면 첫 포커스가 모달 안으로 들어가야 한다(접근성).
  t(await ev(ws, sid, "var m=document.querySelector('.modal');return !!m&&m.contains(document.activeElement)"),
    '모달 열림 시 포커스가 모달 내부로 이동(키보드 접근성)')

  // 결정성: 이 프로젝트의 기존 백업을 모두 비운다(누적/15개 상한 영향 제거 + 빈 상태 안내 검증).
  // mine 행은 '다른 프로젝트' 섹션보다 먼저 렌더되므로, mine>0 인 동안 첫 .danger(삭제)는 항상 mine 행이다.
  const delFirstMine = "var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /백업/.test((x.querySelector('h2')||{}).textContent||'')});var b=m&&[].slice.call(m.querySelectorAll('.snap-actions .minibtn.danger')).find(function(x){return /^삭제$/.test((x.textContent||'').trim())});if(b)b.click();return !!b"
  for (let i = 0; i < 20; i++) { if ((await ev(ws, sid, "return " + countMine)) <= 0) break; await ev(ws, sid, delFirstMine); await sleep(450) }
  t((await ev(ws, sid, "return " + countMine)) === 0, '이 프로젝트 기존 백업 비움(0개) — 깨끗한 시작점 확보')
  t(await ev(ws, sid, "var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /백업/.test((x.querySelector('h2')||{}).textContent||'')});return !!m&&/아직 백업이 없습니다/.test(m.textContent||'')"),
    "백업이 없을 때 빈 상태 안내('아직 백업이 없습니다.') 노출 — 빈 화면에 안내")

  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button')).find(function(x){return /^지금 백업$/.test((x.textContent||'').trim())});if(b)b.click();return 1")
  await sleep(1300) // saveBackup(되읽기 검증 포함) + refresh
  const afterBk = await ev(ws, sid, "return " + countMine)
  t(afterBk === 1, "'지금 백업' 후 이 프로젝트 백업 1개 생성(0 → " + afterBk + ')')
  t(await ev(ws, sid, "var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /백업/.test((x.querySelector('h2')||{}).textContent||'')});return !!m&&/백업했습니다/.test(m.textContent||'')"),
    "백업 성공 안내 메시지 표시('…백업했습니다')")

  // 복원: 같은 프로젝트 복원은 window.confirm 1회 → 자동 수락. 복원 후 모달 닫힘 + 본문 마커 유지.
  await ev(ws, sid, "window.__oc=window.confirm;window.confirm=function(){return true};return 1")
  await ev(ws, sid, "var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /백업/.test((x.querySelector('h2')||{}).textContent||'')});var b=m&&[].slice.call(m.querySelectorAll('.snap-actions .minibtn')).find(function(x){return /^복원$/.test((x.textContent||'').trim())});if(b)b.click();return !!b")
  await sleep(1400) // saveBackup(현재본 보관)+loadBackup+applySryAux
  await ev(ws, sid, "if(window.__oc)window.confirm=window.__oc;return 1")
  const restored = await ev(ws, sid, "var open=[].slice.call(document.querySelectorAll('.modal h2')).some(function(h){return /백업/.test(h.textContent||'')});var s=window.__scriv.state();var body=window.__scriv.bodyOf(" + JSON.stringify(docId) + ");return {closed:!open,projId:s.id,hasMark:(body||'').includes(" + JSON.stringify(M2) + ")}")
  t(!!(restored && restored.closed), '복원 실행 후 백업 모달이 닫힘(loadProject 완료)')
  t(!!(restored && restored.projId === projId && restored.hasMark),
    '백업→복원 왕복: 같은 프로젝트·본문 마커 유지(복원 무결)')

  // 삭제: 백업 모달 재오픈 → '이 프로젝트' 행 수 → 첫 삭제 → 1 감소(복원이 직전본을 백업 보관하므로 ≥1개 존재)
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  await ev(ws, sid, clickItem('백업')); await sleep(600)
  const delBefore = await ev(ws, sid, "return " + countMine)
  t(typeof delBefore === 'number' && delBefore >= 1, '삭제 대상 백업 존재(' + delBefore + '개)')
  await ev(ws, sid, delFirstMine)
  await sleep(900) // deleteBackup + refresh
  const delAfter = await ev(ws, sid, "return " + countMine)
  t(typeof delAfter === 'number' && delAfter === delBefore - 1,
    '백업 삭제 후 이 프로젝트 백업 행 1 감소(' + delBefore + ' → ' + delAfter + ')')

  // 모달 기본기: Esc 로 닫혀야 한다.
  await key(ws, sid, 'Escape', 0); await sleep(350)
  t(!(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal h2')).some(function(h){return /백업/.test(h.textContent||'')})")),
    'Esc 키로 백업 모달이 닫힘(상식 UX)')

  // ============================================================================
  // [6] 프로젝트 목록: 열기 + '현재 열림' 표시 + 현재 프로젝트엔 삭제 버튼 없음(실수 삭제 가드)
  // ============================================================================
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  t(await ev(ws, sid, clickItem('프로젝트 목록')) === 'ok', "파일 메뉴에 '프로젝트 목록 / 열기…' 항목 존재")
  await sleep(550)
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal h2')).some(function(h){return /프로젝트 목록/.test(h.textContent||'')})"),
    '프로젝트 목록 모달 열림')
  const cur = await ev(ws, sid, "var m=[].slice.call(document.querySelectorAll('.modal')).find(function(x){return /프로젝트 목록/.test((x.querySelector('h2')||{}).textContent||'')});if(!m)return null;var row=[].slice.call(m.querySelectorAll('.snap-item')).find(function(it){return /현재 열림/.test(it.textContent||'')});return {hasCurrent:!!row,hasDelBtn:row?[].slice.call(row.querySelectorAll('button')).some(function(b){return /삭제/.test(b.textContent||'')}):true}")
  t(!!(cur && cur.hasCurrent), "프로젝트 목록에 '현재 열림' 항목으로 현재 프로젝트 노출")
  t(!!(cur && cur.hasCurrent && cur.hasDelBtn === false),
    '현재 열려 있는 프로젝트에는 삭제 버튼이 없음(작업 중 원고 실수 삭제 방지 가드)')

  // 모달 기본기: backdrop 클릭으로 닫혀야 한다.
  await ev(ws, sid, "var b=document.querySelector('.modal-backdrop');if(b)b.click();return 1"); await sleep(350)
  t(!(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal h2')).some(function(h){return /프로젝트 목록/.test(h.textContent||'')})")),
    '배경(backdrop) 클릭으로 프로젝트 목록 모달이 닫힘(상식 UX)')

  // ============================================================================
  // [7] 전체 무결성
  // ============================================================================
  t(exc.length === 0, '실행 중 처리되지 않은 예외 없음(' + exc.length + (exc.length ? ' :: ' + exc.slice(0, 2).join(' | ') : '') + ')')

  console.log('=== 저장/열기/백업(영속) 실사용 UX 검증 ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
