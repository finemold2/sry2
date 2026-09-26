// 창작 스튜디오 — 소설 쓰기에 특화된 분석/창작 도구 허브(20여 개 패널).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useModal } from './useModal'
import { useStore, internalLinksOf } from '../store/store'
import { sceneList, type Scene } from '../creative/scenes.ts'
import * as P from '../creative/prose.ts'
import * as S from '../creative/structure.ts'
import * as C from '../creative/checks.ts'
import * as C2 from '../creative/checks2.ts'
import * as C3 from '../creative/checks3.ts'
import { WORD_BANKS, GENERATORS, GUIDES } from '../creative/toolkit-registry.ts'
import { ANALYZERS } from '../creative/analyzer-registry.ts'
import { buildAnalyzerContext, type Analyzer, type AnalyzerResult, type Tier } from '../creative/analyzers.ts'
import { COMPOSERS } from '../creative/procgen-registry.ts'
import { roll, combinations, formatCombos, type Composer } from '../creative/procgen.ts'
import { rollMany, type WordBank, type Generator, type Guide } from '../creative/toolkit.ts'
import type { Project } from '../model'
import { Icon, iconForTool } from '../ui/icons'

type PanelProps = {
  scenes: Scene[]
  chars: S.CharacterRef[]
  project: Project
  jump: (id: string) => void
  setMeta: (id: string, key: string, value: string) => void
}

type ToolId =
  | 'dashboard' | 'cliche' | 'sensory' | 'dialogue' | 'crutch' | 'filter' | 'telling'
  | 'said' | 'openers' | 'rhythm' | 'pacing' | 'readability' | 'adverb'
  | 'chapter' | 'presence' | 'confusion' | 'relationship' | 'codex' | 'plotgrid' | 'docgraph'
  | 'sceneMeta' | 'pov' | 'emotion' | 'timeline'
  | 'trans' | 'passive' | 'redundancy' | 'spelling' | 'endings' | 'phrases'
  | 'paragraph' | 'hooks' | 'outline' | 'senttype' | 'numbers' | 'emodensity'
  | 'gesture' | 'bodyauto' | 'connective' | 'simile' | 'runon' | 'advtag' | 'timemark'
  | 'onomat' | 'predicate' | 'demonstr' | 'nominal' | 'interj' | 'echo' | 'openvar' | 'dlglen'
  | 'speechlevel' | 'epilen' | 'hedge'

const TOOLS: { group: string; items: { id: ToolId; name: string; icon: string }[] }[] = [
  { group: '개요', items: [{ id: 'dashboard', name: '원고 대시보드', icon: '📊' }] },
  {
    group: '문체·표현', items: [
      { id: 'cliche', name: '클리셰 감지', icon: '🚩' },
      { id: 'sensory', name: '오감 묘사 균형', icon: '🌈' },
      { id: 'dialogue', name: '대사 비율', icon: '💬' },
      { id: 'crutch', name: '버릇·군더더기 단어', icon: '🩼' },
      { id: 'filter', name: '필터(거리두기) 단어', icon: '🫧' },
      { id: 'telling', name: '말하기 vs 보여주기', icon: '🎭' },
      { id: 'said', name: '대사 지문(화자표지)', icon: '🗯' },
      { id: 'openers', name: '반복되는 문장 시작', icon: '🔁' },
      { id: 'rhythm', name: '문장 리듬', icon: '〰️' },
      { id: 'adverb', name: '부사 밀도', icon: '⚡' },
      { id: 'readability', name: '장면별 가독성', icon: '📖' },
    ],
  },
  {
    group: '구조·등장인물', items: [
      { id: 'pacing', name: '페이싱(장면 길이)', icon: '⏱' },
      { id: 'chapter', name: '장(章) 균형', icon: '⚖️' },
      { id: 'presence', name: '등장인물 등장 추적', icon: '👥' },
      { id: 'confusion', name: '이름 혼동 경고', icon: '⚠️' },
      { id: 'relationship', name: '인물 관계도', icon: '🕸' },
      { id: 'codex', name: '세계관 코덱스 멘션', icon: '📚' },
      { id: 'plotgrid', name: '플롯 그리드', icon: '🧩' },
      { id: 'docgraph', name: '문서 링크 그래프', icon: '🔗' },
    ],
  },
  {
    group: '장면 메타·아크', items: [
      { id: 'sceneMeta', name: '장면 메타 편집', icon: '🏷' },
      { id: 'pov', name: 'POV(시점) 분포', icon: '🎯' },
      { id: 'emotion', name: '감정 아크', icon: '💗' },
      { id: 'timeline', name: '스토리 타임라인', icon: '📅' },
    ],
  },
  {
    group: '문장 점검·교정', items: [
      { id: 'trans', name: '번역투 점검', icon: '🌐' },
      { id: 'passive', name: '이중피동 점검', icon: '🔄' },
      { id: 'redundancy', name: '겹말(군더더기)', icon: '♻️' },
      { id: 'spelling', name: '흔한 맞춤법', icon: '🔤' },
      { id: 'endings', name: '문장 끝맺음 다양성', icon: '🎵' },
      { id: 'phrases', name: '반복 구절', icon: '📋' },
      { id: 'paragraph', name: '문단 길이', icon: '📐' },
      { id: 'hooks', name: '장면 훅(첫·끝)', icon: '🪝' },
      { id: 'outline', name: '한 줄 아웃라인', icon: '📝' },
      { id: 'senttype', name: '문장 유형 분포', icon: '❓' },
      { id: 'numbers', name: '숫자 표기 일관성', icon: '🔢' },
      { id: 'emodensity', name: '감정 어휘 밀도', icon: '🌡️' },
    ],
  },
  {
    group: '추가 점검(고급)', items: [
      { id: 'gesture', name: '제스처 버릇', icon: '🤷' },
      { id: 'bodyauto', name: '신체 부위 주어', icon: '👁' },
      { id: 'connective', name: '문장 첫 접속사', icon: '🔗' },
      { id: 'simile', name: '직유 밀도', icon: '🪞' },
      { id: 'runon', name: '만연체(쉼표)', icon: '🐍' },
      { id: 'advtag', name: '부사 붙은 대사 지문', icon: '🗨' },
      { id: 'timemark', name: '시간 전환 표지', icon: '⏳' },
      { id: 'onomat', name: '의성어·의태어 밀도', icon: '💥' },
      { id: 'predicate', name: '자주 쓴 서술어', icon: '🔁' },
      { id: 'demonstr', name: '지시어 남용', icon: '👉' },
      { id: 'nominal', name: '명사형 종결', icon: '📎' },
      { id: 'interj', name: '감탄사·추임새', icon: '❗' },
      { id: 'echo', name: '메아리 단어', icon: '🔊' },
      { id: 'openvar', name: '문단 첫 단어 다양성', icon: '🎬' },
      { id: 'dlglen', name: '대사 길이 분포', icon: '📏' },
      { id: 'speechlevel', name: '존댓말·반말 일관성', icon: '🙇' },
      { id: 'epilen', name: '회차/장면 분량', icon: '📖' },
      { id: 'hedge', name: '추측·완충 표현', icon: '🤔' },
    ],
  },
]

// ---------- 공용 렌더 ----------
function Empty({ msg }: { msg: string }) {
  return <div style={{ color: 'var(--muted)', fontSize: 13, padding: '24px 4px' }}>{msg}</div>
}
function PanelHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="cs-head">
      <h3>{title}</h3>
      <p>{hint}</p>
    </div>
  )
}
function Bars({ rows }: { rows: { label: ReactNode; value: number; max: number; sub?: ReactNode; color?: string; onClick?: () => void }[] }) {
  return (
    <div className="cs-bars">
      {rows.map((r, i) => (
        <div key={i} className={'cs-bar-row' + (r.onClick ? ' clickable' : '')} onClick={r.onClick}>
          <div className="cs-bar-label">{r.label}</div>
          <div className="cs-bar-track">
            <div className="cs-bar-fill" style={{ width: `${r.max ? Math.round((r.value / r.max) * 100) : 0}%`, background: r.color || 'var(--accent)' }} />
          </div>
          <div className="cs-bar-val">{r.sub ?? r.value}</div>
        </div>
      ))}
    </div>
  )
}
const tierColor = (t: string) => (t === 'long' ? 'var(--warn)' : t === 'short' ? 'var(--accent-2)' : 'var(--ok)')

