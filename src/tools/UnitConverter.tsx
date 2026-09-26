// 단위 변환기 — 길이/무게/온도/넓이/부피/속도/시간을 한 단위 입력으로 전 단위 동시 환산(로컬·오프라인).
// 외부 통신 없음. 각 단위에 시대·과학 묘사 고증 메모를 붙여 작품 속 도량형 감각을 잡도록 돕는다.
import { useState, useEffect, useRef } from 'react'
import { Emoji, emojify } from './linkbus'

export const meta = { id: 'unit-converter', name: '단위 변환기', icon: '📐', group: '유틸·참고', intro: '길이·무게·온도·넓이·부피·속도·시간을 한 번에 환산 (시대·과학 고증 메모)', w: 560, h: 560 }

const LS_KEY = 'sry:tool:unit-converter'

// 단위 정의: factor 는 기준 단위(base) 대비 곱셈 비율. note 는 시대·과학 묘사 고증 메모.
interface Unit { code: string; name: string; sym: string; factor: number; note?: string }
interface Category { id: string; name: string; icon: string; base: string; units: Unit[]; note?: string }

// 온도는 곱셈만으로 환산되지 않아 별도 함수로 처리한다.
const TEMP_UNITS: Unit[] = [
  { code: 'C', name: '섭씨', sym: '°C', factor: 1, note: '1742년 셀시우스가 제안. 물의 어는점 0·끓는점 100. 현대 일상 온도의 표준.' },
  { code: 'F', name: '화씨', sym: '°F', factor: 1, note: '1724년 파렌하이트가 고안. 미국·일부 영어권에서 일상적으로 쓴다(체온 약 98.6°F).' },
  { code: 'K', name: '켈빈', sym: 'K', factor: 1, note: '절대온도. 0K는 절대영도(−273.15°C). 과학·천문 묘사의 정확한 척도.' },
  { code: 'Re', name: '열씨', sym: '°Ré', factor: 1, note: '레오뮈르 눈금. 18~19세기 유럽 요리·양조에서 쓰였다. 물 어는점 0·끓는점 80.' },
]

function toCelsius(v: number, from: string): number {
  switch (from) {
    case 'C': return v
    case 'F': return (v - 32) * 5 / 9
    case 'K': return v - 273.15
    case 'Re': return v * 5 / 4
    default: return v
  }
}
function fromCelsius(c: number, to: string): number {
  switch (to) {
    case 'C': return c
    case 'F': return c * 9 / 5 + 32
    case 'K': return c + 273.15
    case 'Re': return c * 4 / 5
    default: return c
  }
}

