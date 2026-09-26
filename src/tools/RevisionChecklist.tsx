// 퇴고 체크리스트 — 단계(구조/플롯/인물/장면/문장/맞춤법·표기)별 기본 점검 항목 + 사용자 항목 추가·수정·삭제·순서, 단계별·전체 진행률.
// 모든 상태(체크 여부·사용자 항목·삭제된 기본 항목·접힘 상태)는 localStorage('sry:tool:revision-checklist')에 자동 저장/복원.
// 자급식: react 외 import 없음. localStorage 미지원/차단/손상 시 메모리만 사용하며 graceful 처리(throw 금지).
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'revision-checklist', name: '퇴고 체크리스트', icon: '🧾', group: '구상·정리', intro: '구조·플롯·인물·장면·문장·맞춤법 단계별로 원고를 점검하며 퇴고하세요', w: 620, h: 600 }

const LS_KEY = 'sry:tool:revision-checklist'

interface Stage {
  id: string
  name: string
  icon: string
  desc: string
  items: string[] // 기본 항목 본문
}

// 단계별 기본 점검 항목(수십 개). id 는 안정적으로 stage.id + index 로 파생한다.
const STAGES: Stage[] = [
  {
    id: 'structure',
    name: '구조',
    icon: '🏗️',
    desc: '전체 뼈대·흐름·균형',
    items: [
      '도입부가 독자를 끌어들이는가 (첫 문단/첫 장의 후크)',
      '이야기의 중심 질문(드라마틱 퀘스천)이 분명한가',
      '3막 또는 선택한 구조의 전환점이 제 위치에 있는가',
      '중간부가 늘어지지 않고 긴장이 유지되는가',
      '결말이 도입에서 던진 질문에 응답하는가',
      '각 장(챕터)이 끝날 때 다음을 읽게 만드는 동력이 있는가',
      '시점(POV)이 일관되거나 의도대로 전환되는가',
      '시제(과거/현재)가 일관되는가',
      '시간 순서·플래시백이 혼란 없이 이해되는가',
      '분량 배분이 한쪽으로 치우치지 않는가',
      '서브플롯이 본 줄거리와 엮이고 회수되는가',
      '불필요한 장면·챕터를 들어내도 무너지지 않는가(있으면 삭제 검토)',
    ],
  },
  {
    id: 'plot',
    name: '플롯',
    icon: '🎢',
    desc: '사건·인과·갈등·복선',
    items: [
      '모든 주요 사건이 인과로 연결되는가(우연 남발 금지)',
      '주인공의 목표와 그것을 막는 장애물이 분명한가',
      '갈등이 장면마다 존재하고 점점 고조되는가',
      '위기(클라이맥스)가 충분히 뜨겁고 필연적인가',
      '복선이 심어지고 적절히 회수되는가',
      '데우스 엑스 마키나(갑툭튀 해결)가 없는가',
      '반전이 있다면 단서가 미리 깔려 공정한가',
      '느슨한 실(미회수 떡밥)이 남아 있지 않은가',
      '주인공의 선택이 결말을 이끄는가(수동적이지 않은가)',
      '판돈(스테이크)이 독자에게 분명히 와닿는가',
      '서스펜스/긴장을 위한 정보 공개 시점이 의도적인가',
    ],
  },
  {
    id: 'character',
    name: '인물',
    icon: '🧑‍🎤',
    desc: '동기·변화·관계·일관성',
    items: [
      '주인공의 욕망과 결핍이 분명한가',
      '인물의 행동에 납득 가능한 동기가 있는가',
      '주인공이 이야기를 거치며 변화(아크)하는가',
      '인물의 말투·성격이 처음부터 끝까지 일관되는가',
      '조연도 평면적이지 않고 자기 욕구가 있는가',
      '인물 간 관계와 긴장이 설득력 있는가',
      '인물 이름이 헷갈리지 않게 충분히 구별되는가',
      '대사로 인물을 보여주되 설명(이름 부르기 등)에 의존하지 않는가',
      '안타고니스트의 논리가 그 나름 타당한가',
      '인물의 외형·나이·설정이 앞뒤로 모순되지 않는가',
      '독자가 주인공에게 감정 이입할 지점이 있는가',
    ],
  },
  {
    id: 'scene',
    name: '장면',
    icon: '🎬',
    desc: '묘사·감각·몰입·전환',
    items: [
      '각 장면의 목적(무엇이 바뀌는가)이 분명한가',
      '장면이 갈등 또는 변화로 끝나는가',
      '오감 묘사로 공간·분위기가 그려지는가',
      '말하기(telling) 대신 보여주기(showing)가 적절히 쓰였는가',
      '시점 인물이 모를 정보를 서술하지 않는가',
      '대사가 자연스럽고 정보 전달용으로 어색하지 않은가',
      '대화에 행동·지문(비트)이 적절히 섞였는가',
      '장면 전환이 매끄럽고 독자가 길을 잃지 않는가',
      '배경 설명(인포덤프)이 한 곳에 몰리지 않는가',
      '감정이 직접 진술 대신 행동·신체 반응으로 드러나는가',
      '페이스가 장면 성격에 맞는가(액션은 빠르게, 정서는 느리게)',
    ],
  },
  {
    id: 'sentence',
    name: '문장',
    icon: '✍️',
    desc: '리듬·간결·표현',
    items: [
      '한 문장이 지나치게 길거나 꼬여 있지 않은가',
      '문장 길이에 리듬·변화가 있는가',
      '불필요한 부사·형용사를 덜어냈는가',
      '같은 단어·어미가 가까이서 반복되지 않는가',
      '피동·이중피동 표현을 능동으로 바꿀 수 있는가',
      '번역투(~에 의해, ~을 갖다 등)를 다듬었는가',
      '상투적 표현·클리셰를 신선하게 바꿨는가',
      '군더더기 말(사실, 정말, 그냥 등)을 줄였는가',
      '모호한 지시어(그것, 이것)가 무엇을 가리키는지 분명한가',
      '주어와 서술어가 호응하는가',
      '능동적이고 구체적인 동사를 썼는가',
      '소리 내어 읽었을 때 걸리는 부분이 없는가',
    ],
  },
  {
    id: 'proofread',
    name: '맞춤법·표기',
    icon: '🔤',
    desc: '오탈자·띄어쓰기·일관성',
    items: [
      '오탈자가 없는가(처음부터 끝까지 정독)',
      '띄어쓰기가 규칙에 맞는가',
      '맞춤법(되/돼, 안/않, 든/던 등)이 정확한가',
      '문장부호(마침표·쉼표·따옴표)가 일관되게 쓰였는가',
      '대화 따옴표 형식이 통일되어 있는가',
      '고유명사·인명·지명 표기가 처음부터 끝까지 같은가',
      '숫자·단위 표기 방식이 일관되는가',
      '외래어 표기가 표기법에 맞고 통일되어 있는가',
      '말줄임표(……)·줄표(—) 사용이 통일되어 있는가',
      '문단 들여쓰기·줄바꿈 형식이 일관되는가',
      '높임말·반말이 인물·상황에 맞게 일관되는가',
    ],
  },
]

