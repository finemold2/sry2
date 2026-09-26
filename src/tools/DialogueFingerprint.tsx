// 대사 지문 — 원고에서 인물별 대사를 자동 귀속(attribution)하고, 말투 DNA를 정량 추출한다.
//  · 따옴표로 묶인 대사 + 그 직전/직후의 화자 단서("X가 말했다", "X는 …" 등)로 발화를 인물에 귀속.
//  · 인물별 말투 DNA: 평균 대사 길이·어휘 다양도(TTR)·문장 종결 습관(종결어미)·문장부호 버릇·
//    높임/반말·감탄사·말버릇(자주 쓰는 짧은 어구)·물음/느낌 비율 등 다축 지문.
//  · 두 인물의 지문을 코사인 유사도로 비교 → "비슷하게 들리는" 인물쌍을 경고(목소리가 겹침).
//  · 결과를 수집함/프로젝트 문서로 내보내고, 인물별 말투 특성을 공유 라이브러리(characters)에 병합.
// 규칙: import 는 react 와 './linkbus' 만. 외부 네트워크 없음(전부 로컬 계산). 언마운트 안전.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  getDragItem,
  isItemDrag,
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  openToolLinked,
  type SharedCharacter,
} from './linkbus'

export const meta = {
  id: 'dialogue-fingerprint',
  name: '대사 지문',
  icon: '🗣️',
  group: '교정·언어',
  intro: '인물별 말투 DNA(길이·어휘 다양도·말버릇·부호 습관)를 추출하고 비슷하게 들리는 인물을 경고합니다',
  w: 500,
  h: 640,
}

const LS_KEY = 'sry:tool:dialogue-fingerprint'

// ───────── 따옴표 정의 ─────────
interface QuotePair { open: string; close: string }
const PAIRS: QuotePair[] = [
  { open: '“', close: '”' }, // 둥근 큰따옴표
  { open: '‘', close: '’' }, // 둥근 작은따옴표
  { open: '「', close: '」' }, // 낫표
  { open: '『', close: '』' }, // 겹낫표
  { open: '"', close: '"' },
  { open: "'", close: "'" },
]
const OPEN_OF = new Map(PAIRS.map((p) => [p.open, p]))

// 한 발화(대사) 토막 + 주변 화자 단서 텍스트
interface Utterance { text: string; before: string; after: string }

// ───────── 본문에서 대사 + 주변 지문(화자 단서) 추출 ─────────
function extractUtterances(src: string): Utterance[] {
  const out: Utterance[] = []
  const chars = [...src]
  const n = chars.length
  let i = 0
  let lastClose = 0 // 직전 발화가 끝난 위치(=다음 발화의 before 시작 한계)
  const isAlnum = (ch: string | undefined) => !!ch && /[A-Za-z0-9가-힣]/.test(ch)

  while (i < n) {
    const ch = chars[i]
    const pair = OPEN_OF.get(ch)
    if (!pair) { i++; continue }
    // 곧은 작은따옴표 축약형(it's) 보호
    if (ch === "'" && isAlnum(chars[i - 1])) { i++; continue }

    let j = i + 1
    let inner = ''
    let closed = false
    while (j < n) {
      const cj = chars[j]
      if (pair.close === "'" && cj === "'" && isAlnum(chars[j - 1]) && isAlnum(chars[j + 1])) { inner += cj; j++; continue }
      if (cj === pair.close) { closed = true; break }
      if (cj === '\n' && chars[j + 1] === '\n') break
      inner += cj; j++
    }
    if (closed) {
      const before = chars.slice(lastClose, i).join('').slice(-60)
      // after 는 닫는 따옴표 직후 ~ 다음 줄/다음 따옴표 전까지
      let k = j + 1
      let after = ''
      while (k < n && after.length < 60) {
        const ck = chars[k]
        if (ck === '\n') break
        if (OPEN_OF.has(ck)) break
        after += ck; k++
      }
      const t = inner.trim()
      if (t.length > 0) out.push({ text: t, before: before.trim(), after: after.trim() })
      lastClose = j + 1
      i = j + 1
    } else {
      i++
    }
  }
  return out
}

