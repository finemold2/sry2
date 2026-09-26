// 감정 컬러그레이딩 — 챕터(장면)별 무드를 '영화식 색보정(color grading)' 팔레트로 자동 매핑한다.
//  각 챕터에 감정 키워드(예: 긴장·평온·분노·향수)와 강도를 주면, 결정론적 알고리즘이
//  섀도/미드톤/하이라이트 3색의 시네마틱 그레이드와 LUT 무드(틸&오렌지, 블리치바이패스 등)를 만든다.
//  전체 챕터를 가로 그라데이션 '톤 흐름 맵'으로 펼쳐 작품의 감정 온도/명도/채도 곡선을 진단하고,
//  무드보드/갤러리/팔레트 도구와 연계한다. 완전 로컬(외부 네트워크 없음)·결정론적.
//
// 규약: react 와 './linkbus' 외 import 금지 · localStorage 'sry:tool:emotional-color-grade' 영속 ·
//       언마운트 정리 · UI 한국어(본문 텍스트에 생이모지 글리프 금지).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  useLibraryList, addToLibrary,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  getDragItem, isItemDrag,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'emotional-color-grade',
  name: '감정 컬러그레이딩',
  icon: '🌈',
  group: '분위기·시각',
  intro: '챕터별 무드를 영화식 색보정 팔레트로 매핑해 톤 흐름 맵을 그린다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:emotional-color-grade'

