// 첫 만남 생성기(조합형) — 두 인물이 "처음 만나는 순간"을 슬롯 조합으로 빚는다.
//   장소 × 상황 × 첫인상(A가 B에게) × 첫인상(B가 A에게) × 갈등의 씨앗  →  관계의 시작 한 장면.
//   잠긴 슬롯은 고정하고 나머지만 다시 굴린다(🔒). 조합 수(수만+)를 표시한다.
//   생성한 장면은 스니펫으로 저장(라이브러리 공유)·프로젝트 자료 〈인물〉 폴더에 추가·인물 시트로 연계.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·라이브러리 불필요(Math.random + localStorage).
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, useLibraryList, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'first-meeting-gen', name: '첫 만남 생성기', icon: '🤝', group: '영감·발상', intro: '장소·상황·첫인상·갈등의 씨앗을 조합해 두 인물의 첫 만남을 만드세요', w: 560, h: 680 }

const LS = 'sry:tool:first-meeting-gen'

// ---------- 슬롯 풀 ----------
interface Slot { key: string; label: string; icon: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'place', label: '만나는 장소', icon: '📍',
    faces: [
      '비 내리는 버스 정류장', '문 닫기 직전의 헌책방', '연착된 막차 안', '낯선 도시의 환승역', '한밤의 24시 편의점',
      '장례식장 뒤뜰', '비좁은 엘리베이터 안', '옥상 빨래 너는 자리', '단골 카페의 구석 자리', '폭우로 멈춘 지하철 객차',
      '동네 빨래방의 마지막 건조기 앞', '응급실 대기 의자', '이사 가는 옆집 문 앞', '눈 쌓인 산장의 난롯가', '정전된 사무실 복도',
      '바닷가 새벽 어시장', '낡은 도서관 열람실', '꽃집 앞 좌판', '심야 라디오 부스', '비행기 옆자리',
      '재개발로 헐리는 골목', '강가의 버려진 다리 아래', '동물 보호소 입양 창구', '결혼식 하객 테이블', '병원 옥상 정원',
      '시골 간이역 플랫폼', '심야 포장마차', '오래된 극장 마지막 상영관', '눈보라에 갇힌 휴게소', '온천 마을 골목 목욕탕',
    ],
  },
  {
    key: 'situation', label: '처음 마주친 상황', icon: '🎬',
    faces: [
      '같은 우산을 동시에 집으려다', '떨어뜨린 물건을 대신 주워주다', '서로를 다른 사람으로 착각하고', '한 자리를 두고 다투다가', '길을 묻다가 엉뚱한 곳으로 함께 헤매고',
      '쓰러진 사람을 함께 부축하다', '마지막 남은 한 자리를 양보하다', '같은 책을 동시에 집어 들고', '소매치기를 함께 쫓다가', '실수로 짐이 뒤바뀌어',
      '같은 사람을 기다리다 마주치고', '비를 피해 같은 처마 밑에 서서', '잘못 걸려 온 전화로 이어져', '서로의 우산이 바람에 뒤집힌 채로', '길 잃은 아이를 같이 찾아주다',
      '한쪽이 다른 쪽의 실수를 목격하고', '같은 메모를 우연히 줍고', '낯선 이의 부탁을 얼결에 떠맡고', '서로를 도둑으로 오해하고', '버려진 동물을 두고 실랑이하다',
      '쏟은 음료를 닦아주려다', '같은 노래를 흥얼거리는 걸 들키고', '계산이 모자라 대신 내주다', '엘리베이터에 함께 갇혀', '서로의 이름표가 바뀐 채로',
      '한 사람의 거짓말을 다른 사람이 눈치채고', '잃어버린 지갑을 주워 돌려주려다', '같은 면접장에서 경쟁자로', '서로의 자리를 잘못 앉아', '취한 사람을 떠맡게 되어',
    ],
  },
  {
    key: 'impressionA', label: 'A가 B에게 받은 첫인상', icon: '👁️',
    faces: [
      '눈빛이 너무 차가워서 무서웠다', '이상하게 낯이 익었다', '말 한마디에 가시가 돋쳐 있었다', '지나치게 친절해서 의심스러웠다', '어딘가 슬퍼 보였다',
      '귀찮게 구는 사람이라 여겼다', '한눈에 거짓말쟁이임을 알았다', '눈을 못 마주칠 만큼 빛났다', '도무지 속을 알 수 없었다', '딱 질색인 부류라고 단정했다',
      '왠지 지켜주고 싶어졌다', '뭔가 숨기는 게 분명했다', '말이 통할 것 같지 않았다', '나와 정반대라 끌렸다', '한순간 숨이 멎을 만큼 아름다웠다',
      '오만해 보여 거슬렸다', '너무 평범해서 곧 잊을 줄 알았다', '경계심부터 들었다', '괜히 부끄러워졌다', '동정심이 일었다',
      '강아지 같다고 생각했다', '날 무시하는 것 같아 발끈했다', '어른스러워서 주눅이 들었다', '위험한 사람이라는 직감이 들었다', '말없이 웃는 모습이 오래 남았다',
    ],
  },
  {
    key: 'impressionB', label: 'B가 A에게 받은 첫인상', icon: '👀',
    faces: [
      '무례하다고 생각했다', '괜히 마음이 쓰였다', '경계 대상 1호로 찍었다', '의외로 다정해서 놀랐다', '한심해 보여 혀를 찼다',
      '눈물 많은 사람일 거라 짐작했다', '믿어도 될 사람 같았다', '거리를 두고 싶어졌다', '뜻밖에 듬직했다', '재수 없다고 단정했다',
      '오래 알던 사람 같았다', '뭔가 도움이 필요해 보였다', '솔직히 첫눈에 반했다', '딱딱해 보여도 속은 여린 듯했다', '거짓 웃음이 보였다',
      '같이 있으면 피곤할 타입이라 여겼다', '신비로워서 더 알고 싶어졌다', '한심하면서도 미워할 수 없었다', '나를 꿰뚫어 보는 것 같았다', '너무 당당해서 얄미웠다',
      '안쓰러워서 외면하지 못했다', '잘난 척이 심하다고 느꼈다', '말투가 따뜻해 마음이 풀렸다', '어딘가 위태로워 보였다', '무심한 척 챙겨주는 게 보였다',
    ],
  },
  {
    key: 'seed', label: '갈등의 씨앗', icon: '🌱',
    faces: [
      '한쪽이 상대의 비밀을 우연히 알게 된다', '둘은 같은 것을 두고 경쟁하게 된다', '한 사람이 상대를 속이고 있다', '서로의 가족이 원수 사이였다', '한쪽이 다른 쪽에게 갚을 수 없는 빚을 진다',
      '둘 다 같은 사람을 사랑하고 있다', '한 사람이 상대의 정체를 오해한다', '서로의 목적이 정반대다', '한쪽이 상대를 이용하려 접근했다', '둘은 곧 적으로 만나야 할 운명이다',
      '한 사람이 상대에게 치명적인 거짓말을 남긴다', '서로가 잃어버린 무언가의 단서를 쥐고 있다', '한쪽이 상대의 과거에 얽혀 있다', '둘은 같은 사건의 가해자와 피해자다', '한 사람이 곧 떠나야 한다는 걸 숨긴다',
      '서로를 다시는 못 볼 거라 생각한다', '한쪽이 시한부라는 사실을 감춘다', '둘은 신분·계급이 너무 다르다', '한 사람이 상대의 약점을 손에 쥔다', '서로의 신념이 양립할 수 없다',
      '한쪽이 상대에게 첫눈에 반했지만 말 못 할 사정이 있다', '둘의 만남 자체가 누군가의 계략이었다', '한 사람이 다른 사람을 배신할 예정이다', '서로 다른 진실을 믿고 있다', '한쪽이 상대의 죽음과 연관되어 있다',
      '둘은 같은 비밀을 공유하게 되어 공범이 된다', '한 사람이 상대를 끝내 알아보지 못한다', '서로에게 첫인상과 정반대의 진실이 있다',
    ],
  },
]

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

