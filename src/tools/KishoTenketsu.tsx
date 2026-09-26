// 기승전결 빌더 — 동양 4단 서사 구조(起承轉結): 기(도입)·승(전개)·전(전환/반전)·결(결말).
// 4컷 만화·콩트·단편·웹소설 한 회차처럼 "갈등 없이도 성립하는" 짧은 이야기 설계에 특화.
// 각 단계마다 설명/작성 팁과 입력칸, 전체 진행률(채워진 단계 비율)을 제공.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:kishotenketsu' 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'kishotenketsu', name: '기승전결', icon: '🀄', group: '구상·정리', intro: '기·승·전·결 4단으로 짧은 이야기를 설계하세요 (4컷·콩트·단편)', w: 600, h: 600 }

const LS_KEY = 'sry:tool:kishotenketsu'

// ── 4단 정의 ───────────────────────────────────────────────
type StepKey = 'ki' | 'sho' | 'ten' | 'ketsu'
interface StepDef {
  key: StepKey
  label: string      // 한자/한국어 라벨
  hanja: string      // 起承轉結
  sub: string        // 한 줄 역할
  color: string
  tip: string        // 작성 팁
  ph: string         // 입력 placeholder 예시
}
const STEPS: StepDef[] = [
  {
    key: 'ki', label: '기', hanja: '起', sub: '도입', color: '#5b8def',
    tip: '인물·시간·장소를 자연스럽게 소개하고 이야기의 출발점을 세웁니다. 큰 사건을 터뜨리기보다 "지금 이런 상황"임을 보여 주세요.',
    ph: '예) 도서관에서 매일 같은 자리에 앉는 학생이 있다.',
  },
  {
    key: 'sho', label: '승', hanja: '承', sub: '전개', color: '#3fb27f',
    tip: '도입에서 세운 상황을 이어받아 한 걸음 더 진전시킵니다. 일상이 쌓이거나 작은 변화·궁금증이 생기며 이야기가 굴러갑니다.',
    ph: '예) 그 자리 책상에 매번 쪽지가 놓여 있는 걸 발견한다.',
  },
  {
    key: 'ten', label: '전', hanja: '轉', sub: '전환·반전', color: '#e0533d',
    tip: '기승전결의 심장. 흐름을 "꺾으세요". 예상 밖의 사실·시점 전환·반전으로 독자의 기대를 비틀면 결말의 맛이 살아납니다.',
    ph: '예) 알고 보니 쪽지를 둔 건 1년 전 졸업한 자신이었다.',
  },
  {
    key: 'ketsu', label: '결', hanja: '結', sub: '결말', color: '#8b6fc4',
    tip: '전환이 만든 의미를 매듭짓습니다. 모든 걸 설명하기보다, 앞의 "전"이 남긴 여운을 한 번 더 울려 주며 닫으세요.',
    ph: '예) 학생은 미소 지으며 새 쪽지를 책상에 남긴다.',
  },
]
const STEP_MAP: Record<StepKey, StepDef> = STEPS.reduce((m, s) => { m[s.key] = s; return m }, {} as Record<StepKey, StepDef>)

type Fields = Record<StepKey, string>
interface SaveShape { title: string; fields: Fields }

const emptyFields = (): Fields => ({ ki: '', sho: '', ten: '', ketsu: '' })

function load(): SaveShape {
  const empty: SaveShape = { title: '', fields: emptyFields() }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return empty
    const f = emptyFields()
    const src = (p.fields && typeof p.fields === 'object') ? p.fields : {}
    for (const s of STEPS) if (typeof src[s.key] === 'string') f[s.key] = src[s.key]
    return { title: typeof p.title === 'string' ? p.title : '', fields: f }
  } catch { return empty }
}

