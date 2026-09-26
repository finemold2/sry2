// 찾기·바꾸기 실동작 검증 — 사용자가 ⌘F 로 찾기바를 열고 매치 이동/단일·전체 바꾸기/대소문자·단어 토글,
// 그리고 프로젝트 전체 찾아바꾸기 모달까지 '조작 → 본문이 실제로 바뀌는지'를 .paper 렌더 텍스트와
// 뷰 왕복(스토어 영속)으로 단언한다. 코드리뷰가 아니라 실사용 인터랙션. 양 스킨(classic/studio).
//
// 주의: 한글은 RTF 직렬화 시 \uN? 로 인코딩되므로 __scriv.bodyOf 의 원시 RTF 문자열에서 한글을 찾지 않는다.
//       대신 사용자가 보는 .paper 의 textContent(렌더 결과)와, 뷰 전환 후 재마운트(스토어→RTF→렌더) 잔존으로
//       '본문이 실제로 바뀌고 저장되었는지'를 검증한다.
// 드래그(Input)를 쓰지 않는 클릭/입력 테스트이므로 콘솔 캡처용 Runtime.enable 사용 OK.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 본문(연속 RTF). 고양이 3회, apple(대소문자무시) 5회 / apple(대소문자구분) 3회 / 단어단위 4회(pineapple 제외).
const BODY = '{\\rtf1\\ansi\\par 고양이가 사과를 좋아한다.\\par 고양이는 사과를 또 먹었다.\\par APPLE apple Apple pineapple 고양이 apple 끝.\\par}'
// 프로젝트 전체 찾아바꾸기용 토큰 본문(큰바위 2회).
const TOKEN_BODY = '{\\rtf1\\ansi\\par 큰바위가 산에서 굴렀다.\\par 그것은 큰바위였다.\\par}'

// 페이지 내 공용 헬퍼 주입(값 세터/텍스트로 클릭/매치카운트/문자열카운트).
const HELPERS = `
window.__h={
  setVal:function(el,v){if(!el)return false;var p=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var s=Object.getOwnPropertyDescriptor(p,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true;},
  clickText:function(scope,txt){var root=scope?document.querySelector(scope):document;if(!root)return false;var b=[].slice.call(root.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()===txt;});if(b){b.click();return true;}return false;},
  cnt:function(hay,needle){var n=0,i=0;if(!hay||!needle)return 0;while((i=hay.indexOf(needle,i))>=0){n++;i+=needle.length;}return n;},
  paperText:function(){var p=document.querySelector('.paper');return p?(p.textContent||''):'';},
  findInput:function(){return document.querySelector('.findbar input[aria-label="찾을 내용"]');},
  replaceInput:function(){return document.querySelector('.findbar input[aria-label="바꿀 내용"]');},
  findTotal:function(){var s=document.querySelector('.find-count');s=s?(s.textContent||'').trim():'';var m=s.match(/\\/(\\d+)/);return m?+m[1]:(s==='0'?0:NaN);},
  toggleOpt:function(key){var l=[].slice.call(document.querySelectorAll('.findbar label')).find(function(x){return (x.getAttribute('title')||'').indexOf(key)>=0;});if(!l)return false;var c=l.querySelector('input[type=checkbox]');if(!c)return false;c.click();return true;}
};return 1`

