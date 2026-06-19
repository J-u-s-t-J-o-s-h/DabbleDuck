import { useState } from 'react'
import { EXTERNAL_GAMES, GAMES } from './games/registry'
import type { EarnedReward } from '../services/progressService'
import type { GameLaunchResult } from '../types'
import { audio } from '../services/audio'

interface PlayHubProps {
  /** Records a game completion in progress and returns any rewards earned. */
  onComplete: () => EarnedReward[]
  /** Read this game's persistent module state from the child's progress. */
  getModuleState: (gameId: string) => unknown
  /** Persist this game's module state to the child's progress. */
  saveModuleState: (gameId: string, state: unknown) => void
  /** Launch a standalone (out-of-process) game and reconcile on return. */
  onLaunchExternalGame: (gameId: string) => Promise<GameLaunchResult>
  /** Return to the child home screen. */
  onBack: () => void
}

/** Phases of launching a standalone game. */
type ExternalState =
  | { status: 'idle' }
  | { status: 'launching'; gameId: string }
  | { status: 'done'; result: GameLaunchResult }

/**
 * The Play section: a friendly menu of games. In-process games render inline;
 * standalone games are launched as separate executables and report progress
 * back through the platform, which the launcher reconciles and celebrates here.
 */
export default function PlayHub({
  onComplete,
  getModuleState,
  saveModuleState,
  onLaunchExternalGame,
  onBack
}: PlayHubProps): JSX.Element {
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [external, setExternal] = useState<ExternalState>({ status: 'idle' })

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

  // While a standalone game runs, show a friendly "playing" screen.
  if (external.status === 'launching') {
    return (
      <div className="screen play-hub play-hub--launching">
        <div className="duck-mascot duck-mascot--lg" aria-hidden="true">
          🎮
        </div>
        <h1 className="activity-page__title">Playing…</h1>
        <p className="activity-page__desc">
          Your game is open. Come back here when you finish!
        </p>
      </div>
    )
  }

  // When a standalone game returns, celebrate any rewards and offer to return.
  if (external.status === 'done') {
    const { result } = external
    return (
      <div className="screen play-hub play-hub--celebrate">
        <header className="activity-page__header">
          <span className="activity-page__icon" aria-hidden="true">
            🎉
          </span>
          <div>
            <h1 className="activity-page__title">Great playing!</h1>
            <p className="activity-page__desc">
              {result.ok
                ? 'Your progress was saved.'
                : `We had trouble: ${result.error ?? 'unknown error'}`}
            </p>
          </div>
        </header>

        {result.newlyEarned.length > 0 && (
          <div className="celebration__rewards">
            {result.newlyEarned.map((reward) => (
              <span className="reward-chip reward-chip--new" key={reward.id}>
                <span aria-hidden="true">{reward.icon}</span> New {reward.kind}:{' '}
                {reward.label}!
              </span>
            ))}
          </div>
        )}

        <footer className="activity-page__footer">
          <button
            className="big-button"
            type="button"
            onClick={() => setExternal({ status: 'idle' })}
          >
            ← Back to Games
          </button>
        </footer>
      </div>
    )
  }

  const launchExternal = async (gameId: string): Promise<void> => {
    audio.unlock()
    audio.menu()
    setExternal({ status: 'launching', gameId })
    const result = await onLaunchExternalGame(gameId)
    if (result.ok && result.newlyEarned.length > 0) {
      audio.win()
    }
    setExternal({ status: 'done', result })
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

        {EXTERNAL_GAMES.map((game) => (
          <button
            key={`ext-${game.id}`}
            className="activity-card activity-card--play activity-card--external"
            type="button"
            onClick={() => {
              void launchExternal(game.id)
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
