import { useLayoutEffect, useRef } from 'react'

// contenteditable 을 ref 로 제어한다. JSX children 으로 값을 넣으면 리렌더마다 DOM 이
// 덮어써져 캐럿/입력이 사라지므로, textContent 는 useEffect 에서만(포커스 없을 때) 갱신한다.
interface Props {
  value: string
  onCommit: (v: string) => void
  className?: string
  placeholder?: string
  ariaLabel?: string
  style?: React.CSSProperties
  stopClick?: boolean
}

export default function EditableText({ value, onCommit, className, placeholder, ariaLabel, style, stopClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel || placeholder}
      aria-placeholder={placeholder}
      data-ph={placeholder}
      style={style}
      onClick={stopClick ? (e) => e.stopPropagation() : undefined}
      onBlur={(e) => onCommit(e.currentTarget.textContent || '')}
    />
  )
}
