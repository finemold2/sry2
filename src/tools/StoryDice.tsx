// 스토리 주사위 — 인물/장소/사물/사건/감정 카테고리별 로컬 표에서 무작위로 굴려 글감 조합을 만든다.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(즐겨찾기 잠금 카테고리 저장)만 사용.
import { useState, useEffect, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'story-dice', name: '스토리 주사위', icon: '🎲', group: '영감·발상', intro: '인물·장소·사물·사건·감정 주사위를 굴려 글감을 만드세요', w: 460, h: 600 }

// 카테고리별 로컬 표(주사위 면). 충분히 다양하게.
interface Cat { key: string; label: string; icon: string; faces: string[] }

const CATS: Cat[] = [
  {
    key: 'person', label: '인물', icon: '🧑',
    faces: [
      '늙은 등대지기', '도망친 신부', '말 못 하는 소년', '퇴역한 마술사', '거짓말쟁이 점쟁이',
      '잠들지 못하는 시인', '국경의 밀수꾼', '폐교의 마지막 교사', '쌍둥이 중 동생', '시간을 파는 상인',
      '기억을 잃은 형사', '버려진 인형의 주인', '비를 부르는 여자', '한물간 권투선수', '비밀을 묻는 사서',
      '떠돌이 시계 수리공', '왕이 되기 싫은 왕자', '죽은 자의 편지를 쓰는 대필가',
    ],
  },
  {
    key: 'place', label: '장소', icon: '🗺️',
    faces: [
      '안개 낀 항구', '문 닫은 놀이공원', '지하 도서관', '눈 덮인 산장', '밤의 종착역',
      '바닷속 우체국', '버려진 천문대', '끝없는 계단이 있는 집', '사막 한가운데 전화부스', '시간이 멈춘 마을',
      '폐선된 야간열차', '옥상 위 비밀 정원', '거울로 둘러싸인 방', '강 위에 떠 있는 시장', '잊혀진 지하철역',
      '한밤의 24시 세탁소', '구름 위의 등대', '벽이 무너진 감옥',
    ],
  },
  {
    key: 'object', label: '사물', icon: '🔑',
    faces: [
      '멈춘 회중시계', '주인 없는 편지', '깨진 거울 조각', '낡은 오르골', '이름이 지워진 열쇠',
      '한쪽만 남은 장갑', '말을 거는 라디오', '잉크가 마르지 않는 펜', '녹슨 나침반', '봉인된 유리병',
      '되감기는 카세트테이프', '닳아버린 약속의 반지', '주소 없는 소포', '불 꺼지지 않는 양초', '낯선 사진 한 장',
      '비밀이 적힌 지도', '한 번도 펴지 않은 우산', '울리지 않는 종',
    ],
  },
  {
    key: 'event', label: '사건', icon: '⚡',
    faces: [
      '갑작스러운 정전', '오지 않는 막차', '사라진 이웃', '한 통의 협박 전화', '예고 없는 폭설',
      '뒤바뀐 가방', '되풀이되는 하루', '도착하지 않은 손님', '한밤중의 노크 소리', '잊혀진 약속의 부고',
      '거짓으로 시작된 장례식', '되돌아온 옛 연인', '풀리지 않는 매듭의 의식', '문득 들려온 자신의 목소리', '멈춰버린 모든 시계',
      '비밀이 적힌 유언장', '돌연 사라진 그림자', '한 사람만 기억하는 사건',
    ],
  },
  {
    key: 'emotion', label: '감정', icon: '💗',
    faces: [
      '말하지 못한 죄책감', '오래된 그리움', '서늘한 안도', '들킬까 두려운 설렘', '되돌릴 수 없는 후회',
      '낯선 질투', '잔잔한 체념', '끓어오르는 분노', '조용한 용서', '뒤늦은 깨달음',
      '버려졌다는 외로움', '복수의 다짐', '아련한 향수', '벅찬 해방감', '식어버린 사랑',
      '숨겨온 동경', '뼈아픈 연민', '이유 없는 불안',
    ],
  },
]

