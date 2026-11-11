import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import type { CompanySummaryDto } from '~/api/generated';
import 'ol/ol.css';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

export type CompanyLocation = {
  company: CompanySummaryDto;
  lat: number;
  lon: number;
};

type CompaniesMapProps = {
  locations: CompanyLocation[];
};

const DEFAULT_CENTER: [number, number] = [59.9139, 10.7522];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;

const getCompanyLocationLabel = (company: CompanySummaryDto): string => {
  const address = company.businessAddress || company.postalAddress;
  const parts = [address?.addressLines?.join(' '), address?.postalCode, address?.city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Ukjent adresse';
};

export default function CompaniesMap({ locations }: CompaniesMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (!locations.length) return DEFAULT_CENTER;
    const total = locations.reduce(
      (acc, item) => {
        acc.lat += item.lat;
        acc.lon += item.lon;
        return acc;
      },
      { lat: 0, lon: 0 },
    );
    return [total.lat / locations.length, total.lon / locations.length];
  }, [locations]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const markerStyle = new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: 'rgba(37, 99, 235, 0.9)' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: markerStyle,
    });

    const mapInstance = new Map({
      target: mapElementRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([center[1], center[0]]),
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      }),
    });
    mapRef.current = mapInstance;

    mapInstance.on('click', (event) => {
      const feature = mapInstance.forEachFeatureAtPixel(event.pixel, (feat) => feat) as Feature | undefined;
      const companyId = feature?.get('companyId') as number | undefined;
      setSelectedCompanyId(companyId ?? null);
    });
  }, [center]);

  useEffect(() => {
    if (!vectorSourceRef.current || !mapRef.current) {
      return;
    }

    vectorSourceRef.current.clear();

    const features = locations.map((item) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([item.lon, item.lat])),
        companyId: item.company.id,
        companyName: item.company.name,
      });
      return feature;
    });

    vectorSourceRef.current.addFeatures(features);

    if (locations.length) {
      mapRef.current.getView().setCenter(fromLonLat([center[1], center[0]]));
    }
  }, [locations, center]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
    };
  }, []);

  if (!locations.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-card-border bg-card-muted-bg text-sm text-muted-foreground">
        Fant ingen adresser som kunne vises på kartet.
      </div>
    );
  }

  const selected = locations.find((item) => item.company.id === selectedCompanyId);
  const selectedName = selected?.company.name ?? `Selskap ${selected?.company.orgNumber ?? ''}`.trim();

  return (
    <div className="relative overflow-hidden rounded-lg border border-card-border bg-card">
      <div ref={mapElementRef} className="h-72 w-full" />
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 max-w-sm rounded-lg border border-card-border bg-card p-4 shadow-lg">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-card-text">{selectedName}</div>
            <div className="text-xs text-muted-foreground">{getCompanyLocationLabel(selected.company)}</div>
          </div>
          <Link
            to={`${ROUTES_MAP['booking.public.appointment.session'].href}?companyId=${selected.company.id}`}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-button-primary-border bg-button-primary-bg px-4 py-2 text-sm font-semibold text-button-primary-text transition hover:bg-button-primary-hover-bg hover:text-button-primary-hover-text"
          >
            Book time her
            <span className="text-base">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
