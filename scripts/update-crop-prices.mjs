import fs from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/crop-prices.json', import.meta.url);
const PRODUCT_FILE_PATH = new URL('./kamis-products.json', import.meta.url);
const API_BASE = process.env.KAMIS_API_BASE || 'http://www.kamis.or.kr/service/price/xml.do';
const CERT_KEY = process.env.KAMIS_CERT_KEY;
const CERT_ID = process.env.KAMIS_CERT_ID;
const FETCH_ENABLED = process.env.KAMIS_FETCH_ENABLED === 'true';
const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 90);
const COUNTRY_CODE = process.env.KAMIS_COUNTRY_CODE || '1101';
const DEFAULT_PRICE_TYPE = process.env.KAMIS_PRICE_TYPE || 'retail';

const ACTION_BY_PRICE_TYPE = {
  retail: 'periodRetailProductList',
  wholesale: 'periodWholesaleProductList',
};

async function loadProductConfigs() {
  const fromEnv = parseProducts(process.env.KAMIS_PRODUCTS_JSON);
  if (fromEnv.length) return fromEnv;

  try {
    const text = await fs.readFile(PRODUCT_FILE_PATH, 'utf8');
    const fromFile = parseProducts(text);
    if (fromFile.length) return fromFile;
  } catch {
    // 파일이 없으면 빈 배열을 반환하고, main에서 설정 오류로 처리합니다.
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

function getKindCodeCandidates(product) {
  const candidates = [];

  if (Array.isArray(product.kindcodes)) candidates.push(...product.kindcodes);
  if (product.kindcode !== undefined && product.kindcode !== null) candidates.push(product.kindcode);

  // kindcode가 비어 있으면 KAMIS가 품목 전체를 반환하는 API도 있어서 빈 값도 한 번 시도합니다.
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
        sampleCount: group.prices.length,
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

async function fetchProductVariant(product, startDay, endDay, kindcode) {
  const priceType = getPriceType(product);
  const action = getAction(product);
  const url = new URL(API_BASE);

  url.searchParams.set('action', action);
  url.searchParams.set('p_cert_key', CERT_KEY);
  url.searchParams.set('p_cert_id', CERT_ID);
  url.searchParams.set('p_returntype', 'json');
  url.searchParams.set('p_startday', startDay);
  url.searchParams.set('p_endday', endDay);
  url.searchParams.set('p_countrycode', product.countrycode ?? COUNTRY_CODE);
  url.searchParams.set('p_itemcategorycode', product.itemcategorycode);
  url.searchParams.set('p_itemcode', product.itemcode);
  url.searchParams.set('p_kindcode', kindcode);
  url.searchParams.set('p_productrankcode', product.productrankcode ?? '');
  url.searchParams.set('p_convert_kg_yn', product.convertKgYn ?? 'N');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${product.name} API 응답 실패: ${response.status}`);

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${product.name} JSON 파싱 실패`);
  }

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
    throw new Error(`${product.name} 조회 결과가 비어 있습니다.${getPayloadMessage(payload)}`);
  }

  const dailyRows = toDailySeries(rawRows);

  if (!dailyRows.length) {
    throw new Error(`${product.name} 일별 집계 결과가 비어 있습니다.`);
  }

  const latestRow = dailyRows.at(-1);
  const totalSamples = dailyRows.reduce((sum, row) => sum + row.sampleCount, 0);

  console.log(`📊 ${product.name} 일별 집계 완료: 원본 ${rawRows.length}건 → 일별 ${dailyRows.length}건`);

  return {
    id: product.id,
    name: product.name,
    category: product.category || '농산물',
    region: product.region || latestRow?.countyNames?.[0] || '서울',
    market: product.market || (priceType === 'retail' ? '소매' : '도매'),
    unit: product.unit || '1kg',
    kindName: latestRow?.kindNames?.[0] || product.kindName || '',
    sourceMeta: {
      priceType,
      action,
      itemcategorycode: product.itemcategorycode,
      itemcode: product.itemcode,
      kindcode,
      productrankcode: product.productrankcode ?? '',
      countrycode: product.countrycode ?? COUNTRY_CODE,
      aggregation: 'daily-average',
      rawSampleCount: rawRows.length,
      dailySampleCount: dailyRows.length,
      totalSamples,
    },
    series: dailyRows.map((row) => ({
      date: row.date,
      price: row.price,
      sampleCount: row.sampleCount,
      minPrice: row.minPrice,
      maxPrice: row.maxPrice,
    })),
  };
}

async function fetchProduct(product, startDay, endDay) {
  const kindcodes = getKindCodeCandidates(product);
  const errors = [];

  for (const kindcode of kindcodes) {
    try {
      const result = await fetchProductVariant(product, startDay, endDay, kindcode);
      const label = kindcode ? `kindcode=${kindcode}` : 'kindcode=empty';
      console.log(`✅ ${product.name} 데이터 수집 완료 (${label})`);
      return result;
    } catch (error) {
      const label = kindcode ? `kindcode=${kindcode}` : 'kindcode=empty';
      errors.push(`${label}: ${error.message}`);
    }
  }

  throw new Error(`${product.name} 모든 품종 코드 조회 실패: ${errors.join(' / ')}`);
}

async function writeData(data) {
  await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  const productConfigs = await loadProductConfigs();

  if (!FETCH_ENABLED || !CERT_KEY || !CERT_ID || productConfigs.length === 0) {
    const missing = [];
    if (!FETCH_ENABLED) missing.push('KAMIS_FETCH_ENABLED=true');
    if (!CERT_KEY) missing.push('KAMIS_CERT_KEY');
    if (!CERT_ID) missing.push('KAMIS_CERT_ID');
    if (productConfigs.length === 0) missing.push('scripts/kamis-products.json 또는 KAMIS_PRODUCTS_JSON');

    throw new Error(`KAMIS 실데이터 수집 설정이 필요합니다: ${missing.join(', ')}. 샘플 데이터 대체는 사용하지 않습니다.`);
  }

  const today = toKstDate();
  const startDay = addDays(today, -(LOOKBACK_DAYS - 1));
  const errors = [];
  const items = [];

  for (const product of productConfigs) {
    try {
      items.push(await fetchProduct(product, startDay, today));
    } catch (error) {
      errors.push(error.message);
      console.warn(`⚠️ ${error.message}`);
    }
  }

  if (!items.length) {
    throw new Error(`KAMIS 데이터 수집에 실패했습니다. 샘플 데이터 대체는 사용하지 않습니다. ${errors.join(' / ')}`);
  }

  await writeData({
    status: errors.length ? 'partial' : 'live',
    source: 'KAMIS Open API',
    generatedAt: getGeneratedAt(),
    aggregation: 'daily-average',
    notice: errors.length
      ? `일부 품목 수집 실패: ${errors.join(' / ')}`
      : 'KAMIS Open API 데이터를 날짜별 평균 가격으로 집계해 정적 JSON으로 생성했습니다.',
    items,
  });
}

main().catch((error) => {
  console.error(`데이터 갱신 실패: ${error.message}`);
  process.exit(1);
});
