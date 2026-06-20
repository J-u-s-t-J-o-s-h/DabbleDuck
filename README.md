# DabbleDuck 🦆

**DabbleDuck** is a fullscreen, child-safe launcher and digital clubhouse for kids
ages 3–12. It turns an ordinary computer into a safe, playful, educational space
where children can learn, read, create, explore, watch approved content, play, and
code — while parents get simple screen-time controls and usage tracking.

DabbleDuck is **not** an operating system. It is an app that runs on top of Windows
today (with Zorin OS / Ubuntu support planned for the future).

> Tone: playful, safe, curious, friendly, imaginative.
> Feel: modern PBS Kids + Nintendo Switch + cozy digital clubhouse.

---

## Features (v0.1 MVP)

- **Fullscreen launcher** with large, friendly activity cards — no desktop-style UI.
- **Child profiles** (sample profiles: Addie and Declan) with name, age, avatar
  color/icon, daily screen-time limit, and usage stats.
- **Profile selection screen** on launch; tapping a profile opens a personalized home.
- **Child home screen** with seven sections: Learn, Read, Create, Explore, Watch,
  Play, Code.
- **Games** (in the Play section): the first full game is **Mouse Maze** — a polished,
  replayable maze adventure:
  - **Four themed, unlockable levels** of growing size/difficulty: Tiny Garden,
    Forest Trail, Castle, and Moonlight. Finishing a level unlocks the next.
  - **Textured, illustrated environments** (canvas-rendered tiles, decorations,
    shadows, and ambient lighting) rather than flat shapes.
  - **A lovable, animated mouse** with idle breathing, a walking hop/squash, smooth
    tile-to-tile gliding, and a happy victory dance.
  - **Rewarding goal feedback**: confetti, a celebratory "You found the cheese!"
    card, sound effects, and a cheese/score bump — no failure or "game over" screens.
  - **Gentle background music + sound effects**, all synthesized with the Web Audio
    API (no audio files to download/license) and toggleable with the 🔊 button.
  - **Controls**: arrow keys, WASD, and an on-screen D-pad (touch-friendly).
  - **Progress integration**: mazes completed, total cheeses, levels completed, and
    best times per level persist into the child's profile via the game's module state
    (`progress.modules`). Each win also records a `games` completion for badges.
  New games drop into a simple registry (`src/renderer/components/games/registry.ts`)
  and persist their own stats through `moduleState` / `saveModuleState`.
- **Activity pages** with title, friendly description, placeholder content, and a
  "Back to Home" button.
- **Parent Mode** protected by a local PIN (default `1234`).
- **Parent dashboard** to view profiles and usage, edit daily limits, toggle allowed
  activities, change the PIN, grant more time, reset today, and toggle kiosk mode.
- **Screen-time tracking** stored locally per profile (seconds used today, activity
  counts, last active date) with automatic daily reset.
