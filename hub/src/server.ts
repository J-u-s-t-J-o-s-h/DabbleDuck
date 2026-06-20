import Fastify from 'fastify'
import { loadConfig } from './config.ts'
import { ensurePaths } from './storage/paths.ts'
import { ensureHubId, openDb } from './db.ts'
import { log, setLogDir } from './log.ts'
import type { HubContext } from './types/index.ts'
import { registerHealthRoutes } from './routes/health.ts'
import { registerInfoRoutes } from './routes/info.ts'
import { registerDeviceRoutes } from './routes/devices.ts'
import { registerProfileRoutes } from './routes/profiles.ts'
import { registerSyncRoutes } from './routes/sync.ts'
import { registerArtifactRoutes } from './routes/artifacts.ts'

const HUB_VERSION = '0.1.0'

async function main(): Promise<void> {
  const config = loadConfig()
  const paths = ensurePaths(config.dataDir)
  setLogDir(paths.logsDir)

  log.info('Starting DabbleDuck Hub...')
  log.info(`Data directory: ${paths.dataDir}`)

  const db = openDb(paths.dbFile)
  const hubId = ensureHubId(db)

  const ctx: HubContext = {
    db,
    paths,
    config,
    hubId,
    version: HUB_VERSION,
    startedAt: Date.now()
  }

  const app = Fastify({
    // We use our own logger; keep Fastify quiet to avoid duplicate logs.
    logger: false,
    // Allow base64-carrying artifact uploads up to ~25 MB.
    bodyLimit: 25 * 1024 * 1024
  })

  // Foundational routes only (Phase 1).
  registerHealthRoutes(app, ctx)
  registerInfoRoutes(app, ctx)
  registerDeviceRoutes(app, ctx)
  registerProfileRoutes(app, ctx)
  registerSyncRoutes(app, ctx)
  registerArtifactRoutes(app, ctx)

  try {
    await app.listen({ host: config.host, port: config.port })
  } catch (err) {
    log.error(`Failed to bind ${config.host}:${config.port} — ${String(err)}`)
    process.exit(1)
  }

  log.info('────────────────────────────────────────────')
  log.info(`  ${config.hubName}`)
  log.info(`  Hub ID:      ${hubId}`)
  log.info(`  Version:     ${HUB_VERSION}`)
  log.info(`  Listening:   http://${config.host}:${config.port}`)
  log.info(`  Health:      http://${config.host}:${config.port}/health`)
  log.info(
    `  Pairing:     ${config.pairingCode ? 'code required' : 'open (LAN-only)'}`
  )
  log.info(`  Data dir:    ${paths.dataDir}`)
  log.info('  Hub ready. Local play never requires this server.')
  log.info('────────────────────────────────────────────')

  const shutdown = (signal: string): void => {
    log.info(`Received ${signal}, shutting down...`)
    app
      .close()
      .then(() => {
        db.close()
        process.exit(0)
      })
      .catch(() => process.exit(1))
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  log.error(`Fatal startup error: ${String(err)}`)
  process.exit(1)
})
