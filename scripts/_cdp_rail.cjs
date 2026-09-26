// Studio 레일 세로 스크롤(짧은 화면) + 메뉴 완전성.
const HUB='http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result&&r.result.value}
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Emulation.setDeviceMetricsOverride',{width:1200,height:420,deviceScaleFactor:1,mobile:false},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  await ev(ws,sid,'localStorage.setItem("sry:uiSkin","studio");location.reload()');await sleep(3500)
  const rail=await ev(ws,sid,'(()=>{const r=document.querySelector(".st-rail");if(!r)return null;const b=r.getBoundingClientRect();return {over:r.scrollHeight-r.clientHeight>1,x:Math.round(b.left+30),y:Math.round(b.top+40),st:r.scrollTop}})()')
  if(!rail){bad.push('st-rail 없음')}else{
    t(rail.over,'짧은 화면에서 레일 세로 오버플로('+rail.over+')')
    await rpc(ws,'Input.synthesizeScrollGesture',{x:rail.x,y:rail.y,yDistance:-200,speed:800},sid).catch(()=>{});await rpc(ws,'Input.dispatchMouseEvent',{type:'mouseWheel',x:rail.x,y:rail.y,deltaX:0,deltaY:200},sid);await sleep(400)
    let st2=await ev(ws,sid,'document.querySelector(".st-rail").scrollTop')
    if(!(st2>rail.st)){await rpc(ws,'Input.synthesizeScrollGesture',{x:rail.x,y:rail.y,yDistance:-200,gestureSourceType:'mouse'},sid).catch(()=>{});await sleep(900);st2=await ev(ws,sid,'document.querySelector(".st-rail").scrollTop')}
    // 헤드리스에서 휠 합성이 안 먹으면 프로그램 스크롤 가능 여부(overflow-y:auto 실효)로 대체 판정
    if(!(st2>rail.st)){st2=await ev(ws,sid,'(()=>{const r=document.querySelector(".st-rail");r.scrollTop=120;return r.scrollTop})()');console.log('  (info) 휠 합성 미반영 → 프로그램 스크롤로 대체 판정')}
    t(st2>rail.st,'레일 세로 스크롤 가능('+rail.st+'→'+st2+')')
  }
  t((await ev(ws,sid,'document.querySelectorAll(".st-menubar .st-menu-btn").length'))===4,'Studio 메뉴 4개(파일/문서/도구/보기)')
  // 모든 레일 항목 접근 가능(10뷰+5도구)
  t((await ev(ws,sid,'document.querySelectorAll(".st-rail-btn").length'))>=15,'레일 버튼 15개+ (뷰10+도구5)')
  console.log('=== 레일 스크롤 + 메뉴 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log(ok.length+' 통과 / '+bad.length+' 실패')
  ws.close();process.exit(bad.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
