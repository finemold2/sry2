// z-순서/스태킹 전수 베타 — "도구창이 여러 개 떠 있어도, 그 위에서 연 오버레이(모달/명령팔레트/집중모드)가
// 화면 최상위로 와서 도구창에 가리지 않아야 한다"는 사용자 상식을 실제로 조작해 검증한다.
// 점검: (1) 도구창 다중 + z 클램프(200~289)  (2) 새 창은 맨 앞 + 살짝 어긋나(cascade) 뜸  (3) 도구창 클릭→맨 앞
//       (4) 모달 5종(toolhub/compile/settings/genrebox/creative)이 도구창 위  (5) 명령팔레트(⌘K) 도구창 위·자동포커스·Esc 닫힘
//       (6) 수집함이 도구창 위  (7) 집중모드가 도구창·수집함을 덮음  (8) 집중모드 위에서 연 모달이 집중모드 위
//       (9) 메뉴 드롭다운이 본문/도구창 위에 보임(양 스킨). 위반 시 console.log("[ISSUE] ...") + 실패 카운트.
// 검증된 하니스(_cdp_modal_ontop / _cdp_menu_parity) 의 부팅·훅·메뉴 트리거 패턴을 그대로 사용. 작성만(실행 금지).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

const ok = [], bad = []
// 통과/실패 + 위반 시 [ISSUE] 로그(요구사항: 위반은 [ISSUE] 출력 + 실패로 카운트)
const t = (c, m) => { if (c) { ok.push(m) } else { bad.push(m); console.log('[ISSUE] ' + m) } }

const MODALS = ['toolhub', 'compile', 'settings', 'genrebox', 'creative']
const TOOLS = ['name-mixer', 'character-forge', 'plot-twist-deck'] // 마지막(plot-twist-deck)이 가장 최근에 열림

// 인페이지 z-검사 헬퍼 주입(리로드마다 재주입). 좌표 hit-test 로 '진짜 맨 위' 요소가 무엇인지 본다.
const ZT = `
window.__zt = {
  maxToolZ: function(){ return Math.max.apply(null, [].slice.call(document.querySelectorAll('.toolwin')).filter(function(w){return w.style.display!=='none'}).map(function(w){return parseInt(getComputedStyle(w).zIndex||'0',10)||0}).concat([0])); },
  zOf: function(sel){ var e=document.querySelector(sel); return e?(parseInt(getComputedStyle(e).zIndex||'0',10)||0):-1; },
  toolZ: function(id){ var e=document.querySelector('.toolwin[data-tool-id="'+id+'"]'); return e?(parseInt(getComputedStyle(e).zIndex||'0',10)||0):-1; },
  tops: function(){ return [].slice.call(document.querySelectorAll('.toolwin')).map(function(w){var r=w.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top)}}); },
  // pointSel 요소의 중앙에서 elementFromPoint → mustBe 안에 있고 mustNot 안에는 없는가
  topAt: function(pointSel, mustBe, mustNot){
    var c=document.querySelector(pointSel); if(!c) return {err:'no:'+pointSel};
    var r=c.getBoundingClientRect();
    var x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
    var W=window.innerWidth||1, H=window.innerHeight||1;
    x=Math.max(2,Math.min(x,W-2)); y=Math.max(2,Math.min(y,H-2));
    var el=document.elementFromPoint(x,y); if(!el) return {err:'noel'};
    var inMust = mustBe ? !!el.closest(mustBe) : true;
    var inNot  = mustNot ? !!el.closest(mustNot) : false;
    return { ok: inMust && !inNot, inMust: inMust, inNot: inNot, cls: (el.className && el.className.toString)?el.className.toString().slice(0,60):el.tagName };
  },
  pointerDown: function(sel){ var e=document.querySelector(sel); if(!e) return false; try{ e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true})); }catch(err){ return false } return true; }
};
return 1`

const waitHook = async (ws, sid) => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'&&typeof window.__setModal==='function'&&typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }
const dismiss = async (ws, sid) => { await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(300) }
const openMenu = (ws, sid, name) => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='" + name + "'});if(b){b.click();return true}return false")
const closeMenu = (ws, sid) => ev(ws, sid, "document.body.click();return 1")

// 깨끗한 결정적 상태로 리로드: 도구세션/창위치 초기화 + 스킨 지정 → reload → 훅 대기 → 환영 닫기 → 헬퍼 주입
async function reloadSkin(ws, sid, skin) {
  await ev(ws, sid, "try{var rm=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sry:toolwin:')===0)rm.push(k);}rm.forEach(function(k){localStorage.removeItem(k)});localStorage.removeItem('sry:toolSession');localStorage.setItem('sry:uiSkin','" + skin + "');}catch(e){}return 1")
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  const okHook = await waitHook(ws, sid)
  await dismiss(ws, sid)
  await ev(ws, sid, ZT)
  return okHook
}

