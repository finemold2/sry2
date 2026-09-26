// 한국어 호칭·친족 명칭 사전 — 인물 대사·서술의 부름말을 골라 쓰는 로컬 자료집.
//  자급식: react 와 './linkbus' 외 import 없음. 외부 API 없음(전부 로컬 자작 데이터).
//  관계(부계/모계/처가/시가/직장/사회)별 호칭·지칭, 존비어·격식 단계, 시대(현대/사극)별 차이,
//  상황별 부름말을 풍부하게. 카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 수집함/스니펫/프로젝트 연계.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, addToStash, hasStash, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'kinship-terms-ref',
  name: '호칭·친족 명칭 사전',
  icon: '👪',
  group: '언어·어휘',
  intro: '부계·모계·처가·시가·직장·사회별 호칭과 지칭, 존비어 단계, 현대/사극 차이, 상황별 부름말을 정리한 창작 참고 자료',
  w: 660,
  h: 680,
}

// ---------- 항목 형(型) ----------
//  call    = 부름말(2인칭, 면전에서 부를 때): "아버님", "여보", "형님"
//  refer   = 지칭(제3자에게 가리킬 때): "시아버지", "친정아버지", "바깥양반"
//  who     = 누가 누구를(화자→대상) 관계 설명
//  level   = 격식/존비 단계 표시
//  modern  = 현대 일상에서의 쓰임·주의
//  histor  = 사극/시대물에서의 표현(현대와 다른 점)
//  region  = 지역/세대 변이(있을 때만)
//  caution = 작가 유의(혼동·클리셰·오류 주의)
interface Term {
  call: string           // 부름말(면전 호칭)
  refer?: string         // 지칭(제3자에게)
  who: string            // 화자 → 대상 관계
  level?: string         // 격식·존비 단계
  modern?: string        // 현대 쓰임
  histor?: string        // 사극/시대물 표현
  region?: string        // 지역·세대 변이
  caution?: string       // 작가 유의
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Term[] }

