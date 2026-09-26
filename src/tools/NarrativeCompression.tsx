// 서사 압축기 — 한 장면을 1문장 / 1문단 / 1페이지 / 전문(全文)의 4단계 줌 레벨로 오가며
// 압축(줌아웃)과 확장(줌인)을 훈련하는 인터랙티브 작업대.
//  · 원문을 붙여넣거나 좌측 바인더 문서를 드롭/스니펫·payload 로 받으면 자동으로 문장 단위로 분해하고,
//    각 문장의 '무게'(고유명사·대사·동작·감정·감각 신호의 결정론적 점수)를 계산한다.
//  · 줌아웃: 무게 상위 문장만 골라 1문장/1문단/1페이지 목표 길이에 맞춰 압축 초안을 자동 구성.
//  · 줌인: 각 레벨에서 비어 있는 '확장 슬롯'(감각·내면·배경·동작·대사) 스캐폴드를 제시해 부피를 키운다.
//  · 4단계 길이를 막대로 시각화하고, 압축률·정보 보존율(핵심 신호 유지 비율)을 추정한다.
// 자급식: react 와 ./linkbus 만 import. 외부 네트워크/키 불필요(100% 로컬·결정론적 계산).
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
  type SharedSnippet,
} from './linkbus'

export const meta = {
  id: 'narrative-compression',
  name: '서사 압축기',
  icon: '🔎',
  group: '교정·언어',
  intro: '한 장면을 1문장→1문단→1페이지→전문으로 줌인·줌아웃하며 압축·확장 연습',
  w: 460,
  h: 600,
}

const LS_KEY = 'sry:tool:narrative-compression'

// ── 줌 레벨 정의 ────────────────────────────────────────────────
type LevelId = 'logline' | 'para' | 'page' | 'full'
interface LevelDef {
  id: LevelId
  name: string
  // 목표 글자수(대략). 압축 초안 자동 구성 / 막대 시각화 기준.
  target: number
  // 압축 초안에 포함할 핵심 문장 수의 기준
  sentenceCount: number
  blurb: string
}
const LEVELS: LevelDef[] = [
  { id: 'logline', name: '한 문장', target: 60, sentenceCount: 1, blurb: '장면의 심장 한 문장. 누가-무엇을-왜.' },
  { id: 'para', name: '한 문단', target: 320, sentenceCount: 4, blurb: '핵심 전환과 갈등을 담은 요약 문단.' },
  { id: 'page', name: '한 페이지', target: 1400, sentenceCount: 12, blurb: '장면의 흐름을 살린 축약본.' },
  { id: 'full', name: '전문', target: 4000, sentenceCount: 999, blurb: '감각·내면까지 살아 있는 완성 장면.' },
]
const LEVEL_INDEX: Record<LevelId, number> = { logline: 0, para: 1, page: 2, full: 3 }

// ── 결정론적 문자열 해시(시드) ──────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ── 문장 분해 ───────────────────────────────────────────────────
interface Sentence {
  i: number
  text: string
  weight: number
  signals: SignalSet
}
interface SignalSet {
  proper: number   // 고유명사/이름 신호
  dialogue: number // 대사
  action: number   // 동작 동사
  emotion: number  // 감정어
  sense: number    // 감각어
}

function splitSentences(raw: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return []
  // 종결부호 또는 줄바꿈 기준 분해. 따옴표 안 종결부호는 최대한 보존.
  const out: string[] = []
  let buf = ''
  let quote = 0
  for (let k = 0; k < text.length; k++) {
    const ch = text[k]
    buf += ch
    if (ch === '"' || ch === '“' || ch === '”') quote ^= 1
    const isEnd = ch === '.' || ch === '!' || ch === '?' || ch === '…' || ch === '\n'
    if (isEnd && !quote) {
      const next = text[k + 1]
      // 말줄임표/연속 종결부호 묶기
      if ((ch === '.' || ch === '…') && (next === '.' || next === '…')) continue
      const t = buf.trim()
      if (t) out.push(t)
      buf = ''
    }
  }
  const tail = buf.trim()
  if (tail) out.push(tail)
  return out
}

