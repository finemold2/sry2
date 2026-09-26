// 무드링(분위기 연계 허브) — 한 가지 분위기(고요·긴장·몽환·비통·설렘·음울·장엄 등)를 고르면
// 그 분위기에 맞는 색 팔레트(전부 로컬 HSL 생성)와 글감 질문을 보여주고, 버튼 하나로
// 음악 갤러리·상상력 자극 갤러리·감각 묘사 팔레트를 "그 분위기"로 연다.
// 외부 네트워크/라이브러리 없이 react 와 './linkbus' 만 사용한다. 색·글감은 직접 작성한 로컬 데이터.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'mood-ring', name: '무드링', icon: '💍', group: '분위기·시각', intro: '분위기 하나로 색·글감·음악·이미지·감각을 한꺼번에 엽니다', w: 460, h: 660 }

// bodyHtml 에 넣는 텍스트는 HTML escape 필수(&,<,>).
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

interface Mood {
  key: string
  name: string       // 한국어 분위기 이름
  icon: string
  desc: string       // 한 줄 분위기 설명
  hueBase: number    // 색상환 기준(deg)
  hueSpread: number  // 분위기 안에서 색이 흔들리는 범위(deg)
  satRange: [number, number]
  litRange: [number, number]
  // 그 분위기로 연계 도구를 열 때 함께 보낼 키워드/검색어
  musicQ: string         // 음악 갤러리 검색어(영문) — 분위기에 맞는 음원
  galleryCat: string     // 상상력 갤러리 카테고리(masterpiece|landscape|portrait|abstract|space)
  placeKey: string       // 감각 팔레트에서 열 장소 key(SensoryPalette PLACES 와 일치)
  prompts: string[]      // 그 분위기의 글감 질문(직접 작성)
}

