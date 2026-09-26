// 오로라 테마 UI 검증(Playwright): 우상단 라이트/다크/세피아 세그먼트, 레일 순환 버튼과 동기화, 런처 보기 메뉴 '테마 전환' 타일,
// 스킨 재진입 코치가 실제 대상(독·오브·테마·스위처)을 가리키고 4단계 후 닫힘, 레일 테마 버튼이 가려지지 않음. 실행: vite preview --port 4178 띄운 뒤 node scripts/_pw_theme_ui.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1500, height: 900 }); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  const attr = () => p.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await p.goto('http://localhost:4178/'); await p.evaluate(() => localStorage.clear()); await p.goto('http://localhost:4178/?skin=aurora'); await p.waitForTimeout(1500)
  await p.evaluate(() => { const b = [...document.querySelectorAll('.modal button,.tour-skip')].find((x) => /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent || '')); b && b.click() }); await p.waitForTimeout(300)
  chk(await p.evaluate(() => !!document.querySelector('.au-themes') && document.querySelectorAll('.au-theme').length === 3), '오로라 우상단에 라이트/다크/세피아 세그먼트 3개')
  chk(await p.evaluate(() => document.querySelector('.au-theme[aria-label="다크 테마"]').getAttribute('aria-pressed') === 'true'), '첫 진입 다크가 활성으로 표시')
  await p.evaluate(() => document.querySelector('.au-theme[aria-label="라이트 테마"]').click()); await p.waitForTimeout(300)
  chk((await attr()) === 'light', '라이트 클릭 → data-theme=light')
  await p.evaluate(() => document.querySelector('.au-theme[aria-label="세피아 테마"]').click()); await p.waitForTimeout(300)
  chk((await attr()) === 'sepia' && await p.evaluate(() => document.querySelector('.au-theme[aria-label="세피아 테마"]').getAttribute('aria-pressed') === 'true'), '세피아 클릭 → sepia + 활성 표시')
  await p.evaluate(() => document.querySelector('.au-ib[aria-label="테마"]').click()); await p.waitForTimeout(300)
  chk((await attr()) === 'light' && await p.evaluate(() => document.querySelector('.au-theme[aria-label="라이트 테마"]').getAttribute('aria-pressed') === 'true'), '레일 순환 버튼도 세그먼트와 동기화(sepia→light)')
  // 런처 보기 메뉴에 테마 전환 항목
  await p.evaluate(() => document.querySelector('.au-menu-launch').click()); await p.waitForTimeout(400)
  const tile = await p.evaluate(() => { const t = [...document.querySelectorAll('.au-tile')].find((x) => /테마 전환/.test(x.textContent || '')); if (!t) return false; t.click(); return true })
  await p.waitForTimeout(300); chk(tile && (await attr()) === 'dark', '런처 보기 메뉴 "테마 전환" 타일 존재 + 실행(light→dark)')
  await p.keyboard.press('Escape')
  // 클래식 갔다 오면 오로라 코치가 실제 존재하는 대상(독/오브/테마/스위처)을 가리킴
  await p.evaluate(() => document.querySelector('.au-skin[aria-label="클래식 UI 로 전환"]').click()); await p.waitForTimeout(500)
  await p.evaluate(() => { const b = document.querySelector('.tour-skip'); b && b.click() }); await p.waitForTimeout(200)
  await p.evaluate(() => document.querySelector('button[aria-label="Aurora UI 로 전환"]').click()); await p.waitForTimeout(600)
  const coach = await p.evaluate(() => ({ bubble: !!document.querySelector('.tour-bubble'), spot: !!document.querySelector('.tour-spotlight'), title: (document.querySelector('.tour-title') || {}).textContent || '' }))
  chk(coach.bubble && coach.spot && /독/.test(coach.title), '오로라 재진입 코치: 스포트라이트가 실제 대상(독)을 가리킴 ' + JSON.stringify(coach))
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { const b = [...document.querySelectorAll('.tour-btn.primary')].pop(); b && b.click() }); await p.waitForTimeout(250) }
  chk(await p.evaluate(() => !document.querySelector('.tour-bubble')), '코치 4단계 모두 확인 후 닫힘')
  chk(await p.evaluate(() => { const e = document.querySelector('.au-ib[aria-label="테마"]'); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + 27, r.top + 27); return e.contains(t) || t === e }), '재진입 후 레일 테마 버튼이 가려지지 않음')
  await p.screenshot({ path: 'contrast/theme-ui.png' })
  console.log('THEME UI FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
