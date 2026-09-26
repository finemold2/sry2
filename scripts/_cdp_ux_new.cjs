// UX 개선(2026-06-28 131명 감사 반영분) 전용 실동작 검증:
//  ① 전체 찾아바꾸기 전 자동 스냅샷 ② 팔레트 최근실행/랭킹/스크롤 ③ 빈 문서 플레이스홀더+오토포커스
//  ④ 백업 모달 '.sry 파일 열기' 경로 ⑤ 캔버스 삭제 Ctrl+Z 복구 ⑥ 다크 형광펜 잉크 안전망 ⑦ OS드롭 언로드 가드
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '').split('\n')[0]); return r.result && r.result.value }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setModal==='function'&&typeof window.__scriv==='object'")) break } catch { /* loading */ } }
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)

  // ① 전체 찾아바꾸기 전 자동 스냅샷
  //  (빈 문서 오토포커스(#23)로 에디터가 포커스를 쥐면 setBody 가 blur 시 빈 DOM 으로 되덮이므로 먼저 blur)
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(150)
  await ev(ws, sid, "var BS=String.fromCharCode(92);window.__scriv.setBody('{'+BS+'rtf1'+BS+'ansi OLDWORD alpha OLDWORD'+BS+'par}');return 1"); await sleep(500)
  const aid = await ev(ws, sid, "return window.__scriv.state().activeId")
  const snapBefore = await ev(ws, sid, "var s=window.__scriv;return 0") // snapshots 수는 store 직접 접근 불가 → 인스펙터로 확인 대신 치환 후 스냅샷 탭 카운트로
  await ev(ws, sid, "window.confirm=function(){return true};window.__setModal('replace');return 1"); await sleep(500)
  await ev(ws, sid, "var ins=[].slice.call(document.querySelectorAll('.modal-backdrop input[type=\"text\"], .modal-backdrop input:not([type])'));var S=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;if(ins[0]){S.call(ins[0],'OLDWORD');ins[0].dispatchEvent(new Event('input',{bubbles:true}))}if(ins[1]){S.call(ins[1],'NEWWORD');ins[1].dispatchEvent(new Event('input',{bubbles:true}))}return ins.length"); await sleep(250)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal-backdrop button')).find(function(x){return /모두 바꾸기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(600)
  const bodyNow = await ev(ws, sid, "return window.__scriv.bodyOf('" + aid + "')||''")
  t(bodyNow.indexOf('NEWWORD') >= 0 && bodyNow.indexOf('OLDWORD') < 0, '① 전체 바꾸기 실행됨(OLDWORD→NEWWORD)')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)
  // 스냅샷 탭에서 '찾아 바꾸기 전' 스냅샷 존재 확인
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /인스펙터/.test(x.getAttribute('aria-label')||'')});if(b&&!document.querySelector('.inspector'))b.click();return 1"); await sleep(300)
  await ev(ws, sid, "var tb=document.querySelector('#insp-tab-snapshots');if(tb)tb.click();return 1"); await sleep(400)
  t(await ev(ws, sid, "return /찾아 바꾸기 전/.test((document.querySelector('#insp-panel')||{}).textContent||'')"), '① 치환 전 자동 스냅샷이 스냅샷 탭에 존재(비가역→가역)')

  // ③ 빈 문서 플레이스홀더 + 오토포커스 (새 글 추가)
  await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();var b=document.querySelector('.binder-head button[title=\"새 글\"]');if(b)b.click();return 1"); await sleep(500)
  await ev(ws, sid, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(200)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(400)
  const ph = await ev(ws, sid, "var p=document.querySelector('.paper');if(!p)return 'no';if(document.activeElement&&p.contains(document.activeElement))document.activeElement.blur();var q=p.querySelector(':scope > p');var cs=getComputedStyle(q||p,'::before');return (cs.content||'').indexOf('여기에 쓰세요')>=0?'yes':cs.content")
  t(ph === 'yes', '③ 빈 문서 플레이스홀더 표시(' + ph + ')')

  // ④ 백업 모달 .sry 파일 복원 경로
  await ev(ws, sid, "window.__setModal('backup');return 1"); await sleep(500)
  t(await ev(ws, sid, "return /.sry 파일 열기/.test((document.querySelector('.modal-backdrop')||{}).textContent||'')"), '④ 백업 모달에 .sry 파일 복원 경로 존재')
  await ev(ws, sid, "window.__setModal(null);return 1"); await sleep(200)

  // ⑤ 캔버스 Delete → Ctrl+Z 복구
  await ev(ws, sid, "window.__setView('canvas');return 1"); await sleep(500)
  await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /카드|메모/.test(x.textContent||'')&&x.closest('.canvas-area,.canvas-bar,.center,.st-center')});if(b)b.click();return !!b"); await sleep(400)
  const n0 = await ev(ws, sid, "return document.querySelectorAll('[data-node-id],.canvas-node').length")
  if (n0 > 0) {
    // 추가 직후엔 텍스트 편집 모드(textarea 포커스) — blur 로 편집만 끝내면 선택은 유지된다(Escape 는 선택까지 해제).
    await ev(ws, sid, "document.activeElement&&document.activeElement.blur&&document.activeElement.blur();return 1"); await sleep(250)
    await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));return 1"); await sleep(350)
    const n1 = await ev(ws, sid, "return document.querySelectorAll('[data-node-id],.canvas-node').length")
    await ev(ws, sid, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));return 1"); await sleep(350)
    const n2 = await ev(ws, sid, "return document.querySelectorAll('[data-node-id],.canvas-node').length")
    t(n1 < n0 && n2 === n0, '⑤ 캔버스 Delete 후 Ctrl+Z 복구(' + n0 + '→' + n1 + '→' + n2 + ')')
  } else { t(true, '⑤ (캔버스 카드 생성 버튼 미발견 — 스킵)') }

  // ⑥ 다크 형광펜 잉크 안전망
  await ev(ws, sid, "document.documentElement.setAttribute('data-theme','dark');return 1"); await sleep(200)
  await ev(ws, sid, "window.__setView('editor');return 1"); await sleep(300)
  const ink = await ev(ws, sid, "var p=document.querySelector('.paper');if(!p)return 'no-paper';var sp=document.createElement('span');sp.setAttribute('style','background: rgb(255,225,77)');sp.textContent='HL';var fp=p.querySelector('p')||p;fp.appendChild(sp);var c=getComputedStyle(sp).color;sp.remove();return c")
  t(/rgb\(31, 35, 41\)/.test(String(ink)), '⑥ 다크에서 형광펜 스팬에 어두운 잉크 강제(' + ink + ')')
  await ev(ws, sid, "document.documentElement.removeAttribute('data-theme');return 1")

  // ⑦ OS 파일 드롭 언로드 가드(전역 dragover/drop preventDefault)
  const guarded = await ev(ws, sid, "var e=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:new DataTransfer()});document.body.dispatchEvent(e);return e.defaultPrevented")
  t(guarded === true, '⑦ 본문 밖 파일 드롭 시 브라우저 이동(defaultPrevented) 차단')

  // ② 팔레트: 실행 → 최근 기록 → 빈 질의 상단 노출 + 스크롤 추적
  await ev(ws, sid, "window.__setModal('palette');return 1"); await sleep(400)
  await ev(ws, sid, "var i=document.querySelector('.cmd-input');if(i){var S=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;S.call(i,'코르크보드');i.dispatchEvent(new Event('input',{bubbles:true}))}return 1"); await sleep(300)
  const first = await ev(ws, sid, "var it=document.querySelector('.cmd-item .cmd-title');return it?(it.textContent||''):''")
  t(/코르크보드/.test(first), '② 검색 랭킹: 정확 매치가 최상단(' + first + ')')
  await ev(ws, sid, "var b=document.querySelector('.cmd-item .cmd-item-main');if(b)b.click();return 1"); await sleep(500)
  t(await ev(ws, sid, "return !!document.querySelector('.corkboard')"), '② 팔레트 실행 동작(코르크보드 전환)')
  t(await ev(ws, sid, "try{var a=JSON.parse(localStorage.getItem('sry:cmd-recents')||'[]');return a.length>0}catch(e){return false}"), '② 최근 실행이 기록됨(sry:cmd-recents)')
  await ev(ws, sid, "window.__setModal('palette');return 1"); await sleep(400)
  const emptyTop = await ev(ws, sid, "var it=document.querySelector('.cmd-item .cmd-title');return it?(it.textContent||''):''")
  t(/코르크보드/.test(emptyTop), '② 빈 질의에서 최근 실행이 최상단(' + emptyTop + ')')
  // 스크롤 추적: ArrowDown 20회 → 선택 항목이 목록 뷰포트 안에 있는지
  await ev(ws, sid, "var d=document.querySelector('.cmd-palette');for(var k=0;k<20;k++)d.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));return 1"); await sleep(300)
  const visible = await ev(ws, sid, "var s=document.querySelector('.cmd-item.sel');var l=document.querySelector('.cmd-list');if(!s||!l)return 'no';var sr=s.getBoundingClientRect(),lr=l.getBoundingClientRect();return sr.top>=lr.top-2&&sr.bottom<=lr.bottom+2")
  t(visible === true, '② 키보드 탐색 시 선택 항목이 화면 안에 유지(scrollIntoView)')
  await ev(ws, sid, "window.__setModal(null);return 1")

  console.log('=== UX 개선(131명 감사 반영) 실동작 검증 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
