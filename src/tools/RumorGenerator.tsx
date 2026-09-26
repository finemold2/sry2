// 소문·풍문 생성기(조합형) — 주막/거리에 떠도는 소문을 [대상 × 내용 × 진위 × 출처]로 무작위 조합해 만든다.
//   세계에 생동감을 불어넣는 배경 소문을 한 번에 여러 개 생성. 슬롯별 🔒 잠금 + 부분 재생성, 가능한 총 조합 수(수십만+) 표시.
//   마음에 든 소문은 스니펫 라이브러리/프로젝트 자료(세계관)에 저장.
// 자급식: react 와 './linkbus' 외 import 없음. Math.random + localStorage(마지막 생성/잠금/보관 자동 저장·복원)만 사용.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'rumor-generator', name: '소문·풍문 생성기', icon: '🗣️', group: '영감·발상', intro: '주막·거리에 떠도는 소문(대상×내용×진위×출처)을 조합해 세계에 생동감을 더하세요', w: 560, h: 620 }

const LS = 'sry:tool:rumor-generator'

// ---------- 슬롯 풀 ----------
// 대상: 소문의 주인공(누구/무엇에 관한 이야기인가)
const TARGETS: string[] = [
  '북쪽 성주', '떠돌이 검객', '폐가의 노파', '왕실 막내 공주', '항구의 밀수꾼 두목',
  '산속 은둔 약초꾼', '가면 쓴 음유시인', '대장간 외팔이 장인', '신전의 어린 무녀', '몰락한 귀족 가문',
  '거리의 점쟁이', '국경 수비대장', '소리 없는 암살자', '술집 주인의 외동딸', '늙은 뱃사공',
  '먼 사막에서 온 상인', '실종된 학자', '숲의 사냥꾼 무리', '광산의 감독관', '떠도는 곡예단',
  '성당의 노사제', '얼음 마녀라 불리는 여인', '왕의 충신이던 노장군', '강 건너 마을 촌장', '한쪽 눈을 가린 용병',
  '귀신 들렸다는 아이', '보석 세공인 형제', '밤에만 문 여는 약방', '폐광을 지키는 자', '이름 없는 거지왕',
]

// 내용: 소문의 알맹이(무슨 일이 벌어졌다더라)
const CONTENTS: string[] = [
  '한밤중에 금화 자루를 묻는 걸 봤다더라',
  '왕가의 핏줄을 숨기고 있다더라',
  '저주받은 검을 손에 넣었다더라',
  '사람을 셋이나 몰래 죽였다더라',
  '용의 알을 키우고 있다더라',
  '죽은 줄 알았는데 멀쩡히 살아 돌아왔다더라',
  '금지된 마법서를 탐독한다더라',
  '적국과 은밀히 내통한다더라',
  '하룻밤 새 머리가 백발이 되었다더라',
  '보름달 밤이면 짐승으로 변한다더라',
  '잃어버린 보물 지도를 갖고 있다더라',
  '신을 모독해 천벌을 받을 거라더라',
  '독약을 다루는 비법을 안다더라',
  '한때 왕좌를 노린 역적이었다더라',
  '죽은 연인의 혼령과 매일 밤 만난다더라',
  '아무도 모르는 지하 통로를 안다더라',
  '병든 자를 손만 대어 낫게 한다더라',
  '빚 때문에 영혼을 팔았다더라',
  '곧 큰 전쟁이 날 거라 떠들고 다닌다더라',
  '왕의 암살을 꾸미고 있다더라',
  '바다 괴물과 거래를 맺었다더라',
  '미래를 내다보는 눈을 가졌다더라',
  '한 번도 진 적 없는 비밀 검술을 익혔다더라',
  '몰래 가짜 화폐를 찍어낸다더라',
  '저세상을 다녀와 그 이야기를 판다더라',
  '봉인된 옛 신을 깨우려 한다더라',
  '귀족의 사생아를 숨겨 기른다더라',
  '역병의 원흉이 바로 그자라더라',
]

