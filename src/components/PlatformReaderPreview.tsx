// 웹소설 플랫폼 모바일 독자뷰 미리보기 — 내가 쓴 회차가 실제 연재 플랫폼(문피아·네이버시리즈·
// 카카오페이지·노벨피아·리디·조아라)의 "독자 화면(모바일)"에서 어떻게 보이는지 미리본다.
// 펜시브/뮤블의 플랫폼 프리셋·독자뷰에 대응하는 코어 기능. 실제 프로젝트 회차(원고 문서)를 그대로 렌더한다.
import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useModal } from './useModal'
import { sceneList } from '../creative/scenes'
import { rtfToPlainText, parseRtf, type Block } from '../rtf'
import { PLATFORM_READER_PRESETS, type ReaderPreset } from '../export/platforms'
import { Icon } from '../ui/icons'

/** 경량 인라인 조각: 굵게/기울임 등 강조만 보존(독자뷰 근사 렌더용). */
type Frag = { text: string; bold?: boolean; italic?: boolean; underline?: boolean }
/** 독자뷰 렌더 노드: 본문 문단 또는 장면 전환 구분선. */
type RenderPara = { kind: 'para'; frags: Frag[]; text: string } | { kind: 'sep' }

/** RTF 모델 블록 → 경량 문단. 굵게/기울임/밑줄과 장면 전환(hr·빈 줄)을 보존한다. */
function blocksToParas(blocks: Block[]): RenderPara[] {
  const out: RenderPara[] = []
  for (const b of blocks) {
    if (b.type === 'hr') { out.push({ kind: 'sep' }); continue }
    const frags: Frag[] = b.runs
      .filter((r) => r.text)
      .map((r) => ({ text: r.text, bold: r.style.bold, italic: r.style.italic, underline: r.style.underline }))
    const text = frags.map((f) => f.text).join('').trim()
    if (!text) { out.push({ kind: 'sep' }); continue } // 빈 줄 = 장면 전환
    out.push({ kind: 'para', frags, text })
  }
  // 연속/선두/말미 구분선 정리(중복 빈 줄을 하나의 전환으로).
  const cleaned: RenderPara[] = []
  for (const p of out) {
    if (p.kind === 'sep') {
      if (cleaned.length === 0 || cleaned[cleaned.length - 1].kind === 'sep') continue
    }
    cleaned.push(p)
  }
  while (cleaned.length && cleaned[cleaned.length - 1].kind === 'sep') cleaned.pop()
  return cleaned
}

/** 평문 폴백 → 문단 배열(빈 줄 제거). 웹소설은 줄바꿈 단위가 곧 문단. */
function plainToParas(text: string): RenderPara[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ kind: 'para', frags: [{ text: s }], text: s }) as RenderPara)
}

/** RTF 본문 → 독자뷰 문단 배열. 서식(굵게/기울임/장면구분)을 보존하고, 실패 시 평문으로 폴백. */
function bodyParagraphs(item: { bodyRtf?: string; plainText?: string }): RenderPara[] {
  if (item.bodyRtf) {
    try { return blocksToParas(parseRtf(item.bodyRtf).blocks) } catch { /* 평문 폴백 */ }
  }
  let text = item.plainText || ''
  if (!text && item.bodyRtf) {
    try { text = rtfToPlainText(item.bodyRtf) } catch { text = '' }
  }
  return plainToParas(text)
}

type ThemeOverride = 'preset' | 'light' | 'dark'

