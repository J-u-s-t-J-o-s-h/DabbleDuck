import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Artifacts (creations) are stored as plain files on disk; SQLite holds only
// metadata. Files are named by id + a short content hash, which is the seam
// for future immutable, content-addressed, de-duplicated storage.

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/json': '.json',
  'text/plain': '.txt'
}

export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[mime] ?? '.bin'
}

export function hashContent(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function newArtifactId(): string {
  return randomUUID()
}

export function artifactFileName(
  id: string,
  contentHash: string,
  mime: string
): string {
  return `${id}-${contentHash.slice(0, 12)}${extensionForMime(mime)}`
}

export function writeArtifactFile(
  artifactsDir: string,
  fileName: string,
  buffer: Buffer
): void {
  writeFileSync(join(artifactsDir, fileName), buffer)
}

export function readArtifactFile(
  artifactsDir: string,
  fileName: string
): Buffer | null {
  const path = join(artifactsDir, fileName)
  if (!existsSync(path)) return null
  return readFileSync(path)
}
