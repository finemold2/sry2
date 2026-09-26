// 역사·사극 배경/현장 생성기 — 시대 고증 디테일을 조합해 사극 장면 배경을 생성한다(조합 123억+).
// react 와 './linkbus' 만 import. 완전 로컬.
import { useMemo, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'history-settingforge', name: '역사 배경 생성기', icon: '🏯', group: '배경', genre: '역사·사극', intro: '시대 고증 디테일을 조합해 사극 장면 배경을 생성', w: 480, h: 600 }

// 받침 유무로 조사를 골라 붙인다(괄호 이중표기 방지). 끝글자가 한글일 때만 판정, 아니면 첫 형태.
const hasJong = (w: string): boolean => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return false; return (c - 0xac00) % 28 !== 0 }
// 받침O / 받침X 짝(예: 이/가). 로/으로는 ㄹ받침도 '로'를 쓰므로 별도 처리.
const josa = (w: string, withJong: string, noJong: string): string => w + (hasJong(w) ? withJong : noJong)
const iGa = (w: string) => josa(w, '이', '가')

interface Slot { key: string; label: string; options: string[] }
const SLOTS: Slot[] = [
  { key: 'era', label: '시대', options: ['삼국시대', '통일신라', '고려 초기', '고려 무신정권기', '조선 건국기', '조선 중기(임진왜란 전후)', '조선 후기(영·정조)', '조선 말기·개항기', '대한제국기', '일제강점기', '고대 중국(춘추전국)', '당·송대', '명·청대', '중세 유럽', '로마 제국', '바이킹 시대', '에도 막부', '전국시대(일본)', '오스만 제국', '대항해시대', '발해 전성기', '가야 연맹', '병자호란 전후', '구한말 의병기'] },
  { key: 'place', label: '장소', options: ['궁궐 편전', '대비전 후원', '저잣거리 객주', '관아 동헌', '서원·향교', '국경 진영', '산성 망루', '나루터 주막', '사찰 대웅전', '양반가 사랑채', '기방', '저잣거리 푸줏간 골목', '포구의 어시장', '광산 갱도', '역참', '의금부 옥사', '성균관', '한양 운종가', '변방 둔전', '대장간', '약방', '서고·규장각', '도성 성문 누각', '향청 객사', '한지 뜨는 지소', '바닷가 봉수대', '내의원 약재고', '저자 비단전'] },
  { key: 'time', label: '시각·계절', options: ['이른 새벽 파루 종소리', '한낮의 저잣거리', '해 질 녘 통금 직전', '삼경의 깊은 밤', '동지섣달 한파', '한여름 장마', '봄 보릿고개', '추수기 한가위', '첫눈 내리는 저녁', '가뭄으로 갈라진 땅', '안개 자욱한 새벽 강가', '폭설로 끊긴 고갯길', '단오 무렵 신록', '정월 대보름 달밤', '늦가을 서리 내린 아침', '장마 갠 뒤 무더위'] },
  { key: 'mood', label: '분위기', options: ['삼엄한 경계', '음모가 도사린 정적', '북적이는 활기', '쇠락한 적막', '비통한 곡소리', '엄숙한 의례', '들뜬 잔치', '공포에 짓눌린', '결연한 출정 전야', '은밀한 밀담', '체념 어린 가난', '권세의 위압', '나른한 권태', '들썩이는 술렁임', '서글픈 이별', '팽팽한 대치'] },
  { key: 'detail', label: '고증 디테일', options: ['짚신과 미투리가 뒤섞인 흙길', '솟을대문과 행랑채', '청사초롱 불빛', '곤장 형틀과 육모방망이', '봉화대의 연기', '한지 바른 문창의 그림자', '옹기와 가마솥', '망건과 갓, 도포 자락', '엽전 꾸러미와 되·말', '서안 위 붓과 벼루', '활과 환도, 갑주', '꽹과리·징 소리', '약초 다리는 약탕기', '비단과 무명 필', '장죽과 곰방대 연기', '상소문과 교지 두루마리', '돗자리에 늘어놓은 좌판', '처마 끝 매달린 메주와 곶감', '대나무 발과 죽부인', '먹 갈린 벼루와 화선지 묶음'] },
  { key: 'people', label: '오가는 사람들', options: ['순라군과 포졸', '봇짐 진 보부상', '갓 쓴 선비들', '물동이 인 아낙', '남루한 거지 떼', '가마 탄 양반가 부인', '의금부 나졸', '탁발하는 승려', '엿장수와 광대패', '말 탄 파발', '저자의 백정', '구경 나온 아이들', '약초 캐는 심마니', '소 끄는 농부', '점 보는 무당', '글 읽는 훈장과 학동들'] },
  { key: 'event', label: '벌어지는 일', options: ['방이 나붙어 사람들이 웅성인다', '죄인을 끌고 가는 행렬', '암행어사 출도 직전의 긴장', '역병으로 닫힌 성문', '세곡선이 들어오는 포구', '괘서 사건의 수사', '혼례 행렬이 지나간다', '환곡을 둘러싼 다툼', '왜구·도적 출몰 소문', '상소를 올리려 엎드린 유생들', '비밀 회합이 파한 직후', '굶주린 백성의 봉기 조짐', '장날 씨름판이 벌어진다', '관기를 부르는 잔치가 한창이다', '도망친 노비를 쫓는 추쇄꾼', '과거 급제 방이 나붙어 술렁인다'] },
  { key: 'sense', label: '감각·소리', options: ['멀리서 들려오는 다듬이질 소리', '코를 찌르는 거름과 흙냄새', '바람에 실려 오는 밥 짓는 연기', '처마에서 떨어지는 낙숫물 소리', '어디선가 들리는 닭 우는 소리', '비릿한 갯내음과 짠 바람', '약재 달이는 쌉쌀한 냄새', '아이 우는 소리와 개 짖는 소리', '풍경 소리와 목탁 두드리는 소리', '말발굽과 수레바퀴 구르는 소리', '술 익는 누룩 냄새', '먹과 종이의 마른 냄새', '대장간 망치질이 울려 퍼진다', '저자의 흥정과 호객 소리'] },
]
const COMBOS = SLOTS.reduce((n, s) => n * s.options.length, 1)
const ri = (n: number) => Math.floor(Math.random() * n)

