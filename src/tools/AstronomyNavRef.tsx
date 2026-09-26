// 천문·항해·방위 사전 — 별자리·천체 현상·항해술·방위·시간 측정·역법을 모은 로컬 레퍼런스.
// 항해/판타지/SF 묘사용. 자급식: 외부 네트워크·라이브러리·미디어 없음. react 와 './linkbus' 만 import.
// 모든 데이터는 자작 요약(백과 복사 없음). localStorage 'sry:tool:astronomy-nav-ref:*' 에 즐겨찾기·뷰 영속.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { addToStash, hasStash, addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = {
  id: 'astronomy-nav-ref',
  name: '천문·항해·방위 사전',
  icon: '🧭',
  group: '리서치·자료',
  intro: '별자리·천체 현상·항해술·방위·시간 측정·역법을 한데 모아 항해/판타지/SF 장면을 정확하고 풍부하게',
  w: 660,
  h: 600,
}

interface Entry { name: string; alias?: string; desc: string; use?: string }
interface CatDef { key: string; label: string; icon: string; blurb: string; items: Entry[] }

// ───────────────────────── 자작 데이터 (카테고리 6 / 수백 항목) ─────────────────────────
const CATS: CatDef[] = [
  {
    key: 'constellation', label: '별자리·항성', icon: '✨',
    blurb: '하늘에서 길을 찾고 계절을 읽는 별과 별자리. 자릿값은 묘사용 어림이며, 항해에 쓰인 쓰임을 함께 적었습니다.',
    items: [
      { name: '북극성', alias: '폴라리스 / 작은곰자리 α', desc: '천구 북극에 거의 붙어 있어 밤새 제자리를 지키는 듯 보이는 2등성. 자릿값은 위도에 따라 지평선 위 고도가 곧 관측자의 북위와 거의 같다.', use: '북반구에서 진북(眞北)을 즉시 가리키는 기준별. 고도를 재면 위도를 안다.' },
      { name: '북두칠성', alias: '큰곰자리의 국자', desc: '국자 모양 일곱 별. 국자 끝의 두 별(지극성)을 이으면 그 연장선이 북극성으로 향한다.', use: '북극성을 못 찾을 때 길잡이. 계절·밤시간에 따라 도는 방향으로 시각도 가늠.' },
      { name: '카시오페이아', alias: 'W자리', desc: '하늘에 누운 W(또는 M)자. 북극성을 사이에 두고 북두칠성과 반대편에 자리해, 한쪽이 지평선에 가려도 다른 쪽으로 북을 찾는다.', use: '북두칠성이 낮게 깔린 계절·위도에서 북극성 보조 길잡이.' },
      { name: '오리온', alias: '사냥꾼자리', desc: '세 별이 비스듬히 늘어선 허리띠(삼태성)와 어깨·발의 밝은 별로 이루어진 겨울철 대표 별자리. 적도 부근에 걸쳐 거의 동에서 떠 서로 진다.', use: '허리띠의 연장선이 대략 동–서. 적도 양쪽 어디서나 보여 저위도 항해의 기준.' },
      { name: '베텔게우스', alias: '오리온 α', desc: '오리온의 어깨에 붉게 타는 적색초거성. 변광으로 밝기가 흔들린다.', use: '겨울철 삼각형의 한 꼭짓점. 붉은 빛으로 다른 흰 별과 구별.' },
      { name: '리겔', alias: '오리온 β', desc: '오리온의 발에 푸르게 빛나는 청백색 초거성. 베텔게우스와 대각으로 마주한다.', use: '오리온의 아래쪽 기준점. 매우 밝아 흐린 날에도 비교적 잘 보인다.' },
      { name: '시리우스', alias: '큰개자리 α / 천랑성', desc: '밤하늘에서 가장 밝은 항성. 오리온 허리띠를 남동으로 이으면 닿는다.', use: '고대에는 이 별의 새벽 출현(여명 직전 첫 등장)이 나일강 범람·여름의 신호였다.' },
      { name: '카노푸스', alias: '용골자리 α / 노인성', desc: '시리우스 다음으로 밝은 남쪽 하늘의 별. 북반구 중위도 이북에서는 거의 보이지 않는다.', use: '남반구·저위도 항해의 강력한 기준별. 우주선 자세제어의 기준성으로도 쓰인다.' },
      { name: '남십자성', alias: '남십자자리', desc: '남반구 하늘의 작은 십자. 긴 세로축을 약 4.5배 늘리면 남천극(별이 없는 빈 점)에 닿는다.', use: '남반구의 진남(眞南) 길잡이. 북반구의 북극성에 대응하는 역할.' },
      { name: '아르크투루스', alias: '목동자리 α / 대각성', desc: '북두칠성 국자 자루의 곡선을 따라 내려가면 만나는 주황색 거성. 봄철 대표 별.', use: '“국자 자루를 따라 아르크투루스로” 별 짚기. 계절 가늠.' },
      { name: '스피카', alias: '처녀자리 α', desc: '아르크투루스에서 같은 곡선을 더 이으면 닿는 청백색 별. 봄철 길잡이의 종점.', use: '“곡선 따라 스피카로 직진” 별 짚기 마무리.' },
      { name: '베가', alias: '거문고자리 α / 직녀성', desc: '여름철 머리 위에서 푸르게 빛나는 0등성. 약 1만 2천 년 뒤에는 이 별이 북극성을 대신한다(세차운동).', use: '여름철 대삼각형의 한 꼭짓점. 천정 부근 기준.' },
      { name: '알타이르', alias: '독수리자리 α / 견우성', desc: '베가와 은하수를 사이에 두고 마주한 흰 별. 양옆의 작은 두 별을 거느린다.', use: '여름철 대삼각형의 한 꼭짓점.' },
      { name: '데네브', alias: '백조자리 α', desc: '백조의 꼬리에 자리한 매우 먼 초거성. 멀어도 밝다.', use: '여름철 대삼각형의 세 번째 꼭짓점. 은하수 한가운데 길잡이.' },
      { name: '알데바란', alias: '황소자리 α', desc: '황소의 붉은 눈. 오리온 허리띠를 북서로 이으면 닿는 V자(히아데스) 끝의 주황색 별.', use: '겨울철 별 짚기 중간 기준.' },
      { name: '플레이아데스', alias: '좀생이별 / 묘성', desc: '여섯~일곱 별이 옹기종기 뭉친 산개성단. 맑은 가을·겨울 밤 맨눈에 흐릿한 무리로 보인다.', use: '농경 절기의 표지. 출현·남중 시기로 파종·수확을 가늠.' },
      { name: '폴룩스·카스토르', alias: '쌍둥이자리 α·β', desc: '나란히 빛나는 두 밝은 별. 형제처럼 붙어 떠오른다.', use: '겨울 동쪽 하늘의 짝별 기준.' },
      { name: '레굴루스', alias: '사자자리 α', desc: '사자의 심장. 황도(태양의 길) 가까이 있어 달·행성이 자주 곁을 지난다.', use: '봄철 황도 위 행성 위치 가늠.' },
      { name: '안타레스', alias: '전갈자리 α', desc: '전갈의 심장에 붉게 타는 초거성. “화성의 적수(火星의 라이벌)”라는 뜻의 이름.', use: '여름 남쪽 낮은 하늘의 붉은 기준. 화성과 색·자리를 혼동하기 쉽다.' },
      { name: '포말하우트', alias: '남쪽물고기자리 α', desc: '가을 남쪽 하늘에 외따로 빛나 “외로운 별”이라 불린다.', use: '주변에 밝은 별이 없어 가을 남천의 단독 기준.' },
      { name: '카펠라', alias: '마차부자리 α', desc: '북쪽 높이 노랗게 빛나는 겨울 별. 북위 중위도에서는 거의 지지 않는다(주극성).', use: '겨울 천정 부근 길잡이.' },
      { name: '프로키온', alias: '작은개자리 α', desc: '시리우스·베텔게우스와 더불어 “겨울 대삼각형”을 이루는 흰 별.', use: '겨울 대삼각형으로 동쪽 하늘 정렬.' },
      { name: '은하수', alias: '미리내', desc: '하늘을 가로지르는 희뿌연 별의 띠. 우리 은하를 안에서 옆으로 본 단면. 여름엔 궁수자리 쪽이 가장 짙다.', use: '도시 빛이 없는 항해·야영에서 방위·계절 가늠의 큰 표지.' },
      { name: '황도 12궁', alias: '조디악', desc: '태양이 1년 동안 지나는 길(황도) 위에 늘어선 12개의 별자리 띠. 달·행성도 이 띠 안팎을 오간다.', use: '행성과 달의 대략적 위치를 짚고 계절을 읽는 좌표 띠.' },
      { name: '주극성', alias: '지지 않는 별', desc: '관측자의 위도에서 천극에 충분히 가까워 1년 내내 지평선 아래로 지지 않고 천극을 도는 별.', use: '밤새 보이므로 어느 시각에 보든 방위 기준으로 삼기 좋다.' },
    ],
  },
  {
    key: 'phenomenon', label: '천체 현상', icon: '🌗',
    blurb: '하늘에서 일어나는 사건들. 시각·계절·방위의 단서이자 극적 묘사의 재료입니다.',
    items: [
      { name: '일출·일몰', desc: '태양이 동쪽 지평선을 넘고 서쪽으로 지는 순간. 정확한 방위각은 계절에 따라 진동한다(하지엔 가장 북동/북서, 동지엔 가장 남동/남서).', use: '대략의 동–서를 얻고, 막대기 그림자로 방위·시각을 가늠.' },
      { name: '박명', alias: '여명·황혼', desc: '해가 지평선 아래 있으나 하늘이 밝은 시간. 시민(−6°)·항해(−12°)·천문(−18°) 박명으로 나뉜다.', use: '항해 박명에는 수평선과 별이 함께 보여 천측(별 고도 측정)의 황금 시간.' },
      { name: '남중', alias: '자오선 통과', desc: '천체가 정남(또는 정북)을 지나며 그날 가장 높이 뜨는 순간. 태양의 남중이 곧 그 지점의 정오(태양시).', use: '태양 남중 고도로 위도를, 남중 시각으로 경도(시간 기준)를 가늠.' },
      { name: '월상', alias: '달의 차고 기울기', desc: '삭(보이지 않음)→초승→상현→보름→하현→그믐으로 약 29.5일 주기로 변하는 달의 모습. 차오를 땐 오른쪽(북반구)이 밝다.', use: '날짜·밤시간의 가늠표. 보름 전후엔 야간 항해의 빛, 삭 무렵엔 별이 가장 잘 보인다.' },
      { name: '조석', alias: '밀물·썰물', desc: '달과 태양의 인력이 만드는 바닷물의 오르내림. 하루 약 두 번. 보름·삭 때 차이가 큰 사리, 상현·하현 때 작은 조금.', use: '입출항·여울 통과·갯벌 횡단 시각 결정. 달의 위치로 만조 시각을 어림.' },
      { name: '일식', alias: '해 가림', desc: '달이 태양을 가리는 현상. 좁은 띠에서만 개기, 넓은 곳에서 부분. 한낮이 어둑해지고 코로나가 드러난다.', use: '드물고 극적인 사건. 옛 사회에선 전조·공포의 표지로 쓰였다.' },
      { name: '월식', alias: '달 가림', desc: '지구 그림자에 달이 드는 현상. 보름에만 일어나며 개기일 땐 붉은 “블러드문”이 된다.', use: '밤 내내 넓은 지역에서 동시에 보여 시간·날짜의 공통 표지로 삼기 좋다.' },
      { name: '유성·유성우', alias: '별똥별', desc: '대기에 타들어 가는 티끌. 특정 시기 한 점(복사점)에서 쏟아지는 것이 유성우(페르세우스·쌍둥이 등).', use: '계절 표지이자 분위기 묘사. 항해엔 쓰임이 적으나 야간 경계의 정취.' },
      { name: '오로라', alias: '극광', desc: '태양풍 입자가 고위도 상공 대기를 들뜨게 해 빛나는 커튼. 초록·붉은빛이 흔들린다.', use: '고위도임을 알리는 표지. 자기폭풍 때는 나침반이 교란될 수 있다.' },
      { name: '행성의 역행', desc: '행성이 며칠~몇 달간 별들 사이에서 거꾸로 도는 듯 보이는 현상. 지구와의 추월·피추월에서 생기는 착시.', use: '“방황하는 별(행성)”을 항성과 구별하는 단서. 점성·전조 서사의 소재.' },
      { name: '내합·외합·충', desc: '행성이 태양과 한 줄에 서거나(합), 태양 반대편에 오는(충) 배치. 충일 때 가장 밝고 밤새 보인다.', use: '금성·목성·화성 관측 시기 가늠. 화성은 충 무렵 붉고 크게 빛난다.' },
      { name: '샛별·개밥바라기', alias: '금성', desc: '새벽 동쪽(샛별)이나 초저녁 서쪽(개밥바라기)에 가장 밝게 빛나는 행성. 결코 한밤중엔 보이지 않는다.', use: '여명·황혼의 방위 표지. 너무 밝아 별로 착각하기 쉽다.' },
      { name: '대기굴절', alias: '몽기차', desc: '대기가 빛을 휘어 천체를 실제보다 높이 들어 올려 보이게 하는 현상. 지평선 근처에서 가장 크다.', use: '천측 고도 보정의 핵심 오차. 일출·일몰이 실제보다 빠르거나 늦게 보인다.' },
      { name: '신기루', alias: '미라지', desc: '온도차로 휘어진 빛이 먼 사물·수평선을 떠올리거나 뒤집어 보이게 하는 착시. 사막·극지 바다에서 흔하다.', use: '없는 섬·뒤집힌 배가 보이는 환상. 묘사·서스펜스의 재료.' },
      { name: '황도광', desc: '해 뜨기 전 동쪽, 진 뒤 서쪽 지평선에서 비스듬히 솟는 희미한 빛기둥. 행성간 티끌이 햇빛을 반사한 것.', use: '아주 어두운 하늘에서만 보이는 극청정 환경의 표지.' },
      { name: '세차운동', desc: '지구 자전축이 약 2만 6천 년 주기로 팽이처럼 도는 흔들림. 북극성이 시대에 따라 바뀌고 별자리 위치가 서서히 어긋난다.', use: '먼 과거·미래나 다른 행성 배경에서 “하늘이 다르다”를 정당화하는 장치.' },
      { name: '코로나·달무리', alias: '햇무리·달무리', desc: '얇은 구름의 얼음 결정이 빛을 꺾어 해·달 둘레에 생기는 고리. 날씨 변화의 전조로 여겨졌다.', use: '“무리가 지면 비가 온다”—항해 일기예보의 민간 단서.' },
    ],
  },
  {
    key: 'navigation', label: '항해술·길찾기', icon: '⛵',
    blurb: '계기·자연 단서로 바다와 황야에서 위치를 잡는 기술. 도구가 없을수록 하늘·바다·새를 읽었습니다.',
    items: [
      { name: '천측항법', alias: '천문항법', desc: '별·해·달의 고도와 시각을 재어 위치를 구하는 항법. 육지가 안 보이는 대양에서 GPS 이전의 표준이었다.', use: '6분의·정밀시계·천측력으로 위치선을 그어 교점을 위치로 삼는다.' },
      { name: '6분의', alias: '섹스턴트', desc: '거울 두 장으로 천체와 수평선을 한 시야에 겹쳐 둘 사이 각도를 정밀히 재는 휴대 계기. 호의 6분의 1(60°)을 잰다.', use: '별·해의 고도 측정의 핵심 도구. 흔들리는 갑판에서도 쓸 수 있게 설계.' },
      { name: '아스트롤라베', desc: '회전판과 눈금으로 별·해의 고도를 재고 시간·방위를 읽던 옛 황동 계기. 6분의 이전 시대의 천체 컴퓨터.', use: '중세 항해·천문·점성·기도시각 계산까지 두루 쓰인 다목적 계기.' },
      { name: '카말', desc: '끈에 매단 작은 나무판. 끈을 이로 물고 판의 아래를 수평선, 위를 북극성에 맞춰 위도를 재던 아랍 항해사의 도구.', use: '매듭 위치로 특정 항구의 위도를 표시—“집에 가는 줄”처럼 위도 항법에 쓰였다.' },
      { name: '위도 항법', desc: '목표 항구의 위도까지 남북으로 이동한 뒤 그 위도선을 동서로 따라 달려 도착하는 단순·확실한 항법.', use: '경도 측정이 어렵던 시절의 주력. 별·해 고도로 위도만 맞추면 길을 잃지 않았다.' },
      { name: '추측항법', alias: '데드레커닝', desc: '마지막으로 확인한 위치에서 침로(방향)·속력·시간으로 현재 위치를 추정하는 항법. 관측이 막힐 때의 생명줄.', use: '안개·구름으로 별을 못 볼 때. 오차가 누적되니 관측으로 자주 보정.' },
      { name: '측정삭', alias: '체정삭·로그라인', desc: '일정 간격으로 매듭을 묶고 끝에 부채꼴 판을 단 줄. 모래시계 시간 동안 풀려나간 매듭 수로 속력을 잰다.', use: '“노트(knot)”라는 속력 단위의 어원. 1노트 ≈ 시속 1해리.' },
      { name: '측심연', alias: '레드라인·수심줄', desc: '추를 매단 줄로 수심을 재는 도구. 추 밑의 우묵한 곳에 기름·수지를 발라 바닥 흙(모래·진흙)도 묻혀 올린다.', use: '연안·여울에서 좌초를 피하고, 바닥 성질로 위치를 가늠.' },
      { name: '나침반', alias: '컴퍼스', desc: '자침이 지구 자기를 따라 자북을 가리키는 계기. 흐린 날에도 방향을 주는 혁명적 도구였다.', use: '천체가 안 보일 때의 기본 방위. 편차·자차 보정이 필요.' },
      { name: '편차', alias: '자기편차', desc: '진북과 자북의 어긋난 각도. 지역·연도마다 달라 해도에 표기된다.', use: '나침반 방위를 진방위로 고치는 필수 보정. “동편차는 빼고 서편차는 더한다” 식 규칙.' },
      { name: '자차', alias: '디비에이션', desc: '배 자체의 쇠붙이가 자침을 끌어 생기는 편향. 배의 침로에 따라 달라진다.', use: '나침반 옆 보정 자석·표로 잡는다. 정확한 침로 유지에 필수.' },
      { name: '연안 항법', alias: '파일러티지', desc: '등대·곶·산봉우리 같은 육지 표지의 방위·겹침(트랜싯)을 보고 좁은 수로를 통과하는 기술.', use: '두 표지가 일직선에 겹치는 선(트랜싯)을 따라가면 안전 수로 유지.' },
      { name: '스타파스', alias: '항성나침반', desc: '뜨고 지는 별의 방위점을 외워 만든 머릿속 나침반. 미크로네시아·폴리네시아 항해사가 썼다.', use: '계기 없이 별의 출몰 지점으로 침로를 잡는 구전 항법.' },
      { name: '너울 읽기', alias: '스웰 내비게이션', desc: '먼 폭풍이 보낸 큰 너울의 방향과 섬에 부딪혀 되돌아온 물결의 간섭을 몸으로 느껴 섬을 찾는 기술.', use: '폴리네시아 항해의 정수. 카누 바닥의 흔들림으로 보이지 않는 섬을 읽는다.' },
      { name: '새·구름 단서', desc: '육지로 돌아가는 바닷새의 비행 방향, 섬 위에 머무는 적운, 초록빛 반사가 비친 구름 밑면으로 가까운 섬을 추정.', use: '육지가 수평선 아래 있어도 그 존재와 방향을 알리는 자연 신호.' },
      { name: '태양석', alias: '선스톤', desc: '편광을 보는 결정(방해석 등)으로 흐린 날에도 태양의 위치를 짚었다는 바이킹의 전설적 도구.', use: '구름·안개 속에서 해의 방향을 가늠—판타지·역사물의 매력적 소재.' },
      { name: '경도 문제', desc: '바다에서 경도를 정확히 알기 어려웠던 오랜 난제. 해법은 정확한 시계(크로노미터)로 출항지 시각을 지니고 다니는 것이었다.', use: '현지 정오와 기준지 시각의 차 ×15° = 경도. 시계 1분 오차 ≈ 적도에서 약 28km.' },
      { name: '크로노미터', alias: '해상시계', desc: '흔들림·온도에도 정확히 가는 항해용 정밀 시계. 출항 기준지(예: 그리니치)의 시각을 항상 유지한다.', use: '경도 측정의 결정적 도구. 천측 결과와 결합해 위치를 확정.' },
      { name: '방위선·위치선', alias: 'LOP', desc: '표지의 방위나 천체 관측 한 번으로 얻는 “나는 이 선 위에 있다”는 선. 두 선이 만나면 위치.', use: '연안에선 두 표지의 방위 교차, 대양에선 두 천체의 위치선 교차로 위치 확정.' },
      { name: '항정선', alias: '럼라인', desc: '나침반 방위를 일정하게 유지하며 가는 항로. 모든 자오선을 같은 각으로 가르는 나선이라 최단거리는 아니다.', use: '메르카토르 해도에서 직선으로 그려져 조타가 쉽다. 단거리·중거리에 실용적.' },
      { name: '대권항로', alias: '그레이트서클', desc: '구면에서 두 지점을 잇는 최단 경로. 지도에선 곡선처럼 보이고 방위가 계속 변한다.', use: '대양 횡단의 거리 절약. 보통 여러 항정선으로 나눠 따라간다.' },
    ],
  },
  {
    key: 'bearing', label: '방위·좌표', icon: '🧭',
    blurb: '방향과 위치를 가리키는 말과 체계. 정확히 쓰면 항해·SF 묘사의 신뢰도가 올라갑니다.',
    items: [
      { name: '진북', alias: '참북', desc: '지구 자전축이 가리키는 북, 곧 지리상의 북극 방향. 별(북극성)이 가리키는 북.', use: '모든 정밀 방위의 기준. 나침반 자북에서 편차를 보정해 얻는다.' },
      { name: '자북', desc: '나침반 자침이 가리키는 북. 자기극은 진북극과 떨어져 있고 천천히 이동한다.', use: '실측 방위. 진방위로 쓰려면 편차 보정이 필요.' },
      { name: '도북', alias: '격자북', desc: '지도 격자의 세로선이 가리키는 북. 투영 때문에 진북과 미세히 어긋난다.', use: '지도 위 방위 측정의 기준. 군용 도엽에 진북·자북과 함께 표기.' },
      { name: '방위각', alias: '베어링·애지머스', desc: '북을 0°로 시계방향으로 360°까지 재는 수평 각도. 동 90°, 남 180°, 서 270°.', use: '“방위 045”처럼 세 자리로 읽어 혼동을 막는다.' },
      { name: '고도', alias: '앙각·앨티튜드', desc: '지평선을 0°, 천정을 90°로 한 천체의 수직 각도.', use: '천측의 핵심값. 태양·별의 고도로 위도를 구한다.' },
      { name: '천정·천저', desc: '관측자 바로 머리 위 점(천정)과 정반대 발밑 점(천저).', use: '고도 90°가 천정. 천체가 천정을 지나면 그 별의 적위 = 관측자 위도.' },
      { name: '32방위', alias: '컴퍼스 로즈', desc: '북·북북동·북동…처럼 원을 32칸으로 나눈 옛 방위 체계. 항해사가 “박스 더 컴퍼스”로 외웠다.', use: '바람·조류 방향을 운치 있게 부를 때. 현대엔 360° 각도로 대체.' },
      { name: '4분원·8방위', desc: '동서남북(4방)과 그 사이(북동·남동·남서·북서)를 더한 8방위. 가장 기본적인 방향 어휘.', use: '대략의 방향 지시. “북서풍” 같은 일상·서술용.' },
      { name: '위도', alias: '씨도', desc: '적도를 0°, 극을 90°로 한 남북 위치. 북위·남위로 구분.', use: '천체 고도로 비교적 쉽게 측정. 위도만 알아도 항법이 크게 단순해진다.' },
      { name: '경도', alias: '경선의 값', desc: '본초자오선을 0°로 동서로 ±180°까지 잰 위치. 시간(시각차)과 직결된다.', use: '정확한 시계 없이는 측정이 어려웠던 값. 시각차 1시간 = 15°.' },
      { name: '적위·적경', desc: '천구의 위도·경도. 별의 “하늘 주소”. 적위는 천구 적도 기준 남북, 적경은 시간 단위(시·분·초)로 잰다.', use: '별의 위치를 항성목록·천측력에서 찾을 때의 좌표.' },
      { name: '시간각', alias: '아워앵글', desc: '관측자의 자오선에서 천체까지 서쪽으로 잰 각. 시간 단위로도 읽는다.', use: '경도 계산의 연결고리. 그리니치 시간각과 관측 시각으로 위치선을 얻는다.' },
      { name: '침로·헤딩·코스', desc: '뱃머리가 향한 방향(헤딩), 실제로 가려는 방향(코스), 바람·조류에 밀린 실제 경로의 차이를 구분.', use: '“코스 090, 헤딩 095”—편류를 미리 더해 키를 잡는다.' },
      { name: '편류·리웨이', desc: '바람·조류가 배를 옆으로 밀어 실제 항로가 침로와 어긋나는 정도.', use: '추측항법에서 반드시 더하는 보정. 무시하면 위치 추정이 크게 빗나간다.' },
      { name: '상대방위', alias: '렐러티브 베어링', desc: '뱃머리를 0°로 시계방향으로 잰 방위. “우현 정횡(090)”, “좌현 전방(315)”처럼 쓴다.', use: '배 안에서 목표·다른 배의 위치를 빠르게 알릴 때.' },
      { name: '정횡·선수·선미', alias: '빔·바우·스턴', desc: '배의 옆 직각 방향(정횡), 앞(선수), 뒤(선미). 좌현(포트)·우현(스타보드)과 조합해 위치를 말한다.', use: '“우현 정횡에 등대” 같은 항해 보고의 기본 어휘.' },
      { name: '나침점·로즈', desc: '해도에 그려진 방위 눈금 원. 진방위와 자방위 두 겹의 눈금으로 그려진다.', use: '평행자로 표지 방위를 옮겨 침로를 작도.' },
      { name: '극좌표·방위거리', desc: '“방위와 거리”로 위치를 말하는 방식(예: 등대에서 방위 270, 3해리).', use: '레이더·연안 보고에서 흔한 위치 표현.' },
    ],
  },
  {
    key: 'time', label: '시간 측정', icon: '⏳',
    blurb: '하늘과 기계로 시간을 재는 법. 항해의 경도, 일상의 절기가 모두 시간 측정에서 갈렸습니다.',
    items: [
      { name: '해시계', alias: '앙부일구·노몬', desc: '막대(노몬)의 그림자 방향·길이로 태양시를 읽는 장치. 그림자 끝이 가장 짧을 때가 정오(남중).', use: '맑은 낮의 시각. 위도에 맞춰 노몬 각도를 세워야 정확.' },
      { name: '물시계', alias: '클렙시드라·자격루', desc: '일정하게 흐르는 물의 양으로 시간을 재는 장치. 밤·흐린 날에도 작동.', use: '해시계의 약점(밤·구름)을 메운 옛 시계. 자동 타종 장치로도 발전.' },
      { name: '모래시계', alias: '아워글래스', desc: '잘록한 병으로 모래가 일정 시간 흘러내리게 한 시계. 흔들리는 배 위에서도 안정적.', use: '항해 당직 시간·측정삭 속력 측정의 짝. 다 떨어지면 종을 쳐 “선종”을 알렸다.' },
      { name: '선종', alias: '쉽스 벨', desc: '4시간 당직을 30분 단위 종소리로 나눠 알리는 방식(반 시간마다 한 번씩 늘려 여덟 번까지).', use: '시계 없는 선원들에게 시각·교대 시점을 알리는 청각 신호.' },
      { name: '태양시', alias: '진태양시·평균태양시', desc: '태양의 남중을 기준한 시각. 지구 궤도·기울기 탓에 진태양시는 들쭉날쭉해, 이를 고른 것이 평균태양시.', use: '해시계는 진태양시, 시계는 평균태양시를 가리켜 둘은 매일 조금씩 어긋난다.' },
      { name: '균시차', alias: '이퀘이션 오브 타임', desc: '진태양시와 평균태양시의 차이. 1년에 ±약 16분 범위로 진동하며 “8자(아날렘마)” 곡선을 그린다.', use: '해시계 시각을 시계 시각으로 고치는 보정. 천측 시각 보정에도 필수.' },
      { name: '항성시', alias: '시데리얼 타임', desc: '별을 기준한 시각. 같은 별이 같은 자오선에 오는 주기로, 태양시보다 하루에 약 4분 짧다.', use: '망원경으로 특정 별을 겨눌 때, 천측에서 별의 시간각을 구할 때 쓴다.' },
      { name: '시간대·표준시', alias: '타임존', desc: '경도 15°마다 1시간씩 나눈 구역의 공통 시각. 각 나라가 기준 자오선을 정해 쓴다.', use: '항해 일지·천측력의 시각 기준. 협정세계시(UTC)로 통일해 계산.' },
      { name: '날짜변경선', desc: '대략 경도 180°를 따라 그어, 넘을 때 날짜를 하루 더하거나 빼는 선. 태평양을 지그재그로 지난다.', use: '동·서로 세계를 한 바퀴 돌 때 생기는 “하루 차이”를 정리하는 약속.' },
      { name: '율리우스일', alias: '연속일수', desc: '기원전 먼 시점부터 하루씩 끊지 않고 센 통일 일수. 달·연·역법 차이 없이 날짜를 빼고 더한다.', use: '천문 계산·관측 기록에서 두 사건 사이 일수를 쉽게 구하는 기준.' },
      { name: '시·분·초의 60진법', desc: '한 시간을 60분, 1분을 60초로 나누는 체계. 각도(도·분·초)도 같은 60진법을 쓴다.', use: '시간각·경도와 시각이 같은 단위를 공유해 서로 변환이 매끄럽다.' },
      { name: '낮시간·밤시간(부정시법)', desc: '해 뜸~해 짐을 똑같이 나눈 옛 시각법. 계절에 따라 한 “시간”의 길이가 달라진다.', use: '여름밤은 짧고 겨울밤은 긴 옛 사회의 생활 리듬. 시대물 묘사의 정취.' },
      { name: '천측력', alias: '항해력·알마낙', desc: '날짜·시각별 해·달·행성·항성의 위치를 미리 계산해 실은 표. 천측의 필수 자료.', use: '관측 시각의 천체 위치를 표에서 찾아 위치선을 그린다.' },
    ],
  },
  {
    key: 'calendar', label: '역법·절기', icon: '📅',
    blurb: '날과 달과 해를 세는 약속들. 다른 세계의 달력을 설계할 때 참고할 원리와 사례.',
    items: [
      { name: '태양력', alias: '솔라 캘린더', desc: '계절(태양의 한 바퀴, 약 365.2422일)에 맞춘 역법. 윤일로 어긋남을 메운다.', use: '농경·계절과 잘 맞는다. 다른 행성 배경이면 1년의 일수를 새로 정하면 된다.' },
      { name: '태음력', alias: '루나 캘린더', desc: '달의 차고 기욺(약 29.53일)을 한 달로 삼는 역법. 12달이면 약 354일로 계절과 차츰 어긋난다.', use: '달만 보면 날짜를 알 수 있다. 종교 절기에 흔히 쓰인다.' },
      { name: '태음태양력', alias: '음양력', desc: '달로 달을 세되, 윤달을 넣어 계절(태양)과도 맞춘 절충 역법. 동아시아 전통 달력이 이 방식.', use: '“19년에 7번 윤달(메톤 주기)” 같은 규칙으로 달과 계절을 함께 잡는다.' },
      { name: '윤년·윤일', desc: '태양년의 우수리(약 0.2422일)를 메우려 4년마다 하루를 더하고, 100·400년 규칙으로 미세 보정.', use: '“4로 나뉘면 윤년, 단 100의 배수는 평년, 400의 배수는 다시 윤년.”' },
      { name: '윤달', desc: '태음태양력에서 계절과 맞추려 한 해에 끼워 넣는 한 달. 그해는 13달이 된다.', use: '다른 세계 달력에 “긴 해/짧은 해”의 변주를 줄 수 있는 장치.' },
      { name: '24절기', desc: '태양의 황도상 위치를 15°마다 나눈 24개의 계절 표지(입춘·춘분·하지·동지 등). 음양력 안의 태양 요소.', use: '농사·날씨·생활 리듬의 정확한 표지. 동아시아 배경 묘사의 디테일.' },
      { name: '이분이지', alias: '춘분·추분·하지·동지', desc: '낮밤이 같은 두 분점(춘·추분)과 낮(하지)·밤(동지)이 가장 긴 두 지점. 한 해의 네 기둥.', use: '계절 전환의 극적 시점. 고대 기념물·축제가 이 날에 맞춰졌다.' },
      { name: '주(週)·요일', desc: '7일을 한 묶음으로 도는 주기. 해·달·다섯 행성(또는 신)에서 요일 이름이 왔다.', use: '천체와 무관히 끊임없이 도는 인공 주기. 다른 세계엔 5일·10일 주도 가능.' },
      { name: '메톤 주기', desc: '약 19태양년이 235삭망월과 거의 같다는 관계. 음양력 윤달 배치의 토대.', use: '“19년마다 달의 위상이 같은 날짜로 돌아온다”—세계관 달력 설계의 든든한 원리.' },
      { name: '사로스 주기', desc: '약 18년 11일마다 비슷한 일·월식이 되풀이되는 주기.', use: '식(蝕)을 예언하는 옛 사제·점성가의 비밀. 서사적 “예언” 장치로 좋다.' },
      { name: '기년법', alias: '연호·기원', desc: '연도를 세는 출발점(건국·즉위·종교적 사건 등)과 세는 방식. 같은 해도 문명마다 다른 숫자.', use: '“제국력 1204년”처럼 세계관에 깊이를 주는 장치.' },
      { name: '계절 표지별', desc: '특정 별의 새벽 첫 출현(헬리어컬 라이징)이나 남중으로 계절·농사철을 알던 방식.', use: '시리우스 = 나일 범람, 플레이아데스 = 파종처럼 별을 달력 삼은 고대의 지혜.' },
      { name: '날의 시작점', desc: '하루를 자정에서 시작할지, 일몰(유대·이슬람)·일출·정오(옛 천문)에서 시작할지의 약속.', use: '“해 지면 다음 날”인 세계는 밤 풍습·서사가 달라진다.' },
    ],
  },
]

