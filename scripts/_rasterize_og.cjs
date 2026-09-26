// og.svg 를 1200x630 PNG(assets/og.png)로 래스터화한다(헤드리스 Chrome).
const http = require('http'); const fs = require('fs'); const path = require('path');
const SVG = fs.readFileSync(path.join(__dirname, '..', 'site', 'assets', 'og.svg'), 'utf8');
const OUT = path.join(__dirname, '..', 'site', 'assets', 'og.png');
const PORT = 4184; const HUB = 'http://127.0.0.1:9222';
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
let _id = 0;
function rpc(ws, m, p, sid) { return new Promise((resolve, reject) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', on); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + m)); }, 20000); }); }
async function ev(ws, sid, e) { const r = await rpc(ws, 'Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result?.value; }
(async () => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}#c{width:1200px;height:630px;overflow:hidden}#c svg{display:block;width:1200px;height:630px}</style></head><body><div id="c">${SVG}</div></body></html>`;
  const srv = http.createServer((rq, rs) => { rs.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); rs.end(html); });
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, 'Page.enable', {}, sid);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false }, sid);
  await rpc(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sid);
  for (let i = 0; i < 40; i++) { await sleep(100); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await sleep(400);
  const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 }, fromSurface: true }, sid);
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
