// 판타지 캐릭터 생성기 — 판타지 장르 전용. 한 인물을
//  (원형 × 종족 × 역할·신분 × 마법·전투 적성 × 동기 × 결점 × 비밀 × 관계·인연) 슬롯 조합으로 빚어낸다.
//  원형(용사·마법사·기사·도적·성직자·군주·이종족·암흑형)에 따라 적성·외형·이명 풀이 달라져
//  "봉인을 푼 망명 왕자"부터 "금주를 탐하는 몰락 마탑의 견습"까지 입체적 판타지 인물 시트를 만든다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(부분 재생성). 상단에 조합수(수백억~조 단위) 표시.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
//  아바타는 저작권 안전한 DiceBear(seed 기반 생성형 SVG)로, 크레딧과 함께 표기한다.
// 도시에 근거: 하이/로판/이세계 클리셰(선택받은 자·봉인된 악·예언·마법 시스템 하드/소프트·회빙환·등급)를
//  슬롯 데이터에 녹였고, '결점/비밀/마법의 대가'를 강조해 평면적 영웅을 막는다.
// 연계(linkbus): 인물을 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도·캐릭터 생성기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, type SharedCharacter, Emoji } from './linkbus'

export const meta = { id: 'genre-charforge', name: '판타지 캐릭터 생성기', icon: '⚔️', group: '캐릭터', genre: '판타지', intro: '원형(용사·마법사·기사·도적·성직자·군주·이종족·암흑)×종족×신분×마법 적성×동기×결점×비밀×인연을 조합해 입체적 판타지 인물을 무작위 생성', w: 600, h: 720 }

const LS = 'sry:tool:genre-charforge'

// ───────────── 유틸 ─────────────
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function uid(): string { return 'gcf_' + Date.now().toString(36) + '_' + ri(1e6).toString(36) }
// 한글 받침 판정 + 조사 자동 선택(괄호 이중표기 금지, 실제 한 형태만 출력)
function hasJong(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없는 것으로 처리
  return (ch - 0xac00) % 28 !== 0
}
// 받침 있으면 with, 없으면 without 을 단어 뒤에 붙인다(을/를, 은/는, 이/가, 으로/로)
function josa(word: string, withJong: string, withoutJong: string): string {
  // '로/으로'는 ㄹ 받침일 때도 '로'를 쓰는 예외 처리
  const ch = word.charCodeAt(word.length - 1)
  if (withJong === '으로' && ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 === 8) return word + '로'
  return word + (hasJong(word) ? withJong : withoutJong)
}

// ───────────── 이름 풀(작명 영감 — 판타지 음운) ─────────────
// 인간계(서구식)
const HUMAN_GIVEN = ['에드릭', '롤란드', '가웨인', '세드릭', '리안', '아르윈', '엘리아', '세라', '브리엔', '카산드라', '이졸데', '로엔', '발렌', '마리벨', '도리안', '셀린', '아드리안', '레오니', '가렛', '비비안']
const HUMAN_SUR = ['폰 아르덴', '드 모르네', '하르베크', '발렌타인', '그레이모어', '아셴포드', '리벤하임', '카르도나', '벨몬트', '윈터홀드', '라스크', '드레이븐', '아벨라르', '실버레인']
// 엘프(유음·모음 위주, 길고 유려)
const ELF_NAME = ['엘라리온', '실바누스', '아엘린', '리안드라', '카엘렌', '미리엘', '타엘리아', '페아노르', '엘로윈', '갈라드', '시엘', '나이엘', '아르웬', '루시엔', '에아렌딜', '님로델', '셀레보른', '핀로드']
// 드워프(딱딱한 자음·돌·금속 어감)
const DWARF_NAME = ['토르길', '발린', '두린', '그림니르', '브록', '카즈둠', '한드락', '모린', '다르긴', '오린', '바즈', '흐룬가', '글로인', '나르비', '쿠르가', '드라우그']
// 야만·오크·이종족(거친 어감)
const SAVAGE_NAME = ['그루마쉬', '카르그', '우르가', '드라크', '모그', '쥬르카', '하르그', '브루탈', '나즈', '고름', '스카르', '르가쉬', '타루크', '베르그', '오크닐', '구르나크']
// 동방·이방(이세계·동양풍 변형)
const EXOTIC_NAME = ['세이렌', '아샤', '리오넬', '제피르', '나디아', '오르넬', '하시바', '루멘', '베스나', '카림', '소르야', '엔딜', '미라쥬', '아잘', '느헤브', '카이샤']

// ───────────── 원형(Archetype) 정의 ─────────────
type ArchKey = 'hero' | 'mage' | 'knight' | 'rogue' | 'cleric' | 'royal' | 'beastfolk' | 'dark'
interface Arch {
  key: ArchKey
  label: string
  icon: string
  // 원형별 마법·전투 적성 풀
  aptitudes: string[]
  // 원형별 외형 특징 풀(이 장르 특유의 묘사)
  marks: string[]
  // 원형별 이명(별칭) 풀 — "○○의 ○○" 식 별호
  epithets: string[]
  // 선호 종족 분포(이름 풀과 연동)
  races: RaceKey[]
  // DiceBear 스타일
  dice: string
}

