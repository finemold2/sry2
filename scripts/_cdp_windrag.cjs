// 도구 창을 헤더로 끌어 '즐겨찾기 패널'에 놓으면 즐겨찾기 추가 + 창 최소화 되는지 검증.
const HUB = 'http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text);return r.result&&r.result.value}
async function mouse(ws,sid,type,x,y,extra){await rpc(ws,'Input.dispatchMouseEvent',Object.assign({type,x:Math.round(x),y:Math.round(y),button:'left',clickCount:1},extra||{}),sid)}
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  const errs=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId!==sid)return;if(d.method==='Runtime.exceptionThrown')errs.push('EX')})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Emulation.setDeviceMetricsOverride',{width:1680,height:1000,deviceScaleFactor:1,mobile:false},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  // 환영/투어 모달을 닫아야 포인터 드래그가 창 헤더에 닿는다
  await ev(ws,sid,'(()=>{const b=[...document.querySelectorAll(".modal button,.tour-skip")].find(x=>/시작하기|다시 보지|그만 보기/.test(x.textContent||""));if(b)b.click();return 1})()');await sleep(400)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  // 즐겨찾기 비우고 시작
  await ev(ws,sid,'localStorage.setItem("sry:favorites","[]")')
  // 인스펙터 즐겨찾기 탭 열기(데이터 드롭존 존재) + 도구 열기
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".insp-tabs button")).find(x=>/즐겨찾기/.test(x.textContent||""));if(b)b.click()})()')
  await ev(ws,sid,'window.__openTool&&window.__openTool("scene-forge")');await sleep(900)
  t(await ev(ws,sid,'!!document.querySelector("[data-fav-drop]")'),'즐겨찾기 패널 드롭존 존재')
  // 헤더 좌측 지점 + 드롭존 중앙 좌표
  const hp=await ev(ws,sid,'(()=>{const h=document.querySelector(".toolwin-head");if(!h)return null;const r=h.getBoundingClientRect();return {x:r.left+18,y:r.top+r.height/2}})()')
  const zp=await ev(ws,sid,'(()=>{const z=document.querySelector("[data-fav-drop]");if(!z)return null;const r=z.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+Math.min(40,r.height/2)}})()')
  if(!hp||!zp){console.log('좌표 획득 실패',hp,zp);ws.close();process.exit(2)}
  // 드래그: press(헤더) → move 여러 단계 → release(드롭존)
  await mouse(ws,sid,'mousePressed',hp.x,hp.y);await sleep(80)
  for(let i=1;i<=6;i++){const x=hp.x+(zp.x-hp.x)*i/6,y=hp.y+(zp.y-hp.y)*i/6;await mouse(ws,sid,'mouseMoved',x,y,{button:'none',buttons:1});await sleep(50)}
  t(await ev(ws,sid,'!!document.querySelector(".fav-drop-zone.fav-drop-active")'),'드래그 중 즐겨찾기 패널 강조(드롭존 활성)')
  await mouse(ws,sid,'mouseReleased',zp.x,zp.y);await sleep(500)
  // 결과: 즐겨찾기에 추가됨 + 창 최소화(독 칩)
  t(await ev(ws,sid,'JSON.parse(localStorage.getItem("sry:favorites")||"[]").some(f=>f.id==="tool:scene-forge")'),'창 드롭 → 즐겨찾기에 추가됨')
  t(await ev(ws,sid,'Array.from(document.querySelectorAll(".tool-dock-chip")).some(c=>/장면/.test(c.textContent||""))'),'드롭한 창이 최소화(하단 독)됨')
  t(await ev(ws,sid,'!document.querySelector(".fav-drop-zone.fav-drop-active")'),'드롭 후 강조 해제')
  t(!await ev(ws,sid,'/화면 표시 중 문제/.test(document.body.innerText||"")'),'무크래시')
  console.log('=== 창 드래그→즐겨찾기 스모크 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log('결과: '+ok.length+' 통과 / '+bad.length+' 실패')
  console.log(errs.length?('예외 '+errs.length):'예외 없음')
  ws.close();process.exit(bad.length||errs.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
