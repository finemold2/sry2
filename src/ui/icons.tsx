// 커스텀 SVG 아이콘 시스템 — 이모지/유니코드 대신 직접 그린 24x24 라인 아이콘.
// 모두 stroke=currentColor 라 글자색·크기를 그대로 따른다(UI 일관성). 상용 수준의 응집된 세트.
//   · <Icon name size> 로 사용. 없는 이름은 'dot' 폴백.
//   · iconForTool(meta) 가 도구의 group/name/id 로 적절한 아이콘을 자동 선택(전 도구 95%+ 커스텀 렌더).
import type { CSSProperties } from 'react'

// 각 아이콘 = SVG 자식 마크업(24x24, stroke 기반). path/circle/line 등.
const P: Record<string, string> = {
  // ── 코어 동작 ──
  menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  search: '<circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  minimize: '<line x1="6" y1="17" x2="18" y2="17"/>',
  maximize: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  restore: '<rect x="7" y="7" width="11" height="11" rx="1.5"/><path d="M5 14V6a1 1 0 0 1 1-1h8"/>',
  detach: '<path d="M14 4h6v6"/><line x1="20" y1="4" x2="12" y2="12"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13"/>',
  // ── 뷰/패널 ──
  editor: '<path d="M5 4h14v16H5z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
  corkboard: '<rect x="4" y="5" width="7" height="6" rx="1"/><rect x="13" y="5" width="7" height="6" rx="1"/><rect x="4" y="14" width="7" height="5" rx="1"/><rect x="13" y="14" width="7" height="5" rx="1"/>',
  outliner: '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
  board: '<rect x="4" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="16" y="4" width="4" height="14" rx="1"/>',
  canvas: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="15" r="2.4"/><line x1="9.6" y1="9.2" x2="14.4" y2="13.4"/>',
  serial: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="3" x2="8" y2="6"/><line x1="16" y1="3" x2="16" y2="6"/><circle cx="16" cy="15" r="2.2"/>',
  timeline: '<line x1="4" y1="12" x2="20" y2="12"/><circle cx="7" cy="12" r="2"/><circle cx="13" cy="12" r="2"/><circle cx="18" cy="12" r="1.6"/>',
  references: '<path d="M5 4h10l4 4v12H5z"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="14" y2="15"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6"/>',
  inspector: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/>',
  binder: '<path d="M4 5h7l2 2h7v12H4z"/>',
  argument: '<circle cx="12" cy="6" r="2.5"/><circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M11 8L7 15M13 8l4 7"/>',
  // ── 도구 그룹/개념 ──
  idea: '<path d="M12 3a6 6 0 0 1 4 10.5c-.7.7-1 1.3-1 2.5H9c0-1.2-.3-1.8-1-2.5A6 6 0 0 1 12 3z"/><line x1="9" y1="20" x2="15" y2="20"/>',
  focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  organize: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  language: '<path d="M4 6h9M8.5 6c0 5-2 9-4.5 11M6 11c1.5 2.5 4 4 6 4.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>',
  reference: '<path d="M6 4h9l3 3v13H6z"/><circle cx="11.5" cy="11" r="2.5"/><line x1="13.3" y1="12.8" x2="15" y2="14.5"/>',
  research: '<circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.5" y2="15.5"/><line x1="11" y1="8.5" x2="11" y2="13.5"/><line x1="8.5" y1="11" x2="13.5" y2="11"/>',
  mood: '<path d="M5 16c2-4 4-6 7-6s5 2 7 6"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><path d="M9 13c1 1 5 1 6 0"/>',
  vocab: '<path d="M5 5h14v14H5z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/>',
  character: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3.5-6 7-6s7 2 7 6"/>',
  setting: '<path d="M4 19l4-12 4 8 3-5 5 9z"/><circle cx="17" cy="6" r="2"/>',
  world: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 2.5 3 14 0 17M12 3.5c-3 2.5-3 14 0 17"/>',
  plot: '<path d="M4 19c3 0 4-11 8-11s5 6 8 6"/><circle cx="4" cy="19" r="1.3"/><circle cx="20" cy="14" r="1.3"/>',
  generator: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/>',
  knowledge: '<path d="M4 5v13a3 3 0 0 1 3-2h11V4H7a3 3 0 0 0-3 1z"/><line x1="9" y1="8" x2="15" y2="8"/>',
  device: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/><line x1="12" y1="4" x2="12" y2="1"/>',
  structure: '<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="15" width="6" height="4" rx="1"/><rect x="15" y="15" width="6" height="4" rx="1"/><path d="M12 7v4M12 11H6v4M12 11h6v4"/>',
  conflict: '<path d="M5 5l6 6M5 9V5h4M13 13l6 6M19 15v4h-4"/><path d="M19 5l-6 6M15 5h4v4M11 13l-6 6M5 15v4h4"/>',
  scene: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 9l3-3M9 6l-3 3M15 6l-3 3M21 9l-3-3"/>',
  music: '<circle cx="7" cy="17" r="2.2"/><circle cx="17" cy="15" r="2.2"/><path d="M9.2 17V6l10-2v11"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M3 17l5-4 4 3 3-3 6 5"/>',
  name: '<circle cx="12" cy="8" r="3"/><path d="M6 19c0-3 3-5 6-5s6 2 6 5"/><line x1="9" y1="21" x2="15" y2="21"/>',
  revise: '<path d="M5 19l1-4L16 5l3 3L9 18z"/><line x1="14" y1="7" x2="17" y2="10"/>',
  timer: '<circle cx="12" cy="13" r="7"/><line x1="12" y1="13" x2="12" y2="9"/><line x1="9.5" y1="3" x2="14.5" y2="3"/>',
  quote: '<path d="M7 7h4v5c0 2-1.5 3.5-4 4M13 7h4v5c0 2-1.5 3.5-4 4"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><circle cx="12" cy="12" r="1.3"/>',
  compile: '<path d="M5 4h14v16H5z"/><path d="M9 9l-2 2 2 2M15 9l2 2-2 2"/>',
  tools: '<path d="M14 7a3.5 3.5 0 0 0-4.8 4.3l-5 5L6 18l5-5A3.5 3.5 0 0 0 14 7z"/><circle cx="16" cy="8" r="2.5"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2z"/><line x1="9" y1="8" x2="14" y2="8"/>',
  map: '<path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
  dot: '<circle cx="12" cy="12" r="2.5"/>',
  snapshot: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-2h5L16 7"/>',
  list: '<line x1="8" y1="7" x2="20" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="17" x2="20" y2="17"/><circle cx="4" cy="7" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="17" r="1"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  // 편집기 분할(세로 2분할) — 인스펙터(단일 우측 패널)와 구분
  split: '<rect x="3" y="5" width="18" height="14" rx="2"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="6.5" y1="9.5" x2="9" y2="9.5"/><line x1="15" y1="9.5" x2="17.5" y2="9.5"/>',
  // 명령 팔레트(검색 입력 + 목록)
  palette: '<rect x="3" y="4" width="18" height="4.5" rx="1.5"/><line x1="6" y1="13" x2="18" y2="13"/><line x1="6" y1="17" x2="14" y2="17"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  heart: '<path d="M12 20s-6.5-4.3-6.5-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 6.5 2.8C18.5 15.7 12 20 12 20z"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5h11l-2.2 3.4L17 11.3H6"/>',
  link: '<path d="M9.5 14.5l5-5"/><path d="M11 7.5l1.2-1.2a3.6 3.6 0 0 1 5.1 5.1L16 12.7"/><path d="M13 16.5l-1.2 1.2a3.6 3.6 0 0 1-5.1-5.1L8 11.3"/>',
}

