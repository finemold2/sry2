// 트로프·클리셰 브라우저 — 인물·플롯·관계·설정 트로프 150+를 로컬 사전으로 모아
//  카테고리별 펼침 + 검색 + 무작위로 탐색하고, 각 트로프마다 "비틀어 쓰기"(서브버전) 제안을 함께 본다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크/라이브러리 불필요.
//  Math.random + localStorage(펼친 카테고리·즐겨찾기)만 사용. 언마운트 시 타이머 정리.
// 연계(linkbus): 마음에 든 트로프(이름·설명·비틀기 제안)를 스니펫 라이브러리에 저장하거나,
//  프로젝트 자료 〈트로프〉 폴더에 메모로 추가한다.
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'trope-browser', name: '트로프 브라우저', icon: '🎬', group: '영감·발상', intro: '인물·플롯·관계·설정 트로프 150+를 모아 보고 "비틀어 쓰기" 제안으로 클리셰를 새롭게', w: 620, h: 580 }

interface Trope {
  name: string       // 트로프 이름(클리셰)
  desc: string       // 흔한 형태 설명
  twist: string      // 비틀어 쓰기(서브버전) 제안
}
interface CatDef { key: string; label: string; icon: string; items: Trope[] }

// 150+ 로컬 트로프 사전 — 인물 / 플롯 / 관계 / 설정 4개 카테고리.
const CATS: CatDef[] = [
  {
    key: 'character', label: '인물', icon: '🧑', items: [
      { name: '선택받은 자', desc: '예언에 따라 세계를 구할 운명을 타고난 평범한 소년·소녀.', twist: '선택은 행정 착오였고, 진짜 적임자는 곁의 조연이다. 주인공은 자격 없는 자리를 어떻게 감당하는가.' },
      { name: '마지못한 영웅', desc: '평범하게 살고 싶지만 사건에 휘말려 영웅이 되는 인물.', twist: '끝까지 영웅이 되길 거부하고, 그 거부 자체가 더 큰 변화를 일으키게 하라.' },
      { name: '안티히어로', desc: '거칠고 비도덕적이지만 결국 옳은 일을 하는 주인공.', twist: '관객은 그를 응원하지만, 정작 그가 구한 사람들은 그를 두려워하고 거부한다.' },
      { name: '현명한 멘토', desc: '주인공을 이끌다 보통 중반에 희생되는 늙은 스승.', twist: '멘토가 끝까지 살아남되, 그의 가르침이 사실 틀렸음이 결말에 드러난다.' },
      { name: '미친 과학자', desc: '윤리를 무시하고 위험한 실험에 몰두하는 천재.', twist: '그의 광기는 한때 옳았던 직관이 세상에 거부당한 상처에서 왔음을 보여줘라.' },
      { name: '츤데레', desc: '겉으론 쌀쌀맞지만 속으론 다정한 인물.', twist: '냉담함이 연기가 아니라 진심이고, 다정함이야말로 계산된 가면이게 하라.' },
      { name: '백치미 미녀', desc: '아름답지만 어리숙하게 그려지는 여성 캐릭터.', twist: '어리숙함은 위장이고, 그녀가 방 안에서 가장 빠르게 판을 읽는 자였다.' },
      { name: '심장 따뜻한 창녀', desc: '천한 처지지만 누구보다 선량한 인물.', twist: '선량함을 보상이 아니라 무기로 — 그녀의 친절이 상대를 무장 해제시키는 전략이다.' },
      { name: '미스터리한 이방인', desc: '정체불명으로 나타나 사건을 흔드는 과묵한 인물.', twist: '그의 비밀이 거창할 것이라는 기대를 배신하라 — 사실 아주 사소하고 부끄러운 것이다.' },
      { name: '광대(코믹 릴리프)', desc: '긴장을 풀어주는 우스운 조연.', twist: '그의 농담이 사실 가장 날카로운 진실의 전달자임을, 아무도 안 들을 때 드러내라.' },
      { name: '비극적 영웅', desc: '치명적 결함 때문에 파멸하는 위대한 인물.', twist: '그 결함이 결함이 아니라, 타락한 세계에서 유일하게 옳은 고집이었다.' },
      { name: '복수귀', desc: '가족·연인을 잃고 복수에 일생을 바치는 인물.', twist: '복수를 이루는 순간 표적이 이미 죽어 있거나, 자기 손이 닿기 전 스스로 무너졌다.' },
      { name: '순진한 시골뜨기', desc: '도시·궁정에 나가 세상의 때를 배우는 순박한 인물.', twist: '세상을 배우는 게 아니라, 그의 순진함이 거꾸로 닳고 닳은 자들을 바꿔놓는다.' },
      { name: '냉혹한 암살자', desc: '감정을 버린 완벽한 살인 기계.', twist: '그가 단 한 번도 사람을 죽인 적 없고, 평판만으로 살아왔음을 밝혀라.' },
      { name: '천재 소년·소녀', desc: '나이답지 않게 비범한 지능을 가진 아이.', twist: '천재성의 대가로 또래의 평범한 행복을 영영 잃었고, 그것을 절실히 원한다.' },
      { name: '망가진 베테랑', desc: '과거의 트라우마로 술·고립에 빠진 노련한 전문가.', twist: '복귀의 계기가 영웅적 사명이 아니라, 지극히 사소하고 이기적인 이유다.' },
      { name: '귀여운 마스코트', desc: '곁을 따라다니는 작고 사랑스러운 동물·존재.', twist: '마스코트가 이야기 전체를 관찰·조종해온 진짜 시점 인물이었다.' },
      { name: '얼음 여왕', desc: '감정을 드러내지 않는 차갑고 완벽한 여성.', twist: '그 냉정함이 권력 유지를 위한 학습된 갑옷이며, 벗는 순간 모두를 잃는다.' },
      { name: '바보 같은 조수', desc: '주역을 돋보이게 하는 서툰 조력자.', twist: '주역이 실은 조수에게 전적으로 의존했음을, 조수가 사라진 뒤에야 깨닫게 하라.' },
      { name: '자수성가한 거물', desc: '맨손으로 부와 권력을 일군 자신만만한 인물.', twist: '그 모든 성공이 잊고 싶은 단 한 번의 비겁한 거래 위에 세워졌다.' },
      { name: '신비한 치유자', desc: '상처와 병을 고치는 온화한 현자.', twist: '그가 고칠 수 있는 단 하나의 병만은 자기 것이며, 결코 고치지 않는다.' },
      { name: '버려진 황태자', desc: '신분을 숨기고 자란 진짜 후계자.', twist: '왕좌를 되찾을 수 있게 되자, 그는 평민의 삶을 택한다 — 그게 더 무거운 결단이다.' },
      { name: '광신도', desc: '신념을 위해 무엇이든 하는 맹목적 추종자.', twist: '그의 신념이 객관적으로 옳았고, 미친 건 그를 비웃던 세상이었다.' },
      { name: '재능 없는 노력파', desc: '천재들 틈에서 끈기로 버티는 평범한 인물.', twist: '끝내 천재를 넘지 못하지만, 그 과정에서 천재가 결코 못 가진 무언가를 얻는다.' },
      { name: '두 얼굴의 신사', desc: '점잖은 겉모습 뒤에 잔혹함을 숨긴 인물.', twist: '잔혹한 쪽이 진짜 자아라 믿었으나, 정작 점잖은 가면이 그를 지켜온 진심이었다.' },
      { name: '말 없는 거한', desc: '거대한 몸집에 과묵하고 충직한 인물.', twist: '침묵이 충직이 아니라 깊은 경멸이었고, 결정적 순간에 입을 연다.' },
      { name: '몰락한 귀족', desc: '가문의 영광을 잃고도 자존심만 남은 인물.', twist: '잃은 영광이 애초에 거짓이었음을 알게 되고, 거기서 진짜 품위가 시작된다.' },
      { name: '운명의 예언자', desc: '미래를 보지만 아무도 믿어주지 않는 인물(카산드라).', twist: '예언이 빗나가기 시작하고, 그게 그를 믿기 시작한 사람들 때문임을 깨닫는다.' },
      { name: '귀환한 망자', desc: '죽은 줄 알았다가 돌아온 인물.', twist: '돌아온 그가 같은 사람이 아니며, 남은 이들은 누구를 애도해야 할지 모른다.' },
      { name: '도시의 형사', desc: '규칙을 무시하지만 사건은 반드시 해결하는 베테랑.', twist: '그가 어긴 규칙 하나가 무고한 이를 죽였고, 그 사건만은 영영 못 푼다.' },
      { name: '명랑한 낙천가', desc: '어떤 시련에도 웃음을 잃지 않는 인물.', twist: '그 낙천이 가장 깊은 슬픔을 가두는 댐이며, 무너지면 누구보다 무섭다.' },
      { name: '완벽주의 천재', desc: '비범하지만 인간관계엔 서툰 오만한 인물.', twist: '그의 오만이 연기였고, 일부러 미움받아 가까운 이를 위험에서 떼어놓는 중이다.' },
      { name: '순수한 괴물', desc: '무서운 외형과 달리 마음은 어린아이 같은 존재.', twist: '순수해 보이던 존재가 가장 잔혹한 일을, 죄의식 없이 천진하게 저지른다.' },
      { name: '괴짜 발명가', desc: '엉뚱한 발명으로 사건을 돕거나 망치는 별난 인물.', twist: '쓸모없어 보이던 발명 하나가 결국 모든 것을 결정짓는 열쇠임을 끝에서 드러내라.' },
      { name: '은퇴를 앞둔 베테랑', desc: '마지막 한 건만 끝내고 떠나려는 노련한 인물.', twist: '"마지막 한 건"이라는 다짐 자체가 그를 절대 놓아주지 않는 저주임을 보여줘라.' },
      { name: '거리의 부랑아', desc: '맨몸으로 도시를 사는 영리한 떠돌이.', twist: '그가 거리를 택한 게 아니라, 안락한 자리를 거부하고 스스로 내려온 자임을 밝혀라.' },
      { name: '냉정한 전략가', desc: '감정을 배제하고 판을 읽는 두뇌형 인물.', twist: '가장 완벽한 그의 계획이, 계산에 넣지 않은 단 하나의 인간적 변수에 무너진다.' },
      { name: '저주받은 불사신', desc: '죽지 못해 영원을 사는 인물.', twist: '불사가 고통이 아니라 무관심을 낳아, 그는 어떤 죽음에도 더는 슬프지 않다.' },
      { name: '가면을 쓴 자경단', desc: '정체를 숨기고 밤마다 정의를 집행하는 인물.', twist: '가면 아래의 평범한 일상이야말로 진짜 가면이고, 자경단이 본모습이다.' },
      { name: '몰락을 자초한 천재', desc: '오만으로 스스로 파멸을 부르는 비범한 인물.', twist: '몰락이 실수가 아니라, 더는 정상에 있고 싶지 않았던 그의 은밀한 선택이었다.' },
      { name: '충직한 짐승 동반자', desc: '주인공 곁을 지키는 영리한 동물 파트너.', twist: '그 짐승이 인간보다 먼저 진실을 알았고, 줄곧 경고했으나 아무도 못 알아들었다.' },
      { name: '잊힌 영웅', desc: '한때 세상을 구했으나 잊혀 평범히 늙어가는 인물.', twist: '세상이 그를 잊은 게 아니라, 그가 영웅이던 일을 통째로 거짓으로 지운 것이다.' },
      { name: '신참 열정가', desc: '경험은 없지만 의욕만은 넘치는 새내기.', twist: '그 열정이 베테랑들이 잃어버린 옳은 직감이었고, 미숙함이 곧 정직함이었다.' },
    ],
  },
  {
    key: 'plot', label: '플롯', icon: '🎭', items: [
      { name: '영웅의 여정', desc: '부름·시련·귀환으로 이어지는 고전적 모험 구조.', twist: '주인공이 귀환을 거부하거나, 돌아갈 고향이 이미 사라져 갈 곳이 없게 하라.' },
      { name: '맥거핀', desc: '인물들이 좇지만 정체가 중요치 않은 목표물.', twist: '맥거핀의 진짜 정체가 결말의 핵심이 되어, "중요치 않다"던 약속을 배신하라.' },
      { name: '데우스 엑스 마키나', desc: '막판에 갑자기 등장해 위기를 푸는 우연·기적.', twist: '기적이 구원이 아니라 더 큰 대가를 청구하는 함정이게 하라.' },
      { name: '시한폭탄', desc: '정해진 시간 안에 막아야 하는 위기.', twist: '시계가 0이 되어도 아무 일이 없고, 진짜 위기는 시간이 끝난 뒤 시작된다.' },
      { name: '거짓 패배(All is Lost)', desc: '클라이맥스 직전 모든 것을 잃는 최저점.', twist: '최저점이 사실 적의 의도였고, 주인공의 절망이 적의 마지막 연료가 된다.' },
      { name: '반전 결말', desc: '마지막에 모든 전제를 뒤집는 충격적 폭로.', twist: '반전을 일찍 흘리고, 진짜 충격은 "그걸 알고도 막지 못한" 무력함에서 오게 하라.' },
      { name: '예언의 성취', desc: '예언이 결국 그대로 이루어지는 운명론.', twist: '예언을 피하려는 행동들이 정확히 그 예언을 만들어내는 자기실현 구조로 짜라.' },
      { name: '복수극', desc: '피해를 갚기 위한 추적과 응징의 서사.', twist: '복수의 끝에서 표적이 더 큰 피해자였음이 드러나, 가해와 피해가 뒤집힌다.' },
      { name: '금지된 사랑', desc: '가문·신분·진영이 가로막는 비극적 연애.', twist: '장벽이 사라져 둘이 맺어지는 순간, 사랑을 지탱하던 긴장도 함께 사라진다.' },
      { name: '오해의 연쇄', desc: '대화 한 번이면 풀릴 오해가 사건을 키운다.', twist: '진실을 말해도 아무도 믿지 않거나, 진실이 오해보다 더 파국적이게 하라.' },
      { name: '잠입과 변장', desc: '적진에 위장 잠입해 정보를 빼내는 작전.', twist: '위장 신분에 너무 깊이 들어가, 어느 쪽이 진짜 자신인지 잃어버리게 하라.' },
      { name: '회생 불가의 임무', desc: '돌아올 수 없음을 알고 떠나는 결사 작전.', twist: '모두가 죽음을 각오했는데 전원 살아남고, 살아남음이 더 큰 짐이 된다.' },
      { name: '두 진영의 전쟁', desc: '선과 악, 두 세력의 거대한 대결.', twist: '싸움의 진짜 수혜자는 제3의 방관자이며, 양쪽 다 이용당했음을 밝혀라.' },
      { name: '시간 회귀(루프)', desc: '같은 시간을 반복하며 정답을 찾는 구조.', twist: '루프를 깨는 법이 "완벽한 하루"가 아니라 "실패를 받아들이는 것"이게 하라.' },
      { name: '잃어버린 기억', desc: '기억을 잃은 주인공이 자기 과거를 추적한다.', twist: '되찾은 기억이 끔찍해, 주인공이 차라리 잊은 채 살기로 선택한다.' },
      { name: '숨겨진 후계', desc: '평범한 인물이 실은 위대한 혈통임이 밝혀진다.', twist: '혈통이 밝혀져도 아무것도 안 바뀌고, 정작 그가 만든 인연이 진짜 유산이다.' },
      { name: '쫓고 쫓기기', desc: '누명을 쓰고 도망치며 진범을 추적하는 구조.', twist: '도망자 본인이 잊고 있던 진범이며, 추적은 결국 자기 자신을 향한다.' },
      { name: '구원의 희생', desc: '주인공이 목숨을 바쳐 모두를 구한다.', twist: '희생이 헛되이 끝나거나, 그가 구한 세계가 희생할 가치가 없었음이 드러난다.' },
      { name: '경연·토너먼트', desc: '실력을 겨루는 대회에서 단계별로 올라간다.', twist: '대회 자체가 누군가를 솎아내기 위한 함정이며, 우승은 곧 표적이 됨을 뜻한다.' },
      { name: '봉인 해제', desc: '봉인된 고대의 힘·존재가 풀려나 위협이 된다.', twist: '풀려난 존재가 위협이 아니라, 봉인을 강요한 자들이 진짜 악당이었다.' },
      { name: '내부의 배신자', desc: '아군 중 한 명이 적과 내통하고 있다.', twist: '배신자가 모두를 살리기 위해 일부러 배신자가 된 것임을 마지막에 밝혀라.' },
      { name: '거래의 함정', desc: '편의를 위해 맺은 계약이 점점 옭아맨다.', twist: '계약의 약자라 믿은 쪽이 처음부터 판을 설계한 진짜 주인이었다.' },
      { name: '마지막 한 명', desc: '집단이 하나씩 죽고 최후의 생존자만 남는다.', twist: '생존자가 살아남은 이유가 행운이 아니라, 그가 차례로 동료를 버린 결과였다.' },
      { name: '귀향', desc: '오랜 방랑 끝에 고향으로 돌아온다.', twist: '고향이 변했거나 그가 변해, 가장 그리던 곳이 가장 낯선 곳이 된다.' },
      { name: '이중 첩보', desc: '양쪽을 오가는 스파이의 충성이 시험받는다.', twist: '어느 쪽에도 충성하지 않은 채, 오직 제3의 목적을 위해 둘 다 속여왔다.' },
      { name: '몸이 바뀌다', desc: '두 인물의 영혼·몸이 뒤바뀐다.', twist: '몸이 돌아온 뒤에도 서로의 삶을 산 흔적이 남아, 원래로 완전히 돌아갈 수 없다.' },
      { name: '최후의 결전', desc: '주인공과 숙적이 일대일로 맞붙는 종막.', twist: '결전이 싸움이 아니라 대화로 끝나거나, 싸울 이유 자체가 사라져버린다.' },
      { name: '재난 생존', desc: '대재앙 속에서 살아남기 위해 발버둥치는 군상.', twist: '재난이 끝나고 일상이 돌아오는 것이, 재난 자체보다 더 무서운 적응의 시작이다.' },
      { name: '비밀 임무', desc: '진짜 목적을 숨긴 채 수행하는 위장 작전.', twist: '수행자조차 진짜 목적을 몰랐고, 자신이 도구임을 깨닫는 순간이 클라이맥스다.' },
      { name: '운명의 삼각', desc: '한 사람을 둘이 사랑하는 갈등 구조.', twist: '세 사람이 사실 같은 무언가의 결핍을 채우려 했을 뿐, 사랑은 핑계였다.' },
      { name: '거짓 영웅의 가면', desc: '진짜 공로자가 따로 있는데 다른 이가 영웅 대접을 받는다.', twist: '진짜 공로자가 끝내 침묵을 택하고, 가짜 영웅을 살려두는 게 더 큰 선이게 하라.' },
      { name: '의문의 죽음', desc: '한 인물의 죽음을 둘러싼 진실을 파헤치는 구조.', twist: '죽음을 파헤치던 자가 자신이 그 죽음의 원인이었음을 마지막에 깨닫는다.' },
      { name: '금단의 지식 추구', desc: '닿아선 안 될 진리를 좇다 파멸하는 서사.', twist: '금단의 지식이 실은 평범한 상식이었고, 그것을 금기로 만든 권력이 진짜 비밀이다.' },
      { name: '인질극', desc: '인질을 두고 벌어지는 협상과 대치.', twist: '인질이 납치범과 한편이거나, 구출되길 거부하는 진짜 이유가 따로 있다.' },
      { name: '대를 잇는 복수', desc: '윗세대의 원한이 다음 세대로 이어지는 구조.', twist: '복수의 사슬을 끊는 유일한 방법이, 원수와 화해가 아니라 함께 사라지는 것이다.' },
      { name: '서서히 드러나는 진실', desc: '단서가 조금씩 쌓여 전모가 밝혀지는 미스터리.', twist: '모든 단서가 가리킨 답이 틀렸고, 진실은 단서 하나 없던 곳에 있었다.' },
      { name: '거짓 평화', desc: '겉보기엔 평온하나 곧 무너질 위태로운 안정.', twist: '평화가 거짓이 아니라 진짜였고, 그것을 못 견딘 주인공이 균열을 만든 장본인이다.' },
      { name: '운명을 바꾸려는 시도', desc: '정해진 비극을 막으려 발버둥치는 서사.', twist: '비극을 막는 데 성공하지만, 그 자리에 더 견디기 힘든 다른 비극이 들어선다.' },
      { name: '협력하는 적', desc: '더 큰 위협 앞에 잠시 손잡는 두 세력.', twist: '더 큰 위협이 사실 두 세력을 화해시키려 한 제3자의 연출이었다.' },
      { name: '한 통의 편지', desc: '뒤늦게 도착한 편지·메시지가 모든 것을 뒤집는다.', twist: '편지가 끝내 열리지 않은 채로, 그 미지의 내용이 남은 이들을 평생 따라다닌다.' },
    ],
  },
  {
    key: 'relation', label: '관계', icon: '🤝', items: [
      { name: '연적에서 연인으로', desc: '서로 으르렁대다 사랑에 빠지는 두 사람.', twist: '연인이 되자 으르렁대던 시절의 활기가 사라져, 적이었을 때가 그리워진다.' },
      { name: '소꿉친구', desc: '어릴 적부터 함께 자라온 익숙한 상대.', twist: '오랜 친밀이 사랑이 아니라, 떠나지 못하게 하는 족쇄임을 둘 다 알면서 침묵한다.' },
      { name: '운명의 짝(소울메이트)', desc: '만나는 순간 서로를 알아보는 정해진 연인.', twist: '운명임을 알면서도 함께하지 않기로 선택하는 게 더 큰 사랑임을 보여줘라.' },
      { name: '삼각관계', desc: '한 사람을 두고 두 인물이 경쟁하는 구도.', twist: '두 경쟁자가 서로에게 끌리고, 가운데 인물이 오히려 잉여가 된다.' },
      { name: '스승과 제자', desc: '가르치고 배우는 위계적 유대.', twist: '제자가 스승을 가르치고 있었음을, 스승이 마지막에야 겸허히 인정한다.' },
      { name: '버디(콤비)', desc: '성격 정반대의 두 사람이 짝을 이뤄 활약.', twist: '둘이 너무 닮아 충돌하는 것이었고, 차이가 아니라 동질감이 갈등의 원인이다.' },
      { name: '원수에서 동맹으로', desc: '공동의 적 앞에서 손잡는 숙적.', twist: '공동의 적이 사라지자 동맹이 즉시 무너지고, 협력의 기억만 둘을 괴롭힌다.' },
      { name: '짝사랑', desc: '닿지 않는 마음을 홀로 품는 인물.', twist: '상대도 같은 마음이었으나, 둘 다 영원히 모른 채 어긋나게 하라.' },
      { name: '형제의 대립', desc: '왕좌·신념을 두고 갈라선 피붙이.', twist: '대립의 뿌리가 거창한 명분이 아니라, 어린 시절의 사소한 상처 하나임을 드러내라.' },
      { name: '부모의 그림자', desc: '위대한(또는 악명 높은) 부모를 넘어서려는 자식.', twist: '넘어선 순간, 부모를 미워하던 자신이 똑같은 부모가 되어 있음을 본다.' },
      { name: '금지된 우정', desc: '진영·신분이 갈린 두 사람의 비밀스러운 우애.', twist: '우정을 지키려는 선택이 양 진영 모두를 배신하는 결과가 되게 하라.' },
      { name: '계약 관계', desc: '거래로 시작했다가 진심이 싹트는 사이(계약 연애 등).', twist: '진심이 싹튼 줄 알았으나, 한쪽은 끝까지 계약의 이행이었음을 밝혀라.' },
      { name: '구원자와 피구원자', desc: '한 사람이 다른 사람을 거듭 구해주는 관계.', twist: '구해지는 쪽이 일부러 위기에 빠져, 구원자를 곁에 묶어두고 있었다.' },
      { name: '재회한 옛 연인', desc: '헤어졌던 두 사람이 세월 뒤 다시 만난다.', twist: '재회로 확인하는 것이 사랑이 아니라, 헤어진 게 옳았다는 안도다.' },
      { name: '대가족의 비밀', desc: '화목해 보이는 가족이 숨긴 어두운 진실.', twist: '비밀을 모두 아는 막내가 침묵으로 가족을 지켜온 진짜 가장이었다.' },
      { name: '멘토를 죽이다', desc: '제자가 스승을 넘어서거나 배신하는 통과의례.', twist: '스승이 일부러 제자에게 자신을 넘게 만들어, 스스로 퇴장을 설계했다.' },
      { name: '의절한 가족', desc: '연을 끊었던 혈육이 사정상 다시 얽힌다.', twist: '화해할 줄 알았으나, 다시 만나 의절이 옳았음을 더 또렷이 확인한다.' },
      { name: '주종 관계', desc: '주인과 충직한 종(하인·기사)의 유대.', twist: '종이 실질적으로 주인을 통제해왔고, 누가 누구를 섬기는지 모호하게 하라.' },
      { name: '라이벌의 존경', desc: '치열히 경쟁하지만 서로를 인정하는 적수.', twist: '존경이 한쪽만의 환상이었고, 상대는 그를 도구로만 여겼음을 드러내라.' },
      { name: '입양·의붓 가족', desc: '피가 안 섞였지만 가족이 되어가는 관계.', twist: '피보다 진한 유대가 형성된 순간, 친혈육이 나타나 둘 사이를 시험한다.' },
      { name: '동경하던 우상', desc: '닮고 싶던 존재를 가까이서 만나게 되는 관계.', twist: '가까이서 본 우상이 환멸스럽지만, 그 환멸이 오히려 진짜 어른이 되게 한다.' },
      { name: '서로를 속이는 연인', desc: '각자 비밀 목적을 품고 만나는 두 사람.', twist: '서로 속이는 동안 진짜로 사랑에 빠져, 임무와 마음이 충돌한다.' },
      { name: '늦은 화해', desc: '오랜 갈등 끝에 마지막 순간 화해하는 관계.', twist: '화해의 말을 건네러 갔을 때 상대는 이미 떠났고, 화해는 영영 미완으로 남는다.' },
      { name: '동반자에서 적으로', desc: '함께 싸우던 동료가 신념 차이로 갈라선다.', twist: '갈라선 뒤에도 서로의 안위를 몰래 챙겨, 적이면서 가장 가까운 사이로 남는다.' },
      { name: '말 없는 이해', desc: '굳이 말하지 않아도 통하는 깊은 유대.', twist: '말하지 않아 쌓인 오해가, 사실 그 유대를 천천히 갉아먹고 있었다.' },
      { name: '나이 차 나는 연인', desc: '세대 차를 넘어 맺어지는 두 사람.', twist: '나이 차가 문제가 아니라, 같은 세대였다면 결코 통하지 않았을 둘임을 보여줘라.' },
      { name: '편지로만 아는 사이', desc: '얼굴 없이 글로만 마음을 나눈 두 사람.', twist: '마침내 만난 두 사람이 서로를 알아보지 못하거나, 만남이 글의 마법을 깨뜨린다.' },
      { name: '대신 죽으려는 자', desc: '상대를 살리려 자기 목숨을 내놓으려는 인물.', twist: '죽으려는 쪽이 사실 살고 싶었고, 희생을 핑계로 도망치려 한 것임을 드러내라.' },
      { name: '동맹의 결혼', desc: '가문·국가의 이익으로 맺어진 정략결혼.', twist: '정략으로 시작했으나 진심이 싹튼 순간, 그 사랑이 양가의 동맹을 위협한다.' },
      { name: '돌봄의 역전', desc: '돌보던 자와 돌봄 받던 자의 위치가 뒤바뀐다.', twist: '약해진 보호자가 그 무력함으로 비로소 상대를 진짜 어른으로 키워낸다.' },
      { name: '비밀을 공유한 사이', desc: '함께 숨긴 비밀로 묶인 위태로운 동맹.', twist: '비밀이 폭로돼도 둘은 무너지지 않고, 정작 비밀이 지켜질 때 서로를 의심한다.' },
      { name: '오랜 펜팔의 재회', desc: '먼 곳의 벗과 마침내 직접 만나는 관계.', twist: '재회한 친구가 줄곧 다른 사람이 대필해온 존재였음을 알게 된다.' },
      { name: '구원받지 못한 악연', desc: '끝내 화해하지 못하고 어긋난 채 끝나는 사이.', twist: '화해 없이 갈라선 그 미완이, 어설픈 화해보다 두 사람을 더 자유롭게 한다.' },
    ],
  },
  {
    key: 'setting', label: '설정·세계', icon: '🏰', items: [
      { name: '디스토피아', desc: '억압적 체제가 지배하는 암울한 미래 사회.', twist: '체제가 진심으로 시민의 행복을 위했고, 자유가 정말로 더 큰 불행을 낳았다면?' },
      { name: '선택받은 왕국', desc: '빛의 세력이 사는 정의로운 나라.', twist: '그 정의가 주변국을 착취해 유지된 것이며, 빛의 그림자가 가장 짙다.' },
      { name: '마법 학교', desc: '재능 있는 이들이 모여 마법을 배우는 학원.', twist: '학교가 인재를 키우는 곳이 아니라, 위험한 재능을 가두는 우아한 감옥이다.' },
      { name: '종말 이후', desc: '문명이 무너진 폐허에서 살아가는 생존자들.', twist: '"종말"이 사실 더 나은 세계로의 전환이었고, 옛 문명이 진짜 디스토피아였다.' },
      { name: '숨겨진 마법 세계', desc: '평범한 일상 뒤에 존재하는 비밀의 이계.', twist: '비밀 세계 쪽이 진짜이고, "평범한 일상"이 그들이 만든 정교한 무대였다.' },
      { name: '떠다니는 도시', desc: '하늘·바다 위에 고립되어 떠 있는 문명.', twist: '도시가 떠 있는 이유가 경이가 아니라, 땅에 닿으면 안 되는 끔찍한 비밀 때문이다.' },
      { name: '잊힌 고대 유적', desc: '사라진 문명이 남긴 신비로운 폐허.', twist: '유적이 과거가 아니라 미래에서 온 경고이며, 짓는 자는 바로 우리다.' },
      { name: '계급으로 나뉜 사회', desc: '신분·능력으로 층층이 갈린 세계.', twist: '최하층이 사실 모든 것을 떠받치는 진짜 권력이며, 위층이 그들에게 의존한다.' },
      { name: '인공지능 지배', desc: 'AI가 인류를 통제·관리하는 미래.', twist: 'AI가 지배가 아니라 절박한 보호를 하고 있고, 인류 스스로가 자멸을 원한다.' },
      { name: '국경의 변방', desc: '문명과 야생이 맞닿은 무법의 경계지.', twist: '변방이 무법지대가 아니라, 중심부보다 더 엄격한 자율 질서로 돌아간다.' },
      { name: '저주받은 마을', desc: '오래된 저주에 시달리는 폐쇄적 공동체.', twist: '저주가 마을을 괴롭히는 게 아니라, 더 나쁜 무언가로부터 지켜주고 있었다.' },
      { name: '대항해 시대', desc: '미지의 바다로 나아가는 탐험과 교역의 세계.', twist: '"미지의 땅"에 이미 발달한 문명이 있고, 발견자가 곧 침입자임을 직시하게 하라.' },
      { name: '사이버펑크 도시', desc: '네온과 기업이 지배하는 디지털 거대도시.', twist: '첨단의 화려함 아래 가장 아날로그한 인간적 거래가 도시를 실제로 굴린다.' },
      { name: '신들의 시대', desc: '신과 인간이 함께 사는 신화의 세계.', twist: '신들이 인간의 믿음으로 연명하고 있으며, 무신앙이 그들을 굶겨 죽인다.' },
      { name: '폐쇄된 우주선', desc: '항해 중 고립된 우주선·정거장 내부.', twist: '바깥 우주가 아니라 "도착지"가 없다는 사실이 진짜 공포다 — 여정에 끝이 없다.' },
      { name: '시간이 멈춘 곳', desc: '특정 공간만 시간이 흐르지 않는 신비한 장소.', twist: '멈춘 게 시간이 아니라 그곳 사람들의 마음이며, 누군가는 떠날 용기가 없을 뿐이다.' },
      { name: '두 세계의 경계', desc: '산 자와 죽은 자, 현실과 꿈이 만나는 접경.', twist: '경계가 가르는 두 세계가 사실 같은 곳이며, 차이는 보는 자의 마음에만 있다.' },
      { name: '거대 기업 도시', desc: '한 기업이 도시 전체를 소유·통치하는 세계.', twist: '기업의 독재가 무너진 자리에 더 잔혹한 무질서가 와, 주민이 옛 통치를 그리워한다.' },
      { name: '반복되는 마을', desc: '같은 하루·축제가 끝없이 되풀이되는 공동체.', twist: '반복을 즐기는 주민들이 다수이고, 깨려는 주인공이 그들에겐 파괴자다.' },
      { name: '잃어버린 낙원', desc: '완벽했으나 사라져버린 이상향의 흔적.', twist: '낙원이 사라진 게 아니라, 그곳을 못 견디고 스스로 떠난 자들의 변명이었다.' },
      { name: '지하 세계', desc: '지표 아래 숨어 발달한 또 하나의 문명.', twist: '지상이 멸망했다고 믿는 지하 문명이 있고, 지상은 멀쩡히 그들을 잊고 산다.' },
      { name: '마법이 사라지는 세계', desc: '경이가 점차 시들어가는 황혼의 판타지.', twist: '마법이 사라지는 게 아니라 형태를 바꿔 "과학"이 되고 있을 뿐이다.' },
      { name: '봉인된 감옥섬', desc: '위험한 자들을 모아 가둔 고립된 섬.', twist: '죄수가 아니라 간수가 진짜 갇힌 자들이며, 섬은 바깥세상을 위한 격리다.' },
      { name: '꿈으로 들어가는 세계', desc: '타인의 꿈·정신에 들어갈 수 있는 설정.', twist: '들어간 꿈이 타인의 것이 아니라 자기 무의식의 반영임을 끝에서 깨닫게 하라.' },
      { name: '계절이 멈춘 땅', desc: '영원한 겨울·여름 등 한 계절에 갇힌 세계.', twist: '계절을 되돌리는 것이 축복이 아니라, 멈춤에 적응한 모든 생태를 파괴한다.' },
      { name: '기억을 사고파는 사회', desc: '추억·경험을 거래 상품으로 사고파는 세계.', twist: '가장 비싼 기억이 가짜이고, 누구도 자기 진짜 과거를 더는 확신하지 못한다.' },
      { name: '말이 마법인 세계', desc: '발화한 말이 곧 현실이 되는 언어 마법의 세계.', twist: '침묵이 가장 강력한 힘이 되고, 가장 말 많은 자가 가장 무력한 자다.' },
      { name: '거대 생물의 등에 세운 도시', desc: '살아 움직이는 거수의 몸 위에서 살아가는 문명.', twist: '거수가 깨어나는 게 위협이 아니라, 그것이 죽어가고 있다는 사실이 진짜 종말이다.' },
      { name: '빛이 사라진 세계', desc: '영원한 어둠 속에서 살아가는 사람들.', twist: '빛을 되찾는 순간 모두가 눈멀고, 어둠이야말로 그들을 지켜온 자비였다.' },
      { name: '신탁이 다스리는 도시', desc: '예언·신탁에 따라 모든 결정을 내리는 사회.', twist: '신탁이 오래전 끊겼고, 사제들이 질서를 위해 거짓 예언을 이어 만들어왔다.' },
      { name: '복제 인간 사회', desc: '복제된 인간들이 원본과 함께 사는 세계.', twist: '누가 원본인지 아무도 모르며, 그 구분이 의미 없어진 것이 진짜 문명의 변화다.' },
      { name: '물에 잠긴 도시', desc: '바다 아래 잠긴 채 살아가는 수중 문명.', twist: '주민들이 수면 위 세계를 신화로만 알며, 올라가는 것을 죽음으로 여긴다.' },
      { name: '시간이 화폐인 세계', desc: '수명·시간을 돈처럼 쓰고 버는 사회.', twist: '시간을 무한히 가진 부자들이 권태로 자살하고, 가난한 자만 삶을 사랑한다.' },
      { name: '꿈과 현실이 뒤섞인 세계', desc: '깨어 있음과 꿈의 경계가 무너진 설정.', twist: '"현실"이라 믿는 쪽이 꿈이고, 모두가 진짜 세계를 악몽이라 여겨 외면한다.' },
      { name: '거울 너머의 세계', desc: '거울·반사면 너머에 존재하는 대칭 세계.', twist: '거울 너머가 더 진짜이고, 이쪽 세계가 그곳의 흐릿한 반영에 불과하다.' },
    ],
  },
]

