// 창작 분석 엔진 단위 테스트. 실행: node --experimental-strip-types src/creative/creative.test.ts
import type { Scene } from './scenes'
import {
  scanCliches, sensoryBalance, dialogueRatio, crutchWords, filterWords, tellingMarkers,
  saidBookism, repeatedOpeners, sentenceRhythm, pacing, perSceneReadability, adverbDensity,
} from './prose.ts'
import {
  charactersOf, nameConfusion, characterPresence, relationshipGraph, codexMentions,
  chapterBalance, povDistribution, emotionArc, timeline,
} from './structure.ts'
import {
  translationese, doublePassive, redundancy, koreanSpelling, sentenceEndings,
  repeatedPhrases, paragraphStats, sceneHooks, sceneOutline, sentenceTypes, numberConsistency, emotionDensity,
} from './checks.ts'
import {
  gestureCrutch, bodyPartAutonomy, connectiveStart, simileDensity, commaRunon, adverbDialogueTags,
  timeMarkers, onomatopoeiaDensity, commonPredicates, demonstratives, nominalEnding, interjectionDensity,
  echoWords, paragraphOpenerVariety, dialogueLength,
} from './checks2.ts'
import { speechLevelConsistency, episodeLength, hedging } from './checks3.ts'

let pass = 0, fail = 0
function ok(cond: boolean, msg: string) { if (cond) pass++; else { fail++; console.error('  ✗ FAIL: ' + msg) } }

function mkScene(title: string, text: string, opts: Partial<{ words: number; chapterId: string; chapterTitle: string; customMeta: Record<string, string>; type: string }> = {}): Scene {
  return {
    id: 't-' + title, title, text,
    words: opts.words ?? (text.match(/[\p{L}\p{N}]+/gu) || []).length,
    index: 0, chapterId: opts.chapterId ?? null, chapterTitle: opts.chapterTitle ?? '(장 없음)',
    item: { id: 't-' + title, type: opts.type ?? 'text', title, customMeta: opts.customMeta ?? {} } as never,
  }
}

// 클리셰
{
  const r = scanCliches([mkScene('s1', '그 순간 심장이 쿵쾅거렸다. His heart pounded loudly.')])
  ok(r.total >= 2, 'cliche detects KO + EN')
  ok(r.hits.some((h) => h.phrase.includes('심장이 쿵')), 'cliche lists phrase')
}
// 오감
{
  const r = sensoryBalance([mkScene('s', '빛이 환하게 보였다. 색깔이 반짝였다. 시선을 돌렸다.')])
  ok(r.totals.find((t) => t.key === 'sight')!.count > 0, 'sensory detects sight')
  ok(typeof r.weakest === 'string', 'sensory weakest present')
}
// 대사 비율
{
  const r = dialogueRatio([mkScene('s', '그가 말했다. "안녕하세요, 반갑습니다." 그녀는 고개를 끄덕였다.')])
  ok(r.overallPct > 0 && r.overallPct <= 100, 'dialogue ratio in range')
  ok(r.perScene[0].lines >= 1, 'dialogue line counted')
}
// 필러/필터/텔링
{
  ok(crutchWords([mkScene('s', '그냥 정말 너무 갑자기 그냥 그냥')]).items.some((i) => i.word === '그냥'), 'crutch words')
  ok(filterWords([mkScene('s', '그는 그것을 느꼈다. She saw the door and felt cold.')]).items.length > 0, 'filter words')
  ok(tellingMarkers([mkScene('s', '그녀는 화가 났다. He was sad.')]).items.length > 0, 'telling markers')
}
// 화자표지
{
  const r = saidBookism([mkScene('s', '"가자," 그가 said. "안 돼," she exclaimed. He said again.')])
  ok(r.said >= 2 && r.fancyTotal >= 1, 'said-bookism counts')
}
// 반복 시작
{
  const r = repeatedOpeners([mkScene('s', '그는 갔다.\n그는 왔다.\n그는 먹었다.\n그는 잤다.')])
  ok(r.repeats.some((x) => x.opener === '그는' && x.count >= 4), 'repeated openers')
  ok(r.consecutive.length > 0, 'consecutive opener run detected')
}
// 문장 리듬
{
  const mono = '하나 둘 셋 넷 다섯.\n하나 둘 셋 넷 다섯.\n하나 둘 셋 넷 다섯.\n하나 둘 셋 넷 다섯.\n하나 둘 셋 넷 다섯.\n하나 둘 셋 넷 다섯.'
  ok(sentenceRhythm([mkScene('s', mono)]).perScene[0].monotony, 'rhythm monotony flagged')
}
// 페이싱
{
  const r = pacing([mkScene('a', 'x', { words: 100 }), mkScene('b', 'y', { words: 5000 }), mkScene('c', 'z', { words: 800 })])
  ok(r.scenes.some((s) => s.tier === 'long'), 'pacing long tier')
}
// 가독성
{
  ok(perSceneReadability([mkScene('s', '짧은 문장이다. 또 짧다.')]).perScene[0].score >= 0, 'readability score')
}
// 부사 밀도
{
  ok(adverbDensity([mkScene('s', 'She quickly ran and softly spoke gently.', { words: 8 })]).total >= 3, 'adverb -ly density')
}

