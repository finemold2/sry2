// 퀘스트 단조소(鍛造所) — 의뢰인 × 목표 × 장애 × 보상 × 반전 5개 슬롯을 로컬 풀에서 무작위 조합해
// RPG/모험 임무를 대량 생성한다. 슬롯별 잠금(🔒) 후 나머지만 재생성, 가능한 조합 수(50억+)를 표시.
// 자급식: react·linkbus 외 import 없음. 전부 로컬(Math.random). localStorage 'sry:tool:quest-forge' 에
//   잠금/현재 슬롯/즐겨찾기 저장·복원. 언마운트 시 타이머 정리.
// 연계(linkbus): 생성한 임무를 프로젝트 자료(research)/'플롯' 폴더에 임무 문서로 추가하고,
//   스니펫 라이브러리에도 글감으로 저장한다.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'quest-forge', name: '퀘스트 단조소', icon: '🗡️', group: '영감·발상', intro: '의뢰인·목표·장애·보상·반전을 조합해 모험 임무를 대량 생성하세요', w: 560, h: 640 }

const LS = 'sry:tool:quest-forge'

// ───────── 슬롯 정의 ─────────
type SlotKey = 'patron' | 'goal' | 'obstacle' | 'reward' | 'twist'
interface SlotDef { key: SlotKey; label: string; icon: string; pool: string[] }

// 의뢰인 — 누가 임무를 맡기는가
const PATRON: string[] = [
  '몰락한 귀족', '수상한 길드 마스터', '비밀에 싸인 여사제', '늙은 현상금 사냥꾼', '국경의 변경백',
  '떠돌이 음유시인', '얼굴을 가린 정보원', '병든 노왕', '복수에 사로잡힌 미망인', '추방당한 마법사',
  '난파선의 유일한 생존자', '지하 도시의 도굴꾼 두목', '잠적한 연금술사', '폐광촌의 촌장', '왕실 첩보부의 밀사',
  '저주받은 가문의 막내', '기억을 잃은 기사', '시간을 파는 상인', '죽은 자의 유언 집행인', '광신도 무리의 이탈자',
  '용을 섬기던 사제', '국적 없는 해적선장', '봉인된 신의 마지막 신관', '쌍둥이 중 사라진 동생',
  '파문당한 종교 재판관', '눈먼 점성술사', '왕위를 빼앗긴 망명 공주', '죽음을 앞둔 대장장이', '얼음 도시의 시장',
  '용병단을 잃은 단장', '비밀 결사의 연락책', '저주를 대물림한 무희', '사막 부족의 늙은 족장', '난쟁이 광산의 길드장',
  '버려진 등대지기', '왕궁에서 쫓겨난 어릿광대', '괴물 사냥을 그만둔 노병', '예언에 시달리는 수녀원장', '빚에 쫓기는 도박꾼',
  '정체를 숨긴 왕세자', '유랑 서커스의 단장', '금고를 털린 은행가', '늪지 마을의 산파', '제 손으로 마을을 불태운 영주',
  '죽은 줄 알았던 옛 스승', '거울 속에 갇혔다는 자작', '말을 잃은 전령', '뱃사람들의 수호 성녀를 자처하는 여인', '폐성을 사들인 수집가',
  '쫓기는 위조 화폐 장인', '한쪽 눈을 잃은 검투사', '국경 너머에서 온 첩자', '심해를 다녀온 잠수부', '교단에 배신당한 성기사',
  '망한 극단의 마지막 배우', '시계탑을 지키는 노인', '약초밭을 빼앗긴 마녀', '죄수복을 입은 옛 영웅', '폐허가 된 수도원의 마지막 수도사',
  '왕의 독살을 막으려는 시종', '바다 괴물에게 가족을 잃은 어부', '비밀을 너무 많이 아는 필경사', '저주받은 갑옷을 파는 상인', '실종된 딸을 찾는 늙은 어미',
  '제국에 쫓기는 반란군 지휘관', '기억상실에서 깨어난 죄수', '용의 알을 훔친 도둑', '눈보라에 갇힌 산장 주인', '정령과 계약한 무당',
  '대관식을 거부한 후계자', '망령에게 시달리는 여관 주인', '검은 가면의 자선가', '폐선장의 마지막 선원', '저주받은 호수의 뱃사공',
  '추방된 궁정 화가', '약속을 어긴 요정 여왕의 사절', '죽은 형의 빚을 떠안은 동생', '비밀 정원을 지키는 정원사', '왕국의 마지막 점등사',
  '얼어붙은 강 건너편의 망명객', '시간이 멈춘 마을의 시계공', '괴물과 거래한 상단주', '폐탑에 유폐된 마법학자', '신탁을 잃은 사제장',
  '제 무덤을 파헤친 도굴꾼', '왕가의 비밀을 아는 유모', '한밤중에만 나타나는 거간꾼', '저주를 풀려는 늑대인간', '잊힌 신을 섬기는 마지막 무녀',
  '왕국을 등진 옛 근위대장', '운명을 점치다 미쳐 버린 예언자',
]

