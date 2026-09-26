// 무협 개요(아웃라인) 빌더 — 무협 장르 표준 매크로 구조(장편 대하형 8단계 또는 웹소설 회차형)에
// 맞춰 장/막 개요 템플릿을 채운다. 각 단계마다 무협 특화 슬롯 풀(기연·세력·경지·은원 등)을
// 무작위로 굴려(🔒 잠금/부분 재생성, 조합수 표시) 줄거리 한 줄을 자동 생성·삽입할 수 있고,
// 항목 추가/삭제/순서 이동/인라인 편집을 지원한다.
// 데이터는 localStorage 'sry:tool:wuxia-outline' 에 자동 저장/복원. 언마운트 정리.
// 연계(linkbus): 완성 개요를 프로젝트 원고 '개요' 폴더 문서로 추가(addToProject),
//   생성한 줄거리 글감을 라이브러리 스니펫에 저장(addToLibrary), 관련 무협 도구 열기(openToolLinked).
// react 와 './linkbus' 외 import 금지.
import { useState, useEffect, useRef, useMemo } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'wuxia-outline', name: '무협 개요 빌더', icon: '📜', group: '구조', genre: '무협', intro: '무협 표준 구조(장편 대하형·웹소설 회차형)로 장·막 개요를 짜고 줄거리를 굴려 채우세요', w: 720, h: 660 }

// ── 유틸 ────────────────────────────────────────────────────────────
const LS_KEY = 'sry:tool:wuxia-outline'
function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
// 한국어 조사 자동 선택: 앞 글자 받침(종성)을 보고 실제 하나를 출력한다.
//   type 'EUL'(을/를) | 'I'(이/가) | 'EUN'(은/는) | 'RO'(으로/로)
function lastJong(s: string): number {
  let t = s.trim()
  // '신공(神功)'처럼 끝에 한자 괄호·기호가 붙은 경우, 발음의 기준이 되는 마지막 한글 음절을 찾는다.
  for (let i = t.length - 1; i >= 0; i--) {
    const code = t.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28
  }
  return -1 // 한글 음절이 전혀 없으면 받침 판정 불가
}
function josa(word: string, type: 'EUL' | 'I' | 'EUN' | 'RO'): string {
  const j = lastJong(word)
  const hasBatchim = j > 0
  // 한글이 아닌 경우(괄호·영문 등)는 보편적으로 통하는 형태로 폴백
  if (j < 0) return type === 'RO' ? '로' : type === 'EUL' ? '를' : type === 'I' ? '가' : '는'
  switch (type) {
    case 'EUL': return hasBatchim ? '을' : '를'
    case 'I': return hasBatchim ? '이' : '가'
    case 'EUN': return hasBatchim ? '은' : '는'
    case 'RO': return (!hasBatchim || j === 8) ? '로' : '으로' // ㄹ받침은 '로'
  }
}

// 큰 조합수를 한국어 단위(억/조/경)로.
function fmtBig(n: number): string {
  if (!isFinite(n)) return '무한'
  const u = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]] as const
  for (const [name, val] of u) {
    if (n >= val) { const q = n / val; return (q >= 100 ? Math.round(q).toLocaleString() : q.toFixed(q >= 10 ? 0 : 1)) + name + ' 가지' }
  }
  return Math.round(n).toLocaleString() + ' 가지'
}