// 두 인물의 표시 이름(기본 A/B, 사용자가 바꿀 수 있음).
interface Names { a: string; b: string }
const cleanName = (s: string, fb: string) => (s.trim() ? s.trim() : fb)

function face(sel: Record<string, number>, key: string): string {
  const s = SLOTS.find((x) => x.key === key)
  if (!s) return ''
  const i = sel[key]
  return typeof i === 'number' && s.faces[i] != null ? s.faces[i] : ''
}

// 슬롯 인덱스 맵 → 자연스러운 첫 만남 서술(한 문단).
function compose(sel: Record<string, number>, names: Names): string {
  const A = cleanName(names.a, 'A'), B = cleanName(names.b, 'B')
  const place = face(sel, 'place'), sit = face(sel, 'situation')
  const impA = face(sel, 'impressionA'), impB = face(sel, 'impressionB'), seed = face(sel, 'seed')
  if (!place && !sit && !impA && !impB && !seed) return '슬롯을 굴려 두 인물의 첫 만남을 만들어 보세요.'
  const lines: string[] = []
  if (place || sit) lines.push(`${A}와(과) ${B}는 ${place ? place + '에서' : '어느 곳에서'} ${sit ? sit + ' 처음 마주친다.' : '처음 만난다.'}`)
  if (impA) lines.push(`${A}는 ${B}에 대해 ${impA}.`)
  if (impB) lines.push(`${B}는 ${A}에 대해 ${impB}.`)
  if (seed) lines.push(`그러나 ${seed} — 이 만남이 두 사람 관계의 시작이 된다.`)
  return lines.join(' ')
}

