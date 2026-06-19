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
 * The catalogue of games shown in the Play hub. Add a new game by building a
 * component that implements `GameProps` and appending an entry here.
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
