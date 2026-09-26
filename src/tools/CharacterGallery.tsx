// 인물 갤러리 — 공유 라이브러리(characters)에 모인 인물들을 '사진·이름·역할' 카드 보드로 한눈에 본다.
//  · 카드 클릭 → 상세 패널(사진·역할·특성 표·외모/성격/목표/비밀/메모) 슬라이드 인.
//  · 검색(이름/역할/특성/메모) + 역할 필터 칩 + 정렬(최근/이름/역할) + 카드/리스트 보기 전환.
//  · 연계: "🪪 인물 시트로"(openToolLinked) · 관련 도구 바 · 프로젝트에 인물 카드 추가 · 라이브러리에서 삭제.
//  · 사진이 없는 인물은 저작권 안전한 DiceBear 오픈소스 아바타를 이름 시드로 생성해 표시(원본 라이브러리는 손대지 않음).
//  · 비어 있으면 어디서 인물을 만들 수 있는지 안내(캐릭터 생성기/인물 시트 열기 버튼).
//  · 뷰 설정(검색·필터·정렬·보기)은 localStorage 'sry:tool:character-gallery' 에 영속.
// import 는 react 와 './linkbus' 만 사용.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  openToolLinked,
  removeFromLibrary,
  addToProject,
  hasProjectBridge,
  TOOL_RELATIONS,
  type SharedCharacter,
  type SharedTrait,
  Emoji,
  emojify,
} from './linkbus'

export const meta = { id: 'character-gallery', name: '인물 갤러리', icon: '🖼️', group: '구상·정리', intro: '라이브러리의 인물을 사진·이름·역할 카드 보드로 보고, 클릭해 특성을 살펴보세요', w: 720, h: 640 }

const LS_KEY = 'sry:tool:character-gallery'
const TOOL_ID = 'character-gallery'

