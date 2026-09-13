import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages 项目站点部署在 /<repo>/ 子路径下，构建时用 BASE_PATH=/<repo>/ 注入。
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/photos.json': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
    },
  },
})
