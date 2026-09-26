// 글쓰기 워밍업 — 무작위 자유쓰기 프롬프트(내장 50개+) + 5분 타이머 + 간이 textarea(글자수 표시).
// 자급식: react 외 import 없음. setInterval 타이머·localStorage(초안 보존)만 사용. 외부 네트워크 불필요.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'warmup-prompt', name: '글쓰기 워밍업', icon: '🔥', group: '영감·발상', intro: '무작위 프롬프트로 5분 자유쓰기 워밍업을 해보세요', w: 460, h: 560 }

const LS_DRAFT = 'sry:tool:warmup-prompt:draft'
const DURATION = 5 * 60 // 5분(초)

// 5분 자유쓰기용 무작위 프롬프트 — 내장 50개+ (네트워크 불필요).
const PROMPTS = [
  '지금 손에 닿는 물건 하나를 골라, 그것이 겪어온 일생을 1인칭으로 써보세요.',
  '오늘 아침에 가장 먼저 떠올린 생각을 멈추지 말고 끝까지 풀어 써보세요.',
  '“만약 내가 어제로 돌아간다면”으로 시작하는 글을 써보세요.',
  '창밖(혹은 가장 가까운 창) 풍경을 본 적 없는 사람에게 설명하듯 묘사해보세요.',
  '한 번도 가본 적 없는 도시의 아침 거리를 상상해 묘사해보세요.',
  '“나는 한 번도 ___해본 적이 없다”의 빈칸을 채우고 그 이유를 써보세요.',
  '지금 이 순간 들리는 소리 세 가지를 적고, 각각의 정체를 상상해보세요.',
  '오래된 사진 한 장을 떠올리고, 그 장면 바로 다음에 무슨 일이 있었는지 써보세요.',
  '당신이 가장 좋아하는 음식이 사라진 세상을 묘사해보세요.',
  '낯선 사람에게서 받은 짧은 친절을 떠올려 그 순간을 자세히 써보세요.',
  '“문을 열자 거기에는…”으로 시작하는 장면을 이어 써보세요.',
  '지금 입고 있는 옷이 말을 할 수 있다면 무슨 이야기를 할까요?',
  '10년 후의 내가 오늘의 나에게 보내는 짧은 편지를 써보세요.',
  '어린 시절 살던 집의 부엌을 기억나는 대로 자세히 묘사해보세요.',
  '비 오는 날의 냄새를 한 번도 비를 본 적 없는 사람에게 설명해보세요.',
  '“그날 이후로 모든 것이 달라졌다.” 이 문장으로 끝나는 이야기를 써보세요.',
  '당신이 절대 버리지 못하는 물건과 그 이유를 써보세요.',
  '한 번도 말하지 못한 고마움을 누군가에게 전하는 글을 써보세요.',
  '거울 속의 내가 갑자기 다른 행동을 한다면 어떤 장면이 펼쳐질까요?',
  '지금 가장 마시고 싶은 음료를 묘사하되, 색·향·온도·기억을 모두 담아보세요.',
  '“시간이 멈췄다.” 멈춘 세상에서 당신은 무엇을 할까요?',
  '오늘 만난(혹은 스친) 사람 중 한 명의 하루를 상상해 써보세요.',
  '가장 좋아하는 계절의 한 장면을 다섯 감각을 모두 써서 묘사해보세요.',
  '평범한 출근/등굣길에 단 하나가 비현실적으로 바뀐다면 무엇일까요?',
  '당신만 아는 비밀 장소를 처음 가는 사람에게 안내하듯 써보세요.',
  '“그 소리를 다시는 듣지 못할 줄 알았다.” 이 문장으로 글을 시작하세요.',
  '냉장고 안의 물건들이 한밤중에 벌이는 회의를 상상해보세요.',
  '지금 머릿속에 떠오르는 멜로디를 글자로만 설명해보세요.',
  '잃어버린 줄 알았던 물건을 다시 찾은 순간을 자세히 써보세요.',
  '“나는 거짓말을 하고 있었다.” 누가, 왜, 누구에게?',
  '하루 동안 투명인간이 된다면 가장 먼저 할 일을 써보세요.',
  '당신의 손을 본 적 없는 사람에게 자신의 손을 묘사해보세요.',
  '오늘 하늘의 색을 정확히 표현할 단어를 새로 만들어 정의해보세요.',
  '“마지막 버스가 떠나고 있었다.” 그 정류장에 남은 사람을 그려보세요.',
  '가장 오래 간직한 약속을 떠올려, 지킨 이야기 혹은 못 지킨 이야기를 써보세요.',
  '지금 이 방에 갑자기 바다가 들어온다면 무슨 일이 벌어질까요?',
  '한 단어(예: ‘파랑’, ‘틈’, ‘재’)를 정하고 5분간 그 단어만 생각하며 써보세요.',
  '오래된 노래 한 곡과 얽힌 기억을 떠올려 그 장면을 복원해보세요.',
  '“열쇠는 거기 없었다.” 사라진 열쇠를 둘러싼 이야기를 써보세요.',
  '당신이 두려워하는 것을 의인화해서 그와 나누는 대화를 써보세요.',
  '내일 아침 눈을 떴을 때 단 하나만 달라져 있다면 무엇이길 바라나요?',
  '버스나 카페에서 우연히 들은 한 문장을 첫 줄로 삼아 이야기를 지어보세요.',
  '“그 편지는 끝내 부치지 못했다.” 편지의 내용을 써보세요.',
  '가장 좋아하는 책 속 인물을 오늘의 거리로 데려와 하루를 써보세요.',
  '당신의 이름이 다른 무언가의 이름이었다면 그것은 무엇일까요?',
  '눈을 감고 떠오르는 첫 색깔로 글을 시작해, 그 색이 이끄는 대로 써보세요.',
  '“우리는 그 약속을 지키지 못했다.” 우리는 누구이고 약속은 무엇이었나요?',
  '하루를 1분으로 압축할 수 있다면 어느 1분을 남기고 싶나요?',
  '지금 가장 보고 싶은 사람에게 안부를 묻는 짧은 글을 써보세요.',
  '오늘의 날씨를 사람의 기분으로 바꿔 묘사해보세요.',
  '“계단을 내려가자 더 이상 계단이 아니었다.” 이어서 써보세요.',
  '한 번도 키워본 적 없는 동물과 함께한 하루를 상상해 써보세요.',
  '당신이 가진 흉터(혹은 자국) 하나의 이야기를 지어내 써보세요.',
  '“그건 분명히 어제까지 거기에 있었다.” 사라진 그것은 무엇인가요?',
  '미래의 박물관에 전시될 ‘오늘의 평범한 물건’ 설명문을 써보세요.',
]

