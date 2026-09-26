// 로맨스판타지 배경·현장 생성기(RomfanSettingForge)
//   로판 도시에에 근거한 '무대' 생성기 — 제국/왕국 배경 무대를 슬롯 무작위 조합으로 만든다.
//   현장(설렘·정치 갈등의 무대) × 시각·계절·기상 × 무대 정경(세계관 디테일) × 분위기(로판 정서)
//   × 장면 장치(로판 코드: 회빙환·악역영애·forced proximity·공개망신 역전 등) × 감각 디테일(다중 슬롯 5개)
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터, Math.random).
//   localStorage('sry:tool:romfan-settingforge') 만 사용. 언마운트 시 타이머 정리.
// 연계: 공유 장소 라이브러리(addToLibrary('places')) + 프로젝트(addToProject kind:setting, folder:'장소')
//   + 글감 스니펫(addToLibrary('snippets')) + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'romfan-settingforge',
  name: '로맨스판타지 배경·현장 생성기',
  icon: '👑',
  group: '배경',
  genre: '로맨스판타지',
  intro: '황궁·공작저·신전·사교계… 로판 세계의 무대를 정경·계절·정서·장면 장치·감각으로 무작위 조합합니다',
  w: 600,
  h: 700,
}

const LS_KEY = 'sry:tool:romfan-settingforge'

// ── 슬롯 풀(전부 자작·로판 특화·구체적) ──────────────────────────────
// 로판 도시에 근거:
//   서양 제국풍 기본값(황궁·사교계·무도회·영지/공작저) + 동양풍 변주(후궁·세가) + 신전/마탑/아카데미.
//   핵심 코드: 회빙환(회귀·빙의·환생)·원작 강제력·악역영애 파멸 플래그 회피·신탁/예언·계약결혼·
//   공개 망신 역전(Public Reckoning)·forced proximity·집착광공·딸바보 육아·호감도 시스템.

