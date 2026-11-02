# Evidence Rules — FEEX Evidence-First Repository Auditor Pro

These rules are binding for any report produced by this skill.

## 1. Primary evidence preferred

Prefer, in order:

1. Source files and directories that implement the behaviour
2. Configuration files (package manifests, CI workflows, env examples, tsconfig, etc.)
3. Generated artefacts that are committed and versioned (lockfiles, schema snapshots)
4. Documentation that is clearly maintained alongside the code

Secondary documentation (READMEs, external wikis) may support an inference but must not be the sole basis for a **Confirmed** finding.

## 2. Test and CI claims

| Claim type | Minimum evidence required |
|------------|---------------------------|
| “Tests exist” | Test files or test configuration observed |
| “Tests are configured to run in CI” | Workflow / pipeline definition that invokes the tests |
| “Tests passed on this commit” | Actual run log, status check, or coverage artefact tied to the commit |
| “Build succeeds” | Successful build artefact or log for the target commit |

Absence of the stronger evidence forces the weaker claim or an **Unknown** gate.

## 3. Architecture claims

- A component exists only if its implementation (or a clear registration point) is present.
- A relationship (import, route mount, event emission) exists only if the linking code is observed.
- “Matches documentation” requires both the documentation statement and the corresponding source evidence.

## 4. Negative evidence

“Not observed” is a valid and useful finding. Record what was searched so the reader understands the confidence boundary.

## 5. Hypotheses

Hypotheses are permitted when they help prioritisation, but they must be labelled and never mixed into the Confirmed column of findings or gates.

## 6. Secrets and credentials

If credential-like strings or private keys appear in the examined tree, report them as a **Confirmed** finding with path evidence and recommend immediate rotation / removal. Do not reproduce the secret values in the report.
