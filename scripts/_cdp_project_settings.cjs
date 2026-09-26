// 프로젝트 설정 영속 — 설정 모달의 편집창 폭·문단 간격·줄간격·목표 단위·자동저장·프리셋을
// 실제로 조작하면 .paper(에디터)에 즉시 반영되고, 새로고침 후에도 유지되는지 + 테마 전환 영속을
// '실사용 조작 → 결과' 로 검증한다(양 스킨). 클릭/입력만 사용(드래그 없음 → Runtime.enable 로 콘솔에러 캡처).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 페이지 헬퍼(설정 모달 컨트롤을 라벨 텍스트로 찾는다). 양 스킨 동일 모달이라 재사용.
const HELPERS = `
window.__ps={
  // 라벨 span 다음에 오는 input/select 반환
  inp:function(txt){var ss=[].slice.call(document.querySelectorAll('.modal span'));var s=ss.find(function(x){return (x.textContent||'').trim().indexOf(txt)===0});if(!s)return null;var n=s.nextElementSibling;while(n&&!/^(INPUT|SELECT)$/.test(n.tagName))n=n.nextElementSibling;return n;},
  setNum:function(txt,v){var el=this.inp(txt);if(!el)return false;var st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;st.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));return true;},
  setSel:function(txt,v){var el=this.inp(txt);if(!el)return false;var st=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;st.call(el,v);el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  valOf:function(txt){var el=this.inp(txt);return el?el.value:null;},
  preset:function(name){var b=[].slice.call(document.querySelectorAll('.modal button')).find(function(x){return (x.textContent||'').trim()===name});if(b){b.click();return true}return false;},
  paper:function(){var p=document.querySelector('.paper');if(!p)return null;var cs=getComputedStyle(p);return JSON.stringify({mw:p.style.maxWidth,gap:cs.getPropertyValue('--ed-para-gap').trim(),line:cs.getPropertyValue('--ed-line').trim()});}
};return 1`

