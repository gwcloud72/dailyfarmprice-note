import fs from 'node:fs/promises';

const DATA_PATH = new URL('../public/data/crop-prices.json', import.meta.url);
const ALLOWED_STATUS = new Set(['live', 'partial']);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  assert(ALLOWED_STATUS.has(data.status), `status는 live 또는 partial이어야 합니다. 현재값: ${data.status}`);
  assert(data.source === 'KAMIS Open API', 'source는 KAMIS Open API여야 합니다.');
  assert(Array.isArray(data.items), 'items 배열이 필요합니다.');
  assert(data.items.length > 0, '최소 1개 이상의 KAMIS 실데이터 품목이 필요합니다.');

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
  console.error('샘플 데이터 대체는 사용하지 않습니다. KAMIS Secret/Variables와 품목 코드를 확인해주세요.');
  process.exit(1);
}
