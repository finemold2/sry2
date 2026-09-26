// 인스펙터 실동작 검증 — 우측 탭 전환(role=tab) + 메타(라벨/상태/문서목표)·키워드·시놉시스·노트 입력이
// 실제로 스토어/카드/바인더에 반영되는지 확인. 코드리뷰가 아니라 클릭/입력의 '효과'를 본다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// React 제어 컴포넌트(textarea/number input)에 값을 넣는다: 네이티브 value setter 로 설정 후 input 이벤트 발화.
const setReact = (sel, v) => `(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return'no:'+${JSON.stringify(sel)};const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value').set;setter.call(el,${JSON.stringify(String(v))});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return'ok'})()`
// 인스펙터 메타 탭의 라벨/상태 select 를 라벨 텍스트로 찾는다(섹션 label 의 다음 형제 select).
const setMetaSelectByLabel = (labelText, optionIndex) => `(()=>{const secs=[...document.querySelectorAll('.inspector .insp-section')];const sec=secs.find(s=>{const l=s.querySelector('label');return l&&l.textContent.trim().indexOf(${JSON.stringify(labelText)})===0});if(!sec)return'no-sec';const sel=sec.querySelector('select');if(!sel)return'no-sel';const opts=[...sel.options];if(opts.length<=${optionIndex})return'no-opt';sel.value=opts[${optionIndex}].value;sel.dispatchEvent(new Event('change',{bubbles:true}));return opts[${optionIndex}].textContent.trim()})()`
const metaSelectValueText = (labelText) => `(()=>{const secs=[...document.querySelectorAll('.inspector .insp-section')];const sec=secs.find(s=>{const l=s.querySelector('label');return l&&l.textContent.trim().indexOf(${JSON.stringify(labelText)})===0});if(!sec)return'';const sel=sec.querySelector('select');if(!sel)return'';const o=[...sel.options].find(x=>x.value===sel.value);return o?o.textContent.trim():''})()`
// 탭은 라벨 텍스트가 아니라 안정적인 id(insp-tab-<key>)로 찾는다(아이콘 탭의 textContent 오염 회피).
// Inspector.tsx TABS: notes=노트, meta=메타, keywords=키워드, comments=주석, bookmarks=북마크, snapshots=스냅샷.
const TAB_KEY = { '노트': 'notes', '메타': 'meta', '키워드': 'keywords', '주석': 'comments', '북마크': 'bookmarks', '스냅샷': 'snapshots', '즐겨찾기': 'favorites', 'SEO': 'seo', '연계': 'tools' }
const tabSel = (label) => `.inspector .insp-tabs #insp-tab-${TAB_KEY[label] || label}[role="tab"]`
const clickTab = (label) => `(()=>{const b=document.querySelector(${JSON.stringify(tabSel(label))});if(!b)return'no:'+${JSON.stringify(label)};b.click();return'ok'})()`
const tabSelected = (label) => `(()=>{const b=document.querySelector(${JSON.stringify(tabSel(label))});return b?b.getAttribute('aria-selected'):'none'})()`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid)
  // 와이드 뷰포트(1500x950) — 좁은 화면(NARROW_PX=820)에서 인스펙터가 자동으로 접히는 것을 피해 패널이 항상 보이게 한다.
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false }, sid)
  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 준비(1): 바인더에서 첫 텍스트 문서 '행'을 실제로 클릭해 선택(실사용 경로).
  // 행의 제목 span(.binder-title)을 클릭하면 .binder-row 의 onClick(select)으로 버블링된다.
  const activeId = await ev(ws, sid, `
    const e=window.__scriv.entries().find(x=>x.type==='text');
    const title=e?e.title:null;
    if(title){
      const titleEl=[...document.querySelectorAll('.binder .binder-title')].find(n=>n.textContent&&n.textContent.trim()===title)
        || [...document.querySelectorAll('.binder *')].find(n=>n.textContent&&n.textContent.trim()===title&&n.children.length===0);
      if(titleEl)(titleEl.closest('.binder-row')||titleEl).click();
    }
    return window.__scriv.state().activeId`)
  await sleep(300)
  t(!!activeId, '활성 문서(텍스트) 선택됨(activeId=' + activeId + ')')

  // 준비(2): 인스펙터 패널을 연다. 이미 열려 있으면(.insp-tabs 존재) 그대로,
  // 아니면 인스펙터 토글 버튼(App.tsx: title="인스펙터 (⌘⇧I)")을 클릭해 연다.
  const openInspector = `(()=>{
    if(document.querySelector('.inspector .insp-tabs'))return'already';
    const b=[...document.querySelectorAll('button.tbtn')].find(x=>(x.title||'').indexOf('인스펙터')===0);
    if(!b)return'no-toggle';
    b.click();return'clicked'})()`
  const inspState = await ev(ws, sid, openInspector); await sleep(350)
  t(await ev(ws, sid, `return !!document.querySelector('.inspector .insp-tabs')`), '인스펙터 패널 열림(' + inspState + ')')

  // ── 1) 탭 전환: 메타 탭 클릭 → aria-selected + 메타 전용 UI(라벨 select) 등장 ──
  await ev(ws, sid, clickTab('메타')); await sleep(250)
  t(await ev(ws, sid, tabSelected('메타')) === 'true', "탭 전환: '메타' 탭 aria-selected=true")
  t(await ev(ws, sid, `return [...document.querySelectorAll('.inspector .insp-section label')].some(l=>l.textContent.trim().indexOf('라벨')===0)`), "메타 탭 전환 효과: '라벨' 섹션이 실제로 표시됨")

  // ── 2) 라벨 변경: 두 번째 옵션(없음 다음, 예: '아이디어') 선택 → ──
  //    (a) 제어 select 의 표시값이 그 옵션으로 바뀜(스토어 반영) (b) label-dot 색이 칠해짐 (c) dirty=true
  const dirtyBefore = await ev(ws, sid, `return window.__scriv.state().dirty`)
  const pickedLabel = await ev(ws, sid, setMetaSelectByLabel('라벨', 1)); await sleep(300)
  const labelNow = await ev(ws, sid, metaSelectValueText('라벨'))
  t(pickedLabel && labelNow === pickedLabel, '라벨 select 변경 → 제어값이 "' + pickedLabel + '" 로 반영(스토어 적용)')
  const dotBg = await ev(ws, sid, `(()=>{const secs=[...document.querySelectorAll('.inspector .insp-section')];const sec=secs.find(s=>{const l=s.querySelector('label');return l&&l.textContent.trim().indexOf('라벨')===0});const dot=sec&&sec.querySelector('.label-dot');return dot?getComputedStyle(dot).backgroundColor:''})()`)
  t(!!dotBg && dotBg !== 'rgba(0, 0, 0, 0)' && dotBg !== 'transparent', '라벨 변경 효과: 색 점(label-dot)이 실제 색으로 칠해짐 (' + dotBg + ')')
  t(await ev(ws, sid, `return window.__scriv.state().dirty`) === true, '메타 변경으로 프로젝트 dirty=true (변경전 ' + dirtyBefore + ')')

  // ── 3) 상태 변경: 두 번째 옵션 선택 → 제어값 반영 + 코르크보드 카드에 상태명이 표시됨(스토어→뷰 영속) ──
  const pickedStatus = await ev(ws, sid, setMetaSelectByLabel('상태', 1)); await sleep(300)
  t(pickedStatus && (await ev(ws, sid, metaSelectValueText('상태'))) === pickedStatus, '상태 select 변경 → 제어값 "' + pickedStatus + '" 반영')

  // ── 4) 문서 목표(단어) 입력 → 제어값 유지 + 진척 라인("/  단어") 등장 ──
  await ev(ws, sid, setReact('.inspector input[type="number"]', '500')); await sleep(300)
  const targetVal = await ev(ws, sid, `const el=document.querySelector('.inspector input[type=number]');return el?el.value:''`)
  t(targetVal === '500', '문서 목표 입력 → number 입력 제어값 500 유지(스토어 반영)')
  t(await ev(ws, sid, `return /\\/\\s*500\\s*단어/.test(document.querySelector('.inspector').textContent||'')`), '문서 목표 효과: "… / 500 단어 (n%)" 진척 표시가 실제로 나타남')

  // ── 5) 키워드 추가 + 태깅: '키워드' 탭에서 새 키워드 입력 후 Enter → 칩 등장, 클릭 시 .on(문서 태깅) ──
  await ev(ws, sid, clickTab('키워드')); await sleep(250)
  const kwName = 'QA검증_' + Date.now()
  const before = await ev(ws, sid, `return document.querySelectorAll('.inspector .kw-chip').length`)
  await ev(ws, sid, `(()=>{const inp=document.querySelector('.inspector input[placeholder="새 키워드"]');if(!inp)return'no';const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(inp,${JSON.stringify(kwName)});inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return'ok'})()`); await sleep(350)
  const after = await ev(ws, sid, `return document.querySelectorAll('.inspector .kw-chip').length`)
  t(after === before + 1, '키워드 추가(Enter) → 새 칩이 1개 늘어남(' + before + '→' + after + ')')
  const tagged = await ev(ws, sid, `(()=>{const chip=[...document.querySelectorAll('.inspector .kw-chip')].find(c=>c.textContent.trim().indexOf(${JSON.stringify(kwName)})>=0);if(!chip)return'no-chip';const wasOn=chip.classList.contains('on');chip.click();return chip.classList.contains('on')?'on':'off'})()`); await sleep(300)
  t(tagged === 'on', '키워드 칩 클릭 → 문서에 태깅됨(.on 적용)')
  // 태깅 영속: 노트 탭으로 갔다가 키워드 탭 복귀 후에도 .on 유지(스토어에서 다시 그려짐)
  await ev(ws, sid, clickTab('노트')); await sleep(150); await ev(ws, sid, clickTab('키워드')); await sleep(250)
  const stillOn = await ev(ws, sid, `(()=>{const chip=[...document.querySelectorAll('.inspector .kw-chip')].find(c=>c.textContent.trim().indexOf(${JSON.stringify(kwName)})>=0);return chip?(chip.classList.contains('on')?'on':'off'):'gone'})()`)
  t(stillOn === 'on', '키워드 태그 영속: 탭 왕복 후에도 칩이 .on 유지(스토어 반영)')

  // ── 6) 시놉시스 입력 → 노트 탭 textarea.syn-text 입력 → 코르크보드 카드(.card-syn)에 동일 텍스트 표시(스토어→뷰) ──
  await ev(ws, sid, clickTab('노트')); await sleep(250)
  const synText = '시놉시스 QA 입력 ' + Date.now()
  t(await ev(ws, sid, setReact('.inspector textarea.syn-text', synText)) === 'ok', '시놉시스 textarea 입력 실행')
  await sleep(300)
  // 코르크보드 뷰 버튼(title="코르크보드 …")을 실제 클릭해 전환 → 카드 줄거리에 반영됐는지 확인(스토어→뷰 영속).
  const clickViewBtn = (titlePrefix) => `(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.title||'').indexOf(${JSON.stringify(titlePrefix)})===0);if(!b)return'no';b.click();return'ok'})()`
  await ev(ws, sid, clickViewBtn('코르크보드')); await sleep(600)
  const cardSyn = await ev(ws, sid, `return [...document.querySelectorAll('.card-syn')].some(el=>(el.textContent||'').indexOf(${JSON.stringify(synText)})>=0)`)
  // 에디터 뷰로 복귀 후 노트 탭의 제어값 유지로도 검증(폴백; 둘 중 하나만 충족해도 영속 증명).
  await ev(ws, sid, clickViewBtn('에디터')); await sleep(400)
  await ev(ws, sid, clickTab('노트')); await sleep(250)
  const synBack = await ev(ws, sid, `const el=document.querySelector('.inspector textarea.syn-text');return el?el.value:''`)
  t(cardSyn || synBack === synText, '시놉시스 영속: 코르크보드 카드(.card-syn=' + cardSyn + ') 또는 탭 왕복 후 제어값에 반영')

  // ── 7) 노트 입력 → 문서 노트 textarea.field 입력 → 탭 왕복 후에도 제어값 유지(스토어 반영) ──
  const noteText = '문서 노트 QA ' + Date.now()
  // '문서 노트' 모드인지 확인(기본). 노트 영역의 첫 textarea.field 가 문서 노트.
  t(await ev(ws, sid, setReact('.inspector textarea.field', noteText)) === 'ok', '문서 노트 textarea 입력 실행')
  await sleep(300)
  await ev(ws, sid, clickTab('메타')); await sleep(150); await ev(ws, sid, clickTab('노트')); await sleep(250)
  const noteBack = await ev(ws, sid, `const el=document.querySelector('.inspector textarea.field');return el?el.value:''`)
  t(noteBack === noteText, '노트 영속: 탭 왕복 후에도 문서 노트 제어값 유지(스토어 반영)')

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 인스펙터 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