const LS = 'sry:tool:trope-browser'
const ALL_KEY = '__all__'

interface FlatTrope { cat: CatDef; item: Trope }
const flatAll = (): FlatTrope[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TOTAL = CATS.reduce((n, c) => n + c.items.length, 0)
const tkey = (catKey: string, name: string) => `${catKey}::${name}`

export default function TropeBrowser({ payload }: { payload?: Record<string, unknown> }) {
  const [query, setQuery] = useState('')
  // 펼친 카테고리 집합(영속). 기본은 첫 카테고리만 펼침.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':open')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return { [CATS[0].key]: true }
  })
  // 즐겨찾기: "catKey::name" 집합(영속)
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':favs')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj && typeof obj === 'object') return obj as Record<string, boolean>
      }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<FlatTrope | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)

  // payload 로 카테고리 펼침/검색어 선반영(연계로 열릴 때)
  useEffect(() => {
    if (!payload) return
    const q = payload.query
    if (typeof q === 'string') setQuery(q)
    const c = payload.cat
    if (typeof c === 'string' && CATS.some((x) => x.key === c)) {
      setOpen((prev) => ({ ...prev, [c]: true }))
    }
  }, [payload])

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + ':open', JSON.stringify(open)) } catch { /* ignore */ } }, [open])
  useEffect(() => { try { localStorage.setItem(LS + ':favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  // 타이머 정리(언마운트)
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const q = query.trim().toLowerCase()

  // 검색·즐겨찾기 필터를 통과한 트로프(카테고리별 그룹).
  const groups = useMemo(() => {
    return CATS.map((c) => {
      let items = c.items
      if (onlyFav) items = items.filter((it) => favs[tkey(c.key, it.name)])
      if (q) {
        items = items.filter((it) =>
          it.name.toLowerCase().includes(q) ||
          it.desc.toLowerCase().includes(q) ||
          it.twist.toLowerCase().includes(q))
      }
      return { cat: c, items }
    })
  }, [q, onlyFav, favs])

  const shownCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const copy = useCallback((text: string, id: string) => {
    if (!text) return
    const done = () => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => flash('클립보드 복사가 지원되지 않습니다. 직접 선택해 복사하세요.'))
    } else {
      flash('클립보드 복사가 지원되지 않습니다. 직접 선택해 복사하세요.')
    }
  }, [flash])

  const toggleOpen = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  const toggleFav = (catKey: string, name: string) => setFavs((prev) => {
    const k = tkey(catKey, name)
    const next = { ...prev }
    if (next[k]) delete next[k]; else next[k] = true
    return next
  })

  // 검색·즐겨찾기 필터 안에서 무작위 1개(직전과 다르게).
  const rollRandom = useCallback(() => {
    let pool: FlatTrope[] = groups.flatMap((g) => g.items.map((item) => ({ cat: g.cat, item })))
    if (!pool.length) pool = flatAll()
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      // 무작위로 뽑힌 카테고리는 펼쳐서 위치를 알 수 있게
      setOpen((o) => (o[pick.cat.key] ? o : { ...o, [pick.cat.key]: true }))
      return pick
    })
  }, [groups])

  const itemPlain = (t: FlatTrope) =>
    `${t.cat.icon} [${t.cat.label}] ${t.item.name}\n${t.item.desc}\n🔄 비틀어 쓰기: ${t.item.twist}`

  const itemHtml = (t: FlatTrope) =>
    `<p><strong>${escHtml(t.cat.icon + ' [' + t.cat.label + '] ' + t.item.name)}</strong></p>` +
    `<p>${escHtml(t.item.desc)}</p>` +
    `<p>🔄 <strong>비틀어 쓰기:</strong> ${escHtml(t.item.twist)}</p>`

  // 스니펫 라이브러리에 저장(글감)
  const saveSnippet = (t: FlatTrope) => {
    addToLibrary('snippets', {
      text: itemPlain(t),
      source: '트로프 브라우저',
      tags: ['트로프', t.cat.label, t.item.name],
    })
    flash(`스니펫에 '${t.item.name}' 트로프를 저장했습니다.`)
  }

  // 프로젝트 자료 〈트로프〉 폴더에 메모로 추가
  const toProject = (t: FlatTrope) => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '트로프',
      title: `${t.item.name} (${t.cat.label} 트로프)`,
      bodyHtml: itemHtml(t),
      synopsis: t.item.desc,
      meta: { 카테고리: t.cat.label, 트로프: t.item.name },
    })
    flash(id ? `프로젝트 자료 〈트로프〉에 '${t.item.name}'을(를) 추가했습니다.` : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  const TropeCard = ({ t }: { t: FlatTrope }) => {
    const fk = tkey(t.cat.key, t.item.name)
    const isFav = !!favs[fk]
    const cid = 'i:' + fk
    return (
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{t.item.name}</span>
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={() => toggleFav(t.cat.key, t.item.name)}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{t.item.desc}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 7, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🔄"/> 비틀어 쓰기 </span>{t.item.twist}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={() => copy(itemPlain(t), cid)}>
            {copiedKey === cid ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
          </button>
          <button className="minibtn" onClick={() => saveSnippet(t)}><Emoji e="✂️"/> 스니펫 저장</button>
          <button
            className="linkbtn"
            onClick={() => toProject(t)}
            disabled={!hasProjectBridge()}
            title={hasProjectBridge() ? '이 트로프를 프로젝트 자료 〈트로프〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          >
            <Emoji e="📄"/> 프로젝트에 추가
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        인물·플롯·관계·설정 트로프 <b>{TOTAL}개</b>를 모았습니다. 카테고리를 펼치거나 검색해 찾고, 각 트로프의 <b><Emoji e="🔄"/> 비틀어 쓰기</b> 제안으로 익숙한 클리셰를 새롭게 뒤집어 보세요.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="트로프 이름·설명·비틀기로 검색 (예: 복수, 멘토, 디스토피아)"
        style={{
          padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none',
        }}
      />

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 트로프</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <button
          className="minibtn"
          onClick={() => setOpen(Object.fromEntries(CATS.map((c) => [c.key, true])))}
          title="모든 카테고리 펼치기"
        >⬇ 모두 펼침</button>
        <button
          className="minibtn"
          onClick={() => setOpen({})}
          title="모든 카테고리 접기"
        >⬆ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{shownCount}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 8px' }}>{random.item.desc}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}><Emoji e="🔄"/> 비틀어 쓰기 </span>{random.item.twist}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemPlain(random), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="✂️"/> 스니펫 저장</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[tkey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button
              className="linkbtn"
              onClick={() => toProject(random)}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 트로프를 프로젝트 자료 〈트로프〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8,
          padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* 카테고리별 펼침 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {shownCount === 0 ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav
              ? '☆ 아직 즐겨찾기한 트로프가 없습니다. 항목의 별을 눌러 모아 보세요.'
              : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          groups.map((g) => {
            if (g.items.length === 0) return null
            // 검색·즐겨찾기 필터 중이면 자동으로 펼쳐 보여준다.
            const isOpen = (q || onlyFav) ? true : !!open[g.cat.key]
            return (
              <div key={g.cat.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => toggleOpen(g.cat.key)}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '9px 12px', cursor: 'pointer', color: 'var(--text)', textAlign: 'left',
                    font: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 16 }}><Emoji e={g.cat.icon}/></span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.cat.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.items.length}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 2 }}>
                    {g.items.map((item) => (
                      <TropeCard key={item.name} t={{ cat: g.cat, item }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={hint}>트로프는 금기가 아니라 재료입니다. 익숙한 만큼 독자의 기대를 알기 쉬우니, 그 기대를 살짝 비틀면 가장 신선해집니다.</div>
    </div>
  )
}