// ───────── 화자 귀속 ─────────
// before/after 텍스트에서 알려진 인물 이름(라이브러리/사용자 지정) 또는 "이름+조사+말했다" 패턴으로 화자 추정.
const SAY_VERBS = /(말|얘기|이야기|중얼|속삭|외|소리|되묻|물|답|대답|읊|덧붙|내뱉|뇌|읊조|웃|한숨|소근|뇌까)[가-힣]*(다|었다|였다|이며|으며|면서|었고)?/
// 한국어 주격/주제 조사로 끝나는 이름 후보
const NAME_TAIL = /([가-힣A-Za-z][가-힣A-Za-z·]{0,11})(이|가|은|는|이가)?\s*$/

function attribute(utt: Utterance, known: string[]): string {
  const ctx = (utt.before + ' ¶ ' + utt.after)
  // 1) 알려진 이름이 주변에 직접 등장하면 우선(after 우선 — 보통 "라고 X가 말했다")
  const tryKnown = (text: string): string | null => {
    for (const nm of known) {
      if (!nm) continue
      if (text.includes(nm)) return nm
    }
    return null
  }
  const fromAfter = tryKnown(utt.after)
  if (fromAfter) return fromAfter
  const fromBefore = tryKnown(utt.before)
  if (fromBefore) return fromBefore
  // 2) after 에 화자 동사가 있으면, after 앞부분의 이름 후보 추출
  if (SAY_VERBS.test(utt.after)) {
    const m = utt.after.match(/^[^가-힣A-Za-z]*([가-힣A-Za-z][가-힣A-Za-z·]{0,11})(이|가|은|는)?/)
    if (m && m[1] && m[1].length <= 6) return m[1]
  }
  // 3) before 가 이름+조사로 끝나면(예: "민수가") 화자로
  const mb = utt.before.match(NAME_TAIL)
  if (mb && mb[2] && mb[1] && mb[1].length <= 6 && /[가-힣]/.test(mb[1])) {
    // 동사 단서가 근처에 있으면 신뢰
    if (SAY_VERBS.test(ctx) || mb[2]) return mb[1]
  }
  return ''
}

// ───────── 말투 DNA 계산 ─────────
interface Fingerprint {
  name: string
  count: number          // 대사 수
  totalChars: number
  avgLen: number         // 평균 대사 길이(공백 제외 글자수)
  lenStd: number         // 길이 표준편차(말 길이의 들쭉날쭉함)
  ttr: number            // type-token ratio(어휘 다양도, 0~1)
  questionPct: number    // 물음표 비율
  exclaimPct: number     // 느낌표 비율
  ellipsisPct: number    // 말줄임(…/...) 비율
  formal: number         // 높임 점수(0 반말 ~ 1 존댓말)
  endings: { k: string; v: number }[] // 자주 쓰는 종결 어미 상위
  fillers: { k: string; v: number }[] // 자주 쓰는 짧은 말버릇(감탄사/군말)
  vec: number[]          // 비교용 정규화 벡터
}

const ENDING_PATTERNS: { k: string; re: RegExp }[] = [
  { k: '-습니다/-ㅂ니다', re: /(습니다|ㅂ니다|입니다)[.?!…]?$/ },
  { k: '-요', re: /(요|에요|예요|어요|아요|세요|네요|지요|죠)[.?!…]?$/ },
  { k: '-다', re: /(이다|는다|ㄴ다|었다|였다|겠다|린다|난다|한다)[.?!…]?$/ },
  { k: '-네', re: /(네|구나|군|로군|는군)[.?!…]?$/ },
  { k: '-야/-어', re: /(야|어|아|지|거든|잖아|는데|던데)[.?!…]?$/ },
  { k: '-까/-나(의문)', re: /(까|나|니|냐|는가|을까|ㄹ까)[?…]?$/ },
  { k: '명령/청유', re: /(라|거라|해라|자|세|읍시다|십시오|시오)[.!…]?$/ },
]
const HONORIFIC = /(습니다|ㅂ니다|입니다|세요|십시오|시오|읍시다|십니다|드립니다|십니까|세영|시어요|셔요)/
const CASUAL = /(야$|어$|아$|지$|거든|잖아|냐$|라$|새끼|임마|놈|짜식)/
const FILLER_WORDS = ['아', '어', '음', '뭐', '그', '글쎄', '아니', '근데', '그러니까', '있잖아', '말이야', '말이지', '저기', '거참', '아이고', '헐', '에이', '흠', '하', '오', '와', '제기랄', '젠장', '그래', '응', '네', '예', '아무튼', '하여튼', '그냥', '진짜', '정말', '완전', '대체', '도대체']

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[가-힣]+|[a-z]+|[0-9]+/g)) || []
}
function stdev(xs: number[], mean: number): number {
  if (xs.length < 2) return 0
  const v = xs.reduce((a, x) => a + (x - mean) * (x - mean), 0) / xs.length
  return Math.sqrt(v)
}
function visibleLen(s: string): number { return [...s.replace(/\s/g, '')].length }

