import type { FastifyRequest } from 'fastify'
import { DEVICE_TOKEN_HEADER } from '../../../src/shared/hubContract'
import { getDeviceByToken, touchDevice, type DeviceRow } from '../db.ts'
import type { HubContext } from '../types/index.ts'

/**
 * Validate the device token header. Returns the device row when valid,
 * otherwise null. LAN-only Phase 1 security: a paired device presents the
 * token it received from /devices/pair.
 */
export function authenticateDevice(
  ctx: HubContext,
  req: FastifyRequest
): DeviceRow | null {
  const token = req.headers[DEVICE_TOKEN_HEADER]
  if (typeof token !== 'string' || token.length === 0) return null
  const device = getDeviceByToken(ctx.db, token)
  if (!device) return null
  touchDevice(ctx.db, device.id)
  return device
}
