import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '../../../src/shared/hubContract'
import type { HubContext } from '../types/index.ts'

export function registerHealthRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  app.get('/health', async (): Promise<HealthResponse> => {
    return {
      ok: true,
      uptimeSeconds: Math.floor((Date.now() - ctx.startedAt) / 1000),
      time: new Date().toISOString()
    }
  })
}