// ── 줄거리 생성용 무협 특화 슬롯 풀(장르 도시에 근거) ───────────────────
// 각 풀은 구체적·무협 특화·고유 항목. 한 줄 줄거리는 8슬롯 조합 → 곱셈으로 조합수 69억 이상.
// 슬롯끼리 서로를 전제하지 않게(독립) 설계해 곱집합으로 섞여도 의미 충돌이 없다.
const POOL = {
  // 주인공 출발점(불우·폐인·막내 등) — 모두 명사구, 주어 자리
  hero: [
    '폐인 취급받던 문파 막내', '단전이 부서져 무공을 잃은 전직 고수', '멸문한 명문세가의 유일한 생존자',
    '천하제일인이었다 죽고 약관으로 회귀한 자', '무재(無才)라 손가락질받던 외문 제자', '기루에서 자란 정체불명의 소년',
    '관(官)에 쫓기는 녹림의 도적', '사부에게 버림받은 파문 제자', '구음절맥(九陰絶脈)을 타고난 비운의 소녀',
    '만독불침(萬毒不侵)의 특이체질을 숨긴 약초꾼', '표국의 말단 표사(鏢師)', '눈먼 검객의 길잡이 노릇을 하던 아이',
    '마교 후계임을 모른 채 정파에서 자란 청년', '대장간에서 신병(神兵)을 벼리던 무명 장인',
    '빚에 팔려 무관(武館)의 잡일을 하던 하인', '역병으로 식솔을 잃고 떠도는 의원(醫員)',
    '도박장에서 굴러먹던 시정의 건달', '몰락한 황족의 피를 숨기고 사는 떠돌이',
    '서고를 지키다 무학에 눈뜬 늙은 사서(司書)', '전장에서 살아 돌아온 이름 없는 병졸',
    '사파에 부모를 잃고 정파에 거둬진 고아', '강호를 모르고 자란 산골 사냥꾼',
    '얼굴을 가린 채 비무대회를 떠도는 가면 무인', '주모(酒母)의 양자로 객잔에서 큰 떠꺼머리',
  ],
  // 기연(서사적 레벨업 트리거) — 모두 '~고' 연결절
  serendipity: [
    '절벽에서 추락해 비동(秘洞)의 전대고수 유해와 심법서를 얻고', '만년하수오와 공청석유를 복용해 단숨에 내공이 치솟고',
    '죽어가는 절대고수에게 무공과 유지를 전수받고', '봉인된 신공(神功) 비급을 우연히 손에 넣고',
    '영물의 내단을 삼켜 환골탈태(換骨奪胎)를 이루고', '주화입마 직전 심마(心魔)를 극복해 진각성하고',
    '폐허가 된 옛 문파의 진법 속에서 절학을 깨치고', '회귀 전 기억으로 숨겨진 영약의 위치를 선점하고',
    '기관(機關)으로 봉인된 무덤에서 신병이기를 발굴하고', '논검(論劍)에서 패한 뒤 그 한 수의 이치를 홀로 완성하고',
    '폭포 아래에서 십 년을 버티며 독문(獨門) 심법을 스스로 세우고', '벼락을 맞고 막혔던 기경팔맥(奇經八脈)이 단번에 뚫리고',
    '꿈결에 나타난 검선(劍仙)에게 한 초식의 정수를 전해 받고', '맹독에 중독됐다 살아나며 만독불침의 몸을 얻고',
    '낡은 그림 속에 숨겨진 무공 도해(圖解)를 해독해 내고', '강에 빠져 떠내려온 비급 한 권을 건져 익히고',
    '노승의 화두(話頭)를 깨치며 무(武)와 선(禪)을 하나로 꿰뚫고', '전대의 원한이 깃든 마검(魔劍)을 길들여 제 것으로 삼고',
  ],
  // 익히는 절학/무공 계열 — 모두 명사(목적어 자리)
  art: [
    '천마신공(天魔神功)', '구양신공(九陽神功)', '북명신공(北冥神功)', '소무상공(小無相功)', '독고구검(獨孤九劍)',
    '육맥신검(六脈神劍)', '흡성대법(吸星大法)', '건곤대나이(乾坤大挪移)', '능파미보(凌波微步)의 경공',
    '태극혜검(太極慧劍)', '벽사검법(辟邪劍法)', '항룡십팔장(降龍十八掌)', '암기·용독을 아우른 당문(唐門)의 절기',
    '검기를 검강(劍罡)으로 끌어올리는 어검술', '심법과 보법을 하나로 묶은 가전(家傳) 무학',
    '소림의 역근경(易筋經)', '무당의 양의심공(兩儀心功)', '한 자루 도(刀)로 백병을 누르는 패도(覇刀) 도법',
    '그림자조차 베는 무영(無影) 암살검', '내력을 폭사시키는 폭렬장(爆裂掌)',
    '뼈를 깎아 새로 세우는 세수경(洗髓經)', '바람을 타고 천 리를 가는 천리신행(千里神行)',
    '천 갈래 빙백(氷魄)의 한기를 부리는 빙공(氷功)',
  ],
  // 적대 세력·정세 — 모두 명사구(대결 대상)
  faction: [
    '천하를 노리는 마교(魔敎)', '정파의 가면을 쓴 위선의 무림맹', '새외(塞外)에서 밀려오는 라마승 세력',
    '강호를 잠식하는 살수조직 혈교', '서로 반목하는 구파일방(九派一幇)', '암기와 독으로 무장한 사천당문',
    '검의 명가 남궁세가', '지략과 진법의 제갈세가', '북해빙궁(北海氷宮)의 빙공 고수들',
    '정보를 쥐고 흔드는 개방(丐幇)', '금기무공을 탐하는 사파(邪派) 연합', '관무불가침을 깨려는 황실의 그림자',
    '강호를 사고파는 거대 상단(商團) 금룡방', '시신을 부리는 사술의 혈마교(血魔敎)',
    '암기와 기관으로 무장한 당가타(唐家陀)', '천축에서 건너온 밀종(密宗)의 고수들',
    '바다를 건너온 왜구(倭寇)의 검호 무리', '복수의 칼을 가는 멸문 가문의 후예들',
    '무림을 통째로 삼키려는 천하회(天下會)', '겉은 표국 속은 살막인 비밀 조직',
  ],
  // 은원·동기(협의 윤리) — 모두 '~위해' 목적절
  motive: [
    '사문과 가족을 몰살한 원수에게 복수하기 위해', '강호에 진 은혜를 갚기 위해', '빼앗긴 가문의 명예를 되찾기 위해',
    '사부의 유지를 받들어 정사대전을 막기 위해', '누명을 벗고 진실을 밝히기 위해', '쟁탈전에 휘말린 신공 비급을 지키기 위해',
    '연인의 죽음에 얽힌 비밀을 파헤치기 위해', '천하제일을 가려 강호의 질서를 바로 세우기 위해',
    '회귀 전의 비극을 되돌리기 위해', '약자를 짓밟는 흑도(黑道)를 응징하기 위해', '봉인된 마(魔)의 부활을 저지하기 위해',
    '헤어진 핏줄의 행방을 찾기 위해', '버려진 고향 마을을 지키기 위해',
    '스승을 죽음으로 내몬 음모를 밝히기 위해', '강호에 떠도는 거짓 소문의 진상을 바로잡기 위해',
    '병든 누이를 살릴 영약을 구하기 위해', '제 안에 깃든 마기(魔氣)를 다스리기 위해',
  ],
  // 결말 방향(무협 특유의 귀은 포함) — 모두 '~지만' 연결절
  ending: [
    '천하제일인의 자리에 올라 무림지존이 되지만', '모든 은원을 끊고 강호를 떠나 귀은(歸隱)하지만',
    '금기무공의 대가로 단전을 잃고 폐인이 되지만', '최종보스가 사부·혈육이었음을 알고 무너지지만',
    '정사대전을 끝내 천하에 평화를 가져오지만', '승리하고도 모든 동료를 잃은 채 홀로 남지만',
    '진정한 강함은 무공이 아님을 깨닫고 검을 거두지만', '새로운 위협의 씨앗을 남긴 채 다음 강행(江行)을 떠나지만',
    '원수를 용서하고 검 대신 붓을 들지만', '얻은 모든 명성을 버리고 산속에 은거하지만',
    '천하를 구하고도 세상에 이름 한 줄 남기지 않지만', '사랑하는 이와 함께 강호를 등지고 떠나지만',
    '복수를 완성한 자리에서 허무함만 마주하지만',
  ],
  // 강호 무대·정세(새 슬롯) — 모두 '~에서/~의 강호에서' 류 부사구, 다른 슬롯과 독립
  stage: [
    '난세로 들끓는 중원(中原)의 강호에서', '문파 간 맹약이 깨진 혼돈의 무림에서',
    '정사대전의 전운이 감도는 시절에', '한 갑자에 한 번 열리는 비무대회를 앞두고',
    '역병과 흉년으로 민심이 흉흉한 변방에서', '황실의 권력 다툼이 강호까지 번진 와중에',
    '새외 세력이 관문을 넘보는 변경(邊境)에서', '강호의 질서가 무너진 무림 공백기에',
    '천년의 봉인이 풀리려는 마(魔)의 땅 근처에서', '비밀결사가 어둠 속에서 세를 불리는 시기에',
    '오랜 가뭄 끝에 영약이 쏟아진 영산(靈山)에서', '강과 호수를 잇는 수로 상권을 둘러싼 다툼 속에서',
    '눈 덮인 북방의 빙궁(氷宮) 일대에서',
  ],
  // 반전·제약(새 슬롯) — 모두 '~지만/~채' 류 부사절, 결말과 독립적으로 끼어드는 복선
  twist: [
    '익힌 무공이 수명을 갉아먹는 줄도 모른 채', '곁의 동료가 적의 첩자임을 끝내 알지 못한 채',
    '제 정체가 강호 전체의 표적임을 뒤늦게 깨닫고도', '한 번 패하면 모든 것을 잃는 처지에 몰린 채',
    '믿었던 사문이 사실은 적과 한통속이었지만', '얼굴을 알아보는 자가 나타나면 끝장날 위험을 안고',
    '내공이 들끓어 언제 주화입마에 빠질지 모르는 몸으로', '맺은 인연마다 비극으로 끝나는 운명을 짊어진 채',
    '강호 전체가 자신을 오해해 등을 돌린 가운데', '시간이 얼마 남지 않은 시한부의 몸으로',
    '한 사람을 지키려다 더 큰 것을 잃을 위기 속에서',
  ],
}
type PoolKey = keyof typeof POOL
const SLOT_ORDER: PoolKey[] = ['hero', 'stage', 'serendipity', 'art', 'faction', 'motive', 'twist', 'ending']
const SLOT_LABEL: Record<PoolKey, string> = {
  hero: '주인공', stage: '강호 무대', serendipity: '기연', art: '절학', faction: '적대 세력', motive: '동기·은원', twist: '반전·제약', ending: '결말 방향',
}
const COMBO = SLOT_ORDER.reduce((acc, k) => acc * POOL[k].length, 1)

