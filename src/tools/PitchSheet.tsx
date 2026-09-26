// 피치 시트 — 작품 피치 한 장(피치덱). 로그라인+후킹+장르/분량+타깃 독자+비교작+주제를
//   한 화면 카드로 정리해, 출판·투고·시리즈 소개에 그대로 쓸 수 있게 한다.
//  · 여러 작품의 피치를 CRUD 로 관리(localStorage 'sry:tool:pitch-sheet' 영속, 빈 상태 안내).
//  · 완성도 게이지·미리보기 카드·텍스트/마크다운 복사.
//  · 자급식: react 외 import 없음(linkbus 제외), 외부 네트워크 없음.
//  연계: addToProject(root:'research', folder:'기획', title:'피치') 로 프로젝트 자료에 문서 추가.
import { useEffect, useMemo, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToStash, hasStash, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'pitch-sheet', name: '피치 시트', icon: '📇', group: '구상·정리', intro: '로그라인·후킹·장르·타깃·비교작·주제를 한 장 피치덱으로 정리', w: 680, h: 720 }

const LS_KEY = 'sry:tool:pitch-sheet'

// ---------- 데이터 모델 ----------
interface Comp { id: string; text: string }            // 비교작("X 만나 Y" / "○○의 △△ 같은")
interface Pitch {
  id: string
  workTitle: string      // 작품명
  logline: string        // 로그라인(한 줄 줄거리)
  hook: string           // 후킹(왜 지금/왜 이 작품 — 한두 문장)
  genre: string          // 장르
  subgenre: string       // 세부 장르/톤
  length: string         // 분량(예: 장편 12만 자, 단편, 5부작)
  format: string         // 형식/매체(웹소설/단행본/시나리오…)
  audience: string       // 타깃 독자
  ageRating: string      // 연령/등급
  comps: Comp[]          // 비교작(2~3개 권장)
  theme: string          // 주제(이 이야기가 결국 말하는 것)
  tone: string           // 톤·분위기(키워드)
  selling: string        // 한 줄 셀링 포인트(엘리베이터 피치)
  status: WorkStatus
  createdAt: number
  updatedAt: number
}

type WorkStatus = 'idea' | 'drafting' | 'revising' | 'querying' | 'published'
const STATUSES: { key: WorkStatus; label: string; color: string }[] = [
  { key: 'idea', label: '구상', color: '#8a8f98' },
  { key: 'drafting', label: '집필 중', color: '#3b82c4' },
  { key: 'revising', label: '퇴고 중', color: '#b8862f' },
  { key: 'querying', label: '투고 중', color: '#8a4fc4' },
  { key: 'published', label: '출판/연재', color: '#3a9b5c' },
]

// 자주 쓰는 장르 프리셋(클릭 입력 보조 — 자유 입력도 허용)
const GENRE_PRESETS = ['로맨스', '판타지', '무협', '미스터리·스릴러', 'SF', '호러', '역사', '액션·전쟁', '드라마', '청소년', '라이트노벨', '로맨스 판타지', '현대물', '코미디']

// 비교작 작성 틀(클릭하면 입력칸에 골격을 넣어줌)
const COMP_TEMPLATES = [
  '《A》 × 《B》',
  '《A》의 분위기에 《B》의 구조',
  '《A》를 좋아한 독자라면',
  'A 같은 세계관, B 같은 주인공',
]

// ---------- 유틸 ----------
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const trimv = (s: unknown) => (typeof s === 'string' ? s : '')

function blankPitch(): Pitch {
  const now = Date.now()
  return {
    id: newId(),
    workTitle: '', logline: '', hook: '', genre: '', subgenre: '',
    length: '', format: '', audience: '', ageRating: '',
    comps: [], theme: '', tone: '', selling: '',
    status: 'idea', createdAt: now, updatedAt: now,
  }
}

