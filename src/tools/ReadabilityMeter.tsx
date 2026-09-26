// 가독성 측정기 — 텍스트를 붙여넣으면 한국어/영어 가독성 지표를 로컬에서 계산한다.
// 한국어: 문장당 평균 어절·음절, 한자어 추정 비율, 긴 문장 비율 / 영어: Flesch Reading Ease 근사.
// 외부 API 없음(전부 정규식·계산). react 외 import 없음. 언마운트 안전(타이머/구독 없음).
import { useState, useMemo, useRef } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'readability-meter', name: '가독성 측정기', icon: '📏', group: '교정·언어', intro: '한국어·영어 글의 가독성 점수와 난이도 등급, 긴 문장을 짚어줍니다', w: 480, h: 620 }

// ── 텍스트 분해 유틸 ───────────────────────────────────────────────
// 문장 분리: 마침표/물음표/느낌표(연속 포함)와 개행을 경계로 자른다. 빈 조각 제거.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]+)\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// 한글 음절(가-힣) 개수
function countHangulSyllables(s: string): number {
  const m = s.match(/[가-힣]/g)
  return m ? m.length : 0
}

// 한국어 어절: 한글이 하나라도 포함된 공백 구분 토큰
function countEojeol(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).filter((w) => /[가-힣]/.test(w)).length
}

// 영어 단어: 알파벳을 포함한 토큰
function countEnglishWords(s: string): number {
  const m = s.match(/[A-Za-z][A-Za-z'’-]*/g)
  return m ? m.length : 0
}

// 영어 음절 추정(휴리스틱): 모음 그룹 수 - 묵음 e 보정, 최소 1
function syllablesInWord(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  s = s.replace(/^y/, '')
  const groups = s.match(/[aeiouy]{1,2}/g)
  const n = groups ? groups.length : 0
  return n > 0 ? n : 1
}

function countEnglishSyllables(s: string): number {
  const m = s.match(/[A-Za-z][A-Za-z'’-]*/g)
  if (!m) return 0
  return m.reduce((acc, w) => acc + syllablesInWord(w), 0)
}

// 한자어 추정: 음절이 받침 없는 한자 빈출 패턴이라기보다, 한자(CJK)·한자어 사전이 없으므로
// (1) 실제 한자(漢字) 문자, (2) 한자어에서 변별력 있는 2글자 접미 휴리스틱으로 "대략" 근사한다.
// 정확한 형태소 분석이 아님을 UI에서 명시한다.
// 주의: '의/적/성/도/자/사' 같은 초고빈도 1글자(조사·접미)는 한자어 아닌 경우가 너무 많아 과대 오탐을
//   유발하므로 제외하고, 변별력 있는 2글자 접미만 사용한다. 같은 음절을 이중 계산하지 않는다.
const SINO_HINTS = ['주의', '주의자', '화하', '성화', '학적', '론적', '제도', '체제', '관념']
function estimateSinoRatio(text: string): number {
  const syl = countHangulSyllables(text)
  if (syl === 0) return 0
  // 실제 한자 문자
  const hanja = (text.match(/[㐀-䶿一-鿿]/g) || []).length
  // 한자어 추정 음절(2글자 접미 힌트 기반) — 한 음절을 중복 집계하지 않도록 매칭 위치를 표시한다.
  const counted = new Array(text.length).fill(false)
  let hint = 0
  for (const h of new Set(SINO_HINTS)) {
    const re = new RegExp(h, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      for (let i = 0; i < h.length; i++) {
        const pos = m.index + i
        const ch = text[pos]
        // 한글 음절만, 아직 집계되지 않은 위치만 1회 집계
        if (!counted[pos] && ch >= '가' && ch <= '힣') {
          counted[pos] = true
          hint += 1
        }
      }
    }
  }
  const est = Math.min(syl, hanja + hint)
  return est / syl
}

interface SentInfo { text: string; eojeol: number; syl: number; enWords: number; isLong: boolean }

// 언어 비중 판정
function langProfile(text: string): { ko: number; en: number; primary: 'ko' | 'en' | 'mix' } {
  const ko = countHangulSyllables(text)
  const en = countEnglishWords(text)
  const total = ko + en
  if (total === 0) return { ko: 0, en: 0, primary: 'mix' }
  const koR = ko / total
  return { ko, en, primary: koR >= 0.65 ? 'ko' : koR <= 0.2 ? 'en' : 'mix' }
}

// 영어 Flesch Reading Ease 근사: 206.835 - 1.015*(words/sent) - 84.6*(syll/word)
function fleschReadingEase(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0
  const v = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  return Math.max(0, Math.min(100, v))
}

function fleschGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '매우 쉬움 (초등 저학년)', color: 'var(--ok)' }
  if (score >= 70) return { label: '쉬움 (초·중등)', color: 'var(--ok)' }
  if (score >= 60) return { label: '보통 (중등)', color: 'var(--accent)' }
  if (score >= 50) return { label: '약간 어려움 (고등)', color: 'var(--warn)' }
  if (score >= 30) return { label: '어려움 (대학)', color: 'var(--warn)' }
  return { label: '매우 어려움 (전문·학술)', color: 'var(--warn)' }
}

// 한국어 가독성 점수(0~100, 자체 근사): 문장당 어절·긴문장비율·한자어비율이 높을수록 낮은 점수.
function koreanScore(avgEojeol: number, longRatio: number, sinoRatio: number): number {
  // 기준: 문장당 평균 어절 12 이하·긴문장 0·한자어 0 일 때 100 근처.
  const eojeolPenalty = Math.max(0, (avgEojeol - 8)) * 4.5
  const longPenalty = longRatio * 35
  const sinoPenalty = sinoRatio * 25
  const v = 100 - eojeolPenalty - longPenalty - sinoPenalty
  return Math.max(0, Math.min(100, v))
}

function koreanGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '아주 잘 읽힘', color: 'var(--ok)' }
  if (score >= 65) return { label: '잘 읽힘', color: 'var(--ok)' }
  if (score >= 50) return { label: '보통', color: 'var(--accent)' }
  if (score >= 35) return { label: '다소 빽빽함', color: 'var(--warn)' }
  return { label: '매우 빽빽함', color: 'var(--warn)' }
}

