// 메뉴바 전수 실동작 검증(양 스킨) — 파일/문서/도구/보기 드롭다운의 '모든' menuitem 을 하나씩 실제 클릭하고
// 결과(모달 출현 / 뷰 전환 / 항목 +1 / 집중모드 토글 / 파일·다운로드 항목은 앱 생존=예외0)를 단언한다.
// 코드리뷰가 아니라 '조작→사용자가 원하는 결과' 확인. 출력 '결과: N 통과 / M 실패'.  (작성 전용: node --check 통과)
//
// 하니스 규약: Target.createTarget 로 직접 생성 + attachToTarget flatten. (about:blank+navigate 금지)
// 이 테스트는 '클릭' 만 쓰므로 Runtime.enable 호출 OK(예외/콘솔 캡처). Input 드래그는 쓰지 않는다.
// JS 다이얼로그(confirm/alert)는 Page.javascriptDialogOpening 에서 자동 닫아 행(hang) 방지.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 페이지에 주입할 헬퍼(스킨 무관). 메뉴 트리거/드롭다운/모달감지/정리.
const INSTALL = `
window.__qa = {
  DIALOG: ".modal-backdrop,.modal-overlay,.palette,.cmd-palette,[role='dialog']:not(.toolwin):not(.tour-bubble)",
  trig: function(label){ return [].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(b){return (b.textContent||'').trim()===label}); },
  openMenu: function(label){ var b=this.trig(label); if(!b) return false; b.click(); return true; },
  dropBtns: function(){ var dds=[].slice.call(document.querySelectorAll('.dropdown[role=menu]')); var dd=dds[dds.length-1]; if(!dd) return []; return [].slice.call(dd.querySelectorAll('button')); },
  listItems: function(){ return this.dropBtns().map(function(b){return {label:(b.textContent||'').trim(), disabled:!!b.disabled}}); },
  clickNth: function(i){ var bs=this.dropBtns(); if(!bs[i]) return null; var l=(bs[i].textContent||'').trim(); bs[i].click(); return l; },
  dialogOpen: function(){ return !!document.querySelector(this.DIALOG); },
  hasSel: function(sel){ return !!document.querySelector(sel); },
  itemCount: function(){ try{return window.__scriv.state().items}catch(e){return -1} },
  compOpen: function(){ return !!document.querySelector('.composition'); },
  alive: function(){ return typeof window.__setView==='function' && typeof window.__setModal==='function'; },
  cleanup: function(){
    try{ if(window.__setModal) window.__setModal(null) }catch(e){}
    try{ window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); }catch(e){}
    try{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); }catch(e){}
    var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip,button')).find(function(x){return /^(시작하기|다시 보지|그만 보기|그만보기|닫기|취소)/.test((x.textContent||'').trim())});
    if(b)b.click();
    try{ document.body.click(); }catch(e){}
    return 1;
  }
};
return 1;
`

const VIEWMAP = {
  '에디터': '.paper', '코르크보드': '.corkboard', '아웃라이너': '.outliner', '칸반 보드': '.board',
  '스토리 캔버스': '.canvas-area', '연재 관리': '.serial-board', '스토리 타임라인': '.st-center,.center',
  '참고문헌': '.st-center,.center', '논증 작업대': '.st-center,.center', '데이터베이스': '.db-table,.st-center,.center',
}
// 파일피커/다운로드/가져오기·내보내기 항목 → 클릭 후 '앱 생존(예외0)' 만 단언
const FILEOP = /가져오기|폴더 열기|파일 열기|폴더로 저장|파일로 내보내기|\.scriv|빈 프로젝트/
// setModal(...) 을 여는 항목 → '모달 출현' 단언
const MODAL = /새 프로젝트|프로젝트 목록|원고 내보내기|플랫폼별 발행|독자뷰|백업 ?\/ ?복원|새 문서 \(템플릿\)|플롯 구조 템플릿|문서 링크 삽입|창작 스튜디오|도구 허브|장르별 도구함|프로젝트 통계|글쓰기 분석|언어 초점|긴장도|이름 생성기|전체 찾아|프로젝트 설정|명령 팔레트/

function categorize(label, menuId) {
  if (menuId === 'view' && VIEWMAP[label]) return { cat: 'view', sel: VIEWMAP[label] }
  if (label === '집중 모드') return { cat: 'comp' }
  if (/^새 텍스트|^새 폴더/.test(label)) return { cat: 'add' }
  if (FILEOP.test(label)) return { cat: 'survive' }
  if (MODAL.test(label)) return { cat: 'modal' }
  return { cat: 'survive' } // 토글·내비·기타 액션도 '생존(예외0)' 으로
}

const MENUS = [['file', '파일'], ['doc', '문서'], ['tools', '도구'], ['view', '보기']]

