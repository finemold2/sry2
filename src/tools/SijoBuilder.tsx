// 시조 빌더 — 한국 정형시(평시조) 작성 도구.
//   초장·중장·종장 3장을 각 4구(句)로 나누어 입력하고, 구마다 음절 수를 실시간으로 센다.
//   평시조 표준 율격(3·4·3(4)·4 / 3·4·3(4)·4 / 3·5·4·3)에 맞는지 한눈에 보여 주고,
//   종장 첫 구는 반드시 3음절이라는 핵심 규칙을 강조 안내한다.
// 자급식: react 외 import 없음, 외부 네트워크 없음(전부 로컬). 모든 데이터는 localStorage 에 JSON 으로 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'sijo-builder', name: '시조 빌더', icon: '🎴', group: '구상·정리', intro: '초장·중장·종장 음절을 세어 평시조 율격에 맞게 시조를 짓습니다', w: 600, h: 600 }

const LS_KEY = 'sry:tool:sijo-builder'

// 한 장(章)은 4개의 구(句)로 나뉜다.
type Gu = [string, string, string, string]
interface Sijo {
  cho: Gu   // 초장
  jung: Gu  // 중장
  jong: Gu  // 종장
  title: string
}

interface Saved extends Sijo {
  id: string
  createdAt: number
}

const emptyGu = (): Gu => ['', '', '', '']
const emptySijo = (): Sijo => ({ cho: emptyGu(), jung: emptyGu(), jong: emptyGu(), title: '' })

// 평시조 표준 음절 수. 종장 첫 구는 3음절 고정, 둘째 구는 5음절(과음보)이 특징.
// 일부 구는 3 또는 4 모두 허용되므로 허용치 배열로 표현.
type LineKey = 'cho' | 'jung' | 'jong'
interface GuSpec { ideal: number; allow: number[]; note?: string }
const SPECS: Record<LineKey, { label: string; gus: GuSpec[] }> = {
  cho: {
    label: '초장',
    gus: [
      { ideal: 3, allow: [3, 4] },
      { ideal: 4, allow: [4, 5] },
      { ideal: 3, allow: [3, 4] },
      { ideal: 4, allow: [4] },
    ],
  },
  jung: {
    label: '중장',
    gus: [
      { ideal: 3, allow: [3, 4] },
      { ideal: 4, allow: [4, 5] },
      { ideal: 3, allow: [3, 4] },
      { ideal: 4, allow: [4] },
    ],
  },
  jong: {
    label: '종장',
    gus: [
      { ideal: 3, allow: [3], note: '반드시 3음절 (시조의 핵심 규칙)' },
      { ideal: 5, allow: [5, 6, 7], note: '5음절 이상으로 늘여 변화를 준다' },
      { ideal: 4, allow: [4, 3] },
      { ideal: 3, allow: [3, 4] },
    ],
  },
}
const LINE_ORDER: LineKey[] = ['cho', 'jung', 'jong']

