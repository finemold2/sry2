// GitHub Pages 배포용 정적 사이트 조립 (site/README.md "B. 소개 페이지 + 앱을 한 번에 올리기" 자동화).
//   site/  → _site/       소개(랜딩) 페이지 (루트)
//   dist/  → _site/app/   빌드된 앱 (base './' 상대경로라 하위 경로에서도 동작)
// 사용: npm run build:pages   (= vite build 후 이 스크립트)   → _site/ 를 통째로 호스팅에 올림.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SITE = path.join(ROOT, 'site')
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, '_site')

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html 이 없습니다 — 먼저 `npm run build` 를 실행하세요.')
  process.exit(1)
}

fs.rmSync(OUT, { recursive: true, force: true })

// 소개 페이지: 문서(README/DESIGN)는 페이지 에셋이 아니므로 제외
fs.cpSync(SITE, OUT, {
  recursive: true,
  filter: (src) => !/[\\/]site[\\/](README|DESIGN)\.md$/.test(src),
})

// 앱: dist 통째로 /app/ 아래에
fs.cpSync(DIST, path.join(OUT, 'app'), { recursive: true })

// 브랜치 배포로 전환하더라도 Jekyll 이 _ 로 시작하는 경로 등을 걸러내지 않도록
fs.writeFileSync(path.join(OUT, '.nojekyll'), '')

const count = (dir) => {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) n += e.isDirectory() ? count(path.join(dir, e.name)) : 1
  return n
}
console.log(`_site/ 조립 완료 — 파일 ${count(OUT)}개 (소개 페이지: /, 앱: /app/)`)
