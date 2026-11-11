import { useId, useMemo, useState } from 'react';
import type { OfferTemplateFieldDto } from '~/api/generated';
import { Checkbox } from '~/ui';

type CarPanelOption = NonNullable<OfferTemplateFieldDto['options']>[number];

/**
 * Mirrors no.pitell.offer_service.domain.templates.CarPanelSlug on the backend.
 * Keep this in sync if new slugs are added there.
 */
const CarPanelSlug = {
  HOOD: 'hood',
  FRONT_LEFT_DOOR: 'front_left_door',
  FRONT_RIGHT_DOOR: 'front_right_door',
  REAR_LEFT_DOOR: 'rear_left_door',
  REAR_RIGHT_DOOR: 'rear_right_door',
  FRONT_LEFT_FENDER: 'front_left_fender',
  FRONT_RIGHT_FENDER: 'front_right_fender',
  REAR_LEFT_QUARTER: 'rear_left_quarter',
  REAR_RIGHT_QUARTER: 'rear_right_quarter',
  TRUNK: 'trunk',
  ROOF: 'roof',
  FRONT_BUMPER: 'front_bumper',
  REAR_BUMPER: 'rear_bumper',
} as const;

type CarPanelSlugValue = (typeof CarPanelSlug)[keyof typeof CarPanelSlug];

const PANEL_LABELS: Record<CarPanelSlugValue, string> = {
  [CarPanelSlug.HOOD]: 'Panser',
  [CarPanelSlug.FRONT_LEFT_DOOR]: 'Dør foran venstre',
  [CarPanelSlug.FRONT_RIGHT_DOOR]: 'Dør foran høyre',
  [CarPanelSlug.REAR_LEFT_DOOR]: 'Dør bak venstre',
  [CarPanelSlug.REAR_RIGHT_DOOR]: 'Dør bak høyre',
  [CarPanelSlug.FRONT_LEFT_FENDER]: 'Skjerm foran venstre',
  [CarPanelSlug.FRONT_RIGHT_FENDER]: 'Skjerm foran høyre',
  [CarPanelSlug.REAR_LEFT_QUARTER]: 'Bakskjerm venstre',
  [CarPanelSlug.REAR_RIGHT_QUARTER]: 'Bakskjerm høyre',
  [CarPanelSlug.TRUNK]: 'Bagasjelokk',
  [CarPanelSlug.ROOF]: 'Tak',
  [CarPanelSlug.FRONT_BUMPER]: 'Frontstøtfanger',
  [CarPanelSlug.REAR_BUMPER]: 'Bakstøtfanger',
};

/**
 * Sedan side profile, viewBox 0 0 1000 400, car facing left.
 * Body outline includes wheel-arch cutouts (the two `A` arcs along the
 * bottom edge). All panel zones are clipped to this path so highlights
 * never bleed outside the silhouette.
 */
const BODY_PATH =
  'M 95,320 Q 62,320 60,285 L 60,252 Q 60,226 92,220 L 148,207 ' +
  'Q 260,188 330,183 L 352,181 L 434,102 Q 444,94 466,94 L 622,94 ' +
  'Q 646,94 660,106 L 730,170 Q 820,182 900,200 Q 938,210 939,240 ' +
  'L 940,286 Q 940,320 905,320 L 845,320 A 76,76 0 1 0 695,320 ' +
  'L 325,320 A 76,76 0 1 0 175,320 Z';

const WINDOW_PATHS = [
  'M 362,176 L 438,106 L 520,106 L 520,176 Z',
  'M 536,106 L 616,106 Q 634,106 646,116 L 700,166 L 536,176 Z',
];

const WHEELS = [
  { cx: 250, cy: 308 },
  { cx: 770, cy: 308 },
];

/** Clickable zones; rects clipped to BODY_PATH. Seams double as panel gaps. */
const PANEL_ZONES = {
  bumperFront: { x: 56, y: 200, width: 86, height: 124 },
  hood: { x: 148, y: 170, width: 204, height: 42 },
  roof: { x: 352, y: 90, width: 376, height: 122 },
  trunk: { x: 728, y: 155, width: 217, height: 57 },
  bumperRear: { x: 858, y: 212, width: 87, height: 112 },
  fenderFront: { x: 142, y: 212, width: 210, height: 112 },
  doorFront: { x: 352, y: 212, width: 174, height: 112 },
  doorRear: { x: 526, y: 212, width: 174, height: 112 },
  quarterRear: { x: 700, y: 212, width: 158, height: 112 },
} as const;

type SideConfig = {
  side: 'left' | 'right';
  title: string;
  slugs: Record<keyof typeof PANEL_ZONES, CarPanelSlugValue>;
};

