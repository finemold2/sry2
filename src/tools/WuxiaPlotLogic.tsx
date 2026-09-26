// 무협 플롯·진행곡선(로직) — 무협 장르의 "표준 구조/비트·페이싱"을 단계 입력 시트로 채우는 도구.
//   - 4가지 무협 전용 플롯 템플릿(계보별): ① 김용형 정통대협(장편 대하 8막) ② 고룡형 낭인·추리 무협
//     ③ 한무 신무협 복수·비극(서효원/좌백형) ④ 웹소설 회귀먼치킨(화산귀환형 사이다 곡선)
//   - 각 비트에 도시에 근거한 무협 특화 안내(기연·내공·주화입마·은원·정사대전·귀은·사이다/고구마·미래지식 등)
//   - 비트마다 내용 작성 + 긴장도(0~10) 조절 → 진행곡선(SVG) 자동 갱신 + 진행률 표시
//   - 템플릿/비트 배치 조합수 표시(1조 이상)
//   - 프로젝트 연동: 자료 › "구조" 폴더에 플롯 설계 문서로 추가, 관련 무협 도구(개요/트로프/시놉시스) 및 일반 도구(영웅의 여정/플롯 피라미드) 열기
// 자급식: react / './linkbus' 외 import 없음. 전부 로컬. localStorage 'sry:tool:wuxia-plotlogic' 자동 저장/복원.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'wuxia-plotlogic', name: '무협 플롯·진행곡선', icon: '⚔️', group: '플롯', genre: '무협', intro: '무협 표준 구조(정통대협·낭인추리·신무협 복수비극·회귀먼치킨)와 비트·페이싱을 단계 시트로 채우고 긴장 곡선을 그려보세요', w: 720, h: 660 }

const LS_KEY = 'sry:tool:wuxia-plotlogic'

// ── 타입 ─────────────────────────────────────────────────
interface BeatDef {
  key: string
  no: number
  title: string
  act: string          // 막/구획 라벨
  emoji: string
  hint: string         // 도시에 근거한 무협 특화 작성 안내(placeholder/툴팁)
  pace: string         // 페이싱 지침
  curve: number        // 기본 긴장도 0~10 (진행곡선 기준선)
}
interface TemplateDef {
  id: string
  name: string
  branch: string       // 하위 분기(계보)
  desc: string
  beats: BeatDef[]
}
interface BeatData { text: string; note: string; tension: number; done: boolean }
type BeatStore = Record<string, BeatData>            // beatKey -> data
type AllStore = Record<string, BeatStore>            // templateId -> beatStore

// ── 막 색상(공통) ──────────────────────────────────────────
const ACT_COLORS: string[] = ['#5b8def', '#3fb27f', '#e0533d', '#d99a2b', '#8b6fc4', '#e06c9f', '#46b5c4', '#c0763a']
function actColor(label: string, order: string[]): string {
  const i = order.indexOf(label)
  return ACT_COLORS[(i < 0 ? 0 : i) % ACT_COLORS.length]
}

