// 수집함(Stash) E2E: 아이콘 표시 → 열기 → 메모 추가 → 영속(새로고침) → 제거. 예외 0.
const HUB='http://localhost:9222',APP='http://localhost:4178/'
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let _i=0
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
function rpc(ws,m,p,s){return new Promise((res,rej)=>{const id=++_i,msg={id,method:m,params:p||{}};if(s)msg.sessionId=s;const f=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',f);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',f);ws.send(JSON.stringify(msg));setTimeout(()=>{ws.removeEventListener('message',f);rej(new Error('to'))},20000)})}
async function ev(ws,s,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},s);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value}
let P=0,F=0;const ok=(c,m)=>{if(c){P++;console.log('  ✓ '+m)}else{F++;console.log('  ✗ FAIL: '+m)}}
const click=(sel,txt)=>`(function(){var els=[].slice.call(document.querySelectorAll(${JSON.stringify(sel)}));var b=${txt?`els.find(x=>(x.innerText||'').includes(${JSON.stringify(txt)}))`:'els[0]'};if(!b)return 'no';b.click();return 'ok'})()`
;(async()=>{const ws=new WebSocket(await bws());await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j)})
const {targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const {sessionId:s}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
const exc=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId===s&&d.method==='Runtime.exceptionThrown')exc.push((d.params.exceptionDetails.text||'').split('\n')[0])})
await rpc(ws,'Runtime.enable',{},s);await rpc(ws,'Page.enable',{},s)
await rpc(ws,'Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false},s)
await rpc(ws,'Page.navigate',{url:APP},s)
for(let i=0;i<40;i++){await sleep(400);try{if((await ev(ws,s,'typeof window.__openTool'))==='function')break}catch{}}
await sleep(500)
// 깨끗한 상태
await ev(ws,s,`Object.keys(localStorage).filter(k=>k.indexOf('sry:stash')===0).forEach(k=>localStorage.removeItem(k))`)
await rpc(ws,'Page.navigate',{url:APP},s);await sleep(1500)
ok(await ev(ws,s,`!!document.querySelector('.stash-icon')`),'플로팅 수집함 아이콘 표시')
ok(await ev(ws,s,click('.stash-icon'))==='ok','아이콘 클릭')
await sleep(400)
ok(await ev(ws,s,`!!document.querySelector('.stash-win')`),'수집함 창 열림')
ok(await ev(ws,s,click('.stash-head button','메모'))==='ok','➕메모 클릭')
await sleep(300)
// 메모 텍스트 입력 후 blur
await ev(ws,s,`(function(){var t=document.querySelector('.stash-memo-edit');if(t){t.value='갑자기 떠오른 아이디어';t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));t.blur();}return 1})()`);await sleep(300)
const cnt1=await ev(ws,s,`document.querySelectorAll('.stash-item').length`)
ok(cnt1>=1,'메모 항목 추가됨('+cnt1+')')
// 영속: 새로고침 후에도 유지(저장 반영 여유를 두고 재로드)
await sleep(800)
console.log('  (디버그) 저장 키: '+await ev(ws,s,`Object.keys(localStorage).filter(k=>k.indexOf('sry:stash:items')===0).map(k=>k+'='+(localStorage.getItem(k)||'').length).join(', ')`)+' / projId='+await ev(ws,s,`window.__scriv.state().id`))
await rpc(ws,'Page.navigate',{url:APP},s);await sleep(1600)
console.log('  (디버그) 재로드 projId='+await ev(ws,s,`window.__scriv.state().id`))
ok((await ev(ws,s,`document.querySelector('.stash-badge')?document.querySelector('.stash-badge').innerText:'0'`))!=='0','새로고침 후 배지 유지(영속)')
await ev(ws,s,click('.stash-icon'));await sleep(400)
const cnt2=await ev(ws,s,`document.querySelectorAll('.stash-item').length`)
ok(cnt2>=1,'새로고침 후 항목 유지('+cnt2+')')
// 제거(× 버튼) — 원본 영향 없음(메모라 원본 없음; 링크 제거 동작 확인)
await ev(ws,s,`(function(){var x=document.querySelector('.stash-item .stash-item-x');if(x)x.click();return 1})()`);await sleep(300)
const cnt3=await ev(ws,s,`document.querySelectorAll('.stash-item').length`)
ok(cnt3===cnt2-1,'× 제거 시 항목만 빠짐('+cnt2+'→'+cnt3+')')
ok(exc.length===0,'예외 없음 ('+exc.slice(0,2).join(' | ')+')')
// 정리
await ev(ws,s,`Object.keys(localStorage).filter(k=>k.indexOf('sry:stash')===0).forEach(k=>localStorage.removeItem(k))`)
console.log('\n=== 수집함 E2E: '+P+' 통과 / '+F+' 실패 ===')
ws.close();if(F>0)process.exit(1)})().catch(e=>{console.log('SCRIPT ERR '+e.message);process.exit(1)})
