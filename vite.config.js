// 페이지 두 개 — index.html(화면 1) · work.html(노트북 클릭 시). 빌드에 둘 다 포함
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), work: resolve(__dirname, 'work.html') },
    },
  },
});
