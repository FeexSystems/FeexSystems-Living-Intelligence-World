# Engineering Documentation

Engineering documentation describes how FEEXSYSTEMS is built, tested, and evolved.

## Areas

- Repository structure
- TypeScript contracts
- Client/server boundaries
- Database and Prisma schema
- Testing
- Build system
- CI/CD
- Runtime configuration

## Source of truth

When documentation and source code disagree, source code and validated runtime configuration must be treated as the engineering source of truth. Documentation should then be updated so the discrepancy does not persist.

## Quality gates

Production changes should pass the repository's applicable typecheck, test, build, and browser/runtime validation gates.
