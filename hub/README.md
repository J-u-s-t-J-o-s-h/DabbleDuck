# DabbleDuck Hub

An **optional**, local-first LAN family server for DabbleDuck.

The Hub stores and (eventually) syncs profiles, progress, achievements, and
family creations (artwork, screenshots, saved worlds, stories) across the
family's devices — **without any cloud, account, or internet dependency**.

> The Hub is an enhancement, never a requirement. Every DabbleDuck launcher
> keeps working fully offline and standalone whether or not a Hub exists.

This package is **Phase 1: the foundation**. It is intentionally small and
boring. There is no multiplayer, no real-time co-op, and no advanced conflict
resolution yet (see [Roadmap](#roadmap)).

---

## Quick start

Requirements: a modern Node.js (uses the built-in `node:sqlite`, so **no native
build step** is required).

```bash
cd hub
npm install
npm start
```

On startup the Hub:

- creates its data directory (default `./dabbleduck-hub-data/`),
- initializes the SQLite metadata database (`hub.sqlite`),
- creates the artifact/blob/backup/log directories,
- binds to the configured host/port (default `0.0.0.0:4321`),
- prints a clear startup banner.

Then from another LAN device:

```text
http://<hub-ip>:4321/health   ->  { "ok": true, ... }
```

---

## Configuration

All configuration is environment-driven with safe LAN defaults. There is no
cloud config and the Hub is **not** intended to be exposed to the internet.

| Env var                   | Default                  | Purpose                              |
| ------------------------- | ------------------------ | ------------------------------------ |
| `DABBLE_HUB_HOST`         | `0.0.0.0`                | Interface to bind (LAN reachable).   |
| `DABBLE_HUB_PORT`         | `4321`                   | TCP port.                            |
| `DABBLE_HUB_NAME`         | `DabbleDuck Family Hub`  | Friendly family-facing name.         |
| `DABBLE_HUB_DATA`         | `./dabbleduck-hub-data`  | Data directory (created on startup). |
| `DABBLE_HUB_PAIRING_CODE` | _(unset)_                | If set, devices must match it to pair. |

Example (PowerShell):

```powershell
$env:DABBLE_HUB_PORT=4321; $env:DABBLE_HUB_PAIRING_CODE='duck42'; npm start
```

---

## Data layout

```text
dabbleduck-hub-data/
├── hub.sqlite     # metadata ONLY (profiles, progress, artifact metadata, devices, change log)
├── blobs/         # reserved for future content-addressed blobs
├── artifacts/     # creation files (artwork, stories, screenshots, ...)
├── backups/       # reserved for future automatic backups
└── logs/          # startup + runtime logs
```

Artifact **bytes are stored as files**; SQLite stores **metadata only**.

---

## API (Phase 1)

| Method + path        | Auth        | Purpose                                            |
| -------------------- | ----------- | -------------------------------------------------- |
| `GET /health`        | none        | Liveness check.                                    |
| `GET /hub/info`      | none        | Hub id, name, version, protocol version.           |
| `POST /devices/pair` | none        | Register a device; returns a device token.         |
| `GET /profiles`      | device token| Family profile roster.                             |
| `POST /sync/push`    | device token| Store profile/progress snapshots + artifact meta.  |
| `GET /sync/pull`     | device token| Return family profiles + artifact metadata.        |
| `POST /artifacts`    | device token| Upload a creation (`{ meta, contentBase64 }`).     |
| `GET /artifacts/:id` | device token| Fetch a creation's metadata + content.             |

Protected routes require the header `x-dabble-device-token: <token>` returned by
`POST /devices/pair`.

The wire contract types live in [`../src/shared/hubContract.ts`](../src/shared/hubContract.ts)
and are shared by the launcher and the Hub.

---

## Security (Phase 1)

Deliberately simple and LAN-only:

- Device-based trust: a device pairs once and presents its token on sync.
- Optional pairing code (`DABBLE_HUB_PAIRING_CODE`).
- **No** user accounts, **no** passwords, **no** cloud auth, **no** public exposure.
- Run it on a trusted home network only.

---

## Roadmap

Phase 1 establishes the foundation. Future phases (already shaped by the schema
and route contracts, but **not** implemented yet):

- Outbox + change-log cursors for incremental, resumable sync.
- Immutable, content-addressed artifacts + de-duplication.
- Soft-delete tombstones and parent-gated restore.
- Family gallery, story library, and family timeline (the Hub's primary purpose:
  preserving and sharing family creations).
- Automatic backups + restore + hardware-migration tooling.
- mDNS/Zeroconf auto-discovery (manual IP/port today).
- Multiplayer foundation (LAN lobby/relay) — explicitly **out of scope**.

See [`../docs/architecture/dabbleduck-hub-architecture.md`](../docs/architecture/dabbleduck-hub-architecture.md)
for the full design and [`../docs/hub-development.md`](../docs/hub-development.md)
for development details.
