import type { FastifyInstance } from 'fastify'
import {
  HUB_PROTOCOL_VERSION,
  type HubInfo
} from '../../../src/shared/hubContract'
import type { HubContext } from '../types/index.ts'

export function registerInfoRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  app.get('/hub/info', async (): Promise<HubInfo> => {
    return {
      hubId: ctx.hubId,
      name: ctx.config.hubName,
      version: ctx.version,
      protocolVersion: HUB_PROTOCOL_VERSION,
      time: new Date().toISOString()
    }
  })
}
