# DabbleDuck Asset Registry

Central record of **imported external assets** used in DabbleDuck games.  
Before adding assets: verify license, document here, and run the game-specific sync script.

---

## Mouse Maze 3D (`games/mouse-maze-3d/`)

| Asset name | Source URL | Creator | License | Where used | Attribution |
|------------|------------|---------|---------|------------|-------------|
| `Cheese_Singles.fbx` → `cheese_singles.fbx` | [Low Poly Food Pack (OpenGameArt)](https://opengameart.org/content/low-poly-food-pack) · [Quaternius](https://quaternius.com) | Quaternius | **CC0 1.0** | Cheese collectible goal | Optional: credit Quaternius |
| `Mushroom.fbx` → `mushroom.fbx` | Same food pack | Quaternius | **CC0 1.0** | Maze path decoration | Optional credit |
| `Broccoli.fbx` → `bush_broccoli.fbx` | Same food pack | Quaternius | **CC0 1.0** | Flower/bush decoration (scaled) | Optional credit |
| `Chick.fbx` → `mouse_chick.fbx` | [5 Low poly animals (OpenGameArt)](https://opengameart.org/content/5-low-poly-animals) | Quaternius | **CC0 1.0** | Player character (interim; gray-tinted & scaled) | Optional credit |
| `select_002.ogg` → `move.ogg` | [Kenney Interface Sounds (OpenGameArt)](https://opengameart.org/content/interface-sounds) | Kenney | **CC0 1.0** | Tile move SFX | Optional: [Kenney.nl](https://kenney.nl) |
| `confirmation_004.ogg` → `win.ogg` | Same Kenney pack | Kenney | **CC0 1.0** | Win celebration SFX | Optional credit |
| `pluck_001.ogg` → `sparkle.ogg` | Same Kenney pack | Kenney | **CC0 1.0** | Cheese pickup sparkle | Optional credit |
| `back_001.ogg` → `ambient.ogg` | Same Kenney pack | Kenney | **CC0 1.0** | Soft background loop | Optional credit |

### Procedural / engine (no external file)

The visual redesign builds all geometry procedurally for full control and to avoid
the FBX import artifacts seen earlier (untextured "yellow pole" meshes). The shipped
`*.fbx` files under `assets/characters` and `assets/environment` are currently **unused**
by the running game; only the Kenney CC0 audio is loaded. Procedural art is preferred
because the local CC0 packs contain **no mouse model** and FBX import was unreliable.

| Asset | Source | License | Where used |
|-------|--------|---------|------------|
| Player characters (mouse / bunny / turtle) | GDScript primitives (`mouse_player.gd`) | MIT / DabbleDuck | Selectable low-poly characters; chosen via the start picker |
| Character picker UI | GDScript (`character_select.gd`) | MIT / DabbleDuck | "Pick your friend!" start screen (emoji + name cards) |
| Cheese wedge goal | Procedural `ArrayMesh` wedge + holes (`cheese_goal.gd`) | MIT / DabbleDuck | Goal collectible |
| Leafy hedge walls, checkerboard grass, sandy paths | GDScript primitives (`maze_world.gd`) | MIT / DabbleDuck | Maze layout & ground |
| Flowers, mushrooms, pebbles, border bushes | GDScript primitives (`maze_world.gd`) | MIT / DabbleDuck | Path & border decoration |
| Flat material palette | `stylized_materials.gd` | MIT / DabbleDuck | Shared colors |
| Procedural sky | Godot `ProceduralSkyMaterial` | Engine | Background |
| Win UI confetti | GDScript particles | MIT / DabbleDuck | Celebration overlay |
| Background music | Procedural synth loop (`game_audio.gd`, `_music_stream`) | MIT / DabbleDuck | Gentle C-major pentatonic tune (no CC0 music in local packs) |
| Move squeak + wall bump | Procedural synth (`game_audio.gd`) | MIT / DabbleDuck | Cute mouse "eep" (pitch-varied) and soft hedge bump |
| Synth audio fallback | `game_audio.gd` | MIT / DabbleDuck | Used if sparkle/win OGG files missing |

### Usage rights summary

All imported assets above are **CC0** — free for personal, educational, and commercial use in DabbleDuck. Redistribution within the game bundle is permitted. No mandatory attribution; Kenney/Quaternius credit is appreciated.

### Sync / update

From repo root, after downloading packs into `tools/_kenney_download/`:

```bash
npm run assets:mouse-maze-3d
```

**First-time downloads (manual):**

1. [Quaternius Ultimate Food Pack](https://opengameart.org/content/low-poly-food-pack) → extract to `tools/_kenney_download/food3d/`
2. [Quaternius 5 Low Poly Animals](https://opengameart.org/content/5-low-poly-animals) → extract to `tools/_kenney_download/animals/`
3. [Kenney Interface Sounds](https://opengameart.org/content/interface-sounds) → extract to `tools/_kenney_download/audio/`

### Planned imports (not yet shipped)

| Asset | Recommended source | Notes |
|-------|-------------------|--------|
| **Rat / mouse character** | [Quaternius Rat (Poly Pizza, CC0)](https://poly.pizza/m/iltq5bVNaV) or [Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) | Replace interim `mouse_chick.fbx` |
| **Trees, rocks, flowers** | [Quaternius Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html) or [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | Replace procedural border trees |
| **Hedge wall blocks** | Kenney Nature Kit | Replace stacked box hedges |
| **Grass sway shader** | Godot community shader (verify license) | Optional polish |

---

## Adding new assets (checklist)

1. Confirm source is CC0, MIT, or otherwise permits commercial use and redistribution in games.
2. Save license text under `games/<game>/assets/licenses/`.
3. Copy only needed files into `games/<game>/assets/` (keep builds lightweight).
4. Add a row to this registry.
5. Run the game and `npm run verify:godot`.
