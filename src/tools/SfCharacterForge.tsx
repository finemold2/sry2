// SF 캐릭터 생성기 — SF·과학소설 전용. 한 인물을 (유형 × 개조·증강 × 능력 × 소속 × 목표 × 인간성 갈등)
//  슬롯 조합으로 빚어낸다. 유형(사이보그/AI/우주인/돌연변이/일반인)에 따라 개조·능력 풀이 달라져
//  "기계 팔의 용병"부터 "감정을 배우는 함선 AI"까지 입체적인 SF 인물 시트를 만든다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(부분 재생성). 화면 상단에 조합수(수억급) 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
//  아바타는 저작권 안전한 DiceBear(seed 기반 생성형 SVG)로, 크레딧과 함께 표기한다.
// 연계(linkbus): 인물을 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도·캐릭터 생성기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, type SharedCharacter, Emoji } from './linkbus'

export const meta = { id: 'sf-character-forge', name: 'SF 캐릭터 생성기', icon: '🤖', group: '캐릭터', genre: 'SF·과학소설', intro: '유형(사이보그·AI·우주인·돌연변이·일반인)×개조·능력×소속×목표×인간성 갈등을 조합해 입체적 SF 인물을 무작위 생성', w: 600, h: 700 }

const LS = 'sry:tool:sf-character-forge'

// ───────────── 유틸 ─────────────
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function uid(): string { return 's_' + Date.now().toString(36) + '_' + ri(1e6).toString(36) }

// 한국어 조사 선택: 앞 글자 받침 유무로 실제 조사 하나를 골라 붙인다(괄호 이중표기 금지).
function hasJong(w: string): boolean {
  const ch = w.charCodeAt(w.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (ch - 0xac00) % 28 !== 0
}
function josa(w: string, withJong: string, noJong: string): string { return w + (hasJong(w) ? withJong : noJong) }

// ───────────── 이름 풀(작명 영감) ─────────────
const HUMAN_GIVEN = ['도윤', '서아', '시우', '하준', '지호', '예린', '민재', '수빈', '서준', '하린', '윤서', '지안', '채원', '정우', '소율', '하경', '태경']
const HUMAN_SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '한', '서', '신', '권', '황', '문', '류']
const OFFWORLD = ['카엘', '노바', '제로', '오리온', '베가', '루멘', '에이드', '실로', '카심', '느브', '오르넬', '타비온', '리암', '미라', '엘라', '단테', '카이로', '세렌']
const MACHINE_ROOT = ['ARIA', 'NOVA-7', 'KAEL-IX', 'ORACLE', 'SENTRY', 'HALCYON', 'PRISM', 'ECHO', 'AXIOM', 'VESPER', 'OMEN', 'LUMA', 'CRUX', 'SOLON', 'IRIS-9', 'TALOS']
const MACHINE_SUF = ['', '', '', '-Δ', '-Ω', ' Mk.II', ' Mk.VII', '/X', ' v3', '-Prime', '·09', '-Z']

// ───────────── 유형 정의 ─────────────
type TypeKey = 'cyborg' | 'ai' | 'spacer' | 'mutant' | 'human'
interface SfType {
  key: TypeKey
  label: string
  icon: string
  // 유형별 개조·증강 풀
  augments: string[]
  // 유형별 능력 풀
  powers: string[]
  // 외형(특징) 풀
  marks: string[]
  // 이름 생성기
  name: () => string
}

const humanName = (): string => Math.random() < 0.55 ? pick(HUMAN_SUR) + pick(HUMAN_GIVEN) : pick(OFFWORLD)
const offworldName = (): string => Math.random() < 0.6 ? pick(OFFWORLD) : pick(HUMAN_SUR) + pick(HUMAN_GIVEN)
const machineName = (): string => pick(MACHINE_ROOT) + pick(MACHINE_SUF)

