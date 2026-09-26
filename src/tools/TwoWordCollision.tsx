// 두 단어 충돌 — 무작위 명사 두 개를 부딪쳐 "이 둘을 한 이야기에" 글감을 만든다.
// 자급식 로컬 대량 명사 풀(약 200+개) + 선택적으로 Datamuse(ml=means-like, 키 불필요·https·CORS)로 한쪽을 확장.
// 다시 굴리기 / 한쪽 잠금 / 스니펫·프로젝트 저장. react 와 './linkbus' 외 import 없음.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'two-word-collision', name: '두 단어 충돌', icon: '💥', group: '영감·발상', intro: '무작위 두 단어를 부딪쳐 한 이야기로 엮는 글감을 만드세요', w: 460, h: 600 }

// ---------- 로컬 명사 풀(구체·추상 섞어 충돌의 결을 다양하게) ----------
const POOL: string[] = [
  // 자연·풍경
  '등대', '안개', '폭설', '해일', '운석', '동굴', '빙하', '사막', '늪지', '협곡',
  '오로라', '천둥', '모래시계', '소용돌이', '폐허', '온천', '화산', '밀림', '갯벌', '눈보라',
  // 사물·도구
  '회중시계', '오르골', '나침반', '거울', '열쇠', '편지', '유리병', '카세트테이프', '망원경', '재봉틀',
  '타자기', '레코드판', '촛대', '지도', '반지', '가면', '인장', '주판', '저울', '램프',
  '우산', '실타래', '바늘', '깃펜', '도장', '현미경', '확성기', '진자', '나선계단', '회전목마',
  // 장소·건물
  '도서관', '천문대', '등대지기집', '놀이공원', '종착역', '세탁소', '우체국', '극장', '시계탑', '수도원',
  '온실', '지하실', '다락방', '항구', '시장', '병원', '감옥', '박물관', '여관', '서커스',
  // 사람·역할
  '점쟁이', '마술사', '필경사', '시계공', '밀수꾼', '사서', '광대', '연금술사', '인형사', '뱃사공',
  '쌍둥이', '도둑', '왕', '거지', '간호사', '탐정', '배우', '광부', '약초꾼', '집배원',
  // 생물·동물
  '고래', '까마귀', '나방', '여우', '거미', '올빼미', '늑대', '문어', '반딧불이', '뱀',
  '사슴', '갈매기', '두꺼비', '벌집', '고양이', '말벌', '해파리', '도마뱀', '비둘기', '잉어',
  // 추상·감정·개념
  '망각', '약속', '비밀', '복수', '그리움', '용서', '운명', '거짓말', '침묵', '예언',
  '향수', '죄책감', '자유', '경계', '환생', '저주', '기적', '메아리', '유령', '꿈',
  '시간', '기억', '그림자', '경계선', '소문', '유산', '계약', '의식', '전설', '징조',
  // 신체·감각
  '심장', '손바닥', '발자국', '목소리', '숨결', '눈물', '흉터', '맥박', '체온', '지문',
  // 음식·생활
  '소금', '꿀', '빵', '와인', '얼음', '재', '잉크', '향', '비누', '실밥',
  // 시간·기상·천체
  '자정', '새벽', '일식', '혜성', '조수', '계절', '월식', '북극성', '장마', '서리',
  // 음악·예술
  '악보', '현악기', '북소리', '벽화', '조각상', '필름', '무대막', '메트로놈', '음계', '초상화',
  // 이동·교통
  '야간열차', '돛단배', '기구', '잠수함', '마차', '자전거', '나룻배', '관람차', '연', '썰매',
]

// 영어 입력을 받아오면 한글 결과와 자연스레 섞일 수 있게 영어 단어도 그대로 면으로 사용 가능.
const LS = 'sry:tool:two-word-collision'
const pick = (a: string[], avoid?: string) => {
  if (a.length === 0) return ''
  if (a.length === 1) return a[0]
  let v = a[Math.floor(Math.random() * a.length)]
  if (avoid && v === avoid) v = a[Math.floor(Math.random() * a.length)] // 같은 단어 연속 회피(가벼운 1회 재시도)
  return v
}

// 두 단어를 엮는 글감 템플릿(무작위로 골라 매번 결이 다르게).
const TEMPLATES: ((a: string, b: string) => string)[] = [
  (a, b) => `「${a}」와(과) 「${b}」가 같은 이야기에 있다면, 둘은 어떻게 만날까?`,
  (a, b) => `「${a}」가 「${b}」의 비밀을 쥐고 있다.`,
  (a, b) => `「${b}」 때문에 「${a}」가 모든 것을 잃는 하루.`,
  (a, b) => `「${a}」와(과) 「${b}」 사이에 누구도 몰랐던 약속이 있었다.`,
  (a, b) => `「${a}」를 지키려는 자와 「${b}」를 노리는 자의 충돌.`,
  (a, b) => `매일 밤 「${a}」가 「${b}」로 변한다면.`,
  (a, b) => `「${b}」가 사라진 자리에 「${a}」만 남았다.`,
  (a, b) => `「${a}」와(과) 「${b}」, 둘 중 하나는 거짓말이다.`,
  (a, b) => `「${a}」가 「${b}」에게 보내는 마지막 편지.`,
  (a, b) => `「${a}」와(과) 「${b}」가 뒤바뀐 세계.`,
]