const CATEGORIES: Category[] = [
  {
    id: 'length', name: '길이', icon: '📏', base: 'm',
    note: '미터는 1799년 프랑스 혁명기 도량형 통일에서 비롯해, 오늘날 빛이 진공에서 1/299,792,458초 동안 가는 거리로 정의된다.',
    units: [
      { code: 'mm', name: '밀리미터', sym: 'mm', factor: 0.001 },
      { code: 'cm', name: '센티미터', sym: 'cm', factor: 0.01 },
      { code: 'm', name: '미터', sym: 'm', factor: 1, note: 'SI 기본 길이 단위. 빛의 이동 거리로 정의된 현대의 표준자.' },
      { code: 'km', name: '킬로미터', sym: 'km', factor: 1000 },
      { code: 'in', name: '인치', sym: 'in', factor: 0.0254, note: '본래 엄지손가락 너비. 보리알 3개 길이로 정한 중세 영국 관습에서 유래.' },
      { code: 'ft', name: '피트', sym: 'ft', factor: 0.3048, note: '사람 발 길이에서 온 단위(12인치). 항공 고도·신장 표기에 여전히 쓰인다.' },
      { code: 'yd', name: '야드', sym: 'yd', factor: 0.9144, note: '헨리 1세의 코끝~엄지 거리라는 전설이 있는 영국 단위(3피트).' },
      { code: 'mi', name: '마일', sym: 'mi', factor: 1609.344, note: '로마군의 1,000보(mille passus)에서 유래. 영미권 도로 거리의 척도.' },
      { code: 'nmi', name: '해리', sym: 'nmi', factor: 1852, note: '위도 1분에 해당하는 거리. 항해·항공의 거리 단위.' },
      { code: 'ja', name: '자(척)', sym: '尺', factor: 0.303, note: '동아시아 전통 길이. 약 30.3cm. 한옥·한복·고전 묘사의 잣대.' },
      { code: 'ri', name: '리(里)', sym: '里', factor: 392.7, note: '조선의 1리는 약 0.393km. "십리길" 등 옛 거리 감각의 기준.' },
      { code: 'ly', name: '광년', sym: 'ly', factor: 9.4607e15, note: '빛이 1년 동안 가는 거리(약 9.46조 km). SF·천문 묘사의 단위.' },
      { code: 'au', name: '천문단위', sym: 'AU', factor: 1.495978707e11, note: '지구~태양 평균 거리(약 1.5억 km). 태양계 규모 묘사에.' },
    ],
  },
  {
    id: 'weight', name: '무게', icon: '⚖️', base: 'kg',
    note: '킬로그램은 2019년부터 플랑크 상수로 정의된다. 그 전까지 130년간 프랑스의 백금-이리듐 원기(原器)가 기준이었다.',
    units: [
      { code: 'mg', name: '밀리그램', sym: 'mg', factor: 1e-6 },
      { code: 'g', name: '그램', sym: 'g', factor: 0.001 },
      { code: 'kg', name: '킬로그램', sym: 'kg', factor: 1, note: 'SI 기본 질량 단위. 2019년 플랑크 상수 기반으로 재정의.' },
      { code: 't', name: '톤', sym: 't', factor: 1000 },
      { code: 'oz', name: '온스', sym: 'oz', factor: 0.0283495, note: '약 28.35g. 영미권 식재료·우편 무게에 쓰인다.' },
      { code: 'lb', name: '파운드', sym: 'lb', factor: 0.453592, note: '로마의 리브라(libra)에서 유래. 체중·식료품 표기에 흔하다.' },
      { code: 'st', name: '스톤', sym: 'st', factor: 6.35029, note: '14파운드. 영국에서 사람 체중을 말할 때 쓰는 단위.' },
      { code: 'don', name: '돈', sym: '돈', factor: 0.00375, note: '약 3.75g. 금·은 등 귀금속 거래의 동아시아 전통 단위.' },
      { code: 'geun', name: '근(斤)', sym: '斤', factor: 0.6, note: '고기·채소는 600g, 과일·약재는 375g으로도 쳤다. 시장 묘사의 단위.' },
      { code: 'gwan', name: '관(貫)', sym: '貫', factor: 3.75, note: '약 3.75kg(=1000돈). 곡물·소금 등 대량 거래의 옛 단위.' },
      { code: 'ct', name: '캐럿', sym: 'ct', factor: 0.0002, note: '0.2g. 보석(다이아몬드)의 무게 단위. 캐럽 씨앗에서 유래.' },
    ],
  },
  {
    id: 'temperature', name: '온도', icon: '🌡️', base: 'C',
    note: '온도 환산은 단순 비례가 아니라 기준점이 다르다. 절대영도 −273.15°C 아래로는 내려갈 수 없다.',
    units: TEMP_UNITS,
  },
  {
    id: 'area', name: '넓이', icon: '🟩', base: 'm2',
    note: '넓이는 길이의 제곱으로 커진다. 한 변이 2배면 넓이는 4배가 된다는 점을 묘사에 활용하라.',
    units: [
      { code: 'cm2', name: '제곱센티미터', sym: 'cm²', factor: 0.0001 },
      { code: 'm2', name: '제곱미터', sym: 'm²', factor: 1, note: 'SI 넓이 단위. 실내 면적 묘사의 기본.' },
      { code: 'km2', name: '제곱킬로미터', sym: 'km²', factor: 1e6 },
      { code: 'ha', name: '헥타르', sym: 'ha', factor: 10000, note: '100m×100m. 농지·산림 면적에 쓴다.' },
      { code: 'a', name: '아르', sym: 'a', factor: 100 },
      { code: 'pyeong', name: '평', sym: '평', factor: 3.305785, note: '약 3.306m²(사방 6자). 한국 부동산·집 크기 묘사의 관습 단위.' },
      { code: 'danbo', name: '단보(段)', sym: '段', factor: 991.74, note: '약 300평. 논밭 넓이를 셈하던 옛 농지 단위.' },
      { code: 'ac', name: '에이커', sym: 'ac', factor: 4046.86, note: '소 한 쌍이 하루 갈던 밭 넓이에서 유래. 영미권 토지 단위.' },
      { code: 'ft2', name: '제곱피트', sym: 'ft²', factor: 0.092903, note: '영미권 실내 면적 표기.' },
    ],
  },
  {
    id: 'volume', name: '부피', icon: '🧴', base: 'L',
    note: '1리터는 한 변 10cm 정육면체의 부피(1000cm³)이며, 4°C 순수한 물 1L가 거의 정확히 1kg이다.',
    units: [
      { code: 'mL', name: '밀리리터', sym: 'mL', factor: 0.001 },
      { code: 'L', name: '리터', sym: 'L', factor: 1, note: '1000cm³. 음료·생활 부피의 기본.' },
      { code: 'm3', name: '세제곱미터', sym: 'm³', factor: 1000 },
      { code: 'tsp', name: '티스푼', sym: 'tsp', factor: 0.00492892, note: '약 4.93mL. 영미식 조리 계량.' },
      { code: 'tbsp', name: '테이블스푼', sym: 'tbsp', factor: 0.0147868, note: '약 14.79mL. 조리 계량 단위.' },
      { code: 'cup', name: '컵(US)', sym: 'cup', factor: 0.236588, note: '약 236.6mL. 미국식 요리 계량컵.' },
      { code: 'flozUS', name: '액량온스(US)', sym: 'fl oz', factor: 0.0295735 },
      { code: 'ptUS', name: '파인트(US)', sym: 'pt', factor: 0.473176, note: '맥주·우유를 담던 영미권 단위.' },
      { code: 'galUS', name: '갤런(US)', sym: 'gal', factor: 3.78541, note: '약 3.79L. 미국 연료·우유 부피.' },
      { code: 'doe', name: '되', sym: '되', factor: 1.8039, note: '약 1.8L. 쌀·곡물을 되던 동아시아 전통 부피.' },
      { code: 'mal', name: '말(斗)', sym: '斗', factor: 18.039, note: '10되(약 18L). "쌀 한 말" 등 곡물 묘사의 단위.' },
    ],
  },
  {
    id: 'speed', name: '속도', icon: '🚀', base: 'mps',
    note: '진공에서 빛의 속도는 약 299,792km/s로, 이 우주의 절대 속도 한계다.',
    units: [
      { code: 'mps', name: '미터/초', sym: 'm/s', factor: 1, note: 'SI 속도 단위. 물리 묘사의 기본.' },
      { code: 'kmh', name: '킬로미터/시', sym: 'km/h', factor: 0.277778, note: '일상 차량·이동 속도 표기.' },
      { code: 'mph', name: '마일/시', sym: 'mph', factor: 0.44704, note: '영미권 도로 제한속도.' },
      { code: 'kn', name: '노트', sym: 'kn', factor: 0.514444, note: '시속 1해리. 배·항공기의 속도. 옛 선원이 밧줄 매듭 수로 쟀다.' },
      { code: 'ftps', name: '피트/초', sym: 'ft/s', factor: 0.3048 },
      { code: 'mach', name: '마하', sym: 'Mach', factor: 343, note: '해수면 음속 기준(약 343m/s). 초음속 비행 묘사에.' },
      { code: 'c', name: '광속 비율', sym: 'c', factor: 299792458, note: '빛의 속도. SF에서 워프·아광속 묘사의 척도.' },
    ],
  },
  {
    id: 'time', name: '시간', icon: '⏳', base: 's',
    note: '1초는 세슘-133 원자가 약 91억9263만1770번 진동하는 시간으로 정의된다. 가장 정밀한 인류의 척도다.',
    units: [
      { code: 'ms', name: '밀리초', sym: 'ms', factor: 0.001 },
      { code: 's', name: '초', sym: '초', factor: 1, note: 'SI 기본 시간 단위. 세슘 원자 진동으로 정의.' },
      { code: 'min', name: '분', sym: '분', factor: 60 },
      { code: 'h', name: '시간', sym: '시', factor: 3600, note: '바빌로니아의 60진법에서 비롯한 분·초 체계.' },
      { code: 'd', name: '일', sym: '일', factor: 86400 },
      { code: 'wk', name: '주', sym: '주', factor: 604800 },
      { code: 'mo', name: '월(평균)', sym: '월', factor: 2629800, note: '평균 30.44일. 달의 주기와 달력의 절충.' },
      { code: 'yr', name: '년(평균)', sym: '년', factor: 31557600, note: '율리우스력 평균 365.25일. 윤년을 평균한 값.' },
      { code: 'sigak', name: '각(刻)', sym: '刻', factor: 864, note: '하루를 100각으로 나눈 동아시아 옛 시간(약 14.4분). "일각이 여삼추".' },
      { code: 'siju', name: '시(時辰)', sym: '時', factor: 7200, note: '하루를 12지로 나눈 2시간 단위(자시·축시…). 사극 시간 묘사에.' },
    ],
  },
]

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  const a = Math.abs(n)
  if (n === 0) return '0'
  // 아주 크거나 작은 값은 지수 표기로, 그 외에는 유효자리 위주로 보기 좋게.
  if (a !== 0 && (a >= 1e12 || a < 1e-4)) return n.toExponential(4)
  let digits = 6
  if (a >= 1000) digits = 2
  else if (a >= 1) digits = 4
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}

