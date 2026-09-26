// 세계관 설문지 — 지리/역사/정치/경제/종교/마법·기술/사회·계급/언어·문화 8개 카테고리,
//   카테고리별 핵심 질문 60+개에 답을 채우며 작품 세계를 구체화한다.
// 카테고리는 펼침/접힘 + 진행률(답한 문항 수)을 보여주고, 전체 진행률도 함께 표시한다.
// 모든 답은 localStorage('sry:tool:worldbuilding-q')에 JSON 으로 자동 저장/복원한다.
// 연계: 작성한 답을 프로젝트 바인더의 [자료 › 세계관] 폴더에 text 문서로 추가(addToProject).
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'worldbuilding-q', name: '세계관 설문지', icon: '🌍', group: '구상·정리', intro: '8개 영역 60+개 질문에 답하며 작품 세계를 구체화하세요', w: 680, h: 620 }

const LS_KEY = 'sry:tool:worldbuilding-q'

interface Category {
  id: string
  name: string
  icon: string
  desc: string
  questions: { id: string; q: string }[]
}

// 8개 카테고리 · 총 72문항. 질문 id 는 안정적(저장 키)이어야 하므로 고정 문자열로 둔다.
const CATEGORIES: Category[] = [
  {
    id: 'geo',
    name: '지리',
    icon: '🗺️',
    desc: '땅과 자연, 공간의 모양',
    questions: [
      { id: 'geo1', q: '이 세계의 전체 지형은 어떻게 생겼나요? (대륙·바다·섬·산맥의 배치)' },
      { id: 'geo2', q: '기후와 계절은 어떤가요? 우리 세계와 다른 점이 있나요?' },
      { id: 'geo3', q: '이야기의 주 무대가 되는 지역은 어디이며 그 특징은 무엇인가요?' },
      { id: 'geo4', q: '사람들이 살기 어려운/위험한 지역(사막·극지·금단의 땅 등)이 있나요?' },
      { id: 'geo5', q: '특이한 자연 현상이나 지형(떠다니는 섬·영원한 폭풍 등)이 있나요?' },
      { id: 'geo6', q: '주요 도시와 마을은 왜 그 위치에 자리 잡았나요? (강·교역로·자원)' },
      { id: 'geo7', q: '동식물 생태는 어떤가요? 우리 세계에 없는 생물이 있나요?' },
      { id: 'geo8', q: '지역 간 이동은 어떻게 이루어지나요? (도로·뱃길·관문·텔레포트)' },
      { id: 'geo9', q: '핵심 자원(물·광물·식량·마력 등)은 어디에 분포해 있나요?' },
    ],
  },
  {
    id: 'hist',
    name: '역사',
    icon: '📜',
    desc: '과거가 현재에 남긴 흔적',
    questions: [
      { id: 'hist1', q: '이 세계는 어떻게 시작되었나요? (창세 신화 또는 기원)' },
      { id: 'hist2', q: '현재에 가장 큰 영향을 끼친 역사적 사건은 무엇인가요?' },
      { id: 'hist3', q: '큰 전쟁·재앙·혁명이 있었나요? 그 결과는 어땠나요?' },
      { id: 'hist4', q: '한때 번성했다가 사라진 문명이나 왕조가 있나요?' },
      { id: 'hist5', q: '사람들이 기억하는 영웅·악당·전설적 인물은 누구인가요?' },
      { id: 'hist6', q: '잊혔거나 왜곡된 역사, 숨겨진 진실이 있나요?' },
      { id: 'hist7', q: '현재 시점은 그 역사에서 어느 시대에 해당하나요? (황금기/쇠퇴기 등)' },
      { id: 'hist8', q: '미래에 대한 예언이나 시대의 흐름(다가오는 변화)이 있나요?' },
      { id: 'hist9', q: '역사는 어떻게 기록·전승되나요? 누가 그것을 통제하나요?' },
    ],
  },
  {
    id: 'pol',
    name: '정치',
    icon: '👑',
    desc: '권력은 누구에게, 어떻게',
    questions: [
      { id: 'pol1', q: '주요 통치 체제는 무엇인가요? (왕정·공화정·신정·부족 등)' },
      { id: 'pol2', q: '실질적인 권력은 누구에게 있나요? 명목상의 권력과 다른가요?' },
      { id: 'pol3', q: '권력은 어떻게 계승·획득되나요? (세습·선출·정복·자격시험)' },
      { id: 'pol4', q: '법은 어떻게 만들어지고 집행되나요? 누가 재판하나요?' },
      { id: 'pol5', q: '국가·세력 간의 관계는 어떤가요? (동맹·적대·중립)' },
      { id: 'pol6', q: '현재 가장 큰 정치적 긴장이나 갈등은 무엇인가요?' },
      { id: 'pol7', q: '반란 세력·비밀 결사·저항군 같은 집단이 있나요?' },
      { id: 'pol8', q: '평범한 사람이 권력에 영향을 줄 방법이 있나요?' },
      { id: 'pol9', q: '부패·음모·세력 다툼은 어떤 식으로 벌어지나요?' },
    ],
  },
  {
    id: 'econ',
    name: '경제',
    icon: '💰',
    desc: '무엇으로 먹고살고 거래하는가',
    questions: [
      { id: 'econ1', q: '주된 산업과 생계 수단은 무엇인가요? (농업·교역·수공·채굴 등)' },
      { id: 'econ2', q: '화폐나 교환 수단은 무엇인가요? 물물교환도 쓰이나요?' },
      { id: 'econ3', q: '가장 가치 있게 여겨지는 자원이나 상품은 무엇인가요?' },
      { id: 'econ4', q: '교역은 어떻게 이루어지나요? 주요 교역로·시장이 있나요?' },
      { id: 'econ5', q: '빈부 격차는 얼마나 큰가요? 부는 어떻게 쌓고 잃나요?' },
      { id: 'econ6', q: '길드·상회·조합 같은 경제 조직이 있나요?' },
      { id: 'econ7', q: '세금·관세·노역 등 사람들이 지는 경제적 부담은 무엇인가요?' },
      { id: 'econ8', q: '경제적 위기(기근·인플레·자원 고갈)가 이야기에 영향을 주나요?' },
    ],
  },
  {
    id: 'rel',
    name: '종교',
    icon: '⛪',
    desc: '무엇을 믿고 두려워하는가',
    questions: [
      { id: 'rel1', q: '주된 신앙·종교는 무엇인가요? 다신교인가요, 일신교인가요?' },
      { id: 'rel2', q: '신이나 신적 존재는 실재하나요? 세상에 직접 개입하나요?' },
      { id: 'rel3', q: '사람들은 죽음과 사후세계를 어떻게 믿나요?' },
      { id: 'rel4', q: '주요 의식·축제·금기는 무엇인가요?' },
      { id: 'rel5', q: '성직자·사제 계급의 권력과 역할은 어떤가요?' },
      { id: 'rel6', q: '종교 간 갈등이나 이단·박해가 있나요?' },
      { id: 'rel7', q: '평범한 사람의 일상에 신앙은 얼마나 스며들어 있나요?' },
      { id: 'rel8', q: '신화·경전·예언이 사회와 사건에 어떤 영향을 주나요?' },
    ],
  },
  {
    id: 'mag',
    name: '마법·기술',
    icon: '✨',
    desc: '세상을 움직이는 비범한 힘',
    questions: [
      { id: 'mag1', q: '마법 또는 핵심 기술의 원천(에너지)은 무엇인가요?' },
      { id: 'mag2', q: '그 힘을 쓸 수 있는 사람은 누구인가요? (재능·혈통·훈련·도구)' },
      { id: 'mag3', q: '힘에는 어떤 규칙과 한계, 대가(비용)가 있나요?' },
      { id: 'mag4', q: '그 힘이 일상생활을 어떻게 바꿔 놓았나요?' },
      { id: 'mag5', q: '힘은 어떻게 배우고 전수되나요? (학교·도제·금서)' },
      { id: 'mag6', q: '힘을 가진 자와 못 가진 자 사이에 어떤 차별·긴장이 있나요?' },
      { id: 'mag7', q: '금지된 마법/기술이나 위험한 부작용이 있나요?' },
      { id: 'mag8', q: '이 힘이 전쟁·정치·경제에 어떻게 활용되나요?' },
      { id: 'mag9', q: '기술 수준은 전반적으로 어느 정도인가요? (도구·운송·통신·의술)' },
    ],
  },
  {
    id: 'soc',
    name: '사회·계급',
    icon: '⚖️',
    desc: '사람들 사이의 자리와 관계',
    questions: [
      { id: 'soc1', q: '사회는 어떤 계급·신분으로 나뉘어 있나요?' },
      { id: 'soc2', q: '계급 간 이동(신분 상승·하락)이 가능한가요?' },
      { id: 'soc3', q: '성별·연령·인종에 따른 역할과 대우는 어떤가요?' },
      { id: 'soc4', q: '가족과 결혼, 자녀 양육은 어떤 형태인가요?' },
      { id: 'soc5', q: '차별받거나 소외된 집단이 있나요? 그 이유는 무엇인가요?' },
      { id: 'soc6', q: '교육은 누가, 어떻게 받나요?' },
      { id: 'soc7', q: '범죄와 처벌은 어떻게 다뤄지나요?' },
      { id: 'soc8', q: '사람들이 가장 중요하게 여기는 가치나 명예는 무엇인가요?' },
      { id: 'soc9', q: '여가·오락·스포츠는 어떤 모습인가요?' },
    ],
  },
  {
    id: 'cult',
    name: '언어·문화',
    icon: '🎭',
    desc: '말과 예술, 삶의 결',
    questions: [
      { id: 'cult1', q: '주로 쓰이는 언어는 무엇이며 방언·외국어는 어떤가요?' },
      { id: 'cult2', q: '인사·호칭·예절 등 일상의 관습은 어떤가요?' },
      { id: 'cult3', q: '의복·머리·장신구 등 외양은 무엇을 드러내나요? (신분·소속)' },
      { id: 'cult4', q: '음식 문화는 어떤가요? 특별한 요리나 식사 예법이 있나요?' },
      { id: 'cult5', q: '예술(음악·미술·이야기·춤)은 어떤 모습이고 누가 향유하나요?' },
      { id: 'cult6', q: '명절·통과의례(성년·결혼·장례)는 어떻게 치러지나요?' },
      { id: 'cult7', q: '속담·미신·금기·민담 등 전승되는 이야기가 있나요?' },
      { id: 'cult8', q: '문자·기록 문화는 어떤가요? 글을 읽고 쓰는 사람은 얼마나 되나요?' },
      { id: 'cult9', q: '이 문화만의 독특한 가치관·세계관(시간·자연·죽음에 대한 태도)은?' },
    ],
  },
]

