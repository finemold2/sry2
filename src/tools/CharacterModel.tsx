// 캐릭터 모델 가져오기 — 무료·키 없는 공개 API로 세계의 인물/캐릭터 '이름·속성'을 모델로 삼는다(베끼기 아님, 변주용).
// [저작권 안전] 실존 인물 사진(randomuser picture)과 IP 캐릭터 이미지(Rick&Morty image)는 절대 표시하지 않는다.
//   대신 저작권 안전한 DiceBear 오픈소스 아바타(키 불필요·CORS·SVG)를 이름 기반 시드로 생성해 보여준다.
//   이름·나이·문화 같은 '사실/속성' 텍스트는 저작권 대상이 아니므로 영감 모델로 계속 사용한다.
// 데이터 출처: randomuser.me(이름·나이·출신 등 속성만), Rick&Morty API(만화·SF 속성만), An API of Ice and Fire(판타지 속성).
// 도구 컴포넌트는 react 와 './linkbus' 만 import 한다.
import { useEffect, useRef, useState } from 'react'
import {
  addToLibrary,
  updateInLibrary,
  openToolLinked,
  TOOL_RELATIONS,
  hasPendingPick,
  fulfillImagePick,
  getList,
  addToProject,
  hasProjectBridge,
  Emoji,
  emojify,
  type SharedTrait,
} from './linkbus'

export const meta = { id: 'character-model', name: '캐릭터 모델 가져오기', icon: '🎭', group: '영감·발상', intro: '세계의 인물·캐릭터를 모델로 가져와 변주', w: 380, h: 520 }

type Src = 'person' | 'cartoon' | 'fantasy'
const SRCS: { key: Src; label: string }[] = [
  { key: 'person', label: '👤 실존 인물풍' },
  { key: 'cartoon', label: '🛸 만화·SF' },
  { key: 'fantasy', label: '🐉 판타지' },
]
interface Model { name: string; photo: string; traits: { k: string; v: string }[]; credit: string; source: string }

const TWISTS = [
  '이름과 시대를 완전히 바꾸세요.',
  '성별 또는 나이대를 바꿔보세요.',
  '이 인물의 가장 큰 약점 하나를 새로 부여하세요.',
  '직업·신분을 전혀 다른 것으로 교체하세요.',
  '겉모습은 두되 정반대의 가치관을 주세요.',
  '이 인물에게 숨겨진 비밀 하나를 더하세요.',
  '주인공이 아니라 적대자로 변형해보세요.',
  '이 인물을 우리 작품 세계관에 맞게 문화·언어를 바꾸세요.',
  '한 가지 욕망과 한 가지 두려움을 새로 정하세요.',
  '말투·습관 하나만 남기고 나머지는 모두 새로 만드세요.',
]

// 저작권 안전 아바타(DiceBear 오픈소스) URL 생성 — 실존 인물 사진/IP 이미지 대체.
// 사람형은 'adventurer' 또는 'big-smile' 스타일. 시드에 이름+무작위를 섞어 매번 다른 일러스트.
const HUMAN_STYLES = ['adventurer', 'big-smile']
function diceBear(name: string, opts?: { human?: boolean }): string {
  const style = opts?.human === false
    ? 'bottts'                                   // 사람이 아닌 모델(만화·SF·판타지 생물)은 로봇/추상 일러스트
    : HUMAN_STYLES[Math.floor(Math.random() * HUMAN_STYLES.length)]
  const seed = `${name || 'character'}-${Math.floor(Math.random() * 1e9).toString(36)}`
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}
const AVATAR_CREDIT = '이미지: DiceBear 오픈소스 아바타'

