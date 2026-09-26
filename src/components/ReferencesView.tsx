// 참고문헌 관리자 뷰 — 출처(CSL) 라이브러리 편집 + 인용 스타일별 서지 생성/복사/문서 삽입.
// 좌: 출처 목록 + 추가/가져오기, 우: 선택 출처 편집 폼, 하단: 스타일별 서지 미리보기.
import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import type { CslItem, CiteStyle, RefType } from '../model'
import {
  formatInline,
  formatBibliography,
  parseBibtex,
  parseRis,
  STYLE_LABELS,
} from '../creative/cite'

const REF_TYPES: { key: RefType; label: string }[] = [
  { key: 'article', label: '학술논문' },
  { key: 'book', label: '단행본' },
  { key: 'chapter', label: '단행본 장(章)' },
  { key: 'web', label: '웹페이지' },
  { key: 'thesis', label: '학위논문' },
  { key: 'report', label: '보고서' },
  { key: 'conference', label: '학술대회' },
  { key: 'news', label: '신문/기사' },
  { key: 'interview', label: '인터뷰' },
  { key: 'other', label: '기타' },
]

const CITE_STYLES: CiteStyle[] = ['apa', 'mla', 'chicago', 'ieee', 'kci']

// 출처 목록 정렬 기준. added=추가순(원본 배열 순서 그대로).
type RefSortKey = 'added' | 'author' | 'year' | 'title'

const SORT_OPTIONS: { key: RefSortKey; label: string }[] = [
  { key: 'added', label: '추가순' },
  { key: 'author', label: '저자' },
  { key: 'year', label: '연도' },
  { key: 'title', label: '제목' },
]

