// 클래식 ↔ 스튜디오 '헤더/레일/툴바 액션' 패리티 — 실제 조작→결과로 검증.
// 핵심: 클래식에서 되는 액션(저장·스냅샷·편집기분할·집중모드·테마전환·명령팔레트·찾기·
//       바인더토글·인스펙터토글·컴파일·글자크기 A±·스킨전환)이 '스튜디오에서도' 실제로 도달+작동하는가.
// 한 스킨에서 직접 버튼이 없으면 메뉴 경로로 도달(여전히 기능 패리티). 둘 다 없으면 [PARITY-GAP].
// 조작은 element.click()/네이티브 setter(클릭/입력만이므로 Runtime.enable 사용 가능 — 마우스 디스패치 없음).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 각 스킨에서 액션 컨트롤을 찾는 로케이터. m: {label?,titlePrefix?,text?} (aria-label 정확/ title 접두/ textContent 정확).
const L = {
  classic: {
    save: { sel: '.toolbar .tbtn', m: { label: '저장' } },
    split: { sel: '.toolbar .tbtn', m: { label: '편집기 분할' } },
    focus: { sel: '.toolbar .tbtn', m: { titlePrefix: '집중 모드' } },
    theme: { sel: '.toolbar .tbtn', m: { label: '테마 전환' } },
    palette: { sel: '.toolbar .tbtn', m: { label: '명령 팔레트' } },
    binder: { sel: '.toolbar .tbtn', m: { label: '바인더 토글' } },
    inspector: { sel: '.toolbar .tbtn', m: { label: '인스펙터 토글' } },
    compile: { sel: '.toolbar .tbtn', m: { text: '컴파일' } },
    scaleUp: { sel: '.toolbar .tbtn', m: { label: '글자 크게' } },
    scaleDown: { sel: '.toolbar .tbtn', m: { label: '글자 작게' } },
    skin: { sel: '.toolbar .tbtn', m: { label: 'Studio UI 로 전환' } },
    // snapshot/find 는 클래식 툴바에 버튼이 없음 → 메뉴 경로(아래 menuRe)로 도달.
  },
  studio: {
    save: { sel: '.st-save', m: {} },
    snapshot: { sel: '.st-top .st-icon-btn', m: { label: '스냅샷' } },
    split: { sel: '.st-top .st-icon-btn', m: { label: '편집기 분할' } },
    focus: { sel: '.st-top .st-icon-btn', m: { label: '집중 모드' } },
    theme: { sel: '.st-top .st-icon-btn', m: { label: '테마 전환' } },
    palette: { sel: '.st-top .st-icon-btn', m: { label: '명령 팔레트' } },
    find: { sel: '.st-top .st-icon-btn', m: { label: '찾기' } },
    binder: { sel: '.st-top .st-icon-btn', m: { label: '바인더' } },
    inspector: { sel: '.st-top .st-icon-btn', m: { label: '인스펙터' } },
    compile: { sel: '.st-rail .st-rail-btn', m: { label: '컴파일/내보내기' } },
    scaleUp: { sel: '.st-top .st-icon-btn', m: { label: '크게' } },
    scaleDown: { sel: '.st-top .st-icon-btn', m: { label: '작게' } },
    skin: { sel: '.st-skin-toggle', m: {} },
  },
}

function buildMatch(m) {
  let c = ''
  if (m.label != null) c += "if((x.getAttribute('aria-label')||'').trim()!==" + JSON.stringify(m.label) + ")return false;"
  if (m.titlePrefix != null) c += "if((x.getAttribute('title')||'').trim().indexOf(" + JSON.stringify(m.titlePrefix) + ")!==0)return false;"
  if (m.text != null) c += "if((x.textContent||'').trim()!==" + JSON.stringify(m.text) + ")return false;"
  return c
}
const exprFind = (l) => "return [].slice.call(document.querySelectorAll(" + JSON.stringify(l.sel) + ")).some(function(x){" + buildMatch(l.m || {}) + "return true;})"
const exprClick = (l) => "var b=[].slice.call(document.querySelectorAll(" + JSON.stringify(l.sel) + ")).find(function(x){" + buildMatch(l.m || {}) + "return true;});if(b){b.click();return true}return false;"

// 메뉴 경로 도달(양 스킨 공통: .menu-wrap>button 트리거 → .dropdown button 항목). re 는 항목 텍스트 정규식.
async function menuClick(ws, sid, re) {
  for (const name of ['파일', '문서', '도구', '보기']) {
    const opened = await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()===" + JSON.stringify(name) + "});if(!b)return false;b.click();return true")
    if (!opened) continue
    await sleep(260)
    const clicked = await ev(ws, sid, "var it=[].slice.call(document.querySelectorAll('.dropdown button')).find(function(x){return /" + re + "/.test(x.textContent||'')});if(it){it.click();return true}return false")
    if (clicked) return true
    await ev(ws, sid, "document.body.click();return 1"); await sleep(120)
  }
  return false
}

