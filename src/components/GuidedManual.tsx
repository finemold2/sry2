// 본격 실습형 온보딩 매뉴얼 — 사용자가 직접 따라 하며 '작은 작품 한 편'을 완성하는 인터랙티브 가이드.
//  · 보기 메뉴 '더 알아보기(사용법 실습)'로 연다(자동 시작 아님).
//  · 폴더/글 만들기 → 집필 → 서식 → 우측 패널 전 탭 → 자료/수집함 → 여러 뷰 → 도구 → 저장/내보내기 → 마무리.
//  · 각 실습 단계는 사용자가 직접 하면 자동 통과, 막히면 '대신 해줄게요'로 진행. '건너뛰기'도 가능.
//  · 데이터 안전: 현재 원고는 건드리지 않고 '🎓 글쓰기 연습' 폴더 안에서만 실습. 끝에 정리(휴지통) 선택.
//  · 닫기: 좌하단 '그만 보기' · 우상단 × · Esc.
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../store/store'
import { rtfToPlainText, parseRtf } from '../rtf'
import { addToStash, openToolLinked } from '../tools/linkbus'

type Place = 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'center'
interface MStep {
  chapter: string
  emoji: string
  title: string
  body: string
  target?: string | (() => Element | null)
  place?: Place
  pre?: () => void
  do?: { hint: string; check: () => boolean; auto: () => void }
  choices?: { label: string; run?: () => void; go?: number }[]
}

const S = () => useStore.getState()
const draftRootId = () => Object.values(S().project.items).find((i) => i.root === 'draft')?.id || 'root-draft'
const plain = (id: string | null) => { try { return id ? rtfToPlainText(S().project.items[id]?.bodyRtf || '').trim() : '' } catch { return '' } }
const childItems = (fid: string | null) => fid ? Object.values(S().project.items).filter((x) => x.parentId === fid) : []
// 연습 폴더 하위(자손)의 text 문서들 — 격리된 실습 글 탐지용.
const descTexts = (fid: string | null): { id: string }[] => {
  if (!fid) return []
  const out: { id: string }[] = []
  const items = S().project.items
  const walk = (id: string) => Object.values(items).filter((x) => x.parentId === id).forEach((c) => { if (c.type === 'text') out.push({ id: c.id }); walk(c.id) })
  walk(fid)
  return out
}
// 굵게 적용 여부: bodyRtf 헤더(스타일시트)에도 \b 가 있어 정규식은 오탐 → 모델 파싱해 '본문 런'의 bold 로 판정.
const hasBoldRun = (id: string | null): boolean => {
  try {
    if (!id) return false
    const doc = parseRtf(S().project.items[id]?.bodyRtf || '')
    return doc.blocks.some((b) => b.runs.some((r) => r.style?.bold))
  } catch { return false }
}
const stashKey = () => 'sry:stash:items:' + S().project.id
const stashCount = () => { try { return (JSON.parse(localStorage.getItem(stashKey()) || '[]') || []).length } catch { return 0 } }
const byText = (sel: string, re: RegExp) => () => [...document.querySelectorAll(sel)].find((b) => re.test((b.textContent || '').trim())) || null
// 메뉴 트리거 — 클래식(.tbtn)·스튜디오(.st-menu-btn) 모두 '.menu-wrap > button' 이라 스킨 무관하게 동작.
const menuBtn = (label: string) => () => [...document.querySelectorAll('.menu-wrap > button')].find((b) => (b.textContent || '').trim() === label) || null

function resolveTarget(t?: MStep['target']): Element | null {
  if (!t) return null
  try { return typeof t === 'function' ? t() : document.querySelector(t) } catch { return null }
}

const MANUAL_STEP_KEY = 'sry:manual:step'

