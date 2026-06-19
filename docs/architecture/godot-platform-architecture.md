# DabbleDuck Platform Architecture — Godot 4 Game Ecosystem

> **Status:** Design proposal (Phase 2 / Phase 3 planning). **No code in this document is built yet.**
> **Audience:** Project owner + future contributors.
> **Goal:** Move DabbleDuck from "an Electron app that contains games" to a **children's learning platform** that *launches* dedicated, production-quality games built in Godot 4, while owning all profiles, progress, achievements, and parental controls.

---

## 0. TL;DR

- **Keep DabbleDuck (Electron/React) as the platform shell**: launcher, profiles, parent controls, screen-time, achievements, progress, game library. It already does this well and has a clean, extensible data model.
- **Stop building games inside Electron.** Build each game as a **separate Godot 4 project** exporting native Windows/Linux executables.
- **Connect them with a versioned, file-based data contract** plus a small per-game Godot SDK (`DabbleSDK`). The launcher spawns the game, hands it a *launch context*, and the game writes back an *event log / results file*. The launcher remains the **single authoritative writer** of canonical profile/progress data.
- **Reuse the existing rule-based achievement engine** (`progressRules.ts` + `progressService.ts`) unchanged — games just emit semantic events; the launcher decides what badges they earn. This means a new game contributes to cross-game achievements *for free*.
- **Phase the migration**: the current React Mouse Maze stays as a proof-of-concept until the Godot version reaches parity.

---

## 1. Why Godot 4 is the correct choice

### 1.1 The problem with the current approach
The current Mouse Maze is a `<canvas>`-rendered React component (`src/renderer/components/games/MazeGame.tsx`) running inside the same renderer process as the launcher UI. It works as a prototype, but it has structural ceilings:

- **No real game engine services.** Sprite animation, particle systems, audio buses, physics, tilemaps, shaders, and a scene graph all have to be hand-rolled in canvas/JS. This is exactly the work an engine exists to remove.
- **Performance + asset ceiling.** Rich 2.5D, lighting, parallax, and particles in raw canvas will fight the React render loop and the Chromium compositor.
- **Coupling.** A game crash, memory leak, or heavy frame is in the *same process* as the parent dashboard and screen-time enforcement.
- **Asset pipeline.** There is no import/atlas/animation pipeline — assets are emoji/CSS/drawn shapes.

### 1.2 Why Godot specifically (vs. the alternatives)

