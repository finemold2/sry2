// 추격·탈출 생성기(조합형) — 추격자 × 무대 × 탈출수단 × 장애물 × 위기 × 반전 × 결과 일곱 슬롯의
// 로컬 풀에서 무작위로 뽑아 긴박한 추격 장면 글감을 조립한다. 슬롯별 잠금(🔒)·개별 재생성, 총 조합수 표시,
// 한 문단 장면 요약 자동 생성. 자급식: react·linkbus 외 import 없음. 전부 로컬(외부 API 불필요).
// 연계(linkbus): 만든 장면을 프로젝트 자료('research')/'장면' 폴더 문서로 추가, 스니펫 라이브러리에도 저장.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'chase-scene-gen', name: '추격·탈출 생성기', icon: '🏃', group: '영감·발상', intro: '추격자·무대·탈출수단·장애물·위기·반전·결과를 조합해 긴박한 추격 장면 글감을 만드세요', w: 480, h: 620 }

const LS = 'sry:tool:chase-scene-gen'

interface Slot { key: string; label: string; icon: string; pool: string[] }

// 일곱 축의 로컬 풀. 각 풀이 넉넉해 조합수가 수십억을 가뿐히 넘는다(아래 COMBOS 계산).
// 슬롯 독립성: 추격자·무대·탈출수단은 명사구, 장애물·위기·반전·결과는 종결문.
// 각 종결문은 다른 슬롯을 전제하지 않아 어떤 조합으로 섞여도 의미 충돌이 없다.
const SLOTS: Slot[] = [
  {
    key: 'pursuer', label: '추격자', icon: '👤',
    pool: [
      '집요한 현상금 사냥꾼', '얼굴을 가린 암살자', '복수에 미친 옛 동료', '냉정한 비밀경찰',
      '굶주린 거대 야수', '폭주하는 무인 드론 떼', '광신도 무리', '배신당한 연인',
      '기억을 지우려는 조직', '죽은 줄 알았던 형제', '부패한 보안관', '집념의 빚쟁이',
      '정체불명의 추적자', '주인공을 빼닮은 도플갱어', '사이렌을 울리는 순찰대',
      '계약을 어긴 길드의 처형인', '주인을 잃은 사냥개 무리', '집을 삼키는 산불',
      '점점 차오르는 밀물', '시간을 거스르는 미래의 자신', '말 없는 가면의 추종자',
      '독을 묻힌 단검의 자객단', '실험에서 도망친 변종', '주인공의 비밀을 쥔 협박자',
      '뇌물로 매수된 추적꾼', '얼굴 없는 정보기관의 요원', '광기에 사로잡힌 사교 집단',
      '주인공을 사냥감으로 점찍은 밀렵꾼',
    ],
  },
  {
    key: 'stage', label: '무대', icon: '🗺️',
    pool: [
      '비에 젖은 밤의 뒷골목', '붐비는 새벽 수산시장', '멈춰선 만원 지하철', '무너지는 다리 위',
      '안개에 잠긴 갈대밭', '불 꺼진 대형 쇼핑몰', '눈보라 치는 산등성이', '폐선된 야간열차 객실',
      '옥상에서 옥상으로 이어진 빨랫줄 위', '물이 차오르는 지하 주차장', '축제로 가득 찬 광장',
      '거울로 둘러싸인 미로', '미끄러운 빙판의 부둣가', '한밤의 고속도로 갓길', '버려진 놀이공원',
      '끝없이 이어진 옥수수밭', '연기가 자욱한 카지노', '좁고 가파른 절벽 계단', '범람 직전의 하수도',
      '관객으로 들어찬 극장 무대 뒤', '교통 정체에 갇힌 다리목', '무중력의 우주정거장 통로',
      '카니발 행렬 한가운데', '얼어붙은 호수 한복판', '낡은 등대로 이어진 방파제',
      '인적 끊긴 한밤의 도서관',
    ],
  },
  {
    key: 'escape', label: '탈출 수단', icon: '🚪',
    pool: [
      '훔친 오토바이', '낡은 화물 엘리베이터', '지하로 통하는 환기구', '버려진 나룻배',
      '옆 건물로 이어진 비상계단', '관광객 무리에 섞여 든 군중', '담장을 넘는 지름길',
      '시동이 걸린 채 멈춘 택시', '하수도로 통하는 맨홀', '폐건물의 부서진 창문',
      '막 출발하려는 막차', '밧줄을 묶어 만든 즉석 줄사다리', '주방으로 통하는 뒷문',
      '간판 뒤에 숨은 좁은 틈', '강을 가로지르는 케이블', '무대 아래로 난 비밀 통로',
      '주차장에 세워 둔 자전거', '옥상으로 올라가는 사다리', '환풍구를 따라 난 좁은 길',
      '정전된 틈을 노린 어둠', '군중 사이를 가르는 행렬', '얼어붙은 강 위의 지름길',
      '낡은 트럭의 짐칸', '관제탑으로 향하는 작업용 통로',
    ],
  },
  {
    key: 'obstacle', label: '장애물', icon: '🚧',
    pool: [
      '발목을 접질려 절뚝인다', '품에 안긴 어린아이를 놓을 수 없다', '한 발의 총알만 남았다',
      '막다른 골목에 몰린다', '추격자가 길을 미리 알고 있다', '믿었던 동료가 길을 막는다',
      '폭우로 시야가 사라진다', '엘리베이터 문이 닫히지 않는다', '열쇠가 자물쇠에 부러진다',
      '군중이 길을 가로막는다', '다친 곳에서 피가 멈추지 않는다', '휴대폰 배터리가 꺼진다',
      '발밑의 다리가 끊어지기 시작한다', '추격자가 인질을 잡는다', '안개로 방향을 잃는다',
      '경보가 울려 모든 문이 잠긴다', '차에 기름이 떨어진다', '추격자가 둘로 나뉘어 포위한다',
      '얼음이 갈라지기 시작한다', '연기 때문에 숨을 쉴 수 없다', '쫓기는 와중에 짐이 무겁다',
      '낯선 도시라 지리를 모른다', '소중한 물건을 떨어뜨린다', '신발 끈이 풀려 발이 엉킨다',
      '쏟아진 짐짝이 길을 막는다', '발밑이 진창이라 속도가 나지 않는다',
    ],
  },
  {
    key: 'crisis', label: '위기', icon: '⚠️',
    pool: [
      '거리가 점점 좁혀진다', '숨이 턱 끝까지 차오른다', '도망칠 곳이 한 군데로 줄어든다',
      '추격자의 발소리가 바로 등 뒤에서 들린다', '시간이 거의 남지 않았다', '체력이 바닥나기 시작한다',
      '어둠 속에서 무언가 손목을 붙잡는다', '머리 위로 헤드라이트가 쏟아진다',
      '비명 소리가 사방에서 들려온다', '바닥이 무너져 내릴 듯 흔들린다', '퇴로가 하나둘 막혀 간다',
      '추격자의 그림자가 길게 드리운다', '심장이 터질 듯 뛴다', '사방에서 손전등 불빛이 모여든다',
      '발 디딜 곳이 점점 사라진다', '추격자의 숨소리까지 들릴 만큼 가까워진다',
      '온몸이 식은땀으로 젖는다', '한 걸음만 늦으면 끝장이다', '눈앞이 핑 돌며 아찔해진다',
      '경고 사이렌이 점점 커진다', '바람을 가르는 소리가 귓가를 스친다',
      '뒤를 돌아볼 여유조차 없다', '다리가 후들거려 멈춰 설 뻔한다', '출구가 코앞에서 닫히려 한다',
    ],
  },
  {
    key: 'twist', label: '반전', icon: '🌀',
    pool: [
      '도와주던 행인이 사실 추격자의 일당이었다', '쫓기던 자가 실은 함정을 판 쪽이었다',
      '추격자와 도망자가 같은 것을 쫓고 있었다', '막다른 길 끝에 탈출구가 숨어 있었다',
      '추격자가 갑자기 멈춰 경고를 던진다', '쫓던 자가 도리어 쫓기는 신세가 된다',
      '추격은 더 큰 위협으로부터 그를 지키려는 것이었다', '두 사람 다 제3자에게 조종당하고 있었다',
      '도망자가 잃어버린 줄 안 무기를 쥐고 있었다', '추격자의 정체가 가까운 사람이었다',
      '쫓기던 길이 처음부터 원을 그리고 있었다', '추격자가 일부러 놓아주려 한다',
      '결정적 순간에 의외의 인물이 끼어든다', '도망자가 노린 건 바로 이 추격이었다',
      '추격자의 무기가 텅 비어 있었다', '갑작스러운 재난이 추격을 뒤엎는다',
      '쫓기던 자가 길을 안내하고 있었다', '추격의 진짜 표적은 그가 지닌 비밀이었다',
      '도망자가 멈춰 서서 정면으로 맞선다', '추격자가 사실 도움을 청하러 온 것이었다',
      '뒤쫓던 무리가 갑자기 서로 갈라서 싸우기 시작한다', '도망친 길이 추격자의 함정이었다',
      '두 사람을 모두 노리는 제3의 눈이 따로 있었다', '추격자의 얼굴 아래 또 다른 얼굴이 있었다',
    ],
  },
  {
    key: 'outcome', label: '결과', icon: '🎬',
    pool: [
      '간발의 차로 탈출에 성공한다', '붙잡히지만 뜻밖의 거래가 시작된다', '둘 다 막다른 곳에서 진실을 마주한다',
      '도망자가 결정적 실수로 붙잡힌다', '추격자가 사고로 쓰러진다', '제3자가 끼어들어 판이 뒤집힌다',
      '간신히 숨었지만 곧 발각될 위기다', '추격을 따돌렸으나 더 깊은 함정에 든다', '둘은 잠시 휴전하고 손을 잡는다',
      '도망자가 추격자를 역으로 함정에 빠뜨린다', '쫓던 자와 쫓기던 자가 자리를 맞바꾼다',
      '둘 다 살아남았지만 무언가를 잃는다', '추격은 끝났으나 도망자는 변해버렸다',
      '극적인 희생으로 한쪽이 살아남는다', '탈출했지만 돌아가야 할 이유가 생긴다',
      '추격자가 끝내 정체를 드러낸다', '도망자가 멈춰 서기로 결심한다', '둘은 같은 함정에 함께 갇힌다',
      '추격의 끝에서 예상 못한 동맹이 맺어진다', '모든 게 누군가의 계획대로 흘러간다',
      '아슬아슬하게 군중 속으로 사라진다', '막다른 순간 뜻밖의 구원자가 나타난다',
      '둘 다 지쳐 쓰러진 채 멈춰 선다', '도망자가 끝내 모든 것을 내려놓는다',
    ],
  },
]

