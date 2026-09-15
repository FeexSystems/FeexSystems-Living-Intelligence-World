 



































export const QUALITY_PRESETS













 = {
  cinematic: {
    label: "Cinematic",
    dpr: [1, 2],
    stars: 6000,
    sparkles: 200,
    transmission: true,
    bloom: true,
    bloomIntensity: 1.15,
    trail: true,
    sphereSegments: 64,
    maxLinks: 200,
  },
  balanced: {
    label: "Balanced",
    dpr: [1, 1.5],
    stars: 3500,
    sparkles: 120,
    transmission: true,
    bloom: true,
    bloomIntensity: 0.7,
    trail: true,
    sphereSegments: 48,
    maxLinks: 120,
  },
  performance: {
    label: "Performance",
    dpr: 1,
    stars: 1500,
    sparkles: 40,
    transmission: false,
    bloom: false,
    bloomIntensity: 0,
    trail: false,
    sphereSegments: 24,
    maxLinks: 60,
  },
};

export function nodeRadius(node) {
  if (node.type === "technology") {
    return 0.55 + Math.min((node.val || 12) / 40, 0.35);
  }
  const base = node.isPinned ? 1.45 : 1.1;
  const artifacts = Math.min((node.artifactCount || 0) / 20, 0.55);
  const valBoost = Math.min((node.val || 24) / 80, 0.35);
  return base + artifacts + valBoost;
}
