// 도구 실동작(생성/뽑기/굴리기) 표본 검증 — 카테고리별 대표 결정론 생성기 ~40종을
// window.__openTool 로 실제로 열고, 도구창 .toolwin-body 안의 '주요 액션 버튼'(생성/뽑기/굴리기/만들기 등)을
// 진짜로 클릭해, 출력 영역 텍스트가 바뀌거나 항목(.toolwin-body 자식 노드)이 늘어나는지(=동작 발생) +
// 무크래시·예외0 을 확인한다. 버튼을 못 찾은 도구는 렌더만 확인하고 skipped 로 집계.
// 코드리뷰가 아니라 '효과'를 본다: innerText 델타 또는 DOM 노드 수 델타가 실제로 발생해야 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// ── 검증 대상: 카테고리별 대표 결정론 생성기(클릭 한 번에 산출물이 바뀌는 종류) ──
// 작명/캐릭터/플롯/장소/주사위/딜레마/이름/세계관 등 골고루.
const TOOL_IDS = [
  // 작명/이름
  'name-mixer', 'place-name-forge', 'name-by-meaning', 'title-forge', 'chapter-title-gen',
  // 캐릭터 생성기
  'character-forge', 'antagonist-forge', 'character-tic-gen', 'character-foil-gen', 'first-meeting-gen',
  // 플롯/사건/갈등
  'plot-twist-deck', 'dilemma-generator', 'conflict-builder', 'betrayal-gen', 'premise-generator',
  'two-word-collision', 'what-if-escalator', 'logline-forge', 'opening-line-forge', 'story-dice',
  // 발상/카드/주사위
  'card-draw-story', 'tarot-story', 'story-tarot', 'prompt-wheel', 'oblique-strategies',
  'omen-symbol-gen', 'prophecy-generator', 'curse-blessing-gen', 'rumor-generator', 'red-herring-gen',
  // 세계관/배경/소품
  'creature-designer', 'myth-creature', 'prop-generator', 'quest-forge', 'scene-weather',
  // 장르 생성기 표본
  'romance-charforge', 'sf-character-forge', 'horror-charforge', 'fantasy-synopsis', 'mystery-suspect-forge',
]

// 도구창 안에서 '주요 액션 버튼' 1개를 찾아 클릭하고, 본문 텍스트/노드 델타를 돌려준다.
// - 클릭 후보: .toolwin-body 안의 button 중 (1) .btn-primary, 아니면 (2) 생성/뽑/굴리/만들/돌리/섞/새로/재생성 verb,
//   단 disabled / .minibtn(헤더 chrome) / .linkbtn(프로젝트 연계) / 관련도구 스트립은 제외.
// - 반환: { found, label, before, after, nodesBefore, nodesAfter, changed }
const ACT = (id) => `
  const win = [...document.querySelectorAll('.toolwin')].find(w => w.getAttribute('aria-label') && (w.querySelector('.toolwin-body')));
  // id 매칭: ToolWindow 는 aria-label=title 이라 id 직접 매칭이 어려움 → 가장 최근(맨 앞 z-index) 창을 잡되,
  // 본문이 존재하는 창만 사용. (한 번에 한 도구만 열고 닫는 시퀀스라 모호성 없음)
  const wins = [...document.querySelectorAll('.toolwin')].filter(w => w.style.display !== 'none' && w.querySelector('.toolwin-body'));
  if (!wins.length) return { found: false, reason: 'no-toolwin' };
  wins.sort((a,b)=> (parseInt(b.style.zIndex||'0',10)) - (parseInt(a.style.zIndex||'0',10)));
  const w = wins[0];
  const body = w.querySelector('.toolwin-body');
  if (!body) return { found: false, reason: 'no-body' };
  const VERB = /(생성|뽑|굴리|굴려|만들|돌리|섞|새로|재생성|다시)/;
  const cands = [...body.querySelectorAll('button')].filter(b =>
    !b.disabled &&
    !b.closest('.toolwin-related') &&
    b.offsetParent !== null);
  // 우선 .btn-primary, 없으면 verb 텍스트 버튼
  let btn = cands.find(b => b.classList.contains('btn-primary'));
  if (!btn) btn = cands.find(b => VERB.test((b.textContent||'').trim()));
  if (!btn) return { found: false, reason: 'no-action-btn', cands: cands.length };
  const norm = s => (s||'').replace(/\\s+/g,' ').trim();
  const before = norm(body.innerText).slice(0, 6000);
  const nodesBefore = body.querySelectorAll('*').length;
  const label = norm(btn.textContent).slice(0, 40);
  // 실제 클릭(mousedown→click) — 일부 도구는 mousedown 에서 동작
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  btn.click();
  return { found: true, label, before, nodesBefore };
`