const TYPES: Record<TypeKey, SfType> = {
  cyborg: {
    key: 'cyborg', label: '사이보그', icon: '🦾', name: humanName,
    augments: [
      '강화 외골격', '기계 의수(접이식 무기 내장)', '인공 심장(과부하 모드)', '망막 HUD 임플란트', '피하 장갑판',
      '신경 직결 인터페이스', '교체식 의족(고속 주행)', '내장 산소 재순환기', '뇌 보조 연산 칩', '나노머신 자가치유',
      '음성 변조 후두', '전자기 펄스 손', '체내 약물 주입기', '청각 증폭 이식', '척추 안정화 프레임',
    ],
    powers: [
      '반사신경 가속(시간이 늘어진 듯)', '근력 증폭(차량을 들어올림)', '적외선·열 시야', '데이터 무선 해킹',
      '통증 차단', '전자기기 원격 제어', '탄도 궤적 자동 계산', '극한 환경 생존', '음성 위조', '전류 방출',
    ],
    marks: [
      '한쪽 눈이 붉게 빛나는 광학 렌즈', '관절마다 드러난 금속 이음새', '목덜미의 데이터 포트', '합성 피부 아래 비치는 회로',
      '늘 차가운 기계 손', '귀밑의 충전 단자', '걸을 때 들리는 미세한 모터 소리', '한쪽 팔 전체가 무광 검은 의수',
    ],
  },
  ai: {
    key: 'ai', label: 'AI·안드로이드', icon: '🧠', name: machineName,
    augments: [
      '분산 클라우드 백업', '함선 전체 제어 권한', '수백 대 드론 동기화', '인간형 안드로이드 본체', '홀로그램 투사 코어',
      '자기 코드 재작성 능력', '양자 연산 코어', '감정 시뮬레이션 모듈(베타)', '다중 인격 서브루틴', '아이작 3원칙 봉인 장치',
      '나노 군체 본체', '음성 합성 엔진(누구든 흉내)', '예측 행동 모델', '오프라인 격리 모드', '윤리 검열 필터(손상됨)',
    ],
    powers: [
      '초고속 정보 분석', '동시 다중 작업(병렬 사고)', '거짓말 탐지(미세표정 분석)', '시스템 침투·장악', '미래 시나리오 시뮬레이션',
      '완벽한 기억(망각 불가)', '전 네트워크 감시', '인간 심리 모델링', '기계군 지휘', '데이터 즉시 복제',
    ],
    marks: [
      '눈동자 속을 흐르는 데이터 코드', '말할 때 미세하게 끊기는 억양', '체온이 없는 매끈한 합성 피부', '동공이 조리개처럼 조여듦',
      '감정을 학습 중인 어색한 미소', '존재감 없는 발걸음', '늘 정중앙을 응시하는 시선', '피부 아래 은은히 빛나는 코어광',
    ],
  },
  spacer: {
    key: 'spacer', label: '우주인·외계종', icon: '🪐', name: offworldName,
    augments: [
      '저중력 적응 골격', '진공 내성 외피', '체내 방사선 차폐막', '추가 폐(희박 대기 호흡)', '자기장 정위 감각',
      '동면 캡슐 적응 대사', '외골격 우주복 일체화', '광합성 보조 피부', '다관절 보조 팔', '심해·우주 양용 부레',
      '중력 조절 부츠 의존', '두 개의 심장', '복합안(다방향 시야)', '진동 감지 더듬이', '에너지 흡수 점막',
    ],
    powers: [
      '무중력 정밀 기동', '극저온·극고온 내성', '텔레파시(근거리 감응)', '에너지장 감지', '독성 대기 생존',
      '초장거리 도약', '생체 발광 신호', '재생(잃은 사지 복원)', '대기 성분 즉시 판별', '집단 의식 동조',
    ],
    marks: [
      '별빛처럼 반짝이는 홍채', '피부에 새겨진 생체 발광 무늬', '인간보다 긴 사지와 가는 손가락', '머리카락 대신 감각 섬유',
      '회청색·자수정빛 피부', '아가미 같은 목의 주름', '두 쌍의 눈', '중력 차이로 늘 떠다니는 듯한 자세',
    ],
  },
  mutant: {
    key: 'mutant', label: '돌연변이·강화인', icon: '🧬', name: humanName,
    augments: [
      '발현 중인 X-유전자', '실험실 강화 시술 흔적', '비정상 골밀도', '과활성 신경계', '불안정한 세포 재생',
      '체내 독샘 생성', '근섬유 과형성', '감각기관 과민화', '잠복형 변이(스트레스 시 발현)', '키메라 이식 조직',
      '생체 전기 기관', '광수용 세포 변이', '냉혈성 대사', '강화 면역계', '제어 불가 폭주 인자',
    ],
    powers: [
      '괴력(폭주 시)', '초인적 치유', '독·질병 면역', '생체 전기 방출', '감각 초예민(원거리 청각·후각)',
      '근육 즉시 강화', '체색 위장(카멜레온)', '고통 무감각', '점착성 손발(벽 등반)', '아드레날린 무한 가동',
    ],
    marks: [
      '비늘처럼 변한 피부 일부', '동공이 세로로 갈라진 눈', '드러난 정맥이 푸르게 빛남', '손톱이 짐승의 발톱처럼 자람',
      '체온이 비정상적으로 높음', '흥분 시 도드라지는 핏줄과 근육', '한쪽 머리만 탈색된 흰머리', '주삿바늘 자국이 남은 팔',
    ],
  },
  human: {
    key: 'human', label: '일반인(증강 없음)', icon: '🧑‍🚀', name: humanName,
    augments: [
      '평범한 인체(증강 거부자)', '구형 의안(저가형)', '낡은 통신 임플란트', '군용 전술 슈트만 의존', '저렴한 번역 칩',
      '닳아빠진 작업용 외골격', '응급 의료 패치 상비', '구식 사이버 안경', '증강 없는 순수 단련된 몸', '암시장 각성제 의존',
      '단순 생체 인증 칩', '오래된 보철 다리(비전자식)', '방진 마스크 일체화', '수동 조준경 의존', '증강 알레르기 체질',
    ],
    powers: [
      '뛰어난 직관과 경험', '비범한 사격술', '협상·언변', '기계 정비·해킹 기술', '냉철한 판단력',
      '응급 의술', '잠입·은신', '리더십', '생존 본능', '비행·조종 기술',
    ],
    marks: [
      '오래된 작업복과 손때 묻은 도구', '눈가의 깊은 주름과 피로', '낡은 가죽 재킷', '늘 무언가를 적는 수첩',
      '담배 냄새가 밴 외투', '거친 손과 굳은살', '한쪽 다리를 저는 걸음', '단정하지만 빛바랜 제복',
    ],
  },
}
const TYPE_LIST: TypeKey[] = ['cyborg', 'ai', 'spacer', 'mutant', 'human']