// 목표 — 무엇을 해내야 하는가
const GOAL: string[] = [
  '잃어버린 유물을 되찾을 것', '봉인된 문을 다시 닫을 것', '납치된 후계자를 구출할 것', '잠든 고대신을 깨우지 말 것',
  '저주받은 검을 파괴할 것', '실종된 탐사대의 행방을 밝힐 것', '왕에게 전할 밀서를 운반할 것', '괴물의 둥지를 불태울 것',
  '금지된 지도를 완성할 것', '배신자의 정체를 폭로할 것', '역병의 근원을 찾아낼 것', '무너지는 다리를 건너 마을을 대피시킬 것',
  '예언서의 마지막 장을 손에 넣을 것', '잠긴 기억을 되살릴 의식을 치를 것', '두 세력의 휴전을 중재할 것', '도둑맞은 왕관을 회수할 것',
  '무덤에서 빠져나온 망령을 잠재울 것', '하늘에서 떨어진 별의 파편을 회수할 것', '거짓 왕의 대관식을 막을 것', '사라진 강의 물길을 되돌릴 것',
  '불멸의 비밀을 봉인할 것', '폐허가 된 도서관의 마지막 책을 구할 것',
  '봉인된 정령을 제자리로 돌려보낼 것', '독에 중독된 영주를 치료할 약초를 구할 것', '국경을 넘는 밀수꾼의 길을 끊을 것', '저주받은 호수의 물을 정화할 것',
  '폭주하는 골렘을 멈춰 세울 것', '잊힌 신전의 제단에 공물을 바칠 것', '죽은 영웅의 유해를 고향에 묻을 것', '거짓 신탁을 퍼뜨리는 사교를 무너뜨릴 것',
  '얼어붙은 마을에 봄을 되찾을 것', '폐광에 갇힌 광부들을 구해낼 것', '왕의 그림자를 자처하는 자를 찾아낼 것', '바다 괴물로부터 항구를 지킬 것',
  '도시를 집어삼키는 모래를 멈출 것', '잃어버린 왕가의 혈통을 입증할 것', '봉인이 풀린 악령을 다시 가둘 것', '두 가문의 오랜 원한을 끝낼 것',
  '왕성에 숨어든 암살자를 막을 것', '저주받은 가면의 주인을 찾아낼 것', '불타는 숲에서 성수를 구해낼 것', '잠든 화산을 잠재울 의식을 완성할 것',
  '도둑 길드의 본거지를 소탕할 것', '예언된 재앙의 날을 늦출 것', '실종된 별빛 함대를 추적할 것', '망령들의 항로를 끊어낼 것',
  '폐위된 여왕을 옥좌에 되돌릴 것', '거대한 종을 다시 울릴 것', '말라붙은 우물에 물을 되돌릴 것', '죽음의 안개를 걷어낼 의식을 치를 것',
  '괴물에게 빼앗긴 아이들을 되찾을 것', '왕국을 둘로 가른 결계를 무너뜨릴 것', '봉인된 용을 끝내 잠재울 것', '잊힌 영웅의 무덤을 봉인할 것',
  '거짓 평화를 깨뜨린 음모를 밝힐 것', '하늘성으로 오르는 다리를 잇닿게 할 것', '죽은 자들의 도시에서 산 자를 데려올 것', '저주받은 보석을 바다에 가라앉힐 것',
  '왕의 잃어버린 목소리를 되찾을 것', '얼음 감옥에 갇힌 정령을 풀어줄 것', '폐허에서 마지막 생존자를 데리고 나올 것', '거짓 예언서를 불태울 것',
  '대륙을 가르는 협곡에 다리를 놓을 것', '죽음의 군주와 맺은 계약을 파기할 것', '잠긴 천문대의 별 지도를 완성할 것', '왕가의 비밀 무덤을 봉인할 것',
  '폭정에 맞선 봉기를 성공시킬 것', '바다 밑에 가라앉은 도시를 깨울 것', '저주받은 거울을 산산이 부술 것', '잊힌 언어로 쓰인 봉인을 해독할 것',
  '왕국을 떠도는 역병의 숙주를 찾을 것', '용의 둥지에서 알을 무사히 빼낼 것', '폐탑에 갇힌 마지막 마법사를 구할 것', '두 신을 섬기는 분열된 교단을 화해시킬 것',
  '잠든 거인을 깨우지 않고 산을 넘을 것', '왕국의 마지막 등불을 다시 밝힐 것', '죽은 왕의 유언을 끝까지 지킬 것', '폐허에 잠든 고대 병기를 봉인할 것',
  '저주받은 숲을 가로질러 성소에 닿을 것', '하늘에서 내려온 사자를 호위할 것', '왕가를 노리는 암살단을 와해시킬 것', '말라 죽어가는 세계수를 되살릴 것',
  '바다 깊이 가라앉은 보물선을 끌어올릴 것', '폭군의 손에서 옥새를 되찾을 것', '잊힌 신의 이름을 세상에 되돌릴 것', '두 왕국을 잇는 평화의 혼인을 성사시킬 것',
  '용이 잠든 화산을 무사히 통과할 것', '죽음의 군대를 막아낼 성벽을 다시 세울 것',
]

