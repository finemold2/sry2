// 무협 배경·현장 생성기(WuxiaSettingForge) — 강호(江湖)의 장소·분위기·디테일을 슬롯 조합으로 무작위 생성.
//   슬롯별 🔒 잠금 + 🎲 부분 재생성, 전체 조합수(1조+) 표시.
//   연계(linkbus): addToProject(kind:'setting', folder:'장소') 로 프로젝트 바인더에 장소 카드 추가,
//   장소 라이브러리(addToLibrary 'places')에 저장, 관련 도구(배경 설정집/장면 등) 열기.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useMemo, useState, useEffect } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'wuxia-settingforge', name: '무협 배경 생성기(1조+ 조합)', icon: '🏯', group: '배경', genre: '무협', intro: '강호의 객잔·문파·비동·설산을 무작위로 빚어내는 무협 전용 배경 생성기', w: 520, h: 640 }

const LS_KEY = 'sry:tool:wuxia-settingforge'

// 관련 도구 이름표(연계 버튼 라벨용)
const REL_LABEL: Record<string, string> = {
  'setting-bible': '🗺️ 배경 설정집',
  'scene-list': '🎬 장면 목록',
  'scene-forge': '🎬 장면 생성기',
  'sensory-palette': '🌫 감각 팔레트',
  'moodboard-grid': '🧩 무드보드',
  'imagination-gallery': '🖼 상상력 갤러리',
  'world-wiki': '📚 세계관 위키',
}

interface Slot { key: string; label: string; options: string[] }

