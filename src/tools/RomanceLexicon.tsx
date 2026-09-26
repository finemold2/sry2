// 로맨스 특수 어휘·표현 사전 — 로맨스/로판 장르 특유의 단어·관용표현·말투·상투구·전문용어를 카테고리로 모은 로컬 사전.
// 도시에 근거: 밀당·절망의 순간(Black Moment)·대형 고백(Grand Gesture)·강제 밀착(Forced Proximity)·갈망(pining)·니어키스·
//   회귀/빙의/환생·집착남주(얀데레)·후회물·계약관계·관능도(heat level)·로판 어휘 등.
// react 와 './linkbus' 외 import 없음. 외부 API 미사용. 검색+카테고리 펼침+무작위+클릭복사+스니펫 저장+프로젝트 연계.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = {
  id: 'romance-lexicon',
  name: '로맨스 어휘·표현 사전',
  icon: '💞',
  group: '어휘·표현',
  genre: '로맨스',
  intro: '밀당·갈망·후회물·로판까지 — 로맨스 특유의 단어·말투·상투구·전문용어 사전',
  w: 600,
  h: 660,
}

interface Term {
  /** 표제어(단어·표현·말투·상투구) */
  term: string
  /** 뜻풀이/사용 맥락(장르 특화·구체) */
  gloss: string
  /** 검색·태그용 키워드 */
  tags?: string[]
}
interface CatDef { key: string; label: string; icon: string; note: string; items: Term[] }

