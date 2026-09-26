// 참고문헌 서지 생성 모듈. 본문 인용·참고문헌 항목·목록·BibTeX/RIS 파싱.
// 외부 라이브러리 없는 순수 함수. 빈/누락 필드에서 throw 하지 않는다(가능한 한 자연스럽게 생략).
import type { CslItem, CiteStyle, RefType } from '../model/types.ts'

export const STYLE_LABELS: Record<CiteStyle, string> = {
  apa: 'APA 7판',
  mla: 'MLA 9판',
  chicago: 'Chicago',
  ieee: 'IEEE',
  kci: 'KCI(한국)',
}

// ---------------------------------------------------------------------------
// 공용 유틸
// ---------------------------------------------------------------------------

/** 한글(한자 포함) 문자가 있으면 한국식 이름 처리. */
function isHangul(s: string): boolean {
  return /[㄰-㆏가-힣一-鿿]/.test(s)
}

function clean(s: string | undefined | null): string {
  return (s == null ? '' : String(s)).trim()
}

/** "성, 이름" / "이름 성" / "성이름" → {family, given} 분해. */
interface Name {
  family: string
  given: string
  /** 한글식(가족명이 앞, 이름 약자 미사용)인지. */
  hangul: boolean
}

function parseName(raw: string): Name {
  const name = clean(raw)
  if (!name) return { family: '', given: '', hangul: false }
  const hangul = isHangul(name)
  if (hangul) {
    // 한글 이름은 분리하지 않는다(예: "홍길동"). "홍, 길동" 형태면 합친다.
    if (name.includes(',')) {
      const [fam, giv] = name.split(',')
      return { family: clean(fam) + clean(giv), given: '', hangul: true }
    }
    return { family: name, given: '', hangul: true }
  }
  // 영문: "Family, Given" 우선.
  if (name.includes(',')) {
    const [fam, giv] = name.split(',')
    return { family: clean(fam), given: clean(giv), hangul: false }
  }
  // "Given Middle Family" → 마지막 토큰을 성으로.
  const parts = name.split(/\s+/)
  if (parts.length === 1) return { family: parts[0], given: '', hangul: false }
  const family = parts[parts.length - 1]
  const given = parts.slice(0, -1).join(' ')
  return { family, given, hangul: false }
}

/** 영문 이름의 약자 이니셜("John Quincy" → "J. Q."). */
function initials(given: string): string {
  return given
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + '.')
    .join(' ')
}

/** 본문 인용/정렬에 쓰는 대표 성(저자 없으면 제목 앞단어). */
function leadKey(item: CslItem): string {
  const a = (item.authors || []).map(clean).filter(Boolean)
  if (a.length) return parseName(a[0]).family
  const t = clean(item.title)
  return t ? t.split(/\s+/)[0] : ''
}

/** 제목 강조: 책·저널 등 수록물은 *별표*, 논문 제목 등은 "따옴표". */
function ital(s: string | undefined | null): string {
  const t = clean(s)
  return t ? '' + t + '' : ''
}
function quote(s: string | undefined | null): string {
  const t = clean(s)
  return t ? `"${t}"` : ''
}

/** 마침표로 끝나지 않으면 마침표 추가. */
function dot(s: string | undefined | null): string {
  const t = clean(s)
  if (!t) return ''
  return /[.!?]$/.test(t) ? t : t + '.'
}

/** 비어있지 않은 조각만 구분자로 연결. */
function join(parts: (string | undefined | null)[], sep: string): string {
  return parts.map(clean).filter(Boolean).join(sep)
}

/** "수록물은 컨테이너, 그 외엔 출판사" 류의 수록처 표기 헬퍼. */
function isPeriodical(type: RefType): boolean {
  return type === 'article' || type === 'news' || type === 'conference'
}

/** DOI/URL 접근 표기(스타일 무관 공통 꼬리). */
function locator(item: CslItem): string {
  const doi = clean(item.doi)
  if (doi) return doi.startsWith('http') ? doi : `https://doi.org/${doi}`
  return clean(item.url)
}

// ---------------------------------------------------------------------------
// 저자 나열(스타일별)
// ---------------------------------------------------------------------------

