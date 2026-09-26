// 액션·전쟁 갈등·딜레마 단조기 — 이 장르 특유의 "충돌 구도"를 슬롯 조합으로 벼려낸다.
//  · 슬롯: 톤 프리셋 / 주역(누가) / 무엇을 위해(목표) / 적대 세력(맞서는 것) / 결정적 제약(시계·지리·자원)
//          / 도덕적 딜레마(둘 다 가질 수 없는 것) / 잃을 수 있는 것(이해관계) / 비틀기(반전 씨앗).
//  · 잠금(🔒)/재생성: 마음에 드는 슬롯은 고정하고 나머지만 다시 굴린다.
//  · 조합수 표시: 슬롯 풀 크기의 곱(잠금 무시한 전체 경우의 수) — 1조 이상.
//  · 한 줄 갈등 구도 + 압박 점검 질문(도시에의 안티패턴/관습 기반)을 자동 제시.
// 자급식: react·'./linkbus' 외 import 없음. 전부 로컬(외부 API 안 씀). localStorage 'sry:tool:action-conflictforge'.
// 연계: 📄 프로젝트에 추가(자료/"갈등" 폴더) · 글감 스니펫 저장(addToLibrary) · 관련 도구 열기(openToolLinked).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'action-conflictforge', name: '액션·전쟁 갈등 단조기', icon: '⚔️', group: '생성기', genre: '액션·전쟁', intro: '주역·목표·적대·제약·딜레마를 벼려 이 장르다운 갈등 구도를 만듭니다', w: 640, h: 720 }

// ───────────────────────── 톤 프리셋(도시에: 대표작 계보 → 톤 묶음) ─────────────────────────
interface Tone { key: string; label: string; icon: string; hint: string; lean: string }
const TONES: Tone[] = [
  { key: 'catharsis', label: '영웅·카타르시스', icon: '🔥', hint: '개인 무력의 통쾌한 과시 · 위기→탈출 펄스 (존 윅·잭 리처·다이하드)', lean: '통쾌하게 응징하되 대가를 남긴다' },
  { key: 'disillusion', label: '반전·환멸', icon: '🩸', hint: '참호·소모·환멸 · "무엇을 위해 싸우나" (서부전선 이상 없다·캐치-22)', lean: '승리조차 공허하게 만든다' },
  { key: 'strategy', label: '전략·정치', icon: '♟️', hint: '병참·첩보·기만 · 머리 싸움과 체제 (은하영웅전설·킬러 엔젤스·유녀전기)', lean: '한 수의 계략이 전선을 가른다' },
  { key: 'martial', label: '무협·초식', icon: '🗡️', hint: '내공·절기·비무·문파전 (화산귀환·베르세르크·킹덤)', lean: '초식의 파훼와 경지의 돌파로 이긴다' },
  { key: 'hunter', label: '헌터·각성', icon: '🌀', hint: '각성·스킬·레이드·길드전 (나 혼자만 레벨업·전지적 독자 시점)', lean: '성장과 각성으로 격차를 뒤집는다' },
  { key: 'tragedy', label: '비극·희생', icon: '🕯️', hint: '희생적 후위·대가 있는 승리 · 무게의 물건 (그들이 가지고 다닌 것들)', lean: '누군가를 남겨두고 떠난다' },
]

// ───────────────────────── 슬롯 풀(장르 특화·구체) ─────────────────────────
// 각 풀은 "일반론" 금지 — 액션·전쟁 도시에의 어휘/장치/관습에서 직접 길어 올린 구체항.

// 주역(누가 싸우는가) — 개인 무력 ↔ 집단 전략 스펙트럼을 아우른다.
const WHO = [
  '탄약도 지원도 끊긴 채 고립된 분대장', '명령 불복으로 강등된 베테랑 저격수', '내공이 흩어져 한 줌만 남은 노검객',
  '갓 각성한 최하급 헌터', '전선 전체를 책임진 젊은 함대 사령관', '복수를 위해 은퇴를 깬 전직 청부살수',
  '동생의 누명을 진 채 추격당하는 탈영병', '문파의 마지막 적전제자', '인질이 된 동료를 둔 특수부대 팀장',
  '거짓 전공으로 진급한 비겁한 장교', '한쪽 팔을 잃고도 검을 든 검호', '적의 언어를 아는 척후병',
  '보급선을 지키다 포위된 수송대장', '주화입마 직전의 사파 고수', '레이드 전멸 후 홀로 살아남은 딜러',
  '거점 사수 명령을 받은 신병', '전령 임무로 적진을 가로지르는 소년병', '항복을 거부한 고립 수비대의 지휘관',
  '의수에 칼을 숨긴 퇴역 용병', '회귀해 같은 전쟁을 다시 치르는 참모',
  '심법이 역류해 발작을 누르며 싸우는 마교 교주', '소대원을 모두 잃고 무전만 붙든 분대 막내',
  '적의 절기를 훔쳐 익힌 정파의 이단아', '탱커가 죽어 홀로 보스를 막는 힐러',
  '거짓 항복으로 적진에 잠입한 첩보 장교', '한 번의 발도로 승부를 보는 무명의 검객',
  '경공으로 적장의 막사를 노리는 자객', '폭파 전문 공병으로 다리를 끊으러 온 병사',
]

