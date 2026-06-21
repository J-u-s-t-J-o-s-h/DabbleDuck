import type { ComponentType } from 'react'
import type { GameProps } from './types'
import RobotBuilder from './RobotBuilder'

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
 * inside the launcher (no external runtime needed).
 */
export const GAMES: GameDef[] = [
  {
    id: 'robot-builder',
    title: 'Robot Builder',
    icon: '🤖',
    description:
      'Build your own robot, then walk it around the playground to collect bolts!',
    component: RobotBuilder
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
    id: 'snake-classic',
    title: 'Classic Snake',
    icon: '🍎',
    description: 'A simple, classic snake game — eat the apples and grow!'
  },
  {
    id: 'slither-trail',
    title: 'Slither Trail',
    icon: '🐍',
    description:
      'Explore a cozy storybook garden with a friendly snake and learn colors, counting, shapes, and letters!'
  },
  {
    id: 'mouse-maze-3d',
    title: 'Mouse Maze 3D',
    icon: '🌿',
    description: 'A cozy 3D garden maze — guide the mouse to the cheese!'
  }
]
