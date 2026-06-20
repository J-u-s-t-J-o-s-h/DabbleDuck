# Slither Trail — Design Document

> A cozy, educational garden adventure for DabbleDuck. Snake‑inspired, but a
> DabbleDuck game first and a Snake game second.

---

## 1. Gameplay vision

A child (ages 4–5) guides a lovable garden snake through a warm, storybook world,
helping it **collect** friendly things scattered across the lawn. The snake grows
longer with every find, the score ticks up, and the world cheers them on.

It is **not** a Snake clone:

- The snake collects helpful garden items, it does not eat dots.
- **No enemies, no combat, no scary content.**
- **No punishment, no timers, no game‑over screens.** Walls are a soft fence the
  snake gently slides along, and the body never causes self‑collision.
- Mistakes are met with **encouragement** ("Oops! Look for the green ones!"),
  never failure.

The feeling we are after: PBS Kids / LeapFrog / Animal Crossing — gentle, alive,
and inviting. The child should feel attached to their snake friend and learn
naturally through play.

### Core loop

1. A level loads with a clear learning objective shown in big, friendly text.
2. The snake moves smoothly (auto‑forward) and the child steers with **WASD or
   the arrow keys** (or the on‑screen arrow pad on touch screens).
3. Collecting the right items grows the snake, raises the score, advances the
   objective, and triggers particles + a happy sound + praise.
4. Touching a "wrong" item gives a kind nudge and a hint — no penalty.
5. Completing the objective plays a celebration and moves to the next garden.

---

## 2. Educational goals

Each level wraps one early‑learning objective into the collecting loop:

| Mode | Level | Objective | Builds |
|------|-------|-----------|--------|
| Color | Sunny Garden | Collect the **green** apples (leave the red) | color recognition, attention |
| Counting | Flower Meadow | Collect **5** strawberries | counting, number sense |
| Shape | Butterfly Grove | Collect the **circles** (skip the squares) | shape recognition |
| Letter | Forest Trail | Collect letters in order **A → B → C** | alphabet & sequencing |
| Word | Moonlight Garden | Collect letters to spell **C‑A‑T** | early reading |

The HUD reinforces learning visually: counting modes show fill‑in pips, letter and
word modes show the target letters with the **next** one highlighted, and the
collected ones turn green with a check.

The framework is data‑driven (`scripts/levels.gd`), so new objectives (more
colors, bigger counts, new words like DOG/SUN, simple addition, etc.) are quick to
add without touching gameplay code.

---

## 3. Progression plan

Five themed gardens, each a little larger and lit differently, introducing new
collectibles and a new objective:

1. **Sunny Garden** — bright midday, color mode.
2. **Flower Meadow** — flower‑filled, counting mode.
3. **Butterfly Grove** — lavender light + lots of butterflies, shape mode.
4. **Forest Trail** — deeper greens & more trees, letter mode.
5. **Moonlight Garden** — night, glowing fireflies, word mode.

Difficulty rises gently through map size and objective type, never through speed or
pressure. After the final garden the child earns the **Garden Explorer** title.

Future progression ideas: a level‑select garden map, "free explore" mode with no
objective, daily gentle challenges, and unlockable snake hats/colors.

---

## 4. Art direction

- **Stylized low‑poly**, cozy and rounded. Everything is built from simple meshes
  with flat, lightly‑shaded materials — a hand‑made storybook feel.
- **Tilted bird's‑eye orthographic camera** so the world reads as real 3D depth
  while "up" on screen always means "away" — intuitive for small children.
- **Warm, soft lighting** with gentle shadows; per‑level palettes shift the mood
  (sunny → flowery → lavender → forest → moonlit).
- The **snake is the star**: oversized, saturated green, with big readable eyes,
  rosy cheeks, a flicking tongue, a soft idle bob, and a hoppy celebration.
- Living touches: fluttering butterflies by day, glowing fireflies at night,
  swaying‑bright collectibles on little pedestals with halos so they are easy to
  spot.
- **Renderer:** GL Compatibility (OpenGL 3.3 / GLES3‑class) for broad hardware
  support on older Dell PCs and budget mini PCs. Effects are kept lightweight
  (small shadow maps, modest MSAA, no heavy post‑processing).

---

## 5. Asset sources

