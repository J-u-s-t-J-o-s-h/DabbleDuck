# DabbleDuck — Project Continuity Summary

> Engineering handoff document. Audience: a senior engineer or AI assistant with zero prior context. Goal: become productive immediately and avoid breaking stable architecture.
>
> Status legend: **[Implemented]** working & verified · **[Partial]** works but incomplete · **[Prototype]** proof-of-concept/placeholder · **[Planned]** intended, not built · **[Aspirational]** idea only, no code or design.
>
> Last verified against `main` @ commit `7290777` ("Remove the 2D Mouse Maze games"). Working tree clean at time of writing.

---

## 1. Executive Summary

**DabbleDuck** is a fullscreen, child-safe **launcher and digital clubhouse** for kids (README states ages 3–12; per-game age ranges currently span 3–10). It is an **Electron desktop app** that runs on top of Windows today (Zorin OS / Ubuntu support is planned/aspirational), turning an ordinary PC into a safe, playful, educational space.

- **What it is:** A parent-controlled launcher shell that presents large, friendly "activity" cards to a child, tracks long-term learning progress and screen time locally, and launches **standalone educational games** (Godot 4) as separate processes.
- **Target audience:** Young children (primary sweet spot ~4–7 based on current games) and their parents.
- **Core mission:** Give children a safe, encouraging, no-failure environment to learn and play, while giving parents simple screen-time controls and growth visibility — all **local-first** (no cloud, no accounts, no payments).
- **Product vision:** A "cozy digital clubhouse" (tone: PBS Kids + Nintendo Switch). DabbleDuck is the **ecosystem/launcher**; individual experiences (games, future modules) plug into it via a stable contract.
- **Current development stage:** Early MVP (`v0.1.0`). The launcher shell, local data/progress system, and the **cross-process game platform** are functional and verified. Three Godot games exist. The seven home-screen "activity" sections (Learn/Read/etc.) are still **placeholder pages**.

---

## 2. Product Vision

**Why it exists:** Parents want a screen their kids can use without exposure to the open OS, ads, app stores, or unsafe content — but most "kid modes" are either crippled or just content filters. DabbleDuck aims to be a *curated, growth-oriented* space: every session contributes to a persistent learning journey, framed positively.

**Educational goals:**
- Early learning through play (color/shape/letter/word/counting recognition is already implemented in Slither Trail).
- A **persistent learning environment** that remembers each child's journey (completions, badges, achievements, streaks, favorites, lifetime minutes, milestones) rather than just a timer.
- No-failure design: encouragement over punishment.

**Parent goals:**
- Simple, local screen-time limits (per-child daily minutes) with daily auto-reset and "grant more time" overrides.
- A growth dashboard (lifetime usage, completions, badges, streaks, most-used activities).
- A PIN-gated parent area and an optional kiosk/safety lockdown.

**Child experience goals:**
- Fullscreen, no desktop-style chrome; big tappable cards.
- Friendly mascot tone, celebratory feedback, gentle music/SFX.
- Touch- and keyboard-friendly.

**Explicit philosophy (current, confirmed by code & docs):**
- DabbleDuck **is a launcher and ecosystem** — it builds its library from per-game manifests and reconciles progress; adding a game needs no launcher code changes (only a registry entry for visibility).
- DabbleDuck **is NOT a game engine** — gameplay lives in **Godot 4** projects, run as separate processes. The launcher deliberately avoids hosting heavy game loops in its renderer.
- DabbleDuck **is NOT an operating system** — it's an app on top of Windows; "kiosk mode" is an app-level guard, explicitly *not* full OS lockdown.
- DabbleDuck **is a safe digital clubhouse** — local-first, no cloud/accounts/payments, PIN-gated parent controls, blocked external navigation/new windows.

---

## 3. Current Architecture

Two cleanly separated layers communicating over the **local filesystem**.

### Launcher Layer — Electron + React + TypeScript **[Implemented]**

- **Electron** main process (`src/main/`): window/kiosk management, IPC, local JSON storage, and **spawning + reconciling** standalone games.
- **React + TypeScript** renderer (`src/renderer/`): all UI (profile select, home, activities, Play hub, parent dashboard, progress screens), session/time-limit logic, and progress mutations.
- **Vite via electron-vite** for dev/build. **No database, no network.**

Responsibilities:
- **Profiles** — local child profiles (name, age, avatar color/icon, daily limit). [Implemented; UI add/remove not built — **[Partial]**]
- **Parent controls** — PIN gate (default `1234`), allowed-activity toggles, change PIN, kiosk toggle, grant time, reset today. [Implemented]
- **Screen time** — per-second usage ticking, per-day counters, daily reset, limit lock screen, overrides. [Implemented]
- **Achievements/badges + progress tracking** — data-driven rule engine; cross-game reconciliation. [Implemented]
- **Game launching** — manifest discovery, validation, process spawn, event/result reconciliation, safe focus return. [Implemented]
- **Local storage** — atomic JSON read/write in Electron `userData`, self-healing/seeding. [Implemented]

### Game Layer — Godot 4 **[Implemented for 3 games]**

