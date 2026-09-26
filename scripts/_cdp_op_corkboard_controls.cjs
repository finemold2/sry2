// 코르크보드 컨트롤 실동작 QA — '실제 사용자 조작'으로 코르크 툴바의 모든 컨트롤을 검증한다.
//  영역(소스: src/components/Corkboard.tsx):
//   · 크기 select(작게/보통/크게) — 그리드 minmax 픽셀 + 자유배치 카드 width 가 실제로 바뀜·영속
//   · 정렬 select(manual/제목/라벨/상태/...) — 제목 정렬 시 카드 DOM 순서가 알파벳순으로 재배열,
//     정렬 중 '드래그 재배치 잠금' 경고 + 카드 draggable=false, manual 복귀 시 원순서·잠금 해제·영속
//   · 자유 배치(freeform) 토글 → 카드 .card-free + position:absolute, 정렬 select 비활성화, 영속(cork.freeform)
//   · 자유 배치 시 카드를 '실제 마우스'로 자유 드래그 → style.left/top 좌표 이동 + localStorage(cork.pos.*) 영속,
//     에디터↔코르크보드 뷰 왕복 후에도 좌표 잔존(영속 라운드트립)
//   · 폴더 카드 더블클릭 → 드릴인(하위 카드 표시) + 브레드크럼에 폴더명, '↑ 상위'로 복귀
//   · 라벨/상태 지정 → 카드에 라벨 색 바(.card-label) + 상태 텍스트(.card-status) 표시
//  양 스킨(classic·studio) 모두 검증. 단언은 모두 '조작→사용자가 기대하는 결과'(DOM/__scriv 상태/localStorage 영속).
//  드래그(Input.dispatchMouseEvent)를 쓰므로 Runtime.enable 은 호출하지 않는다(콘솔캡처와 분리).
//  작성만(실행은 러너). node --check 통과.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to@' + m)), 12000) }) }
async function rawEv(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }
const J = (v) => JSON.stringify(v)
const numPx = (s) => (s ? parseFloat(s) : NaN)