| Concern | Godot 4 | Unity | Web (Phaser/Pixi/Three) | Construct/GameMaker |
|---|---|---|---|---|
| License / cost | **MIT, zero royalties, zero seats** | Per-seat / revenue terms, has shifted before | Free | Subscription |
| 2D + 2.5D quality | **Excellent** (TileMap, Light2D, GPUParticles2D, AnimatedSprite2D, shaders, parallax) | Excellent (heavier) | Good but DIY | Good, less control |
| Native Win/Linux export | **First-class, tiny binaries** | Yes (heavier runtime) | Needs a wrapper (we'd be back in Electron) | Limited Linux |
| Footprint per game | ~30–70 MB native | Hundreds of MB | n/a | Varies |
| Learning curve (kids' 2D) | **Low** (GDScript) + C# option | Medium/High | Medium | Low but ceiling'd |
| Offline, no telemetry | **Yes by default** | Needs care | Yes | Varies |
| Long-term openness | **Open source, no vendor lock-in** | Proprietary | Open | Proprietary |

**Conclusion:** For a *cozy, 2.5D, offline, child-safe, multi-title* portfolio that must run as native executables on Windows and Linux with no licensing exposure, Godot 4 is the best fit. It removes the engine work, gives us a real asset/animation pipeline, and isolates each game in its own process.

> ⚠️ **Stated honestly:** Adopting Godot adds a *second toolchain and language* (GDScript) and a cross-process integration boundary. The rest of this document is mostly about making that boundary safe and boring. The trade is worth it: the alternative is building a game engine inside Electron, which contradicts the stated goal ("DabbleDuck should NOT become a game engine").

> Recommended engine version: **Godot 4.x stable, GDScript primary** (C# only if a specific game needs it). Pin one Godot version across all games to keep export templates and the SDK consistent. *(The exact patch version and export-template behaviors should be validated on the build machine before committing — see §11 open questions.)*

---

## 2. System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DabbleDuck Launcher (Electron)                     │
│                                                                        │
│  React UI            Main process              Authoritative data      │
│  - Profiles          - Spawns game process     (single writer)         │
│  - Game library      - Watches event log       profiles.json           │
│  - Parent dash       - Reconciles progress     settings.json           │
│  - Progress/badges   - Enforces screen time    progress.json           │
│  - Screen time       - Rule engine (badges)    usage.json              │
└───────────┬───────────────────────────────────────────┬───────────────┘
            │ 1. write launch context (read-only snapshot)│ 4. read events,
            │    + spawn child process                    │    reconcile,
            ▼                                             │    award badges
   ┌────────────────────────┐                            │
   │   sessions/<id>/         │  ◄─────────────────────────┘
   │     launch.json   (RO to game)                         
   │     events.ndjson (append-only, written by game)       
   │     result.json   (final summary, written by game)     
   └───────────┬────────────┘                               
               │ 2. read launch context                      
               ▼                                             
   ┌────────────────────────┐                               
   │   Godot Game Process     │  3. play; append events       
   │   (mouse-maze.exe)       │     + write result on exit    
   │   + DabbleSDK autoload   │                               
   └────────────────────────┘                               
```

**Key principle — single authoritative writer:** the **launcher is the only process that writes** `profiles.json`, `progress.json`, `settings.json`, `usage.json`. Games never touch those files directly. Games only write inside their own `sessions/<id>/` sandbox (an append-only event log + a final result file). This honors the spirit of "shared local data files" while eliminating multi-process write corruption — the single biggest reliability risk in a file-based design.

---

## 3. How DabbleDuck and Godot communicate

### 3.1 Channels (hybrid, by reliability need)

| Need | Channel | Why |
|---|---|---|
| Launch context (who/what/limits) | **Command-line args + `launch.json`** | Simple, atomic, available at startup |
| Read-only profile/settings snapshot | **`launch.json`** (a copy, not the master) | Game never reads master files |
| Durable progress (badges, completions) | **`events.ndjson`** (append-only) + **`result.json`** | Crash-safe; survives a game crash |
| Real-time signals (optional v2) | **stdout line protocol** (`@DABBLE {json}`) | Live "time almost up" / live badge toasts |
| Launcher → game control (optional v2) | **stdin line protocol** or a `control.json` poll | "You have 2 minutes left", "please exit" |

For v1, **files + command-line args are enough**. stdout/stdin is a clean v2 upgrade for live feedback without changing the durable contract.

### 3.2 Launch sequence

1. Child taps a game in the library.
2. Launcher creates `sessions/<sessionId>/` and writes `launch.json` (profile snapshot, settings snapshot, remaining time budget, session id, data-contract version, locale).
3. Launcher spawns the game executable with args, e.g.:
   ```
   mouse-maze --dabble-session "<abs path to sessions/<id>>" --dabble-contract 1
   ```
4. Game's `DabbleSDK` reads `launch.json`, configures itself (which level to start, child name for narration, accessibility/time budget).
5. Game runs. As the child plays, it **appends** newline-delimited JSON events to `events.ndjson` and flushes.
6. On natural finish or exit-to-launcher, the game writes `result.json` and quits with exit code 0.
7. Launcher detects process exit (and/or watches `events.ndjson`), reconciles events into `progress.json` via the rule engine, updates the library, and returns the child to the game's "you did great" screen.

### 3.3 Process lifecycle & child-safety (critical)

This is the part most likely to bite us, so it is specified explicitly:

- **Screen-time keeps counting across the boundary.** While a game runs, the launcher continues to accrue `usage.secondsUsedToday` (the launcher owns the clock; the game cannot be trusted to). The launcher passes the *remaining budget* in `launch.json`, and (v2) can send a "time's up" control signal. On hard limit, the launcher **terminates the child process** and shows the existing `TimeLimitScreen`.
- **No escape hatch.** The game window must not give the child a path to the desktop. Options, in order of preference:
  1. Launcher hides itself, game runs **fullscreen borderless**; on game exit, launcher returns to foreground.
  2. (Kiosk mode) Launcher stays the top-level kiosk window; game is launched fullscreen and the launcher re-asserts focus/kiosk on the game's exit.
- **Crash resilience.** If the game crashes, `events.ndjson` already holds everything earned up to the last flush. The launcher reconciles whatever is there and shows a gentle "let's go back home" — never an error dialog.
- **Single instance.** Launcher refuses to spawn a second game while one is running.
- **Kiosk caveat (must validate):** spawning an external native process from an Electron kiosk window needs testing on Windows and Linux to ensure the child can't alt-tab/`Super`-key out of the game. See §11.

---

## 4. How progress will be shared

### 4.1 Reuse the existing model — do not redesign it

The current progress model is already well-suited to this and should be **kept as the canonical schema**:

- `ChildProgress` with open-keyed `completions`, `activityVisits`, and `modules` maps (`src/renderer/types/index.ts`).
- Pure mutation functions + a rule engine (`src/renderer/services/progressService.ts`).
- Per-game state already lives at `progress.modules[gameId]` (e.g. Mouse Maze's unlocked levels/best times), written via `setModuleState`.

Cross-process games slot into this *unchanged*: a Godot game is just another module that contributes `completions`, `modules[gameId]`, and badge-triggering events — exactly like the in-process React maze does today via `GameProps` (`onWin`, `saveModuleState`).

### 4.2 The Data Contract (versioned)

Define a small, explicitly-versioned contract shared by both sides. Conceptually:

**`launch.json` (launcher → game, read-only):**
```jsonc
{
  "contractVersion": 1,
  "sessionId": "2026-06-19T15-02-11_addie_maze",
  "game": { "id": "mouse-maze", "version": "1.0.0" },
  "profile": { "id": "addie", "name": "Addie", "age": 6, "color": "#FF8FB1", "icon": "🦊" },
  "settings": { "soundEnabled": true, "locale": "en-US", "reducedMotion": false },
  "session": { "remainingSeconds": 1140, "startedAt": "2026-06-19T15:02:11Z" },
  "moduleState": { /* progress.modules["mouse-maze"], or null on first play */ }
}
```

**`events.ndjson` (game → launcher, append-only, one JSON object per line):**
```jsonc
{"t":"2026-06-19T15:03:01Z","type":"activity.visit","activityId":"play"}
{"t":"2026-06-19T15:04:22Z","type":"completion","completionType":"games","amount":1}
{"t":"2026-06-19T15:04:22Z","type":"game.event","name":"maze.level.completed","data":{"level":1,"timeMs":18240}}
{"t":"2026-06-19T15:05:10Z","type":"module.state","state":{"unlockedLevel":2,"bestTimes":{"1":18240}}}
{"t":"2026-06-19T15:05:11Z","type":"badge.request","badge":{"id":"maze-first-cheese","label":"First Cheese!","icon":"🧀"}}
```

**`result.json` (game → launcher, final summary written on clean exit):**
```jsonc
{
  "contractVersion": 1,
  "sessionId": "...",
  "completedCleanly": true,
  "summary": { "completions": {"games": 1}, "moduleState": { "unlockedLevel": 2 } }
}
```

### 4.3 Reconciliation (launcher side)
The launcher reads the event log and applies each event through the existing service functions:
- `completion` → `recordCompletion(progress, type, amount)`
- `module.state` → `setModuleState(progress, gameId, state)`
- `activity.visit` → `recordActivityVisit(progress, activityId)`
- `badge.request` → `awardBadge(progress, badge)` (game-specific, declared in manifest)
- After applying, `applyRules` runs automatically (already happens inside `refresh`) so cross-game achievements are evaluated.

**Idempotency:** events carry the `sessionId`; the launcher records the last-reconciled session per game so a re-read never double-counts. Within a session, reconciliation replaces (not adds) `module.state` and treats `completion` events as the source of truth for that session.

> **Why event log instead of letting the game write `progress.json`?** Multiple processes writing the same JSON file = race conditions and corruption. The append-only log is crash-safe (partial last line is simply discarded), is trivially the "clearly defined interface" the brief asks for, and keeps the launcher as the single brain for rewards.

---

## 5. How achievements will work

**Keep the achievement brain in the launcher.** Today, badges/achievements are awarded by a data-driven rule list (`PROGRESS_RULES` in `src/renderer/data/progressRules.ts`) evaluated against `ChildProgress`. This stays the single source of truth.

Two kinds of rewards:

1. **Platform / cross-game achievements** — defined once in `progressRules.ts`, triggered by *any* game's events.
   - e.g. "Played 5 games" (`completions.games >= 5`), "3-day streak", "Explorer" (visited every section). A reading game and a maze game both push `completion` events; the rule engine doesn't care which game.
2. **Game-specific badges** — declared in each game's **manifest** (`game.json`) and *requested* by the game via a `badge.request` event. The launcher validates the request against the manifest's allow-list (a game can only grant badges it declared) and calls `awardBadge`.

This gives the best of both: a new game automatically participates in the platform-wide badge economy, *and* can ship its own themed badges without changing launcher code.

```
Game emits events ──► Launcher reconciles ──► progressService mutations
                                          └─► applyRules() evaluates PROGRESS_RULES
                                          └─► awardBadge() for declared game badges
                                          └─► progress.json updated, library + ProgressScreen refresh
```

---

## 6. How future games plug into the ecosystem

A new game is "installed" by dropping a folder that contains a **manifest + per-platform executables + assets**. Nothing in the launcher needs to change to add a game (the library becomes manifest-driven, replacing the hard-coded `GAMES` array in `registry.ts`).

**`game.json` (per game):**
```jsonc
{
  "id": "mouse-maze",
  "title": "Mouse Maze",
  "icon": "🐭",
  "description": "Help the mouse find the cheese in the tiny garden!",
  "version": "1.0.0",
  "contractVersion": 1,
  "section": "play",
  "ageRange": [3, 9],
  "executables": {
    "win32": "win/mouse-maze.exe",
    "linux": "linux/mouse-maze.x86_64"
  },
  "completionTypes": ["games"],
  "declaredBadges": [
    { "id": "maze-first-cheese", "label": "First Cheese!", "icon": "🧀" },
    { "id": "maze-speedy", "label": "Speedy Mouse", "icon": "⚡" }
  ]
}
```

**Launcher game-discovery flow:**
1. On startup, scan `resources/games/*/game.json`.
2. Build the library from manifests (icon, title, description, age filter, allowed-activity gating via `settings.allowedActivities`).
3. On launch, pick the executable for the current OS, create the session, spawn, reconcile.

The current in-process `GameProps` contract (`onWin`, `onExit`, `moduleState`, `saveModuleState`) is the *exact same shape* as the cross-process contract — just delivered over files instead of function calls. That symmetry means the migration is conceptually a transport swap, not a redesign.

---

## 7. Recommended project structure

Recommend a **monorepo** (everything versioned together, one place to reason about the contract). Multi-repo is possible later but adds release-coordination overhead that isn't worth it early.

```
DabbleDuck/
├── launcher/                      # current Electron app moves here (was repo root)
│   ├── src/main/                  # spawns games, watches sessions, reconciles
│   │   ├── gameLauncher.ts        # NEW: spawn process, session dir, lifecycle
│   │   └── gameReconciler.ts      # NEW: read events.ndjson → progressService
│   ├── src/renderer/              # existing React UI (library becomes manifest-driven)
│   └── package.json
│
├── games/
│   ├── mouse-maze/                # a standalone Godot 4 project
│   │   ├── project.godot
│   │   ├── game.json              # manifest (copied into build output)
│   │   ├── autoloads/
│   │   │   └── DabbleSDK.gd        # shared SDK (symlinked/copied from /shared)
│   │   ├── scenes/
│   │   │   ├── Main.tscn
│   │   │   ├── world/GardenMaze.tscn
│   │   │   ├── actors/Mouse.tscn
│   │   │   ├── collectibles/Cheese.tscn
│   │   │   └── ui/ (HUD, win celebration)
│   │   ├── scripts/
│   │   ├── assets/
│   │   │   ├── art/  audio/  fonts/  shaders/
│   │   └── export_presets.cfg
│   └── reading-adventures/        # future game, same structure
│
├── shared/
│   ├── contract/                  # the single source of truth for the data contract
│   │   ├── contract.schema.json   # JSON Schema for launch/events/result
│   │   ├── contract.ts            # TS types (imported by launcher)
│   │   └── DabbleSDK.gd           # GDScript SDK (imported by every game)
│   ├── brand/                     # palette, fonts, logo, design tokens
│   └── assets-shared/             # optional shared art/audio/particles
│
├── tools/
│   ├── build-games.sh             # headless Godot exports → launcher/resources/games
│   └── new-game.sh                # scaffold a new Godot game from a template
│
├── docs/
│   └── architecture/godot-platform-architecture.md   # this document
│
└── data/ (runtime, gitignored)    # dev-only mirror; production lives in userData
```

**Inside a Godot game**, follow Godot conventions: one scene per concern, `snake_case` files, `DabbleSDK` as an **autoload (singleton)** so any scene can call `DabbleSDK.emit_completion("games")` or `DabbleSDK.finish()`.

### 7.1 The `DabbleSDK.gd` autoload (the game-side interface)
A ~150-line GDScript singleton that every game includes. Responsibilities:
- Parse `--dabble-session` / `--dabble-contract` args; load `launch.json`.
- Expose typed getters: `profile_name()`, `age()`, `sound_enabled()`, `reduced_motion()`, `remaining_seconds()`, `module_state()`.
- Buffered, flushed appenders: `emit_visit()`, `emit_completion(type, amount)`, `emit_game_event(name, data)`, `save_module_state(dict)`, `request_badge(id, label, icon)`.
- `finish(summary)` → writes `result.json`, then `get_tree().quit()`.
- Dev fallback: if launched without a session (developer running the game directly in the Godot editor), use a local stub `launch.json` so games are independently runnable/testable.

This keeps every game's integration to a handful of one-line calls and makes the contract impossible to get subtly wrong per-game.

---

## 8. Recommended asset strategy

### 8.1 Visual target: "2.5D cozy storybook"
For the Tiny Garden Maze references (PBS Kids / LeapFrog / Animal Crossing / cozy), recommend **stylized 2D with depth cues** rather than full 3D:

- **TileMap-based terrain** (grass, paths) with autotiling for organic edges.
- **Layered parallax** backgrounds (sky, distant hedges, mid-ground, foreground grass) for the 2.5D feel.
- **`Light2D` + normal maps + soft shadows** for gentle depth and a warm, lit-from-above garden glow.
- **`AnimatedSprite2D` / `AnimationPlayer`** for the mouse character: idle breathing, walk hop/squash, ear/tail wiggle, happy victory dance (mirrors what the current canvas maze fakes, but real).
- **`GPUParticles2D`** for sparkles on the cheese, footstep dust, celebration confetti, floating pollen/fireflies for ambience.
- **Shaders** (small): cheese glow/pulse, water shimmer, vignette.
- **Sound design**: ambient garden loop, footstep variations, cheese "shimmer", win fanfare, gentle UI sounds — all via Godot audio buses with a master toggle honoring `settings.soundEnabled`.

> Full 3D-orthographic is an option later for specific titles, but 2D-with-depth gets the cozy look faster, exports tiny, and runs on low-end school hardware. Recommend starting there.

### 8.2 Sourcing & pipeline
- **Prototype** with permissively-licensed packs (e.g. Kenney.nl, cozy itch.io packs) to validate feel **before** commissioning final art. Track licenses in `shared/brand/LICENSES.md`.
- **Final art**: commission or create a consistent set (Aseprite for illustrated sprites; vector for UI). One artist/style guide across titles for brand cohesion.
- **Import discipline**: texture atlases per scene, consistent pixel-per-unit, `snake_case` asset names, lossless source kept out of the exported build, audio as `.ogg`.
- **Shared design tokens** in `shared/brand/` (palette, type scale, logo, mascot) so games and launcher feel like one product.
- **Accessibility**: honor `reduced_motion` (tone down particles/shake), large hit targets, no fail states, optional narration of the child's name from `launch.json`.

---

## 9. Recommended deployment strategy (Windows & Linux)

### 9.1 Packaging model: bundle games inside the launcher (v1)
For an offline, child-safe product, **ship games bundled with the launcher** (no per-game download/installer for the child). electron-builder copies the platform's game binaries into the app via `extraResources`, so at runtime the launcher finds them at a stable path (`process.resourcesPath/games/<id>/...`).

- **Windows:** keep the existing NSIS installer (`build.win.target: "nsis"` already configured in `package.json`). Game `.exe` + `.pck` ship inside resources.
- **Linux:** add an **AppImage** (and optionally `.deb`) electron-builder target. Ensure the bundled Godot `*.x86_64` binaries are marked executable at build/install time (Linux file-permission gotcha — handle in the build script and verify at first launch).

> Later option (v2+): a content-pack model where games are downloadable add-ons, with signature verification. Not needed for the initial portfolio and adds complexity (update server, integrity checks). Defer.

### 9.2 Build pipeline
```
1. Build each Godot game headless, per platform:
     godot --headless --export-release "Windows Desktop" build/win/<id>.exe
     godot --headless --export-release "Linux/X11"      build/linux/<id>.x86_64
2. Copy build/<platform>/* + game.json  ->  launcher/resources/games/<id>/<platform>/
3. Build launcher:  npm run build  (electron-vite)
4. Package:         electron-builder --win        (NSIS)
                    electron-builder --linux       (AppImage/deb)
   electron-builder picks up resources/games via extraResources.
```
- A `tools/build-games.sh` orchestrates steps 1–2; CI runs the full chain.
- **Pin one Godot version** + matching export templates in CI for reproducibility.
- **Signing:** plan Windows code-signing (avoids SmartScreen warnings for parents installing it) and note Linux AppImage is unsigned by convention. *(Signing certs/process is an open logistics item, not a blocker for internal builds.)*
- **Versioning:** each `game.json` carries its own `version`; the launcher displays it and uses it for `result.json` provenance.

---

## 10. Phased migration plan

| Phase | Outcome | Notes |
|---|---|---|
| **1 (done/keep)** | Current React Mouse Maze stays as proof-of-concept | No deletion until Godot parity. Validates gameplay + progress integration. |
| **2 — Foundations** | Build the **contract + SDK + launcher plumbing** with a *trivial* Godot "hello" game | De-risks the boundary before investing in art. Deliverables: `gameLauncher.ts`, `gameReconciler.ts`, `DabbleSDK.gd`, manifest-driven library, schema. |
| **3 — Mouse Maze (Godot)** | First production-quality title: Tiny Garden Maze | Built on the proven plumbing. Ships bundled. |
| **4 — Second title** | e.g. Reading Adventures | Proves "drop-in game" claim end to end. |
| **5 — Polish** | Live stdout signals, signing, Linux AppImage hardening, kiosk validation | |

**Recommended first concrete step (Phase 2):** stand up the data contract + a 1-screen Godot test game that emits one `completion` event and exits, and make the launcher spawn it, reconcile it, and show a new badge. That single vertical slice validates ~80% of the architectural risk for a few days of work and *no art*.

---

## 11. Risks & open questions (stated explicitly)

1. **Kiosk + external process containment** — *highest risk.* Must verify on real Windows and Linux that a child cannot alt-tab / `Super`-key / hotcorner out of a spawned fullscreen Godot window while the launcher is in kiosk mode. May require launcher-side focus re-assertion and OS-level assigned-access on Windows. **Needs a spike before relying on it.**
2. **Screen-time enforcement across processes** — the launcher must reliably terminate a running game at the hard limit and reconcile partial progress. Straightforward but must be tested (including ungraceful kill).
3. **Godot version / export-template specifics** — recommendations here are based on Godot 4.x capabilities; exact CLI flags, preset names, and Linux permission behavior should be validated on the build machine. Not yet run/verified locally.
4. **Repo restructure** — moving the current root Electron app into `launcher/` touches build config (`electron.vite.config.ts`, `package.json` paths, electron-builder `files`/`extraResources`). Low risk but needs care; do it as its own change.
5. **Asset cost/time** — production art is the long pole. Mitigate by prototyping with licensed packs and locking a style guide early.
6. **File watching reliability** — `fs.watch` can be flaky across platforms; prefer reconciling on process-exit (deterministic) and treat live watching as a v2 nicety.
7. **Data location** — production data stays in Electron `userData` (as today, see `src/main/storage.ts`); the `data/` folder in the repo is dev-only. Confirm games receive the session path explicitly rather than guessing the data dir.

---

## 12. What does *not* change

- The existing progress/achievement model (`types/index.ts`, `progressService.ts`, `progressRules.ts`) — reused as-is.
- Local-first, no cloud, no accounts, no telemetry.
- Parent PIN, screen-time, kiosk concepts (extended to cover spawned games, not replaced).
- The principle that **DabbleDuck is the platform, not the engine.**

---

### Appendix A — Mapping current in-process contract → cross-process contract

| Today (`GameProps`, in React) | Tomorrow (Godot via `DabbleSDK`) |
|---|---|
| `onWin(): EarnedReward[]` | append `completion` event → launcher reconciles + returns rewards via library refresh |
| `onExit()` | `DabbleSDK.finish()` → write `result.json`, quit; launcher foregrounds |
| `moduleState` (in) | `launch.json.moduleState` |
| `saveModuleState(state)` | `DabbleSDK.save_module_state(dict)` → `module.state` event |
| hard-coded `GAMES` registry | manifest discovery (`game.json`) |
| `audio` service (Web Audio) | Godot audio buses |
| canvas rendering | Godot scene tree + 2.5D pipeline |

The shapes line up deliberately: this is a **transport migration**, not a model redesign — which is the strongest evidence the current data architecture was designed well enough to carry the platform forward.
