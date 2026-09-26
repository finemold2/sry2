// 에세이 구조 빌더 — 수필/에세이를 서론(훅·문제 제기) → 본론(PEEL 문단 여러 개) → 결론(요약·여운)으로 설계한다.
//  · 본론은 PEEL(Point 주장 / Evidence 근거 / Explain 설명 / Link 연결) 문단을 여러 개 추가·삭제·순서 변경.
//  · 글자수·문단수 등 진행 정보를 보여주고, 전체 초안을 한 편의 글로 미리보기한다.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:essay-structure' 에 자동 저장/복원.
// 연계(linkbus): 설계한 에세이 구조를 실제 프로젝트 자료('research')의 〈에세이〉 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'essay-structure', name: '에세이 구조 빌더', icon: '🪶', group: '구상·정리', intro: '서론(훅·문제 제기)-본론(PEEL 문단)-결론(요약·여운)으로 수필/에세이를 설계하세요', w: 680, h: 640 }

const LS_KEY = 'sry:tool:essay-structure'

// 본론의 한 문단 — PEEL 구조.
interface Para {
  id: string
  point: string     // Point: 이 문단의 핵심 주장 한 문장
  evidence: string  // Evidence: 근거·예시·인용·경험
  explain: string   // Explain: 근거가 주장을 어떻게 뒷받침하는지 풀이
  link: string      // Link: 주제/다음 문단으로 잇는 연결
}

interface Essay {
  title: string       // 글 제목
  thesis: string      // 한 줄 논지(주제문)
  introHook: string   // 서론 — 훅(첫 문장으로 끌어들이기)
  introProblem: string// 서론 — 문제 제기·배경·논지 예고
  paras: Para[]       // 본론 PEEL 문단들
  concSummary: string // 결론 — 요약·논지 재확인
  concEcho: string    // 결론 — 여운·확장·마무리 한마디
}

// PEEL 4요소 메타 — 입력 칸 라벨/힌트/약자에 공통 사용.
const PEEL: { key: keyof Pick<Para, 'point' | 'evidence' | 'explain' | 'link'>; tag: string; label: string; hint: string; ph: string }[] = [
  { key: 'point', tag: 'P', label: '주장 (Point)', hint: '이 문단이 말하려는 핵심 한 문장', ph: '예: 진짜 휴식은 아무것도 하지 않는 데서 온다.' },
  { key: 'evidence', tag: 'E', label: '근거 (Evidence)', hint: '주장을 받치는 사례·인용·경험·자료', ph: '예: 한 달간 주말마다 휴대폰을 끄고 멍하니 보낸 경험…' },
  { key: 'explain', tag: 'E', label: '설명 (Explain)', hint: '근거가 주장을 어떻게 뒷받침하는지 풀어 쓰기', ph: '예: 비움이 오히려 다음 한 주의 집중력을 회복시켰다…' },
  { key: 'link', tag: 'L', label: '연결 (Link)', hint: '주제로 되돌리거나 다음 문단으로 잇기', ph: '예: 그렇다면 우리는 무엇을 더 ‘하지 않을’ 수 있을까.' },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyPara(): Para {
  return { id: newId(), point: '', evidence: '', explain: '', link: '' }
}

function emptyEssay(): Essay {
  return { title: '', thesis: '', introHook: '', introProblem: '', paras: [emptyPara()], concSummary: '', concEcho: '' }
}

// 예시 에세이 — 빈 화면에서 시작을 돕는 샘플(눌러서 채우기).
function exampleEssay(): Essay {
  return {
    title: '아무것도 하지 않는 연습',
    thesis: '진짜 휴식은 더 채우는 것이 아니라 비우는 데서 온다.',
    introHook: '주말이 끝나면 더 피곤하다는 사람들이 있다. 나도 그랬다.',
    introProblem: '쉰다면서 영상·약속·계획으로 빈틈을 메우는 우리에게, 휴식이란 정말 무엇일까. 나는 ‘비움’이야말로 휴식의 본질이라고 믿게 되었다.',
    paras: [
      { id: newId(), point: '우리는 휴식마저 ‘생산적으로’ 하려 한다.', evidence: '자기계발 영상을 틀어두고 쉬고, 여행지에서도 일정표를 따라 움직인다.', explain: '이런 휴식은 또 다른 과업이 되어 몸은 쉬어도 마음은 쉬지 못한다.', link: '그래서 나는 일부러 ‘아무 계획 없는 시간’을 만들기로 했다.' },
      { id: newId(), point: '비움은 회복의 다른 이름이었다.', evidence: '한 달간 토요일 오후를 비워두고 창밖만 바라보았다.', explain: '처음엔 불안했지만, 곧 흩어졌던 생각이 가라앉고 다음 주의 집중력이 돌아왔다.', link: '쉼은 채움이 아니라 가라앉힘이었다.' },
    ],
    concSummary: '결국 휴식은 무언가를 더 하는 일이 아니라, 잠시 멈추어 비우는 일이다.',
    concEcho: '오늘 당신은 무엇을 ‘하지 않을’ 수 있을까. 그 빈칸이 당신을 쉬게 할 것이다.',
  }
}

// 손상/부분 데이터에서도 안전하게 복원.
function sanitize(p: unknown): Essay {
  const e = emptyEssay()
  if (!p || typeof p !== 'object') return e
  const o = p as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  e.title = s(o.title)
  e.thesis = s(o.thesis)
  e.introHook = s(o.introHook)
  e.introProblem = s(o.introProblem)
  e.concSummary = s(o.concSummary)
  e.concEcho = s(o.concEcho)
  if (Array.isArray(o.paras) && o.paras.length) {
    e.paras = o.paras
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const r = x as Record<string, unknown>
        return { id: typeof r.id === 'string' ? r.id : newId(), point: s(r.point), evidence: s(r.evidence), explain: s(r.explain), link: s(r.link) }
      })
    if (!e.paras.length) e.paras = [emptyPara()]
  }
  return e
}

