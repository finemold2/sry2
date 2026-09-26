// 뒤표지·소개 카피 작성기(블러브 라이터) — 책 뒤표지/서점 소개문(블러브)을 짜는 실전 도구.
//  틀: [주인공] + [상황(일상)] + [위기(균열)] + [후킹 질문] 의 4박자 구조로 블러브를 자동 조립한다.
//   · 길이: 짧게(한 단락)/표준(두 단락+질문) 선택. 표준은 도입–전환–위기–후킹의 정석 흐름.
//   · 상투구 경고: 입력문에서 닳고 닳은 블러브 클리셰("운명이 그를 기다리고", "모든 것이 바뀐다" 등)를
//     실시간 탐지해 밑줄·대체 제안. 카피의 신선도를 지킨다.
//   · 톤(서정/긴박/미스터리/따뜻함)·후킹 질문 프리셋·연결어 자동 보정으로 어색한 문장 줄임.
//  CRUD: 작성한 블러브를 localStorage('sry:tool:blurb-writer')에 영속(저장/불러오기/삭제), 빈 상태 안내.
//  연계: 완성 블러브를 클립보드 복사 / 프로젝트 자료 〈홍보〉 폴더에 메모로 추가. 좌측 바인더 파일 드롭 시 제목·시놉시스 자동 채움.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키·미디어 불필요(전부 로컬).
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'blurb-writer', name: '뒤표지 카피 작성기', icon: '📕', group: '구상·정리', intro: '주인공·상황·위기·후킹 질문 틀로 책 소개문(블러브)을 짜고 상투구를 점검하세요', w: 600, h: 760 }

const LS = 'sry:tool:blurb-writer'

// ---------- 타입 ----------
interface Fields {
  title: string        // 책 제목(선택, 머리말용)
  hero: string         // 주인공: "고향을 등진 떠돌이 검객 무영"
  situation: string    // 상황(일상/세계): "전쟁이 끝난 변방의 작은 객잔에서 칼을 묻고 살아간다"
  crisis: string       // 위기(균열): "어느 밤, 죽은 줄 알았던 스승의 검이 그의 문 앞에 꽂힌다"
  desire: string       // 욕망/대가(선택): "한 번만 더 칼을 들면 잃어버린 이름을 되찾을 수 있다"
  question: string     // 후킹 질문: "묻어둔 과거는 정말 끝난 것일까?"
}
interface SavedBlurb {
  id: string
  label: string
  fields: Fields
  tone: string
  length: Length
  text: string
  updated: number
}
type Length = 'short' | 'standard'

const emptyFields = (): Fields => ({ title: '', hero: '', situation: '', crisis: '', desire: '', question: '' })

// ---------- 톤 프리셋(연결어·마무리 어조) ----------
interface Tone {
  key: string; label: string; icon: string
  open: string          // 도입 연결("그러나" 같은 전환어 톤)
  turn: string          // 위기 전환어
  close: string         // 마무리 정조(질문 없을 때)
}
const TONES: Tone[] = [
  { key: 'lyric', label: '서정', icon: '🌙', open: '그렇게', turn: '그러나 어느 날,', close: '잊었던 마음이 다시 흔들리기 시작한다.' },
  { key: 'tense', label: '긴박', icon: '⚡', open: '하지만', turn: '그 순간,', close: '시간은 더 이상 그의 편이 아니다.' },
  { key: 'mystery', label: '미스터리', icon: '🕯️', open: '그러던 중', turn: '그리고 어느 날 밤,', close: '진실은 생각보다 가까이, 그리고 훨씬 깊은 곳에 있다.' },
  { key: 'warm', label: '따뜻함', icon: '☕', open: '그러던 어느 날', turn: '그러나', close: '작은 만남 하나가 모든 것을 바꾸기 시작한다.' },
]