// 무협 도시에 근거한 자작 데이터 — 일반론이 아닌 강호 특화·구체.
const SLOTS: Slot[] = [
  {
    key: 'locale', label: '현장(장소)', options: [
      '강을 낀 변두리 객잔(客棧)', '낙양(洛陽) 큰길의 표국(鏢局) 본단', '항주(杭州) 서호(西湖)가의 화방(畫舫)',
      '인적 끊긴 폐사(廢寺)의 대웅전', '절벽 아래 입을 벌린 비동(秘洞)', '대숲에 가려진 산속 사당(祠堂)',
      '구파(九派)의 산문(山門) 앞 돌계단', '소림(少林) 장경각(藏經閣) 뒤뜰', '무당(武當)의 운무 자욱한 자소궁(紫霄宮)',
      '화산(華山) 천길 벼랑의 논검대(論劍臺)', '사천당문(唐門)의 독초밭과 기관(機關) 회랑', '남궁세가(南宮世家)의 검총(劍塚)',
      '개방(丐幇) 분타(分舵)가 숨은 뒷골목 거지촌', '마교(魔敎) 총단으로 통하는 혈교(血敎)의 지하 제단',
      '새외(塞外)로 향하는 사막 한복판의 마른 우물터', '북해(北海)의 얼어붙은 빙궁(氷宮) 입구',
      '서장(西藏) 밀교 라마승의 설산 사원', '녹림(綠林) 산채(山寨)의 의자(義字) 깃발 나부끼는 채문(寨門)',
      '장강(長江) 물안개 속을 미끄러지는 거룻배 위', '도박장과 기루(妓樓)가 엉킨 환락가 뒷방',
      '관(官)의 손이 닿지 않는 국경 흑시(黑市)', '병기 두드리는 소리 끊이지 않는 야장(冶匠)의 대장간',
      '독인(毒人)이 칩거한 만독곡(萬毒谷) 어귀', '폐광(廢鑛) 갱도로 위장한 살막(殺幕)의 소굴',
      '무림맹(武林盟) 총단의 의사청(議事廳)', '연무장(鍊武場)의 흙바닥과 목인(木人) 항렬',
      '비무대회가 열리는 너른 광장의 비무대(比武臺)', '고묘(古墓) 깊숙한 석실(石室)',
      '운기조식(運氣調息)하기 좋은 폭포 아래 청석(靑石)', '독사 우글대는 무저갱(無底坑) 위 외나무다리',
      '검선(劍仙)의 전설이 깃든 촉산(蜀山)의 구름다리', '천마신교 후예가 숨어든 산골 약방(藥房)',
      '강호 영웅들이 모이는 떠들썩한 영웅대회 천막촌', '점창파(點蒼派) 사일검법(射日劍法)을 새긴 절벽 암각화',
      '제갈세가(諸葛世家)의 진법으로 미로가 된 죽림(竹林) 별원',
    ],
  },
  {
    key: 'era', label: '시각·계절', options: [
      '동이 트기 직전 회청빛 새벽', '운무가 산허리를 감는 이른 아침', '땡볕이 흙먼지를 달구는 한낮',
      '땅거미가 짙어지는 황혼', '횃불이 일렁이는 한밤중', '달도 별도 없는 그믐의 칠흑',
      '보름달이 검신(劍身)에 어리는 망월(望月)', '봄비가 처마를 두드리는 곡우(穀雨) 무렵', '매미 소리 자지러지는 삼복(三伏)',
      '서리가 검집에 내려앉는 상강(霜降)의 새벽', '낙엽이 비무대를 구르는 늦가을', '함박눈이 산문을 덮는 한겨울',
      '진눈깨비 흩날리는 음산한 저녁', '천둥이 산을 울리는 폭풍우의 밤', '해무(海霧)가 부두를 삼키는 정오',
      '모래바람이 시야를 지우는 사막의 해질녘', '얼음 안개가 숨을 얼리는 빙천(氷天)의 새벽',
      '복사꽃 흩날리는 청명(淸明)의 한낮', '귀뚜라미 우는 백로(白露)의 깊은 밤',
      '대보름 등불이 강을 메우는 상원절(上元節)', '안개비가 검극(劍極)을 적시는 우수(雨水) 무렵',
      '눈 그친 뒤 푸르게 갠 설청(雪晴)의 아침', '낙화유수(落花流水) 흩어지는 늦봄의 황혼',
      '동지(冬至) 긴 밤의 매서운 칼바람',
    ],
  },
  {
    key: 'power', label: '세력 색채', options: [
      '구파일방(九派一幇)의 정파(正派) 기풍이 깃든', '무림맹의 위엄과 규율이 서린', '사파(邪派) 무리가 은밀히 장악한',
      '마교·일월신교(日月神敎)의 기운이 스민', '천마(天魔)의 그림자가 어른거리는', '새외 세력과 밀교의 이질적인',
      '녹림 산적과 흑도(黑道)가 활개 치는', '관(官)도 손대지 못하는 무법(無法)의', '명문 세가(世家)의 가풍이 배인',
      '개방의 정보망이 그물처럼 깔린', '살수 조직 살막의 살기가 도사린', '독문(毒門)·독인의 음습한',
      '표국과 표사(鏢師)들의 의리가 오가는', '정사(正邪)의 경계가 흐릿한 회색의', '몰락한 옛 문파의 잔향만 남은',
      '천하제일을 노리는 야심가들이 모여드는', '은원(恩怨)이 얽히고설킨', '관무불가침(官武不可侵)이 깨지기 직전인',
      '선협(仙俠)·검선의 신비가 어린', '회귀자(回歸者)의 미래 지식이 숨어 든',
      '비급 쟁탈에 군웅이 들끓는', '사문 멸문(滅門)의 한이 사무친', '천마와 무림맹주가 대치하는',
      '협의(俠義)와 신의(信義)가 시험받는',
    ],
  },
  {
    key: 'mood', label: '분위기', options: [
      '검을 뽑기 직전의 숨 막히는 살기', '운기조식하듯 가라앉은 정적', '은원이 곧 터질 듯한 팽팽한 긴장',
      '협객의 호기(豪氣)가 들끓는 활기', '주화입마(走火入魔)의 광기가 번지는 불온함', '강호 은퇴를 꿈꾸는 쓸쓸한 적막',
      '비급(秘笈)을 둘러싼 음흉한 탐욕', '사문(師門)의 정이 따스히 감도는 온기', '기연(奇緣)을 예고하는 신비한 기운',
      '천하대전을 앞둔 비장한 결의', '심마(心魔)가 스며드는 음습한 불안', '무도(武道)를 향한 경건한 침묵',
      '술기운과 호언장담이 오가는 호쾌함', '배신의 칼끝이 어른거리는 의심', '귀은(歸隱)한 고수의 초연한 무심',
      '독과 암기의 보이지 않는 위협', '천하제일을 가리는 흥분과 환호', '폐인이 될지도 모를 절체절명의 비통',
      '복수를 벼리는 서늘한 집념', '기연을 거머쥔 자의 벅찬 희열',
      '강호 도의(道義)가 무너지는 환멸', '술과 칼이 어우러진 호방한 낭만',
      '환골탈태를 앞둔 떨리는 기대', '단전이 부서질 듯한 처절한 고통',
    ],
  },
  {
    key: 'detail', label: '강호 디테일', options: [
      '벽에 걸린 강호 수배도(手配圖)와 현상금 방(榜)', '먼지 쌓인 비급 한 권이 함(函) 속에 잠들어',
      '단전(丹田)에 진기(眞氣)를 갈무리하는 노고수(老高手)', '점혈(點穴)당해 굳어버린 무인(武人)이 한구석에',
      '검기(劍氣)에 두 동강 난 청석 기둥', '벽면을 따라 새겨진 알 수 없는 심법(心法) 구결(口訣)',
      '바닥에 흩뿌려진 당문(唐門)의 암기(暗器)와 독침', '향로에서 피어오르는 미혼산(迷魂散)의 옅은 연기',
      '환골탈태(換骨奪胎)의 흔적인 허물 벗은 살갗 자국', '내단(內丹)을 품은 영물(靈物)의 빛바랜 뼈',
      '천하제일인의 친필 편액(扁額)', '신병이기(神兵利器)가 봉인된 검갑(劍匣)',
      '운기조식 자세 그대로 좌화(坐化)한 전대고수의 백골', '기문진(奇門陣)의 방위를 가리키는 팔괘(八卦) 돌판',
      '핏자국이 마르지 않은 살수의 비수(匕首)', '만년하수오(萬年何首烏)가 자라는 음지의 약초밭',
      '강호 서열이 빼곡히 적힌 영웅첩(英雄帖)', '점혈·해혈(解穴)에 쓰는 은침과 의서(醫書)',
      '검집을 닦는 헝겊과 숫돌, 검수(劍鬚) 한 올', '낡은 표기(鏢旗)와 호위 임무의 노정(路程)이 적힌 죽간',
      '독을 시험한 듯 검게 죽은 은(銀) 수저', '벽에 박힌 채 식지 않은 장력(掌力)의 손자국',
      '경공으로 스친 듯 발자국 없는 흙바닥', '검강(劍罡)에 베여 단면이 거울처럼 매끄러운 바위',
      '공청석유(空靑石乳)가 방울져 떨어지는 종유석', '점혈 혈도(穴道)가 붉은 점으로 표시된 인체 경맥도(經脈圖)',
      '주화입마로 토혈한 자국이 번진 좌선포(坐禪布)', '천마신교의 핏빛 일월(日月) 문양 깃발',
    ],
  },
  {
    key: 'sense', label: '오감(五感)', options: [
      '코를 찌르는 핏비린내와 쇠 냄새', '향로의 단향(檀香)과 묵은 비급의 곰팡내',
      '멀리서 울리는 산사(山寺)의 새벽 종소리', '검과 검이 부딪는 쇳소리의 여운', '폭포가 청석을 때리는 우레 같은 물소리',
      '혀끝에 도는 영약(靈藥)의 쌉쌀한 단맛', '입안에 번지는 비릿한 피 맛', '독초의 알싸하고 아린 냄새',
      '운기로 달아오른 단전의 후끈한 열기', '경맥(經脈)을 타고 도는 진기의 찌릿한 떨림',
      '검집을 쥔 손바닥의 거친 굳은살', '설산 빙풍(氷風)에 살갗이 에이는 시림',
      '발밑에서 부서지는 마른 댓잎 소리', '귓가를 스치는 경공(輕功)의 옷자락 바람',
      '향긋한 죽엽청(竹葉靑) 술내와 화로 연기', '폐사에 고인 축축한 이끼 냄새',
      '비단 옷자락이 스치는 사각임', '먼 산에서 우는 영물(靈物)의 기괴한 울음',
      '강기(罡氣)가 대기를 가르는 날카로운 파공음(破空音)', '진기가 들끓어 후끈 달아오른 공기',
      '미혼산에 아득해지는 머릿속의 어지러움', '설산 사원의 라마승이 외는 낮은 진언(眞言)',
      '대장간 풀무가 토하는 벌건 쇳물의 열기', '강가 갈대밭을 훑는 축축한 물비린내',
    ],
  },
  {
    key: 'event', label: '벌어질 사건', options: [
      '낯선 무인이 객잔 문을 박차고 들어선다', '강호의 은원이 한칼에 결판나려 한다',
      '죽어가는 절대고수가 전인(傳人)을 찾아 무공을 전수하려 한다', '비급을 노린 군웅(群雄)이 한자리에 모여든다',
      '폐인 취급받던 자가 숨겨온 진짜 실력을 드러낸다', '주화입마에 든 무인이 발광하기 시작한다',
      '비무(比武)의 마지막 한 수가 승부를 가른다', '사부가 사실은 원수였다는 진실이 밝혀진다',
      '암기와 독이 어둠 속에서 날아든다', '기관(機關)이 작동해 석실이 닫히기 시작한다',
      '정파와 마교가 정면으로 충돌하려 한다', '회귀(回歸)한 고수가 미래의 비극을 막으려 움직인다',
      '신병이기를 둘러싼 쟁탈전이 불붙는다', '환골탈태의 고통 속에 한 무인이 다시 태어난다',
      '점혈로 제압당한 인질을 두고 협상이 벌어진다', '연수합격(聯手合擊)으로 절대고수를 에워싼다',
      '진법(陣法)에 갇힌 일행이 활로를 찾아 헤맨다', '강호 수배자의 정체가 객잔 안에서 들통난다',
      '영약을 차지하려 영물과 사투가 벌어진다', '천하제일을 가리는 화산논검(論劍)이 시작된다',
      '배신자의 비수가 동료의 등을 노린다', '귀은했던 노고수가 마지막으로 검을 뽑는다',
      '절벽에서 추락한 자가 비동의 기연을 마주한다', '특이체질(구음절맥·만독불침)이 뜻밖에 발현된다',
      '표국 표물(鏢物)을 노린 녹림이 길목을 막아선다', '천마가 강호 정복의 야망을 선포한다',
      '흡성대법(吸星大法)으로 내공을 빼앗기는 자가 나타난다', '미녀 고수의 호위를 둘러싼 인연이 얽히기 시작한다',
    ],
  },
  {
    key: 'terrain', label: '지형·구조', options: [
      '굽이쳐 흐르는 강물과 나루터', '깎아지른 천길 절벽과 잔도(棧道)',
      '운무에 잠긴 첩첩 봉우리', '끝없이 이어진 사막의 모래언덕',
      '눈에 덮인 설산과 빙판 호수', '빽빽한 대숲과 죽림(竹林)',
      '미로 같은 뒷골목과 기와지붕', '굽이진 회랑과 정원이 딸린 누각(樓閣)',
      '횃불만 밝힌 지하 석실과 갱도', '향불 자욱한 사원의 대전(大殿)',
      '연무장 흙바닥과 병기 거치대', '물안개 낀 호수 위의 화방(畫舫)',
      '바위투성이 협곡과 외나무다리', '기관과 함정이 깔린 비도(秘道)',
      '들끓는 객잔의 누상(樓上)과 누하(樓下)', '깃발 휘날리는 산채의 목책(木柵)',
      '폐허가 된 옛 문파의 무너진 전각', '팔괘 방위로 짜인 기문진(奇門陣)의 진지',
    ],
  },
  {
    key: 'signature', label: '무공·기연 흔적', options: [
      '검기상인(劍氣傷人)의 흔적이 허공에 남은 듯한', '내공 깊은 자만 느끼는 무형(無形)의 기파(氣波)가 흐르는',
      '경공 고수가 답설무흔(踏雪無痕)으로 지나간', '점혈·해혈의 기예가 곳곳에 베푼',
      '비급 한 줄이 절세무공(絶世武功)의 단서가 되는', '영약·내단의 정기(精氣)가 서린',
      '주화입마의 사기(邪氣)가 도사린', '환골탈태의 신비가 깃든',
      '독공(毒功)과 만독불침(萬毒不侵)이 겨루는', '강기(罡氣)와 호신강기(護身罡氣)가 부딪친',
      '심마(心魔)를 부르는 마공(魔功)의 잔향이 도는', '천하제일 신공(神功)의 비밀이 봉인된',
      '흡성대법의 흔적으로 진기가 메마른', '검총(劍塚)의 검의(劍意)가 무인을 시험하는',
      '반로환동(返老還童)한 노고수의 기운이 어린', '등봉조극(登峰造極)의 경지를 엿보게 하는',
      '연수합격·진법으로 고수를 가두는 살초(殺招)가 배치된', '회귀자의 미래 무공이 한발 앞서 펼쳐지는',
    ],
  },
]

