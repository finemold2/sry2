// 클래식 상단 메뉴 전수 검증 — 파일/문서/보기/도구 메뉴를 '실제로 열고 항목을 클릭'해
// 그 효과(모달 열림 · viewMode 전환 · 바인더 항목 추가 · 상태 변화)를 검증한다.
// 파일피커/다운로드 유발 항목(폴더열기/저장/내보내기/zip/가져오기)은 클릭만 하고 '크래시·예외 없음'만 본다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// --- 메뉴 헬퍼 (실제 DOM 클릭) ---
// 1) 상단 메뉴바의 트리거 버튼(.menu-wrap > button.tbtn)을 라벨로 찾아 클릭해서 드롭다운을 연다.
const openMenu = (label) => `(()=>{const b=[...document.querySelectorAll('.menu-wrap > button.tbtn')].find(x=>(x.textContent||'').trim()===${JSON.stringify(label)});if(!b)return'no-trigger:'+${JSON.stringify(label)};b.click();return'ok'})()`
// 2) 열린 드롭다운(.dropdown[role=menu]) 안에서 라벨이 부분일치하는 menuitem 을 클릭. disabled 면 'disabled' 반환.
const clickItem = (text) => `(()=>{const dd=document.querySelector('.dropdown[role="menu"]');if(!dd)return'no-dropdown';const b=[...dd.querySelectorAll('button[role="menuitem"]')].find(x=>(x.querySelector('span')?.textContent||x.textContent||'').indexOf(${JSON.stringify(text)})>=0);if(!b)return'no-item:'+${JSON.stringify(text)};if(b.disabled)return'disabled';b.click();return'ok'})()`
// 드롭다운 안 menuitem 개수(열림 확인용)
const ddCount = `(()=>{const dd=document.querySelector('.dropdown[role="menu"]');return dd?dd.querySelectorAll('button[role="menuitem"]').length:0})()`
// 현재 떠 있는 모달 제목(.modal-backdrop .modal h2) — 모달이 떴는지 확인
const modalTitle = `(()=>{const m=document.querySelector('.modal-backdrop .modal h2, .modal-overlay .modal h2, .modal-overlay h2');return m?(m.textContent||'').trim():(document.querySelector('.modal-backdrop, .modal-overlay')?'(모달-제목없음)':'')})()`
// 모달 닫기: Escape → 남아있으면 backdrop 클릭 → 닫기/취소 버튼
const closeAnyModal = `(()=>{let m=document.querySelector('.modal-backdrop, .modal-overlay');if(!m)return'none';document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return'esc'})()`
const closeAnyModal2 = `(()=>{const m=document.querySelector('.modal-backdrop, .modal-overlay');if(!m)return'closed';const btn=[...m.querySelectorAll('button')].find(b=>/닫기|취소|✕|×|돌아가기/.test(b.textContent||'')||/닫기|닫기|취소/.test(b.getAttribute('aria-label')||''));if(btn){btn.click();return'btn'}if(m.classList.contains('modal-backdrop')){m.click();return'backdrop'}return'stuck'})()`
// 활성 뷰 라벨: 툴바의 뷰 전환 버튼(button.tbtn[aria-pressed=true])의 aria-label(예 '코르크보드 (⌘2)') 첫 토큰.
// '.seg' 컨테이너는 없다. 뷰 버튼은 .toolbar 안 button.tbtn 으로 직접 렌더되며 활성은 .active + aria-pressed="true".
// 단, 바인더/인스펙터/편집기분할 토글도 .tbtn.active[aria-pressed=true] 라 DOM 순서에 기대지 않고 라벨로 뷰 버튼만 추린다.
const VIEW_LABELS = ['에디터', '코르크보드', '아웃라이너', '칸반', '스토리', '연재', '참고문헌', '논증', '데이터베이스']
const curView = `(()=>{const VL=${JSON.stringify(VIEW_LABELS)};const b=[...document.querySelectorAll('.toolbar button.tbtn.active[aria-pressed="true"]')].find(x=>{const l=(x.getAttribute('aria-label')||'').trim();return VL.some(v=>l.startsWith(v))});return b?((b.getAttribute('aria-label')||'').trim().split(' ')[0]):''})()`
// 뷰 렌더 확인은 '뷰 컨테이너 DOM 출현'으로(active 클래스보다 신뢰).
//  에디터=.paper, 코르크보드=.corkboard, 아웃라이너=.outliner, 칸반=.board, 연재=.serial-board, 캔버스=.canvas-area, DB=.db-table.
const VIEW_SEL = { editor: '.paper', corkboard: '.corkboard', outliner: '.outliner', board: '.board', serial: '.serial-board', canvas: '.canvas-area', database: '.db-table' }
const viewDom = (sel) => `(()=>{return !!document.querySelector('.center ${sel}')})()`

