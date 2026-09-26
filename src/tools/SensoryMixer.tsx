// 오감 믹서 — 장면 텍스트의 감각 분포(시각/청각/촉각/후각/미각)를 사전 매칭으로 분석한다.
//  - 감각별 출현 키워드 집계 → 비율 막대 + 균형 점수 + 편중/부재 경고.
//  - 부족한 감각을 채울 결정론적 보강 문장(시드=장면 텍스트 해시)을 제안한다.
//  - 좌측 바인더 문서 드롭/페이로드 텍스트/스니펫 라이브러리 수용. 산출물은 스니펫/수집함/프로젝트로 내보내기.
// import 는 react 와 ./linkbus 만. 외부 네트워크 없음(전부 로컬 사전 매칭·계산).
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  useLibraryList, addToLibrary, getDragItem, isItemDrag,
  addToProject, hasProjectBridge, addToStash, hasStash, openToolLinked,
  type SharedSnippet,
} from './linkbus'

export const meta = {
  id: 'sensory-mixer', name: '오감 믹서', icon: '👃', group: '분위기·시각',
  intro: '장면의 감각 분포를 분석해 편중을 경고하고 부족한 감각을 채울 보강 문장을 제안합니다',
  w: 480, h: 640,
}

// ── 감각 다섯 채널 정의 ───────────────────────────────────────────────
type SenseKey = 'sight' | 'sound' | 'touch' | 'smell' | 'taste'
interface SenseDef {
  key: SenseKey
  label: string
  tag: string            // 화면 표기용 짧은 라벨(글리프 없음)
  color: string
  words: string[]        // 한국어 감각 키워드(어간 위주 — includes 매칭)
}

const SENSES: SenseDef[] = [
  {
    key: 'sight', label: '시각', tag: '눈', color: '#4f8cff',
    words: [
      '보', '바라보', '쳐다보', '내려다보', '올려다보', '둘러보', '들여다보', '눈', '시선', '빛', '햇빛', '햇살', '달빛', '별빛', '불빛',
      '그림자', '어둠', '어두', '밝', '환하', '눈부', '반짝', '번쩍', '빛나', '빛깔', '색', '빨강', '파랑', '노랑', '초록', '하양', '하얀',
      '검은', '검정', '붉은', '푸른', '누런', '잿빛', '회색', '금빛', '은빛', '투명', '뿌옇', '흐릿', '선명', '또렷', '아른', '일렁', '깜빡',
      '윤곽', '형태', '모양', '풍경', '경치', '광경', '장면', '얼굴', '표정', '미소', '눈빛', '반사', '비치', '비춰', '흐르는 빛', '명암',
    ],
  },
  {
    key: 'sound', label: '청각', tag: '귀', color: '#34c759',
    words: [
      '듣', '들리', '들려', '소리', '음악', '노래', '목소리', '말소리', '웃음소리', '울음', '비명', '고함', '속삭', '중얼', '웅성', '소곤',
      '메아리', '울려', '울리', '메아', '쿵', '쾅', '탁', '딱', '톡', '똑', '삐걱', '바스락', '사각', '와르르', '철썩', '찰싹', '졸졸',
      '콸콸', '쏴', '윙', '웅웅', '째깍', '딸깍', '드르륵', '뚝', '뚜벅', '저벅', '쟁쟁', '쩌렁', '고요', '적막', '정적', '침묵', '잡음',
      '소음', '굉음', '천둥', '빗소리', '바람소리', '발소리', '숨소리', '심장소리', '벨소리', '경적', '사이렌', '리듬', '선율', '음색', '울림',
    ],
  },
  {
    key: 'touch', label: '촉각', tag: '살', color: '#ff9f0a',
    words: [
      '만지', '만져', '쓰다듬', '쓰담', '더듬', '닿', '닿았', '스치', '스쳐', '문지르', '비비', '쥐', '움켜', '잡', '붙잡', '끌어안',
      '안', '껴안', '포옹', '감싸', '두드리', '때리', '찌르', '꼬집', '간지', '따뜻', '뜨거', '차가', '서늘', '미지근', '뜨끈', '따끈',
      '시리', '얼얼', '저릿', '아프', '쓰리', '욱신', '뻐근', '뻣뻣', '부드러', '매끈', '거칠', '까칠', '보들', '폭신', '말랑', '딱딱',
      '단단', '축축', '눅눅', '끈적', '미끈', '메마른', '습기', '땀', '소름', '오싹', '떨리', '진동', '무게', '묵직', '가벼', '피부', '살갗',
    ],
  },
  {
    key: 'smell', label: '후각', tag: '코', color: '#bf5af2',
    words: [
      '냄새', '향', '향기', '향긋', '내음', '풍기', '풍겨', '맡', '맡았', '코끝', '구수', '고소', '비린', '비릿', '쿰쿰', '퀴퀴',
      '쾨쾨', '매캐', '매큼', '향수', '꽃향', '풀냄새', '흙냄새', '비냄새', '땀냄새', '담배냄새', '탄내', '단내', '쉰내', '악취', '냄새가',
      '코를', '코로', '코에', '훅', '코끝을', '은은한 향', '진동하는 냄새',
    ],
  },
  {
    key: 'taste', label: '미각', tag: '혀', color: '#ff375f',
    words: [
      '맛', '맛보', '맛있', '맛없', '입에', '입안', '혀', '혀끝', '삼키', '삼켰', '씹', '깨물', '베어물', '한입', '먹', '마시', '들이켜',
      '핥', '달', '달콤', '쓴', '씁쓸', '시', '시큼', '새콤', '짠', '짭짤', '매운', '매콤', '얼큰', '담백', '느끼', '비린맛', '쌉싸름',
      '떫', '아릿', '톡 쏘', '입맛', '군침', '갈증', '목이 타', '미각', '풍미', '뒷맛',
    ],
  },
]

