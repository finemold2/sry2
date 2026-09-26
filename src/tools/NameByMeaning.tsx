// 뜻으로 이름 짓기(로컬) — 원하는 의미/이미지(빛·용맹·바다·지혜·그림자 등)를 고르면
// 그 뜻을 담은 인물 이름 후보를 문화권별(한국/서양/판타지)로 생성하고, 각 후보의 의미 설명을 붙인다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 API·네트워크 불필요(전부 로컬 표 + Math.random).
// 잠금/재생성으로 마음에 드는 후보만 고정해 다시 뽑을 수 있고, 가능한 조합 수(수만+)를 표시한다.
// 연계: 인물 시트로 보내기 / 공유 인물 라이브러리(characters) 저장 / 프로젝트 자료(작명) 추가.
// localStorage 'sry:tool:name-by-meaning' 자동 저장/복원(설정·즐겨찾기) + 빈 상태 안내 + 언마운트 정리.
import { useState, useEffect, useRef, useCallback } from 'react'
import { openToolLinked, addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = {
  id: 'name-by-meaning',
  name: '뜻으로 이름 짓기',
  icon: '✨',
  group: '영감·발상',
  intro: '빛·용맹·바다 같은 의미를 고르면 그 뜻을 담은 인물 이름을 문화권별로 지어 줍니다',
  w: 620,
  h: 640,
}

const STORE_KEY = 'sry:tool:name-by-meaning'

// ── 문화권 ──
type Culture = 'kr' | 'west' | 'fantasy'
const CULTURES: { key: Culture; label: string; icon: string; desc: string }[] = [
  { key: 'kr', label: '한국', icon: '🇰🇷', desc: '한자/순우리말 뜻을 담은 두 글자 이름' },
  { key: 'west', label: '서양', icon: '🌍', desc: '어원에 그 뜻이 담긴 서구식 이름' },
  { key: 'fantasy', label: '판타지', icon: '🐉', desc: '음절을 엮어 만든 이세계풍 이름' },
]

// ── 의미 카테고리(테마) ──
// 각 테마는 문화권별 후보 풀을 가진다.
//  - kr/west: 완성된 이름 + 뜻 풀이(엔트리 배열)
//  - fantasy: 그 의미를 표현하는 음절 조각(앞/뒤) 풀을 따로 엮어 조합
interface NamedEntry { name: string; gloss: string }     // gloss: 의미·어원 설명
interface Theme {
  key: string
  label: string
  icon: string
  blurb: string                                            // 테마 한 줄 설명(분위기)
  kr: NamedEntry[]
  west: NamedEntry[]
  fantasy: { pre: string[]; suf: string[] }                // 음절 조각(이 의미 느낌)
}

const THEMES: Theme[] = [
  {
    key: 'light', label: '빛', icon: '🔆', blurb: '밝음·희망·구원의 기운',
    kr: [
      { name: '서광', gloss: '상서로운 빛(瑞光) — 새벽처럼 밝아 오는 희망' },
      { name: '하림', gloss: '하늘의 빛이 내린다는 순우리말 느낌의 이름' },
      { name: '윤슬', gloss: '햇빛에 반짝이는 잔물결을 뜻하는 순우리말' },
      { name: '명환', gloss: '밝게 빛난다(明煥) — 환히 비추는 사람' },
      { name: '소명', gloss: '환하게 밝힌다(昭明) — 어둠을 걷어 내는 빛' },
      { name: '빛나', gloss: '스스로 빛난다는 순우리말 이름' },
    ],
    west: [
      { name: 'Lucia', gloss: '라틴어 lux(빛)에서 — "빛의 사람"' },
      { name: 'Aaron', gloss: '히브리어로 "빛을 가져오는 자, 산"' },
      { name: 'Helena', gloss: '그리스어 helē(횃불·빛)에서 — "빛나는"' },
      { name: 'Lucian', gloss: '라틴어 lux(빛)에서 온 남성형 이름' },
      { name: 'Nora', gloss: '라틴어 honor/그리스어 빛에서 — "빛, 영예"' },
      { name: 'Roshan', gloss: '페르시아어로 "빛나는, 밝은"' },
    ],
    fantasy: { pre: ['Lum', 'Aur', 'Sol', 'Lir', 'Ely', 'Fae'], suf: ['iel', 'ara', 'on', 'ys', 'wen', 'lor'] },
  },
  {
    key: 'shadow', label: '그림자', icon: '🌑', blurb: '어둠·은밀함·미스터리',
    kr: [
      { name: '야린', gloss: '밤(夜)의 그늘 같은 서늘한 분위기의 이름' },
      { name: '현묵', gloss: '검고 그윽하다(玄默) — 깊은 어둠 속 침묵' },
      { name: '그늘', gloss: '드리운 그림자를 뜻하는 순우리말 이름' },
      { name: '윤암', gloss: '윤기 도는 어둠(暗) — 매혹적인 그늘' },
      { name: '소야', gloss: '작은 밤(小夜) — 고요한 어둠' },
      { name: '검우', gloss: '검은 비(雨)처럼 내리는 어둠의 기운' },
    ],
    west: [
      { name: 'Erebus', gloss: '그리스 신화의 "암흑·그림자의 화신"' },
      { name: 'Layla', gloss: '아랍어 layl(밤)에서 — "밤, 어둠"' },
      { name: 'Cole', gloss: '고대 영어로 "숯처럼 검은, 어두운"' },
      { name: 'Delphine', gloss: '어둑한 깊은 곳의 분위기를 머금은 이름' },
      { name: 'Kieran', gloss: '게일어 ciar(검은)에서 — "검은 머리의"' },
      { name: 'Nyx', gloss: '그리스 신화의 "밤의 여신"' },
    ],
    fantasy: { pre: ['Mor', 'Nox', 'Umb', 'Vesp', 'Sha', 'Dur'], suf: ['eth', 'rim', 'ix', 'uth', 'aug', 'var'] },
  },
  {
    key: 'sea', label: '바다', icon: '🌊', blurb: '깊이·자유·끝없음',
    kr: [
      { name: '해리', gloss: '바다(海)의 마을·이치 — 너른 바다 같은 사람' },
      { name: '윤해', gloss: '윤슬 이는 바다(海)의 잔잔함' },
      { name: '바다', gloss: '그대로 "바다"를 담은 순우리말 이름' },
      { name: '청람', gloss: '푸른 물결(靑藍) — 짙은 바다빛' },
      { name: '해온', gloss: '바다(海)의 따뜻함(溫)을 품은 이름' },
      { name: '여울', gloss: '얕게 흐르는 물살을 뜻하는 순우리말' },
    ],
    west: [
      { name: 'Marina', gloss: '라틴어 marinus(바다의)에서 — "바다의"' },
      { name: 'Dylan', gloss: '웨일스어로 "큰 물결, 바다의 아들"' },
      { name: 'Kai', gloss: '하와이어로 "바다"' },
      { name: 'Morgan', gloss: '웨일스어로 "바다에서 태어난, 바다의 원"' },
      { name: 'Pelagia', gloss: '그리스어 pelagos(난바다)에서 — "넓은 바다"' },
      { name: 'Murray', gloss: '게일어로 "바닷가에 사는 사람"' },
    ],
    fantasy: { pre: ['Mar', 'Thal', 'Nere', 'Aqu', 'Cae', 'Tide'], suf: ['ion', 'wyn', 'ssa', 'ros', 'mir', 'eth'] },
  },
  {
    key: 'valor', label: '용맹', icon: '⚔️', blurb: '용기·강인함·전사의 기개',
    kr: [
      { name: '강혁', gloss: '굳세고 빛난다(剛赫) — 흔들림 없는 용기' },
      { name: '무진', gloss: '무예가 다함이 없다(武盡) — 끝없는 기개' },
      { name: '용후', gloss: '용맹한 제후(勇侯) — 앞장서는 사람' },
      { name: '한결', gloss: '한결같이 굳센 마음의 순우리말 이름' },
      { name: '굳건', gloss: '굳고 든든하다는 순우리말 느낌의 이름' },
      { name: '의찬', gloss: '의로움으로 빛난다(義燦) — 용기 있는 의인' },
    ],
    west: [
      { name: 'Andrew', gloss: '그리스어 andreios(용감한)에서 — "사내다운, 용맹한"' },
      { name: 'Valeria', gloss: '라틴어 valere(강하다)에서 — "강인한"' },
      { name: 'Gerald', gloss: '게르만어로 "창으로 다스리는 자, 용맹한"' },
      { name: 'Casey', gloss: '게일어로 "용맹하고 경계하는"' },
      { name: 'Audra', gloss: '게르만어로 "고귀한 힘"' },
      { name: 'Brian', gloss: '켈트어로 "고귀한, 강한"' },
    ],
    fantasy: { pre: ['Dra', 'Kor', 'Val', 'Theron', 'Grim', 'Ald'], suf: ['mar', 'dor', 'gar', 'rik', 'thane', 'orn'] },
  },
  {
    key: 'wisdom', label: '지혜', icon: '🦉', blurb: '통찰·총명·깊은 사려',
    kr: [
      { name: '예지', gloss: '슬기롭게 알다(叡智) — 앞을 내다보는 지혜' },
      { name: '지율', gloss: '지혜(智)의 가락(律) — 사려 깊은 조화' },
      { name: '명철', gloss: '밝고 통한다(明哲) — 사리에 환한 사람' },
      { name: '슬기', gloss: '슬기로움을 그대로 담은 순우리말 이름' },
      { name: '혜안', gloss: '지혜의 눈(慧眼) — 본질을 꿰뚫는 통찰' },
      { name: '도현', gloss: '도리에 밝고 어질다(道賢)' },
    ],
    west: [
      { name: 'Sophia', gloss: '그리스어 sophia(지혜)에서 — "지혜"' },
      { name: 'Alvin', gloss: '고대 영어로 "지혜로운 벗"' },
      { name: 'Minerva', gloss: '로마 지혜의 여신 이름' },
      { name: 'Conrad', gloss: '게르만어로 "현명한 조언자"' },
      { name: 'Hugo', gloss: '게르만어 hug(마음·지성)에서 — "지성, 사려"' },
      { name: 'Sage', gloss: '영어로 "현자, 슬기로운"' },
    ],
    fantasy: { pre: ['Eld', 'Mira', 'Vor', 'Sael', 'Cael', 'Theo'], suf: ['wyn', 'ion', 'eth', 'lis', 'andra', 'os'] },
  },
  {
    key: 'fire', label: '불꽃', icon: '🔥', blurb: '열정·파괴·정화의 화염',
    kr: [
      { name: '염화', gloss: '타오르는 불꽃(炎火) — 뜨거운 열정' },
      { name: '홍염', gloss: '붉게 타오르는 불꽃(紅炎)' },
      { name: '불꽃', gloss: '타오름을 그대로 담은 순우리말 이름' },
      { name: '단우', gloss: '붉을 단(丹) — 불처럼 선명한 사람' },
      { name: '혁염', gloss: '빛나는 불꽃(赫炎) — 강렬한 기세' },
      { name: '타오', gloss: '"타오르다"에서 온 순우리말 느낌의 이름' },
    ],
    west: [
      { name: 'Aiden', gloss: '게일어로 "작은 불, 불꽃"' },
      { name: 'Ignatius', gloss: '라틴어 ignis(불)에서 — "불의"' },
      { name: 'Seraphina', gloss: '히브리어 saraph(타오르다)에서 — "불타는 천사"' },
      { name: 'Brand', gloss: '게르만어로 "횃불, 칼날의 불꽃"' },
      { name: 'Phoenix', gloss: '불 속에서 되살아나는 불사조' },
      { name: 'Ember', gloss: '영어로 "잉걸불, 사그라들지 않는 불씨"' },
    ],
    fantasy: { pre: ['Pyr', 'Ign', 'Embr', 'Cind', 'Raz', 'Vol'], suf: ['ara', 'eth', 'on', 'yx', 'ius', 'orn'] },
  },
  {
    key: 'star', label: '별·하늘', icon: '⭐', blurb: '운명·동경·아득한 하늘',
    kr: [
      { name: '별하', gloss: '별과 하늘을 함께 담은 순우리말 이름' },
      { name: '성하', gloss: '별(星)이 빛나는 하늘 — 빛나는 사람' },
      { name: '하늘', gloss: '드넓은 하늘을 그대로 담은 순우리말 이름' },
      { name: '윤성', gloss: '윤기 도는 별(星) — 은은히 빛나는' },
      { name: '아라', gloss: '"아라(드넓은)"에서 온 하늘처럼 너른 이름' },
      { name: '천우', gloss: '하늘(天)의 벗(友) — 하늘이 내린 사람' },
    ],
    west: [
      { name: 'Stella', gloss: '라틴어 stella(별)에서 — "별"' },
      { name: 'Esther', gloss: '페르시아어로 "별"' },
      { name: 'Sterling', gloss: '"작은 별"의 분위기를 머금은 이름' },
      { name: 'Astra', gloss: '그리스어 astron(별)에서 — "별들의"' },
      { name: 'Celeste', gloss: '라틴어 caelestis(하늘의)에서 — "천상의"' },
      { name: 'Hoshi', gloss: '일본어로 "별"' },
    ],
    fantasy: { pre: ['Astr', 'Cael', 'Stel', 'Lyr', 'Sider', 'Vega'], suf: ['iel', 'ya', 'wen', 'on', 'ara', 'mir'] },
  },
  {
    key: 'flower', label: '꽃·봄', icon: '🌸', blurb: '아름다움·생명·피어남',
    kr: [
      { name: '화연', gloss: '꽃처럼 아름다운 인연(花緣)' },
      { name: '봄이', gloss: '봄을 그대로 담은 순우리말 이름' },
      { name: '예린', gloss: '아리땁고 빛난다(藝麟) — 곱게 피어난' },
      { name: '도화', gloss: '복숭아꽃(桃花) — 화사하게 핀 봄' },
      { name: '하늬', gloss: '봄의 서풍을 뜻하는 순우리말 이름' },
      { name: '연화', gloss: '연꽃(蓮花) — 진흙 속에서 핀 아름다움' },
    ],
    west: [
      { name: 'Flora', gloss: '라틴어 flos(꽃)에서 — 꽃의 여신' },
      { name: 'Rosa', gloss: '라틴어로 "장미"' },
      { name: 'Susan', gloss: '히브리어로 "백합, 장미"' },
      { name: 'Yasmin', gloss: '페르시아어로 "재스민 꽃"' },
      { name: 'Verena', gloss: '봄과 피어남의 분위기를 머금은 이름' },
      { name: 'Lily', gloss: '영어로 "백합" — 순결한 꽃' },
    ],
    fantasy: { pre: ['Fae', 'Lila', 'Bloss', 'Vern', 'Eyl', 'Thia'], suf: ['wen', 'ara', 'lyn', 'is', 'ora', 'nae'] },
  },
  {
    key: 'storm', label: '폭풍·번개', icon: '⛈️', blurb: '격변·힘·거스를 수 없는 기세',
    kr: [
      { name: '뇌진', gloss: '천둥과 우레(雷震) — 떨치는 기세' },
      { name: '풍운', gloss: '바람과 구름(風雲) — 격변의 조짐' },
      { name: '벼리', gloss: '그물의 중심 줄 — 폭풍 속 중심을 잡는' },
      { name: '한새', gloss: '거센 바람(한)을 가르는 새 같은 이름' },
      { name: '진우', gloss: '우레(震)와 비(雨) — 휘몰아치는 기운' },
      { name: '회오리', gloss: '소용돌이치는 바람의 순우리말 이름' },
    ],
    west: [
      { name: 'Zephyr', gloss: '그리스어로 "서풍"' },
      { name: 'Boreas', gloss: '그리스 신화의 "북풍의 신"' },
      { name: 'Tempest', gloss: '영어로 "폭풍, 격동"' },
      { name: 'Raiden', gloss: '일본 신화의 "천둥과 번개의 신"' },
      { name: 'Gale', gloss: '영어로 "강풍, 돌풍"' },
      { name: 'Stormur', gloss: '북유럽어 분위기의 "폭풍" 이름' },
    ],
    fantasy: { pre: ['Zeph', 'Vor', 'Thun', 'Skor', 'Aeol', 'Fulg'], suf: ['ur', 'rax', 'eon', 'is', 'dar', 'oth'] },
  },
  {
    key: 'frost', label: '얼음·겨울', icon: '❄️', blurb: '냉정·순결·고요한 차가움',
    kr: [
      { name: '설하', gloss: '눈(雪)이 내리는 모습 — 흰 겨울' },
      { name: '한빙', gloss: '차가운 얼음(寒氷) — 서늘한 기품' },
      { name: '겨울', gloss: '겨울을 그대로 담은 순우리말 이름' },
      { name: '소설', gloss: '작은 눈(小雪) — 고요히 내리는 눈' },
      { name: '서리', gloss: '맺힌 서리를 뜻하는 순우리말 이름' },
      { name: '청설', gloss: '맑고 푸른 눈(淸雪) — 깨끗한 겨울' },
    ],
    west: [
      { name: 'Eira', gloss: '웨일스어로 "눈(雪)"' },
      { name: 'Neva', gloss: '스페인어 nieve(눈)에서 — "눈처럼 흰"' },
      { name: 'Yuki', gloss: '일본어로 "눈"' },
      { name: 'Bianca', gloss: '이탈리아어로 "희다" — 눈처럼 흰' },
      { name: 'Frost', gloss: '영어로 "서리"' },
      { name: 'Lumi', gloss: '핀란드어로 "눈(雪)"' },
    ],
    fantasy: { pre: ['Frost', 'Glac', 'Niv', 'Hael', 'Sil', 'Cryo'], suf: ['wen', 'ara', 'is', 'eth', 'mir', 'on'] },
  },
  {
    key: 'earth', label: '대지·산', icon: '⛰️', blurb: '굳건함·인내·뿌리내림',
    kr: [
      { name: '산하', gloss: '산과 강(山河) — 든든한 자연의 품' },
      { name: '대산', gloss: '큰 산(大山) — 흔들리지 않는 무게' },
      { name: '바위', gloss: '단단한 바위를 담은 순우리말 이름' },
      { name: '뫼아', gloss: '"뫼(산)"에서 온 듬직한 순우리말 이름' },
      { name: '근후', gloss: '뿌리(根)가 두텁다(厚) — 굳건한 사람' },
      { name: '터울', gloss: '터를 잡고 뿌리내린다는 느낌의 이름' },
    ],
    west: [
      { name: 'Peter', gloss: '그리스어 petros(바위)에서 — "반석"' },
      { name: 'Terra', gloss: '라틴어로 "대지, 땅"' },
      { name: 'Heath', gloss: '고대 영어로 "황야, 들판"' },
      { name: 'Montgomery', gloss: '"산에 사는 사람" — 굳건한 산의 이름' },
      { name: 'Gaia', gloss: '그리스 신화의 "대지의 여신"' },
      { name: 'Bruno', gloss: '게르만어로 "갈색의, 땅처럼 단단한"' },
    ],
    fantasy: { pre: ['Gron', 'Terr', 'Bald', 'Karn', 'Dur', 'Oren'], suf: ['gar', 'dun', 'mor', 'thal', 'in', 'rok'] },
  },
  {
    key: 'noble', label: '고귀·왕족', icon: '👑', blurb: '품격·통치·고결함',
    kr: [
      { name: '예찬', gloss: '예(禮)로 빛난다(燦) — 품격 있는 사람' },
      { name: '인경', gloss: '어질고 공경할 만하다(仁敬) — 고결함' },
      { name: '왕연', gloss: '제왕의 인연(王緣) — 타고난 기품' },
      { name: '도윤', gloss: '도리(道)가 윤택하다 — 고귀한 인품' },
      { name: '귀하', gloss: '귀하게 여겨지는 사람의 순우리말 이름' },
      { name: '서윤', gloss: '상서롭고(瑞) 윤택한 — 고귀한 복' },
    ],
    west: [
      { name: 'Patricia', gloss: '라틴어 patricius(귀족)에서 — "고귀한"' },
      { name: 'Adelaide', gloss: '게르만어로 "고귀한 종류, 기품"' },
      { name: 'Rex', gloss: '라틴어로 "왕"' },
      { name: 'Eugene', gloss: '그리스어 eugenes에서 — "고귀하게 태어난"' },
      { name: 'Regina', gloss: '라틴어로 "여왕"' },
      { name: 'Cyrus', gloss: '페르시아어로 "왕, 태양 같은 군주"' },
    ],
    fantasy: { pre: ['Aer', 'Vael', 'Cor', 'Rega', 'Eld', 'Thal'], suf: ['ion', 'mond', 'wen', 'aris', 'oth', 'andil'] },
  },
]

const cultureBlurb = (c: Culture) => CULTURES.find((x) => x.key === c)?.label || ''

// ── 한국어 조사 헬퍼: 앞 글자 받침을 보고 실제 하나를 골라 붙인다(괄호 이중표기 금지) ──
// 영문/숫자/공백 등으로 끝나면 받침 없는 쪽으로 처리(외래어 이름 안전).
function hasJong(s: string): boolean {
  const t = (s || '').trim()
  const ch = t.slice(-1)
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 한글이 아니면(로마자 이름 등): 한국어 외래어 표기 기준으로 끝소리를 판정한다.
  //   대부분의 끝자음은 한글로 옮길 때 '으'가 붙어 모음으로 끝난다
  //   (r→르, s→스, t→트, x→ㄱ스, d→드, g→그, f→프, k→크, p→프, b→브 …) → 받침 없음.
  //   실제로 한국어에서 받침으로 남는 끝소리는 n(ㄴ)·l(ㄹ)·m(ㅁ)·ng/n+g(ㅇ) 뿐.
  //   따라서 Stormur·Zephyr(끝 r)·Frost(끝 t)·Nyx(끝 x) 등은 '는/가/로'가 자연스럽다.
  if (/[a-z]/i.test(ch)) {
    if (/[aeiouy]$/i.test(t)) return false                 // 모음으로 끝남 → 받침 없음
    if (/(ng|[nlm])$/i.test(t)) return true                // ㄴ/ㄹ/ㅁ/ㅇ 받침으로 남음
    return false                                           // 그 외 끝자음 → '으' 삽입(받침 없음)
  }
  return false
}
// 로마자 끝소리의 한글 독음 받침 종류 — '으로/로' 판정용(ㄹ 받침은 '로').
//   끝이 l(ㄹ)이면 '로', 그 밖의 받침(n·m·ng)이면 '으로', 받침 없으면 '로'.
function latinJongType(s: string): 'none' | 'r' | 'other' {
  const t = (s || '').trim()
  if (!/[a-z]$/i.test(t)) return 'none'
  if (/[aeiouy]$/i.test(t)) return 'none'
  if (/l$/i.test(t)) return 'r'                            // ㄹ 받침
  if (/(ng|[nm])$/i.test(t)) return 'other'                // ㄴ/ㅁ/ㅇ 받침
  return 'none'                                            // '으' 삽입 → 받침 없음
}
const josaEul = (s: string) => s + (hasJong(s) ? '을' : '를')   // 을/를
const josaI = (s: string) => s + (hasJong(s) ? '이' : '가')     // 이/가
const josaEun = (s: string) => s + (hasJong(s) ? '은' : '는')   // 은/는
// 으로/로: 받침 'ㄹ'은 '로' 사용
function josaRo(s: string): string {
  const ch = (s || '').trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return s + (jong === 0 || jong === 8 ? '로' : '으로')        // 받침 없음 or ㄹ → '로'
  }
  // 로마자 이름: 끝소리 한글 독음 받침 기준(ㄹ·받침없음 → '로', ㄴ/ㅁ/ㅇ → '으로')
  const lt = latinJongType(s)
  return s + (lt === 'other' ? '으로' : '로')
}

