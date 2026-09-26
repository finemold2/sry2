// 현대판타지·회귀 시놉시스 빌더 — 회귀물(현대 배경) 관습에 맞춘 항목으로 시놉시스를 채워 자동 종합한다.
//  · 항목별 슬롯 풀에서 무작위로 뽑아 채우고(잠금🔒/재생성🎲), 빈칸은 직접 타이핑해 덮어쓸 수 있다(자동 저장).
//  · "전부 굴리기"로 한 번에 회귀 트리거·미래지식·1막목표·복수대상·세력무대·핵심 조력자·메타지식 무효화·청산·정서·엔딩을
//    한국 웹소설 회귀물 문법으로 조합 → 하단에서 한 편의 시놉시스 문장으로 자동 종합한다.
//  · 조사(을/를·이/가·은/는·으로/로)는 앞 글자 받침을 보고 자동 선택해 "을(를)" 식 이중표기를 노출하지 않는다.
//  · 조합수 13조+ (핵심 슬롯 풀 곱). 자급식: react 와 './linkbus' 외 import 없음, 외부 네트워크 없음(전부 로컬 자작 데이터).
//  · 데이터: localStorage 'sry:tool:modfan-synopsis' (현재 채운 값/잠금/제목·로그라인/하위유형 보관). 언마운트 시 타이머 정리.
//  · 연계: addToProject(root:'research', folder:'기획', '시놉시스') 로 자료 바인더에 추가, addToLibrary('snippets', ...) 로 종합 시놉시스를 글감 저장,
//          openToolLinked 로 관련 도구(로그라인·개요·세계관 위키·캐릭터 단조) 열기. payload.genre 활용.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'modfan-synopsis',
  name: '회귀 시놉시스 빌더',
  icon: '⏪',
  group: '구조',
  genre: '현대판타지·회귀',
  intro: '회귀 트리거·미래지식·1막목표·복수·세력무대·핵심 조력자·메타지식 붕괴·청산·정서·엔딩 슬롯을 굴려 현대판타지 회귀물 시놉시스를 13조+ 조합으로 자동 종합',
  w: 720,
  h: 700,
}

const LS = 'sry:tool:modfan-synopsis'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const fmtNum = (n: number) => n.toLocaleString('ko-KR')
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한국어 조사 자동 선택 — 앞 글자의 받침 유무를 보고 실제로 하나를 골라 출력한다.
//  · "을(를)" 같은 괄호 이중표기를 절대 노출하지 않기 위한 헬퍼.
//  · 한글 음절(가~힣)이면 (코드-0xAC00)%28 로 종성 인덱스를 구해 판정. ㄹ 받침은 '으로/로'에서 예외 처리.
function lastSyllable(word: string): string {
  const s = String(word).trim()
  return s.length ? s[s.length - 1] : ''
}
function hasJong(word: string): { jong: boolean; rieul: boolean } {
  const ch = lastSyllable(word)
  const code = ch.charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return { jong: false, rieul: false }
  const jongIdx = (code - 0xac00) % 28
  return { jong: jongIdx !== 0, rieul: jongIdx === 8 } // 8 = ㄹ
}
// 받침 보고 받침형/비받침형 중 하나를 고른다.
function josa(word: string, withJong: string, withoutJong: string): string {
  return hasJong(word).jong ? withJong : withoutJong
}
const eul = (w: string) => josa(w, '을', '를')      // 목적격
const iga = (w: string) => josa(w, '이', '가')      // 주격
const eunneun = (w: string) => josa(w, '은', '는')  // 보조사
// 으로/로 — 받침 없거나 ㄹ받침이면 '로', 그 외 받침이면 '으로'
function euro(word: string): string {
  const { jong, rieul } = hasJong(word)
  return !jong || rieul ? '로' : '으로'
}

// ──────────────────────────────────────────────────────────────────────────
// 하위유형(필드) — 회귀×현대 직업 클러스터. 선택 시 무대/세력 슬롯이 그 결로 안내된다.
// ──────────────────────────────────────────────────────────────────────────
interface FieldDef { key: string; label: string; icon: string; tag: string }
const FIELDS: FieldDef[] = [
  { key: 'econ', label: '재벌·경제물', icon: '💰', tag: '종잣돈·저점매수·상장·인수합병으로 자본 제국을 쌓는 회귀' },
  { key: 'hunter', label: '헌터·게이트물', icon: '🌀', tag: '게이트 출현일·등급을 아는 회귀자가 S급 헌터로 등극' },
  { key: 'idol', label: '연예·아이돌물', icon: '🎤', tag: '망한 연예인이 데뷔 직전으로 회귀, 미래 히트곡·시나리오 선점' },
  { key: 'sports', label: '스포츠·구단물', icon: '⚾', tag: '선수·감독·구단주로 회귀, 떡잎 유망주와 명승부를 미리 안다' },
  { key: 'corp', label: '기업·창업물', icon: '🏢', tag: '도태된 직장인이 회귀, 미래 기술·트렌드로 유니콘을 세운다' },
  { key: 'pro', label: '프로게이머물', icon: '🎮', tag: '은퇴 프로가 회귀, 메타·패치·드래프트를 알고 세계 1위로' },
  { key: 'creator', label: '작가·창작물', icon: '✍️', tag: '무명 작가/PD가 회귀, 미래의 대박 IP를 먼저 써낸다' },
  { key: 'food', label: '요리·외식물', icon: '🍜', tag: '망한 셰프가 회귀, 미래 미식 트렌드·상권을 선점한다' },
]

// ──────────────────────────────────────────────────────────────────────────
// 시놉시스 항목(슬롯) — 회귀물 골격. 일부는 하위유형별 풀이 갈린다.
// ──────────────────────────────────────────────────────────────────────────
interface SlotDef {
  key: string
  label: string
  icon: string
  hint: string
  // 공통 풀 또는 하위유형별 풀(byField). 공통이 있으면 그것을 우선.
  pool?: string[]
  byField?: Record<string, string[]>
}

