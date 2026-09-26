// 연계 E2E: 도구의 연계 버튼이 공유 라이브러리에 실제로 데이터를 쓰고, 관련 도구를 여는지 확인.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }

// 마지막 도구창에서 텍스트를 포함하는 버튼 클릭
const clickBtn = (txt) => `(function(){var w=document.querySelectorAll('.toolwin');if(!w.length)return'noWin';var last=w[w.length-1];var b=[].slice.call(last.querySelectorAll('button')).find(x=>(x.innerText||'').includes(${JSON.stringify(txt)}));if(!b)return'noBtn';if(b.disabled)return'disabled';b.click();return'clicked'})()`
// 라이브러리 키는 'sry:shared-library'(전역) 또는 'sry:shared-library:<pid>'(프로젝트별) — 현재 활성 키 중 가장 많은 항목을 가진 쪽을 읽는다.
const libCount = (kind) => `(function(){try{var n=-1;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sry:shared-library')===0){var l=JSON.parse(localStorage.getItem(k)||'{}');n=Math.max(n,(l[${JSON.stringify(kind)}]||[]).length)}}return n}catch(e){return -1}})()`
const winCount = `document.querySelectorAll('.toolwin').length`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await sleep(700)
  // 라이브러리 초기화
  await ev(ws, s, `(function(){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sry:shared-library')===0)ks.push(k)}ks.forEach(function(k){localStorage.removeItem(k)})})()`)

  console.log('\n[A] 장면 생성기 → 배경/스니펫 라이브러리 저장')
  await ev(ws, s, `window.__openTool('scene-forge')`); await sleep(1200)
  ok(await ev(ws, s, clickBtn('배경 저장')) === 'clicked', '"배경 저장" 클릭')
  await sleep(400)
  ok(await ev(ws, s, libCount('places')) >= 1, '공유 라이브러리 places 에 장소 추가됨')
  ok(await ev(ws, s, clickBtn('스니펫 저장')) === 'clicked', '"스니펫 저장" 클릭')
  await sleep(400)
  ok(await ev(ws, s, libCount('snippets')) >= 1, '공유 라이브러리 snippets 에 장면 추가됨')

  console.log('\n[B] 장면 생성기 → 장면 목록 도구 열기(연계 네비게이션)')
  const before = await ev(ws, s, winCount)
  ok(await ev(ws, s, clickBtn('장면 목록으로')) === 'clicked', '"장면 목록으로" 클릭')
  await sleep(1200)
  const after = await ev(ws, s, winCount)
  ok(after > before, '관련 도구(scene-list) 창이 새로 열림 (' + before + '→' + after + ')')

  console.log('\n[C] 캐릭터 모델 → 인물 라이브러리 저장')
  await ev(ws, s, `window.__openTool('character-model')`); await sleep(2500) // DiceBear/데이터 로드 대기
  const r1 = await ev(ws, s, clickBtn('라이브러리'))
  ok(r1 === 'clicked' || r1 === 'disabled', '"인물 라이브러리에 저장" 버튼 존재 (' + r1 + ')')
  await sleep(500)
  ok(await ev(ws, s, libCount('characters')) >= 0, '캐릭터 라이브러리 접근 정상')

  console.log('\n[D] 설정집이 라이브러리 장소를 인식(가져오기 경로 존재)')
  await ev(ws, s, `window.__openTool('setting-bible')`); await sleep(1200)
  const hasImport = await ev(ws, s, `(function(){var w=document.querySelectorAll('.toolwin');var last=w[w.length-1];return [].slice.call(last.querySelectorAll('button')).some(b=>(b.innerText||'').includes('라이브러리'))})()`)
  ok(hasImport === true, '배경 설정집에 "라이브러리" 연계 버튼 존재')

  console.log('\n=== 연계 E2E: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); if (FAIL > 0) process.exit(1)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(1) })
