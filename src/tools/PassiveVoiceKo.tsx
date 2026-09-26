// 피동·번역투 점검 — textarea 에 붙여넣으면 어색한 피동(이중피동 -되어지다/-여지다, -지게 되다,
// -에 의해, -되어진 등)과 번역투 표현(-에 있어서/-에 대하여/-으로부터/-의 경우/-적 등)을 로컬 정규식으로
// 탐지해 위치·강조와 함께 능동 전환·자연스러운 대안 제안을 보여준다.
// 자급식: react 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 규칙). 모든 검사는 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'passive-voice-ko', name: '피동·번역투 점검', icon: '🔁', group: '교정·언어', intro: '이중피동·어색한 피동과 번역투 표현을 찾아 능동·자연스러운 대안을 제안합니다', w: 540, h: 600 }

// ── 규칙 정의 ───────────────────────────────────────────────
// kind: error(이중피동 등 분명한 오류) / warn(어색한 피동) / info(번역투·참고)
type Kind = 'error' | 'warn' | 'info'
interface Rule {
  id: string
  re: RegExp          // 전역(g) 정규식. 그룹/룩어라운드 활용 가능
  kind: Kind
  cat: string         // 분류 라벨(피동/이중피동/번역투)
  // 매치별 메시지/제안. m=전체매치, g=캡처. 제안 없으면 안내만.
  msg: (m: string, g: string[]) => string
  fix?: (m: string, g: string[]) => string | null
}

// 안전한 RegExp 생성 헬퍼(항상 전역 플래그)
const R = (src: string, flags = 'g') => new RegExp(src, flags.includes('g') ? flags : flags + 'g')

