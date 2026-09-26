// 클래식 ↔ 스튜디오 모달/도구허브 패리티(양 스킨, 실제 조작):
// 클래식에서 되는 모든 모달(compile/platformPublish/.../creative)을 '스튜디오에서도' __setModal 로 열어
//  ① 내용 렌더 ② 1개 대표 상호작용(입력/셀렉트/탭/포커스) ③ 닫힘 을 각각 단언한다.
// 도구허브는 추가로 검색 필터 + 도구 1개 실제 열기/닫기까지 검증. 두 스킨 결과가 같아야 하며, 한쪽만 되면 [PARITY-GAP].
// 코드리뷰가 아니라 '조작→결과'(DOM 변화/모달 출현/.toolwin 출현/포커스 이동)로만 단언한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 클래식·스튜디오 공통으로 떠야 하는 모달들(클래식에서 메뉴/툴바로 도달 가능한 전부)
const MODALS = ['compile', 'platformPublish', 'platformPreview', 'toolhub', 'genrebox', 'stats', 'style', 'settings', 'newProject', 'projects', 'nameGen', 'backup', 'docLink', 'replace', 'docTemplate', 'linguistic', 'structure', 'tension', 'creative']
// 떠 있는 다이얼로그(도구창/투어 제외) 선택자
const DIALOG = ".modal-backdrop,.modal-overlay,[role='dialog']:not(.toolwin):not(.tour-bubble)"

// 대표 상호작용을 페이지에서 1회 수행하고 결과 코드를 돌려준다(데이터 안전: 파괴적 액션 버튼은 클릭하지 않고
//  입력/셀렉트/탭/포커스 같은 비파괴 조작만 한다).
const INTERACT = "var SEL=" + JSON.stringify(DIALOG) + ";" +
  "var d=document.querySelector(SEL);if(!d)return 'no-dialog';" +
  // ① 텍스트 입력/textarea 가 있으면 네이티브 setter 로 값 주입 후 되읽기
  "var inp=d.querySelector('input[type=\\\"text\\\"],input[type=\\\"search\\\"],input.field,input:not([type]):not([type=\\\"checkbox\\\"]):not([type=\\\"radio\\\"]),textarea');" +
  "if(inp){var proto=inp.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var set=Object.getOwnPropertyDescriptor(proto,'value').set;set.call(inp,'테스트입력');inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));return inp.value==='테스트입력'?'input-ok':'input-fail';}" +
  // ② select 면 다른 옵션으로 변경
  "var sel=d.querySelector('select');if(sel&&sel.options.length>1){var s2=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;var i=sel.selectedIndex>0?0:1;var nv=sel.options[i].value;s2.call(sel,nv);sel.dispatchEvent(new Event('change',{bubbles:true}));return sel.value===nv?'select-ok':'select-fail';}" +
  // ③ 체크박스 토글(비파괴)
  "var cb=d.querySelector('input[type=\\\"checkbox\\\"]');if(cb){var was=cb.checked;cb.click();return cb.checked!==was?'check-ok':'check-fail';}" +
  // ④ 탭/세그먼트(role=tab 또는 .seg/.tab 류) 클릭(비파괴 뷰 전환)
  "var tab=d.querySelector('[role=\\\"tab\\\"],.seg button,.tab,.cs-tab,.modal-tab');if(tab){tab.click();return 'tab-ok';}" +
  // ⑤ 그 외엔 비파괴적으로 첫 버튼에 포커스만(도달 가능 확인)
  "var b=[].slice.call(d.querySelectorAll('button')).filter(function(x){return !x.disabled});if(b.length){b[0].focus();return document.activeElement===b[0]?'focus-ok':(b.length+'-btns');}" +
  "return 'none';"

// 도구허브 전용: 검색 입력 → 카드 수 감소 확인, 그리고 도구 카드 1개 클릭 → .toolwin 출현
const HUB_SEARCH_BEFORE = "var d=document.querySelector('.modal');return d?d.querySelectorAll('.toolhub-card').length:0"
const HUB_TYPE = "var f=document.querySelector('.modal input.field');if(!f)return 'no-field';var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(f,'타이머');f.dispatchEvent(new Event('input',{bubbles:true}));return f.value"
const HUB_OPEN_FIRST = "var c=document.querySelector('.toolhub-card');if(!c)return 'no-card';c.click();return 'ok'"

