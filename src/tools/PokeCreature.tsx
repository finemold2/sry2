// 몬스터·생물 모델 — 무료·키 없는 공개 API(pokeapi.co)로 생물의 이름/타입/능력치를 무작위로 가져와 '괴수 모델'로 삼는다(베끼기 아님, 변주용).
// pokeapi.co/api/v2/pokemon/{1~1000} : 키 불필요·https·CORS 허용. 무작위 생물을 뽑아 우리 세계관의 괴수로 변주하는 글감을 던진다.
// [저작권] PokeAPI 의 스프라이트·이름은 Nintendo/Game Freak 의 IP 다. 이 도구는 비공식·개인 창작 영감용일 뿐이며,
//          스프라이트 이미지는 표시·저장 모두 하지 않고(이모지/실루엣 플레이스홀더만), 이름은 라이브러리/프로젝트 저장 시
//          원명 그대로 박지 않고 '괴수 #도감번호'로 익명화해 적재한다(재배포·상업 사용 금지).
import { useEffect, useRef, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge, TOOL_RELATIONS, Emoji, emojify } from './linkbus'

export const meta = { id: 'poke-creature', name: '괴수 모델 가져오기', icon: '🐲', group: '게임·캐릭터', intro: '무작위 생물을 모델로 우리 세계관의 괴수를 변주', w: 400, h: 600 }

interface Stat { k: string; v: number }
interface Creature {
  id: number
  name: string
  types: string[]
  stats: Stat[]
  height: string
  weight: string
}

const STAT_KO: Record<string, string> = {
  hp: '체력',
  attack: '공격',
  defense: '방어',
  'special-attack': '특수공격',
  'special-defense': '특수방어',
  speed: '속도',
}

const TYPE_KO: Record<string, string> = {
  normal: '노멀', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음',
  fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼',
  bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악',
  steel: '강철', fairy: '페어리',
}

// 타입별 실루엣 이모지 — IP 스프라이트 대신 표시하는 플레이스홀더(저작권 무관).
const TYPE_EMOJI: Record<string, string> = {
  normal: '🐾', fire: '🔥', water: '💧', electric: '⚡', grass: '🌿', ice: '❄️',
  fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🪶', psychic: '🌀',
  bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', dark: '🌑',
  steel: '⚙️', fairy: '✨',
}

// 익명화된 이름 — 원명(Nintendo/Game Freak IP)을 박지 않고 도감번호 기반 가명만 사용.
const anonName = (id: number) => `괴수 #${id}`

const TWISTS = [
  '이 생물의 실루엣만 남기고 질감·색·재료를 전혀 다른 것으로 바꾸세요.',
  '가장 높은 능력치를 약점으로, 가장 낮은 능력치를 무기로 뒤집으세요.',
  '두 타입을 우리 세계관의 원소·속성으로 재해석해 보세요.',
  '이 괴수가 사는 서식지와 울음소리를 한 줄로 정하세요.',
  '인간과 적대하지 않는, 오히려 보호하는 괴수로 변형하세요.',
  '이 생물에게 지능과 한 가지 욕망을 부여하세요. 무엇을 원하나요?',
  '크기를 10배 또는 1/10로 바꿨을 때의 생태를 상상하세요.',
  '이 괴수를 처음 목격한 인물의 시점으로 한 문단을 써보세요.',
  '약점·금기 하나를 만들어 사냥꾼이 노릴 틈을 남기세요.',
  '이름을 우리 세계관의 언어로 새로 짓고, 그 어원을 정하세요.',
]

async function fetchRandom(): Promise<Creature> {
  const id = 1 + Math.floor(Math.random() * 1000)
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  if (!r.ok) throw new Error('not found')
  const j = await r.json()
  const types: string[] = Array.isArray(j.types)
    ? j.types.map((t: any) => t?.type?.name).filter(Boolean)
    : []
  const stats: Stat[] = Array.isArray(j.stats)
    ? j.stats.map((s: any) => ({ k: STAT_KO[s?.stat?.name] || s?.stat?.name || '?', v: Number(s?.base_stat) || 0 }))
    : []
  // [저작권] 스프라이트(Nintendo/Game Freak IP)는 가져오지도, 표시하지도, 저장하지도 않는다.
  return {
    id: j.id ?? id,
    name: anonName(j.id ?? id),
    types,
    stats,
    height: typeof j.height === 'number' ? `${(j.height / 10).toFixed(1)} m` : '—',
    weight: typeof j.weight === 'number' ? `${(j.weight / 10).toFixed(1)} kg` : '—',
  }
}

const REL = TOOL_RELATIONS['poke-creature'] || []
const REL_LABEL: Record<string, string> = {
  'character-sheet': '📇 인물 시트',
  'character-model': '🎭 캐릭터 모델',
  'relationship-map': '🕸️ 관계도',
  'world-wiki': '📚 세계관 위키',
  'setting-bible': '🗺️ 배경 설정집',
}

