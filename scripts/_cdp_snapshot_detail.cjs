// 인스펙터 스냅샷 세밀 실동작 검증(양 스킨) — 찍기 → 비교(diff d-add/d-del·증감수) → 되돌리기(원복+자동저장) → 삭제.
// 클릭/입력 기반 테스트라 Runtime.enable 로 콘솔에러도 함께 감시(드래그 미사용 → Input 타임아웃 없음).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result && r.result.value }

// ASCII 전용 RTF(파서 안전) — 평문이 명확히 달라 diff/되돌리기 단언이 결정적.
const RTF_A = '{\\rtf1\\ansi\\pard\\plain alpha bravo charlie delta\\par}'   // 평문: alpha bravo charlie delta
const RTF_B = '{\\rtf1\\ansi\\pard\\plain alpha bravo charlie echo foxtrot\\par}' // delta 삭제 + echo foxtrot 추가
const RTF_C = '{\\rtf1\\ansi\\pard\\plain alpha bravo charlie golf\\par}'   // 되돌리기 직전 본문(자동저장 확인용)

const CLOSE_WELCOME = "(()=>{var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1})()"
const OVERRIDE_DIALOGS = "(()=>{window.confirm=function(){return true};return 1})()"
const SELECT_TEXT = "(()=>{var s=window.__scriv.state();var es=window.__scriv.entries();var cur=es.find(function(e){return e.id===s.activeId});if(cur&&cur.type==='text')return s.activeId;var d=es.find(function(e){return e.type==='text'});if(!d)return s.activeId||'';var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows.find(function(x){return (x.getAttribute('aria-label')||'')===d.title});if(r){r.click();return d.id}return s.activeId||''})()"
const ENSURE_INSPECTOR = "(()=>{if(!document.querySelector('.inspector')){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test(x.getAttribute('aria-label')||'')});if(b)b.click()}return !!document.querySelector('.inspector')})()"
const CLICK_SNAP_TAB = "(()=>{var b=[].slice.call(document.querySelectorAll('.insp-tabs button')).find(function(x){return /스냅샷/.test(x.textContent||'')});if(b)b.click();return !!b})()"
const SNAP_TAKE = "(()=>{return !!document.querySelector('.snap-take')})()"
const SNAP_COUNT = "(()=>{return document.querySelectorAll('.snap-item').length})()"
const CLICK_TAKE_NOW = "(()=>{var b=[].slice.call(document.querySelectorAll('.snap-take button')).find(function(x){return /지금 찍기/.test(x.textContent||'')});if(b){b.click();return true}return false})()"
const CLICK_COMPARE_FIRST = "(()=>{var it=document.querySelectorAll('.snap-item')[0];if(!it)return false;var b=[].slice.call(it.querySelectorAll('button')).find(function(x){return /비교/.test(x.textContent||'')});if(b){b.click();return true}return false})()"
const DIFF_INFO = "(()=>{var leg=document.querySelector('.snap-diff-legend');var t=leg?leg.textContent:'';var a=(t.match(/\\+(\\d+)/)||[])[1];var r=(t.match(/[\\u2212-](\\d+)/)||[])[1];return JSON.stringify({add:+a||0,rem:+r||0,dadd:document.querySelectorAll('.snap-diff .d-add').length,ddel:document.querySelectorAll('.snap-diff .d-del').length,has:!!document.querySelector('.snap-diff')})})()"
const BACK_TO_LIST = "(()=>{var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /스냅샷 목록/.test(x.textContent||'')});if(b){b.click();return true}return false})()"
const TITLE_SNAP = "(()=>{var inp=document.querySelector('.snap-take input');if(!inp)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(inp,'초고 v2');inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return true})()"
const TITLE_PRESENT = "(()=>{return [].slice.call(document.querySelectorAll('.snap-item')).some(function(x){return /초고 v2/.test(x.textContent||'')})})()"
const ROLLBACK_LAST = "(()=>{var its=document.querySelectorAll('.snap-item');if(!its.length)return false;var it=its[its.length-1];var b=[].slice.call(it.querySelectorAll('button')).find(function(x){return /되돌리기/.test(x.textContent||'')});if(b){b.click();return true}return false})()"
const AUTOSNAP_PRESENT = "(()=>{return [].slice.call(document.querySelectorAll('.snap-item')).some(function(x){return /되돌리기 전 자동저장/.test(x.textContent||'')})})()"
const DELETE_FIRST = "(()=>{var it=document.querySelectorAll('.snap-item')[0];if(!it)return false;var b=[].slice.call(it.querySelectorAll('button')).find(function(x){return /삭제/.test(x.textContent||'')});if(b){b.click();return true}return false})()"

