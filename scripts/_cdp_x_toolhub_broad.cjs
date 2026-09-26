// 도구 허브 + 도구 20+개 광역 실사용 베타(QA/UX) — '코드리뷰'가 아니라 실제 사용자가
// 허브를 열어 검색·필터·빈결과·지우기 하고, 카드/직접훅으로 도구 20+개를 열어 렌더·대표동작(생성/입력)·
// 관련도구 스트립·닫기/독·창 캐스케이드(겹치지 않게 어긋남)·새 창 맨앞·콘솔에러0 을 점검한다.
// '상식적으로 당연한데 안 되는 것'을 단언으로 인코딩하고 위반 시 [ISSUE] 를 출력한다.
//
// 타깃: Target.createTarget({url:'http://localhost:4178/'}) 직접 + attachToTarget flatten (about:blank+navigate 금지).
// 클릭은 element.click(); 제어 input 은 네이티브 setter+input; Esc 는 합성 KeyboardEvent(window keydown).
// 콘솔에러/예외 캡처를 위해 Runtime.enable 사용(이 스크립트는 Input.dispatchMouseEvent 드래그를 쓰지 않음).
//
// 작성 전용: 실행하지 말 것. node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// 광역 표본: 작명/캐릭터/플롯/사건/발상/세계관·소품 등 카테고리를 가로지르는 30종(레지스트리 확인됨).
const BROAD = [
  'name-mixer', 'place-name-forge', 'name-by-meaning', 'title-forge',
  'character-forge', 'antagonist-forge', 'character-foil-gen', 'character-tic-gen', 'first-meeting-gen',
  'plot-twist-deck', 'dilemma-generator', 'conflict-builder', 'conflict-matrix-gen', 'betrayal-gen',
  'premise-generator', 'two-word-collision', 'what-if-escalator', 'logline-forge', 'opening-line-forge',
  'story-dice', 'card-draw-story', 'tarot-story', 'story-tarot', 'prompt-wheel', 'oblique-strategies',
  'omen-symbol-gen', 'prophecy-generator', 'curse-blessing-gen', 'rumor-generator', 'red-herring-gen',
  'myth-creature', 'creature-designer', 'prop-generator', 'quest-forge', 'scene-weather',
]

