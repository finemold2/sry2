// 스릴러 트로프·관습 체크리스트 — '스릴러·서스펜스' 장르 전용. 독자 기대·필수 요소·서사 장치·구조/페이싱·
//   클라이맥스 관습·흔한 클리셰(+비틀기)를 카테고리별 체크리스트로 점검한다. 자급식(react + linkbus 만).
//  카테고리 펼침/접힘 + 검색 필터 + 항목 클릭 복사 + 사용자 항목 추가/삭제 + 카테고리별·전체 진행률,
//  '기획' 폴더로 프로젝트 문서 추가, 클리셰 비틀기 무작위 제안 + 스니펫 저장, 관련 도구 열기.
//  모든 상태는 localStorage('sry:tool:thriller-tropes')에 자동 저장/복원. 차단/손상 시 graceful(throw 금지).
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = { id: 'thriller-tropes', name: '스릴러 트로프·관습 체크리스트', icon: '🕵️', group: '구상·정리', genre: '스릴러·서스펜스', intro: '스릴러·서스펜스 독자 기대·필수 요소·서사 장치·흔한 클리셰(+비틀기)를 체크리스트로 점검하세요', w: 680, h: 660 }

const LS_KEY = 'sry:tool:thriller-tropes'

// ── 항목 타입 ──
// kind: 'expect' 독자 기대 | 'must' 필수 요소 | 'device' 서사 장치 | 'struct' 구조·페이싱 | 'climax' 클라이맥스 | 'cliche' 흔한 클리셰
interface Item {
  id: string        // 안정적 id (cat:slug)
  text: string      // 점검 문장
  hint?: string     // 보조 설명/실무 팁
  twist?: string    // (클리셰 한정) 비틀기 제안
}
interface Cat {
  key: string
  name: string
  icon: string
  desc: string
  items: Item[]
}

