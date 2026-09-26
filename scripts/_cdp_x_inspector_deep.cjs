// 인스펙터 전 탭 '심화' 베타 — 박사급 QA/UX 관점.
// '코드리뷰'가 아니라 실제 글쓰기 사용자처럼 인스펙터를 조작하며, 크래시뿐 아니라
// '상식적으로 당연한데 안 되는 것'을 찾는다. 각 기대 동작을 단언으로 인코딩하고,
// 위반 시 console.log("[ISSUE] ...") 를 출력(실패로 카운트)한다.
//
// 담당: 시놉시스/노트/메타/라벨·상태/키워드/스냅샷/타깃 등
//   (1) input → 다른 '뷰'(코르크보드) 왕복 반영,
//   (2) 풀 페이지 '리로드' 후에도 유지(IndexedDB 영속),
//   (3) 스냅샷 찍기/비교/되돌리기/삭제,
//   (4) 빈 상태 안내,
//   (5) 미디어/비텍스트(폴더·캐릭터) 문서일 때 적절히 비활성/숨김.
//
// 검증된 CDP 하니스 패턴(_cdp_op_inspector_all.cjs, _cdp_stash_drag.cjs)을 그대로 따른다:
//   Target.createTarget 로 4178 직접 생성(about:blank+navigate 금지), attachToTarget flatten,
//   ev()=Runtime.evaluate returnByValue(Runtime.enable 호출 안 함),
//   훅 window.__scriv/__setView/__setModal/__openTool, 메뉴/탭은 실제 element.click().
//   ※ 작성 전용(여기서 실행하지 않음). node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