// ---------- 로컬 대량 자료집 (전부 자작 정리 텍스트) ----------
const CATS: CatDef[] = [
  {
    key: 'paternal', label: '부계(친가) 친족', icon: '👨‍👦',
    note: '아버지 쪽 혈족. 한국 친족 호칭의 기준선이 되는 계열로, 항렬과 손위·손아래에 따라 갈래가 촘촘하다.',
    items: [
      { call: '아버지 / 아빠', refer: '부친(父親)·가친(家親)', who: '자녀 → 아버지', level: '아버지=일반·격식, 아빠=친근·구어', modern: '성인이 되어도 ‘아빠’를 쓰는 경우가 흔해졌다. 격식 자리에선 ‘아버지’가 안전하다.', histor: '사극에선 ‘아버님’, 왕가에선 ‘아바마마’, 사대부가에선 자기 아버지를 남에게 ‘가친(家親)’, 남의 아버지를 ‘춘부장(椿府丈)’이라 했다.', caution: '남에게 자기 아버지를 높여 ‘저희 아버님’이라 과하게 쓰면 어색하다. 면전 호칭과 지칭을 섞지 말 것.' },
      { call: '어머니 / 엄마', refer: '모친(母親)·자친(慈親)', who: '자녀 → 어머니', level: '어머니=일반·격식, 엄마=친근·구어', modern: '‘엄마’의 사용 연령대가 넓다. 공적 발언에선 ‘어머니’.', histor: '왕가에선 ‘어마마마’, 사대부가에선 남의 어머니를 ‘자당(慈堂)’·‘대부인(大夫人)’이라 높였다.', caution: '자기 어머니를 남에게 가리킬 때 ‘저희 어머니’가 자연스럽다. 사극 대사에 ‘엄마’를 쓰면 시대 어긋남.' },
      { call: '할아버지 / 하라버지', refer: '조부(祖父)·왕부(王父)', who: '손주 → 아버지의 아버지', level: '존칭 기본', modern: '구어로 ‘할부지’도. 친할/외할 구분 없이 면전에선 그냥 ‘할아버지’.', histor: '사극에선 ‘조부님’, 왕가 세손이 부르면 ‘할바마마’. 남의 조부는 ‘왕대인(王大人)’.', caution: '친가 조부를 지칭할 땐 ‘친할아버지’, 외가는 ‘외할아버지’로 구분(면전 호칭은 동일).' },
      { call: '할머니', refer: '조모(祖母)', who: '손주 → 아버지의 어머니', level: '존칭 기본', modern: '‘할매’는 방언·친근.', histor: '사극 ‘조모님’, 왕가 ‘할마마마’. 남의 조모는 ‘왕대부인’.', region: '경상 ‘할매’, 전라 ‘할무니’ 등 방언 변이가 크다.' },
      { call: '큰아버지 / 백부(伯父)', refer: '백부·중백부', who: '조카 → 아버지의 형', level: '존칭', modern: '아버지의 맏형이 ‘큰아버지(백부)’, 그 아내가 ‘큰어머니(백모)’.', caution: '아버지 형제가 여럿이면 첫째=큰아버지, 그 아래는 ‘둘째 큰아버지’ 식으로. 무조건 ‘큰아버지’ 하나만 있는 게 아니다.' },
      { call: '작은아버지 / 삼촌 / 숙부(叔父)', refer: '숙부·계부(季父)', who: '조카 → 아버지의 남동생', level: '존칭', modern: '미혼이면 ‘삼촌’, 결혼하면 ‘작은아버지’로 옮겨 부르는 관습이 있다(가풍 차이).', caution: '‘삼촌’은 본래 촌수(三寸)를 가리키는 말이 호칭으로 굳은 것. 결혼 후에도 ‘삼촌’이라 부르는 집도 많다 — 가풍으로 설정하라.' },
      { call: '큰어머니 / 작은어머니 / 숙모(叔母)', refer: '백모(伯母)·숙모(叔母)', who: '조카 → 큰·작은아버지의 아내', level: '존칭', modern: '남편 항렬을 따라 ‘큰어머니/작은어머니’.', caution: '‘숙모’는 작은아버지의 아내. 큰아버지 아내를 ‘숙모’라 하면 오류 — ‘백모’다.' },
      { call: '고모(姑母)', refer: '고모', who: '조카 → 아버지의 누이', level: '친근·존칭 혼용', modern: '아버지의 자매. 그 남편은 ‘고모부’.', histor: '사극에선 ‘고모님’. 왕가의 고모(왕의 누이)는 ‘공주/대장공주’로 신분 호칭이 우선.', caution: '고모/이모를 헷갈리지 말 것 — 고모=아버지 자매, 이모=어머니 자매.' },
      { call: '고모부(姑母夫)', refer: '고숙(姑叔)', who: '조카 → 고모의 남편', level: '존칭', modern: '고모의 남편. 면전에선 ‘고모부’.', caution: '지방·세대에 따라 ‘새아저씨’로 부르기도.' },
      { call: '형 / 형님', refer: '형(兄)·가형(家兄)', who: '남동생 → 손위 남자형제', level: '형=일상, 형님=더 높임', modern: '남자가 손위 남자형제를 ‘형’. 매우 공손히는 ‘형님’.', histor: '사극·반가에선 ‘형님’이 기본. 남에게 자기 형을 ‘가형(家兄)’, 남의 형을 ‘영형(令兄)’.', caution: '여자가 손위 남자형제를 부를 땐 ‘오빠’ — ‘형’이 아니다.' },
      { call: '오빠', refer: '오라버니', who: '여동생 → 손위 남자형제', level: '오빠=일상, 오라버니=격식·옛말', modern: '여자가 손위 남자형제를 ‘오빠’.', histor: '사극에선 ‘오라버니’·‘오라버님’. 반가의 누이가 정중히.', caution: '연인·또래 남성을 ‘오빠’라 부르는 현대 용법과, 친족 호칭 ‘오빠’를 작중에서 혼동 없이 쓸 것.' },
      { call: '누나 / 누님', refer: '누이·자씨(姉氏)', who: '남동생 → 손위 여자형제', level: '누나=일상, 누님=높임', modern: '남자가 손위 여자형제를 ‘누나’.', histor: '사극에선 ‘누님’·‘누이’. 남의 누이는 ‘영자(令姉)’.', caution: '여자가 손위 여자형제를 부를 땐 ‘언니’ — ‘누나’가 아니다.' },
      { call: '언니', refer: '언니', who: '여동생 → 손위 여자형제', level: '친근', modern: '여자가 손위 여자형제를 ‘언니’. 현대엔 점원·또래 여성에게도 확장.', histor: '옛말로는 손위 동성 형제를 두루 ‘언니’라 한 용례도 있으나, 사극 대사는 ‘형님(여자끼리도)’이 무난.', caution: '시가 손위 동서를 ‘형님’이라 부르는 관습과 헷갈리지 말 것(시가 항목 참조).' },
      { call: '동생 / 아우', refer: '아우·사제(舍弟)·사매(舍妹)', who: '손위 → 손아래 형제', level: '하대 아님(평칭)', modern: '이름으로 부르는 게 보통. ‘동생아’는 어색.', histor: '남에게 자기 아우를 ‘사제(舍弟)’, 누이동생을 ‘사매(舍妹)’.', caution: '손아래는 보통 이름으로 부르지 별도 부름말이 약하다 — 대사 자연스럽게.' },
      { call: '조카 / 조카님', refer: '질(姪)·생질(甥姪)', who: '삼촌·고모 → 형제자매의 자녀', level: '평칭', modern: '형제의 자녀=조카, 자매의 자녀도 조카(생질로 구분 가능).', caution: '남자조카=조카, 여자조카=조카딸/질녀. 누이의 자식은 ‘생질’로 한정해 가리킬 수 있다.' },
    ],
  },
  {
    key: 'maternal', label: '모계(외가) 친족', icon: '👵',
    note: '어머니 쪽 혈족. 부계와 짝을 이루되 ‘외(外)’ 자가 붙어 갈래가 갈린다. 정서적으로 더 친근하게 그려지는 경우가 많다.',
    items: [
      { call: '외할아버지', refer: '외조부(外祖父)', who: '손주 → 어머니의 아버지', level: '존칭', modern: '면전 호칭은 ‘할아버지’와 같고, 가릴 때 ‘외할아버지’.', histor: '사극에선 ‘외조부님’. 왕의 외조부는 ‘부원군(府院君)’ 등 봉작으로 불리기도.', caution: '외가·친가 조부가 한자리에 있으면 ‘큰댁 할아버지/외가 할아버지’로 구분하는 대사가 자연스럽다.' },
      { call: '외할머니', refer: '외조모(外祖母)', who: '손주 → 어머니의 어머니', level: '존칭', modern: '‘외할매’는 방언·친근.', region: '제주 ‘웨할망’ 등 방언 변이.' },
      { call: '외삼촌 / 외숙(外叔)', refer: '외숙·구씨(舅氏)', who: '조카 → 어머니의 남자형제', level: '존칭', modern: '어머니의 오빠·남동생을 통틀어 ‘외삼촌’. 그 아내는 ‘외숙모’.', histor: '사극에선 ‘외숙(外叔)’. 남의 외숙은 ‘외구(外舅)’ 표현도.', caution: '어머니 형제의 손위/손아래를 굳이 가를 땐 ‘큰외삼촌/작은외삼촌’.' },
      { call: '외숙모(外叔母)', refer: '외숙모', who: '조카 → 외삼촌의 아내', level: '존칭', modern: '외삼촌의 아내. 면전 ‘외숙모’.', caution: '‘외숙모’와 ‘이모’를 헷갈리지 말 것 — 외숙모는 외삼촌의 ‘아내’(혈족 아님), 이모는 어머니의 ‘자매’(혈족).' },
      { call: '이모(姨母)', refer: '이모', who: '조카 → 어머니의 여자형제', level: '친근', modern: '어머니의 자매. 정서적으로 가장 친근한 친척으로 자주 그려진다. 현대엔 친한 여성에게도 확장(식당 이모).', histor: '사극에선 ‘이모님’.', caution: '고모(아버지 자매)와 혼동 금지. 식당 ‘이모’ 같은 사회적 확장 용법과 친족 ‘이모’를 작중 맥락으로 구분.' },
      { call: '이모부(姨母夫)', refer: '이숙(姨叔)', who: '조카 → 이모의 남편', level: '존칭', modern: '이모의 남편. 면전 ‘이모부’.', caution: '지역·세대에 따라 ‘이모부’ 대신 ‘새아저씨’로도.' },
      { call: '외사촌 / 이종사촌', refer: '외종(外從)·이종(姨從)', who: '나 → 외삼촌·이모의 자녀', level: '평칭', modern: '외삼촌의 자녀=외사촌, 이모의 자녀=이종사촌. 손위면 형/누나/오빠/언니로 부른다.', caution: '‘고종사촌’은 고모의 자녀 — 외/이/고 계열을 정확히 가를 것.' },
    ],
  },
  {
    key: 'inlaw_wife', label: '처가(아내 쪽) 친족', icon: '🤵',
    note: '남편이 아내의 친정 식구를 부르는 호칭. ‘장인·장모’가 대표격이며, 사위로서의 격식이 묻어난다.',
    items: [
      { call: '장인어른 / 아버님', refer: '장인(丈人)·빙장(聘丈)', who: '사위 → 아내의 아버지', level: '높임', modern: '‘장인어른’ 또는 친근히 ‘아버님’. 남에게 가릴 땐 ‘장인’.', histor: '사극·반가에선 ‘빙장(聘丈)’·‘악장(岳丈)’. 남의 장인은 ‘악장’.', caution: '‘아버님’이라 부르면 친밀하지만, 공식 문서·소개엔 ‘장인’이 명확하다. ‘장인어른’이 가장 무난.' },
      { call: '장모님 / 어머님', refer: '장모(丈母)·빙모(聘母)', who: '사위 → 아내의 어머니', level: '높임', modern: '‘장모님’ 또는 ‘어머님’.', histor: '사극에선 ‘빙모(聘母)’·‘악모(岳母)’.', caution: '‘장모님’이 표준. ‘어머님’은 친밀 표현으로 가풍에 따라.' },
      { call: '형님 / 처남(妻男)', refer: '처남', who: '남편 → 아내의 남자형제', level: '손위=형님, 손아래=처남', modern: '아내의 오빠가 손위면 ‘형님’, 남동생이면 ‘처남’. 손아래도 결혼해 아이 있으면 ‘처남’으로 정중히.', caution: '아내의 오빠를 ‘처남’이라 부르면 손위에게 결례가 될 수 있다 — 손위는 ‘형님’이 예의. 나이·서열로 갈린다.' },
      { call: '처형(妻兄) / 처제(妻弟)', refer: '처형·처제', who: '남편 → 아내의 여자형제', level: '처형=손위, 처제=손아래', modern: '아내의 언니=처형, 여동생=처제. 면전에선 ‘처형/처제’ 또는 ‘형님(손위)’.', caution: '처형/처제는 아내의 ‘자매’. 아내 형제의 ‘배우자’와 혼동 말 것(아래 동서 참조).' },
      { call: '동서(同壻) — 처가', refer: '동서', who: '남편 → 아내 자매의 남편', level: '나이 서열로', modern: '아내의 언니/여동생의 남편이 서로 ‘동서’. 나이 많은 쪽이 ‘형님’, 아래가 ‘동서’ 또는 이름.', caution: '같은 ‘동서’라도 처가 쪽(자매의 남편끼리)과 시가 쪽(형제의 아내끼리)이 다르다. 성별과 계열을 분명히.' },
      { call: '처조카', refer: '처질(妻姪)', who: '남편 → 아내 형제자매의 자녀', level: '평칭', modern: '아내 쪽 조카. 보통 이름으로 부른다.' },
    ],
  },
  {
    key: 'inlaw_husband', label: '시가(남편 쪽) 친족', icon: '👰',
    note: '아내가 남편의 본가 식구를 부르는 호칭. 전통적으로 가장 격식이 까다로운 계열로, 며느리로서의 예가 짙게 밴다.',
    items: [
      { call: '아버님', refer: '시아버지(媤父)·시부(媤父)', who: '며느리 → 남편의 아버지', level: '높임', modern: '면전에선 ‘아버님’. 가릴 땐 ‘시아버지’.', histor: '사극·반가에선 ‘시아버님’, 종가에선 ‘아버님’ 외에 가문 호칭이 따로.', caution: '‘시아버지’는 지칭어 — 면전에서 “시아버지”라 부르지 않는다. 면전은 반드시 ‘아버님’.' },
      { call: '어머님', refer: '시어머니(媤母)·시모(媤母)', who: '며느리 → 남편의 어머니', level: '높임', modern: '면전 ‘어머님’, 가릴 땐 ‘시어머니’.', caution: '드라마에서 갈등 장치로 ‘시어머니’를 면전 호칭처럼 쓰면 오류 — 면전은 ‘어머님’.' },
      { call: '아주버님', refer: '시숙(媤叔)·시아주버니', who: '며느리 → 남편의 형', level: '높임', modern: '남편의 형(손위 시숙)을 ‘아주버님’이라 부른다.', caution: '‘아주버님’(남편의 형)과 ‘도련님’(남편의 미혼 동생)을 혼동 말 것. 손위/손아래로 갈린다.' },
      { call: '도련님 / 서방님', refer: '시동생(媤同生)', who: '며느리 → 남편의 남동생', level: '미혼=도련님, 기혼=서방님', modern: '남편의 남동생이 미혼이면 ‘도련님’, 결혼하면 ‘서방님’으로 옮겨 부른다.', caution: '‘도련님’은 미혼 시동생 한정. 결혼했는데도 ‘도련님’이라 하면 결례 — ‘서방님’이 맞다(가풍 차이는 있음).' },
      { call: '형님 — 시가', refer: '큰동서·맏동서', who: '며느리 → 손위 동서(남편 형의 아내)', level: '높임', modern: '남편 형의 아내(손위 동서)를 ‘형님’이라 부른다. 여자끼리도 ‘형님’.', caution: '여자가 동서를 ‘형님’이라 부르는 이 관습이 외부엔 낯설다 — 작중에 자연스럽게 깔아두면 사실감.' },
      { call: '동서 — 시가', refer: '작은동서', who: '며느리 → 손아래 동서(남편 동생의 아내)', level: '평칭', modern: '남편 동생의 아내(손아래 동서)를 ‘동서’ 또는 이름으로.', caution: '시가 동서는 ‘형제의 아내끼리’. 처가 동서(자매의 남편끼리)와 계열·성별이 다르다.' },
      { call: '아가씨 / 작은아씨', refer: '시누이(媤同生 — 여)', who: '올케 → 남편의 누이(여동생)', level: '높임', modern: '남편의 여동생을 ‘아가씨’라 부른다. 손위 시누이는 ‘형님’.', caution: '‘시누이’는 지칭어. 면전에선 손아래=‘아가씨’, 손위=‘형님’. 면전에서 “시누이”라 부르지 않는다.' },
      { call: '서방님 / 아주버님 (손위 시누이 남편)', refer: '시매부·시매형', who: '올케·동서 → 시누이의 남편', level: '높임', modern: '남편 누이의 남편. 면전엔 ‘서방님’ 또는 손위면 ‘아주버님’.', caution: '계열이 복잡하니 누구의 배우자인지 분명히 설정할 것.' },
      { call: '올케', refer: '올케', who: '시누이(여자) → 오빠/남동생의 아내', level: '평칭·친근', modern: '여자가 자기 오빠·남동생의 아내를 ‘올케’라 부른다(또는 ‘새언니’).', caution: '‘올케’는 시누이가 며느리(형제의 아내)를 부르는 말 — 방향이 반대인 ‘아가씨’와 짝을 이룬다.' },
      { call: '새언니 / 새아주머니', refer: '형수(兄嫂)·제수(弟嫂)', who: '시동생 → 형/동생의 아내', level: '형의 아내=형수님, 동생의 아내=제수씨', modern: '남자가 형의 아내를 ‘형수님’, 남동생의 아내를 ‘제수씨’라 부른다.', histor: '사극에선 ‘형수님’이 기본.', caution: '형수(형의 아내)와 제수(동생의 아내)를 항렬로 정확히 가를 것.' },
    ],
  },
  {
    key: 'couple', label: '부부·연인 사이', icon: '💑',
    note: '부부와 연인이 서로를 부르는 말. 시대와 세대에 따라 가장 빠르게 변해 온 계열이라, 작중 시대 설정의 가늠자가 된다.',
    items: [
      { call: '여보 / 당신', refer: '남편·아내·바깥양반·집사람', who: '부부 → 배우자', level: '여보=부름말, 당신=2인칭(때로 다툼 어조)', modern: '결혼 후 무난한 호칭. 젊은 부부는 연애 시절 호칭(이름·애칭)을 그대로 쓰기도.', histor: '사극·옛 부부는 ‘영감’(아내→남편, 벼슬 없이도 노년에), ‘마누라’(본래 높임말이었음), ‘부인’ 등.', caution: '‘당신’은 부부 사이엔 다정하지만, 모르는 사람에게 쓰면 시비조가 된다 — 상황으로 어조가 갈린다.' },
      { call: '○○ 씨 / 이름 / 자기', refer: '남자친구·여자친구·애인', who: '연인 → 연인', level: '친근', modern: '연애 단계에선 이름·‘자기’·‘오빠/누나’ 등 다양. 세대·관계로 천차만별.', caution: '연인이 ‘오빠’라 부르는 현대 용법을, 친족 ‘오빠’와 작중에서 헷갈리지 않게 맥락을 줄 것.' },
      { call: '아빠 / 엄마 (자녀 매개)', refer: '애 아빠·애 엄마·아이 아버지', who: '부부 → 배우자(자녀를 통해)', level: '구어·친근', modern: '아이가 생긴 뒤 서로를 ‘○○ 아빠/엄마’로 부르는 관습. “애 아빠한테 물어봐” 같은 지칭.', caution: '이 호칭이 나오면 ‘자녀가 있다’는 정보를 독자에게 자연히 전달한다 — 서사 장치로 활용.' },
      { call: '서방님 / 낭군 / 서방', refer: '남편', who: '아내 → 남편(옛/사극)', level: '높임·옛말', modern: '현대 일상에선 거의 안 씀(농·애칭 제외).', histor: '사극에선 ‘서방님’·‘낭군(郎君)’. 반가의 아내가 남편을.', caution: '사극 대사의 핵심 부름말. 현대물에 그대로 쓰면 시대 어긋남(혹은 의도적 고풍).' },
      { call: '부인 / 마님 / 아씨', refer: '아내·안사람·실인(室人)', who: '남편 → 아내(옛/사극)', level: '신분·격식', modern: '현대엔 ‘부인’이 다소 격식.', histor: '사극에선 신분에 따라 ‘부인’·‘마님’·‘아씨’(미혼 또는 젊은 안주인). 종에게는 다르게 불린다.', caution: '신분 호칭이라 작중 계급 설정과 어긋나면 안 된다 — ‘마님’은 종이 부르는 말이기도.' },
    ],
  },
  {
    key: 'work', label: '직장·조직 호칭', icon: '🏢',
    note: '회사·관청·군대 등 조직 안에서의 부름말. 직급+님이 기본이며, 현대 한국 직장 문화의 위계가 그대로 드러난다.',
    items: [
      { call: '○○님 / 직급+님', refer: '동료·상사', who: '직원 → 직원', level: '존중·수평화', modern: '근래엔 직급 대신 ‘○○님’(이름+님)으로 수평하게 부르는 회사가 늘었다.', caution: '수평 호칭 도입 여부는 회사 문화 설정 — 보수적 조직엔 어색하게 들린다.' },
      { call: '부장님 / 과장님 / 대리님', refer: '상사(직급)', who: '직원 → 상급자', level: '격식·존칭', modern: '직급+님이 전통적 표준. 호칭만으로 위계가 드러난다.', caution: '직급 체계(사원-주임-대리-과장-차장-부장-이사…)를 작중 일관되게. 회사마다 다르다.' },
      { call: '사장님 / 대표님 / 회장님', refer: '경영진', who: '직원 → 최고위', level: '최상 존칭', modern: '오너·대표를 부르는 말. ‘대표님’은 스타트업에서 흔하다.', caution: '‘사장님’은 식당·가게 주인에게도 두루 쓰여(사회 호칭) 직장 내 직급과 결이 다를 수 있다.' },
      { call: '선배님 / 선배 / 후배', refer: '선후배', who: '직원·학생 → 입사·입학 선후', level: '선배=높임, 후배=평칭', modern: '입사·입학 순서로 갈리는 위계. 군대·학교·언론·예술계에서 특히 강하다.', caution: '나이와 선후배가 어긋날 때(나이는 많은데 후배) 호칭 갈등이 드라마의 소재가 된다.' },
      { call: '팀장님 / 실장님 / 본부장님', refer: '보직 책임자', who: '직원 → 조직장', level: '존칭', modern: '직급과 별개로 ‘보직(팀장 등)’에 ‘님’을 붙인다.', caution: '직급(과장)과 보직(팀장)이 다를 수 있다 — 같은 사람을 둘 다로 부를 수 있어 혼동 주의.' },
      { call: '기사님 / 선생님 / 사부님', refer: '기능·전문 호칭', who: '의뢰인·제자 → 기술자·스승', level: '존중', modern: '운전기사=기사님, 가르치는 이=선생님, 무술·기예의 스승=사부님(다소 옛/무협).', caution: '‘선생님’은 교사뿐 아니라 존경하는 어른·전문가에게 두루 쓰는 사회적 높임이다.' },
    ],
  },
  {
    key: 'court', label: '궁중·사극 신분 호칭', icon: '👑',
    note: '왕실과 신분제 사회의 부름말. 사극·시대물의 사실감을 좌우하는 계열로, 신분과 관계에 따라 호칭이 엄격히 정해진다.',
    items: [
      { call: '전하(殿下)', refer: '임금·상감(上監)·주상(主上)', who: '신하 → 왕', level: '최상 경칭', modern: '현대에 없음(사극 전용).', histor: '왕을 부르는 신하의 호칭. 가리킬 땐 ‘주상 전하’·‘상감마마’. 백성은 ‘상감님’.', caution: '황제국 격상 시기엔 ‘폐하(陛下)’ — 시대(대한제국 등)에 따라 갈린다. 함부로 섞지 말 것.' },
      { call: '중전마마 / 마마', refer: '왕비·중전(中殿)', who: '궁인·신하 → 왕비', level: '최상 경칭', histor: '왕비를 ‘중전마마’. 후궁은 ‘○빈마마’·‘마마님’으로 격이 다르다.', caution: '‘마마’는 왕족 여성 경칭 — 누구에게나 붙지 않는다. 후궁·공주·대비의 격 차이를 지킬 것.' },
      { call: '대비마마 / 대왕대비마마', refer: '선왕의 왕비·왕대비', who: '신하·왕 → 선왕의 비', level: '최상 경칭', histor: '선왕의 왕비=대비, 그 윗대=대왕대비. 수렴청정의 권위가 실린 호칭.', caution: '대비·대왕대비의 서열을 작중 권력 구도에 맞춰 정확히.' },
      { call: '세자저하(世子邸下) / 저하', refer: '왕세자·동궁(東宮)', who: '신하 → 왕위 계승자', level: '경칭(전하보다 한 단계)', histor: '세자는 ‘저하’. 세손은 ‘세손 저하’. 동궁(거처)이 곧 세자를 가리키기도.', caution: '‘전하’(왕)와 ‘저하’(세자)를 헷갈리면 치명적 고증 오류.' },
      { call: '대감(大監) / 영감(令監)', refer: '고관·재상', who: '아랫사람 → 고위 관리', level: '품계 경칭', histor: '정2품 이상=대감, 종2품~정3품 당상=영감. 품계로 갈린다.', caution: '‘영감’이 현대엔 노인·남편 뜻으로 변했다 — 사극에선 관직 경칭임을 분명히.' },
      { call: '나리 / 나으리', refer: '벼슬아치·양반', who: '평민·하인 → 양반·관원', level: '존칭(대감보다 아래)', histor: '하급 관원·양반을 평민이 ‘나리’라 불렀다.', caution: '신분 호칭이라 부르는 이의 계급이 드러난다 — 양반끼리는 ‘나리’라 안 한다.' },
      { call: '도련님 / 아씨 / 마님', refer: '양반가 자제·안주인', who: '하인 → 주인집 식구', level: '신분 존칭', histor: '주인집 미혼 아들=도련님, 미혼 딸·젊은 안주인=아씨, 안주인=마님, 바깥주인=영감/대감/나리.', caution: '같은 집 식구라도 부르는 사람(하인 vs 가족)에 따라 호칭이 갈린다.' },
      { call: '소인 / 소생 / 쇤네', refer: '자기 낮춤(겸칭)', who: '아랫사람 → 자기', level: '극존칭의 짝(자기 낮춤)', histor: '신하·평민·하인이 자기를 ‘소인’·‘쇤네’로, 선비가 ‘소생(小生)’으로 낮춰 말함.', caution: '상대 높임(전하·대감)과 자기 낮춤(소인·소생)이 짝을 이뤄야 사극 어법이 산다.' },
    ],
  },
  {
    key: 'social', label: '사회·낯선 사람', icon: '🧑‍🤝‍🧑',
    note: '혈연·조직 밖에서 모르는 사람을 부르는 말. 친족어가 사회로 번져 쓰이는 한국어의 특징이 잘 드러난다.',
    items: [
      { call: '선생님', refer: '낯선 어른(존중)', who: '나 → 존중할 어른·전문가', level: '두루 높임', modern: '교사뿐 아니라 처음 본 어른을 정중히 부를 때 두루 쓰는 만능 존칭.', caution: '가장 안전한 사회적 높임 — 직업을 모를 때 무난하다.' },
      { call: '사장님', refer: '가게 주인·낯선 남성', who: '손님 → 가게 주인 등', level: '높임(사회 확장)', modern: '식당·가게 주인은 물론, 중년 남성을 두루 ‘사장님’이라 부르는 사회 관습.', caution: '직장 직급 ‘사장’과 다른, 거리에서의 호칭임을 맥락으로 구분.' },
      { call: '이모 / 이모님', refer: '식당 종업원·중년 여성', who: '손님 → 식당 여성 등', level: '친근(친족어 확장)', modern: '식당에서 중년 여성 종업원을 ‘이모’라 부르는 친근 호칭. 친족 이모와 별개.', caution: '친족 ‘이모’와 사회적 ‘이모’를 작중에서 헷갈리지 않게.' },
      { call: '아주머니 / 아줌마 / 아주머님', refer: '중년 여성(낯선)', who: '나 → 모르는 중년 여성', level: '아주머니=무난, 아줌마=다소 낮춤/구어', modern: '‘아주머니’가 무난, ‘아줌마’는 친근하나 때로 무례하게 들린다.', caution: '‘아줌마’ 호칭에 발끈하는 정서가 있다 — 갈등 소재로 쓰임. ‘아주머님’이 가장 공손.' },
      { call: '아저씨', refer: '중년 남성(낯선)', who: '나 → 모르는 중년 남성', level: '무난~구어', modern: '모르는 중년 남성을 부르는 일반 호칭.', caution: '본래 친족(작은아버지뻘)을 가리키던 말이 사회로 번진 것.' },
      { call: '학생 / 총각 / 아가씨', refer: '젊은 사람(낯선)', who: '나 → 모르는 젊은이', level: '구어', modern: '젊은 남녀를 ‘학생’·‘총각’·‘아가씨’로 부르기도 하나, ‘아가씨’는 맥락에 따라 무례하게 들릴 수 있다.', caution: '‘아가씨’는 시가의 시누이 호칭이기도 해 중의적 — 사회 호칭으로 쓸 땐 주의.' },
      { call: '어르신 / 할아버님 / 할머님', refer: '낯선 노인(존중)', who: '나 → 모르는 노인', level: '높임', modern: '모르는 노인을 정중히 ‘어르신’. 친근히는 ‘할아버님/할머님’.', caution: '‘어르신’이 가장 존중하는 표현 — 노인 인물 대사에 품격을 더한다.' },
      { call: '손님 / 고객님', refer: '서비스 대상', who: '점원 → 손님', level: '존대(상업)', modern: '가게·서비스에서 손님을 ‘손님’·‘고객님’. 과한 ‘고객님’ 화법은 현대 풍자 소재.', caution: '“커피 나오셨습니다” 같은 과잉 존대는 의도적 코믹/풍자로만.' },
    ],
  },
  {
    key: 'self', label: '자기 지칭·낮춤·높임', icon: '🙋',
    note: '자기 자신을 가리키는 말과 상대에 따른 격의 조절. 누구 앞에서 자기를 어떻게 낮추거나 세우는가가 인물의 태도를 드러낸다.',
    items: [
      { call: '저 / 제가', refer: '자기 낮춤(겸양)', who: '나 → 윗사람·격식', level: '겸양', modern: '윗사람·공식 자리에선 ‘나’ 대신 ‘저’. ‘제가’로 동작 주체를 낮춘다.', caution: '윗사람에게 ‘내가’라고 하면 무례 — 격식에선 ‘제가’.' },
      { call: '나 / 내가', refer: '자기(평칭)', who: '나 → 또래·아랫사람', level: '평칭', modern: '또래·친밀·아랫사람 앞에선 ‘나’.', caution: '대화 상대에 따라 ‘나/저’를 자연스럽게 오가야 인물의 관계 감각이 산다.' },
      { call: '소인 / 소생 / 소녀', refer: '극존칭의 짝(옛 자기 낮춤)', who: '아랫사람 → 윗사람(옛/사극)', level: '극겸양', histor: '사극에서 자기를 ‘소인’(평민·하인), ‘소생’(선비), ‘소녀’(여인이 윗사람에게).', caution: '상대 경칭과 짝을 맞춰야 한다 — ‘전하’ 앞에선 ‘소인/소신’.' },
      { call: '신(臣) / 소신(小臣)', refer: '신하의 자기 지칭', who: '신하 → 임금', level: '극겸양(궁중)', histor: '임금 앞에서 신하는 자기를 ‘신’·‘소신’이라 한다.', caution: '왕 앞 대사의 핵심. ‘소신 아뢰옵니다’ 식 어투와 결합.' },
      { call: '본인 / 당사자', refer: '공식·법적 자기 지칭', who: '나 → 공식 문맥', level: '격식·중립', modern: '서류·공적 발언에서 ‘본인’. 다소 딱딱하다.', caution: '일상 대화에서 ‘본인’을 과하게 쓰면 권위적·딱딱하게 들린다.' },
      { call: '우리 / 저희', refer: '자기 편 낮춤·포함', who: '나 → 집단', level: '우리=평칭, 저희=낮춤', modern: '윗사람·외부엔 ‘저희’, 동등·내부엔 ‘우리’. ‘우리 회사/저희 회사’가 상대에 따라 갈린다.', caution: '듣는 이를 포함하면 ‘저희’가 어색할 수 있다(상대를 낮추는 꼴) — 미묘한 어법.' },
    ],
  },
  {
    key: 'children', label: '자녀·손주·후손 지칭', icon: '👶',
    note: '아랫세대를 가리키고 부르는 말. 손위가 손아래를 부르는 호칭은 대개 이름이지만, 지칭어는 항렬에 따라 촘촘하다.',
    items: [
      { call: '아들 / 딸', refer: '자(子)·여식(女息)·아들·딸', who: '부모 → 자녀', level: '평칭', modern: '면전에선 이름. 가릴 땐 ‘아들/딸’. 남에게 겸손히 ‘제 아들/딸’.', histor: '남에게 자기 아들을 ‘가아(家兒)’·‘돈아(豚兒)’(겸칭), 딸을 ‘여식(女息)’.', caution: '남 앞에서 자기 자식을 과하게 높이지 않는 겸양이 옛 어법.' },
      { call: '맏이 / 막내 / 둘째', refer: '출생 순서', who: '부모 → 자녀(순서)', level: '평칭', modern: '맏이(첫째)·둘째·막내(끝). ‘큰애·작은애’도 흔하다.', caution: '‘맏이’는 장남·장녀를 두루 가리킨다 — 성별 고정 아님.' },
      { call: '손주 / 손자 / 손녀', refer: '손(孫)·친손·외손', who: '조부모 → 자녀의 자녀', level: '평칭·친근', modern: '아들의 자녀=친손, 딸의 자녀=외손. 통틀어 ‘손주’.', caution: '친손/외손 구분이 옛 가문 서사에선 차별·갈등의 소재가 되기도.' },
      { call: '며느리 / 사위', refer: '자부(子婦)·서랑(壻郞)', who: '부모 → 자녀의 배우자', level: '존중·친근', modern: '아들의 아내=며느리, 딸의 남편=사위. 면전엔 ‘아가/얘야’ 또는 ‘○서방’.', histor: '사위를 ‘○서방’이라 부르는 관습(예: 김 서방).', caution: '며느리·사위는 ‘자녀의 배우자’ — 사돈(자녀 배우자의 부모)과 혼동 말 것.' },
      { call: '사돈 / 사부인 / 바깥사돈', refer: '사돈(査頓)', who: '부모 → 자녀 배우자의 부모', level: '존중(대등 예우)', modern: '자녀의 시부모·장인장모와 서로 ‘사돈’. 여성 사돈=사부인, 남성=바깥사돈.', caution: '사돈 사이는 가장 조심스러운 대등 관계 — “사돈 남 말 한다” 같은 미묘함이 서사에 녹는다.' },
      { call: '증손 / 고손', refer: '증손(曾孫)·현손(玄孫)', who: '조상 → 먼 후손', level: '평칭', modern: '손주의 자녀=증손, 그 아래=고손(현손). 대가족·연대기 서사에서.', caution: '항렬 명칭(증·고·현)을 정확히 — 세대 수를 헷갈리면 가계가 무너진다.' },
    ],
  },
]

