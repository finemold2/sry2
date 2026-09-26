// 영웅의 여정 지도 — 캠벨/보글러 12단계로 이야기 구조를 설계하는 도구.
// 원형(다이어그램) / 세로(타임라인) 두 보기. 각 단계 클릭해 내용·메모·완료 입력, 진행률 표시, 텍스트 복사·내보내기, localStorage 영속.
// 자급식: react 외 import 없음. 외부 네트워크 불필요(전부 로컬).
// 프로젝트 연동: react/linkbus 만 추가 import(프로젝트 브리지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'hero-journey-map', name: '영웅의 여정 지도', icon: '🗺️', group: '구상·정리', intro: '영웅의 여정 12단계로 이야기 구조를 설계하고 채워보세요', w: 660, h: 620 }

const LS_KEY = 'sry:tool:hero-journey-map'

// 12단계 정의 — 각 단계의 기본 안내 문구는 입력란 placeholder 로 활용.
interface StageDef {
  key: string
  no: number
  title: string
  short: string
  act: 1 | 2 | 3
  emoji: string
  hint: string
}

const STAGES: StageDef[] = [
  { key: 'ordinary', no: 1, title: '일상 세계', short: '일상', act: 1, emoji: '🏡', hint: '주인공이 살아가는 평범한 세계. 결핍·일상의 균형을 보여주세요.' },
  { key: 'call', no: 2, title: '모험의 부름', short: '부름', act: 1, emoji: '📜', hint: '일상을 깨뜨리는 사건·과제·초대가 등장합니다.' },
  { key: 'refusal', no: 3, title: '부름의 거부', short: '거부', act: 1, emoji: '🚪', hint: '두려움·의무 때문에 모험을 망설이거나 거절합니다.' },
  { key: 'mentor', no: 4, title: '조력자와의 만남', short: '조력자', act: 1, emoji: '🧙', hint: '멘토·조력자가 나타나 용기·지혜·도구를 줍니다.' },
  { key: 'threshold', no: 5, title: '첫 관문 통과', short: '문턱', act: 1, emoji: '🌉', hint: '주인공이 결심하고 미지의 세계로 첫발을 내딛습니다.' },
  { key: 'tests', no: 6, title: '시험·동료·적', short: '시련', act: 2, emoji: '⚔️', hint: '새 세계의 규칙을 배우고 시험을 겪으며 동료·적을 만납니다.' },
  { key: 'approach', no: 7, title: '동굴 가장 깊은 곳으로 접근', short: '접근', act: 2, emoji: '🕯️', hint: '가장 위험한 곳을 향해 다가가며 준비·계획·정비를 합니다.' },
  { key: 'ordeal', no: 8, title: '시련의 핵심', short: '핵심', act: 2, emoji: '🔥', hint: '죽음에 가까운 최대 위기. 주인공의 본질이 시험받습니다.' },
  { key: 'reward', no: 9, title: '보상', short: '보상', act: 2, emoji: '🏆', hint: '시련을 이겨내고 보물·지식·화해 등 보상을 얻습니다.' },
  { key: 'road', no: 10, title: '귀환의 길', short: '귀환길', act: 3, emoji: '🛤️', hint: '일상 세계로 돌아가기 시작. 추격·여파가 따라옵니다.' },
  { key: 'resurrection', no: 11, title: '부활', short: '부활', act: 3, emoji: '✨', hint: '마지막 시험. 주인공이 완전히 변모하여 거듭납니다.' },
  { key: 'return', no: 12, title: '영약을 가지고 귀환', short: '귀환', act: 3, emoji: '🌅', hint: '변화한 모습으로 돌아와 세계에 이로움(영약)을 가져옵니다.' },
]

interface StageData { text: string; note: string; done: boolean }
type Store = Record<string, StageData>

const ACT_LABEL: Record<1 | 2 | 3, string> = { 1: '1막 · 출발', 2: '2막 · 입문과 시련', 3: '3막 · 귀환' }
const ACT_COLOR: Record<1 | 2 | 3, string> = { 1: 'var(--accent)', 2: 'var(--warn)', 3: 'var(--ok)' }

