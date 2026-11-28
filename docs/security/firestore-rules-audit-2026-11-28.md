# Firestore Security Rules Audit — 2026-11-28

Scope: `firestore.rules` vs. actual client usage (`client/lib/firebase.ts`,
`client/components/Bushfeexer.tsx`) and server write paths (Admin SDK bypasses
rules — verified no client-side `users`/`telemetry` writes exist).

## Data model in use

| Collection | Client usage | Write path |
|---|---|---|
| `users/{uid}` | none (reads only via server/API) | Server (Admin SDK) |
| `chat_rooms/{roomId}` | none directly | — |
| `chat_rooms/{roomId}/messages` | `addDoc` + ordered query (Bushfeexer) | Client |
| `telemetry/{docId}` | none found | Server (Admin SDK, if used at all) |
| everything else | — | default deny |

`roomId` = `user?.id || 'guest-session'` — guests get `'guest-session'`, but all
message rules require `request.auth != null`, so guest writes are denied
(fail-closed, acceptable: chat simply doesn't persist for guests).

## Findings

### F1 — Privilege escalation on `users` create (HIGH, fixed)

`isValidUser` accepts `role in ['USER','ADMIN','SUPER_ADMIN']` and `allow create`
placed no constraint on role. Any authenticated user could create their own
profile doc with `role: 'SUPER_ADMIN'`. No client code currently creates user
docs (server does, via Admin SDK which bypasses rules), so this was a latent
hole rather than an active exploit path — but any future client-side signup
flow would have inherited it.

**Fix:** self-service `create` now requires `role == 'USER'`. Server-side
provisioning via Admin SDK is unaffected.

### F2 — `emailVerified` self-assertion on update (MEDIUM, fixed)

`update` validated shape and protected `email`/`role`, but let the owner flip
`emailVerified` false→true without any verification. If any server logic ever
trusts that flag, users could self-certify.

**Fix:** `emailVerified` is now immutable on update
(`request.resource.data.emailVerified == resource.data.emailVerified`).

### F3 — `chat_rooms` read rule asymmetry (LOW, accepted)

`allow read` uses `roomId == request.auth.uid || resource.data.ownerUid == uid`.
Since `roomId` IS the owner's uid in practice, the `ownerUid` branch only
matters for rooms created with arbitrary ids — harmless. `get()` calls in the
`messages` subcollection rules cost one extra read per operation; acceptable
at current scale.

### F4 — Message mutability (LOW, accepted)

Room owners can `update`/`delete` messages, including `sender: 'bot'` ones.
The client itself writes bot messages (`Bushfeexer.tsx:355`), so rules cannot
distinguish client-written bot text from server-written — restricting this
would break the feature. Chat history is user-owned data, not an audit log;
accepted.

### F5 — `telemetry` read scope (LOW, informational)

Any authenticated user can read all telemetry docs. No client writes or reads
of this collection were found; if the server starts writing sensitive payloads
here, revisit. `payload` is an unconstrained map — consider a size/key cap if
adopted.

### F6 — Guest session path (INFO)

`roomId = 'guest-session'` for anonymous users is denied by `isAuthenticated()`.
No action — but if guest chat persistence is ever desired, it needs an
explicit anonymous-auth path, not a rule relaxation.

## Changes made

`firestore.rules`:
- `users` create: added `request.resource.data.role == 'USER'`
- `users` update: added `emailVerified` immutability check

## Verification

- Static review only — no emulator run in this pass (emulator suite requires
  Java; tracked as follow-up if rules grow more complex).
- No client code paths write `users` or `telemetry`, so both fixes are
  behavior-preserving for current usage.
- Deploy remains manual/authorized: `firebase deploy --only firestore:rules`.
