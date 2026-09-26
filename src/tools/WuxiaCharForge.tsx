// 무협 캐릭터 생성기 — 강호 인물의 원형×역할×무공×동기×결점×관계 슬롯을 무작위 조합.
// 슬롯별 🔒 잠금 + 부분 재생성. 조합수 표시(1조+). 연계: 인물 시트 · 인물 라이브러리 · 프로젝트(자료 › 인물) 카드 추가.
import { useMemo, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, Emoji, type SharedCharacter } from './linkbus'

export const meta = { id: 'wuxia-charforge', name: '무협 인물 단조', icon: '⚔️', group: '캐릭터', genre: '무협', intro: '강호 인물의 원형·문파·무공·은원·심마를 무작위 조합해 무협 캐릭터를 단조한다', w: 580, h: 680 }

function ri(n: number) { return Math.floor(Math.random() * n) }
function pick<T>(a: T[]): T { return a[ri(a.length)] }
function picks<T>(a: T[], n: number): T[] { return [...new Set(Array.from({ length: n * 3 }, () => pick(a)))].slice(0, n) }

// ── 성명(姓名) ─────────────────────────────────────────────
// 성씨(중복 없는 고유 항목) — 무협 명문가·복성 포함
const SURNAME = ['남궁', '독고', '사마', '제갈', '모용', '황보', '서문', '구양', '하후', '동방', '진', '백', '냉', '단', '엽', '소', '임', '곽', '당', '청', '능', '한', '위', '연', '추', '강', '범', '좌', '석', '맹', '사', '갈', '우', '주', '전']
// 이름 첫 글자(고유) — 무협식 항렬자
const GIVEN1 = ['천', '운', '비', '검', '무', '명', '현', '소', '한', '월', '풍', '뇌', '연', '진', '백', '청', '자', '혁', '강', '령', '효', '홍', '서', '랑', '경', '도', '상', '광', '담', '결', '인', '협', '용']
// 이름 끝 글자(고유)
const GIVEN2 = ['상', '룡', '운', '검', '천', '랑', '명', '하', '월', '소', '풍', '경', '한', '비', '진', '강', '현', '광', '령', '학', '기', '연', '호', '극', '뢰', '환', '결', '성', '회', '벽', '음', '백', '향']
const TITLE = ['검신(劍神)', '도왕(刀王)', '혈수나찰(血手羅刹)', '천면귀공자(千面貴公子)', '취협(醉俠)', '백의서생(白衣書生)', '독종(毒宗)', '무영검객(無影劍客)', '광검(狂劍)', '소요산인(逍遙散人)', '귀곡노조(鬼谷老祖)', '일도양단(一刀兩斷)', '천수관음(千手觀音)', '냉면판관(冷面判官)', '추혼사자(追魂使者)', '낙엽비도(落葉飛刀)', '벽력당주(霹靂堂主)', '소림광승(少林狂僧)', '검귀(劍鬼)', '천외천(天外天)', '없음(아직 무명)']

// ── 진영·문파 ──────────────────────────────────────────────
const FACTION = ['정파(正派)', '사파(邪派)', '마교(魔敎)', '녹림(綠林)', '흑도(黑道)', '새외(塞外)', '관(官)', '낭인(浪人)·무소속', '은거기인', '무림맹(武林盟)', '세외세가(世外世家)']
const SECT = [
  '소림사(少林寺)', '무당파(武當派)', '화산파(華山派)', '아미파(峨嵋派)', '곤륜파(崑崙派)', '점창파(點蒼派)', '청성파(靑城派)', '종남파(終南派)', '공동파(崆峒派)', '개방(丐幇)',
  '남궁세가(검)', '사천당문(암기·독)', '모용세가', '황보세가', '제갈세가(진법)', '하북팽가(도법)',
  '천마신교(天魔神敎)', '일월신교(日月神敎)', '혈교(血敎)', '오독문(五毒門)', '살막(殺幕)', '녹림십팔채(綠林十八寨)',
  '서장 밀교(密敎)', '북해빙궁(北海氷宮)', '장강수로채(長江水路寨)', '하오문(下汚門)', '무명소문파', '문파 없음(독행)',
]
const RANK = ['삼류 무사', '이류 고수', '일류 고수', '절정고수', '초절정', '화경(化境)', '현경(玄境)', '생사경(生死境)', '무림지존급', '아직 무공을 모르는 범인(凡人)']