// 장애 — 임무를 가로막는 위협
const OBSTACLE: string[] = [
  '늪을 지배하는 마녀의 함정', '서로 적대하는 두 용병단', '되살아나는 언데드 군세', '시시각각 변하는 미궁',
  '의뢰인의 숨은 이중 계약', '독으로 뒤덮인 안개의 숲', '시간이 거꾸로 흐르는 신전', '한 번 들어가면 잊히는 마을',
  '동료 안에 숨은 첩자', '결계를 지키는 고대 골렘', '폭풍에 갇힌 부서진 다리', '거짓 기억을 심는 환영술사',
  '신성한 맹세에 묶인 수호자', '값을 치를 때마다 커지는 저주', '약속을 강요하는 요정의 계약', '눈을 마주치면 돌이 되는 감시자',
  '굶주린 짐승이 들끓는 협곡', '진실을 말할 수 없게 만드는 봉인', '서로를 죽이게 만드는 광기의 역병', '추적을 멈추지 않는 현상금 사냥꾼',
  '발을 들이면 늙어 버리는 숲', '거짓말을 간파하는 문지기', '한 걸음마다 무너지는 빙하', '소리를 삼켜 버리는 침묵의 골짜기',
  '죽은 자의 얼굴을 한 환영', '잠들면 깨어나지 못하는 안개', '제물을 요구하는 다리의 수문장', '밤마다 자리를 바꾸는 별의 길',
  '피를 보면 광폭해지는 호위병', '맹세를 어기면 죽는 피의 계약', '길을 잃게 만드는 메아리의 동굴', '산 자를 거부하는 죽음의 강',
  '거짓 보물로 가득한 함정의 방', '심장을 얼리는 망령의 비명', '꿈과 현실을 뒤섞는 환각의 늪', '두 얼굴을 가진 길잡이',
  '들어선 자를 돌로 만드는 정원', '모든 빛을 삼키는 끝없는 어둠', '거꾸로 흐르는 운명의 강', '맹독을 뿜는 가시덤불의 미로',
  '약속한 자에게만 열리는 봉인된 문', '굶주린 망령들이 지키는 묘지', '진실을 말하면 무너지는 거짓의 탑', '제 이름을 잊게 하는 강물',
  '한 번 본 것을 빼앗는 도둑 정령', '시간을 멈춰 가두는 수정 결계', '얼굴을 바꿔 가며 추격하는 사냥개', '용암으로 가로막힌 외길',
  '맹수로 변하는 저주받은 마을 사람들', '거짓 신을 섬기는 광신도의 무리', '되돌아올 수 없는 일방통행의 문', '바닥을 알 수 없는 검은 호수',
  '산 제물을 바쳐야 건너는 협곡', '기억을 먹고 자라는 거대한 거미', '입을 열면 모래가 되는 저주', '한밤중에만 나타나는 유령 군대',
  '죄를 들춰내는 진실의 거울', '발자국을 따라오는 그림자 무리', '들어가면 길이 사라지는 미궁의 정원', '제 그림자와 싸우게 만드는 안개',
  '잠든 자를 깨우면 끝나는 봉인', '두려움을 먹이로 삼는 어둠의 짐승', '거짓 약속에 묶인 계약의 사슬', '얼어붙은 시간에 갇힌 폐성',
  '피의 대가를 요구하는 늙은 다리', '환영으로 동료를 갈라놓는 마술사', '한 번 울리면 멈추지 않는 저주의 종', '죽은 왕을 섬기는 백골의 근위대',
  '발걸음 소리를 따라오는 어둠의 손', '진실을 외면해야 살아남는 거짓의 회랑', '한 명만 살려 두는 운명의 갈림길', '잠든 자의 꿈으로 빚어진 미궁',
  '맹세를 어기면 무너지는 빛의 다리', '제 모습을 비추면 갇히는 호수', '숨을 쉴 때마다 좁아지는 동굴', '먹잇감을 홀리는 노래의 세이렌',
  '죄 없는 자만 통과시키는 불의 관문', '되돌아보면 무너지는 좁은 산길', '거짓 길잡이가 이끄는 끝없는 평원', '한 사람의 그림자를 빼앗는 검은 안개',
  '말을 멈추면 죽는 침묵의 저주', '문을 열 때마다 늘어나는 적의 방', '시간이 흐를수록 좁아지는 결계', '발밑을 무너뜨리는 환영의 계단',
  '한 번 마신 자를 떠나지 못하게 하는 샘', '제 이름을 외쳐야 닫히는 봉인의 문',
]