// ── 칭호(에피셋) 슬롯: 어떤 의미·문화권과도 자연스레 어울리는 '인물 서사 묘사' 범주.
//   슬롯끼리 서로를 전제하지 않아 곱집합으로 섞여도 의미 충돌이 없다(슬롯 독립성).
//   결과 형식:  「{시대}, {출신}에서 온 {속성} {역할}」  +  태그라인 「{이름}{조사} {운명}.」
// 각 풀은 고유 항목만(중복 없음). 곱집합으로 조합수를 키운다.

// 1) 시대·배경(에포크) — 32
const EPOCHS = [
  '여명이 밝아 오던 시대', '오랜 전란이 끝나갈 무렵', '잊힌 왕조의 황혼기', '신들이 침묵하던 시절',
  '별이 유난히 차갑던 해', '대륙이 둘로 갈라진 뒤', '마지막 봉인이 풀리던 날', '안개가 걷히지 않던 계절',
  '권력이 거듭 뒤바뀌던 시기', '바다 너머 소문이 돌던 무렵', '옛 맹세가 깨지던 밤', '서리가 일찍 내린 겨울',
  '예언이 처음 적히던 시대', '경계가 흐려지던 황혼', '불씨가 되살아나던 봄', '긴 침묵이 깨지던 순간',
  '폐허 위에 깃발이 서던 때', '강물이 거꾸로 흐르던 해', '두 달이 함께 뜨던 밤', '낡은 지도가 다시 펼쳐질 무렵',
  '재가 눈처럼 날리던 시절', '먼 종소리가 끊기던 날', '국경의 등불이 꺼지던 해', '오래된 약속이 깨어나던 때',
  '천둥이 사흘을 울던 무렵', '꽃이 철 없이 피던 해', '길이 모두 막히던 시기', '새 이름이 필요하던 시대',
  '파도가 도시를 삼키던 밤', '하늘 길이 처음 열리던 때', '모래시계가 멈추던 순간', '마지막 등대가 꺼지던 해',
]

