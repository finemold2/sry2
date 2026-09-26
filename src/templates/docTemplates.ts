// 문서 템플릿 — 스크리브너의 "템플릿 시트"(캐릭터/장소 스케치)와 구조화 캐릭터 카드.
// 시트 템플릿: 항목이 미리 채워진 일반 텍스트 문서(RTF).
// 구조화 카드: 폼으로 입력하는 'character' 타입 아이템(bodyRtf 는 필드에서 자동 생성).
import { htmlToRtf } from '../rtf'

export interface CharField {
  key: string
  label: string
  multiline?: boolean
}

// 구조화 캐릭터 카드 필드 정의
export const CHARACTER_FIELDS: CharField[] = [
  { key: 'name', label: '이름' },
  { key: 'role', label: '역할' },
  { key: 'aka', label: '별칭/이명' },
  { key: 'age', label: '나이' },
  { key: 'occupation', label: '직업' },
  { key: 'appearance', label: '외모', multiline: true },
  { key: 'personality', label: '성격', multiline: true },
  { key: 'habits', label: '습관/말버릇', multiline: true },
  { key: 'background', label: '배경/내력', multiline: true },
  { key: 'goal', label: '목표/동기', multiline: true },
  { key: 'conflict', label: '갈등/약점', multiline: true },
  { key: 'arc', label: '성장 곡선(arc)', multiline: true },
  { key: 'notes', label: '기타 메모', multiline: true },
]

// 장소/배경 시트 항목
export const SETTING_FIELDS: CharField[] = [
  { key: 'name', label: '장소 이름' },
  { key: 'type', label: '유형' },
  { key: 'location', label: '위치' },
  { key: 'atmosphere', label: '분위기/감각', multiline: true },
  { key: 'description', label: '묘사', multiline: true },
  { key: 'history', label: '내력/사건', multiline: true },
  { key: 'role', label: '이야기에서의 역할', multiline: true },
  { key: 'notes', label: '기타 메모', multiline: true },
]

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 정규/추가 항목 키 → 한국어 라벨(스키마 밖 키도 본문에 사람이 읽기 좋게 표시). 없는 키는 키 그대로(사용자 정의 한국어 항목명 등).
export const EXTRA_FIELD_LABEL: Record<string, string> = {
  gender: '성별', mbti: 'MBTI', bloodType: '혈액형', height: '키', weight: '몸무게', body: '체형', hair: '머리', eyes: '눈',
  mark: '특징/표식', value: '가치관', desire: '욕망', motivation: '동기', fear: '두려움', flaw: '약점/결점', secret: '비밀',
  speech: '말투', habit: '습관', quirk: '독특한 점', hobby: '취미', origin: '출신', relations: '관계', affiliation: '소속', etc: '기타',
  kind: '종류', atmosphere: '분위기', sensory: '감각', geography: '지형/위치', climate: '기후', culture: '문화', inhabitants: '거주민',
  rules: '규칙/제약', dangers: '위험', landmarks: '랜드마크', secrets: '비밀',
}

/** 캐릭터 필드 → 표시용 HTML(저장 시 RTF 로 변환). 빈 필드도 라벨을 남겨 시트처럼 보이게.
 *  스키마(defs)에 없는 키(성별·MBTI·기타·사용자 정의 항목 등)도 손실 없이 '추가 항목'으로 함께 출력한다. */
export function characterToHtml(fields: Record<string, string>, defs: CharField[] = CHARACTER_FIELDS): string {
  const parts: string[] = []
  for (const f of defs) {
    const v = (fields[f.key] || '').trim()
    if (f.key === 'name' && v) {
      parts.push(`<h2>${esc(v)}</h2>`)
      continue
    }
    const body = v ? esc(v).replace(/\n/g, '<br>') : ''
    parts.push(`<p><strong>${esc(f.label)}:</strong> ${body}</p>`)
  }
  // 스키마에 없는 키도 보존(손실 없는 연동 — 카드 본문/컴파일/검색/내보내기에 포함).
  const known = new Set(defs.map((f) => f.key))
  for (const [k, raw] of Object.entries(fields || {})) {
    if (known.has(k)) continue
    const v = (raw || '').trim()
    if (!v) continue
    parts.push(`<p><strong>${esc(EXTRA_FIELD_LABEL[k] || k)}:</strong> ${esc(v).replace(/\n/g, '<br>')}</p>`)
  }
  return parts.join('')
}

/** 캐릭터 필드 → RTF(canon 본문). 컴파일/검색/내보내기는 이 본문으로 동작. */
export function characterToRtf(fields: Record<string, string>, defs: CharField[] = CHARACTER_FIELDS): string {
  return htmlToRtf(characterToHtml(fields, defs))
}

/** 시트 템플릿(텍스트 문서)용 빈 양식 HTML. */
function sheetHtml(defs: CharField[]): string {
  return defs.map((f) => `<p><strong>${esc(f.label)}:</strong> </p>`).join('')
}

export interface DocTemplate {
  id: string
  name: string
  desc: string
  /** 'character-card' = 구조화 카드(폼), 'text-sheet' = 양식 텍스트 문서, 'blank' = 빈 문서 */
  kind: 'character-card' | 'setting-card' | 'text-sheet' | 'blank'
  icon: string
  /** 어느 루트를 선호하는지(없으면 현재 컨테이너). */
  prefer?: 'research' | 'draft'
  /** text-sheet 의 본문 RTF. */
  rtf?: string
  fields?: CharField[]
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'character-card',
    name: '캐릭터 카드 (구조화)',
    desc: '폼으로 입력하는 등장인물 카드 — 스크리브너에 없는 편의 기능',
    kind: 'character-card',
    icon: 'character',
    prefer: 'research',
    fields: CHARACTER_FIELDS,
  },
  {
    id: 'character-sheet',
    name: '캐릭터 스케치 (시트)',
    desc: '스크리브너식 항목 양식 텍스트 문서',
    kind: 'text-sheet',
    icon: 'character',
    prefer: 'research',
    rtf: htmlToRtf('<h2>등장인물</h2>' + sheetHtml(CHARACTER_FIELDS)),
  },
  {
    id: 'setting-sheet',
    name: '장소/배경 스케치 (시트)',
    desc: '장소·세계관 설정 양식 텍스트 문서',
    kind: 'text-sheet',
    icon: 'text',
    prefer: 'research',
    rtf: htmlToRtf('<h2>장소/배경</h2>' + sheetHtml(SETTING_FIELDS)),
  },
  {
    id: 'setting-card',
    name: '장소 카드 (구조화)',
    desc: '폼으로 입력하는 장소/배경 카드',
    kind: 'setting-card',
    icon: 'text',
    prefer: 'research',
    fields: SETTING_FIELDS,
  },
  {
    id: 'blank',
    name: '빈 문서',
    desc: '일반 텍스트 문서',
    kind: 'blank',
    icon: 'text',
    prefer: 'draft',
  },
]
