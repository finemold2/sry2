// 프로젝트 템플릿 — 장르별 바인더 구조를 미리 채운 새 프로젝트.
import { DRAFT_ROOT, RESEARCH_ROOT, createItem, createProject, newId } from '../model'
import type { BinderItem, Project } from '../model'

export interface Template {
  id: string
  category: string
  name: string
  description: string
  build: () => Project
}

function child(
  p: Project,
  parentId: string,
  type: BinderItem['type'],
  title: string,
  extra: Partial<BinderItem> = {},
): string {
  const id = newId()
  const item = createItem(type, title, parentId, { id, ...extra })
  p.items[id] = item
  p.items[parentId].childIds.push(id)
  return id
}

// 기본 빈 프로젝트에서 원고 폴더를 비우고 시작
function fresh(title: string): Project {
  const p = createProject(title)
  const draft = p.items[DRAFT_ROOT]
  // createProject 가 만든 샘플 장면 제거
  draft.childIds.forEach((cid) => delete p.items[cid])
  draft.childIds = []
  return p
}

import type { WritingType } from '../model'

// 프로젝트 유형 설정 헬퍼 — 도구/뷰/컴파일 프리셋이 유형에 맞게 노출되도록 settings 에 기록.
function withType(p: Project, t: WritingType): Project {
  p.settings = { ...p.settings, projectType: t }
  return p
}

function blank(): Project {
  const p = fresh('제목 없는 프로젝트')
  child(p, DRAFT_ROOT, 'text', '제1장')
  return withType(p, 'general')
}

function novel(): Project {
  const p = fresh('새 장편소설')
  for (let c = 1; c <= 3; c++) {
    const ch = child(p, DRAFT_ROOT, 'folder', `제${c}장`)
    child(p, ch, 'text', '장면 1', { synopsis: '이 장면에서 일어나는 일…' })
    child(p, ch, 'text', '장면 2')
  }
  const chars = child(p, RESEARCH_ROOT, 'folder', '등장인물')
  child(p, chars, 'text', '주인공')
  child(p, chars, 'text', '적대자')
  child(p, RESEARCH_ROOT, 'folder', '배경/설정')
  return withType(p, 'novel')
}

// ── 웹소설 연재: 회차 단위 원고 + 연재 관리 대시보드(⌘6)와 연동 ──
function webnovel(): Project {
  const p = fresh('새 웹소설 연재')
  for (let c = 1; c <= 5; c++) {
    child(p, DRAFT_ROOT, 'text', `${c}화`, { synopsis: c === 1 ? '강렬한 도입부 — 첫 3화 안에 핵심 후킹을 배치' : '' })
  }
  const setup = child(p, RESEARCH_ROOT, 'folder', '설정/세계관')
  child(p, setup, 'text', '주인공/능력')
  child(p, setup, 'text', '세계관·용어집')
  child(p, RESEARCH_ROOT, 'text', '연재 기획(로그라인·소재·차별점)')
  p.settings = { ...p.settings, serialCadence: 5 }
  return withType(p, 'webnovel')
}

function novelParts(): Project {
  const p = fresh('새 장편소설 (부 구성)')
  for (let part = 1; part <= 2; part++) {
    const pf = child(p, DRAFT_ROOT, 'folder', `제${part}부`)
    for (let c = 1; c <= 2; c++) {
      const ch = child(p, pf, 'folder', `${c}장`)
      child(p, ch, 'text', '장면 1')
    }
  }
  child(p, RESEARCH_ROOT, 'folder', '등장인물')
  return withType(p, 'novel')
}

function shortStory(): Project {
  const p = fresh('새 단편소설')
  child(p, DRAFT_ROOT, 'text', '도입')
  child(p, DRAFT_ROOT, 'text', '전개')
  child(p, DRAFT_ROOT, 'text', '절정')
  child(p, DRAFT_ROOT, 'text', '결말')
  return withType(p, 'novel')
}

function nonfiction(): Project {
  const p = fresh('새 논픽션')
  child(p, DRAFT_ROOT, 'text', '머리말')
  for (let c = 1; c <= 3; c++) {
    const ch = child(p, DRAFT_ROOT, 'folder', `${c}장`)
    child(p, ch, 'text', '도입')
    child(p, ch, 'text', '본문')
  }
  child(p, RESEARCH_ROOT, 'folder', '자료/인용')
  return withType(p, 'nonfiction')
}

