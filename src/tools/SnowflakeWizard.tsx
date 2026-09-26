// 스노우플레이크 방법 마법사 — 랜디 잉거먼슨의 10단계 소설 설계법을 단계별 안내문+입력칸으로 구현.
// 큰 단계(한 문장→문단→인물별 시놉시스→…)는 단일 텍스트칸, 인물/장면 단계는 행 단위 CRUD(추가/수정/삭제/순서).
// 이전·다음 내비, 단계별·전체 진행률 막대, 전체 결과 종합 텍스트 복사/내보내기. 모든 입력은 localStorage 자동 저장/복원.
// 규칙 준수: react 외 import 없음 / 외부 네트워크 없음 / 언마운트 시 타이머·이벤트 리스너 정리 / 빈 상태 안내 / 파괴적 삭제 명확화.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'snowflake-wizard', name: '스노우플레이크 마법사', icon: '❄️', group: '구상·정리', intro: '눈송이 방법 10단계로 소설을 한 문장에서 설계도까지 키워 보세요', w: 640, h: 600 }

const NS = 'sry:tool:snowflake-wizard'

// ── 단계 정의 ──────────────────────────────────────────────────────────────
// kind: 'text' = 단일 자유서술칸 / 'list' = 행 단위 CRUD(인물·장면 목록)
type StepKind = 'text' | 'list'
interface StepDef {
  key: string
  no: number
  title: string
  goal: string          // 이 단계의 목표(한 줄)
  guide: string[]        // 안내문 (불릿)
  kind: StepKind
  placeholder?: string   // text 칸 플레이스홀더
  fields?: { key: string; label: string; multiline?: boolean; ph?: string }[] // list 항목 필드
  tip?: string           // 분량/체크 힌트
}