const RULES: Rule[] = [
  // ── 1) 이중피동(가장 분명한 오류) ─────────────────────────
  // -아/어지다 + 이미 피동인 어간. '되어지다/되어진/되어졌'은 대표적 이중피동.
  {
    id: 'doe-eo-jida', kind: 'error', cat: '이중피동',
    re: R('되어지(다|는|었|어|던|면|고|며|지)'),
    msg: () => "'되어지다'는 '되다'(피동)에 '-어지다'(피동)를 겹친 이중피동입니다. '되다'로 충분합니다.",
    fix: (_m, g) => `되${g[0]}`,
  },
  {
    id: 'doe-jin', kind: 'error', cat: '이중피동',
    re: R('되어진'),
    msg: () => "'되어진'은 이중피동입니다. '된'으로 고치세요.",
    fix: () => '된',
  },
  {
    id: 'doe-jyeoss', kind: 'error', cat: '이중피동',
    re: R('되어졌(다|어|지|던|고)'),
    msg: () => "'되어졌다'는 이중피동입니다. '되었다/됐다'로 고치세요.",
    fix: () => '되었다',
  },
  // -ㅎ받침 어간 + 여지다(여기다 류가 아닌 피동 겹침): 보여지다/모여지다/쓰여지다 등
  {
    id: 'yeo-jida', kind: 'error', cat: '이중피동',
    re: R('(보|모|쓰|놓|쌓|섞|닦)이?여지(다|는|었|어|던|면|고)'),
    msg: (_m, g) => `'${g[0]}…여지다'는 피동에 '-여지다'를 겹친 이중피동입니다. '${g[0]}이다' 계열의 한 번 피동으로 충분합니다.`,
    fix: () => null,
  },
  // 대표적 이중피동 동사 모음(불리우다→불리다 등은 따로). 잊혀지다/읽혀지다/닫혀지다…
  {
    id: 'hyeo-jida', kind: 'error', cat: '이중피동',
    re: R('(잊|읽|닫|먹|꺾|얽|밝)혀지(다|는|었|어|던|면|고|며)'),
    msg: (_m, g) => `'${g[0]}혀지다'는 '${g[0]}히다'(피동)에 '-어지다'를 겹친 이중피동입니다. '${g[0]}히다'로 고치세요.`,
    fix: (_m, g) => `${g[0]}히${g[1] === '다' ? '다' : g[1] === '었' ? '었' : g[1]}`,
  },
  // -려지다(끌려지다/팔려지다/걸려지다…): 리(피동) + 어지다
  {
    id: 'ryeo-jida', kind: 'error', cat: '이중피동',
    re: R('(끌|팔|걸|들|밀|물|풀|날|갈|불)려지(다|는|었|어|던|면|고)'),
    msg: (_m, g) => `'${g[0]}려지다'는 '${g[0]}리다'(피동)에 '-어지다'를 겹친 이중피동입니다. '${g[0]}리다'로 고치세요.`,
    fix: () => null,
  },
  // -겨지다(담겨지다/잠겨지다/안겨지다…): 기(피동) + 어지다
  {
    id: 'gyeo-jida', kind: 'error', cat: '이중피동',
    re: R('(담|잠|안|쫓|뜯|찢|감|옮)겨지(다|는|었|어|던|면|고)'),
    msg: (_m, g) => `'${g[0]}겨지다'는 '${g[0]}기다'(피동)에 '-어지다'를 겹친 이중피동입니다. '${g[0]}기다'로 고치세요.`,
    fix: () => null,
  },

  // ── 2) 어색한 피동 / 사동·피동 군더더기 ───────────────────
  // -지게 되다 (대개 '-게 되다'면 충분하거나 능동이 자연스러움)
  {
    id: 'jige-doeda', kind: 'warn', cat: '피동',
    re: R('([가-힣])지게\\s*되(다|었|어|는|면|고)'),
    msg: () => "'-지게 되다'는 군더더기 피동인 경우가 많습니다. '-게 되다' 또는 능동으로 다듬어 보세요.",
    fix: () => null,
  },
  // -게 되어지다 등 복합
  {
    id: 'ge-doe-eo', kind: 'error', cat: '이중피동',
    re: R('게\\s*되어지(다|는|었|어)'),
    msg: () => "'-게 되어지다'는 이중피동입니다. '-게 되다'로 줄이세요.",
    fix: () => '게 되다',
  },
  // 불리우다(불리다의 잘못된 사동/이중) → 불리다
  {
    id: 'bulliuda', kind: 'warn', cat: '피동',
    re: R('불리우(다|는|던|면|고)'),
    msg: () => "'불리우다'는 '불리다'의 군더더기 형태입니다. '불리다'로 쓰세요(예: ~라고 불린다).",
    fix: () => null,
  },
  // 생각되어지다/느껴지다 류 군더더기: '~라고 생각된다'면 충분
  {
    id: 'saenggak-jida', kind: 'warn', cat: '피동',
    re: R('(생각|판단|예상|추측|기대|평가)되어지(다|는|었|어|면)'),
    msg: (_m, g) => `'${g[0]}되어지다'는 이중피동입니다. '${g[0]}된다' 또는 '~라고 ${g[0]}한다'처럼 다듬으세요.`,
    fix: (_m, g) => `${g[0]}된${g[1] === '다' ? '다' : g[1]}`,
  },

  // ── 3) 번역투(영어식 수동·전치사 직역) ────────────────────
  // -에 의해(서) (by 직역). 행위 주체를 주어로 능동화 권장.
  {
    id: 'e-uihae', kind: 'info', cat: '번역투',
    re: R('에\\s*의(해|하여|한)'),
    msg: () => "'~에 의해/의하여'는 영어 수동태(by) 번역투인 경우가 많습니다. 행위 주체를 주어로 삼아 능동으로 바꿔 보세요.",
    fix: () => null,
  },
  // -로 인하여/인해 (due to)
  {
    id: 'ro-inhae', kind: 'info', cat: '번역투',
    re: R('(으)?로\\s*인(하여|해서?)'),
    msg: () => "'~로 인하여/인해'는 번역투입니다. '~때문에' 또는 '~로'로 간결하게 쓸 수 있습니다.",
    fix: () => null,
  },
  // -에 있어서 (in/for ~)
  {
    id: 'e-isseoseo', kind: 'info', cat: '번역투',
    re: R('에\\s*있어서?'),
    msg: () => "'~에 있어(서)'는 일본어·영어식 번역투입니다. '~에서/~에게/~의 경우'로 풀거나 생략하세요.",
    fix: () => null,
  },
  // -에 대하여/대해서 (about) — 남용 주의
  {
    id: 'e-daehae', kind: 'info', cat: '번역투',
    re: R('에\\s*대(하여|해서?|한)'),
    msg: () => "'~에 대하여/대한'은 남용하면 번역투가 됩니다. 조사(~을/를, ~의)로 바꿀 수 있는지 보세요.",
    fix: () => null,
  },
  // -으로부터 (from) — 대개 '~에서/~에게서'로 충분
  {
    id: 'robuteo', kind: 'info', cat: '번역투',
    re: R('(으)?로부터'),
    msg: () => "'~으로부터'는 영어 from 번역투입니다. 출처는 '~에서', 사람은 '~에게서/한테서'가 자연스럽습니다.",
    fix: () => null,
  },
  // -의 경우 (in the case of) — 남용 주의
  {
    id: 'ui-gyeongu', kind: 'info', cat: '번역투',
    re: R('의\\s*경우(에|에는|는)?'),
    msg: () => "'~의 경우'는 번역투로 흔히 남용됩니다. '~은/는' 같은 주제 조사로 바꿔 보세요.",
    fix: () => null,
  },
  // 가지다 + 추상명사(가지고 있다 = have 직역)
  {
    id: 'gajigo-itda', kind: 'info', cat: '번역투',
    re: R('을?를?\\s*가지(고\\s*있|ㄴ다|는다)'),
    msg: () => "'~를 가지고 있다'는 영어 have 번역투입니다. '~이 있다' 또는 알맞은 동사로 바꿔 보세요.",
    fix: () => null,
  },
  // -하고 있는 중이다 (진행형 직역, 군더더기)
  {
    id: 'haneun-jung', kind: 'info', cat: '번역투',
    re: R('하고\\s*있는\\s*중'),
    msg: () => "'~하고 있는 중'은 진행형을 겹쳐 쓴 군더더기입니다. '~하고 있다' 또는 '~하는 중이다'로.",
    fix: () => null,
  },
  // 필요로 하다 (need 직역)
  {
    id: 'piryoro', kind: 'info', cat: '번역투',
    re: R('을?를?\\s*필요로\\s*하'),
    msg: () => "'~을 필요로 하다'는 번역투입니다. '~이 필요하다'로 바꾸면 자연스럽습니다.",
    fix: () => null,
  },
  // -지 않으면 안 된다 (must, 이중부정 번역투)
  {
    id: 'ji-aneumyeon', kind: 'info', cat: '번역투',
    re: R('지\\s*않으면\\s*안\\s*된'),
    msg: () => "'~지 않으면 안 된다'는 영어 must의 이중부정 번역투입니다. '~해야 한다'로 간결하게.",
    fix: () => null,
  },
  // 다름 아니다 / ~에 다름 아니다 (일본어투)
  {
    id: 'dareum-anida', kind: 'info', cat: '번역투',
    re: R('에\\s*다름\\s*아니'),
    msg: () => "'~에 다름 아니다'는 일본어 번역투입니다. '바로 ~이다/다름없다'로 바꾸세요.",
    fix: () => null,
  },
  // -적(的) 남발 (관형 '-적' 연속/명사화)
  {
    id: 'jeok-overuse', kind: 'info', cat: '번역투',
    re: R('([가-힣]{2,})적([\\s가-힣])'),
    msg: (_m, g) => `'${g[0]}적'의 '-적(的)'은 번역·한자투에서 남용됩니다. 꼭 필요한지, 풀어 쓸 수 있는지 보세요.`,
    fix: () => null,
  },
  // 복수 '-들' 남발(사물·추상에 영어 복수 직역)
  {
    id: 'deul-overuse', kind: 'info', cat: '번역투',
    re: R('(것|문제|사실|정보|자료|결과|방법|경우)들'),
    msg: (_m, g) => `'${g[0]}들'처럼 사물·추상에 '-들'을 붙이는 것은 영어 복수 번역투입니다. 대개 생략해도 됩니다.`,
    fix: (_m, g) => `${g[0]}`,
  },
]