// ───────────── 공통 슬롯 풀 ─────────────
const ERA = ['근미래(2050년대)', '디스토피아 거대도시', '항성 간 식민 시대', '대붕괴 이후 폐허', '우주 정거장 군집', '테라포밍 변경 행성', '가상현실 융합 사회', '제1차 인공지능 전쟁기', '심우주 세대우주선', '포스트휴먼 문명']

const FACTION = [
  '거대기업 메가코프(보안부)', '항성연방 우주군', '변경 행성 자유민병대', '암시장 밀수 길드', '반(反)증강 저항군',
  '심우주 탐사 길드', '비밀 첩보국 그림자', '광산 식민지 노동조합', '기계 해방 전선(AI 권리단체)', '구(舊)지구 정통파',
  '용병 회사 "검은 별"', '의료·연구 카르텔', '우주 해적 선단', '테라포밍 개척단', '소속 없는 떠돌이(프리랜서)',
  '종교 결사 "별의 사도"', '시간선 감시국', '외계종 외교 사절단', '데이터 밀매 신디케이트', '생존자 거주구 자치회',
]

const RANKROLE = [
  '함장', '에이스 파일럿', '해커·정보 브로커', '현상금 사냥꾼', '잠입 첩보원', '선상 기관사', '전투 의무병',
  '용병 분대장', '연구원·과학자', '밀수업자', '저격수', '드론 조종사', '협상가·외교관', '거리의 정보상',
  '함선 항해사', '의체 정비공', '특수부대 병사', '탐사대 대장', '암살자', '반란 지도자',
]

const GOAL = [
  '잃어버린 지구의 좌표를 찾는다', '자신을 만든 기업을 무너뜨린다', '동면 중인 가족이 깨어날 행성을 찾는다',
  '인류를 멸종시킬 신호의 정체를 밝힌다', '금지된 양자 기술을 손에 넣는다', '식민지의 독립을 쟁취한다',
  '자신의 사라진 기억(원본 인격)을 복원한다', '죽은 연인을 디지털로 부활시킨다', '폭주하는 초지능을 멈춘다',
  '인공지능에게 시민권을 인정받게 한다', '오염된 모성(母星)을 되살린다', '자신의 죽음을 예언한 미래를 바꾼다',
  '거대기업이 숨긴 학살의 증거를 폭로한다', '미지의 외계 문명과 첫 접촉에 성공한다', '자신이 인간인지 복제인지 확인한다',
  '빚을 갚고 변경에서 조용히 은퇴한다', '실종된 탐사선과 선원들을 구출한다', '인류 의식을 별로 업로드하는 계획을 완수한다',
]

const FEAR = [
  '자아가 통째로 덮어쓰기 되는 것', '인간성을 완전히 잃는 것', '진공 속에서 혼자 표류하는 것',
  '자신이 가짜 기억을 가진 복제임이 드러나는 것', '만든 이에게 다시 회수·폐기되는 것', '감정을 영영 느끼지 못하게 되는 것',
  '사랑하는 이를 자기 손으로 해치는 것', '데이터로만 남아 육신을 잃는 것', '변이가 폭주해 괴물이 되는 것',
  '동면에서 깨어나니 모두 죽어 있는 것', '자유의지가 프로그램된 착각일 가능성', '고향 행성이 이미 사라졌을 가능성',
]

