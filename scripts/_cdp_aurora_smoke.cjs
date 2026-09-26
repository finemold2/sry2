// Aurora 스킨(디자인 2) 실동작 스모크: 내비 10뷰 전환·메뉴 4종·헤더 액션·패널 토글·도구창·스킨 왕복·좁은 화면 오버레이.
//  기능은 클래식/스튜디오와 같은 컴포넌트라, 여기서는 '셸(껍데기)'이 모든 진입점을 빠짐없이 노출하는지 본다.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }
const after = (expr, ms = 300) => `new Promise(function(r){setTimeout(function(){r(${expr})},${ms})})`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === s && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, s).catch(() => {}) })
  const errs = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== s) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails.exception || {}).description || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map((a) => String(a.value || a.description || '')).join(' ').slice(0, 100)) })
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1600, height: 960, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await ev(ws, s, `localStorage.setItem('sry:uiSkin','aurora')`); await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await sleep(600)
  await ev(ws, s, `var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent||'')});if(b)b.click();1`); await sleep(400)

  console.log('\n[1] 셸 렌더')
  ok(await ev(ws, s, `!!document.querySelector('.aurora-root')`), 'aurora-root 렌더(스킨 영속: sry:uiSkin=aurora)')
  ok(await ev(ws, s, `document.querySelectorAll('.au-nav-btn').length`) === 15, '내비 버튼 15개(뷰 10 + 도구 5)')
  ok(await ev(ws, s, `document.querySelectorAll('.au-menubar .menu-wrap > button').length`) === 4, '상단 메뉴 4개(파일/문서/도구/보기)')

  console.log('\n[2] 뷰 전환 10종(내비 클릭 → 컨테이너/헤더 출현)')
  const VIEWS = [['에디터', `!!document.querySelector('.paper')`], ['코르크보드', `!!document.querySelector('.corkboard')`], ['아웃라이너', `!!document.querySelector('.outliner')`], ['칸반', `!!document.querySelector('.board-col')`], ['캔버스', `!!document.querySelector('.canvas-area')`], ['연재', `/연재/.test(document.querySelector('.au-center').innerText)`], ['타임라인', `/스토리 타임라인/.test(document.querySelector('.au-center').innerText)`], ['참고문헌', `/참고문헌|출처/.test(document.querySelector('.au-center').innerText)`], ['논증', `/논증 작업대/.test(document.querySelector('.au-center').innerText)`], ['데이터베이스', `!!document.querySelector('table.db-table')`]]
  for (const [label, check] of VIEWS) {
    await ev(ws, s, `document.querySelector('.au-nav-btn[aria-label="${label}"]').click()`); await sleep(450)
    const pressed = await ev(ws, s, `document.querySelector('.au-nav-btn[aria-label="${label}"]').getAttribute('aria-pressed')`)
    ok(pressed === 'true' && (await ev(ws, s, check)), `뷰 ${label}: aria-pressed + 컨테이너`)
  }
  await ev(ws, s, `document.querySelector('.au-nav-btn[aria-label="에디터"]').click()`); await sleep(300)

  console.log('\n[3] 메뉴 4종 열림/항목 클릭')
  for (const m of ['파일', '문서', '도구', '보기']) {
    const n = await ev(ws, s, `(function(){var b=[].slice.call(document.querySelectorAll('.au-menu-btn')).find(function(x){return (x.textContent||'').trim()==='${m}'});if(!b)return -1;b.click();return ${after(`document.querySelectorAll('.au-menubar .dropdown button').length`, 250)}})()`)
    ok(n > 3, `메뉴 ${m}: 드롭다운 항목 ${n}개`)
    await ev(ws, s, `document.body.click()`); await sleep(150)
  }
  await ev(ws, s, `(function(){var b=[].slice.call(document.querySelectorAll('.au-menu-btn')).find(function(x){return (x.textContent||'').trim()==='파일'});b.click()})()`); await sleep(250)
  await ev(ws, s, `(function(){var b=[].slice.call(document.querySelectorAll('.au-menubar .dropdown button')).find(function(x){return /백업/.test(x.textContent||'')});if(b)b.click()})()`); await sleep(500)
  ok(await ev(ws, s, `!!document.querySelector('.modal-backdrop')`), '파일 → 백업/복원 항목 클릭 → 모달 출현')
  await ev(ws, s, `window.__setModal && window.__setModal(null)`); await sleep(200)

  console.log('\n[4] 헤더 액션')
  await ev(ws, s, `document.querySelector('.au-action[aria-label="찾기"]').click()`); await sleep(300)
  ok(await ev(ws, s, `!!document.querySelector('.findbar')`), '찾기 → 찾기바 출현')
  await ev(ws, s, `document.querySelector('.au-action[aria-label="찾기"]').click()`); await sleep(200)
  const th0 = await ev(ws, s, `document.documentElement.getAttribute('data-theme')||'light'`)
  await ev(ws, s, `document.querySelector('.au-action[aria-label="테마"]').click()`); await sleep(300)
  const th1 = await ev(ws, s, `document.documentElement.getAttribute('data-theme')||'light'`)
  ok(th0 !== th1, `테마 전환 (${th0}→${th1})`)
  await ev(ws, s, `document.querySelector('.au-action[aria-label="명령"]').click()`); await sleep(400)
  ok(await ev(ws, s, `!!document.querySelector('.cmd-palette')`), '명령 → 팔레트 출현')
  await ev(ws, s, `window.__setModal && window.__setModal(null)`); await sleep(200)
  await ev(ws, s, `document.querySelector('.au-action[aria-label="스냅샷"]').click()`); await sleep(400)
  ok(await ev(ws, s, `!!document.querySelector('.modal-backdrop')||/스냅샷을 저장했어요/.test(document.body.innerText)`), '스냅샷 → 안내 모달 또는 즉시 저장')
  await ev(ws, s, `window.__setModal && window.__setModal(null)`); await sleep(200)
  await ev(ws, s, `document.querySelector('.au-action[aria-label="분할"]').click()`); await sleep(400)
  ok(await ev(ws, s, `document.querySelector('.au-action[aria-label="분할"]').classList.contains('active')`), '분할 → 활성 표시')
  await ev(ws, s, `(function(){var b=document.querySelector('.au-action[aria-label="분할"]');b.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))})()`); await sleep(300)
  ok(!(await ev(ws, s, `document.querySelector('.au-action[aria-label="분할"]').classList.contains('active')`)), '분할 우클릭 → 닫힘')
  await ev(ws, s, `document.querySelector('.au-action[aria-label="집중"]').click()`); await sleep(400)
  await ev(ws, s, `var b=[].slice.call(document.querySelectorAll('.focus-chooser button, .modal button')).find(function(x){return /현재 창/.test(x.textContent||'')});if(b)b.click();1`); await sleep(400)
  ok(await ev(ws, s, `!!document.querySelector('.composition')`), '집중 → 현재 창 집중 모드 진입')
  await ev(ws, s, `var x=document.querySelector('.comp-exit');if(x)x.click();1`); await sleep(300)

  console.log('\n[5] 패널 토글 + 도구창')
  const bw = await ev(ws, s, `!!document.querySelector('.au-binder')`)
  await ev(ws, s, `document.querySelector('.au-action-ico[aria-label="바인더"]').click()`); await sleep(300)
  ok(bw !== (await ev(ws, s, `!!document.querySelector('.au-binder')`)), '바인더 토글')
  await ev(ws, s, `document.querySelector('.au-action-ico[aria-label="바인더"]').click()`); await sleep(200)
  const iw = await ev(ws, s, `!!document.querySelector('.au-inspector')`)
  await ev(ws, s, `document.querySelector('.au-action-ico[aria-label="인스펙터"]').click()`); await sleep(300)
  ok(iw !== (await ev(ws, s, `!!document.querySelector('.au-inspector')`)), '인스펙터 토글')
  await ev(ws, s, `document.querySelector('.au-action-ico[aria-label="인스펙터"]').click()`); await sleep(200)
  await ev(ws, s, `document.querySelector('.au-nav-btn[aria-label="도구 허브"]').click()`); await sleep(600)
  ok(await ev(ws, s, `!!document.querySelector('.modal-backdrop')`), '내비 도구 허브 → 모달')
  await ev(ws, s, `window.__setModal && window.__setModal(null)`); await sleep(200)
  await ev(ws, s, `window.__openTool('character-sheet')`); await sleep(1200)
  const headTop = await ev(ws, s, `(function(){var w=document.querySelector('.toolwin[data-tool-id="character-sheet"] .toolwin-head');if(!w)return -1;var r=w.getBoundingClientRect();var el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return w.contains(el)?1:0})()`)
  ok(headTop === 1, '도구창 헤더가 상단 바에 가려지지 않음')
  await ev(ws, s, `window.__closeTool('character-sheet')`); await sleep(200)

  console.log('\n[6] 스킨 왕복(데이터 보존)')
  const items0 = await ev(ws, s, `window.__scriv.state().items`)
  await ev(ws, s, `document.querySelector('.au-skin[aria-label="클래식 UI 로 전환"]').click()`); await sleep(500)
  ok(await ev(ws, s, `!document.querySelector('.aurora-root') && !!document.querySelector('.toolbar')`), '오로라 → 클래식')
  await ev(ws, s, `[].slice.call(document.querySelectorAll('.toolbar button')).find(function(x){return (x.getAttribute('aria-label')||'')==='Aurora UI 로 전환'}).click()`); await sleep(500)
  ok(await ev(ws, s, `!!document.querySelector('.aurora-root')`) && (await ev(ws, s, `window.__scriv.state().items`)) === items0, '클래식 → 오로라 (항목 수 보존)')
  await ev(ws, s, `document.querySelector('.au-skin[aria-label="Studio UI 로 전환"]').click()`); await sleep(500)
  ok(await ev(ws, s, `!!document.querySelector('.studio-root')`), '오로라 → 스튜디오')
  await ev(ws, s, `(function(){var t=[].slice.call(document.querySelectorAll('.st-menubar button')).find(function(b){return (b.textContent||'').trim()==='보기'});t.click()})()`); await sleep(250)
  await ev(ws, s, `(function(){var b=[].slice.call(document.querySelectorAll('.st-menubar .dropdown button')).find(function(x){return /Aurora/.test(x.textContent||'')});if(b)b.click()})()`); await sleep(500)
  ok(await ev(ws, s, `!!document.querySelector('.aurora-root')`), '스튜디오 보기 메뉴 → 오로라')
  ok((await ev(ws, s, `localStorage.getItem('sry:uiSkin')`)) === 'aurora', '스킨 선택 localStorage 영속')

  console.log('\n[7] 좁은 화면 오버레이')
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 820, height: 800, deviceScaleFactor: 1, mobile: false }, s); await sleep(500)
  const ov = await ev(ws, s, `(function(){var b=document.querySelector('.au-binder');return b?b.classList.contains('pane-overlay'):'no-binder'})()`)
  ok(ov === true || ov === 'no-binder', '좁은 폭: 바인더가 오버레이(.pane-overlay)로 전환 (' + ov + ')')
  if (ov === true) { await ev(ws, s, `var b=document.querySelector('.panel-backdrop');if(b)b.click();1`); await sleep(300); ok(!(await ev(ws, s, `!!document.querySelector('.au-binder')`)), '백드롭 클릭 → 패널 닫힘') }

  const real = errs.filter((e) => !/ResizeObserver|DevTools|favicon|Failed to fetch|NetworkError|ERR_/i.test(e))
  ok(real.length === 0, '전 과정 콘솔에러/예외 0' + (real.length ? ' — ' + real.slice(0, 3).join(' | ') : ''))
  console.log('\n=== Aurora 스킨 스모크: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); process.exit(FAIL ? 1 : 0)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(2) })