// 진위: 소문의 신빙성(얼마나 믿을 만한가)
const TRUTHS: { tag: string; label: string }[] = [
  { tag: '사실', label: '거의 틀림없는 사실이라더라' },
  { tag: '절반', label: '절반은 맞고 절반은 부풀려졌다더라' },
  { tag: '과장', label: '소문이 부풀려져 원래보다 훨씬 커졌다더라' },
  { tag: '거짓', label: '누군가 일부러 퍼뜨린 새빨간 거짓이라더라' },
  { tag: '미궁', label: '아무도 진위를 가늠하지 못한다더라' },
  { tag: '함정', label: '믿게 만들려 꾸민 덫이라는 말도 있다더라' },
  { tag: '예언', label: '오랜 예언과 맞아떨어진다며 두려워한다더라' },
  { tag: '조작', label: '권력자가 시켜 만들어낸 이야기라더라' },
]

// 출처: 소문의 전달 경로(누가 어디서 들었나)
const SOURCES: string[] = [
  '주막 주인이 술김에 흘린 말',
  '시장 어귀 아낙들의 수다',
  '취한 병사가 떠벌린 이야기',
  '떠돌이 음유시인의 노래 한 소절',
  '여관에 묵은 행상이 전한 소식',
  '아이들이 부르는 새 동요',
  '교수대 구경꾼들의 입소문',
  '항구 선원들 사이의 뱃노래',
  '신전 참배객들의 수군거림',
  '도박장 뒷방의 귓속말',
  '빨래터에 모인 여인들의 말',
  '국경을 넘어온 피난민의 증언',
  '한밤 야경꾼이 본 광경',
  '거지들 사이에 도는 풍문',
  '귀족 저택 하인들의 험담',
  '장터 약장수의 너스레',
  '대장간에 모인 사내들의 잡담',
  '순례길에서 만난 노승의 경고',
]

interface Slot { key: 'target' | 'content' | 'truth' | 'source'; label: string; icon: string; pool: number }
const SLOTS: Slot[] = [
  { key: 'target', label: '대상', icon: '👤', pool: TARGETS.length },
  { key: 'content', label: '내용', icon: '💬', pool: CONTENTS.length },
  { key: 'truth', label: '진위', icon: '⚖️', pool: TRUTHS.length },
  { key: 'source', label: '출처', icon: '📢', pool: SOURCES.length },
]

const TOTAL_COMBOS = SLOTS.reduce((m, s) => m * s.pool, 1) // 30·28·8·18 = 120,960

const pick = (n: number) => Math.floor(Math.random() * n)
const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 한 소문 = 슬롯 4개의 인덱스
interface RumorIdx { target: number; content: number; truth: number; source: number }
interface Rumor extends RumorIdx { id: string }

