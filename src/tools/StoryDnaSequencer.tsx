// 스토리 DNA 시퀀서 — 장르별 비트(beat) 패턴을 '염기서열'처럼 인코딩해, 내가 짠 구조와
//  나란히 정렬·비교하고, 어긋난 곳에 "돌연변이"(변주) 제안을 내놓는 대형 인터랙티브 구조 도구.
//
//  핵심 아이디어(전부 로컬 결정론적 계산):
//   - 12종의 '비트 코돈'을 정의(설정/사건/욕망/적대/시련/반전/추락/각성/결전/대가/해소/여운 등).
//     각 코돈에 한 글자 기호(A,B,C,...)와 색을 부여해 한 편의 이야기를 '염기서열' 문자열로 표현한다.
//   - 7개 장르 레퍼런스 서열을 내장(영웅서사·로맨스·미스터리·스릴러·성장·비극·코미디).
//   - 내 구조(비트 시퀀스)를 입력하면 Needleman-Wunsch 전역 정렬로 레퍼런스와 정렬해
//     일치/치환/삽입(과잉)/결손(빠진 비트)을 시각화하고, 정렬 점수·유사도(%)를 계산한다.
//   - 정렬 결과를 근거로 '돌연변이 제안'(빠진 비트 보강, 치환 변주, 순서 교정)을 결정론적으로 생성.
//
//  연동(linkbus): snippets 라이브러리에서 서열 가져오기/내보내기, 좌측 바인더 문서 드롭 수용,
//   payload.text/payload.beats 수용, 프로젝트 자료(구조)에 정렬 리포트 문서 추가, 수집함 담기,
//   관련 구조 도구를 데이터와 함께 열기.
// react/linkbus 외 import 없음. 외부 네트워크 불필요(전부 브라우저 로컬).
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLibraryList, addToLibrary,
  getDragItem, isItemDrag,
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  openToolLinked,
} from './linkbus'

