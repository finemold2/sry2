// 개요 트리 — 계층형 개요 항목을 자식/형제로 추가하고 인라인 편집, 접기/펼치기, 위/아래 이동,
// 들여쓰기/내어쓰기, 삭제까지 지원하는 아웃라이너. 들여쓴 텍스트/마크다운 목록으로 내보내고 복사할 수 있다.
// 모든 데이터는 localStorage 'sry:tool:outline-tree' 에 자동 저장/복원.
// 연계(linkbus): 계층 개요를 프로젝트 원고(개요 폴더)에 <ul>/<li> 문서로 추가.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge } from './linkbus'

export const meta = { id: 'outline-tree', name: '개요 트리', icon: '🌳', group: '구상·정리', intro: '계층형 개요를 자식·형제로 쌓고 접기·이동·들여쓰기로 정리하세요', w: 640, h: 600 }

// ── 데이터 모델 ─────────────────────────────────────────────
interface Node {
  id: string
  text: string
  collapsed: boolean
  children: Node[]
}

interface Saved {
  tree: Node[]
  selectedId: string | null
}

const LS_KEY = 'sry:tool:outline-tree'

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function mkNode(text = ''): Node {
  return { id: newId(), text, collapsed: false, children: [] }
}

// 저장된 노드를 안전하게 정규화 — 손상/타입오류 시 graceful 처리.
function normNode(x: any): Node | null {
  if (!x || typeof x !== 'object') return null
  const children = Array.isArray(x.children)
    ? x.children.map(normNode).filter((c: Node | null): c is Node => c !== null)
    : []
  return {
    id: String(x.id || newId()),
    text: typeof x.text === 'string' ? x.text : '',
    collapsed: !!x.collapsed,
    children,
  }
}

function load(): Saved {
  const fallback: Saved = {
    tree: [
      { id: newId(), text: '1막 — 발단', collapsed: false, children: [
        { id: newId(), text: '주인공 소개', collapsed: false, children: [] },
        { id: newId(), text: '일상 세계', collapsed: false, children: [] },
      ] },
      { id: newId(), text: '2막 — 전개', collapsed: false, children: [
        { id: newId(), text: '사건의 발생', collapsed: false, children: [] },
      ] },
      { id: newId(), text: '3막 — 결말', collapsed: false, children: [] },
    ],
    selectedId: null,
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.tree)) return fallback
    const tree = parsed.tree.map(normNode).filter((n: Node | null): n is Node => n !== null)
    return {
      tree,
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : null,
    }
  } catch {
    return fallback
  }
}

// ── 불변 트리 헬퍼 ─────────────────────────────────────────────
function mapNode(tree: Node[], id: string, fn: (n: Node) => Node): Node[] {
  return tree.map((n) => {
    if (n.id === id) return fn(n)
    if (n.children.length) {
      const kids = mapNode(n.children, id, fn)
      if (kids !== n.children) return { ...n, children: kids }
    }
    return n
  })
}

function removeNode(tree: Node[], id: string): { tree: Node[]; removed: Node | null } {
  let removed: Node | null = null
  const walk = (nodes: Node[]): Node[] => {
    const out: Node[] = []
    for (const n of nodes) {
      if (n.id === id) { removed = n; continue }
      if (n.children.length) {
        const kids = walk(n.children)
        out.push(kids === n.children ? n : { ...n, children: kids })
      } else {
        out.push(n)
      }
    }
    return out
  }
  const next = walk(tree)
  return { tree: next, removed }
}

// 노드의 부모 배열과 인덱스를 찾는다. parent=null 이면 루트.
function locate(tree: Node[], id: string): { parent: Node | null; siblings: Node[]; index: number } | null {
  const search = (nodes: Node[], parent: Node | null): { parent: Node | null; siblings: Node[]; index: number } | null => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent, siblings: nodes, index: i }
      const r = search(nodes[i].children, nodes[i])
      if (r) return r
    }
    return null
  }
  return search(tree, null)
}

