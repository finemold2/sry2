import { useEffect, useState } from 'react'
import { useModal } from './useModal'
import { useStore } from '../store/store'
import {
  deleteBackup,
  getBackupBlob,
  listBackups,
  loadBackup,
  loadBackupFiles,
  saveBackup,
  type BackupMeta,
} from '../persistence/backup'
import { applySryAux } from '../persistence/sryfmt'
import { downloadBlob, fileMapToZip } from '../persistence/zip'
import { buildSryFileMap, sryBaseName } from '../persistence/sryfmt'
import { idbSave } from '../persistence/idb'
import { Icon } from '../ui/icons'

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function fmtSize(n: number): string {
  return n < 1024 ? n + ' B' : n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB'
}

export default function BackupModal({ onClose }: { onClose: () => void }) {
  const project = useStore((s) => s.project)
  const loadProject = useStore((s) => s.loadProject)
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState(false)

  const refresh = () => listBackups().then(setBackups)
  useEffect(() => {
    refresh().catch((err) => {
      console.error('백업 목록을 불러오지 못했습니다:', err)
      setMsgError(true)
      setMsg('백업 목록을 불러오지 못했습니다.')
    })
  }, [])

  const doBackup = async () => {
    setBusy(true)
    try {
      await saveBackup(project)
      setMsgError(false)
      setMsg('현재 프로젝트를 백업했습니다.')
      await refresh()
    } catch (e) {
      // 백업 검증/저장 실패 시 성공으로 오인하지 않도록 명확히 알린다(데이터 안전).
      setMsgError(true)
      setMsg('백업 실패: ' + ((e as Error)?.message || e) + ' — 다시 시도하거나 파일로 내보내기를 사용하세요.')
    } finally {
      setBusy(false)
    }
  }

  // 현재 프로젝트를 .sry 파일로 내보낸다(App 의 requestSwitch 전환 확인과 동일한 경로).
  const exportCurrentSry = async () => {
    const blob = await fileMapToZip(await buildSryFileMap(project))
    downloadBlob(blob, sryBaseName(project) + '.sry.zip')
  }

  const restore = async (b: BackupMeta) => {
    // 다른 프로젝트 백업으로 복원하면 현재 프로젝트가 화면에서 사라진다(전환).
    // App 의 requestSwitch 와 동일하게 '다른 프로젝트로 전환' 경고 + 현재 작업 .sry 내보내기를 권한다.
    const isSwitch = b.projectId !== project.id
    if (isSwitch) {
      const ok = window.confirm(
        `"${b.title}" (${fmtDate(b.date)})는 다른 프로젝트의 백업입니다.\n` +
          `복원하면 현재 프로젝트 "${project.title || '제목 없는 프로젝트'}"가 닫히고 그 프로젝트로 전환됩니다.\n` +
          `(현재 작업은 브라우저(IndexedDB)에 자동저장되며, 직전 상태는 백업 목록에도 보관됩니다.)\n\n` +
          `계속할까요?`,
      )
      if (!ok) return
      // 전환 전, 현재 작업을 .sry 파일로 내보낼지 추가로 묻는다(다른 전환 경로와 일관).
      if (window.confirm('전환 전에 현재 프로젝트를 .sry 파일로 내보낼까요?')) {
        try {
          await exportCurrentSry()
        } catch (e) {
          // 내보내기 실패해도 전환 자체는 막지 않되, 실패 시 중단 여부를 사용자에게 확인(데이터 인지).
          if (
            !window.confirm(
              '.sry 내보내기에 실패했습니다(' + ((e as Error)?.message || e) + ').\n' +
                '그래도 전환을 계속할까요? (현재 작업은 브라우저에 자동저장되어 있습니다.)',
            )
          )
            return
        }
      }
    } else if (
      !window.confirm(
        `"${b.title}" (${fmtDate(b.date)}) 백업으로 되돌립니다. 현재본은 백업 목록에 보관 후 교체됩니다. 계속할까요?`,
      )
    ) {
      return
    }
    try {
      // 복원 직전 현재 상태를 백업으로 보관(자동저장이 IDB본을 덮어써도 복구 가능)
      await saveBackup(project).catch(() => {})
      // 전환 시 현재 프로젝트를 IDB 에도 영속(다른 전환 경로와 동일하게 재오픈 가능하도록).
      if (isSwitch) await idbSave(project).catch(() => {})
      const p = await loadBackup(b.id)
      if (p) {
        loadProject(p)
        // 백업에 동봉된 라이브러리/수집함도 복원(복원 확정 직후).
        try { const files = await loadBackupFiles(b.id); if (files) await applySryAux(files, p.id) } catch { /* noop */ }
        useStore.setState({ dirty: true })
        onClose()
      } else {
        setMsgError(true)
        setMsg('백업을 불러오지 못했습니다.')
      }
    } catch {
      setMsgError(true)
      setMsg('백업을 불러오지 못했습니다(손상된 백업).')
    }
  }

  const download = async (b: BackupMeta) => {
    const blob = await getBackupBlob(b.id)
    if (blob) downloadBlob(blob, `${b.title}-${fmtDate(b.date).replace(/[: ]/g, '')}.sry.zip`)
  }

  const remove = async (b: BackupMeta) => {
    await deleteBackup(b.id)
    await refresh()
  }

  const mine = backups.filter((b) => b.projectId === project.id)
  const others = backups.filter((b) => b.projectId !== project.id)

  const row = (b: BackupMeta) => (
    <div className="snap-item" key={b.id}>
      <div className="snap-meta">
        {fmtDate(b.date)} · {fmtSize(b.size)}
      </div>
      <div>{b.title}</div>
      <div className="snap-actions">
        <button className="minibtn" onClick={() => restore(b)}>
          복원
        </button>
        <button className="minibtn" onClick={() => download(b)}>
          내려받기
        </button>
        <button className="minibtn danger" onClick={() => remove(b)}>
          삭제
        </button>
      </div>
    </div>
  )

  const dialogRef = useModal<HTMLDivElement>(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} ref={dialogRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>백업 / 복원</h2>
        <div className="modal-body">
          <div className="row" style={{ marginBottom: 12, alignItems: 'center' }}>
            <button className="btn-primary" style={{ flex: '0 0 auto' }} onClick={doBackup} disabled={busy}>
              지금 백업
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              저장 시 자동으로도 보관됩니다(프로젝트별 최근 15개).
              {msg && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {msgError && <Icon name="flag" size={14} />}
                  {msg}
                </span>
              )}
            </span>
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', margin: '4px 0' }}>
            이 프로젝트
          </div>
          {mine.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>아직 백업이 없습니다.</div>
          ) : (
            mine.map(row)
          )}

          {others.length > 0 && (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', margin: '14px 0 4px' }}>
                다른 프로젝트
              </div>
              {others.map(row)}
            </>
          )}

          {/* 재난 복구 경로(#27): 브라우저 데이터가 지워졌어도 내보내 둔 .sry 파일이 있으면 여기서 바로 되살릴 수 있다. */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>파일에서 복원</div>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <button className="minibtn" onClick={() => { onClose(); try { window.dispatchEvent(new CustomEvent('scriv:open-sry-picker')) } catch { /* noop */ } }}>
                .sry 파일 열기…
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>내보내 둔 .sry 파일이 있다면 브라우저 데이터가 지워졌어도 복원할 수 있어요.</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
