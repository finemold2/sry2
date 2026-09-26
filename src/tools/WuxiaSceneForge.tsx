// 무협 장면 생성기(WuxiaSceneForge) — 무협 장르 특화 '장면' 생성 도구.
//   도시에의 서사 장치(기연·은원·비무·사이다·주화입마·정체 은닉·합공 등)를 '전개 의도(beat)' 슬롯으로 두고,
//   장소(강호 좌표) × 시각·기상 × 시점 인물(무림 신분) × 전개 의도 × 적/상대 × 충돌·장애 × 전환·한 수
//   단일 슬롯에 '무공·합(合) 디테일' 다중 슬롯(2개) + '감각 디테일' 다중 슬롯(2개)을 곱해 한 '장면 글감'을 만든다.
//   마음에 드는 칸은 🔒로 잠그고 나머지만 🎲 재생성. 조합수 1조 이상.
// 자급식: react 와 './linkbus' 만 import. 외부 API·네트워크 없음(전부 로컬 자작 데이터).
//   Math.random + localStorage('sry:tool:wuxia-sceneforge') 만 사용. 언마운트 정리.
// 연계: 공유 스니펫 라이브러리(addToLibrary('snippets')) + 장소 라이브러리(addToLibrary('places'))
//   + 프로젝트 원고(addToProject kind:text, root:draft, folder:'장면') + 관련 도구 열기(openToolLinked). payload.genre 맥락 배지.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'wuxia-sceneforge',
  name: '무협 장면 생성기',
  icon: '⚔️',
  group: '생성기',
  genre: '무협',
  intro: '강호 좌표·신분·전개 의도·은원·한 수·무공 합을 조합해 무협 장면 글감을 만드세요',
  w: 600,
  h: 700,
}

const LS_KEY = 'sry:tool:wuxia-sceneforge'

// ── 슬롯 풀(전부 자작·무협 특화·구체적, 도시에 근거) ──────────────────────
// 단일 슬롯: place / weather / pov / beat / foe / obstacle / turn
// 다중 슬롯: martial(무공·합 디테일 2개), sensory(감각 디테일 2개) — 조합수를 1조 이상으로 키운다.

// 장소(강호 좌표) — 객잔·표국·구파일방·세가·마교·새외·기연 비동 등 도시에의 공간 클리셰
const PLACES = [
  '비 새는 변두리 객잔(客棧) 이 층 구석 자리',
  '표국(鏢局)의 짐수레가 멈춰 선 황하 나루터',
  '소림사 장경각(藏經閣) 뒤편 달마동 입구',
  '무당산 자소궁(紫霄宮) 운무에 잠긴 검수련장',
  '화산 절벽길, 두 봉우리를 잇는 외나무 잔도(棧道)',
  '아미파 금정(金頂)으로 오르는 천 계단 중턱',
  '사천당문(唐門)의 독무가 어린 암기 시험장',
  '남궁세가(南宮世家) 검총(劍塚)의 비석 숲',
  '개방(丐幇) 분타가 자리 잡은 낙양 저잣거리 뒷골목',
  '마교(魔敎) 총단으로 통하는 혈교혈로(血敎血路)의 동굴',
  '천마신교 옥좌가 놓인 마전(魔殿)의 검은 돌계단 위',
  '새외(塞外) 설산을 넘는 마방(馬幇)의 마지막 고갯마루',
  '서장(西藏) 밀교 사원의 만다라 벽화 회랑',
  '북해빙궁(北海氷宮) 만년한옥(萬年寒玉)이 깔린 빙실',
  '절벽 아래로 추락한 끝, 등나무에 걸린 비동(秘洞) 입구',
  '전대 고수의 백골과 심법서가 놓인 동굴 깊은 곳',
  '무림맹(武林盟) 총단 대청, 군웅이 늘어선 의사청',
  '비무대회가 열린 항주 서호(西湖)의 물 위 비무대',
  '오악검파가 모인 화산논검(華山論劍)의 절정 봉우리',
  '녹림(綠林) 산채로 오르는 산적 잠복의 협곡 길목',
  '도박장과 기루가 뒤엉킨 운하 도시의 홍등 거리',
  '제갈세가의 기문진(奇門陣)이 펼쳐진 미궁 같은 죽림',
  '폐허가 된 옛 문파의 무너진 연무장과 깨진 현판 아래',
  '독인(毒人)의 약초밭이 들어선 안개 자욱한 묘강(苗疆) 늪지',
  '살막(殺幕)의 살수들이 모이는 폐사찰 지하 밀실',
  '신병이기(神兵利器)를 벼리는 산속 대장간의 화로 앞',
  '강을 건너는 마지막 나룻배 위, 사방이 물뿐인 강심(江心)',
  '관(官)의 포졸이 깔린 성문 검문소를 지나는 새벽 길',
  '의원(醫院)의 약 냄새 짙은 뒷방, 빈사의 환자가 누운 자리',
  '주화입마로 폐관(閉關)한 동굴 석실, 봉인된 철문 안쪽',
  '문주의 영전(靈前)이 차려진 상가, 흰 만장이 나부끼는 마당',
  '눈 덮인 매화 숲 정자, 술상 하나를 사이에 둔 자리',
  '대막(大漠) 한가운데 모래폭풍이 잦아든 폐성(廢城) 우물가',
  '장강(長江) 삼협의 급류 위, 흔들리는 객선 갑판',
  '천 길 벼랑 끝 운해(雲海)를 굽어보는 망검대(望劍臺)',
]

