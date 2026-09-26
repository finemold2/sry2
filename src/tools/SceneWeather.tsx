// 장면 기상도 — 장면마다 감정 "날씨"(맑음/구름/안개/비/폭풍 등)와 기온(따뜻함↔차가움)·기압(긴장)을
// 배정해, 작품 전체를 가로로 펼친 "기후 지도(climate strip)"로 시각화합니다.
// 분석: 막(act)별 평균 기후, 날씨 분포, 연속 같은 날씨의 단조 구간 경보, 급변하는 "전선(front)" 표시,
// 긴장 기복 평탄 구간 점검. 라이브러리/바인더 드롭/payload 로 장면을 받아 채우고,
// 감정 히트맵·사건 연대표 등 관련 도구로 데이터를 넘기며, 프로젝트에 기후 리포트를 문서로 추가합니다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음. localStorage 자동 저장/복원.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'scene-weather',
  name: '장면 기상도',
  icon: '🌦️',
  group: '분위기·시각',
  intro: '장면마다 감정 "날씨"를 배정해 작품 전체 기후 지도를 그리고 단조·급변 구간을 점검하세요',
  w: 500,
  h: 620,
}

const LS_KEY = 'sry:tool:scene-weather'

// ── 날씨(감정 분위기) 분류 ───────────────────────────────────────────────────
// key: 식별자, label: 표시명, sym: 픽토그램(도형/문자, 생이모지 아님),
// hue: 색조(0~360), warmth: 체감 온도 기본값(-3 추움 ~ +3 따뜻), tension: 기압/긴장 기본값(0~5)
interface WeatherKind {
  key: string
  label: string
  sym: string
  hue: number
  warmth: number
  tension: number
  hint: string
}
const WEATHERS: WeatherKind[] = [
  { key: 'clear', label: '맑음', sym: '○', hue: 48, warmth: 2, tension: 0, hint: '평온·행복·안정. 밝고 따뜻한 장면' },
  { key: 'sunny', label: '쾌청', sym: '◎', hue: 40, warmth: 3, tension: 0, hint: '환희·승리·절정의 기쁨' },
  { key: 'cloud', label: '구름', sym: '◐', hue: 210, warmth: 0, tension: 1, hint: '막연한 불안·권태·전환기' },
  { key: 'fog', label: '안개', sym: '▒', hue: 200, warmth: -1, tension: 2, hint: '혼란·비밀·불확실. 시야가 막힘' },
  { key: 'drizzle', label: '이슬비', sym: '┊', hue: 220, warmth: -1, tension: 2, hint: '잔잔한 슬픔·우울·회한' },
  { key: 'rain', label: '비', sym: '╱', hue: 225, warmth: -2, tension: 3, hint: '깊은 슬픔·상실·이별' },
  { key: 'storm', label: '폭풍', sym: '⚡', hue: 270, warmth: -2, tension: 5, hint: '분노·격돌·위기의 절정' },
  { key: 'snow', label: '눈', sym: '✦', hue: 195, warmth: -3, tension: 1, hint: '고요한 냉기·고립·체념' },
  { key: 'frost', label: '한파', sym: '✶', hue: 190, warmth: -3, tension: 3, hint: '절망·단절·죽음의 그림자' },
  { key: 'heat', label: '폭염', sym: '▲', hue: 18, warmth: 3, tension: 4, hint: '욕망·집착·들끓는 긴장' },
  { key: 'wind', label: '바람', sym: '≈', hue: 150, warmth: 1, tension: 2, hint: '변화·여정·동요. 무언가 다가옴' },
  { key: 'rainbow', label: '무지개', sym: '◠', hue: 300, warmth: 2, tension: 1, hint: '화해·치유·희망의 회복' },
]
const W_BY_KEY: Record<string, WeatherKind> = Object.fromEntries(WEATHERS.map((w) => [w.key, w]))
const isWeatherKey = (v: unknown): v is string => typeof v === 'string' && !!W_BY_KEY[v]

