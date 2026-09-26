// 액션·전쟁 캐릭터 생성기 — 액션·전쟁 장르 전용. 한 인물을
//  (원형 × 진영·소속 × 신분·역할 × 시그니처 무브·무기 × 동기 × 결점 × 비밀·트라우마 × 관계·인연
//   + 부상/흉터, 전투 스타일, '지고 다니는 것') 슬롯 조합으로 빚어낸다.
//  원형(특수요원·용병·저격수·지휘관·신참병·격투가·무협 고수·헌터·반군·암살자)에 따라
//  시그니처 무브·외형·이명·전투 스타일 풀이 달라져, "마지막 한 발만 남긴 망명 저격수"부터
//  "초식을 봉인당한 사파 검객"까지 입체적 액션 인물 시트를 만든다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다(부분 재생성). 상단에 조합수(조 단위) 표시.
//  슬라이더: 개인 무력 ↔ 집단 전략 / 카타르시스 ↔ 비극(톤) — 도시에의 두 축을 인물 데이터에 반영.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(명단)만 사용. 외부 API 불필요.
//  아바타는 저작권 안전한 DiceBear(seed 기반 생성형 SVG)로, 크레딧과 함께 표기한다.
// 도시에 근거: 능력의 규칙·물리적 대가(부상·탄약·트라우마), 시그니처 무브/무기, 이해관계(잃을 것),
//  무게의 물건(팀 오브라이언), 명령 시점 교차, 약점 사다리 등 액션·전쟁 고유 장치를 슬롯에 녹였고,
//  '결점/비밀·트라우마/대가'를 강조해 무손상·평면 영웅을 막는다.
// 연계(linkbus): 인물을 자료('research')/'인물' 폴더 카드로 추가(addToProject kind:character),
//  인물 라이브러리(characters)에도 저장, 인물 시트·관계도·이름 짓기 등 관련 도구를 데이터와 함께 연다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, type SharedCharacter, Emoji, emojify } from './linkbus'

export const meta = { id: 'action-charforge', name: '액션·전쟁 캐릭터 생성기', icon: '🎖️', group: '캐릭터', genre: '액션·전쟁', intro: '원형(특수요원·용병·저격수·지휘관·신참병·격투가·무협 고수·헌터·반군·암살자)×진영×신분×시그니처 무브×동기×결점×트라우마×인연을 조합해 입체적 액션·전쟁 인물을 무작위 생성', w: 620, h: 740 }

const LS = 'sry:tool:action-charforge'

// ───────────── 유틸 ─────────────
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function uid(): string { return 'acf_' + Date.now().toString(36) + '_' + ri(1e6).toString(36) }

// ───────────── 이름 풀(작명 영감 — 액션·전쟁 음운/콜사인) ─────────────
// 현대·군사(한국)
const KO_GIVEN = ['도현', '재혁', '강우', '태영', '준호', '성민', '지훈', '윤석', '병호', '경수', '대호', '정훈', '상혁', '민규', '동철', '현우', '석진', '우진', '범석', '한결']
const KO_SUR = ['김', '이', '박', '최', '정', '강', '조', '한', '오', '서', '신', '권', '황', '안', '송', '류', '백', '문', '양', '구']
// 현대·서구(요원·용병·콜사인 어감)
const WEST_GIVEN = ['잭', '나탄', '드미트리', '빅터', '레이', '마커스', '카일', '에단', '루카스', '소냐', '미라', '에바', '리나', '한나', '클레어', '딘', '닉', '리오', '가브', '세르게이']
const WEST_SUR = ['리처', '콜', '본', '크로우', '하트', '슬레이터', '워커', '머서', '레인', '폭스', '드레이크', '블랙우드', '카잔', '볼코프', '스톤', '리드', '헤일', '몰리나']
// 무협(검객·고수 어감)
const WUXIA_NAME = ['연무백', '한설', '도무진', '백리현', '남궁우', '제갈령', '사마강', '독고천', '모용설', '진소율', '하후강', '여천', '엽단오', '소운, ', '구양휘', '서문연']
  .map((n) => n.replace(/[, ]+$/, ''))
const WUXIA_EPI = ['혈검', '낙성', '풍운', '귀영', '북천', '광도', '백야', '단심']
// 헌터·각성(현대 판타지 어감)
const HUNTER_NAME = ['도진우', '강시혁', '한이서', '리오', '제로', '카인', '서준', '레온', '아라', '윤겸', '하랑', '태산', '진하', '율']
// 콜사인(요원·저격·소대 호출부호)
const CALLSIGN = ['고스트', '리퍼', '바이퍼', '울프', '팰컨', '레이븐', '코브라', '재칼', '나이트호크', '오버워치', '폭스트롯', '에코', '브라보-식스', '데드아이', '센티넬', '워헤드']

// ───────────── 원형(Archetype) 정의 ─────────────
type ArchKey = 'agent' | 'merc' | 'sniper' | 'commander' | 'recruit' | 'brawler' | 'wuxia' | 'hunter' | 'rebel' | 'assassin'
interface Arch {
  key: ArchKey
  label: string
  icon: string
  axis: '개인 무력' | '집단 전략' | '경계'   // 개인 무력 ↔ 집단 전략 축
  moves: string[]      // 시그니처 무브/무기 풀(인물 정체성 압축)
  marks: string[]      // 외형·부상·장비 특징 풀(액션 특유의 묘사)
  epithets: string[]   // 이명/콜사인 풀
  styles: string[]     // 전투 스타일 풀(거리·기교)
  affs: AffKey[]       // 어울리는 진영 분포
  dice: string         // DiceBear 스타일
}

type AffKey = 'army' | 'special' | 'pmc' | 'intel' | 'resistance' | 'syndicate' | 'sect' | 'guild' | 'lone'
interface AffDef { key: AffKey; label: string; traits: string[]; names: string[][] }
const AFFS: Record<AffKey, AffDef> = {
  army:        { key: 'army', label: '정규군·국군', traits: ['명령 체계와 군기에 따라 움직인다', '동료를 두고 가지 않는 신조', '거대한 전쟁 기계의 한 부속'], names: [KO_GIVEN, WEST_GIVEN] },
  special:     { key: 'special', label: '특수부대', traits: ['소수 정예의 무한 신뢰', '말보다 신호와 손짓으로 움직인다', '불가능한 임무에 투입되는 칼날'], names: [WEST_GIVEN, KO_GIVEN] },
  pmc:         { key: 'pmc', label: '민간군사기업·용병단', traits: ['돈과 계약이 충성을 대신한다', '국적과 명분이 흐릿한 직업 전사', '실력만이 다음 계약을 보장한다'], names: [WEST_GIVEN, KO_GIVEN] },
  intel:       { key: 'intel', label: '정보기관·첩보', traits: ['진짜 이름을 아는 이가 없다', '거짓과 위장이 생존의 기술', '방아쇠보다 정보가 더 큰 무기'], names: [WEST_GIVEN, KO_GIVEN] },
  resistance:  { key: 'resistance', label: '저항군·반군', traits: ['제대로 된 보급 없이 신념으로 싸운다', '잃을 것이 없는 자들의 결의', '게릴라·기습이 유일한 활로'], names: [KO_GIVEN, WEST_GIVEN] },
  syndicate:   { key: 'syndicate', label: '범죄조직·뒷세계', traits: ['법 밖의 규율과 의리가 지배한다', '배신은 곧 죽음인 세계', '폭력이 곧 화폐'], names: [KO_GIVEN, WEST_GIVEN] },
  sect:        { key: 'sect', label: '문파·무림(정/사파)', traits: ['초식과 내공의 계보를 잇는다', '강호의 의리와 은원에 묶인다', '비무로 서열이 갈린다'], names: [WUXIA_NAME] },
  guild:       { key: 'guild', label: '헌터 길드·각성자', traits: ['각성한 능력과 등급으로 평가받는다', '게이트·레이드가 일상이 된 세계', '파티의 역할(탱·딜·힐)로 움직인다'], names: [HUNTER_NAME, WEST_GIVEN] },
  lone:        { key: 'lone', label: '무소속·떠돌이', traits: ['어디에도 속하지 않는 외길', '과거를 지우고 떠도는 자', '돕고 싶지 않아도 끌려드는 운명'], names: [WEST_GIVEN, KO_GIVEN, HUNTER_NAME] },
}

