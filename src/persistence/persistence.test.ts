// 영속성/데이터 안전 단위 테스트. 실행: node --experimental-strip-types src/persistence/persistence.test.ts
// 핵심 불변식: repairStructure 이후 items 의 모든 항목은 rootOrder 에서 도달 가능해야 한다(어떤 문서도 사라지지 않음).
import type { Project } from '../model'
import { repairStructure, normalizeProject } from './pack.ts'

let pass = 0, fail = 0
function ok(cond: boolean, msg: string) { if (cond) pass++; else { fail++; console.error('  ✗ FAIL: ' + msg) } }

function reachable(p: Project): Set<string> {
  const seen = new Set<string>()
  const stack = [...p.rootOrder]
  while (stack.length) {
    const id = stack.pop() as string
    if (seen.has(id) || !p.items[id]) continue
    seen.add(id)
    for (const c of (p.items[id] as { childIds?: string[] }).childIds || []) stack.push(c)
  }
  return seen
}
function mkItem(id: string, parentId: string | null, childIds: string[] = [], type = 'text') {
  return { id, type, title: id, parentId, childIds, bodyRtf: type === 'text' ? '{\\rtf1 x}' : '' } as never
}
function base(items: Record<string, unknown>, rootOrder: string[]): Project {
  return { id: 'p1', title: 'T', modified: 1, items: items as Project['items'], rootOrder } as Project
}
function allReachable(p: Project): boolean {
  const r = reachable(p)
  return Object.keys(p.items).every((id) => r.has(id))
}

// 1) 고아 아이템(items 에만 있고 rootOrder/부모 어디에도 없음) → 보존되어 rootOrder 에서 도달 가능
{
  const p = base({ a: mkItem('a', null), orphan: mkItem('orphan', null) }, ['a'])
  const before = Object.keys(p.items).length
  repairStructure(p)
  ok(allReachable(p), '고아 아이템이 복구 후 도달 가능해야 함')
  ok(Object.keys(p.items).length === before, '복구가 아이템을 삭제하지 않아야 함(소실 금지)')
  ok(p.rootOrder.includes('orphan'), '고아는 rootOrder 로 승격되어야 함')
}

// 2) rootOrder 의 존재하지 않는 id 제거
{
  const p = base({ a: mkItem('a', null) }, ['a', 'ghost'])
  repairStructure(p)
  ok(!p.rootOrder.includes('ghost'), '존재하지 않는 rootOrder id 는 제거되어야 함')
  ok(p.rootOrder.includes('a'), '유효한 rootOrder id 는 유지되어야 함')
}

// 3) 존재하지 않는 childId 제거
{
  const p = base({ f: mkItem('f', null, ['a', 'ghost'], 'folder'), a: mkItem('a', 'f') }, ['f'])
  repairStructure(p)
  const f = p.items['f'] as { childIds: string[] }
  ok(!f.childIds.includes('ghost'), '존재하지 않는 childId 는 제거되어야 함')
  ok(f.childIds.includes('a'), '유효한 자식은 유지되어야 함')
  ok(allReachable(p), '정리 후 모든 아이템 도달 가능')
}

// 4) 부모가 사라진 아이템 → 루트로 승격(소실 금지)
{
  const p = base({ a: mkItem('a', 'missingParent') }, [])
  repairStructure(p)
  ok((p.items['a'] as { parentId: string | null }).parentId === null, '사라진 부모 참조는 null 로')
  ok(p.rootOrder.includes('a'), '부모 없는 아이템은 루트로 승격되어 보존')
  ok(allReachable(p), '모든 아이템 도달 가능')
}

// 5) rootOrder 중복 제거
{
  const p = base({ a: mkItem('a', null) }, ['a', 'a', 'a'])
  repairStructure(p)
  ok(p.rootOrder.filter((x) => x === 'a').length === 1, 'rootOrder 중복은 1개로 정리')
}

// 6) 부모는 유효하나 부모의 childIds 에서 누락된 아이템 → 부모 자식으로 복귀
{
  const p = base({ f: mkItem('f', null, [], 'folder'), a: mkItem('a', 'f') }, ['f'])
  repairStructure(p)
  const f = p.items['f'] as { childIds: string[] }
  ok(f.childIds.includes('a'), '부모 childIds 에 누락된 자식이 복귀되어야 함')
  ok(allReachable(p), '모든 아이템 도달 가능')
}

// 7) 정상 트리는 변경 없이 그대로 도달 가능, normalizeProject 통합 동작
{
  const p = normalizeProject(base({ f: mkItem('f', null, ['a', 'b'], 'folder'), a: mkItem('a', 'f'), b: mkItem('b', 'f') }, ['f']))
  ok(allReachable(p), '정상 트리는 모두 도달 가능')
  ok(Array.isArray(p.labels) && Array.isArray(p.statuses) && !!p.settings, 'normalizeProject 가 누락 필드를 채움')
  ok(typeof p.settings.projectTarget === 'number', 'settings 기본값 채움')
}

// 8) 대규모 무작위 손상에도 아이템 절대 소실 없음(불변식 강건성)
{
  const items: Record<string, unknown> = {}
  const ids: string[] = []
  for (let i = 0; i < 200; i++) { const id = 'n' + i; ids.push(id); items[id] = mkItem(id, null, []) }
  // 무작위로 부모/자식 참조를 어긋나게 섞음(시드 없는 결정적 패턴)
  for (let i = 0; i < 200; i++) {
    const it = items['n' + i] as { parentId: string | null; childIds: string[] }
    if (i % 3 === 0) it.parentId = 'n' + ((i * 7 + 5) % 250) // 일부는 존재하지 않는 부모(>=200)
    if (i % 4 === 0) it.childIds = ['n' + ((i + 1) % 205), 'ghost' + i]
  }
  const p = base(items, ['n0', 'n0', 'nX', 'n199'])
  const before = Object.keys(p.items).length
  repairStructure(p)
  ok(Object.keys(p.items).length === before, '대규모 손상에도 아이템 개수 보존(소실 0)')
  ok(allReachable(p), '대규모 손상에도 전 아이템 도달 가능')
}

console.log(`\n영속성/데이터안전 테스트: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) process.exit(1)
