// 인물 버릇·틱 생성기 — 인물에게 살아있는 개성(틱)을 부여하는 네 슬롯 조합 생성기.
//  말버릇 × 몸짓 습관 × 감정 표출 버릇 × 소지품 습관 네 축을 각 로컬 표에서 한 조각씩 뽑아
//  "어떻게 말하고·무의식적으로 무엇을 하며·감정이 어디로 새어 나오고·무엇을 만지작거리는가"를
//  한 인물의 버릇 묶음으로 엮어 준다. 마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다.
//  말버릇·몸짓·감정 표출은 각 슬롯에 여러 갈래 카탈로그(빈도/맥락별)를 두어 같은 축도 매번 변주된다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 버릇 묶음을 인물 라이브러리/프로젝트(인물) 카드로 추가하고, 수집함·스니펫에도 담는다.
//   openToolLinked('character-sheet') 로 인물 시트로 이어 작성한다.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'character-tic-gen', name: '인물 버릇·틱 생성기', icon: '🎭', group: '캐릭터', intro: '말버릇·몸짓·감정 표출·소지품 습관을 슬롯 조합으로 굴려 인물에게 살아있는 개성을 부여하세요', w: 580, h: 700 }

const LS = 'sry:tool:character-tic-gen'

// ---- 슬롯 정의 ----
// 각 슬롯은 인물 개성의 한 축. faces = 그 축의 후보(로컬 자작 표). 충분히 다양하게.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'speech', label: '말버릇', icon: '💬', desc: '입에 밴 말투·입버릇·구두 습관',
    faces: [
      '문장 끝마다 "그치?"를 붙여 동의를 구한다',
      '말을 시작하기 전 "음…" 하고 한 박자 뜸을 들인다',
      '중요한 말은 두 번씩 되풀이해 강조한다',
      '"솔직히 말하면" 을 입버릇처럼 붙인다',
      '긴장하면 말이 빨라지고 끝이 흐려진다',
      '농담을 던지고 혼자 먼저 웃어 버린다',
      '상대의 마지막 말을 그대로 따라 읊는다',
      '"아니 근데" 로 모든 반박을 시작한다',
      '존댓말과 반말을 무의식중에 뒤섞는다',
      '말끝을 항상 "~거든요" 로 맺는다',
      '대화 중 자꾸 "어디까지 말했더라" 하고 길을 잃는다',
      '비유와 속담을 끌어다 쓰길 좋아한다',
      '곤란하면 일부러 사투리를 과장해 웃어넘긴다',
      '문장마다 "뭐랄까" 를 끼워 넣으며 단어를 고른다',
      '상대를 부를 때 늘 별명이나 직책으로만 부른다',
      '진심일수록 목소리를 낮추고 천천히 말한다',
      '말끝에 작게 헛기침을 덧붙이는 버릇이 있다',
      '확신이 없으면 "아마도", "그럴걸요" 로 빠져나간다',
      '남의 말을 끝까지 안 듣고 "알아 알아" 하고 가로챈다',
      '감탄사 "와" 와 "헐" 을 시도 때도 없이 쓴다',
      '말 사이사이 "있잖아" 로 호흡을 고른다',
      '핵심을 먼저 던지고 설명은 뒤에 붙인다',
      '질문에 질문으로 되받아치는 버릇이 있다',
      '혼잣말이 많아 생각을 소리 내어 정리한다',
    ],
  },
  {
    key: 'gesture', label: '몸짓 습관', icon: '🤲', desc: '무의식적으로 반복하는 손짓·자세·동작',
    faces: [
      '생각할 때 턱을 손가락으로 톡톡 두드린다',
      '말하며 자꾸 머리카락을 귀 뒤로 넘긴다',
      '긴장하면 손가락 마디를 하나씩 꺾는다',
      '대화 중 한쪽 발로 바닥을 까딱거린다',
      '집중하면 무의식적으로 입술을 깨문다',
      '서 있을 때 늘 한쪽 다리에 무게를 싣고 비스듬히 선다',
      '난처하면 목덜미를 쓱 문지른다',
      '앉으면 다리를 떨거나 펜을 빙글빙글 돌린다',
      '상대 말이 끝나면 고개를 천천히 끄덕여 받는다',
      '기쁘면 손뼉을 짧게 한 번 친다',
      '걸을 때 양손을 주머니에 깊이 찔러 넣는다',
      '눈을 마주치기 전 잠깐 시선을 아래로 내린다',
      '말하며 손으로 허공에 그림을 그린다',
      '결심이 서면 두 손을 무릎에 탁 짚고 일어난다',
      '듣는 동안 팔짱을 끼고 살짝 몸을 뒤로 젖힌다',
      '긴장을 풀려 어깨를 크게 한 번 돌린다',
      '미안할 때 손바닥을 모아 가볍게 비빈다',
      '몰입하면 안경을 자꾸 밀어 올린다',
      '대답하기 전 코끝을 살짝 매만진다',
      '기다릴 때 손목시계나 빈 손목을 들여다본다',
      '웃을 때 손으로 입가를 가리는 버릇이 있다',
      '화제가 바뀌면 의자를 끌어 앉음새를 고친다',
      '곤란하면 눈썹을 한쪽만 치켜올린다',
      '걸으며 발끝으로 살짝살짝 통통 튀듯 걷는다',
    ],
  },
  {
    key: 'emotion', label: '감정 표출 버릇', icon: '🌡️', desc: '감정이 무심코 새어 나오는 통로',
    faces: [
      '화가 나면 오히려 더 조용하고 정중해진다',
      '당황하면 귀와 목덜미부터 빨갛게 달아오른다',
      '슬픔을 농담으로 덮어 웃어넘기려 한다',
      '기쁠수록 일부러 무덤덤한 척한다',
      '불안하면 같은 질문을 자꾸 되묻는다',
      '감격하면 말문이 막혀 눈가만 붉어진다',
      '거짓말할 때 눈을 너무 똑바로 맞춘다',
      '서운하면 입을 닫고 일에만 몰두한다',
      '긴장하면 갑자기 사소한 농담을 던진다',
      '좋아하는 마음일수록 퉁명스럽게 군다',
      '두려우면 손이 차가워지고 말수가 줄어든다',
      '분노가 차오르면 목소리가 점점 낮아진다',
      '감정이 벅차면 시선을 창밖으로 돌려 버린다',
      '기분이 좋으면 콧노래가 절로 새어 나온다',
      '미안한 마음을 행동으로만 갚으려 한다',
      '상처받으면 먼저 상대를 챙기며 자기 감정을 숨긴다',
      '설레면 말이 평소보다 두 배로 많아진다',
      '실망하면 한숨 대신 짧게 헛웃음을 흘린다',
      '울고 싶을 때 괜히 화제를 돌려 자리를 뜬다',
      '감정이 격해지면 손끝부터 미세하게 떨린다',
      '부끄러우면 괜히 머리부터 매만진다',
      '안도하면 참았던 숨을 길게 내쉰다',
      '질투를 칭찬으로 위장해 비꼰다',
      '벅찬 감동은 한참 뒤에야 혼자 곱씹는다',
    ],
  },
  {
    key: 'object', label: '소지품 습관', icon: '🧷',
    desc: '늘 지니거나 만지작거리는 물건·소품 습관',
    faces: [
      '낡은 손수건을 늘 주머니에 넣고 다닌다',
      '생각이 막히면 펜 뚜껑을 딸깍딸깍 누른다',
      '손목의 가죽 팔찌를 무의식적으로 돌린다',
      '주머니 속 동전을 손가락으로 굴린다',
      '낡은 회중시계를 자주 열었다 닫는다',
      '안경을 벗어 옷자락에 닦는 버릇이 있다',
      '늘 책 한 권을 가방에 넣고 다니며 틈틈이 펼친다',
      '목에 건 펜던트를 긴장하면 꼭 쥔다',
      '담뱃갑을 만지작거리지만 정작 피우진 않는다',
      '손수 깎은 연필만 고집해 늘 작은 칼을 지닌다',
      '낡은 사진 한 장을 지갑에 끼워 다닌다',
      '커피 잔의 손잡이를 자꾸 손끝으로 매만진다',
      '열쇠고리를 손가락에 걸고 빙글빙글 돌린다',
      '메모지에 의미 없는 도형을 끄적이는 버릇',
      '향이 밴 손편지를 접었다 폈다 반복한다',
      '낡은 만년필에 직접 잉크를 채워 쓴다',
      '늘 같은 머그잔이 아니면 마음이 불편하다',
      '실 끊긴 단추를 버리지 못하고 모은다',
      '주머니에서 사탕이나 박하를 자주 꺼내 입에 문다',
      '손때 묻은 수첩을 어디서든 펼쳐 적는다',
      '반지를 뺐다 끼었다 하며 생각을 정리한다',
      '낡은 라이터의 뚜껑을 의미 없이 여닫는다',
      '늘 이어폰 한쪽만 꽂은 채 사람을 대한다',
      '작은 부적 주머니를 옷 안쪽에 꿰매 둔다',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 활성 슬롯들의 조합 가짓수. 수만+ 표시용.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}

// 굴린 결과들을 인물 개성 묘사 한 단락으로 엮는다(의미 단위로 조립).
function compose(by: Record<string, string>, name: string): string {
  const who = name.trim() ? name.trim() : '이 인물'
  const parts: string[] = []
  if (by.speech) parts.push(`${who}은(는) ${by.speech}`)
  if (by.gesture) parts.push(parts.length ? `또 ${by.gesture}` : `${who}은(는) ${by.gesture}`)
  if (by.emotion) parts.push(`${by.emotion}`)
  if (by.object) parts.push(`${by.object}`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; name: string; text: string; note: string; slots: string; rows: string }

export default function CharacterTicGen({ payload }: { payload?: Record<string, unknown> }) {
  // 인물 이름(선택) — 페이로드로 넘어오면 채움
  const [name, setName] = useState<string>('')

  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 사용자 정의 항목(직접 적는 빈 칸) + 고정 '기타' 자유 입력. 무작위 생성 안 함(미리 만든 데이터 없음).
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  // 사용자 정의 항목 추가 — 라벨만 입력받고 값은 빈 칸으로 시작(사용자가 직접 작성).
  const addCustomItem = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요(예: 좌우명, 트라우마, 식습관)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: 'cst_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustomItem = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'tic_' + i,
            name: typeof s.name === 'string' ? s.name : '',
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

  // 페이로드로 이름/슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const wantName = payload?.name
    if (typeof wantName === 'string' && wantName.trim()) setName(wantName.trim())
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
    // 무작위 재생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되 항목(이름)은 유지.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
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
  const story = useMemo(() => (hasResults ? compose(byKey, name) : ''), [results, name, active])
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => {
    const base = rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`)
    custom.forEach((c) => { if (c.value.trim()) base.push(`• ${c.label}: ${c.value.trim()}`) })
    if (etc.trim()) base.push(`📝 기타: ${etc.trim()}`)
    return base.join('\n')
  }

  // 다른 도구로 보내는 엔티티 fields 맵에 합칠 사용자 정의·기타(비어있지 않을 때만).
  const extraFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    custom.forEach((c) => { if (c.label.trim() && c.value.trim()) f[c.label.trim()] = c.value.trim() })
    if (etc.trim()) f.etc = etc.trim()
    return f
  }

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story && s.name === name.trim())) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'tic_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        name: name.trim(),
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

  // 프로젝트 본문(HTML) — 완성 묘사 + 슬롯별 분해.
  const bodyHtmlFor = (nm: string, text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      nm ? `<p style="font-size:13px;color:#888;">인물: ${escHtml(nm)}</p>` : '',
      `<p style="font-size:15px;line-height:1.8;">${escHtml(text)}</p>`,
      `<hr/>`,
      slots ? `<p><b>버릇 축:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 버릇 묶음을 인물 카드로 추가(자료/'인물' 폴더).
  const addToProj = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const nm = name.trim() || '이름 미정 인물'
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: `🎭 ${nm} — 버릇`,
      bodyHtml: bodyHtmlFor(name.trim(), story, rowsText(), slotLabelLine),
      synopsis: story,
      character: {
        name: nm,
        habits: [byKey.speech, byKey.gesture, byKey.object].filter(Boolean).join(' / '),
        // 정규(표준) 캐릭터 키로 평면 매핑 — 받는 카드(인물 시트/DB)에서 제자리 칸에 들어가도록 추가.
        ...(byKey.speech ? { speech: byKey.speech } : {}),       // 말버릇 → 말투(speech)
        ...(byKey.gesture ? { habit: byKey.gesture } : {}),      // 몸짓 습관 → 습관(habit)
        ...(byKey.object ? { quirk: byKey.object } : {}),        // 소지품 습관 → 독특한 점(quirk)
        personality: byKey.emotion || '',                       // 감정 표출 버릇 → 성격(personality)
        notes: story,
        // 사용자 정의 항목·기타 → 캐릭터 필드 맵(라벨=키)에 직접 합침(인물 시트·DB 등에서 그대로 표시).
        ...extraFields(),
      },
      meta: {
        말버릇: byKey.speech || '—',
        몸짓: byKey.gesture || '—',
        감정표출: byKey.emotion || '—',
        소지품: byKey.object || '—',
        ...extraFields(),
      },
    })
    setToast(id ? '프로젝트 자료 〈인물〉 폴더에 버릇 카드를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 인물 라이브러리에 버릇을 트레이트로 저장(여러 도구가 공유: 인물 시트/관계도 등).
  const addToLib = (nm: string, list: { slot: Slot; face: string }[], desc: string) => {
    if (!list.length) return
    const libName = nm.trim() || '이름 미정 인물'
    // 슬롯 결과를 정규 캐릭터 키로 1:1 매핑(받는 도구가 표준 항목으로 인식).
    const libFields: Record<string, string> = { name: libName }
    list.forEach((r) => {
      if (!r.face) return
      if (r.slot.key === 'speech') libFields.speech = r.face         // 말버릇 → 말투
      else if (r.slot.key === 'gesture') libFields.habit = r.face    // 몸짓 습관 → 습관
      else if (r.slot.key === 'object') libFields.quirk = r.face     // 소지품 습관 → 독특한 점
      else if (r.slot.key === 'emotion') libFields.personality = r.face // 감정 표출 → 성격
    })
    if (desc) libFields.notes = desc
    // 사용자 정의 항목·기타도 라이브러리 fields/traits 에 그대로 실어 보냄(다른 도구에서 표시).
    Object.assign(libFields, extraFields())
    const extraTraits = [
      ...custom.filter((c) => c.label.trim() && c.value.trim()).map((c) => ({ k: c.label.trim(), v: c.value.trim() })),
      ...(etc.trim() ? [{ k: '기타', v: etc.trim() }] : []),
    ]
    addToLibrary('characters', {
      name: libName,
      traits: [...list.map((r) => ({ k: r.slot.label, v: r.face })), ...extraTraits],
      personality: desc,
      fields: libFields,
      source: '인물 버릇·틱 생성기',
    })
    setToast('인물 라이브러리에 저장했습니다(인물 시트·관계도에서 사용).')
  }

  // 수집함에 담기
  const toStash = (text: string, nm: string) => {
    if (!text) return
    addToStash({ kind: 'note', label: `🎭 ${nm.trim() || '인물'} 버릇`, text })
    setToast('수집함에 담았습니다.')
  }

  // 스니펫 라이브러리에 저장
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[인물 버릇] ${text}`,
      source: '인물 버릇·틱 생성기',
      tags: ['글감', '인물', '버릇', ...slots.split('·').filter(Boolean)],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const nm = s.name.trim() || '이름 미정 인물'
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물',
      title: `🎭 ${nm} — 버릇`,
      bodyHtml: bodyHtmlFor(s.name.trim(), s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      // 정규 캐릭터 키로 매핑(저장 항목은 합쳐진 묘사만 보유 → name·notes 만 안전 매핑).
      character: { name: nm, notes: s.text },
    })
    setToast(id ? '프로젝트 〈인물〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>말버릇·몸짓 습관·감정 표출 버릇·소지품 습관</b> 네 축을 굴려 인물에게 살아있는 개성(틱)을 부여합니다. 마음에 드는 축은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🎭"/> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 인물 이름(선택) */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="인물 이름(선택) — 묘사 문장에 반영됩니다"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' }}
          />

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
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 축 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}

            {/* 사용자 정의 항목 — 직접 적는 빈 칸(무작위 생성 안 함) */}
            {custom.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0 }}><Emoji e="✏️"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.label}</div>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 입력…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
                <button className="minibtn" onClick={() => removeCustomItem(c.id)} title="항목 삭제"
                  style={{ flexShrink: 0, borderColor: 'var(--warn)', color: 'var(--warn)' }}>✕</button>
              </div>
            ))}

            <button className="minibtn" onClick={addCustomItem} style={{ alignSelf: 'flex-start' }} title="내가 원하는 항목을 직접 추가">
              ＋ 항목 추가
            </button>

            {/* 고정 '기타' 자유 입력 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="📝"/> 기타</div>
              <textarea
                value={etc}
                onChange={(e) => setEtc(e.target.value)}
                placeholder="이 인물에 대해 자유롭게 적어두세요(설정·메모·아이디어 등)…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* 완성 묘사 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🎭"/> 인물 개성 묘사</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '축을 골라 굴리면, 한 인물의 살아있는 버릇 묶음이 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="🎲"/> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐"/> 보관</button>
          </div>

          {/* 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addToProj} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 버릇을 굴려주세요' : '현재 버릇 묶음을 프로젝트 자료 〈인물〉 폴더에 인물 카드로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => addToLib(name, rolledList, story)} disabled={!hasResults}
              title="인물 라이브러리에 버릇 트레이트로 저장(인물 시트·관계도에서 공유)">
              <Emoji e="📥"/> 인물 라이브러리
            </button>
            <button className="linkbtn" onClick={() => toStash(story, name)} disabled={!hasResults || !hasStash()}
              title={!hasStash() ? '수집함이 활성화되어 있지 않습니다' : '현재 버릇 묶음을 수집함에 담기'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults}
              title="글감 스니펫 라이브러리에 저장">
              <Emoji e="✂️"/> 스니펫
            </button>
            <button className="linkbtn" onClick={() => {
              const ef = extraFields()
              const pl: Record<string, unknown> = {}
              if (name.trim()) pl.name = name.trim()
              if (Object.keys(ef).length) pl.fields = ef
              openToolLinked('character-sheet', Object.keys(pl).length ? pl : undefined)
            }}
              title="인물 시트로 이어서 작성">
              <Emoji e="🪪"/> 인물 시트
            </button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 인물 버릇이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 인물 개성을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.name && <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}><Emoji e="🎭"/> {s.name}</span>}
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
                  placeholder="이 버릇을 어느 장면·관계에서 드러낼지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 버릇 묶음을 프로젝트 자료 〈인물〉 폴더에 추가'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                  <button className="linkbtn" onClick={() => toStash(s.text, s.name)} disabled={!hasStash()}
                    title={!hasStash() ? '수집함이 활성화되어 있지 않습니다' : '수집함에 담기'}>
                    <Emoji e="📎"/> 수집함
                  </button>
                  <button className="linkbtn" onClick={() => openToolLinked('character-sheet', s.name.trim() ? { name: s.name.trim() } : undefined)}
                    title="인물 시트로 이어서 작성">
                    <Emoji e="🪪"/> 인물 시트
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>✓ {toast}</div>}
      <div style={hint}>버릇은 인물을 살아 숨 쉬게 합니다. 같은 조합이라도 내 인물의 상처·관계에 맞춰 드러나는 순간을 골라 보세요.</div>
    </div>
  )
}