// ---------- 후킹 질문 프리셋 ----------
const QUESTION_PRESETS = [
  '묻어둔 과거는 정말 끝난 것일까?',
  '그는 다시 한번 모든 것을 걸 수 있을까?',
  '지켜야 할 것과 갖고 싶은 것, 끝내 무엇을 택할까?',
  '진실을 마주한 뒤에도, 같은 자리에 머물 수 있을까?',
  '단 하나의 선택이 모든 것을 무너뜨린다면?',
  '돌아갈 수 없다면, 끝까지 갈 수 있을까?',
  '믿었던 사람이 가장 큰 위협이라면?',
  '잃어버린 이름을, 그는 되찾을 수 있을까?',
]

// ---------- 상투구(클리셰) 사전 ----------
// 닳고 닳은 블러브 표현 → 왜 진부한지/대안 힌트. (정규식 후보, 소문자 비교 없이 한국어 부분일치)
interface Cliche { re: RegExp; phrase: string; why: string; fix: string }
const CLICHES: Cliche[] = [
  { re: /운명(이|은|의)?\s*(그|그녀|이들)?\s*(를|을)?\s*기다리/, phrase: '운명이 기다린다', why: '가장 흔한 블러브 상투구. 구체성이 없어 어떤 책에도 붙일 수 있습니다.', fix: '운명 대신 구체적 사건·대상으로(누가/무엇이 그를 기다리는가)' },
  { re: /모든\s*것(이|을)?\s*(바뀐|달라진|변하)/, phrase: '모든 것이 바뀐다', why: '추상적 과장. 무엇이 어떻게 바뀌는지가 빠져 긴장이 죽습니다.', fix: '“무엇”이 바뀌는지 한 가지만 콕 집어서' },
  { re: /평범한?\s*(일상|삶|나날|하루)/, phrase: '평범한 일상', why: '도입 클리셰. ‘평범’은 보여주기보다 말하기에 가깝습니다.', fix: '평범함을 한 장면(직업·습관·장소)으로 구체화' },
  { re: /숨겨진\s*비밀/, phrase: '숨겨진 비밀', why: '“숨겨진”과 “비밀”은 의미가 겹칩니다(군더더기).', fix: '그냥 ‘비밀’ 또는 비밀의 정체를 살짝' },
  { re: /손에\s*땀을\s*쥐(게|는)/, phrase: '손에 땀을 쥐게 하는', why: '독자 반응을 직접 지시하는 표현은 역효과(보여주지 말고 만들기).', fix: '반응을 유발할 상황 자체를 제시' },
  { re: /가슴\s*(뭉클|먹먹|벅차)/, phrase: '가슴 뭉클한', why: '감정을 미리 규정하면 독자가 느낄 여지가 줄어듭니다.', fix: '뭉클함을 부르는 구체적 관계·장면으로' },
  { re: /충격적인?\s*반전/, phrase: '충격적인 반전', why: '반전을 예고하면 반전이 죽습니다.', fix: '반전은 숨기고, 그 전조만 암시' },
  { re: /과연/, phrase: '과연 …일까', why: '진부한 후킹 연결어. 남발하면 광고 카피처럼 들립니다.', fix: '질문을 담백하게 — ‘과연’ 없이도 질문은 질문' },
  { re: /놓칠\s*수\s*없는/, phrase: '놓칠 수 없는', why: '판매 문구 톤. 작품 자체가 아니라 마케팅을 말합니다.', fix: '작품 안의 긴장으로 대체' },
  { re: /최고의?\s*(걸작|작품|소설)/, phrase: '최고의 걸작', why: '자화자찬형 과장은 신뢰를 떨어뜨립니다.', fix: '평가는 독자·서평에 맡기고 내용으로 승부' },
  { re: /눈물\s*없(이|인)\s*(는|볼)/, phrase: '눈물 없이 볼 수 없는', why: '감정 강요 클리셰.', fix: '눈물을 부르는 ‘사정’만 담담히' },
  { re: /시간이?\s*(얼마\s*)?없다/, phrase: '시간이 없다', why: '긴박함의 가장 흔한 표현. 무엇까지 시간이 없는지가 핵심.', fix: '제한시간의 구체적 마감(무엇이 언제까지)으로' },
]

