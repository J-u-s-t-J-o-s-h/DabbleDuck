import type { ComponentType } from 'react'
import type { GameProps } from './types'
import MazeGame from './MazeGame'

/** Metadata + component for a single playable game. */
export interface GameDef {
  id: string
  title: string
  icon: string
  description: string
  component: ComponentType<GameProps>
}

/**
 * The catalogue of in-process (React) games shown in the Play hub. These run
 * inside the launcher and are the Phase 1 proof-of-concept.
 */
export const GAMES: GameDef[] = [
  {
    id: 'maze',
    title: 'Mouse Maze',
    icon: '🐭',
    description: 'Use the arrow keys to help the mouse find the cheese!',
    component: MazeGame
  }
]

/** Metadata for a standalone (out-of-process) game launched by the platform. */
export interface ExternalGameDef {
  /** Must match the `id` in the game's `game.json` manifest. */
  id: string
  title: string
  icon: string
  description: string
}

/**
 * Standalone games launched as separate executables (Godot dev projects or
 * exported native builds). The launcher discovers the manifest by `id`; this
 * list drives what appears in the Play library.
 */
export const EXTERNAL_GAMES: ExternalGameDef[] = [
  {
    id: 'mouse-maze-godot',
    title: 'Mouse Maze (Godot)',
    icon: '🎮',
    description: 'The Godot 4 version — edit in the engine, play from DabbleDuck!'
  }
]
