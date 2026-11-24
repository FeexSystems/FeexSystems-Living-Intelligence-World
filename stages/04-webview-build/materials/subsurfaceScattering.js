import * as THREE from 'three';

/**
 * Subsurface Scattering material extension for standard WebGL viewports.
 *
 * Injects a wrap-diffuse + transmission-approximation SSS response into a
 * MeshPhysicalMaterial via onBeforeCompile, driven by uniform parameters:
 *   uSSSColor    - tint of scattered light (warm tissue falloff)
 *   uSSSStrength - 0..1 blend of the SSS lobe
 *   uSSSThickness- view-depth proxy controlling scatter radius
 *
 * Usage:
 *   const mat = createSubsurfaceMaterial({ color: 0x8a5a3b });
 *   mesh.material = mat;
 */
export function createSubsurfaceMaterial({
  color = 0x8a5a3b,
  roughness = 0.42,
  metalness = 0.08,
  sssColor = 0xd98e5f,
  sssStrength = 0.35,
  sssThickness = 0.35,
} = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
  });

  material.userData.sss = { sssColor, sssStrength, sssThickness };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSSSColor = { value: new THREE.Color(sssColor) };
    shader.uniforms.uSSSStrength = { value: sssStrength };
    shader.uniforms.uSSSThickness = { value: sssThickness };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uSSSColor;
        uniform float uSSSStrength;
        uniform float uSSSThickness;`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          // Wrap-diffuse SSS approximation: light bleeding through thin tissue.
          // Uses the existing irradiance estimate to fake transmission falloff.
          float sssFacing = clamp(dot(normal, directLight.direction) * 0.5 + 0.5, 0.0, 1.0);
          float sssWrap = pow(sssFacing, uSSSThickness * 4.0);
          reflectedLight.indirectDiffuse += uSSSColor * sssWrap * uSSSStrength * diffuseColor.rgb;
        }`
      );
  };

  // Force distinct program cache key per SSS parameter set
  material.customProgramCacheKey = () =>
    `sss-${sssColor}-${sssStrength}-${sssThickness}`;

  return material;
}

/**
 * Retroactively apply the SSS extension to any material whose name matches
 * the SyntheticSkin convention used by the FeexSovereign asset pipeline.
 */
export function applySubsurfaceToSkinMaterial(material) {
  if (!material || !material.name.includes('SyntheticSkin')) return material;
  if (material.userData.sssApplied) return material;

  const sss = createSubsurfaceMaterial({
    color: material.color ? material.color.getHex() : 0x8a5a3b,
    roughness: 0.42,
    metalness: 0.08,
  });

  // Preserve texture bindings from the source material
  ['map', 'roughnessMap', 'normalMap', 'aoMap'].forEach((slot) => {
    if (material[slot]) sss[slot] = material[slot];
  });

  material.userData.sssApplied = true;
  return sss;
}
