// 로그라인 대장간 — 조합형 로그라인 생성기(수만 가지 조합).
//  템플릿: "[상황]에 처한 [주인공]이 [목표]하려 하지만 [장애물]; 실패하면 [위험]."
//  각 슬롯은 로컬 무작위 풀에서 뽑으며, 슬롯별 잠금(🔒) → 잠긴 슬롯은 그대로 두고 나머지만 재생성.
//  자급식: 외부 네트워크·라이브러리 없음(Math.random + localStorage 잠금/마지막 결과 저장)만 사용.
//  연계: 완성된 로그라인을 스니펫 라이브러리로 저장 / 프로젝트 자료 〈로그라인〉 폴더에 메모로 추가.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'logline-forge', name: '로그라인 대장간', icon: '⚒️', group: '영감·발상', intro: '슬롯을 굴려 한 줄 로그라인을 벼려내세요(수만 조합)', w: 480, h: 620 }

// ---------- 슬롯 정의 ----------
interface Slot { key: string; label: string; icon: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'situation', label: '상황', icon: '🌪️',
    pool: [
      '하룻밤 사이 모든 기억을 잃은 채', '국경이 봉쇄된 도시에서', '시한부 선고를 받은 뒤',
      '죽은 줄 알았던 사람의 편지를 받고', '단 하나의 거짓말이 들통난 순간',
      '마지막 열차가 끊긴 폐역에서', '폭설로 외부와 단절된 산장에서', '반복되는 하루에 갇힌 채',
      '정체불명의 빚을 떠안은 채', '누명을 쓰고 쫓기는 처지에', '오랜 가뭄으로 마을이 말라붙은 가운데',
      '전쟁이 끝난 폐허 위에서', '모두가 자신을 잊어버린 세상에서', '단 24시간의 시간만 주어진 채',
      '믿었던 이에게 배신당한 직후', '낯선 도시에 홀로 떨어진 채', '금지된 비밀을 우연히 알게 된 뒤',
      '가족이 사라진 텅 빈 집에서', '신분을 숨겨야 하는 잠입 임무 중에', '마지막 기회만 남은 절박한 처지에',
    ],
  },
  {
    key: 'hero', label: '주인공', icon: '🧑',
    pool: [
      '은퇴한 형사', '말 못 하는 소년', '거짓말이 들리는 여자', '도망친 신부', '한물간 마술사',
      '기억을 파는 상인', '시골 마을의 우편배달부', '폐교의 마지막 교사', '떠돌이 시계 수리공',
      '왕이 되기 싫은 왕자', '죽은 자의 편지를 쓰는 대필가', '겁 많은 도둑', '전직 스파이였던 제빵사',
      '눈먼 사진가', '복수를 잊은 검객', '잠들지 못하는 시인', '비를 부르는 점쟁이',
      '평범한 회사원', '버려진 인형의 주인', '국경의 밀수꾼', '늙은 등대지기', '쌍둥이 중 동생',
    ],
  },
  {
    key: 'goal', label: '목표', icon: '🎯',
    pool: [
      '잃어버린 동생을 찾으려', '진실을 세상에 밝히려', '사라진 연인을 되찾으려',
      '도시를 탈출하려', '오래된 누명을 벗으려', '마지막 약속을 지키려',
      '봉인된 비밀을 풀려', '무너진 가문을 다시 세우려', '복수를 완성하려',
      '단 한 사람을 구하려', '잊혀진 진짜 이름을 되찾으려', '저주를 끊으려',
      '빚을 갚고 자유를 얻으려', '고향으로 돌아가려', '금지된 사랑을 지키려',
      '세상의 멸망을 막으려', '자신이 누구인지 알아내려', '딸의 신뢰를 되찾으려',
      '단 하나의 진실한 우정을 지키려', '되돌릴 수 없는 실수를 바로잡으려',
    ],
  },
  {
    key: 'obstacle', label: '장애물', icon: '🚧',
    pool: [
      '모든 단서가 자신을 범인으로 가리키고', '믿었던 동료마저 적이 되어 있으며',
      '시간이 점점 줄어들고', '진실을 아는 유일한 증인이 입을 닫았고',
      '권력자들이 그를 침묵시키려 하며', '기억은 매일 조금씩 지워지고',
      '사랑하는 이가 그 길을 가로막으며', '과거의 죄가 발목을 잡고',
      '도시 전체가 그를 적으로 돌렸으며', '정작 자신을 믿을 수 없게 되고',
      '대가로 가장 소중한 것을 내놓아야 하며', '쫓는 자가 한 발 앞서 있고',
      '규칙을 어기면 모든 것을 잃게 되며', '진실은 그가 사랑한 모든 것을 부수고',
      '몸이 점점 말을 듣지 않으며', '아무도 그의 말을 믿지 않고',
      '함정인 줄 알면서도 들어갈 수밖에 없으며', '구하려던 그 사람이 가장 큰 위협이고',
    ],
  },
  {
    key: 'stake', label: '위험', icon: '💀',
    pool: [
      '무고한 사람들이 대신 죗값을 치른다', '도시는 영영 어둠에 잠긴다',
      '그는 자기 자신마저 잃고 만다', '사랑하는 이가 두 번 죽는다',
      '진실은 영원히 묻혀버린다', '복수의 사슬이 다음 세대로 이어진다',
      '남은 시간 속에 모두가 사라진다', '세상은 거짓 위에 다시 세워진다',
      '그가 지키려던 모든 것이 무너진다', '아무도 그를 기억하지 못하게 된다',
      '저주는 끝없이 되풀이된다', '마지막 희망의 불씨마저 꺼진다',
      '죄 없는 아이가 그 대가를 떠안는다', '그는 영원히 누명 속에 갇힌다',
      '고향은 지도에서 지워진다', '되돌릴 기회는 다시 오지 않는다',
    ],
  },
]

