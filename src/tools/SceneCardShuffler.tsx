// 장면 카드 셔플러(SceneCardShuffler) — 장면 순서를 바꿔 비선형/병렬 구조를 실험하는 도구.
//  · 각 장면 카드: 제목 / 줄거리 / 시간(연대순 위치) / 긴장도(0~10) / 공개되는 정보 / 트랙(병렬 라인).
//  · 여러 "배치안(arrangement)"을 만들어 같은 장면들을 다른 순서로 늘어놓고 비교한다.
//  · 효과 예측(결정론적): 긴장 곡선(독자가 느끼는 텐션의 흐름), 정보 공개 순서 그래프,
//    시간 점프(플래시백/플래시포워드) 감지, 병렬 트랙 교차 패턴, 구조 진단 점수.
//  · 셔플: 무작위(시드 기반)·역순·연대순 정렬·트랙 교차 등 변형을 한 번에 생성해 후보 배치안으로.
//  · localStorage 영속('sry:tool:scene-card-shuffler'). 빈 상태 안내.
//  · 연계(linkbus): 바인더 파일/스니펫/payload 로 장면 수용, 배치안을 프로젝트·수집함·스니펫으로 내보내기,
//    관련 도구(장면 비트 카드 등)를 데이터와 함께 열기.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/미디어 없음.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'scene-card-shuffler',
  name: '장면 카드 셔플러',
  icon: '🃏',
  group: '구상·정리',
  intro: '장면 순서를 바꿔 비선형·병렬 구조를 실험하고 긴장 곡선과 정보 공개 순서를 예측합니다',
  w: 520,
  h: 640,
}

const LS_KEY = 'sry:tool:scene-card-shuffler'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface Scene {
  id: string
  title: string
  summary: string
  chrono: number      // 연대순 위치(이야기 세계 내 시간 순서, 1=가장 먼저 일어난 일)
  tension: number     // 긴장도 0~10
  reveal: string      // 이 장면에서 새로 공개되는 정보(없으면 빈 문자열)
  track: string       // 병렬 라인/시점(예: A, B, 주인공, 추격조)
}

interface Arrangement {
  id: string
  name: string
  order: string[]     // scene id 의 나열 = 독자가 읽는 순서
}

interface Store {
  scenes: Scene[]
  arrangements: Arrangement[]
  activeArr: string   // 현재 보고 있는 배치안 id
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// 문자열 시드 해시 → 결정론적 의사난수 생성기(mulberry32)
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const clamp10 = (n: unknown): number => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 5
  return Math.max(0, Math.min(10, v))
}
const clampChrono = (n: unknown): number => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 1) return 1
  return Math.min(9999, v)
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const nl2br = (v: string) => escapeHtml(v).replace(/\n/g, '<br />')

// 빈 상태일 때만 채우는 예시.
function seed(): Store {
  const now = Date.now()
  const mk = (i: number, t: string, sum: string, chrono: number, tension: number, reveal: string, track: string): Scene =>
    ({ id: 's' + i + '_' + now.toString(36), title: t, summary: sum, chrono, tension, reveal, track })
  const scenes: Scene[] = [
    mk(1, '편지의 도착', '주인공이 옛 이름이 적힌 편지를 받는다.', 3, 4, '주인공에게 숨겨진 과거가 있다', 'A'),
    mk(2, '어린 시절의 화재', '오래전 집을 태운 불의 진짜 원인.', 1, 7, '화재는 사고가 아니었다', 'B'),
    mk(3, '추격', '거리에서 정체불명의 인물에게 쫓긴다.', 4, 9, '누군가 주인공을 노리고 있다', 'A'),
    mk(4, '첫 만남', '주인공과 조력자가 처음 마주친 날.', 2, 3, '조력자도 같은 비밀을 안다', 'B'),
    mk(5, '진실의 방', '마지막에 모든 단서가 하나로 모인다.', 5, 10, '편지를 보낸 이의 정체', 'A'),
  ]
  const ids = scenes.map((s) => s.id)
  return {
    scenes,
    arrangements: [
      { id: 'a_read_' + now.toString(36), name: '현재 읽는 순서', order: ids.slice() },
      { id: 'a_chrono_' + now.toString(36), name: '연대순', order: scenes.slice().sort((a, b) => a.chrono - b.chrono).map((s) => s.id) },
    ],
    activeArr: 'a_read_' + now.toString(36),
  }
}

function load(): { store: Store; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { store: seed(), seeded: true }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object' || !Array.isArray(p.scenes)) return { store: seed(), seeded: true }
    const scenes: Scene[] = []
    for (const o of p.scenes) {
      if (!o || typeof o !== 'object' || typeof o.title !== 'string') continue
      scenes.push({
        id: String(o.id || newId()),
        title: String(o.title),
        summary: str(o.summary),
        chrono: clampChrono(o.chrono),
        tension: clamp10(o.tension),
        reveal: str(o.reveal),
        track: str(o.track) || 'A',
      })
    }
    const valid = new Set(scenes.map((s) => s.id))
    const arrangements: Arrangement[] = []
    if (Array.isArray(p.arrangements)) {
      for (const a of p.arrangements) {
        if (!a || typeof a !== 'object' || typeof a.name !== 'string') continue
        const order = Array.isArray(a.order) ? a.order.map(String).filter((id: string) => valid.has(id)) : []
        // 누락된 장면은 끝에 보강(데이터 안전: 어떤 장면도 사라지지 않게)
        for (const s of scenes) if (!order.includes(s.id)) order.push(s.id)
        arrangements.push({ id: String(a.id || newId()), name: String(a.name), order })
      }
    }
    if (arrangements.length === 0 && scenes.length) {
      arrangements.push({ id: newId(), name: '현재 읽는 순서', order: scenes.map((s) => s.id) })
    }
    const activeArr = arrangements.find((a) => a.id === p.activeArr) ? String(p.activeArr) : (arrangements[0]?.id || '')
    return { store: { scenes, arrangements, activeArr }, seeded: false }
  } catch {
    return { store: seed(), seeded: true }
  }
}

