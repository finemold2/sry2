// 창작 도구함(데이터 기반 도구) 공유 타입 + 헬퍼.
// 도구 3종: 단어 은행(WordBank), 생성기(Generator), 가이드/체크리스트(Guide).
// 데이터 모듈(./data/*)은 이 타입을 import 하고, 레지스트리(./toolkit-registry.ts)가 모은다.

/** 클릭해 복사할 수 있는 분류별 단어/표현 모음. */
export interface WordBank {
  id: string
  name: string
  icon: string
  intro?: string
  categories: { name: string; words: string[] }[]
}

/** 무작위 조합 생성기. 각 결과 = parts 의 각 슬롯에서 하나씩 골라 sep 으로 결합. */
export interface Generator {
  id: string
  name: string
  icon: string
  intro?: string
  /** 슬롯별 후보. 슬롯이 1개면 그 목록에서 무작위 추출. */
  parts: string[][]
  /** 슬롯 결합 구분자(기본 ''). */
  sep?: string
  /** 한 번에 생성할 개수(기본 8). */
  lines?: number
}

/** 읽기용 작법 가이드/체크리스트. */
export interface Guide {
  id: string
  name: string
  icon: string
  intro?: string
  /** 나브 하위 그룹(형식별 작법 등). 미지정 시 '작법 가이드'로 묶임. */
  group?: string
  sections: { heading: string; items: string[] }[]
}

/** 생성기에서 결과 한 줄 뽑기(브라우저/Node 모두 Math.random 사용). */
export function rollOne(g: Generator): string {
  return g.parts.map((slot) => (slot.length ? slot[Math.floor(Math.random() * slot.length)] : '')).join(g.sep ?? '')
}

/** 중복 없이 n개 생성(후보가 적으면 가능한 만큼). */
export function rollMany(g: Generator, n?: number): string[] {
  const want = n ?? g.lines ?? 8
  const out = new Set<string>()
  let guard = 0
  const cap = want * 12 + 20
  while (out.size < want && guard++ < cap) {
    const r = rollOne(g)
    if (r.trim()) out.add(r)
  }
  return [...out]
}
