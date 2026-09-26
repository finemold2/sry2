// 집필 할 일 체크리스트 — 항목 추가/완료체크/삭제, localStorage 영속, 완료/전체 카운트, 전체 비우기.
// localStorage 미지원/차단 시 메모리만 사용하며 graceful 처리.
// 연계(linkbus): 할 일 목록을 프로젝트 자료('할 일' 폴더)에 체크 상태를 담은 문서로 추가.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge } from './linkbus'

export const meta = { id: 'todo-checklist', name: '집필 할 일 체크리스트', icon: '✅', group: '집중·생산성', intro: '집필 할 일을 적고 하나씩 끝내세요', w: 380, h: 560 }

interface Item { id: string; text: string; done: boolean }

const LS_KEY = 'sry:tool:todo-checklist:items'

// localStorage 읽기 — 미지원/차단/손상 시 빈 배열로 graceful 처리.
function loadItems(): Item[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x.text === 'string')
      .map((x) => ({ id: String(x.id || Date.now() + Math.random()), text: String(x.text), done: !!x.done }))
  } catch {
    return []
  }
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// HTML 이스케이프 (프로젝트 본문에 안전하게 삽입) — &,<,> 필수.
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 할 일 목록을 체크 상태를 담은 HTML 로 직렬화 — 완료 항목은 ☑ + 취소선, 미완료는 ☐.
function toHtml(items: Item[]): string {
  if (!items.length) return ''
  let out = '<ul>'
  for (const it of items) {
    const box = it.done ? '☑' : '☐'
    const text = escHtml(it.text)
    const inner = it.done ? '<s>' + text + '</s>' : text
    out += '<li>' + box + ' ' + inner + '</li>'
  }
  out += '</ul>'
  return out
}

export default function TodoChecklist() {
  const [items, setItems] = useState<Item[]>(() => loadItems())
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const mounted = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function flash(msg: string) {
    if (!mounted.current) return
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mounted.current) setToast('') }, 3000)
  }

  // 연계: 할 일 목록을 프로젝트 자료('할 일' 폴더)에 체크 상태를 담은 문서로 추가.
  const addTodosToProject = () => {
    if (!total) { flash('추가할 할 일이 없어요.'); return }
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '할 일',
      title: '집필 할 일',
      bodyHtml: toHtml(items),
      meta: { 완료: String(doneCount), 전체: String(total) },
    })
    flash(id ? '프로젝트 자료 "할 일" 폴더에 할 일 목록을 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 변경 시 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 목록이 사라질 수 있어요.')
    }
  }, [items])

  const add = () => {
    const t = draft.trim()
    if (!t) return
    setItems((prev) => [...prev, { id: newId(), text: t, done: false }])
    setDraft('')
  }

  const toggle = (id: string) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))
  const clearAll = () => { if (items.length) setItems([]) }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  const total = items.length
  const doneCount = items.filter((it) => it.done).length

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const inputRow: React.CSSProperties = { display: 'flex', gap: 8 }
  const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const counter: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }
  const list: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, padding: 16 }
  const txt = (done: boolean): React.CSSProperties => ({ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', color: done ? 'var(--muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' })
  const del: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 4 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }
  const toastStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ok)', lineHeight: 1.5 }
  const linkbar: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 2 }

  return (
    <div style={wrap}>
      <div style={inputRow}>
        <input
          style={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="할 일을 입력하고 Enter…"
          maxLength={200}
          aria-label="할 일 입력"
        />
        <button className="btn-primary" onClick={add} disabled={!draft.trim()}>추가</button>
      </div>

      <div style={counter}>
        <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / 전체 <strong style={{ color: 'var(--text)' }}>{total}</strong></span>
        <button className="minibtn" onClick={clearAll} disabled={total === 0}>전체 비우기</button>
      </div>

      {note && <div style={{ ...hint, color: 'var(--warn)' }}>{note}</div>}

      {total === 0 ? (
        <div style={empty}>아직 할 일이 없어요.<br />위에 첫 항목을 적어 보세요.</div>
      ) : (
        <div style={list}>
          {items.map((it) => (
            <div key={it.id} style={row}>
              <input
                type="checkbox"
                checked={it.done}
                onChange={() => toggle(it.id)}
                style={{ flexShrink: 0, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                aria-label={it.text}
              />
              <span style={txt(it.done)} onClick={() => toggle(it.id)}>{it.text}</span>
              <button style={del} className="minibtn" onClick={() => remove(it.id)} title="삭제" aria-label="삭제">🗑️</button>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={toastStyle}>{toast}</div>}

      <div style={hint}>항목을 눌러 완료 표시하고, 끝낸 일은 삭제하거나 그대로 두어 진행률을 확인하세요. 목록은 이 브라우저에 자동 저장됩니다.</div>

      {/* 연계: 프로젝트 연동 — 할 일 목록을 자료('할 일' 폴더)에 체크 상태와 함께 문서로 추가 */}
      <div className="linkbar" style={linkbar}>
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addTodosToProject}
          disabled={total === 0 || !hasProjectBridge()}
          title={hasProjectBridge() ? '할 일 목록을 프로젝트 자료 "할 일" 폴더에 체크 상태와 함께 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >📄 프로젝트에 추가</button>
      </div>
    </div>
  )
}
