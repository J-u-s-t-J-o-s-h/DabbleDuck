# Mouse Maze 3D — Art Direction

## Visual direction

**Tiny Garden Maze (3D)** — a stylized low-poly diorama with soft grass, rounded hedge
walls, dirt paths, and warm sunlight. Cozy, colorful, child-safe — readable shapes,
playful motion, no realism and no scary elements.

Inspired by the *feel* of educational mini-games and toy dioramas. **External CC0
assets are encouraged** when they improve quality; see
[docs/assets/asset-registry.md](../../docs/assets/asset-registry.md).

## Shipped assets (v0.1 vertical slice)

| Role | Asset | Source |
|------|-------|--------|
| Cheese goal | Quaternius `Cheese_Singles.fbx` | CC0 Food Pack |
| Props | Quaternius `Mushroom.fbx`, `Broccoli.fbx` | CC0 Food Pack |
| Player | Quaternius `Chick.fbx` (interim mouse) | CC0 Animals Pack |
| SFX / ambient | Kenney Interface Sounds (4 OGG files) | CC0 |
| Hedges / ground / trees | Procedural primitives | DabbleDuck (interim) |

## Color palette

| Role | Hex | Usage |
|------|-----|--------|
| Sky top | `#8CC7EB` | Procedural sky |
| Grass deep | `#6AB04C` | Ground plane |
| Hedge mid | `#409A40` | Wall body |
| Path dirt | `#D8A86A` | Walkable tiles |
| Cheese gold | `#F6C945` | Goal glow |

## Next polish (priority order)

1. **Quaternius Rat** ([Poly Pizza CC0](https://poly.pizza/m/iltq5bVNaV)) → replace Chick stand-in.
2. **Quaternius Ultimate Nature Pack** or **Kenney Nature Kit** → trees, rocks, flowers, hedge blocks.
3. Walk-cycle animation on mouse (`AnimationPlayer` / GLTF).
4. Lightweight grass sway shader on ground.
5. On-screen D-pad for touch.
6. Export standalone `.exe` for production (`game.json` `executables`).

## Performance

- Only 4 FBX models + 4 OGG files shipped (~150 KB audio, low-poly meshes).
- Single shadow-casting sun; particle counts &lt; 50.
- MSAA 3D ×1; no SSAO.

## DabbleDuck integration

- Manifest id: `mouse-maze-3d`
- Verify: `npm run verify:godot`
- Sync assets: `npm run assets:mouse-maze-3d`
- Legacy 2D Godot prototype: `games/mouse-maze/`
