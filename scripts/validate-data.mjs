import fs from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/crop-prices.json', import.meta.url);
const ALLOWED_STATUS = new Set(['live', 'partial']);

const MAX_DATA_AGE_DAYS = Number(process.env.KAMIS_MAX_DATA_AGE_DAYS || 7);
const REQUIRED_ADMIN_REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
function parseDate(value) {
 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? null : date;
}
function latestSeriesDate(items) {
 let latest = null;
 for (const item of items) {
  for (const point of Array.isArray(item.series) ? item.series : []) {
   const date = parseDate(point.date);
   if (date && (!latest || date > latest)) latest = date;
  }
 }
 return latest;
}


function isTruthy(value) {
 return ['true', '1', 'yes', 'y', 'on'].includes(String(value || '').trim().toLowerCase());
}

const STRICT_VALIDATION = isTruthy(process.env.KAMIS_STRICT_VALIDATION);

const assert = (condition, message) => {
 if (!condition) throw new Error(message);
};

try {
 const raw = await fs.readFile(DATA_PATH, 'utf8');
 const data = JSON.parse(raw);
 const items = Array.isArray(data.items) ? data.items : [];

 if (!items.length) {
  if (STRICT_VALIDATION) {
   throw new Error('KAMIS_STRICT_VALIDATION=true 상태에서는 최소 1개 이상의 KAMIS 실데이터 품목이 필요합니다.');
  }
  assert(!data.status || ['fallback', 'partial'].includes(data.status), `fallback status 확인이 필요합니다. 현재값: ${data.status}`);
  console.log('✅ 농산물 fallback 구조 확인 완료');
  process.exit(0);
 }

 assert(ALLOWED_STATUS.has(data.status), `status는 live 또는 partial이어야 합니다. 현재값: ${data.status}`);
 assert(['KAMIS Open API', 'packaged', 'garak-market-public-baseline'].includes(data.source), 'source는 KAMIS Open API, packaged 또는 garak-market-public-baseline이어야 합니다.');
 assert(Array.isArray(data.items), 'items 배열이 필요합니다.');
 assert(data.items.length > 0, '최소 1개 이상의 가격 품목이 필요합니다.');

 const latestDate = latestSeriesDate(data.items);
 assert(latestDate, 'series 기준일 확인이 필요합니다.');
 const ageDays = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
 assert(ageDays <= MAX_DATA_AGE_DAYS, `KAMIS 최신 기준일 ${latestDate.toISOString().slice(0, 10)}이 ${ageDays}일 전입니다. 오래된 데이터를 배포하지 않습니다.`);

 const regionNames = new Set(data.items.map((item) => item.region).filter(Boolean));
 const regionalNames = [...regionNames].filter((region) => region !== '전국');
 const missingAdminRegions = REQUIRED_ADMIN_REGIONS.filter((region) => !regionNames.has(region));
 assert(regionNames.has('전국'), '전국 기준 데이터가 필요합니다. p_countrycode를 비운 전체지역 수집 결과를 확인하세요.');
 assert(missingAdminRegions.length === 0, `전국 17개 광역자치단체 데이터가 모두 필요합니다. 누락: ${missingAdminRegions.join(', ') || '없음'} / 현재 지역: ${regionalNames.join(', ') || '없음'}`);

 for (const item of data.items) {
  assert(item.id && item.name, '품목 id/name 값이 필요합니다.');
  assert(Array.isArray(item.series), `${item.name} series 배열이 필요합니다.`);
  assert(item.series.length > 0, `${item.name} 가격 데이터가 확인 필요합니다.`);

  const seenDates = new Set();
  let previousDate = '';

  for (const point of item.series) {
   assert(/^\d{4}-\d{2}-\d{2}$/.test(point.date), `${item.name} 날짜 형식이 올바르지 않습니다: ${point.date}`);
   assert(!seenDates.has(point.date), `${item.name} 중복 날짜가 있습니다: ${point.date}`);
   assert(point.date >= previousDate, `${item.name} 날짜가 오름차순이 아닙니다: ${point.date}`);
   assert(Number.isFinite(Number(point.price)), `${item.name} 가격 값이 숫자가 아닙니다: ${point.price}`);
   assert(Number(point.price) > 0, `${item.name} 가격 값은 0보다 커야 합니다: ${point.price}`);

   seenDates.add(point.date);
   previousDate = point.date;
  }
 }

 console.log(`✅ 가격 데이터 검증 완료: ${data.items.length}개 품목`);
} catch (error) {
 console.error(`❌ 데이터 검증 실패: ${error.message}`);
 console.error('KAMIS Secret/Variables와 품목 코드를 확인해주세요. Secret 설정과 데이터 파일을 확인해주세요.');
 process.exit(1);
}
