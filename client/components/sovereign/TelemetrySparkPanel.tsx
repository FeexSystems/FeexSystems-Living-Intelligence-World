/**
 * TelemetrySparkPanel — monochrome bar + line chart for World OS HUD
 *
 * Drop into: client/components/sovereign/TelemetrySparkPanel.tsx
 * Mount as a DOM sibling inside .dashboard-container (not a second Canvas).
 *
 * Matches target HUD: left mid panel with monthly bars + overlay line.
 * Data can be static demo series or derived from satellite metrics.
 */

import React, { useMemo } from "react";

export interface SparkPoint {
  label: string;
  value: number;
}

export interface TelemetrySparkPanelProps {
  title?: string;
  series?: SparkPoint[];
  /** Peak highlight color (phosphor) */
  accent?: string;
  className?: string;
  /** Optional footer caption */
  caption?: string;
}

const DEFAULT_SERIES: SparkPoint[] = [
  { label: "JA", value: 42 },
  { label: "FE", value: 58 },
  { label: "MR", value: 51 },
  { label: "AP", value: 73 },
  { label: "MY", value: 66 },
  { label: "JN", value: 88 },
  { label: "JL", value: 79 },
  { label: "AU", value: 92 },
  { label: "SE", value: 70 },
  { label: "OC", value: 61 },
  { label: "NV", value: 55 },
  { label: "DE", value: 48 },
];

function buildPath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number
): string {
  const max = Math.max(...values, 1);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = padX + i * step;
      const y = padY + innerH - (v / max) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TelemetrySparkPanel({
  title = "Yield / Telemetry Index",
  series = DEFAULT_SERIES,
  accent = "#00ff66",
  className = "",
  caption,
}: TelemetrySparkPanelProps) {
  const width = 280;
  const height = 120;
  const padX = 8;
  const padY = 12;
  const values = series.map((s) => s.value);
  const max = Math.max(...values, 1);
  const peakIdx = values.indexOf(Math.max(...values));

  const linePath = useMemo(
    () => buildPath(values, width, height, padX, padY),
    [values, width, height, padX, padY]
  );

  const barWidth = Math.max(
    4,
    (width - padX * 2) / series.length - 4
  );

  return (
    <div
      className={`hud-panel hud-bracket p-3 ${className}`.trim()}
      style={{ minWidth: 0 }}
    >
      <div className="hud-panel-header">
        <span>{title}</span>
        <span className="data-label">INDEX</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="block"
        role="img"
        aria-label={title}
      >
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {series.map((pt, i) => {
          const innerW = width - padX * 2;
          const slot = innerW / series.length;
          const x = padX + i * slot + (slot - barWidth) / 2;
          const h = (pt.value / max) * (height - padY * 2);
          const y = height - padY - h;
          const isPeak = i === peakIdx;
          return (
            <rect
              key={pt.label}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 1)}
              fill={isPeak ? accent : "rgba(200, 210, 220, 0.45)"}
              opacity={isPeak ? 0.95 : 0.7}
            />
          );
        })}

        <path
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeOpacity={0.85}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {peakIdx >= 0 && (
          <circle
            cx={
              padX +
              peakIdx *
                (series.length > 1
                  ? (width - padX * 2) / (series.length - 1)
                  : 0)
            }
            cy={
              padY +
              (height - padY * 2) -
              (values[peakIdx] / max) * (height - padY * 2)
            }
            r={3}
            fill={accent}
          />
        )}
      </svg>

      <div
        className="flex justify-between mt-1 px-1"
        style={{ fontSize: 8, color: "var(--hud-text-muted, #788896)" }}
      >
        {series.map((pt) => (
          <span key={pt.label} className="uppercase tracking-wider">
            {pt.label}
          </span>
        ))}
      </div>

      {caption && (
        <div
          className="mt-2 text-[10px]"
          style={{ color: "var(--hud-text-muted, #788896)" }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

/**
 * Build a simple 12-point series from a satellite numeric metric
 * so charts stay tied to PLANETARY_ECOSYSTEMS data when available.
 */
export function seriesFromSeed(seed: number, labels = DEFAULT_SERIES.map((s) => s.label)): SparkPoint[] {
  const base = Math.max(20, Math.min(90, seed % 100));
  return labels.map((label, i) => {
    const wave = Math.sin((i / labels.length) * Math.PI * 2 + seed) * 18;
    const noise = ((seed * (i + 3)) % 11) - 5;
    return {
      label,
      value: Math.round(Math.max(12, Math.min(100, base + wave + noise))),
    };
  });
}

export default TelemetrySparkPanel;
