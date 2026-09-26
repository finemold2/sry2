// 미스터리·추리 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를
//   카테고리(수사·경찰 / 법의학·부검 / 범죄·트릭 용어 / 단서·증거 / 탐정 화법·추리 / 의심·심문 /
//   긴장·서스펜스 묘사 / 반전·해결 / 클리셰·전복)로 모은 로컬 사전.
//   본격(에도가와 란포·아가사 크리스티·엘러리 퀸)·하드보일드(챈들러·해밋)·법의학 스릴러(콘월)·
//   경찰소설(맥베인 87분서)·일상의 수수께끼·이야미스(미나토 가나에) 등 대표작·관습에 근거한 자작 데이터.
//   카테고리 펼침·검색·무작위·클릭복사 + 스니펫 저장 + 프로젝트 메모 추가.
//   자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. localStorage 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'mystery-lexicon', name: '미스터리·추리 어휘·표현 사전', icon: '🔍', group: '어휘·표현', genre: '미스터리·추리', intro: '수사·법의학·트릭·단서·탐정 화법·서스펜스 상투구… 추리물 특유의 어휘·관용구·말투를 찾아 클릭 복사·스니펫 저장', w: 660, h: 640 }

interface Term { word: string; read?: string; gloss: string; use?: string }
interface CatDef { key: string; label: string; icon: string; desc: string; items: Term[] }

