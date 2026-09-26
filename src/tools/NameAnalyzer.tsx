import { useState, useEffect, useRef } from 'react'
import { openToolLinked, addToLibrary, addToProject, hasProjectBridge } from './linkbus'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const meta = { id: 'name-analyzer', name: '이름 분석', icon: '🪪', group: '영감·발상', intro: '이름으로 추정 성별·국적·나이 (캐릭터 작명 영감)', w: 460, h: 560 }

type GenderRes = { name: string; gender: string | null; probability: number; count: number }
type AgeRes = { name: string; age: number | null; count: number }
type NationRes = { name: string; country: { country_id: string; probability: number }[] }

const COUNTRY_NAMES: Record<string, string> = {
  KR: '대한민국', JP: '일본', CN: '중국', US: '미국', GB: '영국', FR: '프랑스',
  DE: '독일', IT: '이탈리아', ES: '스페인', RU: '러시아', IN: '인도', BR: '브라질',
  CA: '캐나다', AU: '호주', MX: '멕시코', NL: '네덜란드', SE: '스웨덴', NO: '노르웨이',
  DK: '덴마크', FI: '핀란드', PL: '폴란드', PT: '포르투갈', GR: '그리스', TR: '터키',
  IE: '아일랜드', BE: '벨기에', CH: '스위스', AT: '오스트리아', VN: '베트남', TH: '태국',
  ID: '인도네시아', PH: '필리핀', MY: '말레이시아', SG: '싱가포르', UA: '우크라이나',
  CZ: '체코', HU: '헝가리', RO: '루마니아', IL: '이스라엘', SA: '사우디아라비아',
  AE: '아랍에미리트', EG: '이집트', ZA: '남아프리카공화국', NG: '나이지리아', NZ: '뉴질랜드',
  AR: '아르헨티나', CL: '칠레', CO: '콜롬비아', PE: '페루', IR: '이란', PK: '파키스탄',
  BD: '방글라데시', HK: '홍콩', TW: '대만',
}

const flagOf = (cc: string) =>
  cc && cc.length === 2
    ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🏳️'

const countryLabel = (cc: string) => `${flagOf(cc)} ${COUNTRY_NAMES[cc] || cc}`

