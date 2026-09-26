// 글쓰기·소설쓰기 만능 단어·표현 사전 — 카테고리 펼침 탐색 + 검색 + 무작위 보기 + 클릭 복사 + 연계.
// 데이터는 ./data/worddict (계속 확장). react/linkbus 외 유일 예외로 자체 데이터 모듈을 import.
import { useMemo, useState } from 'react'
import { addToLibrary, openToolLinked, addToProject, hasProjectBridge } from './linkbus'
import { WORD_DICT, type DictCategory } from './data/worddict'

export const meta = { id: 'writing-dictionary', name: '만능 단어·표현 사전', icon: '📚', group: '언어·어휘', intro: '감정·성격·행동·묘사·풍경·범죄… 글쓰기 단어/표현을 펼쳐보거나 무작위로', w: 540, h: 640 }

type Mode = 'browse' | 'random'
const TOTAL = WORD_DICT.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.words.length, 0), 0)

function flatten(cats: DictCategory[]): { word: string; cat: string; sub: string }[] {
  const out: { word: string; cat: string; sub: string }[] = []
  for (const c of cats) for (const g of c.groups) for (const w of g.words) out.push({ word: w, cat: c.label, sub: g.sub })
  return out
}
const ALL = flatten(WORD_DICT)
const escapeHtml = (str: string) =>
  String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function sampleRandom(n: number) {
  const out: typeof ALL = []
  const used = new Set<number>()
  let guard = 0
  while (out.length < n && guard++ < n * 20 && used.size < ALL.length) {
    const i = Math.floor(Math.random() * ALL.length)
    if (used.has(i)) continue
    used.add(i); out.push(ALL[i])
  }
  return out
}

