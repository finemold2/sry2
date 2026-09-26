// 제목 대장간(TitleForge) — 장르 × 수식어 × 핵심명사 × 구조(은유/대조/한 단어/명사구) 슬롯을
// 조합해 작품 제목 후보를 대량 생성한다. 자급식: 외부 네트워크·라이브러리 없음.
// Math.random + localStorage(즐겨찾기) 만 사용. 슬롯 잠금 → 일부만 고정한 채 재생성, 총 조합수 표시.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'title-forge', name: '제목 대장간', icon: '🏷️', group: '영감·발상', intro: '장르·수식어·핵심명사·구조 슬롯을 조합해 작품 제목 후보를 대량 생성하세요', w: 560, h: 660 }

// ───────────────────────── 로컬 어휘 풀 ─────────────────────────

// 장르: 각 장르마다 어울리는 수식어/명사 쪽으로 색을 입힌다(가중치 없이 풀 결합).
interface Genre { key: string; label: string; icon: string }
const GENRES: Genre[] = [
  { key: 'any', label: '전체', icon: '✨' },
  { key: 'fantasy', label: '판타지', icon: '🐉' },
  { key: 'romance', label: '로맨스', icon: '💗' },
  { key: 'mystery', label: '미스터리·스릴러', icon: '🔍' },
  { key: 'sf', label: 'SF', icon: '🚀' },
  { key: 'horror', label: '호러', icon: '🕯️' },
  { key: 'literary', label: '순문학·드라마', icon: '🌾' },
  { key: 'history', label: '사극·역사', icon: '🏯' },
]

// 수식어(꾸밈말). genres: 비어있으면 모든 장르 공용.
interface Word { t: string; genres?: string[] }

const MODIFIERS: Word[] = [
  // 공용
  { t: '잊혀진' }, { t: '마지막' }, { t: '끝없는' }, { t: '침묵하는' }, { t: '눈먼' },
  { t: '버려진' }, { t: '깨어진' }, { t: '숨겨진' }, { t: '낡은' }, { t: '먼' },
  { t: '붉은' }, { t: '창백한' }, { t: '검은' }, { t: '은빛' }, { t: '여린' },
  { t: '비밀의' }, { t: '이름 없는' }, { t: '돌아오지 않는' }, { t: '저무는' }, { t: '잠든' },
  // 판타지
  { t: '용의', genres: ['fantasy'] }, { t: '서리의', genres: ['fantasy'] }, { t: '잿빛', genres: ['fantasy', 'horror'] },
  { t: '왕좌의', genres: ['fantasy', 'history'] }, { t: '마법에 걸린', genres: ['fantasy'] }, { t: '룬이 새겨진', genres: ['fantasy'] },
  // 로맨스
  { t: '설레는', genres: ['romance'] }, { t: '엇갈린', genres: ['romance'] }, { t: '닿지 못한', genres: ['romance'] },
  { t: '한여름의', genres: ['romance', 'literary'] }, { t: '서툰', genres: ['romance'] },
  // 미스터리
  { t: '사라진', genres: ['mystery'] }, { t: '의심스러운', genres: ['mystery'] }, { t: '한밤의', genres: ['mystery', 'horror'] },
  { t: '풀리지 않는', genres: ['mystery'] }, { t: '거짓의', genres: ['mystery'] },
  // SF
  { t: '궤도 위의', genres: ['sf'] }, { t: '복제된', genres: ['sf'] }, { t: '마지막 인류의', genres: ['sf'] },
  { t: '강철의', genres: ['sf', 'fantasy'] }, { t: '시뮬레이션된', genres: ['sf'] },
  // 호러
  { t: '저주받은', genres: ['horror', 'fantasy'] }, { t: '피에 젖은', genres: ['horror'] }, { t: '문이 잠긴', genres: ['horror', 'mystery'] },
  { t: '썩어가는', genres: ['horror'] },
  // 순문학
  { t: '느린', genres: ['literary'] }, { t: '나직한', genres: ['literary'] }, { t: '오래된', genres: ['literary', 'history'] },
  { t: '저녁의', genres: ['literary', 'romance'] },
  // 사극
  { t: '왕가의', genres: ['history'] }, { t: '망국의', genres: ['history'] }, { t: '유배된', genres: ['history'] },
  { t: '단심의', genres: ['history'] },
]

