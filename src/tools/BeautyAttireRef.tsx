// 미용·치장 사전 — 시대·문화·계층별 화장·머리손질·장신구·향·몸단장 관습과 '미(美)의 기준'을
//  인물 외양·계층 묘사에 바로 쓰도록 정리한 로컬 자료집(자작 텍스트). react 와 './linkbus' 외 import 없음.
//  외부 API/미디어/네트워크 불필요. 카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 즐겨찾기 +
//  수집함 + 스니펫 저장 + 프로젝트 연계 + 복식 사전 연계(openToolLinked).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'beauty-attire-ref',
  name: '미용·치장 사전',
  icon: '💄',
  group: '리서치·자료',
  intro: '시대·문화·계층별 화장·머리·장신구·향·몸단장 관습과 미의 기준을 인물 외양·계층 묘사에 정리한 참고 자료',
  w: 680,
  h: 700,
}

// ---------- 항목 형(型) ----------
// 모든 텍스트는 '외양·계층 묘사를 돕는 단서'. 어떤 인물·장면에 어울리는지까지 함께 적는다.
interface Entry {
  name: string          // 명칭(관습·양식)
  aka?: string          // 이칭·구성요소
  era?: string          // 시대·배경
  who?: string          // 계층·신분·상황(누가 가꾸는가)
  ideal?: string        // 미의 기준(무엇을 아름답다 여겼나)
  face?: string         // 화장·피부·얼굴 손질
  hair?: string         // 머리손질·결발·관모와의 관계
  adorn?: string        // 장신구·치레·치장 소품
  scent?: string        // 향·향료·체취 관리
  body?: string         // 몸단장·청결·손발톱·문신 등
  vibe?: string         // 인상·분위기(어떤 캐릭터에)
  caution?: string      // 고증·작가 유의(흔한 오류)
}
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ---------- 로컬 대량 자료집(자작 요약·표현) ----------
const CATS: CatDef[] = [
  {
    key: 'korea', label: '한국 전통', icon: '🇰🇷',
    note: '연지·곤지와 분(粉) 화장, 쪽·땋음·가체의 머리 문화, 동백기름과 향낭. 신분과 의례가 가꿈의 정도를 정했다. 사극 인물의 ‘얼굴과 머리’ 묘사 토대.',
    items: [
      { name: '반가 여인의 분 화장', aka: '백분·연지·미묵', era: '조선', who: '양반가 여성(예장·혼례)', ideal: '티 없이 흰 살결과 가지런한 이마, 절제된 붉은 점 하나가 ‘단정한 아름다움’.', face: '쌀가루·분꽃씨로 만든 백분을 얇게 펴 바르고, 양 볼과 입술에 연지로 옅은 붉은 기. 눈썹은 미묵으로 가늘고 길게 그린다.', hair: '머리를 정갈히 빗어 쪽을 찌고 비녀로 고정, 가르마는 곧게.', adorn: '쪽에 비녀, 예장엔 떨잠·뒤꽂이, 첩지.', scent: '동백기름의 은은한 머릿내, 옷섶에 향낭.', body: '손을 자주 씻어 희게, 손톱은 짧고 단정히.', vibe: '꾸민 듯 안 꾸민, 절제 속에 정성이 밴 단아한 여인.', caution: '진한 색조 화장은 오히려 천하게 여겨졌다. 반가 여인을 화려한 색조로 칠하면 신분 감각이 어긋난다.' },
      { name: '혼례·신부 단장', aka: '연지곤지·활옷·도투락댕기', era: '조선', who: '혼례를 치르는 신부', ideal: '이마 한가운데와 양 볼의 붉은 점이 ‘액을 막고 복을 부르는’ 가장 정성스런 꾸밈.', face: '백분으로 얼굴을 희게 한 뒤, 양 볼에 둥근 연지, 이마 가운데에 곤지를 찍는다. 입술도 또렷한 붉음.', hair: '큰머리(가체)를 얹거나 쪽을 크게 틀고 도투락댕기·앞댕기로 길게 늘인다.', adorn: '족두리·화관, 떨잠 여러 개, 칠보 비녀, 큰 노리개.', scent: '향낭과 향유로 짙지 않게.', body: '예식 전 목욕재계, 손끝까지 정성껏.', vibe: '평생 한 번의 정성으로 빚은, 붉은 점 하나하나가 축원인 얼굴.', caution: '연지곤지는 혼례·특별 의례의 표지. 일상 장면에 함부로 찍으면 의미가 가벼워진다.' },
      { name: '가체와 큰머리', aka: '다리·얹은머리·트레머리', era: '조선', who: '상류 여성·기녀(예장)', ideal: '높고 풍성하게 얹은 머리가 부와 격(格)의 상징. 클수록 귀해 보였다.', face: '머리에 시선이 가도록 얼굴 화장은 정갈하게.', hair: '남의 머리카락을 더한 다리(가체)를 얹거나 둘러 거대한 머리 모양을 만든다. 무게로 목이 아플 정도.', adorn: '떨잠·뒤꽂이·첩지로 가체를 장식, 옥·산호·진주.', scent: '머리 손질에 쓴 기름과 향.', body: '무거운 머리를 이고도 흐트러지지 않는 자세.', vibe: '머리의 무게만큼 신분을 짊어진, 화려하나 고단한 우아함.', caution: '가체는 사치 논란으로 시기마다 금령이 오갔다. 모든 조선 여성에게 큰머리를 씌우면 시대가 뭉개진다.' },
      { name: '선비·사대부의 몸가짐', aka: '망건·상투·수염', era: '조선', who: '양반 남성', ideal: '가꾸지 않은 듯 단정함. 흐트러진 머리·수염은 곧 흐트러진 마음으로 읽혔다.', face: '화장은 하지 않되 얼굴을 늘 씻어 정갈히.', hair: '머리를 빗어 상투를 틀고 망건으로 이마를 동인다. 외출 시 갓.', adorn: '망건의 관자·풍잠, 갓끈에 호박·대모.', scent: '먹과 종이의 내음, 옷에 밴 향.', body: '수염을 단정히 기르고 빗질, 손톱을 깎아 정돈.', vibe: '꾸밈을 경계하면서도 단정함으로 품격을 드러내는 인물.', caution: '수염·상투의 정돈 상태가 곧 그 인물의 자기관리. 학식 있는 인물을 봉두난발로 그리면 성격 설정과 어긋난다.' },
      { name: '기녀의 화장과 치레', aka: '짙은 화장·가체·노리개', era: '조선', who: '기녀·예인(연회·접객)', ideal: '시선을 모으는 화사함이 ‘허용된 일탈’. 반가 여인의 절제와 정반대 미학.', face: '백분 위에 또렷한 연지와 입술, 눈매를 살린 미묵. 반가보다 색이 짙고 분명하다.', hair: '높이 얹은 가체에 화려한 떨잠·뒤꽂이.', adorn: '큼직한 삼작노리개, 가락지 여럿, 화려한 댕기.', scent: '짙은 향유와 향낭으로 자취를 남긴다.', body: '손과 자태를 곱게 가꿔 춤·연주에 어울리게.', vibe: '화려함 뒤에 직업이 새긴 그늘이 비치는, 눈길을 붙드는 얼굴.', caution: '기녀의 짙은 화장을 양반가 여인에게 옮기면 신분이 흐려진다. ‘색의 짙기’가 곧 직업의 결임을 기억하라.' },
      { name: '서민의 수수한 단장', aka: '민얼굴·머릿수건·동백기름', era: '조선', who: '평민 여성·일하는 사람', ideal: '꾸밀 겨를도 재물도 없어, 깨끗함 자체가 단장. 명절·혼례에나 분을 발랐다.', face: '평소엔 민얼굴, 햇볕에 그을린 살결. 잔칫날에 분을 살짝.', hair: '쪽 찐 머리에 나무 비녀, 일할 땐 머릿수건으로 동인다.', adorn: '값싼 나무·놋 비녀, 헝겊 댕기.', scent: '땀과 흙·부엌의 냄새, 동백기름의 머릿내.', body: '거칠고 튼 손, 짧은 손톱. 노동의 흔적이 곧 몸의 기록.', vibe: '꾸밈없이 정직한, 햇볕과 일이 얼굴에 새겨진 사람.', caution: '평민에게 흰 분칠과 또렷한 연지를 일상으로 입히면 ‘가난한데 화장한’ 모순이 된다.' },
    ],
  },
  {
    key: 'east_asia', label: '동아시아 전통', icon: '🏮',
    note: '당·송의 화전(花鈿), 일본의 백분·오하구로·마유즈쿠리, 변발과 전족 등. 한국과 닮아 보여도 화장 양식과 미의 기준이 또렷이 갈린다.',
    items: [
      { name: '당나라 귀부인의 화장', aka: '화전·홍장·아미', era: '당(唐)', who: '귀족 여성', ideal: '둥글고 풍만한 얼굴, 대담하고 화려한 색조가 ‘성당(盛唐)의 미’. 절제보다 과감함.', face: '얼굴 가득 흰 분과 볼·뺨까지 번지는 짙은 홍장(연지), 이마와 미간에 꽃모양 장식(화전)을 붙이고, 입가에 점(면엽)을 그린다. 눈썹은 다양한 모양으로 짙게.', hair: '높이 틀어 올린 풍성한 결발에 보요(흔들리는 장식).', adorn: '금·옥 보요, 귀고리, 화려한 빗.', scent: '향낭과 훈향(옷·머리에 향을 쐼).', body: '풍만함을 미덕으로 여겨 통통한 몸을 가꿈.', vibe: '거침없이 화려한, 색과 장식이 넘치는 호방한 미인.', caution: '당의 화려·풍만 미학을 ‘마르고 창백한’ 후대 동아시아 미인상과 섞지 말 것. 시대가 곧 미의 기준을 바꾼다.' },
      { name: '일본 귀족 여성의 백분 화장', aka: '오시로이·오하구로·마유즈쿠리', era: '헤이안~근세', who: '궁정·상류층 여성', ideal: '눈처럼 흰 얼굴, 본래 눈썹을 밀고 이마 높이 그린 ‘점 눈썹’, 검게 물들인 이가 격식의 미.', face: '오시로이(백분)로 얼굴·목을 새하얗게, 본래 눈썹을 밀고 이마 위쪽에 흐릿한 점 눈썹(마유즈쿠리)을 그린다. 입술은 작고 붉게.', hair: '검고 긴 머리를 곧게 늘어뜨리거나(헤이안) 후대엔 틀어 올려 간자시로 장식.', adorn: '간자시(머리꽂이), 빗, 부채.', scent: '향을 옷·머리에 배게 하는 ‘훈물’ 문화가 발달.', body: '치아를 검게 물들이는 오하구로(기혼·격식의 표지).', vibe: '인공적 흰 얼굴과 검은 머리·이의 대비가 비현실적으로 정제된 인물.', caution: '오하구로(검은 이)와 점 눈썹은 격식·기혼의 강한 신호다. 모든 일본 여성에게 적용하면 신분·혼인 상태가 뭉개진다.' },
      { name: '게이샤·마이코의 단장', aka: '백분·붉은 입술·시마다', era: '근세~근대 일본', who: '예기(藝妓)·견습(마이코)', ideal: '무대 위에서 또렷이 읽히는 흰 얼굴과 붉은 점. 격식화된 인공의 아름다움.', face: '오시로이로 얼굴·목덜미를 희게(목덜미에 W자로 살갗을 남김), 눈·눈썹 가에 붉은 기, 입술은 작고 선명히. 마이코는 아랫입술만 칠하기도.', hair: '본 머리를 틀어 올린 시마다 결발에 계절 간자시·빗.', adorn: '계절 꽃 간자시, 빗, 늘어뜨린 장식(빈코).', scent: '은은한 백단·향.', body: '목덜미를 미의 핵심으로 여겨 일부러 드러낸다.', vibe: '하나의 회화처럼 완성된, 인공의 정점에 선 우아함.', caution: '게이샤를 ‘유녀(遊女)’와 혼동하지 말 것. 화장·머리·치레의 격식이 직업의 성격을 가른다.' },
      { name: '청대 만주 여성의 치장', aka: '치터우·기두·전족 거부', era: '청(淸)', who: '만주 귀족 여성', ideal: '넓고 평평하게 펼친 머리 받침과 화려한 장식, 굽 높은 신. 한족 여성과 구별되는 만주의 미.', face: '흰 분에 볼·입술의 옅은 붉음.', hair: '머리를 좌우로 넓게 펼쳐 받침(치터우/양파두)에 얹고 조화·보석으로 장식.', adorn: '큼직한 머리꽂이·조화, 긴 손톱 보호 골무(호지투), 굽 높은 화분저(花盆底) 신.', scent: '향낭·훈향.', body: '만주 여성은 전족을 하지 않아 자연스러운 발(굽 높은 신으로 걸음을 우아하게).', vibe: '넓은 머리 받침과 긴 손톱 보호구가 일상을 ‘느린 우아함’으로 만든 귀부인.', caution: '전족은 한족 여성의 풍습이고 만주 황실은 금했다. 청대 궁정 여성을 전족으로 그리면 큰 오류.' },
      { name: '변발과 남성의 머리', aka: '변발·치발', era: '청(淸)', who: '청대 성인 남성', ideal: '앞머리를 밀고 뒤를 길게 땋아 늘인 변발이 (강제된) 시대의 표준 머리.', face: '특별한 화장 없음, 수염을 기르거나 깎음.', hair: '앞이마와 정수리를 밀고, 남긴 뒷머리를 길게 땋아 등 뒤로 늘인다.', adorn: '땋은 끝에 댕기·끈.', scent: '특별한 향 문화는 적음.', body: '머리를 정기적으로 밀어 다듬는다.', vibe: '시대가 강제한 머리 양식을 통해 ‘복속’의 역사를 몸에 진 남성.', caution: '변발은 청대(만주 지배기)의 표지다. 명·송 등 이전 한족 남성에게 변발을 씌우면 시대착오.' },
      { name: '몽골 유목민의 단장', aka: '땋은 머리·은장식·볼연지', era: '유목 시대', who: '초원 유목민', ideal: '바람과 추위에 강하면서도 은과 산호로 빛나는 머리장식이 부의 표지.', face: '햇볕·바람에 단련된 살결, 볼에 자연스러운 붉은 기.', hair: '여러 갈래로 길게 땋아 늘이고, 기혼 여성은 독특한 머리틀에 은·산호를 단다.', adorn: '묵직한 은제 머리장식, 산호·터키석 구슬, 귀고리.', scent: '가죽·연기·말의 냄새가 밴 체취.', body: '실용을 위해 손질은 간소하나 장식은 화려.', vibe: '거친 자연 속에서 은빛으로 빛나는, 강인하고 화려한 사람.', caution: '유목민의 화려한 장식을 ‘원시적·미개’로 그리지 말 것. 이동 생활에 맞춘 정교한 미의식이다.' },
    ],
  },
  {
    key: 'euro_med', label: '서양 고대·중세·르네상스', icon: '🏰',
    note: '고대의 화장과 향유, 중세의 ‘넓은 이마’ 숭배와 베일, 르네상스의 흰 피부와 금발. 종교와 신분이 가꿈을 규정했다.',
    items: [
      { name: '고대 이집트의 화장', aka: '콜·말라카이트·향유', era: '고대 이집트', who: '남녀 귀족·사제', ideal: '눈을 크게 둘러 그린 ‘신과 통하는 눈’, 윤기 나는 피부. 남녀 모두 짙게 꾸몄다.', face: '검은 콜(안티몬·검댕)로 눈 둘레를 길게 빼 그리고, 초록 광물(말라카이트)로 눈두덩에 색. 볼·입술에 붉은 광물 가루.', hair: '머리를 짧게 깎거나 밀고 정교한 가발을 쓴다. 가발에 향유와 장식.', adorn: '넓은 가슴 목걸이, 팔찌, 가발 위 머리띠.', scent: '몰약·유향 같은 향유를 몸과 가발에 듬뿍.', body: '향유로 피부를 보호(건조·햇볕), 제모를 즐김.', vibe: '강렬한 눈매와 향유의 윤기로 ‘성스러우면서 관능적인’ 존재.', caution: '이집트의 짙은 눈화장은 남녀·종교의 보편 관습이었다. 여성만의 사치로 좁히면 문화를 오해한 것.' },
      { name: '중세 귀부인의 미', aka: '넓은 이마·창백함·베일', era: '중세', who: '귀족 여성', ideal: '높고 넓은 이마, 핏기 없이 창백한 피부, 가는 눈썹이 ‘고귀하고 정숙한’ 미.', face: '화장은 죄스럽게 여겨 옅게. 피부를 희게 보이려 애쓰고, 이마를 넓혀 보이려 앞머리·눈썹을 뽑았다.', hair: '머리를 가려 올리고 베일·헤드드레스(에냉 등)로 덮는다. 머리카락을 드러내는 건 미혼·격식 외.', adorn: '에냉과 베일, 보석 박힌 머리띠, 정숙한 십자가.', scent: '향수보다 향초·향낭, 허브.', body: '목욕은 드물고, 청결보다 ‘가림’과 ‘창백함’을 중시.', vibe: '천에 감싸여 살갗을 거의 드러내지 않는, 멀고 정숙한 귀부인.', caution: '“화장=중세 일상”은 오해다. 종교가 꾸밈을 죄로 보아 매우 옅거나 감췄다. 짙은 화장을 입히면 시대감이 깨진다.' },
      { name: '르네상스 미인의 흰 피부', aka: '연백분·금발·뽑은 눈썹', era: '15~16세기', who: '상류 여성', ideal: '도자기처럼 흰 피부, 붉은 입술, 금빛 머리, 높은 이마가 미의 정점. 흼=고귀함.', face: '연백분(납 성분)으로 얼굴을 희게(독성 위험), 볼·입술에 붉은 기. 눈썹·앞이마 머리를 뽑아 이마를 넓힌다.', hair: '햇볕에 말려 금빛으로 탈색, 정교하게 땋아 올림.', adorn: '진주 머리망·목걸이, 보석 머리장식.', scent: '장미·사향 향수가 발달하기 시작.', body: '흰 피부 유지를 위해 햇볕을 피하고 베일·장갑.', vibe: '회화 속 여신처럼 희고 금빛으로 빛나는, 비현실적으로 정제된 미인.', caution: '연백분은 납중독을 일으켰다. ‘흰 피부의 대가’를 서사에 녹이면 시대의 그늘이 드러난다.' },
      { name: '수도자·성직자의 절제', aka: '삭발·톤슈어·무화장', era: '중세', who: '수도사·사제·수녀', ideal: '꾸밈을 버리는 것 자체가 미덕. 청빈과 겸손을 외양으로 증언한다.', face: '화장 일절 없음, 정갈히 씻은 맨얼굴.', hair: '수도사는 정수리를 동그랗게 민 삭발(톤슈어), 수녀는 머리를 베일로 완전히 가린다.', adorn: '묵주·십자가 외 장신구 없음.', scent: '향유·향수 금지, 의례 때 유향·몰약.', body: '단식·고행으로 마른 몸, 검소한 청결.', vibe: '가꿈을 버려 오히려 또렷한, 비움의 외양을 입은 인물.', caution: '수도회·시대마다 규율이 달랐다. ‘성직=무조건 금욕적 외양’으로 단순화하면 디테일이 죽는다.' },
      { name: '평민·농촌 여성의 단장', aka: '두건·맨얼굴·튼 손', era: '중세~근세', who: '서민 여성', ideal: '꾸밀 여유가 없어 깨끗함과 건강함이 곧 단장. 머리를 가리는 것이 정숙의 표지.', face: '햇볕에 그을린 맨얼굴, 노동의 홍조.', hair: '머리를 모아 코이프·두건 안으로. 드러내는 건 미혼·잔치.', adorn: '값싼 머리핀, 잔칫날 리본 정도.', scent: '땀·허브·가축의 냄새.', body: '거칠고 튼 손, 짧은 손톱. 목욕은 드묾.', vibe: '꾸밈없이 건강한, 흙과 햇볕이 밴 사람.', caution: '맨머리·맨얼굴이 기본. 평민 여성을 흰 피부·정교한 머리로 그리면 신분 감각이 무너진다.' },
    ],
  },
  {
    key: 'modern_west', label: '근대 서양', icon: '🎩',
    note: '바로크의 가발·애교점, 빅토리아의 ‘화장 안 한 듯’ 미덕, 20세기의 화장 해방. 격식과 도덕관이 가꿈을 좌우했다.',
    items: [
      { name: '바로크 궁정의 인공미', aka: '가발·애교점·연백분', era: '17~18세기', who: '귀족 남녀(궁정)', ideal: '자연을 넘어선 인공—희게 칠한 얼굴, 가루 뿌린 가발, 붙인 점이 세련의 정점. 남녀 모두 꾸몄다.', face: '연백분으로 새하얗게, 볼·입술에 또렷한 붉음, 얼굴에 검은 애교점(뮈슈)을 붙인다(위치마다 의미).', hair: '거대한 가발에 흰 가루를 뿌리고 리본·깃털·심지어 모형 배까지 얹기도.', adorn: '애교점, 보석 머리장식, 깃털.', scent: '목욕 대신 짙은 향수로 체취를 덮었다(향수 문화의 절정).', body: '목욕은 드물고 향수·분으로 가림.', vibe: '인공의 극치—사람인지 인형인지 모를, 살롱의 빛 속 존재.', caution: '“향수로 안 씻은 몸을 덮었다”는 통념은 과장이 섞였다. 다만 가발·분·애교점의 인공미는 이 시기의 분명한 특징.' },
      { name: '빅토리아 숙녀의 ‘은밀한’ 화장', aka: '창백함·꼬집은 볼·맨얼굴 미덕', era: '19세기', who: '중·상류 여성', ideal: '화장은 ‘부도덕’으로 여겨, 화장 안 한 듯 자연스러운 창백함과 건강한 홍조가 미덕.', face: '대놓고 화장하지 않고, 볼을 꼬집거나 입술을 깨물어 붉은 기를 내고, 쌀가루로 살짝 매트하게. 짙은 화장은 ‘무대 여성·매춘부’의 것으로 천시.', hair: '가운데 가르마로 단정히 빗어 뒤로 모음, 외출 시 보닛.', adorn: '카메오 브로치, 작은 진주, 머리망.', scent: '제비꽃·라벤더 같은 ‘정숙한’ 옅은 향.', body: '코르셋으로 잘록한 허리, 흰 피부 유지를 위해 양산·장갑.', vibe: '꾸미지 않은 척 공들인, 도덕의 코르셋까지 두른 숙녀.', caution: '“빅토리아 여성=짙은 화장”은 정반대다. 짙은 화장은 천시받았다. 화장한 숙녀를 그리려면 그 사회적 위험까지 담아야 한다.' },
      { name: '에드워디안·세기말의 머리', aka: '깁슨 걸·퐁파두르·부풀린 머리', era: '19세기 말~20세기 초', who: '상류·중산층 여성', ideal: '풍성하게 부풀려 올린 머리와 잘록한 허리의 ‘S라인’이 우아함의 표준(깁슨 걸).', face: '여전히 옅은 화장, 맑고 건강한 피부.', hair: '머리를 앞으로 부풀려 퐁파두르로 올리고 큰 모자를 얹는다.', adorn: '긴 모자핀, 진주, 레이스.', scent: '꽃향 오드코롱.', body: 'S라인 코르셋, 흰 장갑.', vibe: '부풀린 머리와 곡선으로 완성된, 세기 전환기의 우아한 여성.', caution: '부풀린 머리는 속에 ‘랫(rat)’이라는 받침을 넣어 만들었다. 자연 머리만으로 그 부피를 내긴 어렵다.' },
      { name: '1920년대 플래퍼의 화장 해방', aka: '보브 단발·붉은 큐피드 입술·짙은 눈', era: '1920년대', who: '도시 신여성', ideal: '대놓고 화장하는 것이 ‘해방’의 표현. 짧은 머리, 또렷한 입술과 눈이 새 시대의 미.', face: '파우더로 매트하게, 입술을 작은 활(큐피드 보) 모양으로 붉게, 눈에 짙은 콜·마스카라. 처음으로 ‘공공연한 화장’이 멋이 됨.', hair: '귀밑까지 자른 보브·이튼 크롭, 손가락 웨이브.', adorn: '클로슈 모자, 긴 진주, 깃털 머리띠.', scent: '현대적 합성 향수(이 시기 본격 등장).', body: '코르셋을 벗은 일자 실루엣, 그을린 피부가 처음으로 멋이 됨.', vibe: '화장과 단발로 자유를 선언한, 재즈 시대의 아이콘.', caution: '대놓고 한 화장·짧은 머리는 1920년대의 급변. 그 직전(은밀한 화장·긴 머리 시대)과 섞으면 단 10년의 단절이 사라진다.' },
      { name: '노동 여성의 단장', aka: '실용 머리·맨얼굴·거친 손', era: '산업화 시대', who: '공장·가사 노동 여성', ideal: '꾸밀 시간도 돈도 없어, 단정히 묶은 머리와 깨끗함이 단장. 일요일·외출에만 멋을.', face: '평소 맨얼굴, 외출 때 분·립밤 정도.', hair: '일에 방해 안 되게 단단히 묶거나 두건·캡으로 가린다.', adorn: '값싼 핀, 외출용 작은 브로치.', scent: '비누·땀·기계 기름의 냄새.', body: '기름·세제에 거칠어진 손, 짧은 손톱.', vibe: '단정함으로 자존을 지키는, 고단하지만 흐트러지지 않는 사람.', caution: '같은 시대라도 계급차가 크다. 숙녀의 정교한 머리와 같은 화면에 두면 그 대비 자체가 강한 묘사가 된다.' },
    ],
  },
  {
    key: 'face', label: '화장·피부·얼굴', icon: '💋',
    note: '얼굴을 어떻게 가꾸는가의 ‘재료와 기법’ 사전. 같은 인물도 무엇으로 어디를 칠했는가에 따라 신분·성격·시대가 달라진다.',
    items: [
      { name: '흰 피부 만들기', aka: '백분·연백분·쌀가루', who: '거의 모든 문화의 상류층', ideal: '햇볕에 그을지 않은 흰 피부=노동하지 않는 고귀함. 동서고금 공통의 미적 욕망.', face: '쌀가루·분꽃씨(동아시아), 납 성분 연백분(서양·일부 동아시아)으로 얼굴을 희게. 연백분은 독성이 강했다.', vibe: '“희다”는 곧 “일하지 않는다”—피부색이 계급을 말한다.', caution: '연백분은 납중독으로 피부를 망치고 목숨까지 위협했다. 흰 피부의 대가를 서사에 녹이면 깊이가 산다.' },
      { name: '붉은 빛—볼과 입술', aka: '연지·홍장·루주·꼬집기', who: '여성(문화 폭넓음)', ideal: '핏기 도는 볼과 붉은 입술이 ‘젊음과 생기’. 다만 짙기의 허용은 시대·신분마다 달랐다.', face: '홍화·주사 등으로 만든 붉은 안료(연지)를 볼·입술에 옅게(반가·빅토리아) 또는 짙게(당·기녀·플래퍼). 화장을 금기시한 시대엔 볼을 꼬집어 냈다.', vibe: '붉음의 ‘짙기’가 곧 그 사회가 허용한 욕망의 크기.', caution: '같은 연지라도 옅으면 정숙, 짙으면 천함/해방으로 읽혔다. 시대 맥락 없이 칠하면 신호가 어긋난다.' },
      { name: '눈과 눈썹', aka: '콜·미묵·마유즈쿠리·뽑기', who: '문화별 다양', ideal: '눈매와 눈썹의 모양이 미의 큰 변수. 가늘고 길게(동아시아), 크게 둘러(이집트), 밀고 다시 그리기(헤이안)까지.', face: '검댕·안티몬(콜)으로 눈을 둘러 그리거나, 미묵으로 눈썹을 가늘게, 혹은 눈썹을 아예 밀고 이마에 점 눈썹을 그린다(헤이안).', vibe: '눈썹 한 줄의 모양만으로 시대와 문화가 단번에 읽힌다.', caution: '눈썹 양식은 시대 고증의 ‘리트머스’. 헤이안의 점 눈썹을 다른 시대에 옮기면 즉시 어긋난다.' },
      { name: '얼굴의 점·문양', aka: '화전·애교점·곤지·면엽', who: '특정 시대·의례', ideal: '얼굴에 더하는 인공의 점·꽃이 멋이거나 의미. 이마의 곤지(혼례), 화전(당), 애교점(바로크).', face: '꽃모양 장식을 이마·미간에 붙이거나(화전), 검은 점을 붙이고(애교점·위치마다 의미), 붉은 점을 찍는다(곤지).', vibe: '얼굴 위 작은 한 점이 의례·신분·유행의 메시지를 싣는다.', caution: '점·문양은 강한 시대·의례 표지. 곤지를 일상에, 애교점을 동아시아에 옮기는 식의 혼용은 큰 오류.' },
      { name: '치아의 미학', aka: '오하구로·흰 이', who: '문화별 상반', ideal: '문화마다 정반대—일본·동남아 일부는 검게 물들인 이(오하구로)가 격식·기혼의 미, 근현대 서양은 흰 이가 미.', face: '철·식초 등으로 이를 검게 물들이거나(오하구로), 반대로 희게 관리.', vibe: '입을 벌렸을 때의 이 색 하나로 문화와 시대가 갈린다.', caution: '검은 이를 ‘불결·괴이’로 그리지 말 것. 해당 문화에선 정성껏 가꾼 격식의 미였다.' },
      { name: '향유와 윤기', aka: '향유·기름·보습', who: '건조·햇볕 환경의 사람들', ideal: '윤기 나는 피부가 건강과 풍요의 표지. 향유는 보습이자 향이자 의례.', face: '몰약·올리브·동백 등 기름을 피부·머리에 발라 윤기와 보호를.', vibe: '빛을 머금은 피부와 은은한 향이 ‘잘 가꾼 사람’의 신호.', caution: '향유는 사치품이자 생활필수였다(건조 기후). 단순 ‘화장’으로만 보면 그 실용성을 놓친다.' },
    ],
  },
  {
    key: 'hair', label: '머리·결발·관모', icon: '💇',
    note: '머리를 자르고 묶고 얹고 가리는 방식의 사전. 머리는 ‘가장 눈에 띄는 신분·혼인·연령의 신호’다.',
    items: [
      { name: '땋고 묶고 얹기', aka: '땋음·쪽·결발·트레머리', who: '여성(문화 폭넓음)', ideal: '풍성하고 정교한 머리가 곧 부와 정성. 묶는 방식이 혼인·연령을 드러낸다.', hair: '머리를 땋아 늘이거나(미혼·유목), 틀어 올려 쪽을 짓거나(기혼·동아시아), 가체로 부풀린다(상류).', vibe: '머리 모양 하나로 ‘처녀인가 아낙인가’가 단번에 읽힌다.', caution: '땋은 머리=미혼, 쪽=기혼 같은 신호는 문화마다 다르다. 한 규칙을 모든 세계에 적용하지 말 것.' },
      { name: '머리 장식', aka: '비녀·간자시·보요·떨잠·머리핀', who: '상류·예장', ideal: '머리에 꽂고 흔들리는 장식이 신분과 격을 빛낸다. 재료(금·옥·산호)가 곧 위계.', adorn: '비녀·뒤꽂이(한국), 간자시(일본), 보요(중국), 보석 머리망(서양).', hair: '쪽·결발·가체를 장식으로 마무리.', vibe: '걸음마다 미세히 흔들리며 빛을 부수는 정중동(靜中動)의 우아함.', caution: '장식 재료가 신분의 표지. 평민에게 금·옥 머리장식을 꽂으면 어긋난다.' },
      { name: '머리를 가리다', aka: '베일·두건·코이프·머릿수건·쓰개', who: '여성(정숙 규범)', ideal: '많은 문화에서 머리를 가리는 것이 정숙·기혼·격식의 표지. 드러냄은 미혼·잔치·특별한 의미.', hair: '베일(중세·신전), 코이프·두건(서민), 쓰개치마·머릿수건(한국), 보닛(근대)으로 머리를 덮는다.', vibe: '무엇을, 얼마나 가리는가가 그 시대의 ‘몸에 대한 규범’을 말한다.', caution: '가림의 관습을 현대 감각으로 함부로 벗기면 시대·문화감이 깨진다. 맨머리가 강한 ‘일탈 신호’일 수 있다.' },
      { name: '남성의 머리와 수염', aka: '상투·변발·삭발·가발·구레나룻', who: '남성(시대별)', ideal: '머리·수염의 정돈이 곧 자기관리와 소속. 강제된 양식(변발)도, 종교적 삭발(톤슈어)도 있다.', hair: '상투(동아시아), 변발(청), 삭발(수도자), 가루 가발(바로크), 단정한 구레나룻(빅토리아).', body: '수염을 기르거나 깎고, 빗질로 정돈.', vibe: '머리·수염 한 줄로 시대·신분·신념이 읽히는 남성.', caution: '머리 양식은 강한 시대 표지(변발=청, 톤슈어=수도자). 시대·신분을 건너뛰면 즉시 어긋난다.' },
      { name: '자르고 미는 머리', aka: '단발·보브·삭발·제모', who: '특정 시대·신분', ideal: '머리를 짧게 자르거나 미는 것이 해방(20년대 단발)·신앙(삭발)·규율(군·죄수)의 강한 메시지.', hair: '보브 단발(해방), 삭발(수도·형벌), 짧게 깎은 군인 머리(규율).', vibe: '짧은 머리가 ‘무엇으로부터의 단절’인지가 곧 서사.', caution: '짧은 머리의 의미는 맥락이 전부다. 같은 단발이 해방일 수도, 형벌일 수도 있다. 맥락 없이 쓰면 메시지가 사라진다.' },
    ],
  },
  {
    key: 'adorn', label: '장신구·치레', icon: '💍',
    note: '몸에 거는 모든 치레의 사전. 귀·목·손·허리의 작은 장식이 부·약속·소속·신앙을 말없이 드러낸다.',
    items: [
      { name: '귀·목·가슴의 장신', aka: '귀고리·목걸이·펜던트·브로치', who: '문화 폭넓음', ideal: '얼굴 가까이서 빛나는 장신이 부와 취향의 표지. 재료와 세공이 곧 위계.', adorn: '귀고리, 목걸이, 십자가·부적 펜던트, 카메오 브로치.', vibe: '목과 가슴에서 빛나는 작은 신호—부·신앙·가문을 말없이 드러낸다.', caution: '인장·가문 보석은 ‘소속’을 뜻한다. 출신을 드러내는 단서로 쓰면 서사가 깊어진다.' },
      { name: '손의 치레', aka: '반지·가락지·긴 손톱·골무·매니큐어', who: '여성·귀족', ideal: '곱게 가꾼 손과 반지가 ‘노동하지 않음’과 부의 표지. 긴 손톱은 그 극단.', adorn: '약혼·결혼반지, 인장반지, 청대 긴 손톱 보호 골무, 봉선화 물들임·매니큐어.', body: '손을 희고 곱게 가꾸고, 손톱을 길러 보호하거나 물들인다.', vibe: '손끝까지 가꾼 손이 ‘이 손은 일하지 않는다’를 증언한다.', caution: '긴 손톱·고운 손은 강한 계급 신호. 노동하는 인물에게 입히면 즉시 모순이 된다.' },
      { name: '허리·발의 장식', aka: '허리띠 장식·발찌·신코 장식', who: '문화별', ideal: '눈에 덜 띄는 곳의 치레가 오히려 은밀한 멋. 허리띠 장식, 발찌, 화려한 신.', adorn: '옥대·노리개(허리), 발찌, 굽 높은 화분저·게다·비단신.', vibe: '시선이 덜 닿는 곳까지 가꾼 일관성이 진짜 ‘가꿈’을 완성한다.', caution: '발을 잊은 묘사가 흔하다. 비단옷에 맨발·짚신을 신기면 강한 반전 단서가 될 수도 있다.' },
      { name: '향을 지니다', aka: '향낭·향갑·포만데르·향유병', who: '상류층', ideal: '몸에서 은은히 풍기는 향이 청결·고귀함의 표지(목욕이 드물던 시대엔 더욱).', adorn: '향낭·향갑(동아시아), 향을 넣은 포만데르 목걸이(중세 서양).', scent: '몸에 지닌 향료가 걸음마다 자취를 남긴다.', vibe: '지나간 자리에 향이 남는—존재 자체가 ‘기억되는’ 사람.', caution: '향은 사치이자 ‘악취·역병을 막는다’ 믿음의 실용이기도 했다. 단순 멋으로만 보면 맥락을 놓친다.' },
      { name: '의미를 새긴 표지', aka: '문신·낙인·성표·계급장', who: '특정 집단', ideal: '몸에 새긴 표지가 소속·통과의례·형벌·신앙을 영구히 증언한다.', body: '부족·통과의례의 문신, 형벌의 낙인, 종교적 표식, 직역의 휘장.', vibe: '지울 수 없는 한 표지가 그 사람의 과거 전체를 짊어진다.', caution: '문신·낙인은 문화마다 의미가 정반대(영예 vs 치욕). 함부로 ‘야만’으로 그리지 말 것.' },
    ],
  },
  {
    key: 'scent', label: '향·청결·몸단장', icon: '🌿',
    note: '냄새와 청결, 몸을 다듬는 관습의 사전. 보이지 않지만 인물의 계층·환경·시대를 가장 솔직하게 드러내는 감각.',
    items: [
      { name: '목욕과 청결', aka: '목욕재계·증기탕·드문 목욕', who: '문화·시대별 격차', ideal: '청결의 기준이 시대마다 천차만별. 자주 씻는 문화(로마 목욕탕·동아시아)와 드물게 씻던 시대(중세 일부 서양)가 갈린다.', body: '대중목욕탕(로마·이슬람·일본), 목욕재계(의례), 혹은 향수로 대신(일부 근세 서양).', vibe: '씻는 빈도와 방식이 그 인물의 환경과 위생관을 드러낸다.', caution: '“옛날 사람은 다 안 씻었다”는 과장이다. 로마·이슬람·동아시아엔 풍부한 목욕 문화가 있었다. 시대·문화를 뭉뚱그리지 말 것.' },
      { name: '향료와 향수', aka: '향유·훈향·오드코롱·합성향수', who: '상류층 → 점차 대중', ideal: '좋은 향이 곧 고귀함·청결의 표지. 천연 향유·훈향에서 근대 합성 향수로 발전.', scent: '몰약·유향·백단·사향(고대~중세), 장미·라벤더(근세), 합성 향수(근대).', vibe: '몸에 밴 향의 종류가 그 사람의 시대·계층·취향을 드러낸다.', caution: '합성 향수는 근대의 산물. 고대·중세 인물에게 현대적 향수를 입히면 시대착오다.' },
      { name: '체취와 환경의 냄새', aka: '땀·연기·흙·향', who: '모든 계층', ideal: '꾸밈과 무관하게, 몸과 옷에 밴 냄새가 가장 정직한 계층·직업의 단서.', body: '대장간의 쇠·불내, 부엌의 음식내, 들일의 흙내, 귀족의 향유내.', scent: '향으로 덮은 냄새와 덮지 못한 냄새의 틈.', vibe: '“그에게선 ~ 냄새가 났다”—후각 묘사 한 줄이 시각 열 줄을 이긴다.', caution: '냄새 묘사는 강력하나 자칫 인물을 비하할 수 있다. 직업·환경의 결로 다루되 멸시로 흐르지 않게.' },
      { name: '제모와 체모 관리', aka: '제모·수염·눈썹·체모', who: '문화별 상반', ideal: '체모를 두고 미의 기준이 정반대—제모를 즐긴 문화(이집트·로마)와 수염을 권위로 여긴 문화가 공존.', body: '면도·족집게·설탕왁스로 제모(이집트·로마), 혹은 수염을 길러 위엄을 표함.', vibe: '체모의 유무·길이가 그 문화의 미와 권위 관념을 드러낸다.', caution: '제모/수염 선호는 문화·시대마다 다르다. 현대 기준을 과거에 투사하면 어긋난다.' },
      { name: '손발톱과 끝단장', aka: '손톱·발톱·봉선화·매니큐어·골무', who: '여성·상류층', ideal: '손발끝까지 가꾼 일관성이 ‘진짜 가꿈’의 완성. 물들이거나 길러 보호한다.', body: '봉선화로 손톱을 물들이고(동아시아), 길러 골무로 보호하며(청), 근대엔 매니큐어.', vibe: '손끝의 색·길이가 그 사람의 신분과 생활을 작게 증언한다.', caution: '봉선화 물들임은 계절·민속의 결이 있다. 매니큐어 같은 근대 양식과 시대를 섞지 말 것.' },
    ],
  },
  {
    key: 'ideal', label: '미(美)의 기준', icon: '⚖️',
    note: '“무엇을 아름답다 여겼는가”의 사전. 미의 기준 자체가 시대·문화·계급의 산물이며, 인물의 욕망과 갈등의 뿌리가 된다.',
    items: [
      { name: '흰 피부 vs 그을린 피부', aka: '백옥 vs 구릿빛', who: '시대로 역전', ideal: '오래도록 흰 피부=노동 안 함=고귀함이었으나, 20세기 들어 그을린 피부=여가·건강으로 역전.', vibe: '같은 피부색이 한 시대엔 천함, 다른 시대엔 멋—기준의 역전 자체가 서사의 재료.', caution: '“태닝=세련”은 20세기 이후. 그 이전엔 정반대였다. 시대에 맞는 미의 방향을 확인하라.' },
      { name: '풍만함 vs 마름', aka: '풍요의 몸 vs 가는 몸', who: '시대·문화별', ideal: '먹을 게 귀하던 시대엔 풍만함=부·건강(당·바로크), 풍요의 시대엔 마름=절제·세련으로 기운다.', vibe: '몸의 부피에 대한 동경이 그 사회의 결핍과 풍요를 거꾸로 비춘다.', caution: '현대의 ‘마른 몸 선호’를 과거에 투사하면 어긋난다. 당·르네상스는 풍만함을 찬미했다.' },
      { name: '인공미 vs 자연미', aka: '꾸밈의 정점 vs 꾸미지 않은 듯', who: '시대로 진자운동', ideal: '인공의 극치를 미로 본 시대(바로크 가발·헤이안 점눈썹)와 자연스러움을 미로 본 시대(빅토리아 ‘안 한 듯’·현대 누드메이크업)가 번갈아.', vibe: '“얼마나 꾸몄나”와 “얼마나 안 꾸민 척하나”의 줄다리기가 곧 미의 역사.', caution: '“자연스러움”조차 공들인 인공인 경우가 많다(빅토리아). 안 꾸민 듯=안 꾸밈이 아니다.' },
      { name: '나이와 미', aka: '젊음 vs 원숙·백발의 권위', who: '문화별', ideal: '젊음을 미로 보는 시선과, 흰 수염·백발을 지혜·권위의 미로 보는 시선이 공존.', vibe: '주름과 백발을 ‘쇠함’으로 볼지 ‘격(格)’으로 볼지가 그 문화의 가치관을 드러낸다.', caution: '노년을 일률적으로 ‘추함’으로 그리지 말 것. 많은 문화가 원숙·백발을 권위의 미로 존중했다.' },
      { name: '가꿈에 대한 도덕', aka: '미덕 vs 죄·허영', who: '종교·시대별', ideal: '가꿈을 미덕으로 권한 시대(궁정·당)와 죄·허영으로 경계한 시대(중세 종교·빅토리아)가 있다.', vibe: '화장 한 번이 ‘자랑’일 수도 ‘타락’일 수도—그 위험이 곧 인물의 갈등.', caution: '“화장한 여성”의 의미는 시대마다 정반대. 도덕의 좌표를 무시하면 그 행동의 무게가 사라진다.' },
      { name: '미의 대가와 위험', aka: '연백분 중독·코르셋·전족·오하구로', who: '미를 좇은 사람들', ideal: '아름다움을 위해 몸을 해치는 관습들—납 분의 중독, 코르셋의 압박, 전족, 이를 검게 물들임.', body: '납중독·피부 손상(연백분), 갈비 변형(코르셋), 발 변형(전족).', vibe: '미의 추구가 곧 고통—‘아름다움의 그늘’이 인물에 깊이를 더한다.', caution: '이런 관습을 단순 ‘기괴’로 소비하지 말 것. 그 시대 여성의 선택과 강요, 욕망과 고통을 함께 그려야 한다.' },
    ],
  },
]

