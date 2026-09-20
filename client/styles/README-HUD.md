# World OS HUD tokens (Phase D)

Use these CSS custom properties for any new sovereign HUD chrome:

| Token | Role |
|-------|------|
| `--hud-void` | Deep background |
| `--hud-panel-bg` | Frosted panel fill |
| `--hud-border` / `--hud-border-strong` | Phosphor borders |
| `--hud-phosphor` / `--hud-phosphor-dim` | Primary accent `#00ff66` |
| `--hud-cyan` | Technical Dossier frame only |
| `--hud-text` / `--hud-text-muted` | Typography |

Classes: `.hud-panel`, `.hud-bracket`, `.hud-bracket-4`, `.hud-sensor-strip`, `.mid-grid`, `.btn-dossier`.

Invariants: single R3F Canvas; no invented KPIs; respect `prefers-reduced-motion`.
