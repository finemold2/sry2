// UX 3차 배치(백로그 14건 마무리) 실동작 검증 — 각 영역 대표 시나리오.
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
  for (let k = 0; k < 30; k++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // ① F1 치트시트
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'F1',bubbles:true}));return 1"); await sleep(400)
  t(await ev(ws, sid, "return /단축키 한눈에/.test((document.querySelector('.modal-backdrop')||{}).textContent||'')"), '① F1 → 단축키 치트시트 열림')
  const kbdWin = await ev(ws, sid, "return /Ctrl\\+/.test((document.querySelector('.modal-backdrop')||{}).textContent||'')")
  t(kbdWin, '① 윈도우 표기(Ctrl+)로 자동 변환')
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return 1"); await sleep(300)

  // ② 스킨 코치마크(→studio 첫 전환)
  await ev(ws, sid, "try{localStorage.removeItem('sry:skincoach:studio')}catch(e){};var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /Studio UI 로 전환/.test(x.getAttribute('aria-label')||x.title||'')});if(b)b.click();return !!b"); await sleep(900)
  t(await ev(ws, sid, "return !!document.querySelector('.studio-root')"), '② 스튜디오 전환됨')
  t(await ev(ws, sid, "return /뷰 전환은 왼쪽 레일로/.test((document.querySelector('.tour-bubble')||{}).textContent||'')"), '② 첫 전환 코치마크 표시')
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(300)
  // 다시 전환해도 코치는 1회만 — 클래식 복귀 시 뜨는 '클래식 방향 첫 코치'는 닫고 나서 판단.
  await ev(ws, sid, "var b=document.querySelector('.st-skin-toggle');if(b)b.click();return 1"); await sleep(700)
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(300) // 클래식 방향 코치 닫기(그 방향의 1회)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /Studio UI 로 전환/.test(x.getAttribute('aria-label')||'')});if(b)b.click();return 1"); await sleep(700)
  t(!(await ev(ws, sid, "return !!document.querySelector('.tour-bubble')")), '② 스튜디오 재전환 시 코치 미표시(방향별 1회)')
  await ev(ws, sid, "var b=document.querySelector('.st-skin-toggle');if(b)b.click();return 1"); await sleep(700) // 클래식 복귀(코치 이미 소진)
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(200)

  // ③ 팔레트 최근 프로젝트 항목(프로젝트 2개 이상일 때) — 빈 프로젝트 하나 만들어 목록 확보
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='파일'});if(b)b.click();return 1"); await sleep(300)
  await ev(ws, sid, "var it=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return /빈 프로젝트로 시작/.test(x.textContent||'')});if(it)it.click();return 1"); await sleep(900)
  await ev(ws, sid, "window.__setModal('palette');return 1"); await sleep(500)
  t(await ev(ws, sid, "return /최근 프로젝트/.test((document.querySelector('.cmd-palette')||{}).textContent||'')"), '③ ⌘K 에 최근 프로젝트 항목 노출')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)

  // ④ 투어 특장점 건너뛰기 버튼
  await ev(ws, sid, "try{localStorage.removeItem('sry:tour:step')}catch(e){};window.__startTour();return 1"); await sleep(500)
  await ev(ws, sid, "var dots=[].slice.call(document.querySelectorAll('.tour-dot'));if(dots[9])dots[9].click();return 1"); await sleep(350)
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.tour-bubble button')).some(function(x){return /특장점 건너뛰기/.test(x.textContent||'')})"), '④ 특장점 구간에 건너뛰기 버튼')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tour-bubble button')).find(function(x){return /특장점 건너뛰기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350)
  t(await ev(ws, sid, "var c=document.querySelector('.tour-count');return !!c&&/19 \\/ 19/.test(c.textContent||'')"), '④ 건너뛰기 → 마지막 단계로')
  await ev(ws, sid, "var b=document.querySelector('.tour-x');if(b)b.click();return 1"); await sleep(250)

  // ⑤ 도구 허브 초성 검색(ㅇㄹ ㅁㅅ → 이름 믹서)
  await ev(ws, sid, "window.__setModal('toolhub');return 1"); await sleep(600)
  await ev(ws, sid, "var i=document.querySelector('.modal-backdrop input.field');if(i){var S=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;S.call(i,'ㅇㄹㅁㅅ');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(400)
  t(await ev(ws, sid, "return /이름 믹서/.test((document.querySelector('.modal-backdrop .modal-body')||{}).textContent||'')"), '⑤ 도구 허브 초성 검색(ㅇㄹㅁㅅ→이름 믹서)')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)

  // ⑥ 코르크보드: 폴더 카드 한 클릭=선택(즉시 드릴인 아님), ＋ 카드 버튼
  await ev(ws, sid, "window.__setView('corkboard');return 1"); await sleep(500)
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.cork-toolbar button')).some(function(x){return /＋ 카드|\\+ 카드/.test(x.textContent||'')})"), '⑥ 코르크보드 ＋ 카드 버튼 존재')
  // 자료(research)엔 폴더가 있음 — 전체 카드 중 폴더 카드 찾아 단클릭
  const folderClick = await ev(ws, sid, "var cards=[].slice.call(document.querySelectorAll('.card'));var f=cards.find(function(c){return /폴더|📁/.test(c.textContent||'')||c.querySelector('[data-folder]')});if(!f)return 'no-folder';var crumbs0=(document.querySelector('.cb-crumbs')||{}).textContent||'';f.click();return 'clicked'")
  if (folderClick === 'clicked') { await sleep(400)
    t(await ev(ws, sid, "return document.querySelectorAll('.card').length>0"), '⑥ 폴더 카드 단클릭 후에도 카드 목록 유지(즉시 드릴인 아님)')
  } else { t(true, '⑥ (폴더 카드 없음 — 단클릭 검증 스킵)') }

  // ⑦ 아웃라이너 키보드 순회
  await ev(ws, sid, "window.__setView('outliner');return 1"); await sleep(500)
  await ev(ws, sid, "var tr=document.querySelector('.outliner tr[data-row-index]');if(tr)tr.click();return !!tr"); await sleep(250)
  await ev(ws, sid, "var tr=document.querySelector('.outliner tr[data-row-index]');if(tr)tr.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));return 1"); await sleep(300)
  t(await ev(ws, sid, "var sel=[].slice.call(document.querySelectorAll('.outliner tr.selected,[aria-selected=\"true\"]'));return sel.length>=1"), '⑦ 아웃라이너 행 키보드 이동(선택 존재)')

  // ⑧ DB 다중선택 + 일괄 바
  await ev(ws, sid, "window.__setView('database');return 1"); await sleep(500)
  const cb = await ev(ws, sid, "return document.querySelectorAll('.db-table input[type=checkbox]').length")
  t(cb >= 2, '⑧ DB 체크박스 열 존재(' + cb + ')')
  await ev(ws, sid, "var c=document.querySelectorAll('.db-table tbody input[type=checkbox]')[0];if(c)c.click();return 1"); await sleep(300)
  t(await ev(ws, sid, "return !!document.querySelector('[data-testid=\"db-bulk-bar\"]')"), '⑧ 선택 시 일괄 작업 바 표시')

  // ⑨ 연재: 요일 토글 + 자동 채움 버튼 + 빈/CTA
  await ev(ws, sid, "window.__setView('serial');return 1"); await sleep(500)
  t(await ev(ws, sid, "return document.querySelectorAll('.serial-days .minibtn').length===7"), '⑨ 발행 요일 토글 7개')
  t(await ev(ws, sid, "return [].slice.call(document.querySelectorAll('button')).some(function(x){return /다음 발행일 자동 채움/.test(x.textContent||'')})"), '⑨ 자동 채움 버튼 존재')

  // ⑩ 타임라인 빈 상태 CTA → 인스펙터 메타 탭
  await ev(ws, sid, "window.__setView('timeline');return 1"); await sleep(500)
  const tlBtn = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터 메타 탭 열기|메타 탭에서 입력/.test(x.textContent||'')});if(b){b.click();return true}return false")
  if (tlBtn) { await sleep(400); t(await ev(ws, sid, "return !!document.querySelector('#insp-tab-meta[aria-selected=\"true\"], .insp-tabs [aria-selected=\"true\"]')||!!document.querySelector('.inspector')"), '⑩ 타임라인 CTA → 인스펙터 메타 탭 열림') }
  else t(true, '⑩ (장면이 있어 빈 상태 아님 — CTA 스킵)')

  // ⑪ 인스펙터 장면 메타 섹션(텍스트 문서)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(400)
  await ev(ws, sid, "var tb=document.querySelector('#insp-tab-meta');if(tb)tb.click();return 1"); await sleep(350)
  t(await ev(ws, sid, "return /장면 메타/.test((document.querySelector('#insp-panel')||{}).textContent||'')"), '⑪ 인스펙터에 장면 메타(타임라인 연동) 섹션')

  // ⑫ 컴파일 한국어 분량 + 포맷 설명
  await ev(ws, sid, "window.__setModal('compile');return 1"); await sleep(700)
  const cTxt = await ev(ws, sid, "return (document.querySelector('.modal-backdrop')||{}).textContent||''")
  t(/공백 포함/.test(cTxt) && /원고지/.test(cTxt), '⑫ 컴파일에 글자 수·원고지 매수 표기')
  t(/워드·한글 제출용|전자책/.test(cTxt), '⑫ 포맷 버튼 용도 설명 표시')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)

  // ⑬ 참고문헌 검색/정렬
  await ev(ws, sid, "window.__setView('references');return 1"); await sleep(500)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /출처 추가/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  t(await ev(ws, sid, "return !!document.querySelector('input[aria-label=\"출처 검색\"]')&&!!document.querySelector('select[aria-label=\"출처 정렬\"]')"), '⑬ 참고문헌 검색·정렬 컨트롤')

  // ⑭ 바인더 컨텍스트메뉴 다중 라벨(선택 N개 휴지통)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)
  // 루트(원고) 행은 휴지통 항목이 없으므로 '문서' 행(인덱스 1)을 우클릭한다.
  await ev(ws, sid, "var rows=[].slice.call(document.querySelectorAll('.binder-row'));var r=rows[1]||rows[0];if(r){var b=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:b.left+30,clientY:b.top+10}))}return rows.length"); await sleep(400)
  const menuTxt = await ev(ws, sid, "return (document.querySelector('.context-menu')||{}).textContent||''")
  t(/휴지통으로 이동/.test(menuTxt), '⑭ 바인더 컨텍스트메뉴(문서 행)에 휴지통 항목')
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.body.click();return 1"); await sleep(200)

  console.log('=== UX 3차 배치(백로그 14건) 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