- **Long-term progress & growth tracking** (`progress.json`): a persistent learning
  environment that remembers each child's journey — completions, badges,
  achievements, streaks, favorite activities, lifetime usage, and milestones. See
  [Progress & growth system](#progress--growth-system).
- **Child Progress Screen** ("Great job, Addie!") with a celebratory, non-competitive
  view of badges, achievements, streaks, and recent accomplishments.
- **Parent Progress Dashboard** showing lifetime usage, completions, badges,
  achievements, streaks, favorites, most-used activities, and learning milestones.
- **Friendly time-limit lock screen** ("DabbleDuck is resting for today.") with a
  parent override.
- **Kiosk / safety mode** (off by default) for fullscreen lockdown and PIN-to-exit.
- **Local-first JSON storage** in Electron's `userData` directory. No cloud, no
  accounts, no payments.

---

## Tech stack

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) via [electron-vite](https://electron-vite.org/)
- Local JSON storage (no database, no cloud)

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (built and tested with Node 22+)
- npm 9+
- **Optional — Godot game development:** [Godot 4.7](https://godotengine.org/) for
  building standalone games in `games/`. On Windows:
  `winget install GodotEngine.GodotEngine`. Full guide:
  [docs/godot-development.md](docs/godot-development.md).

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts the Vite dev server and launches Electron with hot reloading.
On first launch, DabbleDuck seeds default data (settings, the Addie and Declan
profiles, and empty usage).

### Type-check

```bash
npm run typecheck
```

### Build for Windows

```bash
npm run build      # compile main, preload, and renderer into ./out
npm run build:win  # build + package a Windows installer via electron-builder
```

The packaged installer is written to the `release/` directory.

### Godot games (optional)

```bash
npm run godot:path    # show detected Godot executable
npm run godot:open    # open games/mouse-maze-3d in the Godot editor
npm run verify:godot  # headless contract test (no GUI)
```

In DabbleDuck: **Play** lists the standalone Godot games (Mouse Maze 3D, Classic
Snake, Slither Trail). See [docs/godot-development.md](docs/godot-development.md).

---

## Kiosk mode

Kiosk mode is **off by default** (`kioskMode: false`). You can toggle it from the
**Parent Dashboard → Safety** section, which updates `settings.json` and applies the
change live.

When kiosk mode is on, DabbleDuck:

- launches fullscreen in locked kiosk mode,
- hides the application menu bar,
- intercepts common quit/refresh shortcuts (`Ctrl+W`, `Ctrl+Q`, `Ctrl+R`, `Alt+F4`,
  `F11`) where possible,
- requires the parent PIN to exit the app.

> Note: This is a practical, app-level guard for Windows development. It is **not** a
> guarantee of full OS-level lockdown. Robust kiosk provisioning (assigned access,
> locked-down user accounts, etc.) is on the roadmap.

To change the default, edit `parentPin` / `kioskMode` defaults in
[`src/renderer/data/defaultData.ts`](src/renderer/data/defaultData.ts), or delete the
stored `settings.json` to re-seed defaults.

---

## Family Hub (optional)

DabbleDuck can **optionally** connect to a **DabbleDuck Hub** — a small server you
run on one always-on machine on your home network (e.g. a parent's PC). The Hub
backs up and shares profiles, progress, and creations across the family's
devices, with **no cloud and no internet required**.

The Hub is an **enhancement, never a requirement**: with it disabled (the
default) or offline, DabbleDuck behaves exactly as a standalone local-first
launcher.

- Run the Hub: see [`hub/README.md`](hub/README.md).
- Connect a launcher: **Parent Mode → Family Hub (optional)** → enable, enter the
  Hub's IP/port, **Test connection**, **Pair device**, then **Sync now**.
- Design + development: [docs/architecture/dabbleduck-hub-architecture.md](docs/architecture/dabbleduck-hub-architecture.md)
  and [docs/hub-development.md](docs/hub-development.md).

> Current status: **Phase 1 foundation** — the Hub service, storage, foundational
> API, and launcher connection/sync settings. Family gallery, family timeline,
> creation persistence, and incremental sync are planned next. Multiplayer is
> intentionally out of scope.

---

## Where data is stored

DabbleDuck stores three JSON files in Electron's per-user `userData` directory:

| File            | Contents                                                       |
| --------------- | -------------------------------------------------------------- |
| `settings.json` | Parent PIN, kiosk flag, allowed-activity toggles               |
| `profiles.json` | Child profiles                                                 |
| `usage.json`    | Per-profile daily usage and activity counts (resets daily)     |
| `progress.json` | Per-profile long-term growth: completions, badges, streaks ... |

Typical locations:

- **Windows:** `%APPDATA%/dabbleduck`
- **macOS:** `~/Library/Application Support/dabbleduck`
- **Linux:** `~/.config/dabbleduck`

Deleting these files resets DabbleDuck to its default seeded state.

---

## Project structure

```text
dabbleduck/
├── package.json
├── index.html
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── README.md
└── src/
    ├── main/
    │   ├── main.ts        # Electron main process, window + kiosk + IPC
    │   ├── preload.ts     # contextBridge API exposed to the renderer
    │   └── storage.ts     # Local JSON read/write in userData
    └── renderer/
        ├── App.tsx        # Screen router + session, time-limit & progress logic
        ├── main.tsx       # React entry point
        ├── styles.css     # Playful theme
        ├── components/
        │   ├── ProfileSelector.tsx
        │   ├── HomeScreen.tsx
        │   ├── ActivityCard.tsx
        │   ├── ActivityPage.tsx
        │   ├── ParentPinModal.tsx
        │   ├── ParentDashboard.tsx
        │   ├── ParentProgressPanel.tsx   # Parent-facing growth analytics
        │   ├── ProgressScreen.tsx        # Celebratory child progress view
        │   └── TimeLimitScreen.tsx
        ├── services/
        │   └── progressService.ts        # Long-term growth logic
        ├── data/
        │   ├── defaultData.ts
        │   └── progressRules.ts          # Data-driven badge/achievement rules
        └── types/
            └── index.ts
```

---

## Progress & growth system

DabbleDuck is designed to be a **persistent learning environment**, not just a
screen-time tracker. Each child's long-term journey is stored in `progress.json`.

### What is tracked per child

- **Completions** (open-ended categories): books, stories, learning activities,
  creative projects, coding activities, discoveries, and any future type.
- **Badges** and **Achievements** earned (with timestamps).
- **Favorite activities** (derived from lifetime visit counts).
- **Last activity** used.
- **Streaks**: current and longest consecutive-day streaks.
- **Lifetime usage** in minutes.
- **First use date** and **last active date**.
- **`modules`**: an open bucket for future module-specific state.

### Extensible by design

The schema avoids hard-coding activity/completion types. `completions`,
`activityVisits`, and `modules` are all open string-keyed maps, so future modules
(AI stories, reading tracker, educational games, coding lessons, drawing activities,
learning paths, custom achievements) can plug in **without a schema redesign**.

Rewards are awarded by a **data-driven rule engine**
([`progressRules.ts`](src/renderer/data/progressRules.ts)). Adding a new badge or
achievement is just appending a rule with a `test(progress)` predicate. The
[`progressService`](src/renderer/services/progressService.ts) exposes pure functions
for completions, visits, streaks, favorites, lifetime minutes, rule evaluation, and
direct `awardBadge` / `awardAchievement` / `setModuleState` hooks for future modules.

> Note: completions are recorded in v0.1 via an "I finished!" button on each activity
> page (activities are still placeholders). Real modules will record completions
> through the same `progressService` API.

---

## Current MVP limitations

- Activities open **internal placeholder pages**; they do not launch real apps or
  websites yet.
- No cloud sync, no user accounts, no payments.
- Security is intentionally light: a single local parent PIN, no encryption.
- Kiosk mode is an app-level guard, not full OS lockdown.
- Profiles can be edited (limits) and viewed in the dashboard, but adding/removing
  profiles from the UI is not yet implemented (edit
  [`defaultData.ts`](src/renderer/data/defaultData.ts) or `profiles.json` directly).
- The duck mascot is an emoji/CSS placeholder pending a real logo.

---

## Future roadmap

- Approved website launcher
- Approved local app launcher
- Zorin OS / Ubuntu kiosk setup
- AI story companion
- Drawing canvas
- Reading tracker
- Educational games
- Parent analytics
- Multiple device sync (via the optional **Family Hub** — Phase 1 foundation shipped)
- Family gallery & family timeline (Hub-backed)
- Child achievements
- Duck mascot animation

---

Made with care for curious kids. 🦆