// 분위기 12종 — 각 분위기는 색 생성 파라미터 + 글감 + 연계 키워드를 갖는다.
const MOODS: Mood[] = [
  {
    key: 'serene', name: '고요', icon: '🌙', desc: '숨소리마저 들릴 듯 가라앉은 평온',
    hueBase: 200, hueSpread: 40, satRange: [18, 48], litRange: [55, 82],
    musicQ: 'calm ambient piano', galleryCat: 'landscape', placeKey: 'library',
    prompts: [
      '아무 일도 일어나지 않는 한 장면을 써보세요. 그 고요 속에서 무엇이 들리나요?',
      '이 정적을 깨는 단 하나의 소리를 정하고, 그 소리가 불러온 기억을 적어보세요.',
      '한 사람이 오래 침묵합니다. 그 침묵이 말하고 있는 것을 묘사하세요.',
      '이 고요가 폭풍 직전의 것이라면, 무엇이 다가오고 있을까요?',
    ],
  },
  {
    key: 'tension', name: '긴장', icon: '🩸', desc: '심장이 죄어드는 위태로운 정적',
    hueBase: 0, hueSpread: 24, satRange: [55, 88], litRange: [28, 52],
    musicQ: 'dark tension suspense drone', galleryCat: 'abstract', placeKey: 'battlefield',
    prompts: [
      '인물이 한 가지를 들키지 않으려 애씁니다. 그 한 가지는 무엇인가요?',
      '다음 1초 안에 모든 것이 바뀝니다. 그 1초 직전을 묘사하세요.',
      '방 안의 두 사람 중 하나는 거짓말을 하고 있습니다. 그 침묵을 그려보세요.',
      '인물의 몸이 먼저 위험을 알아챕니다. 머리보다 빠른 그 감각을 써보세요.',
    ],
  },
  {
    key: 'dreamy', name: '몽환', icon: '🌫️', desc: '현실과 꿈의 경계가 풀어지는 아련함',
    hueBase: 280, hueSpread: 60, satRange: [30, 60], litRange: [50, 78],
    musicQ: 'dreamy ethereal ambient', galleryCat: 'abstract', placeKey: 'aquarium',
    prompts: [
      '이 장면이 꿈이라면, 깨어났을 때 단 하나 남는 이미지는 무엇일까요?',
      '시간이 천천히 흐르거나 거꾸로 흐릅니다. 그 어긋남을 묘사하세요.',
      '기억과 환상이 뒤섞입니다. 인물은 무엇이 진짜인지 어떻게 구별하나요?',
      '안개 너머에서 누군가 부릅니다. 그 목소리를 따라가는 장면을 쓰세요.',
    ],
  },
  {
    key: 'grief', name: '비통', icon: '🕯️', desc: '가슴 한가운데가 무너지는 슬픔',
    hueBase: 220, hueSpread: 30, satRange: [12, 38], litRange: [24, 48],
    musicQ: 'sad sorrowful strings', galleryCat: 'portrait', placeKey: 'graveyard',
    prompts: [
      '잃은 것을 직접 말하지 않고, 남겨진 한 가지 물건으로 슬픔을 그려보세요.',
      '울지 못하는 인물을 묘사하세요. 슬픔은 어디로 흘러가나요?',
      '장례가 끝난 다음 날 아침, 평범하게 반복되는 일상을 써보세요.',
      '그 사람이 마지막으로 남긴 한 문장을 떠올리고, 그 무게를 적어보세요.',
    ],
  },
  {
    key: 'flutter', name: '설렘', icon: '🌷', desc: '심장이 가볍게 부풀어 오르는 떨림',
    hueBase: 340, hueSpread: 40, satRange: [45, 80], litRange: [60, 84],
    musicQ: 'upbeat warm acoustic', galleryCat: 'landscape', placeKey: 'spring',
    prompts: [
      '아주 사소한 순간에 마음이 흔들립니다. 그 사소함을 크게 확대해 묘사하세요.',
      '말하지 못한 한마디가 입가에 맴돕니다. 그 직전의 침묵을 써보세요.',
      '두 사람의 거리가 한 뼘 줄어듭니다. 그 한 뼘의 공기를 그려보세요.',
      '설렘이 두려움과 섞입니다. 인물은 다가갈까요, 물러설까요?',
    ],
  },
  {
    key: 'gloomy', name: '음울', icon: '🌧️', desc: '낮게 가라앉아 좀처럼 걷히지 않는 우울',
    hueBase: 230, hueSpread: 36, satRange: [10, 34], litRange: [30, 55],
    musicQ: 'melancholy rainy ambient', galleryCat: 'landscape', placeKey: 'rain',
    prompts: [
      '같은 풍경이 어제와 다르게 보입니다. 무엇이 달라졌는지 묘사하세요.',
      '인물이 아무것도 하고 싶지 않습니다. 그 무기력을 행동으로 보여주세요.',
      '창밖의 비를 오래 바라보는 사람의 머릿속을 한 문단으로 써보세요.',
      '습기처럼 천천히 스며드는 불안을 색과 냄새로 표현해보세요.',
    ],
  },
  {
    key: 'majestic', name: '장엄', icon: '🏔️', desc: '압도되어 숨이 멎는 거대한 경외',
    hueBase: 45, hueSpread: 50, satRange: [40, 78], litRange: [42, 70],
    musicQ: 'cinematic epic orchestral', galleryCat: 'space', placeKey: 'mountaintop',
    prompts: [
      '인물이 자신보다 한없이 큰 무언가 앞에 섭니다. 그 작아짐을 묘사하세요.',
      '광활한 풍경을 한 사람의 눈으로 좁혀 보여주세요. 그가 본 단 한 점은?',
      '경외와 두려움은 종이 한 장 차이입니다. 그 경계의 순간을 써보세요.',
      '이 압도적인 풍경이 인물의 결심을 바꿉니다. 무엇을 결심하나요?',
    ],
  },
  {
    key: 'eerie', name: '으스스', icon: '🕸️', desc: '등줄기가 서늘해지는 불길한 기운',
    hueBase: 150, hueSpread: 50, satRange: [14, 42], litRange: [20, 46],
    musicQ: 'eerie horror dark drone', galleryCat: 'abstract', placeKey: 'oldhouse',
    prompts: [
      '아주 익숙한 공간에서 한 가지가 미묘하게 틀어져 있습니다. 그 한 가지는?',
      '뒤에 누군가 있는 듯한 느낌을 직접 말하지 않고 묘사해보세요.',
      '소리가 사라진 순간이 가장 무섭습니다. 그 정적을 써보세요.',
      '인물이 보지 말아야 할 것을 봅니다. 본 직후의 1초를 그려보세요.',
    ],
  },
  {
    key: 'warm', name: '따스함', icon: '🔥', desc: '몸과 마음이 노곤하게 녹아드는 온기',
    hueBase: 30, hueSpread: 30, satRange: [40, 72], litRange: [55, 80],
    musicQ: 'cozy warm folk acoustic', galleryCat: 'landscape', placeKey: 'cafe',
    prompts: [
      '추위에서 막 들어온 사람이 느끼는 온기를 오감으로 묘사하세요.',
      '말없이 곁에 있어주는 누군가를 그려보세요. 그 안온함의 정체는?',
      '평범한 식탁 위 한 끼가 위로가 됩니다. 그 장면을 써보세요.',
      '이 따스함이 곧 사라질 것을 인물만 압니다. 그 마지막 온기를 적어보세요.',
    ],
  },
  {
    key: 'nostalgia', name: '향수', icon: '🍂', desc: '돌아갈 수 없는 시절이 아릿하게 떠오름',
    hueBase: 35, hueSpread: 44, satRange: [22, 52], litRange: [44, 70],
    musicQ: 'nostalgic vintage piano', galleryCat: 'portrait', placeKey: 'autumn',
    prompts: [
      '오래된 물건 하나가 한 시절 전체를 불러옵니다. 그 물건과 시절을 쓰세요.',
      '지금은 사라진 장소를 기억만으로 복원해 묘사해보세요.',
      '그때는 몰랐던 것을 지금에서야 깨닫는 순간을 적어보세요.',
      '같은 계절의 냄새가 옛 기억을 끌어올립니다. 그 냄새와 기억을 이으세요.',
    ],
  },
  {
    key: 'rage', name: '분노', icon: '⚡', desc: '속에서 들끓어 터지기 직전의 격정',
    hueBase: 12, hueSpread: 22, satRange: [60, 92], litRange: [34, 56],
    musicQ: 'intense aggressive percussion', galleryCat: 'abstract', placeKey: 'bar',
    prompts: [
      '분노를 폭발이 아니라 억누름으로 보여주세요. 무엇이 그를 멈추게 하나요?',
      '터뜨린 말 한마디를 인물이 곧바로 후회합니다. 그 직후를 써보세요.',
      '몸이 먼저 반응합니다. 주먹이 쥐어지기까지의 순간을 묘사하세요.',
      '분노 밑에 깔린 진짜 감정(두려움·상처)을 한 문단으로 드러내보세요.',
    ],
  },
  {
    key: 'wonder', name: '경이', icon: '✨', desc: '처음 본 듯 눈이 커지는 순수한 놀라움',
    hueBase: 190, hueSpread: 70, satRange: [48, 85], litRange: [55, 82],
    musicQ: 'magical wonder uplifting', galleryCat: 'space', placeKey: 'amusement',
    prompts: [
      '평범한 것을 처음 보는 아이의 눈으로 다시 묘사해보세요.',
      '인물이 믿기지 않는 무언가를 목격합니다. 의심에서 경이로 넘어가는 순간을 쓰세요.',
      '세상이 한순간 더 넓어집니다. 그 확장의 감각을 적어보세요.',
      '이 경이로운 광경이 한 사람의 삶을 바꿉니다. 무엇이 바뀌나요?',
    ],
  },
]