// 현장(설렘과 정치 갈등이 벌어지는 로판의 대표 무대) — 구체적 장소.
const PLACES = [
  '샹들리에가 별처럼 쏟아지는 황궁 대연회장, 데뷔탕트들이 줄지어 선 한가운데',
  '공작저 장미 미궁 가장 깊은 곳, 유리 천장으로 달빛이 떨어지는 온실',
  '회귀 전 처형당했던 바로 그 황궁 광장, 단두대가 치워진 텅 빈 새벽',
  '신탁이 울려 퍼지는 대신전 제단 앞, 성녀의 흰 베일이 빛에 물드는 자리',
  '마탑 꼭대기 마탑주의 서재, 떠 있는 마법서들이 푸르게 빛나는 둥근 방',
  '황태자의 집무실, 촛대 아래 결재 서류가 산처럼 쌓인 흑단 책상 너머',
  '폭설로 마차가 끊긴 변경 영지의 산장, 벽난로 하나뿐인 좁은 응접실',
  '귀족 영애의 사교계 데뷔를 앞둔 드레스 가봉실, 거울이 사방을 두른 방',
  '황궁 정원 가장 외진 분수대 곁, 약혼식이 파투난 직후의 적막한 달밤',
  '아카데미 마법 실습탑 옥상, 떨어지는 별똥별을 함께 올려다보는 난간',
  '제국 도서관 금서고 깊숙한 서가, 손이 같은 고서로 향한 좁은 통로',
  '후궁 처소의 회랑, 등롱 불빛이 비단 발을 비추는 늦은 밤',
  '세가(世家)의 연무장, 비 그친 진흙 위에 검 두 자루가 마주 선 새벽',
  '계약 결혼식을 올린 직후의 텅 빈 대성당, 꽃잎이 흩어진 버진로드',
  '위장 부부로 들어선 공작가 신혼 침실, 침대가 하나뿐인 어색한 첫날밤',
  '황궁 무도회에서 빠져나온 발코니, 도시의 불빛이 발아래 깔린 난간',
  '영지 시찰을 나선 마차 안, 덜컹임에 어깨가 자꾸 맞닿는 좁은 좌석',
  '재판이 열리는 만조백관 가득한 황궁 알현실, 죄가 폭로되기 직전의 적막',
  '신년 가면무도회 한복판, 누구인지 모른 채 손을 맞잡고 도는 왈츠 중앙',
  '몰락 가문의 낡은 별저, 먼지 쌓인 가보 초상화가 늘어선 어둑한 복도',
  '정령의 숲 한가운데 빛나는 호숫가, 계약 정령이 깃든 신성한 물가',
  '황궁 온실 다과회, 장미 향이 진동하는 티타임의 둥근 테이블',
  '여관에 방이 하나뿐이라 어쩔 수 없이 함께 든 변경 마을의 작은 객실',
  '연적이 지켜보는 가운데 손을 잡고 입장해야 하는 황실 가든파티',
  '회귀자만 아는 비극의 그날, 운명이 갈리는 황궁 대계단 위',
  '딸바보 보호자들이 둘러앉은 공작저 육아실, 요람 곁의 따뜻한 벽난로 앞',
  '황제의 즉위식이 열리는 황금 옥좌의 방, 만인의 시선이 쏠린 단상 아래',
  '예언서가 봉인된 신전 지하 성소, 촛불 하나만이 일렁이는 돌계단 끝',
  '국경을 넘는 호송 마차 행렬 속, 포로로 묶인 채 마주 앉은 좁은 짐칸',
  '한겨울 사냥 대회의 외딴 산막, 눈보라에 갇혀 단둘이 남은 통나무 방',
  '서출이라 천대받던 별채 다락방, 빗물이 스미는 낡은 창가 침상 곁',
  '황후의 처소 앞 긴 회랑, 시녀들이 모두 물러간 깊은 밤의 촛불 행렬',
  '대공의 영지로 향하는 마지막 역참, 마차를 갈아타기 직전의 텅 빈 대합실',
  '마법 계약서에 서명이 마르는 마탑 계약실, 마력진이 발밑에서 빛나는 방',
  '성녀 책봉식을 앞둔 신전 회랑, 흰 백합이 양옆으로 늘어선 긴 통로',
  '귀족 자제들의 아카데미 입학 무도회, 첫인사를 나누는 대리석 홀 중앙',
  '버려진 황녀가 숨어 지내던 외성 폐궁, 담쟁이가 뒤덮은 무너진 정원',
  '황실 약혼 발표가 울려 퍼지는 종탑 아래, 군중이 환호하는 광장 한복판',
  '집착하는 남주가 가둬둔 새장 같은 별궁, 금사슬 커튼이 드리운 침실',
  '회귀 후 처음 마주한 그 무도회장 입구, 운명을 바꿀 첫걸음을 앞둔 문턱',
  '황실 마구간 뒤편의 한적한 마장, 갈기를 쓸어내리던 손이 멈춘 새벽녘',
  '귀족 영애들의 자수 모임이 끝난 응접실, 마지막 한 사람만 남은 오후',
  '대관식 리허설이 한창인 텅 빈 대성당, 발소리만 울리는 회랑 한가운데',
  '폐위된 황후가 유폐된 북쪽 탑 꼭대기, 쇠창살 너머로 도시가 내려다보이는 방',
  '가면을 벗는 자정 직전의 비밀 정원, 분수 물소리만 남은 미로의 끝',
  '전장에서 돌아온 기사를 맞는 개선문 아래, 환호가 잦아든 늦은 저녁의 광장',
  '약초가 마르는 신전 부속 약방, 달인 탕약 김이 천장으로 피어오르는 한낮',
  '황실 보물고 깊은 곳의 봉인된 방, 대대로 전해진 유물이 잠든 어둠 속',
]