export const meta = {
  id: 'story-dna-sequencer',
  name: '스토리 DNA 시퀀서',
  icon: '🧬',
  group: '구조',
  intro: '장르 비트 패턴을 염기서열처럼 인코딩해 내 구조와 정렬·비교하고 변주를 제안합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:story-dna-sequencer'

// ── 비트 코돈 정의(고정 12종) ────────────────────────────────────────────────
// sym: 서열 1글자 기호 / name: 한국어 비트명 / role: 한 줄 기능 / hue: 시각화 색상(HSL hue)
interface Codon { sym: string; name: string; role: string; hue: number; keywords: string[] }
const CODONS: Codon[] = [
  { sym: 'A', name: '평범', role: '주인공의 일상·결핍을 보여주는 출발 상태', hue: 200, keywords: ['일상', '평범', '결핍', '소개', '도입'] },
  { sym: 'B', name: '촉발', role: '균형을 깨뜨려 이야기를 시작시키는 사건', hue: 30, keywords: ['사건', '계기', '촉발', '초대', '발단'] },
  { sym: 'C', name: '욕망', role: '주인공이 좇기 시작하는 목표·결심', hue: 50, keywords: ['목표', '욕망', '결심', '출발', '여정'] },
  { sym: 'D', name: '적대', role: '맞서는 힘·라이벌·장애물의 등장', hue: 0, keywords: ['적', '라이벌', '장애', '갈등', '방해'] },
  { sym: 'E', name: '시련', role: '점증하는 시험과 작은 실패의 연속', hue: 280, keywords: ['시련', '시험', '훈련', '실패', '고난'] },
  { sym: 'F', name: '반전', role: '판을 뒤집는 발견·배신·정보', hue: 330, keywords: ['반전', '배신', '발견', '비밀', '폭로'] },
  { sym: 'G', name: '추락', role: '가장 낮은 바닥·모든 것을 잃는 순간', hue: 240, keywords: ['추락', '바닥', '상실', '절망', '위기'] },
  { sym: 'H', name: '각성', role: '내면의 깨달음으로 반응에서 행동으로 전환', hue: 140, keywords: ['깨달음', '각성', '결단', '변화', '성장'] },
  { sym: 'I', name: '결전', role: '최종 대결·클라이맥스의 정점', hue: 10, keywords: ['결전', '대결', '클라이맥스', '절정', '승부'] },
  { sym: 'J', name: '대가', role: '승리·해결을 위해 치르는 희생', hue: 300, keywords: ['희생', '대가', '죽음', '이별', '포기'] },
  { sym: 'K', name: '해소', role: '갈등이 풀리고 새 균형이 잡히는 순간', hue: 120, keywords: ['해결', '해소', '결말', '귀환', '회복'] },
  { sym: 'L', name: '여운', role: '변화를 보여주는 마지막 잔향·암시', hue: 180, keywords: ['여운', '암시', '마무리', '잔향', '에필로그'] },
]
const CODON_BY_SYM: Record<string, Codon> = Object.fromEntries(CODONS.map((c) => [c.sym, c]))
const ALL_SYMS = CODONS.map((c) => c.sym).join('')

// ── 장르 레퍼런스 서열 ─────────────────────────────────────────────────────────
interface GenreRef { id: string; name: string; seq: string; note: string }
const GENRES: GenreRef[] = [
  { id: 'hero', name: '영웅서사', seq: 'ABCDEFGHIJKL', note: '소명-시련-바닥-각성-결전-귀환의 완전한 변형 곡선.' },
  { id: 'romance', name: '로맨스', seq: 'ABCDFGHIKL', note: '만남-끌림-오해/반전-이별의 바닥-재결합. 적대(D)보다 내적 갈등 중심.' },
  { id: 'mystery', name: '미스터리', seq: 'ABDEFGFIKL', note: '사건-수사-단서-반전 반복(F) 후 진상 폭로와 해소.' },
  { id: 'thriller', name: '스릴러', seq: 'ABDEGFIGIJK', note: '위협-추격-추락-반전-재추락. 결전(I)이 두 번 몰아치는 가속 구조.' },
  { id: 'coming', name: '성장', seq: 'ABCEEHIKL', note: '시련(E)의 누적과 내면 각성(H)이 핵심. 거대한 적대는 약함.' },
  { id: 'tragedy', name: '비극', seq: 'ABCDFGHIJ', note: '욕망이 파멸로 향함. 해소(K)·여운(L) 대신 대가(J)에서 멈춘다.' },
  { id: 'comedy', name: '코미디', seq: 'ABCDFGHKL', note: '오해와 혼란(F)이 추락(G)을 만들고 화해(K)로 정리. 시련은 가볍게.' },
]
const GENRE_BY_ID: Record<string, GenreRef> = Object.fromEntries(GENRES.map((g) => [g.id, g]))

// ── 결정론적 의사난수(문자열 시드 해시) ─────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

// ── 텍스트 → 비트 서열 추론(키워드 매칭, 결정론적) ──────────────────────────────
// 줄/문장 단위로 끊어 각 조각을 코돈 키워드 점수로 분류한다. 매칭이 없으면 위치 기반 추정.
function inferSeqFromText(text: string): string {
  const chunks = text
    .split(/\n+|(?<=[.!?。…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  if (!chunks.length) return ''
  const out: string[] = []
  chunks.forEach((chunk, idx) => {
    let best = ''
    let bestScore = 0
    for (const c of CODONS) {
      let sc = 0
      for (const kw of c.keywords) if (chunk.includes(kw)) sc += 2
      if (sc > bestScore) { bestScore = sc; best = c.sym }
    }
    if (!best) {
      // 위치 기반 추정: 진행률에 따라 도입→절정→마무리 코돈으로 매핑
      const p = idx / Math.max(1, chunks.length - 1)
      best = p < 0.18 ? 'A' : p < 0.34 ? 'C' : p < 0.55 ? 'E' : p < 0.7 ? 'G' : p < 0.85 ? 'I' : 'K'
    }
    out.push(best)
  })
  // 연속 중복 축약(같은 비트 3연속 이상은 2개로) — 노이즈 완화
  const dedup: string[] = []
  for (const s of out) {
    const n = dedup.length
    if (n >= 2 && dedup[n - 1] === s && dedup[n - 2] === s) continue
    dedup.push(s)
  }
  return dedup.join('')
}

// 입력 문자열 정규화: 허용 기호만 대문자로 추림
function normalizeSeq(raw: string): string {
  return raw.toUpperCase().split('').filter((ch) => ALL_SYMS.includes(ch)).join('')
}

// ── Needleman-Wunsch 전역 정렬 ────────────────────────────────────────────────
interface AlignCell { a: string; b: string } // '-' = gap
interface AlignResult { rowA: AlignCell[]; aligned: { a: string; b: string }[]; score: number; match: number; sub: number; insTop: number; insBottom: number; identity: number }
function similarityScore(a: string, b: string): number {
  if (a === b) return 2
  const ca = CODON_BY_SYM[a], cb = CODON_BY_SYM[b]
  if (!ca || !cb) return -1
  // 같은 키워드를 공유하면 '유사 치환'으로 부분 점수
  const shared = ca.keywords.some((k) => cb.keywords.includes(k))
  return shared ? 0 : -1
}
function align(mine: string, ref: string): AlignResult {
  const GAP = -2
  const n = mine.length, m = ref.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i * GAP
  for (let j = 0; j <= m; j++) dp[0][j] = j * GAP
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + similarityScore(mine[i - 1], ref[j - 1])
      const up = dp[i - 1][j] + GAP
      const left = dp[i][j - 1] + GAP
      dp[i][j] = Math.max(diag, up, left)
    }
  }
  // 역추적
  const aligned: { a: string; b: string }[] = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + similarityScore(mine[i - 1], ref[j - 1])) {
      aligned.push({ a: mine[i - 1], b: ref[j - 1] }); i--; j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP) {
      aligned.push({ a: mine[i - 1], b: '-' }); i--
    } else {
      aligned.push({ a: '-', b: ref[j - 1] }); j--
    }
  }
  aligned.reverse()
  let match = 0, sub = 0, insTop = 0, insBottom = 0
  for (const c of aligned) {
    if (c.a === '-') insBottom++          // 레퍼런스에는 있는데 내 구조엔 없음(결손)
    else if (c.b === '-') insTop++        // 내 구조에만 있음(과잉)
    else if (c.a === c.b) match++
    else sub++
  }
  const denom = match + sub + insTop + insBottom
  const identity = denom ? Math.round((match / denom) * 100) : 0
  return { rowA: [], aligned, score: dp[n][m], match, sub, insTop, insBottom, identity }
}

