// 오감 점검 체크리스트 — 한 장면에 시각·청각·후각·미각·촉각이 고루 쓰였는지 점검한다.
//  ① 점검: 다섯 감각을 손수 체크하고, 각 감각마다 묘사 아이디어(동사·형용사·소재)를 무작위로 제안받는다(재생성).
//  ② 분석: 본문을 붙여넣으면 감각어 사전(로컬)으로 감각별 빈도를 간이 집계해 어느 감각이 비었는지 짚어준다.
//  ③ 저장: 점검 결과·아이디어를 스니펫으로 저장하고, 프로젝트 자료에 메모로 추가한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·API·이미지·폰트 일절 미사용(전부 로컬 데이터·정규식).
// 모든 어휘는 직접 작성한 창작·일반 어휘이며, localStorage('sry:tool:sensory-checklist')에 체크 상태를 보존한다. 언마운트 시 타이머 정리.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sensory-checklist', name: '오감 점검 체크리스트', icon: '🖐️', group: '교정·언어', intro: '한 장면에 오감(시각·청각·후각·미각·촉각)이 고루 쓰였는지 체크하고 본문의 감각어 빈도를 간이 분석합니다', w: 560, h: 660 }

// ── 감각 정의 ───────────────────────────────────────────────
type SenseKey = 'sight' | 'sound' | 'smell' | 'taste' | 'touch'
interface SenseDef {
  key: SenseKey
  label: string
  icon: string
  color: string
  // 묘사 아이디어 풀(무작위 제안용)
  verbs: string[]   // 그 감각으로 '하는' 동작·표현 단서
  ideas: string[]   // 묘사 소재·질감 단서
  // 빈도 분석용 감각어 사전(표면형). 길이 내림차순 정렬은 빌드 시 처리.
  words: string[]
}

const SENSES: SenseDef[] = [
  {
    key: 'sight', label: '시각', icon: '👁️', color: 'var(--accent)',
    verbs: ['바라보다', '흘깃 보다', '눈을 가늘게 뜨다', '시선을 떨구다', '눈이 마주치다', '곁눈질하다', '응시하다', '훑어보다'],
    ideas: ['빛과 그림자의 대비', '색의 채도와 명도', '윤곽의 또렷함/흐릿함', '움직임의 속도', '거리감과 원근', '반사와 윤슬', '먼지나 김처럼 떠도는 입자', '표정의 미세한 변화'],
    words: ['보다', '보이다', '바라보다', '쳐다보다', '응시', '시선', '눈빛', '눈길', '바라본다', '빛', '빛나', '반짝', '번쩍', '눈부', '어둡', '캄캄', '어둠', '그림자', '그늘', '흐릿', '뿌옇', '또렷', '선명', '색', '붉', '푸르', '노랗', '하얗', '검', '잿빛', '윤곽', '실루엣', '풍경', '광경', '눈에', '모습', '형체', '깜빡', '아른', '일렁'],
  },
  {
    key: 'sound', label: '청각', icon: '👂', color: 'var(--ok)',
    verbs: ['귀를 기울이다', '엿듣다', '소리치다', '속삭이다', '중얼거리다', '귓전을 때리다', '메아리치다', '울려 퍼지다'],
    ideas: ['소리의 크기(굉음~정적)', '높낮이와 음색', '리듬과 박자', '울림과 잔향', '소리의 방향과 거리', '갑작스러움/지속됨', '여러 소리의 겹침', '의미 없는 소음 vs 말'],
    words: ['소리', '들리', '들린다', '들었', '듣다', '울리', '울려', '메아리', '쿵', '쾅', '탕', '꽝', '딸깍', '삐걱', '바스락', '사각', '졸졸', '솨', '윙', '웅웅', '쟁그랑', '째깍', '뚝', '속삭', '중얼', '소근', '외치', '소리치', '비명', '고함', '함성', '웃음소리', '발소리', '정적', '고요', '적막', '잠잠', '시끄', '소음', '굉음', '귓전', '귓가'],
  },
  {
    key: 'smell', label: '후각', icon: '👃', color: 'var(--warn)',
    verbs: ['냄새를 맡다', '코를 킁킁대다', '향기를 들이마시다', '악취에 코를 막다', '코끝을 스치다', '코를 찌르다'],
    ideas: ['향기/악취의 강약', '익숙함/낯섦', '음식·꽃·흙 같은 출처', '시간과 기억의 환기', '공기에 밴 지속성', '코를 찌르는 자극성', '습기·열기와 섞인 냄새'],
    words: ['냄새', '향기', '향내', '향', '내음', '악취', '비린', '비릿', '쾌쾌', '퀴퀴', '곰팡', '풍기', '풍긴', '코를', '코끝', '코끝을', '킁킁', '들이마', '구수', '고소', '달큰', '달짝', '알싸', '매캐', '눅눅한 냄새', '향긋', '쿰쿰', '내가 났', '냄새가', '냄새를'],
  },
  {
    key: 'taste', label: '미각', icon: '👅', color: '#e07b9a',
    verbs: ['맛보다', '혀끝으로 굴리다', '삼키다', '입에 머금다', '씹다', '핥다', '음미하다'],
    ideas: ['단맛/짠맛/신맛/쓴맛/감칠맛', '온도(뜨거움~차가움)', '식감과 질감', '뒷맛과 여운', '갈증과 침', '익숙한 맛이 부르는 기억', '입안에 번지는 속도'],
    words: ['맛', '맛보', '맛있', '맛없', '달', '달콤', '달큰', '짜', '짭짤', '짭조름', '시', '시큼', '새콤', '쓰', '쓴', '쌉', '쌉싸', '떫', '매', '매콤', '얼얼', '감칠', '혀', '혀끝', '삼키', '삼킨', '씹', '씹었', '맛이', '입안', '입맛', '입에', '먹', '핥', '음미', '뒷맛', '군침', '침이'],
  },
  {
    key: 'touch', label: '촉각', icon: '✋', color: '#7b9ae0',
    verbs: ['만지다', '쓰다듬다', '움켜쥐다', '스치다', '닿다', '부딪치다', '떨다', '소름이 돋다'],
    ideas: ['온도(따뜻함~차가움)', '질감(매끈~까슬)', '압력과 무게', '습기와 끈적임', '통증과 자극', '바람과 공기의 흐름', '근육의 긴장·이완', '피부에 돋는 소름'],
    words: ['만지', '만졌', '쓰다듬', '닿', '닿았', '스치', '스쳤', '움켜', '쥐', '잡', '부딪', '눌', '누르', '따뜻', '따스', '뜨겁', '뜨거', '차갑', '차가', '서늘', '미지근', '시원', '매끈', '미끈', '부드럽', '거칠', '까슬', '까칠', '딱딱', '말랑', '폭신', '축축', '눅눅', '끈적', '젖', '바람', '소름', '떨', '떨렸', '아프', '따끔', '저릿', '간지'],
  },
]