function buildLogline(slots: Record<PoolKey, string>): string {
  // 조사는 앞 글자 받침을 보고 실제로 하나만 골라 출력(괄호 이중표기 없음).
  return `${slots.hero}${josa(slots.hero, 'EUN')} ${slots.stage} ${slots.serendipity} ${slots.art}${josa(slots.art, 'EUL')} 익혀, ${slots.faction}에 맞서 ${slots.motive}, ${slots.twist} ${slots.ending} 끝내 자신만의 길을 간다.`
}

// ── 단계 템플릿(매크로 구조) ─────────────────────────────────────────
interface StageDef { title: string; hint: string }
type Mode = 'epic' | 'web'

// 장편 대하형 8단계(도시에 §4 매크로 구조)
const EPIC: StageDef[] = [
  { title: '발단 — 불우한 시작', hint: '사문·가문의 몰락, 폐인·막내 취급. 주인공의 결핍과 약자 상태를 보여 성장 곡선의 바닥을 깐다.' },
  { title: '기연·각성', hint: '절벽 추락→비동 비급, 영약 복용, 전대고수의 전수 등 무공 급성장 트리거. 기연엔 반드시 대가·제약을 붙인다.' },
  { title: '출도(出道)', hint: '강호 진출. 객잔 시비→정체 일부 노출, 첫 시련과 작은 명성 획득. 강호의 세력 구도를 독자에게 소개한다.' },
  { title: '세력 충돌의 상승', hint: '사파·마교·내부 음모와 중간보스 계단. 점층적으로 적이 강해지고 주인공의 위계(일류→절정)가 오른다.' },
  { title: '위기·추락(최저점)', hint: '배신·주화입마·동료의 죽음·정체 폭로. 중반 최저점에서 성취를 무너뜨려 긴장을 끌어올린다.' },
  { title: '재기·진각성', hint: '더 큰 무공·심마 극복·숨겨진 진실 각성. 환골탈태/반로환동급 도약과 함께 반격의 발판을 마련한다.' },
  { title: '천하대전', hint: '정사대전·마교 침공 등 강호 전체 규모의 결전. 개인 복수가 천하대의로 확장되며 스케일이 폭발한다.' },
  { title: '결말 — 등극 또는 귀은', hint: '천하제일 등극, 혹은 모든 것을 버리고 은거(歸隱). 대가 지불형 승리·정체/혈연 반전으로 여운을 남긴다.' },
]