// 스릴러·서스펜스 도시에에 근거한 풍부한 자작 데이터(장르 특화·구체). 일반론 금지.
const CATS: Cat[] = [
  {
    key: 'expect',
    name: '독자 기대',
    icon: '🎯',
    desc: '스릴러를 펼친 독자가 당연히 바라는 약속 — 못 채우면 "사기당했다"는 반응',
    items: [
      { id: 'expect:threat', text: '페이지마다 "뭔가 잘못될 수 있다"는 위협감이 흐르는가', hint: '평온은 짧게, 항상 다음 위협의 그림자를 깔아 둔다.' },
      { id: 'expect:stakes', text: '이해관계(stakes)가 분명하고 점점 커지는가', hint: '개인적 위험 → 가족 → 공동체 → 다수, 혹은 "이 한 사람을 살리는 게 곧 전부"로 응축.' },
      { id: 'expect:clock', text: '시간 압박(티킹 클락)이 작동하는가', hint: '폭탄 타이머 같은 명시적 마감이든, 밤이 오면·약효가 떨어지면 같은 암묵적 마감이든.' },
      { id: 'expect:villain', text: '주인공과 대등하거나 한 수 위인 적대자가 있는가', hint: '통념: "스릴러의 질은 빌런의 질에 비례한다." 빌런이 똑똑하고 한발 앞서야 긴장이 산다.' },
      { id: 'expect:vulnerable', text: '주인공이 유능하되 취약한가 (무적이 아닌가)', hint: '다치고, 속고, 실수해야 독자가 결과를 의심하며 긴장한다.' },
      { id: 'expect:twist', text: '판도를 뒤집는 반전이 최소 한 번 있는가', hint: '단, 복선이 미리 깔려 "공정한" 반전이어야 한다.' },
      { id: 'expect:pace', text: '짧은 장·장면 말미의 훅으로 빠른 페이싱이 유지되는가', hint: '군더더기 없는 산문, 장 끝마다 다음을 읽게 만드는 동력.' },
      { id: 'expect:payoff', text: '끌어올린 긴장에 값하는 해소(카타르시스)가 있는가', hint: '위협의 무력화 또는 다크 스릴러라면 의도된 좌절감까지 — 무해소는 금물.' },
      { id: 'expect:notrust', text: '"믿을 사람이 없다"는 편집증적 불신을 자극하는가', hint: '조력자의 배신 가능성, 권위자에 대한 의심을 깔아 둔다.' },
    ],
  },
  {
    key: 'must',
    name: '필수 요소',
    icon: '✅',
    desc: '빠지면 스릴러로 성립하지 않는 약속(컨벤션)',
    items: [
      { id: 'must:incite', text: '개입 사건(Inciting Incident)이 주인공을 위협으로 끌어들이는가', hint: '1막에서 평범한 일상이 깨지며 주인공이 사건에 연루된다.' },
      { id: 'must:ponr', text: '"되돌아갈 수 없는 선(Point of No Return)"이 1막 끝에 있는가', hint: '이 지점 이후 주인공은 도망칠 수 없고 끝까지 갈 수밖에 없다.' },
      { id: 'must:escalate', text: '위협이 매 시퀀스마다 한 단씩 올라가는가', hint: '같은 강도의 위협 반복은 지루함. 개인→가까운 이→다수, 또는 추상→구체로 상승.' },
      { id: 'must:active', text: '주인공의 능동적 선택이 결말을 이끄는가', hint: '우연·중간자·구조대가 아니라 주인공이 직접 부딪쳐 해결해야 만족도가 높다.' },
      { id: 'must:antlogic', text: '적대자의 계획·동기가 그 나름 타당한가', hint: '빌런의 논리가 허술하면 위협이 가짜처럼 느껴진다.' },
      { id: 'must:fair', text: '핵심 단서·복선이 충분히 일찍 (그러나 눈에 안 띄게) 심겼는가', hint: '같은 사실이 1회독엔 무해, 재독엔 결정적이 되도록 배치 — 공정한 반전의 핵심.' },
      { id: 'must:reveal', text: '핵심 진실은 가능한 한 늦게 공개하는가 (정보 지연)', hint: '"거의 다 알 것 같은데 결정적 1조각이 없는" 상태를 길게 유지.' },
      { id: 'must:hook', text: '장(챕터) 끝마다 결정·폭로·위협·역전 직전에서 끊는 훅이 있는가', hint: '댄 브라운/패터슨식 클리프행어. 평탄하게 끝나는 장이 연속되면 추진력이 죽는다.' },
      { id: 'must:cost', text: '승리에 희생·상처(도덕적 대가)가 따르는가', hint: '무손실 승리는 싱겁다고 평가된다.' },
    ],
  },
  {
    key: 'device',
    name: '서사 장치',
    icon: '🧰',
    desc: '스릴러·서스펜스 고유의 긴장 제조 도구 — 한 작품에 여러 개를 의도적으로 운용',
    items: [
      { id: 'device:irony', text: '정보 비대칭을 장면 단위로 설계했는가 (독자가 더/덜 아는 상태 전환)', hint: '독자>인물=서스펜스, 독자=인물=동행, 독자<인물=서프라이즈. 히치콕의 "테이블 밑 폭탄".' },
      { id: 'device:macguffin', text: '추동 물건/정보(맥거핀)가 모두를 움직이는가', hint: '서류·코드·USB·핵코드처럼 내용보다 "모두가 쫓는다"는 사실이 중요한 물건.' },
      { id: 'device:redherring', text: '의심을 엉뚱한 곳으로 돌리는 레드 헤링이 있는가', hint: '가짜 단서·가짜 용의자. 단, 회수되거나 의미가 정리되어야 한다.' },
      { id: 'device:chekhov', text: '체호프의 총을 심고 클라이맥스에서 회수하는가', hint: '초반에 무심히 보여준 흉터·약·비밀번호·알레르기를 결정적 순간에 터뜨린다.' },
      { id: 'device:unreliable', text: '신뢰할 수 없는 화자를 (의도적으로) 쓰는가', hint: '기억상실·거짓말·정신질환·음주·선택적 서술. 『나를 찾아줘』 이후 도메스틱 스릴러의 표준 무기.' },
      { id: 'device:dualtime', text: '이중 시점 교차 + 시간선 분절로 정보를 통제하는가', hint: '"지금"과 "그때"를 교차해 공개를 지연. 챕터 머리에 시점/시간 라벨.' },
      { id: 'device:domestic', text: '안전해야 할 곳을 위협의 근원으로 뒤집는가 (위장된 일상성)', hint: '집·이웃·결혼·학교·학부모 모임이 도리어 공포의 진원지가 된다.' },
      { id: 'device:falseally', text: '잘못된 신뢰(조력자=배신자, 권위자=흑막)를 심었는가', hint: '"믿을 사람이 없다"는 편집증을 키우는 장치.' },
      { id: 'device:catmouse', text: '추격·은신·함정(캣앤마우스) 시퀀스가 물리적 긴장을 주는가', hint: '쫓고-숨고-덫에 거는 3종 기본 동작을 변주.' },
      { id: 'device:coldopen', text: '콜드 오픈/미래 위기 선공개로 첫 페이지를 장악하는가', hint: '시체 발견·위기 장면을 먼저 보여주고 "○○시간 전"으로 회귀(과용은 클리셰).' },
    ],
  },
  {
    key: 'struct',
    name: '구조·페이싱',
    icon: '📈',
    desc: '위협 점증 곡선과 완급 — 비트시트 점검',
    items: [
      { id: 'struct:act1', text: '1막(약 25%): 일상 → 개입 사건 → 포인트 오브 노 리턴으로 닫는가', hint: '주인공이 돌이킬 수 없이 사건에 묶이는 지점에서 1막을 끝낸다.' },
      { id: 'struct:mid', text: '중간점(50%)에서 큰 반전/판세 역전이 일어나는가', hint: '가짜 승리, 또는 진짜 위협의 실체가 드러나는 전환.' },
      { id: 'struct:allislost', text: '"모든 것을 잃은 순간(All Is Lost)"이 75% 부근에 있는가', hint: '조력자 상실, 신뢰 붕괴, 적이 우위에 선 최저점.' },
      { id: 'struct:act3', text: '3막(75~100%): 마지막 퍼즐 → 대결 → 해소 → 짧은 여진으로 가는가', hint: '마지막 한 줄 반전(스팅어)으로 여운을 남기기도.' },
      { id: 'struct:scenevalue', text: '각 장면이 가치 상태(+/-)를 반드시 바꾸는가', hint: '"목표→장애→부분 해결+더 큰 새 위협"의 진동. 긴장이 정체되는 장면은 들어낸다.' },
      { id: 'struct:rhythm', text: '고강도 장면 뒤 짧은 호흡(숨 고르기)으로 완급을 주는가', hint: '완급 없이 계속 빠르면 둔감해진다. 폭로 뒤 감정·정보 정리 → 다시 가속.' },
      { id: 'struct:shortch', text: '짧은 장·능동태·짧은 문장으로 가속하는가', hint: '위협 임박 시 단문·현재형 체감을 활용.' },
      { id: 'struct:setting', text: '배경 자체가 압박 장치인가 (폐쇄·고립·감시·탈출 불가)', hint: '폭설 산장·외딴 섬·정전된 빌딩·멈춘 열차/잠수함·잠긴 방. 또는 스마트홈·CCTV의 현대 감시.' },
    ],
  },
  {
    key: 'climax',
    name: '클라이맥스 관습',
    icon: '💥',
    desc: '대결 지점의 만족도를 좌우하는 약속',
    items: [
      { id: 'climax:face', text: '주인공과 적대자가 물리적·심리적으로 정면 대면하는가', hint: '중간자·우연이 아니라 주인공의 능동적 선택으로 해결되어야 한다.' },
      { id: 'climax:worst', text: '주인공이 가장 불리한 조건(무장 해제·고립·부상·시간 부족)에서 맞서는가', hint: '최악의 핸디캡일수록 카타르시스가 크다.' },
      { id: 'climax:payback', text: '심어둔 체호프의 총·복선·진짜 정체가 이 지점에서 회수되는가', hint: '"그래서 그게 그거였구나"의 재배열이 일어나야 한다.' },
      { id: 'climax:clockzero', text: '티킹 클락의 0초와 클라이맥스가 겹치는가', hint: '카운트다운 만료점과 대결의 절정을 일치시킨다.' },
      { id: 'climax:falseend', text: '거짓 결말/막판 부활("마지막 한 방")을 고려했는가', hint: '위협이 끝난 듯하다 한 번 더 솟구침 — 슬래셔·액션 스릴러의 단골(과용 주의).' },
      { id: 'climax:dark', text: '(다크/오픈 엔딩 선택 시) 승리를 박탈하거나 불안을 남기는가', hint: '르카레·플린류. 마지막 한 줄 스팅어로 끝나지 않은 위협을 암시.' },
    ],
  },
  {
    key: 'cliche',
    name: '흔한 클리셰 (+비틀기)',
    icon: '⚠️',
    desc: '닳은 관습 — 피하거나, 비틀어 신선하게. 각 항목에 비틀기 제안이 붙어 있다',
    items: [
      { id: 'cliche:detective', text: '트라우마·이혼·알코올 중독 형사 주인공', twist: '중독 대신 강박적 루틴(특정 시각 점검, 결벽)을 약점이자 무기로. 혹은 멀쩡해 보이지만 도덕이 무너진 형사로.' },
      { id: 'cliche:genius', text: '천재 사이코패스 빌런(모든 걸 예견하는 체스 마스터)', twist: '실수하고 즉흥적이지만 그래서 예측 불가능한 빌런. 또는 평범하고 지루한 인물의 무서움(악의 평범성).' },
      { id: 'cliche:victim', text: '무력하게 비명만 지르는 미녀 피해자', twist: '피해자에게 능동적 생존 기술·정보를 주어 사냥감이 사냥꾼으로 전환되게.' },
      { id: 'cliche:partner', text: '막판에 배신하는 파트너/조력자', twist: '배신을 일찍 독자에게만 흘려 서스펜스로(언제 들킬까), 또는 끝까지 충직해 클리셰 기대를 배신.' },
      { id: 'cliche:onemore', text: '"한 건만 더 하고 은퇴" 베테랑', twist: '이미 은퇴해 무뎌진 자가 억지로 끌려 나와 자기 무능과 싸우게.' },
      { id: 'cliche:informant', text: '죽기 직전 단서를 흘리는 정보원', twist: '정보원이 흘린 말이 의도된 거짓(레드 헤링)이었거나, 살아남아 끝까지 변수가 되게.' },
      { id: 'cliche:fugitive', text: '누명 쓰고 도주하는 주인공', twist: '도주 대신 자수 후 내부에서 진실을 파헤치게, 또는 진짜로 범인일 가능성을 흐려 두기.' },
      { id: 'cliche:return', text: '죽은 줄 알았던 인물의 귀환', twist: '귀환자가 같은 사람이 아님(트라우마·세뇌로 변질), 또는 귀환 자체가 더 큰 함정.' },
      { id: 'cliche:closest', text: '"범인은 가장 가까운 사람"', twist: '독자가 그 관습을 의심하도록 유도한 뒤 진짜로 낯선 자가 범인이게(이중 미스디렉션).' },
      { id: 'cliche:monologue', text: '빌런의 장황한 자백(monologue) 중 탈출', twist: '빌런이 말을 아끼고 행동만, 자백은 녹취·문서로 사후에. 또는 독백이 진짜 함정.' },
      { id: 'cliche:usb', text: 'USB/비밀번호 한 방으로 모든 게 해결', twist: '맥거핀이 손에 들어와도 해독·전달·신뢰 확보라는 새 장애가 줄줄이 생기게.' },
      { id: 'cliche:flashback', text: '미래 위기 선공개 후 "○○시간 전" 회귀', twist: '선공개한 장면의 의미를 결말에서 완전히 뒤집어(같은 화면, 다른 진실) 재방문.' },
      { id: 'cliche:sibling', text: '친자/형제 반전(알고 보니 혈육)', twist: '혈육이 밝혀져도 관계가 나아지지 않거나, 가짜 친자 주장으로 조종당하는 구도.' },
      { id: 'cliche:rainynoir', text: '비 내리는 부패한 대도시·뒷골목 누아르', twist: '눈부신 교외·완벽한 신도시처럼 "밝고 깨끗한" 배경에 부패를 숨겨 대비를 노린다.' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// 스릴러 전제(로그라인) 생성기 — 무작위 조합으로 '말이 되는' 한 문장 전제를 만든다.
//  슬롯 7개의 곱집합(고유 항목). 각 슬롯은 문법 역할이 고정되어 곱집합으로 섞여도 의미가 충돌하지 않는다.
//  조합수 = 34 × 30 × 32 × 28 × 30 × 26 × 30 = 21,385,728,000 (옛 무작위 기능 14가지 대비 +약 213.8억).
// ── 조사(받침) 헬퍼 — "을(를)" 같은 이중표기 절대 노출 금지. 받침을 보고 실제 하나를 출력 ──
function lastSyl(s: string): { jong: number } | null {
  const t = (s || '').replace(/[)\]」』〕"'’”\s.…!?]+$/u, '').trim()
  if (!t) return null
  const ch = t.charCodeAt(t.length - 1)
  if (ch >= 0xac00 && ch <= 0xd7a3) return { jong: (ch - 0xac00) % 28 }
  return null
}
function josa(word: string, withJong: string, woJong: string): string {
  const s = lastSyl(word); if (!s) return woJong; return s.jong ? withJong : woJong
}
function josaRo(word: string): string {
  const s = lastSyl(word); if (!s) return '로'; return s.jong && s.jong !== 8 ? '으로' : '로'
}
const eul = (w: string) => w + josa(w, '을', '를')
const iga = (w: string) => w + josa(w, '이', '가')
const eun = (w: string) => w + josa(w, '은', '는')
const ro = (w: string) => w + josaRo(w)

// 슬롯 1) 주인공(명사) — 문장의 주어. 스릴러에 흔한 직군·처지. (34)
const P_PROTAG: string[] = [
  '해고된 형사', '잠입 수사관', '은퇴한 저격수', '응급실 간호사', '심야 택시 기사',
  '법의학자', '내부 고발자', '실종자의 동생', '보호관찰관', '사설탐정',
  '폭발물 처리반 요원', '항공 관제사', '국선 변호사', '탐사 보도 기자', '협상 전문가',
  '전직 정보요원', '심리 상담사', '시골 보안관', '해킹 전문가', '경호원',
  '구조대원', '교도관', '장의사', '야간 경비원', '통역사',
  '데이터 분석가', '범죄 프로파일러', '청부업자에서 손 씻은 남자', '증인 보호 대상자', '보험 조사관',
  '폐쇄 병동 의사', '잠수부', '전당포 주인', '실직한 회계사',
]
// 슬롯 2) 개입 사건(종결문) — 주인공이 위협에 끌려드는 1막 사건. '~다/~된다'로 끝나는 평서문. (30)
const P_INCITE: string[] = [
  '평범한 하루가 한 통의 협박 전화로 무너진다', '낯선 사람에게서 자기 사진이 든 봉투를 받는다',
  '죽었다던 사람의 목소리로 걸려 온 전화를 받는다', '잠긴 차 트렁크에서 시신을 발견한다',
  '새벽에 옆집에서 새어 나온 비명을 듣는다', '받은 적 없는 소포 안에서 자기 이름표를 찾아낸다',
  '실수로 다른 사람의 가방을 들고 나온다', '오래된 사건 파일이 다시 책상에 올라온다',
  '눈앞에서 목격자가 차에 치이는 장면을 본다', '잘못 걸려 온 전화로 살인 계획을 엿듣는다',
  '집에 돌아오니 누군가 살았던 흔적을 발견한다', '익명의 메시지로 협박 영상을 받는다',
  '의뢰인이 첫 만남 직후 사라진다', '병원 모니터에 낯선 이름이 떠오른다',
  '한밤중 도로에서 피투성이 여자를 태운다', '회사 서버에서 지워진 파일을 우연히 복구한다',
  '오랜 친구가 자살로 위장된 채 발견된다', '낯선 번호로 자신의 위치가 찍힌 사진을 받는다',
  '폐가에서 자기 이름이 적힌 일기를 줍는다', '검시 도중 사라졌어야 할 표식을 발견한다',
  '실종 신고된 아이의 그림을 자기 집에서 찾아낸다', '엘리베이터에 갇힌 채 위협 메시지를 받는다',
  '버려진 휴대폰에서 자신을 찍은 영상을 발견한다', '동료의 죽음이 사고가 아님을 직감한다',
  '되돌려받은 세탁물에서 피 묻은 단추를 찾는다', '한 통의 유서가 자신을 지목하고 있음을 안다',
  '늦은 밤 누군가 자기 집 비밀번호를 누르는 소리를 듣는다', '잃어버린 줄 알았던 열쇠가 범행 현장에서 나온다',
  '낯선 자가 자신의 과거를 정확히 알고 접근해 온다', '잠에서 깨니 모르는 곳에 묶여 있다',
]
// 슬롯 3) 위협/적대자(명사) — '~이/가 노린다'의 주어가 될 명사·명사구. (32)
const P_THREAT: string[] = [
  '얼굴 없는 청부 살인자', '내부의 배신자', '권력을 쥔 흑막', '연쇄 살인범',
  '부패한 고위 간부', '사라진 증인을 쫓는 조직', '정체를 숨긴 스토커', '복수에 미친 옛 동료',
  '비밀을 아는 유일한 목격자', '냉혹한 청소부', '가면을 쓴 추적자', '돈에 매수된 경찰',
  '잠입한 산업 스파이', '광신적 추종자 무리', '계약을 어긴 의뢰인', '국경을 넘나드는 밀수 조직',
  '데이터를 쥔 협박범', '거래를 끊으려는 카르텔', '완벽주의 살인 청부업자', '진실을 묻으려는 재단',
  '신원을 도용한 사칭범', '폭로를 막으려는 정치인', '시한폭탄을 설치한 테러범', '입막음에 나선 제약회사',
  '대를 이은 원한의 가문', '경찰 내부의 두더지', '암호를 노리는 해커 집단', '되살아난 옛 사건의 범인',
  '인질극을 벌이는 강도', '뒤를 봐주던 보스', '실험을 은폐하려는 연구소', '신분을 위장한 잠입자',
]
// 슬롯 4) 시간 압박(부사절) — 쉼표로 이어지는 티킹 클락. 문법상 부사 역할만. (28)
const P_CLOCK: string[] = [
  '제한 시간 72시간 안에', '다음 희생자가 나오기 전에', '날이 밝기 전까지', '마지막 열차가 떠나기 전에',
  '폭탄이 터지기까지 단 두 시간 동안', '약효가 떨어지기 전에', '국경이 봉쇄되기 전에', '재판이 시작되기 전날 밤,',
  '눈보라가 그치기 전까지', '배심원단이 평결을 내리기 전에', '증거가 폐기되기 전에', '통신이 끊기기 전 마지막 한 시간 동안',
  '밀물이 차오르기 전에', '수술이 끝나기 전까지', '정전이 복구되기 전 어둠 속에서', '인질의 산소가 바닥나기 전에',
  '연락이 끊긴 지 48시간째,', '거래가 성사되기 직전에', '경찰이 들이닥치기 전에', '진실이 묻히기 전 마지막 기회로',
  '폭로 방송이 나가기 전까지', '비행기가 이륙하기 전에', '단서가 사라지기 전에', '카운트다운이 0이 되기 전에',
  '계약 만료 자정까지', '독이 온몸에 퍼지기 전에', '추적자가 따라잡기 전에', '마지막 백업이 삭제되기 전에',
]
// 슬롯 5) 핵심 비밀/맥거핀(명사) — '~을/를 쥔 채'에 들어갈 명사구. (30)
const P_SECRET: string[] = [
  '모두가 쫓는 USB 한 개', '지워졌어야 할 감시 영상', '15년 전 묻힌 진실', '뒤바뀐 시신의 정체',
  '비밀 계좌의 암호', '내부 비리를 담은 녹취', '조작된 알리바이', '사라진 증인의 행방',
  '두 얼굴을 가진 협력자의 본명', '봉인된 사건의 진범', '거래의 진짜 목적', '도청된 통화의 마지막 한 마디',
  '바꿔치기된 증거물', '아무도 모르는 생존자', '위조된 신분', '한 장의 결정적 사진',
  '입막음당한 목격자의 증언', '숨겨진 두 번째 유서', '풀리지 않은 암호문', '실험 데이터의 원본',
  '거짓 자백 뒤의 진실', '추적당하는 디지털 지갑', '되찾아야 할 핵심 단서', '묻혀 있던 자백 테이프',
  '뒤늦게 드러난 공범의 정체', '바뀐 DNA 감정서', '봉투 속 협박 사진', '잠긴 금고 안의 장부',
  '삭제된 통화 기록', '한 번도 공개되지 않은 진술서',
]
// 슬롯 6) 폐쇄·압박 배경(명사) — 「」 안 장소. '~에서'로 쓰일 명사. (26)
const P_SETTING: string[] = [
  '폭설로 고립된 산장', '정전된 고층 빌딩', '멈춰 선 야간열차', '외딴 등대',
  '봉쇄된 지하 주차장', '안개에 갇힌 섬', '폐쇄된 병동', '침몰하는 여객선',
  '눈에 파묻힌 국도 휴게소', '비상 격리된 연구소', '불 꺼진 쇼핑몰', '잠긴 지하 벙커',
  '한밤의 종합병원', '인적 끊긴 고속도로', '문이 잠긴 호텔 12층', '통신 두절된 시추선',
  '폭우로 범람한 지하 상가', '버려진 폐공장', '한겨울의 무인 산속 별장', '정원이 미로 같은 외딴 저택',
  '운행을 멈춘 케이블카', '봉인된 지하 데이터 센터', '안갯속 항구 창고', '눈사태로 끊긴 산악 도로',
  '격리된 크루즈선', '전파가 닿지 않는 깊은 협곡',
]
// 슬롯 7) 결말 톤(종결문) — 전제를 닫는 마지막 종결문. '~다/~까/~한다'로 끝나는 평서·의문. (30)
const P_ENDING: string[] = [
  '진실에 다가갈수록 자신이 마지막 표적임을 깨닫는다.', '믿었던 단 한 사람이 끝내 칼을 들이댄다.',
  '살아남으려면 스스로 괴물이 되는 수밖에 없다.', '이긴 줄 알았던 순간, 진짜 게임이 시작된다.',
  '구한 사람이 사실 모든 것의 시작이었다.', '도망칠수록 덫은 점점 더 정교해진다.',
  '진범을 잡았지만 잃은 것은 영영 돌아오지 않는다.', '마지막 문을 열자 자신의 얼굴이 그곳에 있었다.',
  '모든 답을 쥔 순간 가장 사랑한 것을 잃는다.', '비밀이 밝혀지자 적과 아군의 자리가 뒤바뀐다.',
  '되돌릴 수 있는 선은 이미 한참 전에 지나쳤다.', '진실을 말할지 침묵할지, 단 한 번의 선택만 남는다.',
  '쫓던 자가 사실은 자신을 살리려던 사람이었다.', '마지막 순간, 시계는 멈추지 않고 자신만 멈춰 선다.',
  '승리의 대가로 다른 누군가가 그 자리를 대신한다.', '거짓을 덮으려던 거짓이 결국 모두를 집어삼킨다.',
  '살아남은 자는 영원히 그 밤에 갇혀 버린다.', '진실은 밝혀졌지만 아무도 그것을 믿어 주지 않는다.',
  '복수를 끝낸 자리에 남은 것은 텅 빈 자신뿐이다.', '구원자라 믿었던 손이 마지막에 등을 떠민다.',
  '한 사람을 살리려면 또 다른 한 사람을 버려야 한다.', '진실의 무게에 짓눌려 침묵을 택하고 만다.',
  '게임의 규칙을 깬 순간, 모든 판이 새로 짜인다.', '끝까지 살아남은 자가 가장 무서운 자였다.',
  '마침내 적을 마주했을 때 거울 속 자신이 보였다.', '모든 증거가 가리키는 범인은 다름 아닌 자신이었다.',
  '구조 신호가 닿은 순간, 진짜 사냥이 시작된다.', '마지막 한 조각을 맞추자 그림 전체가 거짓이 된다.',
  '살기 위해 내린 결정이 가장 큰 비극을 부른다.', '문이 열렸지만 밖에는 더 깊은 어둠이 기다린다.',
]

// 무작위 한 문장 전제 생성 — 7슬롯 곱집합. 자연스러운 조사 출력.
function buildPremise(r: () => number): string {
  const pick = (a: string[]) => a[Math.floor(r() * a.length)]
  const setting = pick(P_SETTING)
  const protag = pick(P_PROTAG)
  const incite = pick(P_INCITE)
  const clock = pick(P_CLOCK)
  const threat = pick(P_THREAT)
  const secret = pick(P_SECRET)
  const ending = pick(P_ENDING)
  // 「배경」 주인공은/는 사건. 압박, 위협이/가 그를 노린다. 비밀을/를 쥔 채, 결말
  return `「${setting}」 ${eun(protag)} ${incite}. ${clock} ${iga(threat)} 그를 노린다. ${eul(secret)} 쥔 채, ${ending}`
}
// 표시용 조합수(곱집합 — 고유 항목만). 옛 무작위 기능(클리셰 룰렛 14가지) 대비 +약 213.8억.
const PREMISE_COMBOS = P_PROTAG.length * P_INCITE.length * P_THREAT.length * P_CLOCK.length * P_SECRET.length * P_SETTING.length * P_ENDING.length

// 관련 도구(연계) — 도시에 기반: 반전/플롯 발상, 갈등, 비트시트, 장면 설계.
const RELATED: { id: string; label: string }[] = [
  { id: 'plot-twist-deck', label: '🃏 반전 카드덱' },
  { id: 'conflict-builder', label: '⚔️ 갈등 빌더' },
  { id: 'save-the-cat-beats', label: '🐱 비트시트' },
  { id: 'plot-pyramid', label: '🔺 플롯 피라미드' },
  { id: 'scene-list', label: '🎬 장면 목록' },
]

// ── 유틸 ──
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean>
  removed: string[]                       // 삭제한 기본 항목 id
  user: Record<string, UserItem[]>        // catKey -> 사용자 항목
  collapsed: Record<string, boolean>      // catKey -> 접힘
}
function emptyState(): Persisted { return { checked: {}, removed: [], user: {}, collapsed: {} } }

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    const user: Record<string, UserItem[]> = {}
    if (p.user && typeof p.user === 'object') {
      for (const k of Object.keys(p.user)) {
        const arr = p.user[k]
        if (Array.isArray(arr)) user[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
      }
    }
    const removed = Array.isArray(p.removed) ? p.removed.filter((x: any) => typeof x === 'string') : []
    return { checked, removed, user, collapsed }
  } catch { return emptyState() }
}

interface Merged { id: string; text: string; hint?: string; twist?: string; user: boolean }
function catItems(cat: Cat, st: Persisted): Merged[] {
  const out: Merged[] = []
  for (const it of cat.items) {
    if (st.removed.includes(it.id)) continue
    out.push({ id: it.id, text: it.text, hint: it.hint, twist: it.twist, user: false })
  }
  for (const u of (st.user[cat.key] || [])) out.push({ id: u.id, text: u.text, user: true })
  return out
}

// 검색 매칭(항목 본문 + 힌트 + 비틀기)
function matches(it: Merged, q: string): boolean {
  if (!q) return true
  const hay = (it.text + ' ' + (it.hint || '') + ' ' + (it.twist || '')).toLowerCase()
  return hay.includes(q.toLowerCase())
}

export default function ThrillerTropes({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const [twistPick, setTwistPick] = useState<Merged | null>(null)
  const [premise, setPremise] = useState('')
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // payload.genre 활용(외부에서 장르 전달 시 안내 표시)
  const incomingGenre = typeof payload?.genre === 'string' ? (payload.genre as string) : ''

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null } }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      showFlash(okMsg)
    } catch { showFlash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }

  // ── 조작 ──
  const toggle = (id: string) => setState((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const toggleCollapse = (k: string) => setState((s) => ({ ...s, collapsed: { ...s.collapsed, [k]: !s.collapsed[k] } }))
  const addUser = (catKey: string) => {
    const text = (drafts[catKey] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({ ...s, user: { ...s.user, [catKey]: [...(s.user[catKey] || []), item] } }))
    setDrafts((d) => ({ ...d, [catKey]: '' }))
  }
  const removeItem = (catKey: string, id: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }; delete checked[id]
      if (isUser) return { ...s, checked, user: { ...s.user, [catKey]: (s.user[catKey] || []).filter((u) => u.id !== id) } }
      return { ...s, checked, removed: [...s.removed, id] }
    })
  }
  const resetCat = (cat: Cat) => setState((s) => {
    const checked = { ...s.checked }
    for (const it of cat.items) delete checked[it.id]
    for (const u of (s.user[cat.key] || [])) delete checked[u.id]
    return { ...s, checked }
  })
  const resetAll = () => setState((s) => ({ ...s, checked: {} }))

  // ── 진행률 ──
  const per = CATS.map((cat) => {
    const items = catItems(cat, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { cat, items, total: items.length, done }
  })
  const totalItems = per.reduce((a, p) => a + p.total, 0)
  const totalDone = per.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  // ── 조합수(난수성) 표기: 검토 순서·각 항목 점검여부(2)^N + 클리셰 비틀기 선택지 ──
  // 각 항목을 독립적으로 점검/미점검 두 상태로 둘 수 있으므로 가능한 진행 상태는 2^(항목 수).
  const allCount = CATS.reduce((a, c) => a + c.items.length, 0)
  // 부동소수 폭주 방지: 2^allCount 를 안전하게 큰 수로 문자 표기.
  const combos = (() => {
    // 2^N — N 이 50 미만이면 정확, 그 이상이면 근사. 본 도구 N≈59 → 5.7e17 수준.
    const n = allCount
    if (n < 53) return (2 ** n).toLocaleString('ko-KR')
    const exp = n * Math.log10(2)
    const mant = Math.pow(10, exp - Math.floor(exp))
    return `${mant.toFixed(2)} × 10^${Math.floor(exp)}`
  })()

  // ── 클리셰 비틀기 무작위 제안 ──
  const twistList = CATS.find((c) => c.key === 'cliche')?.items.filter((i) => i.twist) || []
  const rollTwist = () => {
    const merged: Merged[] = twistList.map((i) => ({ id: i.id, text: i.text, twist: i.twist, user: false }))
    if (!merged.length) return
    const pick = merged[Math.floor(Math.random() * merged.length)]
    setTwistPick(pick)
  }
  const saveTwistSnippet = () => {
    if (!twistPick) return
    addToLibrary('snippets', {
      text: `[스릴러 클리셰 비틀기] ${twistPick.text}\n→ ${twistPick.twist || ''}`,
      source: '스릴러 트로프·관습 체크리스트',
      tags: ['스릴러', '클리셰', '비틀기'],
    })
    showFlash('비틀기 아이디어를 글감(스니펫)에 저장했어요.')
  }

  // ── 스릴러 전제(로그라인) 무작위 생성 ──
  const rollPremise = () => setPremise(buildPremise(Math.random))
  const savePremiseSnippet = () => {
    if (!premise) return
    addToLibrary('snippets', {
      text: `[스릴러 전제] ${premise}`,
      source: '스릴러 트로프·관습 체크리스트',
      tags: ['스릴러', '전제', '로그라인'],
    })
    showFlash('전제를 글감(스니펫)에 저장했어요.')
  }

  // ── 항목 클릭 복사 텍스트 ──
  const itemCopyText = (it: Merged) => {
    let t = `☐ ${it.text}`
    if (it.hint) t += `\n  · ${it.hint}`
    if (it.twist) t += `\n  ↪ 비틀기: ${it.twist}`
    return t
  }

  // ── 텍스트 내보내기 ──
  const exportText = () => {
    const lines: string[] = ['# 스릴러·서스펜스 트로프·관습 체크리스트', `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    for (const p of per) {
      lines.push(`## ${p.cat.icon} ${p.cat.name}  [${p.done}/${p.total}]`)
      for (const it of p.items) {
        lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`)
        if (it.twist) lines.push(`    ↪ 비틀기: ${it.twist}`)
      }
      lines.push('')
    }
    copyText(lines.join('\n').trim(), `체크리스트를 복사했어요 (${totalDone}/${totalItems})`)
  }

  // ── 프로젝트 연동: '기획' 폴더 문서로 추가 ──
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>장르: 스릴러·서스펜스</strong></p>`)
    parts.push(`<p><strong>진행률: ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`)
    for (const p of per) {
      parts.push(`<h3>${escHtml(p.cat.icon + ' ' + p.cat.name)} [${p.done}/${p.total}]</h3>`)
      if (!p.items.length) { parts.push('<p>(항목 없음)</p>'); continue }
      for (const it of p.items) {
        const mark = state.checked[it.id] ? '☑' : '☐'
        let line = `<p>${mark} ${escHtml(it.text)}`
        if (it.twist) line += `<br/><span>↪ 비틀기: ${escHtml(it.twist)}</span>`
        line += '</p>'
        parts.push(line)
      }
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `스릴러 트로프 점검 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      synopsis: `스릴러·서스펜스 관습 점검 — 진행률 ${totalPct}%`,
      meta: {
        장르: '스릴러·서스펜스',
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(per.map((p) => [p.cat.name, `${p.done}/${p.total}`])),
      },
    })
    showFlash(id ? `프로젝트 '기획' 폴더에 점검표를 추가했어요 (${totalDone}/${totalItems})` : '프로젝트에 연결되지 않았습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fillS = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tiny: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🕵️" /> 스릴러 트로프·관습</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 8px' }}>스릴러·서스펜스</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flash}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "현재 점검 상태를 프로젝트 '기획' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="체크리스트를 텍스트로 복사"><Emoji e="📋" /> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 전체 진행률 + 조합수 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fillS(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', flexBasis: '100%' }}>점검 항목 {allCount}개 → 가능한 점검 조합 약 <b>{combos}</b>가지 · 전제 생성기 조합 <b>{PREMISE_COMBOS.toLocaleString('ko-KR')}</b>가지</span>
      </div>

      {/* 검색 + 클리셰 비틀기 룰렛 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <input style={{ ...input, flex: 1, minWidth: 160 }} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 트로프·장치·클리셰 검색 (예: 반전, 티킹, 화자, USB)…" aria-label="항목 검색" />
        {query && <button style={tiny} onClick={() => setQuery('')}>지우기</button>}
        <button className="minibtn" onClick={rollTwist} title="클리셰 비틀기 아이디어를 무작위로 제안"><Emoji e="🎲" /> 클리셰 비틀기 룰렛</button>
        <button className="minibtn" onClick={rollPremise} title={`스릴러 전제(로그라인)를 무작위로 생성 — ${PREMISE_COMBOS.toLocaleString('ko-KR')}가지 조합`}><Emoji e="🎰" /> 전제 생성기</button>
      </div>

      {/* 무작위 비틀기 결과 */}
      {twistPick && (
        <div style={{ margin: '0 14px', padding: '10px 12px', border: '1px solid var(--accent)', borderRadius: 10, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}><Emoji e="⚠️" /> 클리셰: {twistPick.text}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}><span style={{ color: 'var(--accent)', fontWeight: 700 }}>↪ 비틀기: </span>{twistPick.twist}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={rollTwist}><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => copyText(`[클리셰] ${twistPick.text}\n↪ 비틀기: ${twistPick.twist}`, '비틀기 아이디어를 복사했어요.')}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={saveTwistSnippet}>＋ 글감으로 저장</button>
            <span style={{ flex: 1 }} />
            <button style={tiny} onClick={() => setTwistPick(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* 무작위 전제 결과 */}
      {premise && (
        <div style={{ margin: '0 14px', padding: '10px 12px', border: '1px solid var(--accent)', borderRadius: 10, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}><Emoji e="🎰" /> 스릴러 전제(로그라인)</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{premise}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={rollPremise}><Emoji e="🎲" /> 다시</button>
            <button className="minibtn" onClick={() => copyText(premise, '전제를 복사했어요.')}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={savePremiseSnippet}>＋ 글감으로 저장</button>
            <span style={{ flex: 1 }} />
            <button style={tiny} onClick={() => setPremise('')}>닫기</button>
          </div>
        </div>
      )}

      {incomingGenre && incomingGenre !== '스릴러·서스펜스' && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>전달된 장르: {incomingGenre} — 이 도구는 스릴러·서스펜스 관습에 특화되어 있어요.</div>
      )}
      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {per.map(({ cat, items, total, done }) => {
          const visible = items.filter((it) => matches(it, query))
          if (query && visible.length === 0) return null
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[cat.key] || !!query  // 검색 중엔 강제 펼침
          const draft = drafts[cat.key] || ''
          return (
            <div key={cat.key} style={card}>
              <div style={cHead} onClick={() => !query && toggleCollapse(cat.key)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={cat.icon} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
                </div>
                <div style={{ width: 84, flexShrink: 0 }}><div style={bar(6)}><div style={fillS(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 56, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
                <button style={tiny} title="이 카테고리 체크 해제" disabled={done === 0} onClick={(e) => { e.stopPropagation(); resetCat(cat) }}>↺</button>
              </div>

              {open && (
                <div>
                  {visible.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 카테고리에 항목이 없어요. 아래에서 점검 항목을 추가하세요.</div>
                  ) : visible.map((it) => {
                    const checked = !!state.checked[it.id]
                    return (
                      <div key={it.id} style={{ ...row, borderTop: '1px solid var(--border)' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                          style={{ width: 16, height: 16, marginTop: 3, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }} aria-label={it.text} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => toggle(it.id)}
                            style={{ fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                            {it.text}
                            {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                          </div>
                          {it.hint && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>· {it.hint}</div>}
                          {it.twist && <div style={{ fontSize: 11.5, color: 'var(--accent)', lineHeight: 1.5, marginTop: 3 }}>↪ 비틀기: {it.twist}</div>}
                        </div>
                        <button style={tiny} title="이 항목 복사" onClick={() => copyText(itemCopyText(it), '항목을 복사했어요.')}><Emoji e="📋" /></button>
                        <button style={{ ...tiny, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(cat.key, it.id, it.user)}>✕</button>
                      </div>
                    )
                  })}

                  {!query && (
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                      <input style={{ ...input, flex: 1 }} value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUser(cat.key) } }}
                        placeholder={`${cat.name}에 점검 항목 추가…`} maxLength={200} aria-label={`${cat.name} 항목 추가`} />
                      <button className="minibtn" onClick={() => addUser(cat.key)} disabled={!draft.trim()}>＋ 추가</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 연계 도구 */}
        <div className="linkbar">
          <span className="linkbar-label">연계:</span>
          {RELATED.map((r) => (
            <button key={r.id} className="linkbtn" onClick={() => openToolLinked(r.id, { genre: '스릴러·서스펜스' })} title={`${r.label} 열기`}>{emojify(r.label)}</button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 점검하고, 카테고리 머리글로 펼치거나 접으세요. 검색 시 모든 카테고리가 펼쳐집니다. 클리셰는 그대로 쓰기보다 <b>비틀기</b>를 활용하세요. 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
