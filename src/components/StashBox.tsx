// 수집함(Stash) — 플로팅 잡동사니 보관상자. 무엇이든 드래그/추가/붙여넣기로 담는다(원본 이동 아님, 링크 연결).
//  - 접힌 상태: 화면 위를 자유롭게 떠다니는 🧺 아이콘(드롭 타깃). 클릭하면 펼쳐짐.
//  - 펼친 상태: 캔버스처럼 항목을 자유 배치. 항목 클릭 시 해당 문서/URL/이미지를 앱 창으로 연다.
//  - 항목 종류: 메모(즉석 아이디어) · 문서(바인더 링크) · URL(웹) · 이미지 · 스니펫.
//  - 실시간 연동: 바인더 파일 드롭=링크, URL 붙여넣기=웹 링크, 도구에서 addToStash 로도 담김.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { getDragItem, isItemDrag, registerStash, type StashInput } from '../tools/linkbus'
import { saveBlob, loadBlob, deleteBlob } from '../persistence/blobs'
import { idbList } from '../persistence/idb'
import { Icon } from '../ui/icons'

type Kind = 'memo' | 'doc' | 'url' | 'image' | 'note' | 'audio' | 'video' | 'file'
// media: applySryAux 가 blob 저장 실패(쿼터 등) 시 항목에 남기는 인라인 dataURL 폴백. blob 로드 실패/blobId 부재 시 표시용(데이터 보존).
interface StashItem { id: string; kind: Kind; x: number; y: number; label: string; text?: string; url?: string; itemId?: string; credit?: string; blobId?: string; mime?: string; media?: string }
// 아이콘 위치. x/y 는 절대 px(하위 호환). ax/ay 가 있으면 오른쪽/아래 가장자리에서의 거리(rx/by)로 앵커해
// 모니터·창 크기가 달라져도 같은 구석에 붙는다(큰 모니터에서 오른쪽 아래에 두면 작은 모니터에서도 오른쪽 아래).
interface Box { x: number; y: number; ax?: 'left' | 'right'; ay?: 'top' | 'bottom'; rx?: number; by?: number }
interface WinBox { x: number; y: number; w: number; h: number }

const POS_KEY = 'sry:stash:pos'   // 위치/창은 전역 UI 선호(공통)
const WIN_KEY = 'sry:stash:win'
const VIEW_KEY = 'sry:stash:view' // 'canvas' | 'list' (전역 UI 선호)
const COACH_KEY = 'sry:stash:coached' // 코치마크 1회 안내 여부
const LEGACY_ITEMS_KEY = 'sry:stash:items' // 구(전역) 수집함 — 1회 마이그레이션용
const ITEMS_PREFIX = 'sry:stash:items:'
const itemsKeyFor = (pid: string) => ITEMS_PREFIX + pid // 수집함은 프로젝트별(A 프로젝트=A 수집함)
const MAX_STASH_BYTES = 40 * 1024 * 1024 // App 의 MAX_IMPORT_BYTES 와 동일한 상한(쿼터 보호·UI 멈춤 방지)
const uid = () => 's_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
const isUrl = (t: string) => /^https?:\/\/\S+$/i.test(t.trim())
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u.slice(0, 40) } }
const KIND_ICON: Record<Kind, string> = { memo: 'idea', doc: 'book', url: 'link', image: 'image', note: 'copy', audio: 'music', video: 'scene', file: 'reference' }
const kindFromMime = (m: string): Kind => m.startsWith('image/') ? 'image' : m.startsWith('audio/') ? 'audio' : m.startsWith('video/') ? 'video' : 'file'
const TYPE_PREFIX: Record<string, string> = { character: '인물', folder: '폴더', text: '문서' }
const flash = (m: string) => { try { window.dispatchEvent(new CustomEvent('scriv:flash', { detail: m })) } catch { /* noop */ } }
// 로컬 미디어(이 기기 IndexedDB 에만 저장 · .sry 내보내기에 미포함)인지 판별 — 경고 표시용.
const isLocalMedia = (it: { blobId?: string }) => !!it.blobId

// 격자 배치(자동 정렬·신규 분산 공용). 콘텐츠 폭에 맞춰 열 수를 정한다.
const GRID_W = 160, GRID_H = 64, GRID_PAD = 16
function gridSlot(index: number, contentW: number): Box {
  const cols = Math.max(1, Math.floor((contentW - GRID_PAD) / GRID_W))
  return { x: GRID_PAD + (index % cols) * GRID_W, y: GRID_PAD + Math.floor(index / cols) * GRID_H }
}