// 웹소설 회차형(도시에 §4 웹소설형 페이싱)
const WEB: StageDef[] = [
  { title: '회귀·치트의 발단', hint: '천하제일이 죽고 약자 시절로 회귀(또는 빙의). 미래 지식·전생의 무공 기억이라는 더블 어드밴티지를 깐다.' },
  { title: '첫 사이다 — 무시당함→증명', hint: '주변에 얕보이다가 한 회 안에 압도적으로 반격. 마지막 "경악 리액션"으로 카타르시스를 닫는다.' },
  { title: '계단식 파워업①', hint: '새 지역=새 강적=새 무공의 반복 비트. 미래 지식으로 영약·비급을 선점해 또래를 추월한다.' },
  { title: '정체 숨김과 잦은 폭로', hint: '실력·신분을 숨겼다가 짧은 주기로 떡밥을 회수. 비무·논검에서 정체가 한 꺼풀씩 드러난다.' },
  { title: '세력전 — 문파/세가 흡수', hint: '구파일방·세가·살막과 충돌하며 세력을 키운다. 먼치킨의 격차를 군중 리액션으로 과시한다.' },
  { title: '계단식 파워업②', hint: '화경·현경 등 상위 경지로 도약. 라이벌·중간보스를 확인사살하며 위상·칭호를 획득한다.' },
  { title: '강호 규모 결전', hint: '마교·새외 세력과의 대전. 압도적 격차 확인 + 적의 경악 + 새 칭호로 마무리하는 사이다 정점.' },
  { title: '에필로그 — 새 위상', hint: '천하제일 등극과 다음 무대 예고. 사이다 남발로 긴장이 죽지 않도록 마지막 한 방을 아껴 둔다.' },
]
const TEMPLATES: Record<Mode, StageDef[]> = { epic: EPIC, web: WEB }
const MODE_LABEL: Record<Mode, string> = { epic: '장편 대하형(8단계)', web: '웹소설 회차형(8비트)' }