async function runSkin(ws, sid, skin, t, errs) {
  for (const m of MODALS) {
    const before = errs.length
    await ev(ws, sid, "window.__setModal('" + m + "');return 1"); await sleep(360)
    // ① 렌더: 다이얼로그 존재 + 텍스트 내용
    const open = await ev(ws, sid, "return !!document.querySelector(\"" + DIALOG + "\")")
    const hasContent = await ev(ws, sid, "var d=document.querySelector(\"" + DIALOG + "\");return !!d&&(d.textContent||'').trim().length>3")
    t(open && hasContent, '[' + skin + '] 모달 ' + m + ' 열림+내용 렌더' + (open ? '' : ' [PARITY-GAP] 안 열림'))

    if (m === 'toolhub' && open) {
      // ② 도구허브 대표 상호작용: 검색 필터로 카드 수 감소
      const cnt0 = await ev(ws, sid, HUB_SEARCH_BEFORE)
      const typed = await ev(ws, sid, HUB_TYPE); await sleep(300)
      const cnt1 = await ev(ws, sid, HUB_SEARCH_BEFORE)
      t(typed === '타이머' && cnt1 > 0 && cnt1 < cnt0, '[' + skin + '] 도구허브 검색 필터 동작(' + cnt0 + '→' + cnt1 + ')')
      // ③ 도구 1개 실제 열기 → .toolwin 출현
      const oc = await ev(ws, sid, HUB_OPEN_FIRST); await sleep(550)
      const win = await ev(ws, sid, "return !!document.querySelector('.toolwin')")
      t(oc === 'ok' && win, '[' + skin + '] 도구허브에서 도구 실제 열림(.toolwin)' + (win ? '' : ' [PARITY-GAP]'))
      // 정리: 열린 도구창 닫기
      await ev(ws, sid, "var x=document.querySelector('.toolwin button[aria-label=\"닫기\"]');if(x)x.click();return 1"); await sleep(200)
      // toolhub 모달은 카드 클릭 시 자동 닫힘 — 잔여 정리
      await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)
      const closedHub = !(await ev(ws, sid, "return !!document.querySelector(\"" + DIALOG + "\")"))
      t(closedHub, '[' + skin + '] 도구허브 닫힘')
      t(errs.length === before, '[' + skin + '] 모달 toolhub 무에러')
      continue
    }

    // ② 일반 모달 대표 상호작용
    const res = open ? await ev(ws, sid, INTERACT) : 'no-dialog'
    await sleep(120)
    const good = ['input-ok', 'select-ok', 'check-ok', 'tab-ok', 'focus-ok'].includes(res)
    t(good, '[' + skin + '] 모달 ' + m + ' 대표 상호작용(' + res + ')')

    // ③ 닫힘
    await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(240)
    const closed = !(await ev(ws, sid, "return !!document.querySelector(\"" + DIALOG + "\")"))
    t(closed, '[' + skin + '] 모달 ' + m + ' 닫힘')
    t(errs.length === before, '[' + skin + '] 모달 ' + m + ' 무에러')
  }

  // 전역 컨트롤 도달성(양 스킨 공통): 수집함·푸터·바인더/인스펙터 패널이 존재해야
  t(await ev(ws, sid, "return !!document.querySelector('.stash-icon,.stash-win')"), '[' + skin + '] 전역 수집함 컨트롤 존재')
  t(await ev(ws, sid, "return !!document.querySelector('.footer,.st-footer')"), '[' + skin + '] 전역 푸터 존재')
  t(await ev(ws, sid, "return !!document.querySelector('.binder')||!!document.querySelector('.insp-tabs')"), '[' + skin + '] 바인더/인스펙터 패널 존재')
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  // 콘솔/예외 에러 캡처(클릭/입력 테스트이므로 Runtime.enable 허용)
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setModal==='function'&&typeof window.__openTool==='function'")) return true } catch { /* 로딩중 */ } } return false }

  const perSkin = {}
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1400)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), '[' + skin + '] 앱 로드 + 테스트 훅 준비')
    // 환영/투어 닫기
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    // 스킨이 실제로 적용됐는지(스튜디오=좌측 레일, 클래식=툴바) — 단순 도달성
    const skinDom = await ev(ws, sid, "return {rail:!!document.querySelector('.st-rail'),toolbar:!!document.querySelector('.toolbar')}")
    t(skin === 'studio' ? skinDom.rail : skinDom.toolbar, '[' + skin + '] 스킨 셸 적용(' + JSON.stringify(skinDom) + ')')
    errs.length = 0
    const start = bad.length
    await runSkin(ws, sid, skin, t, errs)
    perSkin[skin] = bad.length - start // 이 스킨에서 새로 생긴 실패 수
  }

  // 패리티 종합: 두 스킨의 실패 수가 같아야(한쪽만 실패=PARITY-GAP)
  t(perSkin.classic === perSkin.studio, '패리티: 두 스킨 실패 수 동일(classic=' + perSkin.classic + ', studio=' + perSkin.studio + ')' + (perSkin.classic === perSkin.studio ? '' : ' [PARITY-GAP] 스킨별 차이'))

  console.log('=== 클래식↔스튜디오 모달/도구허브 패리티(실조작) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
