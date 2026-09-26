// .sry 자체완결 왕복 검증 — 수집함(로컬 미디어 blob 포함)·공유 라이브러리가 export→clear→import 로 보존되는지.
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 25000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(async()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text); return r.result && r.result.value }
const blobSize = (key) => `return await new Promise((res)=>{const o=indexedDB.open('sry-blobs',1);o.onsuccess=()=>{const d=o.result;try{const g=d.transaction('blobs','readonly').objectStore('blobs').get('${key}');g.onsuccess=()=>{d.close();res(g.result?g.result.size:0)};g.onerror=()=>{d.close();res(-1)}}catch{res(-1)}};o.onerror=()=>res(-1)})`

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' }); const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(3500)
  await ev(ws, sid, `const b=Array.from(document.querySelectorAll('.modal button')).find(x=>/시작하기|다시 보지/.test(x.textContent||''));if(b)b.click();return 1`); await sleep(300)
  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)

  // seed: 라이브러리 + blob(sry-blobs) + 수집함(blobId 참조)
  const seed = await ev(ws, sid, `
    const id = window.__scriv.state().id;
    const LK='sry:shared-library:'+id, SK='sry:stash:items:'+id;
    localStorage.setItem(LK, JSON.stringify({characters:[{id:'c1',name:'홍길동',updated:1}],places:[],images:[],snippets:[]}));
    await new Promise((res,rej)=>{const o=indexedDB.open('sry-blobs',1);o.onupgradeneeded=()=>{const d=o.result;if(!d.objectStoreNames.contains('blobs'))d.createObjectStore('blobs')};o.onsuccess=()=>{const d=o.result;const tx=d.transaction('blobs','readwrite');tx.objectStore('blobs').put(new Blob([new Uint8Array([7,7,7,7,9])],{type:'image/png'}),'testblob_1');tx.oncomplete=()=>{d.close();res(1)};tx.onerror=()=>rej(tx.error)};o.onerror=()=>rej(o.error)});
    localStorage.setItem(SK, JSON.stringify([{id:'s1',kind:'image',x:10,y:10,label:'테스트이미지',blobId:'testblob_1',mime:'image/png'}]));
    return {id, LK, SK};
  `)
  t(!!seed.id, '시드 완료(' + (seed.id || '').slice(0, 8) + ')')

  // 1) export — fileMap 을 페이지 변수에 보관
  const built = await ev(ws, sid, `
    const fm = await window.__sryfmt.build(); window.__rt_fm = fm;
    return { hasLib: !!fm['library.json'], hasStash: !!fm['stash.json'], libHasChar: /홍길동/.test(fm['library.json']||''), stashHasMedia: /"media":"data:/.test(fm['stash.json']||'') };
  `)
  t(built.hasLib && built.libHasChar, 'export: library.json 에 인물(홍길동) 동봉')
  t(built.hasStash && built.stashHasMedia, 'export: stash.json 에 로컬 미디어(dataURL) 인라인')

  // 2) clear — 다른 기기처럼 라이브러리·수집함·blob 모두 제거
  await ev(ws, sid, `
    localStorage.removeItem('${seed.LK}'); localStorage.removeItem('${seed.SK}');
    await new Promise((res)=>{const o=indexedDB.open('sry-blobs',1);o.onsuccess=()=>{const d=o.result;const tx=d.transaction('blobs','readwrite');tx.objectStore('blobs').delete('testblob_1');tx.oncomplete=()=>{d.close();res(1)};tx.onerror=()=>{d.close();res(1)}};o.onerror=()=>res(1)});
    return 1;
  `)
  const clearedBlob = await ev(ws, sid, blobSize('testblob_1'))
  t(await ev(ws, sid, `return localStorage.getItem('${seed.LK}')===null`) && clearedBlob === 0, 'clear: 라이브러리·수집함·blob 제거 확인')

  // 3a) read() 만 호출(=전환 취소 시나리오) — 순수 파싱이라 라이브러리·수집함·blob 을 건드리면 안 됨
  await ev(ws, sid, `await window.__sryfmt.read(window.__rt_fm); return 1`); await sleep(150)
  t(await ev(ws, sid, `return localStorage.getItem('${seed.LK}')===null`) && await ev(ws, sid, `return localStorage.getItem('${seed.SK}')===null`) && await ev(ws, sid, blobSize('testblob_1')) === 0, '취소 안전: read()는 라이브러리·수집함·blob 을 건드리지 않음')

  // 3b) apply() — 전환 확정 후 사이드카 복원
  await ev(ws, sid, `const id = window.__scriv.state().id; await window.__sryfmt.apply(window.__rt_fm, id); return 1`); await sleep(300)
  t(await ev(ws, sid, `const r=localStorage.getItem('${seed.LK}'); return !!r && /홍길동/.test(r)`), 'import: 라이브러리 복원(홍길동)')
  const stashR = await ev(ws, sid, `const r=localStorage.getItem('${seed.SK}'); return r||''`)
  t(/s1/.test(stashR) && !/"media":/.test(stashR), 'import: 수집함 복원(항목 보존·media 제거)')
  t(await ev(ws, sid, blobSize('testblob_1')) > 0, 'import: 로컬 미디어 blob 복원(sry-blobs)')

  console.log('=== .sry 자체완결 왕복 ===')
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
