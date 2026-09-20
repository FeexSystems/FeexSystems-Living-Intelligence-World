# Index.tsx — Cinematic Phase A (apply on this branch)

Three one-line (or small-block) edits to `client/pages/Index.tsx`:

## 1. LUT map path (webp exists; png does not)

```diff
- lutMap="/media/feex/lut-cinematic-16.png"
+ lutMap="/media/feex/lut-cinematic-16.webp"
```

## 2. Theater modal poster (zero black-flash)

```diff
  <TheaterVideoPlayer
    isOpen={theaterOpen}
    onClose={() => setTheaterOpen(false)}
    videoUrl="/media/feex/feexsystems-pitch-deck.mp4"
+   poster="/media/feex/feex-architecture-board.webp"
    title="FEEXSYSTEMS Living Intelligence Architecture"
```

## 3. Footer ambient robotics poster

```diff
  <VideoOverlayBackground
    src="/media/feex/feex-robotics.mp4"
+   poster="/media/feex/feex-robotics-poster.webp"
    position="footer"
```

`TheaterVideoPlayer` already accepts `poster` + `playsInline` + reduced-motion pause on this branch.

Full patched Index also in project artifacts: `artifacts/index-cinematic-phase-a.patch`
