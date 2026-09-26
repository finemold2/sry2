// 반전 카드덱 — 서사 반전 아이디어 카드(로컬 120+)를 뽑아 보여주고 "내 이야기에 적용한다면?" 질문으로 발상을 자극한다.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(보관 카드)만 사용.
// 연계(linkbus): 현재 뽑은 반전 카드(들)와 적용 질문을 자료('research')/'영감 메모' 폴더에 메모로 추가한다.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'plot-twist-deck', name: '반전 카드덱', icon: '🃏', group: '영감·발상', intro: '서사 반전 카드를 뽑아 "내 이야기에 적용한다면?" 질문으로 발상을 자극하세요', w: 560, h: 560 }

const LS = 'sry:tool:plot-twist-deck'

interface TwistCard { id: number; cat: string; text: string; q: string }

// 카테고리별 색/이모지(분위기 구분용)
const CATS: Record<string, { icon: string; color: string }> = {
  정체: { icon: '🎭', color: 'var(--accent)' },
  배신: { icon: '🗡️', color: 'var(--warn)' },
  관계: { icon: '💔', color: '#e06c9f' },
  진실: { icon: '🔍', color: '#6ab0e0' },
  운명: { icon: '🌀', color: '#9b7ede' },
  시간: { icon: '⏳', color: '#e0a96a' },
  생사: { icon: '⚰️', color: 'var(--muted)' },
  현실: { icon: '🪞', color: '#5fc9a3' },
}

