// 텍스트 대비 감사(Playwright): 스킨(클래식/스튜디오/오로라) × 테마(다크/라이트/세피아) × 화면(뷰·서랍·도구창·모달)에서
// 보이는 모든 텍스트의 색 vs 실효 배경 대비(WCAG)를 계산해 기준 미만을 보고. 그라디언트 배경 요소는 감사기 한계로 오탐될 수 있어 육안 확인.
// 실행: vite preview --port 4178 띄운 뒤 SKINS=aurora node scripts/_pw_contrast_audit.cjs (결과 contrast/report.json)
// 대비 감사: 각 스킨×테마×화면에서 보이는 텍스트의 색 vs 실효 배경색 대비(WCAG)를 계산해 3.0 미만을 보고
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const AUDIT = `(() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r,g,b,a='1'] = m[1].split(',').map(s => parseFloat(s)); return { r, g, b, a: isNaN(a) ? 1 : a } }
  const lum = ({r,g,b}) => { const f = (v) => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) }; return .2126*f(r)+.7152*f(g)+.0722*f(b) }
  const blend = (fg, bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 })
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
  const gradAvg = (img) => { const cols = [...img.matchAll(/rgba?\\([^)]+\\)/g)].map(m => parse(m[0])).filter(Boolean); if (!cols.length) return null; const n = cols.length; const s = cols.reduce((a, c) => ({ r: a.r + c.r*c.a, g: a.g + c.g*c.a, b: a.b + c.b*c.a, w: a.w + c.a }), { r:0,g:0,b:0,w:0 }); return s.w ? { r: s.r/s.w, g: s.g/s.w, b: s.b/s.w, a: Math.min(1, s.w/n) } : null }
  const effBg = (el) => {
    let acc = null // 위로 올라가며 반투명을 합성
    const layers = []
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e); const c = parse(cs.backgroundColor)
      if (c && c.a > 0) layers.push(c)
      if (layers.length && layers[layers.length-1].a >= 1) break
    }
    acc = bodyBg
    for (let i = layers.length - 1; i >= 0; i--) acc = blend(layers[i], acc)
    return acc
  }
  const out = []; const seen = new Set()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (t.length < 2) continue
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el)
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue
    if (el.closest('.tour-bubble,[hidden],.sr-only,script,style')) continue
    let fg = parse(cs.color); if (!fg || fg.a === 0) continue
    if (cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color) { const f2 = parse(cs.webkitTextFillColor); if (f2 && f2.a === 0) continue } // 그라디언트 글자
    const bg = effBg(el); if (fg.a < 1) fg = blend(fg, bg)
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)
    const big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && parseInt(cs.fontWeight) >= 700)
    const min = big ? 3 : 4.5
    if (ratio < min) {
      const path = []; for (let e = el, i = 0; e && i < 3; e = e.parentElement, i++) path.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0,2).join('.') : ''))
      out.push({ ratio: +ratio.toFixed(2), min, text: t.slice(0, 28), path: path.join(' > '), color: cs.color, bg: 'rgb(' + [bg.r,bg.g,bg.b].map(Math.round).join(',') + ')', fs: cs.fontSize })
    }
  }
  return out.sort((a,b) => a.ratio - b.ratio)
})()`
;(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const p = await ctx.newPage()
  const skins = (process.env.SKINS || 'aurora,classic,studio').split(',')
  const report = {}
  for (const skin of skins) {
    for (const theme of ['dark', 'light', 'sepia']) {
      await p.goto('http://localhost:4178/'); await p.evaluate(({ s }) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', s); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro', '1'); localStorage.setItem('sry:theme', 'x') }, { s: skin }); await p.reload(); await p.waitForTimeout(1200)
      await p.evaluate(() => { const b = [...document.querySelectorAll('.modal button,.tour-skip')].find((x) => /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent || '')); b && b.click() })
      // 테마 맞추기
      for (let i = 0; i < 4; i++) { const cur = await p.evaluate(() => document.documentElement.getAttribute('data-theme')); if (cur === theme) break; await p.evaluate(() => { const b = document.querySelector('button[aria-label="테마 전환"], .au-ib[aria-label="테마"]'); b && b.click() }); await p.waitForTimeout(200) }
      await p.evaluate(() => { const st = window.__scriv; try { st && st.setBody && st.setBody('<p>첫 문장은 가볍게. <b>굵게</b> <i>기울임</i> 링크와 <a href="#">주석</a>이 섞인 문단입니다.</p><h2>제목 둘</h2><blockquote>인용문</blockquote>') } catch {} })
      const shots = []
      const screens = [
        ['editor', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="에디터"], .st-rail button[aria-label="에디터"], .tbtn[title^="에디터"]'); b && b.click() }) }],
        ['editor+drawers', async () => { await p.evaluate(() => { const s = window.__store || null; try { const u = document.querySelector('.au-chip[aria-label="바인더"]'); if (u && !u.classList.contains('active')) u.click(); const v = document.querySelector('.au-chip[aria-label="인스펙터"]'); if (v && !v.classList.contains('active')) v.click() } catch {} }) }],
        ['corkboard', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="코르크보드"], button[aria-label="코르크보드"], .tbtn[title^="코르크보드"]'); b && b.click() }) }],
        ['outliner', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="아웃라이너"], button[aria-label="아웃라이너"], .tbtn[title^="아웃라이너"]'); b && b.click() }) }],
        ['board', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="칸반"], button[aria-label="칸반"], .tbtn[title^="칸반"]'); b && b.click() }) }],
        ['serial', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="연재"], button[aria-label="연재"], .tbtn[title^="연재"]'); b && b.click() }) }],
        ['canvas', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="캔버스"], button[aria-label="캔버스"], .tbtn[title^="캔버스"]'); b && b.click() }) }],
        ['references', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="참고문헌"], button[aria-label="참고문헌"], .tbtn[title^="참고문헌"]'); b && b.click() }) }],
        ['argument', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="논증"], button[aria-label="논증"], .tbtn[title^="논증"]'); b && b.click() }) }],
        ['timeline', async () => { await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="타임라인"], button[aria-label="타임라인"], .tbtn[title^="타임라인"]'); b && b.click() }) }],
        ['toolwin', async () => { await p.evaluate(() => window.__openTool && window.__openTool('character-sheet')); await p.waitForTimeout(600); await p.evaluate(() => { const b = [...document.querySelectorAll('.toolwin button')].find((x) => /인물 추가/.test(x.textContent || '')); b && b.click() }) }],
        ['tool-relmap', async () => { await p.evaluate(() => { window.__closeTool && window.__closeTool('character-sheet'); window.__openTool && window.__openTool('relationship-map') }) }],
        ['tool-moodboard', async () => { await p.evaluate(() => { window.__closeTool && window.__closeTool('relationship-map'); window.__openTool && window.__openTool('moodboard-grid') }) }],
        ['tool-warmup', async () => { await p.evaluate(() => { window.__closeTool && window.__closeTool('moodboard-grid'); window.__openTool && window.__openTool('warmup-prompt') }) }],
        ['toolhub', async () => { await p.evaluate(() => { window.__closeTool && window.__closeTool('warmup-prompt'); const b = document.querySelector('.au-dock-btn[aria-label="도구 허브"], button[aria-label="도구 허브"]'); if (b) b.click(); else window.__openModal && window.__openModal('toolhub') }) }],
        ['creative', async () => { await p.keyboard.press('Escape'); await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="창작 스튜디오"], button[aria-label="창작 스튜디오"]'); if (b) b.click(); else window.__openModal && window.__openModal('creative') }) }],
        ['launcher/menu', async () => { await p.evaluate(() => { const b = document.querySelector('.au-menu-launch'); if (b) b.click(); else { const m = [...document.querySelectorAll('.menu-wrap > button, .st-menubar button')].find((x) => /파일/.test(x.textContent || '')); m && m.click() } }) }],
        ['settings', async () => { await p.keyboard.press('Escape'); await p.evaluate(() => { const b = document.querySelector('.au-dock-btn[aria-label="설정"], button[aria-label="설정"]'); if (b) b.click(); else window.__openModal && window.__openModal('settings') }) }],
        ['palette', async () => { await p.keyboard.press('Escape'); await p.evaluate(() => { const b = document.querySelector('.au-ib[aria-label="명령"], button[aria-label="명령 팔레트"], .tbtn[title^="명령"]'); b && b.click() }) }],
      ]
      for (const [name, act] of screens) {
        try { await act() } catch (e) { /* noop */ }
        await p.waitForTimeout(500)
        const res = await p.evaluate(AUDIT)
        const key = `${skin}/${theme}/${name}`; report[key] = res
        if (res.length) { await p.screenshot({ path: `contrast/${skin}-${theme}-${name.replace('/', '_')}.png` }) }
      }
      await p.keyboard.press('Escape')
    }
  }
  require('fs').mkdirSync('contrast', { recursive: true }); require('fs').writeFileSync('contrast/report.json', JSON.stringify(report, null, 1))
  let total = 0
  for (const [k, v] of Object.entries(report)) { if (!v.length) continue; total += v.length; console.log(`\n## ${k}: ${v.length}`); for (const r of v.slice(0, 12)) console.log(`  ${r.ratio} (min ${r.min}) "${r.text}" ${r.path} ${r.color} on ${r.bg} ${r.fs}`) }
  console.log('\nTOTAL low-contrast text elements:', total)
  await browser.close()
})().catch((e) => { console.error(e); process.exit(2) })