export default function GuidedManual({ onClose }: { onClose: () => void }) {
  // 진행 저장(#24): 39단계 실습이 Esc 한 번에 처음으로 리셋되지 않게, 보던 단계를 기억해 이어하기.
  const [i, setI] = useState(() => { try { const v = parseInt(localStorage.getItem(MANUAL_STEP_KEY) || '0', 10); return v > 0 ? v : 0 } catch { return 0 } })
  const [resumed, setResumed] = useState(i > 0)
  useEffect(() => { try { localStorage.setItem(MANUAL_STEP_KEY, String(i)) } catch { /* noop */ } }, [i])
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; arrow: string }>({ left: 0, top: 0, arrow: 'none' })
  const [done, setDone] = useState(false) // 현재 do 단계 완료 여부
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const folderId = useRef<string | null>(null)
  const docId = useRef<string | null>(null)
  const docLen = useRef(0) // '도구 결과를 본문에 적용' 단계의 기준 길이
  const baseline = useRef<{ folders: number; texts: number; stash: number; sub: number; tool: number }>({ folders: 0, texts: 0, stash: 0, sub: 0, tool: 0 })

  // ── 실습 헬퍼(현재 원고 안전: '🎓 글쓰기 연습' 폴더 안에서만) ──
  const ensureFolder = useCallback((template: boolean) => {
    let fid = folderId.current
    if (!fid || !S().project.items[fid]) { fid = S().addItem('folder', draftRootId(), '🎓 글쓰기 연습'); folderId.current = fid }
    if (template) { // 멱등: 이미 있는 막/인물 노트는 다시 만들지 않는다(재실행 시 중복 방지)
      const titles = childItems(fid).map((c) => c.title)
      ;['1막 — 발단', '2막 — 전개', '3막 — 결말'].forEach((t) => { if (!titles.includes(t)) S().addItem('folder', fid as string, t) })
      if (!childItems(fid).some((c) => c.type === 'text' && c.title === '인물 노트')) S().addItem('text', fid as string, '인물 노트')
    }
    return fid as string
  }, [])
  const ensureDoc = useCallback(() => {
    const fid = ensureFolder(false)
    let did = docId.current
    if (!did || !S().project.items[did]) { const ts = descTexts(fid); did = ts.length ? ts[ts.length - 1].id : S().addItem('text', fid, '1화 — 첫 장면'); docId.current = did }
    S().select(did)
    return did
  }, [ensureFolder])
  // 활성(연습) 문서의 .paper 만 정확히 집는다 — Scrivenings 다중 에디터에서도 엉뚱한 원고를 건드리지 않게.
  const paperEl = (): HTMLElement | null => (docId.current && (document.querySelector('.paper[data-doc-id="' + docId.current + '"]') as HTMLElement | null)) || null
  const typeSample = useCallback(() => {
    const did = ensureDoc(); S().setView('editor')
    setTimeout(() => {
      const p = paperEl()
      if (p) { p.innerHTML = '<p>비가 내리던 밤, 그녀는 오래 닫아둔 문을 조용히 열었다.</p>'; p.dispatchEvent(new Event('input', { bubbles: true })) }
      else { S().setBodyRtf(did, '{\\rtf1\\ansi\\par 비가 내리던 밤, 그녀는 오래 닫아둔 문을 조용히 열었다.\\par}') }
    }, 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureDoc])

  // 라벨 첫 색(없음 다음). 키워드 등.
  const firstLabel = () => S().project.labels.find((l) => l.id && !/none/i.test(l.id))?.id || S().project.labels[1]?.id || null
  // 연습 정리 — 폴더(휴지통) + 연습 중 만든 키워드·수집함 메모까지 함께 롤백(실제 원고에 잔재 없게).
  // 연습이 '직접 만든' 것만 정리하기 위한 식별자(리뷰 F9 — 동명의 사용자 키워드/메모 오삭제 방지).
  const createdKeywordId = useRef<string | null>(null)
  const PRACTICE_MEMO_LABEL = '연습 메모⁣' // 보이지 않는 마커 포함 — 사용자가 만든 '연습 메모'와 구분

  const cleanupPractice = () => {
    try { if (folderId.current && S().project.items[folderId.current]) S().moveToTrash(folderId.current) } catch { /* noop */ }
    try { if (createdKeywordId.current) { S().deleteKeyword(createdKeywordId.current); createdKeywordId.current = null } } catch { /* noop */ }
    try { const k = stashKey(); const arr = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(arr)) { const filt = arr.filter((it: { label?: string }) => !(it && it.label === PRACTICE_MEMO_LABEL)); localStorage.setItem(k, JSON.stringify(filt)); window.dispatchEvent(new Event('sry:stash-reload')) } } catch { /* noop */ }
  }

  const STEPS = useRef<MStep[]>([
    // ── CH0 환영/시작 방식 ──
    { chapter: '시작', emoji: '🧑‍🏫', title: '반가워요! 같이 글 한 편 만들어봐요', body: '이건 따라 하면서 배우는 실습 도움말이에요. 폴더 만들기부터 집필·정리·도구·저장까지, 아주 짧은 ‘연습작’ 하나를 함께 완성하며 앱을 손에 익혀요.\n현재 작업 중인 원고는 건드리지 않고, ‘🎓 글쓰기 연습’ 폴더 안에서만 연습해요. 준비됐으면 다음!', place: 'center' },
    {
      chapter: '시작', emoji: '🚀', title: '어떻게 시작할까요?', body: '작품을 시작하는 방법은 여러 가지예요. 하나 골라보세요(나중에 다른 방식으로 다시 해볼 수도 있어요).', place: 'center',
      choices: [
        { label: '✏️ 빈 상태에서 직접 만들기 (추천)', run: () => { /* 다음 챕터에서 직접 생성 */ }, go: 2 },
        { label: '🧩 템플릿처럼 뼈대 깔고 시작', run: () => { ensureFolder(true) }, go: 2 },
        { label: '⚡ 핵심만 빠르게', run: () => { ensureDoc() }, go: 5 },
      ],
    },
    // ── CH1 바인더(폴더/글) ──
    {
      chapter: '바인더', emoji: '🗂️', title: '먼저 폴더를 하나 만들어요', body: '왼쪽이 원고 서랍(바인더)이에요. ‘🎓 글쓰기 연습’ 폴더를 골라뒀으니, 위쪽 ‘＋ 폴더’로 그 안에 폴더(예: 장면 모음)를 하나 만들어보세요. (실제 원고는 안 건드려요!)', target: '.binder', place: 'right',
      pre: () => { const fid = ensureFolder(false); S().select(fid) }, // 연습 폴더를 활성화 → 새 항목이 그 안에 생성됨(격리)
      do: {
        hint: '연습 폴더가 선택된 상태에서 ‘＋ 폴더’ 클릭',
        check: () => childItems(folderId.current).length > baseline.current.sub,
        auto: () => { const fid = ensureFolder(false); S().addItem('folder', fid, '장면 모음'); S().select(fid) },
      },
    },
    {
      chapter: '바인더', emoji: '📄', title: '연습 폴더 안에 새 글을 만들어요', body: '이번엔 ‘＋ 글’로 새 문서를 만들어요(연습 폴더 안에 생겨요). 만들면 바로 이름을 칠 수 있어요 — ‘1화 — 첫 장면’ 처럼요.', target: '.binder', place: 'right',
      pre: () => { const fid = ensureFolder(false); S().select(fid) },
      do: {
        hint: '연습 폴더 선택 상태에서 ‘＋ 글’ 클릭',
        check: () => { const ts = descTexts(folderId.current); if (ts.length) { if (!docId.current || !S().project.items[docId.current]) docId.current = ts[ts.length - 1].id; return true } return false },
        auto: () => ensureDoc(),
      },
    },
    { chapter: '바인더', emoji: '🔤', title: '이름은 자유롭게', body: '항목을 우클릭하면 ‘이름 바꾸기’, 드래그하면 순서·소속을 바꿀 수 있어요. 폴더로 장(章)을, 글로 장면을 나누면 구조가 한눈에 보여요.\n이제 방금 만든 글을 열어 진짜 글을 써볼까요?', target: '.binder', place: 'right' },
    // ── CH2 에디터(집필) ──
    {
      chapter: '집필', emoji: '✍️', title: '가운데가 집필 공간!', body: '본문에 한 문장만 써볼게요. 예: “비가 내리던 밤, 그녀는 문을 열었다.” 직접 한 줄 적어보세요!', target: '.paper', place: 'auto',
      pre: () => { ensureDoc(); S().setView('editor') },
      do: { hint: '편집기에 한 문장 입력', check: () => plain(docId.current).length >= 8, auto: () => typeSample() },
    },
    { chapter: '집필', emoji: '💾', title: '쓰는 즉시 자동 저장', body: '방금 입력이 곧바로 브라우저에 저장됐어요(상단 ‘저장됨’ 표시). 따로 저장을 안 눌러도 원고가 사라지지 않아요. 정전·새로고침도 걱정 끝!', target: '.paper', place: 'auto' },
    {
      chapter: '집필', emoji: '🎭', title: '한 줄 더: ‘설명’ 말고 ‘보여주기’', body: '“그녀는 무서웠다”처럼 감정을 설명하기보다, 행동·감각으로 ‘보여주면’ 글이 살아나요. 예: “문고리를 잡은 손이 떨렸다.” 본문에 그런 한 줄을 직접 더 적어보세요!', target: '.paper', place: 'auto',
      pre: () => { S().setView('editor'); ensureDoc(); docLen.current = plain(docId.current).length },
      do: {
        hint: '감정을 행동·감각으로 보여주는 한 줄 추가',
        check: () => plain(docId.current).length > docLen.current + 3,
        auto: () => { const p = paperEl(); if (p) { const add = document.createElement('p'); add.textContent = '문고리를 잡은 손이 떨렸고, 복도 끝에서 발소리가 멎었다.'; p.appendChild(add); p.dispatchEvent(new Event('input', { bubbles: true })) } },
      },
    },
    {
      chapter: '집필', emoji: '🅱️', title: '글자 꾸미기', body: '쓴 문장에서 한 부분을 드래그로 선택하고 굵게(B)를 눌러보세요. 줄간격·크기·색도 같은 서식 바에서 바꿔요.', target: '.formatbar', place: 'bottom',
      pre: () => { ensureDoc(); S().setView('editor') },
      do: {
        hint: '문장 일부 선택 후 굵게(B)',
        check: () => hasBoldRun(docId.current),
        auto: () => {
          const p = paperEl()
          if (p) { p.focus(); const r = document.createRange(); if (p.firstChild) { r.selectNodeContents(p.firstChild); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); document.execCommand('bold'); p.dispatchEvent(new Event('input', { bubbles: true })) } }
        },
      },
    },
    // ── CH3 인스펙터(우측 패널 전체) ──
    {
      chapter: '인스펙터', emoji: '🧩', title: '오른쪽은 이 글의 작업판', body: '오른쪽 인스펙터는 지금 보고 있는 글의 메타·메모·버전을 담아요. 탭으로 오가며 글마다 따로 관리해요. 하나씩 채워볼게요!', target: '.insp-tabs', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true }) },
    },
    {
      chapter: '인스펙터', emoji: '🏷️', title: '라벨로 색깔 분류', body: '메타 탭에서 ‘라벨’을 골라 글을 색으로 분류해보세요(예: 아이디어/초고/수정). 코르크보드·바인더에서 색으로 한눈에 구분돼요.', target: '#insp-tab-meta', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'meta' }) },
      do: { hint: '메타 탭 → 라벨 선택', check: () => !!S().project.items[docId.current || '']?.labelId, auto: () => { const l = firstLabel(); if (l && docId.current) S().setLabel(docId.current, l) } },
    },
    {
      chapter: '인스펙터', emoji: '🎯', title: '문서 목표 정하기', body: '‘문서 목표’에 숫자를 넣어 이 글의 목표 분량을 정해요(예: 500). 진척이 퍼센트로 표시돼 동기부여가 돼요.', target: '#insp-tab-meta', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'meta' }) },
      do: { hint: '문서 목표에 숫자 입력', check: () => (S().project.items[docId.current || '']?.target || 0) > 0, auto: () => { if (docId.current) S().setTarget(docId.current, 500) } },
    },
    {
      chapter: '인스펙터', emoji: '📝', title: '시놉시스 한 줄', body: '‘시놉시스’에 이 글의 한 줄 요약을 적어요. 코르크보드 카드 뒷면에 그대로 보여서, 전체 흐름을 빠르게 훑을 때 좋아요.', target: '#insp-tab-meta', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'meta' }) },
      do: { hint: '시놉시스 입력', check: () => !!(S().project.items[docId.current || '']?.synopsis || '').trim(), auto: () => { if (docId.current) S().setSynopsis(docId.current, '비 오는 밤, 오래 닫아둔 문을 여는 그녀 — 이야기의 시작.') } },
    },
    {
      chapter: '인스펙터', emoji: '🔖', title: '키워드로 태그', body: '키워드 탭에서 키워드를 추가/지정해 글을 묶어요(예: #비, #첫장면). 나중에 같은 키워드의 글을 모아보기 좋아요.', target: '#insp-tab-keywords', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'keywords' }) },
      do: { hint: '키워드 추가 후 칩 클릭(태그)', check: () => (S().project.items[docId.current || '']?.keywordIds || []).length > 0, auto: () => {
        // 이미 같은 이름 키워드가 있으면 재사용(삭제 대상 아님), 없을 때만 생성하고 그 id 를 기록해 정리 대상 한정.
        const before = S().project.keywords?.find((k) => k.name === '첫장면')
        if (!before) {
          S().addKeyword('첫장면', '#7c9cff')
          const made = S().project.keywords?.find((k) => k.name === '첫장면')
          if (made) createdKeywordId.current = made.id
        }
        const kw = S().project.keywords?.find((k) => k.name === '첫장면')
        if (kw && docId.current) S().toggleKeyword(docId.current, kw.id)
      } },
    },
    {
      chapter: '인스펙터', emoji: '🗒️', title: '노트에 자료·메모', body: '노트 탭에는 이 글에 딸린 자유 메모를 남겨요 — 취재 메모, 고칠 점, 아이디어 등. 본문과 분리돼 안전하게 따라다녀요.', target: '#insp-tab-notes', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'notes' }) },
      do: { hint: '노트에 메모 입력', check: () => !!(S().project.items[docId.current || '']?.notes || '').trim(), auto: () => { if (docId.current) S().setNotes(docId.current, '메모: 도입부 분위기는 차분하게. 그녀의 동기는 뒤에서 공개.') } },
    },
    {
      chapter: '인스펙터', emoji: '📸', title: '스냅샷 = 안전한 되돌리기', body: '스냅샷 탭에서 ‘지금 찍기’로 현재 버전을 저장해요. 마음껏 고쳐도 언제든 이 시점으로 되돌리거나 비교할 수 있어요 — 원고의 타임머신!', target: '#insp-tab-snapshots', place: 'left',
      pre: () => { ensureDoc(); useStore.setState({ inspectorVisible: true, inspectorTab: 'snapshots' }) },
      do: { hint: '‘지금 찍기’ 클릭', check: () => ((S().project.snapshots?.[docId.current || ''] || []).length) > 0, auto: () => { if (docId.current) S().takeSnapshot(docId.current, '초고 v1') } },
    },
    { chapter: '인스펙터', emoji: '🔗', title: '북마크·코멘트도 있어요', body: '인스펙터엔 북마크(중요 위치 표시)·코멘트(부분 메모) 탭도 있어요. 긴 글을 다듬을 때 특히 유용해요. 탭을 눌러 구경해보세요!', target: '.insp-tabs', place: 'left' },
    // ── CH4 자료/수집함 ──
    { chapter: '자료', emoji: '📚', title: '‘자료’ 폴더 = 조사 창고', body: '왼쪽 바인더의 ‘자료’ 폴더는 취재·조사 자료를 두는 곳이에요. 원고(‘원고’ 폴더)와 분리돼 있어, 자료가 책 분량에 섞이지 않아요. 웹에서 찾은 메모·이미지·PDF를 여기로 가져와 정리해요.', target: byText('.binder *', /^자료$/), place: 'right' },
    {
      chapter: '자료', emoji: '🧺', title: '수집함에 아무거나 담기', body: '오른쪽 아래 🧺 수집함은 떠다니는 만능 보관함이에요. 웹 링크·이미지·메모 무엇이든 끌어다 모아두고, 필요할 때 꺼내 써요. 메모를 하나 담아볼게요!', target: byText('.stash-icon, .binder *', /수집함|🧺/), place: 'auto',
      do: { hint: '🧺 수집함에 메모 담기', check: () => stashCount() > baseline.current.stash, auto: () => addToStash({ kind: 'memo', label: PRACTICE_MEMO_LABEL, text: '웹에서 찾은 자료를 이렇게 수집함에 담아두면 편해요.' }) },
    },
    // ── CH5 여러 작업 화면(뷰) ──
    { chapter: '작업 화면', emoji: '🗂️', title: '코르크보드 — 색인카드', body: '같은 원고를 카드로 봐요. 카드를 드래그하면 글 순서가 바뀌고(왼쪽 바인더도 같이!), 카드 뒷면엔 아까 쓴 시놉시스가 보여요. 구조를 직관적으로 짤 때 최고예요.', target: '.corkboard', place: 'center', pre: () => S().setView('corkboard') },
    { chapter: '작업 화면', emoji: '📊', title: '아웃라이너 — 표로 한눈에', body: '제목·분량·상태·라벨을 표로 정리해 봐요. 긴 작품의 뼈대를 잡고 진행을 점검하기 좋아요.', target: '.outliner', place: 'center', pre: () => S().setView('outliner') },
    { chapter: '작업 화면', emoji: '🕸️', title: '스토리 캔버스 — 자유 배치', body: '아이디어를 카드 노드로 자유롭게 놓고 선으로 연결해요. 인물 관계도·플롯 보드처럼 브레인스토밍에 좋아요. ‘＋ 카드’로 더 추가해보세요.', target: '.canvas-area', place: 'center', pre: () => S().setView('canvas') },
    { chapter: '작업 화면', emoji: '🪢', title: '타임라인 — 시간 순으로', body: '사건을 시간/스토리 순서로 배치해 복선과 연표를 관리해요. POV(시점)별 스윔레인으로도 볼 수 있어요.', target: () => document.querySelector('.st-center, .center'), place: 'center', pre: () => S().setView('timeline') },
    { chapter: '작업 화면', emoji: '🛠️', title: '칸반 — 진행 관리', body: '초고 → 수정 → 완성처럼 상태별 칸으로 글을 옮기며 진척을 관리해요. 연재 관리·데이터베이스(엑셀식) 화면도 있으니 보기 메뉴에서 둘러보세요.', target: '.board', place: 'center', pre: () => S().setView('board') },
    // ── CH6 도구(실제 글쓰기에 엮어 쓰기 · 도구 연결/체이닝) ──
    { chapter: '도구', emoji: '🧰', title: '막히면? 도구를 꺼내 써요', body: '이름·인물·장소·플롯·세계관·분석까지 500개가 넘는 창작 도구가 있어요. 글을 쓰다 막힌 바로 그 순간에 꺼내 쓰는 게 핵심! 도구 메뉴나 ⌘K(명령 팔레트)에서 이름만 쳐도 바로 떠요.', target: menuBtn('도구'), place: 'bottom', pre: () => { S().setView('editor'); ensureDoc() } },
    {
      chapter: '도구', emoji: '🎲', title: '예) 주인공 이름이 필요해요', body: '지금 글에 등장인물 이름이 필요하다고 해볼게요. ‘이름 생성기’를 열어 후보를 뽑아보세요. (대신 열어드릴 수도 있어요!)', target: '.toolwin', place: 'auto',
      do: { hint: '이름 생성기 열기 → 이름 뽑기', check: () => !!document.querySelector('.toolwin[data-tool-id="name-mixer"]'), auto: () => openToolLinked('name-mixer') },
    },
    { chapter: '도구', emoji: '🔗', title: '도구는 서로 연결돼요', body: '도구 창 맨 아래 ‘관련 도구’ 줄을 보세요. 지금 도구와 어울리는 다음 도구가 자동으로 떠요. 클릭하면 작업 흐름이 자연스럽게 이어집니다 — 이게 이 앱의 강점이에요.', target: () => document.querySelector('.toolwin-related') || document.querySelector('.toolwin'), place: 'auto' },
    {
      chapter: '도구', emoji: '🧑‍🎤', title: '이름 → 인물 시트로 잇기', body: '뽑은 이름으로 ‘인물 시트’를 열어 성격·욕망·비밀까지 살을 붙여요. 이렇게 도구를 ‘엮어’ 쓰면 단편적인 결과가 진짜 캐릭터가 돼요.', target: '.toolwin', place: 'auto',
      do: { hint: '인물 시트(연결 도구) 열기', check: () => !!document.querySelector('.toolwin[data-tool-id="character-forge"]'), auto: () => openToolLinked('character-forge') },
    },
    { chapter: '도구', emoji: '🧩', title: '필요한 도구로 갈아끼우기', body: '장소가 필요하면 ‘장소 이름 생성기’, 사건이 막히면 ‘플롯 전환 덱’, 선택이 고민이면 ‘딜레마 생성기’, 표현이 안 떠오르면 ‘유의어’… 막힌 종류에 맞는 도구를 갈아끼우며 풀어요. 결과는 ‘프로젝트에 추가’나 🧺 수집함으로 가져와요.', target: '.toolwin', place: 'auto' },
    {
      chapter: '도구', emoji: '✍️', title: '도구 결과를 글에 적용!', body: '도구는 결국 ‘글에 쓰려고’ 쓰는 거예요. 뽑은 이름·장소 같은 걸 본문에 한 줄 더 적어 실제로 적용해보세요. (대신 한 줄 넣어드릴 수도 있어요.)', target: '.paper', place: 'auto',
      pre: () => { S().setView('editor'); ensureDoc(); docLen.current = plain(docId.current).length },
      do: {
        hint: '도구에서 얻은 걸 본문에 한 줄 적용',
        check: () => plain(docId.current).length > docLen.current + 3,
        auto: () => { const p = paperEl(); if (p) { const add = document.createElement('p'); add.textContent = '그녀의 이름은 ‘서린’. 빗속 골목 끝, 잊힌 등대로 향했다.'; p.appendChild(add); p.dispatchEvent(new Event('input', { bubbles: true })) } else if (docId.current) { const cur = S().project.items[docId.current]?.bodyRtf || '{\\rtf1\\ansi}'; S().setBodyRtf(docId.current, cur.replace(/\}\s*$/, '\\par 그녀의 이름은 서린. 빗속 골목 끝, 잊힌 등대로 향했다.\\par}')) } },
      },
    },
    { chapter: '도구', emoji: '🌌', title: '나머지는 쓰면서 직접 발견하세요', body: '도구 메뉴엔 ‘도구 허브(수백 개)’ · ‘창작 스튜디오(수천 개)’ · ‘장르 도구함(미스터리·SF·무협·판타지·로맨스…)’이 더 있어요. 다 외울 필요 없어요 — 한 번에 다 못 써봐요!\n👉 글을 쓰다 필요할 때마다 ⌘K로 이름만 쳐서 찾아 쓰면 돼요. 그렇게 쓰다 보면 ‘내 도구’가 자연스럽게 늘어요. 이 앱엔 화면 곳곳에 수백 가지 기능이 숨어 있으니, 직접 눌러보며 탐험하는 재미도 즐겨보세요!', target: menuBtn('도구'), place: 'bottom' },
    // ── CH6.5 더 깊이(자주 쓰는 기능들) ──
    { chapter: '더 깊이', emoji: '🔎', title: '찾기·바꾸기로 한 번에 수정', body: '인물 이름을 바꾸거나 오타를 한꺼번에 고칠 땐 ⌘F(윈도우 Ctrl+F) 찾기·바꾸기! 도구 메뉴의 ‘전체 찾아 바꾸기’는 실행 전 상태를 문서마다 자동 스냅샷으로 남겨서, 잘못 바꿔도 인스펙터 › 스냅샷에서 안전하게 되돌릴 수 있어요.', target: menuBtn('도구'), place: 'bottom' },
    { chapter: '더 깊이', emoji: '🧘', title: '집중 모드로 몰입', body: '상단의 집중 모드 버튼(⌘⇧Enter)을 누르면 ‘현재 창에서’ 또는 ‘새 창(전체 화면/일반)’을 골라 몰입해요 — 다중 모니터라면 새 창이 특히 좋아요. 상단 바에 저장 상태(✓ 저장됨)도 항상 보여요.', target: () => document.querySelector('[title^="집중 모드"], [aria-label^="집중"]'), place: 'auto' },
    { chapter: '더 깊이', emoji: '⌘', title: '⌘K — 모든 것을 한 줄로', body: '⌘K(윈도우 Ctrl+K) 명령 팔레트에서 기능·도구를 검색해 바로 실행해요. 한글 초성(ㅋㄹㅋ→코르크보드)도 통하고, 자주·최근 쓴 명령이 위로 올라와요. 도구 허브 맨 위의 ★ 즐겨찾기·최근 사용과 함께 쓰면 도구 찾는 시간이 사라져요.', target: () => document.querySelector('[aria-label="명령 팔레트"]') || document.querySelector('.menu-wrap > button'), place: 'auto' },
    { chapter: '더 깊이', emoji: '🧺', title: '수집함 → 원고로 되돌리기', body: '수집함에 모아둔 메모는 ⤵ 버튼 한 번으로 지금 쓰는 원고의 커서 위치에 삽입돼요. 자료 조사(모으기)와 집필(꺼내 쓰기)이 한 흐름이 됩니다. 웹 주소는 클릭하면 새 탭으로 열려요.', target: () => document.querySelector('.stash-icon-wrap, .stash-win, .stash-icon'), place: 'auto' },
    { chapter: '더 깊이', emoji: '📈', title: '단어 수 · 목표 · 통계', body: '아래 푸터에 실시간 단어 수와 목표 진행이 보여요. 도구 메뉴의 ‘프로젝트 통계’·‘글쓰기 분석(가독성)’으로 집필 흐름과 문장 습관도 점검할 수 있어요.', target: () => document.querySelector('.footer, .st-footer'), place: 'top' },
    { chapter: '더 깊이', emoji: '🌗', title: '테마 · 타이포 내 맘대로', body: '보기 메뉴의 ‘테마 전환’(⌘⇧L)으로 라이트·다크·세피아를 바꿔요. 프로젝트 설정에서 편집창 폭·문단 간격·줄간격도 취향대로 맞출 수 있어요.', target: menuBtn('보기'), place: 'bottom' },
    // ── CH7 저장/내보내기/백업 ──
    { chapter: '저장·내보내기', emoji: '💾', title: '저장은 자동, ⌘S 로도', body: '쓰는 즉시 자동 저장되니 안심하세요. 클래식 UI 상단엔 ‘저장’ 버튼이, 어느 UI에서나 ⌘S(맥은 ⌘, 윈도우는 Ctrl) 단축키가 동작해요. 원고는 늘 안전하게 보관돼요.', target: () => document.querySelector('.save-btn, .st-top'), place: 'bottom' },
    { chapter: '저장·내보내기', emoji: '📤', title: '내보내기 & 백업', body: '파일 메뉴에서 원고를 PDF·DOCX·EPUB·ODT·마크다운 등으로 내보내거나, .sry 파일로 통째로 백업해요. ‘백업/복원’으로 시점별 백업도 만들 수 있어요. 내 원고는 늘 내 손안에!', target: menuBtn('파일'), place: 'bottom' },
    // ── CH8 마무리 ──
    { chapter: '마무리', emoji: '🎉', title: '작은 작품 한 편 완성!', body: '폴더·글 만들기 → 집필 → 서식 → 메타/목표/시놉시스/키워드/노트/스냅샷 → 자료·수집함 → 여러 화면 → 도구 → 저장까지, 핵심 흐름을 다 익혔어요. 정말 잘하셨어요! 👏', place: 'center' },
    {
      chapter: '마무리', emoji: '🧹', title: '연습 폴더, 어떻게 할까요?', body: '연습으로 만든 ‘🎓 글쓰기 연습’ 폴더를 정리할 수 있어요. (실제 원고는 그대로예요.)', place: 'center',
      choices: [
        { label: '🗑️ 연습 흔적 정리하고 끝내기(폴더·키워드·메모)', run: () => cleanupPractice() },
        { label: '📂 남겨두고 끝내기', run: () => {} },
        { label: '🔄 다른 방식으로 다시 해보기', go: 1 },
      ],
    },
  ])
  const steps = STEPS.current
  // 저장된 단계가 (버전 변경 등으로) 범위를 벗어나면 처음부터.
  useEffect(() => { if (i >= steps.length) { setI(0); setResumed(false) } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i === steps.length - 1
  const isDo = !!step.do
  const close = useCallback(() => onClose(), [onClose])
  const go = useCallback((n: number) => setI((p) => Math.max(0, Math.min(steps.length - 1, p + n))), [steps.length])
  const jump = useCallback((n: number) => setI(Math.max(0, Math.min(steps.length - 1, n))), [steps.length])

  // 단계 진입: pre 실행 + 베이스라인 기록 + do 완료여부 초기화 + 대상 측정
  useEffect(() => {
    try { step.pre?.() } catch { /* noop */ }
    baseline.current = {
      folders: Object.values(S().project.items).filter((x) => x.type === 'folder').length,
      texts: Object.values(S().project.items).filter((x) => x.type === 'text' && !x.root).length,
      stash: stashCount(),
      sub: childItems(folderId.current).length,
      tool: document.querySelectorAll('.toolwin').length,
    }
    setDone(false)
    let raf = 0
    const measure = () => { const el = resolveTarget(step.target); setRect(el ? el.getBoundingClientRect() : null) }
    measure()
    const t1 = window.setTimeout(measure, 90), t2 = window.setTimeout(measure, 280)
    const onWin = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', onWin); window.addEventListener('scroll', onWin, true)
    // do 단계: 완료 조건을 주기적으로 확인
    let poll = 0
    if (step.do) poll = window.setInterval(() => { try { if (step.do!.check()) { setDone(true); window.clearInterval(poll) } } catch { /* noop */ } }, 400)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); cancelAnimationFrame(raf); if (poll) window.clearInterval(poll); window.removeEventListener('resize', onWin); window.removeEventListener('scroll', onWin, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 말풍선 위치
  useLayoutEffect(() => {
    const b = bubbleRef.current; if (!b) return
    const bw = b.offsetWidth, bh = b.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, M = 14
    if (!rect || step.place === 'center') { setPos({ left: (vw - bw) / 2, top: Math.max(12, (vh - bh) / 2), arrow: 'none' }); return }
    let p: Place = step.place || 'auto'
    if (p === 'auto') { const sp: Record<string, number> = { right: vw - rect.right, left: rect.left, bottom: vh - rect.bottom, top: rect.top }; p = (['right', 'bottom', 'left', 'top'] as Place[]).sort((a, b2) => sp[b2 as string] - sp[a as string])[0] }
    let left = 0, top = 0, arrow = 'none'
    if (p === 'right') { left = rect.right + M; top = rect.top + rect.height / 2 - bh / 2; arrow = 'left' }
    else if (p === 'left') { left = rect.left - M - bw; top = rect.top + rect.height / 2 - bh / 2; arrow = 'right' }
    else if (p === 'bottom') { top = rect.bottom + M; left = rect.left + rect.width / 2 - bw / 2; arrow = 'top' }
    else { top = rect.top - M - bh; left = rect.left + rect.width / 2 - bw / 2; arrow = 'bottom' }
    setPos({ left: Math.max(8, Math.min(left, vw - bw - 8)), top: Math.max(8, Math.min(top, vh - bh - 8)), arrow })
  }, [rect, i, step.place, done])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // do 스텝에서 사용자가 에디터/입력창에 타이핑 중이면 화살표·Esc 를 가로채지 않는다(리뷰 F3 — 캐럿 이동이 스텝 이동으로 둔갑 방지).
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'Escape') { e.preventDefault(); close() }
      else if (e.key === 'ArrowRight' && !step.choices) { e.preventDefault(); last ? close() : go(1) }
      else if (e.key === 'ArrowLeft' && !step.choices) { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, go, last, step.choices])

  const doAuto = () => { try { step.do?.auto() } catch { /* noop */ } }
  const spotlight = rect && step.place !== 'center'
  // 차단 딤은 '중앙 안내·선택지' 단계에만(진행 보호를 위해 딤 클릭으로 닫지 않음).
  // 대상이 아직 안 떠서 rect 가 없는 do/info 단계는 오버레이 없이 앱을 그대로 쓸 수 있게 한다(도구 메뉴 등 클릭 가능).
  const blockingDim = !spotlight && (step.place === 'center' || !!step.choices)
  const chapters = Array.from(new Set(steps.map((s) => s.chapter)))
  const chapterIdx = chapters.indexOf(step.chapter)

  return (
    <div className="tour-root manual-root" role="dialog" aria-modal="false" aria-label="사용법 실습 도움말">
      {spotlight && (
        <div className="tour-spotlight" style={{ left: rect!.left - 6, top: rect!.top - 6, width: rect!.width + 12, height: rect!.height + 12 }} />
      )}
      {blockingDim && <div className="tour-dim" />}
      <div ref={bubbleRef} className={'tour-bubble manual-bubble arrow-' + pos.arrow} style={{ left: pos.left, top: pos.top }}>
        <button className="tour-x" aria-label="도움말 닫기" title="닫기 (Esc)" onClick={close}>×</button>
        <div className="manual-chapter">{step.chapter} · 챕터 {chapterIdx + 1}/{chapters.length}</div>
        <div className="tour-head">
          <span className="tour-emoji" aria-hidden>{step.emoji}</span>
          <span className="tour-title">{step.title}</span>
        </div>
        <div className="tour-body">{step.body}</div>

        {isDo && (
          <div className={'manual-task' + (done ? ' done' : '')}>
            {done ? <span>✓ 잘하셨어요! ‘다음’으로 계속해요.</span> : <span>👉 {step.do!.hint}</span>}
          </div>
        )}

        {resumed && (
          <div style={{ margin: '4px 0 8px', fontSize: 11.5, color: 'var(--muted, #888)', display: 'flex', alignItems: 'center', gap: 8 }}>
            지난번 하던 단계부터 이어서 진행해요.
            <button className="tour-btn ghost" style={{ padding: '1px 8px', fontSize: 11.5 }} onClick={() => { setResumed(false); setI(0) }}>처음부터</button>
          </div>
        )}
        {step.choices ? (
          <div className="manual-choices">
            {step.choices.map((c, n) => (
              <button key={n} className="manual-choice" onClick={() => { try { c.run?.() } catch { /* noop */ } ; if (typeof c.go === 'number') jump(c.go); else { try { localStorage.removeItem(MANUAL_STEP_KEY) } catch { /* noop */ } close() } }}>{c.label}</button>
            ))}
          </div>
        ) : (
          <>
            <div className="tour-dots" aria-hidden>
              {steps.map((_, n) => (<button key={n} className={'tour-dot' + (n === i ? ' on' : '')} onClick={() => jump(n)} tabIndex={-1} />))}
            </div>
            <div className="tour-foot">
              <button className="tour-skip" onClick={close}>그만 보기</button>
              <span style={{ flex: 1 }} />
              <span className="tour-count">{i + 1} / {steps.length}</span>
              {i > 0 && <button className="tour-btn ghost" onClick={() => go(-1)}>이전</button>}
              {isDo && !done && <button className="tour-btn ghost" onClick={doAuto}>대신 해줄게요</button>}
              <button className="tour-btn primary" onClick={() => { if (last) { try { localStorage.removeItem(MANUAL_STEP_KEY) } catch { /* noop */ } close() } else go(1) }}>
                {last ? '끝내기' : isDo && !done ? '건너뛰기' : '다음'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
