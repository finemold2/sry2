// 양 스킨(classic/studio)에서 '보기' 메뉴에 도움말 항목(둘러보기/더 알아보기)이 있고 클릭 시 실제로 열리는지 검증.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// '보기' 메뉴 트리거 클릭(스킨 무관: .menu-wrap > button 중 텍스트 '보기')
const openViewMenu = "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='보기'});if(!b)return 'no-trigger';b.click();return 'ok'"
const itemLabels = "return [].slice.call(document.querySelectorAll('.dropdown button')).map(function(b){return (b.textContent||'').trim()})"
const clickItem = (re) => "var b=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return /" + re + "/.test(x.textContent||'')});if(!b)return 'no-item';b.click();return 'ok'"

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1200)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    await waitHook()
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

    // 1) 보기 메뉴 열림 + 항목 존재
    t(await ev(ws, sid, openViewMenu) === 'ok', '[' + skin + '] 보기 메뉴 트리거 클릭'); await sleep(250)
    const labels = await ev(ws, sid, itemLabels)
    const hasTour = labels.some(l => /도움말 둘러보기/.test(l))
    const hasManual = labels.some(l => /더 알아보기/.test(l))
    t(hasTour, '[' + skin + '] 보기 메뉴에 "도움말 둘러보기" 항목 있음')
    t(hasManual, '[' + skin + '] 보기 메뉴에 "더 알아보기" 항목 있음')

    // 2) 도움말 둘러보기 클릭 → 투어 버블 출현
    t(await ev(ws, sid, clickItem('도움말 둘러보기')) === 'ok', '[' + skin + '] 도움말 둘러보기 클릭'); await sleep(600)
    t(await ev(ws, sid, "return !!document.querySelector('.tour-bubble')"), '[' + skin + '] 가이드 투어 실제로 열림(.tour-bubble)')
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tour-skip,.tour-bubble button')).find(function(x){return /그만|건너|닫기|종료/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(300)

    // 3) 더 알아보기 클릭 → 매뉴얼 출현
    await ev(ws, sid, openViewMenu); await sleep(250)
    t(await ev(ws, sid, clickItem('더 알아보기')) === 'ok', '[' + skin + '] 더 알아보기 클릭'); await sleep(600)
    t(await ev(ws, sid, "return !!document.querySelector('.manual-bubble,.manual-choice,[class*=\"manual\"]')"), '[' + skin + '] 실습 매뉴얼 실제로 열림')
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /그만 보기|닫기|종료/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(300)
  }

  console.log('=== 도움말 메뉴(양 스킨) 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
