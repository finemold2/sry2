// 감정 안무가 — 한 장면 안에서 인물 감정이 어떻게 흐르고 전환되는지를 "비트 노드 그래프"로 설계한다.
// 시작 감정 → 여러 전환점(트리거가 있는 비트) → 도착 감정 으로 이어지는 감정 곡선을 만들고,
// 인접 비트 사이 감정값(쾌/불쾌, 각성도)의 거리가 너무 크면 "급변 경고"를 띄워 개연성을 점검한다.
// 외부 네트워크/라이브러리 없이 전부 브라우저 로컬 계산. 결과는 스니펫/프로젝트/수집함으로 내보낸다.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  openToolLinked, addToLibrary, addToProject, hasProjectBridge,
  addToStash, hasStash, getDragItem, isItemDrag, useLibraryList,
} from './linkbus'

export const meta = {
  id: 'emotion-choreographer',
  name: '감정 안무가',
  icon: '🎭',
  group: '분위기·시각',
  intro: '장면 속 감정 전환 비트를 노드 그래프로 설계하고 급변을 경고합니다',
  w: 500,
  h: 620,
}

// ── 감정 좌표 모델(러셀의 정서 원형: 쾌-불쾌 x 각성도) ──────────────────────
// valence(쾌적도): -100(불쾌) ~ +100(쾌적), arousal(각성도): -100(차분) ~ +100(격앙)
interface Emotion { key: string; name: string; valence: number; arousal: number }
const EMOTIONS: Emotion[] = [
  { key: 'joy', name: '기쁨', valence: 80, arousal: 55 },
  { key: 'excite', name: '흥분', valence: 60, arousal: 85 },
  { key: 'love', name: '애정', valence: 75, arousal: 25 },
  { key: 'hope', name: '희망', valence: 60, arousal: 35 },
  { key: 'calm', name: '평온', valence: 55, arousal: -55 },
  { key: 'relief', name: '안도', valence: 45, arousal: -25 },
  { key: 'pride', name: '자부', valence: 65, arousal: 40 },
  { key: 'curious', name: '호기심', valence: 35, arousal: 50 },
  { key: 'neutral', name: '무덤덤', valence: 0, arousal: 0 },
  { key: 'tense', name: '긴장', valence: -20, arousal: 70 },
  { key: 'anxiety', name: '불안', valence: -45, arousal: 60 },
  { key: 'fear', name: '공포', valence: -70, arousal: 85 },
  { key: 'anger', name: '분노', valence: -65, arousal: 90 },
  { key: 'disgust', name: '혐오', valence: -60, arousal: 35 },
  { key: 'shame', name: '수치', valence: -55, arousal: 20 },
  { key: 'guilt', name: '죄책', valence: -50, arousal: 30 },
  { key: 'sad', name: '슬픔', valence: -65, arousal: -40 },
  { key: 'despair', name: '절망', valence: -85, arousal: -20 },
  { key: 'loneliness', name: '외로움', valence: -55, arousal: -45 },
  { key: 'boredom', name: '권태', valence: -25, arousal: -65 },
  { key: 'numb', name: '무감각', valence: -10, arousal: -75 },
  { key: 'surprise', name: '놀람', valence: 5, arousal: 80 },
]
const EM = (k: string): Emotion => EMOTIONS.find((e) => e.key === k) || EMOTIONS[8]

// 전환 트리거 유형 — 비트의 "왜 바뀌는가"를 분류해 개연성 점검에 사용
const TRIGGERS = [
  { key: 'event', name: '사건', hint: '외부에서 벌어진 일' },
  { key: 'reveal', name: '폭로', hint: '숨겨졌던 정보가 드러남' },
  { key: 'dialog', name: '대사', hint: '누군가의 말 한마디' },
  { key: 'memory', name: '회상', hint: '떠오른 기억' },
  { key: 'decision', name: '결심', hint: '스스로 내린 선택' },
  { key: 'sensory', name: '감각', hint: '보고 듣고 느낀 것' },
  { key: 'silence', name: '침묵', hint: '말없이 흐른 시간' },
  { key: 'reversal', name: '반전', hint: '예상이 뒤집힘' },
] as const