const NOUNS: Word[] = [
  // 공용 추상/상징
  { t: '약속' }, { t: '비밀' }, { t: '그림자' }, { t: '계절' }, { t: '거리' },
  { t: '편지' }, { t: '이름' }, { t: '문' }, { t: '길' }, { t: '밤' },
  { t: '바다' }, { t: '별' }, { t: '재' }, { t: '거울' }, { t: '시계' },
  { t: '노래' }, { t: '꿈' }, { t: '기억' }, { t: '경계' }, { t: '불씨' },
  // 판타지
  { t: '왕관', genres: ['fantasy', 'history'] }, { t: '검', genres: ['fantasy', 'history'] }, { t: '예언', genres: ['fantasy'] },
  { t: '마탑', genres: ['fantasy'] }, { t: '용', genres: ['fantasy'] }, { t: '성소', genres: ['fantasy', 'horror'] },
  // 로맨스
  { t: '입맞춤', genres: ['romance'] }, { t: '고백', genres: ['romance'] }, { t: '온도', genres: ['romance', 'literary'] },
  { t: '계절의 끝', genres: ['romance', 'literary'] },
  // 미스터리
  { t: '용의자', genres: ['mystery'] }, { t: '알리바이', genres: ['mystery'] }, { t: '진술', genres: ['mystery'] },
  { t: '실종', genres: ['mystery'] }, { t: '단서', genres: ['mystery'] },
  // SF
  { t: '궤도', genres: ['sf'] }, { t: '안드로이드', genres: ['sf'] }, { t: '특이점', genres: ['sf'] },
  { t: '신호', genres: ['sf', 'mystery'] }, { t: '식민지', genres: ['sf'] },
  // 호러
  { t: '저택', genres: ['horror', 'mystery'] }, { t: '제물', genres: ['horror', 'fantasy'] }, { t: '속삭임', genres: ['horror'] },
  { t: '의식', genres: ['horror', 'fantasy'] },
  // 순문학
  { t: '식탁', genres: ['literary'] }, { t: '창문', genres: ['literary'] }, { t: '오후', genres: ['literary', 'romance'] },
  { t: '간격', genres: ['literary'] },
  // 사극
  { t: '교지', genres: ['history'] }, { t: '사화', genres: ['history'] }, { t: '환국', genres: ['history'] },
  { t: '능', genres: ['history', 'horror'] },
]

// 구조(제목의 형태). 어떻게 슬롯을 엮을지 결정.
interface Structure {
  key: string
  label: string
  desc: string
  // build: 한 후보 제목을 만든다. 이미 고른 단어를 받아 형태만 다르게 엮는다.
  build: (ctx: { mod: string; noun: string; mod2: string; noun2: string }) => string
}
const STRUCTURES: Structure[] = [
  {
    key: 'phrase', label: '명사구', desc: '수식어 + 핵심명사 (예: 잊혀진 약속)',
    build: ({ mod, noun }) => `${mod} ${noun}`,
  },
  {
    key: 'one', label: '한 단어', desc: '강렬한 단어 하나 (예: 재)',
    build: ({ noun }) => noun,
  },
  {
    key: 'metaphor', label: '은유', desc: '수식어를 명사처럼 비유 (예: 침묵의 바다)',
    build: ({ mod, noun }) => `${stripJosa(mod)}의 ${noun}`,
  },
  {
    key: 'contrast', label: '대조', desc: '상반된 두 명사 (예: 불씨와 재)',
    build: ({ noun, noun2 }) => `${noun}와(과) ${noun2}`,
  },
  {
    key: 'of', label: '~의 ~', desc: '핵심명사의 핵심명사 (예: 별의 거리)',
    build: ({ noun, noun2 }) => `${noun}의 ${noun2}`,
  },
  {
    key: 'and', label: '나열', desc: '수식+명사, 명사 (예: 마지막 밤, 첫 약속)',
    build: ({ mod, noun, mod2, noun2 }) => `${mod} ${noun}, ${mod2} ${noun2}`,
  },
]

