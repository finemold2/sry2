// 이름 생성기 — 한국어/영어. 번들 데이터 기반(서버 불필요).
export type Culture = 'ko' | 'en'
export type Gender = 'any' | 'male' | 'female'

const KO_SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
const KO_SYL_M = ['민', '준', '서', '도', '현', '우', '진', '성', '재', '호', '규', '태', '훈', '석', '건', '윤', '찬', '영', '환', '혁']
const KO_SYL_F = ['지', '서', '하', '은', '수', '예', '유', '아', '윤', '소', '연', '나', '다', '미', '주', '혜', '가', '라', '린', '채']
const KO_SYL_ANY = ['선', '경', '정', '원', '현', '율', '온', '결', '담', '슬', '한', '별', '봄', '솔', '늘']

const EN_FIRST_M = ['James', 'Liam', 'Noah', 'Ethan', 'Oliver', 'Henry', 'Lucas', 'Mason', 'Logan', 'Daniel', 'Caleb', 'Owen', 'Nathan', 'Theo', 'Julian']
const EN_FIRST_F = ['Emma', 'Olivia', 'Ava', 'Sophia', 'Isla', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Aria', 'Nora', 'Clara', 'Maeve', 'Iris', 'Ruth']
const EN_LAST = ['Smith', 'Hayes', 'Brooks', 'Vance', 'Cole', 'Reed', 'Quinn', 'Mercer', 'Lowell', 'Frost', 'Ashby', 'Calder', 'Doyle', 'Sterling', 'Wren']

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function koGiven(gender: Gender, rnd: () => number): string {
  const pool = gender === 'male' ? KO_SYL_M : gender === 'female' ? KO_SYL_F : [...KO_SYL_M, ...KO_SYL_F, ...KO_SYL_ANY]
  let s = pick(pool, rnd)
  if (rnd() > 0.25) s += pick([...pool, ...KO_SYL_ANY], rnd)
  return s
}

export function generateNames(culture: Culture, gender: Gender, count: number): string[] {
  // Math.random 은 런타임(브라우저)에서 사용 가능
  const rnd = Math.random
  const out = new Set<string>()
  let guard = 0
  while (out.size < count && guard++ < count * 30) {
    if (culture === 'ko') {
      out.add(pick(KO_SURNAMES, rnd) + koGiven(gender, rnd))
    } else {
      const first = gender === 'female' ? pick(EN_FIRST_F, rnd) : gender === 'male' ? pick(EN_FIRST_M, rnd) : pick([...EN_FIRST_M, ...EN_FIRST_F], rnd)
      out.add(`${first} ${pick(EN_LAST, rnd)}`)
    }
  }
  return [...out]
}