export default function HistorySettingForge() {
  const [picks, setPicks] = useState<Record<string, number>>(() => Object.fromEntries(SLOTS.map((s) => [s.key, ri(s.options.length)])))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const val = (k: string) => SLOTS.find((s) => s.key === k)!.options[picks[k]]
  const addCustom = () => { const label = window.prompt('추가할 항목 이름을 입력하세요')?.trim(); if (label) setCustom((c) => [...c, { id: `c${Date.now()}_${c.length}`, label, value: '' }]) }
  const setCustomValue = (id: string, value: string) => setCustom((c) => c.map((it) => (it.id === id ? { ...it, value } : it)))
  const removeCustom = (id: string) => setCustom((c) => c.filter((it) => it.id !== id))
  const clearCustom = () => { setCustom((c) => c.map((it) => ({ ...it, value: '' }))); setEtc('') }
  const customFields = () => { const m: Record<string, string> = {}; custom.forEach((it) => { if (it.value.trim()) m[it.label] = it.value.trim() }); if (etc.trim()) m.etc = etc.trim(); return m }
  const rollAll = () => { clearCustom(); setPicks((p) => Object.fromEntries(SLOTS.map((s) => [s.key, locked[s.key] ? p[s.key] : ri(s.options.length)]))) }
  const rollOne = (k: string) => setPicks((p) => ({ ...p, [k]: ri(SLOTS.find((s) => s.key === k)!.options.length) }))
  const toggle = (k: string) => setLocked((l) => ({ ...l, [k]: !l[k] }))
  const text = useMemo(() => `[${val('era')}] ${val('place')}, ${val('time')}. 분위기는 ${val('mood')}. ${iGa(val('detail'))} 눈에 들고, ${iGa(val('people'))} 오간다. ${val('sense')}. 그때 ${val('event')}.`, [picks])
  const fullText = useMemo(() => { let t = text; custom.forEach((it) => { if (it.value.trim()) t += `\n${it.label}: ${it.value.trim()}` }); if (etc.trim()) t += `\n기타: ${etc.trim()}`; return t }, [text, custom, etc])
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1500) }
  const copy = () => { navigator.clipboard?.writeText(fullText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }).catch(() => {}) }
  const placeFields = () => ({ name: `${val('place')} (${val('era')})`, kind: '사극 배경', atmosphere: val('mood'), appearance: text, history: val('era'), notes: text, ...customFields() })
  const toProject = () => { const id = addToProject({ kind: 'setting', root: 'research', folder: '장소', title: `${val('place')} (${val('era')})`, character: { name: `${val('place')} (${val('era')})`, type: '사극 배경', kind: '사극 배경', atmosphere: val('mood'), appearance: text, description: fullText, history: val('era'), ...customFields() }, meta: { 시대: val('era'), 분위기: val('mood'), ...customFields() } }); flash(id ? '프로젝트 자료(장소)에 추가됨' : '프로젝트 미연결') }
  const toLib = () => { addToLibrary('places', { name: `${val('place')} (${val('era')})`, kind: '사극 배경', mood: val('mood'), notes: fullText, fields: placeFields(), source: '역사 배경 생성기' }); flash('장소 라이브러리에 저장') }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>시대 고증 디테일을 조합해 사극 장면 배경을 생성합니다. 조합 <b style={{ color: 'var(--accent)' }}>{COMBOS.toLocaleString()}</b>가지. <Emoji e="🔒"/> 잠그고 <Emoji e="🎲"/> 돌려 원하는 배경을 찾으세요.</div>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 14.5, lineHeight: 1.6 }}>{text}</div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SLOTS.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 76, flexShrink: 0 }}>{s.label}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{s.options[picks[s.key]]}</span>
            <button className="minibtn" onClick={() => toggle(s.key)} style={{ color: locked[s.key] ? 'var(--accent)' : 'var(--muted)' }}><Emoji e={locked[s.key] ? '🔒' : '🔓'}/></button>
            <button className="minibtn" onClick={() => rollOne(s.key)} disabled={locked[s.key]}><Emoji e="🎲"/></button>
          </div>
        ))}
        {custom.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', width: 76, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.label}>{it.label}</span>
            <input value={it.value} onChange={(e) => setCustomValue(it.id, e.target.value)} placeholder="직접 입력" style={{ flex: 1, fontSize: 13, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px' }} />
            <button className="minibtn" onClick={() => removeCustom(it.id)} title="삭제">✕</button>
          </div>
        ))}
        <button className="minibtn" onClick={addCustom} style={{ alignSelf: 'flex-start' }}>＋ 항목 추가</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>기타</span>
          <textarea value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="자유롭게 적으세요" style={{ width: '100%', minHeight: 60, resize: 'vertical', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={rollAll}><Emoji e="🎲"/> 배경 생성</button>
        <button className="minibtn" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
      </div>
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()}><Emoji e="📄"/> 프로젝트에 추가</button>
        <button className="linkbtn" onClick={toLib}><Emoji e="🏞"/> 장소 라이브러리</button>
        <button className="linkbtn" onClick={() => openToolLinked('setting-bible', { place: placeFields() })}><Emoji e="🏞"/> 배경 설정집</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
