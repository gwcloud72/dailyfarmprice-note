import { useEffect, useMemo, useState } from 'react';
import Header from './farm/Header.jsx';
import Toolbar from './farm/Toolbar.jsx';
import Insight from './farm/Insight.jsx';
import CropTable from './farm/CropTable.jsx';
import TrendChart from './farm/TrendChart.jsx';
import RegionCard from './farm/RegionCard.jsx';
import ReportCard from './farm/ReportCard.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { readHashState, writeHashState } from '../hooks/useHashFilters.js';
import { DEFAULT_FILTERS, decorateRows, filterRegions, filterRows, hasActiveFilters, sliceSeries, sortRegions, sortRows } from '../lib/dashboardFilters.js';
import { buildCropDashboard } from '../lib/cropData.js';
import { readJson } from '../lib/http.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/crop-prices.json`;
const REPORT_URL = `${import.meta.env.BASE_URL}data/ai-reports.json`;

export default function FarmDashboard() {
  const initial = useMemo(readHashState, []);
  const [tab, setTab] = useState(initial.tab);
  const [filters, setFilters] = useState(initial.filters);
  const [pricePayload, setPricePayload] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([readJson(DATA_URL, null), readJson(REPORT_URL, null)]).then(([prices, report]) => {
      if (!mounted) return;
      setPricePayload(prices);
      setReportPayload(report);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const update = () => {
      const next = readHashState();
      setTab(next.tab);
      setFilters(next.filters);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    writeHashState(tab, filters);
  }, [tab, filters]);

  const dashboard = useMemo(() => buildCropDashboard(pricePayload, reportPayload), [pricePayload, reportPayload]);
  const rows = useMemo(() => decorateRows(dashboard.rows), [dashboard.rows]);
  const regionRows = useMemo(() => dashboard.regionRows.map((row) => ({ ...row, price: Number(row.price) || 0, diff: Number(row.diff) || 0 })), [dashboard.regionRows]);
  const itemOptions = useMemo(() => [...new Set(rows.map((row) => row.name))], [rows]);
  const regionOptions = useMemo(() => [...new Set(regionRows.map((row) => row.name))], [regionRows]);
  const filteredRows = useMemo(() => sortRows(filterRows(rows, filters), filters.sort), [rows, filters]);
  const filteredRegions = useMemo(() => sortRegions(filterRegions(regionRows, filters), filters.sort), [regionRows, filters]);
  const favorites = useFavorites([]);
  const favoriteRows = filteredRows.filter((row) => favorites.has(row.id));
  const activeRows = tab === 'favorites' ? favoriteRows : filteredRows;
  const chartSeries = useMemo(() => {
    const useMarketTrend = tab === 'report' || tab === 'regions';
    const values = useMarketTrend ? dashboard.trendValues : dashboard.featuredTrendValues;
    const labels = useMarketTrend ? dashboard.trendLabels : dashboard.featuredTrendLabels;
    return sliceSeries(values, labels, filters.period);
  }, [dashboard.featuredTrendLabels, dashboard.featuredTrendValues, dashboard.trendLabels, dashboard.trendValues, filters.period, tab]);
  const reset = () => setFilters(DEFAULT_FILTERS);
  const goToItems = () => {
    setTab('items');
    setFilters(DEFAULT_FILTERS);
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const canReset = useMemo(() => hasActiveFilters(filters), [filters]);
  const toolbarResultCount = tab === 'regions' ? filteredRegions.length : activeRows.length;
  const commonToolbar = (
    <Toolbar filters={filters} setFilter={setFilter} itemOptions={itemOptions} regionOptions={regionOptions} resultCount={toolbarResultCount} reset={reset} canReset={canReset} dataSourceLabel={dashboard.isLive ? '실데이터' : '수집 대기'} />
  );

  const renderContent = () => {
    if (tab === 'regions') {
      return (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
            <RegionCard rows={filteredRegions} variant="wide" onReset={reset} />
            <div className="min-w-0 space-y-4 lg:self-start">
              <TrendChart onReset={reset} values={chartSeries.values} labels={chartSeries.labels} title="지역별 평균 흐름" period={filters.period} compact />
              <ReportCard onReset={reset} lines={dashboard.reportLines.slice(0, 2)} compact />
            </div>
          </div>
        </>
      );
    }

    if (tab === 'report') {
      return (
        <div className="grid gap-4">
          <ReportCard onReset={reset} lines={dashboard.reportLines} variant="document" title="가격 리포트" />
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <TrendChart onReset={reset} values={chartSeries.values} labels={chartSeries.labels} title="시장 평균 가격 흐름" period={filters.period} />
            <RegionCard onReset={reset} rows={filteredRegions.slice(0, 6)} compact />
          </div>
        </div>
      );
    }

    if (tab === 'items') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1.32fr_0.68fr]">
          <CropTable rows={activeRows} title="품목별 시세" favorites={favorites} reset={reset} canReset={canReset} />
          <div className="min-w-0 space-y-3 lg:self-start md:space-y-4">
            <TrendChart onReset={reset} values={chartSeries.values} labels={chartSeries.labels} title={`${dashboard.featuredTrendLabel} 가격 추이`} period={filters.period} />
            <ReportCard onReset={reset} lines={dashboard.reportLines.slice(0, 3)} compact />
            <RegionCard onReset={reset} rows={filteredRegions.slice(0, 4)} compact />
          </div>
        </div>
      );
    }

    if (tab === 'favorites') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <CropTable rows={favoriteRows} title="관심 품목" favorites={favorites} reset={reset} canReset={canReset} emptyMessage="저장한 관심 품목이 없습니다." emptyAction={goToItems} emptyActionLabel="품목 보러 가기" />
          <div className="min-w-0 space-y-4 lg:self-start">
            <TrendChart onReset={reset} values={chartSeries.values} labels={chartSeries.labels} title="관심 품목 가격 흐름" period={filters.period} />
            <ReportCard onReset={reset} lines={dashboard.reportLines.slice(0, 3)} compact />
          </div>
        </div>
      );
    }

    return (
      <>
        <Insight rows={rows} updatedAt={dashboard.updatedAt} headline={dashboard.headline} />
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <TrendChart onReset={reset} values={chartSeries.values} labels={chartSeries.labels} title={`${dashboard.featuredTrendLabel} 가격 그래프`} period={filters.period} featured />
          <ReportCard onReset={reset} lines={dashboard.reportLines.slice(0, 3)} title="AI 가격 리포트" eyebrow="AI 리포트" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <CropTable rows={activeRows} title="품목 시세" favorites={favorites} reset={reset} canReset={canReset} />
          <RegionCard onReset={reset} rows={filteredRegions.slice(0, 5)} compact />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f2e8] px-4 py-4 text-slate-950 md:px-6 md:py-8 lg:px-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white">본문 바로가기</a>
      <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[24px] bg-white shadow-xl shadow-stone-900/15 ring-1 ring-stone-200 md:rounded-[26px]">
        <Header tab={tab} setTab={setTab} updatedAt={dashboard.updatedAt} />
        <main id="main-content" className="space-y-3 px-4 pt-4 pb-[140px] md:space-y-4 md:p-6">
          {commonToolbar}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