const STEPS: StepDef[] = [
  {
    key: 'logline', no: 1, title: '한 문장 요약', kind: 'text',
    goal: '소설 전체를 한 문장(약 15단어 이내)으로 압축한다.',
    guide: [
      '주인공의 이름은 빼고 "직업/역할"로 표현하세요. (예: 한 물리학자가…)',
      '큰 그림만. 등장인물은 1~2명, 결말은 흐릿하게 암시만.',
      '잡지에 실릴 한 줄 카피를 쓴다는 느낌으로.',
    ],
    placeholder: '예) 시간 여행을 발명한 물리학자가, 과거를 바꿔 죽은 딸을 살리려다 더 큰 비극과 마주한다.',
    tip: '권장: 1문장 · 15단어 안팎',
  },
  {
    key: 'paragraph', no: 2, title: '한 문단으로 확장', kind: 'text',
    goal: '1단계의 한 문장을 5개 문장의 한 문단으로 늘린다.',
    guide: [
      '문장 1: 배경/설정과 발단.',
      '문장 2~4: 세 번의 재난(전개의 큰 전환점) — 1막 끝, 2막 중간, 2막 끝.',
      '문장 5: 결말.',
      '재난들이 점점 더 커지도록 배치하세요.',
    ],
    placeholder: '다섯 문장으로: ① 발단 ② 첫 번째 재난 ③ 두 번째 재난 ④ 세 번째 재난 ⑤ 결말',
    tip: '권장: 5문장(발단 + 재난3 + 결말)',
  },
  {
    key: 'characters', no: 3, title: '인물별 시놉시스', kind: 'list',
    goal: '주요 인물마다 한 페이지짜리 요약 정보를 만든다.',
    guide: [
      '주인공·적대자·핵심 조연을 각각 한 항목으로 추가하세요.',
      '각 인물의 "목표/동기/갈등/깨달음(성장)"을 한 문장씩 채웁니다.',
      '동기는 추상적으로, 목표는 구체적으로 쓰면 좋습니다.',
    ],
    fields: [
      { key: 'name', label: '이름/역할', ph: '예) 서연 (주인공, 물리학자)' },
      { key: 'goal', label: '목표(원하는 것)', ph: '구체적으로: 딸을 되살린다' },
      { key: 'motive', label: '동기(왜)', ph: '추상적으로: 상실을 받아들이지 못함' },
      { key: 'conflict', label: '갈등(막는 것)', multiline: true, ph: '목표를 가로막는 장애·대립' },
      { key: 'epiphany', label: '깨달음/변화', multiline: true, ph: '인물이 마지막에 얻는 것' },
    ],
    tip: '주연·적대자·핵심 조연을 빠짐없이',
  },
  {
    key: 'page', no: 4, title: '한 페이지 줄거리', kind: 'text',
    goal: '2단계의 다섯 문장을 각각 한 문단으로 키워 한 페이지로 만든다.',
    guide: [
      '문단 1~3·5: 보통 문단으로 끝.',
      '문단 4(세 번째 재난): 절정으로 가는 흐름이라 살짝 더 길게.',
      '각 문단은 앞 문단의 재난이 다음 재난으로 이어지는 인과를 담습니다.',
    ],
    placeholder: '다섯 문단으로 한 페이지 분량의 줄거리를 작성하세요. (문단당 빈 줄로 구분)',
    tip: '권장: 약 1페이지 · 5문단',
  },
  {
    key: 'charsynopsis', no: 5, title: '인물별 한 페이지 서사', kind: 'list',
    goal: '주요 인물의 시점에서 이야기 전체를 한 페이지(반 페이지~1페이지)로 서술한다.',
    guide: [
      '3단계 인물마다 "그 인물의 관점에서" 본 줄거리를 적습니다.',
      '주인공·적대자는 한 페이지, 조연은 반 페이지 정도가 적당합니다.',
      '여기서 플롯 구멍이 보이면 이전 단계로 돌아가 고치세요.',
    ],
    fields: [
      { key: 'name', label: '인물', ph: '예) 서연 시점' },
      { key: 'story', label: '그 인물 관점의 이야기', multiline: true, ph: '이 인물이 겪는 사건의 흐름을 처음→끝으로…' },
    ],
    tip: '주연·적대자는 길게, 조연은 짧게',
  },
  {
    key: 'fourpage', no: 6, title: '네 페이지 줄거리', kind: 'text',
    goal: '4단계의 각 문단을 다시 한 페이지씩으로 확장한다(총 4~5페이지).',
    guide: [
      '각 문단을 한 페이지 분량으로 풀어 씁니다.',
      '이쯤이면 이야기의 논리·인과가 탄탄해져야 합니다.',
      '장면 단위가 보이기 시작하면 메모해 두세요(7단계로 이어집니다).',
    ],
    placeholder: '4단계의 다섯 문단을 각각 한 페이지로 확장해 적으세요. 빈 줄로 문단을 구분하세요.',
    tip: '권장: 약 4~5페이지',
  },
  {
    key: 'charsheet', no: 7, title: '인물 상세 차트', kind: 'list',
    goal: '인물 시놉시스를 인물 사전(캐릭터 시트)으로 확장한다.',
    guide: [
      '이름·생년/나이·외모·직업·성격·말투·비밀 등 세부를 채웁니다.',
      '이야기가 진행되며 인물이 어떻게 변하는지도 적으세요.',
      '이 단계 이후엔 이전 단계의 모순이 다 드러나 정리됩니다.',
    ],
    fields: [
      { key: 'name', label: '이름', ph: '인물 이름' },
      { key: 'profile', label: '기본 정보', multiline: true, ph: '나이·외모·직업·출신 등' },
      { key: 'trait', label: '성격·말투·습관', multiline: true, ph: '겉모습 뒤의 진짜 성격' },
      { key: 'secret', label: '비밀·약점', multiline: true, ph: '숨기고 싶은 것, 결함' },
      { key: 'arc', label: '변화의 곡선', multiline: true, ph: '이야기 동안 어떻게 달라지는가' },
    ],
    tip: '주요 인물 전원',
  },
  {
    key: 'scenes', no: 8, title: '장면 목록', kind: 'list',
    goal: '6단계의 줄거리를 바탕으로 모든 장면을 표(리스트)로 만든다.',
    guide: [
      '한 장면 = 한 항목. 시점 인물(POV)과 장면에서 일어나는 일을 적습니다.',
      '드래그(▲▼)로 장면 순서를 자유롭게 바꿔 보세요.',
      '장면 수가 곧 챕터/분량의 윤곽이 됩니다.',
    ],
    fields: [
      { key: 'pov', label: '시점 인물(POV)', ph: '이 장면의 화자/시점' },
      { key: 'summary', label: '장면 요약', multiline: true, ph: '이 장면에서 무슨 일이 벌어지는가' },
    ],
    tip: '장면 하나당 한 항목 · ▲▼로 순서 조정',
  },
  {
    key: 'sceneexp', no: 9, title: '장면별 서술 확장(선택)', kind: 'text',
    goal: '각 장면을 몇 문장의 서술 단락으로 부풀린다(원하면 생략 가능).',
    guide: [
      '8단계 장면 목록을 보며 장면마다 몇 문장씩 풀어 씁니다.',
      '대화의 분기점·갈등·전환을 메모하면 집필 속도가 빨라집니다.',
      '랜디는 이 단계를 점점 생략하게 됐다고 합니다 — 부담 없이 선택하세요.',
    ],
    placeholder: '장면별로 몇 문장씩 서술을 덧붙이세요. (선택 단계 — 비워 두어도 됩니다)',
    tip: '선택 단계 · 비워도 됨',
  },
  {
    key: 'draft', no: 10, title: '초고 집필 시작', kind: 'text',
    goal: '지금까지의 설계도를 들고 첫 문장을 쓴다.',
    guide: [
      '여기까지 왔다면 줄거리·인물·장면 설계가 끝난 상태입니다.',
      '아래 칸은 초고의 도입부를 적어 보거나, 집필 다짐/메모를 남기는 공간입니다.',
      '막히면 언제든 이전 단계로 돌아가 설계도를 다듬으세요.',
    ],
    placeholder: '첫 장면의 첫 문장, 혹은 집필 계획/다짐을 적어 보세요…',
    tip: '이제 진짜 글쓰기로!',
  },
]

