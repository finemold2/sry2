// 액션·전쟁 특수 어휘·표현 사전 — 이 장르 특유의 단어·관용표현·말투·상투구·전문용어를
//   카테고리(타격·속도 / 신체감각 / 소리·냄새 / 군사·전술 / 화기·장비 / 무협·내공 /
//   헌터·게임적 / 관용표현·상투구 / 말투·어조 / 클리셰·전복)로 모은 로컬 사전.
//   '액션·전쟁 도시에' §6(특수 어휘·표현·클리셰)·§3(서사 장치)·§5(클라이맥스)·§1(대표작 계보)에 근거한 자작 데이터.
//   카테고리 펼침·검색·무작위·클릭복사 + 스니펫 저장 + 프로젝트 메모 추가.
//   자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 import. localStorage 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'action-lexicon', name: '액션·전쟁 어휘·표현 사전', icon: '⚔️', group: '어휘·표현', genre: '액션·전쟁', intro: '타격·신체감각·총성·전술·내공·헌터… 액션·전쟁 특유의 어휘·관용구·말투·상투구를 찾아 클릭 복사·스니펫 저장', w: 660, h: 640 }

interface Term { word: string; read?: string; gloss: string; use?: string }
interface CatDef { key: string; label: string; icon: string; desc: string; items: Term[] }

