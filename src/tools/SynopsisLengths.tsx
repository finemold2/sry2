// 시놉시스 길이별 작성기 — 같은 이야기를 세 길이로 동시에 다듬어 용도별로 골라 쓰는 작가용 도구.
//   1줄(로그라인)  : 투고 메일 제목/한 줄 소개/엘리베이터 피치
//   1문단(개요)    : 출판사 투고 양식의 줄거리/플랫폼 작품 소개란
//   1페이지(상세)  : 시놉시스 심사·기획안용 전체 줄거리(결말 포함)
// 작품(엔트리)별로 세 길이를 함께 보관하고, 각 길이의 권장 글자수 가이드/실시간 글자수를 보여준다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·미디어·키 불필요. 전부 로컬.
// 영속: localStorage 'sry:tool:synopsis-lengths' 에 JSON 자동 저장/복원. 빈 상태 안내 제공.
// 연계: 선택한 작품의 세 길이를 프로젝트 자료 〈기획〉 폴더에 문서로 추가(addToProject).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'synopsis-lengths', name: '시놉시스 길이별 작성기', icon: '📐', group: '구상·정리', intro: '같은 이야기를 1줄·1문단·1페이지 세 길이로 작성·관리하세요', w: 640, h: 600 }

const LS_KEY = 'sry:tool:synopsis-lengths'

// ---------- 길이 정의 ----------
type LenKey = 'logline' | 'paragraph' | 'page'
interface LenDef {
  key: LenKey
  label: string       // 짧은 이름
  full: string        // 풀 이름
  icon: string
  use: string         // 용도 안내
  rows: number        // textarea 줄수
  min: number         // 권장 최소 글자수
  max: number         // 권장 최대 글자수
  placeholder: string
  tips: string[]      // 작성 팁
}

const LENS: LenDef[] = [
  {
    key: 'logline', label: '1줄', full: '로그라인 (한 줄)', icon: '🎯',
    use: '투고 메일 제목 · 한 줄 소개 · 엘리베이터 피치',
    rows: 2, min: 25, max: 90,
    placeholder: '예) 기억을 잃은 형사가 자신이 쫓던 살인범이 자신임을 알게 되는 이야기.',
    tips: [
      '주인공 + 목표 + 결정적 장애물을 한 문장에 압축한다.',
      '고유명사 대신 “누가/무엇을/왜”의 구조를 드러낸다.',
      '한 호흡에 읽히도록 25~40자를 노린다.',
    ],
  },
  {
    key: 'paragraph', label: '1문단', full: '한 문단 개요', icon: '📄',
    use: '출판사 투고 줄거리란 · 플랫폼 작품 소개',
    rows: 6, min: 150, max: 500,
    placeholder: '예) 도입의 상황과 주인공을 소개하고, 사건이 터지며, 중반의 갈등과 선택을 거쳐, 마지막 위기로 향하는 흐름을 3~5문장으로.',
    tips: [
      '도입(인물·세계) → 사건 발생 → 갈등 심화 → 위기, 순서로.',
      '결말은 흐리고 “어떻게 될 것인가”의 긴장을 남긴다(소개용).',
      '곁가지 인물·설정은 과감히 생략한다.',
    ],
  },
  {
    key: 'page', label: '1페이지', full: '한 페이지 상세 (결말 포함)', icon: '📚',
    use: '시놉시스 심사 · 공모전 제출 · 기획안 줄거리',
    rows: 14, min: 700, max: 2400,
    placeholder: '예) 1막(설정·계기), 2막(상승·중간점·위기), 3막(절정·결말)을 시간 순으로. 주요 반전과 결말까지 모두 밝힌다.',
    tips: [
      '심사용 시놉시스는 결말·반전을 반드시 포함한다(숨기지 않는다).',
      '현재형·3인칭으로, 사건을 시간 순서대로 서술한다.',
      '“그리고 어떻게 되었다”까지 — 전체 구조가 보이게.',
    ],
  },
]
const LEN_OF = (k: LenKey) => LENS.find((l) => l.key === k) as LenDef

// ---------- 데이터 모델 ----------
interface Entry {
  id: string
  title: string
  logline: string
  paragraph: string
  page: string
  createdAt: number
  updatedAt: number
}

