// 스토리 스파인(픽사의 6단계 골격) — "옛날 옛적에 ___. 매일 ___. 그러던 어느 날 ___. 그 때문에 ___. 그 때문에 ___. 마침내 ___."
// 빈칸 6개를 채우면 한 문단으로 종합해 복사/저장하고, 막힐 때를 위한 작품 예시·무작위 시드 보조를 제공한다.
// 자급식: react 외 import 없음, 외부 네트워크 없음(전부 로컬). 모든 데이터는 localStorage 에 JSON 으로 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'story-spine', name: '스토리 스파인', icon: '🦴', group: '구상·정리', intro: '픽사의 6단계 골격으로 이야기의 뼈대를 한 문단에 세우세요', w: 600, h: 560 }

const LS_KEY = 'sry:tool:story-spine'

// 6개의 빈칸 — 픽사 스토리 스파인의 고정 도입어 + 채울 문구.
type SlotKey = 'onceUpon' | 'everyDay' | 'oneDay' | 'becauseOf1' | 'becauseOf2' | 'until'
interface Slots {
  onceUpon: string    // 옛날 옛적에 ___  (주인공·세계의 평범한 상태)
  everyDay: string    // 매일 ___        (반복되는 일상·균형)
  oneDay: string      // 그러던 어느 날 ___ (균형을 깨는 사건)
  becauseOf1: string  // 그 때문에 ___    (1차 연쇄 반응)
  becauseOf2: string  // 그 때문에 ___    (2차 연쇄 반응·고조)
  until: string       // 마침내 ___       (절정·해결)
}

interface SlotDef { key: SlotKey; lead: string; label: string; tip: string; ph: string }
const SLOTS: SlotDef[] = [
  { key: 'onceUpon', lead: '옛날 옛적에', label: '발단 — 평범한 세계', tip: '주인공과 그가 사는 안정된 일상을 소개합니다.', ph: '바닷가 마을에 사는 겁 많은 소녀가 있었다' },
  { key: 'everyDay', lead: '매일', label: '일상 — 반복되는 균형', tip: '주인공이 늘 하던 일·규칙적인 삶을 보여줍니다.', ph: '소녀는 등대에 올라 배들이 무사히 돌아오기를 빌었다' },
  { key: 'oneDay', lead: '그러던 어느 날', label: '계기 — 균형이 깨진다', tip: '일상을 흔드는 사건이 일어납니다(촉발 사건).', ph: '폭풍 속에서 낯선 난파선의 소년이 떠밀려 왔다' },
  { key: 'becauseOf1', lead: '그 때문에', label: '전개 1 — 첫 번째 연쇄', tip: '그 사건이 불러온 첫 행동·결과입니다.', ph: '소녀는 소년을 숨겨주기로 마음먹었다' },
  { key: 'becauseOf2', lead: '그 때문에', label: '전개 2 — 두 번째 연쇄', tip: '상황이 더 커지고 위험이 고조됩니다.', ph: '마을 사람들이 외지인을 찾아 나서기 시작했다' },
  { key: 'until', lead: '마침내', label: '절정 — 해결과 변화', tip: '갈등이 정점에 이르고 주인공이 변합니다.', ph: '소녀는 두려움을 이기고 등대 불을 밝혀 둘 다 구해냈다' },
]

const BLANK: Slots = { onceUpon: '', everyDay: '', oneDay: '', becauseOf1: '', becauseOf2: '', until: '' }

interface Saved extends Slots {
  id: string
  title: string
  paragraph: string
  createdAt: number
}

interface Example { title: string; slots: Slots }