// 120+ 로컬 반전 카드. (text = 반전 아이디어, q = 적용 질문)
const RAW: [string, string, string][] = [
  // 정체
  ['정체', '조력자가 사실은 적의 첩자였다.', '내 이야기에서 주인공을 가장 가까이 도운 인물은 누구인가? 그가 적이었다면?'],
  ['정체', '악당과 주인공은 헤어진 혈육이었다.', '내 대립 구도의 두 인물에게 숨은 피의 연결을 준다면 무엇이 달라질까?'],
  ['정체', '주인공이 찾던 전설의 인물이 바로 자신이었다.', '주인공이 좇는 대상에 자기 자신의 그림자를 심을 수 있을까?'],
  ['정체', '평범한 단역이 모든 사건의 설계자였다.', '내 이야기에서 가장 눈에 안 띄는 인물에게 권능을 준다면?'],
  ['정체', '죽은 줄 알았던 인물이 다른 이름으로 곁에 있었다.', '내가 퇴장시킨 인물을 변장시켜 다시 들여보낼 수 있을까?'],
  ['정체', '멘토는 처음부터 주인공을 이용할 작정이었다.', '주인공을 이끈 스승의 진짜 동기를 비틀면 어떤 균열이 생길까?'],
  ['정체', '내레이터가 신뢰할 수 없는 거짓말쟁이였다.', '지금까지의 서술 중 어디까지가 거짓이었다고 밝힐 수 있을까?'],
  ['정체', '쌍둥이가 서로의 삶을 몰래 바꿔 살아왔다.', '내 인물 중 둘을 맞바꾸면 누구의 비밀이 드러날까?'],
  ['정체', '연인의 진짜 얼굴은 변장 아래 따로 있었다.', '가장 가까운 관계 뒤에 숨긴 또 다른 정체를 준다면?'],
  ['정체', '주인공이 추적하던 범인은 미래의 자신이었다.', '주인공이 쫓는 악인을 자신의 미래로 만들면 어떤 선택이 무서워질까?'],
  ['정체', '왕좌의 인물은 오래전 살해되고 대역이 다스려왔다.', '내 권력자를 가짜로 바꾸면 누가 그 비밀을 쥐고 있을까?'],
  ['정체', '구원자라 믿었던 존재가 재앙의 근원이었다.', '모두가 희망으로 떠받든 대상을 위협으로 뒤집을 수 있을까?'],
  ['정체', '주인공의 가장 큰 적은 그를 사랑하는 자였다.', '내 적대자의 행동에 사랑이라는 동기를 부여한다면?'],
  ['정체', '오랜 친구가 처음부터 존재하지 않은 환상이었다.', '주인공 곁의 한 사람을 환영으로 만들면 무엇이 무너질까?'],
  // 배신
  ['배신', '동료들이 미리 짜고 주인공을 함정에 빠뜨렸다.', '내 팀이 한 사람을 제물로 합의했다면 그 회의는 어땠을까?'],
  ['배신', '구해준 사람이 사실 모든 일을 꾸민 자였다.', '주인공을 위기에서 건진 인물에게 흑막의 역할을 준다면?'],
  ['배신', '주인공의 희생이 적의 계획에 꼭 필요한 마지막 조각이었다.', '주인공의 가장 숭고한 선택이 적을 돕는다면?'],
  ['배신', '약속을 지킨 단 한 사람이 가장 깊이 배신했다.', '신의의 상징이던 인물에게 배신의 칼을 쥐어준다면?'],
  ['배신', '주인공이 믿은 증거가 통째로 조작된 것이었다.', '결정을 떠받친 단서를 가짜로 바꾸면 무엇이 무효가 될까?'],
  ['배신', '아군의 승리가 사실 적과의 거래로 산 것이었다.', '내 진영의 영광 뒤에 더러운 거래를 숨길 수 있을까?'],
  ['배신', '배신자라 몰린 자가 유일한 충신이었다.', '내가 악인으로 그린 인물의 누명을 벗기면 누가 진짜 적이 될까?'],
  ['배신', '주인공이 지키려던 비밀을 곁의 사람이 이미 팔았다.', '주인공의 비밀은 언제, 누구에게 새어 나갔을까?'],
  // 관계
  ['관계', '평생 미워한 부모가 자신을 위해 악역을 자처했다.', '주인공의 원망 뒤에 숨은 부모의 희생을 드러낼 수 있을까?'],
  ['관계', '원수가 사실 어린 시절 생명을 구해준 사람이었다.', '미움의 대상에게 갚지 못한 은혜를 심으면 무엇이 흔들릴까?'],
  ['관계', '짝사랑하던 상대도 오래전부터 같은 마음이었다.', '엇갈림의 양쪽이 다 진심이었다면 무엇이 둘을 막았을까?'],
  ['관계', '버려졌다 믿은 아이를 부모는 평생 찾아다녔다.', '버림의 서사를 그리움의 서사로 뒤집으면 어떤 장면이 생길까?'],
  ['관계', '라이벌이 뒤에서 주인공의 길을 닦아주고 있었다.', '경쟁자에게 은밀한 응원을 준다면 둘의 마지막은 어떻게 될까?'],
  ['관계', '스승과 제자의 위치가 사실 정반대였다.', '가르치는 자와 배우는 자를 맞바꾸면 누가 더 성장할까?'],
  ['관계', '미워하던 형제가 자신의 죄를 대신 짊어졌다.', '주인공의 잘못을 누군가 조용히 떠안았다면 그는 누구일까?'],
  ['관계', '잊은 줄 알았던 첫사랑이 모든 사건의 그림자였다.', '과거의 인연을 현재 사건의 배후로 끌어오면 어떨까?'],
  // 진실
  ['진실', '주인공이 좇던 보물은 처음부터 가짜였다.', '여정의 목표를 허상으로 만들면 진짜 보상은 무엇이 될까?'],
  ['진실', '모두가 믿은 예언은 그것을 막으려다 실현되었다.', '예언을 피하려는 행동 자체가 예언을 이루게 한다면?'],
  ['진실', '주인공이 푼 사건의 범인은 처음에 무죄로 판단한 사람이었다.', '가장 먼저 용의선상에서 지운 인물을 진범으로 되돌린다면?'],
  ['진실', '영웅담은 패자가 미화해 쓴 거짓 역사였다.', '내 세계의 전설을 패배자의 변명으로 다시 쓰면?'],
  ['진실', '주인공이 지킨 규칙이 애초에 거짓 위에 세워졌다.', '주인공이 떠받든 질서의 토대를 거짓으로 만들면 무엇이 무너질까?'],
  ['진실', '잃어버린 기억 속에 모든 사건의 답이 묻혀 있었다.', '주인공이 잊은 하루에 진실을 숨기면 어떤 회상이 필요할까?'],
  ['진실', '진실을 밝히면 더 큰 거짓이 필요해진다.', '폭로가 구원이 아니라 새로운 함정이 된다면?'],
  ['진실', '주인공이 구한 세계가 애초에 멸망해야 했다.', '주인공의 선행이 더 큰 비극을 미룬 것뿐이라면?'],
  // 운명
  ['운명', '재앙을 막으려는 모든 시도가 재앙을 불렀다.', '주인공의 노력이 결과를 악화시키는 고리를 만들 수 있을까?'],
  ['운명', '선택받은 자는 실수로 지목된 엉뚱한 사람이었다.', '내 영웅이 자격 없는 우연의 산물이라면 어떤 부담을 질까?'],
  ['운명', '주인공이 증오한 운명을 스스로 설계했다.', '주인공이 자기 비극의 공범이었다면 어디서부터였을까?'],
  ['운명', '저주를 푸는 열쇠가 저주를 거는 행위와 같았다.', '해결과 파멸이 같은 행동이라면 주인공은 무엇을 택할까?'],
  ['운명', '구원의 대가는 주인공이 가장 사랑하는 것이었다.', '승리를 위해 무엇을 잃어야 한다면, 그건 누구일까?'],
  ['운명', '예언의 \'그자\'가 복수의 인물을 동시에 가리켰다.', '하나로 본 예언이 여럿을 뜻했다면 누가 진짜일까?'],
  ['운명', '주인공의 승리가 다음 세대의 비극을 심었다.', '오늘의 해결이 미래의 씨앗이 된다면 무엇을 남길까?'],
  // 시간
  ['시간', '지금의 사건은 먼 과거에 이미 결정돼 있었다.', '현재의 위기를 과거의 한 장면으로 거슬러 묶을 수 있을까?'],
  ['시간', '주인공은 같은 하루를 반복하고 있었다.', '내 인물이 시간에 갇혔다면 어느 하루를 고를까?'],
  ['시간', '미래에서 온 경고가 오히려 그 미래를 만들었다.', '경고가 자기실현 예언이 된다면 누가 보냈을까?'],
  ['시간', '두 사건은 사실 같은 시각에 일어난 한 사건이었다.', '떨어진 두 장면을 동시각으로 겹치면 무엇이 드러날까?'],
  ['시간', '회상이라 믿은 장면이 실은 미래였다.', '과거처럼 보인 회상을 미래로 뒤집으면 충격은 어디서 올까?'],
  ['시간', '주인공이 죽은 뒤의 세계를 이미 살고 있었다.', '내 인물이 자기 사후를 살고 있다면 언제 알아챌까?'],
  ['시간', '오랜 잠에서 깬 세상은 수백 년이 흐른 뒤였다.', '한 인물만 시간을 건너뛰게 하면 무엇을 잃고 무엇이 남을까?'],
  // 생사
  ['생사', '죽었다 믿은 인물이 사실 살아 숨어 있었다.', '내가 보낸 인물의 죽음을 위장으로 바꾸면 누가 알았을까?'],
  ['생사', '주인공은 이야기 내내 이미 죽은 자였다.', '주인공의 존재를 유령으로 재해석하면 단서는 무엇이었을까?'],
  ['생사', '되살아난 인물은 예전의 그가 아니었다.', '부활에 대가를 매기면 무엇이 바뀐 채 돌아올까?'],
  ['생사', '주인공이 구하려던 사람은 이미 오래전에 죽었다.', '구출의 목표가 헛것이었다면 주인공은 무엇을 좇은 걸까?'],
  ['생사', '살인의 피해자가 사실 가해자였다.', '희생자와 가해자의 역할을 뒤집으면 동정은 어디로 갈까?'],
  ['생사', '주인공의 죽음만이 모두를 살릴 수 있었다.', '유일한 해법이 주인공의 끝이라면 그 직전 무엇을 말할까?'],
  ['생사', '불멸이 축복이 아니라 가장 깊은 형벌이었다.', '영원히 사는 인물에게 죽음이 소원이 된다면?'],
  // 현실
  ['현실', '주인공이 사는 세계가 누군가의 꿈이었다.', '이 세계가 한 사람의 꿈이라면 깨어나면 무엇이 사라질까?'],
  ['현실', '눈앞의 현실은 정교하게 짜인 거대한 무대였다.', '주인공의 일상이 연출된 것이라면 관객은 누구일까?'],
  ['현실', '주인공의 기억은 통째로 이식된 것이었다.', '내 인물의 과거가 심어진 거짓이라면 진짜 그는 누구였을까?'],
  ['현실', '모든 등장인물이 한 사람의 분열된 자아였다.', '여러 인물을 한 마음의 조각들로 합치면 어떤 갈등이 될까?'],
  ['현실', '구원자는 사실 그들을 가둔 시스템의 일부였다.', '탈출을 돕는 존재가 감옥의 설계였다면?'],
  ['현실', '주인공이 깬 진실 너머에 또 다른 거짓이 있었다.', '한 겹을 벗기면 더 깊은 막이 나온다면 끝은 어디일까?'],
  // 정체(추가)
  ['정체', '예언자는 결과를 미리 알고 연기해온 사기꾼이었다.', '미래를 안다던 인물의 능력을 트릭으로 바꾸면?'],
  ['정체', '주인공을 노린 암살자는 자기 자신이 고용한 자였다.', '주인공이 무의식 중에 적을 불렀다면 동기는 무엇일까?'],
  ['정체', '신이라 믿어온 존재는 길 잃은 한 인간이었다.', '숭배의 대상을 평범한 사람으로 끌어내리면 신앙은 어떻게 될까?'],
  ['정체', '얼굴 없는 흑막은 주인공이 매일 보는 사람이었다.', '가장 익숙한 인물을 배후로 지목하면 어떤 단서가 보일까?'],
  ['정체', '괴물의 정체는 학대받아 변한 피해자였다.', '공포의 대상에게 연민의 사연을 주면 결말이 달라질까?'],
  // 배신(추가)
  ['배신', '주인공의 일기가 적의 손에서 작전 지도로 쓰였다.', '내 인물의 사적 기록이 무기가 되면 누가 그걸 읽었을까?'],
  ['배신', '평화 협정은 학살을 위한 미끼였다.', '내 이야기의 화해 장면에 함정을 숨길 수 있을까?'],
  ['배신', '주인공을 구한 영웅적 행동은 카메라를 위한 연기였다.', '선행이 보여주기였다면 관객 없는 곳에서 그는 어땠을까?'],
  ['배신', '조직을 무너뜨린 내부 고발자가 진짜 우두머리였다.', '정의의 폭로자를 흑막으로 바꾸면 동기는 무엇일까?'],
  // 관계(추가)
  ['관계', '평생의 은인이 사실 모든 불행의 원인이었다.', '감사의 대상에게 비극의 책임을 지우면 마음은 어디로 갈까?'],
  ['관계', '가장 가까운 친구가 같은 사람을 사랑하고 있었다.', '우정과 사랑이 한 대상에서 충돌하면 누가 먼저 물러설까?'],
  ['관계', '주인공이 미워한 계모가 친어머니였다.', '관계의 명칭 하나를 뒤집으면 과거의 행동이 어떻게 보일까?'],
  ['관계', '입양된 적의 자식을 주인공이 길러왔다.', '원수의 핏줄을 품에 두면 복수와 사랑이 어떻게 부딪칠까?'],
  // 진실(추가)
  ['진실', '구출 작전의 인질은 자발적으로 잡힌 공범이었다.', '구해야 할 대상이 사실 적의 편이라면 언제 들통날까?'],
  ['진실', '주인공이 따른 \'유언\'은 누군가 위조한 것이었다.', '고인의 뜻이라 믿은 명령을 가짜로 만들면 무엇이 무너질까?'],
  ['진실', '재난의 책임자는 그것을 막으려던 사람이었다.', '예방하려던 자가 원인이 되는 아이러니를 넣을 수 있을까?'],
  ['진실', '주인공이 평생 지킨 비밀을 모두가 이미 알고 있었다.', '혼자만의 비밀이 공공연한 것이었다면 침묵의 이유는?'],
  // 운명(추가)
  ['운명', '주인공을 살린 우연이 사실 정교한 설계였다.', '행운이라 여긴 사건을 누군가의 계획으로 바꾸면?'],
  ['운명', '저주는 풀린 게 아니라 다음 사람에게 옮겨갔다.', '구원의 대가를 다른 인물에게 전가하면 죄책감은 어디로?'],
  ['운명', '주인공이 거부한 운명을 거부함으로써 완성했다.', '저항이 곧 성취가 되는 고리를 만들 수 있을까?'],
  // 시간(추가)
  ['시간', '편지는 보낸 적 없는 미래의 자신에게서 왔다.', '시간을 건넌 메시지를 넣으면 누가 누구에게 무엇을 경고할까?'],
  ['시간', '주인공이 막은 사건은 이미 일어난 뒤였다.', '예방의 노력이 사후약방문이었다면 그는 무엇을 본 걸까?'],
  ['시간', '두 세대의 이야기가 사실 동일 인물의 윤회였다.', '서로 다른 시대의 인물을 한 영혼으로 묶으면?'],
  // 생사(추가)
  ['생사', '장례를 치른 인물이 누군가를 대신해 죽은 척했다.', '거짓 죽음으로 누구를 지키려 했을지 상상해볼까?'],
  ['생사', '되살리는 의식은 또 다른 죽음을 요구했다.', '부활의 등가교환을 넣으면 누가 자리를 내줄까?'],
  ['생사', '주인공은 이미 여러 번 죽고 되살아나 왔다.', '반복된 죽음의 기억을 일부만 남기면 어떤 균열이 생길까?'],
  // 현실(추가)
  ['현실', '주인공이 탈출한 곳 밖이 더 정교한 감옥이었다.', '자유라 믿은 바깥을 또 다른 통제로 만들면 끝은 어디일까?'],
  ['현실', '도시 전체가 한 사람을 위해 꾸며진 연극이었다.', '주인공만 모르는 무대극을 설정하면 출연료는 누가 받을까?'],
  ['현실', '주인공의 적은 그가 잠든 사이의 또 다른 인격이었다.', '낮과 밤의 자아를 적으로 만들면 누가 진짜일까?'],
  // 정체(추가2)
  ['정체', '주인공을 키운 노부부는 임무를 맡은 감시자였다.', '가족이라 믿은 이들이 임무 수행자였다면 정은 진짜였을까?'],
  ['정체', '평생의 라이벌은 사실 한 사람이 연기한 여러 가면이었다.', '여러 적을 한 인물로 합치면 어떤 동기가 일관될까?'],
  ['정체', '구세주의 예언서를 쓴 자가 바로 악당이었다.', '희망의 텍스트를 적이 썼다면 무엇을 노린 걸까?'],
  ['정체', '주인공이 동경한 영웅은 그의 미래가 타락한 모습이었다.', '롤모델을 주인공의 어두운 미래로 만들면 어떤 경고가 될까?'],
  // 배신(추가2)
  ['배신', '주인공의 첫 스승이 마지막 보스였다.', '시작과 끝을 한 인물로 잇는 원형 구조를 만들 수 있을까?'],
  ['배신', '망명을 도운 손길이 그를 적국에 팔아넘기는 거래였다.', '도움의 형식을 띤 거래를 넣으면 누가 값을 치를까?'],
  ['배신', '주인공이 풀어준 죄수가 마을을 불태운 장본인이었다.', '주인공의 자비가 재앙을 부른다면 책임은 누구에게?'],
  // 관계(추가2)
  ['관계', '서로를 모르는 두 주인공이 같은 사람을 애도하고 있었다.', '낯선 두 시점을 한 죽음으로 묶으면 어떻게 만날까?'],
  ['관계', '복수의 표적이 알고 보니 주인공의 구원자였다.', '갚을 원한과 갚을 은혜가 한 사람이라면 무엇을 택할까?'],
  ['관계', '주인공을 가장 깊이 이해한 건 그가 만든 적이었다.', '적대자에게 가장 정확한 이해를 부여하면 대화가 어떻게 변할까?'],
  // 진실(추가2)
  ['진실', '주인공이 수호한 성물은 봉인이 아니라 봉인을 푸는 열쇠였다.', '지켜온 물건의 기능을 정반대로 뒤집으면?'],
  ['진실', '모두가 본 \'기적\'은 한 사람의 자기희생을 가린 연출이었다.', '신비 뒤에 인간의 헌신을 숨기면 어떤 진실이 슬플까?'],
  ['진실', '주인공이 폭로한 음모가 더 큰 음모의 미끼였다.', '한 진실의 폭로를 더 깊은 함정으로 설계할 수 있을까?'],
  // 운명(추가2)
  ['운명', '주인공이 살린 아이가 훗날 세상을 파괴한다.', '구원의 대상에게 미래의 파국을 심으면 지금의 선택은?'],
  ['운명', '예언이 가리킨 \'멸망\'은 옛 세계의 끝이자 새 세계의 시작이었다.', '파국을 재탄생으로 다시 정의하면 결말의 색이 어떻게 변할까?'],
  // 시간(추가2)
  ['시간', '주인공이 기다린 \'그날\'은 이미 지나가 버렸다.', '학수고대한 순간을 놓친 뒤에 시작한다면 무엇이 남을까?'],
  ['시간', '오래된 사진 속 낯선 이가 미래의 주인공이었다.', '과거의 단서에 미래의 자신을 숨겨둘 수 있을까?'],
  // 생사(추가2)
  ['생사', '주인공이 애도한 죽음은 그를 살리기 위한 대역이었다.', '누군가 주인공 대신 죽었다면 진실은 언제 밝혀질까?'],
  ['생사', '죽음을 정복한 자들의 도시는 멈춘 시간 속 무덤이었다.', '영생의 낙원을 정체된 죽음으로 그리면 어떤 풍경일까?'],
  // 현실(추가2)
  ['현실', '주인공의 모든 선택은 미리 정해진 각본이었다.', '자유의지가 환상이었다면 주인공은 어떻게 저항할까?'],
  ['현실', '세상을 구한 영웅은 시뮬레이션 속 데이터였다.', '내 세계가 가상이라면 누가, 무엇을 위해 돌리고 있을까?'],
  ['현실', '주인공이 깨어난 \'진짜 세계\'가 또 다른 꿈이었다.', '각성의 끝을 또 다른 층으로 만들면 독자는 어디까지 믿을까?'],
  // 마무리 확장
  ['정체', '온 세상이 찾던 마지막 생존자는 줄곧 군중 속에 있었다.', '모두가 좇는 대상을 가장 평범한 자리에 숨기면?'],
  ['배신', '주인공의 승리 선언이 적의 마지막 함정을 작동시켰다.', '환호의 순간을 파국의 방아쇠로 만들 수 있을까?'],
  ['관계', '미워한 형제가 사실 주인공의 모든 영광을 양보해왔다.', '경쟁의 승리가 양보의 결과였다면 자존심은 어떻게 무너질까?'],
  ['진실', '구원의 메시지는 절망에 빠뜨리기 위한 거짓 희망이었다.', '희망을 무기로 쓴 적을 그리면 어떤 잔인함이 드러날까?'],
  ['운명', '주인공이 끊으려 한 비극의 사슬을 그 행동이 이어버렸다.', '단절의 시도가 연결이 되는 고리를 어디에 둘까?'],
  ['시간', '주인공이 만난 미래의 자신은 그를 막으러 온 적이었다.', '미래의 나를 현재의 적으로 세우면 무엇이 옳은 길일까?'],
  ['생사', '죽음으로 끝난 줄 안 이야기가 사후에야 시작되었다.', '결말 같던 죽음을 새 출발점으로 삼으면 무엇이 열릴까?'],
  ['현실', '주인공이 읽던 책이 곧 자신이 갇힌 세계였다.', '인물이 자기 세계가 \'이야기\'임을 알면 어떻게 행동할까?'],
]