const SIDE_CONFIGS: SideConfig[] = [
  {
    side: 'left',
    title: 'Venstre side',
    slugs: {
      bumperFront: CarPanelSlug.FRONT_BUMPER,
      hood: CarPanelSlug.HOOD,
      roof: CarPanelSlug.ROOF,
      trunk: CarPanelSlug.TRUNK,
      bumperRear: CarPanelSlug.REAR_BUMPER,
      fenderFront: CarPanelSlug.FRONT_LEFT_FENDER,
      doorFront: CarPanelSlug.FRONT_LEFT_DOOR,
      doorRear: CarPanelSlug.REAR_LEFT_DOOR,
      quarterRear: CarPanelSlug.REAR_LEFT_QUARTER,
    },
  },
  {
    side: 'right',
    title: 'Høyre side',
    slugs: {
      bumperFront: CarPanelSlug.FRONT_BUMPER,
      hood: CarPanelSlug.HOOD,
      roof: CarPanelSlug.ROOF,
      trunk: CarPanelSlug.TRUNK,
      bumperRear: CarPanelSlug.REAR_BUMPER,
      fenderFront: CarPanelSlug.FRONT_RIGHT_FENDER,
      doorFront: CarPanelSlug.FRONT_RIGHT_DOOR,
      doorRear: CarPanelSlug.REAR_RIGHT_DOOR,
      quarterRear: CarPanelSlug.REAR_RIGHT_QUARTER,
    },
  },
];

function CarSideDiagram({
  config,
  optionsBySlug,
  selected,
  onTogglePanel,
}: {
  config: SideConfig;
  optionsBySlug: Map<string, CarPanelOption>;
  selected: Set<string>;
  onTogglePanel: (option: CarPanelOption) => void;
}) {
  const clipId = useId();
  const zoneKeys = Object.keys(PANEL_ZONES) as (keyof typeof PANEL_ZONES)[];

  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{config.title}</p>
      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <svg viewBox="0 0 1000 400" className="h-auto w-full min-w-[480px]" role="group" aria-label={config.title}>
          <defs>
            <clipPath id={clipId}>
              <path d={BODY_PATH} />
            </clipPath>
          </defs>

          <g transform={config.side === 'right' ? 'scale(-1,1) translate(-1000,0)' : undefined}>
            <path d={BODY_PATH} className="fill-surface stroke-text-secondary" strokeWidth={3} strokeLinejoin="round" />

            {WINDOW_PATHS.map((d, index) => (
              <path key={index} d={d} className="fill-border stroke-text-secondary" strokeWidth={2} />
            ))}

            {WHEELS.map((wheel, index) => (
              <g key={index}>
                <circle cx={wheel.cx} cy={wheel.cy} r={62} className="fill-text-primary/85" />
                <circle cx={wheel.cx} cy={wheel.cy} r={30} className="fill-surface" />
                <circle cx={wheel.cx} cy={wheel.cy} r={9} className="fill-text-secondary" />
              </g>
            ))}

            <g clipPath={`url(#${clipId})`}>
              {zoneKeys.map((zoneKey) => {
                const slug = config.slugs[zoneKey];
                const option = optionsBySlug.get(slug);
                const zone = PANEL_ZONES[zoneKey];
                const clickable = Boolean(option);
                const active = option ? selected.has(option.value) : false;

                return (
                  <rect
                    key={zoneKey}
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    className={
                      active
                        ? 'cursor-pointer fill-blue-600/60 stroke-blue-700'
                        : clickable
                          ? 'cursor-pointer fill-text-secondary/10 stroke-text-secondary/50 hover:fill-blue-600/25'
                          : 'fill-transparent stroke-transparent'
                    }
                    strokeWidth={1.5}
                    tabIndex={clickable ? 0 : undefined}
                    role={clickable ? 'checkbox' : undefined}
                    aria-checked={clickable ? active : undefined}
                    aria-label={clickable ? PANEL_LABELS[slug] : undefined}
                    onClick={clickable ? () => onTogglePanel(option as CarPanelOption) : undefined}
                    onKeyDown={
                      clickable
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onTogglePanel(option as CarPanelOption);
                            }
                          }
                        : undefined
                    }
                  >
                    {clickable ? <title>{PANEL_LABELS[slug]}</title> : null}
                  </rect>
                );
              })}
            </g>

            <line x1={40} y1={372} x2={960} y2={372} className="stroke-border" strokeWidth={3} strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function CarPanelSelector({
  name,
  label,
  options,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  options: CarPanelOption[];
  defaultValue?: string[];
  required?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(defaultValue ?? []));

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const optionsBySlug = useMemo(() => {
    const map = new Map<string, CarPanelOption>();
    for (const option of options) {
      map.set(option.value, option);
    }
    return map;
  }, [options]);

  return (
    <fieldset className="grid gap-3 rounded-md border border-border bg-surface p-3">
      <legend className="text-sm font-medium text-text-primary">{label}</legend>

      <div className="grid gap-4 md:grid-cols-2">
        {SIDE_CONFIGS.map((config) => (
          <CarSideDiagram
            key={config.side}
            config={config}
            optionsBySlug={optionsBySlug}
            selected={selected}
            onTogglePanel={(option) => toggle(option.value)}
          />
        ))}
      </div>

      {options.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-text-primary">
              <Checkbox
                name={name}
                value={option.value}
                checked={selected.has(option.value)}
                onCheckedChange={() => toggle(option.value)}
                required={required && selected.size === 0}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Backend returnerte ingen valg for dette feltet.</p>
      )}
    </fieldset>
  );
}