// 본격·하드보일드·법의학·경찰소설·이야미스 등 추리 하위장르의 대표작·관습에 근거.
//  일반론이 아니라 이 장르에 구체적·특화된 항목만 수록(대표작/관습 근거를 뜻풀이에 명시).
const CATS: CatDef[] = [
  {
    key: 'police', label: '수사·경찰·법절차', icon: '🚓', desc: '관할·영장·조서 등 경찰소설(맥베인 87분서·경찰소설) 고증 어휘',
    items: [
      { word: '관할', read: '管轄', gloss: '사건을 다룰 권한이 있는 경찰서·부서의 구역. 관할 다툼은 수사물의 단골 갈등.', use: '“시신이 강 한가운데서 발견되자, 두 경찰서가 관할을 두고 신경전을 벌였다.”' },
      { word: '초동수사', read: '初動搜査', gloss: '사건 발생 직후의 첫 수사. 현장 보존·목격자 확보의 골든타임이 여기서 갈린다.', use: '“초동수사가 어그러진 탓에, 결정적 발자국이 빗물에 씻겨 사라졌다.”' },
      { word: '현장 보존 / 폴리스라인', gloss: '증거 오염을 막기 위해 현장을 봉쇄·통제하는 절차. 출입 통제선이 깨지면 단서가 죽는다.', use: '“폴리스라인 안에서, 그는 신발에 비닐 덮개를 씌우고서야 발을 들였다.”' },
      { word: '탐문 / 행적 수사', gloss: '주변인·목격자를 일일이 묻고(탐문) 용의자의 동선을 되짚는(행적) 발품 수사. 경찰소설의 뼈대.', use: '“형사는 사흘간 그 골목의 가게를 한 곳도 빼지 않고 탐문했다.”' },
      { word: '용의자 / 참고인 / 피의자', read: '容疑者·被疑者', gloss: '혐의가 있는 자(용의자), 사정을 아는 제3자(참고인), 입건된 자(피의자)의 법적 구분.', use: '“그는 아직 참고인이었다. 조서에 한 줄만 더 적히면, 용의자가 될 수도 있었다.”' },
      { word: '체포영장 / 압수수색영장', read: '逮捕令狀', gloss: '체포·수색을 위해 법원이 발부하는 허가서. ‘영장이 안 나온다’는 수사의 벽.', use: '“정황은 차고 넘쳤지만, 판사를 설득할 한 줄이 없어 영장은 기각됐다.”' },
      { word: '알리바이', gloss: '범행 시각에 다른 곳에 있었다는 부재증명. 본격 추리의 핵심 공방 — 깨는 것이 곧 해결.', use: '“완벽해 보이던 알리바이는, 열차 시각표의 단 1분 차이로 무너졌다.”' },
      { word: '동기·수단·기회', gloss: '범죄 성립의 세 기둥(motive·means·opportunity). 셋이 한 사람에게 모이는 순간이 범인.', use: '“동기는 셋, 수단은 둘, 기회는 단 한 사람뿐이었다.”' },
      { word: '조서 / 진술 / 자백', read: '調書·自白', gloss: '심문 내용을 적은 문서(조서)·말한 내용(진술)·범행 시인(자백). ‘자백만으론 유죄가 안 된다.’', use: '“자백은 받아냈지만, 그는 보강 증거가 없는 자백을 믿지 않았다.”' },
      { word: '미제사건 / 콜드케이스', read: '未濟事件', gloss: '범인을 잡지 못한 채 시간이 흐른 사건. 재수사·공소시효는 현대 추리의 단골 무대.', use: '“15년 묵은 콜드케이스 파일이, 그의 책상 위로 다시 올라왔다.”' },
      { word: '공소시효', read: '公訴時效', gloss: '일정 기간이 지나면 기소할 수 없게 되는 제도. ‘시효 만료 직전’은 강력한 시계 장치.', use: '“공소시효 만료까지 닷새. 범인은 그 닷새만 버티면 됐다.”' },
      { word: '프로파일링', gloss: '범행 양태로 범인의 성향·특징을 추정하는 기법. 연쇄·이상범죄 수사물의 단골 무기.', use: '“프로파일러는 범인을 ‘질서형, 30대, 권위에 굴욕당한 경험’이라 그려 냈다.”' },
      { word: '수사 회의 / 수사본부', gloss: '단서·진척을 공유하는 회의와 그 거점. 화이트보드의 사진·실선은 수사물의 시각 기호.', use: '“수사본부의 화이트보드엔, 피해자 사진을 잇는 붉은 실이 거미줄처럼 얽혀 있었다.”' },
      { word: '내사 / 별건수사', read: '內査·別件搜査', gloss: '비공개 조사(내사)와 다른 혐의로 신병을 확보하는 우회(별건). 부패·음모물의 회색 영역.', use: '“정면으로는 손댈 수 없자, 그들은 별건수사로 그를 묶어 두려 했다.”' },
      { word: '현행범 / 긴급체포', read: '現行犯·緊急逮捕', gloss: '범행 중·직후에 잡힌 자(현행범)와 영장 없이 먼저 신병을 확보하는 절차(긴급체포). 시간이 핵심인 추격물의 분기점.', use: '“영장이 나올 때까지 기다릴 여유가 없었다. 형사는 그를 긴급체포로 먼저 붙들었다.”' },
    ],
  },
  {
    key: 'forensic', label: '법의학·부검·과학수사', icon: '🔬', desc: '사후경직·사망추정시각 등 법의학 스릴러(퍼트리샤 콘월·CSI) 고증 어휘',
    items: [
      { word: '부검 / 검시', read: '剖檢·檢屍', gloss: '사인을 밝히기 위해 시신을 절개·검사하는 행위(부검)와 외표 조사(검시). 법의학물의 무대.', use: '“부검대 위, 법의관의 첫 한마디가 사건의 방향을 통째로 바꿔 놓았다.”' },
      { word: '사후경직', read: '死後硬直', gloss: '사망 후 근육이 굳는 현상(rigor mortis). 진행 정도로 사망시각을 역산하는 단골 단서.', use: '“사후경직이 턱과 목까지 풀린 걸 보면, 죽은 지 하루는 넘었다는 뜻이었다.”' },
      { word: '시반', read: '屍斑', gloss: '피가 중력을 따라 아래로 고여 생기는 반점(livor mortis). 시신을 옮겼는지 알려 주는 증거.', use: '“시반이 등이 아니라 가슴에 있었다 — 누군가 시신을 뒤집어 놓았다는 뜻이다.”' },
      { word: '사망추정시각', read: '死亡推定時刻', gloss: '체온·경직·시반·위 내용물로 추정한 죽음의 시각. 알리바이 공방의 기준점이 된다.', use: '“사망추정시각이 자정에서 새벽 두 시 사이로 좁혀지자, 그의 알리바이가 흔들렸다.”' },
      { word: '직접사인 / 사망의 종류', gloss: '죽음을 일으킨 직접 원인과 그 양태(자연사·병사·사고·자살·타살·불상). ‘타살’ 판정이 사건의 출발.', use: '“검안서의 ‘사망의 종류’ 칸에 ‘불상(不詳)’이라 적힌 순간, 그는 직감했다.”' },
      { word: '교살 / 액사 / 의사', read: '絞殺·扼死·縊死', gloss: '끈으로 조름(교살)·손으로 조름(액사)·목매달림(의사). 목의 흔적(삭흔)이 셋을 가른다.', use: '“삭흔이 수평으로 나 있었다. 목을 맨 게 아니라, 누군가 뒤에서 졸랐다는 증거였다.”' },
      { word: '방어흔 / 저항흔', read: '防禦痕', gloss: '피해자가 막으려다 생긴 상처(손바닥·팔뚝). 그 부재는 ‘아는 사람의 소행’을 암시.', use: '“방어흔이 전혀 없었다. 피해자는 자신을 죽일 사람을 의심조차 하지 않았던 것이다.”' },
      { word: '위 내용물 / 소화 정도', gloss: '위 속 음식의 소화 단계로 마지막 식사·사망시각을 추정. 법의학적 시계의 한 부품.', use: '“위에서 아직 소화되지 않은 면이 나왔다. 죽기 한 시간 안에 라면을 먹었다는 뜻.”' },
      { word: '독물 검사 / 약독물', read: '毒物檢査', gloss: '체액·장기에서 독·약물을 검출하는 분석. 독살은 본격 추리의 고전적 수단.', use: '“혈액에서 검출된 건 흔한 수면제였다 — 다만, 치사량의 열 배였다.”' },
      { word: '루미놀 반응', gloss: '혈흔에 반응해 푸르게 발광하는 시약. 닦아 낸 피까지 드러내는 ‘보이지 않는 증거’의 상징.', use: '“불을 끄고 루미놀을 뿌리자, 깨끗하던 욕실 바닥이 온통 푸르게 떠올랐다.”' },
      { word: '지문 / 잠재지문', read: '指紋·潛在指紋', gloss: '눈에 보이는 지문과 약품·분말로 현출하는 숨은 지문. 가장 고전적인 동일성 증거.', use: '“유리잔에서 떠오른 잠재지문 하나가, 거짓말로 쌓은 알리바이를 무너뜨렸다.”' },
      { word: 'DNA 감정 / 미세증거', gloss: '체액·모발의 DNA, 섬유·토양 같은 미세증거(trace). 현대 법과학 추리의 결정타.', use: '“손톱 밑에서 채취한 피부 조각의 DNA가, 30년 전 미제사건과 일치했다.”' },
      { word: '검시관 / 법의관', read: '檢視官·法醫官', gloss: '죽음을 판정·해석하는 전문가. 차갑고 건조한 화법으로 진실을 전하는 추리물의 신뢰자.', use: '“법의관은 감정을 싣지 않고 말했다. ‘이건 사고가 아닙니다.’”' },
      { word: '검안서 / 사체검안', read: '檢案書', gloss: '의사가 죽음을 확인·기록한 문서. 사인 한 줄을 바꾸면 사건 전체가 뒤집힌다.', use: '“검안서를 다시 떼어 보니, 처음 적힌 ‘심장마비’ 위에 누군가 손을 댄 흔적이 있었다.”' },
      { word: '혈흔 형태 분석 / 비산흔', read: '血痕·飛散痕', gloss: '핏방울의 모양·각도·분포로 가해 방향과 위치를 역산하는 기법(BPA). 벽에 튄 비산흔이 범행의 자세를 그려 낸다.', use: '“벽에 흩뿌려진 핏방울의 각도가, 피해자가 앉아 있을 때 위에서 내리쳤음을 말해 주었다.”' },
    ],
  },
  {
    key: 'crime', label: '범죄·트릭·수법', icon: '🗝️', desc: '밀실·서술트릭·노킹온헤븐 등 본격 추리(란포·카)의 트릭 분류 어휘',
    items: [
      { word: '밀실 / 밀실살인', read: '密室', gloss: '안에서 잠긴 방에서 일어난 살인. 본격 추리의 꽃(존 딕슨 카 『세 개의 관』). “어떻게 들어가고 나갔나?”', use: '“문은 안에서 잠겨 있었고, 창엔 빗장이 걸려 있었다. 그런데 시신만 그 안에 있었다.”' },
      { word: '알리바이 트릭', gloss: '시간·장소를 속여 부재증명을 조작하는 수법. 열차 시각표·시계 조작이 고전(아유카와 데쓰야).', use: '“완벽한 알리바이일수록 의심하라 — 자연스러운 우연엔 구멍이 없으니까.”' },
      { word: '서술 트릭', read: '敍述', gloss: '서술자·독자에게만 통하는 속임수(성별·인물 동일·시점 은폐). 작가가 독자를 속이는 메타 트릭.', use: '“마지막 한 줄에서, 줄곧 ‘그’라 믿었던 화자가 두 사람이었음이 드러났다.”' },
      { word: '독살 / 위장 자살', read: '毒殺', gloss: '독으로 죽이거나(독살) 타살을 자살로 꾸미는(위장) 수법. 흔적이 적어 본격의 단골.', use: '“유서까지 완벽했다. 다만, 죽은 자의 글씨라기엔 너무 또박또박했다.”' },
      { word: '일인이역 / 변장', read: '一人二役·變裝', gloss: '한 사람이 두 사람인 척하거나 다른 이로 위장하는 수법. 목격·알리바이를 동시에 조작.', use: '“쌍둥이가 아니었다. 한 사람이 두 도시에 ‘동시에’ 존재한 척했을 뿐이다.”' },
      { word: '시신 바꿔치기 / 신원 위장', gloss: '피해자·가해자의 신원을 뒤바꾸는 트릭. ‘죽은 줄 알았던 자’가 범인인 고전 구도.', use: '“불에 탄 시신의 신원은 의심받지 않았다 — 손가락에 그의 반지가 끼워져 있었으니까.”' },
      { word: '다잉 메시지', gloss: '죽어 가는 피해자가 남긴 단서(글자·물건·자세). 모호함으로 오독을 유도하는 본격의 명물.', use: '“피해자는 피로 ‘43’이라 적고 숨졌다. 그것이 숫자가 아니라 이름이었음을, 그는 뒤늦게 깨달았다.”' },
      { word: '범행 현장 위장 / 연출', gloss: '강도·사고로 보이게 현장을 꾸미는 수법(staging). 과하게 ‘완벽한’ 현장이 도리어 단서.', use: '“서랍은 죄다 뒤집혔는데, 정작 금고는 멀쩡했다. 강도로 ‘보이려’ 한 흔적이었다.”' },
      { word: '청부 / 교사 / 공범', read: '請負·敎唆', gloss: '돈으로 시킴(청부)·부추김(교사)·함께 저지름(공범). ‘진짜 범인은 손에 피를 안 묻힌다.’', use: '“방아쇠를 당긴 자는 따로 있었다. 진짜 범인은, 그에게 돈을 건넨 사람이었다.”' },
      { word: '완전범죄', read: '完全犯罪', gloss: '흔적 없이 처벌을 피하는 범죄. 추리물의 영원한 가설이자, 반드시 무너지는 오만.', use: '“완전범죄라 믿었다. 단 하나, 그가 미처 계산하지 못한 변수가 있었을 뿐.”' },
      { word: '연쇄살인 / 시그니처', read: '連鎖殺人', gloss: '동일범의 반복 범행과 그 고유 표식(signature). 패턴을 읽어 다음 범행을 예측하는 추격물.', use: '“세 번째 시신에도 같은 표식이 있었다. 범인은 그것을 ‘서명’처럼 남겼다.”' },
      { word: '협박 / 공갈 / 약점', read: '脅迫·恐喝', gloss: '비밀·약점을 쥐고 위협함. 협박은 동기의 보고이자, 또 다른 살인의 씨앗.', use: '“협박편지를 받은 자가 한둘이 아니었다. 그래서 용의자도 한둘이 아니었다.”' },
      { word: '트릭의 페어플레이', gloss: '범인을 가릴 단서를 독자에게 미리 다 보여 줘야 한다는 본격의 규칙(녹스의 십계·반다인 20칙).', use: '“되짚어 보면, 단서는 모두 2장에 놓여 있었다. 다만 우리가 그냥 지나쳤을 뿐.”' },
      { word: '시간차 살인 / 원격 트릭', read: '時間差', gloss: '미리 장치를 걸어 두고 범인은 멀리 떨어진 시각에 작동시키는 수법(타이머·약물 지연·역학 장치). 범행 순간의 알리바이를 만든다.', use: '“독은 천천히 퍼지도록 계산돼 있었다. 그가 만찬장을 떠난 한참 뒤에야, 효과가 나타나도록.”' },
    ],
  },
  {
    key: 'clue', label: '단서·증거·복선', icon: '🧩', desc: '결정적 증거·붉은 청어·복선 등 단서 설계 어휘(추리의 페어플레이)',
    items: [
      { word: '단서 / 실마리', read: '端緒', gloss: '진실로 이어지는 작은 흔적. 사소해 보일수록 결정적인, 추리물의 기본 입자.', use: '“그 하찮은 단추 하나가, 결국 모든 것을 풀어내는 실마리였다.”' },
      { word: '결정적 증거 / 스모킹 건', gloss: '범인을 못 박는 움직일 수 없는 증거(smoking gun). 해결의 방아쇠.', use: '“그가 내민 한 장의 영수증이, 모두가 침묵하던 방에 결정적 증거로 떨어졌다.”' },
      { word: '붉은 청어 / 헛다리', read: '레드 헤링', gloss: '독자·탐정을 엉뚱한 데로 유인하는 거짓 단서(red herring). 의심을 분산시키는 장치.', use: '“가장 수상하던 집사는 붉은 청어였다. 진범은 가장 의심받지 않던 사람이었다.”' },
      { word: '복선 / 회수', read: '伏線', gloss: '나중을 위해 미리 심어 둔 암시와 그 회수. 해결편에서 ‘아, 그래서!’를 만드는 설계.', use: '“1장의 멈춘 벽시계는 장식이 아니었다. 그것은 마지막 장에서 회수될 복선이었다.”' },
      { word: '미싱 링크', gloss: '여러 사건·인물을 잇는 빠진 고리(missing link). 그것을 찾는 순간 흩어진 점이 선이 된다.', use: '“세 피해자의 미싱 링크는, 20년 전 같은 학교의 같은 반이라는 사실이었다.”' },
      { word: '위증 / 거짓 증언', read: '僞證', gloss: '거짓으로 꾸민 진술. ‘누가 거짓말을 하고 있는가’를 가려내는 것이 심문의 핵심.', use: '“그녀의 증언엔 단 한 군데, 본 적도 없는 것을 ‘봤다’고 한 위증이 숨어 있었다.”' },
      { word: '정황증거 / 물증', read: '情況證據·物證', gloss: '정황으로 추정케 하는 증거와 물리적 증거. ‘정황은 차고 넘치나 물증이 없다’는 벽.', use: '“정황증거는 산더미였지만, 그를 묶을 단 하나의 물증이 끝내 나오지 않았다.”' },
      { word: '족적 / 유류품', read: '足跡·遺留品', gloss: '범인이 남긴 발자국과 흘린 물건. 현장에 ‘있어선 안 될 것’·‘있어야 할 것의 부재’가 단서.', use: '“현장엔 발자국이 하나도 없었다. 비가 그친 진흙탕인데도 — 그 부재가 가장 큰 단서였다.”' },
      { word: '체크무늬 / 어긋남', gloss: '진술·정황 사이의 미세한 모순. 사소한 ‘아귀가 안 맞음’이 거짓의 실밥을 푼다.', use: '“모두의 말이 맞아떨어졌다. 단 하나, 시계 소리에 관한 두 사람의 말만 어긋났다.”' },
      { word: '동선 / 타임라인', read: '動線', gloss: '인물들의 시간별 이동 경로. 표로 정리해 알리바이의 빈틈·교차점을 찾는 본격의 도구.', use: '“타임라인을 펼쳐 놓자, 단 7분 동안 그가 어디에도 없었다는 사실이 드러났다.”' },
      { word: '증거 인멸 / 은폐', read: '證據 湮滅·隱蔽', gloss: '증거를 없애거나 숨기는 행위. ‘무엇을 지웠는가’가 도리어 진실을 가리킨다.', use: '“태워 없앤 편지의 재 속에서, 단 한 글자가 살아남아 있었다.”' },
      { word: '맥거핀', gloss: '이야기를 굴리지만 정체는 중요치 않은 추동 장치(MacGuffin·히치콕). 추격의 ‘미끼’.', use: '“모두가 그 가방을 쫓았다. 정작 가방 안에 뭐가 들었는지는, 끝내 아무도 몰랐다.”' },
      { word: '심어 둔 증거 / 조작된 단서', gloss: '범인이 무고한 자에게 죄를 씌우려 일부러 흘려 둔 가짜 증거. ‘너무 친절하게 발견되는 단서’가 도리어 의심을 부른다.', use: '“현장엔 그의 단추가 떨어져 있었다. 너무 보란 듯이 — 마치 누군가 거기 놓아두기라도 한 것처럼.”' },
    ],
  },
  {
    key: 'detective', label: '탐정 화법·추리', icon: '🕵️', desc: '연역·소거법·회색 뇌세포 등 명탐정의 추리 화법(홈즈·포와로·퀸)',
    items: [
      { word: '연역 / 추론', read: '演繹·推論', gloss: '관찰한 사실에서 결론을 끌어내는 사고(셜록 홈즈의 ‘deduction’). 명탐정 화법의 근간.', use: '“‘당신은 오늘 아침 기차로 오셨군요.’ — 그는 신발에 묻은 진흙만으로 추론했다.”' },
      { word: '소거법 / 배제', read: '消去法', gloss: '“불가능한 것을 모두 지우면 남는 것이, 아무리 믿기지 않아도 진실이다”(홈즈의 격률).', use: '“불가능한 용의자를 하나씩 지워 가자, 결국 가장 믿기지 않던 한 사람만 남았다.”' },
      { word: '관찰과 추리', gloss: '‘보되 관찰하지 않는다’는 홈즈식 일침. 남들이 지나친 디테일을 의미로 읽어 내는 능력.', use: '“다들 그 방을 보았다. 그러나 그만이, 벽난로의 재가 너무 적다는 것을 관찰했다.”' },
      { word: '회색 뇌세포', gloss: '에르퀼 포와로가 발품 대신 ‘머리’로 푼다며 즐겨 쓴 표현(little grey cells). 안락의자 추리.', use: '“‘발은 그만 쓰고, 회색 뇌세포를 쓰세요, 친구.’ 포와로는 손가락으로 관자놀이를 두드렸다.”' },
      { word: '독자에의 도전', read: '讀者への挑戰', gloss: '“이제 단서는 다 나왔다, 풀 수 있겠는가?”라는 본격의 개입(엘러리 퀸의 명물).', use: '“여기서 작가는 펜을 멈추고 묻는다 — 범인을 가릴 단서는, 모두 당신 앞에 놓였다.”' },
      { word: '해결편 / 진상 폭로', read: '解決篇', gloss: '탐정이 관계자를 모아 두고 진상을 밝히는 클라이맥스(객실 모임·라스트 추리). 본격의 정점.', use: '“그는 응접실에 모두를 불러 모았다. ‘범인은, 이 방 안에 있습니다.’”' },
      { word: '뒤집힌 추리 / 도서추리', gloss: '범인을 먼저 보여 주고 ‘어떻게 잡히나’를 좇는 형식(콜롬보·『형사 콜롬보』의 도서추리).', use: '“독자는 처음부터 범인을 알았다. 흥미는 ‘잡느냐’가 아니라 ‘어떻게 무너뜨리나’에 있었다.”' },
      { word: '안락의자 탐정', gloss: '현장에 가지 않고 전해 들은 정보만으로 푸는 탐정(armchair detective). 순수 논리의 게임.', use: '“그는 단 한 번도 현장에 가지 않았다. 신문 기사 몇 줄만으로 범인을 지목했다.”' },
      { word: '왓슨 역 / 화자', gloss: '탐정의 추리를 독자에게 중계하고 질문을 대신하는 동반자(서술의 거리 조절 장치).', use: '“나는 그의 추리를 따라가지 못했다 — 그래서 독자를 대신해, 그에게 물었다.”' },
      { word: '직관 / 위화감', read: '直觀·違和感', gloss: '논리 이전의 ‘뭔가 이상하다’는 감각. 베테랑 형사·탐정이 실밥을 잡아채는 출발점.', use: '“증거는 모두 자살을 가리켰다. 그런데 그는, 정돈된 그 방에서 위화감을 떨칠 수 없었다.”' },
      { word: '재구성 / 사건 복기', read: '再構成', gloss: '범행을 시간순으로 되짚어 재현하는 일. ‘그날 밤 무슨 일이 있었나’를 다시 짜 맞추는 화법.', use: '“이제 그날 밤을 처음부터 재구성해 봅시다. 8시, 그는 서재에 있었습니다 — 정말 그랬을까요?”' },
      { word: '논리의 비약 / 비약 없는 추리', gloss: '근거 없이 건너뛰는 결론은 본격의 금기. ‘한 칸씩’ 메우는 추론이 페어플레이의 미덕.', use: '“증거에서 결론까지, 그는 단 한 칸의 비약도 없이 사다리를 한 단씩 밟아 올라갔다.”' },
      { word: '귀류법 / 모순의 발견', read: '歸謬法', gloss: '“그가 범인이라면 이 사실과 어긋난다”—가정을 끝까지 밀어붙여 모순을 드러내 후보를 지우는 추리. 소거법의 논리적 엔진.', use: '“만약 그가 진범이라면, 자정에 두 곳에 있어야 합니다. 그것이 불가능하니, 그는 범인이 아닙니다.”' },
    ],
  },
  {
    key: 'interrogation', label: '의심·심문·대치', icon: '🪑', desc: '취조·떠보기·자백 유도 등 심문 장면의 화법과 심리전 어휘',
    items: [
      { word: '취조 / 신문', read: '取調·訊問', gloss: '용의자를 마주 앉혀 캐묻는 일. 침묵·조명·시간 압박이 동원되는 심리전의 무대.', use: '“취조실의 형광등이 깜빡였다. 그는 30분째, 단 한마디도 묻지 않고 그를 바라보기만 했다.”' },
      { word: '떠보다 / 넘겨짚다', gloss: '아는 척·모르는 척으로 상대의 반응을 끌어내는 화법. 형사·탐정의 단골 미끼.', use: '“‘당신, 그날 그 카페에 있었죠.’ 형사는 알지도 못하면서 넌지시 떠봤다.”' },
      { word: '말꼬리 / 모순 추궁', gloss: '진술의 사소한 어긋남을 물고 늘어져 거짓을 무너뜨리는 기법. ‘아까는 8시라 하셨는데요?’', use: '“‘아까는 못 봤다더니, 어떻게 그가 검은 외투를 입은 걸 아십니까?’ 그녀의 얼굴이 굳었다.”' },
      { word: '자백 유도 / 함정 질문', gloss: '범인만 알 수 있는 사실을 슬쩍 흘려 자백을 끌어내는 덫. 비공개 정보의 누설이 결정타.', use: '“‘흉기가 식칼이었다는 건, 우리도 방금 알았는데 — 당신은 어떻게 알았죠?’”' },
      { word: '묵비권 / 입을 닫다', read: '默秘權', gloss: '진술을 거부할 권리. 침묵 자체가 무언의 대치이자, 도리어 의심의 무게를 키운다.', use: '“변호사가 올 때까지, 그는 묵비권 뒤에 자신을 단단히 가뒀다.”' },
      { word: '시치미 / 발뺌 / 잡아떼다', gloss: '아무 일 없는 척하거나 혐의를 부인하는 태도. 능청과 균열 사이에서 진실이 새어 나온다.', use: '“그는 끝까지 시치미를 뗐다. 다만, 손끝이 탁자를 두드리는 박자만은 속이지 못했다.”' },
      { word: '굿캅 배드캅', gloss: '한 명은 윽박지르고 한 명은 달래며 자백을 유도하는 짝패 심문(good cop, bad cop).', use: '“험한 형사가 나간 뒤, 부드러운 형사가 커피를 내밀었다. 고전적인 수였지만, 통했다.”' },
      { word: '심증 / 물증의 벽', read: '心證', gloss: '범인이라 확신하나(심증) 증거가 없는(물증 부재) 답답함. 형사물의 영원한 장벽.', use: '“심증은 백 퍼센트였다. 그러나 심증으로는 단 한 사람도 잡아넣을 수 없었다.”' },
      { word: '거짓말의 징후 / 미세표정', gloss: '눈맞춤 회피·과한 디테일·시간 끌기 등 거짓의 신호. 심문관이 읽어 내는 비언어 단서.', use: '“그는 묻지도 않은 알리바이를 술술 늘어놓았다. 너무 매끄러운 대답이, 도리어 수상했다.”' },
      { word: '회유 / 압박 / 거래', read: '懷柔', gloss: '달램(회유)·몰아침(압박)·형량 흥정(plea bargain). 진실을 끌어내는 당근과 채찍.', use: '“‘공범을 불면, 검사에게 잘 말해 주지.’ 거래의 냄새에, 그의 입술이 처음으로 달싹였다.”' },
      { word: '침묵의 압박 / 뜸 들이기', gloss: '아무 말 없이 상대를 응시하며 스스로 입을 열게 만드는 화법. 견디기 힘든 정적이 가장 강한 질문이 된다.', use: '“형사는 묻지 않았다. 그저 서류를 펴 놓고 기다렸다. 그 긴 침묵을 견디다 못해, 그가 먼저 말을 꺼냈다.”' },
    ],
  },
  {
    key: 'suspense', label: '긴장·서스펜스 묘사', icon: '😰', desc: '미행·인기척·정적 등 추리·스릴러의 긴장을 짓는 묘사 상투구',
    items: [
      { word: '등골이 서늘하다 / 오싹하다', gloss: '본능적 공포·예감의 신체화. 위험을 ‘아직 보지 못했을 때’ 먼저 알리는 묘사.', use: '“이유는 알 수 없었다. 다만, 그 방에 들어선 순간 등골이 서늘해졌다.”' },
      { word: '인기척 / 발소리', gloss: '보이지 않는 누군가의 존재. ‘텅 빈 줄 알았던 집’에서 들리는 한 박자가 공포의 핵.', use: '“분명 혼자였다. 그런데 위층에서, 마룻바닥이 삐걱이는 발소리가 들렸다.”' },
      { word: '미행 / 시선을 느끼다', read: '尾行', gloss: '뒤를 밟히거나 누군가 지켜보는 감각. 돌아보면 아무도 없는, 추리·스릴러의 단골 긴장.', use: '“골목을 꺾을 때마다 같은 구두 소리가 따라왔다. 돌아보면, 늘 아무도 없었다.”' },
      { word: '정적이 흐르다 / 숨 막히는 침묵', gloss: '소리의 부재로 짓는 긴장. 시계 초침·자기 숨소리만 도드라지는 ‘들숨’의 순간.', use: '“방 안엔 벽시계의 초침 소리만 남았다. 그 침묵이, 어떤 비명보다 무거웠다.”' },
      { word: '심장이 내려앉다 / 철렁하다', gloss: '결정적 발견·위기 직전의 충격. 진실의 한 조각이 드러나는 순간의 신체 반응.', use: '“서랍을 연 순간, 심장이 철렁 내려앉았다. 사라졌어야 할 그 물건이, 그대로 있었다.”' },
      { word: '식은땀 / 손이 떨리다', gloss: '들킬 위기·공포의 체화. 범인 시점에선 죄의 무게로, 추적자 시점에선 임박한 위험으로.', use: '“수화기를 쥔 손이 떨렸다. 상대가, 자신이 한 짓을 알고 있다는 걸 직감한 것이다.”' },
      { word: '문이 천천히 열리다 / 삐걱', gloss: '느린 접근으로 긴장을 늘이는 고전 연출. ‘열리는 데까지 걸리는 시간’이 곧 공포의 길이.', use: '“손잡이가 아주 천천히 돌아갔다. 잠가 둔 줄 알았던 그 문의, 손잡이가.”' },
      { word: '그림자가 드리우다 / 인영', read: '人影', gloss: '실체보다 먼저 닿는 그림자·실루엣. 정체를 감춘 채 위협만 전하는 시각 장치.', use: '“불 꺼진 복도 끝, 길게 늘어진 그림자 하나가 천천히 이쪽으로 다가오고 있었다.”' },
      { word: '카운트다운 / 시간이 없다', gloss: '시한폭탄·다음 범행·시효 만료 등 ‘똑딱이는 시계’. 서스펜스 페이싱의 엔진(시계 장치).', use: '“다음 희생자가 나오기까지, 그에게 주어진 시간은 길어야 열두 시간이었다.”' },
      { word: '함정에 빠지다 / 미끼', read: '陷穽', gloss: '범인이 추적자를 역으로 끌어들이는 덫. 사냥꾼이 사냥감이 되는 역전의 긴장.', use: '“그제야 깨달았다. 자신이 범인을 쫓은 게 아니라, 이 방까지 ‘유인당했다’는 것을.”' },
      { word: '서서히 조여 오다 / 포위', gloss: '위협이 한 걸음씩 좁혀 오는 점층. 도망칠 곳이 한 칸씩 사라지는 압박의 묘사.', use: '“출구가 하나씩 막혔다. 그를 둘러싼 원이, 한 걸음씩 천천히 조여 들었다.”' },
      { word: '돌이켜보면 / 그때는 몰랐다', gloss: '회고적 복선 예고(foreshadowing). ‘그 사소함이 전부였음을 그때는 몰랐다’의 정형구.', use: '“돌이켜보면 그 한마디가 모든 것의 시작이었다. 그때는, 그저 흘려들었을 뿐이지만.”' },
      { word: '끊긴 통화 / 한밤의 전화벨', gloss: '한마디만 남기고 뚝 끊기는 전화, 새벽을 가르는 벨소리. 보이지 않는 위협을 전선 너머에서 들이미는 단골 장치.', use: '“수화기 너머에서 짧은 숨소리가 들렸다. ‘도와…’ 거기서, 통화는 뚝 끊겼다.”' },
    ],
  },
  {
    key: 'twist', label: '반전·해결·진상', icon: '🌀', desc: '의외의 범인·이중반전·뒷맛 등 추리의 결말 설계 어휘(반전·이야미스)',
    items: [
      { word: '반전 / 트위스트', read: '反轉', gloss: '독자의 예상을 뒤엎는 진실의 전환. 추리물의 카타르시스이자 가장 위험한 도박.', use: '“범인이라 믿었던 자가 시신으로 발견되는 순간, 사건은 통째로 뒤집혔다.”' },
      { word: '의외의 범인', gloss: '가장 의심받지 않던 인물이 진범인 본격의 황금률(탐정·화자·피해자·어린아이·경찰까지).', use: '“진범은 줄곧 수사를 ‘돕던’ 그 사람이었다. 가장 가까이서, 가장 천연덕스럽게.”' },
      { word: '뒤집힌 시점 / 신뢰할 수 없는 화자', read: '信賴할 수 없는 話者', gloss: '거짓·왜곡된 서술자(unreliable narrator). 끝에서 ‘내가 본 게 거짓이었다’가 드러난다.', use: '“그가 ‘기억나지 않는다’던 그 밤의 일은, 사실 그 자신이 가장 잘 알고 있었다.”' },
      { word: '이중반전 / 삼중반전', read: '二重反轉', gloss: '뒤집고 또 뒤집는 연쇄 전환. 잘 쓰면 통쾌, 남발하면 ‘반전을 위한 반전’의 피로.', use: '“진범이 밝혀졌다 싶은 순간, 그 진범마저 누군가에게 이용당한 말이었음이 드러났다.”' },
      { word: '진상 / 흑막', read: '眞相·黑幕', gloss: '사건의 숨은 전모(진상)와 배후의 조종자(흑막). 표면의 범인 뒤에 숨은 진짜 손.', use: '“손에 피를 묻힌 자 뒤엔, 한 번도 모습을 드러내지 않은 흑막이 있었다.”' },
      { word: '카타르시스 / 납득', gloss: '모든 단서가 한 점으로 모여 ‘그래서 그랬구나’ 하고 풀리는 쾌감. 본격의 최종 보상.', use: '“흩어졌던 단서들이 마지막 한마디에 일제히 제자리를 찾자, 방 안에 긴 탄식이 번졌다.”' },
      { word: '뒷맛 / 이야미스', gloss: '읽고 나면 ‘기분 나쁜’ 찝찝한 결말(이야미스·미나토 가나에 『고백』). 악의·인간의 어둠을 남긴다.', use: '“범인은 벌받았다. 그런데 책을 덮은 뒤에도, 까닭 모를 께름칙함이 오래 남았다.”' },
      { word: '동기의 해명 / 후더닛·와이더닛', gloss: '누가(whodunit)·어떻게(howdunit)·왜(whydunit). 현대 추리는 ‘왜’의 깊이로 승부한다.', use: '“누가, 어떻게는 풀렸다. 정작 풀리지 않은 것은 — 왜, 그래야만 했는가였다.”' },
      { word: '미해결·열린 결말', read: '未解決', gloss: '범인을 끝내 단정하지 않는 마무리. 진실의 모호함으로 여운을 남기는 비본격적 선택.', use: '“그는 범인을 알았지만, 끝내 그 이름을 입에 담지 않았다. 사건은 미제로 남았다.”' },
      { word: '응보 / 사적 제재', read: '應報·私的制裁', gloss: '법 밖에서 이뤄지는 단죄. 정의와 복수 사이, 추리물의 회색 윤리를 건드린다.', use: '“법이 닿지 못한 자리에서, 누군가가 대신 저울을 들었다. 그것을 정의라 불러도 좋을까.”' },
      { word: '최후의 한 줄 / 라스트 센텐스', gloss: '모든 게 끝난 줄 알았을 때 마지막 한 문장이 의미를 통째로 뒤집는 마무리(스팅 인 더 테일). 책을 덮는 손을 멈추게 한다.', use: '“사건은 깔끔히 끝났다. 그런데 마지막 한 줄에서, 화자가 무심코 흘린 말이 모든 것을 다시 의심하게 만들었다.”' },
    ],
  },
  {
    key: 'cliche', label: '클리셰·전복', icon: '🔁', desc: '인지하고 변주할 단골 설정 — 그대로 쓰거나, 비틀거나(녹스의 십계·반다인 20칙)',
    items: [
      { word: '집사가 범인이다', gloss: '“The butler did it”—가장 닳은 의외의 범인 클리셰. 이제는 그 자체가 붉은 청어로 쓰인다.', use: '전복: 모두가 집사를 의심하게 ‘일부러’ 깔아 두고, 진범은 가장 무해해 보인 인물로.' },
      { word: '죽기 직전 길게 늘어놓는 범인의 자백', gloss: '진상 폭로 자리에서 범인이 술술 다 불어 주는 정형. 편하지만 ‘왜 자백하나’의 핍진성이 약하다.', use: '전복: 범인은 끝까지 부인하고, 탐정이 증거만으로 한 칸씩 몰아붙여 침묵으로 자백을 대신케 한다.' },
      { word: '쌍둥이·잃어버린 형제 트릭', gloss: '갑툭튀 쌍둥이로 알리바이를 푸는 수법. 녹스의 십계가 금한 ‘반칙’의 대명사.', use: '전복: 쌍둥이는 미리 1막에 명시해 페어플레이를 지키거나, 아예 ‘쌍둥이인 줄 알았으나 아닌’ 역설계로.' },
      { word: '우연한 목격·때맞춘 등장', gloss: '결정적 순간에 마침 누가 보고 있거나 나타나는 편의주의. 남발하면 추리가 우연 게임이 된다.', use: '전복: 그 ‘목격’ 자체가 조작된 연출이었음을 밝혀, 편의를 트릭의 일부로 회수한다.' },
      { word: '명탐정은 절대 틀리지 않는다', gloss: '무오류 탐정의 신성. 긴장의 적 — 실패·오판이 없으면 추리가 ‘답안 낭독’이 된다.', use: '전복: 탐정이 한 번 오독해 무고한 자를 몰아붙이고, 그 대가를 치르며 진상에 닿게 한다.' },
      { word: '범인은 처음 등장한 수상한 인물', gloss: '가장 먼저 의심받는 자가 진범인 단조로움. 노련한 독자는 첫 용의자를 곧장 지운다.', use: '전복: 첫 용의자를 진짜 무죄로 끝까지 끌고 가, 독자의 ‘반사적 배제’를 역이용한다.' },
      { word: '비밀 통로·숨겨진 방으로 푸는 밀실', gloss: '밀실을 ‘몰래 있던 통로’로 해결하는 안이함. 반다인 20칙이 경계한 비겁한 수.', use: '전복: 물리적 통로 없이, 시간·시점·심리의 ‘논리적’ 밀실로 설계해 페어플레이를 지킨다.' },
      { word: '동기는 결국 치정·유산', gloss: '치정·돈으로 수렴하는 동기의 빈곤. 흔하기에 ‘왜’의 신선함이 떨어진다.', use: '전복: 사소하거나 비틀린 동기(자존심·오해·선의의 폭주)로 인간의 깊이를 드러낸다.' },
      { word: '기억상실로 진실을 미루기', gloss: '핵심 인물의 편리한 기억상실. 정보를 늦추는 손쉬운 수단이라 ‘반칙’으로 읽히기 쉽다.', use: '전복: 기억상실 자체가 트릭(가장·은폐)임을 밝히거나, 기억의 ‘왜곡’으로 서술 트릭과 엮는다.' },
      { word: '경찰은 무능, 탐정은 만능', gloss: '관(官)을 깎아 사립탐정을 띄우는 구도. 경찰소설의 결을 죽이고 평면적이 된다.', use: '전복: 묵묵한 형사의 발품과 탐정의 논리가 부딪치고 협력하며 함께 진상에 닿게 한다.' },
      { word: '독약은 ‘이름 없는 신비한 동양의 독’', gloss: '추적 불가능한 가상의 독으로 얼버무리기. 반다인 20칙이 금한 비과학적 편의.', use: '전복: 실제 약독물의 검출 한계·대사 시간을 단서로 활용해 법의학적 핍진성을 살린다.' },
      { word: '폭풍우로 고립된 저택 / 클로즈드 서클', gloss: '눈·태풍·끊긴 다리로 외부와 단절된 채 벌어지는 살인(『그리고 아무도 없었다』). ‘범인은 이 안에 있다’는 강력하지만 닳은 설정.', use: '전복: 고립을 깨고 ‘외부인 개입’의 여지를 일부러 남기거나, 고립 자체가 범인의 연출이었음을 밝혀 닫힌 원을 비튼다.' },
    ],
  },
]

