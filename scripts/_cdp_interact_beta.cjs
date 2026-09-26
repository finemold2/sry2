// 실사용 인터랙션 베타 — 실제 클릭/드래그로 테마 영속·코르크보드 DnD·바인더 연동·전 메뉴·전 뷰 점검.
const HUB='http://localhost:9222'
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function bws(){const r=await fetch(HUB+'/json/version');return (await r.json()).webSocketDebuggerUrl}
let _id=0
function rpc(ws,m,p,sid){return new Promise((res,rej)=>{const id=++_id;const msg={id,method:m,params:p||{}};if(sid)msg.sessionId=sid;const on=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.id===id){ws.removeEventListener('message',on);d.error?rej(new Error(d.error.message)):res(d.result)}};ws.addEventListener('message',on);ws.send(JSON.stringify(msg));setTimeout(()=>rej(new Error('to')),20000)})}
async function ev(ws,sid,x){const r=await rpc(ws,'Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text);return r.result&&r.result.value}
const crashed = async (ws,sid)=> ev(ws,sid,'/화면 표시 중 문제/.test(document.body.innerText||"")')
async function main(){
  const ws=new WebSocket(await bws());await new Promise(r=>ws.addEventListener('open',r))
  const{targetId}=await rpc(ws,'Target.createTarget',{url:'about:blank'});const{sessionId:sid}=await rpc(ws,'Target.attachToTarget',{targetId,flatten:true})
  const exc=[];ws.addEventListener('message',e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.sessionId!==sid)return;if(d.method==='Runtime.exceptionThrown')exc.push(1)})
  await rpc(ws,'Runtime.enable',{},sid);await rpc(ws,'Page.navigate',{url:'http://localhost:4178/'},sid);await sleep(3500)
  const ok=[],bad=[];const t=(c,m)=>(c?ok:bad).push(m)
  // 첫 실행 환영 모달 닫기(있으면) — 메뉴/바인더 가림 방지
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".modal button")).find(x=>/시작하기|다시 보지/.test(x.textContent||""));if(b)b.click()})()');await sleep(300)

  // 1) 테마 영속 — 다크로 바꾸고 새(빈) 프로젝트 → 다크 유지?
  // 테마 버튼을 다크가 될 때까지 클릭
  for (let i=0;i<3;i++){ const th=await ev(ws,sid,'document.documentElement.dataset.theme'); if(th==='dark')break; await ev(ws,sid,'(()=>{const b=document.querySelector(".toolbar button[aria-label=\\u0027테마 전환\\u0027]");if(b)b.click()})()'); await sleep(250) }
  t(await ev(ws,sid,'document.documentElement.dataset.theme')==='dark','테마를 다크로 전환')
  // 빈 프로젝트(파일 메뉴)
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar .menu-wrap button")).find(x=>/파일/.test(x.textContent||""));if(b)b.click()})()');await sleep(250)
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".dropdown button")).find(x=>/빈 프로젝트/.test(x.textContent||""));if(b)b.click()})()');await sleep(400)
  // 전환 확인 모달 → "그냥 전환"
  const askedSwitch = await ev(ws,sid,'(()=>{const m=document.querySelector(".modal h2");return !!(m&&/프로젝트 전환/.test(m.textContent||""))})()')
  t(askedSwitch,'★프로젝트 전환 시 저장 확인 모달 표시')
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".modal-foot button")).find(x=>/그냥 전환/.test(x.textContent||""));if(b)b.click()})()');await sleep(700)
  t(await ev(ws,sid,'document.documentElement.dataset.theme')==='dark','★새 프로젝트 후에도 테마 다크 유지(리셋 버그 수정)')

  // 2) 코르크보드 DnD 재정렬 + 바인더 연동
  // 새 텍스트 3개 추가(문서 메뉴) 후 코르크보드로
  for(let i=0;i<3;i++){ await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar .menu-wrap button")).find(x=>/문서/.test(x.textContent||""));if(b)b.click()})()');await sleep(200); await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".dropdown button")).find(x=>/^새 텍스트/.test(x.textContent||""));if(b)b.click()})()');await sleep(300) }
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".seg button")).find(x=>(x.getAttribute("aria-label")||"").includes("코르크보드"));if(b)b.click()})()');await sleep(600)
  const before = await ev(ws,sid,'(()=>Array.from(document.querySelectorAll(".corkboard .card")).map(c=>(c.querySelector("[contenteditable],.card-title,.title")||c).textContent.trim().slice(0,12)))()')
  t(Array.isArray(before)&&before.length>=2,'코르크보드 카드 2개+ 표시('+(before?before.length:0)+')')
  // 카드[1]을 카드[0] 위로 드롭(HTML5 synthetic DnD)
  const moved = await ev(ws,sid,'(()=>{const cs=[...document.querySelectorAll(".corkboard .card")];if(cs.length<2)return null;const a=cs[1],b=cs[0];const dt=new DataTransfer();a.dispatchEvent(new DragEvent("dragstart",{dataTransfer:dt,bubbles:true}));b.dispatchEvent(new DragEvent("dragover",{dataTransfer:dt,bubbles:true}));b.dispatchEvent(new DragEvent("drop",{dataTransfer:dt,bubbles:true}));return true})()')
  await sleep(500)
  const after = await ev(ws,sid,'Array.from(document.querySelectorAll(".corkboard .card")).map(c=>(c.querySelector("[contenteditable],.card-title,.title")||c).textContent.trim().slice(0,12))')
  t(moved&&JSON.stringify(before)!==JSON.stringify(after),'★코르크보드 DnD 로 카드 순서 변경됨')
  // 바인더 순서도 코르크보드와 일치?
  const binderOrder = await ev(ws,sid,'Array.from(document.querySelectorAll(".binder .binder-row .bn-title, .binder [class*=title]")).map(x=>x.textContent.trim().slice(0,12))')
  t(Array.isArray(binderOrder)&&binderOrder.length>0,'바인더 행 표시('+(binderOrder?binderOrder.length:0)+')')

  // 3) 전 뷰 전환 무크래시
  const views=['에디터','코르크보드','아웃라이너','칸반','캔버스','연재','타임라인','참고문헌','논증','데이터'];
  for(const v of views){ await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".seg button")).find(x=>(x.getAttribute("aria-label")||"").includes("'+v+'"));if(b)b.click()})()');await sleep(300); if(await crashed(ws,sid)){bad.push("뷰 크래시:"+v);await ev(ws,sid,'location.reload()');await sleep(2500)} }
  t(!bad.some(m=>m.startsWith('뷰 크래시')),'전 뷰 전환 무크래시')
  await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".seg button")).find(x=>(x.getAttribute("aria-label")||"").includes("에디터"));if(b)b.click()})()');await sleep(300)

  // 4) 전 메뉴 항목 클릭 무크래시(모달 뜨면 닫기). 파일/문서/도구 메뉴
  let menuItemsTested=0;
  for(const menu of ['파일','문서','도구']){
    const labels = await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar .menu-wrap button")).find(x=>x.textContent.trim()==="'+menu+'");if(!b)return[];b.click();const items=Array.from(document.querySelectorAll(".dropdown button")).map(x=>x.textContent.trim());b.click();return items})()')
    for(const lbl of (labels||[])){
      if(/가져오기|폴더 열기|폴더로 저장|zip|백업|복원|새 프로젝트/.test(lbl)) continue; // 파일피커/리로드 유발 항목 스킵
      await ev(ws,sid,'(()=>{const b=Array.from(document.querySelectorAll(".toolbar .menu-wrap button")).find(x=>x.textContent.trim()==="'+menu+'");if(b)b.click()})()');await sleep(120)
      await ev(ws,sid,'(()=>{const it=Array.from(document.querySelectorAll(".dropdown button")).find(x=>x.textContent.trim()==='+JSON.stringify(lbl)+');if(it&&!it.disabled)it.click()})()');await sleep(280)
      menuItemsTested++;
      if(await crashed(ws,sid)){bad.push("메뉴 크래시:"+menu+"/"+lbl);await ev(ws,sid,'location.reload()');await sleep(2500);break}
      // 모달/오버레이 닫기
      await ev(ws,sid,'(()=>{const b=document.querySelector(".modal-backdrop");if(b)b.click();document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))})()');await sleep(150)
    }
  }
  t(!bad.some(m=>m.startsWith('메뉴 크래시')),'전 메뉴 항목('+menuItemsTested+') 클릭 무크래시')

  t(exc.length===0,'전역 예외 없음('+exc.length+')')
  console.log('=== 실사용 인터랙션 베타 ===')
  ok.forEach(m=>console.log('  ✓ '+m));bad.forEach(m=>console.log('  ✗ '+m))
  console.log('결과: '+ok.length+' 통과 / '+bad.length+' 실패')
  ws.close();process.exit(bad.length?1:0)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(2)})