// ── 분석(결정론적 효과 예측) ──────────────────────────────────────────────────
interface Analysis {
  curve: number[]          // 읽는 순서대로의 긴장도
  peaks: number           // 국소 정점(긴장 봉우리) 개수
  monotony: number        // 인접 변화량 평균(낮으면 평탄=지루)
  finalRise: boolean      // 마지막이 직전보다 높은가(상승 마무리)
  jumps: number           // 시간 점프(연대순 역행) 횟수 → 비선형성
  flashbacks: number      // 뒤로 가는 점프(플래시백)
  flashforwards: number   // 앞으로 건너뛰는 점프(플래시포워드)
  revealPace: number[]    // 누적 공개 정보 수(읽는 순서대로)
  earlyReveal: number     // 전반부(앞 절반)에 공개되는 정보 비율(%)
  trackRuns: number       // 같은 트랙 연속 묶음 수(적을수록 교차가 잦음=병렬 감각)
  trackSwitches: number   // 트랙 전환 횟수
  score: number           // 종합 구조 점수 0~100
  notes: string[]         // 진단 코멘트(텍스트)
}

function analyze(scenes: Scene[], order: string[]): Analysis {
  const byId = new Map(scenes.map((s) => [s.id, s]))
  const seq = order.map((id) => byId.get(id)).filter(Boolean) as Scene[]
  const n = seq.length
  const curve = seq.map((s) => s.tension)

  let peaks = 0
  for (let i = 1; i < n - 1; i++) if (curve[i] >= curve[i - 1] && curve[i] > curve[i + 1]) peaks++
  if (n >= 2 && curve[n - 1] > curve[n - 2]) peaks++ // 끝이 상승이면 클라이맥스 봉우리

  let diffSum = 0
  for (let i = 1; i < n; i++) diffSum += Math.abs(curve[i] - curve[i - 1])
  const monotony = n > 1 ? diffSum / (n - 1) : 0
  const finalRise = n >= 2 ? curve[n - 1] >= curve[n - 2] : true

  let flashbacks = 0, flashforwards = 0
  for (let i = 1; i < n; i++) {
    const d = seq[i].chrono - seq[i - 1].chrono
    if (d < 0) flashbacks++
    else if (d > 1) flashforwards++ // 1칸 초과로 건너뛰면 점프로 간주
  }
  const jumps = flashbacks + flashforwards

  let cum = 0
  const revealPace = seq.map((s) => { if (s.reveal.trim()) cum++; return cum })
  const totalReveals = cum
  const half = Math.ceil(n / 2)
  const earlyCount = seq.slice(0, half).filter((s) => s.reveal.trim()).length
  const earlyReveal = totalReveals ? Math.round((earlyCount / totalReveals) * 100) : 0

  let trackSwitches = 0
  for (let i = 1; i < n; i++) if (seq[i].track !== seq[i - 1].track) trackSwitches++
  const trackRuns = n ? trackSwitches + 1 : 0
  const distinctTracks = new Set(seq.map((s) => s.track)).size

  // ── 종합 점수(0~100): 다양한 구조 미덕을 결정론적으로 합산 ──
  let score = 0
  // 1) 긴장 다이내믹(평탄하지 않을수록 좋되 과하면 감점) — monotony 이상 2.5 근처를 최적으로
  const dynScore = Math.max(0, 25 - Math.abs(monotony - 2.5) * 8)
  score += dynScore
  // 2) 상승 마무리
  score += finalRise ? 18 : 4
  // 3) 정점이 1~3개면 이상적(너무 적으면 단조, 너무 많으면 산만)
  score += peaks >= 1 && peaks <= 3 ? 16 : peaks === 0 ? 4 : 8
  // 4) 정보 공개가 후반에 몰릴수록(earlyReveal 낮을수록) 긴장 유지 — 단 0이면 정보 자체가 없음
  score += totalReveals === 0 ? 4 : earlyReveal <= 60 ? 18 : 9
  // 5) 클라이맥스(최고 긴장)가 후반부에 있는가
  if (n) {
    let maxI = 0; for (let i = 1; i < n; i++) if (curve[i] > curve[maxI]) maxI = i
    score += maxI >= n * 0.6 ? 13 : maxI >= n * 0.4 ? 8 : 3
  }
  // 6) 병렬 트랙이 있고 교차가 일어나면 가산
  score += distinctTracks >= 2 && trackSwitches >= distinctTracks ? 10 : distinctTracks >= 2 ? 5 : 2
  score = Math.max(0, Math.min(100, Math.round(score)))

  const notes: string[] = []
  if (n === 0) notes.push('장면이 없습니다.')
  else {
    if (monotony < 1.2) notes.push('긴장 변화가 평탄합니다 — 강약 대비가 약해 지루해질 수 있어요.')
    else if (monotony > 4) notes.push('긴장이 너무 들쭉날쭉합니다 — 독자가 정서적으로 따라오기 어려울 수 있어요.')
    if (!finalRise) notes.push('마지막 장면의 긴장이 직전보다 낮습니다 — 김빠지는 마무리일 수 있어요.')
    if (peaks === 0) notes.push('뚜렷한 긴장 봉우리가 없습니다 — 클라이맥스를 세워 보세요.')
    if (peaks > 3) notes.push('봉우리가 많습니다 — 절정이 분산되어 임팩트가 약해질 수 있어요.')
    if (flashbacks > 0) notes.push(`플래시백 ${flashbacks}회 — 비선형 구조입니다. 독자 혼동을 줄일 단서(시점 표시)를 두세요.`)
    if (flashforwards > 0) notes.push(`시간 건너뜀 ${flashforwards}회 — 생략된 사건이 궁금증을 유발합니다.`)
    if (totalReveals && earlyReveal > 70) notes.push('핵심 정보가 앞부분에 몰려 있습니다 — 뒤로 미루면 견인력이 커집니다.')
    if (distinctTracks >= 2 && trackSwitches < distinctTracks) notes.push('병렬 트랙이 있지만 교차가 적습니다 — 번갈아 배치하면 동시성이 살아납니다.')
    if (distinctTracks >= 2 && trackSwitches >= distinctTracks) notes.push('트랙이 활발히 교차합니다 — 병렬 진행의 긴장이 잘 살아 있어요.')
    if (notes.length === 0) notes.push('균형 잡힌 구조입니다. 긴장·정보·병렬성이 고르게 작동합니다.')
  }
  return { curve, peaks, monotony: Math.round(monotony * 10) / 10, finalRise, jumps, flashbacks, flashforwards, revealPace, earlyReveal, trackRuns, trackSwitches, score, notes }
}

