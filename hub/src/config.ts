import { resolve } from 'node:path'

// ===========================================================================
// Hub configuration.
//
// Everything is environment-driven with safe LAN-friendly defaults so the Hub
// can start with zero configuration. There is intentionally NO cloud config,
// no remote endpoints, and no public exposure.
// ===========================================================================

export interface HubConfig {
  /** Interface to bind. Default 0.0.0.0 so other LAN devices can reach it. */
  host: string
  /** TCP port to listen on. */
  port: number
  /** Friendly, family-facing Hub name. */
  hubName: string
  /** Absolute path to the Hub data directory (created on startup). */
  dataDir: string
  /**
   * Optional pairing code. When set, devices must supply a matching code to
   * pair. When null, pairing is permissive (LAN-only Phase 1 simplification).
   */
  pairingCode: string | null
}

/** Default LAN port (kept in sync with HUB_DEFAULT_PORT in the shared contract). */
const DEFAULT_PORT = 4321

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function loadConfig(): HubConfig {
  return {
    host: process.env.DABBLE_HUB_HOST ?? '0.0.0.0',
    port: envInt('DABBLE_HUB_PORT', DEFAULT_PORT),
    hubName: process.env.DABBLE_HUB_NAME ?? 'DabbleDuck Family Hub',
    dataDir: resolve(process.env.DABBLE_HUB_DATA ?? './dabbleduck-hub-data'),
    pairingCode: process.env.DABBLE_HUB_PAIRING_CODE?.trim() || null
  }
}