// 의미별 색상 — 개념/도구/뷰 아이콘에 콘텐츠를 반영한 색을 입힌다(라이트·다크 공통으로 무난한 채도).
// 동작/크롬 아이콘(menu·search·save·close 등)은 여기 없음 → currentColor(테마색 상속, 호버/활성 틴트 유지).
export const ICON_COLOR: Record<string, string> = {
  // 엔티티/개념
  character: '#4f9d8f', name: '#4f9d8f', setting: '#5aa469', world: '#3f9e86', map: '#5aa469',
  plot: '#8b6dd4', structure: '#8b6dd4', idea: '#e0a93b', sparkle: '#e0a93b',
  music: '#c2557a', image: '#4a90d9', scene: '#d97742', conflict: '#cf5b52',
  knowledge: '#b9863f', book: '#b9863f', reference: '#b9863f', references: '#b9863f',
  vocab: '#4a86c5', language: '#4a86c5', revise: '#5aa06b', quote: '#9a86c8',
  generator: '#6f8fd6', dice: '#6f8fd6', device: '#7d8794', mood: '#d98fae',
  timer: '#d9544e', focus: '#d9544e', snapshot: '#4a90d9', tools: '#6f8fd6',
  heart: '#d9546e', star: '#e7b53c', flag: '#d9544e', link: '#4a86c5',
  // 뷰(레일/탭)
  editor: '#4a86c5', corkboard: '#d9954a', outliner: '#5aa469', board: '#8b6dd4',
  canvas: '#4f9d8f', serial: '#c2557a', timeline: '#6f8fd6', argument: '#cf7a52',
  database: '#4a90d9', binder: '#b9863f', world_: '#3f9e86',
}

