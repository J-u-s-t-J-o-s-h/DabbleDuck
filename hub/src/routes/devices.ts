import type { FastifyInstance } from 'fastify'
import type {
  DevicesResponse,
  HubErrorResponse,
  PairRequest,
  PairResponse
} from '../../../src/shared/hubContract'
import { appendChange, insertDevice, listDevices } from '../db.ts'
import { authenticateDevice } from './auth.ts'
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

  // List paired devices for the family "Connected Devices" view. Token-gated,
  // and deliberately never exposes device tokens.
  app.get(
    '/devices',
    async (req, reply): Promise<DevicesResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }
      const devices = listDevices(ctx.db).map((d) => ({
        id: d.id,
        name: d.name,
        pairedAt: d.paired_at,
        lastSeen: d.last_seen
      }))
      return { devices }
    }
  )
}
