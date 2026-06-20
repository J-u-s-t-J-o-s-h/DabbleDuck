# Godot game development on Windows

DabbleDuck launches Godot games as **separate processes**. Each game lives in
`games/<name>/` with a `game.json` manifest and a Godot project (`project.godot`).
The launcher hands the game a session folder; the game's `DabbleSDK` autoload
writes events back so progress, badges, and module state are reconciled when the
game exits.

## 1. Install Godot 4

**Recommended (Windows):**

```powershell
winget install GodotEngine.GodotEngine --accept-package-agreements --accept-source-agreements
```

This installs Godot 4.7 and adds `godot` to your PATH (via WinGet links).

Verify:

```powershell
npm run godot:path
godot --version
```

If DabbleDuck cannot find Godot when launched from the IDE, set an explicit path:

```powershell
[System.Environment]::SetEnvironmentVariable(
  'DABBLE_GODOT_BIN',
  "$env:LOCALAPPDATA\Microsoft\WinGet\Links\godot.exe",
  'User'
)
```

Restart your terminal and DabbleDuck after setting this.

## 2. Open the Mouse Maze 3D project

From the repo root:

```powershell
npm run godot:open
```

Or open Godot Hub / Godot Editor and import `games/mouse-maze-3d/project.godot`.

The project targets **Godot 4.7** (see `config/features` in `project.godot`).
Visual theme and asset licenses: [games/mouse-maze-3d/docs/art-direction.md](../games/mouse-maze-3d/docs/art-direction.md).

## 3. Run from the Godot editor (standalone dev)

Press **F5** in the editor. Without launcher args, `DabbleSDK` runs in standalone
dev mode (no session folder) and logs a warning — useful for scene/layout work.

To test the full contract from the editor, run the game with user args (Project →
Run with custom arguments is not always available; use the verify script instead).

## 4. Verify the launcher contract (headless)

Proves the Godot game writes the expected events and `result.json`:

```powershell
npm run verify:godot
```

All checks should pass.

## 5. Play from DabbleDuck

1. `npm run dev`
2. Select a child profile → **Play**
3. Choose a Godot game (e.g. **Mouse Maze 3D**, **Classic Snake**, **Slither Trail**)
4. The Godot window opens; when you finish and close the game, progress is saved

## 6. Create a new Godot game

1. Create `games/my-game/` with `project.godot` and `game.json`
2. Copy `games/mouse-maze-3d/autoloads/dabble_sdk.gd` into your project autoload
3. Set `runtime: "godot"` in `game.json` and a unique `id`
4. Add an entry to `EXTERNAL_GAMES` in
   `src/renderer/components/games/registry.ts`
5. Run `npm run verify:godot` (adapt or add a verify script for your game)

See `docs/architecture/godot-platform-architecture.md` for the full platform design.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `spawn godot ENOENT` | Install Godot (`winget` above) and restart DabbleDuck |
| Godot works in terminal but not in app | Set `DABBLE_GODOT_BIN` (see §1) |
| Game opens but no progress saved | Check `userData/sessions/` for events; run `verify:godot` |
| Wrong Godot version | Pin to 4.7 to match `project.godot` |