function findNode(tree: Node[], id: string): Node | null {
  for (const n of tree) {
    if (n.id === id) return n
    const r = findNode(n.children, id)
    if (r) return r
  }
  return null
}

function countAll(tree: Node[]): number {
  return tree.reduce((acc, n) => acc + 1 + countAll(n.children), 0)
}

function maxDepth(tree: Node[], d = 1): number {
  let m = tree.length ? d : 0
  for (const n of tree) {
    if (n.children.length) m = Math.max(m, maxDepth(n.children, d + 1))
  }
  return m
}

// 들여쓴 텍스트로 직렬화 (자식 접힘 여부는 무시하고 전체 출력).
function toIndentedText(tree: Node[], depth = 0, unit = '    '): string {
  let out = ''
  for (const n of tree) {
    out += unit.repeat(depth) + (n.text || '(빈 항목)') + '\n'
    if (n.children.length) out += toIndentedText(n.children, depth + 1, unit)
  }
  return out
}

// 마크다운 목록으로 직렬화.
function toMarkdown(tree: Node[], depth = 0): string {
  let out = ''
  for (const n of tree) {
    out += '  '.repeat(depth) + '- ' + (n.text || '(빈 항목)') + '\n'
    if (n.children.length) out += toMarkdown(n.children, depth + 1)
  }
  return out
}

// HTML 이스케이프 (프로젝트 본문에 안전하게 삽입).
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 계층 개요를 중첩 <ul>/<li> HTML 로 직렬화 (자식 접힘 여부는 무시하고 전체 출력).
function toHtmlList(tree: Node[]): string {
  if (!tree.length) return ''
  let out = '<ul>'
  for (const n of tree) {
    const text = escHtml(n.text || '(빈 항목)').replace(/\n/g, '<br>')
    out += '<li>' + text + (n.children.length ? toHtmlList(n.children) : '') + '</li>'
  }
  out += '</ul>'
  return out
}

