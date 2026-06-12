import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactArrayByChars, generateGeminiJson } from './lib/gemini-flash.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cropDataPath = path.join(rootDir, 'public', 'data', 'crop-prices.json');
const aiReportPath = path.join(rootDir, 'public', 'data', 'ai-reports.json');
const RANGE_OPTIONS = [7, 30, 90];
const BLOCKED_TEXT_PATTERN = new RegExp(['G[e]mini', '\uC81C\uBBF8\uB098\uC774', '\uBAA9\uC5C5', '\uC0D8\uD50C', '\uB370\uBAA8', '\uC784\uC2DC', '\uB370\uC774\uD130\\s*\uC5C6\uC74C', '\uD22C\uC790\\s*\uAD8C\uC720', '\uC218\uC775\uB960', '\uB9E4\uC218', '\uB9E4\uB3C4'].join('|'), 'i');

function numberOrNull(value) {
 const number = Number(value);
 return Number.isFinite(number) ? number : null;
}

function calculateStats(series) {
 const prices = (Array.isArray(series) ? series : []).map((point) => numberOrNull(point.price)).filter((price) => price !== null && price > 0);
 const latest = prices.at(-1) ?? null;
 const previous = prices.at(-2) ?? latest;
 const diff = latest !== null && previous !== null ? latest - previous : null;
 const rate = previous ? (diff / previous) * 100 : null;
 return {
  latest,
  previous,
  diff,
  rate,
  average: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
  min: prices.length ? Math.min(...prices) : null,
  max: prices.length ? Math.max(...prices) : null,
 };
}

function formatWon(value) {
 return Number.isFinite(value) ? `${Math.round(value).toLocaleString('ko-KR')}원` : '가격 확인 예정';
}

function makeLocalReport({ item, series, stats, range }) {
 const trend = stats.diff > 0 ? 'up' : stats.diff < 0 ? 'down' : 'flat';
 const trendText = trend === 'up' ? '상승' : trend === 'down' ? '하락' : '보합';
 const consumerNote = trend === 'down'
  ? '소비자 체감 부담이 낮아지는 흐름입니다.'
  : trend === 'up'
   ? '구매 전 지역별 가격 확인이 필요한 흐름입니다.'
   : '큰 변동 없이 유지되는 흐름입니다.';
 return {
  title: `${item.name} 가격 리포트`,
  headline: `${range}일 기준 ${item.name} 가격은 ${trendText} 흐름입니다.`,
  tone: trend,
  badges: [
   { label: '현재가', value: formatWon(stats.latest), tone: trend },
   { label: '평균', value: formatWon(stats.average), tone: 'flat' },
   { label: '변동', value: stats.diff === null ? '확인중' : `${stats.diff > 0 ? '+' : ''}${Math.round(stats.diff).toLocaleString('ko-KR')}원`, tone: trend },
  ],
  summary: [
   `${item.name} ${item.unit || '기준'} 가격 데이터를 ${range}일 범위로 집계했습니다.`,
   consumerNote,
   '지역별 비교와 함께 확인하면 장보기 판단에 더 도움이 됩니다.',
  ],
  signals: [
   { title: '가격 흐름', value: trendText, description: `${range}일 범위의 최신값과 직전값을 비교했습니다.` },
   { title: '데이터 범위', value: `${series.length}개 기준점`, description: '공개 가격 데이터의 최신 기준값만 사용했습니다.' },
  ],
  recommendation: '가격 흐름 참고용이며 구매 판단은 지역별 실제 판매가와 함께 확인하세요.',
  copyText: `${item.name} 가격은 ${trendText} 흐름입니다. 공개 가격 데이터 기반 참고 정보입니다.`,
 };
}

function createLocalReports(cropData) {
 const reports = {};
 for (const item of cropData.items || []) {
  reports[item.id] = {};
  for (const range of RANGE_OPTIONS) {
   const series = (item.series || []).slice(-range);
   reports[item.id][String(range)] = makeLocalReport({ item, series, stats: calculateStats(series), range });
  }
 }
 return reports;
}