type RaceKey = 'human' | 'elf' | 'dwarf' | 'halfelf' | 'orc' | 'beast' | 'fae' | 'undead'
interface RaceDef { key: RaceKey; label: string; traits: string[]; names: string[][] }
// 종족별 이름 후보(여러 풀에서 선택)
const RACES: Record<RaceKey, RaceDef> = {
  human: { key: 'human', label: '인간', traits: ['짧은 수명이지만 야망이 크다', '적응력과 다재다능함', '다른 종족과의 경계에 산다'], names: [HUMAN_GIVEN, EXOTIC_NAME] },
  elf: { key: 'elf', label: '엘프', traits: ['수백 년을 사는 장수종', '자연·마법과의 깊은 친화', '오만하리만치 고고하다'], names: [ELF_NAME] },
  dwarf: { key: 'dwarf', label: '드워프', traits: ['지하 왕국의 장인종', '고집스럽고 의리가 깊다', '돌과 금속을 읽는 눈'], names: [DWARF_NAME] },
  halfelf: { key: 'halfelf', label: '하프엘프', traits: ['두 세계 어디에도 속하지 못함', '인간의 야망과 엘프의 감각', '경계인의 고독'], names: [HUMAN_GIVEN, ELF_NAME] },
  orc: { key: 'orc', label: '오크·반(半)오크', traits: ['편견과 두려움의 대상', '타고난 완력과 강인함', '명예를 아는 전사 문화'], names: [SAVAGE_NAME, HUMAN_GIVEN] },
  beast: { key: 'beast', label: '수인·야만족', traits: ['짐승의 감각과 본능', '문명에 길들지 않은 자존', '부족의 긍지'], names: [SAVAGE_NAME, EXOTIC_NAME] },
  fae: { key: 'fae', label: '요정·정령족', traits: ['인간의 논리를 비웃는 변덕', '계약과 거래에 묶인 존재', '거짓을 말하지 못한다'], names: [ELF_NAME, EXOTIC_NAME] },
  undead: { key: 'undead', label: '언데드·불사자', traits: ['죽음 너머에서 돌아온 자', '잃어버린 인간성의 잔재', '시간이 멈춘 듯한 존재감'], names: [HUMAN_GIVEN, HUMAN_SUR.length ? EXOTIC_NAME : EXOTIC_NAME] },
}