// 보상 — 성공하면 얻는 것(혹은 미끼)
const REWARD: string[] = [
  '왕가의 인장과 작위', '소원 하나를 들어주는 부적', '금화로 가득 찬 봉인된 궤짝', '잃어버린 혈통의 증표',
  '용의 비늘로 만든 갑옷', '죽은 이를 단 한 번 만날 권리', '금지된 마법의 비전서', '국경을 자유로이 넘는 통행증',
  '진실을 비추는 거울', '한 가지 죄를 사면받을 칙서', '바닥나지 않는 작은 주머니', '적의 약점이 적힌 명부',
  '봉인을 풀 수 있는 마지막 열쇠', '잊힌 신의 가호', '평생 갚지 못할 빚의 탕감', '버려진 성과 그 영지',
  '오직 한 번 시간을 되돌릴 모래시계', '말을 알아듣는 충직한 짐승', '사라진 가문의 비밀 금고 위치', '결코 녹슬지 않는 명검',
  '어떤 자물쇠도 여는 만능 열쇠', '평생 마르지 않는 샘의 권리', '왕국 어디든 단숨에 가는 마법 망토', '죽음을 한 번 막아 주는 부적',
  '용의 보물이 잠든 동굴의 지도', '누구의 거짓말도 꿰뚫는 귀걸이', '한 번 휘두르면 길을 여는 지팡이', '천 명을 먹일 마법의 솥',
  '잊힌 왕조의 봉인된 보물고', '상처를 단숨에 낫게 하는 성수', '하늘을 나는 한 쌍의 날개', '어둠 속에서도 보이는 마법의 눈',
  '적을 잠재우는 은빛 피리', '결코 닳지 않는 여행자의 장화', '주인을 지키는 살아 있는 방패', '바닷속을 자유로이 다닐 비늘 외투',
  '왕의 신임과 궁정의 자리', '한 도시를 다스릴 봉토', '비밀 길드의 평생 회원증', '신들의 언어로 적힌 고대 두루마리',
  '모든 병을 고치는 단 한 방울의 영약', '적의 함대를 잠재울 폭풍의 뿔피리', '소금처럼 흩어지지 않는 우정의 맹세', '죽은 가문을 되살릴 복권 칙서',
  '시간을 멈추는 회중시계', '잃어버린 기억을 되찾는 보석', '천하무적의 전쟁 군마', '한 번 부르면 나타나는 정령의 인장',
  '왕국 최고의 대장간을 물려받을 증서', '어떤 독도 무력화하는 반지', '잠든 화산의 불씨를 다스릴 부적', '망자와 대화할 수 있는 거울 조각',
  '하늘성으로 오르는 황금 열쇠', '천 권의 금서가 잠든 비밀 서고', '운명을 바꾸는 단 한 장의 카드', '결코 멈추지 않는 마법의 나침반',
  '바다를 가르는 삼지창', '왕가만이 아는 비밀 통로의 도면', '죽음의 군주에게서 받은 면죄의 표식', '한 번 입으면 모습을 감추는 외투',
  '전설의 대장장이가 벼린 갑주 한 벌', '천 리를 보는 망원경', '잠든 거인을 깨우는 뿔나팔', '왕좌에 오를 정통 후계의 증표',
  '영원히 시들지 않는 황금 장미', '적장의 목에 걸린 현상금 전액', '신탁을 들을 수 있는 성스러운 향로', '한 번 휘두르면 폭풍을 부르는 검',
  '잃어버린 고향으로 돌아갈 권리', '천상의 음악이 깃든 하프', '결코 빗나가지 않는 은빛 화살', '왕국의 모든 문을 여는 옥새',
  '한 번의 패배를 없던 일로 만드는 깃펜', '용을 부리는 고대의 뿔피리', '어떤 상처도 막아 내는 마법의 부적', '잠든 군대를 깨우는 황금 나팔',
  '천 리 밖을 비추는 예언의 수정구', '왕의 신임을 증명하는 봉인된 인장', '결코 거짓을 새기지 않는 맹세의 반지', '한 사람의 운명을 바꾸는 별의 조각',
  '잊힌 왕가의 전설적인 보검', '바람을 부르는 항해사의 나침반', '죽은 숲을 되살리는 생명의 씨앗', '적의 마법을 되돌리는 거울 방패',
  '천하를 굽어보는 하늘성의 열쇠', '한 번 부르면 달려오는 천마', '결코 식지 않는 화로의 불씨', '잃어버린 기억을 봉인한 보석함',
]

