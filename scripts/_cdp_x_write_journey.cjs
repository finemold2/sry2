// 글쓰기 여정(실제 타이핑) 실사용 베타 — 코드리뷰가 아니라 '사용자가 실제로 글을 쓰는 상황'을 그대로 재현.
//  타이핑(Input.insertText)·Enter 로 문단 완성 → 굵게/기울임(Ctrl+B/Ctrl+I 단축키)·제목/목록/줄간격(포맷바)
//  → 붙여넣기 → 실행취소/재실행(Ctrl+Z/Y) → 저장 표시(변경됨→저장됨) → 뷰 왕복/리로드 후 본문·서식 유지 → 빈 문서 안내.
// '상식적으로 당연한데 안 되는 것'을 잡아내고, 위반 시 console.log("[ISSUE] ...") 로 출력(실패로 카운트). 단언 12개 이상.
//  ⚠ Input 도메인(실제 키/텍스트)을 쓰므로 Runtime.enable 은 호출하지 않는다(타임아웃 방지). 드래그 없음.
//  타깃: Target.createTarget({url:'http://localhost:4178/'}) 직접 + attachToTarget flatten(about:blank+navigate 금지).
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
// async 래퍼 + awaitPromise → 동기/비동기 코드 모두 await. 페이지 예외는 exceptionDetails 로 throw.
async function ev(ws, sid, x) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: '(async()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid)
  if (r.exceptionDetails) throw new Error('PAGE:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '').split('\n')[0])
  return r.result && r.result.value
}

