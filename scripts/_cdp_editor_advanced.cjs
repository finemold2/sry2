// 에디터 고급 서식/삽입 실동작 검증(양 스킨) — 실제 사용자처럼 선택/캐럿/버튼/단축키를 조작해
// 결과(DOM 변화 + bodyRtf 영속)를 확인한다. 코드리뷰가 아니라 '조작→원하는 결과'만 단언.
//  · 실행취소(Ctrl+Z)/재실행(Ctrl+Y): 실제 키 입력(Input.dispatchKeyEvent) + Input.insertText.
//  · 링크/각주/미주/코멘트/인라인 이미지/서식지우기/들여쓰기·내어쓰기/목록 중첩/위·아래첨자/형광펜/글꼴.
//  · 한글은 RTF 에서 \u 이스케이프이므로, 노트/마커 텍스트는 ASCII 로 넣고 제어어(\chftn,\pict,HYPERLINK 등)로 단언.
//  ⚠ Input 도메인을 쓰므로 Runtime.enable 은 호출하지 않는다(콘솔에러 캡처 대신 동작 단언에 집중).
const HUB = 'http://localhost:9222'
let _id = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) {
  return new Promise((res, rej) => {
    const id = ++_id
    const msg = { id, method: m, params: p || {} }
    if (sid) msg.sessionId = sid
    const on = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }
    ws.addEventListener('message', on)
    ws.send(JSON.stringify(msg))
    setTimeout(() => rej(new Error('to@' + m)), 15000)
  })
}
// 모든 평가는 async 래퍼 + awaitPromise → 동기/비동기 코드 모두 await 가능.
async function ev(ws, sid, x) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: '(async()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text))
  return r.result && r.result.value
}

// 1x1 투명 PNG dataURL(작은 인라인 이미지)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC'

