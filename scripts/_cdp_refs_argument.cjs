// 참고문헌 / 논증 작업대 실동작 검증(양 스킨) — 사용자처럼 클릭·입력해 결과(DOM/스토어/뷰 왕복 영속)를 단언.
//  References: 출처 추가·제목/저자/연도 편집·인용양식 select·서지 미리보기·본문 인용 삽입(scriv:insertCitation)·출처 삭제.
//  Argument : 주제문·주장·근거/전제/반박 추가·편집·자식/주장 삭제·뷰 왕복 영속.
// 클릭/입력 전용(드래그 없음)이라 Runtime.enable 로 콘솔에러도 캡처한다.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

async function runSkin(ws, sid, skin, t, errs) {
  const E = (x) => ev(ws, sid, x)
  const setView = async (v) => { await E(`window.__setView('${v}');return 1`); await sleep(380) }
  // 제어 input/textarea/select 값 주입(네이티브 setter + 이벤트). uncontrolled 는 blur 로 커밋.
  const setVal = (sel, val, proto, blur) => E(
    `var el=document.querySelector("${sel}");if(!el)return false;` +
    `var d=Object.getOwnPropertyDescriptor(window.${proto}.prototype,'value').set;d.call(el,'${val}');` +
    `el.dispatchEvent(new Event('input',{bubbles:true}));` +
    (blur ? `el.dispatchEvent(new Event('focusout',{bubbles:true}));` : ``) + `return true`)
  const readVal = (sel) => E(`var el=document.querySelector("${sel}");return el?el.value:null`)
  // 버튼을 보이는 텍스트로 클릭(아이콘 svg 는 textContent 미포함).
  const clickBtn = (txt, exact) => E(
    `var b=[].slice.call(document.querySelectorAll('button')).find(function(x){var s=(x.textContent||'').trim();` +
    `return ${exact ? `s==='${txt}'` : `s.indexOf('${txt}')>=0`}});if(b){b.click();return true}return false`)
  // 인용 스타일 select(옵션 'mla' 보유)만 골라 값 변경.
  const setStyle = (val) => E(
    `var s=[].slice.call(document.querySelectorAll('select')).find(function(x){return [].slice.call(x.options).some(function(o){return o.value==='mla'})});` +
    `if(!s)return false;var d=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;d.call(s,'${val}');s.dispatchEvent(new Event('change',{bubbles:true}));return true`)
  // 서지 미리보기 줄(p.textIndent==='-1.4em')
  const bibLines = () => E(`return [].slice.call(document.querySelectorAll('p')).filter(function(p){return p.style.textIndent==='-1.4em'}).length`)
  const bibText = () => E(`return [].slice.call(document.querySelectorAll('p')).filter(function(p){return p.style.textIndent==='-1.4em'}).map(function(p){return p.textContent}).join('|')`)
  const refCount = () => E(`var sp=[].slice.call(document.querySelectorAll('span')).find(function(x){return /^출처 \\d+개$/.test((x.textContent||'').trim())});return sp?parseInt(sp.textContent.replace(/[^0-9]/g,'')):-1`)
  const claimCount = () => E(`var sp=[].slice.call(document.querySelectorAll('span')).find(function(x){return /^주장 \\(Claims\\) ·/.test((x.textContent||'').trim())});return sp?parseInt((sp.textContent.match(/\\d+/)||['-1'])[0]):-1`)
  const sectionCount = (label) => E(`var sp=[].slice.call(document.querySelectorAll('span')).find(function(x){return new RegExp('^${label} ·').test((x.textContent||'').trim())});return sp?parseInt((sp.textContent.match(/\\d+/)||['-1'])[0]):-1`)

  // ============ 참고문헌(ReferencesView) ============
  await setView('references')
  const refHeader = await E(`return [].slice.call(document.querySelectorAll('strong')).some(function(x){return (x.textContent||'').trim()==='참고문헌'})`)
  t(refHeader && (await refCount()) >= 0, `[${skin}] 참고문헌 뷰 로드(헤더·출처 카운터)`)

  const c0 = await refCount()
  await clickBtn('출처 추가'); await sleep(350)
  const c1 = await refCount()
  const formShown = await E(`return !!document.querySelector("input[placeholder='문헌 제목']")`)
  t(c1 === c0 + 1 && formShown, `[${skin}] + 출처 추가 → 카운트 ${c0}→${c1}, 편집폼 노출`)

  await setVal("input[placeholder='문헌 제목']", '테스트 논문', 'HTMLInputElement', false); await sleep(250)
  const titleInList = await E(`return [].slice.call(document.querySelectorAll('span')).some(function(x){return (x.textContent||'').trim()==='테스트 논문'})`)
  t(titleInList, `[${skin}] 제목 편집 → 좌측 목록 즉시 반영`)

  // 저자(줄바꿈 textarea, onBlur 커밋) — 커밋 후 서지에 저자 등장
  await setVal("textarea[placeholder^='홍길동']", '홍길동', 'HTMLTextAreaElement', true); await sleep(300)
  const authorInBib = (await bibText()).indexOf('홍길동') >= 0
  t(authorInBib, `[${skin}] 저자 편집(blur 커밋) → 서지에 저자 반영`)

  await setVal("input[placeholder='2024']", '2024', 'HTMLInputElement', false); await sleep(300)
  const yearInBib = (await bibText()).indexOf('2024') >= 0
  t(yearInBib, `[${skin}] 발행연도 편집 → 서지에 연도 반영`)

  const apaBib = await bibText()
  t((await bibLines()) >= 1 && apaBib.trim().length > 0, `[${skin}] 서지 미리보기 생성(APA, ${await bibLines()}줄)`)

  await setStyle('mla'); await sleep(350)
  const mlaBib = await bibText()
  t(mlaBib.trim().length > 0 && mlaBib !== apaBib, `[${skin}] 인용양식 select 변경(APA→MLA) → 서지 재포맷`)
  await setStyle('apa'); await sleep(250)

  // 본문 인용: 참고문헌 뷰엔 라이브 에디터가 없어 클립보드 폴백 메시지가 떠야 함
  await clickBtn('본문에 인용', true); await sleep(600)
  const flashMsg = await E(`return [].slice.call(document.querySelectorAll('span')).some(function(x){return /복사했|클립보드|실패|삽입했/.test(x.textContent||'')})`)
  t(flashMsg, `[${skin}] '본문에 인용' 클릭 → 상태 메시지 표시(폴백 안내)`)

  // scriv:insertCitation — 에디터 뷰에서 실제 본문 커서에 인용 삽입
  await setView('editor')
  const paperReady = await E(`var p=document.querySelector('.paper');if(!p)return false;p.focus();var r=document.createRange();r.selectNodeContents(p);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);return true`)
  await sleep(180) // selectionchange → FormatBar 가 캐럿 저장
  await E(`window.dispatchEvent(new CustomEvent('scriv:insertCitation',{detail:{html:'<em>(홍길동, 2024)</em>',text:'(홍길동, 2024)'}}));return 1`); await sleep(300)
  const citeInserted = await E(`var p=document.querySelector('.paper');return !!p&&!!p.querySelector('.cite-inline')&&(p.textContent||'').indexOf('(홍길동, 2024)')>=0`)
  t(paperReady && citeInserted, `[${skin}] scriv:insertCitation → 본문 커서 위치에 인용 삽입`)

  const dirtyAfter = await E(`return !!(window.__scriv&&window.__scriv.state().dirty)`)
  // 뷰 왕복 후에도 본문에 인용이 남아 영속되는지(코르크보드 경유)
  await setView('corkboard'); await setView('editor')
  const citePersist = await E(`var p=document.querySelector('.paper');return !!p&&(p.textContent||'').indexOf('(홍길동, 2024)')>=0`)
  t(dirtyAfter && citePersist, `[${skin}] 삽입한 인용이 뷰 왕복(editor↔corkboard) 후에도 본문에 잔존`)

  // 참고문헌 영속 + 삭제
  await setView('references')
  const cPersist = await refCount()
  t(cPersist === 1, `[${skin}] 출처가 뷰 왕복 후에도 잔존(카운트=${cPersist})`)

  await E(`var sp=[].slice.call(document.querySelectorAll('span')).find(function(x){return (x.textContent||'').trim()==='테스트 논문'});if(sp){sp.click();return true}return false`); await sleep(250)
  await clickBtn('삭제', true); await sleep(300)
  const cDel = await refCount()
  t(cDel === 0, `[${skin}] 출처 삭제 → 카운트 ${cPersist}→${cDel}`)

  // ============ 논증 작업대(ArgumentView) ============
  await setView('argument')
  const argHeader = await E(`return [].slice.call(document.querySelectorAll('span')).some(function(x){return (x.textContent||'').trim()==='논증 작업대'})`)
  t(argHeader, `[${skin}] 논증 작업대 뷰 로드(헤더)`)

  // 주제문 입력(uncontrolled, onBlur 커밋) → 뷰 왕복 후 잔존
  await setVal("textarea[placeholder^='이 글이 입증']", '인공지능은 글쓰기를 돕는다', 'HTMLTextAreaElement', true); await sleep(250)
  await setView('editor'); await setView('argument')
  const thesisPersist = await readVal("textarea[placeholder^='이 글이 입증']")
  t(thesisPersist === '인공지능은 글쓰기를 돕는다', `[${skin}] 주제문 편집 → 뷰 왕복 후 잔존`)

  const k0 = await claimCount()
  await clickBtn('주장 추가'); await sleep(300)
  const k1 = await claimCount()
  const claimBox = await E(`return !!document.querySelector("textarea[placeholder='주장을 입력하세요.']")`)
  t(k1 === k0 + 1 && claimBox, `[${skin}] 주장 추가 → 카운트 ${k0}→${k1}, 카드 노출`)

  await setVal("textarea[placeholder='주장을 입력하세요.']", '근거가 이를 뒷받침한다', 'HTMLTextAreaElement', true); await sleep(200)
  await setView('editor'); await setView('argument')
  const claimPersist = await readVal("textarea[placeholder='주장을 입력하세요.']")
  t(claimPersist === '근거가 이를 뒷받침한다', `[${skin}] 주장 텍스트 편집 → 뷰 왕복 후 잔존`)

  // 근거/전제/반박 추가(각 섹션 add 버튼은 텍스트가 정확히 라벨)
  await clickBtn('근거', true); await sleep(250)
  t((await sectionCount('근거')) === 1, `[${skin}] 근거 추가 → 근거 · 1`)
  await clickBtn('전제', true); await sleep(250)
  t((await sectionCount('전제')) === 1, `[${skin}] 전제 추가 → 전제 · 1`)
  await clickBtn('반박', true); await sleep(250)
  t((await sectionCount('반박')) === 1, `[${skin}] 반박 추가 → 반박 · 1`)

  // 자식 노드 텍스트 편집(첫 내용 textarea = 근거) → 뷰 왕복 후 잔존
  await setVal("textarea[placeholder='내용을 입력하세요.']", '실험 결과가 있다', 'HTMLTextAreaElement', true); await sleep(200)
  await setView('editor'); await setView('argument')
  const nodePersist = await readVal("textarea[placeholder='내용을 입력하세요.']")
  t(nodePersist === '실험 결과가 있다', `[${skin}] 근거 노드 편집 → 뷰 왕복 후 잔존`)

  // 뷰 왕복 후 주장+자식 구조 유지
  const struct = (await claimCount()) === 1 && (await sectionCount('근거')) === 1 && (await sectionCount('전제')) === 1 && (await sectionCount('반박')) === 1
  t(struct, `[${skin}] 뷰 왕복 후 주장·근거·전제·반박 구조 유지`)

  // 자식(반박) 삭제 — 마지막 [title='삭제'] 아이콘 버튼
  await E(`var bs=[].slice.call(document.querySelectorAll("button[title='삭제']"));if(!bs.length)return false;bs[bs.length-1].click();return true`); await sleep(300)
  t((await sectionCount('반박')) === 0, `[${skin}] 반박 노드 삭제 → 반박 · 0`)

  // 주장 삭제(window.confirm 우회)
  await E(`window.confirm=function(){return true};return 1`)
  await clickBtn('삭제', true); await sleep(300)
  t((await claimCount()) === 0, `[${skin}] 주장 삭제(확인 우회) → 주장 0`)

  // 조작 전 구간 무에러
  t(errs.length === 0, `[${skin}] 전 구간 콘솔/예외 에러 없음(${errs.length})`)
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const errs = []; ws.addEventListener('message', e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('exc'); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('err') })
  await rpc(ws, 'Runtime.enable', {}, sid)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'&&typeof window.__setModal==='function'")) return true } catch { /* loading */ } } return false }
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1500)
    await ev(ws, sid, `try{localStorage.setItem('sry:uiSkin','${skin}')}catch(e){};return 1`)
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
    t(await waitHook(), `[${skin}] 앱 로드 + 테스트 훅 준비`)
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(450)
    errs.length = 0
    try { await runSkin(ws, sid, skin, t, errs) } catch (e) { bad.push(`[${skin}] FATAL ${e.message}`) }
  }
  console.log('=== 참고문헌 / 논증 작업대 실동작 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
