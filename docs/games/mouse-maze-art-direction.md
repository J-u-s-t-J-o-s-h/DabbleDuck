# Mouse Maze (Godot) — Art Direction

## Visual theme

**Tiny Garden Maze** — a cozy 2.5D storybook hedge maze in a sunny garden. The
player helps a small mouse find cheese among soft grass paths, leafy hedge walls,
flowers, and mushrooms. The mood is warm, safe, and rewarding (PBS Kids /
educational mini-game quality direction, original art only).

## Color palette

| Role | Hex | Usage |
|------|-----|--------|
| Sky wash | `#B8DF9A` | Parallax background, ambient fill |
| Grass light | `#8FD06B` | Path tiles (fallback) |
| Grass deep | `#6AB04C` | Ground base |
| Hedge dark | `#227A3F` | Wall depth / shadows |
| Hedge mid | `#3F9A3F` | Hedge walls |
| Dirt path | `#D8A86A` | Optional path accents |
| Cheese gold | `#F6C945` | Goal highlight |
| Warm white | `#FFF7E0` | UI text, sparkles |
| Shadow | `rgba(20,40,25,0.22)` | Character / wall depth |

## Asset sources & licenses

| Asset | File | Source | License |
|-------|------|--------|---------|
| Grass floor tile | `environment/grass_floor.png` | Generated for DabbleDuck (same as React maze) | CC0 / project-owned |
| Hedge wall tile | `environment/hedge_wall.png` | Generated for DabbleDuck | CC0 / project-owned |
| Mouse character | `characters/mouse.png` | Kenney Tiny Creatures (tile_0178) | CC0 |
| Cheese goal | `characters/cheese.png` | Kenney Food Expansion (tile_0058) | CC0 |
| Floor / walls | `environment/dungeon_tilemap.png` | Kenney Tiny Dungeon atlas | CC0 |
| Decorations | `environment/deco_*.png` | Kenney Tiny Creatures | CC0 |
| UI / SFX | synthesized in `scripts/game_audio.gd` | Procedural (no external files) | MIT / project-owned |

**Do not** ship Nintendo, Disney, PBS, or LeapFrog copyrighted assets. Kenney
CC0 packs are recommended for future SFX/music additions (`assets/audio/`).

## Folder structure

```
games/mouse-maze/assets/
├── characters/     # mouse, cheese sprites
├── environment/    # floor, walls, decorations
├── ui/             # win banners (future)
├── audio/          # optional OGG/WAV (Kenney CC0); synth used by default
└── effects/        # particle textures (future)

games/mouse-maze/scripts/
├── maze_renderer.gd
├── mouse_character.gd
├── cheese_goal.gd
├── win_celebration.gd
└── game_audio.gd
```

## Presentation

- **Camera:** `Camera2D`, slight zoom (~1.15), smooth follow for larger mazes.
- **Depth:** layered sprites, parallax sky, `CanvasModulate` warm tint, drop shadows.
- **Cheese:** bob animation, `PointLight2D` glow, sparkle particles.
- **Win:** confetti particles, friendly label, mouse victory bounce.
- **Audio:** soft synth SFX + ambient loop; muted when `DabbleSDK.sound_enabled()` is false.

## Future improvements

- Sprite sheet walk cycle for the mouse (2–4 frames).
- Kenney Interface Sounds (CC0) as optional `assets/audio/*.ogg`.
- TileMap layers with autotiling for larger procedural mazes.
- Seasonal themes (forest, castle) reusing DabbleDuck React asset set.
- Export-optimized PNG compression (~512px tiles) for faster load on mini PCs.

## Performance notes

- Reuse one `Texture2D` per tile type (no per-cell duplicates in VRAM logic).
- Particle counts kept low (&lt; 80) for budget hardware.
- 2D only — no 3D scenes.
