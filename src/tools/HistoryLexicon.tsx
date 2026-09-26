// 사극 어휘·표현 사전 — 역사·사극 장르 특유의 호칭·궁중어·관직·제도·시대 명사·상투구·말투를
// 카테고리로 모은 로컬 사전. 카테고리 펼침 + 검색 + 무작위 + 클릭복사 + 스니펫 저장 + 프로젝트 연계.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 데이터).
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-lexicon', name: '사극 어휘·표현 사전', icon: '📜', group: '어휘·표현', genre: '역사·사극', intro: '호칭·궁중어·관직·제도·상소투·상투구까지 사극 특유의 말을 카테고리로 찾아 복사·저장', w: 600, h: 620 }

// ── 항목 ───────────────────────────────────────────────
interface Term {
  k: string          // 표제어(한국어)
  r?: string         // 한자/원어 병기
  d: string          // 뜻·쓰임(사극 문맥에서)
  ex?: string        // 예문(대사·문장)
}
interface Cat { key: string; label: string; icon: string; desc: string; items: Term[] }

// 역사·사극 장르에 특화된 자작 사전. 8개 카테고리, 합계 220+ 항목.
const CATS: Cat[] = [
  {
    key: 'address', label: '호칭·경칭', icon: '🙇', desc: '신분·관계에 따른 부름말. 잘못 쓰면 즉시 고증 붕괴.',
    items: [
      { k: '전하', r: '殿下', d: '왕(임금)을 직접 부르는 경칭. 조선은 제후국이라 ‘폐하’가 아닌 ‘전하’가 원칙.', ex: '“전하, 통촉하여 주시옵소서.”' },
      { k: '저하', r: '邸下', d: '왕세자를 부르는 경칭. 왕(전하)보다 한 단계 낮춘 호칭.', ex: '“저하께서 동궁에 드셨사옵니다.”' },
      { k: '폐하', r: '陛下', d: '황제를 부르는 호칭. 조선에선 원칙상 안 쓰며 대한제국기·중국 황제에만 적합.', ex: '“황제 폐하의 만수무강을 비옵니다.”' },
      { k: '마마', d: '왕실 웃어른 여성·세자 등에 붙이는 극존칭(대비마마·중전마마·세자마마).', ex: '“대비마마 납시오.”' },
      { k: '대비마마', r: '大妃', d: '선왕의 비(妃), 곧 임금의 어머니뻘. 수렴청정의 주체가 되기도.', ex: '“대비마마의 하교가 계셨사옵니다.”' },
      { k: '중전마마', r: '中殿', d: '왕비를 이르는 궁중 존칭. 내명부의 으뜸.', ex: '“중전마마, 후궁의 처신이 방자하옵니다.”' },
      { k: '대감', r: '大監', d: '정2품 이상 당상 고관을 부르는 존칭. 판서·정승급에 쓴다.', ex: '“이 판서 대감을 뵈러 왔소.”' },
      { k: '영감', r: '令監', d: '종2품·정3품 당상관을 부르는 존칭. 대감보다 한 급 아래.', ex: '“영감, 어인 행차시옵니까.”' },
      { k: '나리', d: '벼슬아치·양반을 아랫사람이 부르는 일반 경칭.', ex: '“나리, 소인을 살려 주십시오.”' },
      { k: '도련님', d: '양반가 결혼 전 아들을 종·아랫사람이 부르는 말.', ex: '“도련님, 사랑채에 손님이 드셨습니다.”' },
      { k: '아씨', d: '양반가 처녀·젊은 부인을 아랫사람이 부르는 말.', ex: '“아씨, 마님께서 찾으십니다.”' },
      { k: '대인', r: '大人', d: '지체 높은 어른·상대를 높여 부르는 말. 중원물·격식 있는 대화에 빈출.', ex: '“대인의 은혜를 잊지 않겠습니다.”' },
      { k: '소신', r: '小臣', d: '신하가 임금 앞에서 자신을 낮춰 이르는 말.', ex: '“소신, 죽음으로 아뢰옵니다.”' },
      { k: '신', r: '臣', d: '신하가 임금에게 자신을 이르는 일인칭.', ex: '“신을 믿어 주시옵소서.”' },
      { k: '소인', r: '小人', d: '신분 낮은 이가 윗사람 앞에서 자신을 낮추는 말.', ex: '“소인이 어찌 그런 일을….”' },
      { k: '쇤네', d: '종·하인이 주인 앞에서 자신을 극도로 낮춰 이르는 말.', ex: '“쇤네가 모시고 가겠습니다.”' },
      { k: '소첩', r: '小妾', d: '여인이 남편·임금 앞에서 자신을 낮춰 이르는 말.', ex: '“소첩의 죄를 물어 주옵소서.”' },
      { k: '과인', r: '寡人', d: '임금이 자신을 겸손히 이르는 일인칭(‘덕이 부족한 사람’).', ex: '“과인이 부덕한 탓이로다.”' },
      { k: '짐', r: '朕', d: '황제가 자신을 이르는 일인칭. 조선 왕은 원칙상 ‘과인’.', ex: '“짐의 뜻이 곧 하늘의 뜻이니라.”' },
      { k: '본궁', r: '本宮', d: '왕비·후궁 등 궁중 여인이 자신을 이르는 말.', ex: '“본궁이 직접 살펴보겠다.”' },
      { k: '자네', d: '윗사람이 아랫사람·동년배를 친근히 부르는 하대 어휘.', ex: '“자네는 어찌 생각하는가.”' },
      { k: '여봐라', d: '아랫사람을 불러 명령할 때 쓰는 호령조.', ex: '“여봐라, 저자를 당장 끌어내라!”' },
      { k: '이보게', d: '동년배·아랫사람을 부르는 정겨운 부름말.', ex: '“이보게, 잠시 들어 보게.”' },
      { k: '대군', r: '大君', d: '왕비 소생 왕자에게 붙이는 봉작. 군(君)보다 격이 높다.', ex: '“수양 대군이 입궐하셨습니다.”' },
      { k: '군', r: '君', d: '후궁 소생 왕자·공신에게 내리는 봉작.', ex: '“연잉군께 어명이 내렸다.”' },
      { k: '옹주·공주', d: '공주는 왕비 소생 딸, 옹주는 후궁 소생 딸. 적서의 구분이 호칭에 새겨짐.', ex: '“공주마마와 옹주께서 함께 드셨다.”' },
      { k: '부마', r: '駙馬', d: '임금의 사위. 공주·옹주와 혼인한 자.', ex: '“부마 도위께서 입시하셨사옵니다.”' },
    ],
  },
  {
    key: 'palace', label: '궁중 상용어·관용투', icon: '🏯', desc: '어전·내전에서 오가는 정형화된 말투. 사극 대사의 골격.',
    items: [
      { k: '통촉하여 주시옵소서', d: '사정을 깊이 헤아려 달라는 간청. 상소·간언의 정형구.', ex: '“부디 통촉하여 주시옵소서, 전하.”' },
      { k: '성은이 망극하옵니다', d: '임금의 은혜가 끝이 없어 아뢸 바를 모르겠다는 감읍의 말.', ex: '“성은이 망극하옵니다, 전하.”' },
      { k: '아니 되옵니다', d: '신하가 임금의 뜻에 단호히 반대할 때 쓰는 정형구.', ex: '“아니 되옵니다, 어찌 종묘사직을 그르치려 하시옵니까.”' },
      { k: '황공하옵니다', d: '두렵고 송구하다는 겸양의 말.', ex: '“황공하오나 신의 소견은 다르옵니다.”' },
      { k: '망극하옵니다', d: '은혜·슬픔이 한이 없음을 아뢰는 말(국상·하사 등).', ex: '“망극하옵니다, 차마 우러를 수 없사옵니다.”' },
      { k: '분부 거행하겠나이다', d: '명을 받들어 즉시 시행하겠다는 복명.', ex: '“분부 거행하겠나이다.”' },
      { k: '명을 받들겠사옵니다', d: '어명·하교에 순종하겠다는 답례.', ex: '“삼가 명을 받들겠사옵니다.”' },
      { k: '거두어 주시옵소서', d: '내린 명·노여움을 거두어 달라는 간청.', ex: '“노여움을 거두어 주시옵소서.”' },
      { k: '굽어살피소서', d: '높은 데서 낮은 사정을 살펴 달라는 청.', ex: '“부디 신의 충정을 굽어살피소서.”' },
      { k: '하문하시옵소서', d: '임금이 물어봐 달라는 말, 또는 물음을 청하는 표현.', ex: '“무엇이든 하문하시옵소서.”' },
      { k: '하교', r: '下敎', d: '임금이 내리는 가르침·명령.', ex: '“대비마마의 하교를 받자옵니다.”' },
      { k: '윤허', r: '允許', d: '임금이 청을 허락함. 상소의 클라이맥스에서 결정타.', ex: '“전하께서 마침내 윤허하셨다.”' },
      { k: '어명', r: '御命', d: '임금의 명령. 거역하면 곧 역모.', ex: '“어명이오! 모두 무릎을 꿇어라.”' },
      { k: '납시오', d: '왕·왕족이 거둥함을 알리는 외침.', ex: '“주상 전하 납시오!”' },
      { k: '거동·거둥', r: '擧動', d: '임금의 행차. 궐 밖 나들이는 능행·온행 등.', ex: '“상감의 거둥 길에 백성이 엎드렸다.”' },
      { k: '입시', r: '入侍', d: '신하가 임금 앞에 들어가 모심.', ex: '“승지가 편전에 입시하였다.”' },
      { k: '복명', r: '復命', d: '명을 수행하고 결과를 아뢰는 일.', ex: '“암행을 마치고 복명하옵니다.”' },
      { k: '주청·상주', r: '奏請', d: '임금에게 아뢰어 청함.', ex: '“대신들이 폐비를 거두라 주청하였다.”' },
      { k: '간언·간하다', r: '諫言', d: '임금의 잘못을 무릅쓰고 바른말로 고침.', ex: '“목숨을 걸고 간하옵니다.”' },
      { k: '면류관을 벗다', d: '왕위를 내려놓음·폐위의 상징적 표현.', ex: '“그날, 임금은 면류관을 벗어야 했다.”' },
      { k: '엎드려 아뢰옵니다', d: '부복(俯伏)한 채 올리는 정중한 아룀.', ex: '“엎드려 아뢰옵건대, 죄인을 국문하소서.”' },
      { k: '죽여 주시옵소서', d: '죄를 청하며 극단적으로 자책하는 정형구.', ex: '“소신을 죽여 주시옵소서!”' },
      { k: '아뢰옵기 황송하오나', d: '말 꺼내기 송구하나 감히 아뢴다는 서두.', ex: '“아뢰옵기 황송하오나, 세자께 변고가….”' },
      { k: '천세·천세·천천세', d: '왕세자·제후의 만수를 비는 외침(황제는 만세).', ex: '“천세! 천세! 천천세!”' },
      { k: '만세·만세·만만세', d: '황제의 만수를 비는 외침. 조선 왕에겐 ‘천세’가 격.', ex: '“황제 폐하 만세! 만세! 만만세!”' },
      { k: '수렴청정', r: '垂簾聽政', d: '어린 임금을 대신해 대비가 발을 드리우고 정사를 봄.', ex: '“대비마마의 수렴청정이 시작되었다.”' },
      { k: '환궁', r: '還宮', d: '임금·왕족이 궁으로 돌아옴.', ex: '“어가가 무사히 환궁하셨다.”' },
    ],
  },
  {
    key: 'office', label: '관직·관청', icon: '🏛️', desc: '권력의 좌표. 누가 어디 앉았는지가 곧 정치 구도.',
    items: [
      { k: '영의정', r: '領議政', d: '의정부 으뜸, 정1품. 백관의 수반(영상).', ex: '“영의정이 백관을 거느리고 입궐하였다.”' },
      { k: '좌의정·우의정', d: '의정부의 좌상·우상, 정1품. 삼정승의 일원.', ex: '“좌상과 우상의 뜻이 갈렸다.”' },
      { k: '판서', r: '判書', d: '육조(이·호·예·병·형·공)의 으뜸, 정2품.', ex: '“병조 판서가 군병을 점고하였다.”' },
      { k: '참판·참의', d: '판서의 보좌, 종2품·정3품. 육조의 차관급.', ex: '“이조 참판이 인사를 농단했다.”' },
      { k: '승지', r: '承旨', d: '승정원에서 왕명을 출납하는 비서. 도승지가 으뜸.', ex: '“도승지가 어찰을 받들고 나왔다.”' },
      { k: '사헌부', r: '司憲府', d: '관리의 비위를 규찰하고 탄핵하는 감찰 기관(대간).', ex: '“사헌부가 그를 탄핵하는 상소를 올렸다.”' },
      { k: '사간원', r: '司諫院', d: '임금에게 간쟁하고 정사의 잘못을 논하는 언관 기관.', ex: '“사간원의 간관들이 들고 일어났다.”' },
      { k: '홍문관', r: '弘文館', d: '경연을 맡고 문한을 관장하는 기관. 사헌부·사간원과 함께 삼사(三司).', ex: '“홍문관 부제학이 차자를 올렸다.”' },
      { k: '의금부', r: '義禁府', d: '왕명으로 중죄인을 추국하는 특별 사법 기관(금부).', ex: '“의금부에 하옥하고 친국하라.”' },
      { k: '관찰사', r: '觀察使', d: '한 도(道)를 다스리는 종2품 지방 장관(감사).', ex: '“팔도 관찰사에게 어명이 하달되었다.”' },
      { k: '현감·현령', d: '작은 고을(현)을 다스리는 수령. 사또·원님으로 불림.', ex: '“신임 현감이 부임해 왔다.”' },
      { k: '사또·원님', d: '고을 수령을 백성이 부르는 말.', ex: '“사또 행차시오, 길을 비켜라!”' },
      { k: '암행어사', r: '暗行御史', d: '왕이 비밀리에 파견해 지방을 감찰하는 특사. 마패가 신표.', ex: '“암행어사 출두요! 마패가 번쩍였다.”' },
      { k: '내관·환관', r: '宦官', d: '궁중에서 임금을 가까이 모시는 거세된 관원. 정보·권력의 통로.', ex: '“상선 내관이 어명을 전하였다.”' },
      { k: '상궁', r: '尙宮', d: '궁녀의 우두머리(정5품). 내명부 실무를 총괄.', ex: '“제조 상궁이 수라간을 다스렸다.”' },
      { k: '도승지', r: '都承旨', d: '승정원의 으뜸 승지(정3품). 왕의 최측근 비서.', ex: '“도승지가 밤새 어전을 지켰다.”' },
      { k: '대간', r: '臺諫', d: '사헌부·사간원의 관원을 아울러 이르는 말. 언론 삼사의 핵심.', ex: '“대간이 합사하여 처벌을 청하였다.”' },
      { k: '훈련도감', d: '임진왜란 후 설치된 중앙 군영. 포수·살수·사수의 삼수병.', ex: '“훈련도감의 군병이 도성을 지켰다.”' },
      { k: '포도청', d: '도성의 치안·도적 체포를 맡은 관청(좌·우 포도청).', ex: '“포도청 포교가 야경을 돌았다.”' },
      { k: '포졸·포교', d: '포도청 소속 군졸과 그 우두머리. 근대 ‘경찰’의 자리.', ex: '“포교가 포승을 들고 들이닥쳤다.”' },
      { k: '승정원', r: '承政院', d: '왕명의 출납을 맡은 비서 기관(은대).', ex: '“승정원에서 비망기를 받들었다.”' },
      { k: '비변사', r: '備邊司', d: '군국 기무를 총괄한 조선 후기 최고 합의 기관(비국).', ex: '“비변사 당상들이 머리를 맞댔다.”' },
      { k: '당상관·당하관', d: '정3품 통정대부 이상이 당상, 그 아래가 당하. 권력의 경계선.', ex: '“그는 마침내 당상관에 올랐다.”' },
      { k: '아전·이방', d: '지방 관아의 하급 실무 향리. 이·호·예·병·형·공방.', ex: '“이방이 장부를 들고 굽실거렸다.”' },
      { k: '내금위·금군', d: '임금을 호위하는 친위 군대.', ex: '“금군이 어가 둘레를 에워쌌다.”' },
      { k: '성균관', d: '나라의 최고 교육기관. 유생들이 공부하며 권당·공관으로 의사 표시.', ex: '“성균관 유생들이 권당에 들어갔다.”' },
    ],
  },
  {
    key: 'system', label: '제도·형벌·과거', icon: '⚖️', desc: '신분제와 형벌이 판돈을 키운다. 지면 가문이 멸한다.',
    items: [
      { k: '과거', r: '科擧', d: '관리를 뽑는 시험. 소과(생원·진사)·대과(문과)·무과·잡과.', ex: '“그는 약관에 과거에 급제하였다.”' },
      { k: '생원·진사', d: '소과 합격자. 생원은 경학, 진사는 문예로 뽑힘.', ex: '“진사 시험에 장원으로 뽑혔다.”' },
      { k: '장원·급제', d: '과거의 수석(장원)과 합격(급제). 출세의 첫 관문.', ex: '“삼일유가로 장원의 영예를 누렸다.”' },
      { k: '삭탈관직', d: '벼슬과 품계를 모두 빼앗음. 정치적 몰락의 첫 단계.', ex: '“삭탈관직하고 문외출송하라.”' },
      { k: '유배·정배', d: '죄인을 먼 곳으로 보내어 가두는 형벌.', ex: '“그는 제주로 정배되었다.”' },
      { k: '위리안치', r: '圍籬安置', d: '유배지에 가시 울타리를 둘러 출입을 막는 가혹한 유배.', ex: '“위리안치된 폐세자는 바깥을 볼 수 없었다.”' },
      { k: '국문·친국', d: '중죄인을 신문함. 임금이 직접 하면 친국(親鞫).', ex: '“임금이 친국으로 역도를 다스렸다.”' },
      { k: '사사', r: '賜死', d: '임금이 사약을 내려 죽게 함. 사대부의 ‘명예로운’ 처형.', ex: '“금부도사가 사약을 받들고 당도했다.”' },
      { k: '사약', d: '임금이 내리는 독약. 사사의 도구.', ex: '“사약 사발이 마루 위에 놓였다.”' },
      { k: '능지처참', d: '대역죄인을 산 채로 베어 죽이는 극형.', ex: '“역괴를 능지처참하여 효시하라.”' },
      { k: '효시·효수', d: '베어 죽인 머리를 장대에 매달아 본보기로 삼음.', ex: '“역적의 수급이 저잣거리에 효수되었다.”' },
      { k: '연좌·삼족을 멸하다', d: '죄인의 가족·친족까지 함께 벌함. 패배의 비용을 가문 단위로 키운다.', ex: '“역모가 드러나면 삼족이 멸한다.”' },
      { k: '곤장·태형', d: '볼기를 치는 형벌. 곤장은 큰 매, 태형은 가벼운 매.', ex: '“곤장 마흔 대에 살이 터졌다.”' },
      { k: '주리를 틀다', d: '두 다리 사이에 막대를 끼워 비트는 고문.', ex: '“불지 않으면 주리를 틀어라.”' },
      { k: '호패', r: '號牌', d: '16세 이상 남자가 차던 신분 증명패. 근대 ‘신분증’의 자리.', ex: '“성문에서 호패를 검사하였다.”' },
      { k: '공명첩', r: '空名帖', d: '이름 칸이 빈 관직 임명장. 곡식·돈으로 신분을 사는 통로.', ex: '“흉년에 공명첩이 남발되었다.”' },
      { k: '적서차별', d: '본처 소생(적자)과 첩 소생(서자)을 차별하는 제도. 인물의 족쇄.', ex: '“서자라는 까닭에 벼슬길이 막혔다.”' },
      { k: '반상의 구별', d: '양반과 상민의 엄격한 신분 구분. 행동마다 걸리는 제약.', ex: '“반상의 법도가 지엄하거늘.”' },
      { k: '노비·노복', d: '매매·세습되던 천민 신분. 공노비·사노비.', ex: '“속량 문서를 받아 노비에서 풀려났다.”' },
      { k: '환곡', r: '還穀', d: '봄에 곡식을 꾸어 주고 가을에 받던 진휼·조세 제도. 수탈의 온상.', ex: '“환곡의 폐단으로 백성이 굶주렸다.”' },
      { k: '공납·진상', d: '지방 특산물을 나라·궁중에 바치던 제도.', ex: '“진상품을 실은 짐바리가 한양으로 올랐다.”' },
      { k: '대동법', d: '공납을 쌀(대동미)로 통일해 거둔 조세 개혁. 개혁물의 단골 소재.', ex: '“대동법을 팔도에 확대하자 백성이 한숨 돌렸다.”' },
      { k: '상평통보', d: '조선 후기 널리 쓰인 엽전. 인조 이후 정착(시대 고증 주의).', ex: '“상평통보 한 꿰미를 객주에 맡겼다.”' },
      { k: '문외출송', d: '죄인을 도성 밖으로 내쫓는 처벌.', ex: '“관작을 거두고 문외출송하라.”' },
      { k: '추쇄·속량', d: '도망 노비를 잡아들임(추쇄)과 몸값을 치러 면천함(속량).', ex: '“속량으로 면천하여 양인이 되었다.”' },
    ],
  },
  {
    key: 'object', label: '시대 명사·기물', icon: '📿', desc: '권력과 격식을 손에 쥐게 하는 사물. 종종 사건의 핵(MacGuffin).',
    items: [
      { k: '옥새·국새', r: '玉璽', d: '임금의 도장. 왕권 정통성의 상징. 위조·탈취가 곧 정변의 불씨.', ex: '“옥새를 거머쥔 자가 곧 임금이었다.”' },
      { k: '교지', r: '敎旨', d: '임금이 내리는 사령장·임명장.', ex: '“교지를 받들어 무릎을 꿇었다.”' },
      { k: '밀지', r: '密旨', d: '임금이 은밀히 내리는 명. 거사·숙청의 신호.', ex: '“품속의 밀지를 펴 보였다.”' },
      { k: '비망기', d: '임금이 명령·의견을 적어 승정원에 내리던 글.', ex: '“밤사이 비망기가 내렸다.”' },
      { k: '상소·상소문', r: '上疏', d: '신하·유생이 임금에게 올리는 글. 갈등을 ‘말의 전쟁’으로 만든다.', ex: '“만인소가 대궐 앞에 쌓였다.”' },
      { k: '장계', r: '狀啓', d: '지방 관원·장수가 임금에게 올리는 보고서. 정보 지연의 서스펜스.', ex: '“변방의 장계가 닷새 만에 닿았다.”' },
      { k: '간찰·서찰', d: '편지. 인물 간 밀약·정황을 드러내는 장치.', ex: '“불에 태우려던 간찰이 발각되었다.”' },
      { k: '파발·파발마', d: '급한 공문을 전하던 역참 전령. 소식의 속도를 좌우.', ex: '“파발이 흙먼지를 일으키며 내달렸다.”' },
      { k: '봉수·봉화', d: '낮엔 연기, 밤엔 불로 변고를 알리던 통신.', ex: '“변경의 봉수에 불이 올랐다.”' },
      { k: '마패', r: '馬牌', d: '역마 사용을 증명하는 패. 암행어사의 신표.', ex: '“마패를 높이 들자 좌중이 얼어붙었다.”' },
      { k: '곤룡포', r: '袞龍袍', d: '임금이 입던 정복. 가슴·어깨에 발톱 다섯의 용 보(補).', ex: '“곤룡포 자락이 옥좌를 덮었다.”' },
      { k: '익선관', r: '翼善冠', d: '임금이 곤룡포에 갖춰 쓰던 관.', ex: '“익선관을 바로 쓰고 편전에 나아갔다.”' },
      { k: '면류관', d: '제례 때 임금이 쓰던 구슬 발(旒)이 늘어진 관. 왕권의 상징.', ex: '“면류관 너머로 군신을 굽어보았다.”' },
      { k: '어진', r: '御眞', d: '임금의 초상화. 사진이 없던 시대의 ‘얼굴’.', ex: '“선왕의 어진을 진전에 봉안하였다.”' },
      { k: '어가·연', d: '임금이 타던 가마·수레.', ex: '“어가가 광화문을 나섰다.”' },
      { k: '갓·망건', d: '양반이 쓰던 모자와 머리를 동이던 그물 띠. 신분의 표지.', ex: '“갓을 고쳐 쓰고 의관을 정제했다.”' },
      { k: '곤장·형틀', d: '죄인을 다스리던 매와 형구.', ex: '“형틀에 묶인 채 곤장을 맞았다.”' },
      { k: '서안·연적', d: '글 읽는 책상(서안)과 먹물용 물그릇(연적). 선비의 방.', ex: '“서안 위에 붓을 내려놓았다.”' },
      { k: '족자·병풍', d: '글씨·그림을 표구한 족자와 가리개 병풍. 사대부가의 격.', ex: '“열 폭 병풍 뒤에 사람이 숨어 있었다.”' },
      { k: '환도·장검', d: '허리에 차던 군도. 무관·호위의 무기.', ex: '“환도 자루에 손이 갔다.”' },
      { k: '도포·두루마기', d: '사대부의 겉옷. 색·소재로 신분과 처지를 드러냄.', ex: '“흰 도포 자락이 바람에 날렸다.”' },
      { k: '족보·교첩', d: '가문의 계보(족보)와 하급 관원 임명 문서(교첩).', ex: '“위조된 족보로 양반 행세를 했다.”' },
      { k: '인장·낙관', d: '도장. 문서·서화의 진위를 가르는 표식.', ex: '“낙관 없는 서화는 가짜로 의심받았다.”' },
      { k: '비석·신도비', d: '공덕을 새겨 세운 돌. 죽은 뒤의 평판을 좌우.', ex: '“신도비에 새길 행장을 두고 다투었다.”' },
      { k: '부절·병부', d: '병권 발동의 증표로 둘로 나눠 맞추던 신표.', ex: '“병부를 맞추어 군사를 일으켰다.”' },
    ],
  },
  {
    key: 'politics', label: '정치·당쟁·역모', icon: '🗡️', desc: '왕권 대 신권, 당쟁과 반정. 갈등의 엔진.',
    items: [
      { k: '훈구·사림', d: '공신 기득권층(훈구)과 성리학 신진 세력(사림)의 대립. 사화의 배경.', ex: '“사림이 조정에 진출하자 훈구가 견제했다.”' },
      { k: '동인·서인', d: '선조 대 사림이 갈라진 붕당. 이후 남인·북인·노론·소론으로 분화.', ex: '“동인과 서인의 다툼이 조정을 갈랐다.”' },
      { k: '노론·소론', d: '서인에서 갈라진 후기 붕당. 환국 정치의 두 축.', ex: '“노론이 정국을 장악하였다.”' },
      { k: '남인·북인', d: '동인에서 갈라진 붕당. 정권의 부침을 거듭함.', ex: '“남인이 다시 등용되었다.”' },
      { k: '외척', r: '外戚', d: '왕비·후궁의 친정 일가. 권력 농단의 단골 악역.', ex: '“외척이 병권까지 거머쥐었다.”' },
      { k: '사화', r: '士禍', d: '사림이 정치적으로 화를 입은 사건(무오·갑자·기묘·을사사화).', ex: '“기묘사화로 조광조가 사사되었다.”' },
      { k: '반정', r: '反正', d: '신하들이 임금을 폐하고 새 임금을 세우는 정변(중종·인조반정).', ex: '“반정 세력이 새벽에 궁을 장악했다.”' },
      { k: '역모·모반', d: '임금·나라를 뒤엎으려는 음모. 발각되면 삼족이 멸한다.', ex: '“역모입니다, 전하! 저자를 잡으시옵소서.”' },
      { k: '환국', r: '換局', d: '집권 붕당이 한꺼번에 갈리는 급격한 정국 전환(숙종 대).', ex: '“하룻밤 새 환국으로 정승이 바뀌었다.”' },
      { k: '탕평', r: '蕩平', d: '붕당을 고루 등용해 균형을 꾀한 정책(영·정조).', ex: '“탕평으로 당색을 가리지 않고 인재를 썼다.”' },
      { k: '세자 책봉', d: '왕위 계승자를 공식 지정함. 권력 구도의 분수령.', ex: '“원자를 세자로 책봉하는 교서가 내렸다.”' },
      { k: '폐위·폐세자', d: '임금·세자의 자리를 박탈함.', ex: '“폐세자가 강화로 쫓겨났다.”' },
      { k: '간택·삼간택', d: '왕비·세자빈을 뽑던 절차. 동맹 재편의 장치.', ex: '“삼간택에서 그 댁 규수가 뽑혔다.”' },
      { k: '정략혼', d: '가문·세력의 이해로 맺는 혼인. 후궁·외척의 부상.', ex: '“정략혼으로 두 가문이 손을 잡았다.”' },
      { k: '척화·주화', d: '오랑캐와 싸우자(척화)와 화친하자(주화)의 대립(병자호란).', ex: '“척화파와 주화파가 남한산성에서 갈렸다.”' },
      { k: '거병·거사', d: '군사를 일으킴. 반정·역모의 결행.', ex: '“거사 날을 사흘 뒤로 정했다.”' },
      { k: '대의명분', d: '행동을 정당화하는 큰 도리. 명분 없는 거사는 역적.', ex: '“대의명분 없이 어찌 군사를 움직이랴.”' },
      { k: '역성혁명', d: '천명이 바뀌어 왕조 자체가 교체됨. 근대 ‘혁명’과 구분.', ex: '“역성혁명으로 새 왕조가 섰다.”' },
      { k: '훈신·공신', d: '나라에 공을 세워 봉작·전토를 받은 신하. 기득권의 뿌리.', ex: '“정난공신들이 권세를 휘둘렀다.”' },
      { k: '탄핵·논핵', d: '대간이 관원의 죄를 들어 파직을 청함.', ex: '“대간이 영상을 탄핵하는 차자를 올렸다.”' },
      { k: '합사·복합', d: '여러 신하가 함께 엎드려 거듭 청함(농성식 간쟁).', ex: '“삼사가 합사하여 처벌을 청했다.”' },
      { k: '예송논쟁', d: '상복을 몇 년 입느냐를 둘러싼 예학 정쟁(현종 대). 명분 싸움의 정수.', ex: '“기년이냐 삼년이냐로 조정이 쪼개졌다.”' },
      { k: '수렴·환정', d: '대비의 수렴청정과 임금에게 정권을 돌려줌(환정).', ex: '“임금이 장성하자 환정이 이루어졌다.”' },
      { k: '능상·불경', d: '윗전을 능멸함. 죄목을 씌우는 단골 빌미.', ex: '“그 말이 능상의 죄로 몰렸다.”' },
    ],
  },
  {
    key: 'life', label: '생활·공간·시간', icon: '🏘️', desc: '시대의 공기. 의식주·달력·공간이 ‘그 시대처럼’ 느껴지게.',
    items: [
      { k: '저잣거리·장시', d: '시장과 거리. 민심·소문·보부상이 오가는 무대.', ex: '“저잣거리에 방이 나붙자 사람이 몰렸다.”' },
      { k: '주막·객주·여각', d: '나그네가 묵고 먹던 곳(주막)과 상품 중개·숙박을 맡던 객주·여각.', ex: '“주막 봉놋방에서 하룻밤을 청했다.”' },
      { k: '보부상', d: '봇짐·등짐을 지고 장을 떠돌던 행상. 정보망 역할.', ex: '“보부상 편에 서찰을 부쳤다.”' },
      { k: '사랑채·안채', d: '바깥주인의 거처(사랑채)와 안주인·여인의 공간(안채). 내외의 구분.', ex: '“사랑채에 손님이 들자 안채는 조용해졌다.”' },
      { k: '동궁·세자궁', d: '왕세자가 거처하던 궁. 차기 권력의 거점.', ex: '“동궁에 드는 발길이 잦아졌다.”' },
      { k: '편전·정전·내전', d: '임금의 집무실(편전)·의식 공간(정전)·생활 공간(내전).', ex: '“편전에서 비밀히 대신을 불렀다.”' },
      { k: '경연', r: '經筵', d: '임금과 신하가 경서를 강론하던 자리. 정치 토론의 장.', ex: '“경연에서 임금의 실정을 에둘러 간했다.”' },
      { k: '수라·수라간', d: '임금의 식사(수라)와 그 부엌(수라간).', ex: '“수라에 손을 댄 자를 색출하라.”' },
      { k: '한양 도성·사대문', d: '도읍을 두른 성과 그 큰 문(흥인지문·숭례문 등). 통금의 경계.', ex: '“파루가 울리고서야 사대문이 열렸다.”' },
      { k: '관아·동헌', d: '지방 관청과 수령이 정무를 보던 마루.', ex: '“동헌 뜰에 죄인이 끌려 나왔다.”' },
      { k: '향교·서당', d: '지방 관학(향교)과 마을 글방(서당). 근대 ‘학교’의 자리.', ex: '“서당 훈장 앞에 학동들이 줄지어 앉았다.”' },
      { k: '시진·자시·인시', d: '하루를 열둘로 나눈 시각(자시=밤 11~1시 등). 근대 ‘분·초’와 구분.', ex: '“삼경 자시에 그림자가 담을 넘었다.”' },
      { k: '경·삼경', d: '밤을 다섯으로 나눈 시간(초경~오경). 삼경은 한밤중.', ex: '“삼경이 깊도록 등불이 꺼지지 않았다.”' },
      { k: '인정·파루', d: '밤 통금 시작을 알리는 종(인정)과 새벽 해제를 알리는 종(파루).', ex: '“인정 종이 울리자 거리가 텅 비었다.”' },
      { k: '절기·간지', d: '입춘·동지 등 절기와 갑자·을축 등 60갑자로 헤아린 해·날.', ex: '“임진년 사월, 왜선이 부산 앞바다에 나타났다.”' },
      { k: '봉놋방·길손', d: '주막의 여럿이 묵는 큰 방과 나그네.', ex: '“봉놋방에서 낯선 길손과 술잔을 나눴다.”' },
      { k: '향청·유향소', d: '지방 양반들이 수령을 보좌·견제하던 자치 기구.', ex: '“향청에서 좌수를 새로 뽑았다.”' },
      { k: '진·진영', d: '변방을 지키는 군사 거점.', ex: '“변방의 진에서 봉화가 올랐다.”' },
      { k: '사신·통신사', d: '명·청에 보낸 사신과 일본에 보낸 통신사. 대외관계의 통로.', ex: '“연행 사신이 책문을 넘었다.”' },
      { k: '조공·책봉', d: '제후국이 천자국에 예물을 바치고(조공) 책봉을 받는 사대 관계.', ex: '“해마다 조공 사절이 연경으로 향했다.”' },
      { k: '능행·온행', d: '임금이 능에 참배하러 가는 행차(능행)와 온천 행차(온행).', ex: '“능행 길에 백성의 상언을 받았다.”' },
      { k: '제사·향사·종묘', d: '조상·역대 왕에 올리는 제사와 왕실 사당(종묘). 효와 정통의 표현.', ex: '“종묘에 고하고 새 임금이 즉위하였다.”' },
      { k: '서원·사액', d: '사림의 사설 교육·제향 기관(서원)과 나라가 현판을 내림(사액).', ex: '“사액 서원이 향촌의 여론을 좌우했다.”' },
    ],
  },
  {
    key: 'cliche', label: '상투구·클리셰', icon: '🎭', desc: '익숙해서 강력한, 그러나 비틀어 써야 살아나는 정형 표현.',
    items: [
      { k: '역모입니다, 전하!', d: '음모를 고변하는 단골 대사. 긴장의 스위치.', ex: '“역모입니다, 전하! 당장 금부를 부르소서.”' },
      { k: '저자의 목을 쳐라!', d: '분노한 권력자의 처형 명령 클리셰.', ex: '“여봐라, 당장 저자의 목을 쳐라!”' },
      { k: '신을 믿어 주시옵소서', d: '충정을 호소하는 정형구.', ex: '“부디 이 한 몸을, 신을 믿어 주시옵소서.”' },
      { k: '여기가… 조선?', d: '회귀·빙의물 직후의 인식 클리셰.', ex: '“눈을 떠 보니 — 여기가… 조선이라고?”' },
      { k: '이 몸의 기억이 흘러든다', d: '빙의한 인물의 기억이 떠오르는 정형 묘사.', ex: '“낯선 이름들이, 이 몸의 기억이 흘러들었다.”' },
      { k: '이미 모든 것이 끝난 뒤였다', d: '비극을 예고하는 회한조 마무리. 드라마틱 아이러니.', ex: '“그가 진실을 알았을 때, 이미 모든 것이 끝난 뒤였다.”' },
      { k: '하늘이 무심하구나', d: '운명·시대 앞의 무력감을 토로하는 한탄.', ex: '“충신을 이리 버리시니, 하늘이 무심하구나.”' },
      { k: '대의를 위해서다', d: '비정한 선택을 정당화하는 명분 클리셰.', ex: '“미안하네. 허나 이 또한 대의를 위해서네.”' },
      { k: '미래지식 한 방(비누·고추장·화약)', d: '회귀물의 사이다 클리셰. 발명품 하나로 부와 신임을 얻음. ‘구현 제약’으로 비틀 것.', ex: '“증류주 한 동이에 대감의 눈빛이 달라졌다.”' },
      { k: '요녀형 후궁', d: '왕을 홀려 정사를 그르치는 악역 후궁 클리셰.', ex: '“그 여인의 미소 한 번에 조정이 흔들렸다.”' },
      { k: '간신·권신의 음흉한 미소', d: '권력을 농단하는 악역의 전형.', ex: '“대감의 입가에 음흉한 미소가 번졌다.”' },
      { k: '숨겨진 출생의 비밀', d: '주인공이 실은 왕족·명문 후손이라는 반전 클리셰.', ex: '“네가… 폐세자의 핏줄이란 말이냐.”' },
      { k: '충신은 두 임금을 섬기지 않는다', d: '절의를 내세우는 정형 명분.', ex: '“충신불사이군이라 했거늘, 어찌 무릎을 꿇으리오.”' },
      { k: '백성이 곧 하늘이다', d: '민본을 내세운 개혁 군주·주인공의 단골 명제.', ex: '“백성이 굶거늘, 어찌 임금이라 하겠는가.”' },
      { k: '피를 토하는 심정으로 아뢰옵니다', d: '간절함을 극대화한 상소투.', ex: '“피를 토하는 심정으로 아뢰옵니다, 전하.”' },
      { k: '목숨을 걸고 직언하다', d: '죽음을 무릅쓴 간언으로 양심을 증명.', ex: '“목을 내놓고 직언하옵니다.”' },
      { k: '와신상담', d: '치욕을 견디며 복수를 벼름.', ex: '“그날의 치욕을 와신상담으로 새겼다.”' },
      { k: '풍전등화의 사직', d: '나라가 바람 앞 등불처럼 위태로움.', ex: '“사직이 풍전등화이거늘 무얼 다투는가.”' },
      { k: '천추의 한을 남기다', d: '오래도록 잊히지 않을 깊은 원한·회한.', ex: '“충신을 잃은 것이 천추의 한이 되었다.”' },
      { k: '대세는 기울었다', d: '정변·전세의 승패가 갈렸음을 알리는 표현.', ex: '“대세는 이미 기운 뒤였다.”' },
      { k: '오랑캐의 발굽 아래', d: '외침의 참상을 그리는 정형구.', ex: '“도성이 오랑캐의 발굽 아래 짓밟혔다.”' },
      { k: '명분과 실리 사이에서', d: '대의와 현실의 갈등을 요약하는 표현.', ex: '“명분과 실리 사이에서 그는 오래 망설였다.”' },
    ],
  },
]

