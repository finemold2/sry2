// 호러 시놉시스 빌더 — 호러·공포 장르 관습(5단 구조·드레드·규칙·off-screen·열린 결말)에 맞춰
//  슬롯 풀에서 항목을 뽑아 한 편의 시놉시스로 자동 종합한다.
//  · 하위유형(고딕/포크/슬래셔/바디/오컬트/우주적/사이코…)을 고르면 그 결에 맞는 결과를 우선 추천.
//  · 슬롯별 잠금(🔒)+재생성(🎲), 전체 재생성, 조합수 표시(수백억 이상).
//  · 완성 시놉시스 복사 / 스니펫 라이브러리 저장 / 프로젝트 자료 〈기획/시놉시스〉 폴더에 추가 / 관련 도구 열기.
// 규칙: react 와 './linkbus' 외 import 금지. 외부 네트워크·라이브러리 없음. 언마운트 시 타이머 정리.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'horror-synopsis', name: '호러 시놉시스 빌더', icon: '🩸', group: '구조', genre: '호러·공포', intro: '공포 장르 관습대로 슬롯을 채워 한 편의 시놉시스를 자동 종합', w: 560, h: 700 }

const LS = 'sry:tool:horror-synopsis'

// ── 하위유형(분위기 필터) ───────────────────────────────────────────────
// 각 슬롯 풀에 tags 를 달아, 선택한 하위유형과 겹치는 항목을 우선 추천한다.
interface SubType { key: string; name: string; icon: string; blurb: string }
const SUBTYPES: SubType[] = [
  { key: 'all', name: '무작위(전 유형)', icon: '🎲', blurb: '모든 풀에서 자유롭게 뽑습니다.' },
  { key: 'gothic', name: '유령·고딕', icon: '🏚️', blurb: '비극을 품은 집·저택, 끈질긴 원혼, 과거가 곧 공포의 근원.' },
  { key: 'folk', name: '포크 호러', icon: '🌾', blurb: '외부인을 적대하는 폐쇄 공동체, 이교 의식·인신공양, 친절함이 더 무섭다.' },
  { key: 'slasher', name: '슬래셔', icon: '🔪', blurb: '가면 살인마, 하나씩 줄어드는 생존자, 마지막에 맞서는 final girl.' },
  { key: 'body', name: '바디 호러', icon: '🧬', blurb: '감염·기생·변형, 내 몸이 나를 배신하는 자아 상실의 공포.' },
  { key: 'occult', name: '악마·오컬트', icon: '🕯️', blurb: '빙의·엑소시즘·사이비·흑마술, 금지된 계약과 그 대가.' },
  { key: 'cosmic', name: '우주적 공포', icon: '🐙', blurb: '인간의 이해를 넘어선 존재, 알아버린 자의 파멸, 무력함.' },
  { key: 'psych', name: '사이코로지컬', icon: '🪞', blurb: '내면 붕괴·편집증, 초자연인가 광기인가, 신뢰할 수 없는 화자.' },
  { key: 'survival', name: '서바이벌·아포칼립스', icon: '☣️', blurb: '감염 확산·격리·생존, 인간이 더 무서워지는 폐허.' },
  { key: 'creature', name: '크리처·괴물', icon: '👹', blurb: '보이지 않다 드러나는 포식자, 규칙과 약점, off-screen의 미학.' },
]

// ── 슬롯 정의 ──────────────────────────────────────────────────────────
interface Opt { t: string; tags: string[] }   // t: 문구, tags: 어울리는 하위유형들
interface Slot {
  key: string; label: string; icon: string
  guide: string                  // 이 슬롯이 시놉시스에서 맡는 역할(도시에 근거)
  pool: Opt[]
}

