// 중심 질문(드라마틱 퀘스천) 추적기 — 작품의 중심 극적 질문과 막/장별 하위 질문을 등록하고,
//  각 질문이 어디서 '제기(open)' · '고조(tension)' · '해소(resolved)'되는지 상태와 위치(막/장)로 추적한다.
//  · 중심 질문 1개(예: "그는 복수를 완수할 수 있을까?")를 정점에 두고, 하위 질문들을 막/장 타임라인에 배치.
//  · 각 질문에 '비트(beat)'를 여러 개 달아 어느 막/장에서 제기→고조→해소되는지 흐름을 기록.
//  · 미해소(열린) 질문, 너무 빨리 해소된 질문, 한 막에 질문이 몰린 곳을 자동 진단.
//  · 막/장 그리드 시각화(라이브러리 없이 직접): 행=질문, 열=막, 셀 색=그 막에서의 최종 상태.
//  · localStorage 자동 저장/복원. 텍스트 복사·.txt 내보내기. 프로젝트 자료('구조' 폴더) 추가.
// react/linkbus 외 import 없음. 외부 네트워크/미디어 불필요(전부 로컬). 자작 텍스트·색/이모지만 사용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = {
  id: 'dramatic-question-tracker',
  name: '중심 질문 추적기',
  icon: '❓',
  group: '구상·정리',
  intro: '작품의 중심 극적 질문과 막/장별 하위 질문이 어디서 제기·고조·해소되는지 추적하세요',
  w: 760,
  h: 700,
}

const LS_KEY = 'sry:tool:dramatic-question-tracker'

// ── 상태 정의 ─────────────────────────────────────────────────────────────────
type QStatus = 'open' | 'tension' | 'resolved'
interface StatusDef { key: QStatus; label: string; emoji: string; color: string; desc: string }
const STATUSES: StatusDef[] = [
  { key: 'open', label: '제기', emoji: '🟡', color: 'var(--accent)', desc: '질문이 던져졌고 답은 아직 미정' },
  { key: 'tension', label: '고조', emoji: '🟠', color: 'var(--warn)', desc: '판돈이 커지고 긴장이 높아짐' },
  { key: 'resolved', label: '해소', emoji: '🟢', color: 'var(--ok)', desc: '답이 드러나거나 질문이 닫힘' },
]
const STATUS_BY: Record<QStatus, StatusDef> = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<QStatus, StatusDef>

// ── 데이터 타입 ───────────────────────────────────────────────────────────────
// 비트: 한 질문이 특정 막/장에서 어떤 상태가 되는 지점.
interface Beat {
  id: string
  act: number        // 막 번호(1-base). 0 = 미지정
  scene: string      // 장/챕터 라벨(자유 텍스트, 선택)
  status: QStatus
  note: string       // 무슨 일이 일어나는지
}
interface Question {
  id: string
  text: string       // 질문 본문
  central: boolean   // 중심(드라마틱) 질문 여부
  tag: string        // 분류 라벨(예: 인물A, 주제, 미스터리 등)
  beats: Beat[]
}
interface Store {
  title: string
  actCount: number   // 막 개수(1~9)
  questions: Question[]
}

function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

function defaultStore(): Store {
  return { title: '', actCount: 3, questions: [] }
}

