// 데이터 안전 E2E 베타: 저장→새로고침→영속 확인, 구조 복구(고아 보존), 손상 레코드 무크래시.
const APP = 'http://localhost:4178/', HUB = 'http://localhost:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
let _i = 0
function rpc(ws, m, p, s) { return new Promise((res, rej) => { const id = ++_i, msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; const f = (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', f); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', f); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', f); rej(new Error('to ' + m)) }, 30000) }) }
async function ev(ws, s, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s); if (r.exceptionDetails) throw new Error('EVAL: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value }

let PASS = 0, FAIL = 0
function ok(c, m) { if (c) { PASS++; console.log('  ✓ ' + m) } else { FAIL++; console.log('  ✗ FAIL: ' + m) } }

async function newSession(ws) {
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const exceptions = []
  ws.addEventListener('message', (e) => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.sessionId !== s) return; if (d.method === 'Runtime.exceptionThrown') exceptions.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || '').split('\n')[0]) })
  await rpc(ws, 'Runtime.enable', {}, s); await rpc(ws, 'Page.enable', {}, s)
  return { s, targetId, exceptions }
}
async function waitReady(ws, s) { for (let i = 0; i < 50; i++) { await sleep(400); try { if ((await ev(ws, s, 'typeof window.__scriv')) === 'object') return true } catch {} } return false }