/** APA: "성, A. A., & 성, B. B." (한글은 "홍길동, 김철수"). */
function authorsApa(authors: string[]): string {
  const list = (authors || []).map(clean).filter(Boolean)
  if (!list.length) return ''
  const fmt = (raw: string) => {
    const n = parseName(raw)
    if (n.hangul) return n.family
    return n.given ? `${n.family}, ${initials(n.given)}` : n.family
  }
  const names = list.map(fmt)
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1]
}

/** MLA: 첫 저자 "성, 이름", 나머지 "이름 성", 3인 이상은 "et al.". */
function authorsMla(authors: string[]): string {
  const list = (authors || []).map(clean).filter(Boolean)
  if (!list.length) return ''
  const first = parseName(list[0])
  const firstStr = first.hangul
    ? first.family
    : join([first.family, first.given], ', ')
  if (list.length === 1) return firstStr
  if (list.length > 2) return `${firstStr}, et al.`
  const second = parseName(list[1])
  const secondStr = second.hangul ? second.family : join([second.given, second.family], ' ')
  return `${firstStr}, and ${secondStr}`
}

/** Chicago(notes-bibliography, 참고목록형): 첫 저자 "성, 이름", 나머지 "이름 성". */
function authorsChicago(authors: string[]): string {
  const list = (authors || []).map(clean).filter(Boolean)
  if (!list.length) return ''
  const first = parseName(list[0])
  const firstStr = first.hangul ? first.family : join([first.family, first.given], ', ')
  if (list.length === 1) return firstStr
  const rest = list.slice(1).map((r) => {
    const n = parseName(r)
    return n.hangul ? n.family : join([n.given, n.family], ' ')
  })
  if (rest.length === 1) return `${firstStr}, and ${rest[0]}`
  return `${firstStr}, ${rest.slice(0, -1).join(', ')}, and ${rest[rest.length - 1]}`
}

/** IEEE: "A. A. 성, B. B. 성, and C. C. 성" (한글은 그대로). */
function authorsIeee(authors: string[]): string {
  const list = (authors || []).map(clean).filter(Boolean)
  if (!list.length) return ''
  const fmt = (raw: string) => {
    const n = parseName(raw)
    if (n.hangul) return n.family
    return n.given ? `${initials(n.given)} ${n.family}` : n.family
  }
  const names = list.map(fmt)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1]
}

/** KCI(한국식): 저자명을 가운뎃점/쉼표로 나열(한글 우선). */
function authorsKci(authors: string[]): string {
  const list = (authors || []).map(clean).filter(Boolean)
  if (!list.length) return ''
  const fmt = (raw: string) => {
    const n = parseName(raw)
    if (n.hangul) return n.family
    return n.given ? `${n.family}, ${initials(n.given)}` : n.family
  }
  return list.map(fmt).join(' · ')
}

/** 편집자 명단을 스타일에 맞춰 평이하게 나열(저자 포맷 재사용). */
function namesForStyle(names: string[], style: CiteStyle): string {
  switch (style) {
    case 'apa':
      return authorsApa(names)
    case 'mla':
      return authorsMla(names)
    case 'chicago':
      return authorsChicago(names)
    case 'ieee':
      return authorsIeee(names)
    case 'kci':
      return authorsKci(names)
    default:
      return authorsApa(names)
  }
}

/** 항목의 편집자가 저자 명단과 별개로 존재하는지(저자=편집자 단순 승격은 제외). */
function hasDistinctEditors(item: CslItem): boolean {
  const eds = (item.editors || []).map(clean).filter(Boolean)
  if (!eds.length) return false
  const auth = (item.authors || []).map(clean).filter(Boolean)
  if (!auth.length) return false // 저자 없음 → 편집자가 저자 자리(별도 표기 불필요, 라벨만)
  // 저자와 편집자가 동일 명단이면(편집자 승격) 중복 표기하지 않는다.
  return eds.join('|') !== auth.join('|')
}

/**
 * 편집자가 (실질) 저자 자리에 오는 항목인지.
 * (a) 저자 없이 편집자만 있거나,
 * (b) 저자 명단이 편집자 명단과 동일(BibTeX 파서가 editor 를 author 자리로 승격한 편집서).
 * 이 경우 편집자임을 알리는 'Ed.'/'편' 라벨을 저자 자리에 붙인다.
 */
function editorAsAuthor(item: CslItem): boolean {
  const eds = (item.editors || []).map(clean).filter(Boolean)
  if (!eds.length) return false
  const auth = (item.authors || []).map(clean).filter(Boolean)
  if (!auth.length) return true
  return eds.join('|') === auth.join('|')
}

