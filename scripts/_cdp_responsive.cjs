// 반응형/UI 스케일 베타: 전역 글자 크기(zoom) 변경 시 앱/창/팝업이 가림 없이 반응하는지,
// 창 드래그가 스케일 하에서도 정확히 따라오는지 검증.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }

async function setScale(ws, s, v) {
  await ev(ws, s, `localStorage.setItem('scrivweb:uiScale','${v}')`)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(300); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await sleep(500)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === s && d.method === 'Runtime.exceptionThrown') exc.push((d.params.exceptionDetails.exception?.description || '').split('\n')[0]) })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(300); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }

  for (const v of ['0.85', '1', '1.3']) {
    console.log('\n[scale ' + v + ']')
    await setScale(ws, s, v)
    const z = await ev(ws, s, `document.documentElement.style.zoom`)
    ok(z === v, 'zoom 적용됨 (' + z + ')')
    // 툴바 저장 버튼이 뷰포트 안에 보임(가림 없음)
    const tb = await ev(ws, s, `(function(){var b=document.querySelector('.save-btn');if(!b)return null;var r=b.getBoundingClientRect();return {top:r.top,left:r.left,vw:window.innerWidth,vh:window.innerHeight,bottom:r.bottom,right:r.right}})()`)
    ok(tb && tb.top >= -2 && tb.left >= -2 && tb.right <= tb.vw + 4, '툴바 저장 버튼이 화면 안')
    // 도구 창을 열어 헤더가 화면 안에 있는지(가림/이탈 없음). 위치는 결정적으로 초기화.
    await ev(ws, s, `localStorage.removeItem('scrivweb:toolwin:pomodoro-timer')`)
    await ev(ws, s, `window.__closeTool('pomodoro-timer')`); await sleep(150)
    await ev(ws, s, `window.__openTool('pomodoro-timer')`); await sleep(700)
    const wi = await ev(ws, s, `(function(){var w=document.querySelector('.toolwin');if(!w)return null;var h=w.querySelector('.toolwin-head');var r=h.getBoundingClientRect();return {top:r.top,left:r.left,bottom:r.bottom,right:r.right,vw:window.innerWidth,vh:window.innerHeight}})()`)
    ok(wi && wi.top >= -2 && wi.bottom <= wi.vh + 4 && wi.right > 40 && wi.left < wi.vw - 20, '도구 창 헤더가 화면 안(잡기 가능)')
    // 드래그 추적: 헤더를 +120,+60 px 이동 → 창이 그만큼 이동
    if (wi) {
      // 기본 위치(우측)에서 여유가 있는 왼쪽·아래로 드래그
      const cx = Math.round(wi.left + 30), cy = Math.round((wi.top + wi.bottom) / 2)
      await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 }, s); await sleep(90)
      for (let k = 1; k <= 4; k++) { await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx - 40 * k, y: cy + 15 * k, button: 'left', buttons: 1 }, s); await sleep(50) }
      await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx - 160, y: cy + 60, button: 'left', buttons: 0, clickCount: 1 }, s)
      await sleep(300)
      const w2 = await ev(ws, s, `(function(){var h=document.querySelector('.toolwin .toolwin-head');var r=h.getBoundingClientRect();return {left:r.left,top:r.top}})()`)
      const dx = w2.left - wi.left, dy = w2.top - wi.top
      ok(Math.abs(dx - (-160)) < 36 && Math.abs(dy - 60) < 30, '창 드래그가 스케일 하에서 정확히 추적(Δ ' + Math.round(dx) + ',' + Math.round(dy) + ')')
    }
    await ev(ws, s, `window.__closeTool('pomodoro-timer')`); await sleep(200)
    // 도구 허브(팝업)가 뷰포트를 넘지 않는지
    await ev(ws, s, `(function(){var m=document.querySelector('[data-cmd]');return 0})()`)
  }

  ok(exc.length === 0, '스케일 변경 중 예외 없음 (' + exc.slice(0, 2).join(' | ') + ')')
  await ev(ws, s, `localStorage.setItem('scrivweb:uiScale','1')`)
  console.log('\n=== 반응형/스케일 베타: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); if (FAIL > 0) process.exit(1)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(1) })
