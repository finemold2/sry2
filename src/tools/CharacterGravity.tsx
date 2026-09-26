// 인물 중력장 — 원고 텍스트에서 인물별 등장 빈도·POV·문단 내 공동 등장(상호작용)을 집계해
// 각 인물의 "중력(영향력)"을 계산하고, 중력이 큰 인물을 중심에 두는 별자리(궤도) 배치로 시각화한다.
// 소외된(중력이 낮거나 다른 인물과 한 번도 함께 등장하지 않는) 인물을 경고로 알려준다.
//
// 입력 경로(어느 하나라도 비어 있으면 안내 화면):
//   1) characters 라이브러리(useLibraryList) 의 인물 이름(+별칭)을 추적 대상으로 사용
//   2) 좌측 바인더 문서 드롭(getDragItem → ResolvedItem.text) / payload.text 로 원고 본문 수용
//   3) 직접 붙여넣기(아래 textarea)
//   4) 라이브러리가 비었으면, 원고에서 자동으로 인물 후보 이름을 추출(한글/영문 토큰 빈도)
//
// 산출물: 중력 리포트를 프로젝트(addToProject)에 추가, 수집함(addToStash)에 담기,
//         관계도(relationship-map) 를 공동 등장 데이터와 함께 열기(openToolLinked), 인물 라이브러리에 추가.
//
// import 는 react 와 './linkbus' 만. 외부 네트워크 없음. 모든 계산은 브라우저 로컬·결정론적.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  openToolLinked,
  getDragItem,
  isItemDrag,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'character-gravity',
  name: '인물 중력장',
  icon: '🪐',
  group: '캐릭터',
  intro: '등장 빈도·POV·상호작용으로 인물별 중력을 계산해 별자리처럼 배치하고 소외 인물을 경고합니다',
  w: 520,
  h: 640,
}

const LS_KEY = 'sry:tool:character-gravity'

// ---------- 영속 상태 ----------
interface Persist {
  text: string
  povName: string // POV(시점) 인물 이름 — 가중치 보너스
  extraNames: string // 추가 추적 이름(쉼표/줄바꿈 구분)
  weightFreq: number
  weightPov: number
  weightInter: number
}
const DEFAULTS: Persist = {
  text: '',
  povName: '',
  extraNames: '',
  weightFreq: 1,
  weightPov: 1,
  weightInter: 1,
}

function loadPersist(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw)
    return {
      text: typeof p?.text === 'string' ? p.text : '',
      povName: typeof p?.povName === 'string' ? p.povName : '',
      extraNames: typeof p?.extraNames === 'string' ? p.extraNames : '',
      weightFreq: clampW(p?.weightFreq),
      weightPov: clampW(p?.weightPov),
      weightInter: clampW(p?.weightInter),
    }
  } catch {
    return { ...DEFAULTS }
  }
}
function clampW(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(3, n))
}

// ---------- 문자열 해시(결정론적 의사난수 시드) ----------
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ---------- 인물 이름 추출 헬퍼 ----------
// 라이브러리 인물에서 추적할 이름과 별칭을 뽑는다.
interface Tracked {
  key: string // 정규 키(주 이름)
  display: string
  aliases: string[] // 매칭에 쓸 모든 별칭(주 이름 포함)
  fromLibrary: boolean
}

function charAliases(c: Partial<SharedCharacter>): string[] {
  const out: string[] = []
  const push = (v?: string) => {
    if (v && v.trim()) v.split(/[,/·、]/).forEach((p) => { const t = p.trim(); if (t) out.push(t) })
  }
  push(c.name)
  const f = c.fields || {}
  push(f.name)
  push(f.aka)
  // 짧은 별칭만(이름은 보통 1~6자) — 너무 긴 문장은 제외
  return Array.from(new Set(out)).filter((x) => x.length >= 1 && x.length <= 16)
}