/** editorAsAuthor 항목의 저자 자리에 쓸 명단(편집자 우선, 없으면 저자). */
function editorAuthorNames(item: CslItem): string[] {
  const eds = (item.editors || []).map(clean).filter(Boolean)
  return eds.length ? eds : (item.authors || []).map(clean).filter(Boolean)
}

/** 항목에 붙일 편집자 표기 조각(스타일별). 없으면 빈 문자열. */
function editorTag(item: CslItem, style: CiteStyle): string {
  if (!hasDistinctEditors(item)) return ''
  const names = namesForStyle(item.editors || [], style)
  if (!names) return ''
  const isKo = isHangul(names)
  switch (style) {
    case 'kci':
      return `${names} 편`
    case 'mla':
    case 'chicago':
      return `Edited by ${names}`
    default:
      return isKo ? `${names} (편)` : `${names} (Ed.)`
  }
}

/** 편집자가 저자 자리일 때(저자 없음) 라벨을 붙인 명단. */
function editorAuthorLabel(names: string, style: CiteStyle): string {
  if (!names) return ''
  const isKo = isHangul(names)
  if (style === 'kci') return `${names} (편)`
  return isKo ? `${names} (편)` : `${names} (Ed.)`
}

// ---------------------------------------------------------------------------
// 본문 인용
// ---------------------------------------------------------------------------

/**
 * 본문 인용 문자열을 만든다.
 * @param allItems 같은 프로젝트의 참고문헌 목록(선택). IEEE 번호식 인용([n])을 만들려면 필요.
 *   목록에서 item 의 등장순(=서지 번호)을 찾아 [n] 으로 표기한다.
 */
export function formatInline(item: CslItem, style: CiteStyle, allItems?: CslItem[]): string {
  const key = leadKey(item) || '미상'
  const year = clean(item.year)
  const authors = (item.authors || []).map(clean).filter(Boolean)
  const multi = authors.length > 2

  switch (style) {
    case 'apa': {
      // (저자, 2020) — 3인 이상은 "저자 et al."
      const lead = multi ? `${key} et al.` : key
      return year ? `(${lead}, ${year})` : `(${lead})`
    }
    case 'mla': {
      // (저자 면수) — 면수 없으면 (저자), 3인 이상 et al.
      const lead = multi ? `${key} et al.` : key
      const page = clean(item.pages)
      return page ? `(${lead} ${page})` : `(${lead})`
    }
    case 'chicago': {
      // 각주식 약식: 저자, "제목," 연도. (간략 각주)
      const t = clean(item.title)
      const tt = t ? (isPeriodical(item.type) ? quote(t) : ital(t)) : ''
      return join([key, tt, year], ', ') + (year ? '.' : '')
    }
    case 'ieee': {
      // IEEE 는 번호식 본문 인용 [n] — 서지(등장순) 번호와 일치시킨다.
      const list = (allItems || []).filter(Boolean)
      if (list.length) {
        const idx = list.findIndex((it) => it && it.id === item.id)
        if (idx >= 0) return `[${idx + 1}]`
      }
      // 목록 컨텍스트가 없으면(번호를 알 수 없으면) 저자·연도로 대체.
      const lead = multi ? `${key} et al.` : key
      return year ? `(${lead}, ${year})` : `(${lead})`
    }
    case 'kci': {
      // 한국식 (저자, 2020)
      const lead = multi ? `${key} 외` : key
      return year ? `(${lead}, ${year})` : `(${lead})`
    }
    default:
      return year ? `(${key}, ${year})` : `(${key})`
  }
}

// ---------------------------------------------------------------------------
// 참고문헌 항목
// ---------------------------------------------------------------------------