// 액션 컨트롤 클릭(버튼 우선, 없으면 메뉴 폴백). 반환: 'button'|'menu'|null.
async function reachAndClick(ws, sid, skin, key, menuRe) {
  const l = L[skin][key]
  if (l && await ev(ws, sid, exprFind(l))) { if (await ev(ws, sid, exprClick(l))) return 'button' }
  if (menuRe) { if (await menuClick(ws, sid, menuRe)) return 'menu' }
  return null
}

const Q = (sel) => "return !!document.querySelector(" + JSON.stringify(sel) + ")"

async function runSkin(ws, sid, skin, t, errs) {
  const reach = (name, via) => '[' + skin + '] ' + name + (via ? ' 도달(' + via + ')' : ' [PARITY-GAP] 미도달')
  const resetUI = async () => {
    await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(150)
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(120)
    await ev(ws, sid, "var x=document.querySelector('.comp-exit');if(x)x.click();return 1"); await sleep(120)
    await ev(ws, sid, "var x=document.querySelector('.findbar button[aria-label=\"찾기 닫기\"]');if(x)x.click();return 1"); await sleep(100)
  }
  await resetUI()

  // 1) 테마 전환: data-theme 가 실제로 바뀐다.
  {
    const before = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||'light'")
    const via = await reachAndClick(ws, sid, skin, 'theme'); await sleep(220)
    t(via !== null, reach('테마 전환', via))
    const after = await ev(ws, sid, "return document.documentElement.getAttribute('data-theme')||'light'")
    t(via !== null && before !== after, '[' + skin + '] 테마 전환 작동(' + before + '→' + after + ')')
  }

  // 2) 글자 크기 A± : % 값이 올라가고 다시 내려온다.
  {
    const readScale = "var v=document.querySelector('.uiscale-val,.st-scale-val');return v?parseInt((v.textContent||'').replace(/[^0-9]/g,''),10):null"
    const v0 = await ev(ws, sid, readScale)
    const upVia = await reachAndClick(ws, sid, skin, 'scaleUp'); await sleep(180)
    t(upVia !== null, reach('글자 크게(A+)', upVia))
    const v1 = await ev(ws, sid, readScale)
    t(upVia !== null && v1 != null && v0 != null && v1 > v0, '[' + skin + '] 글자 크게 작동(' + v0 + '%→' + v1 + '%)')
    const dnVia = await reachAndClick(ws, sid, skin, 'scaleDown'); await sleep(180)
    t(dnVia !== null, reach('글자 작게(A−)', dnVia))
    const v2 = await ev(ws, sid, readScale)
    t(dnVia !== null && v2 != null && v1 != null && v2 < v1, '[' + skin + '] 글자 작게 작동(' + v1 + '%→' + v2 + '%)')
  }

  // 3) 명령 팔레트: .cmd-palette 가 실제로 열린다.
  {
    const via = await reachAndClick(ws, sid, skin, 'palette'); await sleep(320)
    t(via !== null, reach('명령 팔레트', via))
    t(await ev(ws, sid, Q('.cmd-palette')), '[' + skin + '] 명령 팔레트 실제 열림(.cmd-palette)')
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(150)
  }

  // 4) 찾기/바꾸기: .findbar 가 실제로 뜬다(클래식은 메뉴 경로 폴백).
  {
    await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(150)
    const via = await reachAndClick(ws, sid, skin, 'find', '문서 내 찾기'); await sleep(280)
    t(via !== null, reach('찾기/바꾸기', via))
    t(await ev(ws, sid, Q('.findbar')), '[' + skin + '] 찾기 바 실제 열림(.findbar)')
    await ev(ws, sid, "var x=document.querySelector('.findbar button[aria-label=\"찾기 닫기\"]');if(x)x.click();return 1"); await sleep(140)
  }

  // 5) 스냅샷: 안내/실행 다이얼로그가 뜬다(클래식은 메뉴 경로 폴백).
  {
    const via = await reachAndClick(ws, sid, skin, 'snapshot', '스냅샷 찍기'); await sleep(320)
    t(via !== null, reach('스냅샷', via))
    t(await ev(ws, sid, "var b=document.querySelector('.modal-backdrop');return !!b&&/스냅샷/.test(b.textContent||'')"), '[' + skin + '] 스냅샷 안내/실행 다이얼로그 열림')
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(160)
  }

  // 6) 컴파일/내보내기: 컴파일 모달이 실제로 열린다.
  {
    const via = await reachAndClick(ws, sid, skin, 'compile'); await sleep(360)
    t(via !== null, reach('컴파일/내보내기', via))
    t(await ev(ws, sid, Q('.modal-backdrop .modal[role="dialog"]')), '[' + skin + '] 컴파일 모달 실제 열림')
    await ev(ws, sid, "if(window.__setModal)window.__setModal(null);return 1"); await sleep(200)
  }

  // 7) 편집기 분할: .editor-split 가 나타난다.
  {
    await ev(ws, sid, "if(window.__setView)window.__setView('editor');return 1"); await sleep(150)
    if (await ev(ws, sid, Q('.editor-split'))) { await menuClick(ws, sid, '편집기 분할 토글'); await sleep(220) }
    const via = await reachAndClick(ws, sid, skin, 'split'); await sleep(320)
    t(via !== null, reach('편집기 분할', via))
    t(await ev(ws, sid, Q('.editor-split')), '[' + skin + '] 편집기 분할 실제 적용(.editor-split)')
    await menuClick(ws, sid, '편집기 분할 토글'); await sleep(220) // 복원
  }

  // 8) 집중 모드: .composition 진입/해제.
  {
    const via = await reachAndClick(ws, sid, skin, 'focus'); await sleep(320)
    t(via !== null, reach('집중 모드', via))
    // #28: 집중 모드는 '현재 창에서 / 새 창에서' 선택 모달을 먼저 띄운다 → '현재 창' 선택
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.focus-chooser button, .modal button')).find(function(x){return /현재 창/.test(x.textContent||'')});if(b)b.click();return !!b"); await sleep(400)
    t(await ev(ws, sid, Q('.composition')), '[' + skin + '] 집중 모드 실제 진입(.composition)')
    await ev(ws, sid, "var x=document.querySelector('.comp-exit');if(x)x.click();return 1"); await sleep(240)
    t(!(await ev(ws, sid, Q('.composition'))), '[' + skin + '] 집중 모드 해제')
  }

  // 9) 바인더 토글: .binder 표시 상태가 뒤집힌다.
  {
    const b0 = await ev(ws, sid, Q('.binder'))
    const via = await reachAndClick(ws, sid, skin, 'binder'); await sleep(260)
    t(via !== null, reach('바인더 토글', via))
    const b1 = await ev(ws, sid, Q('.binder'))
    t(via !== null && b0 !== b1, '[' + skin + '] 바인더 토글 작동(' + b0 + '→' + b1 + ')')
    await reachAndClick(ws, sid, skin, 'binder'); await sleep(160) // 복원
  }

  // 10) 인스펙터 토글: .inspector 표시 상태가 뒤집힌다.
  {
    const i0 = await ev(ws, sid, Q('.inspector'))
    const via = await reachAndClick(ws, sid, skin, 'inspector'); await sleep(260)
    t(via !== null, reach('인스펙터 토글', via))
    const i1 = await ev(ws, sid, Q('.inspector'))
    t(via !== null && i0 !== i1, '[' + skin + '] 인스펙터 토글 작동(' + i0 + '→' + i1 + ')')
    await reachAndClick(ws, sid, skin, 'inspector'); await sleep(160) // 복원
  }

  // 11) 저장: 제목 변경으로 dirty 만든 뒤 저장 클릭 → dirty 해제.
  {
    const dirtied = await ev(ws, sid, "var inp=document.querySelector('input.title,input.st-title');if(!inp)return 'no-input';var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(inp,(inp.value||'')+'·');inp.dispatchEvent(new Event('input',{bubbles:true}));return window.__scriv.state().dirty")
    t(dirtied === true, '[' + skin + '] 저장 준비: 제목 변경→dirty=' + dirtied)
    const via = await reachAndClick(ws, sid, skin, 'save')
    t(via !== null, reach('저장', via))
    let cleared = false
    for (let i = 0; i < 10; i++) { await sleep(200); if (!(await ev(ws, sid, "return window.__scriv.state().dirty"))) { cleared = true; break } }
    t(via !== null && cleared, '[' + skin + '] 저장 작동(dirty 해제됨)')
  }

  // 12) 스킨 전환(마지막): 다른 스킨 셸로 실제 전환된다.
  {
    const via = await reachAndClick(ws, sid, skin, 'skin'); await sleep(700)
    t(via !== null, reach('스킨 전환', via))
    if (skin === 'classic') {
      t(await ev(ws, sid, Q('.studio-root')), '[' + skin + '] 클래식→스튜디오 스킨 전환 적용(.studio-root)')
    } else {
      t(await ev(ws, sid, "return !!document.querySelector('.toolbar')&&!document.querySelector('.studio-root')"), '[' + skin + '] 스튜디오→클래식 스킨 전환 적용(.toolbar)')
    }
  }

  // 13) 위 모든 조작 동안 페이지 예외 0건.
  t(errs.length === 0, '[' + skin + '] 조작 중 페이지 예외 0건(관측 ' + errs.length + ')')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []
  ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&!!window.__scriv")) return true } catch { /* loading */ } } return false }

  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1400)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    // 환영/투어 닫기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    // 올바른 스킨 셸이 떴는지 확인(클래식=.toolbar, 스튜디오=.studio-root)
    t(await ev(ws, sid, skin === 'classic' ? Q('.toolbar') : Q('.studio-root')), '[' + skin + '] 해당 스킨 셸 렌더')
    errs.length = 0
    await runSkin(ws, sid, skin, t, errs)
  }

  console.log('=== 클래식↔스튜디오 액션 패리티(헤더/레일/툴바) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