// localStorage 로드 — 미지원/차단/손상/구버전 graceful 처리.
function clampInt(v: unknown, lo: number, hi: number, def: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  if (!isFinite(n)) return def
  return Math.max(lo, Math.min(hi, Math.round(n)))
}
function asStatus(v: unknown): QStatus {
  return v === 'tension' || v === 'resolved' ? v : 'open'
}
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const actCount = clampInt(p.actCount, 1, 9, 3)
    const qsRaw = Array.isArray(p.questions) ? p.questions : []
    const questions: Question[] = qsRaw.map((q: Record<string, unknown>): Question => {
      const beatsRaw = Array.isArray(q.beats) ? q.beats : []
      const beats: Beat[] = beatsRaw.map((b: Record<string, unknown>): Beat => ({
        id: typeof b.id === 'string' ? b.id : uid('bt'),
        act: clampInt(b.act, 0, actCount, 0),
        scene: typeof b.scene === 'string' ? b.scene : '',
        status: asStatus(b.status),
        note: typeof b.note === 'string' ? b.note : '',
      }))
      return {
        id: typeof q.id === 'string' ? q.id : uid('q'),
        text: typeof q.text === 'string' ? q.text : '',
        central: !!q.central,
        tag: typeof q.tag === 'string' ? q.tag : '',
        beats,
      }
    })
    return {
      title: typeof p.title === 'string' ? p.title : '',
      actCount,
      questions,
    }
  } catch {
    return base
  }
}

// 질문의 '현재 상태' = 가장 진전된(해소>고조>제기) 비트 상태. 비트 없으면 미배치로 본다.
const RANK: Record<QStatus, number> = { open: 1, tension: 2, resolved: 3 }
function questionStatus(q: Question): QStatus | null {
  if (!q.beats.length) return null
  let best: QStatus = 'open'
  for (const b of q.beats) if (RANK[b.status] > RANK[best]) best = b.status
  return best
}
// 막 정렬용: 비트들을 (막, 상태순)으로 정렬.
function sortBeats(beats: Beat[]): Beat[] {
  return [...beats].sort((a, b) => (a.act - b.act) || (RANK[a.status] - RANK[b.status]))
}

