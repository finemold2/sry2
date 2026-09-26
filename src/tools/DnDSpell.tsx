// 판타지 주문 자료 — 키 없는 공개 API(api.open5e.com/v1/spells)로 D&D 주문을 가져와 마법 체계 설계에 참고한다.
// open5e v1/spells : 키 불필요·https·CORS 허용. 무작위 페이지에서 한 주문을 뽑아 이름/레벨/계열/효과 요약을 보여준다.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'dnd-spell', name: '판타지 주문 자료', icon: '🪄', group: '게임·캐릭터', intro: '무작위 D&D 주문으로 마법 체계를 설계하세요', w: 440, h: 600 }

interface Spell {
  name: string
  level: string
  school: string
  classes: string
  range: string
  duration: string
  castingTime: string
  components: string
  concentration: boolean
  ritual: boolean
  desc: string
  higher: string
}

// 학파(school) → 한국어 라벨
const SCHOOL_KO: Record<string, string> = {
  abjuration: '방호술 (Abjuration)',
  conjuration: '소환술 (Conjuration)',
  divination: '예지술 (Divination)',
  enchantment: '매혹술 (Enchantment)',
  evocation: '방출술 (Evocation)',
  illusion: '환영술 (Illusion)',
  necromancy: '사령술 (Necromancy)',
  transmutation: '변성술 (Transmutation)',
}

const COMPONENT_KO: Record<string, string> = { V: '음성', S: '동작', M: '재료' }

// 마법 체계 설계용 글감
const PROMPTS = [
  '이 주문이 당신 세계관에 존재한다면, 누가·어떻게 배울 수 있을까요?',
  '이 주문의 발동에는 어떤 대가나 부작용이 따르도록 설정하시겠어요?',
  '이 효과를 일으키는 마법의 "근원"은 무엇인가요? (신·정령·룬·피 등)',
  '이 주문을 금지하거나 통제하는 세력이 있다면 누구일까요?',
  '같은 효과를 마법 없이 낼 수 있는 방법을 하나 떠올려 보세요.',
  '이 주문을 처음 만든 마법사의 사연을 한 줄로 상상해 보세요.',
  '이 주문이 전투가 아닌 일상에서 쓰이는 장면을 그려보세요.',
  '레벨이 오를수록 강해지는 이 구조를 당신 체계에 어떻게 녹일까요?',
]

const MAX_PAGE = 29 // v1/spells 는 약 29페이지 (count 1435)

function parseSpell(s: Record<string, any>): Spell {
  const comp = typeof s.components === 'string'
    ? s.components.split(',').map((c: string) => COMPONENT_KO[c.trim()] || c.trim()).filter(Boolean).join(' · ')
    : ''
  return {
    name: s.name || '이름 미상',
    level: s.level || (s.level_int === 0 ? '소마법(Cantrip)' : '—'),
    school: SCHOOL_KO[String(s.school || '').toLowerCase()] || s.school || '—',
    classes: s.dnd_class || '—',
    range: s.range || '—',
    duration: s.duration || '—',
    castingTime: s.casting_time || '—',
    components: comp || '—',
    concentration: s.concentration === 'yes' || s.requires_concentration === true,
    ritual: s.ritual === 'yes' || s.can_be_cast_as_ritual === true,
    desc: (s.desc || '').trim(),
    higher: (s.higher_level || '').trim(),
  }
}

async function fetchRandomSpell(signal: AbortSignal): Promise<Spell> {
  // 무작위 페이지 → 그 페이지의 무작위 주문 (일부 페이지가 비어도 graceful)
  const page = 1 + Math.floor(Math.random() * MAX_PAGE)
  const r = await fetch(`https://api.open5e.com/v1/spells/?page=${page}`, { signal })
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const list: any[] = Array.isArray(j?.results) ? j.results : []
  if (!list.length) throw new Error('empty')
  return parseSpell(list[Math.floor(Math.random() * list.length)])
}

