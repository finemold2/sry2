// 환율 변환 — 무료·키 없는 공개 API(frankfurter.app)로 통화쌍 환율을 가져와 금액을 환산한다.
// API: https://api.frankfurter.app (키 불필요·https·CORS 허용). 작품 속 금전 묘사·물가 감각 참고용.
import { useState, useEffect, useRef } from 'react'

export const meta = { id: 'currency-converter', name: '환율 변환', icon: '💱', group: '유틸·참고', intro: '통화쌍 환율로 작품 속 금액을 환산해 보세요', w: 420, h: 520 }

// frankfurter 지원 통화 목록(키 없이 사용 가능). 동적 로드 실패 시 폴백으로도 쓴다.
const FALLBACK: Record<string, string> = {
  USD: 'United States Dollar', KRW: 'South Korean Won', EUR: 'Euro', JPY: 'Japanese Yen',
  GBP: 'British Pound', CNY: 'Chinese Renminbi Yuan', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc', HKD: 'Hong Kong Dollar', SGD: 'Singapore Dollar', THB: 'Thai Baht',
  INR: 'Indian Rupee', BRL: 'Brazilian Real', MXN: 'Mexican Peso', SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone', DKK: 'Danish Krone', NZD: 'New Zealand Dollar', ZAR: 'South African Rand',
  TRY: 'Turkish Lira', PLN: 'Polish Złoty', PHP: 'Philippine Peso', IDR: 'Indonesian Rupiah',
  MYR: 'Malaysian Ringgit', CZK: 'Czech Koruna', HUF: 'Hungarian Forint', ILS: 'Israeli New Shekel',
  RON: 'Romanian Leu', ISK: 'Icelandic Króna',
}

// 한국어 통화명(자주 쓰는 것 위주). 없으면 영어 원문을 그대로 보여준다.
const KO_NAME: Record<string, string> = {
  USD: '미국 달러', KRW: '대한민국 원', EUR: '유로', JPY: '일본 엔', GBP: '영국 파운드',
  CNY: '중국 위안', AUD: '호주 달러', CAD: '캐나다 달러', CHF: '스위스 프랑', HKD: '홍콩 달러',
  SGD: '싱가포르 달러', THB: '태국 바트', INR: '인도 루피', BRL: '브라질 헤알', MXN: '멕시코 페소',
  SEK: '스웨덴 크로나', NOK: '노르웨이 크로네', DKK: '덴마크 크로네', NZD: '뉴질랜드 달러',
  ZAR: '남아공 랜드', TRY: '튀르키예 리라', PLN: '폴란드 즈워티', PHP: '필리핀 페소',
  IDR: '인도네시아 루피아', MYR: '말레이시아 링깃', CZK: '체코 코루나', HUF: '헝가리 포린트',
  ILS: '이스라엘 셰켈', RON: '루마니아 레우', ISK: '아이슬란드 크로나',
}

interface Result { amount: number; from: string; to: string; rate: number; converted: number; date: string }

function labelOf(code: string, names: Record<string, string>): string {
  const ko = KO_NAME[code]
  const en = names[code]
  if (ko) return `${code} · ${ko}`
  if (en) return `${code} · ${en}`
  return code
}