// 액션·전쟁 도시에 §6(특수 어휘·표현·클리셰), §3(서사 장치), §5(클라이맥스 관습),
//  §2(독자 기대·감각의 핍진성), §1(하위 분기: 무협·헌터·밀리터리)에 근거.
//  일반론이 아니라 이 장르에 구체적·특화된 항목만 수록.
const CATS: CatDef[] = [
  {
    key: 'strike', label: '타격·속도 동사', icon: '💥', desc: '근접·속도 액션을 묘사하는 강한 동사·부사 (§6 감각·동작 어휘)',
    items: [
      { word: '파고들다', gloss: '적의 품·간격 안으로 단숨에 비집고 들어가는 동작. 거리를 죽이는 근접전의 핵심.', use: '“그는 사거리를 무시하고 적의 품으로 파고들었다.”' },
      { word: '비틀다', gloss: '관절·손목·체중을 꺾어 제압·해체하는 격투 동작. 메치기·꺾기의 신호어.', use: '“손목을 비틀어 권총을 떨궈낸 뒤, 그 총을 그대로 겨눴다.”' },
      { word: '꿰뚫다', gloss: '칼·창·총탄이 살을 관통하는 결정타. 치명상의 시각화.', use: '“창끝이 갑옷의 이음새를 꿰뚫고 등으로 빠져나왔다.”' },
      { word: '후려치다', gloss: '팔·다리·둔기를 옆에서 크게 휘둘러 때리는 광폭한 타격.', use: '“개머리판이 옆얼굴을 후려치자 시야가 하얗게 번졌다.”' },
      { word: '내리꽂다', gloss: '위에서 아래로 무게를 실어 박아 넣는 결정적 일격(검·주먹·발꿈치).', use: '“그는 단검을 두 손으로 쥐고 적의 쇄골에 내리꽂았다.”' },
      { word: '짓이기다', gloss: '깔아 누른 채 부수듯 가하는 잔혹한 마무리. 무게·체급의 우위를 표현.', use: '“군화 밑창이 적의 손가락을 천천히 짓이겼다.”' },
      { word: '스치다 / 빗나가다', gloss: '아슬아슬하게 빗맞거나 스쳐 가는 ‘근접 미스’. 긴장 유지의 단골 동사.', use: '“총탄이 귓불을 스치고 벽돌을 깼다. 한 뼘만 안쪽이었다면.”' },
      { word: '내지르다', gloss: '주먹·발·창을 직선으로 폭발적으로 뻗는 동작. 정권·찌르기의 신호어.', use: '“그는 호흡을 죽이고, 단 한 번의 정권을 내질렀다.”' },
      { word: '낚아채다', gloss: '날아드는 무기·멱살·손목을 순간적으로 잡아채 흐름을 끊는 동작.', use: '“내리꽂히는 칼날을 손바닥으로 낚아챘다. 피가 손금을 타고 흘렀다.”' },
      { word: '베어 올리다 / 그어 내리다', gloss: '검의 궤적을 위·아래로 가르는 운검 묘사. 검극의 방향성을 살린다.', use: '“아래에서 위로 베어 올린 한 줄기 섬광에 갑주가 두 쪽으로 갈렸다.”' },
      { word: '단숨에 / 찰나에 / 순식간에', gloss: '시간을 압축해 속도감을 주는 부사. 결정적 1비트에만 아껴 쓴다.', use: '“찰나, 다섯 걸음의 거리가 사라졌다.”' },
      { word: '폭발적으로 / 급강하 / 급선회', gloss: '가속·기동을 표현하는 부사·명사. 추격·기동전의 속도계.', use: '“기수가 급강하하자 안전벨트가 가슴을 파고들었다.”' },
      { word: '거리를 좁히다 / 사거리에 들다', gloss: '교전 거리를 줄이거나 사정권에 진입하는 전술 동작. 액션 지리의 기본 단위.', use: '“엄폐물을 타고 사거리에 들 때까지, 그는 숨도 쉬지 않았다.”' },
      { word: '무너뜨리다 / 쓸어버리다', gloss: '대형·다수를 한꺼번에 제압·전멸시키는 광역 타격. ‘1대 다수’의 카타르시스.', use: '“한 호흡에 앞열 셋이 무너졌다.”' },
    ],
  },
  {
    key: 'body', label: '신체감각·전투 생리', icon: '🫀', desc: '반동·심박·통증 등 전투의 몸 감각 (§2 감각의 핍진성)',
    items: [
      { word: '반동', read: '反動', gloss: '발사·타격의 되튐. 어깨·손목으로 전해지는 무게로 ‘진짜 무기’를 체감시킨다.', use: '“반동이 어깨를 때릴 때마다 조준선이 위로 튀었다.”' },
      { word: '아드레날린', gloss: '위기에 솟구치는 각성 호르몬. 통증을 지우고 시간을 늘리는 전투 흥분의 정체.', use: '“아드레날린이 통증을 잠시 밀어냈다. 잠시뿐이라는 걸 그는 알았다.”' },
      { word: '시야가 좁아지다 / 터널 비전', gloss: '극도의 긴장에서 시야가 한 점으로 수렴하는 현상. 집중과 위험을 동시에 표현.', use: '“표적 외엔 아무것도 보이지 않았다 — 측면의 그림자도.”' },
      { word: '심장이 터질 듯 / 심박이 귓속에서', gloss: '전투 직전·도주 중의 격렬한 심박. 정적 속에 들리는 자기 맥박.', use: '“정적 속에서, 제 심장 소리가 천둥처럼 귓속을 두드렸다.”' },
      { word: '폐가 타들어가다 / 숨이 막히다', gloss: '전력 질주·장기전의 산소 부족. 추격·도주 페이싱의 신체 시계.', use: '“다섯 블록을 내달리자 폐가 불에 덴 듯 타들어갔다.”' },
      { word: '식은땀 / 손바닥이 미끄럽다', gloss: '공포·긴장의 체화. 무기를 쥔 손이 땀에 미끄러지는 디테일로 위기를 환기.', use: '“땀에 젖은 손잡이가 한 번 미끄러졌다. 그 한 번이 전부였다.”' },
      { word: '귀가 먹먹 / 이명', gloss: '폭발·총성 직후의 청각 마비. 소리가 사라진 슬로모션 연출의 단골.', use: '“폭음 뒤, 세상이 솜으로 막힌 듯 먹먹했다. 비명조차 아득했다.”' },
      { word: '통증이 번지다 / 감각이 사라지다', gloss: '부상의 진행. 처음엔 둔하다가 번지는 통증, 혹은 마비되는 손발.', use: '“옆구리에서 시작된 통증이 등 전체로 번졌다.”' },
      { word: '다리가 풀리다 / 무릎이 꺾이다', gloss: '체력 고갈·과다출혈·공포로 몸이 무너지는 순간. 최저점의 신체 신호.', use: '“일어서려 했지만 다리가 풀려 다시 무릎이 꺾였다.”' },
      { word: '손끝 감각 / 굳은살', gloss: '숙련자의 미세 감각·신체 흔적. 방아쇠·검자루를 ‘읽는’ 베테랑의 증표.', use: '“방아쇠에 닿은 손끝이, 격발 직전의 압력을 미리 읽었다.”' },
      { word: '뜨거운 것이 흐르다 / 축축함', gloss: '부상의 완곡한 자각. ‘피’를 직접 말하지 않고 감각으로 먼저 알린다.', use: '“옆구리에서 뜨거운 것이 바지춤을 적셨다. 그제야 맞았음을 알았다.”' },
      { word: '근육이 비명을 지르다 / 젖산이 차다', gloss: '한계까지 몰린 근육의 통증. 버티기·매달리기·장기전의 무게.', use: '“팔 근육이 비명을 질렀지만, 손을 놓으면 추락이었다.”' },
    ],
  },
  {
    key: 'sense', label: '소리·냄새·정적', icon: '👂', desc: '총성·금속음·화약 냄새 등 전장의 감각 (§2 감각의 핍진성)',
    items: [
      { word: '총성이 갈라지다 / 작렬하다', gloss: '공기를 찢는 총소리. ‘쾅’보다 ‘갈라지다’가 날카로운 핍진성을 준다.', use: '“총성이 골목을 갈라놓자, 비둘기 떼가 일제히 솟구쳤다.”' },
      { word: '금속이 맞부딪치다 / 쇳소리', gloss: '칼·갑주·총기 부품이 부딪는 소리. 근접전·장전의 청각 신호.', use: '“검과 검이 맞부딪친 쇳소리가 회랑을 길게 울렸다.”' },
      { word: '약실이 물리는 소리 / 노리쇠 전진음', gloss: '장전의 ‘철컥’. 위협·각오를 압축하는 가장 영화적인 음향 신호.', use: '“어둠 속에서 노리쇠가 전진하는 소리가, 협상의 끝을 알렸다.”' },
      { word: '화약 냄새 / 코르다이트 냄새', gloss: '격발 직후의 매캐한 냄새. 사격이 ‘방금’ 있었음을 후각으로 증명.', use: '“방 안에 화약 냄새가 채 가시지 않았다. 그는 늦지 않았다.”' },
      { word: '피비린내 / 쇠 맛', gloss: '유혈의 후각·미각. 입안에 도는 쇠 맛은 부상·근접전의 단골 디테일.', use: '“입안에 쇠 맛이 고였다. 깨문 건지 맞은 건지 알 수 없었다.”' },
      { word: '흙먼지 / 잔해 가루', gloss: '포격·붕괴 후 자욱이 깔리는 먼지. 시야 차단·세트피스 여파의 시각·후각.', use: '“포연과 흙먼지가 걷히자, 방금까지 있던 진지가 사라져 있었다.”' },
      { word: '살이 찢기는 소리 / 둔탁한 소리', gloss: '타격·관통의 ‘육성(肉聲)’. 잔혹도를 한 단계 끌어올리는 음향.', use: '“둔탁한 소리와 함께, 적의 몸이 휘청 꺾였다.”' },
      { word: '정적 / 적막', read: '靜寂', gloss: '교전 직전·직후의 침묵. 소리의 ‘부재’가 가장 큰 긴장을 만든다(들숨-날숨).', use: '“총성이 멎고, 견딜 수 없는 정적이 참호를 짓눌렀다.”' },
      { word: '비명 / 신음 / 단말마', gloss: '피격자의 소리. 한 줄의 신음이 익명의 ‘적’을 인간으로 되돌린다.', use: '“어둠 어딘가에서 누군가의 단말마가 짧게 끊겼다.”' },
      { word: '포성이 땅을 흔들다 / 진동', gloss: '곡사·폭격의 충격파. 소리보다 먼저 오는 ‘땅의 떨림’.', use: '“포성보다 먼저, 발밑의 땅이 먼저 흔들렸다.”' },
      { word: '귓가를 스치는 파공음 / 휘파람 소리', gloss: '날아드는 탄·화살의 ‘쌩’. 빗나간 일격의 아찔함을 청각화.', use: '“총알이 귓가를 휘파람처럼 스쳐, 등 뒤 나무에 박혔다.”' },
      { word: '비가 핏물을 씻다 / 빗소리', gloss: '날씨로 잔혹·비장을 중화·증폭하는 환경음. 클라이맥스·여파의 단골.', use: '“빗줄기가 광장의 핏물을 천천히 씻어 내렸다.”' },
    ],
  },
  {
    key: 'military', label: '군사·전술·편제', icon: '🎖️', desc: '편제·계급·전술 — 전쟁물 고증 어휘 뱅크 (§6 군사·전쟁 어휘)',
    items: [
      { word: '분대·소대·중대·대대·연대·사단', gloss: '병력 편제의 위계. 규모감을 정확히 쓰면 고증의 신뢰가 선다.', use: '“소대 하나로 중대를 막으라는 명령이, 그날의 시작이었다.”' },
      { word: '측면 우회', read: '迂回', gloss: '정면을 피해 적의 옆구리·후방을 치는 기동(flanking). 전술적 머리 싸움의 기본.', use: '“그는 정면을 미끼로 던지고, 두 개 분대를 측면으로 우회시켰다.”' },
      { word: '포위 섬멸 / 각개격파', gloss: '적을 가두어 전멸시키거나(섬멸), 분산된 적을 하나씩 깨는(각개격파) 교범 전술.', use: '“다리를 끊어 적을 둘로 가른 뒤, 각개격파했다.”' },
      { word: '양동작전', read: '陽動', gloss: '한쪽에서 큰 소동을 일으켜 주의를 끌고, 진짜 타격은 다른 곳에 가하는 기만.', use: '“정문의 총격은 양동이었다. 본대는 이미 하수로를 지나고 있었다.”' },
      { word: '제압 사격 / 엄호 사격', gloss: '적이 고개를 못 들게 퍼붓는 사격(제압)·아군 이동을 가려 주는 사격(엄호).', use: '“제압 사격! 그 틈에 위생병이 부상자를 끌어냈다.”' },
      { word: '거점 사수 / 종심 방어', gloss: '한 지점을 끝까지 지키는 방어(사수)·여러 겹으로 깊이 막는 방어(종심).', use: '“증원이 올 때까지 다리만 사수하면 된다 — 말은 쉬웠다.”' },
      { word: '돌격 / 백병전', read: '突擊·白兵戰', gloss: '엄폐를 버리고 적진으로 뛰어드는 공격·총검과 맨몸의 근접 난전.', use: '“탄이 떨어지자, 남은 건 총검을 꽂은 백병전뿐이었다.”' },
      { word: '철수 / 후퇴 / 패주', gloss: '질서 있는 물러남(철수·후퇴)과 무너진 도주(패주)의 구분. 패배의 결이 다르다.', use: '“후퇴는 명령이었고, 패주는 결과였다.”' },
      { word: '보급선 / 병참', read: '兵站', gloss: '탄약·식량·연료를 잇는 생명선. ‘전투는 전술이 이기고 전쟁은 병참이 이긴다.’', use: '“적의 보급선을 끊은 순간, 전선의 균형이 기울었다.”' },
      { word: '정찰 / 척후 / 첩보', gloss: '적정을 살피는 눈(정찰·척후)과 정보전(첩보). 정보의 비대칭이 승패를 가른다.', use: '“척후가 가져온 한 줄의 보고가, 사단의 운명을 바꿨다.”' },
      { word: '교두보 / 거점', read: '橋頭堡', gloss: '적지에 마련한 첫 발판(교두보). 여기서 전과를 확대해 나간다.', use: '“해변에 교두보를 확보하는 데, 한 중대가 통째로 녹았다.”' },
      { word: '공성 / 농성', read: '攻城·籠城', gloss: '성·요새를 치는 공격(공성)과 갇혀 버티는 방어(농성). 장기전·소모전의 무대.', use: '“공성추가 성문을 때릴 때마다, 농성군의 사기가 한 줌씩 깎였다.”' },
      { word: '참호 / 교통호', read: '塹壕', gloss: '몸을 숨기는 도랑. 진흙·쥐·포격의 환멸을 담는 1차대전식 전쟁 공간.', use: '“참호 바닥의 진창이 군화를 삼키려 들었다.”' },
      { word: '예비대 / 증원', read: '豫備隊', gloss: '결정적 순간에 투입하는 남겨 둔 병력(예비대)·도착하는 추가 병력(증원).', use: '“예비대를 아끼다 전선이 무너졌다. 너무 늦게 투입했다.”' },
      { word: '교전수칙 / 사상자 / 전사', gloss: '교전의 규칙(ROE)과 인적 손실(사상자·전사). 전쟁의 ‘비용’을 수치로 환기.', use: '“보고서엔 ‘전사 12, 부상 31’이라 적혔다. 이름은 없었다.”' },
    ],
  },
  {
    key: 'weapon', label: '화기·장비·탄도', icon: '🔫', desc: '구경·탄창·재장전 등 화기 고증 어휘 (§6 화기·장비)',
    items: [
      { word: '구경 / 탄창 / 약실', read: '口徑·彈倉', gloss: '총탄 굵기(구경)·탄을 담는 통(탄창)·발사 직전 탄이 머무는 방(약실).', use: '“탄창을 갈아 끼우고, 약실에 한 발을 밀어 넣었다.”' },
      { word: '재장전 / 탄걸림', gloss: '탄을 다시 채우는 동작(재장전)과 급탄 불량(탄걸림). 가장 위험한 빈틈.', use: '“하필 그 순간 탄이 걸렸다. 그는 약실을 후려쳐 강제로 배출시켰다.”' },
      { word: '조준선 / 가늠자·가늠쇠 / 영점', gloss: '겨냥의 기준선과 조정점. 저격·정밀 사격 묘사의 핵심 어휘.', use: '“조준선 끝에 표적의 가슴을 올려놓고, 영점을 떠올렸다.”' },
      { word: '점사 / 연발 / 단발', gloss: '끊어 쏘기(점사)·연속 사격(연발)·한 발씩(단발). 사격 양상의 결을 가른다.', use: '“탄을 아끼려 단발로 끊어 쐈다. 한 발에 하나씩.”' },
      { word: '탄착 / 탄도 / 유탄', read: '彈着·彈道', gloss: '탄이 박힌 자리(탄착)·탄의 비행 곡선(탄도)·빗나가 튀는 탄(유탄).', use: '“탄착이 표적 주위로 점점 좁혀 들어왔다. 적도 사거리를 잡은 것이다.”' },
      { word: '곡사 / 직사 / 포격', read: '曲射·直射', gloss: '포물선으로 넘겨 쏘기(곡사)·직선으로 쏘기(직사). 포병·중화기의 어휘.', use: '“직사로는 닿지 않는 능선 너머를, 곡사 포탄이 넘어가 때렸다.”' },
      { word: '수류탄 / 파편 / 근접신관', gloss: '투척 폭발물과 그 파편, 일정 거리에서 터지는 신관. 근접 폭발의 위협.', use: '“수류탄을 까서 셋을 센 뒤 던졌다. 파편이 벽을 갈퀴처럼 긁었다.”' },
      { word: '저격 / 호흡 / 격발', gloss: '원거리 정밀 사격. 들숨의 끝, 멈춘 호흡, 미세한 격발이 한 발을 만든다.', use: '“숨을 절반쯤 뱉고 멈춘 뒤, 심장 박동 사이의 정적에 격발했다.”' },
      { word: '엄폐물 / 차폐 / 사각', read: '掩蔽·死角', gloss: '몸을 가리는 지형지물과 적의 시야·사선이 닿지 않는 사각. 액션 지리의 뼈대.', use: '“그는 사각을 따라 이동했다. 적의 총구가 닿지 않는 죽은 선을.”' },
      { word: '탄약 잔량 / 마지막 한 발', gloss: '소모되는 자원의 시계. ‘탄창에 한 발’은 가장 강력한 카운트다운(§3 마지막 한 발).', use: '“탄창의 무게로 잔량을 가늠했다. 많아야 세 발.”' },
      { word: '백병 / 총검 / 단검', read: '白兵·銃劍', gloss: '탄이 떨어진 뒤의 근접 무기. 거리가 ‘0’이 된 가장 친밀하고 잔혹한 싸움.', use: '“총은 이제 곤봉이었다. 그는 개머리판을 고쳐 쥐었다.”' },
      { word: '폭약 / 기폭 / 도화선', gloss: '폭파의 어휘. 기폭 장치·타이머·도화선은 ‘시계 장치’ 긴장의 부품(§3 시계 장치).', use: '“기폭 장치의 붉은 숫자가 00:47에서 멈춰 있었다.”' },
      { word: '장비 점검 / 무장 / 로드아웃', gloss: '작전 전 무장 갖추기(loadout). 능력 사전공개+긴장 적재의 의식(§3 의식·준비 몽타주).', use: '“그는 탄창 일곱 개, 칼 둘, 그리고 사진 한 장을 챙겼다.”' },
    ],
  },
  {
    key: 'martial', label: '무협·내공·검술', icon: '🥋', desc: '내공·초식·경공 등 동양 무협 액션 어휘 (§6 무협 변종)',
    items: [
      { word: '내공', read: '內功', gloss: '단전에 쌓은 내적 기운. 무인의 ‘체력 게이지’이자 모든 절기의 연료.', use: '“남은 내공을 단 한 수에 쏟아부을 각오였다.”' },
      { word: '진기 / 운기', read: '眞氣·運氣', gloss: '몸을 도는 정순한 기운(진기)과 그것을 돌려 회복·증폭하는 행위(운기조식).', use: '“운기조식으로 흐트러진 진기를 가까스로 다스렸다.”' },
      { word: '심법', read: '心法', gloss: '내공을 쌓고 운용하는 근본 수련법. 무공의 ‘OS’. 상승 심법이 곧 격차.', use: '“상승 심법 한 줄이, 십 년의 수련을 앞당겼다.”' },
      { word: '초식 / 절기', read: '招式·絶技', gloss: '검·권의 정해진 동작 묶음(초식)과 비장의 필살기(절기). ‘초식 파훼’가 승부의 머리 싸움.', use: '“그는 적의 초식을 세 수 만에 읽어 내고, 파훼점을 찔렀다.”' },
      { word: '검기 / 검강', read: '劍氣·劍罡', gloss: '검에 실린 기운(검기)과 그 정점, 형체를 갖춘 강기(검강). 무력 등급의 지표.', use: '“검 끝에서 검기가 한 자나 솟구쳤다 — 이미 일류를 넘어선 경지.”' },
      { word: '기파 / 장풍', read: '氣波·掌風', gloss: '기를 쏘아 보내는 원거리 공격. 무협의 ‘포격’. 충격파로 지면을 가른다.', use: '“쌍장에서 뻗어 나간 장풍이 흙바닥을 한 줄로 갈랐다.”' },
      { word: '점혈 / 혈도', read: '點穴·穴道', gloss: '경혈을 찍어 상대를 마비·제압하는 기술. 한 점으로 거인을 멈춘다.', use: '“손가락 하나가 마혈을 짚자, 거구가 그대로 굳었다.”' },
      { word: '경공', read: '輕功', gloss: '몸을 가벼이 하여 빠르게 달리고 도약하는 신법. 추격·기동전의 무협판.', use: '“경공을 펼친 그림자가 지붕에서 지붕으로 건너뛰었다.”' },
      { word: '비무 / 생사결', read: '比武·生死決', gloss: '겨루기(비무)와 목숨을 건 결투(생사결). 서열·정통성을 가리는 무대.', use: '“비무대 위, 둘 중 하나는 내려오지 못할 생사결이 시작됐다.”' },
      { word: '문파 / 정파·사파', read: '門派·正派·邪派', gloss: '무공을 잇는 집단과 그 진영(정/사). 문파전·정사대전의 단위.', use: '“정파의 깃발과 사파의 깃발이 협곡을 사이에 두고 마주 섰다.”' },
      { word: '기연', read: '奇緣', gloss: '동굴 속 비급·영약 등 우연한 행운으로 급성장하는 무협 성장 장치. 남발은 금물.', use: '“절벽 아래에서 그는 백 년 묵은 비급과, 한 알의 영약을 얻었다.”' },
      { word: '주화입마', read: '走火入魔', gloss: '무리한 운기·심마로 기가 역류해 폐인이 되거나 미쳐 버리는 위험. 능력의 ‘대가’.', use: '“금기의 마공에 손을 댄 그는, 끝내 주화입마에 빠졌다.”' },
      { word: '화경 / 현경 / 생사경', read: '化境·玄境', gloss: '무의 경지를 나누는 등급. ‘한 단계 위 빌런’의 격차를 설계하는 사다리.', use: '“상대는 현경. 화경에 갓 든 그로선, 검을 마주하는 것조차 버거웠다.”' },
    ],
  },
  {
    key: 'hunter', label: '헌터·각성·게임적', icon: '🎮', desc: '각성·스킬·레이드 등 현대 헌터물 액션 어휘 (§6 헌터/게임판타지 변종)',
    items: [
      { word: '각성 / 각성자', read: '覺醒者', gloss: '게이트 출현 이후 초능력에 눈뜬 인간. 등급(E~S, SS·SSS)으로 분류·관리된다.', use: '“그는 십 년을 최약체 각성자로 비웃음당했다 — 회귀하기 전까지는.”' },
      { word: '게이트 / 던전 / 브레이크', gloss: '현실에 열리는 이세계의 문(게이트)·그 내부(던전)·방치 시 몬스터가 쏟아지는 붕괴(브레이크).', use: '“S급 게이트가 닫히지 않으면, 사흘 뒤 던전 브레이크가 일어난다.”' },
      { word: '레이드 / 공략 / 클리어', gloss: '강력한 보스·던전을 다수가 협공(레이드)해 깨는 것. 작전 단위의 집단 액션.', use: '“길드의 정예 전원이 S급 보스 레이드에 투입됐다.”' },
      { word: '스킬 / 쿨타임 / 시전', gloss: '발동형 특수 능력(스킬)·재사용 대기(쿨타임)·시전 동작. 액션의 ‘리소스 관리’.', use: '“핵심 스킬의 쿨타임이 돌기까지, 그는 맨몸으로 버텨야 했다.”' },
      { word: '버프 / 디버프 / 상태이상', gloss: '능력 강화(버프)·약화(디버프)·마비·중독 등 상태이상. 전투의 변수·역전 장치.', use: '“광역 버프가 아군을 황금빛으로 물들이는 순간, 전세가 뒤집혔다.”' },
      { word: '탱커 / 딜러 / 힐러', gloss: '어그로를 끄는 방패(탱커)·화력(딜러)·치유(힐러). 파티 액션의 역할 분담.', use: '“탱커가 보스를 붙드는 3초, 그 안에 딜러들이 화력을 쏟아부었다.”' },
      { word: '어그로 / 헤이트', gloss: '몬스터의 적개심·표적 지정. 탱커가 ‘어그로를 끄는’ 순간 진형이 산다.', use: '“그는 일부러 어그로를 끌어, 보스의 시선을 자신에게 묶었다.”' },
      { word: '보스 / 네임드 / 코어', gloss: '던전의 최종 마물(보스)·고유 개체(네임드)·파괴 시 던전이 닫히는 핵심(코어).', use: '“보스의 코어를 부수는 순간, 던전 전체가 무너지기 시작했다.”' },
      { word: '스테이터스 / 스탯 / 레벨업', gloss: '능력치 창과 수치(힘·민첩·체력…), 그 상승. 성장의 즉각적 가시화 장치.', use: '“[레벨 업!] 익숙한 종소리가, 그의 귀에만 울렸다.”' },
      { word: '아이템 / 아티팩트 / 드랍', gloss: '획득 장비(아이템)·전설급 물건(아티팩트)·처치 시 떨구는 전리품(드랍).', use: '“보스가 쓰러진 자리에, 등급조차 매길 수 없는 아티팩트가 떨어졌다.”' },
      { word: '마나 / 기력 / 자원 고갈', gloss: '스킬을 쓰는 연료(마나·기력)와 그 바닥남. 헌터판 ‘마지막 한 발’.', use: '“마나가 바닥났다. 남은 건 부러진 검과, 두 주먹뿐이었다.”' },
      { word: '랭커 / 길드 / 길드전', gloss: '서열 상위 강자(랭커)·조직(길드)·세력 간 충돌(길드전). PvP·세력전의 단위.', use: '“상위 랭커 한 사람의 부재로, 게이트 하나가 무너졌다.”' },
    ],
  },
  {
    key: 'idiom', label: '관용표현·상투구', icon: '🗯️', desc: '액션·전쟁에서 닳도록 쓰는 결정적 한 줄 (§5 클라이맥스·§3 장치)',
    items: [
      { word: '“마지막 한 발 남았다”', gloss: '자원 고갈 직전의 카운트다운 선언. 역전의 긴장을 최대로 끌어올린다(§3 마지막 한 발).', use: '“탄창엔 한 발. 그는 그 한 발을, 가장 비싼 표적에 아꼈다.”' },
      { word: '“증원은 오지 않는다”', gloss: '고립·최후의 저항(last stand)을 못 박는 선언. 약자 응원 심리를 점화.', use: '“증원은 없다. 우리가, 이 다리의 마지막이다.”' },
      { word: '“너만은 살아서 돌아가라”', gloss: '희생적 후위(sacrificial rearguard)의 정형구. 동료가 남아 막고 주인공을 보낸다(§3).', use: '“가. 여긴 내가 맡는다. 뒤돌아보지 마.”' },
      { word: '“이건 명령이 아니라 부탁이다”', gloss: '지휘관이 계급을 내려놓고 인간으로 청하는 한 줄. 명령/대의의 무게를 비튼다.', use: '“이건 명령이 아니야. 부탁이다 — 부디 살아남아 줘.”' },
      { word: '“숨을 멈추고, 쏴라”', gloss: '저격·정밀 사격의 호흡 의식을 압축한 상투구. 시그니처 무브의 신호.', use: '“들이쉬고, 절반을 뱉고, 멈춘다. 그리고 — 쏜다.”' },
      { word: '“이 자리는 내가 지킨다”', gloss: '거점 사수·1대 다수의 각오 선언. 한 명이 길목을 틀어막는 알라모식 장치.', use: '“다들 가라. 이 골목은, 내가 지킨다.”' },
      { word: '“대가 없는 승리는 없다”', gloss: '피로스의 승리(Pyrrhic)를 못 박는 전쟁물 상투구. 무손상 승리의 김 빠짐을 경계.', use: '“우리는 이겼다. 다만, 무엇을 잃었는지는 아무도 세지 않았다.”' },
      { word: '“시간이 없다 / 시계가 돌고 있다”', gloss: '시계 장치(ticking clock)를 환기하는 정형구. 폭탄·증원·만조의 카운트다운(§3).', use: '“타이머는 멈추지 않아. 90초, 그 안에 끝내야 한다.”' },
      { word: '“돌아갈 다리는 불태웠다”', gloss: '배수의 진·퇴로 차단의 각오. 후퇴 없는 결전을 선언하는 상투구.', use: '“우리 뒤의 다리는 이미 끊었다. 앞으로 가는 길밖에 없다.”' },
      { word: '“이게 마지막이 아니다”', gloss: '중간 보스 격파 후의 떡밥. 점층되는 세트피스(더 큰 위협)를 예고(§4).', use: '“이놈은 시작에 불과했다. 진짜는, 저 너머에 있다.”' },
      { word: '“방아쇠를 당길 수 있겠나”', gloss: '첫 살인·도덕의 임계를 묻는 전쟁·누아르식 질문. 폭력의 대가를 환기.', use: '“겨눌 줄 아는 것과, 당기는 것은 다른 일이야.”' },
      { word: '“여기서 죽기엔 갈 길이 멀다”', gloss: '최저점 직후 의지를 끌어올리는 자기 선언. 역전의 동력(§5 최저점 직후 역전).', use: '“아직이다. 여기서 끝내기엔, 갚아야 할 게 너무 많아.”' },
    ],
  },
  {
    key: 'tone', label: '말투·어조', icon: '🎭', desc: '병사·지휘관·무인의 말씨와 액션 특유의 문체 (§4 페이싱·§2)',
    items: [
      { word: '무전·교신체', gloss: '“이상”·콜사인·간결한 보고로 이뤄진 통신 문체. 긴박함과 거리감을 동시에 준다.', use: '“브라보, 여기는 액추얼. 좌표 확인. 사격 개시 — 이상.”' },
      { word: '명령·하달체', gloss: '짧고 단정적인 지휘 어조. 동사로 끝맺어 즉각성과 위계를 드러낸다.', use: '“2소대 좌측, 1소대 엄호. 신호에 맞춰 돌격한다. 질문 없다.”' },
      { word: '냉정한 베테랑체', gloss: '감정을 누른 담담한 어조. 위기 속의 침착함이 도리어 위압감을 만든다.', use: '“당황하지 마. 숨 쉬고, 표적만 봐. 나머진 잊어.”' },
      { word: '비장·결의체', gloss: '죽음을 각오한 무겁고 느린 어조. 희생·최후의 저항 장면의 정서 문체.', use: '“돌아오지 못해도 괜찮다. 누군가는, 이 자리에 있어야 하니까.”' },
      { word: '능청·시니컬 액션체', gloss: '위기를 농담으로 흘리는 가벼운 어조. 들숨-날숨 리듬의 ‘날숨’을 채운다(§4).', use: '“총 다섯에 칼 하나라. 음, 공평하진 않네 — 너희한테.”' },
      { word: '무인의 격식체(무협)', gloss: '“소생·노부·검을 섞다” 등 고풍의 무림 어투. 비무·도전의 예법을 드러낸다.', use: '“소생, 그대의 검을 청하오. 한 수 가르침을 받고자 하오.”' },
      { word: '참호·병사 푸념체', gloss: '냉소·욕설·농지거리로 공포를 견디는 사병들의 말씨. 전쟁의 환멸을 인간화한다.', use: '“또 진격이래. 위에선 지도만 보지, 진창은 우리 몫이고.”' },
      { word: '브리핑·작전 설명체', gloss: '지도·시각·제약을 또박또박 짚는 설명 문체. 단, 전투 직전 인포덤프는 금물(§4 안티패턴).', use: '“목표는 다리. 제한 시간 20분. 적 분대 둘, 기관총좌 하나. 출발은 03시.”' },
      { word: '슬로모션 내레이션', gloss: '결정적 1비트를 늘려 묘사하는 시간 왜곡 화법. 남발하면 둔감해진다(§4 비트 단위).', use: '‘탄피가 허공에서 회전했다. 그 한순간이, 영원처럼 길었다.’' },
      { word: '회고·생존자 증언체', gloss: '전쟁이 끝난 뒤 돌아보는 1인칭. ‘무게의 물건’과 죄책감을 담는 그릇(§3).', use: '‘나는 아직도, 그가 건넨 편지를 부치지 못했다.’' },
      { word: '단문·동사 폭주체', gloss: '격렬 구간의 짧은 문장·행 바꿈. 문장 길이가 곧 속도계(§4 미시 페이싱).', use: '“뛴다. 구른다. 쏜다. 비명. 정적.”' },
    ],
  },
  {
    key: 'cliche', label: '클리셰·전복', icon: '🔁', desc: '인지하고 변주할 단골 설정 — 그대로 쓰거나, 비틀거나 (§5·§4 안티패턴)',
    items: [
      { word: '주인공은 절대 안 죽는다(무손상 승리)', gloss: '긴장의 최대 적. 다치지도, 잃지도 않는 승리의 반복은 카타르시스를 죽인다(§2 물리적 대가).', use: '전복: 이기되 동료·신념·몸의 일부를 영구히 잃는 ‘대가 있는 승리’로.' },
      { word: '최종 결전에서 솟는 새 힘(각성)', gloss: '데우스 엑스 마키나. 무에서 솟는 힘은 독자에게 ‘사기’로 읽힌다(§2 능력의 규칙).', use: '대안: 클라이맥스의 힘은 1~2막의 수련·복선으로 반드시 미리 심어 회수한다.' },
      { word: '타이머는 항상 00:01에 멈춘다', gloss: '시계 장치의 단골이자 식상함. 아슬아슬한 해제가 너무 정확하면 긴장이 ‘연출’로 들킨다.', use: '전복: 시한을 ‘넘겨’ 폭발시키되, 미리 대피·우회로 대가를 치르게 한다.' },
      { word: '죽기 직전 길게 늘어놓는 적의 독백', gloss: '빌런이 마무리 대신 떠드는 클리셰. 그 틈에 주인공이 역전하는 정형까지 한 세트.', use: '전복: 빌런은 말없이 방아쇠를 당긴다 — 진짜 위협은 떠들지 않는다.' },
      { word: '“이번이 마지막 임무다”의 베테랑', gloss: '은퇴 직전 한 건. 곧 죽거나 큰일을 겪는다는 사망 플래그의 대명사.', use: '전복: 그가 끝까지 살아남고, 정작 멀쩡하던 신참이 무너진다.' },
      { word: '잡몹은 무한, 보스는 1대1', gloss: '졸개는 떼로 쓸리고 두목과는 일기토. 편하지만 모든 전투가 같은 모양이 된다(§4 평탄화).', use: '전복: 졸개 하나가 의외의 변수로 판을 뒤집거나, 보스를 머리·팀워크로 깬다.' },
      { word: '폭발을 등지고 걷는다(뒤돌아보지 않기)', gloss: '쿨함의 클리셰. 영상 문법의 잔재로, 소설에선 감각·여파 묘사가 더 강하다.', use: '전복: 폭발의 열·파편·이명까지 몸으로 받아내며, 인물의 대가를 보여 준다.' },
      { word: '아군 진영은 전부 선, 적은 전부 악', gloss: '단순한 선악 구도. 전쟁물에선 후방·민간·적 병사의 시점이 빠지면 평면적이 된다(§2).', use: '전복: 진짜 적은 외부가 아니라 아군 지휘부·체제였다는 폭로형 절정(§5 반전).' },
      { word: '“네 뒤야!” — 항상 늦지 않게 알려 준다', gloss: '동료의 적시 경고로 위기를 모면하는 정형. 남발하면 위협이 가벼워진다.', use: '전복: 그 경고가 한 박자 늦어, 대가(부상·동료의 죽음)를 치르게 한다.' },
      { word: '신병은 첫 전투에서 반드시 토한다', gloss: '입대→환멸의 통과의례 클리셰. 그 자체는 핍진하나, 똑같이 반복되면 상투구.', use: '전복: 정작 토한 건 베테랑이고, 신병이 무섭도록 침착해 불안을 자아낸다.' },
      { word: '주인공 등장만으로 적이 도망/항복', gloss: '먼치킨의 과시. 사이다지만 ‘준비·약점공략’ 없는 우위는 긴장을 0으로 만든다(§2 승부의 정당성).', use: '전복: 압도적 강자에게도 통하지 않는 적(머리·숫자·환경)을 두어 머리 싸움을 강제한다.' },
      { word: '기연·영약으로 하루아침에 최강(무협)', gloss: '동굴 비급식 급성장. 노력 없는 인플레는 능력의 ‘규칙’을 무너뜨린다(§3 능력 격차 사다리).', use: '전복: 기연은 ‘열쇠’일 뿐, 진짜 격차는 누적된 수련·실전·약점 극복으로 메운다.' },
    ],
  },
]