const ARCHES: Record<ArchKey, Arch> = {
  agent: {
    key: 'agent', label: '특수요원·작전가', icon: '🕶️', axis: '경계', dice: 'adventurer', affs: ['special', 'intel', 'army', 'lone'],
    moves: [
      '맨손과 주변 사물로 끝내는 근접 제압(CQC)', '단 한 번의 호흡으로 표적을 무력화', '도주로와 출구를 본능적으로 계산', '권총 두 발·확인 사살의 정석 사격',
      '군중에 섞여 미행을 따돌리는 잠행', '폭발물 해체와 설치를 동시에 익힌 손', '취조에서 한마디로 무너뜨리는 심리전', '무전·도청을 역이용하는 기만',
      '차량 추격에서 단 한 번도 놓친 적 없는 운전', '맨몸으로 건물을 오르내리는 침투', '비살상 무력화와 즉결 제압을 가르는 냉정함', '적의 무기를 빼앗아 그대로 되돌려주는 반사신경',
    ],
    marks: [
      '늘 단정하지만 어딘가 위험한 정장', '소매 아래 감춘 옛 작전의 흉터', '표정을 읽히지 않는 무심한 눈', '왼손목의 멈춘 시계(전사한 동료의 유품)',
      '한 발 빼고 출구를 살피는 습관', '총상 후 절뚝이는 다리(궂은 날 욱신거림)', '늘 비상용 무기를 숨겨 둔 옷매무새', '귀에 꽂힌 작은 무전 이어피스',
    ],
    epithets: ['고스트', '청소부', '그림자 핸들러', '재칼', '센티넬', '데드아이', '브로커', '한 발의 사나이'],
    styles: ['근접·기습 위주의 실내 제압', '비살상 제압과 정밀 사격의 병행', '소음기·은밀 사살 중심', '환경(엄폐·사물)을 무기화하는 즉흥전'],
  },
  merc: {
    key: 'merc', label: '용병·총잡이', icon: '🪖', axis: '개인 무력', dice: 'adventurer', affs: ['pmc', 'syndicate', 'lone', 'resistance'],
    moves: [
      '재장전마저 안무처럼 매끄러운 건파이팅', '두 자루 권총을 동시에 운용하는 쌍권총', '돌격소총 단발 점사로 탄약을 아끼는 노련함', '근접에선 산탄총, 거리엔 저격으로 전환하는 다재다능',
      '수류탄을 정확히 굴려 넣는 투척의 감각', '차량·바리케이드를 엄폐물로 굴려 쓰는 시가전', '한 탄창으로 다수를 정리하는 사격 효율', '백병전에서 개머리판·전투칼로 끝내는 근접',
      '연막·섬광으로 판을 뒤집는 도구 활용', '부상당한 채로도 끝까지 방아쇠를 당기는 깡', '적의 화력을 유인해 동료 진입로를 여는 미끼 역', '탄약 1발만 남았을 때 더 침착해지는 배짱',
    ],
    marks: [
      '여러 전장의 흙먼지가 밴 낡은 전술 조끼', '온몸에 새긴 죽은 전우들의 이름 문신', '담배 연기 너머의 지친 눈', '총상·파편상이 지도처럼 새겨진 등',
      '한쪽 귀가 잘 안 들리는 청력 손상', '늘 손질해 번들거리는 애용 화기', '계약서보다 두꺼운 흉터투성이 손', '낡았지만 한 번도 빗나간 적 없는 도그태그',
    ],
    epithets: ['워헤드', '리퍼', '한 탄창', '미친개', '철혈', '바이퍼', '마지막 계약', '불사의 총잡이'],
    styles: ['압도적 화력으로 밀어붙이는 정면 돌파', '엄폐 사격과 기동의 균형', '근·중·원거리 무기 전환의 올라운드', '탄약·도구를 아껴 쓰는 효율 전투'],
  },
  sniper: {
    key: 'sniper', label: '저격수·정밀사수', icon: '🎯', axis: '경계', dice: 'micah', affs: ['special', 'army', 'pmc', 'lone'],
    moves: [
      '심박과 호흡 사이, 정지의 순간에만 당기는 방아쇠', '1마일 너머 표적을 바람·거리째 읽는 탄도 계산', '한 발로 상황을 끝내는 일격필살', '며칠을 같은 자리에서 기다리는 인내의 잠복',
      '두 표적을 한 호흡에 처리하는 더블 탭', '관측수와 손발이 맞는 무전 한 마디의 호흡', '엄폐를 관통하는 대물(對物) 저격', '재장전 한 박자를 노린 적의 허를 찌름',
      '거점 한 곳을 장악해 전장을 통제하는 화망', '소음과 섬광을 죽인 야간 사격', '미끼를 던져 적을 시야로 끌어내는 사냥', '단 한 발만 남았을 때 더 차가워지는 집중',
    ],
    marks: [
      '햇빛에 그을린 위장 도색의 길리슈트', '오랜 잠복으로 굳은 무릎과 팔꿈치', '한쪽 눈만 유난히 깊은 사색의 눈', '바람을 읽느라 늘 손가락을 적시는 버릇',
      '뺨에 남은 반동 자국과 화약 그을림', '계급장을 뗀 낡은 위장복', '표적 명단을 새긴 탄피 목걸이', '귀를 막아도 떠나지 않는 이명(耳鳴)',
    ],
    epithets: ['데드아이', '한 발 한 목숨', '바람의 손', '유령 사수', '천 야드의 침묵', '북천(北天)의 눈', '낙성(落星)', '마지막 탄피'],
    styles: ['원거리 정밀 사격 중심의 고지 장악', '잠복·기만 후 일격', '관측수와의 2인 1조 운용', '근접 강제 시 권총·전투칼로 전환'],
  },
  commander: {
    key: 'commander', label: '지휘관·전략가', icon: '🎖️', axis: '집단 전략', dice: 'adventurer', affs: ['army', 'special', 'resistance', 'pmc'],
    moves: [
      '병력 손실을 최소화하는 측면 우회·포위 섬멸', '적의 보급선을 끊어 싸우지 않고 이기는 병참전', '거짓 무전·위장으로 적을 오판하게 하는 양동작전', '열세를 뒤집는 거점 사수와 종심 방어',
      '척후·첩보를 종합해 적의 다음 수를 읽는 통찰', '예비대를 결정적 순간에 투입하는 운용의 묘', '병사들을 결사항전으로 묶는 한마디 연설', '각개격파로 수적 열세를 무력화하는 분단 전술',
      '후퇴마저 다음 승리의 포석으로 만드는 철수전', '제압 사격과 돌격의 타이밍을 가르는 직감', '지형·날씨·시간을 전부 아군 편으로 끌어오는 계산', '명령의 무게와 그 인간적 비용을 아는 신중함',
    ],
    marks: [
      '닳은 지휘봉 대신 손때 묻은 작전 지도', '전선의 흙먼지가 밴 야전 외투', '잠을 줄여 충혈된, 그러나 또렷한 눈', '계급장보다 무거운 책임의 그늘',
      '전사한 부하의 군번줄을 모아 둔 주머니', '오래된 부상으로 굳은 경례 자세', '담담하지만 흔들리지 않는 목소리', '브리핑 때마다 펴 드는 낡은 메모 수첩',
    ],
    epithets: ['여우', '불패의 지휘관', '강철의 의지', '한 수 앞', '전선의 아버지', '오버워치', '냉정한 칼', '마지막 방패'],
    styles: ['병참·정보 우위로 싸우는 머리 싸움', '측면 기동과 포위의 운동전', '거점 사수의 방어전', '소수로 다수를 농락하는 게릴라 지휘'],
  },
  recruit: {
    key: 'recruit', label: '신참병·학도병', icon: '🪂', axis: '집단 전략', dice: 'big-smile', affs: ['army', 'resistance', 'special', 'guild'],
    moves: [
      '아직 손에 익지 않아 떨리는 첫 사격', '겁에 질려도 끝내 방아쇠를 당기는 의지', '선임의 동작을 필사적으로 흉내 내는 학습', '몸으로 부딪쳐 배우는 참호·각개전투',
      '전우를 구하려 무모하게 뛰어드는 용기', '실수 끝에 단 한 번 빛나는 결정적 한 발', '들것을 메고 포화를 뚫는 위생병의 헌신', '무전·암구호를 떨면서도 정확히 전달',
      '첫 전투의 세례 끝에 눈빛이 바뀌는 순간', '두려움을 농담으로 누르는 어린 객기', '명령을 곧이곧대로 따르다 진실을 알게 됨', '살아남는 것 자체가 매일의 임무인 생존',
    ],
    marks: [
      '아직 빳빳한, 흙 한 점 안 묻은 새 군복', '두려움을 감추려 꽉 다문 입', '고향에서 온 편지·사진을 품은 가슴주머니', '첫 전투 후 며칠을 잠 못 드는 충혈된 눈',
      '헐렁한 군화와 어색한 군장', '떨리는 손을 감추려 꽉 쥔 소총', '아직 솜털이 남은 앳된 얼굴', '훈련소에서 받은 빳빳한 군번줄',
    ],
    epithets: ['풋내기', '학도병', '운 좋은 놈', '막내', '신병', '여명의 신참', '살아남은 아이', '다음 차례'],
    styles: ['선임을 따르는 제식·기본 전투', '두려움과 싸우며 성장하는 실전 학습', '위생·통신 등 지원 임무 중심', '결정적 순간의 무모한 돌파'],
  },
  brawler: {
    key: 'brawler', label: '격투가·맨몸 전사', icon: '🥊', axis: '개인 무력', dice: 'micah', affs: ['syndicate', 'lone', 'guild', 'resistance'],
    moves: [
      '한 방으로 의식을 끊는 정타의 권격', '관절을 비틀어 제압하는 그래플링', '벽·계단·난간을 발판 삼는 환경 활용 격투', '연이은 타격으로 몰아붙이는 콤비네이션',
      '상대의 힘을 흘려 되받아치는 합기', '맨손으로 흉기를 무력화하는 무기 방어', '치명상을 입고도 버티는 맷집과 근성', '급소 한 점을 노리는 정확한 일격',
      '다수를 상대로 동선을 끊어 각개로 처리', '낙법과 회피로 데미지를 흘리는 방어술', '거리를 좁혀 압살하는 클린치', '마지막 힘으로 던지는 결정타',
    ],
    marks: [
      '굳은살과 흉터로 뒤덮인 주먹', '몇 번이고 부러졌다 붙은 코', '셔츠 아래 단단히 다져진 근육', '한쪽 눈썹을 가르는 옛 상처',
      '붕대를 감았다 풀기를 반복한 손목', '맞아도 흔들리지 않는 단단한 턱', '낡은 글러브와 닳은 손싸개', '싸움이 새겨진 두꺼운 손마디',
    ],
    epithets: ['철권', '한 방', '무패의 주먹', '거리의 왕', '불도저', '광도(狂刀) 대신 광권(狂拳)', '강철 턱', '맨손의 사신'],
    styles: ['근접 타격 위주의 인파이팅', '제압·관절기 중심의 그래플링', '맞으며 들어가는 압박전', '환경을 활용한 즉흥 격투'],
  },
  wuxia: {
    key: 'wuxia', label: '무협 고수·검객', icon: '⚔️', axis: '개인 무력', dice: 'lorelei', affs: ['sect', 'lone', 'resistance'],
    moves: [
      '검에 내공을 실어 베는 검기(劍氣)의 절기', '상대 초식의 허점을 단번에 파훼하는 안목', '경공으로 지붕과 수면을 밟고 나는 신법', '점혈로 혈도를 짚어 적을 봉쇄',
      '한 호흡에 십 초식을 쏟아붓는 쾌검', '내공을 끌어올려 한 수에 승부를 가르는 절초', '독·암기에 통달한 사파의 음험한 수', '맨손으로 칼날을 잡아채는 공수입백인(空手入白刃)',
      '심법으로 부상을 다스리며 싸우는 운기행공', '봉인되거나 잃었던 가문의 비기를 되찾는 각성', '검 한 자루로 다수를 상대하는 일대다(一對多)', '마지막 한 줌 내공으로 펼치는 회심의 일격',
    ],
    marks: [
      '강호의 풍상이 밴 낡은 무복', '주화입마의 흔적인 창백한 안색', '검집을 쥔 손의 두꺼운 굳은살', '눈빛에 어린 형형한 안광(眼光)',
      '비무에서 얻은 가슴팍의 검흔', '내공으로 희끗해진 귀밑머리', '늘 곁에 두는 손때 묻은 애검', '말수는 적으나 흔들림 없는 자세',
    ],
    epithets: ['혈검(血劍)', '낙성검(落星劍)', '귀영(鬼影)', '풍운검객', '백야(白夜)의 검', '단심검(丹心劍)', '북천일도(北天一刀)', '광도(狂刀)'],
    styles: ['검기·절기 중심의 정파 검술', '독·암기·기습의 사파 무공', '경공·신법으로 농락하는 쾌속전', '내공 운용으로 버티는 지구전'],
  },
  hunter: {
    key: 'hunter', label: '헌터·각성자', icon: '🗡️', axis: '경계', dice: 'bottts', affs: ['guild', 'lone', 'syndicate'],
    moves: [
      '쿨타임을 계산해 스킬을 연계하는 콤보', '게이트·던전의 패턴을 읽어 보스를 공략', '버프·디버프로 파티 화력을 극대화', '탱커로서 어그로를 끌어 동료를 지키는 방벽',
      '한 방의 폭딜로 적을 녹이는 딜러형 각성', '회복·소생으로 전선을 유지하는 힐러의 헌신', '몬스터의 약점 속성을 파고드는 상성 공략', '레이드의 기믹을 혼자 깨는 솔로잉의 경지',
      '각성 스킬을 한계까지 끌어올리는 폭주', '아이템·장비를 조합해 한계를 뚫는 빌드', '죽음의 순간 발동하는 히든 패시브', '등급을 뛰어넘는 한 사람 몫의 변수',
    ],
    marks: [
      '각성 등급이 표기된 헌터 협회 인식표', '능력 사용의 반동으로 충혈된 눈', '마나·기운이 감도는 미세히 떨리는 손', '레이드의 상처가 아물지 않은 흉터',
      '늘 손에 익은 각성 무기(검·총·창)', '게이트 분진이 밴 전투복', '각성 직후 변색된 한쪽 눈동자', '쿨타임을 재는 듯한 초조한 손짓',
    ],
    epithets: ['제로', '랭커', '솔로 플레이어', '게이트 브레이커', '재림한 헌터', '한계 너머', '심연의 사냥꾼', '변수'],
    styles: ['스킬 연계 중심의 폭딜형', '어그로·방어 위주의 탱커형', '버프·회복의 서포터형', '약점 상성을 파는 공략형'],
  },
  rebel: {
    key: 'rebel', label: '반군·저항투사', icon: '🔥', axis: '집단 전략', dice: 'big-ears', affs: ['resistance', 'syndicate', 'lone', 'army'],
    moves: [
      '폭약과 기습으로 보급로를 끊는 사보타주', '시가지 골목을 손바닥처럼 아는 게릴라전', '적진 한복판에 숨어드는 잠입 공작', '민중을 결집시키는 선동과 연설',
      '급조 폭발물(IED)을 만드는 손재주', '치고 빠지는 히트앤런의 달인', '점령군의 무전·암호를 가로채는 첩보', '소수로 대군을 괴롭히는 소모전',
      '아군 진입을 위해 스스로 미끼가 되는 결단', '정보망을 엮어 점령군을 마비시키는 조직력', '버려진 무기를 끌어모아 무장하는 임기응변', '대의를 위해 끝까지 입을 다무는 결사항전',
    ],
    marks: [
      '얼굴을 가린 낡은 스카프·복면', '점령군에 잡혔던 고문의 흉터', '신념으로 형형한, 그러나 지친 눈', '급조한 무장과 짝이 안 맞는 군복',
      '동지를 잃은 슬픔이 밴 표정', '늘 품은 동지 명단·작전 지도', '거친 손과 화약에 그을린 손톱', '체포 영장에 박제된 수배 얼굴',
    ],
    epithets: ['불꽃', '얼굴 없는 자', '지하의 목소리', '마지막 봉화', '점령군의 악몽', '거리의 망령', '꺼지지 않는 불씨', '자유의 칼'],
    styles: ['기습·사보타주의 게릴라전', '잠입·첩보 중심의 공작', '선동·조직의 정치전', '소모전으로 적을 갉는 지구전'],
  },
  assassin: {
    key: 'assassin', label: '암살자·살수', icon: '🔪', axis: '개인 무력', dice: 'micah', affs: ['syndicate', 'intel', 'sect', 'lone'],
    moves: [
      '소리 없이 다가가 한 번에 끝내는 일격필살', '독과 약물로 흔적 없이 처리하는 살법', '그림자와 군중에 녹아드는 은신', '표적의 동선을 며칠씩 추적하는 인내',
      '단검 투척으로 거리를 무시하는 명중', '함정과 사고로 위장하는 완벽한 알리바이', '급소 한 점을 노리는 해부학적 정확성', '추격을 따돌리는 도시 곡예와 도주',
      '표적을 유인해 고립시키는 심리전', '잠긴 문·금고를 따는 손재주', '소음기와 어둠을 활용한 야간 처리', '의뢰 너머의 진실을 캐다 표적이 되는 반전',
    ],
    marks: [
      '얼굴을 기억하기 어려운 평범한 인상', '소매 안에 감춘 여러 자루 단검', '소리를 죽이는 가벼운 발놀림', '독에 면역이 된 푸르스름한 손톱',
      '늘 출구를 살피는 무심한 눈', '과거를 지운 듯 깨끗한 신상(身上)', '닳지 않게 손질된 살상 도구', '표정에 드러나지 않는 죄책감의 그늘',
    ],
    epithets: ['그림자', '소리 없는 칼', '천(千)의 얼굴', '독니', '밤의 손님', '귀영(鬼影)', '마지막 의뢰', '얼굴 없는 자'],
    styles: ['은신·일격필살의 잠행', '독·함정의 음험한 처리', '단검·암기의 근중거리전', '추적·미행의 사냥'],
  },
}
const ARCH_LIST: ArchKey[] = ['agent', 'merc', 'sniper', 'commander', 'recruit', 'brawler', 'wuxia', 'hunter', 'rebel', 'assassin']