// 이 도구의 trait 키(국적/분야/종족/칭호 등)를 받는 허브가 아는 '정규 캐릭터 필드' 키로 1:1 매핑한다.
// 정규 키: name, aka, role, gender, age, occupation, origin, background, notes ...
// 의미 없는 메타(라이선스/한마디/비고/상태)는 notes 로 모으고, '—' 빈값은 버린다.
const TRAIT_TO_FIELD: Record<string, string> = {
  '국적': 'origin',
  '출신': 'origin',
  '분야': 'occupation',
  '직업(가상)': 'occupation',
  '성별': 'gender',
  '별칭': 'aka',
  '칭호': 'role',
  '문화': 'background',
  '종족': 'background',
}
// trait 배열 → 정규 fields(키→문자열). 받는 허브에서 항목이 제자리(기본 칸)로 들어가게 한다.
function traitsToFields(name: string, traits: { k: string; v: string }[]): Record<string, string> {
  const fields: Record<string, string> = {}
  if (name) fields.name = name
  for (const t of traits) {
    const v = (t.v || '').trim()
    if (!v || v === '—') continue
    const key = TRAIT_TO_FIELD[t.k]
    if (key) {
      fields[key] = fields[key] ? `${fields[key]} · ${v}` : v
    } else {
      // 정규 키가 없는 보조 속성(종족·상태·라이선스·비고 등)은 메모로 모은다.
      const line = `${t.k}: ${v}`
      fields.notes = fields.notes ? `${fields.notes} · ${line}` : line
    }
  }
  return fields
}