// ── 도구창 안의 '주요 액션 버튼' 1개를 찾아 클릭(데이터 마커로 정확히 그 창만 대상). 본문 텍스트/노드 델타 반환 ──
const ACT = (id) => `
  var w=document.querySelector('.toolwin[data-tool-id=' + ${JSON.stringify(JSON.stringify(id))} + ']');
  if(!w)return {found:false,reason:'no-win'};
  var body=w.querySelector('.toolwin-body'); if(!body)return {found:false,reason:'no-body'};
  var VERB=/(생성|뽑|굴리|굴려|만들|돌리|섞|새로|재생성|다시|짓|뽑기)/;
  var cands=[].slice.call(body.querySelectorAll('button')).filter(function(b){return !b.disabled && !b.closest('.toolwin-related') && b.offsetParent!==null});
  var btn=cands.find(function(b){return b.classList.contains('btn-primary')});
  if(!btn)btn=cands.find(function(b){return VERB.test((b.textContent||'').trim())});
  if(!btn)return {found:false,reason:'no-btn',cands:cands.length};
  var norm=function(s){return (s||'').replace(/\\s+/g,' ').trim()};
  var before=norm(body.innerText).slice(0,4000);
  var nodesBefore=body.querySelectorAll('*').length;
  var label=norm(btn.textContent).slice(0,40);
  btn.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
  btn.click();
  return {found:true,label:label,before:before,nodesBefore:nodesBefore};
`
const AFTER = (id) => `
  var w=document.querySelector('.toolwin[data-tool-id=' + ${JSON.stringify(JSON.stringify(id))} + ']');
  if(!w)return {after:'',nodesAfter:0};
  var body=w.querySelector('.toolwin-body'); if(!body)return {after:'',nodesAfter:0};
  var norm=function(s){return (s||'').replace(/\\s+/g,' ').trim()};
  return {after:norm(body.innerText).slice(0,4000),nodesAfter:body.querySelectorAll('*').length};
`
// 도구창 본문이 실제 렌더됐는지(lazy 로더 '불러오는 중'은 미완성으로 간주).
const RENDER = (id) => `
  var w=document.querySelector('.toolwin[data-tool-id=' + ${JSON.stringify(JSON.stringify(id))} + ']');
  if(!w)return {present:false};
  var b=w.querySelector('.toolwin-body');
  var txt=b?(b.textContent||'').trim():'';
  return {present:true, len:txt.length, loading:/불러오는 중/.test(txt)};
`
// 관련 도구 스트립 칩 개수.
const RELATED = (id) => `
  var w=document.querySelector('.toolwin[data-tool-id=' + ${JSON.stringify(JSON.stringify(id))} + ']');
  if(!w)return 0;
  return w.querySelectorAll('.toolwin-related .toolwin-related-chip').length;
`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  // about:blank+navigate 금지 — 타깃 URL 로 직접 생성.
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 콘솔에러/예외 캡처(이 세션 한정).
  const errs = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails && d.params.exceptionDetails.text) || '?')); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console.error') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 충분히 넓은 뷰포트 — 도구창 캐스케이드/버튼 클릭이 클램프로 가려지지 않도록.
  try { await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid) } catch { /* optional */ }

  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // 로드 + 훅 대기
  let hooked = false
  for (let i = 0; i < 40; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'&&typeof window.__setModal==='function'&&typeof window.__closeTool==='function'")) { hooked = true; break } } catch { /* loading */ } }
  t(hooked, '앱 로드 + 테스트 훅(__openTool/__closeTool/__setModal) 준비')
  if (!hooked) { console.log('FATAL 훅 준비 실패'); ws.close(); process.exit(2); return }
  // 환영/투어 닫기
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  // 깨끗한 시작 — 세션 복원으로 떠 있던 도구창 모두 닫기
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(250)

  // ════════ 섹션 A — 도구 허브(모달) 실사용 ════════
  await ev(ws, sid, "window.__setModal('toolhub');return 1"); await sleep(500)
  t(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"), '도구 허브: 메뉴/훅으로 열면 모달이 뜬다')
  t(await ev(ws, sid, "var d=document.querySelector('.modal-backdrop');return !!d && /도구 허브/.test(d.textContent||'')"), '도구 허브: 제목/내용이 보인다(빈 모달 아님)')
  // 당연 기대: 모달 열면 검색 입력에 자동 포커스
  t(await ev(ws, sid, "var a=document.activeElement;return !!a && a.tagName==='INPUT' && a.classList.contains('field') && !!a.closest('.modal-backdrop')"), '도구 허브: 열리면 검색 입력에 자동 포커스가 간다')

  const total = await ev(ws, sid, "return document.querySelectorAll('.modal-backdrop .toolhub-card').length")
  t(total >= 20, '도구 허브: 카드가 충분히 많이 렌더된다(' + total + '종)')

  // 검색 필터: 일부만 매칭되어 카드 수가 줄어야 한다
  const setQ = (q) => "var inp=document.querySelector('.modal-backdrop input.field');if(!inp)return -1;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(inp," + JSON.stringify(q) + ");inp.dispatchEvent(new Event('input',{bubbles:true}));return 1"
  await ev(ws, sid, setQ('캐릭터')); await sleep(300)
  const filtered = await ev(ws, sid, "return document.querySelectorAll('.modal-backdrop .toolhub-card').length")
  t(filtered > 0 && filtered < total, '도구 허브: 검색어로 필터링되어 카드가 줄어든다(' + total + '→' + filtered + ')')

  // 빈 결과: 안내 문구 + '검색 지우기' 가 보여야 한다(빈 상태 안내)
  await ev(ws, sid, setQ('존재하지않을검색어zzqqxx12345')); await sleep(300)
  const empties = await ev(ws, sid, "return document.querySelectorAll('.modal-backdrop .toolhub-card').length")
  const emptyMsg = await ev(ws, sid, "var d=document.querySelector('.modal-backdrop .modal-body');return !!d && /결과가 없습니다/.test(d.textContent||'')")
  const clearInEmpty = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.modal-backdrop button')).some(function(b){return /검색 지우기/.test(b.textContent||'')||/검색 지우기/.test(b.getAttribute('aria-label')||'')})")
  t(empties === 0 && emptyMsg && clearInEmpty, '도구 허브: 결과 없을 때 안내 문구 + 검색 지우기 노출(빈 상태 안내)')

  // 검색 지우기 → 전체 복원
  await ev(ws, sid, "var b=document.querySelector('.modal-backdrop button[aria-label=\"검색 지우기\"]');if(b)b.click();return 1"); await sleep(300)
  const restored = await ev(ws, sid, "return document.querySelectorAll('.modal-backdrop .toolhub-card').length")
  t(restored === total, '도구 허브: 검색 지우면 전체 카드 복원(' + restored + '/' + total + ')')

  // 카드 클릭 → 도구창 열림 + 허브 닫힘(당연 기대)
  const winBefore = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  await ev(ws, sid, "var c=document.querySelector('.modal-backdrop .toolhub-card');if(c)c.click();return 1"); await sleep(900)
  const winAfter = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  const hubClosed = !(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"))
  t(winAfter > winBefore && hubClosed, '도구 허브: 카드 클릭하면 도구창이 열리고 허브는 닫힌다(' + winBefore + '→' + winAfter + ', 허브닫힘=' + hubClosed + ')')
  // 정리
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(200)

  // Esc 로 허브 닫힘(당연 기대)
  await ev(ws, sid, "window.__setModal('toolhub');return 1"); await sleep(400)
  t(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"), '도구 허브: Esc 테스트용 재오픈')
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return 1"); await sleep(300)
  t(!(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')")), '도구 허브: Esc 키로 모달이 닫힌다')

  // ════════ 섹션 B — 도구 30종 광역 열기/렌더/대표동작/관련스트립/닫기 ════════
  let rendered = 0, acted = 0, didChange = 0, hadRelated = 0, closedOk = 0
  const emptyBody = [], noRelated = [], errTools = [], crashTools = []
  for (const id of BROAD) {
    // 격리: 남은 창 모두 닫기
    await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(120)
    const errBefore = errs.length
    let r
    try {
      await ev(ws, sid, "window.__openTool(" + JSON.stringify(id) + ");return 1")
      await sleep(950) // lazy 청크 로드 + 최초 렌더
      r = await ev(ws, sid, RENDER(id))
    } catch (e) { crashTools.push(id + '(' + (e.message || '').slice(0, 40) + ')'); try { await ev(ws, sid, "window.__closeTool(" + JSON.stringify(id) + ");return 1") } catch { /* noop */ } continue }
    if (!r || !r.present) { try { await ev(ws, sid, "window.__closeTool(" + JSON.stringify(id) + ");return 1") } catch { /* noop */ } continue }
    rendered++
    if (r.len === 0 || r.loading) emptyBody.push(id + (r.loading ? '(로더고착)' : '(빈본문)'))

    // 관련 도구 스트립 — 사용자가 함께 열 수 있게 보여야 한다
    let rel = 0
    try { rel = await ev(ws, sid, RELATED(id)) } catch { rel = 0 }
    if (rel > 0) hadRelated++; else noRelated.push(id)

    // 대표 동작(생성/입력) — 주요 액션 버튼 클릭 시 산출물 변화
    let pre
    try { pre = await ev(ws, sid, ACT(id)) } catch (e) { pre = { found: false, reason: 'exc:' + (e.message || '').slice(0, 30) } }
    if (pre && pre.found) {
      acted++
      await sleep(450)
      let post; try { post = await ev(ws, sid, AFTER(id)) } catch { post = { after: '', nodesAfter: 0 } }
      const textChanged = (pre.before || '') !== (post.after || '')
      const nodesGrew = (post.nodesAfter || 0) > (pre.nodesBefore || 0)
      if (textChanged || nodesGrew) didChange++
    }
    if (errs.length > errBefore) errTools.push(id)

    // 닫기 → 창이 사라져야 한다(닫기/독)
    try { await ev(ws, sid, "window.__closeTool(" + JSON.stringify(id) + ");return 1") } catch { /* noop */ }
    await sleep(140)
    const gone = !(await ev(ws, sid, RENDER(id)).then(x => x && x.present))
    if (gone) closedOk++
  }

  t(crashTools.length === 0, '도구 광역: 열기/렌더 중 크래시 0' + (crashTools.length ? ' — ' + crashTools.join(', ') : ''))
  t(rendered >= 20, '도구 광역: 20종 이상 실제 렌더(' + rendered + '/' + BROAD.length + ')')
  t(emptyBody.length === 0, '도구 광역: 모든 도구가 빈 화면/로더고착 아님' + (emptyBody.length ? ' — ' + emptyBody.join(', ') : ''))
  t(acted >= 15, '도구 광역: 대표 액션 버튼 클릭 성공 15+종(' + acted + ')')
  t(acted === 0 ? false : didChange >= Math.ceil(acted * 0.7), '도구 광역: 클릭한 도구의 70%+ 가 실제 산출물 변화(' + didChange + '/' + acted + ')')
  t(rendered === 0 ? false : hadRelated >= Math.ceil(rendered * 0.8), '도구 광역: 80%+ 도구가 "관련 도구" 스트립 노출(' + hadRelated + '/' + rendered + ')' + (noRelated.length ? ' — 없음: ' + noRelated.slice(0, 6).join(',') : ''))
  t(closedOk === rendered, '도구 광역: 모든 도구가 닫기로 창 제거됨(' + closedOk + '/' + rendered + ')')
  t(errTools.length === 0, '도구 광역: 도구별 콘솔에러 0' + (errTools.length ? ' — ' + errTools.join(', ') : ''))

  // ════════ 섹션 C — 창 관리(캐스케이드/맨앞/관련칩 열기/포커스) ════════
  // 새 창은 기존 창과 겹치지 않게 살짝 어긋나 떠야 한다(캐스케이드). 저장 위치 제거 후 신규 오픈.
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(150)
  await ev(ws, sid, "try{localStorage.removeItem('sry:toolwin:story-dice');localStorage.removeItem('sry:toolwin:name-mixer')}catch(e){};return 1")
  await ev(ws, sid, "window.__openTool('story-dice');return 1"); await sleep(700)
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(700)
  const pos = await ev(ws, sid, "var f=function(id){var w=document.querySelector('.toolwin[data-tool-id=\"'+id+'\"]');if(!w)return null;return {x:Math.round(parseFloat(w.style.left)||0),y:Math.round(parseFloat(w.style.top)||0),z:parseInt(w.style.zIndex||'0',10)||0}};return {a:f('story-dice'),b:f('name-mixer')}")
  const cascadeOk = !!(pos && pos.a && pos.b && (Math.abs(pos.a.y - pos.b.y) >= 18 || Math.abs(pos.a.x - pos.b.x) >= 18) && !(pos.a.x === pos.b.x && pos.a.y === pos.b.y))
  t(cascadeOk, '창 캐스케이드: 새 도구창이 기존 창과 겹치지 않게 어긋나 뜬다(' + JSON.stringify(pos) + ')')
  // 나중에 연 창이 맨 앞(z 최상위)이어야 한다
  const frontOk = !!(pos && pos.a && pos.b && pos.b.z > pos.a.z)
  t(frontOk, '창 맨앞: 마지막에 연 창이 z-index 최상위(name-mixer ' + (pos && pos.b ? pos.b.z : '?') + ' > story-dice ' + (pos && pos.a ? pos.a.z : '?') + ')')

  // 관련 도구 칩 클릭 → 또 다른 도구창이 열린다
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(150)
  await ev(ws, sid, "window.__openTool('character-forge');return 1"); await sleep(900)
  const beforeChip = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  const chipClicked = await ev(ws, sid, "var w=document.querySelector('.toolwin[data-tool-id=\"character-forge\"]');if(!w)return false;var c=w.querySelector('.toolwin-related .toolwin-related-chip');if(!c)return false;c.click();return true")
  await sleep(900)
  const afterChip = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  t(chipClicked && afterChip > beforeChip, '관련 도구: 스트립 칩을 클릭하면 관련 도구가 함께 열린다(' + beforeChip + '→' + afterChip + ')')

  // 도구 열면 키보드 진입을 위해 창 내부로 포커스가 이동해야 한다
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(150)
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(900)
  t(await ev(ws, sid, "var a=document.activeElement;return !!a && !!a.closest && !!a.closest('.toolwin[data-tool-id=\"name-mixer\"]')"), '도구 포커스: 도구창을 열면 포커스가 그 창 안으로 이동(키보드 진입)')

  // 전 과정 콘솔에러/예외 0(당연 기대)
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin .toolwin-head button[aria-label=\"닫기\"]')).forEach(function(b){b.click()});return 1"); await sleep(150)
  t(errs.length === 0, '전 과정 콘솔에러/예외 0 (' + errs.length + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : '') + ')')

  console.log('=== 도구 허브/도구 20+개 광역 실사용 베타 ===')
  console.log('  허브 카드 ' + total + '종 · 광역표본 ' + BROAD.length + ' · 렌더 ' + rendered + ' · 액션 ' + acted + ' · 실동작 ' + didChange + ' · 관련스트립 ' + hadRelated + ' · 닫힘 ' + closedOk)
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