// ───────────────────────────── 로맨스 특화 사전 데이터(자작·구체) ─────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'tension', label: '밀당·텐션', icon: '🪢',
    note: '끌림과 회피의 진자 운동. 다가가면 물러서고 멀어지면 자각하는 박자를 만드는 어휘.',
    items: [
      { term: '밀당', gloss: '밀고 당기기. 끌림을 드러내다 일부러 거리를 두며 상대의 애를 태우는 연애의 줄다리기.', tags: ['핵심', 'push-pull'] },
      { term: '한 발 다가가면 두 발 물러서기', gloss: '가까워지려는 순간 한쪽이 본능적으로 도망치는 밀당의 기본 박자. 텐션이 멈추면 안 된다.', tags: ['박자'] },
      { term: '튕기다', gloss: '호감이 있으면서도 일부러 쌀쌀맞게 굴며 받아주지 않는 태도.', tags: ['태도'] },
      { term: '재다(간 보다)', gloss: '상대의 마음을 확인하지 못해 먼저 다가가길 망설이며 눈치를 살피는 것.', tags: ['망설임'] },
      { term: '선 넘다 / 선 긋다', gloss: '관계의 암묵적 경계를 넘거나, 반대로 단호히 거리를 정하는 결정적 순간.', tags: ['경계'] },
      { term: '여지를 주다', gloss: '명확히 응답하지 않으면서도 희망을 남겨 상대를 붙잡아 두는 행위.', tags: ['모호함'] },
      { term: '신경 쓰이다', gloss: '인정하기 싫지만 자꾸 시선과 마음이 그 사람에게 향하는, 끌림 자각 직전의 상태.', tags: ['끌림'] },
      { term: '의식하다', gloss: '상대의 존재·체온·시선을 과하게 느끼며 평정을 잃는 것. 첫 끌림의 신호.', tags: ['끌림'] },
      { term: '심쿵(설렘 포인트)', gloss: '가슴이 철렁 내려앉는 순간. 웹소설은 매 회차 이 포인트로 연독률을 유지한다.', tags: ['설렘', '웹소설'] },
      { term: '두근거림', gloss: '상대 앞에서 심장이 빨라지는 신체 반응. 감정을 머리보다 몸이 먼저 안다.', tags: ['설렘'] },
      { term: '온도 차', gloss: '한쪽은 뜨겁고 한쪽은 차가운 감정의 불균형. 추격과 갈망을 만드는 장치.', tags: ['불균형'] },
      { term: '눈치 게임', gloss: '서로 좋아하면서 들킬까 봐 마음을 숨기며 상대의 기색만 살피는 줄다리기.', tags: ['숨김'] },
      { term: '기싸움', gloss: '자존심 때문에 먼저 무너지지 않으려는 두 사람의 팽팽한 신경전.', tags: ['적대'] },
      { term: '데면데면', gloss: '가까워질 듯 서먹하게 거리를 두는 어색하고 미묘한 사이.', tags: ['어색'] },
    ],
  },
  {
    key: 'yearning', label: '갈망·애틋함', icon: '🌙',
    note: '닿을 듯 닿지 않는 마음. 짝사랑·드러내지 못한 감정의 묘사 어휘(pining/yearning).',
    items: [
      { term: '갈망(yearning)', gloss: '가질 수 없는 사람을 향한 깊고 절제된 그리움. 로맨스 정서의 핵심 연료.', tags: ['핵심', 'pining'] },
      { term: '짝사랑', gloss: '응답받지 못한 채 혼자 품는 사랑. 닿지 못함이 정서를 더 짙게 한다.', tags: ['일방'] },
      { term: '애틋하다', gloss: '안쓰럽고 그리워 가슴이 저릿한 마음. 거리 때문에 더 깊어진다.', tags: ['감정'] },
      { term: '사무치다', gloss: '그리움·서러움이 뼈에 사무칠 만큼 깊이 박히는 것.', tags: ['감정'] },
      { term: '닿을 듯 닿지 않는', gloss: '손끝·시선·마음이 아슬아슬하게 비껴가는, 미완의 긴장을 표현하는 상투구.', tags: ['상투구'] },
      { term: '눈에 밟히다', gloss: '잊으려 해도 그 사람의 모습이 자꾸 떠올라 마음을 떠나지 않는 것.', tags: ['그리움'] },
      { term: '시선이 머물다', gloss: '의도와 무관하게 자꾸 그 사람에게 눈길이 가 멈추는, 끌림의 묘사.', tags: ['시선'] },
      { term: '뒷모습을 좇다', gloss: '떠나는 이를 붙잡지 못한 채 멀어지는 모습만 바라보는 애절한 장면.', tags: ['이별'] },
      { term: '속앓이', gloss: '마음을 드러내지 못한 채 혼자 끙끙 앓는 것.', tags: ['숨김'] },
      { term: '가슴이 미어지다', gloss: '슬픔·그리움으로 가슴이 찢어질 듯 아픈 것.', tags: ['고통'] },
      { term: '목이 메다', gloss: '벅찬 감정에 말이 막혀 나오지 않는 상태. 고백·재회 장면의 단골.', tags: ['감정'] },
      { term: '서글프다', gloss: '쓸쓸하고 슬픈, 채워지지 않는 마음의 결.', tags: ['감정'] },
      { term: '그리움이 사무치는 밤', gloss: '혼자 남아 상대를 떠올리며 잠 못 드는 밤의 정형적 장면.', tags: ['상투구'] },
      { term: '체온이 그립다', gloss: '곁에 있던 사람의 온기가 사라진 자리를 절감하는, 이별 후 갈망의 표현.', tags: ['상실'] },
    ],
  },
  {
    key: 'touch', label: '접촉·니어키스', icon: '🤍',
    note: '신체 거리의 점층이 감정 거리의 점층을 가시화. 우연한 스침→포옹→니어키스→그 이상.',
    items: [
      { term: '손끝이 스치다', gloss: '우연을 가장한 첫 접촉. 접촉 고조(touch escalation)의 출발점.', tags: ['접촉'] },
      { term: '손목을 붙잡다', gloss: '떠나려는 상대를 충동적으로 잡아 세우는, 끌림이 행동으로 터지는 순간.', tags: ['접촉', '충동'] },
      { term: '벽에 가두다(벽치기)', gloss: '한 팔로 상대를 벽에 몰아세워 도망갈 수 없게 만드는 정형 연출.', tags: ['상투구', '연출'] },
      { term: '턱을 들어 올리다', gloss: '고개 숙인 상대의 턱을 손으로 들어 시선을 맞추는, 키스 직전의 클리셰 동작.', tags: ['연출'] },
      { term: '머리카락을 귀 뒤로 넘기다', gloss: '흘러내린 머리카락을 넘겨 주는 다정한 친밀 접촉.', tags: ['다정'] },
      { term: '이마를 맞대다', gloss: '입맞춤 직전이나 화해의 순간, 이마를 맞대며 숨결을 나누는 친밀 동작.', tags: ['친밀'] },
      { term: '니어키스(almost-kiss)', gloss: '입맞춤 직전 방해받아 무산되는 것. 보상을 미뤄 텐션을 끌어올리는 페이싱 장치.', tags: ['핵심', '연출'] },
      { term: '숨이 닿을 거리', gloss: '서로의 호흡이 느껴질 만큼 가까워진, 위태로운 밀착의 거리감 표현.', tags: ['거리감'] },
      { term: '뒤에서 끌어안다(백허그)', gloss: '등 뒤에서 감싸 안아 말없이 마음을 전하는 정형적 포옹.', tags: ['포옹'] },
      { term: '어깨에 기대다', gloss: '경계를 풀고 상대에게 무게를 맡기는, 신뢰가 드러나는 접촉.', tags: ['신뢰'] },
      { term: '눈가를 닦아 주다', gloss: '우는 상대의 눈물을 손끝으로 닦아 주는 다정함의 클리셰.', tags: ['다정'] },
      { term: '깍지를 끼다', gloss: '손가락을 엇갈려 깊게 잡는, 연인 사이의 결속을 보여주는 손잡기.', tags: ['친밀'] },
      { term: '입술이 포개지다', gloss: '마침내 이루어지는 첫 키스의 완곡한 묘사.', tags: ['키스'] },
      { term: '체온이 번지다', gloss: '맞닿은 곳에서 상대의 온기가 퍼지는, 접촉의 감각적 묘사.', tags: ['감각'] },
    ],
  },
  {
    key: 'tropes', label: '트로프·설정', icon: '🎭',
    note: '로맨스를 로맨스답게 만드는 관계 설정 엔진. 도구에서 체크리스트처럼 고르는 핵심 자산.',
    items: [
      { term: '적에서 연인으로(enemies to lovers)', gloss: '서로 으르렁대던 사이가 사랑으로 뒤집히는 트로프. 『오만과 편견』의 현대적 후예.', tags: ['핵심', '트로프'] },
      { term: '계약 연애 / 계약 결혼', gloss: '이해관계로 맺은 가짜 관계가 진짜 감정으로 바뀌는 전환점이 백미.', tags: ['핵심', '트로프'] },
      { term: '가짜 연인(fake dating)', gloss: '연인인 척 연기하다 진심이 되어버리는 설정. "가짜인데 진짜가 됨"이 핵심.', tags: ['트로프'] },
      { term: '강제 밀착(forced proximity)', gloss: '폭설·좁은 공간·동거로 둘을 물리적으로 묶어 감정을 강제 발생시키는 최강 장치.', tags: ['핵심', '장치'] },
      { term: '침대가 하나뿐(one bed)', gloss: '여관에 침대가 하나만 남아 한 침대를 써야 하는 강제 밀착의 대표 클리셰.', tags: ['상투구', '장치'] },
      { term: '신분 격차(신데렐라)', gloss: '재벌·귀족·황족과 평범한 상대의 격차가 빚는 갈등과 동경.', tags: ['트로프'] },
      { term: '소꿉친구 → 연인', gloss: '오래 곁에 있던 친구를 뒤늦게 이성으로 자각하는 전환.', tags: ['트로프'] },
      { term: '첫눈에 반함(insta-love)', gloss: '첫 만남에 강하게 끌리는 점화. 단편·카테고리물의 주력.', tags: ['속도'] },
      { term: '슬로우번(slow burn)', gloss: '오랜 빌드업으로 긴장을 누적시키는 느린 점화. 장편·로판의 주력.', tags: ['속도'] },
      { term: '삼각관계', gloss: '두 사람 사이의 선택을 놓고 벌어지는 갈등. 질투와 자각의 촉매.', tags: ['갈등'] },
      { term: '연상연하(누나/연하남)', gloss: '나이 차가 빚는 미묘한 권력·보호 구도를 활용한 설정.', tags: ['트로프'] },
      { term: '재벌 / 억만장자', gloss: '압도적 부와 권력을 쥔 남주. 현대 로맨스의 단골 판타지.', tags: ['현대물'] },
      { term: '사내 연애 / 상사와 부하', gloss: '직장 권력 구도 속 금지된 끌림. 들킬 위험이 텐션을 만든다.', tags: ['현대물'] },
      { term: '위장 부부', gloss: '서류상으로만 부부인 두 사람이 진짜 가족이 되어가는 과정.', tags: ['트로프'] },
    ],
  },
  {
    key: 'archetype', label: '남주·여주 유형', icon: '👤',
    note: '로맨스 인물 원형. 다아시(오만한 알파)·로체스터(상처 입은 남주) 계보의 변주.',
    items: [
      { term: '알파남주', gloss: '강하고 지배적이며 보호 본능이 강한 남주. 다아시·레트 버틀러의 후예.', tags: ['남주', '원형'] },
      { term: '상처 입은 남주(tortured hero)', gloss: '과거의 트라우마로 마음을 닫은 어두운 남주. 로체스터의 계보.', tags: ['남주', '원형'] },
      { term: '집착남주(얀데레)', gloss: '여주에 대한 독점욕이 병적으로 강한 남주. 로판의 인기 코드.', tags: ['남주', '로판'] },
      { term: '후회남주', gloss: '여주를 버리거나 외면했다가 뒤늦게 후회하며 매달리는 남주. "후회물"의 주역.', tags: ['남주', '후회물'] },
      { term: '다정남주(서브남주)', gloss: '한결같이 곁을 지키며 다정하게 챙기는 남자. 흔히 이루어지지 못하는 짝사랑.', tags: ['남주'] },
      { term: '능글남', gloss: '여유롭게 농담을 던지며 상대를 놀려 먹는 능청스러운 매력의 남주.', tags: ['남주', '말투'] },
      { term: '까칠남(츤데레)', gloss: '겉으론 차갑고 무뚝뚝하지만 속은 다정한, 반전 매력의 남주.', tags: ['남주', '원형'] },
      { term: '순정남', gloss: '한 사람만을 우직하게 사랑하는 일편단심의 남주.', tags: ['남주'] },
      { term: '악역 영애', gloss: '원작에서 파멸할 운명의 악녀로 빙의·환생한 여주. 로판의 대표 주인공형.', tags: ['여주', '로판'] },
      { term: '회귀 여주', gloss: '비극적 결말을 겪고 과거로 돌아와 운명을 바꾸려는 여주.', tags: ['여주', '로판'] },
      { term: '걸크러시 여주', gloss: '주체적이고 당당하며 남에게 휘둘리지 않는 매력의 여주.', tags: ['여주'] },
      { term: '연적 / 라이벌', gloss: '주인공의 사랑을 두고 다투는 인물. 질투를 자극해 진심을 자각시키는 촉매.', tags: ['조연'] },
      { term: '약혼자(정략혼 상대)', gloss: '집안이 정한 혼약 상대. 진짜 사랑을 가로막는 장벽이자 갈등의 축.', tags: ['조연', '로판'] },
      { term: '오빠 / 황태자 후보들', gloss: '여주를 둘러싼 매력적 남자들. 육아·역하렘물의 구도.', tags: ['조연', '로판'] },
    ],
  },
  {
    key: 'blackmoment', label: '절망·갈등', icon: '🌑',
    note: '관계가 끝장난 듯한 최저점(Black Moment)과 그것을 빚는 갈등 엔진의 어휘.',
    items: [
      { term: '절망의 순간(Black Moment)', gloss: '클라이맥스 직전 관계가 파탄 난 듯 보이는 최저점. 로맨스의 필수 구조 비트.', tags: ['핵심', '구조'] },
      { term: '오해(misunderstanding)', gloss: '갈등 엔진. 단 한 마디면 풀릴 오해는 함정이고, 인물의 상처에서 필연적으로 빚어져야 좋다.', tags: ['갈등'] },
      { term: '엇갈림', gloss: '타이밍·마음·말이 서로 비껴가며 둘을 멀어지게 하는 비극적 어긋남.', tags: ['갈등'] },
      { term: '비밀의 폭로', gloss: '숨겨 온 정체·과거·계략이 드러나며 신뢰가 무너지는 파국의 방아쇠.', tags: ['갈등'] },
      { term: '이별 통보', gloss: '관계를 끝내자는 선언. 상대를 위한다는 명분의 자기희생적 이별이 단골.', tags: ['이별'] },
      { term: '돌아서다', gloss: '마음을 접고 등을 돌리는 결별의 동작. 미련을 누르며 떠나는 장면.', tags: ['이별'] },
      { term: '밀어내다', gloss: '상대를 다치게 할까 봐, 혹은 자존심에 일부러 곁에서 떼어내는 것.', tags: ['거부'] },
      { term: '상처를 후벼 파다', gloss: '서로의 가장 아픈 곳을 건드려 돌이키기 어려운 말을 내뱉는 다툼.', tags: ['다툼'] },
      { term: '체념하다', gloss: '이루어질 수 없음을 받아들이고 마음을 비우는, 슬픈 단념.', tags: ['단념'] },
      { term: '자기혐오', gloss: '상처 입은 남주가 자신을 가치 없다 여겨 사랑을 거부하는 방어기제.', tags: ['내면'] },
      { term: '내가 너를 망칠 거야', gloss: '상대를 위한다는 이유로 곁을 떠나려는 남주의 자기희생적 상투구.', tags: ['상투구'] },
      { term: '질투에 눈이 멀다', gloss: '연적의 등장에 이성을 잃고 충동적으로 일을 그르치는 것.', tags: ['질투'] },
      { term: '신분의 벽', gloss: '계급·정치·집안이 가로막아 사랑을 좌절시키는 외부 압력.', tags: ['장벽'] },
      { term: '죽음의 그림자', gloss: '시한부·전쟁·저주 등 둘을 갈라놓을 위협. 애절함을 극대화한다.', tags: ['위협'] },
    ],
  },
  {
    key: 'confession', label: '고백·대형 증명', icon: '💍',
    note: '고백→회피→재고백→응답의 다단계 구조와, 자존심·지위·목숨을 건 증명 행위(Grand Gesture).',
    items: [
      { term: '대형 고백(Grand Gesture)', gloss: '절망 이후 자존심·지위·목숨을 걸고 사랑을 증명하는 결정적 행동. 공개 고백·권력 포기·추격.', tags: ['핵심', '구조'] },
      { term: '공항 추격', gloss: '떠나는 상대를 붙잡으러 공항으로 달려가는 현대 로맨스의 대표 대형 고백.', tags: ['상투구', '현대물'] },
      { term: '빗속의 고백', gloss: '비를 맞으며 진심을 토해내는 정형적 절정 장면.', tags: ['상투구', '연출'] },
      { term: '만인 앞 고백', gloss: '많은 사람 앞에서 체면을 버리고 사랑을 외치는 공개 증명.', tags: ['공개'] },
      { term: '권력을 포기하다', gloss: '황위·재산·지위를 버리고 그 사람을 택하는 히스토리컬·로판식 대형 고백.', tags: ['로판', '증명'] },
      { term: '무릎 꿇기(속죄)', gloss: '가해자였던 쪽이 완전히 무너져 용서를 비는, 후회물의 권력 역전 카타르시스.', tags: ['후회물', '카타르시스'] },
      { term: '첫 "사랑해"', gloss: '처음으로 사랑을 언어화하는 순간. 진심의 결정적 전환점.', tags: ['핵심'] },
      { term: '재고백', gloss: '한 번 거절당한 뒤 다시 마음을 전하는 것. 고백은 단발이 아니라 다단계다.', tags: ['구조'] },
      { term: '프러포즈', gloss: '결혼·평생을 약속하는 청혼. HEA로 향하는 결정적 장면.', tags: ['결합'] },
      { term: '진심을 토해내다', gloss: '억눌러 온 감정을 더는 참지 못하고 한꺼번에 쏟아내는 것.', tags: ['고백'] },
      { term: '내 곁에 있어 줘', gloss: '함께해 달라는 직접적 청. 절정의 화해 대사로 쓰이는 상투구.', tags: ['상투구', '대사'] },
      { term: '다시는 놓지 않겠다', gloss: '한 번 잃을 뻔한 상대를 다시 붙잡으며 하는 다짐의 정형 대사.', tags: ['상투구', '대사'] },
      { term: '운명이라고 생각해', gloss: '이 사랑이 필연임을 못 박는 낭만적 선언.', tags: ['대사'] },
      { term: '상호성(reciprocity)', gloss: '한쪽의 일방적 희생이 아니라 둘 다 내려놓고 다가가야 만족도가 높은 결합 원칙.', tags: ['원칙'] },
    ],
  },
  {
    key: 'rofan', label: '로판·회귀빙의', icon: '👑',
    note: '한국 웹소설이 키운 로맨스판타지 전문어. 회귀·빙의·환생의 정보 비대칭이 동력.',
    items: [
      { term: '로맨스판타지(로판)', gloss: '서구풍 가상 제국·귀족 사회를 배경으로 한 한국 웹소설의 거대 하위장르.', tags: ['장르', '핵심'] },
      { term: '빙의', gloss: '소설·게임 속 인물의 몸으로 들어가는 것. 원작 결말을 아는 정보 비대칭의 출발.', tags: ['로판', '코드'] },
      { term: '회귀', gloss: '죽거나 파멸한 뒤 과거로 돌아와 운명을 다시 사는 것. "결말을 바꾸는 능동성".', tags: ['로판', '코드'] },
      { term: '환생', gloss: '전생의 기억을 안고 다른 삶으로 다시 태어나는 것.', tags: ['로판', '코드'] },
      { term: '책빙의', gloss: '읽던 소설 속으로 빙의하는 것("이 책 속 악녀가 되었다" 류).', tags: ['로판', '코드'] },
      { term: '원작 파괴', gloss: '주인공이 알고 있는 비극적 원래 전개를 뒤엎어 새 운명을 만드는 것.', tags: ['로판', '동력'] },
      { term: '데드 플래그', gloss: '죽음·파멸로 이어지는 정해진 사건의 신호. 이를 피하는 게 생존 동력.', tags: ['로판'] },
      { term: '황제 / 대공 / 공작', gloss: '로판의 단골 남주 작위. 권력으로 여주를 지키는 보호자 판타지.', tags: ['로판', '신분'] },
      { term: '영애 / 영식', gloss: '귀족 가문의 딸·아들을 부르는 칭호. 사교계의 주역.', tags: ['로판', '신분'] },
      { term: '사교계 데뷔(데뷔탕트)', gloss: '귀족 영애가 사교계에 첫발을 내딛는 자리. 만남·정략의 무대.', tags: ['로판', '무대'] },
      { term: '정략결혼', gloss: '집안·정치적 이해로 맺어지는 혼인. 사랑 없는 시작이 진짜 사랑이 되는 구도.', tags: ['로판', '트로프'] },
      { term: '재혼황후 / 폐비', gloss: '버림받았다 권력과 사랑을 되찾는 역전 서사의 정형. 사이다 코드.', tags: ['로판', '서사'] },
      { term: '신수 / 정령 계약', gloss: '신비한 존재와 계약해 힘을 얻는 판타지 설정. 남주의 정체이기도 하다.', tags: ['로판', '판타지'] },
      { term: '예언 / 신탁', gloss: '운명을 규정하는 계시. 사랑과 파멸을 동시에 예고하는 장치.', tags: ['로판', '장치'] },
    ],
  },
  {
    key: 'heat', label: '관능도·약속어', icon: '🔥',
    note: '사전 합의된 관능 수위(heat level)와 출판/플랫폼의 분류·약속 용어.',
    items: [
      { term: '관능도(heat level)', gloss: 'clean/sweet(키스까지)↔steamy/explicit(노골적). 태그로 사전 고지되며 본문이 어긋나면 반발.', tags: ['핵심', '약속'] },
      { term: '클린/스위트', gloss: '키스 정도까지만 다루는 가장 낮은 수위. 잔잔한 설렘 중심.', tags: ['수위'] },
      { term: '스팀(steamy)', gloss: '정사 장면을 분위기 위주로 그리는 중간 수위.', tags: ['수위'] },
      { term: '익스플리싯(노골)', gloss: '성적 묘사가 직접적이고 구체적인 높은 수위. 19금·에로티카.', tags: ['수위'] },
      { term: 'HEA(Happily Ever After)', gloss: '두 주인공이 영원히 행복하게 맺어지는 결말. 로맨스의 핵심 계약.', tags: ['핵심', '계약'] },
      { term: 'HFN(Happy For Now)', gloss: '지금은 함께 행복하다는, 열린 듯한 만족 결말.', tags: ['계약'] },
      { term: '외전 / 후일담', gloss: '본편 이후의 보너스 설렘. 웹소설 로맨스의 필수 관습.', tags: ['웹소설', '관습'] },
      { term: '남주 시점 특별편', gloss: '남주의 속마음을 따로 보여주는 특별편. 시점 친밀성 보강.', tags: ['웹소설', 'POV'] },
      { term: '연독률', gloss: '독자가 다음 화를 계속 읽는 비율. 매 회차 설렘·클리프행어로 유지한다.', tags: ['웹소설', '지표'] },
      { term: '클리프행어', gloss: '회차 끝의 궁금증 유발 장치. 다음 화를 누르게 만든다.', tags: ['웹소설', '페이싱'] },
      { term: '고구마 / 사이다', gloss: '진척 없는 답답함(고구마) vs 통쾌한 해소(사이다). 독자 평가의 기준어.', tags: ['독자', '평가'] },
      { term: '케미(chemistry)', gloss: '두 인물 사이의 화학 반응·궁합. 설득되지 않으면 "케미 없음"으로 혹평.', tags: ['독자', '평가'] },
      { term: '장르 계약(genre contract)', gloss: '관계 중심·HEA 보장 등 독자와의 암묵적 약속. 어기면 별점 테러.', tags: ['핵심', '계약'] },
      { term: '입덕 / 최애', gloss: '작품·캐릭터에 빠져듦(입덕)과 가장 좋아하는 인물(최애). 팬덤 용어.', tags: ['팬덤'] },
    ],
  },
]

