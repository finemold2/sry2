// 블록 서식 검증(Playwright): 여러 문단 선택에 문단 스타일(제목/인용) 적용 시 문단이 합쳐지지 않음, 목록이 문단 밖에 만들어지고
// 새로고침 후 빈 문단이 생기지 않으며 토글 해제됨, 제목에서 시작한 목록 보존, 들여쓰기(margin-left) 보존·해제, 줄간격 1.0 보존,
// 목록 항목의 줄간격/정렬 보존, 제목 기본 서식(굵게/크기)이 런에 박히지 않음, 제목 굵게 해제 보존, 문단 병합 시 'inherit' 글꼴 미저장,
// 중첩 목록 Ctrl+A 글꼴 적용. 실행: 미리보기 서버(4178) 띄운 뒤 node scripts/_pw_block_format.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const SKINS = (process.env.SKINS || 'classic,aurora').split(',')
;(async () => {
  const b = await chromium.launch(); let fails = 0
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
  for (const skin of SKINS) {
    console.log('--- skin:', skin)
    const p = await b.newPage(); await p.setViewportSize({ width: 1400, height: 900 })
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)))
    await p.goto('http://localhost:4178/')
    await p.evaluate((skin) => { localStorage.clear(); localStorage.setItem('sry:uiSkin', skin); localStorage.setItem('sry:tour:done', '1'); localStorage.setItem('sry:aurora:intro:2', '1') }, skin)
    await p.reload(); await p.waitForTimeout(1500)
    const seed = async (html) => { await p.evaluate((html) => { const paper = document.querySelector('.paper'); paper.innerHTML = html; paper.dispatchEvent(new Event('input', { bubbles: true })) }, html); await p.waitForTimeout(350) }
    const reload = async () => { await p.waitForTimeout(600); await p.reload(); await p.waitForTimeout(1500) }
    const html = () => p.evaluate(() => document.querySelector('.paper').innerHTML)
    const kids = () => p.evaluate(() => [...document.querySelector('.paper').children].map((e) => e.tagName + ':' + e.textContent.replace(/\s+/g, ' ').trim()))
    const selectAll = async () => { await p.locator('.paper').first().click(); await p.keyboard.press('Control+a'); await p.waitForTimeout(150) }
    const caretIn = async (sel, offset = 0) => { await p.evaluate(([sel, offset]) => { const el = document.querySelector('.paper ' + sel); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode(); const r = document.createRange(); r.setStart(t || el, t ? Math.min(offset, t.textContent.length) : 0); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.querySelector('.paper').focus() }, [sel, offset]); await p.waitForTimeout(150) }
    const selectText = async (sel) => { await p.evaluate((sel) => { const el = document.querySelector('.paper ' + sel); const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.querySelector('.paper').focus() }, sel); await p.waitForTimeout(150) }
    const click = (title) => p.locator(`.formatbar button[title="${title}"]`).click()
    const blockSel = (v) => p.selectOption('.formatbar select >> nth=0', v)
    const lineSel = (v) => p.selectOption('.formatbar select >> nth=-1', v)
    const cs = (sel, prop) => p.evaluate(([sel, prop]) => { const el = document.querySelector('.paper ' + sel); return el ? getComputedStyle(el)[prop] : null }, [sel, prop])

    // 1) 문단 스타일: 여러 문단 → 각각 h1
    await seed('<p>alpha one</p><p>beta <span style="font-family: Georgia">two</span> end</p><p>gamma three</p>')
    await selectAll(); await blockSel('h1'); await p.waitForTimeout(150)
    let k = await kids()
    chk(k.length === 3 && k.every((x) => x.startsWith('H1:')) && k[1] === 'H1:beta two end', skin + ': Ctrl+A → 제목 1: 세 문단이 각각 H1 (합쳐지지 않음) ' + JSON.stringify(k))
    await reload(); k = await kids()
    chk(k.length === 3 && k.every((x) => x.startsWith('H1:')), skin + ': 새로고침 후에도 H1 세 개 ' + JSON.stringify(k))
    chk(!/<strong>|font-size:1[0-9]pt/.test(await html()) , skin + ': 제목 기본 서식(굵게/18pt)이 런(strong/font-size span)에 박히지 않음')
    chk((await cs('h1 span', 'fontFamily')).includes('Georgia'), skin + ': 제목 안 Georgia 글꼴 보존')
    const h1Sizes = await p.evaluate(() => { const h = document.querySelector('.paper h1:nth-of-type(2)'); const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) out.push(getComputedStyle(n.parentElement).fontSize + '/' + getComputedStyle(n.parentElement).fontWeight); return out })
    chk(new Set(h1Sizes).size === 1, skin + ': 제목 안 조각들의 크기/굵기 균일 ' + JSON.stringify(h1Sizes))
    await caretIn('h1'); await blockSel('p'); await p.waitForTimeout(150)
    const pW = await cs('p', 'fontWeight'), pS = await cs('p', 'fontSize')
    await seed((await html()) + '<p>ref</p>')
    chk(parseInt(pW) < 600 && pS === (await cs('p:last-child', 'fontSize')), skin + ': 제목 → 본문 되돌리면 보통 굵기·본문 크기 ' + pW + ' ' + pS)

    // 2) 인용 여러 문단
    await seed('<p>q1</p><p>q2</p><p>q3</p>'); await selectAll(); await blockSel('blockquote'); await p.waitForTimeout(150)
    k = await kids(); chk(k.length === 3 && k.every((x) => x.startsWith('BLOCKQUOTE:')), skin + ': Ctrl+A → 인용: 세 블록 유지 ' + JSON.stringify(k))
    await reload(); k = await kids(); chk(k.length === 3 && k.every((x) => x.startsWith('BLOCKQUOTE:')), skin + ': 새로고침 후 인용 세 개 ' + JSON.stringify(k))

    // 3) 목록: 문단 밖에 생성, 새로고침 후 빈 문단 없음, 토글 해제
    await seed('<p>alpha one</p><p>beta two</p><p>gamma three</p>'); await caretIn('p:nth-of-type(2)'); await click('글머리 기호'); await p.waitForTimeout(150)
    k = await kids(); chk(JSON.stringify(k) === JSON.stringify(['P:alpha one', 'UL:beta two', 'P:gamma three']), skin + ': 캐럿 문단 → 글머리: [P, UL, P] ' + JSON.stringify(k))
    await reload(); k = await kids(); chk(JSON.stringify(k) === JSON.stringify(['P:alpha one', 'UL:beta two', 'P:gamma three']), skin + ': 새로고침 후 빈 문단 없이 [P, UL, P] ' + JSON.stringify(k))
    await caretIn('li'); await click('글머리 기호'); await p.waitForTimeout(150)
    k = await kids(); chk(k.length === 3 && !k.some((x) => x.startsWith('UL')) && k[1].endsWith('beta two'), skin + ': 목록 해제 → 문단 복귀, 빈 문단 없음 ' + JSON.stringify(k))
    await reload(); k = await kids(); chk(k.length === 3 && k[1] === 'P:beta two', skin + ': 해제 후 새로고침도 문단 3개 ' + JSON.stringify(k))
    await selectAll(); await click('글머리 기호'); await p.waitForTimeout(150)
    k = await kids(); const liN = await p.evaluate(() => document.querySelectorAll('.paper li').length)
    chk(k.length === 1 && k[0].startsWith('UL') && liN === 3, skin + ': Ctrl+A 글머리 → UL 하나, 항목 3 ' + JSON.stringify(k))
    await reload(); chk((await p.evaluate(() => document.querySelectorAll('.paper li').length)) === 3 && (await kids()).length === 1, skin + ': 새로고침 후 UL(3) 만 존재')
    await selectAll(); await click('글머리 기호'); await p.waitForTimeout(150)
    k = await kids(); chk(k.length === 3 && !k.some((x) => x.startsWith('UL')), skin + ': Ctrl+A 글머리 재클릭 → 목록 전부 해제 ' + JSON.stringify(k))

    // 4) 제목에서 시작한 목록
    await seed('<h2>Head</h2><p>para</p>'); await selectAll(); await click('글머리 기호'); await p.waitForTimeout(150)
    await reload(); const liT = await p.evaluate(() => [...document.querySelectorAll('.paper li')].map((l) => l.textContent))
    chk(JSON.stringify(liT) === JSON.stringify(['Head', 'para']), skin + ': 제목+문단 글머리 → 새로고침 후 항목 2개 보존 ' + JSON.stringify(liT))

    // 5) 들여쓰기
    await seed('<p>alpha one</p><p>beta two</p><p>gamma three</p>'); await selectAll(); await click('들여쓰기 늘리기'); await p.waitForTimeout(150)
    k = await kids(); const ml = await p.evaluate(() => [...document.querySelectorAll('.paper p')].map((e) => e.style.marginLeft))
    chk(k.length === 3 && k.every((x) => x.startsWith('P:')) && ml.every((m) => m === '40px'), skin + ': 들여쓰기 → 문단 3개 유지, margin-left 40px ' + JSON.stringify(ml))
    await reload(); k = await kids(); const ml2 = await p.evaluate(() => [...document.querySelectorAll('.paper p')].map((e) => getComputedStyle(e).marginLeft))
    chk(k.length === 3 && k.every((x) => x.startsWith('P:')) && ml2.every((m) => m === '40px'), skin + ': 새로고침 후 들여쓰기 보존(blockquote 아님) ' + JSON.stringify(ml2))
    await selectAll(); await click('들여쓰기 줄이기'); await p.waitForTimeout(150); await reload()
    const ml3 = await p.evaluate(() => [...document.querySelectorAll('.paper p')].map((e) => getComputedStyle(e).marginLeft))
    chk(ml3.every((m) => m === '0px'), skin + ': 들여쓰기 줄이기 → 새로고침 후 0 ' + JSON.stringify(ml3))
    await seed('<p>a</p><blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;"><p>b1</p><p>b2</p></blockquote><p>c</p>'); await reload()
    k = await kids(); const ital = await cs('p:nth-of-type(2)', 'fontStyle')
    chk(k.length === 4 && k.every((x) => x.startsWith('P:')) && ital === 'normal', skin + ': 옛 들여쓰기 래퍼(blockquote) 문서 → 문단 4개, 인용/기울임 아님 ' + JSON.stringify(k))

    // 6) 줄간격 1.0 보존
    await seed('<p>l1</p><p>l2</p><h2>l3</h2><blockquote>l4</blockquote><p>l5</p>'); await selectAll(); await lineSel('1'); await p.waitForTimeout(150); await reload()
    const lh = await p.evaluate(() => [...document.querySelector('.paper').children].map((e) => e.style.lineHeight))
    chk(lh.every((v) => v === '1'), skin + ': 줄간격 1.0 이 새로고침 후 유지 ' + JSON.stringify(lh))

    // 7) 목록 항목 줄간격/정렬 보존
    await seed('<p>alpha</p><ul><li>item1</li><li>item2</li></ul>'); await selectAll(); await lineSel('1.5'); await p.waitForTimeout(120); await click('가운데 정렬'); await p.waitForTimeout(150); await reload()
    const li = await p.evaluate(() => [...document.querySelectorAll('.paper li')].map((e) => e.style.lineHeight + '|' + getComputedStyle(e).textAlign))
    chk(li.length === 2 && li.every((v) => v === '1.5|center'), skin + ': 목록 항목 줄간격 1.5·가운데 정렬 보존 ' + JSON.stringify(li))

    // 8) 제목 굵게 해제 보존
    await seed('<h2>제목 둘</h2><p>본문 하나</p>'); await selectText('h2'); await click('굵게 (Ctrl+B)'); await p.waitForTimeout(150)
    const wBefore = await p.evaluate(() => { const h = document.querySelector('.paper h2'); const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); return getComputedStyle(w.nextNode().parentElement).fontWeight })
    await reload()
    const wAfter = await p.evaluate(() => { const h = document.querySelector('.paper h2'); const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); return getComputedStyle(w.nextNode().parentElement).fontWeight })
    chk(parseInt(wBefore) < 600 && parseInt(wAfter) < 600, skin + ': 제목 굵게 해제가 새로고침 후 유지 ' + wBefore + '→' + wAfter)

    // 9) 문단 병합(Backspace) 시 'inherit' 글꼴 미저장
    await seed('<p>Hello</p><p>second</p>'); await caretIn('p:nth-of-type(2)', 0); await p.keyboard.press('Backspace'); await p.waitForTimeout(600)
    const rtf = await p.evaluate(() => window.__scriv.bodyOf(window.__scriv.state().activeId))
    await reload()
    chk(!/inherit/.test(rtf) && !/inherit/.test(await html()) && (await kids())[0] === 'P:Hellosecond', skin + ': 문단 병합 후 RTF/HTML 에 inherit 글꼴 없음')

    // 10) 중첩 목록 Ctrl+A 글꼴
    await seed('<p>one</p><p>two</p><p>three</p>'); await selectAll(); await click('글머리 기호'); await p.waitForTimeout(120); await caretIn('li:nth-of-type(2)'); await click('들여쓰기 늘리기'); await p.waitForTimeout(150); await reload()
    await selectAll(); await p.selectOption('.formatbar select >> nth=1', 'Georgia'); await p.waitForTimeout(150)
    const fonts = await p.evaluate(() => { const w = document.createTreeWalker(document.querySelector('.paper'), NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) if (n.textContent.trim()) out.push(getComputedStyle(n.parentElement).fontFamily.split(',')[0].replace(/"/g, '')); return out })
    chk(fonts.length === 3 && fonts.every((f) => f === 'Georgia'), skin + ': 중첩 목록 Ctrl+A → 바깥 항목 포함 전부 Georgia ' + JSON.stringify(fonts))
    chk(errors.length === 0, skin + ': 페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 2)))
    await p.close()
  }
  console.log('BLOCK FORMAT FAILS:', fails); await b.close(); process.exit(fails ? 1 : 0)
})()
