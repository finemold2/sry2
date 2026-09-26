// 논문 초록(IMRaD) 빌더 — 배경/목적·방법·결과·결론 칸을 채우면 학술 초록 한 문단으로 자동 종합하고 단어 수를 보여준다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 불필요(전부 로컬). 워크시트/저장 목록은 localStorage 에 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'abstract-builder', name: '논문 초록 빌더', icon: '📑', group: '구상·정리', intro: '배경·방법·결과·결론(IMRaD)을 채우면 학술 초록 한 문단으로 자동 종합', w: 620, h: 640 }

const LS_KEY = 'sry:tool:abstract-builder'

type Lang = 'ko' | 'en'

interface Draft {
  background: string   // 배경 — 왜 중요한 문제인가
  objective: string    // 목적 — 무엇을 밝히려 했는가
  methods: string      // 방법 — 어떻게 연구했는가
  results: string      // 결과 — 무엇을 발견했는가
  conclusion: string   // 결론 — 그것이 무엇을 의미하는가
  keywords: string     // 키워드(쉼표 구분)
  lang: Lang           // 종합 문장 언어
}

interface Saved extends Draft {
  id: string
  title: string        // 논문/메모 제목
  abstractText: string // 확정 초록
  wordCount: number
  createdAt: number
}

const BLANK: Draft = { background: '', objective: '', methods: '', results: '', conclusion: '', keywords: '', lang: 'ko' }

// IMRaD 칸 정의 — 라벨·도움말·자리표시자·예시를 한곳에서 관리.
interface FieldDef {
  key: keyof Pick<Draft, 'background' | 'objective' | 'methods' | 'results' | 'conclusion'>
  label: string
  hint: string
  ph: string
  rows: number
}
const FIELDS: FieldDef[] = [
  { key: 'background', label: '배경 (Introduction)', hint: '왜 중요한 문제인가 · 지식의 공백', ph: '예: 청소년 수면 부족이 학업에 미치는 영향은 아직 충분히 규명되지 않았다', rows: 2 },
  { key: 'objective', label: '목적 (Objective)', hint: '이 연구가 밝히려는 것', ph: '예: 수면 시간과 학업 성취도의 상관을 규명하고자 한다', rows: 2 },
  { key: 'methods', label: '방법 (Methods)', hint: '대상·설계·분석 방법', ph: '예: 고교생 320명을 대상으로 6개월간 수면 일지와 성적을 추적해 회귀분석을 실시했다', rows: 2 },
  { key: 'results', label: '결과 (Results)', hint: '핵심 발견 · 수치', ph: '예: 하루 7시간 미만 수면 집단의 평균 성적이 12% 낮았다(p<.01)', rows: 2 },
  { key: 'conclusion', label: '결론 (Conclusion)', hint: '의미 · 함의 · 제언', ph: '예: 충분한 수면 확보가 학업 성취에 기여하며 등교 시간 조정을 제언한다', rows: 2 },
]

// 종합 연결구 — 언어별로 각 부분을 자연스러운 한 문단으로 잇는다. 빈 칸은 건너뛴다.
const CONNECT: Record<Lang, { background: string; objective: string; methods: string; results: string; conclusion: string }> = {
  ko: { background: '', objective: '본 연구는 ', methods: '이를 위해 ', results: '그 결과, ', conclusion: '결론적으로 ' },
  en: { background: '', objective: 'This study aims to ', methods: 'To this end, ', results: 'The results show that ', conclusion: 'In conclusion, ' },
}

