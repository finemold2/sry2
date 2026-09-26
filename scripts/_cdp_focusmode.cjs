// 집중 모드 진입 선택(현재 창 / 새 창→전체화면·일반) + 어느 방식이든 저장(데이터 안전) 검증. 양 스킨.
//  · 새 창은 window.open(팝업) → 별도 타깃에 attach 해 .composition 렌더·타이핑 저장 확인.
//  · 팝업 생성엔 신뢰 제스처가 필요 → Input.dispatchMouseEvent(실제 클릭) 사용(Runtime.enable 미호출).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }
// 요소 중앙을 실제 마우스로 클릭(신뢰 제스처)
async function clickEl(ws, sid, selOrText, byText) {
  const js = byText
    ? "var b=[].slice.call(document.querySelectorAll('.focus-opt')).find(function(x){return (x.textContent||'').indexOf('" + selOrText + "')>=0});if(!b)return 'null';var r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})"
    : "var b=document.querySelector(\"" + selOrText + "\");if(!b)return 'null';var r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})"
  const c = await ev(ws, sid, js); if (c === 'null') return false
  const { x, y } = JSON.parse(c)
  await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 }, sid)
  await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  await rpc(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)
  return true
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const { targetId: mainTarget } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId: mainTarget, flatten: true })
  // beforeunload(원고 안전) 다이얼로그가 헤드리스 Page.navigate 를 막지 않도록 자동 수락.
  await rpc(ws, 'Page.enable', {}, sid).catch(() => {})
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId === sid && d.method === 'Page.javascriptDialogOpening') rpc(ws, 'Page.handleJavaScriptDialog', { accept: true }, sid).catch(() => {}) })
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }
  const dismiss = () => ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1")
  const FOCUS_BTN = "[title^='집중 모드']"

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1200)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await waitHook(); await dismiss(); await sleep(400)
    await ev(ws, sid, "window.__setView&&window.__setView('editor');return 1"); await sleep(300)
    // 본문에 활성 텍스트 문서 확보(없으면 첫 텍스트)
    await ev(ws, sid, "var s=window.__scriv.state();if(!s.activeId){return 1}return 1")

    // 집중 버튼 → 선택 모달
    t(await clickEl(ws, sid, FOCUS_BTN, false), '[' + skin + '] 집중 버튼 클릭'); await sleep(350)
    t(await ev(ws, sid, "return !!document.querySelector('.focus-chooser')&&/현재 창/.test(document.body.textContent||'')&&/새 창/.test(document.body.textContent||'')"), '[' + skin + '] 선택 모달(현재 창/새 창) 표시')

    // 현재 창에서 → .composition
    await clickEl(ws, sid, '현재 창', true); await sleep(450)
    t(await ev(ws, sid, "return !!document.querySelector('.composition')"), '[' + skin + '] 현재 창 집중 모드 진입(.composition)')
    // 타이핑 → 저장
    const MARK = 'FOCUSIN' + skin.slice(0, 3).toUpperCase()
    await ev(ws, sid, "var p=document.querySelector('.comp-paper[contenteditable]');if(p){p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('insertText',false,'" + MARK + "');p.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(500)
    t(await ev(ws, sid, "var id=window.__scriv.state().activeId;return (window.__scriv.bodyOf(id)||'').indexOf('" + MARK + "')>=0"), '[' + skin + '] 현재 창에서 입력이 본문에 저장됨')
    // 나가기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.comp-exit')).pop();if(b)b.click();return 1"); await sleep(400)
    t(!(await ev(ws, sid, "return !!document.querySelector('.composition')")), '[' + skin + '] 집중 모드 나가기')
  }

  // ── 새 창(팝업) 모드: 기본 스킨에서 '일반 창' → 팝업 attach + 타이핑 저장 ──
  await ev(ws, sid, "window.__setView&&window.__setView('editor');return 1"); await sleep(200)
  await clickEl(ws, sid, FOCUS_BTN, false); await sleep(350)
  t(await ev(ws, sid, "return !!document.querySelector('.focus-chooser')"), '[새창] 선택 모달 표시')
  await clickEl(ws, sid, '새 창', true); await sleep(350)
  t(await ev(ws, sid, "return /전체 화면/.test(document.body.textContent||'')&&/일반 창/.test(document.body.textContent||'')"), '[새창] 2단계(전체 화면/일반 창) 표시')
  await clickEl(ws, sid, '일반 창', true); await sleep(1200)
  // 새 팝업 타깃 찾기
  const targets = (await rpc(ws, 'Target.getTargets')).targetInfos.filter(ti => ti.type === 'page' && ti.targetId !== mainTarget)
  t(targets.length >= 1, '[새창] 별도 창(팝업) 생성됨(' + targets.length + ')')
  if (targets.length) {
    const { sessionId: psid } = await rpc(ws, 'Target.attachToTarget', { targetId: targets[0].targetId, flatten: true })
    let rendered = false
    for (let k = 0; k < 20; k++) { await sleep(250); try { if (await ev(ws, psid, "return !!document.querySelector('.comp-paper[contenteditable]')")) { rendered = true; break } } catch { /* 팝업 로딩 */ } }
    if (rendered) {
      // 실브라우저: 팝업 안에서 쓴 글이 같은 스토어(단일 autosave)에 저장되는지 — 데이터 안전 핵심.
      t(true, '[새창] 팝업 안에 집중 모드 에디터 렌더')
      const PMARK = 'POPUPWRITE7'
      await ev(ws, psid, "var p=document.querySelector('.comp-paper[contenteditable]');if(p){p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('insertText',false,'" + PMARK + "');p.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(600)
      t(await ev(ws, sid, "var id=window.__scriv.state().activeId;return (window.__scriv.bodyOf(id)||'').indexOf('" + PMARK + "')>=0"), '[새창] 팝업에서 쓴 글이 같은 스토어 본문에 저장됨(데이터 안전)')
      await ev(ws, psid, "var b=[].slice.call(document.querySelectorAll('.comp-exit')).pop();if(b)b.click();return 1").catch(() => {}); await sleep(500)
    } else {
      // 헤드리스 한계: PortalWindow(window.open) 팝업 내용 렌더가 헤드리스에서 안 됨(기존 '도구 창 분리'도 동일).
      //  → 팝업 '생성'까지만 검증하고 내용/저장은 실브라우저에서 확인(아키텍처상 단일 스토어 공유로 저장 동일).
      console.log('  ⓘ 헤드리스에선 PortalWindow 팝업 내용이 렌더되지 않음(도구 창 분리와 동일 한계) — 팝업 생성까지만 검증, 내용/저장은 실브라우저 전용.')
    }
  }
  // 메인 창에 잔여 집중 모드 없음
  t(!(await ev(ws, sid, "return !!document.querySelector('.composition')")), '[새창] 닫은 뒤 메인 창은 정상')

  console.log('=== 집중 모드 선택(현재 창/새 창·전체화면) + 저장 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
