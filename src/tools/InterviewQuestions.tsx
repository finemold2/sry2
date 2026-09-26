// 취재 질문 생성기 — 논픽션/기사/인터뷰용. 주제와 인물 유형을 입력하면
//  배경·사실확인·감정·견해·전망 5개 범주별 인터뷰 질문 세트를 로컬 템플릿+조합으로 생성한다.
//  각 범주는 잠금(🔒)/재생성 가능하며, 잠긴 범주는 유지한 채 나머지만 다시 굴린다.
//  가능한 조합 수(수만+)를 표시한다. 전부 로컬(외부 API 불필요).
//  localStorage 'sry:tool:interview-questions' 에 입력·생성 결과를 자동 저장/복원.
//  연계(linkbus): 생성한 질문지를 실제 프로젝트 자료('research')의 '취재' 폴더에 문서로 추가한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'interview-questions', name: '취재 질문 생성기', icon: '🎤', group: '리서치·자료', intro: '주제·인물 유형으로 배경·사실확인·감정·견해·전망 인터뷰 질문 세트를 만드세요', w: 580, h: 660 }

// {topic} = 주제(취재 대상/사건/현상), {who} = 인터뷰이 호칭(인물 유형)
// 조사 표기: {topic|을}, {who|이} 처럼 슬롯 뒤에 |조사 를 붙이면 앞 글자 받침을 보고
//  실제 조사(을/를·이/가·은/는·와/과·으로/로)를 골라 출력한다. 괄호 이중표기 없음.

// 마지막 글자의 받침 유무·종류로 알맞은 조사를 고른다(완전 로컬·결정론적).
function pickJosa(word: string, kind: string): string {
  const w = (word || '').trim()
  const last = w.charCodeAt(w.length - 1)
  // 한글 음절이 아니면(영문/숫자/공백 등) 일반적으로 받침 있는 형태를 기본으로.
  let jong = -1 // -1: 한글 아님, 0: 받침 없음, 1~27: 받침 있음
  if (last >= 0xac00 && last <= 0xd7a3) jong = (last - 0xac00) % 28
  switch (kind) {
    case '을': return jong === 0 ? '를' : '을'
    case '이': return jong === 0 ? '가' : '이'
    case '은': return jong === 0 ? '는' : '은'
    case '와': return jong === 0 ? '와' : '과'
    // 으로/로: 받침 없음 또는 ㄹ받침(jong===8)이면 '로', 그 외 받침은 '으로'
    case '으로': return (jong === 0 || jong === 8) ? '로' : '으로'
    default: return kind
  }
}

interface CatDef {
  key: string
  label: string
  icon: string
  desc: string
  templates: string[]
}