// ── 1) 회귀 트리거(죽음·배신·후회의 순간) ───────────────────────────────────
const P_TRIGGER = [
  '믿었던 동업자에게 모든 지분을 빼앗기고 빈손으로 옥상에서 뛰어내린 그 순간',
  '평생 충성한 조직에게 토사구팽당해 차가운 병상에서 홀로 숨을 거둔 직후',
  '하나뿐인 가족을 지키지 못한 채 빚더미에 깔려 죽어가던 마지막 밤',
  '정상의 문턱에서 누명을 쓰고 모든 것을 잃은 채 길바닥에서 객사한 끝에',
  '세계를 집어삼킨 대균열 앞에서 동료들의 시체를 밟고 끝끝내 패배한 순간',
  '배신자의 칼끝에 심장을 내준 채 "다시 한 번만…"을 되뇌며 눈을 감은 그때',
  '쌓아 올린 모든 것이 단 한 번의 선택으로 무너져 절망 속에 스러진 직후',
  '못 지킨 약속과 갚지 못한 원한을 가슴에 품고 비참하게 생을 마감한 끝에',
  '세상이 자신을 버린 줄도 모르고 이용만 당하다 폐인이 되어 죽어간 뒤',
  '복수도 사랑도 다 놓친 채 후회만 가득 안고 마지막 숨을 토해낸 순간',
  '대신 죄를 뒤집어쓰고 감옥에서 잊혀진 채 늙어 죽어간 끝에',
  '가장 사랑하던 이를 자기 손으로 떠나보내고 술에 절어 폐인으로 스러진 직후',
  '단 한 번의 잘못된 투자로 가문을 거리에 나앉게 한 죄책감에 짓눌려 무너진 그날',
  '정점에서 추락해 모두에게 손가락질받으며 쓸쓸히 잊혀져 간 마지막에',
  '진짜 흑막의 정체를 너무 늦게 깨닫고 그 앞에서 무력하게 쓰러진 순간',
  '평생의 노력이 한순간의 누명으로 잿더미가 되어 절망에 잠긴 그 밤',
]
// ── 2) 회귀 시점(왜 하필 그때인가 — 분기 직전) ──────────────────────────────
const P_WHEN = [
  '모든 비극이 시작되기 직전, 가장 빛나던 스무 살의 그날 아침으로',
  '운명의 분기점이었던 그 계약서에 도장을 찍기 바로 전날로',
  '아직 가족이 모두 살아 있던, 되돌릴 수 있는 마지막 봄으로',
  '첫 번째 배신이 일어나기 일주일 전, 모든 패가 손에 쥐어져 있던 시점으로',
  '게이트가 처음 열리기 3개월 전, 세상이 아직 평온하던 그 겨울로',
  '데뷔조 발표를 코앞에 둔, 모든 것을 바꿀 수 있는 그 오디션 전날로',
  '인생 최대의 실수를 저지르기 직전, 다시 선택할 수 있는 그 갈림길로',
  '아무도 미래를 모르던 시절, 저평가된 모든 것이 헐값이던 그 해로',
  '재능을 처음 인정받았어야 할, 모든 것이 어긋나기 시작한 열아홉의 가을로',
  '운명을 바꿀 그 단 한 통의 전화가 걸려오기 직전의 그 새벽으로',
  '흑막이 아직 무명이던, 싹을 밟을 수 있는 유일한 시기로',
  '첫 직장 면접을 앞둔, 인생 전체를 다시 설계할 수 있는 그 아침으로',
  '대지진과 대폭락이 닥치기 1년 전, 모든 것을 준비할 시간이 남은 시점으로',
  '두 번째 인생을 시작하기 가장 완벽한, 모든 변수가 아직 잠들어 있는 그 순간으로',
]
// ── 3) 미래 지식(메타지식 — 무기) : 하위유형별 ──────────────────────────────
const P_KNOWLEDGE: Record<string, string[]> = {
  econ: [
    '어느 종목이 떡상하고 어느 기업이 부도날지, 향후 20년의 차트를 통째로 기억하는',
    '저평가된 부동산·헐값의 알짜 회사·곧 터질 IPO를 손금 보듯 꿰고 있는',
    '다가올 경제 위기와 코인 폭등의 날짜를 정확히 아는',
    '미래의 대기업이 아직 차고에서 시작도 안 한 무명 스타트업임을 아는',
    '환율·금리·유가가 언제 요동칠지, 거시 경제의 변곡점을 모두 외우고 있는',
    '어떤 인수합병이 성사되고 어떤 거래가 무산될지 내막까지 아는',
    '전생에서 자신을 파산시킨 작전 세력의 수법과 타이밍을 꿰뚫고 있는',
    '어떤 신기술이 거품이고 어떤 것이 진짜 황금알인지 구별할 줄 아는',
    '미래의 부자 순위와 그들이 어디서 종잣돈을 굴렸는지까지 아는',
  ],
  hunter: [
    '모든 게이트의 출현일·등급·내부 구조와 보스의 패턴을 외우고 있는',
    '어떤 무명 헌터가 미래의 S급 랭커로 각성할지, 어떤 아이템이 어디서 드랍될지 아는',
    '다가올 대균열과 종말의 카운트다운, 그리고 그 진짜 원흉을 아는',
    '히든 클래스·각성의 비밀과 협회·길드의 흥망 타임라인을 통째로 아는',
    '어느 던전에 어떤 함정과 보물이 있는지 지도처럼 외우고 있는',
    '각성석·마정석의 진짜 가치와 미래 시세를 미리 아는',
    '전생에서 자신을 배신한 길드 마스터의 패와 약점을 꿰뚫고 있는',
    '아직 평범한 사람들 중 누가 미래의 재앙급 마수가 될지 아는',
    '시스템과 메시지의 진짜 작동 원리, 숨겨진 보상 조건을 알고 있는',
  ],
  idol: [
    '훗날 차트를 올킬할 미래의 명곡과 역주행 신화의 주인공을 미리 아는',
    '어떤 연습생이 대스타가 되고 어떤 기획사가 무너질지 꿰고 있는',
    '미래의 대박 드라마·예능 포맷과 그 캐스팅·방영일을 외우고 있는',
    '대중의 취향이 어디로 흐를지, 다음 시대의 콘셉트를 먼저 아는',
    '어떤 무대·직캠·짤이 화제가 되어 떡상을 만들지 아는',
    '미래에 터질 업계 스캔들과 누가 몰락할지를 미리 아는',
    '전생에서 자신의 곡을 가로챈 자의 수법과 타이밍을 꿰뚫고 있는',
    '플랫폼·차트 알고리즘이 어떻게 바뀔지, 그 흐름을 먼저 아는',
    '아직 무명인 미래의 천재 작곡가·프로듀서를 알아보는',
  ],
  sports: [
    '모든 경기의 스코어와 명승부, 부상 시점과 트레이드 내막을 기억하는',
    '아직 무명인 미래의 슈퍼스타 떡잎을 한눈에 알아보는',
    '드래프트 순번·이적 시장·우승 팀의 향방을 통째로 외우고 있는',
    '미래에 정립될 전술·훈련법·데이터 분석의 패러다임을 먼저 아는',
    '어떤 선수가 부상으로 무너지고 어떤 유망주가 폭발할지 아는',
    '미래의 명장 감독과 그가 쓸 혁신적 전략을 먼저 아는',
    '전생에서 자신을 방출시킨 프런트의 속내와 약점을 꿰뚫고 있는',
    '심판·승부조작·뒷거래의 추악한 내막을 미리 아는',
    '스카우트 시장에서 저평가된 보석 같은 선수들을 모두 아는',
  ],
  corp: [
    '앞으로 세상을 바꿀 기술·서비스·트렌드가 무엇이고 언제 터질지 아는',
    '어떤 경쟁사가 망하고 어떤 인재가 거물이 될지 꿰고 있는',
    '미래의 대박 사업 아이템과 그 정확한 출시 타이밍을 외우고 있는',
    '투자 시장의 흐름과 곧 등장할 유니콘들의 청사진을 손에 쥔',
    '어떤 규제가 풀리고 어떤 시장이 열릴지 정책의 미래까지 아는',
    '곧 사장될 사양 산업과 폭발할 신산업을 정확히 구별하는',
    '전생에서 자신의 아이디어를 훔쳐 간 대기업의 수법을 꿰뚫고 있는',
    '미래의 핵심 특허와 그것을 선점할 길을 미리 아는',
    '아직 평범한 직원 중 누가 미래의 슈퍼스타 인재인지 아는',
  ],
  pro: [
    '향후 모든 패치·메타 변화와 챔피언 티어의 흥망을 외우고 있는',
    '어떤 무명 선수가 세체급으로 성장할지, 어떤 팀이 우승할지 아는',
    '미래의 정석 운영·신전략과 대회 대진·결과를 통째로 기억하는',
    '곧 출시될 신작 게임의 메타와 e스포츠 판도의 미래를 먼저 아는',
    '어떤 픽이 사기로 판명되고 어떤 조합이 정석이 될지 아는',
    '미래에 터질 승부조작·계약 사기의 내막을 미리 아는',
    '전생에서 자신을 벤치로 밀어낸 코치의 판단과 약점을 꿰뚫고 있는',
    '드래프트에서 저평가된 미래의 괴물 신인들을 모두 아는',
    '관중과 스폰서를 사로잡을 미래의 흥행 코드를 먼저 아는',
  ],
  creator: [
    '훗날 대박 날 미래의 명작 IP·시나리오·웹툰을 통째로 기억하는',
    '어떤 작가·작품이 신드롬이 되고 어떤 트렌드가 올지 아는',
    '미래 플랫폼의 흥망과 독자가 열광할 코드를 먼저 꿰고 있는',
    '아직 세상에 없는 미래의 히트 콘텐츠를 머릿속에 통째로 담은',
    '어떤 장르가 흥하고 어떤 클리셰가 식을지 시장의 미래를 아는',
    '미래에 영화·드라마로 대박 날 원작을 미리 점찍을 수 있는',
    '전생에서 자신의 작품을 도용한 자의 수법과 타이밍을 꿰뚫고 있는',
    '플랫폼 알고리즘과 프로모션의 미래 변화를 먼저 아는',
    '아직 무명인 미래의 천재 작가·일러스트레이터를 알아보는',
  ],
  food: [
    '미래에 대유행할 미식 트렌드·메뉴·식재료를 먼저 아는',
    '어느 골목이 대박 상권이 되고 어느 식당이 미슐랭에 오를지 꿰고 있는',
    '미래의 외식 프랜차이즈 흥망과 소비자 입맛의 변화를 외우고 있는',
    '아직 무명인 미래의 명장 셰프와 비전 레시피를 알아보는',
    '어떤 식재료가 귀해지고 어떤 유통망이 무너질지 미리 아는',
    '미래에 SNS로 폭발할 비주얼 메뉴와 마케팅 코드를 먼저 아는',
    '전생에서 자신의 레시피와 가게를 빼앗은 자의 수법을 꿰뚫고 있는',
    '곧 떠오를 상권과 헐값의 알짜 점포 자리를 모두 아는',
    '미래에 열릴 식문화 흐름과 건강·비건 트렌드를 먼저 아는',
  ],
}
// ── 4) 회귀 직후 첫 사이다(첫 미래지식 행사) : 하위유형별 ────────────────────
const P_FIRSTCIDER: Record<string, string[]> = {
  econ: [
    '전 재산을 곧 떡상할 종목에 몰아넣어 단숨에 종잣돈을 불리고',
    '헐값에 잠든 알짜 회사를 선점해 첫 발판을 마련하고',
    '곧 가치가 폭등할 부동산을 빚을 내서라도 미리 쓸어 담고',
    '망할 운명의 거래를 피하고 작전 세력의 칼날을 거꾸로 받아쳐 첫 한탕을 거두고',
    '아직 무명인 미래의 천재 사업가에게 가장 먼저 투자해 지분을 확보하고',
    '곧 터질 코인·신주를 저점에서 잡아 하룻밤에 판을 뒤집고',
    '전생에 자신을 등쳐먹은 사기꾼의 덫을 역이용해 통쾌하게 되갚고',
    '남들이 거들떠보지 않던 부실 자산을 헐값에 인수해 미래의 황금알을 선점하고',
  ],
  hunter: [
    '아무도 모르는 첫 게이트의 히든 보스를 솔로로 잡아 단숨에 각성하고',
    '동급 최강의 아이템이 잠든 던전을 가장 먼저 클리어해 차원이 다른 출발을 끊고',
    '저급으로 무시받던 게이트의 진짜 보물을 선점해 세상을 놀라게 하고',
    '전생에 자신을 버린 길드의 코를 납작하게 만드는 클리어 기록을 세우고',
    '아직 평범한 미래의 S급 떡잎을 가장 먼저 알아보고 동료로 끌어들이고',
    '곧 폭주할 던전 브레이크를 미리 막아 단번에 영웅으로 떠오르고',
    '헐값에 굴러다니던 각성석으로 남들보다 한참 앞선 성장을 일궈내고',
    '무시받던 능력의 숨은 사용법을 꿰뚫어 첫 레이드부터 모두를 압도하고',
  ],
  idol: [
    '미래의 히트곡을 들고 그 자리에서 오디션 심사위원을 압도해 데뷔를 거머쥐고',
    '망할 운명의 기획사를 피해 진짜 강자에게 먼저 손을 내밀고',
    '아무도 못 알아본 미래의 명곡으로 첫 무대부터 차트를 뒤흔들고',
    '전생에 자신의 곡을 가로챈 자보다 먼저 그 노래를 발표해 판을 뒤집고',
    '아직 무명인 미래의 천재 프로듀서와 가장 먼저 손잡고',
    '미래에 화제가 될 콘셉트를 선점해 데뷔하자마자 신드롬을 일으키고',
    '망할 계약의 함정을 피하고 자신을 무시하던 관계자들을 단숨에 후회하게 만들고',
    '미래의 역주행 곡을 미리 알아 데뷔 무대부터 역대급 화제를 만들고',
  ],
  sports: [
    '미래의 명장면을 그대로 재현해 스카우터들의 눈을 단숨에 사로잡고',
    '몸값 폭등 직전의 유망주를 헐값에 데려와 첫 판을 깔고',
    '아무도 안 쓰던 미래의 전술로 강팀을 상대로 첫 이변을 만들고',
    '전생에 자신을 방출한 팀을 상대로 데뷔전부터 인생 경기를 펼치고',
    '아직 무명인 미래의 슈퍼스타를 가장 먼저 점찍어 영입하고',
    '곧 다칠 운명의 부상을 미리 피하고 완벽한 컨디션으로 첫 시즌을 열고',
    '미래의 데이터 분석을 도입해 첫 경기부터 모두의 예상을 뒤엎고',
    '저평가된 보석 같은 선수를 발굴해 단숨에 팀의 판도를 바꾸고',
  ],
  corp: [
    '미래의 대박 아이템을 먼저 출시해 시장을 단숨에 선점하고',
    '망할 회사를 박차고 나와 미래 인재들을 한발 먼저 영입하고',
    '아무도 안 믿던 미래 기술에 전부를 걸어 첫 투자를 따내고',
    '전생에 자신의 아이디어를 훔친 대기업보다 먼저 시장에 깃발을 꽂고',
    '곧 폭발할 신산업의 핵심 특허를 가장 먼저 선점하고',
    '아직 평범한 미래의 슈퍼스타 인재를 헐값에 영입해 진용을 짜고',
    '망할 운명의 계약을 피하고 사양 산업에서 빠르게 발을 빼고',
    '미래의 유니콘에 가장 먼저 올라타 단숨에 판을 키우고',
  ],
  pro: [
    '미래의 정석 운영을 들고 데뷔전부터 1위 팀을 박살 내고',
    '저평가된 미래의 세체급 선수를 먼저 영입해 판을 깔고',
    '곧 사기로 판명될 픽을 선점해 모두를 충격에 빠뜨리고',
    '전생에 자신을 벤치로 밀어낸 코치의 코를 납작하게 만드는 활약을 펼치고',
    '아직 무명인 미래의 괴물 신인을 가장 먼저 알아보고 영입하고',
    '미래의 메타를 미리 적용해 데뷔 무대부터 모두를 압도하고',
    '망할 운명의 팀을 피해 진짜 강팀과 먼저 계약하고',
    '곧 너프될 픽을 버리고 미래의 1티어를 선점해 판을 뒤집고',
  ],
  creator: [
    '미래의 명작 시놉시스를 들고 공모전을 단숨에 휩쓸고',
    '망할 운명의 계약을 피해 진짜 가치를 알아본 곳과 손잡고',
    '아무도 못 알아본 미래의 히트 IP로 첫 연재부터 신드롬을 일으키고',
    '전생에 자신의 작품을 도용한 자보다 먼저 그것을 세상에 내놓고',
    '아직 무명인 미래의 천재 작가·일러스트레이터와 먼저 손잡고',
    '미래에 흥할 장르를 선점해 데뷔작부터 시장을 휩쓸고',
    '망할 트렌드를 피하고 다음 시대의 코드를 가장 먼저 짚어내고',
    '미래에 영상화로 대박 날 원작을 미리 점찍어 판권을 확보하고',
  ],
  food: [
    '미래의 유행 메뉴를 먼저 선보여 첫날부터 줄 서는 가게를 만들고',
    '대박 상권이 될 골목의 점포를 헐값에 미리 계약하고',
    '아무도 안 쓰던 미래의 레시피로 첫 손님부터 사로잡고',
    '전생에 자신의 가게를 빼앗은 자보다 먼저 그 자리를 선점하고',
    '아직 무명인 미래의 명장 셰프를 가장 먼저 알아보고 영입하고',
    '미래에 SNS로 폭발할 비주얼 메뉴를 선보여 단숨에 화제를 만들고',
    '곧 귀해질 식재료의 유통망을 미리 확보해 판을 깔고',
    '망할 운명의 동업을 피하고 자신을 무시하던 자들을 줄 세우게 만들고',
  ],
}
// ── 5) 1막 목표(회귀 직후 할 일 체크리스트) ─────────────────────────────────
const P_GOAL = [
  '이번 생엔 가족을 반드시 지키고, 종잣돈과 인맥으로 무너지지 않을 기반부터 쌓는 것',
  '전생에서 놓친 미래의 거물들을 무명일 때 미리 포섭해 자기 사람으로 만드는 것',
  '자신을 망친 자들이 힘을 갖기 전에, 그들의 약점과 미래를 선점해 싹을 밟아두는 것',
  '바닥부터 다시 올라가되, 이번엔 실력과 미래지식을 합쳐 누구도 넘볼 수 없는 위치에 오르는 것',
  '못 지킨 사람들을 이번엔 지키고, 갚지 못한 빚은 반드시 청산할 발판을 다지는 것',
  '재능을 숨긴 채 차근차근 세력을 키워, 결정적 순간에 모든 패를 한 번에 터뜨릴 준비를 하는 것',
  '전생에서 자신을 짓밟은 자들이 누리던 자리를 하나씩 빼앗아 판을 뒤집는 것',
  '아직 일어나지 않은 거대 사건을 미리 대비해 위기를 기회로 바꿔낼 토대를 만드는 것',
  '잃었던 명예와 신뢰를 되찾고, 이번엔 떳떳하게 정상에 서는 것',
  '저평가된 자산·인재·기술을 남보다 먼저 선점해 압도적 출발선을 확보하는 것',
  '전생의 실패를 답습하지 않도록, 모든 분기점에서 더 나은 선택을 반복하는 것',
  '곁을 지켜준 사람들에게 이번엔 진 빚을 갚고, 함께 정상까지 데려가는 것',
  '흑막의 그림자가 드리우기 전에 그 정체를 파악하고 결정적 패를 미리 모아두는 것',
]
// ── 6) 복수/청산 대상(전생의 원수) ──────────────────────────────────────────
const P_FOE = [
  '자신의 모든 것을 빼앗고 등 뒤에 칼을 꽂은 전생의 동업자',
  '겉으론 자애로웠으나 뒤에선 가족을 파멸시킨 거대 가문',
  '재능을 짓밟고 부당하게 정상을 차지한 전생의 라이벌',
  '약자를 착취하며 군림하던 부패한 거대 조직·길드',
  '진실을 은폐하고 누명을 씌운 권력의 카르텔',
  '겉으론 은인이었으나 실은 모든 비극을 설계한 흑막',
  '시대를 독점하며 떡잎들을 짓밟아온 업계의 절대 강자',
  '핏줄을 빌미로 평생 그를 도구처럼 부려온 친족',
  '미소 뒤에 칼을 숨기고 그의 모든 것을 가로챈 멘토',
  '돈과 권력으로 진실을 짓뭉개던 거대 언론·자본 연합',
  '그를 버린 뒤 더 큰 자리로 올라간 옛 스승·상사',
  '같은 비극을 설계하기 위해 다시 움직이는, 미래를 아는 또 다른 회귀자',
  '약속을 헌신짝처럼 버리고 그를 사지로 떠민 옛 동료들',
]
// ── 7) 세력 무대(권력 블록) : 하위유형별 ────────────────────────────────────
const P_ARENA: Record<string, string[]> = {
  econ: [
    '재벌가와 투자업계가 패권을 다투는 자본의 전장',
    '상장·인수합병이 칼처럼 오가는 금융 권력의 한복판',
    '구산업과 미래산업이 충돌하는 거대 자본 시장',
    '오너 일가의 후계 다툼이 격렬한 재벌 그룹의 내부',
    '작전 세력과 큰손들이 보이지 않게 칼을 겨누는 증권가',
    '글로벌 자본과 토종 자본이 맞붙는 인수전의 한가운데',
    '벤처와 사모펀드가 미래를 베팅하는 투자판',
  ],
  hunter: [
    '헌터협회와 거대 길드가 서열을 다투는 각성 이후의 세계',
    '게이트와 던전이 일상을 침범한 이중 세계의 한복판',
    'S급 랭커들과 흑막 헌터들이 얽힌 헌터 사회',
    '국가와 협회와 길드가 던전 이권을 두고 다투는 판',
    '랭킹과 등급이 곧 권력인 각성자들의 정글',
    '대균열을 둘러싼 음모가 소용돌이치는 헌터 세계',
    '신흥 길드와 명문 길드가 패권을 다투는 레이드 전장',
  ],
  idol: [
    '거대 기획사들이 시장을 분할 지배하는 연예계의 한복판',
    '데뷔조와 차트가 곧 권력인 아이돌 산업의 전장',
    '음원·방송·팬덤이 얽힌 엔터 권력의 정글',
    '연습생 수천 명이 단 몇 자리를 두고 다투는 데뷔 경쟁',
    '방송국·기획사·투자자가 얽힌 보이지 않는 권력 구도',
    '팬덤과 안티가 여론을 가르는 디지털 전장',
    '대형 소속사와 신흥 레이블이 시장을 다투는 엔터판',
  ],
  sports: [
    '구단·에이전트·협회가 얽힌 프로 리그의 한복판',
    '드래프트와 이적 시장이 운명을 가르는 스포츠 권력의 장',
    '명문 구단과 신흥 세력이 패권을 다투는 리그',
    '프런트의 정치와 감독의 야망이 충돌하는 구단 내부',
    '국가대표 선발과 파벌이 얽힌 협회의 권력 구도',
    '거액의 자본이 선수와 우승을 사들이는 머니게임의 무대',
    '강등과 우승이 한 끗으로 갈리는 치열한 순위 경쟁',
  ],
  corp: [
    '스타트업과 대기업이 미래를 두고 격돌하는 산업의 전장',
    '투자와 기술 패권이 오가는 비즈니스 정글',
    '구질서와 혁신이 충돌하는 거대 기업 생태계',
    '특허와 인재를 두고 소리 없는 전쟁이 벌어지는 시장',
    '대기업의 견제와 견인이 동시에 작동하는 산업 생태계',
    '글로벌 빅테크와 토종 벤처가 맞붙는 기술 전장',
    '규제와 정책이 판도를 좌우하는 신산업의 한가운데',
  ],
  pro: [
    '프로팀·구단·리그가 서열을 다투는 e스포츠 판',
    '드래프트와 이적이 운명을 가르는 프로게이머 세계',
    '메타와 실력이 곧 권력인 경쟁의 무대',
    '스폰서와 구단 자본이 우승을 사들이는 머니게임의 판',
    '연습생과 주전이 단 한 자리를 두고 다투는 팀 내부',
    '리그 운영사와 게임사가 판을 좌우하는 e스포츠 생태계',
    '국가대표와 파벌이 얽힌 종주국 경쟁의 한복판',
  ],
  creator: [
    '거대 플랫폼과 제작사가 IP를 두고 다투는 콘텐츠 산업',
    '공모전·연재·판권이 칼처럼 오가는 창작 권력의 장',
    '트렌드가 곧 권력인 미디어 생태계',
    '출판사·에이전시·플랫폼이 얽힌 보이지 않는 권력 구도',
    '조회수와 랭킹이 운명을 가르는 연재판의 한복판',
    '영상화 판권을 두고 자본이 격돌하는 IP 시장',
    '신예와 거장이 같은 차트를 두고 다투는 창작 전장',
  ],
  food: [
    '상권과 프랜차이즈가 패권을 다투는 외식 산업의 전장',
    '미슐랭과 대중성이 충돌하는 미식 권력의 한복판',
    '식자재·유통·브랜드가 얽힌 외식업의 정글',
    '권리금과 임대 전쟁이 벌어지는 노른자 상권의 한가운데',
    '방송과 SNS가 맛집의 흥망을 가르는 미디어 미식판',
    '대형 프랜차이즈와 개인 식당이 맞붙는 시장',
    '식문화 트렌드와 자본이 충돌하는 외식 생태계',
  ],
}
// ── 8) 정보 누설 긴장(어떻게 알았지? 위장) ──────────────────────────────────
const P_SUSPICION = [
  '미래를 안다는 사실을 천재적 직관과 우연으로 위장하며 주변의 의심을 관리하지만',
  '"어떻게 알았느냐"는 끈질긴 추궁과 데자뷔의 위태로움을 아슬아슬 넘기면서도',
  '재능을 감추려 할수록 거꾸로 주목받는 모순 속에서 정체를 들킬 위험에 시달리지만',
  '예지력으로 둘러대 보지만, 변해버린 자신을 향한 "넌 왜 이렇게 달라졌어?"라는 의심이 커지는 가운데',
  '거듭되는 적중이 오히려 화근이 되어, 그를 이용하거나 제거하려는 자들이 모여들고',
  '미래를 안다는 비밀이 새어 나갈까, 가장 가까운 사람에게조차 진실을 숨겨야 하는 외로움 속에서',
  '천재로 포장된 명성이 커질수록 그 근원을 캐려는 눈들이 늘어나, 한 걸음마다 살얼음을 딛지만',
  '"우연이라기엔 너무 정확하다"는 의심을 사면서도, 미래를 바꾸기 위해 위험을 감수해야 하는 가운데',
  '자신을 회귀자로 의심하는 또 다른 예지자의 시선을 따돌리며 정보를 지켜내야 하지만',
]
// ── 9) 메타지식 무효화(중반 위기 — 나비효과) ───────────────────────────────
const P_DIVERGE = [
  '주인공의 개입으로 미래가 어긋나기 시작하면서, 더는 통하지 않는 메타지식이라는 진짜 위기를 맞고',
  '자신과 똑같이 미래를 아는 또 다른 회귀자가 나타나 정보전의 판이 뒤집히면서',
  '나비효과로 전생엔 없던 새로운 변수와 빌런이 등장해, 아는 미래가 산산이 무너지면서',
  '바뀐 미래 속에서 예지가 무력해지자, 결국 회귀 후 스스로 쌓아온 실력과 사람만이 답이 되는 국면에 이르러',
  '전생엔 없던 거대 사건이 그를 덮치고, 미래지식만 믿던 자신감이 처음으로 산산조각 나면서',
  '바꿔낸 미래가 예상 못 한 더 큰 비극의 씨앗이 되어 돌아오는 역설에 부딪히고',
  '흑막 역시 회귀자임이 드러나, 미래를 아는 자들끼리의 한 치 앞도 모를 두뇌 싸움이 시작되면서',
  '소중한 사람을 지키려던 개입이 도리어 그 사람을 위험에 빠뜨리는 나비효과로 돌아오고',
  '아는 미래가 모두 어긋난 백지의 시간 속에서, 처음으로 진짜 두려움과 마주하면서',
]
// ── 10) 최종 청산·역전(클라이맥스) ──────────────────────────────────────────
const P_CLIMAX = [
  '미래지식이 사라진 자리에서, 두 번째 인생으로 쌓은 실력과 동료를 무기 삼아 전생의 원흉을 압도적으로 무너뜨린다',
  '한때 자신을 짓밟던 거대 존재를 이제는 내려다보는 위치에서, 모든 떡밥과 굴욕을 한 번에 청산한다',
  '전생의 한과 현생의 성취가 한 점에 모이는 정점에서, 못 지킨 모든 것을 이번엔 끝내 지켜낸다',
  '치트가 아닌 자력으로, 회귀 후 두 인생의 합으로 정상에 올라 근원의 흑막을 완전히 끝장낸다',
  '회귀자였던 흑막과의 마지막 두뇌 싸움에서, 미래가 아닌 사람을 믿은 자신이 끝내 승리한다',
  '그동안 심어둔 모든 복선과 동맹을 한꺼번에 회수하며, 적의 제국을 단숨에 무너뜨린다',
  '전생에서 자신을 버린 세상 앞에서, 이번엔 누구도 부정 못 할 압도적 실력으로 정점을 증명한다',
  '잃을 뻔한 모든 것을 마지막 순간 지켜내고, 근원의 비극을 끊어내며 운명을 뒤바꾼다',
  '미래가 백지가 된 진짜 위기에서, 쌓아온 인망과 실력만으로 불가능했던 역전을 완성한다',
]
// ── 11) 정서의 축(두 번 사는 자의 감정) ─────────────────────────────────────
const P_EMOTION = [
  '이미 죽었던 가족을 다시 만나는 회한과, 이번엔 반드시 지키겠다는 절박함',
  '같은 실수를 반복하지 않으려는 다짐과, 두 번째 기회의 무게가 주는 책임감',
  '복수의 통쾌함 뒤에 남는 공허와, 그럼에도 놓을 수 없는 사람들을 향한 애틋함',
  '전생의 무능했던 자아를 마주하는 부끄러움과, 그것을 딛고 일어서는 성장의 카타르시스',
  '아는 미래를 혼자 짊어진 외로움과, 그래도 곁의 사람들을 위해 나아가는 따뜻함',
  '못 지킨 약속에 대한 죄책감과, 이번 생에선 그것을 갚아내려는 간절함',
  '두 번 사는 시간 속에서 진짜 소중한 것이 무엇인지 깨달아가는 성숙함',
  '복수와 용서 사이에서 흔들리며, 끝내 자신만의 답을 찾아가는 갈등',
  '전생의 인연을 다시 마주하는 애틋함과, 이번엔 다른 미래를 만들겠다는 의지',
]
// ── 12) 핵심 조력자(회귀자가 무명일 때 먼저 포섭하는 사람) — 명사구 슬롯 ─────
//   · 모든 항목은 '사람/세력'을 가리키는 명사구로, 다른 슬롯을 전제하지 않는 독립 항목이다.
//   · compose 에서 주격 조사(이/가)를 받침에 맞춰 붙인다.
const P_ALLY = [
  '아직 아무도 알아보지 못한 미래의 천재',
  '의리 하나로 끝까지 곁을 지킬 충직한 오른팔',
  '전생에선 끝내 적이 되었으나 이번엔 손을 잡은 옛 라이벌',
  '세상의 밑바닥을 함께 굴러 본, 둘도 없는 동지',
  '정보의 길목을 쥔, 발 넓은 해결사',
  '돈과 인맥의 물꼬를 터 줄 든든한 후원자',
  '날카로운 통찰로 판을 읽어 주는 책사 같은 참모',
  '전생에 미처 지키지 못해 이번엔 반드시 살려 낼 소중한 사람',
  '무명 시절의 그를 유일하게 믿어 준 은인',
  '실력만은 진짜였으나 기회를 못 만난 비운의 천재',
  '적진 한복판에서 그의 편이 되어 줄 뜻밖의 내부자',
  '같은 상처를 품고 같은 미래를 꿈꾸는 든든한 동행',
]

