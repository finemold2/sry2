// D&D 몬스터 자료 — 키 없는 공개 API(api.open5e.com)로 무작위 몬스터의 이름·유형·위협도·체력·특수능력을 가져와
// 판타지 적/몬스터 설계 참고 자료로 활용한다. open5e: 키 불필요·https·CORS(*) 허용.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'dnd-monster', name: 'D&D 몬스터 자료', icon: '🐉', group: '게임·캐릭터', intro: '무작위 몬스터의 유형·위협도·특수능력을 설계 참고로', w: 440, h: 600 }

interface Ability { name: string; desc: string }
interface Monster {
  name: string
  type: string
  size: string
  subtype: string
  alignment: string
  cr: string
  hp: number
  hitDice: string
  abilities: Ability[]
}

// 30페이지(페이지당 50마리, 총 3000여 마리) 범위에서 무작위 추출
const MAX_PAGE = 30

const TYPE_KO: Record<string, string> = {
  aberration: '이형체', beast: '야수', celestial: '천상체', construct: '구조물',
  dragon: '용', elemental: '정령', fey: '요정', fiend: '악마',
  giant: '거인', humanoid: '인간형', monstrosity: '괴물체', ooze: '점액체',
  plant: '식물', undead: '언데드', swarm: '무리',
}
const SIZE_KO: Record<string, string> = {
  tiny: '초소형', small: '소형', medium: '중형', large: '대형', huge: '거대형', gargantuan: '초대형',
}
const ALIGN_KO: Record<string, string> = {
  lawful: '질서', neutral: '중립', chaotic: '혼돈',
  good: '선', evil: '악', any: '임의', unaligned: '무성향',
}

function ko(map: Record<string, string>, raw: string): string {
  if (!raw) return '—'
  const lower = raw.toLowerCase()
  if (map[lower]) return map[lower]
  // "lawful evil", "any alignment" 등 복합 표현 단어별 치환
  const mapped = lower.split(/[\s,]+/).map((w) => ALIGN_KO[w] || SIZE_KO[w] || w).join(' ').trim()
  return mapped || raw
}

function alignKo(raw: string): string {
  if (!raw) return '—'
  const lower = raw.toLowerCase().trim()
  if (ALIGN_KO[lower]) return ALIGN_KO[lower]
  if (lower === 'unaligned') return '무성향'
  if (lower === 'lawful good') return '질서 선'
  const parts = lower.split(/\s+/).map((w) => ALIGN_KO[w] || w)
  return parts.join(' ') || raw
}

function parseMonster(m: Record<string, any>): Monster {
  const abs: Ability[] = Array.isArray(m.special_abilities) && m.special_abilities.length
    ? m.special_abilities
    : Array.isArray(m.actions) ? m.actions : []
  const cleaned: Ability[] = abs
    .filter((a) => a && a.name && a.desc)
    .map((a) => ({ name: String(a.name), desc: String(a.desc).replace(/_/g, '').trim() }))
  return {
    name: m.name || '이름 미상',
    type: ko(TYPE_KO, m.type || ''),
    size: ko(SIZE_KO, m.size || ''),
    subtype: m.subtype ? String(m.subtype) : '',
    alignment: alignKo(m.alignment || ''),
    cr: m.challenge_rating != null ? String(m.challenge_rating) : '—',
    hp: typeof m.hit_points === 'number' ? m.hit_points : 0,
    hitDice: m.hit_dice ? String(m.hit_dice) : '',
    // 특수능력 1~2개만 노출 (설계 참고용)
    abilities: cleaned.slice(0, 2),
  }
}