// 계보 모드(도시에 §1 — 문체·도덕관·페이싱이 갈림). 줄거리/메모에 톤 힌트를 덧붙인다.
type Lineage = 'kim' | 'gu' | 'sinmu' | 'web'
const LINEAGE: Record<Lineage, { label: string; tone: string }> = {
  kim: { label: 'A 김용형 정통대협', tone: '협의 대자(俠之大者)·위국위민. 국가·민족 차원의 대의와 군상극.' },
  gu: { label: 'B 고룡형 낭인추리', tone: '단문·분위기·추리. 고독한 낭인, 찰나의 한 수로 끝내는 결투.' },
  sinmu: { label: 'C 한무 신무협(좌백·용대운)', tone: '캐릭터 내면·문체 혁신, 한국적 정서와 대가 지불형 비극.' },
  web: { label: 'D 웹소설 회귀먼치킨(화산귀환형)', tone: '회차당 사이다·미래지식·먼치킨 카타르시스.' },
}

// ── 데이터 모델 ─────────────────────────────────────────────────────
interface Item { id: string; title: string; body: string; done: boolean }
interface Saved { mode: Mode; lineage: Lineage; title: string; items: Item[] }

function buildFromTemplate(mode: Mode): Item[] {
  return TEMPLATES[mode].map((s) => ({ id: newId(), title: s.title, body: '', done: false }))
}