// '~의/~한' 등 일부 수식어는 은유 'A의 B'에 그대로 쓰기 어색하므로 어미를 정리.
function stripJosa(w: string): string {
  return w.replace(/(의|는|한|된|운|울|을|린|은)$/u, '').trim() || w
}

const LS = 'sry:tool:title-forge'
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 장르에 맞는 단어 풀(전체면 모두, 아니면 공용+해당 장르).
function poolFor(words: Word[], g: string): string[] {
  if (g === 'any') return words.map((w) => w.t)
  return words.filter((w) => !w.genres || w.genres.includes(g)).map((w) => w.t)
}
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
function pick2(a: string[]): [string, string] {
  if (a.length <= 1) return [a[0] || '', a[0] || '']
  const i = Math.floor(Math.random() * a.length)
  let j = Math.floor(Math.random() * a.length)
  if (j === i) j = (j + 1) % a.length
  return [a[i], a[j]]
}

interface Candidate { id: string; title: string; structKey: string }

// 활성 구조들로 후보 1개 생성(잠금 단어가 있으면 반영).
function genOne(mods: string[], nouns: string[], structs: Structure[], lock: { mod?: string; noun?: string }): Candidate {
  const st = structs.length ? structs[Math.floor(Math.random() * structs.length)] : STRUCTURES[0]
  const [m1, m2] = pick2(mods)
  const [n1, n2] = pick2(nouns)
  const mod = lock.mod || m1
  const noun = lock.noun || n1
  const title = st.build({ mod, noun, mod2: m2, noun2: n2 }).replace(/\s+/g, ' ').trim()
  return { id: rid(), title, structKey: st.key }
}

interface Saved { id: string; title: string }
function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => x && typeof x.title === 'string').map((x) => ({ id: typeof x.id === 'string' ? x.id : rid(), title: x.title }))
  } catch { return [] }
}

const BATCH = 18