// ── 컴포넌트 ─────────────────────────────────────────────
export default function OutlineTree() {
  const init = useRef<Saved>()
  if (!init.current) init.current = load()

  const [tree, setTree] = useState<Node[]>(init.current.tree)
  const [selectedId, setSelectedId] = useState<string | null>(init.current.selectedId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [exportMode, setExportMode] = useState<'indent' | 'md'>('indent')
  const [showExport, setShowExport] = useState(false)
  const [copied, setCopied] = useState(false)

  const mounted = useRef(true)
  const editRef = useRef<HTMLTextAreaElement | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 방금 추가돼 아직 확정되지 않은 신규 노드의 id — 빈 입력으로 끝내면 제거 대상.
  const pendingNewId = useRef<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ tree, selectedId }))
    } catch {
      flash('이 브라우저에서 저장이 막혀 있어 새로고침하면 개요가 사라질 수 있어요.')
    }
  }, [tree, selectedId])

  // 편집 시작 시 textarea 포커스/커서 끝으로 + 화면 밖이면 보이도록 스크롤.
  useEffect(() => {
    if (editingId && editRef.current) {
      const el = editRef.current
      el.focus()
      const len = el.value.length
      try { el.setSelectionRange(len, len) } catch {}
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      try { editRef.current?.scrollIntoView({ block: 'nearest' }) } catch {}
    }
  }, [editingId])

  function flash(msg: string) {
    if (!mounted.current) return
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 3200)
  }

  // ── 편집 ──
  const beginEdit = (id: string) => {
    const n = findNode(tree, id)
    if (!n) return
    setSelectedId(id)
    setEditingId(id)
    setDraft(n.text)
  }

  const commitEdit = () => {
    if (!editingId) return
    const id = editingId
    const text = draft
    // 신규 추가 직후 빈 입력으로 끝내면 미확정 노드를 제거(빈 항목 누적 방지).
    if (pendingNewId.current === id && text.trim() === '') {
      setTree((prev) => removeNode(prev, id).tree)
      if (selectedId === id) setSelectedId(null)
      pendingNewId.current = null
      setEditingId(null)
      setDraft('')
      return
    }
    pendingNewId.current = null
    setTree((prev) => mapNode(prev, id, (n) => ({ ...n, text })))
    setEditingId(null)
    setDraft('')
  }

  const cancelEdit = () => {
    const id = editingId
    // Esc 로 끝낸 신규 미확정 노드가 빈 입력이면 제거(빈 항목 누적 방지).
    if (id && pendingNewId.current === id && draft.trim() === '') {
      setTree((prev) => removeNode(prev, id).tree)
      if (selectedId === id) setSelectedId(null)
    }
    pendingNewId.current = null
    setEditingId(null)
    setDraft('')
  }

  // ── 추가 ──
  const addRoot = () => {
    const node = mkNode('새 항목')
    setTree((prev) => [...prev, node])
    setSelectedId(node.id)
    setEditingId(node.id)
    setDraft('새 항목')
    pendingNewId.current = node.id
  }

  // 선택 항목의 형제로(바로 아래) 추가.
  const addSibling = () => {
    if (!selectedId) { addRoot(); return }
    const loc = locate(tree, selectedId)
    if (!loc) { addRoot(); return }
    const node = mkNode('새 항목')
    if (loc.parent === null) {
      setTree((prev) => {
        const next = [...prev]
        next.splice(loc.index + 1, 0, node)
        return next
      })
    } else {
      const pid = loc.parent.id
      setTree((prev) => mapNode(prev, pid, (p) => {
        const kids = [...p.children]
        const idx = kids.findIndex((c) => c.id === selectedId)
        kids.splice(idx + 1, 0, node)
        return { ...p, children: kids }
      }))
    }
    setSelectedId(node.id)
    setEditingId(node.id)
    setDraft('새 항목')
    pendingNewId.current = node.id
  }

  // 선택 항목의 자식(마지막)으로 추가하고 부모를 펼침.
  const addChild = () => {
    if (!selectedId) { addRoot(); return }
    const node = mkNode('새 항목')
    setTree((prev) => mapNode(prev, selectedId, (p) => ({
      ...p, collapsed: false, children: [...p.children, node],
    })))
    setSelectedId(node.id)
    setEditingId(node.id)
    setDraft('새 항목')
    pendingNewId.current = node.id
  }

  // ── 삭제 ──
  const del = (id: string) => {
    const n = findNode(tree, id)
    if (!n) return
    const kidCount = countAll(n.children)
    const label = (n.text || '(빈 항목)').slice(0, 30)
    const msg = kidCount > 0
      ? `'${label}' 항목과 하위 ${kidCount}개를 모두 삭제할까요?`
      : `'${label}' 항목을 삭제할까요?`
    if (!window.confirm(msg)) return
    setTree((prev) => removeNode(prev, id).tree)
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) cancelEdit()
  }

  // ── 접기/펼치기 ──
  const toggleCollapse = (id: string) => {
    setTree((prev) => mapNode(prev, id, (n) => ({ ...n, collapsed: !n.collapsed })))
  }

  const setAllCollapsed = (v: boolean) => {
    const walk = (nodes: Node[]): Node[] => nodes.map((n) => ({
      ...n,
      collapsed: n.children.length ? v : n.collapsed,
      children: walk(n.children),
    }))
    setTree((prev) => walk(prev))
  }

  // ── 위/아래 이동 (같은 형제 안에서) ──
  const move = (id: string, dir: -1 | 1) => {
    const loc = locate(tree, id)
    if (!loc) return
    const { parent, index } = loc
    const target = index + dir
    const reorder = (arr: Node[]): Node[] => {
      if (target < 0 || target >= arr.length) return arr
      const next = [...arr]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    }
    if (parent === null) {
      setTree((prev) => {
        const r = reorder(prev)
        if (r === prev) flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.')
        return r
      })
    } else {
      setTree((prev) => mapNode(prev, parent.id, (p) => {
        const r = reorder(p.children)
        if (r === p.children) { flash(dir < 0 ? '이미 맨 위입니다.' : '이미 맨 아래입니다.'); return p }
        return { ...p, children: r }
      }))
    }
  }

  // ── 들여쓰기: 바로 위 형제의 마지막 자식으로 이동 ──
  const indent = (id: string) => {
    const loc = locate(tree, id)
    if (!loc) return
    if (loc.index === 0) { flash('위에 형제 항목이 없어 들여쓸 수 없어요.'); return }
    const prevSiblingId = loc.siblings[loc.index - 1].id
    setTree((prev) => {
      const { tree: removedTree, removed } = removeNode(prev, id)
      if (!removed) return prev
      return mapNode(removedTree, prevSiblingId, (sib) => ({
        ...sib, collapsed: false, children: [...sib.children, removed!],
      }))
    })
    setSelectedId(id)
  }

  // ── 내어쓰기: 부모의 다음 형제로 이동 ──
  const outdent = (id: string) => {
    const loc = locate(tree, id)
    if (!loc || loc.parent === null) { flash('더 내어쓸 수 없는 최상위 항목이에요.'); return }
    const parentId = loc.parent.id
    setTree((prev) => {
      const parentLoc = locate(prev, parentId)
      if (!parentLoc) return prev
      const { tree: removedTree, removed } = removeNode(prev, id)
      if (!removed) return prev
      if (parentLoc.parent === null) {
        const next = [...removedTree]
        const pIdx = next.findIndex((c) => c.id === parentId)
        next.splice(pIdx + 1, 0, removed)
        return next
      }
      const gpId = parentLoc.parent.id
      return mapNode(removedTree, gpId, (gp) => {
        const kids = [...gp.children]
        const pIdx = kids.findIndex((c) => c.id === parentId)
        kids.splice(pIdx + 1, 0, removed!)
        return { ...gp, children: kids }
      })
    })
    setSelectedId(id)
  }

  const clearAll = () => {
    if (!tree.length) return
    if (!window.confirm('개요 전체를 비울까요? 모든 항목이 삭제됩니다.')) return
    setTree([])
    setSelectedId(null)
    cancelEdit()
  }

  // ── 내보내기 ──
  const exportText = exportMode === 'indent' ? toIndentedText(tree) : toMarkdown(tree)

  const copyExport = async () => {
    const text = exportText.trim()
    if (!text) { flash('내보낼 내용이 없어요.'); return }
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
      if (!mounted.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied(false) }, 1600)
    } catch {
      flash('복사에 실패했어요. 아래 글상자에서 직접 선택해 복사하세요.')
    }
  }

  // ── 프로젝트 연동: 계층 개요를 원고('개요' 폴더)에 <ul>/<li> 문서로 추가 ──
  const addOutlineToProject = () => {
    if (!total) { flash('내보낼 개요가 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = toHtmlList(tree)
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '개요',
      title: '개요',
      bodyHtml,
      meta: { 항목수: String(total), 최대깊이: String(maxDepth(tree)) },
    })
    flash(id ? '프로젝트 원고 "개요" 폴더에 개요 문서를 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 편집 textarea 키 처리: Enter 저장, Shift+Enter 줄바꿈, Esc 취소.
  const onEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // 선택된 행에서의 단축키.
  const onRowKey = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (editingId) return
    if (e.key === 'Enter') { e.preventDefault(); beginEdit(id) }
    else if (e.key === 'Tab') { e.preventDefault(); if (e.shiftKey) outdent(id); else indent(id) }
    else if (e.key === 'Delete') { e.preventDefault(); del(id) }
    else if ((e.altKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); move(id, -1) }
    else if ((e.altKey || e.metaKey) && e.key === 'ArrowDown') { e.preventDefault(); move(id, 1) }
  }

  const total = countAll(tree)
  const depth = maxDepth(tree)
  const selNode = selectedId ? findNode(tree, selectedId) : null

  // ── 스타일 ─────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const toolbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)' }
  const sep: React.CSSProperties = { width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '2px 4px' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 8px 14px' }
  const empty: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, gap: 12, padding: 20 }
  const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)', fontSize: 12, color: 'var(--muted)' }
  const noteBar: React.CSSProperties = { padding: '6px 12px', fontSize: 12, color: 'var(--warn)', background: 'var(--paper)', borderBottom: '1px solid var(--border)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      {/* 툴바 */}
      <div style={toolbar}>
        <button className="btn-primary" onClick={addRoot} title="최상위 항목 추가">＋ 항목</button>
        <button className="minibtn" onClick={addSibling} disabled={!selectedId} title="선택 항목 아래 형제 추가">＋ 형제</button>
        <button className="minibtn" onClick={addChild} disabled={!selectedId} title="선택 항목의 자식 추가">↳ 자식</button>
        <div style={sep} />
        <button className="minibtn" onClick={() => selectedId && move(selectedId, -1)} disabled={!selectedId} title="위로 이동 (Alt+↑)">↑</button>
        <button className="minibtn" onClick={() => selectedId && move(selectedId, 1)} disabled={!selectedId} title="아래로 이동 (Alt+↓)">↓</button>
        <button className="minibtn" onClick={() => selectedId && outdent(selectedId)} disabled={!selectedId} title="내어쓰기 (Shift+Tab)">⇤</button>
        <button className="minibtn" onClick={() => selectedId && indent(selectedId)} disabled={!selectedId} title="들여쓰기 (Tab)">⇥</button>
        <div style={sep} />
        <button className="minibtn" onClick={() => setAllCollapsed(true)} disabled={!total} title="모두 접기">⊟ 접기</button>
        <button className="minibtn" onClick={() => setAllCollapsed(false)} disabled={!total} title="모두 펼치기">⊞ 펼치기</button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setShowExport((v) => !v)} disabled={!total} title="텍스트로 내보내기">⬆ 내보내기</button>
      </div>

      {note && <div style={noteBar}>{note}</div>}

      {/* 본문: 트리 */}
      <div style={body}>
        {total === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 40 }}>🌳</div>
            <div>아직 개요가 비어 있어요.<br />아래 버튼이나 위의 <strong>＋ 항목</strong>으로 첫 항목을 시작하세요.</div>
            <button className="btn-primary" onClick={addRoot}>＋ 첫 항목 만들기</button>
          </div>
        ) : (
          <div>
            {tree.map((n, i) => (
              <Row
                key={n.id}
                node={n}
                depth={0}
                index={i}
                count={tree.length}
                selectedId={selectedId}
                editingId={editingId}
                draft={draft}
                editRef={editRef}
                onSelect={(id) => { setSelectedId(id); if (editingId && editingId !== id) commitEdit() }}
                onBeginEdit={beginEdit}
                onDraft={setDraft}
                onCommit={commitEdit}
                onEditKey={onEditKey}
                onRowKey={onRowKey}
                onToggle={toggleCollapse}
                onMove={move}
                onIndent={indent}
                onOutdent={outdent}
                onAddChild={(id) => { setSelectedId(id); addChild() }}
                onDelete={del}
              />
            ))}
          </div>
        )}
      </div>

      {/* 내보내기 패널 */}
      {showExport && total > 0 && (
        <ExportPanel
          mode={exportMode}
          setMode={setExportMode}
          text={exportText}
          copied={copied}
          onCopy={copyExport}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* 연계: 프로젝트 연동 */}
      <div className="linkbar" style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--chrome-2)' }}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addOutlineToProject}
          disabled={!total || !hasProjectBridge()}
          title={hasProjectBridge() ? '계층 개요를 프로젝트 원고 "개요" 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >📄 프로젝트에 개요 문서 추가</button>
      </div>

      {/* 푸터 통계 */}
      <div style={footer}>
        <span>
          항목 <strong style={{ color: 'var(--text)' }}>{total}</strong>개 · 최대 깊이 <strong style={{ color: 'var(--text)' }}>{depth}</strong>
          {selNode && <> · 선택: <span style={{ color: 'var(--accent)' }}>{(selNode.text || '(빈 항목)').slice(0, 24)}</span></>}
        </span>
        <button className="minibtn" onClick={clearAll} disabled={!total} title="전체 비우기">전체 비우기</button>
      </div>
    </div>
  )
}

