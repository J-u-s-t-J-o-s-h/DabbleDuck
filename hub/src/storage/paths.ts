import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Resolves and creates the Hub data directory layout:
//
//   dabbleduck-hub-data/
//   ├── hub.sqlite     (metadata only)
//   ├── blobs/         (reserved for future content-addressed blobs)
//   ├── artifacts/     (creation files: artwork, stories, screenshots, ...)
//   ├── backups/       (reserved for future automatic backups)
//   └── logs/          (startup + runtime logs)

export interface HubPaths {
  dataDir: string
  dbFile: string
  blobsDir: string
  artifactsDir: string
  backupsDir: string
  logsDir: string
}

export function ensurePaths(dataDir: string): HubPaths {
  const paths: HubPaths = {
    dataDir,
    dbFile: join(dataDir, 'hub.sqlite'),
    blobsDir: join(dataDir, 'blobs'),
    artifactsDir: join(dataDir, 'artifacts'),
    backupsDir: join(dataDir, 'backups'),
    logsDir: join(dataDir, 'logs')
  }
  for (const dir of [
    paths.dataDir,
    paths.blobsDir,
    paths.artifactsDir,
    paths.backupsDir,
    paths.logsDir
  ]) {
    mkdirSync(dir, { recursive: true })
  }
  return paths
}
