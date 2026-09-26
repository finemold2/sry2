// 로맨스 캐릭터 생성기 — 로맨스 코드(끌림·결핍·관계 역학)가 살아있는 인물을 무작위 생성(조합 350억+).
// react 와 './linkbus' 만 import. 완전 로컬.
import { useMemo, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'romance-charforge', name: '로맨스 캐릭터 생성기', icon: '💕', group: '캐릭터', genre: '로맨스', intro: '끌림·결핍·관계 역학이 살아있는 로맨스 인물을 무작위 생성', w: 560, h: 660 }

interface Slot { key: string; label: string; options: string[] }
const SLOTS: Slot[] = [
  { key: 'role', label: '역할', options: ['여주', '남주', '서브 남주', '서브 여주', '라이벌', '조력 친구', '전 연인', '짝사랑 상대', '연적', '큐피드 역', '운명의 상대'] },
  { key: 'type', label: '원형', options: ['까칠한 완벽주의자', '다정한 햇살형', '무심한 천재', '능글맞은 바람둥이 같지만 일편단심', '상처 많은 냉미남', '씩씩한 생활력 갑', '내성적인 모범생', '자유분방한 예술가', '책임감 강한 장남/장녀', '비밀 많은 재벌', '소꿉친구', '연하의 직진남/녀', '겉바속촉 츤데레'] },
  { key: 'charm', label: '매력 포인트', options: ['눈웃음', '낮은 목소리', '서툰 다정함', '의외의 허당미', '듬직한 책임감', '엉뚱한 4차원', '차분한 어른미', '장난스러운 미소', '묵묵한 배려', '도도한 자신감', '따뜻한 손', '한결같은 시선', '나른한 분위기'] },
  { key: 'wound', label: '상처/결핍', options: ['버림받은 과거', '가족의 기대에 짓눌림', '첫사랑의 배신', '완벽해야 한다는 강박', '사랑을 믿지 못함', '자존감 부족', '일 중독으로 외로움', '오래된 죄책감', '표현이 서툴러 늘 오해받음', '거절에 대한 두려움', '소중한 사람을 잃은 상실감'] },
  { key: 'motive', label: '연애 동기', options: ['진짜 내 편이 갖고 싶다', '과거를 극복하고 싶다', '계약/거래로 시작했다 진심이 됨', '복수하려다 사랑에 빠짐', '지키고 싶은 사람이 생겼다', '평범한 행복을 원함', '자신을 변화시키고 싶다', '외로움을 끝내고 싶다', '있는 그대로 사랑받고 싶다'] },
  { key: 'flaw', label: '결점', options: ['질투가 심함', '말보다 행동이 앞섬', '속마음을 숨김', '우유부단함', '지나친 자기희생', '욱하는 성미', '밀당을 못함', '과거에 매여 있음', '의심이 많음', '일을 우선시함', '거절을 못 함'] },
  { key: 'dynamic', label: '관계 역학', options: ['적에서 연인으로', '친구에서 연인으로', '계약/위장 연애', '재회·세컨드 찬스', '신분 차이', '소꿉친구의 짝사랑', '삼각관계', '느린 불씨(슬로우번)', '첫눈에 반함', '티격태격 라이벌', '보호자-피보호자', '운명적 재회', '오해에서 시작된 사랑'] },
  { key: 'speech', label: '말투/습관', options: ['무뚝뚝한 단답', '다정한 존댓말', '능청스러운 농담', '직설적인 돌직구', '시적인 표현', '서툰 사투리', '쿨한 척하는 반어', '조곤조곤 설득', '장난스러운 별명 부르기', '말끝을 흐리는 수줍음', '담담한 위로'] },
  { key: 'secret', label: '숨겨진 면', options: ['사실은 한결같이 지켜봐 왔다', '겉과 달리 여리다', '과거의 인연이 있었다', '가족을 위해 희생 중', '병/비밀을 숨기고 있다', '첫사랑을 못 잊었다', '의외의 취미가 있다', '냉정함은 연기다', '오래 짝사랑해 왔다', '신분을 숨기고 있다', '먼저 마음을 들킬까 봐 도망친다'] },
  { key: 'look', label: '외형 인상', options: ['단정한 슈트 차림', '헝클어진 머리의 무심한 멋', '서늘한 분위기의 미인', '편안한 니트 차림의 다정함', '날카로운 눈매와 곧은 자세', '소년 같은 맑은 얼굴', '우아한 손끝과 느린 동작', '운동으로 다져진 탄탄한 체격', '안경 너머의 차분한 눈빛', '흐트러짐 없는 차가운 인상', '잔잔한 미소가 어울리는 얼굴'] },
]
const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)
const ri = (n: number) => Math.floor(Math.random() * n)
// 받침 유무로 조사 선택(이중표기 노출 방지)
const hasJong = (w: string): boolean => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 }
const eul = (w: string) => w + (hasJong(w) ? '을' : '를')