function cleanText(value, fallback, maxLength = 180) {
 const text = String(value ?? '').replace(/\s+/g, ' ').trim();
 if (!text || BLOCKED_TEXT_PATTERN.test(text)) return fallback;
 return text.slice(0, maxLength);
}

function cleanList(value, fallback) {
 const list = Array.isArray(value) ? value : [];
 const cleaned = list.map((item) => cleanText(item, '', 120)).filter(Boolean).slice(0, 3);
 return cleaned.length ? cleaned : fallback;
}

function validateGeminiFarmPayload(payload) {
 return Boolean(payload && typeof payload === 'object' && payload.reports && typeof payload.reports === 'object' && !Array.isArray(payload.reports));
}

function mergeGeminiReports(baseReports, geminiReports) {
 if (!geminiReports || typeof geminiReports !== 'object') return baseReports;
 const merged = structuredClone(baseReports);
 for (const [itemId, rangeReports] of Object.entries(geminiReports)) {
  if (!merged[itemId] || !rangeReports || typeof rangeReports !== 'object') continue;
  for (const range of RANGE_OPTIONS.map(String)) {
   const current = merged[itemId][range];
   const incoming = rangeReports[range];
   if (!current || !incoming || typeof incoming !== 'object') continue;
   merged[itemId][range] = {
    ...current,
    headline: cleanText(incoming.headline, current.headline),
    summary: cleanList(incoming.summary, current.summary),
    recommendation: cleanText(incoming.recommendation, current.recommendation, 160),
    copyText: cleanText(incoming.copyText, current.copyText, 160),
   };
  }
 }
 return merged;
}

function buildGeminiInput(cropData) {
 const rows = (cropData.items || []).map((item) => ({
  id: item.id,
  name: item.name,
  region: item.region,
  market: item.market,
  unit: item.unit,
  price: numberOrNull(item.price),
  change: numberOrNull(item.change),
  pct: numberOrNull(item.pct),
  series: (item.series || []).slice(-14).map((point) => ({ date: point.date, price: numberOrNull(point.price) })),
 }));
 return {
  generatedAt: cropData.generatedAt || cropData.metadata?.updatedAt || null,
  ranges: RANGE_OPTIONS,
  items: compactArrayByChars(rows, 14000),
 };
}

async function createReports(cropData) {
 const localReports = createLocalReports(cropData);
 const geminiResult = await generateGeminiJson({
  task: '농산물 가격 화면에 표시할 품목별 짧은 요약을 만듭니다. 모든 키는 입력 id와 range를 그대로 유지합니다.',
  schema: '{"reports":{"품목id":{"7":{"headline":"문장","summary":["문장","문장","문장"],"recommendation":"문장","copyText":"문장"},"30":{},"90":{}}}}',
  input: buildGeminiInput(cropData),
  fallback: { reports: {} },
  validate: validateGeminiFarmPayload,
 });
 return {
  reports: mergeGeminiReports(localReports, geminiResult.payload?.reports),
  source: geminiResult.used ? 'gemini-flash-local-rules' : 'local-rules',
  model: geminiResult.used ? geminiResult.model : null,
 };
}

async function main() {
 const cropData = JSON.parse(await fs.readFile(cropDataPath, 'utf8'));
 const hasItems = Array.isArray(cropData.items) && cropData.items.length > 0;
 await fs.mkdir(path.dirname(aiReportPath), { recursive: true });
 if (!hasItems) {
  console.log('가격 항목 확인 필요: 기존 요약 리포트를 유지합니다.');
  return;
 }
 const result = await createReports(cropData);
 await fs.writeFile(aiReportPath, `${JSON.stringify({ status: 'generated', source: result.source, model: result.model, generatedAt: new Date().toISOString(), reports: result.reports }, null, 2)}\n`, 'utf8');
 console.log(`요약 리포트 저장 완료: ${aiReportPath}`);
}

main().catch((error) => {
 console.error(error);
 process.exit(1);
});
