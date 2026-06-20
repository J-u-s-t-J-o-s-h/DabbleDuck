import type { FastifyInstance } from 'fastify'
import type {
  ArtifactGetResponse,
  ArtifactMeta,
  ArtifactUploadRequest,
  ArtifactUploadResponse,
  HubErrorResponse
} from '../../../src/shared/hubContract'
import { appendChange, getArtifact, insertArtifact } from '../db.ts'
import {
  artifactFileName,
  hashContent,
  readArtifactFile,
  writeArtifactFile
} from '../storage/artifactStore.ts'
import { authenticateDevice } from './auth.ts'
import { log } from '../log.ts'
import type { HubContext } from '../types/index.ts'

export function registerArtifactRoutes(
  app: FastifyInstance,
  ctx: HubContext
): void {
  // Upload a creation. v1 carries the bytes as base64 in JSON; the file is
  // written to disk and only its metadata is stored in SQLite.
  app.post(
    '/artifacts',
    async (req, reply): Promise<ArtifactUploadResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }

      const body = req.body as Partial<ArtifactUploadRequest> | undefined
      const meta = body?.meta
      const contentBase64 = body?.contentBase64

      if (!meta || typeof contentBase64 !== 'string') {
        reply.code(400)
        return { ok: false, error: 'meta and contentBase64 are required' }
      }
      if (
        !meta.id ||
        !meta.profileId ||
        !meta.type ||
        !meta.title ||
        !meta.source
      ) {
        reply.code(400)
        return {
          ok: false,
          error: 'meta requires id, profileId, type, title, source'
        }
      }

      const buffer = Buffer.from(contentBase64, 'base64')
      const contentHash = hashContent(buffer)
      const mimeType = meta.mimeType ?? 'application/octet-stream'
      const fileName = artifactFileName(meta.id, contentHash, mimeType)

      writeArtifactFile(ctx.paths.artifactsDir, fileName, buffer)

      const fullMeta: ArtifactMeta = {
        id: meta.id,
        profileId: meta.profileId,
        type: meta.type,
        title: meta.title,
        contentHash,
        mimeType,
        fileName,
        size: buffer.length,
        createdAt: meta.createdAt ?? new Date().toISOString(),
        source: meta.source,
        deletedAt: null
      }

      insertArtifact(ctx.db, fullMeta)
      appendChange(ctx.db, 'artifact.add', fullMeta.id, device.id)
      log.info(
        `Artifact stored: ${fullMeta.id} (${fullMeta.type}, ${fullMeta.size} bytes)`
      )

      return { ok: true, meta: fullMeta }
    }
  )

  // Fetch a stored creation (metadata + content as base64).
  app.get(
    '/artifacts/:id',
    async (req, reply): Promise<ArtifactGetResponse | HubErrorResponse> => {
      const device = authenticateDevice(ctx, req)
      if (!device) {
        reply.code(401)
        return { ok: false, error: 'Unpaired or invalid device token' }
      }

      const { id } = req.params as { id: string }
      const meta = getArtifact(ctx.db, id)
      if (!meta || meta.deletedAt) {
        reply.code(404)
        return { ok: false, error: 'Artifact not found' }
      }

      const buffer = readArtifactFile(ctx.paths.artifactsDir, meta.fileName)
      if (!buffer) {
        reply.code(404)
        return { ok: false, error: 'Artifact file missing on disk' }
      }

      return { meta, contentBase64: buffer.toString('base64') }
    }
  )
}