const ARCHES: Record<ArchKey, Arch> = {
  hero: {
    key: 'hero', label: '용사·선택받은 자', icon: '🗡️', dice: 'adventurer', races: ['human', 'halfelf', 'orc', 'beast'],
    aptitudes: [
      '성검에 깃든 봉인된 빛의 권능', '예언이 지목한 "별의 인장"', '용의 피를 이은 잠재한 화염', '죽음의 문턱에서 각성한 재생력',
      '적의 약점을 직감하는 전투 본능', '동료의 힘을 끌어올리는 통솔의 기운', '한계를 넘으면 발현되는 "한계 돌파"', '신탁이 내린 정화의 가호',
      '아직 다루지 못하는 막대한 잠재 마력', '회귀 전 생의 기억과 전투 경험', '몬스터를 무력화하는 위압', '소생 불가의 상처도 견디는 강인한 육신',
    ],
    marks: [
      '낡았지만 빛을 머금은 성유물 검', '이마·손등에 떠오르는 예언의 인장', '평범해 보이나 결정적 순간 빛나는 눈', '전장에서 더 또렷해지는 기개',
      '소박한 차림 속 감춰진 비범함', '상처투성이지만 꺾이지 않는 자세', '누구든 따르게 만드는 눈빛', '낡은 가문의 문장이 새겨진 망토',
    ],
    epithets: ['예언의 아이', '여명의 검사', '봉인을 푼 자', '용의 후예', '재림한 용사', '별빛을 짊어진 자', '한계 너머의 검', '꺼지지 않는 불꽃'],
  },
  mage: {
    key: 'mage', label: '마법사·현자', icon: '🔮', dice: 'lorelei', races: ['human', 'elf', 'halfelf', 'fae'],
    aptitudes: [
      '7서클을 넘본다는 천재 마도사', '금기로 봉인된 "고대 진명 마법"', '정령과 계약한 소환·구속술', '시간을 더디게 하는 시공계 마법',
      '죽은 자를 부리는 강령술(흑마법)', '한 번 본 주문을 복제하는 모방 마법', '마나 회로가 비정상적으로 넓은 대용량형', '책으로만 익힌 이론파(실전 미숙)',
      '대가로 수명을 깎는 금주(禁呪) 사용자', '원소를 자유로이 뒤섞는 복합 영창', '마법진 없이 즉시 발동하는 무영창', '저주를 읽고 풀어내는 해주(解呪) 전문',
    ],
    marks: [
      '마력 과부하로 한쪽 눈이 변색됨', '주문을 쓸수록 흰머리가 번지는 대가', '늘 들고 다니는 닳은 마도서', '손끝에 잔류한 희미한 마법진의 빛',
      '나이를 가늠할 수 없는 창백한 안색', '로브 안쪽에 빼곡한 룬 문신', '잉크와 약초 냄새가 밴 손', '마나를 머금어 미세히 떨리는 공기',
    ],
    epithets: ['진명을 읽는 자', '마탑의 이단아', '시간을 멈춘 현자', '금주의 마녀', '폭풍을 부르는 손', '망각의 사서', '별을 읽는 점성술사', '서리의 대마법사'],
  },
  knight: {
    key: 'knight', label: '기사·검사', icon: '🛡️', dice: 'adventurer', races: ['human', 'dwarf', 'halfelf', 'orc'],
    aptitudes: [
      '검에 오러(검기)를 두르는 소드마스터', '맹세로 강화되는 수호의 결의', '일대일에선 패한 적 없는 검술', '방패 너머 한 발도 물러서지 않는 철벽',
      '말 위에서 무적인 창기병의 돌격', '두 자루 검을 쓰는 쌍검술', '적의 일격을 흘려내는 받아넘김의 달인', '대형 몬스터 토벌 경험 다수',
      '기사단을 이끄는 지휘·진형술', '맨몸으로도 강철을 부수는 투기(鬪氣)', '의전과 결투의 법도에 정통', '부상마저 투지로 바꾸는 광전사 기질',
    ],
    marks: [
      '햇빛에 바랜 가문 문장의 갑주', '수없는 전투의 흉터가 새겨진 손', '한 치 흐트러짐 없는 자세', '검집에 손을 얹는 버릇',
      '낡았으나 정성껏 손질된 무구', '눈가에 패인 결의의 주름', '맹세의 표식을 새긴 검신', '전장에서 더 빛나는 형형한 안광',
    ],
    epithets: ['철벽의 기사', '여명검(劍)', '맹세의 수호자', '무패의 검사', '백기사', '폭풍의 창', '서약을 짊어진 자', '강철의 의지'],
  },
  rogue: {
    key: 'rogue', label: '도적·암살자', icon: '🗡', dice: 'micah', races: ['human', 'halfelf', 'beast', 'elf'],
    aptitudes: [
      '그림자에 녹아드는 은신·잠행', '소리 없이 끝내는 일격필살', '어떤 자물쇠도 따는 손재주', '독과 함정에 통달한 살수',
      '군중에 섞여 사라지는 위장술', '단검 투척의 명수', '정보를 사고파는 거리의 귀', '약점을 노리는 급소술',
      '회복 약과 독을 직접 조제', '높은 곳을 누비는 도시 곡예', '소매치기로 단련된 손놀림', '추격을 따돌리는 도주의 천재',
    ],
    marks: [
      '두건 그늘에 가린 표정', '소리를 죽이는 가벼운 발놀림', '소매 안에 숨긴 여러 자루 단검', '훔쳐 온 장신구로 치장한 손',
      '늘 출구를 살피는 눈', '얼굴에 남은 옛 낙인을 가린 자국', '닳은 가죽 갑옷과 검은 복면', '독에 면역이 된 푸르스름한 손톱',
    ],
    epithets: ['밤의 단검', '그림자 손', '천(千)의 얼굴', '소리 없는 칼', '뒷골목의 왕', '독니', '도둑 길드의 망령', '빛을 훔치는 자'],
  },
  cleric: {
    key: 'cleric', label: '성직자·치유사', icon: '✨', dice: 'lorelei', races: ['human', 'elf', 'halfelf', 'fae'],
    aptitudes: [
      '신탁을 받는 성녀·성자의 기적', '상처를 닫고 병을 떨치는 치유술', '언데드를 정화하는 신성 마법', '저주와 악령을 쫓는 구마술',
      '신의 가호로 아군을 두르는 축복', '약초와 연금으로 만든 영약', '죽은 이의 영혼과 대화하는 영매', '신탁으로 미래의 단편을 본다',
      '믿음으로 두려움을 잠재우는 설교', '봉인 의식을 집전하는 사제', '성수와 부적으로 결계를 친다', '순교를 각오한 광신적 가호',
    ],
    marks: [
      '신성한 빛을 머금은 손바닥', '교단의 문양이 수놓인 법의', '기도로 닳은 묵주와 굳은살', '맑지만 어딘가 슬픈 눈빛',
      '걸을 때마다 은은히 퍼지는 향', '이마에 새긴 신앙의 성흔(聖痕)', '신탁이 내릴 때 흐려지는 동공', '치유의 대가로 야윈 몸',
    ],
    epithets: ['빛의 성녀', '신탁을 받은 자', '망자를 위로하는 손', '정화의 사제', '순백의 치유사', '신의 그릇', '구마의 사도', '여명의 기도'],
  },
  royal: {
    key: 'royal', label: '귀족·군주(로판형)', icon: '👑', dice: 'adventurer', races: ['human', 'elf', 'halfelf', 'undead'],
    aptitudes: [
      '제국을 좌우하는 정치·모략의 수완', '한 마디로 좌중을 압도하는 위엄', '원작의 결말을 아는 빙의·회귀 지식', '검과 마법을 모두 익힌 황가의 혈통',
      '가문의 비술로 전해지는 봉인된 힘', '돈과 인맥을 움직이는 상단 운영', '독살·암투를 견뎌 온 생존 본능', '예언이 지목한 차기 황위 계승자',
      '사교계를 지배하는 화술과 매력', '군대를 통솔하는 전략가의 자질', '금지된 가문의 마검·성물 계승', '버림받았다 돌아온 자의 냉혹한 결단',
    ],
    marks: [
      '한 올 흐트러짐 없는 귀족의 기품', '가문의 보석이 박힌 예복', '서늘하지만 매혹적인 미소', '명령에 익숙한 거역할 수 없는 눈빛',
      '독을 견뎌 온 창백한 손끝', '황실 문장을 새긴 인장 반지', '회귀자만 아는 듯한 묘한 여유', '비단 장갑 아래 감춘 검술의 굳은살',
    ],
    epithets: ['몰락 가문의 후계', '재혼한 황후', '얼음의 공작', '버림받은 황녀', '폭군의 그림자', '회귀한 영애', '강철 손의 재상', '황금의 군주'],
  },
  beastfolk: {
    key: 'beastfolk', label: '이종족·야생', icon: '🐺', dice: 'big-ears', races: ['beast', 'orc', 'fae', 'elf'],
    aptitudes: [
      '짐승으로 변신하는 수화(獸化)', '인간을 능가하는 후각·청각', '맨손으로 강철을 찢는 야성의 완력', '숲과 짐승을 부리는 야생 친화',
      '부족 대대로 전하는 토템 주술', '본능으로 위험을 감지하는 직감', '드래곤·마수를 길들이는 조련술', '계약으로 정령의 힘을 빌린다',
      '독이나 추위에 강한 강인한 체질', '달이 차면 폭주하는 광화(狂化)', '바람·물의 정령과 교감하는 감응', '한 번 맡은 냄새는 잊지 않는 추적술',
    ],
    marks: [
      '머리에 솟은 짐승의 귀와 꼬리', '세로로 갈라진 야수의 동공', '거친 모피와 부족의 문신', '날카롭게 자란 손톱과 송곳니',
      '달빛 아래 빛나는 눈', '비늘이나 깃털이 섞인 피부', '문명을 거부하는 야성의 기운', '뿔이 돋은 이마와 사나운 인상',
    ],
    epithets: ['달의 사냥꾼', '늑대의 아들', '숲의 수호자', '뿔 달린 야수', '바람을 읽는 자', '부족 최후의 전사', '용을 길들인 자', '야생의 왕'],
  },
  dark: {
    key: 'dark', label: '마왕·암흑(다크 판타지)', icon: '💀', dice: 'bottts', races: ['undead', 'fae', 'orc', 'human'],
    aptitudes: [
      '봉인에서 깨어난 고대 마왕의 권능', '죽은 군세를 일으키는 강령의 군주', '주변을 침식하는 어둠·저주의 안개', '영혼을 거래해 힘을 빌려주는 악마',
      '닿는 모든 것을 부패시키는 손길', '공포 그 자체를 무기로 삼는 위압', '불사에 가까운 재생과 변신', '계약으로 인간을 타락시키는 유혹',
      '금단의 흑마법을 자유로이 다룸', '세계를 멸할 종말의 의식 집전', '시체를 개조하는 사령술사', '깨어나는 중인 미완의 마왕(약체기)',
    ],
    marks: [
      '핏빛으로 타오르는 눈동자', '닿으면 시드는 그림자 같은 손', '왕관처럼 솟은 검은 뿔', '존재만으로 공기가 차가워지는 위압',
      '봉인의 사슬이 남긴 검은 자국', '인간이었던 흔적을 지운 창백함', '주변에 맴도는 망자의 속삭임', '금이 간 가면 아래 감춘 진짜 얼굴',
    ],
    epithets: ['봉인된 마왕', '죽음의 군주', '타락한 옛 영웅', '심연의 부름', '저주받은 왕', '종말의 예언자', '그림자의 지배자', '깨어나는 재앙'],
  },
}
const ARCH_LIST: ArchKey[] = ['hero', 'mage', 'knight', 'rogue', 'cleric', 'royal', 'beastfolk', 'dark']

