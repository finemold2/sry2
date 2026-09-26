// 주제문 빌더 — 소재 + 대립하는 두 가치 + 결말의 깨달음을 입력하면 여러 틀로 한 문장 주제 진술을 자동 생성한다.
// 자급식: react 외 import 없음, 외부 네트워크 없음(전부 로컬). 모든 데이터는 localStorage 에 JSON 으로 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'theme-statement', name: '주제문 빌더', icon: '🧭', group: '구상·정리', intro: '소재·대립 가치·깨달음으로 한 문장 주제 진술을 만드세요', w: 600, h: 540 }

const LS_KEY = 'sry:tool:theme-statement'

interface Draft {
  subject: string   // 소재 (무엇에 관한 이야기인가)
  valueA: string    // 대립 가치 A
  valueB: string    // 대립 가치 B
  insight: string   // 결말의 깨달음
  tone: ToneKey     // 어조
}

interface Saved extends Draft {
  id: string
  title: string     // 작품/메모 제목
  template: number   // 선택했던 틀 인덱스
  statement: string  // 확정 주제문
  createdAt: number
}

type ToneKey = 'plain' | 'literary' | 'warm' | 'sharp'
const TONES: { key: ToneKey; label: string }[] = [
  { key: 'plain', label: '담백' },
  { key: 'literary', label: '문학적' },
  { key: 'warm', label: '따뜻' },
  { key: 'sharp', label: '날카로움' },
]

// 어조별 연결어미/꾸밈 — 같은 골격을 어조에 맞게 변주.
const TONE_WORDS: Record<ToneKey, { ends: string; but: string; reveal: string; truth: string }> = {
  plain: { ends: '이다', but: '하지만', reveal: '결국', truth: '깨닫는다' },
  literary: { ends: '이다', but: '그러나', reveal: '마침내', truth: '비로소 깨닫는다' },
  warm: { ends: '이라는 이야기다', but: '그렇지만', reveal: '끝내', truth: '알게 된다' },
  sharp: { ends: '이다', but: '그러나', reveal: '결국', truth: '대가를 치르고서야 깨닫는다' },
}

interface Tpl {
  name: string
  hint: string
  build: (d: Draft) => string
}

// 빈 값은 자리표시자로 대체해 항상 읽히는 문장을 생성.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}

const TEMPLATES: Tpl[] = [
  {
    name: '대립형',
    hint: 'A와 B의 충돌을 정면에 세운다',
    build: (d) => {
      const w = TONE_WORDS[d.tone]
      return `《${f(d.subject, '소재')}》는 ${f(d.valueA, '가치 A')}와(과) ${f(d.valueB, '가치 B')}이(가) 부딪히는 이야기${w.ends}. 인물은 ${w.reveal} ${f(d.insight, '깨달음')}는(은) 것을 ${w.truth}.`
    },
  },
  {
    name: '대가형',
    hint: '한쪽을 택하면 다른쪽을 잃는다',
    build: (d) => {
      const w = TONE_WORDS[d.tone]
      return `${f(d.valueA, '가치 A')}을(를) 얻으려면 ${f(d.valueB, '가치 B')}을(를) 내주어야 한다. ${f(d.subject, '소재')}를 통해 인물은 ${f(d.insight, '깨달음')}는(은) 진실과 마주한다${w.ends.startsWith('이') ? '' : ''}.`
    },
  },
  {
    name: '질문형',
    hint: '독자에게 던지는 물음으로 연다',
    build: (d) => {
      return `${f(d.valueA, '가치 A')}와(과) ${f(d.valueB, '가치 B')} 사이에서, 우리는 무엇을 택해야 하는가? 《${f(d.subject, '소재')}》는 ${f(d.insight, '깨달음')}는(은) 답을 향해 나아간다.`
    },
  },
  {
    name: '깨달음형',
    hint: '결말의 변화·교훈을 앞세운다',
    build: (d) => {
      const w = TONE_WORDS[d.tone]
      return `${f(d.subject, '소재')}을(를) 겪은 인물은 ${f(d.valueA, '가치 A')}만으로는 부족하며 ${f(d.valueB, '가치 B')}이(가) 함께해야 함을, 즉 ${f(d.insight, '깨달음')}는(은) 것을 ${w.truth}.`
    },
  },
  {
    name: '역설형',
    hint: '뒤집힌 진실을 드러낸다',
    build: (d) => {
      const w = TONE_WORDS[d.tone]
      return `${f(d.valueA, '가치 A')}을(를) 좇을수록 ${f(d.valueB, '가치 B')}에서 멀어진다. ${w.but} ${f(d.subject, '소재')}의 끝에서 인물은 ${f(d.insight, '깨달음')}는(은) 역설을 ${w.truth}.`
    },
  },
  {
    name: '한 줄 요약형',
    hint: '로그라인처럼 압축한다',
    build: (d) => {
      return `${f(d.valueA, '가치 A')} vs ${f(d.valueB, '가치 B')} — ${f(d.subject, '소재')}를 무대로, ${f(d.insight, '깨달음')}.`
    },
  },
  {
    name: '보편 진술형',
    hint: '주제를 보편 명제로 일반화',
    build: (d) => {
      const w = TONE_WORDS[d.tone]
      return `${f(d.subject, '소재')}는 결국 ${f(d.valueA, '가치 A')}와(과) ${f(d.valueB, '가치 B')}에 관한 이야기이며, ${f(d.insight, '깨달음')}는(은) 보편의 진실을 말한다${w.ends.startsWith('이') ? '' : ''}.`
    },
  },
]

