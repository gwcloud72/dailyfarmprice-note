import fs from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/crop-prices.json', import.meta.url);
const ERROR_REPORT_PATH = new URL('../.cache/crop-prices-last-error.json', import.meta.url);
const PRODUCT_FILE_PATH = new URL('./kamis-products.json', import.meta.url);
const API_BASE = process.env.KAMIS_API_BASE || 'http://www.kamis.or.kr/service/price/xml.do';
const CERT_KEY = process.env.KAMIS_CERT_KEY;
const CERT_ID = process.env.KAMIS_CERT_ID;

function parseBoolean(value, fallback = false) {
 if (value === undefined || value === null || String(value).trim() === '') return fallback;
 const normalized = String(value).trim().toLowerCase();
 if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
 if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
 throw new Error(`KAMIS_FETCH_ENABLED는 boolean 문자열이어야 합니다. 현재값=${value}`);
}

function parseInteger(value, fallback, { min = -Infinity, max = Infinity } = {}) {
 if (value === undefined || value === null || String(value).trim() === '') return fallback;
 const parsed = Number(value);
 if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
  throw new Error(`LOOKBACK_DAYS는 ${min}~${max} 범위의 정수여야 합니다. 현재값=${value}`);
 }
 return parsed;
}

const FETCH_ENABLED = parseBoolean(process.env.KAMIS_FETCH_ENABLED, true);
const SKIP_EMPTY_PRODUCTS = parseBoolean(process.env.KAMIS_SKIP_EMPTY_PRODUCTS, true);
const REQUIRE_FULL_REGION_COVERAGE = parseBoolean(process.env.KAMIS_REQUIRE_FULL_REGION_COVERAGE, false);
const ALLOW_STALE_ON_FAILURE = parseBoolean(process.env.KAMIS_ALLOW_STALE_ON_FAILURE, true);
const VERBOSE_FAILURES = parseBoolean(process.env.KAMIS_VERBOSE_FAILURES, false);
const LOOKBACK_DAYS = parseInteger(process.env.LOOKBACK_DAYS, 90, { min: 1, max: 365 });
const FETCH_TIMEOUT_MS = parseInteger(process.env.KAMIS_FETCH_TIMEOUT_MS, 12000, { min: 1000, max: 120000 });
const FAIL_ON_COLLECTION_ERROR = parseBoolean(process.env.KAMIS_FAIL_ON_COLLECTION_ERROR || process.env.KAMIS_STRICT_COLLECTION, false);
const COUNTRY_CODE = String(process.env.KAMIS_COUNTRY_CODE || '1101').trim();
const DEFAULT_PRICE_TYPE = ['retail', 'wholesale'].includes(String(process.env.KAMIS_PRICE_TYPE || '').trim())
 ? String(process.env.KAMIS_PRICE_TYPE).trim()
 : 'retail';
const DEFAULT_REGION_CONFIGS = [
 { code: '', name: '전국' },
 { code: '1101', name: '서울' },
 { code: '2100', name: '부산' },
 { code: '2200', name: '대구' },
 { code: '2300', name: '인천' },
 { code: '2401', name: '광주' },
 { code: '2501', name: '대전' },
 { code: '2601', name: '울산' },
 { code: '3111', name: '수원' },
 { code: '3113', name: '의정부' },
 { code: '3145', name: '용인' },
 { code: '3211', name: '춘천' },
 { code: '3311', name: '청주' },
 { code: '3511', name: '전주' },
 { code: '3613', name: '순천' },
 { code: '3711', name: '포항' },
 { code: '3714', name: '안동' },
 { code: '3814', name: '창원' },
 { code: '3911', name: '제주' },
];

const REQUIRED_ADMIN_REGION_NAMES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '수원', '의정부', '용인', '춘천', '청주', '전주', '순천', '포항', '안동', '창원', '제주'];

