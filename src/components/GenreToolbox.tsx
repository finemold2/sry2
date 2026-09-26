// 장르별 도구함 — 장르소설(미스터리·SF·무협·판타지·로맨스·호러 등)별 특화 도구함.
// 장르를 고르면: (1) 그 장르 '전용 도구'(meta.genre===장르) + (2) '공통 도구 전체'(모든 일반 도구)를 함께 보여준다.
// 도구를 열 때 { genre } 컨텍스트를 payload 로 넘겨, 장르 인식 도구는 그 장르에 맞게 특화 동작한다.
import { useMemo, useState } from 'react'
import { useModal } from './useModal'
import { UTILITY_TOOLS } from '../tools/registry'
import { Icon, iconForTool } from '../ui/icons'

const GENRE_INFO: Record<string, { icon: string; desc: string }> = {
  '미스터리·추리': { icon: 'search', desc: '트릭·단서·알리바이·동기로 짜는 수수께끼. 공정한 단서와 의외의 범인.' },
  '스릴러·서스펜스': { icon: 'conflict', desc: '시간 압박과 위협으로 조이는 긴장. 추격·반전·고조.' },
  'SF·과학소설': { icon: 'device', desc: '과학적 상상력 — 우주·기술·미래사회·물리법칙의 세계.' },
  '판타지': { icon: 'world', desc: '마법과 이세계, 신화적 모험과 거대한 세계관.' },
  '무협': { icon: 'conflict', desc: '강호·문파·무공·내공. 협과 의리, 은원의 강호.' },
  '로맨스': { icon: 'heart', desc: '관계의 설렘과 갈등 — 끌림·밀당·장애·해소.' },
  '로맨스판타지': { icon: 'heart', desc: '귀족·궁중·환생·계약결혼 등 로판 특유의 클리셰와 세계.' },
  '호러·공포': { icon: 'mood', desc: '두려움의 설계 — 분위기·불길함·괴이·심리적 공포.' },
  '역사·사극': { icon: 'book', desc: '시대 고증과 권력·전란·풍속. 과거를 무대로 한 서사.' },
  '액션·전쟁': { icon: 'conflict', desc: '전투·추격·작전. 속도감 있는 동작과 긴박한 충돌.' },
  '게임판타지·LitRPG': { icon: 'device', desc: '시스템·스탯·레벨업·던전. 게임 규칙이 작동하는 세계.' },
  '현대판타지·회귀': { icon: 'sparkle', desc: '회귀·빙의·각성. 현대를 배경으로 한 능력·먼치킨 서사.' },
}

export default function GenreToolbox({ onOpen, onClose }: { onOpen: (id: string, payload?: Record<string, unknown>) => void; onClose: () => void }) {
  const dialogRef = useModal<HTMLDivElement>(onClose)
  const genres = useMemo(() => {
    const fromTools = [...new Set(UTILITY_TOOLS.filter((t) => t.genre).map((t) => t.genre as string))]
    // 전용 도구가 아직 없는 장르도 목록에 노출(공통 도구는 항상 쓸 수 있으므로)
    const all = [...new Set([...Object.keys(GENRE_INFO), ...fromTools])]
    return all
  }, [])
  const [sel, setSel] = useState<string>(genres[0] || '')
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()

  const match = (t: typeof UTILITY_TOOLS[number]) => !ql || (t.name + ' ' + (t.intro || '') + ' ' + t.group).toLowerCase().includes(ql)
  const special = useMemo(() => UTILITY_TOOLS.filter((t) => t.genre === sel && match(t)), [sel, ql])
  const common = useMemo(() => UTILITY_TOOLS.filter((t) => !t.genre && match(t)), [ql])
  const commonGrouped = useMemo(() => {
    const m = new Map<string, typeof UTILITY_TOOLS>()
    for (const t of common) { const g = t.group || '도구'; if (!m.has(g)) m.set(g, []); m.get(g)!.push(t) }
    return [...m.entries()]
  }, [common])
  const info = GENRE_INFO[sel]
  const open = (id: string) => { onOpen(id, { genre: sel }); onClose() }

  const Card = (t: typeof UTILITY_TOOLS[number]) => (
    <button key={t.id} className="toolhub-card" onClick={() => open(t.id)}>
      <span className="toolhub-icon"><Icon name={iconForTool(t)} size={20} /></span>
      <span className="toolhub-name">{t.name}</span>
      {t.intro && <span className="toolhub-intro">{t.intro}</span>}
    </button>
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 880, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="tools" size={18} /> 장르별 도구함 <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>— 장르를 고르면 전용 도구 + 모든 공통 도구가 그 장르 맥락으로 열립니다</span></h2>
        <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0 }}>
          <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 6 }}>
            {genres.map((g) => {
              const cnt = UTILITY_TOOLS.filter((t) => t.genre === g).length
              const gi = GENRE_INFO[g]
              return (
                <button key={g} onClick={() => setSel(g)} className={'genre-tab' + (sel === g ? ' active' : '')}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 10px', marginBottom: 4, borderRadius: 8, border: '1px solid ' + (sel === g ? 'var(--accent)' : 'transparent'), background: sel === g ? 'var(--panel)' : 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={gi?.icon || 'book'} size={16} />{g}
                  {cnt > 0 && <span style={{ color: 'var(--accent)', fontSize: 11, marginLeft: 4 }}>+{cnt}</span>}
                </button>
              )
            })}
          </div>
          <div className="modal-body" style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 14 }}>
            {info && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name={info.icon} size={16} /> {info.desc}</div>}
            <input className="field" placeholder="이 장르 도구 검색…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

            {special.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="star" size={14} mono /> {sel} 전용 도구 ({special.length})</div>
                <div className="toolhub-grid">{special.map(Card)}</div>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              공통 도구 — 이 장르 맥락으로 열립니다 ({common.length})
            </div>
            {commonGrouped.map(([g, items]) => (
              <div key={g} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5, letterSpacing: 0.5 }}>{g}</div>
                <div className="toolhub-grid">{items.map(Card)}</div>
              </div>
            ))}
            {!special.length && !common.length && <div style={{ color: 'var(--muted)', padding: 16, textAlign: 'center' }}>검색 결과가 없습니다.</div>}
          </div>
        </div>
        <div className="modal-foot" style={{ flexShrink: 0 }}><button className="btn-primary" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  )
}