// 짧은 제목(장소·상황 기반).
function shortTitle(sel: Record<string, number>, names: Names): string {
  const A = cleanName(names.a, 'A'), B = cleanName(names.b, 'B')
  const place = face(sel, 'place')
  const core = place ? `${place}에서의 첫 만남` : '첫 만남'
  return `🤝 ${A} × ${B} — ${core}`
}

export default function FirstMeetingGen({ payload }: { payload?: Record<string, unknown> }) {
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
  const [names, setNames] = useState<Names>(() => {
    try {
      const raw = localStorage.getItem(LS + ':names')
      if (raw) {
        const p = JSON.parse(raw) as Partial<Names>
        return { a: typeof p.a === 'string' ? p.a : '', b: typeof p.b === 'string' ? p.b : '' }
      }
    } catch { /* ignore */ }
    return { a: '', b: '' }
  })
  // 사용자 정의 항목(이름은 사용자가 직접 입력, 값도 직접 작성 — 무작위 생성하지 않음).
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':custom')
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p)) {
          return p
            .filter((x) => x && typeof x.label === 'string')
            .map((x) => ({ id: typeof x.id === 'string' ? x.id : `c_${Math.random().toString(36).slice(2)}`, label: String(x.label), value: typeof x.value === 'string' ? x.value : '' }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  // 고정 '기타' 자유 입력(항상 표시, 기본 비어 있음).
  const [etc, setEtc] = useState<string>(() => {
    try { return localStorage.getItem(LS + ':etc') || '' } catch { return '' }
  })
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const rollTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  const saved = useLibraryList('snippets')
  const myScenes = saved.filter((s) => Array.isArray(s.tags) && s.tags.includes('첫만남'))

  // payload 로 두 인물 이름이 들어오면(외부 연계, 예: 관계도/인물 시트) 슬롯 이름 칸을 채운다.
  useEffect(() => {
    const a = payload?.a ?? payload?.nameA ?? payload?.charA
    const b = payload?.b ?? payload?.nameB ?? payload?.charB
    if (typeof a === 'string' || typeof b === 'string') {
      setNames((prev) => ({
        a: typeof a === 'string' && a.trim() ? a.trim() : prev.a,
        b: typeof b === 'string' && b.trim() ? b.trim() : prev.b,
      }))
      flash('전달받은 인물 이름을 채웠습니다.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속화.
  useEffect(() => { try { localStorage.setItem(LS + ':sel', JSON.stringify(sel)) } catch { /* ignore */ } }, [sel])
  useEffect(() => { try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])
  useEffect(() => { try { localStorage.setItem(LS + ':names', JSON.stringify(names)) } catch { /* ignore */ } }, [names])
  useEffect(() => { try { localStorage.setItem(LS + ':custom', JSON.stringify(custom)) } catch { /* ignore */ } }, [custom])
  useEffect(() => { try { localStorage.setItem(LS + ':etc', etc) } catch { /* ignore */ } }, [etc])

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

  const flash = (m: string) => {
    setToast(m)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  // 사용자 정의 항목: 추가/값 변경/삭제. 값은 사용자가 직접 작성(무작위 생성하지 않음).
  const addCustom = () => {
    let label = ''
    try { label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 날씨, 시간대, 향기)') || '').trim() } catch { /* ignore */ }
    if (!label) return
    setCustom((prev) => [...prev, { id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 잠기지 않은 슬롯만 다시 굴린다. (재생성 시 사용자 정의 '값'과 '기타'는 비우되, 사용자 정의 항목 정의는 유지)
  const roll = () => {
    setCopied(false)
    setRolling(true)
    setSel((prev) => {
      const next = { ...prev }
      SLOTS.forEach((s) => { if (!locked[s.key]) next[s.key] = pickFaceIdx(s, prev[s.key]) })
      return next
    })
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
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

  const scene = compose(sel, names)
  const hasScene = SLOTS.some((s) => typeof sel[s.key] === 'number')

  // 사용자 정의 항목·기타에서 비어있지 않은 값만 모은다(텍스트/필드 공통).
  const filledCustom = custom.filter((c) => c.label.trim() && c.value.trim())
  const etcText = etc.trim()
  // 복사/저장/연계 텍스트에 덧붙일 추가 줄들.
  const extraLines: string[] = [
    ...filledCustom.map((c) => `· ${c.label.trim()}: ${c.value.trim()}`),
    ...(etcText ? [`· 기타: ${etcText}`] : []),
  ]
  // 추가 입력까지 포함한 전체 텍스트(장면 + 사용자 정의 + 기타).
  const sceneFull = extraLines.length ? `${scene}\n\n${extraLines.join('\n')}` : scene

  const copy = () => {
    if (!hasScene) return
    navigator.clipboard?.writeText(sceneFull).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* 클립보드 거부 graceful */ })
  }

  // 라이브러리(스니펫)에 첫 만남 장면 저장 — 다른 도구와 공유.
  const saveSnippet = () => {
    if (!hasScene) return
    if (myScenes.some((s) => s.text === sceneFull)) { flash('이미 저장된 장면입니다.'); return }
    addToLibrary('snippets', { text: sceneFull, source: '첫 만남 생성기', tags: ['첫만남', '글감'] })
    flash('첫 만남 장면을 라이브러리에 저장했습니다.')
  }

  // 본문 HTML(프로젝트/카드 공용).
  const buildBodyHtml = (): string => {
    const rows = SLOTS.map((s) => {
      const f = face(sel, s.key)
      return f ? `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(f)}</p>` : ''
    }).join('')
    // 사용자 정의 항목·기타도 본문에 함께 기록(비어있지 않을 때만).
    const customRows = filledCustom.map((c) => `<p><b>✎ ${esc(c.label.trim())}:</b> ${esc(c.value.trim())}</p>`).join('')
    const etcRow = etcText ? `<p><b>📝 기타:</b> ${esc(etcText)}</p>` : ''
    const A = cleanName(names.a, 'A'), B = cleanName(names.b, 'B')
    return [
      `<p style="font-size:13px;color:#888;">인물 A: <b>${esc(A)}</b> · 인물 B: <b>${esc(B)}</b></p>`,
      `<p style="font-size:15px;line-height:1.7;">${esc(scene)}</p>`,
      `<hr/>`,
      rows,
      customRows,
      etcRow,
    ].join('')
  }

  // 프로젝트 자료 〈인물〉 폴더에 첫 만남 장면 추가.
  const toProject = () => {
    if (!hasScene) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '인물',
      title: shortTitle(sel, names), bodyHtml: buildBodyHtml(), synopsis: sceneFull,
    })
    flash(id ? '프로젝트 자료 〈인물〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 인물 시트로 연계 — 첫 만남 정보를 담은 "관계 메모" 인물 카드로 보낸다.
  const toCharacterSheet = () => {
    if (!hasScene) return
    const A = cleanName(names.a, 'A'), B = cleanName(names.b, 'B')
    const notes = [
      scene,
      '',
      `· ${SLOTS[0].label}: ${face(sel, 'place')}`,
      `· ${SLOTS[1].label}: ${face(sel, 'situation')}`,
      `· ${SLOTS[2].label}: ${face(sel, 'impressionA')}`,
      `· ${SLOTS[3].label}: ${face(sel, 'impressionB')}`,
      `· ${SLOTS[4].label}: ${face(sel, 'seed')}`,
      ...extraLines,
    ].filter(Boolean).join('\n')
    const charName = `${A} ↔ ${B} (첫 만남)`
    const charRole = '관계 메모'
    const charRelations = `${A}와 ${B}: ${face(sel, 'seed') || '관계의 시작'}`
    // 받는 허브(인물 시트)에서 항목이 제자리(기본 칸)에 들어가도록 정규 키 fields 추가.
    const fields: Record<string, string> = {
      name: charName,
      role: charRole,
      relations: charRelations,
      background: scene,
      notes,
    }
    // 사용자 정의 항목(키 = 라벨 그대로)·기타(키 'etc')를 비어있지 않을 때만 fields 에 그대로 전달.
    filledCustom.forEach((c) => { fields[c.label.trim()] = c.value.trim() })
    if (etcText) fields.etc = etcText
    openToolLinked('character-sheet', {
      character: {
        name: charName,
        role: charRole,
        relations: charRelations,
        background: scene,
        notes,
        source: '첫 만남 생성기',
        fields,
      },
    })
    flash('인물 시트로 첫 만남 메모를 보냈습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const chip: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 9px', color: 'var(--muted)' }
  const nameInput: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', color: 'var(--text)', fontSize: 14 }

  return (
    <div style={wrap}>
      <div style={hint}>
        두 인물이 <b>처음 만나는 순간</b>을 굴립니다. 마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴려보세요.
      </div>

      {/* 두 인물 이름 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}><Emoji e="👤"/> A</span>
        <input style={nameInput} value={names.a} placeholder="인물 A (예: 한도윤)" onChange={(e) => setNames((p) => ({ ...p, a: e.target.value }))} />
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}><Emoji e="👤"/> B</span>
        <input style={nameInput} value={names.b} placeholder="인물 B (예: 서하루)" onChange={(e) => setNames((p) => ({ ...p, b: e.target.value }))} />
      </div>

      {/* 조합 수 표시 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={chip}>전체 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(totalCombos)}</b>가지</span>
        <span style={chip}>현재 가능 <b style={{ color: 'var(--accent)' }}>{fmtNum(openCombos)}</b>가지</span>
      </div>

      {/* 슬롯들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.map((s) => {
          const f = face(sel, s.key)
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={row}>
              <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} · {s.faces.length}면</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, wordBreak: 'keep-all', color: f ? 'var(--text)' : 'var(--muted)' }}>
                  {rolling && !isLocked ? '…' : (f || '— 굴려주세요 —')}
                </div>
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 슬롯만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲"/></button>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 조합된 첫 만남 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px' }}>
        <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🤝"/> 관계의 시작</div>
        <div style={{ fontSize: 15, lineHeight: 1.7, wordBreak: 'keep-all', color: hasScene ? 'var(--text)' : 'var(--muted)' }}>{scene}</div>
      </div>

      {/* 사용자 정의 항목 — 직접 항목을 추가하고 내용을 적습니다(무작위 생성 안 함). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, flex: 1 }}>✎ 사용자 정의 항목</span>
          <button className="minibtn" onClick={addCustom} title="직접 항목을 추가합니다">＋ 항목 추가</button>
        </div>
        {custom.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            <input
              style={{ flex: 1, minWidth: 0, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13 }}
              value={c.value}
              placeholder="내용을 직접 적어주세요"
              onChange={(e) => setCustomValue(c.id, e.target.value)}
            />
            <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>

      {/* 고정 '기타' 자유 입력(항상 표시) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="📝"/> 기타</span>
        <textarea
          style={{ width: '100%', minHeight: 64, resize: 'vertical', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13, lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
          value={etc}
          placeholder="자유롭게 메모하세요 (예: 분위기, 배경음악, 추가 설정 등)"
          onChange={(e) => setEtc(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={roll}><Emoji e="🎲"/> 첫 만남 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!hasScene}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!hasScene}><Emoji e="⭐"/> 장면 저장</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasScene || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '현재 첫 만남을 프로젝트 자료 〈인물〉에 추가'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={toCharacterSheet}
          disabled={!hasScene}
          title="첫 만남 메모를 인물 시트로 보내기"
        ><Emoji e="🧑‍🎤"/> 인물 시트로</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저장한 첫 만남 목록(라이브러리 공유) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}><Emoji e="⭐"/> 저장한 첫 만남 ({myScenes.length})</div>
        {myScenes.length === 0 ? (
          <div style={hint}>마음에 드는 장면은 ‘장면 저장’으로 모아두면 다른 도구에서도 함께 쓸 수 있어요.</div>
        ) : (
          myScenes.slice(0, 30).map((s) => (
            <div key={s.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.6, wordBreak: 'keep-all', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flex: 1, minWidth: 0 }}>{s.text}</span>
              <button
                className="minibtn"
                style={{ flexShrink: 0 }}
                title="이 장면 복사"
                onClick={() => { navigator.clipboard?.writeText(s.text).catch(() => { /* graceful */ }); flash('복사했습니다.') }}
              ><Emoji e="📋"/></button>
            </div>
          ))
        )}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 'auto', lineHeight: 1.5 }}>
        장소·상황·첫인상·갈등 풀과 문장은 본 도구의 자체 창작물(오픈소스, 외부 저작물 미사용). 외부 네트워크 없이 동작합니다.
      </div>
    </div>
  )
}