// ───────────── 공통 슬롯 풀(원형 무관, 도시에 기반) ─────────────
// 신분·역할(전장에서의 위치)
const STATION = [
  '소대를 이끄는 베테랑 분대장', '명령에 회의를 품기 시작한 위관 장교', '계급을 박탈당한 강등된 노병', '전선의 의무병(위생병)',
  '단독 작전을 도맡는 특수전 요원', '계약마다 진영을 바꾸는 직업 용병', '국적을 숨긴 채 활동하는 첩보원', '문파에서 파문당한 떠돌이 검객',
  '헌터 협회에 막 등록한 신참 각성자', '점령군에 맞서는 지하 저항 세포', '뒷세계의 청부를 받는 살수', '전쟁 포로에서 탈출한 생존자',
  '부대 전멸의 유일한 생존자', '군법회의를 앞둔 항명자', '전설로만 전해지던 은퇴한 노병의 복귀', '소년병으로 끌려와 자란 병사',
  '관측수와 짝을 이루는 저격조의 일원', '군의 비밀 작전에 동원된 민간 전문가', '한때 적이었다가 전향한 투항병', '전우의 복수를 위해 다시 총을 든 제대군인',
]

// 세계관·전장 배경(이 인물이 놓인 판)
const ARENA = [
  '국경에서 전면전이 터지기 직전의 긴장기', '점령군에 맞선 도시 게릴라전의 한복판', '보급선이 끊긴 채 고립된 최후의 거점', '휴전 협정이 깨지려는 불안한 대치 상태',
  '게이트가 열려 몬스터가 쏟아진 현대 헌터 세계', '대륙을 떠도는 정파와 사파의 무림 항쟁기', '내전으로 갈라진 폐허 위 재건의 진통기', '냉전 그늘 속 그림자 첩보전의 시대',
  '용병들이 분쟁지역을 떠도는 무법의 변경', '포로 학대와 전범 의혹이 도사린 후방 수용소', '대규모 상륙·공성 작전을 앞둔 결전 전야', '회귀·재림한 자가 비극의 전쟁을 다시 맞는 세계',
]