// 전 세계 실존 인물 — Wikidata 로 '사람(P31=인간 Q5) + 그 인물의 사진(P18)'만 가져와 풍경/사물 혼입을 원천 차단한다.
//   P18 이미지는 위키미디어 공용의 자유 라이선스 정책을 따르며, 추가로 Commons 에서 라이선스·작가를 검증·표기한다.
//   국가를 무작위 순환해 한국·동양 포함 전 세계 다양성 확보. 실패 시 Commons 인물 검색 → 안전 아바타로 단계 폴백.
const PERSON_COUNTRIES: { q: string; ko: string }[] = [
  { q: 'Q884', ko: '한국' }, { q: 'Q17', ko: '일본' }, { q: 'Q148', ko: '중국' }, { q: 'Q884', ko: '한국' },
  { q: 'Q881', ko: '베트남' }, { q: 'Q869', ko: '태국' }, { q: 'Q668', ko: '인도' }, { q: 'Q252', ko: '인도네시아' },
  { q: 'Q928', ko: '필리핀' }, { q: 'Q1033', ko: '나이지리아' }, { q: 'Q115', ko: '에티오피아' }, { q: 'Q79', ko: '이집트' },
  { q: 'Q142', ko: '프랑스' }, { q: 'Q183', ko: '독일' }, { q: 'Q145', ko: '영국' }, { q: 'Q38', ko: '이탈리아' },
  { q: 'Q29', ko: '스페인' }, { q: 'Q96', ko: '멕시코' }, { q: 'Q155', ko: '브라질' }, { q: 'Q30', ko: '미국' },
  { q: 'Q159', ko: '러시아' }, { q: 'Q43', ko: '터키' }, { q: 'Q794', ko: '이란' },
]
const FREE_LICENSE = /cc[ -]?(by|0|sa)|public domain|pd|gfdl/i
const NONFREE = /fair use|non[- ]?free|copyright/i
function stripTags(s: string): string { return (s || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim() }
function cleanPersonName(title: string): string {
  return (title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(portrait|photo|photograph|cropped|jpg|jpeg|png|img|dsc)\b/gi, '')
    .replace(/\s{2,}/g, ' ').trim().slice(0, 40) || '공개 인물'
}

// Commons 파일의 라이선스·작가·썸네일을 확인(자유 라이선스가 아니면 null).
async function commonsLicensed(fileTitle: string, signal?: AbortSignal): Promise<{ thumb: string; lic: string; artist: string } | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent('File:' + fileTitle)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=360`
  const r = await fetch(url, { signal })
  if (!r.ok) return null
  const j = await r.json()
  const pages: Record<string, unknown>[] = j?.query?.pages ? Object.values(j.query.pages) : []
  const ii = (pages[0] as { imageinfo?: { thumburl?: string; url?: string; extmetadata?: Record<string, { value?: string }> }[] })?.imageinfo?.[0]
  if (!ii) return null
  const lic = ii.extmetadata?.LicenseShortName?.value || ''
  if (!FREE_LICENSE.test(lic) || NONFREE.test(lic)) return null
  return { thumb: ii.thumburl || ii.url || '', lic: lic || '자유 라이선스', artist: stripTags(ii.extmetadata?.Artist?.value || '') || '작자 미상' }
}

// Wikidata: 특정 국적의 '사람 + 사진' 목록을 가져온다(P31=Q5 사람만 → 풍경/사물 불가능).
async function fetchPerson(signal?: AbortSignal): Promise<Model> {
  const c = PERSON_COUNTRIES[Math.floor(Math.random() * PERSON_COUNTRIES.length)]
  const sparql = `SELECT ?personLabel ?image ?occLabel WHERE {
    ?person wdt:P31 wd:Q5 ; wdt:P27 wd:${c.q} ; wdt:P18 ?image .
    OPTIONAL { ?person wdt:P106 ?occ. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
  } LIMIT 80`
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/sparql-results+json' } })
  if (!r.ok) throw new Error('wikidata http')
  const j = await r.json()
  const rows: { personLabel?: { value?: string }; image?: { value?: string }; occLabel?: { value?: string } }[] = j?.results?.bindings || []
  // 사진 있는 사람만, 무작위 순서로 시도(자유 라이선스 검증 통과하는 첫 인물 채택).
  const shuffled = rows.filter((x) => x.image?.value).sort(() => Math.random() - 0.5).slice(0, 12)
  for (const row of shuffled) {
    // P18 이미지 URL: .../Special:FilePath/<파일명> → 파일명 추출 후 Commons 라이선스 검증.
    const imgUrl = row.image!.value || ''
    const file = decodeURIComponent(imgUrl.split('/Special:FilePath/')[1] || imgUrl.split('/').pop() || '')
    if (!file) continue
    const lic = await commonsLicensed(file, signal)
    if (!lic) continue
    const name = row.personLabel?.value || cleanPersonName(file)
    // Q-id 라벨 폴백(라벨이 Q123 형태면 파일명에서 정리)
    const cleanName = /^Q\d+$/.test(name) ? cleanPersonName(file) : name
    return {
      name: cleanName.slice(0, 40),
      photo: lic.thumb,
      traits: [
        { k: '국적', v: c.ko },
        { k: '분야', v: row.occLabel?.value && !/^Q\d+$/.test(row.occLabel.value) ? row.occLabel.value : '—' },
        { k: '라이선스', v: lic.lic },
        { k: '한마디(가상)', v: '—' },
      ],
      credit: `사진: ${lic.artist} · ${lic.lic} · Wikimedia Commons (Wikidata P18)`,
      source: `Wikidata 실존 인물(${c.ko}) · 자유 라이선스 사진`,
    }
  }
  throw new Error('no licensed person photo')
}
async function fetchCartoon(): Promise<Model> {
  const id = 1 + Math.floor(Math.random() * 800)
  const r = await fetch(`https://rickandmortyapi.com/api/character/${id}`)
  const c = await r.json()
  // 주의: c.image(IP 캐릭터 이미지)는 사용하지 않는다 — 저작권 안전 아바타로 대체.
  const human = /human/i.test(c.species || '')
  return {
    name: c.name,
    photo: diceBear(c.name, { human }),
    traits: [
      { k: '종족', v: c.species || '—' },
      { k: '상태', v: c.status || '—' },
      { k: '성별', v: c.gender || '—' },
      { k: '출신', v: c.origin?.name || '—' },
    ],
    credit: AVATAR_CREDIT,
    source: 'Rick and Morty API (속성 참고)',
  }
}
async function fetchFantasy(): Promise<Model> {
  const id = 1 + Math.floor(Math.random() * 2130)
  const r = await fetch(`https://anapioficeandfire.com/api/characters/${id}`)
  const c = await r.json()
  const titles = (c.titles || []).filter(Boolean)
  const aliases = (c.aliases || []).filter(Boolean)
  const name = c.name || aliases[0] || '이름 없는 인물'
  return {
    name,
    photo: diceBear(name, { human: true }),
    traits: [
      { k: '칭호', v: titles[0] || '—' },
      { k: '별칭', v: aliases[0] || '—' },
      { k: '문화', v: c.culture || '—' },
      { k: '성별', v: c.gender || '—' },
    ],
    credit: AVATAR_CREDIT,
    source: 'An API of Ice and Fire (속성 참고)',
  }
}

export default function CharacterModel({ payload }: { payload?: Record<string, unknown> }) {
  const pickMode = payload?.pickMode === true
  const [src, setSrc] = useState<Src>('person')
  const [m, setM] = useState<Model | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [twist, setTwist] = useState(TWISTS[0])
  const [flash, setFlash] = useState('')
  const [saved, setSaved] = useState(false) // 저장 버튼 피드백(✓ 저장됨)
  const nonce = useRef(0)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const savedTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      nonce.current++ // 진행 중 요청 결과 무시
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
      if (savedTimer.current !== null) clearTimeout(savedTimer.current)
    }
  }, [])

  const showFlash = (msg: string) => {
    if (!mounted.current) return
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2000)
  }

  const load = async (s: Src) => {
    const my = ++nonce.current
    setLoading(true); setErr('')
    try {
      let r: Model
      if (s === 'person') {
        try { r = await fetchPerson() } catch {
          // 자유 라이선스 실사진을 못 찾으면 저작권 안전 아바타로 폴백(빈 화면 방지)
          const nm = '익명 인물 ' + Math.floor(Math.random() * 900 + 100)
          r = { name: nm, photo: diceBear(nm, { human: true }), traits: [{ k: '비고', v: '자유 라이선스 사진을 못 찾아 아바타로 대체' }, { k: '직업(가상)', v: '—' }], credit: AVATAR_CREDIT, source: '안전 아바타(폴백)' }
        }
      } else r = s === 'cartoon' ? await fetchCartoon() : await fetchFantasy()
      if (my === nonce.current) {
        setM(r)
        setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])
        setSaved(false) // 새 인물을 불러오면 저장 상태 초기화
        if (savedTimer.current !== null) { clearTimeout(savedTimer.current); savedTimer.current = null }
      }
    } catch {
      if (my === nonce.current) setErr('불러오지 못했습니다. 다시 시도하세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }
  useEffect(() => { load(src) /* eslint-disable-next-line */ }, [src])

  // 저장 버튼 상태 피드백(✓ 저장됨) — 일정 시간 후 자동 해제.
  const markSaved = () => {
    if (!mounted.current) return
    setSaved(true)
    if (savedTimer.current !== null) clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => { if (mounted.current) setSaved(false) }, 2500)
  }

  // 📥 인물 라이브러리에 저장 — 다른 도구(인물 시트/관계도 등)가 함께 읽는 공유 목록에 추가.
  // 중복 저장 방지: 동일 name+source 가 이미 있으면 새로 추가하지 않고 기존 항목을 갱신한다.
  const saveToLibrary = () => {
    if (!m) return
    const dup = getList('characters').find((c) => c.name === m.name && (c.source || '') === (m.source || ''))
    const record = {
      name: m.name,
      photo: m.photo,            // 저작권 안전 DiceBear 아바타만 저장
      photoCredit: 'DiceBear',
      traits: m.traits as SharedTrait[],
      fields: traitsToFields(m.name, m.traits), // 정규 캐릭터 필드(받는 허브의 기본 칸에 매핑)
      source: m.source,
    }
    if (dup) {
      updateInLibrary('characters', dup.id, record)
      showFlash('이미 저장된 인물이라 최신 내용으로 갱신했어요')
    } else {
      addToLibrary('characters', record)
      showFlash('인물 라이브러리에 저장했어요 · 인물 시트에서 사용 가능')
    }
    markSaved()
  }

  // 🪪 인물 시트로 보내기 — 페이로드로 캐릭터 데이터를 넘기며 인물 시트 도구를 연다.
  const sendToSheet = () => {
    if (!m) return
    const traitText = m.traits.filter((t) => t.v && t.v !== '—').map((t) => `${t.k}: ${t.v}`).join(' · ')
    openToolLinked('character-sheet', {
      character: {
        name: m.name,
        photo: m.photo,
        photoCredit: 'DiceBear',
        traits: m.traits,
        fields: traitsToFields(m.name, m.traits), // 정규 캐릭터 필드(인물 시트 기본 칸에 매핑)
        background: traitText,
        source: m.source,
      },
    })
  }

  // 📄 프로젝트에 인물 카드 추가 — 좌측 바인더 '인물' 폴더에 character 카드로 생성.
  // 저작권상 사진(아바타 URL)은 카드에 넣지 않고 텍스트 속성만 보낸다.
  const addToProjectCard = () => {
    if (!m) return
    if (!hasProjectBridge()) { showFlash('프로젝트가 연결되어 있지 않아요.'); return }
    // 속성('—' 제외)을 한 줄 요약으로 묶어 외형 참고 텍스트로 사용.
    const appearance = m.traits.filter((t) => t.v && t.v !== '—').map((t) => `${t.k}: ${t.v}`).join(' · ')
    // 뭉친 외형 텍스트를 정규 키로 분리(origin·occupation·gender 등)해 카드 기본 칸에 들어가게 한다.
    const norm = traitsToFields(m.name, m.traits)
    const id = addToProject({
      kind: 'character',
      folder: '인물',
      title: m.name,
      character: {
        ...norm,                  // 정규 키(분리된 속성)를 먼저 깔고
        name: m.name,             // 아래 기존 키는 유지(삭제·덮어쓰기 안전)
        role: '모델 참고',
        appearance,
        notes: '외부 모델 변주: ' + twist + (norm.notes ? ' · ' + norm.notes : ''),
      },
      meta: { 출처: m.source },
    })
    if (id) {
      showFlash('프로젝트 ‘인물’ 폴더에 인물 카드를 추가했어요')
    } else {
      showFlash('프로젝트에 추가하지 못했어요.')
    }
  }

  // 이미지 픽 요청에 응답(갤러리 대용) — 픽 모드로 열렸을 때 현재 아바타를 요청자에게 돌려준다.
  const usePick = () => {
    if (!m) return
    const ok = fulfillImagePick({
      id: 'cm_' + Date.now().toString(36),
      url: m.photo,
      title: m.name,
      credit: 'DiceBear',
      license: 'DiceBear (오픈소스)',
      source: m.source,
      updated: Date.now(),
    })
    if (ok) {
      showFlash('이 아바타를 전달했어요. 창을 닫아도 됩니다.')
    } else {
      showFlash('대기 중인 이미지 요청이 없어요.')
    }
  }

  // 관련 도구(연계 버튼) — name-analyzer 등. 등록된 도구만 노출.
  const known = new Set(['character-sheet', 'relationship-map', 'name-analyzer', 'name-mixer', 'pov-tracker'])
  const relations = (TOOL_RELATIONS['character-model'] || []).filter((id) => known.has(id))
  const relLabel: Record<string, string> = {
    'character-sheet': '🧑‍🎤 인물 시트',
    'relationship-map': '🕸️ 관계도',
    'name-analyzer': '🪪 이름 분석',
    'name-mixer': '🎲 이름 믹서',
    'pov-tracker': '🎯 시점 추적기',
  }
  const openRelated = (id: string) => {
    // 이름 분석/믹서로는 현재 인물 이름을 함께 넘겨 바로 이어서 작업.
    openToolLinked(id, m ? { name: m.name } : undefined)
  }

  const savedCount = getList('characters').length

  return (
    <div className="cmodel-wrap">
      <div className="imag-cats">
        {SRCS.map((s) => <button key={s.key} className={'minibtn' + (src === s.key ? ' active' : '')} onClick={() => setSrc(s.key)}>{emojify(s.label)}</button>)}
      </div>
      <div className="cmodel-card">
        {loading && <div className="imag-msg">불러오는 중…</div>}
        {err && !loading && <div className="imag-msg">{err}</div>}
        {m && !loading && !err && (
          <>
            <img className="cmodel-photo" src={m.photo} alt={m.name} referrerPolicy="no-referrer"
              onError={(e) => { const im = e.currentTarget as HTMLImageElement; if (!im.dataset.fb) { im.dataset.fb = '1'; im.src = diceBear(m.name, { human: true }) } }} />
            <div className="cmodel-name">{m.name}</div>
            <div className="cmodel-traits">
              {m.traits.map((t, i) => <div key={i} className="cmodel-trait"><span>{t.k}</span><b>{t.v}</b></div>)}
            </div>
            <div className="cmodel-credit">{m.credit} · {m.source}</div>
            <div className="license-note">실존 인물 사진 미사용 · 일러스트는 DiceBear 오픈소스</div>
          </>
        )}
      </div>

      <div className="imag-prompt"><Emoji e="✏️" /> 모델 변주: {twist}<br /><span style={{ color: 'var(--muted)', fontSize: 11 }}>※ 그대로 베끼지 말고 영감·출발점으로만 쓰세요. 이름·속성은 발상용이며 이미지는 저작권 안전 아바타입니다.</span></div>

      <div className="imag-actions">
        <button className="btn-primary" onClick={() => load(src)}><Emoji e="🔀" /> 다른 인물</button>
        <button className="minibtn" onClick={() => setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])}><Emoji e="✏️" /> 다른 변주</button>
      </div>

      {/* 연계: 라이브러리 저장 / 인물 시트로 보내기 / 픽 응답 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        {pickMode && hasPendingPick() && (
          <button className="linkbtn" onClick={usePick} disabled={!m} title="이 아바타를 요청한 도구로 전달"><Emoji e="🖼" /> 이 이미지 사용</button>
        )}
        <button className={'linkbtn' + (saved ? ' active' : '')} onClick={saveToLibrary} disabled={!m} title="공유 인물 라이브러리에 저장">{saved ? <>✓ 저장됨</> : <><Emoji e="📥" /> 인물 라이브러리에 저장</>}</button>
        <button className="linkbtn" onClick={sendToSheet} disabled={!m} title="인물 시트 도구로 데이터와 함께 열기"><Emoji e="🪪" /> 인물 시트로 보내기</button>
        <button className="linkbtn" onClick={addToProjectCard} disabled={!m || !hasProjectBridge()} title={hasProjectBridge() ? '좌측 바인더 인물 폴더에 인물 카드로 추가(사진 제외, 텍스트만)' : '프로젝트 미연결'}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
        {savedCount > 0 && <span className="license-badge" title="공유 라이브러리에 저장된 인물 수">저장됨 {savedCount}</span>}
      </div>

      {/* 관련 도구로 이동 */}
      {relations.length > 0 && (
        <div className="linkbar">
          <span className="linkbar-label">관련 도구</span>
          {relations.map((id) => (
            <button key={id} className="linkbtn" onClick={() => openRelated(id)} title={`${relLabel[id] || id} 열기`}>
              {emojify(relLabel[id] || id)}
            </button>
          ))}
        </div>
      )}

      {flash && <div className="license-note" style={{ color: 'var(--ok)' }}>{flash}</div>}
    </div>
  )
}
