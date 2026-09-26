// '시작하기'(data-app-link) 클릭 시 404 대신 "곧 출시" 토스트가 뜨는지 검증 + 스크린샷.
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', 'site'); const OUT = path.join(__dirname, '..', 'preview_site'); const PORT = 4187; const HUB = 'http://127.0.0.1:9222';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function startServer() { return new Promise((res) => { const s = http.createServer((rq, rs) => { let p = decodeURIComponent((rq.url || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const fp = path.join(ROOT, p); fs.readFile(fp, (e, d) => { if (e) { rs.writeHead(404); rs.end('404'); return; } rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' }); rs.end(d); }); }); s.listen(PORT, '127.0.0.1', () => res(s)); }); }
let _id = 0;
function rpc(ws, m, p, sid) { return new Promise((resolve, reject) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', on); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + m)); }, 20000); }); }
async function ev(ws, sid, e) { const r = await rpc(ws, 'Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result?.value; }
(async () => {
  const srv = await startServer();
  const APP = `http://127.0.0.1:${PORT}/`;
  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  const errs = [];
  ws.addEventListener('message', (evt) => { let d; try { d = JSON.parse(evt.data); } catch { return; } if (d.sessionId !== sid) return; if (d.method === 'Runtime.exceptionThrown') errs.push(String(d.params.exceptionDetails.exception?.description || '').split('\n')[0]); });
  await rpc(ws, 'Runtime.enable', {}, sid); await rpc(ws, 'Page.enable', {}, sid);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
  await rpc(ws, 'Page.navigate', { url: APP }, sid);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev(ws, sid, "document.readyState==='complete'")) break; }
  await sleep(500);

  const before = await ev(ws, sid, "location.href");
  // 히어로 시작 버튼 클릭
  await ev(ws, sid, "document.querySelector('.hero-cta [data-app-link]').click()");
  await sleep(500);
  const state = await ev(ws, sid, `(function(){
    var t=document.getElementById('sryToast');
    return {
      href: location.href,
      toastExists: !!t,
      toastShown: !!(t && t.classList.contains('show')),
      toastText: t ? t.textContent : '',
      appReady: window.SRY_APP_READY,
      firstHref: document.querySelector('.hero-cta [data-app-link]').getAttribute('href')
    };
  })()`);
  console.log('클릭 전 URL:', before);
  console.log('클릭 후:', JSON.stringify(state, null, 0));
  const nav404 = /\/app\/?$/.test(state.href);
  const ok = state.toastExists && state.toastShown && /곧 출시/.test(state.toastText) && !nav404;
  console.log(ok ? '✓ 토스트 정상 (404 이동 없음)' : '✗ 실패');
  console.log('예외:', errs.length, errs.slice(0, 3));

  const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', fromSurface: true }, sid);
  fs.writeFileSync(path.join(OUT, 'cta-toast.png'), Buffer.from(r.data, 'base64'));
  console.log('shot preview_site/cta-toast.png');

  await rpc(ws, 'Target.closeTarget', { targetId }); ws.close(); srv.close();
  process.exit(ok && !errs.length ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