// 무엇을 위해(목표) — 명료하고 이해관계가 걸린 목적.
const GOAL = [
  '증원이 오기 전까지 다리를 끝까지 사수하는 것', '인질이 처형되기 전에 빌딩을 돌파하는 것',
  '적의 보급선을 끊어 전세를 뒤집는 것', '문파를 멸문시킨 절기의 약점을 알아내는 것',
  '최후의 한 발로 적장의 목을 거두는 것', '동료의 시신을 적진에서 끌고 나오는 것',
  '거짓 무전으로 적을 골짜기로 유인하는 것', '만조가 차오르기 전에 해안 거점을 점령하는 것',
  '각성하지 못한 동기들을 살려 던전을 빠져나오는 것', '배신한 상관의 음모를 전선에 폭로하는 것',
  '봉인된 비기를 완성해 천하제일을 꺾는 것', '폭탄이 터지기 전 기폭장치를 무력화하는 것',
  '포위망의 단 하나뿐인 약한 고리를 뚫는 것', '항복 협상을 미끼로 시간을 버는 것',
  '적의 기함을 단 한 번의 돌격으로 격침하는 것', '길드 마스터의 자리를 비무로 되찾는 것',
  '민간인 피란 행렬을 마지막 한 명까지 후송하는 것', '전우의 마지막 부탁이 적힌 편지를 본국으로 부치는 것',
  '적 저격수를 역으로 유인해 단 한 발로 제압하는 것', '무너지는 갱도에서 갇힌 소대를 끌어내는 것',
  '내공이 다하기 전 마지막 절기로 결계를 부수는 것', '레이드 보스의 패턴이 바뀌기 전에 핵심을 베는 것',
  '고지를 일출 전에 점령해 포대를 무력화하는 것', '거짓 기수를 세워 적의 주력을 엉뚱한 곳으로 돌리는 것',
  '부서진 무전기를 고쳐 증원을 부르는 것', '스승을 벤 그 초식을 끝내 파훼해 되갚는 것',
]

// 적대 세력(맞서는 것) — 무력 격차 사다리 위쪽.
const FOE = [
  '수적으로 압도하는 정예 추격대', '주인공보다 한 경지 위인 검의 절대자',
  '병참과 정보를 모두 쥔 적국 참모본부', '약점이 없어 보이는 각성 보스 몬스터',
  '아군으로 위장한 내부의 첩자', '항복을 모르는 광신적 사병 집단',
  '하늘을 뒤덮은 적 함대', '주인공의 시그니처 기술을 이미 파훼한 호적수',
  '명령 한 줄로 포격을 쏟는 후방의 지휘부', '같은 무공을 더 깊이 익힌 동문의 배신자',
  '시한이 정해진 무자비한 시계(폭탄·증원·만조)', '아무도 살려 보내지 않는 봉쇄선',
  '주인공을 미끼로 쓰려는 아군 사령부', '죽음을 두려워하지 않는 자폭 돌격대',
  '전장을 통째로 집어삼키는 화력의 폭풍', '예언처럼 매번 한 수 앞서는 책략가',
  '과거의 스승이자 지금의 원수', '레이드를 전멸시킨 정체불명의 네임드',
  '회귀 전 주인공을 죽인 바로 그 적장', '제압 사격으로 고개도 못 들게 하는 기관총좌',
  '독과 암기로 정면 승부를 피하는 사파의 살수', '쿨타임마다 광역기를 쏟는 네임드 보스',
  '거짓 정보로 아군을 함정에 빠뜨린 이중간첩', '백병전에서 한 번도 진 적 없는 적의 돌격대장',
  '주인공의 약점을 정확히 아는 옛 동료', '항복 깃발 뒤에 매복을 숨긴 기만의 명수',
]

