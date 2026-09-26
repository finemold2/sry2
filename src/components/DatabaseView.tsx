// 데이터베이스(엑셀식) 뷰 — 모든 바인더 요소를 한 표로 보고 인라인 편집한다.
// 캐릭터·문서·폴더·메모/조각글까지 행으로, 제목·유형·라벨·상태·단어수·POV·무드·회차·시놉시스·커스텀필드를 열로.
// 열 정렬·유형/위치 필터·검색·인라인 편집(Notion/Airtable 식). 더블클릭으로 문서 열기.
// 엑셀식 보강: 행 다중 선택(체크박스+Shift 범위)·일괄 작업 바·라벨/상태/발행 헤더 필터·전 열 정렬·빈 결과 원인 안내.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useStore } from '../store/store'
import type { BinderItem, Project } from '../model'
import { episodeStatePatch } from '../model'
import { Icon } from '../ui/icons'

const POV_KEY = 'pov'
const MOOD_KEY = 'mood'
const STORYTIME_KEY = 'storyTime'

type Scope = 'all' | 'draft' | 'research' | 'character' | 'trash'
type SortKey =
  | 'title' | 'type' | 'label' | 'status' | 'words' | 'chars' | 'episode' | 'modified'
  | 'pov' | 'mood' | 'storyTime' | 'pubState' | `cf:${string}`

const TYPE_LABEL: Record<string, { icon: string; label: string }> = {
  folder: { icon: 'binder', label: '폴더' },
  text: { icon: 'editor', label: '문서' },
  character: { icon: 'character', label: '인물' },
  image: { icon: 'image', label: '이미지' },
  pdf: { icon: 'book', label: 'PDF' },
  file: { icon: 'reference', label: '파일' },
}
const PUB_LABEL: Record<string, string> = { draft: '초안', ready: '완성', scheduled: '예약', published: '발행됨' }
// 발행 상태 정렬 순서(파이프라인 진행 순) — 미지정은 맨 뒤
const PUB_ORDER: Record<string, number> = { draft: 0, ready: 1, scheduled: 2, published: 3 }

function rootOf(project: Project, id: string): string | null {
  let cur: string | null = id
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break // 손상 데이터의 부모 순환 방지
    seen.add(cur)
    const it: BinderItem | undefined = project.items[cur]
    if (!it) break
    if (it.root) return it.root
    cur = it.parentId
  }
  return null
}

const flash = (msg: string) => window.dispatchEvent(new CustomEvent('scriv:flash', { detail: msg }))

