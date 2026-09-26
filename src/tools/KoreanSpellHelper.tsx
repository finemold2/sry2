// 한국어 맞춤법 점검 — textarea 에 붙여넣으면 자주 틀리는 규칙(되/돼, 안/않, 로서/로써, 든지/던지,
// 율/률, 왠/웬, 띄어쓰기, 중복어, 이중부정 등)을 로컬 정규식으로 검사해 위치·제안과 함께 목록으로 보여준다.
// 또한 '현재 문서 불러오기'로 활성 원고 본문을 직접 검사하고, 제안을 클릭하면 본문 RTF 에 제자리 치환한다
// (원고와 단절된 붙여넣기 전용에서 탈피 — 검사→그 자리에서 수정). 서식 보존·안전 가드는 App 브리지가 담당.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키 불필요(100% 로컬 규칙). 모든 검사는 브라우저에서 수행.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getActiveDoc, hasActiveDoc, applyActiveDocReplace, type DocReplacement } from './linkbus'

export const meta = { id: 'korean-spell-helper', name: '한국어 맞춤법 점검', icon: '✍️', group: '교정·언어', intro: '자주 틀리는 맞춤법을 로컬 규칙으로 찾아 수정 제안과 위치를 보여줍니다', w: 520, h: 560 }

// ── 규칙 정의 ───────────────────────────────────────────────
// kind: error(빨강) / warn(노랑) / info(파랑)
type Kind = 'error' | 'warn' | 'info'
interface Rule {
  id: string
  re: RegExp          // 전역(g) 정규식. 그룹/룩어라운드 활용 가능
  kind: Kind
  label: string       // 규칙 이름
  // 매치별 메시지/제안. m=전체매치, groups=캡처. 제안 없으면 안내만.
  msg: (m: string, g: string[]) => string
  fix?: (m: string, g: string[]) => string | null
}

// 안전한 RegExp 생성 헬퍼(항상 전역 플래그)
const R = (src: string, flags = 'g') => new RegExp(src, flags.includes('g') ? flags : flags + 'g')