// 결정적 제약(시계·지리·자원) — 액션 긴장의 증폭기. 도시에의 ticking clock/geography/cost.
const CONSTRAINT = [
  '증원 도착까지 단 17분, 그 안에 끝내야 한다', '탄창에 남은 건 마지막 한 발뿐이다',
  '내공이 바닥나 한 초식만 더 쓸 수 있다', '출혈이 멈추지 않아 의식이 흐려지는 부상 시계가 돌아간다',
  '퇴로는 무너진 다리 하나, 건너면 끊어야 한다', '폭탄 타이머가 00:00을 향해 줄어든다',
  '안개가 걷히면 적 저격수에게 모두 노출된다', '만조가 차오르며 발 디딜 곳이 사라진다',
  '무전기 배터리가 한 통화분만 남았다', '스킬 쿨타임이 돌아오기까지 무방비다',
  '엄폐물은 부서진 전차 한 대가 전부다', '일출과 함께 적의 총공세가 시작된다',
  '동료를 업으면 두 배 느려지고, 두고 가면 산다', '연료가 한 번의 도주분밖에 남지 않았다',
  '검이 부러져 손잡이만 쥐고 있다', '독이 심장에 닿기까지 세 호흡이 남았다',
  '고지를 먼저 차지한 쪽이 전장을 지배한다', '인질의 발밑에도 압력식 지뢰가 깔려 있다',
  '교량이 무너지기까지 버틸 수 있는 건 단 한 번의 도하뿐이다', '진기가 흩어져 호흡 한 번에 한 초식밖에 못 펼친다',
  '구조 헬기는 단 한 대, 태울 수 있는 인원이 정해져 있다', '포탄 한 발이 남아 표적을 단 한 번만 노릴 수 있다',
  '버프 지속시간이 끝나면 본래의 약체로 돌아간다', '적의 증원 종대가 능선 너머에서 다가오고 있다',
  '식수가 떨어져 한 모금이면 더는 움직일 수 없다', '폭설로 보급로가 끊겨 가진 탄으로만 버텨야 한다',
]

// 도덕적 딜레마(둘 다 가질 수 없는 것) — 도시에: 양립 불가 가치 사이의 선택.
const DILEMMA = [
  '임무 완수와 동료의 목숨 중 하나만 고를 수 있다', '명령에 복종하면 민간인이 죽고, 거역하면 군법에 회부된다',
  '복수를 이루면 자신이 증오하던 괴물이 된다', '거점을 사수하면 부하 절반이, 후퇴하면 전선 전체가 무너진다',
  '비기를 완성하려면 한때 맹세한 무인의 도를 저버려야 한다', '진실을 알리면 사기가 무너지고, 숨기면 더 많이 죽는다',
  '한 명을 미끼로 쓰면 열을 구하지만 그 한 명은 친구다', '적의 자비를 받아들이면 살지만 자존이 죽는다',
  '약자를 구하느라 작전 시한을 놓친다', '배신자를 처형하면 정의롭되 그가 남긴 정보를 잃는다',
  '항복하면 부하는 살지만 끝까지 믿어준 동맹을 판다', '각성의 대가로 인간의 무언가를 영구히 내준다',
  '스승의 약점을 찌르는 순간 제자의 자격을 스스로 부정한다', '포로를 데려가면 모두 느려지고, 버리면 적이 정보를 얻는다',
  '승리의 공을 비겁한 상관에게 넘겨야 부대가 산다', '아군의 오발을 덮으면 진급하고, 밝히면 동료가 처벌받는다',
  '다리를 끊으면 추격을 막지만 아직 건너지 못한 아군을 버린다', '금기의 마공을 쓰면 이기되 다시는 인간으로 못 돌아온다',
  '적장을 살려 보내면 정보를 얻지만 전우의 원수를 놓아준다', '회귀의 비밀을 말하면 동료를 구하나 미친 사람 취급을 받는다',
  '인질을 쏘면 작전이 성공하고, 쏘지 않으면 모두가 죽는다', '스승의 유언을 따르면 패하고, 어기면 이기되 도를 잃는다',
  '구조 신호를 보내면 위치가 들통나 더 큰 부대가 몰려온다', '약자를 버리면 빠르지만 그 순간 지키려던 명분이 사라진다',
]

