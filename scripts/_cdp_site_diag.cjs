// 모바일(390px)에서 각 섹션 높이를 측정해 폭주하는 빈 공간이 있는지 진단.
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', 'site'); const PORT = 4181; const HUB = 'http://127.0.0.1:9222';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
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
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
  await rpc(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sid);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await sleep(400);
  const out = await ev(ws, sid, `(function(){
    var body = document.body.scrollHeight;
    var secs = Array.prototype.map.call(document.querySelectorAll('main > section, header, footer, .strip'), function(s){
      var r = s.getBoundingClientRect();
      return { tag: s.className.split(' ')[0]||s.tagName, top: Math.round(r.top+window.scrollY), h: Math.round(r.height) };
    });
    // 가장 큰 빈틈: 인접 섹션 사이 간격
    return { bodyHeight: body, viewport: window.innerHeight, sections: secs };
  })()`);
  console.log('body scrollHeight:', out.bodyHeight, 'px');
  let prevBottom = 0;
  out.sections.forEach((s) => {
    const gap = s.top - prevBottom;
    console.log(`${String(s.top).padStart(6)}  h=${String(s.h).padStart(5)}  ${gap > 40 ? 'GAP+' + gap + ' → ' : '        '}${s.tag}`);
    prevBottom = s.top + s.h;
  });
  console.log('tail gap (last section bottom → body):', out.bodyHeight - prevBottom);
  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