function fmt(n: number): string {
  // 큰 수는 천 단위 구분, 소수는 최대 4자리까지 보기 좋게 표시.
  const digits = Math.abs(n) >= 100 ? 2 : 4
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

export default function CurrencyConverter() {
  const [names, setNames] = useState<Record<string, string>>(FALLBACK)
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('KRW')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const nonce = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 통화 목록 동적 로드(실패해도 폴백으로 계속 동작).
  useEffect(() => {
    let alive = true
    fetch('https://api.frankfurter.app/currencies')
      .then((r) => { if (!r.ok) throw new Error('bad'); return r.json() })
      .then((j) => {
        if (!alive || !j || typeof j !== 'object') return
        const keys = Object.keys(j)
        if (keys.length) setNames(j as Record<string, string>)
      })
      .catch(() => { /* 폴백 유지 */ })
    return () => { alive = false }
  }, [])

  const convert = async () => {
    const amt = parseFloat(amount.replace(/,/g, ''))
    if (!isFinite(amt) || amt < 0) { setErr('올바른 금액을 입력하세요.'); return }
    if (from === to) {
      setErr('')
      setResult({ amount: amt, from, to, rate: 1, converted: amt, date: '' })
      setCopied(false)
      return
    }
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false)
    try {
      const url = `https://api.frankfurter.app/latest?amount=${encodeURIComponent(amt)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      const r = await fetch(url)
      if (!r.ok) throw new Error('bad status')
      const j = await r.json()
      const converted = j && j.rates ? j.rates[to] : undefined
      if (typeof converted !== 'number') throw new Error('no rate')
      const rate = amt !== 0 ? converted / amt : converted
      if (my === nonce.current && mounted.current) {
        setResult({ amount: amt, from, to, rate, converted, date: j.date || '' })
      }
    } catch {
      if (my === nonce.current && mounted.current) setErr('환율을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
    } finally {
      if (my === nonce.current && mounted.current) setLoading(false)
    }
  }

  const swap = () => {
    setFrom(to); setTo(from); setResult(null); setErr(''); setCopied(false)
  }

  const buildText = (res: Result): string => {
    const base = `💱 ${fmt(res.amount)} ${res.from} = ${fmt(res.converted)} ${res.to}\n· 환율: 1 ${res.from} = ${fmt(res.rate)} ${res.to}`
    return res.date ? `${base}\n· 기준일: ${res.date}` : base
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard?.writeText(buildText(result)).then(() => {
      setCopied(true); setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => {})
  }

  const codes = Object.keys(names).sort()

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 }
  const inputS: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 14 }
  const selS: React.CSSProperties = { ...inputS, cursor: 'pointer' }
  const pairRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-end' }
  const col: React.CSSProperties = { flex: 1, minWidth: 0 }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }
  const msg: React.CSSProperties = { color: 'var(--muted)', fontSize: 14 }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  return (
    <div style={wrap}>
      <div>
        <div style={label}>금액</div>
        <input
          style={inputS}
          inputMode="decimal"
          placeholder="예: 100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') convert() }}
        />
      </div>

      <div style={pairRow}>
        <div style={col}>
          <div style={label}>보내는 통화</div>
          <select style={selS} value={from} onChange={(e) => { setFrom(e.target.value); setResult(null) }}>
            {codes.map((c) => <option key={c} value={c}>{labelOf(c, names)}</option>)}
          </select>
        </div>
        <button className="minibtn" onClick={swap} title="통화 교환" style={{ marginBottom: 1 }}>⇄</button>
        <div style={col}>
          <div style={label}>받는 통화</div>
          <select style={selS} value={to} onChange={(e) => { setTo(e.target.value); setResult(null) }}>
            {codes.map((c) => <option key={c} value={c}>{labelOf(c, names)}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={convert} disabled={loading}>
        {loading ? '환산 중…' : '💱 환산하기'}
      </button>

      <div style={card}>
        {loading && <div style={msg}>불러오는 중…</div>}
        {!loading && err && <div style={msg}>{err}</div>}
        {!loading && !err && result && (
          <>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
              {fmt(result.amount)} {result.from}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2, wordBreak: 'break-all' }}>
              {fmt(result.converted)} <span style={{ fontSize: 16, fontWeight: 600 }}>{result.to}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              1 {result.from} = {fmt(result.rate)} {result.to}
              {result.date && <><br />기준일 {result.date}</>}
            </div>
          </>
        )}
        {!loading && !err && !result && <div style={msg}>금액과 통화를 정하고 환산해 보세요.</div>}
      </div>

      <div style={actions}>
        <button className="minibtn" onClick={copy} disabled={!result || loading}>
          {copied ? '✓ 복사됨' : '📋 결과 복사'}
        </button>
      </div>

      <div style={hint}>
        실시간에 가까운 공개 환율(frankfurter.app)을 사용합니다. 작품 속 금액·물가 감각을 잡는 참고용으로 활용하세요.
      </div>
    </div>
  )
}
