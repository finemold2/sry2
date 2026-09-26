// 서식 툴바 전수 검증 — 선택에 각 서식을 실제 적용하고 DOM 반영 + RTF 영속을 확인.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

const reset = `(()=>{const p=document.querySelector('.paper');p.focus();p.innerHTML='<p>가나다라마바사 서식 표본 텍스트</p>';p.dispatchEvent(new Event('input',{bubbles:true}));const r=document.createRange();r.selectNodeContents(p.firstChild);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));return 1})()`
const clickBtn = (titlePrefix) => `(()=>{const b=[...document.querySelectorAll('.formatbar button')].find(x=>(x.title||'').indexOf(${JSON.stringify(titlePrefix)})===0);if(!b)return'no:'+${JSON.stringify(titlePrefix)};b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click();return'ok'})()`
const setSel = (title, v) => `(()=>{const s=[...document.querySelectorAll('.formatbar select')].find(x=>(x.title||'').indexOf(${JSON.stringify(title)})===0);if(!s)return'no';s.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));s.value=${JSON.stringify(v)};s.dispatchEvent(new Event('change',{bubbles:true}));return'ok'})()`
const html = () => `return document.querySelector('.paper').innerHTML`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 인라인 서식: 선택 후 버튼 → DOM 마커 + bodyRtf 마커
  const docId = await ev(ws, sid, `return window.__scriv.state().activeId`)
  const rtf = async () => (await ev(ws, sid, `return window.__scriv.bodyOf(${JSON.stringify(docId)})`)) || ''
  const cases = [
    { title: '굵게', dom: /<(b|strong)>|font-weight\s*:\s*(bold|700)/i, rtf: /\\b(?![a-z])/, name: '굵게' },
    { title: '기울임', dom: /<(i|em)>|font-style\s*:\s*italic/i, rtf: /\\i(?![a-z])/, name: '기울임' },
    { title: '밑줄', dom: /<u>|text-decoration[^;"']*underline/i, rtf: /\\ul(?![a-z])/, name: '밑줄' },
    { title: '취소선', dom: /text-decoration[^;"']*line-through|<(s|strike)>/i, rtf: /\\strike/, name: '취소선' },
  ]
  for (const c of cases) {
    await ev(ws, sid, reset); await sleep(150)
    await ev(ws, sid, clickBtn(c.title)); await sleep(250)
    const h = await ev(ws, sid, html()); const r = await rtf()
    t(c.dom.test(h) && c.rtf.test(r), `${c.name}: DOM ${c.dom.test(h) ? 'O' : 'X'} · RTF영속 ${c.rtf.test(r) ? 'O' : 'X'}`)
  }
  // 글자 크기 24pt → span + RTF \fs48
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, setSel('글자 크기', '24')); await sleep(250)
  t(/font-size\s*:\s*24pt/i.test(await ev(ws, sid, html())) && /\\fs48(?![0-9])/.test(await rtf()), '글자 크기 24pt: DOM+RTF(\\fs48)')
  // 가운데 정렬 → RTF \qc
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, clickBtn('가운데 정렬')); await sleep(250)
  t(/\\qc/.test(await rtf()) || /text-align\s*:\s*center/i.test(await ev(ws, sid, html())), '가운데 정렬 적용')
  // 제목2 → <h2> + RTF 스타일(\s2)
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, setSel('문단 스타일', 'h2')); await sleep(250)
  t(/<h2/i.test(await ev(ws, sid, html())), '문단 스타일 제목2 → <h2>')
  // 인용 → <blockquote>
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, setSel('문단 스타일', 'blockquote')); await sleep(250)
  t(/<blockquote/i.test(await ev(ws, sid, html())), '문단 스타일 인용 → <blockquote>')
  // 글머리 기호 → <ul><li>
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, clickBtn('글머리 기호')); await sleep(250)
  t(/<ul[\s>]/i.test(await ev(ws, sid, html())), '글머리 기호 → <ul>')
  // 번호 매기기 → <ol>
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, clickBtn('번호 매기기')); await sleep(250)
  t(/<ol[\s>]/i.test(await ev(ws, sid, html())), '번호 매기기 → <ol>')
  // 들여쓰기 → margin/padding-left 또는 RTF \li
  await ev(ws, sid, reset); await sleep(120); await ev(ws, sid, clickBtn('들여쓰기 늘리기')); await sleep(250)
  t(/\\li\d/.test(await rtf()) || /(margin|padding)-left/i.test(await ev(ws, sid, html())), '들여쓰기 늘리기 적용')

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 서식 툴바 전수 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
