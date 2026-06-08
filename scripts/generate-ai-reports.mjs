import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cropDataPath = path.join(rootDir, 'public', 'data', 'crop-prices.json');
const aiReportPath = path.join(rootDir, 'public', 'data', 'ai-reports.json');

const RANGE_OPTIONS = [7, 30, 90];
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_REPORT_ENABLED = parseBoolean(process.env.GEMINI_REPORT_ENABLED, true);
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  throw new Error(`GEMINI_REPORT_ENABLED는 boolean 문자열이어야 합니다. 현재값=${value}`);
}

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
  return Number.isFinite(value) ? `${Math.round(value).toLocaleString('ko-KR')}원` : '가격 확인중';
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
      { title: '데이터 범위', value: `${series.length}개 기준점`, description: 'KAMIS 일별 집계 결과만 사용했습니다.' },
    ],
    recommendation: '가격 흐름 참고용이며 구매 판단은 지역별 실제 판매가와 함께 확인하세요.',
    copyText: `${item.name} 가격은 ${trendText} 흐름입니다. KAMIS 실데이터 기반 참고 정보입니다.`,
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

function stripCodeFence(value) {
  return String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
}

function extractText(responseJson) {
  return (Array.isArray(responseJson?.candidates) ? responseJson.candidates : [])
    .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function sanitizeReport(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  return {
    ...fallback,
    ...value,
    tone: ['up', 'down', 'flat'].includes(value.tone) ? value.tone : fallback.tone,
    badges: Array.isArray(value.badges) ? value.badges.slice(0, 4) : fallback.badges,
    summary: Array.isArray(value.summary) ? value.summary.map(String).filter(Boolean).slice(0, 4) : fallback.summary,
    signals: Array.isArray(value.signals) ? value.signals.slice(0, 4) : fallback.signals,
  };
}

async function callGemini(cropData, localReports) {
  const promptData = (cropData.items || []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    region: item.region,
    unit: item.unit,
    ranges: RANGE_OPTIONS.map((range) => ({ range, series: (item.series || []).slice(-range) })),
  }));
  const prompt = [
    '너는 농산물 가격 데이터를 설명하는 리포트 작성자다.',
    '주어진 KAMIS 데이터 밖의 값을 만들지 말고, 구매 강요나 과장 표현 없이 한국어 JSON만 반환해라.',
    '형식: {"reports":{"itemId":{"7":{...},"30":{...},"90":{...}}}}',
    JSON.stringify(promptData, null, 2),
  ].join('\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, responseMimeType: 'application/json' } }),
  });
  const rawText = await response.text();
  if (!response.ok) throw new Error(`Gemini API 호출 실패 (${response.status}): ${rawText.slice(0, 240)}`);
  const rawJson = JSON.parse(rawText);
  const parsed = JSON.parse(stripCodeFence(extractText(rawJson)));
  const merged = structuredClone(localReports);
  for (const [itemId, ranges] of Object.entries(merged)) {
    for (const range of Object.keys(ranges)) {
      ranges[range] = sanitizeReport(parsed?.reports?.[itemId]?.[range], ranges[range]);
    }
  }
  return merged;
}

async function main() {
  const cropData = JSON.parse(await fs.readFile(cropDataPath, 'utf8'));
  const hasLiveItems = Array.isArray(cropData.items) && cropData.items.length > 0;
  await fs.mkdir(path.dirname(aiReportPath), { recursive: true });
  if (!hasLiveItems) {
    await fs.writeFile(aiReportPath, `${JSON.stringify({ status: 'pending', source: 'pending', generatedAt: null, reports: {} }, null, 2)}\n`, 'utf8');
    console.log('KAMIS 실데이터가 없어 AI 리포트를 대기 상태로 저장했습니다.');
    return;
  }
  const localReports = createLocalReports(cropData);
  let reports = localReports;
  let source = 'Local rule-based generator';
  let model = 'local-report-generator';
  let status = 'fallback';
  if (GEMINI_REPORT_ENABLED && GEMINI_API_KEY) {
    try {
      reports = await callGemini(cropData, localReports);
      source = 'Gemini API';
      model = GEMINI_MODEL;
      status = 'generated';
    } catch (error) {
      console.warn(`Gemini 리포트 생성 실패. 로컬 리포트 사용: ${error.message}`);
    }
  }
  await fs.writeFile(aiReportPath, `${JSON.stringify({ status, source, model, generatedAt: new Date().toISOString(), reports }, null, 2)}\n`, 'utf8');
  console.log(`AI 리포트 저장 완료: ${aiReportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
