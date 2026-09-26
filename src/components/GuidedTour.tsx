// 인터랙티브 온보딩 가이드 투어 — 백과사전식이 아니라, 실제 UI 요소를 말풍선으로 짚어가며 대화하듯 안내.
//  · 앱 시작 시 자동 시작(처음 1회) + 상단 '?' 버튼/보기 메뉴/명령 팔레트로 다시 열기.
//  · 각 단계는 실제 DOM 요소를 스포트라이트로 비추고, 옆에 말풍선으로 한 마디씩 건넨다.
//  · 언제든 '그만 보기'(좌하단)·× (우상단)·Esc 로 즉시 닫힌다(닫으면 다시 자동으로 안 뜸).
// import 는 react 와 store 만(외부 의존 없음). z-index 는 모든 UI 위(10000).
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../store/store'

type Place = 'auto' | 'right' | 'left' | 'top' | 'bottom' | 'center'
interface Step {
  target?: string | (() => Element | null) // 비우면 화면 중앙 말풍선
  emoji: string
  title: string
  body: string
  place?: Place
  pre?: () => void // 단계 진입 직전 실행(예: 특정 뷰로 전환해 대상이 보이게)
}

// 메뉴 트리거 — 클래식(.tbtn)·스튜디오(.st-menu-btn) 모두 '.menu-wrap > button' 이라 스킨 무관.
const menuBtn = (label: string) => () => [...document.querySelectorAll('.menu-wrap > button')].find((b) => (b.textContent || '').trim() === label) || null

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: '안녕하세요! 처음이시죠?',
    body: '30초만 같이 둘러볼게요. 서버 없이 브라우저에서 돌아가는 한국어 글쓰기 앱이에요 — 쓴 글은 자동으로 저장돼요.\n바로 쓰고 싶으면 왼쪽 아래 ‘그만 보기’를 누르면 돼요.',
    place: 'center',
  },
  {
    target: '.binder',
    emoji: '🗂️',
    title: '여기가 원고 서랍이에요',
    body: '왼쪽 패널에서 글과 폴더를 관리해요. 위의 ‘＋ 글’로 새 글을, ‘＋ 폴더’로 묶어요. 만들면 바로 이름을 칠 수 있어요.',
    place: 'right',
  },
  {
    target: '.paper',
    emoji: '✍️',
    title: '가운데가 집필 공간!',
    body: '여기에 본문을 써요. 입력하는 즉시 브라우저에 자동 저장되니 ‘저장 깜빡’ 걱정은 안 하셔도 돼요.',
    place: 'auto',
    pre: () => useStore.getState().setView('editor'),
  },
  {
    target: '.formatbar',
    emoji: '🅰️',
    title: '글자 꾸미기는 여기서',
    body: '굵게·크기·색·줄간격을 바꿔요. 글을 선택하고 바꾸면 그 부분만, 선택 없이 바꾸면 문서 전체에 적용돼요.',
    place: 'bottom',
    pre: () => useStore.getState().setView('editor'),
  },
  {
    target: () => document.querySelector('.seg, .st-rail'),
    emoji: '🔭',
    title: '같은 원고, 10가지 시선',
    body: '코르크보드·아웃라이너·칸반·타임라인·캔버스… 한 원고를 여러 화면으로 보고 정리해요. 한 곳에서 순서를 바꾸면 다른 곳도 같이 바뀌어요.',
    place: 'bottom',
  },
  {
    target: '.insp-tabs',
    emoji: '🧩',
    title: '오른쪽은 작업 메모장',
    body: '메모·키워드·시놉시스, 그리고 스냅샷(버전)이 있어요. 스냅샷을 찍어두면 언제든 그 시점으로 되돌릴 수 있어 안전해요.',
    place: 'left',
  },
  {
    target: menuBtn('도구'),
    emoji: '🧰',
    title: '창작 도구가 수백 개!',
    body: '이름 짓기·플롯·인물·세계관… 도구 메뉴에 가득해요. 더 빠른 길은 ⌘K(명령 팔레트) — 이름만 쳐도 바로 찾아 실행돼요.',
    place: 'bottom',
  },
  {
    target: menuBtn('파일'),
    emoji: '💾',
    title: '내 원고는 내 손안에',
    body: '파일 메뉴에서 .sry 파일로 내보내고, 백업·복원도 할 수 있어요. 원고는 늘 안전하게 지켜드릴게요.',
    place: 'bottom',
  },
  // ── 우리 앱의 특장점 10가지 — 각 항목이 실제 위치(메뉴/기능/도구)를 짚어줍니다 ──
  {
    emoji: '🔒', title: '① 내 원고는 내 기기에', body: '서버 없이 100% 브라우저에서 동작해요. 여기 ‘저장’ 표시처럼 쓰는 즉시 내 기기에 자동 저장되고, 오프라인(PWA)에서도 써져요.',
    target: () => document.querySelector('.save-btn, .st-top'), place: 'bottom',
  },
  {
    emoji: '🛟', title: '② 원고는 삼중 안전망', body: '자동 저장 + 스냅샷(버전 되돌리기) + 주기적 백업. 오른쪽 인스펙터의 이 ‘스냅샷’ 탭에서 언제든 과거 버전으로 되돌릴 수 있어요.\n‘전체 찾아 바꾸기’도 실행 전 상태를 자동 스냅샷으로 남기고, 백업 모달에선 내보내 둔 .sry 파일로도 복원돼요.',
    target: () => document.querySelector('#insp-tab-snapshots'), place: 'left',
    pre: () => useStore.setState({ inspectorVisible: true }),
  },
  {
    emoji: '🅰️', title: '③ 진짜 RTF · 자유로운 내보내기', body: '서식이 그대로 보존돼요. 이 ‘파일’ 메뉴에서 DOCX·PDF·EPUB·ODT·LaTeX·마크다운·Fountain·FDX 로 내보낼 수 있어요.',
    target: menuBtn('파일'), place: 'bottom',
  },
  {
    emoji: '🧰', title: '④ 500+ 창작 도구', body: '이름·인물·플롯·세계관 생성기부터 분석기까지. 이 ‘도구’ 메뉴(또는 도구 허브)에서 막힌 곳을 뚫어요.\n도구 허브 맨 위에는 ★ 즐겨찾기와 최근 사용한 도구가 떠서, 다음부터는 바로 이어 쓸 수 있어요.',
    target: menuBtn('도구'), place: 'bottom',
  },
  {
    emoji: '🎨', title: '⑤ 창작 스튜디오 · 장르 도구함', body: '같은 ‘도구’ 메뉴 안에 수천 가지 아이디어 생성기(창작 스튜디오)와 장르별 도구함(미스터리·SF·무협·판타지·로맨스…)도 있어요.',
    target: menuBtn('도구'), place: 'bottom',
  },
  {
    emoji: '🔭', title: '⑥ 10가지 작업 화면', body: '여기 화면 전환 버튼들! 같은 원고를 코르크보드·아웃라이너·칸반·캔버스·타임라인·연재·참고문헌·논증·DB로 보고 정리해요.',
    target: () => document.querySelector('.seg, .st-rail'), place: 'auto',
  },
  {
    emoji: '⌘', title: '⑦ 명령 팔레트(⌘K)', body: '모든 기능·도구를 이름으로 검색해 즉시 실행! 이 ‘보기’ 메뉴 안에도 있고, 어디서나 ⌘K(윈도우 Ctrl+K)로 바로 열려요.\n한글 초성(예: ㅋㄹㅋ→코르크보드)으로도 찾아지고, 자주·최근 쓴 명령이 위로 올라와요.',
    target: menuBtn('보기'), place: 'bottom',
  },
  {
    emoji: '🧺', title: '⑧ 만능 수집함', body: '이 🧺 수집함은 떠다니는 보관함이에요. 링크·이미지·메모 등 무엇이든 끌어다 모아 자료 조사를 깔끔하게.\n모아둔 메모는 ⤵ 버튼 한 번으로 지금 쓰는 원고에 바로 삽입돼요.',
    target: () => document.querySelector('.stash-icon-wrap, .stash-win, .stash-icon'), place: 'auto',
  },
  {
    emoji: '📅', title: '⑨ 연재 + 플랫폼 미리보기', body: '화면 전환에서 ‘연재 관리’로 회차·비축분을 관리하고, ‘파일’ 메뉴의 플랫폼 미리보기로 웹소설 독자 화면을 그대로 봐요.',
    target: () => document.querySelector('.seg, .st-rail'), place: 'auto',
  },
  {
    emoji: '📚', title: '⑩ 참고문헌 · 논증 작업대', body: '화면 전환의 ‘참고문헌·논증’으로 인용·서지와 Toulmin 논증까지 — 논픽션·학술 글쓰기도 든든하게 받쳐줘요.',
    target: () => document.querySelector('.seg, .st-rail'), place: 'auto',
  },
  {
    emoji: '🎉',
    title: '이제 시작해볼까요?',
    body: '준비 끝! 더 깊이 배우고 싶다면 보기 메뉴의 ‘더 알아보기 (사용법 실습)’에서 따라 하며 작은 작품 한 편을 같이 완성해봐요.\n이 안내는 상단 ‘?’ 버튼이나 보기 메뉴에서 언제든 다시 볼 수 있어요. 즐거운 집필! ✍️',
    place: 'center',
  },
]