// ── 원형(原型) ─────────────────────────────────────────────
const ARCHETYPE = [
  '몰락 명문가의 마지막 핏줄', '폐인 취급받던 막내 제자', '기연으로 급성장한 무재(無才)', '천하제일을 노리는 후기지수', '복수에 미친 유일한 생존자',
  '정체를 숨긴 마교 후계', '강호를 등진 은거 고수', '돈만 받으면 다 하는 살수', '의리 하나로 사는 녹림 두목', '술과 검밖에 모르는 취객',
  '독과 암기에 통달한 당문의 신동', '진법과 기관에 밝은 책사형 고수', '병기를 만드는 신병(神兵) 장인', '강호 정보를 쥔 개방 거지', '환골탈태한 노고수',
  '주화입마 직전의 광인', '천기를 읽는 점성·역술가', '의술과 독술을 겸한 의선(醫仙)', '표국을 지키는 노련한 표두', '신분을 위장한 황실 밀정',
  '비급 한 권에 인생을 건 도굴꾼', '여협(女俠)으로 이름난 검수', '사부의 유지를 떠안은 후인(後人)', '천하를 떠도는 무명 낭인',
]
const ROLE = ['주인공', '사부/스승', '동문 사형(師兄)', '동문 사매(師妹)', '숙적·라이벌', '최종보스(천마/교주)', '중간보스', '배신할 동료', '조력 기인', '연심을 품은 상대', '은원으로 얽힌 원수', '정보를 파는 거간꾼', '겉만 우군인 첩자', '비운의 희생양']

// ── 무공(武功) ─────────────────────────────────────────────
const WEAPON = ['검(劍)', '도(刀)', '창(槍)', '봉(棍)', '권각(拳脚)·맨손', '암기(暗器)', '판관필(判官筆)', '연검(軟劍)', '쌍검(雙劍)', '월아산(月牙鏟)', '채찍(鞭)', '비도(飛刀)', '선(扇)·접선', '독침·독공', '거치도(鋸齒刀)']
const SKILL_INNER = ['구양신공(九陽神功)', '소무상공(小無相功)', '태청강기(太淸罡氣)', '자하신공(紫霞神功)', '천마신공(天魔神功)', '흡성대법(吸星大法)', '북명신공(北冥神功)', '역근경(易筋經)', '혼원일기공(混元一氣功)', '귀원공(歸元功)', '빙백신공(氷魄神功)', '대라신공(大羅神功)']
const SKILL_OUTER = ['독고구검(獨孤九劍)', '태극검법(太極劍法)', '벽력도법(霹靂刀法)', '낙영검법(落英劍法)', '항룡십팔장(降龍十八掌)', '탄지신통(彈指神通)', '능공허도(凌空虛渡)', '만천화우(滿天花雨)', '쾌활림 도법', '천붕권(天崩拳)', '비류추혼검(飛流追魂劍)', '오독장(五毒掌)', '무영각(無影脚)', '백보신권(百步神拳)']
const QINGGONG = ['답설무흔(踏雪無痕)', '이형환위(移形換位)', '능파미보(凌波微步)', '제운종(梯雲縱)', '초상비(草上飛)', '평지등운(平地登雲)', '신행백변(神行百變)', '비연답파(飛燕踏波)', '운룡대팔식(雲龍大八式)', '천근추(千斤墜)', '경공이 형편없음']
const SIGNATURE = ['단 한 수에 승부를 보는 발검술', '쉴 새 없이 몰아치는 연환격', '상대 초식을 그대로 되돌리는 차력타력', '독·암기로 정면 승부를 피함', '내공을 폭주시키는 동귀어진의 한 수', '소리 없이 급소만 노리는 점혈술', '강기로 검을 휘둘러 십 보 밖을 베는 검강', '미친 듯한 검무로 시야를 가리는 환검(幻劍)', '느려 보이나 피할 수 없는 후발선지', '진법을 깔아 다수를 상대하는 합공술']

