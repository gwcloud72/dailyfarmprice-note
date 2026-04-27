import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCropReport } from '../src/utils/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cropDataPath = path.join(rootDir, 'public', 'data', 'crop-prices.json');
const aiReportPath = path.join(rootDir, 'public', 'data', 'ai-reports.json');

const RANGE_OPTIONS = [7, 30, 90];
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_REPORT_ENABLED = String(process.env.GEMINI_REPORT_ENABLED || '').toLowerCase() === 'true';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const generatedAt = new Date().toISOString();

function calculateStats(series) {
  if (!series.length) {
    return {
      latest: null,
      previous: null,
      diff: null,
      rate: null,
      average: null,
      min: null,
      max: null,
    };
  }

  const prices = series.map((point) => Number(point.price)).filter((price) => Number.isFinite(price) && price > 0);
  const latest = prices.at(-1) ?? null;
  const previous = prices.at(-2) ?? latest;
  const diff = latest !== null && previous !== null ? latest - previous : null;
  const rate = previous ? (diff / previous) * 100 : null;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;

  return {
    latest,
    previous,
    diff,
    rate,
    average,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
  };
}

function createLocalReports(cropData) {
  const reports = {};

  for (const item of cropData.items || []) {
    reports[item.id] = {};

    for (const range of RANGE_OPTIONS) {
      const series = (item.series || []).slice(-range);
      const stats = calculateStats(series);
      const report = createCropReport({ item, series, stats, range });
      reports[item.id][String(range)] = report;
    }
  }

  return reports;
}

function createPromptData(cropData) {
  return (cropData.items || []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    region: item.region,
    market: item.market,
    unit: item.unit,
    ranges: RANGE_OPTIONS.map((range) => {
      const series = (item.series || []).slice(-range);
      const stats = calculateStats(series);
      return {
        range,
        stats,
        firstDate: series[0]?.date ?? null,
        lastDate: series.at(-1)?.date ?? null,
        latestPoints: series.slice(-5),
      };
    }),
  }));
}

function normalizeReport(report, fallback) {
  const safeBadges = Array.isArray(report?.badges) ? report.badges.slice(0, 4) : fallback.badges;
  const safeSummary = Array.isArray(report?.summary) ? report.summary.slice(0, 4) : fallback.summary;
  const safeSignals = Array.isArray(report?.signals) ? report.signals.slice(0, 4) : fallback.signals;
  const safeTone = ['up', 'down', 'flat'].includes(report?.tone) ? report.tone : fallback.tone;

  const normalized = {
    title: typeof report?.title === 'string' ? report.title : fallback.title,
    headline: typeof report?.headline === 'string' ? report.headline : fallback.headline,
    tone: safeTone,
    badges: safeBadges.map((badge, index) => ({
      label: typeof badge?.label === 'string' ? badge.label : fallback.badges[index]?.label || '항목',
      value: typeof badge?.value === 'string' ? badge.value : fallback.badges[index]?.value || '-',
      tone: ['up', 'down', 'flat'].includes(badge?.tone) ? badge.tone : fallback.badges[index]?.tone || 'flat',
    })),
    summary: safeSummary.map((line) => String(line)).filter(Boolean),
    signals: safeSignals.map((signal, index) => ({
      title: typeof signal?.title === 'string' ? signal.title : fallback.signals[index]?.title || '분석 항목',
      value: typeof signal?.value === 'string' ? signal.value : fallback.signals[index]?.value || '-',
      description: typeof signal?.description === 'string' ? signal.description : fallback.signals[index]?.description || '',
    })),
    recommendation: typeof report?.recommendation === 'string' ? report.recommendation : fallback.recommendation,
    copyText: typeof report?.copyText === 'string' ? report.copyText : fallback.copyText,
  };

  if (!normalized.copyText) {
    normalized.copyText = [
      `[${normalized.title}]`,
      normalized.headline,
      ...normalized.summary,
      `관찰 포인트: ${normalized.recommendation}`,
    ].join('\n');
  }

  return normalized;
}