function buildFingerprint(name: string, lines: string[]): Fingerprint {
  const count = lines.length
  const lens = lines.map(visibleLen)
  const totalChars = lens.reduce((a, b) => a + b, 0)
  const avgLen = count ? totalChars / count : 0
  const lenStd = stdev(lens, avgLen)

  const allTokens = lines.flatMap(tokenize)
  const types = new Set(allTokens)
  const ttr = allTokens.length ? types.size / allTokens.length : 0

  let q = 0, ex = 0, el = 0
  for (const l of lines) {
    if (/\?|？/.test(l)) q++
    if (/!|！/.test(l)) ex++
    if (/…|\.\.\./.test(l)) el++
  }
  const questionPct = count ? q / count : 0
  const exclaimPct = count ? ex / count : 0
  const ellipsisPct = count ? el / count : 0

  // 종결어미: 각 대사를 문장 단위로 쪼개 마지막 토막의 어미 패턴 매칭
  const endCount: Record<string, number> = {}
  let endTotal = 0
  let honor = 0, casual = 0
  for (const l of lines) {
    const sents = l.split(/(?<=[.?!…])\s+|\n+/).map((x) => x.trim()).filter(Boolean)
    const targets = sents.length ? sents : [l.trim()]
    for (const sRaw of targets) {
      const s = sRaw.replace(/["'“”‘’「-』]/g, '').trim()
      if (!s) continue
      if (HONORIFIC.test(s)) honor++
      else if (CASUAL.test(s)) casual++
      for (const p of ENDING_PATTERNS) {
        if (p.re.test(s)) { endCount[p.k] = (endCount[p.k] || 0) + 1; endTotal++; break }
      }
    }
  }
  const formal = (honor + casual) ? honor / (honor + casual) : 0.5
  const endings = Object.entries(endCount).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 4)

  // 말버릇: 미리 정의된 짧은 군말 빈도(대사 수 대비)
  const fillerCount: Record<string, number> = {}
  for (const l of lines) {
    const segs = l.split(/[\s,.!?…"'“”‘’]+/).filter(Boolean)
    const seen = new Set<string>()
    for (const w of FILLER_WORDS) {
      // 단어 경계: 군말이 토막으로 등장
      if (segs.includes(w) && !seen.has(w)) { fillerCount[w] = (fillerCount[w] || 0) + 1; seen.add(w) }
    }
  }
  const fillers = Object.entries(fillerCount).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 5)

  // 비교 벡터(정규화된 특성들) — 0~1 스케일로 맞춰 코사인 비교
  const endVec = ENDING_PATTERNS.map((p) => (endTotal ? (endCount[p.k] || 0) / endTotal : 0))
  const vec = [
    Math.min(avgLen / 40, 1),
    Math.min(lenStd / 30, 1),
    ttr,
    questionPct,
    exclaimPct,
    ellipsisPct,
    formal,
    ...endVec,
  ]
  return { name, count, totalChars, avgLen, lenStd, ttr, questionPct, exclaimPct, ellipsisPct, formal, endings, fillers, vec }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ───────── 영속 상태 ─────────
interface PersistState { text: string; names: string }
function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { text: typeof p?.text === 'string' ? p.text : '', names: typeof p?.names === 'string' ? p.names : '' }
    }
  } catch { /* noop */ }
  return { text: '', names: '' }
}

const pct = (x: number) => Math.round(x * 100)