// 시각·기상 — 무협 특유의 시각·날씨 정조
const WEATHERS = [
  '동이 트기 직전, 검푸른 새벽안개가 검끝에 맺히는 시각',
  '매화비(梅花雨)가 추적추적 내리는 늦봄의 오후',
  '핏빛 노을이 강물을 붉게 물들이는 황혼 무렵',
  '천둥이 산을 울리고 번개가 칼날처럼 내리꽂는 한밤',
  '첫눈이 소리 없이 검집 위로 쌓이는 겨울 새벽',
  '보름달이 칼을 비추어 그림자 둘을 만드는 깊은 밤',
  '장맛비가 사흘째 그치지 않아 강이 넘실대는 흐린 날',
  '대막의 모래바람이 시야를 지우는 메마른 한낮',
  '서리가 풀잎마다 하얗게 앉은 살을 에는 이른 아침',
  '운무가 산허리를 휘감아 발밑이 보이지 않는 정오',
  '낙엽이 핏빛으로 흩날리는 늦가을 서늘한 저녁',
  '함박눈이 천지를 덮어 발소리마저 묻히는 한겨울 자정',
  '폭염에 매미 소리가 끊긴 무더운 한낮의 정적',
  '강 위로 물안개가 자욱이 피어오르는 어스름 새벽',
  '진눈깨비가 살갗을 저릿하게 때리는 고갯마루의 저물녘',
  '별이 쏟아지고 은하가 칼처럼 하늘을 가르는 청명한 밤',
  '비 갠 뒤 무지개가 폭포 위에 걸린 맑은 아침',
  '삭풍이 설산을 할퀴어 입김마저 얼어붙는 그믐의 칠흑',
]

// 시점 인물(무림 신분) — 도시에의 신분·내력 위계, 정체 은닉/회귀 포함
const POVS = [
  '폐인(廢人) 취급받던 문파 말석의 막내 제자',
  '사문이 몰살당해 홀로 살아남은 비운의 검수(劍手)',
  '죽기 직전 절대고수의 의발(衣鉢)을 물려받은 약관의 후인',
  '정체를 숨긴 채 떠도는 마교 교주의 숨겨진 후계',
  '무재(無才)라 비웃음당했으나 특이체질(천맥·구음절맥)을 지닌 소년',
  '한 수에 승부를 보는 고독한 낭인(浪人) 검객',
  '은원이 분명한 사파(邪派)의 젊은 살수',
  '미래를 아는 채 약자 시절로 돌아온 회귀자(回歸者)',
  '천하제일을 노리는 정파 명문세가의 후기지수(後起之秀)',
  '단전이 폐해져 무공을 잃은 전대(前代)의 절정고수',
  '강호 정보를 손바닥처럼 꿰는 개방의 칠결제자(七結弟子)',
  '독과 암기로 정면 무력의 빈틈을 노리는 당문의 여식(女息)',
  '복수만을 위해 마공(魔功)에 손댄 멸문 가문의 유일한 핏줄',
  '비무를 빌미로 적의 허실을 떠보러 온 위장한 첩자',
  '주화입마의 문턱에서 심마(心魔)와 싸우는 폐관 수련자',
  '신병이기를 벼리는 일대(一代)의 야장(冶匠) 출신 무인',
  '관(官)에서 강호로 흘러든 전직 포두(捕頭)',
  '천하를 떠도는 술 좋아하는 늙은 검선(劍仙) 풍의 기인',
  '문파의 명운을 짊어진 차기 장문인 후보',
  '얼굴을 가린 채 약자를 돕고 사라지는 정체불명의 협객',
]

