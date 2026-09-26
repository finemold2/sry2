// 줄간격 검증(Playwright): 기본 줄간격 1.7배, Enter 단락 간 거리 == 자동 줄바꿈 줄 높이, 옛 프리셋(0.7em/1.0) 저장 프로젝트의 이관. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_line_height.cjs
// 줄간격 1.7 기본 + Enter/자동 줄바꿈 동일 + 옛 프리셋(0.7/1.0) 저장 프로젝트 이관
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1300, height: 800 }); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  await p.goto('http://localhost:4178/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sry:uiSkin', 'aurora'); localStorage.setItem('sry:tour:done', '1') }); await p.reload(); await p.waitForTimeout(1500)
  const measure = () => p.evaluate(() => { const paper = document.querySelector('.paper'); paper.innerHTML = '<p>' + '가나다라마바사 아자차카타파하 '.repeat(30) + '</p><p>둘째</p><p>셋째</p>'; const ps = [...paper.querySelectorAll('p')]; const r = ps.map((e) => e.getBoundingClientRect()); const cs = getComputedStyle(ps[0]); const lh = parseFloat(cs.lineHeight); const lines = Math.round(r[0].height / lh); return { lh: +(lh / parseFloat(cs.fontSize)).toFixed(2), wrapped: +(r[0].height / lines).toFixed(2), enter: +(r[2].top - r[1].top).toFixed(2) } })
  let m = await measure(); chk(m.lh === 1.7 && Math.abs(m.wrapped - m.enter) < 0.6, '기본: 줄간격 1.7배, 자동 줄바꿈 ' + m.wrapped + 'px = Enter ' + m.enter + 'px')
  // 옛 프리셋 값이 저장된 프로젝트 시뮬레이션: 설정 모달의 기본 프리셋은 이제 0/1.7 이므로 직접 store 에 옛 값 주입 후 재로드
  await p.evaluate(() => { const s = window.__scriv; })
  const migrated = await p.evaluate(async () => { const req = indexedDB.open('sry'); const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej }); const tx = db.transaction('projects', 'readwrite'); const st = tx.objectStore('projects'); const all = await new Promise((res) => { const g = st.getAll(); g.onsuccess = () => res(g.result) }); if (!all.length) return 'no-project'; const pr = all[0]; pr.settings.editorParaGap = 0.7; pr.settings.editorLineHeight = 1.0; st.put(pr); await new Promise((res) => { tx.oncomplete = res }); return 'seeded' })
  console.log('  seed:', migrated); await p.reload(); await p.waitForTimeout(1500)
  m = await measure(); chk(m.lh === 1.7 && Math.abs(m.wrapped - m.enter) < 0.6, '옛 프리셋(0.7/1.0) 저장 프로젝트 → 이관되어 1.7배 · 간격 동일 ' + JSON.stringify(m))
  console.log('PARA GAP2 FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0) })()
