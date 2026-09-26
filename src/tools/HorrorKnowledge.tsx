// 호러·공포 장르 지식·소재 사전 — 대표작 계보·하위장르·서사 장치·페이싱·클라이맥스 관습·
//  공포 유발 원리·괴물 유형·공간/배경·감각 어휘·클리셰(전복)·금기·고증/세계관·웹소설 관습을
//  카테고리로 묶은 로컬 사전. 도시에 근거한 호러 특화 자작 데이터(일반론 배제).
// 자급식: 외부 네트워크·라이브러리 없음. react + './linkbus' 만 사용.
//  localStorage 로 펼침/즐겨찾기/마지막 카테고리 영속. 언마운트 정리.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'horror-knowledge', name: '호러·공포 지식 사전', icon: '🕯️', group: '지식 사전', genre: '호러·공포', intro: '호러에서 자주 쓰는 소재·설정·서사 장치·고증 지식을 카테고리로 찾아 공포 장면에 심으세요', w: 660, h: 640 }

interface Entry { name: string; desc: string; tip?: string }
interface CatDef { key: string; label: string; icon: string; note?: string; items: Entry[] }

// ─────────────────────────────────────────────────────────────────────────────
// 호러·공포 도시에 기반 자작 지식 사전 — 12개 카테고리, 합계 149개 항목.
// 데이터는 전부 호러 장르에 특화·구체적. 범용 글쓰기 조언·일반론은 배제.
// ─────────────────────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  {
    key: 'contract', label: '장르 규약', icon: '📜', note: '호러를 호러로 만드는 "독자와의 계약". 어기면 "안 무섭다"로 직결되는 절대 명제들.',
    items: [
      { name: '무서워야 한다(절대 명제)', desc: '독자는 안전한 거리에서 공포를 소비하러 온다. 긴장(dread)→충격(shock)→다시 긴장의 사이클이 약속이다.', tip: '"분위기는 좋은데 안 무섭다"는 호러에선 실패다. 매 장면 "여기서 독자가 무엇을 두려워하는가"를 자문하라.' },
      { name: '공포의 3층위 제공', desc: '① 표면적 충격(점프스케어·고어) ② 지속적 불안(분위기·dread) ③ 사후 여운(존재론적 찝찝함). 좋은 호러는 셋 다 노린다.', tip: '셋 중 하나만 노리면 얕다. 점프스케어로 놀래고, 분위기로 조이고, 마지막엔 책장을 덮어도 남는 한 줄을 심어라.' },
      { name: '규칙의 존재와 위반', desc: '괴물·저주에는 작동 규칙이 있다("밤에만 나온다", "이름을 부르면 안 된다", "보면 7일 후 죽는다"). 독자는 규칙을 파악하며 긴장한다.', tip: '규칙을 명확히 심고, 위반=처벌로 일관되게 집행하라. 규칙이 흔들리면 긴장도 무너진다.' },
      { name: '취약한 인물에의 이입', desc: '무력하거나 고립된 인물에게 감정이입해야 공포가 작동한다. "내가 저 상황이면"을 상상하게 만드는 것.', tip: '주인공을 너무 유능하게 만들지 마라. 도망칠 곳도, 믿어줄 사람도, 무기도 없을수록 공포가 산다.' },
      { name: '불확실성의 유지', desc: '"초자연인가 정신병인가", "누가 살아남는가"의 모호함을 가능한 한 길게 끄는 것을 독자는 기대한다.', tip: '답을 너무 빨리 주지 마라. 정체가 밝혀지는 순간 미스터리의 동력이 꺼지고 공포가 줄어든다.' },
      { name: '인과응보·생존의 논리', desc: '슬래셔·전통 호러에선 죄(방종·오만·탐욕)를 범한 자가 먼저 죽고, 순수·기지의 인물(흔히 final girl)이 살아남는 도덕 구조를 무의식적으로 기대한다.', tip: '이 도덕률을 따르거나 의식적으로 전복하라 — "착한 사람이 먼저 죽는다"는 배반도 강한 공포가 된다.' },
      { name: '금기 건드리기', desc: '죽음·시신·신체훼손·어린이·임신·집(안전의 공간) 침범 등 보편 금기를 건드릴 때 가장 강하게 반응한다.', tip: '가장 안전해야 할 것을 위협으로 — 아이의 방, 엄마의 얼굴, 내 집 침대 밑을 건드려라.' },
      { name: '카타르시스 vs 의도적 비카타르시스', desc: '괴물 퇴치의 후련함 ↔ "끝나지 않았다"는 찝찝한 열린 결말. 현대 호러는 후자를 선호하는 경향.', tip: '완전한 해피엔딩은 드물다. 살아남아도 대가(트라우마·상실·전염)를 치르게 하면 여운이 깊다.' },
      { name: '보여주지 않는 것이 더 무섭다', desc: '괴물을 끝까지 안 보여주거나 일부만 보여주는 것. 상상이 묘사를 이긴다(러브크래프트 원칙).', tip: '괴물의 전모를 묘사하는 순간 독자의 상상보다 작아진다. 그림자·발소리·반사면·문틈만으로 끌어라.' },
      { name: '독자보다 한발 앞선 공포', desc: '독자만 아는 위협(극적 아이러니)을 깔면 평범한 장면조차 "곧 일어날 일"의 공포로 물든다.', tip: '인물은 모르고 독자만 아는 위협을 배치하라 — 등 뒤의 그림자를 독자만 볼 때 비명이 터진다.' },
    ],
  },
  {
    key: 'subgenre', label: '하위 장르', icon: '🗂️', note: '무대와 공포의 결이 갈라지는 1차 분기. 어느 갈래인지 정하면 관습·페이싱·괴물상이 따라온다.',
    items: [
      { name: '유령·고딕(haunted house)', desc: '폐허·저주받은 가문·원혼. 과거의 비극을 품은 건축물이 공포의 근원. 셜리 잭슨 『힐 하우스의 유령』이 심리적 유령의 집의 교과서.', tip: '집의 역사 = 공포의 정체. "왜 이 집인가"를 파고들수록 유령이 살아난다.' },
      { name: '악마·오컬트', desc: '엑소시즘·흑마술·사이비·계약. 빙의와 의식, 금지된 책(그리무아르)이 중심. 신성과 모독의 대결 구도.', tip: '믿음 체계(기독교·민속신앙 등)를 명확히 세워야 퇴마의 규칙이 선다. 신앙이 무기이자 약점이 된다.' },
      { name: '슬래셔', desc: '가면 쓴 살인마·연쇄 살해·마지막 생존자(final girl). 죄를 범한 자가 먼저 죽는 도덕적 구조. 『할로윈』『13일의 금요일』 계보.', tip: '살인마의 정체·동기는 천천히, 살해는 창의적으로. final girl의 "수동→능동" 전환이 클라이맥스.' },
      { name: '바디 호러(신체 변형)', desc: '감염·기생·변이·신체 통제 상실. 내 몸이 나를 배신하는 공포. 크로넨버그·이토 준지의 불쾌의 미학.', tip: '변형의 과정을 단계적으로 그려라 — 한 번에 괴물이 되는 것보다 서서히 무너지는 자아가 더 끔찍하다.' },
      { name: '크리처·몬스터', desc: '미지의 괴물·외계 생명·심해 생물. 인간을 사냥하는 포식자. 『에이리언』『더 씽』의 폐쇄공간 추적.', tip: '괴물의 "규칙"(약점·습성)을 빌드업에서 심고 클라이맥스에서 역이용하라. 전모는 끝까지 아껴라.' },
      { name: '포크 호러', desc: '고립된 시골 공동체·이교 의식·인신공양. "친절함이 더 무서운" 폐쇄 마을. 『위커맨』『미드소마』.', tip: '외부인의 시점으로 천천히 마을의 "정상성"이 어긋남을 누적시켜라. 환한 대낮·밝은 축제가 오히려 섬뜩하다.' },
      { name: '우주적 공포(Cosmic Horror)', desc: '인간의 이해를 넘어선 존재 앞의 무력함. 알 수 없는 것에 대한 공포. 러브크래프트 크툴루 신화가 원천.', tip: '괴물을 이기는 게 아니라 "알아버린 자가 미친다". 인간의 왜소함·우주의 무관심을 끝까지 유지하라.' },
      { name: '사이코로지컬(심리)', desc: '내면 붕괴·신뢰할 수 없는 화자·편집증. "초자연인가 광기인가"의 모호함. 에드거 앨런 포의 계보.', tip: '독자의 인식 토대 자체를 흔들어라 — 화자가 미쳤는지, 거짓말하는지, 이미 죽었는지 모르게.' },
      { name: '서바이벌·아포칼립스', desc: '좀비·감염·종말. 괴물보다 무너진 인간성이 더 무섭다. 매시슨 『나는 전설이다』가 좀비 종말물의 원형.', tip: '"누가 살아남는가"와 "살아남기 위해 무엇을 버리는가"를 함께 물어라. 진짜 괴물은 다른 생존자다.' },
      { name: '분석·미스터리 호러', desc: '괴담의 정체·저주의 기원을 추적하는 수사형. 폴 트렘블레이·기록물(found footage)·다큐 형식과 결합.', tip: '독자에게 "퍼즐"을 던지되 해답이 더 큰 공포가 되게 하라 — 진실을 알수록 빠져나갈 수 없는 구조.' },
      { name: '도시괴담·현대 호러(웹·웹툰)', desc: '지하철·고시원·엘리베이터·SNS 등 현대 일상에 침투. 오성대 『기기괴괴』, 호랑 『옥수역 귀신』의 스크롤 연출 계보.', tip: '익숙한 일상 공간일수록 효과적. 매 회 끝 클리프행어와 여백·줄바꿈으로 점프스케어 타이밍을 제어하라.' },
      { name: 'J-호러(원혼·매체 저주)', desc: '축축하고 끈질긴 원혼, 기술 매체를 통한 저주 전파. 스즈키 코지 『링』(저주 비디오·사다코), 영화 『주온』.', tip: '서구 유령이 "쫓아낼 대상"이라면 J-호러 원혼은 "옮겨야 살아남는" 전염. 탈출구의 게임을 설계하라.' },
      { name: '한국 전통 괴담', desc: '구미호·처녀귀신·달걀귀신·한(恨)의 정서. 『전설의 고향』 계보와 무속·제사·터의 금기.', tip: '"한"의 사연(억울한 죽음·풀지 못한 원)이 귀신의 정체. 사연을 풀어줘야(또는 못 풀어야) 결말이 닫힌다.' },
      { name: '게이트·던전 결합 호러(웹소설)', desc: '현대 도시괴담 + 생존 + 게이트·던전·헌터물의 혼합. 한국 웹소설이 키운 흥행 갈래.', tip: '공포(분위기)와 성장·전투(쾌감)의 배합비가 관건. 초반은 호러로 끌고, 시스템·규칙으로 생존 게임화하라.' },
    ],
  },
  {
    key: 'device', label: '서사 장치', icon: '🎭', note: '호러를 "호러답게" 굴리는 엔진들. 장면 단위로 꺼내 쓰는 핵심 자산.',
    items: [
      { name: '드레드(Dread)의 축적', desc: '사건 자체보다 "곧 무언가 일어난다"는 예감을 길게 끄는 것. 공포 ≠ 사건, 공포 = 기다림.', tip: '정적·침묵·일상의 미세한 어긋남으로 쌓아라. 아무 일도 안 일어나는 페이지가 가장 무서울 수 있다.' },
      { name: '언캐니(두려운 낯섦)', desc: '익숙한 것이 미세하게 잘못된 상태 — 표정 없는 가족, 늘 같은 자리의 인형, 0.5초 늦는 미소. 프로이트적 공포의 핵심.', tip: '"99% 정상, 1% 어긋남"이 비명을 만든다. 완전히 이상한 것보다 거의 정상인 것이 더 소름 돋는다.' },
      { name: '보이지 않는 공포(off-screen)', desc: '괴물을 안 보여주거나 일부만. 발소리·그림자·문틈·반사면·숨소리만으로 존재를 암시.', tip: '독자의 상상이 작가의 묘사보다 강하다. 결정적 순간까지 전모를 가리고, 보여줄 땐 한 조각만.' },
      { name: '신뢰할 수 없는 화자', desc: '화자가 미쳤는지·거짓말하는지·이미 죽었는지 모르게. 독자의 인식 토대 자체를 흔든다.', tip: '화자의 진술과 미세하게 어긋나는 단서를 깔아라 — 독자가 "이 사람을 믿어도 되나"를 의심하게.' },
      { name: '잘못된 안도(false scare)', desc: '위협인 줄 알았던 게 고양이·친구였다 → 안심한 직후 진짜 공격. 페이싱의 기본 호흡.', tip: '가짜 놀람으로 긴장을 한 번 풀고, 독자가 숨을 내쉬는 바로 그 순간 진짜를 터뜨려라.' },
      { name: '금지된 지식·호기심의 처벌', desc: '열지 말라는 문, 읽지 말라는 책, 가지 말라는 방. "알아버린 자"가 파멸한다(판도라 구조).', tip: '금기를 명확히 제시하고, 호기심이 그것을 어기게 하라 — 독자도 "보지 마"라고 외치게.' },
      { name: '저주·전염의 룰', desc: '저주가 사람에서 사람으로 옮겨가는 규칙(『링』의 복사 전파). "탈출구가 있는가"의 게임을 제시.', tip: '전염의 정확한 조건과 회피법을 설계하라 — 살아남는 유일한 길이 "남에게 넘기는 것"이면 도덕적 공포가 더해진다.' },
      { name: '격리·고립의 장치', desc: '통신 두절(휴대폰 불통·정전)·폭설·외딴 섬·우주선·산장. 외부 도움 차단으로 무력화.', tip: '구조 가능성을 일찍 차단하라. 911을 걸 수 있으면 공포가 반감된다 — 신호 없음·끊긴 전화선을 깔아라.' },
      { name: '공간의 인격화', desc: '집·호텔·숲 자체가 적대적 의지를 가진 존재가 됨(『샤이닝』의 오버룩 호텔, 힐 하우스).', tip: '공간을 캐릭터처럼 다뤄라 — 복도가 길어지고, 방이 옮겨가고, 집이 인물을 "고른다".' },
      { name: '신체의 배신', desc: '내 몸이 변하거나 통제되지 않음(감염·빙의·기생·변형). 자아 상실의 공포.', tip: '"내가 내 손을 못 믿는다"의 순간을 그려라 — 자기 몸이 낯선 의지로 움직이는 묘사가 핵심.' },
      { name: '시간·기억의 왜곡', desc: '같은 일의 반복(루프)·지워진 기억·흐르지 않는 시간. 인지적 불안 유발.', tip: '독자도 "이게 처음인가 두 번째인가"를 헷갈리게 — 반복 속 미세한 차이로 단서를 흘려라.' },
      { name: '물건·매체를 통한 침투', desc: '거울·사진·비디오·인형·전화·라디오 잡음·오래된 일기. "안전한 일상 사물"을 위협 매개로.', tip: '독자의 집에도 있는 사물을 위협으로 만들어라 — 읽고 난 뒤 그 물건을 못 보게 하는 것이 목표.' },
      { name: '목격의 비대칭', desc: '주인공만 본다 → 아무도 안 믿어준다 → 고립 심화. 사회적 무력화 장치.', tip: '"다들 날 미쳤다고 한다"의 고립을 누적하라. 증거가 사라지거나 다른 사람에겐 안 보이게.' },
      { name: '카운트다운·타임리밋', desc: '"7일 후", "해 뜨기 전까지", "13번째 종이 울리면". 시한이 긴장을 조인다.', tip: '명확한 데드라인을 박고 점점 좁혀라. 남은 시간을 주기적으로 상기시키면 압박이 산다.' },
      { name: '동물의 선(先)감지', desc: '개·고양이가 먼저 이상 반응 → 인간보다 빨리 위험을 안다. 고전적 전조 장치.', tip: '동물이 짖다 멈추거나, 한 곳을 응시하거나, 집을 떠나는 것으로 "여기 무언가 있다"를 암시하라.' },
      { name: '비신뢰 안전지대', desc: '안전해 보이는 곳(경찰서·교회·구조대)이 실은 위협의 일부. 마지막 희망을 무너뜨린다.', tip: '"이제 살았다" 싶은 안도를 주고 그 안전지대를 배반하라 — 구원자가 진짜 적이었던 반전.' },
    ],
  },
  {
    key: 'structure', label: '구조·전개', icon: '🧱', note: '전형적 5단 구조와 빌드업 배치. "잃을 것"을 만든 뒤 천천히 무너뜨린다.',
    items: [
      { name: '1. 일상(The Normal)', desc: '평범한 세계를 충분히 보여줘 "잃을 것"을 만든다. 인물·관계·공간을 정상 상태로 각인.', tip: '여기서 아껴둔 평온이 곧 무기다 — 행복한 가족을 공들여 그릴수록 붕괴가 아프다.' },
      { name: '2. 균열(The First Sign)', desc: '작은 이상징후. 설명 가능할 법한 수준(우연·착각·소음). 인물은 모르고 독자만 불안.', tip: '"기분 탓이겠지"로 넘어갈 수 있는 미세한 어긋남. 너무 크면 일찍 도망가버린다.' },
      { name: '3. 상승(Escalation)', desc: '사건이 잦아지고 강도가 세짐. 합리적 설명이 점점 불가능. 인물이 조사 시작/규칙 발견.', tip: '사건 간격을 점점 좁혀라. 같은 강도 반복은 둔감화 — 매번 한 단계씩 올려야 한다.' },
      { name: '4. 포위(The Trap Closes)', desc: '고립 확정·안전지대 붕괴·첫 사상자. 도망갈 곳 없음. 괴물의 정체·기원이 드러남.', tip: '여기서 핵심 인물 하나를 죽여 "진짜 죽을 수 있다"를 각인하라. 판돈을 올리는 지점.' },
      { name: '5. 대면·결말(Confrontation)', desc: '클라이맥스 대결 → 퇴치/탈출/패배/열린 결말. off-screen으로 끌어온 존재를 (부분적으로) 드러냄.', tip: '빌드업에서 심은 규칙·약점을 여기서 써라. 단, 데우스 엑스 마키나가 안 되게 복선을 미리.' },
      { name: '저속 빌드업 + 가속 후반', desc: '전반부는 분위기로 천천히, 중반 이후 사건 간격을 좁히며 가속. 후반은 쉴 틈 없이 몰아침.', tip: '초반의 인내가 후반의 폭발을 만든다 — 천천히 조였다가 임계점에서 터뜨려라.' },
      { name: '긴장-이완의 파동', desc: '계속 무섭기만 하면 마비된다. 조용한 구간(교감·일상·유머)으로 숨을 줘야 다음 충격이 산다.', tip: '"고요는 폭풍의 전조." 큰 충격 뒤엔 반드시 짧은 휴지부를 둬라 — 그래야 다음이 다시 무섭다.' },
      { name: '정보의 적하(滴下)', desc: '괴물의 정체·규칙·기원을 한 번에 풀지 말고 조금씩. 미스터리가 동력.', tip: '한 장면당 단서 한 조각. 다 알려주는 순간 공포가 끝난다 — 마지막 퍼즐은 클라이맥스로 아껴라.' },
      { name: '씬 끝의 훅(cliffhanger)', desc: '각 장 끝을 작은 충격·불길한 암시로 끊어 페이지를 넘기게 한다.', tip: '챕터 마지막 문장을 "다음을 안 보면 못 견디는" 한 줄로 — 발소리·그림자·전화벨로 끊어라.' },
      { name: '초반 첫 공포 사건(웹 특화)', desc: '웹소설·웹툰은 짧은 호흡. 초반 3화 내 첫 공포 사건이 필수, 매 화 끝 클리프행어.', tip: '빌드업한다고 첫 공포를 5화 뒤로 미루면 이탈한다. 1화에 불길한 한 방, 3화 안에 진짜 사건.' },
      { name: '스크롤·여백 연출(웹툰)', desc: '여백·줄바꿈·긴 스크롤로 긴장과 점프스케어 타이밍을 제어. 호랑 식 세로 스크롤 연출.', tip: '독자가 스크롤하는 속도와 손가락을 계산하라 — 긴 여백 뒤 갑작스러운 컷이 점프스케어가 된다.' },
    ],
  },
  {
    key: 'climax', label: '클라이맥스 관습', icon: '🔪', note: '호러의 절정은 "최후의 대면"이다. 형태와 변주, 그리고 거짓 승리의 함정.',
    items: [
      { name: '최후의 대면', desc: '그동안 숨겨졌던 괴물/진실과 정면으로 마주함. off-screen으로 끌어온 존재를 (부분적으로) 드러내는 지점.', tip: '전모를 다 보여주지 말고 "결정적 한 조각"만 — 상상의 여지를 끝까지 남기면 여운이 깊다.' },
      { name: '규칙의 역이용', desc: '빌드업에서 심은 약점·규칙을 클라이맥스에서 사용(성수·소금·이름·불·해뜨기).', tip: '반드시 미리 복선을 깔아라 — 마지막에 갑자기 등장한 약점은 데우스 엑스 마키나로 김이 샌다.' },
      { name: '최대 희생', desc: '클라이맥스 직전·도중 핵심 인물의 죽음으로 판돈을 올림. "이번엔 진짜 죽을 수 있다"를 각인.', tip: '독자가 살 거라 믿었던 인물을 죽여라 — 안전한 클라이맥스는 긴장이 없다.' },
      { name: 'final girl의 반격', desc: '가장 무력했던 인물이 마지막에 맞서 싸운다. 수동→능동 전환. 슬래셔의 정석.', tip: '그녀의 무력함을 빌드업에서 충분히 쌓아야 반격이 카타르시스가 된다. 각성의 트리거를 명확히.' },
      { name: '거짓 승리 후 재공격', desc: '이긴 줄 알았는데 괴물이 다시 일어남. 마지막 점프스케어. 슬래셔의 단골.', tip: '독자가 안도하며 책장을 덮으려는 순간 — 죽은 줄 알았던 손이 불쑥. 한 번 더, 그리고 진짜로.' },
      { name: '대가·상처', desc: '살아남아도 정상으로 못 돌아옴(트라우마·신체손상·동료 상실). 완전한 해피엔딩은 드물다.', tip: '승리에 비용을 매겨라 — 잃은 것 없이 끝나는 호러는 "안전했다"는 느낌을 남겨 공포를 깎는다.' },
      { name: '열린 결말·씨앗', desc: '저주가 옮겨갔음, 알·생존 개체·전염자가 남음, 마지막 컷의 불길한 징조. 속편 여지 + 존재론적 불안.', tip: '"끝났다" 다음 줄에 "정말?"을 심어라 — 마지막 한 문장이 모든 안도를 뒤집게.' },
      { name: '반전(twist)', desc: '화자가 사실 죽어 있었다·괴물은 주인공이었다·모든 게 환각이었다·구원자가 진짜 적이었다.', tip: '반전은 "다시 읽으면 단서가 다 있었다"여야 한다 — 사후에 복선이 들어맞아야 속임수가 아니다.' },
      { name: '규칙 위반의 처벌(절정)', desc: '내내 지켜온 금기를 클라이맥스에서 어겨 파국이 온다. "이름을 불렀다", "뒤를 돌아봤다".', tip: '독자가 규칙을 외울 만큼 반복해 심고, 절정에서 인물이 그것을 어기게 — 긴장의 정점을 만든다.' },
      { name: '구원의 실패·무력함(우주적)', desc: '인간의 노력이 무의미함을 확인. 괴물을 이기는 게 아니라 그 앞에 무릎 꿇는 결말.', tip: '우주적 공포에선 "퇴치"가 오히려 김이 샌다 — 알아버린 자의 광기·체념으로 닫아라.' },
    ],
  },
  {
    key: 'monster', label: '괴물·존재 유형', icon: '👹', note: '공포의 주체. 정체·규칙·약점·기원의 4요소로 설계하면 입체적이 된다.',
    items: [
      { name: '원혼·지박령', desc: '한 맺힌 죽음에 묶여 특정 장소를 떠도는 영. 사연(억울함)이 곧 존재 이유이자 약점.', tip: '"왜 여기, 왜 이 사람을"의 인과를 설계하라. 사연을 풀어주거나 끝내 못 풀게 하는 것이 결말의 갈림길.' },
      { name: '폴터가이스트', desc: '물건을 던지고 소리를 내는 시끄러운 영. 물리적 현상이 점점 격해지는 점층 구조에 적합.', tip: '처음엔 물건이 떨어지는 정도에서, 점차 사람을 직접 위협하는 단계로 강도를 올려라.' },
      { name: '악마·악령(빙의)', desc: '인간을 숙주로 삼는 지성적 악. 거짓말·유혹·정신 조종이 무기. 엑소시즘의 대상.', tip: '악마는 영리하다 — 정보를 미끼로 인간을 분열시킨다. 빙의의 단계적 징후(목소리·신체 변형·금기 지식)를 그려라.' },
      { name: '흡혈귀', desc: '피를 탐하는 불멸자. 햇빛·십자가·마늘·말뚝의 고전 규칙. 매혹과 포식의 양면.', tip: '규칙을 명확히(초대 없이 못 들어옴 등) 세우고 클라이맥스에서 활용하라. 불멸과 고독의 비애를 더하면 깊어진다.' },
      { name: '늑대인간·변신체', desc: '인간과 짐승을 오가는 존재. 보름달·은(銀)의 규칙. 통제 불능의 야성 = 자아 상실의 공포.', tip: '변신을 "본인도 원치 않는 저주"로 그리면 비극이 된다. 변신 전후의 인간성 충돌이 핵심.' },
      { name: '좀비·감염체', desc: '죽었으나 움직이는 무리, 또는 감염으로 인간성을 잃은 떼. 개체보다 "수"와 "전염"이 공포.', tip: '진짜 공포는 좀비가 아니라 무너진 인간 사회다 — 감염 규칙(물림·잠복기)을 생존 게임의 룰로 써라.' },
      { name: '구미호·요호', desc: '인간으로 둔갑하는 여우 요괴. 간(肝)·정기를 탐하나 인간을 사랑하기도 하는 한국 전통 괴물.', tip: '"인간이 되고 싶은 욕망"과 "포식 본능"의 갈등이 드라마. 정체가 드러나는 순간을 클라이맥스로.' },
      { name: '처녀귀신·물귀신', desc: '소복·풀어헤친 머리·창백한 얼굴. 한(恨)을 품은 한국 전통 원혼. 물가·우물·옛집에 깃든다.', tip: '"한"의 구체적 사연(억울한 죽음·배신)이 정체. 사연이 빈약하면 분장만 무서운 껍데기가 된다.' },
      { name: '도플갱어·바꿔치기', desc: '나와 똑같이 생긴 존재, 또는 가족이 미세하게 바뀜. 언캐니의 정점. "저 사람이 그 사람이 맞나".', tip: '"99% 똑같고 1% 다르다"를 디테일로 — 말투·습관·기억의 미세한 어긋남이 소름의 정체.' },
      { name: '기생체·체내 침입자', desc: '몸 안에 들어와 숙주를 조종/변형하는 존재. 바디 호러의 핵심. 『에이리언』의 페이스허거.', tip: '잠복 → 증상 → 발현 → 변형의 단계를 그려라. "내 몸 안에 무언가 있다"의 불쾌가 동력.' },
      { name: '미지의 심해·우주 생물', desc: '인간의 이해를 벗어난 거대하고 무관심한 존재. 우주적 공포의 본체. 형태조차 온전히 묘사 불가.', tip: '전모를 묘사하지 마라 — "보면 미친다", "이해하면 무너진다". 단편적 인상과 인간의 반응만 그려라.' },
      { name: '저주받은 사물·인형', desc: '의지를 가진 물건·인형·그림. 텅 빈 눈, 늘 같은 자리, 미세하게 바뀐 위치.', tip: '인형이 "움직였다"를 직접 보여주지 말고, 위치만 바뀌어 있게 — 독자의 상상이 채우게 하라.' },
      { name: '인간 살인마(슬래셔)', desc: '초자연이 아닌 인간 괴물. 가면·침묵·집요함. 동기는 끝까지 숨기거나 일그러진 논리로.', tip: '초자연보다 "현실에 있을 법함"이 더 무섭다. 살인마의 인간성을 지우면(가면·무표정) 공포가 증폭된다.' },
      { name: '사이비·이교 집단', desc: '개인이 아닌 공동체가 위협. 광신·집단 의식·인신공양. 포크 호러의 본체.', tip: '"다수의 평범한 사람들"이 한목소리로 미쳐 있을 때 가장 섬뜩하다. 친절한 미소가 위협이 되게.' },
      { name: '저주·관념 자체', desc: '실체 없는 저주·소문·이미지. 보거나 듣거나 알면 옮는다(『링』『그것이 따라온다』).', tip: '형체 없는 위협일수록 규칙(전염 조건·회피법)을 정밀하게 — 안 보이는 적의 룰이 곧 긴장의 뼈대.' },
    ],
  },
  {
    key: 'space', label: '공간·배경', icon: '🏚️', note: '호러에서 가장 중요한 요소. 탈출 불가의 폐쇄성과 과거의 비극이 공포의 그릇이 된다.',
    items: [
      { name: '귀신 들린 집(haunted house)', desc: '과거의 비극(살인·자살·매장)을 품은 건축물. 집의 역사 = 공포의 근원.', tip: '집 자체를 캐릭터로 — 새 거주자가 집의 과거를 모른 채 들어오고, 집이 그들을 "고른다".' },
      { name: '외딴 산장·별장', desc: '폭설·고립·통신 두절. 도움이 닿지 않는 폐쇄공간의 표준. 외부와의 단절이 핵심.', tip: '도착 전에 "여기 오면 안 됐다"는 불길함을 심어라 — 길 안내 노인, 끊긴 도로, 사라진 이전 손님.' },
      { name: '저주받은 마을', desc: '외부인을 적대하는 폐쇄 공동체. 비밀스러운 풍습·이교 의식·"친절함이 더 무서운" 마을.', tip: '처음엔 환대하다가 서서히 본색을 — 마을 사람 전원이 한통속이라는 깨달음의 순간을 절정으로.' },
      { name: '등대·외딴 섬', desc: '바다로 단절된 고립. 광기·환각·이중성의 무대. 빠져나갈 수 없는 물리적 감옥.', tip: '바다 자체를 위협으로 — 배가 안 오고, 안개가 끼고, 섬이 사람을 놓아주지 않는다.' },
      { name: '폐병원·정신병원', desc: '죽음·고통·실험의 기억이 밴 공간. 의료기구·기록·환자의 흔적이 소품이 된다.', tip: '과거의 환자·의사·실험이 현재로 새어 나오게 — 낡은 진료 기록, 잠긴 격리실, 멈춘 심전도.' },
      { name: '지하실·다락방·우물', desc: '집 안의 "건드리면 안 되는" 공간. 봉인된 비밀·시신·통로가 숨은 곳.', tip: '"내려가지 마/올라가지 마"의 금기를 깔고, 호기심이 어기게 하라 — 가장 어두운 곳에 진실이 있다.' },
      { name: '폐교·학교(밤)', desc: '낮엔 일상, 밤엔 다른 공간. 빈 복도·교실·화장실 괴담의 무대. 한국 학교괴담의 본거지.', tip: '"화장실 셋째 칸", "음악실 초상화" 같은 구체적 괴담 룰을 심어라 — 익숙한 공간의 배반이 핵심.' },
      { name: '지하철·터널·지하공간', desc: '현대 도시괴담의 무대. 끝없는 통로·끊긴 신호·마지막 열차. 폐쇄와 어둠의 결합.', tip: '"막차 이후" "역무원 없는 역" 같은 일상의 틈을 노려라 — 매일 타는 곳이 낯설어지는 공포.' },
      { name: '고시원·원룸·엘리베이터', desc: '도시 1인 가구의 좁고 고립된 공간. 옆방의 소리, 갇힌 엘리베이터, CCTV의 사각.', tip: '벽 너머의 존재, 멈춘 엘리베이터, 누가 보는 듯한 느낌 — 혼자 사는 독자의 일상을 직격하라.' },
      { name: '숲·산(길 잃음)', desc: '미지·시련·무의식의 공간. 들어가면 변해 나오는 어둠. 같은 자리를 맴도는 길 잃음.', tip: '나침반·지도·휴대폰이 무력해지게 — 표지가 사라지고, 같은 나무를 반복해 지나치는 공포.' },
      { name: '병실·요양원(밤)', desc: '약자(환자·노인)가 모인 무력한 공간. 깜빡이는 형광등, 빈 침대, 새벽의 발소리.', tip: '"옆 침대 환자가 사라졌다", "아무도 안 누른 호출벨" 같은 무력한 자의 공포를 그려라.' },
      { name: '오래된 호텔·여관', desc: '수많은 사람이 머물다 떠난 익명의 공간. 잠긴 객실, 사라진 손님, 같은 방의 반복(『샤이닝』).', tip: '호텔을 인격화하라 — 복도가 길어지고, 객실 번호가 바뀌고, 떠난 손님이 돌아오지 않는다.' },
      { name: '제사·굿·무속의 터', desc: '한국 호러의 신성·금기 공간. 신당·제단·묫자리·금줄. 함부로 건드리면 동티가 난다.', tip: '"하면 안 되는 것"(이장·터파기·제사 거름)을 어겨 화를 부르는 구조 — 전통 금기를 룰로 써라.' },
      { name: '아파트·신축 건물', desc: '깨끗한 새 공간 밑에 묻힌 과거(이전 부지·매립지·사고). 일상의 침범.', tip: '가장 평범하고 안전해야 할 우리 집을 위협으로 — 새 아파트의 매끈함과 그 아래의 비밀을 대비하라.' },
    ],
  },
  {
    key: 'atmosphere', label: '분위기·감각 어휘', icon: '👁️', note: '공포를 체감으로 옮기는 오감 도구함. 직접 "무섭다" 말하지 말고 감각으로 보여라.',
    items: [
      { name: '청각: 정적을 깨는 소리', desc: '삐걱이는 마룻바닥, 긁는 소리, 발소리, 숨소리, 똑똑(문 두드림), 멀리서 들리는 노랫소리·웃음.', tip: '소리의 출처를 보여주지 마라 — "어디선가" "벽 너머에서" "위층에서"가 정체보다 무섭다.' },
      { name: '청각: 정적·침묵', desc: '갑자기 멎은 소음, 들리지 않는 발소리, 숨죽인 집. 소리의 부재가 곧 위협의 신호.', tip: '시끄럽던 것(새소리·시계·냉장고)이 동시에 멈추는 순간을 써라 — 침묵이 가장 큰 비명이 된다.' },
      { name: '청각: 매체 잡음', desc: '라디오 static, 전화기의 잡음 섞인 목소리, TV 화이트노이즈, 녹음에 섞인 정체불명의 소리.', tip: '기술 매체를 통해 "여기 없어야 할 것"이 새어 나오게 — 끊긴 전화에서 들리는 숨소리처럼.' },
      { name: '시각: 그림자·실루엣', desc: '벽의 그림자, 어둠 속 두 눈, 창밖의 얼굴, 반쯤 열린 문, 움직이는 그림자.', tip: '형체를 또렷이 그리지 마라 — 윤곽·실루엣·반사면만으로 독자의 상상이 괴물을 완성하게.' },
      { name: '시각: 깜빡이는 빛', desc: '깜빡이다 꺼지는 전등, 갑자기 켜지는 TV, 손전등의 명멸. 빛의 불안정이 시야를 위협으로.', tip: '빛이 들어왔다 나가는 그 짧은 어둠에 무언가가 "가까워져" 있게 하라.' },
      { name: '시각: 거울·반사', desc: '거울 속의 무언가, 등 뒤의 형체, 나와 다르게 움직이는 거울 속 나.', tip: '거울·유리창·물 표면·검은 화면 — 반사면을 의심하게 만들면 일상의 모든 표면이 무서워진다.' },
      { name: '체감: 한기·소름', desc: '등골이 서늘하다, 소름이 돋다, 목덜미가 곤두서다, 방 공기가 무거워지다·차가워지다.', tip: '온도 변화를 위협의 신호로 — 갑자기 입김이 보이고, 따뜻하던 방이 얼어붙는다.' },
      { name: '체감: 시선의 감각', desc: '누군가 보고 있는 느낌, 등 뒤의 인기척, 심장이 쿵 내려앉다. 보이지 않으나 분명히 있는 존재감.', tip: '"본다"가 아니라 "보이는 느낌"을 써라 — 돌아봐도 아무도 없을 때가 가장 무섭다.' },
      { name: '후각: 죽음·부패의 냄새', desc: '피비린내, 썩은 내, 흙냄새, 곰팡이·축축한 냄새. 보기 전에 코로 먼저 위협을 안다.', tip: '후각은 원초적 경보다 — 보이지 않아도 "썩은 냄새가 점점 가까워진다"로 공포를 끌어라.' },
      { name: '후각: 오컬트의 냄새', desc: '향(線香)·촛농 냄새, 피운 적 없는 향, 닫힌 방의 제사 냄새. 의식과 죽음의 흔적.', tip: '없어야 할 냄새가 나는 것으로 침입을 암시 — 빈집에서 누군가 향을 피운 냄새가 난다.' },
      { name: '축축함·습기의 미학(J-호러)', desc: '젖은 머리카락, 물방울, 곰팡이, 끈적이는 한기. 마르지 않는 음습함이 원혼의 질감.', tip: '"마르지 않는 것"으로 끈질김을 그려라 — 닦아도 다시 차오르는 물자국, 항상 젖어 있는 머리카락.' },
      { name: '정서 키워드', desc: '공포(terror)·경악(horror)·혐오(disgust)·불안(dread)·편집증(paranoia)·무력감·고립감·절망·광기·불길함(ominous)·오싹함(eerie).', tip: '노리는 정서를 먼저 정하라 — "혐오"를 노릴 땐 묘사를, "불안"을 노릴 땐 생략을, "절망"을 노릴 땐 무력함을 쌓아라.' },
    ],
  },
  {
    key: 'cliche', label: '클리셰(전복)', icon: '🔄', note: '닳도록 쓰인 호러 장면·설정. 알고 비틀어야 차별화된다. 각 항목에 전복 포인트를 함께 적었다.',
    items: [
      { name: '이사 온 새 집의 이상한 지하실', desc: '저렴한 새 집 + 봉인된 지하실/다락방/우물의 비밀.', tip: '전복: 비밀이 집이 아니라 "이사 온 가족" 쪽에 있게 — 위협은 외부가 아니라 그들이 데려온 것.' },
      { name: '"잠깐 나갔다 올게" 후 혼자 죽음', desc: '무리에서 떨어진 인물이 가장 먼저 사망.', tip: '전복: 혼자 간 인물이 멀쩡히 돌아오고, 정작 함께 있던 무리가 당하게 — 안전의 통념을 뒤집어라.' },
      { name: '고장난 차·안 터지는 휴대폰', desc: '결정적 순간 차가 안 걸리고 신호가 없다.', tip: '전복: 차도 멀쩡하고 신호도 잡히는데 — 전화를 받은 상대가 이미 위협의 일부였다는 반전으로.' },
      { name: '거울 보면 등 뒤에 무언가', desc: '거울에 비친 등 뒤의 형체, 또는 다르게 움직이는 거울 속 나.', tip: '전복: 거울 속이 정상이고 현실의 등 뒤에 있게 — 또는 거울 속 "나"가 더 정상이라 진짜를 의심하게.' },
      { name: '아이의 웃음소리·보이지 않는 친구', desc: '빈방의 동요, 아이의 "보이지 않는 친구", 텅 빈 눈의 인형·광대.', tip: '전복: 보이지 않는 친구가 아이를 "지키는" 존재라, 진짜 위협은 어른 쪽이게 만들어라.' },
      { name: '동물이 먼저 이상 반응', desc: '개·고양이가 한 곳을 보며 으르렁 → 위험 감지.', tip: '전복: 동물이 위협을 감지한 게 아니라 "위협의 편"이 되어 있게 — 가장 믿던 반려가 변했다.' },
      { name: '"이 마을엔 오면 안 됐어" 경고', desc: '주유소 직원·노인이 외부인에게 던지는 불길한 경고.', tip: '전복: 경고한 사람이야말로 함정의 미끼게 — 친절한 경고가 사실 사냥의 일부.' },
      { name: '다 끝난 줄 알았는데 손이 불쑥', desc: '괴물 퇴치 후 마지막 점프스케어로 손이 튀어나옴.', tip: '전복: 점프스케어를 기대하게 만든 뒤 아무 일도 안 일어나고, 진짜 공포는 그 다음 평온한 일상에 숨겨라.' },
      { name: '"다들 날 미쳤다고 한다"', desc: '아무도 안 믿어주는 신뢰받지 못하는 주인공.', tip: '전복: 사실 주인공이 정말로 신뢰 불가능한 화자게 — 독자가 믿었던 시점 자체가 거짓이었다.' },
      { name: '폭풍우·정전과 동시 사건', desc: '천둥·번개·정전이 공포 사건과 정확히 겹친다.', tip: '전복: 가장 화창한 대낮, 사람 많은 곳에서 일어나게 — 날씨의 안전판을 치우면 공포가 도망갈 곳이 없다.' },
      { name: '봉인·금기를 어기는 호기심', desc: '"열지 마/읽지 마/가지 마"를 호기심 많은 인물이 어긴다.', tip: '전복: 금기를 어긴 게 아니라 "지킨" 것이 화를 부르게 — 봉인이 사실 괴물을 가두는 게 아니었다.' },
      { name: '죽은 줄 알았던 악역의 부활', desc: '쓰러진 살인마/괴물이 다시 일어선다.', tip: '전복: 부활을 안 시키되 "씨앗"을 남겨라 — 괴물은 죽었지만 저주·알·전염자가 조용히 옮겨갔다.' },
      { name: '낡은 일기·녹음·비디오 발견', desc: '이전 거주자/희생자의 기록을 발견해 진실을 안다.', tip: '전복: 기록이 거짓이거나, 기록자가 곧 위협이거나, 기록을 읽는 행위 자체가 저주의 전염 조건이게.' },
      { name: '교회·성수·소금으로 퇴치', desc: '신앙의 도구가 괴물을 물리친다.', tip: '전복: 그 신앙 체계가 괴물에게 무의미하거나(우주적 공포), 오히려 괴물이 그 신앙의 산물이게.' },
    ],
  },
  {
    key: 'taboo', label: '금기·불쾌의 원천', icon: '🚫', note: '인간이 본능적으로 두려워하는 보편 금기. 셋 다 건드릴수록 강하게 반응하나, 윤리적 통제가 필요하다.',
    items: [
      { name: '죽음·시신', desc: '시체·부패·매장의 이미지. 가장 원초적인 공포의 대상이자 모든 호러의 뿌리.', tip: '시신을 "낯설게" 만들어라 — 익숙한 얼굴이 시신이 되거나, 시신이 미세하게 움직이는 언캐니로.' },
      { name: '신체 훼손·변형', desc: '절단·기형·내부 노출·비정상적 변형. 몸의 경계가 무너지는 공포(바디 호러).', tip: '한 번에 다 보여주지 말고 단계적으로 — "조금씩 변해가는 과정"이 완성된 괴물보다 끔찍하다.' },
      { name: '집(안전 공간)의 침범', desc: '내 집·침대·방이 더 이상 안전하지 않음. 가장 사적이고 무방비한 곳의 배반.', tip: '독자가 매일 자는 침대·욕실·현관을 위협으로 — "집에서조차 안전하지 않다"가 최대 공포.' },
      { name: '어린이의 위협·피해', desc: '아이가 위험에 처하거나, 아이 자체가 섬뜩한 존재가 됨. 보호 본능을 직격.', tip: '윤리적 통제가 필수 — 아동의 피해를 자극으로만 소비하지 말고, "지켜야 할 것"의 위기로 다뤄라.' },
      { name: '임신·출산·모체', desc: '몸 안에서 자라는 무언가, 변형되는 모체. 창조와 침입이 겹치는 깊은 불안.', tip: '"내 몸 안의 타자"라는 양가성을 활용 — 사랑과 공포가 한 대상에 겹칠 때 가장 복잡한 불안이 된다.' },
      { name: '얼굴의 상실·무표정', desc: '얼굴 없음, 표정 없음, 입이 없거나 너무 많음. 소통과 인간성의 표지가 사라지는 공포.', tip: '얼굴은 인간성의 핵심 — 그것을 지우거나 어긋나게 하면 "사람 같은데 사람이 아닌" 언캐니가 극대화된다.' },
      { name: '자기 통제의 상실', desc: '내 몸·말·행동이 내 뜻과 무관하게 움직임(빙의·기생·최면). 자아의 주권 상실.', tip: '"내가 내 손을 못 믿는다"의 순간을 구체화하라 — 자기 입에서 낯선 말이 나오는 공포.' },
      { name: '정체성·기억의 붕괴', desc: '내가 누구인지·무엇이 진짜인지 모르게 됨. 기억의 왜곡·대체된 가족·가짜 현실.', tip: '독자의 인식 토대를 함께 무너뜨려라 — "이게 진짜인가"를 인물과 독자가 동시에 의심하게.' },
      { name: '오염·전염·기생', desc: '내 몸·물·음식·공기가 오염됨. 보이지 않는 것이 안으로 들어오는 공포.', tip: '"이미 들어왔을지도 모른다"는 불확실성이 핵심 — 잠복기·무증상 감염으로 의심을 증폭하라.' },
      { name: '무한·심연·압도적 규모', desc: '끝없는 복도·바닥 없는 구덩이·우주의 무한. 인간 척도를 초월한 것 앞의 왜소함(우주적 공포).', tip: '규모로 압도하라 — 인간이 "먼지처럼 작다"는 감각, 헤아릴 수 없는 깊이·시간·존재를 암시.' },
    ],
  },
  {
    key: 'lore', label: '고증·민속 지식', icon: '🔮', note: '귀신·퇴마·저주의 핍진성을 받치는 배경 지식. 사실에 한 스푼의 환상을 더하는 출발점.',
    items: [
      { name: '한(恨)과 원귀의 논리', desc: '한국 귀신의 핵심 동력. 억울한 죽음·풀지 못한 원이 영을 이승에 묶는다. 한을 풀면 성불한다.', tip: '귀신의 "한"을 구체적 사연으로 설계하라 — 풀어주는 결말(해원)과 못 푸는 결말 모두 가능.' },
      { name: '무속·굿·살(煞)', desc: '무당·신내림·굿(천도굿·씻김굿)·살풀이. 한국 무속의 퇴마·해원 체계. 동티·터줏대감·금줄.', tip: '굿의 절차와 금기를 룰로 — "굿 도중 뒤돌아보면 안 된다" 같은 규칙이 긴장 장치가 된다.' },
      { name: '제사·차례·조상신', desc: '죽은 조상을 모시는 의례. 거르거나 잘못 지내면 화를 부른다는 믿음. 위패·지방·음복.', tip: '"제사를 안 지낸 집", "버려진 위패" 같은 의례의 단절을 공포의 발단으로 삼아라.' },
      { name: '묫자리·이장·풍수', desc: '명당·흉지·동티. 묘를 잘못 쓰거나 함부로 옮기면 후손이 화를 입는다는 믿음.', tip: '"이장 후 시작된 불행" 구조 — 건드리면 안 될 터를 건드린 인과를 깔아라.' },
      { name: '엑소시즘(가톨릭 퇴마)', desc: '서구 오컬트의 퇴마 의식. 사제·성수·십자가·라틴어 기도·구마 예식. 빙의의 징후 판별.', tip: '구마는 "절차"가 곧 긴장 — 단계마다 악마가 반격하고, 사제의 믿음/죄가 약점이 된다.' },
      { name: '빙의의 징후', desc: '목소리 변화·외국어/금기 지식·신체 변형·괴력·신성 모독·혐오 반응. 빙의 판별의 고전 징표.', tip: '징후를 점진적으로 — 처음엔 설명 가능한 증상에서 점차 부정할 수 없는 단계로 올려라.' },
      { name: '그리무아르·금서', desc: '마법·소환의 비전이 담긴 책(러브크래프트의 『네크로노미콘』). "읽으면 안 되는 지식"의 매개.', tip: '책을 읽는 행위 자체가 저주의 시작 — 금지된 지식의 처벌 구조와 결합하라.' },
      { name: '소환·계약·대가', desc: '악마·정령을 부르는 의식과 그 대가(영혼·생명·이름). 무엇을 주고 무엇을 받는가의 거래.', tip: '"대가"를 명확히 하라 — 소환의 이득보다 치를 값이 클 때, 독자는 인물의 파멸을 예감하며 조인다.' },
      { name: '저주 인형·주술(부두 등)', desc: '대상을 본뜬 인형·머리카락·이름을 매개로 한 저주. 접촉·유사의 주술 원리.', tip: '저주의 "재료"(대상의 일부)와 "조건"을 설계하라 — 주술의 규칙이 곧 회피·역전의 룰이 된다.' },
      { name: '뱀파이어·언데드의 규칙', desc: '햇빛·십자가·마늘·말뚝·초대·흐르는 물·세는 강박. 흡혈귀 정전(브램 스토커)의 약점 체계.', tip: '고전 규칙을 그대로 쓰거나 한두 개만 비틀어라 — 변형된 규칙 하나가 신선함과 긴장을 동시에 준다.' },
      { name: '늑대인간·보름달', desc: '보름달의 변신·은(銀)의 약점·물린 자의 전염. 짐승 본성과 인간성의 분열.', tip: '변신 주기를 카운트다운으로 — "다음 보름달까지" 같은 타임리밋과 결합하면 압박이 산다.' },
      { name: '터부와 금줄·부적', desc: '들어가면 안 되는 곳, 금줄·소금·팥·부적의 방어. 경계를 표시하고 악을 막는 민속 장치.', tip: '방어 수단의 "한계"를 정해라 — 부적이 떨어지거나 소금이 다하는 순간이 위기의 트리거.' },
      { name: '도시전설의 룰', desc: '"비디오를 보면 7일", "12시에 거울 보며 이름 세 번", "빨간 종이 파란 종이". 현대 괴담의 게임 규칙.', tip: '독자가 외울 만큼 명확한 룰을 만들고 엄격히 집행하라 — 규칙의 정밀함이 도시괴담의 생명.' },
    ],
  },
  {
    key: 'web', label: '웹소설·연재 관습', icon: '📱', note: '웹 연재 호러의 연독률을 좌우하는 리듬. 짧은 호흡·매 화 클리프행어·초반 임팩트.',
    items: [
      { name: '초반 3화 첫 공포', desc: '도입부에서 빠르게 첫 공포 사건을 터뜨려 독자를 붙잡는다. 빌드업을 5화 뒤로 미루면 이탈.', tip: '1화 끝에 불길한 한 방, 3화 안에 부정할 수 없는 진짜 사건. "이 작품의 맛"을 일찍 증명하라.' },
      { name: '매 화 끝 클리프행어', desc: '회차 마지막을 충격·불길한 암시·위기로 닫아 다음 화를 보게 한다.', tip: '"다음 화 안 보면 못 견디는" 문장으로 끊어라 — 등장 직전, 문 여는 순간, 전화벨이 명당.' },
      { name: '회차당 한 공포 사건', desc: '한 회차에 핵심 공포 하나(+불길한 떡밥 하나)로 집중. 정보 과부하를 피한다.', tip: '5,000자에 사건 셋을 욱여넣으면 흐려진다. 하나를 깊게 조이고 끝에 떡밥 하나.' },
      { name: '시스템·규칙의 게임화', desc: '게이트·던전·도시괴담물에서 공포를 "규칙 있는 생존 게임"으로 — 점수·페널티·생존 조건.', tip: '독자가 규칙을 파악하며 함께 머리를 굴리게 — "이 규칙을 어떻게 깰까"의 지적 긴장을 더하라.' },
      { name: '호러+성장·전투의 배합', desc: '공포(분위기)와 성장·사이다(전투·각성)의 비율 조절. 한국 웹소설 흥행 호러의 핵심.', tip: '초반은 무력한 호러로, 중반부터 생존·반격의 쾌감을 — 너무 강해지면 공포가 죽으니 위협도 함께 키워라.' },
      { name: '떡밥-회수 리듬', desc: '심은 복선(괴물의 정체·저주의 기원·과거의 비극)을 적절한 간격으로 회수해 신뢰를 쌓는다.', tip: '떡밥은 회수할 때 더 큰 공포가 되게 — 풀린 진실이 안도가 아니라 절망이어야 한다.' },
      { name: '스크롤·여백 점프스케어(웹툰)', desc: '긴 여백·세로 스크롤로 손가락 속도를 계산한 점프스케어. 호랑 식 연출의 정수.', tip: '독자가 스크롤하며 다음을 기대하는 타이밍에 갑작스러운 컷을 — 여백의 길이가 곧 긴장의 길이.' },
      { name: '댓글·독자 추리 유도', desc: '괴담의 규칙·범인·정체를 독자가 추리하게 떡밥을 흘려 회차 간 체류·재방문을 만든다.', tip: '"이 규칙의 빈틈은?", "저 인물의 정체는?"을 독자가 토론하게 — 참여가 연독으로 이어진다.' },
      { name: '권태기 방지(중반 새 위협)', desc: '익숙해진 괴물·공간에 새 규칙·새 적·더 큰 진실을 투입해 긴장을 재점화.', tip: '"이 괴물엔 익숙해졌다" 싶을 때 판을 키워라 — 더 무서운 것이 뒤에 있었다는 격상.' },
      { name: '문체: 짧은 호흡·줄바꿈', desc: '긴 만연체보다 짧고 끊어지는 문장. 결정적 순간의 한 줄 단락·여백으로 충격을 제어.', tip: '점프스케어 직전엔 짧게 끊고, 충격은 한 줄로 독립시켜라 — 여백이 비명의 공간이 된다.' },
    ],
  },
]