// 본문에서 인물 후보 자동 추출(라이브러리가 비었을 때).
// 한글 이름 후보: 2~4자 한글 토큰 중 조사가 자주 붙는 형태. 영문: 대문자로 시작하는 단어.
function autoExtractNames(text: string, limit = 12): string[] {
  if (!text.trim()) return []
  const counts = new Map<string, number>()
  // 한글: 2~4자 음절 블록
  const hangul = text.match(/[가-힣]{2,4}/g) || []
  for (const w of hangul) {
    // 흔한 비인물 단어 일부 제외(완전하진 않지만 노이즈 감소)
    if (STOP_KO.has(w)) continue
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  // 영문: 대문자 시작 단어(고유명사 추정)
  const latin = text.match(/\b[A-Z][a-z]{1,15}\b/g) || []
  for (const w of latin) {
    if (STOP_EN.has(w)) continue
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w)
}
const STOP_KO = new Set([
  '그리고', '하지만', '그러나', '그래서', '때문', '자신', '사람', '우리', '여기', '저기', '거기',
  '이제', '지금', '오늘', '내일', '어제', '모두', '정말', '조금', '다시', '아직', '벌써', '얼마',
  '무엇', '누구', '어디', '언제', '이것', '그것', '저것', '하나', '생각', '마음', '소리', '얼굴',
  '눈물', '시간', '세상', '순간', '바람', '하늘', '그녀', '그들', '당신',
])
const STOP_EN = new Set([
  'The', 'And', 'But', 'For', 'She', 'His', 'Her', 'Him', 'They', 'Them', 'This', 'That',
  'When', 'What', 'Then', 'There', 'Here', 'With', 'From', 'Into', 'Chapter',
])

// ---------- 핵심 분석 ----------
interface NodeStat {
  key: string
  display: string
  freq: number // 총 등장 횟수
  povHits: number // POV 인물로 지정된 경우 보너스 표시(0/1)
  partners: Map<string, number> // 함께 등장한 인물 → 공동 등장 문단 수
  gravity: number // 최종 중력값(0~100 정규화)
  raw: number // 정규화 전 원시 점수
  isolated: boolean
}

interface Analysis {
  nodes: NodeStat[]
  totalParagraphs: number
  totalFreq: number
  pairCount: number
}

// 본문을 문단으로 쪼개고, 각 문단에 등장한 추적 인물을 집계.
function analyze(text: string, tracked: Tracked[], povKey: string, weights: { f: number; p: number; i: number }): Analysis {
  const paras = text.split(/\n{1,}|(?<=[.!?。！？”’])\s{2,}/).map((p) => p.trim()).filter(Boolean)
  // 각 별칭 → key 맵(긴 별칭 우선 매칭으로 부분문자열 충돌 줄임)
  const aliasList: { alias: string; key: string }[] = []
  for (const t of tracked) for (const a of t.aliases) aliasList.push({ alias: a, key: t.key })
  aliasList.sort((a, b) => b.alias.length - a.alias.length)

  const stat = new Map<string, NodeStat>()
  for (const t of tracked) {
    stat.set(t.key, {
      key: t.key,
      display: t.display,
      freq: 0,
      povHits: t.key === povKey ? 1 : 0,
      partners: new Map(),
      gravity: 0,
      raw: 0,
      isolated: false,
    })
  }

  for (const para of paras) {
    const present = new Set<string>()
    // 부분문자열 별칭의 이중 계상 방지: 긴 별칭부터 매칭하고, 매칭된 구간을 마스킹(\x00)해
    // 짧은 별칭이 같은 글자를 다시 세지 않게 한다. (예: '강서연' 매칭 후 '서연'이 그 안에서 재카운트되지 않음)
    let buf = para
    for (const { alias, key } of aliasList) {
      if (!alias) continue
      // 마스킹된 버퍼에서 별칭 등장 횟수 세고, 센 구간은 가려 둔다.
      let idx = buf.indexOf(alias)
      let hits = 0
      while (idx !== -1) {
        hits++
        buf = buf.slice(0, idx) + '\x00'.repeat(alias.length) + buf.slice(idx + alias.length)
        idx = buf.indexOf(alias, idx + alias.length)
      }
      if (hits > 0) {
        const s = stat.get(key)
        if (s) s.freq += hits
        present.add(key)
      }
    }
    // 같은 문단에 함께 등장 → 상호작용(파트너) 카운트
    const arr = Array.from(present)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = stat.get(arr[i])!
        const b = stat.get(arr[j])!
        a.partners.set(arr[j], (a.partners.get(arr[j]) || 0) + 1)
        b.partners.set(arr[i], (b.partners.get(arr[i]) || 0) + 1)
      }
    }
  }

  const nodes = Array.from(stat.values())
  const totalFreq = nodes.reduce((s, n) => s + n.freq, 0) || 1
  const maxFreq = Math.max(1, ...nodes.map((n) => n.freq))
  const maxInter = Math.max(1, ...nodes.map((n) => sumMap(n.partners)))

  // 추적 인물이 1명이거나 본문 등장 인물이 2명 미만이면 함께 등장할 상대 자체가 없으므로
  // partners 기반 고립 판정은 의미가 없다(단독 주인공 오경고 방지). 이때는 freq===0 미등장만 경고.
  const presentCount = nodes.filter((n) => n.freq > 0).length
  const skipPartnerIsolation = tracked.length < 2 || presentCount < 2

  // 원시 점수: 빈도(정규화) + POV 보너스 + 상호작용 다양성·강도
  for (const n of nodes) {
    const fScore = (n.freq / maxFreq) * 100 * weights.f
    const pScore = n.povHits ? 100 * 0.6 * weights.p : 0
    const interSum = sumMap(n.partners)
    const interVariety = n.partners.size
    const iScore = ((interSum / maxInter) * 70 + Math.min(30, interVariety * 8)) * weights.i
    n.raw = fScore + pScore + iScore
    n.isolated = skipPartnerIsolation
      ? n.freq === 0
      : n.freq === 0 || (n.partners.size === 0 && n.freq < Math.max(2, maxFreq * 0.15))
  }
  const maxRaw = Math.max(1, ...nodes.map((n) => n.raw))
  for (const n of nodes) n.gravity = Math.round((n.raw / maxRaw) * 100)

  nodes.sort((a, b) => b.gravity - a.gravity || a.display.localeCompare(b.display))
  let pairCount = 0
  for (const n of nodes) pairCount += n.partners.size
  pairCount = Math.round(pairCount / 2)

  return { nodes, totalParagraphs: paras.length, totalFreq, pairCount }
}
function sumMap(m: Map<string, number>): number {
  let s = 0
  m.forEach((v) => (s += v))
  return s
}