interface Beat {
  id: string
  emotion: string   // EMOTIONS key
  label: string     // 이 비트에서 일어나는 일(짧은 메모)
  trigger: string   // TRIGGERS key (시작 비트는 보통 비움)
  intensity: number // 0~100, 감정 강도(곡선 진폭)
}

interface State { scene: string; pov: string; beats: Beat[] }

const SKEY = (id: string) => 'sry:tool:' + id

function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function uid(): string { return 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36) }

// 두 감정 사이 "정서 거리"(쾌적도·각성도 평면의 유클리드 거리, 0~약283 → 0~100 정규화)
function dist(a: Emotion, b: Emotion): number {
  const dv = a.valence - b.valence, da = a.arousal - b.arousal
  return Math.round(Math.sqrt(dv * dv + da * da) / 2.83)
}

// 시드로 결정론적 샘플 비트 트랙 생성(빈 입력 데모용)
function demoBeats(seed: string): Beat[] {
  const h = hash(seed || 'demo')
  const tpl: Array<[string, string, string, number]> = [
    ['calm', '평범한 일상 속 한 장면으로 문이 열린다', '', 30],
    ['surprise', '예상 못 한 무언가가 시야에 들어온다', 'event', 70],
    ['anxiety', '상황을 가늠하며 마음이 조여 온다', 'reveal', 75],
    ['anger', '참았던 감정이 끝내 터져 나온다', 'dialog', 90],
    ['sad', '폭발 뒤에 찾아온 공허가 가라앉는다', 'silence', 55],
    ['relief', '겨우 한 걸음 물러서며 숨을 고른다', 'decision', 40],
  ]
  // 시드에 따라 한두 비트를 변주(결정론적)
  return tpl.map((t, i) => ({
    id: 'demo' + i,
    emotion: t[0],
    label: t[1],
    trigger: t[2],
    intensity: Math.max(15, Math.min(100, t[3] + ((h >> (i * 3)) % 21) - 10)),
  }))
}

interface ToolProps { payload?: Record<string, unknown> }