// ── 외양 ───────────────────────────────────────────────────
const APPEAR = ['칼날 같은 눈매에 창백한 낯', '먼지투성이 무명옷의 떠돌이 행색', '백의(白衣)에 흐트러짐 없는 귀공자풍', '온몸의 흉터를 자랑처럼 드러낸', '술 냄새 풍기는 헝클어진 폐인 꼴', '눈 먼 듯 안대를 두른', '나이를 가늠할 수 없는 동안(童顔)의 노고수', '붉은 무복에 살기를 감춘', '승복·도포 차림의 출가인', '여인의 몸으로 남장(男裝)을 한', '병약해 보이나 안광만은 형형한', '거구에 우락부락한 산적 풍모']
const ITEM = ['전대 고수가 남긴 신병이기(神兵利器)', '반쪽만 남은 비급(秘笈)', '늘 차고 다니는 술호로(酒葫蘆)', '독을 바른 은침 한 줌', '죽은 사부의 유품인 낡은 검', '신분을 증명하는 영패(令牌)', '몸에 두른 연검(軟劍) 한 자루', '약초와 단약이 든 의낭(醫囊)', '면구(面具)로 가린 진짜 얼굴', '주인을 알아보는 영물(靈物) 한 마리', '기관이 숨겨진 접선(摺扇)', '아무것도 가진 것 없는 빈손']

// ── 동기·내면 ──────────────────────────────────────────────
const GOAL = ['멸문(滅門)의 원수를 갚는 것', '천하제일인이 되는 것', '잃어버린 사문의 비급을 되찾는 것', '주화입마에 빠진 사부를 구하는 것', '강호의 혈겁(血劫)을 막는 것', '정체를 숨긴 채 복수를 완성하는 것', '소중한 이를 지키는 것', '폐관 수련으로 무의 극의에 닿는 것', '강호를 떠나 평범히 사는 것', '마교를 무너뜨리는 것', '천하를 손에 넣는 것', '죽은 연인을 살릴 비술을 찾는 것', '가문의 누명을 벗기는 것', '빚진 은혜를 갚는 것']
const MOTIVE = ['멸문지화(滅門之禍)를 겪은 한(恨)', '사부의 죽음과 유지', '갚아야 할 은혜(報恩)', '무에 대한 순수한 광기', '핏줄에 새겨진 사명', '천하를 향한 야망', '연모하는 이를 향한 마음', '치욕을 씻으려는 자존심', '강호의 의(義)를 지키려는 협심', '오직 살아남기 위한 생존 본능']
const FLAW = ['지나친 자존심으로 화를 부름', '의심이 많아 동료를 못 믿음', '욱하는 성미로 살계(殺戒)를 범함', '여색(女色)·주색에 약함', '복수에 눈이 멀어 수단을 안 가림', '제 무공을 과신함', '우유부단해 결정적 순간에 망설임', '은원에 집착해 대국을 못 봄', '겁이 많아 위기 때 도망침', '냉정함이 지나쳐 인심을 잃음', '비급·기연에 대한 탐욕', '약자에게 모질지 못해 발목 잡힘']
const FEAR = ['주화입마로 폐인이 되는 것', '단전이 파괴되어 무공을 잃는 것', '진짜 정체가 들통나는 것', '소중한 이를 또 잃는 것', '심마(心魔)에게 정신을 먹히는 것', '사부·혈육이 적이었음을 알게 되는 것', '강호에서 잊히는 것', '제 손으로 사문을 배신하는 것', '독·중독으로 서서히 죽는 것', '믿었던 동료의 배신']
const SECRET = ['실은 마교 교주의 핏줄이다', '사파의 무공을 몰래 익혔다', '얼굴을 가린 면구 아래 화상 흉터가 있다', '이미 주화입마의 씨앗이 단전에 박혔다', '쌍둥이·대역과 신분을 바꿔 살고 있다', '천하제일 비급의 마지막 장을 숨기고 있다', '과거 무고한 일가를 몰살한 죄가 있다', '실은 여자(혹은 남자)다', '명문정파의 탈을 쓴 살수 조직 출신이다', '불치의 지병으로 수명이 얼마 남지 않았다', '연모하는 상대가 부모를 죽인 원수다', '잃은 줄 알았던 혈육이 적진에 있다']

