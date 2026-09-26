import { useEffect, useMemo, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { useModal } from './useModal'
import { useStore } from '../store/store'
import { Icon, iconForTool, iconForCommand, stripLeadingEmoji } from '../ui/icons'
import { UTILITY_TOOLS } from '../tools/registry'

function cmdIconName(c: Command): string {
  if (c.id.startsWith('tool:')) { const t = UTILITY_TOOLS.find((x) => x.id === c.id.slice(5)); if (t) return iconForTool(t) }
  return iconForCommand(c.id, c.title, c.section || '')
}

export interface Command {
  id: string
  title: string
  hint?: string
  section?: string
  run: () => void
  disabled?: boolean
}

// 한글 음절 → 초성 문자열('명령 팔레트' → 'ㅁㄹㅍㄹㅌ'). 초성만으로 이뤄진 질의('ㅋㅍ')를 매칭한다(#7).
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
function toChoseong(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) out += CHOSEONG[Math.floor((code - 0xac00) / 588)]
    else out += ch
  }
  return out
}
const isChoseongQuery = (q: string) => q.length > 0 && [...q].every((c) => CHOSEONG.includes(c))

// 매칭 '점수'(0=불일치): 정확 접두 3 > 단어 경계 2 > 부분 문자열 1 > 서브시퀀스 0.5 > 초성 0.8 (#7 무순위 나열 해소).
function fuzzyScore(q: string, text: string): number {
  if (!q) return 0.1
  const t = text.toLowerCase()
  const s = q.toLowerCase()
  if (t.startsWith(s)) return 3
  const idx = t.indexOf(s)
  if (idx > 0) return /[\s·—(-]/.test(t[idx - 1]) ? 2 : 1
  if (isChoseongQuery(q) && toChoseong(text).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) return 0.8 // 공백 무시('이름 믹서'→ㅇㄹㅁㅅ)
  let i = 0
  for (const ch of t) {
    if (ch === s[i]) i++
    if (i === s.length) return 0.5
  }
  return 0
}

// 최근 실행 명령(id 최대 20개, localStorage) — 빈 질의에서 최상단으로, 검색 시 가점.
const RECENTS_KEY = 'sry:cmd-recents'
function loadRecents(): string[] {
  try { const a = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [] } catch { return [] }
}
function pushRecent(id: string) {
  try { const a = [id, ...loadRecents().filter((x) => x !== id)].slice(0, 20); localStorage.setItem(RECENTS_KEY, JSON.stringify(a)) } catch { /* noop */ }
}

export default function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useModal<HTMLDivElement>(onClose)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const favSet = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 점수 랭킹 + 즐겨찾기/최근 실행 가점 정렬. 빈 질의 = 즐겨찾기 → 최근 → 나머지 순(#7).
  const recents = useMemo(() => loadRecents(), [])
  const filtered = useMemo(() => {
    const recentRank = new Map(recents.map((id, i) => [id, recents.length - i]))
    return commands
      .map((c) => {
        const base = fuzzyScore(q, c.title + ' ' + (c.section || ''))
        if (base <= 0) return null
        const boost = (favSet.has(c.id) ? 1.5 : 0) + (recentRank.has(c.id) ? 1 + (recentRank.get(c.id) || 0) / 40 : 0)
        return { c, score: base + boost }
      })
      .filter((x): x is { c: Command; score: number } => !!x)
      .sort((a, b) => b.score - a.score || a.c.title.length - b.c.title.length)
      .slice(0, 60)
      .map((x) => x.c)
  }, [q, commands, favSet, recents])

  useEffect(() => setSel(0), [q])

  // 키보드 탐색 시 선택 항목이 화면 밖으로 나가지 않게 따라 스크롤(#7).
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => { itemRefs.current[sel]?.scrollIntoView({ block: 'nearest' }) }, [sel])
  // 키보드 이동 직후 150ms 는 마우스 hover 가 선택을 빼앗지 않게 가드(#7 키보드-마우스 충돌).
  const lastKeyNav = useRef(0)

  const exec = (c?: Command) => {
    if (!c || c.disabled) return
    pushRecent(c.id)
    onClose()
    setTimeout(() => c.run(), 0)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start' }}>
      <div
        className="cmd-palette"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            lastKeyNav.current = Date.now()
            setSel((i) => Math.min(filtered.length - 1, i + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            lastKeyNav.current = Date.now()
            setSel((i) => Math.max(0, i - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            exec(filtered[sel])
          } else if (e.key === 'Escape') {
            onClose()
          }
        }}
      >
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="명령 검색… (예: 분할, 컴파일, 다크 모드)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="cmd-list">
          {filtered.length === 0 && <div className="cmd-empty">일치하는 명령이 없습니다</div>}
          {filtered.map((c, i) => {
            const fav = favSet.has(c.id)
            return (
              <div key={c.id} ref={(el) => { itemRefs.current[i] = el }} className={'cmd-item' + (i === sel ? ' sel' : '') + (c.disabled ? ' disabled' : '')} onMouseEnter={() => { if (Date.now() - lastKeyNav.current > 150) setSel(i) }} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  className="cmd-fav"
                  title={fav ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
                  aria-label="즐겨찾기"
                  draggable
                  onDragStart={(e) => { try { e.dataTransfer.setData('text/fav', JSON.stringify({ id: c.id, label: c.title.split(' — ')[0] })); e.dataTransfer.effectAllowed = 'copy' } catch { /* noop */ } }}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite({ id: c.id, label: c.title.split(' — ')[0] }) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 2px', color: fav ? 'var(--accent)' : 'var(--muted)', flexShrink: 0, display: 'inline-flex' }}
                >
                  <Star size={14} fill={fav ? 'currentColor' : 'none'} />
                </button>
                <button
                  className="cmd-item-main"
                  onClick={() => exec(c)}
                  disabled={c.disabled}
                  aria-disabled={c.disabled}
                  style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', textAlign: 'left', color: 'inherit', font: 'inherit', cursor: c.disabled ? 'not-allowed' : 'pointer', padding: 0 }}
                >
                  <Icon name={cmdIconName(c)} size={15} />
                  <span className="cmd-title">{stripLeadingEmoji(c.title)}</span>
                  {c.section && <span className="cmd-section">{c.section}</span>}
                  {c.hint && <span className="cmd-hint">{c.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
