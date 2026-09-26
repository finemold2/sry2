// 바인더 우클릭 메뉴 검증(Playwright): 오로라 유리 서랍(backdrop-filter+overflow:hidden) 안에서도 body 포털로 잘리지 않고 끝 항목까지 클릭 가능. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_ctx_menu.cjs
// 바인더 우클릭 메뉴가 오로라 유리 서랍/클래식 모두에서 잘리지 않고 끝 항목까지 클릭 가능한지
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1400, height: 760 }); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  for (const skin of ['aurora', 'classic']) {
    await p.goto('http://localhost:4178/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1') }, skin); await p.reload(); await p.waitForTimeout(1500)
    if (skin === 'aurora') { await p.evaluate(() => { const u = document.querySelector('.au-chip[aria-label="바인더"]'); if (u && !u.classList.contains('active')) u.click() }); await p.waitForTimeout(600) }
    const row = (await p.$('.binder-row.selected')) || (await p.$('.binder-row')); const r = await row.boundingBox()
    await p.mouse.click(r.x + 40, r.y + r.height / 2, { button: 'right' }); await p.waitForTimeout(400)
    const info = await p.evaluate(() => { const m = document.querySelector('.context-menu'); if (!m) return null; const mr = m.getBoundingClientRect(); const btns = [...m.querySelectorAll('button')]; const last = btns[btns.length - 1]; const lr = last.getBoundingClientRect(); const hit = document.elementFromPoint(lr.left + 8, lr.top + lr.height / 2); return { inBody: m.parentElement === document.body, top: Math.round(mr.top), bottom: Math.round(mr.bottom), vh: innerHeight, items: btns.length, lastVisible: !!hit && (last.contains(hit) || hit === last), lastText: last.textContent.trim().slice(0, 12) } })
    chk(info && info.inBody, skin + ': 메뉴가 body 에 포털됨')
    chk(info && info.bottom <= info.vh && info.lastVisible, skin + ': 마지막 항목(' + (info && info.lastText) + ')까지 화면 안에서 클릭 가능 ' + JSON.stringify(info))
    await p.screenshot({ path: `contrast/ctx-${skin}.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    chk(await p.evaluate(() => !document.querySelector('.context-menu')), skin + ': Esc 로 닫힘')
  }
  console.log('CTX MENU FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
