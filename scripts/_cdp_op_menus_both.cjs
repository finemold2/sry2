// 메뉴 전수 실동작 검증(양 스킨) — 클래식 .toolbar 와 스튜디오 .st-menubar 의
// 파일/문서/도구/보기 드롭다운을 실제로 열고 항목을 클릭해 '조작→효과'(모달 출현·바인더 항목 +1·
// 뷰 전환 컨테이너 출현·localStorage/스토어 반영)를 본다. 스튜디오에선 드롭다운 항목이 본문에
// 가려지지 않고(elementFromPoint) 실제로 보이고 클릭되는지(.dropdown>button)까지 단언한다.
// 소스: src/App.tsx studioMenus/classic Menu, src/components/StudioShell.tsx StudioMenu.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 노트북급 뷰포트 고정(드롭다운 가림 판정 기준; 기본 타깃 크기는 600px 높이라 긴 메뉴가 스크롤 영역으로 들어간다)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sid)
  await sleep(3800)
  const ok = [], bad = [], notes = []; const t = (c, m) => (c ? ok : bad).push(m)
  const E = (x) => ev(ws, sid, x)
  const KEY = async (k) => { // 물리 키 입력(Escape 등)
    const vk = k === 'Escape' ? 27 : 0
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid)
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid)
  }

  // 환영/투어 닫기
  await E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // ── 공용 조작 헬퍼(ev 표현식 문자열 생성) ──────────────────────────────
  const esc = (s) => s.replace(/'/g, "\\'")
  // scope(.toolbar | .st-menubar) 안에서 label 트리거를 클릭해 메뉴를 연다.
  const clickTrigger = (scope, label) => E(
    "var sc=document.querySelector('" + scope + "');if(!sc)return 'no-scope';" +
    "var b=[].slice.call(sc.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='" + esc(label) + "'});" +
    "if(!b)return 'no-trigger';b.click();return 'click';")
  const dropOpen = (scope) => E("return !!document.querySelector('" + scope + " .dropdown')")
  // 열린 드롭다운에서 label 로 시작하는 항목 클릭
  const clickItem = (scope, label) => E(
    "var d=document.querySelector('" + scope + " .dropdown');if(!d)return 'no-drop';" +
    "var b=[].slice.call(d.querySelectorAll('button')).find(function(x){return (x.textContent||'').replace(/\\s+/g,' ').trim().indexOf('" + esc(label) + "')===0});" +
    "if(!b)return 'no-item';if(b.disabled)return 'disabled';b.click();return 'clicked';")
  const modalPresent = () => E("return !!document.querySelector('.modal-backdrop,.modal-overlay')")
  const closeModal = async () => {
    await E("var bd=document.querySelector('.modal-backdrop,.modal-overlay');if(bd){var b=[].slice.call(bd.querySelectorAll('button')).find(function(x){return /닫기|취소|완료|×/.test(x.textContent||'')});if(b){b.click();return 1}}return 0"); await sleep(150)
    await KEY('Escape'); await sleep(120)
    await E("var bd=document.querySelector('.modal-backdrop');if(bd)bd.click();return 1"); await sleep(250)
  }
  const itemCount = () => E("return (window.__scriv&&window.__scriv.state().items)||0")
  const binderRows = () => E("return document.querySelectorAll('.binder-row').length")
  const ensureBinder = async (binderLabel) => {
    if (await binderRows() === 0) {
      await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('aria-label')||'')==='" + esc(binderLabel) + "'});if(b)b.click();return 1"); await sleep(350)
    }
  }

  // 한 스킨에 대한 메뉴 전수 검증 루틴
  async function runSkin(skin, scope, binderLabel) {
    const P = '[' + skin + '] '
    // 파일: 드롭다운 열림 → 백업/복원 → 모달
    await clickTrigger(scope, '파일'); await sleep(280)
    t(await dropOpen(scope), P + '파일 메뉴 드롭다운 열림')
    // (studio) 드롭다운 항목 가시성/비가림 검증
    if (skin === 'studio') {
      const occ = JSON.parse(await E("var d=document.querySelector('.st-menubar .dropdown');if(!d)return JSON.stringify({err:'no-drop'});var bad=[];[].slice.call(d.querySelectorAll('button:not([disabled])')).forEach(function(b){b.scrollIntoView({block:'nearest'});var r=b.getBoundingClientRect();if(r.width<1||r.height<1)return;var cx=r.left+r.width/2,cy=r.top+r.height/2;var el=document.elementFromPoint(cx,cy);if(!d.contains(el))bad.push((b.textContent||'').trim().slice(0,14)+'←'+(el?el.tagName+'.'+String(el.className||'').slice(0,24)+'@'+Math.round(cy):'null@'+Math.round(cy)))});return JSON.stringify({total:d.querySelectorAll('button').length,vis:d.querySelectorAll('button').length-bad.length,occluded:bad});"))
      t(!occ.err && occ.total > 5, P + '파일 드롭다운에 항목 다수 렌더(' + (occ.total || 0) + '개)')
      t(!occ.err && occ.occluded.length === 0, P + '드롭다운 항목이 본문에 가려지지 않고 클릭 가능(가림 ' + ((occ.occluded || []).length) + '개)')
      if (occ.occluded && occ.occluded.length) notes.push('[APP-BUG] studio 파일 드롭다운 항목이 본문에 가려 클릭 불가: ' + occ.occluded.join(', '))
    }
    let r = await clickItem(scope, '백업 / 복원'); await sleep(450)
    t(r === 'clicked' && await modalPresent(), P + '파일→백업/복원 클릭 시 모달 출현(' + r + ')')
    await closeModal()
    t(!(await modalPresent()), P + '모달 닫힘(다음 조작 가능)')

    // 문서: 새 텍스트 → 스토어 항목 +1 & 바인더 행 +1
    await ensureBinder(binderLabel)
    const before = await itemCount(); const rowsBefore = await binderRows()
    await clickTrigger(scope, '문서'); await sleep(280)
    t(await dropOpen(scope), P + '문서 메뉴 드롭다운 열림')
    r = await clickItem(scope, '새 텍스트'); await sleep(450)
    await KEY('Escape') // 새 항목 이름편집 모드 종료
    const after = await itemCount(); const rowsAfter = await binderRows()
    t(r === 'clicked' && after === before + 1, P + '문서→새 텍스트로 항목 +1(스토어 ' + before + '→' + after + ')')
    t(rowsAfter >= rowsBefore + 1, P + '바인더에 새 행 반영(' + rowsBefore + '→' + rowsAfter + ')')

    // 도구: 프로젝트 통계 → 모달
    await clickTrigger(scope, '도구'); await sleep(280)
    t(await dropOpen(scope), P + '도구 메뉴 드롭다운 열림')
    r = await clickItem(scope, '프로젝트 통계'); await sleep(450)
    t(r === 'clicked' && await modalPresent(), P + '도구→프로젝트 통계 클릭 시 모달 출현(' + r + ')')
    await closeModal()
    t(!(await modalPresent()), P + '통계 모달 닫힘')
  }

  // ── 클래식 스킨 ───────────────────────────────────────────────
  t(await E("return !!document.querySelector('.toolbar .menu-wrap')"), '[classic] 클래식 메뉴바 렌더')
  await runSkin('classic', '.toolbar', '바인더 토글')
  // 보기 메뉴: 코르크보드 → 뷰 컨테이너 전환(클래식 보기 메뉴엔 뷰 전환 항목 존재)
  await clickTrigger('.toolbar', '보기'); await sleep(280)
  t(await dropOpen('.toolbar'), '[classic] 보기 메뉴 드롭다운 열림')
  let rv = await clickItem('.toolbar', '코르크보드'); await sleep(450)
  t(rv === 'clicked' && await E("return !!document.querySelector('.corkboard')"), '[classic] 보기→코르크보드로 뷰 전환(.corkboard 출현)')
  // 에디터로 복귀
  await clickTrigger('.toolbar', '보기'); await sleep(220); await clickItem('.toolbar', '에디터'); await sleep(300)

  // ── 스튜디오 스킨으로 전환(데이터 보존, 같은 store) ──────────────
  await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('aria-label')||'')==='Studio UI 로 전환'});if(b)b.click();return 1"); await sleep(600)
  t(await E("return localStorage.getItem('sry:uiSkin')==='studio'"), '[studio] 스킨 전환 localStorage 영속(sry:uiSkin=studio)')
  t(await E("return !!document.querySelector('.studio-root') && !!document.querySelector('.st-menubar .menu-wrap')"), '[studio] 스튜디오 셸/메뉴바 렌더')
  // 스튜디오 첫 진입 시 뜨는 투어/스킨 코치 말풍선(.tour-bubble)이 드롭다운을 덮어 가림 판정을 오염 → 먼저 닫기
  await E("var b=[].slice.call(document.querySelectorAll('.tour-skip,.tour-bubble button,.modal button')).find(function(x){return /그만 보기|다시 보지|건너뛰기|닫기|시작하기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await runSkin('studio', '.st-menubar', '바인더')
  // 스튜디오 보기 메뉴: 명령 팔레트 → 모달(스튜디오 보기 드롭다운은 뷰전환 대신 액션 제공)
  await clickTrigger('.st-menubar', '보기'); await sleep(280)
  t(await dropOpen('.st-menubar'), '[studio] 보기 메뉴 드롭다운 열림')
  let rs = await clickItem('.st-menubar', '명령 팔레트'); await sleep(450)
  t(rs === 'clicked' && await modalPresent(), '[studio] 보기→명령 팔레트 클릭 시 팔레트 모달 출현(' + rs + ')')
  await closeModal()
  // 스튜디오 좌측 레일로 뷰 전환(스튜디오에선 뷰 전환이 레일 담당)
  await E("var b=[].slice.call(document.querySelectorAll('.st-rail-btn')).find(function(x){return (x.getAttribute('aria-label')||'')==='코르크보드'});if(b)b.click();return 1"); await sleep(450)
  t(await E("return !!document.querySelector('.corkboard')"), '[studio] 좌측 레일로 코르크보드 뷰 전환(.corkboard 출현)')

  console.log('=== 메뉴 전수 실동작 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  if (notes.length) { console.log('--- notes ---'); notes.forEach(n => console.log('  ! ' + n)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