// 반전 — 임무를 뒤집는 진실
const TWIST: string[] = [
  '의뢰인이야말로 진짜 악당이었다', '되찾으려던 유물이 봉인을 푸는 열쇠였다', '구출 대상이 스스로 잡혀 있었다', '보상은 처음부터 존재하지 않았다',
  '적이 사실은 같은 목적을 가진 아군이었다', '임무의 성공이 더 큰 재앙을 부른다', '동료 중 하나가 표적 본인이었다', '예언이 임무를 막으려다 실현된다',
  '죽었다던 인물이 모든 것의 배후였다', '괴물은 학대받아 변한 피해자였다', '두 의뢰가 서로를 함정에 빠뜨리려는 미끼였다', '주인공의 과거가 사건의 시작이었다',
  '봉인을 지키는 것이 곧 봉인을 푸는 일이었다', '보상을 받는 순간 저주가 옮겨온다', '구한 세계가 애초에 멸망했어야 했다', '진실을 밝히면 더 큰 거짓이 필요해진다',
  '의뢰인은 이미 오래전에 죽은 자였다', '목표물은 가짜였고 진짜는 추적자의 손에 있었다',
  '구원자로 불린 자가 재앙의 씨앗이었다', '모든 단서가 의뢰인의 손으로 조작되어 있었다', '괴물을 만든 것은 다름 아닌 마을 사람들이었다', '예언서의 저자가 바로 의뢰인이었다',
  '잃어버린 유물은 처음부터 가짜였다', '봉인을 풀어야만 더 큰 봉인이 지켜진다', '동료의 기억이 누군가에게 심어진 거짓이었다', '구출한 후계자가 왕좌를 노린 진짜 음모가였다',
  '저주를 퍼뜨린 것은 그 저주를 두려워하던 자였다', '적의 군세는 사실 죽은 자들의 환영이었다', '의뢰의 진짜 목적은 임무의 실패였다', '되살린 영웅이 옛 폭군 그 자체였다',
  '주인공이야말로 예언이 막으려던 재앙이었다', '구원의 의식이 곧 멸망의 의식이었다', '배신자는 처음부터 한 명도 없었다', '진짜 보물은 임무 그 자체가 남긴 인연이었다',
  '괴물은 의뢰인이 봉인했던 옛 자아였다', '추격자와 표적이 같은 한 사람이었다', '왕은 이미 오래전 가짜로 바뀌어 있었다', '구한 마을은 처음부터 환영에 불과했다',
  '죽음을 막으려던 행동이 죽음을 불러왔다', '봉인된 신은 사실 마을을 지키던 수호신이었다', '의뢰인은 미래에서 자신을 막으러 온 본인이었다', '잃어버린 기억 속에 진짜 범인이 숨어 있었다',
  '구원받은 자가 모든 비극의 시작이었다', '두 적대 세력의 우두머리는 한 형제였다', '예언을 이루려는 자가 곧 그것을 막으려는 자였다', '저주받은 검만이 세계를 구할 유일한 열쇠였다',
  '의뢰인이 찾던 사람은 거울 속의 자기 자신이었다', '함께 싸운 동료가 처음부터 환영이었다', '구해낸 자가 봉인되어야 마땅한 악이었다', '진실을 아는 유일한 증인이 곧 주인공이었다',
  '왕국을 구한 대가로 다른 왕국이 멸망했다', '죽은 자를 깨운 것이 모든 역병의 시작이었다', '의뢰인의 눈물은 처음부터 연기였다', '보상으로 받은 검에 옛 주인의 원혼이 깃들어 있었다',
  '실종된 탐사대는 스스로 사라지기를 택했다', '되찾은 왕관이 새로운 저주의 그릇이었다', '구원의 예언은 멸망을 부르려는 거짓이었다', '적의 정체는 미래의 자기 자신이었다',
  '봉인을 지킨 수호자가 사실 봉인된 악이었다', '의뢰인이 잃었다던 가족은 그가 직접 없앤 자들이었다', '주인공이 죽여야 할 괴물은 자신의 형제였다', '구한 세계가 누군가의 꿈속에 불과했다',
  '진짜 의뢰인은 이미 죽었고 누군가 그를 흉내 내고 있었다', '잠재운 망령이 마을의 진짜 수호자였다', '되돌린 시간 속에서 같은 비극이 되풀이된다', '모든 사건은 주인공을 시험하려는 신들의 장난이었다',
  '구원자라 믿었던 자가 실은 적의 첩자였다', '봉인된 보물은 봉인 그 자체가 진짜 보물이었다', '예언서의 마지막 장은 백지였다', '의뢰의 보수는 주인공의 기억으로 치러질 예정이었다',
  '괴물이 지키던 것은 마을의 마지막 희망이었다', '죽은 줄 알았던 스승이 모든 함정을 설계했다', '구출 대상은 구원이 아니라 죽음을 바라고 있었다', '임무를 끝내는 순간 주인공의 존재가 지워진다',
  '되찾은 보상은 처음부터 주인공의 것이었다', '의뢰인은 주인공을 시험하던 신의 화신이었다', '봉인을 푼 자가 다음 봉인의 제물이 된다', '구한 후계자가 곧 멸망을 부를 폭군이었다',
  '주인공이 쫓던 악당은 미래의 자기 자신이었다', '죽은 영웅의 자리를 이을 자는 주인공이었다', '의뢰의 진실은 임무가 시작되기 전부터 끝나 있었다', '괴물을 풀어 준 것이 진짜 임무였다',
  '동료의 충성은 처음부터 적의 명령이었다', '구원의 열쇠는 주인공이 버린 과거에 있었다', '두 적이 사실 같은 운명을 나눠 가진 쌍둥이였다', '저주를 끝낼 유일한 방법은 의뢰인의 죽음이었다',
  '예언이 가리킨 구원자는 끝내 나타나지 않았다', '봉인된 악은 세계를 지탱하던 기둥이었다', '의뢰인이 흘린 단서는 모두 미끼였다', '구한 세계는 다른 누군가의 멸망 위에 세워졌다',
]

const SLOTS: SlotDef[] = [
  { key: 'patron', label: '의뢰인', icon: '🪙', pool: PATRON },
  { key: 'goal', label: '목표', icon: '🎯', pool: GOAL },
  { key: 'obstacle', label: '장애', icon: '🛡️', pool: OBSTACLE },
  { key: 'reward', label: '보상', icon: '💰', pool: REWARD },
  { key: 'twist', label: '반전', icon: '🌀', pool: TWIST },
]

// 가능한 조합 수(슬롯 풀 곱) — 50억 이상(어조 제외)
const COMBOS = SLOTS.reduce((n, s) => n * s.pool.length, 1)

