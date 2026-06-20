# Slither Trail — Art Direction (quick reference)

Full design lives in `docs/games/slither-trail-design.md` at the repo root.

**Feel:** cozy storybook garden — PBS Kids / LeapFrog / Animal Crossing.

**Camera:** tilted bird's‑eye orthographic. "Up" on screen = away from the player.

**Snake (the star):** oversized, saturated green, cream belly, big readable eyes,
rosy cheeks, flicking tongue. Soft idle bob; hoppy, wiggly celebration. The body
is a trail of segments that follow the head and grow with every collect.

**World:** checkerboard lawn, friendly fence, rounded trees/bushes/flowers/
mushrooms/pebbles, butterflies by day and fireflies at night. Each level shifts
the palette and lighting (sunny → flowery → lavender → forest → moonlit).

**Collectibles:** bright, on little cream pedestals with a soft halo so 4–5 year
olds can spot them instantly. Letters use `Label3D` tiles; the next needed tile
glows.

**Rendering:** GL Compatibility for older Dell PCs / budget mini PCs. Keep effects
light: small shadow maps, modest MSAA, warm low‑energy lighting (the renderer can
look washed out if over‑lit — keep ambient ~0.3–0.4 and sun ~1.0).

**Colors:** see `scripts/stylized_materials.gd`. Per‑level palettes in
`scripts/levels.gd`.

**All art is procedural** (no model files). Audio: Kenney CC0 + procedural synth.