// list 단계의 항목 타입
interface ListItem {
  id: string
  [field: string]: string
}

// 저장되는 전체 상태
interface SnowState {
  step: number                        // 현재 단계 인덱스(0-based)
  text: Record<string, string>        // text 단계의 본문 (key -> 내용)
  list: Record<string, ListItem[]>    // list 단계의 항목들 (key -> 배열)
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* graceful */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyState(): SnowState {
  return { step: 0, text: {}, list: {} }
}

// 프로젝트 본문(HTML) 생성 시 필수 escape (&, <, >)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// localStorage 복원 — 미지원/손상 시 빈 상태로 graceful.
function loadState(): SnowState {
  try {
    const raw = localStorage.getItem(NS)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const step = Number.isFinite(p.step) ? Math.min(Math.max(0, p.step | 0), STEPS.length - 1) : 0
    const text: Record<string, string> = {}
    if (p.text && typeof p.text === 'object') {
      for (const k of Object.keys(p.text)) if (typeof p.text[k] === 'string') text[k] = p.text[k]
    }
    const list: Record<string, ListItem[]> = {}
    if (p.list && typeof p.list === 'object') {
      for (const k of Object.keys(p.list)) {
        const arr = p.list[k]
        if (Array.isArray(arr)) {
          list[k] = arr
            .filter((x) => x && typeof x === 'object')
            .map((x) => {
              const item: ListItem = { id: String(x.id || newId()) }
              for (const f of Object.keys(x)) if (f !== 'id' && typeof x[f] === 'string') item[f] = x[f]
              return item
            })
        }
      }
    }
    return { step, text, list }
  } catch {
    return emptyState()
  }
}

export default function SnowflakeWizard() {
  const [state, setState] = useState<SnowState>(loadState)
  const [note, setNote] = useState('')             // 저장 차단 등 안내
  const [copied, setCopied] = useState(false)       // 복사 피드백
  const [showResult, setShowResult] = useState(false) // 종합 결과 패널 토글

  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(NS, JSON.stringify(state))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 입력이 사라질 수 있어요.')
    }
  }, [state])

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NS) {
        try { setState(loadState()) } catch { /* graceful */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 복사 타이머 정리
  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  const stepIdx = state.step
  const def = STEPS[stepIdx]

  // ── 단계 이동 ──
  const goto = (i: number) => {
    const next = Math.min(Math.max(0, i), STEPS.length - 1)
    setState((s) => ({ ...s, step: next }))
    setShowResult(false)
  }
  const prev = () => goto(stepIdx - 1)
  const next = () => goto(stepIdx + 1)

  // ── text 단계 편집 ──
  const setText = (key: string, v: string) => {
    setState((s) => ({ ...s, text: { ...s.text, [key]: v } }))
  }

  // ── list 단계 CRUD ──
  const listOf = (key: string): ListItem[] => state.list[key] || []

  const addItem = (key: string) => {
    setState((s) => {
      const arr = s.list[key] || []
      return { ...s, list: { ...s.list, [key]: [...arr, { id: newId() }] } }
    })
  }
  const updateItem = (key: string, id: string, field: string, v: string) => {
    setState((s) => {
      const arr = s.list[key] || []
      return { ...s, list: { ...s.list, [key]: arr.map((it) => (it.id === id ? { ...it, [field]: v } : it)) } }
    })
  }
  const removeItem = (key: string, id: string) => {
    setState((s) => {
      const arr = s.list[key] || []
      return { ...s, list: { ...s.list, [key]: arr.filter((it) => it.id !== id) } }
    })
  }
  const moveItem = (key: string, id: string, dir: -1 | 1) => {
    setState((s) => {
      const arr = [...(s.list[key] || [])]
      const idx = arr.findIndex((it) => it.id === id)
      if (idx < 0) return s
      const ni = idx + dir
      if (ni < 0 || ni >= arr.length) return s
      const tmp = arr[idx]; arr[idx] = arr[ni]; arr[ni] = tmp
      return { ...s, list: { ...s.list, [key]: arr } }
    })
  }

  // ── 진행률 계산 ──
  // 한 단계의 "채움" 여부: text는 내용 존재, list는 항목 1개 이상 + 첫 필드라도 채워짐.
  const isStepFilled = (d: StepDef): boolean => {
    if (d.kind === 'text') return !!(state.text[d.key] && state.text[d.key].trim())
    const arr = state.list[d.key] || []
    if (arr.length === 0) return false
    return arr.some((it) => Object.keys(it).some((f) => f !== 'id' && it[f] && it[f].trim()))
  }
  const filledCount = STEPS.filter(isStepFilled).length
  const overallPct = Math.round((filledCount / STEPS.length) * 100)
  const stepPct = Math.round(((stepIdx + 1) / STEPS.length) * 100)

  // ── 종합 결과 텍스트 ──
  const buildResult = (): string => {
    const lines: string[] = []
    lines.push('스노우플레이크 방법 설계도')
    lines.push('='.repeat(40))
    lines.push('')
    for (const d of STEPS) {
      lines.push(`■ ${d.no}단계. ${d.title}`)
      lines.push(`  (${d.goal})`)
      if (d.kind === 'text') {
        const v = (state.text[d.key] || '').trim()
        lines.push(v ? indent(v) : '  — (미작성)')
      } else {
        const arr = state.list[d.key] || []
        if (arr.length === 0) {
          lines.push('  — (항목 없음)')
        } else {
          arr.forEach((it, i) => {
            lines.push(`  · 항목 ${i + 1}`)
            for (const f of d.fields || []) {
              const v = (it[f.key] || '').trim()
              if (v) lines.push(`    - ${f.label}: ${v.replace(/\n+/g, ' ')}`)
            }
          })
        }
      }
      lines.push('')
    }
    lines.push('='.repeat(40))
    lines.push(`완료 ${filledCount}/${STEPS.length}단계 (${overallPct}%)`)
    return lines.join('\n')
  }
  const indent = (s: string) => s.split('\n').map((l) => '  ' + l).join('\n')

  // ── 종합 결과(HTML) — 프로젝트 문서 본문용. 모든 사용자 입력은 esc() 처리 ──
  const buildResultHtml = (): string => {
    const out: string[] = []
    const para = (txt: string) =>
      esc(txt).split(/\n{2,}/).map((blk) => `<p>${blk.replace(/\n/g, '<br>')}</p>`).join('')
    for (const d of STEPS) {
      out.push(`<h2>${d.no}단계. ${esc(d.title)}</h2>`)
      out.push(`<p><em>${esc(d.goal)}</em></p>`)
      if (d.kind === 'text') {
        const v = (state.text[d.key] || '').trim()
        out.push(v ? para(v) : '<p>— (미작성)</p>')
      } else {
        const arr = state.list[d.key] || []
        if (arr.length === 0) {
          out.push('<p>— (항목 없음)</p>')
        } else {
          arr.forEach((it, i) => {
            out.push(`<p><strong>항목 ${i + 1}</strong></p>`)
            const rows = (d.fields || [])
              .map((f) => ({ label: f.label, v: (it[f.key] || '').trim() }))
              .filter((r) => r.v)
            if (rows.length) {
              out.push('<ul>' + rows.map((r) => `<li><strong>${esc(r.label)}:</strong> ${esc(r.v).replace(/\n/g, '<br>')}</li>`).join('') + '</ul>')
            }
          })
        }
      }
    }
    out.push(`<p><em>완료 ${filledCount}/${STEPS.length}단계 (${overallPct}%)</em></p>`)
    return out.join('\n')
  }

  // ── 프로젝트 연동: 종합 설계도를 자료('구상' 폴더)에 텍스트 문서로 추가 ──
  const addResultToProject = () => {
    if (filledCount === 0) { setNote('아직 작성된 단계가 없어 추가할 내용이 없어요.'); return }
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구상',
      title: '스노우플레이크 설계도',
      bodyHtml: buildResultHtml(),
      meta: { 완료단계: `${filledCount}/${STEPS.length}`, 진행률: `${overallPct}%` },
    })
    setNote(id ? '✓ 프로젝트 자료 "구상" 폴더에 설계도 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  const copyResult = async () => {
    const txt = buildResult()
    let ok = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt)
        ok = true
      }
    } catch { /* fallback below */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = txt
        ta.style.position = 'fixed'; ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }
    if (!mounted.current) return
    if (ok) {
      setCopied(true)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false); copyTimer.current = null }, 1600)
    } else {
      setNote('복사가 차단되었어요. 아래 결과 영역의 텍스트를 직접 선택해 복사하세요.')
      setShowResult(true)
    }
  }

  const resetCurrent = () => {
    if (def.kind === 'text') {
      setText(def.key, '')
    } else {
      setState((s) => ({ ...s, list: { ...s.list, [def.key]: [] } }))
    }
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const header: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 8 }
  const topRow: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }
  const stepLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)' }
  const stepTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800 }
  const track: React.CSSProperties = { height: 8, background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }
  const fill = (pct: number, color: string): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: color, transition: 'width .25s ease' })
  const progRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }

  // 단계 점프 도트
  const dots: React.CSSProperties = { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }
  const dot = (i: number): React.CSSProperties => {
    const active = i === stepIdx
    const done = isStepFilled(STEPS[i])
    return {
      width: 24, height: 24, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
      border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
      background: active ? 'color-mix(in srgb, var(--accent) 22%, var(--panel))' : done ? 'color-mix(in srgb, var(--ok) 22%, var(--panel))' : 'var(--panel)',
      color: done && !active ? 'var(--ok)' : 'var(--text)',
    }
  }

  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const goalBox: React.CSSProperties = { background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1.5 }
  const guideBox: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const guideList: React.CSSProperties = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, lineHeight: 1.55, color: 'var(--muted)' }
  const tipChip: React.CSSProperties = { display: 'inline-block', fontSize: 11, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px', background: 'var(--paper)' }

  const ta: React.CSSProperties = { width: '100%', minHeight: 180, resize: 'vertical', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 15, lineHeight: 1.7, fontFamily: 'inherit', outline: 'none' }

  const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }
  const cardNo: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginRight: 'auto' }
  const fieldLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginBottom: 3 }
  const fieldInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const fieldArea: React.CSSProperties = { ...fieldInput, minHeight: 56, resize: 'vertical', lineHeight: 1.6 }

  const emptyBox: React.CSSProperties = { border: '1px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }

  const footer: React.CSSProperties = { borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const resultArea: React.CSSProperties = { width: '100%', minHeight: 160, maxHeight: 260, boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', resize: 'vertical', outline: 'none', whiteSpace: 'pre' }

  return (
    <div style={wrap}>
      {/* 헤더: 단계 제목·진행률·단계 점프 */}
      <div style={header}>
        <div style={topRow}>
          <span style={stepLabel}>{def.no} / {STEPS.length} 단계</span>
          <span style={stepTitle}>{def.title}</span>
          {def.tip && <span style={{ ...tipChip, marginLeft: 'auto' }}>{def.tip}</span>}
        </div>
        <div style={progRow}>
          <span style={{ width: 56 }}>단계 {stepPct}%</span>
          <div style={{ ...track, flex: 1 }}><div style={fill(stepPct, 'var(--accent)')} /></div>
        </div>
        <div style={progRow}>
          <span style={{ width: 56 }}>작성 {overallPct}%</span>
          <div style={{ ...track, flex: 1 }}><div style={fill(overallPct, 'var(--ok)')} /></div>
          <span>{filledCount}/{STEPS.length}</span>
        </div>
        <div style={dots}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={dot(i)} onClick={() => goto(i)} title={`${s.no}단계 · ${s.title}${isStepFilled(s) ? ' (작성됨)' : ''}`} role="button" aria-label={`${s.no}단계 ${s.title}로 이동`}>
              {isStepFilled(s) && i !== stepIdx ? '✓' : s.no}
            </div>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <div style={body}>
        {note && <div style={{ ...hint, color: 'var(--warn)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--panel)' }}>{note}</div>}

        <div style={goalBox}><Emoji e="🎯" /> {def.goal}</div>

        <div style={guideBox}>
          <ul style={guideList}>
            {def.guide.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>

        {/* 입력 영역 */}
        {def.kind === 'text' ? (
          <textarea
            style={ta}
            value={state.text[def.key] || ''}
            onChange={(e) => setText(def.key, e.target.value)}
            placeholder={def.placeholder}
            spellCheck={false}
            aria-label={`${def.title} 입력`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-primary" onClick={() => addItem(def.key)}>+ 항목 추가</button>
              <span style={hint}>{listOf(def.key).length}개</span>
            </div>

            {listOf(def.key).length === 0 ? (
              <div style={emptyBox}>
                아직 항목이 없어요.<br />
                위의 <strong>+ 항목 추가</strong>를 눌러 첫 {def.no === 8 ? '장면' : '인물'}을 만들어 보세요.
              </div>
            ) : (
              listOf(def.key).map((it, idx) => (
                <div key={it.id} style={card}>
                  <div style={cardHead}>
                    <span style={cardNo}>#{idx + 1}</span>
                    <button className="minibtn" onClick={() => moveItem(def.key, it.id, -1)} disabled={idx === 0} title="위로" aria-label="위로 이동">▲</button>
                    <button className="minibtn" onClick={() => moveItem(def.key, it.id, 1)} disabled={idx === listOf(def.key).length - 1} title="아래로" aria-label="아래로 이동">▼</button>
                    <button className="minibtn" onClick={() => removeItem(def.key, it.id)} title="이 항목 삭제" aria-label="항목 삭제"><Emoji e="🗑️" /> 삭제</button>
                  </div>
                  {(def.fields || []).map((f) => (
                    <div key={f.key}>
                      <div style={fieldLabel}>{f.label}</div>
                      {f.multiline ? (
                        <textarea
                          style={fieldArea}
                          value={it[f.key] || ''}
                          onChange={(e) => updateItem(def.key, it.id, f.key, e.target.value)}
                          placeholder={f.ph}
                          spellCheck={false}
                          aria-label={f.label}
                        />
                      ) : (
                        <input
                          style={fieldInput}
                          value={it[f.key] || ''}
                          onChange={(e) => updateItem(def.key, it.id, f.key, e.target.value)}
                          placeholder={f.ph}
                          aria-label={f.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* 종합 결과 패널 */}
        {showResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...hint, fontWeight: 700, color: 'var(--text)' }}>전체 설계도 (아래 텍스트를 복사하세요)</div>
            <textarea style={resultArea} value={buildResult()} readOnly spellCheck={false} aria-label="전체 결과 텍스트" onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </div>

      {/* 푸터: 내비게이션 + 결과 */}
      <div style={footer}>
        <button className="minibtn" onClick={prev} disabled={stepIdx === 0}>← 이전</button>
        <button className="btn-primary" onClick={next} disabled={stepIdx === STEPS.length - 1}>다음 →</button>
        <button className="minibtn" onClick={resetCurrent} title="현재 단계 입력 비우기">↺ 단계 비우기</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="minibtn" onClick={() => setShowResult((v) => !v)}>{showResult ? '결과 숨기기' : '전체 보기'}</button>
          <button
            className="linkbtn"
            onClick={addResultToProject}
            disabled={filledCount === 0 || !hasProjectBridge()}
            title={hasProjectBridge() ? '종합 설계도를 프로젝트 자료 "구상" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
          ><Emoji e="📄" /> 프로젝트에 추가</button>
          <button className="btn-primary" onClick={copyResult}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 종합 복사</>}</button>
        </div>
      </div>
    </div>
  )
}