// 페이지에 안정 조작 헬퍼(__wj) 주입 — 스킨 무관(.paper/.formatbar/.binder 는 공유 컴포넌트).
const INJECT = `
window.__wj = {
  paper(){ return document.querySelector('.paper'); },
  ensurePaper(){ if(this.paper()) return true; var rows=[].slice.call(document.querySelectorAll('.binder-row,.binder-tree [role="treeitem"],.binder-tree button')); for(var i=0;i<rows.length;i++){ try{rows[i].click();}catch(e){} if(this.paper()) return true; } return !!this.paper(); },
  focus(){ var p=this.paper(); if(p) p.focus(); return !!p; },
  reset(text){ var p=this.paper(); if(!p) return 'nopaper'; p.focus(); p.innerHTML='<p id="wjp">'+text+'</p>'; p.dispatchEvent(new Event('input',{bubbles:true})); this.selAll(); return 'ok'; },
  empty(){ var p=this.paper(); if(!p) return 'nopaper'; p.focus(); p.innerHTML='<p id="wjp"><br></p>'; p.dispatchEvent(new Event('input',{bubbles:true})); this.caretStart(); return 'ok'; },
  selAll(){ var n=document.getElementById('wjp')||(this.paper()&&this.paper().firstElementChild); if(!n) return 'no'; var r=document.createRange(); r.selectNodeContents(n); var s=getSelection(); s.removeAllRanges(); s.addRange(r); this.paper().focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  caretStart(){ var n=document.getElementById('wjp')||(this.paper()&&this.paper().firstElementChild); if(!n) return 'no'; var r=document.createRange(); r.selectNodeContents(n); r.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(r); this.paper().focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  caretEnd(){ var p=this.paper(); if(!p) return 'no'; var r=document.createRange(); r.selectNodeContents(p); r.collapse(false); var s=getSelection(); s.removeAllRanges(); s.addRange(r); p.focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; },
  selToken(tok){ var p=this.paper(); if(!p) return 'no'; var w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT,null); var node; while((node=w.nextNode())){ var idx=(node.textContent||'').indexOf(tok); if(idx>=0){ var r=document.createRange(); r.setStart(node,idx); r.setEnd(node,idx+tok.length); var s=getSelection(); s.removeAllRanges(); s.addRange(r); this.paper().focus(); document.dispatchEvent(new Event('selectionchange')); return 'ok'; } } return 'notfound'; },
  fbtn(sub){ var b=[].slice.call(document.querySelectorAll('.formatbar button')).find(function(x){return (x.title||'').indexOf(sub)>=0;}); if(!b) return 'no:'+sub; b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); b.click(); return 'ok'; },
  fsel(titleSub,v){ var s=[].slice.call(document.querySelectorAll('.formatbar select')).find(function(x){return (x.title||'').indexOf(titleSub)>=0;}); if(!s) return 'no:'+titleSub; s.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); var setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set; setter.call(s,v); s.dispatchEvent(new Event('change',{bubbles:true})); return 'ok'; },
  btnActive(sub){ var b=[].slice.call(document.querySelectorAll('.formatbar button')).find(function(x){return (x.title||'').indexOf(sub)>=0;}); return !!(b && (' '+b.className+' ').indexOf(' active')>=0 || (b && (b.className||'').indexOf('active')>=0)); },
  qstate(c){ try{ return document.queryCommandState(c); }catch(e){ return false; } },
  html(){ return this.paper()? this.paper().innerHTML : ''; },
  text(){ return this.paper()? (this.paper().textContent||'') : ''; },
  blocks(){ var p=this.paper(); if(!p) return 0; return p.querySelectorAll(':scope>p,:scope>div,:scope>h1,:scope>h2,:scope>h3,:scope>h4,:scope>ul,:scope>ol,:scope>blockquote,:scope>li').length; },
  blur(){ var p=this.paper(); if(p) p.blur(); return 1; },
  saveText(){ var els=[].slice.call(document.querySelectorAll('[role="status"],[aria-live]')); for(var i=0;i<els.length;i++){ var t=(els[i].textContent||'').replace(/\\s+/g,' ').trim(); if(/저장됨|변경됨|저장 실패/.test(t)) return t; } return ''; },
  dirty(){ try{ return !!(window.__scriv && window.__scriv.state().dirty); }catch(e){ return false; } },
  newFolder(){ var b=[].slice.call(document.querySelectorAll('.binder button')).find(function(x){return (x.title||'')==='새 폴더';}); if(!b) return 'no'; b.click(); return 'ok'; },
  binderShown(){ return !!document.querySelector('.binder'); },
  emptyHints(){ return [].slice.call(document.querySelectorAll('.empty-hint')).map(function(h){return (h.textContent||'').trim();}).join(' | '); },
  // 붙여넣기: 실제 onPaste 핸들러를 발화(이미지가 아닌 평문은 통과시켜야 함; clipboardData null 안전성도 점검)
  // 합성 paste 는 기본 동작(삽입)이 안 일어나므로 평문 붙여넣기의 브라우저 기본을 execCommand 로 보완한다.
  pastePlain(txt){ var p=this.paper(); if(!p) return 'no'; p.focus(); var threw=false, evp; try{ evp=new ClipboardEvent('paste',{bubbles:true,cancelable:true}); }catch(e){ evp=new Event('paste',{bubbles:true,cancelable:true}); } try{ p.dispatchEvent(evp); }catch(e){ threw=true; } try{ document.execCommand('insertText',false,txt); }catch(e){} p.dispatchEvent(new Event('input',{bubbles:true})); return threw?'threw':'ok'; }
};
return 'inj';`