// ── 신호 추출(결정론적 규칙) ────────────────────────────────────
const EMOTION_WORDS = ['슬', '기쁘', '분노', '화', '두려', '무서', '불안', '설레', '외로', '그리', '절망', '희망', '사랑', '미워', '증오', '후회', '부끄', '두근', '떨', '울', '웃', '눈물', '한숨', '비명', '아프', '고통', '행복', '안도', '초조', '긴장']
const SENSE_WORDS = ['빛', '어둠', '그림자', '소리', '냄새', '향', '바람', '차가', '뜨거', '따뜻', '서늘', '붉', '푸르', '하얀', '검은', '눈부', '메아리', '울림', '맛', '촉감', '거친', '부드러', '축축', '건조', '비린', '달콤', '쓴', '시린']
const ACTION_WORDS = ['달렸', '뛰', '걸었', '걸어', '쥐', '잡', '던졌', '밀쳤', '돌아', '멈', '쓰러', '일어', '내리', '올라', '문을', '칼', '주먹', '총', '베', '찔', '부딪', '깨', '무너', '터졌', '폭발', '쫓', '도망', '숨', '뛰어']

function countSubstr(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    let idx = text.indexOf(w)
    while (idx !== -1) { n++; idx = text.indexOf(w, idx + w.length) }
  }
  return n
}