async function fetchMonster(signal: AbortSignal): Promise<Monster> {
  const page = Math.floor(Math.random() * MAX_PAGE) + 1
  const res = await fetch(`https://api.open5e.com/v1/monsters/?page=${page}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error('응답 오류 ' + res.status)
  const json = await res.json()
  const list = Array.isArray(json?.results) ? json.results : []
  if (!list.length) throw new Error('빈 결과')
  const picked = list[Math.floor(Math.random() * list.length)]
  return parseMonster(picked)
}

export default function DnDMonster() {
  const [monster, setMonster] = useState<Monster | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const nonce = useRef(0)
  const ctrl = useRef<AbortController | null>(null)
  const alive = useRef(true)
  const toastTimer = useRef<number | null>(null)

  const load = () => {
    const my = ++nonce.current
    ctrl.current?.abort()
    const ac = new AbortController()
    ctrl.current = ac
    setLoading(true); setErr(''); setCopied(false)
    fetchMonster(ac.signal)
      .then((m) => {
        if (!alive.current || my !== nonce.current) return
        setMonster(m); setLoading(false)
      })
      .catch((e) => {
        if (!alive.current || my !== nonce.current) return
        if (e?.name === 'AbortError') return
        setErr('몬스터 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        setLoading(false)
      })
  }

  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
      ctrl.current?.abort()
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildText = (m: Monster) => {
    const lines = [
      `🐉 ${m.name}`,
      `· 유형: ${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ''}`,
      `· 성향: ${m.alignment}`,
      `· 위협도(CR): ${m.cr}`,
      `· 체력(HP): ${m.hp || '—'}${m.hitDice ? ` (${m.hitDice})` : ''}`,
    ]
    if (m.abilities.length) {
      lines.push('· 특수능력:')
      m.abilities.forEach((a) => lines.push(`  - ${a.name}: ${a.desc}`))
    }
    return lines.join('\n')
  }

  const copy = () => {
    if (!monster) return
    navigator.clipboard?.writeText(buildText(monster)).then(() => {
      setCopied(true); setTimeout(() => { if (alive.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // HTML 특수문자 escape(&,<,> 필수) — 본문 HTML 안전 처리
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const flash = (m: string) => {
    if (!alive.current) return
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (alive.current) setToast('') }, 4000)
  }

  // 능력 목록을 HTML 리스트로(본문 공용)
  const abilitiesHtml = (m: Monster) =>
    m.abilities.length
      ? '<p><b>특수능력</b></p><ul>' +
        m.abilities.map((a) => `<li><b>${esc(a.name)}</b>: ${esc(a.desc)}</li>`).join('') +
        '</ul>'
      : ''

  // 현재 몬스터를 프로젝트 '인물'(괴수) 폴더에 캐릭터 카드로 추가 — 텍스트만(IP 이미지 없음)
  const toCharacter = () => {
    if (!monster) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const m = monster
    const typeLine = `${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ''}`.trim()
    const notes = [
      `위협도(CR): ${m.cr}`,
      `체력(HP): ${m.hp || '—'}${m.hitDice ? ` (${m.hitDice})` : ''}`,
      `성향: ${m.alignment}`,
      ...m.abilities.map((a) => `· ${a.name}: ${a.desc}`),
    ].join('\n')
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: m.name,
      character: {
        name: m.name,
        role: '괴수',
        appearance: typeLine,
        notes,
      },
      meta: { 유형: typeLine, '위협도(CR)': m.cr, '체력(HP)': String(m.hp || '—'), 성향: m.alignment },
    })
    flash(id ? `‘${m.name}’을(를) 프로젝트 ‘인물’ 폴더에 괴수 카드로 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  // 현재 몬스터를 프로젝트 '세계관' 자료(텍스트)로 추가
  const toSetting = () => {
    if (!monster) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const m = monster
    const typeLine = `${m.size} ${m.type}${m.subtype ? ` (${m.subtype})` : ''}`.trim()
    const bodyHtml =
      `<p><b>${esc(m.name)}</b></p>` +
      `<p><b>유형</b> · ${esc(typeLine)}</p>` +
      `<p><b>성향</b> · ${esc(m.alignment)}</p>` +
      `<p><b>위협도(CR)</b> · ${esc(m.cr)}</p>` +
      `<p><b>체력(HP)</b> · ${esc(String(m.hp || '—'))}${m.hitDice ? ` (${esc(m.hitDice)})` : ''}</p>` +
      abilitiesHtml(m)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: m.name,
      bodyHtml,
      meta: { 유형: typeLine, '위협도(CR)': m.cr, 성향: m.alignment },
    })
    flash(id ? `‘${m.name}’을(를) 프로젝트 ‘자료 › 세계관’에 추가했어요.` : '프로젝트에 추가하지 못했어요.')
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '30px 8px', fontSize: 13 }
  const factRow: React.CSSProperties = { display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }
  const factKey: React.CSSProperties = { width: 76, flexShrink: 0, color: 'var(--muted)' }
  const factVal: React.CSSProperties = { flex: 1, color: 'var(--text)' }
  const badge: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 999, background: 'var(--chrome-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          무작위 몬스터로 판타지 적·몬스터 설계 영감을 얻으세요.
        </span>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? '소환 중…' : <><Emoji e="🎲"/> 다른 몬스터</>}
        </button>
      </div>

      <div style={card}>
        {loading && <div style={msg}>몬스터를 소환하는 중…</div>}

        {!loading && err && (
          <div style={msg}>
            <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji e="📡"/></div>
            <div>{err}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={load}>다시 시도</button>
          </div>
        )}

        {!loading && !err && !monster && <div style={msg}>표시할 몬스터가 없습니다.</div>}

        {!loading && !err && monster && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}><Emoji e="🐉"/></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{monster.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{monster.size} {monster.type}</div>
              </div>
              <span style={badge}>CR {monster.cr}</span>
            </div>

            <div style={factRow}><span style={factKey}>유형</span><span style={factVal}>{monster.size} {monster.type}{monster.subtype ? ` (${monster.subtype})` : ''}</span></div>
            <div style={factRow}><span style={factKey}>성향</span><span style={factVal}>{monster.alignment}</span></div>
            <div style={factRow}><span style={factKey}>위협도(CR)</span><span style={factVal}>{monster.cr}</span></div>
            <div style={{ ...factRow, borderBottom: monster.abilities.length ? '1px solid var(--border)' : 'none' }}>
              <span style={factKey}>체력(HP)</span>
              <span style={factVal}>{monster.hp || '—'}{monster.hitDice ? ` (${monster.hitDice})` : ''}</span>
            </div>

            {monster.abilities.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}><Emoji e="✨"/> 특수능력</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monster.abilities.map((a, i) => (
                    <div key={i} style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{a.name}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)' }}>{a.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={load} disabled={loading}><Emoji e="🔀"/> 무작위 몬스터</button>
        <button className="minibtn" onClick={copy} disabled={!monster || loading}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 설계에 활용</>}</button>
      </div>

      {/* [프로젝트 연동] 현재 몬스터를 인물(괴수) 카드 또는 세계관 자료로 추가 — 결과 없거나 미연결 시 비활성 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={toCharacter}
          disabled={!monster || loading || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 몬스터를 프로젝트 ‘인물’ 폴더에 괴수 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가 (괴수)
        </button>
        <button
          className="linkbtn"
          onClick={toSetting}
          disabled={!monster || loading || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 몬스터를 프로젝트 자료(세계관)에 메모로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가 (세계관)
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center', lineHeight: 1.5 }}>{toast}</div>
      )}
    </div>
  )
}