// 잃을 수 있는 것(이해관계·대가) — 무손상 승리 방지, Pyrrhic을 유도.
const STAKE = [
  '끝까지 함께한 마지막 전우', '아직 한 번도 부르지 못한 동생의 이름',
  '평생을 바친 문파의 명예', '두 번 다시 잡을 수 없는 검을 쥐던 손',
  '돌아가면 청혼하기로 한 약속', '자신을 인간으로 붙잡아 두던 마지막 신념',
  '전우가 맡긴 편지와 그 약속', '한 마을 전체가 살아남을 단 한 번의 기회',
  '되찾으려던 명예 대신 얻은 영원한 누명', '스승에게 물려받은 단 하나의 절기',
  '함께 회귀를 약속한 동료와의 신뢰', '다시는 웃지 못하게 될 자신의 일부',
  '부대원 전원의 생환이라는 단 하나의 자부심', '적이었으나 끝내 존경하게 된 호적수의 목숨',
  '평화를 본 적 없는 소년병의 순진함', '고향으로 돌아갈 마지막 보급선',
  '단전이 부서져 다시는 무공을 쓰지 못할 몸', '회귀의 기회를 단 한 번 더 쓸 권리',
  '부대원들이 끝까지 믿어준 지휘관으로서의 자격', '복수를 끝낸 뒤 텅 비어버릴 삶의 이유',
  '적이 되기 전 함께 검을 배우던 의형제', '한 번도 진 적 없다는 검호로서의 긍지',
  '살아남으면 함께 고향에 가기로 한 분대원들', '두 번 다시 돌아오지 않을 단 한 번의 기습 기회',
  '적에게 넘어가면 전선이 무너질 작전 지도', '주인공만이 기억하는 미래를 바꿀 마지막 변수',
]

// 비틀기(반전 씨앗) — 도시에: 반전 클라이맥스/거짓 안전지대/체호프의 무기/시그니처 봉인.
const TWIST = [
  '진짜 적은 외부가 아니라 아군 지휘부였다', '구하러 온 인질이 이미 적과 한패다',
  '시그니처 기술이 마지막 순간 적에게 그대로 되돌아온다', '1막에 무심코 보인 환경 요소가 승부를 가른다',
  '증원이 온다는 무전 자체가 적의 기만이었다', '봉인했던 옛 무공을 다시 쓰는 순간 주화입마가 시작된다',
  '안전지대에 들어선 직후 가장 큰 기습이 닥친다', '약점이라 믿은 적의 빈틈이 사실은 함정이다',
  '동료의 마지막 선물이 클라이맥스에서 비로소 발화한다', '항복을 받아낸 적장이 사실 회귀 전의 자신이다',
  '마지막 한 발이 적이 아니라 자신을 향해야 한다', '이긴 줄 알았던 전투가 더 큰 함정의 1막일 뿐이다',
  '구원자로 믿었던 동맹이 전장을 팔아넘겼다', '각성의 진짜 대가가 승리 직후에 청구된다',
  '죽은 줄 알았던 전우가 적의 손에 살아 돌아온다', '시계가 멎은 것이 아니라, 누군가 멈춰준 것이다',
  '적의 절대적 강함이 사실은 빌려 쓴 시한부 힘이었다', '구해야 할 인질이 이 전쟁을 일으킨 장본인이다',
  '아군 포격의 좌표가 주인공의 위치로 찍혀 있었다', '파훼했다고 믿은 초식에 두 번째 변초가 숨어 있었다',
  '승리의 깃발을 꽂는 순간 발밑의 폭약이 작동한다', '믿었던 회귀의 기억이 적이 심은 거짓이었다',
  '마지막 증원이 적이 아니라 배신한 아군을 향한 것이었다', '죽인 줄 알았던 보스가 더 강한 2페이즈로 부활한다',
]

// 무대·세트피스(어디서·고유 지리와 제약) — 도시에: set-piece는 고유 장소·제약·합병증을 가진다.
const STAGE = [
  '엄폐물 하나 없는 무너진 다리 위', '연막에 잠긴 좁은 골목의 시가전',
  '함포가 교차하는 두 기함 사이의 갑판', '천장이 무너져 내리는 지하 벙커',
  '눈보라가 시야를 지우는 고산 능선', '인질이 갇힌 초고층 빌딩의 옥상',
  '비무대 위, 사방이 적의 시선인 문파 결투장', '보스 룸으로 통하는 마지막 던전 회랑',
  '참호와 철조망이 끝없이 이어진 무인지대', '만조가 차오르는 갯벌의 상륙 거점',
  '폭우 속 미끄러지는 화물열차의 지붕', '불길이 번지는 군수창고 한복판',
  '암초에 걸린 침몰선의 기울어진 선실', '증원이 쏟아지는 적 점령 도시의 광장',
  '한 발 헛디디면 추락인 절벽 잔도', '독무가 차오르는 봉인된 사파의 동부',
  '레이드 보스의 브레스가 휩쓰는 개활지', '아군과 적이 뒤섞인 백병전의 진흙탕',
  '저격수가 노리는 십자포화 한가운데', '지뢰밭으로 둘러싸인 단 하나의 통로',
  '폭약이 설치된 댐의 점검 통로', '회귀 전 자신이 죽었던 바로 그 고지',
  '무전이 끊긴 적 후방의 통신 기지', '함정과 기관이 빼곡한 사파 본거지의 밀실',
  '아군 포격 좌표 안에 갇힌 점령지의 폐허', '한 줄로만 통과할 수 있는 산악 협로',
  '인질을 태운 채 질주하는 장갑열차 객실', '결계가 무너지는 비동(秘洞)의 마지막 제단',
]