const LS = 'sry:tool:astronomy-nav-ref:'
const ALL = '__all__'
const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Hit { cat: CatDef; item: Entry }
const flatAll = (): Hit[] => CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

export default function AstronomyNavRef({ payload: _payload }: { payload?: Record<string, unknown> }) {
  void _payload
  const [query, setQuery] = useState('')
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
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [random, setRandom] = useState<Hit | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 언마운트 정리용 타이머 보관
  const timers = useRef<number[]>([])
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }, [])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }, [])

  // 영속
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const favKey = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL ? flatAll() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[favKey(c.key, item.name)])
    if (q) {
      base = base.filter(({ item }) =>
        item.name.toLowerCase().includes(q) ||
        (item.alias || '').toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        (item.use || '').toLowerCase().includes(q))
    }
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL ? flatAll() : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
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
    setFavs((prev) => { const n = { ...prev }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }
  const toggleOpen = (k: string) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }))

  const plainText = (h: Hit) =>
    `${h.cat.icon} ${h.item.name}${h.item.alias ? ` (${h.item.alias})` : ''}\n${h.item.desc}` +
    (h.item.use ? `\n쓰임: ${h.item.use}` : '')

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      after(1500, () => setCopiedKey((c) => (c === id ? null : c)))
    }).catch(() => { /* graceful */ })
  }

  const flash = (msg: string) => {
    setToast(msg)
    after(2200, () => setToast((t) => (t === msg ? null : t)))
  }

  // ── 연계 동작 ──
  const stashIt = (h: Hit) => {
    if (!hasStash()) return
    addToStash({ kind: 'note', label: `${h.cat.icon} ${h.item.name}`, text: plainText(h) })
    flash(`수집함에 ‘${h.item.name}’을(를) 담았습니다.`)
  }
  const projectIt = (h: Hit) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(h.cat.icon + ' ' + h.cat.label)} · ${escapeHtml(h.item.name)}</b>${h.item.alias ? ` <i>${escapeHtml(h.item.alias)}</i>` : ''}</p>`,
      `<p>${escapeHtml(h.item.desc)}</p>`,
      h.item.use ? `<p><b>쓰임</b> ${escapeHtml(h.item.use)}</p>` : '',
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '천문·항해', title: `${h.item.name} (${h.cat.label})`, bodyHtml })
    if (id) flash(`프로젝트 자료 〈천문·항해〉에 ‘${h.item.name}’을(를) 추가했습니다.`)
  }
  const snippetIt = (h: Hit) => {
    addToLibrary('snippets', { text: plainText(h), source: '천문·항해·방위 사전', tags: [h.cat.label] })
    flash(`스니펫으로 ‘${h.item.name}’을(를) 저장했습니다.`)
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  const renderHit = (h: Hit, keyPrefix: string, forceOpen = false) => {
    const fk = favKey(h.cat.key, h.item.name)
    const isFav = !!favs[fk]
    const oKey = keyPrefix + fk
    const isOpen = forceOpen || !!open[oKey]
    const copyId = keyPrefix + ':' + fk
    return (
      <div key={oKey} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button
            className="minibtn"
            onClick={() => toggleOpen(oKey)}
            title={isOpen ? '접기' : '펼치기'}
            style={{ flexShrink: 0, padding: '2px 7px' }}
            aria-expanded={isOpen}
          >
            {isOpen ? '▾' : '▸'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={h.cat.icon} /> {h.cat.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={() => toggleOpen(oKey)}>{h.item.name}</span>
          {h.item.alias && <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>{h.item.alias}</span>}
          <button
            className="minibtn"
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
            onClick={() => toggleFav(h.cat.key, h.item.name)}
            style={{ marginLeft: 'auto', flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
        </div>
        {isOpen && (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{h.item.desc}</div>
            {h.item.use && (
              <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--muted)' }}>
                <b style={{ color: 'var(--accent)' }}>쓰임</b> {h.item.use}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copy(plainText(h), copyId)}>
                {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}
              </button>
              <button className="minibtn" onClick={() => stashIt(h)} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함이 연결되어 있지 않습니다'}><Emoji e="📎" /> 수집함</button>
              <button className="minibtn" onClick={() => snippetIt(h)} title="스니펫 라이브러리에 저장">✂ 스니펫</button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        별자리·천체 현상·항해술·방위·시간 측정·역법 등 <b>{total}개</b> 항목. 항해·판타지·SF 장면을 정확하고 풍부하게 묘사하세요. 항목을 눌러 펼치고, 별로 즐겨찾기, 복사·수집·스니펫으로 활용합니다.
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·다른이름·설명으로 검색 (예: 북극성, 위도, 윤달, 6분의)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          className="minibtn"
          onClick={() => setCat(ALL)}
          aria-pressed={cat === ALL}
          style={{ borderColor: cat === ALL ? 'var(--accent)' : 'var(--border)', color: cat === ALL ? 'var(--text)' : 'var(--muted)' }}
        ><Emoji e="🌌" /> 전체</button>
        {CATS.map((c) => {
          const on = cat === c.key
          return (
            <button
              key={c.key}
              className="minibtn"
              onClick={() => setCat(c.key)}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
            ><Emoji e={c.icon} /> {c.label}</button>
          )
        })}
      </div>

      {/* 카테고리 소개 */}
      {cat !== ALL && (
        <div style={{ ...hint, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
          {CATS.find((c) => c.key === cat)?.blurb}
        </div>
      )}

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲" /> 무작위</button>
        <button
          className="minibtn"
          onClick={() => setOnlyFav((v) => !v)}
          aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}
        >{onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
        <button className="minibtn" onClick={() => setOpen({})} title="모두 접기">▸ 모두 접기</button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {/* 무작위 결과 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon} /> {random.cat.label}</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{random.item.name}</span>
            {random.item.alias && <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{random.item.alias}</span>}
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 4px' }}>{random.item.desc}</div>
          {random.item.use && <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}><b style={{ color: 'var(--accent)' }}>쓰임</b> {random.item.use}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(plainText(random), 'rnd')}>{copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋" /> 복사</>}</button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>{favs[favKey(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}</button>
            <button className="minibtn" onClick={rollRandom}><Emoji e="🎲" /> 다시</button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--ok, var(--accent))', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 항목이 없습니다. 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map((h) => renderHit(h, 'list'))
        )}
      </div>

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span className="linkbar-label" style={{ ...hint }}>연계:</span>
        <button
          className="linkbtn"
          onClick={() => random ? projectIt(random) : (filtered[0] && projectIt(filtered[0]))}
          disabled={!hasProjectBridge() || filtered.length === 0}
          title={hasProjectBridge() ? '무작위(없으면 목록 첫 항목)를 프로젝트 자료 〈천문·항해〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
        <button
          className="linkbtn"
          onClick={() => random && stashIt(random)}
          disabled={!hasStash() || !random}
          title={hasStash() ? '무작위 항목을 수집함에 담기' : '수집함이 연결되어 있지 않습니다'}
        ><Emoji e="📎" /> 수집함</button>
        <button
          className="linkbtn"
          onClick={() => openToolLinked('fictional-calendar', random ? { seedName: random.item.name } : undefined)}
          title="가상 역법 설계 도구 열기"
        ><Emoji e="📅" /> 가상 달력 도구</button>
      </div>

      <div style={hint}>자릿값·각도는 묘사용 어림입니다. 실제 항해엔 최신 천측력·해도를 쓰세요. 다른 세계 배경이라면 이 원리를 비틀어 새 하늘을 설계해 보세요.</div>
    </div>
  )
}