// 태그 약어: g고딕 f포크 s슬래셔 b바디 o오컬트 c우주 p사이코 v서바이벌 r크리처
const SLOTS: Slot[] = [
  {
    key: 'setting', label: '무대(고립 공간)', icon: '🏚️',
    guide: '탈출 불가의 폐쇄·고립 공간. 호러에서 공간은 가장 중요한 장치이며 종종 인격화된다.',
    pool: [
      { t: '폭설로 외부와 끊긴 산속 펜션', tags: ['gothic', 'slasher', 'psych'] },
      { t: '안개에 잠긴 외딴 섬의 폐교', tags: ['gothic', 'folk', 'cosmic'] },
      { t: '재개발로 모두 떠난 낡은 연립주택', tags: ['gothic', 'psych'] },
      { t: '바다 한가운데 버려진 등대', tags: ['gothic', 'cosmic', 'psych'] },
      { t: '통신이 끊긴 심해 시추선', tags: ['cosmic', 'body', 'creature'] },
      { t: '외지인을 꺼리는 두메산골 마을', tags: ['folk', 'occult'] },
      { t: '대대로 한 가문이 살아온 산중 종택', tags: ['gothic', 'occult', 'folk'] },
      { t: '엘리베이터가 멈춘 정전된 고층 오피스텔', tags: ['psych', 'creature', 'survival'] },
      { t: '환자가 사라진 폐병원 별관', tags: ['gothic', 'body', 'psych'] },
      { t: '한 번 들어가면 길이 바뀌는 거대 지하주차장', tags: ['psych', 'cosmic'] },
      { t: '눈보라에 갇힌 국도변 외딴 휴게소', tags: ['slasher', 'survival', 'creature'] },
      { t: '봉인된 신당을 품은 옛 무가(巫家)', tags: ['occult', 'folk', 'gothic'] },
      { t: '격리 해제가 미뤄지는 폐쇄 병동', tags: ['survival', 'body', 'psych'] },
      { t: '관광객이 끊긴 비수기의 온천 료칸', tags: ['gothic', 'psych', 'folk'] },
      { t: '지도에 없는 깊은 산속 수목장 묘원', tags: ['folk', 'gothic', 'cosmic'] },
      { t: '대피령이 내린 텅 빈 신도시 아파트 단지', tags: ['survival', 'creature', 'psych'] },
      { t: '폐갱이 즐비한 폐광촌의 사택', tags: ['folk', 'cosmic', 'creature'] },
      { t: '문이 안에서만 잠기는 24시간 무인 독서실', tags: ['psych', 'creature'] },
      { t: '강이 범람해 다리가 끊긴 저지대 농막', tags: ['survival', 'folk', 'gothic'] },
      { t: '회진이 멈춘 산속 폐요양원', tags: ['gothic', 'body', 'psych'] },
      { t: '신도만 드나드는 깊은 숲속 기도원', tags: ['occult', 'folk', 'cosmic'] },
      { t: '폐장한 채 겨울을 나는 산정 케이블카 종착역', tags: ['creature', 'survival', 'psych'] },
    ],
  },
  {
    key: 'trigger', label: '발단(이곳에 온 까닭)', icon: '🚪',
    guide: '주인공이 하필 이 공간으로 들어서게 된 그럴듯한 계기. 일상에서 공포의 무대로 넘어가는 첫 동력이 된다(5단 중 1단).',
    pool: [
      { t: '헐값에 나온 매물에 끌려', tags: ['gothic', 'psych', 'occult'] },
      { t: '연락이 끊긴 가족을 찾으려고', tags: ['gothic', 'slasher', 'survival'] },
      { t: '단 하룻밤 묵어가려던 것이', tags: ['slasher', 'creature', 'psych'] },
      { t: '오래된 빚을 갚으러 내려왔다가', tags: ['folk', 'gothic', 'occult'] },
      { t: '취재 한 건만 마치려던 길에', tags: ['folk', 'cosmic', 'survival'] },
      { t: '요양 삼아 잠시 머물기로 하고', tags: ['gothic', 'psych', 'body'] },
      { t: '돈이 급해 떠맡은 일자리 탓에', tags: ['gothic', 'body', 'occult'] },
      { t: '폭우를 피해 잠시 들어선 것이', tags: ['survival', 'creature', 'gothic'] },
      { t: '상속받은 옛집을 정리하러 왔다가', tags: ['gothic', 'occult', 'folk'] },
      { t: '실종 사건의 진상을 좇다 보니', tags: ['slasher', 'psych', 'cosmic'] },
    ],
  },
  {
    key: 'protagonist', label: '취약한 주인공', icon: '🧑',
    guide: '무력하거나 고립된 인물. 독자가 "내가 저 상황이면"을 상상하며 이입해야 공포가 작동한다.',
    pool: [
      { t: '불면증에 시달리는 야간 경비원', tags: ['psych', 'creature', 'gothic'] },
      { t: '청력을 잃어가는 음향 기사', tags: ['psych', 'creature'] },
      { t: '신내림을 거부한 무당의 손녀', tags: ['occult', 'folk', 'gothic'] },
      { t: '취재차 마을에 든 시사 다큐 PD', tags: ['folk', 'cosmic', 'survival'] },
      { t: '실종된 동생을 찾아온 복학생', tags: ['gothic', 'slasher', 'psych'] },
      { t: '말을 잃은 채 입양된 아홉 살 아이', tags: ['gothic', 'occult', 'psych'] },
      { t: '기억이 띄엄띄엄 끊기는 알코올 의존자', tags: ['psych', 'gothic'] },
      { t: '임신 8개월의 신혼부부 중 아내', tags: ['gothic', 'occult', 'body'] },
      { t: '말기 진단을 받고 요양 온 화가', tags: ['gothic', 'cosmic', 'psych'] },
      { t: '봉사활동 온 간호대 실습생', tags: ['body', 'survival', 'slasher'] },
      { t: '폐가 철거를 맡은 일용직 인부', tags: ['gothic', 'occult'] },
      { t: '괴담을 좇는 호러 유튜버', tags: ['slasher', 'folk', 'creature'] },
      { t: '아무도 믿어주지 않는 정신과 입원 환자', tags: ['psych', 'occult'] },
      { t: '교대 근무에 지친 응급실 인턴', tags: ['body', 'survival', 'psych'] },
      { t: '귀향한 전직 형사', tags: ['slasher', 'folk', 'gothic'] },
      { t: '시신을 닦는 신참 장례지도사', tags: ['gothic', 'body', 'occult'] },
      { t: '폐선 직전 노선의 막차 버스 기사', tags: ['psych', 'creature', 'gothic'] },
      { t: '온라인으로만 소통하는 은둔형 번역가', tags: ['psych', 'cosmic', 'creature'] },
      { t: '홀로 야간 당직을 서는 시골 약사', tags: ['gothic', 'body', 'psych'] },
      { t: '폐가만 골라 찍는 도시탐험 사진가', tags: ['gothic', 'creature', 'slasher'] },
      { t: '집안의 가업을 물려받기 싫던 막내딸', tags: ['folk', 'occult', 'gothic'] },
      { t: '제대를 앞두고 산속 초소를 지키는 병사', tags: ['creature', 'survival', 'psych'] },
    ],
  },
  {
    key: 'threat', label: '위협(괴물·존재)', icon: '👁️',
    guide: '끝까지 다 보여주지 않는 off-screen의 존재. 상상이 묘사보다 무섭다(러브크래프트 원칙).',
    pool: [
      { t: '비극을 되풀이하려는 집에 깃든 원혼', tags: ['gothic', 'psych'] },
      { t: '이름을 부르면 다가오는 형체 없는 것', tags: ['cosmic', 'psych', 'creature'] },
      { t: '산 자의 얼굴을 베껴 끼는 도플갱어', tags: ['psych', 'body', 'cosmic'] },
      { t: '제물을 받지 못하면 마을을 거두는 토지신', tags: ['folk', 'occult'] },
      { t: '가면을 쓰고 한 명씩 솎아내는 살인마', tags: ['slasher'] },
      { t: '숙주를 갈아타며 번지는 기생 곰팡이', tags: ['body', 'survival', 'creature'] },
      { t: '계약자의 몸을 천천히 차지하는 악귀', tags: ['occult', 'body', 'gothic'] },
      { t: '거울·창·물에 비칠 때만 움직이는 그림자', tags: ['psych', 'gothic', 'creature'] },
      { t: '소리를 좇아 사냥하는 눈먼 포식자', tags: ['creature', 'survival'] },
      { t: '본 사람을 닷새 안에 데려가는 저주', tags: ['occult', 'cosmic', 'gothic'] },
      { t: '죽은 이의 목소리로 문을 두드리는 무엇', tags: ['gothic', 'occult', 'psych'] },
      { t: '잠들면 끌어가는 꿈속의 키 큰 형상', tags: ['cosmic', 'psych', 'creature'] },
      { t: '물린 자를 같은 편으로 바꾸는 감염', tags: ['survival', 'body', 'creature'] },
      { t: '인간을 흉내 내려다 어긋난 무언가', tags: ['cosmic', 'psych', 'body'] },
      { t: '한밤 정각마다 한 층씩 올라오는 발소리', tags: ['gothic', 'creature', 'psych'] },
      { t: '신도의 광기로 살아 움직이는 우상', tags: ['folk', 'occult', 'cosmic'] },
      { t: '사진에 찍히면 그 사람을 지워가는 것', tags: ['cosmic', 'psych', 'gothic'] },
      { t: '갈라진 틈에서 손만 내미는 거대한 그늘', tags: ['cosmic', 'creature'] },
      { t: '굶주린 땅을 달래려 산 제물을 부르는 마을신', tags: ['folk', 'occult', 'cosmic'] },
      { t: '죽은 가족의 모습으로 찾아오는 거짓 환영', tags: ['gothic', 'psych', 'occult'] },
      { t: '살갗 밑에서 천천히 자라나는 다른 무엇', tags: ['body', 'survival', 'cosmic'] },
      { t: '벽 너머에서 내 목소리를 따라 하는 존재', tags: ['psych', 'creature', 'gothic'] },
    ],
  },
  {
    key: 'rule', label: '괴물의 규칙·금기', icon: '⛓️',
    guide: '괴물·저주에는 작동 규칙이 있다. 독자는 규칙을 파악하며 긴장하고, 위반은 곧 처벌이다.',
    pool: [
      { t: '해가 진 뒤엔 절대 이름을 불러선 안 된다', tags: ['cosmic', 'occult', 'folk'] },
      { t: '거울을 똑바로 들여다보면 끌려간다', tags: ['psych', 'gothic', 'creature'] },
      { t: '한 번 본 사람은 닷새 안에 누군가에게 넘겨야 산다', tags: ['occult', 'cosmic'] },
      { t: '소리를 내면 위치를 들킨다 — 숨소리조차', tags: ['creature', 'survival'] },
      { t: '제삿날 자정 전엔 그 방 문을 열어선 안 된다', tags: ['gothic', 'occult', 'folk'] },
      { t: '마을의 풍습을 묻거나 거스르면 표적이 된다', tags: ['folk', 'occult'] },
      { t: '물린 상처를 들키는 순간 격리 대상이 된다', tags: ['survival', 'body'] },
      { t: '잠들면 다시 깨어나지 못할 수도 있다', tags: ['psych', 'cosmic', 'creature'] },
      { t: '그 책을 끝까지 읽은 자는 돌아오지 못한다', tags: ['cosmic', 'occult'] },
      { t: '집 밖으로 나가는 순간 보호의 경계가 풀린다', tags: ['gothic', 'occult', 'psych'] },
      { t: '대답을 하면 그것이 따라 들어온다', tags: ['gothic', 'occult', 'creature'] },
      { t: '피를 보이면 더 빨리, 더 많이 몰려든다', tags: ['creature', 'survival', 'slasher'] },
      { t: '같은 길을 두 번 지나면 길이 닫힌다', tags: ['psych', 'cosmic'] },
      { t: '약을 거르면 보이지 말아야 할 것이 보인다', tags: ['psych', 'occult'] },
      { t: '13번째 종이 울리기 전에 끝내야 한다', tags: ['occult', 'gothic', 'folk'] },
      { t: '문지방의 소금선을 넘게 두어선 안 된다', tags: ['occult', 'folk', 'gothic'] },
      { t: '불을 끄면 그것이 한 걸음 더 가까워진다', tags: ['creature', 'psych', 'cosmic'] },
      { t: '초대하지 않으면 안으로 들어오지 못한다', tags: ['gothic', 'occult', 'creature'] },
    ],
  },
  {
    key: 'firstSign', label: '균열(첫 이상징후)', icon: '🩹',
    guide: '설명 가능할 법한 작은 이상. 우연·착각·소음 수준이어서 독자만 불안하다(5단 중 2단).',
    pool: [
      { t: '아무도 없는 방에서 들리는 어린아이의 흥얼거림', tags: ['gothic', 'occult', 'psych'] },
      { t: '가족사진 속 한 사람의 얼굴이 매일 흐려진다', tags: ['gothic', 'cosmic', 'psych'] },
      { t: '잠긴 문 안쪽에서 긁히는 소리가 난다', tags: ['gothic', 'creature', 'psych'] },
      { t: '키우던 개가 특정 방향만 보며 으르렁댄다', tags: ['gothic', 'creature', 'folk'] },
      { t: '거울 속 내 동작이 반 박자 늦게 따라온다', tags: ['psych', 'gothic'] },
      { t: '마을 사람들의 미소가 늘 0.5초 늦다', tags: ['folk', 'psych', 'cosmic'] },
      { t: '천장에서 한 방울씩 떨어지는 검은 물', tags: ['gothic', 'body', 'creature'] },
      { t: '꺼둔 라디오에서 새벽마다 잡음이 흐른다', tags: ['psych', 'cosmic', 'gothic'] },
      { t: '벽지 안쪽에서 무언가 부푸는 듯한 자국', tags: ['body', 'gothic', 'creature'] },
      { t: '없던 방문이 복도 끝에 하나 늘어 있다', tags: ['psych', 'cosmic', 'gothic'] },
      { t: '죽은 줄 알았던 사람의 부재중 전화가 찍혀 있다', tags: ['gothic', 'occult', 'psych'] },
      { t: '손등에 자고 일어나면 늘어나는 검은 반점', tags: ['body', 'survival', 'occult'] },
      { t: '동네 개·새가 하룻밤 새 모두 자취를 감춘다', tags: ['folk', 'survival', 'cosmic'] },
      { t: 'CCTV에만 찍히는, 늘 같은 자리에 선 형체', tags: ['creature', 'psych', 'gothic'] },
      { t: '시계가 매일 같은 시각에 멈춘다', tags: ['gothic', 'cosmic', 'psych'] },
      { t: '신발이 매일 아침 현관에서 안쪽을 향해 놓여 있다', tags: ['gothic', 'psych', 'occult'] },
      { t: '벽에 손바닥만 한 곰팡이가 밤사이 사람 모양으로 번진다', tags: ['body', 'gothic', 'cosmic'] },
      { t: '먹다 남긴 음식이 누군가 손댄 듯 줄어 있다', tags: ['creature', 'psych', 'survival'] },
    ],
  },
  {
    key: 'escalation', label: '상승(점점 조여옴)', icon: '📈',
    guide: '사건이 잦아지고 강도가 세진다. 합리적 설명이 무너지고, 인물이 규칙을 발견·조사한다(3단).',
    pool: [
      { t: '주인공만 그것을 보고, 아무도 믿어주지 않아 고립이 깊어진다', tags: ['psych', 'gothic', 'cosmic'] },
      { t: '낡은 일기와 옛 사건 기록에서 같은 비극의 반복을 발견한다', tags: ['gothic', 'occult', 'folk'] },
      { t: '경고하던 노인이 입을 닫거나 사라지고, 도움줄 사람이 줄어든다', tags: ['folk', 'occult', 'slasher'] },
      { t: '도망치려 할수록 차·전화·길이 차례로 막혀 퇴로가 닫힌다', tags: ['slasher', 'survival', 'creature'] },
      { t: '함께 온 일행이 하나둘 사라지거나 변해간다', tags: ['slasher', 'body', 'survival'] },
      { t: '규칙을 시험하다 한 명이 본보기처럼 당한다', tags: ['occult', 'cosmic', 'folk'] },
      { t: '내 몸의 변화가 돌이킬 수 없는 단계로 넘어간다', tags: ['body', 'occult', 'survival'] },
      { t: '환각과 현실의 경계가 무너져 무엇이 진짜인지 알 수 없게 된다', tags: ['psych', 'cosmic', 'occult'] },
      { t: '마을 전체가 한통속이었음이 드러나 사방이 적이 된다', tags: ['folk', 'occult', 'slasher'] },
      { t: '시간·기억이 어긋나며 같은 하루·같은 장면이 되풀이된다', tags: ['psych', 'cosmic', 'gothic'] },
      { t: '안전하다 믿었던 공간 깊숙이까지 그것이 침범해 온다', tags: ['gothic', 'creature', 'psych'] },
      { t: '저주가 곁의 사람에게로 옮겨붙기 시작한다', tags: ['occult', 'cosmic', 'gothic'] },
      { t: '바깥에 도움을 청해도 돌아오는 건 더 깊은 침묵뿐이다', tags: ['survival', 'cosmic', 'psych'] },
      { t: '믿었던 동료마저 그것의 편으로 돌아선 듯 행동한다', tags: ['folk', 'slasher', 'psych'] },
    ],
  },
  {
    key: 'climax', label: '포위·대면(클라이맥스)', icon: '🔥',
    guide: '고립 확정·안전지대 붕괴 후 진실과 정면으로. 심어둔 규칙·약점을 역이용하고 최대 희생이 따른다(4~5단).',
    pool: [
      { t: '빌드업에서 심어둔 약점(불·소금·이름·해뜸)을 마지막에 역이용해 맞선다', tags: ['occult', 'folk', 'creature'] },
      { t: '가장 무력했던 주인공이 수동에서 능동으로 돌아서 정면으로 부딪친다', tags: ['slasher', 'gothic', 'survival'] },
      { t: '진실(괴물의 기원·집의 역사·마을의 죄)이 드러나며 모든 단서가 맞물린다', tags: ['gothic', 'folk', 'occult'] },
      { t: '핵심 인물의 희생으로 길을 열어 가까스로 탈출구에 닿는다', tags: ['survival', 'creature', 'slasher'] },
      { t: '저주를 누군가에게 넘기느냐 끊느냐의 선택 앞에 선다', tags: ['occult', 'cosmic'] },
      { t: '구원자인 줄 알았던 인물이 진짜 흑막이었음이 드러난다', tags: ['psych', 'folk', 'occult'] },
      { t: '신뢰할 수 없던 화자의 정체(이미 죽은 자·가해자)가 폭로된다', tags: ['psych', 'gothic', 'cosmic'] },
      { t: '내 몸을 내어주는 대가로 다른 이를 구하는 마지막 거래를 한다', tags: ['body', 'occult', 'survival'] },
      { t: '의식이 완성되기 직전, 제단 위에서 모든 것이 충돌한다', tags: ['folk', 'occult', 'gothic'] },
      { t: '인간이 이해할 수 없는 진상을 본 순간 정신이 무너져 내린다', tags: ['cosmic', 'psych'] },
      { t: '봉인을 되살리려 가문 대대로 전해진 마지막 의식을 치른다', tags: ['gothic', 'occult', 'folk'] },
      { t: '그것을 끌어안은 채 함께 불길 속으로 뛰어드는 길을 택한다', tags: ['gothic', 'survival', 'occult'] },
    ],
  },
  {
    key: 'ending', label: '결말·여운', icon: '🕯️',
    guide: '퇴치의 후련함보다 "끝나지 않았다"는 찝찝함을 선호하는 경향. 대가·상처·옮겨간 씨앗을 남긴다.',
    pool: [
      { t: '살아남았지만 정상으로 돌아가지 못한 채, 마지막 컷에 불길한 징조가 비친다', tags: ['gothic', 'psych', 'survival'] },
      { t: '괴물은 사라진 듯하나, 저주는 다음 사람에게로 조용히 옮겨가 있다', tags: ['occult', 'cosmic', 'gothic'] },
      { t: '이긴 줄 알았던 순간, 그것이 다시 일어나며 화면이 끊긴다', tags: ['slasher', 'creature'] },
      { t: '모든 게 환각이었다는 안도 직후, 환각이 아니었음이 드러난다', tags: ['psych', 'cosmic'] },
      { t: '주인공만 빠져나오고, 떠나온 곳은 아무 일 없었다는 듯 고요하다', tags: ['folk', 'gothic', 'psych'] },
      { t: '알·생존 개체·전염자가 바깥세상으로 한 발 내디딘 채 끝난다', tags: ['body', 'survival', 'creature'] },
      { t: '괴물을 막은 대가로 가장 소중한 이를 잃고 홀로 남는다', tags: ['gothic', 'occult', 'survival'] },
      { t: '주인공이 어느새 그것의 일부가 되어 다음 희생자를 맞이한다', tags: ['body', 'occult', 'cosmic'] },
      { t: '마을은 외부인을 또 한 명 받아들일 준비를 마친 채 미소 짓는다', tags: ['folk', 'occult'] },
      { t: '구조되어 안전해진 듯하나, 마지막 한 줄이 모든 안도를 뒤집는다', tags: ['psych', 'gothic', 'cosmic'] },
      { t: '모든 기록이 지워지고, 그곳에 다녀온 사람만 흔적도 없이 비어 있다', tags: ['cosmic', 'psych', 'folk'] },
      { t: '돌아온 일상 속, 거울 너머에서 그것이 여전히 이쪽을 보고 있다', tags: ['psych', 'gothic', 'creature'] },
    ],
  },
]

