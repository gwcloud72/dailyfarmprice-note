import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const errors = [];
const warnings = [];

function valueOf(name) {
 const value = process.env[name];
 return value === undefined ? '' : String(value).trim();
}

function optionalBoolean(name) {
 const value = valueOf(name).toLowerCase();
 if (!value) return;
 if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value)) {
  errors.push(`${name}: boolean 문자열이어야 합니다. 예: true 또는 false`);
 }
}

function optionalInteger(name, { min = -Infinity, max = Infinity } = {}) {
 const raw = valueOf(name);
 if (!raw) return;
 const number = Number(raw);
 if (!Number.isInteger(number)) {
  errors.push(`${name}: 정수 문자열이어야 합니다. 현재값=${raw}`);
  return;
 }
 if (number < min || number > max) errors.push(`${name}: ${min}~${max} 범위여야 합니다. 현재값=${raw}`);
}

function optionalEnum(name, values) {
 const raw = valueOf(name);
 if (!raw) return;
 if (!values.includes(raw)) errors.push(`${name}: ${values.join(' | ')} 중 하나여야 합니다. 현재값=${raw}`);
}

function optionalJsonArray(name) {
 const raw = valueOf(name);
 if (!raw) return;
 try {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) errors.push(`${name}: JSON 배열이어야 합니다.`);
 } catch (error) {
  errors.push(`${name}: JSON 파싱 실패 (${error.message})`);
 }
}

function optionalGeminiModel() {
 const raw = valueOf('GEMINI_MODEL');
 if (!raw) return;
 if (!/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(raw) || /pro/i.test(raw)) {
  errors.push('GEMINI_MODEL: Flash 계열 모델만 허용됩니다. 예: gemini-2.5-flash');
 }
}

function truthy(value) {
 return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

try {
 require('../tailwind.config.cjs');
} catch (error) {
 errors.push(`tailwind.config.cjs 로드 실패: ${error.message}`);
}

optionalBoolean('KAMIS_FETCH_ENABLED');
optionalBoolean('KAMIS_SKIP_EMPTY_PRODUCTS');
optionalBoolean('KAMIS_REQUIRE_FULL_REGION_COVERAGE');
optionalInteger('LOOKBACK_DAYS', { min: 1, max: 365 });
optionalInteger('REPORT_RANGE_DAYS', { min: 1, max: 365 });
optionalInteger('NEWS_DISPLAY', { min: 1, max: 100 });
optionalInteger('NEWS_MAX_ITEMS', { min: 1, max: 100 });
optionalInteger('NEWS_REQUEST_PAUSE_MS', { min: 0, max: 5000 });
optionalEnum('KAMIS_PRICE_TYPE', ['retail', 'wholesale']);
optionalJsonArray('KAMIS_PRODUCTS_JSON');
optionalBoolean('GEMINI_REPORTS_ENABLED');
optionalInteger('GEMINI_REQUEST_PAUSE_MS', { min: 5000, max: 60000 });
optionalInteger('GEMINI_MAX_INPUT_CHARS', { min: 4000, max: 60000 });
optionalInteger('GEMINI_MAX_RETRIES', { min: 0, max: 4 });
optionalGeminiModel();

if (!valueOf('KAMIS_CERT_ID') || !valueOf('KAMIS_CERT_KEY')) {
 warnings.push('KAMIS 인증 정보가 설정되지 않으면 Actions는 기존 public/data를 사용합니다.');
}
if (!valueOf('NEWS_CLIENT_ID') || !valueOf('NEWS_CLIENT_SECRET')) {
 warnings.push('NEWS_CLIENT_ID/NEWS_CLIENT_SECRET가 설정되지 않으면 뉴스 수집을 건너뜁니다.');
}
if (truthy(valueOf('GEMINI_REPORTS_ENABLED')) && !valueOf('GEMINI_API_KEY')) {
 errors.push('GEMINI_REPORTS_ENABLED=true이면 GEMINI_API_KEY가 필요합니다.');
}

if (warnings.length) {
 console.log('actions:check warnings');
 warnings.forEach((message) => console.log(`- ${message}`));
}
if (errors.length) {
 console.error('actions:check failed');
 errors.forEach((message) => console.error(`- ${message}`));
 process.exit(1);
}
console.log('actions:check passed');