function entryApa(item: CslItem): string {
  const auth = editorAsAuthor(item)
    ? editorAuthorLabel(authorsApa(editorAuthorNames(item)), 'apa')
    : authorsApa(item.authors)
  const edTag = editorTag(item, 'apa')
  const year = clean(item.year)
  const yearPart = year ? `(${year}).` : '(n.d.).'
  const title = clean(item.title)
  const parts: string[] = []
  if (auth) parts.push(dot(auth))
  parts.push(yearPart)

  if (isPeriodical(item.type)) {
    // 저자. (연도). 제목. *수록처*, 권(호), 면. https://doi
    if (title) parts.push(dot(title))
    const cont = ital(item.container)
    const vi = clean(item.volume) + (clean(item.issue) ? `(${clean(item.issue)})` : '')
    const tail = join([cont, vi].filter(Boolean), ', ')
    const tailWithPages = join([tail, clean(item.pages)], ', ')
    if (tailWithPages) parts.push(dot(tailWithPages))
  } else if (item.type === 'web') {
    // 저자. (연도). *제목*. 수록처. URL
    if (title) parts.push(dot(ital(title)))
    if (clean(item.container)) parts.push(dot(item.container))
  } else if (item.type === 'chapter') {
    // 저자. (연도). 제목. In E. Editor (Ed.), *책제목* (pp. 면). 출판사.
    if (title) parts.push(dot(title))
    const book = ital(item.container)
    const edLead = edTag ? `${edTag}, ` : ''
    const inBook = book ? `In ${edLead}${book}${clean(item.pages) ? ` (pp. ${clean(item.pages)})` : ''}` : ''
    if (inBook) parts.push(dot(inBook))
    if (clean(item.publisher)) parts.push(dot(item.publisher))
  } else {
    // book/thesis/report/기타: 저자. (연도). *제목*. 출판사.
    if (title) parts.push(dot(ital(title)))
    if (edTag) parts.push(dot(edTag))
    if (clean(item.publisher)) parts.push(dot(item.publisher))
  }
  const loc = locator(item)
  if (loc) parts.push(loc)
  return join(parts, ' ')
}

function entryMla(item: CslItem): string {
  const auth = editorAsAuthor(item)
    ? editorAuthorLabel(authorsMla(editorAuthorNames(item)), 'mla')
    : authorsMla(item.authors)
  const edTag = editorTag(item, 'mla')
  const title = clean(item.title)
  const parts: string[] = []
  if (auth) parts.push(dot(auth))

  if (isPeriodical(item.type)) {
    // 저자. "제목." *수록처*, vol. 권, no. 호, 연도, pp. 면.
    if (title) parts.push(dot(quote(title)))
    const cont = ital(item.container)
    const bits = [
      cont,
      clean(item.volume) ? `vol. ${clean(item.volume)}` : '',
      clean(item.issue) ? `no. ${clean(item.issue)}` : '',
      clean(item.year),
      clean(item.pages) ? `pp. ${clean(item.pages)}` : '',
    ].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
  } else if (item.type === 'web') {
    // 저자. "제목." *사이트*, 연도, URL.
    if (title) parts.push(dot(quote(title)))
    const bits = [ital(item.container), clean(item.year), locator(item)].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
    return join(parts, ' ')
  } else if (item.type === 'chapter') {
    // 저자. "제목." *책*, edited by 편집자, 출판사, 연도, pp. 면.
    if (title) parts.push(dot(quote(title)))
    const bits = [ital(item.container), edTag, clean(item.publisher), clean(item.year), clean(item.pages) ? `pp. ${clean(item.pages)}` : ''].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
  } else {
    // book/기타: 저자. *제목*. edited by 편집자, 출판사, 연도.
    if (title) parts.push(dot(ital(title)))
    const bits = [edTag, clean(item.publisher), clean(item.year)].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
  }
  const loc = locator(item)
  if (loc && item.type !== 'web') parts.push(dot(loc))
  return join(parts, ' ')
}

