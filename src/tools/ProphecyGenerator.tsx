// 예언 생성기(조합형) — 모호하고 운명적인 예언 문구를 슬롯 무작위 조합으로 만든다.
//   슬롯: 징조(전조) × 조건(언제·무엇이) × 결과(운명) × 애매어(이중의미·여지) + 운율 어조.
//   잠금(🔒)/재생성(🎲), 조합 가능 수(수십만+) 표시, 복선·운명 플롯의 출발점.
// 자급식: 외부 네트워크·라이브러리 없음. Math.random + localStorage(잠금/마지막 결과)만 사용.
// 연계(linkbus): 생성한 예언을 프로젝트 자료 〈플롯〉 폴더에 메모로 추가하고, 스니펫 라이브러리에도 저장.
import { useState, useEffect, useCallback, useRef } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, Emoji } from './linkbus'

export const meta = { id: 'prophecy-generator', name: '예언 생성기', icon: '🔮', group: '영감·발상', intro: '모호하고 운명적인 예언 문구를 조합해 복선·운명 플롯을 짜세요', w: 480, h: 620 }

const LS = 'sry:tool:prophecy-generator'

// ---------- 슬롯 풀(로컬) ----------
// 각 슬롯은 충분히 다양하게. 조합수 = 모든 풀 길이의 곱 → 수십만+ 보장.
interface Slot { key: string; label: string; icon: string; pool: string[] }

const SLOTS: Slot[] = [
  {
    key: 'sign', label: '징조', icon: '🌑',
    pool: [
      '두 달이 한 하늘에 뜨는 밤',
      '피로 물든 새벽이 세 번 거듭될 때',
      '재 속에서 마지막 별이 식는 날',
      '강물이 거꾸로 흐르기 시작하면',
      '이름 없는 아이가 왕관을 주울 때',
      '잠든 산이 다시 숨을 쉬는 해에',
      '바다가 제 깊이를 잊는 계절에',
      '눈먼 새가 노래를 멈추는 순간',
      '오래된 종이 스스로 울릴 때',
      '겨울이 봄을 삼키는 해에',
      '꺼지지 않던 불이 잿빛으로 사그라들면',
      '잊힌 신의 이름이 다시 불릴 때',
      '일곱 까마귀가 한 나무에 깃드는 밤',
      '거울이 제 주인을 비추지 못할 때',
      '마지막 예언자가 입을 다무는 날',
      '하늘에 균열이 처음 비치는 새벽',
    ],
  },
  {
    key: 'subject', label: '운명의 주인', icon: '🗝️',
    pool: [
      '버려진 자',
      '쌍둥이 중 늦게 태어난 이',
      '왕도 아니고 종도 아닌 자',
      '두 피가 섞여 흐르는 아이',
      '죽었다 다시 걷는 자',
      '이름을 셋 가진 떠돌이',
      '울지 않고 태어난 아이',
      '제 그림자를 잃은 자',
      '경계 위에서 잉태된 이',
      '바다도 뭍도 제 것이 아닌 자',
      '왕의 피를 모르는 후계자',
      '검을 들 줄 모르는 전사',
      '거짓으로 왕좌에 오른 이',
      '눈물로 봉인을 푸는 자',
      '잊힌 약속에서 태어난 아이',
      '마지막까지 살아남은 핏줄',
    ],
  },
  {
    key: 'condition', label: '조건', icon: '⚖️',
    pool: [
      '사랑하는 것을 스스로 베어야',
      '제 손으로 가장 큰 죄를 지어야',
      '잃은 것을 되찾기를 포기할 때',
      '왕관과 목숨 중 하나를 버려야',
      '적의 손을 잡아야만',
      '약속을 깨뜨림으로써만',
      '제 이름을 영원히 지워야',
      '피 한 방울 흘리지 않고서야',
      '죽음을 두 번 마주하고서야',
      '가장 깊은 거짓을 믿게 될 때',
      '구원자를 제 손으로 무너뜨려야',
      '봉인을 푸는 동시에 다시 봉해야',
      '먼저 모든 것을 잃은 뒤에야',
      '용서할 수 없는 자를 용서할 때',
      '운명을 거부함으로써만',
      '제 심장을 대가로 내어주어야',
    ],
  },
  {
    key: 'outcome', label: '결과', icon: '🌗',
    pool: [
      '낡은 왕좌는 재가 되리라',
      '갈라진 땅이 다시 하나로 묶이리라',
      '오랜 저주가 풀리되 새 저주가 깃들리라',
      '잠든 신이 마침내 깨어나리라',
      '세상은 끝나고 또 시작되리라',
      '피의 사슬이 비로소 끊어지리라',
      '왕국은 영광 속에 스러지리라',
      '죽은 별들이 다시 빛나리라',
      '경계가 무너지고 두 세계가 만나리라',
      '잊힌 진실이 모두 드러나리라',
      '구원과 멸망이 같은 얼굴로 오리라',
      '오랜 전쟁이 거짓 평화로 잠들리라',
      '마지막 불씨가 새 시대를 밝히리라',
      '봉인된 것이 다시 풀려나리라',
      '운명의 수레바퀴가 처음으로 멈추리라',
      '하늘과 땅의 약속이 다시 쓰이리라',
    ],
  },
  {
    key: 'vague', label: '애매어', icon: '🌫️',
    pool: [
      '그러나 누구도 그것이 끝인지 시작인지 알지 못하리라.',
      '다만 그날이 언제인지는 누구도 말하지 못하리라.',
      '하지만 그 손이 구원의 손일지 파멸의 손일지는 가려지지 않으리라.',
      '그것이 축복일지 형벌일지는 마지막에야 드러나리라.',
      '오직 잊은 자만이 그 뜻을 기억하리라.',
      '그 이름은 둘이면서 하나이리라.',
      '구하려는 자가 곧 무너뜨리는 자이리라.',
      '진실은 거짓의 옷을 입고 찾아오리라.',
      '약속은 지켜짐으로써 깨어지리라.',
      '끝은 시작의 다른 이름일 뿐이리라.',
      '먼저 온 자가 가장 늦게 닿으리라.',
      '그러나 예언을 막으려는 손이 예언을 이루리라.',
      '보는 자는 눈멀고, 눈먼 자가 보게 되리라.',
      '잃음으로써만 얻고, 얻음으로써 잃으리라.',
      '그 길은 하나이나 갈래는 끝이 없으리라.',
      '다만 그 대가가 누구의 것일지는 아무도 모르리라.',
    ],
  },
]

