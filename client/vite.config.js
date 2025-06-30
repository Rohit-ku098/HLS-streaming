import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "localhost",
    proxy: {
      // "/r2-stream": {
      //   target:
      //     "https://coding-panda-test.09204dde9f9fc1a25bb97a02965a2dec.r2.cloudflarestorage.com/1751122633539-13271737/master.m3u8?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=739e29fd03b7321204ac40fa68d60dcb%2F20250628%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250628T150134Z&X-Amz-Expires=3600&X-Amz-Signature=e9ad364c9899e38ca5d0f3980b8500cd6ad270b56d2ac0e0a9e8135cb18174e1&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/r2-stream/, ""),
      //   secure: false,
      // },
      // "https://coding-panda-test.09204dde9f9fc1a25bb97a02965a2dec.r2.cloudflarestorage.com/":
      //   {
      //     target:
      //       "https://coding-panda-test.09204dde9f9fc1a25bb97a02965a2dec.r2.cloudflarestorage.com",
      //     changeOrigin: true,
      //     rewrite: (path) => path.replace(/^\/media/, ""),
      //   },
    },
  },
});
