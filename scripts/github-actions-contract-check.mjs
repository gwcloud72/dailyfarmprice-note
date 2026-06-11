#!/usr/bin/env node
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

optionalBoolean('KAMIS_FETCH_ENABLED');
optionalBoolean('KAMIS_SKIP_EMPTY_PRODUCTS');
optionalBoolean('KAMIS_REQUIRE_FULL_REGION_COVERAGE');
optionalBoolean('GEMINI_REPORT_ENABLED');
optionalInteger('LOOKBACK_DAYS', { min: 1, max: 365 });
optionalInteger('REPORT_RANGE_DAYS', { min: 1, max: 365 });
optionalInteger('NEWS_DISPLAY', { min: 1, max: 100 });
optionalInteger('NEWS_MAX_ITEMS', { min: 1, max: 100 });
optionalInteger('NEWS_REQUEST_PAUSE_MS', { min: 0, max: 5000 });
optionalEnum('KAMIS_PRICE_TYPE', ['retail', 'wholesale']);
optionalJsonArray('KAMIS_PRODUCTS_JSON');

if (!valueOf('KAMIS_CERT_ID') || !valueOf('KAMIS_CERT_KEY')) {
 warnings.push('KAMIS_CERT_ID/KAMIS_CERT_KEY가 비어 있으면 Actions는 기존 public/data를 사용합니다.');
}
if (!valueOf('GEMINI_API_KEY')) {
 warnings.push('GEMINI_API_KEY가 비어 있으면 로컬 규칙 기반 리포트를 생성합니다.');
}

if (!valueOf('NEWS_CLIENT_ID') || !valueOf('NEWS_CLIENT_SECRET')) {
 warnings.push('NEWS_CLIENT_ID/NEWS_CLIENT_SECRET가 비어 있으면 뉴스 수집을 건너뜁니다.');
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