export default function NameAnalyzer() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [gender, setGender] = useState<GenderRes | null>(null)
  const [age, setAge] = useState<AgeRes | null>(null)
  const [nation, setNation] = useState<NationRes | null>(null)
  const [done, setDone] = useState(false)
  const [linkMsg, setLinkMsg] = useState('') // 연계 동작 안내(추가됨 등)

  const aliveRef = useRef(true)
  const acRef = useRef<AbortController | null>(null)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      acRef.current?.abort()
      if (linkTimer.current) clearTimeout(linkTimer.current)
    }
  }, [])

  const analyze = async () => {
    const q = name.trim()
    if (!q) {
      setError('이름을 입력하세요.')
      return
    }
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac

    setLoading(true)
    setError('')
    setCopied(false)
    setLinkMsg('')
    setGender(null)
    setAge(null)
    setNation(null)
    setDone(false)

    const enc = encodeURIComponent(q)
    try {
      const [gRes, aRes, nRes] = await Promise.all([
        fetch(`https://api.genderize.io/?name=${enc}`, { signal: ac.signal }),
        fetch(`https://api.agify.io/?name=${enc}`, { signal: ac.signal }),
        fetch(`https://api.nationalize.io/?name=${enc}`, { signal: ac.signal }),
      ])
      if (!gRes.ok || !aRes.ok || !nRes.ok) throw new Error('요청 실패 (사용량 한도일 수 있어요)')
      const [g, a, n] = await Promise.all([gRes.json(), aRes.json(), nRes.json()])
      if (!aliveRef.current) return
      setGender(g)
      setAge(a)
      setNation(n)
      setDone(true)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      if (!aliveRef.current) return
      setError(e?.message || '분석 중 오류가 발생했어요.')
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') analyze()
  }

  const genderText =
    gender?.gender === 'male' ? '남성' : gender?.gender === 'female' ? '여성' : null

  const topCountries = (nation?.country || []).slice(0, 3)

  const summaryText = (() => {
    if (!done) return ''
    const lines = [`이름: ${name.trim()}`]
    lines.push(
      `추정 성별: ${genderText ? `${genderText} (${Math.round((gender?.probability || 0) * 100)}%)` : '알 수 없음'}`,
    )
    lines.push(`추정 나이: ${age?.age != null ? `${age.age}세` : '알 수 없음'}`)
    if (topCountries.length) {
      lines.push('추정 국적:')
      topCountries.forEach(c =>
        lines.push(`  - ${COUNTRY_NAMES[c.country_id] || c.country_id} (${Math.round(c.probability * 100)}%)`),
      )
    } else {
      lines.push('추정 국적: 알 수 없음')
    }
    return lines.join('\n')
  })()

  const copy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      if (!aliveRef.current) return
      setCopied(true)
      setTimeout(() => aliveRef.current && setCopied(false), 1500)
    } catch {
      setError('복사에 실패했어요.')
    }
  }

  // ── 연계(linkbus) ──
  // 분석 결과를 캐릭터 정보로 직렬화. 통계 추정값(genderize/agify/nationalize)이며
  // 저작권 대상이 아닌 수치 데이터만 사용하므로 이미지·인용 없이 안전하게 공유 가능.
  const flashLink = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => { if (aliveRef.current) setLinkMsg('') }, 1800)
  }

  const buildTraits = () => {
    const traits: { k: string; v: string }[] = []
    if (genderText) traits.push({ k: '추정 성별', v: `${genderText} (${Math.round((gender?.probability || 0) * 100)}%)` })
    if (age?.age != null) traits.push({ k: '추정 나이', v: `${age.age}세` })
    if (topCountries.length) {
      traits.push({
        k: '추정 국적',
        v: topCountries
          .map(c => `${COUNTRY_NAMES[c.country_id] || c.country_id} ${Math.round(c.probability * 100)}%`)
          .join(', '),
      })
    }
    return traits
  }

  // 분석 결과를 정규(표준) 캐릭터 키로 매핑한 fields 객체를 만든다.
  // 받는 허브(인물 시트)에서 항목이 기본 칸에 제자리로 들어가도록 표준화.
  const buildCharFields = () => {
    const nm = name.trim()
    const fields: Record<string, string> = { name: nm }
    if (genderText) fields.gender = `${genderText} (이름 통계 추정 ${Math.round((gender?.probability || 0) * 100)}%)`
    if (age?.age != null) fields.age = `약 ${age.age}세 (이름 통계 추정)`
    if (topCountries.length) {
      fields.origin = topCountries
        .map(c => `${COUNTRY_NAMES[c.country_id] || c.country_id} ${Math.round(c.probability * 100)}%`)
        .join(', ')
    }
    fields.notes = summaryText
    return fields
  }

  // 인물 시트 도구를 분석 결과와 함께 연다.
  const sendToSheet = () => {
    if (!done) return
    const nm = name.trim()
    openToolLinked('character-sheet', {
      name: nm,
      role: '',
      age: age?.age != null ? `약 ${age.age}세 (이름 통계 추정)` : '',
      background: summaryText,
      notes: summaryText,
      fields: buildCharFields(),
      source: '이름 분석(통계 추정)',
    })
    flashLink('인물 시트로 보냈어요.')
  }

  // 공유 인물 라이브러리에 추가(다른 도구들이 자동 구독).
  const addToCharacters = () => {
    if (!done) return
    const nm = name.trim()
    addToLibrary('characters', {
      name: nm,
      traits: buildTraits(),
      notes: summaryText,
      fields: buildCharFields(),
      source: '이름 분석(통계 추정)',
    })
    flashLink('인물 라이브러리에 추가했어요.')
  }

  // 프로젝트 브리지: 분석한 이름과 추정값을 실제 바인더(자료>인물)에 인물 카드로 추가.
  // 통계 추정 수치만 사용(이미지·인용 없음)하므로 텍스트로 안전하게 저장.
  const addToProjectBinder = () => {
    if (!done) return
    const nm = name.trim()
    const traits = buildTraits()
    const character: Record<string, string> = { name: nm, role: '이름 통계 추정' }
    // 정규(표준) 키로 직접 매핑 — 받는 허브에서 항목이 기본 칸에 제자리로 들어가도록.
    // 기존 표시 라벨 키는 그대로 두고(추가만), 정규 키를 함께 채운다.
    if (genderText) {
      const gv = `${genderText} (${Math.round((gender?.probability || 0) * 100)}%)`
      character['추정 성별'] = gv
      character['gender'] = gv
    }
    if (age?.age != null) {
      const av = `약 ${age.age}세`
      character['추정 나이'] = av
      character['age'] = av
    }
    if (topCountries.length) {
      const cv = topCountries
        .map(c => `${COUNTRY_NAMES[c.country_id] || c.country_id} ${Math.round(c.probability * 100)}%`)
        .join(', ')
      character['추정 국적'] = cv
      character['origin'] = cv
    }
    character['notes'] = summaryText
    const bodyHtml =
      `<p><strong>${esc(nm)}</strong> — 이름 통계 추정</p>` +
      '<ul>' +
      traits.map(t => `<li>${esc(t.k)}: ${esc(t.v)}</li>`).join('') +
      '</ul>' +
      '<p style="font-size:12px;color:#888">genderize·agify·nationalize 공개 통계 기반 추정값이며 실제 인물 정보가 아닙니다. 작명·설정 영감 용도.</p>'
    const id = addToProject({
      kind: 'character',
      root: 'research',
      folder: '인물',
      title: nm || '이름 분석',
      character,
      bodyHtml,
      meta: { 출처: '이름 분석(통계 추정)' },
    })
    flashLink(id ? '프로젝트에 추가했어요.' : '프로젝트가 연결되지 않았어요.')
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 14px',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        이름을 입력하면 통계 기반으로 추정 성별·나이·국적을 보여줍니다. 캐릭터 설정의 영감 용도로 쓰세요. (영문 이름이 더 정확합니다)
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={onKey}
          placeholder="이름 입력 (예: Hana, Alex, Sofia)"
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button className="btn-primary" onClick={analyze} disabled={loading}>
          {loading ? '분석 중…' : '분석'}
        </button>
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: 'var(--warn)', color: 'var(--warn)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 2px' }}>불러오는 중…</div>
        )}

        {done && !loading && (
          <>
            <div style={cardStyle}>
              <div style={labelStyle}>추정 성별</div>
              {genderText ? (
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {genderText}{' '}
                  <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
                    {Math.round((gender?.probability || 0) * 100)}% 신뢰도
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 15, color: 'var(--muted)' }}>알 수 없음</div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>추정 나이</div>
              {age?.age != null ? (
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {age.age}세{' '}
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                    표본 {age.count?.toLocaleString?.() ?? age.count}건
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 15, color: 'var(--muted)' }}>알 수 없음</div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>추정 국적 (상위 3)</div>
              {topCountries.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {topCountries.map(c => {
                    const pct = Math.round(c.probability * 100)
                    return (
                      <div key={c.country_id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            marginBottom: 3,
                          }}
                        >
                          <span>{countryLabel(c.country_id)}</span>
                          <span style={{ color: 'var(--muted)' }}>{pct}%</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 4,
                            background: 'var(--chrome-2)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'var(--accent)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 15, color: 'var(--muted)' }}>알 수 없음</div>
              )}
            </div>
          </>
        )}

        {!done && !loading && !error && (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 2px' }}>
            이름을 입력하고 분석을 눌러보세요.
          </div>
        )}
      </div>

      {done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 연계: 분석한 이름을 캐릭터 도구로 보내기/공유 라이브러리에 추가 */}
          <div className="linkbar">
            <span className="linkbar-label">연계</span>
            <button className="linkbtn" onClick={sendToSheet} title="이 이름·추정값을 인물 시트로 보냅니다">
              🧑‍🎤 인물 시트로 보내기
            </button>
            <button className="linkbtn" onClick={addToCharacters} title="공유 인물 라이브러리에 추가합니다">
              ＋ 인물 라이브러리에 추가
            </button>
            <button
              className="linkbtn"
              onClick={addToProjectBinder}
              disabled={!done || !hasProjectBridge()}
              title={hasProjectBridge() ? '분석한 이름·추정값을 프로젝트(자료>인물)에 카드로 추가합니다' : '프로젝트에 연결되어 있지 않습니다'}
            >
              📄 프로젝트에 추가
            </button>
            {linkMsg && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{linkMsg}</span>}
          </div>

          <div className="license-note">
            추정값은 genderize·agify·nationalize의 공개 통계(이름 표본 기반)이며 실제 인물 정보가 아닙니다. 작명·설정 영감 용도로만 사용하세요.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={copy} disabled={!summaryText}>
              {copied ? '복사됨 ✓' : '결과 복사'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