// PD/공지 동화·고전 줄거리를 스파인 6칸으로 정리한 학습용 예시(저작권 안전: 퍼블릭 도메인 작품).
const EXAMPLES: Example[] = [
  {
    title: '《니모를 찾아서》식 골격',
    slots: {
      onceUpon: '바닷속 산호초에 사는 겁 많은 흰동가리 아빠 물고기가 있었다',
      everyDay: '아빠는 하나뿐인 아들을 위험에서 떼어놓으려 늘 곁을 맴돌았다',
      oneDay: '아들이 인간에게 붙잡혀 멀리 끌려갔다',
      becauseOf1: '아빠는 평생 떠나본 적 없는 바다로 아들을 찾아 나섰다',
      becauseOf2: '온갖 위험을 함께 넘으며 건망증 친구와 의지하게 되었다',
      until: '아빠는 두려움을 내려놓고 아들을 믿게 되었고, 둘은 다시 만났다',
    },
  },
  {
    title: '《신데렐라》',
    slots: {
      onceUpon: '계모와 두 언니에게 구박받는 착한 소녀가 있었다',
      everyDay: '소녀는 새벽부터 밤까지 집안일을 도맡아 했다',
      oneDay: '왕궁 무도회 초대장이 온 집에 날아들었다',
      becauseOf1: '요정 대모가 나타나 소녀를 무도회에 보내주었다',
      becauseOf2: '왕자와 사랑에 빠졌지만 자정의 마법이 풀려 유리 구두만 남기고 달아났다',
      until: '왕자가 구두의 주인을 찾아내어 소녀와 맺어졌다',
    },
  },
  {
    title: '《어린 왕자》',
    slots: {
      onceUpon: '작은 별 B-612에 사는 어린 왕자가 있었다',
      everyDay: '왕자는 한 송이 장미를 정성껏 돌보며 화산을 청소했다',
      oneDay: '장미와 다툰 뒤 왕자는 별을 떠나 여행길에 올랐다',
      becauseOf1: '여러 별의 어른들을 만나며 그들의 이상함을 깨달았다',
      becauseOf2: '지구에서 여우를 길들이며 관계의 의미를 배웠다',
      until: '왕자는 가장 소중한 것은 눈에 보이지 않음을 깨닫고 자기 별로 돌아갔다',
    },
  },
  {
    title: '《오즈의 마법사》',
    slots: {
      onceUpon: '캔자스 농장에 사는 소녀 도로시가 있었다',
      everyDay: '도로시는 강아지 토토와 평범한 시골 생활을 했다',
      oneDay: '회오리바람이 집째로 도로시를 낯선 오즈의 나라로 데려갔다',
      becauseOf1: '집으로 돌아가려 마법사를 찾아 노란 벽돌길을 떠났다',
      becauseOf2: '허수아비·양철 나무꾼·사자와 함께 마녀의 위협을 헤쳐 나갔다',
      until: '도로시는 돌아갈 힘이 처음부터 자기 안에 있었음을 깨닫고 집으로 향했다',
    },
  },
]

// 무작위 시드 보조 — 막힌 칸을 채울 마중물(완성 문장이 아니라 출발용 자극).
const SEEDS: Record<SlotKey, string[]> = {
  onceUpon: [
    '먼 변경의 작은 마을에 사는 평범한 견습공이 있었다',
    '시간이 멈춘 듯한 도서관을 지키는 늙은 사서가 있었다',
    '하늘을 나는 배 위에서 태어난 소년이 있었다',
    '아무도 기억하지 못하는 신을 모시는 마지막 사제가 있었다',
    '낮에는 평범한 회사원, 밤에는 거리의 음악가인 여자가 있었다',
  ],
  everyDay: [
    '같은 길을 걷고 같은 인사를 나누며 하루를 보냈다',
    '남몰래 작은 소망 하나를 마음에 품고 살았다',
    '누구도 깨뜨리지 않는 오래된 규칙을 지켰다',
    '한 가지 두려움을 피하려 늘 같은 선택을 했다',
    '곁에 있는 소중한 존재를 당연하게 여겼다',
  ],
  oneDay: [
    '잊혔던 편지 한 통이 도착했다',
    '낯선 이방인이 마을 문을 두드렸다',
    '오래 지켜온 규칙이 처음으로 깨졌다',
    '하늘에서 본 적 없는 빛이 떨어졌다',
    '믿었던 사람의 비밀이 드러났다',
  ],
  becauseOf1: [
    '주인공은 처음으로 익숙한 세계를 벗어났다',
    '돌이킬 수 없는 약속을 하고 말았다',
    '숨겨야 할 것을 떠안게 되었다',
    '뜻밖의 동료(혹은 적)를 만났다',
    '잃어버린 것을 되찾기로 결심했다',
  ],
  becauseOf2: [
    '위험은 더 가까이, 더 크게 다가왔다',
    '믿었던 계획이 어긋나기 시작했다',
    '지켜야 할 것과 원하는 것이 충돌했다',
    '동료와의 사이에 균열이 생겼다',
    '진짜 적의 정체가 드러났다',
  ],
  until: [
    '주인공은 가장 두려워하던 선택을 끝내 해냈다',
    '잃은 것을 통해 더 큰 것을 얻었다',
    '맞서 싸운 끝에 자신과 화해했다',
    '세계는 다시 균형을 찾았고, 주인공은 더는 예전 같지 않았다',
    '진실을 받아들이고 새로운 일상으로 돌아왔다',
  ],
}