function filterItemsByFullRegionCoverage(items) {
 if (!REQUIRE_FULL_REGION_COVERAGE) return { items, excluded: [] };
 const groups = new Map();
 for (const item of items) {
  const key = String(item.baseId || item.name || item.id || '').trim();
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
 }
 const excluded = [];
 const keepKeys = new Set();
 for (const [key, rows] of groups.entries()) {
  const regionNames = new Set(rows.map((row) => row.region).filter(Boolean));
  const missing = [];
  if (!regionNames.has('전국')) missing.push('전국');
  missing.push(...REQUIRED_ADMIN_REGION_NAMES.filter((region) => !regionNames.has(region)));
  if (missing.length) {
   const label = rows[0]?.name || key;
   excluded.push(`${label}: ${missing.join(', ')} 누락`);
   continue;
  }
  keepKeys.add(key);
 }
 return { items: items.filter((item) => keepKeys.has(String(item.baseId || item.name || item.id || '').trim())), excluded };
}

const ACTION_BY_PRICE_TYPE = {
 retail: 'periodProductList',
 wholesale: 'periodProductList',
};

const PRODUCT_CLS_BY_PRICE_TYPE = {
 retail: '01',
 wholesale: '02',
};

class KamisFatalError extends Error {
 constructor(message, { code = '', data = '', condition = '' } = {}) {
  super(message);
  this.name = 'KamisFatalError';
  this.code = code;
  this.data = data;
  this.condition = condition;
 }
}

function isKamisFatalError(error) {
 return error instanceof KamisFatalError || error?.name === 'KamisFatalError';
}

function getKamisCode(payload) {
 const condition = payload?.condition;
 if (Array.isArray(condition)) return String(condition[0]?.code ?? condition[0]?.Code ?? '').trim();
 if (condition && typeof condition === 'object') return String(condition.code ?? condition.Code ?? '').trim();
 return String(payload?.code ?? payload?.resultCode ?? '').trim();
}

function getKamisDataMessage(payload) {
 const condition = payload?.condition;
 const conditionText = typeof condition === 'string' ? condition : condition ? JSON.stringify(condition) : '';
 const data = payload?.data;
 const dataText = typeof data === 'string' ? data : data ? JSON.stringify(data) : '';
 return { conditionText, dataText };
}

function assertKamisPayloadOk(payload, productName) {
 const code = getKamisCode(payload);
 const { conditionText, dataText } = getKamisDataMessage(payload);
 const combined = `${conditionText} ${dataText}`;

 if (code === '900' || /Unauthenticated|인증|인증Key|cert/i.test(combined)) {
  throw new KamisFatalError(
   `KAMIS 인증 실패: KAMIS_CERT_ID/KAMIS_CERT_KEY 값이나 승인 상태를 확인해야 합니다. (${productName})`,
   { code, data: dataText, condition: conditionText },
  );
 }

 if (code === '200' || /Wrong Parameters|Parameters|파라미터|parameter/i.test(combined)) {
  throw new KamisFatalError(
   `KAMIS 요청 파라미터 오류: 품목코드·품종코드·등급코드·지역코드를 확인해야 합니다. (${productName})`,
   { code, data: dataText, condition: conditionText },
  );
 }
}

async function loadProductConfigs() {
 const fromEnv = parseProducts(process.env.KAMIS_PRODUCTS_JSON);
 if (fromEnv.length) return fromEnv;

 try {
  const text = await fs.readFile(PRODUCT_FILE_PATH, 'utf8');
  const fromFile = parseProducts(text);
  if (fromFile.length) return fromFile;
 } catch {
  
 }

 return [];
}

function parseProducts(value) {
 if (!value) return [];
 try {
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
 } catch (error) {
  console.warn(`KAMIS 상품 설정 파싱 실패: ${error.message}`);
  return [];
 }
}

