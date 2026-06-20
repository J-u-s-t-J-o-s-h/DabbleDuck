import type { FastifyInstance } from 'fastify'
import type {
  HubErrorResponse,
  PairRequest,
  PairResponse
} from '../../../src/shared/hubContract'
import { appendChange, insertDevice } from '../db.ts'
import { log } from '../log.ts'
import type { HubContext } from '../types/index.ts'

export function registerDeviceRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  app.post(
    '/devices/pair',
    async (req, reply): Promise<PairResponse | HubErrorResponse> => {
      const body = req.body as Partial<PairRequest> | undefined
      const deviceName = body?.deviceName?.trim()

      if (!deviceName) {
        reply.code(400)
        return { ok: false, error: 'deviceName is required' }
      }

      // If the Hub is configured with a pairing code, require a match.
      if (ctx.config.pairingCode) {
        if (body?.pairingCode !== ctx.config.pairingCode) {
          reply.code(403)
          return { ok: false, error: 'Invalid or missing pairing code' }
        }
      }

      const device = insertDevice(ctx.db, deviceName)
      appendChange(ctx.db, 'device.pair', device.id, device.id)
      log.info(`Paired device "${deviceName}" (${device.id})`)

      return {
        deviceId: device.id,
        deviceToken: device.token,
        hubId: ctx.hubId
      }
    }
  )
}