// ---------- 패널들 ----------
function DashboardPanel({ scenes, chars, project }: PanelProps) {
  const d = useMemo(() => {
    if (!scenes.length) return null
    const cliche = P.scanCliches(scenes).total
    const dlg = P.dialogueRatio(scenes).overallPct
    const sens = P.sensoryBalance(scenes)
    const pacingR = P.pacing(scenes)
    const longScenes = pacingR.scenes.filter((s) => s.tier === 'long').length
    const pov = S.povDistribution(scenes)
    const taggedPov = pov.sequence.filter((p) => p.pov !== '(미지정)').length
    const words = scenes.reduce((n, s) => n + s.words, 0)
    const said = P.saidBookism(scenes)
    return { cliche, dlg, sens, longScenes, pov, taggedPov, words, said, sceneCount: scenes.length, charCount: chars.length }
  }, [scenes, chars])
  if (!d) return <Empty msg="원고(Draft)에 글이 없습니다. 먼저 장면을 작성해 보세요." />
  const target = project.settings.projectTarget || 0
  const card = (label: string, value: ReactNode, note?: string) => (
    <div className="cs-card"><div className="cs-card-v">{value}</div><div className="cs-card-l">{label}</div>{note && <div className="cs-card-n">{note}</div>}</div>
  )
  return (
    <div>
      <PanelHead title="원고 대시보드" hint="원고의 건강 상태를 한눈에. 각 지표는 좌측 도구에서 자세히 볼 수 있습니다." />
      <div className="cs-cards">
        {card('장면', d.sceneCount)}
        {card('단어', d.words.toLocaleString(), target ? `목표 ${target.toLocaleString()} (${Math.round((d.words / target) * 100)}%)` : undefined)}
        {card('등장인물', d.charCount)}
        {card('대사 비율', d.dlg + '%')}
        {card('클리셰', d.cliche + '개', d.cliche > 0 ? '점검 권장' : '깨끗함')}
        {card('긴 장면', d.longScenes + '개', '페이싱 점검')}
        {card('가장 약한 감각', d.sens.weakest, '묘사 보강')}
        {card('POV 태그됨', `${d.taggedPov}/${d.sceneCount}`, '장면 메타에서 지정')}
        {card('화자표지 과다', d.said.ratio + '%', d.said.ratio > 30 ? "'said' 권장" : '양호')}
      </div>
    </div>
  )
}

function ClichePanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.scanCliches(scenes), [scenes])
  return (
    <div>
      <PanelHead title="클리셰 감지" hint="흔한 상투적 표현을 찾아냅니다. 꼭 나쁘진 않지만, 과하면 신선함을 해칩니다." />
      {r.total === 0 ? <Empty msg="감지된 클리셰가 없습니다. 👏" /> : (
        <>
          <div className="cs-note">총 <b>{r.total}</b>개 발견</div>
          <Bars rows={r.hits.map((h) => ({ label: h.phrase, value: h.count, max: r.hits[0].count, sub: `${h.count}회 · ${h.scenes.length}개 장면`, color: 'var(--warn)' }))} />
          <h4 className="cs-sub">장면별</h4>
          {r.perScene.filter((s) => s.count > 0).map((s) => (
            <div key={s.id} className="cs-line clickable" onClick={() => jump(s.id)}>{s.title} <span className="cs-tag warn">{s.count}</span></div>
          ))}
        </>
      )}
    </div>
  )
}

function SensoryPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.sensoryBalance(scenes), [scenes])
  const max = Math.max(1, ...r.totals.map((t) => t.count))
  return (
    <div>
      <PanelHead title="오감 묘사 균형" hint="시각에 치우치기 쉽습니다. 청각·후각·미각·촉각을 더해 몰입감을 높여보세요." />
      <Bars rows={r.totals.map((t) => ({ label: `${t.icon} ${t.label}`, value: t.count, max, sub: `${t.count} (${t.pct}%)` }))} />
      <div className="cs-note">가장 적게 쓴 감각: <b>{r.weakest}</b></div>
      <h4 className="cs-sub">장면별 부족 감각</h4>
      {r.perScene.map((s) => (
        <div key={s.id} className="cs-line clickable" onClick={() => jump(s.id)}>
          {s.title}
          {s.missing.length > 0 && <span className="cs-tag">{s.missing.map((m) => r.totals.find((t) => t.key === m)?.icon).join(' ')} 없음</span>}
        </div>
      ))}
    </div>
  )
}

function DialoguePanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.dialogueRatio(scenes), [scenes])
  return (
    <div>
      <PanelHead title="대사 비율" hint="대사와 서술의 균형. 장면마다 적절한 리듬이 있는지 확인하세요." />
      <div className="cs-note">전체 대사 비율 <b>{r.overallPct}%</b></div>
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.dialoguePct, max: 100, sub: `${s.dialoguePct}% · ${s.lines}줄`, onClick: () => jump(s.id), color: s.dialoguePct > 70 ? 'var(--accent-2)' : 'var(--accent)' }))} />
    </div>
  )
}

function WordListPanel({ scenes, title, hint, fn }: PanelProps & { title: string; hint: string; fn: (s: Scene[]) => P.WordCountResult }) {
  const r = useMemo(() => fn(scenes), [scenes, fn])
  return (
    <div>
      <PanelHead title={title} hint={hint} />
      {r.items.length === 0 ? <Empty msg="해당 표현이 거의 없습니다. 👍" /> : (
        <Bars rows={r.items.slice(0, 25).map((i) => ({ label: i.word, value: i.count, max: r.items[0].count, sub: `${i.count}회 (1천 단어당 ${i.per1k})` }))} />
      )}
    </div>
  )
}

function SaidPanel({ scenes }: PanelProps) {
  const r = useMemo(() => P.saidBookism(scenes), [scenes])
  return (
    <div>
      <PanelHead title="대사 지문(화자표지)" hint="'말했다/said'는 대체로 투명해서 좋습니다. 화려한 지문이 과하면 눈에 거슬립니다." />
      <div className="cs-note">기본 지문(말했다/said 등) <b>{r.said}</b>회 · 화려한 지문 <b>{r.fancyTotal}</b>회 · 화려한 비율 <b className={r.ratio > 30 ? 'warn-text' : ''}>{r.ratio}%</b></div>
      {r.fancy.length === 0 ? <Empty msg="화려한 화자표지가 없습니다." /> : (
        <Bars rows={r.fancy.map((f) => ({ label: f.word, value: f.count, max: r.fancy[0].count, color: 'var(--warn)' }))} />
      )}
    </div>
  )
}

function OpenersPanel({ scenes }: PanelProps) {
  const r = useMemo(() => P.repeatedOpeners(scenes), [scenes])
  return (
    <div>
      <PanelHead title="반복되는 문장 시작" hint="여러 문장이 같은 단어로 시작하면 단조롭게 느껴집니다('그는… 그는…')." />
      {r.consecutive.length > 0 && (
        <>
          <h4 className="cs-sub">연속 반복(주의)</h4>
          {r.consecutive.map((c, i) => <div key={i} className="cs-line"><span className="cs-tag warn">{c.opener} ×{c.run} 연속</span> {c.scene}</div>)}
        </>
      )}
      <h4 className="cs-sub">자주 쓴 첫 단어</h4>
      {r.repeats.length === 0 ? <Empty msg="특별히 반복되는 문장 시작이 없습니다." /> : (
        <Bars rows={r.repeats.map((x) => ({ label: x.opener, value: x.count, max: r.repeats[0].count }))} />
      )}
    </div>
  )
}

function RhythmPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.sentenceRhythm(scenes), [scenes])
  return (
    <div>
      <PanelHead title="문장 리듬" hint="문장 길이가 비슷하면 단조롭습니다. 긴 문장과 짧은 문장을 섞으면 리듬이 살아납니다." />
      <div className="cs-note">전체 평균 문장 길이 <b>{r.overallAvg}</b>단어</div>
      {r.perScene.map((s) => {
        const max = Math.max(1, ...s.lengths)
        return (
          <div key={s.id} className="cs-rhythm clickable" onClick={() => jump(s.id)}>
            <div className="cs-rhythm-title">{s.title} {s.monotony && <span className="cs-tag warn">단조로움</span>} <span className="cs-muted">평균 {s.avg}</span></div>
            <div className="cs-spark">
              {s.lengths.slice(0, 80).map((l, i) => <div key={i} className="cs-spark-bar" style={{ height: `${Math.max(8, (l / max) * 100)}%`, background: l > 35 ? 'var(--warn)' : 'var(--accent)' }} title={`${l} 단어`} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PacingPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.pacing(scenes), [scenes])
  const max = Math.max(1, ...r.scenes.map((s) => s.words))
  return (
    <div>
      <PanelHead title="페이싱(장면 길이)" hint="너무 긴/짧은 장면을 표시합니다. 의도된 리듬인지 확인하세요." />
      <div className="cs-note">중앙값 <b>{r.median.toLocaleString()}</b> · 평균 <b>{r.avg.toLocaleString()}</b> 단어</div>
      <Bars rows={r.scenes.map((s) => ({ label: <>{s.title} {s.tier !== 'normal' && <span className={'cs-tag ' + (s.tier === 'long' ? 'warn' : '')}>{s.tier === 'long' ? '긺' : '짧음'}</span>}</>, value: s.words, max, sub: s.words.toLocaleString(), color: tierColor(s.tier), onClick: () => jump(s.id) }))} />
    </div>
  )
}

function ReadabilityPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.perSceneReadability(scenes), [scenes])
  return (
    <div>
      <PanelHead title="장면별 가독성" hint="문장이 길고 복잡할수록 읽기 어렵습니다. 어려운 장면이 의도된 것인지 점검하세요." />
      <Bars rows={r.perScene.map((s) => ({ label: <>{s.title} <span className="cs-muted">{s.grade}</span></>, value: Math.max(0, s.score), max: 100, sub: `${s.score} · 평균문장 ${s.avgSentence}`, color: s.score >= 60 ? 'var(--ok)' : s.score >= 35 ? 'var(--accent)' : 'var(--warn)', onClick: () => jump(s.id) }))} />
    </div>
  )
}

function AdverbPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => P.adverbDensity(scenes), [scenes])
  const max = Math.max(1, ...r.perScene.map((s) => s.per1k))
  return (
    <div>
      <PanelHead title="부사 밀도" hint="부사(-ly, 천천히 등)에 기대기보다 강한 동사를 쓰면 문장이 단단해집니다." />
      <div className="cs-note">전체 부사 <b>{r.total}</b>개</div>
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.per1k, max, sub: `${s.count}개 (1천 단어당 ${s.per1k})`, color: s.per1k > 25 ? 'var(--warn)' : 'var(--accent)', onClick: () => jump(s.id) }))} />
    </div>
  )
}

