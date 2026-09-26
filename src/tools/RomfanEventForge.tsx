// 로맨스판타지(로판) 사건·소재 대형 생성기 — 로판 서사를 떠받치는 핵심 사건 요소들을 슬롯 조합으로 대량 생성한다.
//  회빙환 시발점 × 운명의 무대 × 만남의 계기 × 관계 구도(로판 트로프) × 여주의 무기 × 강제 밀착·고립 ×
//  심쿵 사건 × 고구마(갈등·음모) × 회귀/빙의 비밀 위기 × 사이다 정점(공개 망신 역전·공개 선택) × 정서 톤 —
//  열한 슬롯을 굴려 "어떤 비극에서 다시 시작해, 어떤 제국·신탁의 무대에서 만나고, 무엇이 둘을 묶고 설레게 하고
//  갈라놓고, 어떻게 끝내 운명을 비틀어 맺어지는가"를 한 편의 로판 사건 전개로 엮어 준다.
//  마음에 드는 슬롯은 🔒로 고정하고 나머지만 다시 굴린다. 조합 수 1조 이상(슬롯 전부 활성 기준)을 지향한다.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(보관함)만 사용. 외부 API 불필요.
// 연계(linkbus): 현재 로판 사건 전개를 자료('research')/'사건' 폴더 문서로 추가하고, 글감 스니펫 라이브러리에도 저장한다.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romfan-eventforge', name: '로판 사건 생성기', icon: '👑', group: '생성기', genre: '로맨스판타지', intro: '회빙환·무대·만남·트로프·여주의 무기·밀착·심쿵·고구마·비밀 위기·사이다·정서 톤을 굴려 한 편의 로판 사건 전개를 대량 생성', w: 600, h: 700 }

const LS = 'sry:tool:romfan-eventforge'

// ---- 슬롯 정의 ----
// 각 슬롯은 로판 사건 전개의 한 축. faces = 그 축의 로판 특화 후보(로컬 표). 도시에의 로판 서사 장치에 근거.
interface Slot { key: string; label: string; icon: string; desc: string; faces: string[] }