function normalizeRegionConfig(region) {
 if (typeof region === 'string') {
  const [code = '', name = ''] = region.split(':');
  return { code: code.trim(), name: (name || code || '전국').trim() };
 }

 if (region && typeof region === 'object') {
  return {
   code: String(region.code ?? region.countrycode ?? '').trim(),
   name: String(region.name ?? region.region ?? region.label ?? '').trim(),
  };
 }

 return { code: '', name: '전국' };
}

function parseRegionConfigs(value) {
 if (!value) return [];

 try {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) {
   return parsed.map(normalizeRegionConfig).filter((region) => region.name);
  }
 } catch {
  
 }

 return String(value)
  .split(',')
  .map((part) => normalizeRegionConfig(part))
  .filter((region) => region.name);
}

function getRegionConfigs(product) {
 const fromProduct = Array.isArray(product.regions)
  ? product.regions.map(normalizeRegionConfig).filter((region) => region.name)
  : [];
 if (fromProduct.length) return fromProduct;

 const fromEnv = parseRegionConfigs(process.env.KAMIS_REGION_CODES);
 if (fromEnv.length) return fromEnv;

 if (product.countrycode || product.region) {
  return [{ code: String(product.countrycode ?? COUNTRY_CODE).trim(), name: product.region || '서울' }];
 }

 return DEFAULT_REGION_CONFIGS;
}

