'use client';

import dynamic from 'next/dynamic';
import {Crosshair, Loader2, MapPin} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';

import {Button} from '@/components/ui/button';
import type {MapPosition} from './address-map';

const AddressMap = dynamic(
  () => import('./address-map').then(module => module.AddressMap),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse bg-muted" aria-hidden="true"/>,
  },
);

export interface ResolvedMapAddress {
  streetLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
}

interface AddressLocationPickerProps {
  onAddressResolved: (address: ResolvedMapAddress) => void;
  disabled?: boolean;
}

export function AddressLocationPicker({onAddressResolved, disabled}: AddressLocationPickerProps) {
  const t = useTranslations('Account');
  const locale = useLocale();
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePosition = useCallback(async (nextPosition: MapPosition) => {
    setPosition(nextPosition);
    setError(null);
    setIsResolving(true);

    try {
      const params = new URLSearchParams({
        lat: String(nextPosition.lat),
        lng: String(nextPosition.lng),
        lang: locale,
      });
      const response = await fetch(`/api/geocode/reverse?${params.toString()}`);
      if (!response.ok) throw new Error('reverse-geocode-failed');
      onAddressResolved(await response.json() as ResolvedMapAddress);
    } catch {
      setError(t('mapLookupFailed'));
    } finally {
      setIsResolving(false);
    }
  }, [locale, onAddressResolved, t]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t('locationUnavailable'));
      return;
    }

    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      location => {
        setIsLocating(false);
        void resolvePosition({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      },
      locationError => {
        setIsLocating(false);
        setError(locationError.code === locationError.PERMISSION_DENIED
          ? t('locationPermissionDenied')
          : t('locationUnavailable'));
      },
      {enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000},
    );
  };

  return (
    <section className="col-span-2 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="address-map-title">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="address-map-title" className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden="true"/>
            {t('chooseLocation')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('chooseLocationDescription')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={useCurrentLocation}
          disabled={disabled || isLocating || isResolving}
          className="min-h-11 shrink-0"
        >
          {isLocating || isResolving
            ? <Loader2 className="size-4 animate-spin" aria-hidden="true"/>
            : <Crosshair className="size-4" aria-hidden="true"/>}
          {isLocating ? t('locatingYou') : isResolving ? t('findingAddress') : t('useCurrentLocation')}
        </Button>
      </div>

      <div className="relative">
        <AddressMap
          position={position}
          onPositionChange={nextPosition => void resolvePosition(nextPosition)}
          markerLabel={t('selectedLocation')}
        />
        {isResolving && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-center justify-center gap-2 rounded-xl bg-background/95 px-4 py-2 text-sm font-medium shadow-[var(--shadow-e2)] backdrop-blur">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true"/>
            {t('findingAddress')}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {error ? <p role="alert" className="text-destructive">{error}</p> : <p>{t('mapPinHint')}</p>}
      </div>
    </section>
  );
}
