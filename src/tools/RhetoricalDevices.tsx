// 수사법 사전 — 은유·직유·의인·과장·반어·대구·점층·설의·돈호·열거 등 한국어 수사법 40+를
// 정의 + 예문 2~3개 + 활용 팁과 함께 모은 로컬 대량 사전.
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용.
// Math.random + localStorage(즐겨찾기·마지막 카테고리·펼침 상태)만 사용. 검색·무작위·카테고리 펼침·클릭 복사.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'rhetorical-devices', name: '수사법 사전', icon: '🎴', group: '언어·어휘', intro: '은유·직유·반어·대구·점층 등 수사법 40+를 정의·예문·활용 팁과 함께 찾아 문장에 양념으로 쓰세요', w: 640, h: 640 }

interface Device {
  name: string          // 수사법 이름
  alias?: string        // 한자/영문 등 별칭
  def: string           // 정의(한 문장)
  examples: string[]    // 예문 2~3개
  tip: string           // 활용 팁
}
interface CatDef { key: string; label: string; icon: string; items: Device[] }

// 로컬 수사법 사전 — 4개 카테고리(비유/강조·변화/구조·반복/표현·기교), 합계 44개.
const CATS: CatDef[] = [
  {
    key: 'compare', label: '비유법', icon: '🪞', items: [
      {
        name: '직유법', alias: '直喩 / simile',
        def: "‘~처럼·~같이·~듯이·~인 양’ 등을 써서 두 대상을 직접 견주어 빗대는 표현.",
        examples: [
          '내 마음은 호수처럼 잔잔했다.',
          '그녀는 사슴같이 놀란 눈으로 나를 보았다.',
          '눈이 솜털 떨어지듯 소리 없이 내렸다.',
        ],
        tip: '연결어가 드러나 알아보기 쉽지만 그만큼 흔하다. 빗대는 대상(보조관념)을 의외의 것으로 골라야 신선해진다.',
      },
      {
        name: '은유법', alias: '隱喩 / metaphor',
        def: "연결어 없이 ‘A는 B다’처럼 한 대상을 다른 대상으로 곧장 빗대는 표현.",
        examples: [
          '내 마음은 호수다.',
          '그는 우리 팀의 심장이었다.',
          '시간은 모든 상처를 꿰매는 바늘이다.',
        ],
        tip: '직유보다 응축돼 강렬하다. 원관념과 보조관념의 거리가 멀수록 시적이지만, 너무 멀면 난해해지니 균형을 잡는다.',
      },
      {
        name: '의인법', alias: '擬人 / personification',
        def: '사람이 아닌 사물·자연·관념에 인간의 감정·행동·인격을 부여하는 표현.',
        examples: [
          '바람이 창문을 두드리며 울었다.',
          '시계가 나를 재촉하듯 째깍거렸다.',
          '늙은 느티나무가 마을을 굽어보고 있었다.',
        ],
        tip: '풍경에 정서를 입혀 분위기를 만든다. 인물의 심리를 풍경에 투사하면(객관적 상관물) 직접 설명 없이 감정을 전할 수 있다.',
      },
      {
        name: '활유법', alias: '活喩',
        def: '무생물을 마치 살아 있는 생물처럼 표현하는 비유(인격까지는 부여하지 않음).',
        examples: [
          '성난 파도가 절벽을 물어뜯었다.',
          '도시가 깨어나 기지개를 켰다.',
          '안개가 골목을 슬금슬금 기어 다녔다.',
        ],
        tip: '의인법이 ‘인격’을 준다면 활유법은 ‘생명·운동’을 준다. 정적인 배경을 움직이게 만들어 장면에 긴장을 더한다.',
      },
      {
        name: '풍유법', alias: '諷諭 / allegory',
        def: '본뜻을 직접 말하지 않고 다른 이야기·속담에 빗대어 넌지시 드러내는 표현.',
        examples: [
          '“소 잃고 외양간 고친다.” — 일을 그르친 그에게 그렇게 말했다.',
          '여우와 신 포도 이야기로 그의 변명을 비꼬았다.',
          '“까마귀 노는 곳에 백로야 가지 마라.”',
        ],
        tip: '속담·우화·교훈담 전체가 비유가 된다. 직설을 피하고 풍자·교훈을 우회적으로 전할 때 쓴다.',
      },
      {
        name: '대유법', alias: '代喩',
        def: '대상의 일부나 속성으로 전체를, 또는 특징으로 본체를 대신 가리키는 표현(제유·환유 포함).',
        examples: [
          '빵이 없으면 살 수 없다. (빵 = 양식 전체)',
          '펜은 칼보다 강하다. (펜 = 글, 칼 = 무력)',
          '청와대가 입장을 발표했다. (장소 = 그곳의 권력)',
        ],
        tip: '제유(부분→전체)와 환유(인접·관련물로 대치)를 아우른다. 추상을 구체 사물로 바꿔 이미지를 또렷하게 한다.',
      },
      {
        name: '상징', alias: '象徵 / symbol',
        def: '구체적 사물로 추상적 관념·정서를 대신 나타내되, 그 의미가 작품 속에서 거듭 환기되는 표현.',
        examples: [
          '비둘기는 평화의 상징이다.',
          '그가 떠난 뒤에도 빈 의자만 자리를 지켰다. (부재·기다림)',
          '소설 내내 등장하는 붉은 코트가 그녀의 욕망을 대신했다.',
        ],
        tip: '비유가 1회적 견줌이라면 상징은 반복으로 의미가 축적된다. 작품 전체를 관통하는 소재 하나를 정해 두면 주제가 단단해진다.',
      },
      {
        name: '중의법', alias: '重義',
        def: '한 단어·구절에 둘 이상의 뜻을 겹쳐 담아 여러 갈래로 읽히게 하는 표현.',
        examples: [
          '“수양산 바라보며 이제를 한하노라.” — ‘수양산’이 산 이름이자 수양대군을 가리킴.',
          '청산리 벽계수야 — ‘벽계수’가 푸른 시냇물이자 사람 이름.',
          '“나 보기가 역겨워 가실 때에는” — ‘가시다’가 떠남과 (꽃을) 밟음으로 겹침.',
        ],
        tip: '동음·다의를 활용해 표면과 이면을 동시에 말한다. 풍자·시조에서 묘미를 살리되 독자가 두 뜻을 알아챌 단서를 남긴다.',
      },
    ],
  },
  {
    key: 'stress', label: '강조법', icon: '🔥', items: [
      {
        name: '과장법', alias: '誇張 / hyperbole',
        def: '대상을 실제보다 훨씬 크거나 작게 부풀려·줄여 표현하는 강조.',
        examples: [
          '눈이 빠지게 너를 기다렸다.',
          '쥐꼬리만 한 월급으로 한 달을 버틴다.',
          '천만번을 말해도 모자랄 고마움.',
        ],
        tip: '감정의 크기를 시각화한다. 남발하면 가벼워지니 결정적 한 문장에 몰아 써야 무게가 산다.',
      },
      {
        name: '반복법', alias: '反復 / repetition',
        def: '같은 말·구절을 거듭 써서 의미와 정서를 강조하는 표현.',
        examples: [
          '가도 가도 끝없는 황톳길.',
          '꽃이 피네, 꽃이 피네, 갈 봄 여름 없이 꽃이 피네.',
          '잊으리, 잊으리, 그날을 잊으리.',
        ],
        tip: '리듬과 절실함을 동시에 만든다. 반복하되 미묘하게 변주(점층·도치)하면 단조로움을 피하고 클라이맥스를 빚는다.',
      },
      {
        name: '점층법', alias: '漸層 / climax',
        def: '뜻이나 강도를 약→강, 작은 것→큰 것으로 한 단계씩 끌어올리는 표현.',
        examples: [
          '한 사람이, 한 마을이, 마침내 온 나라가 움직였다.',
          '실개천이 강이 되고, 강이 바다가 되었다.',
          '속삭임은 외침이 되고, 외침은 함성이 되었다.',
        ],
        tip: '문장 끝으로 갈수록 고조돼 절정을 만든다. 가장 강한 항목을 맨 뒤에 두는 ‘끝 강조’ 배치가 핵심이다.',
      },
      {
        name: '점강법', alias: '漸降',
        def: '점층과 반대로 강→약, 큰 것→작은 것으로 단계적으로 낮춰 가는 표현.',
        examples: [
          '온 세상이, 한 도시가, 끝내 한 사람의 마음만 남았다.',
          '함성은 외침으로, 외침은 속삭임으로 잦아들었다.',
          '제국이 무너지고, 도시가 비고, 집 한 채가 타들어 갔다.',
        ],
        tip: '고조 대신 쓸쓸한 여운·체념·소멸을 연출한다. 결말의 적막감이나 허무를 그릴 때 효과적이다.',
      },
      {
        name: '대조법', alias: '對照 / contrast',
        def: '서로 반대되거나 차이 나는 두 대상을 나란히 놓아 의미를 뚜렷이 부각하는 표현.',
        examples: [
          '낮은 짧고 밤은 길었다.',
          '인생은 짧고 예술은 길다.',
          '그는 부유했으나 마음은 가난했다.',
        ],
        tip: '명암·생사·빈부 등 상반 개념을 짝지어 주제를 선명하게 한다. 대구와 결합하면 균형미까지 얻는다.',
      },
      {
        name: '열거법', alias: '列擧 / enumeration',
        def: '비슷한 성격의 사물·사실을 죽 늘어놓아 풍부함·다양함을 강조하는 표현.',
        examples: [
          '산과 들과 강과 바다가 모두 잠들었다.',
          '책상 위엔 펜, 잉크, 편지, 마른 꽃잎이 어지러웠다.',
          '그는 시인이자 화가이자 음악가이며 또한 혁명가였다.',
        ],
        tip: '나열만으로 양감·충만함을 만든다. 항목 수를 셋 이상으로 하고, 마지막 항목에 무게를 실으면 점층 효과까지 난다.',
      },
      {
        name: '연쇄법', alias: '連鎖',
        def: '앞 구절의 끝말을 다음 구절의 첫말로 이어받아 사슬처럼 연결하는 표현.',
        examples: [
          '꼬리에 꼬리를 물고, 물고 늘어진 끝에 진실에 닿았다.',
          '원숭이 엉덩이는 빨개, 빨가면 사과, 사과는 맛있어.',
          '말이 씨가 되고, 씨가 나무가 되고, 나무가 숲이 되었다.',
        ],
        tip: '이어받는 리듬이 노래처럼 굴러간다. 인과의 연쇄나 운명의 사슬을 보여 줄 때 형식과 내용이 맞물린다.',
      },
      {
        name: '영탄법', alias: '詠嘆 / exclamation',
        def: '감탄사·감탄형 어미로 고조된 감정을 직접 터뜨려 강조하는 표현.',
        examples: [
          '아, 가을인가!',
          '오호라, 이 일을 어찌할꼬!',
          '얼마나 그리웠던가, 그 시절이여!',
        ],
        tip: '벅찬 정서를 단숨에 분출한다. 절제된 문맥 속에서 한두 번 터뜨려야 진짜 감탄으로 들린다.',
      },
      {
        name: '미화법', alias: '美化',
        def: '대상을 실제보다 아름답고 고상하게 꾸며 표현하는 강조.',
        examples: [
          '거리의 천사(=고아·걸인)에게 손을 내밀었다.',
          '청소부를 ‘환경 미화원’이라 부른다.',
          '낡은 골목을 ‘세월이 깃든 길’이라 불렀다.',
        ],
        tip: '대상을 격상시켜 따뜻함·품격을 더한다. 반어와 결합하면 도리어 신랄한 풍자가 되기도 한다.',
      },
      {
        name: '비교법', alias: '比較',
        def: '두 대상을 ‘~보다’ 등으로 견주어 우열·정도 차이를 드러내는 표현.',
        examples: [
          '죽음보다 깊은 잠에 빠져들었다.',
          '그 침묵은 어떤 비난보다 따가웠다.',
          '얼음보다 차가운 목소리로 말했다.',
        ],
        tip: '정도를 ‘무엇보다’의 기준점으로 못 박아 강조한다. 기준이 되는 보조 대상을 의외의 것으로 고르면 신선하다.',
      },
    ],
  },
  {
    key: 'vary', label: '변화법', icon: '🌀', items: [
      {
        name: '설의법', alias: '設疑 / rhetorical question',
        def: '답이 정해진 물음을 던져 도리어 강한 긍정·부정을 끌어내는 표현.',
        examples: [
          '누가 그 마음을 모르겠는가? (모두 안다)',
          '이보다 더한 슬픔이 또 있으랴? (없다)',
          '꽃이 진다고 그대를 잊은 적 있던가?',
        ],
        tip: '평서문보다 독자를 끌어들인다. 대답을 빤히 알게 만들어 동의를 유도하는, 설득적 글에 강력한 무기다.',
      },
      {
        name: '돈호법', alias: '頓呼 / apostrophe',
        def: '사람·사물·관념을 갑자기 불러 주의를 환기하고 정서를 고조하는 표현.',
        examples: [
          '아아, 조국이여, 너는 어디로 가는가.',
          '바다여, 나의 모든 것을 받아다오.',
          '벗이여, 이 밤을 어찌 견디는가.',
        ],
        tip: '문득 ‘부름’으로 어조를 전환해 호소력을 높인다. 영탄·설의와 자주 짝지어 시의 클라이맥스를 만든다.',
      },
      {
        name: '도치법', alias: '倒置 / inversion',
        def: '정상적인 어순을 일부러 뒤집어 강조하거나 여운을 남기는 표현.',
        examples: [
          '보고 싶다, 네가.',
          '잊었노라, 그 약속을.',
          '가야지, 이제는, 정든 이곳을.',
        ],
        tip: '앞으로 당겨진 말에 시선이 쏠린다. 감정의 핵심어를 문두에 던지면 긴 설명보다 강렬하다.',
      },
      {
        name: '반어법', alias: '反語 / irony',
        def: '속뜻과 정반대로 말해 도리어 진의를 강하게 전하거나 비꼬는 표현.',
        examples: [
          '(지각한 이에게) 참 일찍도 왔다.',
          '나 보기가 역겨워 가실 때에는 죽어도 아니 눈물 흘리오리다.',
          '잘~한다, 정말 자랑스럽다.',
        ],
        tip: '말과 진심의 간극이 클수록 효과가 크다. 독자가 진의를 알아챌 문맥 단서를 반드시 깔아 둔다.',
      },
      {
        name: '역설법', alias: '逆說 / paradox',
        def: '겉보기엔 모순·이치에 안 맞는 말이지만 그 안에 깊은 진실을 담는 표현.',
        examples: [
          '찬란한 슬픔의 봄을.',
          '소리 없는 아우성.',
          '지는 것이 이기는 것이다.',
        ],
        tip: '반어가 ‘말 vs 진심’의 어긋남이라면 역설은 ‘진술 자체’의 모순이다. 모순을 통해 단순 진술이 못 담는 진리를 압축한다.',
      },
      {
        name: '문답법', alias: '問答',
        def: '스스로 묻고 스스로 답하는 형식으로 내용을 전개·강조하는 표현.',
        examples: [
          '저 별은 무엇인가? 그것은 떠난 이의 눈빛이다.',
          '행복이란 무엇인가? 곁에 누군가 있는 저녁이다.',
          '왜 떠나는가? 머물면 죽기 때문이다.',
        ],
        tip: '독자의 궁금증을 대신 던져 주고 답해 몰입을 끈다. 설의법과 달리 ‘답’을 명시해 주제를 또렷이 못 박는다.',
      },
      {
        name: '인용법', alias: '引用 / quotation',
        def: '남의 말·글·속담·격언을 끌어와 글에 권위와 깊이를 더하는 표현.',
        examples: [
          '“시간은 금이다”라더니, 그 말이 옳았다.',
          '옛말에 ‘가는 말이 고와야 오는 말이 곱다’ 했다.',
          '괴테는 “경험은 영원한 스승”이라 했다.',
        ],
        tip: '직접 인용(따옴표)과 간접 인용을 구분해 쓴다. 인용을 비틀거나 반박하면 더 신선한 자기 목소리가 된다.',
      },
      {
        name: '생략법', alias: '省略 / ellipsis',
        def: '말의 일부를 일부러 비워 두어 여운·긴박감·함축을 남기는 표현.',
        examples: [
          '나는 그저…… 아무 말도 못 했다.',
          '만약 그때 내가 손을 잡았더라면.',
          '바람은 차고, 길은 멀고…….',
        ],
        tip: '비운 자리를 독자가 채우게 한다. 말줄임표는 망설임·여운에, 단절은 긴박·충격에 각각 어울린다.',
      },
      {
        name: '돈절법', alias: '頓絶 / aposiopesis',
        def: '문장을 끝맺지 않고 갑자기 뚝 끊어 긴장·격앙·말문 막힘을 드러내는 표현.',
        examples: [
          '네가 어떻게 나한테—',
          '만약 그 문을 열었더라면, 그랬다면—',
          '“당장 나가, 안 그러면—!”',
        ],
        tip: '생략법보다 단절이 거칠고 급작스럽다. 감정이 북받쳐 말을 잇지 못하는 순간, 대사에 특히 강하다.',
      },
    ],
  },
  {
    key: 'structure', label: '구조·기교', icon: '🏛️', items: [
      {
        name: '대구법', alias: '對句 / parallelism',
        def: '비슷한 구조·가락의 구절을 짝지어 나란히 놓아 균형과 리듬을 만드는 표현.',
        examples: [
          '산은 높고 물은 깊다.',
          '낮에는 일하고 밤에는 글을 쓴다.',
          '콩 심은 데 콩 나고, 팥 심은 데 팥 난다.',
        ],
        tip: '문장 길이·품사·어순을 맞춰야 짝이 산다. 대조법과 결합하면 의미 대비와 형식미를 함께 얻는다.',
      },
      {
        name: '대조법(구조)', alias: '對比',
        def: '앞뒤 절의 의미를 맞세워 짝을 이루되, 뜻은 상반되게 배치하는 균형 구조.',
        examples: [
          '뿌린 대로 거두고, 지은 대로 받는다.',
          '강한 자에겐 약하고, 약한 자에겐 강하다.',
          '입은 웃고 있었으나 눈은 울고 있었다.',
        ],
        tip: '대구의 ‘짝 맞춤’ 위에 반대 의미를 얹는다. 인물의 이중성·세태의 모순을 한 문장에 압축할 때 쓴다.',
      },
      {
        name: '점층 구조', alias: 'gradation',
        def: '문장·문단·장면을 작은 것에서 큰 것으로 쌓아 올려 절정에 이르게 하는 구성.',
        examples: [
          '소문이 동네에 돌고, 도시로 번지고, 끝내 온 나라를 뒤덮었다.',
          '첫 거짓말이 둘째를, 둘째가 셋째를 불렀다.',
          '한 방울, 한 줄기, 마침내 홍수가 되었다.',
        ],
        tip: '문장 단위의 점층법을 장면·플롯에 확장한 것. 사건의 규모·긴장을 단계적으로 키워 클라이맥스를 설계한다.',
      },
      {
        name: '수미상관', alias: '首尾相關 / framing',
        def: '글·시의 처음과 끝에 같거나 비슷한 구절을 배치해 안정감과 여운을 주는 구조.',
        examples: [
          '(첫 연) 그 강은 흘렀다 … (끝 연) 그래도 그 강은 흐른다.',
          '소설을 “비가 내렸다”로 열고 같은 문장으로 닫는다.',
          '“나는 기억한다”로 시작해 “나는 기억한다”로 끝낸다.',
        ],
        tip: '처음과 끝을 묶어 구조를 닫는다. 같은 문장이라도 결말에선 의미가 달라지게 하면 변화의 깊이가 드러난다.',
      },
      {
        name: '점이법', alias: '漸移',
        def: '하나의 정조·이미지에서 다른 정조·이미지로 단계적으로 옮겨 가는 표현.',
        examples: [
          '봄의 설렘이 여름의 무더위로, 다시 가을의 쓸쓸함으로 옮아갔다.',
          '웃음이 잦아들더니 어느새 흐느낌으로 바뀌었다.',
          '환한 거실에서 어둑한 복도로, 다시 캄캄한 지하로.',
        ],
        tip: '급전(돈전) 대신 부드러운 정조 전환을 만든다. 인물의 감정선이 서서히 변하는 과정을 그릴 때 자연스럽다.',
      },
      {
        name: '의성법', alias: '擬聲 / onomatopoeia',
        def: '소리를 흉내 낸 말로 청각적 생동감을 살리는 표현.',
        examples: [
          '댕댕, 종소리가 골짜기에 울렸다.',
          '빗방울이 후드득후드득 양철 지붕을 때렸다.',
          '문이 삐걱, 정적이 쩌렁 갈라졌다.',
        ],
        tip: '소리를 글자로 옮겨 장면을 ‘들리게’ 한다. 흔한 의성어 대신 직접 만들어 쓰면 그 장면만의 음향이 된다.',
      },
      {
        name: '의태법', alias: '擬態 / mimesis',
        def: '모양·움직임·태도를 흉내 낸 말로 시각적 생동감을 살리는 표현.',
        examples: [
          '아장아장 걷는 아이.',
          '별빛이 반짝반짝 흩어졌다.',
          '그는 슬그머니 일어나 살금살금 빠져나갔다.',
        ],
        tip: '동작·모양을 글자로 옮겨 장면을 ‘보이게’ 한다. 의성법과 함께 쓰면 청각·시각이 겹쳐 현장감이 극대화된다.',
      },
      {
        name: '돈강법', alias: '頓降 / anticlimax',
        def: '한껏 고조시켰다가 끝에서 일부러 사소·평범하게 떨어뜨려 허탈·해학을 주는 표현.',
        examples: [
          '나라를 구하고, 세상을 바꾸고, 그리고 — 라면을 끓였다.',
          '그는 운명을 걸고 봉투를 열었다. 안엔 광고 전단뿐이었다.',
          '온 우주가 숨죽인 그 순간, 그의 배에서 꼬르륵 소리가 났다.',
        ],
        tip: '점층의 기대를 일부러 배신해 웃음·풍자를 만든다. 비장함을 비틀어 희극으로 떨어뜨릴 때 강력하다.',
      },
      {
        name: '비약법', alias: '飛躍',
        def: '논리·시공의 중간 단계를 건너뛰어 단숨에 다른 차원으로 도약하는 표현.',
        examples: [
          '눈을 감았다. 그리고 — 십 년이 흘러 있었다.',
          '문을 열자, 거기 어린 시절의 마당이 펼쳐졌다.',
          '한 잔의 술에 그는 천 년의 시간을 건너뛰었다.',
        ],
        tip: '설명을 건너뛰어 충격·환상·압축을 만든다. 장면 전환(컷)이나 회상·환상으로 시간을 단숨에 접을 때 쓴다.',
      },
      {
        name: '언어유희', alias: '言語遊戲 / pun',
        def: '동음이의·발음의 닮음을 이용해 말장난으로 재미·풍자를 노리는 표현.',
        examples: [
          '“내 코가 석 자”라며 그는 정말 코를 만졌다.',
          '“말(馬)을 타니 말(言)이 많아진다.”',
          '“개는 ‘멍’ 때리지 않는다.”',
        ],
        tip: '소리의 겹침을 재치로 쓴다. 가벼운 유머·캐릭터의 입담·풍자에 좋되, 진지한 장면에선 분위기를 깰 수 있다.',
      },
      {
        name: '열거+점층(혼합)', alias: 'cumulative',
        def: '여러 항목을 나열하되 뒤로 갈수록 강도를 높여 열거와 점층을 함께 쓰는 표현.',
        examples: [
          '그는 친구를, 가족을, 끝내 자기 자신마저 잃었다.',
          '바람이 불고, 비가 쏟아지고, 마침내 하늘이 무너졌다.',
          '한 줄을, 한 쪽을, 그리고 책 한 권을 통째로 외웠다.',
        ],
        tip: '나열의 풍부함과 점층의 고조를 동시에 얻는다. 가장 충격적·결정적인 항목을 반드시 맨 끝에 둔다.',
      },
    ],
  },
]

