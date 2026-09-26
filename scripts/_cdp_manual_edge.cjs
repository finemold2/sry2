// 매뉴얼 엣지 케이스 — 템플릿 시작 트랙(뼈대 생성)·Esc 닫기·다크 테마 렌더·자동투어와 충돌 없음.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 1) 매뉴얼 시작 시 자동투어가 같이 떠 충돌하지 않음
  await ev(ws, sid, `window.__startManual();return 1`); await sleep(500)
  t(await ev(ws, sid, `return !!document.querySelector('.manual-bubble')`) && !(await ev(ws, sid, `return !!document.querySelector('.tour-root:not(.manual-root)')`)), '매뉴얼 시작 시 자동 투어와 동시 표시 충돌 없음')

  // 2) 템플릿 트랙: 시작 방식 선택의 2번째('템플릿처럼 뼈대') 클릭 → 1막/2막/3막 + 인물 노트 생성
  await ev(ws, sid, `const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>/다음/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(400) // s0 → s1(choice)
  const choices = await ev(ws, sid, `return document.querySelectorAll('.manual-choice').length`)
  t(choices >= 3, '시작 방식 선택지 3개 이상 표시')
  await ev(ws, sid, `const cs=document.querySelectorAll('.manual-choice');if(cs[1])cs[1].click();return 1`); await sleep(600) // 템플릿 트랙
  const tpl = JSON.parse(await ev(ws, sid, `const es=window.__scriv.entries();return JSON.stringify({막:es.filter(e=>/막 —/.test(e.title||'')).length,인물:es.some(e=>/인물 노트/.test(e.title||''))})`))
  t(tpl.막 >= 3 && tpl.인물, `템플릿 트랙이 뼈대 생성(막 ${tpl.막}개 + 인물 노트 ${tpl.인물})`)

  // 3) Esc 로 닫힘
  await ev(ws, sid, `window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));return 1`); await sleep(400)
  t(!(await ev(ws, sid, `return !!document.querySelector('.manual-root')`)), 'Esc 로 매뉴얼 닫힘')

  // 4) 다크 테마에서 말풍선이 보이게 렌더(배경 불투명 + 텍스트색)
  await ev(ws, sid, `document.documentElement.setAttribute('data-theme','dark');try{localStorage.setItem('sry:theme','dark')}catch(e){}; return 1`); await sleep(200)
  await ev(ws, sid, `window.__startManual();return 1`); await sleep(500)
  const dark = JSON.parse(await ev(ws, sid, `const b=document.querySelector('.manual-bubble');if(!b)return JSON.stringify({no:1});const cs=getComputedStyle(b);return JSON.stringify({bg:cs.backgroundColor,color:cs.color})`))
  const opaque = dark.bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(dark.bg)
  t(opaque, '다크 테마에서 말풍선 배경 불투명(가독성, bg=' + dark.bg + ')')
  await ev(ws, sid, `const b=[...document.querySelectorAll('.manual-bubble button')].find(x=>/그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)

  t(exc.length === 0, '콘솔에러/예외 없음(' + exc.length + ')')
  console.log('=== 매뉴얼 엣지 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
