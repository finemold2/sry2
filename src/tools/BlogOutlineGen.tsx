// 블로그 글 개요 생성기(조합형) — 유형(리스티클/하우투/오피니언/리뷰/경험담) × 후킹 제목 × 소제목 세트를
// 무작위로 조합해 블로그 글의 뼈대(개요)를 만들어 준다. 슬롯(유형/제목)을 🔒로 잠그고 다시 생성할 수 있으며,
// 제목·소제목을 직접 편집할 수 있다. 가능한 총 조합 수를 표시한다.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(마지막 개요 자동 저장/복원)만 사용.
// 연계(linkbus): 완성한 개요를 프로젝트 원고('draft')의 '블로그' 폴더에 문서로 추가한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'blog-outline', name: '블로그 개요 생성기', icon: '📝', group: '영감·발상', intro: '유형×후킹 제목×소제목 세트를 조합해 블로그 글 뼈대를 만드세요', w: 600, h: 660 }

const LS = 'sry:tool:blog-outline'

// ---------- 데이터: 글 유형별 제목 후크 + 소제목 세트 ----------
interface BlogType {
  key: string
  label: string
  icon: string
  desc: string
  // 제목 템플릿: {주제} 는 사용자가 입력한 주제로 치환
  titles: string[]
  // 소제목 세트(여러 후보 묶음 중 하나를 통째로 뽑는다)
  sectionSets: string[][]
}

const TYPES: BlogType[] = [
  {
    key: 'listicle', label: '리스티클', icon: '🔢',
    desc: '항목을 나열해 빠르게 훑게 하는 목록형 글',
    titles: [
      '{주제}, 알아두면 좋은 7가지',
      '{주제} 입문자가 꼭 알아야 할 5가지',
      '의외로 모르는 {주제} 꿀팁 10가지',
      '{주제} 고수들이 쓰는 3가지 습관',
      '시간을 아껴주는 {주제} 도구 6선',
      '{주제}에서 흔히 하는 실수 5가지',
      '지금 당장 써먹는 {주제} 체크리스트 8개',
    ],
    sectionSets: [
      ['도입: 왜 이 목록이 필요한가', '항목 1~3: 기본부터', '항목 4~6: 한 단계 위로', '항목 7: 보너스 팁', '정리: 오늘 하나만 해본다면'],
      ['들어가며: 흔한 고민', '핵심 항목 톱5', '각 항목의 실전 적용법', '주의할 점', '마무리: 우선순위 정하기'],
      ['공감 한 줄로 시작', '리스트 빠르게 훑기', '내가 직접 써본 항목 강조', '추천 조합', '한 줄 요약'],
    ],
  },
  {
    key: 'howto', label: '하우투', icon: '🛠️',
    desc: '단계별로 따라 하게 만드는 방법 안내형 글',
    titles: [
      '{주제} 시작하는 법, 단계별 정리',
      '초보도 따라 하는 {주제} 완벽 가이드',
      '{주제} 30분 만에 끝내기',
      '딱 3단계로 끝내는 {주제}',
      '{주제} 제대로 하는 법 (실전 위주)',
      '실패 없이 {주제} 하는 방법',
      '{주제}, 이 순서대로만 하세요',
    ],
    sectionSets: [
      ['준비물·사전 조건', '1단계: 시작하기', '2단계: 핵심 작업', '3단계: 마무리·점검', '자주 막히는 부분 해결'],
      ['이 글로 얻는 결과', '전체 흐름 한눈에', '단계별 상세 가이드', '예시로 보기', '체크리스트로 마무리'],
      ['왜 이 방법인가', '환경 세팅', '핵심 단계 따라 하기', '응용·변형', '다음으로 할 일'],
    ],
  },
  {
    key: 'opinion', label: '오피니언', icon: '💭',
    desc: '주장과 근거로 관점을 설득하는 의견형 글',
    titles: [
      '{주제}, 나는 이렇게 생각한다',
      '왜 {주제}는 과대평가됐을까',
      '{주제}에 대한 불편한 진실',
      '모두가 {주제}를 오해하고 있다',
      '{주제}, 이제는 바뀌어야 할 때',
      '{주제}를 둘러싼 논쟁, 핵심만',
      '솔직히 말해서, {주제}는…',
    ],
    sectionSets: [
      ['문제 제기: 무엇이 걸리는가', '내 주장 한 문장', '근거 1·2·3', '예상 반론과 답', '결론: 그래서 어떻게'],
      ['통념 짚기', '나는 다르게 본다', '왜 그렇게 보는가', '구체적 사례', '독자에게 던지는 질문'],
      ['시의성 있는 도입', '핵심 입장', '데이터·경험 근거', '균형 잡기(반대 시각)', '마무리 제언'],
    ],
  },
  {
    key: 'review', label: '리뷰', icon: '⭐',
    desc: '장단점과 추천 여부를 정리하는 평가형 글',
    titles: [
      '{주제} 솔직 후기 (장단점 총정리)',
      '{주제} 한 달 써본 결과',
      '{주제}, 살까 말까? 핵심 정리',
      '{주제} vs 대안 비교 리뷰',
      '돈값 하는가? {주제} 가성비 점검',
      '{주제}, 이런 사람에게 추천',
      '{주제} 장점만 있는 줄 알았는데…',
    ],
    sectionSets: [
      ['한 줄 총평·별점', '첫인상·언박싱', '좋았던 점', '아쉬웠던 점', '추천 대상·비추천 대상'],
      ['왜 이걸 골랐나', '주요 스펙·특징', '직접 써본 경험', '비교 대상과의 차이', '최종 추천 여부'],
      ['기대 vs 현실', '핵심 장점 3가지', '치명적 단점은?', '가격 대비 만족도', '대안 추천'],
    ],
  },
  {
    key: 'story', label: '경험담', icon: '📖',
    desc: '개인적 경험을 이야기로 풀어내는 서사형 글',
    titles: [
      '{주제}, 직접 해보고 느낀 것들',
      '내가 {주제}를 시작하게 된 이유',
      '{주제}로 인생이 바뀐 1년',
      '{주제} 도전기: 실패와 배움',
      '솔직한 {주제} 적응기',
      '{주제}, 막상 해보니 이랬다',
      '돌아보니 {주제}가 남긴 것',
    ],
    sectionSets: [
      ['그때의 상황·계기', '처음 부딪힌 벽', '전환점이 된 순간', '지금의 변화', '같은 길을 걷는 이에게'],
      ['시작 전의 나', '뛰어든 이유', '겪은 일들(시간순)', '깨달은 점', '마무리: 다시 한다면'],
      ['솔직한 고백으로 시작', '기대와 현실의 간극', '가장 힘들었던 순간', '그래서 얻은 것', '독자에게 건네는 한마디'],
    ],
  },
]

