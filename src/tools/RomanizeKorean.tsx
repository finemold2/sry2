// 한글 로마자 변환 — 입력 한글을 국어의 로마자 표기법(2000, 문화체육관광부 고시)에 근사하게 변환.
// 완전 로컬: 한글 음절을 초성/중성/종성으로 분해한 뒤 자모 매핑 + 받침-초성 연음/동화 규칙을 적용.
// 외부 API 없음(키 불필요·네트워크 불필요). 인명/지명 영문 표기 보조용 근사 변환이며 표준 표기와 다를 수 있음.
import { useState, useMemo } from 'react'

export const meta = { id: 'romanize-korean', name: '한글 로마자 변환', icon: '🔤', group: '유틸·참고', intro: '한글 이름·지명을 국어의 로마자 표기법으로 근사 변환', w: 440, h: 560 }

// 초성 19개 로마자(어두 기준)
const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
// 중성 21개
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
// 종성 28개(0=없음). 받침의 대표음(불파음) 기준.
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']
// 받침 인덱스 -> 종성 자음의 '음운 분류' 키(연음/동화 판단용)
const JONG_PHON = ['', 'k', 'kk', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

type Syl = { cho: number; jung: number; jong: number } | { ch: string }

function decompose(text: string): Syl[] {
  const out: Syl[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00
      out.push({ cho: Math.floor(s / 588), jung: Math.floor((s % 588) / 28), jong: s % 28 })
    } else {
      out.push({ ch })
    }
  }
  return out
}

// 받침(현재 종성) + 다음 초성 자음 사이의 단순 동화·연음 처리.
// 반환: [현재 음절의 종성 로마자, 다음 음절 초성 로마자(치환되면 그 값, 아니면 null)]
function liaison(jongPhon: string, nextCho: number): [string, string | null] {
  const jongRo = ((): string => {
    // 기본 종성 로마자(대표음)
    const map: Record<string, string> = {
      k: 'k', kk: 'k', ks: 'k', lk: 'k',
      n: 'n', nj: 'n', nh: 'n',
      t: 't', s: 't', ss: 't', j: 't', ch: 't', h: 't',
      l: 'l', lm: 'm', lb: 'l', ls: 'l', lt: 'l', lp: 'p', lh: 'l',
      m: 'm', p: 'p', ps: 'p', ng: 'ng',
    }
    return map[jongPhon] ?? ''
  })()

  if (jongPhon === '') return ['', null]

  // 다음 초성이 'ㅇ'(11) 이면 연음 — 받침을 다음 음절 초성으로 옮긴다.
  if (nextCho === 11) {
    const liaisonMap: Record<string, [string, string]> = {
      // [현재 음절에 남길 종성, 다음 음절 초성으로 옮길 자음]
      k: ['', 'g'], kk: ['', 'kk'], ks: ['k', 's'], lk: ['l', 'g'],
      n: ['', 'n'], nj: ['n', 'j'], nh: ['', 'n'],
      t: ['', 'd'], s: ['', 's'], ss: ['', 'ss'], j: ['', 'j'], ch: ['', 'ch'], h: ['', ''],
      l: ['', 'r'], lm: ['l', 'm'], lb: ['l', 'b'], ls: ['l', 's'], lt: ['l', 't'], lp: ['l', 'p'], lh: ['l', ''],
      m: ['', 'm'], p: ['', 'b'], ps: ['p', 's'], ng: ['ng', ''],
    }
    const m = liaisonMap[jongPhon]
    if (m) return [m[0], m[1]]
    return [jongRo, null]
  }

  // 유음화: ㄹ받침 + ㄴ초성 → ll (예: 별내→byeollae)
  if (jongRo === 'l' && nextCho === 2) return ['l', 'l']

  // 비음화: ㄱ받침 + ㄴ/ㅁ → ng+n / ng+m, ㅂ받침 + ㄴ/ㅁ → m+n, ㄷ계열 + ㄴ/ㅁ → n+
  const nextIsNasal = nextCho === 2 || nextCho === 6 // ㄴ, ㅁ
  if (nextIsNasal) {
    if (jongRo === 'k') return ['ng', null]
    if (jongRo === 'p') return ['m', null]
    if (jongRo === 't') return ['n', null]
  }

  // 다음 초성이 'ㄹ'(5) 인 경우
  if (nextCho === 5) {
    // 유음화: ㄴ+ㄹ, ㄹ+ㄹ → ll
    if (jongRo === 'n') return ['l', 'l']
    if (jongRo === 'l') return ['l', 'l']
    // ㄱ받침 + ㄹ → 비음화: ng + n (예: 독립→dongnip)
    if (jongRo === 'k') return ['ng', 'n']
    // ㅂ받침 + ㄹ → m + n (예: 왕십리→wangsimni)
    if (jongRo === 'p') return ['m', 'n']
    // ㅁ/ㅇ받침 + ㄹ → ㄹ이 ㄴ으로 (예: 종로→jongno, 담력→damnyeok)
    if (jongRo === 'm' || jongRo === 'ng') return [jongRo, 'n']
  }

  // 그 외 자음 앞: 종성 대표음 그대로
  return [jongRo, null]
}