// 전개 의도(beat) — '이 장면이 무엇을 하는가'(도시에의 서사 장치·전개 패턴을 의도화)
const BEATS = [
  { tag: '기연', text: '절벽 아래 비동에서 전대 고수의 심법서와 영약을 손에 넣어 무공이 도약하는' },
  { tag: '전수', text: '죽어가는 절대고수가 마지막 숨으로 절학(絶學)과 유지(遺志)를 물려주는' },
  { tag: '주화입마', text: '무리한 운기로 진기가 역류해 주화입마의 문턱에서 심마와 사투를 벌이는' },
  { tag: '은원', text: '사문·가족을 몰살한 원수와 마침내 마주쳐 은원을 셈하는' },
  { tag: '사이다', text: '얕보던 자들 앞에서 숨겨둔 실력을 드러내 단숨에 응징하고 경악시키는' },
  { tag: '정체은닉', text: '진짜 정체를 끝까지 감춘 채 적의 한복판에서 본색을 떠보는' },
  { tag: '비무', text: '공식 비무(比武)의 무대에서 초식을 주고받으며 서열을 가르는' },
  { tag: '논검', text: '검을 겨루기 전 말로써 무리(武理)와 도(道)를 논하며 기싸움하는' },
  { tag: '쟁탈', text: '천하를 가를 비급(秘笈)·신병을 두고 군웅이 뒤엉켜 쟁탈하는' },
  { tag: '배신', text: '믿었던 동료·사형이 등을 돌려 칼끝을 겨누는 배신이 드러나는' },
  { tag: '합공', text: '절대강자를 진법·연수합격(聯手合擊)으로 에워싸 함께 꺾으려는' },
  { tag: '구출', text: '인질로 잡힌 사람을 적진 깊숙이 들어가 빼내오는' },
  { tag: '추격', text: '경공(輕功)을 펼쳐 지붕을 타고 달아나거나 쫓는 숨 막히는' },
  { tag: '출도', text: '처음으로 강호에 발을 디뎌 첫 시련을 겪고 이름을 알리는' },
  { tag: '귀은', text: '모든 은원을 정리하고 검을 거두어 강호를 떠나려는' },
  { tag: '결의', text: '술잔을 나누며 의(義)로 형제·동맹의 연을 맺는' },
  { tag: '재기', text: '폐인이 된 단전을 다른 길로 우회해 다시 일어서는' },
  { tag: '진실', text: '최종보스가 사부·혈육·은인이었다는 충격적 진상이 밝혀지는' },
  { tag: '독계', text: '독·암기·기관(機關)으로 정면 무력을 무력화하는 책략이 펼쳐지는' },
  { tag: '대전', text: '정사대전·마교 침공 등 강호 전체가 맞붙는 결전이 벌어지는' },
]

// 적/상대 — 정사마·새외·내부 위협을 망라
const FOES = [
  '얼굴 가득 음흉한 웃음을 띤 사파의 노고수(老高手)',
  '오만하게 턱을 치켜든 명문세가의 천재 후기지수',
  '검은 무복(武服)에 마기(魔氣)를 흘리는 마교 호법(護法)',
  '독사 같은 눈빛의 당문 암기 명인',
  '한 수에 사람을 베는 살막의 일급 살수',
  '천하제일을 자처하는 무림맹의 노련한 장로',
  '새외에서 넘어온 빙공(氷功)의 라마승(喇嘛僧)',
  '수십 명을 거느린 녹림 산채의 우두머리',
  '진법으로 사람을 가두는 제갈세가의 책사(策士)',
  '술에 취한 척 빈틈을 내보이는 정체 모를 노개(老丐)',
  '한때 사형이었으나 마공에 물든 옛 동문(同門)',
  '얼굴을 천으로 가린 정체불명의 복면 고수',
  '천마(天魔)를 자처하며 본좌(本座)라 일컫는 마도의 절대자',
  '관(官)을 등에 업고 강호를 압박하는 무관(武官) 출신 고수',
  '미모 뒤에 독을 감춘 묘강의 고독(蠱毒) 술자',
  '비급을 노리고 떼로 몰려든 무명소졸(無名小卒)의 무리',
  '겉은 정파, 속은 사파인 위선의 명숙(名宿)',
  '사부의 원수이자 강호의 공적(公敵)으로 지목된 마두(魔頭)',
]

// 충돌·장애 — 무협적 위기·딜레마(파워밸런스·도덕·정체 등)
const OBSTACLES = [
  '내공이 채 회복되지 않아 진기가 절반밖에 운용되지 않는다',
  '한 수만 더 펼치면 주화입마에 빠질 위태로운 경계에 섰다',
  '인질로 잡힌 사람이 적의 손아귀에 있어 함부로 손쓸 수 없다',
  '상대가 이쪽의 초식을 이미 간파해 허초(虛招)가 통하지 않는다',
  '정체가 드러나면 그동안의 잠행이 모두 무너진다',
  '독에 중독되어 시야가 흐려지고 손끝이 저려온다',
  '관무불가침의 암묵을 깨면 강호 전체가 적이 된다',
  '신의(信義)를 지키자니 목숨을 잃고, 살자니 의를 저버려야 한다',
  '경맥이 뒤틀려 알던 초식을 제대로 펼칠 수 없다',
  '수적으로 열세라 정면으로는 도저히 승산이 없다',
  '비급의 절반만 익혀 결정적 마지막 초식을 모른다',
  '심마가 속삭여 검끝이 자꾸 동료를 향하려 한다',
  '은인의 자식이 하필 베어야 할 적의 편에 서 있다',
  '시간이 없어 운기조식으로 진기를 채울 틈이 없다',
  '진법에 갇혀 동서남북의 방향 감각마저 잃었다',
  '마공으로 이기면 수명과 인간성을 대가로 내놓아야 한다',
  '사문의 금기(禁忌)를 어겨야만 이 위기를 넘길 수 있다',
  '상대가 자신의 사부·혈육일지 모른다는 의심이 검을 무디게 한다',
]