// ---------- 유틸 ----------
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
function pickIndex(len: number, avoid: number): number {
  if (len <= 1) return 0
  let i = Math.floor(Math.random() * len)
  if (i === avoid) i = (i + 1 + Math.floor(Math.random() * (len - 1))) % len
  return i
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const DEFAULT_TOPIC = '아침 루틴'
function applyTopic(tpl: string, topic: string): string {
  const t = topic.trim() || DEFAULT_TOPIC
  return tpl.replace(/\{주제\}/g, t)
}

// 전체 조합 수: Σ(유형별) 제목 후보 × 소제목 세트 후보
function totalCombos(): number {
  return TYPES.reduce((sum, t) => sum + t.titles.length * t.sectionSets.length, 0)
}

interface OutlineState {
  topic: string
  typeKey: string
  titleIdx: number       // 선택된 제목 템플릿 인덱스
  title: string          // 실제 제목(편집 가능, 주제 적용 후)
  sections: string[]     // 소제목들(편집 가능)
  lockType: boolean
  lockTitle: boolean
}

function freshSections(t: BlogType): string[] {
  return pick(t.sectionSets).slice()
}

function buildInitial(): OutlineState {
  const t = TYPES[0]
  const ti = Math.floor(Math.random() * t.titles.length)
  return {
    topic: DEFAULT_TOPIC,
    typeKey: t.key,
    titleIdx: ti,
    title: applyTopic(t.titles[ti], DEFAULT_TOPIC),
    sections: freshSections(t),
    lockType: false,
    lockTitle: false,
  }
}

function loadState(): OutlineState {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw)
      const t = TYPES.find((x) => x.key === p.typeKey) || TYPES[0]
      const titleIdx = typeof p.titleIdx === 'number' && p.titleIdx >= 0 && p.titleIdx < t.titles.length ? p.titleIdx : 0
      const sections = Array.isArray(p.sections) && p.sections.length
        ? p.sections.map((s: unknown) => String(s))
        : freshSections(t)
      return {
        topic: typeof p.topic === 'string' ? p.topic : DEFAULT_TOPIC,
        typeKey: t.key,
        titleIdx,
        title: typeof p.title === 'string' && p.title ? p.title : applyTopic(t.titles[titleIdx], p.topic || DEFAULT_TOPIC),
        sections,
        lockType: !!p.lockType,
        lockTitle: !!p.lockTitle,
      }
    }
  } catch { /* ignore */ }
  return buildInitial()
}

