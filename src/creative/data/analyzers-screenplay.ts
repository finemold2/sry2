// 카테고리 "시나리오" 분석기 모듈.
// node --experimental-strip-types 단독 실행 가능: 타입은 import type, 런타임 헬퍼는 .ts 확장자 명시.
import type { Analyzer, AnalyzerResult, AnalyzerContext, Tier } from '../analyzers.ts'
import type { BinderItem } from '../../model/types.ts'
import {
  splitSentences,
  wordTokens,
  splitParagraphs,
  hasKorean,
  extractDialogue,
  charsNoSpace,
} from '../text.ts'

// ── 공용 소도구 (모두 빈 입력 안전) ──────────────────────────────

/** 0 나누기 가드 나눗셈. */
function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0
}

/** 슬러그라인(장면 헤딩) 후보 정규식. INT./EXT. 또는 한글 실내/실외 표기. */
const SLUG_HEAD_RE = /^\s*(INT\.?|EXT\.?|INT\.?\/EXT\.?|I\/E\.?|실내|실외|실내\/실외)\b/i
/** 시간대 키워드(영/한). */
const TIME_RE = /\b(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER|MOMENTS LATER)\b|(낮|밤|새벽|아침|저녁|황혼|해질녘|동틀녘|이어서|잠시\s*후)/i