// ── 색 유틸 ──────────────────────────────────────────────────
interface RGB { r: number; g: number; b: number }
function clamp(n: number, lo = 0, hi = 255): number { return n < lo ? lo : n > hi ? hi : n }
function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}
function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b)
}
function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0)
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h *= 60
  }
  return { h, s, l }
}
function luminance({ r, g, b }: RGB): number { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

// 결정론적 문자열 해시(시드)
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

// ── 감정 사전 ────────────────────────────────────────────────
// 각 감정 → 기준 색상(hue), 채도/명도 성향, 색온도(warm>0/cool<0), 짧은 한국어 별칭들.
interface MoodDef { key: string; label: string; hue: number; sat: number; light: number; temp: number; aliases: string[] }
const MOODS: MoodDef[] = [
  { key: 'tension', label: '긴장', hue: 8, sat: 0.55, light: 0.34, temp: 0.4, aliases: ['긴장', '불안', '서스펜스', '조마조마', '경계'] },
  { key: 'fear', label: '공포', hue: 268, sat: 0.42, light: 0.20, temp: -0.6, aliases: ['공포', '두려움', '무서움', '오싹', '섬뜩'] },
  { key: 'anger', label: '분노', hue: 0, sat: 0.78, light: 0.42, temp: 0.8, aliases: ['분노', '화', '격노', '증오', '적개심'] },
  { key: 'sad', label: '슬픔', hue: 212, sat: 0.40, light: 0.42, temp: -0.7, aliases: ['슬픔', '비애', '눈물', '상실', '애도', '우울'] },
  { key: 'calm', label: '평온', hue: 168, sat: 0.34, light: 0.62, temp: -0.2, aliases: ['평온', '고요', '안정', '잔잔', '휴식', '평화'] },
  { key: 'joy', label: '기쁨', hue: 46, sat: 0.72, light: 0.62, temp: 0.7, aliases: ['기쁨', '환희', '행복', '즐거움', '들뜸', '설렘'] },
  { key: 'hope', label: '희망', hue: 92, sat: 0.50, light: 0.60, temp: 0.3, aliases: ['희망', '기대', '재기', '회복', '여명'] },
  { key: 'love', label: '사랑', hue: 338, sat: 0.55, light: 0.58, temp: 0.5, aliases: ['사랑', '애정', '로맨스', '연정', '두근'] },
  { key: 'nostalgia', label: '향수', hue: 32, sat: 0.45, light: 0.52, temp: 0.6, aliases: ['향수', '추억', '그리움', '회상', '아련'] },
  { key: 'mystery', label: '신비', hue: 250, sat: 0.50, light: 0.40, temp: -0.4, aliases: ['신비', '미스터리', '의문', '비밀', '몽환'] },
  { key: 'despair', label: '절망', hue: 222, sat: 0.20, light: 0.24, temp: -0.5, aliases: ['절망', '체념', '암울', '나락', '무력'] },
  { key: 'wonder', label: '경이', hue: 196, sat: 0.62, light: 0.56, temp: -0.1, aliases: ['경이', '경외', '놀라움', '벅참', '황홀'] },
  { key: 'cold', label: '냉혹', hue: 200, sat: 0.30, light: 0.46, temp: -0.8, aliases: ['냉혹', '냉정', '무심', '차가움', '비정'] },
  { key: 'warmth', label: '온기', hue: 28, sat: 0.58, light: 0.58, temp: 0.9, aliases: ['온기', '포근', '다정', '따뜻', '안온'] },
  { key: 'chaos', label: '혼돈', hue: 312, sat: 0.66, light: 0.46, temp: 0.2, aliases: ['혼돈', '혼란', '광기', '뒤엉킴', '소용돌이'] },
]
const MOOD_BY_KEY: Record<string, MoodDef> = Object.fromEntries(MOODS.map((m) => [m.key, m]))

// 별칭(감정키, 별칭) 쌍을 별칭 길이 내림차순으로 정렬 — 긴 별칭 우선 매칭으로
// '평화'(평온) 가 단일 글자 '화'(분노) 부분문자열 오탐보다 먼저 잡히도록 한다.
const ALIAS_RANK: Array<{ key: string; alias: string }> = MOODS
  .flatMap((m) => m.aliases.map((a) => ({ key: m.key, alias: a.toLowerCase() })))
  .sort((x, y) => y.alias.length - x.alias.length)

function detectMood(text: string): string {
  const t = (text || '').toLowerCase()
  for (const { key, alias } of ALIAS_RANK) if (t.includes(alias)) return key
  // 없으면 텍스트 해시로 결정론적 배정
  return MOODS[hashStr(t || 'x') % MOODS.length].key
}

// ── LUT(시네마틱 그레이드 프리셋) ────────────────────────────
// 섀도/하이라이트로 끌어당길 색조 + 대비/채도 보정. temp 부호로 따뜻/차가움 선택.
interface Lut { key: string; label: string; desc: string; shadowHue: number; highHue: number; contrast: number; satMul: number }
const LUTS: Lut[] = [
  { key: 'teal-orange', label: '틸 & 오렌지', desc: '섀도는 청록, 살결·하이라이트는 주황 — 블록버스터 표준', shadowHue: 188, highHue: 30, contrast: 1.18, satMul: 1.1 },
  { key: 'bleach', label: '블리치 바이패스', desc: '채도를 빼고 대비를 올린 거칠고 강렬한 룩', shadowHue: 210, highHue: 48, contrast: 1.42, satMul: 0.55 },
  { key: 'noir', label: '느와르', desc: '깊은 어둠과 한 줄기 빛, 차가운 그림자', shadowHue: 224, highHue: 210, contrast: 1.5, satMul: 0.4 },
  { key: 'pastel', label: '파스텔 드림', desc: '들어 올린 섀도와 부드러운 채도의 몽환적 톤', shadowHue: 280, highHue: 52, contrast: 0.86, satMul: 0.9 },
  { key: 'golden', label: '골든 아워', desc: '황금빛으로 물든 따뜻한 역광의 시간', shadowHue: 24, highHue: 44, contrast: 1.08, satMul: 1.2 },
  { key: 'sodium', label: '소듐 나이트', desc: '주황 가로등과 검푸른 밤의 도시', shadowHue: 232, highHue: 36, contrast: 1.28, satMul: 1.0 },
  { key: 'forest', label: '딥 포레스트', desc: '이끼와 안개, 초록과 회청의 자연 룩', shadowHue: 168, highHue: 96, contrast: 1.04, satMul: 1.05 },
  { key: 'rose', label: '로즈 글로', desc: '분홍과 호박색이 번지는 로맨틱 톤', shadowHue: 330, highHue: 38, contrast: 0.98, satMul: 1.12 },
]
const LUT_BY_KEY: Record<string, Lut> = Object.fromEntries(LUTS.map((l) => [l.key, l]))

// 감정 → 어울리는 LUT 추천(결정론적)
function suggestLut(moodKey: string, intensity: number): string {
  const m = MOOD_BY_KEY[moodKey]
  if (!m) return 'teal-orange'
  if (m.key === 'fear' || m.key === 'despair' || m.key === 'cold') return 'noir'
  if (m.key === 'sad' || m.key === 'mystery') return 'sodium'
  if (m.key === 'joy' || m.key === 'hope') return 'pastel'
  if (m.key === 'love' || m.key === 'warmth') return 'rose'
  if (m.key === 'nostalgia' || m.key === 'calm') return 'golden'
  if (m.key === 'wonder') return 'forest'
  if (m.key === 'anger' || m.key === 'chaos' || m.key === 'tension') return intensity >= 6 ? 'bleach' : 'teal-orange'
  return 'teal-orange'
}

// ── 그레이드 생성(섀도/미드/하이라이트 3색) ─────────────────
interface Grade { shadow: string; mid: string; high: string; accent: string; temp: number; sat: number; lum: number }
function buildGrade(moodKey: string, intensity: number, lutKey: string, seed: number): Grade {
  const m = MOOD_BY_KEY[moodKey] || MOODS[0]
  const lut = LUT_BY_KEY[lutKey] || LUTS[0]
  const k = Math.max(1, Math.min(10, intensity)) / 10
  // 미드톤: 감정 기준색, 강도에 따라 채도 강화
  const midRgb = hslToRgb(m.hue + (((seed % 21) - 10) * 0.6), Math.min(0.95, m.sat * lut.satMul * (0.7 + 0.6 * k)), m.light)
  // 섀도: LUT 섀도색조로 끌어당기고 명도를 낮춤(대비)
  const shLight = Math.max(0.06, m.light - 0.22 * lut.contrast)
  const shRgb = hslToRgb(lut.shadowHue, Math.min(0.9, (m.sat * 0.7 + 0.15) * lut.satMul), shLight)
  // 하이라이트: LUT 하이라이트색조 + 밝게
  const hiLight = Math.min(0.94, m.light + 0.26 * lut.contrast)
  const hiRgb = hslToRgb(lut.highHue, Math.min(0.85, m.sat * 0.5 * lut.satMul + 0.1), hiLight)
  // 미드톤을 섀도/하이라이트 쪽으로 살짝 합성해 일관된 그레이드
  const mid2 = mix(mix(midRgb, shRgb, 0.12), hiRgb, 0.1)
  // 액센트: 보색 근처(긴장감/대비 요소)
  const accRgb = hslToRgb(m.hue + 150 + (seed % 40), Math.min(0.95, m.sat * lut.satMul + 0.15), 0.52)
  const lum = luminance(mid2)
  const hsl = rgbToHsl(mid2)
  return { shadow: toHex(shRgb), mid: toHex(mid2), high: toHex(hiRgb), accent: toHex(accRgb), temp: m.temp, sat: hsl.s, lum }
}

// ── 챕터 ──────────────────────────────────────────────────────
interface Chapter {
  id: string
  title: string
  mood: string        // mood key
  intensity: number   // 1~10
  lut: string         // lut key
  note: string
}
function newChapter(title = '', moodHint = '', note = ''): Chapter {
  const mood = moodHint ? detectMood(moodHint || title) : detectMood(title || '평온')
  const intensity = 5 + (hashStr(title + moodHint) % 4) - 1
  return {
    id: 'ch_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36),
    title: title || '새 챕터',
    mood,
    intensity: Math.max(1, Math.min(10, intensity)),
    lut: suggestLut(mood, intensity),
    note,
  }
}

// ── 영속 ──────────────────────────────────────────────────────
interface Persist { chapters: Chapter[] }
function load(): Persist | null {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw) as Persist } catch { /* noop */ }
  return null
}
function save(p: Persist) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)) } catch { /* noop */ } }

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const DEMO_TITLES: Array<[string, string]> = [
  ['프롤로그 — 잿빛 아침', '불안한 적막'],
  ['재회', '두근거리는 설렘'],
  ['균열', '터져 나온 분노'],
  ['추락', '깊은 절망'],
  ['긴 밤', '오싹한 공포'],
  ['새벽의 결심', '되살아나는 희망'],
]

