// 신규 50개 도구를 하나씩 열어 무크래시 렌더 + 본문 콘텐츠 존재 검증.
const HUB='http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result&&r.result.value}
const IDS=['character-gravity','narrative-heartbeat','foreshadow-ledger','dialogue-fingerprint','scene-weather','world-physics-sandbox','attention-simulator','timeline-paradox','conlang-forge','relationship-thermo','plot-wind-tunnel','character-shadow','sensory-mixer','theme-xray','micro-tension-meter','povswap-simulator','story-dna-sequencer','emotion-choreographer','subtext-decoder','world-economy-sim','character-aging','scene-card-shuffler','metaphor-engine','reader-persona-lab','tension-orchestra','character-want-need','world-calendar-forge','prose-painter','conflict-reactor','memory-palace','dialogue-tennis','ending-forecast','character-soundtrack','world-fault-lines','scene-entry-exit','narrative-distance-dial','lie-truth-engine','myth-weaver','pacing-gearbox','emotional-color-grade','voice-evolution','plot-hole-radar','story-tarot','world-language-map','reader-emotion-curve','mask-engine','narrative-compression','world-disaster-sim','theme-debate-chamber','story-constellation']
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  const exc=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId!==sid)return;if(d.method==='Runtime.exceptionThrown')exc.push(1)})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  const bad=[],empty=[];let okc=0
  for(const id of IDS){
    await ev(ws,sid,'window.__openTool&&window.__openTool("'+id+'")');await sleep(550)
    const crash=await ev(ws,sid,'/화면 표시 중 문제/.test(document.body.innerText||"")')
    const win=await ev(ws,sid,'(()=>{const ws=[...document.querySelectorAll(".toolwin")];const w=ws[ws.length-1];if(!w)return null;return {txt:(w.innerText||"").length}})()')
    if(crash){bad.push(id);await ev(ws,sid,'location.reload()');await sleep(2500)}
    else { okc++; if(!win||win.txt<40) empty.push(id) }
    await ev(ws,sid,'window.__closeTool&&window.__closeTool("'+id+'")');await sleep(150)
  }
  console.log('=== 신규 50개 도구 렌더 ===')
  console.log('정상 렌더: '+okc+'/'+IDS.length)
  if(bad.length) console.log('크래시: '+bad.join(', '))
  if(empty.length) console.log('내용 빈약(의심): '+empty.join(', '))
  console.log('전역 예외 수: '+exc.length)
  ws.close();process.exit(bad.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
