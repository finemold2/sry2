// 특수문자·문장부호 픽커 — 한국어 글쓰기·활자 교정용. 카테고리별로 자주 쓰는 문장부호/괄호/기호를
// 모아두고, 글자를 누르면 클립보드에 복사된다. 외부 네트워크/라이브러리 없이 로컬 데이터만으로 동작한다.
import { useState, useEffect, useRef, useMemo } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'special-char-picker', name: '특수문자 픽커', icon: '✒️', group: '유틸·참고', intro: '한국어 글쓰기용 문장부호·기호를 골라 복사하세요', w: 460, h: 600 }

interface Char { ch: string; name: string }
interface Category { key: string; label: string; items: Char[] }

// 활자 교정·한국어 글쓰기에서 실제로 자주 쓰는 기호 위주로 구성.
const CATEGORIES: Category[] = [
  {
    key: 'quote', label: '따옴표',
    items: [
      { ch: '“', name: '여는 큰따옴표' },
      { ch: '”', name: '닫는 큰따옴표' },
      { ch: '‘', name: '여는 작은따옴표' },
      { ch: '’', name: '닫는 작은따옴표' },
      { ch: '「', name: '낫표 여는' },
      { ch: '」', name: '낫표 닫는' },
      { ch: '『', name: '겹낫표 여는' },
      { ch: '』', name: '겹낫표 닫는' },
      { ch: '«', name: '여는 기예메' },
      { ch: '»', name: '닫는 기예메' },
      { ch: '‹', name: '여는 홑기예메' },
      { ch: '›', name: '닫는 홑기예메' },
      { ch: '〝', name: '겹낫 따옴표 여는' },
      { ch: '〞', name: '겹낫 따옴표 닫는' },
    ],
  },
  {
    key: 'bracket', label: '괄호·묶음',
    items: [
      { ch: '《', name: '겹화살괄호 여는 《' },
      { ch: '》', name: '겹화살괄호 닫는 》' },
      { ch: '〈', name: '홑화살괄호 여는 〈' },
      { ch: '〉', name: '홑화살괄호 닫는 〉' },
      { ch: '【', name: '먹괄호 여는 【' },
      { ch: '】', name: '먹괄호 닫는 】' },
      { ch: '〔', name: '거북등괄호 여는 〔' },
      { ch: '〕', name: '거북등괄호 닫는 〕' },
      { ch: '（', name: '전각 여는 소괄호 （' },
      { ch: '）', name: '전각 닫는 소괄호 ）' },
      { ch: '［', name: '전각 여는 대괄호 ［' },
      { ch: '］', name: '전각 닫는 대괄호 ］' },
      { ch: '｛', name: '전각 여는 중괄호 ｛' },
      { ch: '｝', name: '전각 닫는 중괄호 ｝' },
    ],
  },
  {
    key: 'dash', label: '줄표·생략·간격',
    items: [
      { ch: '—', name: '줄표(em dash) —' },
      { ch: '–', name: '반각 줄표(en dash) –' },
      { ch: '―', name: '수평선(가로줄)' },
      { ch: '…', name: '말줄임표 …' },
      { ch: '⋯', name: '가운데 말줄임 ⋯' },
      { ch: '·', name: '가운뎃점 ·' },
      { ch: '‧', name: '하이픈 점 ‧' },
      { ch: '・', name: '전각 가운뎃점 ・' },
      { ch: '‐', name: '하이픈 ‐' },
      { ch: '‑', name: '줄바꿈 없는 하이픈' },
      { ch: ' ', name: '줄바꿈 없는 공백(NBSP)' },
      { ch: ' ', name: '얇은 공백(thin space)' },
      { ch: '　', name: '전각 공백' },
    ],
  },
  {
    key: 'mark', label: '교정·참조 부호',
    items: [
      { ch: '※', name: '참고표 ※' },
      { ch: '⁂', name: '별표 묶음 ⁂' },
      { ch: '†', name: '단검표(dagger) †' },
      { ch: '‡', name: '겹단검표 ‡' },
      { ch: '§', name: '절 기호 §' },
      { ch: '¶', name: '단락 기호 ¶' },
      { ch: '′', name: '프라임 ′' },
      { ch: '″', name: '겹프라임 ″' },
      { ch: '№', name: '번호 기호 №' },
      { ch: '©', name: '저작권 ©' },
      { ch: '®', name: '등록상표 ®' },
      { ch: '™', name: '상표 ™' },
      { ch: '℗', name: '음반 저작권 ℗' },
    ],
  },
  {
    key: 'star', label: '별·점·불릿',
    items: [
      { ch: '★', name: '검은 별 ★' },
      { ch: '☆', name: '흰 별 ☆' },
      { ch: '✧', name: '흰 사각별 ✧' },
      { ch: '✦', name: '검은 사각별 ✦' },
      { ch: '•', name: '불릿 •' },
      { ch: '●', name: '검은 원 ●' },
      { ch: '○', name: '흰 원 ○' },
      { ch: '■', name: '검은 사각형 ■' },
      { ch: '□', name: '흰 사각형 □' },
      { ch: '◆', name: '검은 마름모 ◆' },
      { ch: '◇', name: '흰 마름모 ◇' },
      { ch: '▶', name: '오른쪽 삼각 ▶' },
      { ch: '◀', name: '왼쪽 삼각 ◀' },
      { ch: '✓', name: '체크 ✓' },
      { ch: '✗', name: '엑스표 ✗' },
    ],
  },
  {
    key: 'arrow', label: '화살표',
    items: [
      { ch: '→', name: '오른쪽 →' },
      { ch: '←', name: '왼쪽 ←' },
      { ch: '↑', name: '위 ↑' },
      { ch: '↓', name: '아래 ↓' },
      { ch: '↔', name: '좌우 ↔' },
      { ch: '↕', name: '상하 ↕' },
      { ch: '⇒', name: '두 줄 오른쪽 ⇒' },
      { ch: '⇐', name: '두 줄 왼쪽 ⇐' },
      { ch: '⇔', name: '두 줄 좌우 ⇔' },
      { ch: '↗', name: '우상 ↗' },
      { ch: '↘', name: '우하 ↘' },
      { ch: '↵', name: '줄바꿈 ↵' },
      { ch: '➤', name: '굵은 오른쪽 ➤' },
    ],
  },
  {
    key: 'math', label: '수학·단위',
    items: [
      { ch: '×', name: '곱하기 ×' },
      { ch: '÷', name: '나누기 ÷' },
      { ch: '±', name: '플러스마이너스 ±' },
      { ch: '≠', name: '같지 않음 ≠' },
      { ch: '≤', name: '작거나 같음 ≤' },
      { ch: '≥', name: '크거나 같음 ≥' },
      { ch: '≈', name: '근사값 ≈' },
      { ch: '∞', name: '무한대 ∞' },
      { ch: '°', name: '도 °' },
      { ch: '℃', name: '섭씨 ℃' },
      { ch: '℉', name: '화씨 ℉' },
      { ch: '‰', name: '퍼밀 ‰' },
      { ch: '½', name: '이분의 일 ½' },
      { ch: '¼', name: '사분의 일 ¼' },
      { ch: '¾', name: '사분의 삼 ¾' },
    ],
  },
  {
    key: 'misc', label: '통화·기타',
    items: [
      { ch: '₩', name: '원 ₩' },
      { ch: '$', name: '달러 $' },
      { ch: '¥', name: '엔·위안 ¥' },
      { ch: '€', name: '유로 €' },
      { ch: '£', name: '파운드 £' },
      { ch: '❤', name: '하트 ❤' },
      { ch: '♪', name: '음표 ♪' },
      { ch: '♫', name: '두 음표 ♫' },
      { ch: '☀', name: '해 ☀' },
      { ch: '☁', name: '구름 ☁' },
      { ch: '☂', name: '우산 ☂' },
      { ch: '☎', name: '전화 ☎' },
      { ch: '✉', name: '편지 ✉' },
      { ch: '✎', name: '연필 ✎' },
    ],
  },
]

