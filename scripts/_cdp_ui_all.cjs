// UI 전수 검증(양 스킨) — 모든 뷰·모든 모달·테마 3종·도구창을 실제로 열어 렌더/닫힘/콘솔에러 확인.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

const VIEWS = [['editor', '.paper'], ['corkboard', '.corkboard'], ['outliner', '.outliner'], ['board', '.board'], ['canvas', '.canvas-area'], ['serial', '.serial-board'], ['timeline', '.st-center,.center'], ['references', '.st-center,.center'], ['argument', '.st-center,.center'], ['database', '.db-table,.st-center,.center']]
const MODALS = ['compile', 'platformPublish', 'platformPreview', 'toolhub', 'genrebox', 'snapshotHelp', 'stats', 'style', 'settings', 'newProject', 'projects', 'nameGen', 'backup', 'docLink', 'replace', 'docTemplate', 'linguistic', 'structure', 'tension', 'creative']
const TOOLS = ['name-mixer', 'character-forge', 'plot-twist-deck', 'place-name-forge', 'dilemma-generator', 'story-dice', 'scene-list', 'thesaurus-panel', 'story-tarot', 'writer-dashboard', 'streak-tracker', 'pomodoro-timer', 'word-sprint-game', 'session-goal']
const DIALOG = ".modal-backdrop,.modal-overlay,.palette,.cmd-palette,[role='dialog']:not(.toolwin):not(.tour-bubble)"

async function runSkin(ws, sid, skin, t, errs) {
  // 뷰 전수
  for (const [v, sel] of VIEWS) {
    const before = errs.length
    await ev(ws, sid, "window.__setView('" + v + "');return 1"); await sleep(350)
    const ren = await ev(ws, sid, "return !!document.querySelector(\"" + sel + "\")")
    const center = await ev(ws, sid, "var c=document.querySelector('.center,.st-center');return !!c&&c.children.length>0")
    t(ren && center && errs.length === before, '[' + skin + '] 뷰 ' + v + ' 렌더(컨테이너+콘텐츠+무에러)')
  }
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(250)
  // 모달 전수
  for (const m of MODALS) {
    const before = errs.length
    await ev(ws, sid, "window.__setModal('" + m + "');return 1"); await sleep(320)
    const open = await ev(ws, sid, "return !!document.querySelector(\"" + DIALOG + "\")")
    const hasContent = await ev(ws, sid, "var d=document.querySelector(\"" + DIALOG + "\");return !!d&&(d.textContent||'').trim().length>3")
    await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(220)
    const closed = !(await ev(ws, sid, "return !!document.querySelector(\"" + DIALOG + "\")"))
    t(open && hasContent && closed && errs.length === before, '[' + skin + '] 모달 ' + m + ' (열림·내용·닫힘·무에러)')
  }
  // 테마 3종 렌더(하드코딩색 없이 — 본문 텍스트/배경 불투명)
  for (const th of ['light', 'dark', 'sepia']) {
    await ev(ws, sid, "document.documentElement.setAttribute('data-theme','" + th + "');return 1"); await sleep(150)
    const okTheme = await ev(ws, sid, "var b=document.querySelector('.paper,.center,.st-center')||document.body;var cs=getComputedStyle(b);var bg=getComputedStyle(document.body).backgroundColor;return cs.color&&!/rgba\\(0, 0, 0, 0\\)/.test(cs.color)&&bg&&bg!=='rgba(0, 0, 0, 0)'")
    t(okTheme, '[' + skin + '] 테마 ' + th + ' 렌더(텍스트·배경 불투명)')
  }
  await ev(ws, sid, "document.documentElement.removeAttribute('data-theme');return 1")
  // 패널 토글(바인더/인스펙터) — 토글 후 DOM 반영
  const binderToggle = "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /바인더/.test(x.getAttribute('aria-label')||x.getAttribute('title')||'')});if(b)b.click();return 1"
  const b0 = await ev(ws, sid, "return !!document.querySelector('.binder')")
  await ev(ws, sid, binderToggle); await sleep(250)
  const b1 = await ev(ws, sid, "return !!document.querySelector('.binder')")
  t(b0 !== b1, '[' + skin + '] 바인더 토글 동작(' + b0 + '→' + b1 + ')')
  await ev(ws, sid, binderToggle); await sleep(200) // 복원
  // 도구창 표본
  let opened = 0
  for (const id of TOOLS) {
    await ev(ws, sid, "if(window.__openTool)window.__openTool('" + id + "');return 1"); await sleep(450)
    const win = await ev(ws, sid, "return !!document.querySelector('.toolwin[data-tool-id=\"" + id + "\"]')||!!document.querySelector('.toolwin')")
    if (win) opened++
    await ev(ws, sid, "if(window.__closeTool)window.__closeTool('" + id + "');return 1"); await sleep(120)
  }
  t(opened >= TOOLS.length - 1, '[' + skin + '] 도구창 표본 렌더 ' + opened + '/' + TOOLS.length)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  // skin 은 같은 타깃에서 클래식 스킨 전환 버튼/팔레트로 바꾸기 어려우니, localStorage 후 reload 로.
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'")) return true } catch { /* page loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    errs.length = 0
    await runSkin(ws, sid, skin, t, errs)
  }
  console.log('=== UI 전수 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
