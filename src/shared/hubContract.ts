// ===========================================================================
// DabbleDuck Hub contract (v1)
//
// The SINGLE source of truth for how a DabbleDuck launcher (client) and the
// optional DabbleDuck Hub service talk to each other over the LAN via HTTP.
//
// Like `gameContract.ts` and `dataModel.ts`, this file contains ONLY plain
// types and constants -- no Node, DOM, Electron, or runtime dependencies --
// so it is safe to import from the launcher (main/preload/renderer) and from
// the standalone Hub service (type-only imports are erased at runtime).
//
// Design notes for future phases (intentionally NOT implemented in Phase 1):
//   - `cursor` on push/pull responses is the seam for change-log / outbox
//     based incremental sync.
//   - `ArtifactMeta.deletedAt` is the seam for soft-delete tombstones.
//   - Artifact content is addressed by `contentHash`, the seam for immutable,
//     content-addressed storage and de-duplication.
// ===========================================================================

import type { ChildProgress, Profile } from './dataModel'

/** Bump when the on-the-wire Hub contract changes in a breaking way. */
export const HUB_PROTOCOL_VERSION = 1

/** Default LAN port the Hub listens on (override via config/env). */
export const HUB_DEFAULT_PORT = 4321

/** Header carrying a paired device's secret token on protected routes. */
export const DEVICE_TOKEN_HEADER = 'x-dabble-device-token'

// --- /health ---------------------------------------------------------------

export interface HealthResponse {
  ok: true
  /** Process uptime in whole seconds. */
  uptimeSeconds: number
  time: string
}

// --- /hub/info -------------------------------------------------------------

export interface HubInfo {
  /** Stable id generated once for this Hub install. */
  hubId: string
  /** Friendly family-facing name, e.g. "Family Hub". */
  name: string
  /** Hub service version string. */
  version: string
  /** Wire-contract version the Hub speaks. */
  protocolVersion: number
  time: string
}

// --- /devices/pair ---------------------------------------------------------

export interface PairRequest {
  /** Friendly device name, e.g. "Addie's Laptop". */
  deviceName: string
  /**
   * Optional pairing code. If the Hub is configured with a code, it must
   * match; if the Hub has no code configured, pairing is permissive (LAN-only,
   * Phase 1 simplification).
   */
  pairingCode?: string
}

export interface PairResponse {
  deviceId: string
  deviceToken: string
  hubId: string
}

// --- Artifacts -------------------------------------------------------------

/**
 * Broad category for a stored creation. Open string so future creation types
 * (Doodle Pond saves, stories, saved worlds, screenshots, ...) need no
 * contract change.
 */
export type ArtifactType =
  | 'artwork'
  | 'story'
  | 'screenshot'
  | 'saved-world'
  | 'creation'
  | (string & {})

/** Metadata describing one stored artifact. The bytes live on the filesystem. */
export interface ArtifactMeta {
  id: string
  profileId: string
  type: ArtifactType
  title: string
  /** Hash of the content bytes (addressing + integrity + future de-dup). */
  contentHash: string
  mimeType: string
  /** Name of the file on the Hub's filesystem (inside the artifacts dir). */
  fileName: string
  /** Size of the content in bytes. */
  size: number
  createdAt: string
  /** Where it came from, e.g. "doodle-pond" or a gameId. */
  source: string
  /** Soft-delete tombstone (Phase 1: always null; seam for future phases). */
  deletedAt?: string | null
}

/** Client -> Hub: upload an artifact (v1 carries content as base64 JSON). */
export interface ArtifactUploadRequest {
  /** Caller-supplied metadata. The Hub fills in contentHash/size/fileName. */
  meta: Pick<ArtifactMeta, 'id' | 'profileId' | 'type' | 'title' | 'source'> & {
    mimeType?: string
    createdAt?: string
  }
  /** Base64-encoded content bytes. */
  contentBase64: string
}

export interface ArtifactUploadResponse {
  ok: true
  meta: ArtifactMeta
}

/** Hub -> client: artifact metadata plus its content as base64. */
export interface ArtifactGetResponse {
  meta: ArtifactMeta
  contentBase64: string
}

// --- Sync ------------------------------------------------------------------

/**
 * Client -> Hub: push local snapshots. Progress already contains the child's
 * achievements/badges, so a separate "achievement snapshot" is unnecessary.
 * Phase 1 uses last-write-wins by `updatedAt`; no advanced merge.
 */
export interface SyncPushRequest {
  deviceId: string
  profiles: Profile[]
  progress: ChildProgress[]
  /** Optional artifact metadata placeholders (bytes go via /artifacts). */
  artifacts?: ArtifactMeta[]
}

export interface SyncPushResponse {
  ok: true
  /** Monotonic change-log position after applying this push. */
  cursor: number
}

/**
 * Hub -> client: family data the client may pull. Phase 1 returns the full
 * family roster and artifact metadata; `cursor` is the seam for incremental
 * pulls in a later phase (`GET /sync/pull?since=<cursor>`).
 */
export interface SyncPullResponse {
  profiles: Profile[]
  artifacts: ArtifactMeta[]
  cursor: number
}

// --- GET /profiles ---------------------------------------------------------

export interface ProfilesResponse {
  profiles: Profile[]
}

// --- Errors ----------------------------------------------------------------

export interface HubErrorResponse {
  ok: false
  error: string
}