// ── 검사 실행 ───────────────────────────────────────────────
interface Hit {
  rule: Rule
  index: number
  end: number
  match: string
  groups: string[]
  line: number
  col: number
  suggestion: string | null
}

function runChecks(text: string): Hit[] {
  if (!text) return []
  const hits: Hit[] = []
  // 행 시작 인덱스 테이블(위치→줄/열 변환용)
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  const toLineCol = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 }
  }

  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = rule.re.exec(text)) !== null) {
      if (guard++ > 5000) break // 폭주 방지
      const groups = m.slice(1).map((x) => x ?? '')
      const { line, col } = toLineCol(m.index)
      let suggestion: string | null = null
      try {
        suggestion = rule.fix ? rule.fix(m[0], groups) : null
      } catch {
        suggestion = null
      }
      hits.push({
        rule,
        index: m.index,
        end: m.index + m[0].length,
        match: m[0],
        groups,
        line,
        col,
        suggestion: suggestion && suggestion !== m[0] ? suggestion : null,
      })
      // 길이 0 매치 무한루프 방지
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++
    }
  }
  // 위치순 정렬(겹치면 분류·id 순)
  hits.sort((a, b) => a.index - b.index || a.rule.id.localeCompare(b.rule.id))
  return hits
}

const KIND_COLOR: Record<Kind, string> = { error: 'var(--warn)', warn: 'var(--accent)', info: 'var(--muted)' }
const KIND_LABEL: Record<Kind, string> = { error: '이중피동', warn: '어색한 피동', info: '번역투' }

