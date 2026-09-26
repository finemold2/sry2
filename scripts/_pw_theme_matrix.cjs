// 스킨 × 테마 매트릭스: 클래식/스튜디오/오로라 각각에서 테마 버튼이 라이트→다크→세피아를 순환하고, 오로라 첫 진입은 다크로 시작,
// 새로고침 후 선택 유지, 스킨 전환 뒤에도 테마가 이어지는지 확인. 실행: vite preview --port 4178 띄운 뒤 node scripts/_pw_theme_matrix.cjs (Playwright)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } }); const p = await ctx.newPage()
  let fails = 0
  const info = async () => p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), body: getComputedStyle(document.body).backgroundColor, app: getComputedStyle(document.querySelector('.app')).backgroundImage.slice(0, 40), paper: document.querySelector('.paper') && getComputedStyle(document.querySelector('.paper')).backgroundColor, text: getComputedStyle(document.querySelector('.app')).color }))
  for (const skin of ['classic', 'studio', 'aurora']) {
    await p.goto('http://localhost:4178/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1') }, skin); await p.reload(); await p.waitForTimeout(1500)
    await p.evaluate(() => { const b = [...document.querySelectorAll('.modal button,.tour-skip')].find((x) => /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent || '')); b && b.click() })
    const seen = []
    let st = await info(); seen.push(st.attr); console.log(skin, 'initial', JSON.stringify(st))
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => { const b = document.querySelector('button[aria-label="테마 전환"], .au-ib[aria-label="테마"]'); b.click() })
      await p.waitForTimeout(350); st = await info(); seen.push(st.attr); console.log(skin, 'click', i + 1, JSON.stringify(st))
      await p.screenshot({ path: `aurora/theme-${skin}-${st.attr}.png` })
    }
    // 기대: 3번 클릭하면 light/dark/sepia 를 모두 거쳐 처음으로 돌아온다, 종이색은 테마마다 달라야 한다
    const uniq = new Set(seen.slice(0, 3)); const ok = uniq.size === 3 && seen[0] === seen[3]
    console.log(skin, ok ? 'PASS cycle' : 'FAIL cycle', [...seen].join('→')); if (!ok) fails++
  }
  // 오로라: 첫 진입은 다크로 시작해야 하고, 두 번째 진입은 사용자가 고른 테마를 유지
  await p.goto('http://localhost:4178/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sry:uiSkin', 'aurora'); localStorage.setItem('sry:tour:done', '1') }); await p.reload(); await p.waitForTimeout(1500)
  let a = await info(); console.log('aurora first entry theme:', a.attr); if (a.attr !== 'dark') fails++
  await p.evaluate(() => document.querySelector('.au-ib[aria-label="테마"]').click()); await p.waitForTimeout(300)
  a = await info(); console.log('aurora after one click:', a.attr)
  await p.reload(); await p.waitForTimeout(1500); const a2 = await info(); console.log('aurora after reload keeps:', a2.attr); if (a2.attr !== a.attr) fails++
  // 오로라 → 클래식 전환 후 테마 유지 + 토글 동작
  await p.evaluate(() => document.querySelector('.au-skin[aria-label="클래식 UI 로 전환"]').click()); await p.waitForTimeout(600)
  const c1 = await info(); await p.evaluate(() => document.querySelector('button[aria-label="테마 전환"]').click()); await p.waitForTimeout(300); const c2 = await info()
  console.log('classic after switch:', c1.attr, '→ click →', c2.attr); if (c1.attr !== a2.attr || c1.attr === c2.attr) fails++
  console.log('THEME MATRIX FAILS:', fails)
  await b.close(); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(2) })
