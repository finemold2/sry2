// 7포인트 구조 — 댄 웰스(Dan Wells)의 Seven Point Story Structure 로 이야기 뼈대를 설계하는 도구.
//  7단계: ① 훅(Hook) → ② 플롯 전환 1(Plot Turn 1) → ③ 핀치 1(Pinch 1) → ④ 중간점(Midpoint)
//        → ⑤ 핀치 2(Pinch 2) → ⑥ 플롯 전환 2(Plot Turn 2) → ⑦ 해결(Resolution).
//  핵심 철학: "결말을 먼저 정하고 거꾸로 설계한다." → ⑦ 해결과 ① 훅은 거울상(대비)을 이루며,
//  중간점에서 주인공이 '반응'에서 '행동'으로 전환된다. 이를 위한 '역설계 팁'을 결말 영역에서 제공.
//  각 단계 내용·완료 체크·진행률, localStorage 자동 저장/복원. 텍스트 복사·내보내기.
//  프로젝트 연동(linkbus): 7단계를 한 편의 문서로 프로젝트 자료('구조' 폴더)에 추가.
// react/linkbus 외 import 없음. 외부 네트워크 불필요(전부 로컬).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'seven-point-structure', name: '7포인트 구조', icon: '🎯', group: '구상·정리', intro: '댄 웰스의 7포인트 구조로 결말부터 거꾸로 이야기 뼈대를 설계하세요', w: 660, h: 640 }

const LS_KEY = 'sry:tool:seven-point-structure'

// ── 7단계 정의(고정): 키/번호/제목/원어/설명/권장 위치(%)/짝(mirror) ───────────────
interface PointDef {
  key: string
  no: number
  title: string      // 한국어 단계명
  en: string         // 댄 웰스 원어
  emoji: string
  pos: number        // 전체 분량 대비 권장 위치(%)
  desc: string       // 단계 설명
  hint: string       // 입력칸 placeholder/힌트
  mirror?: string    // 거울상으로 짝지어지는 단계 key
}

const POINTS: PointDef[] = [
  {
    key: 'hook', no: 1, title: '훅', en: 'Hook', emoji: '🪝', pos: 0, mirror: 'resolution',
    desc: '이야기의 출발점. 주인공의 "변하기 전" 상태를 보여줍니다. 결말(해결)과 정반대 지점이어야 합니다 — 겁쟁이로 시작해 영웅으로 끝나듯, 둘은 거울상입니다.',
    hint: '주인공은 처음에 어떤 상태인가요? (해결과 정반대의 출발점)',
  },
  {
    key: 'pt1', no: 2, title: '플롯 전환 1', en: 'Plot Turn 1', emoji: '🚪', pos: 25,
    desc: '1막에서 2막으로 넘어가는 분기점. 모험에 불을 붙이는 사건이 일어나 주인공을 새로운 세계·갈등으로 밀어 넣습니다. 메인 갈등이 본격적으로 도입됩니다.',
    hint: '이야기를 움직이는 사건은? 주인공은 어떻게 갈등 속으로 들어가나요?',
  },
  {
    key: 'pinch1', no: 3, title: '핀치 1', en: 'Pinch 1', emoji: '😣', pos: 37, mirror: 'pinch2',
    desc: '첫 번째 압박. 적대 세력의 힘을 보여주며 주인공을 몰아붙입니다. 위기·실패·손실이 발생하고, 주인공은 행동하지 않을 수 없게 됩니다.',
    hint: '적은 어떤 압박을 가하나요? 주인공이 겪는 첫 시련·손실은?',
  },
  {
    key: 'midpoint', no: 4, title: '중간점', en: 'Midpoint', emoji: '🔁', pos: 50,
    desc: '이야기의 중심축. 주인공이 ‘반응(reaction)’에서 ‘행동(action)’으로 전환됩니다. 더 이상 끌려다니지 않고 스스로 문제에 맞서기 시작합니다.',
    hint: '주인공은 무엇을 깨닫고/결심하고 능동적으로 맞서기 시작하나요?',
  },
  {
    key: 'pinch2', no: 5, title: '핀치 2', en: 'Pinch 2', emoji: '💥', pos: 62, mirror: 'pinch1',
    desc: '두 번째 압박, 더 강하게. 적이 최고조의 힘을 발휘해 주인공을 절망으로 몰아넣습니다. 계획이 무너지고, 멘토·동료·자원을 잃기도 합니다(가장 큰 바닥).',
    hint: '상황이 최악으로 치닫는 순간은? 주인공은 무엇을 잃나요?',
  },
  {
    key: 'pt2', no: 6, title: '플롯 전환 2', en: 'Plot Turn 2', emoji: '🗝️', pos: 75,
    desc: '결말로 향하는 마지막 열쇠를 얻는 지점. 주인공이 최종 결전에 필요한 깨달음·도구·힘·정보를 손에 넣습니다. 모든 것이 클라이맥스로 수렴합니다.',
    hint: '주인공은 해결에 필요한 무엇(깨달음·도구·힘)을 얻나요?',
  },
  {
    key: 'resolution', no: 7, title: '해결', en: 'Resolution', emoji: '🏁', pos: 100, mirror: 'hook',
    desc: '클라이맥스와 마무리. 중심 갈등이 해소되고 주인공의 변화가 증명됩니다. 훅과 거울상을 이뤄, 처음과 얼마나 달라졌는지가 드러납니다. (이 단계를 가장 먼저 설계하세요!)',
    hint: '갈등은 어떻게 끝나나요? 주인공은 결국 어떤 존재가 되었나요?',
  },
]