// 2) 출신·장소(오리진) — 32
const ORIGINS = [
  '북쪽 끝 설원', '잊힌 해안 마을', '안개 자욱한 협곡', '높은 성벽의 도시', '깊은 숲속 은거지',
  '바람이 머무는 고원', '소금기 어린 항구', '폐허가 된 옛 수도', '달빛 비치는 호숫가', '메마른 변경의 사막',
  '돌탑이 늘어선 골짜기', '강이 갈라지는 삼각주', '눈 덮인 화산 기슭', '별을 보던 천문대 마을', '대장간이 즐비한 산골',
  '바다 위에 뜬 부유섬', '지하로 이어진 옛 광산', '꽃이 만발한 분지', '얼어붙은 북방 요새', '상인들이 모이던 교차로',
  '검은 늪지의 외딴 섬', '구름에 닿은 절벽 마을', '오래된 도서관의 도시', '폭포가 쏟아지는 계곡', '바람개비가 도는 평원',
  '잠든 화산의 칼데라', '난파선이 쌓인 모래톱', '서리 낀 침엽수림', '메아리치는 동굴 도시', '빛이 들지 않는 심해 신전',
  '사구 너머 오아시스', '하늘다리로 이어진 군도',
]

// 3) 속성·형용(트레잇) — 32
const TRAITS = [
  '말수 적은', '굽힐 줄 모르는', '눈빛이 깊은', '발걸음이 가벼운', '속을 알 수 없는',
  '한결같은', '겁이 없는', '손이 빠른', '마음이 너른', '냉정한', '다정한', '집요한',
  '서늘한', '꿋꿋한', '재치 있는', '고요한', '거침없는', '신중한', '대담한', '온화한',
  '날카로운', '의로운', '외로운', '담대한', '섬세한', '굳건한', '자유로운', '결연한',
  '겸손한', '예리한', '끈질긴', '품격 있는',
]

