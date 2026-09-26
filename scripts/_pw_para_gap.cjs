// 문단 간격 검증(Playwright): Enter 로 나눈 단락 간 거리 == 자동 줄바꿈 줄 높이(기본 문단 간격 0). 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_para_gap.cjs
// Enter 로 나눈 두 단락의 줄 간격 == 한 단락 안에서 자동 줄바꿈된 줄 간격
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1300, height: 800 }); let fails = 0
  for (const skin of ['classic', 'aurora']) {
    await p.goto('http://localhost:4178/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1') }, skin); await p.reload(); await p.waitForTimeout(1500)
    const r = await p.evaluate(() => {
      const paper = document.querySelector('.paper'); paper.innerHTML = '<p>' + '가나다라마바사 아자차카타파하 '.repeat(30) + '</p><p>둘째 단락</p><p>셋째 단락</p>'
      const ps = [...paper.querySelectorAll('p')]
      const rects = ps.map((e) => e.getBoundingClientRect())
      const lineH = parseFloat(getComputedStyle(ps[0]).lineHeight) || (rects[0].height / Math.round(rects[0].height / parseFloat(getComputedStyle(ps[0]).fontSize)))
      const lines = Math.round(rects[0].height / lineH)
      return { wrappedLine: +(rects[0].height / lines).toFixed(2), enterGap: +(rects[2].top - rects[1].top).toFixed(2), gap: getComputedStyle(ps[0]).marginBottom }
    })
    const ok = Math.abs(r.wrappedLine - r.enterGap) < 0.6
    console.log((ok ? 'PASS ' : 'FAIL ') + skin + ': 자동 줄바꿈 줄 높이 ' + r.wrappedLine + 'px vs Enter 단락 간 거리 ' + r.enterGap + 'px (margin ' + r.gap + ')'); if (!ok) fails++
  }
  console.log('PARA GAP FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
