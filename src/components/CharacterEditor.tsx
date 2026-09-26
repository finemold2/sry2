import { useStore } from '../store/store'
import type { BinderItem } from '../model'
import { CHARACTER_FIELDS, SETTING_FIELDS, EXTRA_FIELD_LABEL } from '../templates/docTemplates'

// 구조화 캐릭터/장소 카드 폼 에디터(type === 'character'). 필드 변경 시 본문 RTF 자동 생성.
export default function CharacterEditor({ item }: { item: BinderItem }) {
  const setCharacterField = useStore((s) => s.setCharacterField)
  const character = item.character || {}
  const isSetting = character._kind === 'setting'
  const defs = isSetting ? SETTING_FIELDS : CHARACTER_FIELDS
  // 스키마에 없는 항목(다른 도구에서 받은 성별·MBTI·기타·사용자 정의 항목 등)도 편집 가능하게 노출(손실 0).
  const known = new Set(defs.map((f) => f.key))
  const extraKeys = Object.keys(character).filter((k) => !known.has(k) && !k.startsWith('_') && k !== 'photo' && k !== 'photoCredit')
  const addField = () => {
    const label = window.prompt('추가할 항목 이름 (예: 최종목표):')
    const key = (label || '').trim()
    if (key && !(key in character)) setCharacterField(item.id, key, '')
  }

  return (
    <div className="char-editor">
      <div className="char-editor-inner">
        <div className="char-head">{isSetting ? '장소 / 배경 카드' : '등장인물 카드'}</div>
        {defs.map((f) => (
          <label className="char-field" key={f.key}>
            <span className="char-label">{f.label}</span>
            {f.multiline ? (
              <textarea
                className="field"
                value={character[f.key] || ''}
                onChange={(e) => setCharacterField(item.id, f.key, e.target.value)}
                rows={f.key === 'notes' || f.key === 'background' ? 4 : 2}
              />
            ) : (
              <input
                className="field"
                value={character[f.key] || ''}
                onChange={(e) => setCharacterField(item.id, f.key, e.target.value)}
              />
            )}
          </label>
        ))}
        {extraKeys.map((k) => (
          <label className="char-field" key={k}>
            <span className="char-label" style={{ color: 'var(--accent)' }}>{EXTRA_FIELD_LABEL[k] || k}</span>
            <textarea
              className="field"
              value={character[k] || ''}
              onChange={(e) => setCharacterField(item.id, k, e.target.value)}
              rows={2}
            />
          </label>
        ))}
        <button className="minibtn" onClick={addField} style={{ alignSelf: 'flex-start', marginTop: 4 }}>＋ 항목 추가</button>
        <div className="char-hint">
          입력 내용은 자동으로 본문(RTF)으로 저장되어 컴파일·검색·내보내기에 그대로 포함됩니다. 다른 도구에서 받은 항목·직접 추가한 항목도 함께 보존됩니다.
        </div>
      </div>
    </div>
  )
}
