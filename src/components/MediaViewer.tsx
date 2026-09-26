import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { BinderItem } from '../model'
import { loadBlob } from '../persistence/blobs'

// MIME → 확장자(점 포함). 흔한 미디어 형식만 보강하고, 모르면 빈 문자열.
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
}

// 내려받기 파일명: 제목에 확장자가 없으면 MIME 으로부터 확장자를 보강.
// (항목을 한글 등으로 리네임하면 확장자가 사라져 확장자 없는 파일로 저장되는 문제 방지.)
function downloadName(item: BinderItem): string {
  const title = (item.title || '미디어').trim() || '미디어'
  // 마지막 점 뒤가 짧은 영숫자면 이미 확장자가 있는 것으로 간주(과보강 방지).
  const dot = title.lastIndexOf('.')
  const hasExt = dot > 0 && /^[A-Za-z0-9]{1,8}$/.test(title.slice(dot + 1))
  if (hasExt) return title
  const ext = MIME_EXT[(item.mime || '').toLowerCase()] || ''
  return title + ext
}

// 이미지/PDF/일반 파일 미디어 아이템 뷰어. blobId 로 IndexedDB 에서 blob 을 읽어 표시.
export default function MediaViewer({ item }: { item: BinderItem }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [zoomed, setZoomed] = useState(false) // 이미지 원본 크기 보기 토글
  const [pdfPage, setPdfPage] = useState('') // PDF 이동할 페이지 번호 입력
  const urlRef = useRef<string | null>(null) // 현재 표시 중인 objectURL(교체 시점에만 revoke)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    setZoomed(false)
    setPdfPage('')
    if (!item.blobId) {
      setMissing(true)
      setUrl(null)
      setLoading(false)
      return
    }
    // 로딩 중에는 이전 화면을 유지(깜빡임 방지). 새 blob 준비 후 교체하며 이전 url 만 revoke.
    setLoading(true)
    loadBlob(item.blobId).then((blob) => {
      if (cancelled) return
      setLoading(false)
      if (!blob) {
        setMissing(true)
        return
      }
      const newUrl = URL.createObjectURL(blob)
      if (urlRef.current && urlRef.current !== newUrl) URL.revokeObjectURL(urlRef.current)
      urlRef.current = newUrl
      setUrl(newUrl)
    }, () => {
      if (cancelled) return
      setLoading(false)
      setMissing(true)
    })
    return () => {
      cancelled = true
    }
  }, [item.id, item.blobId])

  // 언마운트 시 현재 objectURL 해제
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const isImage = item.type === 'image' || (item.mime || '').startsWith('image/')
  const isPdf = item.type === 'pdf' || (item.mime || '') === 'application/pdf'

  // PDF 페이지 이동: 브라우저 기본 뷰어가 #page= 프래그먼트를 인식. 입력값을 url 에 부착.
  const pdfNum = parseInt(pdfPage, 10)
  const pdfSrc = url && isPdf && Number.isFinite(pdfNum) && pdfNum > 0 ? `${url}#page=${pdfNum}` : url || undefined

  return (
    <div className="media-viewer">
      <div className="media-bar">
        <span style={{ fontWeight: 600 }}>{item.title}</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.mime || item.type}</span>
        {url && isImage && (
          <button
            type="button"
            className="minibtn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setZoomed((z) => !z)}
            aria-pressed={zoomed}
            title={zoomed ? '화면에 맞추기' : '원본 크기로 보기'}
          >
            {zoomed ? '맞춤' : '원본'}
          </button>
        )}
        {url && isPdf && (
          <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
            페이지
            <input
              type="number"
              min={1}
              value={pdfPage}
              onChange={(e) => setPdfPage(e.target.value)}
              placeholder="1"
              title="이동할 페이지 번호 (브라우저 기본 PDF 뷰어 사용)"
              aria-label="PDF 페이지 번호"
              style={{ width: 56 }}
            />
          </label>
        )}
        {url && (
          <a
            className="minibtn"
            style={{ marginLeft: isImage || isPdf ? undefined : 'auto' }}
            href={url}
            download={downloadName(item)}
            title="내려받기"
          >
            <Download size={12} /> 내려받기
          </a>
        )}
      </div>
      <div className="media-body">
        {loading && !url && !missing && <div className="empty-hint">불러오는 중…</div>}
        {missing && (
          <div className="empty-hint">
            미디어 데이터를 찾을 수 없습니다. (다른 기기/브라우저에서 가져온 프로젝트는 미디어가 포함되지 않을 수 있습니다)
          </div>
        )}
        {url && isImage && (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: zoomed ? 'auto' : 'hidden',
              display: 'flex',
              alignItems: zoomed ? 'flex-start' : 'center',
              justifyContent: zoomed ? 'flex-start' : 'center',
            }}
          >
            <img
              src={url}
              alt={item.title}
              style={
                zoomed
                  ? { maxWidth: 'none', maxHeight: 'none' }
                  : { maxWidth: '100%', maxHeight: '100%' }
              }
            />
          </div>
        )}
        {url && isPdf && (
          <>
            <iframe title={item.title} src={pdfSrc} style={{ width: '100%', height: '100%', border: 'none' }} />
            <div className="empty-hint" style={{ fontSize: 11, padding: '4px 8px' }}>
              PDF 는 브라우저 기본 뷰어로 표시됩니다. 확대·검색·페이지 이동은 뷰어 도구를 사용하세요.
            </div>
          </>
        )}
        {url && !isImage && !isPdf && (
          <div className="empty-hint">
            이 파일 형식은 미리보기를 지원하지 않습니다. 위의 "내려받기"로 저장하세요.
          </div>
        )}
      </div>
    </div>
  )
}
