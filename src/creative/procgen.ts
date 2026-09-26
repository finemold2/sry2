// 절차적 생성(Procedural Composer) 프레임워크 — 여러 슬롯의 조합으로 매번 새로운 결과를 만든다.
// 각 슬롯은 옵션 목록에서 하나를 뽑고, 슬롯들의 곱이 곧 조합 공간(보통 10,000,000가지 이상).
// 인물/세계관/플롯/아이템/장면/비문학 등 풍부한 합성 생성기를 데이터로 빠르게 추가하기 위한 공용 기반.
// node 단독 실행 가능(순수). UI 는 CreativeStudio 의 ComposerPanel 이 슬롯 잠금·재생성·조합수 표시로 렌더.

export interface Slot {
  /** 슬롯 라벨(예: '이름', '성격', '비밀'). */
  label: string
  /** 이 슬롯에서 뽑을 후보들. */
  options: string[]
}

export interface Composer {
  id: string
  name: string
  /** 나브 그룹(예: '인물', '세계관', '플롯', '아이템', '장면', '비문학', '관계'). */
  group: string
  intro?: string
  slots: Slot[]
  /** 뽑힌 값들(label→value)을 한 줄/문단 요약으로 엮는 선택적 함수. */
  summary?: (picks: Record<string, string>) => string
}

/** 조합 공간 크기(슬롯 옵션 수의 곱). 거대한 값은 Number 로도 충분(부동소수 근사 허용). */
export function combinations(c: Composer): number {
  return c.slots.reduce((n, s) => n * Math.max(1, s.options.length), 1)
}

// ---------- 보편 변주 슬롯(모든 합성기에 추가해 조합 공간을 ×100 이상 확장) ----------
// 어느 형식(인물/세계관/플롯/장면/비문학/시 등)에든 자연스럽게 얹히는 '창작 변주' 제안.
// 12 × 12 = 144배 확장. 출력은 선택적 창작 너지로 읽힌다.
const VARIATION_TONE: string[] = [
  '한 톤 더 어둡게', '의외의 유머를 한 스푼', '회상으로 시작해', '결말을 먼저 슬쩍 암시해', '감각 묘사를 전면에 세워',
  '속도를 늦춰 정적으로', '긴장을 한 단계 끌어올려', '아이러니를 한 겹 더해', '시점을 인물 내면 깊숙이', '상징 하나를 은근히 심어',
  '빛과 그림자의 대비를 강조해', '여백과 침묵을 남겨',
]
const VARIATION_TWIST: string[] = [
  '예상 밖 반전 하나', '숨은 동기 하나', '작은 복선 하나', '감춰진 약점 하나', '뜻밖의 조력자 하나',
  '사소한 오해 하나', '시간 제한을 하나', '치를 대가/희생 하나', '드러나면 안 될 비밀 하나', '건드리면 안 될 금기 하나',
  '운명 같은 우연 하나', '관계의 균열 하나',
]
const VAR_A_LABEL = '변주 ✨'
const VAR_B_LABEL = '한 끗 ✨'

/** 합성기에 보편 변주 슬롯 2개를 더해 조합 공간을 144배로 확장한다(중복 적용 방지). 새 객체 반환. */
export function expandComposer(c: Composer): Composer {
  if (!c || !Array.isArray(c.slots)) return c
  if (c.slots.some((s) => s.label === VAR_A_LABEL)) return c // 이미 확장됨
  return {
    ...c,
    slots: [
      ...c.slots,
      { label: VAR_A_LABEL, options: VARIATION_TONE },
      { label: VAR_B_LABEL, options: VARIATION_TWIST },
    ],
  }
}

/** 조합 수를 사람이 읽기 좋은 한국어 문자열로. */
export function formatCombos(n: number): string {
  if (!isFinite(n)) return '무한에 가까운'
  if (n >= 1e16) return Math.round(n / 1e16) + '경+'
  if (n >= 1e12) return Math.round(n / 1e12) + '조+'
  if (n >= 1e8) return Math.round(n / 1e8) + '억+'
  if (n >= 1e4) return Math.round(n / 1e4) + '만+'
  return n.toLocaleString()
}

/** 한 슬롯에서 무작위로 하나 선택. 빈 배열·구멍(undefined)에도 항상 문자열 반환. */
function pick(options: string[]): string {
  if (!options || !options.length) return ''
  // Math.random 은 런타임(브라우저) 전용; node 테스트에서는 결과값만 검증하므로 무방.
  const v = options[Math.floor(Math.random() * options.length)]
  return v == null ? '' : String(v)
}

/** 모든 슬롯을 뽑되, locked 에 지정된 라벨은 그 값을 유지한다. */
export function roll(c: Composer, locked: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of c.slots) {
    out[s.label] = s.label in locked ? locked[s.label] : pick(s.options)
  }
  return out
}
