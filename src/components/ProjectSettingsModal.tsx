import { useState } from 'react'
import { useModal } from './useModal'
import { Trash2 } from 'lucide-react'
import { Icon } from '../ui/icons'
import { useStore } from '../store/store'
import type { CustomMetaField } from '../model'

export default function ProjectSettingsModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const addLabel = useStore((s) => s.addLabel)
  const updateLabel = useStore((s) => s.updateLabel)
  const deleteLabel = useStore((s) => s.deleteLabel)
  const addStatus = useStore((s) => s.addStatus)
  const deleteStatus = useStore((s) => s.deleteStatus)
  const addSectionType = useStore((s) => s.addSectionType)
  const renameSectionType = useStore((s) => s.renameSectionType)
  const deleteSectionType = useStore((s) => s.deleteSectionType)
  const addCustomField = useStore((s) => s.addCustomField)
  const deleteCustomField = useStore((s) => s.deleteCustomField)
  const setProjectTarget = useStore((s) => s.setProjectTarget)
  const setSessionTarget = useStore((s) => s.setSessionTarget)
  const setDeadline = useStore((s) => s.setDeadline)
  const setAutosaveInterval = useStore((s) => s.setAutosaveInterval)
  const toggleAutoComplete = useStore((s) => s.toggleAutoComplete)
  const addAutoComplete = useStore((s) => s.addAutoComplete)
  const removeAutoComplete = useStore((s) => s.removeAutoComplete)
  const patchSettings = useStore((s) => s.patchSettings)

  const [acWord, setAcWord] = useState('')
  const [labelName, setLabelName] = useState('')
  const [labelColor, setLabelColor] = useState('#4285f4')
  const [statusName, setStatusName] = useState('')
  const [stName, setStName] = useState('')
  const [cfName, setCfName] = useState('')
  const [cfType, setCfType] = useState<CustomMetaField['type']>('text')

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 620 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>프로젝트 설정</h2>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 라벨 */}
          <div className="insp-section">
            <label>라벨</label>
            {project.labels.map((l) => (
              <div className="row" key={l.id} style={{ marginBottom: 4 }}>
                <input
                  type="color"
                  value={l.color}
                  disabled={l.id === 'label-none'}
                  onChange={(e) => updateLabel({ ...l, color: e.target.value })}
                  style={{ flex: '0 0 28px', width: 28, height: 24, padding: 0, border: 'none' }}
                />
                <input
                  className="field"
                  value={l.name}
                  disabled={l.id === 'label-none'}
                  onChange={(e) => updateLabel({ ...l, name: e.target.value })}
                />
                {l.id !== 'label-none' && (
                  <button className="minibtn danger" style={{ flex: '0 0 auto' }} onClick={() => deleteLabel(l.id)}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} style={{ flex: '0 0 28px', width: 28, height: 24, padding: 0, border: 'none' }} />
              <input className="field" placeholder="새 라벨" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
              <button
                className="minibtn"
                style={{ flex: '0 0 auto' }}
                onClick={() => {
                  if (labelName.trim()) {
                    addLabel(labelName.trim(), labelColor)
                    setLabelName('')
                  }
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 상태 */}
          <div className="insp-section">
            <label>상태</label>
            {project.statuses.map((s) => (
              <div className="row" key={s.id} style={{ marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                {s.id !== 'status-none' && (
                  <button className="minibtn danger" style={{ flex: '0 0 auto' }} onClick={() => deleteStatus(s.id)}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <input className="field" placeholder="새 상태" value={statusName} onChange={(e) => setStatusName(e.target.value)} />
              <button className="minibtn" style={{ flex: '0 0 auto' }} onClick={() => { if (statusName.trim()) { addStatus(statusName.trim()); setStatusName('') } }}>+</button>
            </div>
          </div>

          {/* 섹션 타입 */}
          <div className="insp-section">
            <label>섹션 타입 (컴파일용)</label>
            {project.sectionTypes.map((t) => (
              <div className="row" key={t.id} style={{ marginBottom: 4 }}>
                <input className="field" value={t.name} onChange={(e) => renameSectionType(t.id, e.target.value)} />
                <button className="minibtn danger" style={{ flex: '0 0 auto' }} onClick={() => deleteSectionType(t.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <input className="field" placeholder="새 섹션 타입" value={stName} onChange={(e) => setStName(e.target.value)} />
              <button className="minibtn" style={{ flex: '0 0 auto' }} onClick={() => { if (stName.trim()) { addSectionType(stName.trim()); setStName('') } }}>+</button>
            </div>
          </div>

          {/* 커스텀 메타데이터 */}
          <div className="insp-section">
            <label>커스텀 메타데이터</label>
            {project.customFields.map((f) => (
              <div className="row" key={f.id} style={{ marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {f.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({f.type})</span>
                </span>
                <button className="minibtn danger" style={{ flex: '0 0 auto' }} onClick={() => deleteCustomField(f.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <input className="field" placeholder="필드 이름" value={cfName} onChange={(e) => setCfName(e.target.value)} />
              <select className="field" style={{ flex: '0 0 90px' }} value={cfType} onChange={(e) => setCfType(e.target.value as CustomMetaField['type'])}>
                <option value="text">텍스트</option>
                <option value="checkbox">체크박스</option>
                <option value="list">목록</option>
                <option value="date">날짜</option>
              </select>
              <button className="minibtn" style={{ flex: '0 0 auto' }} onClick={() => { if (cfName.trim()) { addCustomField(cfName.trim(), cfType); setCfName('') } }}>+</button>
            </div>
          </div>

          {/* 자동완성 */}
          <div className="insp-section" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, textTransform: 'none' }}>
              <input className="switch" type="checkbox" checked={project.settings.autoComplete !== false} onChange={() => toggleAutoComplete()} />
              자동완성 사용 (캐릭터 이름·키워드·아래 목록을 입력 중 제안)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {(project.settings.autoCompleteList || []).map((w) => (
                <span key={w} className="ac-tag">
                  {w}
                  <button onClick={() => removeAutoComplete(w)} title="삭제">
                    <Icon name="close" size={12} mono />
                  </button>
                </span>
              ))}
              {(project.settings.autoCompleteList || []).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>직접 등록한 단어가 없습니다(캐릭터·키워드는 자동 포함).</span>
              )}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input
                className="field"
                placeholder="자동완성 단어 추가 (예: 발할라, 엘드리치…)"
                value={acWord}
                onChange={(e) => setAcWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && acWord.trim()) {
                    addAutoComplete(acWord.trim())
                    setAcWord('')
                  }
                }}
              />
              <button
                className="minibtn"
                style={{ flex: '0 0 auto' }}
                onClick={() => {
                  if (acWord.trim()) {
                    addAutoComplete(acWord.trim())
                    setAcWord('')
                  }
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 목표 */}
          <div className="insp-section" style={{ gridColumn: '1 / -1' }}>
            <label>목표 · 마감</label>
            <div className="row">
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>목표 단위</span>
              <select
                className="field"
                value={project.settings.targetUnit ?? 'words'}
                onChange={(e) => patchSettings({ targetUnit: e.target.value === 'chars' ? 'chars' : 'words' })}
              >
                <option value="words">단어</option>
                <option value="chars">글자(자)</option>
              </select>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>
                하단 바의 문서·세션·원고 진행률을 이 단위로 계산합니다. 한국어 원고는 보통 '자(글자)' 기준으로 목표를 잡습니다.
              </span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>원고 목표({project.settings.targetUnit === 'chars' ? '글자' : '단어'})</span>
              <input className="field" type="number" min={0} value={project.settings.projectTarget} onChange={(e) => setProjectTarget(Math.max(0, parseInt(e.target.value) || 0))} />
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>세션 목표({project.settings.targetUnit === 'chars' ? '글자' : '단어'})</span>
              <input className="field" type="number" min={0} value={project.settings.sessionTarget} onChange={(e) => setSessionTarget(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>마감일</span>
              <input className="field" type="date" value={project.settings.deadline || ''} onChange={(e) => setDeadline(e.target.value)} />
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>
                설정하면 하단 바에 "오늘 권장 단어"가 마감 역산으로 표시됩니다.
              </span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>자동 저장</span>
              <select
                className="field"
                value={String(project.settings.autosaveInterval ?? 1500)}
                onChange={(e) => setAutosaveInterval(parseInt(e.target.value, 10))}
              >
                <option value="500">매우 자주 (0.5초)</option>
                <option value="1500">기본 (1.5초)</option>
                <option value="3000">느슨 (3초)</option>
                <option value="10000">아주 느슨 (10초)</option>
                <option value="0">끔 (수동 저장만)</option>
              </select>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>
                변경 후 이 시간이 지나면 자동으로 저장됩니다(저장 버튼 불필요).
              </span>
            </div>
          </div>

          <div className="insp-section" style={{ gridColumn: '1 / -1' }}>
            <label>에디터 타이포그래피 (읽기 편의)</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>프리셋</span>
              <button className="minibtn" onClick={() => patchSettings({ editorWidth: 760, editorParaGap: 0, editorLineHeight: 1.0 })}>기본</button>
              <button className="minibtn" onClick={() => patchSettings({ editorWidth: 680, editorParaGap: 1.1, editorLineHeight: 1.9 })}>웹소설(여백 큼)</button>
              <button className="minibtn" onClick={() => patchSettings({ editorWidth: 620, editorParaGap: 0, editorLineHeight: 1.75 })}>집중(좁게)</button>
              <button className="minibtn" onClick={() => patchSettings({ editorWidth: 960, editorParaGap: 0, editorLineHeight: 1.7 })}>넓게</button>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>편집창 폭(px)</span>
              <input className="field" type="number" min={420} max={1400} step={20} value={project.settings.editorWidth ?? 760} onChange={(e) => patchSettings({ editorWidth: Math.max(420, Math.min(1400, parseInt(e.target.value) || 760)) })} />
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>문단 간격(em)</span>
              <input className="field" type="number" min={0} max={3} step={0.1} value={project.settings.editorParaGap ?? 0} onChange={(e) => patchSettings({ editorParaGap: Math.max(0, Math.min(3, parseFloat(e.target.value) || 0)) })} />
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span style={{ flex: '0 0 110px', fontSize: 12 }}>줄간격(배수)</span>
              <input className="field" type="number" min={0.5} max={2} step={0.1} value={project.settings.editorLineHeight ?? 1.0} onChange={(e) => patchSettings({ editorLineHeight: Math.max(0.5, Math.min(2, parseFloat(e.target.value) || 1.0)) })} />
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}>
                본문 편집 화면의 폭·문단 간격·줄간격을 조절합니다(글꼴/크기는 서식 바에서).
              </span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  )
}
