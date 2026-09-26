// 전역 떠있는 패널 패리티(클래식↔스튜디오) — 양 스킨에서 '도구/보기' 메뉴·전역 아이콘으로 패널을 실제로 열고
//   기본 상호작용(메모 추가·드래그·타이핑·타이머 시작/중지·글감 뽑기 등)을 한 뒤 닫는다.
//   클래식에서 되는 패널이 스튜디오에서도 실제로 도달+작동하는지 '조작→결과'로 단언한다. 누락 시 [PARITY-GAP].
//   대상 패널: 수집함(StashBox) · 스크래치패드 · 집필 스프린트 타이머 · 라이팅 프롬프트 · 퀵 레퍼런스 · 소리내어 읽기(TTS).
// 주의: 드래그(Input.dispatchMouseEvent)를 쓰므로 Runtime.enable 은 호출하지 않는다(콘솔에러 캡처 미사용).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// ── 공통 eval 스니펫 (스킨 무관) ──────────────────────────────────────────────
// 환영/투어 닫기
const CLOSE_WELCOME = "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"
// '도구' 메뉴 트리거 클릭(.menu-wrap 중 버튼 텍스트 '도구' — 클래식/스튜디오 동일 구조)
const OPEN_TOOLS_MENU = "var w=[].slice.call(document.querySelectorAll('.menu-wrap')).find(function(m){var b=m.querySelector('button');return b&&(b.textContent||'').trim()==='도구'});if(!w)return 'no-menu';w.querySelector('button').click();return 'opened'"
// 드롭다운 항목 클릭(라벨 부분일치). 못 찾으면 메뉴 닫고 no-item.
const clickDropItem = (label) => "var b=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return ((x.textContent||'').replace(/\\s+/g,' ')).indexOf('" + label + "')>=0});if(!b){document.body.click();return 'no-item';}b.click();return 'ok'"
// 패널 닫기(닫기 버튼 셀렉터, 닫혔는지 확인할 패널 셀렉터)
const closePanel = (btnSel, panelSel) => "var b=document.querySelector(\"" + btnSel + "\");if(b)b.click();return !document.querySelector(\"" + panelSel + "\")"
// 바인더가 보이도록 보장(없으면 바인더 토글 버튼 클릭)
const ENSURE_BINDER = "if(!document.querySelector('.binder')){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();}return !!document.querySelector('.binder')"
// 원고 폴더 펼치기(텍스트 문서가 트리에 나타나도록)
const EXPAND_DRAFT = "var rows=[].slice.call(document.querySelectorAll('.binder-row'));var f=rows.find(function(r){return /원고/.test(r.getAttribute('aria-label')||'')});if(f){var tx=window.__scriv.entries().find(function(e){return e.type==='text'});var has=rows.some(function(r){return (r.getAttribute('aria-label')||'')===(tx&&tx.title)});if(!has){var d=f.querySelector('.disclosure');if(d)d.click();}}return 1"
// 첫 텍스트 문서를 바인더에서 클릭해 활성화 + 본문(ASCII RTF)도 채움 → activeId 반환
const CLICK_TEXT_ROW = "var sc=window.__scriv;var tx=sc.entries().find(function(e){return e.type==='text'});if(!tx)return null;try{sc.setBody('{\\\\rtf1\\\\ansi\\\\deff0{\\\\fonttbl{\\\\f0 Calibri;}}\\\\f0 This is a parity read aloud test sentence. Second sentence here.}')}catch(e){};var row=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return (r.getAttribute('aria-label')||'')===tx.title});if(row)row.click();return sc.state().activeId"

async function openToolPanel(ws, sid, label) {
  if (await ev(ws, sid, OPEN_TOOLS_MENU) !== 'opened') return 'no-menu'
  await sleep(300)
  const r = await ev(ws, sid, clickDropItem(label))
  await sleep(400)
  return r
}