interface UserItem { id: string; text: string }
interface Persisted {
  checked: Record<string, boolean> // 항목 id -> 체크 여부
  removedDefaults: string[] // 삭제한 기본 항목 id
  userItems: Record<string, UserItem[]> // stageId -> 사용자 항목 배열(순서 보존)
  collapsed: Record<string, boolean> // stageId -> 접힘 여부
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyState(): Persisted {
  return { checked: {}, removedDefaults: [], userItems: {}, collapsed: {} }
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태로 graceful 처리. 누락 필드는 기본값 보강.
function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyState()
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return emptyState()
    const checked: Record<string, boolean> = {}
    if (p.checked && typeof p.checked === 'object') {
      for (const k of Object.keys(p.checked)) checked[k] = !!p.checked[k]
    }
    const collapsed: Record<string, boolean> = {}
    if (p.collapsed && typeof p.collapsed === 'object') {
      for (const k of Object.keys(p.collapsed)) collapsed[k] = !!p.collapsed[k]
    }
    const userItems: Record<string, UserItem[]> = {}
    if (p.userItems && typeof p.userItems === 'object') {
      for (const k of Object.keys(p.userItems)) {
        const arr = p.userItems[k]
        if (Array.isArray(arr)) {
          userItems[k] = arr
            .filter((x: any) => x && typeof x.text === 'string')
            .map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
        }
      }
    }
    const removedDefaults = Array.isArray(p.removedDefaults)
      ? p.removedDefaults.filter((x: any) => typeof x === 'string')
      : []
    return { checked, removedDefaults, userItems, collapsed }
  } catch {
    return emptyState()
  }
}

const defaultItemId = (stageId: string, idx: number) => `d:${stageId}:${idx}`