export default function DnDSpell() {
  const [spell, setSpell] = useState<Spell | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const nonce = useRef(0)
  const ctrlRef = useRef<AbortController | null>(null)
  const aliveRef = useRef(true)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false; ctrlRef.current?.abort(); if (toastTimer.current) window.clearTimeout(toastTimer.current) }
  }, [])

  const draw = async () => {
    const my = ++nonce.current
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true); setErr(''); setCopied(false)
    try {
      const s = await fetchRandomSpell(ctrl.signal)
      if (!aliveRef.current || my !== nonce.current) return
      setSpell(s)
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
    } catch (e: any) {
      if (!aliveRef.current || my !== nonce.current) return
      if (e?.name === 'AbortError') return
      setErr('주문을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.')
    } finally {
      if (aliveRef.current && my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => { draw() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const buildText = (s: Spell) =>
    `🪄 ${s.name}\n` +
    `· 레벨: ${s.level}\n` +
    `· 계열: ${s.school}\n` +
    `· 직업: ${s.classes}\n` +
    `· 시전 시간: ${s.castingTime}\n` +
    `· 사거리: ${s.range}\n` +
    `· 지속: ${s.duration}${s.concentration ? ' (집중)' : ''}\n` +
    `· 구성요소: ${s.components}${s.ritual ? ' / 의식 가능' : ''}\n\n` +
    `[효과] ${s.desc || '—'}` +
    (s.higher ? `\n\n[고레벨] ${s.higher}` : '')

  const copy = () => {
    if (!spell) return
    navigator.clipboard?.writeText(buildText(spell) + `\n\n[설계 글감] ${prompt}`).then(() => {
      setCopied(true); setTimeout(() => { if (aliveRef.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  // HTML 특수문자 escape(&,<,> 필수) — 본문 HTML 안전 처리
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 주문(이름/레벨/계열/효과)을 프로젝트 자료(세계관 폴더)에 메모로 추가
  const toProject = () => {
    if (!spell) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않아 추가할 수 없어요.'); return }
    const s = spell
    const bodyHtml =
      `<p><b>🪄 ${esc(s.name)}</b></p>` +
      `<p><b>레벨</b> · ${esc(s.level)}</p>` +
      `<p><b>계열</b> · ${esc(s.school)}</p>` +
      `<p><b>직업</b> · ${esc(s.classes)}</p>` +
      `<p><b>시전 시간</b> · ${esc(s.castingTime)}</p>` +
      `<p><b>사거리</b> · ${esc(s.range)}</p>` +
      `<p><b>지속 시간</b> · ${esc(s.duration)}${s.concentration ? ' (집중)' : ''}</p>` +
      `<p><b>구성요소</b> · ${esc(s.components)}${s.ritual ? ' / 의식 가능' : ''}</p>` +
      `<p><b>효과</b> · ${esc(s.desc || '—')}</p>` +
      (s.higher ? `<p><b>고레벨 시전</b> · ${esc(s.higher)}</p>` : '') +
      `<p><b>✨ 설계 글감</b> · ${esc(prompt)}</p>`
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '세계관',
      title: `🪄 ${s.name}`,
      bodyHtml,
      meta: { 레벨: s.level, 계열: s.school, 직업: s.classes },
    })
    if (!aliveRef.current) return
    setToast(id ? `‘${s.name}’을(를) 프로젝트 ‘자료 › 세계관’에 추가했어요.` : '프로젝트에 추가하지 못했어요.')
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { if (aliveRef.current) setToast('') }, 4000)
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '28px 8px', fontSize: 13 }
  const rowS: React.CSSProperties = { display: 'flex', gap: 8 }
  const factRow: React.CSSProperties = { display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }
  const factKey: React.CSSProperties = { width: 76, flexShrink: 0, color: 'var(--muted)' }
  const factVal: React.CSSProperties = { flex: 1, color: 'var(--text)', wordBreak: 'break-word' }
  const badge: React.CSSProperties = { fontSize: 11, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--accent)' }
  const sectTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--accent)', margin: '12px 0 4px' }
  const body: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>주문을 소환하는 중…</div>}
        {err && !loading && <div style={{ ...msg, color: 'var(--warn)' }}>{err}</div>}
        {spell && !loading && !err && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>{spell.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={badge}>{spell.level}</span>
              <span style={badge}>{spell.school}</span>
              {spell.concentration && <span style={badge}>집중</span>}
              {spell.ritual && <span style={badge}>의식</span>}
            </div>
            <div style={factRow}><span style={factKey}>직업</span><span style={factVal}>{spell.classes}</span></div>
            <div style={factRow}><span style={factKey}>시전 시간</span><span style={factVal}>{spell.castingTime}</span></div>
            <div style={factRow}><span style={factKey}>사거리</span><span style={factVal}>{spell.range}</span></div>
            <div style={factRow}><span style={factKey}>지속 시간</span><span style={factVal}>{spell.duration}</span></div>
            <div style={{ ...factRow, borderBottom: 'none' }}><span style={factKey}>구성요소</span><span style={factVal}>{spell.components}</span></div>
            {spell.desc && (<><div style={sectTitle}>효과 요약</div><div style={body}>{spell.desc}</div></>)}
            {spell.higher && (<><div style={sectTitle}>고레벨 시전</div><div style={body}>{spell.higher}</div></>)}
          </>
        )}
        {!spell && !loading && !err && <div style={msg}>무작위 주문을 가져오세요.</div>}
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)' }}>
        <Emoji e="✨"/> <b style={{ color: 'var(--accent)' }}>설계 글감</b> · {prompt}
      </div>

      <div style={rowS}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={draw} disabled={loading}><Emoji e="🔀"/> 다른 주문</button>
        <button className="minibtn" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}><Emoji e="✏️"/> 다른 글감</button>
        <button className="minibtn" onClick={copy} disabled={!spell}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {/* [프로젝트 연동] 현재 주문을 자료(세계관)에 메모로 추가 — 결과 없거나 미연결 시 비활성 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!spell || !hasProjectBridge()}
          title={hasProjectBridge() ? '현재 주문을 프로젝트 자료(세계관)에 메모로 추가' : '프로젝트에 연결되어 있지 않아요'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>
      {toast && (
        <div style={{ fontSize: 12, color: 'var(--ok)', textAlign: 'center', lineHeight: 1.5 }}>{toast}</div>
      )}
    </div>
  )
}
