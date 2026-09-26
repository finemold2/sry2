// 코르크보드 자유 배치 검증(Playwright): 켜기 → 카드 absolute → 드래그 이동(빈 영역·시놉시스 영역) → cork.pos 저장 → 새로고침 유지 → 클릭은 편집 포커스 → 끄면 격자. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_cork_free.cjs
// 코르크보드 '자유 배치' 검증: 체크 → 카드가 absolute 배치 → 드래그로 이동 → 좌표 저장 → 새로고침 후 유지 → 체크 해제 시 격자 복귀
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1400, height: 860 }); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  for (const skin of ['classic', 'aurora']) {
    await p.goto('http://localhost:4178/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1'); localStorage.setItem('sry:stash:coached', '1') }, skin); await p.reload(); await p.waitForTimeout(1500)
    // 문서 2개 추가(바인더 '+ 글')
    if (skin === 'aurora') { await p.evaluate(() => { const u = document.querySelector('.au-chip[aria-label="바인더"]'); if (u && !u.classList.contains('active')) u.click() }); await p.waitForTimeout(500) }
    for (let i = 0; i < 2; i++) { await p.evaluate(() => { const b = [...document.querySelectorAll('.binder-head .minibtn')].find((x) => /새 글/.test(x.title || '')); b && b.click() }); await p.waitForTimeout(250) }
    await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="코르크보드"], .tbtn[title^="코르크보드"], button[aria-label="코르크보드"]'); b && b.click() }); await p.waitForTimeout(700)
    const n0 = await p.evaluate(() => document.querySelectorAll('.corkboard .card').length)
    chk(n0 >= 3, skin + ': 카드 ' + n0 + '개')
    // 자유 배치 켜기
    await p.evaluate(() => { const c = [...document.querySelectorAll('.cork-toolbar input[type=checkbox]')].find((x) => /자유 배치/.test(x.parentElement.textContent || '')); if (c && !c.checked) c.click() }); await p.waitForTimeout(500)
    const st = await p.evaluate(() => { const bd = document.querySelector('.corkboard'); const cs = getComputedStyle(bd); const cards = [...bd.querySelectorAll('.card')]; return { free: bd.classList.contains('corkboard-free'), display: cs.display, position: cs.position, absolute: cards.every((c) => getComputedStyle(c).position === 'absolute'), first: cards[0].getBoundingClientRect() } })
    chk(st.free && st.display === 'block' && st.position === 'relative' && st.absolute, skin + ': 자유 배치 켜짐(block/relative, 카드 absolute) ' + JSON.stringify({ d: st.display, p: st.position, abs: st.absolute }))
    // 첫 카드를 (+300, +200) 드래그 — 제목/시놉시스가 아닌 카드 하단 여백에서 시작
    const card = await p.$('.corkboard .card'); const r = await card.boundingBox()
    await p.mouse.move(r.x + r.width - 12, r.y + r.height - 10); await p.mouse.down(); await p.mouse.move(r.x + r.width - 12 + 150, r.y + r.height - 10 + 100, { steps: 6 }); await p.mouse.move(r.x + r.width - 12 + 300, r.y + r.height - 10 + 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300)
    const r2 = await card.boundingBox()
    chk(Math.abs((r2.x - r.x) - 300) < 6 && Math.abs((r2.y - r.y) - 200) < 6, skin + ': 드래그로 이동 dx=' + Math.round(r2.x - r.x) + ' dy=' + Math.round(r2.y - r.y))
    const saved = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cork.pos.')).length)
    chk(saved >= 1, skin + ': 좌표 localStorage 저장(cork.pos.*) ' + saved + '개')
    await p.reload(); await p.waitForTimeout(1500)
    await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="코르크보드"], .tbtn[title^="코르크보드"], button[aria-label="코르크보드"]'); b && b.click() }); await p.waitForTimeout(700)
    const r3 = await (await p.$('.corkboard .card')).boundingBox()
    chk(Math.abs(r3.x - r2.x) < 6 && Math.abs(r3.y - r2.y) < 6, skin + ': 새로고침 후 위치 유지 (' + Math.round(r3.x) + ',' + Math.round(r3.y) + ')')
    const c2 = (await p.$$('.corkboard .card'))[1]; const q = await c2.boundingBox()
    await p.mouse.move(q.x + q.width / 2, q.y + q.height * 0.7); await p.mouse.down(); await p.mouse.move(q.x + q.width / 2 - 120, q.y + q.height * 0.7 + 80, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300) // 왼쪽 아래로(오른쪽 레일 아래로 들어가지 않게)
    const q2 = await c2.boundingBox(); chk(Math.abs((q2.x - q.x) + 120) < 6 && Math.abs((q2.y - q.y) - 80) < 6, skin + ': 시놉시스 영역에서 잡고 끌어도 이동 dx=' + Math.round(q2.x - q.x) + ' dy=' + Math.round(q2.y - q.y))
    await p.mouse.click(q2.x + q2.width / 2, q2.y + q2.height * 0.7); await p.waitForTimeout(200)
    const dbg = await p.evaluate(({ x, y }) => { const a = document.activeElement; const t = document.elementFromPoint(x, y); return { active: a && (a.className || a.tagName).toString().slice(0, 40), at: t && (t.className || t.tagName).toString().slice(0, 40) } }, { x: q2.x + q2.width / 2, y: q2.y + q2.height * 0.7 })
    chk(dbg.active && String(dbg.active).includes('card-syn'), skin + ': 이동 없는 클릭은 시놉시스 편집 포커스 ' + JSON.stringify(dbg))
    await p.screenshot({ path: `contrast/cork-free-${skin}.png` })
    // 끄면 격자로 복귀
    await p.evaluate(() => { const c = [...document.querySelectorAll('.cork-toolbar input[type=checkbox]')].find((x) => /자유 배치/.test(x.parentElement.textContent || '')); if (c && c.checked) c.click() }); await p.waitForTimeout(400)
    chk(await p.evaluate(() => getComputedStyle(document.querySelector('.corkboard')).display === 'grid'), skin + ': 자유 배치 해제 → 격자 복귀')
  }
  console.log('CORK FREE FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })().catch((e) => { console.error(e); process.exit(2) })