// ── 13) 엔딩(현판 회귀 — 성취·안정형) ───────────────────────────────────────
const P_ENDING = [
  '모든 빚을 청산하고, 지키고 싶던 사람들과 함께 안정된 제국 위에서 두 번째 인생의 행복을 맞는다',
  '한때 자신을 버린 세상의 정점에 올라, 가족과 동료를 곁에 둔 채 평온한 일상을 되찾는다',
  '못 지킨 것을 모두 지켜낸 끝에, 차기 시대의 새로운 떡밥을 남기며 만족스러운 마침표를 찍는다',
  '두 번째로 살아낸 인생은 비로소 후회 없는 것이 되었다는 잔잔한 여운 속에 막을 내린다',
  '복수도 성공도 이룬 뒤, 이번엔 사랑하는 이들과 평범한 행복을 누리며 끝을 맺는다',
  '바닥에서 정점까지 다시 오른 그가, 자신처럼 절망한 누군가에게 손을 내미는 장면으로 마무리된다',
  '바꿔낸 미래 속에서 모두가 살아남은 풍경을 바라보며, 비로소 안도의 숨을 내쉰다',
  '제국을 후대에 물려주고 일선에서 물러나, 두 번째 인생의 황혼을 평온하게 맞는다',
  '전생과 현생의 모든 한을 풀어낸 끝에, 다시 시작될 새 시대의 문을 여는 여운으로 막을 내린다',
]

