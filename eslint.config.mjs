// ESLint 9 flat config — Task 62, Sprint 16, Phase 4 of docs/FRONTEND_MODERNIZATION_PLAN.md
//
// Baseline policy (see "Lint baseline" in docs/FRONTEND_MODERNIZATION_PLAN.md):
// - Errors: only rules that catch real bugs (unused vars, no-undef on JS, etc.).
// - Warnings: style / a11y rules that have known existing violations, so the
//   baseline stays green while surfacing debt. Tighten incrementally.
//
// Deliberately NOT enabled yet (would flood the baseline):
// - `import/*` ordering rules (large existing surface).
// - `react-hooks/exhaustive-deps` as an error (kept as warn).

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default tseslint.config(
  // ---------------------------------------------------------------------------
  // Global ignores — generated output, vendor, fixtures, native builds.
  // ---------------------------------------------------------------------------
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      ".temp/**",
      ".build-metrics/**",
      "playwright-report/**",
      "test-results/**",
      "**/*.min.js",
      // Native / vendored demo bundles
      "client/components/ui/text-animations/**",
      "client/components/ui/halftone-patterns/**",
      // Generated / compiled artifacts
      "**/*.test.js",
      "**/*.spec.js",
      // Stale compiled copies of .ts sources (mirror the vitest exclude guard)
      "client/hooks/*.js",
      "server/**/*.js",
      // Generated DataConnect SDK bundles
      "client/lib/dataconnect/**",
    ],
  },

  // ---------------------------------------------------------------------------
  // Base JS recommended — ONLY plain JS files (TS handles its own scope/globals).
  // ---------------------------------------------------------------------------
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // ---------------------------------------------------------------------------
  // TypeScript files — non-type-aware recommended (fast, no project service).
  // Type-aware linting is intentionally deferred (see plan Task 62 note).
  // ---------------------------------------------------------------------------
  ...tseslint.configs.recommended,

  // ---------------------------------------------------------------------------
  // Global TS baseline: no-undef off (TS checks it) + known-debt rules → warn.
  // These apply to every .ts/.tsx file so coverage is uniform; per-directory
  // blocks below only ADD React/a11y/node specifics.
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-constant-binary-expression": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
    },
  },

  // ---------------------------------------------------------------------------
  // React + a11y + import for client TS/TSX
  // ---------------------------------------------------------------------------
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,

      // --- React hooks: keep the classic correctness rule as an error ---
      "react-hooks/rules-of-hooks": "error",

      // --- Real-bug rules kept as errors ---
      "no-debugger": "error",
      "no-unreachable": "error",

      // --- Downgraded to warnings to hold a green baseline ---
      // react-hooks v7 ships React-Compiler-era rules as errors; they flag a
      // large pre-existing surface. Warn now, tighten incrementally.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/config": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/set-state-in-render": "warn",

      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // --- jsx-a11y: real debt, warn to hold baseline ---
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // --- Off: handled by TypeScript or noisy in this codebase ---
      "no-undef": "off", // TS handles this; false positives on JSX globals
      "no-unused-vars": "off", // superseded by @typescript-eslint/no-unused-vars
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "jsx-a11y/no-autofocus": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Decorative mouse-effect wrappers — documented false positives.
  // These use onMouseEnter/onMouseMove purely to drive visual effects (spotlight
  // tracking, dock magnification, pill animation, text scramble). The actual
  // interactive controls are real <Link>/<button> elements rendered INSIDE these
  // wrappers, so requiring a role/tabIndex on the wrapper would be incorrect
  // (and would create duplicate/empty focus stops). See docs/LINT_BASELINE.md.
  // ---------------------------------------------------------------------------
  {
    files: [
      "client/components/motion/CursorSpotlightCard.tsx",
      "client/components/motion/TextScrambleMorph.tsx",
      "client/components/motion/MagneticGlowButton.tsx",
      "client/landing/cinematic/AppleDock.tsx",
      "client/landing/cinematic/FullWidthNav.tsx",
      "client/landing/cinematic/SushCinematicCarousel.tsx",
    ],
    rules: {
      "jsx-a11y/no-static-element-interactions": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Pointer-driven 3D joystick — documented exception.
  // The pad responds to touch/mouse drag; keyboard users navigate the scene with
  // WASD/arrows (handled by the scene, not this element). It is intentionally
  // NOT a focus stop, so no role/tabIndex is applied. See docs/LINT_BASELINE.md.
  // ---------------------------------------------------------------------------
  {
    files: ["client/components/sovereign/SovereignControls.tsx"],
    rules: {
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Server TS — node globals, no React/a11y
  // ---------------------------------------------------------------------------
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Tests — Vitest globals + relaxed rules
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "client/test/**/*.{ts,tsx,js}", "**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, vi: "readonly", describe: "readonly", it: "readonly", expect: "readonly", beforeEach: "readonly", afterEach: "readonly", beforeAll: "readonly", afterAll: "readonly" },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Config + scripts — node context, CJS allowed
  // ---------------------------------------------------------------------------
  {
    files: ["*.config.{ts,js,mjs}", "*.{cjs,js}", "scripts/**/*.{js,mjs,cjs,ts}", "e2e/**/*.ts", "client/test/setup.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  }
);
