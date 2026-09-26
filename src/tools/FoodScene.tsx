// 음식 장면 소재 — 키 없는 공개 API(TheMealDB)로 무작위 요리를 가져와 글 속 장면의 소재로 삼는다.
// API: https://www.themealdb.com/api/json/v1/1/random.php — 키 불필요·https·CORS 허용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'food-scene', name: '음식 장면 소재', icon: '🍲', group: '영감·발상', intro: '무작위 요리로 글 속 한 장면을 떠올리세요', w: 420, h: 600 }

interface Meal {
  name: string
  area: string
  category: string
  img: string
  instr: string
  cc: boolean
}

const SCENE_PROMPTS = [
  '이 음식이 식탁에 오른 날, 무슨 일이 있었나요? 그 저녁을 한 문단으로 써보세요.',
  '이 요리를 만든 사람의 손을 묘사하세요. 그 손은 무엇을 견뎌왔을까요?',
  '주인공이 낯선 도시에서 이 음식을 처음 맛봅니다. 첫 입의 순간을 써보세요.',
  '이 음식의 냄새가 어떤 기억을 불러옵니다. 그 기억으로 장면을 시작하세요.',
  '두 사람이 이 음식을 사이에 두고 마주 앉았습니다. 그들이 끝내 하지 못한 말은?',
  '이 요리가 마지막 식사라면, 누가 무엇을 위해 그것을 준비했을까요?',
  '이 음식을 거부하는 인물이 있습니다. 그 거부의 이유를 장면으로 그리세요.',
  '이 음식을 둘러싼 소리·온도·빛을 묘사해 한 장면을 완성하세요.',
  '이 요리의 레시피가 한 가족의 비밀과 얽혀 있다면? 그 이야기를 상상하세요.',
  '이 음식을 먹은 뒤 모든 것이 달라졌습니다. 그 전과 후를 대비해 써보세요.',
]

// 저작권 안전화: 출처/주의 문구 상수
const SOURCE_LABEL = 'Image: TheMealDB (themealdb.com)'
const SOURCE_URL = 'https://www.themealdb.com'
const TEXT_SOURCE_NOTE = '출처: TheMealDB, 묘사 참고용'

function ccFlag(v: unknown): boolean {
  // strCreativeCommons 가 명시적으로 CC 표시일 때만 true. (빈 값/null/"No" 등은 false)
  if (v == null) return false
  const s = String(v).trim().toLowerCase()
  if (!s || s === 'no' || s === 'none' || s === 'null' || s === 'false' || s === '0') return false
  return s.includes('cc') || s.includes('creative commons') || s === 'yes' || s === 'true'
}

async function fetchMeal(): Promise<Meal> {
  const r = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
  if (!r.ok) throw new Error('bad response')
  const j = await r.json()
  const m = j && Array.isArray(j.meals) ? j.meals[0] : null
  if (!m) throw new Error('no meal')
  const cc = ccFlag(m.strCreativeCommons)
  return {
    name: m.strMeal || '이름 없는 요리',
    area: m.strArea || '미상',
    category: m.strCategory || '',
    // CC 표시가 있는 항목의 이미지만 보관. 그 외에는 이미지를 표시하지 않는다.
    img: cc ? (m.strMealThumb || '') : '',
    instr: (m.strInstructions || '').trim(),
    cc,
  }
}