const LONG_SENT_EOJEOL = 25 // 어절 이상이면 긴 문장(한국어)
const LONG_SENT_WORDS = 30 // 단어 이상이면 긴 문장(영어)

export default function ReadabilityMeter() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const analysis = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return null
    const sentences = splitSentences(trimmed)
    if (sentences.length === 0) return null

    const profile = langProfile(trimmed)

    const sents: SentInfo[] = sentences.map((s) => {
      const eojeol = countEojeol(s)
      const syl = countHangulSyllables(s)
      const enWords = countEnglishWords(s)
      const isLong = profile.primary === 'en'
        ? enWords >= LONG_SENT_WORDS
        : eojeol >= LONG_SENT_EOJEOL
      return { text: s, eojeol, syl, enWords, isLong }
    })

    const nSent = sents.length
    const totalEojeol = sents.reduce((a, s) => a + s.eojeol, 0)
    const totalSyl = sents.reduce((a, s) => a + s.syl, 0)
    const totalEnWords = sents.reduce((a, s) => a + s.enWords, 0)
    const longCount = sents.filter((s) => s.isLong).length
    const longRatio = nSent > 0 ? longCount / nSent : 0

    const avgEojeol = nSent > 0 ? totalEojeol / nSent : 0
    const avgSyl = nSent > 0 ? totalSyl / nSent : 0
    const sinoRatio = estimateSinoRatio(trimmed)

    // 영어 지표
    const enSyll = countEnglishSyllables(trimmed)
    const flesch = fleschReadingEase(totalEnWords, nSent, enSyll)

    const koScore = koreanScore(avgEojeol, longRatio, sinoRatio)
    const koG = koreanGrade(koScore)
    const enG = fleschGrade(flesch)

    return {
      profile, sents, nSent, totalEojeol, totalSyl, totalEnWords,
      longCount, longRatio, avgEojeol, avgSyl, sinoRatio,
      flesch, koScore, koG, enG, charCount: trimmed.length,
    }
  }, [text])

  const summaryText = useMemo(() => {
    if (!analysis) return ''
    const a = analysis
    const lines: string[] = []
    lines.push('[가독성 측정 결과]')
    lines.push(`문장 ${a.nSent}개 · 글자 ${a.charCount}자`)
    if (a.profile.primary !== 'en') {
      lines.push('— 한국어 —')
      lines.push(`가독성 점수: ${Math.round(a.koScore)}/100 (${a.koG.label})`)
      lines.push(`문장당 평균 어절: ${a.avgEojeol.toFixed(1)}`)
      lines.push(`문장당 평균 음절: ${a.avgSyl.toFixed(1)}`)
      lines.push(`한자어 비율(대략): ${Math.round(a.sinoRatio * 100)}%`)
      lines.push(`긴 문장 비율: ${Math.round(a.longRatio * 100)}% (${a.longCount}/${a.nSent})`)
    }
    if (a.profile.primary !== 'ko' && a.totalEnWords > 0) {
      lines.push('— 영어 —')
      lines.push(`Flesch Reading Ease(근사): ${Math.round(a.flesch)}/100 (${a.enG.label})`)
    }
    return lines.join('\n')
  }, [analysis])

  const markCopied = () => {
    setCopied(true)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
  }

  // execCommand(textarea) 폴백: navigator.clipboard가 없거나 실패할 때 사용
  const fallbackCopy = (s: string): boolean => {
    try {
      const ta = document.createElement('textarea')
      ta.value = s
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      ta.style.left = '-9999px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, s.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  const copy = async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      markCopied()
    } catch {
      // navigator.clipboard 실패 시 execCommand 폴백
      if (fallbackCopy(summaryText)) markCopied()
      else setCopied(false)
    }
  }

  // ── 스타일 ───────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
  const taStyle: React.CSSProperties = {
    minHeight: 96, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
  const stat: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', minWidth: 0 }
  const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.3 }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: 16 }

  const ScoreBig = ({ score, color, label, caption }: { score: number; color: string; label: string; caption: string }) => (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], minWidth: 64, textAlign: 'center' }}>{Math.round(score)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{caption}</div>
        <div style={{ height: 6, background: 'var(--chrome-2)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(score)}%`, height: '100%', background: color, transition: 'width .3s' }} />
        </div>
      </div>
    </div>
  )

  const a = analysis
  const showKo = a && a.profile.primary !== 'en'
  const showEn = a && a.profile.primary !== 'ko' && a.totalEnWords > 0

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={title}><Emoji e="📏"/> 측정할 글을 붙여넣으세요</div>
        <button className="minibtn" onClick={() => setText('')} disabled={!text}>↺ 지우기</button>
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 한국어 또는 영어 텍스트를 붙여넣으세요. 문장 부호로 문장을 구분해 분석합니다."
        spellCheck={false}
        aria-label="가독성 측정 입력"
      />

      {!a ? (
        <div style={empty}>
          글을 입력하면 가독성 점수와 난이도 등급,<br />긴 문장이 표시됩니다.
        </div>
      ) : (
        <div style={scroll}>
          <div style={grid3}>
            <div style={stat}><div style={statVal}>{a.nSent}</div><div style={statLabel}>문장 수</div></div>
            <div style={stat}><div style={statVal}>{a.charCount}</div><div style={statLabel}>글자 수</div></div>
            <div style={stat}><div style={statVal}>{a.longCount}</div><div style={statLabel}>긴 문장</div></div>
          </div>

          {showKo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="🇰🇷"/> 한국어 가독성</div>
              <ScoreBig score={a.koScore} color={a.koG.color} label={a.koG.label} caption="문장당 어절·긴문장·한자어 비율(대략) 기반 근사 점수" />
              <div style={grid3}>
                <div style={stat}><div style={statVal}>{a.avgEojeol.toFixed(1)}</div><div style={statLabel}>문장당 어절</div></div>
                <div style={stat}><div style={statVal}>{a.avgSyl.toFixed(1)}</div><div style={statLabel}>문장당 음절</div></div>
                <div style={stat}><div style={statVal}>{Math.round(a.sinoRatio * 100)}%</div><div style={statLabel}>한자어(대략)</div></div>
              </div>
              <div style={hint}>긴 문장 비율 {Math.round(a.longRatio * 100)}% · {LONG_SENT_EOJEOL}어절 이상을 긴 문장으로 봅니다.</div>
            </div>
          )}

          {showEn && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={sectionTitle}><Emoji e="🔤"/> 영어 가독성 (Flesch Reading Ease 근사)</div>
              <ScoreBig score={a.flesch} color={a.enG.color} label={a.enG.label} caption={`단어 ${a.totalEnWords}개 · 음절은 휴리스틱 추정`} />
            </div>
          )}

          {a.longCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={sectionTitle}><Emoji e="⚠️"/> 긴 문장 ({a.longCount}개) — 끊어 쓰면 더 잘 읽힙니다</div>
              {a.sents.filter((s) => s.isLong).slice(0, 12).map((s, i) => (
                <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--warn)', fontWeight: 700, fontSize: 11, marginRight: 6 }}>
                    {a.profile.primary === 'en' ? `${s.enWords}단어` : `${s.eojeol}어절`}
                  </span>
                  <span style={{ color: 'var(--text)' }}>{s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text}</span>
                </div>
              ))}
            </div>
          )}

          <div style={bar}>
            <div style={hint}>형태소 분석 없이 정규식·휴리스틱으로 계산한 근사값입니다.</div>
            <button className="btn-primary" onClick={copy}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 결과 복사</>}</button>
          </div>
        </div>
      )}
    </div>
  )
}