const LS = 'sry:tool:action-lexicon:'
const ALL_KEY = '__all__'
type Flat = { cat: CatDef; item: Term }
const flatAll = (): Flat[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

// ── 한국어 조사(받침) 헬퍼 ─────────────────────────────────────────────
//  앞 글자의 받침 유무를 유니코드로 판정해 실제 조사 한쪽만 출력한다.
//  결과에 "을(를)" 같은 괄호 이중표기를 절대 노출하지 않는다.
const hasJong = (word: string): boolean => {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false // 한글 음절이 아니면 받침 없음으로 처리
  return (code - 0xac00) % 28 !== 0
}
// 'ㄹ' 받침 여부(으로/로 판정용: ㄹ받침은 '로'를 쓴다)
const endsRieul = (word: string): boolean => {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 === 8 // 종성 인덱스 8 = ㄹ
}
const josaEul = (w: string) => w + (hasJong(w) ? '을' : '를') // 을/를
const josaEun = (w: string) => w + (hasJong(w) ? '은' : '는') // 은/는
const josaIga = (w: string) => w + (hasJong(w) ? '이' : '가') // 이/가
const josaEuro = (w: string) => w + (hasJong(w) && !endsRieul(w) ? '으로' : '로') // 으로/로

// ── 전투 한 문장 합성기: 문법역할별 독립 슬롯의 곱집합 ──────────────────
//  각 슬롯은 같은 문법역할의 고유 항목 풀. 슬롯끼리 다른 슬롯을 전제하지 않아
//  곱집합으로 섞여도 의미 충돌이 없다(슬롯 독립성). 조사는 위 헬퍼로 자동 선택.
//  문장 골격:
//   [장소]에서, [상황] [주체]는 [부사] [대상]을/를 [무기]로/으로 [동작], [여파].
//  - place    : 장소(명사구) + 에서
//  - situation: 도입 부사절(시간·정황) — 불변, 쉼표로 끝맺음
//  - subject  : 주체(명사구) + 은/는
//  - manner   : 양태 부사 — 불변
//  - target   : 대상(명사구) + 을/를
//  - instrument: 수단·무기(명사구) + 으로/로
//  - action   : 술어 연결형(…하며/…했고) — 다음 절로 이어짐
//  - closing  : 종결문(완결된 한 문장) — 감각·여파
const SLOTS = {
  place: [
    '폐허가 된 시가지', '무너진 교두보', '안개 낀 능선', '불타는 활주로', '좁은 골목 미로',
    '버려진 지하 벙커', '포연이 자욱한 광장', '눈보라 치는 고개', '수몰된 지하철역', '무너진 성벽 위',
    '진창이 된 참호', '협곡의 외길', '항구의 컨테이너 야적장', '폭우 쏟아지는 옥상', '달빛 아래 죽림(竹林)',
    '붕괴 직전의 다리', '연기 자욱한 격납고', '버려진 제철소', '얼어붙은 강 한복판', '게이트가 열린 도심',
    '무너진 사찰 마당', '폐광의 갱도', '난파선의 갑판', '폭격 맞은 기차역', '잿더미가 된 마을 어귀',
    '적진 한복판', '인적 끊긴 고속도로', '비 내리는 부둣가',
  ],
  situation: [
    '총성이 멎은 순간,', '마지막 탄창을 갈아 끼우자마자,', '증원이 끊겼다는 보고가 오자,',
    '경보가 울려 퍼지는 가운데,', '동이 트기 직전의 어둠 속에서,', '포성이 땅을 흔드는 와중에,',
    '숨 막히는 정적이 깔리자,', '퇴로가 막혔음을 깨닫고,', '신호탄이 하늘을 가르자,',
    '적의 진형이 무너지는 틈을 노려,', '제압 사격이 잠시 멎은 사이,', '시계가 0을 향해 달려가는 가운데,',
    '비가 핏물을 씻어 내리는 가운데,', '무전이 잡음으로 끊긴 채,', '연막이 시야를 가린 틈에,',
    '첫 일격을 주고받은 직후,', '아군의 비명이 등 뒤에서 들려오자,', '한 호흡을 길게 내쉬고,',
    '함정임을 뒤늦게 알아챘지만,', '마지막 명령이 하달되자,', '적장이 모습을 드러내자,',
    '예비대마저 소진된 상황에서,', '날이 완전히 저물기 전에,', '폭약의 도화선에 불이 붙은 채,',
    '굳은 각오를 다지며,', '두 진영이 숨을 죽인 채 마주 선 가운데,',
  ],
  subject: [
    '노련한 분대장', '홀로 남은 저격수', '회귀한 최약체 각성자', '상처 입은 검객', '냉정한 용병',
    '갓 입대한 신병', '눈먼 노검객', '복수를 벼른 생존자', '문파의 마지막 제자', '길드의 에이스 딜러',
    '퇴역을 앞둔 베테랑', '명령을 어긴 부사관', '정파의 후기지수', '맨몸의 격투가', '한쪽 팔을 잃은 전사',
    '잠입한 특작 요원', '내공이 바닥난 무인', '탄약이 떨어진 기관총 사수', '전향한 적의 장교', '말 없는 호위 무사',
    '쫓기던 탈영병', '각성에 갓 눈뜬 소녀', '전설로만 불리던 랭커', '항복을 거부한 지휘관',
    '낙오된 위생병', '가면을 쓴 암살자', '마지막 기수(騎手)', '주화입마를 이겨낸 무인',
  ],
  manner: [
    '단숨에', '소리 없이', '망설임 없이', '한 치의 오차도 없이', '죽을힘을 다해',
    '냉정하게', '폭발적으로', '숨을 죽인 채', '번개같이', '조금도 물러서지 않고',
    '마지막 힘을 짜내', '정확히 급소만 노려', '거침없이', '한 호흡에', '피하지 않고 정면으로',
    '그림자처럼', '단 한 번의 동작으로', '아슬아슬하게', '무자비하게', '잔상만 남긴 채',
    '들숨 한 번에', '망설임을 지운 눈으로', '바람을 가르며', '온 힘을 실어', '눈 깜짝할 사이에',
    '한 점에 집중해',
  ],
  target: [
    '돌격해 오는 선봉', '거점을 지키던 보초', '겹겹의 포위망', '적장의 빈틈', '쏟아지는 탄막',
    '날아드는 칼날', '몰려드는 잡몹 무리', '마지막 방어선', '굳게 닫힌 성문', '무방비한 측면',
    '던전의 보스', '추격해 오는 척후대', '코앞의 위협', '기관총좌', '두꺼운 갑주',
    '적의 초식', '폭주하는 마수', '도주로를 막아선 벽', '눈앞의 적장', '겹겹의 방패벽',
    '쇄도하는 기병대', '함정이 도사린 통로', '굶주린 포식자', '한순간의 허점', '거대한 강철 문',
    '사방의 어그로',
  ],
  instrument: [
    '한 자루 단검', '마지막 한 발', '부러진 검', '온몸의 내공', '맨주먹',
    '노획한 소총', '날카로운 검기', '한 줄기 장풍', '개머리판', '품속의 수류탄',
    '재장전한 권총', '비장의 절기', '쌍검', '강철 와이어', '쿨타임이 돌아온 스킬',
    '곡사 포격', '단 한 번의 정권', '경공의 보법', '예리한 군용 나이프', '폭약 한 뭉치',
    '뽑아 든 장검', '되찾은 권총', '필살의 검강', '쏟아붓는 화력',
    '한 발의 저격탄', '맨손의 점혈술', '집어 든 둔기', '발동시킨 광역 스킬',
  ],
  // 모두 '대상을/를 무기로/으로 ___' 골격의 타동사 술어(연결형).
  //  자체 목적어를 따로 품지 않아(대상 슬롯이 곧 목적어) 이중 목적어 충돌이 없다.
  action: [
    '꿰뚫었고', '베어 넘겼으며', '단숨에 무너뜨렸고', '정확히 노렸으며',
    '한 호흡에 제압했고', '끝내 무너뜨렸으며', '단번에 베어 갈랐고', '낱낱이 파훼했으며',
    '거침없이 밀어붙였고', '되받아쳐 흩어 놓았으며', '한 점으로 꿰뚫었고', '단칼에 갈라놓았으며',
    '깨끗이 쓸어버렸고', '정면으로 받아쳤으며', '단숨에 격파했고', '낚아채 흐름을 끊었으며',
    '가차 없이 짓이겼고', '한 수에 봉쇄했으며', '뚫고 들어갔고', '끝까지 막아냈으며',
    '단번에 제압했고', '산산이 깨부쉈으며', '정확히 타격했고', '단 일격에 무너뜨렸으며',
    '맞받아 흩뜨렸고', '집요하게 파고들었으며', '단숨에 돌파했고', '한 줄기로 갈라냈으며',
    '여지없이 꺾어 놓았고', '끝내 분쇄했으며',
  ],
  closing: [
    '정적만이 폐허에 내려앉았다.', '그 한 발이, 전세를 뒤집었다.', '비로소 전선의 균형이 기울었다.',
    '살아남은 자는 그 하나뿐이었다.', '대가 없는 승리는 없었다.', '귓속에선 아직 이명이 울렸다.',
    '땀에 젖은 손이 천천히 떨렸다.', '화약 냄새가 채 가시지 않았다.', '먼동이 잿빛으로 밝아 왔다.',
    '돌아갈 다리는 이미 불탔다.', '아무도 그 이름을 세지 않았다.', '비가 핏물을 씻어 내렸다.',
    '남은 건 부러진 검과 두 주먹뿐이었다.', '적은 더 이상 움직이지 않았다.', '증원은 끝내 오지 않았다.',
    '그것이 마지막은 아니었다.', '폐가 불에 덴 듯 타들어갔다.', '심장 소리만이 정적을 두드렸다.',
    '한 뼘만 빗나갔어도 끝이었다.', '동료의 빈자리가 유난히 컸다.', '먼 곳에서 새 포성이 울렸다.',
    '그는 무릎을 꿇은 채 숨을 골랐다.', '전장은 천천히 식어 갔다.', '갈 길은 아직 멀었다.',
    '살아남았다는 사실만이 분명했다.', '굳은살 박인 손이 무기를 놓지 않았다.',
    '먼 능선 위로 까마귀가 솟구쳤다.', '그 자리에 다시 정적이 고였다.',
  ],
} as const

type SlotKey = keyof typeof SLOTS
// 합성 결과(문법역할별 골라진 항목)
type Scene = Record<SlotKey, string>

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const makeScene = (): Scene => ({
  place: pick(SLOTS.place),
  situation: pick(SLOTS.situation),
  subject: pick(SLOTS.subject),
  manner: pick(SLOTS.manner),
  target: pick(SLOTS.target),
  instrument: pick(SLOTS.instrument),
  action: pick(SLOTS.action),
  closing: pick(SLOTS.closing),
})

// 슬롯을 문법(조사 자동)에 맞춰 한 문장으로 합성
const sceneToSentence = (s: Scene): string =>
  `${s.place}에서, ${s.situation} ${josaEun(s.subject)} ${s.manner} ` +
  `${josaEul(s.target)} ${josaEuro(s.instrument)} ${s.action}, ${s.closing}`

// 문장 합성 조합수 = 각 슬롯 풀 크기의 곱(고유 항목만)
const SCENE_COMBOS = (Object.keys(SLOTS) as SlotKey[]).reduce((p, k) => p * SLOTS[k].length, 1)

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 항목을 한 덩이 텍스트로(복사·스니펫·프로젝트 공통)
const termText = (f: Flat): string => {
  const head = `${f.cat.icon} [${f.cat.label}] ${f.item.word}${f.item.read ? ` (${f.item.read})` : ''}`
  const lines = [head, f.item.gloss]
  if (f.item.use) lines.push(`예) ${f.item.use}`)
  return lines.join('\n')
}

export default function ActionLexicon({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 도구가 장르를 넘겨주면 안내에 반영(이 도구는 액션·전쟁 전용).
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
  // 전투 한 문장 합성기(문법역할별 독립 슬롯의 곱집합으로 한 문장을 무작위 합성)
  const [scene, setScene] = useState<Scene | null>(null)
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

  // 조합수: '전투 한 문장 합성기'가 만드는 문장의 가짓수.
  //  = 문법역할별 독립 슬롯(장소·상황·주체·부사·대상·무기·동작·여파) 풀 크기의 곱.
  //  한 결과를 만들 때 실제로 곱해지는 슬롯 풀 크기의 곱과 정확히 일치한다(고유 항목만).
  const comboCount = SCENE_COMBOS
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

  // 전투 한 문장 합성기: 문법역할별 독립 슬롯에서 각 1개씩 뽑아 조사를 자동 선택해 한 문장으로.
  const rollScene = useCallback(() => {
    setScene((prev) => {
      let next = makeScene()
      // 직전과 완전히 동일한 조합이면 한 번 더(미세한 중복 방지)
      if (prev && sceneToSentence(next) === sceneToSentence(prev)) next = makeScene()
      return next
    })
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
      source: '액션·전쟁 어휘·표현 사전',
      tags: ['액션·전쟁', '어휘', f.cat.label, f.item.word],
    })
    flash(`‘${f.item.word}’${hasJong(f.item.word) ? '을' : '를'} 스니펫으로 저장했습니다.`)
  }

  // 합성 문장을 한 스니펫으로 저장
  const saveScene = () => {
    if (!scene) return
    addToLibrary('snippets', { text: sceneToSentence(scene), source: '액션·전쟁 어휘·표현 사전 · 전투 문장 합성기', tags: ['액션·전쟁', '전투 문장'] })
    flash('합성 문장을 스니펫으로 저장했습니다.')
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
      title: `${f.item.word} (액션·전쟁 어휘)`,
      bodyHtml,
      meta: { 장르: '액션·전쟁', 분류: f.cat.label },
    })
    if (id) flash(`프로젝트 자료 〈설정/어휘〉에 ‘${f.item.word}’${hasJong(f.item.word) ? '을' : '를'} 추가했습니다.`)
  }

  // 합성 문장을 한 문서로 프로젝트에 추가
  const sceneToProject = () => {
    if (!scene || !hasProjectBridge()) return
    const body = `<p>${escapeHtml(sceneToSentence(scene))}</p>`
    const id = addToProject({
      kind: 'text', root: 'research', folder: '설정/어휘',
      title: '전투 장면 합성 문장',
      bodyHtml: body, meta: { 장르: '액션·전쟁', 분류: '전투 문장' },
    })
    if (id) flash('합성 문장을 프로젝트 〈설정/어휘〉에 추가했습니다.')
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
      title: `액션·전쟁 어휘집 — ${where}${query ? ` · ‘${query}’` : ''} (${filtered.length}개)`,
      bodyHtml: body, meta: { 장르: '액션·전쟁', 분류: where },
    })
    if (id) flash(`현재 목록 ${filtered.length}개를 프로젝트 〈설정/어휘〉에 추가했습니다.`)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>액션·전쟁</b> 장르 특유의 어휘·관용구·말투·상투구·전문용어 <b>{total}개</b>를 10개 분류로 모았습니다.
        검색·무작위로 찾아 클릭 복사하고, 마음에 들면 스니펫·프로젝트에 담으세요.
        {incomingGenre && incomingGenre !== '액션·전쟁' && (
          <span style={{ color: 'var(--accent)' }}> (요청 장르 ‘{incomingGenre}’ — 이 사전은 액션·전쟁 전용입니다.)</span>
        )}
        <br /><Emoji e="🎰"/> 전투 한 문장 합성기는 문법역할별 슬롯(장소·상황·주체·부사·대상·무기·동작·여파)의 곱집합으로 <b>{comboText}</b> ({comboCount.toLocaleString()})의 서로 다른 문장을 만들 수 있습니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="단어·뜻·예문으로 검색 (예: 반동, 측면 우회, 내공, 각성, 마지막 한 발)"
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
        <button className="minibtn" onClick={rollScene} title="문법역할별 슬롯(장소·상황·주체·부사·대상·무기·동작·여파)에서 한 항목씩 뽑아 조사를 자동으로 맞춰 한 문장으로 합성"><Emoji e="🎰"/> 전투 문장 합성</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 전투 문장 합성 결과 */}
      {scene && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="🎰"/> 전투 한 문장 합성</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={rollScene} title="다시 합성"><Emoji e="🔄"/> 다시</button>
            <button className="minibtn" onClick={() => setScene(null)}>✕</button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, cursor: 'pointer' }}
            title="클릭하면 문장을 복사합니다"
            onClick={() => copy(sceneToSentence(scene), 'scene')}>
            {sceneToSentence(scene)}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(sceneToSentence(scene), 'scene-c')}>
              {copiedKey === 'scene-c' || copiedKey === 'scene' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 문장 복사</>}
            </button>
            <button className="minibtn" onClick={saveScene}><Emoji e="💾"/> 스니펫</button>
            <button className="linkbtn" onClick={sceneToProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '합성 문장을 프로젝트 자료 〈설정/어휘〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}>
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
            <button className="minibtn" onClick={() => copy(termText(random), 'rand')}>{copiedKey === 'rand' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={() => copy(random.item.word, 'rand-w')}>{copiedKey === 'rand-w' ? <>✓ 복사됨</> : <><Emoji e="🔤"/> 단어만</>}</button>
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
                    {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
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
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: '액션·전쟁' })}
          title="장르 관습 체크리스트 열기"><Emoji e="📐"/> 장르 관습</button>
        <button className="linkbtn" onClick={() => openToolLinked('sensory-palette', { genre: '액션·전쟁' })}
          title="감각 팔레트 열기"><Emoji e="🌈"/> 감각 팔레트</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-forge', { genre: '액션·전쟁' })}
          title="장면 단조기 열기"><Emoji e="🎬"/> 장면 단조기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>
          어휘는 정답이 아니라 출발점입니다. 클리셰는 그대로 쓰거나, 비틀어 보세요.
        </span>
      </div>
    </div>
  )
}
