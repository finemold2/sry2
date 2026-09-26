// 내면 아크 설계 (Story Genius) — 인물의 거짓믿음(misbelief) / 진짜 욕망(want) / 진짜 필요(need) / 상처(wound) / 깨달음을 입력하면
//  "상처 → 거짓믿음 → 욕망 vs 필요의 충돌 → 깨달음 → 내적 변화" 한 문단을 자동 종합한다.
// 자급식: react 와 './linkbus' 외 import 없음, 외부 네트워크 없음(전부 로컬). 데이터는 localStorage 에 JSON 으로 자동 저장/복원.
// 연계: 인물 라이브러리에 traits 로 저장 · 프로젝트 자료 〈인물〉에 character 카드 보강 또는 text 문서 추가 · 인물 시트로 보내기.
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, useLibraryList, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'inner-arc', name: '내면 아크 설계', icon: '🎭', group: '구상·정리', intro: '상처·거짓믿음·욕망·필요·깨달음으로 인물의 내적 변화를 한 문단으로 종합', w: 620, h: 660 }

const LS_KEY = 'sry:tool:inner-arc'

interface Arc {
  name: string        // 인물 이름
  wound: string       // 상처 (과거의 사건)
  misbelief: string   // 거짓믿음 (상처가 심어준 잘못된 신념)
  want: string        // 진짜 욕망 (겉으로 좇는 목표)
  need: string        // 진짜 필요 (정말 필요한 내적 변화)
  epiphany: string    // 깨달음 (거짓믿음을 깨는 진실)
}

interface Saved extends Arc {
  id: string
  paragraph: string
  createdAt: number
}

const BLANK: Arc = { name: '', wound: '', misbelief: '', want: '', need: '', epiphany: '' }

// 빈 칸은 자리표시자로 대체해 항상 읽히는 문단을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}
function person(name: string): string {
  const t = (name || '').trim()
  return t || '인물'
}

// 입력을 "상처 → 거짓믿음 → 욕망/필요의 충돌 → 깨달음 → 내적 변화" 흐름의 한 문단으로 종합.
function synthesize(a: Arc): string {
  const who = person(a.name)
  const wound = f(a.wound, '상처')
  const mis = f(a.misbelief, '거짓믿음')
  const want = f(a.want, '욕망')
  const need = f(a.need, '필요')
  const epi = f(a.epiphany, '깨달음')
  return (
    `${who}은(는) ${wound}이라는 상처를 안고 살아간다. ` +
    `그 상처는 ${who}의 마음 깊은 곳에 “${mis}”라는 거짓믿음을 심었고, ` +
    `그래서 ${who}은(는) ${want}을(를) 손에 넣으면 모든 것이 채워지리라 믿으며 그것을 좇는다. ` +
    `그러나 ${who}에게 정말로 필요한 것은 ${need}이며, 좇는 욕망과 진짜 필요 사이의 간극이 이야기 내내 인물을 시험한다. ` +
    `마침내 ${who}은(는) “${epi}”는(은) 사실을 깨닫고, 자신을 가두던 거짓믿음을 내려놓는다. ` +
    `그 깨달음을 통해 ${who}은(는) ${want}에 매달리던 모습에서 벗어나 ${need}을(를) 끌어안는 사람으로 변화한다.`
  )
}

interface Field { k: keyof Arc; label: string; hint: string; ph: string; multi?: boolean }
const FIELDS: Field[] = [
  { k: 'name', label: '인물', hint: '이 아크의 주인', ph: '예: 김도윤' },
  { k: 'wound', label: '상처 (Wound)', hint: '과거에 인물을 다치게 한 사건', ph: '예: 어린 시절 부모에게 버림받은 일', multi: true },
  { k: 'misbelief', label: '거짓믿음 (Misbelief)', hint: '상처가 심은 잘못된 신념 — 변화시켜야 할 핵심', ph: '예: 나를 사랑하면 결국 떠난다', multi: true },
  { k: 'want', label: '진짜 욕망 (Want)', hint: '겉으로 좇는 외적 목표', ph: '예: 누구도 필요 없는 완벽한 성공', multi: true },
  { k: 'need', label: '진짜 필요 (Need)', hint: '정말 필요한 내적 변화 — 욕망과 충돌해야 한다', ph: '예: 타인을 믿고 곁을 내주는 법', multi: true },
  { k: 'epiphany', label: '깨달음 (Epiphany)', hint: '거짓믿음을 깨뜨리는 진실', ph: '예: 떠날까 두려워 먼저 밀어낸 것은 나였다', multi: true },
]

