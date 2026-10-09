# Design Tokens Documentation

**Task Reference:** Phase 4, Sprint 13, Task 52

**Last Updated:** 2026-10-07

## Overview

This document documents all design tokens used in the FeexSystems application, including colors, typography, spacing, radii, shadows, and durations.

## Colors

### TailwindCSS Design Tokens

**File:** `client/styles/global-body-p0.css`

**CSS Variables:**

```css
:root {
  --background: 0 0% 0%;           /* #000000 */
  --foreground: 0 0% 98%;         /* #fafafa */
  --card: 0 0% 7%;               /* #121212 */
  --card-foreground: 0 0% 98%;    /* #fafafa */
  --popover: 0 0% 7%;            /* #121212 */
  --popover-foreground: 0 0% 98%; /* #fafafa */
  --primary: 0 0% 100%;          /* #ffffff */
  --primary-foreground: 0 0% 0%;  /* #000000 */
  --secondary: 0 0% 14%;         /* #242424 */
  --secondary-foreground: 0 0% 98%; /* #fafafa */
  --muted: 0 0% 14%;             /* #242424 */
  --muted-foreground: 0 0% 65%;  /* #a6a6a6 */
  --accent: 0 0% 100%;           /* #ffffff */
  --accent-foreground: 0 0% 0%;   /* #000000 */
  --destructive: 0 0% 30%;      /* #4d4d4d */
  --destructive-foreground: 0 0% 98%; /* #fafafa */
  --border: 0 0% 20%;            /* #333333 */
  --input: 0 0% 20%;             /* #333333 */
  --ring: 0 0% 100%;             /* #ffffff */
  --radius: 0.5rem;              /* 8px */
}
```

### FeexSystems-Specific Tokens

**File:** `client/styles/global-body-p0.css`

**CSS Variables:**

```css
:root {
  --bg-dark: #080a0c;             /* Dark background */
  --text-main: #e0e6ed;          /* Main text */
  --text-muted: #788896;         /* Muted text */
  --panel-bg: rgba(8, 12, 18, 0.72); /* Panel background */
  --panel-border: rgba(0, 255, 102, 0.22); /* Panel border */
  --hud-border: rgba(0, 255, 102, 0.45); /* HUD border */
}
```

### Glass Effects

**CSS Variables:**

```css
:root {
  --glass-bg: rgba(0, 0, 0, 0.6);       /* Glass background */
  --glass-border: rgba(255, 255, 255, 0.15); /* Glass border */
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.8); /* Glass shadow */
}
```

### Focus Colors

**File:** `client/global.css`

```css
:focus-visible {
  outline: 2px solid var(--hud-phosphor, #00ff66);
  outline-offset: 2px;
}
```

**HUD Phosphor:** `#00ff66` (green)

## Typography

### Font Families

**Google Fonts (4 families after optimization):**

1. **Google Sans** - Primary sans-serif
   - Weights: 400, 500, 600, 700
   - Usage: Headings, body text

2. **JetBrains Mono** - Monospace
   - Weights: 400, 500
   - Usage: Code, data, labels

3. **Rajdhani** - Display
   - Weights: 400, 500, 600, 700
   - Usage: HUD labels, titles

4. **Space Grotesk** - Accent
   - Weights: 400, 500, 600
   - Usage: Accent text, logos

### Font Sizes

**CSS Classes:**

```css
.os-title {
  font-family: "Rajdhani", "Google Sans", sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.status-badge {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.nav-tab {
  font-size: 10px;
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.panel-header {
  font-family: "Rajdhani", "Google Sans", sans-serif;
  font-size: 14px;
  letter-spacing: 2px;
}

.btn-dossier {
  font-family: "Rajdhani", "Google Sans", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
```

## Spacing

### TailwindCSS Spacing Scale

- `0` - 0px
- `px` - 1px
- `0.5` - 2px
- `1` - 4px
- `1.5` - 6px
- `2` - 8px
- `2.5` - 10px
- `3` - 12px
- `3.5` - 14px
- `4` - 16px
- `5` - 20px
- `6` - 24px
- `7` - 28px
- `8` - 32px
- `9` - 36px
- `10` - 40px
- `12` - 48px
- `16` - 64px
- `20` - 80px
- `24` - 96px

### Component-Specific Spacing

```css
.dashboard-container {
  padding: 16px 20px 20px;
  gap: 12px;
}

.nav-bar {
  gap: 6px;
}

.panel {
  padding: 20px;
}

.panel-header {
  margin-bottom: 15px;
  padding-bottom: 8px;
}

.data-row {
  margin-bottom: 8px;
}

.log-console {
  margin-top: 15px;
  padding: 10px;
}

.btn-dossier {
  padding: 8px 16px;
  gap: 8px;
}
```

## Radii

### TailwindCSS Radii

- `none` - 0px
- `sm` - 2px
- `DEFAULT` - 4px
- `md` - 6px
- `lg` - 8px
- `xl` - 12px
- `2xl` - 16px
- `3xl` - 24px
- `full` - 9999px

### Design Token

```css
:root {
  --radius: 0.5rem; /* 8px */
}
```

### Component-Specific Radii

```css
.glass-card {
  border-radius: 16px;
}
```

## Shadows

### Glass Shadow

```css
:root {
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}
```

### TailwindCSS Shadows

- `sm` - 0 1px 2px 0 rgb(0 0 0 / 0.05)
- `DEFAULT` - 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
- `md` - 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- `lg` - 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- `xl` - 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)

## Durations

### Transitions

```css
button,
a,
input,
select,
textarea {
  transition: all 0.2s ease-in-out;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Utility Classes

### Glass Effect

```css
.glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-card {
  @apply glass;
  border-radius: 16px;
}
```

### HUD Bracket

```css
.hud-bracket {
  position: relative;
}

.hud-bracket::before,
.hud-bracket::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(0, 245, 212, 0.45);
  pointer-events: none;
}

.hud-bracket::before {
  top: -1px;
  left: -1px;
  border-top: 2px solid;
  border-left: 2px solid;
}

.hud-bracket::after {
  bottom: -1px;
  right: -1px;
  border-bottom: 2px solid;
  border-right: 2px solid;
}
```

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.not-sr-only {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

## Storybook Design System Section

Add to Storybook as a "Design System" page with visual examples of all tokens.

## Status

**Overall Status:** Design Tokens Documented

**Completed:** Documented colors, typography, spacing, radii, shadows, durations, utility classes
**In Progress:** Creating Storybook Design System section
**Next Steps:** Expose tokens as Storybook "Design System" section with visual examples
