// 스냅샷 수정 확인 + 논증 영속/story-tarot/코르크보드·아웃라이너 전환 진단.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) return 'THREW:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]; return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const P = (k, v) => console.log('  · ' + k + ': ' + v)
  const clickView = (lab) => ev(ws, sid, `const b=[...document.querySelectorAll('button.tbtn')].find(x=>{const a=x.getAttribute('aria-label')||'';return a.indexOf(${JSON.stringify(lab)})===0});if(b){b.click();return 1}return 'no-btn:'+${JSON.stringify(lab)}`)

  console.log('=== 스냅샷 수정 확인 ===')
  P('activeId', await ev(ws, sid, `return window.__scriv.state().activeId`))
  await ev(ws, sid, `document.querySelector('#insp-tab-snapshots').click();return 1`); await sleep(500)
  P('인스펙터 생존(.inspector)', await ev(ws, sid, `return !!document.querySelector('.inspector')`))
  P('.snap-take 존재', await ev(ws, sid, `return !!document.querySelector('.snap-take')`))
  const sb = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.snap-take button,#insp-panel button')].find(x=>/지금 찍기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(500)
  const sa = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  P('스냅샷 찍기 before→after(+1 기대)', sb + '→' + sa)
  // 본문 바꾸고 되돌리기
  await ev(ws, sid, `window.__scriv.setBody('{\\\\rtf1\\\\ansi 변경된내용\\\\par}');return 1`); await sleep(300)
  const beforeRollback = await ev(ws, sid, `return (window.__scriv.bodyOf(window.__scriv.state().activeId)||'').slice(0,60)`)
  P('되돌리기 전 본문', beforeRollback)
  await ev(ws, sid, `window.confirm=()=>true;const b=[...document.querySelectorAll('.snap-item .snap-actions button')].find(x=>/되돌리기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(500)
  P('되돌린 후 본문(원복 기대)', await ev(ws, sid, `return (window.__scriv.bodyOf(window.__scriv.state().activeId)||'').slice(0,60)`))

  console.log('=== 코르크보드/아웃라이너 전환 ===')
  P('코르크보드 클릭', await clickView('코르크보드')); await sleep(500)
  P('.corkboard 존재', await ev(ws, sid, `return !!document.querySelector('.corkboard')`))
  P('아웃라이너 클릭', await clickView('아웃라이너')); await sleep(500)
  P('.outliner 존재', await ev(ws, sid, `return !!document.querySelector('.outliner')`))
  await clickView('에디터'); await sleep(300)

  console.log('=== 논증 주장 영속 ===')
  P('논증 클릭', await clickView('논증')); await sleep(600)
  P('논증뷰 텍스트(앞120)', await ev(ws, sid, `return (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,120)`))
  const cardSel = `[...document.querySelectorAll('*')].filter(e=>/^주장 \\d+$/.test((e.textContent||'').trim())&&e.children.length===0).length`
  const cb = await ev(ws, sid, `return ${cardSel}`)
  await ev(ws, sid, `const b=[...document.querySelectorAll('button')].find(x=>/주장 추가/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const ca = await ev(ws, sid, `return ${cardSel}`)
  P('주장 카드 before→after(+1 기대)', cb + '→' + ca)
  await clickView('에디터'); await sleep(300); await clickView('논증'); await sleep(500)
  P('왕복 후 주장 카드(영속 기대)', await ev(ws, sid, `return ${cardSel}`))

  console.log('=== story-tarot 다시 섞기 ===')
  await ev(ws, sid, `if(window.__openTool)window.__openTool('story-tarot');return 1`); await sleep(1400)
  P('.toolwin 존재', await ev(ws, sid, `return !!document.querySelector('.toolwin')`))
  const tb = await ev(ws, sid, `const w=document.querySelector('.toolwin');if(!w)return'no-win';return (w.querySelector('.toolwin-body')||w).innerText.replace(/\\s+/g,' ').slice(0,160)`)
  P('버튼들', await ev(ws, sid, `const w=document.querySelector('.toolwin');if(!w)return'no-win';return [...w.querySelectorAll('button')].map(b=>(b.textContent||'').trim()).filter(Boolean).slice(0,12).join(' | ')`))
  await ev(ws, sid, `const w=document.querySelector('.toolwin');if(!w)return 0;const b=[...w.querySelectorAll('button')].find(x=>/다시 섞|섞기|뽑기|뽑다|새로|리딩/.test(x.textContent||''));if(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click()}return b?(b.textContent||'').trim():'no-btn'`); await sleep(700)
  const ta = await ev(ws, sid, `const w=document.querySelector('.toolwin');if(!w)return'no-win';return (w.querySelector('.toolwin-body')||w).innerText.replace(/\\s+/g,' ').slice(0,160)`)
  P('tarot 변화', tb === ta ? '변화없음 ⚠' : '변함 ✓')
  P('  before', String(tb).slice(0, 90))
  P('  after ', String(ta).slice(0, 90))

  P('전체 콘솔에러/예외 수', errs.length)
  ws.close(); process.exit(0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
