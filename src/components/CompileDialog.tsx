import { useEffect, useMemo, useState } from 'react'
import { useModal } from './useModal'
import {
  compile,
  compileSections,
  defaultCompileOptions,
  type CompileOptions,
  type SectionLayout,
  type Separator,
} from '../compile/compile'
import { downloadBlob, downloadText } from '../persistence'
import { sanitizeFileName } from '../persistence/pack'
import { useStore } from '../store/store'
import { sectionsToDocx } from '../export/docx'
import { sectionsToEpub } from '../export/epub'
import { sectionsToMarkdown } from '../export/markdown'
import { sectionsToFountain } from '../export/fountain'
import { paragraphsToFdx, sectionsToFdxParagraphs } from '../export/fdx'
import { sectionsToOdt } from '../export/odt'
import { sectionsToLatex } from '../export/latex'
import { printToPdf } from '../export/printPdf'
import { Icon } from '../ui/icons'

// 포맷 버튼 공통: 툴팁(title) + 버튼 아래 한 줄 용도 서브텍스트. styles.css 수정 없이 인라인 스타일만 사용.
function FmtBtn({
  label,
  desc,
  title,
  disabled,
  primary,
  onClick,
}: {
  label: string
  desc: string
  title?: string
  disabled: boolean
  primary?: boolean
  onClick: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <button className={primary ? 'btn-primary' : 'btn-ghost'} disabled={disabled} title={title || desc} onClick={onClick}>
        {label}
      </button>
      <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{desc}</span>
    </div>
  )
}

