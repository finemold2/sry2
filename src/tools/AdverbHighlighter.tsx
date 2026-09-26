// 부사 남용 점검 — textarea 에 글을 붙여넣으면 군더더기 부사(정말/매우/너무/굉장히 등)와
// '-하게/-스럽게/-로이' 등 부사형 어미를 로컬 정규식으로 탐지해 강조 표시하고, 빈도순 목록·비율(%)과
// "부사 대신 보여주라"는 퇴고 조언을 함께 보여준다.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 규칙). 모든 검사는 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'adverb-highlighter', name: '부사 남용 점검', icon: '🪶', group: '교정·언어', intro: '군더더기 부사를 찾아 강조하고 빈도·비율과 함께 "보여주기"로 다듬으라 조언합니다', w: 520, h: 600 }

// ── 탐지 규칙 ───────────────────────────────────────────────
// kind: filler(정도·군더더기 부사, 빨강 강조) / form(부사형 어미, 노랑 강조)
//       / conj(논리 연결어 — 군더더기가 아닌 약한 강조. 연결이 필요하면 유지)
type Kind = 'filler' | 'form' | 'conj'
interface AdverbRule {
  id: string
  re: RegExp        // 전역(g) 정규식
  kind: Kind
  // 매치별 조언. label 은 매치 텍스트(정규화)로 표시한다.
  tip: string
}

// 안전한 RegExp 생성 헬퍼(항상 전역 플래그)
const R = (src: string, flags = 'g') => new RegExp(src, flags.includes('g') ? flags : flags + 'g')

// 1) 정도·강조·군더더기 부사: 단어 경계가 없는 한글 특성상 토큰 단위로 분리해 검사하는 게 안전하지만,
//    실용적으로 자주 남용되는 정도부사는 직접 패턴으로 잡고, 어절 단위 후처리로 거른다.
const FILLER_WORDS = [
  '정말', '진짜', '참', '매우', '너무', '굉장히', '엄청', '엄청나게', '완전', '완전히',
  '아주', '되게', '몹시', '무척', '꽤', '제법', '상당히', '대단히', '굉장',
  '그냥', '막', '좀', '조금', '약간', '다소',
  '그저', '단지', '단순히', '거의', '대체로', '대부분',
  '사실', '사실상', '솔직히', '확실히', '분명히', '당연히', '물론',
  '결국', '어쨌든', '아무튼', '하여튼', '여하튼',
  '바로', '곧', '즉', '마치', '흡사',
  '항상', '늘', '언제나', '가끔', '종종', '때때로', '자주', '간혹',
  '매우매우', '아주아주',
]

// 논리 연결어(접속부사) — 군더더기(빨강)가 아니라 약한 강조(conj)로만 표시한다.
// 부사 비율 계산에서도 제외한다. 연결이 필요하면 그대로 두면 된다.
const CONJ_WORDS = [
  '그러므로', '따라서', '그래서', '그러나', '하지만', '그리고', '또한', '게다가',
]

const CONJ_TIP = "논리 연결어입니다. 연결이 필요하면 유지하세요. 다만 매 문장 앞에 반복되면 군더더기가 될 수 있습니다."