const LS = 'sry:tool:logline-forge:'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 총 조합수(슬롯 풀 크기의 곱)
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

// 굴린 결과를 한 줄 로그라인으로 엮는다.
function compose(r: Record<string, string>): string {
  const { situation, hero, goal, obstacle, stake } = r
  if (!hero) return ''
  // "[상황]에 처한 [주인공]이 [목표]하려 하지만 [장애물]; 실패하면 [위험]."
  const head = situation ? `${situation} ` : ''
  const body = `${hero}이(가) ${goal ?? ''} 하지만, ${obstacle ?? ''}`
  const tail = stake ? `; 실패하면 ${stake}.` : '.'
  return `${head}${body}${tail}`.replace(/\s+/g, ' ').replace(/\s+([;,.])/g, '$1').trim()
}

export default function LoglineForge({ payload }: { payload?: Record<string, unknown> }) {
  const [results, setResults] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'results')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') {
          const next: Record<string, string> = {}
          SLOTS.forEach((s) => { if (typeof obj[s.key] === 'string' && s.pool.includes(obj[s.key])) next[s.key] = obj[s.key] })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'locked')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') {
          const next: Record<string, boolean> = {}
          SLOTS.forEach((s) => { if (obj[s.key]) next[s.key] = true })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  // payload 로 시작 텍스트를 받으면(선택) 상황 슬롯의 힌트로만 사용(풀 침범 없이 무시 가능)
  const nonceRef = useRef(0)        // 굴림 애니메이션 경쟁상태 방지용 nonce
  const toastTimerRef = useRef<number | null>(null)

  // 초기 진입 시 결과가 없으면 자동으로 한 번 벼려둔다(빈 화면 방지)
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (Object.keys(results).length === 0) {
      const next: Record<string, string> = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setResults(next)
    }
    // payload 는 현재 힌트 용도로만(슬롯 강제 안 함). 미사용 경고 방지.
    void payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 결과/잠금 영속
  useEffect(() => { try { localStorage.setItem(LS + 'results', JSON.stringify(results)) } catch { /* ignore */ } }, [results])
  useEffect(() => { try { localStorage.setItem(LS + 'locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1800)
  }, [])

  const rollAll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return  // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool)  // 같은 값 연속 회피
        next[s.key] = v
      })
      return next
    })
  }, [locked])

  // 단일 슬롯 재생성
  const rollOne = useCallback((key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      let v = pick(s.pool)
      if (v === prev[key] && s.pool.length > 1) v = pick(s.pool)
      return { ...prev, [key]: v }
    })
  }, [])

  // 굴림 애니메이션 자동 해제(언마운트/연속 굴림 경쟁상태 정리)
  useEffect(() => {
    if (!rolling) return
    const my = nonceRef.current
    const t = window.setTimeout(() => { if (nonceRef.current === my) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const logline = compose(results)
  const hasAll = SLOTS.every((s) => results[s.key])
  const ready = !!logline && hasAll

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(logline).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  // 스니펫 라이브러리에 저장(다른 도구에서 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: logline, source: '로그라인 대장간', tags: ['로그라인'] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 자료 〈로그라인〉 폴더에 메모로 추가
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(results[s.key] || '')}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>⚒️ ${esc(logline)}</b></p>`,
      `<hr/>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '로그라인',
      title: `⚒️ ${esc(logline).slice(0, 60)}`,
      bodyHtml,
    })
    flash(id ? '프로젝트 자료 〈로그라인〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  const lockedCount = SLOTS.filter((s) => locked[s.key]).length

  return (
    <div style={wrap}>
      <div style={hint}>
        템플릿 <b>“[상황]에 처한 [주인공]이 [목표]하려 하지만 [장애물]; 실패하면 [위험].”</b> 의 다섯 슬롯을 굴려 한 줄 로그라인을 벼려냅니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하세요.
      </div>

      {/* 조합수 표시 */}
      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(TOTAL_COMBOS)}</b> 가지</span>
        <span>{lockedCount > 0 ? <><Emoji e="🔒"/> {`${lockedCount}개 고정됨`}</> : '고정 없음 — 전부 새로 굴림'}</span>
      </div>

      {/* 슬롯 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {SLOTS.map((s) => {
          const v = results[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div
              key={s.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                <Emoji e={s.icon}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.7 }}>({s.pool.length})</span></div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                </div>
              </div>
              <button
                className="minibtn"
                onClick={() => rollOne(s.key)}
                title="이 슬롯만 다시 굴리기"
                style={{ flexShrink: 0 }}
                disabled={isLocked}
              >
                <Emoji e="🎲"/>
              </button>
              <button
                className="minibtn"
                onClick={() => toggleLock(s.key)}
                title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                aria-pressed={isLocked}
              >
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 완성 로그라인 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⚒️"/> 완성된 로그라인</div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: ready ? 'var(--text)' : 'var(--muted)' }}>
          {logline || '슬롯을 굴려 로그라인을 만들어 보세요.'}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={rollAll}><Emoji e="⚒️"/> 로그라인 벼리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="완성된 로그라인을 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '완성된 로그라인을 프로젝트 자료 〈로그라인〉 폴더에 메모로 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div style={hint}>잠긴 슬롯은 그대로 두고 나머지만 다시 굴립니다. 로그라인은 출발점일 뿐 — 자유롭게 다듬어 보세요.</div>

      {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 슬롯 문구는 이 도구가 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