// 범주별 질문 템플릿. {topic}/{who} 치환, |조사 로 받침 맞춤. 한 범주당 14개 → 조합 폭발.
const CATS: CatDef[] = [
  {
    key: 'background', label: '배경', icon: '🧭',
    desc: '인물·맥락·경위를 풀어내는 도입 질문',
    templates: [
      '{who}께서 {topic|와} 처음 인연을 맺게 된 계기는 무엇이었나요?',
      '{topic|을} 한 번도 모르는 독자에게 소개한다면, 어떻게 설명하시겠어요?',
      '{who}의 하루 일과 속에서 {topic|은} 어떤 자리를 차지하나요?',
      '{topic}에 발을 들이기 전과 후, {who}의 삶에서 가장 크게 달라진 점은요?',
      '{topic|와} 관련해 {who}께서 거쳐 온 길을 시간 순서로 짚어주실 수 있을까요?',
      '{who}께서 {topic|을} 처음 접했을 때의 상황을 구체적으로 떠올려 주시겠어요?',
      '주변 사람들은 {who}와 {topic}의 관계를 어떻게 보고 있나요?',
      '{topic|을} 둘러싼 환경(지역·시대·업계)을 모르는 사람을 위해 배경을 설명해 주신다면?',
      '{who}의 가족이나 동료들은 {topic}에 대해 어떤 영향을 주고받았나요?',
      '{topic}에 몸담기까지, 포기하거나 돌아간 다른 선택지가 있었나요?',
      '{who}께 {topic|이} 단순한 일을 넘어선 의미가 있다면 무엇인가요?',
      '처음 {topic|을} 시작하던 무렵의 {who}는 지금과 어떻게 달랐나요?',
      '{topic|을} 한마디로 정의한다면 {who}께서는 어떤 표현을 고르시겠어요?',
      '{who}께서 {topic|으로} 향하게 된 결정적인 전환점은 언제였나요?',
    ],
  },
  {
    key: 'facts', label: '사실확인', icon: '🔍',
    desc: '수치·시점·근거를 확인하는 검증 질문',
    templates: [
      '{topic|이} 정확히 언제, 어디서 일어난 일인지 다시 한번 확인해 주시겠어요?',
      '{topic}에 관여한 사람(또는 기관)은 정확히 누구누구인가요?',
      '방금 말씀하신 수치(또는 사실)는 어떤 자료·기록에 근거한 것인가요?',
      '{topic|와} 관련해 공개된 기록이나 문서로 확인할 수 있는 부분은 어디까지인가요?',
      '{topic}에 대해 세간에 잘못 알려진 사실이 있다면 무엇이고, 진실은 무엇인가요?',
      '그 시점에 {who}는 정확히 어떤 위치(역할)에 있었나요?',
      '{topic}의 규모(인원·금액·기간 등)를 구체적인 숫자로 말씀해 주실 수 있나요?',
      '이 내용을 뒷받침할 다른 증언자나 기록을 추천해 주실 수 있을까요?',
      '{topic}에 관한 보도나 소문 중, 사실과 다른 부분을 바로잡아 주신다면?',
      '말씀하신 사건의 전후 순서를 정확히 확인하고 싶은데, 무엇이 먼저였나요?',
      '{who}께서 직접 목격하신 부분과 전해 들으신 부분을 구분해 주실 수 있나요?',
      '{topic|와} 관련해 제가 인용해도 되는 공식 입장이나 자료가 있을까요?',
      '{topic|을} 검증하려면 어떤 기관이나 전문가에게 더 물어봐야 할까요?',
      '{topic|이} 처음 외부에 알려진 시점과 경위를 정확히 말씀해 주실 수 있나요?',
    ],
  },
  {
    key: 'emotion', label: '감정', icon: '💗',
    desc: '내면·심경·체험을 끌어내는 질문',
    templates: [
      '{topic|을} 겪던 그 순간, {who}의 마음속에서는 어떤 감정이 오갔나요?',
      '{topic} 때문에 가장 힘들었던 순간을 한 장면으로 떠올린다면 언제인가요?',
      '돌이켜 볼 때 {topic}에서 가장 후회되는 일, 또는 가장 뿌듯한 일은요?',
      '{topic|이} {who}에게 남긴 상처나 두려움이 있다면 어떤 것인가요?',
      '{topic|을} 견디게 해 준 사람이나 순간이 있었다면 이야기해 주시겠어요?',
      '아무에게도 말하지 못했던 {topic}에 대한 솔직한 심정이 있다면요?',
      '{topic|을} 다시 마주한다면, 그때의 {who}에게 어떤 말을 건네고 싶나요?',
      '{topic} 속에서 {who}가 가장 외롭다고 느낀 때는 언제였나요?',
      '{topic|을} 떠올릴 때 지금도 가슴이 먼저 반응하는 장면이 있나요?',
      '그 일을 겪으며 {who}는 스스로에 대해 무엇을 새로 알게 되었나요?',
      '{topic|이} {who}를 잠 못 이루게 한 밤이 있었다면, 무엇 때문이었나요?',
      '{topic|을} 두고 가장 크게 흔들렸던 믿음이나 가치가 있었나요?',
      '{topic|이} 끝난 뒤 {who}께 가장 먼저 찾아온 감정은 무엇이었나요?',
      '{topic|을} 누군가에게 처음 털어놓던 날의 기분을 기억하시나요?',
    ],
  },
  {
    key: 'opinion', label: '견해', icon: '💭',
    desc: '판단·입장·평가를 묻는 질문',
    templates: [
      '{topic}에 대한 {who}의 솔직한 평가를 한 문장으로 말씀하신다면요?',
      '{topic|을} 둘러싼 논쟁에서 {who}는 어느 쪽에 서 있나요, 그 이유는요?',
      '{topic}에 대해 사람들이 꼭 알아야 한다고 생각하는 한 가지는 무엇인가요?',
      '만약 {topic|을} 다시 설계할 수 있다면, {who}는 무엇을 바꾸겠어요?',
      '{topic}에 대한 일반적인 통념 중, {who}가 동의하지 않는 부분은요?',
      '{topic}의 책임은 누구(또는 무엇)에게 있다고 보시나요?',
      '{topic|이} 우리 사회(또는 업계)에 던지는 가장 큰 질문은 무엇일까요?',
      '비슷한 처지의 사람에게 {topic}에 관해 조언한다면, 어떤 말을 해주시겠어요?',
      '{topic|을} 비판하는 목소리에 대해 {who}는 어떻게 답하시겠어요?',
      '{topic}에서 가장 과대평가된 것과 과소평가된 것을 각각 꼽는다면요?',
      '{who}께서 보시기에 {topic}의 본질은 결국 무엇이라고 생각하세요?',
      '{topic}에 대해 다들 말하지만 정작 아무도 묻지 않는 질문이 있다면요?',
      '{topic|이} 10년 뒤에도 지금처럼 평가받을 거라고 보시나요?',
      '{topic|을} 두고 {who}께서 절대 양보할 수 없는 원칙이 있다면 무엇인가요?',
    ],
  },
  {
    key: 'future', label: '전망', icon: '🔭',
    desc: '앞으로의 계획·예측·바람을 묻는 마무리 질문',
    templates: [
      '{topic|은} 앞으로 어떻게 흘러갈 거라고 예상하시나요?',
      '{who}께서 {topic|와} 관련해 다음으로 도전하고 싶은 일은 무엇인가요?',
      '5년 뒤, {topic|이} 어떤 모습이길 바라시나요?',
      '{topic|을} 위해 지금 가장 필요한 변화나 도움은 무엇일까요?',
      '{who}는 {topic|을} 어떤 모습으로 이어가고 싶으신가요?',
      '{topic}에 관해 다음 세대에게 꼭 남기고 싶은 한마디가 있다면요?',
      '{topic|이} 최악으로 흐른다면, 그리고 최선으로 흐른다면 어떤 그림인가요?',
      '{topic}에 대해 {who}가 아직 이루지 못한 꿈이나 약속이 있나요?',
      '독자(또는 시청자)가 {topic|을} 위해 당장 할 수 있는 일이 있다면 무엇일까요?',
      '오늘 이 인터뷰가 {topic}에 작은 변화라도 만든다면, 무엇이길 바라시나요?',
      '{topic|을} 둘러싼 환경이 바뀐다면, {who}의 계획은 어떻게 달라질까요?',
      '마지막으로, {topic}에 대해 꼭 덧붙이고 싶은 말씀이 있으신가요?',
      '{topic|이} 한 단계 더 나아가려면 가장 먼저 풀어야 할 과제는 무엇일까요?',
      '{who}께서 {topic|으로} 끝내 이루고 싶은 단 하나의 목표가 있다면요?',
    ],
  },
]