export default function KishoTenketsu({ payload }: { payload?: Record<string, unknown> }) {
  // payload 로 단계별 초기 텍스트나 제목을 받을 수 있음(연계용) — 없으면 저장본 복원
  const seed = (): SaveShape => {
    const base = load()
    if (payload && typeof payload === 'object') {
      if (typeof payload.title === 'string' && !base.title) base.title = payload.title
      for (const s of STEPS) {
        const v = payload[s.key]
        if (typeof v === 'string' && !base.fields[s.key]) base.fields[s.key] = v
      }
    }
    return base
  }
  const init = useRef<SaveShape>(seed())
  const [title, setTitle] = useState<string>(init.current.title)
  const [fields, setFields] = useState<Fields>(init.current.fields)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, fields } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, fields])

  const setField = (k: StepKey, v: string) => setFields((prev) => ({ ...prev, [k]: v }))

  // ── 진행률(채워진 단계 수 / 4) ─────────────────────────────
  const filledCount = STEPS.filter((s) => fields[s.key].trim().length > 0).length
  const progress = Math.round((filledCount / STEPS.length) * 100)
  const allEmpty = filledCount === 0

  const clearAll = () => {
    if (allEmpty && !title.trim()) return
    setFields(emptyFields()); setTitle('')
  }

  // ── 텍스트 빌드/복사 ───────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(title.trim() ? `[기승전결] ${title.trim()}` : '[기승전결]')
    lines.push('')
    for (const s of STEPS) {
      const v = fields[s.key].trim()
      lines.push(`${s.hanja} ${s.label} · ${s.sub}`)
      lines.push(v ? v : '(비어 있음)')
      lines.push('')
    }
    lines.push(`완성도 ${filledCount}/${STEPS.length} (${progress}%)`)
    return lines.join('\n')
  }
  const copy = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      if (mounted.current) { setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1500) }
    } catch { if (mounted.current) setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  // ── 프로젝트(바인더)로 추가 ────────────────────────────────
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (title.trim()) parts.push(`<p><em>${esc(title.trim())}</em></p>`)
    for (const s of STEPS) {
      parts.push(`<h2>${esc(s.hanja)} ${esc(s.label)} · ${esc(s.sub)}</h2>`)
      const v = fields[s.key].trim()
      parts.push(v ? `<p>${esc(v)}</p>` : '<p>(비어 있음)</p>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { if (mounted.current) setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `기승전결 — ${title.trim()}` : '기승전결',
      bodyHtml: buildBodyHtml(),
      meta: { 완성도: `${filledCount}/${STEPS.length}`, 진행률: `${progress}%` },
    })
    if (mounted.current) {
      setSaved(id ? '✓ 프로젝트 자료(구조)에 기승전결 문서 추가됨' : '프로젝트에 연결되지 않았습니다')
      setTimeout(() => { if (mounted.current) setSaved('') }, 1800)
    }
  }

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 14, fontWeight: 600, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const ta: React.CSSProperties = { width: '100%', minHeight: 76, resize: 'vertical', padding: '9px 11px', fontSize: 14, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      {/* 제목 + 동작 */}
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="🀄"/></span>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품/이야기 제목 (선택)" maxLength={80} aria-label="이야기 제목" />
        <button className="minibtn" onClick={copy} title="기승전결 전체를 텍스트로 복사">{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 14px 0' }}>{note}</div>}

      <div style={body}>
        {/* 진행률 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>완성도</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{filledCount}/{STEPS.length} 단계 · {progress}%</span>
            {progress === 100 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)' }}>✓ 4단 완성!</span>}
          </div>
          <div style={{ height: 8, borderRadius: 6, background: 'var(--chrome-2)', overflow: 'hidden', display: 'flex' }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="기승전결 완성도">
            {STEPS.map((s) => (
              <div key={s.key} style={{ flex: 1, background: fields[s.key].trim() ? s.color : 'transparent', borderRight: s.key !== 'ketsu' ? '2px solid var(--panel)' : 'none', transition: 'background .2s' }} title={`${s.label} · ${s.sub}`} />
            ))}
          </div>
        </div>

        {/* 4단 카드 */}
        {STEPS.map((s, i) => {
          const v = fields[s.key]
          const done = v.trim().length > 0
          return (
            <div key={s.key} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, borderTop: `3px solid ${s.color}`, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }} aria-hidden>{s.hanja}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <strong style={{ fontSize: 15, lineHeight: 1.2 }}>{i + 1}. {s.label} <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12 }}>{s.sub}</span></strong>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: done ? s.color : 'var(--muted)' }}>{done ? '✓' : '○'}</span>
              </div>
              <div style={{ ...hint, marginBottom: 8 }}><Emoji e="💡"/> {s.tip}</div>
              <textarea
                style={ta}
                value={v}
                onChange={(e) => setField(s.key, e.target.value)}
                placeholder={s.ph}
                maxLength={2000}
                aria-label={`${s.label}(${s.sub}) 입력`}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.length}/2000</div>
            </div>
          )
        })}

        {/* 하단 동작 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>채워진 단계 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong>/{STEPS.length}</span>
          <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
          <button className="minibtn" onClick={clearAll} disabled={allEmpty && !title.trim()} title="제목과 4단을 모두 비웁니다">전체 비우기</button>
        </div>

        {/* 프로젝트 연동 */}
        <div className="linkbar">
          <span className="linkbar-label">연동:</span>
          <button
            className="linkbtn"
            onClick={toProject}
            disabled={!hasProjectBridge() || allEmpty}
            title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (allEmpty ? '먼저 한 단계 이상 작성하세요' : '기승전결 4단을 프로젝트 자료(구조 폴더)에 문서로 추가')}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>
        {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>{saved}</div>}

        <div style={hint}>
          기승전결은 갈등의 고조가 아니라 "전(轉)"의 전환으로 의미를 만드는 동양 4단 구조입니다. 4컷 만화·콩트·단편·웹소설 한 회차에 잘 맞아요. 내용은 이 브라우저에 자동 저장됩니다.
        </div>
        <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
          구조 개념은 동양 고전 서사 이론(공유 지식). 본 도구는 입력 도우미일 뿐 외부 저작물을 포함하지 않습니다.
        </div>
      </div>
    </div>
  )
}