const SLOTS: Slot[] = [
  {
    key: 'origin', label: '회빙환 시발점', icon: '⏳', desc: '회귀·빙의·환생 — 이야기를 다시 시작하게 한 비극/계기',
    faces: [
      '처형대에서 목이 떨어지던 순간 결혼 전으로 회귀해',
      '폐비가 되어 유폐탑에서 죽은 뒤 첫 입궁날로 돌아와',
      '읽던 로판 속 처형당할 악역영애의 몸에 빙의해',
      '게임 속 멸망 엔딩의 조연 영애로 눈을 떠',
      '독살당한 황후가 간택 직전으로 회귀해',
      '전생의 기억을 품은 채 몰락 가문의 막내로 환생해',
      '소설 속 「반드시 죽는 단역」으로 빙의했음을 깨닫고',
      '약혼 파기·추방 직전 5년 전으로 회귀해',
      '여신의 변덕으로 죽기 직전의 시점에 되돌려져',
      '현대의 평범한 직장인이 황녀의 갓난아기 몸으로 환생해',
      '원작에서 남주 손에 죽는 악녀임을 알고 눈을 뜬 채',
      '불타 죽은 성녀가 신탁이 내리던 그날로 돌아와',
      '전쟁에서 모두를 잃고 십 년 전 평화로운 봄으로 회귀해',
      '읽다 만 소설의 결말을 모른 채 엑스트라 시녀로 빙의해',
      '버림받아 객사한 정실부인이 혼인 첫날밤으로 회귀해',
      '게임의 호감도 0 배드엔딩을 본 직후 튜토리얼로 돌아와',
      '저주로 한 번 죽은 뒤 저주가 걸리기 전으로 회귀해',
      '원작 여주 대신 죽을 운명의 친구 역에 빙의해',
      '계약 결혼 끝에 버림받고 계약서를 쓰기 전으로 회귀해',
      '신의 실수로 두 번째 삶을 얻은 멸문 가문의 딸로',
      '미래의 멸망을 예지몽으로 거듭 꾸는 황녀로 깨어나',
      '전생의 연인을 못 알아본 채 적국의 공녀로 환생해',
    ],
  },
  {
    key: 'stage', label: '운명의 무대', icon: '🏰', desc: '갈등과 로맨스가 펼쳐지는 로판 세계의 배경',
    faces: [
      '암투가 들끓는 서대륙 제국의 황궁에서',
      '작위와 가문 정치가 얽힌 사교계 무도회장에서',
      '신성력과 마나가 흐르는 마법 아카데미에서',
      '예언과 신탁이 다스리는 대신전에서',
      '후궁들의 총애 다툼이 벌어지는 동방 황실에서',
      '서출과 적자가 반목하는 대공가 영지에서',
      '몰락해가는 변경 백작가의 황폐한 성에서',
      '마탑주가 군림하는 고독한 마법사의 탑에서',
      '얼음꽃이 피는 북부 대공의 설원 영지에서',
      '전쟁의 불씨가 도사리는 두 왕국의 국경에서',
      '비밀 결사가 숨어든 황도의 뒷골목에서',
      '귀족 영애들이 모이는 황실 부속 기숙학교에서',
      '죽은 황제의 자리를 둘러싼 황태자 책봉식에서',
      '저주받은 가문의 봉인된 지하 서고에서',
      '정령과 계약하는 엘프들의 신비한 숲에서',
      '상단과 사업이 흥하는 자유 무역 도시에서',
      '검과 명예가 전부인 기사단 본부에서',
      '꽃이 흐드러진 황궁 온실과 다과회 자리에서',
      '신물(神物)이 잠든 고대 유적의 심층에서',
      '계급이 분명한 식민 항구의 총독부에서',
      '마수가 출몰하는 봉인된 결계 너머의 황무지에서',
      '눈먼 점성술사가 운영하는 별빛 천문대에서',
    ],
  },
  {
    key: 'meet', label: '만남의 계기', icon: '🌹', desc: '두 사람의 운명적·적대적 첫 조우',
    faces: [
      '파혼당하기 직전 무도회장에서 그가 손을 내밀며',
      '처형을 앞둔 그녀를 그가 사면하러 나타나며',
      '잘못 든 황궁 정원에서 정체 모를 그와 마주치며',
      '신탁의 「예언 속 그 아이」로 그 앞에 불려가며',
      '약혼자가 동생에게 빼앗긴 자리에서 대공이 손을 잡으며',
      '암살자의 칼을 그가 대신 막아주며',
      '몰락 가문의 빚 문제로 채권자인 그를 찾아가며',
      '아카데미 입학시험에서 라이벌로 부딪치며',
      '독에 쓰러진 그를 전생 지식으로 살려내며',
      '계약 결혼 제안서를 들고 그의 집무실에 들어서며',
      '마수에게 쫓기다 그의 결계 안으로 굴러들며',
      '연회에서 그의 와인잔에 독이 든 것을 알아채며',
      '버려진 신전에서 봉인된 그를 깨워버리며',
      '오라비의 친구로 어릴 적 첫인사를 나눈 사이로',
      '노예 시장에 팔려 나온 그를 사들이며',
      '황제가 하사한 정략 혼인의 상대로 처음 마주 앉으며',
      '가면무도회에서 정체를 모른 채 춤을 추며',
      '전생의 원수였던 그가 이번 생엔 은인으로 나타나며',
      '시한부 황녀인 그녀를 그가 치유사로서 찾아오며',
      '도망친 황녀를 호위 기사인 그가 붙잡으며',
      '경매장에서 같은 신물에 패를 들며',
      '비를 맞은 그를 황실 도서관에서 발견하며',
      '적국의 인질로 보내진 그를 마중하며',
      '꿈에서 본 예언 속 얼굴을 현실에서 마주치며',
    ],
  },
  {
    key: 'trope', label: '관계 구도', icon: '💘', desc: '두 사람을 묶는 로판 핵심 트로프',
    faces: [
      '냉혈한 황제가 그녀에게만 무너지는(only you)',
      '겉은 다정하나 속은 집착광공인 대공과',
      '계약 결혼이 진심으로 번지는 위장 부부로',
      '앙숙이던 라이벌에서 연인으로(enemies-to-lovers)',
      '버림받았다 후회하며 돌아온 그를 받아줄지 망설이는(후회물)',
      '원수 가문의 자식들이 금단의 사랑에 빠지는',
      '정략혼으로 묶인 쇼윈도 부부가 진짜가 되는',
      '연하의 충견 기사가 저돌적으로 직진하는',
      '원작 여주의 차지였던 남주가 그녀에게 기우는',
      '죽음을 아는 회귀자와 그를 살리려는 여주의',
      '서브남주(서브공)와 넘버원 남주 사이의 삼각관계',
      '구해준 은인과 구원받은 자의 헌신적 관계로',
      '신분 격차를 넘는 황제와 천출 여주의',
      '소꿉친구였던 그의 오랜 짝사랑이 닿는',
      '서로의 비밀(회귀·빙의)을 알아본 두 이방인의',
      '주종 계약으로 시작해 가족이 되어가는',
      '예언이 맺어준 성녀와 흑막의 위태로운 인연으로',
      '복수의 칼을 겨눈 상대가 사랑이 되어버린',
      '딸바보 보호자들과 어린 여주의 육아 로맨스로',
      '집착하는 그를 길들이며 주도권을 쥐는 여주의',
      '한쪽만 전생을 기억하는 엇갈린 재회의',
      '겉은 완벽하나 서로의 상처를 알아보는 두 사람의',
    ],
  },
  {
    key: 'weapon', label: '여주의 무기', icon: '🗝️', desc: '여주가 운명을 비트는 능력 — 주체성의 핵심',
    faces: [
      '미래(원작 결말)를 아는 정보 비대칭으로',
      '전생의 지식으로 일군 상단과 사업 수완으로',
      '아무도 못 쓰는 희귀 속성 마법으로',
      '죽은 자도 살리는 강대한 신성력으로',
      '정령왕과 맺은 계약의 힘으로',
      '독과 약을 꿰뚫는 전생의 의약 지식으로',
      '정치판을 읽고 패를 짜는 책략으로',
      '예언을 해석하는 점성·신탁의 통찰로',
      '검술과 무예로 직접 적을 베는 강함으로',
      '사람의 마음을 사는 화술과 평판 관리로',
      '현대의 요리·디저트·향수 지식으로 부와 명성을 얻어',
      '숨겨진 고대 혈통이 깨운 봉인된 힘으로',
      '호감도·상태창을 읽는 시스템의 눈으로',
      '잊힌 가문의 비밀과 약점을 쥐고서',
      '회귀 전 인맥과 은밀한 정보망으로',
      '짐승·마수와 교감하는 희귀한 능력으로',
      '거짓을 간파하는 진실의 눈으로',
      '한 번 본 것은 잊지 않는 완벽한 기억으로',
      '계약서와 법의 허점을 파고드는 영리함으로',
      '신물(神物)을 다루는 선택받은 자격으로',
      '시간을 되감는 회귀 그 자체를 무기 삼아',
      '몰락 영지를 부흥시키는 경영의 재능으로',
    ],
  },
  {
    key: 'proximity', label: '강제 밀착·고립', icon: '🛏️', desc: '두 사람을 물리적으로 묶는 장치',
    faces: [
      '눈보라에 발이 묶인 북부 대공의 성에 단둘이',
      '정략혼으로 한 침소를 쓰게 되어',
      '위장 부부로 한 저택에 살게 되어',
      '마수에 포위된 결계 안에 밤새 갇혀',
      '봉인 의식을 위해 한방에서 손을 맞잡아야 해서',
      '암살 위협으로 그의 보호 아래 24시간 붙어',
      '아카데미 같은 기숙사 옆방에 배정되어',
      '도피 중 한 마차에 몸을 싣고 국경을 넘어',
      '저주를 막으려 매일 밤 그의 곁을 지켜야 해서',
      '인질로 적국 황궁에 함께 머물며',
      '신탁이 둘을 「운명의 짝」으로 묶어 동행시켜',
      '외딴 별궁에 유폐되어 그와 단둘이',
      '계약상 한 지붕 아래 한 해를 살아야 해서',
      '폐쇄된 고대 유적에 조사단으로 함께 갇혀',
      '경호 대상과 호위 기사로 그림자처럼 붙어',
      '단 하나뿐인 마차 안에서 폭우를 함께 피하며',
      '결혼 준비를 핑계로 매일 다과회에서 마주 앉아',
      '한 척의 표류선에 둘만 남아',
      '서로의 마력을 나눠야 살 수 있는 공명 상태로 묶여',
      '몰락한 영지를 함께 떠맡아 재건하며',
      '연회 내내 가짜 약혼자로 팔짱을 끼고서',
      '정원 온실에 갇혀 밤이 새도록',
    ],
  },
  {
    key: 'spark', label: '심쿵 사건', icon: '✨', desc: '케미를 점화하는 설렘 포인트(신체 반응 클로즈업)',
    faces: [
      '쓰러지는 그녀를 그가 공주님 안기로 받아 안으며',
      '벽으로 몰아세우며 "도망치지 마"라 속삭이며',
      '차가운 줄 알았던 그의 손끝에서 온기가 전해지며',
      '입맞춤 직전 누군가 들이닥쳐 미뤄진(near-kiss)',
      '비를 맞은 그녀에게 말없이 외투를 덮어주며',
      '무도회에서 모두를 제치고 그가 첫 춤을 청하며',
      '독에 쓰러진 그를 밤새 간호하다 잠든 머리맡에서',
      '"내 것"이라 낮게 으르렁대며 손목을 끌어당기며',
      '상처를 소독해주는 그의 조심스러운 손길에',
      '귓가에 비밀을 속삭이는 숨결이 닿으며',
      '질투에 못 이긴 그가 충동적으로 끌어안으며',
      '신탁의 의식에서 둘의 이마가 맞닿으며',
      '드레스 단추·코르사주를 채워주다 멎은 손과 눈맞춤',
      '취한 그를 업고 걸은 황궁의 새벽 회랑에서',
      '위험에서 끌어당겨 품에 가둔 찰나',
      '"좋아한다"는 말이 회귀 전 습관처럼 입 밖으로 새어',
      '폭죽이 터지는 황실 연회의 발코니에서 맞잡은 손',
      '그의 망토 자락 안으로 끌려 들어가 비를 피하며',
      '열에 들뜬 그가 그녀의 이름만을 부르며 매달리며',
      '검을 겨누던 손이 그녀의 뺨을 감싸는 손으로 바뀌며',
      '둘만 아는 미래의 농담에 동시에 터진 웃음',
      '말 위에 함께 올라 허리를 감싸 안긴 채 달리며',
    ],
  },
  {
    key: 'sugar', label: '고구마·음모', icon: '🍠', desc: '여주를 옥죄는 모욕·억울함·정치 음모(짧게, 청산 전제)',
    faces: [
      '동생이 약혼자와 평판을 가로채 모함하고',
      '계모와 이복형제가 가산과 명예를 빼앗으려 들고',
      '연적 영애가 사교계에 거짓 추문을 퍼뜨리고',
      '황후가 누명을 씌워 그녀를 폐위로 몰아가고',
      '원작 강제력이 그녀를 정해진 파멸로 떠밀고',
      '가문이 정략혼으로 그녀를 노골적으로 팔아넘기고',
      '서출이라는 이유로 만인 앞에서 무시당하고',
      '"천한 출신"이라며 사교계가 그녀를 따돌리고',
      '독을 탔다는 누명으로 재판정에 끌려가고',
      '신전이 그녀의 신성력을 가짜라 단죄하려 들고',
      '회귀 전의 배신자가 다시 다정한 척 접근해오고',
      '귀족 의회가 영지를 빌미로 그녀를 압박하고',
      '연적이 남주의 약혼 발표를 그녀 앞에서 강행하고',
      '뒤바뀐 증거로 도둑 누명을 뒤집어쓰고',
      '예언이 그녀를 「제국을 멸할 재앙」으로 지목하고',
      '믿었던 시녀가 적의 첩자였음이 드러나고',
      '아버지가 가문을 위해 그녀의 공을 동생에게 돌리고',
      '정혼자가 보는 앞에서 그녀를 공개적으로 모욕하고',
      '황태자가 그녀를 인질이자 흥정 카드로 취급하고',
      '거짓 유언장으로 상속에서 밀려나고',
      '라이벌 가문이 영지민을 선동해 그녀를 매도하고',
      '신물의 주인 자격을 빼앗으려는 음모에 휘말리고',
    ],
  },
  {
    key: 'secret', label: '비밀 위기', icon: '🎭', desc: '회귀·빙의·정체 비밀이 들킬 위기, 또는 갈등 오해',
    faces: [
      '회귀자라는 사실이 그에게 들킬 위기에 처해',
      '소설 속에서 그가 죽는 결말을 그가 알아채려 해',
      '빙의한 「가짜」임이 신탁으로 폭로될 위기에',
      '숨겨둔 고대 혈통이 적의 손에 발각되려 해',
      '"널 이용했을 뿐"이라는 거짓말을 그가 믿어버려',
      '연적과 다정히 있는 장면을 그가 오해해',
      '그를 살리려 둔 패가 배신으로 비쳐',
      '미래를 안다는 사실이 「예지의 마녀」로 몰려',
      '계약 결혼이었다는 진실이 그의 귀에 들어가',
      '죽을 운명을 숨기려다 거짓말이 눈덩이처럼 불어',
      '전생의 정체가 가장 나쁜 타이밍에 드러나려 해',
      '그가 원작 결말대로 그녀를 죽이려던 손을 멈추며',
      '엿들은 대화의 앞뒤가 잘려 진심이 어긋나',
      '구해준 은인이 사실 전생의 원수였음이 밝혀져',
      '대신 전한 마음이 다른 사람의 것으로 오해되어',
      '"사랑하지 않는다"는 거짓으로 그를 밀어내며',
      '시한부라는 비밀을 끝까지 삼키려다',
      '신성력이 사실 저주의 힘이라는 의심을 사',
      '회귀 전 그가 저지른 죄를 그녀만 안다는 긴장 속에',
      '쌍둥이·대역의 존재가 진심을 흐려',
      '상태창·시스템을 본다는 비밀이 광기로 오해되어',
      '예언서의 한 구절이 둘의 파국을 정해두고 있어',
    ],
  },
  {
    key: 'cider', label: '사이다 정점', icon: '⚡', desc: 'Public Reckoning · 공개 망신 역전과 공개 선택(클라이맥스)',
    faces: [
      '만조백관 앞에서 악역의 죄가 폭로되고 그녀가 공인받으며',
      '무도회 한복판에서 모함의 증거를 뒤집어 보이며',
      '황제가 만인 앞에서 그녀를 황후로 지목하며',
      '재판정에서 누명을 벗고 진범을 단죄하며',
      '연적의 약혼식장에 그가 뛰어들어 그녀를 택하며',
      '신분과 왕위를 내던지고 그녀 곁에 남기로 선언하며',
      '신탁이 그녀를 「진짜 성녀」로 공표하며',
      '원작대로면 죽었을 그녀가 정반대로 제관을 쓰며',
      '몰락했던 가문이 그녀의 손에 사교계 정점으로 부활하며',
      '그를 죽이려던 음모를 미래 지식으로 역이용해 분쇄하며',
      '집안의 반대를 정면으로 거스르고 그가 데리러 와',
      '독을 탄 진범이 제 덫에 걸려 자멸하며',
      '의회 앞에서 영지 부흥의 성과로 모두를 침묵시키며',
      '그가 권력으로 그녀를 위협하던 자들을 모조리 막아서며',
      '예언을 비틀어 「재앙」이 「구원」으로 뒤바뀌며',
      '회귀 전 배신자들에게 인과의 정산을 똑똑히 치르며',
      '가면을 벗고 숨겨온 정체를 당당히 드러내며',
      '죽음의 문턱에서 그가 목숨을 걸고 그녀를 끌어내며',
      '비밀(회귀·빙의)을 안 그가 거부 대신 더 깊이 끌어안으며',
      '세상에 둘의 관계를 당당히 선언하고 손을 잡고 걸어 나가며',
      '신물(神物)이 그녀를 주인으로 인정해 적을 굴복시키며',
      '"내 사람을 건드린 대가"라며 그가 적가문을 무너뜨리며',
    ],
  },
  {
    key: 'tone', label: '정서 톤', icon: '🎼', desc: '점화 속도와 색채가 빚는 로판 전체 분위기',
    faces: [
      '고구마는 짧고 사이다는 확실한 통쾌함으로',
      '슬로우번의 애틋한 갈망(yearning)으로',
      '집착과 독점욕이 짙은 다크로판의 색채로',
      '딸바보·힐링이 가득한 따뜻한 결로',
      '후회와 속죄가 뒤섞인 묵직한 후회물의 무게로',
      '톡톡 튀는 밀당과 유쾌한 로맨틱 코미디로',
      '회귀의 비극을 알면서 다시 사랑하는 애절함으로',
      '제국 정치와 음모가 얽힌 대하 서사의 결로',
      '신데렐라 신분 상승의 벅찬 환상으로',
      '복수와 응징이 통쾌한 사이다 서사로',
      '신탁과 예언이 감도는 운명적이고 신비로운 결로',
      '경영·사업으로 일어서는 성장 사이다로',
      '아슬아슬한 금기와 위태로운 설렘으로',
      '서로를 치유해가는 잔잔한 회복의 정서로',
      '계약이 진심으로 번지는 간질간질한 설렘으로',
      '질투와 자각이 교차하는 팽팽한 긴장으로',
      '담담하나 묵직한 어른들의 정략 로맨스로',
      '꽃받침 미남들에게 떠받들리는 역하렘의 화사함으로',
      '버려진 출신이 고귀함을 되찾는 반전의 카타르시스로',
      '절제된 고백과 시적인 여백으로',
    ],
  },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

// 천 단위 콤마(한국어 로캘)
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 큰 수를 '약 N조/억' 한국어로 가독화(조합 수 강조용)
function bigKo(n: number): string {
  if (n >= 1e16) return '약 ' + (n / 1e16).toFixed(n >= 1e17 ? 0 : 1).replace(/\.0$/, '') + '경'
  if (n >= 1e12) return '약 ' + (n / 1e12).toFixed(n >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조'
  if (n >= 1e8) return '약 ' + (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억'
  if (n >= 1e4) return '약 ' + Math.round(n / 1e4) + '만'
  return fmt(n)
}

// 활성 슬롯들의 조합 가짓수.
function comboCount(activeKeys: string[]): number {
  return activeKeys.reduce((acc, k) => {
    const s = SLOTS.find((x) => x.key === k)
    return acc * (s ? s.faces.length : 1)
  }, 1)
}
// 전 슬롯 활성 시 총 조합(메타 표기용) — 1조 이상 지향.
const TOTAL_COMBOS = SLOTS.reduce((a, s) => a * s.faces.length, 1)

// 굴린 결과들을 자연스러운 로판 사건 전개 단락으로 엮는다(의미 단위로 조립).
function compose(by: Record<string, string>): string {
  const { origin, stage, meet, trope, weapon, proximity, spark, sugar, secret, cider, tone } = by
  const parts: string[] = []
  // 1) 회빙환 시발점 + 무대
  if (origin && stage) parts.push(`${origin} ${stage} 새 삶이 시작된다`)
  else if (origin) parts.push(`${origin} 새 삶이 시작된다`)
  else if (stage) parts.push(`이야기는 ${stage} 펼쳐진다`)
  // 2) 만남 + 관계 구도
  if (meet && trope) parts.push(`${meet} 두 사람은 ${trope} 사이가 된다`)
  else if (meet) parts.push(`${meet} 두 사람이 처음 만난다`)
  else if (trope) parts.push(`두 사람은 ${trope} 사이다`)
  // 3) 여주의 무기
  if (weapon) parts.push(`그녀는 ${weapon} 운명에 맞선다`)
  // 4) 강제 밀착·고립
  if (proximity) parts.push(`${proximity} 거리가 좁혀지고`)
  // 5) 심쿵 사건
  if (spark) parts.push(`${spark} 마음이 흔들린다`)
  // 6) 고구마·음모
  if (sugar) parts.push(`그러나 ${sugar} 그녀를 옥죈다`)
  // 7) 비밀 위기
  if (secret) parts.push(`설상가상 ${secret} 관계가 위태로워진다`)
  // 8) 사이다 정점
  if (cider) parts.push(`마침내 ${cider} 운명이 뒤집힌다`)
  // 9) 정서 톤(마무리 결)
  if (tone) parts.push(`이 모든 사건은 ${tone} 그려진다`)
  if (!parts.length) return ''
  return parts.map((p) => p.replace(/[.。]$/, '')).join('. ') + '.'
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Saved { id: string; text: string; note: string; slots: string; rows: string; tone: string; trope: string }

export default function RomfanEventForge({ payload }: { payload?: Record<string, unknown> }) {
  // 활성 슬롯(기본 전부) — 저장/복원
  const [active, setActive] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':active')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          const valid = arr.filter((k: string) => SLOTS.some((s) => s.key === k))
          if (valid.length) return valid
        }
      }
    } catch { /* ignore */ }
    return SLOTS.map((s) => s.key)
  })
  const [results, setResults] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)

  // 보관함 — 저장/복원
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s, i) => ({
            id: typeof s.id === 'string' ? s.id : 'sv_' + i,
            text: String(s.text),
            note: typeof s.note === 'string' ? s.note : '',
            slots: typeof s.slots === 'string' ? s.slots : '',
            rows: typeof s.rows === 'string' ? s.rows : '',
            tone: typeof s.tone === 'string' ? s.tone : '',
            trope: typeof s.trope === 'string' ? s.trope : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [toast, setToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 페이로드로 슬롯 프리셋이 넘어오면 적용(연계 진입). 1회.
  useEffect(() => {
    const want = payload?.slots
    if (Array.isArray(want)) {
      const valid = want.filter((k): k is string => typeof k === 'string' && SLOTS.some((s) => s.key === k))
      if (valid.length) setActive(SLOTS.filter((s) => valid.includes(s.key)).map((s) => s.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장
  useEffect(() => { try { localStorage.setItem(LS + ':active', JSON.stringify(active)) } catch { /* ignore */ } }, [active])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 비활성 슬롯의 결과/잠금 정리
  useEffect(() => {
    setResults((prev) => {
      const next: Record<string, string> = {}
      active.forEach((k) => { if (prev[k]) next[k] = prev[k] })
      return next
    })
    setLocked((prev) => {
      const next: Record<string, boolean> = {}
      active.forEach((k) => { if (prev[k]) next[k] = true })
      return next
    })
  }, [active])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 320)
    return () => window.clearTimeout(t)
  }, [rolling])

  // 복사/토스트 피드백 정리(언마운트 포함)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1800)
    return () => window.clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!copiedKey) return
    const t = window.setTimeout(() => { if (mounted.current) setCopiedKey('') }, 1500)
    return () => window.clearTimeout(t)
  }, [copiedKey])

  const toggleSlot = (key: string) => {
    setActive((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개
        return prev.filter((k) => k !== key)
      }
      return SLOTS.filter((s) => prev.includes(s.key) || s.key === key).map((s) => s.key)
    })
  }

  const forge = useCallback(() => {
    const my = ++nonce.current
    setRolling(true)
    setResults((prev) => {
      if (my !== nonce.current) return prev
      const next: Record<string, string> = { ...prev }
      active.forEach((k) => {
        if (locked[k] && prev[k]) return // 잠긴 슬롯 유지
        const slot = SLOTS.find((s) => s.key === k)
        if (!slot) return
        let f = pick(slot.faces)
        if (f === prev[k] && slot.faces.length > 1) f = pick(slot.faces) // 연속 중복 완화
        next[k] = f
      })
      return next
    })
  }, [active, locked])

  const toggleLock = (key: string) => setLocked((prev) => ({ ...prev, [key]: !prev[key] }))
  const lockAll = () => setLocked(() => { const n: Record<string, boolean> = {}; active.forEach((k) => { if (results[k]) n[k] = true }); return n })
  const unlockAll = () => setLocked({})

  const rolledList = active
    .map((k) => ({ slot: SLOTS.find((s) => s.key === k)!, face: results[k] }))
    .filter((r) => r.slot && r.face) as { slot: Slot; face: string }[]

  const hasResults = rolledList.length > 0
  const byKey: Record<string, string> = {}
  rolledList.forEach((r) => { byKey[r.slot.key] = r.face })
  const story = hasResults ? compose(byKey) : ''
  const combos = comboCount(active)
  const slotLabelLine = active.map((k) => SLOTS.find((s) => s.key === k)?.label || k).join('·')
  const rowsText = () => rolledList.map((r) => `${r.slot.icon} ${r.slot.label}: ${r.face}`).join('\n')

  const saveCurrent = () => {
    if (!hasResults) return
    setSaved((prev) => {
      if (prev.some((s) => s.text === story)) { setToast('이미 보관함에 있습니다.'); return prev }
      const rec: Saved = {
        id: 'sv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36),
        text: story,
        note: '',
        slots: slotLabelLine,
        rows: rowsText(),
        tone: byKey.tone || '',
        trope: byKey.trope || '',
      }
      setToast('보관함에 저장했습니다.')
      return [rec, ...prev]
    })
  }

  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))
  const setNote = (id: string, note: string) => setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copy = (key: string, text: string) => {
    const done = () => { if (mounted.current) setCopiedKey(key) }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)) }
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

  // 프로젝트 본문(HTML) — 완성 전개 + 슬롯별 분해.
  const bodyHtmlFor = (text: string, rows: string, slots: string) => {
    const rowLines = rows
      ? rows.split('\n').filter(Boolean).map((ln) => `<p>${escHtml(ln)}</p>`).join('')
      : ''
    return [
      `<p style="font-size:15px;line-height:1.8;"><b>${escHtml(text)}</b></p>`,
      `<hr/>`,
      slots ? `<p><b>슬롯 조합:</b> ${escHtml(slots)}</p>` : '',
      rowLines,
    ].join('')
  }

  // 프로젝트 연동 — 현재 로판 사건 전개를 자료(research)/'사건' 폴더에 문서로 추가.
  const addStoryToProject = () => {
    if (!hasResults) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '사건',
      title: `👑 로판 사건 — ${story.slice(0, 26)}${story.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(story, rowsText(), slotLabelLine),
      synopsis: story,
      meta: { 장르: '로맨스판타지', 트로프: byKey.trope || '—', 정서: byKey.tone || '—', 회빙환: byKey.origin || '—', 사이다: byKey.cider || '—' },
    })
    setToast(id ? '프로젝트 자료 〈사건〉 폴더에 로판 전개를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // 스니펫 저장 — 글감 라이브러리에 로판 전개를 스니펫으로 추가(여러 도구가 공유).
  const saveSnippet = (text: string, slots: string) => {
    if (!text) return
    addToLibrary('snippets', {
      text: `[로판 사건] ${text}`,
      source: '로판 사건 생성기',
      tags: ['글감', '사건', '로맨스판타지', '로판', ...slots.split('·').filter(Boolean)],
    })
    setToast('글감 스니펫 라이브러리에 저장했습니다.')
  }

  // 보관 항목 하나를 프로젝트에 추가
  const addSavedToProject = (s: Saved) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사건',
      title: `👑 로판 사건 — ${s.text.slice(0, 26)}${s.text.length > 26 ? '…' : ''}`,
      bodyHtml: bodyHtmlFor(s.text, s.rows, s.slots) + (s.note ? `<p style="color:#888;">📝 ${escHtml(s.note)}</p>` : ''),
      synopsis: s.text,
      meta: { 장르: '로맨스판타지', 트로프: s.trope || '—', 정서: s.tone || '—' },
    })
    setToast(id ? '프로젝트 〈사건〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>회빙환·무대·만남·트로프·여주의 무기·밀착·심쿵·고구마·비밀 위기·사이다·정서 톤</b> 열한 슬롯을 굴리면 한 편의 <b>로판 사건 전개</b>가 엮입니다. 마음에 드는 슬롯은 <Emoji e="🔒" />로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="👑" /> 생성
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'forge' && (
        <>
          {/* 슬롯 선택 */}
          <div style={chipRow}>
            {SLOTS.map((s) => {
              const on = active.includes(s.key)
              return (
                <button key={s.key} className="minibtn" onClick={() => toggleSlot(s.key)} aria-pressed={on}
                  title={s.desc}
                  style={{ opacity: on ? 1 : 0.5, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={s.icon} /> {s.label}{on ? '' : ' +'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)' }}>
            <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(combos)}</b>가지 <b style={{ color: 'var(--accent)' }}>({bigKo(combos)})</b></span>
            <span style={{ marginLeft: 'auto' }}>전 슬롯 시 {bigKo(TOTAL_COMBOS)} 이상</span>
          </div>

          {/* 슬롯별 굴림 결과 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {active.map((k) => {
              const slot = SLOTS.find((s) => s.key === k)!
              const face = results[k]
              const isLocked = !!locked[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 22, width: 28, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-12deg) scale(1.15)' : 'none' }}>
                    <Emoji e={slot.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot.label} <span style={{ opacity: 0.7 }}>· {slot.faces.length}종</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: face ? 'var(--text)' : 'var(--muted)' }}>
                      {face ? (rolling && !isLocked ? '…' : face) : '— 굴려주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => copy('row-' + k, face || '')} disabled={!face} title="이 항목 복사"
                    style={{ flexShrink: 0 }}>{copiedKey === 'row-' + k ? '✓' : <Emoji e="📋" />}</button>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                    style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 완성 로판 사건 전개 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="👑" /> 로판 사건 전개</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hasResults ? 'var(--text)' : 'var(--muted)' }}>
              {story || '슬롯을 골라 굴리면, 한 편의 로판 사건 전개가 만들어집니다.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={forge}><Emoji e="👑" /> 생성 / 다시 굴리기</button>
            <button className="minibtn" onClick={lockAll} disabled={!hasResults} title="현재 결과 전부 고정"><Emoji e="🔒" /> 전체</button>
            <button className="minibtn" onClick={unlockAll} title="고정 전부 해제"><Emoji e="🔓" /> 해제</button>
            <button className="minibtn" onClick={() => copy('story', `${story}\n\n${rowsText()}`)} disabled={!hasResults}>
              {copiedKey === 'story' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
            </button>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasResults}><Emoji e="⭐" /> 보관</button>
            <button className="minibtn" onClick={() => saveSnippet(story, slotLabelLine)} disabled={!hasResults} title="글감 스니펫 라이브러리에 저장"><Emoji e="✂️" /> 스니펫</button>
          </div>

          {/* 프로젝트·도구 연계 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={addStoryToProject} disabled={!hasResults || !hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : !hasResults ? '먼저 로판 사건을 굴려주세요' : '현재 로판 사건 전개를 프로젝트 자료 〈사건〉 폴더에 문서로 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '로맨스판타지' })} title="이 사건의 두 주인공을 만들러"><Emoji e="🧬" /> 캐릭터 생성기</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '로맨스판타지' })} title="반전 카드로 사건을 비틀어"><Emoji e="🃏" /> 반전 카드덱</button>
          </div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 로판 사건이 없습니다.<br />
              <span style={{ fontSize: 12 }}>생성 탭에서 <Emoji e="⭐" /> 보관을 눌러 마음에 드는 전개를 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 'sv' + s.id
            return (
              <div key={s.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.trope && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}><Emoji e="💘" /> {s.trope}</span>}
                  {s.tone && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}><Emoji e="🎼" /> {s.tone}</span>}
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copy(k, s.text + (s.rows ? `\n\n${s.rows}` : '') + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copiedKey === k ? '✓' : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet(s.text, s.slots)} title="스니펫 라이브러리에 저장"><Emoji e="✂️" /></button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7 }}>{s.text}</div>
                {s.rows && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.rows}</div>
                )}
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 사건을 어느 인물·회차·국면(고구마/사이다)에 쓸지 메모…"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
                <div className="linkbar">
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => addSavedToProject(s)} disabled={!hasProjectBridge()}
                    title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 로판 사건을 프로젝트 자료 〈사건〉 폴더에 추가'}>
                    <Emoji e="📄" /> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>사건 전개는 출발점일 뿐입니다. 고구마는 짧게·사이다는 확실히, HEA(해피엔딩)의 약속을 잊지 말고, 같은 조합도 내 인물·관계·세계에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
