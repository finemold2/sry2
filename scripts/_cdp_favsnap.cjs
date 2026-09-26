// 즐겨찾기 + 스냅샷 안내 모달 스모크.
const HUB = 'http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text);return r.result&&r.result.value}
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  const errs=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId!==sid)return;if(d.method==='Runtime.exceptionThrown')errs.push('EX')})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  // 즐겨찾기: scene-forge ★
  await ev(ws,sid,'window.__openTool&&window.__openTool("scene-forge")');await sleep(900)
  await ev(ws,sid,'(()=>{const b=document.querySelector(".toolwin-head button[aria-label=\\u0027즐겨찾기\\u0027]");if(b)b.click()})()');await sleep(300)
  t(await ev(ws,sid,'JSON.parse(localStorage.getItem("scrivweb:favorites")||"[]").length>0'),'★ 클릭 시 즐겨찾기 저장')
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".insp-tabs button")).find(x=>/즐겨찾기/.test(x.textContent||""));if(b)b.click()})()');await sleep(400)
  t(await ev(ws,sid,'/장면|scene/i.test((document.querySelector(".inspector")||{}).innerText||"")'),'즐겨찾기 탭에 항목 표시')
  // 즐겨찾기 실행
  await ev(ws,sid,'window.__closeTool&&window.__closeTool("scene-forge")');await sleep(300)
  await ev(ws,sid,'(()=>{const b=document.querySelector(".inspector [title=열기]")||Array.from(document.querySelectorAll(".inspector button")).find(x=>/장면|scene/i.test(x.textContent||""));if(b)b.click()})()');await sleep(700)
  t(await ev(ws,sid,'Array.from(document.querySelectorAll(".toolwin")).some(w=>/장면/.test(w.textContent||""))'),'즐겨찾기 클릭으로 도구 다시 열림')
  // 스냅샷 안내 모달
  await ev(ws,sid,'document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true}))');await sleep(500)
  await ev(ws,sid,'(()=>{const inp=document.querySelector(".cmd-input");if(inp){inp.value="스냅샷";inp.dispatchEvent(new Event("input",{bubbles:true}))}})()');await sleep(400)
  await ev(ws,sid,'(()=>{const it=Array.from(document.querySelectorAll(".cmd-item-main")).find(x=>/스냅샷 찍기/.test(x.textContent||""));if(it)it.click()})()');await sleep(500)
  const modalTxt=await ev(ws,sid,'(document.querySelector(".modal")||{}).textContent||""')
  t(/스냅샷이란|지금 스냅샷 찍기/.test(modalTxt),'스냅샷 안내 모달(설명형) 표시')
  t(/오류가 아니라|쓰는 법/.test(modalTxt),'스냅샷 모달이 왜 뜨는지·사용법 설명 포함')
  // 지금 스냅샷 찍기
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".modal button")).find(x=>/지금 스냅샷 찍기/.test(x.textContent||""));if(b)b.click()})()');await sleep(500)
  const crash=await ev(ws,sid,'/화면 표시 중 문제/.test(document.body.innerText||"")')
  t(!crash,'스냅샷 찍기 후 무크래시')
  console.log('=== 즐겨찾기+스냅샷 스모크 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log('결과: '+ok.length+' 통과 / '+bad.length+' 실패')
  console.log(errs.length?('예외 '+errs.length):'예외 없음')
  ws.close();process.exit(bad.length||errs.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