function entryChicago(item: CslItem): string {
  const auth = editorAsAuthor(item)
    ? editorAuthorLabel(authorsChicago(editorAuthorNames(item)), 'chicago')
    : authorsChicago(item.authors)
  const edTag = editorTag(item, 'chicago')
  const title = clean(item.title)
  const year = clean(item.year)
  const parts: string[] = []
  if (auth) parts.push(dot(auth))

  if (isPeriodical(item.type)) {
    // 저자. 연도. "제목." *수록처* 권 (호): 면. URL/DOI.
    if (year) parts.push(`${year}.`)
    if (title) parts.push(dot(quote(title)))
    const cont = ital(item.container)
    const vol = clean(item.volume)
    const iss = clean(item.issue) ? ` (${clean(item.issue)})` : ''
    const pg = clean(item.pages) ? `: ${clean(item.pages)}` : ''
    const seg = [cont, vol].filter(Boolean).join(' ') + iss + pg
    if (clean(seg)) parts.push(dot(seg))
  } else if (item.type === 'web') {
    // 저자. 연도. "제목." *사이트*. URL.
    if (year) parts.push(`${year}.`)
    if (title) parts.push(dot(quote(title)))
    if (clean(item.container)) parts.push(dot(ital(item.container)))
  } else if (item.type === 'chapter') {
    // 저자. 연도. "제목." In *책*, edited by 편집자, 면. 출판사.
    if (year) parts.push(`${year}.`)
    if (title) parts.push(dot(quote(title)))
    const book = ital(item.container)
    const edSeg = edTag ? `, ${edTag}` : ''
    const inBook = book ? `In ${book}${edSeg}${clean(item.pages) ? `, ${clean(item.pages)}` : ''}` : ''
    if (inBook) parts.push(dot(inBook))
    if (clean(item.publisher)) parts.push(dot(item.publisher))
  } else {
    // book/기타: 저자. 연도. *제목*. edited by 편집자. 출판사.
    if (year) parts.push(`${year}.`)
    if (title) parts.push(dot(ital(title)))
    if (edTag) parts.push(dot(edTag))
    if (clean(item.publisher)) parts.push(dot(item.publisher))
  }
  const loc = locator(item)
  if (loc) parts.push(dot(loc))
  return join(parts, ' ')
}

function entryIeee(item: CslItem, index: number): string {
  const auth = editorAsAuthor(item)
    ? editorAuthorLabel(authorsIeee(editorAuthorNames(item)), 'ieee')
    : authorsIeee(item.authors)
  const edTag = editorTag(item, 'ieee')
  const title = clean(item.title)
  const year = clean(item.year)
  const num = `[${index}]`
  const parts: string[] = []
  if (auth) parts.push(`${auth},`)

  if (isPeriodical(item.type)) {
    // [n] A. A. 성, "제목," *수록처*, vol. 권, no. 호, pp. 면, 연도.
    if (title) parts.push(`${quote(title)},`)
    const bits = [
      ital(item.container),
      clean(item.volume) ? `vol. ${clean(item.volume)}` : '',
      clean(item.issue) ? `no. ${clean(item.issue)}` : '',
      clean(item.pages) ? `pp. ${clean(item.pages)}` : '',
      year,
    ].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
  } else if (item.type === 'web') {
    // [n] A. 성, "제목," 수록처, 연도. [Online]. Available: URL
    if (title) parts.push(`${quote(title)},`)
    const bits = [clean(item.container), year].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
    const loc = locator(item)
    if (loc) parts.push(`[Online]. Available: ${loc}`)
    return num + ' ' + join(parts, ' ')
  } else {
    // book/기타: [n] A. 성, *제목*, 편집자 (Ed.). 출판사, 연도.
    if (title) parts.push(edTag ? `${ital(title)},` : `${ital(title)}.`)
    if (edTag) parts.push(`${edTag}.`)
    const bits = [clean(item.publisher), year].filter(Boolean)
    if (bits.length) parts.push(dot(bits.join(', ')))
  }
  const loc = locator(item)
  if (loc) parts.push(loc)
  return num + ' ' + join(parts, ' ')
}

function entryKci(item: CslItem): string {
  const auth = editorAsAuthor(item)
    ? editorAuthorLabel(authorsKci(editorAuthorNames(item)), 'kci')
    : authorsKci(item.authors)
  const edTag = editorTag(item, 'kci')
  const year = clean(item.year)
  const title = clean(item.title)
  const parts: string[] = []
  // 저자 (연도). 「제목」. 『수록처』, 권(호), 면.
  if (auth) parts.push(auth)
  if (year) parts.push(`(${year}).`)
  else if (auth) parts[parts.length - 1] = auth + '.'

  if (isPeriodical(item.type)) {
    if (title) parts.push(`「${title}」.`)
    const cont = clean(item.container) ? `『${clean(item.container)}』` : ''
    const vi = clean(item.volume) + (clean(item.issue) ? `(${clean(item.issue)})` : '')
    const tail = join([cont, vi].filter(Boolean), ', ')
    const tailWithPages = join([tail, clean(item.pages)], ', ')
    if (tailWithPages) parts.push(dot(tailWithPages))
  } else if (item.type === 'web') {
    if (title) parts.push(`「${title}」.`)
    if (clean(item.container)) parts.push(`『${clean(item.container)}』.`)
  } else {
    // 단행본/기타: 저자 (연도). 『제목』. 편집자 편. 출판사.
    if (title) parts.push(`『${title}』.`)
    if (edTag) parts.push(`${edTag}.`)
    if (clean(item.publisher)) parts.push(dot(item.publisher))
  }
  const loc = locator(item)
  if (loc) parts.push(loc)
  return join(parts, ' ')
}

