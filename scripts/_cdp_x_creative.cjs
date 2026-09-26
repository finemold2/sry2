// 창작 스튜디오 + 장르별 도구함 — 실사용자 인터랙션 베타(QA/UX).
// '코드리뷰'가 아니라 실제로 모달을 열고, 생성기를 재생성하고, 칩/결과를 복사하고,
// 카테고리를 전환하고, 빈/로딩 상태와 포커스·Esc 같은 '상식적으로 당연한' 동작을 단언으로 검증한다.
// 위반 시 console.log('[ISSUE] ...') 출력 + 실패 카운트. 작성 전용(실행 금지). node --check 통과.
const HUB = 'http://localhost:9222'
const URL = 'http://localhost:4178/'
let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) {
  return new Promise((res, rej) => {
    const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid
    const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }
    ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('timeout@' + m)), 15000)
  })
}
// 페이지 평가: 본문을 (()=>{ ... })() 로 감싸 실행. returnByValue + awaitPromise.
async function ev(ws, sid, body) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + body + '})()', returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('PAGE:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '').split('\n')[0])
  return r.result && r.result.value
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  // 타깃 직접 생성(about:blank+navigate 금지) + flatten attach
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: URL })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // 콘솔/예외 캡처(클릭·입력만 하므로 Runtime.enable 안전 — 포인터 드래그 없음)
  const pageExceptions = []; const consoleErrors = []
  ws.addEventListener('message', (e) => {
    let d; try { d = JSON.parse(e.data) } catch { return }
    if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') {
      const ex = d.params.exceptionDetails
      pageExceptions.push(((ex && ex.exception && ex.exception.description) || (ex && ex.text) || 'exception').split('\n')[0])
    }
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      const a = (d.params.args || []).map((x) => x.value || x.description || '').join(' ')
      consoleErrors.push(a.slice(0, 160))
    }
  })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 클립보드 권한 부여 → 복사 토스트가 '복사됨'으로 정상 동작(헤드리스 거부 방지)
  try { await rpc(ws, 'Browser.grantPermissions', { origin: URL.replace(/\/$/, ''), permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }) } catch { /* 선택적 */ }

  const ok = [], bad = []
  // 단언 헬퍼: 통과/실패 기록 + 위반 시 [ISSUE] 출력(실패로 카운트). 예외도 실패 처리.
  const T = async (msg, fn) => {
    let c = false; let err = ''
    try { c = await fn() } catch (e) { c = false; err = ' (' + e.message + ')' }
    if (c) ok.push(msg)
    else { bad.push(msg); console.log('[ISSUE] ' + msg + err) }
    return c
  }

  // ---- 앱 로드 + 훅 준비 + 환영/투어 닫기 ----
  let ready = false
  for (let i = 0; i < 40; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setModal==='function'&&typeof window.__openTool==='function'")) { ready = true; break } } catch { /* 로딩 중 */ } }
  await T('앱 로드 + 테스트 훅(__setModal/__openTool) 준비', async () => ready)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // ============================================================
  // A. 창작 스튜디오 (modal 'creative' — lazy/Suspense)
  // ============================================================
  await ev(ws, sid, "window.__setModal&&window.__setModal('creative');return 1")
  // 지연 로딩 완료 대기: .modal.creative-studio 가 뜨고 로딩 폴백이 사라질 때까지
  let csUp = false
  for (let i = 0; i < 30; i++) { await sleep(300); try { if (await ev(ws, sid, "return !!document.querySelector('.modal.creative-studio')")) { csUp = true; break } } catch { /* */ } }
  await T('창작 스튜디오 지연 로딩 완료(.creative-studio 렌더 · 로딩 폴백 사라짐)', async () => {
    if (!csUp) return false
    const stuck = await ev(ws, sid, "return /불러오는 중/.test((document.querySelector('.modal-overlay')||{}).textContent||'')")
    return !stuck
  })

  // 모달 열면 첫 입력(도구 검색)에 포커스가 가야 한다
  await T('모달 열림 시 첫 입력(도구 검색)에 포커스 이동', async () =>
    ev(ws, sid, "var a=document.activeElement;return !!(a&&a.closest('.cs-nav-search')&&a.tagName==='INPUT')"))

  // 나브(도구 목록)가 비어있지 않아야 한다 + 총 도구 수 표시(2,000+급)
  await T('나브 그룹/도구 목록 비어있지 않음(그룹 ≥ 5 · 총 도구 수 표시 > 100)', async () => {
    const groups = await ev(ws, sid, "return document.querySelectorAll('.cs-nav-group').length")
    const total = await ev(ws, sid, "var c=document.querySelector('.cs-count');var m=(c&&c.textContent||'').match(/([0-9,]+)/);return m?parseInt(m[1].replace(/,/g,''),10):0")
    return groups >= 5 && total > 100
  })

  // ---- 아이디어 생성기 ----
  await ev(ws, sid, "var t=[].slice.call(document.querySelectorAll('.cs-nav-group-title')).filter(function(b){var n=b.querySelector('.cs-nav-group-name');return n&&n.textContent.trim()==='아이디어 생성기'})[0];if(t&&t.getAttribute('aria-expanded')!=='true')t.click();return 1"); await sleep(350)
  const genName = await ev(ws, sid, "var g=[].slice.call(document.querySelectorAll('.cs-nav-group')).filter(function(x){var n=x.querySelector('.cs-nav-group-name');return n&&n.textContent.trim()==='아이디어 생성기'})[0];if(!g)return '';var it=g.querySelector('.cs-nav-item');if(!it)return '';it.click();return (it.textContent||'').trim()"); await sleep(450)
  await T('아이디어 생성기 선택 → 생성기 패널 렌더(다시 생성 버튼 + 결과 목록)', async () => {
    const hasBtn = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.cs-panel button')).some(function(x){return /다시 생성/.test(x.textContent||'')})")
    const n = await ev(ws, sid, "return document.querySelectorAll('.cs-panel .cs-gen-item').length")
    return hasBtn && n >= 1
  })
  const genHead = await ev(ws, sid, "return ((document.querySelector('.cs-panel .cs-head h3')||{}).textContent||'').trim()")

  await T('‘다시 생성’ 클릭 시 새 결과가 나온다(결과 텍스트 변동)', async () => {
    const read = () => ev(ws, sid, "return [].slice.call(document.querySelectorAll('.cs-panel .cs-gen-item')).map(function(e){return e.textContent}).join('|')")
    const first = await read(); if (!first) return false
    for (let k = 0; k < 6; k++) {
      await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.cs-panel button')).filter(function(x){return /다시 생성/.test(x.textContent||'')})[0];if(b)b.click();return 1")
      await sleep(180)
      const now = await read(); if (now && now !== first) return true
    }
    return false
  })

  await T('생성 결과 클릭 시 복사 피드백(.cs-flash) 표시', async () => {
    await ev(ws, sid, "var it=document.querySelector('.cs-panel .cs-gen-item');if(it)it.click();return 1")
    await sleep(250)
    return ev(ws, sid, "return /복사/.test((document.querySelector('.cs-flash')||{}).textContent||'')")
  })

  // ---- 단어 은행 ----
  await ev(ws, sid, "var t=[].slice.call(document.querySelectorAll('.cs-nav-group-title')).filter(function(b){var n=b.querySelector('.cs-nav-group-name');return n&&n.textContent.trim()==='단어 은행 (클릭 복사)'})[0];if(t&&t.getAttribute('aria-expanded')!=='true')t.click();return 1"); await sleep(350)
  await ev(ws, sid, "var g=[].slice.call(document.querySelectorAll('.cs-nav-group')).filter(function(x){var n=x.querySelector('.cs-nav-group-name');return n&&n.textContent.trim()==='단어 은행 (클릭 복사)'})[0];if(g){var it=g.querySelector('.cs-nav-item');if(it)it.click()}return 1"); await sleep(450)
  await T('단어 은행 선택 → 칩(.cs-chip) 비어있지 않음(≥ 3) + 카테고리 헤더(≥ 1)', async () => {
    const chips = await ev(ws, sid, "return document.querySelectorAll('.cs-panel .cs-chip').length")
    const cats = await ev(ws, sid, "return document.querySelectorAll('.cs-panel .cs-sub').length")
    return chips >= 3 && cats >= 1
  })
  const wbHead = await ev(ws, sid, "return ((document.querySelector('.cs-panel .cs-head h3')||{}).textContent||'').trim()")

  await T('카테고리(도구) 전환 동작 — 생성기↔단어은행 패널 제목이 바뀐다', async () => {
    const active = await ev(ws, sid, "return ((document.querySelector('.cs-nav-item.active')||{}).textContent||'').trim()")
    return !!genHead && !!wbHead && genHead !== wbHead && active.indexOf(wbHead) >= 0
  })

  await T('단어 칩 클릭 시 복사 피드백(.cs-flash) 표시', async () => {
    await ev(ws, sid, "var c=document.querySelector('.cs-panel .cs-chip');if(c)c.click();return 1")
    await sleep(250)
    return ev(ws, sid, "return /복사/.test((document.querySelector('.cs-flash')||{}).textContent||'')")
  })

  // ---- 작법 가이드 ----
  await ev(ws, sid, "var grp=[].slice.call(document.querySelectorAll('.cs-nav-group')).filter(function(x){var n=x.querySelector('.cs-nav-group-name');return n&&n.textContent.indexOf('작법')>=0})[0];if(grp){var t=grp.querySelector('.cs-nav-group-title');if(t&&t.getAttribute('aria-expanded')!=='true')t.click()}return 1"); await sleep(350)
  await ev(ws, sid, "var grp=[].slice.call(document.querySelectorAll('.cs-nav-group')).filter(function(x){var n=x.querySelector('.cs-nav-group-name');return n&&n.textContent.indexOf('작법')>=0})[0];if(grp){var it=grp.querySelector('.cs-nav-item');if(it)it.click()}return 1"); await sleep(450)
  await T('작법 가이드 선택 → 가이드 목록(.cs-guide-list li) 비어있지 않음', async () =>
    (await ev(ws, sid, "return document.querySelectorAll('.cs-panel .cs-guide-list li').length")) >= 1)

  // ---- 빈 상태: 검색 결과 없음 안내 ----
  await T('도구 검색에 없는 단어 입력 → ‘검색 결과가 없습니다’ 빈 상태 안내', async () => {
    await ev(ws, sid, "var i=document.querySelector('.cs-nav-search input');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'zzqqxx없는도구명');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1")
    await sleep(350)
    return ev(ws, sid, "return !!document.querySelector('.cs-nav-empty')")
  })
  await T('검색 지우기(X) 후 도구 목록 복원(그룹 다시 표시)', async () => {
    await ev(ws, sid, "var b=document.querySelector('.cs-nav-clear');if(b)b.click();return 1")
    await sleep(300)
    return (await ev(ws, sid, "return document.querySelectorAll('.cs-nav-group').length")) >= 5
  })

  // ---- Esc 로 닫힘 ----
  await T('Esc 로 창작 스튜디오 닫힘', async () => {
    await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1")
    await sleep(400)
    return !(await ev(ws, sid, "return !!document.querySelector('.modal.creative-studio')"))
  })

  // ============================================================
  // B. 장르별 도구함 (modal 'genrebox')
  // ============================================================
  await ev(ws, sid, "window.__setModal&&window.__setModal('genrebox');return 1"); await sleep(600)
  const gbSel = "var m=[].slice.call(document.querySelectorAll('.modal')).filter(function(x){return x.querySelector('.genre-tab')})[0];"
  await T('장르별 도구함 열림(.genre-tab 탭 렌더)', async () =>
    ev(ws, sid, gbSel + "return !!m"))

  await T('장르 도구함 열림 시 포커스가 모달 안으로 이동', async () =>
    ev(ws, sid, "var a=document.activeElement;var m=a&&a.closest&&a.closest('.modal');return !!(m&&m.querySelector('.genre-tab'))"))

  await T('도구 카드 목록 비어있지 않음(.toolhub-card ≥ 1) — 공통 도구 노출', async () =>
    (await ev(ws, sid, gbSel + "return m?m.querySelectorAll('.toolhub-card').length:0")) >= 1)

  await T('다른 장르 탭 클릭 시 활성 탭이 바뀐다(카테고리 전환)', async () => {
    const before = await ev(ws, sid, gbSel + "var a=m&&m.querySelector('.genre-tab.active');return a?(a.textContent||'').trim():''")
    await ev(ws, sid, gbSel + "if(m){var tabs=[].slice.call(m.querySelectorAll('.genre-tab'));var other=tabs.filter(function(t){return !t.classList.contains('active')})[0];if(other)other.click()}return 1")
    await sleep(350)
    const after = await ev(ws, sid, gbSel + "var a=m&&m.querySelector('.genre-tab.active');return a?(a.textContent||'').trim():''")
    return !!before && !!after && before !== after
  })

  await T('장르 도구 검색에 없는 단어 → ‘검색 결과가 없습니다.’ 빈 상태', async () => {
    await ev(ws, sid, gbSel + "if(m){var i=m.querySelector('input.field');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'zzqqxx없는도구');i.dispatchEvent(new Event('input',{bubbles:true}))}}return 1")
    await sleep(350)
    return ev(ws, sid, gbSel + "return /검색 결과가 없습니다/.test((m&&m.textContent)||'')")
  })

  await T('Esc 로 장르 도구함 닫힘', async () => {
    await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1")
    await sleep(400)
    return !(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal')).some(function(x){return x.querySelector('.genre-tab')})"))
  })

  // ---- 장르 도구함에서 도구 열기 → 즐겨찾기 ----
  await ev(ws, sid, "window.__setModal&&window.__setModal('genrebox');return 1"); await sleep(600)
  await ev(ws, sid, gbSel + "if(m){var c=m.querySelector('.toolhub-card');if(c)c.click()}return 1"); await sleep(900)
  await T('장르 도구함의 도구 카드 클릭 → 도구 창 열림 + 도구함 모달 닫힘', async () => {
    const win = await ev(ws, sid, "return !!document.querySelector('.toolwin')")
    const gbGone = !(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal')).some(function(x){return x.querySelector('.genre-tab')})"))
    return win && gbGone
  })

  await T('연 도구 창의 ★(즐겨찾기) 클릭 시 즐겨찾기 영속 저장(sry:favorites)', async () => {
    const toolId = await ev(ws, sid, "var w=document.querySelector('.toolwin');return w?(w.getAttribute('data-tool-id')||''):''")
    if (!toolId) return false
    // 아직 즐겨찾기가 아닐 때만 클릭(이미 등록돼 있으면 토글로 해제되는 것 방지)
    await ev(ws, sid, "var b=document.querySelector(\".toolwin button[aria-label='즐겨찾기']\");if(b){var t=b.getAttribute('title')||'';if(t.indexOf('해제')<0)b.click();}return 1")
    await sleep(350)
    return ev(ws, sid, "try{var a=JSON.parse(localStorage.getItem('sry:favorites')||'[]');return a.some(function(f){return (f.id||'')==='tool:" + toolId + "'})}catch(e){return false}")
  })

  // ---- 조작 중 페이지 예외(크래시) 없음 ----
  await T('전 과정 조작 중 페이지 예외(크래시) 없음', async () => pageExceptions.length === 0)

  // ---- 결과 ----
  console.log('=== 창작 스튜디오 + 장르 도구함 실사용 베타 ===')
  ok.forEach((m) => console.log('  ✓ ' + m))
  bad.forEach((m) => console.log('  ✗ ' + m))
  if (pageExceptions.length) console.log('페이지 예외 ' + pageExceptions.length + '건: ' + pageExceptions.slice(0, 5).join(' | '))
  if (consoleErrors.length) console.log('콘솔 에러 ' + consoleErrors.length + '건(참고): ' + consoleErrors.slice(0, 5).join(' | '))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