const POINT_BY_KEY: Record<string, PointDef> = Object.fromEntries(POINTS.map((p) => [p.key, p]))

// ── 데이터 타입 ──────────────────────────────────────────────────────────────
interface PointState { text: string; done: boolean }
interface Store {
  title: string
  unit: 'page' | 'word' | 'chapter'
  total: string // 총 분량(문자열 보관, 비워둘 수 있음)
  points: Record<string, PointState>
}

const UNIT_LABEL: Record<Store['unit'], string> = { page: '페이지', word: '단어', chapter: '챕터' }
const UNIT_SHORT: Record<Store['unit'], string> = { page: 'p', word: '단어', chapter: '장' }

function emptyPoint(): PointState { return { text: '', done: false } }

function defaultStore(): Store {
  const points: Record<string, PointState> = {}
  for (const p of POINTS) points[p.key] = emptyPoint()
  return { title: '', unit: 'page', total: '', points }
}

// localStorage 로드 — 미지원/차단/손상/구버전 시 기본값으로 graceful 처리.
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      unit: p.unit === 'word' || p.unit === 'chapter' ? p.unit : 'page',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      points: base.points,
    }
    const pp = p.points && typeof p.points === 'object' ? p.points : {}
    for (const pt of POINTS) {
      const v = pp[pt.key]
      if (v && typeof v === 'object') {
        s.points[pt.key] = { text: typeof v.text === 'string' ? v.text : '', done: !!v.done }
      }
    }
    return s
  } catch {
    return base
  }
}

