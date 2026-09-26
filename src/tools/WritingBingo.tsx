// 글쓰기 빙고 — 5x5 빙고판에 무작위 글쓰기 미션/요소를 채워, 글에 적용하며 칸을 지우는 게임.
// 자급식: react 외엔 './linkbus'만 import. 외부 네트워크·라이브러리 없음.
// Math.random(무작위 미션 채우기) + localStorage(진행 저장)만 사용. 언마운트/타이머 정리.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'writing-bingo', name: '글쓰기 빙고', icon: '🎯', group: '집중·생산성', intro: '무작위 글쓰기 미션 25칸을 글에 적용하며 빙고를 완성하세요', w: 560, h: 660 }

const LS = 'sry:tool:writing-bingo:'

// 빙고판을 채울 글쓰기 미션 풀(요소/제약). 충분히 다양하게(가운데 FREE 1칸 제외 24칸을 매번 무작위로 채움).
const POOL: string[] = [
  '오감 중 세 가지를 한 문단에 넣기',
  '대사로 글을 시작하기',
  '반전(예상 깨기)을 하나 넣기',
  '한 문장을 다섯 단어 이하로 쓰기',
  '날씨로 인물의 감정을 비추기',
  '“그러나/하지만”으로 흐름 뒤집기',
  '냄새 묘사를 한 군데 넣기',
  '한 인물의 손짓·몸짓으로 감정 보여주기',
  '대화 중 침묵(말줄임)을 살리기',
  '색깔 하나를 장면의 모티프로 반복하기',
  '질문으로 끝나는 문단 만들기',
  '시간을 거슬러 회상을 한 토막 넣기',
  '비유(직유·은유)를 새로 하나 만들기',
  '“말하지 않고 보여주기”로 슬픔 표현하기',
  '의성어·의태어를 한 번 사용하기',
  '한 문장만 일부러 길게(쉼표로) 늘이기',
  '인물의 거짓말을 한 줄 넣기',
  '소리(청각) 묘사로 장면 열기',
  '작은 사물 하나에 의미를 부여하기',
  '두 인물의 갈등을 대사 없이 드러내기',
  '냉소·유머가 담긴 문장 하나 넣기',
  '문단 첫 문장을 동사로 시작하기',
  '예고(복선)를 슬쩍 심어두기',
  '독자에게 직접 말 거는 한 줄 쓰기',
  '한 장면에서 시점 인물의 욕망을 드러내기',
  '맛(미각) 묘사를 한 군데 넣기',
  '대조되는 두 이미지를 나란히 놓기',
  '인물의 결점을 행동으로 보여주기',
  '문장 하나를 능동태로 고쳐 쓰기',
  '“만약 …라면”의 상상을 한 토막 넣기',
  '촉각(질감·온도) 묘사를 넣기',
  '대사에 사투리·말버릇 하나 입히기',
  '장면의 분위기를 한 단어로 압축해 적기',
  '문단을 한 단어로 끝맺기',
  '과거형과 현재형을 의도적으로 섞지 않기',
  '인물이 원하는 것과 필요한 것을 구분해 적기',
  '클리셰 표현 하나를 찾아 바꿔 쓰기',
  '한 장면에 시계·시간 단서를 넣기',
  '감정을 직접 말하는 단어(슬펐다 등) 없애기',
  '소품 하나가 두 번 등장하게 하기',
  '문단마다 첫 단어를 다르게 시작하기',
  '인물의 뒷모습·실루엣을 묘사하기',
  '대화에 오해(엇갈림)를 한 번 넣기',
  '한 문단을 풍경 묘사로만 채우기',
  '인물의 습관 하나를 보여주기',
  '“보여주기 vs 말하기”에서 보여주기로 고치기',
  '한 문장에 쉼표 없이 호흡을 끊어 쓰기',
  '장소의 역사(과거)를 한 줄 암시하기',
]

// 가운데(12번째) 칸은 항상 FREE.
const FREE = '✦ FREE\n(자유 한 줄)'

function buildBoard(): string[] {
  const idx = [...Array(POOL.length).keys()]
  // 피셔–예이츠 셔플로 24개 미션 무작위 추출
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const picks = idx.slice(0, 24).map((i) => POOL[i])
  const board: string[] = []
  let p = 0
  for (let c = 0; c < 25; c++) {
    if (c === 12) board.push(FREE)
    else board.push(picks[p++])
  }
  return board
}