// 슬롯 메타(라벨/풀/이모지) — 렌더 순서.
interface SlotDef { key: string; label: string; icon: string; pool: string[]; verb: string }
const SLOTS: SlotDef[] = [
  { key: 'who', label: '주역', icon: '🎯', pool: WHO, verb: '누가 싸우는가' },
  { key: 'goal', label: '목표', icon: '🏁', pool: GOAL, verb: '무엇을 위해' },
  { key: 'foe', label: '적대', icon: '☠️', pool: FOE, verb: '무엇이 가로막는가' },
  { key: 'stage', label: '무대·세트피스', icon: '🗺️', pool: STAGE, verb: '어디서 벌어지는가' },
  { key: 'constraint', label: '결정적 제약', icon: '⏳', pool: CONSTRAINT, verb: '시계·지리·자원' },
  { key: 'dilemma', label: '도덕적 딜레마', icon: '⚖️', pool: DILEMMA, verb: '둘 다 가질 수 없다' },
  { key: 'stake', label: '걸린 것', icon: '💥', pool: STAKE, verb: '실패의 대가' },
  { key: 'twist', label: '비틀기', icon: '🌪️', pool: TWIST, verb: '반전의 씨앗' },
]

// ───────────────────────── 압박 점검 질문(도시에 관습/안티패턴) ─────────────────────────
const SHARPEN: { id: string; q: string }[] = [
  { id: 's1', q: '독자가 전장 지리(누가 어디 있고 출구·엄폐·거리·시한이 무엇인지)를 머릿속에 그릴 수 있는가?' },
  { id: 's2', q: '싸움 전에 "무엇을 잃는가"가 명확히 설치되어 있는가? (이해관계 사전 설치)' },
  { id: 's3', q: '주인공의 강함·약점·자원(탄약·내공·쿨타임)이 규칙으로 작동하는가? (데우스 엑스 마키나 금지)' },
  { id: 's4', q: '승리가 운빨이 아니라 머리·준비·희생·약점공략으로 정당화되는가?' },
  { id: 's5', q: '시계 장치(타이머·증원·만조)가 클라이맥스에서 제때 멎거나 폭발하는가?' },
  { id: 's6', q: '딜레마의 두 선택지가 정말로 양립 불가능하고, 어느 쪽도 공짜가 아닌가?' },
  { id: 's7', q: '승리에 영구적 대가(Pyrrhic)가 따르는가? 무손상 승리의 반복은 아닌가?' },
  { id: 's8', q: '적이 명백히 한 경지 위에서 시작해, 격차 해소 과정이 보이는가?' },
  { id: 's9', q: '체호프의 무기(1막 환경 요소·시그니처 기술)가 회수되도록 심어 두었는가?' },
  { id: 's10', q: '전쟁물이라면 지휘부(전략)와 현장 병사(생존)의 비용을 함께 보여주는가?' },
]