function ChapterPanel({ scenes }: PanelProps) {
  const r = useMemo(() => S.chapterBalance(scenes), [scenes])
  const max = Math.max(1, ...r.chapters.map((c) => c.words))
  return (
    <div>
      <PanelHead title="장(章) 균형" hint="장(폴더)별 분량. 한 장이 유독 길거나 짧으면 분할/병합을 고려하세요." />
      <div className="cs-note">장 평균 <b>{r.avg.toLocaleString()}</b> 단어</div>
      <Bars rows={r.chapters.map((c) => ({ label: <>{c.title} {c.tier !== 'normal' && <span className={'cs-tag ' + (c.tier === 'long' ? 'warn' : '')}>{c.tier === 'long' ? '긺' : '짧음'}</span>}</>, value: c.words, max, sub: `${c.words.toLocaleString()} · ${c.scenes}장면`, color: tierColor(c.tier) }))} />
    </div>
  )
}

function PresencePanel({ scenes, chars }: PanelProps) {
  const r = useMemo(() => S.characterPresence(scenes, chars), [scenes, chars])
  if (!chars.length) return <Empty msg="등장인물 카드가 없습니다. 자료 폴더에 '캐릭터' 문서를 만들면 자동으로 추적합니다." />
  return (
    <div>
      <PanelHead title="등장인물 등장 추적" hint="각 인물이 어느 장면에 나오는지. 오래 사라지는(공백) 인물을 확인하세요." />
      <div className="cs-presence">
        <div className="cs-presence-head">
          <div className="cs-presence-name"></div>
          <div className="cs-presence-cells">{scenes.map((s, i) => <div key={i} className="cs-presence-cell-label" title={s.title}>{i + 1}</div>)}</div>
        </div>
        {r.characters.map((c) => (
          <div key={c.id} className="cs-presence-row">
            <div className="cs-presence-name" title={`${c.total}개 장면 · 최대 공백 ${c.maxGap}`}>{c.name} {c.maxGap >= 4 && <span className="cs-tag warn">공백 {c.maxGap}</span>}</div>
            <div className="cs-presence-cells">{scenes.map((_, i) => <div key={i} className={'cs-presence-cell' + (c.scenes.includes(i) ? ' on' : '')} />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfusionPanel({ chars }: PanelProps) {
  const r = useMemo(() => S.nameConfusion(chars), [chars])
  if (!chars.length) return <Empty msg="등장인물 카드가 없습니다." />
  return (
    <div>
      <PanelHead title="이름 혼동 경고" hint="독자가 헷갈리기 쉬운 비슷한 이름 쌍입니다. 한쪽을 바꾸는 걸 고려하세요." />
      {r.length === 0 ? <Empty msg="혼동될 만한 이름이 없습니다. 👍" /> : r.map((p, i) => (
        <div key={i} className="cs-line"><b>{p.a}</b> ↔ <b>{p.b}</b> <span className="cs-muted">{p.reason}</span></div>
      ))}
    </div>
  )
}

function RelationshipPanel({ scenes, chars }: PanelProps) {
  const g = useMemo(() => S.relationshipGraph(scenes, chars), [scenes, chars])
  if (!g.nodes.length) return <Empty msg="등장인물이 함께 나오는 장면이 없습니다(또는 인물 카드 없음)." />
  const size = 360, cx = size / 2, cy = size / 2, R = 130
  const pos = new Map(g.nodes.map((n, i) => {
    const a = (i / g.nodes.length) * Math.PI * 2 - Math.PI / 2
    return [n.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }]
  }))
  const maxE = Math.max(1, ...g.edges.map((e) => e.weight))
  const maxN = Math.max(1, ...g.nodes.map((n) => n.weight))
  return (
    <div>
      <PanelHead title="인물 관계도" hint="같은 장면에 등장한 빈도로 자동 생성. 선이 굵을수록 자주 함께 나옵니다." />
      <svg width={size} height={size} className="cs-graph">
        {g.edges.map((e, i) => {
          const a = pos.get(e.a)!, b = pos.get(e.b)!
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth={1 + (e.weight / maxE) * 5} strokeOpacity={0.5} />
        })}
        {g.nodes.map((n) => {
          const p = pos.get(n.id)!
          const rad = 6 + (n.weight / maxN) * 12
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={rad} fill="var(--accent-2)" />
              <text x={p.x} y={p.y - rad - 4} textAnchor="middle" fontSize="11" fill="var(--text)">{n.name}</text>
            </g>
          )
        })}
      </svg>
      <h4 className="cs-sub">가장 강한 관계</h4>
      {g.edges.slice(0, 8).map((e, i) => {
        const an = g.nodes.find((n) => n.id === e.a)?.name, bn = g.nodes.find((n) => n.id === e.b)?.name
        return <div key={i} className="cs-line"><b>{an}</b> ↔ <b>{bn}</b> <span className="cs-muted">{e.scenes}개 장면 함께</span></div>
      })}
    </div>
  )
}

function CodexPanel({ scenes, project, jump }: PanelProps) {
  const r = useMemo(() => S.codexMentions(project, scenes), [project, scenes])
  if (!r.length) return <Empty msg="자료(Research) 폴더에 항목이 없습니다." />
  return (
    <div>
      <PanelHead title="세계관 코덱스 멘션" hint="자료 폴더의 인물·장소·용어가 원고에서 몇 번, 어디에 등장하는지 추적합니다." />
      {r.map((e) => (
        <div key={e.id} className="cs-line">
          <b>{e.name}</b> <span className="cs-tag">{e.mentions}회</span>
          {e.mentions === 0 ? <span className="cs-muted"> 원고에 미등장</span> : <span className="cs-muted"> {e.scenes.slice(0, 5).join(', ')}{e.scenes.length > 5 ? '…' : ''}</span>}
          {e.firstSceneId && <button className="cs-mini" onClick={() => jump(e.firstSceneId!)}>이동</button>}
        </div>
      ))}
    </div>
  )
}

function SceneMetaPanel({ scenes, setMeta }: PanelProps) {
  if (!scenes.length) return <Empty msg="원고에 장면이 없습니다." />
  const field = (sc: Scene, key: string, ph: string, type = 'text') => (
    <input className="cs-meta-input" type={type} placeholder={ph} defaultValue={sc.item.customMeta?.[key] || ''}
      onBlur={(e) => {
        // 무드(number)는 min/max 가 강제되지 않으므로 저장 전에 -5~5 로 클램프(빈값은 그대로 유지).
        if (type === 'number') {
          const v = e.target.value.trim()
          const clamped = v === '' ? '' : String(Math.max(-5, Math.min(5, Number(v) || 0)))
          e.target.value = clamped // 화면 표시도 클램프 결과로 동기화
          setMeta(sc.id, key, clamped)
        } else {
          setMeta(sc.id, key, e.target.value)
        }
      }}
      min={type === 'number' ? -5 : undefined} max={type === 'number' ? 5 : undefined} />
  )
  return (
    <div>
      <PanelHead title="장면 메타 편집" hint="장면마다 POV(시점)·무드(-5~5)·스토리 시간·목표·갈등을 지정하면 아래 아크/타임라인/POV 도구가 채워집니다." />
      <div className="cs-meta-table">
        <div className="cs-meta-hrow">
          <div>장면</div><div>POV</div><div>무드(-5~5)</div><div>스토리 시간</div><div>목표</div><div>갈등</div><div>플롯라인(쉼표)</div>
        </div>
        {scenes.map((sc) => (
          <div key={sc.id} className="cs-meta-row">
            <div className="cs-meta-name" title={sc.title}>{sc.title}</div>
            {field(sc, S.POV_KEY, '인물')}
            {field(sc, S.MOOD_KEY, '0', 'number')}
            {field(sc, S.STORYTIME_KEY, '예: 1일차 아침')}
            {field(sc, S.GOAL_KEY, '장면 목표')}
            {field(sc, S.CONFLICT_KEY, '갈등/장애물')}
            {field(sc, S.PLOTLINE_KEY, '예: 메인, 로맨스')}
          </div>
        ))}
      </div>
    </div>
  )
}

function PovPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => S.povDistribution(scenes), [scenes])
  const max = Math.max(1, ...r.distribution.map((d) => d.scenes))
  const untag = r.sequence.filter((s) => s.pov === '(미지정)').length
  return (
    <div>
      <PanelHead title="POV(시점) 분포" hint="시점 인물의 분량 균형을 확인합니다. (장면 메타 편집에서 POV를 지정하세요.)" />
      {untag === scenes.length ? <Empty msg="아직 POV가 지정된 장면이 없습니다. '장면 메타 편집'에서 지정하세요." /> : (
        <>
          <Bars rows={r.distribution.map((d) => ({ label: d.pov, value: d.scenes, max, sub: `${d.scenes}장면 (${d.pct}%)`, color: d.pov === '(미지정)' ? 'var(--muted)' : 'var(--accent)' }))} />
          <h4 className="cs-sub">시점 전환 흐름</h4>
          <div className="cs-pov-seq">{r.sequence.map((s) => <span key={s.id} className="cs-pov-chip clickable" onClick={() => jump(s.id)} title={s.title}>{s.pov}</span>)}</div>
        </>
      )}
    </div>
  )
}

function EmotionPanel({ scenes, jump }: PanelProps) {
  const pts = useMemo(() => S.emotionArc(scenes), [scenes])
  const tagged = pts.filter((p) => p.mood !== null)
  if (!tagged.length) return <Empty msg="무드가 지정된 장면이 없습니다. '장면 메타 편집'에서 -5~5로 지정하세요." />
  const W = Math.max(320, pts.length * 44), H = 200, pad = 24
  const x = (i: number) => pad + (pts.length > 1 ? (i / (pts.length - 1)) * (W - 2 * pad) : 0)
  const y = (m: number) => H / 2 - (m / 5) * (H / 2 - pad)
  const line = tagged.map((p) => `${x(p.index)},${y(p.mood as number)}`).join(' ')
  return (
    <div>
      <PanelHead title="감정 아크" hint="장면별 감정 기복(긍정+/부정−)의 흐름. 단조로운 평탄선이나 변화 없는 구간을 살펴보세요." />
      <svg width={W} height={H} className="cs-graph">
        <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="var(--border)" />
        <polyline points={line} fill="none" stroke="var(--accent-2)" strokeWidth={2} />
        {tagged.map((p) => (
          <circle key={p.id} cx={x(p.index)} cy={y(p.mood as number)} r={4} fill={(p.mood as number) >= 0 ? 'var(--ok)' : 'var(--warn)'} onClick={() => jump(p.id)} style={{ cursor: 'pointer' }}>
            <title>{p.title}: {p.mood}</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}

function TimelinePanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => S.timeline(scenes), [scenes])
  if (!r.items.length) return <Empty msg="스토리 시간이 지정된 장면이 없습니다. '장면 메타 편집'에서 지정하세요." />
  return (
    <div>
      <PanelHead title="스토리 타임라인" hint="이야기 속 시간 순으로 정렬한 장면. 읽기 순서와 다르면(시간 역행) 표시됩니다." />
      {r.outOfOrder > 0 && <div className="cs-note">읽기 순서와 다른 장면 <b className="warn-text">{r.outOfOrder}</b>개 (의도된 비선형 구성일 수 있음)</div>}
      <div className="cs-timeline">
        {r.items.map((it) => (
          <div key={it.id} className="cs-timeline-item clickable" onClick={() => jump(it.id)}>
            <div className="cs-timeline-time">{it.storyTime}</div>
            <div className="cs-timeline-dot" />
            <div className="cs-timeline-title">{it.title} <span className="cs-muted">읽기 #{it.readingIndex + 1}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlotGridPanel({ scenes, jump }: PanelProps) {
  const g = useMemo(() => S.plotGrid(scenes), [scenes])
  if (!scenes.length) return <Empty msg="원고에 장면이 없습니다." />
  if (!g.plotlines.length) return <Empty msg="플롯라인이 없습니다. '장면 메타 편집'에서 각 장면에 플롯라인(쉼표로 구분)을 지정하면 여기에 그리드로 나타납니다." />
  return (
    <div>
      <PanelHead title="플롯 그리드" hint="플롯라인(가닥)별로 어느 장면에서 진행되는지 한눈에. 끊긴 플롯라인이나 한 장면에 몰린 구간을 점검하세요." />
      <div className="cs-plotgrid">
        <div className="cs-pg-row cs-pg-head">
          <div className="cs-pg-name" />
          {g.scenes.map((s, i) => <div key={s.id} className="cs-pg-cellh clickable" title={s.title} onClick={() => jump(s.id)}>{i + 1}</div>)}
        </div>
        {g.plotlines.map((pl) => (
          <div key={pl} className="cs-pg-row">
            <div className="cs-pg-name" title={pl}>{pl}</div>
            {g.scenes.map((s) => <div key={s.id} className={'cs-pg-cell' + (s.lines.includes(pl) ? ' on' : '')} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function DocGraphPanel({ project, jump }: PanelProps) {
  const g = useMemo(() => {
    const edges: { from: string; to: string }[] = []
    const nodeSet = new Set<string>()
    for (const it of Object.values(project.items)) {
      if (it.root || !it.bodyRtf) continue
      for (const l of internalLinksOf(project, it.id)) {
        if (l.exists) { edges.push({ from: it.id, to: l.targetId }); nodeSet.add(it.id); nodeSet.add(l.targetId) }
      }
    }
    const deg = new Map<string, number>()
    edges.forEach((e) => { deg.set(e.from, (deg.get(e.from) || 0) + 1); deg.set(e.to, (deg.get(e.to) || 0) + 1) })
    const nodes = [...nodeSet].map((id) => ({ id, name: project.items[id]?.title || '?', deg: deg.get(id) || 0 }))
    return { nodes, edges }
  }, [project])
  if (!g.nodes.length) return <Empty msg="문서 간 내부 링크(scriv://)가 없습니다. 에디터에서 '문서 링크 삽입'으로 문서를 연결해 보세요." />
  const size = 400, cx = size / 2, cy = size / 2, R = 150
  const pos = new Map(g.nodes.map((n, i) => {
    const a = (i / g.nodes.length) * Math.PI * 2 - Math.PI / 2
    return [n.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }]
  }))
  const maxDeg = Math.max(1, ...g.nodes.map((n) => n.deg))
  return (
    <div>
      <PanelHead title="문서 링크 그래프" hint="문서 간 내부 링크(scriv://) 관계망. 노드를 클릭하면 그 문서로 이동합니다(Obsidian 그래프 유형)." />
      <svg width={size} height={size} className="cs-graph">
        <defs><marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" /></marker></defs>
        {g.edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to)
          if (!a || !b) return null
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1.4} markerEnd="url(#dg-arrow)" />
        })}
        {g.nodes.map((n) => {
          const p = pos.get(n.id)!
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => jump(n.id)}>
              <circle cx={p.x} cy={p.y} r={5 + (n.deg / maxDeg) * 10} fill="var(--accent-2)" />
              <text x={p.x} y={p.y - 8 - (n.deg / maxDeg) * 10} textAnchor="middle" fontSize="10.5" fill="var(--text)">{n.name}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---------- 문장 점검·교정 패널 ----------
function CheckPatternPanel({ scenes, jump, fn, title, hint, okMsg }: PanelProps & { fn: (s: Scene[]) => C.PatternResult; title: string; hint: string; okMsg: string }) {
  const r = useMemo(() => fn(scenes), [scenes, fn])
  return (
    <div>
      <PanelHead title={title} hint={hint} />
      {r.total === 0 ? <Empty msg={okMsg} /> : (
        <>
          <div className="cs-note">총 <b>{r.total}</b>건 발견</div>
          {r.hits.map((h) => (
            <div key={h.label} className="cs-check">
              <div className="cs-check-label">{h.label} <span className="cs-tag warn">{h.count}</span></div>
              {h.samples.map((s, i) => <div key={i} className="cs-check-sample">{s}</div>)}
            </div>
          ))}
          <h4 className="cs-sub">장면별</h4>
          {r.perScene.filter((s) => s.count > 0).map((s) => (
            <div key={s.id} className="cs-line clickable" onClick={() => jump(s.id)}>{s.title} <span className="cs-tag warn">{s.count}</span></div>
          ))}
        </>
      )}
    </div>
  )
}
function SpellPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C.koreanSpelling(scenes), [scenes])
  return (
    <div>
      <PanelHead title="흔한 맞춤법 점검" hint="자주 틀리는 표기를 찾아 교정안을 제안합니다(휴리스틱 — 문맥에 따라 맞을 수도 있으니 확인하세요)." />
      {r.items.length === 0 ? <Empty msg="흔한 맞춤법 실수가 보이지 않습니다. 👍" /> : (
        <Bars rows={r.items.map((i) => ({ label: <><b className="warn-text">{i.show}</b> → {i.suggest}</>, value: i.count, max: r.items[0].count, sub: `${i.count}회` }))} />
      )}
    </div>
  )
}
function EndingsPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C.sentenceEndings(scenes), [scenes])
  const max = Math.max(1, ...r.dist.map((d) => d.count))
  return (
    <div>
      <PanelHead title="문장 끝맺음 다양성" hint="같은 어미('~했다')가 연달아 반복되면 단조롭습니다. 분포와 연속 구간을 확인하세요." />
      {r.dist.length === 0 ? <Empty msg="분석할 문장이 없습니다. 먼저 장면을 작성해 보세요." /> : (
        <>
          {r.monotony.length > 0 && (<><h4 className="cs-sub">연속 반복(주의)</h4>{r.monotony.map((m, i) => <div key={i} className="cs-line"><span className="cs-tag warn">…{m.ending} ×{m.run} 연속</span> {m.scene}</div>)}</>)}
          <h4 className="cs-sub">끝맺음 분포</h4>
          <Bars rows={r.dist.map((d) => ({ label: '…' + d.ending, value: d.count, max, sub: `${d.count} (${d.pct}%)` }))} />
        </>
      )}
    </div>
  )
}
function PhrasesPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C.repeatedPhrases(scenes, 4), [scenes])
  return (
    <div>
      <PanelHead title="반복 구절(4어절)" hint="원고 전체에서 똑같이 반복되는 구절. 의도치 않은 자기복제 문장을 잡아냅니다." />
      {r.items.length === 0 ? <Empty msg="반복되는 긴 구절이 없습니다. 👍" /> : <Bars rows={r.items.map((i) => ({ label: i.phrase, value: i.count, max: r.items[0].count, sub: `${i.count}회` }))} />}
    </div>
  )
}
function ParagraphPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C.paragraphStats(scenes), [scenes])
  const max = Math.max(1, ...r.perScene.map((s) => s.max))
  return (
    <div>
      <PanelHead title="문단 길이 분석" hint="너무 긴 문단은 가독성을 떨어뜨립니다. 장면별 평균/최대 문단 길이와 과도하게 긴 문단을 표시합니다." />
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.max, max, sub: `평균 ${s.avg} · 최대 ${s.max} · ${s.count}문단`, color: s.max > 150 ? 'var(--warn)' : 'var(--accent)', onClick: () => jump(s.id) }))} />
      {r.longParas.length > 0 && (<><h4 className="cs-sub">긴 문단(150단어+)</h4>{r.longParas.map((p, i) => <div key={i} className="cs-line"><span className="cs-tag warn">{p.words}</span> {p.scene}: {p.preview}</div>)}</>)}
    </div>
  )
}
function HooksPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C.sceneHooks(scenes), [scenes])
  if (!scenes.length) return <Empty msg="원고에 장면이 없습니다." />
  return (
    <div>
      <PanelHead title="장면 훅(첫·끝 문장)" hint="각 장면의 첫 문장(여는 훅)과 끝 문장(클리프행어)을 모아 한눈에 점검합니다." />
      {r.scenes.map((s) => (
        <div key={s.id} className="cs-hook clickable" onClick={() => jump(s.id)}>
          <div className="cs-hook-title">{s.title}</div>
          <div className="cs-hook-line"><span className="cs-muted">첫:</span> {s.first}</div>
          <div className="cs-hook-line"><span className="cs-muted">끝:</span> {s.last}</div>
        </div>
      ))}
    </div>
  )
}
function OutlinePanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C.sceneOutline(scenes), [scenes])
  if (!scenes.length) return <Empty msg="원고에 장면이 없습니다." />
  return (
    <div>
      <PanelHead title="한 줄 아웃라인" hint="장면별 시놉시스(없으면 첫 문장)를 모아 한 페이지 줄거리로 봅니다. 클릭하면 해당 장면으로 이동합니다." />
      {r.scenes.map((s, i) => (
        <div key={s.id} className="cs-line clickable" onClick={() => jump(s.id)}><b>{i + 1}. {s.title}</b> — <span className="cs-muted">{s.line}</span></div>
      ))}
    </div>
  )
}
function SentTypePanel({ scenes }: PanelProps) {
  const r = useMemo(() => C.sentenceTypes(scenes), [scenes])
  const total = r.statement + r.question + r.exclaim || 1
  return (
    <div>
      <PanelHead title="문장 유형 분포" hint="서술·의문·감탄문의 비율. 감탄문(!)이 너무 많으면 톤이 들뜨고, 의문문이 적으면 긴장이 약할 수 있습니다." />
      <Bars rows={[
        { label: '서술문', value: r.statement, max: total, sub: `${r.statement} (${Math.round((r.statement / total) * 100)}%)` },
        { label: '의문문 ?', value: r.question, max: total, sub: `${r.question} (${Math.round((r.question / total) * 100)}%)`, color: 'var(--accent-2)' },
        { label: '감탄문 !', value: r.exclaim, max: total, sub: `${r.exclaim} (${Math.round((r.exclaim / total) * 100)}%)`, color: r.exclaim / total > 0.15 ? 'var(--warn)' : 'var(--accent)' },
      ]} />
    </div>
  )
}
function NumberPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C.numberConsistency(scenes), [scenes])
  return (
    <div>
      <PanelHead title="숫자 표기 일관성" hint="아라비아 숫자(3)와 한글 숫자(셋)가 섞이면 일관성이 떨어집니다. 한 작품 안에서는 표기 규칙을 정해 두세요." />
      <div className="cs-note">아라비아 숫자 <b>{r.arabic}</b>개 · 한글 숫자 <b>{r.koreanNum}</b>개</div>
      {r.mixed && <div className="cs-note warn-text">두 표기가 모두 자주 쓰였습니다 — 규칙 통일을 권장합니다.</div>}
    </div>
  )
}
function EmotionDensityPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C.emotionDensity(scenes), [scenes])
  const max = Math.max(1, ...r.perScene.map((s) => s.per1k))
  return (
    <div>
      <PanelHead title="감정 어휘 밀도" hint="감정을 직접 가리키는 단어의 밀도. 너무 높으면 '말하기'에 치우친 신호일 수 있습니다(보여주기 점검)." />
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.per1k, max, sub: `${s.count}개 (1천 단어당 ${s.per1k})`, color: s.per1k > 20 ? 'var(--warn)' : 'var(--accent)', onClick: () => jump(s.id) }))} />
    </div>
  )
}