// ---------- 컴포넌트 ----------
interface Props {
  payload?: Record<string, unknown>
}

export default function CharacterGravity({ payload }: Props) {
  const init = useRef<Persist>(loadPersist())
  const [text, setText] = useState(init.current.text)
  const [povName, setPovName] = useState(init.current.povName)
  const [extraNames, setExtraNames] = useState(init.current.extraNames)
  const [wFreq, setWFreq] = useState(init.current.weightFreq)
  const [wPov, setWPov] = useState(init.current.weightPov)
  const [wInter, setWInter] = useState(init.current.weightInter)
  const [note, setNote] = useState('')
  const [useAuto, setUseAuto] = useState(false) // 라이브러리 없을 때 자동 추출 사용 여부
  const [selKey, setSelKey] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)
  const mounted = useRef(true)

  const libChars = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ text, povName, extraNames, weightFreq: wFreq, weightPov: wPov, weightInter: wInter }),
      )
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 입력이 사라질 수 있어요.')
    }
  }, [text, povName, extraNames, wFreq, wPov, wInter])

  // payload.text 수용(다른 도구에서 본문을 들고 열렸을 때)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = payload.text
    if (typeof t === 'string' && t.trim()) {
      setText((prev) => (prev.trim() ? prev + '\n\n' + t : t))
      if (mounted.current) setNote('연결된 도구에서 원고 본문을 받아왔어요.')
    }
    const p = payload.povName
    if (typeof p === 'string' && p.trim()) setPovName(p.trim())
  }, [payload])

  // 추적 대상 인물 목록 구성: 라이브러리 + 추가 이름. 비었고 자동 모드면 본문에서 추출.
  const tracked: Tracked[] = useMemo(() => {
    const map = new Map<string, Tracked>()
    const add = (display: string, aliases: string[], fromLibrary: boolean) => {
      const key = display.trim()
      if (!key) return
      const ex = map.get(key)
      const al = Array.from(new Set([key, ...aliases].map((a) => a.trim()).filter(Boolean)))
      if (ex) {
        ex.aliases = Array.from(new Set([...ex.aliases, ...al]))
        ex.fromLibrary = ex.fromLibrary || fromLibrary
      } else {
        map.set(key, { key, display: key, aliases: al, fromLibrary })
      }
    }
    for (const c of libChars) {
      const al = charAliases(c)
      const display = (c.name || al[0] || '').trim()
      if (display) add(display, al, true)
    }
    extraNames
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((nm) => add(nm, [nm], false))
    if (map.size === 0 && useAuto) {
      autoExtractNames(text).forEach((nm) => add(nm, [nm], false))
    }
    return Array.from(map.values())
  }, [libChars, extraNames, useAuto, text])

  const povKey = useMemo(() => {
    const p = povName.trim()
    if (!p) return ''
    const hit = tracked.find((t) => t.aliases.some((a) => a === p))
    return hit ? hit.key : p
  }, [povName, tracked])

  const analysis: Analysis | null = useMemo(() => {
    if (!text.trim() || tracked.length === 0) return null
    return analyze(text, tracked, povKey, { f: wFreq, p: wPov, i: wInter })
  }, [text, tracked, povKey, wFreq, wPov, wInter])

  const activeNodes = analysis ? analysis.nodes.filter((n) => n.freq > 0 || n.povHits) : []
  const isolated = analysis ? analysis.nodes.filter((n) => n.isolated) : []

  // ---------- 좌측 바인더 드롭 수용 ----------
  const onDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const body = (it.text || '').trim()
    if (!body) { setNote(`'${it.title || '문서'}'에서 본문 텍스트를 찾지 못했어요.`); return }
    setText((prev) => (prev.trim() ? prev + '\n\n' + body : body))
    setNote(`'${it.title || '문서'}'의 본문을 분석 대상에 추가했어요.`)
  }

  // ---------- 별자리 좌표 계산 ----------
  // 중력이 큰 인물일수록 중심에 가깝게, 작을수록 바깥 궤도. 결정론적 각도(이름 해시 기반).
  const VIEW_W = 460
  const VIEW_H = 360
  const CX = VIEW_W / 2
  const CY = VIEW_H / 2
  interface Placed { n: NodeStat; x: number; y: number; r: number }
  const placed: Placed[] = useMemo(() => {
    if (!analysis) return []
    const ns = activeNodes
    if (ns.length === 0) return []
    const maxG = Math.max(1, ...ns.map((n) => n.gravity))
    return ns.map((n, i) => {
      // 반지름: 중력 클수록 작게(중심). 0중력=가장 바깥.
      const g = n.gravity / maxG
      const ringR = (1 - g) * (Math.min(VIEW_W, VIEW_H) / 2 - 50) + (ns.length === 1 ? 0 : 24)
      // 각도: 이름 해시 + 인덱스로 분산(겹침 완화)
      const a = ((hashStr(n.key) % 360) + i * (360 / Math.max(1, ns.length)) * 0.6) * (Math.PI / 180)
      const x = CX + Math.cos(a) * ringR
      const y = CY + Math.sin(a) * ringR
      // 노드 크기: 중력 비례
      const r = 8 + (n.gravity / 100) * 22
      return { n, x, y, r }
    })
  }, [analysis, activeNodes])

  const maxGravity = activeNodes.length ? Math.max(...activeNodes.map((n) => n.gravity)) : 0
  const heroName = activeNodes.length ? activeNodes[0].display : ''

  const selNode = selKey ? activeNodes.find((n) => n.key === selKey) || null : null

  // ---------- 리포트 텍스트/HTML ----------
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const buildReportText = (): string => {
    if (!analysis) return ''
    const L: string[] = ['# 인물 중력장 리포트', '']
    L.push(`- 분석 문단 수: ${analysis.totalParagraphs}`)
    L.push(`- 추적 인물 수: ${tracked.length} / 본문 등장: ${activeNodes.length}`)
    L.push(`- 총 등장 횟수: ${analysis.totalFreq}`)
    L.push(`- 상호작용(공동 등장) 쌍: ${analysis.pairCount}`)
    if (heroName) L.push(`- 중심 인물: ${heroName} (중력 ${maxGravity})`)
    L.push('', '## 인물별 중력 순위')
    activeNodes.forEach((n, i) => {
      const partners = topPartners(n, 3)
      L.push(`${i + 1}. ${n.display} — 중력 ${n.gravity} (등장 ${n.freq}회, 상대 ${n.partners.size}명${n.povHits ? ', POV' : ''})${partners ? ` · 주요 관계: ${partners}` : ''}`)
    })
    if (isolated.length) {
      L.push('', '## 소외 인물 경고')
      isolated.forEach((n) => {
        L.push(`- ${n.display}: ${n.freq === 0 ? '본문에 한 번도 등장하지 않음' : n.partners.size === 0 ? '다른 인물과 함께 등장한 적 없음(고립)' : '등장 비중이 매우 낮음'}`)
      })
    } else {
      L.push('', '소외된 인물이 없습니다.')
    }
    return L.join('\n')
  }
  const topPartners = (n: NodeStat, k: number): string => {
    const arr = Array.from(n.partners.entries()).sort((a, b) => b[1] - a[1]).slice(0, k)
    return arr.map(([key, c]) => `${displayOf(key)}(${c})`).join(', ')
  }
  const displayOf = (key: string): string => activeNodes.find((n) => n.key === key)?.display || tracked.find((t) => t.key === key)?.display || key

  const buildReportHtml = (): string => {
    if (!analysis) return ''
    const P: string[] = []
    P.push('<h2>개요</h2>')
    P.push(
      '<ul>' +
        `<li>분석 문단 수: ${analysis.totalParagraphs}</li>` +
        `<li>추적 인물 ${tracked.length}명 중 본문 등장 ${activeNodes.length}명</li>` +
        `<li>총 등장 횟수: ${analysis.totalFreq}</li>` +
        `<li>상호작용(공동 등장) 쌍: ${analysis.pairCount}</li>` +
        (heroName ? `<li>중심 인물: ${esc(heroName)} (중력 ${maxGravity})</li>` : '') +
        '</ul>',
    )
    P.push('<h2>인물별 중력 순위</h2><ol>')
    activeNodes.forEach((n) => {
      const partners = topPartners(n, 3)
      P.push(
        '<li><b>' + esc(n.display) + '</b> — 중력 ' + n.gravity +
          ' (등장 ' + n.freq + '회, 상대 ' + n.partners.size + '명' + (n.povHits ? ', POV' : '') + ')' +
          (partners ? ' · 주요 관계: ' + esc(partners) : '') + '</li>',
      )
    })
    P.push('</ol>')
    P.push('<h2>소외 인물 경고</h2>')
    if (isolated.length) {
      P.push('<ul>' + isolated.map((n) =>
        '<li>' + esc(n.display) + ': ' + (n.freq === 0 ? '본문에 한 번도 등장하지 않음' : n.partners.size === 0 ? '다른 인물과 함께 등장한 적 없음(고립)' : '등장 비중이 매우 낮음') + '</li>',
      ).join('') + '</ul>')
    } else {
      P.push('<p>소외된 인물이 없습니다.</p>')
    }
    return P.join('\n')
  }

  // ---------- 액션 ----------
  const addReportToProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!analysis || activeNodes.length === 0) { setNote('먼저 원고와 인물을 넣어 분석하세요.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '인물 중력장 리포트', bodyHtml: buildReportHtml(), synopsis: heroName ? `중심 인물: ${heroName}` : undefined })
    setNote(id ? '프로젝트 자료 > 인물 폴더에 리포트를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const stashReport = () => {
    if (!hasStash()) { setNote('수집함을 사용할 수 없어요.'); return }
    if (!analysis || activeNodes.length === 0) { setNote('먼저 분석할 내용을 넣으세요.'); return }
    addToStash({ kind: 'memo', label: '인물 중력장 리포트', text: buildReportText() })
    setNote('수집함에 리포트를 담았어요.')
  }

  const copyReport = async () => {
    if (!analysis) { setNote('복사할 내용이 없어요.'); return }
    const txt = buildReportText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(txt); setNote('리포트를 텍스트로 복사했어요.'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        setNote('리포트를 텍스트로 복사했어요.')
      } catch { setNote('복사에 실패했어요.') }
    }
  }

  // 자동 추출된(라이브러리에 없는) 인물을 라이브러리에 저장
  const saveAutoCharsToLibrary = () => {
    if (!analysis) return
    const known = new Set(libChars.map((c) => (c.name || '').trim()))
    const news = activeNodes.filter((n) => !known.has(n.display) && n.freq > 0)
    if (!news.length) { setNote('새로 저장할 인물이 없어요(이미 라이브러리에 있거나 미등장).'); return }
    let added = 0
    for (const n of news) {
      addToLibrary('characters', {
        name: n.display,
        fields: { name: n.display, notes: `중력 ${n.gravity} · 등장 ${n.freq}회 · 상대 ${n.partners.size}명 (인물 중력장 자동 추출)` },
        source: 'character-gravity',
      })
      added++
    }
    setNote(`인물 ${added}명을 공유 라이브러리에 저장했어요.`)
  }

  // 관계도로 공동 등장 데이터를 들고 열기
  const openInRelationshipMap = () => {
    if (!analysis || activeNodes.length === 0) { setNote('먼저 분석하세요.'); return }
    const characters = activeNodes.map((n) => ({ name: n.display }))
    openToolLinked('relationship-map', { character: characters, text })
    setNote('관계도 도구를 열고 인물을 노드로 넘겼어요. 함께 등장한 인물끼리 관계선을 이어 보세요.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const bar: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const input: React.CSSProperties = { padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }
  const sLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }

  const hasData = text.trim().length > 0
  const ready = !!analysis && activeNodes.length > 0

  // 슬라이더 한 줄
  const slider = (label: string, val: number, set: (v: number) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, width: 64, flexShrink: 0 }}>{label}</span>
      <input type="range" min={0} max={3} step={0.5} value={val} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1 }} aria-label={label + ' 가중치'} />
      <span style={{ fontSize: 12, width: 28, textAlign: 'right', color: 'var(--muted)' }}>{val.toFixed(1)}</span>
    </div>
  )

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -6 } : wrap}
      onDragEnter={(e) => { if (isItemDrag(e)) { e.preventDefault(); dragDepth.current++; setDropActive(true) } }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => { if (isItemDrag(e)) { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDropActive(false) } }}
      onDrop={onDrop}
    >
      {dropActive && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 20, padding: '6px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          여기에 놓으면 원고 본문을 분석에 추가합니다
        </div>
      )}

      {/* 상단 액션 바 */}
      <div style={bar}>
        <button className="btn-primary" onClick={addReportToProject} disabled={!ready || !hasProjectBridge()} title="중력 리포트를 프로젝트 바인더(자료 > 인물)에 추가">리포트 프로젝트에 추가</button>
        <button className="minibtn" onClick={openInRelationshipMap} disabled={!ready} title="관계도 도구를 열고 인물을 노드로 넘깁니다">관계도로 보내기</button>
        <button className="minibtn" onClick={stashReport} disabled={!ready || !hasStash()} title="수집함에 담기">수집함</button>
        <button className="minibtn" onClick={copyReport} disabled={!ready} title="리포트를 텍스트로 복사">복사</button>
      </div>

      {note && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={scroll}>
        {/* 원고 입력 */}
        <div style={card}>
          <div style={sLabel}>원고 본문</div>
          <textarea
            style={{ ...input, width: '100%', minHeight: 96, resize: 'vertical', lineHeight: 1.5 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="원고를 붙여넣거나, 좌측 바인더 문서를 이 창에 끌어다 놓으세요. 문단 단위로 인물 등장을 집계합니다."
            aria-label="원고 본문"
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => { setText(''); setNote('본문을 비웠어요.') }} disabled={!hasData}>본문 비우기</button>
            <span style={{ ...hint, alignSelf: 'center' }}>{hasData ? `${text.length.toLocaleString()}자` : '비어 있음'}</span>
          </div>
        </div>

        {/* 추적 인물 설정 */}
        <div style={card}>
          <div style={sLabel}>추적할 인물</div>
          {libChars.length > 0 ? (
            <div style={hint}>공유 라이브러리 인물 {libChars.length}명을 자동으로 추적합니다(별칭 포함).</div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={useAuto} onChange={(e) => setUseAuto(e.target.checked)} />
              라이브러리가 비어 있어요 — 본문에서 인물 이름 자동 추출
            </label>
          )}
          <input
            style={{ ...input, width: '100%' }}
            value={extraNames}
            onChange={(e) => setExtraNames(e.target.value)}
            placeholder="추가로 추적할 이름(쉼표/줄바꿈 구분) — 예: 강서연, 도현, 노인"
            aria-label="추가 추적 이름"
          />
          <input
            style={{ ...input, width: '100%' }}
            value={povName}
            onChange={(e) => setPovName(e.target.value)}
            placeholder="POV(시점) 인물 이름 — 중력 가중(선택)"
            aria-label="POV 인물"
          />
          <div style={hint}>추적 대상 {tracked.length}명{tracked.length ? ': ' + tracked.slice(0, 8).map((t) => t.display).join(', ') + (tracked.length > 8 ? ' 외' : '') : ''}</div>
        </div>

        {/* 가중치 */}
        <div style={card}>
          <div style={sLabel}>중력 가중치</div>
          {slider('등장 빈도', wFreq, setWFreq)}
          {slider('POV 보너스', wPov, setWPov)}
          {slider('상호작용', wInter, setWInter)}
          <div style={hint}>각 요소가 중력 계산에 기여하는 비중입니다. 0이면 그 요소를 무시합니다.</div>
        </div>

        {/* 결과 */}
        {!hasData ? (
          <div style={{ ...card, alignItems: 'center', textAlign: 'center', padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>원고를 넣어 인물 중력을 측정하세요</div>
            <div style={hint}>
              위 칸에 원고를 붙여넣거나, 좌측 바인더 문서를 이 창에 끌어다 놓으세요.<br />
              공유 라이브러리에 인물이 있으면 자동으로 추적하고, 없으면 본문에서 이름을 추출할 수 있어요.<br />
              등장 빈도·POV·같은 문단 공동 등장을 합쳐 인물별 영향력(중력)을 계산하고,
              중력이 큰 인물을 중심에 둔 별자리로 배치해 소외된 인물을 찾아 줍니다.
            </div>
          </div>
        ) : !ready ? (
          <div style={{ ...card, alignItems: 'center', textAlign: 'center', padding: 22 }}>
            <div style={hint}>
              {tracked.length === 0
                ? '추적할 인물이 없어요. 라이브러리에 인물을 추가하거나, 위에서 자동 추출을 켜거나 이름을 직접 입력하세요.'
                : '추적 대상 인물이 본문에 등장하지 않아요. 이름 철자가 본문과 같은지 확인하세요.'}
            </div>
          </div>
        ) : (
          <>
            {/* 별자리 시각화 */}
            <div style={card}>
              <div style={sLabel}>중력 별자리</div>
              <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', background: 'radial-gradient(circle at 50% 50%, var(--panel), var(--chrome-2))', border: '1px solid var(--border)' }}>
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="인물 중력 별자리">
                  {/* 궤도 가이드 링 */}
                  {[0.33, 0.66, 1].map((f, i) => (
                    <circle key={i} cx={CX} cy={CY} r={(Math.min(VIEW_W, VIEW_H) / 2 - 50) * f} fill="none" stroke="var(--border)" strokeWidth={1} strokeDasharray="3 5" opacity={0.5} />
                  ))}
                  {/* 상호작용 선(공동 등장) */}
                  {placed.map((pa) =>
                    Array.from(pa.n.partners.entries()).map(([pk, c]) => {
                      const pb = placed.find((q) => q.n.key === pk)
                      if (!pb || pb.n.key <= pa.n.key) return null // 중복 방지(한 방향만)
                      const w = Math.min(4, 0.6 + c * 0.5)
                      return <line key={pa.n.key + '-' + pk} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="var(--accent)" strokeWidth={w} opacity={0.28} />
                    }),
                  )}
                  {/* 중심 표식 */}
                  <circle cx={CX} cy={CY} r={3} fill="var(--muted)" opacity={0.6} />
                  {/* 인물 노드 */}
                  {placed.map((p) => {
                    const sel = selKey === p.n.key
                    const iso = p.n.isolated
                    const fill = iso ? 'var(--warn)' : `hsl(${hashStr(p.n.key) % 360} 62% 52%)`
                    return (
                      <g key={p.n.key} style={{ cursor: 'pointer' }} onClick={() => setSelKey(sel ? null : p.n.key)}>
                        {iso && <circle cx={p.x} cy={p.y} r={p.r + 6} fill="none" stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="3 3" />}
                        <circle cx={p.x} cy={p.y} r={p.r} fill={fill} stroke={sel ? 'var(--accent)' : 'var(--paper)'} strokeWidth={sel ? 3 : 1.5} opacity={0.92} />
                        <text x={p.x} y={p.y + p.r + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)" style={{ pointerEvents: 'none' }}>{p.n.display}</text>
                        <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={Math.max(9, p.r * 0.6)} fontWeight={800} fill="#fff" style={{ pointerEvents: 'none' }}>{p.n.gravity}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div style={hint}>중심에 가까울수록 중력(영향력)이 큽니다. 선은 같은 문단에 함께 등장한 인물(상호작용). 점선 테두리는 소외 경고. 노드를 누르면 상세를 봅니다.</div>
            </div>

            {/* 선택 인물 상세 */}
            {selNode && (
              <div style={card}>
                <div style={sLabel}>선택 인물</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{selNode.display}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                  <span>중력 <b>{selNode.gravity}</b></span>
                  <span>등장 <b>{selNode.freq}</b>회</span>
                  <span>상대 <b>{selNode.partners.size}</b>명</span>
                  {selNode.povHits ? <span style={{ color: 'var(--accent)' }}>POV</span> : null}
                </div>
                <div style={hint}>주요 관계: {topPartners(selNode, 5) || '없음(고립)'}</div>
              </div>
            )}

            {/* 순위 막대 */}
            <div style={card}>
              <div style={sLabel}>중력 순위</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeNodes.map((n, i) => (
                  <div key={n.key} onClick={() => setSelKey(selKey === n.key ? null : n.key)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px', borderRadius: 6, background: selKey === n.key ? 'var(--panel)' : 'transparent' }}>
                    <span style={{ width: 18, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{i + 1}</span>
                    <span style={{ width: 88, flexShrink: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: n.isolated ? 700 : 500, color: n.isolated ? 'var(--warn)' : 'var(--text)' }}>{n.display}</span>
                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--panel)', overflow: 'hidden' }}>
                      <div style={{ width: `${n.gravity}%`, height: '100%', background: n.isolated ? 'var(--warn)' : 'var(--accent)', opacity: 0.85 }} />
                    </div>
                    <span style={{ width: 30, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{n.gravity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 소외 경고 */}
            <div style={{ ...card, borderColor: isolated.length ? 'var(--warn)' : 'var(--border)' }}>
              <div style={{ ...sLabel, color: isolated.length ? 'var(--warn)' : 'var(--muted)' }}>소외 인물 경고 {isolated.length ? `(${isolated.length})` : ''}</div>
              {isolated.length === 0 ? (
                <div style={hint}>모든 추적 인물이 본문에 충분히 등장하고 다른 인물과 얽혀 있습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {isolated.map((n) => (
                    <div key={n.key} style={{ fontSize: 13 }}>
                      <b style={{ color: 'var(--warn)' }}>{n.display}</b>
                      <span style={{ color: 'var(--muted)' }}> — {n.freq === 0 ? '본문에 한 번도 등장하지 않음' : n.partners.size === 0 ? '다른 인물과 함께 등장한 적 없음(고립)' : '등장 비중이 매우 낮음'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 자동 추출 인물 저장 */}
            {libChars.length === 0 && (
              <div style={card}>
                <div style={sLabel}>라이브러리에 저장</div>
                <button className="minibtn" onClick={saveAutoCharsToLibrary}>등장 인물을 공유 라이브러리에 추가</button>
                <div style={hint}>여기서 추출·입력한 인물을 공유 라이브러리에 넣으면 인물 시트·관계도 등 다른 도구에서도 함께 쓸 수 있어요.</div>
              </div>
            )}

            {/* 연계 도구 */}
            <div style={card}>
              <div style={sLabel}>연계 도구</div>
              <div className="linkbar">
                <span className="linkbar-label">함께 열기:</span>
                <button className="linkbtn" onClick={openInRelationshipMap} title="공동 등장 인물을 관계도로 보냅니다">인물 관계도</button>
                <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 도구를 엽니다">인물 시트</button>
                <button className="linkbtn" onClick={() => openToolLinked('pov-tracker', { text })} title="POV 추적 도구를 엽니다">POV 추적</button>
              </div>
            </div>
          </>
        )}

        <div style={hint}>모든 입력과 설정은 이 브라우저에 자동 저장됩니다. 분석은 전부 로컬에서 이루어지며 원고는 외부로 전송되지 않습니다.</div>
      </div>
    </div>
  )
}