// ── 돌연변이(변주) 제안 생성 ───────────────────────────────────────────────────
interface Mutation { kind: '결손' | '치환' | '과잉' | '순서'; title: string; detail: string }
function buildMutations(aligned: { a: string; b: string }[], seedKey: string): Mutation[] {
  const rnd = mulberry(hashStr(seedKey))
  const out: Mutation[] = []
  aligned.forEach((c, idx) => {
    const pos = aligned.length ? Math.round((idx / aligned.length) * 100) : 0
    if (c.a === '-') {
      const cb = CODON_BY_SYM[c.b]
      if (cb) out.push({ kind: '결손', title: `'${cb.name}' 비트가 빠졌어요`, detail: `이 장르의 ${pos}% 지점에는 보통 '${cb.name}'(${cb.role})가 들어갑니다. 한 장면을 끼워 넣어 보세요.` })
    } else if (c.b === '-') {
      const ca = CODON_BY_SYM[c.a]
      if (ca) out.push({ kind: '과잉', title: `'${ca.name}' 비트가 장르 평균보다 많아요`, detail: `${pos}% 지점의 '${ca.name}'는 레퍼런스에 대응이 없습니다. 의도된 변주라면 강점이지만, 늘어진다면 통합·삭제를 검토하세요.` })
    } else if (c.a !== c.b) {
      const ca = CODON_BY_SYM[c.a], cb = CODON_BY_SYM[c.b]
      if (ca && cb) out.push({ kind: '치환', title: `'${ca.name}' → '${cb.name}' 변주 지점`, detail: `${pos}% 지점에서 당신은 '${ca.name}'를, 장르는 '${cb.name}'를 둡니다. ${rnd() < 0.5 ? `'${cb.name}'의 기대를 깔아둔 뒤 '${ca.name}'로 비트는 반전형` : `'${ca.name}' 안에 '${cb.name}'의 기능(${cb.role})을 겹쳐 넣는 이중 비트`}을 시도해 보세요.` })
    }
  })
  // 순서 변주 제안(인접 비트 스왑 아이디어) — 결정론적 1건
  const real = aligned.filter((c) => c.a !== '-').map((c) => c.a)
  if (real.length >= 3) {
    const k = Math.floor(rnd() * (real.length - 1))
    const x = CODON_BY_SYM[real[k]], y = CODON_BY_SYM[real[k + 1]]
    if (x && y && x.sym !== y.sym) out.push({ kind: '순서', title: `'${x.name}'와 '${y.name}'의 순서를 뒤집어 보면?`, detail: `${k + 1}~${k + 2}번째 비트의 순서를 바꾸면 인과의 결이 달라집니다 — 결과를 먼저 보여주고 원인을 늦게 드러내는 비선형 변주.` })
  }
  return out
}

