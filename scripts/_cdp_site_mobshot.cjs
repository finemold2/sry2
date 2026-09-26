// 모바일 뷰포트(390x844) 실측 스크린샷을 스크롤 지점별로 캡처(축소 왜곡 없이 실제 렌더 확인).
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', 'site'); const OUT = path.join(__dirname, '..', 'preview_site'); const PORT = 4182; const HUB = 'http://127.0.0.1:9222';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function startServer() { return new Promise((res) => { const s = http.createServer((rq, rs) => { let p = decodeURIComponent((rq.url || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const fp = path.join(ROOT, p); fs.readFile(fp, (e, d) => { if (e) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); rs.end(d); }); }); s.listen(PORT, '127.0.0.1', () => res(s)); }); }
let _id = 0;
function rpc(ws, m, p, sid) { return new Promise((resolve, reject) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', on); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + m)); }, 20000); }); }
async function ev(ws, sid, e) { const r = await rpc(ws, 'Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result?.value; }
(async () => {
  const theme = process.argv[2] || 'light';
  const srv = await startServer();
  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, 'Page.enable', {}, sid);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
  await rpc(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/?t=${theme}` }, sid);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await ev(ws, sid, `localStorage.setItem('sry-theme','${theme}'); location.reload();`);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await sleep(400);
  // 모든 리빌 강제 표시(정적 실측)
  await ev(ws, sid, "document.querySelectorAll('.reveal').forEach(function(r){r.classList.add('in')});");
  const offsets = [
    { y: 0, name: 'm-hero' },
    { y: 1200, name: 'm-mock-flow' },
    { y: 3300, name: 'm-cards' },
    { y: 4700, name: 'm-studio' },
    { y: 5900, name: 'm-safety' },
    { y: 7400, name: 'm-cta' },
  ];
  for (const o of offsets) {
    await ev(ws, sid, `window.scrollTo(0, ${o.y})`); await sleep(250);
    const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', fromSurface: true }, sid);
    fs.writeFileSync(path.join(OUT, `${o.name}-${theme}.png`), Buffer.from(r.data, 'base64'));
    console.log('shot', `${o.name}-${theme}.png`);
  }
  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