// ───────── 임무 어조(템플릿) — 같은 슬롯도 어조를 바꿔 문장을 다채롭게 ─────────
interface ToneDef { key: string; label: string; title: (s: Record<SlotKey, string>) => string; body: (s: Record<SlotKey, string>) => string }
const stripDot = (s: string) => s.replace(/[.。·]$/, '')
const TONES: ToneDef[] = [
  {
    key: 'classic', label: '정통',
    title: (s) => `${stripDot(s.goal)}`,
    body: (s) =>
      `${s.patron}이(가) 당신을 찾아온다. 임무는 ${stripDot(s.goal)}. ` +
      `그러나 ${stripDot(s.obstacle)}이(가) 길을 가로막는다. ` +
      `성공하면 ${stripDot(s.reward)}을(를) 얻으리라. ` +
      `— 다만, ${stripDot(s.twist)}.`,
  },
  {
    key: 'board', label: '게시판',
    title: (s) => `[의뢰] ${stripDot(s.goal)}`,
    body: (s) =>
      `의뢰인: ${s.patron}\n` +
      `목표: ${stripDot(s.goal)}\n` +
      `위험: ${stripDot(s.obstacle)}\n` +
      `보수: ${stripDot(s.reward)}\n` +
      `※ 알려지지 않은 사실 — ${stripDot(s.twist)}.`,
  },
  {
    key: 'hook', label: '도입부',
    title: (s) => `${s.patron}의 의뢰`,
    body: (s) =>
      `${s.patron}의 손이 떨리고 있었다. "${stripDot(s.goal)}—그것만 해준다면 ${stripDot(s.reward)}은(는) 당신의 것이오." ` +
      `대가가 너무 컸다. ${stripDot(s.obstacle)}을(를) 떠올리자 등골이 서늘해졌다. ` +
      `그가 끝내 말하지 않은 한 가지: ${stripDot(s.twist)}.`,
  },
]

// ───────── 유틸 ─────────
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const pick = (a: string[], avoid?: string) => {
  if (a.length <= 1) return a[0]
  let v = a[Math.floor(Math.random() * a.length)]
  if (avoid !== undefined && v === avoid) v = a[Math.floor(Math.random() * a.length)] // 연속 중복 완화
  return v
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmt = (n: number) => n.toLocaleString('ko-KR')

type SlotVals = Record<SlotKey, string>
interface Quest extends SlotVals { id: string; tone: string; note: string }

function emptyVals(): SlotVals {
  return { patron: '', goal: '', obstacle: '', reward: '', twist: '' }
}
function tone(key: string): ToneDef { return TONES.find((t) => t.key === key) || TONES[0] }
function titleOf(v: SlotVals, toneKey: string): string { return tone(toneKey).title(v) }
function bodyOf(v: SlotVals, toneKey: string): string { return tone(toneKey).body(v) }
function plainOf(v: SlotVals, toneKey: string): string {
  return `《${titleOf(v, toneKey)}》\n${bodyOf(v, toneKey)}`
}
function bodyHtmlOf(v: SlotVals, toneKey: string): string {
  const para = bodyOf(v, toneKey).split('\n').map((ln) => `<p>${esc(ln)}</p>`).join('')
  const rows = SLOTS.map((s) => `<li><b>${esc(s.icon + ' ' + s.label)}:</b> ${esc(stripDot(v[s.key]))}</li>`).join('')
  return `${para}<hr/><ul>${rows}</ul>`
}

// ───────── 영속 상태 ─────────
interface Persist { current: SlotVals; locks: Record<string, boolean>; toneKey: string; saved: Quest[] }
function load(): Persist {
  const fallback: Persist = { current: emptyVals(), locks: {}, toneKey: 'classic', saved: [] }
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    const cur = emptyVals()
    SLOTS.forEach((s) => { if (p?.current && typeof p.current[s.key] === 'string') cur[s.key] = p.current[s.key] })
    const locks: Record<string, boolean> = {}
    SLOTS.forEach((s) => { if (p?.locks && p.locks[s.key]) locks[s.key] = true })
    const toneKey = TONES.some((t) => t.key === p?.toneKey) ? p.toneKey : 'classic'
    const saved: Quest[] = Array.isArray(p?.saved)
      ? p.saved.filter((q: any) => q && typeof q === 'object').map((q: any) => {
          const v = emptyVals()
          SLOTS.forEach((s) => { v[s.key] = typeof q[s.key] === 'string' ? q[s.key] : '' })
          return { ...v, id: typeof q.id === 'string' ? q.id : rid(), tone: TONES.some((t) => t.key === q.tone) ? q.tone : 'classic', note: typeof q.note === 'string' ? q.note : '' }
        })
      : []
    return { current: cur, locks, toneKey, saved }
  } catch { return fallback }
}