// ───────────────────────────── 상투구 생성기(슬롯 풀 무작위) ─────────────────────────────
// 도시에 근거 슬롯들. 한 템플릿의 조합 수 = 각 슬롯 풀 길이의 곱.
// 핵심 템플릿(scene)은 1조 이상, 그 외 테마 템플릿도 각각 1억 이상을 지향한다.
const TEMPLATES: { id: string; label: string; parts: string[][]; join: (p: string[]) => string }[] = [
  {
    // 핵심 생성기 — 11슬롯, 조합 수 1조(1.36조) 이상.
    id: 'scene', label: '★ 로맨스 장면 빌더',
    parts: [
      // 0. 시점/톤 머리말 — 10
      ['[여주 시점]', '[남주 시점]', '[3인칭 근접]', '[회상 장면]', '[슬로우번]', '[애절 톤]', '[달큰 톤]', '[긴장 고조]', '[설렘 폭발]', '[숨 막히는 정적]'],
      // 1. 시간·계절 — 12
      ['눈 내리는 한겨울 밤', '벚꽃 흩날리는 봄날 오후', '장맛비 쏟아지는 저녁', '노을이 지는 늦여름', '안개 낀 새벽녘', '별이 쏟아지는 한밤', '단풍 물든 가을 황혼', '첫눈이 내리던 날', '폭염이 가시지 않은 열대야', '바람이 매섭던 초겨울', '해가 막 떠오르던 아침', '달빛만 환한 자정 무렵'],
      // 2. 무대(공간) — 25
      ['좁은 마차 안에서', '폭설로 갇힌 산장에서', '인적 끊긴 복도에서', '달빛이 비치는 발코니에서', '서고의 책장 사이에서', '흔들리는 배 위에서', '비 내리는 처마 밑에서', '연회장 뒤 정원에서', '한밤의 황궁 회랑에서', '불 꺼진 사무실에서', '벚꽃이 흩날리는 교정에서', '폐허가 된 신전에서', '안개 자욱한 호숫가에서', '멈춰 선 엘리베이터에서', '단둘이 남은 옥상에서', '눈 내리는 정거장에서', '촛불만 켜진 침실에서', '검을 맞댄 결투장에서', '낡은 등대 안에서', '인파에 떠밀린 축제 한가운데서', '비밀스러운 온실 화원에서', '문 닫힌 도서관 열람실에서', '인기척 없는 새벽 주방에서', '눈보라가 몰아치는 마구간에서', '둘만 남겨진 별궁 침소에서'],
      // 3. 분위기(둘 사이의 공기) — 14
      ['갑작스러운 정적이 흘렀다', '둘 사이 거리가 사라졌다', '시간이 멈춘 듯했다', '심장 소리가 크게 들렸다', '숨소리만 또렷해졌다', '주위 소음이 멀어졌다', '공기가 팽팽하게 당겨졌다', '서로의 체온이 번졌다', '눈빛이 위태롭게 얽혔다', '긴장이 칼날처럼 곤두섰다', '낯선 떨림이 번졌다', '말 없는 긴 침묵이 내려앉았다', '두 사람의 그림자가 포개졌다', '심장이 제멋대로 뛰기 시작했다'],
      // 4. 행동 주체+동작 — 20
      ['그가 천천히 고개를 숙였고', '그녀의 턱을 살며시 들어 올렸고', '벽에 한 팔을 짚어 가두었고', '흘러내린 머리카락을 넘겨 주었고', '이마를 맞대 왔고', '숨이 닿을 만큼 다가왔고', '떨리는 손목을 붙잡았고', '뒤에서 가만히 끌어안았고', '눈가의 눈물을 닦아 주었고', '말없이 손을 깍지 끼었고', '어깨에 이마를 기대 왔고', '뺨을 두 손으로 감쌌고', '외투를 벗어 어깨에 걸쳐 주었고', '귓가에 낮게 속삭였고', '한 걸음 더 좁혀 왔고', '눈을 피하지 않은 채', '떨리는 어깨를 가만히 감싸 안았고', '엇갈린 손가락에 힘을 주었고', '식어 버린 두 손을 제 손으로 덮었고', '제 외투 깃을 여며 그녀를 감쌌고'],
      // 5. 절정 직전 묘사 — 14
      ['입술이 닿기 직전이었다', '눈을 감으려던 순간이었다', '서로의 호흡이 뒤섞였다', '심장이 터질 것 같았다', '온 신경이 그 손끝에 쏠렸다', '세상이 둘만 남은 듯했다', '거부할 힘이 사라졌다', '얼굴이 화끈 달아올랐다', '눈빛이 한층 깊어졌다', '숨이 멎을 것만 같았다', '손끝이 미세하게 떨렸다', '심장 소리가 귓전을 때렸다', '시간이 한없이 늘어졌다', '말문이 막혀 버렸다'],
      // 6. 감각 디테일 — 12
      ['은은한 향이 코끝을 스쳤다', '맞닿은 손이 뜨거웠다', '낮은 숨결이 귓가에 닿았다', '먼 곳에서 음악이 흘렀다', '빗소리가 둘을 감쌌다', '촛불 그림자가 일렁였다', '서늘한 바람이 머리칼을 흔들었다', '심장 박동이 또렷이 들렸다', '눈송이가 속눈썹에 내려앉았다', '달빛이 두 사람을 비췄다', '향수 냄새가 짙게 번졌다', '정적이 귀를 먹먹하게 했다'],
      // 7. 반전(방해/전환) — 14
      ['—그 순간 문이 벌컥 열렸다.', '—누군가 그 이름을 불렀다.', '—멀리서 종소리가 울렸다.', '—그녀가 화들짝 물러섰다.', '—그가 먼저 시선을 피했다.', '—천둥이 창을 때렸다.', '—전화벨이 정적을 깨뜨렸다.', '—발소리가 가까워졌다.', '—촛불이 일렁이며 꺼졌다.', '—그가 헛기침하며 돌아섰다.', '—약혼자의 목소리가 끼어들었다.', '—그녀의 무릎이 풀썩 꺾였다.', '—두 사람은 결국 입을 맞췄다.', '—그러나 아무도 물러서지 않았다.'],
      // 8. 감정 해설 — 12
      ['두 사람은 그 밤을 오래 잊지 못했다.', '심장에 남은 온기가 쉬이 가시지 않았다.', '인정하기 싫은 마음이 또렷해졌다.', '돌이킬 수 없는 선이 그어졌다.', '그날의 떨림은 오래 흔적으로 남았다.', '서로를 향한 마음은 더는 숨길 수 없었다.', '이 거리만큼은 끝내 좁혀지지 않았다.', '두 사람 사이의 무언가가 바뀌어 있었다.', '그것이 시작이라는 걸 둘 다 알았다.', '말하지 못한 말이 가슴에 고였다.', '닿을 듯 닿지 않은 마음이 아렸다.', '그 떨림의 이름을 차마 부르지 못했다.'],
      // 9. 다음 화 훅(클리프행어) — 10
      ['(다음 화에 계속)', '(그날 이후 둘은 서로를 피했다)', '(그러나 비밀은 아직 남아 있었다)', '(연적은 그 장면을 지켜보고 있었다)', '(여주는 결말을 이미 알고 있었다)', '(남주는 끝내 진심을 숨겼다)', '(운명의 시곗바늘이 움직이기 시작했다)', '(다음 날, 모든 것이 달라졌다)', '(아무도 그날을 입에 올리지 않았다)', '(그 한순간이 모든 것을 바꿔 놓았다)'],
      // 10. 마무리 한 줄 평 — 9
      ['— 설렘 포인트 ★', '— 슬로우번 빌드업', '— 케미 폭발 구간', '— 애절·고구마 직전', '— 사이다 직전의 긴장', '— Black Moment 복선', '— 니어키스 연출', '— 첫 끌림 자각', '— HEA로 가는 길목'],
    ],
    join: (p) => `${p[0]} ${p[1]}, ${p[2]}. ${p[3]}. ${p[4]} ${p[5]}. ${p[6]}. ${p[7]} ${p[8]} ${p[9]}\n${p[10]}`,
  },
  {
    // 대형 고백 — 8슬롯, 2,300만 이상… 슬롯 확장으로 1억 초과.
    id: 'confess', label: '대형 고백(Grand Gesture) 대사',
    parts: [
      ['빗속에서', '떠나는 기차 앞에서', '만인이 보는 연회장에서', '무너진 폐허 위에서', '새벽 첫 빛 속에서', '검을 내려놓으며', '왕관을 벗어 던지며', '공항 게이트 앞에서', '비행기가 뜨기 직전', '무릎을 꿇으며', '모두가 보는 단상 위에서', '쏟아지는 눈을 맞으며'],
      ['그가 달려와 외쳤다.', '그가 숨을 몰아쉬며 입을 열었다.', '그가 떨리는 손을 내밀었다.', '그가 무릎을 꿇었다.', '그가 그녀의 손을 잡았다.', '그가 모든 시선을 무시했다.'],
      ['더는 못 견디겠어', '내 모든 걸 잃어도 좋아', '자존심 따위 버린 지 오래야', '처음부터 너뿐이었어', '도망쳐서 미안했어', '바보처럼 돌아왔어', '체면 같은 건 필요 없어', '늦은 거 알아, 그래도'],
      ['그러니 다시는 놓지 않을게', '이번엔 내가 먼저 잡을게', '네 곁에 있게 해 줘', '나를 받아 줘', '함께 가 줘', '내 손을 잡아 줘', '도망치지 않을게', '평생 곁을 지킬게'],
      ['널 사랑해.', '너 없인 안 돼.', '내가 가진 전부야, 너는.', '운명이라고 믿어, 우리는.', '평생을 걸겠어.', '처음이자 마지막 사랑이야.', '내 세상은 너 하나뿐이야.', '돌아와 줘, 제발.'],
      ['그의 목소리가 떨렸다.', '눈가가 붉게 젖어 있었다.', '주위가 일제히 숨을 죽였다.', '그녀의 손이 멈칫했다.', '빗물인지 눈물인지 알 수 없었다.', '심장이 무너지는 소리가 났다.', '세상이 고요해졌다.', '시간이 멈춘 듯했다.'],
      ['그녀의 눈에 눈물이 차올랐다.', '그녀가 입술을 깨물었다.', '그녀의 다리가 후들거렸다.', '그녀가 천천히 돌아보았다.', '그녀의 표정이 허물어졌다.', '그녀가 한 걸음 다가섰다.'],
      ['그리고, 그녀가 돌아섰다.', '그녀는 천천히 고개를 끄덕였다.', '둘은 끝내 서로를 끌어안았다.', '오랜 침묵 끝에 그녀가 웃었다.', '그 한마디로 모든 것이 무너지고, 다시 세워졌다.', '그녀는 그의 품으로 뛰어들었다.', '두 사람은 비로소 마주 보았다.'],
      ['— 공개 고백 ★', '— 권력 포기형', '— 공항/정거장 추격', '— 빗속 절정', '— 무릎 꿇기·속죄', '— HEA 직행', '— 재고백(거절 후)', '— 모두 앞 선언', '— 마지막 한마디'],
    ],
    join: (p) => `${p[0]} ${p[1]} "${p[2]}. ${p[3]}. ${p[4]}" ${p[5]} ${p[6]} ${p[7]}\n${p[8]}`,
  },
  {
    // 갈망·짝사랑 독백 — 8슬롯, 1억 이상.
    id: 'pining', label: '갈망·짝사랑 독백',
    parts: [
      ['닿을 수 없는 사람이라는 걸', '이 마음이 죄라는 걸', '끝내 응답받지 못하리란 걸', '그가 다른 이의 것이란 걸', '곧 떠나보내야 한다는 걸', '돌아올 수 없는 사람이라는 걸', '내 자리는 없다는 걸', '꿈조차 사치라는 걸'],
      ['알면서도', '머리로는 알았지만', '수없이 되뇌었지만', '아무리 부정해도', '눈을 감아도', '몇 번이나 다짐했지만'],
      ['시선은 자꾸 그에게로 향했다', '심장은 멋대로 뛰었다', '그리움은 밤마다 사무쳤다', '눈가가 뜨거워졌다', '체온이 그리워 잠들지 못했다', '이름만 들어도 가슴이 미어졌다', '발걸음이 그쪽으로 향했다', '손끝이 그를 좇았다'],
      ['그 사람의 웃음 한 조각에', '스치듯 닿은 손끝에', '무심히 건넨 한마디에', '뒷모습이 멀어지는 순간에', '나를 부르던 목소리에', '문득 마주친 눈빛에', '남겨진 향기에', '비어 버린 옆자리에'],
      ['나는 또 무너졌다.', '하루치 마음이 다 닳았다.', '숨을 삼켜야 했다.', '눈물이 핑 돌았다.', '아무렇지 않은 척해야 했다.', '심장이 저릿하게 아팠다.', '말문이 막혔다.', '가슴이 텅 비었다.'],
      ['그러나 입 밖으로는', '하지만 끝내', '겉으로는', '여전히 나는', '그 앞에서만은'],
      ['아무 말도 하지 못했다.', '미소만 지어 보였다.', '괜찮은 척했다.', '한 발 물러섰다.', '시선을 떨구었다.', '마음을 감췄다.'],
      ['그래도 나는, 한 번도 후회하지 않았다.', '나는 그 마음을 끝내 삼켰다.', '닿지 못할 거리를 그저 바라볼 뿐이었다.', '이 짝사랑이, 차라리 영원하길 바랐다.', '그를 사랑한 죄밖에 없었다.', '말하지 못한 마음이 나를 갉아먹었다.', '그 거리만큼이 내 몫의 사랑이었다.'],
      ['언젠가 닿을 수 있다면.', '이 마음을 들키지만 않는다면.', '그저 곁에만 있을 수 있다면.', '한 번만 돌아봐 준다면.', '내 이름을 불러만 준다면.', '이 거리를 좁힐 수 있다면.'],
      ['— 그러나 그날은 오지 않았다.', '— 그렇게 또 하루가 저물었다.', '— 나는 다시 마음을 접었다.', '— 그 바람조차 사치였다.', '— 닿지 못한 채 밤이 깊었다.', '— 차마, 그 말은 삼켰다.'],
    ],
    join: (p) => `${p[0]} ${p[1]} ${p[2]}. ${p[3]} ${p[4]}. ${p[5]} ${p[6]} ${p[7]} ${p[8]}\n${p[9]}`,
  },
  {
    // 적→연인 첫 대면 — 8슬롯, 1억 이상.
    id: 'enemies', label: '적→연인 첫 대면',
    parts: [
      ['거만한 공작', '오만한 재벌 후계자', '냉혹한 황태자', '독설가 천재', '앙숙인 라이벌', '얼음 같은 검술 교관', '비정한 계약 상대', '소문난 폭군'],
      ['차가운 눈빛으로', '비웃음을 흘리며', '아래로 훑어보며', '한쪽 입꼬리를 올리며', '팔짱을 낀 채', '여유롭게 다가와', '한 걸음 다가서며', '턱을 치켜든 채'],
      ['"고작 이 정도였나?"', '"네가 나를 이긴다고?"', '"흥미롭군, 처음이야."', '"착각하지 마. 봐주는 건 없어."', '"감히 내 앞에서?"', '"재밌는 여자로군."', '"그 눈빛, 마음에 안 들어."', '"도망치지 그래?"'],
      ['그녀는 지지 않고 턱을 들었다', '그녀의 눈에 불꽃이 튀었다', '그녀는 코웃음으로 되받았다', '그녀는 한 발도 물러서지 않았다', '그녀는 도리어 미소 지었다', '그녀는 한 걸음 다가섰다', '그녀는 눈도 깜빡이지 않았다', '그녀는 팔짱을 마주 꼈다'],
      ['"제 걱정은 마시죠."', '"기대 이하네요, 당신."', '"비켜 주시겠어요?"', '"그쪽이야말로 조심하시길."', '"흥미로운 건 저도 마찬가지예요."', '"두고 보면 알겠죠."', '"겁먹은 쪽은 그쪽 같은데요?"', '"실망시켜 드려 미안하네요."'],
      ['그 말에 그의 눈썹이 꿈틀했다.', '그가 잠시 말을 잃었다.', '그의 입꼬리가 미세하게 떨렸다.', '그가 흥미롭다는 듯 웃었다.', '그의 시선이 한층 날카로워졌다.', '그가 처음으로 그녀를 똑바로 보았다.'],
      ['공기가 팽팽하게 곤두섰다.', '둘 사이에 불꽃이 튀었다.', '주위가 숨을 죽였다.', '긴장이 칼끝처럼 섰다.', '시선이 서로를 놓지 않았다.', '아무도 먼저 물러서지 않았다.'],
      ['—그날, 두 사람은 서로를 적으로 기억했다.', '—그러나 그 적의가 무엇으로 변할지는 아무도 몰랐다.', '—증오는 때로 가장 뜨거운 시작이었다.', '—불꽃 튀는 첫 만남이었다.', '—훗날 둘은 이 순간을 두고 다투곤 했다.', '—그것이 운명의 첫 단추였다.', '—적의는 끌림의 다른 이름이었다.'],
      ['장소: 황궁 무도회', '장소: 검술 시합장', '장소: 회사 회의실', '장소: 학원 옥상', '장소: 빗속 골목', '장소: 계약서를 사이에 둔 응접실'],
      ['— enemies to lovers ★', '— 기싸움→끌림', '— 츤데레 남주', '— 걸크러시 여주', '— 슬로우번 시작', '— 첫인상 최악'],
    ],
    join: (p) => `(${p[8]}) ${josa(p[0], '이', '가')} ${p[1]} 말했다. ${p[2]} ${p[3]}. ${p[4]} ${p[5]} ${p[6]} ${p[7]}\n${p[9]}`,
  },
  {
    // 후회물 재회 대사 — 8슬롯, 1억 이상.
    id: 'regret', label: '후회물 재회 대사',
    parts: [
      ['몇 년 만에 다시 마주한 그는', '권력을 모두 잃은 그가', '폐위된 황제가', '버렸던 여자 앞에서', '무릎이 꺾인 그가', '회귀한 그녀 앞에 선 그가', '모든 걸 알아버린 그가', '뒤늦게 달려온 그가'],
      ['떨리는 목소리로', '고개도 들지 못한 채', '눈물을 삼키며', '자존심을 모두 버리고', '핏기 없는 얼굴로', '간절한 눈빛으로', '두 손을 모은 채', '무너지듯'],
      ['"그때 널 놓은 게 내 평생의 잘못이었어"', '"한 번만, 한 번만 더 기회를 줘"', '"내가 다 틀렸어. 미안하다"', '"이제야 네가 전부였다는 걸 알았어"', '"네가 없으니 아무것도 의미가 없어"', '"돌아와 달라고, 빌게"', '"늦었다는 거 알아. 그래도"', '"날 용서하지 않아도 좋아"'],
      ['하지만 그녀는', '그러나 그녀는', '돌아선 그녀는', '담담한 얼굴로 그녀는', '한참을 침묵하던 그녀는', '눈도 깜빡이지 않고 그녀는'],
      ['이미 돌아선 뒤였다.', '차가운 침묵으로 답했다.', '천천히 그를 내려다보았다.', '옅게 웃을 뿐이었다.', '더는 흔들리지 않았다.', '한마디로 그를 베었다.', '오래도록 그를 응시했다.', '조용히 숨을 골랐다.'],
      ['"늦었어요."', '"이제 와서요?"', '"그 마음, 제겐 필요 없어요."', '"전 다른 길을 택했어요."', '"당신의 후회는 당신 몫이에요."', '"안녕히 가세요."', '"그때의 저는 죽었어요."', '"이번 생은, 당신 없이도 충분해요."'],
      ['그러곤 미련 없이 등을 돌렸다.', '그 말만 남기고 멀어졌다.', '눈물 한 방울 보이지 않았다.', '문이 조용히 닫혔다.', '그녀의 발걸음은 흔들리지 않았다.', '뒤돌아보지 않았다.'],
      ['—후회는 언제나 한발 늦는 법이었다.', '—그가 무너지는 소리가 등 뒤로 들렸다.', '—권력의 역전은 그렇게 완성되었다.', '—이번엔 그녀가 그를 떠났다.', '—사이다 같은 결별이었다.', '—그 침묵이 가장 잔인한 대답이었다.'],
      ['그가 버린 건 그녀였지만,', '한때 모든 걸 가졌던 그였지만,', '회귀 전엔 그를 사랑했지만,', '오래 그를 기다렸던 그녀였지만,', '그의 한마디에 무너지던 그녀였지만,', '이번 생의 그녀는 달랐기에,'],
      ['— 후회물 ★', '— 권력 역전 사이다', '— 회귀형 결별', '— 냉정한 거절', '— 무릎 꿇은 남주', '— 늦은 후회'],
    ],
    join: (p) => `${p[8]} ${p[0]} ${p[1]} 말했다. ${p[2]} ${p[3]} ${p[4]} ${p[5]} ${p[6]}\n${p[7]}\n${p[9]}`,
  },
]

