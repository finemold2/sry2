import { useEffect, useState } from 'react'
import { Camera, CornerUpRight, Tag, Trash2 } from 'lucide-react'
import { backlinksOf, internalLinksOf, listAnnotations, useStore } from '../store/store'
import type { AnnotationEntry, InspectorTab } from '../store/store'
import type { Snapshot } from '../model'
import EditableText from './EditableText'
import { rtfToPlainText } from '../rtf'
import { diffStats, diffWords } from '../analysis/diff'
import { openToolLinked, useLibraryList, addToLibrary } from '../tools/linkbus'
import { Icon, iconForTool, stripLeadingEmoji } from '../ui/icons'
import { UTILITY_TOOLS } from '../tools/registry'
import { TRASH_ROOT } from '../model'
import type { BinderItem } from '../model'
// 타임라인 뷰·창작 스튜디오가 읽는 장면 메타 키(pov/plotlines/storyTime)와 '정확히 같은' 키로 기록하기 위해 재사용.
import { PLOTLINE_KEY, POV_KEY, STORYTIME_KEY } from '../creative/structure'

// 즐겨찾기 항목 id → 커스텀 아이콘 이름. 'tool:xxx' 는 도구 의미 매핑, 나머지는 명령 성격 추정.
function favIconName(id: string): string {
  if (id.startsWith('tool:')) {
    const t = UTILITY_TOOLS.find((x) => x.id === id.slice(5))
    return t ? iconForTool(t) : 'tools'
  }
  if (/compile|export|내보/i.test(id)) return 'compile'
  if (/settings|설정/i.test(id)) return 'settings'
  if (/snap/i.test(id)) return 'snapshot'
  if (/^v-|view|editor|cork|outline|board|canvas|serial|timeline|reference|argument|database/i.test(id)) return 'editor'
  if (/skin|studio|classic|theme/i.test(id)) return 'sparkle'
  return 'star'
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function NotesTab({ id }: { id: string }) {
  const item = useStore((s) => s.project.items[id])
  const projectNotes = useStore((s) => s.project.projectNotes)
  const setSynopsis = useStore((s) => s.setSynopsis)
  const setNotes = useStore((s) => s.setNotes)
  const setProjectNotes = useStore((s) => s.setProjectNotes)
  const renameItem = useStore((s) => s.renameItem)
  const [notesScope, setNotesScope] = useState<'doc' | 'project'>('doc')
  if (!item) return null
  return (
    <>
      <div className="insp-section">
        <label>시놉시스</label>
        <div className="synopsis-card">
          <EditableText
            className="syn-title"
            value={item.title}
            onCommit={(v) => renameItem(item.id, v || item.title)}
          />
          <textarea
            className="syn-text"
            placeholder="이 문서의 줄거리/요약을 적어두세요. 코르크보드 카드와 아웃라이너에 함께 표시됩니다."
            value={item.synopsis}
            onChange={(e) => setSynopsis(item.id, e.target.value)}
          />
        </div>
      </div>
      <div className="insp-section">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="minibtn"
            style={notesScope === 'doc' ? { background: 'var(--accent)', color: '#fff' } : undefined}
            onClick={() => setNotesScope('doc')}
          >
            문서 노트
          </button>
          <button
            className="minibtn"
            style={notesScope === 'project' ? { background: 'var(--accent)', color: '#fff' } : undefined}
            onClick={() => setNotesScope('project')}
          >
            프로젝트 노트
          </button>
        </label>
        {notesScope === 'doc' ? (
          <textarea
            className="field"
            placeholder="이 문서용 메모, 자료, 아이디어…"
            value={item.notes}
            onChange={(e) => setNotes(item.id, e.target.value)}
          />
        ) : (
          <textarea
            className="field"
            placeholder="프로젝트 전체에 대한 메모…"
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
          />
        )}
      </div>
    </>
  )
}

function MetaTab({ id }: { id: string }) {
  const project = useStore((s) => s.project)
  const item = project.items[id]
  const setLabel = useStore((s) => s.setLabel)
  const setStatus = useStore((s) => s.setStatus)
  const setInclude = useStore((s) => s.setInclude)
  const setTarget = useStore((s) => s.setTarget)
  const setSectionType = useStore((s) => s.setSectionType)
  const togglePageBreak = useStore((s) => s.togglePageBreak)
  const toggleScriptMode = useStore((s) => s.toggleScriptMode)
  const setCustomMeta = useStore((s) => s.setCustomMeta)
  const setItemIcon = useStore((s) => s.setItemIcon)
  if (!item) return null
  const ICONS: { key: string; icon: string; label: string }[] = [
    { key: '', icon: 'dot', label: '기본' },
    { key: 'star', icon: 'star', label: '별' },
    { key: 'heart', icon: 'heart', label: '하트' },
    { key: 'book', icon: 'book', label: '책' },
    { key: 'character', icon: 'character', label: '인물' },
    { key: 'place', icon: 'setting', label: '장소' },
    { key: 'flag', icon: 'flag', label: '플래그' },
    { key: 'idea', icon: 'idea', label: '아이디어' },
  ]
  const label = project.labels.find((l) => l.id === item.labelId)
  const isFolder = item.type === 'folder'
  // 폴더는 본문이 없으므로 하위 텍스트 문서의 단어/글자 수를 합산해 보여 준다.
  const folderSums = (() => {
    if (!isFolder) return { words: item.wordCount, chars: item.charCount }
    let words = 0
    let chars = 0
    const walk = (childId: string, depth: number) => {
      if (depth > 1000) return // 순환/과도한 깊이 방어
      const it = project.items[childId]
      if (!it) return
      if (it.type === 'text') {
        words += it.wordCount
        chars += it.charCount
      }
      it.childIds.forEach((c) => walk(c, depth + 1))
    }
    item.childIds.forEach((c) => walk(c, 0))
    return { words, chars }
  })()
  // 장면 메타 자동완성 후보 — POV 는 인물 카드 이름(AutoComplete.tsx 패턴, 장소 카드 제외),
  // 플롯라인은 프로젝트 전체에서 이미 쓰인 이름을 모아 제안한다(표기 흔들림 방지).
  const povNames = (() => {
    if (item.type !== 'text') return []
    const set = new Set<string>()
    for (const it of Object.values(project.items)) {
      if (it.type === 'character' && it.character?._kind !== 'setting') {
        const n = (it.character?.name || it.title || '').trim()
        if (n) set.add(n)
      }
    }
    return [...set]
  })()
  const plotlineNames = (() => {
    if (item.type !== 'text') return []
    const set = new Set<string>()
    for (const it of Object.values(project.items)) {
      const raw = it.customMeta?.[PLOTLINE_KEY] || ''
      raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((l) => set.add(l))
    }
    return [...set]
  })()
  return (
    <>
      <div className="insp-section">
        <label>라벨</label>
        <div className="row">
          <select
            className="field"
            value={item.labelId || 'label-none'}
            onChange={(e) => setLabel(id, e.target.value === 'label-none' ? null : e.target.value)}
          >
            {project.labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <span
            className="label-dot"
            style={{ background: label?.color || 'transparent', flex: '0 0 14px', width: 14, height: 14 }}
          />
        </div>
      </div>
      <div className="insp-section">
        <label>상태</label>
        <select
          className="field"
          value={item.statusId || 'status-none'}
          onChange={(e) => setStatus(id, e.target.value === 'status-none' ? null : e.target.value)}
        >
          {project.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="insp-section">
        <label>섹션 타입</label>
        <select
          className="field"
          value={item.sectionTypeId || ''}
          onChange={(e) => setSectionType(id, e.target.value || null)}
        >
          <option value="">(없음)</option>
          {project.sectionTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="insp-section">
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, textTransform: 'none' }}>
          <input
            type="checkbox"
            className="switch"
            checked={item.includeInCompile}
            onChange={(e) => setInclude(id, e.target.checked)}
          />
          컴파일에 포함
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, textTransform: 'none', marginTop: 8 }}>
          <input
            type="checkbox"
            className="switch"
            checked={!!item.pageBreakBefore}
            onChange={(e) => togglePageBreak(id, e.target.checked)}
          />
          이 문서 앞에서 페이지 나눔
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, textTransform: 'none', marginTop: 8 }}>
          <input
            type="checkbox"
            className="switch"
            checked={!!item.scriptMode}
            onChange={(e) => toggleScriptMode(id, e.target.checked)}
          />
          각본 모드 (Tab 으로 요소 전환)
        </label>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginLeft: 2, lineHeight: 1.5 }}>
          시나리오·희곡을 쓸 때 켜세요. 신 제목·지문·대사 등 각본 요소를 Tab/Enter 로 전환합니다.
          템플릿이나 가져온 각본이 아닌 새 문서에서도 여기서 켤 수 있습니다.
        </div>
      </div>
      {project.customFields.length > 0 && (
        <div className="insp-section">
          <label>커스텀 메타데이터</label>
          {project.customFields.map((f) => {
            const v = item.customMeta[f.id] || ''
            return (
              <div key={f.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{f.name}</div>
                {f.type === 'checkbox' ? (
                  <input type="checkbox" checked={v === 'true'} onChange={(e) => setCustomMeta(id, f.id, String(e.target.checked))} />
                ) : f.type === 'date' ? (
                  <input className="field" type="date" value={v} onChange={(e) => setCustomMeta(id, f.id, e.target.value)} />
                ) : f.type === 'list' ? (
                  <>
                    <input className="field" list={`cf-${f.id}`} value={v} onChange={(e) => setCustomMeta(id, f.id, e.target.value)} />
                    {f.options && f.options.length > 0 ? (
                      <datalist id={`cf-${f.id}`}>
                        {f.options.map((o, i) => (
                          <option key={i} value={o} />
                        ))}
                      </datalist>
                    ) : (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                        목록 항목을 설정하면 선택지로 제안됩니다. 프로젝트 설정 → 커스텀 메타데이터에서 항목을 추가하세요.
                      </div>
                    )}
                  </>
                ) : (
                  <input className="field" value={v} onChange={(e) => setCustomMeta(id, f.id, e.target.value)} />
                )}
              </div>
            )
          })}
        </div>
      )}
      {isFolder ? (
        <div className="insp-section">
          <label>하위 문서 합계</label>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {folderSums.words.toLocaleString()} 단어 · {folderSums.chars.toLocaleString()} 글자
            <div style={{ fontSize: 11, marginTop: 2 }}>이 폴더 아래 모든 텍스트 문서의 합산입니다.</div>
          </div>
        </div>
      ) : (
        <div className="insp-section">
          <label>문서 목표 (단어)</label>
          <input
            className="field"
            type="number"
            min={0}
            value={item.target}
            onChange={(e) => setTarget(id, Math.max(0, parseInt(e.target.value) || 0))}
          />
          {item.target > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
              {item.wordCount} / {item.target} 단어 ({Math.round((item.wordCount / item.target) * 100)}%)
            </div>
          )}
        </div>
      )}
      {item.type === 'text' && (
        <div className="insp-section">
          <label>장면 메타 — 타임라인 연동</label>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>POV (시점 인물)</div>
            <input
              className="field"
              list="insp-scene-pov"
              value={item.customMeta[POV_KEY] || ''}
              placeholder="예: 이서준"
              onChange={(e) => setCustomMeta(id, POV_KEY, e.target.value)}
            />
            {povNames.length > 0 && (
              <datalist id="insp-scene-pov">
                {povNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>스토리시간 (작중 시간)</div>
            <input
              className="field"
              value={item.customMeta[STORYTIME_KEY] || ''}
              placeholder="예: 1일차 아침 / 2024-03-01"
              onChange={(e) => setCustomMeta(id, STORYTIME_KEY, e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>플롯라인 (쉼표로 여러 개)</div>
            <input
              className="field"
              list="insp-scene-plotlines"
              value={item.customMeta[PLOTLINE_KEY] || ''}
              placeholder="예: 메인, 서브-로맨스"
              onChange={(e) => setCustomMeta(id, PLOTLINE_KEY, e.target.value)}
            />
            {plotlineNames.length > 0 && (
              <datalist id="insp-scene-plotlines">
                {plotlineNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            타임라인 뷰의 스윔레인(POV·플롯라인)·스토리시간순 정렬과 창작 스튜디오 분석이 이 값을 읽습니다.
            스토리시간은 글자순 정렬이므로 "1일차 아침"처럼 표기 단위를 맞춰 적으면 순서가 정확해집니다.
          </div>
        </div>
      )}
      {item.type === 'text' && (
        <div className="insp-section">
          <label>긴장도 (0–10)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={0}
              max={10}
              value={parseInt(item.customMeta.tension || '0', 10)}
              onChange={(e) => setCustomMeta(id, 'tension', e.target.value)}
              style={{ flex: 1 }}
              aria-label="긴장도"
            />
            <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right' }}>
              {parseInt(item.customMeta.tension || '0', 10)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            도구 → "긴장도 곡선"에서 전체 페이싱(텐션 아크)을 봅니다.
          </div>
        </div>
      )}
      {item.type !== 'character' && (
        <div className="insp-section">
          <label>아이콘</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ICONS.map((ic) => (
              <button
                key={ic.key}
                className={'icon-pick' + ((item.icon || '') === ic.key ? ' on' : '')}
                title={ic.label}
                aria-label={ic.label}
                onClick={() => setItemIcon(id, ic.key || null)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={ic.icon} size={15} />
              </button>
            ))}
          </div>
        </div>
      )}
      <ReferencesSection id={id} />
      <div className="insp-section">
        <label>일반</label>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
          <div>유형: {isFolder ? '폴더' : '텍스트'}</div>
          <div>
            단어 수: {folderSums.words.toLocaleString()} · 글자 수: {folderSums.chars.toLocaleString()}
            {isFolder && ' (하위 합계)'}
          </div>
          <div>생성: {fmtDate(item.created)}</div>
          <div>수정: {fmtDate(item.modified)}</div>
        </div>
      </div>
    </>
  )
}

function BookmarksTab({ id }: { id: string }) {
  const project = useStore((s) => s.project)
  const item = project.items[id]
  const addBookmark = useStore((s) => s.addBookmark)
  const removeBookmark = useStore((s) => s.removeBookmark)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const [pick, setPick] = useState('')

  // 휴지통(TRASH_ROOT 하위) 문서와 현재 문서 자신은 북마크 대상에서 제외한다.
  const inTrash = (itemId: string): boolean => {
    let cur: string | null = itemId
    let guard = 0
    while (cur && guard++ < 1000) {
      if (cur === TRASH_ROOT) return true
      const node: BinderItem | undefined = project.items[cur]
      if (!node) return false
      cur = node.parentId
    }
    return false
  }
  const docs = Object.values(project.items).filter((i) => !i.root && i.id !== id && !inTrash(i.id))
  const open = (b: { targetItemId?: string; url?: string }) => {
    if (b.targetItemId && project.items[b.targetItemId]) {
      select(b.targetItemId)
      setView('editor')
    } else if (b.url) {
      window.open(b.url, '_blank', 'noopener')
    }
  }
  const addUrl = (scope: 'project' | string) => {
    const url = window.prompt('북마크 URL:', 'https://')
    if (!url || url.trim() === '' || url.trim() === 'https://') return
    const u = url.trim()
    // 호스트명 폴백(잘못된 URL 이면 URL 전체를 사용).
    let host = u
    try { host = new URL(u).hostname || u } catch { host = u }
    const titleInput = window.prompt('북마크 제목(선택, 비우면 사이트 주소 사용):', host)
    const title = (titleInput && titleInput.trim()) || host
    addBookmark(scope, { title, url: u })
  }
  const addDoc = (scope: 'project' | string, targetItemId: string) => {
    const t = project.items[targetItemId]
    if (t) addBookmark(scope, { title: t.title, targetItemId })
    setPick('')
  }

  const list = (scope: 'project' | string, bms: { id: string; title: string; targetItemId?: string; url?: string }[]) => (
    <>
      {bms.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>북마크가 없습니다.</div>}
      {bms.map((b) => (
        <div key={b.id} className="bm-row">
          <button className="ref-link" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => open(b)}>
            <Icon name={b.url ? 'link' : 'references'} size={13} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.targetItemId ? project.items[b.targetItemId]?.title || '(삭제됨)' : b.title}</span>
          </button>
          <button className="minibtn danger" onClick={() => removeBookmark(scope, b.id)} title="삭제" aria-label="북마크 삭제" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
      <div className="row" style={{ marginTop: 6, gap: 6 }}>
        <select className="field" value="" onChange={(e) => e.target.value && addDoc(scope, e.target.value)}>
          <option value="">+ 문서 북마크…</option>
          {docs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <button className="minibtn" style={{ flex: '0 0 auto' }} onClick={() => addUrl(scope)}>
          + URL
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="insp-section">
        <label>문서 북마크</label>
        {item ? list(id, item.bookmarks || []) : <div style={{ color: 'var(--muted)', fontSize: 12 }}>문서를 선택하세요.</div>}
      </div>
      <div className="insp-section">
        <label>프로젝트 북마크</label>
        {list('project', project.projectBookmarks || [])}
      </div>
    </>
  )
}

function ReferencesSection({ id }: { id: string }) {
  const project = useStore((s) => s.project)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const forward = internalLinksOf(project, id)
  const back = backlinksOf(project, id)
  const go = (targetId: string) => {
    if (project.items[targetId]) {
      select(targetId)
      setView('editor')
    }
  }
  if (forward.length === 0 && back.length === 0) {
    return (
      <div className="insp-section">
        <label>참조 (내부 링크)</label>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          내부 링크가 없습니다. 문서 메뉴 → "문서 링크 삽입"으로 다른 문서를 연결하세요.
        </div>
      </div>
    )
  }
  return (
    <div className="insp-section">
      <label>참조 (내부 링크)</label>
      {forward.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>이 문서가 가리키는 문서</div>
          {forward.map((l) => (
            <button
              key={'f' + l.targetId}
              className="ref-link"
              disabled={!l.exists}
              onClick={() => go(l.targetId)}
            >
              → {l.title}
              {!l.exists && ' (삭제됨)'}
            </button>
          ))}
        </div>
      )}
      {back.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>이 문서를 가리키는 문서 (백링크)</div>
          {back.map((b) => (
            <button key={'b' + b.id} className="ref-link" onClick={() => go(b.id)}>
              ← {b.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KeywordsTab({ id }: { id: string }) {
  const project = useStore((s) => s.project)
  const item = project.items[id]
  const toggleKeyword = useStore((s) => s.toggleKeyword)
  const addKeyword = useStore((s) => s.addKeyword)
  const deleteKeyword = useStore((s) => s.deleteKeyword)
  const renameKeyword = useStore((s) => s.renameKeyword)
  const recolorKeyword = useStore((s) => s.recolorKeyword)
  const [name, setName] = useState('')
  // 키워드 관리(이름·색 수정, 삭제) 토글. 기본은 기존 동작(칩 클릭=문서에 태깅) 그대로.
  const [editing, setEditing] = useState(false)
  if (!item) return null
  return (
    <div className="insp-section">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ margin: 0 }}>키워드</label>
        {project.keywords.length > 0 && (
          <button
            className="minibtn"
            aria-pressed={editing}
            title={editing ? '관리 끝내기' : '키워드 이름·색 수정 / 삭제'}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? '완료' : '관리'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="kw-manage" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {project.keywords.map((k) => (
            <div key={k.id} className="row" style={{ gap: 6, alignItems: 'center' }}>
              <input
                type="color"
                value={k.color}
                aria-label={`${k.name} 색`}
                title="색 변경"
                onChange={(e) => recolorKeyword(k.id, e.target.value)}
                style={{ width: 26, height: 26, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <input
                className="field"
                value={k.name}
                aria-label="키워드 이름"
                onChange={(e) => renameKeyword(k.id, e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="minibtn"
                title="키워드 삭제(모든 문서 태그에서 제거)"
                aria-label={`${k.name} 삭제`}
                onClick={() => {
                  if (window.confirm(`키워드 "${k.name}" 를 삭제할까요?\n모든 문서에서 이 키워드 태그가 제거됩니다.`)) deleteKeyword(k.id)
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {project.keywords.map((k) => (
            <button
              key={k.id}
              className={'kw-chip' + (item.keywordIds.includes(k.id) ? ' on' : '')}
              style={{ ['--chip' as any]: k.color }}
              onClick={() => toggleKeyword(id, k.id)}
            >
              <Tag size={11} /> {k.name}
            </button>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <input
          className="field"
          placeholder="새 키워드"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              const colors = ['#d81b60', '#8e24aa', '#00897b', '#3949ab', '#e65100', '#43a047']
              addKeyword(name.trim(), colors[project.keywords.length % colors.length])
              setName('')
            }
          }}
        />
      </div>
    </div>
  )
}

// 모듈 레벨 안정 빈 배열 — 셀렉터에서 `|| []` 로 매 렌더 새 배열을 만들면 Zustand 가 매번
// 변경으로 보고 무한 재렌더(React #185)를 일으킨다. 기본값은 셀렉터 '밖'에서 안정 참조로 적용.
const EMPTY_SNAPSHOTS: Snapshot[] = []
function SnapshotsTab({ id }: { id: string }) {
  const snapshots = useStore((s) => s.project.snapshots?.[id]) || EMPTY_SNAPSHOTS
  const currentRtf = useStore((s) => s.project.items[id]?.bodyRtf || '')
  const takeSnapshot = useStore((s) => s.takeSnapshot)
  const rollbackSnapshot = useStore((s) => s.rollbackSnapshot)
  const deleteSnapshot = useStore((s) => s.deleteSnapshot)
  const [title, setTitle] = useState('')
  const [compareId, setCompareId] = useState<string | null>(null)

  const flash = (msg: string) => window.dispatchEvent(new CustomEvent('scriv:flash', { detail: msg }))
  const doRollback = (snapId: string, label: string) => {
    if (window.confirm(`현재 본문을 "${label}" 스냅샷 시점으로 되돌립니다. 계속할까요?\n\n⚠ 스냅샷 이후 추가한 코멘트·각주·서식도 함께 사라집니다.\n(되돌리기 전에 현재 상태로 스냅샷을 한 번 더 찍어두면 안전합니다)`)) {
      window.dispatchEvent(new Event('scriv:flush-editor'))
      rollbackSnapshot(id, snapId)
      flash('스냅샷 시점으로 되돌렸습니다.')
      setCompareId(null)
    }
  }

  if (compareId) {
    const snap = snapshots.find((x) => x.id === compareId)
    if (snap) {
      const parts = diffWords(rtfToPlainText(snap.bodyRtf), rtfToPlainText(currentRtf))
      const st = diffStats(parts)
      const label = snap.title || fmtDate(snap.date)
      return (
        <div className="insp-section">
          <div className="snap-compare-head">
            <button className="minibtn" onClick={() => setCompareId(null)}>
              ← 스냅샷 목록
            </button>
            <span className="snap-compare-title" title={label}>
              {label} 과(와) 현재 비교
            </span>
          </div>
          <div className="snap-diff-legend">
            <span><span className="dot add" /> 추가됨 +{st.added}</span>
            <span><span className="dot del" /> 삭제됨 −{st.removed}</span>
            <span style={{ color: 'var(--muted)' }}>스냅샷 → 현재 변경</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 6px', lineHeight: 1.5 }}>
            ⚠ 이 비교는 글(텍스트)만 보여 줍니다. <b>서식·각주·코멘트</b>의 변경은 표시되지 않습니다.
          </div>
          <div className="snap-diff">
            {parts.map((p, i) => (
              <span
                key={i}
                className={p.type === 'add' ? 'd-add' : p.type === 'del' ? 'd-del' : undefined}
              >
                {p.text}
              </span>
            ))}
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => doRollback(snap.id, label)}
          >
            이 스냅샷 버전으로 되돌리기
          </button>
        </div>
      )
    }
  }

  return (
    <div className="insp-section">
      <label>스냅샷 (버전 기록)</label>
      <div className="snap-take">
        <input
          className="field"
          placeholder="스냅샷 제목 (선택)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.dispatchEvent(new Event('scriv:flush-editor'))
              takeSnapshot(id, title)
              setTitle('')
              flash('스냅샷을 저장했습니다.')
            }
          }}
        />
        <button
          className="btn-primary"
          style={{ flex: '0 0 auto' }}
          onClick={() => {
            window.dispatchEvent(new Event('scriv:flush-editor'))
            takeSnapshot(id, title)
            setTitle('')
            flash('스냅샷을 저장했습니다.')
          }}
        >
          <Camera size={13} /> 지금 찍기
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        {snapshots.length === 0 ? (
          <div className="snap-empty">
            <Camera size={20} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: 6, fontWeight: 600 }}>아직 스냅샷이 없습니다</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              "지금 찍기"로 현재 본문을 버전으로 저장하면, 나중에 <b>비교</b>하거나 그 시점으로 <b>되돌릴</b> 수 있습니다.
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
            {snapshots.length}개 버전 · 항목의 <b>비교</b>로 변경 내용을 보고 되돌릴 수 있습니다.
          </div>
        )}
        {snapshots.map((s) => (
          <div className="snap-item" key={s.id}>
            <div className="snap-meta">
              {fmtDate(s.date)} · {s.wordCount.toLocaleString()} 단어
            </div>
            <div style={{ fontWeight: 600 }}>{s.title || '(제목 없음)'}</div>
            <div className="snap-actions">
              <button className="minibtn" onClick={() => { window.dispatchEvent(new Event('scriv:flush-editor')); setCompareId(s.id) }} title="현재와 변경 내용 비교">
                비교
              </button>
              <button className="minibtn" onClick={() => doRollback(s.id, s.title || fmtDate(s.date))} title="이 시점으로 되돌리기">
                되돌리기
              </button>
              <button
                className="minibtn danger"
                onClick={() => {
                  if (window.confirm(`"${s.title || fmtDate(s.date)}" 스냅샷을 삭제할까요? 되돌릴 수 없습니다.`))
                    deleteSnapshot(id, s.id)
                }}
                title="스냅샷 삭제"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnRow({ id, entry }: { id: string; entry: AnnotationEntry }) {
  const setAnnotation = useStore((s) => s.setAnnotation)
  const deleteAnnotation = useStore((s) => s.deleteAnnotation)
  const [text, setText] = useState(entry.text)
  // 외부(본문 편집)에서 값이 바뀌면 동기화
  useEffect(() => setText(entry.text), [entry.text])
  const jump = () =>
    window.dispatchEvent(
      new CustomEvent('scriv:jumpAnnotation', { detail: { kind: entry.kind, index: entry.index, itemId: id } }),
    )
  return (
    <div className="ann-list-item">
      <div className="ann-head">
        <span className="ann-num">
          {entry.kind === 'footnote' ? (entry.endnote ? '미주' : '각주') + ' ' + entry.number : '코멘트 ' + entry.number}
        </span>
        <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={jump} title="본문에서 보기">
          <CornerUpRight size={11} /> 이동
        </button>
        <button
          className="minibtn danger"
          onClick={() => {
            // 디바운스 대기 중인 본문 편집을 먼저 반영해 주석 인덱스 불일치/유실을 막는다(스냅샷 탭과 동일).
            window.dispatchEvent(new Event('scriv:flush-editor'))
            deleteAnnotation(id, entry.kind, entry.index)
          }}
          title="삭제"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <textarea
        className="field"
        style={{ minHeight: 48 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== entry.text) {
            // 디바운스 대기 중인 본문 편집을 먼저 반영(스냅샷 탭과 동일).
            window.dispatchEvent(new Event('scriv:flush-editor'))
            setAnnotation(id, entry.kind, entry.index, text)
          }
        }}
      />
    </div>
  )
}

function CommentsTab({ id }: { id: string }) {
  const rtf = useStore((s) => s.project.items[id]?.bodyRtf || '')
  const anns = listAnnotations(rtf)
  const footnotes = anns.filter((a) => a.kind === 'footnote')
  const comments = anns.filter((a) => a.kind === 'comment')
  // index 기준으로 안정 정렬(문서 순서 유지)
  const sortByIndex = (a: AnnotationEntry, b: AnnotationEntry) => a.index - b.index
  return (
    <>
      <div className="insp-section">
        <label>코멘트 (주석)</label>
        {comments.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            코멘트가 없습니다. 본문에서 텍스트를 선택하고 서식 바의 말풍선(코멘트) 버튼("코멘트(주석) 삽입")으로 추가하세요.
          </div>
        ) : (
          comments
            .slice()
            .sort(sortByIndex)
            .map((c) => <AnnRow key={'c' + c.index} id={id} entry={c} />)
        )}
      </div>
      <div className="insp-section">
        <label>각주 · 미주</label>
        {footnotes.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            각주가 없습니다. 서식 바의 각주/미주 버튼으로 추가하세요.
          </div>
        ) : (
          footnotes
            .slice()
            .sort(sortByIndex)
            .map((f) => <AnnRow key={'f' + f.index} id={id} entry={f} />)
        )}
      </div>
    </>
  )
}

// 블로그/SEO 온페이지 메타 편집 + SERP 프리뷰 + 핵심 점검(키워드 위치/길이).
function SeoTab({ id }: { id: string }) {
  const item = useStore((s) => s.project.items[id])
  const setSeoMeta = useStore((s) => s.setSeoMeta)
  if (!item) return null
  const seo = item.seo || {}
  const title = (seo.metaTitle || item.title || '').trim()
  const desc = (seo.metaDescription || '').trim()
  const slug = (seo.slug || '').trim()
  const kw = (seo.focusKeyword || '').trim().toLowerCase()
  const body = (item.plainText || '').toLowerCase()
  const firstPara = body.slice(0, 200)
  const titleLen = title.length
  const descLen = desc.length
  const checks: { label: string; pass: boolean; detail?: string }[] = kw
    ? [
        { label: '제목에 키워드 포함', pass: title.toLowerCase().includes(kw) },
        { label: '메타 설명에 키워드 포함', pass: desc.toLowerCase().includes(kw) },
        { label: '첫 문단에 키워드 포함', pass: firstPara.includes(kw) },
        { label: '슬러그에 키워드 포함', pass: !!slug && slug.toLowerCase().includes(kw.replace(/\s+/g, '-')) },
        {
          label: '본문 키워드 밀도 0.5~3%',
          pass: (() => {
            const words = body.split(/\s+/).filter(Boolean).length
            if (!words) return false
            const hits = body.split(kw).length - 1
            const d = (hits / words) * 100
            return d >= 0.5 && d <= 3
          })(),
        },
      ]
    : []
  const fld = (label: string, key: 'focusKeyword' | 'metaTitle' | 'metaDescription' | 'slug', ph: string, area = false) => (
    <label className="fld" style={{ marginBottom: 8 }}>
      <span>{label}</span>
      {area ? (
        <textarea className="field" rows={2} placeholder={ph} defaultValue={seo[key] || ''} onBlur={(e) => setSeoMeta(id, { [key]: e.target.value })} />
      ) : (
        <input className="field" placeholder={ph} defaultValue={seo[key] || ''} onBlur={(e) => setSeoMeta(id, { [key]: e.target.value })} />
      )}
    </label>
  )
  return (
    <div style={{ fontSize: 12 }}>
      {item.type === 'folder' && (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--paper))', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, color: 'var(--muted)', lineHeight: 1.5 }}>
          이 항목은 <b>폴더</b>예요. SEO(웹페이지) 메타는 보통 <b>개별 글(문서)</b>에 적용됩니다 — 폴더 안의 문서를 선택해 설정하세요. (폴더를 한 페이지로 묶어 발행할 때만 여기서 설정하세요.)
        </div>
      )}
      {fld('포커스 키워드', 'focusKeyword', '이 글의 핵심 검색어')}
      {fld('메타 제목 (SEO title)', 'metaTitle', item.title)}
      {fld('메타 설명 (description)', 'metaDescription', '검색 결과에 보일 요약(120~155자 권장)', true)}
      {fld('슬러그 (URL)', 'slug', 'url-friendly-slug')}

      <div style={{ margin: '10px 0 6px', fontWeight: 600 }}>구글 검색 미리보기</div>
      {/* 실제 구글 SERP 처럼 흰 배경으로 고정 — 다크/세피아 테마에서도 대비를 보장(종이 미리보기와 동일 철학). */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
        <div style={{ color: '#1a0dab', fontSize: 15, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || '(제목 없음)'}
        </div>
        <div style={{ color: '#006621', fontSize: 12 }}>example.com/{slug || '...'}</div>
        <div style={{ color: '#3c4043', fontSize: 12.5, lineHeight: 1.4 }}>{desc || '(메타 설명을 입력하면 여기에 표시됩니다.)'}</div>
      </div>
      <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 11 }}>
        제목 <b style={{ color: titleLen > 60 ? 'var(--accent-2)' : 'var(--ok)' }}>{titleLen}</b>/60자 · 설명{' '}
        <b style={{ color: descLen > 155 || (descLen > 0 && descLen < 80) ? 'var(--warn)' : 'var(--ok)' }}>{descLen}</b>/155자
      </div>

      {kw ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checks.map((c, i) => (
            <li key={i} style={{ color: c.pass ? 'var(--ok)' : 'var(--warn)' }}>
              {c.pass ? '✓' : '○'} <span style={{ color: 'var(--text)' }}>{c.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ marginTop: 10, color: 'var(--muted)' }}>포커스 키워드를 입력하면 온페이지 점검표가 표시됩니다. 더 깊은 분석은 창작 스튜디오의 ‘블로그·SEO’ 분석기를 사용하세요.</div>
      )}
    </div>
  )
}

// 🧰 연계 탭 — 우측 패널을 도구·라이브러리 허브로 활용. 현재 문서를 라이브러리로 보내고, 관련 도구를 바로 띄운다.
const QUICK_TOOLS: { id: string; label: string }[] = [
  { id: 'character-forge', label: '🧬 캐릭터 생성기' },
  { id: 'character-sheet', label: '🪪 인물 시트' },
  { id: 'setting-bible', label: '🏞 배경 설정집' },
  { id: 'scene-forge', label: '🎬 장면 생성기' },
  { id: 'writing-dictionary', label: '📚 단어·표현 사전' },
  { id: 'show-dont-tell', label: '👁 보여주기 변환' },
  { id: 'name-mixer', label: '✨ 이름 믹서' },
  { id: 'mind-map', label: '🧠 마인드맵' },
  { id: 'mood-ring', label: '💍 무드링' },
  { id: 'plot-pyramid', label: '🔺 플롯 피라미드' },
]
function ToolsLinkTab({ id }: { id: string }) {
  const item = useStore((s) => s.project.items[id])
  const chars = useLibraryList('characters')
  const places = useLibraryList('places')
  const snippets = useLibraryList('snippets')
  const [toast, setToast] = useState('')
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1500) }
  if (!item) return null
  const saveSynopsis = () => {
    const t = (item.synopsis || '').trim()
    if (!t) { flash('시놉시스가 비어 있습니다.'); return }
    addToLibrary('snippets', { text: t, source: '시놉시스 · ' + item.title }); flash('시놉시스를 스니펫 라이브러리에 저장했습니다.')
  }
  const Row = (iconName: string, label: string, items: { id: string; name?: string; text?: string }[], onClick: (x: { id: string; name?: string; text?: string }) => void) => (
    <div className="insp-section">
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name={iconName} size={13} />{label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({items.length})</span></label>
      {items.length === 0 ? <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>아직 없습니다. 도구에서 저장하면 여기 모입니다.</div> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {items.slice(0, 24).map((x) => (
            <button key={x.id} className="minibtn" title="클릭하여 복사" onClick={() => onClick(x)} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {(x.name || x.text || '').slice(0, 24) || '(빈 항목)'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => flash('복사됨')).catch(() => {}) }
  return (
    <>
      <div className="insp-section">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="tools" size={13} />도구 빠른 실행</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {QUICK_TOOLS.map((t) => <button key={t.id} className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => openToolLinked(t.id)}><Icon name={favIconName('tool:' + t.id)} size={13} />{stripLeadingEmoji(t.label)}</button>)}
        </div>
      </div>
      <div className="insp-section">
        <label>이 문서 활용</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={saveSynopsis}><Icon name="references" size={13} />시놉시스를 라이브러리로</button>
          <button className="minibtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => openToolLinked('writing-dictionary')}><Icon name="book" size={13} />표현 찾기</button>
        </div>
      </div>
      {Row('character', '인물 라이브러리', chars, (x) => copy(x.name || ''))}
      {Row('setting', '장소 라이브러리', places, (x) => copy(x.name || ''))}
      {Row('quote', '스니펫', snippets, (x) => copy(x.text || ''))}
      {toast && <div style={{ fontSize: 11.5, color: 'var(--ok)', padding: '4px 2px' }}>{toast}</div>}
    </>
  )
}

const TABS: { key: InspectorTab; label: string; icon?: string }[] = [
  { key: 'favorites', label: '즐겨찾기', icon: 'star' },
  { key: 'notes', label: '노트' },
  { key: 'meta', label: '메타' },
  { key: 'keywords', label: '키워드' },
  { key: 'comments', label: '주석' },
  { key: 'bookmarks', label: '북마크' },
  { key: 'snapshots', label: '스냅샷' },
  { key: 'seo', label: 'SEO' },
  { key: 'tools', label: '연계', icon: 'tools' },
]

// 즐겨찾기 탭 — 자주 쓰는 도구/기능/메뉴 명령을 모아 빠르게 실행. 드래그 재정렬 + 드롭으로 추가.
function FavoritesTab() {
  const favorites = useStore((s) => s.favorites)
  const reorder = useStore((s) => s.reorderFavorites)
  const remove = useStore((s) => s.removeFavorite)
  const toggle = useStore((s) => s.toggleFavorite)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overPanel, setOverPanel] = useState(false)
  const run = (id: string) => window.dispatchEvent(new CustomEvent('scriv:run-fav', { detail: id }))
  const addFromDrop = (e: React.DragEvent) => {
    let raw = ''
    try { raw = e.dataTransfer.getData('text/fav') } catch { /* noop */ }
    if (!raw) return false
    try { const f = JSON.parse(raw); if (f && f.id && !favorites.some((x) => x.id === f.id)) toggle({ id: String(f.id), label: String(f.label || f.id) }) } catch { /* noop */ }
    return true
  }
  const reorderTo = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const ids = favorites.map((f) => f.id)
    const from = ids.indexOf(dragId); const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    reorder(ids)
  }
  return (
    <div
      data-fav-drop="1"
      className="fav-drop-zone"
      style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 8, outline: overPanel ? '2px dashed var(--accent)' : 'none', outlineOffset: -4, borderRadius: 8 }}
      onDragOver={(e) => { if (Array.prototype.includes.call(e.dataTransfer.types || [], 'text/fav')) { e.preventDefault(); setOverPanel(true) } }}
      onDragLeave={() => setOverPanel(false)}
      onDrop={(e) => { setOverPanel(false); if (addFromDrop(e)) e.preventDefault() }}
    >
      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        자주 쓰는 도구·기능·메뉴를 모아 빠르게 여세요. 추가: 도구 창의 <b>★</b>, 도구 창을 끌어 여기에 <b>놓기</b>, 명령 팔레트(⌘K)의 <b>★</b>. 드래그로 순서 변경.
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, opacity: 0.85 }}>
        즐겨찾기는 도구·뷰·메뉴 명령만 담기며 <b>모든 프로젝트에서 공유됩니다</b>(이 기기 기준).
      </div>
      {favorites.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: 20 }}>
          아직 즐겨찾기가 없어요.<br />도구 창 헤더의 ★ 또는 ⌘K 명령의 ★ 를 눌러 추가하세요.<br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>(즐겨찾기는 모든 프로젝트에서 공유됩니다.)</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {favorites.map((f) => (
            <div
              key={f.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); reorderTo(f.id) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', opacity: dragId === f.id ? 0.5 : 1 }}
            >
              {/* 드래그는 이 핸들로만 — 행 전체를 draggable 로 두면 항목 '열기' 클릭이 드래그로 먹혀 가끔 안 열린다. */}
              <span
                draggable
                onDragStart={(e) => { setDragId(f.id); try { e.dataTransfer.setData('text/fav', JSON.stringify(f)); e.dataTransfer.effectAllowed = 'move' } catch { /* noop */ } }}
                onDragEnd={() => setDragId(null)}
                title="드래그하여 순서 변경"
                aria-label="순서 변경 손잡이"
                style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0, display: 'inline-flex', cursor: 'grab' }}
              ><Icon name="list" size={11} /></span>
              <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'inline-flex' }} aria-hidden><Icon name={favIconName(f.id)} size={15} /></span>
              <button onClick={() => run(f.id)} title={stripLeadingEmoji(f.label) + ' 열기'} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', fontSize: 12.5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripLeadingEmoji(f.label)}</button>
              <button className="minibtn" title="즐겨찾기 제거" onClick={() => remove(f.id)} style={{ flexShrink: 0, padding: '0 6px', display: 'inline-flex' }} aria-label="즐겨찾기 제거"><Icon name="close" size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Inspector() {
  const visible = useStore((s) => s.inspectorVisible)
  const tab = useStore((s) => s.inspectorTab)
  const setTab = useStore((s) => s.setInspectorTab)
  const activeId = useStore((s) => s.activeId)

  if (!visible) return null

  return (
    <div className="inspector">
      <div
        className="insp-tabs"
        role="tablist"
        aria-label="인스펙터 탭"
        onKeyDown={(e) => {
          const idx = TABS.findIndex((x) => x.key === tab)
          if (idx < 0) return
          let n = -1
          if (e.key === 'ArrowRight') n = (idx + 1) % TABS.length
          else if (e.key === 'ArrowLeft') n = (idx - 1 + TABS.length) % TABS.length
          else if (e.key === 'Home') n = 0
          else if (e.key === 'End') n = TABS.length - 1
          if (n >= 0) {
            e.preventDefault()
            setTab(TABS[n].key)
            const btn = e.currentTarget.children[n] as HTMLElement | undefined
            btn?.focus()
          }
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={'insp-tab-' + t.key}
            aria-controls="insp-panel"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
            style={t.icon ? { display: 'inline-flex', alignItems: 'center', gap: 5 } : undefined}
          >
            {t.icon && <Icon name={t.icon} size={13} mono />}
            {t.label}
          </button>
        ))}
      </div>
      <div className="insp-body" role="tabpanel" id="insp-panel" aria-labelledby={'insp-tab-' + tab}>
        {tab === 'favorites' ? (
          <FavoritesTab />
        ) : !activeId ? (
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>문서를 선택하세요.</div>
        ) : tab === 'notes' ? (
          <NotesTab id={activeId} />
        ) : tab === 'meta' ? (
          <MetaTab id={activeId} />
        ) : tab === 'keywords' ? (
          <KeywordsTab id={activeId} />
        ) : tab === 'comments' ? (
          <CommentsTab id={activeId} />
        ) : tab === 'bookmarks' ? (
          <BookmarksTab id={activeId} />
        ) : tab === 'seo' ? (
          <SeoTab key={activeId} id={activeId} />
        ) : tab === 'tools' ? (
          <ToolsLinkTab id={activeId} />
        ) : (
          <SnapshotsTab id={activeId} />
        )}
      </div>
    </div>
  )
}