async function runSkin(ws, sid, skin, t, errs) {
  // ── 준비: 에디터 뷰 + 알려진 본문 주입 ──────────────────────────────
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(450)
  await ev(ws, sid, HELPERS)
  await ev(ws, sid, "if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();return 1")
  await ev(ws, sid, "var rtf=" + JSON.stringify(BODY) + ";window.__did=window.__scriv.setBody(rtf);return window.__did"); await sleep(500)
  await ev(ws, sid, "window.confirm=function(){return true};window.alert=function(){};return 1") // 확인창 자동 수락
  const paperReady = await ev(ws, sid, "return !!document.querySelector('.paper')&&window.__h.cnt(window.__h.paperText(),'고양이')===3")
  t(paperReady, '[' + skin + '] 에디터 .paper 렌더 + 본문 주입(고양이 3회)')

  // ── 1) ⌘F 로 찾기바 열림 ───────────────────────────────────────────
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true}));return 1"); await sleep(350)
  const barOpen = await ev(ws, sid, "return !!document.querySelector('.findbar')&&document.activeElement===window.__h.findInput()")
  t(barOpen, '[' + skin + '] ⌘F 로 찾기바 열림 + 찾기 입력 포커스')

  // ── 2) 찾기 입력 → 매치 카운트 표시 ────────────────────────────────
  await ev(ws, sid, "window.__h.setVal(window.__h.findInput(),'고양이');return 1"); await sleep(400)
  const total1 = await ev(ws, sid, "return window.__h.findTotal()")
  t(total1 === 3, '[' + skin + '] 찾기 "고양이" → 매치 3개 카운트(' + total1 + ')')

  // ── 3) 다음(▼) 클릭 → 선택이 매치로 이동 ──────────────────────────
  await ev(ws, sid, "var b=document.querySelector('.findbar button[aria-label=\"다음 결과\"]');b.click();return 1"); await sleep(350)
  const selText = await ev(ws, sid, "return (window.getSelection&&window.getSelection().toString())||''")
  const disp1 = await ev(ws, sid, "var s=document.querySelector('.find-count');return s?(s.textContent||'').trim():''")
  t(selText === '고양이' && /\/3$/.test(disp1), '[' + skin + '] 다음 클릭 → 매치 선택("' + selText + '") · 표시 ' + disp1)

  // ── 4) 이전(▲) 클릭 → 순환 이동(여전히 매치 선택) ─────────────────
  await ev(ws, sid, "var b=document.querySelector('.findbar button[aria-label=\"이전 결과\"]');b.click();return 1"); await sleep(350)
  const selText2 = await ev(ws, sid, "return (window.getSelection&&window.getSelection().toString())||''")
  const disp2 = await ev(ws, sid, "var s=document.querySelector('.find-count');return s?(s.textContent||'').trim():''")
  t(selText2 === '고양이' && /\/3$/.test(disp2), '[' + skin + '] 이전 클릭 → 매치 순환("' + selText2 + '") · 표시 ' + disp2)

  // ── 5) 단일 바꾸기 → 본문에 강아지 등장 & 고양이 1 감소 ────────────
  await ev(ws, sid, "window.__h.setVal(window.__h.replaceInput(),'강아지');return 1"); await sleep(250)
  await ev(ws, sid, "var b=document.querySelector('.findbar button[aria-label=\"다음 결과\"]');b.click();return 1"); await sleep(300) // 매치 선택 보장
  await ev(ws, sid, "return window.__h.clickText('.findbar','바꾸기')"); await sleep(500)
  const afterOne = JSON.parse(await ev(ws, sid, "var p=window.__h.paperText();return JSON.stringify({cat:window.__h.cnt(p,'고양이'),dog:window.__h.cnt(p,'강아지')})"))
  t(afterOne.dog >= 1 && afterOne.cat === 2, '[' + skin + '] 바꾸기 1개 → 강아지 ' + afterOne.dog + ' · 고양이 ' + afterOne.cat + '(3→2)')

  // ── 6) 모두 바꾸기 → 남은 고양이 0 & 강아지 3 & 상태 메시지 ────────
  await ev(ws, sid, "return window.__h.clickText('.findbar','모두')"); await sleep(600)
  const afterAll = JSON.parse(await ev(ws, sid, "var p=window.__h.paperText();return JSON.stringify({cat:window.__h.cnt(p,'고양이'),dog:window.__h.cnt(p,'강아지')})"))
  const statusMsg = await ev(ws, sid, "return /바꿨습니다/.test(document.querySelector('.findbar').textContent||'')")
  t(afterAll.cat === 0 && afterAll.dog >= 3 && statusMsg, '[' + skin + '] 모두 바꾸기 → 고양이 ' + afterAll.cat + ' · 강아지 ' + afterAll.dog + ' · 상태표시 ' + statusMsg)

  // ── 7) 영속: 뷰 왕복(코르크보드→에디터) 후에도 변경 잔존(스토어→RTF→재렌더) ──
  await ev(ws, sid, "window.__setView('corkboard');return 1"); await sleep(450)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(550)
  const persisted = JSON.parse(await ev(ws, sid, "var p=window.__h.paperText();return JSON.stringify({cat:window.__h.cnt(p,'고양이'),dog:window.__h.cnt(p,'강아지')})"))
  t(persisted.cat === 0 && persisted.dog >= 3, '[' + skin + '] 뷰 왕복 후 변경 영속(고양이 ' + persisted.cat + ' · 강아지 ' + persisted.dog + ')')

  // ── 8) 대소문자 구분 토글 → apple 카운트 감소(5→3) ────────────────
  await ev(ws, sid, "window.__h.setVal(window.__h.findInput(),'apple');return 1"); await sleep(400)
  const caseOff = await ev(ws, sid, "return window.__h.findTotal()")
  await ev(ws, sid, "return window.__h.toggleOpt('대소문자')"); await sleep(400)
  const caseOn = await ev(ws, sid, "return window.__h.findTotal()")
  t(caseOff === 5 && caseOn === 3 && caseOn < caseOff, '[' + skin + '] 대소문자 구분 토글 → ' + caseOff + '→' + caseOn)
  await ev(ws, sid, "return window.__h.toggleOpt('대소문자')"); await sleep(350) // 복원(off)

  // ── 9) 온전한 단어 토글 → pineapple 내부 제외(5→4) ────────────────
  const wordOff = await ev(ws, sid, "return window.__h.findTotal()")
  await ev(ws, sid, "return window.__h.toggleOpt('온전한 단어')"); await sleep(400)
  const wordOn = await ev(ws, sid, "return window.__h.findTotal()")
  t(wordOff === 5 && wordOn === 4 && wordOn < wordOff, '[' + skin + '] 온전한 단어 토글 → ' + wordOff + '→' + wordOn + '(pineapple 제외)')
  await ev(ws, sid, "return window.__h.toggleOpt('온전한 단어')"); await sleep(300) // 복원

  // ── 10) 닫기 버튼 → 찾기바 사라짐 ─────────────────────────────────
  await ev(ws, sid, "var b=document.querySelector('.findbar button[aria-label=\"찾기 닫기\"]');b.click();return 1"); await sleep(350)
  const barGone = await ev(ws, sid, "return !document.querySelector('.findbar')")
  t(barGone, '[' + skin + '] 닫기 버튼 → 찾기바 닫힘')

  // ── 11) 비에디터 뷰: 입력 비활성 + 안내문 ─────────────────────────
  await ev(ws, sid, "window.__setView('corkboard');return 1"); await sleep(400)
  await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'f',ctrlKey:true,bubbles:true,cancelable:true}));return 1"); await sleep(350)
  const nonEditor = await ev(ws, sid, "var fi=window.__h.findInput();var disabled=!!fi&&fi.disabled;var msg=/에디터에서만 사용 가능/.test((document.querySelector('.findbar')||{}).textContent||'');return disabled&&msg")
  t(nonEditor, '[' + skin + '] 비에디터 뷰에서 찾기 입력 비활성 + 안내문 표시')
  await ev(ws, sid, "var b=document.querySelector('.findbar button[aria-label=\"찾기 닫기\"]');if(b)b.click();window.__setView('editor');return 1"); await sleep(450)

  // ── 12) 프로젝트 전체 찾아바꾸기 모달: 열림 + 옵션 체크박스 토글 ──
  await ev(ws, sid, "if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();return 1")
  await ev(ws, sid, "var rtf=" + JSON.stringify(TOKEN_BODY) + ";window.__did=window.__scriv.setBody(rtf);return window.__did"); await sleep(550)
  const tokenReady = await ev(ws, sid, "return window.__h.cnt(window.__h.paperText(),'큰바위')===2")
  t(tokenReady, '[' + skin + '] 프로젝트 치환용 토큰 본문 주입(큰바위 2회)')
  const bodyBefore = await ev(ws, sid, "return window.__scriv.bodyOf(window.__did)")
  await ev(ws, sid, "window.__setModal('replace');return 1"); await sleep(450)
  const modalOpen = await ev(ws, sid, "var m=document.querySelector('.modal-backdrop .modal');return !!m&&/프로젝트 전체 찾아 바꾸기/.test(m.textContent||'')")
  t(modalOpen, '[' + skin + '] 전체 찾아바꾸기 모달 열림')
  // 옵션 체크박스(제목) 토글 → 상태 반전 후 복원
  const optToggle = await ev(ws, sid, "var l=[].slice.call(document.querySelectorAll('.modal label')).find(function(x){return /^제목$/.test((x.textContent||'').trim());});if(!l)return 'no-label';var c=l.querySelector('input[type=checkbox]');var b0=c.checked;c.click();var b1=c.checked;c.click();return (b0!==b1)?'ok':'nochange'")
  t(optToggle === 'ok', '[' + skin + '] 모달 옵션 체크박스(제목) 토글 동작')

  // ── 13) 전체 치환 실행 → 본문 큰바위→작은돌, 결과 메시지, 스토어 변경 ──
  await ev(ws, sid, "var fs=document.querySelectorAll('.modal .field');window.__h.setVal(fs[0],'큰바위');window.__h.setVal(fs[1],'작은돌');return 1"); await sleep(300)
  await ev(ws, sid, "return window.__h.clickText('.modal','모두 바꾸기')"); await sleep(600)
  const doneMsg = await ev(ws, sid, "return /곳을 바꿨습니다/.test((document.querySelector('.modal')||{}).textContent||'')")
  const bodyAfter = await ev(ws, sid, "return window.__scriv.bodyOf(window.__did)")
  t(doneMsg && bodyAfter !== bodyBefore, '[' + skin + '] 전체 치환 실행 → 결과 메시지 + 스토어 본문 변경')

  // ── 14) 모달 닫고 에디터 본문이 실제로 치환됨(작은돌, 큰바위 0) ────
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(500)
  const modalGone = await ev(ws, sid, "return !document.querySelector('.modal-backdrop')")
  const repl = JSON.parse(await ev(ws, sid, "var p=window.__h.paperText();return JSON.stringify({big:window.__h.cnt(p,'큰바위'),small:window.__h.cnt(p,'작은돌')})"))
  t(modalGone && repl.big === 0 && repl.small === 2, '[' + skin + '] 모달 닫힘 + 본문 치환 반영(큰바위 ' + repl.big + ' · 작은돌 ' + repl.small + ')')

  // ── 15) 실행 중 콘솔 에러 없음 ────────────────────────────────────
  t(errs.length === 0, '[' + skin + '] 실행 중 콘솔 에러 없음(' + errs.length + ')' + (errs.length ? ' :: ' + errs.slice(0, 3).join(' | ') : ''))
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails && d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || '?').slice(0, 120)); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map(a => (a.value || a.description || '')).join(' ').slice(0, 120)) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    // 환영/투어 닫기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    errs.length = 0
    try { await runSkin(ws, sid, skin, t, errs) } catch (e) { bad.push('[' + skin + '] FATAL: ' + e.message) }
  }
  console.log('=== 찾기·바꾸기 실동작 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
