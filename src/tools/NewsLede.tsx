// 기사 리드 빌더 — 5W1H(누가/무엇을/언제/어디서/왜/어떻게)를 입력하면 역피라미드 원칙으로
// 리드(lede) 문장을 자동 종합하고, 표제(headline) 후보도 함께 제안한다. 여러 리드를 저장·수정·삭제·순서 변경.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 불필요). localStorage 'sry:tool:news-lede' 자동 저장/복원.
// 연계(linkbus): 완성한 리드+표제+육하원칙을 실제 프로젝트 자료('research')의 '기사' 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'news-lede', name: '기사 리드 빌더', icon: '📰', group: '구상·정리', intro: '육하원칙(5W1H)을 채우면 역피라미드 리드 문장과 표제 후보를 자동으로 만들어 줍니다', w: 640, h: 600 }

const LS_KEY = 'sry:tool:news-lede'

// 육하원칙 필드 정의 — 입력 순서·플레이스홀더·아이콘.
type WKey = 'who' | 'what' | 'when' | 'where' | 'why' | 'how'
interface WDef { key: WKey; label: string; icon: string; ph: string }
const W_FIELDS: WDef[] = [
  { key: 'who', label: '누가', icon: '👤', ph: '예: 서울시, 김 모 씨, 시민단체' },
  { key: 'what', label: '무엇을', icon: '📌', ph: '예: 새 보행자 다리를 개통했다' },
  { key: 'when', label: '언제', icon: '🕒', ph: '예: 14일 오전, 어제, 지난주' },
  { key: 'where', label: '어디서', icon: '📍', ph: '예: 한강 잠수교 인근에서' },
  { key: 'why', label: '왜', icon: '❓', ph: '예: 출퇴근 혼잡을 줄이기 위해' },
  { key: 'how', label: '어떻게', icon: '⚙️', ph: '예: 민관 합동 예산 120억 원을 투입해' },
]

type Form = Record<WKey, string>
const emptyForm = (): Form => ({ who: '', what: '', when: '', where: '', why: '', how: '' })

// 리드 어조/문체 — 같은 골격을 어조에 맞춰 변주.
type ToneKey = 'straight' | 'formal' | 'soft'
const TONES: { key: ToneKey; label: string; hint: string }[] = [
  { key: 'straight', label: '스트레이트', hint: '건조하고 사실 중심(일반 보도체)' },
  { key: 'formal', label: '격식', hint: '~다 종결의 정제된 공식 문체' },
  { key: 'soft', label: '피처', hint: '부드럽고 풀어 쓴 읽을거리 문체' },
]

interface Saved extends Form {
  id: string
  title: string      // 저장 제목(메모용)
  tone: ToneKey
  template: number    // 선택했던 리드 틀
  lede: string        // 확정 리드 문장
  headline: string    // 확정 표제
  createdAt: number
}

// ── 텍스트 헬퍼 ──
const t = (s: string) => (s || '').trim()
// 끝의 마침표/조사 군더더기 정리.
const stripDot = (s: string) => t(s).replace(/[.。]\s*$/, '')
// 빈 값은 자리표시자로 — 항상 읽히는 문장을 만든다.
const f = (s: string, ph: string) => (t(s) ? stripDot(s) : `〔${ph}〕`)

// '무엇을'을 서술어로 자연스럽게 종결(이미 동사형이면 그대로, 명사형이면 '~했다' 부착).
function asPredicate(what: string, tone: ToneKey): string {
  const w = stripDot(what)
  if (!w) return '〔무엇을〕'
  // 이미 '다'/'됐다'/'했다' 등 동사 종결로 끝나면 그대로 사용.
  if (/(다|요|됨|함|중|했다|된다|한다|였다|이다)$/.test(w)) return w
  // 명사구로 끝나면 행위로 만들어 준다.
  if (/(을|를)$/.test(w)) return w + ' 했다'
  return w + '했다'
}

interface Tpl { name: string; hint: string; build: (form: Form, tone: ToneKey) => string }

