#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`${relativePath}: 파일이 없습니다.`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function walk(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath).flatMap((entry) => walk(path.join(targetPath, entry)));
}

const sourceFiles = walk(path.join(root, 'src')).filter((filePath) => /\.(js|jsx|ts|tsx)$/.test(filePath));
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
const dashboard = read('src/components/dashboard.jsx');

function expect(snippet, label) {
  if (!dashboard.includes(snippet) && !sourceText.includes(snippet)) errors.push(`${label} 누락`);
}

function checkFormControlsHaveLabels() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const controls = source.match(/<(input|select|textarea)\b[^>]*>/g) || [];
    controls.forEach((control, index) => {
      if (!/aria-label=/.test(control) && !/id=/.test(control)) {
        errors.push(`${relativePath}: ${control.match(/^<\w+/)?.[0] || 'control'} #${index + 1} 접근성 label 누락`);
      }
    });
  }
}

function checkButtonsHaveHandlers() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const buttons = source.match(/<button\b[^>]*>/g) || [];
    buttons.forEach((button, index) => {
      const hasHandler = /onClick=|onFocus=|onMouseEnter=/.test(button);
      const hasType = /type=/.test(button);
      if (!hasHandler) errors.push(`${relativePath}: button #${index + 1} 동작 핸들러 누락`);
      if (!hasType) warnings.push(`${relativePath}: button #${index + 1} type 명시 권장`);
    });
  }
}

function checkExternalLinksHaveRel() {
  for (const filePath of sourceFiles) {
    const relativePath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const links = source.match(/<a\b[^>]*>/g) || [];
    links.forEach((link, index) => {
      if (/target="_blank"/.test(link)) {
        const rel = (link.match(/rel="([^"]+)"/)?.[1] || '').split(/\s+/);
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
          errors.push(`${relativePath}: external link #${index + 1} rel="noopener noreferrer" 누락`);
        }
      }
    });
  }
}

function checkSharedContracts() {
  expect('href="#main-content"', '본문 바로가기 링크');
  expect('id="main-content"', 'main-content anchor');
  expect('aria-current={tab === item.id ?', '현재 탭 aria-current');
  expect('aria-live="polite"', '상태 live region');
  expect('URLSearchParams', 'hash query 상태 관리');
  expect('window.history.replaceState', 'URL 상태 유지');
  expect("addEventListener('hashchange'", 'hashchange 동기화');
  expect('function MobileNav', '모바일 탭바');
  expect('VITE_DATA_VERSION', '데이터 캐시 버전');
  expect("cache: 'no-store'", '데이터 no-store fetch');
  expect('setReloadKey', '새로고침 데이터 재요청');
  if (/\bnoop\b/.test(dashboard)) errors.push('noop 함수/상수가 남아 있습니다.');
  if (dashboard.includes('onClick={() => {}}')) errors.push('빈 onClick 핸들러가 남아 있습니다.');
  if (dashboard.includes('href="#"')) errors.push('href="#" 링크가 남아 있습니다.');
  if (dashboard.includes('javascript:;')) errors.push('javascript:; 링크가 남아 있습니다.');
  checkFormControlsHaveLabels();
  checkButtonsHaveHandlers();
  checkExternalLinksHaveRel();
}

function checkAppSpecificContracts() {
  const pkg = JSON.parse(read('package.json') || '{}');
  const name = pkg.name || '';
  if (name.includes('farm')) {
    for (const label of ['품목별 시세', '지역별 비교', '가격 리포트', '관심 품목', '데이터 안내']) expect(label, `농산물 탭 ${label}`);
    expect('ADMIN_REGION_NAMES', '전국 17개 시도 지역 상수');
    expect('KAMIS 실데이터', 'KAMIS 데이터 대기 상태');
    expect('chartX(', '농산물 차트 동적 좌표');
  }
  if (name.includes('liter')) {
    for (const label of ['주유소 찾기', '가격 분석', '내 주유 기록', '즐겨찾기', '알림 설정']) expect(label, `리터세이브 탭 ${label}`);
    expect('REGION_OPTIONS', '전국 17개 시도 지역 상수');
    expect('카카오맵', '카카오맵 길찾기');
    expect('priceDiffCopy', '평균 대비 가격 문구 보정');
    expect('miniChartX(', '유가 차트 동적 좌표');
  }
  if (name.includes('sangjang')) {
    for (const label of ['일정 캘린더', '기업 목록', '공시 검색', '관심기업', 'AI 리포트', '알림', '설정']) expect(label, `상장노트 탭 ${label}`);
    expect('투자 권유가 아닙니다', '투자권유 아님 고지');
    expect('날짜 미정', '날짜 없는 일정 fallback');
    expect('CalendarCard', '캘린더 화면');
  }
}

checkSharedContracts();
checkAppSpecificContracts();

if (warnings.length) {
  console.log('interaction:check warnings');
  warnings.forEach((message) => console.log(`- ${message}`));
}

if (errors.length) {
  console.error('interaction:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('interaction:check passed');
console.log(`Scanned files: ${sourceFiles.length}`);
