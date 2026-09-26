# sry 소개 페이지 — 디자인 노트

앱과 분리된 **독립 정적 랜딩**(빌드 도구 0)의 디자인 시스템과, 브랜드 의미를 담은 **스토리마크 애니메이션**을 정리한 문서입니다. 배포/연결 방법은 [`README.md`](./README.md)를 보세요.

---

## 1. 브랜드 스토리마크 — `s … to … ry`

### 의미
> **story** = **s**(시작) … **ry**(끝) — 그 사이의 빈칸을 **to**가 채운다.
> 그 **to** 를 채워 주는 것이 바로 **sry** 다.

시작과 끝은 쓰는 사람의 몫이고, 그 사이를 이어 완성하게 돕는 도구가 sry라는 뜻을, 단어 자체로 보여 줍니다. 브랜드명 `sry`(s + ry)에 `to`가 들어가면 `story`가 된다 — 이 언어유희가 히어로의 첫인상입니다.

### 표현(애니메이션)
히어로 최상단의 대형 워드마크에서 다음 순서로 재생됩니다(스크롤 진입 시 자동, 클릭/Enter로 다시 재생):

1. **`s`** 와 **`ry`** 가 아래에서 부드럽게 떠오른다 → `s      ry` (사이에 빈칸).
2. 빈칸에 **액센트 캐럿**이 깜빡인다 — "여기가 채워질 자리".
3. **`to`** 가 액센트 그라디언트로 팝인하며 빈칸을 채운다(살짝 오버슈트 + 글로우) → `story`.
4. 완성된 `to` 는 은은한 글로우가 천천히 반복(살아있는 강조).

- 마크업: `index.html` 의 `.storymark`(#storymark) — `sm-s` / `sm-slot`(캐럿+`sm-to`) / `sm-ry`.
- 스타일/키프레임: `styles.css` 하단 "브랜드 스토리마크" 블록 (`smIn`·`smCaretBlink`·`smFill`·`smGlow`).
- 재생 로직: `main.js` "브랜드 스토리마크 … 다시 재생" — `.in` 클래스를 뗐다 붙여 애니메이션을 재시작.
- **접근성/모션 최소화**: `prefers-reduced-motion` 이면 애니메이션 없이 최종형(`story`, `to` 액센트)만 즉시 표시. 스크린리더용 `aria-label` 에 의미를 문장으로 서술, 시각 자막은 `aria-hidden`.

### 손보는 곳
- `to` 색: 토큰 `--accent` / `--accent-ink`(그라디언트) — `styles.css :root`.
- 크기: `.storymark-word { font-size: clamp(3.2rem, 10vw, 6.4rem) }`.
- 타이밍: `.storymark.in .sm-to` 의 `animation` 지연(현재 캐럿 후 1.5s에 채움).
- 자막 문구: `index.html` 의 `.storymark-cap`.

---

## 2. 디자인 시스템 개요

**미니멀 스위스 + 모던 액센트.** 넉넉한 여백, 얇은 대형 헤드라인(`font-weight:300`), 모노스페이스 아이브로우, 절제된 단일 액센트(블루).

### 토큰 (`styles.css :root`)
- 색: `--bg`·`--surface`·`--ink`/`--ink-2`/`--muted`·`--line`/`--line-strong`·`--accent`계열. 라이트/다크 각각 정의(`:root[data-theme="dark"]`), 버튼 위 흰 글자 대비는 WCAG AA(≈5.5:1) 확보한 `--accent-strong`.
- 레이아웃: `--shell: min(1180px, 92vw)`, 섹션 패딩 `--pad-section: clamp(4.5rem, 11vh, 9rem)`, 반경 `--radius`, 헤더 높이 `--header-h`.
- 모션: 공통 이징 `--ease: cubic-bezier(.22,1,.36,1)`.

### 테마
- 첫 페인트 전(FOUC 방지) `index.html` 인라인 스크립트가 저장된/시스템 테마를 적용.
- 토글은 `main.js` `applyTheme()` — `data-theme` 전환 + `localStorage('sry-theme')` + `theme-color` 메타 동기화.

### 반응형
- 데스크톱 내비 ↔ 모바일 햄버거 메뉴(포커스 트랩·배경 스크롤 잠금·Esc 닫기), `min-width: 821px` 경계.

---

## 3. 섹션 구성 (`index.html`)

| 순서 | 섹션 | 핵심 |
|---|---|---|
| Hero | `.hero` | **스토리마크** + "한 편의 글을, 처음부터 끝까지." + 실제 에디터 목업(라이트/다크 자동) |
| Strip | `.strip` | 호환/기술 신뢰 스트립(.rtf · .scriv · DOCX/EPUB/PDF · PWA) |
| Workflow | `.flow` | 01 구조 · 02 집필 · 03 발행 |
| Screens | `.screens` | **진짜 앱 스크린샷** 쇼케이스(도구허브·코르크보드·연재·도구창·DB) |
| Why | `.why` | 타협하지 않은 여섯 가지 |
| Studio | `.studio` | 창작 도구 2,445+ 지표 + 마퀴 |
| Safety | `.safety` | 데이터 안전(로컬 저장·저장검증·백업·.scriv·다중탭·구조복구) |
| Types | `.types` | 글쓰기 유형 칩 |
| Engage | `.engage` | 계정(준비 중) + 의견 폼(mailto, 서버 없음) |
| CTA | `.cta` | 최종 시작하기 |

## 4. 모션·인터랙션 (`main.js`, 의존성 0)
- 스크롤 리빌(IntersectionObserver, `.reveal → .in`), 숫자 카운트업(`data-count`), 스크롤 진행 바(CSS `scroll()` 지원 시 CSS, 아니면 JS 폴백), 헤더 스크롤 상태, 모바일 메뉴, 스토리마크 재생, 의견 폼 mailto.
- 전부 `prefers-reduced-motion` 존중(모션 오프 시 최종형 즉시 표시).

## 5. 이번 개선 요약(2026-06-28)
- 히어로에 **브랜드 스토리마크 애니메이션**(`s…to…ry`, `to`=우리 앱) 신설 — 사이트의 첫인상이자 브랜드 서사.
- 히어로 헤드라인을 "처음부터 끝까지"로 다듬어 스토리마크(시작↔끝)와 의미 연결.
- 스토리마크는 라이트/다크·모션최소화·키보드(포커스+Enter 재생)·스크린리더까지 대응.

> 스크린샷 재생성 등 자산 관리는 `README.md` 참고. 브랜드 색만 바꾸면(`--accent`) 전체 톤과 `to` 강조가 함께 바뀝니다.
