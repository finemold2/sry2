// 데스크톱 뷰포트(1440x900)에서 특정 섹션으로 스크롤해 실측 캡처(썸네일 왜곡 없이 렌더 확인).
// 사용: node scripts/_cdp_shot_section.cjs <selector> <name> [theme]
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', 'site'); const OUT = path.join(__dirname, '..', 'preview_site'); const PORT = 4186; const HUB = 'http://127.0.0.1:9222';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const SEL = process.argv[2] || '#screens'; const NAME = process.argv[3] || 'section'; const THEME = process.argv[4] || 'light';
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function startServer() { return new Promise((res) => { const s = http.createServer((rq, rs) => { let p = decodeURIComponent((rq.url || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const fp = path.join(ROOT, p); fs.readFile(fp, (e, d) => { if (e) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); rs.end(d); }); }); s.listen(PORT, '127.0.0.1', () => res(s)); }); }
let _id = 0;
function rpc(ws, m, p, sid) { return new Promise((resolve, reject) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', on); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + m)); }, 20000); }); }
async function ev(ws, sid, e) { const r = await rpc(ws, 'Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result?.value; }
(async () => {
  const srv = await startServer();
  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, 'Page.enable', {}, sid);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
  await rpc(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sid);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await ev(ws, sid, `localStorage.setItem('sry-theme','${THEME}'); location.reload();`);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await sleep(400);
  await ev(ws, sid, "document.documentElement.style.scrollBehavior='auto'; document.querySelectorAll('img[loading=\\\"lazy\\\"]').forEach(function(i){i.loading='eager'}); document.querySelectorAll('.reveal').forEach(function(r){r.classList.add('in')});");
  // 섹션으로 즉시 스크롤
  await ev(ws, sid, `(function(){var el=document.querySelector('${SEL}'); if(el){var y=el.getBoundingClientRect().top+window.pageYOffset-72; window.scrollTo(0,y);} return el?el.getBoundingClientRect().top:'no-el';})()`);
  // 이미지 로딩 대기
  for (let i = 0; i < 40; i++) { const done = await ev(ws, sid, "Array.prototype.filter.call(document.images,function(im){return im.getClientRects().length>0}).every(function(im){return im.complete && im.naturalWidth>0})"); if (done) break; await sleep(200); }
  await sleep(500);
  const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', fromSurface: true }, sid);
  fs.writeFileSync(path.join(OUT, NAME + '-' + THEME + '.png'), Buffer.from(r.data, 'base64'));
  console.log('shot', NAME + '-' + THEME + '.png');
  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
