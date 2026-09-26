// 줄간격 검증 — ①기본 1.0 ②무선택=문서 전체 기본 변경(새 문단도 따름) ③블록 선택=그 블록만.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
// 줄간격 select 의 value 를 바꾸고 change 발화
const setSpacing = (v) => `(()=>{const s=[...document.querySelectorAll('select')].find(x=>/줄 간격|줄간격/.test(x.title||'')|| [...x.options].some(o=>/줄간격/.test(o.textContent||'')));if(!s)return'no-select';s.value=${JSON.stringify(v)};s.dispatchEvent(new Event('change',{bubbles:true}));return'ok'})()`
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 에디터/문단 준비
  await ev(ws, sid, `const p=document.querySelector('.paper');if(p){p.focus();p.innerHTML='<p>첫째 문단입니다</p><p>둘째 문단입니다</p>';p.dispatchEvent(new Event('input',{bubbles:true}))}return 1`); await sleep(400)

  // 기본 줄간격 1.0 (--ed-line 미설정 시 CSS fallback)
  const def = await ev(ws, sid, `const p=document.querySelector('.paper p');const cs=getComputedStyle(p);const fs=parseFloat(cs.fontSize);const lh=parseFloat(cs.lineHeight);return Math.round((lh/fs)*100)/100`)
  t(Math.abs(def - 1.0) < 0.06, '기본 줄간격 ≈ 1.0 (실측 ' + def + ')')

  // A) 무선택(캐럿만) → 문서 전체 기본 2.0
  await ev(ws, sid, `const p=document.querySelector('.paper');const r=document.createRange();r.setStart(p.firstChild,0);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);return 1`); await sleep(250)
  await ev(ws, sid, setSpacing('2')); await sleep(400)
  const edline = await ev(ws, sid, `return getComputedStyle(document.querySelector('.paper')).getPropertyValue('--ed-line').trim()`)
  t(edline === '2', '무선택 줄간격 변경 → 문서 기본(--ed-line)=2 (실측 "' + edline + '")')
  // 새 문단도 그 기본을 따름(둘째 문단 computed line-height = 2*fontSize)
  const p2lh = await ev(ws, sid, `const ps=document.querySelectorAll('.paper p');const p=ps[ps.length-1];const cs=getComputedStyle(p);return Math.round((parseFloat(cs.lineHeight)/parseFloat(cs.fontSize))*100)/100`)
  t(Math.abs(p2lh - 2.0) < 0.06, '문서 기본 2.0 이 모든 문단에 적용 (둘째 실측 ' + p2lh + ')')

  // B) 블록 선택 → 그 블록만 0.5
  await ev(ws, sid, `const p1=document.querySelectorAll('.paper p')[0];const r=document.createRange();r.selectNodeContents(p1);const s=getSelection();s.removeAllRanges();s.addRange(r);return 1`); await sleep(250)
  await ev(ws, sid, setSpacing('0.5')); await sleep(400)
  const p1inline = await ev(ws, sid, `return (document.querySelectorAll('.paper p')[0].style.lineHeight||'')`)
  const p2inline = await ev(ws, sid, `return (document.querySelectorAll('.paper p')[1].style.lineHeight||'')`)
  t(p1inline === '0.5', '선택한 첫 블록만 줄간격 0.5 (실측 "' + p1inline + '")')
  t(p2inline === '', '선택 안 한 둘째 블록은 인라인 줄간격 없음(문서 기본 유지)')

  // C) '문서 기본으로' → 첫 블록 인라인 해제
  await ev(ws, sid, `const p1=document.querySelectorAll('.paper p')[0];const r=document.createRange();r.selectNodeContents(p1);const s=getSelection();s.removeAllRanges();s.addRange(r);return 1`); await sleep(200)
  await ev(ws, sid, setSpacing('default')); await sleep(400)
  t(await ev(ws, sid, `return (document.querySelectorAll('.paper p')[0].style.lineHeight||'')`) === '', "'문서 기본으로' → 블록 인라인 줄간격 해제")

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 줄간격 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