// 동기·목표(이 인물을 움직이는 욕망) — 도시에의 '왜 싸우는가' 변주
const MOTIVE = [
  '전사한 전우의 복수를 완성한다', '포로가 된 동료를 구출해 데려온다', '전쟁을 끝낼 단 한 번의 작전을 성공시킨다', '가족이 있는 고향을 적의 손에서 지킨다',
  '자신을 버린 조국·조직의 진실을 폭로한다', '명령으로 저지른 과오를 속죄한다', '대륙 최강의 검객·사수가 되어 증명한다', '비극으로 끝난 과거를 회귀로 뒤바꾼다',
  '죽은 지휘관의 마지막 명령을 완수한다', '전쟁의 부조리를 끝내고 평범한 삶으로 돌아간다', '잃어버린 동생·연인의 행방을 찾는다', '부패한 군 수뇌부를 끌어내린다',
  '단 한 명의 부하도 더 잃지 않는다', '자신에게 걸린 누명을 벗고 명예를 회복한다', '봉인·박탈당한 자신의 진짜 실력을 되찾는다', '점령군을 몰아내고 자유를 되찾는다',
  '그저 살아서 이 전쟁을 끝까지 버텨낸다', '실종된 분대를 끝까지 찾아 데려온다', '세계를 멸할 무기·계획을 저지한다', '인정받지 못한 실력으로 정점에 오른다',
]