function loadState(): { cur: Slots; saved: Saved[]; title: string } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: { ...BLANK }, saved: [], title: '' }
    const p = JSON.parse(raw)
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const cur: Slots = {
      onceUpon: str(p?.cur?.onceUpon),
      everyDay: str(p?.cur?.everyDay),
      oneDay: str(p?.cur?.oneDay),
      becauseOf1: str(p?.cur?.becauseOf1),
      becauseOf2: str(p?.cur?.becauseOf2),
      until: str(p?.cur?.until),
    }
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: Partial<Saved>) => ({
            id: String(x.id || Date.now() + '' + Math.random()),
            title: str(x.title),
            onceUpon: str(x.onceUpon),
            everyDay: str(x.everyDay),
            oneDay: str(x.oneDay),
            becauseOf1: str(x.becauseOf1),
            becauseOf2: str(x.becauseOf2),
            until: str(x.until),
            paragraph: str(x.paragraph),
            createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
          }))
      : []
    return { cur, saved, title: str(p?.title) }
  } catch {
    return { cur: { ...BLANK }, saved: [], title: '' }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 끝 구두점 정돈 — 칸 문구를 문장처럼 잇기 위해 마침표 중복/누락을 정리.
function tidy(s: string): string {
  const t = (s || '').trim()
  if (!t) return ''
  return /[.?!…」』”)]$/.test(t) ? t : t + '.'
}

// 6칸 → 한 문단. 빈 칸은 자리표시자로 대체해 항상 읽히는 골격을 만든다.
function buildParagraph(s: Slots, withPlaceholder = true): string {
  const fill = (key: SlotKey) => {
    const def = SLOTS.find((d) => d.key === key)!
    const v = (s[key] || '').trim()
    if (v) return v
    return withPlaceholder ? `〔${def.label.split('—')[0].trim()}〕` : ''
  }
  return SLOTS
    .map((d) => {
      const body = fill(d.key)
      if (!withPlaceholder && !body) return ''
      return `${d.lead} ${tidy(body)}`
    })
    .filter(Boolean)
    .join(' ')
}