// ───────────────────────────────────────────────────────────
//  템플릿 1: 김용형 정통대협 (장편 대하 8막 — 협지대자, 위국위민)
// ───────────────────────────────────────────────────────────
const T_HERO: TemplateDef = {
  id: 'orthodox',
  name: '김용형 정통대협',
  branch: '正統 大俠 · 사조삼부곡형 장편 대하',
  desc: '불우한 출발에서 기연으로 성장해 강호에 출도(出道)하고, 정사(正邪)·마교의 음모에 맞서다 추락·진각성을 거쳐 천하대전에 이른 뒤, "협지대자(俠之大者) 위국위민"의 대의로 결착하고 귀은(歸隱)하는 정통 대하 구조.',
  beats: [
    { key: 'o-origin', no: 1, title: '불우한 출발 · 사문/가문의 그늘', act: '1막·발단', emoji: '🏚️', curve: 2,
      hint: '몰락한 가문·천대받는 막내 제자·고아 등 결핍의 처지에서 시작하세요. 부모/사문의 미스터리(원수·혈통의 비밀)를 한 방울 깔아 둘 것 — 후반 회수의 씨앗.',
      pace: '느리게. 단 강호의 결(객잔·표국·문파의 위계)을 생활 속에 슬쩍 보여 "이 세계의 규칙"을 각인.' },
    { key: 'o-fortune', no: 2, title: '기연(奇緣) · 무공 입문', act: '1막·발단', emoji: '📜', curve: 4,
      hint: '절벽 추락 후 비동(秘洞)의 비급·죽어가는 절대고수의 전수·영약(만년하수오/내단) 등 성장 트리거. 진부함을 피하려면 "대가·제약"을 함께 부여(예: 미완성 심법, 주화입마 위험).',
      pace: '여기서 후크가 걸려야 함. 거부·망설임은 짧게. 운기조식·단전·진기의 메커니즘을 처음 보여줄 것.' },
    { key: 'o-debut', no: 3, title: '출도(出道) · 첫 시련과 명성', act: '2막·상승', emoji: '🚪', curve: 5,
      hint: '강호로 첫발. 객잔의 시비·표행 호위·약자 구원에서 정체가 드러나며 첫 명성을 얻습니다. 은원(恩怨)이 분명한 사건을 하나 — 은혜는 갚고 원한은 새깁니다.',
      pace: '스케일이 마을→강호로 확장. 첫 비무·합(合)을 디테일하게(초식·내공 운용) 묘사해 결투 계약을 충족.' },
    { key: 'o-faction', no: 4, title: '세력 충돌 · 정사(正邪)의 음모', act: '2막·상승', emoji: '⚖️', curve: 6,
      hint: '구파일방·세가·사파·마교의 세력 구도에 휘말립니다. 비급 쟁탈·정보(개방)·진법(제갈)·암기독(당문) 등 정면 무력 외 변수를 활용. 중간보스 계단을 쌓으세요.',
      pace: '에피소드 누적. 작은 승리/패배의 리듬으로 동료·적을 입체화. 파워 인플레이션을 경계 — "벽"을 남겨둘 것.' },
    { key: 'o-midpoint', no: 5, title: '중간점 반전 · 흑막의 윤곽', act: '2막·상승', emoji: '🌀', curve: 7,
      hint: '마교 침공/배후 흑막/사부의 비밀이 드러나기 시작. 신분 위장·정체 은닉의 떡밥이 흔들립니다. 개인 복수가 천하대의로 확대되는 전환점.',
      pace: '판을 키우는 지점. 주인공의 위상(절정고수)이 한 단계 오르되, 진짜 적의 규격은 아직 닿지 않게.' },
    { key: 'o-fall', no: 6, title: '추락 · 배신/주화입마/상실', act: '3막·위기', emoji: '🩸', curve: 9,
      hint: '믿었던 이의 배신, 무리한 수련으로 인한 주화입마(심마)·단전 폐인 위기, 동료/사부의 죽음, 정체 폭로 — 중반 최저점. 협의 신념이 가장 크게 시험받습니다.',
      pace: '암전 구간. 모든 것을 잃은 듯 바닥을 찍어야 진각성이 빛남. 너무 빨리 회복시키지 말 것.' },
    { key: 'o-rise', no: 7, title: '재기 · 진각성 · 상승무공', act: '3막·위기', emoji: '🔥', curve: 8,
      hint: '심마를 넘어 환골탈태(換骨奪胎)·반로환동, 절대무공/신공(神功) 완성, 사문/혈통의 진실 각성. 앞서 심은 심법·인연·복선이 회수되기 시작합니다.',
      pace: '바닥에서의 부활. 새 힘에도 "다음 벽(진짜 적의 경지)"을 예고해 긴장을 유지.' },
    { key: 'o-war', no: 8, title: '천하대전 · 정사대전/마교 침공', act: '4막·절정', emoji: '🏔️', curve: 10,
      hint: '무림 전체 규모의 결전. 천하제일을 가르는 일대일 정점 대결 + 동료의 연수합격·진법·암기의 총동원. 갑툭튀 능력(데우스 엑스 마키나)은 금기 — 앞선 복선으로 결정타를.',
      pace: '최고조. 개인 능력+동료 연계+강호 규칙의 합주. 최종보스가 사부/혈육이었다는 비극적 반전을 얹으면 격이 오름.' },
    { key: 'o-cost', no: 9, title: '대가 지불 · 협지대자의 결착', act: '5막·결말', emoji: '⚰️', curve: 7,
      hint: '승리에는 비용을 — 단전 소진/수명 단축/소중한 이의 희생. 개인 복수가 위국위민(爲國爲民)의 대의로 승화됩니다. "이기고도 잃는" 무게를 느끼게 하세요.',
      pace: '절정 직후 하강. 은원의 청산을 정리(빚진 은혜·맺힌 원한의 마무리).' },
    { key: 'o-recluse', no: 10, title: '귀은(歸隱) · 강호를 떠나며', act: '5막·결말', emoji: '🌄', curve: 3,
      hint: '천하제일에 올랐으나 명리를 버리고 연인과 함께 강호를 떠나거나, 변모한 모습으로 새 질서를 남깁니다. 무협 특유의 "귀은" 엔딩 — 여운과 미회수 떡밥을 남길 수 있음.',
      pace: '대단원. "강호에서 다시 봅시다"류의 여운. 후속 여지를 남길 수 있음.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 2: 고룡형 낭인·추리 무협 (분위기·심리전·찰나의 한 수)
// ───────────────────────────────────────────────────────────
const T_GULONG: TemplateDef = {
  id: 'gulong',
  name: '고룡형 낭인·추리',
  branch: '古龍 · 초류향/소이비도형 단편·추리',
  desc: '고독한 낭인형 주인공이 강호의 의문(살인·음모·실종)을 좇아 추리하며, 화려한 합 대신 정적·심리전 끝에 "찰나의 한 수"로 승부하는 분위기·추리 중심의 무협. 단문·감각·반전이 동력.',
  beats: [
    { key: 'g-loner', no: 1, title: '낭인의 등장 · 강호의 의문', act: '발단', emoji: '🍶', curve: 3,
      hint: '명성은 있으나 매인 데 없는 고독한 낭인(초류향·소이비도형)을 분위기로 세우세요. 술·달밤·객잔의 감각적 한 컷. 동시에 풀어야 할 의문(연쇄 살인·도난·실종)을 제시.',
      pace: '단문·여백으로 분위기를 깔되, 첫머리에 "왜?"라는 후크 하나를 확실히 박을 것.' },
    { key: 'g-case', no: 2, title: '사건 · 불가능해 보이는 죽음', act: '발단', emoji: '🗡️', curve: 5,
      hint: '밀실 같은 죽음·흔적 없는 암살·사라진 시신 등 합리로는 설명 안 되는 사건. 무공(점혈·독·암기·이형환위)이 트릭의 변수가 됩니다.',
      pace: '의문을 키우는 구간. 단서를 독자에게 공정하게 보여주되 의미는 감출 것.' },
    { key: 'g-trace', no: 3, title: '추적 · 강호 인맥과 정보', act: '전개', emoji: '🔍', curve: 5,
      hint: '낭인이 강호의 인맥(기루·정보상·옛 친구·살수조직)을 거치며 단서를 모읍니다. 인물마다 거짓·이해관계가 얽혀 있어 누구도 온전히 믿을 수 없습니다.',
      pace: '대화·심리전 중심. 짧은 대결(탐색전)로 긴장을 환기. 미인·옛 인연으로 변수를 추가.' },
    { key: 'g-deadend', no: 4, title: '함정 · 막다른 골목/배신', act: '전개', emoji: '🕳️', curve: 7,
      hint: '추리가 막히거나 함정에 빠집니다. 믿었던 정보가 거짓, 의뢰인이 흑막, 미인이 살수 — 강호의 인심(人心)에 배신당하는 구간.',
      pace: '판이 뒤집히는 첫 반전. 주인공을 궁지로 몰아 다음 반전의 낙폭을 키울 것.' },
    { key: 'g-truth', no: 5, title: '진상 · 흩어진 단서의 수렴', act: '위기', emoji: '🧩', curve: 8,
      hint: '흩어진 단서가 한 점으로 모이며 진범·진의가 드러납니다. 의외의 인물(가까운 자·죽은 줄 알았던 자)이 흑막. 무공의 비밀이 트릭의 핵심이 되도록.',
      pace: '추리의 카타르시스. 앞서 보여준 단서들이 공정하게 회수되어야 반전이 납득됨.' },
    { key: 'g-duel', no: 6, title: '대치 · 정적 속의 한 수', act: '절정', emoji: '⚡', curve: 10,
      hint: '최강의 적과 대치. 길고 화려한 합 대신 침묵·심리전·기세 싸움 끝에 단 한 수(소이비도의 비도·일초필살)로 승부. "검을 뽑기 전 이미 승부는 났다"식 연출.',
      pace: '최고조이되 정적. 묘사를 극도로 압축해 찰나에 모든 것을 건다. 군더더기 금물.' },
    { key: 'g-after', no: 7, title: '여운 · 다시 떠나는 낭인', act: '결말', emoji: '🌙', curve: 3,
      hint: '사건은 끝났으나 강호는 그대로. 낭인은 보상도 정착도 거부하고 다시 길을 떠납니다. 인생무상·고독의 여운, 미인과의 짧은 작별.',
      pace: '짧고 쓸쓸하게. 단 한 줄의 잠언적 마무리로 정서를 남길 것.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 3: 한무 신무협 복수·비극 (서효원/좌백형, 대가 지불형)
// ───────────────────────────────────────────────────────────
const T_REVENGE: TemplateDef = {
  id: 'revenge',
  name: '한무 신무협 복수·비극',
  branch: '韓武 新武俠 · 대자객교/대도오형 비극',
  desc: '사문·가족의 몰살에서 출발한 개인의 복수가 강호의 음모와 얽히며, 인물의 내면과 신념이 깊이 파헤쳐지고, "이기고도 잃는" 대가 지불형 비극으로 결착하는 한국 신무협 정체성의 곡선.',
  beats: [
    { key: 'r-massacre', no: 1, title: '멸문(滅門) · 복수의 각인', act: '발단', emoji: '🔥', curve: 6,
      hint: '사문/가문의 몰살, 사부·혈육의 죽음을 직접 목격하거나 그 한가운데서 살아남습니다. 복수라는 단 하나의 동기가 인물의 뼈에 새겨집니다.',
      pace: '강렬하게 시작. 비극의 무게를 충분히 — 이 상실이 클수록 인물의 내면이 깊어짐.' },
    { key: 'r-vow', no: 2, title: '맹세 · 비정한 단련', act: '발단', emoji: '🗡️', curve: 5,
      hint: '복수를 맹세하고 무공을 단련합니다. 정통 기연보다 "피와 뼈를 깎는" 고행·금기무공·자객 수련에 가까울 것. 인간성을 일부 버리는 선택이 싹틉니다.',
      pace: '느리지만 처절하게. 성장의 대가(고독·잔혹화)를 함께 새길 것.' },
    { key: 'r-hunt', no: 3, title: '추적 · 원수의 그림자', act: '전개', emoji: '🩸', curve: 6,
      hint: '원수(들)를 하나씩 추적·응징하며 강호로 나아갑니다. 응징마다 통쾌함보다 공허·죄책이 남도록 — 복수의 본질을 묻습니다.',
      pace: '응징의 계단. 각 원수에게 사연을 부여해 선악의 회색지대를 부각.' },
    { key: 'r-bond', no: 4, title: '인연 · 흔들리는 결심', act: '전개', emoji: '🤝', curve: 5,
      hint: '복수의 길에서 만난 인연(연인·동료·은인)이 비정한 결심을 흔듭니다. "복수냐, 사람이냐"의 내적 갈등이 본격화.',
      pace: '잠시 긴장 완화·온기. 그러나 이 인연이 후반 비극의 지렛대가 되도록 복선을 심을 것.' },
    { key: 'r-truth', no: 5, title: '진실 · 원수의 정체/배후', act: '위기', emoji: '🌀', curve: 8,
      hint: '멸문의 진짜 배후가 드러납니다 — 원수가 사부/혈육/은인이었거나, 자신이 이용당한 말이었다는 폭로. 복수의 정당성 자체가 무너집니다.',
      pace: '비극의 핵. 신념이 붕괴하는 지점. 의도적으로 답을 미뤄 고통을 응시하게.' },
    { key: 'r-abyss', no: 6, title: '심연 · 심마와 금기무공', act: '위기', emoji: '🕯️', curve: 9,
      hint: '심마(心魔)에 잠식되거나, 이기기 위해 금기무공(흡성·마공)에 손을 댑니다. 강해지되 인간성·수명·이성을 잃는 트레이드오프의 정점.',
      pace: '가장 어두운 구간. 주인공이 적과 닮아가는 두려움을 그릴 것.' },
    { key: 'r-clash', no: 7, title: '결전 · 이기고도 잃는 한 수', act: '절정', emoji: '⚔️', curve: 10,
      hint: '최후의 결투. 반탄지력·금기무공의 대가로 이기되 단전 파괴/폐인/소중한 이의 죽음을 치릅니다. 정체·혈연 반전과 결합하면 비극이 깊어집니다(천룡팔부형).',
      pace: '최고조이되 카타르시스보다 비통. 승리의 순간에 가장 큰 것을 잃게 하세요.' },
    { key: 'r-end', no: 8, title: '잿더미 위에서 · 비극적 귀결', act: '결말', emoji: '🥀', curve: 4,
      hint: '복수는 끝났으나 남은 것은 잿더미. 폐인·은거·죽음·홀로 남음 등 대가의 결말. 혹은 복수를 내려놓고 한 줌의 구원을 얻는 변주도 가능.',
      pace: '여운 깊게. 통쾌한 마무리를 피하고 인생·은원의 무상함을 남길 것.' },
  ],
}

// ───────────────────────────────────────────────────────────
//  템플릿 4: 웹소설 회귀먼치킨 (화산귀환형 사이다 곡선)
// ───────────────────────────────────────────────────────────
const T_WEB: TemplateDef = {
  id: 'web',
  name: '웹소설 회귀먼치킨',
  branch: '網武 · 화산귀환형 회귀·사이다 연재',
  desc: '절대고수가 죽고 약자 시절로 회귀(또는 빙의·환생)해, 미래지식이라는 더블 어드밴티지로 무시→증명→응징을 회차마다 반복하며 누적 성장으로 다시 정상에 오르는 연재형 사이다 곡선.',
  beats: [
    { key: 'w-death', no: 1, title: '전생의 죽음 · 회귀', act: '도입·골든타임', emoji: '💀', curve: 4,
      hint: '절대고수/일대종사가 한을 품고 죽거나, 정사대전의 끝에서 산화합니다. 그리고 약했던 과거(막내 제자·폐인·문파 몰락 직전)로 눈을 뜹니다 — 회귀/빙의/환생 트리거.',
      pace: '1~3화 골든타임. 회귀 사실과 "이번엔 다르게"라는 선언을 즉시. 늘어지면 이탈.' },
    { key: 'w-knowledge', no: 2, title: '미래지식 · 더블 어드밴티지', act: '도입·골든타임', emoji: '🧠', curve: 6,
      hint: '전생의 무공·강호 정세·미래 사건을 모두 아는 정보 우위를 가동. 묻혀 있던 비급·영약의 위치, 흑막의 정체, 다가올 참사를 미리 압니다. "강자의 회귀"라는 핵심 매력.',
      pace: '3~5화 내 첫 후크. 미래지식이 즉각 이득(기연 선점·위기 회피)으로 전환됨을 보일 것.' },
    { key: 'w-firstcider', no: 3, title: '첫 사이다 · 무시→증명→응징', act: '도입·골든타임', emoji: '🥤', curve: 7,
      hint: '자신을 얕보던 동문·문파·세가 앞에서 첫 실력 입증과 응징. "어디서 굴러먹던 애송이가" 도발받음→압도적 반격→주변의 경악(리액션)의 1사이클을 한 회 안에 닫습니다.',
      pace: '5화 안에 최소 1회 카타르시스. 마지막 "경악 리액션"이 연독률의 핵심.' },
    { key: 'w-rebuild', no: 4, title: '기반 다지기 · 문파/세력 재건', act: '전개·누적', emoji: '🏯', curve: 5,
      hint: '몰락한 사문(화산 등)을 일으키거나 세력을 모읍니다. 미래지식으로 인재·비급·영약을 선점하고 강호 서열을 차근차근 역전. 성장을 가시화(경지·명성·세력).',
      pace: '회차마다 작은 성취. 동료·문파라는 "지킬 것"을 만들어 응징의 명분을 보강.' },
    { key: 'w-arc', no: 5, title: '에피소드 누적 · 비무/정파회합', act: '전개·누적', emoji: '🏟️', curve: 6,
      hint: '비무대회·정파 회합·표국 분쟁·사파 토벌 등 단위 에피소드의 연쇄. 각 아크 안에 작은 고구마→사이다를 내장하고, 위에 거대 떡밥(마교·천마·흑막)을 천천히 적층.',
      pace: '매 화 끝 클리프행어. 정체·실력 숨김의 폭로를 잦은 주기로(떡밥-회수 단주기).' },
    { key: 'w-wall', no: 6, title: '벽 · 규격 외 강적/큰 고구마', act: '위기·고구마', emoji: '🧱', curve: 8,
      hint: '파워 인플레 관리: 더 강한 사파·마교 고수, 전생에도 못 넘은 벽 앞에서 처음으로 막힙니다. 소중한 것을 잃을 수도. 의도적 답답함(고구마)을 축적.',
      pace: '다음 사이다의 낙폭을 키우는 구간. 단, 사이다 남발로 죽은 긴장을 여기서 되살릴 것.' },
    { key: 'w-break', no: 7, title: '돌파 · 전생 절학/숨은 경지', act: '위기·고구마', emoji: '💥', curve: 7,
      hint: '전생의 절대무공·매화검법 진수·봉인된 경지를 회수하거나, 회귀로만 알 수 있던 비전을 풀어 벽을 깹니다. 정보 우위가 결정적으로 작동.',
      pace: '눌렸던 만큼 시원하게. 새 힘에도 더 큰 무대(천마·새외세력)를 예고.' },
    { key: 'w-bigcider', no: 8, title: '대형 사이다 · 흑막/마교 응징', act: '절정', emoji: '⚡', curve: 10,
      hint: '쌓인 모든 굴욕·떡밥을 한 번에 응징·회수하는 압도적 역전. 전생을 망친 흑막/마교/배신자를 박살내고 강호 서열을 뒤집습니다. 군중·적의 경악으로 카타르시스 폭발.',
      pace: '아크 최고조. 누적된 카타르시스의 폭발 + 새 칭호/위상 획득.' },
    { key: 'w-apex', no: 9, title: '정점 · 천하제일/새 무대 예고', act: '귀결', emoji: '👑', curve: 5,
      hint: '무림지존·천하제일인의 반열에 다시 오르며 위상이 재정의됩니다. 더 큰 무대(중원 밖·새외·천마신교 본진·전생의 미해결 한)를 예고해 연재 동력을 잇습니다.',
      pace: '아크 종결 + 다음 떡밥. 연재 유지를 위해 반드시 새 목표를 던질 것.' },
  ],
}

const TEMPLATES: TemplateDef[] = [T_HERO, T_GULONG, T_REVENGE, T_WEB]
const TPL_MAP: Record<string, TemplateDef> = TEMPLATES.reduce((m, t) => { m[t.id] = t; return m }, {} as Record<string, TemplateDef>)

// 조합수(표시용): 각 비트는 [채움여부 × 긴장도 11단계 × 완료여부] = 비트당 약 2×11×2 = 44 상태.
// 가장 큰 템플릿(정통대협 10비트)의 설계 상태수 = 44^10 ≈ 2.7 × 10^16 (2.7경) — 1조를 크게 상회.
function combinationsOf(t: TemplateDef): number {
  return Math.pow(44, t.beats.length)
}
function fmtBig(n: number): string {
  // 한국식 큰 단위 근사 표기
  const units: [number, string][] = [
    [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만'],
  ]
  for (const [v, u] of units) {
    if (n >= v) {
      const q = n / v
      return (q >= 100 ? Math.round(q).toLocaleString() : q.toFixed(1)) + u + ' 가지'
    }
  }
  return Math.round(n).toLocaleString() + ' 가지'
}

// ── 저장/복원 ──────────────────────────────────────────────
function emptyBeatStore(t: TemplateDef): BeatStore {
  const o: BeatStore = {}
  for (const b of t.beats) o[b.key] = { text: '', note: '', tension: b.curve, done: false }
  return o
}
function emptyAll(): AllStore {
  const o: AllStore = {}
  for (const t of TEMPLATES) o[t.id] = emptyBeatStore(t)
  return o
}
function clampT(n: unknown, fallback: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return fallback
  return Math.min(10, Math.max(0, v))
}
function loadAll(): { store: AllStore; tpl: string } {
  const base = emptyAll()
  let tpl = TEMPLATES[0].id
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { store: base, tpl }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.tpl === 'string' && TPL_MAP[parsed.tpl]) tpl = parsed.tpl
      const ps = parsed.store
      if (ps && typeof ps === 'object') {
        for (const t of TEMPLATES) {
          const tb = ps[t.id]
          if (tb && typeof tb === 'object') {
            for (const b of t.beats) {
              const v = tb[b.key]
              if (v && typeof v === 'object') {
                base[t.id][b.key] = {
                  text: typeof v.text === 'string' ? v.text : '',
                  note: typeof v.note === 'string' ? v.note : '',
                  tension: clampT(v.tension, b.curve),
                  done: !!v.done,
                }
              }
            }
          }
        }
      }
    }
  } catch { /* noop */ }
  return { store: base, tpl }
}

// ── 컴포넌트 ───────────────────────────────────────────────
export default function WuxiaPlotLogic({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadAll())
  const [store, setStore] = useState<AllStore>(init.current.store)
  const [tplId, setTplId] = useState<string>(init.current.tpl)
  const [active, setActive] = useState<string | null>(null)   // 편집 중 beatKey
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // payload.genre 맥락(장르 도구함에서 열림) — 배지로만 활용
  const genreCtx = payload && typeof payload.genre === 'string' ? String(payload.genre).trim() : ''
  // payload.template 로 특정 템플릿 지정 가능(연계 진입)
  useEffect(() => {
    const pt = payload && typeof payload.template === 'string' ? String(payload.template) : ''
    if (pt && TPL_MAP[pt]) setTplId(pt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ store, tpl: tplId }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tplId])

  // 편집 패널 포커스
  useEffect(() => {
    if (active && editRef.current) { try { editRef.current.focus() } catch { /* noop */ } }
  }, [active])

  const flash = (msg: string, warn = false) => {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const tpl = TPL_MAP[tplId]
  const beats = tpl.beats
  const bstore = store[tplId]
  const actOrder = Array.from(new Set(beats.map((b) => b.act)))

  const setField = (key: string, field: keyof BeatData, value: string | boolean | number) => {
    setStore((prev) => ({
      ...prev,
      [tplId]: { ...prev[tplId], [key]: { ...prev[tplId][key], [field]: value } },
    }))
  }
  const toggleDone = (key: string) => setField(key, 'done', !bstore[key].done)
  const clearBeat = (key: string) => {
    const def = beats.find((b) => b.key === key)!
    setStore((prev) => ({
      ...prev,
      [tplId]: { ...prev[tplId], [key]: { text: '', note: '', tension: def.curve, done: false } },
    }))
  }
  const resetTpl = () => {
    if (filled === 0 && doneCount === 0) return
    if (typeof window !== 'undefined' && !window.confirm(`'${tpl.name}' 템플릿의 모든 비트 내용을 비웁니다. 계속할까요?`)) return
    setStore((prev) => ({ ...prev, [tplId]: emptyBeatStore(tpl) }))
    setActive(null)
    flash('이 템플릿의 모든 비트를 비웠습니다.')
  }

  const filled = beats.filter((b) => bstore[b.key].text.trim()).length
  const doneCount = beats.filter((b) => bstore[b.key].done).length
  const pct = Math.round((filled / beats.length) * 100)

  // ── 내보내기 텍스트/HTML ───────────────────────────────────
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  const buildText = () => {
    const lines: string[] = [
      `# 무협 플롯·진행곡선 — ${tpl.name}`,
      `계보: ${tpl.branch}`,
      `진행: ${filled}/${beats.length} 비트 작성 · 완료 ${doneCount}개`,
      '', tpl.desc, '',
    ]
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { lines.push(`## ${b.act}`); lastAct = b.act }
      const d = bstore[b.key]
      lines.push(`${d.done ? '✅' : '⬜'} ${b.no}. ${b.title}  [긴장도 ${d.tension}/10]`)
      lines.push(`   - 내용: ${d.text.trim() || '(미작성)'}`)
      lines.push(`   - 페이싱: ${b.pace}`)
      if (d.note.trim()) lines.push(`   - 메모: ${d.note.trim()}`)
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }
  const buildHtml = () => {
    const parts: string[] = [
      `<p><strong>무협 플롯·진행곡선 — ${esc(tpl.name)}</strong></p>`,
      `<p>계보: ${esc(tpl.branch)} · 작성 ${filled}/${beats.length} 비트 · 완료 ${doneCount}개</p>`,
      `<p><em>${esc(tpl.desc)}</em></p>`,
    ]
    let lastAct = ''
    for (const b of beats) {
      if (b.act !== lastAct) { parts.push(`<h2>${esc(b.act)}</h2>`); lastAct = b.act }
      const d = bstore[b.key]
      parts.push(`<h3>${d.done ? '✅ ' : ''}${b.no}. ${esc(b.title)} <small>[긴장도 ${d.tension}/10]</small></h3>`)
      const txt = d.text.trim()
      parts.push(`<p>${txt ? escMl(txt) : '<em>(미작성)</em>'}</p>`)
      parts.push(`<p>⏱️ <em>${esc(b.pace)}</em></p>`)
      if (d.note.trim()) parts.push(`<p>📝 ${escMl(d.note.trim())}</p>`)
    }
    return parts.join('')
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text); flash('전체 내용을 클립보드에 복사했어요.'); return
      }
    } catch { /* noop */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy'); document.body.removeChild(ta)
      flash(ok ? '전체 내용을 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.', !ok)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.', true) }
  }

  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: `무협 플롯 설계 · ${tpl.name}`,
      bodyHtml: buildHtml(),
      meta: { 장르: '무협', 계보: tpl.name, 분기: tpl.branch, 작성비트: `${filled}/${beats.length}`, 완료: String(doneCount) },
    })
    flash(id ? '프로젝트 자료(구조)에 무협 플롯 설계 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  const activeDef = active ? beats.find((b) => b.key === active) || null : null
  const genreParam = genreCtx || '무협'

  // ── 스타일 ─────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px', flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 14px' }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }
  const progressBar: React.CSSProperties = { height: 8, borderRadius: 99, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }
  const progressFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--ok))', transition: 'width .25s ease' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={title}><Emoji e="⚔️" /> 무협 플롯·진행곡선
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px' }}>{genreCtx || '무협'}</span>
        </div>
      </div>

      {/* 템플릿(계보) 선택 */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 8px', flexWrap: 'wrap' }}>
        {TEMPLATES.map((t) => {
          const on = t.id === tplId
          return (
            <button
              key={t.id}
              className={'minibtn' + (on ? ' active' : '')}
              style={on ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
              onClick={() => { setTplId(t.id); setActive(null) }}
              title={t.desc}
            >{t.name}</button>
          )
        })}
      </div>

      {/* 템플릿 설명 + 조합수 */}
      <div style={{ margin: '0 14px 8px', padding: '8px 11px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}>
        <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 2 }}>{tpl.branch}</div>
        {tpl.desc}
        <div style={{ marginTop: 6, fontSize: 11.5 }}><Emoji e="🎲" /> 이 템플릿으로 설계 가능한 진행곡선 상태수: <strong style={{ color: 'var(--accent)' }}>{fmtBig(combinationsOf(tpl))}</strong> (비트 {beats.length}개 × 작성·긴장도·완료 조합)</div>
      </div>

      {/* 진행률 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', padding: '0 14px 6px', gap: 10 }}>
        <span>작성 비트 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{beats.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong></span>
        <span>{pct}%</span>
      </div>
      <div style={{ padding: '0 14px 8px' }}>
        <div style={progressBar}><div style={progressFill} /></div>
      </div>

      {/* 진행곡선 */}
      <div style={{ padding: '0 14px 4px' }}>
        <CurveView beats={beats} bstore={bstore} active={active} onPick={setActive} actOrder={actOrder} />
      </div>

      {note && (
        <div style={{ margin: '4px 14px 0', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, background: 'var(--chrome-2)', border: '1px solid var(--border)', color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{emojify(note)}</div>
      )}

      {/* 비트 목록 */}
      <div style={body}>
        <BeatList beats={beats} bstore={bstore} active={active} onPick={setActive} onToggle={toggleDone} actOrder={actOrder} />
      </div>

      {/* 편집 패널 */}
      {activeDef && (
        <BeatEditor
          def={activeDef}
          data={bstore[activeDef.key]}
          editRef={editRef}
          actOrder={actOrder}
          onText={(v) => setField(activeDef.key, 'text', v)}
          onNote={(v) => setField(activeDef.key, 'note', v)}
          onTension={(v) => setField(activeDef.key, 'tension', v)}
          onToggle={() => toggleDone(activeDef.key)}
          onClear={() => clearBeat(activeDef.key)}
          onClose={() => setActive(null)}
          onPrev={() => setActive(beats[(activeDef.no - 2 + beats.length) % beats.length].key)}
          onNext={() => setActive(beats[activeDef.no % beats.length].key)}
        />
      )}

      <div style={footer}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '자료 › 구조 폴더에 무협 플롯 설계 문서로 추가' : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={() => openToolLinked('wuxia-outline', { genre: genreParam })} title="무협 개요 빌더 열기"><Emoji e="🏯" /> 무협 개요</button>
        <button className="linkbtn" onClick={() => openToolLinked('wuxia-tropes', { genre: genreParam })} title="무협 트로프·관습 체크리스트 열기"><Emoji e="📐" /> 무협 트로프</button>
        <button className="linkbtn" onClick={() => openToolLinked('wuxia-synopsis', { genre: genreParam })} title="무협 시놉시스 빌더 열기"><Emoji e="📜" /> 시놉시스</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: genreParam })} title="플롯 피라미드 열기"><Emoji e="🔺" /> 플롯 피라미드</button>
        <button className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }} onClick={resetTpl} disabled={filled === 0 && doneCount === 0}><Emoji e="🗑️" /> 이 템플릿 비우기</button>
      </div>
    </div>
  )
}

