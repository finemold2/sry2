// 인스펙터 전 탭 '실조작 → 효과 → 영속' 베타(양 스킨: classic + studio).
// 텍스트 문서를 활성화한 상태에서 메타(라벨/상태/문서목표)·노트(시놉시스/노트)·키워드(추가/태깅)·
// 스냅샷(지금찍기 → 본문편집 → 되돌리기 원복)·북마크(추가)·주석 탭 진입을 '진짜로 조작'하고,
// 탭을 왕복한 뒤에도 사용자가 의도한 결과가 스토어/DOM 에 잔존하는지를 단언한다.
// 검증된 CDP 하니스 패턴(_cdp_stash_drag.cjs)을 따른다: Target.createTarget 로 직접 생성,
// attachToTarget flatten, sleep(3800), Runtime.enable 호출 금지, ev()=Runtime.evaluate returnByValue.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

// 스킨을 origin localStorage 에 미리 박아두는 부트스트랩(이후 새 타깃이 첫 로드 때 읽음).
async function setSkin(ws, skin) {
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await sleep(1600)
  await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){}; return localStorage.getItem('sry:uiSkin')")
  await rpc(ws, 'Target.closeTarget', { targetId })
}

async function runSkin(ws, skin, ok, bad) {
  const t = (c, m) => (c ? ok : bad).push('[' + skin + '] ' + m)
  await setSkin(ws, skin)
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await sleep(3800)
  try { await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 920, deviceScaleFactor: 1, mobile: false }, sid) } catch { /* noop */ }
  const E = (x) => ev(ws, sid, x)

  // 환영/투어 닫기 + 자동화 대화상자(confirm/prompt) 무인 응답 주입.
  await E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await E("window.confirm=function(){return true}; window.prompt=function(m,d){ return (m&&String(m).indexOf('URL')>=0)?'https://qa.example.com':'QA북마크'; }; return 1")

  // 스킨이 실제로 적용됐는지(.app-studio 유무).
  const isStudio = await E("var a=document.querySelector('.app'); return a?a.classList.contains('app-studio'):false")
  t(skin === 'studio' ? isStudio : !isStudio, '스킨 적용 확인(app-studio=' + isStudio + ')')

  // 인스펙터가 보이고 탭이 렌더됐는지. 숨겨졌으면 토글을 눌러 연다.
  let hasTabs = await E("return !!document.getElementById('insp-tab-meta')")
  if (!hasTabs) {
    await E("var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test((x.getAttribute('title')||'')+'|'+(x.getAttribute('aria-label')||''))}); if(b)b.click(); return 1"); await sleep(450)
    hasTabs = await E("return !!document.getElementById('insp-tab-meta')")
  }
  t(hasTabs, '인스펙터 탭(메타 등) 표시')

  // 활성 문서가 텍스트가 아니면 바인더에서 텍스트 문서를 클릭해 선택.
  const act = JSON.parse(await E("var s=window.__scriv.state(); var e=window.__scriv.entries(); var cur=e.find(function(i){return i.id===s.activeId}); return JSON.stringify({activeId:s.activeId, type:cur?cur.type:null, hasText:e.some(function(i){return i.type==='text'})})"))
  if (act.type !== 'text' && act.hasText) {
    await E("var e=window.__scriv.entries(); var tt=e.find(function(i){return i.type==='text'}); if(tt){ var r=null; document.querySelectorAll('.binder-row').forEach(function(x){ if((x.getAttribute('aria-label')||'')===tt.title) r=x; }); if(r)r.click(); } return 1"); await sleep(350)
  }
  const bid = await E("var s=window.__scriv.state(); return s?s.activeId:null")
  t(!!bid, '텍스트 문서 활성화(activeId=' + (bid ? 'ok' : 'null') + ')')

  // 페이지 헬퍼: 제어 input/select/textarea 네이티브 value setter + 탭 전환.
  await E([
    "window.__qa={",
    " setInput:function(sel,val){var e=(typeof sel==='string')?document.querySelector(sel):sel; if(!e)return false;",
    "  var proto=e.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:(e.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype);",
    "  var s=Object.getOwnPropertyDescriptor(proto,'value').set; s.call(e,val);",
    "  e.dispatchEvent(new Event('input',{bubbles:true})); if(e.tagName==='SELECT')e.dispatchEvent(new Event('change',{bubbles:true})); return true; },",
    " tab:function(k){var b=document.getElementById('insp-tab-'+k); if(b){b.click(); return true;} return false; }",
    "}; return 1"
  ].join('\n'))
  const TAB = async (k) => { await E("window.__qa.tab('" + k + "'); return 1"); await sleep(260) }

  // ── 메타 탭: 라벨/상태 select + 문서 목표 입력 → 다른 탭 왕복 후 잔존 ──
  await TAB('meta')
  const sel = JSON.parse(await E("var sels=document.querySelectorAll('.insp-body select.field'); if(sels.length<2)return JSON.stringify({n:sels.length}); var lab=sels[0],st=sels[1]; return JSON.stringify({n:sels.length, labOpt:lab.options[Math.min(2,lab.options.length-1)].value, stOpt:st.options[Math.min(2,st.options.length-1)].value})"))
  if (sel.n >= 2) {
    await E("var sels=document.querySelectorAll('.insp-body select.field'); window.__qa.setInput(sels[0],'" + sel.labOpt + "'); window.__qa.setInput(sels[1],'" + sel.stOpt + "'); return 1"); await sleep(180)
    await E('window.__qa.setInput(document.querySelector(\'.insp-body input.field[type="number"]\'),\'777\'); return 1'); await sleep(180)
  }
  await TAB('notes'); await TAB('meta') // 왕복
  const meta = JSON.parse(await E('var sels=document.querySelectorAll(\'.insp-body select.field\'); var num=document.querySelector(\'.insp-body input.field[type="number"]\'); var body=(document.querySelector(\'.insp-body\')||{}).textContent||\'\'; return JSON.stringify({lab:sels[0]?sels[0].value:\'\', st:sels[1]?sels[1].value:\'\', target:num?num.value:\'\', prog:/777/.test(body)})'))
  t(sel.n >= 2 && meta.lab === sel.labOpt, '메타 라벨 변경 → 왕복 후 영속(' + meta.lab + ')')
  t(sel.n >= 2 && meta.st === sel.stOpt, '메타 상태 변경 → 왕복 후 영속(' + meta.st + ')')
  t(meta.target === '777' && meta.prog, '문서 목표 777 입력 → 진행률 표시·영속')

  // ── 노트 탭: 시놉시스 + 문서 노트 입력 → 왕복 후 잔존 ──
  await TAB('notes')
  await E("window.__qa.setInput('.insp-body .syn-text','QA시놉시스내용'); return 1"); await sleep(150)
  await E("window.__qa.setInput('.insp-body textarea.field','QA노트내용'); return 1"); await sleep(150)
  await TAB('meta'); await TAB('notes') // 왕복
  const notes = JSON.parse(await E("var syn=document.querySelector('.insp-body .syn-text'); var nt=document.querySelector('.insp-body textarea.field'); return JSON.stringify({syn:syn?syn.value:'', note:nt?nt.value:''})"))
  t(notes.syn === 'QA시놉시스내용', '시놉시스 입력 → 왕복 후 영속')
  t(notes.note === 'QA노트내용', '문서 노트 입력 → 왕복 후 영속')

  // ── 키워드 탭: 새 키워드 추가 + 칩 태깅 → 왕복 후 .on 잔존 ──
  await TAB('keywords')
  const kwBefore = await E("return document.querySelectorAll('.insp-body .kw-chip').length")
  await E('window.__qa.setInput(\'.insp-body input.field[placeholder="새 키워드"]\',\'QA키워드\'); return 1'); await sleep(230)
  await E('var i=document.querySelector(\'.insp-body input.field[placeholder="새 키워드"]\'); if(i)i.dispatchEvent(new KeyboardEvent(\'keydown\',{key:\'Enter\',bubbles:true})); return 1'); await sleep(280)
  const kwAfter = await E("return document.querySelectorAll('.insp-body .kw-chip').length")
  t(kwAfter > kwBefore, '키워드 추가됨(칩 ' + kwBefore + '→' + kwAfter + ')')
  const QA_CHIP = "[].slice.call(document.querySelectorAll('.insp-body .kw-chip')).find(function(c){return /QA키워드/.test(c.textContent||'')})||document.querySelector('.insp-body .kw-chip')"
  await E("var c=" + QA_CHIP + "; if(c&&!c.classList.contains('on'))c.click(); return 1"); await sleep(220)
  const tagged = await E("var c=" + QA_CHIP + "; return c?c.classList.contains('on'):false")
  await TAB('meta'); await TAB('keywords') // 왕복
  const stillTagged = await E("var c=" + QA_CHIP + "; return c?c.classList.contains('on'):false")
  t(tagged && stillTagged, '키워드 칩 태깅(.on) → 왕복 후 영속')

  // ── 스냅샷 탭: 지금찍기 → 본문 실편집 → 되돌리기 로 원복 ──
  await TAB('snapshots')
  await E("window.__qa.setInput('.insp-body .snap-take input.field','QA스냅'); return 1"); await sleep(200)
  await E("var bs=document.querySelectorAll('.insp-body .snap-take button.btn-primary'); var b=null; bs.forEach(function(x){if((x.textContent||'').indexOf('지금')>=0)b=x;}); if(b)b.click(); return 1"); await sleep(450)
  const snapCreated = await E("var f=false; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){if(/QA스냅/.test(s.textContent||''))f=true;}); return f")
  t(snapCreated, '스냅샷 "지금 찍기" → QA스냅 항목 생성')
  // 본문(.paper) 을 실제로 편집 → 디바운스 커밋되면 본문 RTF 에 ASCII 마커가 들어간다.
  await E("var p=document.querySelector('.paper'); if(p){ p.innerHTML=p.innerHTML+'<div>RBMARKQA987</div>'; p.dispatchEvent(new Event('input',{bubbles:true})); } return 1"); await sleep(380)
  const edited = await E("return (window.__scriv.bodyOf('" + bid + "')||'').indexOf('RBMARKQA987')>=0")
  t(edited, '본문 실편집(RBMARK) 이 스토어 본문에 반영')
  // QA스냅 의 되돌리기 클릭 → confirm(true) → 본문이 스냅샷 시점으로 원복.
  await E("var tgt=null; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){ if(/QA스냅/.test(s.textContent||'')){ s.querySelectorAll('.snap-actions button').forEach(function(b){ if((b.textContent||'').indexOf('되돌리기')>=0)tgt=b; }); } }); if(tgt)tgt.click(); return 1"); await sleep(550)
  const reverted = await E("return (window.__scriv.bodyOf('" + bid + "')||'').indexOf('RBMARKQA987')<0")
  const autoSnap = await E("var f=false; document.querySelectorAll('.insp-body .snap-item').forEach(function(s){if(/되돌리기 전 자동저장/.test(s.textContent||''))f=true;}); return f")
  t(edited && reverted, '되돌리기 → 본문이 스냅샷 시점으로 원복(RBMARK 제거)')
  t(autoSnap, '되돌리기 시 "되돌리기 전 자동저장" 안전 스냅샷 생성')

  // ── 북마크 탭: +URL 로 북마크 추가 → 왕복 후 잔존 ──
  await TAB('bookmarks')
  const bmBefore = await E("return document.querySelectorAll('.insp-body .bm-row').length")
  await E("var b=null; document.querySelectorAll('.insp-body .insp-section button.minibtn').forEach(function(x){ if(b===null && /\\+\\s*URL/.test(x.textContent||'')) b=x; }); if(b)b.click(); return 1"); await sleep(350)
  const bmAfter = await E("return document.querySelectorAll('.insp-body .bm-row').length")
  t(bmAfter > bmBefore, '북마크 +URL 추가됨(' + bmBefore + '→' + bmAfter + ')')
  await TAB('meta'); await TAB('bookmarks') // 왕복
  const bmStay = await E("return document.querySelectorAll('.insp-body .bm-row').length")
  t(bmStay > bmBefore, '북마크 → 탭 왕복 후 잔존(' + bmStay + ')')

  // ── 주석 탭 진입 ──
  await TAB('comments')
  const cm = await E("var b=document.querySelector('.insp-body'); return b? /코멘트|각주/.test(b.textContent||''):false")
  t(cm, '주석(코멘트·각주) 탭 진입 표시')

  await rpc(ws, 'Target.closeTarget', { targetId })
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const ok = [], bad = []
  for (const skin of ['classic', 'studio']) {
    try { await runSkin(ws, skin, ok, bad) }
    catch (e) { bad.push('[' + skin + '] 치명적 오류: ' + e.message) }
  }
  console.log('=== 인스펙터 전 탭 실조작·영속 검증(양 스킨) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