function load(): Saved {
  const fallback: Saved = { mode: 'epic', lineage: 'sinmu', title: '', items: buildFromTemplate('epic') }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return fallback
    const mode: Mode = p.mode === 'web' ? 'web' : 'epic'
    const lineage: Lineage = (['kim', 'gu', 'sinmu', 'web'] as Lineage[]).includes(p.lineage) ? p.lineage : 'sinmu'
    const items: Item[] = Array.isArray(p.items)
      ? p.items.filter((x: any) => x && typeof x === 'object').map((x: any) => ({
          id: String(x.id || newId()),
          title: typeof x.title === 'string' ? x.title : '(제목 없음)',
          body: typeof x.body === 'string' ? x.body : '',
          done: !!x.done,
        }))
      : buildFromTemplate(mode)
    return { mode, lineage, title: typeof p.title === 'string' ? p.title : '', items: items.length ? items : buildFromTemplate(mode) }
  } catch { return fallback }
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
export default function WuxiaOutline({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [mode, setMode] = useState<Mode>(init.current.mode)
  const [lineage, setLineage] = useState<Lineage>(init.current.lineage)
  const [title, setTitle] = useState(init.current.title)
  const [items, setItems] = useState<Item[]>(init.current.items)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showLogline, setShowLogline] = useState(true)

  // 줄거리 생성기 슬롯 상태(잠금 포함)
  const [slots, setSlots] = useState<Record<PoolKey, string>>(() => {
    const s = {} as Record<PoolKey, string>
    SLOT_ORDER.forEach((k) => { s[k] = pick(POOL[k]) })
    return s
  })
  const [locked, setLocked] = useState<Record<PoolKey, boolean>>(() => {
    const l = {} as Record<PoolKey, boolean>
    SLOT_ORDER.forEach((k) => { l[k] = false }); return l
  })

  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  // payload.genre 가 무협이면 안내(연계로 열렸을 때 톤 자동 추천)
  useEffect(() => {
    if (payload && payload.genre === '무협') flash('무협 장르로 연계되어 열렸어요. 계보 톤을 골라 개요를 시작하세요.')
    // 외부에서 시드 줄거리를 넘겨주면 슬롯 일부를 반영
    if (payload && typeof payload.hero === 'string') setSlots((p) => ({ ...p, hero: String(payload.hero) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ mode, lineage, title, items })) }
    catch { flash('이 브라우저에서 저장이 막혀 새로고침 시 개요가 사라질 수 있어요.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lineage, title, items])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3400)
  }

  const logline = useMemo(() => buildLogline(slots), [slots])

  // ── 단계 템플릿 전환 ──
  const applyTemplate = (m: Mode) => {
    const hasContent = items.some((i) => i.body.trim() || i.done)
    if (hasContent && !window.confirm(`${MODE_LABEL[m]} 템플릿으로 바꾸면 현재 작성한 단계 내용이 초기화됩니다. 계속할까요?`)) return
    setMode(m)
    setItems(buildFromTemplate(m))
    setEditingId(null)
    flash(`${MODE_LABEL[m]} 템플릿을 적용했어요.`)
  }

  // ── 줄거리 굴리기(잠금 슬롯 보존) ──
  const reroll = () => {
    setSlots((prev) => {
      const next = { ...prev }
      SLOT_ORDER.forEach((k) => { if (!locked[k]) next[k] = pick(POOL[k]) })
      return next
    })
  }
  const rerollOne = (k: PoolKey) => setSlots((prev) => ({ ...prev, [k]: pick(POOL[k]) }))
  const toggleLock = (k: PoolKey) => setLocked((prev) => ({ ...prev, [k]: !prev[k] }))

  // 줄거리를 특정 단계 본문에 삽입
  const insertLogline = (id: string) => {
    setItems((prev) => prev.map((it) => it.id === id
      ? { ...it, body: it.body.trim() ? it.body.trim() + '\n' + logline : logline }
      : it))
    flash('생성한 줄거리를 해당 단계에 넣었어요.')
  }

  // 줄거리를 라이브러리 스니펫으로 저장
  const saveLoglineSnippet = () => {
    addToLibrary('snippets', { text: logline, source: '무협 개요 빌더', tags: ['무협', '줄거리', SLOT_LABEL.art + ':' + slots.art] })
    flash('줄거리를 글감 라이브러리(스니펫)에 저장했어요.')
  }

  // ── 항목 CRUD/이동 ──
  const editItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const addItem = () => {
    const it: Item = { id: newId(), title: '새 단계', body: '', done: false }
    setItems((prev) => [...prev, it]); setEditingId(it.id)
  }
  const delItem = (id: string) => {
    const it = items.find((x) => x.id === id)
    if (it && (it.body.trim()) && !window.confirm(`'${it.title}' 단계를 삭제할까요?`)) return
    setItems((prev) => prev.filter((x) => x.id !== id))
    if (editingId === id) setEditingId(null)
  }
  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return prev }
      const next = [...prev]; const [it] = next.splice(i, 1); next.splice(j, 0, it); return next
    })
  }
  const resetTemplate = () => {
    if (!window.confirm('현재 템플릿으로 모든 단계를 초기화할까요? 작성 내용이 사라집니다.')) return
    setItems(buildFromTemplate(mode)); setEditingId(null); flash('템플릿을 초기 상태로 되돌렸어요.')
  }

  // ── HTML 직렬화(프로젝트 본문) ──
  const toBodyHtml = (): string => {
    let out = ''
    if (title.trim()) out += `<p><strong>${escHtml(title.trim())}</strong></p>`
    out += `<p><em>구조: ${escHtml(MODE_LABEL[mode])} · 계보: ${escHtml(LINEAGE[lineage].label)}</em></p>`
    out += `<p><em>톤: ${escHtml(LINEAGE[lineage].tone)}</em></p>`
    out += '<ol>'
    for (const it of items) {
      const head = escHtml(it.title) + (it.done ? ' ✓' : '')
      const body = it.body.trim() ? '<br>' + escHtml(it.body.trim()).replace(/\n/g, '<br>') : ''
      out += `<li><strong>${head}</strong>${body}</li>`
    }
    out += '</ol>'
    return out
  }

  // ── 프로젝트 연동 ──
  const addOutlineToProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '개요',
      title: title.trim() || '무협 개요',
      bodyHtml: toBodyHtml(),
      meta: { 장르: '무협', 구조: MODE_LABEL[mode], 계보: LINEAGE[lineage].label, 단계수: String(items.length), 완료: String(items.filter((i) => i.done).length) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 무협 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // ── 텍스트 복사 ──
  const copyText = async () => {
    let out = (title.trim() ? title.trim() + '\n' : '') + `[${MODE_LABEL[mode]} · ${LINEAGE[lineage].label}]\n\n`
    items.forEach((it, i) => {
      out += `${i + 1}. ${it.title}${it.done ? ' ✓' : ''}\n`
      if (it.body.trim()) out += it.body.trim().split('\n').map((l) => '   ' + l).join('\n') + '\n'
      out += '\n'
    })
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(out.trim())
      else {
        const ta = document.createElement('textarea'); ta.value = out.trim(); ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash('개요 전체를 클립보드에 복사했어요.')
    } catch { flash('복사에 실패했어요.') }
  }

  const copyLogline = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(logline)
      flash('줄거리를 복사했어요.')
    } catch { flash('복사에 실패했어요.') }
  }

  const doneCount = items.filter((i) => i.done).length

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '10px 12px 16px' }
  const sel: React.CSSProperties = { padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 140, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, background: 'var(--paper)', padding: 10, marginBottom: 10 }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }
  const gen: React.CSSProperties = { border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))', borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 7%, var(--paper))', padding: 12, marginBottom: 12 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 13 }
  const taStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', padding: 8, fontSize: 13, lineHeight: 1.6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', font: 'inherit' }

  return (
    <div style={wrap}>
      {/* 상단: 구조/계보/제목 */}
      <div style={bar}>
        <select style={sel} value={mode} onChange={(e) => applyTemplate(e.target.value as Mode)} title="매크로 구조 선택">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
        <select style={sel} value={lineage} onChange={(e) => setLineage(e.target.value as Lineage)} title="계보(톤) 선택">
          {(Object.keys(LINEAGE) as Lineage[]).map((l) => <option key={l} value={l}>{LINEAGE[l].label}</option>)}
        </select>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="작품 제목(예: 천마, 다시 강호에 서다)" />
      </div>

      {note && <div style={noteBar}>{note}</div>}

      <div style={body}>
        {/* 계보 톤 안내 */}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--accent)' }}>톤</strong> · {LINEAGE[lineage].tone}
        </div>

        {/* 줄거리 생성기(슬롯 풀 무작위·잠금·조합수) */}
        {showLogline && (
          <div style={gen}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}><Emoji e="🎲"/> 무협 줄거리 굴리기</strong>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>가능한 조합 <strong style={{ color: 'var(--accent)' }}>{fmtBig(COMBO)}</strong> (정확히 {COMBO.toLocaleString()})</span>
              <div style={{ flex: 1 }} />
              <button className="btn-primary" onClick={reroll} title="잠그지 않은 슬롯만 다시 굴리기"><Emoji e="🎲"/> 굴리기</button>
              <button className="minibtn" onClick={() => setShowLogline(false)}>접기</button>
            </div>
            <div style={{ marginBottom: 8 }}>
              {SLOT_ORDER.map((k) => (
                <div key={k} style={slotRow}>
                  <button className="minibtn" onClick={() => toggleLock(k)} title={locked[k] ? '잠금 해제' : '이 슬롯 잠그기'} style={{ width: 30 }}><>{locked[k] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</></button>
                  <span style={{ width: 64, color: 'var(--muted)', flexShrink: 0 }}>{SLOT_LABEL[k]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{slots[k]}</span>
                  <button className="minibtn" onClick={() => rerollOne(k)} title="이 슬롯만 굴리기">↻</button>
                </div>
              ))}
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)', fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>
              {logline}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={copyLogline} title="줄거리 복사"><Emoji e="📋"/> 복사</button>
              <button className="minibtn" onClick={saveLoglineSnippet} title="글감 라이브러리에 저장">＋ 글감 저장</button>
              {items.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>→ 넣을 단계:</span>
                  <select style={sel} defaultValue="" onChange={(e) => { if (e.target.value) { insertLogline(e.target.value); e.target.value = '' } }}>
                    <option value="">단계 선택…</option>
                    {items.map((it, i) => <option key={it.id} value={it.id}>{i + 1}. {it.title}</option>)}
                  </select>
                </span>
              )}
            </div>
          </div>
        )}
        {!showLogline && (
          <button className="minibtn" onClick={() => setShowLogline(true)} style={{ marginBottom: 12 }}><Emoji e="🎲"/> 줄거리 굴리기 펼치기</button>
        )}

        {/* 단계(장/막) 목록 */}
        {items.map((it, i) => {
          const def = TEMPLATES[mode][i]
          const editing = editingId === it.id
          return (
            <div key={it.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={it.done} onChange={(e) => editItem(it.id, { done: e.target.checked })} title="이 단계 완료 표시" />
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 20, textAlign: 'right' }}>{i + 1}</span>
                {editing ? (
                  <input style={{ ...titleInput, flex: 1 }} value={it.title} onChange={(e) => editItem(it.id, { title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null) }} autoFocus />
                ) : (
                  <strong style={{ flex: 1, fontSize: 14, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--muted)' : 'var(--text)' }}>{it.title}</strong>
                )}
                <button className="minibtn" onClick={() => move(it.id, -1)} disabled={i === 0} title="위로">↑</button>
                <button className="minibtn" onClick={() => move(it.id, 1)} disabled={i === items.length - 1} title="아래로">↓</button>
                <button className="minibtn" onClick={() => setEditingId(editing ? null : it.id)} title="제목 편집"><>{editing ? '✓' : <Emoji e="✏️"/>}</></button>
                <button className="minibtn" onClick={() => delItem(it.id)} title="삭제"><Emoji e="🗑️"/></button>
              </div>
              {def && <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 6px 28px', lineHeight: 1.6 }}>{def.hint}</div>}
              <textarea style={{ ...taStyle, marginTop: 4 }} value={it.body} placeholder="이 단계의 줄거리를 적거나, 위에서 굴린 줄거리를 넣으세요."
                onChange={(e) => editItem(it.id, { body: e.target.value })} />
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <button className="minibtn" onClick={addItem}>＋ 단계 추가</button>
          <button className="minibtn" onClick={resetTemplate}>↺ 템플릿 초기화</button>
        </div>
      </div>

      {/* 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={addOutlineToProject} disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '무협 개요를 프로젝트 원고 "개요" 폴더 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={copyText} title="개요 전체를 텍스트로 복사"><Emoji e="📋"/> 전체 복사</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '무협' })} title="장면 목록 도구 열기"><Emoji e="🎬"/> 장면 목록</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '무협' })} title="플롯 피라미드 도구 열기"><Emoji e="⛰️"/> 플롯 피라미드</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '무협', hero: slots.hero })} title="캐릭터 생성기 열기"><Emoji e="🧬"/> 인물 만들기</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>단계 {items.length} · 완료 {doneCount}</span>
      </div>
    </div>
  )
}