const SENSE_BY_KEY: Record<SenseKey, SenseDef> = Object.fromEntries(SENSES.map((s) => [s.key, s])) as Record<SenseKey, SenseDef>

// ── 보강 문장 템플릿(감각별, 글리프 없는 텍스트) ──────────────────────────
// {S}=주어/대상(드롭 캐릭터·장소 또는 '그'), {P}=장소. 시드로 결정론적 선택.
const SUGGEST: Record<SenseKey, string[]> = {
  sight: [
    '{P}의 빛이 {S}의 얼굴 위로 천천히 미끄러졌다.',
    '창 너머로 흘러든 햇살이 먼지 알갱이들을 또렷이 드러냈다.',
    '{S}는 어둠 속에서 흐릿하게 일렁이는 윤곽을 바라보았다.',
    '색이 바랜 풍경이 {S}의 눈앞에서 서서히 또렷해졌다.',
    '반짝이는 무언가가 시야 끝에서 잠깐 번쩍였다가 사라졌다.',
  ],
  sound: [
    '멀리서 무언가 무너지는 듯한 소리가 {P}을 가로질러 울렸다.',
    '{S}의 귀에 자신의 심장 소리만이 또렷하게 들려왔다.',
    '바스락거리는 발소리가 정적을 깨고 점점 가까워졌다.',
    '낮게 속삭이는 바람 소리가 {S}의 귓가를 스치고 지나갔다.',
    '어디선가 째깍거리는 시계 소리가 적막을 더 깊게 만들었다.',
  ],
  touch: [
    '차가운 공기가 {S}의 살갗에 닿아 소름이 돋았다.',
    '{S}는 거칠고 단단한 표면을 손끝으로 천천히 더듬었다.',
    '뜨거운 열기가 뺨을 스치며 이마에 땀이 배어 나왔다.',
    '축축한 습기가 옷자락에 달라붙어 묵직하게 가라앉았다.',
    '{S}의 손가락 끝이 미세하게 떨리며 저릿하게 굳어 갔다.',
  ],
  smell: [
    '{P}에 밴 눅눅하고 쿰쿰한 냄새가 코끝을 훅 찔렀다.',
    '어디선가 단내 섞인 향기가 은은하게 풍겨 왔다.',
    '비 온 뒤의 흙냄새가 {S}의 폐 깊숙이 스며들었다.',
    '매캐한 탄내가 공기 중에 무겁게 깔려 진동했다.',
    '{S}는 익숙한 향기를 맡고 잠시 숨을 멈췄다.',
  ],
  taste: [
    '{S}의 입안에 쇠붙이 같은 비릿한 맛이 번졌다.',
    '바짝 마른 입술 위로 짭짤한 땀이 흘러내려 혀끝에 닿았다.',
    '쓰디쓴 뒷맛이 목구멍을 타고 천천히 가라앉았다.',
    '{S}는 마른침을 삼키며 갈증으로 타들어 가는 목을 느꼈다.',
    '달콤하면서도 어딘가 떫은 풍미가 입안에 오래 남았다.',
  ],
}