function loadState(): Essay {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyEssay()
    return sanitize(JSON.parse(raw))
  } catch { return emptyEssay() }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 줄바꿈을 살린 단락 HTML(여러 문장을 한 흐름으로 이어붙임).
function joinPara(parts: string[]): string {
  const t = parts.map((x) => x.trim()).filter(Boolean).join(' ')
  return t
}

const countChars = (e: Essay): number => {
  let n = 0
  const add = (s: string) => { n += s.replace(/\s/g, '').length }
  add(e.thesis); add(e.introHook); add(e.introProblem); add(e.concSummary); add(e.concEcho)
  e.paras.forEach((p) => { add(p.point); add(p.evidence); add(p.explain); add(p.link) })
  return n
}

const isEmpty = (e: Essay): boolean =>
  !e.title && !e.thesis && !e.introHook && !e.introProblem && !e.concSummary && !e.concEcho &&
  e.paras.every((p) => !p.point && !p.evidence && !p.explain && !p.link)

export default function EssayStructure({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [essay, setEssay] = useState<Essay>(init.current)
  const [preview, setPreview] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 제목/논지가 전달되면(다른 도구에서 열림) 빈 상태일 때만 채운다.
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.title === 'string' ? payload.title : ''
    const th = typeof payload.thesis === 'string' ? payload.thesis : (typeof payload.statement === 'string' ? payload.statement : '')
    if ((t || th) && isEmpty(init.current)) {
      setEssay((p) => ({ ...p, title: t || p.title, thesis: th || p.thesis }))
    }
    // payload 는 마운트 시 1회만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(essay)) }
    catch { if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
  }, [essay])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const setField = (k: keyof Omit<Essay, 'paras'>, v: string) => setEssay((p) => ({ ...p, [k]: v }))

  const setParaField = (id: string, k: keyof Para, v: string) =>
    setEssay((p) => ({ ...p, paras: p.paras.map((x) => (x.id === id ? { ...x, [k]: v } : x)) }))

  const addPara = () =>
    setEssay((p) => ({ ...p, paras: [...p.paras, emptyPara()] }))

  const removePara = (id: string) =>
    setEssay((p) => {
      if (p.paras.length <= 1) return { ...p, paras: [emptyPara()] } // 항상 최소 1개 유지(비우기)
      return { ...p, paras: p.paras.filter((x) => x.id !== id) }
    })

  const movePara = (id: string, dir: -1 | 1) =>
    setEssay((p) => {
      const i = p.paras.findIndex((x) => x.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.paras.length) return p
      const next = p.paras.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...p, paras: next }
    })

  const resetAll = () => {
    setEssay(emptyEssay())
    setConfirmReset(false)
    flashNote('새 에세이로 비웠습니다.')
  }

  const fillExample = () => {
    setEssay(exampleEssay())
    flashNote('예시 에세이를 채웠습니다. 자유롭게 고쳐 쓰세요.')
  }

  // 전체를 한 편의 글(평문)로 조립 — 미리보기/복사용.
  const buildPlain = (): string => {
    const lines: string[] = []
    if (essay.title.trim()) lines.push(`# ${essay.title.trim()}`, '')
    if (essay.thesis.trim()) lines.push(`〔논지〕 ${essay.thesis.trim()}`, '')
    const intro = joinPara([essay.introHook, essay.introProblem])
    if (intro) { lines.push('[서론]', intro, '') }
    essay.paras.forEach((p, i) => {
      const body = joinPara([p.point, p.evidence, p.explain, p.link])
      if (body) { lines.push(`[본론 ${i + 1}]`, body, '') }
    })
    const conc = joinPara([essay.concSummary, essay.concEcho])
    if (conc) { lines.push('[결론]', conc, '') }
    return lines.join('\n').trim()
  }

  const copyPlain = () => {
    const text = buildPlain()
    if (!text) { flashNote('아직 내용이 없습니다. 칸을 채워 주세요.'); return }
    const done = () => {
      if (!mounted.current) return
      setCopied('copy')
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    }
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
    } catch { flashNote('복사에 실패했습니다. 미리보기에서 직접 선택해 복사하세요.') }
  }

  // 프로젝트 자료 〈에세이〉 폴더에 문서로 추가 — 서론/본론/결론 구조를 HTML 본문으로.
  const toProjectBodyHtml = (): string => {
    const parts: string[] = []
    const sec = (t: string) => `<p style="margin:14px 0 4px;font-weight:700;color:#555;">${escHtml(t)}</p>`
    if (essay.thesis.trim()) parts.push(`<p style="font-size:15px;"><b>논지:</b> ${escHtml(essay.thesis.trim())}</p>`)
    const intro = joinPara([essay.introHook, essay.introProblem])
    if (intro) { parts.push(sec('서론'), `<p style="line-height:1.8;">${escHtml(intro)}</p>`) }
    essay.paras.forEach((p, i) => {
      const body = joinPara([p.point, p.evidence, p.explain, p.link])
      if (body) { parts.push(sec(`본론 ${i + 1}`), `<p style="line-height:1.8;">${escHtml(body)}</p>`) }
    })
    const conc = joinPara([essay.concSummary, essay.concEcho])
    if (conc) { parts.push(sec('결론'), `<p style="line-height:1.8;">${escHtml(conc)}</p>`) }
    if (!parts.length) parts.push('<p>(아직 내용이 없습니다)</p>')
    return parts.join('')
  }

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (isEmpty(essay)) { flashNote('아직 내용이 없습니다. 칸을 채워 주세요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '에세이',
      title: essay.title.trim() ? `에세이 — ${essay.title.trim()}` : '에세이 구조',
      bodyHtml: toProjectBodyHtml(),
      synopsis: essay.thesis.trim() || undefined,
      meta: { 논지: essay.thesis.trim() || '—', 본론문단: String(essay.paras.length) },
    })
    flashNote(id ? '프로젝트 자료 〈에세이〉 폴더에 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const chars = countChars(essay)
  const filledParas = essay.paras.filter((p) => p.point || p.evidence || p.explain || p.link).length

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }
  const sectionHint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.55, fontFamily: 'inherit' }
  const badge: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.7 }
  const peelTag = (t: string): React.CSSProperties => ({
    flexShrink: 0, width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--accent)',
  })

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🪶"/></span>
        <strong style={{ fontSize: 15 }}>에세이 구조 빌더</strong>
        <span style={badge}>본론 {filledParas}/{essay.paras.length} 문단</span>
        <span style={badge}>{chars.toLocaleString()}자</span>
        <span style={{ flex: 1 }} />
        {copied === 'copy' && <span style={{ fontSize: 12, color: 'var(--ok)' }}>복사됨</span>}
        <button className="minibtn" onClick={() => setPreview((v) => !v)}>{preview ? <>편집으로</> : <><Emoji e="👁"/> 미리보기</>}</button>
        <button className="minibtn" onClick={fillExample} title="예시 에세이로 채우기">예시</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      {preview ? (
        <div style={body}>
          <div style={{ ...card, padding: 18 }}>
            {essay.title.trim() && <h3 style={{ fontSize: 18, margin: '0 0 6px', wordBreak: 'keep-all' }}>{essay.title.trim()}</h3>}
            {essay.thesis.trim() && <p style={{ fontSize: 12.5, color: 'var(--accent)', margin: '0 0 14px', fontStyle: 'italic' }}>논지 — {essay.thesis.trim()}</p>}
            {isEmpty(essay) ? (
              <div style={{ ...hint, textAlign: 'center', padding: '24px 10px' }}>
                아직 내용이 없습니다.<br />편집 화면에서 서론·본론·결론을 채워 보세요.
              </div>
            ) : (
              <PreviewBody essay={essay} />
            )}
          </div>
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addToProjectDoc} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 에세이를 프로젝트 자료 〈에세이〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="minibtn" onClick={copyPlain}>{copied === 'copy' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
          </div>
        </div>
      ) : (
        <div style={body}>
          {/* 글 기본 정보 */}
          <div style={card}>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>제목</label>
              <input style={input} value={essay.title} onChange={(e) => setField('title', e.target.value)} placeholder="예: 아무것도 하지 않는 연습" maxLength={120} />
            </div>
            <div>
              <label style={fieldLabel}>논지 — 이 글이 결국 말하려는 한 문장</label>
              <input style={input} value={essay.thesis} onChange={(e) => setField('thesis', e.target.value)} placeholder="예: 진짜 휴식은 채움이 아니라 비움에서 온다." maxLength={200} />
            </div>
          </div>

          {/* 서론 */}
          <div style={card}>
            <h4 style={sectionTitle}><Emoji e="📥"/> 서론 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11.5 }}>훅 · 문제 제기</span></h4>
            <p style={sectionHint}>첫 문장으로 독자를 끌어들이고(훅), 다룰 문제와 논지를 예고합니다.</p>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>훅 — 끌어들이는 첫 문장</label>
              <textarea style={area} value={essay.introHook} onChange={(e) => setField('introHook', e.target.value)} placeholder="질문·장면·고백·역설 등으로 시선을 붙잡으세요." maxLength={400} />
            </div>
            <div>
              <label style={fieldLabel}>문제 제기 — 배경·쟁점·논지 예고</label>
              <textarea style={area} value={essay.introProblem} onChange={(e) => setField('introProblem', e.target.value)} placeholder="왜 이 이야기를 꺼내는가, 무엇을 말하려 하는가." maxLength={600} />
            </div>
          </div>

          {/* 본론 — PEEL 문단들 */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="📚"/> 본론 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11.5 }}>PEEL 문단 · {essay.paras.length}개</span></h4>
              <button className="btn-primary" style={{ marginLeft: 'auto', padding: '5px 11px', fontSize: 12.5 }} onClick={addPara}>＋ 문단 추가</button>
            </div>
            <p style={sectionHint}>각 문단은 <b>P</b>oint(주장)·<b>E</b>vidence(근거)·<b>E</b>xplain(설명)·<b>L</b>ink(연결) 순으로 한 가지 논점을 다룹니다.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {essay.paras.map((p, i) => {
                const isBlank = !p.point && !p.evidence && !p.explain && !p.link
                return (
                  <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--chrome-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <strong style={{ fontSize: 13 }}>본론 문단 {i + 1}</strong>
                      {isBlank && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(비어 있음)</span>}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title="위로" onClick={() => movePara(p.id, -1)} disabled={i === 0}>▲</button>
                        <button style={iconBtn} title="아래로" onClick={() => movePara(p.id, 1)} disabled={i === essay.paras.length - 1}>▼</button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title={essay.paras.length <= 1 ? '문단 내용 비우기' : '문단 삭제'} onClick={() => removePara(p.id)}><Emoji e="🗑️"/></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {PEEL.map((f) => (
                        <div key={f.key} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                          <span style={peelTag(f.tag)} title={f.label}>{f.tag}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label style={{ ...fieldLabel, marginBottom: 3 }}>{f.label} <span style={{ fontWeight: 400 }}>— {f.hint}</span></label>
                            <textarea style={{ ...area, minHeight: 44 }} value={p[f.key]} onChange={(e) => setParaField(p.id, f.key, e.target.value)} placeholder={f.ph} maxLength={500} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 결론 */}
          <div style={card}>
            <h4 style={sectionTitle}><Emoji e="📤"/> 결론 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11.5 }}>요약 · 여운</span></h4>
            <p style={sectionHint}>본론을 요약해 논지를 다시 못 박고, 마지막에 생각의 여운을 남깁니다.</p>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>요약 — 논지 재확인</label>
              <textarea style={area} value={essay.concSummary} onChange={(e) => setField('concSummary', e.target.value)} placeholder="앞의 논점을 한데 모아 결국 무엇을 말했는지 정리하세요." maxLength={500} />
            </div>
            <div>
              <label style={fieldLabel}>여운 — 확장·물음·마무리 한마디</label>
              <textarea style={area} value={essay.concEcho} onChange={(e) => setField('concEcho', e.target.value)} placeholder="독자에게 남길 질문·이미지·다짐으로 글을 닫으세요." maxLength={500} />
            </div>
          </div>

          {/* 동작 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addToProjectDoc} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 에세이를 프로젝트 자료 〈에세이〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
            <button className="minibtn" onClick={copyPlain}>{copied === 'copy' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
            <span style={{ flex: 1 }} />
            {confirmReset ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--warn)' }}>모두 비울까요?</span>
                <button className="btn-primary" style={{ background: 'var(--warn)', padding: '5px 10px', fontSize: 12 }} onClick={resetAll}>비우기</button>
                <button className="minibtn" onClick={() => setConfirmReset(false)}>취소</button>
              </>
            ) : (
              <button className="minibtn" onClick={() => setConfirmReset(true)} disabled={isEmpty(essay)}>전체 비우기</button>
            )}
          </div>

          <div style={hint}>
            에세이는 <b>서론(끌어들이기·문제 제기) → 본론(PEEL로 논점 전개) → 결론(요약·여운)</b>의 흐름이 단단할수록 설득력이 생깁니다.
            입력 내용은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
          </div>
        </div>
      )}
    </div>
  )
}

// ── 미리보기 본문 ──
function PreviewBody({ essay }: { essay: Essay }) {
  const para: React.CSSProperties = { fontSize: 14, lineHeight: 1.85, margin: '0 0 14px', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, margin: '4px 0 6px' }
  const join = (parts: string[]) => parts.map((x) => x.trim()).filter(Boolean).join(' ')

  const intro = join([essay.introHook, essay.introProblem])
  const conc = join([essay.concSummary, essay.concEcho])

  return (
    <div>
      {intro && (<><div style={label}>서론</div><p style={para}>{intro}</p></>)}
      {essay.paras.map((p, i) => {
        const body = join([p.point, p.evidence, p.explain, p.link])
        if (!body) return null
        return (<div key={p.id}><div style={label}>본론 {i + 1}</div><p style={para}>{body}</p></div>)
      })}
      {conc && (<><div style={label}>결론</div><p style={para}>{conc}</p></>)}
    </div>
  )
}