// 가이드용 예시 — 입력 칸을 채워주는 학습 샘플(유명 작품 모델).
interface Example extends Arc { title: string }
const EXAMPLES: Example[] = [
  {
    title: '《크리스마스 캐럴》 스크루지',
    name: '스크루지',
    wound: '가난과 외로움 속에 버려졌던 어린 시절',
    misbelief: '돈만이 나를 안전하게 지켜준다',
    want: '재산을 끝없이 불리는 것',
    need: '사람들과의 따뜻한 유대',
    epiphany: '내가 쌓아온 것은 부가 아니라 외로움이었다',
  },
  {
    title: '《라이온 킹》 심바',
    name: '심바',
    wound: '아버지의 죽음에 대한 죄책감',
    misbelief: '내 잘못이니 도망쳐 숨는 것이 옳다',
    want: '책임 없는 자유로운 삶(하쿠나 마타타)',
    need: '자신의 자리와 책임을 받아들이는 용기',
    epiphany: '과거는 도망친다고 사라지지 않으며 나는 도망친 그 자신이다',
  },
  {
    title: '《오만과 편견》 엘리자베스',
    name: '엘리자베스',
    wound: '체면과 편견에 휘둘리는 가족 속에서의 경험',
    misbelief: '첫인상으로 사람을 단번에 판단할 수 있다',
    want: '경솔한 결혼을 피하고 자존을 지키는 것',
    need: '자신의 편견을 인정하고 진심을 알아보는 눈',
    epiphany: '나야말로 오만과 편견에 사로잡혀 있었다',
  },
]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadState(): { cur: Arc; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: { ...BLANK }, saved: [] }
    const p = JSON.parse(raw)
    const pick = (o: unknown, k: keyof Arc): string => {
      const v = (o as Record<string, unknown> | null)?.[k]
      return typeof v === 'string' ? v : ''
    }
    const cur: Arc = {
      name: pick(p?.cur, 'name'), wound: pick(p?.cur, 'wound'), misbelief: pick(p?.cur, 'misbelief'),
      want: pick(p?.cur, 'want'), need: pick(p?.cur, 'need'), epiphany: pick(p?.cur, 'epiphany'),
    }
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Record<string, unknown>) => ({
            id: String(x.id || newId()),
            name: typeof x.name === 'string' ? x.name : '',
            wound: typeof x.wound === 'string' ? x.wound : '',
            misbelief: typeof x.misbelief === 'string' ? x.misbelief : '',
            want: typeof x.want === 'string' ? x.want : '',
            need: typeof x.need === 'string' ? x.need : '',
            epiphany: typeof x.epiphany === 'string' ? x.epiphany : '',
            paragraph: typeof x.paragraph === 'string' ? x.paragraph : '',
            createdAt: Number.isFinite(x.createdAt) ? Number(x.createdAt) : Date.now(),
          }))
      : []
    return { cur, saved }
  } catch {
    return { cur: { ...BLANK }, saved: [] }
  }
}