const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function TwoWordCollision({ payload }: { payload?: Record<string, unknown> }) {
  // 두 면(left/right). 잠금된 면은 다시 굴려도 유지.
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [lockL, setLockL] = useState(false)
  const [lockR, setLockR] = useState(false)
  const [tplIdx, setTplIdx] = useState(0)
  const [seedKey, setSeedKey] = useState('')     // 충돌 시 템플릿/표시 갱신용
  const [rolling, setRolling] = useState(false)

  // Datamuse 확장: 입력 주제어로 의미 유사 명사를 풀에 추가.
  const [expandQ, setExpandQ] = useState('')
  const [extra, setExtra] = useState<string[]>([])  // 확장으로 들어온 단어들(주로 right 쪽 후보로 섞임)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const nonce = useRef(0)

  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }, [])

  // 상태 자동 저장/복원(워크시트류 규약)
  const restored = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Partial<{ left: string; right: string; lockL: boolean; lockR: boolean; extra: string[]; expandQ: string; tplIdx: number }>
        if (typeof s.left === 'string') setLeft(s.left)
        if (typeof s.right === 'string') setRight(s.right)
        if (typeof s.lockL === 'boolean') setLockL(s.lockL)
        if (typeof s.lockR === 'boolean') setLockR(s.lockR)
        if (Array.isArray(s.extra)) setExtra(s.extra.filter((x) => typeof x === 'string').slice(0, 200))
        if (typeof s.expandQ === 'string') setExpandQ(s.expandQ)
        if (typeof s.tplIdx === 'number') setTplIdx(s.tplIdx)
      }
    } catch { /* ignore */ }
    restored.current = true
    // 페이로드로 주제어가 오면 확장 입력에 채움(연계 진입)
    if (payload && typeof payload['word'] === 'string') setExpandQ(payload['word'] as string)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try {
      localStorage.setItem(LS, JSON.stringify({ left, right, lockL, lockR, extra: extra.slice(0, 200), expandQ, tplIdx }))
    } catch { /* 용량 초과 등 무시 */ }
  }, [left, right, lockL, lockR, extra, expandQ, tplIdx])

  // 굴림 애니메이션 자동 해제 + 언마운트 정리
  useEffect(() => {
    if (!rolling) return
    const t = window.setTimeout(() => setRolling(false), 360)
    return () => window.clearTimeout(t)
  }, [rolling, seedKey])

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  // 충돌(굴리기): 잠기지 않은 면만 새로 뽑고, 템플릿도 새로 고른다.
  const collide = useCallback(() => {
    setRolling(true)
    const rightPool = extra.length ? [...POOL, ...extra, ...extra] : POOL // 확장 단어 가중치↑
    setLeft((cur) => (lockL && cur ? cur : pick(POOL, cur)))
    setRight((cur) => (lockR && cur ? cur : pick(rightPool, cur)))
    setTplIdx(Math.floor(Math.random() * TEMPLATES.length))
    setSeedKey(Date.now().toString(36))
  }, [extra, lockL, lockR])

  // 첫 진입 시 비어 있으면 한 번 자동 충돌(복원된 결과가 없을 때만)
  useEffect(() => {
    if (!restored.current) return
    if (!left && !right) collide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored.current])

  // 템플릿만 다시(같은 두 단어로 다른 각도)
  const reSpin = () => { setTplIdx((i) => (i + 1) % TEMPLATES.length); setSeedKey(Date.now().toString(36)) }

  // Datamuse 확장: 의미 유사 명사 가져오기
  const expand = async () => {
    const q = expandQ.trim()
    if (!q) { setErr('확장할 주제어(영어가 가장 정확)를 입력하세요.'); return }
    const my = ++nonce.current
    setLoading(true); setErr('')
    try {
      const r = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(q)}&max=20`)
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json() as { word: string }[]
      if (my !== nonce.current) return
      const words = (Array.isArray(j) ? j : [])
        .map((w) => (w && typeof w.word === 'string' ? w.word.trim() : ''))
        .filter((w) => w && w.length <= 24)
      if (words.length === 0) { setErr('관련 단어를 찾지 못했습니다. 다른 주제어로 시도하세요.'); return }
      setExtra((prev) => Array.from(new Set([...words, ...prev])).slice(0, 120))
      flash(`확장 단어 ${words.length}개를 풀에 더했습니다.`)
    } catch {
      if (my === nonce.current) setErr('확장 단어를 불러오지 못했습니다. 네트워크를 확인하세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }
  const clearExtra = () => { setExtra([]); flash('확장 단어를 비웠습니다.') }

  const ready = !!(left && right)
  const tpl = TEMPLATES[Math.min(tplIdx, TEMPLATES.length - 1)] || TEMPLATES[0]
  const seedText = ready ? tpl(left, right) : '아래 〈충돌〉을 눌러 두 단어를 부딪쳐 보세요.'

  // ---------- 출력(복사/스니펫/프로젝트) ----------
  const plainText = () => `💥 ${left} × ${right}\n✍️ ${seedText}`

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(plainText()).then(() => flash('클립보드에 복사했습니다.')).catch(() => { /* graceful */ })
  }

  const saveSnippet = () => {
    if (!ready) return
    addToLibrary('snippets', { text: plainText(), source: '두 단어 충돌', tags: ['글감', '발상', left, right] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = [
      `<p style="font-size:15px;line-height:1.7;"><b>✍️ ${escapeHtml(seedText)}</b></p>`,
      `<hr/>`,
      `<p><b>💥 충돌:</b> ${escapeHtml(left)} × ${escapeHtml(right)}</p>`,
    ].join('')
    const id = addToProject({ kind: 'text', root: 'research', folder: '영감 메모', title: `💥 ${left} × ${right}`, bodyHtml })
    flash(id ? '프로젝트 자료 〈영감 메모〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const card: React.CSSProperties = { flex: 1, minWidth: 0, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 12px', textAlign: 'center', position: 'relative' }
  const wordStyle = (locked: boolean, has: boolean): React.CSSProperties => ({
    fontSize: 20, fontWeight: 700, lineHeight: 1.3, wordBreak: 'keep-all',
    color: has ? 'var(--text)' : 'var(--muted)', opacity: rolling && !locked ? 0.35 : 1, transition: 'opacity .25s',
  })
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 13 }

  return (
    <div style={wrap}>
      <div style={hint}>
        무작위 <b>두 단어</b>를 부딪쳐 "이 둘을 한 이야기에" 글감을 만듭니다. 마음에 드는 쪽은 <Emoji e="🔒"/>로 고정하고 나머지만 다시 굴리세요.
      </div>

      {/* 두 단어 카드 */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <div style={card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>단어 A</div>
          <div style={wordStyle(lockL, !!left)}>{left || '— ?? —'}</div>
          <button
            className="minibtn"
            onClick={() => setLockL((v) => !v)}
            title={lockL ? '고정 해제' : '이 단어 고정'}
            style={{ marginTop: 10, borderColor: lockL ? 'var(--accent)' : 'var(--border)' }}
          >
            {lockL ? <><Emoji e="🔒"/> 고정됨</> : <><Emoji e="🔓"/> 고정</>}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: 'var(--accent)', flexShrink: 0 }}><Emoji e="💥"/></div>

        <div style={card}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>단어 B{extra.length ? ' · 확장' : ''}</div>
          <div style={wordStyle(lockR, !!right)}>{right || '— ?? —'}</div>
          <button
            className="minibtn"
            onClick={() => setLockR((v) => !v)}
            title={lockR ? '고정 해제' : '이 단어 고정'}
            style={{ marginTop: 10, borderColor: lockR ? 'var(--accent)' : 'var(--border)' }}
          >
            {lockR ? <><Emoji e="🔒"/> 고정됨</> : <><Emoji e="🔓"/> 고정</>}
          </button>
        </div>
      </div>

      {/* 글감 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)', fontSize: 13 }}><Emoji e="✍️"/> 한 이야기로 엮기</div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: ready ? 'var(--text)' : 'var(--muted)' }}>{seedText}</div>
        {ready && (
          <button className="linkbtn" onClick={reSpin} style={{ marginTop: 8 }} title="같은 두 단어로 다른 각도의 질문">
            <Emoji e="🔄"/> 다른 각도로
          </button>
        )}
      </div>

      {/* 주요 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={collide}><Emoji e="💥"/> 충돌시키기</button>
        <button className="minibtn" onClick={copy} disabled={!ready}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready} title="공유 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '글감을 프로젝트 자료 〈영감 메모〉 폴더에 메모로 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {/* Datamuse 확장 */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={hint}><Emoji e="🌐"/> <b>풀 확장(선택)</b> — 주제어와 의미가 가까운 단어들을 단어 B 후보에 더합니다(영어가 가장 정확).</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={expandQ}
            onChange={(e) => setExpandQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') expand() }}
            placeholder="예: ocean / memory / forest"
            style={inputStyle}
          />
          <button className="minibtn" onClick={expand} disabled={loading}>{loading ? '…' : '확장'}</button>
          {extra.length > 0 && <button className="minibtn" onClick={clearExtra} title="확장 단어 비우기">지움({extra.length})</button>}
        </div>
        {err && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{err}</div>}
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div className="license-note">
        명사 풀은 자체 제작(자유 사용). 확장 단어 출처: Datamuse API(api.datamuse.com, 키 불필요).
      </div>
    </div>
  )
}
