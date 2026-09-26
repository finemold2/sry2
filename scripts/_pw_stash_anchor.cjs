// 수집함 모서리 앵커 검증(Playwright): 큰 모니터(2560×1440)에서 오른쪽 아래에 둔 아이콘이 새로고침 없이 작은 모니터(1366×768)/작은 창으로 옮겨도
// 같은 구석에 보이고, 복귀·새로고침·옛 저장 형식·왼쪽 위 앵커까지 확인. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_stash_anchor.cjs
// 큰 모니터(2560×1440)에서 오른쪽 아래에 둔 수집함 → 창을 작은 모니터(1366×768)로 옮김(리사이즈 이벤트) → 같은 구석에 보여야 한다.
// 옛 저장 형식({x,y}만)도 화면 안으로 들어와야 한다.
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  const rect = () => p.evaluate(() => { const e = document.querySelector('.stash-icon-wrap'); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom), inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight } })
  await p.setViewportSize({ width: 2560, height: 1440 })
  await p.goto('http://localhost:4178/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sry:uiSkin', 'aurora'); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:stash:coached', '1'); localStorage.setItem('sry:stash:pos', JSON.stringify({ x: 100, y: 100 })) }); await p.reload(); await p.waitForTimeout(1200)
  // (왼쪽 위에서 시작해) 오른쪽 아래 구석으로 드래그
  const r0 = await rect(); await p.mouse.move(r0.l + 26, r0.t + 26); await p.mouse.down(); await p.mouse.move(2560 - 60, 1440 - 90, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(200)
  const big = await rect(); const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('sry:stash:pos'))); console.log('  dbg r0', JSON.stringify(r0), 'big', JSON.stringify(big), 'win', await p.evaluate(() => !!document.querySelector('.stash-win')), 'saved', JSON.stringify(saved)); if (!big) { console.log('FAIL icon missing after drag'); process.exit(1) }
  chk(big.inView && saved.ax === 'right' && saved.ay === 'bottom', '큰 모니터에서 오른쪽 아래로 드래그 → 오른쪽/아래 앵커로 저장 ' + JSON.stringify({ big, saved }))
  // 작은 모니터로 이동(리사이즈만, 새로고침 없음)
  await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(400)
  const small = await rect()
  chk(small && small.inView, '작은 모니터: 새로고침 없이 화면 안 ' + JSON.stringify(small))
  chk(small && Math.abs(small.r - big.r) <= 2 && Math.abs(small.b - big.b) <= 2, '같은 구석(오른쪽/아래 거리 유지)')
  // 더 작은 창
  await p.setViewportSize({ width: 900, height: 500 }); await p.waitForTimeout(400)
  const tiny = await rect(); chk(tiny && tiny.inView, '900×500: 화면 안 ' + JSON.stringify(tiny))
  // 다시 큰 모니터로
  await p.setViewportSize({ width: 2560, height: 1440 }); await p.waitForTimeout(400)
  const back = await rect(); chk(back && Math.abs(back.r - big.r) <= 2 && Math.abs(back.b - big.b) <= 2, '큰 모니터 복귀: 원래 구석 위치')
  // 새로고침 후에도 유지
  await p.setViewportSize({ width: 1366, height: 768 }); await p.reload(); await p.waitForTimeout(1200)
  const rl = await rect(); chk(rl && rl.inView && Math.abs(rl.r - big.r) <= 2, '작은 모니터에서 새로고침 후에도 같은 구석')
  // 옛 저장 형식(절대 좌표만) 호환
  await p.evaluate(() => localStorage.setItem('sry:stash:pos', JSON.stringify({ x: 2400, y: 1300 }))); await p.reload(); await p.waitForTimeout(1200)
  const legacy = await rect(); chk(legacy && legacy.inView, '옛 형식 {x,y} 저장값도 화면 안 ' + JSON.stringify(legacy))
  // 왼쪽 위에 두면 왼쪽/위 앵커
  const r1 = await rect(); await p.mouse.move(r1.l + 26, r1.t + 26); await p.mouse.down(); await p.mouse.move(80, 120, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(200)
  const s2 = await p.evaluate(() => JSON.parse(localStorage.getItem('sry:stash:pos'))); const tl = await rect()
  await p.setViewportSize({ width: 2560, height: 1440 }); await p.waitForTimeout(400); const tl2 = await rect()
  chk(s2.ax === 'left' && s2.ay === 'top' && tl2.l === tl.l && tl2.t === tl.t, '왼쪽 위에 두면 왼쪽/위 기준으로 고정 ' + JSON.stringify(s2))
  console.log('STASH ANCHOR FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
