// dist 앱을 헤드리스 Chrome으로 구동해 실제 화면을 캡처한다(랜딩 쇼케이스용).
// 산출물: preview_app/*.png
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, '..', 'preview_app');
const PORT = 4185; const HUB = 'http://127.0.0.1:9222';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function startServer() { return new Promise((res) => { const s = http.createServer((rq, rs) => { let p = decodeURIComponent((rq.url || '/').split('?')[0]); if (p === '/' || p.endsWith('/')) p += 'index.html'; const fp = path.join(ROOT, p); fs.readFile(fp, (e, d) => { if (e) { fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => { if (e2) { rs.writeHead(404); rs.end(); } else { rs.writeHead(200, { 'Content-Type': MIME['.html'] }); rs.end(d2); } }); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); rs.end(d); }); }); s.listen(PORT, '127.0.0.1', () => res(s)); }); }
let _id = 0;
function rpc(ws, m, p, sid) { return new Promise((resolve, reject) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', on); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + m)); }, 30000); }); }
async function ev(ws, sid, e) { const r = await rpc(ws, 'Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value; }

const SCALE = 1.5, W = 1440, H = 900;

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const srv = await startServer();
  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  const errs = [];
  ws.addEventListener('message', (evt) => { let d; try { d = JSON.parse(evt.data); } catch { return; } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push('EX ' + String(d.params.exceptionDetails.exception?.description || '').split('\n')[0].slice(0, 160)); });
  await rpc(ws, 'Runtime.enable', {}, sid);
  await rpc(ws, 'Page.enable', {}, sid);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false }, sid);
  await rpc(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sid);

  // 앱 준비 대기
  let ready = false;
  for (let i = 0; i < 60; i++) { await sleep(500); try { if (await ev(ws, sid, "typeof window.__setView==='function' && typeof window.__openTool==='function'")) { ready = true; break; } } catch {} }
  if (!ready) { console.log('APP NOT READY'); await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(2); }
  await sleep(1200);

  // 첫 실행 온보딩/투어/힌트 닫기 → 리로드로 완전 정리
  async function dismissHints() {
    const done = await ev(ws, sid, `(function(){
      var hits=[];
      document.querySelectorAll('button, a, [role="button"]').forEach(function(b){
        var t=(b.textContent||'').replace(/\\s+/g,' ').trim();
        if(t==='그만 보기'||t==='건너뛰기'||t==='나중에'||t==='그만보기'||t==='모두 닫기'){ b.click(); hits.push(t); }
      });
      // 우하단 스크래치패드/툴팁 등 닫기(×)
      document.querySelectorAll('[aria-label="닫기"],[title="닫기"],button.close,.tip-close').forEach(function(x){ try{x.click(); hits.push('x');}catch(e){} });
      return hits;
    })()`);
    return done;
  }
  console.log('dismiss1:', JSON.stringify(await dismissHints()));
  await sleep(400);
  await ev(ws, sid, "location.reload()");
  ready = false; for (let i = 0; i < 60; i++) { await sleep(400); try { if (await ev(ws, sid, "typeof window.__setView==='function'")) { ready = true; break; } } catch {} }
  await sleep(1200);
  console.log('dismiss2:', JSON.stringify(await dismissHints()));
  await sleep(400);

  // 앱 테마를 라이트로 리셋(이전 실행이 다크로 저장했을 수 있음)
  for (let i = 0; i < 3; i++) {
    const th = await ev(ws, sid, `(function(){var b=document.querySelector('[aria-label="테마 전환"]'); return b?(b.getAttribute('title')||''):'';})()`);
    if (th.indexOf('라이트') >= 0) break;
    await ev(ws, sid, `(function(){var b=document.querySelector('[aria-label="테마 전환"]'); if(b)b.click();})()`);
    await sleep(700);
  }

  const entries = await ev(ws, sid, "window.__scriv ? window.__scriv.entries() : []");
  console.log('기본 프로젝트 아이템 수:', entries.length);
  console.log(JSON.stringify(entries.slice(0, 30)));

  async function shot(name) { const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', fromSurface: true }, sid); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64')); console.log('shot', name, fs.statSync(path.join(OUT, name + '.png')).size, 'bytes'); }
  async function view(v, name) { await ev(ws, sid, `window.__setView(${JSON.stringify(v)})`); await sleep(1400); await shot(name); }
  async function key(k, code, vk) { await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: code, windowsVirtualKeyCode: vk }, sid); await rpc(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: code, windowsVirtualKeyCode: vk }, sid); }
  // 바인더에 제목 있는 문서 추가("+ 글" → 인라인 리네임)
  async function addDoc(title) {
    const clicked = await ev(ws, sid, `(function(){var b=[].find.call(document.querySelectorAll('button'),function(x){var t=(x.textContent||'').replace(/\\s+/g,''); return t==='+글';}); if(b){b.click();return true;} return false;})()`);
    if (!clicked) return false;
    await sleep(500);
    const isInput = await ev(ws, sid, "(function(){var a=document.activeElement; if(a&&a.tagName==='INPUT'){a.select();return true;} return false;})()");
    if (isInput) { await rpc(ws, 'Input.insertText', { text: title }, sid); await key('Enter', 'Enter', 13); }
    await sleep(400);
    return isInput;
  }

  // 에디터에 프로즈 시딩(있으면 스킵)
  try {
    await ev(ws, sid, "window.__setView('editor')"); await sleep(800);
    const seeded = await ev(ws, sid, `(function(){
      var ed=document.querySelector('[contenteditable="true"]'); if(!ed) return 'no-editor';
      var txt=(ed.innerText||'').trim();
      if(txt.length>40) return 'already:'+txt.length;
      ed.focus();
      return 'focus-ok';
    })()`);
    console.log('seed 상태:', seeded);
    if (seeded === 'focus-ok') {
      const paras = [
        '빗소리가 창을 두드리기 시작했다. 나는 오래된 노트를 펼쳤고, 첫 문장은 늘 그렇듯 나를 기다리고 있었다.',
        '도시는 잠들지 않는다. 네온이 젖은 아스팔트 위로 번지고, 사람들은 저마다의 문장을 품은 채 스쳐 지나갔다.',
        '그날 이후로 모든 것이 달라졌다. 다만 나는 아직, 그 이유를 문장으로 옮기지 못했을 뿐이다.'
      ];
      for (const p of paras) {
        await rpc(ws, 'Input.insertText', { text: p }, sid);
        await ev(ws, sid, "(function(){var ed=document.querySelector('[contenteditable=\\\"true\\\"]'); if(ed){var e=new InputEvent('input',{bubbles:true}); ed.dispatchEvent(e);} document.execCommand&&document.execCommand('insertParagraph');})()");
        await sleep(120);
      }
      await ev(ws, sid, "document.querySelector('[contenteditable=\\\"true\\\"]').blur()"); await sleep(500);
    }
  } catch (e) { console.log('seed err', e.message); }

  // 에디터
  await ev(ws, sid, "window.__setView('editor')"); await sleep(1000); await shot('editor');

  // 구조 뷰가 풍성해 보이도록 제목 있는 문서 추가(최초 1회)
  if (entries.filter((e) => e.type === 'text').length < 5) {
    // 원고 폴더 선택
    await ev(ws, sid, `(function(){var el=[].find.call(document.querySelectorAll('*'),function(x){return x.children.length===0 && (x.textContent||'').trim()==='원고';}); if(el){el.click();}})()`);
    await sleep(400);
    const titles = ['프롤로그 — 젖은 도시', '제2장 · 추격', '제3장 · 잔향의 밤', '제4장 · 붉은 우산', '제5장 · 마지막 문장', '에필로그 — 새벽'];
    for (const t of titles) { const ok = await addDoc(t); console.log('addDoc', t, ok); }
    const now = await ev(ws, sid, "window.__scriv.entries().filter(function(e){return e.type==='text'}).length");
    console.log('총 문서 수:', now);
  }

  // 구조 뷰들
  await view('corkboard', 'corkboard');
  await view('outliner', 'outliner');
  await view('canvas', 'canvas');
  await view('serial', 'serial');
  await view('timeline', 'timeline');
  await view('database', 'database');
  await ev(ws, sid, "window.__setView('editor')"); await sleep(600);

  // 도구 허브 모달
  try { await ev(ws, sid, "window.__setModal && window.__setModal('toolhub')"); await sleep(1400); await shot('toolhub'); await ev(ws, sid, "window.__setModal && window.__setModal(null)"); await sleep(500); } catch (e) { console.log('toolhub err', e.message); }

  // 대표 도구창 몇 개 동시 오픈
  try {
    for (const id of ['imagination-gallery', 'mind-map', 'cover-mockup']) { await ev(ws, sid, `window.__openTool(${JSON.stringify(id)})`); await sleep(1800); }
    await shot('tools');
  } catch (e) { console.log('tools err', e.message); }

  // 도구창 정리(다크 샷 오버레이 방지)
  await ev(ws, sid, `(function(){var b=[].find.call(document.querySelectorAll('button'),function(x){return (x.textContent||'').replace(/\\s+/g,'')==='모두 닫기'.replace(/\\s+/g,'');}); if(b)b.click();})()`);
  await sleep(600);

  // 앱 다크 테마 전환(히어로·다크 랜딩용)
  try {
    const toggled = await ev(ws, sid, `(function(){var b=document.querySelector('[aria-label="테마 전환"]'); if(b){b.click();return true;} return false;})()`);
    console.log('테마토글:', toggled);
    await sleep(1000);
    await ev(ws, sid, "window.__setView('editor')"); await sleep(1000); await shot('editor-dark');
    await view('corkboard', 'corkboard-dark');
    await view('serial', 'serial-dark');
    try { await ev(ws, sid, "window.__setModal && window.__setModal('toolhub')"); await sleep(1400); await shot('toolhub-dark'); await ev(ws, sid, "window.__setModal && window.__setModal(null)"); await sleep(400); } catch {}
  } catch (e) { console.log('dark err', e.message); }

  console.log('예외:', errs.length, errs.slice(0, 5));
  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