export default function DialogueFingerprint({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<PersistState>(loadState())
  const [text, setText] = useState(init.current.text)
  const [namesRaw, setNamesRaw] = useState(init.current.names) // 사용자가 보강하는 화자 이름(콤마 구분)
  const [dragOver, setDragOver] = useState(false)
  const [flash, setFlash] = useState('')
  const [minLines, setMinLines] = useState(3) // 지문을 신뢰할 최소 대사 수
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  const library = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (flashTimer.current !== null) clearTimeout(flashTimer.current) }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ text, names: namesRaw })) }
    catch { if (mounted.current) setFlash('이 브라우저에서 저장이 막혀 있어요(동작은 정상).') }
  }, [text, namesRaw])

  // payload.text 수용(드롭/연계 전달)
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    const pt = payload?.text
    if (typeof pt === 'string' && pt.trim() && consumed.current !== pt) {
      consumed.current = pt
      setText((prev) => (prev.trim() ? prev + '\n\n' + pt : pt))
    }
    const pn = payload?.names
    if (typeof pn === 'string' && pn.trim()) setNamesRaw((prev) => prev || pn)
  }, [payload])

  const showFlash = (m: string) => {
    setFlash(m)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2200)
  }

  // 알려진 이름 = 사용자 입력 + 라이브러리 인물명
  const knownNames = useMemo(() => {
    const fromInput = namesRaw.split(/[,\n、·]/).map((s) => s.trim()).filter(Boolean)
    const fromLib = library.map((c) => (c.name || '').trim()).filter(Boolean)
    // 긴 이름 우선(부분일치 오류 방지)
    return Array.from(new Set([...fromInput, ...fromLib])).sort((a, b) => b.length - a.length)
  }, [namesRaw, library])

  // ───────── 분석 ─────────
  const analysis = useMemo(() => {
    const src = text.trim()
    if (!src) return null
    let utts: Utterance[]
    try { utts = extractUtterances(text) } catch { return null }
    if (utts.length === 0) return null

    const byName: Record<string, string[]> = {}
    let attributed = 0
    for (const u of utts) {
      const who = attribute(u, knownNames)
      if (who) {
        ;(byName[who] = byName[who] || []).push(u.text)
        attributed++
      } else {
        ;(byName['(미상)'] = byName['(미상)'] || []).push(u.text)
      }
    }

    const prints: Fingerprint[] = Object.entries(byName)
      .filter(([nm]) => nm !== '(미상)')
      .map(([nm, lines]) => buildFingerprint(nm, lines))
      .sort((a, b) => b.count - a.count)

    const unknown = byName['(미상)']?.length || 0

    // 유사도 경고: 충분한 표본(minLines 이상)을 가진 인물쌍만 비교
    const eligible = prints.filter((p) => p.count >= minLines)
    const pairs: { a: string; b: string; sim: number }[] = []
    for (let i = 0; i < eligible.length; i++) {
      for (let j = i + 1; j < eligible.length; j++) {
        const sim = cosine(eligible[i].vec, eligible[j].vec)
        pairs.push({ a: eligible[i].name, b: eligible[j].name, sim })
      }
    }
    pairs.sort((x, y) => y.sim - x.sim)

    return { total: utts.length, attributed, unknown, prints, pairs }
  }, [text, knownNames, minLines])

  // ───────── 드롭 ─────────
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (item?.text) {
      e.preventDefault()
      setText((prev) => (prev.trim() ? prev + '\n\n' + item.text : (item.text || '')))
      showFlash(`‘${item.title || '문서'}’의 본문을 불러왔어요.`)
    }
  }

  // ───────── 내보내기 ─────────
  const reportText = useMemo(() => {
    const a = analysis
    if (!a) return ''
    const L: string[] = ['[대사 지문 분석]']
    L.push(`전체 대사 ${a.total}개 · 화자 귀속 ${a.attributed}개 · 미상 ${a.unknown}개`)
    L.push('')
    for (const p of a.prints) {
      L.push(`# ${p.name} — 대사 ${p.count}개`)
      L.push(`평균 길이 ${p.avgLen.toFixed(1)}자 (편차 ${p.lenStd.toFixed(1)}) · 어휘 다양도 ${pct(p.ttr)}%`)
      L.push(`높임도 ${pct(p.formal)}% · 물음 ${pct(p.questionPct)}% · 느낌 ${pct(p.exclaimPct)}% · 말줄임 ${pct(p.ellipsisPct)}%`)
      if (p.endings.length) L.push('종결 습관: ' + p.endings.map((e) => `${e.k}(${e.v})`).join(', '))
      if (p.fillers.length) L.push('말버릇: ' + p.fillers.map((f) => `${f.k}(${f.v})`).join(', '))
      L.push('')
    }
    if (a.pairs.length) {
      L.push('[목소리 겹침 경고]')
      for (const pr of a.pairs.filter((x) => x.sim >= 0.9)) {
        L.push(`${pr.a} ↔ ${pr.b}: 유사도 ${pct(pr.sim)}% (말투가 비슷하게 들립니다)`)
      }
    }
    return L.join('\n').trimEnd()
  }, [analysis])

  const copyReport = async () => {
    if (!reportText) return
    try { await navigator.clipboard.writeText(reportText); showFlash('분석 리포트를 복사했어요.') }
    catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  const stashOn = hasStash()
  const bridgeOn = hasProjectBridge()

  const toStash = () => {
    if (!reportText) return
    addToStash({ kind: 'memo', label: '대사 지문 분석', text: reportText })
    showFlash('수집함에 분석 결과를 담았어요.')
  }

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const a = analysis
    if (!bridgeOn || !a) { showFlash(bridgeOn ? '먼저 본문을 분석하세요.' : '프로젝트에 연결되어 있지 않아요.'); return }
    const parts: string[] = ['<h2>대사 지문 요약</h2>']
    parts.push(`<p>전체 대사 ${a.total}개 · 귀속 ${a.attributed}개 · 미상 ${a.unknown}개</p>`)
    for (const p of a.prints) {
      parts.push('<h3>' + escHtml(p.name) + ' (' + p.count + '개)</h3>')
      parts.push('<ul>')
      parts.push(`<li>평균 길이 ${p.avgLen.toFixed(1)}자 / 편차 ${p.lenStd.toFixed(1)} / 어휘 다양도 ${pct(p.ttr)}%</li>`)
      parts.push(`<li>높임 ${pct(p.formal)}% / 물음 ${pct(p.questionPct)}% / 느낌 ${pct(p.exclaimPct)}% / 말줄임 ${pct(p.ellipsisPct)}%</li>`)
      if (p.endings.length) parts.push('<li>종결: ' + escHtml(p.endings.map((e) => `${e.k}(${e.v})`).join(', ')) + '</li>')
      if (p.fillers.length) parts.push('<li>말버릇: ' + escHtml(p.fillers.map((f) => `${f.k}(${f.v})`).join(', ')) + '</li>')
      parts.push('</ul>')
    }
    const warn = a.pairs.filter((x) => x.sim >= 0.9)
    if (warn.length) {
      parts.push('<h3>목소리 겹침 경고</h3><ul>')
      for (const pr of warn) parts.push(`<li>${escHtml(pr.a)} ↔ ${escHtml(pr.b)}: 유사도 ${pct(pr.sim)}%</li>`)
      parts.push('</ul>')
    }
    const id = addToProject({ kind: 'text', root: 'research', folder: '인물', title: '대사 지문 분석', bodyHtml: parts.join('\n'), synopsis: `인물 ${a.prints.length}명 말투 분석` })
    showFlash(id ? '자료 › 인물 폴더에 분석 문서를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  // 특정 인물 지문을 공유 라이브러리 캐릭터의 'speech' 필드에 병합(있으면 갱신, 없으면 신규)
  const saveSpeechToLibrary = (p: Fingerprint) => {
    const speech = [
      `평균 ${p.avgLen.toFixed(0)}자`,
      p.endings[0] ? '종결 ' + p.endings[0].k : '',
      p.fillers.length ? '말버릇 ' + p.fillers.map((f) => f.k).slice(0, 3).join('/') : '',
      p.formal >= 0.66 ? '존댓말' : p.formal <= 0.33 ? '반말' : '혼용',
    ].filter(Boolean).join(' · ')
    const exist = library.find((c) => (c.name || '').trim() === p.name)
    if (exist) {
      updateInLibrary('characters', exist.id, { fields: { ...(exist.fields || {}), speech } })
      showFlash(`‘${p.name}’의 말투를 라이브러리에 갱신했어요.`)
    } else {
      addToLibrary('characters', { name: p.name, fields: { name: p.name, speech }, source: '대사 지문' } as Partial<SharedCharacter>)
      showFlash(`‘${p.name}’을(를) 라이브러리에 추가했어요(말투 포함).`)
    }
  }

  const clearAll = () => {
    if (!text.trim() && !namesRaw.trim()) return
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('본문과 화자 이름을 모두 비울까요?')) return
    setText(''); setNamesRaw('')
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const top: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleS: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const ta: React.CSSProperties = {
    minHeight: 110, resize: 'vertical', width: '100%', boxSizing: 'border-box',
    background: dragOver ? 'var(--chrome-2)' : 'var(--paper)', color: 'var(--text)',
    border: '1px solid ' + (dragOver ? 'var(--accent)' : 'var(--border)'), borderRadius: 10,
    padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const namesInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px', fontSize: 13, fontFamily: 'inherit' }
  const sectionT: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)' }
  const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: 16 }
  const meter = (label: string, val: number, max = 1, color = 'var(--accent)') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', width: 78, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: 'var(--chrome-2)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(1, val / max)) * 100}%`, height: '100%', background: color }} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }}>{pct(val / max)}%</div>
    </div>
  )

  const a = analysis
  const COLORS = ['#3d7fd6', '#e0518b', '#3fa35a', '#e0992b', '#8b5cf6', '#0ea5a4']

  return (
    <div style={wrap}>
      <div style={top}>
        <div style={titleS}><span>{meta.icon}</span><span>대사 지문</span></div>
        <button className="linkbtn" onClick={toProject} disabled={!a || !bridgeOn} title={bridgeOn ? '분석 문서를 자료 › 인물에 추가' : '프로젝트 미연결'}>프로젝트에 추가</button>
        {stashOn && <button className="minibtn" onClick={toStash} disabled={!a} title="수집함에 담기">수집함</button>}
        <button className="minibtn" onClick={copyReport} disabled={!a} title="리포트 복사">복사</button>
        <button className="minibtn" onClick={clearAll} disabled={!text.trim() && !namesRaw.trim()} title="전체 비우기">비우기</button>
      </div>

      {flash && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>{flash}</div>
      )}

      <div style={body}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={sectionT}>원고 본문 (좌측 바인더 문서를 끌어다 놓아도 됩니다)</div>
          <textarea
            style={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            placeholder={'인물들의 대사가 섞인 장면을 붙여넣으세요.\n예) 민수가 고개를 들었다. "정말 그렇게 생각해?"\n"글쎄요, 잘 모르겠어요." 지영이 작게 답했다.'}
            spellCheck={false}
            aria-label="원고 본문 입력"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={sectionT}>화자 이름 보강 (쉼표로 구분 — 귀속 정확도가 올라갑니다)</div>
          <input
            style={namesInput}
            value={namesRaw}
            onChange={(e) => setNamesRaw(e.target.value)}
            placeholder="예: 민수, 지영, 박 형사"
            aria-label="화자 이름 보강"
          />
          {library.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={hint}>라이브러리 인물 자동 인식:</span>
              {library.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  className="minibtn"
                  style={{ padding: '3px 8px', fontSize: 12 }}
                  onClick={() => setNamesRaw((prev) => prev.split(/[,\n]/).map((s) => s.trim()).includes((c.name || '').trim()) ? prev : (prev.trim() ? prev + ', ' + c.name : (c.name || '')))}
                  title="이 인물을 화자 후보로 추가"
                >{(c.name || '이름없음').trim()}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={hint}>지문 신뢰 최소 대사 수: {minLines}개</span>
            <input type="range" min={2} max={10} value={minLines} onChange={(e) => setMinLines(Number(e.target.value))} style={{ flex: 1, maxWidth: 160 }} aria-label="최소 대사 수" />
          </div>
        </div>

        {!a ? (
          <div style={empty}>
            본문을 입력하면 인물별로 대사를 모아<br />
            평균 길이·어휘 다양도·종결 습관·말버릇 등<br />
            말투 DNA를 추출하고, 비슷하게 들리는 인물쌍을 경고합니다.<br />
            <span style={{ fontSize: 11.5 }}>좌측 바인더 문서 드롭 / 다른 도구에서 본문 전달도 받습니다.</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: 1, minWidth: 90, padding: '8px 10px', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{a.total}</div>
                <div style={hint}>전체 대사</div>
              </div>
              <div style={{ ...card, flex: 1, minWidth: 90, padding: '8px 10px', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ok)' }}>{a.prints.length}</div>
                <div style={hint}>식별 인물</div>
              </div>
              <div style={{ ...card, flex: 1, minWidth: 90, padding: '8px 10px', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: a.unknown ? 'var(--warn)' : 'var(--muted)' }}>{a.unknown}</div>
                <div style={hint}>화자 미상</div>
              </div>
            </div>

            {/* 목소리 겹침 경고 */}
            {a.pairs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={sectionT}>목소리 겹침 점검 (말투 유사도)</div>
                {a.pairs.slice(0, 6).map((pr, idx) => {
                  const high = pr.sim >= 0.9
                  const mid = pr.sim >= 0.8
                  const col = high ? 'var(--warn)' : mid ? 'var(--accent)' : 'var(--ok)'
                  return (
                    <div key={idx} style={{ ...card, padding: '8px 10px', flexDirection: 'row', alignItems: 'center', gap: 8, borderLeft: `3px solid ${col}` }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{pr.a} <span style={{ color: 'var(--muted)' }}>vs</span> {pr.b}</div>
                      <div style={{ width: 90, height: 8, background: 'var(--chrome-2)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct(pr.sim)}%`, height: '100%', background: col }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: col, width: 64, textAlign: 'right' }}>
                        {pct(pr.sim)}%{high ? ' 겹침' : ''}
                      </div>
                    </div>
                  )
                })}
                {a.pairs.some((x) => x.sim >= 0.9) && (
                  <div style={{ ...hint, color: 'var(--warn)' }}>유사도 90% 이상 쌍은 말투가 잘 구분되지 않습니다. 종결어미·문장 길이·말버릇을 차별화해 보세요.</div>
                )}
              </div>
            )}

            {/* 인물별 지문 카드 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={sectionT}>인물별 말투 DNA</div>
              {a.prints.map((p, i) => {
                const color = COLORS[i % COLORS.length]
                const weak = p.count < minLines
                return (
                  <div key={p.name} style={{ ...card, borderTop: `3px solid ${color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={hint}>{p.count}개 대사</div>
                      <button className="minibtn" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => saveSpeechToLibrary(p)} title="이 인물의 말투를 공유 라이브러리에 저장">라이브러리</button>
                    </div>
                    {weak && <div style={{ ...hint, color: 'var(--muted)' }}>표본이 적어({p.count}개) 지문 신뢰도가 낮습니다.</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span className="license-note" style={{ fontSize: 11.5 }}>평균 {p.avgLen.toFixed(1)}자 (편차 {p.lenStd.toFixed(1)})</span>
                      <span className="license-note" style={{ fontSize: 11.5 }}>{p.formal >= 0.66 ? '존댓말' : p.formal <= 0.33 ? '반말' : '존댓말/반말 혼용'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {meter('어휘 다양도', p.ttr)}
                      {meter('높임도', p.formal)}
                      {meter('물음', p.questionPct)}
                      {meter('느낌', p.exclaimPct)}
                      {meter('말줄임', p.ellipsisPct)}
                    </div>
                    {p.endings.length > 0 && (
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>종결 습관: </span>
                        {p.endings.map((e) => `${e.k} ${e.v}`).join(' · ')}
                      </div>
                    )}
                    {p.fillers.length > 0 && (
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>말버릇: </span>
                        {p.fillers.map((f) => `${f.k}(${f.v})`).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="linkbar">
              <span className="linkbar-label">함께 열기:</span>
              <button className="linkbtn" onClick={() => openToolLinked('character-voice', { text })} title="인물 말투 차별화기를 본문과 함께 엽니다">인물 말투 차별화기</button>
              <button className="linkbtn" onClick={() => openToolLinked('dialogue-ratio', { text })} title="대화/지문 비율 도구를 엽니다">대화/지문 비율</button>
              <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트를 엽니다">인물 시트</button>
            </div>
            <div style={hint}>
              화자 귀속은 따옴표 대사와 주변 "이름+말했다" 단서로 추정합니다(휴리스틱). 위 입력칸에 인물 이름을 적으면 정확도가 크게 올라갑니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