function blankEntry(): Entry {
  const t = Date.now()
  return { id: newId(), title: '', logline: '', paragraph: '', page: '', createdAt: t, updatedAt: t }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---------- 글자수(공백 포함/제외) ----------
const countAll = (s: string) => Array.from(s || '').length
const countNoSpace = (s: string) => Array.from((s || '').replace(/\s/g, '')).length

interface LoadResult { entries: Entry[]; currentId: string | null }
function loadState(): LoadResult {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { entries: [], currentId: null }
    const p = JSON.parse(raw)
    const entries: Entry[] = Array.isArray(p?.entries)
      ? p.entries
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Partial<Entry>) => ({
            id: String(x.id || newId()),
            title: String(x.title || ''),
            logline: String(x.logline || ''),
            paragraph: String(x.paragraph || ''),
            page: String(x.page || ''),
            createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
            updatedAt: Number.isFinite(x.updatedAt) ? (x.updatedAt as number) : Date.now(),
          }))
      : []
    const ids = new Set(entries.map((e) => e.id))
    const currentId = typeof p?.currentId === 'string' && ids.has(p.currentId) ? p.currentId : (entries[0]?.id ?? null)
    return { entries, currentId }
  } catch {
    return { entries: [], currentId: null }
  }
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 길이별 상태(부족/적정/과다) — 가이드 색상.
function lenStatus(len: LenDef, text: string): { tone: 'empty' | 'low' | 'ok' | 'high'; color: string; msg: string } {
  const n = countAll(text)
  if (n === 0) return { tone: 'empty', color: 'var(--muted)', msg: `권장 ${len.min}~${len.max}자` }
  if (n < len.min) return { tone: 'low', color: 'var(--muted)', msg: `${len.min - n}자 더 (권장 ${len.min}~${len.max})` }
  if (n > len.max) return { tone: 'high', color: 'var(--warn)', msg: `${n - len.max}자 초과 (권장 ${len.min}~${len.max})` }
  return { tone: 'ok', color: 'var(--accent)', msg: `적정 (권장 ${len.min}~${len.max})` }
}

