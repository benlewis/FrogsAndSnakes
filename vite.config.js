import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

function writeVersionFile() {
  return {
    name: 'write-version-file',
    apply: 'build',
    closeBundle() {
      let version
      try {
        version = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim()
      } catch {
        version = String(Date.now())
      }
      const out = path.resolve(__dirname, 'dist/version.txt')
      fs.writeFileSync(out, version + '\n')
    },
  }
}

export default defineConfig({
  plugins: [react(), writeVersionFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