// 인물 유형 프리셋 — 호칭({who})으로 쓰인다. 직접 입력도 가능.
const WHO_PRESETS = ['당사자', '전문가', '목격자', '관계자', '피해자', '책임자', '내부자', '창작자', '활동가', '연구자']

const LS_KEY = 'sry:tool:interview-questions'
const QPER = 3 // 범주당 출력 질문 수

function pickN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice()
  const pool = arr.slice()
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    const j = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(j, 1)[0])
  }
  return out
}

// nCr — 조합 수 계산(범주별 C(템플릿수, QPER) 의 곱).
function comb(n: number, r: number): number {
  if (r < 0 || r > n) return 0
  r = Math.min(r, n - r)
  let num = 1
  for (let i = 0; i < r; i++) num = (num * (n - i)) / (i + 1)
  return Math.round(num)
}
const TOTAL_COMBOS = CATS.reduce((acc, c) => acc * comb(c.templates.length, QPER), 1)

function fmtNum(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return Math.floor(n / 1e4).toLocaleString('ko-KR') + '만+'
  return n.toLocaleString('ko-KR')
}

function fill(tpl: string, topic: string, who: string): string {
  const t = topic.trim() || '이 주제'
  const w = who.trim() || '인터뷰이'
  // {topic|을} / {who|이} 처럼 조사 지정이 있으면 받침에 맞춰 조사를 붙인다.
  // {topic} / {who} (조사 없음)도 그대로 지원.
  return tpl.replace(/\{(topic|who)(?:\|([^}]+))?\}/g, (_m, slot: string, kind?: string) => {
    const word = slot === 'topic' ? t : w
    return kind ? word + pickJosa(word, kind) : word
  })
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 범주별 선택된 템플릿 인덱스 집합
type Sel = Record<string, number[]>

