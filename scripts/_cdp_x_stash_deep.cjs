// 수집함 심화 베타(실사용자 조작 재현) — '코드리뷰'가 아니라 실제로 끌어다 담고/열고/지우고/드래그하며
// "상식적으로 당연한데 안 되는 것"을 잡는다. 위반은 [ISSUE] 로 출력하고 실패로 카운트한다.
// 담당 영역: 메모/URL/이미지/문서 담기 · 메모 원고삽입(⤵) · URL 클릭=새 탭 · 항목 자유드래그(안 튕김)·영속 ·
//            목록/캔버스 토글 · 뷰어(이미지/Esc/닫기) · 제거(원본 보존) · 빈 상태 안내 · 아이콘 드래그 이동 · 가림/포커스/z순서.
// 작성만(실행 금지). node --check 통과. 실행: 헤드리스 Chrome(CDP 9222) + vite preview(4178) 띄운 뒤 `node scripts/_cdp_x_stash_deep.cjs`.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const J = (s) => { try { return JSON.parse(s) } catch { return null } }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  // about:blank+navigate 금지 — 타깃 직접 생성 + flatten attach.
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // ⚠ 포인터 드래그(Input.dispatchMouseEvent)를 쓰므로 Runtime.enable 호출하지 않는다(검증된 함정).
  const ok = [], bad = []
  const t = (c, m) => { if (c) { ok.push(m) } else { bad.push(m); console.log('[ISSUE] ' + m) } }
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: type === 'mouseMoved' ? 1 : 1, clickCount: type === 'mouseMoved' ? 0 : 1 }, sid)
  const drag = async (x0, y0, x1, y1) => { await M('mouseMoved', x0, y0); await M('mousePressed', x0, y0); await sleep(60); for (let s = 1; s <= 8; s++) { await M('mouseMoved', x0 + (x1 - x0) * s / 8, y0 + (y1 - y0) * s / 8); await sleep(26) } await M('mouseReleased', x1, y1); await sleep(400) }
  const clickAt = async (x, y) => { await M('mouseMoved', x, y); await M('mousePressed', x, y); await sleep(40); await M('mouseReleased', x, y); await sleep(200) }

  // 로드 대기(훅 폴링) — typeof window.__setView==='function'.
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) break } catch { /* loading */ } }
  // 환영/투어 닫기.
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "window.__setView&&window.__setView('editor');return 1"); await sleep(300)

  const MARK = 'STASHX' + (Math.floor(Date.now() / 1000) % 100000)
  const URL1 = 'https://example.com/stashtest'

  // 바인더의 실제 문서(원본 보존 검증용) 한 개 확보.
  const pidRaw = await ev(ws, sid, "return window.__scriv.state().id")
  const docInfo = J(await ev(ws, sid, "var es=window.__scriv.entries();var tx=es.find(function(e){return e.type==='text'})||es[0];return tx?JSON.stringify({id:tx.id,title:tx.title}):'null'"))
  t(!!(docInfo && docInfo.id), '바인더에 연결할 원본 문서가 존재(' + (docInfo ? docInfo.title : '없음') + ')')
  const DOCID = docInfo ? docInfo.id : ''

  // 결정적 빈 상태를 위해 이 프로젝트 수집함 초기화 후 리로드(원본 데이터는 건드리지 않음).
  await ev(ws, sid, "var pid=window.__scriv.state().id;try{localStorage.removeItem('sry:stash:items:'+pid)}catch(e){};window.dispatchEvent(new CustomEvent('sry:stash-reload'));return 1"); await sleep(350)

  // ───────── 1) 아이콘 드래그 이동(자유 이동 + 영속, 손 떼도 안 튕김) — 닫힌 상태에서 ─────────
  t(await ev(ws, sid, "return !!document.querySelector('.stash-icon')"), '닫힘 상태: 떠다니는 수집함 아이콘(.stash-icon) 표시')
  const ic0 = J(await ev(ws, sid, "var i=document.querySelector('.stash-icon');var r=i.getBoundingClientRect();var w=document.querySelector('.stash-icon-wrap');return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2,l:Math.round(parseFloat(w.style.left)||0),t:Math.round(parseFloat(w.style.top)||0)})"))
  if (ic0) { await drag(ic0.cx, ic0.cy, ic0.cx - 200, ic0.cy - 160) }
  await sleep(250)
  const ic1 = J(await ev(ws, sid, "var w=document.querySelector('.stash-icon-wrap');var p=localStorage.getItem('sry:stash:pos');return JSON.stringify({l:Math.round(parseFloat(w.style.left)||0),t:Math.round(parseFloat(w.style.top)||0),pos:p})"))
  const posSaved = ic1 && J(ic1.pos)
  const movedIcon = !!(ic0 && ic1 && Math.abs((ic1.l) - (ic0.l - 200)) < 40 && Math.abs((ic1.t) - (ic0.t - 160)) < 40)
  t(movedIcon, '아이콘을 자유 이동(손 떼도 제자리 안 튕김): (' + (ic0 ? ic0.l + ',' + ic0.t : '?') + ') → (' + (ic1 ? ic1.l + ',' + ic1.t : '?') + ')')
  t(!!(posSaved && Math.abs(posSaved.x - (ic1 ? ic1.l : -999)) < 6), '이동한 아이콘 위치가 localStorage(sry:stash:pos)에 영속')

  // ───────── 2) 아이콘 클릭 → 수집함 창 열림 ─────────
  await sleep(250) // suppressClick(50ms) 해제 후 클릭(드래그 직후 클릭 무시 방지)
  await ev(ws, sid, "var i=document.querySelector('.stash-icon');if(i)i.click();return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-win')"), '아이콘 클릭 → 수집함 창(.stash-win) 열림')

  // 캔버스 보기 보장(전역 선호가 list 로 남아있을 수 있음).
  await ev(ws, sid, "if(!document.querySelector('.stash-canvas')){var b=[].slice.call(document.querySelectorAll('.stash-win .minibtn')).find(function(x){return (x.getAttribute('aria-label')||'')==='캔버스 보기'});if(b)b.click()}return 1"); await sleep(250)

  // ───────── 3) 빈 상태 안내(empty state) ─────────
  t(await ev(ws, sid, "var e=document.querySelector('.stash-empty');return !!e&&/끌어다 놓으세요/.test(e.textContent||'')") && await ev(ws, sid, "return document.querySelectorAll('.stash-canvas .stash-item').length===0"), '빈 수집함에 안내 문구(.stash-empty)가 보임')

  // 드롭/스텁 헬퍼 주입(실제 DataTransfer + DragEvent 로 진짜 드롭 경로를 탄다).
  await ev(ws, sid, "window.__dropText=function(sel,uri){var c=document.querySelector(sel);if(!c)return false;var r=c.getBoundingClientRect();var dt=new DataTransfer();dt.setData('text/uri-list',uri);dt.setData('text/plain',uri);c.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.left+60,clientY:r.top+60}));return true};window.__dropScrivId=function(sel,id){var c=document.querySelector(sel);if(!c)return false;var r=c.getBoundingClientRect();var dt=new DataTransfer();dt.setData('text/scriv-id',id);c.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.left+130,clientY:r.top+60}));return true};window.__dropImage=function(sel){var c=document.querySelector(sel);if(!c)return false;var r=c.getBoundingClientRect();var dt=new DataTransfer();var f=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13])],'pic.png',{type:'image/png'});dt.items.add(f);c.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.left+220,clientY:r.top+60}));return true};return 1"); await sleep(150)

  // ───────── 4) 메모 담기 — 메모 버튼 → 즉석 편집창 + 첫 입력 포커스(autoFocus) ─────────
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.title||'').indexOf('메모 추가')===0});if(b)b.click();return 1"); await sleep(350)
  t(await ev(ws, sid, "return !!document.activeElement&&(document.activeElement.className||'').indexOf('stash-memo-edit')>=0"), '메모 추가 시 입력창(textarea)이 즉시 포커스됨(autoFocus)')
  await ev(ws, sid, "var ta=document.querySelector('.stash-memo-edit');if(ta){var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(ta,'" + MARK + " 메모에서 원고로');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.blur()}return 1"); await sleep(350)
  t(await ev(ws, sid, "return !document.querySelector('.stash-memo-edit')&&[].slice.call(document.querySelectorAll('.stash-item-label')).some(function(e){return /" + MARK + "/.test(e.textContent||'')})"), '메모 텍스트가 항목에 반영되고 편집 종료(blur 커밋)')

  // ───────── 5) 이미지 담기(로컬 파일 드롭) ─────────
  await ev(ws, sid, "return window.__dropImage('.stash-canvas')"); await sleep(750)
  t(await ev(ws, sid, "var it=document.querySelector('.stash-item.k-image');return !!it&&!!it.querySelector('.stash-local-tag')"), '이미지 파일 드롭 → 이미지 항목 담김 + ‘로컬’ 태그(이 기기 저장 안내)')

  // ───────── 6) 문서 담기(바인더 링크 드롭) ─────────
  if (DOCID) { await ev(ws, sid, "return window.__dropScrivId('.stash-canvas','" + DOCID + "')") } await sleep(400)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-item.k-doc')"), '바인더 문서 드롭 → 문서(링크) 항목 담김')

  // ───────── 7) URL 담기(붙여넣기 대신 진짜 드롭 경로) ─────────
  await ev(ws, sid, "return window.__dropText('.stash-canvas','" + URL1 + "')"); await sleep(350)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-item.k-url')"), 'URL 드롭 → 웹 링크 항목 담김')
  t(await ev(ws, sid, "return document.querySelectorAll('.stash-canvas .stash-item').length>=4"), '메모·이미지·문서·URL 4종이 모두 담김')

  // ───────── 8) 신규 항목 겹침 방지(자동 정렬=격자) ─────────
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win button')).find(function(x){return (x.getAttribute('aria-label')||'')==='자동 정렬'});if(b)b.click();return 1"); await sleep(350)
  const poss = J(await ev(ws, sid, "var its=[].slice.call(document.querySelectorAll('.stash-canvas .stash-item'));return JSON.stringify(its.map(function(e){return Math.round(parseFloat(e.style.left)||0)+','+Math.round(parseFloat(e.style.top)||0)}))")) || []
  t(poss.length >= 4 && new Set(poss).size === poss.length, '자동 정렬 시 항목들이 서로 겹치지 않음(고유 좌표 ' + new Set(poss).size + '/' + poss.length + ')')

  // ───────── 9) 메모 → 원고 삽입(⤵) — 담기만 하던 수집함을 실제 글쓰기로 환류 ─────────
  const paperBefore = await ev(ws, sid, "var p=document.querySelector('.paper');return p?(p.textContent||''):''")
  await ev(ws, sid, "var b=document.querySelector('.stash-item.k-memo .stash-item-insert');if(b)b.click();return 1"); await sleep(650)
  const paperAfter = await ev(ws, sid, "var p=document.querySelector('.paper');return p?(p.textContent||''):''")
  t(paperAfter.indexOf(MARK) >= 0 && paperBefore.indexOf(MARK) < 0, '메모 ⤵ 클릭 → 메모 텍스트가 현재 원고(.paper)에 삽입됨')

  // ───────── 10) 수집함 창이 도구창보다 위(z-순서) + 중앙 최상위 ─────────
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(700)
  const hb = J(await ev(ws, sid, "var h=document.querySelector('.stash-head');var r=h.getBoundingClientRect();return JSON.stringify({x:r.left+24,y:r.top+r.height/2})"))
  if (hb) await clickAt(hb.x, hb.y) // 헤더 클릭 → raiseWin(앞으로)
  const zc = J(await ev(ws, sid, "var tz=Math.max.apply(null,[].slice.call(document.querySelectorAll('.toolwin')).map(function(w){return parseInt(getComputedStyle(w).zIndex||'0',10)||0}).concat([0]));var sw=document.querySelector('.stash-win');var sz=sw?parseInt(getComputedStyle(sw).zIndex||'0',10)||0:0;var r=sw.getBoundingClientRect();var el=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));return JSON.stringify({tz:tz,sz:sz,onTop:!!(el&&el.closest('.stash-win')&&!el.closest('.toolwin'))})"))
  t(!!(zc && zc.sz > zc.tz && zc.onTop), '도구창이 떠 있어도 수집함 창이 위에 뜸(stashZ ' + (zc ? zc.sz : '?') + ' > toolZ ' + (zc ? zc.tz : '?') + ', 중앙 최상위=' + (zc ? zc.onTop : '?') + ')')

  // ───────── 11) 제거(×) 버튼이 다른 요소에 가려지지 않음(클릭 대상 노출) ─────────
  const hit = await ev(ws, sid, "var it=document.querySelector('.stash-item.k-doc');if(!it)return false;var x=it.querySelector('.stash-item-x');if(!x)return false;var r=x.getBoundingClientRect();var el=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));return !!(el&&el.closest('.stash-item-x'))")
  t(hit, '문서 항목의 제거(×) 버튼이 가려지지 않고 최상단에서 클릭 가능')

  // ───────── 12) 항목 자유 드래그(이동 + 영속 + 손 떼도 안 튕김) ─────────
  const di0 = J(await ev(ws, sid, "var its=document.querySelectorAll('.stash-canvas .stash-item');var e=its[its.length-1];var r=e.getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2,l:Math.round(parseFloat(e.style.left)||0),t:Math.round(parseFloat(e.style.top)||0)})"))
  if (di0) await drag(di0.cx, di0.cy, di0.cx + 170, di0.cy + 120)
  const di1 = J(await ev(ws, sid, "var its=document.querySelectorAll('.stash-canvas .stash-item');var e=its[its.length-1];return JSON.stringify({l:Math.round(parseFloat(e.style.left)||0),t:Math.round(parseFloat(e.style.top)||0)})"))
  const dragOk = !!(di0 && di1 && Math.abs(di1.l - (di0.l + 170)) < 28 && Math.abs(di1.t - (di0.t + 120)) < 28)
  t(dragOk, '항목을 캔버스에서 자유 드래그 → 이동 위치 유지(손 떼도 제자리 튕김 없음): (' + (di0 ? di0.l + ',' + di0.t : '?') + ')→(' + (di1 ? di1.l + ',' + di1.t : '?') + ')')
  const pmax = await ev(ws, sid, "var pid=window.__scriv.state().id;var arr=JSON.parse(localStorage.getItem('sry:stash:items:'+pid)||'[]');return Math.max.apply(null,arr.map(function(i){return Math.round(i.x||0)}).concat([0]))")
  t(di0 && pmax >= (di0.l + 170 - 28), '드래그한 위치가 localStorage(프로젝트별 수집함)에 영속(최대 x=' + pmax + ')')

  // ───────── 13) 목록/캔버스 토글(양방향) ─────────
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win .minibtn')).find(function(x){return (x.getAttribute('aria-label')||'')==='목록 보기'});if(b)b.click();return 1"); await sleep(300)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-list')&&!document.querySelector('.stash-canvas')"), '목록 보기로 토글 → .stash-list 표시(캔버스 숨김)')

  // ───────── 14) URL 항목 클릭 = 새 탭으로 열기(앱 안 iframe 아님) ─────────
  await ev(ws, sid, "window.__opened=[];window.open=function(u,tg){window.__opened.push({u:u,t:tg});return {closed:false,focus:function(){}}};return 1"); await sleep(80)
  await ev(ws, sid, "var r=document.querySelector('.stash-row.k-url');if(r)r.click();return 1"); await sleep(300)
  const opened = J(await ev(ws, sid, "var a=window.__opened||[];var l=a[a.length-1];return l?JSON.stringify(l):'null'"))
  t(!!(opened && opened.u && opened.u.indexOf('example.com') >= 0 && opened.t === '_blank'), 'URL 항목 클릭 → 새 탭(window.open, _blank)으로 열림(앱 내 임베드 아님)')

  // ───────── 15) 뷰어 — 이미지 항목 열기/닫기 ─────────
  await ev(ws, sid, "var r=document.querySelector('.stash-row.k-image');if(r)r.click();return 1"); await sleep(450)
  t(await ev(ws, sid, "return !!document.querySelector('.stash-viewer')&&!!document.querySelector('.stash-viewer img')"), '이미지 항목 클릭 → 뷰어(.stash-viewer)에서 이미지 미리보기')
  // 닫기 버튼으로 닫힘
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-viewer .minibtn')).find(function(x){return /닫기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(300)
  t(!(await ev(ws, sid, "return !!document.querySelector('.stash-viewer')")), '뷰어 ‘닫기’ 버튼으로 닫힘')
  // Esc 로도 닫혀야 한다(모달성 오버레이의 당연한 기대) — 위반 시 [ISSUE]
  await ev(ws, sid, "var r=document.querySelector('.stash-row.k-image');if(r)r.click();return 1"); await sleep(400)
  const viewerUp = await ev(ws, sid, "return !!document.querySelector('.stash-viewer')")
  await ev(ws, sid, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,which:27,bubbles:true}));return 1"); await sleep(300)
  t(viewerUp && !(await ev(ws, sid, "return !!document.querySelector('.stash-viewer')")), '뷰어가 Esc 키로도 닫힘(모달 오버레이 기본 기대)')
  // 잔여 뷰어 정리(백드롭 클릭).
  await ev(ws, sid, "var bd=document.querySelector('.stash-viewer-backdrop');if(bd)bd.click();return 1"); await sleep(200)

  // ───────── 16) 제거(원본 보존) — 수집함에서 빼도 바인더 원본 문서는 남는다 ─────────
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.stash-win .minibtn')).find(function(x){return (x.getAttribute('aria-label')||'')==='캔버스 보기'});if(b)b.click();return 1"); await sleep(300)
  const beforeRm = await ev(ws, sid, "return document.querySelectorAll('.stash-item').length")
  await ev(ws, sid, "var it=document.querySelector('.stash-item.k-doc');if(it){var x=it.querySelector('.stash-item-x');if(x)x.click()}return 1"); await sleep(350)
  const afterRm = await ev(ws, sid, "return document.querySelectorAll('.stash-item').length")
  t(afterRm === beforeRm - 1 && !(await ev(ws, sid, "return !!document.querySelector('.stash-item.k-doc')")), '문서 항목 제거(×) → 수집함에서 사라짐(' + beforeRm + '→' + afterRm + ')')
  const srcAlive = DOCID ? await ev(ws, sid, "return window.__scriv.entries().some(function(e){return e.id==='" + DOCID + "'})") : false
  t(srcAlive, '제거해도 연결된 바인더 원본 문서는 그대로 보존됨(원고 안전)')

  console.log('=== 수집함 심화 베타(실사용자 조작) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