const ALL: Char[] = CATEGORIES.flatMap((c) => c.items)

export default function SpecialCharPicker() {
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const visible = useMemo<Char[]>(() => {
    const base = cat === 'all' ? ALL : (CATEGORIES.find((c) => c.key === cat)?.items ?? [])
    const term = q.trim().toLowerCase()
    if (!term) return base
    // 글자 자체 또는 이름으로 검색
    return base.filter((c) => c.ch === term || c.name.toLowerCase().includes(term))
  }, [cat, q])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1400)
  }

  const copy = (ch: string) => {
    try {
      navigator.clipboard?.writeText(ch).then(() => {
        setCopied(ch)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied((c) => (c === ch ? null : c)), 1000)
        flash(`복사됨: ${ch}`)
      }).catch(() => flash('복사에 실패했습니다'))
    } catch {
      flash('클립보드를 사용할 수 없습니다')
    }
    // 최근 사용에 추가(중복 제거, 최대 12개)
    setRecent((r) => [ch, ...r.filter((x) => x !== ch)].slice(0, 12))
  }

  const copyAllVisible = () => {
    if (!visible.length) return
    const text = visible.map((c) => c.ch).join(' ')
    try {
      navigator.clipboard?.writeText(text).then(() => flash('현재 목록을 복사했습니다')).catch(() => flash('복사에 실패했습니다'))
    } catch { flash('클립보드를 사용할 수 없습니다') }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box', position: 'relative' }
  const tab = (active: boolean): React.CSSProperties | undefined => active ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined

  const renderCell = (c: Char) => (
    <button
      key={c.ch}
      className="minibtn"
      title={`${c.name} — 클릭하면 복사`}
      onClick={() => copy(c.ch)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        padding: '8px 4px', minHeight: 52,
        background: copied === c.ch ? 'var(--accent)' : 'var(--chrome-2)',
        borderColor: copied === c.ch ? 'var(--accent)' : 'var(--border)',
        color: copied === c.ch ? '#fff' : 'var(--text)',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{c.ch === ' ' || c.ch === ' ' || c.ch === '　' ? '␣' : c.ch}</span>
      <span style={{ fontSize: 9, color: copied === c.ch ? '#fff' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
        {c.name.split(' ')[0]}
      </span>
    </button>
  )

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: 6 }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        한국어 글쓰기·활자 교정용 <b>문장부호와 기호</b>. 글자를 누르면 클립보드에 복사됩니다.
      </div>

      {/* 검색 */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름·기호로 검색 (예: 따옴표, 화살표, →)"
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
      />

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setCat('all')} style={tab(cat === 'all')}>전체</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} style={tab(cat === c.key)}>{c.label}</button>
        ))}
      </div>

      {/* 최근 사용 */}
      {recent.length > 0 && q.trim() === '' && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>최근 사용</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recent.map((ch, i) => (
              <button key={ch + i} className="minibtn" title="클릭하면 복사" onClick={() => copy(ch)}
                style={{ minWidth: 36, fontSize: 18, padding: '4px 8px', background: 'var(--panel)' }}>
                {ch === ' ' || ch === ' ' || ch === '　' ? '␣' : ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 기호 그리드 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        {visible.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
            검색 결과가 없습니다. 다른 이름이나 기호로 시도해 보세요.
          </div>
        ) : (
          <div style={grid}>{visible.map(renderCell)}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={copyAllVisible} disabled={!visible.length}><Emoji e="📋"/> 현재 목록 복사</button>
        <button className="minibtn" onClick={() => setQ('')} disabled={!q}>검색 지우기</button>
        {recent.length > 0 && <button className="minibtn" onClick={() => setRecent([])}>최근 비우기</button>}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        ␣ 표시는 공백 문자(NBSP·얇은 공백·전각 공백)입니다. 화면엔 안 보여도 복사하면 실제 공백이 들어갑니다.
      </div>

      {/* 복사 토스트 */}
      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 44, transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', padding: '6px 14px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