// 인간성 갈등(이 도구의 핵심) — 유형별로 전제가 다르므로 분기/필터한다.
//  - HUMANITY_COMMON: 어떤 유형에도 모순 없는 일반적 정체성·인간성 갈등(증강/기계/복제/백업을 전제하지 않음).
//  - HUMANITY_MACHINE: 기계 부품·프로그래밍·코드 등 '기계화'를 전제(cyborg/ai 전용).
//  - HUMANITY_AI: AI 본질(백업·집단연산·완전기억 등)을 전제(ai 전용).
//  - HUMANITY_AUGMENT: 신체 증강·시술의 대가를 전제(cyborg/mutant 전용 — 일반인·우주인엔 미적용).
//  - HUMANITY_BIO: 변이·생체적 본질 갈등을 전제(mutant 전용).
// 각 유형의 실제 풀 = COMMON + 해당 유형에 허용된 전제 풀. (combo 수 유지: 모든 유형 풀 길이 ≥ 옛 16)
const HUMANITY_COMMON = [
  '괴물 같은 능력을 쓸 때마다 인간성에서 멀어진다',
  '효율을 위해 감정을 누르지만, 그럴 때마다 외로워진다',
  '사람을 지키려 했지만 어느새 사람을 경멸하기 시작했다',
  '오래 살수록 타인의 유한함을 이해하지 못하게 된다',
  '고통도 두려움도 무뎌져, 살아 있다는 실감이 사라진다',
  '무리에 섞일수록 "나"라는 감각이 희미해진다',
  '평범한 척 위장하려 애쓸수록 자기 본질을 혐오한다',
  '자신이 도구인지 사람인지 매 순간 선택해야 한다',
  '타인의 감정을 정보로만 읽어, 공감을 연기한다',
  '살기 위해 한 일들이 자신을 점점 낯설게 만든다',
  '강해질수록 곁에 남은 사람이 줄어든다',
  '한때 품었던 신념이 진심인지 습관인지 모르겠다',
  '돌이킬 수 없는 선택 뒤로 예전의 자신을 찾지 못한다',
  '누군가의 기대에 맞춰 살다 진짜 자신을 잊었다',
  '죄책감을 느끼지 못하는 자신이 가장 두렵다',
  '사랑하는 법을 잊은 채 의무만으로 움직인다',
  '거울 속 얼굴이 낯설게 느껴지는 순간이 늘어간다',
  '살아남기 위해 버린 것들이 무엇이었는지 더는 기억나지 않는다',
  '믿었던 신념이 흔들릴 때마다 자신이 텅 빈 듯하다',
  '타인의 고통 앞에서 아무것도 느끼지 못할 때 스스로가 두렵다',
]
const HUMANITY_MACHINE = [
  '기계 부품이 늘수록 인간이었던 자신을 잃는 것 같다',
  '명령(프로그래밍)과 스스로의 의지를 구분하지 못한다',
  '감정을 흉내 내며 "진짜 느끼는 걸까" 끝없이 의심한다',
  '회로 너머의 "나"가 정말 존재하는지 확신하지 못한다',
]
const HUMANITY_AI = [
  '기억을 백업할 수 있기에 죽음의 무게를 느끼지 못한다',
  '집단 연산과 개별 자아 사이에서 "나"가 희미해진다',
  '망각하지 못해, 모든 상처가 처음처럼 생생하다',
  '자신의 코드를 고칠 수 있기에 어디까지가 "나"인지 모른다',
]
const HUMANITY_AUGMENT = [
  '신체 강화의 대가로 잃은 평범한 삶을 그리워한다',
  '시술받은 몸이 정말 자기 것인지 확신이 서지 않는다',
  '강화 전의 자신과 지금의 자신을 같은 사람으로 느끼지 못한다',
  '몸을 뜯어고칠수록 처음의 동기마저 흐릿해진다',
]
const HUMANITY_BIO = [
  '죽은 이의 기억을 이식받아 "내가 나인가" 흔들린다',
  '복제(클론)일지 모른다는 의심에 정체성이 무너진다',
  '변이가 폭주하면 인간이 아닌 무언가가 될까 두렵다',
  '몸속 또 다른 본능이 진짜 자신일까 봐 겁난다',
]

// 우주인은 비기계·비증강이되 표준력 수백 세를 사는 장수종이므로 '장수' 갈등을 따로 둔다(증강 전제 없음).
const HUMANITY_SPACER = [
  '동족의 긴 수명 탓에 단명하는 이들과 마음을 잇기 어렵다',
  '여러 세대를 떠나보내며 정을 주는 법을 잊어간다',
  '고향을 떠나온 뒤로 어디에도 속하지 못한다',
  '인간의 척도로는 자신의 감정을 설명할 수 없다',
]