// ── 한 스킨 전체 검증 ────────────────────────────────────────────────────────
async function runSkin(ws, sid, skin, t, opened) {
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)

  // 활성 문서 보장(퀵 레퍼런스/소리내어 읽기 전제)
  await ev(ws, sid, ENSURE_BINDER); await sleep(200)
  await ev(ws, sid, EXPAND_DRAFT); await sleep(250)
  const activeId = await ev(ws, sid, CLICK_TEXT_ROW); await sleep(250)
  t(!!activeId, '[' + skin + '] 활성 텍스트 문서 설정(바인더 클릭) activeId=' + activeId)

  // ── 1) 수집함(StashBox) — 전역 아이콘 ──
  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(450)
  const stashOpen = await ev(ws, sid, "return !!document.querySelector('.stash-win')")
  opened.stash = opened.stash || {}; opened.stash[skin] = stashOpen
  t(stashOpen, '[' + skin + '] 수집함 아이콘(.stash-icon) 클릭 → 창(.stash-win) 열림')
  const hasCanvas = await ev(ws, sid, "return !!document.querySelector('.stash-canvas')")
  t(hasCanvas, '[' + skin + '] 수집함 캔버스(.stash-canvas) 표시')
  if (stashOpen && hasCanvas) {
    const cnt0 = await ev(ws, sid, "return document.querySelectorAll('.stash-item').length")
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'').indexOf('메모 추가')===0});if(b)b.click();return 1"); await sleep(300)
    await ev(ws, sid, "var t=document.querySelector('.stash-memo-edit');if(t){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(t,'패리티메모');t.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(150)
    const cb = JSON.parse(await ev(ws, sid, "var c=document.querySelector('.stash-canvas');var r=c.getBoundingClientRect();return JSON.stringify({l:r.left,t:r.top,w:r.width,h:r.height})"))
    await M('mousePressed', cb.l + cb.w - 20, cb.t + cb.h - 20); await M('mouseReleased', cb.l + cb.w - 20, cb.t + cb.h - 20); await sleep(300) // 빈 캔버스 클릭 → 편집 커밋
    const cnt1 = await ev(ws, sid, "return document.querySelectorAll('.stash-item').length")
    t(cnt1 > cnt0, '[' + skin + '] 수집함 메모 추가됨(' + cnt0 + '→' + cnt1 + ')')

    // 실제 마우스 드래그로 항목 자유 이동
    const c = JSON.parse(await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.stash-item'));var e=its[its.length-1];var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,l:Math.round(parseFloat(e.style.left)||0)})"))
    await M('mouseMoved', c.x, c.y); await M('mousePressed', c.x, c.y); await sleep(60)
    for (let s = 1; s <= 8; s++) { await M('mouseMoved', c.x + 150 * s / 8, c.y + 110 * s / 8); await sleep(28) }
    await M('mouseReleased', c.x + 150, c.y + 110); await sleep(400)
    const lAfter = await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.stash-item'));var e=its[its.length-1];return Math.round(parseFloat(e.style.left)||0)")
    t(lAfter > c.l + 60, '[' + skin + '] 수집함 항목 마우스 드래그 이동(left ' + c.l + '→' + lAfter + ')')
  }
  t(await ev(ws, sid, closePanel(".stash-win button[title='접기']", '.stash-win')), '[' + skin + '] 수집함 접기(닫힘)')

  // ── 2) 스크래치패드 — 도구 메뉴 ──
  let r = await openToolPanel(ws, sid, '스크래치패드')
  const scratchOpen = r === 'ok' && await ev(ws, sid, "return !!document.querySelector('.scratchpad')")
  opened.scratch = opened.scratch || {}; opened.scratch[skin] = scratchOpen
  t(scratchOpen, '[' + skin + '] 도구 메뉴 → 스크래치패드 열림(.scratchpad)')
  if (scratchOpen) {
    await ev(ws, sid, "var t=document.querySelector('.scratchpad-body');if(t){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(t,'스크래치 패리티 " + skin + "');t.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(450)
    const saved = await ev(ws, sid, "try{return localStorage.getItem('sry:scratchpad')||''}catch(e){return ''}")
    t(/스크래치 패리티/.test(saved), '[' + skin + '] 스크래치패드 타이핑 → localStorage 영속(' + JSON.stringify(saved).slice(0, 30) + ')')
  }
  t(await ev(ws, sid, closePanel(".scratchpad button[aria-label='스크래치패드 닫기']", '.scratchpad')), '[' + skin + '] 스크래치패드 닫기')

  // ── 3) 집필 스프린트 타이머 — 도구 메뉴 ──
  r = await openToolPanel(ws, sid, '집필 스프린트 타이머')
  const sprintOpen = r === 'ok' && await ev(ws, sid, "return !!document.querySelector('.sprintbar')")
  opened.sprint = opened.sprint || {}; opened.sprint[skin] = sprintOpen
  t(sprintOpen, '[' + skin + '] 도구 메뉴 → 집필 스프린트 타이머 열림(.sprintbar)')
  if (sprintOpen) {
    await ev(ws, sid, "var s=document.querySelector('.sprintbar select');if(s){var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,'5');s.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(150)
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.sprintbar button')).find(function(x){return /시작/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350)
    const running = await ev(ws, sid, "return !!document.querySelector('.sprint-time')")
    t(running, '[' + skin + '] 스프린트 시작 → 카운트다운(.sprint-time) 표시')
    const stopped = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.sprintbar button')).find(function(x){return /중지/.test(x.textContent||'')});if(b)b.click();return !document.querySelector('.sprint-time')")
    t(stopped, '[' + skin + '] 스프린트 중지 → 설정 화면 복귀')
  }
  t(await ev(ws, sid, closePanel(".sprintbar button[aria-label='스프린트 닫기']", '.sprintbar')), '[' + skin + '] 스프린트 타이머 닫기')

  // ── 4) 라이팅 프롬프트(글감) — 도구 메뉴 ──
  r = await openToolPanel(ws, sid, '라이팅 프롬프트')
  const promptOpen = r === 'ok' && await ev(ws, sid, "return !!document.querySelector('.promptdeck')")
  opened.prompt = opened.prompt || {}; opened.prompt[skin] = promptOpen
  t(promptOpen, '[' + skin + '] 도구 메뉴 → 라이팅 프롬프트 열림(.promptdeck)')
  if (promptOpen) {
    const before = await ev(ws, sid, "var e=document.querySelector('.promptdeck .prompt-text');return e?(e.textContent||''):''")
    const clicked = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.promptdeck button')).find(function(x){return /다른 글감/.test(x.textContent||'')});if(!b)return 'no';b.click();return 'ok'"); await sleep(250)
    const after = await ev(ws, sid, "var e=document.querySelector('.promptdeck .prompt-text');return !!e&&(e.textContent||'').trim().length>0")
    t(clicked === 'ok' && after, '[' + skin + '] 라이팅 프롬프트 "다른 글감" → 글감 카드 표시(before len=' + (before || '').length + ')')
    // 카테고리 셀렉터(사소한 컨트롤)도 동작
    const catOk = await ev(ws, sid, "var s=document.querySelector('.promptdeck select');if(!s||s.options.length<2)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,s.options[1].value);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value===s.options[1].value")
    t(catOk, '[' + skin + '] 라이팅 프롬프트 카테고리 선택 컨트롤 동작')
  }
  t(await ev(ws, sid, closePanel(".promptdeck button[aria-label='닫기']", '.promptdeck')), '[' + skin + '] 라이팅 프롬프트 닫기')

  // ── 5) 퀵 레퍼런스(현재 문서) — 도구 메뉴 ──
  r = await openToolPanel(ws, sid, '퀵 레퍼런스')
  const qrefOpen = r === 'ok' && await ev(ws, sid, "return !!document.querySelector('.quickref')")
  opened.quickref = opened.quickref || {}; opened.quickref[skin] = qrefOpen
  t(qrefOpen, '[' + skin + '] 도구 메뉴 → 현재 문서 퀵 레퍼런스 열림(.quickref)')
  if (qrefOpen) {
    const title = await ev(ws, sid, "var q=document.querySelector('.quickref .quickref-title');return q?(q.textContent||'').trim():''")
    t(!!title, '[' + skin + '] 퀵 레퍼런스 제목 표시(' + title + ')')
  }
  t(await ev(ws, sid, closePanel(".quickref button[aria-label='퀵 레퍼런스 닫기']", '.quickref')), '[' + skin + '] 퀵 레퍼런스 닫기')

  // ── 6) 소리내어 읽기(TTS) — 도구 메뉴 ──
  r = await openToolPanel(ws, sid, '소리내어 읽기')
  const readOpen = r === 'ok' && await ev(ws, sid, "return !!document.querySelector('.readaloud')")
  opened.readaloud = opened.readaloud || {}; opened.readaloud[skin] = readOpen
  t(readOpen, '[' + skin + '] 도구 메뉴 → 소리내어 읽기(TTS) 열림(.readaloud)')
  if (readOpen) {
    const head = await ev(ws, sid, "var h=document.querySelector('.readaloud .readaloud-head');return !!h&&/소리내어 읽기/.test(h.textContent||'')")
    t(head, '[' + skin + '] 소리내어 읽기 헤더 렌더')
    // 본문이 있으면 속도 슬라이더(사소한 컨트롤) 조작 — 환경(음성 미지원)에 따라 없을 수 있어 조건부
    const sliderMoved = await ev(ws, sid, "var s=document.querySelector('.readaloud-rate input[type=range]');if(!s)return 'absent';var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(s,'1.5');s.dispatchEvent(new Event('input',{bubbles:true}));return s.value==='1.5'?'moved':'fail'")
    if (sliderMoved !== 'absent') t(sliderMoved === 'moved', '[' + skin + '] 소리내어 읽기 속도 슬라이더 조작')
  }
  t(await ev(ws, sid, closePanel(".readaloud button[aria-label='닫기']", '.readaloud')), '[' + skin + '] 소리내어 읽기 닫기')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const opened = {} // 패널별 {classic,studio} 열림 여부 → 교차 패리티 비교
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1300)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await ev(ws, sid, CLOSE_WELCOME); await sleep(400)
    // 스킨이 실제로 적용됐는지 확인(클래식=.toolbar, 스튜디오=.st-rail)
    const skinOk = await ev(ws, sid, "return " + (skin === 'studio' ? "(document.querySelector('.app-studio')||document.querySelector('.st-rail'))!=null" : "(document.querySelector('.toolbar')||document.querySelector('.menu-wrap'))!=null"))
    t(!!skinOk, '[' + skin + '] 스킨 적용 확인')
    await runSkin(ws, sid, skin, t, opened)
  }

  // ── 교차 패리티: 클래식에서 열린 패널이 스튜디오에서도 열렸는지(반대도) ──
  const NAMES = { stash: '수집함', scratch: '스크래치패드', sprint: '집필 스프린트 타이머', prompt: '라이팅 프롬프트', quickref: '퀵 레퍼런스', readaloud: '소리내어 읽기(TTS)' }
  for (const key of Object.keys(NAMES)) {
    const o = opened[key] || {}
    const c = !!o.classic, s = !!o.studio
    if (c && s) t(true, '[PARITY] ' + NAMES[key] + ' — 양 스킨 모두 도달+작동')
    else t(false, '[PARITY-GAP] ' + NAMES[key] + ' — classic=' + c + ' studio=' + s + ' (한쪽에서만 열림)')
  }

  console.log('=== 전역 패널 패리티(클래식↔스튜디오) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