export default function CompileDialog({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const selectedIds = useStore((s) => s.selectedIds)
  const [opts, setOpts] = useState<CompileOptions>(defaultCompileOptions)
  const [group, setGroup] = useState<string>('manuscript')
  const [busy, setBusy] = useState(false)
  const [lastMsg, setLastMsg] = useState('')
  // 작성자(저자). 프로젝트 스키마에 저자 필드가 없으므로 원고 손실 위험 없이 브라우저(localStorage)에
  // 프로젝트별로 보존한다(프로젝트별 키 → 전역 키 순으로 기본값). 비어있어도 안전.
  const authorKey = `compile.author:${project.id}`
  const [author, setAuthor] = useState<string>(() => {
    try {
      return localStorage.getItem(authorKey) || localStorage.getItem('compile.author') || ''
    } catch {
      return ''
    }
  })
  const setAuthorPersist = (v: string) => {
    setAuthor(v)
    try {
      localStorage.setItem(authorKey, v)
      localStorage.setItem('compile.author', v)
    } catch {
      /* noop */
    }
  }
  const flash = (m: string) => window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m }))

  const applyGroup = (g: string) => {
    setGroup(g)
    if (g === 'manuscript' || g === 'selection') setOpts((o) => ({ ...o, groupItemIds: null }))
    else {
      const col = project.collections.find((c) => c.id === g)
      setOpts((o) => ({ ...o, groupItemIds: col ? col.itemIds : null }))
    }
  }

  // '선택한 문서'는 다이얼로그가 열린 채 선택이 바뀌어도 실시간 반영
  const effectiveOpts = useMemo(
    () => (group === 'selection' ? { ...opts, groupItemIds: selectedIds } : opts),
    [opts, group, selectedIds],
  )
  const result = useMemo(() => compile(project, effectiveOpts), [project, effectiveOpts])
  // 한국어 기준 분량: 단어 수와 동일 소스(result.text = docToPlainText 결과)에서 글자 수·원고지 매수 산출.
  // 공백 포함은 줄바꿈만 제외, 공백 제외는 모든 공백 문자 제외. 원고지는 200자 기준 올림(ceil).
  const charStats = useMemo(() => {
    const withSpaces = result.text.replace(/\r?\n/g, '').length
    const noSpaces = result.text.replace(/\s+/g, '').length
    return { withSpaces, noSpaces, sheets: noSpaces > 0 ? Math.ceil(noSpaces / 200) : 0 }
  }, [result.text])
  const base = sanitizeFileName(project.title)
  const authorTrim = author.trim()
  const meta = { title: project.title, language: 'ko', ...(authorTrim ? { author: authorTrim } : {}) }
  const noTarget = group === 'selection' && selectedIds.length === 0
  const isEmpty = noTarget || result.documentCount === 0

  // 옵션/대상/저자가 바뀌면 직전 성공 메시지를 지워, 바뀐 설정의 결과를 '방금 내보낸 것'으로 오인하지 않게 한다.
  useEffect(() => {
    setLastMsg('')
  }, [effectiveOpts, group, authorTrim])

  // 각본 포맷(Fountain/FDX) 안내·미리보기. 요소 타입은 텍스트 휴리스틱으로 추정되므로 손실이 있을 수 있다.
  const [showScript, setShowScript] = useState(false)
  const scriptPreview = useMemo(() => {
    if (!showScript || isEmpty) return ''
    try {
      return sectionsToFountain(compileSections(project, effectiveOpts), meta)
    } catch (e) {
      console.warn(e)
      return ''
    }
    // meta 는 effectiveOpts/저자에 의해 재생성되므로 의존성은 하위 항목으로 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScript, isEmpty, project, effectiveOpts, authorTrim])

  const set = (patch: Partial<CompileOptions>) => setOpts((o) => ({ ...o, ...patch }))

  // 모든 내보내기를 공통 래퍼로 — 진행/성공/실패 피드백 + 빈 결과 차단
  const run = async (label: string, fn: () => void | Promise<void>) => {
    if (isEmpty) return flash('내보낼 문서가 없습니다.')
    setBusy(true)
    setLastMsg('')
    try {
      await fn()
      setLastMsg(`✓ ${base} — ${label} 내보냄 (브라우저 다운로드 폴더 확인)`)
    } catch (e) {
      console.warn(e)
      flash(`${label} 내보내기 실패`)
    } finally {
      setBusy(false)
    }
  }

  const exportFormat = (fmt: string, label: string) =>
    run(label, async () => {
      const sections = compileSections(project, effectiveOpts)
      if (fmt === 'docx') downloadBlob(await sectionsToDocx(sections, meta), base + '.docx')
      else if (fmt === 'epub') downloadBlob(await sectionsToEpub(sections, meta), base + '.epub')
      else if (fmt === 'md') downloadText(sectionsToMarkdown(sections, meta), base + '.md', 'text/markdown')
      else if (fmt === 'fountain') downloadText(sectionsToFountain(sections, meta), base + '.fountain', 'text/plain')
      else if (fmt === 'fdx') downloadText(paragraphsToFdx(sectionsToFdxParagraphs(sections)), base + '.fdx', 'application/xml')
      else if (fmt === 'odt') downloadBlob(await sectionsToOdt(sections, meta), base + '.odt')
      else if (fmt === 'latex') downloadText(sectionsToLatex(sections, meta), base + '.tex', 'application/x-tex')
    })

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 720 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="compile" size={18} mono />컴파일 / 내보내기</h2>
        <div className="modal-body">
          <div className="compile-cols">
            <div className="compile-opts">
              <label className="fld">
                <span>컴파일 대상</span>
                <select className="field" value={group} onChange={(e) => applyGroup(e.target.value)}>
                  <option value="manuscript">원고 전체</option>
                  <option value="selection">선택한 문서 ({selectedIds.length})</option>
                  {project.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      컬렉션: {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fld">
                <span>작성자</span>
                <input
                  className="field"
                  value={author}
                  onChange={(e) => setAuthorPersist(e.target.value)}
                  placeholder="저자 이름 (DOCX/ePub 표지·메타데이터)"
                  aria-label="작성자"
                />
              </label>
              <label className="fld">
                <span>제목 표시</span>
                <input
                  type="checkbox"
                  checked={opts.includeTitles}
                  onChange={(e) => set({ includeTitles: e.target.checked })}
                />{' '}
                문서/폴더 제목을 제목 스타일로 포함
              </label>
              <label className="fld">
                <span>제목 레벨</span>
                <select
                  className="field"
                  value={opts.titleLevel}
                  onChange={(e) => set({ titleLevel: +e.target.value as 1 | 2 | 3 })}
                >
                  <option value={1}>제목 1</option>
                  <option value={2}>제목 2</option>
                  <option value={3}>제목 3</option>
                </select>
              </label>
              <label className="fld">
                <span>문서 구분</span>
                <select
                  className="field"
                  value={opts.separator}
                  onChange={(e) => set({ separator: e.target.value as Separator })}
                >
                  <option value="blank">빈 줄</option>
                  <option value="rule">구분 기호 (⁂)</option>
                  <option value="none">없음</option>
                </select>
              </label>
              <label className="fld">
                <input
                  type="checkbox"
                  checked={opts.onlyIncluded}
                  onChange={(e) => set({ onlyIncluded: e.target.checked })}
                />{' '}
                "컴파일에 포함"된 문서만
              </label>
              <label className="fld">
                <input
                  type="checkbox"
                  checked={opts.numberChapters}
                  onChange={(e) => set({ numberChapters: e.target.checked })}
                />{' '}
                폴더에 장 번호 매기기
              </label>
              {opts.numberChapters && (
                <label className="fld">
                  <span>장 번호 형식 ({'{n}'} = 번호)</span>
                  <input
                    className="field"
                    value={opts.chapterPrefix}
                    onChange={(e) => set({ chapterPrefix: e.target.value })}
                  />
                </label>
              )}
              <label className="fld">
                <input
                  type="checkbox"
                  checked={opts.honorPageBreaks}
                  onChange={(e) => set({ honorPageBreaks: e.target.checked })}
                />{' '}
                "페이지 나눔" 적용
              </label>
              <label className="fld">
                <input
                  type="checkbox"
                  checked={!!opts.substitutions}
                  onChange={(e) => set({ substitutions: e.target.checked })}
                />{' '}
                활자 치환 (직선 따옴표→“ ”, ...→…, --→—, ***→⁂)
              </label>
              {project.sectionTypes.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>섹션 레이아웃 (섹션 타입별 서식)</div>
                  {project.sectionTypes.map((st) => {
                    const lay = opts.sectionLayouts?.[st.id] || {}
                    const setLay = (patch: Partial<SectionLayout>) =>
                      set({ sectionLayouts: { ...opts.sectionLayouts, [st.id]: { ...lay, ...patch } } })
                    return (
                      <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 5 }}>
                        <span style={{ width: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.name}</span>
                        <select value={lay.titleLevel ?? ''} onChange={(e) => setLay({ titleLevel: e.target.value ? Number(e.target.value) : undefined })}>
                          <option value="">제목 레벨(기본)</option>
                          <option value="1">제목 H1</option>
                          <option value="2">제목 H2</option>
                          <option value="3">제목 H3</option>
                          <option value="4">제목 H4</option>
                        </select>
                        <select value={lay.align ?? ''} onChange={(e) => setLay({ align: (e.target.value || undefined) as SectionLayout['align'] })}>
                          <option value="">정렬(기본)</option>
                          <option value="left">왼쪽</option>
                          <option value="center">가운데</option>
                          <option value="right">오른쪽</option>
                          <option value="justify">양쪽</option>
                        </select>
                        <label style={{ whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={!!lay.suppressTitle} onChange={(e) => setLay({ suppressTitle: e.target.checked })} /> 제목 숨김
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                문서 {result.documentCount}개 · {charStats.withSpaces.toLocaleString()}자
                <span style={{ opacity: 0.8 }}>(공백 포함)</span> · {charStats.noSpaces.toLocaleString()}자
                <span style={{ opacity: 0.8 }}>(공백 제외)</span>
                <br />
                200자 원고지 약 {charStats.sheets.toLocaleString()}매 · 약 {result.wordCount.toLocaleString()} 단어
                <span style={{ opacity: 0.8 }}>(영문 기준)</span>
              </div>
              {isEmpty && (
                <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>
                  {noTarget
                    ? '선택한 문서가 없습니다. 바인더에서 문서를 선택하면 내보내기 버튼이 활성화됩니다.'
                    : opts.onlyIncluded
                      ? '"컴파일에 포함"된 문서가 없습니다. 아래 옵션을 끄거나 인스펙터에서 문서를 포함시키세요.'
                      : '대상에 문서가 없습니다. 컴파일 대상을 바꾸거나 원고에 문서를 추가하세요.'}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{showScript ? '각본(Fountain) 미리보기' : '미리보기'}</span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  aria-pressed={showScript}
                  onClick={() => setShowScript((v) => !v)}
                >
                  {showScript ? '일반 미리보기' : '각본 미리보기'}
                </button>
              </div>
              {showScript ? (
                <pre
                  className="compile-preview"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono, monospace)', fontSize: 12, margin: 0 }}
                >
                  {scriptPreview || (isEmpty ? '' : '(미리보기를 생성할 수 없습니다)')}
                </pre>
              ) : (
                <div className="compile-preview" dangerouslySetInnerHTML={{ __html: result.html }} />
              )}
              {showScript && (
                <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 6, lineHeight: 1.5 }}>
                  각본 포맷(Fountain/FDX)은 요소 타입(장면 표제·등장인물·대사·지문 등)을 본문 텍스트에서
                  휴리스틱으로 추정합니다. 추정이 빗나가면 일부 요소가 액션/지문으로 떨어지는 등 손실이 있을 수 있으니,
                  위 미리보기로 결과를 확인하세요.
                </div>
              )}
            </div>
          </div>
        </div>
        {lastMsg && (
          <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--ok)', borderTop: '1px solid var(--border)' }}>
            {lastMsg}
          </div>
        )}
        <div className="modal-foot" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button className="btn-ghost" onClick={onClose}>
            닫기
          </button>
          {busy && <span style={{ fontSize: 12, color: 'var(--muted)' }}>내보내는 중…</span>}
          {isEmpty && !busy && (
            <span style={{ fontSize: 11.5, color: 'var(--warn)', alignSelf: 'center' }}>
              내보낼 문서가 없어 내보내기 버튼이 비활성화되어 있습니다.
            </span>
          )}
          <span style={{ flex: 1 }} />
          <FmtBtn
            label="TXT"
            desc="순수 텍스트"
            title="서식 없는 순수 텍스트 — 메모장 등 어디서나 열립니다."
            disabled={isEmpty || busy}
            onClick={() => run('TXT', () => downloadText(result.text, base + '.txt', 'text/plain'))}
          />
          <FmtBtn
            label="HTML"
            desc="웹 문서"
            title="브라우저에서 바로 열리는 웹 문서입니다."
            disabled={isEmpty || busy}
            onClick={() => run('HTML', () => downloadText(result.html, base + '.html', 'text/html'))}
          />
          <FmtBtn
            label="Markdown"
            desc="블로그·깃허브"
            title="마크다운 — 블로그·깃허브 등 텍스트 기반 플랫폼용입니다."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('md', 'Markdown')}
          />
          <FmtBtn
            label="Fountain"
            desc="각본 교환"
            title="각본 교환용 평문 포맷. 요소 타입을 텍스트 휴리스틱으로 추정해 일부 손실될 수 있습니다. '각본 미리보기'로 확인하세요."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('fountain', 'Fountain')}
          />
          <FmtBtn
            label="FDX"
            desc="Final Draft 각본"
            title="파이널 드래프트(Final Draft)용 각본. 요소 타입을 텍스트 휴리스틱으로 추정해 일부 손실될 수 있습니다. '각본 미리보기'로 확인하세요."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('fdx', 'FDX')}
          />
          <FmtBtn
            label="LaTeX"
            desc="논문·조판"
            title="LaTeX 조판 소스 — 논문·학술 문서 제출용입니다."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('latex', 'LaTeX')}
          />
          <FmtBtn
            label="ODT"
            desc="리브레오피스"
            title="오픈도큐먼트 텍스트 — 리브레오피스·구글 문서용입니다."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('odt', 'ODT')}
          />
          <FmtBtn
            label="ePub"
            desc="전자책"
            title="전자책 표준 포맷 — 리디·교보 등 뷰어용, Kindle Send-to-Kindle 호환."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('epub', 'ePub')}
          />
          <FmtBtn
            label="DOCX"
            desc="워드·한글 제출용"
            title="마이크로소프트 워드 문서 — 워드/한글에서 열어 출판사·공모전 제출용으로 적합합니다."
            disabled={isEmpty || busy}
            onClick={() => exportFormat('docx', 'DOCX')}
          />
          <FmtBtn
            label="PDF"
            desc="인쇄·교정지"
            title="브라우저 인쇄 창을 열어 PDF로 저장합니다 — 인쇄·교정지용."
            disabled={isEmpty || busy}
            onClick={() => { if (!isEmpty) { printToPdf(result.html, project.title); flash('PDF 인쇄 창을 열었습니다.') } }}
          />
          <FmtBtn
            label="RTF"
            desc="기본 · 서식 그대로"
            title="서식을 보존하는 리치 텍스트 — 이 앱의 원본 포맷 그대로 내보냅니다."
            disabled={isEmpty || busy}
            primary
            onClick={() => run('RTF', () => downloadText(result.rtf, base + '.rtf', 'application/rtf'))}
          />
        </div>
      </div>
    </div>
  )
}
