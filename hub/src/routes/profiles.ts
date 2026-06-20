import type { FastifyInstance } from 'fastify'
import type {
  HubErrorResponse,
  ProfilesResponse
} from '../../../src/shared/hubContract'
import { listProfiles } from '../db.ts'
import { authenticateDevice } from './auth.ts'
import type { HubContext } from '../types/index.ts'

export function registerProfileRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  app.get(
    '/profiles',
    async (req, reply): Promise<ProfilesResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }
      return { profiles: listProfiles(ctx.db) }
    }
  )
}