// ── 영속 상태 ──────────────────────────────────────────────────────────────────
interface Store { title: string; genre: string; seq: string; raw: string; mode: 'seq' | 'text' }
function defaultStore(): Store { return { title: '', genre: 'hero', seq: '', raw: '', mode: 'seq' } }
function loadStore(): Store {
  const base = defaultStore()
  try {
    const r = localStorage.getItem(LS_KEY)
    if (!r) return base
    const p = JSON.parse(r)
    if (!p || typeof p !== 'object') return base
    return {
      title: typeof p.title === 'string' ? p.title : '',
      genre: GENRE_BY_ID[p.genre] ? p.genre : 'hero',
      seq: typeof p.seq === 'string' ? normalizeSeq(p.seq) : '',
      raw: typeof p.raw === 'string' ? p.raw : '',
      mode: p.mode === 'text' ? 'text' : 'seq',
    }
  } catch { return base }
}

export default function StoryDnaSequencer({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showMut, setShowMut] = useState(true)
  const snippets = useLibraryList('snippets')
  const mounted = useRef(true)
  const applied = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload 1회 수용: text(원고)·beats(서열)·title·genre
  useEffect(() => {
    if (applied.current || !payload) return
    applied.current = true
    setStore((s) => {
      const next = { ...s }
      const t = typeof payload.title === 'string' ? payload.title.trim() : ''
      if (t && !next.title) next.title = t.slice(0, 120)
      const g = typeof payload.genre === 'string' && GENRE_BY_ID[payload.genre] ? payload.genre : ''
      if (g) next.genre = g
      // 복원된 사용자 서열이 있으면 payload 흡수를 건너뛴다(빈값일 때만 채움).
      if (!next.seq) {
        const beats = typeof payload.beats === 'string' ? normalizeSeq(payload.beats) : ''
        if (beats) { next.seq = beats; next.mode = 'seq' }
        else {
          const txt = typeof payload.text === 'string' ? payload.text : ''
          if (txt.trim()) { next.raw = txt; next.mode = 'text'; next.seq = inferSeqFromText(txt) }
        }
      }
      return next
    })
  }, [payload])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  const ref = GENRE_BY_ID[store.genre] || GENRES[0]
  const result = useMemo(() => align(store.seq, ref.seq), [store.seq, ref.seq])
  const mutations = useMemo(() => buildMutations(result.aligned, store.seq + '|' + ref.id + '|' + store.title), [result.aligned, store.seq, ref.id, store.title])
  const hasSeq = store.seq.length > 0

  // ── 액션 ───────────────────────────────────────────────────────────────────
  const setRawAndInfer = (raw: string) => setStore((s) => ({ ...s, raw, seq: inferSeqFromText(raw) }))
  const appendCodon = (sym: string) => setStore((s) => ({ ...s, seq: s.seq + sym, mode: 'seq' }))
  const backspace = () => setStore((s) => ({ ...s, seq: s.seq.slice(0, -1) }))
  const clearSeq = () => setStore((s) => ({ ...s, seq: '', raw: '' }))
  const useGenreAsTemplate = () => { setStore((s) => ({ ...s, seq: ref.seq, mode: 'seq' })); flashMsg('장르 서열을 내 구조로 복사했어요') }

  // 드롭(바인더 문서) / 라이브러리 스니펫 수용
  const onDrop = (e: React.DragEvent) => {
    if (!isItemDrag(e)) return
    e.preventDefault(); setDragOver(false)
    const it = getDragItem(e)
    if (it && it.text) { setRawAndInfer(it.text); setStore((s) => ({ ...s, mode: 'text', title: s.title || it.title })); flashMsg(`'${it.title}'에서 서열을 추론했어요`) }
    else if (it) setNote('이 문서에는 본문 텍스트가 없어 서열을 추론할 수 없어요.')
  }
  const importSnippet = (text: string) => { setRawAndInfer(text); setStore((s) => ({ ...s, mode: 'text' })); flashMsg('스니펫에서 서열을 추론했어요') }

  // 서열 → 스니펫 라이브러리 저장
  const seqToLibrary = () => {
    if (!hasSeq) { setNote('먼저 비트 서열을 만들어 주세요.'); return }
    addToLibrary('snippets', { text: buildSeqText(), tags: ['story-dna', ref.id], source: 'story-dna-sequencer' })
    flashMsg('서열을 스니펫 라이브러리에 저장했어요')
  }

  // 텍스트 산출물
  const buildSeqText = (): string => {
    const beats = store.seq.split('').map((s, i) => `${i + 1}. ${CODON_BY_SYM[s]?.name || s}`).join('  ·  ')
    return `[스토리 DNA] ${store.title || '(제목 없음)'} / 장르: ${ref.name}\n서열: ${store.seq}\n비트: ${beats}\n유사도: ${result.identity}% (정렬 점수 ${result.score})`
  }
  const buildReport = (): string => {
    const lines: string[] = []
    lines.push(`# 스토리 DNA 정렬 리포트${store.title ? ` — ${store.title}` : ''}`)
    lines.push(`장르 레퍼런스: ${ref.name} (${ref.seq})`)
    lines.push(`내 서열: ${store.seq || '(없음)'}`)
    lines.push(`유사도: ${result.identity}%  ·  정렬점수: ${result.score}  ·  일치 ${result.match} / 변주 ${result.sub} / 결손 ${result.insBottom} / 과잉 ${result.insTop}`)
    lines.push('')
    lines.push('## 정렬')
    lines.push('내구조 : ' + result.aligned.map((c) => (c.a === '-' ? '·' : c.a)).join(' '))
    lines.push('장르   : ' + result.aligned.map((c) => (c.b === '-' ? '·' : c.b)).join(' '))
    lines.push('')
    lines.push('## 돌연변이(변주) 제안')
    if (!mutations.length) lines.push('- 레퍼런스와 잘 정렬되어 추가 제안이 없습니다.')
    for (const m of mutations) lines.push(`- [${m.kind}] ${m.title}\n    ${m.detail}`)
    lines.push('')
    lines.push('## 비트 코돈 범례')
    for (const c of CODONS) lines.push(`  ${c.sym} = ${c.name}: ${c.role}`)
    return lines.join('\n') + '\n'
  }

  const copyReport = async () => {
    const text = buildReport()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); flashMsg('리포트를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
        flashMsg('리포트를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요.') }
    }
  }

  const escHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const parts: string[] = []
    parts.push(`<p><em>장르 레퍼런스: ${escHtml(ref.name)} · 유사도 ${result.identity}%</em></p>`)
    parts.push(`<p><strong>내 서열</strong>: ${escHtml(store.seq || '(없음)')}</p>`)
    parts.push(`<p><strong>정렬</strong><br>내구조: ${escHtml(result.aligned.map((c) => (c.a === '-' ? '·' : c.a)).join(' '))}<br>장르&nbsp;&nbsp;: ${escHtml(result.aligned.map((c) => (c.b === '-' ? '·' : c.b)).join(' '))}</p>`)
    parts.push('<h3>돌연변이(변주) 제안</h3>')
    if (!mutations.length) parts.push('<p>레퍼런스와 잘 정렬되어 추가 제안이 없습니다.</p>')
    for (const m of mutations) parts.push(`<p><strong>[${m.kind}] ${escHtml(m.title)}</strong><br>${escHtml(m.detail)}</p>`)
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '스토리 DNA' + (store.title ? ` — ${store.title}` : ` (${ref.name})`),
      bodyHtml: parts.join(''),
      meta: { 장르: ref.name, 유사도: `${result.identity}%`, 비트수: String(store.seq.length) },
    })
    flashMsg(id ? '프로젝트 자료에 정렬 리포트를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }
  const toStash = () => {
    if (!hasStash()) { setNote('수집함에 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'memo', label: '스토리 DNA: ' + (store.title || ref.name), text: buildReport() })
    flashMsg('수집함에 담았어요')
  }

  // ── 스타일 ───────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9, background: 'var(--chrome-2)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const sectTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.4 }
  const chip = (hue: number, active = true): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 30, height: 30, padding: '0 6px',
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
    background: active ? `hsl(${hue} 70% 28%)` : 'var(--panel)', color: active ? '#fff' : 'var(--muted)',
    border: `1px solid hsl(${hue} 60% 40%)`,
  })
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 72, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`, background: dragOver ? 'var(--panel)' : 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }

  // 정렬 시각화 행 렌더
  const renderAlignRow = (pick: (c: { a: string; b: string }) => string, isMine: boolean) =>
    result.aligned.map((c, i) => {
      const sym = pick(c)
      const codon = CODON_BY_SYM[sym]
      const gap = sym === '-'
      const matched = c.a !== '-' && c.b !== '-' && c.a === c.b
      const sub = c.a !== '-' && c.b !== '-' && c.a !== c.b
      const bg = gap ? 'var(--panel)' : codon ? `hsl(${codon.hue} 65% ${matched ? 30 : 36}%)` : 'var(--panel)'
      const ring = sub ? '2px solid var(--warn)' : gap ? '1px dashed var(--muted)' : '1px solid transparent'
      return (
        <span key={(isMine ? 'a' : 'b') + i}
          title={gap ? (isMine ? '내 구조에 없는 비트(결손)' : '장르에 없는 비트(과잉)') : `${codon?.name} — ${codon?.role}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, fontSize: 12, fontWeight: 700, color: gap ? 'var(--muted)' : '#fff', background: bg, border: ring, flexShrink: 0 }}>
          {gap ? '·' : sym}
        </span>
      )
    })

  const kindColor: Record<Mutation['kind'], string> = { 결손: 'var(--warn)', 치환: 'var(--accent)', 과잉: 'var(--muted)', 순서: 'var(--ok)' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <input style={{ ...input, flex: '2 1 160px' }} value={store.title} onChange={(e) => setStore((s) => ({ ...s, title: e.target.value }))} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <select style={{ ...select, flex: '1 1 110px' }} value={store.genre} onChange={(e) => setStore((s) => ({ ...s, genre: e.target.value }))} aria-label="장르 레퍼런스">
            {GENRES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{ref.note}</div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 입력: 코돈 팔레트 또는 원고 텍스트 */}
        <div>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={sectTitle}>1. 내 구조 입력</span>
            <span style={row}>
              <button className="minibtn" style={{ opacity: store.mode === 'seq' ? 1 : 0.55 }} onClick={() => setStore((s) => ({ ...s, mode: 'seq' }))}>비트 클릭</button>
              <button className="minibtn" style={{ opacity: store.mode === 'text' ? 1 : 0.55 }} onClick={() => setStore((s) => ({ ...s, mode: 'text' }))}>원고에서 추론</button>
            </span>
          </div>

          {store.mode === 'seq' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CODONS.map((c) => (
                <button key={c.sym} onClick={() => appendCodon(c.sym)} title={`${c.name} — ${c.role}`}
                  style={{ ...chip(c.hue), padding: '0 8px', minWidth: 0 }}>
                  {c.sym}<span style={{ fontWeight: 500, fontSize: 11, marginLeft: 4 }}>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <textarea style={ta}
              value={store.raw}
              onChange={(e) => setRawAndInfer(e.target.value)}
              onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              placeholder="장면·비트를 줄 단위로 적거나, 좌측 바인더의 원고 문서를 끌어다 놓으세요. 키워드(목표·시련·반전·결전 등)로 비트를 자동 추론합니다."
              aria-label="원고 텍스트" />
          )}

          {/* 현재 서열 표시줄 */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 30 }}>
            {hasSeq ? store.seq.split('').map((s, i) => {
              const c = CODON_BY_SYM[s]
              return <span key={i} title={`${c?.name} — ${c?.role}`} style={chip(c?.hue ?? 200)}>{s}</span>
            }) : <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>아직 서열이 없어요. 비트를 클릭하거나 원고를 넣어 시작하세요.</span>}
            {hasSeq && <span style={{ flex: 1 }} />}
            {hasSeq && <button className="minibtn" onClick={backspace}>지우기</button>}
            {hasSeq && <button className="minibtn" onClick={clearSeq} style={{ color: 'var(--warn)' }}>비우기</button>}
          </div>
          <div style={{ marginTop: 6 }}>
            <button className="minibtn" onClick={useGenreAsTemplate}>장르 서열을 템플릿으로 불러오기</button>
          </div>
        </div>

        {/* 정렬 결과 */}
        {hasSeq && (
          <div>
            <div style={{ ...row, justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={sectTitle}>2. 장르와 정렬</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: result.identity >= 70 ? 'var(--ok)' : result.identity >= 40 ? 'var(--accent)' : 'var(--warn)' }}>유사도 {result.identity}%</span>
            </div>
            {/* 유사도 막대 */}
            <div style={{ height: 9, borderRadius: 5, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', width: `${result.identity}%`, background: result.identity >= 70 ? 'var(--ok)' : result.identity >= 40 ? 'var(--accent)' : 'var(--warn)', transition: 'width .25s ease' }} />
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 44, flexShrink: 0 }}>내 구조</span>
                <span style={{ display: 'flex', gap: 4 }}>{renderAlignRow((c) => c.a, true)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 44, flexShrink: 0 }}>{ref.name}</span>
                <span style={{ display: 'flex', gap: 4 }}>{renderAlignRow((c) => c.b, false)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
              <span>일치 <strong style={{ color: 'var(--ok)' }}>{result.match}</strong></span>
              <span>변주(치환) <strong style={{ color: 'var(--warn)' }}>{result.sub}</strong></span>
              <span>결손 <strong style={{ color: 'var(--warn)' }}>{result.insBottom}</strong></span>
              <span>과잉 <strong style={{ color: 'var(--text)' }}>{result.insTop}</strong></span>
              <span>정렬점수 <strong style={{ color: 'var(--accent)' }}>{result.score}</strong></span>
            </div>
          </div>
        )}

        {/* 돌연변이 제안 */}
        {hasSeq && (
          <div>
            <div style={{ ...row, justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={sectTitle}>3. 돌연변이(변주) 제안</span>
              <button className="linkbtn" onClick={() => setShowMut((v) => !v)} aria-expanded={showMut}>{showMut ? '접기' : '펼치기'}</button>
            </div>
            {showMut && (mutations.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mutations.map((m, i) => (
                  <div key={i} style={{ border: '1px solid var(--border)', borderLeft: `4px solid ${kindColor[m.kind]}`, borderRadius: 10, background: 'var(--panel)', padding: '9px 11px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: kindColor[m.kind], borderRadius: 5, padding: '1px 6px' }}>{m.kind}</span>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>{m.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>레퍼런스와 잘 정렬되어 추가 변주 제안이 없습니다. 다른 장르와 교차 비교해 의외의 변주를 찾아보세요.</div>
            ))}
          </div>
        )}

        {/* 스니펫 라이브러리에서 가져오기 */}
        {snippets.length > 0 && (
          <div>
            <div style={sectTitle}>스니펫 라이브러리에서 가져오기</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {snippets.slice(0, 6).map((sn) => (
                <button key={sn.id} className="minibtn" style={{ textAlign: 'left', justifyContent: 'flex-start', whiteSpace: 'normal', lineHeight: 1.4 }} onClick={() => importSnippet(sn.text)}>
                  {(sn.text || '').slice(0, 70) || '(빈 스니펫)'}{(sn.text || '').length > 70 ? '…' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 범례 */}
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>비트 코돈 범례 12종</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {CODONS.map((c) => (
              <div key={c.sym} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                <span style={{ ...chip(c.hue), width: 24, minWidth: 24, height: 24, fontSize: 11 }}>{c.sym}</span>
                <span><strong>{c.name}</strong> <span style={{ color: 'var(--muted)' }}>— {c.role}</span></span>
              </div>
            ))}
          </div>
        </details>

        <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          정렬은 Needleman-Wunsch 전역 정렬을, 추론은 키워드 분류를 사용한 자체 결정론적 계산입니다(외부 전송 없음). 장르 레퍼런스 서열은 널리 알려진 구조 이론을 비트로 추상화해 재구성한 것입니다.
        </div>
      </div>

      {/* 연계 바 */}
      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '정렬 리포트를 프로젝트 자료(구조)에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title="리포트를 수집함에 담기">수집함</button>
        <button className="linkbtn" onClick={seqToLibrary} title="서열을 스니펫 라이브러리에 저장">서열 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('seven-point-structure', { title: store.title })} title="7포인트 구조 도구 열기">7포인트로</button>
        <button className="linkbtn" onClick={() => openToolLinked('save-the-cat-beats', { title: store.title })} title="비트 시트 도구 열기">비트시트로</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyReport} disabled={!hasSeq}>정렬 리포트 복사</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
      </div>
    </div>
  )
}
