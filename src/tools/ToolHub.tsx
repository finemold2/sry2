// 도구 허브 — 유틸리티 대형 도구들을 카테고리별로 보여주는 런처. 클릭하면 플로팅 창으로 열린다.
import { useMemo, useState } from 'react'
import { useModal } from '../components/useModal'
import { useStore } from '../store/store'
import { UTILITY_TOOLS, TOOL_GROUPS } from './registry'
import { Icon, iconForTool } from '../ui/icons'

export default function ToolHub({ onOpen, onClose }: { onOpen: (id: string) => void; onClose: () => void }) {
  const dialogRef = useModal<HTMLDivElement>(onClose)
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const groups = TOOL_GROUPS()
  // 555종 앞에서 '뭘 열지'부터 다시 찾던 콜드 스타트 해소(#10) — 즐겨찾기·최근 사용을 최상단에.
  const favorites = useStore((s) => s.favorites)
  const favTools = useMemo(() => favorites.filter((f) => f.id.startsWith('tool:')).map((f) => UTILITY_TOOLS.find((t) => t.id === f.id.slice(5))).filter((t): t is typeof UTILITY_TOOLS[number] => !!t), [favorites])
  const recentTools = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('sry:tool-recents') || '[]')
      return (Array.isArray(a) ? a : []).map((id: string) => UTILITY_TOOLS.find((t) => t.id === id)).filter((t): t is typeof UTILITY_TOOLS[number] => !!t).slice(0, 8)
    } catch { return [] }
  }, [])
  const quickRow = (label: string, items: typeof UTILITY_TOOLS[number][]) => items.length === 0 ? null : (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((t) => (
          <button key={t.id} className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => { onOpen(t.id); onClose() }} title={t.intro || t.name}>
            <Icon name={iconForTool(t)} size={14} />{t.name}
          </button>
        ))}
      </div>
    </div>
  )
  // 이름·소개·카테고리명 + 한글 초성('ㅇㄹㅁㅅ'→이름 믹서)까지 검색(#10).
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
  const toCho = (s: string) => [...s].map((ch) => { const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : ch }).join('')
  const isChoQuery = ql.length > 0 && [...ql].every((c) => CHO.includes(c))
  const match = (t: typeof UTILITY_TOOLS[number]) => {
    if (!ql) return true
    const hay = t.name + ' ' + (t.intro || '') + ' ' + t.group
    if (hay.toLowerCase().includes(ql)) return true
    // 초성 비교는 양쪽 공백 제거('이름 믹서'→'ㅇㄹㅁㅅ' 도 매칭).
    return isChoQuery && toCho(hay).replace(/\s+/g, '').includes(ql.replace(/\s+/g, ''))
  }
  const total = useMemo(() => UTILITY_TOOLS.filter(match).length, [ql])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 720, maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="tools" size={20} />도구 허브 <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>— 글쓰기를 돕는 도구를 골라 띄우세요 ({UTILITY_TOOLS.length}종)</span></h2>
        {/* 검색창 고정 영역(스크롤해도 사라지지 않음) */}
        <div style={{ flexShrink: 0, position: 'relative', marginBottom: 8 }}>
          <input className="field" autoFocus placeholder="도구·카테고리 검색…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', paddingRight: 28 }} />
          {q && <button onClick={() => setQ('')} title="검색 지우기" aria-label="검색 지우기" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>×</button>}
        </div>
        <div className="modal-body" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          {!ql && quickRow('★ 즐겨찾기', favTools)}
          {!ql && quickRow('최근 사용', recentTools)}
          {groups.map((g) => {
            const items = UTILITY_TOOLS.filter((t) => t.group === g && match(t))
            if (!items.length) return null
            return (
              <div key={g} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, letterSpacing: 0.5 }}>{g} <span style={{ opacity: 0.6 }}>({items.length})</span></div>
                <div className="toolhub-grid">
                  {items.map((t) => (
                    <button key={t.id} className="toolhub-card" onClick={() => { onOpen(t.id); onClose() }}>
                      <span className="toolhub-icon"><Icon name={iconForTool(t)} size={22} /></span>
                      <span className="toolhub-name">{t.name}</span>
                      {t.intro && <span className="toolhub-intro">{t.intro}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {total === 0 && (
            <div style={{ color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
              “{q}”에 대한 결과가 없습니다.
              <div style={{ marginTop: 10 }}><button className="minibtn" onClick={() => setQ('')}>검색 지우기</button></div>
            </div>
          )}
        </div>
        <div className="modal-foot" style={{ flexShrink: 0 }}><button className="btn-primary" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  )
}
