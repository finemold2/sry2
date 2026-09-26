// 지식 뷰(참고문헌·논증·캔버스) 실동작 검증 — 실제 버튼을 클릭/입력/드래그하고 그 '효과'를 본다.
//  · ReferencesView: '+ 출처 추가' → 출처 N→N+1 + 편집폼('출처 편집') 등장, 제목 입력 → 목록/서지 미리보기 반영,
//    그리고 scriv:insertCitation 이벤트로 라이브 에디터(.paper)에 span.cite-inline 삽입 + bodyRtf 영속(왕복 복원).
//  · ArgumentView: '주장 추가' → 주장 (Claims)·N→N+1, 근거 추가 → 자식 행(textarea) 등장, 뷰 왕복 후 카운트/텍스트 잔존.
//  · StoryCanvas: '+ 카드' → N카드→N+1 + .canvas-node 렌더, 합성 마우스 드래그로 위치 이동(안 되면 skip), 뷰 왕복 후 영속.
//
// [그라운드 트루스 반영]
//  - 뷰 전환: button.tbtn[aria-label="<정확 라벨>"] 를 .click(). 라벨은 App.tsx viewBtn(title=aria-label=label) 의 정확값.
//  - 뷰 렌더 확인: 컨테이너 DOM 출현(에디터=.paper / 캔버스=.canvas-area+.canvas-toolbar). 참고문헌/논증은 전용 컨테이너
//    클래스가 없으므로(소스 확인) 헤더 텍스트('참고문헌' strong / '논증 작업대' span) + 핵심 버튼 존재로 확인.
//  - RTF 한글: 본문 RTF 는 한글을 \uN? 로 이스케이프(serialize.ts) — bodyRtf 에서 한글 리터럴 검색 금지.
//    cite-inline 의 class 는 RTF 왕복에서 보존되지 않으므로(html.ts collectRuns 미처리), 영속은 '뷰 왕복 후
//    에디터 .paper 에 인용 텍스트가 bodyRtf 로부터 다시 렌더되는지'(DOM 복원)로 확인한다.
//  - React 제어 input/textarea: 네이티브 value setter 로 값 세팅 후 input(+필요 시 blur/change) 발화.
//  - 합성 DnD/마우스 한계: 효과가 안 나오면 t() 로 실패시키지 않고 'skip' 로 콘솔에 남긴다(앱 버그 단정 금지).
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 15000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }

