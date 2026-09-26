// URL ?skin=aurora|studio|classic 진입 검증(Playwright). 실행: vite preview --port 4178 띄운 뒤 node scripts/_pw_skin_param.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  await p.goto('http://localhost:4178/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sry:tour:done', '1') })
  await p.goto('http://localhost:4178/?skin=aurora&x=1#h'); await p.waitForTimeout(1500)
  chk(await p.evaluate(() => !!document.querySelector('.aurora-root')), '?skin=aurora → 오로라 셸')
  chk(await p.evaluate(() => location.search === '?x=1' && location.hash === '#h'), '주소에서 skin 파라미터만 제거(다른 파라미터·해시 유지): ' + await p.evaluate(() => location.search + location.hash))
  chk(await p.evaluate(() => localStorage.getItem('sry:uiSkin') === 'aurora'), '선택 영속')
  await p.goto('http://localhost:4178/'); await p.waitForTimeout(1200)
  chk(await p.evaluate(() => !!document.querySelector('.aurora-root')), '파라미터 없이 재방문해도 오로라 유지')
  await p.goto('http://localhost:4178/?skin=classic'); await p.waitForTimeout(1200)
  chk(await p.evaluate(() => !document.querySelector('.aurora-root') && !document.querySelector('.studio-root')), '?skin=classic → 클래식')
  await p.goto('http://localhost:4178/?skin=bogus'); await p.waitForTimeout(1200)
  chk(await p.evaluate(() => location.search === '?skin=bogus'), '잘못된 값은 무시(주소 유지)')
  console.log('SKIN PARAM FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