// 시각·계절·기상 — 정서를 증폭하는 시간대·날씨(제국풍 무대 톤).
const TIMES = [
  '벚꽃 같은 흰 꽃잎이 정원에 흩날리는 제국의 봄날 오후',
  '매미 소리가 잦아든 한여름 밤, 후텁지근한 궁정의 공기',
  '첫눈이 소리 없이 첨탑 위에 내려앉는 12월의 깊은 밤',
  '단풍이 핏빛으로 물든 늦가을, 비스듬히 기우는 노을 무렵',
  '소나기가 막 그치고 무지개가 첨탑에 걸린 여름 저녁',
  '안개가 자욱하게 깔린 이른 새벽, 신전 종이 울리기 직전의 시간',
  '도시의 가스등이 하나둘 켜지는 황혼 녘',
  '폭설이 모든 소리를 삼킨 한겨울 자정의 황궁',
  '장맛비가 스테인드글라스를 두드리는 흐린 오후',
  '별이 유난히 쏟아지던 정령의 숲의 한여름 밤',
  '신년 축제로 들뜬 가면무도회의 저녁',
  '봄꽃이 다 진 자리에 연둣빛 잎이 돋는 늦봄의 아침',
  '두 개의 달이 유난히 밝아 그림자가 또렷한 보름밤',
  '아침 햇살이 회랑 기둥 사이로 길게 드리운 휴일의 늦은 오전',
  '환절기의 찬바람이 망토 자락을 흔드는 쌀쌀한 밤',
  '함박눈이 가로등 불빛 아래 쏟아지던 늦은 귀로의 저녁',
  '낙엽이 발밑에서 바스러지는 선선한 가을 정오',
  '장미가 만개한 초여름의 나른한 오후, 벌이 윙윙대는 온실',
  '신탁이 내려오는 일식의 한낮, 하늘이 붉게 어두워지는 순간',
  '한 해의 끝을 알리는 대성당 제야의 종이 울려 퍼지는 자정',
  '서리가 유리창에 성에꽃을 그린 동트기 직전의 시린 새벽',
  '진눈깨비가 흩날리다 멎은 회색빛 초겨울의 흐린 오후',
  '수확제 모닥불이 광장 가득 타오르는 가을밤의 떠들썩한 저녁',
  '여름 소나기 뒤 흙냄새가 짙게 피어오르는 후덥지근한 한낮',
]

// 무대 정경(세계관 디테일) — 이 장소를 로판답게 만드는 한 컷의 배경 묘사.
const SCENERY = [
  '천장에 그려진 창세 신화 프레스코화가 촛불에 일렁이며 내려다본다',
  '가문의 문장이 박힌 휘장이 천장에서 바닥까지 길게 드리워져 있다',
  '마력으로 점화된 푸른 불꽃이 벽감마다 소리 없이 타오른다',
  '수백 송이 흰 백합과 붉은 장미가 회랑을 따라 끝없이 늘어서 있다',
  '바닥의 대리석에 황금으로 상감된 별자리 지도가 발밑에 펼쳐진다',
  '거대한 스테인드글라스를 통해 성녀의 형상이 빛으로 떨어진다',
  '벽을 가득 메운 역대 황제들의 초상이 어둠 속에서 응시한다',
  '떠 있는 마법서와 깃펜이 허공에서 스스로 페이지를 넘긴다',
  '분수에서 솟는 물줄기가 마력으로 얼었다 녹기를 반복한다',
  '천장을 뒤덮은 유리 돔 너머로 두 개의 달이 겹쳐 빛난다',
  '정령이 남긴 빛 가루가 공기 중에 반딧불처럼 떠다닌다',
  '낡은 태피스트리에 예언 속 그날의 광경이 빛바랜 채 짜여 있다',
  '제단 위 신물(神物)이 누군가의 접근에 희미하게 공명한다',
  '비단 발과 등롱이 바람에 흔들려 그림자를 길게 늘어뜨린다',
  '연무장 흙바닥에 빗물이 고여 검 두 자루의 그림자를 비춘다',
  '벽난로의 장작이 탁탁 튀며 방 안을 주황빛으로 물들인다',
  '드높은 아치 천장이 발소리마다 긴 메아리를 되돌려 보낸다',
  '금사슬 커튼 사이로 가둬진 새장 같은 답답함이 감돈다',
  '먼지 쌓인 가보와 깨진 거울이 몰락한 가문의 영광을 증언한다',
  '온실 가득한 이국의 꽃향기가 머리가 어지러울 만큼 짙게 깔린다',
  '눈 덮인 첨탑 위로 황실의 깃발이 얼어붙은 채 펄럭인다',
  '제국 전역의 사절들이 보내온 진귀한 선물이 단상 앞에 산을 이룬다',
  '마력진의 빛이 바닥에서 천천히 회전하며 방 전체를 물들인다',
  '회랑 끝 종탑에서 정시를 알리는 종소리가 묵직하게 울린다',
  '천장에 매달린 수정 등이 바람결마다 맑은 소리로 부딪쳐 운다',
  '벽을 따라 늘어선 갑주들이 횃불빛에 검붉게 번들거린다',
  '바닥에 깔린 두꺼운 양탄자가 발소리를 모두 삼켜 적막을 더한다',
  '높은 창으로 쏟아진 햇살이 떠다니는 먼지를 금빛 기둥처럼 세운다',
]