// 문자열 해시(결정론적 시드)
function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

interface Hit { word: string; count: number }
interface SenseStat {
  key: SenseKey
  count: number
  pct: number
  hits: Hit[]
}
interface Analysis {
  total: number
  chars: number
  stats: SenseStat[]
  balance: number         // 0~100, 다섯 감각 균형도(엔트로피 기반)
  dominant: SenseKey | null
  missing: SenseKey[]     // 출현 0
  weak: SenseKey[]        // 비율 < 임계
}

// 감각 분석: 각 사전 단어의 출현 횟수 집계(어간 includes). 긴 단어 우선으로 중복 방지는 단순화(독립 집계).
function analyze(text: string): Analysis | null {
  const t = text.trim()
  if (!t) return null
  const lower = t // 한국어는 대소문자 무관
  const stats: SenseStat[] = SENSES.map((def) => {
    const hits: Hit[] = []
    let count = 0
    for (const w of def.words) {
      let from = 0
      let c = 0
      // 모든 비중첩 출현 카운트
      while (true) {
        const idx = lower.indexOf(w, from)
        if (idx < 0) break
        c++
        from = idx + w.length
      }
      if (c > 0) { hits.push({ word: w, count: c }); count += c }
    }
    hits.sort((a, b) => b.count - a.count)
    return { key: def.key, count, pct: 0, hits }
  })

  const total = stats.reduce((a, s) => a + s.count, 0)
  for (const s of stats) s.pct = total > 0 ? (s.count / total) * 100 : 0

  // 균형도: 정규화 엔트로피(다섯 채널이 고를수록 100에 가까움). 출현 채널만 고려.
  let balance = 0
  if (total > 0) {
    let H = 0
    for (const s of stats) {
      const p = s.count / total
      if (p > 0) H += -p * Math.log(p)
    }
    const Hmax = Math.log(SENSES.length) // 5채널 균등 분포의 엔트로피
    balance = Math.round((H / Hmax) * 100)
  }

  const sorted = [...stats].sort((a, b) => b.count - a.count)
  const dominant = total > 0 ? sorted[0].key : null
  const missing = stats.filter((s) => s.count === 0).map((s) => s.key)
  // 약함: 출현하긴 하나 전체의 8% 미만(시각·청각 편중 장면에서 흔함)
  const weak = stats.filter((s) => s.count > 0 && s.pct < 8).map((s) => s.key)

  return { total, chars: t.replace(/\s+/g, '').length, stats, balance, dominant, missing, weak }
}

const LS_KEY = (id: string) => `sry:tool:${id}`
const TEXT_MAX = 200000