function randomRumor(): RumorIdx {
  return { target: pick(TARGETS.length), content: pick(CONTENTS.length), truth: pick(TRUTHS.length), source: pick(SOURCES.length) }
}
function uid(): string { return 'r_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }

// 자연스러운 한 문장으로 엮기
function rumorSentence(r: RumorIdx): string {
  const t = TARGETS[r.target], c = CONTENTS[r.content], src = SOURCES[r.source]
  return `${src}에 따르면, ${t}이(가) ${c}`
}
function rumorTruthLine(r: RumorIdx): string {
  return TRUTHS[r.truth].label
}
function rumorPlain(r: RumorIdx): string {
  return `${rumorSentence(r)}\n(진위: ${TRUTHS[r.truth].label})`
}

interface SavedRumor extends RumorIdx { id: string }

export default function RumorGenerator({ payload }: { payload?: Record<string, unknown> }) {
  // ---- 단일 생성기(슬롯 잠금/부분 재생성) ----
  const [cur, setCur] = useState<RumorIdx>(() => {
    try {
      const raw = localStorage.getItem(LS + ':cur')
      if (raw) {
        const p = JSON.parse(raw)
        if (p && typeof p.target === 'number') {
          return {
            target: ((p.target % TARGETS.length) + TARGETS.length) % TARGETS.length,
            content: ((p.content % CONTENTS.length) + CONTENTS.length) % CONTENTS.length,
            truth: ((p.truth % TRUTHS.length) + TRUTHS.length) % TRUTHS.length,
            source: ((p.source % SOURCES.length) + SOURCES.length) % SOURCES.length,
          }
        }
      }
    } catch { /* ignore */ }
    return randomRumor()
  })
  const [locked, setLocked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LS + ':locked')
      if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p }
    } catch { /* ignore */ }
    return {}
  })
  const [spin, setSpin] = useState(false)

  // ---- 한 번에 여러 개 ----
  const [batchN, setBatchN] = useState(5)
  const [batch, setBatch] = useState<Rumor[]>([])

  // ---- 보관함 ----
  const [saved, setSaved] = useState<SavedRumor[]>(() => {
    try {
      const raw = localStorage.getItem(LS + ':saved')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr.filter((s) => s && typeof s.target === 'number').map((s) => ({
            id: typeof s.id === 'string' ? s.id : uid(),
            target: ((s.target % TARGETS.length) + TARGETS.length) % TARGETS.length,
            content: ((s.content % CONTENTS.length) + CONTENTS.length) % CONTENTS.length,
            truth: ((s.truth % TRUTHS.length) + TRUTHS.length) % TRUTHS.length,
            source: ((s.source % SOURCES.length) + SOURCES.length) % SOURCES.length,
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  })

  const [tab, setTab] = useState<'one' | 'many' | 'saved'>('one')
  const [toast, setToast] = useState('')
  const payloadDone = useRef(false)

  // 영속화
  useEffect(() => { try { localStorage.setItem(LS + ':cur', JSON.stringify(cur)) } catch { /* ignore */ } }, [cur])
  useEffect(() => { try { localStorage.setItem(LS + ':locked', JSON.stringify(locked)) } catch { /* ignore */ } }, [locked])
  useEffect(() => { try { localStorage.setItem(LS + ':saved', JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  // 토스트 자동 해제(언마운트 정리)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  // 스핀 애니메이션 자동 해제(언마운트 정리)
  useEffect(() => {
    if (!spin) return
    const t = window.setTimeout(() => setSpin(false), 320)
    return () => window.clearTimeout(t)
  }, [spin])

  // 페이로드로 대상 이름이 전달되면(예: 인물 도구에서 연계) 한 번 반영
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const name = typeof payload.name === 'string' ? payload.name
      : typeof payload.target === 'string' ? payload.target : ''
    if (!name) return
    const idx = TARGETS.findIndex((x) => x === name)
    if (idx >= 0) setCur((p) => ({ ...p, target: idx }))
  }, [payload])

  // 잠기지 않은 슬롯만 다시 굴리기
  const reroll = useCallback(() => {
    setSpin(true)
    setCur((prev) => {
      const next = { ...prev }
      if (!locked.target) next.target = pick(TARGETS.length)
      if (!locked.content) next.content = pick(CONTENTS.length)
      if (!locked.truth) next.truth = pick(TRUTHS.length)
      if (!locked.source) next.source = pick(SOURCES.length)
      return next
    })
  }, [locked])

  const toggleLock = (key: string) => setLocked((p) => ({ ...p, [key]: !p[key] }))

  const setSlot = (key: keyof RumorIdx, idx: number) => setCur((p) => ({ ...p, [key]: idx }))
  const cycleSlot = (key: keyof RumorIdx, dir: -1 | 1) => {
    const pool = key === 'target' ? TARGETS.length : key === 'content' ? CONTENTS.length : key === 'truth' ? TRUTHS.length : SOURCES.length
    setCur((p) => ({ ...p, [key]: ((p[key] + dir) % pool + pool) % pool }))
  }

  const generateBatch = () => {
    const n = Math.min(Math.max(1, batchN), 12)
    const out: Rumor[] = []
    for (let i = 0; i < n; i++) out.push({ id: uid(), ...randomRumor() })
    setBatch(out)
  }

  const savedHas = (r: RumorIdx) =>
    saved.some((s) => s.target === r.target && s.content === r.content && s.truth === r.truth && s.source === r.source)

  const saveToBox = (r: RumorIdx) => {
    if (savedHas(r)) { setToast('이미 보관함에 있습니다.'); return }
    setSaved((prev) => [{ id: uid(), target: r.target, content: r.content, truth: r.truth, source: r.source }, ...prev])
    setToast('보관함에 담았습니다.')
  }
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.id !== id))

  const copyOne = (r: RumorIdx) => {
    navigator.clipboard?.writeText(rumorPlain(r))
      .then(() => setToast('복사했습니다.'))
      .catch(() => setToast('복사가 지원되지 않습니다.'))
  }
  const copyMany = (list: RumorIdx[]) => {
    if (!list.length) return
    const text = list.map((r, i) => `${i + 1}. ${rumorPlain(r)}`).join('\n\n')
    navigator.clipboard?.writeText(text)
      .then(() => setToast(`${list.length}개를 복사했습니다.`))
      .catch(() => setToast('복사가 지원되지 않습니다.'))
  }

  // 스니펫 라이브러리 저장(글감)
  const snippetOne = (r: RumorIdx) => {
    addToLibrary('snippets', {
      text: `[소문|${TRUTHS[r.truth].tag}] ${rumorSentence(r)} (${TRUTHS[r.truth].label})`,
      source: '소문·풍문 생성기',
      tags: ['소문', '세계관', '발상', TRUTHS[r.truth].tag, TARGETS[r.target]],
    })
    setToast('스니펫 라이브러리에 저장했습니다.')
  }
  const snippetMany = (list: RumorIdx[]) => {
    if (!list.length) return
    list.forEach((r) => addToLibrary('snippets', {
      text: `[소문|${TRUTHS[r.truth].tag}] ${rumorSentence(r)} (${TRUTHS[r.truth].label})`,
      source: '소문·풍문 생성기',
      tags: ['소문', '세계관', '발상', TRUTHS[r.truth].tag],
    }))
    setToast(`${list.length}개를 스니펫에 저장했습니다.`)
  }

  // 프로젝트(세계관 자료) 저장 — 자료('research')/'소문' 폴더에 문서로
  const rumorHtml = (list: RumorIdx[]): string =>
    list.map((r) => (
      `<p style="margin:0 0 4px"><b>🗣️ ${escHtml(rumorSentence(r))}</b></p>` +
      `<p style="margin:0 0 12px;color:#888"><i>진위(${escHtml(TRUTHS[r.truth].tag)})</i> — ${escHtml(rumorTruthLine(r))}</p>`
    )).join('')

  const toProjectOne = (r: RumorIdx) => {
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '소문',
      title: `🗣️ 소문 — ${TARGETS[r.target]}`,
      bodyHtml: rumorHtml([r]),
      synopsis: rumorSentence(r),
      meta: { 대상: TARGETS[r.target], 진위: TRUTHS[r.truth].tag },
    })
    setToast(id ? '프로젝트 자료 〈소문〉 폴더에 추가했습니다.' : '프로젝트 추가에 실패했습니다.')
  }
  const toProjectMany = (list: RumorIdx[]) => {
    if (!list.length) return
    if (!hasProjectBridge()) { setToast('프로젝트에 연결되어 있지 않습니다.'); return }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '소문',
      title: `🗣️ 떠도는 소문 ${list.length}가지`,
      bodyHtml: rumorHtml(list),
      synopsis: list.map((r) => rumorSentence(r)).join(' / ').slice(0, 120),
      meta: { 소문수: String(list.length) },
    })
    setToast(id ? `프로젝트 자료 〈소문〉 폴더에 ${list.length}개를 추가했습니다.` : '프로젝트 추가에 실패했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const tabBtn = (on: boolean): React.CSSProperties => ({ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' })
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }
  const scroller: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }

  const TruthBadge = ({ truth }: { truth: number }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      <Emoji e="⚖️" /> {TRUTHS[truth].tag}
    </span>
  )

  // 단일 슬롯 줄
  const slotPool = (key: Slot['key']) => key === 'target' ? TARGETS : key === 'content' ? CONTENTS : key === 'truth' ? TRUTHS.map((t) => `[${t.tag}] ${t.label}`) : SOURCES
  const slotValue = (key: Slot['key']) => {
    const arr = slotPool(key)
    return arr[cur[key]]
  }

  return (
    <div style={wrap}>
      <div style={hint}>
        주막·거리에 떠도는 <b>소문</b>을 <b>[대상 × 내용 × 진위 × 출처]</b>로 조합해 만듭니다. 세계에 생동감을 더하는 배경 소문으로 쓰세요.
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setTab('one')} aria-pressed={tab === 'one'} style={tabBtn(tab === 'one')}><Emoji e="🗣️" /> 만들기</button>
        <button className="minibtn" onClick={() => setTab('many')} aria-pressed={tab === 'many'} style={tabBtn(tab === 'many')}><Emoji e="📜" /> 한 번에 여러 개</button>
        <button className="minibtn" onClick={() => setTab('saved')} aria-pressed={tab === 'saved'} style={tabBtn(tab === 'saved')}><Emoji e="⭐" /> 보관함 ({saved.length})</button>
      </div>

      {/* ── 단일 생성 ── */}
      {tab === 'one' && (
        <>
          <div style={scroller}>
            {/* 완성된 소문 미리보기 */}
            <div style={{ ...card, background: 'var(--paper)', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}><Emoji e="🗣️" /> 떠도는 소문</span>
                <span style={{ flex: 1 }} />
                <TruthBadge truth={cur.truth} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, transition: 'opacity .2s', opacity: spin ? 0.4 : 1 }}>
                {rumorSentence(cur)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                <b style={{ color: 'var(--accent)' }}>진위:</b> {rumorTruthLine(cur)}
              </div>
            </div>

            {/* 슬롯 편집(◀ 풀 순환 ▶ + 잠금) */}
            {SLOTS.map((s) => {
              const isLocked = !!locked[s.key]
              return (
                <div key={s.key} style={{ ...card, gap: 6, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 56 }}><Emoji e={s.icon} /> {s.label}</span>
                    <button className="minibtn" onClick={() => cycleSlot(s.key, -1)} title="이전" style={{ padding: '2px 8px' }}>◀</button>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4, textAlign: 'center', minWidth: 0 }}>{slotValue(s.key)}</div>
                    <button className="minibtn" onClick={() => cycleSlot(s.key, 1)} title="다음" style={{ padding: '2px 8px' }}>▶</button>
                    <button className="minibtn" onClick={() => toggleLock(s.key)} title={isLocked ? '고정 해제' : '이 슬롯 고정'}
                      style={{ borderColor: isLocked ? 'var(--accent)' : 'var(--border)' }}>
                      {isLocked ? <Emoji e="🔒" /> : <Emoji e="🔓" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button className="btn-primary" onClick={reroll}><Emoji e="🎲" /> 소문 굴리기 (잠그지 않은 슬롯만)</button>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={() => copyOne(cur)}><Emoji e="📋" /> 복사</button>
            <button className="minibtn" onClick={() => saveToBox(cur)} style={{ borderColor: savedHas(cur) ? 'var(--accent)' : 'var(--border)' }}>
              {savedHas(cur) ? <><Emoji e="⭐" /> 보관됨</> : <>☆ 보관</>}
            </button>
            <button className="minibtn" onClick={() => snippetOne(cur)}><Emoji e="✂️" /> 스니펫 저장</button>
            <button className="linkbtn" onClick={() => toProjectOne(cur)} disabled={!hasProjectBridge()}
              title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '이 소문을 프로젝트 자료 〈소문〉 폴더에 추가'}>
              <Emoji e="📄" /> 프로젝트에 추가
            </button>
          </div>
          <div style={hint}>가능한 조합 약 <b>{TOTAL_COMBOS.toLocaleString('ko-KR')}</b>가지 (대상 {TARGETS.length} × 내용 {CONTENTS.length} × 진위 {TRUTHS.length} × 출처 {SOURCES.length}). <Emoji e="🔒" />로 고정한 슬롯은 다시 굴려도 유지됩니다.</div>
        </>
      )}

      {/* ── 한 번에 여러 개 ── */}
      {tab === 'many' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>한 번에</span>
            {[3, 5, 8, 12].map((n) => (
              <button key={n} className="minibtn" onClick={() => setBatchN(n)} aria-pressed={batchN === n} style={{ ...tabBtn(batchN === n), minWidth: 40 }}>{n}개</button>
            ))}
            <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={generateBatch}><Emoji e="📜" /> 소문 한 묶음 만들기</button>
          </div>

          <div style={scroller}>
            {batch.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="📜" /></div>
                개수를 고르고 <b>소문 한 묶음 만들기</b>를 눌러보세요.<br />
                <span style={{ fontSize: 12 }}>거리에 한꺼번에 풀어놓을 소문 무더기를 생성합니다.</span>
              </div>
            )}
            {batch.map((r, i) => (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{i + 1}.</span>
                  <TruthBadge truth={r.truth} />
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => saveToBox(r)} title="보관"
                    style={{ borderColor: savedHas(r) ? 'var(--accent)' : 'var(--border)' }}>{savedHas(r) ? <Emoji e="⭐" /> : '☆'}</button>
                  <button className="minibtn" onClick={() => copyOne(r)} title="복사"><Emoji e="📋" /></button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{rumorSentence(r)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>진위: {rumorTruthLine(r)}</div>
              </div>
            ))}
          </div>

          {batch.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copyMany(batch)}><Emoji e="📋" /> 모두 복사</button>
              <button className="minibtn" onClick={() => snippetMany(batch)}><Emoji e="✂️" /> 모두 스니펫</button>
              <button className="linkbtn" onClick={() => toProjectMany(batch)} disabled={!hasProjectBridge()}
                title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : `${batch.length}개를 프로젝트 자료 〈소문〉 폴더에 추가`}>
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
            </div>
          )}
          <div style={hint}>가능한 조합 약 <b>{TOTAL_COMBOS.toLocaleString('ko-KR')}</b>가지. 묶음마다 새로 무작위 조합됩니다.</div>
        </>
      )}

      {/* ── 보관함 ── */}
      {tab === 'saved' && (
        <>
          <div style={scroller}>
            {saved.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 16px', lineHeight: 1.6 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="⭐" /></div>
                보관한 소문이 없습니다.<br />
                <span style={{ fontSize: 12 }}>마음에 드는 소문을 ☆로 담아두세요.</span>
              </div>
            )}
            {saved.map((r) => (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TruthBadge truth={r.truth} />
                  <span style={{ flex: 1 }} />
                  <button className="minibtn" onClick={() => copyOne(r)} title="복사"><Emoji e="📋" /></button>
                  <button className="minibtn" onClick={() => snippetOne(r)} title="스니펫 저장"><Emoji e="✂️" /></button>
                  <button className="minibtn" onClick={() => removeSaved(r.id)} title="삭제" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}><Emoji e="🗑" /></button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{rumorSentence(r)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>진위: {rumorTruthLine(r)}</div>
              </div>
            ))}
          </div>
          {saved.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="minibtn" onClick={() => copyMany(saved)}><Emoji e="📋" /> 모두 복사</button>
              <button className="minibtn" onClick={() => snippetMany(saved)}><Emoji e="✂️" /> 모두 스니펫</button>
              <button className="linkbtn" onClick={() => toProjectMany(saved)} disabled={!hasProjectBridge()}
                title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : `보관한 ${saved.length}개를 프로젝트 자료 〈소문〉 폴더에 추가`}>
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
            </div>
          )}
        </>
      )}

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}