// ---- 구조 ----
const proj = {
  items: {
    'root-research': { id: 'root-research', type: 'folder', title: 'Research', childIds: ['c1', 'c2', 'loc1'], customMeta: {} },
    c1: { id: 'c1', type: 'character', title: '아린', childIds: [], customMeta: {} },
    c2: { id: 'c2', type: 'character', title: '아람', childIds: [], customMeta: {} },
    loc1: { id: 'loc1', type: 'text', title: '왕국', childIds: [], customMeta: {} },
  },
} as never
{
  const chars = charactersOf(proj)
  ok(chars.length === 2, 'charactersOf finds 2 characters')
  const conf = nameConfusion(chars)
  ok(conf.some((p) => (p.a === '아린' && p.b === '아람') || (p.a === '아람' && p.b === '아린')), 'name confusion 아린/아람')

  const scenes = [
    mkScene('s1', '아린은 왕국으로 갔다. 아람도 함께였다.'),
    mkScene('s2', '아린은 혼자 있었다.'),
    mkScene('s3', '아람이 돌아왔다.'),
  ]
  const pres = characterPresence(scenes, chars)
  ok(pres.characters.find((c) => c.name === '아린')!.total === 2, 'presence 아린 in 2 scenes')
  const rel = relationshipGraph(scenes, chars)
  ok(rel.edges.some((e) => e.weight >= 1), 'relationship co-occurrence edge')
  const codex = codexMentions(proj, scenes)
  ok(codex.find((e) => e.name === '왕국')!.mentions >= 1, 'codex mention 왕국')
}
// 장 균형
{
  const r = chapterBalance([
    mkScene('a', 'x', { words: 100, chapterId: 'ch1', chapterTitle: '1장' }),
    mkScene('b', 'y', { words: 5000, chapterId: 'ch2', chapterTitle: '2장' }),
  ])
  ok(r.chapters.length === 2, 'chapter balance groups by chapter')
}
// POV / 감정 / 타임라인 (customMeta)
{
  const scenes = [
    mkScene('s1', 'a', { customMeta: { pov: '아린', mood: '2', storyTime: '2' } }),
    mkScene('s2', 'b', { customMeta: { pov: '아린', mood: '-3', storyTime: '1' } }),
  ]
  ok(povDistribution(scenes).distribution[0].pov === '아린', 'pov distribution')
  ok(emotionArc(scenes)[0].mood === 2, 'emotion arc parses mood')
  ok(timeline(scenes).outOfOrder > 0, 'timeline detects out-of-order')
}

