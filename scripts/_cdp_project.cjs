// 프로젝트 연동 E2E: 도구의 "프로젝트에 추가" 버튼이 실제 바인더 항목을 만드는지 확인.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }
const clickBtn = (txt) => `(function(){var w=document.querySelectorAll('.toolwin');if(!w.length)return'noWin';var last=w[w.length-1];var b=[].slice.call(last.querySelectorAll('button')).find(x=>(x.innerText||'').includes(${JSON.stringify(txt)}));if(!b)return'noBtn';if(b.disabled)return'disabled';b.click();return'clicked'})()`

async function run(ws, s, toolId, btnText, label) {
  const before = (await ev(ws, s, `window.__scriv.entries()`)).length
  await ev(ws, s, `window.__openTool(${JSON.stringify(toolId)})`)
  await sleep(2200)
  const r = await ev(ws, s, clickBtn(btnText))
  await sleep(500)
  const entries = await ev(ws, s, `window.__scriv.entries()`)
  ok(r === 'clicked', label + ': 버튼 클릭(' + r + ')')
  ok(entries.length > before, label + ': 바인더 항목 증가(' + before + '→' + entries.length + ')')
  await ev(ws, s, `window.__closeTool(${JSON.stringify(toolId)})`); await sleep(200)
  return entries
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__scriv')) === 'object') break } catch {} }
  // 깨끗한 프로젝트
  await ev(ws, s, `new Promise(r=>{var q=indexedDB.deleteDatabase('scrivener-web');q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`)
  await ev(ws, s, `localStorage.removeItem('scrivener-web:lastProjectId')`)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__scriv')) === 'object') break } catch {} }
  await sleep(600)

  console.log('\n[A] 캐릭터 생성기 → 프로젝트 인물 카드')
  const e1 = await run(ws, s, 'character-forge', '프로젝트', '캐릭터 생성기')
  const hasChar = e1.some((x) => x.type === 'character')
  const hasFolder = e1.some((x) => x.type === 'folder' && x.title === '인물')
  ok(hasChar, '인물(character) 카드가 바인더에 생성됨')
  ok(hasFolder, '‘인물’ 폴더가 자동 생성됨')

  console.log('\n[B] 장면 생성기 → 프로젝트 장면 문서')
  await run(ws, s, 'scene-forge', '프로젝트', '장면 생성기')

  console.log('\n[C] 배경 설정집 → 프로젝트 장소 카드(빈 상태면 항목 없을 수 있음)')
  try { await run(ws, s, 'setting-bible', '프로젝트', '배경 설정집') } catch (e) { console.log('  (info) ' + e.message) }

  console.log('\n=== 프로젝트 연동 E2E: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); if (FAIL > 0) process.exit(1)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(1) })