export function formatEntry(item: CslItem, style: CiteStyle): string {
  switch (style) {
    case 'apa':
      return entryApa(item)
    case 'mla':
      return entryMla(item)
    case 'chicago':
      return entryChicago(item)
    case 'ieee':
      return entryIeee(item, 1)
    case 'kci':
      return entryKci(item)
    default:
      return entryApa(item)
  }
}

// ---------------------------------------------------------------------------
// 참고문헌 목록
// ---------------------------------------------------------------------------

function sortKey(item: CslItem): string {
  const k = leadKey(item)
  // 한글은 가나다(코드포인트), 영문은 소문자 알파벳 비교.
  return isHangul(k) ? k : k.toLowerCase()
}

/** 정렬 비교자(저자/제목 키 + 연도 보조). */
function compareEntries(a: CslItem, b: CslItem): number {
  const ka = sortKey(a)
  const kb = sortKey(b)
  if (ka < kb) return -1
  if (ka > kb) return 1
  // 동일 저자면 연도 보조 정렬.
  return clean(a.year).localeCompare(clean(b.year))
}

/** 항목의 대표 키가 한글(국문)인지 — 국문/영문 그룹 분리에 사용. */
function isKoreanEntry(item: CslItem): boolean {
  return isHangul(leadKey(item))
}

export interface BibliographyOptions {
  /** 국문/영문(서양) 문헌을 별도 그룹으로 나눠 각각 정렬·소제목을 붙인다(KCI/APA 한국 관례). 기본 false(기존 동작). */
  groupByScript?: boolean
  /** 그룹 소제목(미지정 시 기본값). */
  koreanHeading?: string
  /** 그룹 소제목(미지정 시 기본값). */
  westernHeading?: string
}

export function formatBibliography(
  items: CslItem[],
  style: CiteStyle,
  options?: BibliographyOptions,
): string {
  const list = (items || []).filter(Boolean)
  if (!list.length) return ''

  if (style === 'ieee') {
    // 등장순(=입력순), 번호 부여. (번호식 서지는 국문/영문 분리 관례가 없으므로 그룹화 미적용.)
    return list.map((it, i) => entryIeee(it, i + 1)).join('\n')
  }

  // 국문/영문 분리 옵션: 한국 학술지(KCI/국내 APA) 관례에 맞춰 두 그룹으로 나눈다.
  if (options?.groupByScript) {
    const korean = list.filter(isKoreanEntry).sort(compareEntries)
    const western = list.filter((it) => !isKoreanEntry(it)).sort(compareEntries)
    const koHead = options.koreanHeading ?? '국내문헌'
    const enHead = options.westernHeading ?? '국외문헌'
    const blocks: string[] = []
    if (korean.length) {
      blocks.push(koHead)
      blocks.push(...korean.map((it) => formatEntry(it, style)))
    }
    if (western.length) {
      if (blocks.length) blocks.push('') // 그룹 사이 빈 줄.
      blocks.push(enHead)
      blocks.push(...western.map((it) => formatEntry(it, style)))
    }
    return blocks.join('\n')
  }

  // APA/MLA/Chicago/KCI: 저자(또는 제목) 알파벳/가나다 정렬.
  const sorted = [...list].sort(compareEntries)
  return sorted.map((it) => formatEntry(it, style)).join('\n')
}

// ---------------------------------------------------------------------------
// BibTeX 파서(최소)
// ---------------------------------------------------------------------------

/** BibTeX entry type → RefType 매핑. */
function bibtexType(t: string): RefType {
  const k = t.toLowerCase()
  if (k === 'article') return 'article'
  if (k === 'book' || k === 'booklet') return 'book'
  if (k === 'inbook' || k === 'incollection') return 'chapter'
  if (k === 'inproceedings' || k === 'conference' || k === 'proceedings') return 'conference'
  if (k === 'phdthesis' || k === 'mastersthesis') return 'thesis'
  if (k === 'techreport') return 'report'
  if (k === 'online' || k === 'misc' || k === 'electronic' || k === 'www') return 'web'
  return 'other'
}