// ---- 실전 점검(checks) ----
{
  ok(translationese([mkScene('s', '그것은 시스템에 의해 처리되었다. 문제에 대하여 논의했다.')]).total >= 2, 'translationese detects 의해/대하여')
  ok(doublePassive([mkScene('s', '그 일은 잊혀지고 보여지지 않았다.')]).total >= 2, 'double passive detects 잊혀/보여지')
  ok(redundancy([mkScene('s', '역전 앞에서 미리 예약을 했다.')]).total >= 2, 'redundancy detects 역전 앞/미리 예약')
  ok(koreanSpelling([mkScene('s', '이게 잘 됬어? 역활이 뭐야.')]).items.some((i) => i.show === '됬'), 'spelling flags 됬')
  const se = sentenceEndings([mkScene('s', '갔다. 왔다. 먹었다. 잤다. 울었다.')])
  ok(se.dist.length > 0, 'sentence endings distribution')
  ok(repeatedPhrases([mkScene('s', '그는 천천히 고개를 들었다.\n그는 천천히 고개를 들었다.')], 4).items.length > 0, 'repeated phrases (4-gram)')
  ok(paragraphStats([mkScene('s', 'a b c.\n\nd e f g h.')]).perScene[0].count === 2, 'paragraph stats counts paragraphs')
  ok(sceneHooks([mkScene('s', '첫 문장이다. 끝 문장이다.')]).scenes[0].first.includes('첫'), 'scene hooks first sentence')
  ok(sceneOutline([mkScene('s', '내용.', { customMeta: {} })]).scenes.length === 1, 'scene outline')
  const st = sentenceTypes([mkScene('s', '정말? 좋아! 그래.')])
  ok(st.question >= 1 && st.exclaim >= 1, 'sentence types question/exclaim')
  ok(typeof numberConsistency([mkScene('s', '3명이 왔고 다섯 명이 갔다.')]).arabic === 'number', 'number consistency')
  ok(emotionDensity([mkScene('s', '사랑과 분노와 슬픔이 가득했다.')]).total >= 3, 'emotion density')
}

// ---- 추가 점검(checks2) ----
{
  ok(gestureCrutch([mkScene('s', '그는 고개를 끄덕였다. 그녀는 미소를 지었다. 한숨을 쉬었다.')]).total >= 3, 'gesture crutch')
  ok(bodyPartAutonomy([mkScene('s', '그녀의 눈이 커졌다. 시선이 흔들렸다.')]).total >= 1, 'body part autonomy')
  ok(connectiveStart([mkScene('s', '그리고 그는 갔다. 그러나 늦었다. 하지만 괜찮았다.')]).total >= 3, 'connective start')
  ok(simileDensity([mkScene('s', '바람처럼 빨랐고 그림자같이 조용했다.')]).total >= 2, 'simile density')
  ok(commaRunon([mkScene('s', '그는, 천천히, 아주, 조심스럽게, 문을, 열었다.')]).total >= 1, 'comma run-on')
  ok(adverbDialogueTags([mkScene('s', '"가자"라고 그는 차갑게 말했다.')]).total >= 1, 'adverb dialogue tag')
  ok(timeMarkers([mkScene('s', '갑자기 문이 열렸다. 잠시 후 그가 왔다.')]).total >= 2, 'time markers')
  ok(onomatopoeiaDensity([mkScene('s', '쿵 소리가 났다. 가슴이 두근거렸다.')]).total >= 2, 'onomatopoeia')
  ok(commonPredicates([mkScene('s', '달렸다. 달렸다. 달렸다. 멈췄다.')]).items.some((i) => i.label === '달렸다'), 'common predicates')
  ok(demonstratives([mkScene('s', '그 사람과 그것과 이런 일.')]).total >= 1, 'demonstratives')
  ok(typeof nominalEnding([mkScene('s', '확인함. 점검함. 종료됨.')]).total === 'number', 'nominal ending')
  ok(typeof interjectionDensity([mkScene('s', '"헉, 진짜?" 그가 외쳤다.')]).total === 'number', 'interjection density')
  ok(echoWords([mkScene('s', '나무 아래 나무 그늘에서 나무 향기가 났다')], 30).items.some((i) => i.word === '나무'), 'echo words')
  ok(paragraphOpenerVariety([mkScene('s', '그는 갔다.\n그는 왔다.\n그는 먹었다.')]).perScene[0].ratio < 100, 'opener variety low')
  ok(typeof dialogueLength([mkScene('s', '"안녕." 그가 말했다.')]).avg === 'number', 'dialogue length')
}

// ---- 리서치 기반(checks3) ----
{
  const sl = speechLevelConsistency([mkScene('s', '"안녕하세요, 잘 지내셨어요?" "응, 나는 잘 지냈어."')])
  ok(sl.jondae >= 1 && sl.banmal >= 1, 'speech level detects 존댓말+반말')
  const el = episodeLength([mkScene('s', '가'.repeat(100))])
  ok(el.perScene[0].tier === 'short', 'episode length short tier')
  ok(hedging([mkScene('s', '그런 것 같다. 아마 맞을 듯하다.')]).total >= 2, 'hedging detects 것같다/듯')
}

console.log(`\n창작 엔진 테스트: ${pass} 통과 / ${fail} 실패`)
declare const process: { exit(code: number): never }
if (fail > 0) process.exit(1)
