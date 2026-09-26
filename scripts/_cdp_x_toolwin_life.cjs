// 도구창 라이프사이클 실사용 베타 — '코드리뷰'가 아니라 실제로 도구창을 열고/끌고/최소화/최대화/닫으며
// '상식적으로 당연한데 안 되는 것'을 잡는다. 위반은 console.log('[ISSUE] ...') 로 남기고 실패로 카운트.
// 점검: ① 새로 열면 맨 앞(최고 z) ② 새 창은 앞 창과 offset(완전 겹침 아님) ③ 열릴 때 본문 첫 포커스
//       ④ 3개 이상 동시 + 하단 독 칩 수 일치 ⑤ 헤더 클릭 시 맨 앞 ⑥ 같은 도구 다시 열기(중복 없이 포커스)
//       ⑦ 최대화/복원 ⑧ 최소화→하단 독 칩(숨김)→복원(맨 앞) ⑨ Esc 로 맨 앞 창 닫힘
//       ⑩ 닫기 버튼으로 창+칩 제거 ⑪ '모두 닫기'로 전부 정리.
// 하니스 규약: createTarget 직접 + attachToTarget flatten. about:blank+navigate 금지.
// 포인터(헤더 클릭=bringToFront)는 Input.dispatchMouseEvent 사용 → 이 스크립트는 Runtime.enable 을 호출하지 않는다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

