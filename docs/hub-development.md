# DabbleDuck Hub — Development Guide

Practical guide for running and developing the optional DabbleDuck Hub and the
launcher's Hub client. For the full design rationale see
[architecture/dabbleduck-hub-architecture.md](architecture/dabbleduck-hub-architecture.md).

> **Golden rule:** the Hub is optional. Nothing here may break standalone local
> play. If the Hub is disabled or unreachable, DabbleDuck behaves exactly as it
> did before the Hub existed.

---

## What exists today (Phase 1)

- A standalone Node/TypeScript Hub service in [`hub/`](../hub) (isolated package,
  own `package.json`/`tsconfig.json`, not part of the Electron build).
- SQLite **metadata** storage via Node's built-in `node:sqlite` (no native build).
- Filesystem **artifact** storage (bytes on disk, metadata in SQLite).
- Foundational HTTP API: `/health`, `/hub/info`, `/devices/pair`, `/profiles`,
  `/sync/push`, `/sync/pull`, `/artifacts`, `/artifacts/:id`.
- Launcher Hub client ([`src/main/hubClient.ts`](../src/main/hubClient.ts)) +
  IPC + a "Family Hub (optional)" card in Parent Mode
  ([`src/renderer/components/HubSettingsCard.tsx`](../src/renderer/components/HubSettingsCard.tsx)).
- Shared wire contract ([`src/shared/hubContract.ts`](../src/shared/hubContract.ts))
  and shared pure data model ([`src/shared/dataModel.ts`](../src/shared/dataModel.ts)).

## What is intentionally NOT built yet

Multiplayer, real-time co-op, mDNS discovery, incremental cursor sync, immutable
content-addressed artifacts, soft-delete tombstones, family gallery/timeline UI,
automatic backups, and any conflict resolution beyond last-write-wins. The code
is structured so these slot in later (see the roadmap section below).

---

## Running the Hub

```bash
cd hub
npm install      # installs fastify + dev tooling (no native modules)
npm start        # tsx src/server.ts
# or, with auto-reload during development:
npm run dev
npm run typecheck
```

Config via env vars (see [`hub/README.md`](../hub/README.md)). Default bind is
`0.0.0.0:4321`; default data dir is `hub/dabbleduck-hub-data/` (gitignored).

### Quick manual test (PowerShell)

```powershell
$base='http://127.0.0.1:4321'
Invoke-RestMethod "$base/health"
$pair = Invoke-RestMethod -Method Post "$base/devices/pair" -ContentType 'application/json' -Body (@{deviceName='Test'} | ConvertTo-Json)
$headers = @{ 'x-dabble-device-token' = $pair.deviceToken }
Invoke-RestMethod "$base/profiles" -Headers $headers
```

---

## Connecting a launcher (client)

1. Start the Hub on Josh's PC; note its LAN IP (e.g. `192.168.1.20`).
2. In a child's DabbleDuck launcher, open **Parent Mode** (PIN, default `1234`).
3. In **Family Hub (optional)**: toggle **Enable Hub**, enter the IP + port.
4. Click **Test connection** → should report the Hub name.
5. Click **Pair device** → stores a device token in the launcher's `settings.json`.
6. Click **Sync now** → pushes local profiles/progress, pulls family data.

If the Hub is off or unreachable, all of the above fail gracefully and local
play is unaffected.

### Where client Hub state lives

In the launcher's `settings.json` (`%APPDATA%/dabbleduck` on Windows) under the
optional `hub` block: `{ enabled, address, port, deviceId, deviceToken,
lastSyncStatus, lastSyncAt }`. Older installs are back-filled with a disabled
default by `getSettings()` in [`src/main/storage.ts`](../src/main/storage.ts).

---

## Architecture seams (how Phase 1 stays future-proof)

- **`cursor`** on `/sync/push` and `/sync/pull` responses + the `change_log`
  table → future incremental, resumable sync.
- **`ArtifactMeta.contentHash`** → future immutable, content-addressed,
  de-duplicated artifact storage.
- **`ArtifactMeta.deletedAt`** → future soft-delete tombstones + restore.
- **`SyncPushRequest.artifacts`** carries metadata now; bytes go via
  `/artifacts`. This split is the seam for the future family gallery.
- **Last-write-wins by `updated_at`** today → richer per-device merge later
  (progress counters are largely monotonic, which makes conflict-free merge
  achievable without rework).

---

## Conventions / gotchas

- **PowerShell:** chain commands with `;`, not `&&`.
- The Hub uses the built-in `node:sqlite`, which prints an `ExperimentalWarning`
  on startup. This is expected and harmless.
- Keep the launcher↔Hub DTOs in [`src/shared/hubContract.ts`](../src/shared/hubContract.ts)
  as the single source of truth; the Hub imports them type-only.
- Never let the Hub become required: every client Hub call must be failure-safe.
