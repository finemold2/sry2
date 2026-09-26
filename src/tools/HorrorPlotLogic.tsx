// 호러·공포 플롯·진행곡선(로직) 템플릿 — 도시에 근거한 "호러 표준 12비트 구조 + 페이싱"을 단계 입력 시트로.
// 핵심: 호러의 동력은 '사건'이 아니라 '기다림(드레드)'. 공포 ≠ 사건, 공포 = 곧 무언가 일어난다는 예감의 축적.
//  · 12비트(일상→여운/씨앗)에 각자 내용 입력 + 완료 체크 + 진행률.
//  · 비트마다 '드레드'(지속적 불안 0~10)와 '충격'(jump scare·고어 등 표면 충격 1~10) 두 곡선 → 긴장-이완 파동(롤러코스터) 가시화.
//  · 하위유형 프리셋(유령·고딕/슬래셔/오컬트·악마/포크 호러/바디 호러/우주적 공포/서바이벌·아포칼립스)으로 비트 가이드 자동 세팅.
//  · 공포의 3층위(충격/불안/여운)·시점 신뢰도·결말형(퇴치/열린/비카타르시스) 설정 — 독자와의 사전 약속.
//  · 페이싱 자가진단(드레드 미축적/가짜 안도 누락/규칙 미설정/단조로운 충격/최후 점프스케어 등) 체크.
// 자급식: react/linkbus 외 import 없음. 전부 로컬. localStorage 'sry:tool:horror-plotlogic' 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'horror-plotlogic', name: '호러 플롯 로직', icon: '🩸', group: '플롯', genre: '호러·공포', intro: '호러 표준 12비트 구조·드레드/충격 곡선으로 공포 서사의 진행과 페이싱을 설계하세요', w: 700, h: 660 }

const LS_KEY = 'sry:tool:horror-plotlogic'

// ── 호러 표준 12비트(도시에 §4 전형적 5단 구조를 비트로 세분) ────────────────
// pos: 전체 분량 대비 권장 위치 구간(%). dread: 권장 '지속적 불안'(0~10). shock: 권장 표면 충격(1~10).
interface BeatDef {
  key: string
  title: string
  sub: string
  pos: [number, number]
  dread: number
  shock: number
  func: string   // 호러에서 이 비트의 기능(도시에 근거)
  tip: string    // 작법 팁
  ex: string[]   // 하위유형/장치 변주
}

