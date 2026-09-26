// 미스터리 시놉시스 빌더 — 사건 한 줄·탐정·피해자·용의자들·핵심 트릭·반전·주제를 입력하면
// 추리소설 시놉시스를 여러 문체 틀로 자동 종합한다.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크 없음(전부 로컬·자작 데이터).
// 모든 입력/저장은 localStorage 에 JSON 으로 자동 저장·복원. 언마운트 시 타이머 정리.
// 연계: addToProject(folder:'기획', '시놉시스') 로 프로젝트 바인더에 문서 추가,
//       addToLibrary('snippets', ...) 로 생성 시놉시스를 글감 보관, openToolLinked 로 관련 도구 열기.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji, emojify } from './linkbus'

export const meta = {
  id: 'mystery-synopsis',
  name: '미스터리 시놉시스 빌더',
  icon: '🕵️',
  group: '구조',
  genre: '미스터리·추리',
  intro: '사건·탐정·피해자·용의자·트릭·반전·주제를 입력하면 추리소설 시놉시스를 자동 종합합니다',
  w: 680,
  h: 620,
}

const LS = 'sry:tool:mystery-synopsis'

// ---------- 데이터 모델 ----------
interface Suspect {
  id: string
  name: string      // 용의자 이름
  motive: string    // 동기
  alibi: string     // 알리바이
}

type ToneKey = 'classic' | 'noir' | 'cozy' | 'thriller' | 'inverted'
type SubKey = 'whodunit' | 'howdunit' | 'whydunit' | 'locked' | 'serial' | 'cold'

interface Draft {
  incident: string   // 사건 한 줄
  setting: string    // 무대(시간·장소)
  detective: string  // 탐정/수사자
  detectiveTrait: string // 탐정 특징(추리 방식·결점)
  victim: string     // 피해자
  victimSecret: string   // 피해자가 감춘 것
  suspects: Suspect[]
  trick: string      // 핵심 트릭(범행 방법/속임수)
  clue: string       // 결정적 단서
  redHerring: string // 거짓 단서(독자를 속이는 장치)
  twist: string      // 반전(진범/진실)
  theme: string      // 주제
  tone: ToneKey
  sub: SubKey
  tpl: number        // 선택한 종합 틀
}

// ---------- 어조(톤) ----------
const TONES: { key: ToneKey; label: string; desc: string; open: string }[] = [
  { key: 'classic', label: '본격(클래식)', desc: '논리·페어플레이, 명탐정의 추리쇼', open: '한 통의 비명 같은 사건이 평온을 깨뜨린다.' },
  { key: 'noir', label: '느와르', desc: '도시의 그늘, 냉소와 타락', open: '도시는 늘 누군가의 거짓말 위에서 잠든다.' },
  { key: 'cozy', label: '코지', desc: '소도시·아마추어 탐정, 따뜻한 결', open: '작은 마을의 일상에 어울리지 않는 죽음이 찾아든다.' },
  { key: 'thriller', label: '스릴러', desc: '시간 압박·서스펜스, 다음 희생을 막아라', open: '시계는 멈추지 않고, 다음 차례가 다가온다.' },
  { key: 'inverted', label: '도서(倒敍)', desc: '범인을 먼저 보여주고 추적을 즐긴다', open: '독자는 진실을 안다 — 문제는 탐정이 그것을 증명할 수 있는가다.' },
]

// ---------- 하위 유형(수수께끼의 축) ----------
const SUBS: { key: SubKey; label: string; q: string }[] = [
  { key: 'whodunit', label: '후더닛(누가)', q: '누가 범인인가' },
  { key: 'howdunit', label: '하우더닛(어떻게)', q: '불가능해 보이는 범행이 어떻게 가능했는가' },
  { key: 'whydunit', label: '와이더닛(왜)', q: '도대체 왜 이런 일이 벌어졌는가' },
  { key: 'locked', label: '밀실', q: '출구 없는 공간에서 어떻게 범행이 이뤄졌는가' },
  { key: 'serial', label: '연쇄', q: '연쇄 살인의 규칙과 다음 표적은 무엇인가' },
  { key: 'cold', label: '미제(콜드케이스)', q: '오래전 묻힌 사건의 진실은 무엇이었는가' },
]

// 빈 칸은 자리표시자로 — 언제나 읽히는 문장을 만든다.
function f(s: string, ph: string): string {
  const t = (s || '').trim()
  return t || `〔${ph}〕`
}

// ---------- 조사(받침) 헬퍼 ----------
// 앞 글자의 받침 유무를 보고 실제 조사를 골라 출력한다("을(를)" 같은 이중표기 금지).
// 한글이 아닌 글자(영문·숫자·기호)로 끝나면 일반적으로 자연스러운 쪽을 택한다.
function lastSyl(s: string): { code: number; jong: number } | null {
  const t = (s || '').replace(/[)\]」』〕"'’”\s.…]+$/u, '').trim()
  if (!t) return null
  const ch = t.charCodeAt(t.length - 1)
  if (ch >= 0xac00 && ch <= 0xd7a3) {
    const code = ch - 0xac00
    return { code, jong: code % 28 }
  }
  return null
}
// 을/를, 이/가, 은/는, 와/과 — 받침 있으면 앞쪽, 없으면 뒤쪽.
function josa(word: string, withJong: string, woJong: string): string {
  const s = lastSyl(word)
  // 한글이 아니면 모음 끝(받침 없음)으로 간주
  if (!s) return woJong
  return s.jong ? withJong : woJong
}
// 으로/로 — 받침이 있되 'ㄹ'(jong===8)이 아니면 '으로', 그 외엔 '로'.
function josaRo(word: string): string {
  const s = lastSyl(word)
  if (!s) return '로'
  return s.jong && s.jong !== 8 ? '으로' : '로'
}
// 입력은 '이미 표시용으로 확정된 문자열'(f() 적용 후, 또는 자리표시자)이다.
const eul = (shown: string) => shown + josa(shown, '을', '를')
const iga = (shown: string) => shown + josa(shown, '이', '가')
const eun = (shown: string) => shown + josa(shown, '은', '는')
const ro = (shown: string) => shown + josaRo(shown)

