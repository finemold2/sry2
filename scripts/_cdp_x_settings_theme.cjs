// 설정/테마/타이포 실사용 베타 — '코드리뷰'가 아니라 실제로 설정창을 열고 값을 바꾸고 테마/글자크기 버튼을
// 누르며 '상식적으로 당연한 동작'을 단언한다. 위반 시 console.log("[ISSUE] …") 로 남기고 실패로 카운트.
//
// 점검 범위(담당): 프로젝트 설정 편집창폭/문단간격/줄간격/목표단위/자동저장/프리셋 → .paper 즉시 반영 + 리로드 유지,
//                테마 라이트/다크/세피아 전환 즉시 반영 + 리로드 유지, 글자크기 A± 즉시 반영 + 리로드 유지.
//
// ⚠ 리로드 유지(DEV 서버 주의): 검증된 타깃은 http://localhost:4178/ (vite preview = 프로덕션 빌드)이다.
//   설정값(편집창폭 등)은 IndexedDB 자동저장으로 영속하므로, 리로드 전에 dirty=false(자동저장 완료)까지 기다린다.
//   vite dev(5173)에 붙이면 HMR/자동저장 타이밍 차이로 설정 리로드 유지가 흔들릴 수 있어, preview(4178)에만 붙인다.
//   (테마=localStorage 'sry:theme'+IndexedDB, 글자크기=localStorage 'sry:uiScale' 로 영속)

