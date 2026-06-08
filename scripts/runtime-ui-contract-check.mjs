import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dashboard = path.join(root, 'src/components/dashboard.jsx');
const styles = path.join(root, 'src/styles.css');
const pkg = path.join(root, 'package.json');
const errors = [];
const warnings = [];
const REQUIRED_ADMIN_REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function scanFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanFiles(full, acc);
    else if (/\.(jsx?|tsx?|css|json|md|yml|yaml|html)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const dash = read(dashboard);
const css = read(styles);
const packageJson = JSON.parse(read(pkg) || '{}');

if (!dash) errors.push('src/components/dashboard.jsx 없음');
if (!css) errors.push('src/styles.css 없음');


if (!dash.includes("addEventListener('hashchange'") && !dash.includes('addEventListener("hashchange"')) {
  errors.push('hashchange 리스너가 없어 #tab 직접 진입/해시 링크가 React 탭과 동기화되지 않습니다.');
}
if (css.includes('.side { display: none') || css.includes('.side{display:none') || css.includes('.side {\n    display: none')) {
  if (!dash.includes('function MobileNav') || !dash.includes('<MobileNav')) {
    errors.push('모바일에서 sidebar를 숨기는데 MobileNav 렌더가 없어 탭 전환 경로가 사라집니다.');
  }
}


const deadPatterns = [
  ['onClick={() => {}}', '빈 onClick 핸들러가 남아 있습니다.'],
  ['href="#"', 'href="#" 링크가 남아 있습니다.'],
  ['javascript:;', 'javascript:; 링크가 남아 있습니다.'],
];
for (const [needle, message] of deadPatterns) {
  if (dash.includes(needle)) errors.push(message);
}
if (/\bnoop\b/.test(dash)) errors.push('noop 함수/상수가 남아 있습니다.');
if (/onClick=\{function\s+noop\b/.test(dash)) errors.push('noop onClick이 남아 있습니다.');


if (dash.includes('fetch(') && !dash.includes('cache: \'no-store\'') && !dash.includes('cache: "no-store"')) {
  errors.push('데이터 fetch에 cache: no-store가 없습니다.');
}
if (dash.includes('fetch(') && !dash.includes('VITE_DATA_VERSION')) {
  errors.push('데이터 fetch cache-busting용 VITE_DATA_VERSION이 없습니다.');
}



if (dash.includes('const refresh = () =>') && (!dash.includes('setReloadKey') || !/useLive[A-Za-z]+Data\(reloadKey\)/.test(dash))) {
  errors.push('새로고침 버튼이 데이터 재요청과 연결되어 있지 않습니다. spinner만 도는 가짜 새로고침은 금지합니다.');
}


if (/useState\(\[(['"][^'"]+['"],?\s*)+\]\)/.test(dash) && dash.includes('favoriteNames')) {
  errors.push('실데이터 없는 상태에서 관심 품목 기본값을 미리 넣으면 임의 데이터처럼 보입니다. 빈 배열로 시작해야 합니다.');
}
if (dash.includes("setSelectedDate('22')") || dash.includes('setSelectedDate("22")') || dash.includes("setSelectedDate('28')") || dash.includes('setSelectedDate("28")')) {
  errors.push('캘린더 월 이동에 고정 날짜 22/28 같은 목업 값이 남아 있습니다. 실제 월 상태로 계산해야 합니다.');
}
if (dash.includes('function Timeline({ liked, onToggleFavorite, selectedDate, items })')) {
  errors.push('Timeline에서 onOpenCalendar prop이 누락되어 실데이터 렌더 시 버튼이 깨질 수 있습니다.');
}
if (dash.includes('function FilingsPage') && dash.includes('suggestions = []') && dash.includes('suggestionsData=')) {
  errors.push('FilingsPage 자동완성 prop 이름이 suggestions/suggestionsData로 엇갈립니다.');
}



if (dash && !dash.includes('ADMIN_REGION_NAMES')) {
  errors.push('농산물 지역 필터가 전국 17개 광역자치단체 상수와 연결되어 있지 않습니다.');
}
for (const region of REQUIRED_ADMIN_REGIONS) {
  if (dash && !dash.includes(region)) errors.push(`농산물 UI에서 광역자치단체 지역명 누락: ${region}`);
}
const kamisProductsPath = path.join(root, 'scripts/kamis-products.json');
if (fs.existsSync(kamisProductsPath)) {
  try {
    const products = JSON.parse(read(kamisProductsPath));
    const firstRegions = Array.isArray(products?.[0]?.regions) ? products[0].regions : [];
    const regionNames = new Set(firstRegions.map((region) => region?.name).filter(Boolean));
    for (const region of REQUIRED_ADMIN_REGIONS) {
      if (!regionNames.has(region)) errors.push(`scripts/kamis-products.json 지역 수집 설정 누락: ${region}`);
    }
    for (const cityOnly of ['수원', '성남', '의정부', '고양', '용인', '춘천', '강릉', '청주', '천안', '전주', '순천', '포항', '안동', '창원', '김해']) {
      if (regionNames.has(cityOnly)) errors.push(`scripts/kamis-products.json에 시군구명(${cityOnly})이 직접 노출됩니다. 광역자치단체명으로 그룹핑해야 합니다.`);
    }
  } catch (error) {
    errors.push(`scripts/kamis-products.json 지역 설정 검사 실패: ${error.message}`);
  }
}


if (dash.includes("|| '무'") && dash.includes('setCompareName')) {
  errors.push('비교 품목 fallback이 고정 품목명으로 남아 있습니다. 실제 품목 목록에서만 비교 대상을 골라야 합니다.');
}
if (dash.includes("name: '대파'") || dash.includes("name: '사과'")) {
  errors.push('시장 동향 요약에 고정 품목명이 남아 있습니다. 운영 데이터 기반 문구만 사용해야 합니다.');
}


const deploy = packageJson.scripts?.['deploy:check'] || '';
if (!deploy.includes('runtime-ui:check')) {
  errors.push('deploy:check에 runtime-ui:check가 포함되어 있지 않습니다.');
}


const forbidden = [
  [48,53,46,49,51].map((code) => String.fromCharCode(code)).join(''),
  [51,44,53,55,51].map((code) => String.fromCharCode(code)).join(''),
  [50,44,57,49,51].map((code) => String.fromCharCode(code)).join(''),
  [49,44,54,52,50].map((code) => String.fromCharCode(code)).join(''),
  [50508,46896,51452,50976,49548,32,49340,49457,47196,51216].map((code) => String.fromCharCode(code)).join(''),
  [49436,50872,49884,32,44053,45224,44396,32,53580,54756,46976,47196].map((code) => String.fromCharCode(code)).join(''),
  [50640,53076,50532,53581].map((code) => String.fromCharCode(code)).join(''),
  [54000,50472,51648,48148,51060,50724].map((code) => String.fromCharCode(code)).join(''),
  [54620,48731,47112,51060,51200].map((code) => String.fromCharCode(code)).join(''),
  [50500,51060,50656,54000].map((code) => String.fromCharCode(code)).join(''),
  [54788,45824,52264].map((code) => String.fromCharCode(code)).join(''),
  [53664,49828].map((code) => String.fromCharCode(code)).join(''),
  [45348,51060,48260].map((code) => String.fromCharCode(code)).join(''),
  [84,111,115,115].map((code) => String.fromCharCode(code)).join(''),
  [78,97,118,101,114].map((code) => String.fromCharCode(code)).join(''),
  [78,65,86,69,82].map((code) => String.fromCharCode(code)).join(''),
  [111,112,101,110,97,105].map((code) => String.fromCharCode(code)).join(''),
  [105,110,116,101,114,110,97,108,46,97,112,105].map((code) => String.fromCharCode(code)).join(''),
  [97,112,112,108,105,101,100,45,99,97,97,115].map((code) => String.fromCharCode(code)).join(''),
];
for (const file of scanFiles(root)) {
  const rel = path.relative(root, file);
  if (rel === 'scripts/runtime-ui-contract-check.mjs') continue;
  const text = read(file);
  for (const word of forbidden) {
    if (text.includes(word)) errors.push(`${rel}: 금지/오래된/목업 문자열 감지: ${word}`);
  }
}


for (const file of scanFiles(path.join(root, 'public/data'))) {
  if (!file.endsWith('.json')) continue;
  const rel = path.relative(root, file);
  try {
    const data = JSON.parse(read(file));
    const hasRows = Array.isArray(data.items) ? data.items.length : Array.isArray(data.datasets) ? data.datasets.length : Array.isArray(data.snapshots) ? data.snapshots.length : 0;
    const generated = data.generatedAt || data.updatedAt || data.metadata?.updatedAt || data.metadata?.generatedAt || null;
    if (!hasRows && generated) errors.push(`${rel}: 빈 데이터인데 generatedAt/updatedAt이 들어 있습니다.`);
    const mode = data.status || data.mode || data.metadata?.source;
    if (!hasRows && ['live', 'partial'].includes(String(mode))) errors.push(`${rel}: 빈 데이터인데 live/partial 상태입니다.`);
  } catch (error) {
    errors.push(`${rel}: JSON 파싱 실패: ${error.message}`);
  }
}

if (warnings.length) {
  console.log('runtime-ui:check warnings');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.error('runtime-ui:check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('runtime-ui:check passed');
