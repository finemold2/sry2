// 서식바 글꼴/크기 검증(Playwright): Ctrl+A 전체 선택 적용, 부분 선택 후 범위를 넓히거나 좁혀 재적용, 여러 문단에 걸친 선택,
// 중첩 span 에 옛 값이 남지 않음, 새로고침(RTF 왕복) 후 보존. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_editor_format.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const SKINS = (process.env.SKINS || 'aurora,classic,studio').split(',')
const PT = (pt) => Math.round((pt * 96) / 72) + 'px'
;(async () => {
  const b = await chromium.launch(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  for (const skin of SKINS) {
    console.log('--- skin:', skin)
    const p = await b.newPage(); await p.setViewportSize({ width: 1400, height: 900 })
    await p.goto('http://localhost:4178/')
    await p.evaluate((skin) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', skin); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1') }, skin)
    await p.reload(); await p.waitForTimeout(1500)
    if (!(await p.locator('.paper').count())) { console.log('  (no paper — selecting first text doc)'); await p.evaluate(() => { const e = window.__scriv.entries().find((i) => i.type === 'text'); if (e) window.__openTool && 0; }) }
    chk(await p.locator('.paper').count() > 0, skin + ': 본문 편집기(.paper) 표시')
    // 본문 심기 — 3문단
    await p.evaluate(() => {
      const paper = document.querySelector('.paper')
      paper.innerHTML = '<p>첫째 문단 가나다라마바사</p><p>둘째 문단 아자차카타파하</p><p>셋째 문단 ABCDEFGHIJ</p>'
      paper.dispatchEvent(new Event('input', { bubbles: true }))
      // 테스트 헬퍼
      const walkText = (block) => { const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) out.push(n); return out }
      const posAt = (pi, off) => { const ps = paper.querySelectorAll('p'); const ts = walkText(ps[pi]); let acc = 0; for (const t of ts) { const len = t.textContent.length; if (off <= acc + len) return { node: t, off: off - acc }; acc += len } const last = ts[ts.length - 1]; return { node: last, off: last.textContent.length } }
      window.__t = {
        sel: (p1, o1, p2, o2) => { const a = posAt(p1, o1), z = posAt(p2, o2); const r = document.createRange(); r.setStart(a.node, a.off); r.setEnd(z.node, z.off); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); paper.focus() },
        at: (pi, ch) => { const { node } = posAt(pi, ch + 1); const cs = getComputedStyle(node.parentElement); return { font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: cs.fontSize } },
        allChars: (pi) => { const ps = paper.querySelectorAll('p'); return ps[pi].textContent.length },
        // 같은 속성·같은 값이 조상에 또 걸린(의미 없는) 중첩 — 새 값이 안쪽에 들어가는 정상 중첩은 세지 않는다.
        nestedDup: () => { let n = 0; for (const prop of ['font-size', 'font-family']) paper.querySelectorAll('[style]').forEach((el) => { const v = el.style.getPropertyValue(prop); if (!v) return; let a = el.parentElement; while (a && a !== paper) { if (a.style && a.style.getPropertyValue(prop) === v) { n++; break } a = a.parentElement } }); return n },
        spans: (pi) => paper.querySelectorAll('p')[pi].querySelectorAll('span').length,
        // 같은 속성이 조상에도 걸린 중첩(값 무관) — 경계 쪼개기 방식에서는 0 이어야 한다(평평한 DOM).
        nestedAny: () => { let n = 0; for (const prop of ['font-size', 'font-family']) paper.querySelectorAll('[style]').forEach((el) => { if (!el.style.getPropertyValue(prop)) return; let a = el.parentElement; while (a && a !== paper) { if (a.style && a.style.getPropertyValue(prop)) { n++; break } a = a.parentElement } }); return n },
        selVal: (i) => { const s = document.querySelectorAll('.formatbar select')[i]; return { value: s.value, label: s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent } },
        html: () => paper.innerHTML,
      }
    })
    await p.waitForTimeout(400)
    const font = (v) => p.selectOption('.formatbar select >> nth=1', v)
    const size = (v) => p.selectOption('.formatbar select >> nth=2', v)
    const at = (pi, ch) => p.evaluate(([pi, ch]) => window.__t.at(pi, ch), [pi, ch])
    const allOf = async (pi, pred) => { const n = await p.evaluate((pi) => window.__t.allChars(pi), pi); for (let i = 0; i < n; i++) { if (!pred(await at(pi, i))) return false } return true }
    const sel = (p1, o1, p2, o2) => p.evaluate(([a, b, c, d]) => window.__t.sel(a, b, c, d), [p1, o1, p2, o2]).then(() => p.waitForTimeout(120))

    // 1) Ctrl+A 전체 선택 → 글꼴/크기
    await p.locator('.paper').first().click(); await p.keyboard.press('Control+a'); await p.waitForTimeout(150)
    await font('Georgia'); await p.waitForTimeout(100)
    let ok = true; for (const pi of [0, 1, 2]) ok = ok && (await allOf(pi, (v) => v.font === 'Georgia'))
    chk(ok, skin + ': Ctrl+A 후 글꼴 Georgia 가 세 문단 전체에 적용')
    await size('24'); await p.waitForTimeout(100)
    ok = true; for (const pi of [0, 1, 2]) ok = ok && (await allOf(pi, (v) => v.size === PT(24)))
    chk(ok, skin + ': Ctrl+A 선택이 유지되어 이어서 고른 크기 24pt 가 전체에 적용')

    // 2) 부분 선택 → 넓혀서 재적용 → 좁혀서 재적용
    await sel(0, 2, 0, 5); await size('18'); await p.waitForTimeout(100)
    chk((await at(0, 2)).size === PT(18) && (await at(0, 4)).size === PT(18) && (await at(0, 1)).size === PT(24) && (await at(0, 5)).size === PT(24), skin + ': 부분 선택(2~5) 크기 18pt — 범위 안만 바뀜')
    await sel(0, 0, 0, 8); await size('30'); await p.waitForTimeout(100)
    ok = true; for (let i = 0; i < 8; i++) ok = ok && (await at(0, i)).size === PT(30)
    chk(ok && (await at(0, 8)).size === PT(24), skin + ': 이미 바뀐 부분을 포함해 범위를 넓혀(0~8) 30pt — 옛 18pt 가 남지 않고 전부 30pt')
    await sel(0, 3, 0, 5); await font('Courier New'); await p.waitForTimeout(100)
    chk((await at(0, 3)).font === 'Courier New' && (await at(0, 4)).font === 'Courier New' && (await at(0, 2)).font === 'Georgia' && (await at(0, 5)).font === 'Georgia' && (await at(0, 3)).size === PT(30), skin + ': 범위를 좁혀(3~5) 글꼴 Courier New — 그 부분만 바뀌고 크기 30pt 는 유지')
    await size('12'); await p.waitForTimeout(100)
    chk((await at(0, 3)).size === PT(12) && (await at(0, 4)).size === PT(12) && (await at(0, 2)).size === PT(30), skin + ': 같은 선택에 이어서 12pt — 좁힌 범위만 12pt')

    // 3) 여러 문단에 걸친 부분 선택
    await sel(1, 3, 2, 3); await font('Arial'); await p.waitForTimeout(100)
    chk((await at(1, 3)).font === 'Arial' && (await at(1, 2)).font === 'Georgia' && (await at(2, 2)).font === 'Arial' && (await at(2, 3)).font === 'Georgia', skin + ': 둘째 문단 중간~셋째 문단 중간 선택에 Arial — 두 문단 모두 범위만 바뀜')
    chk((await p.evaluate(() => window.__t.nestedDup())) === 0, skin + ': 같은 속성·같은 값이 겹쳐 중첩된 span 없음')
    chk((await p.evaluate(() => window.__t.nestedAny())) === 0, skin + ': 글꼴/크기 span 이 서로 중첩되지 않음(평평한 DOM)')
    // 같은 범위에 반복 적용해도 DOM 이 계속 깊어지지 않음
    const before = await p.evaluate(() => window.__t.spans(0))
    for (let i = 0; i < 6; i++) { await sel(0, 0, 0, 8); await size(i % 2 ? '18' : '30'); await p.waitForTimeout(60) }
    const after = await p.evaluate(() => window.__t.spans(0))
    chk(after <= before + 1, skin + ': 같은 범위에 6번 반복 적용해도 span 수가 늘지 않음 ' + before + ' → ' + after)
    ok = true; for (let i = 0; i < 8; i++) ok = ok && (await at(0, i)).size === PT(18)
    chk(ok, skin + ': 반복 적용 마지막 값(18pt)이 범위 전체에 반영')
    await sel(0, 0, 0, 8); await size('30'); await p.waitForTimeout(80)
    // 섞인 선택(Ctrl+A)에서는 셀렉트가 '(혼합)' 빈 값 — 이미 떠 있는 값을 다시 골라도 change 가 나도록
    await p.locator('.paper').first().click(); await p.keyboard.press('Control+a'); await p.waitForTimeout(200)
    const sv1 = await p.evaluate(() => window.__t.selVal(1)), sv2 = await p.evaluate(() => window.__t.selVal(2))
    chk(sv1.value === '' && sv1.label === '(혼합)' && sv2.value === '' && sv2.label === '(혼합)', skin + ': Ctrl+A(섞인 서식)에서 글꼴/크기 셀렉트가 (혼합) 표시 ' + JSON.stringify([sv1, sv2]))
    await sel(0, 0, 0, 2); await p.waitForTimeout(200)
    const sv3 = await p.evaluate(() => window.__t.selVal(1)), sv4 = await p.evaluate(() => window.__t.selVal(2))
    chk(sv3.value === 'Georgia' && sv4.value === '30', skin + ': 균일한 선택(0~2)에서는 실제 값(Georgia/30) 표시 ' + JSON.stringify([sv3, sv4]))
    chk(!(await p.evaluate(() => document.body.innerText.includes('한 문단 안의 선택에만'))), skin + ': "한 문단 안의 선택에만" 거부 메시지가 뜨지 않음')

    // 3b) 되돌리기: 글꼴 적용이 Ctrl+Z 로 풀리고, 그 전에 친 글도 계속 되돌릴 수 있음
    await p.evaluate(() => { const paper = document.querySelector('.paper'); paper.innerHTML = '<p>undo me please</p>'; paper.dispatchEvent(new Event('input', { bubbles: true })) }); await p.waitForTimeout(300)
    await p.evaluate(() => { const paper = document.querySelector('.paper'); const t = paper.querySelector('p').firstChild; const r = document.createRange(); r.setStart(t, t.length); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); paper.focus() })
    await p.keyboard.type(' typed'); await p.waitForTimeout(100)
    await sel(0, 5, 0, 14); await font('Georgia'); await p.waitForTimeout(150)
    const u0 = await p.evaluate(() => window.__t.html())
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150); const u1 = await p.evaluate(() => window.__t.html())
    await p.keyboard.press('Control+z'); await p.waitForTimeout(150); const u2 = await p.evaluate(() => document.querySelector('.paper').textContent)
    chk(/Georgia/.test(u0) && !/Georgia/.test(u1) && u2 === 'undo me please', skin + ': Ctrl+Z 로 글꼴 적용이 풀리고 이전 타이핑도 되돌려짐 ' + JSON.stringify({ u1, u2 }))
    // 3c) .paper 직속 맨 텍스트 + 중첩 목록 바깥 항목도 적용
    await p.evaluate(() => { const paper = document.querySelector('.paper'); paper.innerHTML = 'bare text<p>para</p><ul><li>level one<ul><li>level two</li></ul></li><li>another</li></ul>'; paper.dispatchEvent(new Event('input', { bubbles: true })) }); await p.waitForTimeout(300)
    await p.locator('.paper').first().click(); await p.keyboard.press('Control+a'); await p.waitForTimeout(150); await size('18'); await p.waitForTimeout(150)
    const sizes = await p.evaluate(() => { const w = document.createTreeWalker(document.querySelector('.paper'), NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) if (n.textContent.trim()) out.push(n.textContent.trim() + '=' + getComputedStyle(n.parentElement).fontSize); return out })
    chk(sizes.length === 5 && sizes.every((x) => x.endsWith('=' + PT(18))), skin + ': 맨 텍스트·중첩 목록 바깥 항목 포함 전부 18pt ' + JSON.stringify(sizes))
    // 원래 3문단으로 복구(이후 새로고침 검증용 상태 재구성)
    await p.evaluate(() => { const paper = document.querySelector('.paper'); paper.innerHTML = '<p><span style="font-size: 30pt;"><span style="font-family: Georgia;">첫째 </span><span style="font-family: &quot;Courier New&quot;;">문단</span><span style="font-family: Georgia;"> 가나</span></span><span style="font-family: Georgia; font-size: 24pt;">다라마바사</span></p><p><span style="font-family: Georgia; font-size: 24pt;">둘째 </span><span style="font-family: Arial; font-size: 24pt;">문단 아자차카타파하</span></p><p><span style="font-family: Arial; font-size: 24pt;">셋째</span><span style="font-family: Georgia; font-size: 24pt;"> 문단 ABCDEFGHIJ</span></p>'; paper.dispatchEvent(new Event('input', { bubbles: true })) }); await p.waitForTimeout(300)

    // 4) 새로고침(RTF 왕복) 후 보존
    await p.waitForTimeout(600); await p.reload(); await p.waitForTimeout(1500)
    await p.evaluate(() => {
      const paper = document.querySelector('.paper')
      const walkText = (block) => { const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) out.push(n); return out }
      const posAt = (pi, off) => { const ps = paper.querySelectorAll('p'); const ts = walkText(ps[pi]); let acc = 0; for (const t of ts) { const len = t.textContent.length; if (off <= acc + len) return { node: t, off: off - acc }; acc += len } const last = ts[ts.length - 1]; return { node: last, off: last.textContent.length } }
      window.__t = { at: (pi, ch) => { const { node } = posAt(pi, ch + 1); const cs = getComputedStyle(node.parentElement); return { font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: cs.fontSize } } }
    })
    const a0 = await at(0, 0), a3 = await at(0, 3), a9 = await at(0, 9), b5 = await at(1, 5), c6 = await at(2, 6)
    chk(a0.font === 'Georgia' && a0.size === PT(30) && a3.font === 'Courier New' && a3.size === PT(30) && a9.size === PT(24) && b5.font === 'Arial' && c6.font === 'Georgia' && c6.size === PT(24), skin + ': 새로고침 후에도 글꼴/크기 보존 ' + JSON.stringify({ a0, a3, a9, b5, c6 }))
    await p.close()
  }
  console.log('EDITOR FORMAT FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0)
})()
