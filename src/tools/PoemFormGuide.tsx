// 시 형식 가이드 — 소네트/시조/하이쿠/자유시/산문시/오행시 등 형식별 규칙·예시·빈 템플릿을 제공한다.
// 형식을 고르면 빈 템플릿이 작성칸에 채워지고, 쓴 시는 worktree(작품)로 저장/복원(localStorage)된다.
// 자급식: react 외에 './linkbus' 만 import. 외부 네트워크 없음.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'poem-form-guide', name: '시 형식 가이드', icon: '🪶', group: '언어·어휘', intro: '소네트·시조·하이쿠·자유시·산문시·오행시 등 형식별 규칙·예시·빈 템플릿', w: 640, h: 660 }

const LS_KEY = 'sry:tool:poem-form-guide'

interface PoemForm {
  id: string
  name: string
  origin: string       // 유래/지역
  summary: string      // 한 줄 요약
  rules: string[]      // 형식 규칙
  example: { title: string; author: string; body: string } // 예시(퍼블릭 도메인/전통)
  template: string     // 빈 템플릿(작성칸에 넣을 골격)
  tip: string          // 작법 팁
}

// 형식 사전 — 예시는 퍼블릭 도메인(전통·고전)만 사용.
const FORMS: PoemForm[] = [
  {
    id: 'sonnet',
    name: '소네트 (Sonnet)',
    origin: '이탈리아·영국 · 14행 정형시',
    summary: '14행으로 짜인 서양의 대표 정형시. 한 가지 생각을 압축해 전환·결론으로 매듭짓는다.',
    rules: [
      '총 14행으로 구성한다.',
      '셰익스피어식: 4행연 3개(quatrain) + 2행 대구(couplet) = abab cdcd efef gg 운율.',
      '페트라르카식: 8행(octave) + 6행(sestet)으로 나뉘며 9행에서 전환(volta)이 일어난다.',
      '본래는 약강 5보격(iambic pentameter, 한 행 10음절)이지만, 한국어로는 행마다 비슷한 호흡·음수로 대신한다.',
      '마지막 2행(또는 6행)에서 앞의 생각을 뒤집거나 결론으로 매듭짓는다.',
    ],
    example: {
      title: 'Sonnet 18 (발췌·원문)',
      author: 'William Shakespeare',
      body: 'Shall I compare thee to a summer’s day?\nThou art more lovely and more temperate.\n…\nSo long as men can breathe or eyes can see,\nSo long lives this, and this gives life to thee.',
    },
    template:
      '[제목]\n\n' +
      '1행 (a) — 첫 생각을 제시\n' +
      '2행 (b)\n' +
      '3행 (a)\n' +
      '4행 (b)\n\n' +
      '5행 (c) — 생각을 전개\n' +
      '6행 (d)\n' +
      '7행 (c)\n' +
      '8행 (d)\n\n' +
      '9행 (e) — 새 국면/심화\n' +
      '10행 (f)\n' +
      '11행 (e)\n' +
      '12행 (f)\n\n' +
      '13행 (g) — 전환·결론\n' +
      '14행 (g)',
    tip: '13~14행의 대구에서 앞 12행을 한 번에 뒤집거나 요약하면 여운이 깊어진다.',
  },
  {
    id: 'sijo',
    name: '시조 (時調)',
    origin: '한국 전통 · 3장 정형시',
    summary: '초장·중장·종장 3장으로 된 한국 고유 정형시. 종장 첫 음보 3글자가 핵심 규칙.',
    rules: [
      '초장·중장·종장의 3장(3줄)으로 짓는다.',
      '각 장은 네 음보로 나뉘며, 한 장이 대략 14~16자(전체 45자 안팎).',
      '음수율 기준: 3-4-4(3)-4 / 3-4-4(3)-4 / 3-5-4-3.',
      '종장 첫 음보는 반드시 3글자로 고정한다(이 규칙이 시조의 핵심).',
      '종장 둘째 음보는 5글자 이상으로 길게 펼쳐 마무리의 무게를 준다.',
    ],
    example: {
      title: '단심가(丹心歌)',
      author: '정몽주(전통)',
      body: '이몸이 죽고죽어 일백번 고쳐죽어\n백골이 진토되어 넋이라도 있고없고\n임향한 일편단심이야 가실줄이 있으랴',
    },
    template:
      '[제목]\n\n' +
      '초장: ○○○ ○○○○ ○○○○ ○○○○\n' +
      '중장: ○○○ ○○○○ ○○○○ ○○○○\n' +
      '종장: ○○○ ○○○○○ ○○○○ ○○○\n' +
      '      (종장 첫 3자 고정, 둘째 음보는 길게)',
    tip: '초·중장에서 상황을 펼치고, 종장 첫 3글자에서 호흡을 꺾어 반전·감탄으로 매듭지어 보라.',
  },
  {
    id: 'haiku',
    name: '하이쿠 (俳句)',
    origin: '일본 전통 · 3행 단시',
    summary: '5-7-5 음절 3행의 짧은 시. 계절어(기고)와 끊는 말(기레지)로 한 순간을 포착한다.',
    rules: [
      '세 행, 음절 수 5-7-5(총 17음절)로 짓는다(한국어는 글자 수로 근사).',
      '계절을 드러내는 계절어(기고, 季語)를 하나 넣는다.',
      '두 이미지를 병치하고 그 사이를 끊는 말(기레지)로 가른다.',
      '설명·감정 진술을 피하고, 구체적 사물·장면만으로 순간을 보여준다.',
      '제목을 붙이지 않는 것이 보통이다.',
    ],
    example: {
      title: '(전통 하이쿠 · 번역)',
      author: 'Matsuo Bashō',
      body: '오래된 연못\n개구리 뛰어드는\n물소리 하나',
    },
    template:
      '○○○○○        (5 — 첫 이미지/계절어)\n' +
      '○○○○○○○      (7 — 전개)\n' +
      '○○○○○        (5 — 끊고 맺는 이미지)',
    tip: '"~같다" 같은 비유보다, 두 장면을 나란히 놓아 독자가 스스로 잇게 두면 하이쿠다워진다.',
  },
  {
    id: 'ohaeng',
    name: '오행시 (五行詩)',
    origin: '한국 말놀이 · 5행 삼행시류',
    summary: '주어진 다섯 글자(낱말)를 각 행의 첫 글자로 삼아 다섯 행을 짓는 글자놀이 시.',
    rules: [
      '제시어(다섯 글자 낱말)를 정한다.',
      '제시어의 각 글자를 1~5행의 첫 글자로 쓴다(이합체·아크로스틱).',
      '다섯 행이 모여 하나의 뜻·이야기를 이루게 한다.',
      '음수·운율 제약은 없으나 행 길이를 비슷하게 맞추면 리듬이 산다.',
      '재치·반전·말맛을 살리는 것이 묘미.',
    ],
    example: {
      title: '예시 — 제시어 「가나다라마」',
      author: '(말놀이 예)',
      body: '가만히 앉아\n나를 들여다보면\n다 보이는 마음\n라일락 향기처럼\n마음 한켠 번진다',
    },
    template:
      '제시어: ○ ○ ○ ○ ○\n\n' +
      '○ —\n' +
      '○ —\n' +
      '○ —\n' +
      '○ —\n' +
      '○ —',
    tip: '먼저 다섯 글자를 정하고, 마지막 행에서 의미가 탁 트이도록 결말부터 거꾸로 설계해 보라.',
  },
  {
    id: 'free-verse',
    name: '자유시 (Free Verse)',
    origin: '근현대 · 정형 없음',
    summary: '음수·운율의 정해진 틀 없이, 의미와 호흡에 따라 행과 연을 나누는 시.',
    rules: [
      '고정된 음절 수·각운 규칙이 없다.',
      '행갈이(line break)와 연 나누기로 호흡·강조를 조절한다.',
      '리듬은 운율 대신 반복·이미지·소리(두운·내운)로 만든다.',
      '한 행에 한 호흡, 강조할 말을 행의 처음이나 끝에 둔다.',
      '형식이 없는 만큼 이미지의 응집과 어조의 일관성이 더 중요하다.',
    ],
    example: {
      title: '(자유시 골격 예)',
      author: '—',
      body: '창을 열자\n바람이 먼저 들어와\n어제의 말들을 흩뜨린다\n\n나는 아직\n그 말 한마디에 묶여 있다',
    },
    template:
      '[제목]\n\n' +
      '(1연 — 한 장면/이미지로 연다)\n' +
      '…\n' +
      '…\n\n' +
      '(2연 — 전개하거나 시선을 옮긴다)\n' +
      '…\n' +
      '…\n\n' +
      '(마지막 연 — 여운/전환으로 닫는다)\n' +
      '…',
    tip: '행을 어디서 끊느냐가 곧 형식이다. 같은 문장도 끊는 자리에 따라 뜻과 호흡이 달라진다.',
  },
  {
    id: 'prose-poem',
    name: '산문시 (Prose Poem)',
    origin: '근대 프랑스 기원 · 행갈이 없는 시',
    summary: '행을 나누지 않고 산문처럼 이어 쓰되, 시적 밀도·이미지·리듬을 갖춘 시.',
    rules: [
      '행갈이 없이 문단(산문) 형태로 쓴다.',
      '서사·설명보다 이미지·은유·리듬으로 시적 긴장을 유지한다.',
      '문장의 길이·반복·소리로 내부 리듬을 만든다.',
      '한 문단~몇 문단의 짧은 분량으로 응집한다.',
      '끝 문장에서 이미지를 매듭짓거나 의미를 비튼다.',
    ],
    example: {
      title: '(산문시 골격 예)',
      author: '—',
      body: '밤은 천천히 골목을 적신다. 가로등 아래 고인 빛 위로, 누군가 흘리고 간 발소리가 동그랗게 번진다. 나는 그 원의 가장자리에 서서, 아직 도착하지 않은 사람의 이름을 가만히 발음해 본다.',
    },
    template:
      '[제목]\n\n' +
      '(한 문단으로 한 장면을 그린다. 행을 나누지 말고, 문장의 길이와 반복으로 리듬을 만든다. 마지막 문장에서 이미지를 매듭짓거나 의미를 살짝 비튼다.)',
    tip: '"이야기"가 아니라 "한 장면의 밀도"를 노려라. 문단 하나가 사진 한 장처럼 닫히면 성공이다.',
  },
  {
    id: 'limerick',
    name: '리머릭 (Limerick)',
    origin: '영국 · 5행 해학시',
    summary: 'aabba 운율의 5행 익살시. 1·2·5행은 길고 3·4행은 짧으며 마지막 행에서 펀치를 친다.',
    rules: [
      '다섯 행, 운율은 aabba.',
      '1·2·5행은 길게(3강세), 3·4행은 짧게(2강세).',
      '내용은 가볍고 우스꽝스럽거나 풍자적이다.',
      '대개 인물·장소 소개로 시작해 황당한 사건으로 이어진다.',
      '마지막 5행에서 반전·말장난으로 웃음을 준다.',
    ],
    example: {
      title: '(전통 리머릭 골격)',
      author: '—',
      body: '어느 마을에 사는 한 노인이 (a)\n날마다 모자를 거꾸로 썼지 (a)\n  바람이 불면 (b)\n  새가 날아와 (b)\n그 안에 둥지를 틀곤 했다네 (a)',
    },
    template:
      '○○○○○○○○ (a)\n' +
      '○○○○○○○○ (a)\n' +
      '  ○○○○○ (b)\n' +
      '  ○○○○○ (b)\n' +
      '○○○○○○○○ (a)',
    tip: '마지막 행의 운(a)을 먼저 정해 펀치라인을 잡고, 거기에 맞춰 앞 행을 채우면 쉽다.',
  },
  {
    id: 'acrostic',
    name: '아크로스틱 (Acrostic)',
    origin: '서양·동양 공통 · 첫 글자 시',
    summary: '각 행의 첫 글자를 세로로 읽으면 하나의 낱말·이름·문장이 되는 시.',
    rules: [
      '주제어(이름·낱말·문장)를 세로축으로 정한다.',
      '각 행의 첫 글자가 주제어의 글자와 순서대로 일치한다.',
      '가로로 읽으면 자연스러운 시가 되도록 쓴다.',
      '음수·운율 제약은 없다(자유롭게).',
      '주제어가 시 전체의 주제와 맞물리면 효과가 커진다.',
    ],
    example: {
      title: '예시 — 세로 「봄날」',
      author: '—',
      body: '봄이 오는 소리에\n날개를 펴는 마음\n(세로로 「봄날」)',
    },
    template:
      '세로 낱말: ○ ○ ○ …\n\n' +
      '○ —\n' +
      '○ —\n' +
      '○ —\n' +
      '(첫 글자를 세로로 읽으면 낱말이 되도록)',
    tip: '세로 낱말을 시의 "숨은 제목"으로 삼으면 가로 내용과 이중으로 읽혀 재미가 두 배가 된다.',
  },
  {
    id: 'cinquain',
    name: '신퀘인 (Cinquain)',
    origin: '미국 · 5행 음절시',
    summary: '2-4-6-8-2 음절의 5행시. 짧게 시작해 부풀었다가 한 단어로 닫는다.',
    rules: [
      '다섯 행으로 짓는다.',
      '음절 수: 1행 2 / 2행 4 / 3행 6 / 4행 8 / 5행 2.',
      '전통형은 1행 명사, 2행 형용사, 3행 동작, 4행 감정·문장, 5행 동의어로 채운다.',
      '운율은 없다(음절 수만 지킨다).',
      '마지막 2음절로 첫 행을 다시 비추듯 닫는다.',
    ],
    example: {
      title: '(신퀘인 골격)',
      author: '—',
      body: '바다\n깊고 푸른\n끝없이 출렁이는\n나를 삼킬 듯 다가왔다가\n물러',
    },
    template:
      '○○            (2 — 소재 명사)\n' +
      '○○○○          (4 — 묘사)\n' +
      '○○○○○○        (6 — 동작)\n' +
      '○○○○○○○○      (8 — 감정/문장)\n' +
      '○○            (2 — 닫는 한 단어)',
    tip: '4행에서 가장 크게 부풀린 뒤 5행을 짧게 끊어 떨어뜨리면 여운이 생긴다.',
  },
]

