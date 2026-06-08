#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const MAX_DATA_AGE_DAYS = Number(process.env.KAMIS_MAX_DATA_AGE_DAYS || 7);
const REQUIRED_ADMIN_REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestSeriesDate(payload) {
  let latest = null;
  for (const item of Array.isArray(payload?.items) ? payload.items : []) {
    for (const point of Array.isArray(item?.series) ? item.series : []) {
      const date = parseDate(point?.date);
      if (date && (!latest || date > latest)) latest = date;
    }
  }
  return latest;
}

function validateFreshCropPublicData(payload, label) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return;
  const latest = latestSeriesDate(payload);
  if (!latest) {
    errors.push(`${label}: 기준일이 없어 운영 데이터로 표시할 수 없습니다.`);
    return;
  }
  const days = Math.floor((Date.now() - latest.getTime()) / 86400000);
  if (days > MAX_DATA_AGE_DAYS) {
    errors.push(`${label}: 최신 기준일 ${latest.toISOString().slice(0, 10)}이 ${days}일 전 데이터입니다. ${MAX_DATA_AGE_DAYS}일 초과 데이터는 배포 금지입니다.`);
  }
}


function readJsonIfExists(filePath, { optional = false } = {}) {
  if (!fs.existsSync(filePath)) {
    if (!optional) errors.push(`${path.relative(root, filePath)}: 파일이 없습니다.`);
    else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 없음 - empty state로 렌더링됩니다.`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, filePath)}: JSON parse 실패 (${error.message})`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumericLike(value) {
  if (value === null || value === undefined || value === '') return true;
  return Number.isFinite(Number(value));
}

function isDateLike(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}/.test(String(value)) || !Number.isNaN(new Date(value).getTime());
}

function validateCropPrices(payload, label) {
  if (!isObject(payload)) {
    errors.push(`${label}: 루트는 객체여야 합니다.`);
    return;
  }
  if (payload.generatedAt !== undefined && payload.generatedAt !== null && !isDateLike(payload.generatedAt)) {
    warnings.push(`${label}.generatedAt: 날짜 형식이 아니며 UI에서는 문자열 fallback으로 표시됩니다.`);
  }
  if (payload.items !== undefined && !Array.isArray(payload.items)) {
    errors.push(`${label}.items: 배열이어야 합니다.`);
    return;
  }
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length && label === 'public/data/crop-prices.json') {
    const regionNames = new Set(items.map((item) => item?.region).filter(Boolean));
    const missingAdminRegions = REQUIRED_ADMIN_REGIONS.filter((region) => !regionNames.has(region));
    if (!regionNames.has('전국')) errors.push(`${label}: 전국 기준 데이터가 필요합니다.`);
    if (missingAdminRegions.length) errors.push(`${label}: 전국 17개 광역자치단체 누락: ${missingAdminRegions.join(', ')}`);
  }
  items.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`${label}.items[${index}]: 객체여야 합니다.`);
      return;
    }
    const name = item.name ?? item.baseId ?? item.id;
    if (name !== undefined && String(name).trim() === '') warnings.push(`${label}.items[${index}]: 품목명이 비어 있습니다.`);
    if (item.series !== undefined && !Array.isArray(item.series)) {
      errors.push(`${label}.items[${index}].series: 배열이어야 합니다.`);
      return;
    }
    const series = Array.isArray(item.series) ? item.series : [];
    series.forEach((point, pointIndex) => {
      if (!isObject(point)) {
        errors.push(`${label}.items[${index}].series[${pointIndex}]: 객체여야 합니다.`);
        return;
      }
      if (!isNumericLike(point.price)) errors.push(`${label}.items[${index}].series[${pointIndex}].price: 숫자로 변환 가능해야 합니다.`);
      if (!isDateLike(point.date)) warnings.push(`${label}.items[${index}].series[${pointIndex}].date: 날짜 형식이 아닙니다.`);
    });
  });
}

function validateAiReports(payload, label) {
  if (!isObject(payload)) {
    errors.push(`${label}: 루트는 객체여야 합니다.`);
    return;
  }
  if (payload.reports !== undefined && !isObject(payload.reports)) warnings.push(`${label}.reports: 객체가 아니면 AI 리포트는 empty state로 표시됩니다.`);
}

function validateFixtureBundle(payload, label) {
  if (!isObject(payload)) {
    errors.push(`${label}: fixture bundle은 객체여야 합니다.`);
    return;
  }
  for (const key of ['normal', 'edge', 'empty']) {
    if (!isObject(payload[key])) {
      errors.push(`${label}.${key}: fixture 객체가 필요합니다.`);
      continue;
    }
    validateCropPrices(payload[key].prices, `${label}.${key}.prices`);
    validateAiReports(payload[key].reports, `${label}.${key}.reports`);
  }
}

const cropData = readJsonIfExists(path.join(root, 'public/data/crop-prices.json'), { optional: true });
if (cropData) {
  validateCropPrices(cropData, 'public/data/crop-prices.json');
  validateFreshCropPublicData(cropData, 'public/data/crop-prices.json');
}
const reportData = readJsonIfExists(path.join(root, 'public/data/ai-reports.json'), { optional: true });
if (reportData) validateAiReports(reportData, 'public/data/ai-reports.json');
const fixtures = readJsonIfExists(path.join(root, 'scripts/fixtures/data-contract-fixtures.json'));
if (fixtures) validateFixtureBundle(fixtures, 'scripts/fixtures/data-contract-fixtures.json');

if (warnings.length) {
  console.log('data:check warnings');
  warnings.forEach((message) => console.log(`- ${message}`));
}
if (errors.length) {
  console.error('data:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('data:check passed');