// 역피라미드: 가장 중요한 핵심(누가·무엇을)을 맨 앞에, 부차 정보(언제·어디서·왜·어떻게)는 뒤로.
const TEMPLATES: Tpl[] = [
  {
    name: '핵심 우선형',
    hint: '누가+무엇을 → 언제·어디서·왜 (가장 표준적인 역피라미드)',
    build: (d, tone) => {
      const head = `${f(d.who, '누가')}이(가) ${asPredicate(d.what, tone)}`
      const tail: string[] = []
      const when = t(d.when), where = t(d.where), why = t(d.why)
      const det = [when && stripDot(when), where && stripDot(where)].filter(Boolean).join(' ')
      let s = ''
      if (det) s += `${det} `
      s += head
      if (why) s += `. 이는 ${stripDot(why)} 위한 것이다`
      void tail
      return s.replace(/\s+/g, ' ').trim() + '.'
    },
  },
  {
    name: '한 문장 종합형',
    hint: '6요소를 한 문장에 압축한 밀도 높은 리드',
    build: (d) => {
      const parts: string[] = []
      const when = t(d.when), where = t(d.where)
      if (when) parts.push(stripDot(when))
      if (where) parts.push(stripDot(where))
      let s = parts.join(' ')
      s += `${s ? ' ' : ''}${f(d.who, '누가')}이(가) `
      if (t(d.how)) s += `${stripDot(d.how)} `
      if (t(d.why)) s += `${stripDot(d.why)} 위해 `
      s += `${asPredicate(d.what, 'straight')}`
      return s.replace(/\s+/g, ' ').trim() + '.'
    },
  },
  {
    name: '주어 강조형',
    hint: '행위 주체(누가)를 맨 앞에 세운다',
    build: (d) => {
      let s = `${f(d.who, '누가')}이(가) ${asPredicate(d.what, 'straight')}`
      const det = [t(d.when) && stripDot(d.when), t(d.where) && stripDot(d.where)].filter(Boolean).join(' ')
      if (det) s += `. 이번 일은 ${det} 있었다`
      if (t(d.how)) s += `. ${stripDot(d.how)}`
      return s.replace(/\s+/g, ' ').trim() + '.'
    },
  },
  {
    name: '왜 강조형',
    hint: '동기·배경(왜)을 앞세워 의미를 부각',
    build: (d) => {
      let s = ''
      if (t(d.why)) s += `${stripDot(d.why)} 위해 `
      s += `${f(d.who, '누가')}이(가) `
      if (t(d.when)) s += `${stripDot(d.when)} `
      if (t(d.where)) s += `${stripDot(d.where)} `
      s += `${asPredicate(d.what, 'straight')}`
      return s.replace(/\s+/g, ' ').trim() + '.'
    },
  },
  {
    name: '시점·현장형',
    hint: '언제·어디서를 앞세운 현장 리드',
    build: (d) => {
      const when = t(d.when) ? stripDot(d.when) : '〔언제〕'
      const where = t(d.where) ? stripDot(d.where) : ''
      let s = `${when} ${where} ${f(d.who, '누가')}이(가) ${asPredicate(d.what, 'straight')}`
      if (t(d.how)) s += `. ${stripDot(d.how)}`
      return s.replace(/\s+/g, ' ').trim() + '.'
    },
  },
]

// 표제(headline) 후보 — 짧고 압축적인 제목 변주.
function headlines(d: Form): { kind: string; text: string }[] {
  const who = f(d.who, '누가')
  const what = stripDot(d.what) || '〔무엇을〕'
  const where = stripDot(d.where)
  const why = stripDot(d.why)
  const how = stripDot(d.how)
  const whatShort = what.replace(/(을|를)?\s*했다$/, '').replace(/(을|를)$/, '') || what
  const out: { kind: string; text: string }[] = []
  out.push({ kind: '표준', text: `${who}, ${whatShort}` })
  out.push({ kind: '주체+행위', text: `${who} “${whatShort}”` })
  if (where) out.push({ kind: '현장', text: `${where} ${who} ${whatShort}` })
  if (why) out.push({ kind: '의미', text: `${who}, ${why} 위해 ${whatShort}` })
  if (how) out.push({ kind: '방법', text: `${who}, ${how} ${whatShort}` })
  out.push({ kind: '압축', text: `${whatShort}…${who}` })
  // 중복 제거.
  const seen = new Set<string>()
  return out.filter((h) => { const k = h.text.trim(); if (!k || seen.has(k)) return false; seen.add(k); return true })
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// localStorage 복원 — 미지원/손상 시 graceful.
function loadState(): { form: Form; tone: ToneKey; template: number; saved: Saved[] } {
  const blank = { form: emptyForm(), tone: 'straight' as ToneKey, template: 0, saved: [] as Saved[] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return blank
    const p = JSON.parse(raw)
    const form = emptyForm()
    W_FIELDS.forEach(({ key }) => { if (typeof p?.form?.[key] === 'string') form[key] = p.form[key] })
    const tone: ToneKey = (['straight', 'formal', 'soft'] as ToneKey[]).includes(p?.tone) ? p.tone : 'straight'
    const template = Number.isFinite(p?.template) && p.template >= 0 && p.template < TEMPLATES.length ? p.template : 0
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => {
          const sf = emptyForm()
          W_FIELDS.forEach(({ key }) => { if (typeof x[key] === 'string') sf[key] = x[key] as string })
          return {
            ...sf,
            id: String(x.id || newId()),
            title: String(x.title || ''),
            tone: (['straight', 'formal', 'soft'] as ToneKey[]).includes(x.tone as ToneKey) ? (x.tone as ToneKey) : 'straight',
            template: Number.isFinite(x.template) ? (x.template as number) : 0,
            lede: String(x.lede || ''),
            headline: String(x.headline || ''),
            createdAt: Number(x.createdAt) || Date.now(),
          } as Saved
        })
      : []
    return { form, tone, template, saved }
  } catch { return blank }
}