const LS = 'sry:tool:romance-lexicon:'
const ALL_KEY = '__all__'
const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// 받침 유무 판별 — 마지막 한글 음절에 종성이 있으면 true. (영문/숫자/괄호 등은 받침 없음으로 취급)
const hasJong = (s: string): boolean => {
  const m = s.replace(/[)\]'"’”』」.\s]+$/u, '')
  const ch = m.charCodeAt(m.length - 1)
  if (Number.isNaN(ch)) return false
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (ch - 0xac00) % 28 !== 0
}
// 조사 선택 헬퍼: 앞말 받침에 따라 을/를·이/가·은/는·과/와·으로/로 중 하나를 골라 붙인다.
const josa = (word: string, withJong: string, noJong: string): string => word + (hasJong(word) ? withJong : noJong)
const flatAll = (): { cat: CatDef; item: Term }[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))
const comboOf = (t: typeof TEMPLATES[number]) => t.parts.reduce((m, p) => m * p.length, 1)
const GRAND_COMBOS = TEMPLATES.reduce((sum, t) => sum + comboOf(t), 0)
// 큰 수를 '약 X조 / 약 Y억' 식으로 보기 좋게.
const fmtBig = (n: number) => {
  const eok = 1e8, jo = 1e12
  if (n >= jo) return `약 ${(n / jo).toFixed(n >= jo * 10 ? 0 : 2)}조`
  if (n >= eok) return `약 ${(n / eok).toFixed(n >= eok * 10 ? 0 : 1)}억`
  if (n >= 1e4) return `약 ${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)}만`
  return n.toLocaleString('ko-KR')
}

