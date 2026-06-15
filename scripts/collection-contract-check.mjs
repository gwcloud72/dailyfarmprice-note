import { readFileSync } from 'node:fs';
const errors = [];
const update = readFileSync('scripts/update-crop-prices.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/deploy-github-pages.yml', 'utf8');
const gitignore = readFileSync('.gitignore', 'utf8');
if (!update.includes('KAMIS_ALLOW_STALE_ON_FAILURE')) errors.push('KAMIS 실패 시 기존 데이터 유지 플래그가 없습니다.');
if (!update.includes('.cache/crop-prices-last-error.json')) errors.push('KAMIS 실패 원인 기록 파일이 없습니다.');
if (!/process\.exit\(1\)/.test(update)) errors.push('치명 오류 경로 검증이 없습니다.');
if (!gitignore.includes('.cache/') && !gitignore.includes('crop-prices-last-error.json')) errors.push('KAMIS 실패 상세 로그가 커밋될 수 있습니다. .gitignore에 추가하세요.');
if (/git add[^\n]+crop-prices-last-error/.test(workflow)) errors.push('workflow가 실패 상세 로그를 커밋하려고 합니다.');
if (errors.length) { console.error('collection:check failed'); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log('collection:check passed');