const LS = 'sry:tool:beauty-attire-ref:'
const ALL = '__all__'

type Flat = { cat: CatDef; item: Entry }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 항목 → 묘사 요소 묶음(필드 라벨 포함)
const FIELDS: { k: keyof Entry; label: string }[] = [
  { k: 'aka', label: '구성·이칭' },
  { k: 'era', label: '시대·배경' },
  { k: 'who', label: '계층·상황' },
  { k: 'ideal', label: '미의 기준' },
  { k: 'face', label: '화장·얼굴' },
  { k: 'hair', label: '머리·결발' },
  { k: 'adorn', label: '장신구·치레' },
  { k: 'scent', label: '향·향료' },
  { k: 'body', label: '몸단장·청결' },
  { k: 'vibe', label: '인상·분위기' },
  { k: 'caution', label: '고증·유의' },
]

function plainText(f: Flat): string {
  const lines = [`💄 ${f.item.name}  (${f.cat.label})`]
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
    `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.name)}</b></p>`,
    rows,
    `<p><i>※ 미용·치장 묘사 참고 자료(자작 요약). 시대·문화 고증은 작품 설정에 맞춰 각색해 쓰세요.</i></p>`,
  ].join('')
}

export default function BeautyAttireRef({ payload }: { payload?: Record<string, unknown> }) {
  // payload.era / payload.q 가 오면 초기 검색어로 활용(맥락 활용)
  const initialQuery = typeof payload?.q === 'string' ? (payload.q as string)
    : typeof payload?.era === 'string' ? (payload.era as string) : ''

  const [query, setQuery] = useState(initialQuery)
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
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ cat: c, item }) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (item.name.toLowerCase().includes(q)) return true
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
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  const toggleFav = (catKey: string, name: string) => {
    const k = favKey(catKey, name)
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
    if (!hasStash()) { flash('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'note', label: `미용·치장: ${f.item.name} (${f.cat.label})`, text: plainText(f) })
    flash(`수집함에 ‘${f.item.name}’ 묘사 요소를 담았습니다.`)
  }

  // 스니펫 라이브러리에 저장 — addToLibrary('snippets', ...)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: `[미용·치장 묘사] ${plainText(f)}`,
      source: '미용·치장 사전',
      tags: ['미용', '치장', '화장', '외양', '묘사', f.cat.label, f.item.name],
    })
    flash(`스니펫 라이브러리에 ‘${f.item.name}’ 묘사를 저장했습니다.`)
  }

  // 프로젝트 자료에 추가 — addToProject(...)
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '미용·치장 자료',
      title: `${f.item.name} (${f.cat.label})`,
      bodyHtml: bodyHtml(f),
      meta: { 분류: f.cat.label, 시대: f.item.era || '', 계층상황: f.item.who || '' },
    })
    if (id) flash(`프로젝트 자료 〈미용·치장 자료〉에 ‘${f.item.name}’을(를) 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderFields = (item: Entry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
      {FIELDS.filter((fd) => item[fd.k]).map((fd) => (
        <div key={fd.k} style={{ fontSize: 12.5, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 6 }}>{fd.label}</span>
          <span>{String(item[fd.k])}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={wrap}>
      {/* 자료 성격 안내 — 가장 위에 고정 */}
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
        borderRadius: 8, padding: '8px 11px', fontSize: 12, lineHeight: 1.55, color: 'var(--muted)',
      }}>
        <Emoji e="💄"/> <b style={{ color: 'var(--text)' }}>미용·치장 묘사 참고 자료</b>입니다. 시대·문화·계층별 화장·머리·장신구·향·몸단장
        관습과 ‘미의 기준’을 인물 외양·계층 묘사에 바로 쓰도록 자작 요약했습니다. 고증의 세부는 작품 설정에 맞춰 각색하세요.
      </div>

      <div style={hint}>
        한국·동아시아·서양 고대~근대·화장·머리·장신구·향·미의 기준 등 <b>{total}개</b> 항목을 카테고리로 정리했습니다.
        검색·펼침으로 찾고, 무작위로 영감을 얻고, 클릭해 복사하거나 수집함·스니펫·프로젝트로 보내세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·시대·계층·미의 기준으로 검색 (예: 조선, 백분, 가체, 향수, 흰 피부)"
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

      {/* 카테고리 안내 */}
      {cat !== ALL && (() => {
        const c = CATS.find((x) => x.key === cat)
        return c?.note ? (
          <div style={{ ...hint, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
            <Emoji e={c.icon}/> {c.note}
          </div>
        ) : null
      })()}

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 치장</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('period-clothing-ref', query ? { q: query } : undefined)}
          title="복식 사전 열기(의복과 함께 외양을 완성)" style={{ flex: '0 0 auto' }}>
          <Emoji e="👘"/> 복식 사전
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          {renderFields(random.item)}
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => toStash(random)} disabled={!hasStash()}
              title={hasStash() ? '이 묘사 요소를 수집함에 담기' : '수집함을 사용할 수 없습니다'}>
              <Emoji e="📎"/> 수집함
            </button>
            <button className="linkbtn" onClick={() => toProject(random)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 자료를 프로젝트 자료 〈미용·치장 자료〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} title="인물 시트 열기(치장을 외형 설정에 반영)"><Emoji e="🪪"/> 인물 시트</button>
            <button className="linkbtn" onClick={() => openToolLinked('period-clothing-ref')} title="복식 사전 열기(의복과 치장을 함께)"><Emoji e="👘"/> 복식 사전</button>
          </div>
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
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.name)
            const open = !!expanded[fk]
            const isFav = !!favs[fk]
            const preview = item.ideal || item.face || item.vibe || item.hair || ''
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <button onClick={() => toggleExpand(fk)} title={open ? '접기' : '펼치기'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, textAlign: 'left' }}>
                    {open ? '▾' : '▸'} {item.name}
                  </button>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, item.name)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!open && preview && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 5, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview}
                  </div>
                )}
                {open && renderFields(item)}
                {open && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => copy(plainText({ cat: c, item }), 'item:' + fk)}>
                      {copiedKey === 'item:' + fk ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                    </button>
                    <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫 저장</button>
                    <button className="linkbtn" onClick={() => toStash({ cat: c, item })} disabled={!hasStash()}
                      title={hasStash() ? '수집함에 담기' : '수집함을 사용할 수 없습니다'}>
                      <Emoji e="📎"/> 수집함
                    </button>
                    <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                      title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                      <Emoji e="📄"/> 프로젝트에 추가
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>얼굴과 머리, 향과 손끝은 인물의 ‘말 없는 이력서’입니다. 시대·계층·미의 기준의 논리에 맞춰 치장을 골라 인물을 그리세요.</div>
    </div>
  )
}