// 단계별 전체 항목(기본 - 삭제된 것 + 사용자 항목)을 합성한다.
interface MergedItem { id: string; text: string; user: boolean }
function stageItems(stage: Stage, state: Persisted): MergedItem[] {
  const out: MergedItem[] = []
  stage.items.forEach((text, idx) => {
    const id = defaultItemId(stage.id, idx)
    if (state.removedDefaults.includes(id)) return
    out.push({ id, text, user: false })
  })
  const ui = state.userItems[stage.id] || []
  ui.forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

export default function RevisionChecklist() {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({}) // stageId -> 입력 중 텍스트
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.')
    }
  }, [state])

  const flash = (msg: string) => {
    setCopied(msg)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1700)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch {
      flash('복사에 실패했어요. 직접 선택해 복사하세요.')
    }
  }

  const toggle = (itemId: string) => {
    setState((s) => ({ ...s, checked: { ...s.checked, [itemId]: !s.checked[itemId] } }))
  }

  const toggleCollapse = (stageId: string) => {
    setState((s) => ({ ...s, collapsed: { ...s.collapsed, [stageId]: !s.collapsed[stageId] } }))
  }

  const addUserItem = (stageId: string) => {
    const text = (drafts[stageId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    setState((s) => ({
      ...s,
      userItems: { ...s.userItems, [stageId]: [...(s.userItems[stageId] || []), item] },
    }))
    setDrafts((d) => ({ ...d, [stageId]: '' }))
  }

  // 기본 항목은 removedDefaults 에 기록, 사용자 항목은 배열에서 제거. 체크 상태도 정리.
  const removeItem = (stageId: string, itemId: string, isUser: boolean) => {
    setState((s) => {
      const checked = { ...s.checked }
      delete checked[itemId]
      if (isUser) {
        const arr = (s.userItems[stageId] || []).filter((u) => u.id !== itemId)
        return { ...s, checked, userItems: { ...s.userItems, [stageId]: arr } }
      }
      return { ...s, checked, removedDefaults: [...s.removedDefaults, itemId] }
    })
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    const target = editing
    setEditing(null)
    if (!text) return
    setState((s) => {
      // 사용자 항목인지 탐색
      for (const stageId of Object.keys(s.userItems)) {
        const arr = s.userItems[stageId] || []
        if (arr.some((u) => u.id === target.id)) {
          return {
            ...s,
            userItems: { ...s.userItems, [stageId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) },
          }
        }
      }
      // 기본 항목 수정 → 기본은 삭제 처리하고 같은 단계에 사용자 항목으로 대체(편집 가능 상태 유지)
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const stageId = m[1]
        const repl: UserItem = { id: newId(), text }
        const wasChecked = !!s.checked[target.id]
        const checked = { ...s.checked }
        delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...s,
          checked,
          removedDefaults: s.removedDefaults.includes(target.id) ? s.removedDefaults : [...s.removedDefaults, target.id],
          userItems: { ...s.userItems, [stageId]: [...(s.userItems[stageId] || []), repl] },
        }
      }
      return s
    })
  }

  const moveUserItem = (stageId: string, itemId: string, dir: -1 | 1) => {
    setState((s) => {
      const arr = (s.userItems[stageId] || []).slice()
      const i = arr.findIndex((u) => u.id === itemId)
      if (i < 0) return s
      const j = i + dir
      if (j < 0 || j >= arr.length) return s
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
      return { ...s, userItems: { ...s.userItems, [stageId]: arr } }
    })
  }

  const resetStage = (stageId: string) => {
    setState((s) => {
      const checked = { ...s.checked }
      // 해당 단계의 모든 항목 체크 해제
      const stage = STAGES.find((x) => x.id === stageId)
      if (stage) stage.items.forEach((_, idx) => { delete checked[defaultItemId(stageId, idx)] })
      ;(s.userItems[stageId] || []).forEach((u) => { delete checked[u.id] })
      return { ...s, checked }
    })
  }

  const resetAll = () => {
    setState((s) => ({ ...s, checked: {} }))
  }

  // 진행률 계산
  const perStage = STAGES.map((st) => {
    const items = stageItems(st, state)
    const done = items.filter((it) => state.checked[it.id]).length
    return { stage: st, items, total: items.length, done }
  })
  const totalItems = perStage.reduce((a, p) => a + p.total, 0)
  const totalDone = perStage.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0

  const exportText = () => {
    const lines: string[] = ['# 퇴고 체크리스트', `진행률: ${totalDone}/${totalItems} (${totalPct}%)`, '']
    perStage.forEach((p) => {
      lines.push(`## ${p.stage.icon} ${p.stage.name}  [${p.done}/${p.total}]`)
      p.items.forEach((it) => lines.push(`- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}`))
      lines.push('')
    })
    copyText(lines.join('\n').trim(), `체크리스트를 복사했어요 (${totalDone}/${totalItems})`)
  }

  // ── 프로젝트 연동: 현재 체크 상태를 '퇴고' 폴더 문서로 추가 ──
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>진행률: ${totalDone}/${totalItems} (${totalPct}%)</strong></p>`)
    perStage.forEach((p) => {
      parts.push(`<h3>${escHtml(p.stage.icon + ' ' + p.stage.name)} [${p.done}/${p.total}]</h3>`)
      if (p.items.length === 0) {
        parts.push('<p>(항목 없음)</p>')
      } else {
        p.items.forEach((it) => {
          const mark = state.checked[it.id] ? '☑' : '☐'
          parts.push(`<p>${mark} ${escHtml(it.text)}</p>`)
        })
      }
    })
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '퇴고',
      title: `퇴고 체크리스트 (${totalDone}/${totalItems})`,
      bodyHtml: toBodyHtml(),
      meta: {
        진행률: `${totalDone}/${totalItems} (${totalPct}%)`,
        ...Object.fromEntries(perStage.map((p) => [p.stage.name, `${p.done}/${p.total}`])),
      },
    })
    flash(id ? `프로젝트 '퇴고' 폴더에 체크리스트를 추가했어요 (${totalDone}/${totalItems})` : '프로젝트에 연결되지 않았습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }
  const bar = (h = 8): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', transition: 'width .25s ease' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }
  const stHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }
  const itemRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={headTitle}><Emoji e="🧾"/> 퇴고 체크리스트</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "현재 체크 상태를 프로젝트 '퇴고' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}
        ><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="체크리스트를 텍스트로 복사"><Emoji e="📋"/> 내보내기</button>
        <button className="minibtn" onClick={resetAll} disabled={totalDone === 0} title="모든 체크 해제">↺ 전체 해제</button>
      </div>

      {/* 전체 진행률 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {perStage.map(({ stage, items, total, done }) => {
          const pct = total ? Math.round((done / total) * 100) : 0
          const open = !state.collapsed[stage.id]
          const draft = drafts[stage.id] || ''
          return (
            <div key={stage.id} style={card}>
              <div style={stHead} onClick={() => toggleCollapse(stage.id)}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}><Emoji e={stage.icon}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{stage.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.desc}</div>
                </div>
                <div style={{ width: 90, flexShrink: 0 }}><div style={bar(6)}><div style={fill(pct)} /></div></div>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, width: 64, textAlign: 'right', color: pct >= 100 && total > 0 ? 'var(--ok)' : 'var(--muted)' }}>{done}/{total}</span>
                <button
                  style={tinyBtn}
                  title="이 단계 체크 해제"
                  disabled={done === 0}
                  onClick={(e) => { e.stopPropagation(); resetStage(stage.id) }}
                >↺</button>
              </div>

              {open && (
                <div>
                  {items.length === 0 ? (
                    <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                      이 단계에 항목이 없어요. 아래에서 점검 항목을 추가하세요.
                    </div>
                  ) : (
                    items.map((it) => {
                      const isEditing = editing && editing.id === it.id
                      const checked = !!state.checked[it.id]
                      const userArr = state.userItems[stage.id] || []
                      const uIdx = it.user ? userArr.findIndex((u) => u.id === it.id) : -1
                      return (
                        <div key={it.id} style={{ ...itemRow, borderTop: '1px solid var(--border)' }}>
                          {isEditing ? (
                            <>
                              <input
                                style={{ ...input, flex: 1 }}
                                value={editing!.text}
                                autoFocus
                                onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
                                  if (e.key === 'Escape') { e.preventDefault(); setEditing(null) }
                                }}
                                aria-label="항목 수정"
                              />
                              <button style={tinyBtn} title="저장" onClick={saveEdit}>저장</button>
                              <button style={tinyBtn} title="취소" onClick={() => setEditing(null)}>취소</button>
                            </>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(it.id)}
                                style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                aria-label={it.text}
                              />
                              <span
                                onClick={() => toggle(it.id)}
                                style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}
                              >
                                {it.text}
                                {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                              </span>
                              {it.user && (
                                <>
                                  <button style={tinyBtn} title="위로" disabled={uIdx <= 0} onClick={() => moveUserItem(stage.id, it.id, -1)}>↑</button>
                                  <button style={tinyBtn} title="아래로" disabled={uIdx < 0 || uIdx >= userArr.length - 1} onClick={() => moveUserItem(stage.id, it.id, 1)}>↓</button>
                                </>
                              )}
                              <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                              <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(stage.id, it.id, it.user)}>✕</button>
                            </>
                          )}
                        </div>
                      )
                    })
                  )}

                  {/* 항목 추가 */}
                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <input
                      style={{ ...input, flex: 1 }}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [stage.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(stage.id) } }}
                      placeholder={`${stage.name} 단계에 점검 항목 추가…`}
                      maxLength={160}
                      aria-label={`${stage.name} 항목 추가`}
                    />
                    <button className="minibtn" onClick={() => addUserItem(stage.id)} disabled={!draft.trim()}>＋ 추가</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
          항목을 눌러 체크하고, 단계 머리글을 눌러 펼치거나 접으세요. 기본 항목도 수정·삭제할 수 있고, 내 항목은 순서를 바꿀 수 있어요. 모든 진행 상황은 이 브라우저에 자동 저장됩니다.
        </div>
      </div>
    </div>
  )
}
