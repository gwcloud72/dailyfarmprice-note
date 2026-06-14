import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { ADMIN_REGION_NAMES, REGION_CROP_OPTIONS, type RegionCropKey } from '../data/model';
import { nearestAdminRegion } from '../utils/location';

export const REGIONS = ['전국', ...ADMIN_REGION_NAMES] as const;

interface LocationState {
  region: string;
  item: RegionCropKey;
  isMyLocation: boolean;
  locating: boolean;
  setRegion: (region: string) => void;
  setItem: (item: RegionCropKey) => void;
  useMyLocation: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<string>('전국');
  const [item, setItemState] = useState<RegionCropKey>(REGION_CROP_OPTIONS[0]?.key ?? 'cabbage');
  const [isMyLocation, setIsMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);

  const setRegion = (nextRegion: string) => {
    if (!REGIONS.includes(nextRegion as typeof REGIONS[number])) return;
    setRegionState(nextRegion);
    setIsMyLocation(false);
  };

  const setItem = (nextItem: RegionCropKey) => {
    if (!REGION_CROP_OPTIONS.some((option) => option.key === nextItem)) return;
    setItemState(nextItem);
  };

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextRegion = nearestAdminRegion(position.coords.latitude, position.coords.longitude);
        setRegionState(nextRegion);
        setIsMyLocation(true);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    );
  };

  const value = useMemo<LocationState>(() => ({ region, item, isMyLocation, locating, setRegion, setItem, useMyLocation }), [region, item, isMyLocation, locating]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationSelection() {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useLocationSelection must be used inside LocationProvider');
  return value;
}