// 결점·약점(무손상·평면 영웅 방지 — 도시에가 강조)
const FLAW = [
  '동료를 잃은 죄책감에 무모하게 돌진한다', '명령에 의문이 들면 항명을 마다하지 않는다', '전투 후 손이 떨리는 외상 후 스트레스', '한 번 분노하면 적아 구분 없이 폭주한다',
  '부하·전우를 위해 자신을 끝없이 희생한다', '과거의 트라우마에 결정적 순간 얼어붙는다', '복수심이 임무·이성을 집어삼킨다', '자기 실력을 과신해 적을 얕본다',
  '술·약물·진통제 없이는 견디지 못한다', '아무도 믿지 못해 단독 행동을 고집한다', '약속과 군인의 명예에 지나치게 얽매인다', '겁이 많아 첫 발을 망설이다 일을 키운다',
  '냉정한 척하지만 민간인·아이 앞에선 무너진다', '오래된 부상을 숨기다 결정적 순간 발목 잡힌다', '자신만 살아남았다는 생존자의 죄책감', '한 번 정한 표적은 이성을 잃고 쫓는다',
  '권위·계급에 본능적으로 반항한다', '전투 중독으로 평화로운 일상을 견디지 못한다', '말보다 주먹·총이 먼저 나가는 충동', '냉소로 두려움을 감추다 동료를 밀어낸다',
]

// 비밀·트라우마(반전의 씨앗) — 도시에: 비밀/반전 클라이맥스('진짜 적은 아군')
const SECRET = [
  '아군 지휘부의 학살·전범 명령을 알고 있다', '실은 적 진영에 심어진 이중 첩자다', '명령으로 민간인을 사살한 과거가 있다', '전사 처리된 동료가 적이 되어 살아 있다',
  '자신이 일으킨 오발·실수로 분대가 전멸했다', '회귀·재림한 다른 생의 기억을 지녔다', '몸에 치명적 지병·시한부 선고를 안고 싸운다', '겉으로 드러난 계급·신분이 위장이다',
  '존경하던 지휘관을 직접 손에 처리했다', '잃어버린 기억 속에 끔찍한 작전이 묻혀 있다', '적의 우두머리가 헤어진 혈육·옛 연인이다', '봉인·박탈당한 막대한 실력을 감추고 있다',
  '동료를 살리려 적과 비밀 거래를 맺었다', '훈장 뒤에 숨겨진 비겁한 도주의 진실', '자신을 영웅으로 만든 작전이 실은 조작이었다', '진짜 적은 외부가 아닌 자기 조직임을 안다',
]

// 물리적 대가·부상(도시에: 능력은 대가가 흥미롭다 / 부상 시계) — 핵심 차별 슬롯
const COST = [
  '전투 후 며칠을 앓아눕는 극심한 반동', '오래된 총상이 궂은 날 결정적 순간 욱신거린다', '큰 부상을 입은 채 시간과 싸우는 출혈(부상 시계)', '능력·내공을 쓸수록 수명·체력이 깎인다',
  '한쪽 눈·다리·청력을 이미 전장에서 잃었다', '진통제·약물에 의존해야 버틸 수 있다', '외상 후 환각·악몽이 판단을 흐린다', '한 번 한계를 넘으면 며칠간 무력해진다',
  '탄약·보급이 늘 부족해 한 발 한 발이 절박하다', '주화입마·각성 폭주의 위험을 안고 싸운다', '동료의 죽음마다 마음 한 조각이 무너진다', '특별한 대가는 없으나 통제가 극히 어렵다',
]

// 관계·인연(서사의 동료/멘토/적/희생) — 도시에: 멘토·라이벌·희생적 후위
const BOND = [
  '전장에서 자신을 거둬 키운 늙은 상관·멘토', '실력이 백중한 숙명의 라이벌·적장(敵將)', '반드시 살려 데려가야 할 부상당한 전우', '진영을 사이에 둔 금지된 연인',
  '관측수·버디 등 목숨을 맡긴 2인 1조 파트너', '죽은 줄 알았다 적이 되어 나타난 혈육', '함께 신병 시절을 보낸 둘도 없는 전우들', '자신을 거둔 부대·소대·문파의 두목',
  '복수의 대상이자 한때의 은인', '거점을 함께 사수하는 결사의 동지들', '정체를 숨긴 적이지만 마음이 끌리는 상대', '곁을 지키는 충직한 부관·종자',
  '자신을 보내려 후위에 남아 산화한 전우의 그림자', '같은 비밀을 공유한 비밀 작전조 동료', '구해야 할 민간인·아이', '죽은 동료의 유지를 이은 후임',
]

// '지고 다니는 것'(팀 오브라이언) — 추상적 전쟁을 구체적 무게로 환원하는 차별 슬롯
const CARRY = [
  '전사한 전우의 군번줄', '고향에서 온, 닳도록 읽은 편지', '연인·가족의 빛바랜 사진 한 장', '한 발만 남겨 둔 마지막 탄창',
  '죽은 부하들의 이름을 적은 수첩', '어머니가 쥐여 준 부적·묵주', '적장에게서 빼앗은 군도(軍刀)', '다 닳은 행운의 라이터·동전',
  '스승이 남긴 부러진 검·유품', '아이가 그려 준 그림 한 장', '제대 후 펼쳐 볼 미완의 편지', '결코 부치지 못한 사죄의 글',
  '동지들의 사진이 박힌 작전 지도', '전우가 남긴 담배 한 갑', '고향 흙을 담은 작은 주머니', '잃어버린 자의 인식표와 못 지킨 약속',
]

// 신조·전투 철학(추상적 행동 원칙) — 동기(구체적 목표)와 독립된 '어떻게 싸우고 사느냐'의 원칙. 명사구.
const CREED = [
  '먼저 쏘는 자가 살아남는다는 냉혹한 원칙', '전우는 무슨 일이 있어도 두고 가지 않는다는 신조', '명령이라도 옳지 않으면 따르지 않는다는 양심',
  '약속한 표적은 끝까지 완수한다는 직업 의식', '이길 수 없는 싸움은 시작하지 않는다는 신중함', '명분 없는 살생은 하지 않는다는 최소한의 선',
  '강한 자에게만 검을 겨눈다는 무인의 긍지', '의리 앞에서는 목숨도 가볍다는 강호의 도리', '한 번 받은 은혜는 반드시 갚는다는 보은의 철칙',
  '두려움을 인정하되 발은 멈추지 않는다는 용기', '죽더라도 등은 보이지 않는다는 자존심', '살아남아 끝을 보는 것이 최선의 복수라는 믿음',
  '민간인과 아이에게는 결코 총을 들지 않는다는 금기', '실력만이 모든 것을 증명한다는 냉정한 신념', '대가 없는 승리는 없다는 전장의 진리',
  '약자를 지키는 칼만이 정당하다는 협의(俠義)', '한 번 정한 진영은 배신하지 않는다는 충절', '감정을 죽여야 손이 떨리지 않는다는 직업적 절제',
]

// 애용 장비·트레이드마크 무장(기능적 소지품) — 외형(mark)·기념품(carry)과 다른 '손에 익은 도구'. 명사구.
const GEAR = [
  '몸의 일부처럼 손에 익은 애용 권총', '한 번도 빗나가지 않은 볼트액션 저격총', '날을 직접 갈아 쓰는 전투용 대검',
  '아버지에게 물려받은 낡은 군용 시계', '어떤 상황에서도 챙기는 응급 지혈 키트', '직접 개조한 소음기 달린 기관단총',
  '소매 안에 숨긴 투척용 단검 한 벌', '연막탄과 섬광탄이 가득한 전술 조끼', '도청·통신을 잡아내는 휴대용 무전 장비',
  '문파에서 받은 손때 묻은 애검(愛劍)', '잠금장치를 따는 소형 침투 도구 세트', '야간 작전용 암시 고글',
  '가벼우면서도 방탄 성능이 좋은 경량 방탄복', '표적의 동선을 적는 손바닥만 한 수첩', '독과 해독제를 함께 넣은 비밀 약병',
  '한 손에 들어오는 접이식 야전 삽', '내공을 갈무리한 호신용 호부(護符)', '거리·바람을 재는 손때 묻은 거리계',
]