// 정도부사별 맞춤 조언(없으면 기본 조언)
const FILLER_TIP: Record<string, string> = {
  '정말': "강조는 형용사·동사 선택으로. '정말 슬펐다'보다 '목이 메었다'.",
  '진짜': "구어체 강조어. 문어라면 빼거나 더 구체적인 표현으로.",
  '매우': "정도를 말로 하지 말고 장면으로 보여주세요.",
  '너무': "본래 부정적 과함을 뜻합니다. 긍정 강조엔 '아주/무척'이 자연스럽고, 대개는 빼는 편이 낫습니다.",
  '굉장히': "막연한 강조. 무엇이 어떻게 굉장한지 구체화하세요.",
  '엄청': "구어 강조어. 수치·비유·행동으로 크기를 보여주세요.",
  '완전': "'완전 좋다'식 구어. 문어에서는 빼거나 '완전히/전적으로'.",
  '아주': "정도부사 남용 주의. 장면·동작으로 정도를 드러내세요.",
  '되게': "구어체. 문어라면 제거하거나 정도를 묘사로.",
  '그냥': "의미가 옅은 군더더기. 대개 빼도 문장이 또렷해집니다.",
  '막': "구어 군더더기. 동작을 구체적으로 쓰면 필요 없습니다.",
  '좀': "완곡·습관 표현. 정말 필요한지 확인하고 자주 빼세요.",
  '조금': "정도가 모호. 얼마나인지 구체적으로 쓰면 더 좋습니다.",
  '약간': "정도를 묘사로 대체할 수 있는지 보세요.",
  '거의': "단정 회피어. 가능하면 사실대로 단정하세요.",
  '사실': "군더더기 담화표지인 경우가 많습니다. 빼도 되는지 확인.",
  '솔직히': "담화표지. 글에서는 대개 불필요합니다.",
  '항상': "단정 부사. 정말 '항상'인지, 예외는 없는지 확인하세요.",
  '늘': "상투적 빈도부사. 구체적 빈도·장면으로 바꿔보세요.",
  '결국': "남용하면 인과가 헐거워 보입니다. 꼭 필요할 때만.",
  '바로': "강조 군더더기인 경우가 많습니다.",
}

const DEFAULT_FILLER_TIP = "정도·강조 부사입니다. 빼거나, 감정·상태를 '말하지 말고 보여주는' 묘사로 바꿔보세요."

// 부사형 어미 규칙(접미 패턴) — 어절 끝에서 검사
const FORM_RULES: AdverbRule[] = [
  { id: 'hage', kind: 'form', re: R('[가-힣]{1,6}하게'), tip: "'-하게'가 잦으면 글이 늘어집니다. 형용사·동사로 압축하거나 동작으로 보여주세요." },
  { id: 'seureopge', kind: 'form', re: R('[가-힣]{1,6}스럽게'), tip: "'-스럽게'는 추상적 인상어입니다. 구체적 행동·디테일로 대체해보세요." },
  { id: 'doerok', kind: 'form', re: R('[가-힣]{1,6}도록'), tip: "'-도록'(목적·정도) 부사절. 반복되면 문장 구조를 단순화하세요." },
  { id: 'roi', kind: 'form', re: R('[가-힣]{1,5}로이'), tip: "'-로이' 부사. 상투적이면 다른 표현을 찾아보세요(새로이, 외로이 등)." },
  { id: 'eobsi', kind: 'form', re: R('[가-힣]{1,5}없이'), tip: "'-없이' 부사. 같은 형태가 반복되면 변주하거나 묘사로 바꾸세요." },
  { id: 'jeokeuro', kind: 'form', re: R('[가-힣]{1,6}적으로'), tip: "'-적으로'는 번역투·추상화의 신호입니다. 구체어로 풀어 쓰는 게 더 또렷합니다." },
]

// ── 검사 실행 ───────────────────────────────────────────────
interface Hit {
  id: string          // 규칙/단어 식별자
  kind: Kind
  label: string       // 표시용 매치 텍스트(정규화)
  tip: string
  index: number
  end: number
  match: string
}

// 한국어 어절(공백 분리) 수 — 비율 계산용. 한글이 하나라도 포함된 토큰만 센다.
function countEojeol(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter((w) => /[가-힣]/.test(w)).length
}

// 정도부사를 '독립 부사 어절'로만 잡기 위한 정규식.
// 앞은 (문자열 시작|공백|문장부호|개행), 뒤는 조사 없이 (공백|문장부호|끝)이어야 한다.
// 예: '정말 좋다'의 '정말'은 매치, '정말로/정말이지'는 형태가 달라 별도 처리 안 함(과탐 방지).
function buildFillerRegex(words: string[]): RegExp {
  // 긴 단어 우선(매우매우 > 매우) 정렬로 최장 일치 유도
  const sorted = [...new Set(words)].sort((a, b) => b.length - a.length)
  const alt = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  // (?<=경계) (단어) (?=경계). 경계: 시작/끝/공백/한글이 아닌 문장부호류
  const boundaryBefore = '(?<=^|[\\s.,!?…"\'“”‘’()\\[\\]{}\\-—~])'
  const boundaryAfter = '(?=$|[\\s.,!?…"\'“”‘’()\\[\\]{}\\-—~])'
  return new RegExp(`${boundaryBefore}(${alt})${boundaryAfter}`, 'g')
}