// 관련 도구(연계)
const RELATED: { id: string; label: string }[] = [
  { id: 'logline-forge', label: '로그라인 대장간' },
  { id: 'plot-pyramid', label: '플롯 피라미드' },
  { id: 'scene-list', label: '장면 목록' },
  { id: 'setting-bible', label: '배경 설정집' },
  { id: 'character-sheet', label: '인물 시트' },
]

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const fmtNum = (n: number) => n.toLocaleString('ko-KR')

// ── 조사 헬퍼 ──────────────────────────────────────────────────────────
// 마지막 글자의 받침 유무를 보고 실제 조사를 하나 골라 붙인다.
// (한글이 아니거나 알 수 없으면 받침 있는 쪽을 기본으로 — 따옴표·괄호 끝 대비)
function hasBatchim(word: string): boolean {
  const w = String(word).trim()
  if (!w) return true
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true   // 비한글: 보수적으로 받침 있음 취급
  return (code - 0xac00) % 28 !== 0
}
// 받침이 'ㄹ'인지(으로/로 구분용)
function endsWithRieul(word: string): boolean {
  const w = String(word).trim()
  if (!w) return false
  const ch = w[w.length - 1]
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 === 8   // 종성 인덱스 8 = ㄹ
}
const josaEul = (w: string) => w + (hasBatchim(w) ? '을' : '를')   // 목적격
const josaI = (w: string) => w + (hasBatchim(w) ? '이' : '가')     // 주격
const josaEun = (w: string) => w + (hasBatchim(w) ? '은' : '는')   // 주제격
const josaRo = (w: string) => w + (!hasBatchim(w) || endsWithRieul(w) ? '로' : '으로') // 방향격

