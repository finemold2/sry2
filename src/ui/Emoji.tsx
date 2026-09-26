// 안전한 React 이모지 컴포넌트 — OS 기본 이모지 대신 로컬 Twemoji SVG(<img>)를 렌더.
// 런타임 DOM 치환(파서) 방식은 React 소유 노드와 충돌(removeChild 크래시)·미보유 무한루프 위험이 있어 폐기하고
// 이 컴포넌트로 전환했다. React 가 노드를 소유하므로 재렌더/제거가 안전하다.
//  · 매니페스트(EMOJI_FILES)에 있는 이모지만 <img> 로, 없으면 원문 글자 그대로 → 404·깨짐·정보 손실 없음.
//  · 로드 실패 시에도 원문 글자로 폴백(setState). alt 에 원문 보존.
//  · 경로는 import.meta.env.BASE_URL 반영 → 서브패스 배포에서도 정확.
import { useState } from 'react'
import { EMOJI_FILES } from './emoji-manifest'

// Vite base 경로(서브패스 배포 대응). 타입 의존 없이 안전하게 읽음.
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'

const U200D = 0x200d, UFE0F = 0xfe0f, UFE0E = 0xfe0e
function fileName(grapheme: string): string {
  const cps: number[] = []
  for (const ch of grapheme) cps.push(ch.codePointAt(0)!)
  const filtered = cps.includes(U200D) ? cps : cps.filter((c) => c !== UFE0F && c !== UFE0E)
  return filtered.map((c) => c.toString(16)).join('-')
}

export function Emoji({ e, size, label }: { e: string; size?: number; label?: string }) {
  const [failed, setFailed] = useState(false)
  const name = fileName(e)
  if (failed || !EMOJI_FILES.has(name)) return <>{e}</>
  const px = size ? { width: size, height: size } : undefined
  return (
    <img
      className="emoji"
      src={`${BASE}emoji/${name}.svg`}
      alt={label || e}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      draggable={false}
      style={px}
      onError={() => setFailed(true)}
    />
  )
}

// 문자열 안의 이모지를 <Emoji> 로 변환해 React 노드 배열로 반환(텍스트+이모지 혼합 라벨용). 안전(React 소유).
let _seg: Intl.Segmenter | null = null
const PICT = /\p{Extended_Pictographic}/u
export function emojify(text: string): React.ReactNode {
  if (!text || !PICT.test(text)) return text
  _seg ||= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const out: React.ReactNode[] = []
  let i = 0
  for (const { segment } of _seg.segment(text)) {
    if (PICT.test(segment)) out.push(<Emoji key={i++} e={segment} />)
    else { const last = out[out.length - 1]; if (typeof last === 'string') out[out.length - 1] = last + segment; else out.push(segment) }
  }
  return out
}