export default function PassiveVoiceKo() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const copyTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 언마운트 시 복사 타이머 정리(경쟁상태/누수 방지)
  useEffect(() => () => { if (copyTimer.current != null) clearTimeout(copyTimer.current) }, [])

  const hits = useMemo(() => {
    try { return runChecks(text) } catch { return [] }
  }, [text])

  const counts = useMemo(() => {
    const c = { error: 0, warn: 0, info: 0 }
    for (const h of hits) c[h.rule.kind]++
    return c
  }, [hits])

  const shown = useMemo(
    () => (filter === 'all' ? hits : hits.filter((h) => h.rule.kind === filter)),
    [hits, filter],
  )

  // 결과 텍스트(복사용)
  const resultText = useMemo(() => {
    if (hits.length === 0) return ''
    return hits
      .map((h, i) => {
        const where = `${h.line}:${h.col}`
        const sug = h.suggestion ? ` → 제안: "${h.suggestion}"` : ''
        return `${i + 1}. [${KIND_LABEL[h.rule.kind]}/${h.rule.cat}] (${where}) "${h.match}"${sug}\n   ${h.rule.msg(h.match, h.groups)}`
      })
      .join('\n')
  }, [hits])

  const doCopy = async () => {
    if (!resultText) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultText)
      } else {
        // 폴백: 임시 textarea
        const ta = document.createElement('textarea')
        ta.value = resultText
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  // 매치 위치로 textarea 커서 이동 + 선택(강조)
  const jumpTo = (h: Hit) => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(h.index, h.end) } catch { /* noop */ }
  }

  const sample = '이 문제는 위원회에 의해 다시 검토되어졌다. 그 결과는 모두에게 잘 보여지고 있으며, 많은 사람들에게 읽혀지고 있다. 우리는 더 나은 방법을 필요로 하고, 환경 보호에 있어서 책임을 가지고 있다. 그것은 단순한 우연에 다름 아니다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const topBar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const title: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 160, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const chipRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }
  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap',
  })
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', cursor: 'pointer' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const pos: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const matchTxt: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--text)', background: 'var(--chrome-2)', borderRadius: 5, padding: '1px 6px' }
  const sugTxt: React.CSSProperties = { fontSize: 13, color: 'var(--ok)', fontWeight: 600 }
  const msgTxt: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>🔁 이중피동·어색한 피동과 번역투를 로컬 규칙으로 점검합니다 (네트워크 불필요)</div>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="점검할 글을 여기에 붙여넣으세요. 입력하는 동안 실시간으로 분석됩니다."
        spellCheck={false}
        aria-label="점검할 텍스트 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {hits.length}</span>
        <span style={chip(filter === 'error', KIND_COLOR.error)} onClick={() => setFilter('error')} role="button" tabIndex={0}>이중피동 {counts.error}</span>
        <span style={chip(filter === 'warn', KIND_COLOR.warn)} onClick={() => setFilter('warn')} role="button" tabIndex={0}>어색한 피동 {counts.warn}</span>
        <span style={chip(filter === 'info', KIND_COLOR.info)} onClick={() => setFilter('info')} role="button" tabIndex={0}>번역투 {counts.info}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={hits.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>🔁</div>
          <div>글을 붙여넣으면 '되어지다·보여지다·읽혀지다' 같은 이중피동과<br />'~에 의해·~에 있어서·~로부터' 같은 번역투를 찾아 줍니다.</div>
          <div style={hint}>규칙 기반이라 일부는 문맥 확인이 필요한 '번역투(참고)' 항목입니다.</div>
        </div>
      ) : shown.length === 0 ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>{hits.length === 0 ? '✅' : '🔍'}</div>
          <div>{hits.length === 0 ? '어색한 피동·번역투가 보이지 않습니다. 깔끔합니다!' : '선택한 분류에 해당하는 항목이 없습니다.'}</div>
        </div>
      ) : (
        <div style={listWrap}>
          {shown.map((h, i) => (
            <div
              key={`${h.rule.id}-${h.index}-${i}`}
              style={card}
              onClick={() => jumpTo(h)}
              title="클릭하면 본문에서 해당 위치를 선택합니다"
            >
              <div style={cardHead}>
                <span style={tag(KIND_COLOR[h.rule.kind])}>{KIND_LABEL[h.rule.kind]} · {h.rule.cat}</span>
                <span style={pos}>줄 {h.line}, 칸 {h.col}</span>
                <span style={{ flex: 1 }} />
                <span style={matchTxt}>{h.match.replace(/\n/g, '⏎')}</span>
                {h.suggestion && <span style={{ color: 'var(--muted)' }}>→</span>}
                {h.suggestion && <span style={sugTxt}>{h.suggestion}</span>}
              </div>
              <div style={msgTxt}>{h.rule.msg(h.match, h.groups)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