async function main() {
  const ws = new WebSocket(await bws()); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j) })

  // ---------- 1) 영속 라운드트립: 편집→자동저장→새로고침→내용 유지 ----------
  console.log('\n[1] 저장 영속 라운드트립')
  let { s, exceptions } = await newSession(ws)
  await rpc(ws, 'Page.navigate', { url: APP }, s)
  ok(await waitReady(ws, s), '앱 로드(__scriv 노출)')
  // 깨끗한 출발을 위해 기존 IDB 비우고 새로고침
  // 앱이 DB 연결을 쥔 채 deleteDatabase 하면 'blocked' 로 지연돼 새 페이지가 만든 DB 를 뒤늦게 지우는 경쟁 발생.
  // → 먼저 about:blank 로 나가 연결을 닫고(같은 origin 유지 위해 APP 의 404 경로 사용) 삭제를 완료시킨 뒤 앱을 연다.
  await ev(ws, s, `localStorage.removeItem('sry:lastProjectId')`)
  // (SPA 폴백을 피하려고 정적 파일 icon.svg 로 이동 — 앱 JS 가 실행되지 않아 DB 연결이 없다)
  await rpc(ws, 'Page.navigate', { url: APP + 'icon.svg' }, s); await sleep(600)
  const delRes = await ev(ws, s, `new Promise(r=>{var q=indexedDB.deleteDatabase('sry');q.onsuccess=()=>r('ok');q.onerror=()=>r('err');setTimeout(()=>r('timeout'),10000)})`)
  if (delRes !== 'ok') console.log('  (경고) IDB 삭제 결과: ' + delRes)
  await rpc(ws, 'Page.navigate', { url: APP }, s); await waitReady(ws, s); await sleep(500)
  const st0 = await ev(ws, s, `window.__scriv.state()`)
  const marker = 'DATASAFE_' + (st0.modified || 0) + '_가나다라'
  // 빈 문서 오토포커스(#30) — 포커스된 에디터는 외부 setBody 를 무시하므로 먼저 blur
  await ev(ws, s, `document.activeElement&&document.activeElement.blur&&document.activeElement.blur(),1`)
  const usedId = await ev(ws, s, `window.__scriv.setBody(${JSON.stringify('{\\\\rtf1\\\\ansi ' + marker + '}')})`)
  ok(!!usedId, '편집 대상 문서 확보 (id=' + usedId + ')')
  await sleep(2600) // 자동저장(1.5s) + 검증 여유
  const st1 = await ev(ws, s, `window.__scriv.state()`)
  ok(st1.dirty === false, '자동저장 후 dirty=false (검증 저장 성공)')
  const projId = st1.id, activeId = usedId
  // IDB 에 실제로 기록됐는지 직접 확인
  const inIdb = await ev(ws, s, `new Promise((res)=>{var o=indexedDB.open('sry',1);o.onupgradeneeded=()=>{var db=o.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'})};o.onsuccess=()=>{var db=o.result;try{var tx=db.transaction('projects');var g=tx.objectStore('projects').get(${JSON.stringify(projId)});g.onsuccess=()=>{var p=g.result;db.close();res(p&&p.items&&p.items[${JSON.stringify(activeId)}]?p.items[${JSON.stringify(activeId)}].bodyRtf:null)};g.onerror=()=>{db.close();res(null)}}catch(e){db.close();res('ERR')}};o.onerror=()=>res(null)})`)
  ok(typeof inIdb === 'string' && inIdb.includes(marker), 'IDB 레코드 본문에 마커 존재(실제 기록 확인)')
  // 새로고침 후 유지
  const lastPid = await ev(ws, s, `localStorage.getItem('sry:lastProjectId')`)
  await rpc(ws, 'Page.navigate', { url: APP }, s); await waitReady(ws, s)
  // 복원은 비동기(IDB 로드) — 최대 8초 폴링
  let body2 = ''
  // 재로드 시 에디터가 RTF 를 정규화해 다시 직렬화하므로 한글은 \uN 으로 인코딩됨 → ASCII 부분으로 판정
  const asciiMarker = marker.replace(/_가나다라$/, '')
  for (let i = 0; i < 16; i++) { await sleep(500); body2 = await ev(ws, s, `window.__scriv.bodyOf(${JSON.stringify(activeId)})`); if (typeof body2 === 'string' && body2.includes(asciiMarker)) break }
  if (!(typeof body2 === 'string' && body2.includes(asciiMarker))) console.log('  (디버그) 저장 전 projId=' + projId + ' lastProjectId=' + lastPid + ' → 재로드 후 state=' + JSON.stringify(await ev(ws, s, `window.__scriv.state()`)) + ' entries=' + JSON.stringify(await ev(ws, s, `window.__scriv.entries().map(e=>e.id.slice(0,8)+':'+e.title)`)) + ' usedId=' + activeId + ' body2=' + JSON.stringify(String(body2).slice(0, 120)) + ' idbNow=' + JSON.stringify(String(await ev(ws, s, `new Promise((res)=>{var o=indexedDB.open('sry',1);o.onsuccess=()=>{var db=o.result;var g=db.transaction('projects').objectStore('projects').get(${JSON.stringify(projId)});g.onsuccess=()=>{var r=g.result;var it=r&&r.items&&r.items[${JSON.stringify(activeId)}];res(it?String(it.bodyRtf).slice(0,120):'no-item:'+(r?Object.keys(r.items||{}).join(','):'no-rec'))};g.onerror=()=>res('err')};o.onerror=()=>res('open-err')})`))))
  ok(typeof body2 === 'string' && body2.includes(asciiMarker), '새로고침 후에도 본문 유지(영속 라운드트립 ✓)')
  ok(exceptions.length === 0, '예외 없음 (' + exceptions.slice(0, 3).join(' | ') + ')')

  // ---------- 2) 구조 복구: 고아 아이템이 로드 시 보존되는지 ----------
  console.log('\n[2] 구조 복구(고아 보존)')
  const sess2 = await newSession(ws); const s2 = sess2.s
  await rpc(ws, 'Page.navigate', { url: APP }, s2); await waitReady(ws, s2)
  // 고아 포함 프로젝트를 IDB 에 직접 기록(rootOrder 에 없고 부모도 없음)
  const corruptId = 'safetytest-orphan'
  const proj = {
    id: corruptId, title: '복구테스트', modified: Date.now(),
    items: {
      r1: { id: 'r1', type: 'folder', title: '루트', parentId: null, childIds: [], customMeta: {} },
      orphanX: { id: 'orphanX', type: 'text', title: '잃어버린 문서', parentId: null, childIds: [], bodyRtf: '{\\rtf1 ORPHAN_BODY}', customMeta: {} },
    },
    rootOrder: ['r1'], // orphanX 누락!
    settings: {},
  }
  const putRes = await ev(ws, s2, `new Promise((res)=>{var o=indexedDB.open('sry',1);o.onupgradeneeded=()=>{var db=o.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'})};o.onsuccess=()=>{var db=o.result;try{var tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(${JSON.stringify(proj)});tx.oncomplete=()=>{db.close();res('ok')};tx.onerror=()=>{db.close();res('err')}}catch(e){db.close();res('noStore')}};o.onerror=()=>res('openerr')})`)
  ok(putRes === 'ok', '고아 포함 프로젝트 IDB 기록 (' + putRes + ')')
  await ev(ws, s2, `localStorage.setItem('sry:lastProjectId', ${JSON.stringify(corruptId)})`)
  await rpc(ws, 'Page.navigate', { url: APP }, s2); await waitReady(ws, s2); await sleep(700)
  const st2 = await ev(ws, s2, `window.__scriv.state()`)
  ok(st2.id === corruptId, '복구테스트 프로젝트 로드됨')
  ok(st2.items === 2, '아이템 2개 모두 보존(소실 0)')
  ok(st2.root === 2, '고아가 루트로 승격되어 도달 가능(root=' + st2.root + ')')
  const ob = await ev(ws, s2, `window.__scriv.bodyOf('orphanX')`)
  ok(typeof ob === 'string' && ob.includes('ORPHAN_BODY'), '고아 문서 본문 보존')
  ok(sess2.exceptions.length === 0, '예외 없음 (' + sess2.exceptions.slice(0, 3).join(' | ') + ')')

  // ---------- 3) 손상/누락 레코드 무크래시 ----------
  console.log('\n[3] 손상·누락 레코드 무크래시')
  const sess3 = await newSession(ws); const s3 = sess3.s
  await rpc(ws, 'Page.navigate', { url: APP }, s3); await waitReady(ws, s3)
  // items/rootOrder 누락된 부실 레코드
  const badId = 'safetytest-malformed'
  await ev(ws, s3, `new Promise((res)=>{var o=indexedDB.open('sry',1);o.onupgradeneeded=()=>{var db=o.result;if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'})};o.onsuccess=()=>{var db=o.result;try{var tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({id:${JSON.stringify(badId)},title:'부실',modified:1});tx.oncomplete=()=>{db.close();res('ok')};tx.onerror=()=>{db.close();res('err')}}catch(e){db.close();res('noStore')}};o.onerror=()=>res('openerr')})`)
  await ev(ws, s3, `localStorage.setItem('sry:lastProjectId', ${JSON.stringify(badId)})`)
  await rpc(ws, 'Page.navigate', { url: APP }, s3); await waitReady(ws, s3); await sleep(600)
  const st3 = await ev(ws, s3, `window.__scriv.state()`)
  ok(!!st3 && typeof st3.items === 'number', '부실 레코드에도 앱 부팅·상태 조회 정상(무크래시)')
  ok(sess3.exceptions.length === 0, '예외 없음 (' + sess3.exceptions.slice(0, 3).join(' | ') + ')')
  // 존재하지 않는 lastProjectId + 백업 없음 → 크래시 없이 기본 프로젝트
  await ev(ws, s3, `localStorage.setItem('sry:lastProjectId','does-not-exist-xyz')`)
  await rpc(ws, 'Page.navigate', { url: APP }, s3); await waitReady(ws, s3); await sleep(500)
  const st3b = await ev(ws, s3, `window.__scriv.state()`)
  ok(!!st3b && typeof st3b.items === 'number', '없는 프로젝트 id 에도 무크래시(기본 프로젝트 유지)')

  // 정리: 테스트 IDB 삭제
  await ev(ws, s3, `new Promise(r=>{var q=indexedDB.deleteDatabase('sry');q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`)
  await ev(ws, s3, `localStorage.removeItem('sry:lastProjectId')`)

  console.log('\n=== 데이터 안전 E2E 결과: ' + PASS + ' 통과 / ' + FAIL + ' 실패 ===')
  ws.close()
  if (FAIL > 0) process.exit(1)
}
main().catch((e) => { console.log('SCRIPT ERR: ' + e.message); process.exit(1) })