function mergeGeminiReports({ geminiJson, localReports }) {
  const merged = structuredClone(localReports);
  const geminiReports = geminiJson?.reports || {};

  for (const [itemId, ranges] of Object.entries(merged)) {
    for (const range of Object.keys(ranges)) {
      const geminiReport = geminiReports?.[itemId]?.[range];
      if (geminiReport) {
        merged[itemId][range] = normalizeReport(geminiReport, localReports[itemId][range]);
      }
    }
  }

  return merged;
}

function extractJson(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Gemini 응답에서 JSON 객체를 찾지 못했습니다.');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

async function callGemini(cropData, localReports) {
  const promptData = createPromptData(cropData);
  const schemaGuide = {
    status: 'generated',
    source: 'Gemini API',
    model: GEMINI_MODEL,
    generatedAt,
    reportNote: 'GitHub Actions에서 Gemini API로 생성한 리포트입니다.',
    reports: {
      cabbage: {
        30: {
          title: '배추 AI 리포트',
          headline: '한 문장 핵심 분석',
          tone: 'up | down | flat',
          badges: [{ label: '흐름', value: '완만한 상승세', tone: 'up | down | flat' }],
          summary: ['요약 1', '요약 2', '요약 3'],
          signals: [{ title: '가격 흐름', value: '완만한 상승세', description: '설명' }],
          recommendation: '관찰 포인트',
          copyText: '복사용 리포트 전문',
        },
      },
    },
  };

  const prompt = `
너는 농산물 가격 데이터를 쉽게 설명하는 AI 리포트 작성자다.
아래 JSON 통계를 보고 한국어 리포트를 만들어라.
주의사항:
- 실제 구매를 강요하지 말고, 참고용 가격 흐름 분석으로만 말한다.
- 과장 표현을 피하고, 포트폴리오 서비스에 어울리게 친절하고 깔끔하게 작성한다.
- reports 객체에는 모든 item id와 range(7, 30, 90)를 반드시 포함한다.
- tone은 up, down, flat 중 하나만 쓴다.
- 응답은 설명 없이 JSON 객체만 반환한다.

필수 응답 스키마 예시:
${JSON.stringify(schemaGuide, null, 2)}

분석 대상 데이터:
${JSON.stringify(promptData, null, 2)}
`.trim();

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API 호출 실패 (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
  const geminiJson = extractJson(text);

  return {
    status: 'generated',
    source: 'Gemini API',
    model: GEMINI_MODEL,
    generatedAt,
    reportNote: 'GitHub Actions에서 Gemini API로 생성한 리포트입니다. 브라우저에는 API Key가 포함되지 않습니다.',
    reports: mergeGeminiReports({ geminiJson, localReports }),
  };
}

async function main() {
  const cropData = JSON.parse(await fs.readFile(cropDataPath, 'utf8'));
  if (!Array.isArray(cropData.items) || cropData.items.length === 0) {
    throw new Error('KAMIS 실데이터가 없어 AI 리포트를 생성할 수 없습니다.');
  }
  const localReports = createLocalReports(cropData);

  let output = {
    status: 'fallback',
    source: 'Local rule-based generator',
    model: 'local-report-generator',
    generatedAt,
    reportNote: 'Gemini API를 사용할 수 없는 경우에도 KAMIS 실데이터를 기반으로 로컬 규칙 리포트를 생성합니다.',
    reports: localReports,
  };

  if (GEMINI_REPORT_ENABLED && GEMINI_API_KEY) {
    try {
      output = await callGemini(cropData, localReports);
      console.log(`Gemini AI 리포트 생성 완료: ${GEMINI_MODEL}`);
    } catch (error) {
      output.status = 'fallback';
      output.source = 'Local rule-based generator';
      output.model = 'local-report-generator';
      output.reportNote = `Gemini API 호출에 실패해 KAMIS 실데이터 기반 로컬 규칙 리포트로 대체했습니다. 사유: ${error.message}`;
      console.warn(output.reportNote);
    }
  } else {
    console.log('GEMINI_REPORT_ENABLED 또는 GEMINI_API_KEY가 없어 KAMIS 실데이터 기반 로컬 규칙 리포트를 생성합니다.');
  }

  await fs.writeFile(aiReportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`AI 리포트 JSON 생성 완료: ${aiReportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
