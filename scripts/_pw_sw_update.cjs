// 새 배포 감지(controllerchange) 시: 저장 안 된 변경이 있으면 배너를 띄우고, 저장·입력 멈춤 뒤 자동 새로고침. 실행: 미리보기(4178) 후 node scripts/_pw_sw_update.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  await p.goto('http://localhost:4178/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sry:uiSkin', 'classic'); localStorage.setItem('sry:tour:done', '1') }); await p.reload()
  // 워커 설치(프리캐시 566개)가 끝나 페이지를 제어할 때까지 기다린 뒤 한 번 더 로드(그래야 시작 시점에 controller 가 있다)
  let ctl = false; for (let i = 0; i < 120 && !ctl; i++) { await p.waitForTimeout(500); ctl = await p.evaluate(() => !!navigator.serviceWorker.controller) }
  chk(ctl, '서비스 워커가 페이지를 제어 중')
  await p.reload(); await p.waitForTimeout(2000)
  await p.locator('.paper').first().click(); await p.keyboard.type('new version test'); await p.waitForTimeout(100)
  await p.evaluate(() => { window.__marker = 1; navigator.serviceWorker.dispatchEvent(new Event('controllerchange')) }); await p.waitForTimeout(600)
  chk(await p.locator('#sw-update-banner').count() === 1, '입력 중이면 즉시 새로고침 대신 배너 표시')
  await p.waitForTimeout(8000)
  const reloaded = await p.evaluate(() => window.__marker !== 1); chk(reloaded, '저장·입력 멈춤 뒤 자동 새로고침됨')
  const kept = await p.evaluate(() => (document.querySelector('.paper') || {}).textContent || ''); chk(/new version test/.test(kept), '새로고침 후 입력 내용 보존')
  console.log('SW UPDATE FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
