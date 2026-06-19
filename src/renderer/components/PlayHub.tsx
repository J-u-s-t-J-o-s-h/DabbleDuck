import { useState } from 'react'
import { GAMES } from './games/registry'
import type { EarnedReward } from '../services/progressService'
import { audio } from '../services/audio'

interface PlayHubProps {
  /** Records a game completion in progress and returns any rewards earned. */
  onComplete: () => EarnedReward[]
  /** Read this game's persistent module state from the child's progress. */
  getModuleState: (gameId: string) => unknown
  /** Persist this game's module state to the child's progress. */
  saveModuleState: (gameId: string, state: unknown) => void
  /** Return to the child home screen. */
  onBack: () => void
}

/**
 * The Play section: a friendly menu of games. Selecting one launches it; the
 * game reports a win back through `onComplete` so progress is tracked, and can
 * persist its own per-game state via `saveModuleState`.
 */
export default function PlayHub({
  onComplete,
  getModuleState,
  saveModuleState,
  onBack
}: PlayHubProps): JSX.Element {
  const [activeGameId, setActiveGameId] = useState<string | null>(null)

  const activeGame = GAMES.find((g) => g.id === activeGameId)
  if (activeGame) {
    const GameComponent = activeGame.component
    return (
      <GameComponent
        onWin={onComplete}
        onExit={() => {
          audio.stopMusic()
          setActiveGameId(null)
        }}
        moduleState={getModuleState(activeGame.id)}
        saveModuleState={(state) => saveModuleState(activeGame.id, state)}
      />
    )
  }

  return (
    <div className="screen play-hub">
      <header className="activity-page__header">
        <span className="activity-page__icon" aria-hidden="true">
          🎲
        </span>
        <div>
          <h1 className="activity-page__title">Play</h1>
          <p className="activity-page__desc">Pick a game and have some fun!</p>
        </div>
      </header>

      <main className="play-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className="activity-card activity-card--play"
            type="button"
            onClick={() => {
              audio.unlock()
              audio.menu()
              setActiveGameId(game.id)
            }}
          >
            <span className="activity-card__icon" aria-hidden="true">
              {game.icon}
            </span>
            <span className="activity-card__title">{game.title}</span>
            <span className="activity-card__desc">{game.description}</span>
          </button>
        ))}
      </main>

      <footer className="activity-page__footer">
        <button className="big-button" type="button" onClick={onBack}>
          ← Back to Home
        </button>
      </footer>
    </div>
  )
}