// 전환·한 수(절정·반전·사건) — 결투의 마지막 한 수, 떡밥, 폭로
const TURNS = [
  '바위 위로 추락하던 찰나, 손에 잡힌 등나무 덩굴이 비동으로 이어진다',
  '죽은 줄 알았던 전대 고수가 백골 사이에서 마지막 진기를 토해낸다',
  '품속에서 떨어진 신물(信物) 하나가 모든 은원의 내막을 뒤집는다',
  '단 한 줄기 검기(劍氣)가 안개를 가르며 적의 목전에 멎는다',
  '검기(劍氣)가 검강(劍罡)으로 화하며 공기 자체를 베어 가른다',
  '금기로 봉인했던 마지막 절초(絶招)가 단전에서 깨어난다',
  '점혈(點穴)당해 멈췄던 혈도가 풀리며 진기가 한꺼번에 역류한다',
  '복면이 벗겨지자 모두가 알던 익숙한 얼굴이 드러난다',
  '적의 검이 심장을 노린 순간, 환골탈태(換骨奪胎)의 기운이 솟구친다',
  '동귀어진(同歸於盡)을 각오한 한 수에 둘의 검이 동시에 멎는다',
  '암기 한 점이 어둠 속에서 소리 없이 급소를 노린다',
  '진법의 생문(生門)이 한순간 열려 활로가 드러난다',
  '사부의 유언이 떠오르며 막혔던 심법의 다음 구결이 풀린다',
  '내단을 삼킨 순간 막혔던 임독양맥(任督兩脈)이 단숨에 뚫린다',
  '연수합격의 합(合)이 어긋나 진세(陣勢)가 무너지기 시작한다',
  '술잔이 깨지는 소리와 함께 매복했던 살수들이 사방에서 일어선다',
  '한 통의 전서구(傳書鳩)가 천하대전의 시작을 알린다',
  '검을 거두려던 손이, 적의 마지막 미소에 다시 검집을 움켜쥔다',
  '주화입마의 문턱에서 심마를 베어내자 경지가 한 단계 치솟는다',
  '최후의 일초가 빗나가는 대신, 적이 스스로 검을 거두고 무릎을 꿇는다',
]

// 무공·합(合) 디테일(다중 슬롯) — 초식·내공·병기·신법의 구체적 묘사(원리/상성/약점 곁들임)
const MARTIALS = [
  '검끝에서 매화 다섯 송이가 피어나듯 다섯 갈래 검기가 동시에 쏟아진다(매화검법류)',
  '도(刀)가 묵직한 호선을 그리며 산을 가르는 한 줄기 도기(刀氣)로 떨어진다',
  '장풍(掌風)이 부드러운 듯 무겁게 밀려와 받아내는 순간 내상을 입힌다',
  '지법(指法)이 허공의 한 점을 찔러 십여 장 밖의 촛불을 꺼뜨린다',
  '경공(輕功)으로 답설무흔(踏雪無痕), 눈 위에 발자국 하나 남기지 않고 미끄러진다',
  '이형환위(移形換位)로 잔상만 남기고 적의 등 뒤로 돌아선다',
  '내공을 단전에서 끌어올려 경맥을 따라 손끝까지 진기를 한 호흡에 운(運)한다',
  '검기(劍氣)가 검강(劍罡)으로 응축되어 칼날 없이도 바위를 가른다',
  '점혈(點穴) 수법이 마혈(痲穴)을 짚어 상대의 한쪽 팔을 일순 굳힌다',
  '흡성(吸星)의 마공이 맞닿은 손바닥으로 상대의 내력을 빨아들이려 든다',
  '연수합격(聯手合擊)으로 셋이 한 몸처럼 검진(劍陣)을 짜 빈틈을 메운다',
  '쾌검(快劍)이 눈으로 좇기 전에 이미 세 번 찌르고 검집으로 돌아간다',
  '중검(重劍)은 빠르지 않으나 막으면 막은 채로 사람째 뒤로 날려버린다',
  '연검(軟劍)이 채찍처럼 휘어 곧은 검으로는 닿지 못할 각도를 파고든다',
  '암기(暗器)가 소매 끝에서 쏟아져 정면의 검로(劍路)를 비처럼 봉쇄한다',
  '독장(毒掌)에 스친 옷자락이 닿은 살갗부터 검게 죽어 들어간다',
  '내가중수(內家重手)의 일격이 겉은 멀쩡한데 오장육부를 흔들어 놓는다',
  '검을 버리고 맨손으로 적의 검을 두 손가락 사이에 끼워 멈춰 세운다',
  '한 호흡 운기조식(運氣調息)으로 흐트러진 진기를 가다듬어 다음 초식을 벼른다',
  '반탄지력(反彈之力)으로 상대의 힘을 그대로 되돌려 제 무게에 무너지게 한다',
  '빙공(氷功)의 한기가 검을 타고 흘러 맞댄 병기마저 서리로 뒤덮는다',
  '검초(劍招)의 허(虛)와 실(實)을 뒤섞어 어느 쪽이 진짜 살초인지 가린다',
  '강기(罡氣)의 막이 몸을 감싸 어지간한 검기로는 옷자락조차 베지 못한다',
  '신법(身法)을 펼쳐 좁은 잔도 위에서 반 보의 차이로 칼날을 흘려보낸다',
]