// ───────────── 슬롯 메타 ─────────────
type SlotKey = 'arena' | 'station' | 'move' | 'style' | 'mark' | 'epithet' | 'motive' | 'creed' | 'flaw' | 'secret' | 'cost' | 'bond' | 'gear' | 'carry'
interface SlotDef { key: SlotKey; label: string; icon: string; typed?: boolean /* 원형별 풀 사용 */; highlight?: boolean }
const SLOTS: SlotDef[] = [
  { key: 'arena', label: '전장·시대', icon: '🌍' },
  { key: 'station', label: '신분·역할', icon: '🎭' },
  { key: 'move', label: '시그니처 무브', icon: '⚡', typed: true, highlight: true },
  { key: 'style', label: '전투 스타일', icon: '🥋', typed: true },
  { key: 'mark', label: '외형·부상', icon: '🩹', typed: true },
  { key: 'epithet', label: '이명·콜사인', icon: '🏷️', typed: true },
  { key: 'motive', label: '동기·목표', icon: '🎯' },
  { key: 'creed', label: '신조·전투 철학', icon: '📜' },
  { key: 'flaw', label: '결점·약점', icon: '🩸', highlight: true },
  { key: 'secret', label: '비밀·트라우마', icon: '🤫', highlight: true },
  { key: 'cost', label: '물리적 대가', icon: '⚖️' },
  { key: 'bond', label: '관계·인연', icon: '🔗' },
  { key: 'gear', label: '애용 장비·무장', icon: '🎽' },
  { key: 'carry', label: '지고 다니는 것', icon: '🎒' },
]

function poolFor(arch: ArchKey, key: SlotKey): string[] {
  const a = ARCHES[arch]
  switch (key) {
    case 'arena': return ARENA
    case 'station': return STATION
    case 'move': return a.moves
    case 'style': return a.styles
    case 'mark': return a.marks
    case 'epithet': return a.epithets
    case 'motive': return MOTIVE
    case 'creed': return CREED
    case 'flaw': return FLAW
    case 'secret': return SECRET
    case 'cost': return COST
    case 'bond': return BOND
    case 'gear': return GEAR
    case 'carry': return CARRY
  }
}

// 조합수: 공통 슬롯 × 원형 종류 × (원형별 typed 풀의 최소 곱) × 진영 수 × 톤 4 → "이상" 표기
function comboCount(): number {
  const common = ARENA.length * STATION.length * MOTIVE.length * CREED.length * FLAW.length * SECRET.length * COST.length * BOND.length * GEAR.length * CARRY.length
  let typedMin = Infinity
  let affMin = Infinity
  for (const ak of ARCH_LIST) {
    const a = ARCHES[ak]
    typedMin = Math.min(typedMin, a.moves.length * a.styles.length * a.marks.length * a.epithets.length)
    affMin = Math.min(affMin, a.affs.length)
  }
  return common * ARCH_LIST.length * typedMin * affMin * TONE.length
}

// ───────────── 톤(도시에의 두 축: 카타르시스 ↔ 비극) ─────────────
interface ToneDef { key: string; label: string; note: string }
const TONE: ToneDef[] = [
  { key: 'catharsis', label: '카타르시스·영웅', note: '통쾌한 응징과 승리의 쾌감(사이다) 중심. 시그니처 무브를 화려하게 회수.' },
  { key: 'tragedy', label: '비극·환멸', note: '대가 있는 승리(Pyrrhic)와 상실. 무게의 물건·트라우마를 전면에.' },
  { key: 'strategy', label: '전략·정치', note: '병참·정보·기만의 머리 싸움. 지휘부와 현장의 시점 교차.' },
  { key: 'survival', label: '생존·소모', note: '버티고 살아남는 것 자체가 목표. 부상 시계·자원 고갈을 압박.' },
]
const COMBOS = comboCount()

// ───────────── 캐릭터 데이터 ─────────────
interface Gen {
  id: string
  arch: ArchKey
  aff: AffKey
  tone: string
  name: string
  callsign: string
  seed: number
  age: string
  slots: Record<SlotKey, string>
}

function rollAff(arch: ArchKey): AffKey { return pick(ARCHES[arch].affs) }
function rollName(aff: AffKey): string {
  const pools = AFFS[aff].names
  const pool = pick(pools)
  const base = pick(pool)
  // 무협 진영은 성+이름이 이미 결합형이므로 그대로. 현대 진영은 가끔 성을 붙인다.
  if (aff === 'sect') return base
  if (pool === KO_GIVEN && Math.random() < 0.7) return pick(KO_SUR) + base
  if (pool === WEST_GIVEN && Math.random() < 0.55) return base + ' ' + pick(WEST_SUR)
  return base
}
function rollCallsign(): string { return pick(CALLSIGN) }
function rollAge(arch: ArchKey, aff: AffKey): string {
  if (arch === 'recruit') return `${16 + ri(6)}세`
  if (arch === 'commander') return `${38 + ri(27)}세`
  if (arch === 'wuxia') return Math.random() < 0.4 ? `${20 + ri(20)}세(겉보기보다 노련)` : `${24 + ri(46)}세`
  if (aff === 'sect') return `${20 + ri(50)}세`
  return `${22 + ri(33)}세`
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
  const aff = rollAff(arch)
  return { id: uid(), arch, aff, tone: pick(TONE).key, name: rollName(aff), callsign: rollCallsign(), seed: ri(1e9), age: rollAge(arch, aff), slots: genSlots(arch) }
}