const BEATS: BeatDef[] = [
  {
    key: 'normal', title: '1. 일상 (The Normal)', sub: 'The Normal', pos: [0, 8], dread: 1, shock: 1,
    func: '평범한 세계를 충분히 보여줘 "잃을 것"을 만든다. 인물·관계·안전한 공간을 정상 상태로 각인해야 침범의 충격이 산다.',
    tip: '독자가 인물에게 이입할 시간을 줘라. 취약하거나 고립될 인물일수록 공포가 잘 작동한다. 안전의 상징(집·가족·일상 루틴)을 깔아 둘 것.',
    ex: ['이사 온 새 집/한적한 마을로의 도착', '단란한 가족·연인·친구 무리의 평범한 하루', '주인공의 결핍·트라우마를 슬쩍(나중에 약점/규칙이 됨)'],
  },
  {
    key: 'firstsign', title: '2. 첫 균열 (The First Sign)', sub: 'The First Sign', pos: [6, 16], dread: 3, shock: 2,
    func: '작은 이상징후. 우연·착각·소음으로 설명 가능한 수준. 독자만 불안하고 인물은 대수롭지 않게 넘긴다(목격의 비대칭 시작).',
    tip: '언캐니(두려운 낯섦)를 심어라 — 익숙한 것이 미세하게 잘못된 상태. 절대 다 보여주지 말 것(off-screen). 발소리·그림자·문틈·반사면만.',
    ex: ['삐걱이는 마룻바닥/긁는 소리/멀리서 들리는 동요', '동물이 먼저 이상 반응', '거울·사진·인형의 미세한 어긋남, 0.5초 늦는 미소'],
  },
  {
    key: 'dread', title: '3. 드레드의 축적 (Dread Builds)', sub: 'Slow Build-up', pos: [12, 26], dread: 5, shock: 2,
    func: '"곧 무언가 일어난다"는 예감을 길게 끈다. 사건보다 기다림. 정적·침묵·일상의 미세한 어긋남으로 불안을 쌓는다(호러의 진짜 엔진).',
    tip: '저속 빌드업: 서두르지 마라. 큰 사건 대신 분위기로. "고요는 폭풍의 전조." 가짜 안도(false relief)로 호흡을 한 번 끊어 줘라.',
    ex: ['방 공기가 무거워짐·차가워짐, 누가 보는 느낌', '가짜 스케어: 위협인 줄 알았던 게 고양이·친구', '괴담/집의 역사에 대한 첫 단서(정보 적하 시작)'],
  },
  {
    key: 'firstscare', title: '4. 첫 본격 공포 (First Real Scare)', sub: 'First Real Scare', pos: [20, 32], dread: 6, shock: 6,
    func: '부정할 수 없는 첫 초자연/위협의 출현. 합리적 설명의 둑이 처음 무너진다. (웹소설은 3화 내 필수) 긴장→충격의 첫 큰 해소.',
    tip: '여기서 처음으로 충격을 크게 터뜨려라. 단, 괴물의 전모는 아직 감춰라(부분만). 충격 직후 다시 정적으로 떨어뜨려 다음 긴장을 준비.',
    ex: ['창밖의 얼굴/어둠 속 두 눈/불쑥 나타난 손', '첫 피해(실종·부상·죽음)', '슬래셔: 첫 살인 — 규칙(누가 먼저 죽는지)을 각인'],
  },
  {
    key: 'denial', title: '5. 부정과 고립 (Denial & Isolation)', sub: 'Nobody Believes', pos: [28, 42], dread: 6, shock: 3,
    func: '주인공만 본다 → 아무도 안 믿어준다("다들 날 미쳤다고 한다"). 사회적 무력화. 도움을 청할 길이 하나씩 막힌다.',
    tip: '불확실성을 유지하라 — "초자연인가 정신병인가". 신뢰할 수 없는 화자/시점으로 독자의 인식 토대를 흔들어라. 고립을 점진적으로 조여라.',
    ex: ['휴대폰 안 터짐·정전·고장난 차(통신/탈출 차단)', '주변인의 불신·조롱, 주인공의 편집증', '폭설·외딴 섬·산장으로 물리적 고립 확정 직전'],
  },
  {
    key: 'investigate', title: '6. 조사와 규칙 발견 (The Rules)', sub: 'Investigation', pos: [38, 52], dread: 7, shock: 4,
    func: '인물이 조사를 시작하고 괴물·저주의 작동 규칙을 알아간다("밤에 나온다", "이름을 부르면 안 된다", "7일 후"). 독자는 규칙을 파악하며 긴장.',
    tip: '금지된 지식의 처벌 구조를 깔아라 — "알아버린 자"가 파멸한다. 규칙(약점·금기)을 여기서 심어야 클라이맥스에서 데우스 엑스 마키나가 안 된다.',
    ex: ['저주의 기원·집의 비극사 발굴(과거의 살인·매장)', '금기/규칙 명문화 + 카운트다운("13번째 종이 울리면")', '저주의 전염 구조 파악("탈출구가 있는가")'],
  },
  {
    key: 'midpoint', title: '7. 중간점 — 진실의 일격 (Midpoint Turn)', sub: 'Midpoint', pos: [48, 58], dread: 8, shock: 7,
    func: '판이 뒤집히는 전환점. 거짓 안도가 깨지거나, 결정적 진실(괴물의 정체·규모)이 드러난다. 위협이 한 단계 도약.',
    tip: '"거짓 승리(쫓아낸 줄 알았다)" 또는 "거짓 패배(더 끔찍한 진실)"로 판을 키워라. 이후 사건 간격을 좁히며 가속하기 시작.',
    ex: ['괴물의 정체/규모가 예상보다 거대함을 자각', '안전지대(집·무리)에 첫 큰 균열', '반전 복선: 구원자가 적·화자가 신뢰 불가라는 첫 단서'],
  },
  {
    key: 'escalation', title: '8. 가속 — 사상자 (Escalation)', sub: 'Escalation', pos: [55, 72], dread: 8, shock: 8,
    func: '사건이 잦아지고 강도가 세진다. 핵심 인물의 죽음으로 판돈을 올린다("이번엔 진짜 죽을 수 있다"). 합리적 설명은 완전히 불가능.',
    tip: '스케어 밀도를 조이되 가짜 안도를 한 번 더 끼워 둔감화를 막아라. 규칙 위반 = 처벌을 보여줘 규칙의 무게를 증명. 후반부는 거의 쉴 틈 없이.',
    ex: ['동료가 하나씩 당함(슬래셔: 죄지은 자부터)', '신체의 배신(감염·빙의·변형)이 시작/확산', '공간의 인격화 — 집·숲 자체가 적대적으로 변모'],
  },
  {
    key: 'trap', title: '9. 포위 — 탈출구 없음 (The Trap Closes)', sub: 'The Trap Closes', pos: [70, 82], dread: 9, shock: 6,
    func: '고립 확정, 안전지대 완전 붕괴, 도망갈 곳 없음. 진실(괴물의 기원·목적)이 마침내 전모를 드러낸다. 가장 캄캄한 밑바닥.',
    tip: '드레드를 최고치로. 충격은 잠시 죽이고 절망·무력감으로 채워라(영혼의 어두운 밤). 여기서 생존자가 수동→능동으로 전환할 씨앗을 심어라.',
    ex: ['마지막 탈출로 차단, 무리 전멸 직전', '진짜 기원·목적 폭로(인신공양·저주의 조건)', 'final girl만 남음 — 가장 무력했던 인물의 각성 직전'],
  },
  {
    key: 'confront', title: '10. 대면·결전 (Confrontation)', sub: 'Confrontation', pos: [80, 92], dread: 9, shock: 10,
    func: '클라이맥스. off-screen으로 끌어온 존재를 (부분적으로라도) 드러내고 정면으로 마주한다. 빌드업의 규칙·약점을 역이용.',
    tip: '심어둔 약점(성수·소금·이름·불·해뜨기)을 여기서 사용 — 복선 없이 갑툭튀 금지. final girl의 반격(수동→능동). 충격을 최대치로 몰아쳐라.',
    ex: ['규칙/약점 역이용으로 괴물 퇴치·봉인 시도', '최대 희생(클라이맥스 직전·중 핵심 인물 사망)', '거짓 승리 후 재공격(슬래셔 정석) — 한 번 더 일어남'],
  },
  {
    key: 'resolution', title: '11. 결말 — 대가와 상처 (Resolution)', sub: 'Resolution', pos: [90, 97], dread: 6, shock: 4,
    func: '퇴치/탈출/패배의 정산. 살아남아도 정상으로 못 돌아온다(트라우마·신체손상·동료 상실). 완전한 해피엔딩은 드물다.',
    tip: '대가를 반드시 치르게 하라 — 무손실 생존은 호러 계약 위반에 가깝다. 카타르시스(후련함) vs 의도적 비카타르시스(찝찝함)를 결말형에 맞춰 결정.',
    ex: ['퇴치형: 괴물 소멸 + 깊은 상처를 안고 생환', '탈출형: 살아남았으나 무언가를 잃음', '패배/비극: 화자가 사실 죽어 있었다 등 반전'],
  },
  {
    key: 'lingering', title: '12. 여운 — 씨앗 (The Lingering)', sub: 'The Lingering Dread', pos: [97, 100], dread: 7, shock: 5,
    func: '마지막 컷의 불길한 징조. 사후 여운(존재론적 불안). 저주가 옮겨갔거나, 알·생존 개체·전염자가 남았음을 암시.',
    tip: '"끝나지 않았다"는 한 줄/한 컷으로 찝찝함을 남겨라(현대 호러 선호). 속편 여지 + 존재론적 불안. 단, 퇴치 카타르시스가 목표면 이 비트는 가볍게.',
    ex: ['저주가 다음 사람에게 전염됨(링 구조)', '마지막 컷: 거울 속/창밖/배 속의 불길한 징조', '겉으론 평온하지만 미세한 어긋남이 남음(언캐니 복귀)'],
  },
]
const BEAT_KEYS = BEATS.map((b) => b.key)