// ---------- 추가 점검(고급) 패널 ----------
function FreqPanel({ scenes, fn, title, hint, okMsg }: PanelProps & { fn: (s: Scene[]) => C2.FreqResult; title: string; hint: string; okMsg: string }) {
  const r = useMemo(() => fn(scenes), [scenes, fn])
  return (
    <div>
      <PanelHead title={title} hint={hint} />
      {r.items.length === 0 ? <Empty msg={okMsg} /> : (
        <>
          <div className="cs-note">총 <b>{r.total}</b>건</div>
          <Bars rows={r.items.slice(0, 25).map((i) => ({ label: i.label, value: i.count, max: r.items[0].count, sub: `${i.count}회 (1천당 ${i.per1k})` }))} />
        </>
      )}
    </div>
  )
}
function DensityPanel({ scenes, jump, fn, title, hint }: PanelProps & { fn: (s: Scene[]) => C2.DensityResult; title: string; hint: string }) {
  const r = useMemo(() => fn(scenes), [scenes, fn])
  const max = Math.max(1, ...r.perScene.map((s) => s.per1k))
  return (
    <div>
      <PanelHead title={title} hint={hint} />
      <div className="cs-note">총 <b>{r.total}</b>건</div>
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.per1k, max, sub: `${s.count}건 (1천당 ${s.per1k})`, color: s.per1k > 15 ? 'var(--warn)' : 'var(--accent)', onClick: () => jump(s.id) }))} />
    </div>
  )
}
function EchoPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C2.echoWords(scenes), [scenes])
  return (
    <div>
      <PanelHead title="메아리 단어" hint="가까운 거리(약 50단어 이내)에서 반복된 단어. 무의식적 반복은 글을 거슬리게 합니다." />
      {r.items.length === 0 ? <Empty msg="가까운 반복이 거의 없습니다. 👍" /> : <Bars rows={r.items.map((i) => ({ label: i.word, value: i.echoes, max: r.items[0].echoes, sub: `근접 반복 ${i.echoes}회` }))} />}
    </div>
  )
}
function OpenerVarietyPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C2.paragraphOpenerVariety(scenes), [scenes])
  return (
    <div>
      <PanelHead title="문단 첫 단어 다양성" hint="문단이 같은 단어로 시작하면 단조롭습니다. 다양성 비율(고유 첫단어/문단 수)이 낮은 장면을 점검하세요." />
      <Bars rows={r.perScene.map((s) => ({ label: s.title, value: s.ratio, max: 100, sub: `${s.ratio}% (${s.unique}/${s.total})`, color: s.ratio < 50 && s.total >= 4 ? 'var(--warn)' : 'var(--ok)', onClick: () => jump(s.id) }))} />
    </div>
  )
}
function DialogueLenPanel({ scenes }: PanelProps) {
  const r = useMemo(() => C2.dialogueLength(scenes), [scenes])
  const total = r.short + r.medium + r.long || 1
  return (
    <div>
      <PanelHead title="대사 길이 분포" hint="짧은 대사(≤4단어)·중간·긴 대사(≥25단어)의 비율. 긴 대사가 많으면 연설조가 될 수 있습니다." />
      <div className="cs-note">평균 대사 길이 <b>{r.avg}</b>단어</div>
      <Bars rows={[
        { label: '짧은 대사 (≤4)', value: r.short, max: total, sub: `${r.short}` },
        { label: '중간 대사', value: r.medium, max: total, sub: `${r.medium}` },
        { label: '긴 대사 (≥25)', value: r.long, max: total, sub: `${r.long}`, color: r.long / total > 0.2 ? 'var(--warn)' : 'var(--accent)' },
      ]} />
    </div>
  )
}

function SpeechLevelPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C3.speechLevelConsistency(scenes), [scenes])
  const total = r.jondae + r.banmal || 1
  const mixed = r.perScene.filter((s) => s.mixed)
  return (
    <div>
      <PanelHead title="존댓말·반말 일관성" hint="대사의 존댓말/반말 비율과, 한 장면에 두 화법이 섞인 구간을 표시합니다. 인물 관계상 화법이 흔들리지 않는지 점검하세요." />
      {total <= 1 ? <Empty msg="분석할 대사가 거의 없습니다." /> : (
        <>
          <Bars rows={[
            { label: '존댓말', value: r.jondae, max: total, sub: `${r.jondae} (${Math.round((r.jondae / total) * 100)}%)` },
            { label: '반말', value: r.banmal, max: total, sub: `${r.banmal} (${Math.round((r.banmal / total) * 100)}%)`, color: 'var(--accent-2)' },
          ]} />
          <h4 className="cs-sub">화법 혼용 의심 장면</h4>
          {mixed.length === 0 ? <Empty msg="화법 혼용이 두드러지는 장면이 없습니다. 👍" /> : mixed.map((s) => (
            <div key={s.id} className="cs-line clickable" onClick={() => jump(s.id)}>{s.title} <span className="cs-tag warn">존댓말 {s.jondae} · 반말 {s.banmal}</span></div>
          ))}
        </>
      )}
    </div>
  )
}
function EpisodeLenPanel({ scenes, jump }: PanelProps) {
  const r = useMemo(() => C3.episodeLength(scenes), [scenes])
  const max = Math.max(1, ...r.perScene.map((s) => s.chars))
  return (
    <div>
      <PanelHead title="회차/장면 분량 (웹소설 기준)" hint="웹소설 1회차는 보통 공백 포함 3,000~5,500자입니다. 유독 짧거나 긴 장면을 표시합니다(일반 소설은 참고용)." />
      <div className="cs-note">평균 <b>{r.avg.toLocaleString()}</b>자 · 최소 {r.min.toLocaleString()} · 최대 {r.max.toLocaleString()}</div>
      <Bars rows={r.perScene.map((s) => ({ label: <>{s.title} {s.tier !== 'ok' && <span className={'cs-tag ' + (s.tier === 'long' ? 'warn' : '')}>{s.tier === 'long' ? '긺' : '짧음'}</span>}</>, value: s.chars, max, sub: `${s.chars.toLocaleString()}자`, color: s.tier === 'ok' ? 'var(--ok)' : s.tier === 'long' ? 'var(--warn)' : 'var(--accent-2)', onClick: () => jump(s.id) }))} />
    </div>
  )
}