// ---------- 유틸 ----------
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const uid = () => 'b_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
// 문장 끝 마침표 보정(이미 종결부호 있으면 유지).
const endDot = (s: string) => {
  const t = s.trim()
  if (!t) return ''
  return /[.!?…”"]$/.test(t) ? t : t + '.'
}
const stripDot = (s: string) => s.trim().replace(/[.。]\s*$/, '')

// 입력 전체에서 상투구 탐지(중복 제거).
function detectCliches(f: Fields): Cliche[] {
  const blob = [f.hero, f.situation, f.crisis, f.desire, f.question].join('  ')
  const found: Cliche[] = []
  for (const c of CLICHES) {
    if (c.re.test(blob) && !found.some((x) => x.phrase === c.phrase)) found.push(c)
  }
  return found
}

// 4박자 틀 → 블러브 본문 조립.
function compose(f: Fields, tone: Tone, len: Length): string {
  const hero = stripDot(f.hero)
  const situ = stripDot(f.situation)
  const crisis = stripDot(f.crisis)
  const desire = stripDot(f.desire)
  const q = f.question.trim()

  if (!hero && !situ && !crisis) return ''

  // 1) 도입: 주인공 + 상황
  let intro = ''
  if (hero && situ) intro = `${hero}. ${tone.open} ${situ}`
  else if (hero) intro = hero
  else intro = situ
  intro = endDot(intro)

  // 2) 위기: 전환어 + 균열 사건
  const crisisLine = crisis ? endDot(`${tone.turn} ${crisis}`) : ''

  // 3) 욕망/대가(선택)
  const desireLine = desire ? endDot(desire) : ''

  // 4) 후킹: 질문 우선, 없으면 톤 마무리
  const hook = q ? endDot(q) : tone.close

  if (len === 'short') {
    // 짧게: 한 단락 — 상황·위기·후킹을 응축
    const parts = [intro, crisisLine, hook].filter(Boolean)
    return parts.join(' ')
  }
  // 표준: 도입 단락 / 위기·대가·후킹 단락(빈 줄로 구분)
  const p1 = intro
  const p2 = [crisisLine, desireLine, hook].filter(Boolean).join(' ')
  return [p1, p2].filter(Boolean).join('\n\n')
}

// 본문에서 클리셰 구절에 밑줄을 넣은 HTML(미리보기용). 한 번에 한 패턴씩 치환.
function highlightHtml(text: string, found: Cliche[]): string {
  let html = esc(text).replace(/\n/g, '<br/>')
  for (const c of found) {
    // esc 후이므로 원문 정규식은 평문에 적용 — 대략적 시각 표시용(첫 일치만).
    const m = c.re.exec(text)
    if (!m) continue
    const seg = esc(m[0])
    if (!seg) continue
    html = html.replace(seg, `<u style="text-decoration-color:#e06c5a;text-decoration-thickness:2px;text-underline-offset:3px;">${seg}</u>`)
  }
  return html
}

const fmtDate = (t: number) => {
  try { return new Date(t).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

// 글자 수(공백 포함/제외) 카운트.
const countChars = (s: string) => {
  const all = s.replace(/\n/g, '').length
  const noSpace = s.replace(/\s/g, '').length
  return { all, noSpace }
}

export default function BlurbWriter({ payload }: { payload?: Record<string, unknown> }) {
  const [fields, setFields] = useState<Fields>(() => {
    try {
      const raw = localStorage.getItem(LS + ':fields')
      if (raw) {
        const p = JSON.parse(raw) as Partial<Fields>
        return { ...emptyFields(), ...p }
      }
    } catch { /* ignore */ }
    return emptyFields()
  })
  const [tone, setTone] = useState<string>(() => {
    try { return localStorage.getItem(LS + ':tone') || 'tense' } catch { return 'tense' }
  })
  const [length, setLength] = useState<Length>(() => {
    try { return (localStorage.getItem(LS + ':length') as Length) || 'standard' } catch { return 'standard' }
  })
  const [saved, setSaved] = useState<SavedBlurb[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return arr.filter((x) => x && typeof x.text === 'string')
      }
    } catch { /* ignore */ }
    return []
  })
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const toastTimer = useRef<number | null>(null)

  // 영속화.
  useEffect(() => { try { localStorage.setItem(LS + ':fields', JSON.stringify(fields)) } catch { /* ignore */ } }, [fields])
  useEffect(() => { try { localStorage.setItem(LS + ':tone', tone) } catch { /* ignore */ } }, [tone])
  useEffect(() => { try { localStorage.setItem(LS + ':length', length) } catch { /* ignore */ } }, [length])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 토스트 타이머 언마운트 정리.
  useEffect(() => () => { if (toastTimer.current !== null) window.clearTimeout(toastTimer.current) }, [])
  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }, [])

  // payload 로 시작 데이터(제목/시놉시스/주인공) 수용 — 빈 칸만 채움(덮어쓰기 안 함).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload) return
    const title = typeof payload.title === 'string' ? payload.title : ''
    const synopsis = typeof payload.synopsis === 'string' ? payload.synopsis
      : typeof payload.text === 'string' ? payload.text : ''
    const hero = typeof payload.hero === 'string' ? payload.hero
      : typeof payload.character === 'string' ? payload.character : ''
    setFields((prev) => ({
      ...prev,
      title: prev.title || title,
      hero: prev.hero || hero,
      situation: prev.situation || (synopsis ? synopsis.slice(0, 120) : ''),
    }))
    if (title || synopsis || hero) flash('전달된 정보를 일부 칸에 채웠습니다.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (k: keyof Fields, v: string) => setFields((prev) => ({ ...prev, [k]: v }))

  const curTone = TONES.find((t) => t.key === tone) || TONES[1]
  const blurb = compose(fields, curTone, length)
  const found = detectCliches(fields)
  const hasContent = !!(fields.hero || fields.situation || fields.crisis)
  const ready = !!blurb
  const { all: cAll, noSpace: cNoSpace } = countChars(blurb)

  // ---------- 액션 ----------
  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(blurb).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  const useQuestion = (q: string) => setField('question', q)

  const clearAll = () => {
    if (!hasContent) return
    setFields(emptyFields())
    flash('입력을 비웠습니다.')
  }

  const save = () => {
    if (!ready) return
    const label = (fields.title.trim() || stripDot(fields.hero).slice(0, 20) || '블러브') + ` (${length === 'short' ? '짧게' : '표준'})`
    const rec: SavedBlurb = { id: uid(), label, fields: { ...fields }, tone, length, text: blurb, updated: Date.now() }
    setSaved((prev) => [rec, ...prev].slice(0, 50))
    flash('블러브를 저장했습니다.')
  }

  const load = (b: SavedBlurb) => {
    setFields({ ...emptyFields(), ...b.fields })
    setTone(b.tone)
    setLength(b.length)
    flash(`‘${b.label}’ 불러옴.`)
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((x) => x.id !== id))

  const copyOne = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => flash('복사했습니다.')).catch(() => { /* graceful */ })
  }

  // 프로젝트 자료 〈홍보〉 폴더에 블러브 추가.
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const paras = blurb.split('\n\n').map((p) => `<p style="font-size:14px;line-height:1.8;margin:0 0 10px;">${esc(p)}</p>`).join('')
    const fieldRows = ([
      ['🧑 주인공', fields.hero],
      ['🏞️ 상황', fields.situation],
      ['⚡ 위기', fields.crisis],
      ['🎯 욕망·대가', fields.desire],
      ['❓ 후킹 질문', fields.question],
    ] as [string, string][])
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `<p style="margin:0 0 4px;"><b>${esc(k)}:</b> ${esc(v.trim())}</p>`)
      .join('')
    const clicheRows = found.length
      ? `<hr/><p style="color:#b4543f;margin:0 0 4px;"><b>⚠️ 상투구 점검(${found.length})</b></p>` +
        found.map((c) => `<p style="margin:0 0 3px;font-size:13px;">• <b>${esc(c.phrase)}</b> — ${esc(c.fix)}</p>`).join('')
      : `<hr/><p style="color:#3f8f5a;margin:0;">✓ 흔한 상투구는 발견되지 않았습니다.</p>`
    const bodyHtml = [
      fields.title.trim() ? `<p style="font-size:16px;font-weight:700;margin:0 0 10px;">📕 ${esc(fields.title.trim())}</p>` : '',
      paras,
      `<hr/>`,
      `<p style="font-size:12px;color:#888;margin:0 0 6px;">톤: ${esc(curTone.label)} · 길이: ${length === 'short' ? '짧게' : '표준'} · ${cAll}자(공백포함)</p>`,
      fieldRows,
      clicheRows,
    ].filter(Boolean).join('')
    const titleRaw = fields.title.trim() || stripDot(fields.hero).slice(0, 24) || '블러브'
    const id = addToProject({ kind: 'text', root: 'research', folder: '홍보', title: `📕 ${titleRaw} — 뒤표지 카피`, bodyHtml, synopsis: blurb.replace(/\n+/g, ' ').slice(0, 140) })
    flash(id ? '프로젝트 자료 〈홍보〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 좌측 바인더 파일 드롭 → 제목/시놉시스/주인공 채움.
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const ch = item.character || {}
    setFields((prev) => ({
      ...prev,
      title: prev.title || item.title || '',
      hero: prev.hero || (ch.name ? `${ch.name}${ch.role ? `(${ch.role})` : ''}` : ''),
      situation: prev.situation || (item.text ? item.text.replace(/\s+/g, ' ').trim().slice(0, 120) : ''),
    }))
    flash(`‘${item.title}’의 정보를 칸에 채웠습니다.`)
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto', position: 'relative' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 3, display: 'block' }
  const inputBase: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const FIELD_DEFS: { k: keyof Fields; label: string; icon: string; ph: string; area?: boolean; opt?: boolean }[] = [
    { k: 'title', label: '책 제목', icon: '📖', ph: '예: 검을 묻은 자리 (선택)', opt: true },
    { k: 'hero', label: '주인공', icon: '🧑', ph: '예: 고향을 등진 떠돌이 검객 무영' },
    { k: 'situation', label: '상황(지금의 일상·세계)', icon: '🏞️', ph: '예: 전쟁이 끝난 변방의 작은 객잔에서 칼을 묻고 살아간다', area: true },
    { k: 'crisis', label: '위기(일상을 깨는 사건)', icon: '⚡', ph: '예: 어느 밤, 죽은 줄 알았던 스승의 검이 그의 문 앞에 꽂힌다', area: true },
    { k: 'desire', label: '욕망·대가 (선택)', icon: '🎯', ph: '예: 한 번만 더 칼을 들면, 잃어버린 이름을 되찾을 수 있다', area: true, opt: true },
    { k: 'question', label: '후킹 질문(독자에게 던지는 한 줄)', icon: '❓', ph: '예: 묻어둔 과거는 정말 끝난 것일까?' },
  ]

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={hint}>
        <b>주인공 · 상황 · 위기 · 후킹 질문</b>의 네 박자 틀을 채우면 책 뒤표지/소개문(블러브)을 자동으로 엮습니다. 좌측 바인더의 인물·장면 파일을 끌어다 놓으면 칸이 자동으로 채워져요.
      </div>

      {/* 톤 + 길이 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>톤</span>
        {TONES.map((t) => (
          <button
            key={t.key}
            className="minibtn"
            onClick={() => setTone(t.key)}
            aria-pressed={tone === t.key}
            style={{ borderColor: tone === t.key ? 'var(--accent)' : 'var(--border)', color: tone === t.key ? 'var(--accent)' : 'var(--text)' }}
          >
            <Emoji e={t.icon} /> {t.label}
          </button>
        ))}
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>길이</span>
        <button className="minibtn" onClick={() => setLength('short')} aria-pressed={length === 'short'} style={{ borderColor: length === 'short' ? 'var(--accent)' : 'var(--border)', color: length === 'short' ? 'var(--accent)' : 'var(--text)' }}>한 단락</button>
        <button className="minibtn" onClick={() => setLength('standard')} aria-pressed={length === 'standard'} style={{ borderColor: length === 'standard' ? 'var(--accent)' : 'var(--border)', color: length === 'standard' ? 'var(--accent)' : 'var(--text)' }}>표준</button>
      </div>

      {/* 입력 칸 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FIELD_DEFS.map((fd) => (
          <div key={fd.k}>
            <label style={label}><Emoji e={fd.icon} /> {fd.label}</label>
            {fd.area ? (
              <textarea
                value={fields[fd.k]}
                onChange={(e) => setField(fd.k, e.target.value)}
                placeholder={fd.ph}
                rows={2}
                style={{ ...inputBase, resize: 'vertical', minHeight: 44 }}
              />
            ) : (
              <input
                value={fields[fd.k]}
                onChange={(e) => setField(fd.k, e.target.value)}
                placeholder={fd.ph}
                style={inputBase}
              />
            )}
          </div>
        ))}
      </div>

      {/* 후킹 질문 프리셋 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>후킹 질문 예시</span>
        {QUESTION_PRESETS.map((q, i) => (
          <button key={i} className="minibtn" style={{ fontSize: 11.5, padding: '3px 8px' }} title={q} onClick={() => useQuestion(q)}>
            {q.length > 16 ? q.slice(0, 16) + '…' : q}
          </button>
        ))}
      </div>

      {/* 미리보기 */}
      <div style={{ ...card, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}><Emoji e="📕" /> 뒤표지 미리보기</span>
          {ready && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cAll}자 · 공백 제외 {cNoSpace}자</span>}
        </div>
        {ready ? (
          <div
            style={{ fontSize: 14.5, lineHeight: 1.85, wordBreak: 'keep-all', whiteSpace: 'normal', color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: highlightHtml(blurb, found) }}
          />
        ) : (
          <div style={hint}>주인공·상황·위기 중 하나 이상을 채우면 여기에 블러브가 조립됩니다. (빈 상태)</div>
        )}
      </div>

      {/* 상투구 경고 */}
      {hasContent && (
        <div style={{ ...card, borderColor: found.length ? '#c8775f' : 'var(--border)' }}>
          {found.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text)' }}>✓ 흔한 블러브 상투구는 발견되지 않았습니다. 신선합니다.</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#c8775f', marginBottom: 6 }}><Emoji e="⚠️" /> 상투구 {found.length}개 발견 — 밑줄 친 표현을 다듬어 보세요</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {found.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <div><b style={{ color: '#c8775f' }}>“{c.phrase}”</b> — {c.why}</div>
                    <div style={{ color: 'var(--muted)' }}>↳ 제안: {c.fix}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={save} disabled={!ready}><Emoji e="💾" /> 저장</button>
        <button className="minibtn" onClick={clearAll} disabled={!hasContent}><Emoji e="🧹" /> 비우기</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '완성된 블러브를 프로젝트 자료 〈홍보〉 폴더에 메모로 추가'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저장한 블러브(CRUD) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="💾" /> 저장한 블러브 ({saved.length})</div>
        {saved.length === 0 ? (
          <div style={hint}>완성한 블러브를 ‘저장’으로 모아두면 버전별로 비교·재사용할 수 있어요. (아직 비어 있음)</div>
        ) : (
          saved.map((b) => (
            <div key={b.id} style={{ ...card, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.text.replace(/\n+/g, ' ')}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{fmtDate(b.updated)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button className="minibtn" title="불러오기" onClick={() => load(b)}><Emoji e="📂" /></button>
                <button className="minibtn" title="복사" onClick={() => copyOne(b.text)}><Emoji e="📋" /></button>
                <button className="minibtn" title="삭제" onClick={() => removeSaved(b.id)}><Emoji e="🗑️" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 'auto', lineHeight: 1.5 }}>
        <span className="license-badge">자체 창작</span> 블러브 틀·톤·상투구 사전은 본 도구의 오리지널 작성물로 외부 저작물을 사용하지 않습니다. 모든 처리는 브라우저 안에서만 이뤄집니다.
      </div>

      {/* 드롭 오버레이 */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600, pointerEvents: 'none', zIndex: 5 }}>
          여기에 놓으면 제목·주인공·상황을 채웁니다
        </div>
      )}
    </div>
  )
}