export default function RomanceLexicon({ payload }: { payload?: Record<string, unknown> }) {
  const [tab, setTab] = useState<'dict' | 'gen'>('dict')
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const r = localStorage.getItem(LS + 'cat'); if (r && (r === ALL_KEY || CATS.some((c) => c.key === r))) return r } catch { /* ignore */ }
    return ALL_KEY
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'favs'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Term } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string>('')

  // 상투구 생성기 상태
  const [tplId, setTplId] = useState<string>(TEMPLATES[0].id)
  const [slots, setSlots] = useState<number[]>(() => TEMPLATES[0].parts.map(() => 0))
  const [locks, setLocks] = useState<boolean[]>(() => TEMPLATES[0].parts.map(() => false))

  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (k: string, t: string) => `${k}::${t}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY ? flatAll() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.term)])
    if (q) base = base.filter(({ item }) =>
      item.term.toLowerCase().includes(q) || item.gloss.toLowerCase().includes(q) || (item.tags || []).some((t) => t.toLowerCase().includes(q)))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY ? flatAll() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.term === prev.item.term && pick.cat.key === prev.cat.key) pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    })
  }, [cat])

  const toggleFav = (k: string, t: string) => {
    const key = favKey(k, t)
    setFavs((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => {
      setCopied(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1400)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done))
    else fallback(text, done)
  }
  const fallback = (text: string, done: () => void) => {
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() } catch { flash('복사 실패 — 직접 선택하세요') }
  }

  const saveTerm = (c: CatDef, item: Term) => {
    addToLibrary('snippets', { text: `${item.term} — ${item.gloss}`, source: '로맨스 어휘 사전 · ' + c.label, tags: ['로맨스', c.label, ...(item.tags || [])] })
    flash('스니펫 라이브러리에 저장: ' + item.term)
  }

  const termToProject = (c: CatDef, item: Term) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const body = `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.term)}</b></p>` +
      `<p>${escapeHtml(item.gloss)}</p>` +
      ((item.tags && item.tags.length) ? `<p style="color:#888">#${item.tags.map(escapeHtml).join(' #')}</p>` : '')
    const id = addToProject({ kind: 'text', root: 'research', folder: '로맨스 어휘', title: item.term, bodyHtml: body, meta: { 장르: '로맨스', 분류: c.label } })
    if (id) flash(`프로젝트 자료 〈로맨스 어휘〉에 ‘${item.term}’ 추가`)
  }

  // ── 생성기 로직 ──
  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === tplId) || TEMPLATES[0], [tplId])
  // 현재 선택한 템플릿의 조합 수(= 각 슬롯 풀 크기의 곱).
  const combos = useMemo(() => comboOf(tpl), [tpl])

  const switchTpl = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id) || TEMPLATES[0]
    setTplId(id)
    setLocks(t.parts.map(() => false))
    // 템플릿 전환 시 즉시 한 번 무작위 조합
    setSlots(t.parts.map((p) => Math.floor(Math.random() * p.length)))
  }

  const roll = () => {
    setSlots((prev) => tpl.parts.map((p, i) => (locks[i] ? prev[i] : Math.floor(Math.random() * p.length))))
  }
  const toggleLock = (i: number) => setLocks((p) => p.map((v, idx) => (idx === i ? !v : v)))

  const genText = useMemo(() => {
    try { return tpl.join(tpl.parts.map((p, i) => p[slots[i] ?? 0] ?? p[0])) } catch { return '' }
  }, [tpl, slots])

  const saveGen = () => {
    addToLibrary('snippets', { text: genText, source: '로맨스 상투구 생성기 · ' + tpl.label, tags: ['로맨스', '상투구', tpl.label] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }
  const genToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({ kind: 'text', root: 'research', folder: '로맨스 글감', title: tpl.label, bodyHtml: `<p>${escapeHtml(genText)}</p>`, meta: { 장르: '로맨스', 유형: tpl.label } })
    if (id) flash('프로젝트 자료 〈로맨스 글감〉에 추가했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const input: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }

  return (
    <div style={wrap}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('dict')} aria-pressed={tab === 'dict'}
          style={{ borderColor: tab === 'dict' ? 'var(--accent)' : 'var(--border)', color: tab === 'dict' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="📖"/> 어휘 사전</button>
        <button className="minibtn" onClick={() => setTab('gen')} aria-pressed={tab === 'gen'}
          style={{ borderColor: tab === 'gen' ? 'var(--accent)' : 'var(--border)', color: tab === 'gen' ? 'var(--text)' : 'var(--muted)' }}><Emoji e="🎲"/> 상투구 생성기</button>
        <span style={{ ...hint, marginLeft: 'auto', alignSelf: 'center' }}>
          {tab === 'dict' ? `${total}개 표현` : `${fmtBig(combos)} 조합`}
        </span>
      </div>

      {tab === 'dict' ? (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단어·뜻·태그로 검색 (예: 밀당, 후회, 빙의, 키스, 절망)" style={input} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
              style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}><Emoji e="💞"/> 전체</button>
            {CATS.map((c) => {
              const on = cat === c.key
              return (
                <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}><Emoji e={c.icon}/> {c.label}</button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 표현</button>
            <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
              style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
            <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
          </div>

          {/* 무작위 결과 */}
          {random && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.term}</span>
                <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{random.item.gloss}</div>
              {!!(random.item.tags && random.item.tags.length) && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>#{random.item.tags.join(' #')}</div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(`${random.item.term} — ${random.item.gloss}`, 'rand')}>{copied === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                <button className="minibtn" onClick={() => saveTerm(random.cat, random.item)}><Emoji e="💾"/> 스니펫 저장</button>
                <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.term)}>{favs[favKey(random.cat.key, random.item.term)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
              </div>
            </div>
          )}

          {/* 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
                {onlyFav ? '☆ 아직 즐겨찾기한 표현이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
              </div>
            ) : filtered.map(({ cat: c, item }) => {
              const fk = favKey(c.key, item.term)
              const isFav = !!favs[fk]
              const cid = 'i:' + fk
              return (
                <div key={fk} style={card}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{item.term}</span>
                    <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.term)}
                      style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.gloss}</div>
                  {!!(item.tags && item.tags.length) && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>#{item.tags.join(' #')}</div>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(`${item.term} — ${item.gloss}`, cid)}>{copied === cid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
                    <button className="minibtn" onClick={() => saveTerm(c, item)}><Emoji e="💾"/> 스니펫</button>
                    <button className="linkbtn" onClick={() => termToProject(c, item)} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '이 표현을 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* 생성기 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATES.map((t) => {
              const on = tplId === t.id
              return (
                <button key={t.id} className="minibtn" onClick={() => switchTpl(t.id)} aria-pressed={on}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>{t.label}</button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={roll}><Emoji e="🎲"/> 무작위 조합</button>
            <span style={hint}>슬롯을 잠그고(<Emoji e="🔒"/>) 나머지만 다시 굴려 보세요.</span>
          </div>

          {/* 조합수 표시 */}
          <div style={{ ...hint, lineHeight: 1.6 }}>
            이 생성기 조합 수 <b style={{ color: 'var(--accent)' }}>{fmtBig(combos)}</b> ({combos.toLocaleString('ko-KR')}가지)
            {combos >= 1e12 ? <> — 1조 이상 <Emoji e="🔥"/></> : combos >= 1e8 ? ' — 1억 이상' : ''}
            {' · 전체 생성기 합 '}<b>{fmtBig(GRAND_COMBOS)}</b>
          </div>

          {/* 결과 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 16px', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {genText}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(genText, 'gen')}>{copied === 'gen' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={saveGen}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="linkbtn" onClick={genToProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '생성한 글감을 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          </div>

          {/* 슬롯 잠금/개별 변경 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {tpl.parts.map((pool, i) => (
              <div key={i} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>슬롯 {i + 1} · {pool.length}개</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{pool[slots[i] ?? 0]}</span>
                  <button className="minibtn" onClick={() => toggleLock(i)} title={locks[i] ? '잠금 해제' : '이 슬롯 잠그기'}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: locks[i] ? 'var(--accent)' : 'var(--border)' }}>{locks[i] ? <><Emoji e="🔒"/> 잠김</> : <><Emoji e="🔓"/> 자유</>}</button>
                  <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => setSlots((prev) => prev.map((v, idx) => (idx === i ? (v + 1) % pool.length : v)))}>↻</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 연계: 관련 로맨스 도구 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={() => openToolLinked('writing-dictionary')}><Emoji e="📚"/> 만능 단어 사전</button>
        <button className="linkbtn" onClick={() => openToolLinked('symbolism-dict')}><Emoji e="🔮"/> 상징 사전</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: (payload?.genre as string) || '로맨스' })}><Emoji e="👤"/> 인물 제조기</button>
      </div>
    </div>
  )
}
