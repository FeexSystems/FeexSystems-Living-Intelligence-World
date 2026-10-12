# Maintained Scripts

Only scripts required for development, database lifecycle, ingestion, CI, deployment, or another active operational workflow belong here.

Current scripts:

- `migrate.ts` — database lifecycle operations used by the `db:*` package commands.
- `setup-dev.sh` — local development environment setup.
- `validate-setup.ts` — repository/environment validation used by `npm run validate`.
- `deploy-firebase.sh` (`deploy-firebase.ps1` on Windows) — local **Firebase** CLI deploy (Hosting + Functions + Data Connect), using the local GCP/Firebase credential chain. See `docs/FIREBASE_DEPLOYMENT.md`.

Historical task verifiers, one-off audits, generated reports, and temporary test runners must not be added here.