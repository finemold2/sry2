// 집중 모드(현재 창) 검증(Playwright): 스킨(클래식/스튜디오/오로라) × 테마(라이트/다크/세피아)에서 집중 화면이 편집기를 완전히 덮고,
// 집중 종이에 편집기 종이 카드(배경/테두리/그림자)가 새지 않으며 글자색이 어두운 배경 위에서 밝게 보이고, 입력이 저장되는지.
// 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_focus_mode.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const SKINS = ['classic', 'studio', 'aurora']
const THEMES = ['light', 'dark', 'sepia']
const lum = (rgb) => { const m = rgb.match(/\d+/g) || [0, 0, 0]; const [r, g, bl] = m.slice(0, 3).map((n) => { const c = n / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
;(async () => {
  const b = await chromium.launch(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  for (const skin of SKINS) for (const theme of THEMES) {
    const tag = `${skin}/${theme}`
    const p = await b.newPage(); await p.setViewportSize({ width: 1400, height: 900 })
    await p.goto('http://localhost:4178/')
    await p.evaluate(([skin, theme]) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', skin); localStorage.setItem('sry:theme', theme); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1') }, [skin, theme])
    await p.reload(); await p.waitForTimeout(1500)
    await p.evaluate(() => { const paper = document.querySelector('.paper'); if (paper) { paper.innerHTML = '<p>집중 모드 본문 테스트</p>'; paper.dispatchEvent(new Event('input', { bubbles: true })) } })
    await p.waitForTimeout(400)
    await p.locator('.paper').first().click()
    await p.keyboard.press('Control+Shift+Enter'); await p.waitForTimeout(300)
    if (!(await p.locator('.focus-opt').count())) { const btn = p.locator('[title="집중 모드"], [aria-label="집중 모드"]').first(); if (await btn.count()) await btn.click({ force: true }); await p.waitForTimeout(300) }
    chk(await p.locator('.focus-opt').count() > 0, tag + ': 집중 모드 방식 선택창 표시')
    await p.locator('.focus-opt').first().click(); await p.waitForTimeout(400)
    const r = await p.evaluate(() => {
      const comp = document.querySelector('.composition'); const paper = document.querySelector('.composition .comp-paper')
      if (!comp || !paper) return null
      const cs = getComputedStyle(paper); const cc = getComputedStyle(comp)
      const pts = [[700, 450], [60, 300], [1340, 300], [700, 60], [300, 700]]
      const covered = pts.every(([x, y]) => { const el = document.elementFromPoint(x, y); return !!(el && el.closest('.composition')) })
      const rect = paper.getBoundingClientRect()
      const ed = document.querySelector('.editor-scroll .paper, .au-stage-body .paper')
      const edVisible = ed ? (() => { const r2 = ed.getBoundingClientRect(); const el = document.elementFromPoint(r2.left + r2.width / 2, Math.min(r2.top + 30, 880)); return !!(el && el.closest('.editor-scroll, .au-stage-body')) })() : false
      return { bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopStyle, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, pad: cs.paddingLeft + ' ' + cs.paddingTop, compBg: cc.backgroundColor, covered, edVisible, w: rect.width, theme: document.documentElement.getAttribute('data-theme') }
    })
    chk(!!r, tag + ': 집중 화면(.composition) 표시')
    if (r) {
      chk(r.covered && !r.edVisible, tag + ': 집중 화면이 편집기 전체를 덮음(편집기 종이가 비치지 않음)')
      chk(r.bg === 'rgba(0, 0, 0, 0)' || r.bg === 'transparent', tag + ': 집중 종이 배경 투명(편집기 배경 칸 없음) bg=' + r.bg)
      chk(r.border.startsWith('0px') || r.border.endsWith('none'), tag + ': 집중 종이 테두리 없음 ' + r.border)
      chk(r.shadow === 'none', tag + ': 집중 종이 그림자 없음')
      chk(lum(r.compBg) < 0.08 && lum(r.color) > 0.6, tag + ': 어두운 배경(' + r.compBg + ') 위 밝은 글자(' + r.color + ')')
      chk(r.pad === '30px 0px', tag + ': 집중 종이 여백은 집중 모드 기본(0 30px) pad=' + r.pad)
    }
    // 입력 → 저장 확인, Esc 로 종료
    await p.locator('.composition .comp-paper').click(); await p.keyboard.press('End'); await p.keyboard.type(' ZZQQ'); await p.waitForTimeout(500)
    const saved = await p.evaluate(() => { const st = window.__scriv.state(); return window.__scriv.bodyOf(st.activeId) })
    chk(/ZZQQ/.test(saved), tag + ': 집중 모드 입력이 저장됨(RTF 에 ZZQQ)')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    chk((await p.locator('.composition').count()) === 0, tag + ': Esc 로 집중 모드 종료')
    await p.close()
  }
  // 긴 문서: 마지막 줄이 하단 바 위로 스크롤되어 보임 / 좁은 창에서 하단 바 항목이 바 안에 머묾
  for (const [skin, theme, w, h] of [['classic', 'light', 1400, 900], ['aurora', 'dark', 1400, 900], ['studio', 'dark', 600, 800], ['aurora', 'light', 600, 800]]) {
    const tag = `${skin}/${theme}@${w}x${h}`
    const p = await b.newPage(); await p.setViewportSize({ width: w, height: h })
    await p.goto('http://localhost:4178/')
    await p.evaluate(([skin, theme]) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', skin); localStorage.setItem('sry:theme', theme); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1') }, [skin, theme])
    await p.reload(); await p.waitForTimeout(1500)
    await p.evaluate(() => { const paper = document.querySelector('.paper'); paper.innerHTML = Array.from({ length: 40 }, (_, i) => `<p>line ${i + 1} lorem ipsum dolor sit amet</p>`).join(''); paper.dispatchEvent(new Event('input', { bubbles: true })) }); await p.waitForTimeout(400)
    await p.locator('.paper').first().click(); await p.keyboard.press('Control+Shift+Enter'); await p.waitForTimeout(300)
    if (!(await p.locator('.focus-opt').count())) { const btn = p.locator('[title="집중 모드"], [aria-label="집중 모드"]').first(); if (await btn.count()) await btn.click({ force: true }); await p.waitForTimeout(300) }
    await p.locator('.focus-opt').first().click(); await p.waitForTimeout(400)
    const r = await p.evaluate(() => { const comp = document.querySelector('.composition'); comp.scrollTop = 1e9; const ps = document.querySelectorAll('.comp-paper p'); const last = ps[ps.length - 1].getBoundingClientRect(); const bar = document.querySelector('.comp-bar').getBoundingClientRect(); const el = document.elementFromPoint(last.left + 10, last.top + last.height / 2); const items = [...document.querySelector('.comp-bar').children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => { const q = c.getBoundingClientRect(); return { tag: c.tagName, inside: q.right <= bar.right + 1 && q.bottom <= bar.bottom + 1 && q.top >= bar.top - 1, w: q.width } }); return { lastBottom: last.bottom, barTop: bar.top, onLine: el && el.closest('.comp-paper') ? el.tagName : el && el.tagName, items, barH: bar.height } })
    chk(r.lastBottom <= r.barTop && /P|SPAN|DIV/.test(r.onLine || ''), tag + ': 끝까지 스크롤하면 마지막 줄이 하단 바 위에 보임 ' + JSON.stringify({ lastBottom: r.lastBottom, barTop: r.barTop, onLine: r.onLine }))
    chk(r.items.every((i) => i.inside) && r.items.some((i) => i.tag === 'BUTTON'), tag + ': 하단 바 항목이 모두 바 안에 있음(나가기 버튼 포함) ' + JSON.stringify(r.items.map((i) => i.tag + (i.inside ? '' : '!'))))
    await p.close()
  }
  console.log('FOCUS MODE FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0)
})()
