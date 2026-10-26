import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 윈도우에서 localhost가 IPv6(::1)로만 열리면 설치 앱·엣지가 127.0.0.1로 찾아가 연결 거부가 난다.
  // IPv4로 고정하면 브라우저는 localhost로도 잘 찾아온다
  server: { host: '127.0.0.1', port: 5173 },
})
