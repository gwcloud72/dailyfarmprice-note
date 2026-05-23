import fs from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/crop-prices.json', import.meta.url);
const ALLOWED_STATUS = new Set(['live', 'partial', 'empty']);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  assert(ALLOWED_STATUS.has(data.status), `status는 live, partial 또는 empty여야 합니다. 현재값: ${data.status}`);
  assert(data.source === 'KAMIS Open API', 'source는 KAMIS Open API여야 합니다.');
  assert(Array.isArray(data.items), 'items 배열이 필요합니다.');

  if (data.items.length === 0) {
    assert(data.status === 'empty', 'items가 비어 있으면 status는 empty여야 합니다.');
    console.log('✅ 표시할 KAMIS 데이터가 없어 empty state 배포로 검증을 통과합니다.');
    process.exit(0);
  }

  const regionNames = new Set(data.items.map((item) => item.region).filter(Boolean));
  const regionalNames = [...regionNames].filter((region) => region !== '전국');
  assert(regionNames.has('전국'), '전국 기준 데이터가 필요합니다. p_countrycode를 비운 전체지역 수집 결과를 확인하세요.');
  assert(regionalNames.length >= 5, `전국 비교 화면을 위해 전국 외 최소 5개 이상 지역 데이터가 필요합니다. 현재 지역: ${[...regionNames].join(', ') || '없음'}`);

  for (const item of data.items) {
    assert(item.id && item.name, '품목 id/name 값이 필요합니다.');
    assert(Array.isArray(item.series), `${item.name} series 배열이 필요합니다.`);
    assert(item.series.length > 0, `${item.name} 가격 데이터가 비어 있습니다.`);

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

  console.log(`✅ KAMIS 실데이터 검증 완료: ${data.items.length}개 품목`);
} catch (error) {
  console.error(`❌ 데이터 검증 실패: ${error.message}`);
  console.error('KAMIS Secret/Variables와 품목 코드를 확인해주세요. 데이터가 없어도 홈 화면은 empty state로 배포할 수 있습니다.');
  process.exit(1);
}
