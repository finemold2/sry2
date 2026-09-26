// 하이쿠/단시 빌더 — 3행 5-7-5 음절(한국어는 음절=글자 기준)을 실시간으로 세고, 계절을 고르면
// 계어(季語, season word) 후보를 모아 제안한다. 완성한 시를 복사하거나 프로젝트 원고 〈시〉 폴더에 추가.
// 자급식: react 와 './linkbus' 외 import 없음, 외부 네트워크 불필요(전부 로컬). 입력은 localStorage 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'haiku-builder', name: '하이쿠 빌더', icon: '🌸', group: '구상·정리', intro: '3행 5-7-5 음절을 실시간으로 세고 계어(季語)를 곁들여 하이쿠·단시를 지으세요', w: 520, h: 640 }

const LS_KEY = 'sry:tool:haiku-builder'

// 한국어는 음절 단위로 센다(한글 음절 블록 1글자 = 1음절). 공백·문장부호·기타 기호는 제외.
// 한글 음절(가-힣)·낱자(ㄱ-ㅎ, ㅏ-ㅣ)는 1음절로, 한자/일본어 음절문자도 1음절로 근사 집계.
function countSyllables(line: string): number {
  let n = 0
  for (const ch of line) {
    const code = ch.codePointAt(0)
    if (code === undefined) continue
    if (
      (code >= 0xac00 && code <= 0xd7a3) ||   // 한글 음절(가-힣)
      (code >= 0x1100 && code <= 0x11ff) ||   // 한글 자모
      (code >= 0x3130 && code <= 0x318f) ||   // 한글 호환 자모(ㄱ-ㅣ)
      (code >= 0x4e00 && code <= 0x9fff) ||   // CJK 한자(한 자 = 한 음)
      (code >= 0x3040 && code <= 0x30ff)      // 일본어 히라가나·가타카나
    ) {
      n++
    }
  }
  return n
}

const TARGET = [5, 7, 5] as const
const LINE_LABEL = ['초장 (5)', '중장 (7)', '종장 (5)'] as const

type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'newyear'
const SEASONS: { key: Season; label: string; icon: string }[] = [
  { key: 'spring', label: '봄', icon: '🌱' },
  { key: 'summer', label: '여름', icon: '🌞' },
  { key: 'autumn', label: '가을', icon: '🍂' },
  { key: 'winter', label: '겨울', icon: '❄️' },
  { key: 'newyear', label: '신년', icon: '🎍' },
]

// 계어(季語) — 계절을 드러내는 전통 시어. 각 항목에 음절수를 함께 보여줘 자리에 맞게 고르도록 돕는다.
const KIGO: Record<Season, string[]> = {
  spring: ['봄바람', '벚꽃', '진달래', '아지랑이', '나비', '새싹', '봄비', '제비', '개구리', '냉이', '봄눈', '꽃샘추위', '버들강아지', '春(봄)'],
  summer: ['장맛비', '매미', '소나기', '반딧불', '연꽃', '석류', '수박', '땀', '소쩍새', '대숲', '천둥', '폭염', '모깃불', '여름밤'],
  autumn: ['단풍', '귀뚜라미', '보름달', '코스모스', '낙엽', '국화', '서리', '기러기', '추석', '고추잠자리', '억새', '감', '가을바람', '벼이삭'],
  winter: ['첫눈', '함박눈', '고드름', '동백', '서릿발', '동지', '화로', '얼음', '북풍', '겨울나무', '눈사람', '입김', '매화', '한파'],
  newyear: ['설날', '떡국', '복조리', '세배', '연하장', '까치설', '한 해', '새해', '대보름', '윷놀이', '소나무', '학', '해돋이', '첫새벽'],
}

interface State {
  lines: [string, string, string]
  title: string
  season: Season
}

function defaultState(): State {
  return { lines: ['', '', ''], title: '', season: 'spring' }
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultState()
    const p = JSON.parse(raw)
    const ls = Array.isArray(p?.lines) ? p.lines : []
    const lines: [string, string, string] = [
      typeof ls[0] === 'string' ? ls[0] : '',
      typeof ls[1] === 'string' ? ls[1] : '',
      typeof ls[2] === 'string' ? ls[2] : '',
    ]
    const season: Season = (['spring', 'summer', 'autumn', 'winter', 'newyear'] as Season[]).includes(p?.season) ? p.season : 'spring'
    return { lines, title: typeof p?.title === 'string' ? p.title : '', season }
  } catch {
    return defaultState()
  }
}

