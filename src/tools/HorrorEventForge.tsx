// 호러 사건 생성기(HorrorEventForge) — 호러·공포 장르의 '사건·소재' 대형 생성기.
//  드레드(예감)→충격→여운의 호러 문법에 맞춘 슬롯들을 무작위 조합(잠금 🔒 / 부분 재생성 🎲)해
//  1조(1,000,000,000,000) 이상의 공포 사건·소재를 즉석에서 뽑는다. 전부 로컬, 외부 API 미사용.
//  연계(linkbus): 사건을 프로젝트('사건' 폴더)·스니펫·장소 라이브러리로, 관련 호러 도구로.
import { useMemo, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'horror-eventforge',
  name: '호러 사건 생성기(1조+ 조합)',
  icon: '🩸',
  group: '생성기',
  genre: '호러·공포',
  intro: '드레드→충격→여운의 공포 사건을 1조 가지 이상 무작위로 뽑는다',
  w: 500,
  h: 660,
}

// ---------- 슬롯 풀(장르 도시에 근거: 공간·언캐니·금기·off-screen·규칙·전염·여운) ----------
interface Slot { key: string; label: string; hint: string; options: string[] }

const SLOTS: Slot[] = [
  {
    key: 'subtype', label: '하위유형', hint: '사건의 결',
    options: [
      '유령·고딕', '악마·오컬트', '슬래셔', '바디 호러', '크리처·몬스터', '포크 호러',
      '우주적 공포', '사이코로지컬', '서바이벌·아포칼립스', '미스터리·분석형', '저주·계약',
      '빙의·신내림', '괴담·도시전설', '감염·기생', '컬트·사이비',
    ],
  },
  {
    key: 'place', label: '공간(고립)', hint: '탈출 불가가 핵심',
    options: [
      '눈에 갇힌 외딴 산장', '과거 살인이 있던 저택', '폐업한 정신병원 병동', '대대로 비밀을 묻은 종갓집',
      '신호가 끊긴 등대', '외부인을 적대하는 산골 마을', '물에 잠긴 지하 주차장', '낡은 아파트 1305호',
      '문 닫은 놀이공원 거울의 집', '재개발로 비워진 연립주택', '안개에 봉쇄된 섬', '심야의 24시 빨래방',
      '지하 깊은 폐광 갱도', '교회 지하 납골당', '눈보라에 멈춘 야간열차', '바다 한가운데 시추선',
      '환자 없는 새벽 응급실', '버려진 초등학교 4층 끝 교실', '재가 된 산불 마을의 단 한 채', '수몰된 옛 마을이 가뭄에 드러난 호수 바닥',
      '엘리베이터가 멈춘 고층 빌딩', '인적 끊긴 지하상가', '폐쇄된 지하철 역사', '터널 한가운데 고장 난 차 안',
      '면회 끊긴 요양원 3층', '사람을 받지 않는 산속 민박', '벽이 늘어나는 듯한 모텔 복도', '제사 지내는 본가의 사랑채',
      '컨테이너로 막힌 항구 창고', '눈먼 노인만 사는 막다른 골목',
    ],
  },
  {
    key: 'omen', label: '첫 균열', hint: '설명 가능할 법한 작은 이상',
    options: [
      '벽 안에서 긁는 소리가 난다', '가족사진 속 한 사람만 얼굴이 흐려진다', '아이가 보이지 않는 친구와 논다',
      '같은 시각마다 전화가 끊긴 채 걸려온다', '거울 속 내 동작이 반 박자 늦다', '복도 끝 인형이 매번 자리를 옮긴다',
      '냉장고 속 음식이 하루 만에 썩는다', '개가 빈 구석을 향해 으르렁댄다', '벽지 밑에서 손톱 자국이 배어 나온다',
      '없던 문이 복도 끝에 생겼다', '한밤중 누군가 침대 시트를 천천히 끌어내린다', '집 안에서만 라디오에 잡음 섞인 노래가 흐른다',
      '발자국이 천장에서 들린다', '욕실 거울에 입김도 없이 글자가 맺힌다', '아무도 누르지 않은 초인종이 울린다',
      '시계가 모두 3시 13분에 멈춘다', '계단 수가 매번 한 칸씩 다르다', '베개에서 흙냄새가 난다',
      '창밖에 늘 같은 자리에 선 실루엣이 있다', '잠들면 누군가 이름을 또박또박 부른다',
      '가전이 스스로 켜졌다 꺼진다', '집에 들인 적 없는 머리카락이 베개에 쌓인다',
      '벽 너머에서 아이 웃음소리가 샌다', '음성메시지에 숨소리만 30초 녹음돼 있다',
    ],
  },
  {
    key: 'uncanny', label: '언캐니(낯섦)', hint: '익숙한 게 미세하게 잘못됨',
    options: [
      '가족이 똑같이 생겼는데 표정이 없다', '미소가 늘 0.5초 늦게 지어진다', '눈을 깜빡이지 않는 손님이 앉아 있다',
      '말투는 같은데 옛 기억을 하나도 모른다', '관절이 반대로 꺾인 채 걷는다', '그림자가 몸과 다른 방향으로 진다',
      '목소리가 녹음된 것처럼 똑같이 반복된다', '거울에는 비치는데 사진에는 찍히지 않는다',
      '항상 같은 옷, 같은 자세로 서 있다', '웃을 때만 이가 너무 많아 보인다',
      '체온이 없어 손이 닿으면 서늘하다', '두 발이 바닥에서 1센티 떠 있다',
      '말끝마다 한 박자 메아리가 따라붙는다', '뒤돌아볼 때만 목이 너무 많이 돌아간다',
      '아이 키인데 손등에 노인의 검버섯이 있다', '문틈으로 볼 때만 얼굴이 길게 늘어난다',
      '식사를 흉내만 낼 뿐 삼키지 않는다', '눈동자가 가끔 위아래가 아니라 옆으로 감긴다',
      '체취 대신 향(線香) 냄새가 난다', '말할 때 입과 소리가 어긋난다',
    ],
  },
  {
    key: 'offscreen', label: 'off-screen', hint: '안 보여줄수록 무섭다',
    options: [
      '발소리만 점점 가까워진다', '문틈으로 손가락 끝만 보인다', '어둠 속에서 두 눈만 반짝인다',
      '반쯤 열린 문 너머가 보이지 않는다', '벽 반대편에서 같은 박자로 두드린다', '천장 위에서 무언가 끌리는 소리가 난다',
      '거울 가장자리에서만 움직임이 스친다', '커튼 뒤 실루엣이 천천히 부푼다', '욕조 물이 저절로 출렁인다',
      '계단을 오르는 그림자만 길어진다', '숨소리가 귓바퀴 바로 뒤에서 들린다', '전등이 깜빡일 때마다 한 발씩 다가와 있다',
      '사진 구석에 매번 다른 손이 찍힌다', '문 아래 틈으로 그림자가 가로지른다', '옆방에서 의자 끄는 소리만 반복된다',
      '창에 비친 방 안에 한 명이 더 서 있다', '벽장 안에서 옷걸이가 천천히 흔들린다', '복도 끝 어둠이 조금씩 이쪽으로 밀려온다',
      '냉장고 문 안쪽에서 톡톡 두드린다', '잠든 사이 침대 밑에서 머리카락이 끌린다',
    ],
  },
  {
    key: 'rule', label: '괴물의 규칙', hint: '어기면 처벌',
    options: [
      '밤 12시부터 새벽 4시 사이에만 움직인다', '이름을 세 번 부르면 찾아온다', '눈을 마주치면 표적이 된다',
      '거울을 보면 따라 들어온다', '소리를 내면 위치가 들킨다', '뒤돌아보면 잡힌다',
      '문지방을 넘게 해주면 들어온다', '대답하면 데려간다', '숫자를 거꾸로 세면 가까워진다',
      '잠들면 꿈으로 건너온다', '사진에 찍히면 다음 차례가 된다', '같은 길로 두 번 지나면 길을 잃는다',
      '울면 냄새를 맡고 온다', '약속을 어기면 대신 가장 아끼는 것을 가져간다', '불을 끄면 한 걸음 다가온다',
      '제 이름을 들으면 형체를 얻는다', '13번째 종이 울리면 봉인이 풀린다', '피를 보면 흥분한다',
      '거짓말을 하면 혀를 가져간다', '물에 비친 자기 모습을 보면 자리를 바꾼다',
      '오후 4시 44분에 거울 앞에 서면 손을 잡는다', '복도에서 신발 소리를 내면 따라온다',
    ],
  },
  {
    key: 'taboo', label: '건드린 금기', hint: '호기심·욕망의 처벌',
    options: [
      '열지 말라는 지하실 문을 열었다', '읽지 말라는 일기를 끝까지 읽었다', '파지 말라는 무덤을 팠다',
      '버려진 인형을 집에 들였다', '금줄 친 사당에 들어갔다', '돌아가신 분의 휴대폰을 켰다',
      '봉인된 항아리를 열었다', '하지 말라는 강령 의식을 따라 했다', '거울을 마주 보게 두었다',
      '죽은 이의 이름을 불렀다', '제삿밥에 손을 댔다', '오래된 우물을 들여다봤다',
      '경고를 무시하고 그 방에서 잤다', '주워 온 가면을 써 봤다', '낯선 번호의 영상통화를 받았다',
      '폐가에서 사진을 찍어 왔다', '저주받은 비디오를 끝까지 봤다', '남의 제사를 몰래 구경했다',
      '시신을 발견하고 신고하지 않았다', '받은 부적을 태워 버렸다',
      '약속한 공양을 한 번 거른다', '금지된 책의 마지막 장을 펼쳤다',
    ],
  },
  {
    key: 'escalation', label: '상승(가속)', hint: '합리적 설명이 무너짐',
    options: [
      '주변 사람들이 한 명씩 같은 말을 반복한다', '집 안의 물건들이 밤마다 재배치된다', '같은 하루가 미세하게 다르게 반복된다',
      '거울이란 거울이 모두 깨진다', '벽에서 손자국이 늘어난다', '잠든 가족이 한 명씩 눈을 뜨고 있다',
      '시간이 흐르지 않고 시계만 빨라진다', '냄새가 온 집을 뒤덮는다', '벽 너머 소리가 점점 또렷해진다',
      '꿈과 현실의 경계가 무너진다', '먹은 것이 자꾸 흙으로 변한다', '동물들이 모두 집을 떠난다',
      '거울 속 가족이 다르게 행동한다', '전화선·인터넷·전기가 차례로 끊긴다', '아는 사람의 얼굴이 하나씩 흐려진다',
      '몸에 모르는 멍과 글자가 돋는다', '집의 구조가 밤마다 조금씩 바뀐다', '그림자가 늘어나 사람 수보다 많아진다',
      '아이만 보이던 것이 어른에게도 보이기 시작한다', '벽시계가 모두 거꾸로 돈다',
      '먹이를 주듯 누군가 음식을 자꾸 가져다 놓는다', '거울 속에서 손이 점점 더 나와 있다',
    ],
  },
  {
    key: 'isolation', label: '고립 장치', hint: '외부 도움 차단',
    options: [
      '폭설이 길을 끊었다', '휴대폰이 권외다', '정전으로 모든 불이 꺼졌다', '다리가 끊겨 마을이 섬이 됐다',
      '차가 시동이 걸리지 않는다', '전화가 모두 자기 목소리로 받는다', '비상구가 안에서 잠겼다',
      '도와줄 사람이 모두 같은 편이 됐다', '안개로 한 치 앞이 안 보인다', '엘리베이터가 지하에서 멈췄다',
      'GPS가 없는 곳만 가리킨다', '문을 열면 같은 복도가 반복된다', '구조대가 며칠 뒤에야 온다고 한다',
      '바깥은 이미 모두가 변해 버렸다', '신고해도 아무도 믿지 않는다', '집 밖으로 나가면 길이 사라진다',
      '시간이 멈춰 아무도 깨어나지 않는다', '믿었던 가족이 문을 잠가 버렸다',
      '주변 모두가 한통속인 마을이다', '통신은 되지만 상대가 이미 죽은 사람이다',
    ],
  },
  {
    key: 'sensory', label: '감각 디테일', hint: '오싹함을 박는 한 줄',
    options: [
      '피비린내가 코를 찌른다', '천장에서 물방울이 똑, 똑 떨어진다', '곰팡내와 흙냄새가 뒤섞인다',
      '삐걱이는 마룻바닥 소리', '목덜미를 스치는 찬 입김', '귓가에 맴도는 속삭임',
      '입안에 도는 쇠 맛', '멀리서 끊겼다 이어지는 동요', '향과 촛농 타는 냄새',
      '벽을 긁는 손톱 소리', '방 안 공기가 급격히 차가워진다', '발밑에서 끈적이는 무언가',
      '라디오 잡음 사이로 새는 숨소리', '문을 두드리는 똑, 똑, 똑', '썩은 단내가 풍긴다',
      '깜빡이다 꺼지는 형광등', '거울 표면에 서리는 입김', '멀리서 우는 짐승 소리',
      '바닥에 길게 끌린 핏자국', '귓속에서 울리는 심장 박동', '머리카락이 살갗을 스치는 감촉',
      '재가 된 종이 냄새', '식은 손이 발목을 스친다',
    ],
  },
  {
    key: 'victim', label: '먼저 당하는 자', hint: '인과·도덕 구조',
    options: [
      '경고를 비웃던 회의주의자', '혼자 가겠다고 떨어진 사람', '제일 욕심을 부린 자', '비밀을 캐던 호기심 많은 자',
      '약속을 어긴 사람', '제일 안전하다 믿던 사람', '도와주러 온 외부인', '거짓말을 한 자',
      '규칙을 무시한 자', '먼저 폭력을 쓴 사람', '아이를 방치한 어른', '돈을 챙겨 도망치려던 자',
      '"잠깐 나갔다 올게" 한 사람', '제일 먼저 믿어 준 친구', '진실을 알아 버린 목격자', '대신 미끼가 된 사람',
      '제 발로 그 방에 들어간 자', '약자를 등진 자', '한밤에 혼자 화장실에 간 사람', '뒤를 돌아본 사람',
    ],
  },
  {
    key: 'revelation', label: '드러나는 진실', hint: '포위 단계의 정체·기원',
    options: [
      '이 집은 매장된 비극 위에 지어졌다', '괴물은 죽은 가족이 돌아온 것이다', '저주는 대를 이어 옮겨 다녔다',
      '주인공이 이미 오래전에 죽어 있었다', '구해 주던 사람이 사실 제물을 고르고 있었다', '마을 전체가 한 존재를 먹여 살린다',
      '괴물은 본인의 또 다른 자아다', '모두가 같은 꿈에 갇혀 있었다', '처음부터 탈출구는 없었다',
      '저주는 비디오·사진처럼 복제로 전염된다', '죽은 이는 약속을 받으러 온 것이다', '진짜 표적은 아직 태어나지 않은 아이다',
      '의식은 100년마다 한 명을 바치는 계약이다', '거울 속 세계가 진짜고 이쪽이 복제다', '실종된 이들은 모두 이 안에 있다',
      '주인공이 곧 다음 괴물이 된다', '경고하던 노인이 마지막 봉인이었다', '집은 떠난 자를 절대 보내 주지 않는다',
      '병의 정체는 사람을 바꿔치기하는 기생체다', '구원자가 처음부터 가해자였다',
    ],
  },
  {
    key: 'timelimit', label: '카운트다운', hint: '시한이 조인다',
    options: [
      '해가 뜨기 전까지', '비디오를 본 지 7일 안에', '13번째 종이 울리기 전에', '셋을 다 세기 전에',
      '촛불이 다 타기 전에', '다음 보름달이 뜨기 전에', '아침 첫차가 오기 전에', '제삿날 자정까지',
      '눈이 그치기 전까지', '49일이 차기 전에', '문이 완전히 열리기 전에', '심장이 100번 뛰기 전에',
      '전화가 세 번 울리기 전에', '거울에 손이 다 나오기 전에', '날이 완전히 어두워지기 전에', '마지막 한 명이 남기 전에',
      '시계가 4시 44분을 가리키기 전에', '봉인이 풀리는 자정까지', '구조대가 도착하기 전에', '이름이 다 불리기 전에',
    ],
  },
  {
    key: 'climax', label: '대면·결말', hint: '규칙 활용·희생·반전',
    options: [
      '심어 둔 규칙(소금·이름·불·해뜨기)을 역이용해 봉인한다', '핵심 인물의 희생으로 시간을 번다', '이긴 줄 알았는데 괴물이 다시 일어난다',
      '가장 무력했던 자가 마지막에 맞선다', '탈출했지만 저주가 함께 따라왔다', '괴물을 없앴지만 본인도 변해 버렸다',
      '모두 환각이었고 진실은 더 끔찍하다', '구원자가 진짜 적이었음이 드러난다', '저주를 다른 이에게 떠넘기고 살아남는다',
      '괴물의 정체가 사실 자기 자신이었다', '봉인했지만 알·생존체가 하나 남는다', '살아남았지만 아무도 믿어 주지 않는다',
      '약속을 지켜 풀려나지만 대가가 남는다', '마지막 컷에 불길한 징조가 비친다', '되돌아온 일상에 미세한 어긋남이 남는다',
      '괴물 대신 사랑하는 이를 잃고 끝난다', '저주의 사슬을 끊지만 기억을 모두 잃는다', '문을 닫았지만 안에 한 명을 두고 왔다',
      '거울을 깨뜨려 막지만 반사면이 또 있다', '끝났다 믿은 순간 전화벨이 다시 울린다',
    ],
  },
]