export default function QuestForge({ payload: _payload }: { payload?: Record<string, unknown> } = {}) {
  const init = useRef(load())
  const [vals, setVals] = useState<SlotVals>(init.current.current)
  const [locks, setLocks] = useState<Record<string, boolean>>(init.current.locks)
  const [toneKey, setToneKey] = useState<string>(init.current.toneKey)
  const [saved, setSaved] = useState<Quest[]>(init.current.saved)
  const [tab, setTab] = useState<'forge' | 'saved'>('forge')
  const [rolling, setRolling] = useState(false)
  const [feedback, setFeedback] = useState('') // 토스트(복사/연계)
  const [editId, setEditId] = useState('')
  const [editText, setEditText] = useState('')

  const alive = useRef(true)
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (rollTimer.current) clearTimeout(rollTimer.current)
      if (fbTimer.current) clearTimeout(fbTimer.current)
    }
  }, [])

  // 영속 저장(잠금/현재/어조/즐겨찾기)
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ current: vals, locks, toneKey, saved })) }
    catch { /* 용량 초과 등 graceful 무시 */ }
  }, [vals, locks, toneKey, saved])

  const flash = (msg: string) => {
    if (!alive.current) return
    setFeedback(msg)
    if (fbTimer.current) clearTimeout(fbTimer.current)
    fbTimer.current = setTimeout(() => { if (alive.current) setFeedback('') }, 2000)
  }

  // 잠기지 않은 슬롯만 재생성(잠긴 슬롯은 유지)
  const forge = () => {
    setRolling(true)
    setVals((prev) => {
      const next: SlotVals = { ...prev }
      SLOTS.forEach((s) => {
        if (locks[s.key] && prev[s.key]) return
        next[s.key] = pick(s.pool, prev[s.key])
      })
      return next
    })
    if (rollTimer.current) clearTimeout(rollTimer.current)
    rollTimer.current = setTimeout(() => { if (alive.current) setRolling(false) }, 320)
  }

  const rerollOne = (key: SlotKey) => {
    const slot = SLOTS.find((s) => s.key === key)!
    setVals((prev) => ({ ...prev, [key]: pick(slot.pool, prev[key]) }))
  }
  const toggleLock = (key: SlotKey) => setLocks((prev) => ({ ...prev, [key]: !prev[key] }))

  const hasAll = SLOTS.every((s) => !!vals[s.key])
  const hasAny = SLOTS.some((s) => !!vals[s.key])

  const copyCurrent = () => {
    if (!hasAll) return
    const text = plainOf(vals, toneKey)
    if (!navigator.clipboard?.writeText) { flash('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => flash('임무를 복사했습니다.')).catch(() => flash('복사에 실패했습니다.'))
  }

  const saveCurrent = () => {
    if (!hasAll) return
    const q: Quest = { ...vals, id: rid(), tone: toneKey, note: '' }
    setSaved((prev) => [q, ...prev])
    setTab('saved')
    flash('즐겨찾기에 저장했습니다.')
  }

  // 연계: 프로젝트 자료(research)/'플롯' 폴더에 임무 문서 추가
  const linked = hasProjectBridge()
  const toProject = (v: SlotVals, tk: string) => {
    if (!hasAll && v === vals) return
    if (!linked) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: `🗡️ 임무 — ${titleOf(v, tk)}`,
      bodyHtml: bodyHtmlOf(v, tk),
      synopsis: bodyOf(v, tk).replace(/\n/g, ' '),
      meta: {
        의뢰인: stripDot(v.patron), 목표: stripDot(v.goal), 장애: stripDot(v.obstacle),
        보상: stripDot(v.reward), 반전: stripDot(v.twist), 출처: '퀘스트 단조소',
      },
    })
    flash(id ? '프로젝트 자료 〈플롯〉 폴더에 임무를 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // 연계: 스니펫 라이브러리에 글감으로 저장
  const toSnippet = (v: SlotVals, tk: string) => {
    addToLibrary('snippets', { text: plainOf(v, tk), source: '퀘스트 단조소', tags: ['임무', '퀘스트', '글감', '발상'] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  // 즐겨찾기 조작
  const removeSaved = (id: string) => {
    setSaved((prev) => prev.filter((q) => q.id !== id))
    if (editId === id) { setEditId(''); setEditText('') }
  }
  const moveSaved = (id: string, dir: -1 | 1) => {
    setSaved((prev) => {
      const i = prev.findIndex((q) => q.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const a = prev.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
  }
  const loadSaved = (q: Quest) => {
    const v = emptyVals()
    SLOTS.forEach((s) => { v[s.key] = q[s.key] })
    setVals(v); setToneKey(q.tone); setTab('forge')
    flash('단조소로 불러왔습니다. 슬롯을 잠그고 다시 생성해 보세요.')
  }
  const startEdit = (q: Quest) => { setEditId(q.id); setEditText(q.note) }
  const commitEdit = () => {
    const t = editText.trim()
    setSaved((prev) => prev.map((q) => (q.id === editId ? { ...q, note: t } : q)))
    setEditId(''); setEditText('')
  }
  const copySaved = (q: Quest) => {
    const text = plainOf(q, q.tone) + (q.note ? `\n📝 ${q.note}` : '')
    if (!navigator.clipboard?.writeText) { flash('이 환경에서는 복사를 지원하지 않습니다.'); return }
    navigator.clipboard.writeText(text).then(() => flash('복사했습니다.')).catch(() => flash('복사에 실패했습니다.'))
  }

  // ───────── 스타일 ─────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const slotRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const cardBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }

  return (
    <div style={wrap}>
      <div style={hint}>
        다섯 슬롯(<b>의뢰인·목표·장애·보상·반전</b>)을 무작위 조합해 모험 임무를 만듭니다.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 생성하세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setTab('forge')} aria-pressed={tab === 'forge'}
          style={{ borderColor: tab === 'forge' ? 'var(--accent)' : 'var(--border)', color: tab === 'forge' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="🗡️"/> 단조소
        </button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'}
          style={{ borderColor: tab === 'saved' ? 'var(--accent)' : 'var(--border)', color: tab === 'saved' ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="⭐"/> 즐겨찾기 ({saved.length})
        </button>
      </div>

      {feedback && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--ok)', color: 'var(--ok)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
          {feedback}
        </div>
      )}

      {tab === 'forge' && (
        <>
          {/* 어조 선택 + 조합 수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>어조</span>
            {TONES.map((t) => (
              <button key={t.key} className="minibtn" onClick={() => setToneKey(t.key)} aria-pressed={toneKey === t.key}
                style={{ borderColor: toneKey === t.key ? 'var(--accent)' : 'var(--border)', color: toneKey === t.key ? 'var(--text)' : 'var(--muted)' }}>
                {t.label}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }} title="다섯 슬롯 풀의 곱 (어조 제외)">
              가능한 조합 <b style={{ color: 'var(--accent)' }}>{fmt(COMBOS)}</b>가지
            </span>
          </div>

          {/* 슬롯들 */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {SLOTS.map((s) => {
              const v = vals[s.key]
              const isLocked = !!locks[s.key]
              return (
                <div key={s.key} style={slotRow}>
                  <div style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0, transition: 'transform .2s', transform: rolling && !isLocked ? 'rotate(-10deg) scale(1.12)' : 'none' }}>
                    <Emoji e={s.icon}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.7 }}>({s.pool.length})</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: v ? 'var(--text)' : 'var(--muted)', wordBreak: 'keep-all' }}>
                      {v ? (rolling && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                    </div>
                  </div>
                  <button className="minibtn" onClick={() => rerollOne(s.key)} disabled={isLocked} title={isLocked ? '고정 해제 후 가능' : '이 슬롯만 다시'} style={{ flexShrink: 0, padding: '4px 8px' }}><Emoji e="🔁"/></button>
                  <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'} style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)', padding: '4px 8px' }}>
                    {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
                  </button>
                </div>
              )
            })}

            {/* 완성된 임무 미리보기 */}
            {hasAll && (
              <div style={{ ...cardBox, marginTop: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}><Emoji e="📜"/> 《{titleOf(vals, toneKey)}》</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{bodyOf(vals, toneKey)}</div>
              </div>
            )}
            {!hasAny && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="🗡️"/></div>
                아래 <b>임무 생성</b>을 눌러<br />첫 모험 임무를 단조하세요.
              </div>
            )}
          </div>

          {/* 생성/저장 버튼 */}
          <button className="btn-primary" onClick={forge}><Emoji e="⚒️"/> {hasAny ? '임무 다시 생성 (잠금 유지)' : '임무 생성'}</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={saveCurrent} disabled={!hasAll}><Emoji e="⭐"/> 즐겨찾기</button>
            <button className="minibtn" onClick={copyCurrent} disabled={!hasAll}><Emoji e="📋"/> 복사</button>
            <span style={{ flex: 1 }} />
            <button className="linkbtn" onClick={() => toSnippet(vals, toneKey)} disabled={!hasAll} title="이 임무를 스니펫 라이브러리에 글감으로 저장"><Emoji e="📥"/> 스니펫</button>
            <button className="linkbtn" onClick={() => toProject(vals, toneKey)} disabled={!hasAll || !linked}
              title={!linked ? '프로젝트에 연결되어 있지 않습니다' : '이 임무를 프로젝트 자료(플롯 폴더)에 문서로 추가'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
          <div style={hint}>임무는 출발점일 뿐입니다. 반전과 보상을 비틀어 당신의 이야기에 맞춰 보세요.</div>
        </>
      )}

      {tab === 'saved' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {saved.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐"/></div>
              저장한 임무가 없습니다.<br />
              <span style={{ fontSize: 12 }}>단조소에서 <Emoji e="⭐"/> 즐겨찾기로 마음에 드는 임무를 모아보세요.</span>
            </div>
          ) : (
            saved.map((q, i) => (
              <div key={q.id} style={cardBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="📜"/> {titleOf(q, q.tone)}</span>
                  <button className="minibtn" onClick={() => moveSaved(q.id, -1)} disabled={i === 0} title="위로" style={{ padding: '2px 7px' }}>▲</button>
                  <button className="minibtn" onClick={() => moveSaved(q.id, 1)} disabled={i === saved.length - 1} title="아래로" style={{ padding: '2px 7px' }}>▼</button>
                  <button className="minibtn" onClick={() => removeSaved(q.id)} title="삭제" style={{ padding: '2px 7px', borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑"/></button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{bodyOf(q, q.tone)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                  {SLOTS.map((s) => (
                    <span key={s.key} style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}><Emoji e={s.icon}/> {stripDot(q[s.key])}</span>
                  ))}
                </div>

                {editId === q.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(''); setEditText('') } }}
                      placeholder="메모 (내 이야기에 어떻게 쓸지)"
                      style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12, outline: 'none' }} />
                    <button className="minibtn" onClick={commitEdit}>저장</button>
                    <button className="minibtn" onClick={() => { setEditId(''); setEditText('') }}>취소</button>
                  </div>
                ) : (
                  q.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="📝"/> {q.note}</div>
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => loadSaved(q)} title="이 임무를 단조소로 불러오기"><Emoji e="↩️"/> 불러오기</button>
                  <button className="minibtn" onClick={() => startEdit(q)} title="메모 편집"><Emoji e="✏️"/> 메모</button>
                  <button className="minibtn" onClick={() => copySaved(q)} title="복사"><Emoji e="📋"/> 복사</button>
                  <span style={{ flex: 1 }} />
                  <button className="linkbtn" onClick={() => toSnippet(q, q.tone)} title="스니펫 라이브러리에 저장"><Emoji e="📥"/> 스니펫</button>
                  <button className="linkbtn" onClick={() => toProject(q, q.tone)} disabled={!linked}
                    title={!linked ? '프로젝트에 연결되어 있지 않습니다' : '프로젝트 자료(플롯 폴더)에 추가'}><Emoji e="📄"/> 프로젝트에 추가</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
