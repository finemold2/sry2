// 헤드리스 Chrome(CDP)으로 site/ 소개 페이지를 실사용 검증한다.
// - 정적 서버 내장(site/ 루트) → 콘솔에러/예외, 가로 오버플로(여러 폭), 링크, 리빌, 카운터, 테마 토글 검사 + 스크린샷
// 사용: node scripts/_cdp_site.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'site');
const OUT = path.join(__dirname, '..', 'preview_site');
const PORT = 4179;
const HUB = 'http://127.0.0.1:9222';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/' || p.endsWith('/')) p += 'index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

let _id = 0;
function rpc(ws, method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++_id;
    const msg = { id, method, params: params || {} };
    if (sessionId) msg.sessionId = sessionId;
    const onMsg = (ev) => { let d; try { d = JSON.parse(ev.data); } catch { return; } if (d.id === id) { ws.removeEventListener('message', onMsg); d.error ? reject(new Error(d.error.message)) : resolve(d.result); } };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(msg));
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error('timeout ' + method)); }, 30000);
  });
}
async function evalP(ws, sid, expr) {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
  if (r.exceptionDetails) throw new Error('eval ex: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const srv = await startServer();
  const APP = `http://127.0.0.1:${PORT}/`;

  const ver = await (await fetch(HUB + '/json/version')).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });

  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });

  const problems = [];
  ws.addEventListener('message', (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (d.sessionId !== sid) return;
    if (d.method === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails; problems.push('EXCEPTION: ' + String(e.exception?.description || e.text || '').split('\n')[0].slice(0, 200));
    } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      const t = (d.params.args || []).map((a) => a.value || a.description || '').join(' '); problems.push('console.error: ' + String(t).slice(0, 200));
    }
  });
  await rpc(ws, 'Runtime.enable', {}, sid);
  await rpc(ws, 'Log.enable', {}, sid);
  await rpc(ws, 'Page.enable', {}, sid);

  const report = [];
  const widths = [{ w: 1440, h: 900, m: false, name: 'desktop' }, { w: 1024, h: 800, m: false, name: 'tablet' }, { w: 768, h: 1000, m: true, name: 'small' }, { w: 390, h: 844, m: true, name: 'mobile' }];

  async function loadAt(width, height, mobile) {
    await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }, sid);
    await rpc(ws, 'Page.navigate', { url: APP }, sid);
    for (let i = 0; i < 40; i++) { await sleep(120); const r = await evalP(ws, sid, "document.readyState==='complete'"); if (r) break; }
    await sleep(500);
  }

  // 각 폭에서 오버플로/구조 검사
  for (const vp of widths) {
    await loadAt(vp.w, vp.h, vp.m);
    const info = await evalP(ws, sid, `(function(){
      var de=document.documentElement;
      return {
        title: document.title,
        sw: de.scrollWidth, iw: window.innerWidth,
        hero: !!document.querySelector('.hero-title'),
        appLinks: Array.prototype.map.call(document.querySelectorAll('[data-app-link]'), function(a){return a.getAttribute('href')}),
        appReady: window.SRY_APP_READY === true,
        cards: document.querySelectorAll('.card').length,
        chips: document.querySelectorAll('.type-chips li').length,
        menuVisible: getComputedStyle(document.getElementById('menuToggle')).display !== 'none',
        navVisible: getComputedStyle(document.querySelector('.nav')).display !== 'none'
      };
    })()`);
    const overflow = info.sw - info.iw;
    report.push(`[${vp.name} ${vp.w}px] overflowX=${overflow > 1 ? 'FAIL(+' + overflow + 'px)' : 'ok'} · hero=${info.hero} · cards=${info.cards} · chips=${info.chips} · nav=${info.navVisible ? 'shown' : 'hidden'} · burger=${info.menuVisible ? 'shown' : 'hidden'}`);
    if (overflow > 1) problems.push(`가로 오버플로 @${vp.w}px: scrollWidth ${info.sw} > innerWidth ${info.iw}`);
    if (vp === widths[0]) {
      report.push(`title="${info.title}"`);
      const expected = info.appReady ? './app/' : '#';
      report.push(`app links=${JSON.stringify(info.appLinks)} (appReady=${info.appReady} → 모두 '${expected}')`);
      if (info.appLinks.some((h) => h !== expected)) problems.push(`앱 링크가 '${expected}' 로 설정되지 않음: ` + JSON.stringify(info.appLinks));
    }
  }

  // 데스크톱에서 인터랙션(스크롤 리빌·카운터·테마) 검증 + 스크린샷
  await loadAt(1440, 900, false);
  // 페이지 끝까지 스크롤해 리빌·카운터 트리거
  await evalP(ws, sid, "window.scrollTo(0, document.body.scrollHeight)"); await sleep(1200);
  await evalP(ws, sid, "window.scrollTo(0, 0)"); await sleep(400);
  const interact = await evalP(ws, sid, `(function(){
    var revs=document.querySelectorAll('.reveal');
    var notIn=0; revs.forEach(function(r){ if(!r.classList.contains('in')) notIn++; });
    var counters=Array.prototype.map.call(document.querySelectorAll('[data-count]'), function(c){return c.textContent.trim();});
    return { totalReveal: revs.length, notIn: notIn, counters: counters };
  })()`);
  report.push(`reveal: ${interact.totalReveal - interact.notIn}/${interact.totalReveal} 표시됨` + (interact.notIn ? ` (미표시 ${interact.notIn})` : ''));
  report.push(`counters: ${JSON.stringify(interact.counters)}`);
  if (interact.notIn > 0) problems.push(`스크롤 후에도 안 나타난 reveal 요소 ${interact.notIn}개`);

  // 접근성 대비 자동검사 (양 테마: primary 버튼 흰글자, --muted 보조텍스트)
  async function contrastAudit(themeName) {
    await setTheme(themeName);
    const c = await evalP(ws, sid, `(function(){
      function L(rgb){var m=rgb.match(/\\d+(\\.\\d+)?/g).map(Number);function f(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);}
      function ratio(a,b){var la=L(a),lb=L(b),hi=Math.max(la,lb),lo=Math.min(la,lb);return (hi+0.05)/(lo+0.05);}
      var cs=getComputedStyle(document.documentElement);
      var btn=document.querySelector('.btn-primary');
      var btnBg=getComputedStyle(btn).backgroundColor;
      var muted=cs.getPropertyValue('--muted').trim();
      // muted 를 rgb 로 변환
      var tmp=document.createElement('span'); tmp.style.color=muted; document.body.appendChild(tmp); var mrgb=getComputedStyle(tmp).color; tmp.remove();
      var bg=cs.getPropertyValue('--bg').trim(); var t2=document.createElement('span'); t2.style.color=bg; document.body.appendChild(t2); var bgrgb=getComputedStyle(t2).color; t2.remove();
      return { btn: ratio('rgb(255,255,255)', btnBg).toFixed(2), muted: ratio(mrgb, bgrgb).toFixed(2) };
    })()`);
    report.push(`대비[${themeName}] 기본버튼(흰글자)=${c.btn}:1 ${c.btn >= 4.5 ? '✓' : '✗<4.5'} · --muted/bg=${c.muted}:1 ${c.muted >= 4.5 ? '✓' : '✗<4.5'}`);
    if (c.btn < 4.5) problems.push(`${themeName} 기본버튼 대비 ${c.btn} < 4.5`);
    if (c.muted < 4.5) problems.push(`${themeName} --muted 대비 ${c.muted} < 4.5`);
  }
  await contrastAudit('light');
  await contrastAudit('dark');
  await loadAt(1440, 900, false);

  // 테마 토글
  const themeBefore = await evalP(ws, sid, "document.documentElement.getAttribute('data-theme')");
  await evalP(ws, sid, "document.getElementById('themeToggle').click()");
  await sleep(300);
  const themeAfter = await evalP(ws, sid, "document.documentElement.getAttribute('data-theme')");
  report.push(`theme toggle: ${themeBefore} → ${themeAfter}` + (themeBefore !== themeAfter ? ' ✓' : ' ✗ 변화없음'));
  if (themeBefore === themeAfter) problems.push('테마 토글이 data-theme 를 바꾸지 못함');

  // 스크린샷: 라이트/다크 × 데스크톱/모바일 (테마를 명시 설정하고, 캡처 전 끝까지 스크롤해 리빌 트리거)
  async function waitReady() { for (let i = 0; i < 40; i++) { await sleep(120); if (await evalP(ws, sid, "document.readyState==='complete'")) break; } await sleep(400); }
  async function setTheme(t) { await evalP(ws, sid, `localStorage.setItem('sry-theme','${t}'); location.reload();`); await waitReady(); }
  async function scrollThrough() {
    // lazy 이미지를 즉시 로딩하도록 전환 후 훑기
    await evalP(ws, sid, "document.querySelectorAll('img[loading=\\\"lazy\\\"]').forEach(function(i){i.loading='eager'})");
    await evalP(ws, sid, `(async function(){ var h=document.body.scrollHeight; for(var y=0;y<=h;y+=500){ window.scrollTo(0,y); await new Promise(function(r){setTimeout(r,90)}); } window.scrollTo(0,0); })()`);
    // 화면에 보이는 이미지 로딩 완료까지 대기(최대 ~6초)
    for (let i = 0; i < 30; i++) { const done = await evalP(ws, sid, "Array.prototype.filter.call(document.images,function(im){return im.getClientRects().length>0}).every(function(im){return im.complete && im.naturalWidth>0})"); if (done) break; await sleep(200); }
    await sleep(400);
  }
  async function shot(name) {
    const r = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true }, sid);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
    report.push('screenshot: preview_site/' + name + '.png');
  }
  await loadAt(1440, 900, false); await setTheme('light'); await scrollThrough(); await shot('desktop-light');
  await setTheme('dark'); await scrollThrough(); await shot('desktop-dark');
  await loadAt(390, 844, true); await setTheme('light'); await scrollThrough(); await shot('mobile-light');
  await setTheme('dark'); await scrollThrough(); await shot('mobile-dark');

  console.log('\n=== sry 소개 페이지 CDP 검증 ===');
  report.forEach((l) => console.log(' ' + l));
  console.log('\n--- 문제 ' + problems.length + '건 ---');
  problems.forEach((p) => console.log('  ✗ ' + p));
  if (!problems.length) console.log('  ✓ 콘솔에러 0 · 오버플로 0 · 링크/리빌/카운터/테마 정상');

  await rpc(ws, 'Target.closeTarget', { targetId });
  ws.close(); srv.close();
  process.exit(problems.length ? 1 : 0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