// ───────────────────────── 유틸 ─────────────────────────
const LS = 'sry:tool:action-conflictforge'
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
function escHtml(s: string): string { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// 조합수: 모든 슬롯 풀 크기의 곱 × 톤 프리셋 수. (잠금 무시한 전체 경우의 수)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1) * TONES.length
function fmtCombos(n: number): string {
  // 한국어 만/억/조 단위로 가독성 있게.
  const jo = 1e12, eok = 1e8, man = 1e4
  if (n >= jo) return `${(n / jo).toFixed(2)}조`
  if (n >= eok) return `${(n / eok).toFixed(1)}억`
  if (n >= man) return `${(n / man).toFixed(0)}만`
  return n.toLocaleString('ko-KR')
}

type SlotVals = Record<string, string>
function rollAll(prev: SlotVals, locked: Record<string, boolean>): SlotVals {
  const next: SlotVals = { ...prev }
  SLOTS.forEach((s) => {
    if (locked[s.key] && prev[s.key]) return
    let v = pick(s.pool)
    if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 중복 완화
    next[s.key] = v
  })
  return next
}

// 한 줄 갈등 구도 — 슬롯을 자연스러운 한국어 문장으로 엮는다.
function composeLine(v: SlotVals, tone: Tone): string {
  const who = v.who || '주인공'
  const goal = (v.goal || '목표를 이루려 하지만').replace(/[.。]$/, '')
  const foe = (v.foe || '적').replace(/[.。]$/, '')
  const stg = (v.stage || '').replace(/[.。]$/, '')
  const con = (v.constraint || '').replace(/[.。]$/, '')
  const dil = (v.dilemma || '').replace(/[.。]$/, '')
  const stk = (v.stake || '').replace(/[.。]$/, '')
  let s = stg ? `${stg}에서, ${who}은(는) ${goal}려 하지만, ${foe}이(가) 앞을 막는다.`
             : `${who}은(는) ${goal}려 하지만, ${foe}이(가) 앞을 막는다.`
  if (con) s += ` ${con}.`
  if (dil) s += ` 그리고 ${dil}.`
  if (stk) s += ` 실패하면 ${stk}을(를) 잃는다.`
  s += ` — 톤: ${tone.lean}.`
  return s
}

interface Saved { id: string; tone: string; vals: SlotVals; checks: Record<string, boolean>; note: string; at: number }

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return []
    const p = JSON.parse(raw)
    const arr = Array.isArray(p?.saved) ? p.saved : []
    return arr.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
      id: String(x.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))),
      tone: TONES.some((t) => t.key === x.tone) ? x.tone : 'catharsis',
      vals: x.vals && typeof x.vals === 'object' ? x.vals : {},
      checks: x.checks && typeof x.checks === 'object' ? x.checks : {},
      note: String(x.note || ''),
      at: Number(x.at) || Date.now(),
    }))
  } catch { return [] }
}

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function ActionConflictForge({ payload }: { payload?: Record<string, unknown> }) {
  const genreCtx = typeof payload?.genre === 'string' ? (payload.genre as string) : '액션·전쟁'

  const initSaved = useRef(loadSaved())
  const [toneKey, setToneKey] = useState<string>('catharsis')
  const [vals, setVals] = useState<SlotVals>(() => rollAll({}, {}))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [rolling, setRolling] = useState(false)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState<Saved[]>(initSaved.current)
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const mounted = useRef(true)

  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]
  const line = composeLine(vals, tone)
  const checkedCnt = SHARPEN.filter((q) => checks[q.id]).length

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // 저장 목록 영속화.
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ saved })) }
    catch { if (mounted.current) setToast('이 브라우저에서 저장이 막혀 있어요.') }
  }, [saved])

  // 토스트 자동 소거(언마운트 정리).
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 1900)
    return () => window.clearTimeout(t)
  }, [toast])

  // 굴림 애니메이션 자동 해제(언마운트 정리).
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => { if (mounted.current) setRolling(false) }, 340)
    return () => window.clearTimeout(t)
  }, [rolling, vals])

  const roll = () => {
    setVals((prev) => rollAll(prev, locked))
    setRolling(true)
    setConfirmDel(null)
  }
  const toggleLock = (k: string) => setLocked((p) => ({ ...p, [k]: !p[k] }))
  const rerollOne = (k: string) => {
    setVals((prev) => {
      let v = pick(SLOTS.find((s) => s.key === k)!.pool)
      const pool = SLOTS.find((s) => s.key === k)!.pool
      if (v === prev[k] && pool.length > 1) v = pick(pool)
      return { ...prev, [k]: v }
    })
    setRolling(true)
  }
  const toggleCheck = (qid: string) => setChecks((p) => ({ ...p, [qid]: !p[qid] }))

  // 평문 내보내기.
  const plain = (): string => {
    const lines = [
      `[액션·전쟁 갈등 구도] (${tone.icon} ${tone.label})`,
      '',
      line,
      '',
      ...SLOTS.map((s) => `· ${s.icon} ${s.label}: ${vals[s.key] || '—'}`),
    ]
    const cs = SHARPEN.filter((q) => checks[q.id])
    if (cs.length) { lines.push('', `압박 점검 ${cs.length}/${SHARPEN.length}:`); cs.forEach((q) => lines.push(`  [v] ${q.q}`)) }
    if (note.trim()) lines.push('', `메모: ${note.trim()}`)
    return lines.join('\n')
  }

  const copy = (text: string, label = '복사됨') => {
    const done = () => { if (mounted.current) setToast(label) }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done))
      else fallback(text, done)
    } catch { fallback(text, done) }
  }
  const fallback = (text: string, done: () => void) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
    } catch { if (mounted.current) setToast('복사 실패') }
  }

  // 현재 구도를 저장 목록에 추가.
  const saveCurrent = () => {
    const rec: Saved = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      tone: toneKey, vals: { ...vals }, checks: { ...checks }, note: note.trim(), at: Date.now(),
    }
    setSaved((p) => [rec, ...p])
    setToast('갈등 구도를 저장했어요.')
  }
  const restore = (s: Saved) => {
    setToneKey(s.tone); setVals({ ...s.vals }); setChecks({ ...s.checks }); setNote(s.note); setLocked({})
    setToast('불러왔어요.'); setConfirmDel(null)
  }
  const remove = (id: string) => { setSaved((p) => p.filter((x) => x.id !== id)); setConfirmDel(null) }

  // 글감 스니펫 라이브러리에 저장(여러 도구 공유).
  const saveSnippet = () => {
    const tags = ['글감', '갈등', '액션·전쟁', tone.label, ...SLOTS.slice(0, 3).map((s) => vals[s.key]).filter(Boolean)]
    addToLibrary('snippets', { text: `[액션·전쟁 갈등] ${line}`, source: '액션·전쟁 갈등 단조기', tags })
    setToast('스니펫 라이브러리에 저장했어요.')
  }

  // 프로젝트 자료 〈갈등〉 폴더에 문서 추가.
  const toProject = () => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const dash = '<span style="color:#888">—</span>'
    const rows = SLOTS.map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}</b><br>${vals[s.key] ? escHtml(vals[s.key]) : dash}</p>`).join('')
    const cs = SHARPEN.filter((q) => checks[q.id])
    const checkHtml = cs.length
      ? `<hr/><p><b>🔥 압박 점검 ${cs.length}/${SHARPEN.length}</b></p>` + cs.map((q) => `<p>✅ ${escHtml(q.q)}</p>`).join('')
      : ''
    const noteHtml = note.trim() ? `<hr/><p><b>🗒️ 메모</b><br>${escHtml(note.trim())}</p>` : ''
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>${escHtml(tone.icon)} ${escHtml(line)}</b></p>`,
      `<hr/>`,
      rows,
      checkHtml,
      noteHtml,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '갈등',
      title: `⚔️ ${(vals.who || '갈등 구도').slice(0, 24)} — ${tone.label}`,
      bodyHtml,
      synopsis: line,
      meta: { 장르: genreCtx, 톤: tone.label, 주역: vals.who || '—', 조합수: fmtCombos(COMBOS) + ' 통' },
    })
    setToast(id ? '프로젝트 자료 〈갈등〉 폴더에 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)', overflow: 'hidden' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0 }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const lab: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 600 }
  const area: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical', minHeight: 46, lineHeight: 1.5, fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 18 }}><Emoji e="⚔️"/></span>
        <strong style={{ fontSize: 14 }}>액션·전쟁 갈등 단조기</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>조합 약 <b style={{ color: 'var(--accent)' }}>{fmtCombos(COMBOS)}</b> 가지</span>
        <span style={{ flex: 1 }} />
        {toast && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{toast}</span>}
      </div>

      <div style={scroll}>
        {/* 톤 프리셋 */}
        <div style={card}>
          <div style={{ ...lab, marginBottom: 6 }}><Emoji e="🎭"/> 톤 프리셋 — 개인 무력 ↔ 집단 전략 / 카타르시스 ↔ 비극</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TONES.map((t) => {
              const on = t.key === toneKey
              return (
                <button key={t.key} className="minibtn" onClick={() => setToneKey(t.key)} title={t.hint}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--chrome-2)' : undefined, color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Emoji e={t.icon}/> {t.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}><Emoji e={tone.icon}/> {tone.hint}</div>
        </div>

        {/* 한 줄 갈등 구도 */}
        <div style={{ ...card, border: '1px solid var(--accent)', background: 'var(--chrome-2)' }}>
          <div style={{ ...lab, marginBottom: 4 }}><Emoji e="📝"/> 한 줄 갈등 구도</div>
          <div style={{ fontSize: 14, lineHeight: 1.65, fontWeight: 500 }}>{line}</div>
        </div>

        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((s) => {
            const isLocked = !!locked[s.key]
            const v = vals[s.key]
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, ...card }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.15)' : 'none' }}><Emoji e={s.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.label} · <span style={{ opacity: 0.8 }}>{s.verb}</span> <span style={{ opacity: 0.55 }}>({s.pool.length}종)</span></div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: v ? 'var(--text)' : 'var(--muted)' }}>{rolling && !isLocked ? '…' : (v || '— 굴려주세요 —')}</div>
                </div>
                <button className="minibtn" onClick={() => rerollOne(s.key)} title="이 슬롯만 다시" style={{ flexShrink: 0, padding: '4px 7px' }}><Emoji e="🎲"/></button>
                <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, padding: '4px 7px', borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            )
          })}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ flex: 1, minWidth: 140 }} onClick={roll}><Emoji e="⚔️"/> 갈등 단조(전체 굴리기)</button>
          <button className="minibtn" onClick={() => copy(plain())}><Emoji e="📋"/> 복사</button>
          <button className="minibtn" onClick={saveCurrent}><Emoji e="⭐"/> 저장</button>
        </div>

        {/* 압박 점검 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={lab}><Emoji e="🔥"/> 압박 점검 (이 장르 관습·안티패턴)</span>
            <span style={{ fontSize: 11, color: checkedCnt === SHARPEN.length ? 'var(--ok)' : 'var(--muted)' }}>{checkedCnt}/{SHARPEN.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {SHARPEN.map((q) => {
              const on = !!checks[q.id]
              return (
                <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--ok)' : 'var(--border)'), background: on ? 'var(--chrome-2)' : 'var(--paper)' }}>
                  <input type="checkbox" checked={on} onChange={() => toggleCheck(q.id)} style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, accentColor: 'var(--ok)', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: on ? 'var(--text)' : 'var(--muted)' }}>{q.q}</span>
                </label>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>망설여지는 항목이 곧 보강할 지점입니다. 특히 ③ 데우스 엑스 마키나 · ⑦ 무손상 승리는 이 장르의 가장 흔한 함정입니다.</div>
        </div>

        {/* 메모 */}
        <div style={card}>
          <div style={{ ...lab, marginBottom: 6 }}><Emoji e="🗒️"/> 메모 (세트피스 아이디어, 전환점, 클라이맥스 방향)</div>
          <textarea style={area} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 다리 폭파 세트피스로 1막 마무리 → 중간 패배(주인공 무장 해제) → 마지막 한 발로 역전" maxLength={600} />
        </div>

        {/* 연계 */}
        <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
          <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '이 갈등 구도를 프로젝트 자료(갈등 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          <button className="linkbtn" onClick={saveSnippet} title="현재 갈등 구도를 글감 스니펫 라이브러리에 저장"><Emoji e="📎"/> 글감 스니펫 저장</button>
          <button className="linkbtn" onClick={() => openToolLinked('conflict-builder', { genre: genreCtx })} title="갈등 설계기로 더 깊이 다듬기"><Emoji e="🔗"/> 갈등 설계기</button>
          <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: genreCtx })} title="이 갈등을 장면으로 발전"><Emoji e="🔗"/> 장면 단조기</button>
        </div>

        {/* 저장 목록 */}
        {saved.length > 0 && (
          <div style={card}>
            <div style={{ ...lab, marginBottom: 8 }}><Emoji e="⭐"/> 저장한 갈등 구도 ({saved.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => {
                const st = TONES.find((t) => t.key === s.tone) || TONES[0]
                const preview = composeLine(s.vals, st)
                return (
                  <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', background: 'var(--paper)' }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}><span style={{ color: 'var(--accent)' }}><Emoji e={st.icon}/> {st.label}</span> · {preview}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                      <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => restore(s)}>불러오기</button>
                      <span style={{ flex: 1 }} />
                      <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--warn)' }} onClick={() => setConfirmDel(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                    {confirmDel === s.id && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--warn)' }}>삭제할까요?</span>
                        <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11, background: 'var(--warn)' }} onClick={() => remove(s.id)}>삭제</button>
                        <button className="minibtn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>취소</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center', paddingBottom: 4 }}>
          잠근 슬롯은 그대로 두고 나머지만 다시 단조합니다 · 슬롯 풀 조합 약 {fmtCombos(COMBOS)} 가지({COMBOS.toLocaleString('ko-KR')}) · 장르: {genreCtx}
        </div>
      </div>
    </div>
  )
}