// 슬롯 정의 — pool(공통) 또는 byField(하위유형별)
const SLOTS: SlotDef[] = [
  { key: 'trigger', label: '회귀 트리거', icon: '💀', hint: '죽음·배신·후회의 순간 — 두 번째 기회의 무게를 각인', pool: P_TRIGGER },
  { key: 'when', label: '회귀 시점', icon: '⏳', hint: '왜 하필 그때인가 — 중요한 분기 직전', pool: P_WHEN },
  { key: 'knowledge', label: '미래 지식', icon: '🔮', hint: '메타지식 = 무기. 정보 비대칭', byField: P_KNOWLEDGE },
  { key: 'firstCider', label: '첫 사이다', icon: '🥤', hint: '회귀 직후 첫 미래지식 행사·작은 승리(1화 후킹)', byField: P_FIRSTCIDER },
  { key: 'goal', label: '1막 목표', icon: '🎯', hint: '회귀 직후 할 일 체크리스트 — 추진력', pool: P_GOAL },
  { key: 'foe', label: '복수·청산 대상', icon: '⚔️', hint: '전생의 원수 — 응징의 카타르시스', pool: P_FOE },
  { key: 'arena', label: '세력 무대', icon: '🏙️', hint: '현실 시스템 = 무대. 권력 블록', byField: P_ARENA },
  { key: 'ally', label: '핵심 조력자', icon: '🤝', hint: '무명일 때 먼저 포섭하는 사람 — 회귀자의 인망', pool: P_ALLY },
  { key: 'suspicion', label: '정보 누설 긴장', icon: '🕵️', hint: '"어떻게 알았지?" 의심 관리·위장', pool: P_SUSPICION },
  { key: 'diverge', label: '메타지식 무효화', icon: '🦋', hint: '나비효과·변동 — 중반 긴장 회복', pool: P_DIVERGE },
  { key: 'climax', label: '최종 청산·역전', icon: '🔥', hint: '메타지식 붕괴 후 자력 승리(클라이맥스)', pool: P_CLIMAX },
  { key: 'emotion', label: '정서의 축', icon: '💗', hint: '두 번 사는 자의 감정선', pool: P_EMOTION },
  { key: 'ending', label: '엔딩', icon: '🏁', hint: '성취·안정형 마침표(현판 회귀 선호)', pool: P_ENDING },
]

