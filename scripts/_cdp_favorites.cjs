// 즐겨찾기: ① 항목 행이 draggable 이 아니고 드래그는 핸들로만(클릭이 드래그에 안 먹힘) ② 즐겨찾기로 연 도구창이
//  메뉴로 연 것과 같은 크기(최소화→다시 열기 시 0×0 작은 창으로 줄지 않음).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const TW = '.toolwin[data-tool-id="name-mixer"]'

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // 인스펙터 표시
  if (!(await ev(ws, sid, "return !!document.querySelector('.inspector')"))) {
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test(x.getAttribute('aria-label')||'')});if(b)b.click();return 1"); await sleep(400)
  }
  t(await ev(ws, sid, "return !!document.querySelector('.inspector')"), '인스펙터 표시됨')

  // 도구 열기(메뉴/허브 경로와 동일) → 기준 크기
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(700)
  const box1 = JSON.parse(await ev(ws, sid, "var w=document.querySelector('" + TW + "');return w?JSON.stringify({w:w.offsetWidth,h:w.offsetHeight}):'null'"))
  t(box1 && box1.w > 300, '메뉴 경로로 연 도구창 정상 크기(w=' + (box1 && box1.w) + ')')

  // ★ 즐겨찾기 추가
  await ev(ws, sid, "var b=document.querySelector('" + TW + " [aria-label=\"즐겨찾기\"]');if(b)b.click();return 1"); await sleep(300)
  t(await ev(ws, sid, "return (window.__scriv?true:true)&&!!document.querySelector('" + TW + " [aria-label=\"즐겨찾기\"]')"), '★ 클릭(즐겨찾기 추가)')

  // 최소화(즐겨찾기 패널 드롭과 같은 효과) → ResizeObserver 디바운스 경과
  await ev(ws, sid, "var b=document.querySelector('" + TW + " [aria-label=\"최소화\"]');if(b)b.click();return 1"); await sleep(700)
  t(await ev(ws, sid, "var w=document.querySelector('" + TW + "');return !!w&&getComputedStyle(w).display==='none'", ), '최소화됨(숨김)')

  // 즐겨찾기 탭으로 이동
  await ev(ws, sid, "var t=document.querySelector('#insp-tab-favorites');if(t)t.click();return 1"); await sleep(400)
  t(await ev(ws, sid, "return !!document.querySelector('.fav-drop-zone')"), '즐겨찾기 탭 열림')

  // 구조: 행은 draggable 아님, 드래그는 핸들로만 (클릭이 드래그에 안 먹히도록)
  const rowDraggable = await ev(ws, sid, "var z=document.querySelector('.fav-drop-zone');var row=z&&z.querySelector('[style*=\"border\"]');return !!(row&&row.getAttribute('draggable')==='true')")
  const handleDraggable = await ev(ws, sid, "return !!document.querySelector('.fav-drop-zone [aria-label=\"순서 변경 손잡이\"][draggable=\"true\"]')")
  t(!rowDraggable && handleDraggable, '즐겨찾기 행은 draggable 아님 + 드래그 핸들만 draggable(클릭 신뢰성)')

  // 즐겨찾기 항목 '열기' 버튼 1회 클릭 → 도구창 다시 뜸
  const clicked = await ev(ws, sid, "var b=document.querySelector('.fav-drop-zone button[title$=\" 열기\"]');if(b){b.click();return true}return false")
  t(clicked, '즐겨찾기 항목 열기 버튼 존재/클릭')
  await sleep(700)
  const shown = await ev(ws, sid, "var w=document.querySelector('" + TW + "');return !!w&&getComputedStyle(w).display!=='none'&&w.offsetWidth>0")
  t(shown, '한 번 클릭으로 도구창이 다시 열림')
  const box2 = JSON.parse(await ev(ws, sid, "var w=document.querySelector('" + TW + "');return w?JSON.stringify({w:w.offsetWidth,h:w.offsetHeight}):'null'"))
  t(box2 && box2.w > 300 && Math.abs(box2.w - box1.w) <= 60 && Math.abs(box2.h - box1.h) <= 60,
    '즐겨찾기로 연 창이 메뉴와 같은 크기(다시:' + (box2 && box2.w) + 'x' + (box2 && box2.h) + ' vs 기준:' + box1.w + 'x' + box1.h + ')')

  console.log('=== 즐겨찾기 클릭/크기 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