// 빈도 분석용: 표면형 → 감각 역참조. 긴 어휘가 먼저 매칭되도록 길이 내림차순 정렬.
interface WordEntry { word: string; key: SenseKey }
const WORD_ENTRIES: WordEntry[] = (() => {
  const list: WordEntry[] = []
  for (const s of SENSES) for (const w of s.words) list.push({ word: w, key: s.key })
  list.sort((a, b) => b.word.length - a.word.length)
  return list
})()

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const MASTER_RE = new RegExp(WORD_ENTRIES.map((e) => escRe(e.word)).join('|'), 'g')
// 표면형 → 감각(최초 등록 우선)
const WORD_KEY: Record<string, SenseKey> = (() => {
  const m: Record<string, SenseKey> = {}
  for (const e of WORD_ENTRIES) if (!m[e.word]) m[e.word] = e.key
  return m
})()

// ── HTML escape (bodyHtml 안전 생성) ───────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 빈도 분석 ───────────────────────────────────────────────
interface SenseStat { key: SenseKey; count: number }
interface Analysis {
  byKey: Record<SenseKey, number>
  total: number
  totalChars: number
  present: SenseKey[]   // 한 번이라도 등장
  missing: SenseKey[]   // 전혀 등장하지 않음
  sample: Record<SenseKey, string[]> // 실제로 잡힌 표면형 예시(중복 제거)
  stats: SenseStat[]    // 빈도순
}