// ── 심마·대가 ─────────────────────────────────────────────
const XINMO = ['익힌 마공이 점점 이성을 잠식한다', '내공을 쓸수록 수명이 줄어든다', '흡성대법으로 빨아들인 진기가 폭주한다', '살수록 살심(殺心)이 짙어진다', '심마가 사람 형상으로 환영처럼 나타난다', '주화입마의 후유증으로 한쪽 경맥이 막혔다', '독에 중독되어 매달 해약이 필요하다', '강해질수록 인간성을 잃어간다', '기연의 대가로 감정을 점점 못 느낀다', '아직 아무 대가도 치르지 않았다(평온)']

// ── 말투·기질 ─────────────────────────────────────────────
const SPEECH = ['“노부(老夫)가…”—거만한 노고수 어투', '“재하(在下)…”—겸양 떠는 협객 어투', '“본좌(本座)…”—오만방자한 마두 어투', '“소생(小生)이…”—점잖은 서생 어투', '“빈도(貧道)…”—도사 특유의 무위 어투', '“소승(小僧)…”—불가 출가인 어투', '말수 적고 검으로 답하는 과묵형', '술 취한 듯 횡설수설하나 핵심을 찌름', '냉소와 비아냥이 몸에 밴 독설가', '걸쭉한 욕설을 입에 단 녹림 말투', '시(詩)와 풍류를 읊는 문아한 말투', '능청과 너스레로 속을 감추는 어투']
const HABIT = ['싸우기 전 술을 한 모금 들이켠다', '검집을 손가락으로 톡톡 두드린다', '말끝마다 옛 사부의 가르침을 읊는다', '상대를 베기 전 이름을 묻는다', '눈을 감고 운기조식하는 버릇', '품속 비급을 수시로 확인한다', '진 빚은 반드시 적어 두는 결벽', '위기일수록 더 느긋해진다', '약자를 보면 그냥 못 지나친다', '핏자국을 보면 손이 떨린다']

// ── 은원·관계 ─────────────────────────────────────────────
const BOND = ['생사를 함께한 의형제(義兄弟)', '한 사부 아래 동문수학한 사형제', '서로를 알아본 평생의 지기(知己)', '강호에 둘도 없는 숙적(宿敵)', '은혜를 입어 평생 갚아야 할 은인', '멸문의 한이 사무친 불구대천 원수', '신분을 넘은 금지된 연심의 상대', '겉은 우군이나 속은 첩자인 자', '서로 정체를 모르고 얽힌 부모·혈육', '무공을 겨루기로 약조한 비무 상대']
const ENMITY = ['사문을 멸한 자에 대한 멸문지원(滅門之怨)', '내공을 폐인으로 만든 자에 대한 원한', '비급을 빼앗아 간 자와의 쟁탈', '연인을 죽인 자를 향한 복수', '강호의 명예를 더럽힌 자와의 결투 약조', '은혜를 원수로 갚은 자에 대한 응징', '아직 갚지 못한 빚(은혜)', '서로 죽이지 않기로 한 휴전', '갚을 원한도 은혜도 없는 신참', '천하의 대의(大義)를 두고 갈린 노선']

// ── 슬롯 정의 ──────────────────────────────────────────────
interface Gen {
  seed: number
  name: string; title: string; faction: string; sect: string; rank: string
  archetype: string; role: string
  weapon: string; inner: string; outer: string; qinggong: string; signature: string
  appear: string; item: string
  goal: string; motive: string; flaw: string; fear: string; secret: string; xinmo: string
  speech: string; habit: string; bond: string; enmity: string
}
type SlotKey = keyof Omit<Gen, 'seed'>