// 관련 도구(연계) — 호러 인물·공간·장면·반전·정서 설계 도구로 잇는다(존재하는 도구 위주).
const RELATED: { id: string; label: string }[] = [
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
  { id: 'setting-bible', label: '🏚️ 배경 설정집' },
  { id: 'scene-forge', label: '🎬 장면 대장간' },
  { id: 'conflict-builder', label: '⚔️ 갈등 설계기' },
  { id: 'plot-twist-deck', label: '🃏 반전 덱' },
  { id: 'sensory-palette', label: '👁️ 감각 팔레트' },
  { id: 'scene-weather', label: '🌧️ 장면 날씨' },
  { id: 'name-mixer', label: '🔤 이름 믹서' },
]

const LS = 'sry:tool:horror-knowledge:'
const ALL_KEY = '__all__'
const flatAll = (): { cat: CatDef; item: Entry }[] =>
  CATS.flatMap((c) => c.items.map((item) => ({ cat: c, item })))

const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function HorrorKnowledge({ payload }: { payload?: Record<string, unknown> }) {
  // payload.genre 활용: 다른 장르 컨텍스트로 열려도 호러 전용 사전임을 안내.
  const ctxGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : undefined

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(LS + 'cat')
      if (raw && (raw === ALL_KEY || CATS.some((c) => c.key === raw))) return raw
    } catch { /* ignore */ }
    return ALL_KEY
  })
  // 펼친 항목 키 집합 ("catKey::name")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // 즐겨찾기 ("catKey::name")
  const [favs, setFavs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + 'favs')
      if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') return o as Record<string, boolean> }
    } catch { /* ignore */ }
    return {}
  })
  const [onlyFav, setOnlyFav] = useState(false)
  const [random, setRandom] = useState<{ cat: CatDef; item: Entry } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // 영속 저장
  useEffect(() => { try { localStorage.setItem(LS + 'cat', cat) } catch { /* ignore */ } }, [cat])
  useEffect(() => { try { localStorage.setItem(LS + 'favs', JSON.stringify(favs)) } catch { /* ignore */ } }, [favs])
  // 언마운트 정리: 토스트/복사표시 상태 리셋
  useEffect(() => () => { setToast(null); setCopiedKey(null) }, [])

  const total = useMemo(() => CATS.reduce((n, c) => n + c.items.length, 0), [])
  const key = (catKey: string, name: string) => `${catKey}::${name}`

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (onlyFav) base = base.filter(({ cat: c, item }) => favs[key(c.key, item.name)])
    if (q) base = base.filter(({ cat: c, item }) =>
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (item.tip || '').toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q))
    return base
  }, [query, cat, onlyFav, favs])

  const rollRandom = useCallback(() => {
    const pool = cat === ALL_KEY
      ? flatAll()
      : CATS.filter((c) => c.key === cat).flatMap((c) => c.items.map((item) => ({ cat: c, item })))
    if (!pool.length) { setRandom(null); return }
    setRandom((prev) => {
      let pick = pool[Math.floor(Math.random() * pool.length)]
      if (prev && pool.length > 1 && pick.item.name === prev.item.name && pick.cat.key === prev.cat.key)
        pick = pool[Math.floor(Math.random() * pool.length)]
      // 무작위로 뽑은 항목은 펼쳐 둔다
      setOpen((o) => ({ ...o, [key(pick.cat.key, pick.item.name)]: true }))
      return pick
    })
  }, [cat])

  const toggleOpen = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setOpen((o) => ({ ...o, [k]: !o[k] }))
  }
  const toggleFav = (catKey: string, name: string) => {
    const k = key(catKey, name)
    setFavs((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n })
  }

  const copy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey((c) => (c === id ? null : c)), 1500)
    }).catch(() => { /* graceful */ })
  }
  const itemText = (c: CatDef, item: Entry) =>
    `${c.icon} ${c.label} · ${item.name}\n${item.desc}` + (item.tip ? `\n[활용] ${item.tip}` : '')

  // 연계: 현재 항목을 글감 스니펫으로 공유 라이브러리에 저장(다른 도구에서 재사용).
  const saveSnippet = (c: CatDef, item: Entry) => {
    addToLibrary('snippets', {
      text: itemText(c, item),
      source: '호러·공포 지식 사전 · ' + c.label,
      tags: ['호러·공포', c.label],
    })
    setToast(`스니펫 라이브러리에 ‘${item.name}’을(를) 저장했습니다.`)
    window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
  }

  // 연계: 현재(무작위 또는 펼친) 항목을 프로젝트 자료 〈호러 지식〉 폴더에 메모로 추가.
  const addItemToProject = (c: CatDef, item: Entry) => {
    if (!hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${escapeHtml(c.icon + ' ' + c.label)} · ${escapeHtml(item.name)}</b></p>`,
      `<p>${escapeHtml(item.desc)}</p>`,
      item.tip ? `<p><b>💡 활용</b><br>${escapeHtml(item.tip)}</p>` : '',
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '호러 지식',
      title: `${item.name} (${c.label})`, bodyHtml,
      meta: { 장르: '호러·공포', 분류: c.label },
    })
    if (id) {
      setToast(`프로젝트 자료 〈호러 지식〉에 ‘${item.name}’을(를) 추가했습니다.`)
      window.setTimeout(() => setToast((t) => (t && t.includes(item.name) ? null : t)), 2200)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }

  const curCatNote = cat !== ALL_KEY ? CATS.find((c) => c.key === cat)?.note : undefined

  return (
    <div style={wrap}>
      <div style={hint}>
        호러·공포 장르에서 자주 쓰는 소재·설정·서사 장치·고증 지식 <b>{total}개</b>를 <b>{CATS.length}개</b> 카테고리로 모았습니다.
        검색·펼침·무작위로 찾고, 마음에 드는 항목을 공포 장면에 심어 보세요.
        {ctxGenre && ctxGenre !== '호러·공포' && (
          <span style={{ color: 'var(--accent)' }}> (현재 ‘{ctxGenre}’ 컨텍스트 — 이 사전은 호러·공포 전용입니다)</span>
        )}
      </div>

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름·설명·활용으로 검색 (예: 드레드, 언캐니, 원혼, 점프스케어, 저주, final girl)"
        style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className="minibtn" onClick={() => setCat(ALL_KEY)} aria-pressed={cat === ALL_KEY}
          style={{ borderColor: cat === ALL_KEY ? 'var(--accent)' : 'var(--border)', color: cat === ALL_KEY ? 'var(--text)' : 'var(--muted)' }}>
          <Emoji e="✨"/> 전체
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

      {/* 동작 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={rollRandom} style={{ flex: '0 0 auto' }}><Emoji e="🎲"/> 무작위 소재</button>
        <button className="minibtn" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}
          style={{ borderColor: onlyFav ? 'var(--accent)' : 'var(--border)', color: onlyFav ? 'var(--text)' : 'var(--muted)' }}>
          {onlyFav ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}
        </button>
        <span style={{ ...hint, marginLeft: 'auto' }}>{filtered.length}개 표시</span>
      </div>

      {curCatNote && (
        <div style={{ ...hint, fontStyle: 'italic', borderLeft: '3px solid var(--accent)', paddingLeft: 8 }}>{curCatNote}</div>
      )}

      {/* 무작위 결과 강조 */}
      {random && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}><Emoji e={random.cat.icon}/> {random.cat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{random.item.name}</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setRandom(null)}>✕</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0' }}>{random.item.desc}</div>
          {random.item.tip && (
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--accent)' }}><Emoji e="💡"/> {emojify(random.item.tip)}</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copy(itemText(random.cat, random.item), 'rnd')}>
              {copiedKey === 'rnd' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
            </button>
            <button className="minibtn" onClick={() => toggleFav(random.cat.key, random.item.name)}>
              {favs[key(random.cat.key, random.item.name)] ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'}
            </button>
            <button className="minibtn" onClick={() => saveSnippet(random.cat, random.item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾"/> 글감 저장</button>
          </div>
          {/* 연계: 프로젝트에 추가 */}
          <div className="linkbar" style={{ marginTop: 8 }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={() => addItemToProject(random.cat, random.item)} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈호러 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </div>
      )}

      {/* 추가 성공 토스트 */}
      {toast && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)' }}>
          ✓ {toast}
        </div>
      )}

      {/* 목록 (펼침형) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', padding: '28px 12px' }}>
            {onlyFav ? '☆ 아직 즐겨찾기한 소재가 없습니다. 항목의 별을 눌러 모아 보세요.' : '검색 결과가 없습니다. 다른 말로 찾아보세요.'}
          </div>
        ) : (
          filtered.map(({ cat: c, item }) => {
            const k = key(c.key, item.name)
            const isOpen = !!open[k]
            const isFav = !!favs[k]
            const copyId = 'it:' + k
            return (
              <div key={k} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleOpen(c.key, item.name)}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}><Emoji e={c.icon}/> {c.label}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{isOpen ? '▲ 접기' : '▼ 펼치기'}</span>
                  <button className="minibtn" title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                    onClick={(e) => { e.stopPropagation(); toggleFav(c.key, item.name) }}
                    style={{ flexShrink: 0, borderColor: isFav ? 'var(--accent)' : 'var(--border)' }}>
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
                {!isOpen && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                )}
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.55 }}>{item.desc}</div>
                    {item.tip && (
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 5, color: 'var(--accent)' }}><Emoji e="💡"/> {emojify(item.tip)}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <button className="minibtn" onClick={() => copy(itemText(c, item), copyId)}>
                        {copiedKey === copyId ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}
                      </button>
                      <button className="minibtn" onClick={() => setRandom({ cat: c, item })} title="이 소재를 강조 보기"><Emoji e="🔎"/> 강조 보기</button>
                      <button className="minibtn" onClick={() => saveSnippet(c, item)} title="이 항목을 글감 스니펫으로 저장"><Emoji e="💾"/> 글감 저장</button>
                      <button className="linkbtn" onClick={() => addItemToProject(c, item)} disabled={!hasProjectBridge()}
                        title={hasProjectBridge() ? '이 소재를 프로젝트 자료 〈호러 지식〉 폴더에 메모로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                        📄 프로젝트에 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 관련 도구 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">관련 도구:</span>
        {RELATED.map((r) => (
          <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '호러·공포' })} title={`${r.label} 열기`}>
            {emojify(r.label)}
          </button>
        ))}
      </div>

      <div style={hint}>지식은 정답이 아니라 출발점입니다. 클리셰는 전복 포인트로 갱신하고, 보여주지 말아야 할 것은 끝까지 가려 인물·장면에 슬쩍 심어 보세요.</div>
    </div>
  )
}