// 총 조합수(슬롯 풀 크기의 곱) — 22·10·22·22·18·18·14·12·12 ≈ 695억
const TOTAL_COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)

// 하위유형 우선 가중 추출: 태그가 겹치는 항목을 우선(2/3 확률), 없으면 전체 풀에서.
function pickFor(slot: Slot, sub: string, avoid?: string): string {
  let candidates = slot.pool
  if (sub && sub !== 'all') {
    const matched = slot.pool.filter((o) => o.tags.includes(sub))
    if (matched.length > 0 && Math.random() < 0.78) candidates = matched
  }
  let v = pick(candidates).t
  if (v === avoid && candidates.length > 1) v = pick(candidates).t
  return v
}

// 굴린 결과를 한 편의 시놉시스 문단으로 엮는다.
function compose(r: Record<string, string>): string {
  const g = (k: string) => r[k] || ''
  if (!SLOTS.every((s) => r[s.key])) return ''
  const p1 = `${g('setting')}. ${g('trigger')} ${josaI(g('protagonist'))} 이곳에 발을 들이며 이야기는 시작된다.`
  const p2 = `처음엔 사소한 균열뿐이다 — ${g('firstSign')}. 누구도 대수롭게 여기지 않지만, 이곳에는 지켜야 할 규칙이 있다: 「${g('rule')}」.`
  const p3 = `이상은 곧 위협으로 자란다. ${josaI(g('threat'))} 정체를 조금씩 드러내고, ${g('escalation')}.`
  const p4 = `마침내 퇴로가 닫힌다. ${g('climax')}.`
  const p5 = `그리고 ${g('ending')}.`
  return [p1, p2, p3, p4, p5].join('\n\n')
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function HorrorSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 가 호러 계열이면 안내에 반영(강제 아님)
  const payloadGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''
  const payloadSub = typeof payload?.subtype === 'string' ? (payload.subtype as string) : ''

  const [sub, setSub] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + ':sub')
      if (raw && SUBTYPES.some((s) => s.key === raw)) return raw
    } catch { /* ignore */ }
    if (payloadSub && SUBTYPES.some((s) => s.key === payloadSub)) return payloadSub
    return 'all'
  })

  const [results, setResults] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':results')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') {
          const next: Record<string, string> = {}
          SLOTS.forEach((s) => { if (typeof obj[s.key] === 'string' && s.pool.some((o) => o.t === obj[s.key])) next[s.key] = obj[s.key] })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })

  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':locked')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') {
          const next: Record<string, boolean> = {}
          SLOTS.forEach((s) => { if (obj[s.key]) next[s.key] = true })
          return next
        }
      }
    } catch { /* ignore */ }
    return {}
  })

  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const nonceRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)
  const seededRef = useRef(false)

  // 첫 진입 시 결과가 없으면 자동으로 한 번 종합(빈 화면 방지)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (Object.keys(results).length === 0) {
      const next: Record<string, string> = {}
      SLOTS.forEach((s) => { next[s.key] = pickFor(s, sub) })
      setResults(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + ':results', JSON.stringify(results)) } catch { /* ignore */ } }, [results])
  useEffect(() => { try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])
  useEffect(() => { try { localStorage.setItem(LS + ':sub', sub) } catch { /* ignore */ } }, [sub])

  // 토스트 타이머 언마운트 정리
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  const rollAll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        next[s.key] = pickFor(s, sub, prev[s.key])
      })
      return next
    })
  }, [locked, sub])

  const rollOne = useCallback((key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => ({ ...prev, [key]: pickFor(s, sub, prev[key]) }))
  }, [sub])

  // 굴림 애니메이션 자동 해제(경쟁상태 정리)
  useEffect(() => {
    if (!rolling) return
    const my = nonceRef.current
    const t = window.setTimeout(() => { if (nonceRef.current === my) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const synopsis = compose(results)
  const ready = !!synopsis
  const lockedCount = SLOTS.filter((s) => locked[s.key]).length
  const subName = SUBTYPES.find((s) => s.key === sub)?.name || ''
  const subBlurb = SUBTYPES.find((s) => s.key === sub)?.blurb || ''

  const title = ready ? `${results.threat} — ${results.setting}`.slice(0, 48) : ''

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(synopsis).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* graceful */ })
  }

  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: synopsis, source: '호러 시놉시스 빌더', tags: ['시놉시스', '호러·공포', subName].filter(Boolean) })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bullets = SLOTS
      .map((s) => `<p style="margin:2px 0;"><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(results[s.key] || '')}</p>`)
      .join('')
    const paras = synopsis.split('\n\n').map((p) => `<p style="line-height:1.75;margin:0 0 10px;">${esc(p)}</p>`).join('')
    const bodyHtml = [
      `<p style="font-size:12px;color:#888;margin:0 0 6px;">🩸 호러·공포 시놉시스 · 하위유형: ${esc(subName)}</p>`,
      paras,
      `<hr/>`,
      `<p style="font-size:12px;color:#888;margin:6px 0;">구성 요소</p>`,
      bullets,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `🩸 시놉시스 — ${esc(title)}`,
      bodyHtml,
      meta: { 장르: '호러·공포', 하위유형: subName, 도구: '호러 시놉시스 빌더' },
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ── 스타일 ──────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        호러·공포 5단 구조(<b>일상→균열→상승→포위→대면·결말</b>)의 슬롯을 굴려 한 편의 <b>시놉시스</b>로 자동 종합합니다.
        규칙·off-screen·열린 결말 등 장르 관습을 그대로 따릅니다.
        {payloadGenre && payloadGenre !== '호러·공포' ? <span style={{ color: 'var(--accent-2)' }}> (받은 장르: {esc(payloadGenre)})</span> : null}
      </div>

      {/* 하위유형 선택 */}
      <div style={card}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>하위유형(분위기) — 선택 시 그 결에 맞는 항목을 우선 추천</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUBTYPES.map((s) => (
            <button
              key={s.key}
              className="minibtn"
              onClick={() => setSub(s.key)}
              aria-pressed={sub === s.key}
              style={{
                borderColor: sub === s.key ? 'var(--accent)' : 'var(--border)',
                background: sub === s.key ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : undefined,
                fontWeight: sub === s.key ? 700 : 400,
              }}
              title={s.blurb}
            >
              <Emoji e={s.icon} /> {s.name}
            </button>
          ))}
        </div>
        {subBlurb && <div style={{ ...hint, marginTop: 6 }}>{subBlurb}</div>}
      </div>

      {/* 조합수 + 가이드 토글 */}
      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span>가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmtNum(TOTAL_COMBOS)}</b> 가지 (약 695억)</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{lockedCount > 0 ? <><Emoji e="🔒" /> {lockedCount}개 고정됨</> : '고정 없음'}</span>
          <button className="linkbtn" onClick={() => setShowGuide((v) => !v)} style={{ fontSize: 11 }}>
            {showGuide ? '역할 설명 닫기' : '각 칸 역할 보기'}
          </button>
        </span>
      </div>

      {/* 슬롯 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.map((s) => {
          const v = results[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, ...card }}>
              <div style={{ fontSize: 19, width: 24, textAlign: 'center', flexShrink: 0, marginTop: 1, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-8deg) scale(1.1)' : 'none' }}>
                <Emoji e={s.icon} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.7 }}>({s.pool.length})</span></div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (rolling && !isLocked ? '…' : v) : '— 굴려주세요 —'}
                </div>
                {showGuide && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>{s.guide}</div>}
              </div>
              <button className="minibtn" onClick={() => rollOne(s.key)} title="이 칸만 다시 굴리기" style={{ flexShrink: 0 }} disabled={isLocked}><Emoji e="🎲" /></button>
              <button
                className="minibtn"
                onClick={() => toggleLock(s.key)}
                title={isLocked ? '고정 해제' : '이 칸 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                aria-pressed={isLocked}
              >
                {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
              </button>
            </div>
          )
        })}
      </div>

      {/* 완성 시놉시스 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🩸" /> 종합된 시놉시스</div>
        {ready ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{synopsis}</div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>모든 칸을 굴리면 한 편의 시놉시스로 자동 종합됩니다.</div>
        )}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 150 }} onClick={rollAll}><Emoji e="🎲" /> 시놉시스 종합하기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="완성 시놉시스를 스니펫 라이브러리에 저장"><Emoji e="💾" /> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '완성 시놉시스를 프로젝트 자료 〈기획〉 폴더에 추가'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 관련 도구 연계 */}
      <div style={{ ...card, paddingTop: 8, paddingBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>이어서 작업하기 (관련 도구)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {RELATED.map((r) => (
            <button
              key={r.id}
              className="linkbtn"
              onClick={() => openToolLinked(r.id, { genre: '호러·공포', subtype: sub, fromSynopsis: synopsis })}
              title={`${r.label} 열기`}
            >
              <Emoji e="🔗" /> {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={hint}>
        잠긴 칸은 그대로 두고 나머지만 다시 굴립니다. 종합 결과는 출발점일 뿐 — 드레드의 축적, 가짜 안도, 정보의 적하 등을 더해 자유롭게 다듬으세요.
      </div>

      {/* 저작권 */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 슬롯 문구는 이 도구가 호러·공포 장르 관습에 근거해 자체 작성한 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