// 한글 음절(완성형/조합형) 1자, 그 외 비공백 문자도 1자로 센다. 공백·문장부호 일부는 제외.
function countSyllables(s: string): number {
  if (!s) return 0
  // 조합형 자모 결합을 위해 정규화 후, 공백 및 일반 문장부호를 제거하고 길이를 센다.
  let t = s.normalize('NFC')
  // 공백 제거
  t = t.replace(/\s+/g, '')
  // 음절 수에 포함하지 않을 문장부호 제거(읽을 때 음절을 차지하지 않는 기호)
  t = t.replace(/[.,!?;:'"·…“”‘’()\[\]{}\-—~]/g, '')
  // 남은 문자를 코드포인트 단위로 센다(서러게이트 안전).
  return Array.from(t).length
}

function loadState(): { cur: Sijo; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: emptySijo(), saved: [] }
    const p = JSON.parse(raw)
    const fixGu = (a: unknown): Gu => {
      const arr = Array.isArray(a) ? a : []
      return [0, 1, 2, 3].map((i) => (typeof arr[i] === 'string' ? arr[i] : '')) as Gu
    }
    const cur: Sijo = {
      cho: fixGu(p?.cur?.cho),
      jung: fixGu(p?.cur?.jung),
      jong: fixGu(p?.cur?.jong),
      title: typeof p?.cur?.title === 'string' ? p.cur.title : '',
    }
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Record<string, unknown>) => ({
            id: String(x.id || Date.now() + '_' + Math.random()),
            title: typeof x.title === 'string' ? x.title : '',
            cho: fixGu(x.cho),
            jung: fixGu(x.jung),
            jong: fixGu(x.jong),
            createdAt: Number.isFinite(x.createdAt as number) ? (x.createdAt as number) : Date.now(),
          }))
      : []
    return { cur, saved }
  } catch {
    return { cur: emptySijo(), saved: [] }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 한 장을 한 줄 텍스트로 합친다(빈 구는 건너뜀, 구 사이 공백 한 칸).
function lineText(g: Gu): string {
  return g.map((s) => s.trim()).filter(Boolean).join(' ')
}
function lineSyllables(g: Gu): number {
  return g.reduce((n, s) => n + countSyllables(s), 0)
}

// 한 시조 전체 텍스트(3줄).
function sijoText(s: Sijo): string {
  return [lineText(s.cho), lineText(s.jung), lineText(s.jong)].filter(Boolean).join('\n')
}

const EXAMPLE: Sijo = {
  title: '동지(冬至)ㅅ달 — 황진이',
  cho: ['동지ㅅ달', '기나긴 밤을', '한 허리를', '버혀 내여'],
  jung: ['춘풍', '니불 아레', '서리서리', '너헛다가'],
  jong: ['어론님', '오신 날 밤이여든', '구뷔구뷔', '펴리라'],
}

export default function SijoBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Sijo>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showGuide, setShowGuide] = useState(false)
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

  // payload 로 초기 소재/제목이 넘어오면 제목칸에 채운다(연계 진입 대비).
  useEffect(() => {
    if (payload && typeof payload.title === 'string' && payload.title.trim() && !init.current.cur.title) {
      setCur((p) => ({ ...p, title: String(payload.title).slice(0, 60) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.', true)
    }
  }, [cur, saved])

  const flashNote = (msg: string, _warn = false) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const setGu = (line: LineKey, idx: number, v: string) => {
    setCur((p) => {
      const g = p[line].slice() as Gu
      g[idx] = v
      return { ...p, [line]: g }
    })
  }

  const copy = async (text: string, tag: string) => {
    if (!text.trim()) { flashNote('복사할 내용이 없습니다.'); return }
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

  const applyExample = () => {
    setCur({ ...EXAMPLE, cho: EXAMPLE.cho.slice() as Gu, jung: EXAMPLE.jung.slice() as Gu, jong: EXAMPLE.jong.slice() as Gu })
    setEditId(null)
    flashNote('황진이의 시조를 예시로 채웠습니다. 음절 카운트를 살펴보세요.')
  }

  const clearForm = () => {
    setCur(emptySijo())
    setEditId(null)
  }

  const hasInput = LINE_ORDER.some((k) => cur[k].some((s) => s.trim())) || !!cur.title.trim()

  const fullText = sijoText(cur)
  const totalSyll = LINE_ORDER.reduce((n, k) => n + lineSyllables(cur[k]), 0)

  // 종장 첫 구 3음절 충족 여부(시조의 가장 중요한 규칙).
  const jongFirst = countSyllables(cur.jong[0])
  const jongFirstOk = jongFirst === 3

  const saveCurrent = () => {
    if (!fullText.trim()) { flashNote('빈 시조는 저장할 수 없습니다. 한 구라도 채워 보세요.'); return }
    const rec: Saved = {
      id: editId || newId(),
      title: cur.title.trim(),
      cho: cur.cho.slice() as Gu, jung: cur.jung.slice() as Gu, jong: cur.jong.slice() as Gu,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('시조를 저장했습니다.')
    }
    setEditId(null)
  }

  const loadSaved = (s: Saved) => {
    setCur({ title: s.title, cho: s.cho.slice() as Gu, jung: s.jung.slice() as Gu, jong: s.jong.slice() as Gu })
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) setEditId(null)
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
      const head = `[${i + 1}] ${s.title || '(제목 없음)'}`
      return head + '\n' + sijoText(s)
    })
    copy(`# 시조 모음 (${saved.length}수)\n\n${blocks.join('\n\n')}`, 'export')
    flashNote('저장한 시조를 텍스트로 복사했습니다.')
  }

  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.', true); return }
    if (!fullText.trim()) { flashNote('빈 시조는 추가할 수 없습니다.'); return }
    const lineHtml = LINE_ORDER.map((k) => {
      const t = lineText(cur[k])
      if (!t) return ''
      return `<p style="margin:0 0 4px;line-height:1.8;">${escapeHtml(t)}</p>`
    }).filter(Boolean).join('')
    const bodyHtml = [
      `<div style="font-size:15px;">${lineHtml}</div>`,
      `<hr/>`,
      `<p style="font-size:12px;color:#888;">평시조 · 총 ${totalSyll}음절 · 종장 첫 구 ${jongFirst}음절${jongFirstOk ? '(규칙 충족)' : '(3음절 권장)'}</p>`,
    ].join('')
    const title = cur.title.trim() || (lineText(cur.cho).slice(0, 20) || '시조')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '시',
      title,
      bodyHtml,
      synopsis: fullText.replace(/\n/g, ' / ').slice(0, 120),
    })
    flashNote(id ? '프로젝트 원고 〈시〉 폴더에 시조를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.', !id)
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const stmtBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '16px 18px', fontSize: 16, lineHeight: 2, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', textAlign: 'center' }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  // 음절 카운트 칩 색상: 이상치=강조, 허용치=정상, 그 외=경고.
  const countBadge = (n: number, spec: GuSpec): React.CSSProperties => {
    const ideal = n === spec.ideal
    const ok = spec.allow.includes(n)
    const empty0 = n === 0
    let bg = 'var(--chrome-2)', fg = 'var(--muted)', bd = 'var(--border)'
    if (empty0) { bg = 'var(--chrome-2)'; fg = 'var(--muted)'; bd = 'var(--border)' }
    else if (ideal) { bg = 'var(--accent)'; fg = '#fff'; bd = 'var(--accent)' }
    else if (ok) { bg = 'rgba(0,0,0,0.04)'; fg = 'var(--text)'; bd = 'var(--border)' }
    else { bg = 'transparent'; fg = 'var(--warn)'; bd = 'var(--warn)' }
    return {
      fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 7px', minWidth: 16, textAlign: 'center',
      background: bg, color: fg, border: '1px solid ' + bd, whiteSpace: 'nowrap',
    }
  }

  const renderLine = (line: LineKey) => {
    const spec = SPECS[line]
    const g = cur[line]
    const counts = g.map((s) => countSyllables(s))
    const sum = counts.reduce((a, b) => a + b, 0)
    const idealSum = spec.gus.reduce((a, b) => a + b.ideal, 0)
    return (
      <div key={line} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <b style={{ fontSize: 13 }}>{spec.label}</b>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            표준 {spec.gus.map((s) => s.ideal).join('·')} (총 {idealSum}음절)
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: sum ? 'var(--text)' : 'var(--muted)' }}>
            현재 총 {sum}음절
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {g.map((val, i) => {
            const sp = spec.gus[i]
            const isJongFirst = line === 'jong' && i === 0
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{i + 1}구</span>
                  <span style={countBadge(counts[i], sp)} title={`현재 ${counts[i]}음절 / 표준 ${sp.ideal}음절`}>{counts[i]}</span>
                  {isJongFirst && (
                    <span style={{ fontSize: 9.5, color: jongFirstOk ? 'var(--muted)' : 'var(--warn)', fontWeight: 700 }}>
                      {jongFirstOk ? '✓3' : '3!'}
                    </span>
                  )}
                </div>
                <input
                  style={{
                    ...input, padding: '7px 8px', fontSize: 13.5,
                    border: '1px solid ' + (isJongFirst && val && !jongFirstOk ? 'var(--warn)' : 'var(--border)'),
                  }}
                  value={val}
                  onChange={(e) => setGu(line, i, e.target.value)}
                  placeholder={sp.note ? `${sp.ideal}음절` : `${sp.ideal}음절`}
                  maxLength={24}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎴" /> 시조 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>평시조 3장 · 음절 실시간 카운트</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowGuide((v) => !v)}>{showGuide ? '율격 닫기' : <><Emoji e="📖" /> 율격 안내</>}</button>
          <button className="minibtn" onClick={applyExample}>예시 채우기</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showGuide && (
          <div style={card}>
            <h4 style={sectionTitle}>평시조 율격 안내</h4>
            <div style={{ fontSize: 12.5, lineHeight: 1.8, color: 'var(--text)' }}>
              <p style={{ margin: '0 0 8px' }}>시조는 <b>초장·중장·종장</b> 3장으로 이루어지며, 각 장은 4개의 <b>구(句)</b>로 나뉩니다.</p>
              <p style={{ margin: '0 0 8px' }}>표준 음절 수(3·4 글자 기본):</p>
              <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                <li>초장 — 3 · 4 · 3(4) · 4</li>
                <li>중장 — 3 · 4 · 3(4) · 4</li>
                <li>종장 — <b style={{ color: 'var(--warn)' }}>3</b> · 5(이상) · 4 · 3</li>
              </ul>
              <p style={{ margin: 0, color: 'var(--warn)', fontWeight: 700 }}>핵심 규칙 — 종장 첫 구는 반드시 3음절입니다. 둘째 구는 5음절 이상으로 늘여 긴장과 변화를 줍니다. 이 두 가지가 시조의 멋을 결정합니다.</p>
            </div>
          </div>
        )}

        {/* 제목 */}
        <div style={card}>
          <label style={fieldLabel}>제목 (선택)</label>
          <input style={input} value={cur.title} onChange={(e) => setCur((p) => ({ ...p, title: e.target.value }))} placeholder="예: 봄밤" maxLength={60} />
        </div>

        {/* 3장 입력 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '3장 입력'}</h4>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>각 구를 채우면 음절 수가 칸 위에 표시됩니다</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
          {LINE_ORDER.map(renderLine)}
          {!jongFirstOk && cur.jong[0].trim() !== '' && (
            <div style={{ ...hint, color: 'var(--warn)', marginTop: 4 }}>
              종장 첫 구가 {jongFirst}음절입니다 — 시조 규칙상 <b>3음절</b>이어야 합니다.
            </div>
          )}
        </div>

        {/* 완성 미리보기 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>완성 시조 · 총 {totalSyll}음절</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(fullText, 'main')} disabled={!fullText.trim()}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          {fullText.trim() ? (
            <div style={stmtBox}>{fullText}</div>
          ) : (
            <div style={empty}>
              아직 입력한 구가 없습니다.<br />
              위 3장에 구를 채우면 완성된 시조가 여기에 나타납니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b>예시 채우기</b>로 시작해 보세요.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveCurrent} disabled={!fullText.trim()}>{editId ? '수정 저장' : <><Emoji e="💾" /> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => setEditId(null)}>새 항목으로</button>}
          </div>

          {/* 연계: 완성 시조를 원고 〈시〉 폴더에 문서로 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addToProjectDoc}
              disabled={!hasProjectBridge() || !fullText.trim()}
              title={hasProjectBridge() ? '완성 시조를 프로젝트 원고 〈시〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 (CRUD) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 시조 · {saved.length}수</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={exportAll} disabled={!saved.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 시조가 없습니다.<br />
              완성한 시조를 <b>저장</b>하면 여기에 모입니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => {
                const text = sijoText(s)
                return (
                  <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                        <button style={iconBtn} title="위로" onClick={() => move(s.id, -1)} disabled={i === 0}>▲</button>
                        <button style={iconBtn} title="아래로" onClick={() => move(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                        <button style={iconBtn} title="이 시조 복사" onClick={() => copy(text, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                        <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, wordBreak: 'keep-all', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{text}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={hint}>
          시조는 우리말 정형시로, 3장 6구 45자 안팎의 절제된 형식 안에 정서를 담습니다.
          음절 칩이 파란색이면 표준 음절, 빨간 테두리면 규칙에서 벗어난 것입니다. 입력·저장 목록은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