// 문장 끝에 마침표가 없으면 보태고, 앞뒤 공백 정리.
function tidy(s: string): string {
  const t = (s || '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return /[.。!?！？…]$/.test(t) ? t : t + '.'
}

// 영어/한국어 겸용 단어 수: 공백 분절 + CJK 글자는 글자당 1로 가산해 한국어 분량도 합리적으로 센다.
function countWords(s: string): number {
  const t = (s || '').trim()
  if (!t) return 0
  const cjk = (t.match(/[　-〿㐀-鿿가-힯]/g) || []).length
  const nonCjk = t.replace(/[　-〿㐀-鿿가-힯]/g, ' ').trim()
  const latin = nonCjk ? nonCjk.split(/\s+/).filter(Boolean).length : 0
  return cjk + latin
}

// IMRaD 칸 → 학술 초록 한 문단. 빈 칸은 생략하고 채워진 부분만 매끄럽게 잇는다.
function compose(d: Draft): string {
  const c = CONNECT[d.lang]
  const parts: string[] = []
  const add = (lead: string, raw: string) => {
    const body = (raw || '').trim()
    if (!body) return
    parts.push((lead + tidy(body)).trim())
  }
  add(c.background, d.background)
  add(c.objective, d.objective)
  add(c.methods, d.methods)
  add(c.results, d.results)
  add(c.conclusion, d.conclusion)
  return parts.join(' ')
}

function parseKeywords(s: string): string[] {
  return (s || '')
    .split(/[,，·;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function loadState(): { cur: Draft; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: { ...BLANK }, saved: [] }
    const p = JSON.parse(raw)
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const lang: Lang = p?.cur?.lang === 'en' ? 'en' : 'ko'
    const cur: Draft = {
      background: str(p?.cur?.background),
      objective: str(p?.cur?.objective),
      methods: str(p?.cur?.methods),
      results: str(p?.cur?.results),
      conclusion: str(p?.cur?.conclusion),
      keywords: str(p?.cur?.keywords),
      lang,
    }
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof (x as Saved).abstractText === 'string')
          .map((x: Saved) => ({
            id: String(x.id || Date.now() + Math.random()),
            title: String(x.title || ''),
            background: str(x.background),
            objective: str(x.objective),
            methods: str(x.methods),
            results: str(x.results),
            conclusion: str(x.conclusion),
            keywords: str(x.keywords),
            lang: x.lang === 'en' ? 'en' : 'ko',
            abstractText: String(x.abstractText || ''),
            wordCount: Number.isFinite(x.wordCount) ? x.wordCount : countWords(String(x.abstractText || '')),
            createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
          }))
      : []
    return { cur, saved }
  } catch {
    return { cur: { ...BLANK }, saved: [] }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 예시 초록 — 칸을 채워주는 학습용 샘플.
interface Example { title: string; d: Draft }
const EXAMPLES: Example[] = [
  {
    title: '청소년 수면과 학업 성취',
    d: {
      background: '청소년의 만성적 수면 부족이 학업 수행에 미치는 영향은 충분히 규명되지 않았다',
      objective: '수면 시간과 학업 성취도 간의 관계를 실증적으로 규명한다',
      methods: '고등학생 320명을 대상으로 6개월간 수면 일지와 학기 성적을 수집해 다중 회귀분석을 수행했다',
      results: '하루 7시간 미만 수면 집단은 충분 수면 집단보다 평균 성적이 12% 낮았으며 그 차이는 통계적으로 유의했다(p<.01)',
      conclusion: '충분한 수면 확보는 학업 성취에 기여하므로 등교 시간 조정 등 제도적 개입이 필요하다',
      keywords: '청소년, 수면, 학업 성취, 회귀분석',
      lang: 'ko',
    },
  },
  {
    title: 'Caffeine & Reaction Time',
    d: {
      background: 'The acute effects of moderate caffeine intake on cognitive speed remain debated',
      objective: 'examine whether 200 mg of caffeine improves simple reaction time in young adults',
      methods: 'a double-blind crossover trial with 48 participants measured reaction time before and after dosing',
      results: 'mean reaction time decreased by 9% after caffeine compared with placebo (p<.05)',
      conclusion: 'moderate caffeine intake yields a small but reliable gain in reaction speed',
      keywords: 'caffeine, reaction time, cognition, crossover trial',
      lang: 'en',
    },
  },
]

export default function AbstractBuilder() {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showEx, setShowEx] = useState(false)
  const [copied, setCopied] = useState('')
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

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const abstractText = compose(cur)
  const wordCount = countWords(abstractText)
  const keywords = parseKeywords(cur.keywords)
  const hasInput = !!(cur.background || cur.objective || cur.methods || cur.results || cur.conclusion)
  // 채워진 IMRaD 칸 수 — 완성도 표시.
  const filled = FIELDS.filter((f) => (cur[f.key] || '').trim()).length

  const setField = (k: keyof Draft, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    if (!text) { flashNote('복사할 내용이 없습니다.'); return }
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const copyWithKw = () => {
    const kw = keywords.length ? `\n\n${cur.lang === 'en' ? 'Keywords' : '키워드'}: ${keywords.join(', ')}` : ''
    copy(abstractText + kw, 'main')
  }

  const applyExample = (ex: Example) => {
    setCur({ ...ex.d })
    setEditId(null)
    setTitle(ex.title)
    setShowEx(false)
    flashNote(`예시 〈${ex.title}〉를 입력에 채웠습니다.`)
  }

  const clearForm = () => {
    setCur((p) => ({ ...BLANK, lang: p.lang }))
    setEditId(null)
    setTitle('')
  }

  const saveCurrent = () => {
    if (!abstractText) { flashNote('먼저 칸을 채워 초록을 만들어 주세요.'); return }
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim(),
      ...cur,
      abstractText,
      wordCount,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('초록을 저장했습니다.')
    }
    setEditId(null)
    setTitle('')
  }

  const loadSaved = (s: Saved) => {
    setCur({
      background: s.background, objective: s.objective, methods: s.methods,
      results: s.results, conclusion: s.conclusion, keywords: s.keywords, lang: s.lang,
    })
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

  const exportAll = () => {
    if (!saved.length) { flashNote('내보낼 저장 항목이 없습니다.'); return }
    const blocks = saved.map((s, i) => {
      const dt = new Date(s.createdAt)
      const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const kw = parseKeywords(s.keywords)
      return [
        `[${i + 1}] ${s.title || '(제목 없음)'}  (${d}, ${s.wordCount} 단어)`,
        s.abstractText,
        kw.length ? `키워드: ${kw.join(', ')}` : '',
      ].filter(Boolean).join('\n')
    })
    copy(`# 초록 모음 (${saved.length}건)\n\n${blocks.join('\n\n')}`, 'export')
    flashNote('저장 목록을 텍스트로 복사했습니다.')
  }

  // 생성된 초록 + IMRaD 요소를 HTML 본문으로 묶어 프로젝트 자료 〈학술〉 폴더에 문서로 추가.
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!abstractText) { flashNote('먼저 칸을 채워 초록을 만들어 주세요.'); return }
    const row = (label: string, v: string) =>
      (v && v.trim()) ? `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v.trim())}</p>` : ''
    const kwLine = keywords.length
      ? `<p><b>${cur.lang === 'en' ? 'Keywords' : '키워드'}:</b> ${escapeHtml(keywords.join(', '))}</p>`
      : ''
    const bodyHtml = [
      `<p style="font-size:14px;line-height:1.75;">${escapeHtml(abstractText)}</p>`,
      kwLine,
      `<p style="color:#888;font-size:12px;">${wordCount} 단어 · IMRaD ${filled}/5</p>`,
      `<hr/>`,
      `<p style="color:#888;font-size:12px;">— IMRaD 구성 요소 —</p>`,
      row('배경', cur.background),
      row('목적', cur.objective),
      row('방법', cur.methods),
      row('결과', cur.results),
      row('결론', cur.conclusion),
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '학술',
      title: title.trim() ? `초록 — ${title.trim()}` : '초록',
      bodyHtml,
      synopsis: abstractText.slice(0, 160),
      meta: { 단어수: String(wordCount), 'IMRaD': `${filled}/5`, 키워드: keywords.join(', ') },
    })
    flashNote(id ? '프로젝트 자료 〈학술〉 폴더에 초록 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const absBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14, lineHeight: 1.8, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', textAlign: 'justify' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const badge: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="📑" /> 논문 초록 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>배경·방법·결과·결론(IMRaD) → 초록 한 문단</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>예시 초록 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <span style={badge}>{ex.d.lang === 'en' ? 'EN' : 'KO'}</span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--muted)', wordBreak: 'keep-all' }}>{compose(ex.d)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력: IMRaD 칸 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️" /> 수정 중</> : 'IMRaD 입력'}</h4>
            <span style={badge}>{filled}/5 칸</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...fieldLabel, margin: 0 }}>종합 언어</span>
              <button onClick={() => setField('lang', 'ko')} style={chip(cur.lang === 'ko')}>한국어</button>
              <button onClick={() => setField('lang', 'en')} style={chip(cur.lang === 'en')}>English</button>
            </div>
          </div>
          {FIELDS.map((fd) => (
            <div key={fd.key} style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>{fd.label} — <span style={{ opacity: 0.85 }}>{fd.hint}</span></label>
              <textarea
                style={input}
                rows={fd.rows}
                value={cur[fd.key]}
                onChange={(e) => setField(fd.key, e.target.value)}
                placeholder={fd.ph}
              />
            </div>
          ))}
          <div style={{ marginBottom: 4 }}>
            <label style={fieldLabel}>키워드 — 쉼표로 구분</label>
            <input
              style={{ ...input, resize: 'none' }}
              value={cur.keywords}
              onChange={(e) => setField('keywords', e.target.value)}
              placeholder="예: 수면, 학업 성취, 회귀분석"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId && !cur.keywords && !title}>입력 비우기</button>
          </div>
        </div>

        {/* 결과: 종합된 초록 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>자동 종합 초록</h4>
            <span style={{ ...badge, borderColor: 'var(--accent)', color: 'var(--accent)' }}>{wordCount} 단어</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copyWithKw} disabled={!abstractText}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          {abstractText ? (
            <>
              <div style={absBox}>{abstractText}</div>
              {keywords.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ ...fieldLabel, margin: 0 }}>{cur.lang === 'en' ? 'Keywords' : '키워드'}</span>
                  {keywords.map((k, i) => (
                    <span key={k + i} style={{ ...badge, background: 'var(--chrome-2)' }}>{k}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={empty}>
              위 IMRaD 칸을 채우면 학술 초록 한 문단이 자동으로 종합됩니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚" /> 예시</b>로 시작해 보세요.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 160, resize: 'none' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (예: 수면-학업 논문)" maxLength={80} />
            <button className="btn-primary" onClick={saveCurrent} disabled={!abstractText}>{editId ? '수정 저장' : <><Emoji e="💾" /> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계: 생성된 초록을 실제 프로젝트 바인더(자료 〈학술〉)에 문서로 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addToProjectDoc}
              disabled={!hasProjectBridge() || !abstractText}
              title={hasProjectBridge() ? '현재 초록과 IMRaD 요소를 프로젝트 자료 〈학술〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 (CRUD) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 초록 · {saved.length}건</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={exportAll} disabled={!saved.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 초록이 없습니다.<br />
              위에서 칸을 채우고 <b>저장</b>을 누르면 여기에 모입니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={badge}>{s.lang === 'en' ? 'EN' : 'KO'}</span>
                    <span style={badge}>{s.wordCount} 단어</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => move(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => move(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="이 초록 복사" onClick={() => copy(s.abstractText, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, wordBreak: 'keep-all', color: 'var(--text)' }}>{s.abstractText}</div>
                  {parseKeywords(s.keywords).length > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>키워드: {parseKeywords(s.keywords).join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          초록(abstract)은 논문 전체를 한 문단으로 압축하는 글입니다. <b>I</b>ntroduction(배경)·<b>M</b>ethods(방법)·<b>R</b>esults(결과)·<b>a</b>nd <b>D</b>iscussion(결론)의 IMRaD 순서로 각 칸을 한두 문장씩 채우면, 학술지에서 쓰는 한 문단 초록으로 자동 종합됩니다. 입력·저장 목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