// ── 하위유형 프리셋(도시에 §1 하위장르 지도) ─────────────────────────────────
interface Preset {
  key: string
  name: string
  desc: string
  ending: number        // 권장 결말형 인덱스
  reliability: number   // 권장 시점 신뢰도 인덱스(0=완전 신뢰 … 3=완전 불신)
  notes: Partial<Record<string, string>>   // 비트별 가이드 덮어쓰기
}
const PRESETS: Preset[] = [
  {
    key: 'ghost', name: '유령 · 고딕 (Haunted House)', desc: '과거의 비극을 품은 집/저택의 원혼. 공간의 인격화·심리적 유령(힐 하우스).',
    ending: 1, reliability: 2,
    notes: {
      normal: '집 자체를 인물처럼 소개하라. 입주·도착 장면에서 "이 집의 역사"가 곧 공포의 근원임을 암시.',
      investigate: '집의 비극사(살인·자살·매장) 발굴 = 규칙 발견. 원혼의 미해결 한(恨)이 작동 규칙이다.',
      confront: '집/원혼의 한을 풀거나(해원) 정면 대결. 집을 떠나는 것 자체가 해법일 수도.',
      lingering: '떠났지만 집은 여전히 다음 거주자를 기다린다 — 공간의 지속성으로 여운.',
    },
  },
  {
    key: 'slasher', name: '슬래셔 (Slasher)', desc: '가면 살인마와 마지막 생존자(final girl). 인과응보의 도덕 구조, 거짓 승리 후 재공격.',
    ending: 0, reliability: 0,
    notes: {
      normal: '희생될 무리를 빠르게 소개 — 각자의 죄(방종·오만·탐욕)를 슬쩍 깔아 사망 순서의 논리를 만든다.',
      firstscare: '첫 살인으로 규칙을 각인 — 누가 먼저, 왜 죽는지. 살인마는 부분만(가면·실루엣·흉기).',
      escalation: '죄지은 자부터 차례로. 스케어 밀도를 조이되 가짜 안도(은신 성공처럼 보임)를 끼워라.',
      confront: 'final girl의 반격(수동→능동). 죽은 줄 알았던 살인마가 한 번 더 일어나는 마지막 점프스케어 필수.',
    },
  },
  {
    key: 'occult', name: '오컬트 · 악마 (Occult)', desc: '엑소시즘·사이비·흑마술. 빙의·계약·의식. 신앙 vs 악마, 금지된 지식의 처벌.',
    ending: 0, reliability: 1,
    notes: {
      investigate: '악마의 이름·계약 조건·구마 의식 절차가 규칙. 경전·고문서에서 약점을 발굴(금지된 지식).',
      escalation: '빙의 진행 — 신체의 배신(목소리·신체변형·초자연 현상)을 단계적으로 고조.',
      confront: '구마 의식(성수·이름·기도)을 규칙대로 수행. 신앙·자기희생이 무기. 의식 중 최대 위기.',
      lingering: '쫓아낸 악마가 다른 숙주로 옮겨갔음을 암시 — 계약·전염의 씨앗.',
    },
  },
  {
    key: 'folk', name: '포크 호러 (Folk Horror)', desc: '고립된 시골 공동체·이교 의식·인신공양. "친절함이 더 무서운" 마을(위커맨·미드소마).',
    ending: 2, reliability: 1,
    notes: {
      normal: '외부인(주인공)의 마을 도착. 과하게 친절한 주민 — 이상하게 정상인 일상이 더 섬뜩.',
      denial: '마을 전체가 공모자다. 도움을 청할 곳이 없음 — 사회적 고립이 곧 물리적 함정.',
      trap: '주인공이 의식의 제물로 선택되어 있었음을 깨닫는다. 처음부터 도망칠 수 없었다는 진실.',
      resolution: '대개 비극·체념의 결말 — 공동체에 흡수되거나 제물이 됨. 비카타르시스가 어울린다.',
    },
  },
  {
    key: 'body', name: '바디 호러 (Body Horror)', desc: '신체변형·감염·기생. 내 몸이 통제되지 않는 자아 상실의 공포(이토 준지·크로넨버그).',
    ending: 2, reliability: 2,
    notes: {
      firstsign: '몸의 미세한 이상(반점·통증·낯선 충동)을 첫 균열로. 불쾌의 미학을 천천히.',
      escalation: '변형/감염의 점진적 고조 — 돌이킬 수 없음을 단계로 보여줘라. 혐오와 연민을 동시에.',
      confront: '변해버린 자아와의 대면 — 외부 괴물이 아니라 내 몸이 적. 자기 절단·자기 파괴가 클라이맥스일 수도.',
      lingering: '완전히 변이했거나, 다른 이에게 전염됨 — 감염의 씨앗으로 여운.',
    },
  },
  {
    key: 'cosmic', name: '우주적 공포 (Cosmic Horror)', desc: '인간의 이해를 넘어선 존재 앞의 무력함(러브크래프트). 알아버린 자의 광기.',
    ending: 3, reliability: 3,
    notes: {
      investigate: '금단의 지식(고문서·금지된 책)을 파고들수록 파멸. 규칙은 "알면 안 된다"는 것 자체.',
      midpoint: '존재의 규모가 인간 인식을 초월함을 자각 — 퇴치 불가능이라는 진실의 일격.',
      confront: '괴물은 끝까지 안 보여주거나 일부만(off-screen 극대화). 승리가 아니라 생존·도주·광기뿐.',
      resolution: '광기·죽음·존재론적 붕괴. 인간은 결코 이기지 못한다 — 비카타르시스의 정점.',
    },
  },
  {
    key: 'survival', name: '서바이벌 · 아포칼립스', desc: '좀비·감염 종말물. 고립된 생존 집단, 외부보다 내부(인간)가 더 위협. 자원·신뢰의 붕괴.',
    ending: 2, reliability: 0,
    notes: {
      firstscare: '감염/사태의 첫 폭발 — 일상의 급격한 붕괴. 안전했던 공간이 순식간에 전장으로.',
      denial: '고립 집단 형성 + 통신 두절. 외부 구조의 부재를 각인.',
      escalation: '진짜 위협은 인간 — 집단 내 신뢰 붕괴·자원 다툼·배신이 괴물보다 무섭다.',
      lingering: '안전지대도 결국 무너질 것이라는 암시 — 끝나지 않는 생존의 무한 루프.',
    },
  },
]

