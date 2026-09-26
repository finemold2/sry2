import { useState } from 'react'
import { useModal } from './useModal'
import { useStore } from '../store/store'
import { rtfToPlainText } from '../rtf'
import {
  AI_ACTIONS,
  DEFAULT_AI,
  MODEL_SUGGESTIONS,
  loadAiSettings,
  runAi,
  saveAiSettings,
  type AiProvider,
  type AiSettings,
} from '../ai/ai'

export default function AiModal({ onClose }: { onClose: () => void }) {
  const activeId = useStore((s) => s.activeId)
  const item = useStore((s) => (s.activeId ? s.project.items[s.activeId] : null))
  const appendToDocument = useStore((s) => s.appendToDocument)
  const setSynopsis = useStore((s) => s.setSynopsis)

  const initialText = item ? item.plainText || rtfToPlainText(item.bodyRtf) : ''
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings)
  const [showSettings, setShowSettings] = useState(!loadAiSettings().apiKey)
  // 키를 브라우저(localStorage)에 저장할지 여부. 이미 저장된 키가 있으면 켜진 상태로 시작.
  const [persistKey, setPersistKey] = useState(() => !!loadAiSettings().apiKey)
  const [input, setInput] = useState(initialText)
  const [custom, setCustom] = useState('')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // 비-키 설정(provider/model/baseUrl)은 항상 저장, 키는 persistKey 가 켜졌을 때만 저장.
  const update = (patch: Partial<AiSettings>, persist = persistKey) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveAiSettings(persist ? next : { ...next, apiKey: '' })
  }

  const togglePersist = (on: boolean) => {
    setPersistKey(on)
    saveAiSettings(on ? settings : { ...settings, apiKey: '' })
  }

  const run = async (system: string, user: string) => {
    setErr('')
    setBusy(true)
    setOutput('')
    try {
      const text = await runAi(settings, system, user)
      setOutput(text)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const insertToBody = () => {
    if (!activeId || !output) return
    // 이스케이프를 먼저, 줄바꿈 변환을 나중에(<br> 가 이스케이프되지 않도록)
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const html = output
      .split(/\n{2,}/)
      .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('')
    appendToDocument(activeId, html)
    onClose()
  }

  const copyOut = () => {
    const ok = !!navigator.clipboard
    if (ok) navigator.clipboard.writeText(output).catch(() => {})
    window.dispatchEvent(new CustomEvent('scriv:flash', { detail: ok ? '복사됨' : '복사를 지원하지 않는 환경입니다' }))
  }

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 640 }} ref={dialogRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>AI 어시스턴트 (내 API 키)</h2>
        <div className="modal-body">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            키는 이 브라우저에만 저장되며 서버를 거치지 않고 제공자 API 로 직접 전송됩니다.{' '}
            <button className="linkbtn" onClick={() => setShowSettings((v) => !v)}>
              {showSettings ? '설정 숨기기' : '설정 보기'}
            </button>
          </div>

          {showSettings && (
            <div className="insp-section" style={{ background: 'var(--chrome)', padding: 10, borderRadius: 6 }}>
              <div className="row">
                <select
                  className="field"
                  value={settings.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AiProvider
                    update({ provider, model: MODEL_SUGGESTIONS[provider][0] || settings.model })
                  }}
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">커스텀 (OpenAI 호환)</option>
                </select>
                <input
                  className="field"
                  list="ai-models"
                  placeholder="모델명"
                  value={settings.model}
                  onChange={(e) => update({ model: e.target.value })}
                />
                <datalist id="ai-models">
                  {(MODEL_SUGGESTIONS[settings.provider] || []).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <input
                className="field"
                style={{ marginTop: 6 }}
                type="password"
                placeholder="API 키"
                value={settings.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              {settings.provider === 'custom' && (
                <input
                  className="field"
                  style={{ marginTop: 6 }}
                  placeholder="베이스 URL (예: https://my-host/v1)"
                  value={settings.baseUrl}
                  onChange={(e) => update({ baseUrl: e.target.value })}
                />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12 }}>
                <input type="checkbox" checked={persistKey} onChange={(e) => togglePersist(e.target.checked)} />
                이 브라우저에 키 저장 (공용 PC 면 끄세요 — 끄면 이 세션에서만 사용)
              </label>
              <button
                className="minibtn"
                style={{ marginTop: 6 }}
                onClick={() => {
                  setSettings({ ...DEFAULT_AI })
                  setPersistKey(false)
                  saveAiSettings({ ...DEFAULT_AI })
                }}
              >
                키 지우기 / 기본값으로
              </button>
            </div>
          )}

          <label className="fld">
            <span>대상 텍스트 (현재 문서에서 불러옴 — 편집 가능)</span>
            <textarea className="field" style={{ minHeight: 120 }} value={input} onChange={(e) => setInput(e.target.value)} />
          </label>

          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {AI_ACTIONS.map((a) => (
              <button
                key={a.id}
                className="minibtn"
                disabled={busy || !input.trim()}
                onClick={() => run(a.system, a.wrap(input))}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="row" style={{ marginTop: 8 }}>
            <input
              className="field"
              placeholder="직접 지시 (예: 이 장면을 더 긴장감 있게)"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button
              className="minibtn"
              style={{ flex: '0 0 auto' }}
              disabled={busy || !custom.trim()}
              onClick={() => run('당신은 한국어 글쓰기 보조원입니다.', input.trim() ? `${custom}\n\n---\n${input}` : custom)}
            >
              실행
            </button>
          </div>

          {busy && <div style={{ marginTop: 10, color: 'var(--muted)' }}>생성 중…</div>}
          {err && <div style={{ marginTop: 10, color: 'var(--warn)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{err}</div>}
          {output && (
            <div style={{ marginTop: 10 }}>
              <textarea className="field" style={{ minHeight: 140 }} value={output} onChange={(e) => setOutput(e.target.value)} />
              <div className="row" style={{ marginTop: 6 }}>
                <button className="minibtn" onClick={copyOut}>
                  복사
                </button>
                <button className="minibtn" disabled={!activeId} onClick={insertToBody}>
                  본문 끝에 추가
                </button>
                <button
                  className="minibtn"
                  disabled={!activeId}
                  onClick={() => {
                    if (activeId) setSynopsis(activeId, output)
                    onClose()
                  }}
                >
                  시놉시스로 설정
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