export default function RomanceCharGen() {
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, ri(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]
  const addCustom = () => { const label = window.prompt('추가할 항목 이름을 입력하세요'); if (label && label.trim()) setCustom((c) => [...c, { id: `c${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: label.trim(), value: '' }]) }
  const setCustomVal = (id: string, value: string) => setCustom((c) => c.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((it) => it.id !== id))
  const clearCustom = () => { setCustom((c) => c.map((it) => ({ ...it, value: '' }))); setEtc('') }
  const extraFields = () => { const f: Record<string, string> = {}; custom.forEach((it) => { if (it.value.trim()) f[it.label] = it.value.trim() }); if (etc.trim()) f.etc = etc.trim(); return f }
  const rollAll = () => { clearCustom(); setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : ri(s.options.length)]))) }
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: ri(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggle = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const text = useMemo(() => {
    let t = `[${val('role')}] ${val('type')} — 매력은 ${val('charm')}. 첫인상으로 ${eul(val('look'))} 남긴다. 상처: ${val('wound')}. 연애 동기는 "${val('motive')}". 결점은 ${val('flaw')}. 관계 역학: ${val('dynamic')}. 말투는 ${val('speech')}. 숨겨진 면: ${val('secret')}.`
    const ce = custom.filter((it) => it.value.trim()).map((it) => `${it.label}: ${it.value.trim()}`)
    if (ce.length) t += ' ' + ce.join('. ') + '.'
    if (etc.trim()) t += ` 기타: ${etc.trim()}`
    return t
  }, [picks, custom, etc])
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1500) }
  const copy = () => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }
  const charFields = () => ({ name: `${val('role')} (${val('type')})`, role: val('role'), personality: `${val('type')} · 매력: ${val('charm')}`, appearance: val('look'), motivation: val('motive'), goal: val('motive'), flaw: val('flaw'), fear: val('wound'), secret: val('secret'), speech: val('speech'), relations: val('dynamic'), background: `상처: ${val('wound')}`, notes: `관계 역학: ${val('dynamic')} · 외형: ${val('look')}`, ...extraFields() })
  const toProject = () => { const id = addToProject({ kind: 'character', root: 'research', folder: '인물', title: `${val('role')} · ${val('type')}`, character: { name: `${val('role')} (${val('type')})`, role: val('role'), personality: `${val('type')} · 매력: ${val('charm')}`, appearance: val('look'), flaw: val('flaw'), fear: val('wound'), motivation: val('motive'), goal: val('motive'), speech: val('speech'), secret: val('secret'), relations: val('dynamic'), conflict: `상처: ${val('wound')} · 결점: ${val('flaw')}`, habits: val('speech'), notes: `관계 역학: ${val('dynamic')} · 외형: ${val('look')}`, ...extraFields() }, meta: { 역할: val('role'), 관계역학: val('dynamic') } }); flash(id ? '프로젝트 인물 카드 추가됨' : '프로젝트 미연결') }
  const toLib = () => { addToLibrary('characters', { name: `${val('role')} (${val('type')})`, role: val('role'), traits: SLOTS.map((s) => ({ k: s.label, v: val(s.key) })), fields: charFields(), source: '로맨스 캐릭터 생성기' }); flash('인물 라이브러리에 저장') }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>로맨스 코드(끌림·결핍·관계 역학)가 살아있는 인물을 무작위 생성. 조합 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지.</div>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6 }}>{text}</div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 72, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" onClick={() => toggle(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}>{locked[s.key] ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}</button>
            <button className="minibtn" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
        {custom.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.label}>{it.label}</span>
            <input value={it.value} onChange={(e) => setCustomVal(it.id, e.target.value)} placeholder="직접 입력" style={{ flex: 1, fontSize: 13, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }} />
            <button className="minibtn" onClick={() => removeCustom(it.id)} title="삭제">✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="minibtn" onClick={addCustom}>＋ 항목 추가</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>기타</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적어 두세요" rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13, lineHeight: 1.5, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 인물 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄"/> 인물 카드 추가</button>
        <button className="linkbtn" onClick={toLib}><Emoji e="📥"/> 인물 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('character-sheet')}><Emoji e="🪪"/> 인물 시트</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
