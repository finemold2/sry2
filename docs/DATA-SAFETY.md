# 데이터 안전성 (원고 소실 방지)

사용자 최우선 요구: "이미 쓴 원고가 저장 실패/소실/변형되면 안 된다." 영속성 계층을 다층 보강함.

## 저장 경로 개요
- **IndexedDB**(주): `scrivener-web`/`projects`(프로젝트 전체, 본문 인라인), `scrivener-web-backups`/`backups`(zip 스냅샷 롤링 15), `scrivener-web-blobs`(이미지/PDF). `localStorage` 에 lastProjectId.
- **File System Access**(선택): `.scriv` 폴더(`project.json` + `Files/<id>.rtf`).
- 흐름: 편집→dirty→자동저장(디바운스 기본 1.5s)→`idbSave`→다탭 broadcast→10분 throttle 자동 zip 백업.

## 적용된 보강 (위치)
| 보강 | 파일/함수 | 효과 |
|---|---|---|
| 쓰기-되읽기 검증 | `idb.ts` `idbSave` | put 후 되읽어 modified 일치 확인, 불일치/할당량초과 시 throw → "저장됨" 오인 방지 |
| 저장공간 추정 | `idb.ts` `storageEstimate` | 할당량>92% 시 내보내기 경고 |
| 백업 무결성 검증 | `backup.ts` `saveBackup` | zip round-trip(importZip) 성공 시에만 보관, 새 백업 저장 후에만 옛 것 삭제 |
| 구조 자동 복구 | `pack.ts` `repairStructure`(normalizeProject 내부) | 끊긴 rootOrder/childIds/parentId 정리 + **고아 아이템을 루트로 끌어올려 절대 소실 없음**. 전 로드 경로 적용 |
| 로드 실패 복구 | `App.tsx` 복원 useEffect | idbLoad 실패/손상 시 **최신 백업 자동 복구** |
| 종료 보호 | `App.tsx` | `beforeunload` 미저장 경고 + `visibilitychange`(숨김) 시 IDB 강제 플러시 |
| 다탭 안전 | `App.tsx` 자동저장 | 프로젝트 id 가드 + 다른 탭 변경은 **백업 성공 후에만** 덮어쓰기 |
| 저장 실패 가시화 | `App.tsx` `saveError` + `.save-btn.save-error` | 빨간 "저장 실패!" 버튼 + 안내 + 4초 후 1회 재시도 |

## 핵심 불변식
`repairStructure` 이후 **`items` 의 모든 항목은 rootOrder 에서 도달 가능** → 어떤 손상/부분저장에도 문서가 조용히 사라지지 않음.

## 테스트
- 단위: `npm run test:persistence`(19) — repairStructure 불변식(고아 보존·아이템 0 소실·대규모 손상 강건성).
- E2E: `node scripts/_cdp_datasafety.cjs`(15) — 저장 라운드트립·새로고침 영속·IDB 실기록 확인·고아 보존·손상/누락 레코드 무크래시.
- 테스트 훅(빌드 포함): `window.__scriv.state()/setBody(rtf)/bodyOf(id)`.

## 향후 후보(미적용)
- `.scriv` 폴더 쓰기 원자성(temp 후 교체) — 현재는 순차 쓰기. FSA 가 원자적 rename 미지원이라 보류.
- 명시적 "복구 지점" UI(스냅샷 타임라인). 현재는 BackupModal 로 백업 복원 가능.
