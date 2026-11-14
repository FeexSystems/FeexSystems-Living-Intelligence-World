import { Globe } from '@globestudio/react';

/** Look preset IDs supported by globestudio */
export type GlobestudioLook =
  | 'default'
  | 'halftone'
  | 'risograph'
  | 'newsprint'
  | 'aurora'
  | 'pixel'
  | 'bayer'
  | 'atkinson'
  | 'wireframe'
  | 'crt'
  | 'glitch'
  | 'badtv'
  | 'bloom'
  | 'metal'
  | 'iridescent'
  | 'pencil'
  | 'corrupt'
  | 'toon'
  | 'threshold'
  | 'vapor'
  | 'topographic';

export interface GlobestudioGlobeProps {
  /** Look preset id (default: 'halftone') */
  look?: GlobestudioLook;
  /** Width in CSS units (default: '100%') */
  width?: number | string;
  /** Height in CSS units (default: 480) */
  height?: number | string;
  /** Design config as JSON string */
  config?: string;
  /** Theme: 'light' or 'dark' (default: 'dark') */
  theme?: 'light' | 'dark';
  /** Accessible title for the iframe */
  title?: string;
  /** Additional CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Loading strategy */
  loading?: 'lazy' | 'eager';
  /** Enable data arcs between world nodes */
  dataArcs?: boolean;
  /** Highlight a specific world ID */
  highlightWorld?: string | null;
  /** Callback when a world is clicked */
  onWorldClick?: (worldId: string) => void;
  /** Show world labels on the globe */
  showLabels?: boolean;
  /** Custom world coordinates override */
  worldCoords?: Record<string, { lat: number; lng: number; value: number }>;
}

/**
 * GlobestudioGlobe - A reusable component for displaying dotted world maps
 * and animated 3D globes using Globestudio.
 *
 * @example
 * ```tsx
 * <GlobestudioGlobe
 *   look="crt"
 *   config={JSON.stringify({
 *     v: 3,
 *     selection: "continent:Europe",
 *     dotColor: "#7dd3fc"
 *   })}
 *   height={520}
 *   title="Dotted globe of Europe"
 * />
 * ``` */
export function GlobestudioGlobe({
  look = 'halftone',
  width = '100%',
  height = 480,
  config,
  theme = 'dark',
  title = 'Globestudio dotted globe',
  className,
  style,
  loading = 'lazy',
  dataArcs = true,
  highlightWorld,
  onWorldClick,
  showLabels = false,
  worldCoords,
}: GlobestudioGlobeProps) {
  // Base configuration merged with user config
  const baseConfig = {
    v: 3,
    selection: 'world',
    backgroundStyle: 'transparent',
    dotColor: '#8a8a8a',
    density: 55,
    globeSettings: {
      dataPoints: [],
      dataArcs: true,
      dataMarkerColor: '#fafafa',
    },
  };

  // Merge user config with base config
  const userConfig = config ? JSON.parse(config) : {};
  const mergedGlobeSettings = {
    ...baseConfig.globeSettings,
    ...userConfig.globeSettings,
    dataArcs: dataArcs !== false, // default to true
    dataMarkerColor: '#fafafa',
  };

  const mergedConfig = {
    ...baseConfig,
    ...userConfig,
    globeSettings: mergedGlobeSettings,
  };

  // Generate default data points from PLANETARY_ECOSYSTEMS if no custom coords provided
  const dataPoints = worldCoords
    ? Object.entries(worldCoords).map(([id, coord]) => ({
        lat: coord.lat,
        lng: coord.lng,
        value: coord.value,
        id,
      }))
    : [];

  return (
    <Globe
      look={look}
      width={width}
      height={height}
      config={JSON.stringify(mergedConfig)}
      theme={theme}
      title={title}
      className={className}
      style={style}
      loading={loading}
      // @ts-expect-error - Globe component accepts additional props
      dataPoints={dataPoints}
      dataArcs={dataArcs}
      onWorldClick={onWorldClick}
      showLabels={showLabels}
      highlightWorld={highlightWorld}
    />
  );
}

/** Default world coordinates mapping for the 9 canonical worlds */
export const DEFAULT_WORLD_COORDS: Record<string, { lat: number; lng: number; value: number }> = {
  '3wm': { lat: 51.5, lng: -0.12, value: 6 },
  yurrheeler: { lat: 40.71, lng: -74.0, value: 9 },
  farmplug: { lat: -1.29, lng: 36.82, value: 7 },
  firehouse: { lat: 30.27, lng: -97.74, value: 5 },
  feexkeeauth: { lat: 47.37, lng: 8.54, value: 8 },
  kappaxchangefin: { lat: 1.35, lng: 103.82, value: 9 },
  rentall: { lat: -33.87, lng: 151.21, value: 6 },
  feexsystems: { lat: 35.68, lng: 139.69, value: 10 },
  vyralabs: { lat: -23.55, lng: -46.63, value: 7 },
};

/** Preset configurations for each look - controls dotColor and density */
export const LOOK_PRESETS: Record<GlobestudioLook, { dotColor: string; density: number }> = {
  default: { dotColor: '#fafafa', density: 50 },
  halftone: { dotColor: '#8a8a8a', density: 55 },
  risograph: { dotColor: '#b3f3d9', density: 50 },
  newsprint: { dotColor: '#8b94c5', density: 60 },
  aurora: { dotColor: '#ff6b6b', density: 45 },
  pixel: { dotColor: '#ffd93d', density: 55 },
  bayer: { dotColor: '#6c5ce7', density: 55 },
  atkinson: { dotColor: '#00cec9', density: 55 },
  wireframe: { dotColor: '#e94645', density: 40 },
  crt: { dotColor: '#ff6b6b', density: 65 },
  glitch: { dotColor: '#74b9ff', density: 50 },
  badtv: { dotColor: '#ff8c42', density: 60 },
  bloom: { dotColor: '#f093fb', density: 45 },
  metal: { dotColor: '#a855f7', density: 50 },
  iridescent: { dotColor: '#00d4aa', density: 55 },
  pencil: { dotColor: '#fabf1b', density: 55 },
  corrupt: { dotColor: '#e53e3e', density: 65 },
  toon: { dotColor: '#38bdf8', density: 50 },
  threshold: { dotColor: '#ffffff', density: 70 },
  vapor: { dotColor: '#00d4aa', density: 50 },
  topographic: { dotColor: '#8884d8', density: 55 },
};