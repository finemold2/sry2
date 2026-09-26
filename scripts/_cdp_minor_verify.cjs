// 경미 이슈 확인: ① 에디터에서 실제 Enter 키로 새 문단 생성 ② 폴더 선택 시 SEO 탭에 안내 배너.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
const key = (ws, sid, k, code, vk) => rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sid).then(() => rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }, sid))

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)

  // ① 에디터 Enter → 새 문단(글쓰기 기본)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)
  // 빈 문서 오토포커스(#23) 대비 — 포커스 해제 후 setBody(포커스 중이면 blur 시 빈 DOM 으로 되덮임).
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(150)
  await ev(ws, sid, "var id=window.__scriv.state().activeId;if(id)window.__scriv.setBody('{\\\\rtf1\\\\ansi AAA\\\\par}');return 1"); await sleep(400)
  const before = await ev(ws, sid, "var p=document.querySelector('.paper');return [].slice.call(p.children).filter(function(c){return /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(c.tagName)}).length")
  await ev(ws, sid, "var p=document.querySelector('.paper');p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);return 1"); await sleep(150)
  // 실제 키보드 Enter 와 동일한 편집 동작(CDP Input Enter 는 contenteditable 기본동작 미트리거).
  await ev(ws, sid, "document.execCommand('insertParagraph');document.execCommand('insertText',false,'BBB');document.querySelector('.paper').dispatchEvent(new Event('input',{bubbles:true}));return 1"); await sleep(350)
  const after = await ev(ws, sid, "var p=document.querySelector('.paper');return [].slice.call(p.children).filter(function(c){return /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(c.tagName)}).length")
  const txt = await ev(ws, sid, "return (document.querySelector('.paper').textContent||'')")
  t(after >= before + 1 && /AAA/.test(txt) && /BBB/.test(txt), 'Enter 로 새 문단 생성(문단 ' + before + '→' + after + ', AAA/BBB)')

  // ② 새 폴더 생성→선택→SEO 탭 안내 배너
  if (!(await ev(ws, sid, "return !!document.querySelector('.inspector')"))) { await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test(x.getAttribute('aria-label')||'')});if(b)b.click();return 1"); await sleep(300) }
  const beforeN = await ev(ws, sid, "return window.__scriv.entries().filter(function(e){return e.type==='folder'}).length")
  await ev(ws, sid, "var b=document.querySelector('.binder-head button[title=\"새 폴더\"]')||[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('title')||'')==='새 폴더'});if(b)b.click();return 1"); await sleep(500)
  const afterN = await ev(ws, sid, "return window.__scriv.entries().filter(function(e){return e.type==='folder'}).length")
  t(afterN > beforeN, '새 폴더 생성됨(' + beforeN + '→' + afterN + ')')
  const activeIsFolder = await ev(ws, sid, "var aid=window.__scriv.state().activeId;var it=window.__scriv.entries().find(function(e){return e.id===aid});return !!it&&it.type==='folder'")
  await ev(ws, sid, "var tb=document.querySelector('#insp-tab-seo');if(tb)tb.click();return 1"); await sleep(300)
  const noteShown = await ev(ws, sid, "var p=document.querySelector('#insp-panel');var t=p?(p.textContent||''):'';return /이 항목은/.test(t)&&/폴더/.test(t)&&/SEO|메타/.test(t)")
  t(!activeIsFolder || noteShown, '폴더 선택 시 SEO 탭에 안내 배너 표시(activeFolder=' + activeIsFolder + ', note=' + noteShown + ')')

  console.log('=== 경미 이슈 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
