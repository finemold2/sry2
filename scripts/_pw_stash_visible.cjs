// 수집함 항상 보이기 검증(Playwright): 큰 모니터에서 저장된 좌표로 작은 창에서 열어도 아이콘/창이 화면 안에 있고,
// 저장값은 유지되며, 작은 화면에서 드래그하면 그 좌표로 저장되는지. 실행: vite preview --port 4178 띄운 뒤 node scripts/_pw_stash_visible.cjs
// 수집함 아이콘/창이 저장된 좌표가 화면 밖(큰 모니터에서 저장)이어도 항상 보이는지
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  const inView = async (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight ? true : [r.left, r.top, r.right, r.bottom, innerWidth, innerHeight] }, sel)
  for (const skin of ['classic', 'aurora']) {
    await p.setViewportSize({ width: 1200, height: 700 })
    await p.goto('http://localhost:4178/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:stash:coached', '1'); localStorage.setItem('sry:stash:pos', JSON.stringify({ x: 2400, y: 1300 })); localStorage.setItem('sry:stash:win', JSON.stringify({ x: 2000, y: 1200, w: 460, h: 420 })) }, skin); await p.reload(); await p.waitForTimeout(1200)
    chk((await inView('.stash-icon-wrap')) === true, skin + ': 큰 모니터 좌표(2400,1300) 저장 상태에서 1200×700 창에 아이콘 보임 ' + JSON.stringify(await inView('.stash-icon-wrap')))
    await p.setViewportSize({ width: 800, height: 500 }); await p.waitForTimeout(300)
    chk((await inView('.stash-icon-wrap')) === true, skin + ': 800×500 으로 줄여도 아이콘 보임')
    chk(await p.evaluate(() => JSON.parse(localStorage.getItem('sry:stash:pos')).x === 2400), skin + ': 저장된 원래 좌표는 유지(큰 모니터 복귀 시 원위치)')
    await p.click('.stash-icon'); await p.waitForTimeout(400)
    chk((await inView('.stash-win')) === true, skin + ': 수집함 창도 화면 안 ' + JSON.stringify(await inView('.stash-win')))
    console.log('  head/btn rects:', JSON.stringify(await p.evaluate(() => { const w = document.querySelector('.stash-win').getBoundingClientRect(); const b = document.querySelector('.stash-win button[title="접기"]').getBoundingClientRect(); return { win: [w.left, w.top, w.width, w.height], btn: [b.left, b.top, b.width, b.height] } })))
    await p.evaluate(() => document.querySelector('.stash-win button[title="접기"]').click()); await p.waitForTimeout(300)
    // 작은 화면에서 드래그하면 그 자리에 저장
    const r = await p.evaluate(() => { const e = document.querySelector('.stash-icon').getBoundingClientRect(); return { x: e.left + 26, y: e.top + 26 } })
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x - 300, r.y - 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200)
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('sry:stash:pos')))
    chk(saved.x < 800 && saved.y < 500 && (await inView('.stash-icon-wrap')) === true, skin + ': 작은 화면에서 드래그 → 화면 안 좌표로 저장 ' + JSON.stringify(saved))
  }
  console.log('STASH VISIBLE FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