// 빙고(완성 줄) 인덱스 모음 — 가로 5 + 세로 5 + 대각 2.
const LINES: number[][] = (() => {
  const ls: number[][] = []
  for (let r = 0; r < 5; r++) ls.push([0, 1, 2, 3, 4].map((c) => r * 5 + c))
  for (let c = 0; c < 5; c++) ls.push([0, 1, 2, 3, 4].map((r) => r * 5 + c))
  ls.push([0, 6, 12, 18, 24])
  ls.push([4, 8, 12, 16, 20])
  return ls
})()

interface Saved { board: string[]; marked: boolean[] }

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(LS + 'state')
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>
      if (Array.isArray(p.board) && p.board.length === 25 && Array.isArray(p.marked) && p.marked.length === 25) {
        return { board: p.board.map(String), marked: p.marked.map(Boolean) }
      }
    }
  } catch { /* 미지원/손상 — 새 판 */ }
  const board = buildBoard()
  const marked = board.map((_, i) => i === 12) // FREE 칸은 기본 완료
  return { board, marked }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function WritingBingo({ payload }: { payload?: Record<string, unknown> }) {
  const [board, setBoard] = useState<string[]>(() => loadSaved().board)
  const [marked, setMarked] = useState<boolean[]>(() => loadSaved().marked)
  const [confirmNew, setConfirmNew] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)

  // 진행 저장(디바운스) — 보드/표시가 바뀔 때마다 localStorage 반영.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LS + 'state', JSON.stringify({ board, marked })) } catch { /* 무시 */ }
    }, 250)
    return () => window.clearTimeout(t)
  }, [board, marked])

  // 토스트 타이머 정리(언마운트 포함).
  useEffect(() => () => { if (toastTimer.current !== null) window.clearTimeout(toastTimer.current) }, [])

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  const markedCount = marked.filter(Boolean).length
  const lineCount = LINES.filter((ln) => ln.every((i) => marked[i])).length
  const lineCells = new Set<number>()
  LINES.forEach((ln) => { if (ln.every((i) => marked[i])) ln.forEach((i) => lineCells.add(i)) })
  const allDone = marked.every(Boolean)

  const toggle = (i: number) => {
    if (i === 12) return // FREE 칸은 고정
    setMarked((prev) => prev.map((v, k) => (k === i ? !v : v)))
  }

  const regenerate = () => {
    const b = buildBoard()
    setBoard(b)
    setMarked(b.map((_, i) => i === 12))
    setConfirmNew(false)
    flash('새 빙고판을 만들었습니다.')
  }
  const requestNew = () => {
    // 진행이 있으면(센터 외 표시) 확인. 아니면 바로 새 판.
    if (markedCount > 1) setConfirmNew(true)
    else regenerate()
  }
  const resetMarks = () => {
    setMarked(board.map((_, i) => i === 12))
    flash('표시를 모두 지웠습니다.')
  }

  // 현재 빙고판(미션 목록 + 진행)을 프로젝트 자료 〈글쓰기 빙고〉 폴더에 메모로 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows: string[] = []
    for (let r = 0; r < 5; r++) {
      const cells = [0, 1, 2, 3, 4].map((c) => {
        const i = r * 5 + c
        const done = marked[i]
        const text = board[i] === FREE ? '✦ FREE' : board[i]
        const inner = `${done ? '✅ ' : '⬜ '}${esc(text)}`
        return `<td style="border:1px solid #ccc;padding:6px 8px;font-size:12px;vertical-align:top;${done ? 'background:#eef7f0;' : ''}">${inner}</td>`
      }).join('')
      rows.push(`<tr>${cells}</tr>`)
    }
    const bodyHtml = [
      `<p><b>🎯 글쓰기 빙고</b> — 완성 줄 ${lineCount}개 · 채운 칸 ${markedCount}/25${allDone ? ' · 🎉 풀하우스!' : ''}</p>`,
      `<table style="border-collapse:collapse;width:100%;">${rows.join('')}</table>`,
      `<p style="font-size:12px;color:#888;">각 칸의 미션을 글에 적용하며 칸을 지워 빙고를 완성하세요.</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '글쓰기 빙고',
      title: `🎯 글쓰기 빙고 (${markedCount}/25 · ${lineCount}줄)`,
      bodyHtml,
      meta: { 출처: '글쓰기 빙고', 완성줄: String(lineCount), 채운칸: `${markedCount}/25` },
    })
    flash(id ? '프로젝트 자료 〈글쓰기 빙고〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  void payload // (연계 페이로드 사용 안 함)

  // ----- 스타일 -----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const statRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const pill = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--panel)',
    color: active ? 'var(--ok)' : 'var(--muted)', whiteSpace: 'nowrap',
  })
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }

  return (
    <div style={wrap}>
      <div style={hint}>
        각 칸의 <b>글쓰기 미션</b>을 실제 글에 적용했다면 칸을 눌러 지우세요. 가로·세로·대각선 한 줄을 완성하면 <b>빙고</b>!
      </div>

      {/* 진행 상태 */}
      <div style={statRow}>
        <span style={pill(markedCount > 1)}>채운 칸 {markedCount}/25</span>
        <span style={pill(lineCount > 0)}>완성 줄 {lineCount}개</span>
        {allDone && <span style={{ ...pill(true), color: 'var(--accent)', borderColor: 'var(--accent)' }}><Emoji e="🎉" /> 풀하우스!</span>}
      </div>

      {/* 빙고판 */}
      <div style={grid}>
        {board.map((mission, i) => {
          const done = marked[i]
          const isFree = i === 12
          const inLine = lineCells.has(i)
          const cell: React.CSSProperties = {
            position: 'relative',
            aspectRatio: '1 / 1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            padding: 6, boxSizing: 'border-box',
            fontSize: 11, lineHeight: 1.3, wordBreak: 'keep-all',
            borderRadius: 8, cursor: isFree ? 'default' : 'pointer',
            userSelect: 'none', transition: 'background .15s, border-color .15s, transform .1s',
            border: `1.5px solid ${inLine ? 'var(--ok)' : (done ? 'var(--ok)' : 'var(--border)')}`,
            background: isFree
              ? 'var(--chrome-2)'
              : done
                ? (inLine ? 'color-mix(in srgb, var(--ok) 22%, var(--paper))' : 'color-mix(in srgb, var(--ok) 12%, var(--paper))')
                : 'var(--paper)',
            color: done ? 'var(--text)' : 'var(--text)',
            opacity: done && !isFree ? 0.92 : 1,
            fontWeight: isFree ? 700 : 400,
          }
          return (
            <div
              key={i}
              style={cell}
              onClick={() => toggle(i)}
              role={isFree ? undefined : 'button'}
              tabIndex={isFree ? -1 : 0}
              aria-pressed={isFree ? undefined : done}
              title={isFree ? '자유 칸(항상 완료)' : (done ? '미적용으로 되돌리기' : '이 미션을 글에 적용하면 눌러 지우기')}
              onKeyDown={(e) => { if (!isFree && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(i) } }}
            >
              <span style={{ whiteSpace: 'pre-line' }}>{mission}</span>
              {done && !isFree && (
                <span style={{ position: 'absolute', top: 3, right: 5, fontSize: 12, color: 'var(--ok)' }}>✓</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 조작 버튼 */}
      {!confirmNew ? (
        <div style={actions}>
          <button className="btn-primary" onClick={requestNew} style={{ flex: 1 }}><Emoji e="🔀" /> 다시 생성</button>
          <button className="minibtn" onClick={resetMarks} disabled={markedCount <= 1}>↺ 표시 지우기</button>
        </div>
      ) : (
        <div style={{ ...actions, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
          <span style={{ fontSize: 12.5, flex: 1, color: 'var(--text)' }}>진행 중인 표시가 사라집니다. 새 빙고판을 만들까요?</span>
          <button className="btn-primary" onClick={regenerate}>새로 만들기</button>
          <button className="minibtn" onClick={() => setConfirmNew(false)}>취소</button>
        </div>
      )}

      {/* 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 빙고판과 진행을 프로젝트 자료에 메모로 추가'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)' }}>{toast}</div>}

      <div style={hint}>진행은 자동 저장됩니다. 미션은 출발점일 뿐, 글의 흐름에 맞게 자유롭게 변형해도 좋아요.</div>
    </div>
  )
}