- Each game is a standalone **Godot 4.7** project in `games/<id>/` with a `game.json` manifest and a `DabbleSDK` autoload.
- Responsibilities: all gameplay, environments, graphics, audio, educational mechanics, and game-specific logic/state.
- Renderer target: **GL Compatibility (OpenGL 3.3 / GLES3-class)** for old/budget hardware (explicit decision for Slither Trail & Classic Snake).

### How launcher and games communicate

**File-based, one-directional artifacts inside a per-session folder** (the single source of truth is `src/shared/gameContract.ts`, mirrored by hand in each game's `autoloads/dabble_sdk.gd`):

```
launcher --(launch.json)-->  game     (read-only launch context)
game     --(events.ndjson)--> launcher (append-only event log)
game     --(result.json)-->  launcher (final summary on clean exit)
```

- The launcher passes the session dir via CLI flags: `--dabble-session <dir> --dabble-contract 1`.
- Contract version is `1` (`CONTRACT_VERSION`).
- The launcher is the **single authoritative writer** of `progress.json`; games only *propose* changes via events.

---

## 4. Repository Overview

Monorepo: TypeScript/Electron launcher + Godot game projects + Node tooling.

```text
dabbleduck/
├── package.json                # scripts, deps, electron-builder config
├── electron.vite.config.ts     # build config (main/preload/renderer)
├── tsconfig.json / tsconfig.node.json
├── index.html                  # renderer entry HTML
├── README.md
├── src/
│   ├── shared/
│   │   └── gameContract.ts     # ⭐ SINGLE SOURCE OF TRUTH for launcher↔game contract
│   ├── main/                   # Electron main process
│   │   ├── main.ts             # window, kiosk, IPC handlers, launchGame() orchestration
│   │   ├── preload.ts          # contextBridge → window.dabble API
│   │   ├── storage.ts          # atomic local JSON (settings/profiles/usage/progress)
│   │   ├── gameSession.ts      # pure: build launch context, parse events/result, session ids
│   │   ├── gameLauncher.ts     # locate Godot, validate manifest, resolve spawn spec, spawn
│   │   └── gameReconciler.ts   # fold game events into ChildProgress
│   └── renderer/               # React UI
│       ├── App.tsx             # ⭐ screen router + session/time/progress orchestration
│       ├── main.tsx            # React entry
│       ├── styles.css          # theme
│       ├── components/
│       │   ├── ProfileSelector.tsx, HomeScreen.tsx, ActivityCard.tsx, ActivityPage.tsx
│       │   ├── ParentPinModal.tsx, ParentDashboard.tsx, ParentProgressPanel.tsx
│       │   ├── ProgressScreen.tsx, TimeLimitScreen.tsx, PlayHub.tsx
│       │   └── games/
│       │       ├── registry.ts # GAMES (in-app, now empty) + EXTERNAL_GAMES (Godot list)
│       │       └── types.ts    # GameProps for in-process React games
│       ├── services/
│       │   └── progressService.ts  # ⭐ pure long-term growth logic (also imported by main)
│       ├── data/
│       │   ├── defaultData.ts      # activities, default settings/profiles/progress, label maps
│       │   └── progressRules.ts    # ⭐ data-driven badge/achievement rules
│       └── types/
│           └── index.ts            # shared data shapes + DabbleApi (preload contract)
├── games/
│   ├── mouse-maze-3d/    # [Implemented] Godot 4 3D maze
│   ├── slither-trail/    # [Implemented] Godot 4 educational garden snake (5 levels)
│   ├── snake-classic/    # [Implemented] Godot 4 classic grid snake
│   └── mouse-maze-sim/   # [Prototype] Node "game" used as a contract test fixture (NOT in UI)
├── docs/
│   ├── architecture/godot-platform-architecture.md   # platform design rationale
│   ├── godot-development.md                           # Godot dev/run/verify guide
│   ├── assets/asset-registry.md                       # licensed-asset ledger
│   ├── games/slither-trail-design.md                  # Slither Trail design doc
│   └── project-continuity-summary.md                  # this document
└── tools/
    ├── verify-godot.mjs        # headless contract test for a Godot game (--game <id>)
    ├── verify-slice.ts         # contract test using the node mouse-maze-sim fixture
    ├── godot-screenshot.mjs    # render a Godot game to PNG for visual review
    ├── godot-resolve.mjs / godot-path.mjs / godot-open.mjs   # Godot binary helpers
    └── sync-mouse-maze-3d-assets.mjs                         # copy CC0 packs into game assets
```

Each Godot game folder follows: `project.godot`, `game.json`, `autoloads/dabble_sdk.gd`, `scenes/`, `scripts/`, `assets/` (with `licenses/`), and per-game `docs/`.

---

## 5. Current Features Implemented

| Feature | Status | Notes |
|---|---|---|
| Profile selection screen | **Implemented** | Lists local profiles; tap → personalized home. |
| Child profiles (data) | **Implemented** | Seeded "Addie" (7) and "Declan" (5). |
| Add/remove profiles from UI | **Partial → effectively Planned** | Limits editable in dashboard; create/delete via UI not built — edit `defaultData.ts`/`profiles.json`. |
| Child home screen (7 sections) | **Implemented** | Learn, Read, Create, Explore, Watch, Play, Code. |
| Activity pages (Learn/Read/etc.) | **Prototype** | Placeholder pages with an "I finished!" completion button; do **not** launch real apps/sites. |
| Parent Mode (PIN gate) | **Implemented** | Default PIN `1234` in `defaultData.ts`. |
| Parent dashboard | **Implemented** | View profiles/usage, edit limits, toggle activities, change PIN, grant time, reset today, kiosk toggle. |
| Parent progress dashboard | **Implemented** | `ParentProgressPanel.tsx` — lifetime usage, completions, badges, streaks, most-used. |
| Child progress screen | **Implemented** | `ProgressScreen.tsx` — celebratory badges/achievements/streaks/recent. |
| Screen-time tracking | **Implemented** | 1s tick, 15s flush, daily reset, lifetime minutes accrual. |
| Time-limit lock screen | **Implemented** | Friendly lock + parent override path. |
| Progress/growth system | **Implemented** | Open-ended schema + data-driven rule engine. |
| Achievements & badges | **Implemented** | In-app rules + game-requested declared badges. |
| Launcher UI / theme | **Implemented** | `styles.css`, large friendly cards. |
| Game launcher (cross-process) | **Implemented** | Manifest discovery, validation, spawn, reconcile, focus return. |
| Local-first storage | **Implemented** | Atomic writes, self-heal/seed. |
| Godot integration / `DabbleSDK` | **Implemented** | v1 contract; headless verify scripts. |
| In-process React game framework | **Implemented but unused** | `GAMES` registry + `GameProps` exist; list is currently **empty** (React Mouse Maze removed). |
| Kiosk / safety mode | **Partial** | App-level shortcut interception + PIN-to-exit; **not** OS-level lockdown. |
| Completed games | **Implemented (3)** | Mouse Maze 3D, Slither Trail, Classic Snake (all Godot). |
| Approved website/app launchers | **Planned** | On roadmap; not built. |
| Cloud sync / accounts / payments | **Not planned (explicitly out of scope for now)** | Local-first by design. |

---

## 6. Current Games

All current player-facing games are **Godot 4.7**, `runtime: "godot"`, `section: "play"`, `contractVersion: 1`, declared in `EXTERNAL_GAMES` (`registry.ts`).

### Mouse Maze 3D — `games/mouse-maze-3d/` (id `mouse-maze-3d`) **[Implemented]**
- **Purpose:** Cozy 3D garden maze; guide a character to the cheese. Age range `[3,9]`.
- **Gameplay:** Tilted bird's-eye orthographic 3D maze; arrow/WASD + on-screen D-pad; character faces last-pressed direction; **3 levels**; **character select** (mouse / bunny / turtle); win celebration; audio (procedural music + CC0 SFX).
- **Educational objective:** Spatial reasoning, directionality, planning (kid-friendly, no failure).
- **Implementation status:** Complete vertical slice. All 3D art is **procedural GDScript** (shipped FBX files exist but are currently **unused**; FBX import was unreliable). One declared badge: `maze-first-cheese`.
- **Integration status:** Full v1 contract; `npm run verify:godot` passes.
- **Known limitations:** Procedural art is interim (planned CC0 model swap). Colors can look slightly washed under bright lighting (a known tuning area; addressed in Classic Snake).

### Slither Trail — `games/slither-trail/` (id `slither-trail`) **[Implemented]**
- **Purpose:** Educational, cozy garden exploration inspired by Snake but "a DabbleDuck game first." Age range `[4,7]`.
- **Gameplay:** Auto-forward snake steered by WASD/arrows/pad; collect the *right* items to grow + score; **no enemies, no timers, no self-collision, no game-over**; wrong picks get gentle hints. **5 themed levels.**
- **Educational objective (per level/mode):** Color (collect green apples), Counting (collect 5 strawberries), Shape (collect circles), Letter (A→B→C in order), Word (spell C-A-T). HUD reinforces with pips/highlighted next letter. Data-driven via `scripts/levels.gd`.
- **Implementation status:** Complete 5-level slice; **all 3D art procedural**; audio = 2 Kenney CC0 sounds + procedural music/SFX. 6 declared badges (Snake Scout, Color Collector, Counting Champion, Shape Seeker, Letter Learner, Garden Explorer).
- **Integration status:** Full v1 contract; emits rich `module.state` metrics (plays, sessions, levelsCompleted, longestSnake, totalItems, objectivesCompleted). `npm run verify:godot:slither` passes.
- **Known limitations:** Lighting was tuned down after an initial overexposed look. Voice-over/narration, level-select map, free-explore, and snake customization are **planned** (design doc §8).

### Classic Snake — `games/snake-classic/` (id `snake-classic`) **[Implemented]**
- **Purpose:** A genuinely simple, classic grid Snake (created after Slither Trail was deemed "too complex" for the simplest case). Age range `[5,10]`.
- **Gameplay:** Grid movement with **smooth constant-velocity interpolation synced to the tick**; eat apples, grow, collide with walls/self → gentle "Oops, play again?" (no harsh game-over). **Snake color picker** (6 colors) and **difficulty selector** (Easy/Medium/Hard/Expert changing speed + acceleration). Choices persist in `module.state` (`color`, `difficulty`, `plays`, `highScore`).
- **Educational objective:** Minimal — reflexes, planning, cause/effect. Primarily a "fun" game.
- **Implementation status:** Complete. **All visuals procedural**; procedural audio + optional CC0 sounds. 3 declared badges (First Apple, Snake Snacker, Snake Star).
- **Integration status:** Full v1 contract; `npm run verify:godot:snake` passes.
- **Known limitations:** Color/difficulty pickers are GUI flows verified via static screenshots + headless contract (not click-through automation).

### Mouse Maze (sim) — `games/mouse-maze-sim/` (id `mouse-maze`) **[Prototype / test fixture]**
- **Purpose:** A `runtime: "node"` placeholder "game" (`game.mjs`) used by `tools/verify-slice.ts` to test the cross-process contract without Godot.
- **Status:** **Not** in `EXTERNAL_GAMES`, so it does **not** appear in the launcher UI. Keep it — it's infrastructure for contract testing.

> Removed: the original **2D Mouse Maze** existed in two forms (an in-renderer React canvas game and a 2D Godot prototype). Both were deleted in commit `7290777`.

---

## 7. Data Model

**Persistence = four JSON files** in Electron's `userData` dir (`storage.ts`). There is **no `achievements.json`** — achievements/badges are nested in `progress.json`. There **is** a `usage.json`.

| File | Owner/Writer | Contents | Update flow |
|---|---|---|---|
| `settings.json` | Launcher (main) | `parentPin`, `kioskMode`, `allowedActivities` map | Written on parent dashboard saves |
| `profiles.json` | Launcher (main) | Array of `Profile` | Seeded; edited via dashboard (limits) |
| `usage.json` | Launcher (renderer→main) | Per-profile daily usage (`UsageRecord`) | 1s tick in `App.tsx`, flushed every 15s + on exit; daily auto-reset |
| `progress.json` | Launcher (main is authoritative) | Per-profile `ChildProgress` (completions, badges, achievements, streaks, modules…) | Updated by in-app actions and by game reconciliation |

**Persistence model:** Local-first, atomic (`*.tmp` + rename), self-healing (missing/empty/corrupt → re-seed defaults). Per-OS-user isolation via `userData`.

**Ownership/flow:** The renderer reads all four at startup via `window.dabble.*` (preload bridge → IPC). The renderer mutates progress through the **pure** `progressService` functions and persists via IPC. For **games**, the **main process** is the sole authoritative writer of `progress.json` (renderer adopts the returned snapshot).

**Example schemas (from code):**

`Profile` and `Settings` (`src/renderer/types/index.ts`):
```ts
interface Profile {
  id: string; name: string; age: number;
  color: string; icon: string; dailyLimitMinutes: number;
}
interface Settings {
  parentPin: string; kioskMode: boolean;
  allowedActivities: Record<ActivityId, boolean>;
}
```

`UsageRecord`:
```ts
interface UsageRecord {
  date: string;                 // YYYY-MM-DD
  secondsUsedToday: number;
  activityCounts: Partial<Record<ActivityId, number>>;
  lastActiveDate: string;
  overrideDate?: string;        // today => limit overridden
}
```

`ChildProgress` (the heart of the growth system):
```ts
interface ChildProgress {
  profileId: string;
  completions: Record<string, number>;     // open-keyed: books, stories, games, ...
  activityVisits: Record<string, number>;  // open-keyed: learn, read, play, <gameId>...
  badges: Badge[];
  achievements: Achievement[];
  favoriteActivities: string[];            // derived (top 3)
  lastActivity: string | null;
  lifetimeMinutes: number;
  streak: { currentDays; longestDays; lastActiveDate; firstUseDate };
  modules: Record<string, unknown>;        // per-game/module state, e.g. modules["snake-classic"]
  schemaVersion: number;                   // currently 1
  createdAt: string; updatedAt: string;
}
```

The schema is **deliberately open-ended**: `completions`, `activityVisits`, and `modules` are string-keyed maps so new modules/games plug in **without a schema redesign**. `ensureProgress()` back-fills missing fields for forward/backward tolerance.

---

## 8. Achievement System

**Two complementary mechanisms**, both writing into `ChildProgress.badges` / `.achievements` (deduped by id, timestamped):

1. **Data-driven rule engine** (`src/renderer/data/progressRules.ts` + `applyRules()` in `progressService.ts`).
   - A `ProgressRule` is `{ id, kind: 'badge'|'achievement', label, description, icon, test(progress) => boolean }`.
   - After **any** progress mutation, `refresh()` recomputes favorites then runs `applyRules()`, granting any newly-qualified rewards once.
   - Current catalogue includes badges (Reader, Bookworm, Creator, Explorer, Coder, Scientist, Game On!) and achievements (First Steps, Storyteller, Master Builder, Curious Mind, Little Programmer, Game Champion, 3-Day/Week Streak).
   - **Add a reward = append one rule.** No engine/schema change.

2. **Game-requested declared badges** (allow-listed).
   - Each game's `game.json` lists `declaredBadges`. In-game the `DabbleSDK.request_badge(id,label,icon)` emits a `badge.request` event.
   - `gameReconciler.ts` grants a requested badge **only if it's in the manifest's `declaredBadges`** (security allow-list), then runs a final `applyRules()` sweep so cross-game rule badges (e.g. "Game On!", "Game Champion" from `games` completions) also fire.

**Award process for games:** game emits `completion` (type `games`) and/or `badge.request` → on exit, `reconcile()` folds events into progress (`recordCompletion`, `awardBadge`, etc.) → `applyRules()` final sweep → main saves `progress.json` → renderer celebrates `newlyEarned`.

**How future games should integrate:** declare badges in `game.json`; emit `activity.visit` (once, on start), `completion` for each meaningful finish, `module.state` for persistent per-game state, and `badge.request` for milestones. Reuse cross-game `games`-completion rules for "free" platform-wide achievements.

---

## 9. Launcher-to-Game Communication

The contract (`src/shared/gameContract.ts`, v1) + GDScript mirror (`autoloads/dabble_sdk.gd`).

**Flow (per `main.ts: launchGame()` + `gameLauncher.ts`):**

```
[Child taps a game card in PlayHub]
        │  window.dabble.launchGame({ gameId, profileId })  (IPC: 'game:launch')
        ▼
[main] findGameDir(gameId)  → read game.json (GameManifest)
[main] validateGameLaunch()  → Godot installed? project.godot present? (or node entry / native exe)
[main] makeSessionId() → userData/sessions/<ts>_<profile>_<game>/
[main] buildLaunchContext() → write launch.json (profile, settings snapshot,
        remainingSeconds, prior moduleState=progress.modules[gameId]); create empty events.ndjson
[main] resolveSpawnSpec() → spawn process:
        godot --path <gameDir> -- --dabble-session <dir> --dabble-contract 1
        ▼
[game] DabbleSDK reads launch.json; plays; appends events.ndjson lines:
        activity.visit · completion · game.event · module.state · badge.request
[game] on clean exit: writes result.json { completedCleanly, summary } then quits(0)
        ▼
[main] process 'close' → restoreLauncherFocus() (pull launcher back to foreground)
[main] read events.ndjson (tolerant parse) + result.json (optional)
[main] reconcile(baseChild, events, manifest) → updated ChildProgress + newlyEarned
[main] saveProgress(progress.json)  ← single authoritative writer
        ▼
[renderer] adopts returned progress; PlayHub shows "Great playing!" + celebrates rewards
```

**Key properties:**
- **Crash-safe:** if the game dies mid-write, `parseEvents()` skips the bad trailing line; reconciliation still happens from whatever events exist (result.json optional).
- **Isolation:** game runs in its own OS process/window — a game crash/leak can't take down the launcher or the parental controls.
- **`completedCleanly`** = `result.completedCleanly === true && exit.code === 0`.
- **Headless contract verification:** `--dabble-autowin` (or headless display) makes a game auto-emit a winning path and finish; `tools/verify-godot.mjs` asserts ≥4 events, an `activity.visit`, a `completion`, a declared badge, an object `module.state`, and `result.completedCleanly`.

**Event types** (game → launcher): `activity.visit{activityId}`, `completion{completionType, amount}`, `game.event{name, data?}` (analytics only, no progress effect yet), `module.state{state}` (replaces prior per-game state), `badge.request{badge}` (allow-listed).

---

## 10. Asset Pipeline

**Policy (from `docs/assets/asset-registry.md`):** Only use assets that are **CC0, MIT, or otherwise permit commercial use + redistribution in a bundled game.** For every imported asset: (1) verify license, (2) save license text under `games/<game>/assets/licenses/`, (3) copy only needed files into `games/<game>/assets/`, (4) **add a row to the asset registry**, (5) run the game + `npm run verify:godot`.

**Approved sources:** Kenney (CC0), Quaternius (CC0), Poly Pizza, OpenGameArt, Godot Asset Library, free itch.io packs.

**Current reality:**
- **All 3D art across all three games is currently procedural GDScript** (primitives + `ArrayMesh` + `Label3D`). This was a deliberate choice for reliability (FBX import artifacts), tiny bundle size, and guaranteed rendering on **GL Compatibility** for old/budget hardware.
- **Shipped external files in use:** only a few **Kenney CC0** `.ogg` sounds (e.g. `sparkle.ogg`, `win.ogg`, `move.ogg`, `ambient.ogg`). Mouse Maze 3D also ships some Quaternius **CC0** FBX models that are **currently unused** by the running game.
- **Audio fallback:** each game has a procedural synth fallback if CC0 OGGs are missing.
- **Sync tooling:** `npm run assets:mouse-maze-3d` copies downloaded packs from `tools/_kenney_download/` into the game's `assets/` (downloads are manual/one-time).
- **Registry requirement:** the asset registry is the mandatory ledger; nothing ships unlogged.

**Planned imports (not yet shipped):** Quaternius rat/mouse, nature kits (trees/rocks/flowers), Kenney Nature Kit hedges, optional grass shaders — all to replace interim procedural props once licenses are logged.

---

## 11. Art Direction

**Overall philosophy:** Stylized, cozy, rounded, storybook. Tone reference: PBS Kids / LeapFrog / Animal Crossing / Nintendo Switch. No-failure, encouraging.

### Launcher style **[Implemented]**
- Fullscreen, no desktop chrome; large friendly **activity cards** with emoji icons; warm palette (`#FFF7E0` background). Mascot is a 🦆 **emoji/CSS placeholder** pending a real logo.

### Game style **[Implemented]**
- **Stylized low-poly**, flat lightly-shaded materials, hand-made feel. Oversized, expressive characters (big eyes, rosy cheeks, idle bob, celebration hop). Living touches (butterflies by day, fireflies at night). Collectibles on pedestals with halos for visibility.

### 3D direction **[Implemented]**
- **Tilted bird's-eye orthographic camera** so the world reads as real 3D depth while "up = away" (intuitive for small children).
- **Warm, soft lighting** with gentle shadows; per-level palettes shift mood (sunny → flowery → lavender → forest → moonlit).
- **Renderer:** GL Compatibility (OpenGL 3.3 / GLES3-class); lightweight effects (small shadow maps, modest MSAA, no heavy post). Lighting must be tuned to avoid overexposure (a recurring tuning lesson).

**Educational-game inspiration / references guiding development:** PBS Kids, LeapFrog, Animal Crossing (cozy world), classic Snake/maze mechanics reframed as gentle exploration.

---

## 12. Technical Decisions

| Decision | Status | Reasoning |
|---|---|---|
| **Electron desktop app** (not web-only) | Implemented | Needs local FS, separate-process game spawning, fullscreen/kiosk, offline local-first — none clean in a pure browser. |
| **Godot 4 for games** (not in-renderer React) | Implemented | Real engine services (scene graph, audio, particles, 3D) vs hand-rolled canvas; process isolation from the launcher; proper asset pipeline. (See `docs/architecture/godot-platform-architecture.md`.) |
| **File-based cross-process contract (v1)** | Implemented | Simple, language-agnostic, crash-tolerant (append-only log + optional result), unit-testable without Electron/Godot. |
| **Launcher = single authoritative progress writer** | Implemented | Games only propose via events → prevents corruption, enables cross-game reward rules and a manifest allow-list for badges. |
| **Local-first JSON storage** (no DB/cloud) | Implemented | Privacy, simplicity, offline; child data never leaves the device; atomic writes + self-heal. |
| **Open-ended progress schema + data-driven rules** | Implemented | Future modules plug in without schema/engine changes. |
| **Manifest-driven game library** | Implemented | Adding a game = drop a folder with `game.json` (+ a registry entry for UI visibility); no launcher core changes. |
| **GL Compatibility renderer + procedural art** | Implemented | Runs on old Dell/budget mini PCs; tiny bundles; avoids unreliable model imports. |
| **Child-safe shell** (blocked nav/new windows, PIN gate, kiosk guard) | Implemented/Partial | Practical safety on Windows; full OS lockdown is out of scope (app-level only). |
| **DabbleSDK mirrored by hand from `gameContract.ts`** | Implemented (with risk) | No shared codegen between TS and GDScript; see Risks. |

---

## 13. Current Roadmap

### Completed **[Implemented]**
- Electron + React launcher shell; profile select; 7-section home.
- Local-first storage (4 JSON files), atomic + self-healing.
- Screen-time tracking, daily reset, limit lock, overrides.
- Long-term progress/growth system + data-driven badges/achievements + dashboards.
- Cross-process game platform (contract v1, spawn, reconcile, safe focus return, headless verify).
- Three Godot games: Mouse Maze 3D, Slither Trail (5 educational levels), Classic Snake (color + difficulty).

### In Progress / Recently active
- Game polish & UX tuning (lighting, movement smoothing, pickers) — Classic Snake most recent.
- Documentation upkeep (some README/architecture sections still reference removed 2D Mouse Maze; see Risks).

### Planned **[Planned]** (README "Future roadmap")
- Approved **website launcher** and **local app launcher** (the Watch/Explore/etc. sections currently placeholder).
- Real content behind the 7 activity sections (AI story companion, drawing canvas, reading tracker).
- Profile add/remove from the UI.
- Robust kiosk provisioning (Windows assigned access).
- Parent analytics expansion.

### Optional Family Hub **[Implemented — Phase 1 foundation]**
- A separate, optional Node/TypeScript LAN service lives in `hub/` (isolated
  package; not part of the Electron build). It stores metadata in SQLite (via
  Node's built-in `node:sqlite` — no native build) and creation artifacts as
  files. Foundational API: `/health`, `/hub/info`, `/devices/pair`, `/profiles`,
  `/sync/push`, `/sync/pull`, `/artifacts`, `/artifacts/:id`.
- Launcher integration: optional `settings.hub` block, `src/main/hubClient.ts`
  (failure-safe), IPC (`hub:test/pair/sync`), and a "Family Hub (optional)" card
  in the Parent Dashboard. Manual IP/port connection; discovery is deferred.
- Shared types extracted to `src/shared/dataModel.ts` (pure data model,
  re-exported by `src/renderer/types`) and `src/shared/hubContract.ts` (wire DTOs).
- **The Hub is optional**: disabled by default; local play is unaffected when it
  is off/unreachable. Multiplayer is explicitly out of scope. See
  `docs/architecture/dabbleduck-hub-architecture.md` and `docs/hub-development.md`.

### Long-term vision **[Aspirational]**
- Zorin OS / Ubuntu kiosk deployment.
- Family gallery, family timeline, and creation persistence (next milestone, Hub-backed).
- Duck mascot animation/branding.
- A broader catalogue of educational modules + games plugging into the same contract.

---

## 14. Known Risks

**Technical risks**
- **TS↔GDScript contract drift:** `gameContract.ts` and each game's `dabble_sdk.gd` are kept in sync **by hand**. A change on one side silently breaks games. Mitigation today: `verify:godot*` headless checks — but there's no shared codegen.
- **Godot dependency for dev:** games run via an installed Godot binary (`runtime: "godot"` is DEV-only). Production intends `runtime: "native"` exported executables (per-platform), which are **not built yet**. `validateGameLaunch` already handles this, but the native build/packaging pipeline is unproven.
- **Procedural-art ceiling:** good enough for slices but visually limited; lighting/exposure is finicky on GL Compatibility.
- **GUI flows verified only indirectly:** color/difficulty pickers etc. are checked via screenshots + headless contract, not click-through automation.

**Architecture risks**
- **Documentation drift:** README's "Features (v0.1 MVP)" still describes the **removed** React Mouse Maze (4 themed levels, canvas), and the project-structure tree lists deleted files. The architecture doc still uses `mouse-maze` as illustrative ids. New engineers may be misled — treat code as truth.
- **No automated test suite** beyond the contract/slice verifiers and typecheck/build; no renderer/unit tests.
- **Security is intentionally light:** single local PIN (default `1234`, stored in plaintext JSON), no encryption; kiosk is app-level only (not OS lockdown). Acceptable for current stage; not a hardened deployment.

**Scalability concerns**
- Library discovery scans `games/` and parses every `game.json` on each launch — fine for a handful of games, not optimized for hundreds.
- `progress.json`/`usage.json` are whole-file reads/writes per save — fine locally at small scale.

**Unanswered questions / assumptions**
- Production runtime for games (native export vs. bundling Godot) is **assumed** but not implemented.
- Target age band is stated as 3–12 (README) but current games target ~3–10; the precise primary audience is somewhat open.
- Multi-device sync is now addressed by the optional Hub, which extends (rather than
  replaces) the authoritative-writer model: the launcher stays authoritative for its
  own local store and *proposes* snapshots to the Hub, which aggregates shared family
  data. Phase 1 sync is non-destructive (push + read-only pull); richer per-device
  merge and incremental/cursor sync are planned later.

---

## 15. Future Game Backlog

> **Important honesty note:** Only **Mouse Maze 3D**, **Slither Trail**, and **Classic Snake** exist in the repo. The other titles below have **no code and no design docs** anywhere in the project — they are **[Aspirational]** ideas included here per the handoff request. Concept/objective descriptions for unbuilt titles are inferred from their names and should be treated as suggestions, not commitments.

| Game | Status | Concept (existing) / Inferred concept (aspirational) | Educational objective |
|---|---|---|---|
| **Mouse Maze (3D)** | **Implemented** | 3D garden maze, character select, 3 levels | Spatial reasoning, directionality |
| **Slither Trail** | **Implemented** | Cozy garden collecting; 5 educational levels | Color, counting, shape, letter, word |
| **Classic Snake** | **Implemented** (not in original list, but present) | Classic grid Snake; color + difficulty pickers | Reflexes, planning |
| **Puzzle Pond** | **Aspirational** | (Inferred) pond-themed puzzle game | (Inferred) logic / problem-solving |
| **Firefly Finder** | **Aspirational** | (Inferred) find/collect fireflies at night | (Inferred) attention, counting |
| **Burrow Builder** | **Aspirational** | (Inferred) build/dig burrows | (Inferred) planning, construction/STEM |
| **Story Path** | **Aspirational** | (Inferred) branching interactive story | (Inferred) reading, sequencing, choice |
| **Explorer Trails** | **Aspirational** | (Inferred) exploration/discovery trails | (Inferred) discovery, geography/nature |
| **Rocket Workshop** | **Aspirational** | (Inferred) build/launch rockets | (Inferred) STEM, cause/effect |
| **Doodle Pond** | **Aspirational** | (Inferred) drawing/creative canvas | (Inferred) creativity (ties to "Create" + roadmap drawing canvas) |

Any of these would be built as a new `games/<id>/` Godot project speaking contract v1 — no launcher core changes required.

---

## 16. Development Environment

**Operating systems:** Developed on **Windows** (PowerShell; note: the bundled shell rejects `&&` — use `;` or separate commands). Code paths exist for macOS (simple-fullscreen handling) and Linux (AppImage target), but Windows is the primary/tested target.

**Tooling & versions (from `package.json`):**
- Node.js 18+ (built/tested with 22+), npm 9+.
- Electron `^33`, electron-vite `^2.3`, electron-builder `^25`.
- React `^18.3`, TypeScript `^5.6`, Vite `^5.4`, tsx `^4`.
- **Godot 4.7** (optional, for game dev): `winget install GodotEngine.GodotEngine`. SDK resolves the binary via `DABBLE_GODOT_BIN`, common install paths, or PATH.

**Repository setup / common commands:**
```bash
npm install
npm run dev            # Vite dev server + Electron (hot reload); seeds default data on first run
npm run typecheck      # tsc for renderer + node configs
npm run build          # electron-vite build → ./out (main, preload, renderer)
npm run build:win      # build + electron-builder Windows NSIS installer → ./release
# Godot
npm run godot:path     # show detected Godot binary
npm run godot:open     # open games/mouse-maze-3d in the editor
npm run verify:godot           # headless contract test (default mouse-maze-3d)
npm run verify:godot:slither   # contract test for slither-trail
npm run verify:godot:snake     # contract test for snake-classic
npm run verify:slice           # contract test via the node mouse-maze-sim fixture
# Visual review (renders a game to PNG)
node tools/godot-screenshot.mjs .verify-tmp/out.png --game <id> [--level N] [--steps K] ...
```

**Build process notes:** `electron-builder` packages `out/**` and copies `games/**` as `extraResources` (so games ship with the app). Runtime locates `games/` via app path, `__dirname`, or `process.resourcesPath` (`resolveGamesRoot()`).

**Godot requirements:** `runtime: "godot"` is **dev-only** and needs a local Godot 4.7. Production is intended to use `runtime: "native"` exported per-platform executables (not yet built).

**Data reset:** delete the JSON files in `userData` (`%APPDATA%/dabbleduck` on Windows) to re-seed defaults.

---

## 17. Current Git Status

- **Repository:** `https://github.com/J-u-s-t-J-o-s-h/DabbleDuck.git`
- **Active branch:** `main` (clean working tree; up to date with `origin/main` at time of writing).
- **`main` is a protected push target** — pushes require explicit human approval in this workflow.
- **Recent major commits (newest first):**
  - `7290777` Remove the 2D Mouse Maze games (deleted React `MazeGame` + 2D Godot prototype; cleaned CSS/docs).
  - `d10bc0d` Add Slither Trail and Classic Snake games (+ game-agnostic tooling, registry entries).
  - `c7c4ffc` Fix safe return to launcher after a game exits.
  - `e1a2bae` Add Mouse Maze 3D game with character select and 3 levels.
  - `d1fb74f` Fix Godot Mouse Maze sizing and swap to Kenney CC0 sprites.
  - `79a62a0` Polish Godot Mouse Maze visuals, audio, and win celebration.
  - `fb899a0` Add Mouse Maze art direction doc and garden asset pack.
  - `3b9bf5f` Enable Godot 4 development on Windows and harden local storage.
- **State of development:** Active. Platform + 3 games complete; current work is game polish and (pending) documentation cleanup.

---

## 18. Recommendations For The Next Engineer

**Understand first (in this order):**
1. `src/shared/gameContract.ts` — the contract everything orbits.
2. `src/main/main.ts` (`launchGame()`) + `gameLauncher.ts` + `gameReconciler.ts` — the cross-process platform.
3. `src/renderer/services/progressService.ts` + `data/progressRules.ts` — the growth/reward engine (pure functions; reused by both renderer and main).
4. `src/renderer/App.tsx` — session/time/progress orchestration and screen routing.
5. One game end-to-end, e.g. `games/snake-classic/` (`game.json`, `autoloads/dabble_sdk.gd`, `scenes/main.gd`).

**Treat as STABLE — change with care:**
- The **v1 file contract** and the **launcher-as-authoritative-writer** model. Any change must update **both** `gameContract.ts` and every `dabble_sdk.gd`, bump `CONTRACT_VERSION`, and keep `verify:godot*` green.
- The **open-ended progress schema** and **data-driven rule engine** — extend by appending rules/keys, don't restructure.
- The **manifest-driven library** + **declared-badge allow-list** (security boundary).
- The **pure** nature of `progressService` (no side effects) — relied on by both processes and the tests.

**Still EVOLVING — expect change:**
- **Production game packaging** (`runtime: "native"` exports) — unproven; likely the biggest near-term build effort.
- **Game visuals/art** — currently procedural; a CC0 model pass is planned (follow the asset-registry process).
- **The 7 activity sections** — placeholders; real modules (reading tracker, drawing, AI stories, web/app launchers) are the main product frontier.
- **Kiosk hardening** and **profile management UI**.

**Areas needing attention:**
- **Fix doc drift:** README "Features"/structure and the architecture doc still reference the removed 2D Mouse Maze and deleted files. Align docs with code to prevent confusion.
- **Add automated tests** beyond contract verifiers (renderer logic, progress service edge cases).
- **Consider shared contract codegen** (or at least a contract conformance test) to kill TS↔GDScript drift.
- **Windows shell quirk:** use `;` not `&&` in PowerShell commands.

**Golden rules:**
- Games **propose**, the launcher **decides** — never let a game write `progress.json` directly.
- Adding a game should require **no launcher core changes** — only a `games/<id>/` folder and an `EXTERNAL_GAMES` entry for UI visibility.
- Keep it **local-first, no-failure, child-safe**.