// 결말형 — 독자와의 사전 약속
const ENDINGS = [
  { label: '퇴치 · 카타르시스', desc: '괴물 퇴치/봉인의 후련함. 상처는 남되 승리' },
  { label: '열린 결말 · 씨앗', desc: '"끝나지 않았다" — 저주 전염·생존 개체로 여운' },
  { label: '비극 · 패배', desc: '주인공 패배·흡수·제물. 어두운 결말' },
  { label: '비카타르시스 · 존재론적 불안', desc: '승리도 해소도 없는 찝찝함(우주적 공포)' },
]
// 시점 신뢰도 — 신뢰할 수 없는 화자 장치
const RELIABILITY = ['완전 신뢰(명료)', '약간의 의심', '신뢰 흔들림(초자연 vs 정신병)', '완전 불신(화자가 미쳤/죽었을 수도)']

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}

interface BeatState { text: string; done: boolean; dread: number; shock: number }
interface Store {
  title: string
  unit: 'won고' | 'page' | 'episode'
  total: string
  preset: string
  ending: number
  reliability: number
  beats: Record<string, BeatState>
}
const UNIT_LABEL: Record<Store['unit'], string> = { 'won고': '원고지(매)', page: '페이지', episode: '회차' }
const UNIT_SHORT: Record<Store['unit'], string> = { 'won고': '매', page: 'p', episode: '화' }