export default function SynopsisLengths({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [entries, setEntries] = useState<Entry[]>(init.current.entries)
  const [currentId, setCurrentId] = useState<string | null>(init.current.currentId)
  const [activeLen, setActiveLen] = useState<LenKey>('logline')
  const [showTips, setShowTips] = useState(false)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seeded = useRef(false)

  // 언마운트 정리
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // payload.title 로 새 작품을 만들어 시작(선택). 빈 상태일 때만.
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const t = typeof payload?.title === 'string' ? payload.title.trim() : ''
    if (t && entries.length === 0) {
      const e = { ...blankEntry(), title: t.slice(0, 80) }
      setEntries([e])
      setCurrentId(e.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ entries, currentId }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [entries, currentId])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const current = entries.find((e) => e.id === currentId) || null

  // ---------- CRUD ----------
  const addEntry = () => {
    const e = blankEntry()
    setEntries((p) => [e, ...p])
    setCurrentId(e.id)
    setActiveLen('logline')
    flashNote('새 작품을 추가했습니다. 제목과 세 길이를 채워보세요.')
  }

  const patchCurrent = (patch: Partial<Entry>) => {
    if (!currentId) return
    setEntries((p) => p.map((e) => (e.id === currentId ? { ...e, ...patch, updatedAt: Date.now() } : e)))
  }

  const removeEntry = (id: string) => {
    setEntries((p) => {
      const next = p.filter((e) => e.id !== id)
      if (currentId === id) setCurrentId(next[0]?.id ?? null)
      return next
    })
    setConfirmDel(null)
    flashNote('삭제했습니다.')
  }

  const duplicateEntry = (id: string) => {
    const src = entries.find((e) => e.id === id)
    if (!src) return
    const copy: Entry = { ...src, id: newId(), title: (src.title || '제목 없음') + ' (복사)', createdAt: Date.now(), updatedAt: Date.now() }
    setEntries((p) => {
      const i = p.findIndex((e) => e.id === id)
      const n = p.slice()
      n.splice(i < 0 ? 0 : i + 1, 0, copy)
      return n
    })
    setCurrentId(copy.id)
    flashNote('복제했습니다.')
  }

  // ---------- 복사 ----------
  const doCopy = (text: string, tag: string) => {
    const t = (text || '').trim()
    if (!t) { flashNote('복사할 내용이 비어 있습니다.'); return }
    const done = () => {
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    }
    try {
      if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(t).then(done).catch(() => flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.'))
      else flashNote('이 환경에서는 복사를 지원하지 않습니다. 직접 선택해 복사하세요.')
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  // 세 길이를 한 번에 텍스트로 복사
  const copyAll = () => {
    if (!current) return
    const blocks = LENS.map((l) => {
      const v = (current[l.key] as string).trim()
      return `## ${l.full}\n${v || '(미작성)'}`
    })
    doCopy(`# ${current.title || '제목 없음'}\n\n${blocks.join('\n\n')}`, 'all')
    flashNote('세 길이를 텍스트로 복사했습니다.')
  }

  // ---------- 프로젝트 연계 (자료 〈기획〉 폴더) ----------
  const toProject = () => {
    if (!current) return
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const block = (l: LenDef) => {
      const v = (current[l.key] as string).trim()
      const cnt = countAll(v)
      return [
        `<p style="margin:14px 0 4px;"><b>${esc(l.icon)} ${esc(l.full)}</b> <span style="color:#888;font-size:12px;">(${cnt}자 · 권장 ${l.min}~${l.max})</span></p>`,
        v
          ? `<p style="line-height:1.7;white-space:pre-wrap;">${esc(v).replace(/\n/g, '<br/>')}</p>`
          : `<p style="color:#999;">(미작성)</p>`,
      ].join('')
    }
    const bodyHtml = [
      `<p style="font-size:15px;"><b>📐 ${esc(current.title || '제목 없음')}</b> — 길이별 시놉시스</p>`,
      `<hr/>`,
      ...LENS.map(block),
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `📐 시놉시스 — ${esc((current.title || '제목 없음')).slice(0, 50)}`,
      bodyHtml,
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }
  const main: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }
  const side: React.CSSProperties = { width: 188, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const sideList: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const pane: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 6px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', borderRadius: 9,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  })
  const sideItem = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 9px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 3, position: 'relative',
  })
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 7 }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', minHeight: 60 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '26px 16px', border: '1px dashed var(--border)', borderRadius: 12 }

  // 작품 카드의 완성도 점(세 길이 채움 여부)
  const dots = (e: Entry) => LENS.map((l) => (((e[l.key] as string).trim()) ? '●' : '○')).join(' ')

  const len = LEN_OF(activeLen)
  const text = current ? (current[activeLen] as string) : ''
  const status = lenStatus(len, text)

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="📐" /> 시놉시스 길이별 작성기</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>같은 이야기 · 1줄 / 1문단 / 1페이지</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn-primary" onClick={addEntry}>＋ 새 작품</button>
        </div>
      </div>

      {note && (
        <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', padding: '7px 16px', flexShrink: 0 }}>{note}</div>
      )}

      <div style={main}>
        {/* 좌측: 작품 목록(CRUD) */}
        <div style={side}>
          <div style={{ padding: '9px 10px 4px', fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>작품 {entries.length}</span>
            <span title="각 점은 1줄·1문단·1페이지 작성 여부">● 작성됨</span>
          </div>
          <div style={sideList}>
            {entries.length === 0 ? (
              <div style={{ ...hint, padding: '12px 6px', textAlign: 'center' }}>
                아직 작품이 없습니다.<br />상단 <b>＋ 새 작품</b>으로 시작하세요.
              </div>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  style={sideItem(e.id === currentId)}
                  onClick={() => setCurrentId(e.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setCurrentId(e.id) } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <b style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: e.title ? 'var(--text)' : 'var(--muted)' }}>
                      {e.title || '제목 없음'}
                    </b>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>{dots(e)}</div>
                  {e.id === currentId && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      <button style={iconBtn} title="복제" onClick={(ev) => { ev.stopPropagation(); duplicateEntry(e.id) }}>⧉</button>
                      {confirmDel === e.id ? (
                        <>
                          <button style={{ ...iconBtn, color: 'var(--warn)', borderColor: 'var(--warn)' }} title="삭제 확정" onClick={(ev) => { ev.stopPropagation(); removeEntry(e.id) }}>삭제?</button>
                          <button style={iconBtn} title="취소" onClick={(ev) => { ev.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </>
                      ) : (
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={(ev) => { ev.stopPropagation(); setConfirmDel(e.id) }}><Emoji e="🗑️" /></button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 편집 영역 */}
        <div style={pane}>
          {!current ? (
            <div style={empty}>
              <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji e="📐" /></div>
              <b>같은 이야기를 세 길이로</b><br />
              <b>1줄(로그라인)</b> · <b>1문단(개요)</b> · <b>1페이지(상세)</b> 로 나눠 적어두면<br />
              투고·소개·심사 등 상황마다 알맞은 길이를 바로 꺼내 쓸 수 있습니다.<br /><br />
              <button className="btn-primary" onClick={addEntry}>＋ 첫 작품 만들기</button>
            </div>
          ) : (
            <>
              {/* 제목 */}
              <div>
                <input
                  style={{ ...input, fontSize: 15, fontWeight: 600 }}
                  value={current.title}
                  onChange={(e) => patchCurrent({ title: e.target.value })}
                  placeholder="작품 제목 (예: 장편 《기억상실 형사》)"
                  maxLength={80}
                />
              </div>

              {/* 길이 탭 */}
              <div style={{ display: 'flex', gap: 8 }}>
                {LENS.map((l) => {
                  const filled = (current[l.key] as string).trim()
                  return (
                    <button key={l.key} style={tab(activeLen === l.key)} onClick={() => setActiveLen(l.key)}>
                      <span><Emoji e={l.icon} /> {l.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>{filled ? `${countAll(filled)}자` : '미작성'}</span>
                    </button>
                  )
                })}
              </div>

              {/* 현재 길이 편집 카드 */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 13 }}><Emoji e={len.icon} /> {len.full}</b>
                  <button className="linkbtn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setShowTips((v) => !v)}>{showTips ? '팁 닫기' : <><Emoji e="💡" /> 작성 팁</>}</button>
                  <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => doCopy(text, 'len-' + len.key)} disabled={!text.trim()}>
                    {copied === 'len-' + len.key ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>용도: {len.use}</div>

                {showTips && (
                  <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                    {len.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                )}

                <textarea
                  style={{ ...ta, minHeight: len.rows * 24 }}
                  rows={len.rows}
                  value={text}
                  onChange={(e) => patchCurrent({ [len.key]: e.target.value } as Partial<Entry>)}
                  placeholder={len.placeholder}
                />

                {/* 글자수 / 가이드 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap', fontSize: 11.5 }}>
                  <span style={{ color: status.color, fontWeight: 600 }}>
                    {countAll(text)}자
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (공백 제외 {countNoSpace(text)}자)</span>
                  </span>
                  <span style={{ marginLeft: 'auto', color: status.color }}>{status.msg}</span>
                </div>
                {/* 길이 게이지 */}
                <div style={{ marginTop: 6, height: 5, borderRadius: 3, background: 'var(--chrome-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: Math.min(100, Math.round((countAll(text) / len.max) * 100)) + '%',
                    background: status.tone === 'high' ? 'var(--warn)' : status.tone === 'ok' ? 'var(--accent)' : 'var(--accent-2)',
                    opacity: status.tone === 'empty' ? 0.25 : 0.9,
                    transition: 'width .25s',
                  }} />
                </div>
              </div>

              {/* 세 길이 한눈에 미리보기 */}
              <div style={card}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>세 길이 한눈에</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {LENS.map((l) => {
                    const v = (current[l.key] as string).trim()
                    const st = lenStatus(l, v)
                    return (
                      <div key={l.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <button
                          onClick={() => setActiveLen(l.key)}
                          style={{ ...iconBtn, flexShrink: 0, fontWeight: 600, color: activeLen === l.key ? 'var(--accent)' : 'var(--muted)', borderColor: activeLen === l.key ? 'var(--accent)' : 'var(--border)' }}
                          title="이 길이 편집"
                        >
                          <Emoji e={l.icon} /> {l.label}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.65, color: v ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', maxHeight: l.key === 'page' ? 92 : undefined, overflow: l.key === 'page' ? 'hidden' : undefined }}>
                            {v || `(${l.full} 미작성)`}
                          </div>
                          <div style={{ fontSize: 10.5, color: st.color, marginTop: 2 }}>{v ? `${countAll(v)}자 · ${st.msg}` : st.msg}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 액션 / 연계 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="minibtn" onClick={copyAll}>{copied === 'all' ? '✓ 복사됨' : '⬇ 세 길이 전체 복사'}</button>
                <button
                  className="linkbtn"
                  style={{ marginLeft: 'auto' }}
                  onClick={toProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '세 길이를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄" /> 프로젝트에 추가
                </button>
              </div>

              <div style={hint}>
                같은 이야기를 길이별로 따로 다듬어 두세요. <b>1줄</b>은 한 호흡에 호기심을, <b>1문단</b>은 결말을 살짝 감추고 흐름을,
                <b> 1페이지</b>는 반전·결말까지 모두 밝혀 전체 구조를 보여줍니다. 모든 내용은 이 브라우저에 자동 저장됩니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
