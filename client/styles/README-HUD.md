# Sovereign HUD styles

- `sovereign-hud-glass.css` — glass panels, brackets, mid-grid, dossier CTA (shipped on this branch)
- `global-body.css` — full design system (must match `main` `client/global.css` content)

If `global-body.css` is missing after merge, copy from `main`:

```bash
git show main:client/global.css > client/styles/global-body.css
```

Then keep the two `@import` lines in `client/global.css`.
