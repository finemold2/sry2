// 연재(회차) 발행 로직 공유 헬퍼 — 연재 대시보드와 DB뷰가 동일 동작을 쓰도록 한 곳에 둔다.
import { BinderItem, EpisodeMeta } from './types'

/** 오늘 날짜를 ISO yyyy-mm-dd(로컬)로. */
export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 발행 상태 전환용 패치. published 로 바뀌고 기존 publishedAt 이 없으면 오늘 날짜를 함께 기록한다.
 * 대시보드/DB뷰가 공유해 발행일 누락으로 인한 화면 간 불일치를 막는다.
 */
export function episodeStatePatch(
  item: BinderItem | undefined,
  state: EpisodeMeta['state'],
): Partial<EpisodeMeta> {
  const patch: Partial<EpisodeMeta> = { state }
  if (state === 'published' && !item?.episode?.publishedAt) patch.publishedAt = todayIso()
  return patch
}
