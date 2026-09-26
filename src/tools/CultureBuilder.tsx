// 문화 설계기 — 작품 속 한 문화·민족·집단의 가치관/금기/예절/통과의례/축제/복식·음식/가족 구조/명예관 등을
//   섹션별로 입력하고, 각 섹션마다 발상을 돕는 질문 가이드를 제공한다. 여러 문화를 저장·수정·삭제·순서변경·검색.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 불필요). localStorage 'sry:tool:culture-builder' 자동 저장/복원.
// 연계(linkbus): 설계한 문화를 실제 프로젝트 자료('research')의 '문화' 폴더에 설정 문서로 추가한다.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'culture-builder', name: '문화 설계기', icon: '🏺', group: '구상·정리', intro: '가치관·금기·예절·의례·축제·복식·음식·가족·명예관으로 한 문화를 설계하세요', w: 720, h: 620 }

const LS_KEY = 'sry:tool:culture-builder'

// ── 섹션 정의: 각 섹션은 한 줄 입력이 아니라 자유 서술(textarea) + 발상 질문 가이드 ──
interface SectionDef {
  key: string
  label: string
  icon: string
  ph: string          // placeholder
  questions: string[] // 질문 가이드(클릭 시 텍스트에 덧붙일 수 있음)
}

const SECTIONS: SectionDef[] = [
  {
    key: 'values', label: '가치관·세계관', icon: '🌟',
    ph: '이 문화가 가장 소중히 여기는 것, 세상을 바라보는 방식, 선과 악의 기준…',
    questions: [
      '이 문화가 무엇보다 우선시하는 가치는? (명예·자유·공동체·부·지식·신앙 등)',
      '세상은 어떻게 시작되었다고 믿는가? 죽음 뒤엔 무엇이 있다고 보는가?',
      '개인과 공동체 중 어느 쪽을 더 중시하는가?',
      '시간을 어떻게 인식하는가? (순환적/직선적, 과거 지향/미래 지향)',
      '무엇을 미덕으로, 무엇을 악덕으로 여기는가?',
    ],
  },
  {
    key: 'taboo', label: '금기·터부', icon: '🚫',
    ph: '절대 해서는 안 되는 일, 입에 올리면 안 되는 것, 어기면 받는 벌…',
    questions: [
      '가장 큰 금기는 무엇이며, 어기면 어떤 일이 벌어지는가?',
      '먹어선 안 되는 음식, 만져선 안 되는 것이 있는가?',
      '말로 꺼내선 안 되는 이름·주제가 있는가?',
      '왜 이 금기가 생겼는가? (역사적 사건·신화·실용적 이유)',
      '금기를 어긴 자는 어떻게 취급되는가? (추방·정화의식·죽음)',
    ],
  },
  {
    key: 'etiquette', label: '예절·관습', icon: '🤝',
    ph: '인사법, 손님 접대, 말하는 방식, 윗사람 대하는 법, 일상의 예의…',
    questions: [
      '처음 만난 사람과 어떻게 인사하는가? (몸짓·말·선물)',
      '손님을 어떻게 맞이하고 대접하는가?',
      '윗사람·아랫사람을 대하는 방식이 다른가? 호칭은?',
      '하면 무례한 행동, 칭찬받는 행동은?',
      '식사·대화·거래에서 지켜야 할 규칙은?',
    ],
  },
  {
    key: 'rites', label: '통과의례', icon: '🕯️',
    ph: '탄생·성년·결혼·죽음 등 삶의 단계를 넘을 때 치르는 의식…',
    questions: [
      '아이가 태어나면 무엇을 하는가? (이름·세례·표식)',
      '어른이 되었음을 어떻게 인정받는가? (시련·시험·문신)',
      '결혼은 어떻게 이루어지는가? (중매·구애·서약·지참금)',
      '죽음을 어떻게 다루는가? (매장·화장·풍장·애도 기간)',
      '의례를 치르지 못한 자는 어떤 위치에 놓이는가?',
    ],
  },
  {
    key: 'festival', label: '축제·기념일', icon: '🎉',
    ph: '명절, 제의, 계절 행사, 무엇을 기리고 어떻게 즐기는가…',
    questions: [
      '가장 큰 축제는 무엇을 기념하는가?',
      '계절·천문·수확과 연결된 행사가 있는가?',
      '축제에서 무엇을 하는가? (춤·노래·가면·불·단식·향연)',
      '일상에서 금지된 것이 축제 때 허용되는가?',
      '누가 축제를 주관하며, 참여하지 않으면 어떻게 되는가?',
    ],
  },
  {
    key: 'dress', label: '복식·외양', icon: '👘',
    ph: '입는 옷, 장신구, 머리·문신·화장, 신분·역할에 따른 차이…',
    questions: [
      '평상복과 예복은 어떻게 다른가? 재료·색·문양은?',
      '신분·나이·성별·직업에 따라 옷차림이 다른가?',
      '몸을 어떻게 꾸미는가? (문신·흉터·장신구·머리모양)',
      '특정 색·옷차림이 금지되거나 강제되는가?',
      '외양만 보고 그 사람에 대해 무엇을 알 수 있는가?',
    ],
  },
  {
    key: 'food', label: '음식·식문화', icon: '🍲',
    ph: '주식, 별미, 금기 음식, 먹는 방식, 함께/따로 먹는 문화…',
    questions: [
      '무엇을 주식으로 삼는가? 어떻게 구하고 조리하는가?',
      '특별한 날에만 먹는 음식이 있는가?',
      '식사 예절은? (함께/따로, 손/도구, 좌석 순서)',
      '술·차·향신료 등 기호품의 위치는?',
      '음식을 나누는 행위에 어떤 의미가 담기는가?',
    ],
  },
  {
    key: 'family', label: '가족·사회 구조', icon: '👪',
    ph: '가족 형태, 혈통·상속, 성역할, 계급, 권력은 누구에게…',
    questions: [
      '가족은 어떤 형태인가? (대가족·핵가족·씨족·공동체)',
      '혈통과 상속은 어떻게 이어지는가? (부계·모계·양계)',
      '성별·나이에 따른 역할 분담은?',
      '계급·신분이 있는가? 이동은 가능한가?',
      '권력은 누구에게 있으며 어떻게 정당화되는가?',
    ],
  },
  {
    key: 'honor', label: '명예·수치관', icon: '⚔️',
    ph: '무엇을 자랑스러워하고 무엇을 수치로 여기는가, 명예 회복법…',
    questions: [
      '무엇이 명예이고 무엇이 수치인가?',
      '명예가 훼손되면 어떻게 회복하는가? (결투·복수·속죄)',
      '약속·맹세·빚은 얼마나 무겁게 다루는가?',
      '집단의 명예와 개인의 명예 중 무엇이 우선인가?',
      '겁쟁이·배신자·거짓말쟁이는 어떻게 취급되는가?',
    ],
  },
  {
    key: 'belief', label: '신앙·세계관 보충', icon: '🛐',
    ph: '믿는 대상, 종교 조직, 미신, 점·예언, 초자연에 대한 태도…',
    questions: [
      '무엇을(누구를) 숭배하는가? 신·조상·자연·추상 개념?',
      '사제·무당 같은 중재자가 있는가? 권력은?',
      '일상의 미신·금기·길흉 판단법은?',
      '죽음·운명·초자연을 어떻게 받아들이는가?',
      '다른 신앙을 가진 자를 어떻게 대하는가?',
    ],
  },
  {
    key: 'misc', label: '기타·자유 메모', icon: '🗒️',
    ph: '언어·예술·기술·법·경제 등 위에 담기지 않은 무엇이든…',
    questions: [
      '고유한 언어·문자·예술 형식이 있는가?',
      '기술 수준은? 무엇을 만들고 무엇을 못 만드는가?',
      '법과 처벌은 어떻게 이루어지는가?',
      '돈·교역·재산 개념은 어떠한가?',
      '이웃 문화와는 어떤 관계인가? (교류·적대·고립)',
    ],
  },
]