function pickRandom(exclude: number, len: number): number {
  if (len <= 1) return 0
  let i = exclude
  while (i === exclude) i = Math.floor(Math.random() * len)
  return i
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss < 10 ? '0' : ''}${ss}`
}

export default function WarmupPrompt({ payload }: { payload?: Record<string, unknown> } = {}) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  const [text, setText] = useState('')
  const [left, setLeft] = useState(DURATION)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [saved, setSaved] = useState('')

  // [연계] 다른 도구가 보낸 본문(payload.text)을 점검 대상으로 채움 — 같은 payload 는 1회만 처리(부모 리렌더 시 재적용 방지)
  const handledPayload = useRef<unknown>(null)
  useEffect(() => {
    if (!payload || handledPayload.current === payload) return
    handledPayload.current = payload
    const t = typeof payload.text === 'string' ? payload.text : ''
    if (t.trim()) setText(t)
  }, [payload]) // eslint-disable-line
  const timerRef = useRef<number | null>(null)

  // 초안 복원(미지원/거부 시 graceful).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_DRAFT)
      if (saved) setText(saved)
    } catch { /* localStorage 미지원/차단 — 무시 */ }
  }, [])

  // 초안 자동 저장(과도한 쓰기를 피해 디바운스).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { localStorage.setItem(LS_DRAFT, text) } catch { /* 무시 */ }
    }, 400)
    return () => window.clearTimeout(t)
  }, [text])

  // 타이머 — running 동안 1초마다 감소, 0이면 정지.
  useEffect(() => {
    if (!running) return
    timerRef.current = window.setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          setRunning(false)
          setDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [running])

  // 언마운트 시 타이머 정리.
  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = () => {
    if (left <= 0) setLeft(DURATION)
    setDone(false)
    setRunning(true)
  }
  const stop = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setLeft(DURATION)
    setDone(false)
  }
  const newPrompt = () => {
    setIdx(p => pickRandom(p, PROMPTS.length))
  }
  const clearText = () => {
    setText('')
    try { localStorage.removeItem(LS_DRAFT) } catch { /* 무시 */ }
  }

  // 프로젝트 브리지 — 워밍업으로 쓴 글을 원고 문서로 저장(제목은 프롬프트 앞부분, 본문 상단에 프롬프트 함께).
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 1600) }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toProject = () => {
    const body = text.trim()
    if (!body) return
    const prompt = PROMPTS[idx]
    // 제목: 프롬프트 앞부분(특수문자 제거·길이 제한).
    const titleRaw = prompt.replace(/[“”"]/g, '').trim()
    const title = '워밍업 — ' + (titleRaw.length > 24 ? titleRaw.slice(0, 24) + '…' : titleRaw)
    // 본문: 프롬프트(상단) + 워밍업 글 단락들.
    const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    const bodyHtml =
      `<p><em>✍️ 프롬프트: ${esc(prompt)}</em></p>` +
      paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
    const id = addToProject({
      kind: 'text', root: 'draft', folder: '초고',
      title,
      bodyHtml,
      synopsis: prompt,
      meta: { 출처: '글쓰기 워밍업', 글자수: String(body.length) },
    })
    flash(id ? '프로젝트 초고에 추가됨' : '프로젝트에 연결되지 않았습니다')
  }

  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const ratio = Math.max(0, Math.min(1, (DURATION - left) / DURATION))
  const low = left <= 30 && left > 0

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, color: 'var(--text)', boxSizing: 'border-box' }
  const promptBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', fontSize: 16, lineHeight: 1.55, wordBreak: 'keep-all', minHeight: 64, display: 'flex', alignItems: 'center' }
  const timerRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }
  const timeNum: React.CSSProperties = { fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: low ? 'var(--warn)' : (done ? 'var(--ok)' : 'var(--accent)'), minWidth: 64 }
  const barOuter: React.CSSProperties = { flex: 1, height: 8, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }
  const barInner: React.CSSProperties = { width: `${ratio * 100}%`, height: '100%', background: done ? 'var(--ok)' : 'var(--accent)', transition: 'width 0.3s linear' }
  const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 }
  const ta: React.CSSProperties = { flex: 1, minHeight: 120, resize: 'none', width: '100%', boxSizing: 'border-box', padding: 12, fontSize: 15, lineHeight: 1.6, color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontFamily: 'inherit' }
  const statRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={promptBox}><Emoji e="✍️" /> {PROMPTS[idx]}</div>

      <div style={timerRow}>
        <div style={timeNum}>{fmt(left)}</div>
        <div style={barOuter}><div style={barInner} /></div>
      </div>

      <div style={actions}>
        {!running
          ? <button className="btn-primary" onClick={start}>{left <= 0 || done ? <><Emoji e="🔁" /> 다시 5분</> : (left < DURATION ? '▶ 이어서' : '▶ 시작')}</button>
          : <button className="btn-primary" onClick={stop}>⏸ 정지</button>}
        <button className="minibtn" onClick={reset} disabled={left === DURATION && !running && !done}>↺ 타이머 초기화</button>
        <button className="minibtn" onClick={newPrompt}><Emoji e="🔀" /> 다른 프롬프트</button>
      </div>

      {done && <div style={{ ...hint, color: 'var(--ok)' }}><Emoji e="⏰" /> 5분 완료! 멈추지 않고 끝까지 써냈다면 충분합니다. 잘하셨어요.</div>}

      <textarea
        style={ta}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="여기에 자유롭게 쓰세요. 손을 멈추지 말고, 맞춤법은 신경 쓰지 마세요."
        spellCheck={false}
      />

      <div style={statRow}>
        <span>{chars.toLocaleString()}자 · {words.toLocaleString()}단어</span>
        <button className="minibtn" onClick={clearText} disabled={!text}><Emoji e="🗑" /> 글 비우기</button>
      </div>

      <div style={hint}>프롬프트를 읽고 ‘시작’을 누른 뒤 5분간 멈추지 말고 써보세요. 작성한 글은 이 도구에 자동 저장됩니다.</div>

      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge() || !text.trim()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!text.trim() ? '저장할 글이 없습니다' : '워밍업으로 쓴 글을 프로젝트 초고에 추가')}
        ><Emoji e="📄" /> 프로젝트에 추가</button>
      </div>
      {saved && <div style={{ fontSize: 11.5, color: 'var(--ok)' }}>✓ {saved}</div>}
    </div>
  )
}