export default function WritingDictionary() {
  const [mode, setMode] = useState<Mode>('browse')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ [WORD_DICT[0]?.key]: true })
  const [rand, setRand] = useState(() => sampleRandom(24))
  const [toast, setToast] = useState('')

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!ql) return WORD_DICT
    return WORD_DICT.map((c) => ({
      ...c,
      groups: c.groups.map((g) => ({ ...g, words: g.words.filter((w) => w.toLowerCase().includes(ql)) })).filter((g) => g.words.length),
    })).filter((c) => c.groups.length || c.label.toLowerCase().includes(ql))
  }, [ql])

  const copyWord = (w: string) => {
    const done = () => { setToast('복사됨: ' + w); setTimeout(() => setToast(''), 1200) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(w).then(done).catch(() => fallbackCopy(w, done))
    else fallbackCopy(w, done)
  }
  const fallbackCopy = (w: string, done: () => void) => {
    try { const ta = document.createElement('textarea'); ta.value = w; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done() } catch { setToast('복사 실패 — 직접 선택하세요'); setTimeout(() => setToast(''), 1400) }
  }
  const saveWord = (w: string, cat: string, sub: string) => {
    addToLibrary('snippets', { text: w, source: '단어 사전 · ' + cat + '/' + sub, tags: [cat] })
    setToast('스니펫 저장: ' + w); setTimeout(() => setToast(''), 1200)
  }

  // 현재 화면에 보이는 단어 묶음을 모은다 — 무작위 모드: 현재 무작위 목록 / 펼쳐보기 모드: 검색·펼침으로 실제 보이는 단어들.
  // 형태: { cat, sub, words[] } 그룹 배열(빈 그룹 제외).
  const visibleGroups = useMemo(() => {
    type G = { cat: string; sub: string; words: string[] }
    if (mode === 'random') {
      const map = new Map<string, G>()
      for (const r of rand) {
        const key = r.cat + '\x00' + r.sub
        const g = map.get(key) || { cat: r.cat, sub: r.sub, words: [] }
        if (!g.words.includes(r.word)) g.words.push(r.word)
        map.set(key, g)
      }
      return [...map.values()]
    }
    // browse: 검색어가 있으면 모두 펼쳐진 것으로 간주(렌더 로직과 동일), 아니면 펼쳐진 카테고리만.
    const out: G[] = []
    for (const c of filtered) {
      const isOpen = !!open[c.key] || !!ql
      if (!isOpen) continue
      for (const g of c.groups) if (g.words.length) out.push({ cat: c.label, sub: g.sub, words: [...g.words] })
    }
    return out
  }, [mode, rand, filtered, open, ql])

  const visibleCount = useMemo(() => visibleGroups.reduce((n, g) => n + g.words.length, 0), [visibleGroups])

  // 현재 보이는 단어 묶음을 프로젝트 자료 〈표현 모음〉 폴더에 메모로 추가.
  const addCurrentToProject = () => {
    if (!visibleGroups.length || !hasProjectBridge()) return
    const when = mode === 'random' ? '무작위로 모은' : (ql ? `“${q.trim()}” 검색` : '펼쳐본 카테고리의')
    const bodyHtml =
      `<p>${escapeHtml(when)} 표현 ${visibleCount}개 묶음입니다.</p>` +
      visibleGroups.map((g) =>
        `<p><b>${escapeHtml(g.cat)} · ${escapeHtml(g.sub)}</b></p>` +
        `<p>${g.words.map((w) => escapeHtml(w)).join(', ')}</p>`,
      ).join('')
    const title = mode === 'random'
      ? `표현 모음 — 무작위 ${visibleCount}개`
      : (ql ? `표현 모음 — “${q.trim()}” ${visibleCount}개` : `표현 모음 — ${visibleCount}개`)
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '표현 모음',
      title,
      bodyHtml,
    })
    if (id) {
      setToast(`프로젝트 자료 〈표현 모음〉에 표현 ${visibleCount}개를 추가했습니다.`)
      setTimeout(() => setToast(''), 2200)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={'minibtn' + (mode === 'browse' ? ' active' : '')} onClick={() => setMode('browse')}>📂 펼쳐보기</button>
        <button className={'minibtn' + (mode === 'random' ? ' active' : '')} onClick={() => setMode('random')}>🎲 무작위</button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{TOTAL.toLocaleString()}개 표현 · {WORD_DICT.length}개 분야</span>
      </div>

      {mode === 'browse' && (
        <input className="field" placeholder="단어·표현 검색…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mode === 'browse' && filtered.map((c) => {
          const isOpen = !!open[c.key] || !!ql
          return (
            <div key={c.key} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))}
                style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'var(--panel)', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{c.icon} {c.label}</span><span style={{ color: 'var(--muted)' }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 10px 10px' }}>
                  {c.groups.map((g) => (
                    <div key={g.sub} style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{g.sub}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {g.words.map((w) => (
                          <span key={w} className="wd-chip" onClick={() => copyWord(w)} onContextMenu={(e) => { e.preventDefault(); saveWord(w, c.label, g.sub) }} title="클릭 복사 · 우클릭 스니펫 저장">{w}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {mode === 'browse' && filtered.length === 0 && <div style={{ color: 'var(--muted)', padding: 16, textAlign: 'center' }}>“{q}” 결과가 없습니다.</div>}

        {mode === 'random' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rand.map((r, i) => (
              <span key={i} className="wd-chip" onClick={() => copyWord(r.word)} onContextMenu={(e) => { e.preventDefault(); saveWord(r.word, r.cat, r.sub) }} title={r.cat + ' / ' + r.sub + ' · 클릭 복사 · 우클릭 저장'}>{r.word}<span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 4 }}>{r.cat}</span></span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {mode === 'random' && <button className="btn-primary" onClick={() => setRand(sampleRandom(24))}>🎲 다시 섞기</button>}
        <button className="minibtn" onClick={() => openToolLinked('character-sheet')}>🪪 인물 시트</button>
        <button className="minibtn" onClick={() => openToolLinked('setting-bible')}>🏞 배경 설정집</button>
        <button
          className="linkbtn"
          onClick={addCurrentToProject}
          disabled={!hasProjectBridge() || visibleCount === 0}
          title={!hasProjectBridge()
            ? '프로젝트에 연결되어 있지 않습니다'
            : visibleCount === 0
              ? '저장할 표현이 없습니다 (무작위 목록을 뽑거나 카테고리를 펼치세요)'
              : `현재 보이는 표현 ${visibleCount}개를 프로젝트 자료 〈표현 모음〉 폴더에 메모로 추가`}
        >
          📄 프로젝트 자료로
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{toast || '단어를 클릭하면 복사, 우클릭하면 스니펫으로 저장됩니다.'}</div>
    </div>
  )
}