interface Culture {
  id: string
  name: string
  summary: string                  // 한 줄 소개
  fields: Record<string, string>   // 섹션 key → 서술
  createdAt: number
  updatedAt: number
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function makeCulture(name = ''): Culture {
  return { id: newId(), name, summary: '', fields: {}, createdAt: Date.now(), updatedAt: Date.now() }
}

// 채워진 섹션 수(이름·요약 제외).
function filledCount(c: Culture): number {
  return SECTIONS.reduce((n, s) => n + ((c.fields[s.key] || '').trim() ? 1 : 0), 0)
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태로 graceful 처리. 누락 필드 보강.
function loadState(): { list: Culture[]; openId: string | null } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { list: [], openId: null }
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.list) ? p.list : Array.isArray(p) ? p : []
    const list: Culture[] = arr
      .filter((x: any) => x && typeof x === 'object')
      .map((x: any) => {
        const fields: Record<string, string> = {}
        if (x.fields && typeof x.fields === 'object') {
          for (const s of SECTIONS) {
            if (typeof x.fields[s.key] === 'string') fields[s.key] = x.fields[s.key]
          }
        }
        return {
          id: String(x.id || newId()),
          name: typeof x.name === 'string' ? x.name : '',
          summary: typeof x.summary === 'string' ? x.summary : '',
          fields,
          createdAt: Number(x.createdAt) || Date.now(),
          updatedAt: Number(x.updatedAt) || Date.now(),
        } as Culture
      })
    const openId = typeof p?.openId === 'string' && list.some((c) => c.id === p.openId) ? p.openId : (list[0]?.id ?? null)
    return { list, openId }
  } catch {
    return { list: [], openId: null }
  }
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 텍스트 내보내기(클립보드용).
function cultureToText(c: Culture): string {
  const L: string[] = []
  L.push(`# ${c.name || '(이름 없는 문화)'}`)
  if (c.summary.trim()) L.push(c.summary.trim())
  for (const s of SECTIONS) {
    const v = (c.fields[s.key] || '').trim()
    if (v) { L.push('', `## ${s.icon} ${s.label}`, v) }
  }
  return L.join('\n')
}