const LS = 'sry:tool:kinship-terms-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 필드 라벨 묶음
const FIELDS: { k: keyof Term; label: string }[] = [
  { k: 'who', label: '관계' },
  { k: 'refer', label: '지칭(가리킬 때)' },
  { k: 'level', label: '격식·존비' },
  { k: 'modern', label: '현대 쓰임' },
  { k: 'histor', label: '사극·옛말' },
  { k: 'region', label: '지역·세대 변이' },
  { k: 'caution', label: '작가 유의' },
]

// 식별 키(부름말이 겹칠 수 있어 관계까지 합침)
const termKey = (catKey: string, item: Term) => `${catKey}::${item.call}::${item.who}`

function plainText(f: Flat): string {
  const lines = [`👪 ${f.item.call}  (${f.cat.label})`]
  for (const fd of FIELDS) {
    const v = f.item[fd.k]
    if (v) lines.push(`· ${fd.label}: ${v}`)
  }
  return lines.join('\n')
}

function bodyHtml(f: Flat): string {
  const rows = FIELDS
    .filter((fd) => f.item[fd.k])
    .map((fd) => `<p><b>${escapeHtml(fd.label)}</b>: ${escapeHtml(String(f.item[fd.k]))}</p>`)
    .join('')
  return [
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.call)}</b></p>`,
    rows,
    `<p><i>※ 한국어 호칭·친족 명칭 창작 참고 자료. 시대·지역·가풍에 맞춰 각색해 쓰세요.</i></p>`,
  ].join('')
}

export default function KinshipTermsRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.q 가 오면 검색 초기값으로 활용(연계로 열릴 때 맥락 전달)
  const initialQ = typeof payload?.q === 'string' ? (payload.q as string) : ''

  const [query, setQuery] = useState(initialQ)
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<Flat | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 언마운트 정리: 복사·토스트 타이머 취소
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[termKey(c.key, item)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.call.toLowerCase().includes(q)) return true
        return FIELDS.some((fd) => String(item[fd.k] || '').toLowerCase().includes(q))
      })
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && termKey(pick.cat.key, pick.item) === termKey(prev.cat.key, prev.item)) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (f: Flat) => {
    const k = termKey(f.cat.key, f.item)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }
  const toggleExpand = (k: string) => setExpanded((prev) => ({ ...prev, [k]: !prev[k] }))

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  // 수집함에 담기 — addToStash({kind:'note', ...})
  const toStash = (f: Flat) => {
    if (!hasStash()) { flash('수집함에 연결되어 있지 않습니다.'); return }
    addToStash({ kind: 'note', label: `호칭: ${f.item.call} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.call}’ 호칭 자료를 담았습니다.`)
  }

  // 스니펫 저장(글감) — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[호칭 자료] ${plainText(f)}`,
      source: '호칭·친족 명칭 사전',
      tags: ['호칭', '친족', f.cat.label, f.item.call],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.call}’ 자료를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '호칭·친족 자료',
      title: `${f.item.call} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 관계: f.item.who, 격식: f.item.level || '' },
    })
    if (id) flash(`프로젝트 자료 〈호칭·친족 자료〉에 ‘${f.item.call}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Term) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  const linkbar = (f: Flat, ctx: string) => (
    <div className="linkbar" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="linkbar-label" style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
      <button className="linkbtn" onClick={() => toStash(f)} disabled={!hasStash()}
        title={hasStash() ? '이 호칭 자료를 수집함에 담기' : '수집함에 연결되어 있지 않습니다'}>
        <Emoji e="📎"/> 수집함
      </button>
      <button className="linkbtn" onClick={() => toProject(f)} disabled={!hasProjectBridge()}
        title={hasProjectBridge() ? '프로젝트 자료 〈호칭·친족 자료〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
        <Emoji e="📄"/> 프로젝트에 추가
      </button>
      <button className="linkbtn" onClick={() => openToolLinked('character-sheet', { hint: f.item.call, from: 'kinship-terms-ref' })}
        title="인물 시트 열기 — 인물 관계·호칭 정리에 사용">
        <Emoji e="🧑"/> 인물 시트
      </button>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{ctx}</span>
    </div>
  )

  return (
    <div style={wrap}>
      {/* 안내 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="👪"/> <b style={{ color: 'var(--text)' }}>호칭·친족 명칭 사전</b>. 누가 누구를 <b>면전에서 부르는 말(부름말)</b>과
        <b> 제3자에게 가리키는 말(지칭)</b>을 구분해 정리했습니다. 시대·지역·가풍에 따라 다르니 ‘출발점’으로 쓰세요.
      </div>

      <div style={hint}>
        부계·모계·처가·시가·부부·직장·궁중·사회·자기지칭·자녀 등 <b>{total}개</b> 호칭을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="부름말·관계·설명으로 검색 (예: 도련님, 사위, 전하, 며느리, 사극)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗂️"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 호칭</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.call}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => copy(random.item.call, 'rnd-call')}>
              {copiedKey === 'rnd-call' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 부름말만</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random)}>
              {favs[termKey(random.cat.key, random.item)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          {linkbar(random, '인물의 입에 바로 올려 보세요')}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록(펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 호칭이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((f) => {
            const { cat: c, item } = f
            const fk = termKey(c.key, item)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.call}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(f)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.who}{item.refer ? `  ·  지칭: ${item.refer}` : ''}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(plainText(f), 'item:' + fk)}>
                        {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => copy(item.call, 'call:' + fk)}>
                        {copiedKey === 'call:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 부름말만</>}
                      </button>
                      <button className="minibtn" onClick={() => saveSnippet(f)}><Emoji e="💾"/> 스니펫 저장</button>
                    </div>
                    {linkbar(f, '')}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>호칭은 ‘정답’이 아니라 시대·지역·가풍·관계의 합입니다. 인물이 누구를 어떻게 부르는가가 곧 그 관계를 드러냅니다.</div>
    </div>
  )
}
