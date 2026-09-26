// 리서치 기반 추가 점검(한국어/웹소설 특화): 존댓말·반말 일관성, 회차 분량, 추측/완충 표현.
import type { Scene } from './scenes'
import { extractDialogue, wordTokens } from './text.ts'
import type { FreqResult } from './checks2.ts'

// ---------- 1) 존댓말 / 반말 일관성 ----------
const JONDAE = [/요[.!?…"'”’」』)\s]*$/, /(습니다|습니까|십시오|세요|시오|어요|아요|에요|네요|군요|는데요|까요|을까요|ㄹ까요|시죠|지요|죠)[.!?…"'”’」』)\s]*$/]
const BANMAL = [/(다|야|어|지|까|니|래|자|거든|는데|구나|군|냐|마|렴|렷|어라|아라|단다|잖아|는걸|는데|는다)[.!?…"'”’」』)\s]*$/]
function classifyLine(line: string): 'jondae' | 'banmal' | null {
  const t = line.trim()
  if (JONDAE.some((re) => re.test(t))) return 'jondae'
  if (BANMAL.some((re) => re.test(t))) return 'banmal'
  return null
}
export interface SpeechLevelResult {
  jondae: number
  banmal: number
  perScene: { id: string; title: string; jondae: number; banmal: number; mixed: boolean }[]
}
export function speechLevelConsistency(scenes: Scene[]): SpeechLevelResult {
  let jondae = 0, banmal = 0
  const perScene = scenes.map((sc) => {
    let j = 0, b = 0
    for (const d of extractDialogue(sc.text)) {
      const cls = classifyLine(d)
      if (cls === 'jondae') j++
      else if (cls === 'banmal') b++
    }
    jondae += j; banmal += b
    const total = j + b
    // 한 장면에서 존댓말·반말이 모두 30% 이상이면 화법 혼용 가능성 → 점검 권장
    const mixed = total >= 4 && Math.min(j, b) / total >= 0.3
    return { id: sc.id, title: sc.title, jondae: j, banmal: b, mixed }
  })
  return { jondae, banmal, perScene }
}

// ---------- 2) 회차/장면 분량 (웹소설 기준) ----------
export interface EpisodeLenResult {
  perScene: { id: string; title: string; chars: number; charsNoSpace: number; tier: 'short' | 'ok' | 'long' }[]
  min: number
  max: number
  avg: number
}
export function episodeLength(scenes: Scene[], target = { min: 3000, max: 5500 }): EpisodeLenResult {
  const perScene = scenes.map((sc) => {
    const chars = sc.text.length
    const charsNoSpace = sc.text.replace(/\s/g, '').length
    const tier: 'short' | 'ok' | 'long' = chars < target.min ? 'short' : chars > target.max ? 'long' : 'ok'
    return { id: sc.id, title: sc.title, chars, charsNoSpace, tier }
  })
  const counts = perScene.map((p) => p.chars)
  return {
    perScene,
    min: counts.length ? Math.min(...counts) : 0,
    max: counts.length ? Math.max(...counts) : 0,
    avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
  }
}

// ---------- 3) 추측·완충 표현(~것 같다 / ~듯 / 아마) ----------
const HEDGES = [
  { label: '~것 같다', re: /것\s?같[다은았였]/ }, { label: '~듯하다/~듯', re: /듯\s?(하|한|했|이)/ },
  { label: '~인 듯', re: /인\s?듯/ }, { label: '아마', re: /아마(도)?/ }, { label: '~지 않을까', re: /지\s?않을까/ },
  { label: '~려나/~ㄹ까', re: /([려]나|을까|ㄹ까)\s?(\?|싶|하)/ }, { label: '아무래도', re: /아무래도/ },
  { label: '~인 것만 같', re: /것만\s?같/ }, { label: '~성싶다', re: /성\s?싶/ }, { label: '왠지', re: /왠지/ },
]
export function hedging(scenes: Scene[]): FreqResult {
  const full = scenes.map((s) => s.text).join('\n')
  const words = wordTokens(full).length || 1
  const items = HEDGES
    .map(({ label, re }) => ({ label, count: (full.match(new RegExp(re.source, 'g')) || []).length }))
    .filter((x) => x.count > 0)
    .map((x) => ({ ...x, per1k: Math.round((x.count / words) * 1000 * 10) / 10 }))
    .sort((a, b) => b.count - a.count)
  return { items, total: items.reduce((n, i) => n + i.count, 0) }
}
