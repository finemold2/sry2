// 라이브 진단 — 인스펙터(메타/키워드)·스냅샷·논증 영속·tarot 의 '실제 동작'을 직접 확인하고 무엇이 보이는지 덤프.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const P = (k, v) => console.log('  · ' + k + ': ' + v)

  console.log('=== 1) 부팅/인스펙터 기본 ===')
  P('activeId(부팅)', await ev(ws, sid, `return window.__scriv.state().activeId`))
  P('.inspector 존재', await ev(ws, sid, `return !!document.querySelector('.inspector')`))
  P('.insp-tabs 존재', await ev(ws, sid, `return !!document.querySelector('.insp-tabs')`))
  P('#insp-tab-meta 존재', await ev(ws, sid, `return !!document.querySelector('#insp-tab-meta')`))
  P('인스펙터 탭들', await ev(ws, sid, `return [...document.querySelectorAll('.insp-tabs [role=tab]')].map(t=>t.id).join(',')`))

  console.log('=== 2) 텍스트 문서 선택 ===')
  // __scriv.entries()로 text 문서 찾고, 바인더에서 그 제목 행 클릭
  const pick = await ev(ws, sid, `const es=window.__scriv.entries?window.__scriv.entries():[];const t=es.find(e=>e.type==='text'&&!e.root);return t?JSON.stringify({id:t.id,title:t.title}):'none'`)
  P('첫 text 문서', pick)
  await ev(ws, sid, `const es=window.__scriv.entries();const t=es.find(e=>e.type==='text'&&!e.root);if(!t)return'none';const rows=[...document.querySelectorAll('.binder-row,.binder-title,.binder *')];const hit=rows.find(r=>(r.textContent||'').trim()===t.title);if(hit){(hit.closest('.binder-row')||hit).click()}return 1`); await sleep(400)
  P('activeId(선택 후)', await ev(ws, sid, `return window.__scriv.state().activeId`))

  console.log('=== 3) 메타 탭 → 라벨/상태 ===')
  await ev(ws, sid, `const t=document.querySelector('#insp-tab-meta');if(t)t.click();return 1`); await sleep(300)
  P('메타 탭 aria-selected', await ev(ws, sid, `const t=document.querySelector('#insp-tab-meta');return t?t.getAttribute('aria-selected'):'no-tab'`))
  P('메타 패널 본문', await ev(ws, sid, `const b=document.querySelector('#insp-panel');return b?(b.textContent||'').slice(0,40):'no-panel'`))
  P('메타 select 개수', await ev(ws, sid, `return document.querySelectorAll('#insp-panel select').length`))
  P('라벨 select 옵션수', await ev(ws, sid, `const s=document.querySelector('#insp-panel select');return s?s.options.length:'no-select'`))
  // 라벨 두번째 옵션 적용
  const labApplied = await ev(ws, sid, `const s=document.querySelector('#insp-panel select');if(!s||s.options.length<2)return'no';const v=s.options[1].value;const set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,v);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value===v?'applied:'+v:'mismatch'`)
  P('라벨 변경 적용', labApplied); await sleep(200)
  P('label-dot 색', await ev(ws, sid, `const d=document.querySelector('#insp-panel .label-dot');return d?getComputedStyle(d).backgroundColor:'no-dot'`))
  P('dirty', await ev(ws, sid, `return String(window.__scriv.state().dirty)`))

  console.log('=== 4) 스냅샷 ===')
  await ev(ws, sid, `const t=document.querySelector('#insp-tab-snapshots');if(t)t.click();return 1`); await sleep(300)
  P('스냅샷 탭 본문', await ev(ws, sid, `const b=document.querySelector('#insp-panel');return b?(b.textContent||'').slice(0,50):'no'`))
  P('.snap-take 존재', await ev(ws, sid, `return !!document.querySelector('.snap-take')`))
  const before = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.snap-take button,.snap-take .btn-primary,#insp-panel button')].find(x=>/지금 찍기|찍기/.test(x.textContent||''));if(b)b.click();return b?'clicked':'no-btn'`); await sleep(500)
  const after = await ev(ws, sid, `return document.querySelectorAll('.snap-item').length`)
  P('스냅샷 수 before→after', before + '→' + after)

  console.log('=== 5) 논증 주장 영속 ===')
  await ev(ws, sid, `const b=[...document.querySelectorAll('.seg button.tbtn,button.tbtn')].find(x=>/^논증/.test(x.getAttribute('aria-label')||''));if(b)b.click();return 1`); await sleep(500)
  const claimBefore = await ev(ws, sid, `const m=(document.body.textContent||'').match(/주장 \\(Claims\\) · (\\d+)/);return m?+m[1]:-1`)
  await ev(ws, sid, `const b=[...document.querySelectorAll('button.minibtn')].find(x=>/주장 추가/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const claimAfter = await ev(ws, sid, `const m=(document.body.textContent||'').match(/주장 \\(Claims\\) · (\\d+)/);return m?+m[1]:-1`)
  P('주장 수 before→after(+1 기대)', claimBefore + '→' + claimAfter)
  // 뷰 왕복
  await ev(ws, sid, `const b=[...document.querySelectorAll('button.tbtn')].find(x=>/^에디터/.test(x.getAttribute('aria-label')||''));if(b)b.click();return 1`); await sleep(300)
  await ev(ws, sid, `const b=[...document.querySelectorAll('button.tbtn')].find(x=>/^논증/.test(x.getAttribute('aria-label')||''));if(b)b.click();return 1`); await sleep(400)
  const claimRound = await ev(ws, sid, `const m=(document.body.textContent||'').match(/주장 \\(Claims\\) · (\\d+)/);return m?+m[1]:-1`)
  P('주장 수 왕복 후(영속 기대=after)', claimRound)

  console.log('=== 6) story-tarot 다시 섞기 ===')
  await ev(ws, sid, `window.__openTool('story-tarot');return 1`); await sleep(1200)
  const tBefore = await ev(ws, sid, `const w=document.querySelector('.toolwin');return w?(w.querySelector('.toolwin-body')||w).innerText.replace(/\\s+/g,' ').slice(0,200):'no-win'`)
  await ev(ws, sid, `const w=document.querySelector('.toolwin');const b=[...w.querySelectorAll('button')].find(x=>/다시 섞|섞기/.test(x.textContent||''));if(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click()}return b?'clicked':'no-btn'`); await sleep(600)
  const tAfter = await ev(ws, sid, `const w=document.querySelector('.toolwin');return w?(w.querySelector('.toolwin-body')||w).innerText.replace(/\\s+/g,' ').slice(0,200):'no-win'`)
  P('tarot 변화', tBefore === tAfter ? '변화없음 ⚠' : '변함 ✓')
  P('tarot before', tBefore.slice(0, 80))
  P('tarot after ', tAfter.slice(0, 80))

  ws.close(); process.exit(0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
