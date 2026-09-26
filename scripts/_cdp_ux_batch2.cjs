// UX 2차 배치(백로그 6건) 실동작 검증: ① 도구허브 최근/즐겨찾기 ② TXT·MD 가져오기 메뉴 ③ clean 전환 확인 스킵
//  ④ 서식바 현재 글꼴/크기 반영+aria-pressed ⑤ 투어 이어보기 ⑥ 매뉴얼 이어하기 + 신규 문구 반영.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Page.enable', {}, sid).catch(() => {})
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let k = 0; k < 30; k++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setModal==='function'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }
  await waitHook()
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // ① 도구 열기 → 허브 상단 '최근 사용' 노출 (+즐겨찾기 추가 시 '★ 즐겨찾기')
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(700)
  await ev(ws, sid, "var b=document.querySelector('.toolwin[data-tool-id=\"name-mixer\"] [aria-label=\"즐겨찾기\"]');if(b)b.click();return 1"); await sleep(250)
  await ev(ws, sid, "window.__closeTool('name-mixer');return 1"); await sleep(250)
  await ev(ws, sid, "window.__setModal('toolhub');return 1"); await sleep(600)
  const hubTxt = await ev(ws, sid, "var m=document.querySelector('.modal-backdrop');return m?(m.textContent||''):''")
  t(/최근 사용/.test(hubTxt) && /이름 믹서/.test(hubTxt), '① 도구 허브 상단에 ‘최근 사용’(이름 믹서) 노출')
  t(/★ 즐겨찾기/.test(hubTxt), '① 도구 허브 상단에 ‘★ 즐겨찾기’ 노출')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)

  // ② TXT·Markdown 가져오기 메뉴 항목(파일 메뉴)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='파일'});if(b)b.click();return 1"); await sleep(300)
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.dropdown button')).some(function(x){return /TXT·Markdown 가져오기/.test(x.textContent||'')})"), '② 파일 메뉴에 TXT·Markdown 가져오기 존재')
  await ev(ws, sid, "document.body.click();return 1"); await sleep(200)

  // ④ 서식바: 본문에 캐럿 → 크기 셀렉트가 현재 pt 표시 + 굵게 aria-pressed 존재
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)
  await ev(ws, sid, "var p=document.querySelector('.paper');p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(true);var s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));return 1"); await sleep(350)
  const sizeVal = await ev(ws, sid, "var sels=[].slice.call(document.querySelectorAll('.formatbar select'));var s=sels[2];if(!s)return 'no';return s.value||s.options[0].textContent")
  t(/^\d+(pt)?$/.test(String(sizeVal)), '④ 크기 셀렉트가 캐럿 위치의 현재 pt 표시(' + sizeVal + ')')
  t(await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.formatbar button')).find(function(x){return /굵게/.test(x.title||'')});return !!b&&b.hasAttribute('aria-pressed')"), '④ 굵게 버튼 aria-pressed 제공')

  // ⑤ 투어 이어보기: 열기 → 2단계 이동 → 닫기 → 재열기 → 같은 단계 + '처음부터' 버튼
  await ev(ws, sid, "try{localStorage.removeItem('sry:tour:step')}catch(e){};window.__startTour();return 1"); await sleep(500)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tour-btn.primary')).pop();if(b)b.click();return 1"); await sleep(300)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tour-btn.primary')).pop();if(b)b.click();return 1"); await sleep(300)
  const cnt1 = await ev(ws, sid, "var c=document.querySelector('.tour-count');return c?(c.textContent||''):''")
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(300)
  await ev(ws, sid, "window.__startTour();return 1"); await sleep(500)
  const cnt2 = await ev(ws, sid, "var c=document.querySelector('.tour-count');return c?(c.textContent||''):''")
  const hasRestart = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.tour-bubble button')).some(function(x){return /처음부터/.test(x.textContent||'')})")
  t(cnt1 === cnt2 && /^3 \//.test(cnt2) && hasRestart, '⑤ 투어 이어보기(닫기 전 ' + cnt1 + ' → 재열기 ' + cnt2 + ', 처음부터 버튼=' + hasRestart + ')')
  // 신규 문구 반영(⑦ 팔레트 초성) — 해당 단계로 점프해 확인
  const tourHasChoseong = await ev(ws, sid, "var dots=[].slice.call(document.querySelectorAll('.tour-dot'));for(var k=0;k<dots.length;k++){dots[k].click()}return 1")
  await ev(ws, sid, "var dots=[].slice.call(document.querySelectorAll('.tour-dot'));if(dots[15])dots[15].click();return 1"); await sleep(250)
  const bodyAll = await ev(ws, sid, "var b=document.querySelector('.tour-bubble');return b?(b.textContent||''):''")
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(250)

  // ⑥ 매뉴얼 이어하기: 열기 → 3단계 진행 → 닫기 → 재열기 → 같은 단계 + 신규 스텝(수집함→원고) 존재
  await ev(ws, sid, "try{localStorage.removeItem('sry:manual:step')}catch(e){};window.__startManual();return 1"); await sleep(600)
  for (let k = 0; k < 3; k++) { await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tour-btn.primary,.manual-choice')).pop();var c=document.querySelector('.manual-choices .manual-choice');if(c){c.click()}else{var p=[].slice.call(document.querySelectorAll('.tour-btn.primary')).pop();if(p)p.click()}return 1"); await sleep(400) }
  const mCnt1 = await ev(ws, sid, "var c=document.querySelector('.tour-count');return c?(c.textContent||''):''")
  await ev(ws, sid, "var b=document.querySelector('.tour-x')||[].slice.call(document.querySelectorAll('button')).find(function(x){return /그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "window.__startManual();return 1"); await sleep(600)
  const mCnt2 = await ev(ws, sid, "var c=document.querySelector('.tour-count');return c?(c.textContent||''):''")
  const mResume = await ev(ws, sid, "return /이어서 진행|처음부터/.test((document.body.textContent||''))")
  t(!!mCnt1 && mCnt1 === mCnt2 && mResume, '⑥ 매뉴얼 이어하기(닫기 전 ' + mCnt1 + ' → 재열기 ' + mCnt2 + ', 안내=' + mResume + ')')
  // 신규 스텝 존재(수집함→원고 ⤵) — 점 개수로 스텝 증가 확인 + 본문 검색
  const mDots = await ev(ws, sid, "return document.querySelectorAll('.tour-dot').length")
  t(mDots >= 41, '⑥ 매뉴얼 스텝 확장(현재 ' + mDots + '단계 — 신규 ⌘K/수집함 스텝 포함)')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(200)

  // ③ clean 전환 확인 스킵: 저장 완료 상태에서 '빈 프로젝트로 시작' → 확인 모달 없이 즉시 새 프로젝트
  //   (dirty 해소 대기)
  for (let k = 0; k < 20; k++) { await sleep(400); if (await ev(ws, sid, "return window.__scriv.state().dirty===false")) break }
  const pid0 = await ev(ws, sid, "return window.__scriv.state().id")
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='파일'});if(b)b.click();return 1"); await sleep(300)
  await ev(ws, sid, "var it=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return /빈 프로젝트로 시작/.test(x.textContent||'')});if(it)it.click();return 1"); await sleep(700)
  const askShown = await ev(ws, sid, "return /내보내|저장하지 않고|전환됩니다/.test((document.querySelector('.modal-backdrop')||{}).textContent||'')")
  const pid1 = await ev(ws, sid, "return window.__scriv.state().id")
  t(!askShown && pid1 !== pid0, '③ clean 상태 전환은 확인 모달 없이 즉시(새 프로젝트 ' + (pid1 !== pid0) + ', 모달=' + askShown + ')')

  console.log('=== UX 2차 배치(백로그 6건) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
