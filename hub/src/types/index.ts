import type { FastifyInstance } from 'fastify'
import type { HubConfig } from '../config'
import type { HubDb } from '../db'
import type { HubPaths } from '../storage/paths'

// Shared runtime context handed to every route registrar.
export interface HubContext {
  db: HubDb
  paths: HubPaths
  config: HubConfig
  hubId: string
  version: string
  /** Date.now() at process start, for uptime reporting. */
  startedAt: number
}

export type RouteRegistrar = (app: FastifyInstance, ctx: HubContext) => void