// 분위기(로판 정서의 한 지점) — 설렘부터 정치적 긴장, 사이다 직전의 카타르시스까지.
const MOODS = [
  '심장이 멎을 듯 두근거리는 첫 설렘',
  '닿을 듯 닿지 않아 애가 타는 갈망(yearning)',
  '서로를 밀어내며 끌리는 팽팽한 밀당의 긴장',
  '연적의 등장에 일렁이는 질투와 자각',
  '오해가 쌓여 차갑게 식어버린 어색한 침묵',
  '집착에 가까운 독점욕이 서늘하게 번지는 긴장',
  '운명을 알기에 더 애틋한 회귀자의 슬픈 다정함',
  '원작 강제력에 저항하는 자의 결연한 비장함',
  '모욕을 곱씹다 마침내 청산하는 통쾌한 역전의 쾌감',
  '만인 앞에서 죄가 폭로되기 직전의 숨 막히는 정적',
  '신분의 벽 앞에서 체념과 결연이 엇갈리는 비장함',
  '뒤늦은 후회로 무너지는 권력자의 자존심',
  '단둘이 갇혀 어쩔 줄 모르는 어색하고 간지러운 공기',
  '가짜 부부인데 진짜가 되어버린 혼란스러운 떨림',
  '신탁이 지목한 자의 어깨에 내려앉은 무거운 사명감',
  '말없이 어깨를 내어준 위로의 따뜻한 공기',
  '버림받았던 자가 처음으로 사랑받는 낯선 안도',
  '고백 직전, 입술이 떨리는 결심의 정적',
  '재회의 순간 차오르는 그리움과 원망의 뒤섞임',
  '모든 것이 끝난 듯한 Black Moment의 절망',
  '오해가 풀리고 와락 밀려드는 화해의 안도',
  '딸바보들이 어린 여주를 둘러싼 간지러운 다정함',
  '첫 키스 직전, 세상이 멈춘 듯한 아득한 정적',
  '서로의 상처를 처음으로 들킨 무방비한 친밀함',
  '한 발 다가서면 한 발 물러서는 조심스러운 탐색의 긴장',
  '지키지 못한 약속을 떠올리며 차오르는 자책과 그리움',
  '적의를 거두고 처음으로 건넨 화해의 손길에 깃든 머쓱함',
  '곁을 내어주면서도 들키고 싶지 않은 마음의 수줍은 떨림',
]

// 장면 장치(로판 고유 코드 — 장면을 끌고 가는 서사 엔진).
const DEVICES = [
  '회귀자만 미래를 알기에, 정해진 비극을 막으려 한발 앞서 움직인다',
  '소설 속 악역영애로 빙의해, 처형 플래그를 피하려 호감도를 재설계한다',
  '원작에서 죽었어야 할 운명이, 세계의 강제력에 맞서 비틀리기 시작한다',
  '계약 결혼·계약 연인으로 묶여, 거리감에서 진심으로 옮겨가는 중이다',
  '위장 부부·가짜 연인을 연기하다 연기인지 진심인지 헷갈리고 있다',
  '방이 하나뿐이라 한 침대를 나눠 써야 하는 forced proximity 상황이다',
  '폭설·신탁으로 길이 끊겨 단둘이 갇혀버린 처지에 놓였다',
  '신분을 숨긴 채 그의 곁에서 일하게 되어 매 순간 정체가 위태롭다',
  '만조백관 앞에서 악역의 죄가 폭로되는 공개 망신 역전의 순간이다',
  '남주가 신분·정치적 손해를 무릅쓰고 “이 사람이 내 사람”이라 공표한다',
  '신탁·예언이 두 사람을 “예언 속 그 아이”로 지목해 운명을 묶는다',
  '천대받던 출신이 사실 황녀·신의 자손이었음이 드러나려 한다',
  '집착광공 남주가 도망치려는 상대를 “내 것”이라며 가둬두고 있다',
  '호감도 게이지·상태창이 의지와 무관하게 자꾸 차오르고 있다',
  '연적·집안 앞에서 다정한 연인을 연기해야 하는 자리에 떠밀렸다',
  '회귀 전의 배신 기억이 트라우마처럼 현재의 판단을 짓누른다',
  '정략혼으로 정해진 상대가 알고 보니 회귀 전의 원수였다',
  '어린 여주의 혀 짧은 말 한마디에 무서운 보호자들이 줄줄이 함락된다',
  '결정적 순간 남주 독백이 삽입되어, 그가 사실 얼마나 빠졌는지 폭로된다',
  '정령·신물과의 계약으로 남들이 모르는 특별한 힘을 막 각성했다',
  '전생의 지식으로 영지 경영·사업을 일으켜 무시하던 자들을 놀라게 한다',
  '“그저 조용히 이혼당하고 싶었을 뿐”인데 남편이 갑자기 매달리기 시작한다',
  '니어 키스가 번번이 누군가의 등장으로 무산되어 애가 탄다',
  '비밀(회귀·빙의·정체)이 남주에게 들킬 위기에 몰렸다',
  '사교계의 악의적인 소문에 맞서, 한 사람이 공개적으로 편을 들어 준다',
  '정략의 장기말로 쓰이던 처지에서, 스스로 판을 뒤집을 패를 손에 쥔다',
  '서로를 오해하게 만든 제3자의 계략이 한 꺼풀씩 벗겨지기 시작한다',
  '회귀 전 인연이 기억나지 않는 상대에게, 다시 처음부터 다가가기로 한다',
]