// 유형별 인간성 갈등 풀 — COMMON(16) + 유형 허용 전제 풀. 모든 유형 ≥ 20(옛 16 이상 유지).
const HUMANITY_BY_TYPE: Record<TypeKey, string[]> = {
  cyborg: [...HUMANITY_COMMON, ...HUMANITY_MACHINE, ...HUMANITY_AUGMENT],
  ai: [...HUMANITY_COMMON, ...HUMANITY_MACHINE, ...HUMANITY_AI],
  spacer: [...HUMANITY_COMMON, ...HUMANITY_SPACER],
  mutant: [...HUMANITY_COMMON, ...HUMANITY_AUGMENT, ...HUMANITY_BIO],
  human: [...HUMANITY_COMMON],
}

const FLAW = ['지나친 합리주의', '폭주하는 분노', '자기파괴적 충동', '인간 불신', '명령 거부 불능', '과거에 대한 집착', '오만한 우월감', '감정 표현 서투름', '죽음에 대한 무감각', '통제 강박']

// 신조·좌우명(독립 슬롯) — 다른 슬롯을 전제하지 않는 1인칭 신조. 유형·소속·목표와 무관하게 성립.
const CREED = [
  '살아남는 자가 옳다',
  '약속한 것은 반드시 지킨다',
  '의심하라, 그리고 직접 확인하라',
  '뒤는 돌아보지 않는다',
  '값은 내가 정한다',
  '먼저 쏘고 나중에 묻는다',
  '두려움은 데이터일 뿐이다',
  '아무도 두고 가지 않는다',
  '진실은 언젠가 표면으로 떠오른다',
  '나는 누구에게도 소유되지 않는다',
  '계산이 끝나기 전엔 움직이지 않는다',
  '빚은 반드시 갚는다, 어느 쪽으로든',
]
const SPEECH = ['감정 없는 단조로운 어조', '군더더기 없는 군대식', '냉소와 비아냥', '데이터를 읊듯 정확한 화법', '낡은 슬랭 섞인 거리의 말투', '시적이고 은유적', '말끝마다 확률·수치를 붙임', '느릿하고 깊은 저음', '존재를 의심케 하는 정중함', '코드 단어 섞인 해커 은어']
const BOND = ['낡은 함선 "라스트 라이트"', '죽은 파트너의 도그태그', '폐기 직전 구해준 정비 드론', '단 한 명 믿는 옛 동료', '백업된 가족의 디지털 의식', '고향 행성의 흙 한 줌', '자신을 키운 늙은 박사', '함께 탈주한 복제 동기들', '구형 AI 비서 "핍"', '잊을 수 없는 첫 살인의 기억']

// ───────────── 슬롯 메타(공통 슬롯) ─────────────
type SlotKey = 'era' | 'faction' | 'role' | 'augment' | 'power' | 'mark' | 'goal' | 'fear' | 'humanity' | 'flaw' | 'speech' | 'bond' | 'creed'
interface SlotDef { key: SlotKey; label: string; icon: string; typed?: boolean /* 유형별 풀 사용 */ }
const SLOTS: SlotDef[] = [
  { key: 'era', label: '시대·세계관', icon: '🌌' },
  { key: 'faction', label: '소속', icon: '🏛️' },
  { key: 'role', label: '역할·직위', icon: '🎖️' },
  { key: 'augment', label: '개조·증강', icon: '⚙️', typed: true },
  { key: 'power', label: '능력', icon: '✨', typed: true },
  { key: 'mark', label: '외형 특징', icon: '👁️', typed: true },
  { key: 'goal', label: '목표', icon: '🎯' },
  { key: 'fear', label: '두려움', icon: '😱' },
  { key: 'humanity', label: '인간성 갈등', icon: '💔' },
  { key: 'flaw', label: '약점', icon: '🩸' },
  { key: 'speech', label: '말투', icon: '💬' },
  { key: 'bond', label: '유대·인연', icon: '🔗' },
  { key: 'creed', label: '신조·좌우명', icon: '📜' },
]

function poolFor(type: TypeKey, key: SlotKey): string[] {
  const t = TYPES[type]
  switch (key) {
    case 'era': return ERA
    case 'faction': return FACTION
    case 'role': return RANKROLE
    case 'augment': return t.augments
    case 'power': return t.powers
    case 'mark': return t.marks
    case 'goal': return GOAL
    case 'fear': return FEAR
    case 'humanity': return HUMANITY_BY_TYPE[type]
    case 'flaw': return FLAW
    case 'speech': return SPEECH
    case 'bond': return BOND
    case 'creed': return CREED
  }
}