export default function StorySpine() {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Slots>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState(init.current.title)
  const [editId, setEditId] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved, title }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, saved, title])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const paragraph = buildParagraph(cur, true)
  const cleanParagraph = buildParagraph(cur, false)
  const filledCount = SLOTS.filter((d) => (cur[d.key] || '').trim()).length
  const hasInput = filledCount > 0

  const setSlot = (k: SlotKey, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const copy = async (text: string, tag: string) => {
    if (!text.trim()) { flashNote('복사할 내용이 없습니다.'); return }
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  // 한 칸에 무작위 시드 채우기(비어 있을 때만 권장 — 기존 입력을 덮지 않게 확인).
  const seedSlot = (k: SlotKey) => {
    const pool = SEEDS[k]
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if ((cur[k] || '').trim()) {
      flashNote('이미 입력이 있어 시드를 칸 위 힌트로만 보여줍니다.')
    }
    setSlot(k, pick)
  }

  // 비어 있는 모든 칸에 시드 채우기.
  const seedEmpty = () => {
    setCur((p) => {
      const n = { ...p }
      let changed = 0
      SLOTS.forEach((d) => {
        if (!(n[d.key] || '').trim()) {
          const pool = SEEDS[d.key]
          n[d.key] = pool[Math.floor(Math.random() * pool.length)]
          changed++
        }
      })
      if (!changed) flashNote('빈 칸이 없습니다. 새 시드를 원하면 칸을 비우고 다시 누르세요.')
      else flashNote(`빈 칸 ${changed}개를 무작위 시드로 채웠습니다. 자유롭게 고쳐 쓰세요.`)
      return n
    })
  }

  const applyExample = (ex: Example) => {
    setCur({ ...ex.slots })
    setShowEx(false)
    setEditId(null)
    flashNote(`${ex.title} 예시를 입력에 채웠습니다.`)
  }

  const clearForm = () => {
    setCur({ ...BLANK })
    setEditId(null)
    setTitle('')
  }

  const saveCurrent = () => {
    if (!hasInput) { flashNote('먼저 칸을 채워 주세요.'); return }
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim(),
      ...cur,
      paragraph: cleanParagraph || paragraph,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('스토리 스파인을 저장했습니다.')
    }
    setEditId(null)
  }

  const loadSaved = (s: Saved) => {
    setCur({ onceUpon: s.onceUpon, everyDay: s.everyDay, oneDay: s.oneDay, becauseOf1: s.becauseOf1, becauseOf2: s.becauseOf2, until: s.until })
    setTitle(s.title)
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
  }

  const move = (id: string, dir: -1 | 1) => {
    setSaved((p) => {
      const i = p.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const exportAll = () => {
    if (!saved.length) { flashNote('내보낼 저장 항목이 없습니다.'); return }
    const blocks = saved.map((s, i) => {
      const dt = new Date(s.createdAt)
      const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      return `[${i + 1}] ${s.title || '(제목 없음)'}  (${d})\n${s.paragraph}`
    })
    copy(`# 스토리 스파인 모음 (${saved.length}건)\n\n${blocks.join('\n\n')}`, 'export')
    flashNote('저장 목록을 텍스트로 복사했습니다.')
  }

  // 6칸 + 완성 문단을 HTML 본문으로 묶어 프로젝트 바인더(자료 〈구조〉)에 문서로 추가.
  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const addToProjectDoc = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!hasInput) { flashNote('먼저 칸을 채워 주세요.'); return }
    const rows = SLOTS.map((d) => {
      const v = (cur[d.key] || '').trim()
      return `<p><b>${escapeHtml(d.lead)}</b> ${escapeHtml(v || '〔미입력〕')}</p>`
    }).join('')
    const bodyHtml = [
      `<p style="font-size:14.5px;line-height:1.8;">${escapeHtml(cleanParagraph || paragraph)}</p>`,
      `<hr/>`,
      `<p style="color:#888;font-size:12px;">픽사 스토리 스파인 6단계</p>`,
      rows,
    ].join('')
    const docTitle = title.trim() || '스토리 스파인'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: docTitle,
      bodyHtml,
      synopsis: cleanParagraph || paragraph,
    })
    flashNote(id ? '프로젝트 자료 〈구조〉 폴더에 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const lead: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }
  const para: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.85, color: 'var(--text)', wordBreak: 'keep-all' }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const progressBar: React.CSSProperties = { height: 6, borderRadius: 999, background: 'var(--chrome-2)', overflow: 'hidden', flex: 1, minWidth: 80 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🦴"/> 스토리 스파인</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>픽사의 6단계 골격</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="minibtn" onClick={seedEmpty} title="빈 칸을 무작위 시드로 채우기"><Emoji e="🎲"/> 시드</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚"/> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>작품 예시 — 눌러 6칸에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{ex.title}</b>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--muted)', wordBreak: 'keep-all' }}>
                    {buildParagraph(ex.slots, false)}
                  </div>
                </div>
              ))}
            </div>
            <div className="license-note" style={{ ...hint, marginTop: 10, fontSize: 11 }}>
              예시는 퍼블릭 도메인 동화/고전 줄거리를 스파인 6칸으로 재구성한 학습용입니다.
            </div>
          </div>
        )}

        {/* 입력 6칸 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️"/> 수정 중</> : '여섯 칸 채우기'}</h4>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
              <div style={progressBar}>
                <div style={{ height: '100%', width: `${(filledCount / SLOTS.length) * 100}%`, background: 'var(--accent)', transition: 'width .2s' }} />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{filledCount}/6</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SLOTS.map((d) => (
              <div key={d.key}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={lead}>{d.lead} ___</span>
                  <span style={{ ...fieldLabel, margin: 0 }}>{d.label}</span>
                  <button
                    style={{ ...iconBtn, marginLeft: 'auto', fontSize: 11.5 }}
                    title="이 칸 무작위 시드"
                    onClick={() => seedSlot(d.key)}
                  ><Emoji e="🎲"/></button>
                </div>
                <input
                  style={input}
                  value={cur[d.key]}
                  onChange={(e) => setSlot(d.key, e.target.value)}
                  placeholder={d.ph}
                  maxLength={200}
                />
                <div style={{ ...hint, marginTop: 3, fontSize: 11 }}>{d.tip}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId && !title}>입력 비우기</button>
          </div>
        </div>

        {/* 종합 문단 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>완성 문단</h4>
            <button
              className="minibtn"
              style={{ marginLeft: 'auto' }}
              onClick={() => copy(cleanParagraph || paragraph, 'main')}
              disabled={!hasInput}
            >{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
          </div>
          {hasInput ? (
            <div style={para}>{paragraph}</div>
          ) : (
            <div style={empty}>
              여섯 칸을 채우면 여기에 한 문단으로 이어집니다.<br />
              막막하다면 <b><Emoji e="🎲"/> 시드</b>로 마중물을 받거나 <b><Emoji e="📚"/> 작품 예시</b>로 시작해 보세요.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input
              style={{ ...input, flex: 1, minWidth: 160 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="저장 제목 (예: 장편 1부 골격)"
              maxLength={60}
            />
            <button className="btn-primary" onClick={saveCurrent} disabled={!hasInput}>{editId ? '수정 저장' : <><Emoji e="💾"/> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계: 완성 문단을 실제 프로젝트 바인더(자료 〈구조〉)에 문서로 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addToProjectDoc}
              disabled={!hasProjectBridge() || !hasInput}
              title={hasProjectBridge() ? '완성 문단과 6단계를 프로젝트 자료 〈구조〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>저장한 스파인 · {saved.length}건</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={exportAll} disabled={!saved.length}>{copied === 'export' ? '✓ 복사됨' : '⬇ 전체 복사'}</button>
          </div>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 스파인이 없습니다.<br />
              위에서 칸을 채우고 <b>저장</b>을 누르면 여기에 모입니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => move(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => move(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="이 항목 복사" onClick={() => copy(s.paragraph, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️"/></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, wordBreak: 'keep-all', color: 'var(--text)' }}>{s.paragraph}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          스토리 스파인은 픽사가 정리한 6단계 뼈대입니다. “매일”의 균형을 “어느 날”이 깨고, “그 때문에”의 연쇄로 사건이 굴러가다 “마침내” 변화에 이릅니다.
          빈칸은 완성 문장이 아니라 한 줄 요약으로 채우는 것이 좋습니다. 입력·저장은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