function toKstDate(date = new Date()) {
 const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
 return kst.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
 const date = new Date(`${isoDate}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate() + days);
 return date.toISOString().slice(0, 10);
}

function getGeneratedAt() {
 const now = new Date();
 const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
 return kst.toISOString().replace('Z', '+09:00');
}

function normalizePrice(value) {
 const raw = String(value ?? '').trim();

 if (!raw || raw === '-' || raw === '0') return null;

 const number = Number(raw.replaceAll(',', ''));

 if (!Number.isFinite(number) || number <= 0) return null;
 return number;
}

function normalizeDate(row) {
 const year = String(row.yyyy || row.year || '').trim();
 const raw = String(row.regday || row.date || row.day || '').trim();

 if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
 if (/^\d{4}\.\d{2}\.\d{2}$/.test(raw)) return raw.replaceAll('.', '-');
 if (/^\d{2}-\d{2}$/.test(raw) && year) return `${year}-${raw}`;
 if (/^\d{2}\/\d{2}$/.test(raw) && year) return `${year}-${raw.replace('/', '-')}`;

 return raw;
}

function rowsFromPayload(payload) {
 const candidates = [payload?.data?.item, payload?.data, payload?.items, payload?.item, payload?.result, payload?.price];

 for (const candidate of candidates) {
  if (Array.isArray(candidate)) return candidate;
  if (candidate && typeof candidate === 'object') return [candidate];
 }

 return [];
}

function getPriceType(product) {
 return product.priceType || DEFAULT_PRICE_TYPE;
}

function getAction(product) {
 const priceType = getPriceType(product);
 return product.action || ACTION_BY_PRICE_TYPE[priceType] || ACTION_BY_PRICE_TYPE.retail;
}

function getProductClassCode(product) {
 if (product.productclscode !== undefined && product.productclscode !== null) {
  return String(product.productclscode).trim();
 }
 const priceType = getPriceType(product);
 return PRODUCT_CLS_BY_PRICE_TYPE[priceType] || PRODUCT_CLS_BY_PRICE_TYPE.retail;
}

function getKindCodeCandidates(product) {
 const candidates = [];

 if (Array.isArray(product.kindcodes)) candidates.push(...product.kindcodes);
 if (product.kindcode !== undefined && product.kindcode !== null) candidates.push(product.kindcode);

 
 if (!candidates.length) candidates.push('');

 return [...new Set(candidates.map((kindcode) => String(kindcode ?? '').trim()))];
}

function getPayloadMessage(payload) {
 const condition = payload?.condition ? ` condition=${JSON.stringify(payload.condition)}` : '';
 const data = payload?.data && typeof payload.data !== 'object' ? ` data=${payload.data}` : '';

 return `${condition}${data}`;
}

function toDailySeries(rows) {
 const grouped = new Map();

 for (const row of rows) {
  if (!grouped.has(row.date)) {
   grouped.set(row.date, {
    date: row.date,
    prices: [],
    marketNames: new Set(),
    countyNames: new Set(),
    itemNames: new Set(),
    kindNames: new Set(),
   });
  }

  const group = grouped.get(row.date);
  group.prices.push(row.price);

  if (row.marketName) group.marketNames.add(row.marketName);
  if (row.countyName) group.countyNames.add(row.countyName);
  if (row.itemName) group.itemNames.add(row.itemName);
  if (row.kindName) group.kindNames.add(row.kindName);
 }

 return [...grouped.values()]
  .map((group) => {
   const sum = group.prices.reduce((total, price) => total + price, 0);
   const average = Math.round(sum / group.prices.length);

   return {
    date: group.date,
    price: average,
    observationCount: group.prices.length,
    minPrice: Math.min(...group.prices),
    maxPrice: Math.max(...group.prices),
    marketNames: [...group.marketNames],
    countyNames: [...group.countyNames],
    itemNames: [...group.itemNames],
    kindNames: [...group.kindNames],
   };
  })
  .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchWithTimeout(url) {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
 try {
  return await fetch(url, { signal: controller.signal });
 } catch (error) {
  if (error?.name === 'AbortError') {
   throw new KamisFatalError(`KAMIS API 요청 시간 초과(${FETCH_TIMEOUT_MS}ms)`, { data: 'timeout' });
  }
  throw error;
 } finally {
  clearTimeout(timeout);
 }
}

async function fetchProductVariant(product, startDay, endDay, kindcode, regionConfig) {
 const priceType = getPriceType(product);
 const action = getAction(product);
 const url = new URL(API_BASE);

 url.searchParams.set('action', action);
 url.searchParams.set('p_cert_key', CERT_KEY);
 url.searchParams.set('p_cert_id', CERT_ID);
 url.searchParams.set('p_returntype', 'json');
 url.searchParams.set('p_productclscode', getProductClassCode(product));
 url.searchParams.set('p_startday', startDay);
 url.searchParams.set('p_endday', endDay);
 if (regionConfig?.code) {
  url.searchParams.set('p_countrycode', regionConfig.code);
 }
 url.searchParams.set('p_itemcategorycode', product.itemcategorycode);
 url.searchParams.set('p_itemcode', product.itemcode);
 url.searchParams.set('p_kindcode', kindcode);
 url.searchParams.set('p_productrankcode', product.productrankcode ?? '');
 url.searchParams.set('p_convert_kg_yn', product.convertKgYn ?? 'N');

 const response = await fetchWithTimeout(url);
 if (!response.ok) throw new Error(`${product.name} API 응답 실패: ${response.status}`);

 const text = await response.text();
 let payload;

 try {
  payload = JSON.parse(text);
 } catch {
  throw new Error(`${product.name} JSON 파싱 실패`);
 }

 assertKamisPayloadOk(payload, product.name);

 const rawRows = rowsFromPayload(payload)
  .map((row) => ({
   date: normalizeDate(row),
   price: normalizePrice(row.price),
   marketName: row.marketname,
   countyName: row.countyname,
   itemName: row.itemname,
   kindName: row.kindname,
  }))
  .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.price !== null && row.price > 0);

 if (!rawRows.length) {
  throw new Error(`${product.name} 조회 결과가 확인 필요합니다.${getPayloadMessage(payload)}`);
 }

 const dailyRows = toDailySeries(rawRows);

 if (!dailyRows.length) {
  throw new Error(`${product.name} 일별 집계 결과가 확인 필요합니다.`);
 }

 const latestRow = dailyRows.at(-1);
 const totalObservations = dailyRows.reduce((sum, row) => sum + row.observationCount, 0);

 console.log(`📊 ${product.name} 일별 집계 완료: 원본 ${rawRows.length}건 → 일별 ${dailyRows.length}건`);

 return {
  id: `${product.id}-${regionConfig?.code || 'all'}`,
  baseId: product.id,
  name: product.name,
  category: product.category || '농산물',
  region: regionConfig?.name || product.region || latestRow?.countyNames?.[0] || '전국',
  regionCode: regionConfig?.code || 'ALL',
  market: product.market || (priceType === 'retail' ? '소매' : '도매'),
  unit: product.unit || '1kg',
  kindName: latestRow?.kindNames?.[0] || product.kindName || '',
  sourceMeta: {
   priceType,
   action,
   productclscode: getProductClassCode(product),
   itemcategorycode: product.itemcategorycode,
   itemcode: product.itemcode,
   kindcode,
   productrankcode: product.productrankcode ?? '',
   countrycode: regionConfig?.code || '',
   regionName: regionConfig?.name || '전국',
   aggregation: 'daily-average',
   rawRowCount: rawRows.length,
   dailyRowCount: dailyRows.length,
   totalObservations,
  },
  series: dailyRows.map((row) => ({
   date: row.date,
   price: row.price,
   observationCount: row.observationCount,
   minPrice: row.minPrice,
   maxPrice: row.maxPrice,
  })),
 };
}

async function fetchProduct(product, startDay, endDay, regionConfig) {
 const kindcodes = getKindCodeCandidates(product);
 const errors = [];

 for (const kindcode of kindcodes) {
  try {
   const result = await fetchProductVariant(product, startDay, endDay, kindcode, regionConfig);
   const label = kindcode ? `kindcode=${kindcode}` : 'kindcode=fallback';
   console.log(`✅ ${product.name} / ${regionConfig?.name || '전국'} 데이터 수집 완료 (${label})`);
   return result;
  } catch (error) {
   if (isKamisFatalError(error)) throw error;
   const label = kindcode ? `kindcode=${kindcode}` : 'kindcode=fallback';
   errors.push(`${label}: ${error.message}`);
  }
 }

 throw new Error(`${product.name} / ${regionConfig?.name || '전국'} 모든 품종 코드 조회 실패: ${errors.join(' / ')}`);
}

function isEmptyKamisResult(error) {
 const message = String(error?.message || '');
 return message.includes('조회 결과가 확인 필요합니다') && !message.includes('fetch failed') && !message.includes('API 응답 실패');
}

function summarizeFailures(productName, failures) {
 if (!failures.length) return null;
 const regions = [...new Set(failures.map((failure) => failure.region).filter(Boolean))];
 const preview = regions.slice(0, 5).join(', ');
 const suffix = regions.length > 5 ? ` 외 ${regions.length - 5}개` : '';
 const requestLabel = failures.length === regions.length
  ? `${failures.length}개 지역`
  : `${failures.length}개 요청/${regions.length}개 지역`;
 const firstReason = VERBOSE_FAILURES && failures[0]?.message ? ` · 첫 오류: ${failures[0].message}` : '';
 return `${productName}: ${requestLabel} 수집 실패(${preview}${suffix})${firstReason}`;
}

async function writeData(data) {
 await fs.mkdir(new URL('../.cache/', import.meta.url), { recursive: true });
 await fs.writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}


async function readExistingData(fileUrl) {
 try {
  const text = await fs.readFile(fileUrl, 'utf8');
  const payload = JSON.parse(text);
  if (Array.isArray(payload?.items) && payload.items.length > 0) return payload;
 } catch {
  
 }
 return null;
}

async function hasExistingData(fileUrl) {
 return Boolean(await readExistingData(fileUrl));
}

async function writeCollectionErrorReport(reason, details = []) {
 await fs.mkdir(new URL('../.cache/', import.meta.url), { recursive: true });
 await fs.writeFile(ERROR_REPORT_PATH, `${JSON.stringify({
  status: 'collection_failed',
  generatedAt: getGeneratedAt(),
  reason,
  details,
  policy: ALLOW_STALE_ON_FAILURE
   ? '기존 crop-prices.json을 유지합니다. 새 가격을 임의 생성하지 않습니다.'
   : '수집 실패 시 배포를 중단합니다.',
  hints: [
   'KAMIS_CERT_ID와 KAMIS_CERT_KEY가 GitHub Secrets에 반대로 입력되지 않았는지 확인하세요.',
   'KAMIS 응답 코드 900은 인증 실패, 200은 파라미터 오류, 001은 no data입니다.',
   'KAMIS_REQUIRE_FULL_REGION_COVERAGE=true이면 일부 지역 누락만으로도 결과가 제외될 수 있습니다.',
   '정확한 원인 확인 시 KAMIS_VERBOSE_FAILURES=true로 실행하세요.'
  ]
 }, null, 2)}\n`, 'utf8');
}

async function keepExistingData(reason, details = []) {
 await writeCollectionErrorReport(reason, details);
 const existing = await readExistingData(DATA_PATH);
 if (!existing || !ALLOW_STALE_ON_FAILURE || FAIL_ON_COLLECTION_ERROR) return false;
 console.warn(`KAMIS 실데이터 수집이 완료되지 않아 기존 crop-prices.json을 유지합니다: ${reason}`);
 if (details.length) {
  console.warn('KAMIS 실패 상세 예시:');
  details.slice(0, 8).forEach((detail) => console.warn(`- ${detail}`));
 }
 console.warn('새 대체 데이터는 생성하지 않았습니다. 마지막으로 검증된 public/data/crop-prices.json만 유지합니다.');
 console.warn('상세 원인은 .cache/crop-prices-last-error.json에 기록했습니다.');
 return true;
}

async function runKamisSmokeCheck(startDay, endDay) {
 const smokeProduct = {
  id: 'kamis-smoke-rice',
  name: 'KAMIS 연결 확인',
  category: '식량작물',
  market: '소매',
  unit: '1kg',
  itemcategorycode: '100',
  itemcode: '111',
  kindcodes: ['01', ''],
  productrankcode: '04',
  convertKgYn: 'Y',
  priceType: 'retail',
 };
 const smokeRegion = { code: '1101', name: '서울' };
 try {
  await fetchProduct(smokeProduct, startDay, endDay, smokeRegion);
  console.log('✅ KAMIS 인증/연결 사전 점검 통과');
  return true;
 } catch (error) {
  const reason = `KAMIS 인증/연결 사전 점검 실패: ${error.message}`;
  if (isKamisFatalError(error)) {
   if (await keepExistingData(reason, [reason])) return false;
   throw error;
  }
  if (await keepExistingData(reason, [reason])) return false;
  throw error;
 }
}

async function main() {
 const productConfigs = await loadProductConfigs();

 if (!FETCH_ENABLED || !CERT_KEY || !CERT_ID || productConfigs.length === 0) {
  const missing = [];
  if (!FETCH_ENABLED) missing.push('KAMIS_FETCH_ENABLED=true');
  if (!CERT_KEY) missing.push('KAMIS_CERT_KEY');
  if (!CERT_ID) missing.push('KAMIS_CERT_ID');
  if (productConfigs.length === 0) missing.push('scripts/kamis-products.json 또는 KAMIS_PRODUCTS_JSON');

  if (await keepExistingData(`KAMIS 실데이터 수집 설정이 필요합니다: ${missing.join(', ')}`, missing)) return;

  throw new Error(`KAMIS 실데이터 수집 설정이 필요합니다: ${missing.join(', ')}. 기존 데이터가 없어 생성을 중단합니다.`);
 }

 const today = toKstDate();
 const startDay = addDays(today, -(LOOKBACK_DAYS - 1));
 const shouldContinue = await runKamisSmokeCheck(startDay, today);
 if (!shouldContinue) return;
 const errors = [];
 const items = [];
 const failureSamples = [];

 const skippedProducts = [];

 for (const product of productConfigs) {
  const regionConfigs = getRegionConfigs(product);
  const nationalRegion = regionConfigs.find((region) => !region.code) || null;
  const regionalConfigs = nationalRegion
   ? regionConfigs.filter((region) => region !== nationalRegion)
   : regionConfigs;
  const productFailures = [];

  if (nationalRegion) {
   try {
    items.push(await fetchProduct(product, startDay, today, nationalRegion));
   } catch (error) {
    if (isKamisFatalError(error)) throw error;
    if (SKIP_EMPTY_PRODUCTS && isEmptyKamisResult(error)) {
     skippedProducts.push(`${product.name}: 전국 조회 결과 없음`);
     console.warn(`⚠️ ${product.name}: 전국 데이터가 없어 지역별 수집을 생략합니다.`);
     continue;
    }
    productFailures.push({ region: nationalRegion.name || '전국', message: error.message });
   }
  }

  for (const regionConfig of regionalConfigs) {
   try {
    items.push(await fetchProduct(product, startDay, today, regionConfig));
   } catch (error) {
    if (isKamisFatalError(error)) throw error;
    productFailures.push({ region: regionConfig?.name || '전국', message: error.message });
   }
  }

  const summary = summarizeFailures(product.name, productFailures);
  if (summary) {
   errors.push(summary);
   productFailures.slice(0, 2).forEach((failure) => {
    failureSamples.push(`${product.name} / ${failure.region}: ${failure.message}`);
   });
   console.warn(`⚠️ ${summary}`);
  }
 }

 if (!items.length) {
  const reason = [...errors, ...skippedProducts].join(' / ') || '수집 가능한 응답 없음';
  if (await keepExistingData(reason, failureSamples)) return;
  throw new Error(`KAMIS 데이터 수집에 실패했습니다. 기존 데이터가 없거나 KAMIS_ALLOW_STALE_ON_FAILURE=false입니다. ${reason}`);
 }

 const coverage = filterItemsByFullRegionCoverage(items);
 if (!coverage.items.length) {
  const reason = `전국·17개 시도 전체 커버리지를 만족하는 품목이 확인 필요합니다. ${coverage.excluded.join(' / ')}`;
  if (await keepExistingData(reason, coverage.excluded)) return;
  throw new Error(reason);
 }

 const notices = [];
 if (errors.length) notices.push(`일부 지역 수집 실패: ${errors.join(' / ')}`);
 if (skippedProducts.length) notices.push(`응답 없는 품목 제외: ${skippedProducts.join(' / ')}`);
 if (coverage.excluded.length) notices.push(`지역 커버리지 부족 품목 제외: ${coverage.excluded.join(' / ')}`);

 await writeData({
  status: errors.length || skippedProducts.length || coverage.excluded.length ? 'partial' : 'live',
  source: 'KAMIS Open API',
  generatedAt: getGeneratedAt(),
  aggregation: 'daily-average',
  notice: notices.length
   ? notices.join(' · ')
   : 'KAMIS Open API 데이터를 전국·지역별 날짜 평균 가격으로 집계해 정적 JSON으로 생성했습니다.',
  items: coverage.items,
 });
}

main().catch((error) => {
 console.error(`데이터 갱신 실패: ${error.message}`);
 if (isKamisFatalError(error)) {
  if (error.code) console.error(`KAMIS error code: ${error.code}`);
  if (error.condition) console.error(`KAMIS condition: ${error.condition}`);
  if (error.data) console.error(`KAMIS data: ${error.data}`);
 }
 process.exit(1);
});