const RULES: Rule[] = [
  // 1) 되/돼 — '되'+어/었 형태는 '돼/됐' 로. 문장끝 '되.' → '돼.'
  {
    id: 'doe-dwae', kind: 'error', label: '되/돼',
    re: R('되(?=[.!?\\s]|$)'),
    msg: () => "문장을 끝맺는 '되'는 보통 '돼'(되어의 준말)입니다.",
    fix: () => '돼',
  },
  {
    id: 'doeo', kind: 'warn', label: '되어→돼',
    re: R('되었'),
    msg: () => "'되었'은 '됐'으로 줄여 쓰는 경우가 많습니다.",
    fix: () => '됐',
  },
  {
    id: 'an-doe', kind: 'warn', label: '안되/안돼',
    re: R('안되(?=[.!?\\s]|$)'),
    msg: () => "'안 되'(띄어쓰기) 또는 문장끝이면 '안 돼'가 적절한지 확인하세요.",
    fix: () => null,
  },

  // 2) 안/않 — '안 +형용사/동사' vs '-지 않-'
  {
    id: 'anh-eo', kind: 'info', label: '안/않',
    re: R('([가-힣])안(?=(되|돼|하|가))'),
    msg: () => "부정 '안'은 보통 앞말과 띄어 씁니다(예: 안 돼). '-지 않-'과 혼동하지 마세요.",
    fix: () => null,
  },
  {
    id: 'jianta', kind: 'warn', label: '~잖아',
    re: R('([가-힣])찮아'),
    msg: (_m, g) => `'${g[0]}찮아'가 '${g[0]}잖아'의 오기인지 확인하세요(예: 있찮아→있잖아).`,
    fix: () => null,
  },

  // 3) -로서 / -로써
  {
    id: 'roseo', kind: 'info', label: '로서/로써',
    re: R('으?로써'),
    msg: () => "'로써'는 수단·도구·재료에 씁니다. 자격·지위면 '로서'가 맞습니다.",
    fix: () => null,
  },
  {
    id: 'roseo2', kind: 'info', label: '로서/로써',
    re: R('으?로서'),
    msg: () => "'로서'는 자격·신분·지위에 씁니다. 수단·도구면 '로써'가 맞습니다.",
    fix: () => null,
  },

  // 4) -든지 / -던지  (선택=든, 과거회상=던)
  {
    id: 'deonji', kind: 'warn', label: '든지/던지',
    re: R('([가-힣])던지'),
    msg: (_m, g) => `선택을 뜻하면 '${g[0]}든지'(예: 가든지 말든지), 과거 회상이면 '${g[0]}던지'입니다.`,
    fix: () => null,
  },
  {
    id: 'deon-mal', kind: 'error', label: '든가/던가',
    re: R('던가\\s*말던가'),
    msg: () => "선택 표현은 '~든가 말든가'(든)로 씁니다.",
    fix: () => '든가 말든가',
  },

  // 5) 율 / 률  (받침 없거나 ㄴ받침 뒤=율, 그 외 받침 뒤=률)
  {
    id: 'ryul-wrong', kind: 'error', label: '율/률',
    re: R('([가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허기니디리미비시이지치키티피히])률'),
    msg: (_m, g) => `모음·'ㄴ' 받침 뒤에서는 '률'이 아니라 '율'입니다(예: ${g[0]}율).`,
    fix: (_m, g) => `${g[0]}율`,
  },

  // 6) 왠 / 웬  ('왠지'만 맞고 나머지는 '웬')
  {
    id: 'waen', kind: 'error', label: '왠/웬',
    re: R('왠(?!지)'),
    msg: () => "'왠'은 '왠지'에서만 씁니다. 그 외에는 '웬'(웬일, 웬만큼)이 맞습니다.",
    fix: () => '웬',
  },
  {
    id: 'wen-ji', kind: 'error', label: '왠/웬',
    re: R('웬지'),
    msg: () => "'웬지'는 틀린 표기입니다. '왠지'가 맞습니다.",
    fix: () => '왠지',
  },

  // 7) 흔한 단어 오류
  {
    id: 'doraeso', kind: 'error', label: '맞춤법',
    re: R('금새'),
    msg: () => "시간을 뜻하면 '금세'(금시에)가 맞습니다.",
    fix: () => '금세',
  },
  {
    id: 'eotteoke', kind: 'error', label: '맞춤법',
    re: R('어떻해'),
    msg: () => "'어떡해' 또는 '어떻게 해'가 맞습니다('어떻해'는 틀림).",
    fix: () => '어떡해',
  },
  {
    id: 'dwaeyo', kind: 'error', label: '맞춤법',
    re: R('됬'),
    msg: () => "'됬'은 없는 표기입니다. '됐'(되었)이 맞습니다.",
    fix: () => '됐',
  },
  {
    id: 'munja', kind: 'error', label: '맞춤법',
    re: R('할께'),
    msg: () => "의지·약속은 '할게'로 적습니다('할께'는 틀림).",
    fix: () => '할게',
  },
  {
    id: 'gguh', kind: 'error', label: '맞춤법',
    re: R('할려고'),
    msg: () => "'하려고'가 맞습니다('할려고'는 틀림).",
    fix: () => '하려고',
  },
  {
    id: 'bappa', kind: 'error', label: '맞춤법',
    re: R('바램'),
    msg: () => "소망의 뜻이면 '바람'이 표준어입니다('바램'은 빛바램의 뜻).",
    fix: () => '바람',
  },
  {
    id: 'eopseo', kind: 'error', label: '맞춤법',
    re: R('없슴'),
    msg: () => "'없음'이 맞습니다('없슴'은 틀림).",
    fix: () => '없음',
  },
  {
    id: 'isseum', kind: 'error', label: '맞춤법',
    re: R('([가-힣])습니당'),
    msg: (_m, g) => `'${g[0]}습니다'의 오타일 수 있습니다.`,
    fix: (_m, g) => `${g[0]}습니다`,
  },
  {
    id: 'gae', kind: 'error', label: '맞춤법',
    re: R('몇일'),
    msg: () => "'며칠'이 맞습니다('몇일'은 틀림).",
    fix: () => '며칠',
  },
  {
    id: 'oennmanhada', kind: 'error', label: '맞춤법',
    re: R('왠만'),
    msg: () => "'웬만'이 맞습니다(웬만하다, 웬만큼).",
    fix: () => '웬만',
  },
  {
    id: 'gajang', kind: 'error', label: '맞춤법',
    re: R('일일히'),
    msg: () => "'일일이'가 맞습니다('일일히'는 틀림).",
    fix: () => '일일이',
  },
  {
    id: 'gomgomi', kind: 'error', label: '맞춤법',
    re: R('곰곰히'),
    msg: () => "'곰곰이'가 맞습니다.",
    fix: () => '곰곰이',
  },
  {
    id: 'gakkkeum', kind: 'error', label: '맞춤법',
    re: R('깨끗히'),
    msg: () => "'깨끗이'가 맞습니다.",
    fix: () => '깨끗이',
  },
  {
    id: 'oraen', kind: 'error', label: '맞춤법',
    re: R('오랫만'),
    msg: () => "'오랜만'이 맞습니다(오래간만의 준말). '오랫동안'은 맞음.",
    fix: () => '오랜만',
  },
  {
    id: 'sseuregi', kind: 'error', label: '맞춤법',
    re: R('설겆이'),
    msg: () => "'설거지'가 맞습니다.",
    fix: () => '설거지',
  },

  // 8) 띄어쓰기 — 의존명사 '수/것/때문' 등은 앞말과 띄어 쓴다
  {
    id: 'space-su', kind: 'warn', label: '띄어쓰기',
    re: R('([가-힣])수(?=(있|없|밖))'),
    msg: () => "의존명사 '수'는 앞말과 띄어 씁니다(예: 할 수 있다).",
    fix: () => null,
  },
  {
    id: 'space-ttaemun', kind: 'warn', label: '띄어쓰기',
    re: R('([가-힣])때문'),
    msg: (_m, g) => `'때문'은 앞말과 띄어 씁니다(예: ${g[0]} 때문에). 조사 뒤가 아니면 확인하세요.`,
    fix: () => null,
  },
  {
    id: 'space-geot', kind: 'warn', label: '띄어쓰기',
    re: R('([가-힣])것'),
    msg: () => "의존명사 '것'은 앞말과 띄어 씁니다(예: 먹는 것).",
    fix: () => null,
  },
  {
    id: 'space-deut', kind: 'warn', label: '띄어쓰기',
    re: R('([0-9]+)(개|명|원|시간|마리|권|장|대|살)([가-힣]|$)'),
    msg: () => "단위 명사는 앞 숫자와 띄어 쓰는 것이 원칙입니다(예: 3 개, 다만 붙여쓰기도 허용).",
    fix: () => null,
  },

  // 9) 중복어(겹말)
  {
    id: 'dup-ga', kind: 'info', label: '겹말',
    re: R('역전\\s*앞'),
    msg: () => "'역전'에 이미 '앞' 뜻이 있습니다. '역 앞' 또는 '역전'으로.",
    fix: () => '역 앞',
  },
  {
    id: 'dup-na', kind: 'info', label: '겹말',
    re: R('처갓?집'),
    msg: () => "'처가'에 이미 '집(家)' 뜻이 있습니다. '처가'로 충분합니다.",
    fix: () => '처가',
  },
  {
    id: 'dup-da', kind: 'info', label: '겹말',
    re: R('미리\\s*예약'),
    msg: () => "'예약'에 '미리' 뜻이 포함됩니다. '예약'으로 충분합니다.",
    fix: () => '예약',
  },
  {
    id: 'dup-ra', kind: 'info', label: '겹말',
    re: R('다시\\s*재(검토|확인|발급|시작|발송)'),
    msg: () => "'재-'에 '다시' 뜻이 있습니다(겹말). 하나만 쓰세요.",
    fix: () => null,
  },
  {
    id: 'dup-ma', kind: 'info', label: '겹말',
    re: R('해변\\s*가'),
    msg: () => "'해변'에 이미 '가(邊)' 뜻이 있습니다. '해변' 또는 '바닷가'로.",
    fix: () => '해변',
  },
  {
    id: 'dup-word', kind: 'info', label: '단어 반복',
    re: R('(?<![가-힣])([가-힣]{2,})\\s+\\1(?![가-힣])'),
    msg: (_m, g) => `'${g[0]}'가 연속으로 반복되었습니다. 의도한 강조가 아니면 하나만 남기세요.`,
    fix: (_m, g) => g[0],
  },

  // 10) 이중부정 / 과한 표현
  {
    id: 'double-neg', kind: 'info', label: '이중부정',
    re: R('없지\\s*않'),
    msg: () => "'없지 않다'는 이중부정입니다. 뜻이 명확한지 확인하세요(=있다).",
    fix: () => null,
  },
  {
    id: 'double-neg2', kind: 'info', label: '이중부정',
    re: R('안\\s*([가-힣]+)지\\s*않'),
    msg: () => "이중부정 구문입니다. 문장을 더 단순하게 쓸 수 있는지 확인하세요.",
    fix: () => null,
  },

  // 11) 조사·어미 흔한 오류
  {
    id: 'euro-ssi', kind: 'warn', label: '율/률 외',
    re: R('([가-힣])에요'),
    msg: (_m, g) => `받침이 있는 명사 뒤에는 보통 '${g[0]}이에요'가 자연스럽습니다.`,
    fix: () => null,
  },
  {
    id: 'ge-marker', kind: 'warn', label: '게/께',
    re: R('할(거|꺼)야'),
    msg: () => "'할 거야'가 맞습니다(의존명사 '거' 띄어쓰기, '꺼'는 틀림).",
    fix: () => '할 거야',
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
  // 위치순 정렬
  hits.sort((a, b) => a.index - b.index || a.rule.id.localeCompare(b.rule.id))
  return hits
}

const KIND_COLOR: Record<Kind, string> = { error: 'var(--warn)', warn: 'var(--accent)', info: 'var(--muted)' }
const KIND_LABEL: Record<Kind, string> = { error: '오류', warn: '주의', info: '참고' }

export default function KoreanSpellHelper() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | Kind>('all')
  // 활성 문서 연동: 불러온 문서 id + 그때의 본문 스냅샷(현재 textarea 와 같아야 제자리 적용이 안전).
  const [linkedDocId, setLinkedDocId] = useState<string | null>(null)
  const [linkedText, setLinkedText] = useState<string | null>(null)
  const [linkedTitle, setLinkedTitle] = useState('')
  const [toast, setToast] = useState('')
  const copyTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }, [])

  // 현재(활성) 문서 본문을 불러와 검사 — 붙여넣기 없이 원고와 직접 연결.
  const loadActiveDoc = useCallback(() => {
    const d = getActiveDoc()
    if (!d) { flash('현재 활성 텍스트 문서가 없습니다. 좌측에서 문서를 여세요.'); return }
    setText(d.text)
    setLinkedDocId(d.id)
    setLinkedText(d.text)
    setLinkedTitle(d.title)
    flash(d.text.trim() ? `“${d.title}” 본문을 불러왔습니다.` : `“${d.title}”은(는) 본문이 비어 있습니다.`)
  }, [flash])

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
        return `${i + 1}. [${KIND_LABEL[h.rule.kind]}/${h.rule.label}] (${where}) "${h.match}"${sug}\n   ${h.rule.msg(h.match, h.groups)}`
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

  // 매치 위치로 textarea 커서 이동 + 선택
  const jumpTo = (h: Hit) => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(h.index, h.end) } catch { /* noop */ }
  }

  // 불러온 문서와 현재 검사 텍스트가 일치하면(편집 안 함) 본문에 제자리 적용이 안전하다.
  const linkLive = linkedDocId != null && linkedText != null && text === linkedText
  // 제안(fix)이 있어 본문에 바로 적용 가능한 항목들
  const fixableHits = useMemo(() => hits.filter((h) => h.suggestion != null), [hits])

  // 활성 문서를 다시 읽어 검사 텍스트·스냅샷을 동기화(적용 직후 호출).
  const resyncLinkedDoc = useCallback(() => {
    const d = getActiveDoc()
    if (!d) { setLinkedDocId(null); setLinkedText(null); return }
    setText(d.text)
    setLinkedDocId(d.id)
    setLinkedText(d.text)
    setLinkedTitle(d.title)
  }, [])

  // 한 제안을 본문 RTF 에 제자리 치환. 안전 가드(스냅샷 일치)는 linkLive 로 차단.
  const applyOne = (h: Hit) => {
    if (!linkLive || !linkedDocId || linkedText == null || h.suggestion == null) return
    const rep: DocReplacement = { index: h.index, end: h.end, replacement: h.suggestion }
    const r = applyActiveDocReplace(linkedDocId, linkedText, [rep])
    if (r.ok) { flash(`본문 1곳을 수정했습니다 (“${h.match}” → “${h.suggestion}”).`); resyncLinkedDoc() }
    else flash('본문에 적용하지 못했습니다: ' + (r.reason || '알 수 없는 이유'))
  }

  // 제안이 있는 모든 항목을 한 번에 본문에 적용(겹침은 App 가 거부 — 데이터 안전).
  const applyAllFixable = () => {
    if (!linkLive || !linkedDocId || linkedText == null) return
    const reps: DocReplacement[] = fixableHits
      .filter((h) => h.suggestion != null)
      .map((h) => ({ index: h.index, end: h.end, replacement: h.suggestion as string }))
    if (reps.length === 0) { flash('적용할 제안이 없습니다.'); return }
    const r = applyActiveDocReplace(linkedDocId, linkedText, reps)
    if (r.ok) { flash(`본문 ${r.applied}곳을 수정했습니다.`); resyncLinkedDoc() }
    else flash('본문에 적용하지 못했습니다: ' + (r.reason || '알 수 없는 이유'))
  }

  const sample = '오늘 회의가 잘 됬다. 나는 학생으로써 최선을 다 할려고 했지만 몇일 동안 바램이 안이뤄졌다. 할수있다는 생각으로 다시 재시작 했다. 왠일인지 역전 앞에서 만나기로 했는데, 합격율이 높다고 했다.'

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', position: 'relative' }
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
  // 카드 내 '본문에 적용' 버튼(제안이 있고, 불러온 문서와 텍스트가 일치할 때만 노출)
  const applyBtn: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--paper)', background: 'var(--ok)', border: '1px solid var(--ok)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 1.4 }
  const linkBar: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
  const toastStyle: React.CSSProperties = { position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 999, padding: '7px 16px', fontSize: 12.5, boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 8, maxWidth: '92%', textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div style={title}>✍️ 자주 틀리는 한국어 맞춤법을 로컬 규칙으로 점검합니다 (네트워크 불필요)</div>
        {hasActiveDoc() && (
          <button className="linkbtn" type="button" onClick={loadActiveDoc} title="현재 편집 중인 문서의 본문을 불러와 검사합니다">📄 현재 문서 불러오기</button>
        )}
      </div>

      {linkedDocId != null && (
        <div style={linkBar}>
          {linkLive
            ? <span>🔗 “{linkedTitle || '문서'}” 본문과 연결됨 — 제안의 <b>본문에 적용</b>으로 그 자리에서 수정할 수 있습니다.</span>
            : <span>✎ 검사 텍스트를 직접 편집하여 본문과 달라졌습니다. <b>현재 문서 불러오기</b>를 다시 누르면 본문에 적용할 수 있습니다.</span>}
        </div>
      )}

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="검사할 글을 여기에 붙여넣으세요. 입력하는 동안 실시간으로 점검됩니다."
        spellCheck={false}
        aria-label="검사할 텍스트 입력"
      />

      <div style={chipRow}>
        <span style={chip(filter === 'all', 'var(--accent)')} onClick={() => setFilter('all')} role="button" tabIndex={0}>전체 {hits.length}</span>
        <span style={chip(filter === 'error', KIND_COLOR.error)} onClick={() => setFilter('error')} role="button" tabIndex={0}>오류 {counts.error}</span>
        <span style={chip(filter === 'warn', KIND_COLOR.warn)} onClick={() => setFilter('warn')} role="button" tabIndex={0}>주의 {counts.warn}</span>
        <span style={chip(filter === 'info', KIND_COLOR.info)} onClick={() => setFilter('info')} role="button" tabIndex={0}>참고 {counts.info}</span>
        <span style={{ flex: 1 }} />
        {linkLive && fixableHits.length > 0 && (
          <button className="linkbtn" onClick={applyAllFixable} type="button" title="제안이 있는 모든 항목을 본문에 한 번에 적용합니다">✓ 제안 {fixableHits.length}건 본문 적용</button>
        )}
        <button className="minibtn" onClick={() => setText(sample)} type="button">예시</button>
        <button className="minibtn" onClick={() => setText('')} disabled={!text} type="button">지우기</button>
        <button className="btn-primary" onClick={doCopy} disabled={hits.length === 0} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
      </div>

      {text.trim() === '' ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>📝</div>
          <div>글을 붙여넣으면 되/돼·안/않·로서/로써·율/률·왠/웬·<br />띄어쓰기·겹말·이중부정 등을 검사합니다.</div>
          <div style={hint}>규칙 기반이라 일부는 문맥 확인이 필요한 '주의·참고' 항목입니다.</div>
        </div>
      ) : shown.length === 0 ? (
        <div style={empty}>
          <div style={{ fontSize: 30 }}>{hits.length === 0 ? '✅' : '🔍'}</div>
          <div>{hits.length === 0 ? '발견된 항목이 없습니다. 깔끔합니다!' : '선택한 분류에 해당하는 항목이 없습니다.'}</div>
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
                <span style={tag(KIND_COLOR[h.rule.kind])}>{KIND_LABEL[h.rule.kind]} · {h.rule.label}</span>
                <span style={pos}>줄 {h.line}, 칸 {h.col}</span>
                <span style={{ flex: 1 }} />
                <span style={matchTxt}>{h.match.replace(/\n/g, '⏎')}</span>
                {h.suggestion && <span style={{ color: 'var(--muted)' }}>→</span>}
                {h.suggestion && <span style={sugTxt}>{h.suggestion}</span>}
                {linkLive && h.suggestion && (
                  <button
                    style={applyBtn}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); applyOne(h) }}
                    title="이 제안을 본문 해당 위치에 바로 적용합니다"
                  >본문에 적용</button>
                )}
              </div>
              <div style={msgTxt}>{h.rule.msg(h.match, h.groups)}</div>
            </div>
          ))}
        </div>
      )}

      {toast && <div style={toastStyle} role="status" aria-live="polite">{toast}</div>}
    </div>
  )
}