interface Saved { catId?: string; unit?: string; amount?: string }

export default function UnitConverter() {
  const [catId, setCatId] = useState('length')
  const [unit, setUnit] = useState('m')
  const [amount, setAmount] = useState('1')
  const [copied, setCopied] = useState(false)
  const mounted = useRef(true)
  const loaded = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const s: Saved = JSON.parse(raw)
        const cat = CATEGORIES.find((c) => c.id === s.catId)
        if (cat) {
          setCatId(cat.id)
          if (s.unit && cat.units.some((u) => u.code === s.unit)) setUnit(s.unit)
          else setUnit(cat.base)
        }
        if (typeof s.amount === 'string') setAmount(s.amount)
      }
    } catch { /* 복원 실패는 무시 */ }
    loaded.current = true
  }, [])

  // 저장
  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ catId, unit, amount } as Saved))
    } catch { /* 저장 실패는 무시(시크릿 모드 등) */ }
  }, [catId, unit, amount])

  const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0]

  const pickCat = (id: string) => {
    const c = CATEGORIES.find((x) => x.id === id)
    if (!c) return
    setCatId(id)
    setUnit(c.base)
    setCopied(false)
  }

  const raw = amount.trim().replace(/,/g, '')
  const value = raw === '' ? NaN : Number(raw)
  const valid = isFinite(value)

  // 입력 단위 → 각 단위 환산값 계산
  const convertTo = (target: Unit): number => {
    if (!valid) return NaN
    if (cat.id === 'temperature') {
      const c = toCelsius(value, unit)
      return fromCelsius(c, target.code)
    }
    const src = cat.units.find((u) => u.code === unit)
    if (!src) return NaN
    const inBase = value * src.factor
    return inBase / target.factor
  }

  const srcUnit = cat.units.find((u) => u.code === unit) || cat.units[0]

  const buildText = (): string => {
    const header = `📐 ${fmt(value)} ${srcUnit.sym} (${srcUnit.name}) 환산 — ${cat.name}`
    const lines = cat.units.map((u) => `· ${fmt(convertTo(u))} ${u.sym} (${u.name})`)
    return [header, ...lines].join('\n')
  }

  const copy = () => {
    if (!valid) return
    navigator.clipboard?.writeText(buildText()).then(() => {
      setCopied(true)
      setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
    }).catch(() => { /* 클립보드 미지원 graceful */ })
  }

  // 스타일
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)' }
  const tabs: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)',
    fontWeight: active ? 700 : 500,
  })
  const label: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 }
  const inputRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-end' }
  const inputS: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 15 }
  const selS: React.CSSProperties = { ...inputS, cursor: 'pointer' }
  const tableWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 12, padding: 6 }
  const rowS = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 10px', borderRadius: 8,
    background: active ? 'var(--chrome-2)' : 'transparent',
    border: active ? '1px solid var(--accent)' : '1px solid transparent',
    cursor: 'pointer',
  })
  const valCell: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: 'var(--accent)', minWidth: 0, wordBreak: 'break-all', flex: '1 1 auto', textAlign: 'right' }
  const unitCell: React.CSSProperties = { fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }
  const note: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }
  const catNote: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }
  const actions: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

  return (
    <div style={wrap}>
      <div style={tabs}>
        {CATEGORIES.map((c) => (
          <button key={c.id} style={tabBtn(c.id === catId)} onClick={() => pickCat(c.id)}>
            <Emoji e={c.icon} /> {c.name}
          </button>
        ))}
      </div>

      <div style={inputRow}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={label}>값</div>
          <input
            style={inputS}
            inputMode="decimal"
            placeholder="숫자를 입력하세요 (예: 1.5)"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setCopied(false) }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={label}>단위</div>
          <select style={selS} value={unit} onChange={(e) => { setUnit(e.target.value); setCopied(false) }}>
            {cat.units.map((u) => (
              <option key={u.code} value={u.code}>{u.sym} · {u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!valid && raw !== '' && (
        <div style={{ fontSize: 12, color: 'var(--warn)' }}>숫자만 입력할 수 있습니다.</div>
      )}

      <div style={tableWrap}>
        {valid ? (
          cat.units.map((u) => {
            const active = u.code === unit
            return (
              <div key={u.code} style={rowS(active)} onClick={() => { setUnit(u.code); setCopied(false) }} title="이 단위를 입력 기준으로 바꾸기">
                <div style={{ flex: '0 0 auto', maxWidth: '46%' }}>
                  <div style={unitCell}>
                    {active && <span style={{ color: 'var(--ok)', marginRight: 4 }}>▶</span>}
                    {u.sym} · {u.name}
                  </div>
                  {u.note && <div style={note}>{emojify(u.note)}</div>}
                </div>
                <div style={valCell}>{fmt(convertTo(u))}</div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
            변환할 값과 단위를 선택하면<br />모든 단위로 동시에 환산해 드립니다.
          </div>
        )}
      </div>

      {cat.note && <div style={catNote}><Emoji e="💡" /> {emojify(cat.note)}</div>}

      <div style={actions}>
        <button className="minibtn" onClick={copy} disabled={!valid}>
          {copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 결과 복사</>}
        </button>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>표의 단위를 누르면 입력 기준이 바뀝니다.</span>
      </div>
    </div>
  )
}