// 하위유형에 맞는 슬롯 풀을 돌려준다.
function poolFor(slot: SlotDef, field: string): string[] {
  if (slot.pool) return slot.pool
  if (slot.byField) return slot.byField[field] || slot.byField[FIELDS[0].key]
  return []
}

// 총 조합수(현재 하위유형 기준 슬롯 풀 크기의 곱) — 1조+ 지향
function totalCombos(field: string): number {
  return SLOTS.reduce((n, s) => n * Math.max(1, poolFor(s, field).length), 1)
}

// 한 편의 시놉시스 문장으로 종합.
function compose(title: string, logline: string, field: string, r: Record<string, string>): string {
  const f = FIELDS.find((x) => x.key === field)
  const fieldLabel = f ? f.label : ''
  const lines: string[] = []
  const T = title.trim() || '(제목 미정)'
  lines.push(`《${T}》 — ${fieldLabel} · 현대판타지 회귀물`)
  // 로그라인: 직접 입력이 없으면 무대·원수 슬롯에서 받침에 맞춰 조사를 붙여 자동 생성.
  if (logline.trim()) {
    lines.push(`한 줄 로그라인: ${logline.trim()}`)
  } else if (r.arena && r.foe) {
    lines.push(`한 줄 로그라인: 미래를 아는 회귀자가 ${r.arena}${euro(r.arena)} 다시 일어서 ${r.foe}${eul(r.foe)} 끝내 무너뜨린다.`)
  }
  lines.push('')

  // [1막] 회귀와 첫 사이다
  if (r.trigger || r.when || r.knowledge) {
    const head = r.trigger ? `${r.trigger}, ` : ''
    const when = r.when ? `${r.when} 의식과 기억을 가진 채 회귀한다. ` : ''
    const know = r.knowledge ? `주인공은 ${r.knowledge} 회귀자다. ` : ''
    lines.push(`■ 발단 — ${head}${when}${know}`.trim())
  }
  if (r.firstCider || r.goal) {
    const fc = r.firstCider ? `다시 눈을 뜬 그는 ${r.firstCider}, ` : ''
    const goal = r.goal ? `이번 생의 목표는 ${r.goal}.` : ''
    lines.push(`${fc}${goal}`.replace(/^,\s*/, '').trim())
  }

  // [2막] 무대·세력·조력자·복수·의심
  const mid: string[] = []
  if (r.arena) mid.push(`그는 ${r.arena}에서 다시 일어선다`)
  if (r.ally) mid.push(`그 곁에는 ${r.ally}${iga(r.ally)} 함께한다`)
  if (r.foe) mid.push(`그의 앞을 가로막는 ${r.foe}${eunneun(r.foe)} 반드시 청산해야 할 전생의 원수다`)
  if (r.suspicion) mid.push(r.suspicion)
  if (mid.length) lines.push(`■ 전개 — ${mid.join('. ')}.`.replace(/\.\./g, '.').trim())

  // [전환] 메타지식 무효화
  if (r.diverge) lines.push(`■ 전환 — ${r.diverge}.`.replace(/\.\./g, '.'))

  // [3막] 청산·역전
  if (r.climax) lines.push(`■ 절정 — ${r.climax}.`.replace(/\.\./g, '.'))

  // 정서·엔딩
  if (r.emotion) lines.push(`정서의 축: ${r.emotion}.`)
  if (r.ending) lines.push(`■ 결말 — ${r.ending}.`.replace(/\.\./g, '.'))

  return lines.filter((l) => l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// 안전한 상태 로드
function loadStr(key: string, fallback: string): string {
  try { const v = localStorage.getItem(LS + ':' + key); return v == null ? fallback : v } catch { return fallback }
}
function loadObj<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(LS + ':' + key); if (v) { const o = JSON.parse(v); if (o && typeof o === 'object') return o as T } } catch { /* noop */ }
  return fallback
}

