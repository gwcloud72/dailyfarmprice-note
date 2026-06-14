import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/common/ui';
import { NAV_ITEMS } from '../data/navigation';
import { useProjectData } from '../data/normalize';
import { REGION_CROP_OPTIONS, type RegionCropKey } from '../data/model';
import { LocationProvider, useLocationSelection } from '../context/LocationContext';
import { HomePage } from './HomePage';
import { ItemsPage, MarketsPage, TrendPage, RegionsPage, StatsPage, MarketNewsPage, AlertsPage, DownloadPage, FavoritesPage, GuidePage } from './tabs/FarmTabs';

const VALID_TABS = NAV_ITEMS.map((item) => item.id);

function readHashTab(): string {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return 'home';
  const params = new URLSearchParams(raw.includes('=') ? raw : `tab=${raw}`);
  const next = params.get('tab') ?? 'home';
  return VALID_TABS.includes(next) ? next : 'home';
}

function ProjectShellContent() {
  const [tab, setTab] = useState<string>(() => readHashTab());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [liveText, setLiveText] = useState('12분 전 업데이트');
  const [favoriteCropIds, setFavoriteCropIds] = useState<string[]>([]);
  const selection = useLocationSelection();
  const selectedRegion = selection.region;
  const selectedCropKey = selection.item;
  const locating = selection.locating;
  const data = useProjectData(reloadKey);

  useEffect(() => {
    const itemLabel = REGION_CROP_OPTIONS.find((item) => item.key === selectedCropKey)?.label ?? '품목';
    setLiveText(selection.isMyLocation ? `${selectedRegion} 위치 기준 · ${itemLabel} · 12분 전 업데이트` : `${selectedRegion} ${itemLabel} · 12분 전 업데이트`);
  }, [selectedRegion, selectedCropKey, selection.isMyLocation]);

  useEffect(() => {
    const syncHash = () => setTab(readHashTab());
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const updateTab = (next: string) => {
    if (!VALID_TABS.includes(next)) return;
    const params = new URLSearchParams();
    params.set('tab', next);
    window.history.replaceState(null, '', `#${params.toString()}`);
    setTab(next);
  };

  const toggleFavoriteCrop = (id: string) => {
    setFavoriteCropIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setLiveText('관심 품목 반영');
  };

  const handleRegionChange = (region: string) => {
    selection.setRegion(region);
  };

  const handleCropChange = (key: RegionCropKey) => {
    selection.setItem(key);
  };

  const handleUseLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveText('위치 권한을 사용할 수 없습니다');
      return;
    }
    selection.useMyLocation();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText('12분 전 업데이트');
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const dataReady = data.sourceLoaded && data.crops.length > 0;

  const Panel = useMemo(() => ({ home: HomePage, items: ItemsPage, markets: MarketsPage, trend: TrendPage, regions: RegionsPage, stats: StatsPage, 'market-news': MarketNewsPage, alerts: AlertsPage, download: DownloadPage, favorites: FavoritesPage, guide: GuidePage })[tab] ?? HomePage, [tab]);

  return (
    <AppLayout kind="sidebar" appName="농산물 가격정보" source="KAMIS 업데이트" tab={tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText}>
      {dataReady ? <Panel data={data} onTabChange={updateTab} onAction={setLiveText} favoriteCropIds={favoriteCropIds} onFavoriteToggle={toggleFavoriteCrop} selectedRegion={selectedRegion} onRegionChange={handleRegionChange} selectedCropKey={selectedCropKey} onCropChange={handleCropChange} onUseLocation={handleUseLocation} locating={locating} /> : <div className="mx-auto max-w-shell"><EmptyState title="농산물 가격 데이터" actionLabel="새로 고침" onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}

export function ProjectShell() {
  return <LocationProvider><ProjectShellContent /></LocationProvider>;
}