async function runSkin(ws, sid, skin, t, errs) {
  const e0 = errs.length
  // 1) 글 문서 선택 + 인스펙터 스냅샷 탭 진입
  const aid = await ev(ws, sid, SELECT_TEXT); await sleep(250)
  t(typeof aid === 'string' && aid.length > 0, '[' + skin + '] 글 문서 활성화(activeId=' + aid + ')')
  await ev(ws, sid, "(function(){window.__setView('outliner');return 1})()"); await sleep(250) // 에디터 분리 → flush 가 본문을 덮어쓰지 않게
  t(await ev(ws, sid, ENSURE_INSPECTOR), '[' + skin + '] 인스펙터 표시')
  await ev(ws, sid, CLICK_SNAP_TAB); await sleep(300)
  t(await ev(ws, sid, SNAP_TAKE), '[' + skin + '] 스냅샷 탭 활성(찍기 영역 표시)')

  // 2) 본문 A 설정 후 "지금 찍기" → 스냅샷 1개
  await ev(ws, sid, 'window.__scriv.setBody(' + JSON.stringify(RTF_A) + ')'); await sleep(250)
  t(await ev(ws, sid, CLICK_TAKE_NOW), '[' + skin + '] "지금 찍기" 버튼 클릭')
  await sleep(300)
  t((await ev(ws, sid, SNAP_COUNT)) === 1, '[' + skin + '] 스냅샷 1개 생성됨')

  // 3) 본문 B 로 변경 후 "비교" → diff(추가/삭제) 표시
  await ev(ws, sid, 'window.__scriv.setBody(' + JSON.stringify(RTF_B) + ')'); await sleep(250)
  t(await ev(ws, sid, CLICK_COMPARE_FIRST), '[' + skin + '] "비교" 버튼 클릭 → diff 뷰 진입')
  await sleep(300)
  const diff = JSON.parse(await ev(ws, sid, DIFF_INFO))
  t(diff.has && diff.dadd > 0, '[' + skin + '] diff 추가표시 d-add 존재(' + diff.dadd + ')')
  t(diff.ddel > 0, '[' + skin + '] diff 삭제표시 d-del 존재(' + diff.ddel + ')')
  t(diff.add > 0 && diff.rem > 0, '[' + skin + '] diff 증감 카운트(+' + diff.add + ' / -' + diff.rem + ')')

  // 4) 목록 복귀
  t(await ev(ws, sid, BACK_TO_LIST), '[' + skin + '] "← 스냅샷 목록" 복귀')
  await sleep(250)
  t(await ev(ws, sid, SNAP_TAKE), '[' + skin + '] 비교 닫고 목록 화면 잔존')

  // 5) 제목 스냅샷(입력+Enter) → 2개, 제목 표시
  await ev(ws, sid, TITLE_SNAP); await sleep(350)
  const c2 = await ev(ws, sid, SNAP_COUNT)
  t(c2 === 2 && (await ev(ws, sid, TITLE_PRESENT)), '[' + skin + '] 제목 스냅샷 추가(2개·제목 표시)')

  // 6) 되돌리기(원복) — 본문 C 로 바꾼 뒤 가장 오래된(본문 A) 스냅샷으로 복원
  await ev(ws, sid, 'window.__scriv.setBody(' + JSON.stringify(RTF_C) + ')'); await sleep(200)
  await ev(ws, sid, OVERRIDE_DIALOGS) // window.confirm → true
  t(await ev(ws, sid, ROLLBACK_LAST), '[' + skin + '] 가장 오래된 스냅샷 "되돌리기" 클릭')
  await sleep(400)
  const body = JSON.parse(await ev(ws, sid, "(()=>{var b=window.__scriv.bodyOf(" + JSON.stringify(aid) + ");return JSON.stringify({delta:/delta/.test(b),golf:/golf/.test(b)})})()"))
  t(body.delta && !body.golf, '[' + skin + '] 본문이 A 시점으로 원복(delta 복귀·golf 제거)')
  const c3 = await ev(ws, sid, SNAP_COUNT)
  t(c3 === 3 && (await ev(ws, sid, AUTOSNAP_PRESENT)), '[' + skin + '] 되돌리기 전 본문 자동저장 스냅샷 생성(3개)')

  // 7) 삭제 — 첫 스냅샷(자동저장) 제거
  t(await ev(ws, sid, DELETE_FIRST), '[' + skin + '] 스냅샷 "삭제" 클릭')
  await sleep(300)
  t((await ev(ws, sid, SNAP_COUNT)) === 2, '[' + skin + '] 삭제 후 2개로 감소')

  t(errs.length === e0, '[' + skin + '] 스냅샷 조작 전 과정 콘솔에러 없음(' + (errs.length - e0) + ')')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "(typeof window.__setView==='function'&&typeof window.__scriv==='object'&&!!window.__scriv&&typeof window.__scriv.setBody==='function')")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "(function(){try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){}return 1})()")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await ev(ws, sid, CLOSE_WELCOME); await sleep(400)
    errs.length = 0
    try { await runSkin(ws, sid, skin, t, errs) } catch (e) { bad.push('[' + skin + '] 예외: ' + e.message) }
  }
  console.log('=== 인스펙터 스냅샷 세밀 검증(양 스킨) ===')
  ok.forEach((m) => console.log('  ✓ ' + m)); bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
