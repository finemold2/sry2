// 미끼·떡밥(레드헤링) 생성기 — 독자의 시선을 진범·진실에서 빗겨 가게 하는 오인 장치를 슬롯 조합으로 대량 생성한다.
//  의심 유도 대상 × 가짜 단서 × 오해 장치 × 진실과의 연결 네 슬롯을 골라 굴리면, 각 슬롯의 로컬 표에서
//  한 조각씩 뽑아 "누구를 의심하게 하고, 어떤 가짜 단서로, 어떤 장치를 써서, 진실과는 어떻게 이어지는가"를
//  한 단락 미끼 설계로 엮어 준다. 마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴려 변주한다(조합 수 표시).
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API/미디어/네트워크 불필요.
// 저작권 안전: 모든 후보 텍스트는 자작. 제어문자 미사용(일반 문자만).
// 연계(linkbus): 현재 미끼 설계를 자료('research')/'미스터리' 폴더 문서로 추가, 스니펫 라이브러리 저장, 수집함 담기,
//   그리고 단서 배치 도구(mystery-clue-planner)를 열어 진짜 단서와 함께 설계를 이어 간다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'red-herring-gen', name: '미끼·떡밥 생성기', icon: '🎣', group: '영감·발상', intro: '의심 유도 대상·가짜 단서·오해 장치·진실과의 연결을 슬롯 조합으로 굴려 독자 시선을 분산하는 레드헤링을 설계하세요', w: 580, h: 680 }

const LS = 'sry:tool:red-herring-gen'