interface Example {
  title: string
  subject: string
  valueA: string
  valueB: string
  insight: string
  statement: string
}

// 유명 작품 주제 예시 — 입력 칸을 채워주는 예시 겸 학습용 샘플.
const EXAMPLES: Example[] = [
  {
    title: '《노인과 바다》',
    subject: '거대한 물고기와의 사투',
    valueA: '인간의 의지·존엄',
    valueB: '자연의 무심한 힘',
    insight: '인간은 패배할지언정 파괴되지 않는다',
    statement: '인간은 자연 앞에서 패배할 수 있어도 그 존엄까지 파괴되지는 않는다.',
  },
  {
    title: '《죄와 벌》',
    subject: '살인을 저지른 청년',
    valueA: '이성·초인 사상',
    valueB: '양심·인간적 죄책',
    insight: '죄는 처벌이 아니라 양심과의 화해로 구원된다',
    statement: '이성으로 정당화한 죄도 결국 양심 앞에 무너지며, 구원은 처벌이 아닌 참회에서 온다.',
  },
  {
    title: '《위대한 개츠비》',
    subject: '부와 사랑을 향한 집착',
    valueA: '과거를 되찾으려는 꿈',
    valueB: '돌이킬 수 없는 현실',
    insight: '꿈은 과거를 미화할 뿐 결코 되돌리지 못한다',
    statement: '과거를 향한 순수한 꿈도 현실의 벽 앞에서는 환상에 지나지 않는다.',
  },
  {
    title: '《어린 왕자》',
    subject: '별을 떠도는 어린 왕자',
    valueA: '어른의 셈법·효율',
    valueB: '아이의 마음·관계',
    insight: '가장 중요한 것은 눈에 보이지 않는다',
    statement: '정말 소중한 것은 눈에 보이지 않으며, 관계는 길들임으로 비로소 의미를 얻는다.',
  },
  {
    title: '《1984》',
    subject: '전체주의 감시 사회',
    valueA: '개인의 자유·진실',
    valueB: '체제의 통제·거짓',
    insight: '진실을 지키려는 개인은 거대 권력에 끝내 짓밟힌다',
    statement: '권력이 진실 자체를 조작할 때, 개인의 자유는 가장 먼저 지워진다.',
  },
  {
    title: '《변신》',
    subject: '벌레로 변한 가장',
    valueA: '가족 안의 쓸모',
    valueB: '존재 그 자체의 가치',
    insight: '쓸모를 잃은 존재는 가족에게서도 버림받는다',
    statement: '인간의 가치를 쓸모로만 잴 때, 가장 가까운 가족조차 그를 벌레처럼 버린다.',
  },
]

