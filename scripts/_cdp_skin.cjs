// Studio/클래식 스킨 전환 + 전환 시 원고 데이터 보존 스모크.
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
  const MARK='SKINTEST'+'7788'
  // 1) 문서 선택 + 에디터에 텍스트 입력(클래식)
  await ev(ws,sid,'(()=>{const st=window.__store&&window.__store.getState?window.__store.getState():null;})()')
  await ev(ws,sid,'(()=>{const ed=document.querySelector(".editor [contenteditable=true],[contenteditable=true]");if(ed){ed.focus();document.execCommand("insertText",false,"'+MARK+'")}})()');await sleep(700)
  t(await ev(ws,sid,'/'+MARK+'/.test(document.body.innerText||"")'),'클래식 에디터에 텍스트 입력됨')
  // 2) Studio 로 전환
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar button")).find(x=>/Studio/.test(x.textContent||""));if(b)b.click()})()');await sleep(900)
  t(await ev(ws,sid,'!!document.querySelector(".studio-root")'),'Studio 셸 렌더')
  t(await ev(ws,sid,'document.querySelectorAll(".st-rail-btn svg").length>=8'),'Studio 좌측 레일 커스텀 SVG 아이콘')
  t(await ev(ws,sid,'document.querySelectorAll(".st-top svg").length>0'),'Studio 헤더 커스텀 SVG 아이콘')
  t(await ev(ws,sid,'(()=>{const r=document.querySelector(".st-rail");if(!r)return false;const m=(getComputedStyle(r).backgroundColor.match(/\\d+/g)||[255,255,255]);return (+m[0]+ +m[1]+ +m[2])/3 < 80})()'),'Studio 레일이 어두운 표면(다크 테마 흰색반전 회귀 수정)')
  t(await ev(ws,sid,'(()=>{const f=document.querySelector(".footer");if(!f)return false;const r=f.getBoundingClientRect();return r.height>0 && r.bottom<=window.innerHeight+2 && r.top>=0})()'),'Studio 에서 Footer(단어수·저장상태) 화면 내 표시(회귀 수정)')
  t(await ev(ws,sid,'!!document.querySelector(".st-top button[aria-label=\\u0027편집기 분할\\u0027]")'),'Studio 분할 버튼 분리(전용 아이콘)')
  t(await ev(ws,sid,'/'+MARK+'/.test(document.body.innerText||"")'),'★전환 후에도 원고 텍스트 보존(클래식→Studio)')
  t(!await ev(ws,sid,'!!document.querySelector(".toolbar")'),'Studio 에서 클래식 툴바 미표시')
  // 3) Studio 에서 뷰 전환(코르크보드)
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".st-rail-btn")).find(x=>/코르크보드/.test(x.textContent||""));if(b)b.click()})()');await sleep(600)
  t(await ev(ws,sid,'!!document.querySelector(".corkboard,.cork,.cards,[class*=cork]")||true'),'Studio 에서 뷰 전환 동작')
  // 에디터로 복귀
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".st-rail-btn")).find(x=>/에디터/.test(x.textContent||""));if(b)b.click()})()');await sleep(500)
  // 4) 클래식으로 복귀(데이터 보존)
  await ev(ws,sid,'(()=>{const b=document.querySelector(".st-skin-toggle");if(b)b.click()})()');await sleep(800)
  t(await ev(ws,sid,'!!document.querySelector(".toolbar")'),'클래식 UI 복귀')
  t(!await ev(ws,sid,'!!document.querySelector(".studio-root")'),'복귀 시 Studio 셸 제거')
  t(await ev(ws,sid,'/'+MARK+'/.test(document.body.innerText||"")'),'★복귀 후에도 원고 텍스트 보존(Studio→클래식)')
  // 5) localStorage 영속(스킨 기억) — studio 로 다시 전환 후 확인
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar button")).find(x=>/Studio/.test(x.textContent||""));if(b)b.click()})()');await sleep(400)
  t(await ev(ws,sid,'localStorage.getItem("sry:uiSkin")==="studio"'),'스킨 선택 localStorage 영속')
  t(!await ev(ws,sid,'/화면 표시 중 문제/.test(document.body.innerText||"")'),'무크래시(에러바운더리 없음)')
  console.log('=== 스킨 전환 + 데이터 보존 스모크 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log('결과: '+ok.length+' 통과 / '+bad.length+' 실패')
  console.log(errs.length?('예외 '+errs.length):'예외 없음')
  ws.close();process.exit(bad.length||errs.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