// ---- 슬롯 정의 ----
// 각 슬롯은 미끼 설계의 한 축. faces = 그 축의 후보(로컬 표). 미스터리/스릴러 폭넓게 쓰이도록 다양하게.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'target', label: '의심 유도 대상', icon: '🎯', desc: '독자가 범인이라 의심하게 만들 사람·존재',
    faces: [
      '사건 직전 피해자와 크게 다툰 가까운 친구',
      '알리바이가 어딘가 어긋나는 조용한 이웃',
      '피해자에게 큰돈을 빌렸던 사업 동료',
      '유산을 가장 많이 물려받는 둘째 자식',
      '과거에 비슷한 죄를 저지른 전과자',
      '현장을 가장 먼저 발견한 신고자',
      '피해자를 노골적으로 미워하던 경쟁자',
      '말수가 적고 행적이 모호한 새 고용인',
      '사라진 흉기를 마지막으로 만진 요리사',
      '피해자의 비밀 연인으로 의심받는 동료',
      '늘 거짓말을 늘어놓는 허풍쟁이 이웃',
      '사건 후 갑자기 마을을 떠나려던 떠돌이',
      '피해자와 똑같은 상처를 입었던 옛 환자',
      '범행 시각에 행방이 묘연한 가정부',
      '지나치게 협조적이어서 도리어 수상한 목격자',
      '피해자를 협박한 편지를 보낸 익명의 인물',
      '사건을 집요하게 캐묻는 호기심 많은 기자',
      '피해자의 약점을 쥐고 있던 변호사',
      '현장 근처를 배회하던 정체불명의 부랑자',
      '피해자가 마지막으로 만난 의문의 방문객',
    ],
  },
  {
    key: 'clue', label: '가짜 단서', icon: '🧩', desc: '범인을 가리키는 듯하지만 실은 빗나간 물증·정황',
    faces: [
      '용의자의 머리카락이 현장에서 발견된다',
      '피 묻은 손수건이 그의 가방에서 나온다',
      '범행 시각에 그가 자리를 비웠다는 증언이 나온다',
      '흉기와 똑같은 물건을 그가 최근 구입했다',
      '피해자의 일기에 그의 이름이 적혀 있다',
      '그의 신발 자국이 창문 아래 진흙에 찍혀 있다',
      '사건 직후 그가 옷을 황급히 빨았다는 정황이 드러난다',
      '그만이 알 수 있는 비밀번호로 금고가 열려 있다',
      '협박 편지의 필체가 그의 것과 닮았다',
      '그의 통화 기록에 피해자와의 마지막 통화가 남아 있다',
      '현장에 떨어진 단추가 그의 외투에서 떨어진 것과 같다',
      '그가 거액의 보험금을 노렸다는 서류가 발견된다',
      '목격자가 그와 비슷한 뒷모습을 보았다고 진술한다',
      '그의 차가 사건 현장 근처 CCTV에 찍혀 있다',
      '피해자의 휴대폰 마지막 검색어가 그를 가리킨다',
      '그의 알리바이를 대 줄 사람이 끝내 나타나지 않는다',
      '흉기에서 닦이다 만 지문 일부가 그의 것과 일치한다',
      '그가 사건 전날 흉기를 빌려 갔다는 영수증이 있다',
      '현장의 향수 냄새가 그가 쓰는 것과 같다',
      '그가 거짓 알리바이를 댄 사실이 들통난다',
    ],
  },
  {
    key: 'device', label: '오해 장치', icon: '🪤', desc: '독자를 잘못된 결론으로 끌고 가는 서술·구성 트릭',
    faces: [
      '의심스러운 행동을 클로즈업해 의도적으로 부각한다',
      '결정적 정보를 일부러 한 박자 늦게 흘린다',
      '시점을 제한해 진범의 속내만 가려 둔다',
      '우연의 일치를 인과처럼 나란히 배치한다',
      '신뢰할 수 없는 화자의 단정을 사실처럼 들려준다',
      '진범을 너무 일찍, 너무 호감 가게 등장시켜 안심시킨다',
      '두 사건을 겹쳐 보이게 해 엉뚱한 연결을 유도한다',
      '대명사·이름을 모호하게 써서 대상을 헷갈리게 한다',
      '용의자의 과거를 과장해 선입견을 심는다',
      '진짜 단서를 사소한 배경 묘사 속에 묻어 둔다',
      '독자가 이미 아는 클리셰를 역이용해 방심시킨다',
      '시간 순서를 뒤섞어 알리바이를 착각하게 만든다',
      '제3자의 추측을 권위 있는 결론처럼 인용한다',
      '범인의 선행을 부각해 의심 대상에서 제외시킨다',
      '가짜 동기를 그럴듯하게 부풀려 설득력을 입힌다',
      '카메라를 엉뚱한 방으로 돌려 결정적 순간을 가린다',
      '두 인물의 외모·이름을 닮게 해 혼동을 일으킨다',
      '진실을 말하는 인물을 미치광이처럼 그려 묵살시킨다',
      '독자의 동정심을 자극해 진범을 변호하게 만든다',
      '거짓 자백을 먼저 배치해 수사를 한쪽으로 몰아간다',
    ],
  },
  {
    key: 'link', label: '진실과의 연결', icon: '🔗', desc: '미끼가 결국 진실과 어떻게 맞물려 회수되는가',
    faces: [
      '사실 그 단서는 진범이 일부러 흘려 둔 미끼였다',
      '의심받던 인물은 전혀 다른 비밀을 숨기고 있었을 뿐이다',
      '가짜 단서를 쫓다 우연히 진짜 증거에 닿는다',
      '미끼가 풀리는 순간 진범의 알리바이도 함께 무너진다',
      '의심 대상이 결백을 증명하려다 진실을 끄집어낸다',
      '같은 물증이 정반대 결론으로 재해석되며 진범을 가리킨다',
      '미끼에 매달린 수사 때문에 진범이 방심해 꼬리를 밟힌다',
      '오해받던 인물의 알리바이가 곧 진범을 지목하는 열쇠가 된다',
      '가짜 동기의 그늘에 진짜 동기가 숨어 있었음이 드러난다',
      '미끼를 심은 솜씨 자체가 진범의 정체를 누설한다',
      '엉뚱한 용의자를 보호하려던 거짓말이 진실의 단서가 된다',
      '두 사건의 잘못된 연결을 끊자 진짜 연결고리가 보인다',
      '미끼가 노린 방향과 정반대 쪽에 범인이 서 있었다',
      '의심받던 자의 결백이 밝혀지며 남은 한 사람만이 범인이 된다',
      '진범이 미끼를 너무 완벽히 다듬은 탓에 부자연스러움이 들킨다',
      '가짜 단서의 출처를 거슬러 올라가니 진범의 손이 닿아 있었다',
      '오해 장치가 깨지는 클라이맥스에서 진실이 한꺼번에 쏟아진다',
      '미끼를 믿은 인물이 위험에 빠져 진범의 본색을 드러내게 한다',
      '진실을 알던 인물이 미끼 덕에 의심을 피하다 결국 입을 연다',
      '관객만 속고 탐정은 미끼를 꿰뚫어 함정을 되돌려 놓는다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 자연스러운 미끼 설계 단락으로 엮는다(슬롯 순서 무관, 의미 단위로 조립).
function compose(by: Record<string, string>): string {
  const target = by.target, clue = by.clue, device = by.device, link = by.link
  const parts: string[] = []
  // 1) 의심 유도 대상
  if (target) parts.push(`독자가 ${target}을(를) 범인으로 의심하게 만든다`)
  // 2) 가짜 단서
  if (clue) parts.push(`이를 위해 ${clue}`)
  // 3) 오해 장치
  if (device) parts.push(`서술은 ${device}`)
  // 4) 진실과의 연결(회수)
  if (link) parts.push(`그러나 ${link}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string }

export default function RedHerringGen({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key)
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'rh_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'rh_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }
  const fallbackCopy = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 프로젝트 본문(HTML) — 완성 설계 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 미끼 설계를 자료(research)/'미스터리' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '미스터리',
      title: `🎣 레드헤링 — ${story.slice(0, 24)}${story.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: { 의심대상: byKey.target || '—', 가짜단서: byKey.clue || '—', 회수: byKey.link || '—' },
    })
    setToast(id ? '프로젝트 자료 〈미스터리〉 폴더에 미끼 설계를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 미끼 설계를 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[레드헤링] ${text}`,
      source: '미끼·떡밥 생성기',
      tags: ['글감', '미스터리', '레드헤링', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 수집함 담기 — 플로팅 수집함에 메모로.
  const stashCurrent = () => {
    if (!hasResults) return
    if (!hasStash()) { setToast('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'note', label: `🎣 레드헤링: ${slotLabelLine}`, text: `${story}\n\n${rowsText()}` })
    setToast('수집함에 담았습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '미스터리',
      title: `🎣 레드헤링 — ${s.text.slice(0, 24)}${s.text.length > 24 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
    })
    setToast(id ? '프로젝트 〈미스터리〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>의심 유도 대상·가짜 단서·오해 장치·진실과의 연결</b> 슬롯을 골라 굴리면, 독자의 시선을 진범에게서 빗겨 가게 하는 레드헤링 한 편을 설계해 줍니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요. <b>좋은 미끼는 반드시 진실과 다시 이어집니다.</b>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎣"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon}/> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 {combos >= 10000 ? '(수만+ 이상)' : ''}
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 미끼 설계 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🎣"/> 미끼 설계</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 독자의 시선을 분산하는 레드헤링 설계가 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🎣"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫</button>
          </div>

          {/* 프로젝트·도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 미끼 설계를 굴려주세요' : '현재 미끼 설계를 프로젝트 자료 〈미스터리〉 폴더에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={stashCurrent} disabled={!hasResults || !hasStash()}
              title={!hasStash() ? '수집함을 사용할 수 없습니다' : !hasResults ? '먼저 미끼 설계를 굴려주세요' : '현재 미끼 설계를 수집함에 담기'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('mystery-clue-planner')}
              title="단서 배치 도구를 열어 진짜 단서와 이 미끼를 함께 설계">
              <Emoji e="🧩"/> 단서 배치 도구 열기
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 미끼 설계가 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 레드헤링을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.slots && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{s.slots}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? <>✓</> : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️"/></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 미끼를 어느 장면·인물에 심고 어디서 회수할지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 미끼 설계를 프로젝트 자료 〈미스터리〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <button className="linkbtn" onClick={() => openToolLinked('mystery-clue-planner')}
                    title="단서 배치 도구를 열어 진짜 단서와 함께 설계">
                    <Emoji e="🧩"/> 단서 배치 도구 열기
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>레드헤링의 황금률: 미끼는 공정해야 합니다. 가짜 단서도 끝에 가서 납득되도록, 반드시 진실과 다시 이어 두세요.</div>
    </div>
  )
}