const LS = 'sry:tool:rhetorical-devices:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Device }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

export default function RhetoricalDevices() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: 수사법 이름 집합
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  // 펼친 카드(이름) 집합
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Device } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ }
  }, [cat])
  useEffect(() => {
    try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ }
  }, [favs])

  // 토스트/복사 표시 타이머 정리(언마운트 시)
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ item }) => favs[item.name])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias ? item.alias.toLowerCase().includes(q) : false) ||
        item.def.toLowerCase().includes(q) ||
        item.examples.some((ex) => ex.toLowerCase().includes(q)) ||
        item.tip.toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    // 현재 카테고리 필터 안에서 무작위 1개 (검색어/즐겨찾기 무시)
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (name: string) => {
    setFavs((prev) => {
      const next = { ...prev }
      if (next[name]) delete next[name]
      else next[name] = true
      return next
    })
  }
  const toggleOpen = (name: string) => {
    setOpen((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 예문을 스니펫 라이브러리에 저장(글감 재사용)
  const saveExampleSnippet = (item: Device, ex: string) => {
    addToLibrary('snippets', {
      text: ex,
      source: `수사법 사전 · ${item.name}`,
      tags: ['수사법', item.name, '예문'],
    })
    setToast(`스니펫에 ‘${item.name}’ 예문을 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
  }

  // 수사법 항목(정의+예문+팁)을 프로젝트 자료 〈수사법〉 폴더에 메모로 추가
  const addItemToProject = (item: Device) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(item.name)}</b>${item.alias ? ` <i>(${escapeHtml(item.alias)})</i>` : ''}</p>`,
      `<p>${escapeHtml(item.def)}</p>`,
      `<p><b>📝 예문</b></p>`,
      `<ul>${item.examples.map((ex) => `<li>${escapeHtml(ex)}</li>`).join('')}</ul>`,
      `<p><b>💡 활용 팁</b><br>${escapeHtml(item.tip)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '수사법',
      title: `${item.name}${item.alias ? ` (${item.alias})` : ''}`,
      bodyHtml,
    })
    if (id) {
      setToast(`프로젝트 자료 〈수사법〉에 ‘${item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const exRow: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.5, padding: '5px 8px', borderRadius: 7, background: 'var(--paper)', border: '1px solid var(--border)', cursor: 'pointer' }

  // 단일 수사법 카드 렌더 (목록용 — 펼침/접힘, 무작위 카드용 — 항상 펼침)
  const renderCard = (c: CatDef, item: Device, opts: { forceOpen?: boolean; keyPrefix?: string } = {}) => {
    const prefix = opts.keyPrefix || 'item'
    const isOpen = opts.forceOpen || !!open[item.name]
    const isFav = !!favs[item.name]
    return (
      <div key={prefix + ':' + item.name} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: opts.forceOpen ? 'default' : 'pointer' }}
          onClick={opts.forceOpen ? undefined : () => toggleOpen(item.name)}>
          {!opts.forceOpen && <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{isOpen ? '▾' : '▸'}</span>}
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon} /> {c.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
          {item.alias && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.alias}</span>}
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={(e) => { e.stopPropagation(); toggleFav(item.name) }}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.def}</div>
        {isOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}><Emoji e="📝" /> 예문 (클릭하면 복사)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {item.examples.map((ex, i) => {
                const exId = `ex:${item.name}:${i}`
                return (
                  <div
                    key={i}
                    style={exRow}
                    title="클릭하면 예문 복사"
                    onClick={() => copy(ex, exId)}
                  >
                    <span style={{ color: 'var(--muted)' }}>{copiedKey === exId ? '✓ ' : '“'}</span>
                    {ex}
                    {copiedKey !== exId && <span style={{ color: 'var(--muted)' }}>”</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 8, color: 'var(--text)' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}><Emoji e="💡" /> 활용 팁 </span>{item.tip}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                className="minibtn"
                onClick={() => copy(`[${item.name}] ${item.def}\n\n예문:\n${item.examples.map((e) => '· ' + e).join('\n')}\n\n팁: ${item.tip}`, 'all:' + item.name)}
              >
                {copiedKey === 'all:' + item.name ? <>✓ 복사됨</> : <><Emoji e="📋" /> 전체 복사</>}
              </button>
              <button
                className="minibtn"
                onClick={() => saveExampleSnippet(item, item.examples[0])}
                title="첫 예문을 스니펫 라이브러리에 저장"
              >
                <Emoji e="💾" /> 예문 스니펫 저장
              </button>
            </div>
            {/* 연계: 이 수사법(정의+예문+팁)을 프로젝트 자료 〈수사법〉 폴더에 메모로 추가 */}
            <div className="linkbar" style={{ marginTop: 8 }}>
              <span className="linkbar-label">연계:</span>
              <button
                className="linkbtn"
                onClick={() => addItemToProject(item)}
                disabled={!hasProjectBridge()}
                title={hasProjectBridge() ? '이 수사법을 프로젝트 자료 〈수사법〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}
              >
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        은유·직유·의인·반어·대구·점층 등 <b>{total}개</b> 수사법을 정의·예문·활용 팁과 함께 모았습니다. 카테고리·검색으로 찾고, 예문을 클릭해 복사하세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="수사법·정의·예문으로 검색 (예: 반어, ~처럼, 강조)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL_KEY)}
          aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}
        >
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            >
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위 수사법</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '4px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={() => setRandom(null)} title="닫기">✕</button>
          </div>
          {renderCard(random.cat, random.item, { forceOpen: true, keyPrefix: 'rand' })}
        </div>
      )}

      {/* 추가/저장 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 수사법이 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => renderCard(c, item))
        )}
      </div>

      <div style={hint}>수사법은 장식이 아니라 의미의 무기입니다. 한 문장에 한 가지씩, 결정적 순간에만 써야 빛이 납니다.</div>
    </div>
  )
}