function resolveTarget(t?: Step['target']): Element | null {
  if (!t) return null
  try { return typeof t === 'function' ? t() : document.querySelector(t) } catch { return null }
}

const TOUR_STEP_KEY = 'sry:tour:step'

export default function GuidedTour({ onClose }: { onClose: () => void }) {
  // 이어보기(#25): 실수 클릭/Esc 로 닫혀도 보던 단계를 기억해 다음에 그 지점부터 재개.
  const [i, setI] = useState(() => { try { const v = parseInt(localStorage.getItem(TOUR_STEP_KEY) || '0', 10); return v > 0 && v < STEPS.length ? v : 0 } catch { return 0 } })
  const [resumed, setResumed] = useState(i > 0)
  useEffect(() => { try { localStorage.setItem(TOUR_STEP_KEY, String(i)) } catch { /* noop */ } }, [i])
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; arrow: string }>({ left: 0, top: 0, arrow: 'none' })
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const close = useCallback(() => { onClose() }, [onClose])
  const go = useCallback((n: number) => { setI((p) => Math.max(0, Math.min(STEPS.length - 1, p + n))) }, [])

  // 단계 진입 시 pre 실행 + 대상 위치 측정(레이아웃 안정까지 몇 번 재측정)
  useEffect(() => {
    try { step.pre?.() } catch { /* noop */ }
    let raf = 0
    const measure = () => {
      const el = resolveTarget(step.target)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const t1 = window.setTimeout(measure, 80)
    const t2 = window.setTimeout(measure, 250)
    const onWin = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); cancelAnimationFrame(raf); window.removeEventListener('resize', onWin); window.removeEventListener('scroll', onWin, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // 말풍선 위치 계산(대상 rect + 말풍선 크기 기준, 화면 안으로 클램프)
  useLayoutEffect(() => {
    const b = bubbleRef.current
    if (!b) return
    const bw = b.offsetWidth, bh = b.offsetHeight
    const vw = window.innerWidth, vh = window.innerHeight, M = 14
    if (!rect || step.place === 'center') { setPos({ left: (vw - bw) / 2, top: (vh - bh) / 2, arrow: 'none' }); return }
    let p: Place = step.place || 'auto'
    if (p === 'auto') {
      const sp: Record<string, number> = { right: vw - rect.right, left: rect.left, bottom: vh - rect.bottom, top: rect.top }
      p = (['right', 'bottom', 'left', 'top'] as Place[]).sort((a, b) => sp[b as string] - sp[a as string])[0]
    }
    let left = 0, top = 0, arrow = 'none'
    if (p === 'right') { left = rect.right + M; top = rect.top + rect.height / 2 - bh / 2; arrow = 'left' }
    else if (p === 'left') { left = rect.left - M - bw; top = rect.top + rect.height / 2 - bh / 2; arrow = 'right' }
    else if (p === 'bottom') { top = rect.bottom + M; left = rect.left + rect.width / 2 - bw / 2; arrow = 'top' }
    else { top = rect.top - M - bh; left = rect.left + rect.width / 2 - bw / 2; arrow = 'bottom' }
    left = Math.max(8, Math.min(left, vw - bw - 8))
    top = Math.max(8, Math.min(top, vh - bh - 8))
    setPos({ left, top, arrow })
  }, [rect, i, step.place])

  // Esc 닫기 / ←→ 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 실습 유도 스텝에서 사용자가 에디터/입력창에 타이핑 중이면 화살표·Esc 를 가로채지 않는다(리뷰 F3).
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'Escape') { e.preventDefault(); close() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); last ? close() : go(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, go, last])

  const spotlight = rect && step.place !== 'center'

  return (
    <div className="tour-root" role="dialog" aria-modal="false" aria-label="앱 둘러보기">
      {/* 스포트라이트(대상 강조) 또는 중앙 단계용 전체 딤 */}
      {spotlight ? (
        <div
          className="tour-spotlight"
          style={{ left: rect!.left - 6, top: rect!.top - 6, width: rect!.width + 12, height: rect!.height + 12 }}
        />
      ) : (
        <div className="tour-dim" onClick={close} />
      )}

      <div
        ref={bubbleRef}
        className={'tour-bubble arrow-' + pos.arrow}
        style={{ left: pos.left, top: pos.top }}
      >
        <button className="tour-x" aria-label="도움말 닫기" title="닫기 (Esc)" onClick={close}>×</button>
        <div className="tour-head">
          <span className="tour-emoji" aria-hidden>{step.emoji}</span>
          <span className="tour-title">{step.title}</span>
        </div>
        <div className="tour-body">{step.body}</div>
        <div className="tour-dots" aria-hidden>
          {STEPS.map((_, n) => (
            <button key={n} className={'tour-dot' + (n === i ? ' on' : '')} onClick={() => setI(n)} tabIndex={-1} />
          ))}
        </div>
        <div className="tour-foot">
          <button className="tour-skip" onClick={close}>그만 보기</button>
          <span style={{ flex: 1 }} />
          <span className="tour-count">{i + 1} / {STEPS.length}</span>
          {i > 0 && <button className="tour-btn ghost" onClick={() => go(-1)}>이전</button>}
          {/* 특장점 ①~⑩ 구간(과부하 완화 #25): 원하면 한 번에 마지막으로. */}
          {/^[①-⑩]/.test(step.title) && !last && (
            <button className="tour-btn ghost" onClick={() => setI(STEPS.length - 1)} title="특장점 소개를 건너뛰고 마무리로">특장점 건너뛰기</button>
          )}
          <button className="tour-btn primary" onClick={() => { if (last) { try { localStorage.removeItem(TOUR_STEP_KEY) } catch { /* noop */ } close() } else go(1) }}>
            {last ? '글쓰기 시작' : '다음'}
          </button>
        </div>
        {resumed && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--muted, #888)', display: 'flex', alignItems: 'center', gap: 8 }}>
            지난번 보던 단계부터 이어서 보여드려요.
            <button className="tour-btn ghost" style={{ padding: '1px 8px', fontSize: 11.5 }} onClick={() => { setResumed(false); setI(0) }}>처음부터</button>
          </div>
        )}
      </div>
    </div>
  )
}
