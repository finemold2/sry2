// 단축키 치트시트(#21) — 흩어져 있던 단축키를 한 장으로. 플랫폼에 맞춰 ⌘/Ctrl 자동 표기.
import { useModal } from './useModal'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform || '')
/** '⌘⇧K' 같은 축약 표기를 플랫폼 표기로: 맥은 그대로, 윈도우/리눅스는 Ctrl+Shift+K. */
export function kbd(mac: string): string {
  if (IS_MAC) return mac
  return mac
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    .replace(/↵/g, 'Enter')
    .replace(/\+\+/g, '+')
}

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: '기본',
    rows: [
      ['⌘S', '저장(자동 저장도 항상 동작)'],
      ['⌘K', '명령 팔레트 — 모든 기능·도구 검색(한글 초성 지원)'],
      ['⌘F', '문서 내 찾기·바꾸기'],
      ['Esc', '모달/패널/집중 모드 닫기'],
    ],
  },
  {
    title: '화면(뷰) 전환',
    rows: [
      ['⌘1 ~ ⌘9', '에디터·코르크보드·아웃라이너·칸반·캔버스·연재·타임라인·참고문헌·DB'],
      ['⌘⇧A', '논증 작업대'],
      ['⌘⇧B / ⌘⇧I', '바인더 / 인스펙터 접기·펴기'],
      ['⌘⇧L', '테마 전환(라이트·다크·세피아)'],
    ],
  },
  {
    title: '집필',
    rows: [
      ['⌘B / ⌘I / ⌘U', '굵게 / 기울임 / 밑줄'],
      ['⌘⇧↵', '집중 모드(현재 창/새 창 선택)'],
      ['⌘⇧K', '캐럿 위치에서 문서 분할'],
      ['⌘PgUp / ⌘PgDn', '이전 / 다음 문서'],
      ['⌥← / ⌥→', '뒤로 / 앞으로(문서 내비게이션)'],
    ],
  },
  {
    title: '바인더·캔버스',
    rows: [
      ['F2', '이름 바꾸기(바인더)'],
      ['Delete', '휴지통으로(바인더) · 카드 삭제(캔버스)'],
      ['⌘Z', '캔버스 카드 삭제 되돌리기'],
      ['⌥↑ / ⌥↓', '항목 위/아래 이동(바인더)'],
    ],
  },
]

export default function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const ref = useModal<HTMLDivElement>(onClose)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-label="단축키 도움말" onClick={(e) => e.stopPropagation()} style={{ width: 640, maxHeight: '84vh', display: 'flex', flexDirection: 'column' }}>
        <h2>⌨️ 단축키 한눈에</h2>
        <div className="modal-body" style={{ overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 22px' }}>
          {GROUPS.map((g) => (
            <section key={g.title} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', margin: '8px 0 6px' }}>{g.title}</div>
              {g.rows.map(([k, desc]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '3px 0', fontSize: 12.5 }}>
                  <code style={{ flexShrink: 0, minWidth: 118 }}>{kbd(k)}</code>
                  <span style={{ color: 'var(--text)' }}>{desc}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '10px 0 0' }}>
          {IS_MAC ? '⌘=Command, ⇧=Shift, ⌥=Option 입니다.' : '이 표기는 Windows 기준(Ctrl/Shift/Alt)으로 자동 변환되어 있어요.'} 더 많은 기능은 ⌘K 명령 팔레트에서 검색하세요.
        </p>
        <div className="modal-foot"><button className="btn-primary" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  )
}
