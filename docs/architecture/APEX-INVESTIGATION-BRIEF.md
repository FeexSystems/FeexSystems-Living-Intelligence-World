# APEX Investigation Brief — Gate 1 Exit Artifact

**Status:** Investigation template (not a purchase decision)  
**Reference:** FEEX EIL Architecture v1 (PR #51)  
**Rule:** APEX is an evaluation reference only. No source, shaders, or assets may be copied.

---

## 1. Claims Register

| Claim | Source | Classification | Notes |
|-------|--------|----------------|-------|
| Particle humanoid rendering | Marketing / demo | Advertised | Requires independent verification |
| Hand / face / pose tracking | Marketing / demo | Advertised | Local vs remote unknown |
| Gesture vocabulary | Marketing / demo | Advertised | Must map to FEEX first-release set |
| Licensing terms | Commercial docs | Unverified | OEM / redistribution rights required |
| Three.js based | Source inspection | To be determined | **Decision gate** |

## 2. Dependency Inventory Checklist

- [ ] Runtime (browser / native / hybrid)
- [ ] Renderer (Three.js / custom WebGL / other)
- [ ] Physics / animation runtime
- [ ] Perception stack (MediaPipe / custom / cloud)
- [ ] Asset pipeline and proprietary formats
- [ ] Build / packaging requirements
- [ ] License files and NOTICE obligations
- [ ] Any telemetry or remote endpoints

## 3. Rendering Architecture Questions

1. Is the renderer built on Three.js (or a thin wrapper)?
2. What is the particle budget and LOD strategy?
3. How is facial / body animation driven (morph targets, bones, pure particles)?
4. Are shaders original or derived from a commercial asset pack?
5. Does the demo use any pre-baked proprietary geometry that cannot be reimplemented?
6. What is the measured FPS on named hardware at the advertised particle count?

## 4. Benchmark Protocol

**Named hardware profiles required** (record CPU, GPU, RAM, OS, browser, viewport).

- Run 3× median of a 60-second idle + interaction script.
- Capture DevTools Performance panel (main thread, GPU, frame drops).
- Record particle count, draw calls, and memory at steady state.
- Repeat with reduced-motion preference enabled.
- Do not report a single best-run number.

## 5. Licence / IP Register

| Asset / Component | Licence | Redistribution rights | FEEX-owned equivalent required? |
|-------------------|---------|-----------------------|---------------------------------|
| Core engine | TBD | TBD | Yes (original implementation) |
| Shaders | TBD | TBD | Yes |
| Geometry / textures | TBD | TBD | Yes |
| Gestures / interaction logic | TBD | TBD | Yes |

## 6. Implemented vs Advertised vs Demonstrated Verdict Table

| Capability | Advertised | Demonstrated in authorized demo | Independently verified by FEEX | Notes |
|------------|------------|----------------------------------|--------------------------------|-------|
| Particle humanoid | Yes | TBD | No | |
| Gesture recognition | Yes | TBD | No | |
| Local camera processing | Yes | TBD | No | |
| Adaptive LOD | Yes | TBD | No | |
| Reduced-motion support | Unknown | TBD | No | |

## 7. FEEX Independent-Implementation Requirements

- Original particle / mechanical humanoid geometry and shaders.
- Original gesture classifier trained or calibrated on FEEX-controlled data.
- Explicit PermissionManager (no silent defaults).
- Evidence-backed agent state machine (contracts in `packages/feex-eil/contracts/`).
- No APEX-derived code, shaders, or assets in the FEEX repositories.

## 8. Decision Tree

```
Is APEX built on Three.js (or a compatible thin wrapper)?
├─ No  → Do not purchase. Reimplement on existing FEEX Three.js stack.
└─ Yes → Continue licence / IP / benchmark review.
         ├─ OEM / redistribution rights insufficient → Do not purchase.
         └─ Rights sufficient AND benchmarks meet FEEX targets
            → Consider limited evaluation licence only.
               Still implement original FEEX components.
```

**Hard rule:** If APEX is not on Three.js, do not purchase regardless of any other factor.

---

**Next:** Authorized source inspection + hardware benchmarks. No purchase decision until this brief is completed with evidence.