// ---------- 데이터 기반 도구 패널(단어 은행/생성기/가이드) ----------
function WordBankPanel({ bank, copy }: { bank: WordBank; copy: (t: string) => void }) {
  return (
    <div>
      <PanelHead title={bank.name} hint={(bank.intro ? bank.intro + ' · ' : '') + '단어/표현을 클릭하면 복사됩니다.'} />
      {bank.categories.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 12 }}>
          <h4 className="cs-sub" style={{ margin: '10px 0 6px' }}>{cat.name}</h4>
          <div className="cs-chips">
            {cat.words.map((w, i) => (
              <button key={i} className="cs-chip" onClick={() => copy(w)} title="클릭하면 복사">{w}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
function GeneratorPanel({ gen, copy }: { gen: Generator; copy: (t: string) => void }) {
  const [results, setResults] = useState<string[]>(() => rollMany(gen))
  return (
    <div>
      <PanelHead title={gen.name} hint={(gen.intro ? gen.intro + ' · ' : '') + '결과를 클릭하면 복사됩니다.'} />
      <button className="btn-primary" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setResults(rollMany(gen))}><Icon name="dice" size={16} mono /> 다시 생성</button>
      <div className="cs-gen-list">
        {results.map((r, i) => (
          <button key={i} className="cs-gen-item" onClick={() => copy(r)} title="클릭하면 복사">{r}</button>
        ))}
      </div>
    </div>
  )
}
function GuidePanel({ guide }: { guide: Guide }) {
  return (
    <div>
      <PanelHead title={guide.name} hint={guide.intro || ''} />
      {guide.sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <h4 className="cs-sub" style={{ margin: '12px 0 6px' }}>{sec.heading}</h4>
          <ul className="cs-guide-list">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        </div>
      ))}
    </div>
  )
}

// ---------- 제네릭 분석기 패널: AnalyzerResult(게이지/점수/목록/막대/구획/통계)를 모양별로 렌더 ----------
const TIER_COLOR: Record<Tier, string> = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--accent-2)' }
const tc = (t?: Tier) => (t ? TIER_COLOR[t] : 'var(--accent)')

