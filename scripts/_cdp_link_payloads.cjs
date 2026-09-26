// 연계 payload 수신 검증: 도구가 다른 도구로부터 받은 데이터(payload)를 실제로 화면에 채우는지.
//  (정적 점검에서 payload 를 버리던 10개 도구를 수정한 뒤의 회귀 테스트) — __openTool(id, payload) 로 직접 전달.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }
let PASS = 0, FAIL = 0
const ok = (c, m) => { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }
const WIN = (id) => `document.querySelector('.toolwin[data-tool-id="${id}"]')`
const winText = (id) => `(function(){var w=${WIN(id)};return w?(w.innerText||''):''})()`
const inputVals = (id) => `(function(){var w=${WIN(id)};return w?[].slice.call(w.querySelectorAll('input,textarea')).map(function(x){return x.value}):[]})()`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  const errs = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== s) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails.exception || {}).description || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map((a) => String(a.value || a.description || '')).join(' ').slice(0, 100)) })
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false }, s)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__openTool')) === 'function') break } catch {} }
  await sleep(700)
  await ev(ws, s, `var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기|건너뛰기/.test(x.textContent||'')});if(b)b.click();1`)
  // 도구 로컬 상태 초기화(제목 '비어 있을 때만' 규칙 검증용)
  await ev(ws, s, `(function(){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/tool:(conflict-builder|pov-tracker|save-the-cat|plot-pyramid|symbolism)/.test(k))ks.push(k)}ks.forEach(function(k){localStorage.removeItem(k)})})()`)

  const open = async (id, payload) => { await ev(ws, s, `window.__openTool(${JSON.stringify(id)}, ${JSON.stringify(payload)})`); await sleep(1400) }
  const close = async (id) => { await ev(ws, s, `window.__closeTool && window.__closeTool(${JSON.stringify(id)}),1`); await sleep(200) }

  console.log('\n[1] 텍스트 점검 도구 3종 + 워밍업: payload.text 가 입력칸에 채워짐')
  const SAMPLE = '그는 매우 빠르게 정말 조용히 걸었다. 문이 열려졌다.'
  for (const id of ['adverb-highlighter', 'anachronism-checker', 'passive-voice-ko', 'warmup-prompt']) {
    await open(id, { text: SAMPLE })
    const vals = await ev(ws, s, inputVals(id))
    ok(vals.some((v) => v === SAMPLE), `${id}: 받은 본문이 입력칸에 채워짐`)
    await close(id)
  }

  console.log('\n[2] 상징 사전: payload.query 로 즉시 검색')
  await open('symbolism-dict', { query: '죽음' })
  ok((await ev(ws, s, inputVals('symbolism-dict'))).includes('죽음'), '검색창에 "죽음" 채워짐')
  await close('symbolism-dict')

  console.log('\n[3] 갈등 설계기: 갈등 리액터가 보낸 인물/욕망/판돈으로 새 폼 프리필')
  await open('conflict-builder', { character: '한도윤', desire: '진실을 밝히기', stakes: '가족의 안전', text: '한도윤 ↔ 서지우 / 축: 충성' })
  const cv = await ev(ws, s, inputVals('conflict-builder'))
  ok(cv.includes('한도윤') && cv.includes('진실을 밝히기') && cv.includes('가족의 안전'), '폼에 인물·욕망·판돈 채워짐 (' + JSON.stringify(cv.filter(Boolean)).slice(0, 120) + ')')
  ok(/연계로 받은 내용/.test(await ev(ws, s, winText('conflict-builder'))), '안내 문구 표시')
  await close('conflict-builder')

  console.log('\n[4] POV 추적기: 시점 시뮬레이터가 보낸 인물로 행 추가')
  const before = (await ev(ws, s, `(function(){try{return (JSON.parse(localStorage.getItem('sry:tool:pov-tracker')||'null')||[]).length}catch(e){return 0}})()`)) || 0
  await open('pov-tracker', { pov: '서지우', person: '1인칭' })
  ok((await ev(ws, s, inputVals('pov-tracker'))).includes('서지우'), '"서지우" 행이 추가됨 (이전 행 ' + before + ')')
  await close('pov-tracker')

  console.log('\n[5] 플롯 피라미드 / Save the Cat: 제목 프리필(비어 있을 때만)')
  await open('plot-pyramid', { title: '연계 제목 A' })
  ok((await ev(ws, s, inputVals('plot-pyramid'))).includes('연계 제목 A'), '플롯 피라미드 제목 채워짐')
  await close('plot-pyramid')
  await open('plot-pyramid', { title: '연계 제목 B' })
  const pv = await ev(ws, s, inputVals('plot-pyramid'))
  ok(pv.includes('연계 제목 A') && !pv.includes('연계 제목 B'), '이미 제목이 있으면 덮어쓰지 않음')
  await close('plot-pyramid')
  await open('save-the-cat-beats', { title: '고양이 제목' })
  ok((await ev(ws, s, inputVals('save-the-cat-beats'))).includes('고양이 제목'), 'Save the Cat 제목 채워짐')
  await close('save-the-cat-beats')

  console.log('\n[6] 음악 갤러리: 무드링이 보낸 분위기로 검색(네트워크 무관하게 라벨만 확인)')
  await open('music-gallery', { mood: 'tense', moodName: '긴장', q: 'tense suspense strings' })
  // 이모지는 <img> 로 렌더돼 innerText 에 없다 → 활성 칩 텍스트에 '긴장' 포함 여부로 판정
  const chip = await ev(ws, s, `(function(){var w=${WIN('music-gallery')};var b=w&&[].slice.call(w.querySelectorAll('button.minibtn.active')).map(function(x){return (x.textContent||'').trim()});return b||[]})()`)
  ok(chip.some((t) => /긴장/.test(t)), '커스텀 무드 "🔗 긴장" 활성 칩 표시 (' + JSON.stringify(chip) + ')')
  await close('music-gallery')

  console.log('\n[7] 공포 장치 → 긴장 곡선(잘못된 id 수정 회귀)')
  await open('horror-devices', {})
  // 연계 바는 장치 카드를 펼쳐야 보인다 → 첫 카드 헤더 클릭
  await ev(ws, s, `(function(){var w=${WIN('horror-devices')};var h=w&&w.querySelector('div[style*="cursor: pointer"]');if(h)h.click();return !!h})()`); await sleep(400)
  const r = await ev(ws, s, `(function(){var w=${WIN('horror-devices')};var b=w&&[].slice.call(w.querySelectorAll('button')).find(function(x){return /긴장 곡선/.test(x.textContent||'')});if(!b)return'noBtn';b.click();return'clicked'})()`); await sleep(1200)
  ok(r === 'clicked' && (await ev(ws, s, `!!${WIN('tension-curve')}`)) === true, '"긴장 곡선" 버튼이 tension-curve 창을 엶 (' + r + ')')

  console.log('\n[8] 2차 수정분: 관계도 pair / 무드보드 / 감각 팔레트 / 상상 갤러리 / 세력 / 인물 시트 평평한 값 / 세계관 위키')
  await ev(ws, s, `localStorage.removeItem('sry:tool:relationship-map')`)
  await open('relationship-map', { focus: '한도윤', pair: ['한도윤', '서지우'] })
  const rmTexts = await ev(ws, s, `(function(){var w=${WIN('relationship-map')};return w?[].slice.call(w.querySelectorAll('svg text')).map(function(t){return (t.textContent||'').trim()}):[]})()`)
  ok(rmTexts.includes('한도윤') && rmTexts.includes('서지우') && rmTexts.some((t) => /대조/.test(t)), '관계도: pair 두 노드 + "대조" 관계선 (' + JSON.stringify(rmTexts) + ')')
  await close('relationship-map')
  await open('moodboard-grid', { query: '안개 낀 숲' })
  ok((await ev(ws, s, inputVals('moodboard-grid'))).includes('안개 낀 숲'), '무드보드: 검색어 채워짐(검색 실행)')
  await close('moodboard-grid')
  await open('moodboard-grid', { image: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22/%3E', title: '연계 명화', credit: '작자 미상', license: 'CC0' })
  const mbImgs = await ev(ws, s, `(function(){var w=${WIN('moodboard-grid')};return w?w.querySelectorAll('img').length:0})()`)
  const mbText = await ev(ws, s, winText('moodboard-grid'))
  const mbLinked = await ev(ws, s, `(function(){var w=${WIN('moodboard-grid')};return w?[].slice.call(w.querySelectorAll('img')).some(function(i){return (i.getAttribute('src')||'').indexOf('data:image/svg')===0}):false})()`)
  ok(mbLinked, '무드보드: 보낸 이미지가 카드로 렌더됨 (img=' + mbImgs + ')')
  await close('moodboard-grid')
  await open('sensory-palette', { placeKey: 'market' })
  ok(/시장/.test(await ev(ws, s, winText('sensory-palette'))) && /팔레트를 열었어요/.test(await ev(ws, s, winText('sensory-palette'))), '감각 팔레트: placeKey → 시장 팔레트 + 안내')
  await close('sensory-palette')
  await open('imagination-gallery', { cat: 'space' })
  ok((await ev(ws, s, `(function(){var w=${WIN('imagination-gallery')};var b=w&&[].slice.call(w.querySelectorAll('button.minibtn.active,button.active')).map(function(x){return (x.textContent||'').trim()});return b||[]})()`)).some((t) => /우주/.test(t)), '상상 갤러리: cat=space → 우주 카테고리 활성')
  await close('imagination-gallery')
  await open('faction-builder', { title: '검은 장미단', intro: '왕가 전복을 꾀하는 비밀결사' })
  const fv = await ev(ws, s, inputVals('faction-builder'))
  ok(fv.includes('검은 장미단') && fv.some((v) => /왕가 전복/.test(v)), '세력 빌더: title/intro → 이름·메모 프리필')
  await close('faction-builder')
  await ev(ws, s, `localStorage.removeItem('sry:tool:character-sheet')`)
  await open('character-sheet', { job: '약초상', role: '약초상', profession: '약초상' })
  ok((await ev(ws, s, inputVals('character-sheet'))).includes('약초상'), '인물 시트: 직업 참고(job) → 새 인물의 역할에 반영')
  await close('character-sheet')
  await open('world-wiki', { title: '저승', q: '저승' })
  ok((await ev(ws, s, inputVals('world-wiki'))).includes('저승'), '세계관 위키: q → 검색창 채워짐')
  await close('world-wiki')

  const real = errs.filter((e) => !/ResizeObserver|DevTools|favicon|Failed to fetch|NetworkError|ERR_/i.test(e))
  ok(real.length === 0, '전 과정 콘솔에러/예외 0' + (real.length ? ' — ' + real.slice(0, 3).join(' | ') : ''))
  console.log('\n=== 연계 payload 수신 E2E: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close(); process.exit(FAIL ? 1 : 0)
}
main().catch((e) => { console.log('SCRIPT ERR ' + e.message); process.exit(2) })