// 페이지에 조작 헬퍼(__qa) 주입 — 스킨 무관하게 안정 조작.
const INJECT = `
window.__qa = {
  paper(){ return document.querySelector('.paper'); },
  ensurePaper(){ if(this.paper()) return true; const rows=[...document.querySelectorAll('.binder-row')]; for(const r of rows){ r.click(); if(document.querySelector('.paper')) return true; } return !!document.querySelector('.paper'); },
  setHTML(h){ const p=this.paper(); if(!p) return 'nopaper'; p.focus(); p.innerHTML=h; p.dispatchEvent(new Event('input',{bubbles:true})); return 'ok'; },
  reset(text){ const r=this.setHTML('<p id="qtp">'+text+'</p>'); if(r!=='ok') return r; this.selAll(); return 'ok'; },
  selAll(){ const n=document.getElementById('qtp')||(this.paper()&&this.paper().firstChild); if(!n) return 'no'; const rg=document.createRange(); rg.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  caretEnd(){ const p=this.paper(); if(!p) return 'no'; const rg=document.createRange(); rg.selectNodeContents(p); rg.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); p.focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  caretIn(sel){ const n=document.querySelector(sel); if(!n) return 'no'; const rg=document.createRange(); rg.selectNodeContents(n); rg.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); this.paper().focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  btn(sub){ const b=[...document.querySelectorAll('.formatbar button')].find(x=>(x.title||'').indexOf(sub)>=0); if(!b) return 'no:'+sub; b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); b.click(); return 'ok'; },
  sel(titleSub,v){ const s=[...document.querySelectorAll('.formatbar select')].find(x=>(x.title||'').indexOf(titleSub)>=0); if(!s) return 'no'; s.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); const setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set; setter.call(s,v); s.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'; },
  color(titleSub,v){ const lab=[...document.querySelectorAll('.formatbar label')].find(x=>(x.title||'').indexOf(titleSub)>=0); if(!lab) return 'no'; lab.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); const inp=lab.querySelector('input[type=color]'); if(!inp) return 'noinp'; const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(inp,v); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'; },
  setPrompt(v){ window.prompt=function(){return v;}; window.confirm=function(){return true;}; window.alert=function(){}; return 'ok'; },
  html(){ return this.paper()? this.paper().innerHTML : ''; },
  rtf(){ try{ return window.__scriv.bodyOf(window.__scriv.state().activeId)||''; }catch(e){ return ''; } },
  async dropImg(u){ const blob=await (await fetch(u)).blob(); const f=new File([blob],'q.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(f); const p=this.paper(); this.caretEnd(); const e=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}); p.dispatchEvent(e); return f.size; }
};
return 'injected';`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // #27: 편집(dirty) 후 Page.navigate 시 앱의 beforeunload(원고 안전) 다이얼로그가 헤드리스 navigate 를 막아 timeout → 자동 수락
  await rpc(ws, 'Page.enable', {}, sid)
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })

  // 실제 키보드/텍스트 입력(Input 도메인) — Runtime.enable 미사용으로 타임아웃 없음.
  const key = async (mods, vk, code, k) => {
    const base = { modifiers: mods, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key: k }
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sid)
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sid)
  }
  const insertText = (txt) => rpc(ws, 'Input.insertText', { text: txt }, sid)
  const ctrlZ = () => key(2, 90, 'KeyZ', 'z') // 실행취소
  const ctrlY = () => key(2, 89, 'KeyY', 'y') // 재실행

  const ok = [], bad = []
  const t = (c, m) => (c ? ok : bad).push(m)

  const html = () => ev(ws, sid, 'return window.__qa.html()')
  const rtf = () => ev(ws, sid, 'return window.__qa.rtf()')
  // RTF 헤더(폰트/색/스타일시트)에 들어가는 \b 등과 본문 서식을 구분하기 위해 본문 구간만 잘라낸다.
  const bodyOf = (r) => { const i = r.indexOf('\\f0\\fs24'); return i >= 0 ? r.slice(i + 8) : r }

  const waitHook = async () => {
    for (let i = 0; i < 30; i++) {
      await sleep(400)
      try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ }
    }
    return false
  }

  async function suite(skin) {
    // 환영/투어 닫기
    await ev(ws, sid, "var b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1"); await sleep(350)
    await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(350)
    await ev(ws, sid, INJECT); await sleep(50)
    const hasPaper = await ev(ws, sid, 'return window.__qa.ensurePaper()'); await sleep(250)
    t(!!hasPaper, `[${skin}] 에디터 본문(.paper) 준비`)
    if (!hasPaper) return

    // 1) 링크 삽입 — 선택 후 '링크' → <a href> + RTF HYPERLINK/URL
    await ev(ws, sid, "return window.__qa.reset('LINKTEXT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.setPrompt('https://ex.test/LINKXYZ')")
    await ev(ws, sid, "return window.__qa.btn('링크')"); await sleep(350)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/<a[^>]+href=["']?https:\/\/ex\.test\/LINKXYZ/i.test(h) && b.includes('HYPERLINK') && r.includes('LINKXYZ'),
        `[${skin}] 링크 삽입(DOM <a> + RTF HYPERLINK 영속)`)
    }

    // 2) 각주 삽입 — 캐럿에 각주 마커 + RTF \chftn/\footnote/노트
    await ev(ws, sid, "return window.__qa.reset('FNBODY')"); await sleep(80)
    await ev(ws, sid, "return window.__qa.caretEnd()"); await sleep(80)
    await ev(ws, sid, "return window.__qa.setPrompt('FNOTEXYZ')")
    await ev(ws, sid, "return window.__qa.btn('각주 삽입')"); await sleep(350)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/class="fn-marker"/.test(h) && b.includes('\\chftn') && b.includes('\\footnote') && r.includes('FNOTEXYZ'),
        `[${skin}] 각주 삽입(fn-marker + RTF \\footnote 영속)`)
    }

    // 3) 미주 삽입 — RTF \ftnalt(미주 표시) + 노트
    await ev(ws, sid, "return window.__qa.reset('ENBODY')"); await sleep(80)
    await ev(ws, sid, "return window.__qa.caretEnd()"); await sleep(80)
    await ev(ws, sid, "return window.__qa.setPrompt('ENOTEXYZ')")
    await ev(ws, sid, "return window.__qa.btn('미주 삽입')"); await sleep(350)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/class="fn-marker"[^>]*data-kind="endnote"/.test(h) && b.includes('\\ftnalt') && r.includes('ENOTEXYZ'),
        `[${skin}] 미주 삽입(endnote 마커 + RTF \\ftnalt 영속)`)
    }

    // 4) 코멘트(주석) 삽입 — cmt-marker + RTF \chatn/\annotation/노트
    await ev(ws, sid, "return window.__qa.reset('CMBODY')"); await sleep(80)
    await ev(ws, sid, "return window.__qa.caretEnd()"); await sleep(80)
    await ev(ws, sid, "return window.__qa.setPrompt('CMTXYZ')")
    await ev(ws, sid, "return window.__qa.btn('코멘트')"); await sleep(350)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/class="cmt-marker"/.test(h) && b.includes('\\chatn') && b.includes('\\annotation') && r.includes('CMTXYZ'),
        `[${skin}] 코멘트 삽입(cmt-marker + RTF \\annotation 영속)`)
    }

    // 5) 인라인 이미지(작은 dataURL 드롭) — <img data:image> + RTF \pict\pngblip
    await ev(ws, sid, "return window.__qa.reset('IMG')"); await sleep(80)
    await ev(ws, sid, `return await window.__qa.dropImg(${JSON.stringify(PNG)})`); await sleep(600)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/<img[^>]+src="data:image\//i.test(h) && b.includes('\\pict') && b.includes('pngblip'),
        `[${skin}] 인라인 이미지 삽입(DOM <img> + RTF \\pict 영속)`)
    }

    // 6) 위첨자 — <sup> + RTF \super
    await ev(ws, sid, "return window.__qa.reset('SUPTXT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.btn('위첨자')"); await sleep(300)
    {
      const h = await html(), b = bodyOf(await rtf())
      t((/<sup>/i.test(h) || /vertical-align\s*:\s*super/i.test(h)) && /\\super(?![a-z])/.test(b), `[${skin}] 위첨자(DOM <sup> + RTF \\super 영속)`)
    }

    // 7) 아래첨자 — <sub> + RTF \sub
    await ev(ws, sid, "return window.__qa.reset('SUBTXT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.btn('아래첨자')"); await sleep(300)
    {
      const h = await html(), b = bodyOf(await rtf())
      t((/<sub>/i.test(h) || /vertical-align\s*:\s*sub/i.test(h)) && /\\sub(?![a-z])/.test(b), `[${skin}] 아래첨자(DOM <sub> + RTF \\sub 영속)`)
    }

    // 8) 형광펜 — 선택 영역에 배경색 + RTF \highlight
    await ev(ws, sid, "return window.__qa.reset('HLTXT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.color('형광펜','#22ff44')"); await sleep(300)
    {
      const h = await html(), b = bodyOf(await rtf())
      t(/background-color/i.test(h) && /\\highlight\d/.test(b), `[${skin}] 형광펜(DOM 배경색 + RTF \\highlight 영속)`)
    }

    // 9) 글꼴 변경(Batang) — span font-family + RTF fonttbl/\\fN
    await ev(ws, sid, "return window.__qa.reset('FONTTXT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.sel('글꼴','Batang')"); await sleep(300)
    {
      const h = await html(), r = await rtf(), b = bodyOf(r)
      t(/font-family[^;"']*Batang/i.test(h) && r.includes('Batang') && /\\f[1-9]/.test(b),
        `[${skin}] 글꼴 변경(DOM font-family + RTF 폰트테이블 영속)`)
    }

    // 10) 서식 지우기 — 굵게 적용 후 선택 영역 서식 제거(DOM에서 굵게 사라짐)
    await ev(ws, sid, "return window.__qa.reset('CLR')"); await sleep(100)
    await ev(ws, sid, "return window.__qa.btn('굵게')"); await sleep(250)
    const boldOn = /<(b|strong)>|font-weight\s*:\s*(bold|700)/i.test(await html())
    await ev(ws, sid, "return window.__qa.selAll()"); await sleep(100)
    await ev(ws, sid, "return window.__qa.btn('서식 지우기')"); await sleep(300)
    const boldOff = !/<(b|strong)>|font-weight\s*:\s*(bold|700)/i.test(await html())
    t(boldOn && boldOff, `[${skin}] 서식 지우기(굵게 적용→제거: ${boldOn}→${!boldOff ? '잔존' : '제거'})`)

    // 11) 들여쓰기 늘리기 — RTF \li 생성
    await ev(ws, sid, "return window.__qa.reset('INDENT')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.btn('들여쓰기 늘리기')"); await sleep(300)
    const inHasLi = /\\li\d/.test(bodyOf(await rtf()))
    t(inHasLi, `[${skin}] 들여쓰기 늘리기(RTF \\li 영속)`)

    // 12) 내어쓰기(들여쓰기 줄이기) — \li 제거
    await ev(ws, sid, "return window.__qa.selAll()"); await sleep(100)
    await ev(ws, sid, "return window.__qa.btn('들여쓰기 줄이기')"); await sleep(300)
    const outHasLi = /\\li\d/.test(bodyOf(await rtf()))
    t(inHasLi && !outHasLi, `[${skin}] 내어쓰기(\\li 제거: ${inHasLi}→${outHasLi ? '잔존' : '제거'})`)

    // 13) 목록 중첩 — 두 항목 중 둘째를 들여써 중첩 ul + RTF \li1440(2단계)
    await ev(ws, sid, "return window.__qa.setHTML('<ul><li>L1</li><li id=\\\"li2\\\">L2</li></ul>')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.caretIn('#li2')"); await sleep(100)
    await ev(ws, sid, "return window.__qa.btn('들여쓰기 늘리기')"); await sleep(300)
    {
      const nested = await ev(ws, sid, "return !!document.querySelector('.paper ul ul, .paper ol ol, .paper ul ol, .paper ol ul')")
      const b = bodyOf(await rtf())
      t(nested && b.includes('\\li1440'), `[${skin}] 목록 중첩(중첩 <ul> + RTF \\li1440 영속, nested=${nested})`)
    }

    // 14) 실행취소(Ctrl+Z) — 실제 텍스트 입력 후 취소되어 사라짐
    await ev(ws, sid, "return window.__qa.reset('BASEZZ')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.caretEnd()"); await sleep(120)
    await insertText('UNDOZ'); await sleep(250)
    const typed = (await html()).includes('UNDOZ')
    await ctrlZ(); await sleep(350)
    const afterUndo = (await html()).includes('UNDOZ')
    t(typed && !afterUndo, `[${skin}] 실행취소 Ctrl+Z(입력 ${typed}→취소 ${!afterUndo})`)

    // 15) 재실행(Ctrl+Y) — 취소한 입력 복원
    await ctrlY(); await sleep(350)
    const afterRedo = (await html()).includes('UNDOZ')
    t(!afterUndo && afterRedo, `[${skin}] 재실행 Ctrl+Y(취소 ${!afterUndo}→복원 ${afterRedo})`)

    // 16) RTF→재로딩 영속 — 굵게 저장 후 뷰 왕복(언마운트/재마운트) 뒤에도 굵게 유지
    await ev(ws, sid, "return window.__qa.reset('PERSISTZ')"); await sleep(120)
    await ev(ws, sid, "return window.__qa.btn('굵게')"); await sleep(400)
    await ev(ws, sid, "window.__setView('corkboard');return 1"); await sleep(300)
    await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(450)
    {
      const h = await html()
      t(/<strong>/.test(h) && h.includes('PERSISTZ'), `[${skin}] RTF 재로딩 영속(뷰 왕복 후 굵게 잔존)`)
    }
  }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1600)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    const loaded = await waitHook()
    t(loaded, `[${skin}] 앱 로드 + 테스트 훅 준비`)
    if (loaded) await suite(skin)
  }

  console.log('=== 에디터 고급 서식/삽입 실동작 검증(양 스킨) ===')
  ok.forEach((m) => console.log('  ✓ ' + m))
  bad.forEach((m) => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close()
  process.exit(bad.length ? 1 : 0)
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