// ───────────── 공통 슬롯 풀(원형 무관, 도시에 기반) ─────────────
// 신분·역할(사회적 위치)
const STATION = [
  '몰락한 귀족 가문의 외동', '변방 마을의 평범한 고아(실은 혈통이 숨겨진)', '모험가 길드의 신참 모험가', '왕국 기사단의 말단 견습',
  '마탑에 소속된 궁정 마법사', '떠돌이 용병단의 일원', '교단에 헌신하는 수도사', '암살 길드에서 길러진 살수',
  '제국 황실의 방계 왕족', '폐위되어 도망 중인 망명 왕자', '대상단을 거느린 거상의 후계', '봉인을 지키던 수호 사제',
  '노예 검투장에서 살아남은 검투사', '숲속 부족의 차기 족장', '학자 집안의 책벌레 후계', '뒷골목 정보 길드의 정보상',
  '국경을 지키는 변경백의 자식', '신탁을 받은 신전의 무녀', '왕실 근위대의 호위 기사', '소속을 잃고 떠도는 떠돌이',
]

// 세계관·시대 배경(이 인물이 놓인 판)
const ERA = [
  '마왕의 봉인이 풀리기 직전의 종말기', '왕위 계승 전쟁으로 분열된 대륙', '게이트가 열려 던전이 솟아난 세계', '신들이 침묵한 신앙의 황혼기',
  '마법 문명이 절정에 이른 마도공학 시대', '대전쟁 이후 폐허에서 재건 중인 왕국', '예언의 별이 백 년 만에 나타난 격동기', '이종족 간 불안한 휴전이 깨지려는 시기',
  '봉인된 고대 유적이 깨어나는 시대', '제국이 대륙을 통일해가는 정복기', '역병과 언데드가 창궐한 암흑기', '회귀·빙의가 일어난 원작 소설 속 세계',
]

// 동기·목표(이 인물을 움직이는 욕망) — 도시에의 욕망/퀘스트 변주
const MOTIVE = [
  '멸망한 가문의 복수를 완성한다', '잃어버린 혈육·연인을 되찾는다', '예언의 운명에서 벗어나 자유로워진다', '봉인된 고대의 악을 막는다',
  '금지된 진명 마법의 비밀을 손에 넣는다', '몰락한 가문의 영광을 되찾는다', '대륙 최강의 검사·마법사가 된다', '회귀 전 비극적 결말을 뒤바꾼다',
  '죽은 스승의 유언을 완수한다', '자신의 출생과 진짜 혈통을 밝힌다', '병든 고향과 가족을 구할 영약을 얻는다', '신탁이 내린 성물을 모아 세계를 정화한다',
  '자신에게 걸린 저주를 푼다', '버림받은 자신을 증명해 보인다', '봉인된 자신의 진짜 힘을 되찾는다', '제국의 부패한 권력을 무너뜨린다',
  '평범한 삶을 살고 싶지만 운명이 놓아주지 않는다', '실종된 동료·일행을 구출한다', '세계를 멸할 종말의 의식을 저지한다', '인정받지 못한 능력으로 정점에 오른다',
]

// 결점·약점(평면 영웅 방지 — 도시에가 강조)
const FLAW = [
  '오만하여 적을 얕본다', '힘을 쓸수록 인간성을 잃어간다', '과거의 트라우마에 발목 잡힌다', '사랑하는 이 앞에선 판단이 흐려진다',
  '금기의 유혹을 끝내 못 이긴다', '동료를 믿지 못하는 의심병', '복수심이 이성을 집어삼킨다', '자기 능력을 통제하지 못한다',
  '약속과 명예에 지나치게 얽매인다', '죄책감에 스스로를 벌하려 한다', '겁이 많아 결정적 순간 주저한다', '인정 욕구가 무모함으로 이어진다',
  '거짓말을 못 해 위기를 자초한다', '한 번 분노하면 폭주한다', '과거의 자신을 부정하며 자기파괴한다', '타인을 위해 자신을 끝없이 희생한다',
  '교만한 자존심에 도움을 거절한다', '술·도박 등에 의존한다', '냉정한 척하지만 정에 약하다', '예언·운명을 맹신해 자유의지를 버린다',
]

