// 저장/복원 라이프사이클 검증 — '실제로' 편집→자동저장→새로고침 후 IDB 영속 유지,
// 프로젝트 목록 모달, 백업/복원(지금 백업→복원), 빈 프로젝트 전환(전환 모달 '그냥 전환')을
// DOM 클릭/상태로 일으키고 그 '효과'(localStorage·IDB·window.__scriv·모달 변화)를 단언한다.
// 소스: src/App.tsx(autosave/requestSwitch/openProjectById), BackupModal.tsx, ProjectListModal.tsx.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// 환영모달 닫기 + 안정화(자동저장이 흐를 시간을 약간 준다)
const dismissWelcome = (ws, sid) => ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`)
// 모달이 떠 있다면 닫는다(이전 단계 잔류 방지)
const closeAnyModal = (ws, sid) => ev(ws, sid, `const b=[...document.querySelectorAll('.modal-foot button,.modal button')].find(x=>/^닫기$/.test((x.textContent||'').trim()));if(b)b.click();return 1`)
// 파일 메뉴 열고 라벨로 메뉴아이템 클릭(실제 메뉴 인터랙션)
const openFileMenu = () => `(()=>{const m=[...document.querySelectorAll('.toolbar .tbtn,.menu-wrap .tbtn,button')].find(b=>(b.textContent||'').trim()==='파일');if(!m)return'no-file-menu';m.click();return'ok'})()`
const clickMenuItem = (label) => `(()=>{const it=[...document.querySelectorAll('.dropdown button[role=menuitem]')].find(b=>(b.textContent||'').includes(${JSON.stringify(label)}));if(!it)return'no-item';it.click();return'ok'})()`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await dismissWelcome(ws, sid); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // ---------------------------------------------------------------------------
  // [1] 자동저장 → 새로고침 → IDB 영속 유지 (라이프사이클 핵심)
  // ---------------------------------------------------------------------------
  // 활성(혹은 첫 텍스트) 문서를 잡고 고유 마커 본문을 RTF 로 심는다.
  // 본문은 setBodyRtf 가 받은 문자열을 그대로 bodyRtf 로 보관하므로(파싱 없이 영속),
  // 마커 부분문자열만 살아 있으면 includes 로 영속 여부를 정확히 검증할 수 있다.
  const MARK = 'SAVECYCLE-MARK-' + Date.now()
  const RTF = '{\\rtf1\\ansi\\deff0 ' + MARK + '\\par}' // 최소 유효 RTF + 마커
  const seed = await ev(ws, sid, `
    const id = window.__scriv.setBody(${JSON.stringify(RTF)});
    const s = window.__scriv.state();
    return { id, projId: s.id };`)
  t(!!(seed && seed.id), '편집 대상 문서 확보(__scriv.setBody → docId=' + (seed && seed.id) + ')')
  const docId = seed && seed.id, projId = seed && seed.projId
  // 본문이 즉시 스토어에 반영됐는지(편집 효과)
  const bodyNow = await ev(ws, sid, `return window.__scriv.bodyOf(${JSON.stringify(docId)})`)
  t((bodyNow || '').includes(MARK), '편집 즉시 반영: bodyOf 에 마커 존재(스토어 커밋)')

  // 자동저장 디바운스(기본 1500ms) 통과 + setLastProjectId 까지 충분히 대기
  await sleep(2600)
  // localStorage 의 마지막 프로젝트 id 가 현재 프로젝트로 기록됐는지(setLastProjectId 효과)
  const lastId = await ev(ws, sid, `try{return localStorage.getItem('sry:lastProjectId')||localStorage.getItem('scriv:lastProjectId')||''}catch(e){return 'ERR'}`)
  t(!!lastId && lastId !== 'ERR', '자동저장 후 마지막 프로젝트 id 가 localStorage 에 기록됨("' + lastId + '")')

  // 진짜 새로고침(IDB 에서 재로딩 — 메모리 상태가 아니라 디스크 영속을 본다)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3800)
  await dismissWelcome(ws, sid); await sleep(400)
  // 재로딩이 같은 프로젝트를 복원했는지 + 같은 문서의 본문 마커가 살아있는지
  const afterReload = await ev(ws, sid, `
    const s = window.__scriv.state();
    const body = window.__scriv.bodyOf(${JSON.stringify(docId)});
    return { projId: s.id, hasDoc: !!window.__scriv.entries().find(e=>e.id===${JSON.stringify(docId)}), body };`)
  t(afterReload && afterReload.projId === projId, '새로고침 후 같은 프로젝트 복원(id 일치: ' + (afterReload && afterReload.projId === projId) + ')')
  t(!!(afterReload && afterReload.hasDoc), '새로고침 후 같은 문서가 바인더에 존재(IDB 영속)')
  t(!!(afterReload && (afterReload.body || '').includes(MARK)), '새로고침 후 본문 마커 유지 — IDB 자동저장 영속 확인(핵심)')

  // ---------------------------------------------------------------------------
  // [2] 프로젝트 목록 모달 — 열기 + 현재 프로젝트 표시
  // ---------------------------------------------------------------------------
  await ev(ws, sid, openFileMenu()); await sleep(250)
  await ev(ws, sid, clickMenuItem('프로젝트 목록')); await sleep(500)
  const plist = await ev(ws, sid, `
    const m=[...document.querySelectorAll('.modal')].find(x=>/프로젝트 목록/.test(x.querySelector('h2')?.textContent||''));
    if(!m) return { open:false };
    const cur = m.querySelector('.snap-item .snap-meta')?.textContent||'';
    const curBody = [...m.querySelectorAll('.snap-item')].map(n=>n.textContent||'').join(' | ');
    return { open:true, showsCurrent:/현재 열림/.test(curBody), text: curBody.slice(0,120) };`)
  t(plist && plist.open, '프로젝트 목록 모달이 열림(파일 메뉴 → 프로젝트 목록)')
  t(!!(plist && plist.showsCurrent), '프로젝트 목록에 "현재 열림" 항목 표시(현재 프로젝트 노출)')
  await closeAnyModal(ws, sid); await sleep(300)

  // ---------------------------------------------------------------------------
  // [3] 백업/복원 모달 — 지금 백업(개수 증가) → 복원(왕복)
  // ---------------------------------------------------------------------------
  // 백업 전 이 프로젝트의 백업 개수(이 프로젝트 섹션 행 수)를 센다.
  await ev(ws, sid, openFileMenu()); await sleep(250)
  await ev(ws, sid, clickMenuItem('백업 / 복원')); await sleep(550)
  const backupOpen = await ev(ws, sid, `return /백업/.test([...document.querySelectorAll('.modal h2')].map(h=>h.textContent).join(' '))?1:0`)
  t(!!backupOpen, '백업/복원 모달이 열림(파일 메뉴 → 백업/복원)')

  const countMineRows = `(()=>{
    const m=[...document.querySelectorAll('.modal')].find(x=>/백업/.test(x.querySelector('h2')?.textContent||''));
    if(!m) return -1;
    // "이 프로젝트" 라벨 이후, "다른 프로젝트" 라벨 이전까지의 snap-item 만 센다.
    const kids=[...m.querySelector('.modal-body').children];
    let counting=false,n=0;
    for(const el of kids){
      const tx=(el.textContent||'').trim();
      if(/^이 프로젝트$/.test(tx)){counting=true;continue;}
      if(/^다른 프로젝트$/.test(tx)){counting=false;continue;}
      if(counting && el.classList.contains('snap-item')) n++;
    }
    return n;
  })()`
  const before = await ev(ws, sid, `return ${countMineRows}`)
  // '지금 백업' 클릭
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button')].find(x=>/^지금 백업$/.test((x.textContent||'').trim()));if(b)b.click();return 1`)
  await sleep(1200) // saveBackup(되읽기 검증 포함) + refresh
  const after = await ev(ws, sid, `return ${countMineRows}`)
  t(typeof before==='number' && typeof after==='number' && after >= before + 1 && after > 0,
    '"지금 백업" 후 이 프로젝트 백업 행 증가(' + before + ' → ' + after + ')')
  // 백업 성공 메시지 노출
  const bmsg = await ev(ws, sid, `const m=[...document.querySelectorAll('.modal')].find(x=>/백업/.test(x.querySelector('h2')?.textContent||''));return m?(/백업했습니다/.test(m.textContent||'')?1:0):0`)
  t(!!bmsg, '백업 성공 안내 메시지 표시("…백업했습니다")')

  // 복원: window.confirm 을 자동 수락하도록 덮어쓰고, 첫 '복원' 버튼 클릭 → 모달 닫힘(같은 프로젝트 복원)
  await ev(ws, sid, `window.__origConfirm=window.confirm;window.confirm=()=>true;return 1`)
  await ev(ws, sid, `const m=[...document.querySelectorAll('.modal')].find(x=>/백업/.test(x.querySelector('h2')?.textContent||''));const b=m&&[...m.querySelectorAll('.snap-actions .minibtn')].find(x=>/^복원$/.test((x.textContent||'').trim()));if(b)b.click();return b?1:0`)
  await sleep(1200) // saveBackup(현재본 보관)+loadBackup+applySryAux
  await ev(ws, sid, `if(window.__origConfirm)window.confirm=window.__origConfirm;return 1`)
  const restored = await ev(ws, sid, `
    const stillBackup = [...document.querySelectorAll('.modal h2')].some(h=>/백업/.test(h.textContent||''));
    const s = window.__scriv.state();
    const body = window.__scriv.bodyOf(${JSON.stringify(docId)});
    return { modalClosed: !stillBackup, projId: s.id, hasMark: (body||'').includes(${JSON.stringify(MARK)}), dirty: s.dirty };`)
  t(!!(restored && restored.modalClosed), '복원 실행 후 백업 모달이 닫힘(loadProject 완료)')
  t(!!(restored && restored.projId === projId && restored.hasMark),
    '복원 왕복: 같은 프로젝트·본문 마커 유지(백업→복원 무결)')
  await closeAnyModal(ws, sid); await sleep(300)

  // ---------------------------------------------------------------------------
  // [4] 빈 프로젝트 전환 — 전환 확인 모달 → '그냥 전환' → 새 빈 프로젝트로 교체
  // ---------------------------------------------------------------------------
  const beforeSwitch = await ev(ws, sid, `const s=window.__scriv.state();return { id:s.id, items:s.items }`)
  await ev(ws, sid, openFileMenu()); await sleep(250)
  await ev(ws, sid, clickMenuItem('빈 프로젝트로 시작')); await sleep(500)
  // requestSwitch 가 띄운 '프로젝트 전환' 확인 모달 존재 확인
  const switchAsk = await ev(ws, sid, `return [...document.querySelectorAll('.modal h2')].some(h=>/프로젝트 전환/.test(h.textContent||''))?1:0`)
  t(!!switchAsk, '빈 프로젝트 메뉴 → "프로젝트 전환" 확인 모달 표시')
  // '그냥 전환' 클릭(파일 내보내기 없이 진행)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button')].find(x=>/^그냥 전환$/.test((x.textContent||'').trim()));if(b)b.click();return b?1:0`)
  await sleep(1500) // newProject + idbSave + setLastProjectId
  const afterSwitch = await ev(ws, sid, `const s=window.__scriv.state();const body=window.__scriv.bodyOf(${JSON.stringify(docId)});return { id:s.id, items:s.items, oldDocBody: body }`)
  t(!!(afterSwitch && afterSwitch.id && afterSwitch.id !== beforeSwitch.id),
    '"그냥 전환" 후 프로젝트 id 가 새 빈 프로젝트로 교체(' + (beforeSwitch && beforeSwitch.id) + ' → ' + (afterSwitch && afterSwitch.id) + ')')
  t(!!(afterSwitch && !(afterSwitch.oldDocBody || '').includes(MARK)),
    '전환 후 이전 프로젝트 문서/본문이 현재 메모리에 더 이상 없음(전환 격리)')

  // 전환된 빈 프로젝트가 새로고침에도 영속되는지(마지막 프로젝트 id 갱신 확인)
  await sleep(400)
  const newLastId = await ev(ws, sid, `try{return localStorage.getItem('sry:lastProjectId')||localStorage.getItem('scriv:lastProjectId')||''}catch(e){return 'ERR'}`)
  t(newLastId === (afterSwitch && afterSwitch.id), '전환 후 새 프로젝트가 마지막 프로젝트로 영속(setLastProjectId)')

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 저장/복원 라이프사이클 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