const LS = 'sry:tool:mystery-lexicon:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 받침 유무로 한국어 목적격 조사(을/를)를 골라 ‘단어+조사’를 만든다. 끝 글자가 한글이 아니면 ‘를’.
const hasJong = (w: string): boolean => {
  const ch = w.charCodeAt(w.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false // 한글 음절이 아니면 받침 없음 취급
  return (ch - 0xac00) % 28 !== 0
}

// 한 항목을 한 덩이 텍스트로(복사·스니펫·프로젝트 공통)
const termText = (f: Flat): string => {
  const head = `${f.cat.icon} [${f.cat.label}] ${f.item.word}${f.item.read ? ` (${f.item.read})` : ''}`
  const lines = [head, f.item.gloss]
  if (f.item.use) lines.push(`예) ${f.item.use}`)
  return lines.join('\n')
}

export default function MysteryLexicon({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 도구가 장르를 넘겨주면 안내에 반영(이 도구는 미스터리·추리 전용).
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 즐겨찾기: "catKey::word"
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<Flat | null>(null)
  // 어휘 팔레트(여러 분류에서 한 항목씩 묶어 한 추리 장면용 어휘 세트를 무작위 조합)
  const [palette, setPalette] = useState<Flat[] | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
  }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])

  // 조합수: "한 추리 장면에 심을 어휘 팔레트"의 경우의 수.
  //  - 각 분류에서 한 항목씩 뽑되 '없음'도 선택 가능(최소 1개) → ∏(items_i + 1) - 1.
  const comboCount = useMemo(() => {
    let p = 1
    for (const c of CATS) p *= (c.items.length + 1)
    return p - 1
  }, [])
  const comboText = useMemo(() => {
    const n = comboCount
    if (n >= 1e16) return `${(n / 1e16).toFixed(2)}경 가지 이상`
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}조 가지 이상`
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억 가지 이상`
    if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만 가지`
    return `${n.toLocaleString()}가지`
  }, [comboCount])

  const favKey = (catKey: string, word: string) => `${catKey}::${word}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.word)])
    if (q) {
      base = base.filter(({ item }) =>
        item.word.toLowerCase().includes(q) ||
        (item.read || '').toLowerCase().includes(q) ||
        item.gloss.toLowerCase().includes(q) ||
        (item.use || '').toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool: Flat[] = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.word === prev.item.word && pick.cat.key === prev.cat.key) {
        pick = pool[Math.floor(Math.random() * pool.length)]
      }
      return pick
    })
  }, [cat])

  // 어휘 팔레트: 단서·트릭·탐정 화법·서스펜스 위주 분류에서 한 항목씩 뽑아 한 추리 장면용 어휘 세트를 구성.
  const rollPalette = useCallback(() => {
    const pick = (key: string): Flat | null => {
      const c = CATS.find((x) => x.key === key)
      if (!c || !c.items.length) return null
      return { cat: c, item: c.items[Math.floor(Math.random() * c.items.length)] }
    }
    // 한 추리 장면을 그릴 핵심 5분류(트릭·단서·탐정 화법·심문·서스펜스)에서 각 1개
    const keys = ['crime', 'clue', 'detective', 'interrogation', 'suspense']
    const set = keys.map(pick).filter((x): x is Flat => !!x)
    setPalette(set)
  }, [])

  const toggleFav = (catKey: string, word: string) => {
    const k = favKey(catKey, word)
    setFavs((prev) => { const next = { ...prev }; if (next[k]) delete next[k]; else next[k] = true; return next })
  }

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }

  // 스니펫 저장(생성 글감)
  const saveSnippet = (f: Flat) => {
    addToLibrary('snippets', {
      text: termText(f),
      source: '미스터리·추리 어휘·표현 사전',
      tags: ['미스터리·추리', '어휘', f.cat.label, f.item.word],
    })
    flash(`‘${f.item.word}’${hasJong(f.item.word) ? '을' : '를'} 스니펫으로 저장했습니다.`)
  }

  // 팔레트(어휘 세트)를 한 스니펫으로 저장
  const savePalette = () => {
    if (!palette || !palette.length) return
    const text = '🔍 추리 장면 어휘 팔레트\n' + palette.map((f) => `· ${f.cat.label}: ${f.item.word}`).join('\n')
    addToLibrary('snippets', { text, source: '미스터리·추리 어휘·표현 사전 · 어휘 팔레트', tags: ['미스터리·추리', '어휘 팔레트'] })
    flash('어휘 팔레트를 스니펫으로 저장했습니다.')
  }

  // 프로젝트 자료 〈설정/어휘〉 폴더에 메모 추가
  const toProject = (f: Flat) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)} · ${escapeHtml(f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b></p>`,
      `<p>${escapeHtml(f.item.gloss)}</p>`,
      f.item.use ? `<p style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '설정/어휘',
      title: `${f.item.word} (미스터리·추리 어휘)`,
      bodyHtml,
      meta: { 장르: '미스터리·추리', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정/어휘〉에 ‘${f.item.word}’${hasJong(f.item.word) ? '을' : '를'} 추가했습니다.`)
  }

  // 어휘 팔레트를 한 문서로 프로젝트에 추가
  const paletteToProject = () => {
    if (!palette || !palette.length || !hasProjectBridge()) return
    const body =
      `<p>한 추리 장면에 심을 어휘 팔레트입니다.</p>` +
      palette.map((f) =>
        `<p><b>${escapeHtml(f.cat.icon + ' ' + f.cat.label)}</b> — ${escapeHtml(f.item.word)}` +
        (f.item.use ? `<br/><span style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></span>` : '') + '</p>'
      ).join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: `추리 장면 어휘 팔레트 (${palette.length}개)`,
      bodyHtml: body, meta: { 장르: '미스터리·추리', 분류: '어휘 팔레트' },
    })
    if (id) flash('어휘 팔레트를 프로젝트 〈설정/어휘〉에 추가했습니다.')
  }

  // 현재 화면의 항목 전부를 한 문서로 묶어 프로젝트에 추가
  const allToProject = () => {
    if (!hasProjectBridge() || filtered.length === 0) return
    const body = filtered.map((f) =>
      `<p><b>${escapeHtml(f.cat.icon + ' ' + f.item.word)}${f.item.read ? ' (' + escapeHtml(f.item.read) + ')' : ''}</b> — ${escapeHtml(f.item.gloss)}` +
      (f.item.use ? `<br/><span style="color:#888"><i>예) ${escapeHtml(f.item.use)}</i></span>` : '') + '</p>'
    ).join('')
    const where = cat === ALL_KEY ? '전체' : (CATS.find((c) => c.key === cat)?.label || '')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: `미스터리·추리 어휘집 — ${where}${query ? ` · ‘${query}’` : ''} (${filtered.length}개)`,
      bodyHtml: body, meta: { 장르: '미스터리·추리', 분류: where },
    })
    if (id) flash(`현재 목록 ${filtered.length}개를 프로젝트 〈설정/어휘〉에 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>미스터리·추리</b> 장르 특유의 어휘·관용구·말투·상투구·전문용어 <b>{total}개</b>를 9개 분류로 모았습니다.
        검색·무작위로 찾아 클릭 복사하고, 마음에 들면 스니펫·프로젝트에 담으세요.
        {incomingGenre && incomingGenre !== '미스터리·추리' && (
          <span style={{ color: 'var(--accent)' }}> (요청 장르 ‘{incomingGenre}’ — 이 사전은 미스터리·추리 전용입니다.)</span>
        )}
        <br /><Emoji e="🎲"/> 한 추리 장면의 어휘 팔레트 조합은 <b>{comboText}</b> ({comboCount.toLocaleString()})로 짤 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단어·뜻·예문으로 검색 (예: 밀실, 알리바이, 사후경직, 붉은 청어, 회색 뇌세포)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 펼침 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
        </button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button key={c.key} className="minibtn" onClick={() => setCat(c.key)} aria-pressed={on}
              title={c.desc}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              <Emoji e={c.icon}/> {c.label}
            </button>
          )
        })}
      </div>

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 어휘</button>
        <button className="minibtn" onClick={rollPalette} title="트릭·단서·탐정 화법·심문·서스펜스에서 한 항목씩 뽑아 추리 장면 어휘 세트를 조합"><Emoji e="🎰"/> 어휘 팔레트</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 어휘 팔레트 결과 */}
      {palette && palette.length > 0 && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🎰"/> 추리 장면 어휘 팔레트</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollPalette} title="다시 조합"><Emoji e="🔄"/> 다시</button>
            <button className="minibtn" onClick={() => setPalette(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {palette.map((f) => (
              <div key={f.cat.key} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{ color: 'var(--muted)' }}><Emoji e={f.cat.icon}/> {f.cat.label}</span>
                {' · '}
                <b style={{ cursor: 'pointer' }} title="클릭하면 단어 복사" onClick={() => copy(f.item.word, 'pal:' + f.cat.key)}>{f.item.word}</b>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy('🔍 추리 장면 어휘 팔레트\n' + palette.map((f) => `· ${f.cat.label}: ${f.item.word}`).join('\n'), 'pal-all')}>
              {copiedKey === 'pal-all' ? '✓ 복사됨' : <><Emoji e="📋"/> 팔레트 복사</>}
            </button>
            <button className="minibtn" onClick={savePalette}><Emoji e="💾"/> 스니펫</button>
            <button className="linkbtn" onClick={paletteToProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '어휘 팔레트를 프로젝트 자료 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.word}</span>
            {random.item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{random.item.read}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 4px' }}>{random.item.gloss}</div>
          {random.item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic' }}>예) {random.item.use}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(termText(random), 'rand')}>{copiedKey === 'rand' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => copy(random.item.word, 'rand-w')}>{copiedKey === 'rand-w' ? '✓ 복사됨' : <><Emoji e="🔤"/> 단어만</>}</button>
            <button className="minibtn" onClick={() => saveSnippet(random)}><Emoji e="💾"/> 스니펫</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.word)}>
              {favs[favKey(random.cat.key, random.item.word)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 어휘가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const fk = favKey(c.key, item.word)
            const isFav = !!favs[fk]
            const copyId = 'item:' + fk
            return (
              <div key={fk} style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    title="클릭하면 단어를 복사합니다"
                    onClick={() => copy(item.word, copyId + ':w')}>{item.word}</span>
                  {item.read && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.read}</span>}
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={() => toggleFav(c.key, item.word)}
                    style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{item.gloss}</div>
                {item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>예) {item.use}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="minibtn" onClick={() => copy(termText({ cat: c, item }), copyId)}>
                    {copiedKey === copyId ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}
                  </button>
                  <button className="minibtn" onClick={() => saveSnippet({ cat: c, item })}><Emoji e="💾"/> 스니펫</button>
                  <button className="linkbtn" onClick={() => toProject({ cat: c, item })} disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 어휘를 프로젝트 자료 〈설정/어휘〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                    <Emoji e="📄"/> 프로젝트에 추가
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단: 일괄 동작 + 연계 */}
      <div className="linkbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span className="linkbar-label" style={{ fontSize: 12, color: 'var(--muted)' }}>연계:</span>
        <button className="linkbtn" onClick={allToProject} disabled={!hasProjectBridge() || filtered.length === 0}
          title={hasProjectBridge() ? '현재 목록 전체를 한 문서로 프로젝트 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
          <Emoji e="📄"/> 목록 전체 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: '미스터리·추리' })}
          title="장르 관습 체크리스트 열기"><Emoji e="📐"/> 장르 관습</button>
        <button className="linkbtn" onClick={() => openToolLinked('sensory-palette', { genre: '미스터리·추리' })}
          title="감각 팔레트 열기"><Emoji e="🌈"/> 감각 팔레트</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '미스터리·추리' })}
          title="장면 단조기 열기"><Emoji e="🎬"/> 장면 단조기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          어휘는 정답이 아니라 출발점입니다. 클리셰는 그대로 쓰거나, 비틀어 보세요.
        </span>
      </div>
    </div>
  )
}