// 비밀(반전의 씨앗) — 도시에의 비밀/출생/봉인 클리셰
const SECRET = [
  '실은 멸망한 왕가의 마지막 후계다', '몸 안에 봉인된 마왕의 조각이 깃들어 있다', '회귀·빙의한 다른 세계의 영혼이다', '저주로 정해진 수명이 얼마 남지 않았다',
  '적의 진영에 심어진 첩자였다', '예언 속 "세계를 멸할 자"로 지목되어 있다', '죽은 줄 알았던 가족이 적이 되어 살아 있다', '겉으로 보이는 종족·정체가 위장이다',
  '금지된 흑마법에 손을 댄 과거가 있다', '잃어버린 기억 속에 끔찍한 진실이 묻혀 있다', '신·악마와 영혼을 건 계약을 맺었다', '자신이 동경하는 영웅을 직접 파멸시켰다',
  '봉인을 지키는 마지막 열쇠를 몸에 지녔다', '겉보기와 달리 막대한 잠재력을 봉인당했다', '사랑하는 이가 적의 우두머리임을 안다', '진짜 정체는 인간이 아닌 고대의 존재다',
]

// 마법·힘의 대가(도시에: 마법은 한계·비용이 흥미롭다) — 핵심 차별 슬롯
const COST = [
  '큰 힘을 쓰면 수명이 깎인다', '마법을 쓸 때마다 기억을 하나씩 잃는다', '능력 발동 후 극심한 고통과 후유증', '힘이 강해질수록 인간성·이성을 잃는다',
  '대가로 소중한 감정(사랑·기쁨)을 잃어간다', '한 번 쓰면 며칠을 앓아눕는 반동', '봉인이 약해질 때마다 광기가 스며든다', '능력의 대가로 신체 일부가 변질된다',
  '힘을 쓸수록 정해진 파멸이 앞당겨진다', '계약의 대가를 언젠가 영혼으로 치러야 한다', '발동에 산 제물·피의 대가가 필요하다', '특별한 대가는 없으나 통제가 극히 어렵다',
]

// 관계·인연(서사의 동료/멘토/적) — 도시에: 일행·멘토·라이벌
const BOND = [
  '중도에 죽을 운명인 늙은 스승·멘토', '검을 맞댄 숙명의 라이벌', '신분을 넘은 금지된 연인', '함께 자란 소꿉친구이자 호위',
  '계약으로 묶인 정령·사역마 파트너', '잃어버린 줄 알았던 혈육', '목숨을 빚진 동료 모험가 일행', '자신을 거둬 준 길드·부족의 두목',
  '복수의 대상이자 한때의 은인', '봉인을 함께 지키는 동료 수호자', '정체를 숨긴 적이지만 마음이 끌리는 상대', '곁을 지키는 충직한 종자·기사',
  '원작·예언에서 적이 될 운명의 인물', '같은 비밀을 공유한 비밀 결사 동료', '인간을 동경하는 이종족 동행', '죽은 동료의 유지를 이은 후계자',
]

// 상징·소지품(늘 지니는 표식의 물건/문장) — 어떤 인물이든 독립적으로 가질 수 있는 명사구.
//  다른 슬롯을 전제하지 않아 곱집합으로 섞여도 모순이 없다.
const RELIC = [
  '대를 이어 물려받은 낡은 문장 인장', '손때 묻은 가죽 표지의 여행 일지', '깨진 채로 목에 건 은빛 부적', '한 번도 풀어 본 적 없는 봉인된 편지',
  '주인을 잃은 동료의 부러진 검', '어머니가 남긴 색바랜 자수 손수건', '달빛에만 글자가 떠오르는 양피지 지도', '늘 품에 넣고 다니는 마른 들꽃 한 송이',
  '이가 빠졌지만 손에 익은 단검', '고향 흙을 담은 작은 가죽 주머니', '시간이 멈춘 망가진 회중시계', '룬이 새겨진 손목의 가는 사슬',
  '누구에게도 보이지 않는 빛바랜 초상화', '맹세의 날 받은 한 짝뿐인 귀고리', '주문이 적힌 닳고 닳은 양피지 두루마리', '피로 물든 적의 부대 깃발 조각',
]

// 이명·별호(원형별) + 공통 접속어로 풍부화는 epithets 사용

// ───────────── 슬롯 메타 ─────────────
type SlotKey = 'era' | 'station' | 'aptitude' | 'mark' | 'epithet' | 'motive' | 'flaw' | 'secret' | 'cost' | 'bond' | 'relic'
interface SlotDef { key: SlotKey; label: string; icon: string; typed?: boolean /* 원형별 풀 사용 */; highlight?: boolean }
const SLOTS: SlotDef[] = [
  { key: 'era', label: '시대·세계관', icon: '🌍' },
  { key: 'station', label: '신분·역할', icon: '🎭' },
  { key: 'aptitude', label: '마법·전투 적성', icon: '⚔️', typed: true },
  { key: 'mark', label: '외형 특징', icon: '👁️', typed: true },
  { key: 'epithet', label: '이명(별호)', icon: '🏷️', typed: true },
  { key: 'motive', label: '동기·목표', icon: '🎯' },
  { key: 'flaw', label: '결점·약점', icon: '🩸', highlight: true },
  { key: 'secret', label: '비밀(반전)', icon: '🤫', highlight: true },
  { key: 'cost', label: '힘의 대가', icon: '⚖️' },
  { key: 'bond', label: '관계·인연', icon: '🔗' },
  { key: 'relic', label: '상징·소지품', icon: '🎁' },
]

function poolFor(arch: ArchKey, key: SlotKey): string[] {
  const a = ARCHES[arch]
  switch (key) {
    case 'era': return ERA
    case 'station': return STATION
    case 'aptitude': return a.aptitudes
    case 'mark': return a.marks
    case 'epithet': return a.epithets
    case 'motive': return MOTIVE
    case 'flaw': return FLAW
    case 'secret': return SECRET
    case 'cost': return COST
    case 'bond': return BOND
    case 'relic': return RELIC
  }
}