export default function SensoryMixer({ payload }: { payload?: Record<string, unknown> }) {
  const snippets = useLibraryList('snippets')
  const characters = useLibraryList('characters')
  const places = useLibraryList('places')

  const [text, setText] = useState('')
  const [subject, setSubject] = useState('')   // 보강 문장 주어
  const [place, setPlace] = useState('')       // 보강 문장 장소
  const [dragOver, setDragOver] = useState(false)
  const [savedFlash, setSavedFlash] = useState('')
  const [seedBump, setSeedBump] = useState(0)  // 제안 다시 뽑기
  const flashTimer = useRef<number | null>(null)
  const restored = useRef(false)

  // 복원(localStorage) — 마운트 1회
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(LS_KEY(meta.id))
      if (raw) {
        const p = JSON.parse(raw) as { text?: string; subject?: string; place?: string }
        if (typeof p.text === 'string') setText(p.text.slice(0, TEXT_MAX))
        if (typeof p.subject === 'string') setSubject(p.subject)
        if (typeof p.place === 'string') setPlace(p.place)
      }
    } catch { /* noop */ }
  }, [])

  // payload 텍스트 수용(연계 열기/드롭 브리지)
  useEffect(() => {
    if (!payload) return
    const pText = typeof payload.text === 'string' ? payload.text : ''
    if (pText) setText((prev) => (prev.trim() ? prev : pText))
    if (typeof payload.subject === 'string' && payload.subject) setSubject((s) => s || (payload.subject as string))
    if (typeof payload.place === 'string' && payload.place) setPlace((s) => s || (payload.place as string))
  }, [payload])

  // 저장(디바운스)
  useEffect(() => {
    const h = window.setTimeout(() => {
      try { localStorage.setItem(LS_KEY(meta.id), JSON.stringify({ text: text.slice(0, TEXT_MAX), subject, place })) } catch { /* noop */ }
    }, 400)
    return () => clearTimeout(h)
  }, [text, subject, place])

  // 타이머 정리
  useEffect(() => () => { if (flashTimer.current != null) clearTimeout(flashTimer.current) }, [])

  const flash = useCallback((msg: string) => {
    setSavedFlash(msg)
    if (flashTimer.current != null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSavedFlash(''), 1600)
  }, [])

  const a = useMemo(() => analyze(text), [text])

  // 보강 제안: 부족(missing 우선, 그다음 weak) 감각 각각에 대해 시드로 한 문장 선택
  const suggestions = useMemo(() => {
    if (!a) return [] as { key: SenseKey; sentence: string }[]
    const targets: SenseKey[] = [...a.missing, ...a.weak]
    if (targets.length === 0) return []
    const subj = subject.trim() || '그'
    const plc = place.trim() || '그 공간'
    const baseSeed = hash(text + '|' + seedBump)
    return targets.map((k, i) => {
      const pool = SUGGEST[k]
      const idx = (baseSeed + i * 2654435761) % pool.length
      const sentence = pool[idx].replace(/\{S\}/g, subj).replace(/\{P\}/g, plc)
      return { key: k, sentence }
    })
  }, [a, subject, place, text, seedBump])

  // ── 데이터 수용 ──────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && item.text) {
      setText(item.text)
      if (!subject.trim() && item.character?.name) setSubject(item.character.name)
      flash(`'${item.title}' 본문을 불러왔습니다`)
      return
    }
    // 일반 텍스트 드롭도 수용
    try {
      const plain = e.dataTransfer.getData('text/plain')
      if (plain) { setText(plain); flash('텍스트를 불러왔습니다') }
    } catch { /* noop */ }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) {
      e.preventDefault()
      setDragOver(true)
    }
  }

  const loadSnippet = (s: SharedSnippet) => { setText(s.text); flash('스니펫을 불러왔습니다') }
  const useCharacter = (name: string) => { setSubject(name); flash(`주어로 '${name}' 지정`) }
  const usePlace = (name: string) => { setPlace(name); flash(`장소로 '${name}' 지정`) }

  // ── 산출물 내보내기 ───────────────────────────────────────
  const reportText = useMemo(() => {
    if (!a) return ''
    const lines: string[] = []
    lines.push('[오감 분포 분석]')
    lines.push(`감각 표현 ${a.total}회 · 균형 점수 ${a.balance}/100`)
    for (const s of a.stats) {
      lines.push(`- ${SENSE_BY_KEY[s.key].label}: ${s.count}회 (${s.pct.toFixed(0)}%)`)
    }
    if (a.dominant) lines.push(`주된 감각: ${SENSE_BY_KEY[a.dominant].label}`)
    if (a.missing.length) lines.push(`빠진 감각: ${a.missing.map((k) => SENSE_BY_KEY[k].label).join(', ')}`)
    if (suggestions.length) {
      lines.push('')
      lines.push('[보강 문장 제안]')
      for (const sg of suggestions) lines.push(`- (${SENSE_BY_KEY[sg.key].label}) ${sg.sentence}`)
    }
    return lines.join('\n')
  }, [a, suggestions])

  const saveSnippet = () => {
    if (!reportText) return
    addToLibrary('snippets', { text: reportText, source: meta.name, tags: ['오감', '감각분석'] })
    flash('스니펫 라이브러리에 저장했습니다')
  }
  const stash = () => {
    if (!hasStash() || !reportText) return
    addToStash({ kind: 'memo', label: '오감 분포 분석', text: reportText })
    flash('수집함에 담았습니다')
  }
  const toProject = () => {
    if (!hasProjectBridge() || !a) return
    const html = reportText.split('\n').map((l) => `<p>${l.replace(/</g, '&lt;')}</p>`).join('')
    addToProject({
      kind: 'text', root: 'research', folder: '감각 분석',
      title: `오감 분포 (균형 ${a.balance})`,
      bodyHtml: html,
      synopsis: a.dominant ? `${SENSE_BY_KEY[a.dominant].label} 편중` : '감각 분석',
      meta: { 균형점수: String(a.balance), 표현수: String(a.total) },
    })
    flash('프로젝트에 추가했습니다')
  }
  const sendToPalette = () => {
    // 부족 감각을 감각 팔레트 도구에 전달해 묘사 어휘를 확장
    const focus = a && (a.missing[0] || a.weak[0])
    openToolLinked('sensory-palette', {
      text, subject: subject.trim(), place: place.trim(),
      focusSense: focus ? SENSE_BY_KEY[focus].label : '',
    })
  }
  const insertSuggestion = (sentence: string) => {
    setText((prev) => (prev.trim() ? prev.replace(/\s*$/, '') + '\n' + sentence : sentence))
    flash('본문 끝에 보강 문장을 추가했습니다')
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 92, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)',
    border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }
  const chip: React.CSSProperties = { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }
  const smallInput: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 9px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}>장면을 붙여넣거나 좌측 문서를 끌어다 놓으세요</div>
        <button className="minibtn" onClick={() => setText('')} disabled={!text}>지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        placeholder="장면 묘사를 여기에 붙여넣으세요. 시각·청각·촉각·후각·미각 표현을 찾아 분포를 분석합니다."
        spellCheck={false}
        aria-label="오감 믹서 입력"
      />

      {/* 라이브러리 수용: 스니펫 빠른 불러오기 */}
      {snippets.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {snippets.slice(0, 8).map((s) => (
            <button key={s.id} style={chip} title={s.text} onClick={() => loadSnippet(s)}>
              {(s.text || '').slice(0, 14) || '스니펫'}
            </button>
          ))}
        </div>
      )}

      {/* 보강 문장 주어/장소(라이브러리 캐릭터·장소로 채우기) */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input style={smallInput} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="보강 문장 주어 (예: 지호)" aria-label="주어" />
        <input style={smallInput} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="장소 (예: 골목)" aria-label="장소" />
      </div>
      {(characters.length > 0 || places.length > 0) && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {characters.slice(0, 5).map((c) => (
            <button key={c.id} style={chip} onClick={() => useCharacter(c.name)} title="주어로 사용">인물: {c.name}</button>
          ))}
          {places.slice(0, 5).map((p) => (
            <button key={p.id} style={chip} onClick={() => usePlace(p.name)} title="장소로 사용">장소: {p.name}</button>
          ))}
        </div>
      )}

      {!a ? (
        <div style={empty}>
          장면 텍스트를 넣으면 다섯 감각의 비율을 막대로 보여주고,<br />
          한쪽으로 치우쳤거나 빠진 감각을 짚어<br />
          채워 넣을 보강 문장을 제안합니다.
        </div>
      ) : (
        <div style={scroll}>
          {/* 균형 점수 게이지 */}
          <div>
            <div style={bar}>
              <div style={sectionTitle}>감각 균형 점수</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: a.balance >= 60 ? 'var(--ok)' : a.balance >= 35 ? 'var(--warn)' : 'var(--accent)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{a.balance}<span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>/100</span></div>
            </div>
            <div style={{ height: 8, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, a.balance)}%`, height: '100%', background: a.balance >= 60 ? 'var(--ok)' : a.balance >= 35 ? 'var(--warn)' : 'var(--accent)', transition: 'width .3s' }} />
            </div>
            <div style={{ ...hint, marginTop: 4 }}>
              {a.balance >= 60 ? '다섯 감각이 고르게 섞여 장면이 입체적입니다.'
                : a.balance >= 35 ? '몇몇 감각에 치우쳐 있습니다. 아래 제안으로 보강해 보세요.'
                  : a.dominant ? `${SENSE_BY_KEY[a.dominant].label} 한 감각에 크게 편중되어 단조로울 수 있습니다.` : ''}
            </div>
          </div>

          {/* 감각별 분포 막대 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={sectionTitle}>감각 분포 (표현 {a.total}회)</div>
            {a.stats.map((s) => {
              const def = SENSE_BY_KEY[s.key]
              const isDom = a.dominant === s.key && a.total > 0
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={s.hits.slice(0, 6).map((h) => `${h.word}(${h.count})`).join(', ')}>
                  <div style={{ width: 34, fontSize: 12, fontWeight: 700, color: def.color, flexShrink: 0 }}>{def.label}</div>
                  <div style={{ flex: 1, minWidth: 0, height: 16, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${Math.max(s.count > 0 ? 3 : 0, Math.round(s.pct))}%`, height: '100%', background: def.color, opacity: isDom ? 1 : 0.78, borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <div style={{ width: 64, textAlign: 'right', fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.count}</span>회 {s.pct.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>

          {/* 경고: 편중/부재 */}
          {(a.missing.length > 0 || a.weak.length > 0 || (a.dominant && a.stats.find((s) => s.key === a.dominant)!.pct >= 60)) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}>편중 경고</div>
              {a.dominant && a.stats.find((s) => s.key === a.dominant)!.pct >= 60 && (
                <div style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                  <b style={{ color: 'var(--warn)' }}>{SENSE_BY_KEY[a.dominant].label} 과다</b> — 전체의 {a.stats.find((s) => s.key === a.dominant)!.pct.toFixed(0)}%. 다른 감각을 끼워 넣어 균형을 잡으세요.
                </div>
              )}
              {a.missing.length > 0 && (
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                  <b style={{ color: 'var(--accent)' }}>빠진 감각</b> — {a.missing.map((k) => SENSE_BY_KEY[k].label).join(', ')}. 한 줄만 더해도 장면이 살아납니다.
                </div>
              )}
              {a.weak.length > 0 && (
                <div style={{ ...hint }}>
                  약한 감각(8% 미만): {a.weak.map((k) => SENSE_BY_KEY[k].label).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* 보강 문장 제안 */}
          {suggestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={bar}>
                <div style={sectionTitle}>부족 감각 보강 문장</div>
                <button className="minibtn" onClick={() => setSeedBump((n) => n + 1)}>다시 뽑기</button>
              </div>
              {suggestions.map((sg, i) => (
                <div key={sg.key + i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: SENSE_BY_KEY[sg.key].color }}>{SENSE_BY_KEY[sg.key].label} 보강</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{sg.sentence}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="minibtn" onClick={() => insertSuggestion(sg.sentence)}>본문에 넣기</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', borderLeft: '3px solid var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
              다섯 감각이 모두 충분히 쓰였습니다. 균형이 좋아요.
            </div>
          )}

          {/* 내보내기 */}
          <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
            <button className="btn-primary" onClick={saveSnippet}>스니펫 저장</button>
            {hasProjectBridge() && <button className="linkbtn" onClick={toProject}>프로젝트에 추가</button>}
            {hasStash() && <button className="linkbtn" onClick={stash}>수집함 담기</button>}
            <button className="linkbtn" onClick={sendToPalette}>감각 팔레트 열기</button>
          </div>

          {savedFlash && <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>{savedFlash}</div>}
          <div className="license-note" style={hint}>
            한국어 감각 어휘 사전을 본문에서 매칭해 전부 브라우저에서 계산합니다. 외부 전송 없음.
          </div>
        </div>
      )}

      {!a && savedFlash && <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>{savedFlash}</div>}
    </div>
  )
}