const FILLER_RE = buildFillerRegex(FILLER_WORDS)
// 논리 연결어는 동일한 어절 경계 규칙으로 잡되, 별도 kind(conj)로 분류한다.
const CONJ_RE = buildFillerRegex(CONJ_WORDS)

function runScan(text: string): Hit[] {
  if (!text) return []
  const hits: Hit[] = []

  // 1) 정도·군더더기 부사
  FILLER_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = FILLER_RE.exec(text)) !== null) {
    if (guard++ > 20000) break
    const word = m[1]
    hits.push({
      id: `filler:${word}`,
      kind: 'filler',
      label: word,
      tip: FILLER_TIP[word] ?? DEFAULT_FILLER_TIP,
      index: m.index + (m[0].length - word.length), // 룩비하인드 없는 환경 대비, 보통 0
      end: m.index + m[0].length,
      match: word,
    })
    if (m.index === FILLER_RE.lastIndex) FILLER_RE.lastIndex++
  }

  // 1-2) 논리 연결어(접속부사) — 군더더기가 아닌 약한 강조(conj). 비율 계산에서 제외된다.
  CONJ_RE.lastIndex = 0
  let mc: RegExpExecArray | null
  let guardC = 0
  while ((mc = CONJ_RE.exec(text)) !== null) {
    if (guardC++ > 20000) break
    const word = mc[1]
    hits.push({
      id: `conj:${word}`,
      kind: 'conj',
      label: word,
      tip: CONJ_TIP,
      index: mc.index + (mc[0].length - word.length),
      end: mc.index + mc[0].length,
      match: word,
    })
    if (mc.index === CONJ_RE.lastIndex) CONJ_RE.lastIndex++
  }

  // 2) 부사형 어미(접미 패턴) — 어절 끝에 붙는 형태. 단, 정도부사로 이미 잡힌 위치와 겹치면 제외.
  for (const rule of FORM_RULES) {
    rule.re.lastIndex = 0
    let mm: RegExpExecArray | null
    let g2 = 0
    while ((mm = rule.re.exec(text)) !== null) {
      if (g2++ > 20000) break
      const start = mm.index
      const end = mm.index + mm[0].length
      // 뒤에 한글이 더 붙으면(예: '하게끔') 어미가 아니므로 거른다.
      const nextCh = text[end]
      if (nextCh && /[가-힣]/.test(nextCh)) {
        if (mm.index === rule.re.lastIndex) rule.re.lastIndex++
        continue
      }
      hits.push({
        id: `form:${rule.id}`,
        kind: 'form',
        label: mm[0],
        tip: rule.tip,
        index: start,
        end,
        match: mm[0],
      })
      if (mm.index === rule.re.lastIndex) rule.re.lastIndex++
    }
  }

  // 위치순 정렬 + 동일 위치 겹침 제거(긴 매치 우선)
  hits.sort((a, b) => a.index - b.index || b.end - a.end)
  const filtered: Hit[] = []
  let lastEnd = -1
  for (const h of hits) {
    if (h.index >= lastEnd) {
      filtered.push(h)
      lastEnd = h.end
    } else if (h.end > lastEnd) {
      // 부분 겹침: 짧은 쪽은 버린다(정렬상 앞이 더 길므로 보통 유지됨)
      lastEnd = Math.max(lastEnd, h.end)
    }
  }
  return filtered
}

// 강조 표시용 세그먼트 생성(텍스트를 hit 경계로 잘라 일반/강조 조각으로)
interface Seg { text: string; hit: Hit | null }
function buildSegments(text: string, hits: Hit[]): Seg[] {
  if (hits.length === 0) return [{ text, hit: null }]
  const segs: Seg[] = []
  let cur = 0
  for (const h of hits) {
    if (h.index > cur) segs.push({ text: text.slice(cur, h.index), hit: null })
    segs.push({ text: text.slice(h.index, h.end), hit: h })
    cur = h.end
  }
  if (cur < text.length) segs.push({ text: text.slice(cur), hit: null })
  return segs
}

const KIND_COLOR: Record<Kind, string> = { filler: 'var(--warn)', form: 'var(--accent)', conj: 'var(--muted)' }
const KIND_LABEL: Record<Kind, string> = { filler: '정도·군더더기 부사', form: '부사형 어미', conj: '논리 연결어' }

