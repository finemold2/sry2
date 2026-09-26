// SF 인물 모델 — 키 없는 공개 API(swapi.tech)로 우주 인물의 기본 제원(이름/성별/키/머리색 등)을 가져와
// SF 캐릭터를 만들 때 '모델·출발점'으로 삼는다. 그대로 베끼지 말고 변주 질문으로 자기 인물을 빚을 것.
// swapi.tech/api/people/{1~80} : 키 불필요·https·CORS 허용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'star-wars-char', name: 'SF 인물 모델', icon: '🛰️', group: '게임·캐릭터', intro: '우주 인물 제원을 가져와 SF 캐릭터로 변주', w: 400, h: 560 }

const MAX_ID = 80

interface Spec {
  id: string
  name: string
  fields: { k: string; v: string }[]
}

const GENDER_KO: Record<string, string> = {
  male: '남성', female: '여성', hermaphrodite: '자웅동체',
  'n/a': '해당없음', none: '없음', unknown: '불명',
}
const TR = (v: string | undefined): string => {
  if (!v) return '불명'
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'unknown' || s === 'n/a') return '불명'
  return GENDER_KO[s.toLowerCase()] || s
}

// SF 캐릭터로 비틀어 자기 인물을 만들게 하는 변주 질문
const TWISTS = [
  '이 제원을 출발점으로, 정반대의 출신 행성을 부여하세요.',
  '키와 머리색만 남기고 종족·이름·성격은 새로 지으세요.',
  '이 인물에게 기계 의수(義手)나 사이보그 신체 일부를 더하세요.',
  '겉모습은 두되, 숨겨진 두 번째 정체(스파이/반란군 등)를 주세요.',
  '성별 또는 나이대를 바꾸고, 그에 따른 사연을 한 줄로 쓰세요.',
  '이 인물의 가장 큰 약점과 한 가지 집착을 새로 정하세요.',
  '주역이 아니라 라이벌·적대자로 변형해 보세요.',
  '이 제원을 가진 인물의 직업(현상금 사냥꾼/정비공/외교관 등)을 정하세요.',
  '말투 습관 하나만 남기고 나머지는 모두 다시 설계하세요.',
  '이 인물이 타는 함선과 그 함선에 얽힌 비밀을 상상하세요.',
]

async function fetchSpec(id: number, signal: AbortSignal): Promise<Spec> {
  const r = await fetch(`https://swapi.tech/api/people/${id}`, { signal })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const p = j?.result?.properties
  if (!p || !p.name) throw new Error('empty')
  const cm = p.height && /^\d+$/.test(String(p.height)) ? `${p.height}cm` : TR(p.height)
  const kg = p.mass && /^[\d,]+$/.test(String(p.mass)) ? `${p.mass}kg` : TR(p.mass)
  return {
    id: String(id),
    name: p.name,
    fields: [
      { k: '성별', v: TR(p.gender) },
      { k: '키', v: cm },
      { k: '몸무게', v: kg },
      { k: '머리색', v: TR(p.hair_color) },
      { k: '피부색', v: TR(p.skin_color) },
      { k: '눈색', v: TR(p.eye_color) },
      { k: '출생연도', v: TR(p.birth_year) },
    ],
  }
}