// 감각 디테일(다중 슬롯) — 무협적 오감 묘사
const SENSORIES = [
  '코끝을 찌르는 피비린내와 식은 화약 냄새',
  '멀리서 울려 퍼지는 산사(山寺)의 새벽 종소리',
  '혀끝에 도는 쇠와 피의 비릿한 맛',
  '검집을 쥔 손바닥에 배어드는 미끈한 식은땀',
  '발밑에서 삐걱이는 객잔의 낡은 마룻장 소리',
  '목덜미를 스치고 지나가는 검기의 서늘한 바람',
  '귓가에 맴도는 적의 낮고 고른 호흡 소리',
  '옷자락을 스치는 매화 향과 빗물의 비린내',
  '손끝에 닿는 차가운 만년한옥(萬年寒玉)의 결',
  '입안에 번지는 토혈(吐血)의 비릿한 쇳내',
  '먼 강물 위로 끊겼다 이어지는 뱃노래 한 가락',
  '발치를 휘감는 묘강 늪지의 축축한 독무(毒霧)',
  '코를 막는 약 달이는 진한 한약재 냄새',
  '천장에서 똑똑 떨어지는 동굴 석순의 물방울 소리',
  '심장 박동에 맞춰 단전에서 뛰노는 진기의 미세한 열기',
  '낡은 비급(秘笈)의 곰팡내 어린 누런 양피지 냄새',
  '추위에 감각을 잃어가는 얼어붙은 손가락 끝',
  '먼 산에서 들려오는 늑대 울음과 솔바람 소리',
  '검을 맞댈 때 손목으로 전해지는 묵직한 진동',
  '재가 된 만장(輓章)과 향(香)이 타들어가는 매캐한 연기',
  '입김이 허옇게 어는 설산의 살을 에는 한기',
  '술상 위 데운 황주(黃酒)의 알싸하고 달큰한 김',
  '발끝에 차이는 깨진 검신(劍身)의 쇳조각',
  '얼굴을 때리는 모래폭풍의 까끌까끌한 알갱이',
]

// 다중 슬롯에서 한 번에 뽑을 개수
const MARTIAL_COUNT = 2
const SENSORY_COUNT = 2

// ── 유틸 ──────────────────────────────────────────────────────────────
const rid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// n개를 중복 없이 뽑는다.
function pickN<T>(arr: T[], n: number): T[] {
  const pool = arr.slice()
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool[idx])
    pool.splice(idx, 1)
  }
  return out
}

// nCk 조합수(순서 무관)
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

// 전체 조합수: 단일 슬롯 곱 × (무공 디테일 2개 조합) × (감각 디테일 2개 조합)
function totalCombos(): number {
  const martialCombos = choose(MARTIALS.length, MARTIAL_COUNT)
  const sensoryCombos = choose(SENSORIES.length, SENSORY_COUNT)
  return (
    PLACES.length * WEATHERS.length * POVS.length * BEATS.length *
    FOES.length * OBSTACLES.length * TURNS.length *
    martialCombos * sensoryCombos
  )
}

// ── 슬롯 모델 ──────────────────────────────────────────────────────────
type SlotKey = 'place' | 'weather' | 'pov' | 'beat' | 'foe' | 'obstacle' | 'turn' | 'martial' | 'sensory'
interface SlotDef { key: SlotKey; label: string; icon: string }
const SLOTS: SlotDef[] = [
  { key: 'place', label: '강호 좌표(장소)', icon: '🏯' },
  { key: 'weather', label: '시각·기상', icon: '🌫️' },
  { key: 'pov', label: '시점 인물(신분)', icon: '🧗' },
  { key: 'beat', label: '전개 의도', icon: '🎯' },
  { key: 'foe', label: '적·상대', icon: '🗡️' },
  { key: 'obstacle', label: '충돌·장애', icon: '⛓️' },
  { key: 'turn', label: '전환·한 수', icon: '⚡' },
  { key: 'martial', label: '무공·합 디테일(2)', icon: '🥋' },
  { key: 'sensory', label: '감각 디테일(2)', icon: '👂' },
]

interface Beat { tag: string; text: string }
interface Scene {
  place: string
  weather: string
  pov: string
  beat: Beat
  foe: string
  obstacle: string
  turn: string
  martial: string[]
  sensory: string[]
}

function buildScene(): Scene {
  return {
    place: pick(PLACES),
    weather: pick(WEATHERS),
    pov: pick(POVS),
    beat: pick(BEATS),
    foe: pick(FOES),
    obstacle: pick(OBSTACLES),
    turn: pick(TURNS),
    martial: pickN(MARTIALS, MARTIAL_COUNT),
    sensory: pickN(SENSORIES, SENSORY_COUNT),
  }
}