// 4) 역할·칭호(롤) — 32
const ROLES = [
  '추적자', '수호자', '방랑자', '사냥꾼', '책략가', '검객', '약초사', '예언자', '항해사', '대장장이',
  '서기관', '정찰병', '치유사', '도굴꾼', '문지기', '음유시인', '점성술사', '밀정', '계승자', '반역자',
  '순례자', '관문지기', '연금술사', '기수', '파수꾼', '중재자', '조율사', '개척자', '수습 마법사', '의병장',
  '망명객', '계약자',
]

// 5) 지물·상징(시그니처 — 인물을 상징하는 물건/표식) — 32
//   「{지물}{조사(을/를)} 든/지닌 {역할}」 형태로 역할 앞에 붙는다.
const MARKS = [
  '낡은 지도', '은빛 단검', '깨진 나침반', '검은 깃펜', '녹슨 열쇠', '오래된 회중시계',
  '붉은 봉랍 도장', '한 자루 장궁', '닳은 가죽 수첩', '금이 간 거울', '바랜 군기', '청동 방울',
  '서리 맺힌 검', '낡은 망토', '봉인된 두루마리', '깃털 장식 모자', '무딘 손도끼', '유리 호리병',
  '은제 회중 나침반', '검게 그을린 등불', '한 쌍의 단검', '문장이 새겨진 반지', '낡은 류트',
  '약초 주머니', '부러진 화살', '오래된 묵주', '청록빛 부적', '쇠사슬 채찍', '닳은 주사위',
  '별자리 지도', '가죽 물주머니', '은장도',
]