const A = 'name-mixer', B = 'character-forge', C = 'plot-twist-deck'
// 페이지 헬퍼(셀렉터 조각) — data-tool-id 의 큰따옴표는 \" 로 이스케이프.
const sel = (id) => '.toolwin[data-tool-id=\\"' + id + '\\"]'

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // 실제 마우스(헤더 클릭=맨 앞으로) — element.click() 은 pointerdown 을 안 쏘므로 bringToFront 가 안 걸린다.
  const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  const pressAt = async (x, y) => { await M('mouseMoved', x, y); await sleep(30); await M('mousePressed', x, y); await sleep(60); await M('mouseReleased', x, y) }

  // 로드 대기 + 환영/투어 닫기
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__openTool==='function'&&typeof window.__closeTool==='function'")) return true } catch { /* loading */ } } return false }
  const dismissTour = async () => { await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400) }

  // === ① 깨끗한 슬레이트: 저장된 도구창 위치/세션을 지워 offset 케스케이드가 결정적으로 적용되게 한다.
  if (!(await waitHook())) { console.log('FATAL 훅 로드 실패'); ws.close(); process.exit(2); return }
  await dismissTour()
  await ev(ws, sid, "try{Object.keys(localStorage).filter(function(k){return k.indexOf('sry:toolwin:')===0||k==='sry:toolSession'}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}return 1")
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  t(await waitHook(), '앱 로드 + 도구 훅(__openTool/__closeTool) 준비')
  await dismissTour()
  // 혹시 복원된 창이 있으면 모두 닫고 시작
  await ev(ws, sid, "if(window.__scriv){}; var ids=JSON.parse(localStorage.getItem('sry:toolSession')||'{}').open||[];return 1")
  await sleep(200)

  // 페이지 헬퍼들
  const front = () => ev(ws, sid, "var ws=[].slice.call(document.querySelectorAll('.toolwin')).filter(function(w){return getComputedStyle(w).display!=='none'});var best=null,bz=-1;ws.forEach(function(w){var z=parseInt(getComputedStyle(w).zIndex||'0',10)||0;if(z>bz){bz=z;best=w.getAttribute('data-tool-id')}});return best")
  const winCount = (id) => ev(ws, sid, "return document.querySelectorAll('" + sel(id) + "').length")
  const totalWins = () => ev(ws, sid, "return document.querySelectorAll('.toolwin').length")
  const visWins = () => ev(ws, sid, "return [].slice.call(document.querySelectorAll('.toolwin')).filter(function(w){return getComputedStyle(w).display!=='none'}).length")
  const chipCount = () => ev(ws, sid, "return document.querySelectorAll('.tool-dock-chip').length")
  const isNone = (id) => ev(ws, sid, "var e=document.querySelector('" + sel(id) + "');return !!e&&getComputedStyle(e).display==='none'")
  const exists = (id) => ev(ws, sid, "return !!document.querySelector('" + sel(id) + "')")
  const rectOf = async (q) => JSON.parse(await ev(ws, sid, "var e=document.querySelector('" + q + "');if(!e)return 'null';var r=e.getBoundingClientRect();return JSON.stringify({l:r.left,t:r.top,w:r.width,h:r.height})"))
  const openTool = async (id) => { await ev(ws, sid, "window.__openTool('" + id + "');return 1"); await sleep(700) }

  // === ② 도구창 새로 열기(A) — 창 생성 + 본문 첫 포커스
  await openTool(A)
  t(await exists(A), '도구창 새로 열림(.toolwin 생성)')
  t(await ev(ws, sid, "var ae=document.activeElement;return !!(ae&&ae.closest&&ae.closest('" + sel(A) + "'))"), '열릴 때 키보드 포커스가 그 창 안으로 이동(모달/창 첫 포커스 상식)')

  // === ③ 두 번째 창(B) — 맨 앞 + 앞 창과 offset(완전 겹침 아님)
  await openTool(B)
  t((await front()) === B, '새로 연 창이 맨 앞(최고 z)에 뜸')
  const pa = await rectOf(sel(A)), pb = await rectOf(sel(B))
  const dxy = pa && pb ? Math.abs(pa.l - pb.l) + Math.abs(pa.t - pb.t) : 0
  t(dxy >= 16, '새 창이 앞 창과 어긋나게(offset) 뜸 — 완전히 겹치지 않음(Δl+Δt=' + Math.round(dxy) + 'px)')

  // === ④ 3개 이상 동시(C) + 하단 독 칩 수 일치
  await openTool(C)
  t((await totalWins()) >= 3, '도구창 3개 이상 동시 표시(' + (await totalWins()) + ')')
  t((await chipCount()) === (await totalWins()), '하단 독 칩 수 = 열린 도구창 수(스위처 일관성)')
  t((await front()) === C, '세 번째 창도 맨 앞에 뜸')

  // === ⑤ 헤더 클릭 시 맨 앞 — A 의 헤더를 실제 마우스로 눌러 A 를 앞으로
  const ha = await rectOf(sel(A) + ' .toolwin-head')
  t(!!ha, 'A 창 헤더 영역 존재(드래그/활성 핸들)')
  if (ha) { await pressAt(ha.l + 20, ha.t + 6); await sleep(250) }
  t((await front()) === A, '뒤에 있던 창의 헤더를 클릭하면 맨 앞으로 올라옴')

  // === ⑥ 같은 도구 다시 열기 — 중복 생성 없이 포커스(맨 앞)
  await openTool(B)
  t((await winCount(B)) === 1, '이미 열린 도구를 다시 열어도 중복 창이 생기지 않음(인스턴스 1개)')
  t((await front()) === B, '이미 열린 도구를 다시 열면 그 창이 맨 앞으로 옴(중복 대신 포커스)')

  // === ⑦ 최대화 / 복원 (A)
  const a0 = await rectOf(sel(A))
  await ev(ws, sid, "var b=document.querySelector('" + sel(A) + " button[aria-label=\\\"창 최대화\\\"]');if(b)b.click();return 1"); await sleep(350)
  const aMax = await rectOf(sel(A))
  const grew = a0 && aMax && aMax.w > a0.w + 80 && (await ev(ws, sid, "return !!document.querySelector('" + sel(A) + " button[aria-label=\\\"창 복원\\\"]')"))
  t(grew, '최대화하면 작업 영역을 채우고 버튼이 ‘창 복원’으로 바뀜(폭 ' + (a0 ? Math.round(a0.w) : '?') + '→' + (aMax ? Math.round(aMax.w) : '?') + ')')
  await ev(ws, sid, "var b=document.querySelector('" + sel(A) + " button[aria-label=\\\"창 복원\\\"]');if(b)b.click();return 1"); await sleep(350)
  const aBack = await rectOf(sel(A))
  t(aBack && a0 && Math.abs(aBack.w - a0.w) <= 24 && (await ev(ws, sid, "return !!document.querySelector('" + sel(A) + " button[aria-label=\\\"창 최대화\\\"]')")), '복원하면 이전 크기로 정확히 되돌아옴(폭 ' + (aBack ? Math.round(aBack.w) : '?') + ')')

  // === ⑧ 최소화 → 하단 독 칩(숨김) → 복원(맨 앞)
  await ev(ws, sid, "var b=document.querySelector('" + sel(C) + " button[aria-label=\\\"최소화\\\"]');if(b)b.click();return 1"); await sleep(300)
  t(await isNone(C), '최소화하면 창이 화면에서 사라짐(언마운트 아님, display:none — 작업 내용 보존)')
  t((await ev(ws, sid, "return document.querySelectorAll('.tool-dock-chip.is-min').length")) === 1, '최소화된 도구는 하단 독에 ‘최소화’ 표시 칩으로 남음')
  t((await visWins()) === 2, '최소화한 창은 보이지 않음(보이는 도구창 2개)')
  // 독의 최소화 칩 복원 버튼 클릭(유일한 is-min 칩으로 특정)
  await ev(ws, sid, "var b=document.querySelector('.tool-dock-chip.is-min .tool-dock-restore');if(b)b.click();return 1"); await sleep(350)
  t(!(await isNone(C)) && (await visWins()) === 3, '하단 독 칩을 누르면 최소화한 창이 복원되어 다시 보임')
  t((await front()) === C, '복원한 창이 맨 앞으로 올라옴')

  // === ⑨ Esc 로 맨 앞 창 닫힘 (현재 맨 앞 = C). 창 내부 요소에서 keydown 발생시켜 React 핸들러로 전달.
  await ev(ws, sid, "var e=document.querySelector('" + sel(C) + "');if(e)e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return 1"); await sleep(350)
  t(!(await exists(C)), 'Esc 키로 맨 앞 도구창이 닫힘(모달/창 닫기 상식)')

  // === ⑩ 닫기 버튼으로 창+독 칩 제거 (B)
  await ev(ws, sid, "var b=document.querySelector('" + sel(B) + " button[aria-label=\\\"닫기\\\"]');if(b)b.click();return 1"); await sleep(300)
  t(!(await exists(B)), '닫기(×) 버튼으로 도구창이 사라짐')
  t((await chipCount()) === (await totalWins()), '창을 닫으면 하단 독 칩도 함께 사라짐(칩 수=창 수)')

  // === ⑪ '모두 닫기' — 3개 다시 열어 일괄 정리
  await openTool(B); await openTool(C); await sleep(200)
  t((await totalWins()) >= 3, '일괄 정리 전 도구창 3개 재오픈')
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.tool-dock-act')).find(function(x){return (x.textContent||'').trim()==='모두 닫기'});if(b)b.click();return 1"); await sleep(350)
  t((await totalWins()) === 0 && !(await ev(ws, sid, "return !!document.querySelector('.tool-dock')")), '‘모두 닫기’로 전 도구창과 하단 독이 모두 정리됨')

  console.log('=== 도구창 라이프사이클 실사용 베타 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