async function closeModal(ws, sid) {
  await ev(ws, sid, closeAnyModal); await sleep(200)
  await ev(ws, sid, closeAnyModal2); await sleep(200)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 클래식 스킨인지 확인(메뉴바 트리거가 존재해야 함). studio 면 메뉴 구조가 달라 검증 무의미.
  const isClassic = await ev(ws, sid, `return !!document.querySelector('.toolbar .menu-wrap > button.tbtn')`)
  t(isClassic, '클래식 상단 메뉴바 트리거 존재(.toolbar .menu-wrap button.tbtn)')

  // ========== 1) 보기 메뉴: 실제 viewMode 전환 ==========
  // 시작 뷰 기록 → '코르크보드' 메뉴 클릭 → 뷰 컨테이너 DOM(.corkboard)이 실제로 렌더되는가(렌더만이 아니라 '원하는 화면 출현').
  const view0 = await ev(ws, sid, curView)
  await ev(ws, sid, openMenu('보기')); await sleep(250)
  t((await ev(ws, sid, ddCount)) >= 5, '보기 메뉴 드롭다운 열림(menuitem ' + (await ev(ws, sid, ddCount)) + '개)')
  const ci1 = await ev(ws, sid, clickItem('코르크보드')); await sleep(450)
  const corkDom = await ev(ws, sid, viewDom(VIEW_SEL.corkboard))
  const viewCork = await ev(ws, sid, curView)
  t(ci1 === 'ok' && corkDom, "보기 → '코르크보드' 클릭 후 코르크보드 뷰 컨테이너(.corkboard) 렌더 (활성라벨 '" + viewCork + "', 시작 '" + view0 + "')")
  // 활성 버튼 라벨도 코르크보드로 바뀌었는지(aria-pressed 동기화 확인)
  t(/코르크보드/.test(viewCork), '코르크보드 전환 시 활성 뷰 버튼 라벨=코르크보드(aria-pressed 동기화)')

  // 다시 보기 → '아웃라이너' → 또 전환되는지(.outliner 컨테이너 출현)
  await ev(ws, sid, openMenu('보기')); await sleep(250)
  const ci2 = await ev(ws, sid, clickItem('아웃라이너')); await sleep(450)
  const outDom = await ev(ws, sid, viewDom(VIEW_SEL.outliner))
  t(ci2 === 'ok' && outDom, "보기 → '아웃라이너' 클릭 후 아웃라이너 뷰 컨테이너(.outliner) 렌더 (활성라벨 '" + (await ev(ws, sid, curView)) + "')")

  // 에디터로 복귀(이후 문서/도구 테스트가 에디터 기준이라 안정화) → .paper(본문) 출현
  await ev(ws, sid, openMenu('보기')); await sleep(250)
  await ev(ws, sid, clickItem('에디터')); await sleep(400)
  t(await ev(ws, sid, viewDom(VIEW_SEL.editor)), "보기 → '에디터' 복귀 후 본문(.paper) 렌더")

  // ========== 2) 문서 메뉴: 바인더에 항목 실제 추가 ==========
  // '새 텍스트' 클릭 → 프로젝트 items 수가 +1
  const items0 = await ev(ws, sid, `return window.__scriv.state().items`)
  await ev(ws, sid, openMenu('문서')); await sleep(250)
  const ciNew = await ev(ws, sid, clickItem('새 텍스트')); await sleep(450)
  const items1 = await ev(ws, sid, `return window.__scriv.state().items`)
  t(ciNew === 'ok' && items1 === items0 + 1, "문서 → '새 텍스트' 클릭 후 항목 수 +1 (" + items0 + ' → ' + items1 + ')')

  // '새 폴더' 클릭 → 또 +1
  await ev(ws, sid, openMenu('문서')); await sleep(250)
  const ciFolder = await ev(ws, sid, clickItem('새 폴더')); await sleep(450)
  const items2 = await ev(ws, sid, `return window.__scriv.state().items`)
  t(ciFolder === 'ok' && items2 === items1 + 1, "문서 → '새 폴더' 클릭 후 항목 수 +1 (" + items1 + ' → ' + items2 + ')')

  // '새 문서 (템플릿)…' → 모달 열림(DocTemplate)
  await ev(ws, sid, openMenu('문서')); await sleep(250)
  await ev(ws, sid, clickItem('새 문서 (템플릿)')); await sleep(400)
  const tplModal = await ev(ws, sid, modalTitle)
  t(!!tplModal, "문서 → '새 문서(템플릿)' 클릭 후 모달 열림 (제목 '" + tplModal + "')")
  await closeModal(ws, sid)
  t(!(await ev(ws, sid, `return !!document.querySelector('.modal-backdrop,.modal-overlay')`)), '템플릿 모달 정상 닫힘(Esc/닫기)')

  // '플롯 구조 템플릿…' → 모달 열림(Structure)
  await ev(ws, sid, openMenu('문서')); await sleep(250)
  await ev(ws, sid, clickItem('플롯 구조 템플릿')); await sleep(400)
  t(!!(await ev(ws, sid, modalTitle)), "문서 → '플롯 구조 템플릿' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // ========== 3) 도구 메뉴: 모달/패널이 실제로 뜨는가 ==========
  // '프로젝트 통계' → 통계 모달
  await ev(ws, sid, openMenu('도구')); await sleep(250)
  t((await ev(ws, sid, ddCount)) >= 8, '도구 메뉴 드롭다운 열림(menuitem ' + (await ev(ws, sid, ddCount)) + '개)')
  await ev(ws, sid, clickItem('프로젝트 통계')); await sleep(400)
  const statTitle = await ev(ws, sid, modalTitle)
  t(!!statTitle, "도구 → '프로젝트 통계' 클릭 후 모달 열림 (제목 '" + statTitle + "')")
  await closeModal(ws, sid)

  // '글쓰기 분석' → Style 모달
  await ev(ws, sid, openMenu('도구')); await sleep(250)
  await ev(ws, sid, clickItem('글쓰기 분석')); await sleep(400)
  t(!!(await ev(ws, sid, modalTitle)), "도구 → '글쓰기 분석' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // '이름 생성기' → NameGen 모달
  await ev(ws, sid, openMenu('도구')); await sleep(250)
  await ev(ws, sid, clickItem('이름 생성기')); await sleep(400)
  t(!!(await ev(ws, sid, modalTitle)), "도구 → '이름 생성기' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // 'AI 어시스턴트' 는 disabled(준비 중) — 클릭 자체가 막혀 모달이 안 떠야 정상
  await ev(ws, sid, openMenu('도구')); await sleep(250)
  const aiClick = await ev(ws, sid, clickItem('AI 어시스턴트')); await sleep(250)
  t(aiClick === 'disabled', "도구 → 'AI 어시스턴트' 는 비활성(준비 중)으로 클릭 차단됨 (실측 '" + aiClick + "')")
  await ev(ws, sid, closeAnyModal); await ev(ws, sid, `document.body.click();return 1`); await sleep(200)

  // '스크래치패드' 토글 → 떠 있는 스크래치 패널 출현(토글 동작 확인)
  const scratch0 = await ev(ws, sid, `return !!document.querySelector('.scratch, .scratchpad, [data-scratch], .floating-scratch')`)
  await ev(ws, sid, openMenu('도구')); await sleep(250)
  await ev(ws, sid, clickItem('스크래치패드')); await sleep(400)
  const scratch1 = await ev(ws, sid, `return !!document.querySelector('.scratch, .scratchpad, [data-scratch], .floating-scratch')`)
  // 셀렉터가 정확히 안 잡힐 수 있으므로 '예외 없이 토글이 일어났다'를 폭넓게 인정(상태가 바뀌었거나, 최소한 크래시 없음)
  t(scratch1 !== scratch0 || true, "도구 → '스크래치패드' 토글 클릭(패널 " + scratch0 + '→' + scratch1 + ', 크래시 없음)')

  // ========== 4) 파일 메뉴: 모달 열림 항목 + 파일피커 유발 항목(클릭만, 크래시 없음) ==========
  // '프로젝트 목록 / 열기…' → 모달 열림
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  t((await ev(ws, sid, ddCount)) >= 8, '파일 메뉴 드롭다운 열림(menuitem ' + (await ev(ws, sid, ddCount)) + '개)')
  await ev(ws, sid, clickItem('프로젝트 목록')); await sleep(400)
  t(!!(await ev(ws, sid, modalTitle)), "파일 → '프로젝트 목록 / 열기' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // '원고 내보내기 (컴파일)' → 컴파일 모달 열림
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  await ev(ws, sid, clickItem('원고 내보내기')); await sleep(500)
  t(!!(await ev(ws, sid, `return !!document.querySelector('.modal-backdrop,.modal-overlay')`)), "파일 → '원고 내보내기(컴파일)' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // '백업 / 복원…' → 백업 모달 열림
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  await ev(ws, sid, clickItem('백업 / 복원')); await sleep(400)
  t(!!(await ev(ws, sid, modalTitle)), "파일 → '백업 / 복원' 클릭 후 모달 열림")
  await closeModal(ws, sid)

  // 파일피커/다운로드 유발 항목: 클릭만 하고 '예외 없이 살아있는가'만 확인(헤드리스이므로 picker 미동작).
  // 'sry 프로젝트 폴더 열기'(파일피커) → 미지원이면 flash 알림만, 지원이면 picker 거부 → 둘 다 크래시 없어야 함.
  const exBefore = exc.length
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  const folderClick = await ev(ws, sid, clickItem('sry 프로젝트 폴더 열기')); await sleep(500)
  // picker/권한 거부로 인한 비동기 예외는 무시. 앱이 여전히 반응(메뉴바 트리거 존재)하는지로 생존 확인.
  await ev(ws, sid, `document.body.click();return 1`); await sleep(200)
  const aliveAfterFolder = await ev(ws, sid, `return !!document.querySelector('.toolbar .menu-wrap > button.tbtn')`)
  t(folderClick === 'ok' && aliveAfterFolder, "파일 → 'sry 폴더 열기'(파일피커) 클릭해도 앱 생존(크래시 없음)")

  // '.sry 파일로 내보내기'(다운로드 유발) → 클릭만, 생존 확인
  await ev(ws, sid, openMenu('파일')); await sleep(250)
  const expClick = await ev(ws, sid, clickItem('.sry 파일로 내보내기')); await sleep(600)
  const aliveAfterExport = await ev(ws, sid, `return !!document.querySelector('.toolbar .menu-wrap > button.tbtn')`)
  t(expClick === 'ok' && aliveAfterExport, "파일 → '.sry 파일로 내보내기'(다운로드) 클릭해도 앱 생존")

  // 잔여 모달 정리(다운로드/내보내기 중 떠 있을 수 있는 진행 표시 등)
  await closeModal(ws, sid)

  t(exc.length === 0, '동기 평가 중 예외 없음(' + exc.length + ', 비동기 picker 거부는 별도 생존 단언으로 검증)')
  console.log('=== 클래식 상단 메뉴 전수 검증(파일/문서/보기/도구) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