export default function EmotionChoreographer({ payload }: ToolProps = {}) {
  const id = meta.id
  const snippets = useLibraryList('snippets')

  const [scene, setScene] = useState('')
  const [pov, setPov] = useState('')
  const [beats, setBeats] = useState<Beat[]>(() => demoBeats('seed'))
  const [selId, setSelId] = useState<string | null>(null)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const linkTimer = useRef<number | null>(null)
  const loaded = useRef(false)
  const restored = useRef(false)
  const applied = useRef(false)

  // 복원: localStorage → payload → 드롭. 한 번만.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SKEY(id))
      if (raw) {
        const p = JSON.parse(raw) as Partial<State>
        if (p && Array.isArray(p.beats) && p.beats.length) {
          setScene(p.scene || ''); setPov(p.pov || ''); setBeats(p.beats as Beat[])
          // 데모 비트(전부 'demo' 접두)는 실제 사용자 데이터가 아니므로 복원 가드에서 제외 — 이후 payload 수신을 막지 않는다
          const allDemo = (p.beats as Beat[]).every((b) => typeof b.id === 'string' && b.id.startsWith('demo'))
          if (!allDemo) restored.current = true
        }
      }
    } catch { /* noop */ }
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // payload.text / payload.scene 수용(다른 도구가 데이터를 들고 열었을 때) — 1회만, 복원된 사용자 데이터면 흡수 건너뛰기
  useEffect(() => {
    if (!payload) return
    if (applied.current) return
    applied.current = true
    if (restored.current) return
    const t = (payload.text as string) || (payload.scene as string) || ''
    const name = (payload.title as string) || (payload.placeName as string) || ''
    if (name) setScene((s) => s || name)
    if (t) ingestText(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 저장
  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(SKEY(id), JSON.stringify({ scene, pov, beats } as State)) } catch { /* noop */ }
  }, [scene, pov, beats, id])

  useEffect(() => () => { if (linkTimer.current !== null) window.clearTimeout(linkTimer.current) }, [])

  const flash = (m: string) => {
    setLinkMsg(m)
    if (linkTimer.current !== null) window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => { setLinkMsg(null); linkTimer.current = null }, 1800)
  }

  // 원고 텍스트를 받아 문단(빈 줄/줄바꿈) 단위로 비트 골격을 만든다.
  // 각 문단의 감정은 간단한 한국어 감정어 사전 매칭으로 추정(없으면 무덤덤).
  const LEX: Record<string, string[]> = {
    joy: ['기뻐', '웃', '행복', '즐거', '신나', '환하'],
    anger: ['화가', '분노', '소리쳤', '노려', '치밀', '악물'],
    fear: ['두려', '무서', '겁', '떨렸', '오싹', '공포'],
    sad: ['슬프', '눈물', '울', '서글', '비통', '쓸쓸'],
    anxiety: ['불안', '초조', '조마', '걱정', '안절'],
    tense: ['긴장', '굳었', '숨죽', '경계'],
    surprise: ['놀라', '깜짝', '헉', '소스라'],
    love: ['사랑', '애틋', '그리', '설레'],
    despair: ['절망', '무너', '체념', '끝났'],
    relief: ['안도', '한숨', '겨우', '풀렸'],
    calm: ['평온', '고요', '잔잔', '차분'],
  }
  function guessEmotion(text: string): string {
    let best = 'neutral', bestN = 0
    for (const k in LEX) {
      let n = 0
      for (const w of LEX[k]) if (text.includes(w)) n++
      if (n > bestN) { bestN = n; best = k }
    }
    return best
  }
  function ingestText(text: string) {
    const paras = text.replace(/<[^>]+>/g, ' ').split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean)
    if (!paras.length) return
    const sliced = paras.slice(0, 10)
    const nb: Beat[] = sliced.map((p, i) => {
      const em = guessEmotion(p)
      const e = EM(em)
      const inten = Math.round(Math.min(100, 25 + (Math.abs(e.valence) + Math.abs(e.arousal)) / 4))
      return {
        id: uid() + i,
        emotion: em,
        label: p.length > 48 ? p.slice(0, 47) + '…' : p,
        trigger: i === 0 ? '' : 'event',
        intensity: inten,
      }
    })
    setBeats(nb)
    flash('원고에서 ' + nb.length + '개 비트를 추출했습니다')
  }

  // ── 비트 편집 ──
  const sel = beats.find((b) => b.id === selId) || null
  const setBeat = (bid: string, patch: Partial<Beat>) =>
    setBeats((bs) => bs.map((b) => (b.id === bid ? { ...b, ...patch } : b)))
  const addBeat = () => {
    const last = beats[beats.length - 1]
    const nb: Beat = { id: uid(), emotion: last ? last.emotion : 'neutral', label: '', trigger: 'event', intensity: 50 }
    setBeats((bs) => [...bs, nb]); setSelId(nb.id)
  }
  const delBeat = (bid: string) => setBeats((bs) => bs.filter((b) => b.id !== bid))
  const moveBeat = (bid: string, dir: -1 | 1) => setBeats((bs) => {
    const i = bs.findIndex((b) => b.id === bid); const j = i + dir
    if (i < 0 || j < 0 || j >= bs.length) return bs
    const cp = [...bs];[cp[i], cp[j]] = [cp[j], cp[i]]; return cp
  })
  const reset = () => { setBeats(demoBeats(scene || 'seed')); setSelId(null); flash('예시 트랙으로 초기화했습니다') }

  // ── 분석: 전환 점프 거리 + 급변 경고 + 곡선 통계 ──
  const analysis = useMemo(() => {
    const links = beats.slice(1).map((b, i) => {
      const a = EM(beats[i].emotion), c = EM(b.emotion)
      const d = dist(a, c)
      const flipValence = (a.valence > 15 && c.valence < -15) || (a.valence < -15 && c.valence > 15)
      let level: 'ok' | 'warn' | 'danger' = 'ok'
      if (d >= 60) level = 'danger'
      else if (d >= 38) level = 'warn'
      const hasTrigger = !!b.trigger
      // 트리거 없는 큰 점프는 한 단계 더 위험
      if (!hasTrigger && d >= 38) level = 'danger'
      return { from: beats[i], to: b, d, flipValence, hasTrigger, level }
    })
    const dangers = links.filter((l) => l.level === 'danger')
    const warns = links.filter((l) => l.level === 'warn')
    const vals = beats.map((b) => EM(b.emotion).valence)
    const ars = beats.map((b) => EM(b.emotion).arousal)
    const range = beats.length ? Math.max(...vals) - Math.min(...vals) : 0
    const start = beats[0] ? EM(beats[0].emotion) : null
    const end = beats[beats.length - 1] ? EM(beats[beats.length - 1].emotion) : null
    const netValence = start && end ? end.valence - start.valence : 0
    const peakAr = ars.length ? Math.max(...ars) : 0
    // 형태 판정(상승/하강/V자/역V/기복)
    let shape = '평탄'
    if (beats.length >= 3) {
      const mid = Math.floor(beats.length / 2)
      const mv = EM(beats[mid].emotion).valence
      if (start && end) {
        if (netValence > 25) shape = '상승(회복·승리)'
        else if (netValence < -25) shape = '하강(추락·상실)'
        else if (mv < start.valence - 20 && mv < end.valence - 20) shape = 'V자(시련 후 반등)'
        else if (mv > start.valence + 20 && mv > end.valence + 20) shape = '역V자(고조 후 추락)'
        else shape = '기복(요동)'
      }
    }
    return { links, dangers, warns, range, netValence, peakAr, shape, start, end }
  }, [beats])

  // 곡선 SVG 좌표(쾌적도 = y, 인덱스 = x)
  const curve = useMemo(() => {
    const W = 100, H = 100, n = beats.length
    if (!n) return { points: [] as Array<{ x: number; y: number; b: Beat }>, path: '' }
    const points = beats.map((b, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * (W - 12) + 6
      const v = EM(b.emotion).valence // -100..100
      const y = H - ((v + 100) / 200) * (H - 12) - 6
      return { x, y, b }
    })
    const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ')
    return { points, path }
  }, [beats])

  // ── 내보내기 텍스트 ──
  const buildText = () => {
    const lines: string[] = []
    lines.push('【감정 안무】 ' + (scene || '제목 없는 장면') + (pov ? ' (시점: ' + pov + ')' : ''))
    lines.push('형태: ' + analysis.shape + ' / 쾌적도 변화폭 ' + analysis.range + ' / 정점 각성도 ' + analysis.peakAr)
    lines.push('')
    beats.forEach((b, i) => {
      const e = EM(b.emotion)
      const tr = TRIGGERS.find((t) => t.key === b.trigger)
      const head = (i + 1) + '. [' + e.name + ' · 강도 ' + b.intensity + ']'
      lines.push(head + (b.label ? ' ' + b.label : ''))
      const lk = analysis.links[i - 1]
      if (lk) {
        const tag = lk.level === 'danger' ? '급변 경고' : lk.level === 'warn' ? '주의' : '자연'
        lines.push('   ↳ 전환: ' + (tr ? tr.name : '트리거 없음') + ' / 점프 ' + lk.d + ' (' + tag + ')')
      }
    })
    if (analysis.dangers.length) {
      lines.push('')
      lines.push('● 급변 경고 ' + analysis.dangers.length + '건: 트리거(사건·폭로·결심 등)로 다리를 놓아 개연성을 보강하세요.')
    }
    return lines.join('\n')
  }
  const buildHtml = () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows = beats.map((b, i) => {
      const e = EM(b.emotion)
      const tr = TRIGGERS.find((t) => t.key === b.trigger)
      const lk = analysis.links[i - 1]
      const trans = lk ? '<br><small>전환: ' + esc(tr ? tr.name : '트리거 없음') + ' · 점프 ' + lk.d
        + (lk.level === 'danger' ? ' (급변 경고)' : lk.level === 'warn' ? ' (주의)' : '') + '</small>' : ''
      return '<li><b>' + esc(e.name) + '</b> (강도 ' + b.intensity + ') ' + esc(b.label) + trans + '</li>'
    }).join('')
    return '<p><b>' + esc(scene || '제목 없는 장면') + '</b>' + (pov ? ' (시점: ' + esc(pov) + ')' : '')
      + '<br>형태: ' + esc(analysis.shape) + ' · 변화폭 ' + analysis.range + '</p><ol>' + rows + '</ol>'
  }

  // ── 연계 ──
  const saveSnippet = () => {
    addToLibrary('snippets', { text: buildText(), source: '감정 안무가', tags: ['감정설계', analysis.shape] })
    flash('스니펫으로 저장했습니다')
  }
  const toProject = () => {
    const r = addToProject({
      kind: 'text', root: 'research', folder: '감정 설계',
      title: (scene || '감정 안무') + ' · 감정 곡선',
      bodyHtml: buildHtml(),
      synopsis: '형태 ' + analysis.shape + ' / 비트 ' + beats.length + '개',
      meta: { 형태: analysis.shape, 변화폭: String(analysis.range), 급변경고: String(analysis.dangers.length) },
    })
    flash(r ? '프로젝트에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }
  const toStash = () => { addToStash({ kind: 'memo', label: scene || '감정 안무', text: buildText() }); flash('수집함에 담았습니다') }
  const toScene = () => {
    openToolLinked('scene-list', { title: scene, text: buildText(), emotionArc: analysis.shape })
    flash('장면 목록으로 보냈습니다')
  }
  const toBeatBoard = () => {
    openToolLinked('beat-board', { title: scene, text: buildText() })
    flash('비트 보드로 보냈습니다')
  }

  // 드롭(바인더 문서 → 원고 텍스트 추출)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const it = getDragItem(e)
    if (it) {
      if (!scene && it.title) setScene(it.title)
      if (it.text) ingestText(it.text)
      else flash('「' + it.title + '」에 본문 텍스트가 없습니다')
    }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }

  // 스니펫 라이브러리에서 텍스트 불러와 비트 추출
  const importFromSnippet = (text: string) => { ingestText(text) }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 12, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const levelColor = (lv: string) => lv === 'danger' ? '#e5484d' : lv === 'warn' ? '#f5a623' : 'var(--ok)'
  const emColor = (e: Emotion) => {
    // 쾌적도→색상(붉음=불쾌, 초록=쾌적), 각성도→밝기
    const hue = ((e.valence + 100) / 200) * 130 // 0(빨강)~130(초록)
    const light = 42 + ((e.arousal + 100) / 200) * 14
    return 'hsl(' + hue.toFixed(0) + ' 62% ' + light.toFixed(0) + '%)'
  }

  return (
    <div style={wrap} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={() => setDragOver(false)}>
      <div style={hint}>
        한 장면의 <b>감정 전환 비트</b>를 노드로 이어 곡선을 설계합니다. 인접 비트의 정서 거리가 크면 <b style={{ color: '#e5484d' }}>급변 경고</b>가 표시됩니다 — 트리거(사건·폭로·결심 등)로 다리를 놓아 개연성을 보강하세요.
      </div>

      {/* 장면 메타 입력 */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input className="field" style={{ flex: 2 }} placeholder="장면 제목" value={scene} onChange={(e) => setScene(e.target.value)} />
        <input className="field" style={{ flex: 1 }} placeholder="시점 인물" value={pov} onChange={(e) => setPov(e.target.value)} />
      </div>

      {dragOver && <div style={{ ...hint, color: 'var(--accent)', fontWeight: 700 }}>좌측 바인더 문서를 놓으면 본문에서 감정 비트를 추출합니다</div>}

      {/* 감정 곡선 그래프(SVG) + 비트 노드 */}
      <div style={{ position: 'relative', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 120, display: 'block' }}>
          {/* 중립선(쾌적도 0) */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeWidth="0.4" strokeDasharray="2 2" />
          {/* 전환 링크 */}
          {analysis.links.map((lk, i) => {
            const p1 = curve.points[i], p2 = curve.points[i + 1]
            if (!p1 || !p2) return null
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={levelColor(lk.level)} strokeWidth={lk.level === 'danger' ? 1.6 : 1} />
          })}
          {/* 곡선 */}
          <path d={curve.path} fill="none" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5" />
          {/* 노드 */}
          {curve.points.map((p, i) => {
            const e = EM(p.b.emotion)
            const r = 1.8 + (p.b.intensity / 100) * 2.6
            return (
              <g key={p.b.id} onClick={() => setSelId(p.b.id)} style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={r} fill={emColor(e)} stroke={selId === p.b.id ? 'var(--accent)' : 'var(--bg)'} strokeWidth={selId === p.b.id ? 1.2 : 0.5} />
                <text x={p.x} y={p.y - r - 1.5} fontSize="3.4" fill="var(--muted)" textAnchor="middle">{i + 1}</text>
              </g>
            )
          })}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...hint, fontSize: 10, marginTop: 2 }}>
          <span>위: 쾌적 / 아래: 불쾌 · 원 크기 = 강도</span>
          <span>형태: <b style={{ color: 'var(--accent)' }}>{analysis.shape}</b></span>
        </div>
      </div>

      {/* 분석 요약 배지 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, fontSize: 11 }}>
        <span style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>변화폭 {analysis.range}</span>
        <span style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>정점 각성 {analysis.peakAr}</span>
        <span style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>순변화 {analysis.netValence > 0 ? '+' : ''}{analysis.netValence}</span>
        {analysis.dangers.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid #e5484d', color: '#e5484d', fontWeight: 700 }}>급변 경고 {analysis.dangers.length}</span>}
        {analysis.warns.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid #f5a623', color: '#f5a623' }}>주의 {analysis.warns.length}</span>}
      </div>

      {/* 비트 리스트 + 전환 표시 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
        {beats.length === 0 && (
          <div style={hint}>비트가 없습니다. 아래 "비트 추가"를 누르거나, 좌측 바인더 문서를 끌어다 놓아 원고에서 감정 흐름을 추출하세요.</div>
        )}
        {beats.map((b, i) => {
          const e = EM(b.emotion)
          const lk = analysis.links[i - 1]
          const on = selId === b.id
          return (
            <div key={b.id}>
              {lk && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: levelColor(lk.level), paddingLeft: 12, margin: '1px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: levelColor(lk.level), display: 'inline-block' }} />
                  <span>점프 {lk.d}{lk.flipValence ? ' · 부호 반전' : ''}{lk.hasTrigger ? '' : ' · 트리거 없음'}{lk.level === 'danger' ? ' · 급변 경고' : lk.level === 'warn' ? ' · 주의' : ''}</span>
                </div>
              )}
              <div
                onClick={() => setSelId(on ? null : b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer',
                  background: on ? 'var(--panel)' : 'transparent',
                  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), borderRadius: 8,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 7, background: emColor(e), flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 12, minWidth: 44 }}>{e.name}</span>
                <span style={{ flex: 1, fontSize: 12, color: b.label ? 'var(--text)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.label || '(내용 없음 — 눌러서 편집)'}
                </span>
                <span style={{ ...hint, fontSize: 10 }}>{b.intensity}</span>
              </div>
              {on && (
                <div style={{ border: '1px solid var(--accent)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input className="field" placeholder="이 비트에서 무슨 일이 일어나는가" value={b.label} onChange={(ev) => setBeat(b.id, { label: ev.target.value })} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {EMOTIONS.map((em) => (
                      <button key={em.key} className="minibtn" onClick={() => setBeat(b.id, { emotion: em.key })}
                        style={{ fontSize: 10.5, padding: '1px 6px', borderColor: b.emotion === em.key ? 'var(--accent)' : 'var(--border)', background: b.emotion === em.key ? emColor(em) : undefined, color: b.emotion === em.key ? '#0a0a0a' : undefined, fontWeight: b.emotion === em.key ? 700 : 400 }}>
                        {em.name}
                      </button>
                    ))}
                  </div>
                  {i > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ ...hint, fontSize: 11 }}>전환 트리거:</span>
                      {TRIGGERS.map((t) => (
                        <button key={t.key} className="minibtn" title={t.hint} onClick={() => setBeat(b.id, { trigger: b.trigger === t.key ? '' : t.key })}
                          style={{ fontSize: 10.5, padding: '1px 6px', borderColor: b.trigger === t.key ? 'var(--accent)' : 'var(--border)', fontWeight: b.trigger === t.key ? 700 : 400 }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...hint, fontSize: 11 }}>강도</span>
                    <input type="range" min={0} max={100} value={b.intensity} onChange={(ev) => setBeat(b.id, { intensity: Number(ev.target.value) })} style={{ flex: 1 }} />
                    <span style={{ ...hint, fontSize: 11, minWidth: 26, textAlign: 'right' }}>{b.intensity}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="minibtn" onClick={() => moveBeat(b.id, -1)} disabled={i === 0}>위로</button>
                    <button className="minibtn" onClick={() => moveBeat(b.id, 1)} disabled={i === beats.length - 1}>아래로</button>
                    <button className="minibtn" onClick={() => delBeat(b.id)} style={{ marginLeft: 'auto', color: '#e5484d', borderColor: '#e5484d' }}>삭제</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 진단 메시지 */}
      {analysis.dangers.length > 0 && (
        <div style={{ ...hint, fontSize: 11.5, color: '#e5484d', flexShrink: 0 }}>
          급변 {analysis.dangers.length}건: 강한 감정 점프 앞에 트리거 비트(폭로·결심·사건)를 넣거나 강도를 단계적으로 조절해 보세요.
        </div>
      )}

      {/* 조작 버튼 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={addBeat}>비트 추가</button>
        <button className="minibtn" onClick={reset}>예시로 초기화</button>
      </div>

      {/* 스니펫 라이브러리에서 불러오기(있을 때만) */}
      {snippets.length > 0 && (
        <details style={{ flexShrink: 0 }}>
          <summary style={{ ...hint, cursor: 'pointer' }}>스니펫 라이브러리에서 본문 불러와 비트 추출 ({snippets.length})</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 96, overflowY: 'auto' }}>
            {snippets.slice(0, 12).map((s) => (
              <button key={s.id} className="minibtn" style={{ textAlign: 'left', fontSize: 11 }} onClick={() => importFromSnippet(s.text)}>
                {s.text.slice(0, 40)}{s.text.length > 40 ? '…' : ''}
              </button>
            ))}
          </div>
        </details>
      )}

      {/* 연계 바 */}
      <div className="linkbar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '감정 곡선을 프로젝트 자료에 추가' : '프로젝트에 연결되어 있지 않습니다'}>프로젝트에 추가</button>
        <button className="linkbtn" onClick={saveSnippet} title="감정 안무 텍스트를 스니펫으로 저장">스니펫 저장</button>
        <button className="linkbtn" onClick={toStash} disabled={!hasStash()} title={hasStash() ? '수집함에 담기' : '수집함이 없습니다'}>수집함에 담기</button>
        <button className="linkbtn" onClick={toScene} title="장면 목록 도구로 보내기">장면 목록으로</button>
        <button className="linkbtn" onClick={toBeatBoard} title="비트 보드 도구로 보내기">비트 보드로</button>
        {linkMsg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>{linkMsg}</span>}
      </div>

      <div className="license-note" style={{ ...hint, fontSize: 11, flexShrink: 0 }}>정서 거리는 쾌적도·각성도 평면(러셀 원형 모델)에서 계산한 추정치입니다. 외부 이미지·API·폰트를 사용하지 않습니다.</div>
    </div>
  )
}