/** IndexedDB blob 을 object URL 로 로드(언마운트 시 revoke) — Corkboard 의 useBlobUrl 패턴 재사용. */
function useBlobUrl(blobId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let made: string | null = null
    if (blobId) {
      loadBlob(blobId).then((b) => { if (b && !revoked) { made = URL.createObjectURL(b); setUrl(made) } }).catch(() => {})
    } else setUrl(null)
    return () => { revoked = true; if (made) URL.revokeObjectURL(made) }
  }, [blobId])
  return url
}

export default function StashBox() {
  const select = useStore((s) => s.select)
  const setView = useStore((s) => s.setView)
  const projectId = useStore((s) => s.project.id) // 수집함을 프로젝트별로 분리
  // 주의: useStore 셀렉터가 매번 새 함수를 반환하면 무한 렌더(React #185). items 맵을 선택해 안정 참조 유지.
  const itemsMap = useStore((s) => s.project.items)
  const itemTitle = (id: string) => itemsMap[id]?.title
  const itemInfo = (id: string) => { const it = itemsMap[id]; return it ? { title: it.title, type: it.type } : null }

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<StashItem[]>([])
  // 같은 틱에 연속 추가/이동/삭제해도 유실되지 않도록 최신 배열을 ref 로 직렬화(함수형 업데이트와 병행).
  const itemsRef = useRef<StashItem[]>([])
  const [pos, setPos] = useState<Box>(() => load(POS_KEY, { x: window.innerWidth - 84, y: window.innerHeight - 120 }))
  const [win, setWin] = useState<WinBox>(() => load(WIN_KEY, { x: window.innerWidth - 520, y: 90, w: 460, h: 420 }))
  const [listView, setListView] = useState<boolean>(() => load<string>(VIEW_KEY, 'canvas') === 'list')
  const [winZ, setWinZ] = useState(300) // 펼친 창의 z(클릭 시 앞으로). 아이콘(.stash-icon)은 항상 최상위 유지.
  const [coach, setCoach] = useState(false) // 최초 1회 코치마크
  // 뷰포트 크기 변화(창을 작은 모니터로 옮김·브라우저 창 축소·배율 변경)에 맞춰 아이콘/창 위치를 다시 계산 — 저장된 좌표가
  // 화면 밖이면 항상 보이는 자리로 끌어들인다. 저장값은 건드리지 않아 큰 모니터로 돌아가면 원래 자리로 복귀.
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    // resize 외에도 모니터 이동(배율 변화)·창 포커스·탭 복귀 때 다시 재고, ResizeObserver 로 뷰포트 변화를 놓치지 않는다
    const sync = () => setVp((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }))
    window.addEventListener('resize', sync)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    let ro: ResizeObserver | null = null
    try { ro = new ResizeObserver(sync); ro.observe(document.documentElement) } catch { /* noop */ }
    let mq: MediaQueryList | null = null
    const onDpr = () => { sync(); try { mq && mq.removeEventListener('change', onDpr) } catch { /* noop */ } try { mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`); mq.addEventListener('change', onDpr) } catch { /* noop */ } }
    try { mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`); mq.addEventListener('change', onDpr) } catch { /* noop */ }
    const iv = window.setInterval(sync, 1500) // 최후의 안전망(이벤트가 오지 않는 환경)
    return () => { window.removeEventListener('resize', sync); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync); try { ro && ro.disconnect() } catch { /* noop */ } try { mq && mq.removeEventListener('change', onDpr) } catch { /* noop */ } window.clearInterval(iv) }
  }, [])
  const iconZ = appZoom()
  const vpW = vp.w / iconZ, vpH = vp.h / iconZ
  // 앵커가 있으면 가장자리 거리로 복원, 없으면(구버전 저장값) 절대 좌표 → 어느 쪽이든 화면 안으로 클램프
  const rawX = pos.ax === 'right' && pos.rx != null ? vpW - pos.rx : pos.x
  const rawY = pos.ay === 'bottom' && pos.by != null ? vpH - pos.by : pos.y
  const iconLeft = clamp(rawX, 0, Math.max(0, vpW - 56))
  const iconTop = clamp(rawY, 0, Math.max(0, vpH - 76))
  const [viewer, setViewer] = useState<{ kind: 'url' | 'image' | 'audio' | 'video' | 'file'; url: string; label: string; objectUrl?: boolean; local?: boolean } | null>(null)
  const closeViewer = () => { if (viewer?.objectUrl) { try { URL.revokeObjectURL(viewer.url) } catch { /* noop */ } } setViewer(null) }
  // 뷰어(이미지/파일/링크 미리보기)는 Esc 로도 닫히게 — 오버레이의 기본 기대 동작.
  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeViewer() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer])
  const [dragOver, setDragOver] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // 항목 로드/저장(프로젝트별). 프로젝트가 바뀌면 그 프로젝트의 수집함을 다시 로드한다.
  useEffect(() => {
    const key = itemsKeyFor(projectId)
    let raw: string | null = null
    try { raw = localStorage.getItem(key) } catch { /* noop */ }
    if (raw == null) {
      // 1회 마이그레이션: 구 전역 수집함이 있으면 현재 프로젝트로 이전(이후 프로젝트별 분리)
      const legacy = load<StashItem[]>(LEGACY_ITEMS_KEY, [])
      itemsRef.current = legacy; setItems(legacy)
      if (legacy.length) { try { localStorage.setItem(key, JSON.stringify(legacy)); localStorage.removeItem(LEGACY_ITEMS_KEY) } catch { /* noop */ } }
    } else {
      try { const parsed = JSON.parse(raw) as StashItem[]; itemsRef.current = parsed; setItems(parsed) } catch { itemsRef.current = []; setItems([]) }
    }
  }, [projectId])

  // .sry 가져오기로 같은 프로젝트의 수집함이 복원되면(projectId 불변이라 위 effect 미발화) 다시 로드.
  useEffect(() => {
    const reload = () => {
      try { const raw = localStorage.getItem(itemsKeyFor(projectId)); const parsed = raw ? JSON.parse(raw) as StashItem[] : []; itemsRef.current = parsed; setItems(parsed) } catch { /* noop */ }
    }
    window.addEventListener('sry:stash-reload', reload)
    return () => window.removeEventListener('sry:stash-reload', reload)
  }, [projectId])

  // 최초 1회 코치마크: 사용자가 🧺 아이콘의 정체를 알도록 작은 말풍선 안내.
  useEffect(() => {
    let shown = false
    try { shown = localStorage.getItem(COACH_KEY) === '1' } catch { /* noop */ }
    if (!shown) {
      setCoach(true)
      try { localStorage.setItem(COACH_KEY, '1') } catch { /* noop */ }
      const t = setTimeout(() => setCoach(false), 9000)
      return () => clearTimeout(t)
    }
  }, [])

  // 기동 시 가비지 컬렉션: 현재 IndexedDB 에 없는 프로젝트의 수집함 키를 1회 청소(삭제된 옛 프로젝트의 잔존 방지).
  useEffect(() => {
    let cancelled = false
    idbList().then((metas) => {
      if (cancelled) return
      const live = new Set(metas.map((m) => m.id))
      try {
        const stale: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(ITEMS_PREFIX)) {
            const pid = k.slice(ITEMS_PREFIX.length)
            // 현재 열린 프로젝트(아직 IndexedDB 미저장 신규 포함)는 절대 지우지 않는다.
            if (pid && pid !== projectId && !live.has(pid)) stale.push(k)
          }
        }
        for (const k of stale) localStorage.removeItem(k)
      } catch { /* noop */ }
    }).catch(() => {})
    return () => { cancelled = true }
    // 기동 1회만 — projectId 변화에 재실행하지 않음(아래 deps 고정).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 최신 prev 기준으로 영속(localStorage). 함수형 업데이트 안에서 호출되며 ref 도 갱신한다.
  const commit = (next: StashItem[]) => { itemsRef.current = next; try { localStorage.setItem(itemsKeyFor(projectId), JSON.stringify(next)) } catch (e) { flash('수집함 저장 실패 — 저장 공간이 부족할 수 있어요.'); throw e } }
  const persist = (next: StashItem[]) => { setItems(next); itemsRef.current = next; try { localStorage.setItem(itemsKeyFor(projectId), JSON.stringify(next)) } catch { flash('수집함 저장 실패 — 저장 공간이 부족할 수 있어요.') } }

  // 도구/외부에서 담기 등록 — 함수형 업데이트라 items 의존 없이 항상 최신 상태에 추가된다.
  useEffect(() => {
    registerStash((i: StashInput) => addItem(i))
    return () => registerStash(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  function load<T>(k: string, def: T): T { try { const r = localStorage.getItem(k); if (r) return JSON.parse(r) as T } catch { /* noop */ } return def }
  const savePos = (p: Box) => {
    const z = appZoom(); const w = window.innerWidth / z, h = window.innerHeight / z
    const anchored: Box = { x: p.x, y: p.y, ax: p.x + 28 > w / 2 ? 'right' : 'left', ay: p.y + 28 > h / 2 ? 'bottom' : 'top', rx: w - p.x, by: h - p.y }
    setPos(anchored); try { localStorage.setItem(POS_KEY, JSON.stringify(anchored)) } catch { /* noop */ }
  }
  const saveWin = (w: WinBox) => { setWin(w); try { localStorage.setItem(WIN_KEY, JSON.stringify(w)) } catch { /* noop */ } }
  const toggleListView = () => setListView((v) => { const nv = !v; try { localStorage.setItem(VIEW_KEY, nv ? 'list' : 'canvas') } catch { /* noop */ } return nv })
  // 콘텐츠 영역 폭(스크롤 가능 영역까지 배치 허용을 위한 기준).
  const contentW = () => Math.max(win.w - 24, GRID_W)

  // 펼친 창을 앞으로 — 도구 창(z 클램프 290 이하)보다 위로, 클릭 시 활성화.
  const raiseWin = () => setWinZ(305)

  const addItem = (i: StashInput, at?: { x: number; y: number }) => {
    const it: StashItem = { id: uid(), kind: i.kind, x: 0, y: 0, label: i.label || '', text: i.text, url: i.url, itemId: i.itemId, credit: i.credit, blobId: i.blobId, mime: i.mime }
    if (it.kind === 'url' && !it.label) it.label = hostOf(it.url || '')
    if (it.kind === 'doc' && !it.label && it.itemId) it.label = itemTitle(it.itemId) || '문서'
    setItems((prev) => {
      const slot = at ?? gridSlot(prev.length, contentW()) // 신규 항목을 격자로 분산(좌상단 겹침 방지)
      it.x = slot.x; it.y = slot.y
      const next = [it, ...prev]
      try { commit(next) } catch { /* 저장 실패해도 메모리 상태는 유지(유실 방지) */ }
      return next
    })
    return it
  }
  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id)
      if (it?.blobId) deleteBlob(it.blobId).catch(() => {}) // 로컬 파일 blob 도 함께 정리(원본 파일/바인더는 무관)
      const next = prev.filter((x) => x.id !== id)
      try { commit(next) } catch { /* noop */ }
      return next
    })
  }
  const updateItem = (id: string, patch: Partial<StashItem>) => setItems((prev) => { const next = prev.map((x) => (x.id === id ? { ...x, ...patch } : x)); try { commit(next) } catch { /* noop */ } return next })

  // 자동 정렬(격자) — 현재 항목을 콘텐츠 폭에 맞춰 격자로 재배치.
  const arrangeGrid = () => setItems((prev) => { const cw = contentW(); const next = prev.map((x, i) => ({ ...x, ...gridSlot(i, cw) })); try { commit(next) } catch { /* noop */ } return next })

  // ---- 드롭 처리(아이콘/캔버스 공용) ----
  const acceptDrop = (e: React.DragEvent, at?: { x: number; y: number }) => {
    e.preventDefault(); setDragOver(false)
    // 1) 로컬 파일(이미지/음악/영상/기타) — IndexedDB blob 로 영속
    const files = e.dataTransfer.files
    if (files && files.length) {
      let i = 0
      let warnedLocal = false
      for (const f of Array.from(files)) {
        if (f.size > MAX_STASH_BYTES) { // App.MAX_IMPORT_BYTES 와 동일 상한 — 거대 파일이 공용 blob DB 쿼터를 잠식하지 않도록
          flash(`"${f.name}" 은(는) 너무 큽니다(최대 ${Math.round(MAX_STASH_BYTES / 1024 / 1024)}MB). 건너뜀.`)
          continue
        }
        const blobId = uid()
        const kind = kindFromMime(f.type || '')
        const drop = at ? { x: at.x + i * 16, y: at.y + i * 16 } : undefined
        saveBlob(blobId, f)
          .then(() => addItem({ kind, label: f.name, blobId, mime: f.type } as StashInput, drop))
          .catch(() => flash('파일 저장 실패 — 저장 공간(IndexedDB)이 부족할 수 있어요.')) // 조용히 무시하지 않음(쿼터 초과 알림)
        if (!warnedLocal) { flash('로컬 미디어는 이 기기에만 저장되며 .sry 내보내기에는 포함되지 않아요.'); warnedLocal = true }
        i++
      }
      return
    }
    // 2) 바인더 파일 링크
    const di = getDragItem(e)
    if (di) { addItem({ kind: 'doc', itemId: di.id, label: di.title }, at); return }
    // 3) URL / 텍스트
    const uri = e.dataTransfer.getData('text/uri-list')
    const txt = e.dataTransfer.getData('text/plain')
    if (uri && isUrl(uri)) { addItem({ kind: 'url', url: uri.split('\n')[0] }, at); return }
    if (txt) { isUrl(txt) ? addItem({ kind: 'url', url: txt.trim() }, at) : addItem({ kind: 'memo', text: txt, label: txt.slice(0, 30) }, at) }
  }
  const onDragOver = (e: React.DragEvent) => { if (isItemDrag(e) || e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) { e.preventDefault(); setDragOver(true) } }

  // ---- 항목 클릭(앱 창으로 열기) ----
  const openItem = async (it: StashItem) => {
    if (it.kind === 'doc' && it.itemId) {
      if (!useStore.getState().project.items[it.itemId]) { flash('연결된 문서를 찾을 수 없습니다(삭제됨).'); return }
      select(it.itemId); setView('editor'); return
    }
    if (it.kind === 'memo' || it.kind === 'note') { setEditId(it.id); setOpen(true); return }
    // 웹 링크는 새 탭으로 직접 연다. (앱 안 iframe 임베드는 대부분 사이트가 X-Frame-Options/CSP 로
    //  거부 → "연결 거부" 빈 화면이 떠서 링크가 안 열리는 것처럼 보인다.)
    if (it.kind === 'url') {
      const u = (it.url || '').trim()
      if (!u) { flash('주소가 비어 있어요.'); return }
      const w = window.open(u, '_blank', 'noopener,noreferrer')
      if (!w) flash('팝업이 차단되어 새 탭으로 열지 못했어요. 브라우저의 팝업 허용을 확인하세요.')
      return
    }
    // blob(로컬 파일)이면 objectURL 생성, 아니면 url 사용
    let url = it.url || ''
    let madeObjectUrl = false
    if (it.blobId) {
      const b = await loadBlob(it.blobId)
      if (b) { url = URL.createObjectURL(b); madeObjectUrl = true }
      else if (it.media) url = it.media // blob 로드 실패 시 인라인 dataURL 폴백(데이터 보존)
      else { flash('파일을 불러올 수 없습니다.'); return }
    } else if (!url && it.media) url = it.media // blobId 부재 시(저장 실패로 dataURL 만 남은 경우) 폴백
    if (!url) return
    const vk: 'url' | 'image' | 'audio' | 'video' | 'file' =
      it.kind === 'image' ? 'image' : it.kind === 'audio' ? 'audio' : it.kind === 'video' ? 'video' : it.kind === 'file' ? 'file' : 'url'
    setViewer({ kind: vk, url, label: it.label || (it.url ? hostOf(it.url) : '파일'), objectUrl: madeObjectUrl, local: isLocalMedia(it) })
  }

  // ---- 메모/노트를 현재 원고(에디터)에 삽입 — '담기만 하던' 수집함을 실제 글쓰기로 환류 ----
  const insertToEditor = (it: StashItem) => {
    const text = (it.text || '').trim() || (it.kind === 'note' ? (it.label || '').trim() : '')
    if (!text) { flash('삽입할 텍스트가 없어요.'); return }
    const st = useStore.getState()
    let active = st.activeId
    if (!active) {
      const firstText = Object.values(st.project.items).find((x) => x.type === 'text')
      if (firstText) { select(firstText.id); active = firstText.id }
    }
    if (!active) { flash('먼저 글(문서)을 하나 여세요.'); return }
    const needSwitch = st.viewMode !== 'editor'
    if (needSwitch) setView('editor')
    // 뷰 전환 시 에디터/포맷바 마운트 후에 삽입 이벤트를 쏜다(리스너 준비 시간).
    window.setTimeout(() => {
      // 본문 에디터에 포커스+커서를 둔 뒤 삽입 — 커서가 없으면 삽입 위치를 못 잡는다.
      const paper = (document.querySelector(`.paper[data-doc-id="${active}"]`) || document.querySelector('.paper')) as HTMLElement | null
      if (paper) {
        paper.focus()
        const r = document.createRange(); r.selectNodeContents(paper); r.collapse(false)
        const s = window.getSelection(); if (s) { s.removeAllRanges(); s.addRange(r) }
      }
      window.dispatchEvent(new CustomEvent('scriv:insertText', { detail: { text } }))
      flash('원고에 삽입했어요.')
    }, needSwitch ? 240 : 0)
  }

  // ---- 아이콘 드래그 이동 ----
  const iconDrag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const onIconDown = (e: React.PointerEvent) => { const z = appZoom(); iconDrag.current = { dx: e.clientX / z - iconLeft, dy: e.clientY / z - iconTop, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  const onIconMove = (e: React.PointerEvent) => { const d = iconDrag.current; if (!d) return; const z = appZoom(); const nx = clamp(e.clientX / z - d.dx, 0, window.innerWidth / z - 56), ny = clamp(e.clientY / z - d.dy, 0, window.innerHeight / z - 56); if (Math.abs(nx - pos.x) > 2 || Math.abs(ny - pos.y) > 2) d.moved = true; setPos({ x: nx, y: ny }) }
  const onIconUp = (e: React.PointerEvent) => { const d = iconDrag.current; iconDrag.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } if (d && d.moved) { savePos(pos); suppressClick.current = true; setTimeout(() => { suppressClick.current = false }, 50) } }
  const onIconClick = () => { if (suppressClick.current) return; setCoach(false); raiseWin(); setOpen(true) }

  // ---- 창 헤더 드래그 ----
  const winDrag = useRef<{ dx: number; dy: number } | null>(null)
  const onWinDown = (e: React.PointerEvent) => { raiseWin(); if ((e.target as HTMLElement).closest('button')) return; winDrag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  const onWinMove = (e: React.PointerEvent) => { const d = winDrag.current; if (!d) return; const z = appZoom(); const w = Math.min(win.w, window.innerWidth / z - 16), h = Math.min(win.h, window.innerHeight / z - 16); setWin({ ...win, x: clamp(e.clientX / z - d.dx, 8, Math.max(8, window.innerWidth / z - w - 8)), y: clamp(e.clientY / z - d.dy, 8, Math.max(8, window.innerHeight / z - h - 8)) }) }
  const onWinUp = (e: React.PointerEvent) => { if (!winDrag.current) return; winDrag.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } saveWin(win) }

  // ---- 항목 드래그(캔버스 내 자유 배치) — 콘텐츠 크기까지 클램프(스크롤 영역 활용) ----
  const itemDrag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  const onItemDown = (e: React.PointerEvent, it: StashItem) => { e.stopPropagation(); raiseWin(); const z = appZoom(); itemDrag.current = { id: it.id, dx: e.clientX / z - it.x, dy: e.clientY / z - it.y, moved: false }; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  // ⚠ setItems 뿐 아니라 itemsRef 도 같이 갱신해야 한다 — onItemUp 의 persist(itemsRef.current) 가
  //   드래그 이전(stale) 위치를 저장·복원해 손을 떼는 순간 제자리로 '튕겨 돌아가는' 버그를 막는다.
  const onItemMove = (e: React.PointerEvent) => {
    const d = itemDrag.current; if (!d) return; d.moved = true
    const z = appZoom(); const maxX = Math.max(win.w - 130, win.w * 2), maxY = Math.max(win.h - 100, win.h * 2)
    const nx = clamp(e.clientX / z - d.dx, 0, maxX), ny = clamp(e.clientY / z - d.dy, 0, maxY)
    setItems((arr) => { const next = arr.map((x) => x.id === d.id ? { ...x, x: nx, y: ny } : x); itemsRef.current = next; return next })
  }
  const onItemUp = (e: React.PointerEvent, it: StashItem) => { const d = itemDrag.current; itemDrag.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ } if (d) { if (d.moved) persist(itemsRef.current); else openItem(it) } }

  // ---- 키보드 접근성(항목 열기/삭제) ----
  const onItemKey = (e: React.KeyboardEvent, it: StashItem) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(it) }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(it.id) }
  }

  const addMemo = () => { const it = addItem({ kind: 'memo', text: '', label: '메모' }, { x: 24, y: 24 }); setEditId(it.id); setOpen(true) }
  const addUrl = () => { const u = window.prompt('웹 주소(URL)를 붙여넣으세요'); if (u && isUrl(u.trim())) addItem({ kind: 'url', url: u.trim() }) }

  const count = items.length
  const labelOf = (it: StashItem): string => {
    if (it.kind === 'doc' && it.itemId) { const info = itemInfo(it.itemId); return info ? (TYPE_PREFIX[info.type] || '문서') + ' - ' + info.title : (it.label || '문서(삭제됨)') }
    return it.label || (it.text ? it.text.slice(0, 24) : '')
  }

  // 여는 시점 뷰포트 클램프(좁은 화면에서 창이 밖으로 잘려 열리지 않도록) — ToolWindow 의 dispW/clampPos 패턴 차용.
  // 펼친 창은 항상 화면 안에 통째로 들어오게(예전엔 가장자리 일부만 남겨 작은 모니터에서 대부분이 잘렸다)
  const dispW = Math.min(win.w, Math.max(240, vp.w - 16))
  const dispH = Math.min(win.h, Math.max(200, vp.h - 16))
  const dispLeft = clamp(win.x, 8, Math.max(8, vp.w - dispW - 8))
  const dispTop = clamp(win.y, 8, Math.max(8, vp.h - dispH - 8))

  return (
    <>
      {!open && (
        <div className="stash-icon-wrap" style={{ left: iconLeft, top: iconTop }}>
          <button
            className="stash-icon" title={'수집함 — 무엇이든 끌어다 담으세요 (' + count + ')'} aria-label="수집함 열기"
            style={{ borderColor: dragOver ? 'var(--accent)' : undefined, boxShadow: dragOver ? '0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)' : undefined }}
            onPointerDown={onIconDown} onPointerMove={onIconMove} onPointerUp={onIconUp} onClick={onIconClick}
            onDragOver={onDragOver} onDragLeave={() => setDragOver(false)} onDrop={(e) => acceptDrop(e)}
          >
            <Icon name="organize" size={24} />{count > 0 && <span className="stash-badge">{count}</span>}
          </button>
          <span className="stash-icon-chip" aria-hidden>수집함</span>
          {coach && (
            <div className="stash-coach" role="status">
              여기에 자료·메모·링크를 끌어다 모아두세요.
              <button className="stash-coach-x" aria-label="안내 닫기" onClick={(e) => { e.stopPropagation(); setCoach(false) }}>×</button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="stash-win" style={{ left: dispLeft, top: dispTop, width: dispW, height: dispH, zIndex: winZ }} onPointerDownCapture={raiseWin}>
          <div className="stash-head" onPointerDown={onWinDown} onPointerMove={onWinMove} onPointerUp={onWinUp}>
            <span className="stash-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="organize" size={16} mono />수집함 <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}>{count}개</span></span>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <button className="minibtn" onClick={addMemo} title="메모 추가" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="plus" size={14} mono />메모</button>
              <button className="minibtn" onClick={addUrl} title="URL 추가" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="link" size={14} mono />URL</button>
              <button className="minibtn" onClick={arrangeGrid} title="자동 정렬(격자)" aria-label="자동 정렬" style={{ display: 'inline-flex', alignItems: 'center' }}><Icon name="organize" size={14} mono /></button>
              <button className="minibtn" onClick={toggleListView} title={listView ? '캔버스 보기' : '목록 보기'} aria-label={listView ? '캔버스 보기' : '목록 보기'} aria-pressed={listView} style={{ display: 'inline-flex', alignItems: 'center' }}><Icon name={listView ? 'corkboard' : 'outliner'} size={14} mono /></button>
              <button className="minibtn" onClick={() => setOpen(false)} title="접기" style={{ display: 'inline-flex', alignItems: 'center' }}><Icon name="minimize" size={14} mono /></button>
            </span>
          </div>

          {listView ? (
            <div className="stash-list" tabIndex={0}
              onDragOver={onDragOver} onDragLeave={() => setDragOver(false)}
              onDrop={(e) => acceptDrop(e)}
              onPaste={(e) => { const t = e.clipboardData.getData('text'); if (t) { isUrl(t) ? addItem({ kind: 'url', url: t.trim() }) : addItem({ kind: 'memo', text: t, label: t.slice(0, 30) }); e.preventDefault() } }}
              style={{ borderColor: dragOver ? 'var(--accent)' : undefined }}>
              {count === 0 && <div className="stash-empty-list">여기에 무엇이든 끌어다 놓으세요. (파일·이미지·URL·메모)</div>}
              {items.map((it) => (
                <div key={it.id} className={'stash-row k-' + it.kind} role="button" tabIndex={0}
                  aria-label={labelOf(it) || '항목'} title={it.kind === 'doc' ? '문서로 이동' : it.kind === 'url' ? it.url : '열기'}
                  onClick={() => openItem(it)} onKeyDown={(e) => onItemKey(e, it)}>
                  <span className="stash-item-ic"><StashThumb it={it} /></span>
                  <span className="stash-item-label">{labelOf(it)}</span>
                  {isLocalMedia(it) && <span className="stash-local-tag" title="이 미디어는 이 기기에만 저장되며 .sry 에 포함되지 않습니다">로컬</span>}
                  {(it.kind === 'memo' || it.kind === 'note') && (
                    <button className="stash-item-insert" title="현재 원고(에디터)에 삽입" aria-label="원고에 삽입" onClick={(e) => { e.stopPropagation(); insertToEditor(it) }}>⤵ 원고</button>
                  )}
                  <button className="stash-item-x" title="제거(원본은 그대로)" aria-label="제거" onClick={(e) => { e.stopPropagation(); removeItem(it.id) }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="stash-canvas" style={{ borderColor: dragOver ? 'var(--accent)' : undefined }}
              onDragOver={onDragOver} onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const z = appZoom(); const sc = e.currentTarget as HTMLElement; acceptDrop(e, { x: (e.clientX - r.left) / z + sc.scrollLeft, y: (e.clientY - r.top) / z + sc.scrollTop }) }}
              onPaste={(e) => { const t = e.clipboardData.getData('text'); if (t) { isUrl(t) ? addItem({ kind: 'url', url: t.trim() }) : addItem({ kind: 'memo', text: t, label: t.slice(0, 30) }); e.preventDefault() } }}
              tabIndex={0}
            >
              {count === 0 && <div className="stash-empty">여기에 무엇이든 끌어다 놓으세요.<br />좌측 파일·갤러리 이미지·URL·메모·아이디어 모두 가능합니다.<br /><span style={{ fontSize: 11 }}>(붙여넣기로 URL/글 추가, 메모 버튼으로 즉석 아이디어)</span></div>}
              {items.map((it) => {
                const label = labelOf(it)
                return (
                  <div key={it.id} className={'stash-item k-' + it.kind} style={{ left: it.x, top: it.y }}
                    role="button" tabIndex={0} aria-label={label || '항목'}
                    onKeyDown={(e) => { if (editId === it.id) return; onItemKey(e, it) }}
                    onPointerDown={(e) => onItemDown(e, it)} onPointerMove={onItemMove} onPointerUp={(e) => onItemUp(e, it)} title={it.kind === 'doc' ? '클릭: 문서로 이동' : it.kind === 'url' ? it.url : '클릭: 열기'}>
                    {editId === it.id && (it.kind === 'memo' || it.kind === 'note') ? (
                      <textarea autoFocus className="stash-memo-edit" defaultValue={it.text || ''} onPointerDown={(e) => e.stopPropagation()}
                        onBlur={(e) => { updateItem(it.id, { text: e.target.value, label: e.target.value.slice(0, 30) || '메모' }); setEditId(null) }} />
                    ) : (
                      <>
                        <span className="stash-item-ic"><StashThumb it={it} /></span>
                        <span className="stash-item-label">{label}</span>
                        {isLocalMedia(it) && <span className="stash-local-tag" title="이 미디어는 이 기기에만 저장되며 .sry 에 포함되지 않습니다">로컬</span>}
                        {(it.kind === 'memo' || it.kind === 'note') && (
                          <button className="stash-item-insert" title="현재 원고(에디터)에 삽입" aria-label="원고에 삽입" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); insertToEditor(it) }}>⤵</button>
                        )}
                        <button className="stash-item-x" title="제거(원본은 그대로)" aria-label="제거" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeItem(it.id) }}>×</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {/* 리사이즈 핸들 */}
          <div className="stash-resize" onPointerDown={(e) => { e.stopPropagation(); const sx = e.clientX, sy = e.clientY, sw = win.w, sh = win.h; const z = appZoom(); const mv = (ev: PointerEvent) => setWin((w) => ({ ...w, w: clamp(sw + (ev.clientX - sx) / z, 300, 900), h: clamp(sh + (ev.clientY - sy) / z, 240, 760) })); const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); saveWin({ ...win, w: Math.max(300, win.w), h: Math.max(240, win.h) }) }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up) }} />
        </div>
      )}

      {viewer && (
        <div className="stash-viewer-backdrop" onClick={closeViewer}>
          <div className="stash-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="stash-viewer-head">
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewer.label}</span>
              {(viewer.kind === 'url' || viewer.kind === 'file') && <a className="minibtn" href={viewer.url} target="_blank" rel="noreferrer noopener" download={viewer.kind === 'file' ? viewer.label : undefined}>{viewer.kind === 'file' ? '⬇ 다운로드' : '↗ 새 탭'}</a>}
              <button className="minibtn" onClick={closeViewer}>닫기</button>
            </div>
            {viewer.kind === 'image' ? (
              <div className="stash-viewer-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
                <img src={viewer.url} alt={viewer.label} style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </div>
            ) : viewer.kind === 'audio' ? (
              <div className="stash-viewer-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <audio src={viewer.url} controls autoPlay style={{ width: '100%', maxWidth: 520 }} />
              </div>
            ) : viewer.kind === 'video' ? (
              <div className="stash-viewer-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <video src={viewer.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </div>
            ) : viewer.kind === 'file' ? (
              <div className="stash-viewer-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
                <div style={{ display: 'flex' }}><Icon name="reference" size={40} /></div>
                <div>이 형식은 미리보기가 어렵습니다. 위 “⬇ 다운로드”로 여세요.</div>
              </div>
            ) : (
              <iframe className="stash-viewer-body" src={viewer.url} title={viewer.label} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
            )}
            {viewer.local && <div className="stash-viewer-note">이 미디어는 이 기기에만 저장되며 .sry 내보내기에는 포함되지 않습니다(다른 기기에서 사라질 수 있어요).</div>}
            {viewer.kind === 'url' && <div className="stash-viewer-note">일부 사이트는 보안 정책으로 임베드가 막힐 수 있어요 — 그럴 땐 “↗ 새 탭”으로 여세요.</div>}
          </div>
        </div>
      )}
    </>
  )
}

// 항목 썸네일: 웹 이미지(it.url)는 직접, 로컬 이미지(blobId)는 objectURL 로(언마운트 시 revoke),
// blob 로드 실패/blobId 부재 시 인라인 dataURL(it.media) 폴백, 그 외는 종류 아이콘.
function StashThumb({ it }: { it: StashItem }) {
  const blobThumb = useBlobUrl(it.kind === 'image' && !it.url && it.blobId ? it.blobId : undefined)
  if (it.kind === 'image' && it.url) return <img src={it.url} alt="" className="stash-thumb" />
  if (it.kind === 'image' && blobThumb) return <img src={blobThumb} alt="" className="stash-thumb" />
  if (it.kind === 'image' && it.media) return <img src={it.media} alt="" className="stash-thumb" />
  return <Icon name={KIND_ICON[it.kind]} size={18} />
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function appZoom(): number { const z = parseFloat((document.documentElement.style as unknown as { zoom: string }).zoom); return z > 0.2 && z < 5 ? z : 1 }