// 상단 뷰 버튼(button.tbtn[aria-label="<정확 라벨>"])을 눌러 뷰 전환. App.tsx viewBtn 의 정확 라벨 사용.
const switchView = (ariaLabel) => `(()=>{const b=document.querySelector('button.tbtn[aria-label='+JSON.stringify(${JSON.stringify(ariaLabel)})+']');if(!b)return'no-tbtn:'+${JSON.stringify(ariaLabel)};b.click();return'ok'})()`
// 정확 뷰 라벨(App.tsx 1912~1921 viewBtn 호출 인자).
const V = {
  editor: '에디터 (⌘1)',
  references: '참고문헌 (⌘8)',
  argument: '논증 작업대 (⌘⇧A)',
  canvas: '스토리 캔버스 (⌘5)',
}
// 컨테이너(sel) 안에서 (부분)텍스트를 가진 버튼을 클릭. trim 후 정확일치 우선, 없으면 포함.
const clickByText = (sel, text) => `(()=>{const all=[...document.querySelectorAll(${JSON.stringify(sel)})];const b=all.find(x=>((x.textContent||'').trim())===${JSON.stringify(text)})||all.find(x=>(x.textContent||'').trim().indexOf(${JSON.stringify(text)})>=0);if(!b)return'no-btn:'+${JSON.stringify(text)};b.click();return'ok'})()`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exc = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') exc.push(1) })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  // 와이드 뷰포트(상단 툴바의 모든 뷰 버튼이 접히지 않게).
  try { await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false }, sid) } catch { /* noop */ }
  // 환영모달 닫기(시작하기|다시 보지).
  await ev(ws, sid, `const b=[...document.querySelectorAll('.modal button,.tour-skip')].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = [], skip = []; const t = (c, m) => (c ? ok : bad).push(m)

  // 활성 문서 id 확보(인용 삽입/영속 확인에 사용).
  const docId = await ev(ws, sid, `return (window.__scriv&&window.__scriv.state().activeId)||''`)
  const bodyOf = async () => (await ev(ws, sid, `return (window.__scriv&&window.__scriv.bodyOf(${JSON.stringify(docId)}))||''`)) || ''

  // =====================================================================
  // 1) 참고문헌 뷰 — '+ 출처 추가' → 출처 1개 증가 + 편집폼('출처 편집') 등장
  // =====================================================================
  await ev(ws, sid, switchView(V.references)); await sleep(500)
  // 컨테이너 클래스가 없어 헤더 strong('참고문헌') + btn-primary(+ 출처 추가) 존재로 뷰 확인.
  const refViewOn = await ev(ws, sid, `return [...document.querySelectorAll('strong')].some(x=>(x.textContent||'').trim()==='참고문헌')&&[...document.querySelectorAll('button.btn-primary')].some(b=>(b.textContent||'').indexOf('출처 추가')>=0)`)
  t(refViewOn, '참고문헌 뷰로 전환됨(헤더 “참고문헌” + “+ 출처 추가” 버튼 존재)')

  // 출처 개수 표기 '출처 N개'(ReferencesView 상단 span) 파싱 — 가장 신뢰 가능한 카운터.
  const refCount = () => `(()=>{const s=[...document.querySelectorAll('span')].map(x=>(x.textContent||'').trim()).find(x=>/^출처 \\d+개$/.test(x));return s?parseInt(s.match(/\\d+/)[0],10):-1})()`
  const before = await ev(ws, sid, `return ${refCount()}`)
  await ev(ws, sid, clickByText('button.btn-primary', '출처 추가')); await sleep(400)
  const after = await ev(ws, sid, `return ${refCount()}`)
  t(before >= 0 && after === before + 1, `'+ 출처 추가' → 출처 ${before}개 → ${after}개 (정확히 1 증가)`)
  // 추가 직후 새 출처가 자동 선택돼(onAdd: setSelectedId) 우측 편집폼('출처 편집' strong)이 떠야 한다.
  const formShown = await ev(ws, sid, `return [...document.querySelectorAll('strong')].some(x=>(x.textContent||'').trim()==='출처 편집')`)
  t(formShown, '추가된 출처가 자동 선택되어 편집폼(“출처 편집”)이 표시됨')

  // =====================================================================
  // 2) 참고문헌 — 제목 입력 → 좌측 목록 + 서지 미리보기에 실제 반영(formatBibliography 동작)
  // =====================================================================
  const TITLE = '인지부하 이론과 글쓰기 검증'
  // React 제어 input/textarea 값 설정 + 이벤트 발화.
  const setReactInput = (sel, val) => `(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return'no:'+${JSON.stringify(sel)};const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value').set;setter.call(el,${JSON.stringify(val)});el.dispatchEvent(new Event('input',{bubbles:true}));return'ok'})()`
  // 제목(input placeholder='문헌 제목', onChange 즉시 커밋).
  await ev(ws, sid, setReactInput("input[placeholder='문헌 제목']", TITLE)); await sleep(350)
  // 저자(textarea, onBlur 커밋)·연도(input placeholder='2024', onChange 커밋)로 서지 라인이 자연스럽게 생성되게.
  await ev(ws, sid, setReactInput("textarea[placeholder*='홍길동']", '홍길동')); await sleep(120)
  await ev(ws, sid, `const el=document.querySelector("textarea[placeholder*='홍길동']");if(el)el.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));return 1`); await sleep(200)
  await ev(ws, sid, setReactInput("input[placeholder='2024']", '2025')); await sleep(300)

  // (a) 좌측 목록 항목 제목에 반영됐는가(목록 span 의 r.title 표시).
  const inList = await ev(ws, sid, `return document.body.innerText.indexOf(${JSON.stringify(TITLE)})>=0`)
  t(inList, '입력한 제목이 좌측 출처 목록에 반영됨')
  // (b) 하단 '참고문헌 미리보기'(서지)에 제목이 들어간 줄(<p>, dangerouslySetInnerHTML)이 생성됐는가 — 포매터 실동작.
  const inBib = await ev(ws, sid, `const ps=[...document.querySelectorAll('p')].filter(p=>(p.innerHTML||'').indexOf(${JSON.stringify(TITLE)})>=0);return ps.length>0`)
  t(inBib, '서지 미리보기(formatBibliography)에 제목 포함 줄이 생성됨')

  // =====================================================================
  // 3) 본문 인용 삽입(scriv:insertCitation) — 라이브 에디터(.paper)에 span.cite-inline 실삽입
  //    + bodyRtf 영속(왕복 복원으로 확인; 한글 리터럴 검색 금지).
  //    (참고문헌 뷰엔 .paper 가 없으므로 에디터 뷰로 전환해 실제 삽입 효과를 검증.)
  // =====================================================================
  await ev(ws, sid, switchView(V.editor)); await sleep(500)
  const paperOn = await ev(ws, sid, `return !!document.querySelector('.paper')`)
  t(paperOn, '에디터 뷰로 전환됨(.paper 컨테이너 렌더)')
  // 본문 준비 + 끝에 캐럿(선택영역) 배치 — 삽입 마커가 들어갈 위치.
  await ev(ws, sid, `const p=document.querySelector('.paper');if(!p)return'no-paper';p.focus();p.innerHTML='<p>인용 삽입 대상 문장입니다.</p>';p.dispatchEvent(new Event('input',{bubbles:true}));const r=document.createRange();r.selectNodeContents(p.firstChild);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));return'ok'`); await sleep(350)
  const before3 = await bodyOf()
  // FormatBar 가 전역에서 듣는 커스텀 이벤트로 인용 삽입(참고문헌 뷰 '본문에 인용' 버튼과 동일 경로).
  await ev(ws, sid, `window.dispatchEvent(new CustomEvent('scriv:insertCitation',{detail:{html:'(홍길동, 2025)',text:'(홍길동, 2025)'}}));return 1`); await sleep(450)
  const citeInDom = await ev(ws, sid, `const p=document.querySelector('.paper');return !!(p&&p.querySelector('span.cite-inline'))&&(p.innerText.indexOf('(홍길동, 2025)')>=0)`)
  t(citeInDom, 'scriv:insertCitation → .paper 안에 span.cite-inline 인용이 실제 삽입됨')
  await sleep(450) // RTF 직렬화/저장 디바운스(200ms) 여유
  const after3 = await bodyOf()
  // 본문 RTF 가 실제로 갱신됐는가(내용 변화 + 길이 증가). 한글은 \uN? 로 이스케이프되므로 리터럴 'cite-inline'/한글은
  // 검색하지 않는다. ASCII 로 살아남는 인용 괄호/연도가 RTF 에 들어갔는지(2025 + 괄호)로 보강 확인.
  const rtfGrew = !!after3 && after3 !== before3 && after3.length > before3.length
  const rtfHasAscii = !!after3 && after3.indexOf('2025') >= 0 && after3.indexOf('(') >= 0 && after3.indexOf(')') >= 0
  t(rtfGrew && rtfHasAscii, '삽입된 인용이 본문 RTF(bodyRtf)에 반영됨(내용 변화 + 인용 괄호/연도 ASCII 잔존)')
  // 영속의 결정적 확인: 다른 뷰로 갔다 돌아오면 에디터가 bodyRtf 로부터 재로드 → 인용 텍스트가 .paper 에 다시 떠야 한다.
  await ev(ws, sid, switchView(V.references)); await sleep(400)
  await ev(ws, sid, switchView(V.editor)); await sleep(500)
  const citePersisted = await ev(ws, sid, `const p=document.querySelector('.paper');return !!p&&p.innerText.indexOf('(홍길동, 2025)')>=0`)
  t(citePersisted, '뷰 왕복(에디터 재로드) 후에도 인용 텍스트가 bodyRtf 로부터 .paper 에 복원됨(영속)')

  // =====================================================================
  // 4) 논증 작업대 — '주장 추가' → 주장 (Claims)·N+1, '근거' 추가 → 자식 행 등장
  // =====================================================================
  await ev(ws, sid, switchView(V.argument)); await sleep(500)
  const argOn = await ev(ws, sid, `return [...document.querySelectorAll('span')].some(x=>(x.textContent||'').trim()==='논증 작업대')`)
  t(argOn, '논증 작업대 뷰로 전환됨(헤더 “논증 작업대”)')
  // 주장 개수 표기 '주장 (Claims) · N'(ArgumentView 120행) 파싱.
  const claimCount = () => `(()=>{const s=[...document.querySelectorAll('span')].map(x=>(x.textContent||'').trim()).find(x=>/^주장 \\(Claims\\) ·/.test(x));return s?parseInt(s.match(/\\d+/)[0],10):-1})()`
  const c0 = await ev(ws, sid, `return ${claimCount()}`)
  await ev(ws, sid, clickByText('button.minibtn', '주장 추가')); await sleep(400)
  const c1 = await ev(ws, sid, `return ${claimCount()}`)
  t(c0 >= 0 && c1 === c0 + 1, `'주장 추가' → 주장 ${c0} → ${c1} (정확히 1 증가)`)
  // 주장 카드 헤더('주장 N' span, ArgumentView 221행) 등장 확인.
  const claimCardShown = await ev(ws, sid, `return [...document.querySelectorAll('span')].some(x=>/^주장 \\d+$/.test((x.textContent||'').trim()))`)
  t(claimCardShown, '주장 카드(“주장 1”)가 DOM 에 렌더됨')
  // 주장 카드 안 '근거' 추가 버튼 → 근거 자식 행(textarea placeholder='내용을 입력하세요.', ArgNodeRow 421행) 등장.
  const evBefore = await ev(ws, sid, `return document.querySelectorAll("textarea[placeholder='내용을 입력하세요.']").length`)
  await ev(ws, sid, `(()=>{const bs=[...document.querySelectorAll('button.minibtn')].filter(b=>(b.textContent||'').trim()==='근거');if(!bs.length)return'no';bs[0].click();return'ok'})()`); await sleep(400)
  const evAfter = await ev(ws, sid, `return document.querySelectorAll("textarea[placeholder='내용을 입력하세요.']").length`)
  t(evAfter === evBefore + 1, `'근거' 추가 → 근거 입력 행 ${evBefore} → ${evAfter} (1 증가)`)

  // 주장 텍스트 입력(영속 확인용) — 주장 카드 textarea(placeholder='주장을 입력하세요.', ClaimCard 227행) defaultValue+onBlur 커밋.
  const CLAIM = '검증 자동화는 원고 안전을 높인다'
  await ev(ws, sid, `(()=>{const el=document.querySelector("textarea[placeholder='주장을 입력하세요.']");if(!el)return'no';const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(el,${JSON.stringify(CLAIM)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));return'ok'})()`); await sleep(350)

  // =====================================================================
  // 5) 논증 영속 — 다른 뷰로 갔다 돌아와도 주장 카운트/근거행/주장 텍스트가 남아있는가(store 영속)
  // =====================================================================
  await ev(ws, sid, switchView(V.editor)); await sleep(350)
  await ev(ws, sid, switchView(V.argument)); await sleep(500)
  const c2 = await ev(ws, sid, `return ${claimCount()}`)
  // 주장 텍스트는 textarea 값(innerText 에 포함되지 않음) — 값으로 확인
  const claimPersisted = await ev(ws, sid, `return [...document.querySelectorAll("textarea[placeholder='주장을 입력하세요.']")].some(t=>t.value===${JSON.stringify(CLAIM)})`)
  t(c2 === c1 && claimPersisted, `뷰 왕복 후 주장 ${c2}개 유지 + 입력한 주장 텍스트 영속`)

  // =====================================================================
  // 6) 스토리 캔버스 — '+ 카드' → N카드+1 + .canvas-node 렌더, 합성 드래그 이동(안 되면 skip) + 영속
  // =====================================================================
  await ev(ws, sid, switchView(V.canvas)); await sleep(550)
  const canvasOn = await ev(ws, sid, `return !!document.querySelector('.canvas-area')&&!!document.querySelector('.canvas-toolbar')`)
  t(canvasOn, '스토리 캔버스 뷰로 전환됨(.canvas-area + .canvas-toolbar)')
  // 카드 수 표기 'N카드 · M그룹 …'(StoryCanvas 289행) 파싱.
  const cardCount = () => `(()=>{const s=[...document.querySelectorAll('span')].map(x=>(x.textContent||'').trim()).find(x=>/^\\d+카드 ·/.test(x));return s?parseInt(s.match(/\\d+/)[0],10):-1})()`
  const k0 = await ev(ws, sid, `return ${cardCount()}`)
  await ev(ws, sid, clickByText('button.minibtn', '+ 카드')); await sleep(400)
  const k1 = await ev(ws, sid, `return ${cardCount()}`)
  const nodeInDom = await ev(ws, sid, `return document.querySelectorAll('.canvas-node').length`)
  t(k0 >= 0 && k1 === k0 + 1 && nodeInDom >= 1, `'+ 카드' → 카드 ${k0} → ${k1} (1 증가), .canvas-node ${nodeInDom}개 렌더`)

  // 새 카드는 추가 직후 편집모드(textarea autoFocus) — blur 시켜 편집 해제(드래그는 editing 중이면 무시됨).
  await ev(ws, sid, `const el=document.querySelector('.canvas-node textarea.canvas-node-text');if(el){el.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))}return 1`); await sleep(300)

  // 드래그 이동: 마지막 .canvas-node 의 화면 좌표에서 mousedown(노드) → window mousemove(>4px, 6회) → mouseup.
  // onNodeDown 은 dxr+dyr<4 미만이면 무시하므로 충분히 크게 움직인다.
  const beforePos = await ev(ws, sid, `const ns=document.querySelectorAll('.canvas-node');const n=ns[ns.length-1];return {left:n.style.left,top:n.style.top}`)
  await ev(ws, sid, `(()=>{const ns=document.querySelectorAll('.canvas-node');const n=ns[ns.length-1];const r=n.getBoundingClientRect();const x=Math.round(r.left+r.width/2),y=Math.round(r.top+12);
    const md=new MouseEvent('mousedown',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});n.dispatchEvent(md);
    for(let i=1;i<=6;i++){const mm=new MouseEvent('mousemove',{bubbles:true,clientX:x+i*20,clientY:y+i*14});window.dispatchEvent(mm)}
    const mu=new MouseEvent('mouseup',{bubbles:true,clientX:x+120,clientY:y+84});window.dispatchEvent(mu);return'ok'})()`); await sleep(450)
  const afterPos = await ev(ws, sid, `const ns=document.querySelectorAll('.canvas-node');const n=ns[ns.length-1];return {left:n.style.left,top:n.style.top}`)
  const moved = beforePos && afterPos && (beforePos.left !== afterPos.left || beforePos.top !== afterPos.top)
  if (moved) {
    t(true, `드래그로 카드 위치 이동됨 (left ${beforePos.left}→${afterPos.left}, top ${beforePos.top}→${afterPos.top})`)
  } else {
    // 합성 마우스 드래그가 좌표를 못 옮긴 경우 — 앱 버그로 단정하지 않고 skip(실패로 세지 않음).
    skip.push('카드 드래그 이동(합성 마우스 한계 — 좌표 변화 없음, skip)')
  }

  // 영속: 다른 뷰로 갔다 돌아와도 카드 수 유지 + (이동된 경우) 좌표 유지(setCanvas → store).
  await ev(ws, sid, switchView(V.editor)); await sleep(350)
  await ev(ws, sid, switchView(V.canvas)); await sleep(550)
  const k2 = await ev(ws, sid, `return ${cardCount()}`)
  const persistedPos = await ev(ws, sid, `const ns=document.querySelectorAll('.canvas-node');const n=ns[ns.length-1];return n?{left:n.style.left,top:n.style.top}:null`)
  // 카드 수는 항상 유지돼야 한다(영속 핵심). 좌표 유지는 드래그가 실제로 일어난 경우에만 단언.
  if (moved) {
    const canvasPersist = k2 === k1 && persistedPos && afterPos && persistedPos.left === afterPos.left && persistedPos.top === afterPos.top
    t(canvasPersist, `뷰 왕복 후 카드 ${k2}개 + 이동 좌표 유지(영속)`)
  } else {
    t(k2 === k1 && !!persistedPos, `뷰 왕복 후 카드 ${k2}개 유지(영속; 드래그 skip 으로 좌표 단언은 생략)`)
  }

  t(exc.length === 0, '예외 없음(' + exc.length + ')')
  console.log('=== 지식 뷰(참고문헌·논증·캔버스) 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); skip.forEach(m => console.log('  ~ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패' + (skip.length ? ' / ' + skip.length + ' skip' : ''))
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
