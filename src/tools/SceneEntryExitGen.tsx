// 장면 진입·퇴장 생성기(조합형) — "늦게 들어가 일찍 나오기(enter late, leave early)" 원칙으로
//   장면의 강한 시작(진입 지점 × 진입 훅)과 강한 끝(퇴장 지점 × 여운/전환)을 조합해 제안한다.
//   작법 원리: 설명·도입을 잘라내고 이미 사건이 진행 중인 한가운데로 들어가, 핵심이 끝나는 즉시
//   질문·이미지·전환을 남기고 빠져나온다. 잠금(🔒)/재생성, 조합 수(수십만+) 표시.
//   결과는 스니펫으로 라이브러리 저장·프로젝트 자료 〈장면〉 폴더 추가·장면 도구로 연계.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·라이브러리 불필요(Math.random + localStorage).
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, useLibraryList, addToProject, hasProjectBridge, openToolLinked, getDragItem, isItemDrag, Emoji } from './linkbus'

export const meta = { id: 'scene-entry-exit-gen', name: '장면 진입·퇴장 생성기', icon: '🎬', group: '영감·발상', intro: '“늦게 들어가 일찍 나오기” — 장면의 강한 시작과 끝을 조합해 제안합니다', w: 580, h: 720 }

const LS = 'sry:tool:scene-entry-exit-gen'

