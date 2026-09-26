// 연계 E2E(실사용 흐름): 인물 시트에서 인물을 만들고 → 공유 라이브러리 저장 → "관계도" 버튼으로 관계도에 노드로 이동.
//  · 관계도가 닫힌 상태에서 열기(payload.character) / 이미 열린 상태에서 두 번째 인물 보내기(payload 갱신)
//  · "라이브러리 인물 불러오기" 일괄 가져오기 + 중복 방지 안내
//  · 관계도에서 만든 관계를 라이브러리(인물 시트 관계 칸)로 되돌리기
// 사용: vite preview(:4178) + 헤드리스 Chrome(:9222) 후 node scripts/_cdp_char_to_relmap.cjs
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }

const WIN = (id) => `document.querySelector('.toolwin[data-tool-id="${id}"]')`
// 도구창 안에서 텍스트를 포함하는 버튼 클릭
const clickIn = (id, txt) => `(function(){var w=${WIN(id)};if(!w)return'noWin';var b=[].slice.call(w.querySelectorAll('button')).find(function(x){return (x.innerText||'').includes(${JSON.stringify(txt)})});if(!b)return'noBtn';if(b.disabled)return'disabled';b.click();return'clicked'})()`
// React 제어 input 에 값 넣기(네이티브 setter + input 이벤트)
const typeIn = (id, placeholder, val) => `(function(){var w=${WIN(id)};if(!w)return'noWin';var i=[].slice.call(w.querySelectorAll('input,textarea')).find(function(x){return (x.placeholder||'').includes(${JSON.stringify(placeholder)})});if(!i)return'noInput';var proto=i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(i,${JSON.stringify(val)});i.dispatchEvent(new Event('input',{bubbles:true}));return'typed'})()`
const libChars = `(function(){try{var best=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sry:shared-library')===0){var l=JSON.parse(localStorage.getItem(k)||'{}');var a=l.characters||[];if(a.length>best.length)best=a}}return best.map(function(c){return c.name})}catch(e){return ['ERR '+e.message]}})()`
// 관계도 노드 라벨(svg text) 목록
const mapNodes = `(function(){var w=${WIN('relationship-map')};if(!w)return null;return [].slice.call(w.querySelectorAll('svg text')).map(function(t){return (t.textContent||'').trim()}).filter(Boolean)})()`
const mapNote = `(function(){var w=${WIN('relationship-map')};return w?(w.innerText||''):''})()`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  const errs = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== s) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails.exception || {}).description || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map((a) => String(a.value || a.description || '')).join(' ').slice(0, 100)) })
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await sleep(700)
  await ev(ws, s, `var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent||'')});if(b)b.click();1`)
  await sleep(300)
  // 공유 라이브러리·시트 로컬 데이터 초기화(깨끗한 출발)
  await ev(ws, s, `(function(){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf('sry:shared-library')===0||k.indexOf('sry:tool:character-sheet')===0||k.indexOf('sry:tool:relationship-map')===0))ks.push(k)}ks.forEach(function(k){localStorage.removeItem(k)})})()`)

  console.log('\n[1] 인물 시트: 인물 생성 → 이름 입력 → 라이브러리 저장')
  await ev(ws, s, `window.__openTool('character-sheet')`); await sleep(1200)
  ok((await ev(ws, s, `!!${WIN('character-sheet')}`)) === true, '인물 시트 창 열림')
  let r = await ev(ws, s, clickIn('character-sheet', '인물 추가')); if (r !== 'clicked') r = await ev(ws, s, clickIn('character-sheet', '첫 인물 만들기'))
  ok(r === 'clicked', '"＋ 인물 추가" 클릭 (' + r + ')'); await sleep(300)
  ok((await ev(ws, s, typeIn('character-sheet', '한도윤', '한도윤'))) === 'typed', '이름 "한도윤" 입력'); await sleep(300)
  ok((await ev(ws, s, clickIn('character-sheet', '라이브러리에 저장'))) === 'clicked', '"📚 라이브러리에 저장" 클릭'); await sleep(400)
  let names = await ev(ws, s, libChars)
  ok(Array.isArray(names) && names.includes('한도윤'), '공유 라이브러리 characters 에 "한도윤" 저장됨 (' + JSON.stringify(names) + ')')
  ok((await ev(ws, s, clickIn('character-sheet', '라이브러리 업데이트'))) === 'clicked', '저장 후 버튼이 "라이브러리 업데이트" 로 바뀜(연결 상태 유지)')

  console.log('\n[2] 인물 시트 "관계도" 버튼 → 관계도 창이 열리고 인물이 노드로 추가')
  ok((await ev(ws, s, clickIn('character-sheet', '관계도'))) === 'clicked', '"🕸️ 관계도" 클릭'); await sleep(1500)
  ok((await ev(ws, s, `!!${WIN('relationship-map')}`)) === true, '관계도 창 열림')
  let nodes = await ev(ws, s, mapNodes)
  ok(Array.isArray(nodes) && nodes.includes('한도윤'), '관계도에 "한도윤" 노드 존재 (' + JSON.stringify(nodes) + ')')
  ok(/인물 1명을 노드로 추가/.test(await ev(ws, s, mapNote)), '안내: "인물 1명을 노드로 추가했어요"')

  console.log('\n[3] 관계도가 열린 상태에서 두 번째 인물 보내기(payload 갱신 경로)')
  ok((await ev(ws, s, clickIn('character-sheet', '인물 추가'))) === 'clicked', '두 번째 인물 추가'); await sleep(300)
  ok((await ev(ws, s, typeIn('character-sheet', '한도윤', '서지우'))) === 'typed', '이름 "서지우" 입력'); await sleep(300)
  ok((await ev(ws, s, clickIn('character-sheet', '라이브러리에 저장'))) === 'clicked', '"서지우" 라이브러리 저장'); await sleep(400)
  ok((await ev(ws, s, clickIn('character-sheet', '관계도'))) === 'clicked', '"관계도" 클릭(창 이미 열림)'); await sleep(1200)
  nodes = await ev(ws, s, mapNodes)
  ok(nodes.includes('한도윤') && nodes.includes('서지우'), '관계도 노드: 한도윤 + 서지우 (' + JSON.stringify(nodes) + ')')
  const relWins = await ev(ws, s, `document.querySelectorAll('.toolwin[data-tool-id="relationship-map"]').length`)
  ok(relWins === 1, '관계도 창은 1개만(중복 창 없음)')

  console.log('\n[4] 같은 인물 재전송 → 중복 노드 없음 / 라이브러리 일괄 불러오기 → 이미 모두 있음')
  ok((await ev(ws, s, clickIn('character-sheet', '관계도'))) === 'clicked', '"서지우" 관계도 재클릭'); await sleep(900)
  nodes = await ev(ws, s, mapNodes)
  ok(nodes.filter((n) => n === '서지우').length === 1, '"서지우" 노드 중복 없음')
  ok(/이미 모두 추가/.test(await ev(ws, s, mapNote)), '안내: "받은 인물이 이미 모두 추가되어 있어요"')
  r = await ev(ws, s, clickIn('relationship-map', '라이브러리 인물 불러오기'))
  ok(r === 'clicked', '"📥 라이브러리 인물 불러오기 (2)" 클릭 (' + r + ')'); await sleep(600)
  nodes = await ev(ws, s, mapNodes)
  ok(nodes.filter((n) => n === '한도윤').length === 1 && nodes.filter((n) => n === '서지우').length === 1, '일괄 불러오기 후에도 노드 각 1개(중복 방지)')
  ok(/이미 모두 노드에/.test(await ev(ws, s, mapNote)), '안내: "라이브러리 인물이 이미 모두 노드에 있어요"')

  console.log('\n[5] 관계도 닫고 라이브러리에서만 다시 불러오기(빈 관계도 → 2명)')
  await ev(ws, s, `window.__closeTool && window.__closeTool('relationship-map')`); await sleep(500)
  await ev(ws, s, `localStorage.removeItem('sry:tool:relationship-map')`)
  await ev(ws, s, `window.__openTool('relationship-map')`); await sleep(1500)
  r = await ev(ws, s, clickIn('relationship-map', '라이브러리 인물 불러오기')); await sleep(600)
  nodes = await ev(ws, s, mapNodes)
  ok(r === 'clicked' && nodes.includes('한도윤') && nodes.includes('서지우'), '새 관계도에 라이브러리 2명 노드로 추가 (' + JSON.stringify(nodes) + ')')

  console.log('\n[6] 인물 시트가 라이브러리에서 인물 가져오기(역방향)')
  await ev(ws, s, `localStorage.removeItem('sry:tool:character-sheet')`)
  await ev(ws, s, `window.__closeTool && window.__closeTool('character-sheet')`); await sleep(400)
  await ev(ws, s, `window.__openTool('character-sheet')`); await sleep(1200)
  ok((await ev(ws, s, clickIn('character-sheet', '라이브러리에서 가져오기'))) === 'clicked', '"📥 라이브러리에서 가져오기" 클릭'); await sleep(500)
  const hasList = await ev(ws, s, `(function(){var w=${WIN('character-sheet')};return w&&/한도윤/.test(w.innerText)&&/서지우/.test(w.innerText)})()`)
  ok(hasList === true, '가져오기 목록에 라이브러리 인물 2명 표시')

  const real = errs.filter((e) => !/ResizeObserver|DevTools|favicon/i.test(e))
  ok(real.length === 0, '전 과정 콘솔에러/예외 0' + (real.length ? ' — ' + real.slice(0, 3).join(' | ') : ''))
  console.log('\n=== 인물 시트 → 관계도 연계 E2E: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); process.exit(FAIL ? 1 : 0)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(2) })