// ───────────────────────── PART A: 오버레이 z-순서(도구창 위) ─────────────────────────
async function coreOverlays(ws, sid, skin) {
  // 도구창 3개 열기(openTool → bringToFront 로 z 증가)
  for (const id of TOOLS) { await ev(ws, sid, "window.__openTool('" + id + "');return 1"); await sleep(380) }
  const nWin = await ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  t(nWin >= 3, '[' + skin + '] 도구창 3개 떠 있음 (' + nWin + ')')

  // z 클램프: 모든 도구창 z 가 200~289(수집함 300 을 가리지 않도록)
  const zs = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.toolwin')).map(function(w){return parseInt(getComputedStyle(w).zIndex||'0',10)||0})")
  t(zs.length > 0 && zs.every((z) => z >= 200 && z <= 289), '[' + skin + '] 도구창 z 가 200~289 범위로 클램프 (' + JSON.stringify(zs) + ')')

  // 새 창은 서로 어긋나(cascade) 떠 겹치지 않음 — top 이 모두 같으면 ISSUE
  const tops = await ev(ws, sid, "return window.__zt.tops()")
  const distinctTops = new Set(tops.map((p) => p.t)).size
  t(tops.length >= 3 && distinctTops >= 2, '[' + skin + '] 새 도구창은 살짝 어긋나(cascade) 뜸 — tops=' + JSON.stringify(tops.map((p) => p.t)))

  // 새로 연 창(마지막 plot-twist-deck)이 맨 앞(z 최대)
  const zFirst = await ev(ws, sid, "return window.__zt.toolZ('name-mixer')")
  const zLast = await ev(ws, sid, "return window.__zt.toolZ('plot-twist-deck')")
  t(zLast > zFirst, '[' + skin + '] 새 도구창을 열면 맨 앞으로 옴 (plot z=' + zLast + ' > name z=' + zFirst + ')')

  // 뒤에 있던 창을 클릭(pointerdown)하면 맨 앞으로(bringToFront)
  await ev(ws, sid, "return window.__zt.pointerDown('.toolwin[data-tool-id=\"name-mixer\"]')"); await sleep(250)
  const zNameAfter = await ev(ws, sid, "return window.__zt.toolZ('name-mixer')")
  const zLastAfter = await ev(ws, sid, "return window.__zt.toolZ('plot-twist-deck')")
  t(zNameAfter > zLastAfter, '[' + skin + '] 도구창 클릭 시 맨 앞으로 옴 (name z=' + zNameAfter + ' > plot z=' + zLastAfter + ')')

  const maxToolZ = await ev(ws, sid, "return window.__zt.maxToolZ()")

  // 모달 5종이 모두 도구창 위(z 우위 + 도구창 영역/모달 콘텐츠 모두 도구창에 안 가림)
  for (const m of MODALS) {
    await ev(ws, sid, "window.__setModal('" + m + "');return 1")
    // 대형(지연로딩) 모달은 dev 서버에서 청크 로드가 늦다 — 출현까지 폴링(고정 sleep 은 늦게 뜬 백드롭이 다음 단계를 덮는 아티팩트 유발).
    let present = false
    for (let k = 0; k < 20; k++) { await sleep(200); present = await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"); if (present) break }
    const modalZ = await ev(ws, sid, "return window.__zt.zOf('.modal-backdrop')")
    const overTool = await ev(ws, sid, "return window.__zt.topAt('.toolwin','.modal-backdrop','.toolwin')")   // 도구창 위치를 모달이 덮는가
    const contentClear = await ev(ws, sid, "return window.__zt.topAt('.modal-backdrop > *','.modal-backdrop','.toolwin')") // 모달 콘텐츠가 도구창에 안 가리는가
    t(present && modalZ > maxToolZ && overTool && overTool.ok && contentClear && contentClear.ok,
      '[' + skin + '] 모달 ' + m + ' 이 도구창 위 (modalZ ' + modalZ + ' > toolZ ' + maxToolZ + ', 덮음=' + (overTool && overTool.ok) + ', 콘텐츠노출=' + (contentClear && contentClear.ok) + ')')
    await ev(ws, sid, "window.__setModal(null);return 1")
    // 닫힘(백드롭 소멸)까지 폴링 — 늦게 뜬 지연 청크가 다음 단계 위에 백드롭을 남기지 않게.
    for (let k = 0; k < 15; k++) { await sleep(150); if (!(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')"))) break }
  }

  // 명령 팔레트(⌘K): 도구창 위 + 첫 입력 자동 포커스 + Esc 닫힘
  await ev(ws, sid, "window.__setModal('palette');return 1"); await sleep(420)
  const palPresent = await ev(ws, sid, "return !!document.querySelector('.cmd-palette')")
  const palZ = await ev(ws, sid, "return window.__zt.zOf('.modal-backdrop')")
  const palOverTool = await ev(ws, sid, "return window.__zt.topAt('.toolwin','.modal-backdrop','.toolwin')")
  const palContent = await ev(ws, sid, "return window.__zt.topAt('.cmd-palette','.modal-backdrop','.toolwin')")
  t(palPresent && palZ > maxToolZ && palOverTool && palOverTool.ok && palContent && palContent.ok,
    '[' + skin + '] 명령 팔레트(⌘K)가 도구창 위 (palZ ' + palZ + ' > toolZ ' + maxToolZ + ', 덮음=' + (palOverTool && palOverTool.ok) + ')')
  const palFocus = await ev(ws, sid, "var a=document.activeElement;return !!(a&&a.classList&&a.classList.contains('cmd-input'))")
  t(palFocus, '[' + skin + '] 명령 팔레트를 열면 검색 입력에 자동 포커스')
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return 1"); await sleep(250)
  const palClosed = await ev(ws, sid, "return !document.querySelector('.cmd-palette')")
  t(palClosed, '[' + skin + '] 명령 팔레트가 Esc 로 닫힘')

  // 수집함: 도구창 위(z 300+ > 도구창 289). story-dice 를 수집함 위치로 강제 겹친 뒤에도 수집함이 위인지 확인.
  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(450)
  const stashOpen = await ev(ws, sid, "return !!document.querySelector('.stash-win')")
  if (stashOpen) {
    // 수집함 위에 정확히 겹치도록 새 도구창(story-dice) 위치를 localStorage 로 지정 후 (재)열기
    await ev(ws, sid, "var s=document.querySelector('.stash-win');var r=s.getBoundingClientRect();try{localStorage.setItem('sry:toolwin:story-dice',JSON.stringify({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width)+30,h:Math.round(r.height)+30}))}catch(e){}return 1")
    await ev(ws, sid, "if(window.__closeTool)window.__closeTool('story-dice');return 1"); await sleep(150)
    await ev(ws, sid, "window.__openTool('story-dice');return 1"); await sleep(500)
  }
  const stashZ = await ev(ws, sid, "return window.__zt.zOf('.stash-win')")
  const stashTop = await ev(ws, sid, "return window.__zt.topAt('.stash-win','.stash-win','.toolwin')") // 수집함 중앙 위에 도구창이 안 떠야 함
  const maxToolZ2 = await ev(ws, sid, "return window.__zt.maxToolZ()")
  t(stashOpen && stashZ > maxToolZ2 && stashTop && stashTop.ok,
    '[' + skin + '] 수집함 창이 도구창 위 (stashZ ' + stashZ + ' > toolZ ' + maxToolZ2 + ', 겹쳐도 가림없음=' + (stashTop && stashTop.ok) + ')')

  // 집중(몰입) 모드: 도구창·수집함을 모두 덮어야 함(예전 100 이라 도구창이 비치던 버그). 모달/팔레트가 다 닫힌 상태에서 진입.
  let entered = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /집중\\s*모드/.test((x.title||'')+' '+(x.getAttribute('aria-label')||''))&&!x.closest('.dropdown')});if(b){b.click();return 'btn'}return 'nobtn'")
  if (entered === 'nobtn') { // 스튜디오 등: 보기 메뉴 → 집중 모드 항목
    await openMenu(ws, sid, '보기'); await sleep(300)
    await ev(ws, sid, "var it=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return /집중\\s*모드/.test(x.textContent||'')});if(it)it.click();return 1")
  }
  await sleep(450)
  // 집중 모드는 이제 '현재 창/새 창' 선택 모달을 먼저 띄운다 — '현재 창에서'를 골라 in-page 집중 모드로 진입.
  await ev(ws, sid, "var o=[].slice.call(document.querySelectorAll('.focus-opt')).find(function(x){return /현재 창/.test(x.textContent||'')});if(o)o.click();return !!o")
  await sleep(500)
  const compPresent = await ev(ws, sid, "return !!document.querySelector('.composition')")
  const compZ = await ev(ws, sid, "return window.__zt.zOf('.composition')")
  const maxToolZ3 = await ev(ws, sid, "return window.__zt.maxToolZ()")
  const compOverTool = await ev(ws, sid, "return window.__zt.topAt('.toolwin','.composition','.toolwin')")
  t(compPresent && compZ > maxToolZ3 && compOverTool && compOverTool.ok,
    '[' + skin + '] 집중 모드가 도구창을 덮음 (compZ ' + compZ + ' > toolZ ' + maxToolZ3 + ', 덮음=' + (compOverTool && compOverTool.ok) + ')')
  const compOverStash = await ev(ws, sid, "return window.__zt.topAt('.stash-win','.composition','.stash-win')")
  t(compPresent && compZ > stashZ && compOverStash && compOverStash.ok,
    '[' + skin + '] 집중 모드가 수집함을 덮음 (compZ ' + compZ + ' > stashZ ' + stashZ + ', 덮음=' + (compOverStash && compOverStash.ok) + ')')

  // 집중 모드 위에서 연 모달은 집중 모드보다도 위(z 500 > 450)
  await ev(ws, sid, "window.__setModal('toolhub');return 1"); await sleep(500)
  const mZ = await ev(ws, sid, "return window.__zt.zOf('.modal-backdrop')")
  const mOverComp = await ev(ws, sid, "return window.__zt.topAt('.modal-backdrop > *','.modal-backdrop','.composition')")
  t(mZ > compZ && mOverComp && mOverComp.ok,
    '[' + skin + '] 집중 모드 위에서 연 모달이 집중 모드 위 (modalZ ' + mZ + ' > compZ ' + compZ + ', 위=' + (mOverComp && mOverComp.ok) + ')')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)
  // 집중 모드 종료
  await ev(ws, sid, "var x=document.querySelector('.comp-exit');if(x)x.click();return 1"); await sleep(300)
}

// ───────────────────────── PART B: 메뉴 드롭다운 z(본문·도구창 위) ─────────────────────────
async function menuZ(ws, sid, skin) {
  // (a) 본문 위: 도구창을 모두 닫고 메뉴를 열어, 드롭다운이 본문(에디터) 위에 보이는지
  await ev(ws, sid, "[].slice.call(document.querySelectorAll('.toolwin')).forEach(function(w){var id=w.getAttribute('data-tool-id');if(id&&window.__closeTool)window.__closeTool(id)});return 1"); await sleep(250)
  const opened = await openMenu(ws, sid, '파일'); await sleep(320)
  const ddPresent = await ev(ws, sid, "return !!document.querySelector('.dropdown')")
  const ddOverBody = await ev(ws, sid, "return window.__zt.topAt('.dropdown','.dropdown',null)") // 드롭다운 중앙이 실제로 드롭다운(본문이 안 덮음)
  t(opened && ddPresent && ddOverBody && ddOverBody.ok,
    '[' + skin + '] 메뉴 드롭다운이 본문 위에 보임 (present=' + ddPresent + ', top=' + (ddOverBody && ddOverBody.cls) + ')')
  await closeMenu(ws, sid); await sleep(180)

  // (b) 도구창 위: 메뉴 영역(좌상단)에 겹치도록 도구창을 띄운 뒤 메뉴를 열어, 드롭다운이 그 도구창 위에 보이는지
  await ev(ws, sid, "try{localStorage.setItem('sry:toolwin:name-mixer',JSON.stringify({x:8,y:28,w:480,h:540}))}catch(e){};return 1")
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(450)
  const toolUp = await ev(ws, sid, "return !!document.querySelector('.toolwin[data-tool-id=\"name-mixer\"]')")
  await openMenu(ws, sid, '파일'); await sleep(320)
  const dd2 = await ev(ws, sid, "return !!document.querySelector('.dropdown')")
  const ddOverTool = await ev(ws, sid, "return window.__zt.topAt('.dropdown','.dropdown','.toolwin')") // 드롭다운이 겹친 도구창에 가리면 ISSUE
  t(toolUp && dd2 && ddOverTool && ddOverTool.ok,
    '[' + skin + '] 메뉴 드롭다운이 (겹친) 도구창 위에 보임 (덮임여부 inNot=' + (ddOverTool && ddOverTool.inNot) + ', top=' + (ddOverTool && ddOverTool.cls) + ')')
  await closeMenu(ws, sid); await sleep(150)
  await ev(ws, sid, "if(window.__closeTool)window.__closeTool('name-mixer');return 1"); await sleep(150)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await waitHook(ws, sid)

  // PASS 1: 클래식 — 오버레이 z 전수 + 메뉴 z
  t(await reloadSkin(ws, sid, 'classic'), '[classic] 앱 로드 + 테스트 훅/헬퍼 준비')
  await coreOverlays(ws, sid, 'classic')
  await menuZ(ws, sid, 'classic')

  // PASS 2: 스튜디오 — 메뉴 z(양 스킨 요구) + 오버레이 핵심 재확인
  t(await reloadSkin(ws, sid, 'studio'), '[studio] 앱 로드 + 테스트 훅/헬퍼 준비')
  await menuZ(ws, sid, 'studio')

  console.log('=== z-순서/스태킹 전수 검증(도구창 위 오버레이·집중모드·메뉴 드롭다운) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