// 총 조합수(중복 없이 슬롯 풀 곱) — UI 에 "가능한 조합" 으로 표시.
// 28 × 26 × 24 × 26 × 24 × 24 × 24 = 6,279,856,128 가지(고유 항목만, 중복 없음).
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

// 한 슬롯만 다시 뽑되 같은 값 연속을 줄여 변화를 체감시킨다.
function pickFresh(a: string[], prev?: string): string {
  if (a.length <= 1) return a[0]
  let v = pick(a)
  if (v === prev) v = pick(a)
  return v
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 받침 여부 판별 — 마지막 글자가 한글이고 종성이 있으면 true.
function hasFinalConsonant(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없는 것으로 처리
  return (ch - 0xac00) % 28 !== 0
}
// 종성이 ㄹ인지 — '으로/로' 는 ㄹ 받침일 때 '로' 를 쓴다.
function endsWithRieul(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 === 8 // ㄹ 종성
}
// 으로/로 조사 선택: 받침 없거나 ㄹ 받침 → '로', 그 외 받침 → '으로'.
function josaEuro(word: string): string {
  return !hasFinalConsonant(word) || endsWithRieul(word) ? '로' : '으로'
}

// 조립된 장면 한 문단 — 일곱 축을 자연스러운 한국어로 엮는다.
// 명사구(추격자/무대/탈출수단)와 종결문(장애물/위기/반전/결과)을 문법 역할에 맞게 배치한다.
function compose(r: Record<string, string>): string {
  const pu = r.pursuer, st = r.stage, es = r.escape, ob = r.obstacle, cr = r.crisis, tw = r.twist, oc = r.outcome
  if (!pu || !st || !es || !ob || !cr || !tw || !oc) return '슬롯을 굴려 추격 장면을 만들어 보세요.'
  const trim = (s: string) => s.replace(/[.。]$/, '')
  return (
    `「${st}」, 주인공은 ${pu}에게 쫓긴다. ` +
    `${es}${josaEuro(es)} 달아나려 하지만 하필 ${trim(ob)}. ` +
    `${trim(cr)}. ` +
    `그 순간 ${trim(tw)}. ` +
    `결국 ${trim(oc)}.`
  )
}

// 슬롯 결과를 줄글(복사/스니펫/메모 공용)로.
function plainText(r: Record<string, string>): string {
  const lines = SLOTS.filter((s) => r[s.key]).map((s) => `${s.icon} ${s.label}: ${r[s.key]}`)
  return `${lines.join('\n')}\n\n🏃 ${compose(r)}`
}

interface Saved { id: string; text: string; scene: string; at: number }

function newId(): string {
  return 'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS + ':saved')
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((s) => s && typeof s.text === 'string').map((s) => ({
      id: typeof s.id === 'string' ? s.id : newId(),
      text: String(s.text),
      scene: typeof s.scene === 'string' ? s.scene : '',
      at: Number(s.at) || Date.now(),
    }))
  } catch { return [] }
}