function suspectLine(ss: Suspect[]): string {
  const named = ss.filter((s) => s.name.trim())
  if (!named.length) return '〔용의자들〕'
  return named.map((s) => s.name.trim()).join(', ')
}

function suspectDetailHtml(ss: Suspect[], esc: (s: string) => string): string {
  const named = ss.filter((s) => s.name.trim() || s.motive.trim() || s.alibi.trim())
  if (!named.length) return ''
  const items = named.map((s) => {
    const parts: string[] = []
    if (s.motive.trim()) parts.push(`동기: ${esc(s.motive.trim())}`)
    if (s.alibi.trim()) parts.push(`알리바이: ${esc(s.alibi.trim())}`)
    return `<li><b>${esc(s.name.trim() || '이름 미정')}</b>${parts.length ? ' — ' + parts.join(' · ') : ''}</li>`
  }).join('')
  return `<p><b>용의자</b></p><ul>${items}</ul>`
}

// ---------- 종합 틀(템플릿) ----------
interface Tpl {
  name: string
  hint: string
  build: (d: Draft) => string
}

const TEMPLATES: Tpl[] = [
  {
    name: '표준 줄거리형',
    hint: '도입→수사→반전→주제 순의 정석 시놉시스',
    build: (d) => {
      const tone = TONES.find((t) => t.key === d.tone)!
      const sub = SUBS.find((s) => s.key === d.sub)!
      const susp = suspectLine(d.suspects)
      return [
        `${tone.open} ${f(d.setting, '무대')}, ${f(d.incident, '사건 한 줄')}.`,
        `${f(d.victim, '피해자')}의 죽음 뒤에는 ${eul(f(d.victimSecret, '피해자가 감춘 비밀'))} 둘러싼 사연이 숨어 있었다.`,
        `사건을 맡은 ${eun(f(d.detective, '탐정'))} ${ro(f(d.detectiveTrait, '탐정의 추리 방식·결점'))}, "${sub.q}"라는 물음을 파고든다.`,
        `용의선상에 ${iga(susp)} 오르지만, ${iga(f(d.redHerring, '거짓 단서'))} 수사를 엉뚱한 곳으로 이끈다.`,
        `결정적 단서 ${f(d.clue, '결정적 단서')}와 ${f(d.trick, '핵심 트릭')}의 정체가 맞물리는 순간, ${iga(f(d.twist, '반전'))} 드러난다.`,
        `결국 이 이야기는 ${f(d.theme, '주제')}에 관한 이야기다.`,
      ].join(' ')
    },
  },
  {
    name: '의문 제기형',
    hint: '독자에게 수수께끼를 던지며 호기심을 끈다',
    build: (d) => {
      const sub = SUBS.find((s) => s.key === d.sub)!
      const susp = suspectLine(d.suspects)
      return [
        `${f(d.setting, '무대')}에서 ${f(d.incident, '사건 한 줄')}.`,
        `${eun(f(d.victim, '피해자'))} 왜 죽어야 했는가? ${susp} 중 누구도 결백을 증명하지 못한다.`,
        `${sub.q} — 그것이 ${iga(f(d.detective, '탐정'))} 풀어야 할 수수께끼다.`,
        `${f(d.redHerring, '거짓 단서')}에 모두가 속는 동안, ${f(d.clue, '결정적 단서')} 하나가 ${eul(f(d.trick, '핵심 트릭'))} 무너뜨린다.`,
        `그리고 마지막에 밝혀지는 진실, ${f(d.twist, '반전')}. 그 끝에 남는 한 가지 — ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '탐정 중심형',
    hint: '탐정의 시선과 추리 과정을 전면에 세운다',
    build: (d) => {
      const susp = suspectLine(d.suspects)
      return [
        `${f(d.detective, '탐정')} — ${f(d.detectiveTrait, '탐정의 추리 방식·결점')}.`,
        `그(녀)에게 ${f(d.setting, '무대')}의 사건이 떨어진다: ${f(d.incident, '사건 한 줄')}.`,
        `피해자 ${iga(f(d.victim, '피해자'))} 감춘 ${f(d.victimSecret, '피해자가 감춘 비밀')}, 서로를 의심하는 ${susp}, 그리고 ${f(d.redHerring, '거짓 단서')}.`,
        `탐정은 ${f(d.clue, '결정적 단서')}에서 ${f(d.trick, '핵심 트릭')}의 균열을 발견하고, 모두가 모인 자리에서 ${eul(f(d.twist, '반전'))} 폭로한다.`,
        `진실의 무게는 곧 ${f(d.theme, '주제')}의 무게다.`,
      ].join(' ')
    },
  },
  {
    name: '도서(倒敍)형',
    hint: '범인·범행을 먼저 보여주고 추적의 긴장을 강조',
    build: (d) => {
      return [
        `독자는 처음부터 안다 — ${f(d.twist, '반전')}.`,
        `${f(d.setting, '무대')}에서 ${iga(f(d.incident, '사건 한 줄'))} 벌어지고, 범인은 ${ro(f(d.trick, '핵심 트릭'))} 완전범죄를 설계한다.`,
        `${eul(f(d.redHerring, '거짓 단서'))} 심어 두는 일도 잊지 않았다.`,
        `그러나 ${eun(f(d.detective, '탐정'))} ${ro(f(d.detectiveTrait, '탐정의 추리 방식·결점'))} ${f(d.clue, '결정적 단서')}의 모순을 집요하게 파고든다.`,
        `과연 완벽한 위장은 어디서 무너질 것인가 — 그 끝에서 ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '뒤표지(블러브)형',
    hint: '책 뒤표지 홍보문구처럼 압축·자극적으로',
    build: (d) => {
      const sub = SUBS.find((s) => s.key === d.sub)!
      return [
        `${f(d.incident, '사건 한 줄')}.`,
        `${eun(f(d.victim, '피해자'))} 죽었고, ${eun(suspectLine(d.suspects))} 모두 거짓말을 한다.`,
        `${f(d.detective, '탐정')}만이 ${sub.q}를 묻는다.`,
        `당신이 믿은 모든 단서가 ${f(d.redHerring, '거짓 단서')}였다면? 마지막 장을 덮기 전, ${iga(f(d.twist, '반전'))} 당신을 기다린다.`,
        `— ${f(d.theme, '주제')}.`,
      ].join(' ')
    },
  },
  {
    name: '구조 개요형',
    hint: '제출용 트리트먼트처럼 항목별로 정리',
    build: (d) => {
      const tone = TONES.find((t) => t.key === d.tone)!
      const sub = SUBS.find((s) => s.key === d.sub)!
      return [
        `[유형] ${tone.label} · ${sub.label}`,
        `[발단] ${f(d.setting, '무대')} — ${f(d.incident, '사건 한 줄')}`,
        `[피해자] ${f(d.victim, '피해자')} (감춘 것: ${f(d.victimSecret, '비밀')})`,
        `[탐정] ${f(d.detective, '탐정')} (${f(d.detectiveTrait, '특징')})`,
        `[용의자] ${suspectLine(d.suspects)}`,
        `[전개] 거짓 단서 ‘${f(d.redHerring, '거짓 단서')}’가 오도하고, 결정적 단서 ‘${f(d.clue, '결정적 단서')}’가 트릭 ‘${f(d.trick, '핵심 트릭')}’의 허점을 깬다`,
        `[반전] ${f(d.twist, '반전')}`,
        `[주제] ${f(d.theme, '주제')}`,
      ].join('\n')
    },
  },
]

// ---------- 영감용 무작위 풀(슬롯별 독립) ----------
// 각 풀은 다른 슬롯을 전제하지 않는 '독립적'이고 '고유한' 항목들로만 구성한다.
// 곱집합으로 섞여도 의미 충돌이 없도록, 모든 항목은 미스터리·추리 톤을 공유한다.

// [무대] 명사구(장소·시간) — 어떤 사건과도 자연스럽게 결합.
const SETTING_POOL = [
  '폭설로 고립된 외딴 산장', '안개 낀 1920년대 항구 도시', '졸업을 앞둔 명문 기숙학교',
  '문 닫힌 극장의 마지막 공연', '눈보라에 멈춰 선 야간열차', '뭍과 끊긴 등대지기의 섬',
  '재개발을 앞둔 낡은 아파트 단지', '폐쇄된 옛 정신병원 병동', '유산 상속이 걸린 대저택',
  '비 내리는 심야 라디오 방송국', '관광객이 떠난 비수기의 온천 마을', '수몰을 앞둔 댐 아래 마을',
  '폭풍에 발이 묶인 외딴 섬 펜션', '신도시 모델하우스 견본 단지', '문 잠긴 사립 미술관의 폐관 시각',
  '한밤의 대학 병원 격리 병동',
] // 16
// [사건 한 줄] '…사건/…한 채 발견된다'로 끝나는 사건 요약 — 조사 결합(이/가) 안정.
const INCIDENT_POOL = [
  '한 사람이 밀폐된 방에서 숨진 채 발견된 변사 사건', '잔치가 한창일 때 손님 하나가 쓰러져 숨진 독살 사건',
  '사라졌던 인물이 백골이 되어 돌아온 실종 살인 사건', '추락사로 처리되었다 뒤집힌 의문의 낙사 사건',
  '같은 수법이 반복된 연쇄 살인 사건', '유서 한 장만 남고 시신은 사라진 위장 자살 사건',
  '굳게 잠긴 금고 안에서 사람이 죽어 있던 밀실 사건', '한 통의 협박 편지로 시작된 살인 예고 사건',
  '오래전 미제로 묻혔다 다시 열린 콜드케이스', '얼굴을 알아볼 수 없게 훼손된 신원불명 변사 사건',
  '약속 시각에 나타나지 않은 채 발견된 의문사 사건', '모두가 알리바이를 가진 불가능 범죄 사건',
  '한밤의 정전 사이에 벌어진 어둠 속 살인 사건', '낡은 일기장이 발견되며 들춰진 과거 살인 사건',
  '단 한 명만 살아남은 집단 변사 사건',
] // 15
// [피해자] 직업·정체가 드러나는 인물 명사구.
const VICTIM_POOL = [
  '벤처 투자자', '퇴직을 앞둔 노교수', '소문 많은 동네 부동산 중개인', '잘나가던 연예 기획사 대표',
  '은퇴한 형사', '마을의 유일한 약사', '대저택의 늙은 가장', '인기 추리소설 작가',
  '비밀이 많은 사립학교 이사장', '재개발 조합장', '지역 신문의 탐사 기자', '대형 병원의 외과 과장',
  '오래된 골동품상 주인', '도박 빚에 쫓기던 사업가',
] // 14
// [탐정/수사자] 인물 명사구.
const DETECTIVE_POOL = [
  '강력계 베테랑 형사', '도시에서 내려온 사립탐정', '동네 사정에 밝은 아마추어 탐정', '시신을 읽는 검시관',
  '갓 부임한 신참 순경', '사건 전문 변호사', '범죄심리 자문 프로파일러', '은퇴했다 복귀한 노형사',
  '호기심 많은 추리소설 작가', '지역 신문의 사건 기자', '과학수사대 감식 요원', '실종 전문 흥신소 조사관',
  '수습 검사', '사건에 휘말린 보험 조사원',
] // 14
// [탐정 특징] '…'로 끝나는 서술형 특징(추리 방식·결점) — '으로/로' 결합 안정.
const DET_POOL = [
  '천재적 관찰력을 지녔으나 사람은 끝내 믿지 못하는 성정', '과거의 실패에 사로잡혀 좀처럼 결단을 못 내리는 신중함',
  '수다스럽지만 핵심은 절대 놓치지 않는 집요함', '시신이 남긴 흔적부터 읽어내는 냉철한 과학적 시선',
  '직감이 날카롭되 규칙은 곧잘 어기는 저돌적 기질', '사소한 어긋남도 못 견디는 결벽증적 꼼꼼함',
  '상대의 표정을 귀신같이 읽어내는 통찰', '한 번 문 사건은 끝까지 놓지 않는 끈기',
  '냉소적이지만 약자 앞에서는 무너지는 여린 심성', '논리의 빈틈을 집요하게 파고드는 추궁',
  '기억의 단서를 그림처럼 재구성하는 상상력', '의심이 많아 누구의 말도 그대로 믿지 않는 회의',
] // 12
// [피해자가 감춘 것] 명사구(비밀의 정체) — '…' 명사로 끝나 조사 결합 안정.
const SECRET_POOL = [
  '동업자의 자금을 빼돌려 숨겨 둔 비밀 계좌', '오래전 덮어 버린 과실치사의 진실',
  '다른 사람 행세로 살아온 위조된 신분', '여러 사람의 약점을 적어 둔 비밀 장부',
  '혈연을 뒤바꾼 출생의 비밀', '겉과 다른 이중 결혼 생활', '조직과 연결된 검은돈의 출처',
  '표절로 쌓아 올린 가짜 명성', '협박에 시달리며 치르던 입막음 비용', '버려진 사생아의 존재',
  '바꿔치기한 유언장의 원본', '아무에게도 말 못 한 불치병',
] // 12
// [핵심 트릭] 명사구(범행 방법·속임수).
const TRICK_POOL = [
  '사망 추정 시각을 늦춘 시간차 알리바이 트릭', '대역을 세워 신원을 바꿔치기한 위장',
  '밀실로 보이게 만든 시간차 잠금장치', '무해한 물건에 독을 숨긴 지연성 살해',
  '여럿이 입을 맞춘 집단 위증', '사고로 꾸민 정교한 무대 연출', '거울과 조명을 이용한 착시 트릭',
  '미리 녹음해 둔 소리로 만든 가짜 현장', '한 사람을 둘로 보이게 한 옷·동선 바꿔치기',
  '시신을 옮겨 발견 장소를 속인 이동 트릭', '암호로 숨긴 진짜 사인의 단서',
] // 11
// [거짓 단서] 명사구(독자를 속이는 장치).
const HERRING_POOL = [
  '외부 침입을 암시하는 깨진 창문과 발자국', '범인을 지목하는 듯한 협박 편지',
  '엉뚱한 사람의 것으로 보이는 유류품', '시각을 잘못 가리키도록 멈춘 벽시계',
  '가장 의심스러운 인물의 거짓 자백', '현장에 일부러 떨어뜨린 단추 한 개',
  '다른 사건처럼 꾸민 모방 수법', '진범을 가리는 완벽해 보이는 알리바이',
  '범행과 무관한 옛 원한 관계', '시선을 돌리는 익명의 제보 전화',
  '엉뚱한 방향을 가리키는 핏자국',
] // 11
// [주제] 완결 문장(한 줄 주제).
const THEME_POOL = [
  '진실은 늘 가장 보고 싶지 않은 곳에 있다', '정의와 복수는 어디서 갈라지는가',
  '거짓말은 결국 그것을 지어낸 사람을 가둔다', '가장 가까운 사람이 가장 잘 속인다',
  '과거는 묻어도 결코 사라지지 않는다', '죄책감은 완전범죄조차 무너뜨린다',
  '진실을 아는 대가는 때로 무지보다 무겁다', '누구나 들키고 싶지 않은 방 하나를 품고 산다',
  '평범한 얼굴 뒤에 가장 깊은 어둠이 숨는다', '용서받지 못한 비밀은 반드시 값을 치른다',
] // 10

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ---------- 조합 가짓수(곱집합) ----------
// 🎲 영감이 무작위로 채우는 9개 독립 슬롯의 풀 크기 곱.
const COMBOS =
  SETTING_POOL.length * INCIDENT_POOL.length * VICTIM_POOL.length * DETECTIVE_POOL.length *
  DET_POOL.length * SECRET_POOL.length * TRICK_POOL.length * HERRING_POOL.length * THEME_POOL.length

// ---------- 자작 예시(입력 자동 채움 + 학습) ----------
interface Example extends Omit<Draft, 'suspects' | 'tpl'> {
  title: string
  suspects: Suspect[]
}
const EXAMPLES: Example[] = [
  {
    title: '눈 갇힌 산장의 밤',
    incident: '폭설로 외부와 끊긴 산장에서 투자자 한 명이 난로 앞에서 숨진 채 발견된다',
    setting: '폭설로 고립된 외딴 산장, 어느 겨울밤',
    detective: '도시에서 휴가를 온 강력계 형사 한지운',
    detectiveTrait: '사소한 어긋남을 못 견디는 결벽증, 사람보다 흔적을 먼저 믿는다',
    victim: '벤처 투자자 서동혁',
    victimSecret: '동업자들의 자금을 빼돌려 비밀 계좌에 숨겨두고 있었다',
    suspects: [
      { id: 'e1', name: '동업자 윤민서', motive: '빼돌린 자금을 되찾으려 했다', alibi: '밤새 서재에서 장부를 봤다고 주장' },
      { id: 'e2', name: '산장지기 노태수', motive: '아들의 죽음을 피해자 탓으로 여겼다', alibi: '보일러실에서 제설 작업 중이었다' },
      { id: 'e3', name: '피해자의 아내 정유나', motive: '거액의 보험금과 외도', alibi: '두통으로 일찍 잠들었다고 함' },
    ],
    trick: '난로 온도로 사망 추정 시각을 늦춰 모두의 알리바이를 성립시킨 시간차 트릭',
    clue: '식은 줄 알았던 찻잔에 남은 미세한 온기와, 멈춘 벽시계',
    redHerring: '깨진 창문과 바깥으로 난 발자국 — 외부 침입자의 소행처럼 보이게 한 위장',
    twist: '범인은 가장 먼저 시신을 발견한 산장지기 — 그는 시각을 조작해 자신을 용의선상에서 지웠다',
    theme: '복수는 정의의 가면을 쓸 때 가장 위험해진다',
    tone: 'classic',
    sub: 'locked',
  },
  {
    title: '항구 도시의 마지막 거래',
    incident: '안개 낀 새벽 부두에서 밀수 조직의 회계사가 익사체로 떠오른다',
    setting: '1928년 안개와 비에 젖은 항구 도시',
    detective: '한물간 사립탐정 마도윤',
    detectiveTrait: '냉소적이고 술에 의지하지만, 한 번 문 사건은 끝까지 놓지 않는다',
    victim: '조직의 회계사 백상철',
    victimSecret: '조직의 이중장부 사본을 경찰에 넘기려 거래하던 중이었다',
    suspects: [
      { id: 'e1', name: '조직 두목 강해문', motive: '배신자를 입막음해야 했다', alibi: '클럽에서 손님들과 있었다' },
      { id: 'e2', name: '부패 경위 오정한', motive: '거래가 성사되면 자신도 끝장이었다', alibi: '야간 순찰 기록이 있다' },
    ],
    trick: '익사로 위장했으나 폐에서 발견된 것은 바닷물이 아닌 수돗물이었다',
    clue: '시신의 폐에 든 담수와, 구두 밑창에 묻은 도살장의 톱밥',
    redHerring: '회계사의 주머니에서 나온 조직 두목의 협박 편지',
    twist: '회계사를 죽인 건 그를 보호하던 부패 경위 — 장부가 공개되면 가장 먼저 무너질 사람이었다',
    theme: '도시에서 가장 깨끗해 보이는 손이 가장 더럽다',
    tone: 'noir',
    sub: 'howdunit',
  },
  {
    title: '마을 빵집의 독차',
    incident: '마을 축제날, 빵집 단골 노부인이 차를 마시고 쓰러져 숨진다',
    setting: '관광객이 떠난 비수기의 한적한 호숫가 마을',
    detective: '빵집을 운영하는 참견 많은 주인 도여사',
    detectiveTrait: '동네 사정을 모르는 게 없고, 사람의 표정 변화를 귀신같이 읽는다',
    victim: '독거 노부인 한말순',
    victimSecret: '마을 사람 여럿의 오래된 비밀을 적은 일기를 갖고 있었다',
    suspects: [
      { id: 'e1', name: '조카 김선재', motive: '거액의 유산 상속', alibi: '축제 부스를 지키고 있었다' },
      { id: 'e2', name: '이웃 박씨', motive: '일기에 적힌 과거가 드러날까 두려웠다', alibi: '하루 종일 밭에 있었다' },
    ],
    trick: '독은 찻잎이 아니라 노부인만 쓰던 각설탕 통에 들어 있었다',
    clue: '다른 손님 잔에는 없고 노부인 잔에만 가라앉은 설탕 결정',
    redHerring: '유산을 노린 조카가 가장 먼저 찻주전자를 만졌다는 목격담',
    twist: '범인은 일기를 두려워한 이웃 — 노부인의 습관을 아는 사람만 쓸 수 있는 방법이었다',
    theme: '작은 마을의 평화는 묻어둔 비밀 위에 아슬하게 서 있다',
    tone: 'cozy',
    sub: 'whydunit',
  },
]

// ---------- 저장 항목 ----------
interface Saved {
  id: string
  title: string
  draft: Draft
  text: string
  createdAt: number
}

function newId(prefix = 's'): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '_' + crypto.randomUUID() } catch { /* noop */ }
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const blankSuspect = (): Suspect => ({ id: newId('u'), name: '', motive: '', alibi: '' })

function blankDraft(): Draft {
  return {
    incident: '', setting: '', detective: '', detectiveTrait: '',
    victim: '', victimSecret: '',
    suspects: [blankSuspect(), blankSuspect()],
    trick: '', clue: '', redHerring: '', twist: '', theme: '',
    tone: 'classic', sub: 'whodunit', tpl: 0,
  }
}

const TONE_KEYS: ToneKey[] = ['classic', 'noir', 'cozy', 'thriller', 'inverted']
const SUB_KEYS: SubKey[] = ['whodunit', 'howdunit', 'whydunit', 'locked', 'serial', 'cold']

function normSuspect(x: unknown): Suspect {
  const o = (x || {}) as Partial<Suspect>
  return {
    id: typeof o.id === 'string' ? o.id : newId('u'),
    name: typeof o.name === 'string' ? o.name : '',
    motive: typeof o.motive === 'string' ? o.motive : '',
    alibi: typeof o.alibi === 'string' ? o.alibi : '',
  }
}

function normDraft(x: unknown): Draft {
  const o = (x || {}) as Partial<Draft>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const suspects = Array.isArray(o.suspects) && o.suspects.length ? o.suspects.map(normSuspect) : [blankSuspect(), blankSuspect()]
  return {
    incident: str(o.incident), setting: str(o.setting),
    detective: str(o.detective), detectiveTrait: str(o.detectiveTrait),
    victim: str(o.victim), victimSecret: str(o.victimSecret),
    suspects,
    trick: str(o.trick), clue: str(o.clue), redHerring: str(o.redHerring),
    twist: str(o.twist), theme: str(o.theme),
    tone: TONE_KEYS.includes(o.tone as ToneKey) ? (o.tone as ToneKey) : 'classic',
    sub: SUB_KEYS.includes(o.sub as SubKey) ? (o.sub as SubKey) : 'whodunit',
    tpl: Number.isFinite(o.tpl) && (o.tpl as number) >= 0 && (o.tpl as number) < TEMPLATES.length ? (o.tpl as number) : 0,
  }
}

function loadState(): { cur: Draft; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return { cur: blankDraft(), saved: [] }
    const p = JSON.parse(raw)
    const cur = normDraft(p?.cur)
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved.filter((s: unknown) => s && typeof (s as Saved).text === 'string').map((s: Saved) => ({
          id: String(s.id || newId()),
          title: String(s.title || ''),
          draft: normDraft(s.draft),
          text: String(s.text || ''),
          createdAt: Number.isFinite(s.createdAt) ? s.createdAt : Date.now(),
        }))
      : []
    return { cur, saved }
  } catch {
    return { cur: blankDraft(), saved: [] }
  }
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 본문 HTML(프로젝트 문서용) — 시놉시스 + 항목별 정리.
function bodyHtmlOf(d: Draft, text: string): string {
  const tone = TONES.find((t) => t.key === d.tone)!
  const sub = SUBS.find((s) => s.key === d.sub)!
  const row = (label: string, v: string) => (v && v.trim() ? `<p><b>${escHtml(label)}:</b> ${escHtml(v.trim())}</p>` : '')
  const paras = text.split('\n').filter(Boolean).map((p) => `<p>${escHtml(p)}</p>`).join('')
  return [
    `<p><b>유형:</b> ${escHtml(tone.label)} · ${escHtml(sub.label)} (${escHtml(sub.q)})</p>`,
    `<hr/>`,
    `<p style="font-size:14px;line-height:1.7;"><b>시놉시스</b></p>`,
    paras,
    `<hr/>`,
    row('사건', d.incident),
    row('무대', d.setting),
    row('탐정', d.detective),
    row('탐정 특징', d.detectiveTrait),
    row('피해자', d.victim),
    row('피해자가 감춘 것', d.victimSecret),
    suspectDetailHtml(d.suspects, escHtml),
    row('핵심 트릭', d.trick),
    row('결정적 단서', d.clue),
    row('거짓 단서', d.redHerring),
    row('반전', d.twist),
    row('주제', d.theme),
  ].filter(Boolean).join('')
}

// 평문(복사/글감용)
function plainOf(d: Draft, text: string): string {
  return text
}

export default function MysterySynopsis({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [title, setTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showEx, setShowEx] = useState(false)
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')

  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload.genre 가 미스터리 계열이면 무대 예시를 살짝 추천(빈 입력일 때만).
  useEffect(() => {
    mounted.current = true
    try {
      const g = payload && typeof payload.genre === 'string' ? (payload.genre as string) : ''
      const isEmpty = !init.current.cur.incident && !init.current.cur.setting && !init.current.cur.victim
      if (g && isEmpty) {
        flashNote(`‘${g}’ 맥락으로 시작합니다. 칸을 채우거나 🎲 영감으로 무대를 받아보세요.`)
      }
    } catch { /* noop */ }
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [cur, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const flashCopied = (tag: string) => {
    setCopied(tag)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
  }

  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) => setCur((p) => ({ ...p, [k]: v }))

  const text = TEMPLATES[cur.tpl].build(cur)

  const hasInput = !!(cur.incident || cur.setting || cur.detective || cur.victim || cur.trick || cur.twist || cur.theme || cur.suspects.some((s) => s.name || s.motive || s.alibi))

  // ---- 용의자 CRUD ----
  const addSuspect = () => setCur((p) => ({ ...p, suspects: [...p.suspects, blankSuspect()] }))
  const removeSuspect = (id: string) => setCur((p) => ({ ...p, suspects: p.suspects.length > 1 ? p.suspects.filter((s) => s.id !== id) : p.suspects }))
  const setSuspect = (id: string, k: keyof Suspect, v: string) =>
    setCur((p) => ({ ...p, suspects: p.suspects.map((s) => (s.id === id ? { ...s, [k]: v } : s)) }))
  const moveSuspect = (id: string, dir: -1 | 1) =>
    setCur((p) => {
      const i = p.suspects.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.suspects.length) return p
      const a = p.suspects.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return { ...p, suspects: a }
    })

  // ---- 영감(무작위 채움) — 빈 칸만 채운다(9개 독립 슬롯) ----
  const inspire = () => {
    setCur((p) => ({
      ...p,
      setting: p.setting || pick(SETTING_POOL),
      incident: p.incident || pick(INCIDENT_POOL),
      victim: p.victim || pick(VICTIM_POOL),
      detective: p.detective || pick(DETECTIVE_POOL),
      detectiveTrait: p.detectiveTrait || pick(DET_POOL),
      victimSecret: p.victimSecret || pick(SECRET_POOL),
      trick: p.trick || pick(TRICK_POOL),
      redHerring: p.redHerring || pick(HERRING_POOL),
      theme: p.theme || pick(THEME_POOL),
    }))
    flashNote(`빈 칸에 영감 예시를 채웠습니다(약 ${COMBOS.toLocaleString()}가지 조합). 마음대로 고쳐 쓰세요.`)
  }

  const copy = async (txt: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(txt)
      else throw new Error('no clipboard')
      flashCopied(tag)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const applyExample = (ex: Example) => {
    setCur((p) => ({
      ...blankDraft(),
      incident: ex.incident, setting: ex.setting,
      detective: ex.detective, detectiveTrait: ex.detectiveTrait,
      victim: ex.victim, victimSecret: ex.victimSecret,
      suspects: ex.suspects.map((s) => ({ ...s, id: newId('u') })),
      trick: ex.trick, clue: ex.clue, redHerring: ex.redHerring,
      twist: ex.twist, theme: ex.theme,
      tone: ex.tone, sub: ex.sub, tpl: p.tpl,
    }))
    setShowEx(false)
    setEditId(null)
    setTitle('')
    flashNote(`「${ex.title}」 예시를 입력에 채웠습니다.`)
  }

  const saveCurrent = () => {
    const rec: Saved = {
      id: editId || newId(),
      title: title.trim() || (cur.incident.trim() ? cur.incident.trim().slice(0, 24) : '제목 없는 시놉시스'),
      draft: cur,
      text,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('시놉시스를 저장했습니다.')
    }
    setEditId(null)
    setTitle('')
  }

  const loadSaved = (s: Saved) => {
    setCur(normDraft(s.draft))
    setTitle(s.title)
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }
  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
  }
  const moveSaved = (id: string, dir: -1 | 1) =>
    setSaved((p) => {
      const i = p.findIndex((s) => s.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const a = p.slice()
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })

  const clearForm = () => {
    setCur((p) => ({ ...blankDraft(), tone: p.tone, sub: p.sub, tpl: p.tpl }))
    setEditId(null)
    setTitle('')
    flashNote('입력을 비웠습니다.')
  }

  // ---- 연계: 프로젝트 기획 폴더에 시놉시스 문서 추가 ----
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const tone = TONES.find((t) => t.key === cur.tone)!
    const sub = SUBS.find((s) => s.key === cur.sub)!
    const docTitle = (title.trim() || (cur.incident.trim() ? cur.incident.trim().slice(0, 24) : '시놉시스'))
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '기획',
      title: `시놉시스 — ${docTitle}`,
      bodyHtml: bodyHtmlOf(cur, text),
      synopsis: text.split('\n')[0]?.slice(0, 120),
      meta: { 장르: '미스터리·추리', 어조: tone.label, 유형: sub.label, 틀: TEMPLATES[cur.tpl].name },
    })
    flashNote(id ? '프로젝트 자료 〈기획〉 폴더에 시놉시스 문서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 연계: 글감 보관함에 스니펫 저장 ----
  const toLibrary = () => {
    addToLibrary('snippets', {
      text: plainOf(cur, text),
      source: '미스터리 시놉시스 빌더',
      tags: ['시놉시스', '미스터리·추리', TONES.find((t) => t.key === cur.tone)!.label, SUBS.find((s) => s.key === cur.sub)!.label],
    })
    flashNote('생성한 시놉시스를 글감 보관함에 저장했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const twoRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const col: React.CSSProperties = { flex: 1, minWidth: 200 }
  const synBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.8, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', fontSize: 12.5, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const tplBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 2,
  })
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const emptyBox: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  const Field = ({ k, label, ph, ml, area }: { k: keyof Draft; label: string; ph: string; ml?: number; area?: boolean }) => (
    <div>
      <label style={fieldLabel}>{label}</label>
      {area ? (
        <textarea style={{ ...input, resize: 'vertical', minHeight: 56 }} value={cur[k] as string}
          onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 200} rows={2} />
      ) : (
        <input style={input} value={cur[k] as string} onChange={(e) => setField(k, e.target.value as never)} placeholder={ph} maxLength={ml || 140} />
      )}
    </div>
  )

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🕵️" /> 미스터리 시놉시스 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>사건·탐정·용의자·트릭·반전 → 추리소설 시놉시스</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }} title="🎲 영감이 무작위로 채우는 9개 독립 슬롯의 조합 가짓수">조합 {COMBOS.toLocaleString()}가지</span>
          <button className="minibtn" onClick={inspire} title={`빈 칸에 무작위 영감 채우기 — 약 ${COMBOS.toLocaleString()}가지 조합`}><Emoji e="🎲" /> 영감</button>
          <button className="minibtn" onClick={() => setShowEx((v) => !v)}>{showEx ? '예시 닫기' : <><Emoji e="📚" /> 작품 예시</>}</button>
        </div>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{emojify(note)}</div>
        )}

        {showEx && (
          <div style={card}>
            <h4 style={sectionTitle}>미스터리 예시 — 눌러 입력에 채우기</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex) => (
                <div key={ex.title} style={{ ...savedRow, gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>「{ex.title}」</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {TONES.find((t) => t.key === ex.tone)?.label} · {SUBS.find((s) => s.key === ex.sub)?.label}
                    </span>
                    <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => applyExample(ex)}>이 예시 쓰기</button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', wordBreak: 'keep-all' }}>{ex.incident}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유형 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>어조 · 수수께끼 유형</h4>
          <div style={{ marginBottom: 10 }}>
            <span style={{ ...fieldLabel }}>어조(톤)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map((t) => (
                <button key={t.key} onClick={() => setField('tone', t.key)} style={chip(cur.tone === t.key)} title={t.desc}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={{ ...fieldLabel }}>수수께끼 축</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUBS.map((s) => (
                <button key={s.key} onClick={() => setField('sub', s.key)} style={chip(cur.sub === s.key)} title={s.q}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 입력 */}
        <div style={card}>
          <h4 style={sectionTitle}>{editId ? <><Emoji e="✏️" /> 수정 중</> : '구성 요소 입력'}</h4>
          <div style={{ marginBottom: 10 }}>
            <Field k="incident" label="사건 한 줄 — 무슨 일이 벌어졌는가" ph="예: 폭설로 고립된 산장에서 투자자가 숨진 채 발견된다" ml={160} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="setting" label="무대(시간·장소)" ph="예: 폭설로 고립된 외딴 산장, 겨울밤" /></div>
            <div style={col}><Field k="victim" label="피해자" ph="예: 벤처 투자자 서동혁" /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="victimSecret" label="피해자가 감춘 것 (동기의 씨앗)" ph="예: 동업자 자금을 빼돌려 비밀 계좌에 숨겼다" ml={180} />
          </div>
          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="detective" label="탐정 / 수사자" ph="예: 강력계 형사 한지운" /></div>
            <div style={col}><Field k="detectiveTrait" label="탐정 특징 (추리 방식·결점)" ph="예: 결벽증, 흔적을 사람보다 먼저 믿는다" /></div>
          </div>

          {/* 용의자 CRUD */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ ...fieldLabel, margin: 0 }}>용의자 — {cur.suspects.length}명 (동기·알리바이)</span>
              <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={addSuspect}>＋ 용의자 추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cur.suspects.map((s, i) => (
                <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--chrome-2)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input style={{ ...input, flex: 1 }} value={s.name} onChange={(e) => setSuspect(s.id, 'name', e.target.value)} placeholder={`용의자 ${i + 1} 이름`} maxLength={60} />
                    <button style={iconBtn} title="위로" onClick={() => moveSuspect(s.id, -1)} disabled={i === 0}>▲</button>
                    <button style={iconBtn} title="아래로" onClick={() => moveSuspect(s.id, 1)} disabled={i === cur.suspects.length - 1}>▼</button>
                    <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSuspect(s.id)} disabled={cur.suspects.length <= 1}><Emoji e="🗑️" /></button>
                  </div>
                  <div style={twoRow}>
                    <input style={{ ...input, flex: 1, minWidth: 160 }} value={s.motive} onChange={(e) => setSuspect(s.id, 'motive', e.target.value)} placeholder="동기 (예: 빼돌린 자금 회수)" maxLength={120} />
                    <input style={{ ...input, flex: 1, minWidth: 160 }} value={s.alibi} onChange={(e) => setSuspect(s.id, 'alibi', e.target.value)} placeholder="알리바이 (예: 서재에 있었다)" maxLength={120} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...twoRow, marginBottom: 10 }}>
            <div style={col}><Field k="trick" label="핵심 트릭 (범행 방법·속임수)" ph="예: 사망 시각을 늦춘 시간차 트릭" ml={180} /></div>
            <div style={col}><Field k="clue" label="결정적 단서" ph="예: 식은 줄 알았던 찻잔의 미세한 온기" ml={180} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="redHerring" label="거짓 단서 (독자를 속이는 장치)" ph="예: 외부 침입자를 암시하는 깨진 창문과 발자국" ml={180} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Field k="twist" label="반전 (진범·진실)" ph="예: 범인은 가장 먼저 시신을 발견한 산장지기였다" ml={200} area />
          </div>
          <div style={{ marginBottom: 4 }}>
            <Field k="theme" label="주제" ph="예: 복수는 정의의 가면을 쓸 때 가장 위험해진다" ml={140} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>입력 비우기</button>
          </div>
        </div>

        {/* 종합 틀 */}
        <div style={card}>
          <h4 style={sectionTitle}>시놉시스 틀 — {TEMPLATES.length}가지</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button key={t.name} onClick={() => setField('tpl', i)} style={tplBtn(cur.tpl === i)}>
                <b style={{ fontSize: 12.5, color: cur.tpl === i ? 'var(--accent)' : 'var(--text)' }}>{cur.tpl === i ? '● ' : '○ '}{t.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 결과 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>종합된 시놉시스 · {TEMPLATES[cur.tpl].name}</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(text, 'main')}>{copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 복사</>}</button>
          </div>
          <div style={synBox}>{text}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input style={{ ...input, flex: 1, minWidth: 180 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="저장 제목 (비우면 사건 한 줄로 자동)" maxLength={60} />
            <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾" /> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계 버튼 */}
          <div className="linkbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="linkbar-label">연계:</span>
            <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '현재 시놉시스를 프로젝트 자료 〈기획〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
            <button className="linkbtn" onClick={toLibrary} title="생성한 시놉시스를 글감 보관함에 저장"><Emoji e="⭐" /> 글감 보관</button>
            <button className="linkbtn" onClick={() => openToolLinked('character-forge', { genre: '미스터리·추리', seed: cur.detective })} title="탐정·용의자 캐릭터를 만들러 가기"><Emoji e="👤" /> 캐릭터 만들기</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '미스터리·추리' })} title="반전 아이디어 카드 뽑기"><Emoji e="🃏" /> 반전 카드덱</button>
            <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid', { genre: '미스터리·추리' })} title="플롯 구조로 펼치기"><Emoji e="🔺" /> 플롯 구조</button>
          </div>
        </div>

        {/* 저장 목록(CRUD) */}
        <div style={card}>
          <h4 style={sectionTitle}>저장한 시놉시스 · {saved.length}건</h4>
          {saved.length === 0 ? (
            <div style={emptyBox}>
              아직 저장한 시놉시스가 없습니다.<br />
              요소를 채우고 <b>저장</b>을 누르면 여기에 모입니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 상단의 <b><Emoji e="📚" /> 작품 예시</b> 또는 <b><Emoji e="🎲" /> 영감</b>으로 시작하세요.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s, i) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>
                      {TONES.find((t) => t.key === s.draft.tone)?.label || '톤'}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="위로" onClick={() => moveSaved(s.id, -1)} disabled={i === 0}>▲</button>
                      <button style={iconBtn} title="아래로" onClick={() => moveSaved(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                      <button style={iconBtn} title="복사" onClick={() => copy(s.text, 'sv' + s.id)}>{copied === 'sv' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', maxHeight: 88, overflow: 'hidden' }}>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          미스터리 시놉시스는 “무슨 일이, 왜, 어떻게 일어났고, 누가 그것을 풀어내는가”를 한 호흡에 보여주는 설계도입니다.
          거짓 단서(레드 헤링)와 결정적 단서를 짝지어 두면 반전이 더 단단해집니다. 입력·저장은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