const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// 설정 모달 안의 라벨(prefix)로 컨트롤을 찾고/라벨 텍스트를 읽고/React 호환으로 값을 넣는 페이지측 헬퍼.
const LIB = "function _ctrl(p){var ns=[].slice.call(document.querySelectorAll('.modal-backdrop .row span,.modal-backdrop .row label'));var sp=ns.find(function(s){return (s.textContent||'').replace(/\\s+/g,'').indexOf(p.replace(/\\s+/g,''))===0});if(!sp)return null;var n=sp.nextElementSibling;while(n&&!/^(INPUT|SELECT)$/.test(n.tagName))n=n.nextElementSibling;return n;}function _lbl(p){var ns=[].slice.call(document.querySelectorAll('.modal-backdrop .row span,.modal-backdrop .row label'));var sp=ns.find(function(s){return (s.textContent||'').replace(/\\s+/g,'').indexOf(p.replace(/\\s+/g,''))===0});return sp?(sp.textContent||''):'';}function _setv(el,v){var proto=el.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;var d=Object.getOwnPropertyDescriptor(proto,'value');d.set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}function _paper(){return document.querySelector('.paper');}"

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 콘솔에러/예외 캡처(클릭·입력 한정 — 이 스크립트는 포인터 드래그를 쓰지 않으므로 Runtime.enable 안전)
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc:' + ((d.params.exceptionDetails && d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || '').split('\n')[0]); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err:' + (d.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 120)) })
  await rpc(ws, 'Runtime.enable', {}, sid)

  const ok = [], bad = []
  const t = (c, m) => { if (c) ok.push(m); else { bad.push(m); console.log('[ISSUE] ' + m) } }
  const evp = (x) => ev(ws, sid, x)               // 일반 페이지 평가
  const evL = (x) => ev(ws, sid, LIB + x)          // 설정 헬퍼 포함 평가
  const clickAria = (al) => evp("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('aria-label')||'')==='" + al + "'});if(b){b.click();return true}return false")
  const escKey = async () => { await rpc(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, sid); await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, sid) }
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await evp("return typeof window.__setModal==='function'&&typeof window.__scriv==='object'")) return true } catch { /* loading */ } } return false }
  const dismiss = async () => { await evp("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350) }
  const openSettings = async () => { await evp("window.__setModal('settings');return 1"); await sleep(450) }
  const themeNow = () => evp("return document.documentElement.dataset.theme||''")
  const setThemeTo = async (target) => { for (let i = 0; i < 4; i++) { if ((await themeNow()) === target) return true; await clickAria('테마 전환'); await sleep(220) } return (await themeNow()) === target }
  const waitClean = async () => { for (let i = 0; i < 20; i++) { try { if ((await evp("return !window.__scriv.state().dirty")) === true) return true } catch { /* */ } await sleep(400) } return false }
  const ensurePaper = async () => {
    await evp("window.__setView&&window.__setView('editor');return 1"); await sleep(350)
    if (await evp("return !!document.querySelector('.paper')")) return true
    const rows = await evp("return document.querySelectorAll('.binder-row').length")
    for (let i = 0; i < Math.min(rows, 10); i++) {
      await evp("var rs=document.querySelectorAll('.binder-row');if(rs[" + i + "])rs[" + i + "].click();return 1"); await sleep(300)
      if (await evp("return !!document.querySelector('.paper')")) return true
    }
    return false
  }

  // ── 로드 + 환영/투어 닫기 ──────────────────────────────────────────────
  t(await waitHook(), '앱 로드 + 테스트 훅(__setModal/__scriv) 준비')
  await dismiss()
  t(await ensurePaper(), '에디터에 본문(.paper) 표시(활성 문서 확보)')
  errs.length = 0 // 상호작용 구간만 콘솔에러 집계

  // ── (A) 설정 모달: 열림/포커스/접근성 ──────────────────────────────────
  await openSettings()
  t(await evp("return !!document.querySelector('.modal-backdrop .modal[role=\"dialog\"]')"), '설정 모달이 열린다(role=dialog)')
  t(await evp("var m=document.querySelector('.modal-backdrop .modal[role=\"dialog\"]');return !!m&&m.getAttribute('aria-modal')==='true'"), '설정 모달 aria-modal=true(모달 시맨틱)')
  t(await evp("var a=document.activeElement;return !!(a&&a.closest&&a.closest('.modal-backdrop .modal'))"), '모달 열면 첫 입력에 포커스가 간다(키보드로 바로 조작)')

  // ── (B) 타이포그래피 즉시 반영(.paper) ─────────────────────────────────
  t(await evL("var e=_ctrl('편집창 폭');if(!e)return false;_setv(e,888);return _ctrl('편집창 폭').value==='888'"), '편집창 폭 입력값이 888로 반영됨')
  await sleep(180)
  t(await evL("var p=_paper();return !!p&&getComputedStyle(p).maxWidth==='888px'"), '편집창 폭 변경이 .paper(maxWidth=888px)에 즉시 반영')
  t(await evL("var e=_ctrl('문단 간격');if(!e)return false;_setv(e,1.4);return _ctrl('문단 간격').value==='1.4'"), '문단 간격 입력값이 1.4로 반영됨')
  await sleep(180)
  t(await evL("var p=_paper();return !!p&&p.style.getPropertyValue('--ed-para-gap').trim()==='1.4em'"), '문단 간격이 .paper(--ed-para-gap=1.4em)에 즉시 반영')
  t(await evL("var e=_ctrl('줄간격');if(!e)return false;_setv(e,1.6);return _ctrl('줄간격').value==='1.6'"), '줄간격 입력값이 1.6으로 반영됨')
  await sleep(180)
  t(await evL("var p=_paper();return !!p&&p.style.getPropertyValue('--ed-line').trim()==='1.6'"), '줄간격이 .paper(--ed-line=1.6)에 즉시 반영')

  // ── (C) 타이포 프리셋 ─────────────────────────────────────────────────
  await evp("var b=[].slice.call(document.querySelectorAll('.modal-backdrop button')).find(function(x){return /웹소설/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(300)
  t(await evL("return _ctrl('편집창 폭').value==='680'"), "프리셋 '웹소설(여백 큼)' 클릭 시 편집창 폭=680 적용")
  t(await evL("var p=_paper();return !!p&&getComputedStyle(p).maxWidth==='680px'"), "프리셋이 .paper(maxWidth=680px)에 즉시 반영")

  // ── (D) 목표 단위/목표/자동저장 ───────────────────────────────────────
  t(await evL("var e=_ctrl('목표 단위');if(!e)return false;_setv(e,'chars');return _ctrl('목표 단위').value==='chars'"), "목표 단위를 '글자(자)'로 변경 반영")
  await sleep(160)
  t(await evL("return /글자/.test(_lbl('원고 목표'))"), "목표 단위 변경 시 '원고 목표(글자)' 라벨로 즉시 갱신")
  t(await evL("var e=_ctrl('원고 목표');if(!e)return false;_setv(e,50000);return _ctrl('원고 목표').value==='50000'"), '원고 목표 숫자 입력 반영(50000)')
  t(await evL("var e=_ctrl('자동 저장');if(!e)return false;_setv(e,'3000');return _ctrl('자동 저장').value==='3000'"), "자동 저장 간격을 '느슨(3초)'으로 변경 반영")

  // ── (E) Esc 로 모달 닫힘 ──────────────────────────────────────────────
  await escKey(); await sleep(350)
  t(!(await evp("return !!document.querySelector('.modal-backdrop')")), 'Esc 키로 설정 모달이 닫힌다')

  // ── (F) 테마 전환 즉시 반영(라이트/다크/세피아) ───────────────────────
  t(await setThemeTo('light'), '테마를 라이트로 정규화')
  const bgLight = await evp("return getComputedStyle(document.body).backgroundColor")
  await clickAria('테마 전환'); await sleep(250)
  const tDark = await themeNow()
  const bgDark = await evp("return getComputedStyle(document.body).backgroundColor")
  t(tDark === 'dark' && bgDark !== bgLight, '테마 라이트→다크 전환 즉시 반영(data-theme=dark, 배경색 실제 변경)')
  for (const th of ['sepia', 'light']) {
    t(await setThemeTo(th), '테마 ' + th + ' 로 전환됨(data-theme=' + th + ')')
    t(await evp("var b=document.querySelector('.paper,.center,.st-center')||document.body;var cs=getComputedStyle(b);var bg=getComputedStyle(document.body).backgroundColor;return !!cs.color&&!/rgba\\(0, 0, 0, 0\\)/.test(cs.color)&&!!bg&&bg!=='rgba(0, 0, 0, 0)'"), '테마 ' + th + ' 본문/배경 불투명(가독성)')
  }

  // ── (G) 글자크기 A± 즉시 반영 ─────────────────────────────────────────
  await setThemeTo('light') // 테마는 (F)에서 light 로 끝나지만 안전하게 정규화
  await evp("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.getAttribute('aria-label')||'')==='글자 크기 초기화'});if(b)b.click();return 1"); await sleep(250)
  const zoom0 = await evp("return String(document.documentElement.style.zoom||'1')")
  t(zoom0 === '1' || zoom0 === '', '글자크기 초기화 시 100%(zoom=1)')
  await clickAria('글자 크게'); await sleep(250)
  const zoomUp = await evp("return parseFloat(document.documentElement.style.zoom||'1')")
  const pctUp = await evp("var v=document.querySelector('.uiscale-val');return v?(v.textContent||''):''")
  t(zoomUp > 1.0 && /1\d\d%/.test(pctUp), 'A+ 클릭 시 화면 글자 확대(zoom>1, 표시=' + pctUp + ')')
  await clickAria('글자 작게'); await sleep(220)
  const zoomBack = await evp("return parseFloat(document.documentElement.style.zoom||'1')")
  t(Math.abs(zoomBack - 1.0) < 0.001, 'A− 클릭 시 다시 100%로 복귀(zoom=' + zoomBack + ')')

  // ── (H) 리로드 유지: 테마(다크) + 글자크기(1.1) + 편집창 폭(842) ──────
  t(await setThemeTo('dark'), '리로드 검증용 테마 다크 설정')
  await openSettings()
  t(await evL("var e=_ctrl('편집창 폭');if(!e)return false;_setv(e,842);return _ctrl('편집창 폭').value==='842'"), '리로드 검증용 편집창 폭 842 설정')
  await escKey(); await sleep(300)
  await clickAria('글자 크게'); await sleep(250) // 100%→110%
  const zoomBeforeReload = await evp("return String(parseFloat(document.documentElement.style.zoom||'1'))")
  t(await waitClean(), '변경 후 자동저장 완료(dirty=false) — 리로드 전 IndexedDB 영속 확인')
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  t(await waitHook(), '리로드 후 앱 재로드 + 훅 준비')
  await dismiss()
  t((await themeNow()) === 'dark', '리로드 후에도 테마 다크 유지(localStorage+IndexedDB 영속)')
  const zoomAfter = await evp("return String(parseFloat(document.documentElement.style.zoom||'1'))")
  t(zoomAfter === zoomBeforeReload, '리로드 후에도 글자크기 유지(zoom ' + zoomBeforeReload + '→' + zoomAfter + ')')
  await ensurePaper()
  await openSettings()
  t(await evL("var e=_ctrl('편집창 폭');return !!e&&e.value==='842'"), '리로드 후에도 편집창 폭=842 유지(설정 영속) ⚠DEV서버 주의')
  await escKey(); await sleep(250)

  // ── (I) 상호작용 구간 콘솔에러 없음 ───────────────────────────────────
  t(errs.length === 0, '설정/테마/글자크기 상호작용 중 콘솔 에러/예외 없음' + (errs.length ? ' — ' + JSON.stringify(errs.slice(0, 3)) : ''))

  console.log('=== 설정/테마/타이포 실사용 베타 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
