// 플랫폼별 발행 내보내기 — 완성 원고/회차를 대상 플랫폼 규격(BBCode/HTML/Markdown/평문)으로 변환해
// 복사·다운로드한다. 자동 게시는 서버가 필요하므로 '붙여넣기용 변환 + 회차별 분리'로 작가의 재가공을 줄인다.
import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useModal } from './useModal'
import { compileSections, defaultCompileOptions, type CompiledSection } from '../compile/compile'
import { PLATFORM_PRESETS, sectionsToBBCode, sectionsToPlatformHtml, sectionsToPlainPretty, type PlatformPreset } from '../export/platforms'

function render(sections: CompiledSection[], preset: PlatformPreset): string {
  switch (preset.format) {
    case 'bbcode': return sectionsToBBCode(sections)
    case 'html': return sectionsToPlatformHtml(sections)
    case 'markdown': return sectionsToPlatformHtml(sections) // 마크다운 프리셋도 시맨틱 HTML 이 붙여넣기 호환이 더 좋음
    default: return sectionsToPlainPretty(sections)
  }
}

export default function PlatformPublishModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const dialogRef = useModal<HTMLDivElement>(onClose)
  const [presetId, setPresetId] = useState(PLATFORM_PRESETS[0]?.id || '')
  const [perEpisode, setPerEpisode] = useState(false)
  const [flash, setFlash] = useState('')
  const preset = PLATFORM_PRESETS.find((p) => p.id === presetId) || PLATFORM_PRESETS[0]

  const sections = useMemo(() => compileSections(project, defaultCompileOptions), [project])
  // 회차(문서) 단위: 본문 블록이 있는 섹션만(폴더 제목 섹션 제외)
  const episodes = useMemo(() => sections.filter((s) => s.blocks.length > 0), [sections])
  const whole = useMemo(() => render(sections, preset), [sections, preset])

  const copy = (text: string, label: string) => {
    const done = (ok: boolean) => { setFlash(ok ? label + ' 복사됨' : '복사 실패'); setTimeout(() => setFlash(''), 1600) }
    const p = navigator.clipboard?.writeText(text)
    if (p) p.then(() => done(true)).catch(() => done(false))
    else done(false)
  }
  const download = (text: string, name: string) => {
    const ext = preset.format === 'html' ? 'html' : preset.format === 'markdown' ? 'md' : preset.format === 'bbcode' ? 'txt' : 'txt'
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 680, maxHeight: '84vh', display: 'flex', flexDirection: 'column' }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>플랫폼별 발행 내보내기</h2>
        <div className="modal-body" style={{ overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <label className="fld" style={{ flex: 1, minWidth: 200 }}>
              <span>대상 플랫폼</span>
              <select className="field" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                {PLATFORM_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.format})</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={perEpisode} onChange={(e) => setPerEpisode(e.target.checked)} />
              회차(문서)별로 분리
            </label>
          </div>
          {preset?.note && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{preset.note}</div>}

          {perEpisode ? (
            episodes.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>내보낼 회차(본문 문서)가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {episodes.map((sec, i) => {
                  const out = render([sec], preset)
                  return (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ flex: 1, fontSize: 13 }}>{sec.title || `${i + 1}화`}</b>
                        <button className="minibtn" onClick={() => copy(out, sec.title || `${i + 1}화`)}>복사</button>
                        <button className="minibtn" onClick={() => download(out, sec.title || `episode-${i + 1}`)}>다운로드</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn-primary" onClick={() => copy(whole, '전체')}>전체 복사</button>
                <button className="btn-ghost" onClick={() => download(whole, project.title || 'manuscript')}>파일 다운로드</button>
              </div>
              <textarea className="field" readOnly value={whole} style={{ width: '100%', height: 320, fontFamily: 'monospace', fontSize: 12 }} />
            </>
          )}
        </div>
        <div className="modal-foot">
          {flash && <span style={{ fontSize: 12, color: 'var(--ok)', marginRight: 'auto' }}>{flash}</span>}
          <button className="btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