/** 대문자 화자(슬레이트) 라인 후보. 예: "JOHN", "JOHN (V.O.)", 한글 "김씨", "민수:" */
function detectSpeaker(line: string): string | null {
  const t = line.trim()
  if (!t) return null
  if (SLUG_HEAD_RE.test(t)) return null // 슬러그라인은 화자가 아님
  // "이름:" 형식(한/영) — 콜론 앞이 짧으면 화자
  const colon = t.match(/^([^\s:][^:]{0,29}):(?!\d)/)
  if (colon) {
    const name = colon[1].trim()
    if (name && wordTokens(name).length <= 4) return name.toUpperCase()
  }
  // 영문 올대문자 화자 라인(괄호 지시 허용): JOHN, MARY (CONT'D)
  const m = t.match(/^([A-Z][A-Z0-9 .'\-]{0,28})(\s*\([^)]*\))?\s*$/)
  if (m) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    const letters = name.replace(/[^A-Z]/g, '')
    // 너무 짧거나 한 단어 비명령형 보호: 최소 2글자, 5단어 이하
    if (letters.length >= 2 && wordTokens(name).length <= 5) return name
  }
  // 한글 화자 라인(이름만 단독): "민수", "민수 (O.S.)" — 보수적으로 짧은 순수 이름만.
  const k = t.match(/^([가-힣]{2,6})(\s*\([^)]*\))?$/)
  if (k && !/[.!?。！？…,]/.test(t)) return k[1]
  return null
}

/** 한 장면(혹은 텍스트)을 줄 단위로 보고 대사/지문 단어수와 화자별 대사 단어수를 집계. */
interface LineStats {
  dialogueWords: number
  actionWords: number
  speakers: Map<string, number> // 화자 → 대사 단어수
  monologues: { speaker: string; words: number }[] // 100단어 초과 블록
  slugCount: number
}

function analyzeLines(text: string): LineStats {
  const stats: LineStats = {
    dialogueWords: 0,
    actionWords: 0,
    speakers: new Map(),
    monologues: [],
    slugCount: 0,
  }
  if (!text || !text.trim()) return stats
  const lines = text.split(/\n/)
  let currentSpeaker: string | null = null
  let blockWords = 0
  const flush = () => {
    if (currentSpeaker && blockWords > 100) {
      stats.monologues.push({ speaker: currentSpeaker, words: blockWords })
    }
    currentSpeaker = null
    blockWords = 0
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (SLUG_HEAD_RE.test(line)) {
      flush()
      stats.slugCount++
      stats.actionWords += wordTokens(line).length
      continue
    }
    const speaker = detectSpeaker(line)
    if (speaker) {
      flush()
      currentSpeaker = speaker
      // "이름: 대사" 한 줄 형태면 콜론 뒤를 대사로 계산
      const colonIdx = line.indexOf(':')
      if (colonIdx >= 0 && colonIdx < line.length - 1) {
        const said = wordTokens(line.slice(colonIdx + 1)).length
        stats.dialogueWords += said
        stats.speakers.set(speaker, (stats.speakers.get(speaker) ?? 0) + said)
        blockWords += said
      }
      continue
    }
    const w = wordTokens(line).length
    if (currentSpeaker) {
      // 화자 라인 직후 → 대사 본문
      stats.dialogueWords += w
      stats.speakers.set(currentSpeaker, (stats.speakers.get(currentSpeaker) ?? 0) + w)
      blockWords += w
    } else {
      stats.actionWords += w
    }
  }
  flush()
  // 슬러그/화자 패턴이 거의 없는 산문형 원고 보강: 따옴표 대사로 대사량 근사
  if (stats.dialogueWords === 0 && stats.actionWords > 0) {
    const dlg = extractDialogue(text)
    if (dlg.length) {
      const dw = dlg.reduce((s, d) => s + wordTokens(d).length, 0)
      stats.dialogueWords = dw
      stats.actionWords = Math.max(0, stats.actionWords - dw)
    }
  }
  return stats
}

/** 전체 컨텍스트 단어수(장면 합산, 빈 경우 full 기반). */
function totalWords(ctx: AnalyzerContext): number {
  if (ctx.scenes.length) {
    const s = ctx.scenes.reduce((acc, sc) => acc + (sc.words || wordTokens(sc.text).length), 0)
    if (s > 0) return s
  }
  return wordTokens(ctx.full || '').length
}

function tierFor(value: number, warnAt: number, badAt: number, higherWorse = true): Tier {
  if (higherWorse) {
    if (value >= badAt) return 'bad'
    if (value >= warnAt) return 'warn'
    return 'ok'
  }
  if (value <= badAt) return 'bad'
  if (value <= warnAt) return 'warn'
  return 'ok'
}

// ── 분석기 정의 ──────────────────────────────────────────────────

export const ANALYZERS_SCREENPLAY: Analyzer[] = [
  // 1) 러닝타임 추정 ────────────────────────────────────────────
  {
    id: 'sc-runtime',
    name: '러닝타임 추정',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '대사/지문 비중을 반영해 분량을 상영 시간(분)으로 환산합니다. 대사 빠른 낭독, 지문 느린 진행으로 가중합니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const stats = analyzeLines(ctx.full || '')
      const words = totalWords(ctx)
      // 대사 ~150wpm(빠른 낭독), 지문/액션 ~130wpm(느린 진행)로 가중.
      const classified = stats.dialogueWords + stats.actionWords
      let minutes: number
      if (classified > 0) {
        const dMin = safeDiv(stats.dialogueWords, 150)
        const aMin = safeDiv(stats.actionWords, 130)
        // 분류되지 못한 잔여 단어는 평균 140wpm 적용.
        const rest = Math.max(0, words - classified)
        minutes = dMin + aMin + safeDiv(rest, 140)
      } else {
        minutes = safeDiv(words, 140)
      }
      const mins = Math.round(minutes * 10) / 10
      // 표준 장편 90~120분 기준 게이지(상한 150분).
      const tier: Tier =
        words === 0 ? 'warn' : mins < 80 ? 'warn' : mins > 130 ? 'warn' : 'ok'
      const dialoguePct = Math.round(safeDiv(stats.dialogueWords, classified) * 100)
      return {
        kind: 'gauge',
        value: mins,
        min: 0,
        max: 150,
        unit: '분',
        label: words === 0 ? '원고 없음' : `약 ${mins}분 (${Math.floor(mins / 60)}시간 ${Math.round(mins % 60)}분)`,
        tier,
        note:
          words === 0
            ? '본문이 비어 있습니다. 슬러그라인/대사/지문을 입력하면 상영 시간을 추정합니다.'
            : `총 ${words.toLocaleString()}단어 · 대사 ${stats.dialogueWords.toLocaleString()}단어(${dialoguePct}%) · 지문 ${stats.actionWords.toLocaleString()}단어. 표준 장편 90~120분 기준.`,
      }
    },
  },

  // 2) 슬러그라인 린트 ──────────────────────────────────────────
  {
    id: 'sc-slugline',
    name: '슬러그라인 린트',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '장면 헤딩(INT./EXT. + 장소 + 시간대) 형식을 검사합니다. 시간대 누락·소문자·장소 누락을 잡아냅니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const items: { text: string; sub?: string; tier?: Tier; sceneId?: string }[] = []
      const scan = (text: string, sceneId: string | undefined, sceneLabel: string) => {
        const lines = (text || '').split(/\n/)
        lines.forEach((raw) => {
          const line = raw.trim()
          if (!line || !SLUG_HEAD_RE.test(line)) return
          const problems: string[] = []
          // 형식: PREFIX. LOCATION - TIME
          const prefixM = line.match(SLUG_HEAD_RE)
          const prefix = prefixM ? prefixM[0].trim() : ''
          // 대문자 권장(한글 제외)
          if (!hasKorean(line) && line !== line.toUpperCase()) {
            problems.push('대문자 권장(영문 슬러그라인은 전체 대문자)')
          }
          // 구분 기호 - 또는 — 로 시간대 분리 권장
          if (!/[-–—]/.test(line)) {
            problems.push('장소와 시간대를 " - "로 구분 권장')
          }
          // 시간대 키워드 존재?
          if (!TIME_RE.test(line)) {
            problems.push('시간대(DAY/NIGHT/낮/밤 등) 누락')
          }
          // 장소(접두 이후 텍스트) 존재?
          // 접두 뒤 선행 구두점/공백 제거. 하이픈은 범위 오해 방지 위해 클래스 끝에 배치.
          const afterPrefix = line.slice(prefix.length).replace(/^[\s.:–—-]+/, '').trim()
          const locOnly = afterPrefix.replace(TIME_RE, '').replace(/[–—-]/g, '').trim()
          if (!locOnly) {
            problems.push('장소 표기 누락')
          }
          const tier: Tier = problems.length === 0 ? 'ok' : problems.length >= 2 ? 'bad' : 'warn'
          items.push({
            text: line.length > 60 ? line.slice(0, 57) + '…' : line,
            sub: problems.length ? `${sceneLabel} · ${problems.join(' / ')}` : `${sceneLabel} · 형식 정상`,
            tier,
            sceneId,
          })
        })
      }
      if (ctx.scenes.length) {
        ctx.scenes.forEach((sc) => scan(sc.text, sc.id, sc.title || `장면 ${sc.index + 1}`))
      } else {
        scan(ctx.full || '', undefined, '원고')
      }
      const bad = items.filter((i) => i.tier === 'bad').length
      const warn = items.filter((i) => i.tier === 'warn').length
      return {
        kind: 'list',
        items,
        empty: '슬러그라인(INT./EXT. 또는 실내/실외로 시작하는 장면 헤딩)을 찾지 못했습니다. 장면 헤딩을 추가해 보세요.',
        note: items.length
          ? `슬러그라인 ${items.length}개 · 오류 ${bad} · 경고 ${warn} · 정상 ${items.length - bad - warn}`
          : undefined,
      }
    },
  },

  // 3) 액션/대사 비율 페이싱 ────────────────────────────────────
  {
    id: 'sc-action-dialogue',
    name: '액션·대사 페이싱',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '장면별 대사 대 지문 비율을 막대로 봅니다. 대사가 0%(지문만)이거나 95% 이상(대사 과잉)이면 표시합니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const rows: { label: string; value: number; max?: number; sub?: string; tier?: Tier; sceneId?: string }[] = []
      const src = ctx.scenes.length
        ? ctx.scenes.map((sc) => ({ id: sc.id, label: sc.title || `장면 ${sc.index + 1}`, text: sc.text }))
        : [{ id: undefined as string | undefined, label: '원고', text: ctx.full || '' }]
      src.forEach((s) => {
        const st = analyzeLines(s.text)
        const total = st.dialogueWords + st.actionWords
        if (total === 0) {
          rows.push({ label: s.label, value: 0, max: 100, sub: '대사/지문 없음', tier: 'warn', sceneId: s.id })
          return
        }
        const dPct = Math.round(safeDiv(st.dialogueWords, total) * 100)
        let tier: Tier = 'ok'
        let hint = ''
        if (dPct === 0) {
          tier = 'warn'
          hint = ' · 지문만(대사 없음)'
        } else if (dPct >= 95) {
          tier = 'warn'
          hint = ' · 대사 과잉(지문 거의 없음)'
        } else if (dPct >= 30 && dPct <= 75) {
          tier = 'ok'
        }
        rows.push({
          label: s.label,
          value: dPct,
          max: 100,
          sub: `대사 ${dPct}% / 지문 ${100 - dPct}%${hint}`,
          tier,
          sceneId: s.id,
        })
      })
      const avg = rows.length ? Math.round(safeDiv(rows.reduce((a, r) => a + r.value, 0), rows.length)) : 0
      return {
        kind: 'bars',
        rows,
        note: rows.length
          ? `장면 ${rows.length}개 · 평균 대사 비율 ${avg}% (막대=대사 비율). 균형 권장대 30~75%.`
          : '분석할 장면이 없습니다.',
      }
    },
  },

  // 4) 캐릭터별 대사 분량 ──────────────────────────────────────
  {
    id: 'sc-character-lines',
    name: '캐릭터 대사 분량',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '대문자/콜론 화자 패턴으로 캐릭터별 대사량을 집계합니다. 100단어 초과 모놀로그는 경고합니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const st = analyzeLines(ctx.full || '')
      const entries = Array.from(st.speakers.entries())
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
      if (entries.length === 0) {
        return {
          kind: 'bars',
          rows: [],
          note:
            '화자(대문자 이름 또는 "이름:" 형식)를 찾지 못했습니다. 대사 앞에 화자명을 표기하면 캐릭터별 분량을 집계합니다.',
        }
      }
      const maxW = entries[0][1] || 1
      const totalDlg = entries.reduce((a, [, w]) => a + w, 0)
      const monoBy = new Map<string, number>()
      st.monologues.forEach((m) => monoBy.set(m.speaker, Math.max(monoBy.get(m.speaker) ?? 0, m.words)))
      const rows = entries.slice(0, 20).map(([name, w]) => {
        const pct = Math.round(safeDiv(w, totalDlg) * 100)
        const mono = monoBy.get(name)
        const tier: Tier = mono ? 'warn' : 'ok'
        return {
          label: name,
          value: w,
          max: maxW,
          sub: mono
            ? `${w}단어 (${pct}%) · 모놀로그 ${mono}단어 경고`
            : `${w}단어 (${pct}%)`,
          tier,
        }
      })
      const monoCount = st.monologues.length
      return {
        kind: 'bars',
        rows,
        note: `화자 ${entries.length}명 · 총 대사 ${totalDlg.toLocaleString()}단어${
          monoCount ? ` · 100단어 초과 모놀로그 ${monoCount}건(분량 분할 검토)` : ''
        }${entries.length > 20 ? ' · 상위 20명만 표시' : ''}`,
      }
    },
  },

  // 5) 막/시퀀스 구조 패널 ─────────────────────────────────────
  {
    id: 'sc-act-structure',
    name: '막·시퀀스 구조',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '전체 분량을 3막(25/50/25%)·8시퀀스로 나눠 현재 장면들이 어느 구간에 놓이는지 점검합니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const scenes = ctx.scenes
      const words = totalWords(ctx)
      if (words === 0 || scenes.length === 0) {
        return {
          kind: 'sections',
          sections: [
            { heading: '1막 — 설정 (목표 25%)', items: ['장면 없음'] },
            { heading: '2막 — 대립 (목표 50%)', items: ['장면 없음'] },
            { heading: '3막 — 해결 (목표 25%)', items: ['장면 없음'] },
          ],
          note: '원고가 비어 있습니다. 장면을 추가하면 3막 구조 분포를 보여줍니다.',
        }
      }
      // 누적 단어 위치로 각 장면을 막에 배치.
      let cum = 0
      const act1: string[] = []
      const act2: string[] = []
      const act3: string[] = []
      const act1Words = [0, 0]
      const act2Words = [0, 0]
      const act3Words = [0, 0]
      scenes.forEach((sc) => {
        const w = sc.words || wordTokens(sc.text).length
        const mid = cum + w / 2
        const pos = safeDiv(mid, words)
        const label = `${sc.title || `장면 ${sc.index + 1}`} (${w.toLocaleString()}단어)`
        if (pos < 0.25) {
          act1.push(label)
          act1Words[0] += w
        } else if (pos < 0.75) {
          act2.push(label)
          act2Words[0] += w
        } else {
          act3.push(label)
          act3Words[0] += w
        }
        cum += w
      })
      const pct = (n: number) => Math.round(safeDiv(n, words) * 100)
      const fmt = (arr: string[], wsum: number, target: number) => {
        const p = pct(wsum)
        const head = `현재 ${p}% / 목표 ${target}% · 장면 ${arr.length}개`
        return arr.length ? [head, ...arr] : [head, '(이 구간에 배치된 장면 없음)']
      }
      const note =
        `1막 ${pct(act1Words[0])}% · 2막 ${pct(act2Words[0])}% · 3막 ${pct(act3Words[0])}% ` +
        '(권장 25/50/25). 막 중반(2막)이 절반 분량을 차지하는 것이 이상적입니다.'
      return {
        kind: 'sections',
        sections: [
          { heading: '1막 — 설정 (목표 25%)', items: fmt(act1, act1Words[0], 25) },
          { heading: '2막 — 대립 (목표 50%)', items: fmt(act2, act2Words[0], 50) },
          { heading: '3막 — 해결 (목표 25%)', items: fmt(act3, act3Words[0], 25) },
        ],
        note,
      }
    },
  },

  // 6) 씬 수 / 평균 길이 ───────────────────────────────────────
  {
    id: 'sc-scene-count',
    name: '씬 수·평균 길이',
    kind: '시나리오',
    scope: 'manuscript',
    intro: '장면 수와 길이 분포(평균/최장/최단)를 요약합니다. 장면당 단어 수로 페이싱을 가늠합니다.',
    run: (ctx: AnalyzerContext): AnalyzerResult => {
      const scenes = ctx.scenes
      if (scenes.length === 0) {
        return {
          kind: 'stat',
          stats: [
            { label: '장면 수', value: '0', tier: 'warn' },
            { label: '총 단어', value: '0' },
            { label: '평균 길이', value: '-' },
            { label: '최장 장면', value: '-' },
            { label: '최단 장면', value: '-' },
          ],
          note: '원고에 장면이 없습니다. 텍스트 문서를 추가하면 장면 통계를 집계합니다.',
        }
      }
      const counts = scenes.map((s) => ({
        title: s.title || `장면 ${s.index + 1}`,
        w: s.words || wordTokens(s.text).length,
      }))
      const total = counts.reduce((a, c) => a + c.w, 0)
      const avg = Math.round(safeDiv(total, counts.length))
      const longest = counts.reduce((a, c) => (c.w > a.w ? c : a), counts[0])
      const shortest = counts.reduce((a, c) => (c.w < a.w ? c : a), counts[0])
      const slugTotal = scenes.reduce((a, s) => a + analyzeLines(s.text).slugCount, 0)
      // 장면당 평균 단어로 페이싱 티어(영화 한 씬 보통 100~400단어).
      const avgTier: Tier = avg === 0 ? 'warn' : avg > 800 ? 'warn' : 'ok'
      return {
        kind: 'stat',
        stats: [
          { label: '장면 수', value: scenes.length.toLocaleString() },
          { label: '슬러그라인', value: slugTotal.toLocaleString() },
          { label: '총 단어', value: total.toLocaleString() },
          { label: '평균 길이', value: `${avg.toLocaleString()}단어`, tier: avgTier },
          { label: '최장 장면', value: `${longest.w.toLocaleString()}단어 (${truncate(longest.title)})` },
          { label: '최단 장면', value: `${shortest.w.toLocaleString()}단어 (${truncate(shortest.title)})` },
        ],
        note: `장면당 평균 ${avg.toLocaleString()}단어. 짧고 많은 장면은 빠른 페이싱, 길고 적은 장면은 느린 호흡을 만듭니다.`,
      }
    },
  },
]

/** 라벨 축약(긴 제목 통계 표시용). */
function truncate(s: string, n = 16): string {
  const t = (s || '').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t || '제목 없음'
}

// 미사용 import 방지: 일부 헬퍼는 향후 확장/일관성 위해 보존(트리쉐이킹 대상).
void splitSentences
void splitParagraphs
void charsNoSpace
void (null as unknown as BinderItem)