// 조합수: 공통 슬롯 × 원형 종류 × (원형별 typed 풀의 최소 곱) × 종족 수 → "이상" 표기
function comboCount(): number {
  const common = ERA.length * STATION.length * MOTIVE.length * FLAW.length * SECRET.length * COST.length * BOND.length * RELIC.length
  let typedMin = Infinity
  let raceMin = Infinity
  for (const ak of ARCH_LIST) {
    const a = ARCHES[ak]
    typedMin = Math.min(typedMin, a.aptitudes.length * a.marks.length * a.epithets.length)
    raceMin = Math.min(raceMin, a.races.length)
  }
  return common * ARCH_LIST.length * typedMin * raceMin
}
const COMBOS = comboCount()

// ───────────── 캐릭터 데이터 ─────────────
interface Gen {
  id: string
  arch: ArchKey
  race: RaceKey
  name: string
  seed: number
  age: string
  slots: Record<SlotKey, string>
}

function rollRace(arch: ArchKey): RaceKey { return pick(ARCHES[arch].races) }
function rollName(race: RaceKey): string {
  const pools = RACES[race].names
  const pool = pick(pools)
  const base = pick(pool)
  // 인간/하프엘프/언데드/귀족은 가끔 성(姓)을 붙여 작명 풍부화
  if ((race === 'human' || race === 'halfelf' || race === 'undead') && Math.random() < 0.45) {
    return base + ' ' + pick(HUMAN_SUR)
  }
  return base
}
function rollAge(arch: ArchKey, race: RaceKey): string {
  if (race === 'elf' || race === 'fae') return `${80 + ri(600)}세(겉보기 ${18 + ri(15)}세)`
  if (race === 'undead') return `사후 ${20 + ri(400)}년`
  if (race === 'dwarf') return `${40 + ri(200)}세`
  if (arch === 'dark') return Math.random() < 0.5 ? `봉인 ${100 + ri(900)}년` : `${100 + ri(400)}세`
  return `${16 + ri(34)}세`
}

function genSlots(arch: ArchKey, keep?: Partial<Record<SlotKey, string>>): Record<SlotKey, string> {
  const out = {} as Record<SlotKey, string>
  for (const s of SLOTS) {
    if (keep && keep[s.key] != null) { out[s.key] = keep[s.key] as string; continue }
    out[s.key] = pick(poolFor(arch, s.key))
  }
  return out
}

function genOne(arch: ArchKey): Gen {
  const race = rollRace(arch)
  return { id: uid(), arch, race, name: rollName(race), seed: ri(1e9), age: rollAge(arch, race), slots: genSlots(arch) }
}