// 저작권 안전 아바타(DiceBear, seed 기반 생성형 SVG). 원형별 스타일.
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/${ARCHES[g.arch].dice}/svg?seed=${encodeURIComponent(g.name + g.callsign + g.seed)}`
}
function toneOf(key: string): ToneDef { return TONE.find((t) => t.key === key) ?? TONE[0] }

// ───────────── 저장(명단, localStorage CRUD) ─────────────
interface Saved { id: string; arch: ArchKey; aff: AffKey; tone: string; name: string; callsign: string; age: string; seed: number; slots: Record<SlotKey, string>; ts: number }
function loadSaved(): Saved[] {
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p as Saved[] } } catch { /* noop */ }
  return []
}
function persist(list: Saved[]) { try { localStorage.setItem(LS, JSON.stringify(list.slice(0, 60))) } catch { /* noop */ } }

// ───────────── 텍스트/연계 매핑 ─────────────
function fullTitle(g: Gen): string {
  // "이명(콜사인) + 이름" 식 호칭
  return `${g.slots.epithet}, ${g.name}`
}
function summaryText(g: Gen): string {
  const a = ARCHES[g.arch]
  const head = `[${a.label} · ${AFFS[g.aff].label} · ${toneOf(g.tone).label}] ${fullTitle(g)} (콜사인: ${g.callsign} · ${g.age})`
  const body = SLOTS.map((s) => `${s.label}: ${g.slots[s.key]}`).join('\n')
  const afftrait = `진영 특성: ${pick(AFFS[g.aff].traits)}`
  return head + '\n' + body + '\n' + afftrait
}
function bodyHtml(g: Gen): string {
  const a = ARCHES[g.arch]
  const rows = SLOTS.map((s) => `<p><b>${esc(s.label)}</b>: ${esc(g.slots[s.key])}</p>`).join('')
  return `<p><b>원형</b>: ${esc(a.label)} · <b>진영</b>: ${esc(AFFS[g.aff].label)} · <b>콜사인</b>: ${esc(g.callsign)} · <b>나이</b>: ${esc(g.age)} · <b>톤</b>: ${esc(toneOf(g.tone).label)}</p>${rows}`
}
// 정규(표준) 캐릭터 필드 — 뭉친 값을 분리해 정규 키 1:1 매핑(받는 허브에서 제자리 칸으로).
// 정규 키: name, aka, role, gender, age, bloodType, mbti, height, weight, body, hair, eyes,
//  appearance, mark, occupation, affiliation, origin, personality, value, goal, motivation,
//  fear, flaw, secret, speech, habit, quirk, hobby, background, relations, arc, notes
function canonCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    aka: `${g.slots.epithet} (콜사인 "${g.callsign}")`,
    role: `${a.label} · ${g.slots.station}`,
    age: g.age,
    appearance: g.slots.mark,                 // 외형·부상(자유 서술) → appearance
    mark: g.slots.epithet,                     // 이명·콜사인 → 특징/표식
    occupation: g.slots.station,
    affiliation: AFFS[g.aff].label,            // 진영·소속 → affiliation
    personality: `시그니처 무브: ${g.slots.move} · 전투 스타일: ${g.slots.style}`,
    value: g.slots.creed,                       // 신조·전투 철학 → value(가치관)
    goal: g.slots.motive,                       // 동기·목표 → goal
    motivation: g.slots.motive,                 // 동기 → motivation
    flaw: g.slots.flaw,                         // 결점·약점 → flaw
    secret: g.slots.secret,                     // 비밀·트라우마 → secret
    background: `전장: ${g.slots.arena} · 진영 특성: ${pick(AFFS[g.aff].traits)} · 애용 장비: ${g.slots.gear} · 지고 다니는 것: ${g.slots.carry}`,
    relations: g.slots.bond,                    // 관계·인연 → relations
    notes: `물리적 대가: ${g.slots.cost} · 톤: ${toneOf(g.tone).label} · 축: ${a.axis}`,
  }
}

function toCharacterFields(g: Gen): Record<string, string> {
  const a = ARCHES[g.arch]
  return {
    name: g.name,
    role: `${a.label} · ${g.slots.station}`,
    age: `${g.age} · ${AFFS[g.aff].label} · 콜사인 "${g.callsign}"`,
    occupation: g.slots.station,
    appearance: `이명 "${g.slots.epithet}" · 외형·부상: ${g.slots.mark}`,
    personality: `시그니처 무브: ${g.slots.move} · 전투 스타일: ${g.slots.style} · 결점: ${g.slots.flaw}`,
    value: g.slots.creed,
    background: `전장: ${g.slots.arena} · 진영 특성: ${pick(AFFS[g.aff].traits)} · 인연: ${g.slots.bond} · 애용 장비: ${g.slots.gear} · 지고 다니는 것: ${g.slots.carry}`,
    goal: g.slots.motive,
    conflict: `비밀·트라우마: ${g.slots.secret} · 물리적 대가: ${g.slots.cost}`,
    // 정규 키 추가(받는 허브 기본 칸 매핑용 — 기존 키는 유지, 뭉친 값은 분리해 1:1):
    aka: `${g.slots.epithet} (콜사인 "${g.callsign}")`,
    affiliation: AFFS[g.aff].label,
    mark: g.slots.epithet,
    motivation: g.slots.motive,
    flaw: g.slots.flaw,
    secret: g.slots.secret,
    relations: g.slots.bond,
    notes: `물리적 대가: ${g.slots.cost} · 톤: ${toneOf(g.tone).label} · 축: ${a.axis}`,
  }
}

// ───────────── 컴포넌트 ─────────────
export default function ActionCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : '액션·전쟁'
  const [arch, setArch] = useState<ArchKey>('agent')
  const [g, setG] = useState<Gen>(() => genOne('agent'))
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [lockName, setLockName] = useState(false)
  const [saved, setSaved] = useState<Saved[]>(() => loadSaved())
  const [toast, setToast] = useState('')
  const [showRoster, setShowRoster] = useState(false)
  // 사용자 정의 항목(항목 이름은 유지, 값만 사용자가 직접 작성) + 고정 '기타' 자유 입력
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 정리
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1900)
  }, [])

  // 전체 굴리기(잠긴 슬롯/이름 유지). 원형 변경 시 typed 풀이 달라지므로
  // 잠긴 typed 슬롯은 그대로 둔다(사용자가 의도적으로 고정한 것).
  const rollAll = useCallback((forArch?: ArchKey) => {
    const ak = forArch ?? arch
    setG((prev) => {
      const keep: Partial<Record<SlotKey, string>> = {}
      for (const s of SLOTS) if (locked[s.key]) keep[s.key] = prev.slots[s.key]
      const aff = lockName ? prev.aff : rollAff(ak)
      const name = lockName ? prev.name : rollName(aff)
      const callsign = lockName ? prev.callsign : rollCallsign()
      const age = lockName ? prev.age : rollAge(ak, aff)
      const seed = lockName ? prev.seed : ri(1e9)
      return { id: uid(), arch: ak, aff, tone: pick(TONE).key, name, callsign, seed, age, slots: genSlots(ak, keep) }
    })
    // 무작위 생성 시 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름) 정의는 유지
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }, [arch, locked, lockName])

  const rollOne = useCallback((key: SlotKey) => {
    setG((prev) => ({ ...prev, slots: { ...prev.slots, [key]: pick(poolFor(prev.arch, key)) } }))
  }, [])

  const rollNameOnly = useCallback(() => {
    setG((prev) => { const aff = rollAff(prev.arch); return { ...prev, aff, name: rollName(aff), callsign: rollCallsign(), seed: ri(1e9), age: rollAge(prev.arch, aff) } })
  }, [])

  const cycleTone = useCallback(() => {
    setG((prev) => { const i = TONE.findIndex((t) => t.key === prev.tone); return { ...prev, tone: TONE[(i + 1) % TONE.length].key } })
  }, [])

  const changeArch = useCallback((ak: ArchKey) => { setArch(ak); rollAll(ak) }, [rollAll])
  const toggleLock = (key: SlotKey) => setLocked((l) => ({ ...l, [key]: !l[key] }))

  // 사용자 정의 항목: 추가/값 변경/삭제
  const addCustom = useCallback(() => {
    const label = window.prompt('추가할 항목 이름을 입력하세요 (예: 별명, 신조, 좌우명)')?.trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: uid(), label, value: '' }])
  }, [])
  const setCustomValue = useCallback((id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }, [])
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // 사용자 정의 항목(값 있는 것만) + 기타(비어있지 않을 때만)를 fields 맵으로 — 다른 도구로 전달
  const extraFields = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) out[c.label] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }, [custom, etc])
  // 복사/요약에 덧붙일 사용자 정의·기타 텍스트
  const extraText = useCallback((): string => {
    const lines: string[] = []
    for (const c of custom) { const v = c.value.trim(); if (c.label && v) lines.push(`${c.label}: ${v}`) }
    const e = etc.trim(); if (e) lines.push(`기타: ${e}`)
    return lines.length ? '\n' + lines.join('\n') : ''
  }, [custom, etc])

  // 저장(명단)
  const saveToRoster = useCallback(() => {
    const rec: Saved = { id: g.id, arch: g.arch, aff: g.aff, tone: g.tone, name: g.name, callsign: g.callsign, age: g.age, seed: g.seed, slots: g.slots, ts: Date.now() }
    setSaved((prev) => {
      const next = [rec, ...prev.filter((x) => x.id !== rec.id)].slice(0, 60)
      persist(next)
      return next
    })
    flash('명단에 저장했습니다')
  }, [g, flash])

  const loadFromRoster = useCallback((s: Saved) => {
    setArch(s.arch)
    setG({ id: s.id, arch: s.arch, aff: s.aff, tone: s.tone, name: s.name, callsign: s.callsign, age: s.age, seed: s.seed, slots: s.slots })
    setShowRoster(false)
  }, [])

  const deleteFromRoster = useCallback((id: string) => {
    setSaved((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next })
  }, [])

  // 연계
  const copy = () => { navigator.clipboard?.writeText(summaryText(g) + extraText()).then(() => flash('복사됨')).catch(() => flash('복사 실패')) }
  const toProject = () => {
    const extra = extraFields()
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: fullTitle(g),
      character: { ...toCharacterFields(g), ...extra },
      bodyHtml: bodyHtml(g),
      meta: { 원형: ARCHES[g.arch].label, 진영: AFFS[g.aff].label, 콜사인: g.callsign, 나이: g.age, 신분: g.slots.station, 이명: g.slots.epithet, 톤: toneOf(g.tone).label, 장르: '액션·전쟁' },
    })
    flash(id ? '프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)' : '프로젝트에 추가할 수 없습니다')
  }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name,
      photo: avatarUrl(g), photoCredit: 'DiceBear',
      role: `${ARCHES[g.arch].label} · ${AFFS[g.aff].label} · ${g.slots.station}`,
      goal: g.slots.motive,
      secret: g.slots.secret,
      personality: `${g.slots.move} · ${g.slots.style}`,
      appearance: `${g.slots.epithet}(콜사인 ${g.callsign}) · ${g.slots.mark}`,
      traits: [
        { k: '원형', v: ARCHES[g.arch].label }, { k: '진영', v: AFFS[g.aff].label }, { k: '콜사인', v: g.callsign },
        { k: '나이', v: g.age }, { k: '톤', v: toneOf(g.tone).label },
        ...SLOTS.map((s) => ({ k: s.label, v: g.slots[s.key] })),
        ...Object.entries(extraFields()).map(([k, v]) => ({ k: k === 'etc' ? '기타' : k, v })),
      ],
      fields: { ...canonCharacterFields(g), ...extraFields() },
      source: '액션·전쟁 캐릭터 생성기',
    }
    addToLibrary('characters', c)
    flash('인물 라이브러리에 저장했습니다')
  }
  const toSheet = () => {
    openToolLinked('character-sheet', { character: { ...toCharacterFields(g), photo: avatarUrl(g), photoCredit: 'DiceBear', fields: { ...canonCharacterFields(g), ...extraFields() } } })
    flash('인물 시트로 보냈습니다')
  }
  // 생성 글감(시그니처 무브·이명·지고 다니는 것)을 스니펫 라이브러리에 — 글감 연계
  const toSnippet = () => {
    addToLibrary('snippets', {
      text: `[${ARCHES[g.arch].label} ${g.name}] 시그니처 무브: ${g.slots.move} · 이명 "${g.slots.epithet}" · 지고 다니는 것: ${g.slots.carry}`,
      source: '액션·전쟁 캐릭터 생성기', tags: ['액션·전쟁', '캐릭터', ARCHES[g.arch].label],
    })
    flash('글감(스니펫) 라이브러리에 담았습니다')
  }

  const a = ARCHES[g.arch]
  const tn = toneOf(g.tone)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      {/* 헤더: 원형 선택 + 조합수 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {ARCH_LIST.map((ak) => (
          <button key={ak} className={'minibtn' + (arch === ak ? ' active' : '')} onClick={() => changeArch(ak)}
            style={arch === ak ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            title={`${ARCHES[ak].label} · 축: ${ARCHES[ak].axis}`}>
            <Emoji e={ARCHES[ak].icon} /> {ARCHES[ak].label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} title="대략적인 조합 경우의 수(원형·진영별 최소 풀 × 톤 기준)">
          약 {COMBOS.toLocaleString()}+ 조합
        </span>
      </div>

      {/* 카드 헤더: 아바타 + 요약 + 톤/축 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={84} height={84}
            style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div className="license-note" style={{ marginTop: 2, fontSize: 9.5, color: 'var(--muted)' }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{g.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 5px' }}>콜사인 “{g.callsign}”</span>
            <button className="minibtn" title="이름·콜사인·진영·나이·아바타만 다시" onClick={rollNameOnly} style={{ padding: '0 4px' }}><Emoji e="🎲" /></button>
            <button className="minibtn" title={lockName ? '이름 잠금해제' : '이름 잠금'} onClick={() => setLockName((v) => !v)}
              style={{ padding: '0 4px', color: lockName ? 'var(--accent)' : 'var(--muted)' }}>{lockName ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            <Emoji e={a.icon} /> {a.label} · {AFFS[g.aff].label} · {g.age}<br />
            <Emoji e="🏷️" /> “{emojify(g.slots.epithet)}” · <Emoji e="⚖️" /> 축: {a.axis}<br />
            <Emoji e="🎯" /> {emojify(g.slots.motive)}
          </div>
        </div>
      </div>

      {/* 톤(카타르시스 ↔ 비극) 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 8px' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🎚️" /> 톤:</span>
        <button className="minibtn" onClick={cycleTone} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>{tn.label} ⟳</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tn.note}>{tn.note}</span>
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
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span><Emoji e={s.icon} /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', fontWeight: hl ? 600 : 400 }}
                title={g.slots[s.key]}>{emojify(g.slots[s.key])}</span>
              <button className="minibtn" title={isLocked ? '잠금해제' : '잠금'} onClick={() => toggleLock(s.key)}
                style={{ padding: '0 3px', color: isLocked ? 'var(--accent)' : 'var(--muted)' }}>{isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
              <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(s.key)} disabled={isLocked}
                style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
            </div>
          )
        })}

        {/* 사용자 정의 항목(직접 작성 — 무작위 생성 시 값만 비워짐) */}
        {custom.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: 7, padding: '5px 7px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span><Emoji e="✍️" /></span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label}>{emojify(c.label)}</span>
            </span>
            <input value={c.value} onChange={(e) => setCustomValue(c.id, e.target.value)} placeholder="직접 입력"
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px' }} />
            <button className="minibtn" title="이 항목 삭제" onClick={() => removeCustom(c.id)}
              style={{ padding: '0 3px', color: 'var(--danger, #c0392b)' }}>✕</button>
          </div>
        ))}

        {/* ＋ 항목 추가 */}
        <button className="minibtn" onClick={addCustom}
          style={{ justifySelf: 'start', fontSize: 11.5, padding: '3px 8px', color: 'var(--muted)' }}
          title="이름을 입력해 직접 작성할 빈 항목을 추가합니다">＋ 항목 추가</button>

        {/* 고정 '기타' 자유 입력 */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 7px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
            <span><Emoji e="🗒️" /></span><span>기타(자유 입력)</span>
          </div>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어 주세요 (인물 시트·라이브러리로 함께 전달됩니다)"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 12.5, lineHeight: 1.45, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* 생성/저장 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => rollAll()}><Emoji e="🎲" /> 액션·전쟁 캐릭터 생성</button>
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
                <b>{s.name}</b> <span style={{ color: 'var(--muted)' }}>· {ARCHES[s.arch].label} · {AFFS[s.aff].label} · “{s.callsign}”</span>
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
        <button className="linkbtn" onClick={toSnippet}><Emoji e="📝" /> 글감(스니펫)</button>
        <button className="linkbtn" onClick={() => openToolLinked('relationship-map')}><Emoji e="🕸️" /> 관계도</button>
        <button className="linkbtn" onClick={() => openToolLinked('name-mixer', { genre: genreCtx })}><Emoji e="🔤" /> 이름 짓기</button>
      </div>

      <div style={{ fontSize: 11, color: toast ? 'var(--ok, #2e8b57)' : 'var(--muted)', minHeight: 14 }}>
        {toast || `${genreCtx} 전용 · 원형을 바꾸면 시그니처 무브·전투 스타일·이명 풀이 달라집니다. ‘결점·비밀/트라우마·물리적 대가·지고 다니는 것’으로 무손상 평면 영웅을 막으세요.`}
      </div>
    </div>
  )
}