// ---------- 슬롯 풀 ----------
// part: 'in' = 진입(장면 시작), 'out' = 퇴장(장면 끝). 진입은 늦게 들어가기, 퇴장은 일찍 나오기 원리.
interface Slot { key: string; label: string; icon: string; part: 'in' | 'out'; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'entryPoint', label: '진입 지점 — 어디서부터 시작할까', icon: '🚪', part: 'in',
    faces: [
      '인물이 이미 도망치는 한가운데로', '대화가 격해진 그 한마디 직후로', '결정이 이미 내려진 직후의 침묵으로', '문이 막 쾅 닫힌 순간으로', '거짓말이 이미 뱉어진 다음 호흡으로',
      '계획이 틀어지기 시작한 첫 어긋남으로', '누군가 막 자리를 박차고 일어선 찰나로', '비명이 멎고 정적이 깔린 직후로', '손에 무기를 이미 쥔 상태로', '약속 시간을 한참 넘긴 늦은 도착으로',
      '눈물이 이미 다 마른 다음 날 아침으로', '추격이 절반쯤 진행된 골목 모퉁이로', '편지의 마지막 문장을 읽는 손끝으로', '협상이 결렬되기 직전의 마지막 제안으로', '들켜버린 바로 그 순간으로',
      '장례가 끝나고 사람들이 흩어진 뒤로', '폭발음의 잔향이 아직 귀에 남은 상태로', '심문이 이미 두 시간째 이어진 지점으로', '돈을 막 건넨 손이 멈춘 자리로', '배신을 알아챈 눈빛이 굳는 순간으로',
      '수술실 문이 닫히고 한 시간이 흐른 복도로', '첫 키스가 끝나고 둘 다 말을 잃은 직후로', '경기 종료 휘슬이 막 울린 그라운드로', '폭우가 그치고 물웅덩이만 남은 거리로', '마지막 손님이 막 나간 빈 가게로',
      '칼날이 이미 목에 닿은 정지 화면으로', '이름이 호명되고 한 발 내딛는 순간으로', '비밀이 이미 새어 나간 다음 회의실로', '불이 꺼지고 비상등만 깜빡이는 사이로', '결혼식 입장 직전, 신부 대기실의 손떨림으로',
      '사고 직후 모두가 멈춰 선 정적의 한가운데로', '취조실 녹음기가 막 켜진 빨간 불빛으로', '계약서에 막 서명한 펜이 멈춘 자리로',
    ],
  },
  {
    key: 'entryHook', label: '진입 훅 — 첫 문장이 던지는 미끼', icon: '🪝', part: 'in',
    faces: [
      '독자가 모르는 인물을 당연한 듯 거명하며', '결과부터 먼저 못 박는 단언으로', '뜬금없는 감각(냄새·소리)으로 멱살을 잡으며', '대답만 들리고 질문은 잘라낸 채로', '“그러지 말았어야 했다”는 후회 한 줄로',
      '시간·장소를 일부러 흐려 혼란을 던지며', '평범한 행동에 어울리지 않는 한마디를 붙여', '숫자·시각을 콕 박아 카운트다운 느낌으로', '인물이 거짓말하는 장면을 먼저 보여주며', '독자에게 직접 말 거는 듯한 도발로',
      '이미 벌어진 사건의 잔해부터 묘사하며', '“마지막으로 ~한 게 언제였더라” 식 회상 미끼로', '서로 모순되는 두 진술을 나란히 던지며', '한 인물의 침묵을 다른 인물의 수다로 둘러싸며', '곧 깨질 것이 분명한 평온을 강조하며',
      '금기의 단어를 첫 문장에 박아 넣어', '“아무도 그날을 입에 올리지 않았다” 식 함구령으로', '몸의 상처·흔적을 먼저 클로즈업하며', '관계의 호칭이 바뀐 것부터 슬쩍 흘리며', '날씨·계절이 사건과 충돌하게 배치하며',
      '독자만 아는 사실을 인물은 모르는 채로(서스펜스)', '한 문장 안에서 평온→불길로 색을 갈아끼우며', '되묻고 싶게 만드는 모호한 대명사(“그것”)로', '일상의 디테일을 지나치게 정밀하게 그려 불안을 깔며', '끝났다고 선언하고 실은 시작인 아이러니로',
      '냉정한 사실 나열 뒤 감정 한 방울만 떨어뜨려', '예고된 비극을 태연한 어조로 흘리며', '소리의 부재(갑작스러운 정적)로 긴장을 세우며',
    ],
  },
  {
    key: 'exitPoint', label: '퇴장 지점 — 어디서 끊을까', icon: '✂️', part: 'out',
    faces: [
      '결정적 한마디가 떨어지자마자 즉시', '질문을 던진 채 대답을 듣기 직전에', '문이 막 열리려는 손잡이 위에서', '진실을 깨닫는 표정이 굳는 순간에', '결과는 보여주지 않고 행동 직전에서',
      '가장 크게 웃은 직후, 웃음이 식기 전에', '한 사람이 등을 돌려 걸어가기 시작할 때', '전화벨이 울리고 받기 직전의 정적에서', '칼·총이 겨눠진 정지 화면 그대로', '“그래서?”라는 물음이 공중에 뜬 채로',
      '눈물 한 방울이 떨어지기 직전의 멈춤에서', '거짓말이 막 시작되려는 입술 모양에서', '두 사람의 시선이 처음으로 마주친 그 1초에', '폭로의 첫 단어만 내뱉고 곧장', '가장 안심한 순간, 불길한 그림자가 비치기 직전에',
      '마지막 손님이 문을 나서는 등 뒤에서', '약속의 악수를 하려 손을 내민 채로', '불이 꺼지는 스위치 소리와 함께', '“사실은…”에서 말이 끊긴 자리에', '심장 모니터가 한 박자 건너뛴 순간에',
      '결심을 굳힌 눈빛이 카메라를 똑바로 볼 때', '문자 메시지의 ‘…’ 입력 표시가 사라지는 찰나에', '계단 끝에 도달하기 한 칸 전에서', '되돌릴 수 없는 버튼 위에 손가락을 올린 채', '아이가 “엄마”라고 부르려 입을 떼는 순간에',
      '최고조의 환호 속에서 한 사람만 굳어 있을 때', '서명란에 펜 끝이 닿기 직전에', '뒤돌아보지 않겠다 다짐하며 발을 떼는 첫걸음에', '거울 속 자신과 눈이 마주친 그 멈춤에',
    ],
  },
  {
    key: 'exitResonance', label: '퇴장 여운/전환 — 무엇을 남길까', icon: '🌅', part: 'out',
    faces: [
      '다음 장으로 끌고 갈 미해결 질문을 남긴다', '대답 없는 한 줄 대사로 메아리를 남긴다', '시점을 다른 인물에게로 슬쩍 넘기며 끊는다', '시간을 훌쩍 건너뛰는 암시로 전환한다', '하나의 강렬한 이미지(사물·풍경)에 멈춰 선다',
      '인물이 미처 못 한 말의 빈자리를 남긴다', '감각(소리·냄새)만 남기고 장면을 닫는다', '독자만 아는 아이러니로 씁쓸함을 남긴다', '되풀이될 모티프(반복 구절)를 던져둔다', '안도와 불안을 동시에 남기는 양가 감정으로 닫는다',
      '약속 혹은 협박 한 줄을 미끼로 남긴다', '“하지만 그것은 시작에 불과했다” 식 예고로 끊는다', '카메라를 멀리 빼며(롱숏) 인물을 작게 남긴다', '한 사물에 클로즈업해 상징으로 닫는다', '대비되는 장면으로 점프컷 전환한다',
      '인물의 결심만 보여주고 결과는 다음으로 미룬다', '같은 공간에 홀로 남은 인물의 정적으로 닫는다', '시계·달력 등 시간의 흐름을 새기며 전환한다', '독자에게 판단을 떠넘기는 모호함으로 닫는다', '웃음 끝의 공허, 혹은 눈물 끝의 웃음으로 반전을 남긴다',
      '편지·메모의 미완성 문장으로 멈춘다', '날씨가 바뀌는 한 컷으로 분위기를 전환한다', '인물이 받은 상처(말·이미지)를 곱씹게 남긴다', '아무 일 없던 듯한 일상 복귀로 도리어 서늘함을 남긴다', '복선 한 조각을 무심히 흘리며 닫는다',
      '두 사건을 병치해 독자가 잇게 만든다', '결정의 대가가 무엇일지 예감만 남긴다', '소음에서 정적으로, 혹은 정적에서 소음으로 청각 전환', '인물의 뒷모습으로 페이드아웃한다', '“그날 이후 모든 것이 달라졌다” 식 회고 한 줄로 닫는다',
    ],
  },
]