// ── 트리 행 (재귀) ─────────────────────────────────────────────
interface RowProps {
  node: Node
  depth: number
  index: number
  count: number
  selectedId: string | null
  editingId: string | null
  draft: string
  editRef: React.RefObject<HTMLTextAreaElement>
  onSelect: (id: string) => void
  onBeginEdit: (id: string) => void
  onDraft: (s: string) => void
  onCommit: () => void
  onEditKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onRowKey: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void
  onToggle: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onIndent: (id: string) => void
  onOutdent: (id: string) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

function Row(props: RowProps) {
  const { node, depth, index, count, selectedId, editingId } = props
  const selected = selectedId === node.id
  const editing = editingId === node.id
  const hasKids = node.children.length > 0
  const [hover, setHover] = useState(false)

  const indentPx = 12 + depth * 20

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    padding: '5px 8px 5px 0',
    paddingLeft: indentPx,
    borderRadius: 8,
    background: selected ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : hover ? 'var(--chrome-2)' : 'transparent',
    border: selected ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : '1px solid transparent',
    cursor: 'default',
    outline: 'none',
    transition: 'background 0.12s',
  }
  const caret: React.CSSProperties = {
    flexShrink: 0, width: 18, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: hasKids ? 'pointer' : 'default', color: 'var(--muted)', fontSize: 11, userSelect: 'none',
    transform: node.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.12s',
  }
  const bullet: React.CSSProperties = {
    flexShrink: 0, width: 14, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: hasKids ? 'var(--accent)' : 'var(--muted)', fontSize: hasKids ? 9 : 7, userSelect: 'none',
  }
  const label: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5, padding: '2px 2px', wordBreak: 'break-word',
    whiteSpace: 'pre-wrap', color: node.text ? 'var(--text)' : 'var(--muted)', fontStyle: node.text ? 'normal' : 'italic',
  }
  const editBox: React.CSSProperties = {
    flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5, padding: '2px 6px', resize: 'none', overflow: 'hidden',
    border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--paper)', color: 'var(--text)',
    font: 'inherit', boxSizing: 'border-box',
  }
  const actions: React.CSSProperties = {
    flexShrink: 0, display: 'flex', gap: 2, alignItems: 'center', opacity: hover || selected ? 1 : 0,
    transition: 'opacity 0.12s',
  }
  const act: React.CSSProperties = {
    border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
    lineHeight: 1, padding: '3px 4px', borderRadius: 5,
  }
  const delAct: React.CSSProperties = { ...act, color: 'var(--muted)' }

  const onTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    props.onDraft(el.value)
  }

  return (
    <div>
      <div
        style={rowStyle}
        tabIndex={0}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => props.onSelect(node.id)}
        onKeyDown={(e) => props.onRowKey(e, node.id)}
        role="treeitem"
        aria-expanded={hasKids ? !node.collapsed : undefined}
        aria-selected={selected}
      >
        <span
          style={caret}
          onClick={(e) => { e.stopPropagation(); if (hasKids) props.onToggle(node.id) }}
          title={hasKids ? (node.collapsed ? '펼치기' : '접기') : ''}
        >{hasKids ? '▶' : ''}</span>
        <span style={bullet}>{hasKids ? '●' : '○'}</span>

        {editing ? (
          <textarea
            ref={props.editRef}
            style={editBox}
            value={props.draft}
            rows={1}
            onChange={onTextareaInput}
            onInput={onTextareaInput}
            onKeyDown={props.onEditKey}
            onBlur={props.onCommit}
            onClick={(e) => e.stopPropagation()}
            placeholder="항목 내용 (Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소)"
            aria-label="항목 편집"
          />
        ) : (
          <span
            style={label}
            onDoubleClick={(e) => { e.stopPropagation(); props.onBeginEdit(node.id) }}
            title="더블클릭하여 편집"
          >{node.text || '(빈 항목 — 더블클릭하여 입력)'}</span>
        )}

        {!editing && (
          <span style={actions} onClick={(e) => e.stopPropagation()}>
            <button style={act} className="minibtn" title="편집" onClick={() => props.onBeginEdit(node.id)}>✏️</button>
            <button style={act} className="minibtn" title="자식 추가" onClick={() => props.onAddChild(node.id)}>↳</button>
            <button style={act} className="minibtn" title="위로 이동" onClick={() => props.onMove(node.id, -1)} disabled={index === 0}>↑</button>
            <button style={act} className="minibtn" title="아래로 이동" onClick={() => props.onMove(node.id, 1)} disabled={index === count - 1}>↓</button>
            <button style={act} className="minibtn" title="내어쓰기" onClick={() => props.onOutdent(node.id)} disabled={depth === 0}>⇤</button>
            <button style={act} className="minibtn" title="들여쓰기" onClick={() => props.onIndent(node.id)} disabled={index === 0}>⇥</button>
            <button style={delAct} className="minibtn" title="삭제" onClick={() => props.onDelete(node.id)}>🗑️</button>
          </span>
        )}
      </div>

      {hasKids && !node.collapsed && (
        <div>
          {node.children.map((c, i) => (
            <Row
              {...props}
              key={c.id}
              node={c}
              depth={depth + 1}
              index={i}
              count={node.children.length}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 내보내기 패널 ─────────────────────────────────────────────
interface ExportProps {
  mode: 'indent' | 'md'
  setMode: (m: 'indent' | 'md') => void
  text: string
  copied: boolean
  onCopy: () => void
  onClose: () => void
}

function ExportPanel(props: ExportProps) {
  const { mode, setMode, text, copied } = props
  const panel: React.CSSProperties = { borderTop: '1px solid var(--border)', background: 'var(--paper)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46%' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 13,
    background: active ? 'var(--accent)' : 'var(--chrome-2)', color: active ? '#fff' : 'var(--text)',
  })
  const area: React.CSSProperties = {
    flex: 1, minHeight: 90, resize: 'none', width: '100%', boxSizing: 'border-box', padding: 10, fontSize: 13,
    lineHeight: 1.55, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)',
    color: 'var(--text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre', overflow: 'auto',
  }

  return (
    <div style={panel}>
      <div style={head}>
        <strong style={{ fontSize: 13, color: 'var(--text)' }}>내보내기</strong>
        <button style={tabBtn(mode === 'indent')} onClick={() => setMode('indent')}>들여쓴 텍스트</button>
        <button style={tabBtn(mode === 'md')} onClick={() => setMode('md')}>마크다운 목록</button>
        <div style={{ flex: 1 }} />
        <button className="btn-primary" onClick={props.onCopy}>{copied ? '복사됨 ✓' : '복사'}</button>
        <button className="minibtn" onClick={props.onClose}>닫기</button>
      </div>
      <textarea style={area} value={text.trimEnd()} readOnly aria-label="내보내기 결과" onFocus={(e) => e.currentTarget.select()} />
    </div>
  )
}
