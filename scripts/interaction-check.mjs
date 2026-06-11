#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const errors = [];
const warnings = [];
function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}
const sourceFiles = walk(path.join(root, 'src')).filter((filePath) => /\.(ts|tsx)$/.test(filePath));
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
function expect(snippet, label) { if (!sourceText.includes(snippet)) errors.push(`${label} 누락`); }
function checkControls() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const controls = source.match(/<(input|select|textarea)\b[^>]*>/g) || [];
    controls.forEach((control, index) => { if (!/aria-label=/.test(control) && !/id=/.test(control)) errors.push(`${relativePath}: control #${index + 1} 접근성 label 누락`); });
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    buttons.forEach((button, index) => { if (!/onClick=|onFocus=|onMouseEnter=/.test(button)) errors.push(`${relativePath}: button #${index + 1} 동작 핸들러 누락`); if (!/type=/.test(button)) warnings.push(`${relativePath}: button #${index + 1} type 명시 권장`); });
    const links = source.match(/<a\b[^>]*>/g) || [];
    links.forEach((link, index) => { if (/target="_blank"/.test(link) && !/rel="noopener noreferrer"/.test(link)) errors.push(`${relativePath}: external link #${index + 1} rel 누락`); });
  }
}
for (const snippet of ['href="#main-content"', 'id="main-content"', 'aria-current={active ? \'page\' : undefined}', 'aria-live="polite"', 'URLSearchParams', 'window.history.replaceState', "addEventListener('hashchange'", 'function MobileNav', 'VITE_DATA_VERSION', "cache: 'no-store'", 'setReloadKey']) expect(snippet, snippet);
const expectedByProject = {
  'farm-price-note': ['품목별 가격 정보','시장별 가격 정보','가격 동향 분석','지역별 비교','통계 정보','시장 동향','알림 서비스','데이터 받기','즐겨찾는 품목','이용 안내','ADMIN_REGION_NAMES'],
  'liter-save': ['주유소 찾기','가격 분석','가격 추이','최근 주유 기록','자주 가는 주유소','유가 뉴스','알림 설정','이용 가이드','공지사항','REGION_OPTIONS','카카오맵','priceDiffCopy'],
  'sangjang-note': ['관심기업','기업 목록','공시 검색','일정 캘린더','타임라인','뉴스','리포트','공시 요약','청약 마감 알림','출처','투자 권유가 아닙니다','날짜 미정','CalendarCard']
};
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const item of expectedByProject[pkg.name] || []) expect(item, item);
checkControls();
if (warnings.length) { console.log('interaction:check warnings'); warnings.forEach((warning) => console.log(`- ${warning}`)); }
if (errors.length) { console.error('interaction:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('interaction:check passed');
console.log(`Scanned files: ${sourceFiles.length}`);