export default function InnerArc({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Arc>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showEx, setShowEx] = useState(false)
  const characters = useLibraryList('characters')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nonce = useRef(0)   // 경쟁상태 방지용(비동기 클립보드 등)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // payload 로 인물 정보가 오면 초기 1회 반영(선택적).
  useEffect(() => {
    const c = payload?.character as Record<string, unknown> | undefined
    if (c) {
      setCur((p) => ({
        ...p,
        name: typeof c.name === 'string' && c.name ? c.name : p.name,
        wound: typeof c.wound === 'string' && c.wound ? c.wound : p.wound,
        want: typeof c.goal === 'string' && c.goal ? c.goal : (typeof c.want === 'string' ? c.want : p.want),
      }))
    }
    // 최초 mount 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 변경 시 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const paragraph = synthesize(cur)
  const hasInput = !!(cur.name || cur.wound || cur.misbelief || cur.want || cur.need || cur.epiphany)
  const filled = FIELDS.filter((fl) => fl.k !== 'name' && (cur[fl.k] || '').trim()).length
  const total = FIELDS.length - 1

  const setField = (k: keyof Arc, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    const myNonce = ++nonce.current
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      if (!mounted.current || myNonce !== nonce.current) return
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    } catch {
      if (mounted.current && myNonce === nonce.current) flashNote('복사에 실패했습니다. 문단을 직접 선택해 복사하세요.')
    }
  }

  const applyExample = (ex: Example) => {
    setCur({ name: ex.name, wound: ex.wound, misbelief: ex.misbelief, want: ex.want, need: ex.need, epiphany: ex.epiphany })
    setEditId(null)
    setShowEx(false)
    flashNote(`${ex.title} 예시를 입력에 채웠습니다.`)
  }

  const clearForm = () => { setCur({ ...BLANK }); setEditId(null) }

  const saveCurrent = () => {
    const rec: Saved = { ...cur, id: editId || newId(), paragraph, createdAt: Date.now() }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('내면 아크를 저장했습니다.')
    }
    setEditId(null)
  }

  const loadSaved = (s: Saved) => {
    setCur({ name: s.name, wound: s.wound, misbelief: s.misbelief, want: s.want, need: s.need, epiphany: s.epiphany })
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }
  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null) }
  }

  // 라이브러리 인물 불러오기 — 기존 인물에 내면 아크를 입힌다.
  const fromCharacter = (c: SharedCharacter) => {
    const t = (label: string) => c.traits?.find((x) => x.k === label)?.v || ''
    setCur((p) => ({
      ...p,
      name: c.name || p.name,
      want: c.goal || t('욕망') || p.want,
      misbelief: t('거짓믿음') || p.misbelief,
      wound: t('상처') || p.wound,
    }))
    flashNote(`인물 ‘${c.name}’ 정보를 불러왔습니다.`)
  }

  // ---- 연계: 라이브러리 ----
  const traitsOf = (a: Arc): { k: string; v: string }[] => ([
    { k: '상처', v: a.wound }, { k: '거짓믿음', v: a.misbelief }, { k: '욕망', v: a.want },
    { k: '필요', v: a.need }, { k: '깨달음', v: a.epiphany },
  ].filter((x) => x.v.trim()))

  // 정규(표준) 캐릭터 필드로 1:1 매핑 — 받는 허브(인물 시트/라이브러리/프로젝트)에서 항목이 제자리에 들어가도록.
  // 욕망→goal, 거짓믿음→flaw(극복해야 할 내적 결점), 필요→motivation(진짜 동기), 상처→background(과거 사건),
  // 깨달음·종합 문단→arc(성장 곡선), 종합 문단→notes.
  const fieldsOf = (a: Arc, para: string): Record<string, string> => {
    const out: Record<string, string> = {}
    const set = (k: string, v: string) => { const t = (v || '').trim(); if (t) out[k] = t }
    set('name', person(a.name))
    set('goal', a.want)
    set('flaw', a.misbelief)
    set('motivation', a.need)
    set('background', a.wound)
    const arc = [a.epiphany.trim() ? `깨달음: ${a.epiphany.trim()}` : '', para.trim()].filter(Boolean).join('\n')
    set('arc', arc)
    set('notes', para)
    return out
  }

  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: person(cur.name),
      goal: cur.want.trim() || undefined,
      traits: traitsOf(cur),
      notes: paragraph,
      fields: fieldsOf(cur, paragraph),
      source: '내면 아크 설계',
    }
    addToLibrary('characters', c)
    flashNote(`인물 ‘${person(cur.name)}’의 내면 아크를 라이브러리에 저장했습니다.`)
  }

  const toSheet = () => {
    openToolLinked('character-sheet', {
      character: {
        name: person(cur.name),
        goal: cur.want,
        conflict: `거짓믿음: ${cur.misbelief || '-'} · 필요: ${cur.need || '-'}`,
        background: `상처: ${cur.wound || '-'}`,
        notes: paragraph,
        fields: fieldsOf(cur, paragraph),
      },
    })
    flashNote('인물 시트로 보냈습니다.')
  }

  // ---- 연계: 프로젝트 ----
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 1) 인물 카드(character) 보강 — 좌측 바인더 자료 〈인물〉 + DB 카드.
  const toProjectCharacter = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: person(cur.name),
      character: {
        // 정규(표준) 키 우선 — 받는 카드/DB에서 항목이 제자리에 들어가도록.
        ...fieldsOf(cur, paragraph),
        name: person(cur.name),
        goal: cur.want.trim() || '-',
        conflict: `거짓믿음: ${cur.misbelief.trim() || '-'} / 진짜 필요: ${cur.need.trim() || '-'}`,
        background: `상처: ${cur.wound.trim() || '-'}`,
        arc: paragraph,
      },
      synopsis: paragraph,
      meta: {
        상처: cur.wound.trim() || '-',
        거짓믿음: cur.misbelief.trim() || '-',
        욕망: cur.want.trim() || '-',
        필요: cur.need.trim() || '-',
        깨달음: cur.epiphany.trim() || '-',
      },
    })
    flashNote(id ? `프로젝트 ‘자료 › 인물’에 ‘${person(cur.name)}’ 카드를 추가했습니다 (바인더·DB 확인).` : '프로젝트에 추가하지 못했습니다.')
  }

  // 2) 텍스트 문서 — 자료 〈인물〉 폴더에 내면 아크 문단 문서.
  const toProjectText = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const row = (label: string, v: string) =>
      `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(v && v.trim() ? v.trim() : '-')}</p>`
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;">${escapeHtml(paragraph)}</p>`,
      `<hr/>`,
      row('상처 (Wound)', cur.wound),
      row('거짓믿음 (Misbelief)', cur.misbelief),
      row('진짜 욕망 (Want)', cur.want),
      row('진짜 필요 (Need)', cur.need),
      row('깨달음 (Epiphany)', cur.epiphany),
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인물',
      title: `${person(cur.name)} — 내면 아크`,
      bodyHtml,
    })
    flashNote(id ? '프로젝트 ‘자료 › 인물’에 내면 아크 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const copySummary = () => {
    const text = [
      `[${person(cur.name)} — 내면 아크]`,
      paragraph,
      '',
      `· 상처: ${cur.wound || '-'}`,
      `· 거짓믿음: ${cur.misbelief || '-'}`,
      `· 욕망: ${cur.want || '-'}`,
      `· 필요: ${cur.need || '-'}`,
      `· 깨달음: ${cur.epiphany || '-'}`,
    ].join('\n')
    copy(text, 'summary')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3, display: 'block' }
  const fieldHint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 5, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const para: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.85, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.65 }
  const tag: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🎭" /> 내면 아크 설계</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>상처 · 거짓믿음 · 욕망 · 필요 · 깨달음 → 내적 변화</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>작품 속 내면 아크 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                    거짓믿음: {ex.misbelief} · 욕망 ↔ 필요: {ex.want} ↔ {ex.need}
                  </div>
                </div>
              ))}
            </div>
            <div className="license-note" style={{ marginTop: 8 }}>예시는 퍼블릭 도메인/널리 알려진 고전 서사 모델을 학습용으로 요약한 것입니다.</div>
          </div>
        )}

        {/* 라이브러리 인물에서 시작 */}
        {characters.length > 0 && (
          <div style={card}>
            <h4 style={sectionTitle}>라이브러리 인물에 아크 입히기 ({characters.length}명)</h4>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {characters.slice(0, 12).map((c) => (
                <button key={c.id} className="minibtn" onClick={() => fromCharacter(c)} title="이 인물 정보를 불러와 아크 설계 시작">
                  <Emoji e="👤" /> {c.name || '이름 없음'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입력 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '입력'}</h4>
            <span style={{ ...tag, marginLeft: 'auto' }}>{filled}/{total} 채움</span>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FIELDS.map((fl) => (
              <div key={fl.k}>
                <label style={fieldLabel}>{fl.label}</label>
                <span style={fieldHint}>{fl.hint}</span>
                {fl.multi ? (
                  <textarea
                    style={{ ...input, minHeight: 52, resize: 'vertical', lineHeight: 1.5 }}
                    value={cur[fl.k]}
                    onChange={(e) => setField(fl.k, e.target.value)}
                    placeholder={fl.ph}
                    maxLength={400}
                  />
                ) : (
                  <input
                    style={input}
                    value={cur[fl.k]}
                    onChange={(e) => setField(fl.k, e.target.value)}
                    placeholder={fl.ph}
                    maxLength={80}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 종합 결과 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>종합 — 내적 변화 한 문단</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(paragraph, 'para')}>{copied === 'para' ? '✓ 복사됨' : <><Emoji e="📋" /> 문단 복사</>}</button>
            <button className="minibtn" onClick={copySummary}>{copied === 'summary' ? '✓' : '⬇ 요약 복사'}</button>
          </div>
          <div style={para}>{paragraph}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾" /> 아크 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => setEditId(null)}>새 항목으로</button>}
          </div>

          {/* 연계 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연동:</span>
            <button className="linkbtn" onClick={toProjectCharacter} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 인물 카드로 보강 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
            <button className="linkbtn" onClick={toProjectText} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료 〈인물〉에 내면 아크 문서 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 아크 문서 추가</button>
            <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
            <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
          </div>
        </div>

        {/* 저장 목록 */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 내면 아크 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 내면 아크가 없습니다.<br />
              위 다섯 칸을 채우고 <b>아크 저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚" /> 작품 예시</b>로 시작해 보세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.name || '(이름 없음)'}</b>
                    {s.misbelief && <span style={tag} title="거짓믿음">{s.misbelief.length > 22 ? s.misbelief.slice(0, 22) + '…' : s.misbelief}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="이 문단 복사" onClick={() => copy(s.paragraph, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--muted)', wordBreak: 'keep-all' }}>
                    {s.paragraph.length > 140 ? s.paragraph.slice(0, 140) + '…' : s.paragraph}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          Story Genius 모델: <b>상처</b>가 <b>거짓믿음</b>을 심고, 인물은 그 거짓믿음 위에서 <b>욕망</b>을 좇지만 정말 필요한 것은 <b>진짜 필요</b>입니다.
          이야기는 <b>깨달음</b>으로 거짓믿음을 무너뜨려 인물을 변화시킵니다. 욕망과 필요가 또렷이 충돌할수록 내적 아크가 단단해집니다.
          입력·저장 목록은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