interface Props { payload?: Record<string, unknown> }

export default function EmotionalColorGrade({ payload }: Props = {}) {
  const persisted = useMemo(() => load(), [])
  const [chapters, setChapters] = useState<Chapter[]>(() => persisted?.chapters && persisted.chapters.length ? persisted.chapters : [])
  const [sel, setSel] = useState<number>(0)
  const [dragOver, setDragOver] = useState(false)
  const [bulk, setBulk] = useState('')
  const [savedFlash, setSavedFlash] = useState('')
  const places = useLibraryList('places')
  const images = useLibraryList('images')
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 최신 챕터 길이를 stale 없이 참조(add/move 의 sel 동기화에 사용)
  const chaptersRef = useRef(chapters)
  chaptersRef.current = chapters

  // payload 수용: text(원고/장면) 또는 chapters(연계 전달)
  useEffect(() => {
    if (!payload) return
    const incoming: Chapter[] = []
    if (Array.isArray(payload.chapters)) {
      for (const c of payload.chapters as Array<Record<string, unknown>>) {
        const title = String(c.title || '')
        if (title) incoming.push(newChapter(title, String(c.mood || c.note || ''), String(c.note || '')))
      }
    }
    const ptext = typeof payload.text === 'string' ? payload.text : ''
    if (ptext.trim()) {
      const lines = ptext.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 12)
      for (const ln of lines) incoming.push(newChapter(ln.slice(0, 40), ln))
    }
    if (incoming.length) setChapters((prev) => [...prev, ...incoming])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { save({ chapters }) }, [chapters])
  useEffect(() => () => { if (flashRef.current) clearTimeout(flashRef.current) }, [])

  const flash = useCallback((msg: string) => {
    setSavedFlash(msg)
    if (flashRef.current) clearTimeout(flashRef.current)
    flashRef.current = setTimeout(() => setSavedFlash(''), 1800)
  }, [])

  // 각 챕터의 그레이드(메모)
  const grades = useMemo(() => chapters.map((c) => buildGrade(c.mood, c.intensity, c.lut, hashStr(c.id + c.title))), [chapters])

  const cur = chapters[sel]
  const curGrade = grades[sel]

  // ── 흐름 진단 ──────────────────────────────────────────────
  const diag = useMemo(() => {
    if (chapters.length < 2) return null
    const temps = chapters.map((c) => MOOD_BY_KEY[c.mood]?.temp ?? 0)
    const lums = grades.map((g) => g.lum)
    const sats = grades.map((g) => g.sat)
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
    const range = (a: number[]) => Math.max(...a) - Math.min(...a)
    // 인접 변화량
    let swing = 0
    for (let i = 1; i < temps.length; i++) swing += Math.abs(temps[i] - temps[i - 1])
    swing /= (temps.length - 1)
    const warmShare = temps.filter((t) => t > 0.15).length / temps.length
    const issues: string[] = []
    if (range(lums) < 0.18) issues.push('명도 변화가 거의 없어 시각적으로 단조로울 수 있습니다. 어두운/밝은 챕터를 섞어 보세요.')
    if (range(sats) < 0.12) issues.push('채도 폭이 좁습니다. 절정부의 채도를 끌어올려 대비를 주세요.')
    if (swing > 0.7) issues.push('색온도가 챕터마다 급변합니다. 감정 전환에 다리 역할을 할 중간 톤 챕터를 고려하세요.')
    if (swing < 0.12 && chapters.length > 3) issues.push('온도 변화가 너무 평탄합니다. 전환점에서 따뜻함/차가움을 대비시키면 좋습니다.')
    if (warmShare > 0.85) issues.push('대부분 따뜻한 톤입니다. 차가운 장면 한둘로 호흡을 주세요.')
    if (warmShare < 0.15) issues.push('대부분 차가운 톤입니다. 따뜻한 장면으로 온기를 한 번 줘 보세요.')
    if (!issues.length) issues.push('명도·채도·온도 흐름이 균형 잡혀 있습니다. 좋은 톤 곡선입니다.')
    return { avgTemp: avg(temps), lumRange: range(lums), satRange: range(sats), swing, warmShare, issues }
  }, [chapters, grades])

  // ── 챕터 조작 ──────────────────────────────────────────────
  const add = (title = '', hint = '', note = '') => {
    const item = newChapter(title, hint, note)
    setChapters((prev) => [...prev, item])
    // 추가된 마지막 항목 선택: prev 기준 길이(setSel 함수형 업데이터에서 chaptersRef 로 계산)
    setSel(() => chaptersRef.current.length)
  }
  const update = (i: number, patch: Partial<Chapter>) => {
    setChapters((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }
  const remove = (i: number) => {
    const next = chapters.filter((_, idx) => idx !== i)
    setChapters(next)
    setSel((s) => Math.max(0, Math.min(s, next.length - 1)))
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    // 경계 검사도 stale 없이 최신 길이 기준
    if (j < 0 || j >= chaptersRef.current.length) return
    setChapters((prev) => {
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]; const t = next[i]; next[i] = next[j]; next[j] = t
      return next
    })
    setSel(j)
  }
  const loadDemo = () => {
    setChapters(DEMO_TITLES.map(([t, h]) => newChapter(t, h)))
    setSel(0)
  }
  const importBulk = () => {
    const lines = bulk.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    if (!lines.length) return
    const made = lines.map((ln) => {
      // "제목 | 무드힌트" 또는 "제목"
      const parts = ln.split('|').map((s) => s.trim())
      return newChapter(parts[0].slice(0, 60), parts[1] || parts[0], '')
    })
    setChapters((prev) => [...prev, ...made])
    setBulk('')
    flash(made.length + '개 챕터를 추가했습니다')
  }

  // ── 드롭 수용(바인더 문서) ─────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const it = getDragItem(e)
    if (it) {
      const hint = (it.text || it.title || '').slice(0, 400)
      add(it.title || '문서', hint, (it.text || '').slice(0, 120))
      flash('바인더 문서를 챕터로 추가했습니다')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  // ── 산출물 내보내기 ────────────────────────────────────────
  const buildReportHtml = (): string => {
    const rows = chapters.map((c, i) => {
      const g = grades[i]
      const m = MOOD_BY_KEY[c.mood]
      const l = LUT_BY_KEY[c.lut]
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(c.title)}</td>
        <td>${esc(m?.label || c.mood)} (강도 ${c.intensity})</td>
        <td>${esc(l?.label || c.lut)}</td>
        <td style="background:${g.shadow}">${g.shadow}</td>
        <td style="background:${g.mid}">${g.mid}</td>
        <td style="background:${g.high}">${g.high}</td>
        <td style="background:${g.accent}">${g.accent}</td>
        <td>${esc(c.note)}</td>
      </tr>`
    }).join('')
    const diagHtml = diag ? `<p><b>톤 흐름 진단</b></p><ul>${diag.issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
    return `<h2>감정 컬러그레이딩 — 톤 흐름 맵</h2>
      <table border="1" cellspacing="0" cellpadding="4">
      <tr><th>#</th><th>챕터</th><th>감정/강도</th><th>LUT</th><th>섀도</th><th>미드</th><th>하이라이트</th><th>액센트</th><th>메모</th></tr>
      ${rows}</table>${diagHtml}`
  }

  const exportToProject = () => {
    if (!chapters.length) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분위기',
      title: '컬러그레이딩 톤 흐름 맵',
      bodyHtml: buildReportHtml(),
      synopsis: `${chapters.length}개 챕터의 감정 색보정 흐름`,
      meta: { 챕터수: String(chapters.length), 평균온도: diag ? diag.avgTemp.toFixed(2) : '0' },
    })
    flash(id ? '프로젝트 자료에 추가했습니다' : '프로젝트에 연결되어 있지 않습니다')
  }

  const stashCurrent = () => {
    if (!cur || !curGrade) return
    const m = MOOD_BY_KEY[cur.mood]
    addToStash({
      kind: 'memo',
      label: `그레이드 · ${cur.title}`,
      text: `${cur.title} / 감정 ${m?.label}(${cur.intensity}) / LUT ${LUT_BY_KEY[cur.lut]?.label}\n섀도 ${curGrade.shadow}  미드 ${curGrade.mid}  하이라이트 ${curGrade.high}  액센트 ${curGrade.accent}`,
    })
    flash('수집함에 담았습니다')
  }

  const saveAsPlace = () => {
    if (!cur || !curGrade) return
    const m = MOOD_BY_KEY[cur.mood]
    addToLibrary('places', {
      name: cur.title,
      mood: m?.label,
      fields: {
        name: cur.title,
        atmosphere: `${m?.label} (강도 ${cur.intensity}) · ${LUT_BY_KEY[cur.lut]?.label}`,
        appearance: `색보정 — 섀도 ${curGrade.shadow}, 미드톤 ${curGrade.mid}, 하이라이트 ${curGrade.high}, 액센트 ${curGrade.accent}`,
        notes: cur.note || '',
      },
      source: '감정 컬러그레이딩',
    })
    flash('장소 라이브러리에 무드로 저장했습니다')
  }

  const importPlacesAsChapters = () => {
    if (!places.length) return
    const made = places.slice(0, 12).map((p) => newChapter(
      p.name || '장소',
      (p.mood || p.fields?.atmosphere || p.fields?.appearance || p.name || '') as string,
    ))
    setChapters((prev) => [...prev, ...made])
    flash(made.length + '개 장소를 챕터로 가져왔습니다')
  }

  const sendToMoodboard = () => {
    if (!cur) return
    const m = MOOD_BY_KEY[cur.mood]
    openToolLinked('moodboard-grid', { query: `${cur.title} ${m?.label}` })
  }
  const sendToGallery = () => {
    if (!cur) return
    const m = MOOD_BY_KEY[cur.mood]
    openToolLinked('imagination-gallery', { query: `${m?.label} ${LUT_BY_KEY[cur.lut]?.label}` })
  }

  const copyPalette = () => {
    if (!curGrade) return
    const txt = `${curGrade.shadow} ${curGrade.mid} ${curGrade.high} ${curGrade.accent}`
    try { navigator.clipboard?.writeText(txt) } catch { /* noop */ }
    flash('팔레트 hex를 복사했습니다')
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto', padding: 4, boxSizing: 'border-box' }
  const card: React.CSSProperties = { border: '1px solid var(--line,#3a3a3a)', borderRadius: 8, padding: 10, background: 'var(--panel,rgba(255,255,255,0.03))' }
  const swatch = (hex: string, label: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ height: 38, borderRadius: 6, background: hex, border: '1px solid rgba(0,0,0,0.25)' }} />
      <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3 }}>{label}</div>
      <div style={{ fontSize: 10, fontFamily: 'monospace' }}>{hex}</div>
    </div>
  )

  // 톤 흐름 맵 그라데이션 문자열(미드톤 기준)
  const flowGradient = useMemo(() => {
    if (!grades.length) return 'transparent'
    if (grades.length === 1) return grades[0].mid
    const stops = grades.map((g, i) => `${g.mid} ${(i / (grades.length - 1) * 100).toFixed(1)}%`)
    return `linear-gradient(90deg, ${stops.join(', ')})`
  }, [grades])

  return (
    <div style={wrap}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={() => setDragOver(false)}>
      {dragOver && (
        <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center', opacity: 0.85 }}>여기에 바인더 문서를 놓아 챕터로 추가</div>
      )}

      {/* 빈 상태 안내 */}
      {!chapters.length && (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>챕터별 무드를 색으로 매핑하세요</div>
          <p style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.6, margin: '4px 0' }}>
            챕터 제목과 감정 키워드(긴장·평온·분노·향수 등)를 주면, 영화식 색보정 팔레트가 자동으로 만들어지고
            전체 흐름이 가로 그라데이션 맵으로 펼쳐집니다. 왼쪽 바인더 문서를 끌어 놓거나 장소 라이브러리를 가져올 수도 있습니다.
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn-primary" onClick={loadDemo}>예시 6챕터 불러오기</button>
            <button className="minibtn" onClick={() => add()}>빈 챕터 추가</button>
            {places.length > 0 && <button className="minibtn" onClick={importPlacesAsChapters}>장소 {places.length}개 가져오기</button>}
          </div>
          <div style={{ marginTop: 10 }}>
            <textarea className="field" rows={3} placeholder={'여러 줄 붙여넣기 — 한 줄 = 한 챕터\n예) 재회 | 설렘'} value={bulk} onChange={(e) => setBulk(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
            <button className="minibtn" onClick={importBulk} style={{ marginTop: 4 }}>일괄 추가</button>
          </div>
        </div>
      )}

      {/* 톤 흐름 맵 */}
      {chapters.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <b style={{ fontSize: 13 }}>톤 흐름 맵</b>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{chapters.length}챕터</span>
          </div>
          <div style={{ height: 30, borderRadius: 6, background: flowGradient, border: '1px solid rgba(0,0,0,0.25)' }} />
          {/* 명도 곡선 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 40, gap: 2, marginTop: 6 }}>
            {grades.map((g, i) => (
              <div key={chapters[i].id} title={chapters[i].title}
                onClick={() => setSel(i)}
                style={{ flex: 1, height: `${Math.max(8, g.lum * 100)}%`, background: g.mid, borderRadius: 3, cursor: 'pointer', outline: i === sel ? '2px solid #fff' : 'none' }} />
            ))}
          </div>
          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3 }}>막대 높이 = 명도(밝기). 막대를 누르면 해당 챕터 선택</div>
        </div>
      )}

      {/* 챕터 리스트 */}
      {chapters.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <b style={{ fontSize: 13 }}>챕터</b>
            <button className="minibtn" onClick={() => add()}>추가</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflow: 'auto' }}>
            {chapters.map((c, i) => {
              const g = grades[i]; const m = MOOD_BY_KEY[c.mood]
              return (
                <div key={c.id} onClick={() => setSel(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', background: i === sel ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${g.shadow}, ${g.high})`, flex: '0 0 auto' }} />
                  <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {c.title}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{m?.label} {c.intensity}</span>
                  <button className="minibtn" title="위로" onClick={(e) => { e.stopPropagation(); move(i, -1) }}>↑</button>
                  <button className="minibtn" title="아래로" onClick={(e) => { e.stopPropagation(); move(i, 1) }}>↓</button>
                  <button className="minibtn" title="삭제" onClick={(e) => { e.stopPropagation(); remove(i) }}>×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 선택 챕터 편집 + 그레이드 */}
      {cur && curGrade && (
        <div style={card}>
          <input className="field" value={cur.title} placeholder="챕터 제목" onChange={(e) => update(sel, { title: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <select className="field" value={cur.mood} onChange={(e) => update(sel, { mood: e.target.value, lut: suggestLut(e.target.value, cur.intensity) })} style={{ flex: 1 }}>
              {MOODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select className="field" value={cur.lut} onChange={(e) => update(sel, { lut: e.target.value })} style={{ flex: 1 }}>
              {LUTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, opacity: 0.7 }}>강도 {cur.intensity}</label>
            <input type="range" min={1} max={10} value={cur.intensity}
              onChange={(e) => update(sel, { intensity: Number(e.target.value) })}
              style={{ width: '100%' }} />
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{LUT_BY_KEY[cur.lut]?.desc}</div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {swatch(curGrade.shadow, '섀도')}
            {swatch(curGrade.mid, '미드톤')}
            {swatch(curGrade.high, '하이라이트')}
            {swatch(curGrade.accent, '액센트')}
          </div>

          {/* 온도/채도 게이지 */}
          <div style={{ marginTop: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
              <span>차가움</span><span>색온도</span><span>따뜻함</span>
            </div>
            <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(90deg,#4a90d9,#cccccc,#e08a3c)', marginTop: 2 }}>
              <div style={{ position: 'absolute', top: -2, left: `calc(${((curGrade.temp + 1) / 2 * 100).toFixed(0)}% - 4px)`, width: 8, height: 12, borderRadius: 3, background: '#fff', border: '1px solid #000' }} />
            </div>
          </div>

          <textarea className="field" rows={2} placeholder="이 챕터의 분위기/사건 메모" value={cur.note} onChange={(e) => update(sel, { note: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, resize: 'vertical' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <button className="minibtn" onClick={copyPalette}>팔레트 복사</button>
            {hasStash() && <button className="minibtn" onClick={stashCurrent}>수집함</button>}
            <button className="minibtn" onClick={saveAsPlace}>장소로 저장</button>
            <button className="minibtn" onClick={sendToMoodboard}>무드보드 열기</button>
            <button className="minibtn" onClick={sendToGallery}>갤러리 열기</button>
          </div>
        </div>
      )}

      {/* 진단 */}
      {diag && (
        <div style={card}>
          <b style={{ fontSize: 13 }}>톤 흐름 진단</b>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, opacity: 0.75, margin: '6px 0' }}>
            <span>평균 온도 {diag.avgTemp >= 0 ? '+' : ''}{diag.avgTemp.toFixed(2)}</span>
            <span>명도 폭 {(diag.lumRange * 100).toFixed(0)}%</span>
            <span>채도 폭 {(diag.satRange * 100).toFixed(0)}%</span>
            <span>온도 변동 {diag.swing.toFixed(2)}</span>
          </div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
            {diag.issues.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      {/* 일괄/내보내기 */}
      {chapters.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {hasProjectBridge() && <button className="btn-primary" onClick={exportToProject}>프로젝트에 톤 맵 추가</button>}
            {places.length > 0 && <button className="minibtn" onClick={importPlacesAsChapters}>장소 가져오기</button>}
            {images.length > 0 && <button className="minibtn" onClick={() => openToolLinked('moodboard-grid', {})}>갤러리 이미지 {images.length}장 참고</button>}
            <button className="minibtn" onClick={() => { if (confirm('모든 챕터를 지울까요?')) { setChapters([]); setSel(0) } }}>전체 지우기</button>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.8 }}>여러 챕터 일괄 추가</summary>
            <textarea className="field" rows={3} placeholder={'한 줄 = 한 챕터\n예) 재회 | 설렘'} value={bulk} onChange={(e) => setBulk(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, resize: 'vertical' }} />
            <button className="minibtn" onClick={importBulk} style={{ marginTop: 4 }}>추가</button>
          </details>
          <div className="license-note" style={{ fontSize: 10, opacity: 0.5, marginTop: 8 }}>
            모든 색은 입력 기반으로 로컬에서 결정론적으로 계산됩니다. 외부 네트워크를 사용하지 않습니다.
          </div>
        </div>
      )}

      {savedFlash && (
        <div style={{ position: 'sticky', bottom: 0, textAlign: 'center', fontSize: 12, padding: 6, background: 'rgba(40,120,80,0.85)', color: '#fff', borderRadius: 6 }}>{savedFlash}</div>
      )}
    </div>
  )
}