function genName(): string { return pick(SURNAME) + pick(GIVEN1) + pick(GIVEN2) }

// 아직 무공을 모르는 범인(凡人) 경지
const RANK_COMMONER = '아직 무공을 모르는 범인(凡人)'
const TITLE_NONE = '없음(아직 무명)'
const XINMO_NONE = '아직 아무 대가도 치르지 않았다(평온)'
// 범인 경지일 때 게이트로 강제되는 슬롯들
const GATED_KEYS: SlotKey[] = ['title', 'weapon', 'inner', 'outer', 'qinggong', 'signature', 'xinmo']

// 무공 미지자(범인)에게 의미 정합하게 강제되는 값 — 별호 없음, 무공 전부 '익히지 않음',
// 심마는 '대가 없음'으로 게이트. 슬롯 배열은 그대로 유지하므로 조합수(곱)는 불변.
function gateCommoner(g: Gen): Gen {
  if (g.rank !== RANK_COMMONER) return g
  return {
    ...g,
    title: TITLE_NONE,
    weapon: '아직 익힌 병기가 없음(맨손)',
    inner: '익힌 내공심법이 없음',
    outer: '익힌 외공·초식이 없음',
    qinggong: '익힌 경공이 없음',
    signature: '내세울 무공이 없음(싸움은 몸으로 버틸 뿐)',
    xinmo: XINMO_NONE,
  }
}

function genOne(): Gen {
  return gateCommoner({
    seed: ri(1e9),
    name: genName(), title: pick(TITLE), faction: pick(FACTION), sect: pick(SECT), rank: pick(RANK),
    archetype: pick(ARCHETYPE), role: pick(ROLE),
    weapon: pick(WEAPON), inner: pick(SKILL_INNER), outer: pick(SKILL_OUTER), qinggong: pick(QINGGONG), signature: pick(SIGNATURE),
    appear: pick(APPEAR), item: pick(ITEM),
    goal: pick(GOAL), motive: pick(MOTIVE), flaw: pick(FLAW), fear: pick(FEAR), secret: pick(SECRET), xinmo: pick(XINMO),
    speech: pick(SPEECH), habit: pick(HABIT), bond: pick(BOND), enmity: pick(ENMITY),
  })
}

// 조합수: 성명(姓×名×名) + 주요 슬롯 곱 (1조+ 지향)
const NAME_COMBOS = SURNAME.length * GIVEN1.length * GIVEN2.length
const COMBOS = NAME_COMBOS * TITLE.length * FACTION.length * SECT.length * RANK.length *
  ARCHETYPE.length * ROLE.length * WEAPON.length * SKILL_INNER.length * SKILL_OUTER.length *
  QINGGONG.length * SIGNATURE.length * APPEAR.length * ITEM.length * GOAL.length * MOTIVE.length *
  FLAW.length * FEAR.length * SECRET.length * XINMO.length * SPEECH.length * HABIT.length *
  BOND.length * ENMITY.length

const ROWS: { k: SlotKey; label: string; grp: string }[] = [
  { k: 'name', label: '성명', grp: '신원' }, { k: 'title', label: '별호(別號)', grp: '신원' },
  { k: 'faction', label: '진영', grp: '신원' }, { k: 'sect', label: '문파/세가', grp: '신원' }, { k: 'rank', label: '경지', grp: '신원' },
  { k: 'archetype', label: '인물 원형', grp: '신원' }, { k: 'role', label: '서사 역할', grp: '신원' },
  { k: 'weapon', label: '병기', grp: '무공' }, { k: 'inner', label: '내공심법', grp: '무공' }, { k: 'outer', label: '외공·초식', grp: '무공' },
  { k: 'qinggong', label: '경공', grp: '무공' }, { k: 'signature', label: '필살기·전술', grp: '무공' },
  { k: 'appear', label: '외양', grp: '외양' }, { k: 'item', label: '소지·신물', grp: '외양' },
  { k: 'goal', label: '목표', grp: '내면' }, { k: 'motive', label: '동기(근원)', grp: '내면' },
  { k: 'flaw', label: '약점·결점', grp: '내면' }, { k: 'fear', label: '두려움', grp: '내면' },
  { k: 'secret', label: '비밀', grp: '내면' }, { k: 'xinmo', label: '심마·대가', grp: '내면' },
  { k: 'speech', label: '말투', grp: '기질' }, { k: 'habit', label: '버릇', grp: '기질' },
  { k: 'bond', label: '관계(인연)', grp: '관계' }, { k: 'enmity', label: '은원(恩怨)', grp: '관계' },
]
const GROUPS = ['신원', '무공', '외양', '내면', '기질', '관계']