function emptyBeat(b: BeatDef): BeatState { return { text: '', done: false, dread: b.dread, shock: b.shock } }
function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat(b)
  return { title: '', unit: 'won고', total: '', preset: 'ghost', ending: 1, reliability: 2, beats }
}

function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      unit: (p.unit === 'page' || p.unit === 'episode') ? p.unit : 'won고',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      preset: PRESETS.some((x) => x.key === p.preset) ? p.preset : 'ghost',
      ending: clamp(p.ending, 0, ENDINGS.length - 1, 1),
      reliability: clamp(p.reliability, 0, RELIABILITY.length - 1, 2),
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        s.beats[b.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          done: !!v.done,
          dread: clamp(v.dread, 0, 10, b.dread),
          shock: clamp(v.shock, 1, 10, b.shock),
        }
      }
    }
    return s
  } catch { return base }
}

export default function HorrorPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.genre 활용 — 호러 외 장르로 열리면 안내(동작은 그대로)
  useEffect(() => {
    const g = payload && typeof payload.genre === 'string' ? payload.genre : ''
    if (g && g !== '호러·공포' && mounted.current) {
      setNote(`이 도구는 호러·공포 전용입니다(현재 장르: ${g}). 비트 가이드는 호러 관습 기준이에요.`)
    }
  }, [payload])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [store])

  const flashMsg = (m: string) => { setFlash(m); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  const preset = PRESETS.find((p) => p.key === store.preset) || PRESETS[0]

  // ── 변경 헬퍼 ──────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total' | 'ending' | 'reliability'>>) => setStore((s) => ({ ...s, ...patch }))
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))
  const toggleOpen = (key: string) => setOpenKey((o) => ({ ...o, [key]: !o[key] }))

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)
    if (!p) return
    setStore((s) => ({ ...s, preset: key, ending: p.ending, reliability: p.reliability }))
    flashMsg(`'${p.name}' 프리셋 적용 — 결말형·시점 신뢰도를 권장값으로 맞췄어요`)
  }

  // ── 권장 위치 환산 ─────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const totalDigits = store.total.replace(/[^\d.]/g, '')
  const fmtPos = (r: [number, number]): string => {
    if (totalNum > 0) {
      const a = Math.max(1, Math.round((r[0] / 100) * totalNum))
      const b = Math.max(a, Math.round((r[1] / 100) * totalNum))
      const u = UNIT_SHORT[store.unit]
      return `${a}~${b}${u} (${r[0]}~${r[1]}%)`
    }
    return `전체의 ${r[0]}~${r[1]}% 구간`
  }

  // ── 진행률 ─────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim()).length
  const pct = Math.round((doneCount / BEATS.length) * 100)

  // ── 두 곡선(드레드 + 충격) ─────────────────────────────────
  const CW = 660, CH = 170, PADX = 30, PADY = 18
  const xAt = (i: number) => PADX + (i / (BEATS.length - 1)) * (CW - PADX * 2)
  const yDread = (d: number) => PADY + (1 - d / 10) * (CH - PADY * 2)         // 0~10
  const yShock = (h: number) => PADY + (1 - (h - 1) / 9) * (CH - PADY * 2)    // 1~10
  const dreadPts = BEATS.map((b, i) => ({ x: xAt(i), y: yDread(store.beats[b.key].dread), b }))
  const shockPts = BEATS.map((b, i) => ({ x: xAt(i), y: yShock(store.beats[b.key].shock), b }))
  const pathOf = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // ── 페이싱 자가진단(도시에 §3 장치 + §4 페이싱 + §8 함정) ────
  const diagnostics: { ok: boolean; msg: string }[] = (() => {
    const out: { ok: boolean; msg: string }[] = []
    // 1) 드레드 축적: 일상→드레드축적 구간에서 불안이 우상향해야(공포=기다림)
    const d1 = store.beats['normal'].dread, d3 = store.beats['dread'].dread
    out.push({ ok: d3 > d1 + 2, msg: d3 > d1 + 2 ? '초반 드레드(지속 불안)가 충분히 축적돼요 — 공포는 사건이 아니라 기다림' : '초반 드레드가 약해요 — 저속 빌드업으로 "곧 무언가 일어난다"는 예감을 길게 끌어야 해요' })
    // 2) 규칙 발견: 조사 비트에 규칙이 적혀 있어야(클라이맥스 데우스 엑스 마키나 방지)
    const rule = store.beats['investigate']
    out.push({ ok: !!rule.text.trim(), msg: rule.text.trim() ? '괴물·저주의 규칙/약점이 설계돼 있어요 — 위반과 역이용의 토대' : '규칙 발견 비트가 비었어요 — 약점·금기를 미리 심어야 클라이맥스가 갑툭튀가 안 돼요' })
    // 3) 가짜 안도(false relief): 드레드 곡선이 한 번은 출렁여야 둔감화 방지
    const dips = (() => { let c = 0; for (let i = 2; i < BEATS.length; i++) { if (store.beats[BEATS[i].key].dread < store.beats[BEATS[i - 1].key].dread) c++ } return c })()
    out.push({ ok: dips >= 2, msg: dips >= 2 ? '긴장-이완 파동(롤러코스터)이 있어요 — 가짜 안도/조용한 구간으로 다음 충격이 살아나요' : '드레드가 단조롭게만 올라가요 — 같은 강도의 연속은 둔감화. 조용한 구간·가짜 안도를 끼워 넣으세요' })
    // 4) 클라이맥스 충격: 대면 비트의 충격이 최고치 부근
    const conf = store.beats['confront'].shock
    out.push({ ok: conf >= 9, msg: conf >= 9 ? '클라이맥스(대면) 충격 강도가 정점이에요' : '대면 비트의 충격이 약해요 — off-screen으로 끌어온 존재를 여기서 (부분이라도) 터뜨리세요' })
    // 5) 대가·여운: 결말+여운 비트 작성 여부(무손실 생존 방지 / 사후 여운)
    const ling = store.beats['lingering'], res = store.beats['resolution']
    const wantSeed = store.ending === 1 || store.ending === 3
    out.push({ ok: !!res.text.trim() && (!wantSeed || !!ling.text.trim()), msg: (!!res.text.trim() && (!wantSeed || !!ling.text.trim())) ? '대가/상처 + 사후 여운(씨앗)이 설계돼 있어요 — 호러의 3층위 완성' : (wantSeed ? '결말의 "대가"와 마지막 컷의 "씨앗(여운)"을 채우세요 — 무손실 생존은 호러 계약 위반에 가까워요' : '결말 비트가 비었어요 — 살아남아도 치를 대가(트라우마·상실)를 설계하세요') })
    return out
  })()
  const diagOk = diagnostics.filter((d) => d.ok).length

  // ── 텍스트/HTML 빌드 ───────────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildText = (): string => {
    const L: string[] = []
    L.push(`[호러 플롯 로직]${store.title ? ` ${store.title}` : ''}`)
    L.push(`하위유형: ${preset.name} · 결말형: ${ENDINGS[store.ending].label} · 시점 신뢰도: ${RELIABILITY[store.reliability]}`)
    if (totalNum > 0) L.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    L.push(`진행률: ${doneCount}/${BEATS.length} (${pct}%)`)
    L.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      L.push(`${st.done ? '[v]' : '[ ]'} ${b.title} 〈${fmtPos(b.pos)} · 드레드 ${st.dread}/10 · 충격 ${st.shock}/10〉`)
      L.push(`   기능: ${b.func}`)
      const pn = preset.notes[b.key]
      if (pn) L.push(`   [${preset.name}] ${pn}`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => L.push(`   · ${l}`))
      L.push('')
    }
    return L.join('\n').trimEnd() + '\n'
  }
  const buildBodyHtml = (): string => {
    const parts: string[] = []
    if (store.title.trim()) parts.push(`<p><em>${esc(store.title.trim())}</em></p>`)
    parts.push(`<p><strong>하위유형:</strong> ${esc(preset.name)} · <strong>결말형:</strong> ${esc(ENDINGS[store.ending].label)} · <strong>시점 신뢰도:</strong> ${esc(RELIABILITY[store.reliability])}</p>`)
    parts.push(`<p><strong>진행률:</strong> ${doneCount}/${BEATS.length} (${pct}%)</p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${esc(b.title)} <span>〈${esc(fmtPos(b.pos))} · 드레드 ${st.dread}/10 · 충격 ${st.shock}/10〉</span></h3>`)
      parts.push(`<p><em>기능: ${esc(b.func)}</em></p>`)
      const pn = preset.notes[b.key]
      if (pn) parts.push(`<p><em>[${esc(preset.name)}] ${esc(pn)}</em></p>`)
      if (st.text.trim()) st.text.trim().split('\n').forEach((l) => parts.push(`<p>${esc(l) || '&nbsp;'}</p>`))
      else parts.push('<p>&nbsp;</p>')
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flashMsg('전체 플롯을 복사했어요')
    } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
  }

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: store.title.trim() ? `호러 플롯 — ${store.title.trim()}` : '호러 플롯 로직',
      bodyHtml: buildBodyHtml(),
      meta: {
        하위유형: preset.name,
        결말형: ENDINGS[store.ending].label,
        시점신뢰도: RELIABILITY[store.reliability],
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashMsg(id ? '프로젝트 자료(구조)에 플롯 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // 작성된 비트를 스니펫(글감)으로 저장
  const toSnippet = () => {
    const filled = BEATS.filter((b) => store.beats[b.key].text.trim())
    if (filled.length === 0) { setNote('저장할 비트 내용이 없어요. 비트를 펼쳐 내용을 적어 보세요.'); return }
    const text = filled.map((b) => `[${b.title}] ${store.beats[b.key].text.trim()}`).join('\n')
    addToLibrary('snippets', { text, source: `호러 플롯 로직${store.title ? ` · ${store.title}` : ''}`, tags: ['호러·공포', '플롯', preset.name] })
    flashMsg('작성한 비트를 글감(스니펫)으로 저장했어요')
  }

  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·진행 상태·곡선을 초기화할까요?')) return
    setStore(defaultStore()); setOpenKey({})
    flashMsg('모두 초기화했어요')
  }

  // 비트별 곡선 색
  const C_DREAD = 'var(--accent)'
  const C_SHOCK = '#c0392b'

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.35 }
  const posLine: React.CSSProperties = { fontSize: 11.5, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 60, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const funcBox: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, background: 'var(--chrome-2)', borderRadius: 8, padding: '7px 9px' }
  const presetNote: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.55, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const sliderRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const exTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px' }

  const RELATED: { id: string; label: string }[] = [
    { id: 'horror-tropes', label: '🏷️ 트로프·관습 체크' },
    { id: 'horror-devices', label: '🕯️ 서사 장치 사전' },
    { id: 'horror-synopsis', label: '📝 시놉시스 빌더' },
    { id: 'horror-outline', label: '🗂️ 개요 빌더' },
    { id: 'horror-signature', label: '👻 공포 장면 생성기' },
    { id: 'horror-eventforge', label: '🎲 사건 생성기' },
    { id: 'horror-sceneforge', label: '🎬 장면 생성기' },
  ]

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={row}>
          <input style={{ ...input, flex: '2 1 180px' }} value={store.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="작품 제목 (선택)" maxLength={120} aria-label="작품 제목" />
          <input style={{ ...input, flex: '0 1 96px', width: 96 }} value={store.total} onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })} placeholder="총 분량" inputMode="decimal" aria-label="총 분량" />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Store['unit'] })} aria-label="분량 단위">
            <option value="won고">원고지(매)</option>
            <option value="page">페이지</option>
            <option value="episode">회차</option>
          </select>
        </div>
        <div style={row}>
          <label style={{ ...subLabel, alignSelf: 'center' }}>하위유형</label>
          <select style={{ ...select, flex: '1 1 200px' }} value={store.preset} onChange={(e) => applyPreset(e.target.value)} aria-label="하위유형 프리셋">
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>결말형</label>
          <select style={{ ...select, flex: '1 1 170px' }} value={store.ending} onChange={(e) => setMeta({ ending: Number(e.target.value) })} aria-label="결말형">
            {ENDINGS.map((h, i) => <option key={i} value={i}>{h.label}</option>)}
          </select>
          <label style={{ ...subLabel, alignSelf: 'center' }}>시점 신뢰도</label>
          <select style={{ ...select, flex: '1 1 170px' }} value={store.reliability} onChange={(e) => setMeta({ reliability: Number(e.target.value) })} aria-label="시점 신뢰도">
            {RELIABILITY.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
        </div>
        <div style={{ ...hint, fontSize: 11.5 }}>{preset.desc} · 결말: {ENDINGS[store.ending].desc}</div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* ── 이중 곡선: 드레드 + 충격 ── */}
        <div style={panel}>
          <div style={sectionTitle}>드레드 & 충격 곡선 · 일상→여운 (공포 = 기다림의 축적 + 충격의 해소)</div>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', maxHeight: 190 }} role="img" aria-label="드레드와 충격 곡선">
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
              const y = PADY + g * (CH - PADY * 2)
              return <line key={i} x1={PADX} y1={y} x2={CW - PADX} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
            })}
            {/* 충격 곡선 */}
            <path d={pathOf(shockPts)} fill="none" stroke={C_SHOCK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} strokeDasharray="5 4" />
            {/* 드레드 곡선 */}
            <path d={pathOf(dreadPts)} fill="none" stroke={C_DREAD} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
            {dreadPts.map((p, i) => (
              <circle key={'d' + i} cx={p.x} cy={p.y} r={3.5} fill={C_DREAD} stroke="var(--paper)" strokeWidth={1.4}>
                <title>{`${p.b.title} · 드레드 ${store.beats[p.b.key].dread}/10`}</title>
              </circle>
            ))}
            {shockPts.map((p, i) => (
              <circle key={'h' + i} cx={p.x} cy={p.y} r={3} fill={C_SHOCK} stroke="var(--paper)" strokeWidth={1.2} opacity={0.9}>
                <title>{`${p.b.title} · 충격 ${store.beats[p.b.key].shock}/10`}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_DREAD, verticalAlign: 'middle', marginRight: 5 }} />드레드(지속 불안)</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 14, height: 3, background: C_SHOCK, verticalAlign: 'middle', marginRight: 5 }} />충격(점프스케어·고어)</span>
            <span style={{ ...hint, fontSize: 11.5 }}>롤러코스터: 드레드를 길게 쌓고 충격으로 해소, 다시 가짜 안도로 떨어뜨려야 둔감화가 안 됩니다.</span>
          </div>
        </div>

        {/* ── 페이싱 자가진단 ── */}
        <div style={panel}>
          <div style={sectionTitle}>페이싱 자가진단 · {diagOk}/{diagnostics.length} 충족</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: d.ok ? 'var(--text)' : 'var(--warn)' }}>
                <span style={{ marginRight: 6 }}><Emoji e={d.ok ? '✅' : '⚠️'} /></span>{d.msg}
              </div>
            ))}
          </div>
        </div>

        {/* ── 12비트 입력 ── */}
        {BEATS.map((b) => {
          const st = store.beats[b.key]
          const isOpen = !!openKey[b.key]
          const hasContent = !!st.text.trim()
          const pn = preset.notes[b.key]
          return (
            <div key={b.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => patchBeat(b.key, { done: !st.done })} aria-label={`${b.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  <div style={posLine}>권장: {fmtPos(b.pos)} · 드레드 {st.dread}/10 · 충격 {st.shock}/10</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>{isOpen ? '접기 ▲' : '펼치기 ▼'}</button>
              </div>

              {isOpen && (
                <div style={section}>
                  <div style={funcBox}><strong style={{ color: 'var(--accent-2)' }}>{b.sub} · 기능</strong> — {b.func}</div>
                  <div style={hint}><strong>작법 팁:</strong> {b.tip}</div>
                  {pn && <div style={presetNote}><strong>[{preset.name}]</strong> {pn}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {b.ex.map((e, i) => <span key={i} style={exTag}>{e}</span>)}
                  </div>

                  <div style={subLabel}>이 비트에서 무슨 일이 일어나나요?</div>
                  <textarea style={ta} value={st.text} onChange={(e) => patchBeat(b.key, { text: e.target.value })} placeholder="장면·사건·분위기·감각(소리·그림자·냄새)을 자유롭게…" />

                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>드레드</span>
                    <input type="range" min={0} max={10} value={st.dread} onChange={(e) => patchBeat(b.key, { dread: Number(e.target.value) })} style={{ flex: 1, accentColor: C_DREAD }} aria-label="드레드(지속 불안)" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_DREAD }}>{st.dread}/10</strong>
                  </div>
                  <div style={sliderRow}>
                    <span style={{ ...subLabel, width: 70, flexShrink: 0 }}>충격</span>
                    <input type="range" min={1} max={10} value={st.shock} onChange={(e) => patchBeat(b.key, { shock: Number(e.target.value) })} style={{ flex: 1, accentColor: C_SHOCK }} aria-label="충격(점프스케어·고어)" />
                    <strong style={{ fontSize: 13, width: 44, textAlign: 'right', color: C_SHOCK }}>{st.shock}/10</strong>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* ── 연계 도구 ── */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          {RELATED.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '호러·공포' })} title={`${r.label} 열기`}>{emojify(r.label)}</button>
          ))}
        </div>
      </div>

      <div style={{ ...foot, borderBottom: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">프로젝트:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '12비트 플롯을 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet} title="작성한 비트를 글감(스니펫) 라이브러리에 저장"><Emoji e="💾" /> 글감으로 저장</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={() => setOpenKey(Object.fromEntries(BEAT_KEYS.map((k) => [k, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpenKey({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>초기화</button>
      </div>
    </div>
  )
}