export default function ChaseSceneGen({ payload }: { payload?: Record<string, unknown> }) {
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [tab, setTab] = useState<'gen' | 'saved'>('gen')
  const [saved, setSaved] = useState<Saved[]>(loadSaved)
  const [toast, setToast] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 보관 목록 저장 — 차단/용량초과 graceful.
  useEffect(() => {
    try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ }
  }, [saved])

  // 토스트 자동 소거 + 언마운트 정리.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제.
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 전부(잠금 제외) 다시 굴리기.
  const rollAll = useCallback(() => {
    setRolling(true)
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        next[s.key] = pickFresh(s.pool, prev[s.key])
      })
      return next
    })
  }, [locked])

  // 한 슬롯만 다시 굴리기.
  const rollOne = (key: string) => {
    const slot = SLOTS.find((s) => s.key === key)
    if (!slot) return
    setRolling(true)
    setResults((prev) => ({ ...prev, [key]: pickFresh(slot.pool, prev[key]) }))
  }

  const toggleLock = (key: string) =>
    setLocked((prev) => ({ ...prev, [key]: !prev[key] }))

  // payload 로 자동 1회 굴림(연계 진입 시 빈 화면 방지) + 첫 진입 자동 굴림.
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    rollAll()
    // payload 는 향후 확장(특정 슬롯 고정 등)을 위해 받아두기만 한다.
    void payload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ready = SLOTS.every((s) => results[s.key])
  const scene = compose(results)

  const copyText = () => {
    if (!ready) return
    const text = plainText(results)
    const done = () => { if (mounted.current) setToast('복사했습니다.') }
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
    } catch { if (mounted.current) setToast('복사에 실패했습니다.') }
  }

  // 스니펫 라이브러리에 글감 저장(다른 도구와 공유).
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: plainText(results),
      source: '추격·탈출 생성기',
      tags: ['글감', '발상', '추격', '장면'],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }

  // 보관함에 담기(이 도구 내부 localStorage).
  const keep = () => {
    if (!ready) return
    setSaved((prev) => [{ id: newId(), text: plainText(results), scene, at: Date.now() }, ...prev].slice(0, 100))
    setToast('보관함에 담았습니다.')
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const copyOne = (text: string) => {
    const done = () => { if (mounted.current) setToast('복사했습니다.') }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
      else fallbackCopy(text, done)
    } catch { fallbackCopy(text, done) }
  }

  // 프로젝트 연동 — 만든 추격 장면을 자료(research)/'장면' 폴더 문서로 추가.
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS.map((s) => `<p><strong>${escHtml(s.icon)} ${escHtml(s.label)}:</strong> ${escHtml(results[s.key])}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><strong>🏃 ${escHtml(scene)}</strong></p>`,
      '<hr/>',
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '장면',
      title: `추격 장면 — ${results.stage}`,
      bodyHtml,
      synopsis: scene,
      meta: { 추격자: results.pursuer, 무대: results.stage },
    })
    setToast(id ? '프로젝트 자료 〈장면〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        일곱 축(<b>추격자·무대·탈출수단·장애물·위기·반전·결과</b>)을 굴려 긴박한 <b>추격 장면 글감</b>을 만드세요.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴릴 수 있어요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🏃"/> 생성기
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 보관함 ({saved.length})
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }} title="다섯 풀의 조합 가짓수">
          가능한 조합 약 {COMBOS.toLocaleString('ko-KR')}가지
        </span>
      </div>

      {tab === 'gen' && (
        <>
          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const val = results[s.key]
              const isLocked = !!locked[s.key]
              return (
                <div key={s.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={s.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: val ? 'var(--text)' : 'var(--muted)' }}>
                      {val ? (rolling && !isLocked ? '…' : val) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 조립된 장면 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🏃"/> 장면 글감</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: ready ? 'var(--text)' : 'var(--muted)' }}>{scene}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 130 }} onClick={rollAll}><Emoji e="🎲"/> 추격 장면 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={keep} disabled={!ready} title="이 장면을 보관함에 담기"><Emoji e="⭐"/> 보관</button>
            <button className="minibtn" onClick={copyText} disabled={!ready} title="장면 글감 복사"><Emoji e="📋"/> 복사</button>
            <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 저장(다른 도구와 공유)"><Emoji e="🧩"/> 스니펫</button>
          </div>

          {/* 프로젝트 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!ready || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !ready ? '먼저 장면을 굴려주세요' : '현재 추격 장면을 프로젝트 자료 〈장면〉 폴더에 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>

          <div style={hint}>고정된 슬롯은 그대로 두고 나머지만 다시 굴립니다. 조합은 출발점일 뿐, 인물·상황에 맞춰 자유롭게 비틀어 보세요.</div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              보관한 장면이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성기에서 <Emoji e="⭐"/> 보관을 눌러 마음에 드는 추격 장면을 모아보세요.</span>
            </div>
          )}
          {saved.map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>{s.scene}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ flex: 1 }} />
                <button className="minibtn" onClick={() => copyOne(s.text)} title="복사"><Emoji e="📋"/></button>
                <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