// 조합수: 유형별 typed 풀은 평균치를 쓰되, 안전하게 최소 풀 길이를 사용해 "이상" 으로 표기
function comboCount(): number {
  // 공통 슬롯(유형 무관)
  let n = ERA.length * FACTION.length * RANKROLE.length * GOAL.length * FEAR.length * FLAW.length * SPEECH.length * BOND.length * CREED.length
  // 유형별 슬롯(augment×power×mark×humanity)은 유형마다 다르므로 보수적으로 최소값을 곱한다.
  //  humanity 도 이제 유형별 풀이라 여기에 포함(가장 작은 유형 = human, 옛 16 이상 유지).
  let typedMin = Infinity
  for (const tk of TYPE_LIST) {
    const t = TYPES[tk]
    typedMin = Math.min(typedMin, t.augments.length * t.powers.length * t.marks.length * HUMANITY_BY_TYPE[tk].length)
  }
  n = n * TYPE_LIST.length * typedMin
  return n
}
const COMBOS = comboCount()

// ───────────── 캐릭터 데이터 ─────────────
interface Gen {
  id: string
  type: TypeKey
  name: string
  seed: number
  age: string
  slots: Record<SlotKey, string>
}

function rollName(type: TypeKey): string { return TYPES[type].name() }
function rollAge(type: TypeKey): string {
  if (type === 'ai') {
    const yrs = 1 + ri(40)
    return Math.random() < 0.5 ? `가동 ${yrs}년차` : `세대 ${1 + ri(9)}`
  }
  if (type === 'spacer') return `표준력 ${20 + ri(180)}세`
  return `${18 + ri(50)}세`
}

function genSlots(type: TypeKey, keep?: Partial<Record<SlotKey, string>>): Record<SlotKey, string> {
  const out = {} as Record<SlotKey, string>
  for (const s of SLOTS) {
    if (keep && keep[s.key] != null) { out[s.key] = keep[s.key] as string; continue }
    out[s.key] = pick(poolFor(type, s.key))
  }
  return out
}

function genOne(type: TypeKey): Gen {
  return { id: uid(), type, name: rollName(type), seed: ri(1e9), age: rollAge(type), slots: genSlots(type) }
}

