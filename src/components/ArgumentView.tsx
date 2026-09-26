// 논증 작업대(Toulmin) — 주제문 + 주장(claim)들, 각 주장 아래 근거/전제/반박.
import { useMemo } from 'react'
import { useStore } from '../store/store'
import { Icon } from '../ui/icons'
import { formatInline } from '../creative/cite'
import type { ArgNode, ArgNodeType, CslItem, CiteStyle } from '../model'

// 근거의 본문 인용 표시에 쓰는 기본 인용 스타일(별도 설정 필드가 없어 APA 고정).
const ARG_CITE_STYLE: CiteStyle = 'apa'

// 자식 노드 타입별 구획 정의(라벨/아이콘/색).
const CHILD_SECTIONS: { type: ArgNodeType; label: string; icon: string; addLabel: string; color: string }[] = [
  { type: 'evidence', label: '근거', icon: 'reference', addLabel: '근거', color: 'var(--ok)' },
  { type: 'warrant', label: '전제', icon: 'link', addLabel: '전제', color: 'var(--accent-2)' },
  { type: 'rebuttal', label: '반박', icon: 'conflict', addLabel: '반박', color: 'var(--warn)' },
]

export default function ArgumentView() {
  const project = useStore((s) => s.project)
  const setThesis = useStore((s) => s.setThesis)
  const addArgNode = useStore((s) => s.addArgNode)
  const updateArgNode = useStore((s) => s.updateArgNode)
  const deleteArgNode = useStore((s) => s.deleteArgNode)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)

  const argument = project?.argument
  const nodes = argument?.nodes ?? []
  const claims = useMemo(() => nodes.filter((n) => n.type === 'claim'), [nodes])

  // 연결 가능한 참고문헌(출처). 근거 노드의 '출처 연결'에 사용.
  const references = useMemo<CslItem[]>(() => project?.references ?? [], [project])

  // 연결 가능한 문서(원고/캐릭터 문서, 루트 제외).
  const linkable = useMemo(() => {
    if (!project) return []
    return Object.values(project.items)
      .filter((it) => (it.type === 'text' || it.type === 'character') && !it.root)
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }, [project])

  if (!project) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>프로젝트를 먼저 열어주세요.</div>
      </div>
    )
  }

  const openDoc = (id: string) => {
    select(id)
    setView('editor')
  }

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--chrome)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>논증 작업대</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Toulmin 모형 · 주장마다 근거·전제로 뒷받침하고 반론을 검토하세요.
        </span>
      </div>

      {/* 본문(스크롤) */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* 주제문 */}
        <section style={{ marginBottom: 18 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 6,
            }}
          >
            주제문 (Thesis)
          </label>
          <textarea
            className="field"
            defaultValue={argument?.thesis ?? ''}
            onBlur={(e) => setThesis(e.target.value)}
            placeholder="이 글이 입증하려는 핵심 주장을 한두 문장으로 적어주세요."
            style={{
              width: '100%',
              minHeight: 64,
              resize: 'vertical',
              fontSize: 15,
              lineHeight: 1.5,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-dark)',
              background: 'var(--paper)',
              color: 'var(--text)',
              boxSizing: 'border-box',
            }}
          />
        </section>

        {/* 주장 목록 헤더 + 추가 버튼 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            주장 (Claims) · {claims.length}
          </span>
          <button
            className="minibtn"
            onClick={() => addArgNode({ type: 'claim', text: '', parentId: null })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="plus" size={13} mono />
            주장 추가
          </button>
        </div>

        {/* 빈 상태 */}
        {claims.length === 0 ? (
          <div style={emptyStyle}>
            아직 주장이 없습니다.
            <br />
            위의 <b>+ 주장 추가</b> 버튼으로 첫 주장을 만들고, 각 주장 아래에 근거·전제를 더하고
            반론을 검토해 보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {claims.map((claim, i) => (
              <ClaimCard
                key={claim.id}
                index={i}
                claim={claim}
                children={nodes.filter((n) => n.parentId === claim.id)}
                linkable={linkable}
                references={references}
                project={project}
                addArgNode={addArgNode}
                updateArgNode={updateArgNode}
                deleteArgNode={deleteArgNode}
                openDoc={openDoc}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type LinkItem = { id: string; title: string }

function ClaimCard({
  index,
  claim,
  children,
  linkable,
  references,
  addArgNode,
  updateArgNode,
  deleteArgNode,
  openDoc,
}: {
  index: number
  claim: ArgNode
  children: ArgNode[]
  linkable: LinkItem[]
  references: CslItem[]
  project: NonNullable<ReturnType<typeof useStore.getState>['project']>
  addArgNode: (node: Omit<ArgNode, 'id'>) => string
  updateArgNode: (id: string, patch: Partial<ArgNode>) => void
  deleteArgNode: (id: string) => void
  openDoc: (id: string) => void
}) {
  const evidenceCount = children.filter((c) => c.type === 'evidence').length
  const rebuttalCount = children.filter((c) => c.type === 'rebuttal').length

  return (
    <div
      style={{
        border: '1px solid var(--border-dark)',
        borderRadius: 10,
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      {/* 주장 헤더 */}
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--chrome-2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--accent)',
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}
        >
          주장 {index + 1}
        </span>
        <textarea
          className="field"
          defaultValue={claim.text}
          onBlur={(e) => updateArgNode(claim.id, { text: e.target.value })}
          placeholder="주장을 입력하세요."
          style={{
            flex: 1,
            minHeight: 38,
            resize: 'vertical',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--paper)',
            color: 'var(--text)',
            boxSizing: 'border-box',
          }}
        />
        <button
          className="minibtn"
          title="주장 삭제(하위 노드 포함)"
          onClick={() => {
            if (window.confirm('이 주장과 하위 근거·전제·반박을 모두 삭제할까요?'))
              deleteArgNode(claim.id)
          }}
          style={{ color: 'var(--warn)' }}
        >
          삭제
        </button>
      </div>

      {/* 약점 플래그 */}
      {(evidenceCount === 0 || rebuttalCount === 0) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '6px 12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--paper)',
          }}
        >
          {evidenceCount === 0 && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--warn)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="flag" size={13} mono />
              근거 없음
            </span>
          )}
          {rebuttalCount === 0 && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="dot" size={13} mono />
              반론 미검토
            </span>
          )}
        </div>
      )}

      {/* 자식 구획 */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CHILD_SECTIONS.map((sec) => {
          const items = children.filter((c) => c.type === sec.type)
          return (
            <div key={sec.type}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: sec.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name={sec.icon} size={14} mono />
                  {sec.label} · {items.length}
                </span>
                <button
                  className="minibtn"
                  onClick={() => addArgNode({ type: sec.type, text: '', parentId: claim.id })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="plus" size={13} mono />
                  {sec.addLabel}
                </button>
              </div>
              {items.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    padding: '4px 2px',
                  }}
                >
                  {sec.type === 'evidence'
                    ? '근거를 추가해 주장을 뒷받침하세요.'
                    : sec.type === 'warrant'
                      ? '근거와 주장을 잇는 전제(논리적 연결고리)를 적어보세요.'
                      : '예상되는 반론을 적고 어떻게 대응할지 검토하세요.'}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingLeft: 8,
                    borderLeft: `2px solid ${sec.color}`,
                  }}
                >
                  {items.map((node) => (
                    <ArgNodeRow
                      key={node.id}
                      node={node}
                      linkable={linkable}
                      references={references}
                      updateArgNode={updateArgNode}
                      deleteArgNode={deleteArgNode}
                      openDoc={openDoc}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ArgNodeRow({
  node,
  linkable,
  references,
  updateArgNode,
  deleteArgNode,
  openDoc,
}: {
  node: ArgNode
  linkable: LinkItem[]
  references: CslItem[]
  updateArgNode: (id: string, patch: Partial<ArgNode>) => void
  deleteArgNode: (id: string) => void
  openDoc: (id: string) => void
}) {
  const linked = node.itemId ? linkable.find((l) => l.id === node.itemId) : undefined
  // 출처 연결은 근거(evidence)에서만 노출 — 학술 논증의 근거는 보통 인용 출처에 매인다.
  const showRef = node.type === 'evidence'
  const linkedRef = node.refId ? references.find((r) => r.id === node.refId) : undefined
  const refCitation = linkedRef ? formatInline(linkedRef, ARG_CITE_STYLE, references) : ''
  const refTitle = (r: CslItem): string => {
    const author = (r.authors || []).map((a) => a.trim()).filter(Boolean)[0]
    const lead = [author, r.year].filter(Boolean).join(', ')
    const t = (r.title || '').trim() || '제목 없음'
    return lead ? `${t} (${lead})` : t
  }
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          className="field"
          defaultValue={node.text}
          onBlur={(e) => updateArgNode(node.id, { text: e.target.value })}
          placeholder="내용을 입력하세요."
          style={{
            flex: 1,
            minHeight: 32,
            resize: 'vertical',
            fontSize: 13,
            lineHeight: 1.4,
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            boxSizing: 'border-box',
          }}
        />
        <button
          className="minibtn"
          title="삭제"
          onClick={() => deleteArgNode(node.id)}
          style={{ color: 'var(--warn)', display: 'inline-flex', alignItems: 'center' }}
        >
          <Icon name="close" size={13} mono />
        </button>
      </div>

      {/* 문서 연결 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>문서:</span>
        <select
          className="field"
          value={node.itemId ?? ''}
          onChange={(e) =>
            updateArgNode(node.id, { itemId: e.target.value ? e.target.value : undefined })
          }
          style={{
            fontSize: 12,
            padding: '3px 6px',
            borderRadius: 5,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            maxWidth: 220,
          }}
        >
          <option value="">(연결 안 함)</option>
          {linkable.map((it) => (
            <option key={it.id} value={it.id}>
              {it.title || '제목 없음'}
            </option>
          ))}
          {/* 연결된 문서가 목록에 없을 때(삭제 등) 대비 */}
          {node.itemId && !linked && (
            <option value={node.itemId}>(삭제된 문서)</option>
          )}
        </select>
        {node.itemId && (
          <button className="minibtn" onClick={() => openDoc(node.itemId!)}>
            문서 열기
          </button>
        )}
      </div>

      {/* 출처(참고문헌) 연결 — 근거 노드에만 노출 */}
      {showRef && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>출처:</span>
          <select
            className="field"
            value={node.refId ?? ''}
            onChange={(e) =>
              updateArgNode(node.id, { refId: e.target.value ? e.target.value : undefined })
            }
            style={{
              fontSize: 12,
              padding: '3px 6px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              maxWidth: 220,
            }}
          >
            <option value="">(연결 안 함)</option>
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {refTitle(r)}
              </option>
            ))}
            {/* 연결된 출처가 목록에 없을 때(삭제 등) 대비 */}
            {node.refId && !linkedRef && (
              <option value={node.refId}>(삭제된 출처)</option>
            )}
          </select>
          {linkedRef && refCitation && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ok)',
                fontWeight: 600,
              }}
              title="본문 인용(APA)"
            >
              {refCitation}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--bg)',
}

const emptyStyle: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: 13,
  lineHeight: 1.6,
  padding: '28px 8px',
  textAlign: 'center',
}