export default function PokeCreature({ payload: _payload }: { payload?: Record<string, unknown> }) {
  const [c, setC] = useState<Creature | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [twist, setTwist] = useState(TWISTS[0])
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [proj, setProj] = useState('')
  const projTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (projTimer.current) clearTimeout(projTimer.current) }
  }, [])

  const load = async () => {
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false); setSaved(false); setProj('')
    try {
      const r = await fetchRandom()
      if (mounted.current && my === nonce.current) {
        setC(r)
        setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])
      }
    } catch {
      if (mounted.current && my === nonce.current) setErr('불러오지 못했습니다. 다시 시도하세요.')
    } finally {
      if (mounted.current && my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  // 표시·저장 모두 익명 이름(괴수 #도감번호)만 사용 — 원명(IP)은 노출하지 않는다.
  const displayName = (cr: Creature) => anonName(cr.id)

  const buildText = (cr: Creature) =>
    `🐲 괴수 모델: ${displayName(cr)}\n` +
    `· 타입: ${cr.types.length ? cr.types.map((t) => TYPE_KO[t] || t).join(' / ') : '—'}\n` +
    `· 키/무게: ${cr.height} / ${cr.weight}\n` +
    `· 능력치: ${cr.stats.length ? cr.stats.map((s) => `${s.k} ${s.v}`).join(', ') : '—'}`

  const copy = () => {
    if (!c) return
    navigator.clipboard?.writeText(buildText(c) + `\n\n[변주] ${twist}`).then(() => {
      if (!mounted.current) return
      setCopied(true)
      setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // [저작권 안전] 스프라이트(Nintendo/Game Freak IP)는 표시·저장 모두 안 함. 이름도 원명 대신 '괴수 #도감번호'로 익명화.
  //              타입·능력치 같은 '스탯'만 우리 인물(괴수) 라이브러리에 적재한다.
  const saveToLibrary = () => {
    if (!c) return
    const traits = [
      { k: '타입', v: c.types.length ? c.types.map((t) => TYPE_KO[t] || t).join(' / ') : '—' },
      { k: '키', v: c.height },
      { k: '무게', v: c.weight },
      ...c.stats.map((s) => ({ k: s.k, v: String(s.v) })),
    ]
    const libTypeText = c.types.length ? c.types.map((t) => TYPE_KO[t] || t).join(' / ') : '—'
    const libStatText = c.stats.length ? c.stats.map((s) => `${s.k} ${s.v}`).join(', ') : '—'
    addToLibrary('characters', {
      name: anonName(c.id),
      role: '괴수/생물',
      traits,
      notes: '※ 스탯만 저장됨(스프라이트 미표시·미저장, 이름은 익명화). 원명·이미지는 © Nintendo·Game Freak — 그대로 쓰지 말고 이름과 외형을 직접 새로 지어 변주할 것.',
      fields: {
        name: anonName(c.id),
        role: '괴수/생물',
        height: c.height,
        weight: c.weight,
        appearance: `타입 ${libTypeText} · 키 ${c.height} · 무게 ${c.weight}`,
        notes: `타입: ${libTypeText} · 능력치: ${libStatText}\n※ 스탯만 저장(스프라이트 미표시·미저장, 이름 익명화). 원명·이미지 © Nintendo·Game Freak — 그대로 쓰지 말고 직접 변주할 것.`,
      },
      source: 'PokeAPI 영감(익명화)',
    })
    if (!mounted.current) return
    setSaved(true)
    setTimeout(() => { if (mounted.current) setSaved(false) }, 1800)
  }

  const flashProj = (m: string) => {
    if (!mounted.current) return
    setProj(m)
    if (projTimer.current) clearTimeout(projTimer.current)
    projTimer.current = setTimeout(() => { if (mounted.current) setProj('') }, 2400)
  }

  // 📄 프로젝트에 추가 — 좌측 바인더(자료)에 실시간 반영.
  // [저작권 안전] 스프라이트(IP)는 카드에 절대 넣지 않고, 이름도 '괴수 #도감번호'로 익명화해 타입·스탯 텍스트만 보낸다. 출처 PokeAPI 표기.
  const addToProjectCard = () => {
    if (!c) return
    if (!hasProjectBridge()) { flashProj('프로젝트가 연결되어 있지 않아요.'); return }
    const name = anonName(c.id)
    const typeText = c.types.length ? c.types.map((t) => TYPE_KO[t] || t).join(' / ') : '—'
    const statText = c.stats.length ? c.stats.map((s) => `${s.k} ${s.v}`).join(', ') : '—'
    const notes =
      `타입: ${typeText} · 키 ${c.height} · 무게 ${c.weight}\n` +
      `능력치: ${statText}\n` +
      `변주 메모: ${twist}\n` +
      '※ 스탯만 저장(스프라이트 미표시·미저장, 이름 익명화). 원명·이미지 © Nintendo·Game Freak — 그대로 쓰지 말고 직접 변주할 것.'
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: name,
      character: {
        name,
        role: '괴수/생물(모델 참고)',
        height: c.height,
        weight: c.weight,
        appearance: `타입 ${typeText} · 키 ${c.height} · 무게 ${c.weight}`,
        notes,
        source: 'PokeAPI (비공식·영감용·익명화)',
      },
      meta: {
        타입: typeText,
        키: c.height,
        무게: c.weight,
        능력치: statText,
        출처: 'PokeAPI',
      },
    })
    flashProj(id ? `‘${name}’을(를) 프로젝트 ‘자료 › 인물’에 괴수 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  const maxStat = c && c.stats.length ? Math.max(...c.stats.map((s) => s.v), 1) : 1
  const placeholderEmoji = c && c.types.length ? (TYPE_EMOJI[c.types[0]] || '🐾') : '🐾'

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '24px 8px', fontSize: 13 }
  const spriteBox: React.CSSProperties = { position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--chrome-2)', border: '1px dashed var(--border)', borderRadius: 10, height: 140, marginBottom: 8 }
  const typeChip = (_t: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 9px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 })
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }
  const statKey: React.CSSProperties = { width: 64, flexShrink: 0, color: 'var(--muted)' }
  const statBarBg: React.CSSProperties = { flex: 1, height: 8, borderRadius: 999, background: 'var(--chrome-2)', overflow: 'hidden' }
  const statVal: React.CSSProperties = { width: 30, flexShrink: 0, textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>불러오는 중…</div>}
        {err && !loading && <div style={msg}>{err}</div>}
        {c && !loading && !err && (
          <>
            {/* [저작권] IP 스프라이트 이미지는 표시하지 않는다 — 타입 기반 이모지/실루엣 플레이스홀더만 노출 */}
            <div style={spriteBox} aria-label="실루엣 플레이스홀더(스프라이트 미표시)">
              <span style={{ fontSize: 56, lineHeight: 1, filter: 'grayscale(0.15)' }} aria-hidden><Emoji e={placeholderEmoji} /></span>
              <span className="license-badge" style={{ position: 'absolute', bottom: 6, right: 8 }}>이미지 미표시</span>
            </div>
            {/* [저작권 표기] 스프라이트·이름은 Nintendo/Game Freak IP — 이미지 미표시·미저장, 영감용임을 명시 */}
            <div className="license-note" style={{ textAlign: 'center', marginBottom: 10, lineHeight: 1.5 }}>
              <span className="license-badge">영감/모델 참고용</span>{' '}
              스프라이트/이름 © Nintendo·Game Freak — 영감용, 이미지 미표시·미저장 · 비공식 PokeAPI(재배포·상업 사용 금지)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{displayName(c)}</div>
            </div>
            <div className="license-note" style={{ marginBottom: 8 }}>
              ※ 익명화된 가명이에요. 라이브러리/프로젝트엔 ‘괴수 #도감번호’로만 저장돼요 — 직접 이름을 새로 지어 변주하세요.
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {c.types.length
                ? c.types.map((t) => <span key={t} style={typeChip(t)}>{TYPE_KO[t] || t}</span>)
                : <span style={{ fontSize: 12, color: 'var(--muted)' }}>타입 정보 없음</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>키 {c.height} · 무게 {c.weight}</div>
            <div>
              {c.stats.map((s) => (
                <div key={s.k} style={statRow}>
                  <span style={statKey}>{s.k}</span>
                  <span style={statBarBg}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.round((s.v / maxStat) * 100)}%`, background: 'var(--accent)' }} />
                  </span>
                  <span style={statVal}>{s.v}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {!c && !loading && !err && <div style={msg}>무작위 생물을 가져오세요.</div>}
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)' }}>
        <Emoji e="✏️" /> <b style={{ color: 'var(--accent)' }}>이 생물을 모델로 우리 세계관의 괴수로 변주</b><br />
        <span style={{ color: 'var(--muted)' }}>· {twist}</span><br />
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>※ 그대로 베끼지 말고 영감·출발점으로만 쓰세요.</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={load} disabled={loading}><Emoji e="🔀" /> 다른 생물</button>
        <button className="minibtn" onClick={() => setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])}><Emoji e="✏️" /> 다른 변주</button>
        <button className="minibtn" onClick={copy} disabled={!c}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 변주에 활용</>}</button>
      </div>

      {/* [연계] 타입·스탯만 인물(괴수) 라이브러리에 저장 — 이미지 미저장, 이름은 ‘괴수 #도감번호’로 익명화 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button className="linkbtn" onClick={saveToLibrary} disabled={!c}>
          {saved ? <>✓ 저장됨</> : <><Emoji e="📥" /> 인물(괴수) 라이브러리에 저장</>}
        </button>
        <button className="linkbtn" onClick={addToProjectCard} disabled={!c || !hasProjectBridge()}>
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        {REL.map((id) => (
          <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>
            {emojify(REL_LABEL[id] || id)}
          </button>
        ))}
      </div>
      {proj && (
        <div className="toast" style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center', padding: '4px 0' }}>
          {proj}
        </div>
      )}
      <div className="license-note" style={{ textAlign: 'right' }}>
        스프라이트/이름 © Nintendo·Game Freak — 이미지 미표시·미저장 · 저장 시 ‘괴수 #도감번호’+스탯만 적재 · data: pokeapi.co
      </div>
    </div>
  )
}
