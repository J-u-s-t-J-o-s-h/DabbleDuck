import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

// Tiny dependency-free logger: writes to the console and, once configured, to
// a daily file under the Hub's logs directory.

let logFilePath: string | null = null

export function setLogDir(logsDir: string): void {
  const day = new Date().toISOString().slice(0, 10)
  logFilePath = join(logsDir, `hub-${day}.log`)
}

type Level = 'INFO' | 'WARN' | 'ERROR'

function write(level: Level, message: string): void {
  const line = `${new Date().toISOString()} [${level}] ${message}`
  if (level === 'ERROR') {
    console.error(line)
  } else {
    console.log(line)
  }
  if (logFilePath) {
    try {
      appendFileSync(logFilePath, `${line}\n`)
    } catch {
      // Never let logging failures crash the Hub.
    }
  }
}

export const log = {
  info: (message: string): void => write('INFO', message),
  warn: (message: string): void => write('WARN', message),
  error: (message: string): void => write('ERROR', message)
}