export default function TitleForge({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [genre, setGenre] = useState('any')
  // 활성 구조(다중 선택). 최소 1개 유지.
  const [structs, setStructs] = useState<string[]>(() => STRUCTURES.map((s) => s.key))
  // 슬롯 잠금: 고정된 수식어/핵심명사(있으면 모든 후보에 동일 적용)
  const [lockMod, setLockMod] = useState('')
  const [lockNoun, setLockNoun] = useState('')

  const [cands, setCands] = useState<Candidate[]>([])
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [copiedId, setCopiedId] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [toast, setToast] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 즐겨찾기 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 무시 */ }
  }, [saved])

  // 현재 장르/잠금에 따른 단어 풀
  const modPool = poolFor(MODIFIERS, genre)
  const nounPool = poolFor(NOUNS, genre)
  const activeStructs = STRUCTURES.filter((s) => structs.includes(s.key))

  // 총 조합수 추정: 활성 구조별 가능한 조합을 합산(잠금 반영).
  const M = lockMod ? 1 : modPool.length
  const N = lockNoun ? 1 : nounPool.length
  const N2 = nounPool.length // 두 번째 명사(은유/대조/of/나열)는 잠금 대상 아님
  const M2 = modPool.length
  const comboCount = activeStructs.reduce((sum, s) => {
    switch (s.key) {
      case 'phrase': return sum + M * N
      case 'one': return sum + N
      case 'metaphor': return sum + M * N // stripJosa(mod)의 noun
      case 'contrast': return sum + N * Math.max(1, N2 - 1)
      case 'of': return sum + N * Math.max(1, N2 - 1)
      case 'and': return sum + M * N * M2 * Math.max(1, N2 - 1)
      default: return sum
    }
  }, 0)

  const generate = useCallback(() => {
    setCopiedId('')
    if (!modPool.length || !nounPool.length || !activeStructs.length) { setCands([]); return }
    const out: Candidate[] = []
    const seen = new Set<string>()
    let guard = 0
    while (out.length < BATCH && guard < BATCH * 14) {
      guard++
      const c = genOne(modPool, nounPool, activeStructs, { mod: lockMod || undefined, noun: lockNoun || undefined })
      if (!c.title) continue
      if (seen.has(c.title)) continue
      seen.add(c.title)
      out.push(c)
    }
    setCands(out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, structs, lockMod, lockNoun])

  // 첫 진입 시 1배치 생성 + payload 로 들어온 핵심명사가 있으면 잠금 시드
  useEffect(() => {
    alive.current = true
    const seedNoun = payload && typeof (payload as Record<string, unknown>).noun === 'string' ? String((payload as Record<string, unknown>).noun).trim() : ''
    if (seedNoun) setLockNoun(seedNoun)
    generate()
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (linkTimer.current) clearTimeout(linkTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 장르/구조/잠금 변경 시 자동 재생성
  useEffect(() => { generate() }, [generate])

  const toggleStruct = (key: string) => {
    setStructs((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return STRUCTURES.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const flashLinked = (id: string) => {
    if (!alive.current) return
    setLinkedId(id)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => alive.current && setLinkedId(''), 1400)
  }
  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => {
      if (!alive.current) return
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1400)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  const isSaved = (title: string) => saved.some((s) => s.title === title)
  const saveTitle = (title: string) => {
    setSaved((prev) => (prev.some((s) => s.title === title) ? prev : [{ id: rid(), title }, ...prev]))
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const linked = hasProjectBridge()

  // 라이브러리(스니펫)에 제목 저장
  const toSnippet = (id: string, title: string) => {
    addToLibrary('snippets', { text: title, source: '제목 대장간', tags: ['제목', genre === 'any' ? '' : (GENRES.find((g) => g.key === genre)?.label || '')].filter(Boolean) })
    flashLinked(id)
  }

  // 프로젝트 자료 〈제목 후보〉 폴더에 저장(단일/즐겨찾기 전체)
  const titlesToProject = (titles: string[], label?: string) => {
    if (!linked) return
    const list = titles.map((t) => t.trim()).filter(Boolean)
    if (!list.length) return
    const gLabel = GENRES.find((g) => g.key === genre)?.label || '전체'
    const title = list.length === 1 ? `제목 후보: ${list[0]}` : `제목 후보 ${list.length}건`
    const bodyHtml = `<p>제목 대장간으로 만든 작품 제목 후보입니다. (장르: ${esc(gLabel)})</p>\n<ul>\n` +
      list.map((t) => `<li>${esc(t)}</li>`).join('\n') + `\n</ul>`
    const pid = addToProject({ kind: 'text', root: 'research', folder: '제목 후보', title, bodyHtml, meta: { 출처: '제목 대장간', 장르: gLabel, 후보수: String(list.length) } })
    if (pid) flashToast(label || (list.length === 1 ? `"${list[0]}" 저장됨` : `제목 후보 ${list.length}건 저장됨`))
  }

  // ───────────────────────── 스타일 ─────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const intro: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 6 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '20px 8px', fontSize: 13 }
  const sel: React.CSSProperties = { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none', maxWidth: 150 }
  const savedRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }

  const structName = (k: string) => STRUCTURES.find((s) => s.key === k)?.label || ''

  return (
    <div style={wrap}>
      <div style={intro}>
        <b>장르 · 수식어 · 핵심명사 · 구조</b>를 조합해 작품 제목 후보를 대량으로 뽑습니다. 마음에 드는 단어는 <Emoji e="🔒"/>로 고정한 채 다시 생성하세요.
      </div>

      {/* 장르 선택 */}
      <div style={chipRow}>
        {GENRES.map((g) => {
          const on = genre === g.key
          return (
            <button key={g.key} className="minibtn" onClick={() => setGenre(g.key)} aria-pressed={on}
              style={{ opacity: on ? 1 : 0.55, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={g.icon}/> {g.label}
            </button>
          )
        })}
      </div>

      {/* 구조 선택(다중) */}
      <div>
        <div style={{ ...secTitle, marginBottom: 4 }}>구조 (제목 형태 · 다중 선택)</div>
        <div style={chipRow}>
          {STRUCTURES.map((s) => {
            const on = structs.includes(s.key)
            return (
              <button key={s.key} className="minibtn" onClick={() => toggleStruct(s.key)} aria-pressed={on} title={s.desc}
                style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                {s.label}{on ? '' : ' +'}
              </button>
            )
          })}
        </div>
      </div>

      {/* 슬롯 잠금 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={secTitle}><Emoji e="🔒"/> 슬롯 고정</span>
        <select style={sel} value={lockMod} onChange={(e) => setLockMod(e.target.value)} title="수식어 고정">
          <option value="">수식어: 자유</option>
          {modPool.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={sel} value={lockNoun} onChange={(e) => setLockNoun(e.target.value)} title="핵심명사 고정">
          <option value="">핵심명사: 자유</option>
          {(lockNoun && !nounPool.includes(lockNoun) ? [lockNoun, ...nounPool] : nounPool).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {(lockMod || lockNoun) && (
          <button className="minibtn" onClick={() => { setLockMod(''); setLockNoun('') }} title="고정 모두 해제">잠금 해제</button>
        )}
      </div>

      {/* 생성 버튼 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={generate}><Emoji e="🔁"/> 제목 다시 생성</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          가능한 조합 <b style={{ color: 'var(--accent)' }}>{comboCount.toLocaleString('ko-KR')}</b>가지
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          {toast}
        </div>
      )}

      <div style={body}>
        {/* 후보 영역 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>제목 후보</span>
            {!!cands.length && <span>{cands.length}개</span>}
          </div>
          {!cands.length ? (
            <div style={msg}>구조를 하나 이상 고르고 〈제목 다시 생성〉을 눌러보세요.</div>
          ) : (
            <div style={grid}>
              {cands.map((c) => {
                const savedAlready = isSaved(c.title)
                return (
                  <div key={c.id} style={card}>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{c.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{structName(c.structKey)}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button className="minibtn" style={{ flex: 1, color: savedAlready ? 'var(--ok)' : undefined }} onClick={() => saveTitle(c.title)} disabled={savedAlready} title={savedAlready ? '이미 저장됨' : '즐겨찾기에 저장'}>
                        {savedAlready ? '★ 저장됨' : '☆ 저장'}
                      </button>
                      <button className="minibtn" onClick={() => copy(c.title, c.id)} title="제목 복사">{copiedId === c.id ? '✓' : <Emoji e="📋"/>}</button>
                    </div>
                    <div className="linkbar" style={{ display: 'flex', gap: 6 }}>
                      <button className="linkbtn" style={{ flex: 1 }} onClick={() => toSnippet(c.id, c.title)} title="공유 스니펫 라이브러리에 추가">
                        {linkedId === c.id ? '✓ 추가됨' : <><Emoji e="📥"/> 스니펫</>}
                      </button>
                      <button className="linkbtn" style={{ flex: 1 }} onClick={() => titlesToProject([c.title])} disabled={!linked} title={linked ? '이 제목을 프로젝트(제목 후보 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}>
                        <Emoji e="📄"/> 프로젝트
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 즐겨찾기 영역 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><Emoji e="⭐"/> 즐겨찾기 {saved.length ? `(${saved.length})` : ''}</span>
            {!!saved.length && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="linkbtn" onClick={() => titlesToProject(saved.map((s) => s.title), `즐겨찾기 ${saved.length}건 저장됨`)} disabled={!linked} title={linked ? '즐겨찾기 전체를 프로젝트(제목 후보 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                <button className="minibtn" onClick={() => copy(saved.map((s) => s.title).join('\n'), '__all__')}>{copiedId === '__all__' ? '✓ 복사됨' : <><Emoji e="📋"/> 전체 복사</>}</button>
              </span>
            )}
          </div>
          {!saved.length ? (
            <div style={{ ...msg, padding: '14px 8px' }}>아직 저장한 제목이 없습니다. 후보에서 ☆를 눌러 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={savedRow}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.title}</span>
                  <button className="linkbtn" onClick={() => toSnippet(s.id, s.title)} title="공유 스니펫 라이브러리에 추가">{linkedId === s.id ? '✓' : <Emoji e="📥"/>}</button>
                  <button className="linkbtn" onClick={() => titlesToProject([s.title])} disabled={!linked} title={linked ? '이 제목을 프로젝트(제목 후보 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}><Emoji e="📄"/></button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">↑</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">↓</button>
                  <button className="minibtn" onClick={() => copy(s.title, s.id)} title="복사">{copiedId === s.id ? '✓' : <Emoji e="📋"/>}</button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        전부 로컬 어휘 조합 · 외부 연결 없음
      </div>
    </div>
  )
}
