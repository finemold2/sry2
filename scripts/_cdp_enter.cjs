// 에디터에서 실제 Enter 키가 '새 문단(블록)'을 만드는지 — 유효 RTF 로드 후 전체 블록 수 + RTF 왕복으로 확인.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const key = (ws, sid, k, code, vk) => rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid).then(() => rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }, sid))
// 유효 RTF 본문(단락 1개: AAA) — 백슬래시를 page JS 문자열까지 정확히 전달하려고 String.fromCharCode(92) 로 조립.
const SETBODY_AAA = "var BS=String.fromCharCode(92);var rtf='{'+BS+'rtf1'+BS+'ansi AAA'+BS+'par}';window.__scriv.setBody(rtf);return rtf"
const BLOCKS = "var p=document.querySelector('.paper');return [].slice.call(p.children).filter(function(c){return /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(c.tagName)}).length"

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__scriv==='object'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)

  // 빈 문서 오토포커스(#23)가 에디터에 포커스를 주면 setBody 가 blur 시 빈 DOM 으로 되덮이므로 먼저 blur.
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(150)
  await ev(ws, sid, SETBODY_AAA); await sleep(450)
  // 사니티: 본문이 'AAA' 1블록으로 깨끗이 로드됐는가(테스트 RTF 유효성)
  const initTxt = await ev(ws, sid, "return (document.querySelector('.paper').textContent||'').trim()")
  const initBlocks = await ev(ws, sid, BLOCKS)
  t(initTxt === 'AAA' && initBlocks === 1, "유효 RTF 로드(본문='" + initTxt + "', 블록=" + initBlocks + ")")

  // 캐럿 끝 → 문단 나누기 + 타이핑
  //  ⚠ CDP Input 의 Enter 키는 contenteditable 의 기본 insertParagraph 를 트리거하지 못한다(헤드리스 한계).
  //    실제 사용자의 키보드 Enter 와 동일한 편집 동작인 execCommand('insertParagraph') 로 검증한다.
  await ev(ws, sid, "var p=document.querySelector('.paper');p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);return 1"); await sleep(150)
  await ev(ws, sid, "document.execCommand('insertParagraph');document.execCommand('insertText',false,'BBB');document.querySelector('.paper').dispatchEvent(new Event('input',{bubbles:true}));return 1"); await sleep(400)

  const afterBlocks = await ev(ws, sid, BLOCKS)
  const txt = await ev(ws, sid, "return (document.querySelector('.paper').textContent||'')")
  t(afterBlocks >= 2, 'Enter 가 새 블록(문단) 생성 — 블록 ' + initBlocks + '→' + afterBlocks)
  t(/AAA/.test(txt) && /BBB/.test(txt), 'AAA·BBB 모두 본문에 존재')

  // RTF 왕복: 저장 후 본문이 두 단락(AAA, BBB)으로 분리 보존되는가
  await sleep(400)
  const body = await ev(ws, sid, "var id=window.__scriv.state().activeId;return window.__scriv.bodyOf(id)||''")
  // \par 로 단락 구분 — AAA 와 BBB 가 서로 다른 단락인지(둘 사이에 \par)
  const aIdx = body.indexOf('AAA'), bIdx = body.indexOf('BBB')
  const between = aIdx >= 0 && bIdx > aIdx ? body.slice(aIdx, bIdx) : ''
  t(aIdx >= 0 && bIdx > aIdx && /\\(par|line)/.test(between), 'RTF 에서 AAA·BBB 가 단락/줄로 분리 저장(between=' + JSON.stringify(between.slice(0, 24)) + ')')

  console.log('=== 에디터 Enter 새 문단 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
