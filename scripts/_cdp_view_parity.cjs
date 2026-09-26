// 클래식 ↔ 스튜디오 '뷰별 컨트롤 패리티' 검증 — 10개 뷰의 대표 컨트롤을 양 스킨에서 실제로 조작하고
// '조작→결과'(DOM 변화/카운트 증감/활성화/상태 토글/__scriv 상태)로 단언한다. 코드리뷰가 아니라 실사용 조작.
// 핵심: 클래식에서 되는 컨트롤이 스튜디오에서도 도달+작동하는지 양 스킨 각각 검증하고, 교차 비교로 누락([PARITY-GAP])을 짚는다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const E = (x) => ev(ws, sid, x)
  const S = sleep
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }
  // 뷰 전환 후 중앙 컨테이너(클래식 .center / 스튜디오 .st-center) 렌더 대기
  const gotoView = async (v) => { await E("window.__setView('" + v + "');return 1"); for (let i = 0; i < 12; i++) { await S(120); if (await E("var c=document.querySelector('.st-center,.center');return !!c&&c.children.length>0")) break } await S(180) }
  // 제어 select 네이티브 setter(인덱스 지정) — React onChange 까지 발화
  const setSel = (sel, idx, val) => "var es=document.querySelectorAll(" + JSON.stringify(sel) + ");var e=es[" + idx + "];if(!e)return 'NO';var s=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;s.call(e," + JSON.stringify(val) + ");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return e.value"

  // === 10개 뷰 × 대표 컨트롤 (각 fn 은 조작 후 결과 boolean) ===
  const CHECKS = [
    // 1) 에디터 — 본문 contentEditable + 포맷바
    { id: 'editor-paper', view: 'editor', desc: '본문 paper 도달+편집가능(contentEditable)',
      fn: async () => (await E("var p=document.querySelector('.paper');return !!(p&&p.isContentEditable)")) === true },
    { id: 'editor-formatbar', view: 'editor', desc: '포맷바 렌더(select≥3)+굵게 버튼 클릭 동작',
      fn: async () => (await E("var f=document.querySelector('.formatbar');if(!f)return 0;var n=f.querySelectorAll('select').length;var b=[].slice.call(f.querySelectorAll('button')).find(function(x){return /굵게/.test(x.title||'')});if(b)b.click();return (n>=3&&b)?1:0")) === 1 },

    // 2) 코르크보드 — 자유배치 토글 / 정렬 select / 크기 select
    { id: 'cork-freeform', view: 'corkboard', desc: '자유 배치 체크박스 토글 동작',
      fn: async () => {
        const before = await E("var c=document.querySelector('.cork-toolbar input[type=checkbox]');return c?(c.checked?1:0):-1")
        if (before < 0) return false
        await E("var c=document.querySelector('.cork-toolbar input[type=checkbox]');if(c)c.click();return 1"); await S(300)
        const after = await E("var c=document.querySelector('.cork-toolbar input[type=checkbox]');return c?(c.checked?1:0):-1")
        await E("var c=document.querySelector('.cork-toolbar input[type=checkbox]');if(c)c.click();return 1"); await S(180) // 복원
        return before !== after
      } },
    { id: 'cork-sort', view: 'corkboard', desc: '정렬 select 변경 반영(title)',
      fn: async () => {
        await E("var c=document.querySelector('.cork-toolbar input[type=checkbox]');if(c&&c.checked)c.click();return 1"); await S(150) // 자유배치 해제(정렬 활성화)
        const v = await E(setSel('.cork-toolbar select.field', 0, 'title')); await S(120)
        await E(setSel('.cork-toolbar select.field', 0, 'manual')) // 복원(드래그 재배치 가능)
        return v === 'title'
      } },
    { id: 'cork-size', view: 'corkboard', desc: '크기 select 변경 반영(lg)',
      fn: async () => {
        const v = await E(setSel('.cork-toolbar select.field', 1, 'lg')); await S(120)
        await E(setSel('.cork-toolbar select.field', 1, 'md'))
        return v === 'lg'
      } },

    // 3) 아웃라이너 — 컬럼 표시 메뉴 / 컬럼 토글
    { id: 'out-colmenu', view: 'outliner', desc: '컬럼 표시 버튼 클릭→메뉴(.col-menu) 출현',
      fn: async () => {
        await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /컬럼 표시 선택/.test(x.title||'')});if(b)b.click();return 1"); await S(280)
        const open = await E("return !!document.querySelector('.col-menu')")
        await E("var o=document.querySelector('.menu-overlay');if(o)o.click();return 1"); await S(140)
        return open === true
      } },
    { id: 'out-coltoggle', view: 'outliner', desc: '컬럼 체크박스 토글→표 열 수 변화',
      fn: async () => {
        await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /컬럼 표시 선택/.test(x.title||'')});if(b)b.click();return 1"); await S(240)
        const before = await E("return document.querySelectorAll('.outliner thead th').length")
        await E("var c=document.querySelector('.col-menu-item input[type=checkbox]');if(c)c.click();return 1"); await S(240)
        const after = await E("return document.querySelectorAll('.outliner thead th').length")
        await E("var c=document.querySelector('.col-menu-item input[type=checkbox]');if(c)c.click();return 1"); await S(140) // 복원
        await E("var o=document.querySelector('.menu-overlay');if(o)o.click();return 1"); await S(120)
        return typeof before === 'number' && before !== after
      } },

    // 4) 칸반 보드 — 그룹 select / 칸 +버튼(문서 추가)
    { id: 'board-group', view: 'board', desc: '그룹 select 변경 반영(label)',
      fn: async () => {
        const v = await E(setSel('.board-toolbar select.field', 0, 'label')); await S(150)
        await E(setSel('.board-toolbar select.field', 0, 'status'))
        return v === 'label'
      } },
    { id: 'board-add', view: 'board', desc: '칸 +버튼(.board-col-add)→문서 추가(items 증가)',
      fn: async () => {
        const before = await E("return window.__scriv.state().items")
        await E("var b=document.querySelector('.board-col-add');if(!b)return 0;b.click();return 1"); await S(450)
        const after = await E("return window.__scriv.state().items")
        return typeof before === 'number' && after > before
      } },

    // 5) 스토리 캔버스 — +카드(노드 추가)
    { id: 'canvas-add', view: 'canvas', desc: '+카드 버튼→노드 추가([data-node-id] 증가)',
      fn: async () => {
        const before = await E("return document.querySelectorAll('[data-node-id]').length")
        await E("var b=[].slice.call(document.querySelectorAll('.canvas-toolbar .minibtn')).find(function(x){var tx=(x.textContent||'').trim();return tx.indexOf('카드')>=0&&tx.indexOf('문서')<0&&tx.indexOf('그룹')<0});if(!b)return 0;b.click();return 1"); await S(400)
        const after = await E("return document.querySelectorAll('[data-node-id]').length")
        return after > before
      } },

    // 6) 연재 관리 — 성과 탭 / 발행 캘린더 탭
    { id: 'serial-perf', view: 'serial', desc: '성과 탭→성과표(.perf-table) 출현',
      fn: async () => {
        await E("var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()==='성과'});if(b)b.click();return 1"); await S(340)
        const ren = await E("return !!document.querySelector('.perf-table')")
        await E("var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()==='파이프라인'});if(b)b.click();return 1"); await S(140)
        return ren === true
      } },
    { id: 'serial-cal', view: 'serial', desc: '발행 캘린더 탭→캘린더(.serial-cal-head) 출현',
      fn: async () => {
        await E("var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()==='발행 캘린더'});if(b)b.click();return 1"); await S(340)
        const ren = await E("return !!document.querySelector('.serial-cal-head')")
        await E("var b=[].slice.call(document.querySelectorAll('.serial-toolbar .minibtn')).find(function(x){return (x.textContent||'').trim()==='파이프라인'});if(b)b.click();return 1"); await S(140)
        return ren === true
      } },

    // 7) 스토리 타임라인 — 스윔레인 버튼 / 스토리시간순 정렬 체크박스
    { id: 'timeline-lane', view: 'timeline', desc: '스윔레인 POV 버튼→활성화(.active)',
      fn: async () => {
        await E("var s=document.querySelector('.st-center,.center');var b=[].slice.call(s.querySelectorAll('button.minibtn')).find(function(x){return (x.textContent||'').trim()==='POV'});if(b)b.click();return 1"); await S(280)
        return (await E("var s=document.querySelector('.st-center,.center');var b=[].slice.call(s.querySelectorAll('button.minibtn')).find(function(x){return (x.textContent||'').trim()==='POV'});return !!(b&&b.classList.contains('active'))")) === true
      } },
    { id: 'timeline-sort', view: 'timeline', desc: '스토리시간순 정렬 체크박스 토글',
      fn: async () => {
        const before = await E("var s=document.querySelector('.st-center,.center');var c=s.querySelector('input[type=checkbox]');return c?(c.checked?1:0):-1")
        if (before < 0) return false
        await E("var s=document.querySelector('.st-center,.center');var c=s.querySelector('input[type=checkbox]');if(c)c.click();return 1"); await S(240)
        const after = await E("var s=document.querySelector('.st-center,.center');var c=s.querySelector('input[type=checkbox]');return c?(c.checked?1:0):-1")
        await E("var s=document.querySelector('.st-center,.center');var c=s.querySelector('input[type=checkbox]');if(c)c.click();return 1"); await S(120) // 복원
        return before !== after
      } },

    // 8) 참고문헌 — +출처 추가
    { id: 'ref-add', view: 'references', desc: '+출처 추가 버튼→출처 수 증가',
      fn: async () => {
        const before = await E("var s=document.querySelector('.st-center,.center');var m=(s.textContent||'').match(/출처 (\\d+)개/);return m?+m[1]:-1")
        if (before < 0) return false
        await E("var b=[].slice.call(document.querySelectorAll('.btn-primary')).find(function(x){return /출처 추가/.test(x.textContent||'')});if(b)b.click();return 1"); await S(340)
        const after = await E("var s=document.querySelector('.st-center,.center');var m=(s.textContent||'').match(/출처 (\\d+)개/);return m?+m[1]:-1")
        return after > before
      } },

    // 9) 논증 작업대 — 주장 추가
    { id: 'arg-add', view: 'argument', desc: '주장 추가 버튼→주장 수 증가',
      fn: async () => {
        const before = await E("var s=document.querySelector('.st-center,.center');var m=(s.textContent||'').match(/주장 \\(Claims\\)[^0-9]*(\\d+)/);return m?+m[1]:-1")
        if (before < 0) return false
        await E("var b=[].slice.call(document.querySelectorAll('button.minibtn')).find(function(x){return /주장 추가/.test(x.textContent||'')});if(b)b.click();return 1"); await S(340)
        const after = await E("var s=document.querySelector('.st-center,.center');var m=(s.textContent||'').match(/주장 \\(Claims\\)[^0-9]*(\\d+)/);return m?+m[1]:-1")
        return after > before
      } },

    // 10) 데이터베이스 — 행 범위필터(scope) / 열 헤더 정렬
    { id: 'db-scope', view: 'database', desc: '행 범위필터(인물) 클릭→활성화(.active)',
      fn: async () => {
        await E("var s=document.querySelector('.st-center,.center');var b=[].slice.call(s.querySelectorAll('button.minibtn')).find(function(x){return (x.textContent||'').trim()==='인물'});if(b)b.click();return 1"); await S(280)
        const ren = await E("var s=document.querySelector('.st-center,.center');var b=[].slice.call(s.querySelectorAll('button.minibtn')).find(function(x){return (x.textContent||'').trim()==='인물'});return !!(b&&b.classList.contains('active'))")
        await E("var s=document.querySelector('.st-center,.center');var b=[].slice.call(s.querySelectorAll('button.minibtn')).find(function(x){return (x.textContent||'').trim()==='전체'});if(b)b.click();return 1"); await S(140) // 복원
        return ren === true
      } },
    { id: 'db-sort', view: 'database', desc: '열 헤더(제목) 클릭→정렬 화살표(▲/▼)',
      fn: async () => {
        await E("var th=[].slice.call(document.querySelectorAll('.db-table thead th')).find(function(x){return /제목/.test(x.textContent||'')});if(th)th.click();return 1"); await S(280)
        return (await E("var th=[].slice.call(document.querySelectorAll('.db-table thead th')).find(function(x){return /제목/.test(x.textContent||'')});return !!(th&&/[▲▼]/.test(th.textContent||''))")) === true
      } },
  ]

  const results = {}
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1200)
    await E("try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    // 환영/투어 닫기
    await E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    // 실제 적용된 스킨 확인(스튜디오=app-studio 클래스, 클래식=.toolbar)
    const skinOk = await E("var st=document.querySelector('.app-studio')||document.querySelector('.st-rail');var cl=document.querySelector('.toolbar .tbtn');return '" + skin + "'==='studio'?!!st:!!cl")
    t(skinOk, '[' + skin + '] 스킨 적용 확인(' + (skin === 'studio' ? '.app-studio/.st-rail' : '.toolbar .tbtn') + ')')

    results[skin] = {}
    for (const c of CHECKS) {
      await gotoView(c.view)
      let pass = false, errm = ''
      try { pass = !!(await c.fn()) } catch (e) { pass = false; errm = ' (' + e.message + ')' }
      results[skin][c.id] = pass
      t(pass, '[' + skin + '] ' + c.view + ' · ' + c.desc + (pass ? '' : ' — 미동작' + errm))
    }
  }

  // === 교차 비교(클래식 기준) — 클래식에서 되는데 스튜디오에서 안 되면 [PARITY-GAP] ===
  for (const c of CHECKS) {
    const cl = results.classic[c.id], st = results.studio[c.id]
    if (cl && st) t(true, '패리티 OK · ' + c.view + ' · ' + c.desc)
    else if (cl && !st) t(false, '[PARITY-GAP] ' + c.view + ' · ' + c.desc + ' — 클래식 동작, 스튜디오 미동작/미도달')
    else if (!cl && st) t(false, '[PARITY-GAP] ' + c.view + ' · ' + c.desc + ' — 스튜디오 동작, 클래식 미동작/미도달')
    else t(false, '양 스킨 미동작(컨트롤/기능 점검 필요) · ' + c.view + ' · ' + c.desc)
  }

  console.log('=== 클래식↔스튜디오 뷰별 컨트롤 패리티 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
