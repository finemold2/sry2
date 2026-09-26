// 경제·교역 설계기 — 작품 세계의 경제 구조를 카드로 설계한다.
//   주요 자원 · 화폐 · 교역로 · 주요 산업 · 빈부 격차 · 길드·상단 · 희소재(귀한 물건)를 입력하고,
//   각 항목마다 발상을 돕는 가이드 질문/예시를 제공한다. 여러 경제권을 저장·수정·삭제·순서 변경.
// 자급식: react·linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:economy-builder' 에 자동 저장/복원.
// 연계(linkbus): 설계한 경제권을 실제 프로젝트 자료('research')의 '세계관'›'경제' 폴더에 문서로 추가한다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'economy-builder', name: '경제·교역 설계기', icon: '💰', group: '구상·정리', intro: '자원·화폐·교역로·산업·빈부·길드·희소재로 작품 세계의 경제를 설계하세요', w: 660, h: 600 }

const LS_KEY = 'sry:tool:economy-builder'

// 입력 섹션 정의 — 각 항목은 단일 텍스트 필드. 가이드(질문/예시)로 발상을 돕는다.
interface FieldDef {
  key: keyof EconomyFields
  label: string
  icon: string
  ph: string        // placeholder
  guide: string     // 한 줄 가이드 질문
  examples: string[] // 예시 칩(클릭하면 본문에 추가)
}

interface EconomyFields {
  resources: string   // 주요 자원
  currency: string    // 화폐
  trade: string       // 교역로
  industries: string  // 주요 산업
  wealthGap: string   // 빈부 격차
  guilds: string      // 길드·상단
  rareGoods: string   // 희소재
}

const FIELDS: FieldDef[] = [
  {
    key: 'resources', label: '주요 자원', icon: '⛏️',
    ph: '이 세계가 가진 핵심 자원과 그 분포…',
    guide: '무엇이 풍부하고 무엇이 부족한가? 자원의 편중이 갈등을 만드는가?',
    examples: ['풍부한 철광', '비옥한 농지', '마나 결정', '담수 부족', '향신료 산지', '목재·모피'],
  },
  {
    key: 'currency', label: '화폐', icon: '🪙',
    ph: '무엇으로 거래하는가? 통화 단위·발행 주체·신뢰…',
    guide: '동전인가, 어음·신용인가, 물물교환인가? 화폐를 누가 보증하는가?',
    examples: ['금화·은화·동전', '소금 화폐', '왕실 발행 지폐', '상단 어음', '물물교환', '마법 인장 화폐'],
  },
  {
    key: 'trade', label: '교역로', icon: '🛣️',
    ph: '상품이 오가는 길·항로·요충지·관문…',
    guide: '핵심 교역로는 어디인가? 누가 통제하고, 위험·관세는 무엇인가?',
    examples: ['대륙 횡단 비단길', '연안 항로', '산악 관문(통행세)', '사막 대상로', '강 운하망', '밀무역 루트'],
  },
  {
    key: 'industries', label: '주요 산업', icon: '🏭',
    ph: '이 세계 사람들이 생계를 잇는 핵심 산업…',
    guide: '돈이 어디서 만들어지는가? 어떤 직업이 흔하고 귀한가?',
    examples: ['광업·제련', '농업·목축', '조선·해운', '직조·염색', '연금·마도구 제작', '용병·청부'],
  },
  {
    key: 'wealthGap', label: '빈부 격차', icon: '⚖️',
    ph: '부가 어떻게 나뉘는가? 계급·격차·이동 가능성…',
    guide: '누가 부유하고 누가 가난한가? 신분 상승은 가능한가? 격차가 어떤 긴장을 낳는가?',
    examples: ['세습 귀족 vs 소작농', '신흥 상인 계급', '극심한 빈민가', '능력제 신분 상승', '노예 경제', '중산층 부재'],
  },
  {
    key: 'guilds', label: '길드·상단', icon: '🏛️',
    ph: '경제를 움직이는 조직·길드·상단·은행…',
    guide: '어떤 조직이 시장과 직업을 통제하는가? 그들의 규칙·영향력·암투는?',
    examples: ['상인 길드', '대상단(카르텔)', '도둑 길드', '연금술사 협회', '은행가 가문', '장인 동업조합'],
  },
  {
    key: 'rareGoods', label: '희소재', icon: '💎',
    ph: '값을 매기기 어려운 귀한 물건·재료…',
    guide: '무엇이 가장 비싸고 탐나는가? 왜 희귀한가? 그것을 둘러싼 음모는?',
    examples: ['용의 비늘', '불멸의 약초', '고대 유물', '심해 진주', '순수 마나석', '잊힌 향료'],
  },
]