// 완성도 — 핵심 7요소가 채워졌는지로 0~100% 환산.
const COMPLETION_FIELDS: { key: keyof Pitch; label: string }[] = [
  { key: 'workTitle', label: '작품명' },
  { key: 'logline', label: '로그라인' },
  { key: 'hook', label: '후킹' },
  { key: 'genre', label: '장르' },
  { key: 'length', label: '분량' },
  { key: 'audience', label: '타깃 독자' },
  { key: 'theme', label: '주제' },
]
function completion(p: Pitch): { pct: number; missing: string[] } {
  const missing: string[] = []
  let got = 0
  for (const f of COMPLETION_FIELDS) {
    const v = f.key === 'comps' ? (p.comps.length ? 'y' : '') : String(p[f.key] ?? '')
    if (v.trim()) got++
    else missing.push(f.label)
  }
  // 비교작은 가산점(별도 1점)
  const total = COMPLETION_FIELDS.length + 1
  if (p.comps.some((c) => c.text.trim())) got++
  else missing.push('비교작')
  return { pct: Math.round((got / total) * 100), missing }
}

function statusOf(k: WorkStatus) { return STATUSES.find((s) => s.key === k) || STATUSES[0] }

// localStorage 로드(방어적 파싱)
function load(): { list: Pitch[]; selId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], selId: null }
    const p = JSON.parse(raw)
    const list: Pitch[] = Array.isArray(p?.list)
      ? p.list.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>): Pitch => {
          const comps: Comp[] = Array.isArray(x.comps)
            ? (x.comps as unknown[]).map((c) => {
                if (typeof c === 'string') return { id: newId(), text: c }
                const co = c as Record<string, unknown>
                return { id: String(co?.id || newId()), text: trimv(co?.text) }
              }).filter((c) => c.text !== undefined)
            : []
          const st = String(x.status || 'idea') as WorkStatus
          return {
            id: String(x.id || newId()),
            workTitle: trimv(x.workTitle), logline: trimv(x.logline), hook: trimv(x.hook),
            genre: trimv(x.genre), subgenre: trimv(x.subgenre), length: trimv(x.length),
            format: trimv(x.format), audience: trimv(x.audience), ageRating: trimv(x.ageRating),
            comps, theme: trimv(x.theme), tone: trimv(x.tone), selling: trimv(x.selling),
            status: STATUSES.some((s) => s.key === st) ? st : 'idea',
            createdAt: Number.isFinite(x.createdAt) ? Number(x.createdAt) : Date.now(),
            updatedAt: Number.isFinite(x.updatedAt) ? Number(x.updatedAt) : Date.now(),
          }
        })
      : []
    const selId = list.some((x) => x.id === p?.selId) ? p.selId : (list[0]?.id ?? null)
    return { list, selId }
  } catch {
    return { list: [], selId: null }
  }
}