const ALL: TwistCard[] = RAW.map((r, i) => ({ id: i, cat: r[0], text: r[1], q: r[2] }))

// Fisher-Yates 셔플
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// HTML 이스케이프 — 프로젝트 본문(HTML) 주입 안전화.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 프로젝트 '영감 메모' 본문(HTML) 생성 — 뽑은 반전 카드(들)와 적용 질문을 단락 HTML 로.
function drawnBodyHtml(cards: TwistCard[]): string {
  return cards.map((c) => (
    `<p><strong>🃏 [${escHtml(c.cat)}] ${escHtml(c.text)}</strong></p>` +
    `<p>❓ 내 이야기에 적용한다면? ${escHtml(c.q)}</p>`
  )).join('')
}

interface Saved { id: number; cat: string; text: string; q: string; note: string }

export default function PlotTwistDeck() {
  const [drawCount, setDrawCount] = useState(1)
  const [drawn, setDrawn] = useState<TwistCard[]>([])
  const [saved, setSaved] = useState<Saved[]>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.text === 'string').map((s) => ({
            id: typeof s.id === 'number' ? s.id : -1,
            cat: typeof s.cat === 'string' ? s.cat : '반전',
            text: String(s.text),
            q: typeof s.q === 'string' ? s.q : '',
            note: typeof s.note === 'string' ? s.note : '',
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })
  const [tab, setTab] = useState<'deck' | 'saved'>('deck')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)

  // 보관 카드 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(saved)) } catch { /* 저장 실패 graceful */ }
  }, [saved])

  // 복사 피드백 타이머 정리(언마운트/재설정)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(''), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const draw = () => {
    const my = ++nonce.current
    const n = Math.min(Math.max(1, drawCount), Math.min(6, ALL.length))
    const picked = shuffle(ALL).slice(0, n)
    if (my === nonce.current) {
      setDrawn(picked)
      setTab('deck')
    }
  }

  const savedHas = (id: number) => saved.some((s) => s.id === id)

  const toggleSave = (c: TwistCard) => {
    setSaved((prev) => {
      if (prev.some((s) => s.id === c.id)) return prev.filter((s) => s.id !== c.id)
      return [{ id: c.id, cat: c.cat, text: c.text, q: c.q, note: '' }, ...prev]
    })
  }

  const removeSaved = (id: number) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const setNote = (id: number, note: string) =>
    setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)))

  const moveSaved = (id: number, dir: -1 | 1) => {
    setSaved((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const ni = idx + dir
      if (ni < 0 || ni >= prev.length) return prev
      const a = prev.slice()
      ;[a[idx], a[ni]] = [a[ni], a[idx]]
      return a
    })
  }

  const copyText = (key: string, text: string) => {
    if (!navigator.clipboard) { setCopied('unsupported:' + key); return }
    navigator.clipboard.writeText(text)
      .then(() => setCopied(key))
      .catch(() => setCopied('fail:' + key))
  }

  const cardToText = (c: { cat: string; text: string; q: string }) =>
    `🃏 [${c.cat}] ${c.text}\n❓ ${c.q}`

  const copyAllDrawn = () => {
    if (!drawn.length) return
    copyText('all', drawn.map(cardToText).join('\n\n'))
  }

  // 프로젝트 연동 — 현재 뽑은 반전 카드(들)와 적용 질문을 자료(research)/'영감 메모' 폴더에 메모로 추가.
  const toProject = () => {
    if (!drawn.length) return
    if (!hasProjectBridge()) { setCopied('project:unlinked'); return }
    const cats = Array.from(new Set(drawn.map((c) => c.cat)))
    const title = drawn.length === 1
      ? `반전 메모 — ${drawn[0].text}`
      : `반전 메모 — ${drawn.length}장 (${cats.join('·')})`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title,
      bodyHtml: drawnBodyHtml(drawn),
      synopsis: drawn.map((c) => `[${c.cat}] ${c.text}`).join(' / '),
      meta: { 카테고리: cats.join(', '), 카드수: String(drawn.length) },
    })
    setCopied(id ? 'project:ok' : 'project:fail')
  }

  const catColor = (cat: string) => CATS[cat]?.color || 'var(--accent)'
  const catIcon = (cat: string) => CATS[cat]?.icon || '🃏'

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  const Badge = ({ cat }: { cat: string }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: catColor(cat), border: `1px solid ${catColor(cat)}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      <Emoji e={catIcon(cat)} /> {cat}
    </span>
  )

  return (
    <div style={wrap}>
      <div style={hint}>
        서사 <b>반전 카드</b>를 뽑아 "내 이야기에 적용한다면?" 질문으로 발상을 자극하세요. 마음에 드는 카드는 <b>보관</b>해 메모를 남길 수 있습니다.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('deck')} aria-pressed={tab === 'deck'}
          style={{ borderColor: tab === 'deck' ? 'var(--accent)' : 'var(--border)', color: tab === 'deck' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🃏" /> 덱 ({ALL.length})
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐" /> 보관함 ({saved.length})
        </button>
      </div>

      {tab === 'deck' && (
        <>
          {/* 뽑기 개수 조절 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>한 번에</span>
            {[1, 2, 3].map((n) => (
              <button key={n} className="minibtn" onClick={() => setDrawCount(n)} aria-pressed={drawCount === n}
                style={{ borderColor: drawCount === n ? 'var(--accent)' : 'var(--border)', color: drawCount === n ? 'var(--text)' : 'var(--muted)', minWidth: 36 }}>
                {n}장
              </button>
            ))}
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={draw}><Emoji e="🔀" /> 카드 뽑기 / 다시 섞기</button>
          </div>

          {/* 뽑은 카드 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
            {drawn.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🃏" /></div>
                덱을 섞어 카드를 뽑아보세요.<br />
                <span style={{ fontSize: 12 }}>총 {ALL.length}장의 반전 아이디어가 기다립니다.</span>
              </div>
            )}
            {drawn.map((c) => {
              const sv = savedHas(c.id)
              const k = 'd' + c.id
              return (
                <div key={c.id} style={cardBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge cat={c.cat} />
                    <span style={{ flex: 1 }} />
                    <button className="minibtn" onClick={() => toggleSave(c)} title={sv ? '보관 해제' : '보관'}
                      style={{ borderColor: sv ? 'var(--accent)' : 'var(--border)' }}>
                      {sv ? <><Emoji e="⭐" /> 보관됨</> : '☆ 보관'}
                    </button>
                    <button className="minibtn" onClick={() => copyText(k, cardToText(c))} title="복사">
                      {copied === k ? '✓' : <Emoji e="📋" />}
                    </button>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{c.text}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                    <span style={{ color: catColor(c.cat), fontWeight: 700 }}>내 이야기에 적용한다면? </span>{c.q}
                  </div>
                </div>
              )
            })}
          </div>

          {drawn.length > 1 && (
            <button className="minibtn" onClick={copyAllDrawn}>{copied === 'all' ? '✓ 전체 복사됨' : <><Emoji e="📋" /> 뽑은 {drawn.length}장 모두 복사</>}</button>
          )}

          {/* 프로젝트 연계 — 현재 뽑은 카드(들)와 적용 질문을 '영감 메모'로 저장 */}
          <div className="linkbar">
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={toProject}
              disabled={!drawn.length || !hasProjectBridge()}
              title={
                !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
                : !drawn.length ? '먼저 카드를 뽑아주세요'
                : '뽑은 반전 카드와 적용 질문을 프로젝트 자료(영감 메모 폴더)에 추가'
              }
            >
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>

          {copied === 'project:ok' && <div style={{ ...hint, color: 'var(--ok)' }}>✓ 프로젝트 자료(영감 메모)에 추가했어요.</div>}
          {copied === 'project:unlinked' && <div style={hint}>프로젝트에 연결되어 있지 않습니다.</div>}
          {copied === 'project:fail' && <div style={hint}>프로젝트 추가에 실패했어요.</div>}
          {copied.startsWith('unsupported') && <div style={hint}>이 환경에서는 클립보드 복사가 지원되지 않습니다.</div>}
          {copied.startsWith('fail') && <div style={hint}>복사에 실패했습니다. 직접 선택해 복사해 주세요.</div>}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
              보관한 카드가 없습니다.<br />
              <span style={{ fontSize: 12 }}>덱에서 ☆ 보관을 눌러 마음에 드는 반전을 모아보세요.</span>
            </div>
          )}
          {saved.map((s, i) => {
            const k = 's' + s.id
            return (
              <div key={s.id + '-' + i} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge cat={s.cat} />
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => moveSaved(s.id, -1)} disabled={i === 0} title="위로">▲</button>
                  <button className="minibtn" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1} title="아래로">▼</button>
                  <button className="minibtn" onClick={() => copyText(k, cardToText(s) + (s.note ? `\n📝 ${s.note}` : ''))} title="복사">
                    {copied === k ? '✓' : <Emoji e="📋" />}
                  </button>
                  <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{s.text}</div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}><Emoji e="❓" /> {s.q}</div>
                <textarea
                  value={s.note}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="이 반전을 내 이야기에 어떻게 쓸지 메모…"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    background: 'var(--paper)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '8px 10px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      <div style={hint}>카드는 출발점일 뿐입니다. 같은 반전도 내 인물·상황에 맞춰 자유롭게 비틀어 보세요.</div>
    </div>
  )
}