// 페이지에 설치하는 헬퍼(코르크 카드/바인더 행/툴바 조회). 매 타깃마다 1회 주입.
const HELP = `window.__T={
  cards:function(){return [].slice.call(document.querySelectorAll('.corkboard .card'))},
  titles:function(){return this.cards().map(function(c){var e=c.querySelector('.card-title');return e?e.textContent:''})},
  card:function(t){return this.cards().filter(function(c){var e=c.querySelector('.card-title');return e&&e.textContent===t})[0]||null},
  rect:function(t){var c=this.card(t);if(!c)return null;var r=c.getBoundingClientRect();return {cx:r.left+r.width/2,top:r.top,left:r.left,width:r.width,height:r.height}},
  style:function(t){var c=this.card(t);if(!c)return null;return {left:c.style.left,top:c.style.top,width:c.style.width,cls:c.className,pos:getComputedStyle(c).position,drag:c.draggable}},
  labelBg:function(t){var c=this.card(t);if(!c)return null;var l=c.querySelector('.card-label');return l?getComputedStyle(l).backgroundColor:null},
  status:function(t){var c=this.card(t);if(!c)return null;var s=c.querySelector('.card-status');return s?s.textContent:null},
  clickCard:function(t){var c=this.card(t);if(c)c.click();return !!c},
  dbl:function(t){var c=this.card(t);if(c)c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return !!c},
  rows:function(){return [].slice.call(document.querySelectorAll('.binder-row'))},
  row:function(t){return this.rows().filter(function(r){var e=r.querySelector('.binder-title');return e&&e.textContent===t})[0]||null},
  ctx:function(t){var r=this.row(t);if(!r)return false;var rc=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:Math.round(rc.left+20),clientY:Math.round(rc.top+8)}));return true},
  chip:function(group,name){var g=document.querySelector('.context-menu .ctx-sub-group[aria-label="'+group+'"]');if(!g)return false;var b=[].slice.call(g.querySelectorAll('.ctx-chip')).filter(function(x){return (x.textContent||'').indexOf(name)>=0})[0];if(b){b.click();return true}return false},
  toolbar:function(){var t=document.querySelector('.cork-toolbar');return t?t.textContent:''},
  grid:function(){var c=document.querySelector('.corkboard');return c?c.style.gridTemplateColumns:''},
  setSel:function(i,v){var s=document.querySelectorAll('.cork-toolbar select')[i];if(!s)return null;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,v);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value},
  selDisabled:function(i){var s=document.querySelectorAll('.cork-toolbar select')[i];return !!(s&&s.disabled)},
  toggleFree:function(){var cb=document.querySelector('.cork-toolbar input[type=checkbox]');if(!cb)return null;var was=cb.checked;cb.click();return {was:was,now:cb.checked}},
  freeChecked:function(){var cb=document.querySelector('.cork-toolbar input[type=checkbox]');return !!(cb&&cb.checked)},
  up:function(){var b=document.querySelector('.container-bar button.minibtn');if(b&&!b.disabled){b.click();return true}return false},
  crumbs:function(){return [].slice.call(document.querySelectorAll('.cb-crumbs .cb-crumb')).map(function(x){return x.textContent})},
  count:function(){return this.cards().length}
};return 1`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const ok = [], bad = [], notes = []
  const t = (c, m) => (c ? ok : bad).push(m)

  async function runSkin(skin) {
    const P = '[' + skin + '] '
    // (a) 부트스트랩 타깃에서 스킨 + 코르크 초기 상태(수동/보통/자유배치off)를 선설정 후 닫는다.
    {
      const { targetId: btid } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
      const { sessionId: bsid } = await rpc(ws, 'Target.attachToTarget', { targetId: btid, flatten: true })
      await sleep(1500)
      await rawEv(ws, bsid, "localStorage.setItem('sry:uiSkin'," + J(skin) + ");localStorage.setItem('cork.sort','manual');localStorage.setItem('cork.size','md');localStorage.setItem('cork.freeform','');return 1")
      await rpc(ws, 'Target.closeTarget', { targetId: btid })
    }
    // (b) 본 타깃 직접 생성 + attach(flatten). about:blank+navigate 금지.
    const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
    const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
    const E = (x) => rawEv(ws, sid, x)
    const M = (type, x, y) => rpc(ws, 'Input.dispatchMouseEvent', type === 'mouseMoved'
      ? { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1 }
      : { type, x: Math.round(x), y: Math.round(y), button: 'left', buttons: 1, clickCount: 1 }, sid)

    // 훅 준비 폴링(__setView/__scriv)
    let ready = false
    for (let i = 0; i < 40; i++) { await sleep(400); try { if (await E("return typeof window.__setView==='function'&&typeof window.__scriv==='object'")) { ready = true; break } } catch { /* loading */ } }
    t(ready, P + '앱 로드 + 테스트 훅(__setView/__scriv) 준비')
    if (!ready) { await rpc(ws, 'Target.closeTarget', { targetId }) ; return }
    // 환영/투어 닫기 + 헬퍼 주입
    await E("var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(350)
    await E(HELP)
    // 코르크보드 뷰로(스킨 무관 훅)
    await E("window.__setView('corkboard');return 1"); await sleep(500)
    t(await E("return !!document.querySelector('.corkboard')"), P + '코르크보드 뷰 마운트(.corkboard)')

    // ── 셋업: 격리된 새 폴더 안에 카드 3개를 만든다(시드와 분리). 삽입순서 [..-c,..-a,..-b].
    const tok = 'CK' + skin[0].toUpperCase() + (Date.now() % 100000)
    const FolderTok = tok + '-FD', ca = tok + '-a', cb = tok + '-b', cc = tok + '-c'
    const rename = async (name) => { await E("var i=document.querySelector('.binder-rename');if(i){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i," + J(name) + ");i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}return 1"); await sleep(360) }
    const clickHead = async (title) => { await E("var b=document.querySelector('.binder-head button[title=\"" + title + "\"]');if(b)b.click();return 1"); await sleep(430) }
    await clickHead('새 폴더'); await rename(FolderTok)   // 폴더 생성 → active=폴더(드릴인 상태)
    await clickHead('새 글'); await rename(cc)           // 폴더 안에 카드 c
    await clickHead('새 글'); await rename(ca)           // 폴더 안에 카드 a
    await clickHead('새 글'); await rename(cb)           // 폴더 안에 카드 b
    await E("window.__setView('corkboard');return 1"); await sleep(300)
    await E(HELP) // 혹시 모를 재마운트 대비 재주입

    const info = JSON.parse(await E("var es=window.__scriv.entries();function f(t){var e=es.find(function(x){return x.title===t});return e?e.id:null}var fo=es.find(function(x){return x.title===" + J(FolderTok) + "});return JSON.stringify({folder:f(" + J(FolderTok) + "),fparent:fo?fo.parentId:null,ca:f(" + J(ca) + "),cb:f(" + J(cb) + "),cc:f(" + J(cc) + ")})"))
    const pid = await E("return window.__scriv.state().id")
    t(!!info.folder && !!info.ca && !!info.cb && !!info.cc, P + '셋업: 폴더+카드 a/b/c 생성(folder=' + info.folder + ')')

    // 현재 컨테이너(폴더) 안 카드 = 우리 3개만
    let titles = JSON.parse(await E("return JSON.stringify(window.__T.titles())"))
    const mine = (arr) => arr.filter(s => s === ca || s === cb || s === cc)
    t(mine(titles).length === 3 && titles.includes(ca) && titles.includes(cb) && titles.includes(cc), P + '드릴인 폴더에 카드 a/b/c 표시(' + mine(titles).join(',') + ')')
    // 카드 수 표시(N개 카드)가 실제 카드 수와 일치
    const cnt = await E("return window.__T.count()")
    t(await E("return window.__T.toolbar().indexOf(" + J(cnt + '개 카드') + ")>=0"), P + '툴바 카드 수 표시 = ' + cnt + '개 카드')

    // ── 크기 select(그리드): 크게=minmax(300px), 작게=minmax(160px) + 영속(cork.size)
    await E("window.__T.setSel(1,'lg');return 1"); await sleep(250)
    const gridLg = await E("return window.__T.grid()")
    t(/300px/.test(gridLg), P + '크기=크게 → 그리드 minmax(300px) (' + gridLg + ')')
    await E("window.__T.setSel(1,'sm');return 1"); await sleep(250)
    const gridSm = await E("return window.__T.grid()")
    t(/160px/.test(gridSm), P + '크기=작게 → 그리드 minmax(160px) (' + gridSm + ')')
    t(await E("return localStorage.getItem('cork.size')") === 'sm', P + '크기 select 영속(cork.size=sm)')
    await E("window.__T.setSel(1,'md');return 1"); await sleep(200) // 복원

    // ── 정렬 select: 제목 정렬 시 DOM 순서 알파벳순 + 잠금 경고 + draggable=false, manual 복귀 시 원순서·해제
    const manualSeq = mine(JSON.parse(await E("return JSON.stringify(window.__T.titles())")))
    t(manualSeq[0] === cc && manualSeq[1] === ca && manualSeq[2] === cb, P + 'manual 정렬 = 바인더 삽입순 [c,a,b] (' + manualSeq.join(',') + ')')
    await E("window.__T.setSel(0,'title');return 1"); await sleep(300)
    const titleSeq = mine(JSON.parse(await E("return JSON.stringify(window.__T.titles())")))
    t(titleSeq[0] === ca && titleSeq[1] === cb && titleSeq[2] === cc, P + "정렬=제목 → 카드 DOM 순서 알파벳순 [a,b,c] (" + titleSeq.join(',') + ')')
    t(await E("return /정렬 중|드래그 재배치 잠금/.test(window.__T.toolbar())"), P + '정렬 중 — 드래그 재배치 잠금 경고 표시')
    t((await E("var s=window.__T.style(" + J(ca) + ");return s?s.drag:null")) === false, P + '정렬 중 카드 draggable=false(재배치 잠금)')
    t(await E("return localStorage.getItem('cork.sort')") === 'title', P + '정렬 select 영속(cork.sort=title)')
    await E("window.__T.setSel(0,'manual');return 1"); await sleep(300)
    const backSeq = mine(JSON.parse(await E("return JSON.stringify(window.__T.titles())")))
    t(backSeq[0] === cc && backSeq[1] === ca && backSeq[2] === cb, P + 'manual 복귀 → 원순서 [c,a,b] 복원 (' + backSeq.join(',') + ')')
    t(await E("return !/정렬 중|드래그 재배치 잠금/.test(window.__T.toolbar())"), P + 'manual 복귀 → 잠금 경고 사라짐')
    t((await E("var s=window.__T.style(" + J(ca) + ");return s?s.drag:null")) === true, P + 'manual → 카드 draggable=true(재배치 가능)')

    // ── 라벨/상태 지정(바인더 우클릭 일괄 메뉴) → 코르크 카드에 라벨색 바 + 상태 텍스트 표시
    await E("window.__T.clickCard(" + J(ca) + ");return 1"); await sleep(200)
    await E("window.__T.ctx(" + J(ca) + ");return 1"); await sleep(250)
    const chipL = await E("return window.__T.chip('라벨 지정','아이디어')"); await sleep(300)
    const labelBg = await E("return window.__T.labelBg(" + J(ca) + ")")
    t(chipL === true && !!labelBg && labelBg !== 'rgba(0, 0, 0, 0)' && labelBg !== 'transparent', P + '라벨 지정 → 카드 라벨색 바 표시(.card-label bg=' + labelBg + ')')
    await E("window.__T.ctx(" + J(ca) + ");return 1"); await sleep(250)
    const chipS = await E("return window.__T.chip('상태 지정','집필 중')"); await sleep(300)
    const stat = await E("return window.__T.status(" + J(ca) + ")")
    t(chipS === true && stat === '집필 중', P + '상태 지정 → 카드 상태 텍스트 표시(.card-status=' + stat + ')')

    // ── 자유 배치(freeform) 토글 → 카드 .card-free + position:absolute, 정렬 select 비활성화, 영속
    const tg = JSON.parse(await E("var r=window.__T.toggleFree();return JSON.stringify(r)")); await sleep(350)
    await E(HELP)
    t(tg && tg.was === false && tg.now === true, P + '자유 배치 토글 ON(체크 false→true)')
    t(await E("return localStorage.getItem('cork.freeform')") === '1', P + '자유 배치 영속(cork.freeform=1)')
    const fs = JSON.parse(await E("var s=window.__T.style(" + J(ca) + ");return JSON.stringify(s)"))
    t(!!fs && /card-free/.test(fs.cls) && fs.pos === 'absolute', P + '자유 배치 → 카드 .card-free + position:absolute (pos=' + (fs && fs.pos) + ')')
    t((await E("return window.__T.selDisabled(0)")) === true, P + '자유 배치 시 정렬 select 비활성화(disabled)')

    // 자유 배치에서 크기 select → 카드 inline width 가 실제로 변경(크게=300px, 작게=160px)
    await E("window.__T.setSel(1,'lg');return 1"); await sleep(250)
    t((await E("var s=window.__T.style(" + J(ca) + ");return s?s.width:null")) === '300px', P + '자유 배치 크기=크게 → 카드 width 300px')
    await E("window.__T.setSel(1,'sm');return 1"); await sleep(250)
    t((await E("var s=window.__T.style(" + J(ca) + ");return s?s.width:null")) === '160px', P + '자유 배치 크기=작게 → 카드 width 160px')
    await E("window.__T.setSel(1,'md');return 1"); await sleep(250)

    // ── 실제 마우스로 카드 a 자유 드래그(+170,+120). 카드 상단 라벨바(5px)를 눌러야 드래그 시작(제목/줄거리는 편집영역).
    const before = JSON.parse(await E("var s=window.__T.style(" + J(ca) + ");return JSON.stringify({l:s?s.left:null,t:s?s.top:null})"))
    const r = JSON.parse(await E("return JSON.stringify(window.__T.rect(" + J(ca) + "))"))
    let dragged = false
    if (r) {
      const px = r.cx, py = r.top + 2
      await M('mouseMoved', px, py)
      await M('mousePressed', px, py); await sleep(70)
      for (let s = 1; s <= 10; s++) { await M('mouseMoved', px + 170 * s / 10, py + 120 * s / 10); await sleep(28) }
      await M('mouseReleased', px + 170, py + 120); await sleep(450)
      dragged = true
    }
    const after = JSON.parse(await E("var s=window.__T.style(" + J(ca) + ");return JSON.stringify({l:s?s.left:null,t:s?s.top:null})"))
    const moved = dragged && numPx(after.l) > numPx(before.l) + 100 && numPx(after.t) > numPx(before.t) + 60
    if (!moved) notes.push(P + '[APP-BUG?] 자유 드래그 미반영(before=' + JSON.stringify(before) + ' after=' + JSON.stringify(after) + ')')
    t(moved, P + '자유 드래그 → 카드 좌표 이동(left ' + numPx(before.l) + '→' + numPx(after.l) + ', top ' + numPx(before.t) + '→' + numPx(after.t) + ')')
    // localStorage 좌표 영속(cork.pos.<projectId>.<id>)
    const posRaw = await E("return localStorage.getItem('cork.pos.' + " + J(pid) + " + '.' + " + J(info.ca) + ")")
    let posX = NaN; try { posX = JSON.parse(posRaw).x } catch { /* */ }
    t(!!posRaw && posX > numPx(before.l) + 100, P + 'localStorage 에 이동 좌표 영속(cork.pos.*.x=' + Math.round(posX) + ')')

    // ── 뷰 왕복(에디터↔코르크보드) 후에도 좌표 잔존(영속 라운드트립)
    await E("window.__setView('editor');return 1"); await sleep(300)
    await E("window.__setView('corkboard');return 1"); await sleep(450)
    await E(HELP)
    t((await E("return window.__T.freeChecked()")) === true, P + '뷰 왕복 후에도 자유 배치 유지(체크 상태 잔존)')
    const afterTrip = numPx(await E("var s=window.__T.style(" + J(ca) + ");return s?s.left:null"))
    t(afterTrip > numPx(before.l) + 100, P + '뷰 왕복 후 카드 좌표 잔존(left=' + Math.round(afterTrip) + ')')

    // 자유 배치 OFF 복원(드릴인 검증은 그리드에서)
    await E("if(window.__T.freeChecked())window.__T.toggleFree();return 1"); await sleep(350)
    await E(HELP)

    // ── 폴더 드릴인/복귀: '↑ 상위'로 폴더 부모로 → 폴더 카드 더블클릭 진입 → 하위카드+브레드크럼 → 다시 상위로 복귀
    t((await E("return window.__T.up()")) === true, P + "'↑ 상위' 클릭으로 폴더 부모 컨테이너로 이동")
    await sleep(350); await E(HELP)
    t(await E("return window.__T.titles().indexOf(" + J(FolderTok) + ")>=0"), P + '부모 컨테이너에 폴더 카드 표시')
    t((await E("return window.__T.dbl(" + J(FolderTok) + ")")) === true, P + '폴더 카드 더블클릭(드릴인 트리거)')
    await sleep(400); await E(HELP)
    const drillTitles = JSON.parse(await E("return JSON.stringify(window.__T.titles())"))
    t(mine(drillTitles).length === 3, P + '폴더 더블클릭 드릴인 → 하위 카드 a/b/c 표시(' + mine(drillTitles).join(',') + ')')
    const crumbs = JSON.parse(await E("return JSON.stringify(window.__T.crumbs())"))
    t(crumbs[crumbs.length - 1] === FolderTok, P + '브레드크럼 말단 = 폴더명(' + crumbs.join(' › ') + ')')
    t((await E("return window.__T.up()")) === true, P + "'↑ 상위'로 폴더에서 복귀")
    await sleep(350); await E(HELP)
    t(await E("return window.__T.titles().indexOf(" + J(FolderTok) + ")>=0"), P + '복귀 후 부모 컨테이너의 폴더 카드 재표시(브레드크럼 복귀)')

    // 정리: 토큰 폴더(하위 포함)를 휴지통으로(잔여물 최소화 — 실패해도 무해)
    await E("var r=window.__T.row(" + J(FolderTok) + ");if(r){var rc=r.getBoundingClientRect();r.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:Math.round(rc.left+20),clientY:Math.round(rc.top+8)}));var del=[].slice.call(document.querySelectorAll('.context-menu button')).find(function(b){return /휴지통으로 이동/.test(b.textContent||'')});if(del){window.confirm=function(){return true};del.click()}}return 1"); await sleep(300)

    await rpc(ws, 'Target.closeTarget', { targetId })
  }

  for (const skin of ['classic', 'studio']) {
    try { await runSkin(skin) } catch (e) { bad.push('[' + skin + '] FATAL ' + e.message) }
  }

  console.log('=== 코르크보드 컨트롤 실동작 검증(크기·정렬·자유배치·드래그·드릴인·라벨/상태) ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  if (notes.length) { console.log('--- notes ---'); notes.forEach(m => console.log('  • ' + m)) }
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
