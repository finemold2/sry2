// 특정 도구 2개가 충분한 대기 후 실제 콘텐츠를 렌더하는지 확인.
const APP='http://localhost:4178/',HUB='http://localhost:9222'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _i=0
function rpc(ws,m,p,s){return new Promise((res,rej)=>{const id=++_i,msg={id,method:m,params:p||{}};if(s)msg.sessionId=s;const f=(e)=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',f);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',f);ws.send(JSON.stringify(msg));setTimeout(()=>{ws.removeEventListener('message',f);rej(new Error('to '+m))},30000)})}
async function ev(ws,s,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},s);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value}
async function main(){
  const ws=new WebSocket(await bws());await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j)})
  const {targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'})
  const {sessionId:s}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  await rpc(ws,'Runtime.enable',{},s);await rpc(ws,'Page.enable',{},s)
  await rpc(ws,'Emulation.setDeviceMetricsOverride',{width:1680,height:1000,deviceScaleFactor:1,mobile:false},s)
  await rpc(ws,'Page.navigate',{url:APP},s)
  for(let i=0;i<40;i++){await sleep(500);try{if((await ev(ws,s,'typeof window.__openTool'))==='function')break}catch{}}
  await sleep(700)
  for(const id of ['dnd-monster','met-museum-art','poke-creature','star-wars-char','translate-panel','read-aloud-tts','dictation-stt']){
    await ev(ws,s,`window.__openTool(${JSON.stringify(id)})`)
    await sleep(5000)
    const info=await ev(ws,s,`(function(){var w=document.querySelectorAll('.toolwin');var last=w[w.length-1];var t=(last.innerText||'').replace(/\\s+/g,' ').trim();return t.slice(0,140)})()`)
    console.log('['+id+'] '+info)
    await ev(ws,s,`window.__closeTool(${JSON.stringify(id)})`); await sleep(300)
  }
  ws.close()
}
main().catch(e=>{console.log('ERR '+e.message);process.exit(1)})