function weatherColor(w: WeatherKind, alpha = 1): string {
  // 따뜻할수록 채도/명도를 높여 따뜻한 색, 차가울수록 가라앉은 색
  const sat = 55 + w.tension * 5
  const light = 50 + w.warmth * 6
  return `hsla(${w.hue}, ${Math.min(85, sat)}%, ${Math.max(28, Math.min(72, light))}%, ${alpha})`
}

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface Scene {
  id: string
  title: string
  weather: string     // WeatherKind.key
  warmth: number      // -3 ~ 3 (사용자 보정 가능)
  tension: number     // 0 ~ 5
  act: number         // 1,2,3...
  note: string
  createdAt: number
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// 문자열 해시 → 결정론적 의사난수(시드). 같은 제목엔 항상 같은 추정 날씨.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

// 텍스트에서 감정 어휘를 세어 날씨를 추정(휴리스틱). 단서 없으면 제목 해시로 결정.
const CUES: { keys: string[]; weather: string }[] = [
  { keys: ['행복', '웃', '기쁨', '평온', '안도', '따뜻', '미소', '사랑', '포근'], weather: 'clear' },
  { keys: ['승리', '환호', '절정', '벅차', '황홀', '최고'], weather: 'sunny' },
  { keys: ['불안', '권태', '망설', '애매', '흐릿', '지루'], weather: 'cloud' },
  { keys: ['혼란', '비밀', '의문', '수상', '모호', '안개', '시야'], weather: 'fog' },
  { keys: ['쓸쓸', '우울', '회한', '서글', '눈물'], weather: 'drizzle' },
  { keys: ['슬픔', '상실', '이별', '비통', '울었', '눈물이'], weather: 'rain' },
  { keys: ['분노', '격돌', '싸움', '폭발', '위기', '비명', '충돌', '광기'], weather: 'storm' },
  { keys: ['고요', '고립', '체념', '차가', '얼어', '침묵'], weather: 'snow' },
  { keys: ['절망', '죽음', '단절', '한기', '소름', '냉혹'], weather: 'frost' },
  { keys: ['욕망', '집착', '열망', '들끓', '갈망', '뜨거'], weather: 'heat' },
  { keys: ['변화', '여정', '출발', '동요', '예감', '다가'], weather: 'wind' },
  { keys: ['화해', '치유', '회복', '희망', '용서', '다시'], weather: 'rainbow' },
]
function guessWeather(title: string, text: string): string {
  const hay = (title + ' ' + (text || '')).toLowerCase()
  let best = '', bestN = 0
  for (const c of CUES) {
    let n = 0
    for (const k of c.keys) { if (hay.includes(k)) n++ }
    if (n > bestN) { bestN = n; best = c.weather }
  }
  if (best) return best
  return WEATHERS[hash(title || text || 'x') % WEATHERS.length].key
}

function mkScene(p: Partial<Scene>): Scene {
  const wk = isWeatherKey(p.weather) ? p.weather! : 'clear'
  const base = W_BY_KEY[wk]
  return {
    id: p.id || newId(),
    title: (p.title || '새 장면').toString().slice(0, 120),
    weather: wk,
    warmth: clampN(p.warmth, base.warmth, -3, 3),
    tension: clampN(p.tension, base.tension, 0, 5),
    act: Math.max(1, Math.min(9, Math.round(Number(p.act) || 1))),
    note: typeof p.note === 'string' ? p.note.slice(0, 600) : '',
    createdAt: Number(p.createdAt) || Date.now(),
  }
}
function clampN(v: unknown, def: number, lo: number, hi: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function seed(): Scene[] {
  const proto: Partial<Scene>[] = [
    { title: '안개 낀 항구 도착', weather: 'fog', act: 1 },
    { title: '낯선 마을의 환대', weather: 'clear', act: 1 },
    { title: '편지에 담긴 비밀', weather: 'cloud', act: 1 },
    { title: '폭풍 속의 대립', weather: 'storm', act: 2 },
    { title: '홀로 남은 밤', weather: 'rain', act: 2 },
    { title: '얼어붙은 진실', weather: 'frost', act: 2 },
    { title: '마지막 결전', weather: 'storm', act: 3 },
    { title: '비 갠 뒤의 화해', weather: 'rainbow', act: 3 },
  ]
  return proto.map((p) => mkScene(p))
}

function load(): { scenes: Scene[]; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { scenes: seed(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.scenes)) return { scenes: seed(), seeded: true }
    const scenes = (parsed.scenes as unknown[]).filter(Boolean).map((o) => mkScene(o as Partial<Scene>))
    return { scenes, seeded: false }
  } catch { return { scenes: seed(), seeded: true } }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function SceneWeather({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ scenes: Scene[]; seeded: boolean }>()
  if (!initial.current) initial.current = load()

  const [scenes, setScenes] = useState<Scene[]>(initial.current.scenes)
  const [selId, setSelId] = useState<string | null>(initial.current.scenes[0]?.id || null)
  const [note, setNote] = useState(initial.current.seeded ? '예시 기상도를 채워 두었어요. 자유롭게 바꾸세요.' : '')
  const [dropHover, setDropHover] = useState(false)
  const [tab, setTab] = useState<'map' | 'analysis'>('map')
  const dragDepth = useRef(0)
  const mounted = useRef(true)

  const places = useLibraryList('places')
  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload(연 도구에서 넘어온 데이터) 수용 — 1회만
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const add: Scene[] = []
    // payload.scenes: [{title, text?}] 형태 수용
    const arr = Array.isArray((payload as Record<string, unknown>).scenes) ? (payload as { scenes: unknown[] }).scenes : null
    if (arr) {
      for (const s of arr) {
        if (!s || typeof s !== 'object') continue
        const o = s as Record<string, unknown>
        const t = typeof o.title === 'string' ? o.title : ''
        if (!t) continue
        add.push(mkScene({ title: t, weather: guessWeather(t, typeof o.text === 'string' ? o.text : '') }))
      }
    }
    // payload.text: 원고 한 덩어리 → 한 장면으로
    const text = typeof payload.text === 'string' ? payload.text : ''
    if (!arr && text) {
      add.push(mkScene({ title: (typeof payload.title === 'string' && payload.title) || text.slice(0, 24), weather: guessWeather('', text), note: text.slice(0, 300) }))
    }
    if (add.length) {
      setScenes((prev) => [...prev, ...add])
      setSelId(add[0].id)
      setNote(`연동 데이터로 ${add.length}개 장면을 추가했어요.`)
    }
  }, [payload])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scenes })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 새로고침 시 초기화될 수 있어요.') }
  }, [scenes])

  const sel = scenes.find((s) => s.id === selId) || null

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const addScene = useCallback((p: Partial<Scene>) => {
    const sc = mkScene(p)
    setScenes((prev) => [...prev, sc])
    setSelId(sc.id)
    return sc
  }, [])

  const patch = useCallback((id: string, p: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? mkScene({ ...s, ...p }) : s)))
  }, [])

  // 날씨를 바꾸면 그 날씨의 기본 온도/긴장으로 따라가게(사용자가 이후 미세조정)
  const setWeather = useCallback((id: string, key: string) => {
    const base = W_BY_KEY[key]
    if (!base) return
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, weather: key, warmth: base.warmth, tension: base.tension } : s)))
  }, [])

  const remove = useCallback((id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    if (selId === id) {
      const next = scenes.filter((s) => s.id !== id)
      setSelId(next[0]?.id || null)
    }
  }, [selId, scenes])

  const move = useCallback((id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  // 모든 장면 날씨를 텍스트 단서로 자동 재추정
  const autoGuessAll = useCallback(() => {
    setScenes((prev) => prev.map((s) => {
      const g = guessWeather(s.title, s.note)
      const base = W_BY_KEY[g]
      return { ...s, weather: g, warmth: base.warmth, tension: base.tension }
    }))
    if (mounted.current) setNote('제목·메모 단서로 모든 장면 날씨를 다시 추정했어요.')
  }, [])

  // ── 바인더 드롭 → 장면 추가 ─────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    const it = getDragItem(e)
    dragDepth.current = 0
    setDropHover(false)
    if (!it) return
    e.preventDefault()
    const title = (it.title || '새 장면').trim()
    const w = guessWeather(title, it.text || '')
    addScene({ title, weather: w, note: (it.text || '').slice(0, 300) })
    if (mounted.current) setNote(`「${title}」을(를) ${W_BY_KEY[w].label} 장면으로 추가했어요.`)
  }, [addScene])
  const onDragOver = useCallback((e: React.DragEvent) => { if (isItemDrag(e)) e.preventDefault() }, [])
  const onDragEnter = useCallback((e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current++; setDropHover(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => { if (!isItemDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDropHover(false) }, [])

  // ── 기후 분석(메모이즈) ───────────────────────────────────────────────────────
  const analysis = useMemo(() => computeClimate(scenes), [scenes])

  // ── 리포트 텍스트 ─────────────────────────────────────────────────────────────
  const buildReport = useCallback((): string => {
    const L: string[] = ['# 장면 기상도 리포트', '']
    L.push(`장면 ${scenes.length}개 · 막 ${analysis.acts.length}개`)
    L.push(`평균 체감온도 ${fmt(analysis.avgWarmth)} (-3 추움 ~ +3 따뜻) · 평균 긴장(기압) ${fmt(analysis.avgTension)}/5`)
    L.push(`전체 분위기: ${analysis.overall}`)
    L.push('')
    L.push('## 막별 기후')
    analysis.acts.forEach((a) => {
      L.push(`- ${a.act}막: ${a.count}개 장면 · 우세 날씨 ${W_BY_KEY[a.dominant]?.label || '-'} · 온도 ${fmt(a.warmth)} · 긴장 ${fmt(a.tension)}/5`)
    })
    L.push('')
    L.push('## 장면 순서')
    scenes.forEach((s, i) => {
      const w = W_BY_KEY[s.weather]
      L.push(`${i + 1}. [${s.act}막] ${s.title} — ${w?.label || '?'} (온도 ${s.warmth >= 0 ? '+' : ''}${s.warmth}, 긴장 ${s.tension}/5)${s.note ? ' · ' + s.note : ''}`)
    })
    if (analysis.warnings.length) {
      L.push('')
      L.push('## 점검 제안')
      analysis.warnings.forEach((w) => L.push(`- ${w}`))
    }
    if (analysis.fronts.length) {
      L.push('')
      L.push('## 전선(급변 지점)')
      analysis.fronts.forEach((f) => L.push(`- ${f.from + 1} 에서 ${f.to + 1}: ${scenes[f.from]?.title} 에서 ${scenes[f.to]?.title} (긴장 변화 ${f.delta >= 0 ? '+' : ''}${f.delta})`))
    }
    return L.join('\n') + '\n'
  }, [scenes, analysis])

  // ── 연동 액션 ─────────────────────────────────────────────────────────────────
  const exportReport = useCallback(() => {
    if (!scenes.length) { setNote('장면이 없어 리포트를 만들 수 없어요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    const html = buildReport()
      .split('\n')
      .map((ln) => {
        const e = ln.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (e.startsWith('# ')) return `<h2>${e.slice(2)}</h2>`
        if (e.startsWith('## ')) return `<h3>${e.slice(3)}</h3>`
        if (e.startsWith('- ') || /^\d+\. /.test(e)) return `<p>${e}</p>`
        return e ? `<p>${e}</p>` : ''
      })
      .join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '기상도',
      title: `기상도 리포트 (${scenes.length}장면)`,
      bodyHtml: html,
      synopsis: `전체 분위기: ${analysis.overall}`,
      meta: { 장면수: String(scenes.length), 평균온도: fmt(analysis.avgWarmth), 평균긴장: fmt(analysis.avgTension) },
    })
    if (mounted.current) setNote(id ? '프로젝트 자료 「기상도」 폴더에 리포트를 추가했어요.' : '리포트 추가에 실패했어요.')
  }, [scenes, analysis, buildReport])

  const stashReport = useCallback(() => {
    if (!hasStash()) { setNote('수집함에 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'memo', label: '장면 기상도 리포트', text: buildReport() })
    if (mounted.current) setNote('수집함에 기상도 리포트를 담았어요.')
  }, [buildReport])

  // 선택 장면을 장소 라이브러리에 분위기 카드로 저장
  const saveAsClimatePlace = useCallback(() => {
    if (!sel) return
    const w = W_BY_KEY[sel.weather]
    addToLibrary('places', {
      name: sel.title,
      kind: '장면 분위기',
      mood: w?.label,
      fields: {
        name: sel.title,
        atmosphere: `${w?.label} · 체감온도 ${sel.warmth >= 0 ? '+' : ''}${sel.warmth} · 긴장 ${sel.tension}/5`,
        climate: w?.label || '',
        notes: sel.note || w?.hint || '',
      },
      source: 'scene-weather',
    })
    if (mounted.current) setNote(`「${sel.title}」을(를) 장소 라이브러리에 분위기 카드로 저장했어요.`)
  }, [sel])

  // 라이브러리 장소에서 장면 가져오기
  const importFromPlaces = useCallback(() => {
    if (!places.length) { setNote('가져올 장소 라이브러리 항목이 없어요.'); return }
    const add = places.slice(0, 12).map((p) => {
      const climate = p.fields?.climate || p.fields?.atmosphere || p.mood || ''
      return mkScene({ title: p.name || '장소', weather: guessWeather(p.name || '', climate), note: climate.slice(0, 200) })
    })
    setScenes((prev) => [...prev, ...add])
    if (mounted.current) setNote(`장소 라이브러리에서 ${add.length}개 장면을 가져왔어요.`)
  }, [places])

  const importFromSnippets = useCallback(() => {
    if (!snippets.length) { setNote('가져올 스니펫이 없어요.'); return }
    const add = snippets.slice(0, 8).map((sn) => mkScene({ title: (sn.text || '').slice(0, 24) || '스니펫', weather: guessWeather('', sn.text || ''), note: (sn.text || '').slice(0, 200) }))
    setScenes((prev) => [...prev, ...add])
    if (mounted.current) setNote(`스니펫 ${add.length}개를 장면으로 가져왔어요.`)
  }, [snippets])

  const sendToHeatmap = useCallback(() => {
    if (!sel) return
    openToolLinked('emotion-heatmap', { text: (sel.note || sel.title), title: sel.title })
  }, [sel])

  const sendToTimeline = useCallback(() => {
    openToolLinked('event-timeline', {
      events: scenes.map((s) => ({ title: s.title, when: `${s.act}막`, plotline: W_BY_KEY[s.weather]?.label })),
    })
  }, [scenes])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }

  return (
    <div
      style={dropHover ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" onClick={() => addScene({ title: '새 장면', weather: 'clear', act: scenes[scenes.length - 1]?.act || 1 })}>+ 장면</button>
        <button className="minibtn" onClick={autoGuessAll} title="제목·메모 단서로 모든 장면 날씨 자동 추정">자동 추정</button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['map', 'analysis'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '5px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--accent)' : 'var(--paper)',
              color: tab === t ? '#fff' : 'var(--text)', fontWeight: tab === t ? 700 : 400,
            }}>{t === 'map' ? '기후 지도' : '기후 분석'}</button>
          ))}
        </div>
      </div>

      {dropHover && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--panel)', border: '1px dashed var(--accent)', borderRadius: 10, padding: '10px 16px' }}>여기에 놓아 장면으로 추가</div>
        </div>
      )}

      {note && (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="닫기">✕</button>
        </div>
      )}

      {/* 본문 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 10 }}>
        {scenes.length === 0 ? (
          <Empty onAdd={() => addScene({ title: '새 장면', weather: 'clear' })} onImport={importFromPlaces} hasPlaces={places.length > 0} />
        ) : tab === 'map' ? (
          <ClimateMap scenes={scenes} selId={selId} analysis={analysis} onSelect={setSelId} />
        ) : (
          <Analysis analysis={analysis} scenes={scenes} onSelect={(id) => { setSelId(id); setTab('map') }} />
        )}
      </div>

      {/* 선택 장면 편집 패널 */}
      {sel && tab === 'map' && (
        <Editor
          key={sel.id}
          scene={sel}
          onTitle={(v) => patch(sel.id, { title: v })}
          onWeather={(k) => setWeather(sel.id, k)}
          onWarmth={(v) => patch(sel.id, { warmth: v })}
          onTension={(v) => patch(sel.id, { tension: v })}
          onAct={(v) => patch(sel.id, { act: v })}
          onNote={(v) => patch(sel.id, { note: v })}
          onMove={(d) => move(sel.id, d)}
          onRemove={() => remove(sel.id)}
          canUp={scenes[0]?.id !== sel.id}
          canDown={scenes[scenes.length - 1]?.id !== sel.id}
          onHeatmap={sendToHeatmap}
          onSavePlace={saveAsClimatePlace}
        />
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={exportReport} disabled={!hasProjectBridge() || !scenes.length} title="기후 리포트를 프로젝트 자료에 문서로 추가">프로젝트에 리포트</button>
        <button className="linkbtn" onClick={stashReport} disabled={!hasStash() || !scenes.length} title="기후 리포트를 수집함에 담기">수집함</button>
        <button className="linkbtn" onClick={sendToTimeline} disabled={!scenes.length} title="장면들을 사건 연대표로 보내기">연대표로</button>
        <button className="linkbtn" onClick={importFromPlaces} disabled={!places.length} title="장소 라이브러리에서 장면 가져오기">장소 가져오기{places.length ? ` (${places.length})` : ''}</button>
        {snippets.length > 0 && (
          <button className="linkbtn" onClick={importFromSnippets} title="스니펫 라이브러리에서 장면 가져오기">스니펫 가져오기 ({snippets.length})</button>
        )}
      </div>
    </div>
  )
}