// 6) 운명·술어(데스티니, 종결문 — 이름 뒤 조사로 이어짐) — 32
//   각 항목은 완결된 종결문. {이름}{조사}로 시작하므로 주어 자리에 이름이 자연스레 온다.
type Destiny = { josa: 'eul' | 'i' | 'eun' | 'ro'; tail: string }
const DESTINIES: Destiny[] = [
  { josa: 'eun', tail: '끝내 자신의 길을 찾는다' },
  { josa: 'eun', tail: '무너진 약속을 다시 세운다' },
  { josa: 'eul', tail: '운명이 시험에 들게 한다' },
  { josa: 'i', tail: '세상의 균형을 바꾼다' },
  { josa: 'eun', tail: '잊힌 진실을 좇아 떠난다' },
  { josa: 'eun', tail: '가장 어두운 밤을 건넌다' },
  { josa: 'i', tail: '사라진 것들을 되찾는다' },
  { josa: 'eun', tail: '두려움을 등지고 나아간다' },
  { josa: 'eul', tail: '오랜 적의가 마침내 풀어 준다' },
  { josa: 'eun', tail: '제 손으로 새 시대를 연다' },
  { josa: 'eun', tail: '버려진 자들의 편에 선다' },
  { josa: 'i', tail: '폐허 위에 길을 놓는다' },
  { josa: 'eun', tail: '돌아오지 못할 길을 떠난다' },
  { josa: 'eul', tail: '낡은 예언이 다시 부른다' },
  { josa: 'eun', tail: '침묵 속에서 진실을 지킨다' },
  { josa: 'eun', tail: '잃어버린 이름을 되살린다' },
  { josa: 'i', tail: '흩어진 사람들을 모은다' },
  { josa: 'eun', tail: '마지막 등불을 다시 밝힌다' },
  { josa: 'eul', tail: '세월이 끝내 증명해 낸다' },
  { josa: 'eun', tail: '깨어진 맹세를 거두어들인다' },
  { josa: 'ro', tail: '하나의 전설이 시작된다' },
  { josa: 'eun', tail: '먼 길의 끝에서 자신을 만난다' },
  { josa: 'eul', tail: '거센 폭풍이 단련시킨다' },
  { josa: 'eun', tail: '무거운 짐을 묵묵히 짊어진다' },
  { josa: 'i', tail: '닫힌 문을 끝끝내 연다' },
  { josa: 'eun', tail: '서로 다른 두 세계를 잇는다' },
  { josa: 'eul', tail: '오래된 비밀이 기다린다' },
  { josa: 'eun', tail: '꺼져 가던 불씨를 되살린다' },
  { josa: 'i', tail: '거짓의 장막을 걷어 낸다' },
  { josa: 'eun', tail: '제 안의 어둠과 화해한다' },
  { josa: 'ro', tail: '새로운 항로가 열린다' },
  { josa: 'eun', tail: '끝내 약속의 땅에 닿는다' },
]