export default function NewsLede() {
  const init = useRef(loadState())
  const [form, setForm] = useState<Form>(init.current.form)
  const [tone, setTone] = useState<ToneKey>(init.current.tone)
  const [template, setTemplate] = useState<number>(init.current.template)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [pickedHead, setPickedHead] = useState(0)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ form, tone, template, saved })) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
  }, [form, tone, template, saved])

  const flash = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const lede = TEMPLATES[template].build(form, tone)
  const allVariants = TEMPLATES.map((tp) => ({ name: tp.name, text: tp.build(form, tone) }))
  const heads = headlines(form)
  const safeHead = heads[Math.min(pickedHead, heads.length - 1)] || heads[0]
  const hasInput = W_FIELDS.some(({ key }) => t(form[key]))

  const setField = (k: WKey, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const copy = (text: string, tag: string) => {
    const done = () => {
      if (!mounted.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    }
    const fallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
      } catch { flash('복사에 실패했습니다. 직접 선택해 복사하세요.') }
    }
    try {
      if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback)
      else fallback()
    } catch { fallback() }
  }

  const clearForm = () => { setForm(emptyForm()); setEditId(null); setTitle('') }

  const saveCurrent = () => {
    const rec: Saved = {
      ...form,
      id: editId || newId(),
      title: t(title) || (stripDot(form.what) || '제목 없는 리드'),
      tone, template,
      lede,
      headline: safeHead ? safeHead.text : '',
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flash('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flash('리드를 저장했습니다.')
    }
    setEditId(null); setTitle('')
  }

  const loadSaved = (s: Saved) => {
    const sf = emptyForm()
    W_FIELDS.forEach(({ key }) => { sf[key] = s[key] })
    setForm(sf)
    setTone(s.tone)
    setTemplate(Math.min(Math.max(0, s.template), TEMPLATES.length - 1))
    setTitle(s.title)
    setEditId(s.id)
    setPickedHead(0)
    setConfirmDel(null)
    flash('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const remove = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
    setConfirmDel(null)
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

  const exportOne = (s: Saved): string => {
    const lines = [
      `# ${s.title}`,
      '',
      `표제: ${s.headline || '—'}`,
      `리드: ${s.lede}`,
      '',
      '· 육하원칙',
      ...W_FIELDS.map((wf) => `  - ${wf.label}: ${t(s[wf.key]) || '—'}`),
    ]
    return lines.join('\n')
  }
  const exportAll = () => {
    if (!saved.length) { flash('내보낼 저장 항목이 없습니다.'); return }
    copy(saved.map(exportOne).join('\n\n———\n\n'), 'export')
    flash('저장 목록을 텍스트로 복사했습니다.')
  }

  // 프로젝트 연동 — 리드+표제+육하원칙을 자료(research)/'기사' 폴더에 문서로 추가.
  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const toneLabel = TONES.find((x) => x.key === tone)?.label || tone
    const row = (label: string, v: string) => `<p><b>${escHtml(label)}:</b> ${escHtml(t(v) || '—')}</p>`
    const headRows = heads.map((h) => `<li>${escHtml(h.text)} <span style="color:#888">(${escHtml(h.kind)})</span></li>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>${escHtml(safeHead ? safeHead.text : '')}</b></p>`,
      `<p style="line-height:1.7;">${escHtml(lede)}</p>`,
      `<hr/>`,
      `<p><b>틀:</b> ${escHtml(TEMPLATES[template].name)} · <b>어조:</b> ${escHtml(toneLabel)}</p>`,
      `<p><b>육하원칙(5W1H)</b></p>`,
      ...W_FIELDS.map((wf) => row(`${wf.icon} ${wf.label}`, form[wf.key])),
      `<p><b>표제 후보</b></p>`,
      `<ul>${headRows}</ul>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기사',
      title: t(title) ? `기사 리드 — ${t(title)}` : (safeHead ? safeHead.text : '기사 리드'),
      bodyHtml,
      synopsis: lede,
      meta: { 표제: safeHead ? safeHead.text : '—', 어조: toneLabel },
    })
    flash(id ? '프로젝트 자료 〈기사〉 폴더에 리드 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const ledeBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 15, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'keep-all' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const tplBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)', color: 'var(--text)',
    display: 'flex', flexDirection: 'column', gap: 2,
  })
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="📰"/></span>
        <strong style={{ fontSize: 15 }}>기사 리드 빌더</strong>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>육하원칙 → 역피라미드 리드 · 표제</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {/* 입력: 육하원칙 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️"/> 수정 중 — 육하원칙(5W1H)</> : '육하원칙(5W1H) 입력'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {W_FIELDS.map((wf) => (
              <div key={wf.key}>
                <label style={fieldLabel}><Emoji e={wf.icon}/> {wf.label}</label>
                <input style={input} value={form[wf.key]} onChange={(e) => setField(wf.key, e.target.value)} placeholder={wf.ph} maxLength={160} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ ...fieldLabel, margin: 0 }}>어조</span>
            {TONES.map((x) => (
              <button key={x.key} onClick={() => setTone(x.key)} style={chip(tone === x.key)} title={x.hint}>{x.label}</button>
            ))}
          </div>
        </div>

        {/* 리드 틀 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>리드 틀 — {TEMPLATES.length}가지 (역피라미드)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {TEMPLATES.map((tp, i) => (
              <button key={tp.name} onClick={() => setTemplate(i)} style={tplBtn(template === i)}>
                <b style={{ fontSize: 12.5, color: template === i ? 'var(--accent)' : 'var(--text)' }}>{template === i ? '● ' : '○ '}{tp.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{tp.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 결과: 리드 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>생성된 리드 · {TEMPLATES[template].name}</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(lede, 'lede')}>{copied === 'lede' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          <div style={ledeBox}>{lede}</div>

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
        </div>

        {/* 결과: 표제 후보 */}
        <div style={card}>
          <h4 style={sectionTitle}>표제(headline) 후보 — {heads.length}개</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {heads.map((h, i) => {
              const active = i === Math.min(pickedHead, heads.length - 1)
              return (
                <div key={h.text + i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setPickedHead(i)} style={{ ...chip(active), flexShrink: 0 }} title="이 표제를 선택">{h.kind}</button>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all' }}>{h.text}</span>
                  <button style={iconBtn} title="이 표제 복사" onClick={() => copy(h.text, 'h' + i)}>{copied === 'h' + i ? '✓' : '복사'}</button>
                </div>
              )
            })}
          </div>
          <div style={{ ...hint, marginTop: 8 }}>선택한 표제는 저장·프로젝트 추가 시 함께 기록됩니다.</div>

          {/* 저장 + 프로젝트 연계 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 160 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 ‘무엇을’로)" maxLength={80} />
            <button className="btn-primary" onClick={saveCurrent} disabled={!hasInput}>{editId ? '수정 저장' : <><Emoji e="💾"/> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addToProjectDoc}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 리드·표제·육하원칙을 프로젝트 자료 〈기사〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 기사 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 (CRUD) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 리드 · {saved.length}건</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={exportAll} disabled={!saved.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 리드가 없습니다.<br />
              위에서 육하원칙을 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>‘누가 · 무엇을’만 채워도 리드와 표제가 만들어집니다.</span>
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
                      <button style={iconBtn} title="이 리드 복사" onClick={() => copy(exportOne(s), 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️"/></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                  {s.headline && <div style={{ fontSize: 13, fontWeight: 700, wordBreak: 'keep-all' }}>{s.headline}</div>}
                  <div style={{ fontSize: 13, lineHeight: 1.6, wordBreak: 'keep-all', color: 'var(--muted)' }}>{s.lede}</div>
                  {confirmDel === s.id && (
                    <div style={{ padding: 8, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 12 }}>
                      <div style={{ marginBottom: 6, color: 'var(--warn)' }}>이 리드를 삭제할까요?</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary" style={{ padding: '3px 10px', fontSize: 12, background: 'var(--warn)' }} onClick={() => remove(s.id)}>삭제</button>
                        <button className="minibtn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setConfirmDel(null)}>취소</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          역피라미드 원칙: 가장 중요한 사실(누가·무엇을)을 맨 앞에, 부차 정보(언제·어디서·왜·어떻게)는 뒤로 배치합니다.
          리드 한 문장으로 핵심이 전달되도록 다듬어 보세요. 입력·저장 목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