// RTF 헤더(폰트/색/스타일시트)에 들어가는 \\b 등을 본문 서식과 구분하기 위해 본문 구간만 잘라낸다.
function rtfBody(r) { if (!r) return ''; const i = r.indexOf('\\f0\\fs24'); return i >= 0 ? r.slice(i + 8) : r }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r) => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })

  // ── 실제 키보드/텍스트 입력(Input 도메인) ──
  const key = async (mods, vk, code, k) => {
    const base = { modifiers: mods, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key: k }
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', ...base }, sid)
    await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base }, sid)
  }
  const insertText = (txt) => rpc(ws, 'Input.insertText', { text: txt }, sid)
  const ctrlB = () => key(2, 66, 'KeyB', 'b')   // 굵게(브라우저 기본 단축키 — 앱이 가로채지 않음)
  const ctrlI = () => key(2, 73, 'KeyI', 'i')   // 기울임
  const ctrlZ = () => key(2, 90, 'KeyZ', 'z')   // 실행취소
  const ctrlY = () => key(2, 89, 'KeyY', 'y')   // 재실행
  const ctrlS = () => key(2, 83, 'KeyS', 's')   // 저장
  const enter = () => key(0, 13, 'Enter', 'Enter')

  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }
  const TA = async (fn, msg) => { try { t(await fn(), msg) } catch (e) { t(false, msg + ' [ERR ' + e.message + ']') } }
  const wj = (expr) => ev(ws, sid, 'return window.__wj.' + expr)
  const html = () => ev(ws, sid, 'return window.__wj.html()')
  const text = () => ev(ws, sid, 'return window.__wj.text()')
  const rtf = async (docId) => (await ev(ws, sid, 'return (window.__scriv&&window.__scriv.bodyOf(' + JSON.stringify(docId) + '))||""')) || ''
  const waitFor = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { try { if (await fn()) return true } catch { /* re */ } await sleep(150) } return false }
  const closeWelcome = async () => {
    for (let i = 0; i < 2; i++) {
      await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")
      await sleep(300)
    }
  }
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__openTool==='function'")) return true } catch { /* loading */ } } return false }

  // ── 부트 ──
  t(await waitHook(), '앱 로드 + 테스트 훅(__setView/__scriv) 준비')
  await closeWelcome()
  await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(150)
  await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(350)
  await ev(ws, sid, INJECT); await sleep(50)
  const hasPaper = await wj('ensurePaper()'); await sleep(300)
  t(!!hasPaper, '에디터 본문(.paper) 준비 — 글을 쓸 캔버스가 보임')
  if (!hasPaper) { return finish() }
  const docId = await ev(ws, sid, 'return (window.__scriv&&window.__scriv.state().activeId)||""')

  // ============================================================
  // [A] 포맷바·편집 동작 묶음 (각 동작마다 알려진 내용으로 reset 후 1개 동작 → 결과 단언)
  // ============================================================

  // A1) 제목(포맷바 문단 스타일 → 제목 2) → <h2>
  await wj("reset('제목 표본 문장')"); await sleep(150)
  await wj("fsel('문단 스타일','h2')"); await sleep(300)
  await TA(async () => /<h2[\s>]/i.test(await html()), '포맷바 문단스타일 → 제목2(<h2>) 적용')

  // A2) 글머리 기호(불릿) → <ul><li>
  await wj("reset('불릿 항목 문장')"); await sleep(150)
  await wj("fbtn('글머리 기호')"); await sleep(300)
  await TA(async () => /<ul[\s>]/i.test(await html()) && /<li[\s>]/i.test(await html()), '포맷바 글머리 기호 → 불릿 목록(<ul><li>) 적용')

  // A3) 번호 매기기 → <ol><li>
  await wj("reset('번호 항목 문장')"); await sleep(150)
  await wj("fbtn('번호 매기기')"); await sleep(300)
  await TA(async () => /<ol[\s>]/i.test(await html()) && /<li[\s>]/i.test(await html()), '포맷바 번호 매기기 → 번호 목록(<ol><li>) 적용')

  // A4) 줄간격(글 선택 후 1.5) → 해당 블록 line-height 1.5 (시각적으로 반영)
  await wj("reset('줄간격 표본 문장')"); await sleep(120)
  await wj("selAll()"); await sleep(120)
  await wj("fsel('줄 간격','1.5')"); await sleep(300)
  await TA(async () => /line-height\s*:\s*1\.5/i.test(await html()), '포맷바 줄간격 1.5 → 선택 문단에 줄간격 반영')

  // A5) 붙여넣기(평문) — onPaste 핸들러 안전 통과 + 캐럿 위치 삽입 + RTF 영속
  await wj("reset('PBASE')"); await sleep(120)
  await wj("caretEnd()"); await sleep(80)
  const pasteRes = await wj("pastePlain('PASTECLIPXX')"); await sleep(350)
  await TA(async () => (await text()).indexOf('PASTECLIPXX') >= 0 && pasteRes !== 'threw', '붙여넣기 → 본문에 텍스트 삽입(onPaste 핸들러 예외 없음)')
  await TA(async () => rtfBody(await rtf(docId)).indexOf('PASTECLIPXX') >= 0, '붙여넣은 텍스트가 RTF 본문에 영속')

  // A6) 실행취소(Ctrl+Z) — 방금 입력한 텍스트가 사라짐 (입력이 마지막 작업이라 원자적)
  await wj("reset('ZBASE')"); await sleep(120)
  await wj("caretEnd()"); await sleep(80)
  await insertText('UNDOTOKZ'); await sleep(300)
  const typedZ = (await text()).indexOf('UNDOTOKZ') >= 0
  await ctrlZ(); await sleep(400)
  const afterUndo = (await text()).indexOf('UNDOTOKZ') >= 0
  t(typedZ && !afterUndo, '실행취소 Ctrl+Z → 방금 입력 사라짐 (입력=' + typedZ + ' → 취소=' + !afterUndo + ')')

  // A7) 재실행(Ctrl+Y) — 취소한 입력 복원
  await ctrlY(); await sleep(400)
  const afterRedo = (await text()).indexOf('UNDOTOKZ') >= 0
  t(!afterUndo && afterRedo, '재실행 Ctrl+Y → 취소한 입력 복원 (복원=' + afterRedo + ')')

  // ============================================================
  // [B] 실제 글쓰기 여정 — 타이핑→문단 완성→굵게/기울임(단축키)→저장표시→뷰왕복→리로드 영속
  // ============================================================
  const MARK = 'WJMARK' + (Date.now() % 100000)
  const BLD = 'WJBOLD', ITL = 'WJITAL'
  const SENT1 = '오늘은 새 글을 시작한다 ' + BLD + ' 그리고 ' + ITL + ' 또한 ' + MARK + ' 로 표시한다.'
  const SENT2 = '두 번째 문단으로 이야기를 이어서 완성한다.'

  // B1) 빈 문서에 한국어 문장을 실제로 타이핑(Input.insertText)
  await wj("empty()"); await sleep(150)
  await wj("caretStart()"); await sleep(80)
  await insertText(SENT1); await sleep(350)
  await TA(async () => { const x = await text(); return x.indexOf('오늘은 새 글을 시작한다') >= 0 && x.indexOf(MARK) >= 0 && x.indexOf(BLD) >= 0 }, '한국어 문장 타이핑 → 본문에 그대로 표시')

  // B2) Enter 로 새 문단 만들고 둘째 문장 타이핑 → 문단 완성(다문단)
  await wj("caretEnd()"); await sleep(80)
  await enter(); await sleep(180)
  await insertText(SENT2); await sleep(350)
  await TA(async () => { const x = await text(); return x.indexOf('두 번째 문단으로') >= 0 && (await wj('blocks()')) >= 2 }, 'Enter 로 새 문단 → 둘째 문장 완성(문단 2개 이상)')

  // B3) 굵게 — 단어 선택 후 Ctrl+B(단축키) → DOM 굵게 + RTF \b 영속
  await wj("selToken('" + BLD + "')"); await sleep(120)
  await ctrlB(); await sleep(300)
  await TA(async () => /<(b|strong)[\s>]|font-weight\s*:\s*(bold|700)/i.test(await html()) && /\\b(?![a-z])/.test(rtfBody(await rtf(docId))), '굵게 Ctrl+B(단축키) → DOM 굵게 + RTF \\b 영속')

  // B4) 굵게 선택 유지 중 포맷바가 현재 서식을 반영(굵게 버튼 active) — 상식적 UX
  await ev(ws, sid, "document.dispatchEvent(new Event('selectionchange'));return 1"); await sleep(250)
  await TA(async () => (await wj("qstate('bold')")) === true && (await wj("btnActive('굵게')")) === true, '굵은 글자 선택 시 포맷바 ‘굵게’ 버튼이 눌림(active) 상태로 표시')

  // B5) 기울임 — 단어 선택 후 Ctrl+I(단축키) → DOM 기울임 + RTF \i 영속
  await wj("selToken('" + ITL + "')"); await sleep(120)
  await ctrlI(); await sleep(300)
  await TA(async () => /<(i|em)[\s>]|font-style\s*:\s*italic/i.test(await html()) && /\\i(?![a-z])/.test(rtfBody(await rtf(docId))), '기울임 Ctrl+I(단축키) → DOM 기울임 + RTF \\i 영속')

  // B6) 저장 표시 — 편집하면 '변경됨'(미저장) 표시가 떠야 한다
  await wj("caretEnd()"); await sleep(80)
  await insertText(' '); await sleep(350)
  await TA(async () => /변경됨/.test(await wj('saveText()')) || (await wj('dirty()')) === true, '편집 직후 저장 상태에 ‘변경됨’ 표시(미저장 인디케이터)')

  // B7) 저장 표시 — 저장(Ctrl+S/자동저장) 후 '저장됨' 표시가 떠야 한다
  await ctrlS()
  await TA(async () => waitFor(async () => /저장됨/.test(await wj('saveText()')), 6000), '저장 후 저장 상태에 ‘저장됨’ 표시')

  // B8) 뷰 왕복(코르크보드↔에디터) 후 본문·서식 유지
  await wj("blur()"); await sleep(300) // onBlur 커밋
  await ev(ws, sid, "window.__setView('corkboard');return 1"); await sleep(450)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(550)
  await TA(async () => { const x = await text(); return x.indexOf(MARK) >= 0 && x.indexOf('오늘은 새 글을 시작한다') >= 0 }, '뷰 왕복(코르크보드→에디터) 후 본문 텍스트 유지')
  await TA(async () => /<(b|strong)[\s>]|font-weight\s*:\s*(bold|700)/i.test(await html()), '뷰 왕복 후 굵게 서식 유지(RTF→재로딩 보존)')

  // B9) 리로드(IndexedDB 영속) 후 본문·서식 유지 — 새로고침해도 원고가 사라지지 않아야 한다
  await waitFor(async () => (await wj('dirty()')) === false, 6000); await sleep(400)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1600)
  const reloaded = await waitHook()
  t(reloaded, '리로드 후 앱 재기동 + 훅 준비')
  if (reloaded) {
    await closeWelcome()
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(150)
    await ev(ws, sid, INJECT); await sleep(50)
    // 활성 문서가 달라질 수 있으므로 전체 문서 본문에서 마커를 검색(가장 견고).
    const found = await ev(ws, sid, "var es=window.__scriv.entries();for(var i=0;i<es.length;i++){var b=window.__scriv.bodyOf(es[i].id)||'';if(b.indexOf('" + MARK + "')>=0)return JSON.stringify({id:es[i].id,b:b});}return ''")
    let entry = null; try { entry = found ? JSON.parse(found) : null } catch { entry = null }
    t(!!entry, '리로드 후 본문 영속 — 타이핑한 원고(마커)가 IndexedDB 에 보존됨')
    t(!!entry && /\\b(?![a-z])/.test(rtfBody(entry.b)) && entry.b.indexOf(BLD) >= 0, '리로드 후 굵게 서식 영속 — RTF 본문에 \\b 보존')
  }

  // ============================================================
  // [C] 빈 문서 안내 — 빈 상태에는 안내가 보여야 한다
  // ============================================================
  await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(300)
  if (!(await wj('binderShown()'))) { await key(2 | 8, 66, 'KeyB', 'b'); await sleep(300) } // 바인더 숨김이면 ⌘⇧B 로 표시
  const nf = await wj('newFolder()'); await sleep(500)
  if (nf === 'ok') {
    await TA(async () => /텍스트 문서가 없|문서를 선택하거나 새로 만드세요/.test(await wj('emptyHints()')), '빈 폴더(새 Scrivenings) → ‘텍스트 문서가 없습니다’ 안내 노출')
  } else {
    t(false, '빈 문서 안내 점검 불가 — 바인더 ‘새 폴더’ 버튼을 찾지 못함')
  }

  return finish()

  function finish() {
    console.log('=== 글쓰기 여정(실제 타이핑) 실사용 베타 ===')
    ok.forEach((m) => console.log('  ✓ ' + m))
    bad.forEach((m) => console.log('  ✗ ' + m))
    console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
    ws.close()
    process.exit(bad.length ? 1 : 0)
  }
}
main().catch((e) => { console.log('FATAL', e.message); process.exit(2) })