export default function AdverbHighlighter({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Kind>('all')

  // [연계] 다른 도구가 보낸 본문(payload.text)을 점검 대상으로 채움 — 같은 payload 는 1회만 처리(부모 리렌더 시 재적용 방지)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = typeof payload.text === 'string' ? payload.text : ''
    if (t.trim()) setText(t)
  }, [payload]) // eslint-disable-line
  const copyTimer = useRef<number | null>(null)

  // 언마운트 시 복사 타이머 정리
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const hits = useMemo(() => {
    try { return runScan(text) } catch { return [] }
  }, [text])

  const stats = useMemo(() => {
    const eojeol = countEojeol(text)
    const filler = hits.filter((h) => h.kind === 'filler').length
    const form = hits.filter((h) => h.kind === 'form').length
    const conj = hits.filter((h) => h.kind === 'conj').length
    // 부사 합계·비율에는 논리 연결어(conj)를 포함하지 않는다(군더더기가 아니므로).
    const total = filler + form
    const ratio = eojeol > 0 ? (total / eojeol) * 100 : 0
    return { eojeol, filler, form, conj, total, ratio }
  }, [hits, text])

  // 빈도순 집계(같은 표현끼리 묶어 횟수 카운트)
  const freq = useMemo(() => {
    const map = new Map<string, { label: string; kind: Kind; tip: string; count: number }>()
    for (const h of hits) {
      const key = `${h.kind}:${h.label}`
      const cur = map.get(key)
      if (cur) cur.count++
      else map.set(key, { label: h.label, kind: h.kind, tip: h.tip, count: 1 })
    }
    let arr = [...map.values()]
    if (filter !== 'all') arr = arr.filter((x) => x.kind === filter)
    arr.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    return arr
  }, [hits, filter])

  const segments = useMemo(() => buildSegments(text, hits), [text, hits])

  // 결과 텍스트(복사용)
  const resultText = useMemo(() => {
    if (hits.length === 0) return ''
    const lines: string[] = []
    lines.push('[부사 남용 점검 결과]')
    lines.push(`어절 ${stats.eojeol}개 중 부사 ${stats.total}개 (${stats.ratio.toFixed(1)}%)`)
    lines.push(`· 정도·군더더기 부사 ${stats.filler}개 / 부사형 어미 ${stats.form}개${stats.conj > 0 ? ` / 논리 연결어 ${stats.conj}개(비율 제외)` : ''}`)
    lines.push('')
    lines.push('— 빈도순 —')
    const all = freq.length > 0 ? freq : []
    for (const f of all) {
      lines.push(`${f.count}회  ${f.label}  [${KIND_LABEL[f.kind]}]`)
    }
    lines.push('')
    lines.push('조언: 정도·강조 부사를 줄이고, 감정·상태를 직접 말하기보다 행동·감각으로 "보여주세요".')
    return lines.join('\n')
  }, [hits, freq, stats])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const sample = '그는 정말 너무 슬펐다. 그러나 사실 그냥 좀 무서웠던 것 같다. 그리고 그녀는 매우 조용하게, 아주 우아하게 걸었고 굉장히 신비스럽게 웃었다. 하지만 솔직히 나는 항상 그를 거의 완전 믿었다. 따라서 결국 그것은 충격적으로, 비극적으로 끝났다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 150, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const ratioBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }
  const ratioColor = stats.ratio >= 12 ? 'var(--warn)' : stats.ratio >= 7 ? 'var(--accent)' : 'var(--ok)'
  const ratioVerdict = stats.ratio >= 12 ? '부사가 많습니다 — 덜어내세요' : stats.ratio >= 7 ? '보통 — 군더더기를 점검하세요' : '담백한 편입니다'
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const preview: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const mark = (color: string): React.CSSProperties => ({ background: color, color: 'var(--paper)', borderRadius: 4, padding: '0 3px', fontWeight: 600 })
  // 논리 연결어용 약한 강조: 채우지 않고 점선 밑줄만(군더더기가 아니라 '필요하면 유지'한다는 신호)
  const markWeak = (color: string): React.CSSProperties => ({ borderBottom: `2px dashed ${color}`, color: 'var(--text)', fontWeight: 600 })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const wordTxt: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text)' }
  const countTxt: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const tipTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  const showResults = text.trim() !== ''

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>🪶 글을 붙여넣으면 군더더기 부사를 찾아 강조하고 비율을 보여줍니다 (네트워크 불필요)</div>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="점검할 글을 여기에 붙여넣으세요. 입력하는 동안 실시간으로 부사를 탐지합니다."
        spellCheck={false}
        aria-label="점검할 텍스트 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {stats.total}</span>
        <span style={chip(filter === 'filler', KIND_COLOR.filler)} onClick={() => setFilter('filler')} role="button" tabIndex={0}>정도부사 {stats.filler}</span>
        <span style={chip(filter === 'form', KIND_COLOR.form)} onClick={() => setFilter('form')} role="button" tabIndex={0}>-하게류 {stats.form}</span>
        <span style={chip(filter === 'conj', KIND_COLOR.conj)} onClick={() => setFilter('conj')} role="button" tabIndex={0}>연결어 {stats.conj}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={hits.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {!showResults ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>🪶</div>
          <div>글을 붙여넣으면 정말·매우·너무·굉장히·그냥·좀<br />같은 부사와 '-하게/-스럽게' 어미를 강조합니다.</div>
          <div style={hint}>부사를 줄이고 감정·상태를 행동·감각으로 '보여주면' 글이 또렷해집니다.</div>
        </div>
      ) : (
        <div style={scroll}>
          {/* 비율 요약 */}
          <div style={ratioBox}>
            <div style={{ fontSize: 30, fontWeight: 800, color: ratioColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], minWidth: 78, textAlign: 'center' }}>
              {stats.ratio.toFixed(1)}<span style={{ fontSize: 15 }}>%</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: ratioColor }}>{ratioVerdict}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>어절 {stats.eojeol}개 중 부사 {stats.total}개</div>
              <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, stats.ratio * 4)}%`, height: '100%', background: ratioColor, transition: 'width .3s' }} />
              </div>
            </div>
          </div>

          <div style={grid3}>
            <div style={stat}><div style={statVal}>{stats.total}</div><div style={statLabel}>전체 부사</div></div>
            <div style={{ ...stat }}><div style={{ ...statVal, color: KIND_COLOR.filler }}>{stats.filler}</div><div style={statLabel}>정도부사</div></div>
            <div style={{ ...stat }}><div style={{ ...statVal, color: KIND_COLOR.form }}>{stats.form}</div><div style={statLabel}>-하게류</div></div>
          </div>

          {/* 강조 미리보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionTitle}>🖍 강조 미리보기 ({filter === 'all' ? '전체' : KIND_LABEL[filter as Kind]})</div>
            <div style={preview}>
              {segments.map((s, i) => {
                if (!s.hit) return <span key={i}>{s.text}</span>
                if (filter !== 'all' && s.hit.kind !== filter) return <span key={i}>{s.text}</span>
                const ms = s.hit.kind === 'conj' ? markWeak(KIND_COLOR[s.hit.kind]) : mark(KIND_COLOR[s.hit.kind])
                return <span key={i} style={ms} title={s.hit.tip}>{s.text}</span>
              })}
            </div>
          </div>

          {/* 빈도순 목록 */}
          {freq.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>📊 빈도순 ({freq.length}종)</div>
              {freq.map((f, i) => (
                <div key={`${f.kind}-${f.label}-${i}`} style={card}>
                  <div style={cardHead}>
                    <span style={tag(KIND_COLOR[f.kind])}>{KIND_LABEL[f.kind]}</span>
                    <span style={wordTxt}>{f.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={countTxt}>{f.count}회</span>
                  </div>
                  <div style={tipTxt}>{f.tip}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={empty}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div>{stats.total === 0 ? '두드러진 부사가 없습니다. 담백합니다!' : '선택한 분류에 해당하는 부사가 없습니다.'}</div>
            </div>
          )}

          <div style={hint}>
            규칙 기반 근사 탐지라 일부 과탐/누락이 있을 수 있습니다. 강조는 '덜어낼 후보'일 뿐, 문맥에 필요한 부사는 남기세요.
          </div>
        </div>
      )}
    </div>
  )
}