export interface IconProps { name: string; size?: number; className?: string; style?: CSSProperties; strokeWidth?: number; title?: string; color?: string; mono?: boolean }

export function Icon({ name, size = 16, className, style, strokeWidth = 1.7, title, color, mono }: IconProps) {
  const body = P[name] || P.dot
  const resolved = mono ? undefined : (color || ICON_COLOR[name])
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...(resolved ? { color: resolved } : null), ...style }} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + body }}
    />
  )
}

// 도구 그룹 → 아이콘 이름. 장르별 접두 그룹(지식 사전/어휘·표현/장치·전개/캐릭터/배경/세계관/플롯/생성기/구조/갈등)도 포함.
const GROUP_ICON: Record<string, string> = {
  '영감·발상': 'idea', '집중·생산성': 'focus', '구상·정리': 'organize', '교정·언어': 'revise',
  '유틸·참고': 'reference', '리서치·자료': 'research', '분위기·시각': 'mood', '언어·어휘': 'vocab',
  '게임·캐릭터': 'character', '캐릭터': 'character', '배경': 'setting', '세계관': 'world',
  '플롯': 'plot', '생성기': 'generator', '지식 사전': 'knowledge', '어휘·표현': 'vocab',
  '장치·전개': 'device', '구조': 'structure', '갈등': 'conflict',
}
// 이름/intro 키워드 → 아이콘(그룹보다 우선). 더 구체적인 매칭.
const KEYWORD_ICON: [RegExp, string][] = [
  [/이름|작명|name/i, 'name'], [/관계|relationship/i, 'character'], [/인물|캐릭터|character/i, 'character'],
  [/장면|scene/i, 'scene'], [/음악|사운드|playlist|soundscape|ambient/i, 'music'], [/이미지|갤러리|사진|무드보드|gallery|art|컬러|color|팔레트/i, 'image'],
  [/지도|맵|map|월드/i, 'map'], [/타이머|뽀모|스톱워치|timer|sprint|집중/i, 'timer'], [/주사위|dice|랜덤|뽑기|룰렛|wheel/i, 'dice'],
  [/시놉|구조|아웃라인|개요|플롯|비트|outline|structure|plot|beat/i, 'structure'], [/명언|인용|quote|문구/i, 'quote'],
  [/사전|레퍼런스|용어|ref$|reference/i, 'book'], [/생성|forge|generator|gen$/i, 'generator'],
  [/퇴고|교정|문장|문체|가독|맞춤법|동사|부사|대사|diff/i, 'revise'], [/갈등|딜레마|conflict/i, 'conflict'],
  [/세계관|world|문명|행성|종족|마법|설정/i, 'world'], [/배경|장소|setting|place|건축/i, 'setting'],
  [/지식|knowledge|고증|역사|과학/i, 'knowledge'], [/연재|회차|플랫폼|serial/i, 'serial'],
]

export function iconForTool(meta: { id?: string; name?: string; group?: string; intro?: string; icon?: string }): string {
  const hay = `${meta.name || ''} ${meta.id || ''} ${meta.intro || ''}`
  for (const [re, ic] of KEYWORD_ICON) if (re.test(hay)) return ic
  if (meta.group && GROUP_ICON[meta.group]) return GROUP_ICON[meta.group]
  return 'sparkle'
}

// 라벨 앞 이모지/장식 글자 제거(커스텀 아이콘으로 대체하므로). 비면 원본 유지.
export function stripLeadingEmoji(s: string): string {
  return s.replace(/^[\s←-⯿️\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, '').trim() || s
}

// 명령(팔레트/메뉴) id·제목·섹션 → 커스텀 아이콘 이름. 도구는 호출부에서 iconForTool 로 보강 가능.
export function iconForCommand(id: string, title = '', section = ''): string {
  const s = `${id} ${title} ${section}`
  for (const [re, ic] of KEYWORD_ICON) if (re.test(s)) return ic
  if (/컴파일|compile|export|내보/i.test(s)) return 'compile'
  if (/설정|settings/i.test(s)) return 'settings'
  if (/스냅샷|snap/i.test(s)) return 'snapshot'
  if (/스킨|skin|studio|classic|테마|theme|UI/i.test(s)) return 'sparkle'
  if (/통계|분석|stat|style/i.test(s)) return 'structure'
  if (/찾|검색|search|바꾸|replace/i.test(s)) return 'search'
  if (/도구|허브|tool|hub/i.test(s)) return 'tools'
  if (/저장|save|백업|backup/i.test(s)) return 'save'
  if (/문서|파일|새 |new|템플릿/i.test(s)) return 'editor'
  if (/뷰|보기|view|코르크|아웃라인|칸반|캔버스|연재|타임라인|참고|논증|데이터/i.test(s)) return 'corkboard'
  return 'sparkle'
}