export default function BlogOutlineGen({ payload }: { payload?: Record<string, unknown> }) {
  const [st, setSt] = useState<OutlineState>(loadState)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const seededRef = useRef(false)

  const curType = TYPES.find((t) => t.key === st.typeKey) || TYPES[0]
  const combos = totalCombos()

  // 페이로드로 주제가 전달되면 한 번 적용해 즉시 재생성
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    const p = payload && (payload.topic ?? payload.text ?? payload.title)
    if (typeof p === 'string' && p.trim()) {
      setSt((prev) => regenerate({ ...prev, topic: p.trim(), lockType: false, lockTitle: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장(마지막 개요 복원)
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(st)) } catch { /* 저장 실패 graceful */ }
  }, [st])

  // 토스트 자동 해제(언마운트 정리)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2000)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(id)
  }, [copied])

  // 핵심: 잠그지 않은 슬롯만 새로 굴린다
  const regenerate = useCallback((base: OutlineState): OutlineState => {
    const next: OutlineState = { ...base }
    // 유형
    let type = TYPES.find((t) => t.key === next.typeKey) || TYPES[0]
    if (!next.lockType) {
      type = pick(TYPES)
      next.typeKey = type.key
    }
    // 제목(유형이 바뀌면 잠금이어도 인덱스 보정)
    if (!next.lockTitle || next.titleIdx >= type.titles.length) {
      const avoid = next.typeKey === base.typeKey ? base.titleIdx : -1
      next.titleIdx = pickIndex(type.titles.length, avoid)
    }
    next.title = applyTopic(type.titles[next.titleIdx], next.topic)
    // 소제목 세트는 항상 새로(잠금 슬롯이 아님)
    next.sections = freshSections(type)
    return next
  }, [])

  const onRegenerate = () => {
    setSt((prev) => regenerate(prev))
    setCopied(false)
  }

  const setTopic = (topic: string) => {
    setSt((prev) => ({ ...prev, topic, title: applyTopic(curType.titles[prev.titleIdx] ?? curType.titles[0], topic) }))
  }

  const pickType = (key: string) => {
    setSt((prev) => {
      const t = TYPES.find((x) => x.key === key) || TYPES[0]
      const titleIdx = Math.min(prev.titleIdx, t.titles.length - 1)
      return {
        ...prev,
        typeKey: key,
        titleIdx,
        title: applyTopic(t.titles[titleIdx], prev.topic),
        sections: freshSections(t),
      }
    })
  }

  const toggleLockType = () => setSt((p) => ({ ...p, lockType: !p.lockType }))
  const toggleLockTitle = () => setSt((p) => ({ ...p, lockTitle: !p.lockTitle }))

  const rerollTitle = () => {
    setSt((prev) => {
      const idx = pickIndex(curType.titles.length, prev.titleIdx)
      return { ...prev, titleIdx: idx, title: applyTopic(curType.titles[idx], prev.topic) }
    })
  }
  const rerollSections = () => setSt((prev) => ({ ...prev, sections: freshSections(curType) }))

  // 소제목 편집/추가/삭제/이동
  const editSection = (i: number, v: string) =>
    setSt((prev) => ({ ...prev, sections: prev.sections.map((s, idx) => (idx === i ? v : s)) }))
  const removeSection = (i: number) =>
    setSt((prev) => ({ ...prev, sections: prev.sections.filter((_, idx) => idx !== i) }))
  const addSection = () =>
    setSt((prev) => ({ ...prev, sections: [...prev.sections, '새 소제목'] }))
  const moveSection = (i: number, dir: -1 | 1) =>
    setSt((prev) => {
      const ni = i + dir
      if (ni < 0 || ni >= prev.sections.length) return prev
      const a = prev.sections.slice()
      ;[a[i], a[ni]] = [a[ni], a[i]]
      return { ...prev, sections: a }
    })
  const editTitle = (v: string) => setSt((prev) => ({ ...prev, title: v }))

  // 평문 개요
  const plainOutline = (): string => {
    const lines = [
      `# ${st.title}`,
      `(유형: ${curType.label})`,
      '',
      ...st.sections.map((s, i) => `${i + 1}. ${s}`),
    ]
    return lines.join('\n')
  }

  const copyOutline = () => {
    if (!navigator.clipboard) { setToast('이 환경에서는 복사가 지원되지 않습니다.'); return }
    navigator.clipboard.writeText(plainOutline())
      .then(() => setCopied(true))
      .catch(() => setToast('복사에 실패했어요. 직접 선택해 복사해 주세요.'))
  }

  // 프로젝트 연계 — 개요를 원고('draft')의 '블로그' 폴더에 문서로 추가
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const body =
      `<p style="color:#888;font-size:12px;">유형: ${escHtml(curType.label)} · 주제: ${escHtml(st.topic.trim() || DEFAULT_TOPIC)}</p>` +
      st.sections.map((s, i) => `<h3>${i + 1}. ${escHtml(s)}</h3><p></p>`).join('')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '블로그',
      title: st.title || '제목 없는 블로그 글',
      bodyHtml: body,
      synopsis: `[${curType.label}] ` + st.sections.join(' / '),
      meta: { 유형: curType.label, 주제: st.topic.trim() || DEFAULT_TOPIC, 소제목수: String(st.sections.length) },
    })
    setToast(id ? '원고 〈블로그〉 폴더에 개요를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }
  const slotHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const slotLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--accent)' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>유형 × 후킹 제목 × 소제목 세트</b>를 조합해 블로그 글의 뼈대를 만듭니다. 슬롯을 <Emoji e="🔒" />로 고정하고
        <b> 다시 생성</b>해 마음에 드는 조합을 찾으세요. 제목·소제목은 직접 편집할 수 있어요.
      </div>

      {/* 주제 입력 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>주제</span>
        <input
          style={inputStyle}
          value={st.topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 아침 루틴, 재택근무, 캠핑 입문…"
          aria-label="블로그 글 주제"
        />
      </div>

      {/* 유형 슬롯 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={slotLabel}>유형</span>
        {TYPES.map((t) => {
          const on = t.key === st.typeKey
          return (
            <button
              key={t.key}
              className="minibtn"
              onClick={() => pickType(t.key)}
              aria-pressed={on}
              title={t.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)', opacity: on ? 1 : 0.7 }}
            >
              <Emoji e={t.icon} /> {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={toggleLockType} title={st.lockType ? '유형 고정 해제' : '유형 고정'}
          style={{ borderColor: st.lockType ? 'var(--accent)' : 'var(--border)' }}>
          {st.lockType ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
      </div>
      <div style={{ ...hint, marginTop: -4 }}><Emoji e={curType.icon} /> {curType.label} — {curType.desc}</div>

      {/* 개요 본문(스크롤 영역) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {/* 제목 슬롯 */}
        <div style={panel}>
          <div style={slotHead}>
            <span style={slotLabel}>후킹 제목</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={rerollTitle} title="제목만 다시 뽑기"><Emoji e="🔄" /> 다른 제목</button>
            <button className="minibtn" onClick={toggleLockTitle} title={st.lockTitle ? '제목 고정 해제' : '제목 고정'}
              style={{ borderColor: st.lockTitle ? 'var(--accent)' : 'var(--border)' }}>
              {st.lockTitle ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
            </button>
          </div>
          <input
            style={{ ...inputStyle, fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}
            value={st.title}
            onChange={(e) => editTitle(e.target.value)}
            aria-label="블로그 글 제목"
          />
        </div>

        {/* 소제목 세트 */}
        <div style={panel}>
          <div style={slotHead}>
            <span style={slotLabel}>소제목 / 글 구성 ({st.sections.length})</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={rerollSections} title="소제목 세트 다시 뽑기"><Emoji e="🔄" /> 다른 구성</button>
            <button className="minibtn" onClick={addSection} title="소제목 추가">＋ 추가</button>
          </div>
          {st.sections.length === 0 && (
            <div style={{ ...hint, textAlign: 'center', padding: '8px 0' }}>소제목이 없습니다. ＋추가 또는 <Emoji e="🔄" />다른 구성을 눌러보세요.</div>
          )}
          {st.sections.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
              <input style={inputStyle} value={s} onChange={(e) => editSection(i, e.target.value)} aria-label={`소제목 ${i + 1}`} />
              <button className="minibtn" onClick={() => moveSection(i, -1)} disabled={i === 0} title="위로" style={{ flexShrink: 0 }}>▲</button>
              <button className="minibtn" onClick={() => moveSection(i, 1)} disabled={i === st.sections.length - 1} title="아래로" style={{ flexShrink: 0 }}>▼</button>
              <button className="minibtn" onClick={() => removeSection(i)} title="삭제" style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 생성/복사 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={onRegenerate}><Emoji e="🎲" /> 다시 생성</button>
        <button className="minibtn" onClick={copyOutline} title="개요를 평문으로 복사">
          {copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 개요 복사</>}
        </button>
      </div>
      <div style={hint}>가능한 조합 약 <b>{combos.toLocaleString('ko-KR')}</b>가지 (유형별 제목 × 소제목 세트). <Emoji e="🔒" />로 고정한 슬롯은 다시 생성해도 유지됩니다.</div>

      {/* 프로젝트 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '이 개요를 프로젝트 원고 〈블로그〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