// 칭호 슬롯 곱집합 크기(이름 풀과 곱해져 한 결과의 총 조합수가 된다)
const EPITHET_COMBOS =
  EPOCHS.length * ORIGINS.length * TRAITS.length * MARKS.length * ROLES.length * DESTINIES.length

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// 이름 뒤에 운명 술어를 조사와 함께 이어 붙인다(받침 보고 실제 조사 하나만 출력).
function applyJosa(name: string, d: Destiny): string {
  const head =
    d.josa === 'eul' ? josaEul(name) :
    d.josa === 'i' ? josaI(name) :
    d.josa === 'ro' ? josaRo(name) :
    josaEun(name)
  return `${head} ${d.tail}.`
}

// 한 결과의 칭호·태그라인 생성(이름과 독립적으로 뽑히는 슬롯들).
interface Epithet {
  epoch: string
  origin: string
  trait: string
  mark: string
  role: string
  destiny: Destiny
}
function makeEpithet(): Epithet {
  return {
    epoch: pick(EPOCHS), origin: pick(ORIGINS), trait: pick(TRAITS),
    mark: pick(MARKS), role: pick(ROLES), destiny: pick(DESTINIES),
  }
}
// 칭호 한 줄: 「{시대}, {출신}에서 온 {속성} {지물}을/를 든 {역할}」
const epithetTitle = (e: Epithet) =>
  `${e.epoch}, ${e.origin}에서 온 ${e.trait} ${josaEul(e.mark)} 든 ${e.role}`

// ── 후보 한 개 ──
interface Candidate {
  id: string
  name: string
  gloss: string
  themeKey: string
  themeLabel: string
  themeIcon: string
  culture: Culture
  title: string     // 칭호 한 줄(시대·출신·속성·역할)
  tagline: string   // 운명 태그라인(이름+조사+술어)
}

interface Saved {
  id: string
  name: string
  gloss: string
  themeLabel: string
  culture: Culture
}

interface Persisted {
  themeKeys?: string[]
  culture?: Culture
  saved?: Saved[]
}

const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cultureIcon = (c: Culture) => CULTURES.find((x) => x.key === c)?.icon || '🔗'

function loadPersist(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return {}
    return p as Persisted
  } catch {
    return {}
  }
}

// 판타지 이름 한 개 생성: 음절 조각(pre+suf) 조합. 중복 자모음 매끄럽게.
function fantasyName(pre: string[], suf: string[]): { name: string; pre: string; suf: string } {
  const a = pre[Math.floor(Math.random() * pre.length)]
  let b = suf[Math.floor(Math.random() * suf.length)]
  // 모음 충돌(예: ...a + a...) 다듬기
  const vowels = 'aeiouyAEIOUY'
  if (a && b && vowels.includes(a[a.length - 1]) && vowels.includes(b[0])) {
    b = b.slice(1) || b
  }
  const name = (a + b).charAt(0).toUpperCase() + (a + b).slice(1)
  return { name, pre: a, suf: b }
}

// 한 테마+문화권에서 후보 한 개 뽑기(직전 결과와 다르게 시도).
function pickFor(theme: Theme, culture: Culture, avoid?: string): Candidate {
  let name = ''
  let gloss = ''
  if (culture === 'fantasy') {
    const fp = theme.fantasy
    let made = fantasyName(fp.pre, fp.suf)
    if (made.name === avoid) made = fantasyName(fp.pre, fp.suf)
    name = made.name
    gloss = `‘${theme.label}’의 느낌을 음절(${made.pre}+${made.suf})로 엮은 이세계풍 이름`
  } else {
    const pool = culture === 'kr' ? theme.kr : theme.west
    let e = pool[Math.floor(Math.random() * pool.length)]
    if (e.name === avoid && pool.length > 1) e = pool[Math.floor(Math.random() * pool.length)]
    name = e.name
    gloss = e.gloss
  }
  const ep = makeEpithet()
  return {
    id: rid(),
    name,
    gloss,
    themeKey: theme.key,
    themeLabel: theme.label,
    themeIcon: theme.icon,
    culture,
    title: epithetTitle(ep),
    tagline: applyJosa(name, ep.destiny),
  }
}

// 한 결과의 이름 슬롯 풀 크기(선택 테마들의 문화권별 후보 수 합. 판타지는 pre×suf).
function nameSlotSize(themeKeys: string[], culture: Culture): number {
  let total = 0
  for (const k of themeKeys) {
    const t = THEMES.find((x) => x.key === k)
    if (!t) continue
    if (culture === 'fantasy') total += t.fantasy.pre.length * t.fantasy.suf.length
    else total += (culture === 'kr' ? t.kr.length : t.west.length)
  }
  return total
}

// 가능한 조합 수 = 이름 슬롯 × 칭호 슬롯(시대×출신×속성×역할×운명)의 곱.
// 슬롯들은 서로 독립적이라(전제 관계 없음) 곱집합 전체가 의미 있게 성립한다.
function estimateCombos(themeKeys: string[], culture: Culture): number {
  return nameSlotSize(themeKeys, culture) * EPITHET_COMBOS
}

