import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 브라우저 전용 정적 SPA. 서버/백엔드 없음. PWA 로 오프라인 설치 가능.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'sry',
        short_name: 'sry',
        description: 'sry — 브라우저 글쓰기 앱 (본문은 실제 .rtf)',
        lang: 'ko',
        theme_color: '#3a4150',
        background_color: '#d7d9dd',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // 이모지 SVG(수백 개)는 프리캐시에서 제외하고 런타임 캐시로 — 설치 용량 경량 + 오프라인 동작.
        globIgnores: ['**/emoji/**'],
        // 창작 스튜디오 데이터(합성기/가이드/분석기) 청크가 커서 한도를 넉넉히 둔다 — 오프라인 완전 동작용.
        maximumFileSizeToCacheInBytes: 14 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // 로컬 Twemoji 에셋: 첫 사용 시 캐시 → 이후 오프라인에서도 표시
            urlPattern: ({ url }) => url.pathname.includes('/emoji/'),
            handler: 'CacheFirst',
            options: { cacheName: 'emoji-svg', expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
