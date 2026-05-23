import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 정적 호스팅, GitHub Pages 프로젝트 페이지, 로컬 미리보기 모두에서
// JS/CSS/이미지 경로가 루트(/assets)로 튀지 않도록 상대 경로로 빌드합니다.
// 특정 배포 환경에서 절대 base가 꼭 필요할 때만 VITE_BASE_PATH로 덮어씁니다.
const base = process.env.VITE_BASE_PATH || './';

export default defineConfig({
  plugins: [react()],
  base,
});