function extractSignals(text: string): SignalSet {
  // 대사: 따옴표 쌍
  const dialogue = (text.match(/["“”]/g)?.length || 0) >= 2 ? 1 : 0
  // 고유명사 근사: 영문 대문자 시작 토큰 + 한글에서 호칭/직함 신호
  const properRe = /[A-Z][a-zA-Z]+/g
  let proper = (text.match(properRe)?.length || 0)
  proper += countSubstr(text, ['씨', '님', '장군', '왕', '공주', '박사', '대장', '선생'])
  const emotion = countSubstr(text, EMOTION_WORDS)
  const sense = countSubstr(text, SENSE_WORDS)
  const action = countSubstr(text, ACTION_WORDS)
  return { proper, dialogue, action, emotion, sense }
}

function scoreSentence(text: string, signals: SignalSet, order: number, total: number): number {
  // 길이 보정(너무 짧은 문장 감점, 적당한 길이 가점)
  const len = text.length
  const lenScore = len < 6 ? -1 : Math.min(3, len / 30)
  // 위치 가중: 첫 문장과 마지막 문장은 장면의 골격일 확률이 높다.
  const posScore = (order === 0 || order === total - 1) ? 1.5 : 0
  const sig =
    signals.proper * 1.4 +
    signals.dialogue * 2.2 +
    signals.action * 1.8 +
    signals.emotion * 1.3 +
    signals.sense * 0.6
  // 결정론적 미세 흔들림(같은 점수 문장 정렬 안정화) — 시드 기반, 영향 작음
  const jitter = (hashStr(text) % 100) / 1000
  return Math.max(0, sig + lenScore + posScore + jitter)
}

function analyze(raw: string): Sentence[] {
  const parts = splitSentences(raw)
  const total = parts.length
  return parts.map((text, i) => {
    const signals = extractSignals(text)
    return { i, text, weight: scoreSentence(text, signals, i, total), signals }
  })
}

// ── 압축 초안 자동 구성(줌아웃) ─────────────────────────────────
function buildCompression(sentences: Sentence[], level: LevelDef): string {
  if (sentences.length === 0) return ''
  if (level.id === 'full') return sentences.map((s) => s.text).join(' ')
  // 무게 상위 N문장을 고르되, 원문 순서를 유지한다.
  const ranked = [...sentences].sort((a, b) => b.weight - a.weight || a.i - b.i)
  const want = Math.min(level.sentenceCount, sentences.length)
  const chosen = ranked.slice(0, want).sort((a, b) => a.i - b.i)
  let draft = chosen.map((s) => s.text).join(' ')
  // 한 문장 레벨은 가장 무거운 단일 문장으로 강하게 압축
  if (level.id === 'logline') {
    draft = ranked[0].text
  }
  // 목표 길이를 크게 넘으면 말미를 부드럽게 잘라 안내
  if (draft.length > level.target * 1.6) {
    draft = draft.slice(0, level.target) + ' …'
  }
  return draft
}

// ── 확장 스캐폴드(줌인) ─────────────────────────────────────────
interface Slot { key: keyof SignalSet | 'inner'; label: string; prompt: string }
const EXPAND_SLOTS: Slot[] = [
  { key: 'sense', label: '감각', prompt: '이 순간 인물이 듣고·보고·냄새 맡는 것 한 가지를 구체적으로 적어 넣으세요.' },
  { key: 'inner', label: '내면', prompt: '겉으로 드러나지 않는 인물의 속생각이나 망설임 한 줄을 넣으세요.' },
  { key: 'action', label: '동작', prompt: '대사 사이에 작은 몸짓(손·시선·자세)을 끼워 긴장을 늦추거나 높이세요.' },
  { key: 'emotion', label: '감정', prompt: '감정을 직접 말하지 말고, 몸의 반응(숨·손끝·목소리)으로 보여 주세요.' },
  { key: 'dialogue', label: '대사', prompt: '핵심 한 마디를 대사로 바꿔 장면에 목소리를 부여하세요.' },
  { key: 'proper', label: '고유성', prompt: '막연한 명사를 고유명·지명·구체적 사물로 바꿔 세계를 또렷하게 하세요.' },
]

function missingSlots(sentences: Sentence[]): Slot[] {
  const agg: SignalSet = { proper: 0, dialogue: 0, action: 0, emotion: 0, sense: 0 }
  for (const s of sentences) {
    agg.proper += s.signals.proper
    agg.dialogue += s.signals.dialogue
    agg.action += s.signals.action
    agg.emotion += s.signals.emotion
    agg.sense += s.signals.sense
  }
  // 신호가 약한 슬롯부터 추천(내면은 신호로 못 잡으므로 항상 후보)
  return EXPAND_SLOTS.filter((slot) => {
    if (slot.key === 'inner') return true
    return (agg[slot.key] || 0) <= 1
  })
}

// ── 핵심 신호 보존율 추정 ───────────────────────────────────────
function signalTotal(sentences: Sentence[]): number {
  let n = 0
  for (const s of sentences) {
    const g = s.signals
    n += g.proper + g.dialogue + g.action + g.emotion + g.sense
  }
  return n
}

// ── 저장 상태 ───────────────────────────────────────────────────
interface Persisted {
  source: string
  drafts: Record<LevelId, string>
  active: LevelId
}
function loadPersisted(): Persisted {
  const base: Persisted = { source: '', drafts: { logline: '', para: '', page: '', full: '' }, active: 'para' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return {
        source: typeof p.source === 'string' ? p.source : '',
        drafts: { ...base.drafts, ...(p.drafts || {}) },
        active: (p.active && LEVEL_INDEX[p.active] !== undefined) ? p.active : 'para',
      }
    }
  } catch { /* noop */ }
  return base
}

export default function NarrativeCompression({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Persisted>(loadPersisted())
  const [source, setSource] = useState(init.current.source)
  const [drafts, setDrafts] = useState<Record<LevelId, string>>(init.current.drafts)
  const [active, setActive] = useState<LevelId>(init.current.active)
  const [dropOver, setDropOver] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const handledPayload = useRef<Record<string, unknown> | undefined>(undefined)
  const snippets = useLibraryList('snippets')

  // 연계 수신: payload 가 바뀔 때마다 적용. 동일 payload 는 ref 가드로 1회만 처리.
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = typeof payload.text === 'string' ? (payload.text as string) : ''
    if (t && t.trim()) setSource((prev) => (prev ? prev : t))
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try {
      const data: Persisted = { source, drafts, active }
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch { /* 용량 초과 무시 */ }
  }, [source, drafts, active])

  useEffect(() => () => { if (toastTimer.current != null) clearTimeout(toastTimer.current) }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1600)
  }, [])

  const sentences = useMemo(() => analyze(source), [source])
  const sourceSignals = useMemo(() => signalTotal(sentences), [sentences])
  const slots = useMemo(() => missingSlots(sentences), [sentences])

  const activeDef = LEVELS[LEVEL_INDEX[active]]
  const activeDraft = drafts[active]

  // 현재 레벨 압축 초안 자동 생성
  const generate = useCallback((lvl: LevelId) => {
    if (sentences.length === 0) { flash('먼저 원문을 입력하세요'); return }
    const def = LEVELS[LEVEL_INDEX[lvl]]
    const draft = buildCompression(sentences, def)
    setDrafts((d) => ({ ...d, [lvl]: draft }))
    setActive(lvl)
    flash(def.name + ' 초안 생성됨')
  }, [sentences, flash])

  // 줌 인/아웃 한 단계
  const zoom = useCallback((dir: -1 | 1) => {
    const cur = LEVEL_INDEX[active]
    const next = Math.max(0, Math.min(LEVELS.length - 1, cur + dir))
    const lvl = LEVELS[next].id
    if (!drafts[lvl] && lvl !== 'full') generate(lvl)
    else if (lvl === 'full' && !drafts.full) setDrafts((d) => ({ ...d, full: source }))
    setActive(lvl)
  }, [active, drafts, generate, source])

  // 길이 통계
  const lenOf = (id: LevelId) => (id === 'full' ? (drafts.full || source).length : drafts[id].length)
  const maxLen = Math.max(activeDef.target, ...LEVELS.map((l) => Math.max(l.target, lenOf(l.id))), 1)

  // 압축률 / 보존율(현재 레벨 기준)
  // full 레벨은 활성 초안이 비어 있어도 표시본(drafts.full || source)으로 길이를 잡는다.
  const curText = active === 'full' ? (drafts.full || source) : activeDraft
  const fullLen = (drafts.full || source).length || source.length
  const ratio = fullLen > 0 ? Math.round((curText.length / fullLen) * 100) : 0
  const draftSignals = useMemo(() => signalTotal(analyze(curText)), [curText])
  const retention = sourceSignals > 0 ? Math.min(100, Math.round((draftSignals / sourceSignals) * 100)) : 0

  // ── 드롭(좌측 바인더 문서) ──
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropOver(false)
    const item = getDragItem(e)
    if (item && item.text && item.text.trim()) {
      setSource(item.text)
      flash('문서 "' + (item.title || '문서') + '" 불러옴')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDropOver(true) } }
  const onDragLeave = () => setDropOver(false)

  // ── 스니펫 불러오기 ──
  const useSnippet = (sn: SharedSnippet) => { setSource(sn.text); flash('스니펫 불러옴') }

  // ── 산출물 내보내기 ──
  const saveSnippet = () => {
    const txt = (active === 'full' ? (drafts.full || source) : activeDraft).trim()
    if (!txt) { flash('내보낼 초안이 없습니다'); return }
    addToLibrary('snippets', { text: txt, source: '서사 압축기: ' + activeDef.name, tags: ['compression', active] })
    flash('스니펫으로 저장됨')
  }
  const toProject = () => {
    const txt = (active === 'full' ? (drafts.full || source) : activeDraft).trim()
    if (!txt) { flash('보낼 초안이 없습니다'); return }
    if (!hasProjectBridge()) { flash('프로젝트가 연결되지 않았습니다'); return }
    const html = txt.split(/\n+/).map((p) => '<p>' + escapeHtml(p) + '</p>').join('')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '압축 초안',
      title: activeDef.name + ' 압축',
      bodyHtml: html,
      synopsis: drafts.logline || '',
      meta: { 레벨: activeDef.name, 압축률: ratio + '%', 보존율: retention + '%' },
    })
    flash(id ? '프로젝트에 추가됨' : '추가 실패')
  }
  const toStash = () => {
    const txt = (active === 'full' ? (drafts.full || source) : activeDraft).trim()
    if (!txt) { flash('담을 초안이 없습니다'); return }
    if (!hasStash()) { flash('수집함이 없습니다'); return }
    addToStash({ kind: 'memo', label: '압축 ' + activeDef.name + ' (' + ratio + '%)', text: txt })
    flash('수집함에 담음')
  }
  const openProofread = () => {
    const txt = activeDraft.trim() || source.trim()
    if (!txt) { flash('보낼 텍스트가 없습니다'); return }
    openToolLinked('adverb-highlighter', { text: txt })
  }

  const updateDraft = (v: string) => setDrafts((d) => ({ ...d, [active]: v }))

  const sample = '비가 쏟아지는 항구. 카일은 부두 끝에 서서 멀어지는 배를 바라보았다. "가지 마." 그녀의 목소리가 바람에 찢겼다. 그는 차가운 난간을 움켜쥐었다. 손끝이 떨렸지만 돌아서지 않았다. 멀리서 등대가 붉게 깜빡였다. 마지막 뱃고동이 울렸을 때, 카일은 비로소 자신이 무엇을 잃었는지 알았다.'

  // ── 스타일 ──
  const css: Record<string, React.CSSProperties> = {
    wrap: { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' },
    head: { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 },
    src: {
      minHeight: 70, maxHeight: 120, resize: 'vertical', boxSizing: 'border-box', width: '100%',
      background: dropOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
      border: '1px solid ' + (dropOver ? 'var(--accent)' : 'var(--border)'),
      borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
    },
    row: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
    levelBar: { display: 'flex', gap: 4 },
    scroll: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 },
    section: { fontSize: 12, fontWeight: 700, color: 'var(--muted)' },
    draftArea: {
      minHeight: 120, boxSizing: 'border-box', width: '100%', resize: 'vertical',
      background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '11px 13px', fontSize: 14.5, lineHeight: 1.75, outline: 'none', fontFamily: 'inherit',
    },
    statRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
    stat: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 6px', textAlign: 'center' },
    statVal: { fontSize: 19, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] },
    statLbl: { fontSize: 10.5, color: 'var(--muted)', marginTop: 3 },
    card: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' },
    slotHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
    tip: { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 },
    empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.7, padding: 16 },
    hint: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 },
    toast: { position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--paper)', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,.25)', whiteSpace: 'nowrap', zIndex: 5 },
  }
  const tag = (c: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: c, border: '1px solid ' + c, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })
  const levelBtn = (active_: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 12, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
    border: '1px solid ' + (active_ ? 'var(--accent)' : 'var(--border)'),
    background: active_ ? 'var(--accent)' : 'var(--chrome-2)',
    color: active_ ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: active_ ? 700 : 500,
  })

  const hasSource = source.trim() !== ''
  const ratioColor = ratio <= 15 ? 'var(--ok)' : ratio <= 60 ? 'var(--accent)' : 'var(--warn)'
  const retColor = retention >= 70 ? 'var(--ok)' : retention >= 40 ? 'var(--accent)' : 'var(--warn)'

  return (
    <div style={{ ...css.wrap, position: 'relative' }}>
      <div style={css.head}>
        한 장면을 네 단계의 줌으로 오가며 압축(줌아웃)하고 확장(줌인)합니다. 원문을 붙여넣거나 좌측 문서를 끌어다 놓으세요.
      </div>

      <textarea
        style={css.src}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        placeholder="압축·확장할 원문 장면을 여기에 붙여넣으세요. 좌측 바인더 문서를 끌어다 놓을 수도 있습니다."
        spellCheck={false}
        aria-label="원문 장면 입력"
      />

      <div style={css.row}>
        <span style={css.hint}>{sentences.length}문장 · {source.length}자 · 핵심신호 {sourceSignals}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" type="button" onClick={() => setSource(sample)}>예시</button>
        <button className="minibtn" type="button" onClick={() => { setSource(''); setDrafts({ logline: '', para: '', page: '', full: '' }) }} disabled={!hasSource}>비우기</button>
      </div>

      {/* 스니펫 라이브러리 수용 */}
      {snippets.length > 0 && (
        <div style={css.row}>
          <span style={css.hint}>스니펫:</span>
          {snippets.slice(0, 4).map((sn) => (
            <button key={sn.id} className="minibtn" type="button" title={sn.text.slice(0, 80)} onClick={() => useSnippet(sn)}>
              {(sn.text.slice(0, 12) || '스니펫') + (sn.text.length > 12 ? '…' : '')}
            </button>
          ))}
        </div>
      )}

      {/* 줌 레벨 선택 */}
      <div style={css.levelBar}>
        {LEVELS.map((l) => (
          <div key={l.id} style={levelBtn(l.id === active)} role="button" tabIndex={0}
            onClick={() => { setActive(l.id); if (!drafts[l.id] && l.id !== 'full' && hasSource) generate(l.id) }}
            title={l.blurb}>
            {l.name}
          </div>
        ))}
      </div>

      {!hasSource ? (
        <div style={css.empty}>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent)' }}>1 → 4</div>
          <div>원문을 넣으면 가장 무거운 문장을 골라<br />한 문장 / 한 문단 / 한 페이지 초안을 자동 구성합니다.</div>
          <div style={css.hint}>좌측 바인더 문서 드롭 · 스니펫 · 다른 도구에서 전달된 텍스트도 받습니다.</div>
        </div>
      ) : (
        <div style={css.scroll}>
          {/* 4단계 길이 막대 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={css.section}>줌 단계 — 길이 비교</div>
            {LEVELS.map((l) => {
              const len = lenOf(l.id)
              const w = Math.min(100, (len / maxLen) * 100)
              const isAct = l.id === active
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 52, fontSize: 11.5, color: isAct ? 'var(--accent)' : 'var(--muted)', fontWeight: isAct ? 700 : 500, flexShrink: 0 }}>{l.name}</span>
                  <div style={{ flex: 1, height: 14, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: w + '%', height: '100%', background: isAct ? 'var(--accent)' : 'var(--border)', transition: 'width .3s' }} />
                    {/* 목표 표시선 */}
                    <div style={{ position: 'absolute', top: 0, left: Math.min(100, (l.target / maxLen) * 100) + '%', height: '100%', borderLeft: '1px dashed var(--muted)', opacity: .6 }} />
                  </div>
                  <span style={{ width: 46, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>{len}자</span>
                </div>
              )
            })}
            <div style={css.hint}>점선은 각 단계의 목표 길이입니다. 단계를 누르면 그 길이로 자동 압축됩니다.</div>
          </div>

          {/* 줌 컨트롤 */}
          <div style={css.row}>
            <button className="minibtn" type="button" onClick={() => zoom(-1)} disabled={LEVEL_INDEX[active] === 0}>← 줌아웃(압축)</button>
            <button className="minibtn" type="button" onClick={() => zoom(1)} disabled={LEVEL_INDEX[active] === LEVELS.length - 1}>줌인(확장) →</button>
            <span style={{ flex: 1 }} />
            <button className="btn-primary" type="button" onClick={() => generate(active)} disabled={active === 'full'}>이 단계로 압축</button>
          </div>

          {/* 현재 단계 초안 편집 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={css.section}>{activeDef.name} 초안 — {activeDef.blurb}</div>
            <textarea
              style={css.draftArea}
              value={active === 'full' ? (drafts.full || source) : activeDraft}
              onChange={(e) => active === 'full' ? setDrafts((d) => ({ ...d, full: e.target.value })) : updateDraft(e.target.value)}
              placeholder={active === 'full' ? '전문 단계입니다. 원문을 그대로 다듬으세요.' : '"이 단계로 압축"을 누르면 핵심 문장으로 초안이 채워집니다. 직접 손봐도 됩니다.'}
              spellCheck={false}
              aria-label="초안 편집"
            />
          </div>

          {/* 압축률·보존율 */}
          <div style={css.statRow}>
            <div style={css.stat}><div style={{ ...css.statVal, color: ratioColor }}>{ratio}%</div><div style={css.statLbl}>압축률(전문 대비)</div></div>
            <div style={css.stat}><div style={{ ...css.statVal, color: retColor }}>{retention}%</div><div style={css.statLbl}>핵심신호 보존</div></div>
            <div style={css.stat}><div style={{ ...css.statVal, color: 'var(--accent)' }}>{activeDraft.length || (active === 'full' ? (drafts.full || source).length : 0)}</div><div style={css.statLbl}>현재 글자수</div></div>
          </div>

          {/* 확장 스캐폴드(줌인 보조) */}
          {LEVEL_INDEX[active] < 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={css.section}>확장 슬롯 — 부피를 키울 후보 ({slots.length})</div>
              {slots.length === 0 ? (
                <div style={css.tip}>이미 감각·내면·동작·대사 신호가 고루 들어 있습니다. 한 단계 줌인해 디테일을 늘려 보세요.</div>
              ) : slots.map((s) => (
                <div key={s.label} style={css.card}>
                  <div style={css.slotHead}>
                    <span style={tag('var(--accent)')}>{s.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>보강 추천</span>
                  </div>
                  <div style={css.tip}>{s.prompt}</div>
                </div>
              ))}
            </div>
          )}

          {/* 핵심 문장 랭킹(압축의 근거) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={css.section}>무게순 핵심 문장 — 압축의 근거</div>
            {[...sentences].sort((a, b) => b.weight - a.weight).slice(0, 6).map((s, idx) => (
              <div key={s.i} style={css.card}>
                <div style={css.slotHead}>
                  <span style={tag(idx < 2 ? 'var(--ok)' : 'var(--muted)')}>{idx + 1}위 · {s.weight.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {[s.signals.dialogue && '대사', s.signals.action && '동작', s.signals.emotion && '감정', s.signals.sense && '감각', s.signals.proper && '고유명'].filter(Boolean).join(' · ') || '서술'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* 산출물 연동 */}
          <div className="linkbar" style={css.row}>
            <button className="linkbtn minibtn" type="button" onClick={saveSnippet}>스니펫 저장</button>
            <button className="linkbtn minibtn" type="button" onClick={toProject}>프로젝트에 추가</button>
            <button className="linkbtn minibtn" type="button" onClick={toStash}>수집함에 담기</button>
            <button className="linkbtn minibtn" type="button" onClick={openProofread}>부사 점검 열기</button>
          </div>

          <div className="license-note" style={css.hint}>
            문장 무게·신호는 결정론적 규칙으로 추정한 근사치입니다. 압축 초안은 출발점일 뿐, 문맥에 맞게 손보세요. 모든 계산은 브라우저에서만 이뤄지며 외부 전송이 없습니다.
          </div>
        </div>
      )}

      {toast && <div style={css.toast}>{toast}</div>}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