// 감각 디테일(다중 슬롯) — 로판적 오감·신체 거리·세계관 묘사(touch escalation 포함).
const DETAILS = [
  '맞닿은 어깨에서 전해지는 미열',
  '귓가를 간질이는 낮고 가까운 숨소리',
  '장갑을 벗은 손끝이 스칠 때 찌릿하게 곤두서는 감각',
  '보라색·금빛으로 빛나는 눈동자에 비친 자신의 얼굴',
  '마주친 눈을 차마 떼지 못하고 멈춘 시선',
  '심장이 귓가에 들릴 만큼 크게 뛰는 박동',
  '뺨에 닿을 듯 가까워진 입술 사이의 거리',
  '손목을 붙잡은 그의 차가운 줄 알았던 뜻밖의 온기',
  '머리카락에 내려앉은 흰 꽃잎을 떼어 주는 손길',
  '대리석 회랑에 길게 메아리치는 두 사람의 발소리',
  '코끝이 시리도록 차가운 첨탑 위 공기 속 하얀 입김',
  '찻잔을 건네다 겹쳐진 손가락에 번지는 온기',
  '귀 뒤로 머리카락을 넘겨주는 손길의 미세한 떨림',
  '눈송이가 속눈썹에 내려앉아 녹는 찰나',
  '진한 장미향에 섞여 풍기는 그(녀)만의 살냄새',
  '술기운에 발그레하게 달아오른 뺨',
  '망토 한 자락을 나눠 덮어 닿은 발끝의 떨림',
  '품에 안겼을 때 갑옷 너머로 들리는 낮은 심장 소리',
  '말없이 둘러준 망토에 밴 익숙한 체취',
  '눈가에 맺혔다 흘러내리는 한 줄기 눈물',
  '입술이 닿기 직전 멈춰 선 아득한 정적',
  '맞잡은 손바닥에 배어나는 긴장한 땀',
  '촛불·등롱 불빛에 일렁이는 두 사람의 그림자',
  '귓불까지 붉어진 채 떨군 시선',
  '와인잔에 비친 맞은편 얼굴의 흔들림',
  '머뭇거리다 결국 잡지 못하고 거둔 손끝',
  '마력 가루가 반딧불처럼 두 사람 사이를 떠다닌다',
  '검을 거두며 스친 차가운 칼날의 서늘함',
  '서로의 온기에 녹아내리는 얼어붙은 손',
  '돌아서는 등 뒤로 번지는 못다 한 말의 여운',
  '신탁의 빛이 닿은 어깨에 남은 따스한 잔열',
  '비단 드레스 자락이 바닥을 스치는 사각이는 소리',
  '찻물에서 피어오르는 김 너머로 흐릿해진 맞은편 얼굴',
  '머리 위로 우산을 기울여 주느라 한쪽이 젖은 그의 어깨',
  '난로 가까이 모은 손끝으로 옮겨 오는 은은한 온기',
  '말을 고르다 입술 끝에서 맴돌다 사라진 한마디',
  '바람에 흩날린 머리카락을 가만히 눌러 주는 손바닥',
  '한 박자 늦게 맞잡아 오는 망설임이 밴 손길',
  '눈 맞춤을 피하려다 결국 다시 마주친 시선의 멈칫함',
  '추위에 곱은 손에 살며시 끼워 준 장갑 속의 온기',
]