function emptyStore(): Store {
  const o: Store = {}
  for (const s of STAGES) o[s.key] = { text: '', note: '', done: false }
  return o
}

// localStorage 읽기 — 미지원/차단/손상 시 빈 구조로 graceful 처리.
function loadStore(): Store {
  const base = emptyStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    for (const s of STAGES) {
      const v = parsed[s.key]
      if (v && typeof v === 'object') {
        base[s.key] = {
          text: typeof v.text === 'string' ? v.text : '',
          note: typeof v.note === 'string' ? v.note : '',
          done: !!v.done,
        }
      }
    }
    return base
  } catch {
    return base
  }
}

type View = 'circle' | 'list'

export default function HeroJourneyMap() {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [view, setView] = useState<View>('circle')
  const [active, setActive] = useState<string | null>(null) // 편집 중인 단계 key
  const [note, setNote] = useState('') // 저장/복사 안내 메시지
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.', true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  // 편집 패널이 열리면 텍스트 영역에 포커스.
  useEffect(() => {
    if (active && editRef.current) {
      try { editRef.current.focus() } catch {}
    }
  }, [active])

  const flash = (msg: string, warn = false) => {
    if (!mounted.current) return
    setNote((warn ? '⚠️ ' : '') + msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const setField = (key: string, field: keyof StageData, value: string | boolean) => {
    setStore((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  const toggleDone = (key: string) => {
    setStore((prev) => ({ ...prev, [key]: { ...prev[key], done: !prev[key].done } }))
  }

  const clearStage = (key: string) => {
    setStore((prev) => ({ ...prev, [key]: { text: '', note: '', done: false } }))
  }

  const resetAll = () => {
    if (filled === 0 && doneCount === 0) return
    if (typeof window !== 'undefined' && !window.confirm('모든 단계의 내용을 비웁니다. 계속할까요?')) return
    setStore(emptyStore())
    setActive(null)
    flash('모든 단계를 비웠습니다.')
  }

  const filled = STAGES.filter((s) => store[s.key].text.trim()).length
  const doneCount = STAGES.filter((s) => store[s.key].done).length
  const pct = Math.round((filled / STAGES.length) * 100)

  // 텍스트 내보내기 형식 생성.
  const buildText = () => {
    const lines: string[] = ['# 영웅의 여정 지도', `진행: ${filled}/${STAGES.length} 단계 채움 · 완료 ${doneCount}개`, '']
    let lastAct: 1 | 2 | 3 | 0 = 0
    for (const s of STAGES) {
      if (s.act !== lastAct) { lines.push(`## ${ACT_LABEL[s.act]}`); lastAct = s.act }
      const d = store[s.key]
      const mark = d.done ? '✅' : '⬜'
      lines.push(`${mark} ${s.no}. ${s.title}`)
      lines.push(`   - 내용: ${d.text.trim() || '(미작성)'}`)
      if (d.note.trim()) lines.push(`   - 메모: ${d.note.trim()}`)
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        flash('전체 내용을 클립보드에 복사했어요.')
        return
      }
    } catch {}
    // 폴백: 임시 textarea + execCommand.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      flash(ok ? '전체 내용을 복사했어요.' : '복사에 실패했어요. 직접 선택해 복사하세요.', !ok)
    } catch {
      flash('복사에 실패했어요. 직접 선택해 복사하세요.', true)
    }
  }

  const downloadTxt = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hero-journey.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      flash('텍스트 파일을 내려받았어요.')
    } catch {
      flash('내보내기에 실패했어요.', true)
    }
  }

  // HTML 이스케이프 — bodyHtml 본문에 사용자 입력을 안전하게 넣기 위함.
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escMl = (s: string) => esc(s).replace(/\n/g, '<br/>')

  // 12단계 제목 + 입력 단락을 HTML 본문으로 — 막별 소제목 포함, 빈 단계도 안내 문구로 표시.
  const buildHtml = () => {
    const parts: string[] = [`<p><strong>영웅의 여정 12단계</strong> · 채운 단계 ${filled}/${STAGES.length} · 완료 ${doneCount}개</p>`]
    let lastAct: 1 | 2 | 3 | 0 = 0
    for (const s of STAGES) {
      if (s.act !== lastAct) { parts.push(`<h2>${esc(ACT_LABEL[s.act])}</h2>`); lastAct = s.act }
      const d = store[s.key]
      const mark = d.done ? '✅ ' : ''
      parts.push(`<h3>${mark}${s.no}. ${esc(s.title)}</h3>`)
      const txt = d.text.trim()
      parts.push(`<p>${txt ? escMl(txt) : '<em>(미작성)</em>'}</p>`)
      if (d.note.trim()) parts.push(`<p>📝 ${escMl(d.note.trim())}</p>`)
    }
    return parts.join('')
  }

  // 프로젝트(자료 › 구조 폴더)에 "영웅의 여정" 문서로 추가.
  const toProject = () => {
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: '영웅의 여정',
      bodyHtml: buildHtml(),
      meta: { 채운단계: `${filled}/${STAGES.length}`, 완료: String(doneCount) },
    })
    flash(id ? '프로젝트 자료(구조)에 여정 문서를 추가했어요.' : '프로젝트에 연결되지 않았습니다.', !id)
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px', flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginRight: 'auto' }
  const segWrap: React.CSSProperties = { display: 'flex', gap: 4, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }
  const progressBar: React.CSSProperties = { height: 8, borderRadius: 99, background: 'var(--chrome-2)', overflow: 'hidden', border: '1px solid var(--border)' }
  const progressFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--ok))', transition: 'width .25s ease' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 14px' }
  const metaRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', padding: '0 14px 8px', gap: 10 }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }

  const activeDef = active ? STAGES.find((s) => s.key === active) || null : null

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={title}><Emoji e="🗺️" /> 영웅의 여정</div>
        <div style={segWrap}>
          <button className={'minibtn' + (view === 'circle' ? ' active' : '')} style={view === 'circle' ? activeSeg : {}} onClick={() => setView('circle')}>◎ 원형</button>
          <button className={'minibtn' + (view === 'list' ? ' active' : '')} style={view === 'list' ? activeSeg : {}} onClick={() => setView('list')}>☰ 세로</button>
        </div>
      </div>

      <div style={metaRow}>
        <span>채운 단계 <strong style={{ color: 'var(--text)' }}>{filled}</strong>/{STAGES.length} · 완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong></span>
        <span>{pct}%</span>
      </div>
      <div style={{ padding: '0 14px 6px' }}>
        <div style={progressBar}><div style={progressFill} /></div>
      </div>

      {note && (
        <div style={{ margin: '4px 14px 0', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, background: 'var(--chrome-2)', border: '1px solid var(--border)', color: note.startsWith('⚠️') ? 'var(--warn)' : 'var(--ok)' }}>{note}</div>
      )}

      <div style={body}>
        {view === 'circle'
          ? <CircleView store={store} active={active} onPick={setActive} />
          : <ListView store={store} active={active} onPick={setActive} onToggle={toggleDone} />}
      </div>

      {/* 편집 패널 */}
      {activeDef && (
        <Editor
          def={activeDef}
          data={store[activeDef.key]}
          editRef={editRef}
          onText={(v) => setField(activeDef.key, 'text', v)}
          onNote={(v) => setField(activeDef.key, 'note', v)}
          onToggle={() => toggleDone(activeDef.key)}
          onClear={() => clearStage(activeDef.key)}
          onClose={() => setActive(null)}
          onPrev={() => setActive(STAGES[(activeDef.no - 2 + STAGES.length) % STAGES.length].key)}
          onNext={() => setActive(STAGES[activeDef.no % STAGES.length].key)}
        />
      )}

      <div style={footer}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋" /> 전체 복사</button>
        <button className="minibtn" onClick={downloadTxt}><Emoji e="⬇️" /> 내보내기(.txt)</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '자료 › 구조 폴더에 여정 문서로 추가' : '프로젝트에 연결되지 않았습니다'}
        ><Emoji e="📄" /> 프로젝트에 여정 문서 추가</button>
        <button className="minibtn" style={{ marginLeft: 'auto', color: 'var(--warn)' }} onClick={resetAll} disabled={filled === 0 && doneCount === 0}><Emoji e="🗑️" /> 전체 비우기</button>
      </div>
    </div>
  )
}

