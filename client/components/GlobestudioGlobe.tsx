import { Globe } from '@globestudio/react';

export interface GlobestudioGlobeProps {
  /** Look preset id (default: 'halftone') */
  look?: 'default' | 'halftone' | 'risograph' | 'newsprint' | 'aurora' | 'pixel' | 'bayer' | 'atkinson' | 'wireframe' | 'crt' | 'glitch' | 'badtv' | 'bloom' | 'metal' | 'iridescent' | 'pencil' | 'corrupt' | 'toon' | 'threshold' | 'vapor' | 'topographic';
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
 * ```
 */
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
}: GlobestudioGlobeProps) {
  return (
    <Globe
      look={look}
      width={width}
      height={height}
      config={config}
      theme={theme}
      title={title}
      className={className}
      style={style}
      loading={loading}
    />
  );
}

export default GlobestudioGlobe;