// formatBibliography/formatEntry 가 사용하는 *별표* 마크다운식 강조를 HTML/표시용으로 변환.
function renderEmphasis(s: string): string {
  // <em> 로 치환(문서 삽입용). 입력은 신뢰된 서지 문자열.
  const O = String.fromCharCode(1), C = String.fromCharCode(2)
  return escapeHtml(s).replace(new RegExp(O + '([^' + C + ']*)' + C, 'g'), '<em>$1</em>')
}
function stripEmphasis(s: string): string {
  // 미리보기 텍스트 표시용: 마커만 제거.
  return s.replace(new RegExp('[' + String.fromCharCode(1) + String.fromCharCode(2) + ']', 'g'), '')
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function ReferencesView() {
  const project = useStore((s) => s.project)
  const addReference = useStore((s) => s.addReference)
  const updateReference = useStore((s) => s.updateReference)
  const deleteReference = useStore((s) => s.deleteReference)
  const appendToDocument = useStore((s) => s.appendToDocument)
  const activeId = useStore((s) => s.activeId)

  const references = useMemo<CslItem[]>(() => project.references || [], [project.references])

  const [style, setStyle] = useState<CiteStyle>('apa')
  const [groupByScript, setGroupByScript] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 좌측 목록 검색어(제목/저자 부분일치)·정렬 기준. 표시 전용이라 원본 데이터는 건드리지 않는다.
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<RefSortKey>('added')
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  // 문서 삽입 시 붙일 제목 텍스트. 빈 값이면 제목을 생략한다(중복/번역 제목을 직접 고를 수 있게).
  const [headingText, setHeadingText] = useState('참고문헌')

  const selected = useMemo(
    () => references.find((r) => r.id === selectedId) || null,
    [references, selectedId],
  )

  // 목록 표시용 필터+정렬. 원본 배열(추가순)은 복사본만 정렬해 변형하지 않는다.
  // 서지 미리보기 순서는 인용 스타일 규칙(formatBibliography)이 별도로 정하므로 여기 정렬과 무관.
  const visibleRefs = useMemo<CslItem[]>(() => {
    const q = query.trim().toLowerCase()
    let list = references
    if (q) {
      list = list.filter((r) => {
        const title = (r.title || '').toLowerCase()
        const authors = (r.authors || []).filter(Boolean).join(' ').toLowerCase()
        return title.includes(q) || authors.includes(q)
      })
    }
    if (sortKey === 'added') return list
    const arr = [...list]
    const LAST = String.fromCharCode(0xffff) // 값이 비어 있는 항목을 맨 뒤로 보내기 위한 비교 문자열.
    if (sortKey === 'author') {
      arr.sort((a, b) => ((a.authors || [])[0] || LAST).localeCompare((b.authors || [])[0] || LAST, 'ko'))
    } else if (sortKey === 'year') {
      // 연도는 최신 먼저, 연도 없는 항목은 맨 뒤.
      const num = (r: CslItem) => {
        const n = parseInt(r.year || '', 10)
        return Number.isFinite(n) ? n : -Infinity
      }
      arr.sort((a, b) => num(b) - num(a))
    } else {
      arr.sort((a, b) => (a.title || LAST).localeCompare(b.title || LAST, 'ko'))
    }
    return arr
  }, [references, query, sortKey])

  const bibliography = useMemo(
    () => formatBibliography(references, style, { groupByScript }),
    [references, style, groupByScript],
  )
  const bibLines = useMemo(
    () => (bibliography ? bibliography.split('\n') : []),
    [bibliography],
  )

  const flash = (setter: (v: string) => void, msg: string, ms = 2400) => {
    setter(msg)
    window.setTimeout(() => setter(''), ms)
  }

  const onAdd = () => {
    const id = addReference({ type: 'article', title: '', authors: [] })
    setSelectedId(id)
  }

  const onImport = () => {
    const text = importText.trim()
    if (!text) return
    // .bib 는 '@', .ris 는 'TY  -' 패턴으로 추정. 둘 다 시도해 더 많이 파싱된 쪽 채택.
    let items: CslItem[] = []
    if (/^\s*@/m.test(text) && !/^\s*TY\s{0,2}-/m.test(text)) {
      items = parseBibtex(text)
    } else if (/^\s*TY\s{0,2}-/m.test(text)) {
      items = parseRis(text)
    } else {
      const b = parseBibtex(text)
      const r = parseRis(text)
      items = b.length >= r.length ? b : r
    }
    if (!items.length) {
      flash(setImportMsg, '가져올 항목을 찾지 못했습니다. BibTeX(.bib) 또는 RIS(.ris) 형식인지 확인하세요.')
      return
    }
    let firstId = ''
    for (const it of items) {
      // id 는 store 에서 새로 발급되므로 제외하고 전달.
      const { id: _omit, ...rest } = it
      void _omit
      const newId = addReference(rest)
      if (!firstId) firstId = newId
    }
    if (firstId) setSelectedId(firstId)
    setImportText('')
    flash(setImportMsg, `${items.length}개 출처를 가져왔습니다.`)
  }

  const patch = (changes: Partial<CslItem>) => {
    if (!selected) return
    updateReference({ ...selected, ...changes })
  }

  const onDelete = () => {
    if (!selected) return
    deleteReference(selected.id)
    setSelectedId(null)
  }

  const copy = (text: string, label: string) => {
    if (!text) return
    const done = () => flash(setCopyMsg, label)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => flash(setCopyMsg, '복사에 실패했습니다.'))
    } else {
      flash(setCopyMsg, '클립보드를 사용할 수 없습니다.')
    }
  }

  const onCopyBibliography = () => {
    copy(stripEmphasis(bibliography), '서지를 클립보드에 복사했습니다.')
  }

  const onCopyInline = (item: CslItem) => {
    // IEEE 번호식 인용([n])은 서지 등장순 번호가 필요하므로 전체 목록을 함께 전달.
    copy(stripEmphasis(formatInline(item, style, references)), '본문 인용을 복사했습니다.')
  }

  // 본문(활성 에디터) 커서 위치에 인라인 인용을 직접 삽입. FormatBar 의 커스텀 이벤트 경로를 재사용.
  // 참고문헌 뷰와 에디터 뷰는 상호배타적이라 라이브 에디터(.paper)가 떠 있을 때만 즉시 삽입되고,
  // 없으면(현재 뷰엔 에디터가 없음) 클립보드 복사로 안전하게 폴백한다(원고 손실 없음).
  const onInsertCitation = (item: CslItem) => {
    const raw = formatInline(item, style, references)
    if (!raw) return
    // '편집 가능한' 라이브 에디터만 인정(리뷰 F5) — QuickRef 의 읽기 전용 .paper 가 떠 있으면
    // 삽입이 안 됐는데 성공 토스트만 뜨던 문제. 에디터가 없으면 클립보드 폴백이 정상 동작한다.
    const hasLivePaper = !!document.querySelector('.paper[contenteditable="true"][data-doc-id]')
    if (hasLivePaper) {
      // chicago 등은 *별표* 강조 마커를 포함하므로 <em> HTML 로 변환해 전달.
      window.dispatchEvent(
        new CustomEvent('scriv:insertCitation', {
          detail: { html: renderEmphasis(raw), text: stripEmphasis(raw) },
        }),
      )
      flash(setCopyMsg, '본문 커서 위치에 인용을 삽입했습니다.')
    } else {
      copy(stripEmphasis(raw), '에디터가 열려 있지 않아 인용을 클립보드에 복사했습니다.')
    }
  }

  const onAppendToDocument = () => {
    if (!activeId) return
    if (!references.length) return
    const sorted = bibLines // 이미 스타일별 정렬/번호 반영된 줄.
    const body = sorted.map((line) => `<p>${renderEmphasis(line)}</p>`).join('')
    // 제목 텍스트가 비어 있으면 제목을 생략(중복/번역 제목을 피할 수 있게).
    const heading = headingText.trim()
    const headHtml = heading ? `<h2>${escapeHtml(heading)}</h2>` : ''
    appendToDocument(activeId, `${headHtml}${body}`)
    // 실행 전에 이미 추가했는지 확인할 방법이 없으므로, 실행 시 중복 누적 위험을 명확히 안내한다.
    flash(
      setCopyMsg,
      '문서 끝에 서지 문단을 추가했습니다. 다시 누르면 중복 추가됩니다 — 갱신하려면 기존 서지 문단을 지우고 다시 추가하세요. (Ctrl+Z 되돌리기 가능)',
      6000,
    )
  }

  const labelOf = (t: RefType) => REF_TYPES.find((x) => x.key === t)?.label || t

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* 상단 툴바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'var(--chrome)',
          borderBottom: '1px solid var(--border-dark)',
          flexShrink: 0,
        }}
      >
        <strong style={{ color: 'var(--text)', fontSize: 14 }}>참고문헌</strong>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          출처 {references.length}개
          {query.trim() && visibleRefs.length !== references.length ? ` · 검색 일치 ${visibleRefs.length}개` : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ color: 'var(--muted)', fontSize: 12 }}>인용 스타일</label>
          <select
            className="field"
            value={style}
            onChange={(e) => setStyle(e.target.value as CiteStyle)}
            style={{ width: 130 }}
          >
            {CITE_STYLES.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABELS[s]}
              </option>
            ))}
          </select>
          <label
            style={{ color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
            title="국내문헌과 국외문헌을 소제목으로 나눠 각각 정렬합니다(국내 학술지 관례)."
          >
            <input
              type="checkbox"
              checked={groupByScript}
              onChange={(e) => setGroupByScript(e.target.checked)}
            />
            국문/영문 분리
          </label>
        </div>
      </div>

      {/* 본문: 좌(목록) · 우(편집) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* 좌측: 출처 목록 + 추가 + 가져오기 */}
        <div
          style={{
            width: 320,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-dark)',
            background: 'var(--panel)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button className="btn-primary" style={{ width: '100%' }} onClick={onAdd}>
              + 출처 추가
            </button>
          </div>

          {/* 검색 + 정렬 (출처가 있을 때만 노출) */}
          {references.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '8px 10px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <input
                className="field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색 (제목/저자)"
                aria-label="출처 검색"
                style={{ flex: 1, minWidth: 0, fontSize: 12 }}
              />
              <select
                className="field"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as RefSortKey)}
                aria-label="출처 정렬"
                title="목록 정렬 기준 (연도는 최신 먼저). 서지 미리보기 순서는 인용 스타일 규칙을 따로 따릅니다."
                style={{ width: 86, flexShrink: 0, fontSize: 12 }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {references.length === 0 ? (
              <div style={{ padding: '24px 16px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, textAlign: 'center' }}>
                아직 등록된 출처가 없습니다.
                <br />
                <b>+ 출처 추가</b>로 직접 입력하거나, 아래에서 BibTeX(.bib)·RIS(.ris)를 붙여넣어 가져오세요.
              </div>
            ) : visibleRefs.length === 0 ? (
              /* 검색 중인데 일치하는 출처가 없는 빈 상태 */
              <div style={{ padding: '24px 16px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, textAlign: 'center' }}>
                "{query.trim()}" 검색 결과가 없습니다.
                <br />
                <button className="minibtn" style={{ marginTop: 8 }} onClick={() => setQuery('')}>
                  검색 지우기
                </button>
              </div>
            ) : (
              visibleRefs.map((r) => {
                const active = r.id === selectedId
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--text)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: active ? 'rgba(255,255,255,0.22)' : 'var(--chrome-2)',
                          color: active ? '#fff' : 'var(--muted)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {labelOf(r.type)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title || '(제목 없음)'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                        color: active ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(r.authors || []).filter(Boolean).join(', ') || '저자 미상'}
                      {r.year ? ` · ${r.year}` : ''}
                    </div>
                    {(r.doi || r.url) && (
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 2,
                          color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={r.doi || r.url}
                      >
                        {r.doi ? `DOI: ${r.doi}` : r.url}
                      </div>
                    )}
                    <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
                      <button
                        className="minibtn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInsertCitation(r)
                        }}
                        disabled={!activeId}
                        title={activeId ? `현재 스타일(${STYLE_LABELS[style]})로 본문 커서 위치에 인용 삽입` : '먼저 문서를 열어주세요'}
                      >
                        본문에 인용
                      </button>
                      <button
                        className="minibtn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopyInline(r)
                        }}
                        title={`현재 스타일(${STYLE_LABELS[style]})로 본문 인용 복사`}
                      >
                        인용 복사
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 가져오기 */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>BibTeX / RIS 가져오기</div>
            <textarea
              className="field"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'@article{...} 또는\nTY  - JOUR\n... 형식을 붙여넣기'}
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <button className="minibtn" onClick={onImport} disabled={!importText.trim()}>
                가져오기
              </button>
              {importMsg && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{importMsg}</span>}
            </div>
          </div>
        </div>

        {/* 우측: 편집 폼 + 서지 미리보기 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* 편집 폼 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>
            {!selected ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginTop: 24 }}>
                왼쪽 목록에서 출처를 선택하면 여기서 편집할 수 있습니다.
                <br />
                새 출처는 <b>+ 출처 추가</b> 버튼으로 만드세요.
              </div>
            ) : (
              <RefForm
                key={selected.id}
                item={selected}
                onPatch={patch}
                onDelete={onDelete}
                typeLabel={labelOf}
              />
            )}
          </div>

          {/* 서지 미리보기 */}
          <div
            style={{
              borderTop: '1px solid var(--border-dark)',
              background: 'var(--chrome-2)',
              flexShrink: 0,
              maxHeight: '42%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <strong style={{ fontSize: 12, color: 'var(--text)' }}>
                참고문헌 미리보기 · {STYLE_LABELS[style]}
              </strong>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                {copyMsg && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{copyMsg}</span>}
                <input
                  className="field"
                  value={headingText}
                  onChange={(e) => setHeadingText(e.target.value)}
                  placeholder="제목 (비우면 생략)"
                  title="문서에 추가할 때 붙일 제목. 비우면 제목 없이 서지만 추가합니다 (예: References / 참고문헌)."
                  style={{ width: 130, fontSize: 11 }}
                />
                <button className="minibtn" onClick={onCopyBibliography} disabled={!bibliography}>
                  서지 복사
                </button>
                <button
                  className="minibtn"
                  onClick={onAppendToDocument}
                  disabled={!activeId || !references.length}
                  title={
                    activeId
                      ? '열려 있는 문서 끝에 서지 문단을 추가합니다. 다시 누르면 같은 서지가 중복 추가됩니다 — 갱신하려면 문서에서 기존 서지 문단을 지우고 다시 추가하세요.'
                      : '먼저 문서를 열어주세요'
                  }
                >
                  끝에 추가(서지 문단)
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 14px',
                background: 'var(--paper)',
                minHeight: 0,
              }}
            >
              {bibLines.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>출처를 추가하면 서지 목록이 생성됩니다.</div>
              ) : (
                bibLines.map((line, i) => (
                  <p
                    key={i}
                    style={{
                      margin: '0 0 8px',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text)',
                      textIndent: '-1.4em',
                      paddingLeft: '1.4em',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderEmphasis(line) }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 출처 편집 폼
// ---------------------------------------------------------------------------

function RefForm({
  item,
  onPatch,
  onDelete,
  typeLabel,
}: {
  item: CslItem
  onPatch: (changes: Partial<CslItem>) => void
  onDelete: () => void
  typeLabel: (t: RefType) => string
}) {
  // 저자는 줄바꿈 구분 textarea. 입력 중에는 원시 문자열을 로컬로 보존하고(줄바꿈/빈 줄 유지),
  // onBlur 에서만 배열로 커밋해 둘째 저자 줄바꿈이 즉시 삭제되던 문제를 막는다. key={selected.id} 로 항목 전환 시 재마운트됨.
  const [authorsText, setAuthorsText] = useState(() => (item.authors || []).join('\n'))
  const commitAuthors = () => onPatch({ authors: authorsText.split('\n').map((s) => s.trim()).filter(Boolean) })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 3,
  }
  const fieldFull: React.CSSProperties = { width: '100%' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <strong style={{ fontSize: 13, color: 'var(--text)' }}>출처 편집</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{typeLabel(item.type)}</span>
        <button className="minibtn danger" style={{ marginLeft: 'auto' }} onClick={onDelete}>
          삭제
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>유형</label>
          <select
            className="field"
            value={item.type}
            onChange={(e) => onPatch({ type: e.target.value as RefType })}
            style={{ width: 200 }}
          >
            {REF_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>제목</label>
          <input
            className="field"
            style={fieldFull}
            value={item.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="문헌 제목"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>저자 (한 줄에 한 명, "성, 이름" 또는 "이름 성")</label>
          <textarea
            className="field"
            style={{ ...fieldFull, resize: 'vertical', minHeight: 60 }}
            value={authorsText}
            onChange={(e) => setAuthorsText(e.target.value)}
            onBlur={commitAuthors}
            placeholder={'홍길동\nDoe, John'}
            rows={3}
          />
        </div>

        <div>
          <label style={labelStyle}>발행연도</label>
          <input
            className="field"
            style={fieldFull}
            value={item.year || ''}
            onChange={(e) => onPatch({ year: e.target.value || undefined })}
            placeholder="2024"
          />
        </div>
        <div>
          <label style={labelStyle}>수록처 (저널/책/사이트)</label>
          <input
            className="field"
            style={fieldFull}
            value={item.container || ''}
            onChange={(e) => onPatch({ container: e.target.value || undefined })}
            placeholder="학술지명 · 단행본명 등"
          />
        </div>

        <div>
          <label style={labelStyle}>출판사</label>
          <input
            className="field"
            style={fieldFull}
            value={item.publisher || ''}
            onChange={(e) => onPatch({ publisher: e.target.value || undefined })}
          />
        </div>
        <div>
          <label style={labelStyle}>면수 (pages)</label>
          <input
            className="field"
            style={fieldFull}
            value={item.pages || ''}
            onChange={(e) => onPatch({ pages: e.target.value || undefined })}
            placeholder="12-34"
          />
        </div>

        <div>
          <label style={labelStyle}>권 (volume)</label>
          <input
            className="field"
            style={fieldFull}
            value={item.volume || ''}
            onChange={(e) => onPatch({ volume: e.target.value || undefined })}
          />
        </div>
        <div>
          <label style={labelStyle}>호 (issue)</label>
          <input
            className="field"
            style={fieldFull}
            value={item.issue || ''}
            onChange={(e) => onPatch({ issue: e.target.value || undefined })}
          />
        </div>

        <div>
          <label style={labelStyle}>URL</label>
          <input
            className="field"
            style={fieldFull}
            value={item.url || ''}
            onChange={(e) => onPatch({ url: e.target.value || undefined })}
            placeholder="https://"
          />
        </div>
        <div>
          <label style={labelStyle}>DOI</label>
          <input
            className="field"
            style={fieldFull}
            value={item.doi || ''}
            onChange={(e) => onPatch({ doi: e.target.value || undefined })}
            placeholder="10.xxxx/..."
          />
        </div>
      </div>
    </div>
  )
}