// 저작권 안전 아바타(DiceBear, seed 기반 생성형 SVG). 원형별 스타일.
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/${ARCHES[g.arch].dice}/svg?seed=${encodeURIComponent(g.name + g.seed)}`
}

// ───────────── 저장(명단) ─────────────
interface Saved { id: string; arch: ArchKey; race: RaceKey; name: string; age: string; seed: number; slots: Record<SlotKey, string>; ts: number }
function loadSaved(): Saved[] {
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Saved[] } } catch { /* noop */ }
  return []
}
function persist(list: Saved[]) { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 60))) } catch { /* noop */ } }

// ───────────── 텍스트/연계 매핑 ─────────────
function fullTitle(g: Gen): string {
  // "이명 + 이름" 식 호칭
  return `${g.slots.epithet}, ${g.name}`
}
// 한 줄 소개: 이름·종족·이명을 조사(은/는, 으로/로)를 받침에 맞춰 골라 자연스러운 문장으로.
//  명사구(이름·종족·이명)만 조사에 붙이고, 결과에 괄호 이중표기를 노출하지 않는다.
function tagline(g: Gen): string {
  const race = RACES[g.race].label
  const epi = g.slots.epithet
  const ira = hasJong(epi) ? '이라' : '라' // 인용 조사(이라/라)는 별호 받침에 맞춰
  return `${josa(g.name, '은', '는')} ${josa(race, '으로', '로')} 태어나 "${epi}"${ira} 불린다.`
}
function summaryText(g: Gen): string {
  const a = ARCHES[g.arch]
  const head = `[${a.label} · ${RACES[g.race].label}] ${fullTitle(g)} (${g.age})`
  const body = SLOTS.map((s) => `${s.label}: ${g.slots[s.key]}`).join('\n')
  const racetrait = `종족 특성: ${pick(RACES[g.race].traits)}`
  return head + '\n' + tagline(g) + '\n' + body + '\n' + racetrait
}
function bodyHtml(g: Gen): string {
  const a = ARCHES[g.arch]
  const rows = SLOTS.map((s) => `<p><b>${esc(s.label)}</b>: ${esc(g.slots[s.key])}</p>`).join('')
  return `<p><b>원형</b>: ${esc(a.label)} · <b>종족</b>: ${esc(RACES[g.race].label)} · <b>나이</b>: ${esc(g.age)}</p>${rows}`
}
function toCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    role: `${a.label} · ${g.slots.station}`,
    age: `${g.age} · ${RACES[g.race].label}`,
    occupation: g.slots.station,
    appearance: `이명 "${g.slots.epithet}" · 외형: ${g.slots.mark}`,
    personality: `적성: ${g.slots.aptitude} · 결점: ${g.slots.flaw}`,
    background: `세계관: ${g.slots.era} · 종족 특성: ${pick(RACES[g.race].traits)} · 인연: ${g.slots.bond}`,
    goal: g.slots.motive,
    conflict: `비밀: ${g.slots.secret} · 힘의 대가: ${g.slots.cost}`,
  }
}

// 정규(표준) 캐릭터 필드 — 받는 허브(인물 시트/라이브러리)에서 항목이 제자리 칸에 들어가도록
//  뭉친 값을 분리해 정규 키에 1:1로 매핑한다. linkbus.CHARACTER_FIELDS 스키마와 동일한 키만 사용.
function toCanonicalCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,                                   // 이름
    aka: g.slots.epithet,                           // 별칭(이명·별호)
    role: a.label,                                  // 역할(원형)
    age: g.age,                                     // 나이
    origin: RACES[g.race].label,                    // 출신(종족)
    appearance: g.slots.mark,                       // 외모(외형 특징)
    occupation: g.slots.station,                    // 직업(신분·역할)
    personality: g.slots.aptitude,                  // 성격/특성(마법·전투 적성)
    goal: g.slots.motive,                           // 목표/욕망(동기·목표)
    flaw: g.slots.flaw,                             // 약점/결점
    secret: g.slots.secret,                         // 비밀(반전)
    background: g.slots.era,                         // 배경(시대·세계관)
    relations: g.slots.bond,                        // 관계(인연)
    notes: `힘의 대가: ${g.slots.cost} · 상징·소지품: ${g.slots.relic} · 종족 특성: ${pick(RACES[g.race].traits)}`, // 메모(힘의 대가·상징·종족 특성)
  }
}

// ───────────── 컴포넌트 ─────────────
export default function GenreCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : '판타지'
  const [arch, setArch] = useState<ArchKey>('hero')
  const [g, setG] = useState<Gen>(() => genOne('hero'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockName, setLockName] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [toast, setToast] = useState('')
  const [showRoster, setShowRoster] = useState(false)
  // 사용자 정의 항목(항목명+값) + 고정 '기타' 자유 입력 — 미리 만든 데이터가 없으므로 무작위 생성 안 함
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

  // 사용자 정의 항목: 추가/값변경/삭제. 무작위 생성하지 않고 사용자가 직접 입력.
  const addCustomField = useCallback(() => {
    const label = (typeof window !== 'undefined' ? window.prompt('새 항목 이름을 입력하세요 (예: 무기, 가족, 거주지)') : '')?.trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: uid(), label, value: '' }])
  }, [])
  const setCustomValue = useCallback((id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }, [])
  const removeCustomField = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])
  // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우고, 항목(이름) 정의는 유지한다.
  const resetUserInputs = useCallback(() => {
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [])

  // 전체 굴리기(잠긴 슬롯/이름 유지).
  // [정합성] typed 슬롯(적성·외형·이명)은 원형별 전용 풀에서만 나와야 한다.
  // 원형이 바뀌면(ak !== prev.arch) 잠긴 typed 슬롯을 유지하지 않고 새 원형 풀에서 다시 뽑는다.
  // (예: royal 전용 이명 '얼음의 공작'을 잠근 채 mage로 바꾸면 fae 종족과 결합돼 모순이 생기므로 차단.)
  // archetype-무관 슬롯(시대·신분·동기·결점·비밀·대가·인연·상징)은 모든 원형에서 유효하므로 잠금 유지.
  const rollAll = useCallback((forArch?: ArchKey) => {
    const ak = forArch ?? arch
    setG((prev) => {
      const archChanged = ak !== prev.arch
      const keep: Partial<Record<SlotKey, string>> = {}
      for (const s of SLOTS) {
        if (!locked[s.key]) continue
        // 원형이 바뀌면 typed 슬롯은 새 원형 풀에서 재추첨(잠금 무시) — 교차 결합 모순 방지
        if (archChanged && s.typed) continue
        keep[s.key] = prev.slots[s.key]
      }
      const race = lockName ? prev.race : rollRace(ak)
      const name = lockName ? prev.name : rollName(race)
      const age = lockName ? prev.age : rollAge(ak, race)
      const seed = lockName ? prev.seed : ri(1e9)
      return { id: uid(), arch: ak, race, name, seed, age, slots: genSlots(ak, keep) }
    })
    // 새 캐릭터/재생성: 사용자 정의 항목 값과 '기타'는 비우되 항목(이름)은 유지
    resetUserInputs()
  }, [arch, locked, lockName, resetUserInputs])

  const rollOne = useCallback((key: SlotKey) => {
    setG((prev) => ({ ...prev, slots: { ...prev.slots, [key]: pick(poolFor(prev.arch, key)) } }))
  }, [])

  const rollNameOnly = useCallback(() => {
    setG((prev) => { const race = rollRace(prev.arch); return { ...prev, race, name: rollName(race), seed: ri(1e9), age: rollAge(prev.arch, race) } })
  }, [])

  const changeArch = useCallback((ak: ArchKey) => { setArch(ak); rollAll(ak) }, [rollAll])
  const toggleLock = (key: SlotKey) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 저장(명단)
  const saveToRoster = useCallback(() => {
    const rec: Saved = { id: g.id, arch: g.arch, race: g.race, name: g.name, age: g.age, seed: g.seed, slots: g.slots, ts: Date.now() }
    setSaved((prev) => {
      const next = [rec, ...prev.filter((x) => x.id !== rec.id)].slice(0, 60)
      persist(next)
      return next
    })
    flash('명단에 저장했습니다')
  }, [g, flash])

  const loadFromRoster = useCallback((s: Saved) => {
    setArch(s.arch)
    setG({ id: s.id, arch: s.arch, race: s.race, name: s.name, age: s.age, seed: s.seed, slots: s.slots })
    setShowRoster(false)
  }, [])

  const deleteFromRoster = useCallback((id: string) => {
    setSaved((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next })
  }, [])

  // 사용자 정의 항목 + '기타'를 fields 맵에 합칠 추가 키들(비어있지 않은 값만)
  const userExtraFields = useCallback((): Record<string, string> => {
    const extra: Record<string, string> = {}
    for (const c of custom) {
      const label = c.label.trim()
      const value = c.value.trim()
      if (label && value) extra[label] = value
    }
    if (etc.trim()) extra.etc = etc.trim()
    return extra
  }, [custom, etc])

  // 복사/요약 텍스트에 덧붙일 사용자 입력(비어있지 않은 것만)
  const userExtraText = useCallback((): string => {
    const lines: string[] = []
    for (const c of custom) {
      const label = c.label.trim()
      const value = c.value.trim()
      if (label && value) lines.push(`${label}: ${value}`)
    }
    if (etc.trim()) lines.push(`기타: ${etc.trim()}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }, [custom, etc])

  // 연계
  const copy = () => { navigator.clipboard?.writeText(summaryText(g) + userExtraText()).then(() => flash('복사됨')).catch(() => flash('복사 실패')) }
  const toProject = () => {
    const extra = userExtraFields()
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: fullTitle(g),
      character: { ...toCharacterFields(g), ...toCanonicalCharacterFields(g), ...extra },
      bodyHtml: bodyHtml(g),
      meta: { 원형: ARCHES[g.arch].label, 종족: RACES[g.race].label, 나이: g.age, 신분: g.slots.station, 이명: g.slots.epithet, 장르: '판타지' },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가할 수 없습니다')
  }
  const toLibrary = () => {
    const extra = userExtraFields()
    const c: Partial<SharedCharacter> = {
      name: g.name,
      photo: avatarUrl(g), photoCredit: 'DiceBear',
      role: `${ARCHES[g.arch].label} · ${RACES[g.race].label} · ${g.slots.station}`,
      goal: g.slots.motive,
      secret: g.slots.secret,
      personality: g.slots.aptitude,
      appearance: `${g.slots.epithet} · ${g.slots.mark}`,
      traits: [{ k: '원형', v: ARCHES[g.arch].label }, { k: '종족', v: RACES[g.race].label }, { k: '나이', v: g.age }, ...SLOTS.map((s) => ({ k: s.label, v: g.slots[s.key] })),
        ...custom.filter((cf) => cf.label.trim() && cf.value.trim()).map((cf) => ({ k: cf.label.trim(), v: cf.value.trim() })),
        ...(etc.trim() ? [{ k: '기타', v: etc.trim() }] : [])],
      fields: { ...toCanonicalCharacterFields(g), ...extra },
      source: '판타지 캐릭터 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toSheet = () => {
    const canon = toCanonicalCharacterFields(g)
    const extra = userExtraFields()
    openToolLinked('character-sheet', { character: { ...toCharacterFields(g), ...canon, ...extra, photo: avatarUrl(g), photoCredit: 'DiceBear', fields: { ...canon, ...extra } } })
    flash('인물 시트로 보냈습니다')
  }

  const a = ARCHES[g.arch]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 헤더: 원형 선택 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {ARCH_LIST.map((ak) => (
          <button key={ak} className={'minibtn' + (arch === ak ? ' active' : '')} onClick={() => changeArch(ak)}
            style={arch === ak ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title={ARCHES[ak].label}>
            <Emoji e={ARCHES[ak].icon} /> {ARCHES[ak].label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="대략적인 조합 경우의 수(원형·종족별 최소 풀 기준)">
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
            <button className="minibtn" title="이름·종족·나이·아바타만 다시" onClick={rollNameOnly} style={{ padding: '0 4px' }}><Emoji e="🎲" /></button>
            <button className="minibtn" title={lockName ? '이름 잠금해제' : '이름 잠금'} onClick={() => setLockName((v) => !v)}
              style={{ padding: '0 4px', color: lockName ? 'var(--accent)' : 'var(--muted)' }}>{lockName ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            <Emoji e={a.icon} /> {a.label} · {RACES[g.race].label} · {g.age}<br />
            <Emoji e="🏷️" /> “{g.slots.epithet}”<br />
            <Emoji e="🎯" /> {g.slots.motive}<br />
            <Emoji e="🎁" /> {g.slots.relic}
          </div>
        </div>
      </div>

      {/* 슬롯 표 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
        {SLOTS.map((s) => {
          const isLocked = !!locked[s.key]
          const hl = !!s.highlight
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--panel)',
              border: '1px solid ' + (hl ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 7, padding: '5px 7px',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 92, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span><Emoji e={s.icon} /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', fontWeight: hl ? 600 : 400 }}
                title={g.slots[s.key]}>{g.slots[s.key]}</span>
              <button className="minibtn" title={isLocked ? '잠금해제' : '잠금'} onClick={() => toggleLock(s.key)}
                style={{ padding: '0 3px', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(s.key)} disabled={isLocked}
                style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          )
        })}

        {/* 사용자 정의 항목 — 직접 입력(무작위 생성 안 함) */}
        {custom.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px dashed var(--border)',
            borderRadius: 7, padding: '5px 7px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 92, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span><Emoji e="✏️" /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{c.label}</span>
            </span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="직접 입력…"
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 6px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustomField(c.id)}
              style={{ padding: '0 3px', color: 'var(--danger, #c0392b)' }}>✕</button>
          </div>
        ))}

        {/* 항목 추가 버튼 */}
        <div style={{ display: 'flex' }}>
          <button className="minibtn" onClick={addCustomField} title="나만의 항목을 추가합니다(이름 입력 후 직접 작성)" style={{ fontSize: 11.5 }}>＋ 항목 추가</button>
        </div>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 3,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 7, padding: '5px 7px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span><Emoji e="📝" /></span><span>기타</span>
          </span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어보세요(말투·취향·인간관계·뒷이야기 등)…" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* 생성/저장 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> 판타지 캐릭터 생성</button>
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
              <span style={{ fontSize: 13 }}><Emoji e={ARCHES[s.arch].icon} /></span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b>{s.name}</b> <span style={{ color: 'var(--muted)' }}>· {ARCHES[s.arch].label} · {RACES[s.race].label}</span>
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
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: genreCtx })}><Emoji e="🔤" /> 이름 짓기</button>
      </div>

      <div style={{ fontSize: 11, color: toast ? 'var(--ok, #2e8b57)' : 'var(--muted)', minHeight: 14 }}>
        {toast || `${genreCtx} 전용 · 원형을 바꾸면 적성·외형·이명 풀이 달라집니다. ‘결점·비밀·힘의 대가’로 평면적 영웅을 막으세요.`}
      </div>
    </div>
  )
}