const IN_KEYS = SLOTS.filter((s) => s.part === 'in').map((s) => s.key)
const OUT_KEYS = SLOTS.filter((s) => s.part === 'out').map((s) => s.key)

// ---------- 유틸 ----------
const pickIdx = (len: number) => Math.floor(Math.random() * len)
function pickFaceIdx(slot: Slot, exclude: number): number {
  if (slot.faces.length <= 1) return 0
  let i = exclude
  while (i === exclude) i = pickIdx(slot.faces.length)
  return i
}
const fmtNum = (n: number) => n.toLocaleString('ko-KR')
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function face(sel: Record<string, number>, key: string): string {
  const s = SLOTS.find((x) => x.key === key)
  if (!s) return ''
  const i = sel[key]
  return typeof i === 'number' && s.faces[i] != null ? s.faces[i] : ''
}

// 장면 제목/제재(사용자가 입력한 장면 이름, 없으면 기본).
const cleanTopic = (s: string, fb: string) => (s.trim() ? s.trim() : fb)

// 진입부 서술 — "늦게 들어가기".
function composeEntry(sel: Record<string, number>, topic: string): string {
  const point = face(sel, 'entryPoint'), hook = face(sel, 'entryHook')
  if (!point && !hook) return ''
  const head = topic ? `〈${topic}〉 장면은 ` : '이 장면은 '
  const parts: string[] = []
  if (point) parts.push(`${head}${point} 곧장 들어간다.`)
  else parts.push(`${head}사건의 한가운데로 곧장 들어간다.`)
  if (hook) parts.push(`첫 문장은 ${hook} 독자를 붙든다.`)
  return parts.join(' ')
}