const activeSeg: React.CSSProperties = { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }

// ---------------- 원형 다이어그램 보기 ----------------
function CircleView({ store, active, onPick }: { store: Store; active: string | null; onPick: (k: string) => void }) {
  const size = 360
  const cx = size / 2
  const cy = size / 2
  const rNode = 150 // 노드 중심이 놓이는 반지름
  const node = 32 // 노드 반지름

  // 위(12시)에서 시작해 시계방향으로 12등분.
  const pos = (i: number) => {
    const ang = (-90 + i * 30) * (Math.PI / 180)
    return { x: cx + rNode * Math.cos(ang), y: cy + rNode * Math.sin(ang) }
  }

  const filled = STAGES.filter((s) => store[s.key].text.trim()).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', display: 'block' }} role="group" aria-label="영웅의 여정 원형 다이어그램">
        {/* 막 구분 호(배경) */}
        <circle cx={cx} cy={cy} r={rNode} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="3 5" />
        {/* 단계 사이 진행 화살표(곡선 호) */}
        {STAGES.map((s, i) => {
          const a = pos(i)
          const b = pos((i + 1) % STAGES.length)
          // 노드 가장자리로 약간 당겨 화살표가 노드에 닿지 않게.
          const dx = b.x - a.x, dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          const ux = dx / len, uy = dy / len
          const ax = a.x + ux * (node + 3), ay = a.y + uy * (node + 3)
          const bx = b.x - ux * (node + 8), by = b.y - uy * (node + 8)
          return <line key={'l' + s.key} x1={ax} y1={ay} x2={bx} y2={by} stroke="var(--muted)" strokeWidth={1.4} opacity={0.5} markerEnd="url(#hjm-arrow)" />
        })}
        <defs>
          <marker id="hjm-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)" />
          </marker>
        </defs>

        {/* 중심 진행 표시 */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={13} fill="var(--muted)">여정 진행</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text)">{filled}/12</text>

        {/* 단계 노드 */}
        {STAGES.map((s, i) => {
          const p = pos(i)
          const d = store[s.key]
          const isActive = active === s.key
          const hasText = !!d.text.trim()
          const fill = d.done ? 'var(--ok)' : hasText ? 'var(--accent)' : 'var(--paper)'
          const stroke = isActive ? 'var(--text)' : ACT_COLOR[s.act]
          const fg = (d.done || hasText) ? '#fff' : 'var(--text)'
          return (
            <g key={s.key} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }} onClick={() => onPick(s.key)} role="button" aria-label={`${s.no}. ${s.title}`}>
              <circle r={node} fill={fill} stroke={stroke} strokeWidth={isActive ? 3.5 : 2} />
              <text y={-3} textAnchor="middle" fontSize={16}>{s.emoji}</text>
              <text y={14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={fg}>{s.no}.{s.short}</text>
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span><span style={{ ...dot, background: 'var(--paper)', border: '1px solid var(--border)' }} />미작성</span>
        <span><span style={{ ...dot, background: 'var(--accent)' }} />작성됨</span>
        <span><span style={{ ...dot, background: 'var(--ok)' }} />완료</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>단계를 눌러 내용을 채워보세요.</div>
    </div>
  )
}

const dot: React.CSSProperties = { display: 'inline-block', width: 10, height: 10, borderRadius: 99, marginRight: 5, verticalAlign: 'middle' }

// ---------------- 세로 타임라인 보기 ----------------
function ListView({ store, active, onPick, onToggle }: { store: Store; active: string | null; onPick: (k: string) => void; onToggle: (k: string) => void }) {
  let lastAct: 1 | 2 | 3 | 0 = 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {STAGES.map((s) => {
        const d = store[s.key]
        const hasText = !!d.text.trim()
        const isActive = active === s.key
        const header = s.act !== lastAct
        lastAct = s.act
        return (
          <div key={s.key}>
            {header && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: ACT_COLOR[s.act] }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: ACT_COLOR[s.act], display: 'inline-block' }} />
                {ACT_LABEL[s.act]}
              </div>
            )}
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 11,
                background: isActive ? 'var(--chrome-2)' : 'var(--panel)',
                border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                cursor: 'pointer', borderLeft: `4px solid ${d.done ? 'var(--ok)' : hasText ? 'var(--accent)' : 'var(--border)'}`,
              }}
              onClick={() => onPick(s.key)}
            >
              <input
                type="checkbox"
                checked={d.done}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle(s.key)}
                style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: 'var(--ok)' }}
                aria-label={`${s.title} 완료`}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span><Emoji e={s.emoji} /></span><span style={{ color: 'var(--muted)' }}>{s.no}.</span> {s.title}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5, color: hasText ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {hasText ? d.text : '(눌러서 내용 작성)'}
                </div>
                {d.note.trim() && (
                  <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Emoji e="📝" /> {d.note}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- 편집 패널 ----------------
function Editor({
  def, data, editRef, onText, onNote, onToggle, onClear, onClose, onPrev, onNext,
}: {
  def: StageDef
  data: StageData
  editRef: React.RefObject<HTMLTextAreaElement>
  onText: (v: string) => void
  onNote: (v: string) => void
  onToggle: () => void
  onClear: () => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const panel: React.CSSProperties = {
    borderTop: '1px solid var(--border)', background: 'var(--panel)', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 9, maxHeight: '52%', overflowY: 'auto', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const ta: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px', fontSize: 13.5, lineHeight: 1.55,
    borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)',
    resize: 'vertical', fontFamily: 'inherit',
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}><Emoji e={def.emoji} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: ACT_COLOR[def.act] }}>{def.no}.</span> {def.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ACT_LABEL[def.act]}</div>
        </div>
        <button className="minibtn" onClick={onPrev} title="이전 단계" aria-label="이전 단계">←</button>
        <button className="minibtn" onClick={onNext} title="다음 단계" aria-label="다음 단계">→</button>
        <button className="minibtn" onClick={onClose} title="닫기" aria-label="닫기">✕</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, padding: '6px 9px', background: 'var(--chrome-2)', borderRadius: 8 }}><Emoji e="💡" /> {def.hint}</div>

      <div>
        <div style={fieldLabel}>이 단계의 내용</div>
        <textarea
          ref={editRef}
          style={{ ...ta, marginTop: 4, minHeight: 70 }}
          value={data.text}
          onChange={(e) => onText(e.target.value)}
          placeholder="이 단계에서 일어나는 일을 적어보세요…"
        />
      </div>

      <div>
        <div style={fieldLabel}>메모(선택)</div>
        <textarea
          style={{ ...ta, marginTop: 4, minHeight: 42 }}
          value={data.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="복선·인물·소품 등 메모…"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={data.done} onChange={onToggle} style={{ width: 16, height: 16, accentColor: 'var(--ok)', cursor: 'pointer' }} />
          이 단계 완료
        </label>
        <button
          className="minibtn"
          style={{ marginLeft: 'auto', color: 'var(--warn)' }}
          onClick={onClear}
          disabled={!data.text.trim() && !data.note.trim() && !data.done}
          title="이 단계 내용 비우기"
        >단계 비우기</button>
      </div>
    </div>
  )
}