// 장면 글감 한 단락으로 엮기(무협 전개 패턴 적용: 무대 → 인물·의도 → 적·충돌 → 무공 합 → 한 수 → 감각)
function compose(s: Scene): string {
  const martialText = s.martial.join(' 그리고 ')
  const sensoryText = s.sensory.map((d) => `‘${d}’`).join(', ')
  return (
    `${s.place}. ${s.weather}. ` +
    `${s.pov}이(가) ${s.beat.text} 장면. ` +
    `맞은편에는 ${s.foe}이(가) 버티고 섰으나, ${s.obstacle}. ` +
    `${martialText}. ` +
    `그 순간 — ${s.turn}. ` +
    `(감각: ${sensoryText})`
  )
}

// 짧은 제목용
function titleOf(s: Scene): string {
  return `[${s.beat.tag}] ${s.pov.slice(0, 12)}… · ${s.place.slice(0, 14)}…`
}

// ── 영속 ──────────────────────────────────────────────────────────────
interface SavedScene { id: string; scene: Scene; note: string }
interface Persist { scene: Scene | null; locks: Partial<Record<SlotKey, boolean>>; saved: SavedScene[] }

function isBeat(x: any): x is Beat {
  return x && typeof x.tag === 'string' && typeof x.text === 'string'
}
function isScene(x: any): x is Scene {
  return x && typeof x.place === 'string' && typeof x.weather === 'string' &&
    typeof x.pov === 'string' && isBeat(x.beat) && typeof x.foe === 'string' &&
    typeof x.obstacle === 'string' && typeof x.turn === 'string' &&
    Array.isArray(x.martial) && Array.isArray(x.sensory)
}

function load(): Persist {
  const fallback: Persist = { scene: null, locks: {}, saved: [] }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const scene = isScene(p?.scene) ? p.scene : null
    const locks: Partial<Record<SlotKey, boolean>> = {}
    if (p?.locks && typeof p.locks === 'object') {
      SLOTS.forEach((sl) => { if (p.locks[sl.key]) locks[sl.key] = true })
    }
    const saved: SavedScene[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: any) => x && isScene(x.scene))
          .map((x: any) => ({ id: typeof x.id === 'string' ? x.id : rid(), scene: x.scene, note: typeof x.note === 'string' ? x.note : '' }))
      : []
    return { scene, locks, saved }
  } catch {
    return fallback
  }
}