export default function HaikuBuilder({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [lines, setLines] = useState<[string, string, string]>(init.current.lines)
  const [title, setTitle] = useState(init.current.title)
  const [season, setSeason] = useState<Season>(init.current.season)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 초기 본문/계절을 받으면 한 번 반영(연계로 열렸을 때).
  useEffect(() => {
    if (!payload) return
    const text = typeof payload.text === 'string' ? payload.text : ''
    if (text) {
      const parts = text.split(/\r?\n/).map((s) => s.trim())
      setLines([parts[0] || '', parts[1] || '', parts[2] || ''])
    }
    const ps = payload.season
    if (typeof ps === 'string' && (['spring', 'summer', 'autumn', 'winter', 'newyear'] as string[]).includes(ps)) {
      setSeason(ps as Season)
    }
    // payload 는 마운트 시 1회만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ lines, title, season }))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, title, season])

  const flash = (m: string) => {
    setNote(m)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2400)
  }

  const counts = lines.map(countSyllables) as [number, number, number]
  const total = counts[0] + counts[1] + counts[2]
  const targetTotal = TARGET[0] + TARGET[1] + TARGET[2]
  const allExact = counts.every((c, i) => c === TARGET[i])
  const hasAny = lines.some((l) => l.trim().length > 0)
  const poemText = lines.map((l) => l.trim()).filter(Boolean).join('\n')

  const setLine = (i: number, v: string) => {
    setLines((p) => {
      const n = p.slice() as [string, string, string]
      n[i] = v
      return n
    })
  }

  const insertKigo = (word: string) => {
    // 가장 비어있거나 목표에 못 미치는 행에 계어를 끼워넣어 작성을 돕는다.
    setLines((p) => {
      const n = p.slice() as [string, string, string]
      let target = n.findIndex((l, i) => countSyllables(l) < TARGET[i])
      if (target < 0) target = 0
      const cur = n[target]
      const w = word.replace(/\(.+?\)/g, '').trim() || word // '春(봄)' → '春'
      n[target] = cur ? (cur.trimEnd() + ' ' + w) : w
      return n
    })
    flash(`계어 “${word}”를 넣었습니다.`)
  }

  const clearAll = () => {
    setLines(['', '', ''])
    setTitle('')
    flash('모두 비웠습니다.')
  }

  const copy = async () => {
    if (!poemText) { flash('복사할 시가 없습니다.'); return }
    const text = title.trim() ? `${title.trim()}\n\n${poemText}` : poemText
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false) }, 1400)
    } catch {
      flash('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  const escapeHtml = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const toProject = () => {
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!poemText) { flash('추가할 시가 없습니다.'); return }
    const seasonLabel = SEASONS.find((s) => s.key === season)?.label || ''
    const seasonIcon = SEASONS.find((s) => s.key === season)?.icon || ''
    const bodyHtml = lines
      .map((l, i) => {
        const t = l.trim()
        if (!t) return ''
        return `<p>${escapeHtml(t)} <span style="color:#999;font-size:11px;">(${counts[i]})</span></p>`
      })
      .filter(Boolean)
      .join('') + `<p style="color:#999;font-size:11px;margin-top:8px;">${escapeHtml(seasonIcon + ' ' + seasonLabel)} · 음절 ${total}/${targetTotal}</p>`
    const t = title.trim()
    const safeTitle = t || ('하이쿠 — ' + (lines[0].trim() || '무제'))
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '시',
      title: safeTitle.length > 40 ? safeTitle.slice(0, 40) + '…' : safeTitle,
      bodyHtml,
      synopsis: poemText.replace(/\n/g, ' / '),
      meta: { 형식: '하이쿠(5-7-5)', 계절: seasonLabel, 음절수: `${total}/${targetTotal}` },
    })
    flash(id ? '프로젝트 원고 〈시〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 15, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const counterChip = (n: number, t: number): React.CSSProperties => ({
    fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'center',
    padding: '4px 8px', borderRadius: 999, border: '1px solid ' + (n === t ? 'var(--ok, #2e9e5b)' : (n > t ? 'var(--warn, #c4622d)' : 'var(--border)')),
    color: n === t ? 'var(--ok, #2e9e5b)' : (n > t ? 'var(--warn, #c4622d)' : 'var(--muted)'),
    background: n === t ? 'rgba(46,158,91,0.10)' : (n > t ? 'rgba(196,98,45,0.10)' : 'var(--chrome-2)'),
    whiteSpace: 'nowrap',
  })
  const seasonChip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 13, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const kigoBtn: React.CSSProperties = {
    padding: '5px 10px', fontSize: 12.5, borderRadius: 8, cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', whiteSpace: 'nowrap',
  }
  const previewBox: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid ' + (allExact ? 'var(--accent)' : 'var(--border)'), borderRadius: 12,
    padding: '16px 18px', fontSize: 17, lineHeight: 1.9, color: 'var(--text)', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', minHeight: 80,
  }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🌸" /> 하이쿠 빌더</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>3행 5-7-5 음절 · 계어(季語)</span>
        <span style={{ ...counterChip(total, targetTotal), marginLeft: 'auto' }}>합 {total}/{targetTotal}</span>
      </div>

      <div style={body}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {/* 입력 — 3행 + 실시간 음절 카운트 */}
        <div style={card}>
          <h4 style={sectionTitle}>본문 — 한 행씩 (한국어는 음절=글자 수)</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>제목 (선택)</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 봄밤" maxLength={60} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lines.map((l, i) => (
              <div key={i}>
                <label style={fieldLabel}>{LINE_LABEL[i]}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    style={{ ...input, flex: 1, minWidth: 0 }}
                    value={l}
                    onChange={(e) => setLine(i, e.target.value)}
                    placeholder={i === 1 ? '예: 흐드러진 벚꽃 그늘' : '예: 봄바람 분다'}
                    maxLength={40}
                    spellCheck={false}
                  />
                  <span style={counterChip(counts[i], TARGET[i])}>{counts[i]} / {TARGET[i]}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={clearAll} disabled={!hasAny && !title}><Emoji e="🗑" /> 모두 비우기</button>
            <span style={{ ...hint, marginLeft: 'auto', alignSelf: 'center' }}>
              {allExact ? '✓ 5-7-5 음절이 딱 맞습니다.' : '음절이 목표와 다르면 표시됩니다(자유시처럼 써도 됩니다).'}
            </span>
          </div>
        </div>

        {/* 계어(季語) 제안 */}
        <div style={card}>
          <h4 style={sectionTitle}>계어(季語) — 계절을 드러내는 시어</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {SEASONS.map((s) => (
              <button key={s.key} onClick={() => setSeason(s.key)} style={seasonChip(season === s.key)}><Emoji e={s.icon} /> {s.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {KIGO[season].map((w) => {
              const syl = countSyllables(w.replace(/\(.+?\)/g, ''))
              return (
                <button key={w} style={kigoBtn} title={`${syl}음절 — 클릭하면 알맞은 행에 넣습니다`} onClick={() => insertKigo(w)}>
                  {w} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{syl}</span>
                </button>
              )
            })}
          </div>
          <div style={{ ...hint, marginTop: 10 }}>
            계어 하나를 시에 심으면 계절감과 정취가 살아납니다. 누르면 가장 짧은(목표 미달) 행에 들어갑니다.
          </div>
        </div>

        {/* 미리보기 + 완성 복사 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>미리보기</h4>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={copy} disabled={!hasAny}>{copied ? '✓ 복사됨' : <><Emoji e="📋" /> 완성 복사</>}</button>
          </div>
          {hasAny ? (
            <div style={previewBox}>
              {title.trim() && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--muted)' }}>{title.trim()}</div>}
              {poemText}
              {allExact && <div style={{ fontSize: 12, color: 'var(--ok, #2e9e5b)', marginTop: 10 }}>✓ 정형 하이쿠(5-7-5) 완성</div>}
            </div>
          ) : (
            <div style={empty}>
              아직 쓴 행이 없습니다.<br />
              위 세 칸에 한 행씩 써 보세요. 음절이 5·7·5에 가까워지면 카운터가 초록으로 바뀝니다.<br />
              <span style={{ fontSize: 12 }}>막막하다면 아래 <b>계어</b>를 눌러 시작해 보세요.</span>
            </div>
          )}

          {/* 연계: 완성한 시를 실제 프로젝트 원고 〈시〉 폴더에 문서로 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={toProject}
              disabled={!hasProjectBridge() || !hasAny}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!hasAny ? '추가할 시가 없습니다' : '완성한 시를 프로젝트 원고 〈시〉 폴더에 추가')}
            ><Emoji e="📄" /> 프로젝트에 추가</button>
          </div>
        </div>

        <div style={hint}>
          하이쿠는 3행 5-7-5 음절에 계절을 드러내는 <b>계어</b>를 담는 짧은 시입니다. 한국어로는 음절(글자) 수로 셉니다.
          음절이 정확히 맞지 않아도 됩니다 — 카운터는 길잡이일 뿐, 자유로운 단시로 써도 좋습니다.
          입력은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