// 받침 연음/동화로 다음 음절 초성이 바뀔 수 있으므로(초성 override 지원) 2-패스로 변환.
function romanize2(text: string): string {
  const syls = decompose(text) as (Record<string, unknown>)[]
  // 1차: 받침 처리로 다음 초성 override 설정
  for (let i = 0; i < syls.length; i++) {
    const cur = syls[i]
    if ('ch' in cur) continue
    if ((cur.jong as number) === 0) continue
    const next = syls[i + 1]
    if (!next || 'ch' in next) continue
    const phon = JONG_PHON[cur.jong as number]
    const [keep, moved] = liaison(phon, next.cho as number)
    cur._keep = keep
    if (moved !== null) next._ovr = moved
  }
  // 2차: 문자열 생성
  let res = ''
  for (let i = 0; i < syls.length; i++) {
    const cur = syls[i]
    if ('ch' in cur) { res += cur.ch as string; continue }
    res += (cur._ovr as string | undefined) ?? CHO[cur.cho as number]
    res += JUNG[cur.jung as number]
    if ((cur.jong as number) !== 0) {
      res += (cur._keep as string | undefined) ?? JONG[cur.jong as number]
    }
  }
  return res
}

// 인명용: 음절 첫 글자 대문자(성/이름 첫 글자)
function capitalizeName(s: string): string {
  return s.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

export default function RomanizeKorean() {
  const [input, setInput] = useState('홍길동')
  const [nameMode, setNameMode] = useState(true)
  const [copied, setCopied] = useState('')

  const result = useMemo(() => {
    try {
      const raw = romanize2(input).trim()
      if (!raw) return ''
      return nameMode ? capitalizeName(raw) : raw
    } catch {
      return ''
    }
  }, [input, nameMode])

  const copy = (t: string) => {
    if (!t) return
    navigator.clipboard?.writeText(t).then(() => {
      setCopied(t)
      window.setTimeout(() => setCopied(''), 1200)
    }).catch(() => {})
  }

  const examples = ['홍길동', '김철수', '서울특별시', '독립문', '신라면', '광화문', '제주도', '백두산', '왕십리', '한라산']

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        한글 이름·지명을 국어의 로마자 표기법(근사)으로 바꿉니다. 받침 연음·비음화 등 기본 규칙을 적용합니다.
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="예: 홍길동 / 서울특별시"
        rows={2}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 15, resize: 'none' }}
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
        <input type="checkbox" checked={nameMode} onChange={(e) => setNameMode(e.target.checked)} />
        인명·지명 모드 (단어 첫 글자 대문자)
      </label>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {result ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>변환 결과</div>
            <div style={{ fontSize: 22, fontWeight: 600, wordBreak: 'break-word', color: 'var(--accent)' }}>{result}</div>
            <button className="btn-primary" onClick={() => copy(result)} style={{ alignSelf: 'flex-start' }}>
              {copied === result ? '✓ 복사됨' : '📋 복사'}
            </button>
          </>
        ) : (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', lineHeight: 1.6 }}>
            한글을 입력하면 로마자 표기가<br />여기에 나타납니다.
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>예시 (눌러서 입력)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {examples.map((ex) => (
          <button key={ex} className="minibtn" onClick={() => setInput(ex)} style={{ background: 'var(--chrome-2)' }}>
            {ex}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="minibtn" onClick={() => setInput('')}>지우기</button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
        ※ 표준 표기법의 근사 변환입니다. 된소리·일부 예외(인명 음절 사이 표기 등)는 실제 표기와 다를 수 있으니 공식 문서엔 확인 후 사용하세요.
      </div>
    </div>
  )
}