export default function PlatformReaderPreview({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const dialogRef = useModal<HTMLDivElement>(onClose)

  const episodes = useMemo(() => sceneList(project), [project])
  // 회차 드롭다운은 회차번호(episode.number, 없으면 읽기순서) 기준 정렬해 대시보드와 순서를 일치시킨다.
  // 읽기순서 인덱스(readIndex)는 번호 미부여 시 표시번호 폴백으로 보존한다.
  const sortedEpisodes = useMemo(() => {
    return episodes
      .map((e, i) => ({ ep: e, readIndex: i, num: e.item.episode?.number ?? i + 1 }))
      .sort((a, b) => a.num - b.num || a.readIndex - b.readIndex)
  }, [episodes])
  const initialId = episodes.find((e) => e.id === activeId)?.id || episodes[0]?.id || ''
  const [docId, setDocId] = useState(initialId)
  const [presetId, setPresetId] = useState(PLATFORM_READER_PRESETS[0].id)
  const [fontDelta, setFontDelta] = useState(0)
  const [themeOv, setThemeOv] = useState<ThemeOverride>('preset')
  const [wide, setWide] = useState(false)

  const preset = PLATFORM_READER_PRESETS.find((p) => p.id === presetId) || PLATFORM_READER_PRESETS[0]
  const ep = episodes.find((e) => e.id === docId) || episodes[0]
  const paras = useMemo(() => (ep ? bodyParagraphs(ep.item) : []), [ep])
  // 공백 포함 글자수(작가 멘탈모델) — 문단 텍스트를 공백으로 이어 길이 측정(구분선 제외).
  const chars = useMemo(
    () => paras.filter((p) => p.kind === 'para').map((p) => (p as { text: string }).text).join(' ').trim().length,
    [paras],
  )

  // 테마 적용(프리셋 기본 또는 사용자 오버라이드).
  const dark = themeOv === 'preset' ? preset.theme === 'dark' : themeOv === 'dark'
  const bg = dark ? (preset.theme === 'dark' ? preset.bg : '#1c1f24') : (preset.theme === 'light' ? preset.bg : '#ffffff')
  const fg = dark ? '#e6e6e6' : (preset.theme === 'light' ? preset.fg : '#222222')
  const fontPx = Math.max(12, Math.min(26, preset.fontPx + fontDelta))
  const widthPx = preset.widthPx + (wide ? 90 : 0)

  const compliance: { tier: 'short' | 'ok' | 'long'; label: string } =
    chars < preset.recMin ? { tier: 'short', label: '권장보다 짧음' }
      : chars > preset.recMax ? { tier: 'long', label: '권장보다 김' }
        : { tier: 'ok', label: '적정 분량' }
  const compColor = compliance.tier === 'ok' ? 'var(--ok)' : 'var(--accent-2, #e8842b)'

  const openInEditor = () => { if (ep) { select(ep.id); setView('editor'); onClose() } }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="device" size={18} />웹소설 플랫폼 독자뷰 미리보기</h2>
        <div className="modal-body" style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {episodes.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>원고에 회차(본문 문서)를 추가하면 독자뷰로 미리볼 수 있습니다.</div>
          ) : (
            <>
              {/* 회차 선택 + 플랫폼 칩 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="fld" style={{ minWidth: 220 }}>
                  <span>회차</span>
                  <select className="field" value={docId} onChange={(e) => setDocId(e.target.value)}>
                    {sortedEpisodes.map(({ ep: e, num }) => <option key={e.id} value={e.id}>{num}화 · {e.title}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PLATFORM_READER_PRESETS.map((p) => (
                  <button key={p.id} className={'minibtn' + (p.id === presetId ? ' active' : '')} onClick={() => setPresetId(p.id)}>{p.name}</button>
                ))}
              </div>
              {/* 리더 컨트롤 */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  글자크기
                  <button className="minibtn" onClick={() => setFontDelta((d) => d - 1)}>A−</button>
                  <span style={{ minWidth: 28, textAlign: 'center' }}>{fontPx}px</span>
                  <button className="minibtn" onClick={() => setFontDelta((d) => d + 1)}>A+</button>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  테마
                  <button className={'minibtn' + (themeOv === 'preset' ? ' active' : '')} onClick={() => setThemeOv('preset')}>기본</button>
                  <button className={'minibtn' + (themeOv === 'light' ? ' active' : '')} onClick={() => setThemeOv('light')}>밝게</button>
                  <button className={'minibtn' + (themeOv === 'dark' ? ' active' : '')} onClick={() => setThemeOv('dark')}>어둡게</button>
                </span>
                <button className={'minibtn' + (wide ? ' active' : '')} onClick={() => setWide((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={wide ? 'device' : 'maximize'} size={14} mono />{wide ? '모바일' : '넓게'}</button>
              </div>

              {/* 폰 프레임 + 분량 패널 */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: widthPx + 24, background: '#0d0f12', borderRadius: 30, padding: '14px 12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,.35)', flexShrink: 0,
                }}>
                  {/* 노치 */}
                  <div style={{ height: 5, width: 90, background: '#33373d', borderRadius: 3, margin: '0 auto 10px' }} />
                  <div style={{ background: bg, color: fg, borderRadius: 18, height: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* 리더 상단바 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${dark ? '#2c3036' : '#eee'}`, fontSize: 12, opacity: .8 }}>
                      <span>‹</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name} · {ep?.item.episode?.number ?? ''}{ep?.item.episode?.number ? '화' : ''}</span>
                      <span>Aa</span>
                    </div>
                    {/* 본문 */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px 28px' }}>
                      <div style={{ fontWeight: 700, fontSize: fontPx + 2, marginBottom: 18, fontFamily: preset.fontFamily }}>{ep?.title}</div>
                      {paras.length === 0 ? (
                        <div style={{ opacity: .5, fontSize: 13 }}>(본문이 비어 있습니다)</div>
                      ) : paras.map((p, i) => (
                        p.kind === 'sep' ? (
                          <div key={i} aria-hidden="true" style={{
                            textAlign: 'center', opacity: .45, letterSpacing: '.4em',
                            margin: `${preset.paraGap + 8}px 0`, fontSize: fontPx,
                          }}>* * *</div>
                        ) : (
                          <p key={i} style={{
                            margin: `0 0 ${preset.paraGap}px`,
                            fontFamily: preset.fontFamily, fontSize: fontPx, lineHeight: preset.lineHeight,
                            letterSpacing: `${preset.letterSpacing}em`,
                            textIndent: preset.indent ? '1em' : 0,
                            wordBreak: 'keep-all', overflowWrap: 'anywhere',
                          }}>{p.frags.map((f, j) => (
                            <span key={j} style={{
                              fontWeight: f.bold ? 700 : undefined,
                              fontStyle: f.italic ? 'italic' : undefined,
                              textDecoration: f.underline ? 'underline' : undefined,
                            }}>{f.text}</span>
                          ))}</p>
                        )
                      ))}
                    </div>
                  </div>
                </div>

                {/* 분량/가이드 패널 */}
                <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>현재 회차 분량 (공백 포함)</div>
                    <div style={{ fontSize: 26, fontWeight: 700 }}>{chars.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 400 }}>자</span></div>
                    <div style={{ fontSize: 12.5, color: compColor, fontWeight: 600, marginTop: 2 }}>● {compliance.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{preset.name} 권장 <b>{preset.recMin.toLocaleString()}~{preset.recMax.toLocaleString()}자</b></div>
                    {/* 분량 게이지 */}
                    <div style={{ height: 8, background: 'var(--panel)', borderRadius: 4, marginTop: 8, position: 'relative', overflow: 'hidden' }}>
                      <span style={{ position: 'absolute', left: `${Math.min(100, (preset.recMin / (preset.recMax * 1.3)) * 100)}%`, width: `${Math.min(100, ((preset.recMax - preset.recMin) / (preset.recMax * 1.3)) * 100)}%`, top: 0, bottom: 0, background: 'rgba(15,157,88,.25)' }} />
                      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, (chars / (preset.recMax * 1.3)) * 100)}%`, background: compColor, opacity: .8 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{preset.note}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, opacity: .8 }}>
                    ※ 분량·스타일은 플랫폼 관행 기준의 가이드 근사치입니다. 실제 표시는 독자 설정·플랫폼 정책에 따라 달라질 수 있습니다.
                  </div>
                  <button className="btn-ghost" onClick={openInEditor} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="editor" size={14} mono />이 회차 편집하기</button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