export default function NameByMeaning({ payload }: { payload?: Record<string, unknown> }) {
  const persisted = useRef<Persisted>(loadPersist())

  const [culture, setCulture] = useState<Culture>(() => {
    const c = persisted.current.culture
    return c === 'kr' || c === 'west' || c === 'fantasy' ? c : 'kr'
  })
  const [themeKeys, setThemeKeys] = useState<string[]>(() => {
    const fromPayload = typeof (payload as any)?.theme === 'string' ? String((payload as any).theme) : ''
    if (fromPayload && THEMES.some((t) => t.key === fromPayload)) return [fromPayload]
    const saved = persisted.current.themeKeys
    if (Array.isArray(saved)) {
      const valid = saved.filter((k) => THEMES.some((t) => t.key === k))
      if (valid.length) return valid
    }
    return ['light']
  })

  const [cands, setCands] = useState<Candidate[]>([])
  const [locked, setLocked] = useState<Record<string, boolean>>({}) // candidate id → locked
  const [generated, setGenerated] = useState(false)
  const [copiedId, setCopiedId] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [toast, setToast] = useState('')

  const [saved, setSaved] = useState<Saved[]>(() => {
    const s = persisted.current.saved
    return Array.isArray(s) ? s.filter((x) => x && typeof x.name === 'string') : []
  })

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 설정·즐겨찾기 영속 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ themeKeys, culture, saved } as Persisted))
    } catch { /* 저장 실패 graceful */ }
  }, [themeKeys, culture, saved])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (linkTimer.current) clearTimeout(linkTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const selectedThemes = THEMES.filter((t) => themeKeys.includes(t.key))

  // 생성: 잠긴 후보는 유지하고 나머지 슬롯만 새로 뽑는다. 각 선택 테마당 후보 2개씩.
  const generate = useCallback(() => {
    setCopiedId('')
    const PER_THEME = 2
    setCands((prev) => {
      // 잠긴 후보 보존(선택 테마/문화권과 일치하는 것만)
      const kept = prev.filter(
        (c) => locked[c.id] && themeKeys.includes(c.themeKey) && c.culture === culture,
      )
      const out: Candidate[] = []
      for (const t of selectedThemes) {
        const keptForTheme = kept.filter((c) => c.themeKey === t.key)
        out.push(...keptForTheme)
        const need = PER_THEME - keptForTheme.length
        const usedNames = new Set(keptForTheme.map((c) => c.name))
        for (let i = 0; i < Math.max(0, need); i++) {
          let c = pickFor(t, culture)
          let guard = 0
          while (usedNames.has(c.name) && guard < 8) { c = pickFor(t, culture); guard++ }
          usedNames.add(c.name)
          out.push(c)
        }
      }
      return out
    })
    setGenerated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, themeKeys, culture, selectedThemes])

  // 하나만 다시 뽑기(슬롯 재생성)
  const regenOne = (id: string) => {
    setCopiedId('')
    setCands((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const t = THEMES.find((x) => x.key === c.themeKey)
        if (!t) return c
        const nc = pickFor(t, c.culture, c.name)
        return { ...nc, id: c.id } // 같은 슬롯 id 유지(잠금 상태 보존 위해)
      }),
    )
  }

  const toggleTheme = (key: string) => {
    setThemeKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev // 최소 1개 유지
        return prev.filter((k) => k !== key)
      }
      // 원래 표 순서 유지
      return THEMES.filter((t) => prev.includes(t.key) || t.key === key).map((t) => t.key)
    })
  }

  const toggleLock = (id: string) => setLocked((prev) => ({ ...prev, [id]: !prev[id] }))

  const combos = estimateCombos(themeKeys, culture)
  // 보여줄 조합수: 단일 문화권이 작을 수 있으니 세 문화권 합도 함께 안내 → 충분히 큰 수 노출
  const totalAcross = (['kr', 'west', 'fantasy'] as Culture[]).reduce(
    (s, c) => s + estimateCombos(themeKeys, c), 0,
  )

  // ── 피드백 헬퍼(언마운트 안전) ──
  const flashCopied = (id: string) => {
    setCopiedId(id)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => alive.current && setCopiedId(''), 1400)
  }
  const flashLinked = (id: string) => {
    setLinkedId(id)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => alive.current && setLinkedId(''), 1400)
  }
  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!navigator.clipboard) { flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => { if (alive.current) flashCopied(id) }).catch(() => {
      if (alive.current) flashToast('복사에 실패했습니다.')
    })
  }

  // ── 즐겨찾기 ──
  const saveCand = (c: Candidate) => {
    setSaved((prev) => {
      if (prev.some((s) => s.name === c.name && s.gloss === c.gloss)) return prev
      return [{ id: rid(), name: c.name, gloss: c.gloss, themeLabel: c.themeLabel, culture: c.culture }, ...prev]
    })
  }
  const isSaved = (c: Candidate) => saved.some((s) => s.name === c.name && s.gloss === c.gloss)
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  // ── 연계: 인물 시트로(이름 + 메모에 뜻) ──
  const toCharacterSheet = (name: string, gloss: string) => {
    openToolLinked('character-sheet', { character: { name, notes: gloss, fields: { name, notes: gloss } } })
  }
  // ── 연계: 공유 인물 라이브러리(characters)에 추가 ──
  const toLibrary = (id: string, name: string, gloss: string) => {
    const notes = `이름 뜻: ${gloss}`
    addToLibrary('characters', { name, notes, fields: { name, notes }, source: '뜻으로 이름 짓기' })
    flashLinked(id)
  }

  const linked = hasProjectBridge()

  // ── 프로젝트: 이름 후보들을 folder:'작명' 자료로 추가 ──
  const addToProjectDoc = (items: { name: string; gloss: string; themeLabel: string; culture: Culture }[], label?: string) => {
    if (!linked || !items.length) return
    const title = items.length === 1 ? `이름: ${items[0].name} — ${items[0].themeLabel}` : `이름 후보 ${items.length}건(뜻으로 짓기)`
    const rows = items
      .map((it) => `<li><b>${esc(it.name)}</b> <span style="opacity:.7">(${esc(cultureBlurb(it.culture))}·${esc(it.themeLabel)})</span> — ${esc(it.gloss)}</li>`)
      .join('\n')
    const bodyHtml = `<p>‘뜻으로 이름 짓기’로 만든 의미 기반 이름 후보입니다.</p>\n<ul>\n${rows}\n</ul>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '작명',
      title,
      bodyHtml,
      meta: { 출처: '뜻으로 이름 짓기', 후보수: String(items.length) },
    })
    if (id) flashToast(label || (items.length === 1 ? `“${items[0].name}” 저장됨` : `이름 후보 ${items.length}건 저장됨`))
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const intro: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }
  const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '24px 8px', fontSize: 13, lineHeight: 1.6 }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const savedRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }
  const linkRow: React.CSSProperties = { display: 'flex', gap: 6 }

  return (
    <div style={wrap}>
      <div style={intro}>
        담고 싶은 <b>의미·이미지</b>(빛·그림자·바다·용맹·지혜…)와 <b>문화권</b>을 고른 뒤 생성하면, 그 뜻을 품은 인물 이름 후보와 풀이를 만들어 줍니다. 마음에 드는 후보는 <Emoji e="🔒"/>로 고정해 나머지만 다시 뽑으세요.
      </div>

      {/* 문화권 선택 */}
      <div style={chipRow}>
        {CULTURES.map((c) => {
          const on = culture === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCulture(c.key)}
              aria-pressed={on}
              title={c.desc}
              style={{
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
                fontWeight: on ? 700 : 400,
              }}
            >
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 의미(테마) 선택 */}
      <div style={chipRow}>
        {THEMES.map((t) => {
          const on = themeKeys.includes(t.key)
          return (
            <button
              key={t.key}
              className="minibtn"
              onClick={() => toggleTheme(t.key)}
              aria-pressed={on}
              title={t.blurb}
              style={{
                opacity: on ? 1 : 0.5,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
              }}
            >
              <Emoji e={t.icon}/> {t.label}{on ? '' : ' +'}
            </button>
          )
        })}
      </div>

      {/* 생성 버튼 + 조합 수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="✨"/> 이름 생성</button>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          선택 의미 {themeKeys.length}개 · {cultureBlurb(culture)} 이름×칭호 조합 약 {combos.toLocaleString()}가지
          {totalAcross > combos && <> · 전 문화권 합 {totalAcross.toLocaleString()}가지</>}
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
          {toast}
        </div>
      )}

      <div style={body}>
        {/* 후보 영역 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span>이름 후보</span>
            {!!cands.length && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{cands.length}개</span>}
          </div>

          {!generated && !cands.length && (
            <div style={msg}>
              담고 싶은 의미를 고르고 <b><Emoji e="✨"/> 이름 생성</b>을 눌러 보세요.<br />
              예: ‘바다’ + 서양 → Marina(바다의), Dylan(큰 물결)…
            </div>
          )}
          {generated && !cands.length && (
            <div style={msg}>표시할 후보가 없습니다. 의미를 하나 이상 선택한 뒤 다시 생성해 보세요.</div>
          )}

          {!!cands.length && (
            <div style={grid}>
              {cands.map((c) => {
                const isLocked = !!locked[c.id]
                const savedAlready = isSaved(c)
                return (
                  <div key={c.id} style={{ ...card, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{c.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        <Emoji e={c.themeIcon}/> {c.themeLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, minHeight: 32 }}>{c.gloss}</div>

                    <div style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5, opacity: 0.92 }}>
                      <Emoji e="🏷️"/> {c.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      “{c.tagline}”
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button
                        className="minibtn"
                        onClick={() => toggleLock(c.id)}
                        title={isLocked ? '고정 해제(다음 생성 시 새로 뽑힘)' : '이 후보 고정(다음 생성 시 유지)'}
                        style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                      >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
                      <button className="minibtn" onClick={() => regenOne(c.id)} title="이 슬롯만 다시 뽑기"><Emoji e="🔁"/></button>
                      <button
                        className="minibtn"
                        style={{ flex: 1, color: savedAlready ? 'var(--ok)' : undefined }}
                        onClick={() => saveCand(c)}
                        disabled={savedAlready}
                        title={savedAlready ? '이미 저장됨' : '즐겨찾기에 저장'}
                      >{savedAlready ? '★ 저장됨' : '☆ 저장'}</button>
                      <button className="minibtn" onClick={() => copy(`${c.name} — ${c.gloss}\n${c.title}\n“${c.tagline}”`, c.id)} title="이름·뜻·칭호 복사">
                        {copiedId === c.id ? '✓' : <Emoji e="📋"/>}
                      </button>
                    </div>

                    {/* 연계: 인물 시트 / 라이브러리 */}
                    <div className="linkbar" style={linkRow}>
                      <button className="linkbtn" style={{ flex: 1 }} onClick={() => toCharacterSheet(c.name, `${c.gloss}\n${c.title}\n“${c.tagline}”`)} title="이 이름으로 인물 시트 열기"><Emoji e="🪪"/> 인물 시트</button>
                      <button className="linkbtn" style={{ flex: 1 }} onClick={() => toLibrary(c.id, c.name, `${c.gloss}\n${c.title}\n“${c.tagline}”`)} title="공유 인물 라이브러리에 추가">
                        {linkedId === c.id ? <>✓ 추가됨</> : <><Emoji e="📥"/> 라이브러리</>}
                      </button>
                    </div>
                    {/* 프로젝트 */}
                    <div className="linkbar" style={linkRow}>
                      <button
                        className="linkbtn"
                        style={{ flex: 1 }}
                        onClick={() => addToProjectDoc([{ name: c.name, gloss: c.gloss, themeLabel: c.themeLabel, culture: c.culture }])}
                        disabled={!linked}
                        title={linked ? '이 이름을 프로젝트(작명 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}
                      ><Emoji e="📄"/> 프로젝트에 추가</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 즐겨찾기 영역 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 즐겨찾기 {saved.length ? `(${saved.length})` : ''}</span>
            {!!saved.length && (
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  className="linkbtn"
                  onClick={() => addToProjectDoc(saved.map((s) => ({ name: s.name, gloss: s.gloss, themeLabel: s.themeLabel, culture: s.culture })), `즐겨찾기 ${saved.length}건 저장됨`)}
                  disabled={!linked || !saved.length}
                  title={linked ? '즐겨찾기 전체를 프로젝트(작명 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}
                ><Emoji e="📄"/> 프로젝트에 추가</button>
                <button
                  className="minibtn"
                  onClick={() => copy(saved.map((s) => `${s.name} — ${s.gloss}`).join('\n'), '__all__')}
                >{copiedId === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}</button>
              </span>
            )}
          </div>

          {!saved.length ? (
            <div style={{ ...msg, padding: '14px 8px' }}>아직 저장한 이름이 없습니다. 후보에서 ☆를 눌러 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}><Emoji e={cultureIcon(s.culture)}/> {s.themeLabel}</span>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{s.gloss}</div>
                  </div>
                  <button className="linkbtn" onClick={() => toCharacterSheet(s.name, s.gloss)} title="이 이름으로 인물 시트 열기"><Emoji e="🪪"/></button>
                  <button className="linkbtn" onClick={() => toLibrary(s.id, s.name, s.gloss)} title="공유 인물 라이브러리에 추가">
                    {linkedId === s.id ? '✓' : <Emoji e="📥"/>}
                  </button>
                  <button
                    className="linkbtn"
                    onClick={() => addToProjectDoc([{ name: s.name, gloss: s.gloss, themeLabel: s.themeLabel, culture: s.culture }])}
                    disabled={!linked}
                    title={linked ? '이 이름을 프로젝트(작명 자료)에 추가' : '프로젝트가 연결되어 있지 않습니다'}
                  ><Emoji e="📄"/></button>
                  <button className="minibtn" onClick={() => copy(`${s.name} — ${s.gloss}`, s.id)} title="복사">
                    {copiedId === s.id ? '✓' : <Emoji e="📋"/>}
                  </button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        전부 로컬 생성 · 외부 API 미사용 · 뜻풀이는 작명 참고용입니다
      </div>
    </div>
  )
}