// 한 번에 뽑을 감각 디테일 개수(고정 5) — 다중 슬롯으로 조합수를 1조 이상으로 키운다.
const DETAIL_COUNT = 5

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 감각 디테일 n개를 중복 없이 뽑는다.
function pickDetails(n = DETAIL_COUNT): string[] {
  const poolArr = DETAILS.slice()
  const out: string[] = []
  for (let i = 0; i < n && poolArr.length; i++) {
    const idx = Math.floor(Math.random() * poolArr.length)
    out.push(poolArr[idx])
    poolArr.splice(idx, 1)
  }
  return out
}

// nCk 조합수(순서 무관) — 감각 디테일 5개 조합수 계산용
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 현장 × 시각·계절 × 무대 정경 × 분위기 × 장면 장치 × (감각 디테일 5개 조합)
// 48 × 24 × 28 × 28 × 28 × C(40,5)=658008 ≈ 약 16.6조 (옛 약 2.12조 대비 +약 14.5조, +5e9 요건 충족)
function totalCombos(): number {
  const detailCombos = choose(DETAILS.length, DETAIL_COUNT)
  return PLACES.length * TIMES.length * SCENERY.length * MOODS.length * DEVICES.length * detailCombos
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'time' | 'scenery' | 'mood' | 'device' | 'detail'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '현장(무대)', icon: '🏰' },
  { key: 'time', label: '시각·계절·기상', icon: '🌙' },
  { key: 'scenery', label: '무대 정경(세계관)', icon: '🏛️' },
  { key: 'mood', label: '분위기(로판 정서)', icon: '💗' },
  { key: 'device', label: '장면 장치(로판 코드)', icon: '🎭' },
  { key: 'detail', label: '감각 디테일(5)', icon: '✨' },
]

interface Setting {
  place: string
  time: string
  scenery: string
  mood: string
  device: string
  detail: string[]
}

function buildSetting(): Setting {
  return {
    place: pick(PLACES),
    time: pick(TIMES),
    scenery: pick(SCENERY),
    mood: pick(MOODS),
    device: pick(DEVICES),
    detail: pickDetails(),
  }
}