function screenplay(): Project {
  const p = fresh('새 각본')
  for (let c = 1; c <= 3; c++) {
    child(p, DRAFT_ROOT, 'text', `씬 ${c}`, { scriptMode: true })
  }
  child(p, RESEARCH_ROOT, 'folder', '캐릭터')
  return withType(p, 'screenplay')
}

// ── 학술 논문: IMRaD 골격 + 자료(인용) ──
function academic(): Project {
  const p = fresh('새 학술 논문')
  child(p, DRAFT_ROOT, 'text', '초록 (Abstract)')
  child(p, DRAFT_ROOT, 'text', '1. 서론 (Introduction)')
  child(p, DRAFT_ROOT, 'text', '2. 관련 연구 (Related Work)')
  child(p, DRAFT_ROOT, 'text', '3. 방법 (Methods)')
  child(p, DRAFT_ROOT, 'text', '4. 결과 (Results)')
  child(p, DRAFT_ROOT, 'text', '5. 논의 (Discussion)')
  child(p, DRAFT_ROOT, 'text', '6. 결론 (Conclusion)')
  child(p, RESEARCH_ROOT, 'folder', '참고문헌/출처')
  child(p, RESEARCH_ROOT, 'text', '키워드·색인어')
  return withType(p, 'academic')
}

// ── 에세이/칼럼: 5문단 에세이 골격 ──
function essay(): Project {
  const p = fresh('새 에세이')
  child(p, DRAFT_ROOT, 'text', '서론 (주제문/Thesis)')
  child(p, DRAFT_ROOT, 'text', '본론 1 (주장·근거)')
  child(p, DRAFT_ROOT, 'text', '본론 2 (주장·근거)')
  child(p, DRAFT_ROOT, 'text', '본론 3 (반론·재반박)')
  child(p, DRAFT_ROOT, 'text', '결론 (요약·전망)')
  return withType(p, 'essay')
}

// ── 블로그 글: SEO 메타 + 본문 ──
function blog(): Project {
  const p = fresh('새 블로그 글')
  child(p, DRAFT_ROOT, 'text', '도입 (후킹·핵심 약속)')
  child(p, DRAFT_ROOT, 'text', '본문 (소제목 H2/H3 구성)')
  child(p, DRAFT_ROOT, 'text', '결론 (요약·CTA)')
  child(p, RESEARCH_ROOT, 'text', '키워드/SEO 메모')
  return withType(p, 'blog')
}

function poetry(): Project {
  const p = fresh('새 시집')
  child(p, DRAFT_ROOT, 'text', '제1부')
  for (let i = 1; i <= 3; i++) child(p, DRAFT_ROOT, 'text', `시 ${i}`)
  return withType(p, 'poetry')
}

function journal(): Project {
  const p = fresh('새 일지/저널')
  child(p, DRAFT_ROOT, 'text', '오늘의 기록')
  return withType(p, 'journal')
}

export const TEMPLATES: Template[] = [
  { id: 'blank', category: '기본', name: '빈 프로젝트', description: '원고 한 문서로 시작', build: blank },
  { id: 'webnovel', category: '웹소설', name: '웹소설 연재', description: '회차 단위 + 연재 관리 대시보드(⌘6)', build: webnovel },
  { id: 'novel', category: '소설', name: '장편소설', description: '장/장면 구조 + 등장인물 폴더', build: novel },
  { id: 'novel-parts', category: '소설', name: '장편소설 (부 구성)', description: '부 > 장 > 장면', build: novelParts },
  { id: 'short', category: '소설', name: '단편소설', description: '도입·전개·절정·결말', build: shortStory },
  { id: 'nonfiction', category: '논픽션', name: '논픽션', description: '머리말 + 장별 구성', build: nonfiction },
  { id: 'academic', category: '학술', name: '학술 논문 (IMRaD)', description: '초록·서론·방법·결과·논의·결론', build: academic },
  { id: 'essay', category: '에세이', name: '에세이/칼럼', description: '5문단 에세이(주제문·본론·결론)', build: essay },
  { id: 'blog', category: '블로그', name: '블로그 글', description: '도입·본문·결론 + SEO 메모', build: blog },
  { id: 'screenplay', category: '각본', name: '각본/시나리오', description: '씬 단위 각본 모드 문서', build: screenplay },
  { id: 'poetry', category: '시', name: '시집', description: '부 구성 + 개별 시', build: poetry },
  { id: 'journal', category: '일지', name: '일지/저널', description: '자유 기록', build: journal },
]