function analyze(text: string): Analysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const byKey: Record<SenseKey, number> = { sight: 0, sound: 0, smell: 0, taste: 0, touch: 0 }
  const sample: Record<SenseKey, string[]> = { sight: [], sound: [], smell: [], taste: [], touch: [] }
  const seen: Record<SenseKey, Set<string>> = { sight: new Set(), sound: new Set(), smell: new Set(), taste: new Set(), touch: new Set() }

  MASTER_RE.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = MASTER_RE.exec(text)) !== null) {
    if (guard++ > 200000) break
    const w = m[0]
    const key = WORD_KEY[w]
    if (key) {
      byKey[key] += 1
      if (!seen[key].has(w) && sample[key].length < 6) { seen[key].add(w); sample[key].push(w) }
    }
    if (m.index === MASTER_RE.lastIndex) MASTER_RE.lastIndex++
  }

  const totalChars = (text.replace(/\s/g, '').match(/[\s\S]/g) || []).length
  const total = (Object.values(byKey) as number[]).reduce((a, b) => a + b, 0)
  const present = SENSES.map((s) => s.key).filter((k) => byKey[k] > 0)
  const missing = SENSES.map((s) => s.key).filter((k) => byKey[k] === 0)
  const stats: SenseStat[] = SENSES.map((s) => ({ key: s.key, count: byKey[s.key] })).sort((a, b) => b.count - a.count)
  return { byKey, total, totalChars, present, missing, sample, stats }
}

const SENSE_BY_KEY: Record<SenseKey, SenseDef> = (() => {
  const m = {} as Record<SenseKey, SenseDef>
  for (const s of SENSES) m[s.key] = s
  return m
})()

// 풀에서 n개 무작위 추출(중복 없이)
function sampleN<T>(arr: T[], n: number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, Math.min(n, a.length))
}

// ── 체크 상태 영속 ───────────────────────────────────────────────
const LS_KEY = 'sry:tool:sensory-checklist'
type CheckState = Record<SenseKey, boolean>
const emptyChecks = (): CheckState => ({ sight: false, sound: false, smell: false, taste: false, touch: false })

function loadChecks(): CheckState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<CheckState>
      return { ...emptyChecks(), ...p }
    }
  } catch { /* noop */ }
  return emptyChecks()
}

const SAMPLE = '문을 열자 차가운 바람이 뺨을 스쳤다. 멀리서 종소리가 울려 퍼졌고, 젖은 흙냄새가 코끝을 찔렀다. 가로등 불빛 아래로 눈송이가 흩날렸다. 나는 떨리는 손으로 따뜻한 컵을 움켜쥐었다.'