function loadState(): { drafts: never; cur: Draft; saved: Saved[]; template: number } {
  const blank: Draft = { subject: '', valueA: '', valueB: '', insight: '', tone: 'literary' }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { drafts: undefined as never, cur: blank, saved: [], template: 0 }
    const p = JSON.parse(raw)
    const cur: Draft = {
      subject: typeof p?.cur?.subject === 'string' ? p.cur.subject : '',
      valueA: typeof p?.cur?.valueA === 'string' ? p.cur.valueA : '',
      valueB: typeof p?.cur?.valueB === 'string' ? p.cur.valueB : '',
      insight: typeof p?.cur?.insight === 'string' ? p.cur.insight : '',
      tone: (['plain', 'literary', 'warm', 'sharp'] as ToneKey[]).includes(p?.cur?.tone) ? p.cur.tone : 'literary',
    }
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof (x as Saved).statement === 'string')
          .map((x: Saved) => ({
            id: String(x.id || Date.now() + Math.random()),
            title: String(x.title || ''),
            subject: String(x.subject || ''),
            valueA: String(x.valueA || ''),
            valueB: String(x.valueB || ''),
            insight: String(x.insight || ''),
            tone: (['plain', 'literary', 'warm', 'sharp'] as ToneKey[]).includes(x.tone) ? x.tone : 'literary',
            template: Number.isFinite(x.template) ? x.template : 0,
            statement: String(x.statement || ''),
            createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
          }))
      : []
    const template = Number.isFinite(p?.template) && p.template >= 0 && p.template < TEMPLATES.length ? p.template : 0
    return { drafts: undefined as never, cur, saved, template }
  } catch {
    return { drafts: undefined as never, cur: blank, saved: [], template: 0 }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export default function ThemeStatement() {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [template, setTemplate] = useState<number>(init.current.template)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showEx, setShowEx] = useState(false)
  const [copied, setCopied] = useState<string>('')
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved, template }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
  }, [cur, saved, template])

  const flashNote = (msg: string, _warn = false) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const statement = TEMPLATES[template].build(cur)
  const allVariants = TEMPLATES.map((t) => ({ name: t.name, text: t.build(cur) }))

  const setField = (k: keyof Draft, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.', true)
    }
  }

  const exportAll = () => {
    if (!saved.length) { flashNote('내보낼 저장 항목이 없습니다.'); return }
    const lines = saved.map((s, i) => {
      const dt = new Date(s.createdAt)
      const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      return [
        `[${i + 1}] ${s.title || '(제목 없음)'}  (${d})`,
        `주제문: ${s.statement}`,
        `· 소재: ${s.subject || '-'}`,
        `· 대립: ${s.valueA || '-'} ↔ ${s.valueB || '-'}`,
        `· 깨달음: ${s.insight || '-'}`,
      ].join('\n')
    })
    copy(`# 주제문 모음 (${saved.length}건)\n\n${lines.join('\n\n')}`, 'export')
    flashNote('저장 목록을 텍스트로 복사했습니다.')
  }

  const applyExample = (ex: Example) => {
    setCur({ subject: ex.subject, valueA: ex.valueA, valueB: ex.valueB, insight: ex.insight, tone: cur.tone })
    setShowEx(false)
    flashNote(`${ex.title} 예시를 입력에 채웠습니다.`)
  }

  const saveCurrent = () => {
    const st = statement
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim(),
      subject: cur.subject, valueA: cur.valueA, valueB: cur.valueB, insight: cur.insight, tone: cur.tone,
      template, statement: st, createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('주제문을 저장했습니다.')
    }
    setEditId(null)
    setTitle('')
  }

  // 생성된 주제문 + 입력 요소를 HTML 본문으로 묶어 프로젝트 바인더에 문서로 추가.
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.', true); return }
    const toneLabel = TONES.find((t) => t.key === cur.tone)?.label || cur.tone
    const row = (label: string, v: string) =>
      `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v && v.trim() ? v.trim() : '-')}</p>`
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>${escapeHtml(statement)}</b></p>`,
      `<hr/>`,
      `<p><b>틀:</b> ${escapeHtml(TEMPLATES[template].name)} · <b>어조:</b> ${escapeHtml(toneLabel)}</p>`,
      row('소재', cur.subject),
      row('대립 가치 A', cur.valueA),
      row('대립 가치 B', cur.valueB),
      row('결말의 깨달음', cur.insight),
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '주제',
      title: '주제 진술',
      bodyHtml,
    })
    flashNote(id ? '프로젝트 자료 〈주제〉 폴더에 주제 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  const loadSaved = (s: Saved) => {
    setCur({ subject: s.subject, valueA: s.valueA, valueB: s.valueB, insight: s.insight, tone: s.tone })
    setTemplate(s.template)
    setTitle(s.title)
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
  }

  const move = (id: string, dir: -1 | 1) => {
    setSaved((p) => {
      const i = p.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const clearForm = () => {
    setCur({ subject: '', valueA: '', valueB: '', insight: '', tone: cur.tone })
    setEditId(null)
    setTitle('')
  }

  const hasInput = !!(cur.subject || cur.valueA || cur.valueB || cur.insight)

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 170 }
  const stmtBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'keep-all' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const tplBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 2,
  })
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🧭"/> 주제문 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>소재 · 대립 가치 · 깨달음 → 한 문장 주제</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚"/> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>유명 작품 주제 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                    <button style={iconBtn} title="주제문 복사" onClick={() => copy(ex.statement, 'ex-' + ex.title)}>{copied === 'ex-' + ex.title ? '✓' : '복사'}</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.valueA} ↔ {ex.valueB}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, wordBreak: 'keep-all' }}>“{ex.statement}”</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️"/> 수정 중</> : '입력'}</h4>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>소재 — 무엇에 관한 이야기인가</label>
            <input style={input} value={cur.subject} onChange={(e) => setField('subject', e.target.value)} placeholder="예: 전쟁터로 떠나는 형제" maxLength={120} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}>
              <label style={fieldLabel}>대립 가치 A</label>
              <input style={input} value={cur.valueA} onChange={(e) => setField('valueA', e.target.value)} placeholder="예: 의무·명예" maxLength={80} />
            </div>
            <div style={col}>
              <label style={fieldLabel}>대립 가치 B</label>
              <input style={input} value={cur.valueB} onChange={(e) => setField('valueB', e.target.value)} placeholder="예: 가족·생존" maxLength={80} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>결말의 깨달음 — 인물(독자)이 끝에 얻는 진실</label>
            <input style={input} value={cur.insight} onChange={(e) => setField('insight', e.target.value)} placeholder="예: 명예보다 사람이 먼저다" maxLength={140} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...fieldLabel, margin: 0 }}>어조</span>
            {TONES.map((t) => (
              <button key={t.key} onClick={() => setField('tone', t.key)} style={chip(cur.tone === t.key)}>{t.label}</button>
            ))}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
        </div>

        {/* 틀 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>주제문 틀 — {TEMPLATES.length}가지</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button key={t.name} onClick={() => setTemplate(i)} style={tplBtn(template === i)}>
                <b style={{ fontSize: 12.5, color: template === i ? 'var(--accent)' : 'var(--text)' }}>{template === i ? '● ' : '○ '}{t.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>생성된 주제문 · {TEMPLATES[template].name}</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(statement, 'main')}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          <div style={stmtBox}>{statement}</div>

          <div style={{ marginTop: 14 }}>
            <div style={{ ...fieldLabel, marginBottom: 6 }}>다른 틀로 본 변주 ({allVariants.length}개)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {allVariants.map((v, i) => (
                <div key={v.name} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <button onClick={() => setTemplate(i)} style={{ ...chip(template === i), flexShrink: 0 }}>{v.name}</button>
                  <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.6, color: template === i ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all' }}>{v.text}</span>
                  <button style={iconBtn} title="이 변주 복사" onClick={() => copy(v.text, 'v' + i)}>{copied === 'v' + i ? '✓' : '복사'}</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 160 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (예: 장편 1부 주제)" maxLength={60} />
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾"/> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계: 생성된 주제문을 실제 프로젝트 바인더(자료 〈주제〉)에 문서로 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addToProjectDoc}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 주제문과 요소를 프로젝트 자료 〈주제〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 주제 문서 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 (CRUD) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 주제문 · {saved.length}건</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={exportAll} disabled={!saved.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 주제문이 없습니다.<br />
              위에서 칸을 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚"/> 작품 예시</b>로 시작해 보세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{TEMPLATES[s.template]?.name || '틀'}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => move(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => move(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="이 항목 복사" onClick={() => copy(s.statement, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️"/></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, wordBreak: 'keep-all' }}>“{s.statement}”</div>
                  {(s.valueA || s.valueB || s.subject) && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {s.subject && <span>소재: {s.subject} · </span>}
                      {(s.valueA || s.valueB) && <span>{s.valueA || '?'} ↔ {s.valueB || '?'}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          주제문은 “이 이야기가 결국 무엇을 말하는가”를 한 문장으로 못 박는 작업입니다. 대립하는 두 가치를 또렷이 세울수록 갈등과 결말이 단단해집니다.
          입력·저장 목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