async function runSkin(ws, sid, skin, t, getExc, getConErr) {
  for (const [menuId, label] of MENUS) {
    // 메뉴 열기 + 항목 목록
    const opened = await ev(ws, sid, "return window.__qa.openMenu('" + label + "')"); await sleep(160)
    const items = JSON.parse(await ev(ws, sid, "return JSON.stringify(window.__qa.listItems())") || '[]')
    await ev(ws, sid, "return window.__qa.cleanup()"); await sleep(130)
    t(opened && items.length > 0, '[' + skin + '] ' + label + ' 메뉴 열림·항목 ' + items.length + '개')

    for (let i = 0; i < items.length; i++) {
      const il = items[i].label
      const c = categorize(il, menuId)
      const e0 = getExc()
      let before = -1
      if (c.cat === 'add') before = await ev(ws, sid, "return window.__qa.itemCount()")

      // 매 항목마다 메뉴를 다시 열고 i 번째를 클릭(클릭하면 메뉴가 닫히므로)
      await ev(ws, sid, "return window.__qa.openMenu('" + label + "')"); await sleep(160)
      const clicked = await ev(ws, sid, "return window.__qa.clickNth(" + i + ")")
      const wait = c.cat === 'modal' ? 480 : c.cat === 'view' ? 360 : c.cat === 'comp' ? 360 : 280
      await sleep(wait)

      let pass = false, detail = ''
      if (clicked === null) { pass = false; detail = '드롭다운에서 항목 못 찾음' }
      else if (c.cat === 'modal') { pass = await ev(ws, sid, "return window.__qa.dialogOpen()"); detail = '모달출현=' + pass }
      else if (c.cat === 'view') { pass = await ev(ws, sid, "return window.__qa.hasSel('" + c.sel + "')"); detail = '뷰컨테이너=' + pass }
      else if (c.cat === 'add') { const after = await ev(ws, sid, "return window.__qa.itemCount()"); pass = before >= 0 && after > before; detail = '항목 ' + before + '→' + after }
      else if (c.cat === 'comp') {
        // #28: 집중 모드는 '현재 창에서 / 새 창에서' 선택 모달을 먼저 띄운다 → '현재 창' 선택 후 오버레이 판정
        await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.focus-chooser button, .modal button')).find(function(x){return /현재 창/.test(x.textContent||'')});if(b)b.click();return !!b"); await sleep(400)
        pass = await ev(ws, sid, "return window.__qa.compOpen()"); detail = '집중모드오버레이=' + pass
      }
      else { const alive = await ev(ws, sid, "return window.__qa.alive()"); pass = alive && getExc() === e0; detail = getExc() > e0 ? ('예외+' + (getExc() - e0)) : '생존(예외0)' }

      // 효과형(modal/view/add/comp) 도 새 예외가 생기면 실패로 간주
      if (c.cat !== 'survive' && getExc() > e0) { pass = false; detail += ' +예외' + (getExc() - e0) }

      t(pass, '[' + skin + '] ' + label + '>' + (il || '(빈)') + ' [' + c.cat + '] ' + detail)
      await ev(ws, sid, "return window.__qa.cleanup()"); await sleep(150)
    }
    // 보기 메뉴에서 뷰가 바뀌었을 수 있으니 에디터로 복귀
    if (menuId === 'view') { await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(180) }
  }
  // 정리 후 콘솔에러 요약(생존 단언 자체는 예외 기준; 콘솔에러는 참고용)
  return { conErr: getConErr() }
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  let excCount = 0, conErrCount = 0
  ws.addEventListener('message', e => {
    let d; try { d = JSON.parse(e.data) } catch { return }
    if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') excCount++
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') conErrCount++
    if (d.method === 'Page.javascriptDialogOpening') { rpc(ws, 'Page.handleJavaScriptDialog', { accept: false }, sid).catch(() => {}) }
  })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Page.enable', {}, sid)

  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const notes = []
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'")) return true } catch { /* loading */ } } return false }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    const ready = await waitHook()
    t(ready, '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    if (!ready) continue
    // 환영/투어 닫기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    await ev(ws, sid, INSTALL)
    const e0 = excCount, c0 = conErrCount
    await runSkin(ws, sid, skin, t, () => excCount, () => conErrCount)
    if (conErrCount > c0) notes.push('[' + skin + '] 메뉴 조작 중 콘솔 error ' + (conErrCount - c0) + '건(참고)')
    if (excCount > e0) notes.push('[' + skin + '] 메뉴 조작 중 미처리 예외 ' + (excCount - e0) + '건 — [APP-BUG] 의심')
  }

  console.log('=== 메뉴바 전수 실동작 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  if (notes.length) { console.log('--- 비고 ---'); notes.forEach(n => console.log('  • ' + n)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
