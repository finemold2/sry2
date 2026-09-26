// 다크테마 종합 조사: 스냅샷 크래시 재현 + 버튼 대비(안 보이는 버튼) 감사 + CharacterModel 인물사진 검증.
const HUB = 'http://localhost:9222'
const APP = 'http://localhost:4178/'
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
async function getBrowserWs() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _id = 0
function rpc(ws, method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++_id; const msg = { id, method, params: params || {} }; if (sessionId) msg.sessionId = sessionId
    const onMsg = (ev) => { let d; try { d = JSON.parse(ev.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', onMsg); d.error ? reject(new Error(d.error.message)) : resolve(d.result) } }
    ws.addEventListener('message', onMsg); ws.send(JSON.stringify(msg))
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + method)) }, 30000)
  })
}
async function ev(ws, sid, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result?.value
}
const ERRGUARD = `(function(){var eb=document.body&&document.body.innerText||'';return /화면 표시 중 문제가 발생/.test(eb)})()`
async function main() {
  const ws = new WebSocket(await getBrowserWs())
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []
  ws.addEventListener('message', (e) => {
    let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return
    if (d.method === 'Runtime.exceptionThrown') { const x = d.params.exceptionDetails; errs.push('EX: ' + String(x.exception?.description || x.text).split('\n')[0].slice(0, 200)) }
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { errs.push('CE: ' + (d.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200)) }
  })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Page.enable', {}, sid)
  await rpc(ws, 'Page.navigate', { url: APP }, sid)
  await sleep(3500)
  const pass = []; const fail = []
  const ok = (c, m) => (c ? pass : fail).push(m)

  // 다크테마로 전환(테마 토글 버튼 클릭 반복)
  for (let i = 0; i < 3; i++) {
    const t = await ev(ws, sid, `document.documentElement.dataset.theme||'light'`)
    if (t === 'dark') break
    await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/테마/.test(x.getAttribute&&x.getAttribute('title')||''));if(b)b.click()})()`)
    await sleep(300)
  }
  const theme = await ev(ws, sid, `document.documentElement.dataset.theme`)
  ok(theme === 'dark', `다크테마 적용(${theme})`)

  // ── 버튼 대비 감사: 보이는 모든 버튼의 글자색 vs 실제 배경 대비 측정 ──
  const lowContrast = await ev(ws, sid, `(()=>{
    function lum(c){const m=c.match(/[\\d.]+/g);if(!m)return 1;let[r,g,b]=m.map(Number);[r,g,b]=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b}
    function bg(el){let n=el;while(n){const c=getComputedStyle(n).backgroundColor;if(c&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c))return c;n=n.parentElement}return 'rgb(13,15,21)'}
    const out=[];
    document.querySelectorAll('button, .tbtn, .minibtn, .linkbtn, .btn-primary, .btn-ghost').forEach(b=>{
      if(!b.offsetParent)return; const r=b.getBoundingClientRect(); if(r.width<6||r.height<6)return;
      const cs=getComputedStyle(b); const col=cs.color; const back=cs.backgroundColor&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(cs.backgroundColor)?cs.backgroundColor:bg(b);
      const L1=lum(col),L2=lum(back); const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
      if(ratio<2.0){out.push({t:(b.textContent||'').trim().slice(0,16)||'(icon)',cls:(b.className||'').slice(0,30),col,back,ratio:Math.round(ratio*100)/100})}
    });
    return out.slice(0,40)
  })()`)
  ok(Array.isArray(lowContrast) && lowContrast.length === 0, `버튼 대비 — 안 보이는 버튼 ${lowContrast.length}개`)

  // ── 스냅샷 크래시 재현 ──
  // 문서 생성 + 본문 입력
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('title')==='새 텍스트');if(b)b.click()})()`)
  await sleep(400)
  await ev(ws, sid, `window.__scriv&&window.__scriv.setBody&&window.__scriv.setBody('{\\\\rtf1 스냅샷 테스트 본문.\\\\par}')`)
  await sleep(200)
  // (A) 명령 팔레트로 '스냅샷 찍기' → 모달 렌더
  await ev(ws, sid, `document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}))`)
  await sleep(500)
  await ev(ws, sid, `(()=>{const inp=document.querySelector('.cmd-input,input[placeholder]');if(inp){inp.value='스냅샷';inp.dispatchEvent(new Event('input',{bubbles:true}))}})()`)
  await sleep(400)
  await ev(ws, sid, `(()=>{const it=Array.from(document.querySelectorAll('.cmd-item,[role=option],li,button')).find(x=>/스냅샷 찍기/.test(x.textContent||''));if(it)it.click()})()`)
  await sleep(500)
  let crashed = await ev(ws, sid, ERRGUARD)
  ok(!crashed, '명령 팔레트 → 스냅샷 모달(크래시 없음)')
  const modalShown = await ev(ws, sid, `!!Array.from(document.querySelectorAll('.modal h2')).find(h=>/스냅샷/.test(h.textContent||''))`)
  ok(modalShown || crashed, '스냅샷 모달 표시')
  // 실행 버튼 클릭(takeSnapshot)
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('.modal button')).find(x=>/실행/.test(x.textContent||''));if(b)b.click()})()`)
  await sleep(500)
  crashed = await ev(ws, sid, ERRGUARD)
  ok(!crashed, '스냅샷 저장 실행(크래시 없음)')

  // (B) 인스펙터 '스냅샷' 탭 렌더 + 비교
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button,.insp-tabs button,[role=tab]')).find(x=>(x.textContent||'').trim()==='스냅샷'||/스냅샷/.test(x.getAttribute&&x.getAttribute('title')||''));if(b)b.click()})()`)
  await sleep(500)
  crashed = await ev(ws, sid, ERRGUARD)
  ok(!crashed, '인스펙터 스냅샷 탭 렌더(크래시 없음)')
  // 비교 버튼이 있으면 클릭(diff 렌더)
  await ev(ws, sid, `(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/비교/.test(x.textContent||''));if(b)b.click()})()`)
  await sleep(500)
  crashed = await ev(ws, sid, ERRGUARD)
  ok(!crashed, '스냅샷 비교(diff) 렌더(크래시 없음)')

  // ── CharacterModel 인물 사진 검증 ──
  await ev(ws, sid, `window.__openTool&&window.__openTool('character-model')`)
  await sleep(1200)
  // person 모드는 기본. 사진 로드까지 대기(네트워크). 풍경/사물 아닌 commons 또는 dicebear.
  let photoSrc = ''
  for (let i = 0; i < 8; i++) { await sleep(900); photoSrc = await ev(ws, sid, `(document.querySelector('.cmodel-photo')||{}).src||''`); if (photoSrc) break }
  ok(!!photoSrc, `캐릭터모델 사진 로드(${photoSrc.slice(0, 60)})`)
  const credit = await ev(ws, sid, `(document.querySelector('.cmodel-credit')||{}).textContent||''`)
  ok(/Wikidata|Wikimedia|DiceBear|아바타/.test(credit), `사진 출처/라이선스 표기(${credit.slice(0, 50)})`)
  crashed = await ev(ws, sid, ERRGUARD)
  ok(!crashed, 'CharacterModel 크래시 없음')

  console.log('=== 다크테마 종합 조사 ===')
  pass.forEach((p) => console.log('  ✓ ' + p))
  fail.forEach((f) => console.log('  ✗ ' + f))
  if (Array.isArray(lowContrast) && lowContrast.length) {
    console.log('--- 안 보이는(저대비) 버튼 ---')
    lowContrast.forEach((b) => console.log(`  [${b.ratio}] "${b.t}" cls=${b.cls} color=${b.col} bg=${b.back}`))
  }
  console.log(`결과: ${pass.length} 통과 / ${fail.length} 실패`)
  if (errs.length) { console.log('--- 콘솔/예외 ---'); [...new Set(errs)].slice(0, 15).forEach((e) => console.log('  ' + e)) }
  else console.log('콘솔 에러/예외: 없음')
  ws.close()
  process.exit(fail.length ? 1 : 0)
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(2) })