const AFTER = `
  const wins = [...document.querySelectorAll('.toolwin')].filter(w => w.style.display !== 'none' && w.querySelector('.toolwin-body'));
  if (!wins.length) return { after: '', nodesAfter: 0 };
  wins.sort((a,b)=> (parseInt(b.style.zIndex||'0',10)) - (parseInt(a.style.zIndex||'0',10)));
  const body = wins[0].querySelector('.toolwin-body');
  const norm = s => (s||'').replace(/\\s+/g,' ').trim();
  return { after: norm(body.innerText).slice(0, 6000), nodesAfter: body.querySelectorAll('*').length };
`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 사전 점검: 자동화 훅 존재
  const hasHook = await ev(ws, sid, `return !!(window.__openTool && window.__closeTool && window.__scriv)`)
  t(hasHook, '자동화 훅 window.__openTool/__closeTool/__scriv 노출')

  // 와이드 창 가정(1500x950) — 창이 너무 좁으면 도구창이 클램프돼 버튼이 가려질 수 있으므로 확인만.
  const vw = await ev(ws, sid, `return Math.round(window.innerWidth)`)

  let opened = 0, acted = 0, changed = 0, skipped = 0
  const skipList = [], changeList = []

  for (const id of TOOL_IDS) {
    // 깨끗한 상태: 혹시 이전 반복에서 남은 도구창이 있으면 모두 닫아 '한 번에 한 도구'를 보장
    // (ACT/AFTER 가 '맨 앞 .toolwin' 1개를 잡으므로 다중 창이 남아 있으면 안 됨)
    await ev(ws, sid, `try{ const tw=[...document.querySelectorAll('.toolwin .toolwin-head button[title^="닫기"]')]; tw.forEach(b=>b.click()); }catch(e){} return 1`); await sleep(120)
    let renderedOk = false
    try {
      // 1) 도구 열기
      await ev(ws, sid, `window.__openTool(${JSON.stringify(id)}); return 1`)
      // 2) lazy 청크 로드 + 최초 렌더 대기(생성기들은 마운트 시 1회 생성하기도 함)
      await sleep(900)
      // 3) 도구창이 실제 렌더됐는지(본문 존재)
      renderedOk = await ev(ws, sid, `
        const wins = [...document.querySelectorAll('.toolwin')].filter(w => w.style.display !== 'none' && w.querySelector('.toolwin-body'));
        return wins.length > 0;
      `)
      if (renderedOk) opened++
    } catch (e) {
      t(false, `${id}: 열기/렌더 중 예외 (${(e.message || '').slice(0, 60)})`)
      // 닫고 다음으로
      try { await ev(ws, sid, `window.__closeTool(${JSON.stringify(id)}); return 1`) } catch { /* noop */ }
      continue
    }

    if (!renderedOk) {
      skipped++; skipList.push(id + '(렌더실패)')
      try { await ev(ws, sid, `window.__closeTool(${JSON.stringify(id)}); return 1`) } catch { /* noop */ }
      continue
    }

    // 4) 주요 액션 버튼 클릭(클릭 직전 before 스냅샷 포함)
    let pre
    try { pre = await ev(ws, sid, ACT(id)) } catch (e) { pre = { found: false, reason: 'exc:' + (e.message || '').slice(0, 40) } }

    if (!pre || !pre.found) {
      skipped++; skipList.push(id + '(' + ((pre && pre.reason) || 'no-btn') + ')')
      try { await ev(ws, sid, `window.__closeTool(${JSON.stringify(id)}); return 1`) } catch { /* noop */ }
      continue
    }
    acted++

    // 5) 클릭 효과가 DOM 에 반영될 시간(애니메이션/상태 갱신)
    await sleep(450)
    let post
    try { post = await ev(ws, sid, AFTER) } catch (e) { post = { after: '', nodesAfter: 0 } }

    // 6) '동작 발생' 판정: 본문 텍스트가 바뀌었거나(생성물 교체) 노드 수가 늘었다(항목 추가).
    //    일부 결정론 생성기는 같은 시드로 같은 결과가 나올 수 있으나, 위 표본은 Math.random 기반 무작위 생성기라
    //    텍스트 델타가 사실상 항상 발생. 그래도 안전하게 '텍스트 변화 OR 노드 증가'를 동작으로 본다.
    const textChanged = (pre.before || '') !== (post.after || '')
    const nodesGrew = (post.nodesAfter || 0) > (pre.nodesBefore || 0)
    const didAct = textChanged || nodesGrew
    if (didAct) { changed++; changeList.push(id) }
    t(didAct, `${id}: 「${pre.label}」 클릭 → ${textChanged ? '본문 텍스트 변화' : ''}${textChanged && nodesGrew ? ' + ' : ''}${nodesGrew ? '항목 증가(' + pre.nodesBefore + '→' + post.nodesAfter + ')' : ''}${didAct ? '' : '효과 없음'}`)

    // 7) 닫기(다음 도구 격리)
    try { await ev(ws, sid, `window.__closeTool(${JSON.stringify(id)}); return 1`) } catch { /* noop */ }
    await sleep(120)
  }

  // ── 집계 단언 ──
  // (A) 표본의 대다수가 실제로 렌더됨
  t(opened >= TOOL_IDS.length * 0.8, `표본 도구 렌더율 ${opened}/${TOOL_IDS.length} (≥80% 기대)`)
  // (B) 클릭 가능한 액션 버튼을 가진 도구가 충분히 많음
  t(acted >= 20, `액션 버튼 클릭 성공 도구 ${acted}개 (≥20 기대)`)
  // (C) 클릭한 도구의 대다수가 실제 '동작'(텍스트/노드 변화)을 일으킴
  t(acted === 0 ? false : (changed >= Math.ceil(acted * 0.7)), `실동작 발생 ${changed}/${acted} (클릭한 것의 ≥70% 기대)`)
  // (D) 절대 수치로도 최소 15개 도구에서 실효과 확인
  t(changed >= 15, `실효과 확인 도구 누계 ${changed}개 (≥15 기대)`)
  // (E) 전 과정 무크래시·예외 0
  t(exc.length === 0, '도구 열기/클릭 전 과정 예외 0 (' + exc.length + ')')

  console.log('=== 도구 실동작 표본 검증 ===')
  console.log(`  창 너비 ${vw}px · 표본 ${TOOL_IDS.length}종 · 렌더 ${opened} · 클릭 ${acted} · 실동작 ${changed} · 스킵 ${skipped}`)
  if (changeList.length) console.log('  동작확인: ' + changeList.join(', '))
  if (skipList.length) console.log('  스킵: ' + skipList.join(', '))
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
