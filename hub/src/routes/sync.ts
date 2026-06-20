import type { FastifyInstance } from 'fastify'
import type {
  HubErrorResponse,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse
} from '../../../src/shared/hubContract'
import {
  appendChange,
  currentCursor,
  insertArtifact,
  listArtifacts,
  listProfiles,
  upsertProfile,
  upsertProgress
} from '../db.ts'
import { authenticateDevice } from './auth.ts'
import { log } from '../log.ts'
import type { HubContext } from '../types/index.ts'

export function registerSyncRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  // Client -> Hub: push local snapshots (last-write-wins by updated_at).
  app.post(
    '/sync/push',
    async (req, reply): Promise<SyncPushResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }

      const body = req.body as Partial<SyncPushRequest> | undefined
      if (!body) {
        reply.code(400)
        return { ok: false, error: 'Missing request body' }
      }

      const profiles = Array.isArray(body.profiles) ? body.profiles : []
      const progress = Array.isArray(body.progress) ? body.progress : []
      const artifacts = Array.isArray(body.artifacts) ? body.artifacts : []
      const now = new Date().toISOString()

      const apply = ctx.db.transaction(() => {
        for (const profile of profiles) {
          if (profile && typeof profile.id === 'string') {
            upsertProfile(ctx.db, profile, now, device.id)
          }
        }
        for (const record of progress) {
          if (record && typeof record.profileId === 'string') {
            upsertProgress(ctx.db, record, device.id)
          }
        }
        // Phase 1: store artifact METADATA only. Bytes arrive via /artifacts.
        for (const meta of artifacts) {
          if (meta && typeof meta.id === 'string') {
            insertArtifact(ctx.db, meta)
          }
        }
        appendChange(ctx.db, 'sync.push', device.id, device.id)
      })
      apply()

      log.info(
        `Sync push from ${device.name}: ${profiles.length} profile(s), ` +
          `${progress.length} progress, ${artifacts.length} artifact meta`
      )

      return { ok: true, cursor: currentCursor(ctx.db) }
    }
  )

  // Hub -> client: pull family roster + shared artifact metadata.
  app.get(
    '/sync/pull',
    async (req, reply): Promise<SyncPullResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }
      return {
        profiles: listProfiles(ctx.db),
        artifacts: listArtifacts(ctx.db),
        cursor: currentCursor(ctx.db)
      }
    }
  )
}