export default function StarWarsChar() {
  const [spec, setSpec] = useState<Spec | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [twist, setTwist] = useState(TWISTS[0])
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState('') // 프로젝트 추가 성공/실패 토스트
  const nonce = useRef(0)
  const ac = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  const showFlash = (msg: string) => {
    if (!mounted.current) return
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 2000)
  }

  const load = async () => {
    const my = ++nonce.current
    ac.current?.abort()
    const ctrl = new AbortController()
    ac.current = ctrl
    setLoading(true); setErr(''); setCopied(false)
    // 일부 id는 비어 있을 수 있어 최대 3회 다른 id로 재시도
    let lastErr = false
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = 1 + Math.floor(Math.random() * MAX_ID)
        try {
          const s = await fetchSpec(id, ctrl.signal)
          if (my === nonce.current) {
            setSpec(s)
            setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])
          }
          lastErr = false
          break
        } catch (e) {
          if (ctrl.signal.aborted) return
          lastErr = true
        }
      }
      if (lastErr && my === nonce.current) setErr('인물을 불러오지 못했습니다. 다시 시도하세요.')
    } catch {
      if (my === nonce.current && !ctrl.signal.aborted) setErr('네트워크 오류입니다. 다시 시도하세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
      nonce.current++; ac.current?.abort() // 언마운트 정리 + 경쟁상태 방지
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildText = (s: Spec) =>
    `🛰️ SF 인물 모델: ${s.name}\n` +
    s.fields.map((f) => `· ${f.k}: ${f.v}`).join('\n') +
    `\n\n[변주] ${twist}`

  const copy = () => {
    if (!spec) return
    navigator.clipboard?.writeText(buildText(spec)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // 📄 프로젝트에 추가 — 현재 SF 인물(이름/성별/제원)을 좌측 바인더 '인물' 폴더에 character 카드로 생성.
  // IP/이미지 없이 텍스트 속성만 보내고, 출처(swapi.tech)를 메타로 표기한다.
  const addToProjectCard = () => {
    if (!spec) return
    if (!hasProjectBridge()) { showFlash('프로젝트가 연결되어 있지 않아요.'); return }
    const find = (k: string) => spec.fields.find((f) => f.k === k)?.v || '불명'
    // 제원('불명' 제외)을 한 줄 요약으로 묶어 외형 참고 텍스트로 사용.
    const appearance = spec.fields.filter((f) => f.v && f.v !== '불명').map((f) => `${f.k}: ${f.v}`).join(' · ')
    const id = addToProject({
      kind: 'character',
      folder: '인물',
      title: spec.name,
      // character 레코드의 키를 정규(표준) 키로 매핑 — 받는 허브(인물 시트)가 항목을 제자리 칸에 넣도록.
      // 뭉친 제원은 분리: 키→height, 몸무게→weight, 머리색→hair, 눈색→eyes. 피부색·출생연도는 외형 자유서술(appearance)에 포함.
      character: {
        name: spec.name,
        role: 'SF 모델 참고',
        gender: find('성별'),
        height: find('키'),
        weight: find('몸무게'),
        hair: find('머리색'),
        eyes: find('눈색'),
        appearance,
        notes: '외부 SF 모델 변주: ' + twist,
      },
      meta: { 출처: 'swapi.tech' },
    })
    if (id) {
      showFlash('프로젝트 ‘인물’ 폴더에 인물 카드를 추가했어요')
    } else {
      showFlash('프로젝트에 추가하지 못했어요.')
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '28px 8px', fontSize: 13 }
  const rowS: React.CSSProperties = { display: 'flex', gap: 8 }
  const factRow: React.CSSProperties = { display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }
  const factKey: React.CSSProperties = { width: 72, flexShrink: 0, color: 'var(--muted)' }
  const factVal: React.CSSProperties = { flex: 1, color: 'var(--text)' }

  return (
    <div style={wrap}>
      <div style={card}>
        {loading && <div style={msg}>우주에서 인물을 불러오는 중…</div>}
        {err && !loading && <div style={msg}>{err}</div>}
        {spec && !loading && !err && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}><Emoji e="🪐"/></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, overflowWrap: 'anywhere' }}>{spec.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>SF 인물 제원 · 모델용</div>
              </div>
            </div>
            {spec.fields.map((f, i) => (
              <div key={i} style={i === spec.fields.length - 1 ? { ...factRow, borderBottom: 'none' } : factRow}>
                <span style={factKey}>{f.k}</span><span style={factVal}>{f.v}</span>
              </div>
            ))}
          </>
        )}
        {!spec && !loading && !err && <div style={msg}>인물을 가져오세요.</div>}
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)' }}>
        <Emoji e="✏️"/> <b style={{ color: 'var(--accent)' }}>변주</b> · {twist}
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>※ 그대로 베끼지 말고 영감·출발점으로만 쓰세요.</div>
      </div>

      <div style={rowS}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={load} disabled={loading}><Emoji e="🔀"/> 다른 인물</button>
        <button className="minibtn" onClick={() => setTwist(TWISTS[Math.floor(Math.random() * TWISTS.length)])}><Emoji e="✏️"/> 다른 변주</button>
        <button className="minibtn" onClick={copy} disabled={!spec}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>

      {/* [프로젝트 연동] 현재 SF 인물을 좌측 바인더 '인물' 폴더에 인물 카드(텍스트만)로 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계</span>
        <button
          className="linkbtn"
          onClick={addToProjectCard}
          disabled={!spec || !hasProjectBridge()}
          title={hasProjectBridge() ? '좌측 바인더 ‘인물’ 폴더에 인물 카드로 추가(이미지 제외, 텍스트만)' : '프로젝트 미연결'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {flash && <div className="license-note" style={{ color: 'var(--ok)' }}>{flash}</div>}

      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>data: swapi.tech</div>
    </div>
  )
}