function valStr(g: Gen, k: SlotKey): string { return String(g[k]) }
function avatarUrl(g: Gen): string {
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(g.name + g.seed)}`
}

function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export default function WuxiaCharForge({ payload }: { payload?: Record<string, unknown> }) {
  const [g, setG] = useState<Gen>(() => genOne())
  const [locked, setLocked] = useState<Partial<Record<SlotKey, boolean>>>({})
  const [toast, setToast] = useState('')
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const savedRef = useRef(false)

  const addCustom = () => {
    const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim()
    if (!label) return
    setCustom((c) => [...c, { id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), label, value: '' }])
  }
  const setCustomValue = (id: string, value: string) => setCustom((c) => c.map((x) => (x.id === id ? { ...x, value } : x)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((x) => x.id !== id))
  // 사용자 정의 항목(값 비어있지 않은 것)과 기타를 fields 맵에 합친다
  const mergeExtraFields = (fields: Record<string, string>): Record<string, string> => {
    const out = { ...fields }
    for (const x of custom) { if (x.label.trim() && x.value.trim()) out[x.label.trim()] = x.value.trim() }
    if (etc.trim()) out.etc = etc.trim()
    return out
  }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1700) }

  const rollAll = () => {
    setG((prev) => {
      const next = genOne()
      for (const r of ROWS) if (locked[r.k]) (next as unknown as Record<string, unknown>)[r.k] = (prev as unknown as Record<string, unknown>)[r.k]
      // 잠금 복원으로 경지가 범인으로 고정됐는데 무공 슬롯이 풀려 있으면 정합화
      return gateCommoner(next)
    })
    setCustom((c) => c.map((x) => ({ ...x, value: '' }))) // 항목 정의는 유지, 값만 비움
    setEtc('')
    savedRef.current = false
  }
  const rollOne = (k: SlotKey) => setG((prev) => {
    // 범인 게이트로 강제된 슬롯은 단독 재추첨해도 의미가 없으니 그대로 둔다
    if (prev.rank === RANK_COMMONER && k !== 'rank' && GATED_KEYS.includes(k)) return prev
    const fresh = genOne()
    const merged = { ...prev, [k]: (fresh as unknown as Record<string, unknown>)[k] } as Gen
    // 경지를 새로 뽑았다면(범인↔무인 전환) 게이트를 다시 적용해 무공·별호·심마를 정합화
    return k === 'rank' ? gateCommoner(merged) : merged
  })
  const toggleLock = (k: SlotKey) => setLocked((l) => ({ ...l, [k]: !l[k] }))

  // 공유/프로젝트용 인물 필드 매핑
  const toCharacterFields = (): Record<string, string> => ({
    name: g.name + (g.title !== '없음(아직 무명)' ? ` (${g.title})` : ''),
    role: g.role,
    occupation: `${g.faction} · ${g.sect} · ${g.rank}`,
    appearance: `${g.appear} · 소지: ${g.item}`,
    personality: `${g.archetype} · 말투: ${g.speech} · 버릇: ${g.habit}`,
    martial: `병기: ${g.weapon} · 심법: ${g.inner} · 초식: ${g.outer} · 경공: ${g.qinggong} · 필살: ${g.signature}`,
    goal: g.goal,
    background: `동기: ${g.motive} · 인연: ${g.bond}`,
    conflict: `약점: ${g.flaw} · 두려움: ${g.fear} · 비밀: ${g.secret} · 심마: ${g.xinmo} · 은원: ${g.enmity}`,
  })
  // 표준(정규) 키로 1:1 매핑한 인물 필드 — 받는 허브(인물 시트)에서 기본 칸에 들어가도록
  const toCanonicalFields = (): Record<string, string> => ({
    name: g.name + (g.title !== '없음(아직 무명)' ? ` (${g.title})` : ''),
    aka: g.title !== '없음(아직 무명)' ? g.title : '',
    role: g.role,
    occupation: g.rank,
    affiliation: g.sect,
    origin: g.faction,
    appearance: g.appear,
    personality: g.archetype,
    goal: g.goal,
    motivation: g.motive,
    flaw: g.flaw,
    fear: g.fear,
    secret: g.secret,
    speech: g.speech,
    habit: g.habit,
    arc: g.xinmo,
    relations: `인연: ${g.bond} · 은원: ${g.enmity}`,
    background: `동기: ${g.motive}`,
    notes: `병기: ${g.weapon} · 심법: ${g.inner} · 초식: ${g.outer} · 경공: ${g.qinggong} · 필살: ${g.signature} · 소지: ${g.item}`,
  })
  const summaryText = () => {
    const base = ROWS.map((r) => r.label + ': ' + valStr(g, r.k)).join('\n')
    const extra = custom.filter((x) => x.label.trim() && x.value.trim()).map((x) => x.label.trim() + ': ' + x.value.trim())
    const lines = [base, ...extra]
    if (etc.trim()) lines.push('기타: ' + etc.trim())
    return lines.join('\n')
  }
  const bodyHtml = () => {
    const base = GROUPS.map((grp) =>
      `<p><b>【${esc(grp)}】</b></p>` +
      ROWS.filter((r) => r.grp === grp).map((r) => `<p>${esc(r.label)}: ${esc(valStr(g, r.k))}</p>`).join('')
    ).join('')
    const extras = custom.filter((x) => x.label.trim() && x.value.trim())
    let add = ''
    if (extras.length || etc.trim()) {
      add += `<p><b>【기타】</b></p>`
      add += extras.map((x) => `<p>${esc(x.label.trim())}: ${esc(x.value.trim())}</p>`).join('')
      if (etc.trim()) add += `<p>기타: ${esc(etc.trim())}</p>`
    }
    return base + add
  }

  const toSheet = () => { openToolLinked('character-sheet', { character: { ...toCharacterFields(), photo: avatarUrl(g), photoCredit: 'DiceBear', fields: mergeExtraFields(toCanonicalFields()) } }); flash('인물 시트로 보냈습니다') }
  const toLibrary = () => {
    const c: Partial<SharedCharacter> = {
      name: g.name, photo: avatarUrl(g), photoCredit: 'DiceBear', role: g.title !== '없음(아직 무명)' ? g.title : g.role,
      goal: g.goal, secret: g.secret,
      fields: mergeExtraFields(toCanonicalFields()),
      traits: [
        ...ROWS.map((r) => ({ k: r.label, v: valStr(g, r.k) })),
        ...custom.filter((x) => x.label.trim() && x.value.trim()).map((x) => ({ k: x.label.trim(), v: x.value.trim() })),
        ...(etc.trim() ? [{ k: '기타', v: etc.trim() }] : []),
      ], source: '무협 인물 단조',
    }
    addToLibrary('characters', c); flash('인물 라이브러리에 저장했습니다')
  }
  const toSnippet = () => {
    addToLibrary('snippets', { text: summaryText(), tags: ['무협', '인물', g.faction], source: '무협 인물 단조' })
    flash('글감(스니펫) 라이브러리에 저장했습니다')
  }
  const toProject = () => {
    const fields = mergeExtraFields({ ...toCharacterFields(), ...toCanonicalFields() })
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: g.name,
      character: fields,
      bodyHtml: bodyHtml(),
      meta: { 별호: g.title, 진영: g.faction, 문파: g.sect, 경지: g.rank, 병기: g.weapon, 역할: g.role },
    })
    if (id) { savedRef.current = true; flash('프로젝트 ‘자료 › 인물’에 카드로 추가했습니다 (바인더·DB 확인)') }
    else flash('프로젝트에 추가할 수 없습니다')
  }
  const copyAll = () => { navigator.clipboard?.writeText(summaryText()).then(() => flash('전체 복사됨')).catch(() => {}) }
  const copyOne = (k: SlotKey) => { navigator.clipboard?.writeText(valStr(g, k)).then(() => flash('복사됨')).catch(() => {}) }

  // payload 로 reroll 요청 시 1회 재생성
  useMemo(() => { if (payload?.reroll) rollAll() /* eslint-disable-next-line */ }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="⚔️" /> 무협 인물 단조</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>약 {COMBOS.toLocaleString()} 조합</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <img src={avatarUrl(g)} alt={g.name} width={88} height={88} style={{ borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)' }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{g.name}</div>
          {g.title !== '없음(아직 무명)' && <div style={{ fontSize: 11, color: 'var(--accent)' }}>{g.title}</div>}
          <div className="license-note" style={{ marginTop: 2 }}>DiceBear 아바타</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, alignSelf: 'center' }}>
          {g.faction} · {g.sect}<br />
          {g.rank} · {g.weapon}<br />
          <span style={{ color: 'var(--text)' }}>{g.archetype}</span><br />
          목표: {g.goal}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GROUPS.map((grp) => (
          <div key={grp}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', margin: '2px 0 3px' }}>【{grp}】</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {ROWS.filter((r) => r.grp === grp).map((r) => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', width: 60, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} title={valStr(g, r.k) + ' (클릭 복사)'} onClick={() => copyOne(r.k)}>{valStr(g, r.k)}</span>
                  <button className="minibtn" title={locked[r.k] ? '잠금해제' : '잠금'} onClick={() => toggleLock(r.k)} style={{ padding: '0 3px', color: locked[r.k] ? 'var(--accent)' : 'var(--muted)' }}>{locked[r.k] ? <Emoji e="🔒" /> : <Emoji e="🔓" />}</button>
                  <button className="minibtn" title="이 항목만 다시" onClick={() => rollOne(r.k)} disabled={!!locked[r.k]} style={{ padding: '0 3px' }}><Emoji e="🎲" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0 3px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)' }}>【사용자 정의】</span>
            <button className="minibtn" onClick={addCustom} style={{ marginLeft: 'auto' }}>＋ 항목 추가</button>
          </div>
          {custom.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {custom.map((x) => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', width: 60, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.label}>{x.label}</span>
                  <input value={x.value} onChange={(e) => setCustomValue(x.id, e.target.value)} placeholder="직접 입력" style={{ flex: 1, minWidth: 0, fontSize: 11, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }} />
                  <button className="minibtn" title="삭제" onClick={() => removeCustom(x.id)} style={{ padding: '0 3px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 5 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>기타 (자유 입력)</div>
            <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="추가로 적을 내용을 자유롭게 입력하세요" rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 11, lineHeight: 1.5, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲" /> 인물 단조</button>
        <button className="minibtn" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연동:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄" /> 프로젝트에 인물 추가</button>
        <button className="linkbtn" onClick={toSheet}><Emoji e="🪪" /> 인물 시트로</button>
        <button className="linkbtn" onClick={toLibrary}><Emoji e="📥" /> 인물 라이브러리</button>
        <button className="linkbtn" onClick={toSnippet}><Emoji e="🧩" /> 글감 저장</button>
      </div>
      <div style={{ fontSize: 11, color: toast ? 'var(--ok)' : 'var(--muted)' }}>{toast || <>슬롯 <Emoji e="🔒" /> 잠금 후 <Emoji e="🎲" /> 로 부분 재생성. 값 클릭 시 복사. 정·사·마 진영과 은원·심마까지 한 번에 단조합니다.</>}</div>
    </div>
  )
}