export default function SevenPointStructure({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [showTips, setShowTips] = useState(true)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const mounted = useRef(true)
  const applied = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload 로 들어온 제목 1회 반영(다른 도구에서 연계되어 열릴 때).
  useEffect(() => {
    if (applied.current || !payload) return
    applied.current = true
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    if (t) setStore((s) => (s.title ? s : { ...s, title: t.slice(0, 120) }))
  }, [payload])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────
  const patchPoint = (key: string, patch: Partial<PointState>) =>
    setStore((s) => ({ ...s, points: { ...s.points, [key]: { ...s.points[key], ...patch } } }))
  const setText = (key: string, text: string) => patchPoint(key, { text })
  const toggleDone = (key: string) => patchPoint(key, { done: !store.points[key].done })
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total'>>) =>
    setStore((s) => ({ ...s, ...patch }))

  const flashMsg = (msg: string) => { setFlash(msg); window.setTimeout(() => { if (mounted.current) setFlash('') }, 1700) }

  // ── 총 분량 환산 ─────────────────────────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const totalDigits = store.total.replace(/[^\d.]/g, '')
  const fmtPos = (pos: number): string => {
    if (totalNum > 0) {
      if (pos <= 0) return `시작 (${UNIT_SHORT[store.unit]} 1쯤)`
      const at = Math.max(1, Math.round((pos / 100) * totalNum))
      return `약 ${at}${UNIT_SHORT[store.unit]} (${pos}%)`
    }
    if (pos <= 0) return '맨 처음'
    if (pos >= 100) return '맨 끝'
    return `전체의 약 ${pos}% 지점`
  }

  // ── 진행률 ──────────────────────────────────────────────────────────────────
  const doneCount = POINTS.filter((p) => store.points[p.key].done).length
  const filledCount = POINTS.filter((p) => store.points[p.key].text.trim()).length
  const pct = Math.round((doneCount / POINTS.length) * 100)

  // ── 복사/내보내기 텍스트 ─────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 7포인트 구조${store.title ? ` — ${store.title}` : ''}`)
    if (totalNum > 0) lines.push(`총 분량: ${totalDigits} ${UNIT_LABEL[store.unit]}`)
    lines.push(`진행률: ${doneCount}/${POINTS.length} 완료 (${pct}%)`)
    lines.push('')
    for (const p of POINTS) {
      const st = store.points[p.key]
      lines.push(`${st.done ? '[v]' : '[ ]'} ${p.no}. ${p.title} (${p.en})  〈권장: ${fmtPos(p.pos)}〉`)
      const txt = st.text.trim()
      if (txt) lines.push(txt.split('\n').map((l) => '  ' + l).join('\n'))
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flashMsg('전체를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flashMsg('전체를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'seven-point') + '-structure.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flashMsg('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 7단계 문서로 추가('구조' 폴더) ────────────────────────────
  const escHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push('<p><em>댄 웰스의 7포인트 구조 — 결말(해결)부터 거꾸로 설계합니다.</em></p>')
    for (const p of POINTS) {
      const st = store.points[p.key]
      parts.push(`<h3>${escHtml(`${p.no}. ${p.title} (${p.en})`)}</h3>`)
      parts.push(`<p><em>권장 위치: ${escHtml(fmtPos(p.pos))}</em></p>`)
      const txt = st.text.trim()
      if (txt) { for (const ln of txt.split('\n')) parts.push(`<p>${escHtml(ln) || '&nbsp;'}</p>`) }
      else parts.push('<p>&nbsp;</p>')
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: '7포인트 구조' + (store.title ? ` — ${store.title}` : ''),
      bodyHtml: toBodyHtml(),
      meta: {
        작품: store.title || '(제목 없음)',
        진행률: `${doneCount}/${POINTS.length} (${pct}%)`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashMsg(id ? '프로젝트 자료에 구조 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // 전체 초기화(확인 후) — 파괴적이므로 confirm 게이트.
  const resetAll = () => {
    if (!window.confirm('모든 단계 내용·진행 상태를 지웁니다. 정말 초기화할까요?')) return
    setStore(defaultStore())
    flashMsg('모두 초기화했어요')
  }

  // ── 스타일 ──────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const metaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, padding: '8px 8px', cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const tipBox: React.CSSProperties = { border: '1px dashed var(--accent)', borderRadius: 12, background: 'var(--panel)', padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 6 }
  const tipTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }
  const tipText: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px 6px' }
  const cTitle: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }
  const enTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }
  const posTag: React.CSSProperties = { fontSize: 11.5, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }
  const mirrorTag: React.CSSProperties = { fontSize: 11, color: 'var(--warn)', marginTop: 2, fontWeight: 600 }
  const desc: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, padding: '0 12px 8px', whiteSpace: 'pre-wrap' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px' }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={metaRow}>
          <input
            style={{ ...input, flex: '2 1 180px' }}
            value={store.title}
            onChange={(e) => setMeta({ title: e.target.value })}
            placeholder="작품 제목 (선택)"
            maxLength={120}
            aria-label="작품 제목"
          />
          <input
            style={{ ...input, flex: '1 1 90px', width: 90 }}
            value={store.total}
            onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="총 분량"
            inputMode="decimal"
            aria-label="총 분량"
          />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Store['unit'] })} aria-label="분량 단위">
            <option value="page">페이지</option>
            <option value="word">단어</option>
            <option value="chapter">챕터</option>
          </select>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {POINTS.length} · 작성된 단계 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {/* 역설계 팁: 결말부터 거꾸로 설계하라 */}
        <div style={tipBox}>
          <div style={tipTitle}>
            <span><Emoji e="🔧" /> 역설계 팁 — "결말부터 거꾸로"</span>
            <span style={{ flex: 1 }} />
            <button className="linkbtn" onClick={() => setShowTips((v) => !v)} aria-expanded={showTips}>{showTips ? '접기 ▲' : '펼치기 ▼'}</button>
          </div>
          {showTips && (
            <>
              <p style={tipText}>댄 웰스의 핵심은 <strong style={{ color: 'var(--text)' }}>순서대로 쓰지 않는 것</strong>입니다. 다음 순서로 거꾸로 채워 보세요:</p>
              <p style={tipText}>
                <strong style={{ color: 'var(--text)' }}>① 해결(⑦)</strong>을 먼저 — 이야기가 어디로 끝나는지 정한다.<br />
                <strong style={{ color: 'var(--text)' }}>② 훅(①)</strong> — 해결과 <em>정반대</em> 지점에서 출발하게 한다(거울상).<br />
                <strong style={{ color: 'var(--text)' }}>③ 중간점(④)</strong> — 둘 사이에서 '반응→행동'으로 전환되는 축을 놓는다.<br />
                <strong style={{ color: 'var(--text)' }}>④ 플롯 전환 1·2(②⑥)</strong> — 갈등 진입과 마지막 열쇠를 배치한다.<br />
                <strong style={{ color: 'var(--text)' }}>⑤ 핀치 1·2(③⑤)</strong> — 적의 압박으로 주인공을 앞으로 떠민다.
              </p>
              <p style={tipText}>각 단계 카드의 <strong style={{ color: 'var(--text)' }}>거울상 표시</strong>(훅↔해결, 핀치1↔핀치2)를 참고해 짝이 대비되도록 다듬으세요.</p>
            </>
          )}
        </div>

        {POINTS.map((p) => {
          const st = store.points[p.key]
          const m = p.mirror ? POINT_BY_KEY[p.mirror] : null
          return (
            <div key={p.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => toggleDone(p.key)} aria-label={`${p.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>
                    <span style={{ marginRight: 4 }}><Emoji e={p.emoji} /></span>{p.no}. {p.title} <span style={enTag}>· {p.en}</span>
                  </div>
                  <div style={posTag}>권장 위치: {fmtPos(p.pos)}</div>
                  {m && <div style={mirrorTag}>↔ 거울상: {m.no}. {m.title}</div>}
                </div>
              </div>
              <div style={desc}>{p.desc}</div>
              <div style={section}>
                <textarea
                  style={ta}
                  value={st.text}
                  onChange={(e) => setText(p.key, e.target.value)}
                  placeholder={p.hint}
                  aria-label={`${p.title} 내용`}
                />
              </div>
            </div>
          )
        })}

        <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, padding: '2px 2px 4px' }}>
          구조 이론: Dan Wells, “7 Point Story Structure”(공개 강연·블로그에서 널리 공유된 글쓰기 프레임워크 개념). 본 도구는 개념을 자체 설명·서식으로 재구성한 것입니다.
        </div>
      </div>

      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '7단계 전체를 프로젝트 자료(구조)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={exportFile}>⬇️ .txt 내보내기</button>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{flash}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>전체 초기화</button>
      </div>
    </div>
  )
}