const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
const LS = 'sry:tool:history-lexicon:'
const ALL = '__all__'

// 사전형 도구지만 "조합 표현"도 만들 수 있어 조합수를 함께 안내한다.
// 상소투 한 줄을 6개 독립 슬롯으로 조합:
//   서두(OPEN) · 대상명사(SUBJ) · 청(VERB) · 정황(DESC) · 호소(APPEAL) · 맺음(TONE)
// 문장 틀:  “{OPEN}. {SUBJ}{을/를} {VERB}. {DESC}, {APPEAL} {TONE}.”
//  - SUBJ 는 명사구(목적어) — 조사 을/를은 받침을 보고 헬퍼가 자동 선택(괄호 이중표기 없음).
//  - VERB 는 첫 청원 문장의 종결, TONE 은 마지막 청원 문장의 종결.
//  - DESC 는 '~고/며'로 끝나는 정황 절, APPEAL 은 '~어/시어'로 끝나는 호소 절 → 자연스레 이어짐.
//  각 슬롯은 서로를 전제하지 않는 독립 항목(고유)이라 곱집합으로 섞여도 의미 충돌이 없다.
const OPEN = [
  '엎드려 아뢰옵나이다', '피를 토하는 심정으로 아뢰옵니다', '황공하오나 감히 아뢰옵니다', '죽음을 무릅쓰고 아뢰옵니다',
  '신이 충정으로 아뢰옵건대', '아뢰옵기 황송하오나 감히 고하옵니다', '눈물로써 아뢰옵나이다', '삼가 머리를 조아려 아뢰옵니다',
  '신이 만번 죽어 마땅하오나 아뢰옵니다', '간담을 쏟아 아뢰옵니다', '백관을 대신하여 아뢰옵니다', '삼사가 함께 엎드려 아뢰옵니다',
  '먼 변방에서 글을 올려 아뢰옵니다', '늙은 신하가 마지막으로 아뢰옵니다', '부복하여 우러러 아뢰옵니다', '온 조정의 뜻을 모아 아뢰옵니다',
  '오랜 침묵을 깨고 아뢰옵니다', '신의 직분을 다하여 아뢰옵니다', '하늘을 두려워하며 아뢰옵니다', '선왕의 유지를 받들어 아뢰옵니다',
  '관복을 벗을 각오로 아뢰옵니다', '향촌 유생들의 뜻을 모아 아뢰옵니다', '붓을 적시는 손을 떨며 아뢰옵니다', '한 조각 단심으로 아뢰옵니다',
  '죽기를 무릅쓰고 직언으로 아뢰옵니다', '엎드려 통곡하며 아뢰옵니다', '거듭 통촉을 청하며 아뢰옵니다', '신의 노둔함을 무릅쓰고 아뢰옵니다',
  '경연에 들어 삼가 아뢰옵니다', '대궐 문 앞에 엎드려 아뢰옵니다', '사필을 두려워하며 아뢰옵니다', '만인의 상소로써 아뢰옵니다',
  '신이 늙고 병들었으나 아뢰옵니다', '국록을 먹는 도리로 아뢰옵니다', '천지신명께 맹세코 아뢰옵니다', '충간의 도리로써 아뢰옵니다',
  '백성의 통곡을 듣고 아뢰옵니다', '조종의 법도를 헤아려 아뢰옵니다', '신의 어리석은 소견을 아뢰옵니다', '삼가 정성을 다하여 아뢰옵니다',
]
const SUBJ = [
  '종묘사직의 안위', '간신의 농단', '외척의 발호', '백성의 도탄', '세자의 처분', '역도의 죄상', '폐비의 신원', '대간의 막힌 언로',
  '변방의 위급', '환곡의 폐단', '서원의 횡포', '척화의 대의', '주화의 실리', '군량의 부족', '훈구의 전횡', '권신의 발호',
  '내관의 농권', '뇌물의 만연', '매관매직의 폐단', '삼정의 문란', '공납의 폐해', '부역의 가혹함', '흉년의 참상', '역병의 창궐',
  '도성의 민심', '향촌의 원성', '아전의 토색', '수령의 탐학', '무너진 기강', '땅에 떨어진 강상', '왜구의 노략', '북변 오랑캐의 침입',
  '봉수의 끊긴 통신', '성곽의 황폐함', '병정의 헐벗음', '떠도는 유민의 참상', '버려진 진휼곡', '끊긴 진상의 길', '문란한 과거의 폐단', '음서의 폐단',
  '서얼의 한맺힌 사정', '노비의 억울한 송사', '옥에 갇힌 무고한 자의 원통함', '미루어진 신원', '엄혹한 형장', '잘못 내려진 사약', '경연의 폐강', '실록의 누락',
  '왕실의 사치', '내수사의 침학', '궁방전의 확대', '면세 전결의 남발', '편당의 다툼', '예송의 시비', '간택의 그늘', '척신의 혼맥',
]
// VERB 은 모두 앞의 SUBJ(문제·사안 명사구)를 목적어로 받는 타동 청원 종결.
// 어느 SUBJ 명사와 결합해도 '~을/를 [VERB]'가 자연스럽도록, 스스로 다른 목적어를 끌지 않게 정제했다.
const VERB = [
  '바로잡아 주시옵소서', '엄히 다스려 주시옵소서', '깊이 통촉하여 주시옵소서', '굽어살펴 주시옵소서', '소상히 헤아려 주시옵소서',
  '낱낱이 살펴 주시옵소서', '두루 통찰하여 주시옵소서', '하루속히 혁파하여 주시옵소서', '엄정히 가려 주시옵소서', '단호히 결단하여 주시옵소서',
  '친히 챙겨 주시옵소서', '대신들과 의논하여 주시옵소서', '죄를 물어 주시옵소서', '율에 따라 처결하여 주시옵소서', '엄히 징치하여 주시옵소서',
  '서둘러 진정시켜 주시옵소서', '너그러이 헤아려 주시옵소서', '자세히 굽어보아 주시옵소서', '활짝 열어 풀어 주시옵소서', '겸허히 받아들여 주시옵소서',
  '단단히 막아 주시옵소서', '굳건히 다잡아 주시옵소서', '어질게 보살펴 주시옵소서', '멀리 물리쳐 주시옵소서', '바로 세워 주시옵소서',
  '말끔히 풀어 주시옵소서', '깨끗이 씻어 주시옵소서', '환히 밝혀 주시옵소서', '뿌리째 뽑아 주시옵소서', '엄중히 다루어 주시옵소서',
  '선처하여 주시옵소서', '속히 진정시켜 주시옵소서', '다시 바로잡아 주시옵소서', '몸소 살펴 주시옵소서', '두렵게 여겨 주시옵소서',
  '서둘러 처분하여 주시옵소서', '공평히 가려 주시옵소서', '지엄히 다스려 주시옵소서', '엄정히 다잡아 주시옵소서', '깊이 통촉하여 윤허하소서',
]
// '~고/며'로 끝나는 정황 묘사 절(독립). SUBJ·VERB·TONE 어느 것과 붙어도 모순이 없다.
const DESC = [
  '사직이 바람 앞 등불 같고', '민심이 들끓어 흉흉하며', '조정의 기강이 무너지고', '안팎의 근심이 겹겹이 쌓이며',
  '백성의 원성이 하늘에 닿고', '변방의 봉화가 그칠 날이 없으며', '곳간이 비고 군량이 모자라며', '간특한 무리가 날로 세를 불리고',
  '충신이 입을 닫고 물러나며', '하늘이 거듭 재변으로 경계하고', '흉년이 잇따라 들에 곡소리 가득하며', '역병이 번져 거리에 시신이 즐비하고',
  '강상이 땅에 떨어져 차마 볼 수 없으며', '나라의 위신이 이웃에 가벼이 여겨지고', '언로가 막혀 바른말이 끊기며', '뇌물이 길을 트고 공도가 막히고',
  '굶주린 유민이 길을 메우며', '아전의 토색이 끝을 모르고', '옥송이 쌓여 무고한 이가 신음하며', '편당의 다툼이 정사를 가리고',
  '선왕의 법도가 헐어지며', '어진 선비가 초야에 묻혀 있고', '재물이 위로만 흘러 아래가 마르며', '세도가 한쪽으로 기울고',
  '왜구가 연해를 노략하며', '북변의 오랑캐가 틈을 엿보고', '성곽이 허물어져 막을 바가 없으며', '진휼의 곡식이 창고에서 썩어가고',
  '학문이 시들고 과장이 어지러우며', '예법이 허물어져 위아래가 뒤섞이고', '재물을 다투어 인심이 각박해지며', '천재와 인재가 한꺼번에 닥치고',
  '종묘의 제향마저 소홀해지며', '백관이 눈치만 보고 몸을 사리고', '상벌이 공정함을 잃어 사람들이 미혹하며', '풍속이 사치로 흘러 검약을 잊고',
  '변방의 장계가 자꾸만 늦어지며', '관리의 청렴이 옛말이 되고', '곤궁한 백성이 자식을 팔기에 이르며', '의로운 죽음이 헛되이 잊히고',
]
// '~어/시어' 등으로 끝나는 호소 절(독립). 뒤의 TONE 종결로 자연히 마무리된다.
const APPEAL = [
  '만백성의 통곡을 굽어살피시어', '종묘사직의 무궁함을 생각하시어', '선왕의 깊은 뜻을 받드시어', '하늘의 경계하심을 두려워하시어',
  '천만 생령의 목숨을 가엾이 여기시어', '신들의 간곡한 충정을 헤아리시어', '나라의 백년대계를 멀리 내다보시어', '옛 성군의 자취를 본받으시어',
  '위로 조종을 욕되게 하지 않으시려거든', '아래로 창생을 저버리지 않으시려거든', '한때의 노여움을 거두시고', '사사로운 정을 끊으시고',
  '공론에 귀를 기울이시어', '어진 이를 가까이 두시어', '검약으로 본을 보이시어', '상벌을 분명히 하시어',
  '백성을 자식처럼 어루만지시어', '대의를 무겁게 여기시어', '후세의 사필을 두려워하시어', '대궐 밖 굶주림을 잊지 마시어',
  '충간을 약처럼 달게 받으시어', '간사한 말에 흔들리지 마시어', '조종의 법도를 굳게 지키시어', '천하의 공의를 좇으시어',
  '강토의 위태로움을 살피시어', '백관의 본분을 바로 세우시어', '민생의 곤궁함을 어루만지시어', '나라의 근본을 튼튼히 하시려거든',
  '의로운 신하를 저버리지 마시고', '한 사람의 억울함도 없게 하시어', '먼 앞날의 환란을 미리 막으시려거든', '천심과 민심을 두루 살피시어',
  '늙은 신하의 마지막 충정을 가엾이 여기시어', '예로부터의 떳떳한 도리를 좇으시어', '하늘이 내린 천명을 받드시어', '만세에 길이 빛날 성덕을 생각하시어',
  '서둘러 화근을 끊으시려거든', '바른 정사로 인심을 돌이키시어', '곤궁한 변방을 어루만지시어', '종사의 안녕을 무엇보다 앞세우시어',
]
const TONE = [
  '부디 결단을 내려 주시옵소서', '실로 망극하기 그지없사옵니다', '신은 죽음으로 청하옵니다', '천추의 한이 될까 두렵사옵니다',
  '사직이 위태롭기 짝이 없사옵니다', '만백성이 전하만 우러르고 있사옵니다', '하늘이 굽어보고 있사옵니다', '신의 충정을 살펴 주시옵소서',
  '이것이 신의 마지막 간청이옵니다', '늦으면 후회하여도 미치지 못하옵니다', '통촉하시어 윤허하여 주시옵소서', '명을 거두어 주시옵기를 바라옵니다',
  '엎드려 처분을 기다리옵니다', '신은 오직 죽음이 있을 뿐이옵니다', '부디 굽어살펴 주시옵소서', '이 한 몸 바쳐 충성을 다하겠사옵니다',
  '나라의 운명이 여기에 달렸사옵니다', '바른 정사가 이로써 서리이다', '백성이 다시 살아날 것이옵니다', '신들이 거듭 머리를 조아리옵니다',
  '차마 입을 다물 수 없었사옵니다', '후세가 오늘을 기록할 것이옵니다', '하해 같은 성은을 우러르옵니다', '신의 죄가 만번 죽어 마땅하옵니다',
  '부디 흔들리지 마시옵소서', '간곡히 바라고 또 바라옵니다', '눈물이 앞을 가리옵니다', '천만번을 거듭 청하옵니다',
  '이 글이 부디 닿기를 비옵니다', '신의 충간을 저버리지 마시옵소서', '종사의 복이 무궁할 것이옵니다', '한시도 늦출 수 없는 일이옵니다',
  '신은 그저 황공할 따름이옵니다', '바라옵건대 깊이 통촉하여 주시옵소서', '오직 전하의 결단에 달렸사옵니다', '신은 명을 기다릴 뿐이옵니다',
  '부디 사직을 먼저 생각하시옵소서', '이로써 인심이 안정될 것이옵니다', '신의 정성이 하늘에 사무치옵니다', '삼가 죽기를 무릅쓰고 청하옵니다',
]
function combos(): number { return OPEN.length * SUBJ.length * VERB.length * DESC.length * APPEAL.length * TONE.length }

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