// 어조(운율) — 같은 조합도 어조에 따라 결을 달리. 조합수에 포함.
interface Tone { key: string; label: string; head: (s: Record<string, string>) => string }
const TONES: Tone[] = [
  {
    key: 'oracle', label: '신탁체',
    head: (s) => `${s.sign}, ${s.subject}가 ${s.condition} ${s.outcome}. ${s.vague}`,
  },
  {
    key: 'verse', label: '시구체',
    head: (s) => `${s.sign} —\n${s.subject}가\n${s.condition},\n${s.outcome}.\n${s.vague}`,
  },
  {
    key: 'whisper', label: '속삭임체',
    head: (s) => `들으라. ${s.sign}. 그때 ${s.subject}가 ${s.condition}, ${s.outcome}… ${s.vague}`,
  },
]

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const pickTone = () => TONES[Math.floor(Math.random() * TONES.length)].key

// 천 단위 콤마
const fmt = (n: number) => n.toLocaleString('ko-KR')

// 총 조합수 = 모든 슬롯 풀 길이의 곱 × 어조 수
const COMBOS = SLOTS.reduce((acc, s) => acc * s.pool.length, 1) * TONES.length

// HTML 이스케이프(프로젝트 본문 안전화)
const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Picks = Record<string, string>

export default function ProphecyGenerator({ payload }: { payload?: Record<string, unknown> }) {
  const [picks, setPicks] = useState<Picks>({})
  const [toneKey, setToneKey] = useState<string>(TONES[0].key)
  const [toneLocked, setToneLocked] = useState(false)
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const [spinning, setSpinning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const nonce = useRef(0)

  // 마지막 결과/잠금 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as { picks?: Picks; toneKey?: string; locked?: Record<string, boolean>; toneLocked?: boolean }
        if (p.picks && typeof p.picks === 'object') {
          const valid: Picks = {}
          SLOTS.forEach((s) => { if (typeof p.picks![s.key] === 'string') valid[s.key] = p.picks![s.key] })
          if (Object.keys(valid).length) setPicks(valid)
        }
        if (typeof p.toneKey === 'string' && TONES.some((t) => t.key === p.toneKey)) setToneKey(p.toneKey)
        if (p.locked && typeof p.locked === 'object') setLocked(p.locked)
        if (typeof p.toneLocked === 'boolean') setToneLocked(p.toneLocked)
      }
    } catch { /* ignore */ }
  }, [])

  // 결과/잠금 저장
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ picks, toneKey, locked, toneLocked })) } catch { /* ignore */ }
  }, [picks, toneKey, locked, toneLocked])

  // payload 로 주제 힌트가 와도 풀은 로컬 고정 — 첫 진입 시 한 번 굴려 채워준다(빈 상태 방지).
  useEffect(() => {
    if (Object.keys(picks).length === 0) {
      const next: Picks = {}
      SLOTS.forEach((s) => { next[s.key] = pick(s.pool) })
      setPicks(next)
      setToneKey((cur) => cur || pickTone())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(() => setSpinning(false), 380)
    return () => window.clearTimeout(t)
  }, [spinning, picks])

  const generate = useCallback(() => {
    ++nonce.current
    setCopied(false); setSaved(false)
    setSpinning(true)
    setPicks((prev) => {
      const next: Picks = { ...prev }
      SLOTS.forEach((s) => {
        if (locked[s.key] && prev[s.key]) return // 잠긴 슬롯 유지
        let v = pick(s.pool)
        if (v === prev[s.key] && s.pool.length > 1) v = pick(s.pool) // 연속 동일 완화
        next[s.key] = v
      })
      return next
    })
    if (!toneLocked) {
      setToneKey((cur) => {
        let t = pickTone()
        if (t === cur && TONES.length > 1) t = pickTone()
        return t
      })
    }
  }, [locked, toneLocked])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const ready = SLOTS.every((s) => picks[s.key])
  const tone = TONES.find((t) => t.key === toneKey) || TONES[0]
  const prophecy = ready ? tone.head(picks) : '예언을 생성해 보세요.'

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 1800) }

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(prophecy).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => flash('클립보드 복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(영감 메모로 재사용)
  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', {
      text: `[예언] ${prophecy}`,
      source: '예언 생성기',
      tags: ['예언', '복선', '운명', '플롯', tone.label],
    })
    setSaved(true); window.setTimeout(() => setSaved(false), 1500)
    flash('스니펫 라이브러리에 예언을 저장했습니다.')
  }

  // 프로젝트 자료 〈플롯〉 폴더에 메모로 추가 — 예언 본문 + 슬롯 분해(복선 설계용).
  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const rows = SLOTS
      .map((s) => `<p><b>${escHtml(s.icon)} ${escHtml(s.label)}:</b> ${escHtml(picks[s.key])}</p>`)
      .join('')
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.8;white-space:pre-wrap;"><b>🔮 ${escHtml(prophecy)}</b></p>`,
      `<hr/>`,
      `<p style="color:#888;">— 복선 설계용 분해 (${escHtml(tone.label)}) —</p>`,
      rows,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '플롯',
      title: `🔮 예언 — ${picks.sign}`,
      bodyHtml,
      synopsis: prophecy.replace(/\n/g, ' ').slice(0, 120),
      meta: { 어조: tone.label, 슬롯: SLOTS.map((s) => s.label).join('·') },
    })
    flash(id ? '프로젝트 자료 〈플롯〉 폴더에 예언을 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={hint}>
        <b>징조·운명의 주인·조건·결과·애매어</b>를 무작위로 엮어 모호하고 운명적인 <b>예언</b>을 만듭니다.
        마음에 드는 슬롯은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요. 복선·운명 플롯의 씨앗이 됩니다.
      </div>

      {/* 조합수 + 어조 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>
          <Emoji e="🎲"/> {fmt(COMBOS)}가지 조합
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>어조</span>
        {TONES.map((t) => {
          const on = t.key === toneKey
          return (
            <button key={t.key} className="minibtn" onClick={() => { setToneKey(t.key); setCopied(false); setSaved(false) }}
              aria-pressed={on}
              style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}>
              {t.label}
            </button>
          )
        })}
        <button className="minibtn" onClick={() => setToneLocked((v) => !v)} title={toneLocked ? '어조 고정 해제' : '어조 고정'}
          style={{ borderColor: toneLocked ? 'var(--accent)' : 'var(--border)' }}>
          {toneLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
        </button>
      </div>

      {/* 예언 본문 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🔮"/> 예언</div>
        <div style={{
          fontSize: 16, lineHeight: 1.7, whiteSpace: 'pre-wrap',
          color: ready ? 'var(--text)' : 'var(--muted)',
          fontStyle: 'italic',
          transition: 'opacity .2s', opacity: spinning ? 0.5 : 1,
        }}>
          {spinning ? '…운명을 읽는 중…' : prophecy}
        </div>
      </div>

      {/* 슬롯 분해(잠금 단위) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
        {SLOTS.map((s) => {
          const v = picks[s.key]
          const isLocked = !!locked[s.key]
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '9px 12px',
            }}>
              <div style={{
                fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0,
                transition: 'transform .25s',
                transform: spinning && !isLocked ? 'rotate(14deg) scale(1.15)' : 'none',
              }}><Emoji e={s.icon}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.label} <span style={{ opacity: 0.6 }}>({s.pool.length})</span></div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: v ? 'var(--text)' : 'var(--muted)' }}>
                  {v ? (spinning && !isLocked ? '…' : v) : '— 생성해 주세요 —'}
                </div>
              </div>
              <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                style={{ flexShrink: 0, borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                {isLocked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generate}><Emoji e="🎲"/> 예언 생성 / 다시 굴리기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 복사</>}</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="스니펫 라이브러리에 예언 저장">
          {saved ? <>✓ 저장됨</> : <><Emoji e="⭐"/> 스니펫</>}
        </button>
      </div>

      {/* 프로젝트 연계 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={
            !hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다'
            : !ready ? '먼저 예언을 생성해주세요'
            : '생성한 예언과 슬롯 분해를 프로젝트 자료 〈플롯〉 폴더에 메모로 추가'
          }
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
      <div style={hint}>예언은 출발점일 뿐입니다. 결과가 어떻게 ‘이루어지면서도 비틀리는지’를 설계하면 좋은 복선이 됩니다.</div>
    </div>
  )
}