export default function SensoryChecklist({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [tab, setTab] = useState<'check' | 'analyze'>('check')
  const [checks, setChecks] = useState<CheckState>(loadChecks)
  // 감각별 무작위 아이디어(동사 2개 + 소재 2개)
  const [ideas, setIdeas] = useState<Record<SenseKey, { verbs: string[]; ideas: string[] }>>(() => {
    const o = {} as Record<SenseKey, { verbs: string[]; ideas: string[] }>
    for (const s of SENSES) o[s.key] = { verbs: sampleN(s.verbs, 2), ideas: sampleN(s.ideas, 3) }
    return o
  })
  const [text, setText] = useState<string>(() => {
    const t = payload?.text
    return typeof t === 'string' ? t : ''
  })
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const linkTimer = useRef<number | null>(null)

  // payload 로 본문이 들어오면 분석 탭으로
  useEffect(() => {
    if (typeof payload?.text === 'string' && payload.text.trim()) setTab('analyze')
  }, [payload])

  // 체크 상태 영속
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(checks)) } catch { /* 용량 초과 무시 */ }
  }, [checks])

  // 언마운트 시 안내 타이머 정리
  useEffect(() => () => { if (linkTimer.current != null) window.clearTimeout(linkTimer.current) }, [])

  const analysis = useMemo(() => {
    try { return analyze(text) } catch { return null }
  }, [text])

  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current != null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => { setLinkMsg(null); linkTimer.current = null }, 1800)
  }

  const toggle = (key: SenseKey) => setChecks((c) => ({ ...c, [key]: !c[key] }))
  const regenIdea = (key: SenseKey) => {
    const s = SENSE_BY_KEY[key]
    setIdeas((o) => ({ ...o, [key]: { verbs: sampleN(s.verbs, 2), ideas: sampleN(s.ideas, 3) } }))
  }
  const regenAll = () => {
    const o = {} as Record<SenseKey, { verbs: string[]; ideas: string[] }>
    for (const s of SENSES) o[s.key] = { verbs: sampleN(s.verbs, 2), ideas: sampleN(s.ideas, 3) }
    setIdeas(o)
  }
  const resetChecks = () => setChecks(emptyChecks())

  // 분석 결과를 체크리스트에 반영(감각어가 잡힌 감각은 체크)
  const applyAnalysisToChecks = () => {
    if (!analysis) return
    setChecks(() => {
      const c = emptyChecks()
      for (const k of analysis.present) c[k] = true
      return c
    })
    setTab('check')
    flashLink('분석 결과를 체크에 반영했습니다')
  }

  const checkedCount = SENSES.filter((s) => checks[s.key]).length

  // 점검·아이디어를 텍스트로 (스니펫/복사용)
  const buildChecklistText = () => {
    const lines: string[] = []
    lines.push('[오감 점검 체크리스트]')
    lines.push(`사용 감각 ${checkedCount}/5`)
    lines.push('')
    for (const s of SENSES) {
      const on = checks[s.key] ? '☑' : '☐'
      lines.push(`${on} ${s.icon} ${s.label}`)
      const id = ideas[s.key]
      lines.push(`   · 동작: ${id.verbs.join(', ')}`)
      lines.push(`   · 묘사 소재: ${id.ideas.join(', ')}`)
    }
    return lines.join('\n')
  }

  // 분석 결과를 텍스트로 (스니펫/복사용)
  const buildAnalysisText = (a: Analysis) => {
    const lines: string[] = []
    lines.push('[오감 빈도 간이 분석]')
    lines.push(`감각어 총 ${a.total}회 · 글자(공백제외) ${a.totalChars}`)
    lines.push('')
    for (const st of a.stats) {
      const s = SENSE_BY_KEY[st.key]
      const ex = a.sample[st.key]
      lines.push(`${s.icon} ${s.label}: ${st.count}회${ex.length ? ` (예: ${ex.join(', ')})` : ''}`)
    }
    if (a.missing.length) {
      lines.push('')
      lines.push('비어 있는 감각: ' + a.missing.map((k) => SENSE_BY_KEY[k].label).join(', '))
    }
    return lines.join('\n')
  }

  const safeCopy = (textToCopy: string, onDone: () => void) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(textToCopy).then(onDone).catch(() => { /* 권한 거부 graceful */ })
      } else {
        const ta = document.createElement('textarea')
        ta.value = textToCopy
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        try { document.execCommand('copy') } catch { /* noop */ }
        document.body.removeChild(ta)
        onDone()
      }
    } catch { /* 클립보드 미지원 무시 */ }
  }

  const copyChecklist = () => safeCopy(buildChecklistText(), () => flashLink('체크리스트를 복사했습니다'))
  const copyAnalysis = () => { if (analysis) safeCopy(buildAnalysisText(analysis), () => flashLink('분석 결과를 복사했습니다')) }

  // 스니펫 저장
  const saveChecklistSnippet = () => {
    addToLibrary('snippets', { text: buildChecklistText(), source: '오감 점검 체크리스트', tags: ['오감점검', `${checkedCount}_5`] })
    flashLink('점검 결과를 스니펫으로 저장했습니다')
  }
  const saveAnalysisSnippet = () => {
    if (!analysis) return
    addToLibrary('snippets', { text: buildAnalysisText(analysis), source: '오감 점검 체크리스트', tags: ['오감분석'] })
    flashLink('분석 결과를 스니펫으로 저장했습니다')
  }

  // 프로젝트 자료에 메모 추가
  const addChecklistToProject = () => {
    const rows = SENSES.map((s) => {
      const on = checks[s.key]
      const id = ideas[s.key]
      return `<p><b>${on ? '☑' : '☐'} ${esc(s.icon)} ${esc(s.label)}</b><br/>`
        + `<span>· 동작: ${esc(id.verbs.join(', '))}</span><br/>`
        + `<span>· 묘사 소재: ${esc(id.ideas.join(', '))}</span></p>`
    }).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '오감 점검',
      title: `오감 점검 (${checkedCount}/5)`,
      bodyHtml: `<p>한 장면에 쓰인 감각: <b>${checkedCount}/5</b></p>${rows}`,
      meta: { 사용감각: `${checkedCount}/5`, 출처: '오감 점검 체크리스트' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }
  const addAnalysisToProject = () => {
    if (!analysis) return
    const a = analysis
    const rows = a.stats.map((st) => {
      const s = SENSE_BY_KEY[st.key]
      const ex = a.sample[st.key]
      return `<li><b>${esc(s.icon)} ${esc(s.label)}</b>: ${st.count}회${ex.length ? ` <span>(예: ${esc(ex.join(', '))})</span>` : ''}</li>`
    }).join('')
    const miss = a.missing.length ? `<p>비어 있는 감각: <b>${esc(a.missing.map((k) => SENSE_BY_KEY[k].label).join(', '))}</b></p>` : '<p>다섯 감각이 모두 쓰였습니다.</p>'
    const id = addToProject({
      kind: 'text', root: 'research', folder: '오감 점검',
      title: `오감 빈도 분석 (감각어 ${a.total}회)`,
      bodyHtml: `<p>감각어 총 <b>${a.total}</b>회 · 글자(공백제외) ${a.totalChars}</p><ul>${rows}</ul>${miss}`,
      meta: { 감각어총횟수: String(a.total), 출처: '오감 점검 체크리스트' },
    })
    flashLink(id ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }
  const tabBar: React.CSSProperties = { display: 'flex', gap: 6, flexShrink: 0 }
  const tabBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, fontSize: 13, fontWeight: on ? 700 : 500, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    background: on ? 'var(--accent)' : 'var(--chrome-2)', color: on ? 'var(--paper)' : 'var(--text)',
  })
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 12px' }
  const taStyle: React.CSSProperties = {
    minHeight: 110, maxHeight: 200, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' })
  const linkbar: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }

  // 진행 막대(체크 0~5)
  const progressPct = (checkedCount / 5) * 100
  const progressColor = checkedCount <= 2 ? 'var(--warn)' : checkedCount < 5 ? 'var(--accent)' : 'var(--ok)'

  return (
    <div style={wrap}>
      <div style={hint}>
        한 장면에 <b>오감(시각·청각·후각·미각·촉각)</b>이 고루 쓰였는지 점검하세요. 빈 감각을 채우면 장면이 입체적으로 살아납니다.
      </div>

      <div style={tabBar}>
        <div style={tabBtn(tab === 'check')} role="button" tabIndex={0} onClick={() => setTab('check')}><Emoji e="🖐️" /> 점검 · 아이디어</div>
        <div style={tabBtn(tab === 'analyze')} role="button" tabIndex={0} onClick={() => setTab('analyze')}><Emoji e="📊" /> 본문 감각어 분석</div>
      </div>

      {tab === 'check' ? (
        <>
          {/* 진행 요약 */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: progressColor, lineHeight: 1, minWidth: 56, textAlign: 'center', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>
              {checkedCount}<span style={{ fontSize: 14, color: 'var(--muted)' }}>/5</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: progressColor }}>
                {checkedCount === 5 ? <>오감이 모두 쓰였습니다 <Emoji e="✨" /></> : checkedCount <= 2 ? '감각이 부족합니다 — 빈 감각을 채워보세요' : '조금 더 다채롭게 — 빠진 감각을 더해보세요'}
              </div>
              <div style={{ height: 7, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 7, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: progressColor, transition: 'width .3s' }} />
              </div>
            </div>
          </div>

          <div style={scroll}>
            {SENSES.map((s) => {
              const on = checks[s.key]
              const id = ideas[s.key]
              return (
                <div key={s.key} style={{ ...card, borderLeft: `3px solid ${s.color}`, opacity: on ? 1 : 0.96 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                      <input type="checkbox" checked={on} onChange={() => toggle(s.key)} style={{ width: 17, height: 17, accentColor: s.color, cursor: 'pointer', flexShrink: 0 }} />
                      <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: on ? 'var(--text)' : 'var(--muted)', textDecoration: on ? 'none' : 'none' }}>{s.label}</span>
                      <span style={tag(s.color)}>{on ? '사용함' : '미사용'}</span>
                    </label>
                    <button className="minibtn" onClick={() => regenIdea(s.key)} title={`${s.label} 묘사 아이디어 새로고침`} style={{ fontSize: 11, padding: '3px 8px' }}><Emoji e="🎲" /></button>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56 }}>동작 단서</span>
                      {id.verbs.map((v, i) => (
                        <span key={i} style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '2px 8px' }}>{v}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56 }}>묘사 소재</span>
                      {id.ideas.map((v, i) => (
                        <span key={i} style={{ fontSize: 12.5, color: 'var(--text)', background: 'var(--paper)', border: `1px dashed ${s.color}`, borderRadius: 7, padding: '2px 8px' }}>{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={regenAll}><Emoji e="🎲" /> 아이디어 전체 새로고침</button>
            <button className="minibtn" onClick={copyChecklist}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={resetChecks} disabled={checkedCount === 0}>체크 초기화</button>
          </div>

          <div className="linkbar" style={linkbar}>
            <button className="linkbtn" onClick={addChecklistToProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '오감 점검 결과를 프로젝트 자료에 메모로 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={saveChecklistSnippet} title="점검 결과·아이디어를 스니펫 라이브러리에 저장합니다"><Emoji e="✂️" /> 스니펫 저장</button>
            {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
          </div>
        </>
      ) : (
        <>
          <textarea
            style={taStyle}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="장면 본문을 붙여넣으세요. 감각어(보다·소리·냄새·맛·차갑다…)의 빈도를 감각별로 간이 집계해 어느 감각이 비었는지 짚어드립니다."
            spellCheck={false}
            aria-label="감각어 분석 텍스트 입력"
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <button className="minibtn" onClick={() => setText(SAMPLE)} type="button">예시</button>
            <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={copyAnalysis} disabled={!analysis || analysis.total === 0} type="button"><Emoji e="📋" /> 결과 복사</button>
          </div>

          {!analysis ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6, padding: 16 }}>
              <div style={{ fontSize: 30 }}><Emoji e="🖐️" /></div>
              <div>장면 본문을 붙여넣으면<br />시각·청각·후각·미각·촉각 감각어 빈도를 집계합니다.</div>
              <div style={hint}>표면형을 정규식으로 잡는 근사값이라, 비어 있는 감각을 채우는 출발점으로 보세요.</div>
            </div>
          ) : (
            <div style={scroll}>
              {/* 감각별 빈도 막대 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}><Emoji e="📊" /> 감각별 빈도 (총 {analysis.total}회)</div>
                {analysis.stats.map((st) => {
                  const s = SENSE_BY_KEY[st.key]
                  const maxC = Math.max(1, ...analysis.stats.map((x) => x.count))
                  const ex = analysis.sample[st.key]
                  return (
                    <div key={st.key} style={{ ...card, padding: '8px 11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}><Emoji e={s.icon} /></span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: st.count === 0 ? 'var(--warn)' : 'var(--text)' }}>{s.label}</span>
                        {st.count === 0 && <span style={tag('var(--warn)')}>비어 있음</span>}
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{st.count}회</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((st.count / maxC) * 100)}%`, height: '100%', background: s.color, transition: 'width .3s' }} />
                      </div>
                      {ex.length > 0 && (
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>예: {ex.join(', ')}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 비어 있는 감각 안내 + 채울 아이디어 */}
              {analysis.missing.length > 0 ? (
                <div style={{ ...card, borderLeft: '3px solid var(--warn)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--warn)' }}>
                    <Emoji e="⚠️" /> 비어 있는 감각 {analysis.missing.length}개 — 이 감각을 더하면 장면이 살아납니다
                  </div>
                  <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {analysis.missing.map((k) => {
                      const s = SENSE_BY_KEY[k]
                      return (
                        <div key={k} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                          <b><Emoji e={s.icon} /> {s.label}</b>
                          <span style={{ color: 'var(--muted)' }}> — {s.ideas.slice(0, 3).join(' · ')}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ ...card, borderLeft: '3px solid var(--ok)', fontSize: 13, color: 'var(--ok)', fontWeight: 700 }}>
                  <Emoji e="✨" /> 다섯 감각이 모두 본문에 쓰였습니다. 균형 잡힌 장면입니다.
                </div>
              )}

              <button className="minibtn" onClick={applyAnalysisToChecks} disabled={analysis.total === 0} style={{ alignSelf: 'flex-start' }}>↩ 분석 결과를 점검 체크에 반영</button>
            </div>
          )}

          <div className="linkbar" style={linkbar}>
            <button className="linkbtn" onClick={addAnalysisToProject} disabled={!hasProjectBridge() || !analysis || analysis.total === 0} title={hasProjectBridge() ? '감각 빈도 분석을 프로젝트 자료에 메모로 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
            <button className="linkbtn" onClick={saveAnalysisSnippet} disabled={!analysis || analysis.total === 0} title="분석 결과를 스니펫 라이브러리에 저장합니다"><Emoji e="✂️" /> 스니펫 저장</button>
            {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {linkMsg}</span>}
          </div>
        </>
      )}

      <div className="license-note" style={{ ...hint, fontSize: 11, flexShrink: 0 }}>
        형태소 분석 없이 표면형을 집계한 근사값입니다. 외부 API·이미지·폰트를 쓰지 않으며, 모든 어휘는 직접 작성한 데이터입니다.
      </div>
    </div>
  )
}