// 트랙 색(결정론적): 트랙 이름 해시 → 색상환
function trackColor(track: string): string {
  const hue = hashStr(track || 'A') % 360
  return `hsl(${hue} 62% 52%)`
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function SceneCardShuffler({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ store: Store; seeded: boolean }>()
  if (!initial.current) initial.current = load()

  const [scenes, setScenes] = useState<Scene[]>(initial.current.store.scenes)
  const [arrangements, setArrangements] = useState<Arrangement[]>(initial.current.store.arrangements)
  const [activeArr, setActiveArr] = useState<string>(initial.current.store.activeArr)
  const [note, setNote] = useState(initial.current.seeded ? '예시 장면을 채워 두었어요. 자유롭게 수정·삭제하세요.' : '')
  const [editing, setEditing] = useState<Scene | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [showRename, setShowRename] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [fileDrop, setFileDrop] = useState(false)
  const [tab, setTab] = useState<'curve' | 'reveal' | 'track'>('curve')

  const snippets = useLibraryList('snippets')

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scenes, arrangements, activeArr } as Store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침 시 내용이 초기화될 수 있어요.') }
  }, [scenes, arrangements, activeArr])

  // payload 수용(외부 도구에서 장면/텍스트 전달) — 같은 payload 재수신은 무시, 새 payload 만 처리
  const consumed = useRef<Record<string, unknown> | undefined>(undefined)
  useEffect(() => {
    if (!payload || consumed.current === payload) return
    consumed.current = payload
    const incoming: Partial<Scene>[] = []
    if (Array.isArray((payload as any).scenes)) {
      for (const o of (payload as any).scenes) if (o && typeof o === 'object') incoming.push(o)
    } else if (typeof payload.title === 'string' || typeof payload.text === 'string') {
      incoming.push({ title: str(payload.title), summary: str(payload.text) })
    }
    if (incoming.length) {
      // 새 장면 id 는 scenes 와 무관하게 미리 생성(배치안 보강에 사용)
      const newIds = incoming.map(() => newId())
      setScenes((prev) => {
        // 제목 번호/기본 chrono 는 stale closure 를 피하려 prev 기준으로 산출
        const baseLen = prev.length
        const maxChrono = prev.reduce((m, s) => Math.max(m, s.chrono), 0)
        const added: Scene[] = incoming.map((o, i) => ({
          id: newIds[i],
          title: str(o.title) || ('새 장면 ' + (baseLen + i + 1)),
          summary: str(o.summary),
          chrono: clampChrono(o.chrono ?? maxChrono + i + 1),
          tension: clamp10(o.tension ?? 5),
          reveal: str(o.reveal),
          track: str(o.track) || 'A',
        }))
        return [...prev, ...added]
      })
      appendToAllArrangements(newIds)
      flashNote('전달받은 장면을 추가했어요.')
    }
  }, [payload])

  // ── 현재 배치안 / 분석 ────────────────────────────────────────────────────
  const current = useMemo(() => arrangements.find((a) => a.id === activeArr) || arrangements[0], [arrangements, activeArr])
  const orderedScenes = useMemo(() => {
    if (!current) return []
    const byId = new Map(scenes.map((s) => [s.id, s]))
    return current.order.map((id) => byId.get(id)).filter(Boolean) as Scene[]
  }, [current, scenes])
  const analysis = useMemo(() => analyze(scenes, current ? current.order : []), [scenes, current])

  const flashNote = (m: string) => { if (mounted.current) setNote(m) }

  // ── 배치안에 장면 id 보강(어느 배치안에도 빠지지 않게) ──
  const appendToAllArrangements = useCallback((ids: string[]) => {
    setArrangements((prev) => prev.map((a) => {
      const have = new Set(a.order)
      const add = ids.filter((id) => !have.has(id))
      return add.length ? { ...a, order: [...a.order, ...add] } : a
    }))
  }, [])

  // ── 장면 CRUD ─────────────────────────────────────────────────────────────
  const upsertScene = useCallback((data: Omit<Scene, 'id'>, id?: string) => {
    const clean: Omit<Scene, 'id'> = {
      title: data.title.trim(),
      summary: data.summary.trim(),
      chrono: clampChrono(data.chrono),
      tension: clamp10(data.tension),
      reveal: data.reveal.trim(),
      track: (data.track.trim() || 'A'),
    }
    if (!clean.title) return
    if (id) {
      setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...clean } : s)))
    } else {
      const sid = newId()
      setScenes((prev) => [...prev, { id: sid, ...clean }])
      appendToAllArrangements([sid])
    }
    setEditing(null)
  }, [appendToAllArrangements])

  const removeScene = useCallback((id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
    setArrangements((prev) => prev.map((a) => ({ ...a, order: a.order.filter((x) => x !== id) })))
    setConfirmDel(null)
  }, [])

  const addSceneFromItem = useCallback((it: { title: string; text?: string; character?: Record<string, string> }) => {
    const title = (it.title || '새 장면').trim()
    const summary = (it.text || (it.character ? Object.values(it.character).filter(Boolean).slice(0, 3).join(' / ') : '') || '').trim().slice(0, 500)
    const sid = newId()
    setScenes((prev) => {
      const maxChrono = prev.reduce((m, s) => Math.max(m, s.chrono), 0)
      return [...prev, { id: sid, title, summary, chrono: maxChrono + 1, tension: 5, reveal: '', track: 'A' }]
    })
    appendToAllArrangements([sid])
    flashNote(`「${title}」을(를) 장면으로 추가했어요.`)
  }, [appendToAllArrangements])

  // ── 순서 재배치(드래그) — 현재 배치안의 order 만 변경 ──
  const reorder = useCallback((drag: string, before: string | null) => {
    if (!current) return
    setArrangements((prev) => prev.map((a) => {
      if (a.id !== current.id) return a
      const next = a.order.filter((id) => id !== drag)
      if (before == null) next.push(drag)
      else {
        const idx = next.indexOf(before)
        if (idx < 0) next.push(drag); else next.splice(idx, 0, drag)
      }
      return { ...a, order: next }
    }))
  }, [current])

  // ── 배치안 관리 ───────────────────────────────────────────────────────────
  const makeArrangement = useCallback((name: string, order: string[]) => {
    const id = newId()
    setArrangements((prev) => [...prev, { id, name, order }])
    setActiveArr(id)
    return id
  }, [])

  const duplicateActive = useCallback(() => {
    if (!current) return
    makeArrangement(current.name + ' (복제)', current.order.slice())
    flashNote('현재 배치안을 복제했어요.')
  }, [current, makeArrangement])

  const deleteArrangement = useCallback((id: string) => {
    if (arrangements.length <= 1) return
    const next = arrangements.filter((a) => a.id !== id)
    setArrangements(next)
    if (id === activeArr && next.length) setActiveArr(next[0].id)
  }, [arrangements, activeArr])

  // ── 셔플/변형 생성 ─────────────────────────────────────────────────────────
  const ids = useMemo(() => scenes.map((s) => s.id), [scenes])
  const shuffleRandom = useCallback(() => {
    if (scenes.length < 2) { flashNote('장면이 2개 이상일 때 셔플할 수 있어요.'); return }
    const seedNum = hashStr(ids.join('|') + '|' + Date.now())
    const order = shuffleSeeded(ids, seedNum)
    makeArrangement('무작위 셔플', order)
    flashNote('무작위로 섞은 새 배치안을 만들었어요. 효과를 확인해 보세요.')
  }, [scenes, ids, makeArrangement])

  const arrangeChrono = useCallback(() => {
    const order = scenes.slice().sort((a, b) => a.chrono - b.chrono).map((s) => s.id)
    makeArrangement('연대순', order)
    flashNote('이야기 세계 시간 순서로 정렬한 배치안을 만들었어요.')
  }, [scenes, makeArrangement])

  const arrangeReverse = useCallback(() => {
    if (!current) return
    makeArrangement('역순(' + current.name + ')', current.order.slice().reverse())
    flashNote('현재 배치안을 뒤집은 배치안을 만들었어요.')
  }, [current, makeArrangement])

  // 트랙 교차(라운드로빈): 각 트랙을 연대순으로 줄세운 뒤 번갈아 뽑아 병렬 동시성 강조
  const arrangeInterleave = useCallback(() => {
    const byTrack = new Map<string, Scene[]>()
    scenes.forEach((s) => { const k = s.track || 'A'; const arr = byTrack.get(k) || []; arr.push(s); byTrack.set(k, arr) })
    const lanes = Array.from(byTrack.values()).map((l) => l.slice().sort((a, b) => a.chrono - b.chrono))
    const order: string[] = []
    let added = true
    let row = 0
    while (added) {
      added = false
      for (const lane of lanes) { if (lane[row]) { order.push(lane[row].id); added = true } }
      row++
    }
    makeArrangement('트랙 교차', order)
    flashNote('병렬 트랙을 번갈아 배치했어요 — 동시 진행 효과를 비교해 보세요.')
  }, [scenes, makeArrangement])

  // 긴장 상승형(텐션 오름차순) — 단순하지만 강력한 비교 기준
  const arrangeRising = useCallback(() => {
    const order = scenes.slice().sort((a, b) => a.tension - b.tension).map((s) => s.id)
    makeArrangement('긴장 상승형', order)
    flashNote('긴장도 오름차순으로 배치한 후보를 만들었어요.')
  }, [scenes, makeArrangement])

  // ── 내보내기 텍스트 ────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    if (!current) return ''
    const lines: string[] = [`# 배치안: ${current.name}`,
      `장면 ${orderedScenes.length}개 · 구조 점수 ${analysis.score}/100 · 정점 ${analysis.peaks} · 시간점프 ${analysis.jumps}(플래시백 ${analysis.flashbacks})`, '']
    orderedScenes.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title}  [트랙 ${s.track} · 긴장 ${s.tension} · 시간 ${s.chrono}]`)
      if (s.summary) lines.push(`   ${s.summary}`)
      if (s.reveal.trim()) lines.push(`   (공개) ${s.reveal}`)
    })
    lines.push('', '## 구조 진단')
    analysis.notes.forEach((nt) => lines.push(`- ${nt}`))
    return lines.join('\n').trimEnd() + '\n'
  }, [current, orderedScenes, analysis])

  const copyText = useCallback(() => {
    if (!current || !orderedScenes.length) { flashNote('내보낼 장면이 없어요.'); return }
    navigator.clipboard?.writeText(buildText())
      .then(() => flashNote('현재 배치안을 클립보드에 복사했어요.'))
      .catch(() => flashNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인하세요.'))
  }, [current, orderedScenes, buildText])

  // ── 프로젝트/수집함/스니펫/관련도구 연계 ───────────────────────────────────
  const exportToProject = useCallback(() => {
    if (!current || !orderedScenes.length) { flashNote('내보낼 장면이 없어요.'); return }
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아 내보낼 수 없어요.'); return }
    const cards = orderedScenes.map((s, i) =>
      `<h4>${i + 1}. ${escapeHtml(s.title)}</h4>` +
      `<p><strong>트랙:</strong> ${escapeHtml(s.track)} · <strong>긴장:</strong> ${s.tension}/10 · <strong>시간순:</strong> ${s.chrono}</p>` +
      (s.summary ? `<p>${nl2br(s.summary)}</p>` : '') +
      (s.reveal.trim() ? `<p><em>공개 정보:</em> ${nl2br(s.reveal)}</p>` : '')
    ).join('<hr />')
    const diag = analysis.notes.map((nt) => `<li>${escapeHtml(nt)}</li>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '장면',
      title: `배치안 · ${current.name}`,
      bodyHtml: `<p><strong>구조 점수 ${analysis.score}/100</strong> · 정점 ${analysis.peaks} · 시간점프 ${analysis.jumps}(플래시백 ${analysis.flashbacks})</p>${cards}<hr /><h4>구조 진단</h4><ul>${diag}</ul>`,
      synopsis: `${orderedScenes.length}개 장면 배치안 (점수 ${analysis.score})`,
      meta: { 배치안: current.name, 구조점수: String(analysis.score), 시간점프: String(analysis.jumps), 플래시백: String(analysis.flashbacks) },
    })
    flashNote(id ? '프로젝트 원고 「장면」 폴더에 배치안 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }, [current, orderedScenes, analysis])

  const stashText = useCallback(() => {
    if (!current || !orderedScenes.length) { flashNote('담을 내용이 없어요.'); return }
    if (!hasStash()) { flashNote('수집함을 사용할 수 없어요.'); return }
    addToStash({ kind: 'memo', label: `배치안 · ${current.name}`, text: buildText() })
    flashNote('수집함에 현재 배치안을 담았어요.')
  }, [current, orderedScenes, buildText])

  const saveOrderSnippet = useCallback(() => {
    if (!current || !orderedScenes.length) { flashNote('저장할 순서가 없어요.'); return }
    const text = `[배치안: ${current.name}] ` + orderedScenes.map((s, i) => `${i + 1}.${s.title}`).join(' → ')
    addToLibrary('snippets', { text, tags: ['장면순서', current.name], source: '장면 카드 셔플러' })
    flashNote('읽는 순서를 스니펫 라이브러리에 저장했어요.')
  }, [current, orderedScenes])

  const openBeatCards = useCallback(() => {
    if (!orderedScenes.length) { flashNote('전달할 장면이 없어요.'); return }
    openToolLinked('scene-beat-cards', {
      scenes: orderedScenes.map((s) => ({ title: s.title, goal: s.summary, emotion: '', act: 1 })),
    })
    flashNote('장면 비트 카드에 현재 순서를 전달했어요.')
  }, [orderedScenes])

  // 스니펫을 장면으로 가져오기
  const importSnippet = useCallback((text: string) => {
    addSceneFromItem({ title: text.slice(0, 40).trim() || '새 장면', text })
  }, [addSceneFromItem])

  // ── 드래그 핸들러 ──────────────────────────────────────────────────────────
  const onRowDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-scene-id', id) } catch { /* noop */ }
  }
  const onRowDragOver = (e: React.DragEvent, id: string) => {
    if (dragId) { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move' } catch { /* noop */ }; if (overId !== id) setOverId(id) }
  }
  const onRowDrop = (e: React.DragEvent, id: string) => {
    if (dragId) { e.preventDefault(); if (dragId !== id) reorder(dragId, id); setDragId(null); setOverId(null) }
  }
  const onListDragOver = (e: React.DragEvent) => {
    if (dragId) { e.preventDefault(); return }
    if (isItemDrag(e)) { e.preventDefault(); setFileDrop(true) }
  }
  const onListDrop = (e: React.DragEvent) => {
    if (dragId) { e.preventDefault(); reorder(dragId, null); setDragId(null); setOverId(null); return }
    const it = getDragItem(e)
    if (it) { e.preventDefault(); addSceneFromItem(it) }
    setFileDrop(false)
  }

  // ── 스타일 ─────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }
  const tracksUsed = useMemo(() => Array.from(new Set(scenes.map((s) => s.track))).sort(), [scenes])

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={bar}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>장면 카드 셔플러</span>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setEditing('new')} title="새 장면 추가">+ 장면</button>
        <button className="minibtn" onClick={copyText} title="현재 배치안 텍스트 복사">복사</button>
      </div>

      {/* 배치안 선택 */}
      <div style={{ ...bar, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>배치안</span>
        <select
          value={activeArr}
          onChange={(e) => setActiveArr(e.target.value)}
          style={{ flex: 1, minWidth: 120, padding: '5px 8px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontFamily: 'inherit' }}
        >
          {arrangements.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="minibtn" onClick={() => current && setShowRename(current.id)} title="이름 변경" disabled={!current}>이름</button>
        <button className="minibtn" onClick={duplicateActive} title="복제" disabled={!current}>복제</button>
        <button className="minibtn" onClick={() => current && deleteArrangement(current.id)} title="삭제" disabled={arrangements.length <= 1} style={{ color: arrangements.length > 1 ? 'var(--warn)' : undefined }}>삭제</button>
      </div>

      {/* 셔플/변형 버튼 묶음 */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="minibtn" onClick={shuffleRandom} title="무작위로 섞은 새 배치안">무작위 셔플</button>
        <button className="minibtn" onClick={arrangeChrono} title="이야기 세계 시간 순서">연대순</button>
        <button className="minibtn" onClick={arrangeReverse} title="현재 순서 뒤집기">역순</button>
        <button className="minibtn" onClick={arrangeInterleave} title="병렬 트랙을 번갈아 배치">트랙 교차</button>
        <button className="minibtn" onClick={arrangeRising} title="긴장도 오름차순">긴장 상승형</button>
      </div>

      {/* 안내 */}
      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">x</button>
        </div>
      )}

      {scenes.length === 0 ? (
        <EmptyState onAdd={() => setEditing('new')} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 분석 패널 */}
          <AnalysisPanel analysis={analysis} tab={tab} setTab={setTab} ordered={orderedScenes} />

          {/* 장면 목록(읽는 순서, 드래그 재정렬) */}
          <div
            onDragOver={onListDragOver}
            onDrop={onListDrop}
            onDragLeave={(e) => { const r = e.relatedTarget as Node | null; if (!(r && (e.currentTarget as HTMLElement).contains(r))) setFileDrop(false) }}
            style={{
              flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 10px',
              display: 'flex', flexDirection: 'column', gap: 6,
              background: fileDrop ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : undefined,
              outline: fileDrop ? '2px dashed var(--accent)' : undefined, outlineOffset: -4,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>읽는 순서 (끌어서 재배치) · 장면 {orderedScenes.length}개</span>
              <span>좌측 바인더 파일을 끌어다 놓으면 장면이 추가됩니다</span>
            </div>
            {orderedScenes.map((s, i) => (
              <SceneRow
                key={s.id}
                scene={s} index={i}
                dragging={dragId === s.id}
                over={overId === s.id}
                prevChrono={i > 0 ? orderedScenes[i - 1].chrono : null}
                onDragStart={(e) => onRowDragStart(e, s.id)}
                onDragEnd={() => { setDragId(null); setOverId(null) }}
                onDragOver={(e) => onRowDragOver(e, s.id)}
                onDrop={(e) => onRowDrop(e, s.id)}
                onEdit={() => setEditing(s)}
                onDelete={() => setConfirmDel(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 라이브러리(스니펫) 가져오기 — 데이터 수용 */}
      {snippets.length > 0 && scenes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>스니펫에서 장면 가져오기</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 56, overflowY: 'auto' }}>
            {snippets.slice(0, 8).map((sn) => (
              <button key={sn.id} className="minibtn" title={sn.text} onClick={() => importSnippet(sn.text)} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                + {sn.text.slice(0, 22)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={exportToProject} disabled={!hasProjectBridge() || !orderedScenes.length} title={hasProjectBridge() ? '현재 배치안을 프로젝트 원고 「장면」 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={stashText} disabled={!hasStash() || !orderedScenes.length} title={hasStash() ? '현재 배치안을 수집함에 메모로 담기' : '수집함을 사용할 수 없습니다'}>수집함에 담기</button>
        <button className="linkbtn" onClick={saveOrderSnippet} disabled={!orderedScenes.length} title="읽는 순서를 스니펫으로 저장">순서 스니펫 저장</button>
        <button className="linkbtn" onClick={openBeatCards} disabled={!orderedScenes.length} title="장면 비트 카드를 현재 순서로 열기">비트 카드 열기</button>
      </div>

      {/* 트랙 범례 */}
      {tracksUsed.length > 1 && (
        <div style={{ padding: '4px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
          <span>트랙:</span>
          {tracksUsed.map((t) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: trackColor(t), display: 'inline-block' }} aria-hidden />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* 모달들 */}
      {editing && (
        <SceneEditor
          scene={editing === 'new' ? null : editing}
          knownTracks={tracksUsed}
          onCancel={() => setEditing(null)}
          onSave={(data) => upsertScene(data, editing === 'new' ? undefined : editing.id)}
        />
      )}
      {confirmDel && scenes.find((s) => s.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>장면 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{scenes.find((s) => s.id === confirmDel)!.title}」 장면을 모든 배치안에서 삭제할까요?
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeScene(confirmDel)}>삭제</button>
            </div>
          </div>
        </Overlay>
      )}
      {showRename && (
        <RenameModal
          initial={arrangements.find((a) => a.id === showRename)?.name || ''}
          onCancel={() => setShowRename(null)}
          onSave={(name) => { setArrangements((prev) => prev.map((a) => (a.id === showRename ? { ...a, name: name.trim() || a.name } : a))); setShowRename(null) }}
        />
      )}
    </div>
  )
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>아직 장면이 없어요</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
        장면 하나하나를 카드로 등록한 뒤, 순서를 바꿔 가며<br />
        비선형(플래시백)이나 병렬(동시 진행) 구조를 실험하세요.<br />
        각 배치안마다 긴장 곡선과 정보 공개 순서를 자동으로 예측합니다.<br />
        좌측 바인더의 파일이나 스니펫을 끌어다 놓아도 장면이 됩니다.
      </div>
      <button className="btn-primary" onClick={onAdd}>+ 첫 장면 추가</button>
    </div>
  )
}

// ── 분석 패널(긴장 곡선 / 정보 공개 / 트랙 스트립 + 점수) ────────────────────
function AnalysisPanel({ analysis, tab, setTab, ordered }: { analysis: Analysis; tab: 'curve' | 'reveal' | 'track'; setTab: (t: 'curve' | 'reveal' | 'track') => void; ordered: Scene[] }) {
  const W = 100, H = 36 // viewBox 단위(반응형: width 100%)
  const n = analysis.curve.length

  const scoreColor = analysis.score >= 75 ? 'var(--ok)' : analysis.score >= 50 ? '#e3b341' : 'var(--warn)'

  // 긴장 곡선 폴리라인
  const curvePts = useMemo(() => {
    if (n === 0) return ''
    return analysis.curve.map((v, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * (W - 6) + 3
      const y = H - 3 - (v / 10) * (H - 6)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }, [analysis.curve, n])

  // 정보 공개 누적 면적
  const revealPts = useMemo(() => {
    if (n === 0) return ''
    const maxR = Math.max(1, analysis.revealPace[n - 1] || 1)
    return analysis.revealPace.map((v, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * (W - 6) + 3
      const y = H - 3 - (v / maxR) * (H - 6)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }, [analysis.revealPace, n])

  const tabBtn = (k: 'curve' | 'reveal' | 'track', label: string): React.CSSProperties => ({
    padding: '3px 9px', fontSize: 11.5, cursor: 'pointer',
    border: '1px solid var(--border)', borderRadius: 7,
    background: tab === k ? 'color-mix(in srgb, var(--accent) 16%, var(--paper))' : 'var(--paper)',
    color: 'var(--text)', fontWeight: tab === k ? 700 : 400,
  })

  return (
    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>구조 점수</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{analysis.score}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>/100</span>
        </span>
        <div style={{ flex: 1 }} />
        <button style={tabBtn('curve', '긴장 곡선')} onClick={() => setTab('curve')}>긴장 곡선</button>
        <button style={tabBtn('reveal', '정보 공개')} onClick={() => setTab('reveal')}>정보 공개</button>
        <button style={tabBtn('track', '트랙')} onClick={() => setTab('track')}>트랙</button>
      </div>

      {/* 그래프 영역 */}
      <div style={{ width: '100%', height: 64, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        {tab !== 'track' ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-label={tab === 'curve' ? '긴장 곡선' : '정보 공개 누적'}>
            {/* 기준선 */}
            <line x1={3} y1={H - 3} x2={W - 3} y2={H - 3} stroke="var(--border)" strokeWidth={0.4} />
            <line x1={3} y1={3} x2={W - 3} y2={3} stroke="var(--border)" strokeWidth={0.3} strokeDasharray="1 1.5" />
            {n > 0 && (tab === 'curve' ? (
              <>
                <polyline points={curvePts} fill="none" stroke="var(--accent)" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
                {analysis.curve.map((v, i) => {
                  const x = n === 1 ? W / 2 : (i / (n - 1)) * (W - 6) + 3
                  const y = H - 3 - (v / 10) * (H - 6)
                  return <circle key={i} cx={x} cy={y} r={0.9} fill="var(--accent)" />
                })}
              </>
            ) : (
              <>
                <polyline points={`3,${H - 3} ${revealPts} ${(W - 3)},${H - 3}`} fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="none" />
                <polyline points={revealPts} fill="none" stroke="var(--accent)" strokeWidth={1} strokeLinejoin="round" />
              </>
            ))}
          </svg>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
            {n === 0 ? null : ordered.map((s, i) => (
              <div key={s.id} title={`${i + 1}. ${s.title} · 트랙 ${s.track}`} style={{ flex: 1, background: trackColor(s.track), borderRight: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minWidth: 2 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.92)', padding: '0 1px', overflow: 'hidden' }}>{s.track}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 지표 칩 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        <Chip label="정점" value={String(analysis.peaks)} />
        <Chip label="긴장 변동" value={analysis.monotony.toFixed(1)} />
        <Chip label="시간점프" value={String(analysis.jumps)} />
        <Chip label="플래시백" value={String(analysis.flashbacks)} />
        <Chip label="전반 공개" value={analysis.earlyReveal + '%'} />
        <Chip label="트랙전환" value={String(analysis.trackSwitches)} />
        <Chip label="마무리" value={analysis.finalRise ? '상승' : '하강'} accent={!analysis.finalRise} />
      </div>

      {/* 진단 코멘트 */}
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 88, overflowY: 'auto' }}>
        {analysis.notes.map((nt, i) => (
          <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text)', display: 'flex', gap: 5 }}>
            <span style={{ color: 'var(--accent)', flexShrink: 0 }}>-</span>
            <span>{nt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)', background: accent ? 'color-mix(in srgb, var(--warn) 14%, var(--paper))' : 'var(--paper)', color: 'var(--text)', display: 'inline-flex', gap: 4 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <strong>{value}</strong>
    </span>
  )
}

// ── 장면 행(읽는 순서 리스트) ─────────────────────────────────────────────────
function SceneRow({
  scene, index, dragging, over, prevChrono, onDragStart, onDragEnd, onDragOver, onDrop, onEdit, onDelete,
}: {
  scene: Scene; index: number; dragging: boolean; over: boolean; prevChrono: number | null
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void
  onEdit: () => void; onDelete: () => void
}) {
  // 시간 점프 표식(연대순 역행=플래시백 / 큰 전진=건너뜀)
  let jump: { label: string; color: string } | null = null
  if (prevChrono != null) {
    const d = scene.chrono - prevChrono
    if (d < 0) jump = { label: '플래시백', color: '#a371f7' }
    else if (d > 1) jump = { label: '시간 건너뜀', color: '#5aa7f0' }
  }
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 8,
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderTop: over ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderLeft: `3px solid ${trackColor(scene.track)}`,
        borderRadius: 9, padding: '7px 9px',
        opacity: dragging ? 0.45 : 1, cursor: 'grab', userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 22 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>{index + 1}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }} aria-hidden>::</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, wordBreak: 'break-word' }}>{scene.title}</span>
          {jump && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'color-mix(in srgb, ' + jump.color + ' 18%, var(--paper))', color: jump.color, fontWeight: 700 }}>{jump.label}</span>}
        </div>
        {scene.summary && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2, wordBreak: 'break-word' }}>{scene.summary}</div>}
        {scene.reveal.trim() && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>공개: {scene.reveal}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span>트랙 {scene.track}</span>
          <span>시간순 {scene.chrono}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            긴장
            <span style={{ display: 'inline-block', width: 44, height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', verticalAlign: 'middle' }}>
              <span style={{ display: 'block', width: `${scene.tension * 10}%`, height: '100%', background: scene.tension >= 7 ? 'var(--warn)' : 'var(--accent)' }} />
            </span>
            {scene.tension}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0, justifyContent: 'center' }}>
        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} title="편집" onClick={onEdit}>편집</button>
        <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} title="삭제" onClick={onDelete}>삭제</button>
      </div>
    </div>
  )
}

// ── 오버레이/모달 ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
      {children}
    </div>
  )
}
const modalCard: React.CSSProperties = { width: '100%', maxWidth: 380, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', boxSizing: 'border-box' }
const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
const labelS: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

function RenameModal({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (name: string) => void }) {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <Overlay onClose={onCancel}>
      <div style={modalCard}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>배치안 이름</div>
        <input ref={ref} style={inputBase} value={v} maxLength={60}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(v) }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={() => onSave(v)} disabled={!v.trim()}>저장</button>
        </div>
      </div>
    </Overlay>
  )
}

function SceneEditor({ scene, knownTracks, onCancel, onSave }: {
  scene: Scene | null; knownTracks: string[]
  onCancel: () => void; onSave: (data: Omit<Scene, 'id'>) => void
}) {
  const [title, setTitle] = useState(scene?.title || '')
  const [summary, setSummary] = useState(scene?.summary || '')
  const [chrono, setChrono] = useState<number>(scene?.chrono ?? 1)
  const [tension, setTension] = useState<number>(scene?.tension ?? 5)
  const [reveal, setReveal] = useState(scene?.reveal || '')
  const [track, setTrack] = useState(scene?.track || (knownTracks[0] || 'A'))
  const titleRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { titleRef.current?.focus() }, [])

  const submit = () => onSave({ title, summary, chrono: clampChrono(chrono), tension: clamp10(tension), reveal, track })

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 440, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>{scene ? '장면 편집' : '새 장면'}</div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelS}>제목 *</label>
            <input ref={titleRef} style={inputBase} value={title} maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder="예: 진실의 방" />
          </div>
          <div>
            <label style={labelS}>줄거리</label>
            <textarea style={{ ...inputBase, minHeight: 56, resize: 'vertical' }} value={summary} maxLength={600}
              onChange={(e) => setSummary(e.target.value)} placeholder="이 장면에서 일어나는 일" />
          </div>
          <div>
            <label style={labelS}>공개되는 정보 (있으면)</label>
            <input style={inputBase} value={reveal} maxLength={300}
              onChange={(e) => setReveal(e.target.value)} placeholder="이 장면에서 독자가 새로 알게 되는 것" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 110 }}>
              <label style={labelS}>시간순 (1=먼저)</label>
              <input type="number" min={1} max={9999} style={inputBase} value={chrono}
                onChange={(e) => setChrono(clampChrono(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelS}>트랙 (병렬 라인)</label>
              <input style={inputBase} value={track} maxLength={20} list="scs-tracks"
                onChange={(e) => setTrack(e.target.value)} placeholder="예: A, B, 주인공" />
              <datalist id="scs-tracks">{knownTracks.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
          </div>
          <div>
            <label style={labelS}>긴장도: {tension} / 10</label>
            <input type="range" min={0} max={10} step={1} value={tension}
              onChange={(e) => setTension(clamp10(e.target.value))}
              style={{ width: '100%', accentColor: tension >= 7 ? 'var(--warn)' : 'var(--accent)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>{scene ? '저장' : '추가'}</button>
        </div>
      </div>
    </Overlay>
  )
}