export default function DatabaseView() {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const renameItem = useStore((s) => s.renameItem)
  const setLabel = useStore((s) => s.setLabel)
  const setStatus = useStore((s) => s.setStatus)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const setCustomMeta = useStore((s) => s.setCustomMeta)
  const setEpisodeMeta = useStore((s) => s.setEpisodeMeta)

  const [scope, setScope] = useState<Scope>('all')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [sort, setSort] = useState<SortKey>('title')
  const [asc, setAsc] = useState(true)
  // 헤더 필터(라벨/상태/발행) — '' 는 전체
  const [fLabel, setFLabel] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPub, setFPub] = useState('')
  // 행 다중 선택(체크박스). Shift 범위 선택의 기준(마지막 클릭) 행 id
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const lastPicked = useRef<string | null>(null)
  // 검색어 디바운스(키 입력당 전체 재계산 방지)
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 200); return () => clearTimeout(t) }, [q])

  const customFields = project.customFields || []

  // 항목→루트 캐시(프로젝트 변경 시 1회) — filter 에서 조상 추적 반복 제거
  const rootMap = useMemo(() => {
    const m: Record<string, string | null> = {}
    for (const id of Object.keys(project.items)) m[id] = rootOf(project, id)
    return m
  }, [project])

  const rows = useMemo(() => {
    const all = Object.values(project.items).filter((it) => !it.root)
    const ql = debouncedQ.trim().toLowerCase()
    let list = all.filter((it) => {
      if (scope === 'character') return it.type === 'character'
      const r = rootMap[it.id]
      if (scope === 'draft') return r === 'draft'
      if (scope === 'research') return r === 'research'
      if (scope === 'trash') return r === 'trash'
      return r !== 'trash' // all: 휴지통 제외
    })
    // 헤더 필터 체인(라벨/상태/발행)
    if (fLabel) list = list.filter((it) => (it.labelId || 'label-none') === fLabel)
    if (fStatus) list = list.filter((it) => (it.statusId || 'status-none') === fStatus)
    if (fPub) list = list.filter((it) => (fPub === 'none' ? !it.episode?.state : it.episode?.state === fPub))
    if (ql) list = list.filter((it) => (it.title + ' ' + it.synopsis + ' ' + (it.plainText || '')).toLowerCase().includes(ql))
    const labelName = (id: string | null) => project.labels.find((l) => l.id === id)?.name || ''
    const statusName = (id: string | null) => project.statuses.find((s) => s.id === id)?.name || ''
    const val = (it: BinderItem): string | number => {
      if (sort.startsWith('cf:')) return it.customMeta?.[sort.slice(3)] || ''
      switch (sort) {
        case 'title': return it.title || ''
        case 'type': return it.type
        case 'label': return labelName(it.labelId)
        case 'status': return statusName(it.statusId)
        case 'words': return it.wordCount
        case 'chars': return it.charCount
        case 'episode': return it.episode?.number ?? 9e9
        case 'modified': return it.modified
        case 'pov': return it.customMeta?.[POV_KEY] || ''
        case 'mood': return it.customMeta?.[MOOD_KEY] || ''
        case 'storyTime': return it.customMeta?.[STORYTIME_KEY] || ''
        case 'pubState': return PUB_ORDER[it.episode?.state || ''] ?? 9
        default: return ''
      }
    }
    const sorted = [...list].sort((a, b) => {
      const va = val(a), vb = val(b)
      // 문자열은 자연 정렬(숫자 인식 — '3장' < '12장', 스토리시간 'Day 2' < 'Day 10')
      let c: number
      if (typeof va === 'string' && typeof vb === 'string') c = va.localeCompare(vb, 'ko', { numeric: true })
      else c = va < vb ? -1 : va > vb ? 1 : 0
      return asc ? c : -c
    })
    return sorted
  }, [project, scope, debouncedQ, sort, asc, rootMap, fLabel, fStatus, fPub])

  // 필터/검색으로 화면에서 사라진 행은 선택에서도 제외 — '3개 선택'과 보이는 것의 불일치 방지
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const vis = new Set(rows.map((r) => r.id))
      let changed = false
      const next = new Set<string>()
      prev.forEach((id) => { if (vis.has(id)) next.add(id); else changed = true })
      return changed ? next : prev
    })
  }, [rows])

  const clickSort = (k: SortKey) => { if (sort === k) setAsc((v) => !v); else { setSort(k); setAsc(true) } }
  const arrow = (k: SortKey) => (sort === k ? (asc ? ' ▲' : ' ▼') : '')

  // 행 체크박스 토글(Shift 클릭이면 마지막 클릭 행과의 범위 전체를 클릭 행의 새 상태로 일괄 적용)
  const toggleRow = (id: string, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && lastPicked.current && lastPicked.current !== id) {
        const ia = rows.findIndex((r) => r.id === lastPicked.current)
        const ib = rows.findIndex((r) => r.id === id)
        if (ia >= 0 && ib >= 0) {
          const on = !prev.has(id)
          const [s, e] = ia < ib ? [ia, ib] : [ib, ia]
          for (let i = s; i <= e; i++) { if (on) next.add(rows[i].id); else next.delete(rows[i].id) }
          return next
        }
      }
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    lastPicked.current = id
  }

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someVisibleSelected = rows.some((r) => selected.has(r.id))
  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((r) => r.id)))
    lastPicked.current = null
  }

  // ── 일괄 작업(선택 전체에 기존 스토어 액션을 반복 적용 — 항목별 개별 갱신이라 안전) ──
  const bulkLabel = (labelId: string) => {
    const ids = [...selected]
    ids.forEach((id) => setLabel(id, labelId))
    flash(`${ids.length}건 라벨 변경`)
  }
  const bulkStatus = (statusId: string) => {
    const ids = [...selected]
    ids.forEach((id) => setStatus(id, statusId))
    flash(`${ids.length}건 상태 변경`)
  }
  const bulkPub = (v: string) => {
    const state = (v === 'none' ? undefined : v) as 'draft' | 'ready' | 'scheduled' | 'published' | undefined
    let applied = 0, skipped = 0
    selected.forEach((id) => {
      const it = project.items[id]
      // 발행 상태는 원고(draft 루트) 텍스트 문서에만 의미가 있다 — 자료/인물 등은 건너뜀
      if (!it || !(it.type === 'text' && rootMap[id] === 'draft')) { skipped++; return }
      setEpisodeMeta(id, episodeStatePatch(it, state))
      applied++
    })
    flash(skipped ? `${applied}건 발행 상태 변경 (원고 아님 ${skipped}건 제외)` : `${applied}건 발행 상태 변경`)
  }

  const hasFilter = !!(debouncedQ.trim() || fLabel || fStatus || fPub)
  const clearFilters = () => { setQ(''); setDebouncedQ(''); setFLabel(''); setFStatus(''); setFPub('') }

  // 헤더 필터 셀렉트 공통 스타일(활성 시 강조 테두리)
  const filterSel = (active: boolean): CSSProperties => ({
    fontSize: 11, maxWidth: 76, padding: '0 2px', cursor: 'pointer',
    background: 'var(--paper)', color: 'var(--text)', borderRadius: 4,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
  })

  const SCOPES: { key: Scope; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'draft', label: '원고' }, { key: 'research', label: '자료' },
    { key: 'character', label: '인물' }, { key: 'trash', label: '휴지통' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border-dark)', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>데이터베이스</strong>
        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
        {SCOPES.map((s) => (
          <button key={s.key} className={'minibtn' + (scope === s.key ? ' active' : '')} onClick={() => setScope(s.key)}>{s.label}</button>
        ))}
        <input className="field" placeholder="검색…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginLeft: 8, width: 200 }} />
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
          {rows.length}개 항목{hasFilter ? ' · 필터 적용 중' : ''}
        </span>
      </div>
      {selected.size > 0 && (
        <div data-testid="db-bulk-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid var(--border-dark)', background: 'color-mix(in srgb, var(--accent) 8%, var(--bg))', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 12.5 }}>{selected.size}개 선택</strong>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          <select className="field" value="" onChange={(e) => { if (e.target.value) bulkLabel(e.target.value) }} title="선택 항목 전체의 라벨을 지정합니다">
            <option value="">라벨 일괄…</option>
            {project.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="field" value="" onChange={(e) => { if (e.target.value) bulkStatus(e.target.value) }} title="선택 항목 전체의 상태를 지정합니다">
            <option value="">상태 일괄…</option>
            {project.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="field" value="" onChange={(e) => { if (e.target.value) bulkPub(e.target.value) }} title="선택 항목 중 원고 문서의 발행 상태를 지정합니다(자료·인물은 제외)">
            <option value="">발행 일괄…</option>
            {Object.entries(PUB_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            <option value="none">— (해제)</option>
          </select>
          <button className="minibtn" onClick={() => { setSelected(new Set()); lastPicked.current = null }}>선택 해제</button>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="db-table">
          <thead>
            <tr>
              <th style={{ width: 34, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected }}
                  onChange={toggleAll}
                  title="현재 표시된 행 전체 선택/해제"
                  style={{ cursor: 'pointer', margin: 0, verticalAlign: 'middle' }}
                />
              </th>
              <th onClick={() => clickSort('title')} style={{ minWidth: 200, cursor: 'pointer' }}>제목{arrow('title')}</th>
              <th onClick={() => clickSort('type')} style={{ cursor: 'pointer' }}>유형{arrow('type')}</th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => clickSort('label')} style={{ cursor: 'pointer' }}>라벨{arrow('label')}</span>
                  <select value={fLabel} onClick={(e) => e.stopPropagation()} onChange={(e) => setFLabel(e.target.value)} title="라벨로 필터" style={filterSel(!!fLabel)}>
                    <option value="">전체</option>
                    {project.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => clickSort('status')} style={{ cursor: 'pointer' }}>상태{arrow('status')}</span>
                  <select value={fStatus} onClick={(e) => e.stopPropagation()} onChange={(e) => setFStatus(e.target.value)} title="상태로 필터" style={filterSel(!!fStatus)}>
                    <option value="">전체</option>
                    {project.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </th>
              <th onClick={() => clickSort('words')} style={{ cursor: 'pointer', textAlign: 'right' }}>단어{arrow('words')}</th>
              <th onClick={() => clickSort('chars')} style={{ cursor: 'pointer', textAlign: 'right' }}>글자{arrow('chars')}</th>
              <th onClick={() => clickSort('pov')} style={{ cursor: 'pointer' }}>POV{arrow('pov')}</th>
              <th onClick={() => clickSort('mood')} style={{ cursor: 'pointer' }}>무드{arrow('mood')}</th>
              <th onClick={() => clickSort('storyTime')} style={{ cursor: 'pointer' }}>스토리시간{arrow('storyTime')}</th>
              <th onClick={() => clickSort('episode')} style={{ cursor: 'pointer' }}>회차{arrow('episode')}</th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span onClick={() => clickSort('pubState')} style={{ cursor: 'pointer' }}>발행{arrow('pubState')}</span>
                  <select value={fPub} onClick={(e) => e.stopPropagation()} onChange={(e) => setFPub(e.target.value)} title="발행 상태로 필터" style={filterSel(!!fPub)}>
                    <option value="">전체</option>
                    {Object.entries(PUB_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    <option value="none">미지정</option>
                  </select>
                </div>
              </th>
              <th style={{ minWidth: 240 }}>시놉시스</th>
              {customFields.map((f) => (
                <th key={f.id} onClick={() => clickSort(`cf:${f.id}`)} style={{ minWidth: 120, cursor: 'pointer' }}>{f.name}{arrow(`cf:${f.id}`)}</th>
              ))}
              <th onClick={() => clickSort('modified')} style={{ cursor: 'pointer' }}>수정{arrow('modified')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              // 회차·발행은 '발행 단위'인 원고(draft 루트) 텍스트 문서에만 의미가 있다.
              // 자료/메모 등에는 회차를 매기지 못하게 비활성화해 연재 대시보드와 단위를 맞춘다.
              const isEpisodic = it.type === 'text' && rootMap[it.id] === 'draft'
              const isSel = selected.has(it.id)
              // 선택 행 배경(인라인이라 styles.css 수정 없이 td 기본 배경을 덮음)
              const selBg = isSel ? 'color-mix(in srgb, var(--accent) 10%, var(--paper))' : undefined
              return (
              <tr key={it.id} onDoubleClick={() => { if (it.type === 'text' || it.type === 'character') { select(it.id); setView('editor') } }}>
                <td style={{ textAlign: 'center', background: selBg }} onDoubleClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => { /* 토글은 onClick 에서 Shift 여부와 함께 처리 */ }}
                    onClick={(e) => toggleRow(it.id, e.shiftKey)}
                    onMouseDown={(e) => { if (e.shiftKey) e.preventDefault() }} // Shift 클릭 시 텍스트 선택 방지
                    title="선택 (Shift+클릭: 범위 선택)"
                    style={{ margin: '6px 8px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ background: selBg }}>
                  <input className="db-cell" style={{ fontWeight: 600 }} defaultValue={it.title} key={it.title} onBlur={(e) => { const v = e.target.value.trim(); if (!v) { e.target.value = it.title; return } if (v !== it.title) renameItem(it.id, v) }} />
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', background: selBg }}>
                  {TYPE_LABEL[it.type]
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={TYPE_LABEL[it.type].icon} size={14} mono />{TYPE_LABEL[it.type].label}</span>
                    : it.type}
                </td>
                <td style={{ background: selBg }}>
                  <select className="db-cell" value={it.labelId || 'label-none'} onChange={(e) => setLabel(it.id, e.target.value)}>
                    {project.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                <td style={{ background: selBg }}>
                  <select className="db-cell" value={it.statusId || 'status-none'} onChange={(e) => setStatus(it.id, e.target.value)}>
                    {project.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', background: selBg }}>{it.wordCount.toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', background: selBg }}>{it.charCount.toLocaleString()}</td>
                <td style={{ background: selBg }}><input className="db-cell" defaultValue={it.customMeta?.[POV_KEY] || ''} key={'pov' + (it.customMeta?.[POV_KEY] || '')} onBlur={(e) => e.target.value !== (it.customMeta?.[POV_KEY] || '') && setCustomMeta(it.id, POV_KEY, e.target.value)} /></td>
                <td style={{ background: selBg }}><input className="db-cell" defaultValue={it.customMeta?.[MOOD_KEY] || ''} key={'mood' + (it.customMeta?.[MOOD_KEY] || '')} onBlur={(e) => e.target.value !== (it.customMeta?.[MOOD_KEY] || '') && setCustomMeta(it.id, MOOD_KEY, e.target.value)} style={{ width: 50 }} /></td>
                <td style={{ background: selBg }}><input className="db-cell" defaultValue={it.customMeta?.[STORYTIME_KEY] || ''} key={'st' + (it.customMeta?.[STORYTIME_KEY] || '')} onBlur={(e) => e.target.value !== (it.customMeta?.[STORYTIME_KEY] || '') && setCustomMeta(it.id, STORYTIME_KEY, e.target.value)} /></td>
                <td style={{ background: selBg }}>
                  {isEpisodic ? (
                    <input
                      type="number"
                      className="db-cell"
                      defaultValue={it.episode?.number ?? ''}
                      key={'ep' + (it.episode?.number ?? '')}
                      onBlur={(e) => {
                        const raw = e.target.value.trim()
                        const next = raw === '' ? undefined : Number(raw)
                        if (raw !== '' && !Number.isFinite(next)) { e.target.value = String(it.episode?.number ?? ''); return }
                        if (next !== (it.episode?.number ?? undefined)) setEpisodeMeta(it.id, { number: next })
                      }}
                      style={{ width: 60, textAlign: 'right' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--muted)', opacity: 0.5 }} title="회차는 원고(초고) 문서에만 매길 수 있습니다.">—</span>
                  )}
                </td>
                <td style={{ background: selBg }}>
                  {isEpisodic ? (
                    <select
                      className="db-cell"
                      value={it.episode?.state || ''}
                      onChange={(e) => {
                        const state = (e.target.value || undefined) as ('draft' | 'ready' | 'scheduled' | 'published' | undefined)
                        setEpisodeMeta(it.id, episodeStatePatch(it, state))
                      }}
                    >
                      <option value="">—</option>
                      {Object.entries(PUB_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                  ) : (
                    <span style={{ color: 'var(--muted)', opacity: 0.5 }} title="발행 상태는 원고(초고) 문서에만 설정할 수 있습니다.">—</span>
                  )}
                </td>
                <td style={{ background: selBg }}><input className="db-cell" defaultValue={it.synopsis} key={'syn' + it.synopsis} onBlur={(e) => e.target.value !== it.synopsis && setSynopsis(it.id, e.target.value)} placeholder="…" /></td>
                {customFields.map((f) => (
                  <td key={f.id} style={{ background: selBg }}><input className="db-cell" defaultValue={it.customMeta?.[f.id] || ''} key={f.id + (it.customMeta?.[f.id] || '')} onBlur={(e) => e.target.value !== (it.customMeta?.[f.id] || '') && setCustomMeta(it.id, f.id, e.target.value)} /></td>
                ))}
                <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 11, background: selBg }}>{new Date(it.modified).toLocaleDateString()}</td>
              </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14 + customFields.length} style={{ color: 'var(--muted)', padding: 24, textAlign: 'center' }}>
                  {hasFilter ? (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span>조건에 맞는 항목이 없습니다 — 검색어나 필터 때문일 수 있어요.</span>
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="minibtn" onClick={clearFilters}>필터·검색 해제</button>
                        {scope !== 'all' && <button className="minibtn" onClick={() => setScope('all')}>전체 보기</button>}
                      </span>
                    </span>
                  ) : (
                    '표시할 항목이 없습니다.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