const TOTAL_Q = CATEGORIES.reduce((n, c) => n + c.questions.length, 0)

type Answers = Record<string, string>

// localStorage 복원 — 미지원/차단/손상 시 빈 객체로 graceful. 문자열 값만 받아들인다.
function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {}
    const out: Answers = {}
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function answeredCount(answers: Answers, cat: Category): number {
  return cat.questions.reduce((n, q) => (answers[q.id] && answers[q.id].trim() ? n + 1 : n), 0)
}

export default function WorldbuildingQ({ payload }: { payload?: Record<string, unknown> }) {
  const [answers, setAnswers] = useState<Answers>(() => loadAnswers())
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [CATEGORIES[0].id]: true }))
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const payloadDone = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(answers))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.')
    }
  }, [answers])

  // payload.open 으로 특정 카테고리를 펼쳐 열어달라는 요청이 오면 1회 반영.
  useEffect(() => {
    if (payloadDone.current) return
    const target = payload && typeof payload.open === 'string' ? (payload.open as string) : ''
    if (!target) return
    payloadDone.current = true
    if (CATEGORIES.some((c) => c.id === target)) {
      setOpen((p) => ({ ...p, [target]: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const setAnswer = (id: string, v: string) => setAnswers((p) => ({ ...p, [id]: v }))

  const toggle = (id: string) => setOpen((p) => ({ ...p, [id]: !p[id] }))
  const openAll = () => setOpen(Object.fromEntries(CATEGORIES.map((c) => [c.id, true])))
  const closeAll = () => setOpen({})

  const totalAnswered = CATEGORIES.reduce((n, c) => n + answeredCount(answers, c), 0)
  const pct = TOTAL_Q ? Math.round((totalAnswered / TOTAL_Q) * 100) : 0
  const hasAny = totalAnswered > 0

  // 답한 문항만 모아 사람이 읽기 좋은 텍스트로 변환(복사용).
  const buildText = (): string => {
    const blocks: string[] = []
    for (const cat of CATEGORIES) {
      const lines = cat.questions
        .filter((q) => answers[q.id] && answers[q.id].trim())
        .map((q) => `Q. ${q.q}\nA. ${answers[q.id].trim()}`)
      if (lines.length) {
        blocks.push(`■ ${cat.name}\n\n${lines.join('\n\n')}`)
      }
    }
    return blocks.join('\n\n' + '─'.repeat(28) + '\n\n')
  }

  const copyAll = async () => {
    if (!hasAny) { flashNote('아직 답한 문항이 없어요.'); return }
    const text = buildText()
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flashNote(`답한 ${totalAnswered}개 문항을 복사했어요.`)
    } catch {
      flashNote('복사에 실패했어요. 직접 선택해 복사하세요.')
    }
  }

  const resetAll = () => {
    setAnswers({})
    flashNote('모든 답을 지웠어요.')
  }

  // 답한 문항을 카테고리별 소제목 + Q/A 형태의 HTML 로 묶어 프로젝트 자료 〈세계관〉에 추가.
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addDocToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않아요.'); return }
    if (!hasAny) { flashNote('답한 문항이 있어야 추가할 수 있어요.'); return }
    const parts: string[] = []
    parts.push(`<p style="color:#888;">세계관 설문지 — ${totalAnswered}/${TOTAL_Q}문항 작성 (${pct}%)</p>`)
    for (const cat of CATEGORIES) {
      const answered = cat.questions.filter((q) => answers[q.id] && answers[q.id].trim())
      if (!answered.length) continue
      parts.push(`<h3>${escapeHtml(cat.icon + ' ' + cat.name)}</h3>`)
      for (const q of answered) {
        parts.push(`<p><b>${escapeHtml('Q. ' + q.q)}</b></p>`)
        parts.push(`<p>${escapeHtml(answers[q.id].trim()).replace(/\n/g, '<br/>')}</p>`)
      }
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: '세계관 설문지',
      bodyHtml: parts.join(''),
    })
    flashNote(id ? '프로젝트 자료 〈세계관〉 폴더에 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }
  const headRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }
  const barTrack: React.CSSProperties = { flex: 1, height: 8, borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', minWidth: 120 }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.25s ease' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const catCard: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', overflow: 'hidden' }
  const catHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)' }
  const catName: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }
  const catDesc: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }
  const miniBar: React.CSSProperties = { width: 56, height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }
  const qList: React.CSSProperties = { padding: '6px 13px 13px', display: 'flex', flexDirection: 'column', gap: 12 }
  const qLabel: React.CSSProperties = { fontSize: 13, lineHeight: 1.55, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 6 }
  const area: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 52, lineHeight: 1.6, fontFamily: 'inherit' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.65 }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={headRow}>
          <span style={title}><Emoji e="🌍" /> 세계관 설문지</span>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={openAll} title="모든 영역 펼치기">⊕ 모두 펼치기</button>
          <button className="minibtn" onClick={closeAll} title="모든 영역 접기">⊖ 모두 접기</button>
        </div>
        <div style={headRow}>
          <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>진행률 {totalAnswered}/{TOTAL_Q}</span>
          <div style={barTrack}><div style={barFill} /></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--ok)' : 'var(--accent)', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
        <div style={headRow}>
          <button
            className="linkbtn"
            onClick={addDocToProject}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '답한 문항을 프로젝트 자료 〈세계관〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <button className="minibtn" onClick={copyAll} disabled={!hasAny}><Emoji e="📋" /> 답안 복사</button>
          <span style={{ flex: 1 }} />
          <button className="minibtn" onClick={resetAll} disabled={!hasAny} style={{ color: hasAny ? 'var(--warn)' : undefined }} title="모든 답 지우기"><Emoji e="🗑️" /> 전체 비우기</button>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{note}</div>}
      </div>

      <div style={body}>
        {CATEGORIES.map((cat) => {
          const isOpen = !!open[cat.id]
          const done = answeredCount(answers, cat)
          const cpct = Math.round((done / cat.questions.length) * 100)
          return (
            <div key={cat.id} style={catCard}>
              <div style={catHead} onClick={() => toggle(cat.id)} role="button" aria-expanded={isOpen}>
                <span style={{ fontSize: 13, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={catName}><Emoji e={cat.icon} /> {cat.name}</span>
                  <span style={catDesc}>{cat.desc}</span>
                </div>
                <div style={miniBar} title={`${done}/${cat.questions.length} 문항`}>
                  <div style={{ height: '100%', width: `${cpct}%`, background: done === cat.questions.length ? 'var(--ok)' : 'var(--accent)' }} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right' }}>{done}/{cat.questions.length}</span>
              </div>
              {isOpen && (
                <div style={qList}>
                  {cat.questions.map((q, i) => {
                    const val = answers[q.id] || ''
                    const filled = !!val.trim()
                    return (
                      <div key={q.id}>
                        <div style={qLabel}>
                          <span style={{ flexShrink: 0, color: filled ? 'var(--ok)' : 'var(--muted)', fontWeight: 700 }}>{filled ? '✓' : i + 1 + '.'}</span>
                          <span style={{ color: 'var(--text)' }}>{q.q}</span>
                        </div>
                        <textarea
                          style={area}
                          value={val}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          placeholder="여기에 답을 적어 보세요…"
                          aria-label={q.q}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div style={hint}>
          모든 답은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다. 빈 칸은 비워 두어도 괜찮아요 —
          떠오르는 영역부터 채우다 보면 세계가 점점 또렷해집니다. 총 {TOTAL_Q}개 문항, {CATEGORIES.length}개 영역.
        </div>
      </div>
    </div>
  )
}