const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)

function randIdx(n: number) { return Math.floor(Math.random() * n) }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 관련 호러 도구(같은 장르 도구가 추가될 때 연계). 존재하지 않아도 버튼은 무해.
const REL: { id: string; label: string }[] = [
  { id: 'scene-forge', label: '🎬 장면 생성기' },
  { id: 'sensory-palette', label: '🌫 감각 팔레트' },
  { id: 'plot-pyramid', label: '🔺 플롯 피라미드' },
  { id: 'conflict-builder', label: '⚔ 갈등 빌더' },
]

export default function HorrorEventForge({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, randIdx(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')

  const rollAll = () => setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : randIdx(s.options.length)])))
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: randIdx(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggleLock = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]

  const eventText = useMemo(() => {
    return (
      `[${val('subtype')}] ${val('place')}. ` +
      `처음엔 사소했다 — ${val('omen')}. ` +
      `그런데 ${val('uncanny')}. ${val('offscreen')}. ` +
      `그것에는 규칙이 있다: ${val('rule')}. 화근은 ${val('taboo')}는 것. ` +
      `이후 ${val('escalation')}. 게다가 ${val('isolation')}. (${val('sensory')}) ` +
      `${val('victim')}이(가) 먼저 당한다. ` +
      `마침내 드러나는 진실 — ${val('revelation')}. ` +
      `${val('timelimit')} 끝내야 한다. 결말: ${val('climax')}.`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  const bodyHtml = useMemo(() => (
    `<p><b>유형</b> ${esc(val('subtype'))} · <b>무대</b> ${esc(val('place'))}</p>` +
    `<p><b>첫 균열</b> ${esc(val('omen'))}</p>` +
    `<p><b>언캐니</b> ${esc(val('uncanny'))}</p>` +
    `<p><b>보이지 않는 위협</b> ${esc(val('offscreen'))}</p>` +
    `<p><b>괴물의 규칙</b> ${esc(val('rule'))}</p>` +
    `<p><b>건드린 금기</b> ${esc(val('taboo'))}</p>` +
    `<p><b>상승</b> ${esc(val('escalation'))} / <b>고립</b> ${esc(val('isolation'))}</p>` +
    `<p><b>감각</b> ${esc(val('sensory'))}</p>` +
    `<p><b>먼저 당하는 자</b> ${esc(val('victim'))}</p>` +
    `<p><b>드러나는 진실</b> ${esc(val('revelation'))}</p>` +
    `<p><b>카운트다운</b> ${esc(val('timelimit'))}</p>` +
    `<p><b>대면·결말</b> ${esc(val('climax'))}</p>`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [picks])

  const title = `${val('subtype')} · ${val('place')}`

  const copy = () => { navigator.clipboard?.writeText(eventText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1600) }

  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title, bodyHtml, synopsis: eventText,
      icon: '🩸',
      meta: { 장르: '호러·공포', 하위유형: val('subtype'), 무대: val('place'), 규칙: val('rule'), 결말: val('climax') },
    })
    flash(id ? "프로젝트 '사건' 폴더에 추가됨" : '프로젝트에 연결되어 있지 않습니다')
  }
  const toSnippet = () => { addToLibrary('snippets', { text: eventText, source: '호러 사건 생성기', tags: ['호러·공포', '사건', val('subtype')] }); flash('스니펫으로 저장됨') }
  const toPlace = () => { addToLibrary('places', { name: val('place'), kind: '호러 무대', mood: val('subtype'), sensory: val('sensory'), history: val('revelation'), rules: val('rule'), notes: eventText, source: '호러 사건 생성기', fields: { name: val('place'), kind: '호러 무대', atmosphere: val('subtype'), sensory: val('sensory'), history: val('revelation'), rules: val('rule'), dangers: val('offscreen'), secrets: val('revelation'), notes: eventText } }); flash('장소 라이브러리에 저장됨') }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
        호러·공포 사건 조합 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지(1조+).
        마음에 드는 슬롯은 <Emoji e="🔒"/> 잠그고 나머지만 <Emoji e="🎲"/> 돌려 드레드→충격→여운이 살아 있는 사건을 찾으세요.
        {payload?.genre ? <span> · 요청 장르: <b>{String(payload.genre)}</b></span> : null}
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7 }}>
        {eventText}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 78, flexShrink: 0 }} title={s.hint}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" title={locked[s.key] ? '잠금 해제' : '이 슬롯 잠금'} onClick={() => toggleLock(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" title="이 슬롯만 다시" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 사건 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? "현재 사건을 프로젝트 '사건' 폴더에 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📥"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={toPlace}><Emoji e="🏚"/> 장소 저장</button>
        {REL.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '호러·공포', from: meta.id })}>{emojify(r.label)}</button>
        ))}
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