const LS = 'sry:tool:story-dice:'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 글감 한 줄을 조합으로 엮는 템플릿(굴린 결과들을 자연스러운 문장으로).
function compose(rolled: { cat: Cat; face: string }[]): string {
  const by: Record<string, string> = {}
  rolled.forEach((r) => { by[r.cat.key] = r.face })
  const p = by.person, pl = by.place, o = by.object, ev = by.event, em = by.emotion
  const parts: string[] = []
  if (p) parts.push(`「${p}」`)
  if (pl) parts.push(`${pl}에서`)
  if (ev) parts.push(`${ev}을(를) 마주하고`)
  if (o) parts.push(`${o}을(를) 두고`)
  if (em) parts.push(`${em}에 휩싸인다`)
  if (parts.length === 0) return '주사위를 굴려보세요.'
  return parts.join(' ') + (em ? '.' : ' — 이야기를 시작해 보세요.')
}

export default function StoryDice() {
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + 'active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => CATS.some((c) => c.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return CATS.map((c) => c.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  // 선택 카테고리 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'active', JSON.stringify(active)) } catch { /* ignore */ }
  }, [active])

  // 활성 목록에서 빠진 카테고리의 결과/잠금은 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  const toggleCat = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      // 원래 표 순서 유지하며 추가
      return CATS.filter((c) => prev.includes(c.key) || c.key === key).map((c) => c.key)
    })
    setCopied(false)
  }

  const roll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 면은 유지
        const cat = CATS.find((c) => c.key === k)
        if (!cat) return
        // 같은 결과가 연속으로 나오면 한 번 더 시도해 변화 체감↑
        let f = pick(cat.faces)
        if (f === prev[k] && cat.faces.length > 1) f = pick(cat.faces)
        next[k] = f
      })
      return next
    })
    // 짧은 굴림 애니메이션 표시용 (타이머 정리됨)
  }, [active, locked])

  // 굴림 표시(애니메이션) 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 350)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: string) => {
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const rolledList = active
    .map((k) => ({ cat: CATS.find((c) => c.key === k)!, face: results[k] }))
    .filter((r) => r.cat && r.face) as { cat: Cat; face: string }[]

  const seed = compose(rolledList)
  const hasResults = rolledList.length > 0

  const copy = () => {
    if (!hasResults) return
    const lines = rolledList.map((r) => `${r.cat.icon} ${r.cat.label}: ${r.face}`).join('\n')
    const text = `${lines}\n\n✍️ ${seed}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // 현재 굴린 주사위 조합 글감을 프로젝트 자료 〈영감 메모〉 폴더에 메모로 추가.
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProjectDoc = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); setTimeout(() => setToast(''), 1800); return }
    const rows = rolledList
      .map((r) => `<p><b>${escapeHtml(r.cat.icon)} ${escapeHtml(r.cat.label)}:</b> ${escapeHtml(r.face)}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escapeHtml(seed)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: `🎲 ${seed}`,
      bodyHtml,
    })
    setToast(id ? '프로젝트 자료 〈영감 메모〉 폴더에 글감을 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
    setTimeout(() => setToast(''), 1800)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }

  return (
    <div style={wrap}>
      <div style={hint}>
        굴릴 <b>카테고리</b>를 고르고 주사위를 굴리면, 각 면을 엮어 한 줄 글감을 만들어 줍니다. 마음에 드는 면은 <Emoji e="🔒"/>로 고정하세요.
      </div>

      {/* 카테고리 선택 */}
      <div style={chipRow}>
        {CATS.map((c) => {
          const on = active.includes(c.key)
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => toggleCat(c.key)}
              aria-pressed={on}
              style={{
                opacity: on ? 1 : 0.5,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
              }}
            >
              <Emoji e={c.icon}/> {c.label}{on ? '' : ' +'}
            </button>
          )
        })}
      </div>

      {/* 주사위 면들 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {active.map((k) => {
          const cat = CATS.find((c) => c.key === k)!
          const face = results[k]
          const isLocked = !!locked[k]
          return (
            <div
              key={k}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                <Emoji e={cat.icon}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cat.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, color: face ? 'var(--text)' : 'var(--muted)' }}>
                  {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                </div>
              </div>
              <button
                className="minibtn"
                onClick={() => toggleLock(k)}
                title={isLocked ? '고정 해제' : '이 면 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
              >
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 조합 글감 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="✍️"/> 글감 조합</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>{seed}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲"/> 주사위 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!hasResults}>
          {copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}
        </button>
        <button
          className="linkbtn"
          onClick={addToProjectDoc}
          disabled={!hasResults || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 굴린 글감 조합을 프로젝트 자료 〈영감 메모〉 폴더에 메모로 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>
      )}
      <div style={hint}>고정된 면은 그대로 두고 나머지만 다시 굴립니다. 조합은 출발점일 뿐, 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