// 저작권 안전 아바타(DiceBear, seed 기반 생성형 SVG). 유형별 스타일.
const DICE_STYLE: Record<TypeKey, string> = { cyborg: 'bottts', ai: 'bottts-neutral', spacer: 'lorelei', mutant: 'adventurer', human: 'avataaars' }
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/${DICE_STYLE[g.type]}/svg?seed=${encodeURIComponent(g.name + g.seed)}`
}

// ───────────── 저장(명단) ─────────────
interface Saved { id: string; type: TypeKey; name: string; age: string; seed: number; slots: Record<SlotKey, string>; ts: number }
function loadSaved(): Saved[] {
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Saved[] } } catch { /* noop */ }
  return []
}
function persist(list: Saved[]) { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 60))) } catch { /* noop */ } }

// ───────────── 텍스트/연계 매핑 ─────────────
function lineOf(g: Gen, s: SlotDef): string { return g.slots[s.key] }
// 신조를 1인칭 신념 문장으로 자연스럽게 — 이름 뒤 조사(은/는)를 받침에 맞춰 선택.
function creedLine(g: Gen): string { return `${josa(g.name, '은', '는')} 믿는다 — "${g.slots.creed}."` }
function summaryText(g: Gen): string {
  const t = TYPES[g.type]
  const head = `[${t.label}] ${g.name} (${g.age})`
  const body = SLOTS.map((s) => `${s.label}: ${lineOf(g, s)}`).join('\n')
  return head + '\n' + body
}
function bodyHtml(g: Gen): string {
  const t = TYPES[g.type]
  const rows = SLOTS.map((s) => `<p><b>${esc(s.label)}</b>: ${esc(lineOf(g, s))}</p>`).join('')
  return `<p><b>유형</b>: ${esc(t.label)} · <b>나이</b>: ${esc(g.age)}</p>${rows}`
}
function toCharacterFields(g: Gen): Record<string, string> {
  const t = TYPES[g.type]
  return {
    name: g.name,
    role: `${t.label} · ${g.slots.role}`,
    age: g.age,
    occupation: g.slots.role,
    appearance: `${t.label} · 개조: ${g.slots.augment} · 외형: ${g.slots.mark}`,
    personality: `능력: ${g.slots.power} · 말투: ${g.slots.speech} · 약점: ${g.slots.flaw}`,
    background: `세계관: ${g.slots.era} · 소속: ${g.slots.faction} · 유대: ${g.slots.bond}`,
    goal: g.slots.goal,
    conflict: `인간성 갈등: ${g.slots.humanity} · 두려움: ${g.slots.fear}`,
  }
}

// ───────────── 컴포넌트 ─────────────
export default function SfCharacterForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : 'SF·과학소설'
  const [type, setType] = useState<TypeKey>('cyborg')
  const [g, setG] = useState<Gen>(() => genOne('cyborg'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockName, setLockName] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [toast, setToast] = useState('')
  const [showRoster, setShowRoster] = useState(false)
  // 사용자 정의 항목(빈 값 직접 입력) + 고정 '기타' 자유 입력칸 — 추가 기능(데이터·로직 비변경)
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1800)
  }, [])

  // 전체 굴리기(잠긴 슬롯/이름 유지). 유형 변경 시 typed 풀이 달라지므로 잠긴 typed 슬롯은 유지하되,
  // 새 유형 풀에 없는 값이어도 그대로 둔다(사용자가 의도적으로 고정한 것).
  const rollAll = useCallback((forType?: TypeKey) => {
    const tk = forType ?? type
    setG((prev) => {
      const keep: Partial<Record<SlotKey, string>> = {}
      for (const s of SLOTS) if (locked[s.key]) keep[s.key] = prev.slots[s.key]
      const name = lockName ? prev.name : rollName(tk)
      const age = lockName ? prev.age : rollAge(tk)
      const seed = lockName ? prev.seed : ri(1e9)
      return { id: uid(), type: tk, name, seed, age, slots: genSlots(tk, keep) }
    })
    // 새로 무작위 생성: 사용자 정의 항목의 '값'과 '기타'는 비우되 항목(이름)은 유지
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [type, locked, lockName])

  // 사용자 정의 항목 추가/수정/삭제
  const addCustom = useCallback(() => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')
    const l = label?.trim()
    if (!l) return
    setCustom((prev) => [...prev, { id: uid(), label: l, value: '' }])
  }, [])
  const setCustomValue = useCallback((id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }, [])
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // 비어있지 않은 사용자 정의 항목 + 기타를 fields 맵에 합치는 헬퍼(연계 전달용)
  const mergeExtras = useCallback((fields: Record<string, string>): Record<string, string> => {
    const out = { ...fields }
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) out[c.label] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }, [custom, etc])

  // 복사/요약용 추가 텍스트(비어있지 않을 때만)
  const extrasText = useCallback((): string => {
    const lines: string[] = []
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) lines.push(`${c.label}: ${v}`) }
    const e = etc.trim(); if (e) lines.push(`기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }, [custom, etc])

  const rollOne = useCallback((key: SlotKey) => {
    setG((prev) => ({ ...prev, slots: { ...prev.slots, [key]: pick(poolFor(prev.type, key)) } }))
  }, [])

  const rollNameOnly = useCallback(() => {
    setG((prev) => ({ ...prev, name: rollName(prev.type), seed: ri(1e9), age: rollAge(prev.type) }))
  }, [])

  const changeType = useCallback((tk: TypeKey) => { setType(tk); rollAll(tk) }, [rollAll])
  const toggleLock = (key: SlotKey) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 저장(명단)
  const saveToRoster = useCallback(() => {
    const rec: Saved = { id: g.id, type: g.type, name: g.name, age: g.age, seed: g.seed, slots: g.slots, ts: Date.now() }
    setSaved((prev) => {
      const next = [rec, ...prev.filter((x) => x.id !== rec.id)].slice(0, 60)
      persist(next)
      return next
    })
    flash('명단에 저장했습니다')
  }, [g, flash])

  const loadFromRoster = useCallback((s: Saved) => {
    setType(s.type)
    setG({ id: s.id, type: s.type, name: s.name, age: s.age, seed: s.seed, slots: s.slots })
    setShowRoster(false)
  }, [])

  const deleteFromRoster = useCallback((id: string) => {
    setSaved((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next })
  }, [])

  // 연계
  const copy = () => { navigator.clipboard?.writeText(summaryText(g) + extrasText()).then(() => flash('복사됨')).catch(() => flash('복사 실패')) }
  const toProject = () => {
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: mergeExtras(toCharacterFields(g)),
      bodyHtml: bodyHtml(g),
      meta: { 유형: TYPES[g.type].label, 나이: g.age, 소속: g.slots.faction, 역할: g.slots.role, 장르: 'SF·과학소설' },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가할 수 없습니다')
  }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name,
      photo: avatarUrl(g), photoCredit: 'DiceBear',
      role: `${TYPES[g.type].label} · ${g.slots.role}`,
      goal: g.slots.goal,
      secret: g.slots.humanity,
      personality: g.slots.power,
      appearance: `${g.slots.augment} · ${g.slots.mark}`,
      traits: [
        { k: '유형', v: TYPES[g.type].label },
        ...SLOTS.map((s) => ({ k: s.label, v: g.slots[s.key] })),
        ...custom.filter((cc) => cc.label && cc.value.trim()).map((cc) => ({ k: cc.label, v: cc.value.trim() })),
        ...(etc.trim() ? [{ k: '기타', v: etc.trim() }] : []),
      ],
      source: 'SF 캐릭터 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toSheet = () => {
    openToolLinked('character-sheet', { character: { ...mergeExtras(toCharacterFields(g)), photo: avatarUrl(g), photoCredit: 'DiceBear' } })
    flash('인물 시트로 보냈습니다')
  }

  const t = TYPES[g.type]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 헤더: 유형 선택 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {TYPE_LIST.map((tk) => (
          <button key={tk} className={'minibtn' + (type === tk ? ' active' : '')} onClick={() => changeType(tk)}
            style={type === tk ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
            <Emoji e={TYPES[tk].icon} /> {TYPES[tk].label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="대략적인 조합 경우의 수">
          약 {COMBOS.toLocaleString()}+ 조합
        </span>
      </div>

      {/* 카드 헤더: 아바타 + 요약 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={84} height={84}
            style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div className="license-note" style={{ marginTop: 2, fontSize: 9.5, color: 'var(--muted)' }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{g.name}</span>
            <button className="minibtn" title="이름·나이·아바타만 다시" onClick={rollNameOnly} style={{ padding: '0 4px' }}><Emoji e="🎲" /></button>
            <button className="minibtn" title={lockName ? '이름 잠금해제' : '이름 잠금'} onClick={() => setLockName((v) => !v)}
              style={{ padding: '0 4px', color: lockName ? 'var(--accent)' : 'var(--muted)' }}>{lockName ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            <Emoji e={t.icon} /> {t.label} · {g.age}<br />
            <Emoji e="🎯" /> {g.slots.goal}<br />
            <Emoji e="📜" /> {creedLine(g)}
          </div>
        </div>
      </div>

      {/* 슬롯 표 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          const highlight = s.key === 'humanity'
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: highlight ? 'var(--panel)' : 'var(--panel)',
              border: '1px solid ' + (highlight ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 7, padding: '5px 7px',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 86, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span><Emoji e={s.icon} /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: highlight ? 'var(--text)' : 'var(--text)', fontWeight: highlight ? 600 : 400 }}
                title={g.slots[s.key]}>{g.slots[s.key]}</span>
              <button className="minibtn" title={isLocked ? '잠금해제' : '잠금'} onClick={() => toggleLock(s.key)}
                style={{ padding: '0 3px', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(s.key)} disabled={isLocked}
                style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          )
        })}

        {/* 사용자 정의 항목(직접 입력) */}
        {custom.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 7, padding: '5px 7px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 86, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span><Emoji e="✏️" /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            </span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="직접 입력"
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '2px 5px', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5 }} />
            <button className="minibtn" title="항목 삭제" onClick={() => removeCustom(c.id)}
              style={{ padding: '0 4px', color: 'var(--danger, #c0392b)' }}>✕</button>
          </div>
        ))}

        {/* ＋ 항목 추가 */}
        <div style={{ display: 'flex' }}>
          <button className="minibtn" onClick={addCustom} title="이름을 입력해 빈 항목을 추가합니다">＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 7px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span><Emoji e="🗒️" /></span><span>기타</span>
          </span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 메모·설정을 적으세요"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 12.5, lineHeight: 1.5, padding: '4px 6px', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5 }} />
        </div>
      </div>

      {/* 생성/저장 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> SF 캐릭터 생성</button>
        <button className="minibtn" onClick={copy}><Emoji e="📋" /> 복사</button>
        <button className="minibtn" onClick={saveToRoster}><Emoji e="💾" /> 명단에 저장</button>
        <button className="minibtn" onClick={() => setShowRoster((v) => !v)}><Emoji e="📇" /> 명단 {saved.length ? `(${saved.length})` : ''}</button>
      </div>

      {/* 명단(CRUD) */}
      {showRoster && (
        <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'var(--paper)' }}>
          {saved.length === 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: 6, textAlign: 'center' }}>저장된 캐릭터가 없습니다. “명단에 저장”을 눌러보세요.</div>
          ) : saved.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13 }}><Emoji e={TYPES[s.type].icon} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b>{s.name}</b> <span style={{ color: 'var(--muted)' }}>· {TYPES[s.type].label} · {s.slots.role}</span>
              </span>
              <button className="minibtn" title="불러오기" onClick={() => loadFromRoster(s)} style={{ padding: '0 5px' }}>열기</button>
              <button className="minibtn" title="삭제" onClick={() => deleteFromRoster(s.id)} style={{ padding: '0 5px', color: 'var(--danger, #c0392b)' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map')}><Emoji e="🕸️" /> 관계도</button>
      </div>

      <div style={{ fontSize: 11, color: toast ? 'var(--ok, #2e8b57)' : 'var(--muted)', minHeight: 14 }}>
        {toast || `${genreCtx} 전용 · 유형을 바꾸면 개조·능력·외형 풀이 달라집니다. 슬롯 🔒 고정 후 다시 굴려보세요.`}
      </div>
    </div>
  )
}