async function runSkin(ws, sid, skin, t, errs, waitHook, closeWelcome) {
  // ---- 로드 ----
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1400)
  await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
  await closeWelcome()
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)
  await ev(ws, sid, HELPERS)
  const e0 = errs.length

  // ---- 설정 모달 열기 ----
  await ev(ws, sid, "window.__setModal('settings');return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.modal h2')&&/프로젝트 설정/.test((document.querySelector('.modal h2')||{}).textContent||'')"), '[' + skin + '] 설정 모달 열림')

  // ---- 편집창 폭(px) → .paper maxWidth 즉시 반영 ----
  await ev(ws, sid, "return window.__ps.setNum('편집창 폭',900)"); await sleep(220)
  let pp = JSON.parse(await ev(ws, sid, "return window.__ps.paper()"))
  t(pp && pp.mw === '900px', '[' + skin + '] 편집창 폭 900 → .paper maxWidth=' + (pp && pp.mw))

  // ---- 문단 간격(em) → --ed-para-gap 반영 ----
  await ev(ws, sid, "return window.__ps.setNum('문단 간격',1.5)"); await sleep(220)
  pp = JSON.parse(await ev(ws, sid, "return window.__ps.paper()"))
  t(pp && pp.gap === '1.5em', '[' + skin + '] 문단 간격 1.5 → --ed-para-gap=' + (pp && pp.gap))

  // ---- 줄간격(배수) → --ed-line 반영 ----
  await ev(ws, sid, "return window.__ps.setNum('줄간격',1.8)"); await sleep(220)
  pp = JSON.parse(await ev(ws, sid, "return window.__ps.paper()"))
  t(pp && pp.line === '1.8', '[' + skin + '] 줄간격 1.8 → --ed-line=' + (pp && pp.line))

  // ---- 프리셋 버튼(웹소설 여백 큼: 680 / 1.1 / 1.9) → 세 값 동시 변경 ----
  t(await ev(ws, sid, "return window.__ps.preset('웹소설(여백 큼)')"), '[' + skin + '] 프리셋 "웹소설(여백 큼)" 버튼 존재')
  await sleep(260)
  pp = JSON.parse(await ev(ws, sid, "return window.__ps.paper()"))
  t(pp && pp.mw === '680px' && pp.gap === '1.1em' && pp.line === '1.9', '[' + skin + '] 프리셋 적용 → ' + (pp && pp.mw + '/' + pp.gap + '/' + pp.line))

  // ---- 목표 단위(select) → 인접 라벨 "원고 목표(글자)" 로 React 상태 반영 ----
  await ev(ws, sid, "return window.__ps.setSel('목표 단위','chars')"); await sleep(220)
  t(await ev(ws, sid, "return /원고 목표\\(글자\\)/.test((document.querySelector('.modal')||{}).textContent||'')&&window.__ps.valOf('목표 단위')==='chars'"), '[' + skin + '] 목표 단위 → 글자(자) 반영')

  // ---- 자동 저장(select) → 값 변경 ----
  await ev(ws, sid, "return window.__ps.setSel('자동 저장','3000')"); await sleep(220)
  t(await ev(ws, sid, "return window.__ps.valOf('자동 저장')==='3000'"), '[' + skin + '] 자동 저장 → 3초 선택 반영')

  // ---- 모달 닫기(완료 버튼) ----
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal-foot button,.modal button')).find(function(x){return /완료/.test(x.textContent||'')});if(b)b.click();else window.__setModal(null);return 1"); await sleep(350)
  t(!(await ev(ws, sid, "return !!document.querySelector('.modal-backdrop')")), '[' + skin + '] 설정 모달 닫힘(완료)')

  // 설정 편집 동안 콘솔 에러 없음
  t(errs.length === e0, '[' + skin + '] 설정 편집 중 콘솔 에러 없음(' + (errs.length - e0) + ')')

  // ---- 자동저장 대기 후 새로고침 → 영속 확인 ----
  await sleep(4200) // autosave 디바운스(직전 3초로 변경) + 여유
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  t(await waitHook(), '[' + skin + '] 새로고침 후 재로드')
  await closeWelcome()
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(350)
  await ev(ws, sid, HELPERS)
  pp = JSON.parse(await ev(ws, sid, "return window.__ps.paper()"))
  t(pp && pp.mw === '680px', '[' + skin + '] 영속: 편집창 폭 680 유지(' + (pp && pp.mw) + ')')
  t(pp && pp.gap === '1.1em' && pp.line === '1.9', '[' + skin + '] 영속: 문단간격/줄간격 1.1em/1.9 유지(' + (pp && pp.gap + '/' + pp.line) + ')')

  // 설정 모달 재오픈 → select/입력값 영속 확인
  await ev(ws, sid, "window.__setModal('settings');return 1"); await sleep(450)
  const persisted = JSON.parse(await ev(ws, sid, "return JSON.stringify({unit:window.__ps.valOf('목표 단위'),auto:window.__ps.valOf('자동 저장'),w:window.__ps.valOf('편집창 폭')})"))
  t(persisted.unit === 'chars' && persisted.auto === '3000' && persisted.w === '680', '[' + skin + '] 영속: 목표단위=chars·자동저장=3000·폭=680 (' + JSON.stringify(persisted) + ')')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal-foot button,.modal button')).find(function(x){return /완료/.test(x.textContent||'')});if(b)b.click();else window.__setModal(null);return 1"); await sleep(300)

  // ---- 테마 전환 영속 ----
  const themeBefore = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||'light'")
  await ev(ws, sid, "var b=document.querySelector('[aria-label=\"테마 전환\"],[title*=\"테마\"]');if(b)b.click();return 1"); await sleep(400)
  const themeAfter = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||''")
  const lsTheme = await ev(ws, sid, "return localStorage.getItem('sry:theme')||''")
  t(themeAfter && themeAfter !== themeBefore && lsTheme === themeAfter, '[' + skin + '] 테마 전환 동작(' + themeBefore + '→' + themeAfter + ', localStorage=' + lsTheme + ')')
  await sleep(300)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  t(await waitHook(), '[' + skin + '] 테마 전환 후 재로드')
  await closeWelcome(); await sleep(250)
  const themeReload = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||''")
  const lsReload = await ev(ws, sid, "return localStorage.getItem('sry:theme')||''")
  t(themeReload === themeAfter && lsReload === themeAfter, '[' + skin + '] 영속: 새로고침 후 테마 유지(' + themeReload + ')')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'")) return true } catch { /* loading */ } } return false }
  const closeWelcome = async () => { await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400) }

  for (const skin of ['classic', 'studio']) {
    errs.length = 0
    await runSkin(ws, sid, skin, t, errs, waitHook, closeWelcome)
  }
  console.log('=== 프로젝트 설정 영속 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