function rollCat(c: CatDef): number[] {
  const idx = c.templates.map((_, i) => i)
  return pickN(idx, QPER).sort((a, b) => a - b)
}
function rollAll(): Sel {
  const s: Sel = {}
  CATS.forEach((c) => { s[c.key] = rollCat(c) })
  return s
}

interface Persisted { topic: string; who: string; sel: Sel; locked: Record<string, boolean> }

function loadState(): Persisted {
  const fallback: Persisted = { topic: '', who: '', sel: {}, locked: {} }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const sel: Sel = {}
    CATS.forEach((c) => {
      const arr = Array.isArray(p?.sel?.[c.key]) ? p.sel[c.key] : []
      const valid = arr.filter((i: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < c.templates.length)
      if (valid.length) sel[c.key] = valid.slice(0, QPER)
    })
    const locked: Record<string, boolean> = {}
    CATS.forEach((c) => { if (p?.locked?.[c.key]) locked[c.key] = true })
    return {
      topic: typeof p?.topic === 'string' ? p.topic : '',
      who: typeof p?.who === 'string' ? p.who : '',
      sel, locked,
    }
  } catch { return fallback }
}

export default function InterviewQuestions({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [topic, setTopic] = useState<string>(() => {
    const p = payload && (payload.topic || payload.query || payload.title)
    return typeof p === 'string' && p.trim() ? p.trim() : init.current.topic
  })
  const [who, setWho] = useState<string>(init.current.who)
  const [sel, setSel] = useState<Sel>(init.current.sel)
  const [locked, setLocked] = useState<Record<string, boolean>>(init.current.locked)
  const [toast, setToast] = useState('')
  const [note, setNote] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const hasResults = CATS.some((c) => (sel[c.key]?.length || 0) > 0)

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ topic, who, sel, locked } as Persisted)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [topic, who, sel, locked])

  // 토스트 자동 소거(언마운트 정리)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  // 전체 생성 — 잠긴 범주는 유지, 나머지만 새로 굴린다.
  const generate = useCallback(() => {
    setSel((prev) => {
      const next: Sel = {}
      CATS.forEach((c) => {
        next[c.key] = (locked[c.key] && prev[c.key]?.length) ? prev[c.key] : rollCat(c)
      })
      return next
    })
  }, [locked])

  // 한 범주만 재생성
  const regenOne = (key: string) => {
    const c = CATS.find((x) => x.key === key)
    if (!c) return
    setSel((prev) => ({ ...prev, [key]: rollCat(c) }))
  }

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const clearAll = () => { setSel({}); setLocked({}) }

  // 출력 텍스트(복사/내보내기 공용)
  const buildLines = (): string[] => {
    const lines: string[] = []
    const head = `취재 질문지${topic.trim() ? ` — ${topic.trim()}` : ''}${who.trim() ? ` (${who.trim()})` : ''}`
    lines.push(head)
    let n = 1
    CATS.forEach((c) => {
      const idxs = sel[c.key]
      if (!idxs?.length) return
      lines.push('')
      lines.push(`[${c.icon} ${c.label}] ${c.desc}`)
      idxs.forEach((i) => { lines.push(`  ${n++}. ${fill(c.templates[i], topic, who)}`) })
    })
    return lines
  }

  const copyAll = () => {
    if (!hasResults) return
    const text = buildLines().join('\n')
    const done = () => { if (mounted.current) setToast('질문지를 복사했습니다.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했어요.') }
  }

  // 프로젝트 자료('research')/'취재' 폴더에 질문지 문서 추가
  const toProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const parts: string[] = []
    let n = 1
    CATS.forEach((c) => {
      const idxs = sel[c.key]
      if (!idxs?.length) return
      parts.push(`<p><b>${escHtml(c.icon)} ${escHtml(c.label)}</b> <span style="color:#888;font-size:12px">— ${escHtml(c.desc)}</span></p>`)
      parts.push('<ol>' + idxs.map((i) => `<li>${escHtml(fill(c.templates[i], topic, who))}</li>`).join('') + `</ol>`)
      n += idxs.length
    })
    const total = n - 1
    const title = `취재 질문지 — ${topic.trim() || '주제 미정'}${who.trim() ? ` (${who.trim()})` : ''}`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '취재',
      title,
      bodyHtml: parts.join(''),
      synopsis: `${topic.trim() || '주제 미정'} 인터뷰 질문 ${total}개`,
      meta: { 주제: topic.trim() || '—', 인물유형: who.trim() || '—', 질문수: String(total) },
    })
    setToast(id ? '프로젝트 자료 〈취재〉 폴더에 질문지를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const linked = hasProjectBridge()
  const totalQ = CATS.reduce((acc, c) => acc + (sel[c.key]?.length || 0), 0)

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const controls: React.CSSProperties = { padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 24 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🎤" /></span>
        <strong style={{ fontSize: 15 }}>취재 질문 생성기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }} title="가능한 질문지 조합 수">조합 {fmtNum(TOTAL_COMBOS)}가지</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {/* 입력 */}
      <div style={controls}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 220px', minWidth: 0 }}>
            <div style={label}><Emoji e="📌" /> 주제 (취재 대상·사건·현상)</div>
            <input
              style={input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 동네 책방 운영, 산불 피해 복구, 인디게임 개발"
              maxLength={80}
            />
          </div>
          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div style={label}><Emoji e="👤" /> 인물 유형 (호칭)</div>
            <input
              style={input}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="예: 당사자, 전문가"
              maxLength={40}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {WHO_PRESETS.map((p) => (
            <button
              key={p}
              className="minibtn"
              onClick={() => setWho(p)}
              style={{ padding: '3px 9px', fontSize: 12, borderColor: who.trim() === p ? 'var(--accent)' : 'var(--border)', background: who.trim() === p ? 'var(--chrome-2)' : undefined }}
            >{p}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={generate}><Emoji e="🎲" /> 질문 생성 / 다시 생성</button>
          <button className="minibtn" onClick={copyAll} disabled={!hasResults} title="질문지 전체를 텍스트로 복사"><Emoji e="📋" /> 복사</button>
          <button className="minibtn" onClick={clearAll} disabled={!hasResults} title="생성 결과 비우기">지우기</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
          범주별로 <Emoji e="🔒" />로 잠그면 다시 생성해도 그 범주는 유지됩니다. 범주마다 {QPER}개씩 · 총 {CATS.length}범주.
        </div>
      </div>

      {/* 결과 */}
      <div style={body}>
        {!hasResults ? (
          <div style={empty}>
            주제와 인물 유형을 적고<br /><b><Emoji e="🎲" /> 질문 생성</b>을 누르세요.<br /><br />
            <span style={{ fontSize: 12 }}>
              배경 · 사실확인 · 감정 · 견해 · 전망<br />
              5개 범주의 인터뷰 질문 세트가 만들어집니다.
            </span>
          </div>
        ) : (
          CATS.map((c) => {
            const idxs = sel[c.key]
            if (!idxs?.length) return null
            const isLocked = !!locked[c.key]
            return (
              <div key={c.key} style={{ border: '1px solid ' + (isLocked ? 'var(--accent)' : 'var(--border)'), borderRadius: 10, background: 'var(--panel)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 15 }}><Emoji e={c.icon} /></span>
                  <strong style={{ fontSize: 13 }}>{c.label}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</span>
                  <button
                    className="minibtn"
                    style={{ padding: '2px 7px', fontSize: 12 }}
                    onClick={() => regenOne(c.key)}
                    disabled={isLocked}
                    title={isLocked ? '잠금 해제 후 재생성할 수 있어요' : '이 범주만 다시 생성'}
                  ><Emoji e="🔄" /></button>
                  <button
                    className="minibtn"
                    style={{ padding: '2px 7px', fontSize: 12, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                    onClick={() => toggleLock(c.key)}
                    title={isLocked ? '고정 해제' : '이 범주 고정'}
                  >{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                </div>
                <ol style={{ margin: 0, padding: '10px 12px 12px 30px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {idxs.map((i) => (
                    <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6 }}>{fill(c.templates[i], topic, who)}</li>
                  ))}
                </ol>
              </div>
            )
          })
        )}
      </div>

      {/* 하단: 연계 */}
      {hasResults && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>총 {totalQ}개 질문</span>
          <span style={{ flex: 1 }} />
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!linked}
            title={linked ? '이 질문지를 프로젝트 자료(취재 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
        </div>
      )}
    </div>
  )
}