function AnalyzerPanel({ analyzer, project, activeId, jump }: { analyzer: Analyzer; project: PanelProps['project']; activeId: string | null; jump: (id: string) => void }) {
  const res = useMemo<AnalyzerResult>(() => {
    try {
      return analyzer.run(buildAnalyzerContext(project, activeId))
    } catch {
      return { kind: 'list', items: [], empty: '분석 중 오류가 발생했습니다.' }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzer, project, activeId])
  const hint = (analyzer.intro || '') + (analyzer.scope === 'document' ? ' · 현재 열린 문서 기준' : '')
  return (
    <div>
      <PanelHead title={analyzer.name} hint={hint} />
      {res.kind === 'gauge' && (() => {
        const min = res.min ?? 0
        const pct = res.max > min ? Math.max(0, Math.min(100, ((res.value - min) / (res.max - min)) * 100)) : 0
        return (
          <div>
            <div className="cs-note" style={{ marginBottom: 8 }}>
              <b style={{ color: tc(res.tier), fontSize: 18 }}>{res.value.toLocaleString()}</b>{res.unit ? ' ' + res.unit : ''} · {res.label}
            </div>
            <div className="cs-bar-track" style={{ height: 12 }}><div className="cs-bar-fill" style={{ width: pct + '%', background: tc(res.tier) }} /></div>
            {res.note && <div className="cs-note" style={{ marginTop: 8 }}>{res.note}</div>}
          </div>
        )
      })()}
      {res.kind === 'score' && (
        <div>
          <div className="cs-note" style={{ marginBottom: 10 }}>점수 <b style={{ fontSize: 20, color: 'var(--accent)' }}>{res.score}</b> / {res.max ?? 100}</div>
          <ul className="cs-check-list">
            {res.checks.map((c, i) => (
              <li key={i} className="cs-check-row" style={{ color: c.pass ? 'var(--ok)' : tc(c.tier ?? 'warn') }}>
                <span>{c.pass ? '✓' : '○'}</span> <span style={{ color: 'var(--text)' }}>{c.label}</span>
                {c.detail && <span className="cs-check-detail"> — {c.detail}</span>}
              </li>
            ))}
          </ul>
          {res.note && <div className="cs-note" style={{ marginTop: 8 }}>{res.note}</div>}
        </div>
      )}
      {res.kind === 'list' && (
        res.items.length === 0 ? <Empty msg={res.empty || '발견된 항목이 없습니다.'} /> : (
          <div>
            {res.note && <div className="cs-note" style={{ marginBottom: 8 }}>{res.note}</div>}
            <ul className="cs-find-list">
              {res.items.map((it, i) => (
                <li key={i} className={'cs-find-row' + (it.sceneId ? ' clickable' : '')} onClick={it.sceneId ? () => jump(it.sceneId!) : undefined} style={{ borderLeftColor: tc(it.tier) }}>
                  <div className="cs-find-text">{it.text}</div>
                  {it.sub && <div className="cs-find-sub">{it.sub}</div>}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
      {res.kind === 'bars' && (
        res.rows.length === 0 ? <Empty msg="표시할 데이터가 없습니다." /> : (
          <div>
            {res.note && <div className="cs-note" style={{ marginBottom: 8 }}>{res.note}</div>}
            <Bars rows={res.rows.map((r) => ({ label: r.label, value: r.value, max: r.max ?? Math.max(1, ...res.rows.map((x) => x.value)), sub: r.sub, color: tc(r.tier), onClick: r.sceneId ? () => jump(r.sceneId!) : undefined }))} />
          </div>
        )
      )}
      {res.kind === 'sections' && (
        <div>
          {res.note && <div className="cs-note" style={{ marginBottom: 8 }}>{res.note}</div>}
          {res.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <h4 className="cs-sub" style={{ margin: '12px 0 6px' }}>{sec.heading}</h4>
              <ul className="cs-guide-list">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {res.kind === 'stat' && (
        <div>
          <div className="cs-stat-grid">
            {res.stats.map((s, i) => (
              <div key={i} className="cs-stat-cell">
                <div className="cs-stat-val" style={{ color: tc(s.tier) }}>{s.value}</div>
                <div className="cs-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          {res.note && <div className="cs-note" style={{ marginTop: 8 }}>{res.note}</div>}
        </div>
      )}
    </div>
  )
}

// ---------- 절차적 합성 생성기 패널: 슬롯 잠금·재생성·조합수 표시 ----------
function ComposerPanel({ composer, copy }: { composer: Composer; copy: (t: string) => void }) {
  const [picks, setPicks] = useState<Record<string, string>>(() => roll(composer))
  const [locked, setLocked] = useState<Record<string, boolean>>({})
  const reroll = () => {
    const keep: Record<string, string> = {}
    // 잠긴 슬롯이라도 값이 비어 있으면 새로 뽑는다(빈칸 고정 방지).
    for (const s of composer.slots) if (locked[s.label] && picks[s.label]) keep[s.label] = picks[s.label]
    setPicks(roll(composer, keep))
  }
  const toggleLock = (label: string) => setLocked((l) => ({ ...l, [label]: !l[label] }))
  const combos = useMemo(() => combinations(composer), [composer])
  // summary 가 잘못된 키 접근 등으로 throw 해도 패널이 죽지 않게 가드.
  let summary = ''
  try { summary = composer.summary ? composer.summary(picks) : '' } catch { summary = '' }
  const fullText = composer.slots.map((s) => `${s.label}: ${picks[s.label] ?? ''}`).join('\n') + (summary ? '\n\n' + summary : '')
  return (
    <div>
      <PanelHead title={composer.name} hint={(composer.intro ? composer.intro + ' · ' : '') + `약 ${formatCombos(combos)}가지 조합 · 슬롯을 잠그고 재생성하면 일부만 고정됩니다.`} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={reroll}><Icon name="dice" size={16} mono /> 다시 생성</button>
        <button className="minibtn" onClick={() => copy(fullText)} title="전체 복사">전체 복사</button>
      </div>
      {summary && <div className="cs-note" style={{ marginBottom: 10, fontStyle: 'italic' }}>{summary}</div>}
      <div className="pg-slots">
        {composer.slots.map((s) => (
          <div key={s.label} className="pg-slot">
            <button className={'pg-lock' + (locked[s.label] ? ' on' : '')} onClick={() => toggleLock(s.label)} title={locked[s.label] ? '잠금 해제' : '이 슬롯 고정'}>{locked[s.label] ? '🔒' : '🔓'}</button>
            <span className="pg-slot-label">{s.label}</span>
            <button className="pg-slot-value" onClick={() => copy(picks[s.label] ?? '')} title="클릭하면 복사">{picks[s.label]}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- 메인 ----------
export default function CreativeStudio({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const setCustomMeta = useStore((s) => s.setCustomMeta)
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const activeId = useStore((s) => s.activeId)
  const [tool, setTool] = useState<string>('dashboard')
  const [navOpen, setNavOpen] = useState<Set<string>>(new Set()) // 펼쳐진 카테고리(트리)
  const toggleNav = (g: string) => setNavOpen((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })
  const [flash, setFlash] = useState('')
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scenes = useMemo(() => sceneList(project), [project])
  const chars = useMemo(() => S.charactersOf(project), [project])
  const dialogRef = useModal<HTMLDivElement>(onClose)

  const jump = (id: string) => { select(id); setView('editor'); onClose() }
  const props: PanelProps = { scenes, chars, project, jump, setMeta: setCustomMeta }
  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 1700)
  }
  const copy = (text: string) => {
    text = text ?? '' // 어떤 호출 경로(빈 슬롯 등)에서도 TypeError 방지
    // 성공 시에만 '복사됨' 토스트. clipboard 미지원/거부 시 폴백 후 성공·실패를 정확히 분기.
    const okMsg = '복사됨: ' + (text.length > 36 ? text.slice(0, 36) + '…' : text)
    const failMsg = '복사 실패 — 수동 복사하세요'
    // 임시 textarea + execCommand('copy') 폴백 — 성공 여부 boolean 반환.
    const legacyCopy = (): boolean => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
      } catch { return false }
    }
    const promise = navigator.clipboard?.writeText(text)
    if (promise) {
      // writeText 는 Promise — 성공 시에만 토스트, 거부 시 폴백→실패 분기.
      promise.then(() => showFlash(okMsg)).catch(() => showFlash(legacyCopy() ? okMsg : failMsg))
    } else {
      // clipboard API 미지원 → 폴백.
      showFlash(legacyCopy() ? okMsg : failMsg)
    }
  }
  const analyzerGroups = useMemo(() => {
    const kinds = [...new Set(ANALYZERS.map((a) => a.kind))]
    return kinds.map((k) => ({
      group: k,
      items: ANALYZERS.filter((a) => a.kind === k).map((a) => ({ id: 'an:' + a.id, name: a.name, icon: '📊' })),
    }))
  }, [])
  const composerGroups = useMemo(() => {
    const gs = [...new Set(COMPOSERS.map((c) => c.group))]
    return gs.map((g) => ({
      group: g,
      items: COMPOSERS.filter((c) => c.group === g).map((c) => ({ id: 'pg:' + c.id, name: c.name, icon: '✨' })),
    }))
  }, [])
  const guideGroups = useMemo(() => {
    const gs = [...new Set(GUIDES.map((g) => g.group || '작법 가이드'))]
    return gs.map((grp) => ({
      group: grp,
      items: GUIDES.filter((g) => (g.group || '작법 가이드') === grp).map((g) => ({ id: 'guide:' + g.id, name: g.name, icon: g.icon })),
    }))
  }, [])
  const groups = useMemo(
    () => [
      ...TOOLS,
      ...composerGroups,
      ...analyzerGroups,
      { group: '단어 은행 (클릭 복사)', items: WORD_BANKS.map((b) => ({ id: 'wb:' + b.id, name: b.name, icon: b.icon })) },
      { group: '아이디어 생성기', items: GENERATORS.map((g) => ({ id: 'gen:' + g.id, name: g.name, icon: g.icon })) },
      ...guideGroups,
    ],
    [analyzerGroups, composerGroups, guideGroups],
  )
  const [q, setQ] = useState('')
  const totalCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])
  const ql = q.trim().toLowerCase()
  // 1300+ 도구 나브 — 검색어/그룹이 바뀔 때만 재계산(복사 토스트 등 무관한 리렌더에 전체 필터 반복 방지)
  const filtered = useMemo(
    () => (ql ? groups.map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(ql)) })).filter((g) => g.items.length) : groups),
    [groups, ql],
  )

  // 검색으로 현재 active 도구가 nav(filtered)에서 사라지면 첫 결과로 이동 — nav/패널 어긋남 방지.
  useEffect(() => {
    if (ql && !filtered.some((g) => g.items.some((i) => i.id === tool))) {
      setTool(filtered[0]?.items[0]?.id ?? tool)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ql])

  const render = () => {
    if (tool.startsWith('pg:')) { const c = COMPOSERS.find((x) => x.id === tool.slice(3)); return c ? <ComposerPanel key={c.id} composer={c} copy={copy} /> : null }
    if (tool.startsWith('an:')) { const a = ANALYZERS.find((x) => x.id === tool.slice(3)); return a ? <AnalyzerPanel key={a.id} analyzer={a} project={project} activeId={activeId} jump={jump} /> : null }
    if (tool.startsWith('wb:')) { const b = WORD_BANKS.find((x) => x.id === tool.slice(3)); return b ? <WordBankPanel key={b.id} bank={b} copy={copy} /> : null }
    if (tool.startsWith('gen:')) { const g = GENERATORS.find((x) => x.id === tool.slice(4)); return g ? <GeneratorPanel key={g.id} gen={g} copy={copy} /> : null }
    if (tool.startsWith('guide:')) { const g = GUIDES.find((x) => x.id === tool.slice(6)); return g ? <GuidePanel key={g.id} guide={g} /> : null }
    switch (tool) {
      case 'dashboard': return <DashboardPanel {...props} />
      case 'cliche': return <ClichePanel {...props} />
      case 'sensory': return <SensoryPanel {...props} />
      case 'dialogue': return <DialoguePanel {...props} />
      case 'crutch': return <WordListPanel {...props} title="버릇·군더더기 단어" hint="무의식적으로 반복하는 강조어·군더더기. 줄이면 문장이 또렷해집니다." fn={P.crutchWords} />
      case 'filter': return <WordListPanel {...props} title="필터(거리두기) 단어" hint="'느꼈다/보였다/seemed' 같은 필터 단어를 줄이면 독자가 인물에 더 밀착합니다." fn={P.filterWords} />
      case 'telling': return <WordListPanel {...props} title="말하기 vs 보여주기" hint="감정을 직접 서술('화가 났다')하는 표현. 행동·감각으로 '보여주기'를 고려하세요." fn={P.tellingMarkers} />
      case 'said': return <SaidPanel {...props} />
      case 'openers': return <OpenersPanel {...props} />
      case 'rhythm': return <RhythmPanel {...props} />
      case 'pacing': return <PacingPanel {...props} />
      case 'readability': return <ReadabilityPanel {...props} />
      case 'adverb': return <AdverbPanel {...props} />
      case 'chapter': return <ChapterPanel {...props} />
      case 'presence': return <PresencePanel {...props} />
      case 'confusion': return <ConfusionPanel {...props} />
      case 'relationship': return <RelationshipPanel {...props} />
      case 'codex': return <CodexPanel {...props} />
      case 'plotgrid': return <PlotGridPanel {...props} />
      case 'docgraph': return <DocGraphPanel {...props} />
      case 'sceneMeta': return <SceneMetaPanel {...props} />
      case 'pov': return <PovPanel {...props} />
      case 'emotion': return <EmotionPanel {...props} />
      case 'timeline': return <TimelinePanel {...props} />
      case 'trans': return <CheckPatternPanel {...props} fn={C.translationese} title="번역투 점검" hint="번역체 표현(~에 의해, ~에 대하여, ~로부터 등)을 찾아냅니다. 우리말다운 문장으로 다듬어 보세요." okMsg="번역투 표현이 거의 없습니다. 👍" />
      case 'passive': return <CheckPatternPanel {...props} fn={C.doublePassive} title="이중피동 점검" hint="'잊혀지다·보여지다'처럼 피동이 겹친 표현을 찾습니다. '잊히다·보이다'로 고치면 깔끔합니다." okMsg="이중피동이 없습니다. 👍" />
      case 'redundancy': return <CheckPatternPanel {...props} fn={C.redundancy} title="겹말(군더더기) 점검" hint="'역전 앞·미리 예약'처럼 같은 뜻이 겹친 표현을 찾습니다." okMsg="겹말이 보이지 않습니다. 👍" />
      case 'spelling': return <SpellPanel {...props} />
      case 'endings': return <EndingsPanel {...props} />
      case 'phrases': return <PhrasesPanel {...props} />
      case 'paragraph': return <ParagraphPanel {...props} />
      case 'hooks': return <HooksPanel {...props} />
      case 'outline': return <OutlinePanel {...props} />
      case 'senttype': return <SentTypePanel {...props} />
      case 'numbers': return <NumberPanel {...props} />
      case 'emodensity': return <EmotionDensityPanel {...props} />
      case 'gesture': return <FreqPanel {...props} fn={C2.gestureCrutch} title="제스처 버릇" hint="'고개를 끄덕·미소·한숨·어깨를 으쓱' 같은 반복 제스처를 찾습니다. 같은 동작이 반복되면 인물이 단조로워 보입니다." okMsg="제스처 버릇이 두드러지지 않습니다. 👍" />
      case 'bodyauto': return <CheckPatternPanel {...props} fn={C2.bodyPartAutonomy} title="신체 부위 주어(자율 신체)" hint="'눈이 떨어졌다·시선이 흔들렸다'처럼 신체 부위를 주어로 쓰면 어색하거나 텔링이 됩니다. 인물을 주어로 다듬어 보세요." okMsg="자율 신체 표현이 거의 없습니다. 👍" />
      case 'connective': return <FreqPanel {...props} fn={C2.connectiveStart} title="문장 첫머리 접속사" hint="'그리고·그러나·하지만'으로 문장을 자주 시작하면 늘어집니다. 접속사를 줄이면 문장이 단단해집니다." okMsg="문두 접속사 남용이 없습니다. 👍" />
      case 'simile': return <DensityPanel {...props} fn={C2.simileDensity} title="직유 밀도" hint="'~처럼·~같이·~듯'의 직유 밀도. 과하면 비유가 헐거워집니다." />
      case 'runon': return <DensityPanel {...props} fn={C2.commaRunon} title="만연체(쉼표 많은 문장)" hint="쉼표가 5개 이상인 만연체 문장 수. 끊어 쓰면 가독성이 좋아집니다." />
      case 'advtag': return <FreqPanel {...props} fn={C2.adverbDialogueTags} title="부사 붙은 대사 지문" hint="'~게 말했다·said angrily'처럼 부사로 감정을 설명하는 지문. 대사 자체로 감정을 드러내는 편이 강합니다." okMsg="부사 지문이 거의 없습니다. 👍" />
      case 'timemark': return <FreqPanel {...props} fn={C2.timeMarkers} title="시간 전환 표지" hint="'갑자기·잠시 후·마침내' 같은 표지. '갑자기' 남용은 긴장을 떨어뜨립니다." okMsg="시간 표지 남용이 없습니다. 👍" />
      case 'onomat': return <DensityPanel {...props} fn={C2.onomatopoeiaDensity} title="의성어·의태어 밀도" hint="쿵·두근·반짝 등 의성어/의태어 밀도. 장르·톤에 맞는지 점검하세요." />
      case 'predicate': return <FreqPanel {...props} fn={C2.commonPredicates} title="자주 쓴 서술어" hint="문장을 끝맺는 서술어(~다) 빈도. 같은 서술어 반복은 단조로움의 신호입니다." okMsg="서술어가 고르게 분포합니다. 👍" />
      case 'demonstr': return <FreqPanel {...props} fn={C2.demonstratives} title="지시어 남용" hint="'그·이·그것·그런' 등 지시어 빈도. 모호한 지시어는 구체 명사로 바꾸면 또렷해집니다." okMsg="지시어 남용이 없습니다. 👍" />
      case 'nominal': return <FreqPanel {...props} fn={C2.nominalEnding} title="명사형 종결" hint="'~함·~음·~기'로 끝나는 건조한 종결 빈도. 소설 본문에선 서술형이 더 생동감 있습니다." okMsg="명사형 종결이 거의 없습니다. 👍" />
      case 'interj': return <DensityPanel {...props} fn={C2.interjectionDensity} title="감탄사·추임새 밀도" hint="대사 첫머리의 '아·어·헉' 등 추임새 밀도. 과하면 가볍게 들립니다." />
      case 'echo': return <EchoPanel {...props} />
      case 'openvar': return <OpenerVarietyPanel {...props} />
      case 'dlglen': return <DialogueLenPanel {...props} />
      case 'speechlevel': return <SpeechLevelPanel {...props} />
      case 'epilen': return <EpisodeLenPanel {...props} />
      case 'hedge': return <FreqPanel {...props} fn={C3.hedging} title="추측·완충 표현" hint="'~것 같다·~듯·아마' 같은 추측/완충 표현. 남용하면 서술이 흐릿해집니다. 단정적 서술과 균형을 점검하세요." okMsg="추측 표현 남용이 없습니다. 👍" />
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal creative-studio" ref={dialogRef} role="dialog" aria-modal="true" aria-label="창작 스튜디오" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="sparkle" size={20} /> 창작 스튜디오 <span className="cs-count">{totalCount}개 도구</span></h2>
        <div className="cs-body">
          <nav className="cs-nav">
            <div className="cs-nav-search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="도구 검색…" aria-label="도구 검색" />
              {q && <button className="cs-nav-clear" onClick={() => setQ('')} aria-label="검색 지우기"><Icon name="close" size={14} mono /></button>}
            </div>
            {filtered.map((grp) => {
              // 검색 중이거나, 펼침 지정했거나, 현재 선택 도구가 이 그룹에 있으면 펼친다
              const open = !!ql || navOpen.has(grp.group) || grp.items.some((i) => i.id === tool)
              return (
                <div key={grp.group} className="cs-nav-group">
                  <button className="cs-nav-group-title" onClick={() => toggleNav(grp.group)} aria-expanded={open}>
                    <span className="cs-nav-caret">{open ? '▾' : '▸'}</span>
                    <span className="cs-nav-group-name">{grp.group}</span>
                    <span className="cs-nav-count">{grp.items.length}</span>
                  </button>
                  {open && grp.items.map((t) => (
                    <button key={t.id} className={'cs-nav-item' + (tool === t.id ? ' active' : '')} onClick={() => setTool(t.id)}>
                      <span className="cs-nav-icon"><Icon name={iconForTool(t)} size={16} /></span> {t.name}
                    </button>
                  ))}
                </div>
              )
            })}
            {filtered.length === 0 && <div className="cs-nav-empty">검색 결과가 없습니다</div>}
          </nav>
          <div className="cs-panel">
            {render()}
            {flash && <div className="cs-flash">{flash}</div>}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