Current build ships **zero external model files** — all 3D art is procedural
(see `scripts/`). Audio uses two Kenney **CC0** sounds plus procedural music/SFX
with synth fallbacks. Full details and licenses live in
[`docs/assets/asset-registry.md`](../assets/asset-registry.md) and
`games/slither-trail/assets/ASSET_CREDITS.txt`.

Approved sources for future, properly‑licensed art drops:

- [Kenney](https://kenney.nl) — CC0
- [Quaternius](https://quaternius.com) — CC0
- [Poly Pizza](https://poly.pizza)
- [OpenGameArt](https://opengameart.org)
- [Godot Asset Library](https://godotengine.org/asset-library)
- Free itch.io asset packs

Every imported asset must be logged in the asset registry with its license before
shipping.

---

## 6. DabbleDuck integration

Built in **Godot 4.7**, launched as a standalone game by the DabbleDuck launcher
and speaking the v1 session/progress contract via `autoloads/dabble_sdk.gd`
(kept in sync with `src/shared/gameContract.ts`).

Reported to the launcher:

- `activity.visit` (play) on start.
- `completion` (`games`) for each objective completed.
- `game.event`: `slither.started`, `slither.collected`, `slither.level_complete`.
- `module.state`: `plays`, `sessions`, `levelsCompleted`, `longestSnake`,
  `totalItems`, `objectivesCompleted` — covering the requested metrics (levels
  completed, longest snake length, total items collected, total play sessions,
  educational objectives completed).
- `result.json` summary on clean finish.

**Achievements (badges)** declared in `game.json` and requested in play:

| Badge | Earned by |
|-------|-----------|
| Snake Scout 🔎 | Finishing the first garden |
| Color Collector 🍏 | Completing the color objective |
| Counting Champion 🔢 | Completing the counting objective |
| Shape Seeker 🔵 | Completing the shape objective |
| Letter Learner 🔤 | Completing a letter/word objective |
| Garden Explorer 🌻 | Completing all gardens |

The contract is verified headlessly (no GUI input needed):

```bash
npm run verify:godot:slither
```

Visual review without playing by hand:

```bash
node tools/godot-screenshot.mjs .verify-tmp/slither.png --game slither-trail --level 1 --steps 60
```

---

## 7. Project structure

```
games/slither-trail/
├── project.godot            # Godot 4.7, GL Compatibility renderer
├── game.json                # DabbleDuck manifest (id, badges, age range)
├── autoloads/
│   └── dabble_sdk.gd        # v1 launcher contract
├── scenes/
│   ├── main.tscn            # world, camera, lights, HUD, audio
│   └── main.gd              # orchestrator: levels, input, collection, SDK
├── scripts/
│   ├── snake.gd             # snake head + trailing body + animation
│   ├── garden_world.gd      # themed procedural garden
│   ├── collectible.gd       # one class for all collectible types
│   ├── levels.gd            # level + objective definitions (data-driven)
│   ├── kid_hud.gd           # objective, progress pips, toasts, arrow pad
│   ├── celebration.gd       # between-level + finish overlay
│   ├── game_audio.gd        # music, SFX, ambience (CC0 + procedural)
│   └── stylized_materials.gd# shared material palette
├── assets/
│   ├── characters/  environment/  collectibles/  effects/   (procedural — kept via .gitkeep)
│   ├── audio/               # Kenney CC0 sparkle.ogg, win.ogg
│   └── licenses/            # asset license texts
└── docs/                    # per-game notes
```

---

## 8. Future roadmap

- **More objectives:** additional colors, larger counts, new words (DOG, SUN),
  matching, and gentle first addition (collect groups that make 5).
- **Level‑select garden map** and a no‑objective "free explore" mode.
- **Snake customization:** hats, patterns, and colors unlocked by achievements.
- **Voice‑over & narration** reading objectives and praise aloud (great for
  pre‑readers); spell‑out of letters and words.
- **Accessibility:** larger text option, color‑blind‑friendly shape/letter cues,
  and a "calm" mode honoring the launcher's reduced‑motion setting.
- **Optional CC0 art pass** swapping select procedural props for Quaternius/Kenney
  models once licenses are logged.
- **More living world:** bees, ladybugs, drifting clouds, day/night ambience.
