// 마이그레이션 데이터 보존 검증 — 옛 IndexedDB('scrivener-web') 프로젝트 + 옛 localStorage('scrivweb:*')가
// 새 식별자(sry / sry:*)로 손실 없이 이전되는지 실제로 확인.
const HUB='http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:'(async()=>{'+x+'})()',returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text);return r.result&&r.result.value}
function idbPut(db,store,val,key){return `await new Promise((res,rej)=>{const o=indexedDB.open(${JSON.stringify(db)},1);o.onupgradeneeded=()=>{const d=o.result;if(!d.objectStoreNames.contains(${JSON.stringify(store)}))d.createObjectStore(${JSON.stringify(store)},{keyPath:'id'})};o.onsuccess=()=>{const d=o.result;const tx=d.transaction(${JSON.stringify(store)},'readwrite');tx.objectStore(${JSON.stringify(store)}).put(${val}${key?','+key:''});tx.oncomplete=()=>{d.close();res(1)};tx.onerror=()=>rej(tx.error)};o.onerror=()=>rej(o.error)});`}
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  await rpc(ws,'Runtime.enable',{},sid)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  // 1) 앱을 한 번 띄워 출처(origin) 확보 후, 옛 데이터 심기 (아직 sry 로 마이그레이션 안 된 상태로 위장)
  await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3000)
  // 옛 IndexedDB 프로젝트 심기
  const proj = `{id:'mig-test-1',title:'옛프로젝트_MIG',modified:123456,items:{},rootOrder:[],snapshots:{},settings:{theme:'dark'}}`
  await ev(ws,sid, idbPut('scrivener-web','projects',proj))
  // 옛 localStorage 키 심기 + 마이그레이션 플래그 제거(마치 업데이트 직후처럼)
  await ev(ws,sid,`localStorage.setItem('scrivweb:migtest','보존값123');localStorage.setItem('scrivener-web:lastProjectId','mig-test-1');localStorage.removeItem('sry:ls-migrated');localStorage.removeItem('sry:idb-migrated');localStorage.removeItem('sry:lastProjectId');return 1`) // 업데이트 전 상태에는 sry:lastProjectId 가 없다(#34: 첫 실행 기본 프로젝트도 즉시 기록되므로 제거해야 위장이 성립)
  // 새 sry DB 는 비워둔다(마이그레이션 트리거 조건). 이미 만들어졌을 수 있으니 삭제.
  await ev(ws,sid,`await new Promise(r=>{const q=indexedDB.deleteDatabase('sry');q.onsuccess=()=>r(1);q.onerror=()=>r(1);q.onblocked=()=>r(1)});return 1`)
  // 2) 리로드 → 부팅 시 마이그레이션 실행
  await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  // 3) 검증: localStorage 이전
  const ls = await ev(ws,sid,`return localStorage.getItem('sry:migtest')`)
  t(ls==='보존값123','localStorage 옛키(scrivweb:)→sry: 복사됨')
  const lp = await ev(ws,sid,`return localStorage.getItem('sry:lastProjectId')`)
  t(lp==='mig-test-1','lastProjectId 이전됨')
  // 4) 검증: 새 sry IndexedDB 에 옛 프로젝트가 복사됨
  const got = await ev(ws,sid,`return await new Promise((res)=>{const o=indexedDB.open('sry',1);o.onsuccess=()=>{const d=o.result;try{const tx=d.transaction('projects','readonly');const g=tx.objectStore('projects').get('mig-test-1');g.onsuccess=()=>{d.close();res(g.result?g.result.title:null)};g.onerror=()=>{d.close();res(null)}}catch(e){res('ERR:'+e.message)}};o.onerror=()=>res(null)})`)
  t(got==='옛프로젝트_MIG','IndexedDB 옛 프로젝트(scrivener-web)→sry 복사됨 (원고 보존)')
  // 5) 옛 DB 는 보존(삭제 안 함)
  const oldKept = await ev(ws,sid,`return await new Promise((res)=>{const o=indexedDB.open('scrivener-web',1);o.onsuccess=()=>{const d=o.result;try{const g=d.transaction('projects','readonly').objectStore('projects').get('mig-test-1');g.onsuccess=()=>{d.close();res(!!g.result)};g.onerror=()=>{d.close();res(false)}}catch{res(false)}};o.onerror=()=>res(false)})`)
  t(oldKept===true,'옛 DB 는 삭제하지 않고 보존(복구 안전)')
  console.log('=== sry 마이그레이션 데이터-안전 검증 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log('결과: '+ok.length+' 통과 / '+bad.length+' 실패')
  ws.close();process.exit(bad.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