export default function DramaticQuestionTracker({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [showHelp, setShowHelp] = useState(false)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [newQ, setNewQ] = useState('')
  const mounted = useRef(true)
  const applied = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 들어온 제목/질문 1회 반영(다른 도구·드롭에서 연계되어 열릴 때).
  useEffect(() => {
    if (applied.current || !payload) return
    applied.current = true
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (t) setStore((s) => (s.title ? s : { ...s, title: t.slice(0, 140) }))
    const q = typeof payload.question === 'string' ? payload.question.trim() : ''
    if (q) addQuestion(q, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  const flashMsg = (msg: string) => { setFlash(msg); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  // ── 질문 CRUD ───────────────────────────────────────────────────────────────
  const addQuestion = (text: string, central = false) => {
    const t = text.trim()
    if (!t) return
    setStore((s) => {
      // 중심 질문은 하나만: 새 중심 질문이면 기존 중심 해제.
      const central2 = central && !s.questions.some((q) => q.central)
      const q: Question = { id: uid('q'), text: t.slice(0, 240), central: central2, tag: '', beats: [] }
      return { ...s, questions: [...s.questions, q] }
    })
  }
  const addFromInput = () => { addQuestion(newQ, store.questions.length === 0); setNewQ('') }
  const patchQuestion = (id: string, patch: Partial<Question>) =>
    setStore((s) => ({ ...s, questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))
  const removeQuestion = (id: string) =>
    setStore((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== id) }))
  // 중심(드라마틱) 질문은 작품당 1개: 지정 시 나머지는 자동 해제.
  const toggleCentral = (id: string) =>
    setStore((s) => {
      const cur = s.questions.find((q) => q.id === id)
      const willBe = cur ? !cur.central : false
      return { ...s, questions: s.questions.map((q) => ({ ...q, central: q.id === id ? willBe : (willBe ? false : q.central) })) }
    })
  const moveQuestion = (id: string, dir: -1 | 1) =>
    setStore((s) => {
      const i = s.questions.findIndex((q) => q.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.questions.length) return s
      const arr = [...s.questions]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...s, questions: arr }
    })

  // ── 비트 CRUD ───────────────────────────────────────────────────────────────
  const addBeat = (qid: string) =>
    setStore((s) => ({
      ...s,
      questions: s.questions.map((q) => {
        if (q.id !== qid) return q
        // 기본 막/상태: 마지막 비트 다음 단계로 자연스럽게 제안.
        const last = sortBeats(q.beats)[q.beats.length - 1]
        const nextStatus: QStatus = !last ? 'open' : last.status === 'open' ? 'tension' : last.status === 'tension' ? 'resolved' : 'resolved'
        const nextAct = last ? Math.min(s.actCount, Math.max(1, last.act + (last.status === 'resolved' ? 0 : 1))) : 1
        const beat: Beat = { id: uid('bt'), act: nextAct, scene: '', status: nextStatus, note: '' }
        return { ...q, beats: [...q.beats, beat] }
      }),
    }))
  const patchBeat = (qid: string, bid: string, patch: Partial<Beat>) =>
    setStore((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id !== qid ? q : { ...q, beats: q.beats.map((b) => (b.id === bid ? { ...b, ...patch } : b)) })),
    }))
  const removeBeat = (qid: string, bid: string) =>
    setStore((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id !== qid ? q : { ...q, beats: q.beats.filter((b) => b.id !== bid) })),
    }))

  // ── 막 개수 변경 ──────────────────────────────────────────────────────────────
  const setActCount = (n: number) =>
    setStore((s) => {
      const ac = clampInt(n, 1, 9, s.actCount)
      // 막 축소 시, 범위를 넘는 비트 막을 새 최대값으로 당김.
      const questions = s.questions.map((q) => ({ ...q, beats: q.beats.map((b) => ({ ...b, act: b.act > ac ? ac : b.act })) }))
      return { ...s, actCount: ac, questions }
    })

  // ── 진단 ─────────────────────────────────────────────────────────────────────
  const acts = Array.from({ length: store.actCount }, (_, i) => i + 1)
  const central = store.questions.find((q) => q.central) || null
  const issues: { kind: 'warn' | 'info' | 'ok'; text: string }[] = (() => {
    const out: { kind: 'warn' | 'info' | 'ok'; text: string }[] = []
    const qs = store.questions
    if (!qs.length) return out
    if (!central) out.push({ kind: 'warn', text: '중심(드라마틱) 질문이 지정되지 않았어요. 작품을 끌고 갈 단 하나의 질문을 ★로 표시하세요.' })
    // 미해소(열린) 질문
    const unresolved = qs.filter((q) => questionStatus(q) !== 'resolved')
    const unplaced = qs.filter((q) => questionStatus(q) === null)
    if (unplaced.length) out.push({ kind: 'info', text: `비트가 하나도 없는 질문 ${unplaced.length}개 — 어느 막에서 제기되는지 비트를 추가하세요.` })
    const openOnly = unresolved.filter((q) => questionStatus(q) !== null)
    if (openOnly.length) out.push({ kind: 'info', text: `아직 해소되지 않은 질문 ${openOnly.length}개. 의도된 '열린 결말'이 아니라면 해소 비트가 필요해요.` })
    // 중심 질문이 너무 일찍 해소됨
    if (central) {
      const cBeats = sortBeats(central.beats).filter((b) => b.status === 'resolved' && b.act > 0)
      if (cBeats.length) {
        const earliest = cBeats[0].act
        if (store.actCount >= 3 && earliest < store.actCount) {
          out.push({ kind: 'warn', text: `중심 질문이 ${earliest}막에서 해소됩니다 — 보통 마지막 막(${store.actCount}막)까지 끌어야 긴장이 유지돼요.` })
        } else if (central.beats.length) {
          out.push({ kind: 'ok', text: `중심 질문이 마지막 막(${store.actCount}막)에서 해소돼 긴장이 끝까지 유지됩니다.` })
        }
        // 고조 비트 없이 곧장 해소?
        if (!central.beats.some((b) => b.status === 'tension')) {
          out.push({ kind: 'info', text: '중심 질문에 "고조" 비트가 없어요. 해소 전 판돈을 키우는 지점을 한 번 넣어보세요.' })
        }
      }
    }
    // 막별 질문 제기 분포: 첫 막에 아무 질문도 안 열림
    const firstActOpens = qs.filter((q) => q.beats.some((b) => b.act === 1 && b.status === 'open')).length
    if (acts.length && firstActOpens === 0 && qs.some((q) => q.beats.length)) {
      out.push({ kind: 'info', text: '1막에서 제기되는 질문이 없어요. 도입부에 독자를 끌어당길 질문을 적어도 하나 던지면 좋아요.' })
    }
    // 마지막 막 과부하
    const lastAct = store.actCount
    const lastResolves = qs.filter((q) => q.beats.some((b) => b.act === lastAct && b.status === 'resolved')).length
    if (lastResolves >= 4) out.push({ kind: 'info', text: `${lastAct}막에서 해소되는 질문이 ${lastResolves}개로 몰려 있어요. 일부를 앞 막으로 분산하면 결말이 덜 급해 보여요.` })
    return out
  })()

  // ── 그리드 셀 상태: 질문×막 → 그 막의 '최종' 상태(여러 비트 중 가장 진전된 것) ─────
  function cellStatus(q: Question, act: number): QStatus | null {
    let best: QStatus | null = null
    for (const b of q.beats) if (b.act === act) { if (!best || RANK[b.status] > RANK[best]) best = b.status }
    return best
  }

  // ── 통계 ─────────────────────────────────────────────────────────────────────
  const total = store.questions.length
  const resolvedN = store.questions.filter((q) => questionStatus(q) === 'resolved').length
  const openN = store.questions.filter((q) => { const st = questionStatus(q); return st !== null && st !== 'resolved' }).length
  const pct = total ? Math.round((resolvedN / total) * 100) : 0

  // ── 복사/내보내기 텍스트 ───────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 중심 질문 추적${store.title ? ` — ${store.title}` : ''}`)
    lines.push(`막 구성: ${store.actCount}막 · 질문 ${total}개 · 해소 ${resolvedN} / 열림 ${openN} (${pct}% 해소)`)
    if (central) lines.push(`★ 중심 질문: ${central.text}`)
    lines.push('')
    for (const q of store.questions) {
      const st = questionStatus(q)
      const tag = q.tag ? ` [${q.tag}]` : ''
      lines.push(`${q.central ? '★' : '•'} ${q.text}${tag}  〈${st ? STATUS_BY[st].label : '미배치'}〉`)
      for (const b of sortBeats(q.beats)) {
        const where = b.act > 0 ? `${b.act}막${b.scene ? ` · ${b.scene}` : ''}` : (b.scene || '위치 미정')
        lines.push(`    - [${STATUS_BY[b.status].label}] ${where}${b.note ? `: ${b.note}` : ''}`)
      }
      lines.push('')
    }
    if (issues.length) {
      lines.push('## 진단')
      for (const it of issues) lines.push(`- ${it.text}`)
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flashMsg('전체를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flashMsg('전체를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'dramatic-questions') + '.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      flashMsg('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 구조 문서로 추가('구조' 폴더) ──────────────────────────────
  const escHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push('<p><em>중심 극적 질문과 막/장별 하위 질문이 어디서 제기·고조·해소되는지 추적합니다.</em></p>')
    if (central) parts.push(`<p><strong>★ 중심 질문:</strong> ${escHtml(central.text)}</p>`)
    parts.push(`<p><em>${store.actCount}막 구성 · 질문 ${total}개 · 해소 ${resolvedN} / 열림 ${openN} (${pct}% 해소)</em></p>`)
    for (const q of store.questions) {
      const st = questionStatus(q)
      const tag = q.tag ? ` <em>[${escHtml(q.tag)}]</em>` : ''
      parts.push(`<h3>${q.central ? '★ ' : ''}${escHtml(q.text)}${tag} — ${st ? escHtml(STATUS_BY[st].label) : '미배치'}</h3>`)
      const bs = sortBeats(q.beats)
      if (bs.length) {
        parts.push('<ul>')
        for (const b of bs) {
          const where = b.act > 0 ? `${b.act}막${b.scene ? ` · ${escHtml(b.scene)}` : ''}` : (escHtml(b.scene) || '위치 미정')
          parts.push(`<li><strong>[${escHtml(STATUS_BY[b.status].label)}]</strong> ${where}${b.note ? `: ${escHtml(b.note)}` : ''}</li>`)
        }
        parts.push('</ul>')
      } else parts.push('<p>&nbsp;</p>')
    }
    if (issues.length) {
      parts.push('<h3>진단</h3><ul>')
      for (const it of issues) parts.push(`<li>${escHtml(it.text)}</li>`)
      parts.push('</ul>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '중심 질문 추적' + (store.title ? ` — ${store.title}` : ''),
      bodyHtml: toBodyHtml(),
      meta: {
        작품: store.title || '(제목 없음)',
        중심질문: central ? central.text : '(미지정)',
        막구성: `${store.actCount}막`,
        질문수: String(total),
        해소율: `${resolvedN}/${total} (${pct}%)`,
      },
    })
    flashMsg(id ? '프로젝트 자료에 구조 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // 좌측 바인더 파일 드롭 → 본문 텍스트의 첫 줄을 질문으로 흡수.
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const src = (item.text || item.title || '').trim()
    if (!src) { setNote('끌어온 파일에서 텍스트를 읽지 못했어요.'); return }
    // 본문에서 물음표가 들어간 문장을 우선 추출, 없으면 첫 줄/제목 사용.
    const qLine = (src.match(/[^.!?\n]*\?/) || [])[0]?.trim() || src.split('\n')[0].trim() || item.title
    addQuestion(qLine.slice(0, 240), store.questions.length === 0)
    flashMsg(`"${item.title}"에서 질문을 가져왔어요`)
  }

  const resetAll = () => {
    if (!window.confirm('모든 질문·비트를 지웁니다. 정말 초기화할까요?')) return
    setStore(defaultStore())
    flashMsg('모두 초기화했어요')
  }

  // 예시 채우기(빈 상태에서)
  const loadExample = () => {
    setStore({
      title: '예시 — 잃어버린 약속',
      actCount: 3,
      questions: [
        { id: uid('q'), text: '주인공은 끝내 누이를 구해낼 수 있을까?', central: true, tag: '주플롯', beats: [
          { id: uid('bt'), act: 1, scene: '발단', status: 'open', note: '누이가 납치되며 질문이 던져진다.' },
          { id: uid('bt'), act: 2, scene: '추격', status: 'tension', note: '단서를 쫓지만 적이 한 발 앞선다 — 판돈이 커진다.' },
          { id: uid('bt'), act: 3, scene: '결전', status: 'resolved', note: '대가를 치르고 누이를 구한다.' },
        ] },
        { id: uid('q'), text: '그는 아버지의 죽음에 대한 죄책감을 떨칠 수 있을까?', central: false, tag: '내면', beats: [
          { id: uid('bt'), act: 1, scene: '회상', status: 'open', note: '과거의 실수가 암시된다.' },
          { id: uid('bt'), act: 2, scene: '고백', status: 'tension', note: '비밀이 동료에게 들통난다.' },
        ] },
        { id: uid('q'), text: '조력자는 정말 믿을 수 있는 사람일까?', central: false, tag: '미스터리', beats: [
          { id: uid('bt'), act: 2, scene: '의심', status: 'open', note: '수상한 행동이 포착된다.' },
          { id: uid('bt'), act: 3, scene: '반전', status: 'resolved', note: '배신이 드러나지만 마지막에 희생한다.' },
        ] },
      ],
    })
    flashMsg('예시를 불러왔어요 — 자유롭게 고쳐 보세요')
  }

  // ── 스타일 ─────────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0, position: 'relative' }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const metaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, padding: '8px 8px', cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 6 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', overflow: 'hidden' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 40, resize: 'vertical', padding: '7px 9px', fontSize: 13, lineHeight: 1.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const smInput: React.CSSProperties = { ...input, padding: '5px 7px', fontSize: 12.5, borderRadius: 7 }
  const chip = (active: boolean, color: string): React.CSSProperties => ({ padding: '4px 9px', fontSize: 12, borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? color : 'var(--border)'}`, background: active ? color : 'transparent', color: active ? '#fff' : 'var(--muted)', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', userSelect: 'none' })
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }

  const statusColor = (st: QStatus | null): string => (st ? STATUS_BY[st].color : 'var(--border)')

  // 그리드 컬럼: 질문 라벨 + 막 N개
  const gridCols = `minmax(140px, 1.6fr) repeat(${store.actCount}, minmax(46px, 1fr))`

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false) }}
      onDrop={onDrop}
    >
      <div style={head}>
        <div style={metaRow}>
          <input
            style={{ ...input, flex: '2 1 200px' }}
            value={store.title}
            onChange={(e) => setStore((s) => ({ ...s, title: e.target.value }))}
            placeholder="작품 제목 (선택)"
            maxLength={140}
            aria-label="작품 제목"
          />
          <label style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            막 구성
            <select style={{ ...select, width: 78 }} value={store.actCount} onChange={(e) => setActCount(parseInt(e.target.value, 10))} aria-label="막 개수">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}막</option>)}
            </select>
          </label>
          <button className="linkbtn" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>{showHelp ? '도움말 ▲' : '도움말 ▼'}</button>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>질문 <strong style={{ color: 'var(--text)' }}>{total}</strong> · 해소 <strong style={{ color: 'var(--ok)' }}>{resolvedN}</strong> · 열림 <strong style={{ color: 'var(--warn)' }}>{openN}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}% 해소</strong></span>
          <span>{STATUSES.map((s) => <span key={s.key} style={{ marginLeft: 8 }}><Emoji e={s.emoji} /> {s.label}</span>)}</span>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {showHelp && (
          <div style={{ border: '1px dashed var(--accent)', borderRadius: 12, background: 'var(--panel)', padding: '11px 13px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 6px', color: 'var(--accent)', fontWeight: 700 }}><Emoji e="💡" /> 드라마틱 퀘스천이란?</p>
            <p style={{ margin: 0 }}>
              관객/독자를 끝까지 끌고 가는 <strong style={{ color: 'var(--text)' }}>단 하나의 핵심 질문</strong>입니다(예: <em>"그는 복수를 완수할 수 있을까?"</em>). 보통 "예/아니오"로 답할 수 있고, 마지막 막에서야 해소됩니다.
              그 아래로 막·장별 <strong style={{ color: 'var(--text)' }}>하위 질문</strong>들을 두고, 각 질문마다 <strong>비트</strong>를 달아 어느 막에서
              {STATUSES.map((s) => <span key={s.key}> <Emoji e={s.emoji} /><strong style={{ color: 'var(--text)' }}>{s.label}</strong>({s.desc})</span>)} 되는지 기록하세요.
            </p>
            <p style={{ margin: '6px 0 0' }}>아래 <strong style={{ color: 'var(--text)' }}>막 그리드</strong>에서 색으로 흐름을 한눈에 볼 수 있고, <strong style={{ color: 'var(--text)' }}>진단</strong>이 미해소·조기 해소·과부하 등을 짚어줍니다. 좌측 파일을 끌어와 질문으로 가져올 수도 있어요.</p>
          </div>
        )}

        {/* 새 질문 입력 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            style={{ ...ta, minHeight: 38 }}
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addFromInput() } }}
            placeholder="새 질문을 입력하세요 (예: 그는 진실을 받아들일 수 있을까?)  ·  Ctrl+Enter 로 추가"
            aria-label="새 질문"
          />
          <button className="btn-primary" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={addFromInput} disabled={!newQ.trim()}>+ 추가</button>
        </div>

        {/* 빈 상태 */}
        {total === 0 && (
          <div style={{ textAlign: 'center', padding: '26px 14px', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--panel)' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}><Emoji e="❓" /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>아직 등록된 질문이 없어요</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>작품을 끌고 갈 <strong>중심 질문</strong>부터 적어 보세요. 그다음 막/장별 하위 질문을 더하면 됩니다.</div>
            <button className="minibtn" onClick={loadExample}><Emoji e="📋" /> 예시 불러오기</button>
          </div>
        )}

        {/* 막 그리드 시각화 */}
        {total > 0 && (
          <div style={card}>
            <div style={{ ...sectionTitle, padding: '9px 12px 0' }}><Emoji e="🗺️" /> 막 흐름 그리드 <span style={{ fontWeight: 400 }}>(행=질문, 열=막, 색=그 막의 최종 상태)</span></div>
            <div style={{ overflowX: 'auto', padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, minWidth: 'min-content' }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, padding: '4px 6px', position: 'sticky', left: 0, background: 'var(--panel)' }}>질문</div>
                {acts.map((a) => <div key={a} style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textAlign: 'center', padding: '4px 2px' }}>{a}막</div>)}
                {store.questions.map((q) => (
                  <div key={q.id} style={{ display: 'contents' }}>
                    <div style={{ fontSize: 12, padding: '6px 6px', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', position: 'sticky', left: 0, background: 'var(--panel)', borderRight: '1px solid var(--border)' }} title={q.text}>
                      <span style={{ flexShrink: 0 }}>{q.central ? '★' : '•'}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text || '(빈 질문)'}</span>
                    </div>
                    {acts.map((a) => {
                      const cs = cellStatus(q, a)
                      return (
                        <div
                          key={a}
                          title={cs ? `${a}막: ${STATUS_BY[cs].label}` : `${a}막: (비트 없음)`}
                          style={{ height: 24, borderRadius: 5, background: cs ? statusColor(cs) : 'var(--paper)', border: `1px solid ${cs ? statusColor(cs) : 'var(--border)'}`, opacity: cs ? 0.92 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}
                        >
                          {cs ? STATUS_BY[cs].label.charAt(0) : ''}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 진단 패널 */}
        {issues.length > 0 && (
          <div style={card}>
            <div style={{ ...sectionTitle, padding: '9px 12px 6px' }}><Emoji e="🩺" /> 진단</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px 11px' }}>
              {issues.map((it, i) => (
                <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, display: 'flex', gap: 7, color: it.kind === 'warn' ? 'var(--warn)' : it.kind === 'ok' ? 'var(--ok)' : 'var(--muted)' }}>
                  <span style={{ flexShrink: 0 }}>{it.kind === 'warn' ? <Emoji e="⚠️" /> : it.kind === 'ok' ? <Emoji e="✅" /> : <Emoji e="ℹ️" />}</span>
                  <span>{it.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 질문 목록(상세) */}
        {store.questions.map((q, qi) => {
          const st = questionStatus(q)
          return (
            <div key={q.id} style={{ ...card, borderLeft: `4px solid ${q.central ? 'var(--warn)' : statusColor(st)}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px 6px' }}>
                <button
                  className="minibtn"
                  onClick={() => toggleCentral(q.id)}
                  title={q.central ? '중심 질문 해제' : '중심(드라마틱) 질문으로 지정 (작품당 1개)'}
                  style={{ flexShrink: 0, color: q.central ? 'var(--warn)' : 'var(--muted)', fontWeight: 700, padding: '4px 8px' }}
                >
                  {q.central ? '★ 중심' : '☆ 중심으로'}
                </button>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    style={{ ...ta, minHeight: 36, fontWeight: q.central ? 700 : 500 }}
                    value={q.text}
                    onChange={(e) => patchQuestion(q.id, { text: e.target.value.slice(0, 240) })}
                    placeholder="질문 본문 (예: 그녀는 비밀을 지킬 수 있을까?)"
                    aria-label="질문 본문"
                  />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      style={{ ...smInput, width: 130 }}
                      value={q.tag}
                      onChange={(e) => patchQuestion(q.id, { tag: e.target.value.slice(0, 30) })}
                      placeholder="분류 (예: 주플롯)"
                      aria-label="질문 분류"
                    />
                    <span style={{ fontSize: 11.5, color: statusColor(st), fontWeight: 700 }}>
                      현재: {st ? <><Emoji e={STATUS_BY[st].emoji} /> {STATUS_BY[st].label}</> : '미배치'}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => moveQuestion(q.id, -1)} disabled={qi === 0} title="위로" style={{ padding: '4px 8px' }}>▲</button>
                    <button className="minibtn" onClick={() => moveQuestion(q.id, 1)} disabled={qi === total - 1} title="아래로" style={{ padding: '4px 8px' }}>▼</button>
                    <button className="minibtn" onClick={() => { if (window.confirm('이 질문과 비트를 삭제할까요?')) removeQuestion(q.id) }} title="삭제" style={{ padding: '4px 8px', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                  </div>
                </div>
              </div>

              {/* 비트 목록 */}
              <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortBeats(q.beats).map((b) => (
                  <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 9, background: 'var(--paper)', padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: `3px solid ${statusColor(b.status)}` }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        style={{ ...smInput, width: 64, cursor: 'pointer' }}
                        value={b.act}
                        onChange={(e) => patchBeat(q.id, b.id, { act: parseInt(e.target.value, 10) })}
                        aria-label="막"
                      >
                        <option value={0}>막?</option>
                        {acts.map((a) => <option key={a} value={a}>{a}막</option>)}
                      </select>
                      <input
                        style={{ ...smInput, width: 110 }}
                        value={b.scene}
                        onChange={(e) => patchBeat(q.id, b.id, { scene: e.target.value.slice(0, 40) })}
                        placeholder="장/챕터 (선택)"
                        aria-label="장 라벨"
                      />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {STATUSES.map((s) => (
                          <span
                            key={s.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => patchBeat(q.id, b.id, { status: s.key })}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); patchBeat(q.id, b.id, { status: s.key }) } }}
                            style={chip(b.status === s.key, s.color)}
                            title={s.desc}
                          >
                            <Emoji e={s.emoji} /> {s.label}
                          </span>
                        ))}
                      </div>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" onClick={() => removeBeat(q.id, b.id)} title="비트 삭제" style={{ padding: '3px 7px', color: 'var(--warn)' }}>✕</button>
                    </div>
                    <input
                      style={{ ...smInput, width: '100%' }}
                      value={b.note}
                      onChange={(e) => patchBeat(q.id, b.id, { note: e.target.value.slice(0, 200) })}
                      placeholder="이 지점에서 무슨 일이 일어나나요?"
                      aria-label="비트 메모"
                    />
                  </div>
                ))}
                <button className="minibtn" onClick={() => addBeat(q.id)} style={{ alignSelf: 'flex-start', padding: '5px 10px' }}>+ 비트 추가 (제기/고조/해소 지점)</button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '질문·비트·진단을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>좌측 파일을 이 창에 끌어다 놓으면 질문으로 가져옵니다</span>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll} disabled={total === 0}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={exportFile} disabled={total === 0}><Emoji e="⬇️" /> .txt 내보내기</button>
        {total === 0 && <button className="minibtn" onClick={loadExample}><Emoji e="📋" /> 예시</button>}
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        {total > 0 && <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>전체 초기화</button>}
      </div>

      {/* 드롭 오버레이 */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--accent) 16%, transparent)', border: '2px dashed var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <span style={{ background: 'var(--panel)', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)' }}>여기에 놓으면 질문으로 가져옵니다</span>
        </div>
      )}
    </div>
  )
}
