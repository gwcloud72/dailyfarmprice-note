import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isUserOrOrgPage = repoName.endsWith('.github.io');
const defaultBase = process.env.GITHUB_ACTIONS && repoName && !isUserOrOrgPage ? `/${repoName}/` : '/';
const base = process.env.VITE_BASE_PATH || defaultBase;

export default defineConfig({
  plugins: [react()],
  base,
});