// 프로젝트 문서 본문(HTML) 생성.
function cultureBodyHtml(c: Culture): string {
  const parts: string[] = []
  if (c.summary.trim()) parts.push(`<p><i>${escHtml(c.summary.trim())}</i></p>`)
  for (const s of SECTIONS) {
    const v = (c.fields[s.key] || '').trim()
    if (!v) continue
    parts.push(`<p><b>${escHtml(s.icon + ' ' + s.label)}</b><br>${escHtml(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
  }
  if (!parts.length) parts.push('<p><span style="color:#888">(내용 없음)</span></p>')
  return parts.join('')
}

const fmtDate = (ms: number): string => {
  try {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '' }
}

export default function CultureBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [list, setList] = useState<Culture[]>(init.current.list)
  const [openId, setOpenId] = useState<string | null>(init.current.openId)
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [openGuide, setOpenGuide] = useState<string | null>(null) // 질문 가이드가 펼쳐진 섹션 key
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  // 사용자 정의 항목(자율 추가) + 고정 '기타' 자유 입력. 라벨(항목 정의)은 유지, 값은 새 문화/재생성 시 비운다.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const mounted = useRef(true)
  const payloadDone = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ list, openId })) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [list, openId])

  // 복사·안내 메시지 자동 소거.
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1700)
    return () => window.clearTimeout(t)
  }, [copied])

  // payload.name(다른 도구가 문화 이름과 함께 열어준 경우) — 1회만 새 문화 생성.
  useEffect(() => {
    if (payloadDone.current) return
    const nm = payload && typeof payload.name === 'string' ? (payload.name as string).trim() : ''
    if (!nm) return
    payloadDone.current = true
    const c = makeCulture(nm)
    setList((prev) => [...prev, c])
    setOpenId(c.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const opened = openId ? list.find((c) => c.id === openId) || null : null

  // 선택 문화가 사라지면(삭제 등) 안전 보정.
  useEffect(() => {
    if (openId && !list.some((c) => c.id === openId)) {
      setOpenId(list.length ? list[0].id : null)
    }
  }, [openId, list])

  const addCulture = () => {
    const c = makeCulture()
    setList((prev) => [...prev, c])
    setOpenId(c.id)
    setQuery('')
    setConfirmDel(null)
    setOpenGuide(null)
    // 새 문화(=재생성): 사용자 정의 항목의 '값'은 비우되 '항목(이름)'은 유지. '기타'도 비운다.
    setCustom((prev) => prev.map((it) => ({ ...it, value: '' })))
    setEtc('')
  }

  // ＋ 항목 추가: 라벨을 입력받아 빈 값의 사용자 정의 항목을 만든다(무작위 생성하지 않음).
  const addCustomField = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목의 이름을 적어 주세요 (예: 무기·교통·언어 표현 등)') || '').trim() } catch {}
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => {
    setCustom((prev) => prev.map((it) => (it.id === id ? { ...it, value } : it)))
  }
  const removeCustomField = (id: string) => {
    setCustom((prev) => prev.filter((it) => it.id !== id))
  }

  const patch = (id: string, fields: Partial<Culture>) => {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields, updatedAt: Date.now() } : c)))
  }

  const patchField = (id: string, key: string, value: string) => {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, fields: { ...c.fields, [key]: value }, updatedAt: Date.now() } : c)))
  }

  const remove = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
  }

  const move = (id: string, dir: -1 | 1) => {
    setList((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // 질문을 해당 섹션 텍스트 끝에 "Q) …" 형태로 덧붙여 답을 적게 한다.
  const appendQuestion = (key: string, q: string) => {
    if (!opened) return
    const cur = opened.fields[key] || ''
    const sep = cur.trim() ? (cur.endsWith('\n') ? '' : '\n') : ''
    patchField(opened.id, key, cur + sep + `Q) ${q}\n→ `)
  }

  const copyText = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setCopied(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setCopied('복사 실패') }
  }

  // 사용자 정의 항목 + 기타를 텍스트로 — 비어 있지 않은 것만.
  const extrasToText = (): string => {
    const L: string[] = []
    for (const it of custom) {
      const v = (it.value || '').trim()
      if (it.label.trim() && v) L.push('', `## ${it.label.trim()}`, v)
    }
    if (etc.trim()) L.push('', '## 🗒️ 기타', etc.trim())
    return L.join('\n')
  }

  const exportAll = () => {
    if (!list.length) return
    copyText(list.map(cultureToText).join('\n\n' + '─'.repeat(28) + '\n\n'), `전체 ${list.length}개 문화를 복사했어요`)
  }

  // 프로젝트 연동 — 자료(research)/'문화' 폴더에 문화 설정 문서를 추가.
  const toProject = (c: Culture) => {
    if (!hasProjectBridge()) { if (mounted.current) setCopied('프로젝트에 연결되어 있지 않아요'); return }
    const name = (c.name || '').trim() || '이름 없는 문화'
    const meta: Record<string, string> = { '채운 항목': `${filledCount(c)}/${SECTIONS.length}` }
    if (c.summary.trim()) meta['소개'] = c.summary.trim().replace(/\s+/g, ' ').slice(0, 80)
    // 사용자 정의 항목(키 = 라벨 그대로, 값이 있을 때만)·기타(키 'etc', 값이 있을 때만)를 fields(meta)에 그대로 넘긴다 → 다른 도구에 동일 항목으로 나타난다.
    const extraHtml: string[] = []
    for (const it of custom) {
      const v = (it.value || '').trim()
      if (!it.label.trim() || !v) continue
      meta[it.label.trim()] = v.replace(/\s+/g, ' ').slice(0, 80)
      extraHtml.push(`<p><b>${escHtml(it.label.trim())}</b><br>${escHtml(v).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    if (etc.trim()) {
      meta['etc'] = etc.trim().replace(/\s+/g, ' ').slice(0, 80)
      extraHtml.push(`<p><b>${escHtml('🗒️ 기타')}</b><br>${escHtml(etc.trim()).replace(/\r\n|\r|\n/g, '<br>')}</p>`)
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '문화',
      title: `문화 — ${name}`,
      bodyHtml: cultureBodyHtml(c) + extraHtml.join(''),
      synopsis: c.summary.trim() || undefined,
      meta,
    })
    if (mounted.current) setCopied(id ? '프로젝트 자료(문화)에 문서를 추가했어요' : '프로젝트 추가에 실패했어요')
  }

  const filtered = query.trim()
    ? list.filter((c) => {
        const q = query.trim().toLowerCase()
        if ((c.name || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q)) return true
        return SECTIONS.some((s) => (c.fields[s.key] || '').toLowerCase().includes(q))
      })
    : list

  const linked = hasProjectBridge()

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', fontSize: 14 }
  const header: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const sideHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const listArea: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const mainScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 72, lineHeight: 1.6, fontFamily: 'inherit' }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', lineHeight: 1.7, padding: 24, gap: 12 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '3px 7px', borderRadius: 6 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 18 }}><Emoji e="🏺"/></span>
        <strong style={{ fontSize: 15 }}>문화 설계기</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length}개 문화</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={exportAll} disabled={!list.length} title="모든 문화를 텍스트로 복사"><Emoji e="📋"/> 전체 내보내기</button>
        <button className="btn-primary" onClick={addCulture}>＋ 새 문화</button>
      </div>

      {note && <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 사이드바: 문화 목록 + 검색 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <button className="btn-primary" onClick={addCulture} style={{ width: '100%' }}>＋ 새 문화</button>
            <input style={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 이름·내용 검색" aria-label="문화 검색" />
          </div>

          {list.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>
              아직 문화가 없어요.<br />위 <b>＋ 새 문화</b>로<br />첫 문화를 설계해 보세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>검색 결과가 없어요.</div>
          ) : (
            <div style={listArea}>
              {filtered.map((c) => {
                const realIdx = list.findIndex((x) => x.id === c.id)
                const active = c.id === openId
                const cnt = filledCount(c)
                return (
                  <div
                    key={c.id}
                    onClick={() => { setOpenId(c.id); setConfirmDel(null); setOpenGuide(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.name ? 'var(--text)' : 'var(--muted)' }}>
                      <Emoji e="🏺"/> {c.name || '(이름 없는 문화)'}
                    </span>
                    {c.summary.trim() && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary.trim()}</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: cnt === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>항목 {cnt}/{SECTIONS.length}</span>
                      <span style={{ flex: 1 }} />
                      <button style={tinyBtn} title="위로" disabled={!!query.trim() || realIdx <= 0} onClick={(e) => { e.stopPropagation(); move(c.id, -1) }}>↑</button>
                      <button style={tinyBtn} title="아래로" disabled={!!query.trim() || realIdx >= list.length - 1} onClick={(e) => { e.stopPropagation(); move(c.id, 1) }}>↓</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!!query.trim() && filtered.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색 중에는 순서 이동이 잠깁니다.</div>
          )}
        </div>

        {/* 메인: 선택 문화 편집 또는 안내 */}
        <div style={main}>
          {!opened ? (
            <div style={empty}>
              <div style={{ fontSize: 34 }}><Emoji e="🏺"/></div>
              <div>왼쪽에서 문화를 고르거나<br /><b>＋ 새 문화</b>를 추가해 편집하세요.</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                가치관·금기·예절·통과의례·축제·복식·음식·가족·명예관까지<br />
                섹션별 <b>질문 가이드</b>를 따라 채우면 한 문화가 또렷해집니다.
              </div>
            </div>
          ) : (
            <div style={mainScroll}>
              {/* 헤더: 이름/요약/액션 */}
              <div style={panel}>
                <div>
                  <div style={label}>문화 이름</div>
                  <input style={input} value={opened.name} onChange={(e) => patch(opened.id, { name: e.target.value })} placeholder="예: 북방 설원의 사르카 부족" maxLength={80} aria-label="문화 이름" />
                </div>
                <div>
                  <div style={label}>한 줄 소개 (선택)</div>
                  <input style={input} value={opened.summary} onChange={(e) => patch(opened.id, { summary: e.target.value })} placeholder="이 문화를 한 문장으로… 예: 침묵을 미덕으로 여기는 유목 사냥꾼들" maxLength={140} aria-label="한 줄 소개" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: filledCount(opened) === SECTIONS.length ? 'var(--ok)' : 'var(--muted)' }}>
                    채운 항목 {filledCount(opened)}/{SECTIONS.length}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => copyText((cultureToText(opened) + extrasToText()).trimEnd(), '이 문화를 복사했어요')}><Emoji e="📋"/> 이 문화 복사</button>
                  <button
                    className="linkbtn"
                    onClick={() => toProject(opened)}
                    disabled={!linked}
                    title={linked ? '이 문화를 프로젝트 자료(문화 폴더)에 설정 문서로 추가' : '프로젝트에 연결되어 있지 않아요'}
                  ><Emoji e="📄"/> 프로젝트에 추가</button>
                  {confirmDel === opened.id ? (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--warn)' }}>삭제할까요?</span>
                      <button className="minibtn" onClick={() => setConfirmDel(null)}>취소</button>
                      <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => remove(opened.id)}>삭제 확정</button>
                    </>
                  ) : (
                    <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(opened.id)} title="이 문화 삭제"><Emoji e="🗑️"/> 삭제</button>
                  )}
                </div>
              </div>

              {/* 섹션별 입력 + 질문 가이드 */}
              {SECTIONS.map((s) => {
                const val = opened.fields[s.key] || ''
                const guideOpen = openGuide === s.key
                return (
                  <div key={s.key} style={panel}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={sectionTitle}><Emoji e={s.icon}/> {s.label}</span>
                      {val.trim() && <span style={{ fontSize: 11, color: 'var(--ok)' }}>✓</span>}
                      <span style={{ flex: 1 }} />
                      <button
                        style={{ ...tinyBtn, color: guideOpen ? 'var(--accent)' : 'var(--muted)', borderColor: guideOpen ? 'var(--accent)' : 'var(--border)' }}
                        onClick={() => setOpenGuide(guideOpen ? null : s.key)}
                        title="이 섹션을 채우는 데 도움이 되는 질문 보기"
                      ><Emoji e="💡"/> 질문 가이드 {guideOpen ? '▲' : '▼'}</button>
                    </div>

                    {guideOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 9, background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>질문을 누르면 아래 칸에 답할 자리가 추가됩니다.</div>
                        {s.questions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => appendQuestion(s.key, q)}
                            style={{ textAlign: 'left', border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.5, padding: '6px 9px', borderRadius: 7 }}
                            title="이 질문을 입력칸에 추가"
                          >＋ {q}</button>
                        ))}
                      </div>
                    )}

                    <textarea
                      style={area}
                      value={val}
                      onChange={(e) => patchField(opened.id, s.key, e.target.value)}
                      placeholder={s.ph}
                      aria-label={s.label}
                    />
                  </div>
                )
              })}

              {/* 사용자 정의 항목 — 직접 항목을 추가해 자유롭게 채운다(무작위 생성 없음). */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={sectionTitle}><Emoji e="➕"/> 사용자 정의 항목</span>
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={addCustomField} title="새 항목을 추가합니다">＋ 항목 추가</button>
                </div>
                {custom.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                    위 항목에 없는 무엇이든 <b>＋ 항목 추가</b>로 직접 만들어 채울 수 있어요.
                  </div>
                ) : (
                  custom.map((it) => (
                    <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ ...sectionTitle, fontSize: 12.5 }}>{it.label}</span>
                        <span style={{ flex: 1 }} />
                        <button style={tinyBtn} title="이 항목 삭제" onClick={() => removeCustomField(it.id)}>✕</button>
                      </div>
                      <textarea
                        style={area}
                        value={it.value}
                        onChange={(e) => setCustomValue(it.id, e.target.value)}
                        placeholder={`${it.label}에 대해 직접 적어 주세요…`}
                        aria-label={it.label}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* 고정 '기타' 자유 입력 — 항상 보임, 기본 비어 있음. */}
              <div style={panel}>
                <div style={sectionTitle}><Emoji e="🗒️"/> 기타</div>
                <textarea
                  style={{ ...area, minHeight: 100 }}
                  value={etc}
                  onChange={(e) => setEtc(e.target.value)}
                  placeholder="위 항목에 담기지 않은 내용을 자유롭게 적어 주세요."
                  aria-label="기타"
                />
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
                모든 변경은 이 브라우저에 자동 저장됩니다. 마지막 수정: {fmtDate(opened.updatedAt)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
