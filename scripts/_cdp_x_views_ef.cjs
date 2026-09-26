// 박사급 QA/UX 실사용 베타 — 캔버스·타임라인·참고문헌·논증 심화(영역 EF).
// '코드리뷰'가 아니라 실제로 글 쓰는 사용자처럼 클릭/드래그/입력하며 "상식적으로 당연한데 안 되는 것"을 잡는다.
// 위반은 console.log("[ISSUE] ...") 로 출력하고 실패로 카운트한다. 단언 12개 이상.
//
// 점검 요약(각 항목은 t(조건, 설명) 으로 단언; 거짓이면 [ISSUE]):
//  [캔버스] 컨테이너 렌더 / 빈상태안내↔노드수 불변식 / '+카드' 추가 / 새 카드 입력칸 자동포커스 /
//           입력 후 카드뷰 반영 / 뷰 왕복 후 영속 / '+그룹' / 실제마우스 드래그(손떼도 안튕김) /
//           포트 드래그로 두 노드 연결 / 선택후 Delete 삭제 / '전체 맞춤' 무에러
//  [타임라인] 장면카드↔빈상태 불변식 / 스윔레인 POV 활성표시 / 플롯라인 활성표시 /
//             스토리시간순 정렬 켜면 수동 드래그 비활성 / 카드 클릭→에디터 이동(+activeId)
//  [참고문헌] 빈상태안내↔출처수 불변식 / '+출처 추가'→행+편집폼 / 제목·저자·연도 반영 /
//             인용양식 변경(APA↔IEEE) 미리보기 달라짐 / '현재 문서 끝에 추가'→본문 RTF 영속 /
//             '본문에 인용' disabled가 activeId와 일치 / 출처 삭제는 확인/되돌리기 있어야(데이터 안전)
//  [논증] 주장 모두 삭제→빈상태안내 / 주제문 왕복 영속 / '+주장 추가' / 주장텍스트 왕복 영속 /
//          근거 추가시 '근거 없음' 경고 사라짐 / 반박 추가시 '반론 미검토' 사라짐 /
//          근거 출처 select에 참고문헌 노출+선택시 인라인인용 표시 / 주장 삭제는 confirm 가드
//  [전역] 점검 동안 콘솔 에러 0
//
// 하니스 규약: Target.createTarget 직접 + attachToTarget flatten. Runtime.enable 호출 안 함(Input 드래그 보호).
//             콘솔 에러는 페이지측 console.error/onerror 후킹으로 수집한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // 페이지 표현식 평가(Runtime.evaluate 는 Runtime.enable 없이도 동작 → Input 드래그와 충돌 없음).
  const ev = async (x) => { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
  // 마우스(실제 포인터) — 캔버스 드래그/포트연결용. 키보드 — Delete/Escape용.
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved' ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 } : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  const clickAt = async (x, y) => { await M('mouseMoved', x, y); await M('mousePressed', x, y); await sleep(50); await M('mouseReleased', x, y); await sleep(140) }
  const drag = async (x0, y0, x1, y1, steps) => { steps = steps || 10; await M('mouseMoved', x0, y0); await M('mousePressed', x0, y0); await sleep(70); for (let i = 1; i <= steps; i++) { await M('mouseMoved', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await sleep(26) } await M('mouseReleased', x1, y1); await sleep(320) }
  const K = (type, key, code, vk) => rpc(ws, 'Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid)
  const pressKey = async (key, code, vk) => { await K('keyDown', key, code, vk); await sleep(30); await K('keyUp', key, code, vk); await sleep(120) }

  const setView = (v) => ev("window.__setView&&window.__setView('" + v + "');return 1")
  const errCount = () => ev("return (window.__errs&&window.__errs.length)||0")
  // 텍스트로 버튼/요소 클릭(정확/부분일치).
  const clickText = (selector, text, contains) => ev("var b=[].slice.call(document.querySelectorAll(" + JSON.stringify(selector) + ")).find(function(x){var t=(x.textContent||'').trim(); return " + (contains ? "t.indexOf(" + JSON.stringify(text) + ")>=0" : "t===" + JSON.stringify(text)) + "}); if(b){b.click(); return true} return false")

  const ok = [], bad = []
  const NOTE = (m) => console.log('  · (skip) ' + m)
  const t = (c, m) => { if (c) { ok.push(m) } else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // --- 로드 대기 + 환영/투어 닫기 + confirm/prompt 무력화(블로킹 방지) + 콘솔에러 후킹 + 마커 주입 ---
  let ready = false
  for (let i = 0; i < 40; i++) { await sleep(400); try { if (await ev("return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) { ready = true; break } } catch { /* loading */ } }
  t(ready, '앱 로드 + 테스트 훅(__setView/__scriv/__openTool) 준비')
  await ev("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev("window.__errs=window.__errs||[];var oe=console.error;console.error=function(){try{window.__errs.push([].slice.call(arguments).map(String).join(' '))}catch(e){}return oe.apply(console,arguments)};window.addEventListener('error',function(e){window.__errs.push('onerror:'+((e&&e.message)||''))});window.addEventListener('unhandledrejection',function(e){window.__errs.push('reject:'+((e&&e.reason&&e.reason.message)||(e&&e.reason)||''))});return 1")
  await ev("window.__confirms=0;window.confirm=function(){window.__confirms++;return true};window.__prompts=0;window.prompt=function(){window.__prompts++;return 'x'};return 1")
  const R = Math.floor(Date.now() / 1000) % 100000
  await ev("window.__MK={card:'CARDMK" + R + "',ref:'REFMK" + R + "',thesis:'THESISMK" + R + "',claim:'CLAIMMK" + R + "'};return 1")

  // ======================================================================
  // 1) 스토리 캔버스
  // ======================================================================
  await setView('canvas'); await sleep(500)
  t(await ev("return !!document.querySelector('.canvas-area')"), '[캔버스] 캔버스 영역(.canvas-area) 렌더')
  // 빈상태 안내는 노드가 0개일 때'만' 보여야 한다(불변식).
  {
    const n = await ev("return document.querySelectorAll('.canvas-node').length+document.querySelectorAll('.canvas-group').length")
    const emptyShown = await ev("return !!document.querySelector('.canvas-empty')")
    t(emptyShown === (n === 0), '[캔버스] 빈 상태 안내 ↔ 노드 수 불변식(노드 ' + n + '개, 안내=' + emptyShown + ')')
  }
  const n0 = await ev("return document.querySelectorAll('.canvas-node').length")
  const g0 = await ev("return document.querySelectorAll('.canvas-group').length")
  // '+ 카드'
  await clickText('.canvas-toolbar .minibtn', '+ 카드'); await sleep(450)
  t(await ev("return document.querySelectorAll('.canvas-node').length") === n0 + 1, "[캔버스] '+ 카드' 로 텍스트 카드가 1개 추가됨")
  t(await ev("var a=document.activeElement;return !!a&&a.classList&&a.classList.contains('canvas-node-text')"), '[캔버스] 새 카드 추가 시 입력칸(textarea)에 자동 포커스')
  // 카드에 마커 텍스트 입력 후 커밋(blur)
  await ev("var ta=document.querySelector('.canvas-node-text');if(ta){ta.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(ta,window.__MK.card+' 캔버스 메모');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.blur();ta.dispatchEvent(new Event('focusout',{bubbles:true}))}return 1"); await sleep(400)
  t(await ev("return [].slice.call(document.querySelectorAll('.canvas-node-view')).some(function(v){return (v.textContent||'').indexOf(window.__MK.card)>=0})"), '[캔버스] 입력한 메모가 카드 뷰(.canvas-node-view)에 표시됨')
  // 뷰 왕복 후 영속
  await setView('editor'); await sleep(350); await setView('canvas'); await sleep(450)
  t(await ev("return [].slice.call(document.querySelectorAll('.canvas-node-view')).some(function(v){return (v.textContent||'').indexOf(window.__MK.card)>=0})"), '[캔버스] 뷰 왕복(editor↔canvas) 후에도 카드 메모 영속')
  // '+ 그룹'
  await clickText('.canvas-toolbar .minibtn', '+ 그룹'); await sleep(450)
  t(await ev("return document.querySelectorAll('.canvas-group').length") === g0 + 1, "[캔버스] '+ 그룹' 으로 그룹이 1개 추가됨")

  // 노드 좌표 조회 헬퍼(마커 카드 / 빈 카드)
  const nodeByMark = () => ev("var ns=[].slice.call(document.querySelectorAll('.canvas-node'));var tgt=ns.find(function(n){var v=n.querySelector('.canvas-node-view, .canvas-node-text');return v&&((v.textContent||'')+(v.value||'')).indexOf(window.__MK.card)>=0});if(!tgt)return '';var r=tgt.getBoundingClientRect();var p=tgt.querySelector('.canvas-port.right');var pr=p?p.getBoundingClientRect():r;return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2,px:pr.left+pr.width/2,py:pr.top+pr.height/2,left:parseFloat(tgt.style.left)||0,top:parseFloat(tgt.style.top)||0})")
  const nodeEmpty = () => ev("var ns=[].slice.call(document.querySelectorAll('.canvas-node.text'));var tgt=ns.find(function(n){return !!n.querySelector('.canvas-ph')});if(!tgt)return '';var r=tgt.getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2})")

  // 실제 마우스로 드래그 → 위치 이동 + 손 떼도 제자리로 안 튕김
  {
    const a = JSON.parse((await nodeByMark()) || 'null')
    if (a) {
      await drag(a.cx, a.cy, a.cx - 230, a.cy - 160)
      const b = JSON.parse((await nodeByMark()) || 'null')
      const movedOk = !!b && (Math.abs(b.left - a.left) + Math.abs(b.top - a.top) > 60)
      await sleep(350)
      const c = JSON.parse((await nodeByMark()) || 'null')
      const noSnap = !!c && Math.abs(c.left - (b ? b.left : 0)) < 4 && Math.abs(c.top - (b ? b.top : 0)) < 4
      t(movedOk && noSnap, '[캔버스] 카드를 실제 마우스로 드래그하면 이동하고 손 떼도 제자리로 안 튕김')
    } else t(false, '[캔버스] 드래그 대상 카드(마커)를 찾지 못함')
  }
  // 포트(면의 점) 드래그로 두 노드를 화살표 연결
  {
    const eBefore = await ev("return document.querySelectorAll('.canvas-edge').length")
    await clickText('.canvas-toolbar .minibtn', '+ 카드'); await sleep(450)
    await pressKey('Escape', 'Escape', 27) // 새 카드 편집모드 종료
    await sleep(250)
    const a = JSON.parse((await nodeByMark()) || 'null')
    const b = JSON.parse((await nodeEmpty()) || 'null')
    if (a && b) {
      await drag(a.px, a.py, b.cx, b.cy, 12)
      const eAfter = await ev("return document.querySelectorAll('.canvas-edge').length")
      t(eAfter === eBefore + 1, '[캔버스] 카드 면의 점을 끌어 두 노드를 연결하면 화살표(엣지)가 생성됨')
    } else t(false, '[캔버스] 연결할 두 노드(마커/빈 카드)를 찾지 못함')
  }
  // 선택 후 Delete 로 삭제
  {
    const a = JSON.parse((await nodeByMark()) || 'null')
    if (a) {
      await clickAt(a.cx, a.cy) // mousedown 으로 선택
      await pressKey('Delete', 'Delete', 46)
      await sleep(300)
      t(!(await ev("return [].slice.call(document.querySelectorAll('.canvas-node-view, .canvas-node-text')).some(function(v){return ((v.textContent||'')+(v.value||'')).indexOf(window.__MK.card)>=0})")), '[캔버스] 카드 선택 후 Delete 키로 삭제됨')
    } else t(false, '[캔버스] 삭제할 카드(마커)를 찾지 못함')
  }
  // '전체 맞춤' 무에러
  {
    const e0 = await errCount()
    await clickText('.canvas-toolbar .minibtn', '전체 맞춤'); await sleep(350)
    t((await errCount()) === e0, "[캔버스] '전체 맞춤' 클릭 시 콘솔 에러 없음")
  }

  // ======================================================================
  // 2) 스토리 타임라인
  // ======================================================================
  await setView('timeline'); await sleep(500)
  let scenesExist = false
  {
    const cards = await ev("return document.querySelectorAll('button[draggable]').length")
    const emptyShown = await ev("return [].slice.call(document.querySelectorAll('div')).some(function(d){return (d.textContent||'').indexOf('표시할 장면이 없습니다')>=0})")
    scenesExist = cards > 0
    t((cards > 0) !== emptyShown, '[타임라인] 장면 카드 ↔ 빈 상태 안내 불변식(카드 ' + cards + '개, 빈안내=' + emptyShown + ')')
  }
  // 스윔레인 기준: POV
  await clickText('.minibtn', 'POV'); await sleep(350)
  t(await ev("var b=[].slice.call(document.querySelectorAll('.minibtn')).find(function(x){return (x.textContent||'').trim()==='POV'});var c=[].slice.call(document.querySelectorAll('.minibtn')).find(function(x){return (x.textContent||'').trim()==='장(Chapter)'});return !!b&&b.classList.contains('active')&&!(c&&c.classList.contains('active'))"), "[타임라인] 스윔레인 'POV' 선택 시 해당 버튼만 활성(active) 표시")
  // 스윔레인 기준: 플롯라인
  await clickText('.minibtn', '플롯라인'); await sleep(350)
  t(await ev("var b=[].slice.call(document.querySelectorAll('.minibtn')).find(function(x){return (x.textContent||'').trim()==='플롯라인'});return !!b&&b.classList.contains('active')"), "[타임라인] 스윔레인 '플롯라인' 선택 시 활성 표시 전환")
  // 스토리시간순 정렬 → 수동 드래그 비활성
  await ev("var cb=[].slice.call(document.querySelectorAll('input[type=checkbox]')).find(function(c){var l=c.closest('label');return l&&/스토리시간순/.test(l.textContent||'')});if(cb){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'checked').set;s.call(cb,true);cb.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(350)
  if (scenesExist) {
    const draggables = await ev("return document.querySelectorAll('button[draggable=\"true\"]').length")
    const hintOff = await ev("return [].slice.call(document.querySelectorAll('span')).some(function(s){return (s.textContent||'').indexOf('비활성화')>=0})")
    t(draggables === 0 && hintOff, '[타임라인] 스토리시간순 정렬을 켜면 카드 수동 드래그가 비활성화됨')
  } else NOTE('[타임라인] 장면이 없어 정렬-비활성 단언 생략')
  // 정렬 원복
  await ev("var cb=[].slice.call(document.querySelectorAll('input[type=checkbox]')).find(function(c){var l=c.closest('label');return l&&/스토리시간순/.test(l.textContent||'')});if(cb){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'checked').set;s.call(cb,false);cb.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(250)
  // 장면 카드 클릭 → 에디터 이동 + activeId 설정
  let tlActive = ''
  if (scenesExist) {
    await ev("var b=document.querySelector('button[draggable]');if(b)b.click();return 1"); await sleep(500)
    const toEditor = await ev("return !!document.querySelector('.paper')")
    tlActive = await ev("return (window.__scriv.state().activeId)||''")
    t(toEditor && !!tlActive, '[타임라인] 장면 카드 클릭 시 에디터로 이동하고 해당 문서가 선택(activeId)됨')
  } else NOTE('[타임라인] 장면이 없어 카드 클릭 단언 생략')

  // ======================================================================
  // 3) 참고문헌
  // ======================================================================
  await setView('references'); await sleep(450)
  // 빈상태 안내 ↔ 출처 수 불변식
  {
    const rows = await ev("return document.querySelectorAll('button').length&&[].slice.call(document.querySelectorAll('button')).filter(function(b){return (b.textContent||'').trim()==='인용 복사'}).length")
    const emptyShown = await ev("return [].slice.call(document.querySelectorAll('div')).some(function(d){return (d.textContent||'').indexOf('아직 등록된 출처가 없습니다')>=0})")
    t(emptyShown === ((rows || 0) === 0), '[참고문헌] 빈 상태 안내 ↔ 출처 수 불변식(출처 ' + (rows || 0) + '개, 안내=' + emptyShown + ')')
  }
  const refRows = () => ev("return [].slice.call(document.querySelectorAll('button')).filter(function(b){return (b.textContent||'').trim()==='인용 복사'}).length")
  const before = await refRows()
  // '+ 출처 추가' → 행 + 편집 폼
  await clickText('button', '출처 추가', true); await sleep(400)
  t((await refRows()) === before + 1, "[참고문헌] '+ 출처 추가' 로 출처 행이 1개 추가됨")
  t(await ev("return [].slice.call(document.querySelectorAll('strong, div')).some(function(d){return (d.textContent||'').trim()==='출처 편집'})||!!document.querySelector('input[placeholder=\"문헌 제목\"]')"), '[참고문헌] 출처 추가 후 우측 편집 폼이 표시됨')
  // 제목/저자/연도 입력 → 목록·미리보기 반영
  await ev("var el=[].slice.call(document.querySelectorAll('input.field')).find(function(x){return x.getAttribute('placeholder')==='문헌 제목'});if(el){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,window.__MK.ref);el.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(250)
  await ev("var el=[].slice.call(document.querySelectorAll('input.field')).find(function(x){return x.getAttribute('placeholder')==='2024'});if(el){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'2024');el.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(150)
  await ev("var el=[].slice.call(document.querySelectorAll('textarea.field')).find(function(x){return /홍길동/.test(x.getAttribute('placeholder')||'')});if(el){el.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(el,'Kim, Test');el.dispatchEvent(new Event('input',{bubbles:true}));el.blur();el.dispatchEvent(new Event('focusout',{bubbles:true}))}return 1"); await sleep(350)
  t(await ev("return [].slice.call(document.querySelectorAll('*')).some(function(d){return d.children.length===0&&(d.textContent||'').indexOf(window.__MK.ref)>=0})"), '[참고문헌] 입력한 제목이 목록/미리보기에 반영됨')
  // 인용 양식(스타일) 변경 → 미리보기 텍스트 달라짐
  {
    await ev("var sel=[].slice.call(document.querySelectorAll('select.field')).find(function(s){return [].slice.call(s.options).some(function(o){return o.value==='apa'})});if(sel){var st=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;st.call(sel,'apa');sel.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(300)
    const apa = await ev("return [].slice.call(document.querySelectorAll('p')).map(function(p){return p.textContent||''}).filter(function(tx){return tx.indexOf(window.__MK.ref)>=0}).join(' | ')")
    await ev("var sel=[].slice.call(document.querySelectorAll('select.field')).find(function(s){return [].slice.call(s.options).some(function(o){return o.value==='ieee'})});if(sel){var st=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;st.call(sel,'ieee');sel.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(300)
    const ieee = await ev("return [].slice.call(document.querySelectorAll('p')).map(function(p){return p.textContent||''}).filter(function(tx){return tx.indexOf(window.__MK.ref)>=0}).join(' | ')")
    t(!!apa && !!ieee && apa !== ieee, '[참고문헌] 인용 양식 변경(APA↔IEEE) 시 서지 미리보기가 달라짐')
  }
  // '본문에 인용' disabled 상태가 activeId 유무와 일치(UX 불변식)
  {
    const active = await ev("return (window.__scriv.state().activeId)||''")
    const dis = await ev("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()==='본문에 인용'});return b?(b.disabled?1:0):-1")
    t(dis !== -1 && ((dis === 1) === (active === '')), "[참고문헌] '본문에 인용' 버튼 disabled 상태가 활성 문서 유무와 일치")
  }
  // '현재 문서 끝에 추가' → 본문 RTF 에 영속(왕복)
  {
    let active = await ev("return (window.__scriv.state().activeId)||''")
    if (!active) active = await ev("var st=window.__scriv.state();if(st.activeId)return st.activeId;var ents=window.__scriv.entries().filter(function(e){return e.type==='text'&&e.title});for(var i=0;i<ents.length;i++){var ttl=ents[i].title;var row=[].slice.call(document.querySelectorAll('.binder-row')).find(function(r){return (r.getAttribute('aria-label')||'')===ttl});if(row){row.click();break}}return (window.__scriv.state().activeId)||''")
    if (active) {
      const bodyBefore = await ev("return (window.__scriv.bodyOf((window.__scriv.state().activeId)||'')||'')")
      await clickText('button', '끝에 추가', true) /* 라벨이 '끝에 추가(서지 문단)' 로 개선됨 */; await sleep(500)
      const bodyAfter = await ev("return (window.__scriv.bodyOf((window.__scriv.state().activeId)||'')||'')")
      t(bodyAfter.indexOf(window_MK_ref_local(R)) >= 0 && bodyAfter.length > bodyBefore.length, '[참고문헌] 서지를 현재 문서 끝에 추가하면 본문 RTF(bodyRtf)에 영속됨')
    } else NOTE('[참고문헌] 활성 문서가 없어 본문 삽입 단언 생략')
  }
  // 출처 삭제는 확인 또는 되돌리기(휴지통)가 있어야 한다 — 데이터 안전(임시 출처로 검증, 마커 출처는 보존)
  {
    const cnt0 = await refRows()
    await clickText('button', '출처 추가', true); await sleep(350) // 삭제용 임시 출처
    const cntAdd = await refRows()
    // 마커가 아닌(빈 제목) 행 선택
    await ev("var btns=[].slice.call(document.querySelectorAll('button')).filter(function(b){return (b.textContent||'').trim()==='인용 복사'});var tgt=btns.find(function(b){var row=b.parentElement&&b.parentElement.parentElement;return row&&(row.textContent||'').indexOf(window.__MK.ref)<0});if(tgt){var row=tgt.parentElement.parentElement;row.click()}return 1"); await sleep(300)
    const cBefore = await ev("return window.__confirms||0")
    await ev("var b=document.querySelector('.minibtn.danger');if(b)b.click();return 1"); await sleep(400)
    const cAfter = await ev("return window.__confirms||0")
    const undo = await ev("return [].slice.call(document.querySelectorAll('*')).some(function(d){return d.children.length===0&&/되돌리기|실행 취소|복구|휴지통/.test(d.textContent||'')})")
    const cntDel = await refRows()
    t(cntDel === cntAdd - 1, '[참고문헌] 출처 삭제가 실제로 동작(행 1개 감소)')
    t((cAfter > cBefore) || undo, '[참고문헌] 출처 삭제 시 확인(confirm) 또는 되돌리기/휴지통이 있어야 함 — 즉시 파괴적 삭제는 데이터 안전 위반')
  }

  // ======================================================================
  // 4) 논증 작업대
  // ======================================================================
  await setView('argument'); await sleep(450)
  // 기존 주장 전부 삭제(confirm 자동 true) → 빈 상태 안내
  for (let i = 0; i < 40; i++) {
    const has = await ev("return !!([].slice.call(document.querySelectorAll('button')).find(function(b){return (b.getAttribute('title')||'').indexOf('주장 삭제')===0}))")
    if (!has) break
    await ev("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('title')||'').indexOf('주장 삭제')===0});if(b)b.click();return 1"); await sleep(250)
  }
  t(await ev("return [].slice.call(document.querySelectorAll('div')).some(function(d){return (d.textContent||'').indexOf('아직 주장이 없습니다')>=0})"), '[논증] 주장을 모두 삭제하면 빈 상태 안내가 표시됨')
  // 주제문 입력 → 왕복 영속
  await ev("var el=[].slice.call(document.querySelectorAll('textarea.field')).find(function(x){return /입증하려는 핵심 주장/.test(x.getAttribute('placeholder')||'')});if(el){el.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(el,window.__MK.thesis+' 주제문');el.dispatchEvent(new Event('input',{bubbles:true}));el.blur();el.dispatchEvent(new Event('focusout',{bubbles:true}))}return 1"); await sleep(350)
  await setView('editor'); await sleep(300); await setView('argument'); await sleep(400)
  t(await ev("var el=[].slice.call(document.querySelectorAll('textarea.field')).find(function(x){return /입증하려는 핵심 주장/.test(x.getAttribute('placeholder')||'')});return !!el&&(el.value||'').indexOf(window.__MK.thesis)>=0"), '[논증] 주제문이 뷰 왕복 후에도 영속됨')
  // '+ 주장 추가'
  await clickText('button', '주장 추가', true); await sleep(400)
  t(await ev("return document.querySelectorAll('textarea[placeholder=\"주장을 입력하세요.\"]').length") >= 1, "[논증] '+ 주장 추가' 로 주장 카드가 추가됨")
  // 주장 텍스트 입력 → 왕복 영속
  await ev("var el=document.querySelector('textarea[placeholder=\"주장을 입력하세요.\"]');if(el){el.focus();var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(el,window.__MK.claim+' 첫 주장');el.dispatchEvent(new Event('input',{bubbles:true}));el.blur();el.dispatchEvent(new Event('focusout',{bubbles:true}))}return 1"); await sleep(350)
  await setView('editor'); await sleep(300); await setView('argument'); await sleep(400)
  t(await ev("var el=document.querySelector('textarea[placeholder=\"주장을 입력하세요.\"]');return !!el&&(el.value||'').indexOf(window.__MK.claim)>=0"), '[논증] 주장 텍스트가 뷰 왕복 후에도 영속됨')
  // 근거 추가 → '근거 없음' 경고 사라짐
  {
    const flagBefore = await ev("return [].slice.call(document.querySelectorAll('span')).some(function(s){return (s.textContent||'').indexOf('근거 없음')>=0})")
    await clickText('.minibtn', '근거'); await sleep(400)
    const evi = await ev("return document.querySelectorAll('textarea[placeholder=\"내용을 입력하세요.\"]').length")
    const flagAfter = await ev("return [].slice.call(document.querySelectorAll('span')).some(function(s){return (s.textContent||'').indexOf('근거 없음')>=0})")
    t(flagBefore && evi >= 1 && !flagAfter, "[논증] 근거를 추가하면 근거 행이 생기고 '근거 없음' 경고가 사라짐")
  }
  // 반박 추가 → '반론 미검토' 사라짐
  {
    const flagBefore = await ev("return [].slice.call(document.querySelectorAll('span')).some(function(s){return (s.textContent||'').indexOf('반론 미검토')>=0})")
    await clickText('.minibtn', '반박'); await sleep(400)
    const flagAfter = await ev("return [].slice.call(document.querySelectorAll('span')).some(function(s){return (s.textContent||'').indexOf('반론 미검토')>=0})")
    t(flagBefore && !flagAfter, "[논증] 반박을 추가하면 '반론 미검토' 표시가 사라짐")
  }
  // 근거 출처 select 에 참고문헌(마커 출처) 노출 + 선택 시 인라인 인용 표시
  {
    const hasOpt = await ev("var sels=[].slice.call(document.querySelectorAll('select')).filter(function(s){var p=s.previousElementSibling;return p&&/출처/.test(p.textContent||'')});var s=sels[0];return !!s&&[].slice.call(s.options).some(function(o){return (o.textContent||'').indexOf(window.__MK.ref)>=0})")
    if (hasOpt) {
      await ev("var sels=[].slice.call(document.querySelectorAll('select')).filter(function(s){var p=s.previousElementSibling;return p&&/출처/.test(p.textContent||'')});var s=sels[0];var opt=[].slice.call(s.options).find(function(o){return (o.textContent||'').indexOf(window.__MK.ref)>=0});if(s&&opt){var st=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;st.call(s,opt.value);s.dispatchEvent(new Event('change',{bubbles:true}))}return 1"); await sleep(400)
      t(await ev("return !!document.querySelector('[title=\"본문 인용(APA)\"]')"), '[논증] 근거에 참고문헌 출처를 연결하면 인라인 인용이 표시됨')
    } else t(false, '[논증] 근거의 출처 select 에 참고문헌(마커 출처)이 노출되지 않음')
  }
  // 주장 삭제는 확인(confirm) 가드가 있어야 한다(실수 삭제 방지)
  {
    const cBefore = await ev("return window.__confirms||0")
    await ev("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('title')||'').indexOf('주장 삭제')===0});if(b)b.click();return 1"); await sleep(350)
    const cAfter = await ev("return window.__confirms||0")
    t(cAfter > cBefore, '[논증] 주장 삭제 시 확인(confirm) 가드가 동작(하위 근거·반박 동반 삭제 방지)')
  }

  // ======================================================================
  // 전역: 콘솔 에러 0
  // ======================================================================
  const errs = await ev("return (window.__errs||[]).slice(0,8)")
  t((await errCount()) === 0, '[전역] 전체 점검 동안 콘솔 에러 0' + (errs && errs.length ? ' — ' + JSON.stringify(errs) : ''))

  console.log('=== 캔버스·타임라인·참고문헌·논증 심화 베타(영역 EF) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}

// 본문 RTF 안에서 찾을 마커(ASCII — RTF 에 그대로 남음). 페이지측 window.__MK.ref 와 동일 문자열.
function window_MK_ref_local(R) { return 'REFMK' + R }

main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