// 평문(텍스트) 피치 생성
function toPlainText(p: Pitch): string {
  const L: string[] = []
  L.push(`# ${p.workTitle || '(제목 미정)'}`)
  const meta1 = [p.genre, p.subgenre].filter(Boolean).join(' · ')
  const meta2 = [p.length, p.format].filter(Boolean).join(' · ')
  if (meta1) L.push(`장르: ${meta1}`)
  if (meta2) L.push(`분량/형식: ${meta2}`)
  if (p.audience || p.ageRating) L.push(`타깃 독자: ${[p.audience, p.ageRating].filter(Boolean).join(' · ')}`)
  L.push('')
  if (p.selling) L.push(`▶ ${p.selling}`)
  if (p.logline) L.push(`로그라인: ${p.logline}`)
  if (p.hook) L.push(`후킹: ${p.hook}`)
  const comps = p.comps.map((c) => c.text.trim()).filter(Boolean)
  if (comps.length) L.push(`비교작: ${comps.join(' / ')}`)
  if (p.tone) L.push(`톤·분위기: ${p.tone}`)
  if (p.theme) L.push(`주제: ${p.theme}`)
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// 프로젝트 문서용 HTML
function toBodyHtml(p: Pitch): string {
  const rows: string[] = []
  const row = (label: string, v: string) =>
    v.trim() ? `<p><b>${esc(label)}:</b> ${esc(v.trim())}</p>` : ''
  if (p.selling) rows.push(`<p style="font-size:15px;line-height:1.7;"><b>▶ ${esc(p.selling)}</b></p>`)
  rows.push('<hr/>')
  rows.push(row('로그라인', p.logline))
  rows.push(row('후킹', p.hook))
  const meta1 = [p.genre, p.subgenre].filter(Boolean).join(' · ')
  rows.push(row('장르', meta1))
  const meta2 = [p.length, p.format].filter(Boolean).join(' · ')
  rows.push(row('분량/형식', meta2))
  rows.push(row('타깃 독자', [p.audience, p.ageRating].filter(Boolean).join(' · ')))
  const comps = p.comps.map((c) => c.text.trim()).filter(Boolean)
  if (comps.length) rows.push(`<p><b>비교작:</b> ${comps.map(esc).join(' / ')}</p>`)
  rows.push(row('톤·분위기', p.tone))
  rows.push(row('주제', p.theme))
  return rows.filter(Boolean).join('')
}

export default function PitchSheet({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(load())
  const [list, setList] = useState<Pitch[]>(init.current.list)
  const [selId, setSelId] = useState<string | null>(init.current.selId)
  const [preview, setPreview] = useState(false)         // 편집 ↔ 미리보기(피치덱) 토글
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장(차단/용량초과 graceful)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, selId })) }
    catch { if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, selId])

  // payload 로 시작 데이터(로그라인/제목)를 받으면 새 피치로 채워 진입(다른 도구→이 도구 연계)
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current) return
    payloadDone.current = true
    if (!payload) return
    const pl = payload as Record<string, unknown>
    const title = trimv(pl.workTitle ?? pl.title)
    const logline = trimv(pl.logline ?? pl.text)
    const theme = trimv(pl.theme)
    const genre = trimv(pl.genre)
    if (title || logline || theme || genre) {
      const np = blankPitch()
      np.workTitle = title; np.logline = logline; np.theme = theme; np.genre = genre
      setList((p) => [np, ...p])
      setSelId(np.id)
      flash('전달받은 내용으로 새 피치를 시작했어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const cur = useMemo(() => list.find((x) => x.id === selId) || null, [list, selId])

  // ---- 변경 헬퍼 ----
  const patch = (id: string, p: Partial<Pitch>) =>
    setList((prev) => prev.map((x) => (x.id === id ? { ...x, ...p, updatedAt: Date.now() } : x)))
  const setField = (k: keyof Pitch, v: string) => { if (cur) patch(cur.id, { [k]: v } as Partial<Pitch>) }

  const addPitch = () => {
    const np = blankPitch()
    setList((p) => [np, ...p])
    setSelId(np.id)
    setPreview(false)
    flash('새 피치를 만들었어요. 작품명부터 채워 보세요.')
  }
  const removePitch = (id: string) => {
    setList((prev) => {
      const next = prev.filter((x) => x.id !== id)
      if (id === selId) setSelId(next[0]?.id ?? null)
      return next
    })
  }
  const duplicate = (id: string) => {
    const src = list.find((x) => x.id === id)
    if (!src) return
    const copy: Pitch = {
      ...src, id: newId(),
      workTitle: (src.workTitle || '(제목 미정)') + ' (사본)',
      comps: src.comps.map((c) => ({ id: newId(), text: c.text })),
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setList((p) => [copy, ...p])
    setSelId(copy.id)
    flash('피치를 복제했어요.')
  }

  // 비교작 CRUD(현재 피치 내부)
  const addComp = (text = '') => { if (cur) patch(cur.id, { comps: [...cur.comps, { id: newId(), text }] }) }
  const setComp = (cid: string, text: string) => {
    if (!cur) return
    patch(cur.id, { comps: cur.comps.map((c) => (c.id === cid ? { ...c, text } : c)) })
  }
  const removeComp = (cid: string) => {
    if (!cur) return
    patch(cur.id, { comps: cur.comps.filter((c) => c.id !== cid) })
  }

  // 좌측 바인더 파일 드롭 → 제목/본문을 새 피치 시작점으로
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const np = blankPitch()
    np.workTitle = item.title || ''
    const ch = item.character
    if (ch) {
      np.logline = trimv(ch.logline) || trimv(ch.synopsis)
      np.genre = trimv(ch.genre)
      np.theme = trimv(ch.theme)
    }
    if (!np.logline && item.text) np.logline = item.text.slice(0, 200)
    setList((p) => [np, ...p])
    setSelId(np.id)
    setPreview(false)
    flash(`〈${np.workTitle || '파일'}〉 내용으로 새 피치를 시작했어요.`)
  }

  const copyText = async (text: string, msg: string) => {
    try {
      if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(text); flash(msg) }
      else throw new Error('no clipboard')
    } catch { flash('복사에 실패했어요. 미리보기에서 직접 선택해 복사하세요.') }
  }

  const toProjectDoc = () => {
    if (!cur) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `피치 — ${(cur.workTitle || '(제목 미정)').slice(0, 50)}`,
      bodyHtml: toBodyHtml(cur),
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 피치 문서를 추가했어요.' : '프로젝트에 추가하지 못했습니다.')
  }
  const toStash = () => {
    if (!cur) return
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'memo', label: `피치 — ${cur.workTitle || '(제목 미정)'}`, text: toPlainText(cur) })
    flash('수집함에 피치를 담았어요.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const main: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }
  const sideList: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const bodyCol: React.CSSProperties = { flex: 1, minWidth: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 600 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 54, lineHeight: 1.55, fontFamily: 'inherit' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 150 }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '24px 16px', border: '1px dashed var(--border)', borderRadius: 12, margin: 'auto' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.6 }

  // ---------- 사이드바 항목 ----------
  const sideItem = (p: Pitch) => {
    const st = statusOf(p.status)
    const c = completion(p).pct
    const active = p.id === selId
    return (
      <div
        key={p.id}
        onClick={() => { setSelId(p.id); setPreview(false) }}
        style={{
          padding: '8px 9px', borderRadius: 9, cursor: 'pointer',
          border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
          background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, color: active ? 'var(--accent)' : 'var(--text)' }}>
            {p.workTitle || '(제목 미정)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${c}%`, height: '100%', background: c >= 100 ? 'var(--accent)' : st.color, transition: 'width .25s' }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{c}%</span>
        </div>
      </div>
    )
  }

  // ---------- 미리보기(피치덱 한 장) ----------
  const previewCard = (p: Pitch) => {
    const st = statusOf(p.status)
    const meta1 = [p.genre, p.subgenre].filter(Boolean).join(' · ')
    const meta2 = [p.length, p.format].filter(Boolean).join(' · ')
    const comps = p.comps.map((c) => c.text.trim()).filter(Boolean)
    const line: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.7, wordBreak: 'keep-all' }
    const tag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }
    return (
      <div style={{ ...card, background: 'var(--paper)', borderColor: 'var(--accent)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>{p.workTitle || '(제목 미정)'}</span>
          <span style={{ fontSize: 11, color: '#fff', background: st.color, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{st.label}</span>
        </div>
        {(meta1 || meta2 || p.audience || p.ageRating) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', ...tag }}>
            {meta1 && <span><Emoji e="🏷" /> {meta1}</span>}
            {meta2 && <span><Emoji e="📏" /> {meta2}</span>}
            {(p.audience || p.ageRating) && <span><Emoji e="🎯" /> {[p.audience, p.ageRating].filter(Boolean).join(' · ')}</span>}
          </div>
        )}
        {p.selling && (
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.6, color: 'var(--accent)', wordBreak: 'keep-all' }}>▶ {p.selling}</div>
        )}
        {p.logline && <div><div style={fieldLabel}>로그라인</div><div style={line}>{p.logline}</div></div>}
        {p.hook && <div><div style={fieldLabel}>후킹</div><div style={line}>{p.hook}</div></div>}
        {!!comps.length && (
          <div>
            <div style={fieldLabel}>비교작</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {comps.map((c, i) => (
                <span key={i} style={{ fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 7, padding: '3px 9px', background: 'var(--chrome-2)' }}>{c}</span>
              ))}
            </div>
          </div>
        )}
        {p.tone && <div><div style={fieldLabel}>톤·분위기</div><div style={line}>{p.tone}</div></div>}
        {p.theme && <div><div style={fieldLabel}>주제</div><div style={{ ...line, fontStyle: 'italic' }}>“{p.theme}”</div></div>}
        {!p.logline && !p.hook && !p.selling && !comps.length && !p.theme && (
          <div style={{ ...hint, fontSize: 13 }}>아직 채운 내용이 없어요. <b>편집</b>으로 돌아가 칸을 채워 보세요.</div>
        )}
      </div>
    )
  }

  const comp = cur ? completion(cur) : { pct: 0, missing: [] }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="📇" /> 피치 시트</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>작품 피치 한 장으로</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {cur && (
            <button className="minibtn" onClick={() => setPreview((v) => !v)} title="편집 ↔ 피치덱 미리보기">
              {preview ? <><Emoji e="✏️" /> 편집</> : <><Emoji e="👁" /> 미리보기</>}
            </button>
          )}
          <button className="btn-primary" onClick={addPitch}>＋ 새 피치</button>
        </div>
      </div>

      {note && (
        <div style={{ ...hint, color: 'var(--accent)', padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>{note}</div>
      )}
      {dragOver && (
        <div style={{ ...hint, color: 'var(--accent)', padding: '6px 14px', borderBottom: '1px dashed var(--accent)' }}>
          여기에 놓으면 그 파일로 새 피치를 시작합니다.
        </div>
      )}

      <div style={main}>
        {/* 좌측: 피치 목록 */}
        <div style={sidebar}>
          <div style={{ padding: '8px 10px 4px', fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>내 피치</span><span>{list.length}건</span>
          </div>
          <div style={sideList}>
            {list.length === 0 ? (
              <div style={{ ...hint, padding: '14px 8px', textAlign: 'center', lineHeight: 1.7 }}>
                아직 피치가 없어요.<br />위 <b>＋ 새 피치</b>로 시작하거나, 좌측 바인더 파일을 끌어다 놓아 보세요.
              </div>
            ) : list.map(sideItem)}
          </div>
        </div>

        {/* 우측: 편집 또는 미리보기 */}
        {!cur ? (
          <div style={{ flex: 1, display: 'flex', padding: 20 }}>
            <div style={empty}>
              <div style={{ fontSize: 30, marginBottom: 8 }}><Emoji e="📇" /></div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>피치 한 장으로 작품을 소개하세요</div>
              로그라인 · 후킹 · 장르/분량 · 타깃 독자 · 비교작 · 주제를<br />
              한 화면 카드로 정리해 투고·출판·시리즈 소개에 그대로 씁니다.<br /><br />
              <button className="btn-primary" onClick={addPitch}>＋ 첫 피치 만들기</button>
            </div>
          </div>
        ) : preview ? (
          <div style={bodyCol}>
            {previewCard(cur)}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copyText(toPlainText(cur), '피치를 텍스트로 복사했어요.')}><Emoji e="📋" /> 텍스트 복사</button>
              <button className="minibtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}><Emoji e="📥" /> 수집함</button>
              <button className="linkbtn" onClick={toProjectDoc} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈기획〉 폴더에 피치 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setPreview(false)}><Emoji e="✏️" /> 편집으로</button>
            </div>
            <div style={hint}>미리보기는 채워진 항목만 보여 줍니다. 빈 칸은 자동으로 숨겨집니다.</div>
          </div>
        ) : (
          <div style={bodyCol}>
            {/* 완성도 게이지 */}
            <div style={{ ...card, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11.5, color: 'var(--muted)' }}>
                  <span>피치 완성도</span>
                  <span style={{ color: comp.pct >= 100 ? 'var(--accent)' : 'var(--text)', fontWeight: 700 }}>{comp.pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${comp.pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .25s' }} />
                </div>
                {comp.missing.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>남은 항목: {comp.missing.join(', ')}</div>
                )}
              </div>
            </div>

            {/* 기본 */}
            <div style={card}>
              <h4 style={sectionTitle}>작품 · 핵심 한 줄</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>작품명</label>
                <input style={input} value={cur.workTitle} onChange={(e) => setField('workTitle', e.target.value)} placeholder="예: 마지막 등대지기" maxLength={80} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>셀링 포인트 — 엘리베이터 피치(한 줄)</label>
                <input style={input} value={cur.selling} onChange={(e) => setField('selling', e.target.value)} placeholder="예: 기억을 파는 가게에서 자신의 마지막 기억을 되찾으려는 소녀" maxLength={160} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>로그라인 — 한 줄 줄거리(주인공·목표·갈등)</label>
                <textarea style={area} value={cur.logline} onChange={(e) => setField('logline', e.target.value)} placeholder="누가, 무엇을 원하고, 무엇이 가로막는가를 한 문장으로." maxLength={400} />
              </div>
              <div>
                <label style={fieldLabel}>후킹 — 왜 지금, 왜 이 작품인가(한두 문장)</label>
                <textarea style={area} value={cur.hook} onChange={(e) => setField('hook', e.target.value)} placeholder="독자를 사로잡을 신선함·반전·정서적 약속을." maxLength={400} />
              </div>
            </div>

            {/* 장르·분량·형식 */}
            <div style={card}>
              <h4 style={sectionTitle}>장르 · 분량 · 형식</h4>
              <div style={{ ...twoRow, marginBottom: 10 }}>
                <div style={col}>
                  <label style={fieldLabel}>장르</label>
                  <input style={input} value={cur.genre} onChange={(e) => setField('genre', e.target.value)} placeholder="예: 판타지" maxLength={40} />
                </div>
                <div style={col}>
                  <label style={fieldLabel}>세부 장르 · 톤</label>
                  <input style={input} value={cur.subgenre} onChange={(e) => setField('subgenre', e.target.value)} placeholder="예: 다크 판타지 / 성장물" maxLength={60} />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {GENRE_PRESETS.map((g) => (
                  <button key={g} style={chip(cur.genre === g)} onClick={() => setField('genre', cur.genre === g ? '' : g)}>{g}</button>
                ))}
              </div>
              <div style={twoRow}>
                <div style={col}>
                  <label style={fieldLabel}>분량</label>
                  <input style={input} value={cur.length} onChange={(e) => setField('length', e.target.value)} placeholder="예: 장편 12만 자 / 5부작 / 단편" maxLength={60} />
                </div>
                <div style={col}>
                  <label style={fieldLabel}>형식 · 매체</label>
                  <input style={input} value={cur.format} onChange={(e) => setField('format', e.target.value)} placeholder="예: 웹소설 연재 / 단행본 / 시나리오" maxLength={60} />
                </div>
              </div>
            </div>

            {/* 타깃 독자 */}
            <div style={card}>
              <h4 style={sectionTitle}>타깃 독자</h4>
              <div style={twoRow}>
                <div style={{ ...col, minWidth: 200 }}>
                  <label style={fieldLabel}>주요 독자층</label>
                  <input style={input} value={cur.audience} onChange={(e) => setField('audience', e.target.value)} placeholder="예: 20·30대 여성, 감성 로맨스 독자" maxLength={100} />
                </div>
                <div style={col}>
                  <label style={fieldLabel}>연령 · 등급</label>
                  <input style={input} value={cur.ageRating} onChange={(e) => setField('ageRating', e.target.value)} placeholder="예: 전체 이용가 / 15세 / 성인" maxLength={40} />
                </div>
              </div>
            </div>

            {/* 비교작 */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h4 style={{ ...sectionTitle, margin: 0 }}>비교작 (comps)</h4>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>2~3개 권장 · 좌표를 그려 주세요</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => addComp()}>＋ 추가</button>
              </div>
              {cur.comps.length === 0 ? (
                <div style={{ ...hint, padding: '8px 0' }}>
                  “이 작품은 〈A〉 같은 세계관에 〈B〉 같은 주인공” — 익숙한 작품 두엇에 빗대면 독자가 단번에 감을 잡습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cur.comps.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', width: 16, textAlign: 'right' }}>{i + 1}</span>
                      <input style={{ ...input, flex: 1 }} value={c.text} onChange={(e) => setComp(c.id, e.target.value)} placeholder="예: 《세상의 마지막 기억상점》 × 《너의 췌장을 먹고 싶어》" maxLength={120} />
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeComp(c.id)}><Emoji e="🗑️" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {COMP_TEMPLATES.map((t) => (
                  <button key={t} style={chip(false)} onClick={() => addComp(t)} title="이 틀로 비교작 칸 추가">{t}</button>
                ))}
              </div>
            </div>

            {/* 주제·톤 */}
            <div style={card}>
              <h4 style={sectionTitle}>주제 · 톤</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={fieldLabel}>톤 · 분위기(키워드)</label>
                <input style={input} value={cur.tone} onChange={(e) => setField('tone', e.target.value)} placeholder="예: 쓸쓸하면서 따뜻한, 잔잔한 위로" maxLength={100} />
              </div>
              <div>
                <label style={fieldLabel}>주제 — 이 이야기가 결국 말하는 것</label>
                <textarea style={area} value={cur.theme} onChange={(e) => setField('theme', e.target.value)} placeholder="예: 잊는다는 것은 잃는 것이 아니라 떠나보내는 법을 배우는 일이다." maxLength={300} />
              </div>
            </div>

            {/* 상태 + 메타 액션 */}
            <div style={card}>
              <h4 style={sectionTitle}>상태 · 관리</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {STATUSES.map((s) => (
                  <button key={s.key} style={chip(cur.status === s.key)} onClick={() => setField('status', s.key)}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: cur.status === s.key ? '#fff' : s.color, marginRight: 5 }} />
                    {s.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copyText(toPlainText(cur), '피치를 텍스트로 복사했어요.')}><Emoji e="📋" /> 텍스트 복사</button>
                <button className="minibtn" onClick={() => setPreview(true)}><Emoji e="👁" /> 미리보기</button>
                <button className="minibtn" onClick={() => duplicate(cur.id)}>⧉ 복제</button>
                <button className="minibtn" onClick={toStash} disabled={!hasStash()}><Emoji e="📥" /> 수집함</button>
                <button className="linkbtn" onClick={toProjectDoc} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈기획〉 폴더에 피치 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                  <Emoji e="📄" /> 프로젝트에 추가
                </button>
                <button className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }} onClick={() => removePitch(cur.id)}><Emoji e="🗑️" /> 이 피치 삭제</button>
              </div>
            </div>

            <div style={hint}>
              피치 한 장은 “이 작품이 무엇이고, 왜 읽어야 하며, 누구를 위한 것인가”를 한눈에 보여 주는 영업 문서입니다.
              로그라인은 줄거리, 후킹은 매력, 비교작은 좌표, 주제는 무게중심 — 입력은 이 브라우저에 자동 저장됩니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