// ── 진행곡선 SVG ───────────────────────────────────────────
function CurveView({ beats, bstore, active, onPick, actOrder }: {
  beats: BeatDef[]; bstore: BeatStore; active: string | null; onPick: (k: string) => void; actOrder: string[]
}) {
  const W = 680, H = 150, padL = 26, padR = 12, padT = 10, padB = 22
  const innerW = W - padL - padR, innerH = H - padT - padB
  const n = beats.length
  const x = (i: number) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const y = (t: number) => padT + innerH - (innerH * t) / 10

  const pts = beats.map((b, i) => ({ x: x(i), y: y(bstore[b.key].tension), b, i }))
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')
  const area = path + ` L ${pts[pts.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="진행 긴장 곡선">
        {/* 가로 격자 */}
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--border)" strokeWidth={0.6} opacity={0.5} />
            <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize={8} fill="var(--muted)">{t}</text>
          </g>
        ))}
        {/* 면적 + 선 */}
        <path d={area} fill="var(--accent)" opacity={0.12} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {/* 비트 점 */}
        {pts.map((p) => {
          const d = bstore[p.b.key]
          const on = active === p.b.key
          const col = d.done ? 'var(--ok)' : d.text.trim() ? 'var(--accent)' : 'var(--paper)'
          return (
            <g key={p.b.key} style={{ cursor: 'pointer' }} onClick={() => onPick(p.b.key)}>
              <circle cx={p.x} cy={p.y} r={on ? 6 : 4.5} fill={col} stroke={on ? 'var(--text)' : actColor(p.b.act, actOrder)} strokeWidth={on ? 2.5 : 1.6}>
                <title>{`${p.b.no}. ${p.b.title} (긴장 ${d.tension}/10)`}</title>
              </circle>
              <text x={p.x} y={H - 8} textAnchor="middle" fontSize={8.5} fill={on ? 'var(--text)' : 'var(--muted)'} fontWeight={on ? 700 : 400}>{p.b.no}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── 비트 목록 ──────────────────────────────────────────────
function BeatList({ beats, bstore, active, onPick, onToggle, actOrder }: {
  beats: BeatDef[]; bstore: BeatStore; active: string | null; onPick: (k: string) => void; onToggle: (k: string) => void; actOrder: string[]
}) {
  let lastAct = ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {beats.map((b) => {
        const d = bstore[b.key]
        const hasText = !!d.text.trim()
        const on = active === b.key
        const header = b.act !== lastAct
        lastAct = b.act
        const ac = actColor(b.act, actOrder)
        return (
          <div key={b.key}>
            {header && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: ac }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: ac, display: 'inline-block' }} />{b.act}
              </div>
            )}
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 11,
                background: on ? 'var(--chrome-2)' : 'var(--panel)',
                border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                cursor: 'pointer', borderLeft: `4px solid ${d.done ? 'var(--ok)' : hasText ? 'var(--accent)' : 'var(--border)'}`,
              }}
              onClick={() => onPick(b.key)}
            >
              <input
                type="checkbox" checked={d.done}
                onClick={(e) => e.stopPropagation()} onChange={() => onToggle(b.key)}
                style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }}
                aria-label={`${b.title} 완료`}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span><Emoji e={b.emoji} /></span><span style={{ color: 'var(--muted)' }}>{b.no}.</span> {b.title}
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: ac, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 7px' }}>긴장 {d.tension}</span>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5, color: hasText ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {hasText ? emojify(d.text) : '(눌러서 내용 작성)'}
                </div>
                {d.note.trim() && (
                  <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Emoji e="📝" /> {emojify(d.note)}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 비트 편집 패널 ─────────────────────────────────────────
function BeatEditor({
  def, data, editRef, actOrder, onText, onNote, onTension, onToggle, onClear, onClose, onPrev, onNext,
}: {
  def: BeatDef
  data: BeatData
  editRef: React.RefObject<HTMLTextAreaElement>
  actOrder: string[]
  onText: (v: string) => void
  onNote: (v: string) => void
  onTension: (v: number) => void
  onToggle: () => void
  onClear: () => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const ac = actColor(def.act, actOrder)
  const panel: React.CSSProperties = {
    borderTop: '1px solid var(--border)', background: 'var(--panel)', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 9, maxHeight: '54%', overflowY: 'auto', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const ta: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, lineHeight: 1.55,
    borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)',
    resize: 'vertical', fontFamily: 'inherit',
  }
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}><Emoji e={def.emoji} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: ac }}>{def.no}.</span> {def.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{def.act}</div>
        </div>
        <button className="minibtn" onClick={onPrev} title="이전 비트" aria-label="이전 비트">←</button>
        <button className="minibtn" onClick={onNext} title="다음 비트" aria-label="다음 비트">→</button>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="닫기">✕</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, padding: '6px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="💡" /> {def.hint}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, padding: '6px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="⏱️" /> 페이싱: {def.pace}</div>

      <div>
        <div style={fieldLabel}>이 비트의 내용</div>
        <textarea
          ref={editRef}
          style={{ ...ta, marginTop: 4, minHeight: 68 }}
          value={data.text}
          onChange={(e) => onText(e.target.value)}
          placeholder="이 비트에서 일어나는 일을 적어보세요…"
        />
      </div>

      <div>
        <div style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between' }}>
          <span>긴장도(진행곡선에 반영)</span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{data.tension}/10</span>
        </div>
        <input
          type="range" min={0} max={10} step={1} value={data.tension}
          onChange={(e) => onTension(clampT(e.target.value, def.curve))}
          style={{ width: '100%', marginTop: 4, accentColor: 'var(--accent)', cursor: 'pointer' }}
          aria-label="긴장도"
        />
      </div>

      <div>
        <div style={fieldLabel}>메모(선택) — 복선·무공·은원·인물·소품</div>
        <textarea
          style={{ ...ta, marginTop: 4, minHeight: 42 }}
          value={data.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="비급·내공의 대가·은원·정체 떡밥·초식 이름 등 메모…"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={data.done} onChange={onToggle} style={{ width: 16, height: 16, accentColor: 'var(--ok)', cursor: 'pointer' }} />
          이 비트 완료
        </label>
        <button
          className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }}
          onClick={onClear}
          disabled={!data.text.trim() && !data.note.trim() && !data.done}
          title="이 비트 내용 비우기"
        >비트 비우기</button>
      </div>
    </div>
  )
}
