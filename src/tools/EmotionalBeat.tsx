// 감정 비트 설계 — "모든 장면은 감정을 바꾼다" 원칙을 점검하는 도구.
//  각 장면마다 [시작 감정] → [사건] → [끝 감정] 을 기록하고, 시작=끝(변화 없음) 이면 경고한다.
//  장면 CRUD(추가/편집/삭제/순서이동), 감정 전환 칩 시각화, 전체 점검 요약, 텍스트 복사.
// 자급식: react 외 import 없음(프로젝트 브리지는 './linkbus'). 전부 로컬. 외부 네트워크 없음.
// localStorage 'sry:tool:emotional-beat' 에 자동 저장/복원. 미지원/차단 시 graceful.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = { id: 'emotional-beat', name: '감정 비트 설계', icon: '💓', group: '구상·정리', intro: '장면마다 시작 감정→사건→끝 감정을 기록해 "모든 장면은 감정을 바꾼다" 원칙을 점검하세요', w: 700, h: 600 }

const LS_KEY = 'sry:tool:emotional-beat'

// ── 데이터 모델 ───────────────────────────────────────────────────────────────
interface Beat {
  id: string
  title: string     // 장면 이름
  startEmotion: string
  event: string     // 사건(전환의 계기)
  endEmotion: string
  note: string
  createdAt: number
  updatedAt: number
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* ignore */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
function emptyBeat(): Omit<Beat, 'id' | 'createdAt' | 'updatedAt'> {
  return { title: '', startEmotion: '', event: '', endEmotion: '', note: '' }
}
// 감정 비교: 공백/대소문자 정규화 후 비교(시작=끝 이면 변화 없음).
function norm(s: string): string { return s.trim().toLowerCase().replace(/\s+/g, ' ') }
// 변화 없음 판정: 둘 다 채워졌고, 정규화 결과가 같을 때.
function isFlat(b: Beat): boolean {
  const a = norm(b.startEmotion), c = norm(b.endEmotion)
  return !!a && !!c && a === c
}
// 미완성(감정 두 칸 중 하나 이상 비어 변화 판정 불가).
function isIncomplete(b: Beat): boolean {
  return !norm(b.startEmotion) || !norm(b.endEmotion)
}

// 첫 사용자에게 보여줄 예시 장면(저장 데이터가 전혀 없을 때만 시드).
function seedBeats(): Beat[] {
  const now = Date.now()
  const make = (s: Partial<Beat>, i: number): Beat => ({
    id: newId(), title: '', startEmotion: '', event: '', endEmotion: '', note: '',
    ...s, createdAt: now + i, updatedAt: now + i,
  })
  return [
    make({ title: '항구 도착', startEmotion: '기대', event: '아무도 입을 열지 않는다', endEmotion: '불안', note: '낯선 마을의 적막' }, 0),
    make({ title: '등대에서의 첫 밤', startEmotion: '불안', event: '등대지기의 침묵', endEmotion: '의심', note: '관계의 긴장 시작' }, 1),
    make({ title: '폭풍 전야', startEmotion: '의심', event: '과거의 단서를 발견', endEmotion: '결심', note: '진실로 한 발' }, 2),
  ]
}

// localStorage 읽기 — 미지원/차단/손상 시 graceful. 구조 검증으로 끌어올림.
function loadBeats(): { beats: Beat[]; seeded: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw == null) return { beats: seedBeats(), seeded: true }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { beats: seedBeats(), seeded: true }
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const beats: Beat[] = []
    for (const o of parsed) {
      if (!o || typeof o !== 'object') continue
      beats.push({
        id: String(o.id || newId()),
        title: str(o.title),
        startEmotion: str(o.startEmotion),
        event: str(o.event),
        endEmotion: str(o.endEmotion),
        note: str(o.note),
        createdAt: Number(o.createdAt) || Date.now(),
        updatedAt: Number(o.updatedAt) || Date.now(),
      })
    }
    // 빈 배열은 사용자가 모두 지운 결과일 수 있으므로 그대로 존중(시드하지 않음).
    return { beats, seeded: false }
  } catch {
    return { beats: seedBeats(), seeded: true }
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function EmotionalBeat({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<{ beats: Beat[]; seeded: boolean }>()
  if (!initial.current) initial.current = loadBeats()

  const [beats, setBeats] = useState<Beat[]>(initial.current.beats)
  const [note, setNote] = useState(initial.current.seeded ? '예시 장면을 채워 두었어요. 자유롭게 수정하거나 지우세요.' : '')
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  // 변화 없는(평탄) 장면만 보기 토글.
  const [onlyFlat, setOnlyFlat] = useState(false)

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 로 장면 제목 프리필(연계 진입 시) — 한 번만.
  const seededFromPayload = useRef(false)
  useEffect(() => {
    if (seededFromPayload.current) return
    const t = payload && typeof payload.title === 'string' ? payload.title.trim() : ''
    if (t) {
      seededFromPayload.current = true
      const now = Date.now()
      setBeats((prev) => [...prev, { id: newId(), ...emptyBeat(), title: t, createdAt: now, updatedAt: now }])
      setEditing((prev) => prev) // 추가만; 편집 모달은 사용자가 열도록
    }
  }, [payload])

  // 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(beats)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 초기화될 수 있어요.') }
  }, [beats])

  // 토스트 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    return () => window.clearTimeout(t)
  }, [copied])
  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2200)
    return () => window.clearTimeout(t)
  }, [saved])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const upsert = useCallback((id: string | 'new', data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => {
    const title = data.title.trim()
    if (!title) return
    const clean = {
      title,
      startEmotion: data.startEmotion.trim(),
      event: data.event.trim(),
      endEmotion: data.endEmotion.trim(),
      note: data.note.trim(),
    }
    setBeats((prev) => {
      if (id === 'new') {
        const now = Date.now()
        return [...prev, { id: newId(), ...clean, createdAt: now, updatedAt: now }]
      }
      return prev.map((b) => (b.id === id ? { ...b, ...clean, updatedAt: Date.now() } : b))
    })
    setEditing(null)
  }, [])

  const remove = useCallback((id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id))
    setConfirmDel(null)
  }, [])

  const move = useCallback((id: string, dir: -1 | 1) => {
    setBeats((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  // ── 점검 집계 ─────────────────────────────────────────────────────────────────
  const total = beats.length
  const flatN = beats.filter(isFlat).length          // 변화 없음(시작=끝)
  const incN = beats.filter(isIncomplete).length     // 미완성(감정 미입력)
  const goodN = total - flatN - incN                  // 감정이 바뀐 장면
  const pct = total > 0 ? Math.round((goodN / total) * 100) : 0

  const visible = onlyFlat ? beats.filter(isFlat) : beats

  // ── 내보내기/복사 ─────────────────────────────────────────────────────────────
  const buildText = useCallback((): string => {
    const lines: string[] = ['# 감정 비트 설계', `총 ${total}개 장면 · 감정 변화 ${goodN} · 변화 없음 ${flatN} · 미완성 ${incN}`, '']
    beats.forEach((b, i) => {
      const flag = isFlat(b) ? '  ⚠ 변화 없음' : isIncomplete(b) ? '  · 미완성' : ''
      lines.push(`## ${i + 1}. ${b.title}${flag}`)
      lines.push(`   ${b.startEmotion || '?'} → (${b.event || '사건 미입력'}) → ${b.endEmotion || '?'}`)
      if (b.note) lines.push(`   메모: ${b.note}`)
      lines.push('')
    })
    return lines.join('\n').trimEnd() + '\n'
  }, [beats, total, goodN, flatN, incN])

  const copyAll = useCallback(() => {
    if (!total) { setNote('내보낼 장면이 없어요. 먼저 장면을 추가하세요.'); return }
    const text = buildText()
    const ok = () => { if (mounted.current) setCopied(true) }
    const fail = () => { if (mounted.current) setNote('클립보드 복사가 막혀 있어요. 브라우저 권한을 확인해 주세요.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok).catch(fail)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        ok()
      }
    } catch { fail() }
  }, [total, buildText])

  // ── 프로젝트 연동: 감정 비트표를 자료 「구조」 폴더에 한 문서로 추가 ─────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = useCallback((): string => {
    const parts: string[] = []
    parts.push(`<p><strong>감정 비트 설계</strong> · 장면 ${total}개 · 감정 변화 ${goodN} · 변화 없음 ${flatN} · 미완성 ${incN}</p>`)
    parts.push('<ol>')
    beats.forEach((b, i) => {
      const arrow = `${esc(b.startEmotion || '?')} → <em>${esc(b.event || '사건 미입력')}</em> → ${esc(b.endEmotion || '?')}`
      const flag = isFlat(b) ? ' <strong>[⚠ 변화 없음]</strong>' : isIncomplete(b) ? ' [미완성]' : ''
      parts.push(`<li><strong>${esc(b.title || `장면 ${i + 1}`)}</strong>${flag}<br />${arrow}${b.note ? `<br /><span>메모: ${esc(b.note)}</span>` : ''}</li>`)
    })
    parts.push('</ol>')
    if (flatN > 0) parts.push(`<p><strong>점검:</strong> 감정이 바뀌지 않는 장면이 ${flatN}개 있습니다. 모든 장면은 감정을 바꿔야 합니다 — 사건이나 끝 감정을 다듬어 보세요.</p>`)
    else if (incN > 0) parts.push(`<p><strong>점검:</strong> 감정 입력이 미완성인 장면이 ${incN}개 있습니다.</p>`)
    else if (total > 0) parts.push(`<p><strong>점검:</strong> 모든 장면이 감정을 바꿉니다. 좋은 흐름이에요.</p>`)
    return parts.join('')
  }, [beats, total, goodN, flatN, incN])

  const toProject = useCallback(() => {
    if (!total) { setNote('추가할 장면이 없어요. 먼저 장면을 만드세요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '감정 비트 설계',
      bodyHtml: buildHtml(),
      meta: { 장면수: String(total), 감정변화: String(goodN), 변화없음: String(flatN), 미완성: String(incN) },
    })
    if (!mounted.current) return
    if (id) setSaved(true)
    else setNote('프로젝트에 추가하지 못했어요.')
  }, [total, goodN, flatN, incN, buildHtml])

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden', background: 'var(--paper)' }
  const toolbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--chrome-2)' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? `color-mix(in srgb, ${color} 18%, var(--paper))` : 'var(--paper)',
    color: 'var(--text)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  })
  const mini: React.CSSProperties = { padding: '3px 9px', fontSize: 11.5, lineHeight: 1.2 }

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={toolbar}>
        <span style={{ fontSize: 18 }} aria-hidden><Emoji e="💓" /></span>
        <button className="btn-primary" onClick={() => setEditing('new')} title="새 장면 추가">＋ 장면 추가</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={copyAll} title="전체를 텍스트로 복사">{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || total === 0}
          title={!hasProjectBridge() ? '프로젝트에 연결되지 않았습니다' : (total === 0 ? '추가할 장면이 없습니다' : '자료 › 구조 폴더에 감정 비트표 문서로 추가')}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {/* 점검 집계 막대 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>전체 {total}개 장면</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>감정 변화 {goodN}/{total} · {pct}%</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Emoji e="💞" /> 변화 <strong>{goodN}</strong></span>
          <span style={{ fontSize: 11.5, color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Emoji e="⚠" /> 변화 없음 <strong>{flatN}</strong></span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>· 미완성 <strong>{incN}</strong></span>
        </div>
        {/* 진행 게이지(감정이 바뀐 장면 비율) */}
        <div style={{ height: 7, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }} title={`감정 변화 ${pct}%`}>
          <div style={{ width: `${pct}%`, height: '100%', background: flatN > 0 ? 'var(--warn)' : 'var(--ok)', transition: 'width .25s ease' }} />
        </div>
        {/* 원칙 점검 한 줄 */}
        <div style={{ fontSize: 12, lineHeight: 1.5, color: flatN > 0 ? 'var(--warn)' : 'var(--muted)' }}>
          {total === 0
            ? '“모든 장면은 감정을 바꾼다” — 장면을 추가해 시작 감정과 끝 감정을 적어 보세요.'
            : flatN > 0
              ? <><Emoji e="⚠" /> {`감정이 바뀌지 않는 장면이 ${flatN}개 있어요. 시작 감정과 끝 감정이 같다면 그 장면은 정말 필요한지 점검하세요.`}</>
              : incN > 0
                ? `감정 입력이 미완성인 장면이 ${incN}개 있어요. 시작·끝 감정을 모두 채우면 변화 여부를 점검할 수 있어요.`
                : '✓ 모든 장면이 감정을 바꿉니다. “모든 장면은 감정을 바꾼다” 원칙을 잘 지키고 있어요.'}
        </div>
        {/* 필터 */}
        {total > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>보기</span>
            <button style={chip(!onlyFlat, 'var(--accent)')} onClick={() => setOnlyFlat(false)}>전체 {total}</button>
            <button style={chip(onlyFlat, 'var(--warn)')} onClick={() => setOnlyFlat(true)} disabled={flatN === 0} title={flatN === 0 ? '변화 없는 장면이 없습니다' : '변화 없는 장면만 보기'}><Emoji e="⚠" /> 변화 없음 {flatN}</button>
          </div>
        )}
      </div>

      {saved && <div style={{ fontSize: 12, color: 'var(--ok)', padding: '6px 12px', flexShrink: 0 }}>✓ 프로젝트 자료(구조)에 감정 비트표 문서를 추가했어요.</div>}
      {note && (
        <div style={{ fontSize: 12, color: 'var(--warn)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span>{note}</span>
          <button className="minibtn" onClick={() => setNote('')} aria-label="안내 닫기">✕</button>
        </div>
      )}

      {/* 장면 목록 (스크롤 본문) */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', gap: 10, padding: 24 }}>
            <div style={{ fontSize: 38 }} aria-hidden><Emoji e="💓" /></div>
            {total === 0 ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>아직 장면이 없어요</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                  「＋ 장면 추가」로 첫 장면을 만들어 보세요.<br />
                  <b>시작 감정 → 사건 → 끝 감정</b>을 적으면<br />그 장면이 감정을 바꾸는지 자동으로 점검됩니다.
                </div>
                <button className="btn-primary" style={{ marginTop: 4 }} onClick={() => setEditing('new')}>＋ 첫 장면 추가</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>변화 없는 장면이 없어요 <Emoji e="🎉" /></div>
                <button className="minibtn" onClick={() => setOnlyFlat(false)}>전체 보기</button>
              </>
            )}
          </div>
        ) : (
          visible.map((b) => {
            const realIdx = beats.findIndex((x) => x.id === b.id)
            const flat = isFlat(b)
            const inc = isIncomplete(b)
            const accent = flat ? 'var(--warn)' : inc ? 'var(--muted)' : 'var(--ok)'
            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: '11px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, minWidth: 22, textAlign: 'right', lineHeight: '20px' }}>{realIdx + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: 'break-word' }}>{b.title}</span>
                      {flat && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', border: '1px solid var(--warn)', borderRadius: 999, padding: '1px 8px' }}><Emoji e="⚠" /> 변화 없음</span>}
                      {!flat && inc && <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px' }}>미완성</span>}
                      {!flat && !inc && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ok)', border: '1px solid var(--ok)', borderRadius: 999, padding: '1px 8px' }}><Emoji e="💞" /> 감정 변화</span>}
                    </div>
                    {/* 감정 전환 칩: 시작 → 사건 → 끝 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap', fontSize: 12.5 }}>
                      <span style={{ padding: '3px 9px', borderRadius: 8, background: 'color-mix(in srgb, var(--muted) 14%, var(--paper))', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>
                        {b.startEmotion || <span style={{ color: 'var(--muted)' }}>시작 감정?</span>}
                      </span>
                      <span style={{ color: 'var(--muted)' }} aria-hidden>→</span>
                      <span style={{ padding: '3px 9px', borderRadius: 8, background: 'var(--chrome-2)', border: '1px dashed var(--border)', color: b.event ? 'var(--text)' : 'var(--muted)', fontStyle: 'italic' }}>
                        {b.event || '사건?'}
                      </span>
                      <span style={{ color: 'var(--muted)' }} aria-hidden>→</span>
                      <span style={{ padding: '3px 9px', borderRadius: 8, background: `color-mix(in srgb, ${accent} 16%, var(--paper))`, border: `1px solid ${accent}`, fontWeight: 700, color: 'var(--text)' }}>
                        {b.endEmotion || <span style={{ color: 'var(--muted)' }}>끝 감정?</span>}
                      </span>
                    </div>
                    {b.note && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Emoji e="📝" /> {emojify(b.note)}</div>
                    )}
                    {flat && (
                      <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5, marginTop: 7 }}>
                        시작 감정과 끝 감정이 같아요. 이 장면은 감정을 바꾸지 못합니다 — 사건을 강화하거나 끝 감정을 다시 정해 보세요.
                      </div>
                    )}
                  </div>
                </div>
                {/* 카드 액션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border)' }}>
                  <button className="minibtn" style={mini} title="위로 이동" disabled={realIdx === 0} onClick={() => move(b.id, -1)}>▲ 위로</button>
                  <button className="minibtn" style={mini} title="아래로 이동" disabled={realIdx === beats.length - 1} onClick={() => move(b.id, 1)}>▼ 아래로</button>
                  <div style={{ flex: 1 }} />
                  <button className="minibtn" style={mini} title="편집" onClick={() => setEditing(b.id)}><Emoji e="✏️" /> 편집</button>
                  <button className="minibtn" style={{ ...mini, color: 'var(--warn)' }} title="삭제" onClick={() => setConfirmDel(b.id)}><Emoji e="🗑️" /> 삭제</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 안내 */}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '6px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, lineHeight: 1.5 }}>
        시작 감정과 끝 감정이 같으면 <Emoji e="⚠" /> 경고합니다. 모든 장면은 감정을 바꿔야 합니다. 내용은 이 브라우저에 자동 저장됩니다.
      </div>

      {/* 편집/추가 모달 */}
      {editing && (
        <BeatEditor
          beat={editing === 'new' ? null : beats.find((b) => b.id === editing) || null}
          isNew={editing === 'new'}
          onCancel={() => setEditing(null)}
          onSave={(data) => upsert(editing, data)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && beats.find((b) => b.id === confirmDel) && (
        <Overlay onClose={() => setConfirmDel(null)}>
          <div style={modalCard}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>장면 삭제</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
              「{beats.find((b) => b.id === confirmDel)!.title}」 장면을 삭제할까요?<br />이 작업은 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn-primary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => remove(confirmDel)}>삭제</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ── 모달 오버레이 ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
    >
      {children}
    </div>
  )
}

const modalCard: React.CSSProperties = {
  width: '100%', maxWidth: 360, background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.35)', boxSizing: 'border-box',
}

// ── 장면 편집기 ───────────────────────────────────────────────────────────────
function BeatEditor({
  beat, isNew, onCancel, onSave,
}: {
  beat: Beat | null
  isNew: boolean
  onCancel: () => void
  onSave: (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  const base = beat || emptyBeat()
  const [title, setTitle] = useState(base.title)
  const [startEmotion, setStartEmotion] = useState(base.startEmotion)
  const [event, setEvent] = useState(base.event)
  const [endEmotion, setEndEmotion] = useState(base.endEmotion)
  const [note, setNote] = useState(base.note)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  // 실시간 변화 미리보기(편집 중 경고).
  const flat = !!norm(startEmotion) && !!norm(endEmotion) && norm(startEmotion) === norm(endEmotion)

  const submit = () => onSave({ title, startEmotion, event, endEmotion, note })

  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4, display: 'block' }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...modalCard, maxWidth: 460, maxHeight: '92%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, flexShrink: 0 }}>
          {isNew ? <><Emoji e="💓" /> 새 장면</> : <><Emoji e="💓" /> 장면 편집</>}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>장면 제목 *</label>
            <input
              ref={titleRef}
              style={inputBase}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
              placeholder="예: 등대에서의 첫 밤"
              maxLength={120}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={label}><Emoji e="🟦" /> 시작 감정</label>
              <input style={inputBase} value={startEmotion} onChange={(e) => setStartEmotion(e.target.value)} placeholder="장면 시작 시 감정" maxLength={60} />
            </div>
            <div>
              <label style={label}><Emoji e="🟥" /> 끝 감정</label>
              <input
                style={{ ...inputBase, borderColor: flat ? 'var(--warn)' : 'var(--border)' }}
                value={endEmotion}
                onChange={(e) => setEndEmotion(e.target.value)}
                placeholder="장면이 끝났을 때 감정"
                maxLength={60}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}><Emoji e="⚡" /> 사건 (감정을 바꾸는 계기)</label>
            <textarea
              style={{ ...inputBase, minHeight: 56, resize: 'vertical', lineHeight: 1.5 }}
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="이 장면에서 무슨 일이 일어나 감정이 바뀌는가"
              maxLength={500}
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={label}><Emoji e="📝" /> 메모 (선택)</label>
            <textarea
              style={{ ...inputBase, minHeight: 48, resize: 'vertical', lineHeight: 1.5 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="장면 의도·연출 메모"
              maxLength={500}
            />
          </div>

          {/* 변화 미리보기/경고 */}
          {(norm(startEmotion) || norm(endEmotion)) && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: flat ? 'var(--warn)' : 'var(--ok)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{startEmotion || '?'}</span><span aria-hidden>→</span><span>{endEmotion || '?'}</span>
              <span style={{ fontWeight: 700 }}>{flat ? <>· <Emoji e="⚠" /> 감정이 바뀌지 않습니다</> : (norm(startEmotion) && norm(endEmotion) ? <>· <Emoji e="💞" /> 감정이 바뀝니다</> : '')}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="minibtn" onClick={onCancel}>취소</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