// 본문 RTF 표본(공통 머리말 + 변경 단어 → 비교 diff 에 add/del 가 확실히 생기게).
const RTF_ALPHA = '{\\rtf1\\ansi 공통머리말 스냅원본ALPHA}'
const RTF_BETA = '{\\rtf1\\ansi 공통머리말 스냅수정BETA}'
const SYN = '왕복시놉ROUND'
const NOTE = '노트영속NOTE'
const KW = '영속키워드KW'
const SNAP = '영속스냅SNAP'

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const E = (x) => ev(ws, sid, x)
  const ok = [], bad = []
  // 단언: 위반 시 [ISSUE] 출력 + 실패 카운트.
  const T = (c, m) => { if (c) { ok.push(m) } else { bad.push(m); console.log('[ISSUE] ' + m) } }

  // ── 로드 대기(훅 준비 폴링) ──
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'&&typeof window.__scriv==='object'&&typeof window.__setModal==='function'")) return true } catch { /* loading */ } } return false }
  const hookReady = await waitHook()
  T(hookReady, '앱 로드 + 테스트 훅(__scriv/__setView/__setModal) 준비')
  if (!hookReady) { finish(ws, ok, bad); return }
  try { await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false }, sid) } catch { /* noop */ }

  // 환영/투어 닫기 + confirm/prompt 무인 응답 + 인스펙터 헬퍼 주입.
  const closeWelcome = async () => { await E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350) }
  const injectQa = async () => {
    await E([
      "window.__qa={",
      " setInput:function(sel,val){var e=(typeof sel==='string')?document.querySelector(sel):sel; if(!e)return false;",
      "  var proto=e.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:(e.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype);",
      "  var s=Object.getOwnPropertyDescriptor(proto,'value').set; s.call(e,val);",
      "  e.dispatchEvent(new Event('input',{bubbles:true})); if(e.tagName==='SELECT')e.dispatchEvent(new Event('change',{bubbles:true})); return true; },",
      " tab:function(k){var b=document.getElementById('insp-tab-'+k); if(b){b.click(); return true;} return false; },",
      " bodyText:function(){return (document.querySelector('.insp-body')||{}).textContent||'';},",
      " ensureInsp:function(){ if(!document.getElementById('insp-tab-meta')){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test((x.getAttribute('title')||'')+'|'+(x.getAttribute('aria-label')||''))}); if(b)b.click(); } return !!document.getElementById('insp-tab-meta'); }",
      "};",
      "window.confirm=function(){return true};",
      "window.prompt=function(m){ return (m&&String(m).indexOf('URL')>=0)?'https://qa.example.com':'QA북마크'; };",
      "return 1"
    ].join('\n'))
  }
  const TAB = async (k) => { await E("window.__qa.tab('" + k + "'); return 1"); await sleep(260) }

  await closeWelcome()
  await injectQa()
  T(await E("return window.__qa.ensureInsp()"), '인스펙터 패널 표시(숨김이면 토글로 열림)')

  // 텍스트 문서 활성화(아니면 바인더에서 텍스트 문서 클릭).
  const act = JSON.parse(await E("var s=window.__scriv.state(); var e=window.__scriv.entries(); var cur=e.find(function(i){return i.id===s.activeId}); return JSON.stringify({type:cur?cur.type:null, hasText:e.some(function(i){return i.type==='text'})})"))
  if (act.type !== 'text' && act.hasText) {
    await E("var e=window.__scriv.entries(); var tt=e.find(function(i){return i.type==='text'}); if(tt){ var r=null; document.querySelectorAll('.binder-row').forEach(function(x){ if((x.getAttribute('aria-label')||'')===tt.title) r=x; }); if(r)r.click(); } return 1"); await sleep(350)
  }
  const docTitle = await E("var s=window.__scriv.state(); var e=window.__scriv.entries(); var cur=e.find(function(i){return i.id===s.activeId}); return cur?cur.title:''")
  const bid = await E("return window.__scriv.state().activeId||''")
  T(!!bid, '텍스트 문서 활성화(activeId 확보)')

  // ── 구조/접근성: 탭리스트·탭 9종·aria-selected ──
  T(await E("return !!document.querySelector('.inspector')"), '인스펙터 컨테이너(.inspector) 렌더')
  T(await E("return !!document.querySelector('[role=\"tablist\"][aria-label=\"인스펙터 탭\"]')"), '인스펙터 탭리스트(role=tablist, aria-label) 존재')
  T(await E("return document.querySelectorAll('.insp-tabs [role=\"tab\"]').length>=9"), '인스펙터 탭 9종(즐겨찾기/노트/메타/키워드/주석/북마크/스냅샷/SEO/연계) 렌더')
  await E("var b=document.getElementById('insp-tab-meta'); if(b)b.click(); return 1"); await sleep(180)
  T(await E("return document.getElementById('insp-tab-meta').getAttribute('aria-selected')==='true'"), '탭 클릭 시 해당 탭 aria-selected=true')

  // ─────────────────────────────────────────────────────────────
  // PHASE 1 — 입력(시놉시스/노트/라벨/상태/목표/키워드/스냅샷)
  // ─────────────────────────────────────────────────────────────
  // 노트 탭
  await TAB('notes')
  await E("window.__qa.setInput('.insp-body .syn-text', '" + SYN + "'); return 1"); await sleep(140)
  await E("window.__qa.setInput('.insp-body textarea.field', '" + NOTE + "'); return 1"); await sleep(140)

  // 메타 탭 — 라벨/상태/문서목표
  await TAB('meta')
  const metaOpt = JSON.parse(await E("var sels=document.querySelectorAll('.insp-body select.field'); if(sels.length<2)return JSON.stringify({n:sels.length}); var lab=sels[0],st=sels[1]; var li=Math.min(2,lab.options.length-1), si=Math.min(2,st.options.length-1); return JSON.stringify({n:sels.length, labVal:lab.options[li].value, stVal:st.options[si].value, stText:st.options[si].text})"))
  if (metaOpt.n >= 2) {
    await E("var sels=document.querySelectorAll('.insp-body select.field'); window.__qa.setInput(sels[0],'" + metaOpt.labVal + "'); window.__qa.setInput(sels[1],'" + metaOpt.stVal + "'); return 1"); await sleep(160)
    await E("window.__qa.setInput(document.querySelector('.insp-body input.field[type=\"number\"]'),'1234'); return 1"); await sleep(150)
  }

  // 키워드 탭 — 새 키워드 추가 + 그 칩 태깅
  await TAB('keywords')
  await E("window.__qa.setInput('.insp-body input.field[placeholder=\"새 키워드\"]','" + KW + "'); return 1"); await sleep(180)
  await E("var i=document.querySelector('.insp-body input.field[placeholder=\"새 키워드\"]'); if(i)i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return 1"); await sleep(260)
  await E("var c=null; document.querySelectorAll('.insp-body .kw-chip').forEach(function(x){ if(new RegExp('" + KW + "').test(x.textContent||''))c=x; }); if(c)c.click(); return !!c"); await sleep(200)

  // 스냅샷 탭 — 본문 ALPHA 로 세팅 후 '지금 찍기'
  await TAB('snapshots')
  await E("document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(120); await E("window.__scriv.setBody(" + JSON.stringify(RTF_ALPHA) + "); return 1"); await sleep(300)
  await E("window.__qa.setInput('.insp-body .snap-take input.field','" + SNAP + "'); return 1"); await sleep(180)
  await E("var bs=document.querySelectorAll('.insp-body .snap-take button.btn-primary'); var b=null; bs.forEach(function(x){if((x.textContent||'').indexOf('지금')>=0)b=x;}); if(b)b.click(); return 1"); await sleep(380)
  // 저장 피드백 토스트('저장했습니다.')가 떠야 한다.
  const snapToast = await E("var s=document.querySelector('[role=\"status\"]'); return s?(s.textContent||''):''")
  T(/스냅샷/.test(snapToast), '스냅샷 "지금 찍기" → 저장 안내 토스트(role=status) 노출')
  T(await E("var f=false; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){if(new RegExp('" + SNAP + "').test(s.textContent||''))f=true;}); return f"), '스냅샷 "지금 찍기" → 목록에 항목 생성')

  // ─────────────────────────────────────────────────────────────
  // PHASE 2 — input → 다른 '뷰'(코르크보드) 왕복 반영
  // ─────────────────────────────────────────────────────────────
  await E("window.__setView('corkboard'); return 1"); await sleep(450)
  const rt = JSON.parse(await E("var card=null; document.querySelectorAll('.corkboard .card').forEach(function(c){ var t=c.querySelector('.card-title'); if(t && (t.textContent||'').trim()===" + JSON.stringify(docTitle) + ") card=c; }); if(!card) return JSON.stringify({found:false}); var syn=card.querySelector('.card-syn'); var st=card.querySelector('.card-status'); return JSON.stringify({found:true, syn:syn?(syn.textContent||''):'', status:st?(st.textContent||''):''})"))
  T(rt.found && new RegExp(SYN).test(rt.syn), '시놉시스 입력 → 코르크보드 카드 줄거리에 반영(input→뷰 왕복)')
  T(rt.found && metaOpt.stText && rt.status.indexOf(metaOpt.stText) >= 0, '상태 변경 → 코르크보드 카드 상태 배지에 반영(input→뷰 왕복)')
  await E("window.__setView('editor'); return 1"); await sleep(300)

  // ─────────────────────────────────────────────────────────────
  // PHASE 3 — 자동저장 완료 대기 후 풀 페이지 리로드
  // ─────────────────────────────────────────────────────────────
  let saved = false
  for (let i = 0; i < 24; i++) { await sleep(500); if (!(await E("return window.__scriv.state().dirty"))) { saved = true; break } }
  T(saved, '편집 후 자동저장 완료(dirty=false) — 리로드 전 영속 보장')
  const pid = await E("return window.__scriv.state().id")

  await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid)
  T(await waitHook(), '리로드 후 앱 재로드 + 훅 재준비')
  await closeWelcome()
  await injectQa()
  await E("return window.__qa.ensureInsp()")
  const pid2 = await E("return window.__scriv.state().id")
  T(pid2 === pid, '리로드 후 같은 프로젝트 복원(IndexedDB)')

  // ── 리로드 후 유지 검증(노트/메타/키워드/스냅샷) ──
  await TAB('notes')
  const nAfter = JSON.parse(await E("var syn=document.querySelector('.insp-body .syn-text'); var nt=document.querySelector('.insp-body textarea.field'); return JSON.stringify({syn:syn?syn.value:'', note:nt?nt.value:''})"))
  T(nAfter.syn === SYN, '시놉시스 — 리로드 후에도 유지')
  T(nAfter.note === NOTE, '문서 노트 — 리로드 후에도 유지')

  await TAB('meta')
  const mAfter = JSON.parse(await E("var sels=document.querySelectorAll('.insp-body select.field'); var num=document.querySelector('.insp-body input.field[type=\"number\"]'); return JSON.stringify({lab:sels[0]?sels[0].value:'', target:num?num.value:''})"))
  T(metaOpt.n >= 2 && mAfter.lab === metaOpt.labVal, '라벨 — 리로드 후에도 유지')
  T(mAfter.target === '1234', '문서 목표(1234) — 리로드 후에도 유지')

  await TAB('keywords')
  const kwAfter = JSON.parse(await E("var c=null; document.querySelectorAll('.insp-body .kw-chip').forEach(function(x){ if(new RegExp('" + KW + "').test(x.textContent||''))c=x; }); return JSON.stringify({exists:!!c, on:c?c.classList.contains('on'):false})"))
  T(kwAfter.exists, '추가한 키워드 — 리로드 후에도 유지')
  T(kwAfter.on, '키워드 태깅(.on, 문서에 적용됨) — 리로드 후에도 유지')

  await TAB('snapshots')
  T(await E("var f=false; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){if(new RegExp('" + SNAP + "').test(s.textContent||''))f=true;}); return f"), '스냅샷 — 리로드 후에도 유지')

  // ─────────────────────────────────────────────────────────────
  // PHASE 4 — 스냅샷 비교(diff) → 되돌리기 버튼 → 목록 복귀
  // ─────────────────────────────────────────────────────────────
  await E("document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(120); await E("window.__scriv.setBody(" + JSON.stringify(RTF_BETA) + "); return 1"); await sleep(300)
  await E("var btn=null; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){ if(new RegExp('" + SNAP + "').test(s.textContent||'')){ s.querySelectorAll('.snap-actions button').forEach(function(b){ if((b.textContent||'').indexOf('비교')>=0)btn=b; }); } }); if(btn)btn.click(); return !!btn"); await sleep(420)
  const cmp = JSON.parse(await E("var head=document.querySelector('.insp-body .snap-compare-head'); var diff=document.querySelector('.insp-body .snap-diff'); var add=document.querySelector('.insp-body .snap-diff .d-add'); var del=document.querySelector('.insp-body .snap-diff .d-del'); var rb=[].slice.call(document.querySelectorAll('.insp-body button')).some(function(b){return /이 스냅샷 버전으로 되돌리기/.test(b.textContent||'')}); return JSON.stringify({head:!!head, diff:!!diff, add:!!add, del:!!del, rb:rb})"))
  T(cmp.head && cmp.diff, '스냅샷 "비교" → 비교 뷰(헤더·diff) 진입')
  T(cmp.add && cmp.del, '비교 diff 에 추가(.d-add)·삭제(.d-del) 변경이 모두 표시')
  T(cmp.rb, '비교 뷰에 "이 스냅샷 버전으로 되돌리기" 버튼 존재')
  await E("var b=[].slice.call(document.querySelectorAll('.insp-body button')).find(function(x){return /스냅샷 목록/.test(x.textContent||'')}); if(b)b.click(); return 1"); await sleep(300)
  T(await E("return !!document.querySelector('.insp-body .snap-take')"), '비교 뷰 "← 스냅샷 목록"으로 목록 복귀')

  // ─────────────────────────────────────────────────────────────
  // PHASE 5 — 스냅샷 삭제(되돌릴 수 없음 안내 + confirm)
  // ─────────────────────────────────────────────────────────────
  const snapBefore = await E("return document.querySelectorAll('.insp-body .snap-item').length")
  await E("var tgt=null; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){ if(new RegExp('" + SNAP + "').test(s.textContent||'')){ s.querySelectorAll('.snap-actions button').forEach(function(b){ if((b.textContent||'').indexOf('삭제')>=0)tgt=b; }); } }); if(tgt)tgt.click(); return !!tgt"); await sleep(380)
  const snapAfterDel = await E("return document.querySelectorAll('.insp-body .snap-item').length")
  T(snapAfterDel < snapBefore, '스냅샷 삭제 → 목록에서 제거(' + snapBefore + '→' + snapAfterDel + ')')

  // ─────────────────────────────────────────────────────────────
  // PHASE 6 — 빈 상태 안내(북마크/주석/참조/즐겨찾기)
  // ─────────────────────────────────────────────────────────────
  await TAB('bookmarks')
  T(/북마크가 없습니다/.test(await E("return window.__qa.bodyText()")), '북마크 빈 상태 안내 표시')
  await TAB('comments')
  T(/코멘트가 없습니다/.test(await E("return window.__qa.bodyText()")), '주석(코멘트) 빈 상태 안내 표시')
  await TAB('meta')
  T(/내부 링크가 없습니다/.test(await E("return window.__qa.bodyText()")), '참조(내부 링크) 빈 상태 안내 표시')
  await TAB('favorites')
  T(await E("return !!document.querySelector('.insp-body .fav-drop-zone') && /자주 쓰는/.test(window.__qa.bodyText())"), '즐겨찾기 탭 안내/드롭존 표시(활성 문서와 무관하게 동작)')

  // ─────────────────────────────────────────────────────────────
  // PHASE 7 — 폴더(본문 없는 문서) 선택 시 적절히 비활성/숨김
  // ─────────────────────────────────────────────────────────────
  await E("var b=document.querySelector('button.minibtn[title=\"새 폴더\"]'); if(b)b.click(); return !!b"); await sleep(400)
  await E("var r=document.querySelector('.binder-rename'); if(r)r.blur(); return 1"); await sleep(220)
  const folderType = await E("var s=window.__scriv.state(); var e=window.__scriv.entries(); var cur=e.find(function(i){return i.id===s.activeId}); return cur?cur.type:null")
  T(folderType === 'folder', '새 폴더 생성 → 활성화(비텍스트 문서)')
  await TAB('meta')
  const fmeta = JSON.parse(await E("var body=window.__qa.bodyText(); var num=document.querySelector('.insp-body input.field[type=\"number\"]'); var tension=document.querySelector('.insp-body input[type=\"range\"][aria-label=\"긴장도\"]'); return JSON.stringify({sums:/하위 문서 합계/.test(body), hasTarget:!!num, hasTension:!!tension})"))
  T(fmeta.sums, '폴더 선택 → 메타에 "하위 문서 합계" 표시(폴더에 맞게)')
  T(!fmeta.hasTarget, '폴더 선택 → "문서 목표" 단어 입력 미표시(폴더엔 부적절 → 적절히 비활성)')
  T(!fmeta.hasTension, '폴더 선택 → 긴장도 슬라이더 미표시(텍스트 전용 → 적절히 비활성)')
  await TAB('snapshots')
  T(await E("return !!document.querySelector('.insp-body .snap-empty')"), '폴더(본문 없음) 스냅샷 탭 빈 상태 표시')
  await TAB('seo')
  T(!(await E("return /구글 검색 미리보기/.test(window.__qa.bodyText())")), '폴더 선택 시 SEO(웹페이지 메타) 편집 폼은 부적절 — 안내/비활성이어야 함')

  // ─────────────────────────────────────────────────────────────
  // PHASE 8 — 캐릭터(구조화) 문서 선택 시 적절히 숨김
  // ─────────────────────────────────────────────────────────────
  await E("window.__setModal('docTemplate'); return 1"); await sleep(400)
  const tplOpened = await E("return !!document.querySelector('.tpl-card')")
  if (tplOpened) {
    await E("var c=[].slice.call(document.querySelectorAll('.tpl-card')).find(function(x){return /캐릭터 카드/.test(x.textContent||'')}); if(c)c.click(); return !!c"); await sleep(500)
  } else { await E("window.__setModal(null); return 1") }
  const charType = await E("var s=window.__scriv.state(); var e=window.__scriv.entries(); var cur=e.find(function(i){return i.id===s.activeId}); return cur?cur.type:null")
  T(charType === 'character', '캐릭터 카드 템플릿 생성 → character 문서 활성화')
  if (charType === 'character') {
    await TAB('meta')
    const cmeta = JSON.parse(await E("var icon=document.querySelector('.insp-body .icon-pick'); var tension=document.querySelector('.insp-body input[type=\"range\"][aria-label=\"긴장도\"]'); return JSON.stringify({hasIcon:!!icon, hasTension:!!tension})"))
    T(!cmeta.hasIcon, '캐릭터 문서 → 아이콘 선택기 미표시(캐릭터 전용 처리)')
    T(!cmeta.hasTension, '캐릭터 문서 → 긴장도 슬라이더 미표시(텍스트 전용 → 적절히 비활성)')
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 9 — 탭 키보드 내비게이션 + 패널 접근성
  // ─────────────────────────────────────────────────────────────
  await E("var b=document.getElementById('insp-tab-notes'); if(b){b.click(); b.focus();} return 1"); await sleep(200)
  await E("var b=document.getElementById('insp-tab-notes'); if(b)b.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); return 1"); await sleep(240)
  const nav = JSON.parse(await E("var meta=document.getElementById('insp-tab-meta'); var panel=document.getElementById('insp-panel'); return JSON.stringify({metaSel:meta?meta.getAttribute('aria-selected'):'', labelled:panel?panel.getAttribute('aria-labelledby'):''})"))
  T(nav.metaSel === 'true', '탭 키보드 내비 ArrowRight → 다음 탭(메타) 선택')
  T(nav.labelled === 'insp-tab-meta', '탭 패널 aria-labelledby 가 선택 탭과 일치(접근성)')
  await E("var b=document.getElementById('insp-tab-meta'); if(b)b.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true})); return 1"); await sleep(240)
  T(await E("var f=document.getElementById('insp-tab-favorites'); return f?f.getAttribute('aria-selected')==='true':false"), '탭 키보드 내비 Home → 첫 탭(즐겨찾기) 선택')

  finish(ws, ok, bad)
}

function finish(ws, ok, bad) {
  console.log('=== 인스펙터 전 탭 심화(입력→뷰 왕복·리로드 유지·스냅샷 비교/삭제·빈 상태·비텍스트 비활성) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  try { ws.close() } catch { /* noop */ }
  process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