interface Swatch { h: number; s: number; l: number; hex: string }

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return ('#' + to(r) + to(g) + to(b)).toUpperCase()
}

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

// 분위기 파라미터로 5색 팔레트를 로컬 생성 — 같은 분위기여도 매번 다른 조합.
function makePalette(m: Mood): Swatch[] {
  const out: Swatch[] = []
  const dir = Math.random() < 0.5 ? 1 : -1
  for (let i = 0; i < 5; i++) {
    const spread = (i / 4 - 0.5) * 2 * m.hueSpread // -spread .. +spread
    const h = ((m.hueBase + dir * spread + rnd(-6, 6)) % 360 + 360) % 360
    const s = rnd(m.satRange[0], m.satRange[1])
    // 명도는 어두운→밝은 흐름에 약간의 무작위를 섞어 단조롭지 않게
    const litMin = m.litRange[0], litMax = m.litRange[1]
    const base = litMin + ((litMax - litMin) * i) / 4
    const l = Math.max(8, Math.min(92, Math.round(base + rnd(-7, 7))))
    out.push({ h, s, l, hex: hslToHex(h, s, l) })
  }
  return out
}

interface ToolProps { payload?: Record<string, unknown> }

export default function MoodRing({ payload }: ToolProps = {}) {
  // payload.mood 로 특정 분위기를 지정해 열 수 있다(다른 도구가 이 허브를 띄울 때).
  const initialKey = (() => {
    const k = payload && typeof payload.mood === 'string' ? (payload.mood as string) : null
    return MOODS.find((m) => m.key === k) ? (k as string) : MOODS[0].key
  })()

  const [activeKey, setActiveKey] = useState<string>(initialKey)
  const [palette, setPalette] = useState<Swatch[]>(() => makePalette(MOODS.find((m) => m.key === initialKey) || MOODS[0]))
  const [prompt, setPrompt] = useState<string>(() => pick((MOODS.find((m) => m.key === initialKey) || MOODS[0]).prompts))
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const copyTimer = useRef<number | null>(null)
  const msgTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (msgTimer.current !== null) window.clearTimeout(msgTimer.current)
    }
  }, [])

  // 외부에서 payload.mood 가 바뀌어 다시 열리면 그 분위기로 갱신
  useEffect(() => {
    const k = payload && typeof payload.mood === 'string' ? (payload.mood as string) : null
    if (k && MOODS.find((m) => m.key === k) && k !== activeKey) {
      const m = MOODS.find((x) => x.key === k)!
      setActiveKey(k)
      setPalette(makePalette(m))
      setPrompt(pick(m.prompts))
    }
    // activeKey 는 의도적으로 의존성에서 제외(무한 갱신 방지) — payload 변화에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const mood = MOODS.find((m) => m.key === activeKey) || MOODS[0]

  const flash = (text: string) => {
    setMsg(text)
    if (msgTimer.current !== null) window.clearTimeout(msgTimer.current)
    msgTimer.current = window.setTimeout(() => { setMsg(null); msgTimer.current = null }, 1800)
  }

  const selectMood = (key: string) => {
    const m = MOODS.find((x) => x.key === key) || MOODS[0]
    setActiveKey(key)
    setPalette(makePalette(m))
    setPrompt(pick(m.prompts))
    setCopiedIdx(null)
  }

  const regenPalette = () => setPalette(makePalette(mood))
  const nextPrompt = () => setPrompt(pick(mood.prompts))

  const safeCopy = (text: string, onDone: () => void) => {
    try { navigator.clipboard?.writeText(text).then(onDone).catch(() => { /* 권한 거부·미지원 graceful */ }) } catch { /* 미지원 무시 */ }
  }

  const copyHex = (sw: Swatch, idx: number) => {
    safeCopy(sw.hex, () => {
      setCopiedIdx(idx)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => { setCopiedIdx((c) => (c === idx ? null : c)); copyTimer.current = null }, 1200)
    })
  }

  // ----- 연계: 이 분위기로 다른 도구 열기 -----
  const openMusic = () => {
    // 음악 갤러리에 분위기·검색어를 전달(갤러리가 자체 분위기 목록을 쓰더라도 mood 컨텍스트로 활용)
    openToolLinked('music-gallery', { mood: mood.key, moodName: mood.name, q: mood.musicQ })
    flash(`음악 갤러리를 「${mood.name}」 분위기로 열었습니다`)
  }
  const openImagination = () => {
    openToolLinked('imagination-gallery', { mood: mood.key, moodName: mood.name, cat: mood.galleryCat })
    flash(`상상력 갤러리를 「${mood.name}」 분위기로 열었습니다`)
  }
  const openSensory = () => {
    openToolLinked('sensory-palette', { mood: mood.key, moodName: mood.name, placeKey: mood.placeKey })
    flash(`감각 팔레트를 「${mood.name}」 분위기로 열었습니다`)
  }

  // 현재 분위기·팔레트·글감을 하나의 텍스트로(스니펫/복사용)
  const buildText = () => {
    const hexes = palette.map((sw) => sw.hex).join('  ')
    return `【${mood.name}】 ${mood.desc}\n색: ${hexes}\n글감: ${prompt}`
  }

  const saveSnippet = () => {
    addToLibrary('snippets', { text: buildText(), source: '무드링', tags: ['분위기', mood.name] })
    flash('스니펫으로 저장했습니다')
  }

  const toProject = () => {
    const swatchRows = palette
      .map((sw) => `<li><strong>${esc(sw.hex)}</strong> <span style="color:#888">(H${sw.h} · S${sw.s} · L${sw.l})</span></li>`)
      .join('')
    const bodyHtml = [
      `<p><strong>${esc(mood.icon)} ${esc(mood.name)}</strong> — ${esc(mood.desc)}</p>`,
      `<p><strong>색 팔레트</strong></p>`,
      `<ul>${swatchRows}</ul>`,
      `<p><strong>✍️ 글감:</strong> ${esc(prompt)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text', root: 'research', folder: '분위기 메모',
      title: `무드링 · ${mood.name}`,
      bodyHtml,
      meta: { 분위기: mood.name, 색상: palette.map((sw) => sw.hex).join(', ') },
    })
    flash(id ? '프로젝트 자료에 추가했습니다' : '프로젝트에 연결되지 않았습니다')
  }

  // ----- 스타일 -----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>분위기</b> 하나를 고르면 그에 맞는 <b>색 팔레트</b>와 <b>글감</b>이 생기고, 아래 버튼으로 음악·이미지·감각 도구를 <b>그 분위기로</b> 한꺼번에 엽니다.
      </div>

      {/* 분위기 칩 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        {MOODS.map((m) => {
          const on = m.key === activeKey
          return (
            <button
              key={m.key}
              className="minibtn"
              onClick={() => selectMood(m.key)}
              aria-pressed={on}
              title={m.desc}
              style={{
                opacity: on ? 1 : 0.62,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                color: on ? 'var(--text)' : 'var(--muted)',
                fontWeight: on ? 700 : 400,
              }}
            >
              <Emoji e={m.icon} /> {m.name}
            </button>
          )
        })}
      </div>

      {/* 선택 분위기 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 24 }}><Emoji e={mood.icon} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{mood.name}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{mood.desc}</span>
        </span>
      </div>

      {/* 색 띠 미리보기 */}
      <div style={{ display: 'flex', height: 52, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
        {palette.map((sw, i) => (
          <div key={i} title={sw.hex} style={{ flex: 1, background: `hsl(${sw.h} ${sw.s}% ${sw.l}%)` }} />
        ))}
      </div>

      {/* 색별 칩(클릭 복사) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        {palette.map((sw, i) => (
          <button
            key={i}
            onClick={() => copyHex(sw, i)}
            title="클릭하면 hex 복사"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px',
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 4, background: `hsl(${sw.h} ${sw.s}% ${sw.l}%)`, border: '1px solid var(--border)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: copiedIdx === i ? 'var(--ok)' : 'var(--text)' }}>
              {copiedIdx === i ? '✓ 복사됨' : sw.hex}
            </span>
          </button>
        ))}
        <button className="minibtn" onClick={regenPalette} title="같은 분위기로 다른 색 조합"><Emoji e="🔀" /> 색 다시</button>
      </div>

      {/* 글감 */}
      <div style={{ ...card, background: 'var(--paper)', fontSize: 14, lineHeight: 1.55, flexShrink: 0 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 6, fontSize: 12 }}><Emoji e="✍️" /> 이 분위기의 글감</div>
        {prompt}
        <div style={{ marginTop: 8 }}>
          <button className="minibtn" onClick={nextPrompt} style={{ fontSize: 11, padding: '2px 8px' }}><Emoji e="💡" /> 다른 글감</button>
        </div>
      </div>

      {/* 분위기로 도구 열기(허브 핵심) */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          「{mood.name}」 분위기로 열기
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ flex: '1 1 130px' }} onClick={openMusic} title={`음악 갤러리를 ${mood.name} 분위기로 엽니다`}><Emoji e="🎵" /> 음악 갤러리</button>
          <button className="btn-primary" style={{ flex: '1 1 130px' }} onClick={openImagination} title={`상상력 자극 갤러리를 ${mood.name} 분위기로 엽니다`}><Emoji e="🖼" /> 상상력 갤러리</button>
          <button className="btn-primary" style={{ flex: '1 1 130px' }} onClick={openSensory} title={`감각 묘사 팔레트를 ${mood.name} 분위기로 엽니다`}><Emoji e="🌿" /> 감각 팔레트</button>
        </div>
      </div>

      {/* 저장·연계 */}
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? `「${mood.name}」 분위기·팔레트·글감을 프로젝트 자료에 메모로 추가합니다` : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄" /> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={saveSnippet} title="현재 분위기·색·글감을 스니펫 라이브러리에 저장합니다">
          <Emoji e="✂️" /> 스니펫 저장
        </button>
        {msg && <span className="license-note" style={{ fontSize: 12, color: 'var(--ok)' }}>✓ {msg}</span>}
      </div>

      <div className="license-note" style={{ ...hint, fontSize: 11 }}>
        색과 글감은 직접 작성·로컬 생성한 데이터입니다. 외부 이미지·API·폰트를 사용하지 않습니다. (음악·갤러리 도구는 각자의 출처를 표기합니다.)
      </div>
    </div>
  )
}