export default function FoodScene() {
  const [meal, setMeal] = useState<Meal | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(SCENE_PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const nonce = useRef(0)

  const load = async () => {
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false)
    try {
      const m = await fetchMeal()
      if (my === nonce.current) {
        setMeal(m)
        setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])
      }
    } catch {
      if (my === nonce.current) setErr('요리를 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const copyText = () => {
    if (!meal) return
    // 저작권 안전화: 이미지 URL 은 포함하지 않고 텍스트만 복사. 조리/소재 텍스트엔 출처·주의 삽입.
    const summary = (meal.instr ? meal.instr.slice(0, 280) + (meal.instr.length > 280 ? '…' : '') : '')
    const text = `요리: ${meal.name}\n지역: ${meal.area}${meal.category ? ' · ' + meal.category : ''}\n\n글감: ${prompt}${summary ? '\n\n조리 메모(' + TEXT_SOURCE_NOTE + '): ' + summary : ''}\n\n${TEXT_SOURCE_NOTE}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    if (!meal) return
    // 저작권 안전화: 이미지 URL 은 저장하지 않음(텍스트만). 조리법/소재 텍스트에 출처·주의 삽입.
    const summary = meal.instr ? meal.instr.slice(0, 320) + (meal.instr.length > 320 ? '…' : '') : ''
    const region = meal.area + (meal.category ? ' · ' + meal.category : '')
    const bodyHtml = [
      `<p><strong>요리:</strong> ${esc(meal.name)}</p>`,
      `<p><strong>지역:</strong> ${esc(region)}</p>`,
      `<p><strong>장면 질문:</strong> ${esc(prompt)}</p>`,
      summary ? `<p><strong>조리 메모(묘사 참고):</strong> ${esc(summary)}</p>` : '',
      `<p class="license-note">${esc(TEXT_SOURCE_NOTE)}</p>`,
    ].filter(Boolean).join('')
    const meta: Record<string, string> = { 요리: meal.name, 지역: meal.area }
    if (meal.category) meta.분류 = meal.category
    meta.출처 = TEXT_SOURCE_NOTE
    const id = addToProject({
      kind: 'text', root: 'research', folder: '소재',
      title: '음식 장면 소재 · ' + meal.name,
      bodyHtml,
      meta,
    })
    setSaved(id ? '프로젝트 자료에 소재 추가됨' : '프로젝트에 연결되지 않았습니다')
    setTimeout(() => setSaved(''), 1800)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>요리를 불러오는 중…</div>
        )}
        {err && !loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center', padding: 16 }}>{err}</div>
        )}
        {meal && !loading && !err && (
          <>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--chrome-2)', border: '1px solid var(--border)' }}>
              {meal.img
                ? <img src={meal.img} alt={meal.name} style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                : <div style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}><Emoji e="🍽" /></div>}
            </div>
            {/* 저작권 안전화: 이미지 출처/라이선스 표기 (CC 이미지일 때 표시) */}
            {meal.img
              ? <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: -4 }}>
                  <span className="license-badge">CC</span> {SOURCE_LABEL} · <a className="license-note" href={SOURCE_URL} target="_blank" rel="noopener noreferrer nofollow">themealdb.com</a>
                </div>
              : <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: -4 }}>
                  이미지 라이선스 미표시 항목이라 이미지를 표시하지 않습니다 · 출처: <a className="license-note" href={SOURCE_URL} target="_blank" rel="noopener noreferrer nofollow">themealdb.com</a>
                </div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{meal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}><Emoji e="📍" /> {meal.area}{meal.category ? ' · ' + meal.category : ''}</div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️" /> 이 음식이 나오는 장면</div>
              {prompt}
            </div>
            {meal.instr && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}><Emoji e="🔎" /> 조리 메모(묘사 참고)</div>
                {meal.instr.slice(0, 320)}{meal.instr.length > 320 ? '…' : ''}
                <div className="license-note" style={{ marginTop: 6, fontSize: 11 }}>{TEXT_SOURCE_NOTE}</div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={load} disabled={loading}><Emoji e="🔀" /> 다른 요리</button>
        <button className="minibtn" onClick={() => setPrompt(SCENE_PROMPTS[Math.floor(Math.random() * SCENE_PROMPTS.length)])} disabled={!meal}><Emoji e="💡" /> 다른 글감</button>
        <button className="minibtn" onClick={copyText} disabled={!meal}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 글쓰기에 활용</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!meal || !hasProjectBridge()} title={hasProjectBridge() ? '현재 음식 장면 소재를 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>무작위 요리를 소재로 한 장면을 떠올려 바로 원고에 적어보세요. 음식·지역·조리법은 묘사의 디테일이 됩니다.</div>
      <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)' }}>요리 데이터·이미지 출처: TheMealDB. 이미지는 라이선스(CC) 표시가 있는 항목만 노출하며, 텍스트는 묘사 참고용입니다.</div>
    </div>
  )
}