/** "{...}" / "...." 중괄호·따옴표·이중중괄호를 벗긴다. */
function stripBraces(v: string): string {
  let s = clean(v)
  // 끝에 콤마가 남는 경우.
  s = s.replace(/,\s*$/, '').trim()
  while (
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim()
  }
  // 내부 중괄호 제거(보호용 {NASA} 등).
  return s.replace(/[{}]/g, '').trim()
}

/** BibTeX author 필드 "A and B and C" → string[]. */
function splitBibAuthors(v: string): string[] {
  const s = stripBraces(v)
  if (!s) return []
  return s
    .split(/\s+and\s+/i)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** 단일 BibTeX 엔트리 본문(키 다음부터 닫는 중괄호 전까지)을 필드맵으로. */
function parseBibFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {}
  let i = 0
  const n = body.length
  while (i < n) {
    // 키 읽기: 다음 '=' 까지.
    const eq = body.indexOf('=', i)
    if (eq < 0) break
    const key = body.slice(i, eq).replace(/[,{\s]/g, '').toLowerCase()
    i = eq + 1
    // 값 시작 위치(공백 스킵).
    while (i < n && /\s/.test(body[i])) i++
    let value = ''
    if (body[i] === '{') {
      // 중괄호 균형 맞춰 읽기.
      let depth = 0
      const start = i
      while (i < n) {
        const c = body[i]
        if (c === '{') depth++
        else if (c === '}') {
          depth--
          if (depth === 0) {
            i++
            break
          }
        }
        i++
      }
      value = body.slice(start, i)
    } else if (body[i] === '"') {
      const start = i
      i++
      while (i < n && body[i] !== '"') i++
      i++ // 닫는 따옴표
      value = body.slice(start, i)
    } else {
      // 따옴표/중괄호 없는 값: 콤마 또는 끝까지.
      const start = i
      while (i < n && body[i] !== ',') i++
      value = body.slice(start, i)
    }
    if (key) fields[key] = value
    // 다음 콤마까지 스킵.
    while (i < n && body[i] !== ',') i++
    i++ // 콤마 건너뛰기
  }
  return fields
}

export function parseBibtex(text: string): CslItem[] {
  const src = clean(text)
  if (!src) return []
  const out: CslItem[] = []
  let idx = 0
  const n = src.length
  let auto = 0
  while (idx < n) {
    const at = src.indexOf('@', idx)
    if (at < 0) break
    const brace = src.indexOf('{', at)
    if (brace < 0) break
    const entryType = src.slice(at + 1, brace).trim().toLowerCase()
    // @string/@comment/@preamble 무시.
    if (entryType === 'string' || entryType === 'comment' || entryType === 'preamble') {
      idx = brace + 1
      continue
    }
    // 균형 중괄호로 엔트리 끝 찾기.
    let depth = 0
    let j = brace
    for (; j < n; j++) {
      if (src[j] === '{') depth++
      else if (src[j] === '}') {
        depth--
        if (depth === 0) break
      }
    }
    const inner = src.slice(brace + 1, j)
    idx = j + 1

    // cite key: 첫 콤마 전.
    const comma = inner.indexOf(',')
    const citeKey = comma >= 0 ? inner.slice(0, comma).trim() : ''
    const body = comma >= 0 ? inner.slice(comma + 1) : inner
    const f = parseBibFields(body)

    const item: CslItem = {
      id: citeKey || `bib-${++auto}`,
      type: bibtexType(entryType),
      title: stripBraces(f.title || ''),
      // 저자가 없고 편집자만 있으면(편집서 등) 편집자를 저자 자리로 끌어올리되, editors 에도 보존한다.
      authors: splitBibAuthors(f.author || f.editor || ''),
    }
    const editors = splitBibAuthors(f.editor || '')
    if (editors.length) item.editors = editors
    const year = stripBraces(f.year || f.date || '')
    if (year) item.year = year.replace(/[^0-9].*$/, '') || year
    const month = stripBraces(f.month || '')
    if (month) item.month = month
    const container = stripBraces(f.journal || f.booktitle || f.journaltitle || f.howpublished || '')
    if (container) item.container = container
    const publisher = stripBraces(f.publisher || f.institution || f.school || f.organization || '')
    if (publisher) item.publisher = publisher
    const volume = stripBraces(f.volume || '')
    if (volume) item.volume = volume
    const issue = stripBraces(f.number || f.issue || '')
    if (issue) item.issue = issue
    const pages = stripBraces(f.pages || '').replace(/--/g, '-')
    if (pages) item.pages = pages
    const url = stripBraces(f.url || '')
    if (url) item.url = url
    const doi = stripBraces(f.doi || '')
    if (doi) item.doi = doi
    const note = stripBraces(f.note || f.annote || '')
    if (note) item.note = note
    out.push(item)
  }
  return out
}

// ---------------------------------------------------------------------------
// RIS 파서(최소)
// ---------------------------------------------------------------------------

/** RIS TY 코드 → RefType. */
function risType(t: string): RefType {
  const k = clean(t).toUpperCase()
  switch (k) {
    case 'JOUR':
      return 'article'
    case 'BOOK':
    case 'EBOOK':
      return 'book'
    case 'CHAP':
      return 'chapter'
    case 'CONF':
    case 'CPAPER':
      return 'conference'
    case 'THES':
      return 'thesis'
    case 'RPRT':
      return 'report'
    case 'NEWS':
    case 'MGZN':
      return 'news'
    case 'ELEC':
    case 'WEB':
    case 'ICOMM':
      return 'web'
    default:
      return 'other'
  }
}

export function parseRis(text: string): CslItem[] {
  const src = clean(text)
  if (!src) return []
  const out: CslItem[] = []
  const lines = src.split(/\r?\n/)
  let cur: Record<string, string[]> | null = null
  let auto = 0
  let lastTag = ''

  const flush = () => {
    if (!cur) return
    const get = (tag: string) => (cur![tag] && cur![tag][0]) || ''
    const item: CslItem = {
      id: get('ID') || get('DO') || `ris-${++auto}`,
      type: risType(get('TY')),
      title: get('TI') || get('T1') || get('CT') || '',
      authors: [...(cur['AU'] || []), ...(cur['A1'] || []), ...(cur['A2'] || [])].map(clean).filter(Boolean),
    }
    const dateRaw = get('PY') || get('Y1') || get('DA')
    const year = dateRaw.replace(/[^0-9].*$/, '')
    if (year) item.year = year
    // RIS 날짜는 "YYYY/MM/DD/기타" 형식 — 월(2번째 토큰)을 보존(web/news 발행월).
    const dateParts = dateRaw.split('/')
    const month = (dateParts[1] || '').trim()
    if (month) item.month = month
    const container = get('JO') || get('JF') || get('T2') || get('JA') || get('BT')
    if (container) item.container = container
    const publisher = get('PB')
    if (publisher) item.publisher = publisher
    const volume = get('VL')
    if (volume) item.volume = volume
    const issue = get('IS') || get('CP')
    if (issue) item.issue = issue
    const sp = get('SP')
    const ep = get('EP')
    const pages = sp && ep ? `${sp}-${ep}` : sp || ep
    if (pages) item.pages = pages
    const url = get('UR') || get('L1') || get('L2')
    if (url) item.url = url
    const doi = get('DO') || get('DI')
    if (doi) item.doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    const accessed = get('Y2')
    if (accessed) item.accessed = accessed
    const note = get('N1') || get('AB')
    if (note) item.note = note
    // 제목/저자 어느 것도 없으면(빈 레코드) 버린다.
    if (item.title || item.authors.length || cur['TY']) out.push(item)
    cur = null
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    const m = /^([A-Z][A-Z0-9])\s{0,2}-\s?(.*)$/.exec(line)
    if (m) {
      const tag = m[1]
      const val = m[2].trim()
      if (tag === 'TY') {
        // 새 레코드 시작.
        if (cur) flush()
        cur = {}
      }
      if (!cur) cur = {}
      if (tag === 'ER') {
        flush()
        lastTag = ''
        continue
      }
      if (!cur[tag]) cur[tag] = []
      cur[tag].push(val)
      lastTag = tag
    } else if (cur && lastTag && line.trim()) {
      // 여러 줄 이어지는 값(abstract 등).
      const arr = cur[lastTag]
      if (arr && arr.length) arr[arr.length - 1] += ' ' + line.trim()
    }
  }
  // ER 없이 끝난 마지막 레코드.
  flush()
  return out
}
