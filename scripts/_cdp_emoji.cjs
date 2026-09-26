// 이모지 → Twemoji <img> 치환 + 편집기 보존(데이터 안전) 검증.
const HUB = 'http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text);return r.result&&r.result.value}
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  const errs=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId!==sid)return;if(d.method==='Runtime.exceptionThrown')errs.push(1)})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  // 비편집 크롬 영역에 이모지 주입 → 파서가 <img> 로 자동 치환하는지
  await ev(ws,sid,'(()=>{const d=document.createElement("div");d.id="emjtest";d.textContent="테스트"+String.fromCodePoint(0x1F525)+String.fromCodePoint(0x1F3B2)+"끝";document.body.appendChild(d)})()');await sleep(400)
  const imgs=await ev(ws,sid,'document.querySelectorAll("#emjtest img.emoji").length')
  t(imgs===2,'주입한 이모지가 Twemoji <img>로 치환됨('+imgs+'/2)')
  t(await ev(ws,sid,'Array.from(document.querySelectorAll("#emjtest img.emoji")).every(i=>/\\/emoji\\/.+\\.svg$/.test(i.getAttribute("src")||""))'),'img.emoji src 가 로컬 /emoji/*.svg')
  t(await ev(ws,sid,'(()=>{const i=document.querySelector("#emjtest img.emoji");return !!(i&&i.complete&&i.naturalWidth>0)})()'),'이모지 SVG 실제 로드(naturalWidth>0)')
  t(await ev(ws,sid,'(document.querySelector("#emjtest").textContent||"").includes("테스트")&&(document.querySelector("#emjtest img.emoji").alt)==String.fromCodePoint(0x1F525)'),'주변 텍스트 보존 + alt 원문 유지(정보 손실 0)')
  // 도구창 내부에 OS 기본 이모지 텍스트가 남아있지 않은지(헤더/라벨)
  t(await ev(ws,sid,'(()=>{const w=document.querySelector(".toolwin");if(!w)return true;const walk=document.createTreeWalker(w,NodeFilter.SHOW_TEXT);let n,cnt=0;const re=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;while(n=walk.nextNode()){const p=n.parentElement;if(p&&p.closest("[contenteditable],textarea,input"))continue;if(re.test(n.nodeValue||""))cnt++}return cnt===0})()'),'도구창 텍스트에 OS 이모지 잔존 없음(편집/입력 제외)')
  await ev(ws,sid,'window.__closeTool&&window.__closeTool("action-world-builder")');await sleep(300)
  // 편집기 데이터 안전
  await ev(ws,sid,'(()=>{const ed=document.querySelector("[contenteditable=true]");if(ed){ed.focus();document.execCommand("insertText",false,"불꽃X끝".replace("X",String.fromCodePoint(0x1F525)))}})()');await sleep(600)
  t(await ev(ws,sid,'(()=>{const ed=document.querySelector("[contenteditable=true]");if(!ed)return false;return /\\u{1F525}/u.test(ed.textContent||"")&&ed.querySelectorAll("img.emoji").length===0})()'),'편집기 이모지는 텍스트로 보존(img 변환 안 함=데이터 안전)')
  t(errs.length===0,'런타임 예외 없음('+errs.length+')')
  console.log('=== 이모지 시스템 스모크 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log(ok.length+' 통과 / '+bad.length+' 실패')
  ws.close();process.exit(bad.length||errs.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