// 전체 조합수 — 슬롯 옵션 수의 곱. (도구 규약상 핵심 생성기는 1조+ 지향)
const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)

function randIdx(n: number) { return Math.floor(Math.random() * n) }

interface SavedPreset { id: string; name: string; picks: Record<string, number>; ts: number }

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p as SavedPreset[]
    }
  } catch { /* noop */ }
  return []
}

export default function WuxiaSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets())
  // [추가] 사용자 정의 항목(라벨+값) — 무작위 생성하지 않고 사용자가 직접 입력. 재생성 시 값만 비우고 라벨 유지.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  // [추가] 고정 '기타' 자유 입력
  const [etc, setEtc] = useState('')

  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름(예: 비밀·전설·금기 등)')?.trim()
    if (!label) return
    setCustom((c) => [...c, { id: 'cst_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((c) => c.map((it) => (it.id === id ? { ...it, value } : it)))
  const setCustomLabel = (id: string, label: string) => setCustom((c) => c.map((it) => (it.id === id ? { ...it, label } : it)))
  const delCustom = (id: string) => setCustom((c) => c.filter((it) => it.id !== id))

  // [추가] 다른 도구로 보낼 fields 에 합칠 사용자 정의·기타(값 있는 것만)
  const extraFields = (): Record<string, string> => {
    const f: Record<string, string> = {}
    for (const it of custom) { const l = it.label.trim(); const v = it.value.trim(); if (l && v) f[l] = v }
    if (etc.trim()) f.etc = etc.trim()
    return f
  }
  // [추가] 복사/요약 텍스트에 덧붙일 사용자 정의·기타
  const extraText = (): string => {
    const parts: string[] = []
    for (const it of custom) { const l = it.label.trim(); const v = it.value.trim(); if (l && v) parts.push(`${l}: ${v}`) }
    if (etc.trim()) parts.push(`기타: ${etc.trim()}`)
    return parts.length ? '\n' + parts.join('\n') : ''
  }

  // payload.genre 활용 — 무협 외 장르로 열리면 안내(데이터 자체는 무협 특화)
  const genreNote = useMemo(() => {
    const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
    return g && g !== '무협' ? `요청 장르 '${g}' — 이 도구는 무협(武俠) 전용 데이터로 빚습니다.` : ''
  }, [payload])

  // 프리셋 영속(localStorage) + 언마운트 정리
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(presets)) } catch { /* 용량 초과 등 무시 */ }
  }, [presets])
  useEffect(() => {
    return () => { /* 언마운트 시 타이머/구독 없음 — 별도 정리 불필요 */ }
  }, [])

  const rollAll = () => {
    setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
    // [추가] 새 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(라벨)은 유지
    setCustom((c) => c.map((it) => ({ ...it, value: '' })))
    setEtc('')
  }
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]

  // 장소 이름(라이브러리/프로젝트 제목용) — 세력 색채 + 현장
  const placeName = useMemo(() => `${val('power')} ${val('locale')}`, [picks]) // eslint-disable-line react-hooks/exhaustive-deps

  const sceneText = useMemo(() => {
    return `[${val('era')}] ${val('power')} ${val('locale')}. ${val('terrain')}이(가) 펼쳐진 곳, 분위기는 ${val('mood')}. ` +
      `${val('signature')} 이곳, 현장에는 ${val('detail')} 있고, ${val('sense')}가 감돈다. ` +
      `이윽고 ${val('event')}.`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1600) }
  const copy = () => { navigator.clipboard?.writeText(sceneText + extraText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // [연계] 프로젝트 바인더에 장소 카드(설정) 추가
  const toProject = () => {
    const id = addToProject({
      kind: 'setting', root: 'research', folder: '장소',
      title: placeName,
      icon: '🏯',
      bodyHtml:
        `<p><b>${esc(placeName)}</b></p>` +
        `<p>시각·계절: ${esc(val('era'))}</p>` +
        `<p>지형·구조: ${esc(val('terrain'))}</p>` +
        `<p>분위기: ${esc(val('mood'))}</p>` +
        `<p>무공·기연 흔적: ${esc(val('signature'))}</p>` +
        `<p>강호 디테일: ${esc(val('detail'))}</p>` +
        `<p>오감: ${esc(val('sense'))}</p>` +
        `<p>벌어질 사건: ${esc(val('event'))}</p>` +
        custom.filter((it) => it.label.trim() && it.value.trim()).map((it) => `<p>${esc(it.label.trim())}: ${esc(it.value.trim())}</p>`).join('') +
        (etc.trim() ? `<p>기타: ${esc(etc.trim())}</p>` : '') +
        `<p>${esc(sceneText)}</p>`,
      synopsis: sceneText,
      // [표준] character(설정 카드 필드) 슬롯에 정규(장소) 키 추가 — 받는 허브가 기본 칸에 채우도록(기존 키 유지)
      character: {
        name: placeName, kind: val('locale'), mood: val('mood'), 시각: val('era'), 세력: val('power'), 지형: val('terrain'),
        atmosphere: val('mood'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('era'),
        history: `${val('power')} · ${val('era')}`,
        culture: val('power'),
        dangers: val('event'),
        landmarks: `${val('signature')} / ${val('detail')}`,
        notes: sceneText,
        // [추가] 사용자 정의 항목·기타(값 있는 것만)
        ...extraFields(),
      },
      meta: { 현장: val('locale'), 세력: val('power'), 분위기: val('mood'), 시각: val('era'), 지형: val('terrain'), 무공흔적: val('signature'), 장르: '무협' },
    })
    flash(id ? '프로젝트에 장소 추가됨(자료 ▸ 장소)' : '프로젝트에 연결되지 않았습니다')
  }

  // [연계] 장소 라이브러리에 저장
  const toLibrary = () => {
    addToLibrary('places', {
      name: placeName,
      kind: val('locale'),
      mood: val('mood'),
      sensory: val('sense'),
      history: `${val('power')} / ${val('era')} / ${val('terrain')} / ${val('event')}`,
      notes: sceneText,
      // [표준] 배경 설정집 등 허브가 기본 칸에 채우도록 정규(장소) 키 fields 동반(기존 키 유지)
      fields: {
        name: placeName,
        kind: val('locale'),
        atmosphere: val('mood'),
        sensory: val('sense'),
        geography: val('terrain'),
        climate: val('era'),
        history: `${val('power')} · ${val('era')}`,
        culture: val('power'),
        dangers: val('event'),
        landmarks: `${val('signature')} / ${val('detail')}`,
        notes: sceneText,
        // [추가] 사용자 정의 항목·기타(값 있는 것만)
        ...extraFields(),
      },
      source: '무협 배경 생성기',
    })
    flash('장소 라이브러리에 저장')
  }

  // [연계] 배경 설정집으로 보내기(데이터 동반)
  const toSettingBible = () => {
    openToolLinked('setting-bible', {
      genre: '무협',
      place: {
        name: placeName, type: '무협 현장', mood: val('mood'), sensory: val('sense'), history: `${val('power')} · ${val('era')}`, notes: sceneText,
        // [표준] 배경 설정집이 기본 칸에 채우도록 정규(장소) 키 fields 동반(기존 키 유지)
        fields: {
          name: placeName,
          kind: val('locale'),
          atmosphere: val('mood'),
          sensory: val('sense'),
          geography: val('terrain'),
          climate: val('era'),
          history: `${val('power')} · ${val('era')}`,
          culture: val('power'),
          dangers: val('event'),
          landmarks: `${val('signature')} / ${val('detail')}`,
          notes: sceneText,
          // [추가] 사용자 정의 항목·기타(값 있는 것만)
          ...extraFields(),
        },
      },
    })
    flash('배경 설정집으로 보냄')
  }

  const savePreset = () => {
    const name = placeName.length > 22 ? placeName.slice(0, 22) + '…' : placeName
    setPresets((p) => [{ id: 'wsf_' + Date.now().toString(36), name, picks: { ...picks }, ts: Date.now() }, ...p].slice(0, 40))
    flash('현재 조합을 즐겨찾기에 저장')
  }
  const applyPreset = (p: SavedPreset) => { setPicks({ ...p.picks }); flash('즐겨찾기 불러옴') }
  const delPreset = (id: string) => setPresets((arr) => arr.filter((x) => x.id !== id))

  const related = (TOOL_RELATIONS['setting-bible'] || []).filter((id) => id !== 'setting-bible' && REL_LABEL[id]).slice(0, 5)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', overflow: 'auto' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        조합 가능 강호 현장 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지(1조+). 슬롯을 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 원하는 배경을 빚으세요.
      </div>
      {genreNote && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}>※ {genreNote}</div>}

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.65 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{placeName}</div>
        {sceneText}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 74, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}

        {/* [추가] 사용자 정의 항목 — 직접 입력(무작위 생성 안 함). 재생성 시 값만 비우고 라벨 유지 */}
        {custom.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <input value={it.label} onChange={(e) => setCustomLabel(it.id, e.target.value)} title="항목 이름" style={{ width: 74, flexShrink: 0, fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '2px 0' }} />
            <input value={it.value} onChange={(e) => setCustomValue(it.id, e.target.value)} placeholder="직접 입력…" style={{ flex: 1, fontSize: 13, lineHeight: 1.4, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', color: 'var(--text)' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => delCustom(it.id)}>✕</button>
          </div>
        ))}

        <div style={{ display: 'flex' }}>
          <button className="minibtn" onClick={addCustom} title="직접 채울 빈 항목을 추가합니다(무작위 생성 안 함)">＋ 항목 추가</button>
        </div>

        {/* [추가] 고정 '기타' 자유 입력 */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>기타</div>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어두세요…" rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13, lineHeight: 1.5, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 강호 현장 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={savePreset}><Emoji e="⭐"/> 즐겨찾기</button>
      </div>

      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '현재 현장을 프로젝트 자료(장소)에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="🏞"/> 장소 저장</button>
        <button className="linkbtn" onClick={toSettingBible}><Emoji e="🗺️"/> 배경 설정집으로</button>
        {related.filter((id) => id !== 'setting-bible').map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id, { genre: '무협' })}>{emojify(REL_LABEL[id] || id)}</button>
        ))}
      </div>

      {presets.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}><Emoji e="⭐"/> 즐겨찾기 ({presets.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflow: 'auto' }}>
            {presets.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <button className="linkbtn" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => applyPreset(p)} title="이 조합 불러오기">{p.name}</button>
                <button className="minibtn" title="삭제" onClick={() => delPreset(p.id)}><Emoji e="🗑"/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