// 퇴장부 서술 — "일찍 나오기".
function composeExit(sel: Record<string, number>): string {
  const point = face(sel, 'exitPoint'), reson = face(sel, 'exitResonance')
  if (!point && !reson) return ''
  const parts: string[] = []
  if (point) parts.push(`장면은 ${point} 끊는다.`)
  if (reson) parts.push(`그리고 ${reson}`)
  return parts.join(' ')
}

// 전체 서술(진입 → 퇴장).
function compose(sel: Record<string, number>, topic: string): string {
  const inn = composeEntry(sel, topic), out = composeExit(sel)
  if (!inn && !out) return '슬롯을 굴려 장면의 강한 시작과 끝을 만들어 보세요.'
  return [inn, out].filter(Boolean).join('\n\n')
}

// 짧은 제목.
function shortTitle(topic: string): string {
  const t = topic.trim()
  return t ? `🎬 장면 진입·퇴장 — ${t}` : '🎬 장면 진입·퇴장 제안'
}

export default function SceneEntryExitGen({ payload }: { payload?: Record<string, unknown> }) {
  // 슬롯별 face 인덱스(최초 전부 무작위, localStorage 복원).
  const [sel, setSel] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':sel')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, number>
        const next: Record<string, number> = {}
        SLOTS.forEach((s) => {
          const v = p[s.key]
          next[s.key] = typeof v === 'number' && v >= 0 && v < s.faces.length ? v : pickIdx(s.faces.length)
        })
        return next
      }
    } catch { /* ignore */ }
    const init: Record<string, number> = {}
    SLOTS.forEach((s) => { init[s.key] = pickIdx(s.faces.length) })
    return init
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':locked')
      if (raw) {
        const p = JSON.parse(raw) as Record<string, boolean>
        const next: Record<string, boolean> = {}
        SLOTS.forEach((s) => { if (p[s.key]) next[s.key] = true })
        return next
      }
    } catch { /* ignore */ }
    return {}
  })
  const [topic, setTopic] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + ':topic')
      if (raw) { const p = JSON.parse(raw) as { v?: string }; return typeof p.v === 'string' ? p.v : '' }
    } catch { /* ignore */ }
    return ''
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const rollTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  const saved = useLibraryList('snippets')
  const myScenes = saved.filter((s) => Array.isArray(s.tags) && s.tags.includes('진입퇴장'))

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  // payload(외부 연계, 예: 장면 목록/플롯) 또는 드롭으로 장면 제재가 들어오면 채운다.
  useEffect(() => {
    const t = payload?.topic ?? payload?.title ?? payload?.scene
    if (typeof t === 'string' && t.trim()) {
      setTopic(t.trim())
      flash('전달받은 장면 제목을 채웠습니다.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속화.
  useEffect(() => { try { localStorage.setItem(LS + ':sel', JSON.stringify(sel)) } catch { /* ignore */ } }, [sel])
  useEffect(() => { try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])
  useEffect(() => { try { localStorage.setItem(LS + ':topic', JSON.stringify({ v: topic })) } catch { /* ignore */ } }, [topic])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리.
  useEffect(() => {
    if (!rolling) return
    rollTimer.current = window.setTimeout(() => setRolling(false), 320)
    return () => { if (rollTimer.current !== null) { window.clearTimeout(rollTimer.current); rollTimer.current = null } }
  }, [rolling])
  useEffect(() => () => {
    if (rollTimer.current !== null) window.clearTimeout(rollTimer.current)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
  }, [])

  // 잠기지 않은 슬롯만(또는 한쪽 part 만) 다시 굴린다.
  const roll = (only?: 'in' | 'out') => {
    setCopied(false)
    setRolling(true)
    setSel((prev) => {
      const next = { ...prev }
      SLOTS.forEach((s) => {
        if (only && s.part !== only) return
        if (!locked[s.key]) next[s.key] = pickFaceIdx(s, prev[s.key])
      })
      return next
    })
  }
  const rollOne = (key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setSel((prev) => ({ ...prev, [key]: pickFaceIdx(s, prev[key]) }))
  }
  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  // ---------- 조합 수 ----------
  const totalCombos = SLOTS.reduce((acc, s) => acc * s.faces.length, 1)
  const openCombos = SLOTS.reduce((acc, s) => acc * (locked[s.key] ? 1 : s.faces.length), 1)

  const result = compose(sel, topic.trim())
  const hasResult = SLOTS.some((s) => typeof sel[s.key] === 'number')

  const copy = () => {
    if (!hasResult) return
    navigator.clipboard?.writeText(result).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  // 라이브러리(스니펫)에 제안 저장 — 다른 도구와 공유.
  const saveSnippet = () => {
    if (!hasResult) return
    if (myScenes.some((s) => s.text === result)) { flash('이미 저장된 제안입니다.'); return }
    addToLibrary('snippets', { text: result, source: '장면 진입·퇴장 생성기', tags: ['진입퇴장', '글감'] })
    flash('장면 진입·퇴장 제안을 라이브러리에 저장했습니다.')
  }

  // 본문 HTML(프로젝트/카드 공용).
  const buildBodyHtml = (): string => {
    const block = (keys: string[], head: string) =>
      `<p style="font-weight:600;margin:10px 0 4px;">${esc(head)}</p>` +
      keys.map((k) => {
        const s = SLOTS.find((x) => x.key === k)!
        const f = face(sel, k)
        return f ? `<p><b>${esc(s.icon)} ${esc(s.label.split(' — ')[0])}:</b> ${esc(f)}</p>` : ''
      }).join('')
    const inn = composeEntry(sel, topic.trim()), out = composeExit(sel)
    return [
      topic.trim() ? `<p style="font-size:13px;color:#888;">장면: <b>${esc(topic.trim())}</b></p>` : '',
      `<p style="font-size:15px;line-height:1.7;">${esc(inn)}</p>`,
      `<p style="font-size:15px;line-height:1.7;">${esc(out)}</p>`,
      `<hr/>`,
      block(IN_KEYS, '🚪 진입 — 늦게 들어가기'),
      block(OUT_KEYS, '✂️ 퇴장 — 일찍 나오기'),
    ].filter(Boolean).join('')
  }

  // 프로젝트 자료 〈장면〉 폴더에 추가.
  const toProject = () => {
    if (!hasResult) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '장면',
      title: shortTitle(topic.trim()), bodyHtml: buildBodyHtml(), synopsis: result.replace(/\n+/g, ' '),
    })
    flash(id ? '프로젝트 자료 〈장면〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 장면 도구(scene-forge)로 연계 — 진입·퇴장 메모를 함께 보낸다.
  const toSceneForge = () => {
    if (!hasResult) return
    openToolLinked('scene-forge', {
      topic: topic.trim(),
      entry: composeEntry(sel, topic.trim()),
      exit: composeExit(sel),
      note: result,
      source: '장면 진입·퇴장 생성기',
    })
    flash('장면 도구로 진입·퇴장 메모를 보냈습니다.')
  }

  // ---------- 좌측 바인더 파일 드롭 수용 → 그 제목/본문 일부를 장면 제재로 ----------
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const t = (item.title || '').trim()
    if (t) { setTopic(t); flash(`‘${t}’을(를) 장면 제재로 가져왔습니다.`) }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) { e.preventDefault(); if (!dragOver) setDragOver(true) }
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto', outline: dragOver ? '2px dashed var(--accent)' : 'none', outlineOffset: -4 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const chip: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', color: 'var(--muted)' }
  const topicInput: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', color: 'var(--text)', fontSize: 14 }
  const groupLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--accent)', margin: '4px 0 -2px' }

  const renderSlot = (s: Slot) => {
    const f = face(sel, s.key)
    const isLocked = !!locked[s.key]
    return (
      <div key={s.key} style={row}>
        <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} · {s.faces.length}면</div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, wordBreak: 'keep-all', color: f ? 'var(--text)' : 'var(--muted)' }}>
            {rolling && !isLocked ? '…' : (f || '— 굴려주세요 —')}
          </div>
        </div>
        <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲" /></button>
        <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
          {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
        </button>
      </div>
    )
  }

  return (
    <div style={wrap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={() => setDragOver(false)}>
      <div style={hint}>
        <b>“늦게 들어가 일찍 나오기”</b> — 설명·도입을 잘라내고 사건의 한가운데로 진입했다가, 핵심이 끝나는 즉시
        여운·전환을 남기고 빠져나오는 장면을 굴립니다. 마음에 드는 슬롯은 🔒로 고정하세요.
      </div>

      {/* 장면 제재(선택) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}><Emoji e="🎬" /> 장면</span>
        <input style={topicInput} value={topic} placeholder="장면 이름(선택) · 좌측 파일을 끌어다 놓아도 됩니다" onChange={(e) => setTopic(e.target.value)} />
      </div>

      {/* 조합 수 표시 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={chip}>전체 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(totalCombos)}</b>가지</span>
        <span style={chip}>현재 가능 <b style={{ color: 'var(--accent)' }}>{fmtNum(openCombos)}</b>가지</span>
      </div>

      {/* 진입 슬롯 */}
      <div style={groupLabel}><Emoji e="🚪" /> 진입 — 늦게 들어가기</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.filter((s) => s.part === 'in').map(renderSlot)}
      </div>

      {/* 퇴장 슬롯 */}
      <div style={groupLabel}><Emoji e="✂️" /> 퇴장 — 일찍 나오기</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.filter((s) => s.part === 'out').map(renderSlot)}
      </div>

      {/* 한쪽만 굴리기 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="minibtn" style={{ flex: 1 }} onClick={() => roll('in')} title="진입 슬롯만 다시 굴리기"><Emoji e="🚪" /> 진입만 굴리기</button>
        <button className="minibtn" style={{ flex: 1 }} onClick={() => roll('out')} title="퇴장 슬롯만 다시 굴리기"><Emoji e="✂️" /> 퇴장만 굴리기</button>
      </div>

      {/* 조합 결과 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🎬" /> 장면 설계 제안</div>
        <div style={{ fontSize: 15, lineHeight: 1.7, wordBreak: 'keep-all', color: hasResult ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>{result}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => roll()}><Emoji e="🎲" /> 전체 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!hasResult}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!hasResult}><Emoji e="⭐" /> 제안 저장</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasResult || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 제안을 프로젝트 자료 〈장면〉에 추가'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={toSceneForge}
          disabled={!hasResult}
          title="진입·퇴장 메모를 장면 도구로 보내기"
        ><Emoji e="🎞️" /> 장면 도구로</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저장한 제안 목록(라이브러리 공유) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⭐" /> 저장한 제안 ({myScenes.length})</div>
        {myScenes.length === 0 ? (
          <div style={hint}>마음에 드는 제안은 ‘제안 저장’으로 모아두면 다른 도구에서도 함께 쓸 수 있어요.</div>
        ) : (
          myScenes.slice(0, 30).map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.6, wordBreak: 'keep-all', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' }}>{s.text}</span>
              <button
                className="minibtn"
                style={{ flexShrink: 0 }}
                title="이 제안 복사"
                onClick={() => { navigator.clipboard?.writeText(s.text).catch(() => { /* graceful */ }); flash('복사했습니다.') }}
              ><Emoji e="📋" /></button>
            </div>
          ))
        )}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 'auto', lineHeight: 1.5 }}>
        진입 지점·훅·퇴장 지점·여운 풀과 문장은 본 도구의 자체 창작물(오픈소스, 외부 저작물 미사용). 외부 네트워크 없이 동작합니다.
      </div>
    </div>
  )
}