// ---------- 안전 유틸 ----------
function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// 사진 없는 인물용 저작권 안전 아바타(DiceBear 오픈소스, 키 불필요·CORS·SVG). 이름을 시드로 안정적으로 생성.
function avatarFor(c: SharedCharacter): string {
  const seed = encodeURIComponent((c.name || c.id || 'character').trim() || 'character')
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundType=gradientLinear`
}

// 특성 배열 정규화(빈 항목 제거).
function traitsOf(c: SharedCharacter): SharedTrait[] {
  return (Array.isArray(c.traits) ? c.traits : []).filter((t) => t && (str(t.k).trim() || str(t.v).trim()))
}

// 검색 색인용 텍스트(이름/역할/특성/주요 필드).
function haystack(c: SharedCharacter): string {
  const parts = [c.name, c.role, c.appearance, c.personality, c.goal, c.secret, c.notes, c.source]
  for (const t of traitsOf(c)) parts.push(str(t.k), str(t.v))
  return parts.map((x) => str(x)).join(' ').toLowerCase()
}

// 인물 한 명을 사람이 읽는 텍스트로(복사용).
function charToText(c: SharedCharacter): string {
  const lines: string[] = [`■ ${c.name || '이름 없는 인물'}`]
  if (c.role) lines.push(`역할: ${c.role}`)
  if (c.appearance) lines.push(`외모: ${c.appearance}`)
  if (c.personality) lines.push(`성격: ${c.personality}`)
  if (c.goal) lines.push(`목표: ${c.goal}`)
  if (c.secret) lines.push(`비밀: ${c.secret}`)
  for (const t of traitsOf(c)) lines.push(`${str(t.k).trim()}: ${str(t.v).trim()}`)
  if (c.notes) lines.push(`메모: ${c.notes}`)
  if (c.photoCredit) lines.push(`사진 출처: ${c.photoCredit}`)
  if (c.source) lines.push(`출처: ${c.source}`)
  return lines.join('\n')
}

type SortKey = 'recent' | 'name' | 'role'
type ViewKey = 'card' | 'list'

interface Prefs { q: string; role: string; sort: SortKey; view: ViewKey }
const DEFAULT_PREFS: Prefs = { q: '', role: '', sort: 'recent', view: 'card' }

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const p = JSON.parse(raw) as Partial<Prefs>
    return {
      q: str(p.q),
      role: str(p.role),
      sort: (p.sort === 'name' || p.sort === 'role' ? p.sort : 'recent'),
      view: (p.view === 'list' ? 'list' : 'card'),
    }
  } catch { return { ...DEFAULT_PREFS } }
}

const SORT_LABEL: Record<SortKey, string> = { recent: '최근 추가순', name: '이름순', role: '역할순' }

export default function CharacterGallery({ payload }: { payload?: Record<string, unknown> }) {
  const characters = useLibraryList('characters')

  const [q, setQ] = useState<string>(() => loadPrefs().q)
  const [roleFilter, setRoleFilter] = useState<string>(() => loadPrefs().role)
  const [sort, setSort] = useState<SortKey>(() => loadPrefs().sort)
  const [view, setView] = useState<ViewKey>(() => loadPrefs().view)
  const [selId, setSelId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({})

  const mounted = useRef(true)
  const toastTimer = useRef<number | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null }
    }
  }, [])

  // 뷰 설정 영속
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ q, role: roleFilter, sort, view })) } catch { /* 차단/용량 무시 */ }
  }, [q, roleFilter, sort, view])

  // payload.focus(id) 로 특정 인물을 열어달라는 요청 처리(중복 방지 1회).
  const consumedPayload = useRef<unknown>(undefined)
  useEffect(() => {
    const fid = payload?.focus
    if (typeof fid !== 'string' || !fid) return
    if (consumedPayload.current === fid) return
    consumedPayload.current = fid
    if (characters.some((c) => c.id === fid)) setSelId(fid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, characters])

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
  }

  // 역할 필터 후보(중복 제거, 빈 값 제외)
  const roles = useMemo(() => {
    const set = new Set<string>()
    for (const c of characters) { const r = str(c.role).trim(); if (r) set.add(r) }
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [characters])

  // 검색 + 필터 + 정렬 적용
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let arr = characters.filter((c) => {
      if (roleFilter && str(c.role).trim() !== roleFilter) return false
      if (needle && !haystack(c).includes(needle)) return false
      return true
    })
    arr = [...arr]
    if (sort === 'name') arr.sort((a, b) => str(a.name).localeCompare(str(b.name), 'ko'))
    else if (sort === 'role') arr.sort((a, b) => str(a.role).localeCompare(str(b.role), 'ko') || str(a.name).localeCompare(str(b.name), 'ko'))
    else arr.sort((a, b) => (b.updated || 0) - (a.updated || 0)) // 최근
    return arr
  }, [characters, q, roleFilter, sort])

  // 선택된 인물(목록에서 사라지면 선택 해제)
  const selected = useMemo(() => (selId ? characters.find((c) => c.id === selId) || null : null), [characters, selId])
  useEffect(() => { if (selId && !selected) setSelId(null) }, [selId, selected])

  // 이 도구가 가진 값을 정규(표준) 캐릭터 키로 1:1 매핑(빈 값 제외). 받는 허브가 항목을 제자리 칸에 넣는다.
  const canonFields = (c: SharedCharacter): Record<string, string> => {
    const f: Record<string, string> = {}
    const put = (k: string, v: unknown) => { const s = str(v).trim(); if (s) f[k] = s }
    put('name', c.name)
    put('role', c.role)
    put('appearance', c.appearance)
    put('personality', c.personality)
    put('goal', c.goal)
    put('secret', c.secret)
    put('notes', c.notes)
    return f
  }

  // ---------- 연계 동작 ----------
  const toSheet = (c: SharedCharacter) => {
    // SharedCharacter 를 그대로 넘기면 인물 시트가 payload.character 로 받아 새 인물로 추가한다.
    openToolLinked('character-sheet', {
      character: {
        name: c.name, role: c.role, appearance: c.appearance, personality: c.personality,
        goal: c.goal, secret: c.secret, notes: c.notes, source: c.source,
        photo: c.photo || avatarFor(c), photoCredit: c.photoCredit || (c.photo ? '' : 'DiceBear 아바타'),
        traits: traitsOf(c),
        fields: canonFields(c),
      },
    })
    flash(`‘${c.name || '인물'}’을(를) 인물 시트로 보냈습니다`)
  }

  const copyChar = (c: SharedCharacter) => {
    try {
      navigator.clipboard?.writeText(charToText(c)).then(() => flash('복사했습니다')).catch(() => flash('복사할 수 없습니다'))
    } catch { flash('클립보드를 사용할 수 없습니다') }
  }

  const toProject = (c: SharedCharacter) => {
    if (!hasProjectBridge()) return
    const ts = traitsOf(c)
    const meta: Record<string, string> = {}
    for (const t of ts) { const k = str(t.k).trim(); const v = str(t.v).trim(); if (k && v) meta[k] = v }
    if (c.role) meta['역할'] = c.role
    const rows = ts.map((t) => `<tr><th style="text-align:left;padding:2px 8px;color:#666">${esc(str(t.k))}</th><td style="padding:2px 8px">${esc(str(t.v))}</td></tr>`).join('')
    const bodyHtml =
      (c.photo ? `<p><img src="${esc(c.photo)}" alt="${esc(c.name)}" style="max-width:160px;border-radius:8px"/></p>` : '') +
      (c.role ? `<p><b>역할:</b> ${esc(c.role)}</p>` : '') +
      (c.appearance ? `<p><b>외모:</b> ${esc(c.appearance)}</p>` : '') +
      (c.personality ? `<p><b>성격:</b> ${esc(c.personality)}</p>` : '') +
      (c.goal ? `<p><b>목표:</b> ${esc(c.goal)}</p>` : '') +
      (c.secret ? `<p><b>비밀:</b> ${esc(c.secret)}</p>` : '') +
      (rows ? `<table>${rows}</table>` : '') +
      (c.notes ? `<p>${esc(c.notes)}</p>` : '') +
      (c.photoCredit ? `<p style="font-size:11px;color:#888">사진 출처: ${esc(c.photoCredit)}</p>` : '')
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: c.name || '이름 없는 인물',
      character: {
        // 정규(표준) 키로 채워 받는 허브가 항목을 제자리 칸에 넣게 한다. conflict 는 호환을 위해 유지.
        name: c.name || '', role: c.role || '', appearance: c.appearance || '',
        personality: c.personality || '', goal: c.goal || '', secret: c.secret || '', conflict: c.secret || '', notes: c.notes || '',
      },
      bodyHtml, meta,
    })
    if (id) flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다')
    else flash('프로젝트에 추가할 수 없습니다')
  }

  const doDelete = (c: SharedCharacter) => {
    if (confirmDel !== c.id) { setConfirmDel(c.id); return }
    removeFromLibrary('characters', c.id)
    setConfirmDel(null)
    if (selId === c.id) setSelId(null)
    flash('라이브러리에서 삭제했습니다')
  }

  // 관련 도구(연계 바)
  const related = (TOOL_RELATIONS['character-sheet'] || []).filter((id) => id !== TOOL_ID)
  const RELATED_LABEL: Record<string, string> = {
    'character-forge': '🧬 캐릭터 생성기', 'character-model': '🎭 캐릭터 모델', 'character-sheet': '🪪 인물 시트',
    'relationship-map': '🕸️ 관계도', 'pov-tracker': '👁️ 시점 추적', 'name-mixer': '🔀 이름 믹서', 'name-analyzer': '🔍 이름 분석',
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', boxSizing: 'border-box' }
  const cardImg: React.CSSProperties = { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block', background: 'var(--chrome-2)' }

  const total = characters.length

  // ---------- 빈 상태 ----------
  if (total === 0) {
    return (
      <div style={wrap}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 40 }}><Emoji e="🖼️"/></div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>아직 라이브러리에 인물이 없습니다</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 360 }}>
            인물을 만들거나 저장하면 여기 갤러리에 사진·이름·역할 카드로 모입니다.<br />
            아래 도구에서 인물을 만들고 <b>“인물 라이브러리에 저장”</b>을 눌러 보세요.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => openToolLinked('character-forge')}><Emoji e="🧬"/> 캐릭터 생성기 열기</button>
            <button className="minibtn" onClick={() => openToolLinked('character-sheet')}><Emoji e="🪪"/> 인물 시트 열기</button>
            <button className="minibtn" onClick={() => openToolLinked('character-model')}><Emoji e="🎭"/> 캐릭터 모델 열기</button>
          </div>
        </div>
        <div className="license-note">사진이 없는 인물은 저작권 안전한 DiceBear 오픈소스 아바타로 자동 표시됩니다.</div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {/* 검색 + 정렬 + 보기 전환 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·역할·특성으로 검색…"
          style={{ flex: 1, minWidth: 140, padding: '7px 11px', borderRadius: 8, fontSize: 13, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
        />
        {q && <button className="minibtn" onClick={() => setQ('')} title="검색어 지우기">✕</button>}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          title="정렬"
          style={{ padding: '6px 8px', borderRadius: 8, fontSize: 12, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
        <button className={'minibtn' + (view === 'card' ? ' active' : '')} onClick={() => setView('card')} title="카드 보기">▦</button>
        <button className={'minibtn' + (view === 'list' ? ' active' : '')} onClick={() => setView('list')} title="리스트 보기">☰</button>
      </div>

      {/* 역할 필터 칩 */}
      {roles.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <button className={'minibtn' + (roleFilter === '' ? ' active' : '')} onClick={() => setRoleFilter('')}>전체 {total}</button>
          {roles.map((r) => (
            <button key={r} className={'minibtn' + (roleFilter === r ? ' active' : '')} onClick={() => setRoleFilter(roleFilter === r ? '' : r)} title={`역할: ${r}`}>{r}</button>
          ))}
        </div>
      )}

      {/* 본문: 좌측 카드 보드 + (선택 시) 우측 상세 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, overflow: 'hidden' }}>
        {/* 카드/리스트 보드 */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: 2 }}>
          {visible.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16, lineHeight: 1.7 }}>
              조건에 맞는 인물이 없습니다.<br />검색어나 역할 필터를 바꿔 보세요.
            </div>
          ) : view === 'card' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8 }}>
              {visible.map((c) => {
                const photo = (c.photo && !brokenImg[c.id]) ? c.photo : avatarFor(c)
                const isAvatar = !(c.photo && !brokenImg[c.id])
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelId(c.id === selId ? null : c.id)}
                    title={`${c.name || '이름 없음'}${c.role ? ' · ' + c.role : ''}`}
                    style={{
                      display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0, cursor: 'pointer',
                      background: 'var(--panel)', border: '1px solid ' + (selId === c.id ? 'var(--accent)' : 'var(--border)'),
                      borderRadius: 10, overflow: 'hidden', color: 'var(--text)',
                      boxShadow: selId === c.id ? '0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent)' : 'none',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={photo}
                        alt={c.name || '인물'}
                        loading="lazy"
                        onError={() => { if (c.photo && !brokenImg[c.id]) setBrokenImg((b) => ({ ...b, [c.id]: true })) }}
                        style={cardImg}
                      />
                      {isAvatar && <span className="license-badge" style={{ position: 'absolute', left: 4, bottom: 4, background: 'var(--accent)' }}>아바타</span>}
                    </div>
                    <div style={{ padding: '5px 7px 7px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || '이름 없음'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role || '역할 미정'}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visible.map((c) => {
                const photo = (c.photo && !brokenImg[c.id]) ? c.photo : avatarFor(c)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelId(c.id === selId ? null : c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: 'pointer',
                      background: selId === c.id ? 'var(--chrome-2)' : 'var(--panel)',
                      border: '1px solid ' + (selId === c.id ? 'var(--accent)' : 'var(--border)'),
                      borderRadius: 8, padding: '5px 8px', color: 'var(--text)',
                    }}
                  >
                    <img
                      src={photo} alt={c.name || '인물'} loading="lazy"
                      onError={() => { if (c.photo && !brokenImg[c.id]) setBrokenImg((b) => ({ ...b, [c.id]: true })) }}
                      style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'var(--chrome-2)' }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || '이름 없음'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.role || '역할 미정'}{traitsOf(c).length ? ` · 특성 ${traitsOf(c).length}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>›</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div style={{ width: 250, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>인물 상세</span>
              <button className="minibtn" onClick={() => setSelId(null)} title="닫기">✕</button>
            </div>
            {(() => {
              const c = selected
              const photo = (c.photo && !brokenImg[c.id]) ? c.photo : avatarFor(c)
              const isAvatar = !(c.photo && !brokenImg[c.id])
              const ts = traitsOf(c)
              return (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={photo} alt={c.name || '인물'}
                      onError={() => { if (c.photo && !brokenImg[c.id]) setBrokenImg((b) => ({ ...b, [c.id]: true })) }}
                      style={{ width: 120, height: 120, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)', background: 'var(--chrome-2)' }}
                    />
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{c.name || '이름 없음'}</div>
                    {c.role && <div style={{ fontSize: 12, color: 'var(--accent)' }}>{c.role}</div>}
                    <div className="license-note" style={{ marginTop: 2 }}>
                      {isAvatar ? 'DiceBear 오픈소스 아바타' : (c.photoCredit || '사진 출처 미상')}
                    </div>
                  </div>

                  {/* 주요 서술 필드 */}
                  {([['외모', c.appearance], ['성격', c.personality], ['목표', c.goal], ['비밀', c.secret], ['메모', c.notes]] as [string, string | undefined][])
                    .filter(([, v]) => str(v).trim())
                    .map(([label, v]) => (
                      <div key={label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 8px' }}>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</div>
                      </div>
                    ))}

                  {/* 특성 표 */}
                  {ts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>특성 {ts.length}</div>
                      {ts.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11.5, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px' }}>
                          <span style={{ color: 'var(--muted)', flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{str(t.k)}</span>
                          <span style={{ flex: 1, wordBreak: 'break-word' }}>{str(t.v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!ts.length && !str(c.appearance) && !str(c.personality) && !str(c.goal) && !str(c.secret) && !str(c.notes) && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      이 인물에는 아직 특성이 없습니다. ‘인물 시트로’ 보내 자세히 채워 보세요.
                    </div>
                  )}

                  {c.source && <div className="license-note">출처: {c.source}</div>}

                  {/* 상세 액션 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => toSheet(c)}><Emoji e="🪪"/> 인물 시트로</button>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="minibtn" style={{ flex: 1 }} onClick={() => copyChar(c)}><Emoji e="📋"/> 복사</button>
                      <button className="minibtn" style={{ flex: 1 }} onClick={() => toProject(c)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 › 인물에 카드 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                    </div>
                    <button
                      className={'minibtn' + (confirmDel === c.id ? ' danger' : '')}
                      style={{ width: '100%', color: confirmDel === c.id ? 'var(--warn)' : 'var(--muted)' }}
                      onClick={() => doDelete(c)}
                      onMouseLeave={() => { if (confirmDel === c.id) setConfirmDel(null) }}
                    >
                      {confirmDel === c.id ? <>정말 삭제할까요? (다시 클릭)</> : <><Emoji e="🗑"/> 라이브러리에서 삭제</>}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* 하단: 개수/연계 도구 바 */}
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)', flexShrink: 0, minHeight: 15 }}>
        {toast || `인물 ${total}명 중 ${visible.length}명 표시${roleFilter ? ` · 역할: ${roleFilter}` : ''}`}
      </div>
      {related.length > 0 && (
        <div className="linkbar" style={{ flexShrink: 0 }}>
          <span className="linkbar-label">연계</span>
          {related.map((rid) => (
            <button key={rid} className="linkbtn" onClick={() => openToolLinked(rid)} title="관련 도구 열기">{emojify(RELATED_LABEL[rid] || rid)}</button>
          ))}
        </div>
      )}
      <div className="license-note" style={{ flexShrink: 0 }}>
        사진이 없는 인물은 저작권 안전한 DiceBear 오픈소스 아바타로 자동 표시됩니다(원본 라이브러리는 변경되지 않음).
      </div>
    </div>
  )
}
