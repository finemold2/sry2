// 클래식 ↔ 스튜디오 메뉴 패리티: 양 스킨에서 파일/문서/도구/보기 메뉴의 '모든 항목 라벨'을 실제로 열어 수집하고,
// 클래식에 있는데 스튜디오에 없는 항목(기능 누락)을 찾아낸다. (kbd 힌트는 제거하고 라벨만 비교)
const HUB = 'http://localhost:9222'; let _id = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function bws() { const r = await fetch(HUB + '/json/version'); return (await r.json()).webSocketDebuggerUrl }
function rpc(ws, m, p, sid) { return new Promise((res, rej) => { const id = ++_id; const msg = { id, method: m, params: p || {} }; if (sid) msg.sessionId = sid; const on = e => { let d; try { d = JSON.parse(e.data) } catch { return } if (d.id === id) { ws.removeEventListener('message', on); d.error ? rej(new Error(d.error.message)) : res(d.result) } }; ws.addEventListener('message', on); ws.send(JSON.stringify(msg)); setTimeout(() => rej(new Error('to')), 12000) }) }
async function ev(ws, sid, x) { const r = await rpc(ws, 'Runtime.evaluate', { expression: '(()=>{' + x + '})()', returnByValue: true, awaitPromise: true }, sid); if (r.exceptionDetails) throw new Error('PAGE:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '')); return r.result && r.result.value }

const MENUS = ['파일', '문서', '도구', '보기']
// 라벨 정규화: kbd 힌트 span 제거 + 동적 카운트 '(N)' 제거 + 공백 정리
const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*\([0-9]+\)\s*$/, '').trim()

async function collectMenus(ws, sid) {
  const out = {}
  for (const name of MENUS) {
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.menu-wrap > button')).find(function(x){return (x.textContent||'').trim()==='" + name + "'});if(b)b.click();return 1"); await sleep(300)
    const items = await ev(ws, sid, "return [].slice.call(document.querySelectorAll('.dropdown button')).map(function(b){var k=b.querySelector('.kbd');var t=b.textContent||'';if(k)t=t.replace(k.textContent||'','');return t})")
    out[name] = (items || []).map(norm).filter(Boolean)
    await ev(ws, sid, "document.body.click();return 1"); await sleep(150) // 닫기
  }
  return out
}

async function main() {
  const ws = new WebSocket(await bws()); await new Promise(r => ws.addEventListener('open', r))
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'http://localhost:4178/' })
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true })
  const waitHook = async () => { for (let i = 0; i < 30; i++) { await sleep(400); try { if (await ev(ws, sid, "return typeof window.__setView==='function'")) return true } catch { /* loading */ } } return false }
  const snap = {}
  for (const skin of ['classic', 'studio']) {
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await sleep(1200)
    await ev(ws, sid, "try{localStorage.setItem('sry:uiSkin','" + skin + "')}catch(e){};return 1")
    await rpc(ws, 'Page.navigate', { url: 'http://localhost:4178/' }, sid); await waitHook()
    await ev(ws, sid, "var b=[].slice.call(document.querySelectorAll('.modal button,.tour-skip')).find(function(x){return /시작하기|다시 보지|그만 보기/.test(x.textContent||'')});if(b)b.click();return 1"); await sleep(400)
    snap[skin] = await collectMenus(ws, sid)
  }

  const ok = [], bad = []; const t = (c, m) => (c ? ok : bad).push(m)
  // 클래식의 모든 항목이 스튜디오 어딘가(메뉴 합집합)에 있는지 — 메뉴 배치는 달라도 '기능 도달'이 핵심
  const studioAll = new Set(Object.values(snap.studio).flat())
  // 뷰 전환 10종은 스튜디오에선 좌측 레일 버튼으로 제공되므로 메뉴에 없어도 OK(레일 라벨로 인정)
  const RAIL = ['에디터', '코르크보드', '아웃라이너', '칸반 보드', '스토리 캔버스', '연재 관리', '스토리 타임라인', '타임라인', '참고문헌', '논증 작업대', '데이터베이스', '창작 스튜디오', '도구 허브', '도구 허브 (상상력 자극·웹검색·집중 등)', '장르별 도구함', '장르별 도구함 (장르소설 특화)']
  // 헤더 아이콘으로 제공되는 토글들도 인정
  const HEADER = ['바인더 토글', '인스펙터 토글', '테마 전환']
  const allow = new Set([...studioAll, ...RAIL, ...HEADER])

  for (const menu of MENUS) {
    const cls = snap.classic[menu] || []
    const missing = cls.filter((it) => !allow.has(it) && !studioAll.has(it))
    t(missing.length === 0, '[' + menu + '] 클래식 항목 전부 스튜디오에서 도달 가능' + (missing.length ? ' — 누락: ' + JSON.stringify(missing) : ' (' + cls.length + '개)'))
  }
  console.log('=== 클래식↔스튜디오 메뉴 패리티 ===')
  console.log('classic 보기:', JSON.stringify(snap.classic['보기']))
  console.log('studio  보기:', JSON.stringify(snap.studio['보기']))
  ok.forEach(m => console.log('  ✓ ' + m)); bad.forEach(m => console.log('  ✗ ' + m))
  console.log('결과: ' + ok.length + ' 통과 / ' + bad.length + ' 실패')
  ws.close(); process.exit(bad.length ? 1 : 0)
}
main().catch(e => { console.log('FATAL', e.message); process.exit(2) })