// 조사 을/를 선택: 마지막 글자의 받침 유무로 결정(괄호 이중표기 금지).
// 한글 음절(0xAC00~0xD7A3)에서 (코드-0xAC00)%28 !== 0 이면 받침 있음 → '을'.
function eulReul(word: string): string {
  const ch = word.charCodeAt(word.length - 1)
  if (ch >= 0xac00 && ch <= 0xd7a3) return (ch - 0xac00) % 28 !== 0 ? '을' : '를'
  return '를'
}

export default function HistoryLexicon({ payload }: { payload?: Record<string, unknown> }) {
  const genre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try { const r = localStorage.getItem(LS + 'cat'); if (r && (r === ALL || CATS.some((c) => c.key === r))) return r } catch { /* ignore */ }
    return ALL
  })
  // 펼침 상태(카테고리별). 기본: '전체' 모드에선 접힘, 단일 선택 시 펼침.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'open'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o } } catch { /* ignore */ }
    return {}
  })
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try { const r = localStorage.getItem(LS + 'favs'); if (r) { const o = JSON.parse(r); if (o && typeof o === 'object') return o } } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [rand, setRand] = useState<{ c: Cat; t: Term } | null>(null)
  // 상소투 조합기(잠금/재생성) — 6개 독립 슬롯
  const [petition, setPetition] = useState<{ open: string; subj: string; verb: string; desc: string; appeal: string; tone: string } | null>(null)
  const [locks, setLocks] = useState<{ open: boolean; subj: boolean; verb: boolean; desc: boolean; appeal: boolean; tone: boolean }>({ open: false, subj: false, verb: false, desc: false, appeal: false, tone: false })
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const favKey = (ck: string, k: string) => `${ck}::${k}`

  const copy = (text: string, id: string) => {
    if (!text) return
    const done = () => {
      setCopiedKey(id)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1400)
    }
    try {
      if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => { /* graceful */ }) }
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done()
      }
    } catch { /* graceful */ }
  }

  // 검색·필터 결과(카테고리별로 묶어 노출)
  const view = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cats = cat === ALL ? CATS : CATS.filter((c) => c.key === cat)
    return cats.map((c) => {
      let items = c.items
      if (onlyFav) items = items.filter((t) => favs[favKey(c.key, t.k)])
      if (q) items = items.filter((t) =>
        t.k.toLowerCase().includes(q) || t.d.toLowerCase().includes(q) ||
        (t.r || '').toLowerCase().includes(q) || (t.ex || '').toLowerCase().includes(q))
      return { c, items }
    }).filter((g) => g.items.length > 0)
  }, [query, cat, onlyFav, favs])

  const shownCount = useMemo(() => view.reduce((n, g) => n + g.items.length, 0), [view])

  // 검색·필터 시엔 자동 펼침으로 결과가 보이게
  const isOpen = (ck: string) => {
    if (query.trim() || onlyFav) return true
    if (cat !== ALL) return true
    return !!open[ck]
  }

  const toggleOpen = (ck: string) => setOpen((p) => ({ ...p, [ck]: !p[ck] }))
  const toggleFav = (ck: string, k: string) => setFavs((p) => { const n = { ...p }; const key = favKey(ck, k); if (n[key]) delete n[key]; else n[key] = true; return n })

  // 무작위: 현재 카테고리(전체/단일) 풀에서 한 항목
  const rollRandom = useCallback(() => {
    const pool = (cat === ALL ? CATS : CATS.filter((c) => c.key === cat)).flatMap((c) => c.items.map((t) => ({ c, t })))
    if (!pool.length) { setRand(null); return }
    setRand((prev) => {
      let p = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && p.t.k === prev.t.k && p.c.key === prev.c.key) p = pool[Math.floor(Math.random() * pool.length)]
      return p
    })
  }, [cat])

  // 상소투 조합(잠금 슬롯 유지)
  const rollPetition = useCallback(() => {
    setPetition((prev) => ({
      open: locks.open && prev ? prev.open : pick(OPEN),
      subj: locks.subj && prev ? prev.subj : pick(SUBJ),
      verb: locks.verb && prev ? prev.verb : pick(VERB),
      desc: locks.desc && prev ? prev.desc : pick(DESC),
      appeal: locks.appeal && prev ? prev.appeal : pick(APPEAL),
      tone: locks.tone && prev ? prev.tone : pick(TONE),
    }))
  }, [locks])

  const petitionText = (p: { open: string; subj: string; verb: string; desc: string; appeal: string; tone: string }) =>
    `“${p.open}. ${p.subj}${eulReul(p.subj)} ${p.verb}. ${p.desc}, ${p.appeal} ${p.tone}.”`

  // 항목 한 줄 텍스트
  const termLine = (c: Cat, t: Term) => `${t.k}${t.r ? `(${t.r})` : ''} — ${t.d}${t.ex ? `\n예: ${t.ex}` : ''}`

  // 스니펫 저장: 항목
  const saveTermSnippet = (c: Cat, t: Term) => {
    addToLibrary('snippets', {
      text: `[사극 어휘·${c.label}] ${termLine(c, t)}`,
      source: '사극 어휘·표현 사전',
      tags: ['사극', '역사', '어휘', c.label, t.k],
    })
    flash(`‘${t.k}’을(를) 스니펫 라이브러리에 저장했습니다.`)
  }
  // 스니펫 저장: 상소투
  const savePetitionSnippet = (p: { open: string; subj: string; verb: string; desc: string; appeal: string; tone: string }) => {
    addToLibrary('snippets', {
      text: `[사극 상소투] ${petitionText(p)}`,
      source: '사극 어휘·표현 사전 (상소투 조합)',
      tags: ['사극', '역사', '대사', '상소투'],
    })
    flash('상소투 한 줄을 스니펫 라이브러리에 저장했습니다.')
  }

  // 프로젝트 연계: 무작위 항목을 자료 〈사극 어휘〉 폴더에 메모로
  const addTermToProject = (c: Cat, t: Term) => {
    if (!hasProjectBridge()) return
    const body = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(t.k)}${t.r ? ` (${escapeHtml(t.r)})` : ''}</b></p>`,
      `<p>${escapeHtml(t.d)}</p>`,
      t.ex ? `<p style="color:#888">예: ${escapeHtml(t.ex)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '사극 어휘', title: `${t.k} (${c.label})`, bodyHtml: body, icon: c.icon })
    if (id) flash(`프로젝트 자료 〈사극 어휘〉에 ‘${t.k}’을(를) 추가했습니다.`)
  }
  // 프로젝트 연계: 상소투를 자료에 메모로
  const addPetitionToProject = (p: { open: string; subj: string; verb: string; desc: string; appeal: string; tone: string }) => {
    if (!hasProjectBridge()) return
    const id = addToProject({
      kind: 'text', root: 'research', folder: '사극 어휘',
      title: '상소투 한 줄', bodyHtml: `<p>${escapeHtml(petitionText(p))}</p>`, icon: '📜',
    })
    if (id) flash('프로젝트 자료 〈사극 어휘〉에 상소투를 추가했습니다.')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const inputStyle: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={wrap}>
      <div style={hint}>
        호칭·궁중어·관직·제도·시대 명사·정치·생활·상투구까지 <b>{TOTAL}개</b> 사극 어휘를 모았습니다.
        카테고리를 펼쳐 찾고, 클릭해 복사하거나 스니펫·프로젝트에 담으세요.
        {genre && genre !== '역사·사극' ? <span> (현재 프로젝트 장르: {genre})</span> : null}
      </div>

      {/* 검색 */}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="표제어·뜻·한자·예문으로 검색 (예: 전하, 역모, 상소, 賜死)" style={inputStyle} aria-label="사극 어휘 검색" />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL)} aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨" /> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon} /> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom}><Emoji e="🎲" /> 무작위 어휘</button>
        <button className="minibtn" onClick={rollPetition}><Emoji e="🖋️" /> 상소투 짓기</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 카드 */}
      {rand && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={rand.c.icon} /> {rand.c.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{rand.t.k}</span>
            {rand.t.r && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rand.t.r}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRand(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{rand.t.d}</div>
          {rand.t.ex && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, fontStyle: 'italic' }}>예: {rand.t.ex}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(termLine(rand.c, rand.t), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => saveTermSnippet(rand.c, rand.t)}><Emoji e="💾" /> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(rand.c.key, rand.t.k)}>{favs[favKey(rand.c.key, rand.t.k)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addTermToProject(rand.c, rand.t)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈사극 어휘〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={() => openToolLinked('anachronism-checker')} title="시대착오 점검 도구 열기"><Emoji e="🏺" /> 시대착오 점검</button>
          </div>
        </div>
      )}

      {/* 상소투 조합기 */}
      {petition && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e="🖋️" /> 상소투 한 줄 조합</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>조합 {combos().toLocaleString()}가지</span>
            <button className="minibtn" onClick={() => setPetition(null)}>✕</button>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)', margin: '2px 0 8px' }}>{petitionText(petition)}</div>
          {/* 슬롯 잠금 토글 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {([['open', '서두'], ['subj', '대상'], ['verb', '청'], ['desc', '정황'], ['appeal', '호소'], ['tone', '맺음']] as const).map(([key, label]) => (
              <button key={key} className="minibtn" onClick={() => setLocks((l) => ({ ...l, [key]: !l[key] }))}
                aria-pressed={locks[key]}
                style={{ borderColor: locks[key] ? 'var(--accent)' : 'var(--border)', color: locks[key] ? 'var(--text)' : 'var(--muted)' }}
                title={`${label} 슬롯 ${locks[key] ? '잠금 해제' : '잠금(재생성 시 고정)'}`}>
                {locks[key] ? <Emoji e="🔒" /> : <Emoji e="🔓" />} {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={rollPetition}><Emoji e="🎲" /> 다시 짓기</button>
            <button className="minibtn" onClick={() => copy(petitionText(petition), 'pet')}>{copiedKey === 'pet' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => savePetitionSnippet(petition)}><Emoji e="💾" /> 스니펫 저장</button>
          </div>
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addPetitionToProject(petition)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 상소투를 프로젝트 자료 〈사극 어휘〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>✓ {toast}</div>
      )}

      {/* 카테고리 펼침 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {view.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 어휘가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          view.map(({ c, items }) => {
            const opened = isOpen(c.key)
            return (
              <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* 카테고리 헤더(펼침 토글) */}
                <div
                  onClick={() => { if (!query.trim() && !onlyFav && cat === ALL) toggleOpen(c.key) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: (!query.trim() && !onlyFav && cat === ALL) ? 'pointer' : 'default',
                    padding: '7px 10px', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 14 }}><Emoji e={c.icon} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</span>
                  {(!query.trim() && !onlyFav && cat === ALL) && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{opened ? '▾' : '▸'}</span>}
                </div>

                {/* 항목들 */}
                {opened && items.map((t) => {
                  const fk = favKey(c.key, t.k)
                  const isFav = !!favs[fk]
                  const cid = 'i:' + fk
                  return (
                    <div key={fk} style={{ ...card, marginLeft: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{t.k}</span>
                        {t.r && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t.r}</span>}
                        <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'} onClick={() => toggleFav(c.key, t.k)}
                          style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>{isFav ? '★' : '☆'}</button>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>{t.d}</div>
                      {t.ex && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4, fontStyle: 'italic' }}>예: {t.ex}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => copy(termLine(c, t), cid)}>{copiedKey === cid ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
                        {t.ex && <button className="minibtn" onClick={() => copy(t.ex!, cid + ':ex')}>{copiedKey === cid + ':ex' ? <>✓ 복사됨</> : <><Emoji e="💬" /> 예문 복사</>}</button>}
                        <button className="minibtn" onClick={() => saveTermSnippet(c, t)}><Emoji e="💾" /> 스니펫</button>
                        <button className="minibtn" onClick={() => addTermToProject(c, t)} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료에 추가' : '프로젝트 미연결'}><Emoji e="📄" /> 프로젝트</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>
        ‘전하/저하/폐하’처럼 신분에 따라 호칭이 갈리니 배경(왕대·국체)에 맞춰 쓰세요. 시대착오가 걱정되면 <Emoji e="🏺" /> 시대착오 점검과 함께 쓰면 좋습니다.
      </div>
    </div>
  )
}
