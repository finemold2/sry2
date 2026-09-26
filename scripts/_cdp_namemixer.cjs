// 이름 믹서 — 한국식은 '성+이름 2글자'(3글자)만, 문파/별호 같은 무협식 호·수식어 없음.
//  서구/판타지는 기존 수식 구조(공백 포함) 유지 확인.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

const TW = '.toolwin[data-tool-id="name-mixer"]'
// 이름 div = 인라인 fontWeight 800
const READ_NAMES = `return [].slice.call(document.querySelectorAll('${TW} div')).filter(function(d){return d.style&&d.style.fontWeight==='800'}).map(function(d){return (d.textContent||'').trim()}).filter(Boolean)`
const READ_TITLES = `return [].slice.call(document.querySelectorAll('${TW} [title]')).map(function(d){return d.getAttribute('title')||''})`
const REGEN = `var b=[].slice.call(document.querySelectorAll('${TW} button')).find(function(x){return /재생성/.test(x.textContent||'')});if(b)b.click();return 1`
function clickCulture(ko) { return `var b=[].slice.call(document.querySelectorAll('${TW} button')).find(function(x){return (x.textContent||'').indexOf('${ko}')>=0});if(b){b.click();return 'ok'}return 'no'` }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "window.__openTool('name-mixer');return 1"); await sleep(900)
  t(await ev(ws, sid, `return !!document.querySelector('${TW}')`), '이름 믹서 열림')

  // 한국식(기본) — 5회 재생성하며 모든 후보가 한글 3글자(성+이름2), 공백/수식 없음
  const krAll = []; let ok3 = true, hasSpace = false
  for (let r = 0; r < 5; r++) {
    await ev(ws, sid, REGEN); await sleep(350)
    const ns = await ev(ws, sid, READ_NAMES)
    for (const n of (ns || [])) { krAll.push(n); if (!/^[가-힣]{3}$/.test(n)) ok3 = false; if (/\s/.test(n)) hasSpace = true }
  }
  t(krAll.length >= 10, `한국식 후보 수집(${krAll.length}개)`)
  t(ok3, `한국식 전부 한글 3글자(성+이름2) — 예: ${krAll.slice(0, 12).join(', ')}`)
  t(!hasSpace, '한국식에 공백/호·수식어 없음')
  const titles = await ev(ws, sid, READ_TITLES)
  t(!titles.some(x => /문파|별호/.test(x)), `문파/별호 칩 사라짐 (현재 칩: ${[...new Set(titles.filter(x => /성|이름|문파|별호/.test(x)))].join('/')})`)

  // 서구식 — 수식 구조(공백) 유지
  await ev(ws, sid, clickCulture('서구')); await sleep(500); await ev(ws, sid, REGEN); await sleep(400)
  const west = await ev(ws, sid, READ_NAMES) || []
  t(west.some(n => /\s/.test(n)), `서구식은 기존 구조(공백) 유지 — 예: ${west.slice(0, 4).join(' | ')}`)

  // 판타지 — 유지
  await ev(ws, sid, clickCulture('판타지')); await sleep(500); await ev(ws, sid, REGEN); await sleep(400)
  const fan = await ev(ws, sid, READ_NAMES) || []
  t(fan.some(n => /\s/.test(n)), `판타지는 기존 구조 유지 — 예: ${fan.slice(0, 4).join(' | ')}`)

  console.log('=== 이름 믹서 한국식 3글자 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