// 로판 현장 묘사 한 단락으로 엮기
function compose(s: Setting): string {
  const detailText = s.detail.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.time}, ${s.place}. ${s.scenery}. ` +
    `${s.device}. ` +
    `${detailText} — 사소한 감각 하나하나가 마음을 흔든다. ` +
    `무대를 감싼 분위기는 ${s.mood}.`
  )
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedSetting { id: string; setting: Setting; note: string }
interface Persist { setting: Setting | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedSetting[] }

function isSetting(x: any): x is Setting {
  return x && typeof x.place === 'string' && typeof x.time === 'string' &&
    typeof x.scenery === 'string' && typeof x.mood === 'string' &&
    typeof x.device === 'string' && Array.isArray(x.detail)
}

function load(): Persist {
  const fallback: Persist = { setting: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const setting = isSetting(p?.setting) ? p.setting : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedSetting[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isSetting(x.setting))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), setting: x.setting, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { setting, locks, saved }
  } catch {
    return fallback
  }
}

export default function RomfanSettingForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [setting, setSetting] = useState<Setting | null>(initial.current.setting)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedSetting[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)
  // 사용자 정의 항목(이름은 유지, 값은 재생성 시 비움) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ setting, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [setting, locks, saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 사용자 정의 항목: 이름만 받아 빈 입력칸을 추가(무작위 생성하지 않음, 값은 사용자가 직접 작성).
  const addCustomField = () => {
    let name = ''
    try { name = window.prompt('추가할 항목 이름을 입력하세요 (예: 향기, 음악, 복장)') || '' } catch { name = '' }
    name = name.trim()
    if (!name) return
    setCustom((prev) => [...prev, { id: rid(), label: name, value: '' }])
  }
  const setCustomValue = (id: string, value: string) =>
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  const removeCustomField = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 생성: 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  // 무작위 재생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름) 정의는 유지한다.
  const generate = useCallback(() => {
    setCopied(false)
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    setSetting((prev) => {
      const fresh = buildSetting()
      if (!prev) return fresh
      const next: Setting = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.time) next.time = prev.time
      if (locks.scenery) next.scenery = prev.scenery
      if (locks.mood) next.mood = prev.mood
      if (locks.device) next.device = prev.device
      if (locks.detail) next.detail = prev.detail
      return next
    })
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!setting) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  const slotValue = (k: SlotKey): string => {
    if (!setting) return ''
    if (k === 'detail') return setting.detail.join(' · ')
    return setting[k] as string
  }

  const fullText = setting ? compose(setting) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  // 복사 텍스트: 본문 글감 + 사용자 정의 항목 + 기타(있을 때만)
  const copyPayload = (): string => {
    const lines = [fullText]
    custom.forEach((c) => { const v = c.value.trim(); if (c.label && v) lines.push(`${c.label}: ${v}`) })
    const e = etc.trim()
    if (e) lines.push(`기타: ${e}`)
    return lines.join('\n')
  }

  const copyText = () => {
    if (!setting || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(copyPayload()).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveSetting = () => {
    if (!setting) return
    setSaved((prev) => [{ id: rid(), setting, note: '' }, ...prev])
    flashToast('현장을 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedSetting) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedSetting) => { setSetting(s.setting); setLocks({}); setCopied(false); flashToast('현장을 불러왔어요') }

  // 사용자 정의 항목 + 기타를 fields/character 맵에 합칠 추가 항목(값이 있는 것만)
  const extraFields = (): Record<string, string> => {
    const out: Record<string, string> = {}
    custom.forEach((c) => { const v = c.value.trim(); if (c.label && v) out[c.label] = v })
    const e = etc.trim()
    if (e) out.etc = e
    return out
  }

  // ── 연계: 공유 장소 라이브러리 ──
  const toLibrary = (st: Setting, note?: string) => {
    const sensory = [
      `시각·계절·기상: ${st.time}`,
      `무대 정경: ${st.scenery}`,
      `장면 장치: ${st.device}`,
      `감각 디테일: ${st.detail.join(' / ')}`,
    ].join('\n')
    addToLibrary('places', {
      name: st.place,
      kind: '로판 무대',
      mood: st.mood,
      sensory,
      notes: note || compose(st),
      source: '로맨스판타지 배경·현장 생성기',
      fields: {
        name: st.place,
        kind: '로판 무대',
        atmosphere: st.mood,
        appearance: st.scenery,
        sensory: st.detail.join(' / '),
        climate: st.time,
        notes: note || compose(st),
        ...extraFields(),
      },
    })
    flashToast(`장소 ‘${st.place.slice(0, 16)}…’를 공유 라이브러리에 추가했어요`)
  }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (st: Setting) => {
    addToLibrary('snippets', {
      text: compose(st),
      source: '로맨스판타지 배경·현장 생성기',
      tags: ['로맨스판타지', '로판', '배경', '현장', '글감'],
    })
    flashToast('현장 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 프로젝트(설정 카드, 자료 › 장소) ──
  const linked = hasProjectBridge()
  const toProject = (st: Setting, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏰 현장(무대):</b> ${esc(st.place)}</p>`,
      `<p><b>🌙 시각·계절·기상:</b> ${esc(st.time)}</p>`,
      `<p><b>🏛️ 무대 정경:</b> ${esc(st.scenery)}</p>`,
      `<p><b>💗 분위기(로판 정서):</b> ${esc(st.mood)}</p>`,
      `<p><b>🎭 장면 장치:</b> ${esc(st.device)}</p>`,
      `<p><b>✨ 감각 디테일:</b></p><ul>${st.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      ...custom.filter((c) => c.label && c.value.trim()).map((c) => `<p><b>${esc(c.label)}:</b> ${esc(c.value.trim())}</p>`),
      etc.trim() ? `<p><b>기타:</b> ${esc(etc.trim())}</p>` : '',
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.7;">${esc(compose(st))}</p>`,
    ].filter(Boolean).join('')
    const character: Record<string, string> = {
      name: st.place,
      type: '로판 무대',
      mood: st.mood,
      time: st.time,
      scenery: st.scenery,
      device: st.device,
      sensory: st.detail.join(' / '),
      // 정규 장소 키(받는 설정집이 기본 칸에 바로 채우도록 추가만, 기존 키 보존):
      //   type→kind, mood→atmosphere, scenery→appearance, time→climate
      kind: '로판 무대',
      atmosphere: st.mood,
      appearance: st.scenery,
      climate: st.time,
      ...extraFields(),
    }
    if (note) character.notes = note
    const id = addToProject({
      kind: 'setting',
      root: 'research',
      folder: '장소',
      title: `로판 현장 · ${st.place.slice(0, 18)}`,
      bodyHtml,
      character,
      icon: '👑',
      meta: { 유형: '로판 무대', 분위기: st.mood, 장면장치: st.device, 출처: '로맨스판타지 배경·현장 생성기' },
    })
    flashToast(id ? '이 현장을 프로젝트(자료 › 장소)에 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지(없으면 로맨스판타지 기본)
  const ctxGenre = payload && typeof (payload as any).genre === 'string' && String((payload as any).genre).trim()
    ? String((payload as any).genre).trim() : '로맨스판타지'

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
    { id: 'scene-list', icon: '🎬', label: '장면 목록' },
    { id: 'imagination-gallery', icon: '🖼️', label: '상상 갤러리' },
    { id: 'moodboard-grid', icon: '🧩', label: '무드보드' },
  ]

  // ── 스타일(인라인 + CSS 변수) ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        <b>현장·시각·무대 정경·분위기·장면 장치·감각 디테일</b>을 무작위로 엮어 <b>로맨스판타지 무대</b>를 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
        <Emoji e="🧭"/> 맥락: {ctxGenre}
      </div>

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '현장 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅"/> {toast}
        </div>
      )}

      <div style={body}>
        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((sl) => {
            const isLocked = !!locks[sl.key]
            const val = slotValue(sl.key)
            const dim = rolling && !isLocked
            return (
              <div key={sl.key} style={{ ...slotCard, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {sl.key === 'detail' && setting && setting.detail.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.45, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {setting.detail.map((d, i) => <li key={i}>{dim ? '…' : d}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, overflowWrap: 'anywhere', color: val ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {val ? (dim ? '…' : val) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    className="minibtn"
                    onClick={() => toggleLock(sl.key)}
                    title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                    style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                  >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 사용자 정의 항목 + 기타(자유 입력) */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...secTitle }}>
            <span><Emoji e="🗂️"/> 사용자 정의 항목</span>
            <button className="minibtn" onClick={addCustomField} title="직접 채울 항목을 추가합니다">＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {custom.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', minWidth: 64, paddingTop: 6, overflowWrap: 'anywhere' }}>{c.label}</div>
                  <input
                    value={c.value}
                    onChange={(e) => setCustomValue(c.id, e.target.value)}
                    placeholder="직접 입력하세요"
                    style={noteInput}
                  />
                  <button className="minibtn" onClick={() => removeCustomField(c.id)} title="이 항목 삭제">✕</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>기타</div>
            <textarea
              value={etc}
              onChange={(e) => setEtc(e.target.value)}
              placeholder="자유롭게 메모하세요 (설정·복선·분위기 보강 등)"
              rows={3}
              style={{ ...noteInput, width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="👑"/> 로판 현장 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: setting ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈현장 생성〉을 눌러 로판 무대를 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!setting}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveSetting} disabled={!setting}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => setting && toLibrary(setting)} disabled={!setting} title="이 현장의 장소를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button className="linkbtn" onClick={() => setting && toSnippet(setting)} disabled={!setting} title="이 현장 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => setting && toProject(setting)}
            disabled={!setting || !linked}
            title={linked ? '이 현장을 프로젝트 설정(자료 › 장소 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 현장 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 현장이 없습니다. ☆로 마음에 드는 무대를 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🏰"/> {s.setting.place}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{compose(s.setting)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 장면·인물·복선 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {s.note}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 현장을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toLibrary(s.setting, s.note || undefined)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.setting)} title="스니펫으로 저장"><Emoji e="📝"/> 스니펫</button>
                        <button className="linkbtn" onClick={() => toProject(s.setting, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트(자료 › 장소)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: ctxGenre })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 현장은 출발점일 뿐 인물의 감정·운명에 맞게 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