export default function ModfanSynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const [field, setField] = useState<string>(() => {
    const saved = loadStr('field', '')
    if (saved && FIELDS.some((f) => f.key === saved)) return saved
    return FIELDS[0].key
  })
  const [title, setTitle] = useState<string>(() => loadStr('title', ''))
  const [logline, setLogline] = useState<string>(() => loadStr('logline', ''))
  const [results, setResults] = useState<Record<string, string>>(() => loadObj<Record<string, string>>('results', {}))
  const [locked, setLocked] = useState<Record<string, boolean>>(() => loadObj<Record<string, boolean>>('locked', {}))
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const nonceRef = useRef(0)
  const toastTimerRef = useRef<number | null>(null)
  const seededRef = useRef(false)

  // payload.genre 활용(맥락 일치 시 무시 가능 — 강제 안 함). 미사용 경고 방지.
  const genreCtx = (payload?.genre as string) || meta.genre

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + ':field', field) } catch { /* noop */ } }, [field])
  useEffect(() => { try { localStorage.setItem(LS + ':title', title) } catch { /* noop */ } }, [title])
  useEffect(() => { try { localStorage.setItem(LS + ':logline', logline) } catch { /* noop */ } }, [logline])
  useEffect(() => { try { localStorage.setItem(LS + ':results', JSON.stringify(results)) } catch { /* noop */ } }, [results])
  useEffect(() => { try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* noop */ } }, [locked])

  // 토스트 타이머 정리(언마운트)
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current) }, [])
  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  // 최초 진입 시 비어 있으면 한 번 채워 빈 화면 방지
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    void genreCtx
    if (Object.keys(results).length === 0) {
      const next: Record<string, string> = {}
      SLOTS.forEach((s) => { const p = poolFor(s, field); if (p.length) next[s.key] = pick(p) })
      setResults(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 하위유형이 바뀌면 byField 슬롯의 값이 더 이상 풀에 없으면 다시 굴려 정합성 유지(잠금은 무시)
  useEffect(() => {
    setResults((prev) => {
      let changed = false
      const next = { ...prev }
      SLOTS.forEach((s) => {
        if (!s.byField) return
        const p = poolFor(s, field)
        if (prev[s.key] && !p.includes(prev[s.key])) { next[s.key] = pick(p); changed = true }
      })
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field])

  const rollAll = useCallback(() => {
    setCopied(false)
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      const next: Record<string, string> = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return
        const p = poolFor(s, field)
        if (!p.length) return
        let v = pick(p)
        if (v === prev[s.key] && p.length > 1) v = pick(p)
        next[s.key] = v
      })
      return next
    })
  }, [locked, field])

  const rollOne = useCallback((key: string) => {
    setCopied(false)
    const s = SLOTS.find((x) => x.key === key)
    if (!s) return
    setRolling(true)
    nonceRef.current += 1
    setResults((prev) => {
      const p = poolFor(s, field)
      if (!p.length) return prev
      let v = pick(p)
      if (v === prev[key] && p.length > 1) v = pick(p)
      return { ...prev, [key]: v }
    })
  }, [field])

  // 굴림 애니메이션 자동 해제(경쟁상태/언마운트 정리)
  useEffect(() => {
    if (!rolling) return
    const my = nonceRef.current
    const t = window.setTimeout(() => { if (nonceRef.current === my) setRolling(false) }, 360)
    return () => window.clearTimeout(t)
  }, [rolling, results])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))
  const editSlot = (key: string, v: string) => { setResults((p) => ({ ...p, [key]: v })); setCopied(false) }

  const combos = totalCombos(field)
  const synopsis = compose(title, logline, field, results)
  const filledCount = SLOTS.filter((s) => results[s.key]).length
  const ready = filledCount > 0
  const lockedCount = SLOTS.filter((s) => locked[s.key]).length

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(synopsis).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 종합 시놉시스를 스니펫 라이브러리에 저장
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: synopsis, source: '회귀 시놉시스 빌더', tags: ['시놉시스', '현대판타지', '회귀'] })
    flash('스니펫 라이브러리에 시놉시스를 저장했습니다.')
  }

  // 프로젝트 자료 〈기획〉 폴더에 "시놉시스" 문서로 추가
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const f = FIELDS.find((x) => x.key === field)
    const T = title.trim() || '(제목 미정)'
    const rows = SLOTS
      .filter((s) => results[s.key])
      .map((s) => `<p><b>${esc(s.icon)} ${esc(s.label)}:</b> ${esc(results[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>⏪ 《${esc(T)}》</b> — ${esc(f ? f.label : '')} · 현대판타지 회귀물</p>`,
      logline.trim() ? `<p><i>${esc(logline.trim())}</i></p>` : '',
      `<hr/>`,
      `<p style="white-space:pre-wrap;line-height:1.75;">${esc(synopsis)}</p>`,
      `<hr/>`,
      `<p style="font-size:12px;color:#888;">항목별 정리</p>`,
      rows,
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `시놉시스 — ${esc(T).slice(0, 50)}`,
      bodyHtml,
      synopsis: synopsis.slice(0, 400),
      meta: { 장르: '현대판타지·회귀', 하위유형: f ? f.label : '', 제목: T },
    })
    flash(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>현대판타지·회귀</b> 시놉시스 빌더 — 하위유형을 고르고 각 항목을 굴리면, 회귀물 문법에 맞춰 한 편의 시놉시스로 자동 종합합니다.
        칸을 직접 고쳐 써도 되고, 마음에 드는 항목은 <Emoji e="🔒"/>로 고정하세요.
      </div>

      {/* 하위유형 선택 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {FIELDS.map((f) => {
          const on = f.key === field
          return (
            <button
              key={f.key}
              className="minibtn"
              onClick={() => { setField(f.key); setCopied(false) }}
              aria-pressed={on}
              title={f.tag}
              style={{ opacity: on ? 1 : 0.55, borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={f.icon}/> {f.label}
            </button>
          )
        })}
      </div>
      <div style={{ ...hint, fontStyle: 'italic' }}>{FIELDS.find((f) => f.key === field)?.tag}</div>

      {/* 제목·로그라인 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input style={{ ...input, flex: '1 1 180px' }} placeholder="작품 제목(예: 다시 사는 재벌의 아침)" value={title} onChange={(e) => { setTitle(e.target.value); setCopied(false) }} />
        <input style={{ ...input, flex: '2 1 260px' }} placeholder="한 줄 로그라인(선택) — 비워두면 항목으로 채워집니다" value={logline} onChange={(e) => { setLogline(e.target.value); setCopied(false) }} />
      </div>

      {/* 조합수 */}
      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span>가능한 시놉시스 조합 <b style={{ color: 'var(--accent)' }}>약 {fmtNum(combos)}</b> 가지</span>
        <span>{lockedCount > 0 ? <><Emoji e="🔒"/> {lockedCount}개 고정됨</> : '고정 없음 — 전부 새로 굴림'} · 채움 {filledCount}/{SLOTS.length}</span>
      </div>

      {/* 슬롯 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {SLOTS.map((s) => {
          const v = results[s.key] || ''
          const isLocked = !!locked[s.key]
          const p = poolFor(s, field)
          return (
            <div key={s.key} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}><Emoji e={s.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label} <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10.5 }}>({p.length})</span></div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>{s.hint}</div>
                </div>
                <button className="minibtn" onClick={() => rollOne(s.key)} disabled={isLocked} title="이 항목만 다시 굴리기" style={{ flexShrink: 0 }}><Emoji e="🎲"/></button>
                <button className="minibtn" onClick={() => toggleLock(s.key)} aria-pressed={isLocked} title={isLocked ? '고정 해제' : '이 항목 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
              <textarea
                value={rolling && !isLocked && v ? '…' : v}
                onChange={(e) => editSlot(s.key, e.target.value)}
                placeholder="— 굴리거나 직접 입력 —"
                rows={2}
                style={{ ...input, resize: 'vertical', lineHeight: 1.5, color: v ? 'var(--text)' : 'var(--muted)' }}
              />
            </div>
          )
        })}
      </div>

      {/* 종합 시놉시스 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⏪"/> 종합 시놉시스</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: ready ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
          {ready ? synopsis : '항목을 굴려 시놉시스를 만들어 보세요.'}
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={rollAll}><Emoji e="⏪"/> 전부 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="종합 시놉시스를 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '종합 시놉시스를 프로젝트 자료 〈기획〉 폴더에 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {/* 관련 도구 연계 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="linkbtn" onClick={() => openToolLinked('logline-forge', { genre: genreCtx })} title="로그라인 대장간 열기"><Emoji e="⚒️"/> 로그라인</button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-outline', { genre: genreCtx })} title="개요 빌더 열기"><Emoji e="🏰"/> 개요 빌더</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: genreCtx })} title="플롯 피라미드 열기"><Emoji e="🔺"/> 플롯 피라미드</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: genreCtx })} title="캐릭터 단조 열기"><Emoji e="🧑"/> 인물 단조</button>
        <button className="linkbtn" onClick={() => openToolLinked('world-wiki', { genre: genreCtx })} title="세계관 위키 열기"><Emoji e="📚"/> 세계관 위키</button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      {/* 저작권: 모든 문구는 본 도구가 자체 생성한 창작 풀(외부 텍스트 미사용) */}
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
        <span className="license-badge">자체 창작</span> 모든 슬롯 문구는 이 도구가 자체 작성한 현대판타지 회귀물 오리지널 풀로, 외부 저작물을 사용하지 않습니다.
      </div>
    </div>
  )
}