interface Economy extends EconomyFields {
  id: string
  name: string        // 경제권 이름(지역·국가·시대)
  notes: string       // 자유 메모
  createdAt: number
  updatedAt: number
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyEconomy(): Economy {
  return {
    id: '', name: '',
    resources: '', currency: '', trade: '', industries: '', wealthGap: '', guilds: '', rareGoods: '',
    notes: '', createdAt: 0, updatedAt: 0,
  }
}

// 채워진 항목 수(진행도 표시용).
function filledCount(e: EconomyFields): number {
  return FIELDS.reduce((n, f) => n + ((e[f.key] || '').trim() ? 1 : 0), 0)
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 줄바꿈을 <br>로 — 본문 HTML 가독성.
function nl2br(s: string): string {
  return escHtml(s.trim()).replace(/\n/g, '<br>')
}

// 텍스트 내보내기(클립보드용).
function economyToText(e: Economy): string {
  const L: string[] = []
  L.push(`# ${e.name || '(이름 없는 경제권)'} — 경제·교역 설계`)
  FIELDS.forEach((f) => {
    const v = (e[f.key] || '').trim()
    if (v) L.push(`\n[${f.icon} ${f.label}]\n${v}`)
  })
  if (e.notes.trim()) L.push(`\n[🗒️ 메모]\n${e.notes.trim()}`)
  return L.join('\n')
}

// 프로젝트 '경제 설계' 문서 본문(HTML) 생성.
function economyBodyHtml(e: Economy): string {
  const dash = '<span style="color:#888">—</span>'
  const parts: string[] = []
  FIELDS.forEach((f) => {
    const v = (e[f.key] || '').trim()
    parts.push(`<p><b>${escHtml(f.icon + ' ' + f.label)}</b><br>${v ? nl2br(v) : dash}</p>`)
  })
  if (e.notes.trim()) parts.push(`<p><b>🗒️ 메모</b><br>${nl2br(e.notes)}</p>`)
  return parts.join('')
}

// 한 줄 시놉시스(채워진 핵심 항목 요약).
function economySynopsis(e: Economy): string {
  const bits: string[] = []
  if (e.resources.trim()) bits.push(`자원 ${e.resources.trim().replace(/\s+/g, ' ').slice(0, 24)}`)
  if (e.currency.trim()) bits.push(`화폐 ${e.currency.trim().replace(/\s+/g, ' ').slice(0, 16)}`)
  if (e.industries.trim()) bits.push(`산업 ${e.industries.trim().replace(/\s+/g, ' ').slice(0, 24)}`)
  return bits.join(' · ') || '경제·교역 설계'
}

// localStorage 복원 — 미지원/손상 시 graceful. 누락 필드 보강.
function loadState(): { list: Economy[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Economy[] = arr
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => {
        const base = emptyEconomy()
        FIELDS.forEach((f) => { base[f.key] = typeof x[f.key] === 'string' ? x[f.key] : '' })
        return {
          ...base,
          id: String(x.id || newId()),
          name: typeof x.name === 'string' ? x.name : '',
          notes: typeof x.notes === 'string' ? x.notes : '',
          createdAt: Number(x.createdAt) || Date.now(),
          updatedAt: Number(x.updatedAt) || Number(x.createdAt) || Date.now(),
        } as Economy
      })
    const openId = typeof p?.openId === 'string' && list.some((e) => e.id === p.openId) ? p.openId : null
    return { list, openId }
  } catch { return { list: [], openId: null } }
}

export default function EconomyBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Economy[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showGuide, setShowGuide] = useState(true) // 가이드 질문 표시 토글
  // 사용자 정의 항목(미리 만든 데이터 없음 — 사용자가 직접 입력) + 고정 '기타' 자유 입력칸.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const mounted = useRef(true)
  const payloadDone = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 복사/안내 메시지 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1700)
    return () => window.clearTimeout(t)
  }, [copied])

  // payload.name 으로 열린 경우(다른 도구 연계) — 같은 이름 항목 선택 또는 새 경제권 생성(1회).
  useEffect(() => {
    if (payloadDone.current) return
    const nm = payload && typeof payload.name === 'string' ? (payload.name as string).trim() : ''
    if (!nm) return
    payloadDone.current = true
    const exist = init.current.list.find((e) => (e.name || '').trim() === nm)
    if (exist) { setOpenId(exist.id); return }
    const ne = { ...emptyEconomy(), id: newId(), name: nm, createdAt: Date.now(), updatedAt: Date.now() }
    setList((prev) => [...prev, ne])
    setOpenId(ne.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const opened = openId ? list.find((e) => e.id === openId) || null : null

  // 선택 항목이 사라지면 보정.
  useEffect(() => {
    if (openId && !list.some((e) => e.id === openId)) setOpenId(list.length ? list[0].id : null)
  }, [openId, list])

  const startNew = () => {
    const ne = { ...emptyEconomy(), id: newId(), createdAt: Date.now(), updatedAt: Date.now() }
    setList((prev) => [...prev, ne])
    setOpenId(ne.id)
    setConfirmDel(null)
    setQuery('')
    // 새로 만들 때: 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지, 기타도 비움.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  const patch = (id: string, fields: Partial<Economy>) => {
    setList((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields, updatedAt: Date.now() } : e)))
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((e) => e.id !== id))
    if (openId === id) setOpenId(null)
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((e) => e.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 드래그 순서 변경(HTML5 DnD — 전역 리스너 없음).
  const onDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    setDragOver(null)
    if (!from || from === targetId) return
    setList((prev) => {
      const fi = prev.findIndex((e) => e.id === from)
      const ti = prev.findIndex((e) => e.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }

  // 예시 칩 → 해당 필드 본문에 추가(이미 있으면 중복 추가하지 않음).
  const appendExample = (key: keyof EconomyFields, ex: string) => {
    if (!opened) return
    const cur = (opened[key] || '')
    if (cur.split(/[\n,·]/).map((s) => s.trim()).includes(ex)) return
    const next = cur.trim() ? `${cur.replace(/\s*$/, '')}, ${ex}` : ex
    patch(opened.id, { [key]: next } as Partial<Economy>)
  }

  // 사용자 정의 항목 추가 — 이름만 받고 값은 비워 둔다(무작위 생성하지 않음).
  const addCustom = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 적어 주세요 (예: 세금 제도, 암시장)') || '').trim() } catch {}
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const patchCustom = (id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }
  const removeCustom = (id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setCopied(label) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setCopied('복사 실패') }
  }

  // 사용자 정의 항목·기타를 텍스트로(비어 있지 않은 것만) — 복사/내보내기에 덧붙임.
  const customText = (): string => {
    const L: string[] = []
    custom.forEach((c) => {
      const v = (c.value || '').trim()
      const lab = (c.label || '').trim()
      if (lab && v) L.push(`\n[${lab}]\n${v}`)
    })
    if (etc.trim()) L.push(`\n[🗒️ 기타]\n${etc.trim()}`)
    return L.join('\n')
  }

  const exportAll = () => list.map(economyToText).join('\n\n' + '─'.repeat(28) + '\n\n')

  // 사용자 정의 항목·기타를 본문 HTML 끝에 덧붙인다(비어 있지 않은 것만).
  const customBodyHtml = (): string => {
    const parts: string[] = []
    custom.forEach((c) => {
      const v = (c.value || '').trim()
      const lab = (c.label || '').trim()
      if (lab && v) parts.push(`<p><b>${escHtml(lab)}</b><br>${nl2br(v)}</p>`)
    })
    if (etc.trim()) parts.push(`<p><b>🗒️ 기타</b><br>${nl2br(etc)}</p>`)
    return parts.join('')
  }

  // 프로젝트 연동 — '경제 설계' 문서를 자료(research) › '세계관' › '경제' 폴더에 추가.
  const toProject = (e: Economy) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되지 않았습니다'); return }
    const nm = (e.name || '').trim()
    // 사용자 정의 항목(키 = 라벨 그대로)·기타를 meta(다른 도구·DB 열에 노출)에 추가 — 비어 있지 않은 것만.
    const extraMeta: Record<string, string> = {}
    custom.forEach((c) => {
      const v = (c.value || '').trim()
      const lab = (c.label || '').trim()
      if (lab && v) extraMeta[lab] = v.replace(/\s+/g, ' ').slice(0, 120)
    })
    if (etc.trim()) extraMeta['기타'] = etc.trim().replace(/\s+/g, ' ').slice(0, 120)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      icon: '💰',
      title: nm ? `경제 — ${nm}` : '경제 설계',
      bodyHtml: economyBodyHtml(e) + customBodyHtml(),
      synopsis: economySynopsis(e),
      meta: {
        분류: '경제',
        경제권: nm || '—',
        화폐: e.currency.trim() ? e.currency.trim().replace(/\s+/g, ' ').slice(0, 40) : '—',
        채움: `${filledCount(e)}/${FIELDS.length}`,
        ...extraMeta,
      },
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료(세계관)에 경제 문서를 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  const filtered = query.trim()
    ? list.filter((e) => {
        const q = query.trim().toLowerCase()
        return (e.name || '').toLowerCase().includes(q) ||
          FIELDS.some((f) => (e[f.key] || '').toLowerCase().includes(q))
      })
    : list

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', fontSize: 14 }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 224, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const sideHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16 }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const search: React.CSSProperties = { ...input, padding: '7px 9px', fontSize: 13 }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 56, lineHeight: 1.55, fontFamily: 'inherit' }
  const field: React.CSSProperties = { marginBottom: 14 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 24, gap: 10 }
  const guideBox: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 6, padding: '6px 9px', borderRadius: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)' }
  const chip: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: 1.2, padding: '3px 8px', borderRadius: 999 }
  const linked = hasProjectBridge()

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="💰"/></span>
        <strong style={{ fontSize: 15 }}>경제·교역 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 경제권</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={() => copyText(exportAll(), '전체 복사됨')} disabled={list.length === 0} title="모든 경제권을 텍스트로 복사"><Emoji e="📋"/> 전체 내보내기</button>
        <button className="btn-primary" onClick={startNew}>＋ 새 경제권</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 목록 + 검색 + 순서 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <button className="btn-primary" onClick={startNew} style={{ width: '100%' }}>＋ 새 경제권</button>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·내용 검색" aria-label="경제권 검색" />
          </div>
          {list.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>
              아직 설계한 경제권이 없어요.<br />위 <b>＋ 새 경제권</b>으로<br />작품 세계의 경제를 만들어 보세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>검색 결과가 없어요.</div>
          ) : (
            <div style={listArea}>
              {filtered.map((e) => {
                const realIdx = list.findIndex((x) => x.id === e.id)
                const active = e.id === openId
                const cnt = filledCount(e)
                return (
                  <div
                    key={e.id}
                    draggable={!query.trim()}
                    onDragStart={() => { if (!query.trim()) dragId.current = e.id }}
                    onDragOver={(ev) => { if (!query.trim()) { ev.preventDefault(); if (dragOver !== e.id) setDragOver(e.id) } }}
                    onDragLeave={() => { if (dragOver === e.id) setDragOver(null) }}
                    onDrop={() => onDrop(e.id)}
                    onDragEnd={() => { dragId.current = null; setDragOver(null) }}
                    onClick={() => { setOpenId(e.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      outline: dragOver === e.id ? '2px dashed var(--accent)' : 'none',
                      background: active ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10, padding: '8px 9px', cursor: 'pointer', userSelect: 'none',
                      boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!query.trim() && <span style={{ color: 'var(--muted)', cursor: 'grab', fontSize: 12 }} title="드래그로 순서 변경">⠿</span>}
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: e.name ? 'var(--text)' : 'var(--muted)' }}>
                        {e.name || '(이름 없는 경제권)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: cnt === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>채움 {cnt}/{FIELDS.length}</span>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(ev) => { ev.stopPropagation(); move(e.id, -1) }} disabled={!!query.trim() || realIdx <= 0} title="위로">▲</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(ev) => { ev.stopPropagation(); move(e.id, 1) }} disabled={!!query.trim() || realIdx >= list.length - 1} title="아래로">▼</button>
                      <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={(ev) => { ev.stopPropagation(); setConfirmDel(e.id) }} title="삭제"><Emoji e="🗑️"/></button>
                    </div>
                    {confirmDel === e.id && (
                      <div style={{ marginTop: 6, padding: 6, borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--warn)', fontSize: 11 }}>
                        <div style={{ marginBottom: 5, color: 'var(--warn)' }}>이 경제권을 삭제할까요?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={(ev) => { ev.stopPropagation(); remove(e.id) }}>삭제</button>
                          <button className="minibtn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(ev) => { ev.stopPropagation(); setConfirmDel(null) }}>취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {!!query.trim() && filtered.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색 중에는 순서 이동이 잠깁니다.</div>
          )}
        </div>

        {/* 메인: 편집 또는 안내 */}
        <div style={main}>
          {!opened ? (
            <div style={empty}>
              <div style={{ fontSize: 34 }}><Emoji e="💰"/></div>
              <div>왼쪽에서 경제권을 고르거나<br /><b>＋ 새 경제권</b>으로 만들어 보세요.</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                자원 · 화폐 · 교역로 · 산업 · 빈부 · 길드 · 희소재를 채워<br />
                돈이 어떻게 흐르는지 또렷한 세계를 설계하세요.
              </div>
            </div>
          ) : (
            <div>
              {/* 헤더: 이름 + 액션 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <strong style={{ fontSize: 14 }}>경제권 설계</strong>
                <span style={{ fontSize: 11, color: filledCount(opened) === FIELDS.length ? 'var(--ok)' : 'var(--muted)' }}>채움 {filledCount(opened)}/{FIELDS.length}</span>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => setShowGuide((v) => !v)} title="가이드 질문 보이기/숨기기">{showGuide ? <><Emoji e="💡"/> 가이드 끄기</> : <><Emoji e="💡"/> 가이드 켜기</>}</button>
                <button className="minibtn" onClick={() => copyText(economyToText(opened) + customText(), '이 경제권을 복사했어요')} title="이 경제권을 텍스트로 복사"><Emoji e="📋"/> 복사</button>
              </div>

              <div style={field}>
                <div style={label}><Emoji e="🏷️"/> 경제권 이름 <span style={{ fontWeight: 400 }}>(지역·국가·시대)</span></div>
                <input style={input} value={opened.name} onChange={(e) => patch(opened.id, { name: e.target.value })} placeholder="예: 자유항 카르나, 북부 광산 연합, 제국 말기 경제" maxLength={80} aria-label="경제권 이름" />
              </div>

              {FIELDS.map((f) => (
                <div key={f.key} style={field}>
                  <div style={label}><Emoji e={f.icon}/> {f.label}</div>
                  {showGuide && <div style={guideBox}><Emoji e="💡"/> {f.guide}</div>}
                  <textarea
                    style={area}
                    value={opened[f.key]}
                    onChange={(e) => patch(opened.id, { [f.key]: e.target.value } as Partial<Economy>)}
                    placeholder={f.ph}
                    aria-label={f.label}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                    {f.examples.map((ex) => (
                      <button key={ex} style={chip} onClick={() => appendExample(f.key, ex)} title="이 예시를 본문에 추가">＋ {ex}</button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 사용자 정의 항목 — 이름은 사용자가 정하고 값은 직접 입력(미리 만든 데이터 없음). */}
              {custom.map((c) => (
                <div key={c.id} style={field}>
                  <div style={{ ...label, justifyContent: 'space-between' }}>
                    <span><Emoji e="🧩"/> {c.label}</span>
                    <button className="minibtn" style={{ padding: '2px 6px', fontSize: 11, color: 'var(--warn)' }} onClick={() => removeCustom(c.id)} title="이 항목 삭제">✕</button>
                  </div>
                  <textarea
                    style={area}
                    value={c.value}
                    onChange={(e) => patchCustom(c.id, e.target.value)}
                    placeholder={`${c.label}에 대해 직접 적어 보세요`}
                    aria-label={c.label}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <button className="minibtn" onClick={addCustom} title="내가 원하는 항목을 직접 추가">＋ 항목 추가</button>
              </div>

              {/* 고정 '기타' 자유 입력 — 항상 보임, 기본 비어 있음. */}
              <div style={field}>
                <div style={label}><Emoji e="🗒️"/> 기타 <span style={{ fontWeight: 400 }}>(자유롭게)</span></div>
                <textarea style={{ ...area, minHeight: 96 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="위 항목에 담기 어려운 내용을 자유롭게 적어 보세요" aria-label="기타" />
              </div>

              <div style={field}>
                <div style={label}><Emoji e="🗒️"/> 메모 <span style={{ fontWeight: 400 }}>(선택)</span></div>
                <textarea style={area} value={opened.notes} onChange={(e) => patch(opened.id, { notes: e.target.value })} placeholder="경제가 이야기에 만드는 갈등·기회, 미해결 질문 등" aria-label="메모" />
              </div>

              {/* 프로젝트 연계 */}
              <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
                <button
                  className="linkbtn"
                  onClick={() => toProject(opened)}
                  disabled={!linked}
                  title={linked ? '이 경제권을 프로젝트 자료(세계관›경제)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                ><Emoji e="📄"/> 프로젝트에 추가</button>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 14 }}>
                모든 변경은 이 브라우저에 자동 저장됩니다. 마지막 수정: {new Date(opened.updatedAt).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