interface Saved {
  id: string
  formId: string
  formName: string
  title: string
  body: string
  createdAt: number
}

function loadState(): { formId: string; body: string; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { formId: '', body: '', saved: [] }
    const p = JSON.parse(raw)
    const formId = FORMS.some((f) => f.id === p?.formId) ? String(p.formId) : ''
    const body = typeof p?.body === 'string' ? p.body : ''
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved
          .filter((x: unknown) => x && typeof (x as Saved).body === 'string')
          .map((x: Saved) => ({
            id: String(x.id || Date.now() + Math.random()),
            formId: String(x.formId || ''),
            formName: String(x.formName || ''),
            title: String(x.title || ''),
            body: String(x.body || ''),
            createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
          }))
      : []
    return { formId, body, saved }
  } catch {
    return { formId: '', body: '', saved: [] }
  }
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function PoemFormGuide({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [formId, setFormId] = useState<string>(init.current.formId)
  const [body, setBody] = useState<string>(init.current.body)
  const [title, setTitle] = useState('')
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [editId, setEditId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState<string>('')
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 형식 지정(연계로 열렸을 때)
  useEffect(() => {
    const pf = payload?.formId
    if (typeof pf === 'string' && FORMS.some((f) => f.id === pf)) setFormId(pf)
  }, [payload])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ formId, body, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 사라질 수 있어요.')
    }
  }, [formId, body, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2600)
  }

  const form = FORMS.find((f) => f.id === formId) || null

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1400)
    } catch {
      flashNote('복사에 실패했습니다. 직접 선택해 복사하세요.')
    }
  }

  // 형식 선택 → 안내 표시
  const selectForm = (id: string) => {
    setFormId(id)
  }

  // 템플릿을 작성칸에 넣기(기존 글이 있으면 확인)
  const insertTemplate = () => {
    if (!form) return
    if (body.trim() && !window.confirm('작성칸의 내용을 형식 템플릿으로 덮어쓸까요?')) return
    setBody(form.template)
    setEditId(null)
    setTitle('')
    flashNote(`${form.name} 빈 템플릿을 작성칸에 넣었습니다.`)
  }

  // 템플릿을 작성칸 끝에 덧붙이기(덮어쓰지 않음)
  const appendTemplate = () => {
    if (!form) return
    setBody((b) => (b.trim() ? b.replace(/\s+$/, '') + '\n\n' + form.template : form.template))
    flashNote(`${form.name} 템플릿을 작성칸에 덧붙였습니다.`)
  }

  const saveCurrent = () => {
    if (!body.trim()) { flashNote('작성칸이 비어 있습니다. 시를 먼저 써 주세요.'); return }
    const rec: Saved = {
      id: editId || newId(),
      formId,
      formName: form?.name || (formId ? formId : '자유'),
      title: title.trim(),
      body,
      createdAt: Date.now(),
    }
    if (editId) {
      setSaved((p) => p.map((s) => (s.id === editId ? { ...rec, createdAt: s.createdAt } : s)))
      flashNote('수정했습니다.')
    } else {
      setSaved((p) => [rec, ...p])
      flashNote('시를 저장했습니다.')
    }
    setEditId(null)
    setTitle('')
  }

  const loadSaved = (s: Saved) => {
    if (s.formId && FORMS.some((f) => f.id === s.formId)) setFormId(s.formId)
    setBody(s.body)
    setTitle(s.title)
    setEditId(s.id)
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((s) => s.id !== id))
    if (editId === id) { setEditId(null); setTitle('') }
  }

  const clearForm = () => {
    setBody('')
    setEditId(null)
    setTitle('')
  }

  // 작성칸의 시를 프로젝트 자료 〈시〉 폴더에 문서로 추가
  const addPoemToProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (!body.trim()) { flashNote('작성칸이 비어 있습니다. 시를 먼저 써 주세요.'); return }
    const t = title.trim() || (form ? `${form.name} 시` : '시')
    const lines = body.split('\n').map((ln) => `<p>${ln.trim() === '' ? '<br/>' : escapeHtml(ln)}</p>`).join('')
    const bodyHtml = [
      form ? `<p style="color:#888;font-size:12px;">형식: ${escapeHtml(form.name)}</p>` : '',
      lines,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'draft',
      folder: '시',
      title: t,
      bodyHtml,
      synopsis: form ? `${form.name} — ${form.summary}` : undefined,
    })
    flashNote(id ? '원고 〈시〉 폴더에 시를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const hasInput = !!body.trim()
  const lineCount = body.trim() ? body.split('\n').length : 0
  const charCount = body.replace(/\s/g, '').length

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const bodyWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const ta: React.CSSProperties = { ...input, minHeight: 200, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical', whiteSpace: 'pre-wrap' }
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, padding: '18px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }
  const exampleBox: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.75, wordBreak: 'keep-all' }
  const formBtn = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(0,0,0,0.04)' : 'var(--chrome-2)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 2,
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="🪶"/> 시 형식 가이드</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>형식을 고르고 → 빈 템플릿으로 시를 쓰세요</span>
      </div>

      <div style={bodyWrap}>
        {note && (
          <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
        )}

        {/* 형식 선택 */}
        <div style={card}>
          <h4 style={sectionTitle}>형식 고르기 — {FORMS.length}가지</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {FORMS.map((f) => (
              <button key={f.id} onClick={() => selectForm(f.id)} style={formBtn(formId === f.id)}>
                <b style={{ fontSize: 12.5, color: formId === f.id ? 'var(--accent)' : 'var(--text)' }}>{formId === f.id ? '● ' : '○ '}{f.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{f.origin}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 선택된 형식 안내 */}
        {form ? (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}>{form.name}</h4>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{form.origin}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12, wordBreak: 'keep-all' }}>{form.summary}</div>

            <div style={{ ...fieldLabel, marginBottom: 6 }}>형식 규칙</div>
            <ul style={{ margin: '0 0 12px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {form.rules.map((r, i) => (
                <li key={i} style={{ fontSize: 12.5, lineHeight: 1.6, wordBreak: 'keep-all' }}>{r}</li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ ...fieldLabel, margin: 0 }}>예시 — {form.example.title}{form.example.author && ` · ${form.example.author}`}</span>
              <button style={{ ...iconBtn, marginLeft: 'auto' }} title="예시 복사" onClick={() => copy(form.example.body, 'ex')}>{copied === 'ex' ? '✓' : '복사'}</button>
            </div>
            <div style={exampleBox}>{form.example.body}</div>

            <div style={{ ...hint, marginTop: 10, color: 'var(--text)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
              <Emoji e="💡"/> {form.tip}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={insertTemplate}><Emoji e="📝"/> 빈 템플릿 작성칸에 넣기</button>
              <button className="minibtn" onClick={appendTemplate}>＋ 끝에 덧붙이기</button>
              <button className="minibtn" onClick={() => copy(form.template, 'tpl')}>{copied === 'tpl' ? '✓ 복사됨' : '템플릿 복사'}</button>
            </div>
          </div>
        ) : (
          <div style={empty}>
            위에서 시 형식을 하나 고르면<br />
            그 형식의 <b>규칙·예시·작법 팁</b>과 <b>빈 템플릿</b>이 여기에 나타납니다.<br />
            <span style={{ fontSize: 12 }}>막막하다면 정형이 없는 <b>자유시</b>부터 시작해 보세요.</span>
          </div>
        )}

        {/* 작성칸 */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <h4 style={{ ...sectionTitle, margin: 0 }}>{editId ? <><Emoji e="✏️"/> 수정 중</> : '작성칸'}</h4>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{lineCount}행 · {charCount}자</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => copy(body, 'body')} disabled={!hasInput}>{copied === 'body' ? '✓ 복사됨' : <><Emoji e="📋"/> 복사</>}</button>
            <button className="minibtn" onClick={clearForm} disabled={!hasInput && !editId}>비우기</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={fieldLabel}>제목</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 봄밤" maxLength={80} />
          </div>
          <textarea
            style={ta}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={form ? '위의 “빈 템플릿 작성칸에 넣기”를 누르거나 여기에 바로 시를 써 보세요.' : '형식을 골라 템플릿을 넣거나, 여기에 자유롭게 시를 써 보세요.'}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveCurrent} disabled={!hasInput}>{editId ? '수정 저장' : <><Emoji e="💾"/> 저장</>}</button>
            {editId && <button className="minibtn" onClick={() => { setEditId(null); setTitle('') }}>새 항목으로</button>}
          </div>

          {/* 연계: 작성한 시를 프로젝트 원고 〈시〉 폴더에 추가 */}
          <div className="linkbar" style={{ marginTop: 12 }}>
            <span className="linkbar-label">연계:</span>
            <button
              className="linkbtn"
              onClick={addPoemToProject}
              disabled={!hasProjectBridge()}
              title={hasProjectBridge() ? '작성칸의 시를 프로젝트 원고 〈시〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
        </div>

        {/* 저장 목록 (CRUD) */}
        <div style={card}>
          <h4 style={{ ...sectionTitle }}>저장한 시 · {saved.length}편</h4>
          {saved.length === 0 ? (
            <div style={empty}>
              아직 저장한 시가 없습니다.<br />
              형식을 고르고 작성칸에 쓴 뒤 <b>저장</b>을 누르면 여기에 모입니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {saved.map((s) => (
                <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{s.title || '(제목 없음)'}</b>
                    {s.formName && <span style={{ fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px' }}>{s.formName}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button style={iconBtn} title="이 시 복사" onClick={() => copy(s.body, 's' + s.id)}>{copied === 's' + s.id ? '✓' : '복사'}</button>
                      <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️"/></button>
                      <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️"/></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', maxHeight: 120, overflow: 'auto' }}>{s.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={hint}>
          형식은 자유를 가두는 틀이 아니라, 한 호흡 안에 생각을 응집시키는 그릇입니다. 규칙을 익힌 뒤 의식적으로 비틀 때 비로소 자기 목소리가 나옵니다.
          작성칸·저장 목록은 이 브라우저에 자동 저장되어 새로고침해도 유지됩니다.
        </div>
      </div>
    </div>
  )
}