// ── 기후 지도(가로 스트립) ────────────────────────────────────────────────────
function ClimateMap({
  scenes, selId, analysis, onSelect,
}: {
  scenes: Scene[]
  selId: string | null
  analysis: Climate
  onSelect: (id: string) => void
}) {
  const H = 150 // 그래프 높이
  const colW = 38
  const width = Math.max(scenes.length * colW, 60)
  // 긴장(기압) 선 좌표: y 가 작을수록 높은 긴장
  const pts = scenes.map((s, i) => {
    const x = i * colW + colW / 2
    const y = H - 14 - (s.tension / 5) * (H - 30)
    return { x, y }
  })
  const linePath = pts.length
    ? 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
    : ''
  const frontSet = new Set(analysis.fronts.map((f) => f.to))

  return (
    <div>
      {/* 막 띠 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 6, minWidth: width }}>
        {analysis.actSpans.map((sp, i) => (
          <div key={i} style={{
            flex: `0 0 ${sp.len * colW}px`, fontSize: 10.5, color: 'var(--muted)',
            textAlign: 'center', borderLeft: i === 0 ? 'none' : '1px dashed var(--border)',
            padding: '1px 0', fontWeight: 600,
          }}>{sp.act}막</div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6 }}>
        <div style={{ minWidth: width }}>
          {/* 날씨 색 띠 */}
          <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {scenes.map((s) => {
              const w = W_BY_KEY[s.weather]
              return (
                <div key={s.id} onClick={() => onSelect(s.id)} title={`${s.title} — ${w?.label}`}
                  style={{
                    width: colW, height: '100%', background: weatherColor(w, 0.92), cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: w.warmth <= -1 ? '#fff' : '#1a1a1a', fontSize: 14, fontWeight: 700,
                    boxShadow: s.id === selId ? 'inset 0 0 0 2px var(--accent)' : 'none',
                    borderRight: '1px solid rgba(255,255,255,0.25)',
                  }}>{w.sym}</div>
              )
            })}
          </div>

          {/* 긴장(기압) 선 그래프 */}
          <svg width={width} height={H} style={{ display: 'block', marginTop: 4 }}>
            {/* 격자선 */}
            {[0, 1, 2, 3, 4, 5].map((g) => {
              const y = H - 14 - (g / 5) * (H - 30)
              return <line key={g} x1={0} y1={y} x2={width} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray={g === 0 ? '' : '2 3'} />
            })}
            {/* 전선(급변) 세로 표시 */}
            {analysis.fronts.map((f, i) => {
              const x = f.to * colW
              return <line key={'fr' + i} x1={x} y1={2} x2={x} y2={H - 14} stroke="var(--warn)" strokeWidth={1.4} strokeDasharray="3 2" />
            })}
            {/* 긴장 선 */}
            {linePath && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
            {/* 점 */}
            {pts.map((p, i) => {
              const s = scenes[i]
              const w = W_BY_KEY[s.weather]
              return (
                <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={s.id === selId ? 6 : 4.5}
                    fill={weatherColor(w, 1)} stroke={frontSet.has(i) ? 'var(--warn)' : '#fff'} strokeWidth={s.id === selId ? 2 : 1.4} />
                  <text x={p.x} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--muted)">{i + 1}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* 범례 */}
      <div style={{ fontSize: 10.5, color: 'var(--muted)', margin: '6px 2px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span>가로축 = 장면 순서 · 색 = 날씨 · 선 = 긴장(기압) · 점선(주황) = 급변 전선</span>
        <span>장면을 누르면 아래에서 편집</span>
      </div>

      {/* 카드 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {scenes.map((s, i) => {
          const w = W_BY_KEY[s.weather]
          return (
            <div key={s.id} onClick={() => onSelect(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
              background: s.id === selId ? 'color-mix(in srgb, var(--accent) 12%, var(--paper))' : 'var(--paper)',
              border: '1px solid var(--border)', borderLeft: `4px solid ${weatherColor(w, 1)}`,
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: weatherColor(w, 0.9), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: w.warmth <= -1 ? '#fff' : '#1a1a1a', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{w.sym}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>{w?.label} · {s.act}막</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 편집 패널 ─────────────────────────────────────────────────────────────────
function Editor({
  scene, onTitle, onWeather, onWarmth, onTension, onAct, onNote, onMove, onRemove, canUp, canDown, onHeatmap, onSavePlace,
}: {
  scene: Scene
  onTitle: (v: string) => void
  onWeather: (k: string) => void
  onWarmth: (v: number) => void
  onTension: (v: number) => void
  onAct: (v: number) => void
  onNote: (v: string) => void
  onMove: (d: -1 | 1) => void
  onRemove: () => void
  canUp: boolean
  canDown: boolean
  onHeatmap: () => void
  onSavePlace: () => void
}) {
  const w = W_BY_KEY[scene.weather]
  const inputBase: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: 13, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px', flexShrink: 0, background: 'var(--panel)', maxHeight: 290, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <input className="field" style={inputBase} value={scene.title} onChange={(e) => onTitle(e.target.value)} placeholder="장면 제목" maxLength={120} />
        <button className="minibtn" disabled={!canUp} onClick={() => onMove(-1)} title="위로">▲</button>
        <button className="minibtn" disabled={!canDown} onClick={() => onMove(1)} title="아래로">▼</button>
      </div>

      {/* 날씨 선택 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 4, marginBottom: 7 }}>
        {WEATHERS.map((wk) => (
          <button key={wk.key} onClick={() => onWeather(wk.key)} title={wk.hint} style={{
            padding: '5px 2px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
            border: `1px solid ${scene.weather === wk.key ? weatherColor(wk, 1) : 'var(--border)'}`,
            background: scene.weather === wk.key ? weatherColor(wk, 0.22) : 'var(--paper)',
            color: 'var(--text)', fontWeight: scene.weather === wk.key ? 700 : 400,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          }}>
            <span style={{ fontSize: 14 }}>{wk.sym}</span>{wk.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 7 }}>{w?.hint}</div>

      {/* 슬라이더: 온도 / 긴장 / 막 */}
      <Slider label="체감온도" min={-3} max={3} value={scene.warmth} onChange={onWarmth}
        leftLabel="추움" rightLabel="따뜻" fmt={(v) => (v >= 0 ? '+' + v : String(v))} />
      <Slider label="긴장(기압)" min={0} max={5} value={scene.tension} onChange={onTension}
        leftLabel="평온" rightLabel="격렬" fmt={(v) => v + '/5'} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', minWidth: 56 }}>막(act)</span>
        <input type="number" min={1} max={9} value={scene.act} onChange={(e) => onAct(Number(e.target.value))}
          style={{ ...inputBase, width: 70 }} />
      </div>

      <textarea className="field" style={{ ...inputBase, minHeight: 44, resize: 'vertical', lineHeight: 1.5, marginTop: 4 }}
        value={scene.note} onChange={(e) => onNote(e.target.value)} placeholder="이 장면의 분위기 메모(자동 추정에 반영됨)" maxLength={600} />

      <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={onHeatmap} title="이 장면 메모를 감정 히트맵으로 분석">히트맵 분석</button>
        <button className="minibtn" onClick={onSavePlace} title="이 장면을 장소 라이브러리에 분위기 카드로 저장">장소로 저장</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={onRemove}>삭제</button>
      </div>
    </div>
  )
}

function Slider({ label, min, max, value, onChange, leftLabel, rightLabel, fmt: fmtFn }: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void
  leftLabel: string; rightLabel: string; fmt: (v: number) => string
}) {
  return (
    <div style={{ margin: '5px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)', marginBottom: 2 }}>
        <span>{label}</span>
        <strong style={{ color: 'var(--text)' }}>{fmtFn(value)}</strong>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  )
}

// ── 분석 탭 ───────────────────────────────────────────────────────────────────
function Analysis({ analysis, scenes, onSelect }: { analysis: Climate; scenes: Scene[]; onSelect: (id: string) => void }) {
  const a = analysis
  const bar = (v: number, max: number, color: string) => (
    <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${max ? Math.round((v / max) * 100) : 0}%`, height: '100%', background: color }} />
    </div>
  )
  const maxDist = Math.max(1, ...a.dist.map((d) => d.n))
  return (
    <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <Stat label="전체 분위기" value={a.overall} />
        <Stat label="평균 체감온도" value={`${fmt(a.avgWarmth)} / ±3`} />
        <Stat label="평균 긴장" value={`${fmt(a.avgTension)} / 5`} />
        <Stat label="장면 / 막" value={`${scenes.length} / ${a.acts.length}`} />
      </div>

      {/* 날씨 분포 */}
      <div>
        <h4 style={{ margin: '0 0 6px', fontSize: 12.5 }}>날씨 분포</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {a.dist.filter((d) => d.n > 0).map((d) => {
            const w = W_BY_KEY[d.key]
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 56, fontSize: 11.5, color: 'var(--muted)' }}>{w.sym} {w.label}</span>
                {bar(d.n, maxDist, weatherColor(w, 1))}
                <span style={{ width: 22, textAlign: 'right', fontSize: 11.5 }}>{d.n}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 막별 기후 */}
      <div>
        <h4 style={{ margin: '0 0 6px', fontSize: 12.5 }}>막별 기후</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {a.acts.map((act) => {
            const w = W_BY_KEY[act.dominant]
            return (
              <div key={act.act} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, borderLeft: `4px solid ${weatherColor(w, 1)}` }}>
                <strong style={{ minWidth: 34 }}>{act.act}막</strong>
                <span style={{ flex: 1, fontSize: 11.5 }}>우세 {w?.label} · {act.count}개</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>온도 {fmt(act.warmth)} · 긴장 {fmt(act.tension)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 점검 제안 */}
      <div>
        <h4 style={{ margin: '0 0 6px', fontSize: 12.5 }}>점검 제안</h4>
        {a.warnings.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>기후 리듬이 비교적 건강합니다. 단조 구간이나 평탄한 절정이 보이지 않아요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {a.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 7, background: 'color-mix(in srgb, var(--warn) 10%, var(--paper))', border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--border))' }}>{w}</div>
            ))}
          </div>
        )}
      </div>

      {/* 전선 */}
      {a.fronts.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 12.5 }}>급변 전선 (긴장 큰 변동)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {a.fronts.map((f, i) => (
              <div key={i} onClick={() => { const id = scenes[f.to]?.id; if (id) onSelect(id) }} style={{ fontSize: 11.5, padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer' }}>
                {f.from + 1} 에서 {f.to + 1}: {scenes[f.from]?.title} 에서 {scenes[f.to]?.title}
                <span style={{ color: f.delta >= 0 ? 'var(--warn)' : 'var(--accent)', marginLeft: 6, fontWeight: 700 }}>긴장 {f.delta >= 0 ? '+' : ''}{f.delta}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--paper)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Empty({ onAdd, onImport, hasPlaces }: { onAdd: () => void; onImport: () => void; hasPlaces: boolean }) {
  return (
    <div style={{ height: '100%', minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 12, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>아직 장면이 없어요</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
        장면마다 감정 "날씨"를 배정하면<br />작품 전체의 기후 리듬이 한눈에 보입니다.<br />
        좌측 바인더 문서를 끌어다 놓거나, 라이브러리에서 가져오세요.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={onAdd}>+ 첫 장면 추가</button>
        {hasPlaces && <button className="minibtn" onClick={onImport}>장소에서 가져오기</button>}
      </div>
    </div>
  )
}

// ── 기후 계산 ──────────────────────────────────────────────────────────────────
interface ActStat { act: number; count: number; dominant: string; warmth: number; tension: number }
interface Front { from: number; to: number; delta: number }
interface Climate {
  avgWarmth: number
  avgTension: number
  overall: string
  acts: ActStat[]
  actSpans: { act: number; len: number }[]
  dist: { key: string; n: number }[]
  warnings: string[]
  fronts: Front[]
}

function computeClimate(scenes: Scene[]): Climate {
  const n = scenes.length
  const avgWarmth = n ? scenes.reduce((a, s) => a + s.warmth, 0) / n : 0
  const avgTension = n ? scenes.reduce((a, s) => a + s.tension, 0) / n : 0

  // 분포
  const distMap: Record<string, number> = {}
  for (const s of scenes) distMap[s.weather] = (distMap[s.weather] || 0) + 1
  const dist = WEATHERS.map((w) => ({ key: w.key, n: distMap[w.key] || 0 }))

  // 막별
  const actMap = new Map<number, Scene[]>()
  for (const s of scenes) { const arr = actMap.get(s.act) || []; arr.push(s); actMap.set(s.act, arr) }
  const acts: ActStat[] = [...actMap.keys()].sort((a, b) => a - b).map((act) => {
    const arr = actMap.get(act)!
    const dm: Record<string, number> = {}
    for (const s of arr) dm[s.weather] = (dm[s.weather] || 0) + 1
    let dominant = arr[0].weather, dn = 0
    for (const k in dm) if (dm[k] > dn) { dn = dm[k]; dominant = k }
    return {
      act, count: arr.length, dominant,
      warmth: arr.reduce((a, s) => a + s.warmth, 0) / arr.length,
      tension: arr.reduce((a, s) => a + s.tension, 0) / arr.length,
    }
  })

  // 막 스팬(지도 띠) — 순서대로 같은 act 연속 묶음
  const actSpans: { act: number; len: number }[] = []
  for (const s of scenes) {
    const last = actSpans[actSpans.length - 1]
    if (last && last.act === s.act) last.len++
    else actSpans.push({ act: s.act, len: 1 })
  }

  // 전선: 인접 장면 긴장 변화 |Δ| >= 3
  const fronts: Front[] = []
  for (let i = 1; i < n; i++) {
    const d = scenes[i].tension - scenes[i - 1].tension
    if (Math.abs(d) >= 3) fronts.push({ from: i - 1, to: i, delta: d })
  }

  // 경보들
  const warnings: string[] = []
  // 1) 같은 날씨 4연속 이상 → 단조
  let run = 1
  for (let i = 1; i < n; i++) {
    if (scenes[i].weather === scenes[i - 1].weather) {
      run++
      if (run === 4) warnings.push(`${i - 2}번에서 ${i + 1}번 장면이 같은 날씨(${W_BY_KEY[scenes[i].weather]?.label})로 이어집니다. 분위기 변주를 주면 좋아요.`)
    } else run = 1
  }
  // 2) 긴장 변화가 거의 없는 평탄(표준편차 작음)
  if (n >= 4) {
    const mean = avgTension
    const sd = Math.sqrt(scenes.reduce((a, s) => a + (s.tension - mean) ** 2, 0) / n)
    if (sd < 0.6) warnings.push('전반적으로 긴장 기복이 평탄합니다. 굴곡(맑음에서 폭풍으로)을 넣어 리듬을 살려 보세요.')
  }
  // 3) 절정(최고 긴장)이 전반부에 몰려 있으면
  if (n >= 5) {
    let peakI = 0
    for (let i = 1; i < n; i++) if (scenes[i].tension > scenes[peakI].tension) peakI = i
    if (scenes[peakI].tension >= 4 && peakI < n * 0.5) warnings.push('가장 강한 폭풍(절정)이 전반부에 있습니다. 클라이맥스를 후반으로 옮기면 긴장이 더 쌓여요.')
  }
  // 4) 모든 장면이 따뜻하거나 모두 차가우면
  if (n >= 4) {
    if (scenes.every((s) => s.warmth >= 1)) warnings.push('모든 장면이 따뜻한 톤입니다. 차가운 장면을 넣어 대비를 만들면 따뜻함이 더 살아납니다.')
    else if (scenes.every((s) => s.warmth <= -1)) warnings.push('모든 장면이 차가운 톤입니다. 잠깐의 맑은 날(숨 고르기)을 넣으면 무게가 더 묵직해져요.')
  }

  // 전체 분위기 라벨
  let overall: string
  if (!n) overall = '데이터 없음'
  else if (avgTension >= 3.5) overall = avgWarmth >= 0 ? '들끓는 격동' : '폭풍우 치는 어둠'
  else if (avgTension >= 2) overall = avgWarmth >= 1 ? '변덕스러운 한낮' : '흐리고 불안한'
  else overall = avgWarmth >= 1 ? '온화하고 맑은' : avgWarmth <= -1 ? '서늘하고 고요한' : '잔잔한 평지'

  return { avgWarmth, avgTension, overall, acts, actSpans, dist, warnings, fronts }
}

function fmt(v: number): string {
  const r = Math.round(v * 10) / 10
  return (r >= 0 ? '+' : '') + r.toFixed(1)
}