export default function WuxiaSceneForge({ payload }: { payload?: Record<string, unknown> }) {
  const initial = useRef<Persist>(load())
  const [scene, setScene] = useState<Scene | null>(initial.current.scene)
  const [locks, setLocks] = useState<Partial<Record<SlotKey, boolean>>>(initial.current.locks)
  const [saved, setSaved] = useState<SavedScene[]>(initial.current.saved)
  const [copied, setCopied] = useState(false)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState('')
  const [rolling, setRolling] = useState(false)

  const alive = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 영속 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ scene, locks, saved } as Persist)) } catch { /* 용량 초과 등 무시 */ }
  }, [scene, locks, saved])

  // 언마운트 정리
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (rollTimer.current) clearTimeout(rollTimer.current)
    }
  }, [])

  const flashToast = (msg: string) => {
    if (!alive.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => alive.current && setToast(''), 2200)
  }

  // 생성: 잠긴 슬롯은 유지, 나머지만 새로 뽑는다.
  const generate = useCallback(() => {
    setCopied(false)
    setScene((prev) => {
      const fresh = buildScene()
      if (!prev) return fresh
      const next: Scene = { ...fresh }
      if (locks.place) next.place = prev.place
      if (locks.weather) next.weather = prev.weather
      if (locks.pov) next.pov = prev.pov
      if (locks.beat) next.beat = prev.beat
      if (locks.foe) next.foe = prev.foe
      if (locks.obstacle) next.obstacle = prev.obstacle
      if (locks.turn) next.turn = prev.turn
      if (locks.martial) next.martial = prev.martial
      if (locks.sensory) next.sensory = prev.sensory
      return next
    })
    setRolling(true)
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => alive.current && setRolling(false), 320)
  }, [locks])

  // 최초 진입 시 1회 생성
  useEffect(() => {
    if (!scene) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLock = (k: SlotKey) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))

  const fullText = scene ? compose(scene) : ''
  const lockedCount = SLOTS.filter((sl) => locks[sl.key]).length
  const combos = totalCombos()

  const copyText = () => {
    if (!scene || !navigator.clipboard) { if (!navigator.clipboard) flashToast('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(fullText).then(() => {
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    }).catch(() => flashToast('복사에 실패했습니다.'))
  }

  // 즐겨찾기 저장
  const saveScene = () => {
    if (!scene) return
    setSaved((prev) => [{ id: rid(), scene, note: '' }, ...prev])
    flashToast('장면을 즐겨찾기에 저장했어요')
  }
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const startEdit = (s: SavedScene) => { setEditId(s.id); setEditText(s.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((s) => (s.id === editId ? { ...s, note: t } : s)))
    setEditId(''); setEditText('')
  }
  const loadSaved = (s: SavedScene) => { setScene(s.scene); setLocks({}); setCopied(false); flashToast('장면을 불러왔어요') }

  // ── 연계: 글감 스니펫 ──
  const toSnippet = (s: Scene) => {
    addToLibrary('snippets', {
      text: compose(s),
      source: '무협 장면 생성기',
      tags: ['무협', '장면', s.beat.tag],
    })
    flashToast('장면 글감을 스니펫으로 저장했어요')
  }

  // ── 연계: 공유 장소 라이브러리(이 장면의 무대를 장소로) ──
  const toLibPlace = (s: Scene) => {
    addToLibrary('places', {
      name: s.place,
      kind: '무협 무대',
      mood: s.beat.tag,
      sensory: s.sensory.join(' / '),
      notes: compose(s),
      source: '무협 장면 생성기',
      fields: {
        name: s.place,
        kind: '무협 무대',
        atmosphere: `[${s.beat.tag}] ${s.weather}`,
        sensory: s.sensory.join(' / '),
        notes: compose(s),
      },
    })
    flashToast(`무대 ‘${s.place.slice(0, 16)}…’를 공유 장소 라이브러리에 추가했어요`)
  }

  // ── 연계: 프로젝트 원고(원고 › 장면 폴더) ──
  const linked = hasProjectBridge()
  const toProject = (s: Scene, note?: string) => {
    if (!linked) { flashToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p><b>🏯 강호 좌표:</b> ${esc(s.place)}</p>`,
      `<p><b>🌫️ 시각·기상:</b> ${esc(s.weather)}</p>`,
      `<p><b>🧗 시점 인물:</b> ${esc(s.pov)}</p>`,
      `<p><b>🎯 전개 의도:</b> [${esc(s.beat.tag)}] ${esc(s.beat.text)} 장면</p>`,
      `<p><b>🗡️ 적·상대:</b> ${esc(s.foe)}</p>`,
      `<p><b>⛓️ 충돌·장애:</b> ${esc(s.obstacle)}</p>`,
      `<p><b>🥋 무공·합:</b></p><ul>${s.martial.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
      `<p><b>⚡ 전환·한 수:</b> ${esc(s.turn)}</p>`,
      `<p><b>👂 감각 디테일:</b></p><ul>${s.sensory.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`,
      note ? `<hr/><p><b>메모:</b> ${esc(note)}</p>` : '',
      `<hr/><p style="line-height:1.8;">${esc(compose(s))}</p>`,
    ].filter(Boolean).join('')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '장면',
      title: titleOf(s),
      bodyHtml,
      synopsis: compose(s),
      meta: { 전개의도: s.beat.tag, 장소: s.place, 시점인물: s.pov, 출처: '무협 장면 생성기' },
    })
    flashToast(id ? '프로젝트 원고(장면 폴더)에 장면을 추가했어요' : '프로젝트에 추가하지 못했습니다.')
  }

  // payload.genre 맥락 배지
  const ctxGenre = payload && typeof (payload as any).genre === 'string' ? String((payload as any).genre).trim() : ''

  // 관련 도구
  const RELATED: { id: string; icon: string; label: string }[] = [
    { id: 'scene-list', icon: '📋', label: '장면 목록' },
    { id: 'setting-bible', icon: '🗺️', label: '배경 설정집' },
    { id: 'character-sheet', icon: '🪪', label: '인물 시트' },
    { id: 'plot-pyramid', icon: '🔺', label: '플롯 피라미드' },
    { id: 'sensory-palette', icon: '🎨', label: '감각 팔레트' },
  ]

  // 슬롯 값 표시(다중 슬롯은 배열)
  const slotIsMulti = (k: SlotKey) => k === 'martial' || k === 'sensory'
  const slotMultiArr = (k: SlotKey): string[] => {
    if (!scene) return []
    if (k === 'martial') return scene.martial
    if (k === 'sensory') return scene.sensory
    return []
  }
  const slotSingle = (k: SlotKey): string => {
    if (!scene) return ''
    if (k === 'beat') return `[${scene.beat.tag}] ${scene.beat.text} 장면`
    if (slotIsMulti(k)) return ''
    return (scene as any)[k] as string
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const introStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }
  const slotCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const savedRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
  const noteInput: React.CSSProperties = { flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }

  return (
    <div style={wrap}>
      <div style={introStyle}>
        <b>강호 좌표·시각·신분·전개 의도·은원·충돌·한 수·무공 합·감각</b>을 무작위로 엮어 하나의 <b>무협 장면</b>을 만듭니다.
        마음에 드는 칸은 <Emoji e="🔒"/>로 잠그고 나머지만 다시 굴리세요.
      </div>

      {ctxGenre && (
        <div style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 9px' }}>
          <Emoji e="🧭"/> 맥락: {ctxGenre}
        </div>
      )}

      {/* 생성 도구바 + 조합수 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={generate}><Emoji e="🎲"/> {lockedCount ? '나머지 다시 생성' : '장면 생성'}</button>
        {lockedCount > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="🔒"/> {lockedCount}개 잠금</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          약 <b style={{ color: 'var(--accent)' }}>{combos.toLocaleString('ko-KR')}</b>가지 조합
        </span>
      </div>

      {toast && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          <Emoji e="✅"/> {toast}
        </div>
      )}

      <div style={body}>
        {/* 슬롯들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map((sl) => {
            const isLocked = !!locks[sl.key]
            const multi = slotIsMulti(sl.key)
            const arr = slotMultiArr(sl.key)
            const single = slotSingle(sl.key)
            const dim = rolling && !isLocked
            return (
              <div key={sl.key} style={{ ...slotCard, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}><Emoji e={sl.icon}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{sl.label}</div>
                  {multi && scene && arr.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5, color: dim ? 'var(--muted)' : 'var(--text)' }}>
                      {arr.map((d, i) => <li key={i}>{dim ? '…' : d}</li>)}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, overflowWrap: 'anywhere', color: single ? (dim ? 'var(--muted)' : 'var(--text)') : 'var(--muted)' }}>
                      {single ? (dim ? '…' : single) : '— 생성해 주세요 —'}
                    </div>
                  )}
                </div>
                <button
                  className="minibtn"
                  onClick={() => toggleLock(sl.key)}
                  title={isLocked ? '잠금 해제' : '이 칸 잠그기'}
                  style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}
                >{isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
              </div>
            )
          })}
        </div>

        {/* 조합 글감 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="⚔️"/> 무협 장면 글감</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: scene ? 'var(--text)' : 'var(--muted)' }}>
            {fullText || '〈장면 생성〉을 눌러 무협 장면을 만들어 보세요.'}
          </div>
        </div>

        {/* 산출물 도구바 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="minibtn" onClick={copyText} disabled={!scene}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
          <button className="minibtn" onClick={saveScene} disabled={!scene}>☆ 즐겨찾기</button>
          <button className="linkbtn" onClick={() => scene && toSnippet(scene)} disabled={!scene} title="이 장면 글감을 스니펫으로 저장"><Emoji e="📝"/> 스니펫 저장</button>
          <button className="linkbtn" onClick={() => scene && toLibPlace(scene)} disabled={!scene} title="이 장면의 무대를 공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소 라이브러리</button>
          <button
            className="linkbtn"
            onClick={() => scene && toProject(scene)}
            disabled={!scene || !linked}
            title={linked ? '이 장면을 프로젝트 원고(장면 폴더)에 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄"/> 프로젝트에 추가</button>
        </div>

        {/* 즐겨찾기 */}
        <div>
          <div style={{ ...secTitle, marginBottom: 6 }}>
            <span><Emoji e="⭐"/> 저장한 장면 {saved.length ? `(${saved.length})` : ''}</span>
          </div>
          {!saved.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 2px' }}>아직 저장한 장면이 없습니다. ☆로 마음에 드는 장면을 모아보세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saved.map((s) => (
                <div key={s.id} style={savedRow}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="⚔️"/> {emojify(titleOf(s.scene))}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{compose(s.scene)}</div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                        placeholder="메모 (등장 회차·복선·은원 정리 등)"
                        style={noteInput}
                      />
                      <button className="minibtn" onClick={commitEdit}>저장</button>
                      <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                    </div>
                  ) : (
                    <>
                      {s.note && <div style={{ fontSize: 11.5, color: 'var(--accent)' }}><Emoji e="📝"/> {emojify(s.note)}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="minibtn" onClick={() => loadSaved(s)} title="이 장면을 위에 불러오기">↩ 불러오기</button>
                        <button className="linkbtn" onClick={() => toSnippet(s.scene)} title="스니펫으로 저장"><Emoji e="📝"/> 스니펫</button>
                        <button className="linkbtn" onClick={() => toLibPlace(s.scene)} title="공유 장소 라이브러리에 추가"><Emoji e="📥"/> 장소</button>
                        <button className="linkbtn" onClick={() => toProject(s.scene, s.note || undefined)} disabled={!linked} title={linked ? '프로젝트 원고(장면 폴더)로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트</button>
                        <button className="minibtn" onClick={() => startEdit(s)} title="메모 편집"><Emoji e="✏️"/></button>
                        <button className="minibtn" onClick={() => removeSaved(s.id)} title="삭제"><Emoji e="🗑️"/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 관련 도구 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>연계:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, ctxGenre ? { genre: ctxGenre } : { genre: '무협' })} title={`${r.label} 열기`}>
            <Emoji e={r.icon}/> {r.label}
          </button>
        ))}
      </div>

      <div className="license-note" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        로컬 자작 데이터 · 외부 네트워크 없음 · 생성 장면은 출발점일 뿐 자유롭게 비틀어 보세요
      </div>
    </div>
  )
}
