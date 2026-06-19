extends RefCounted
## Helpers for sizing Kenney 16×16 sprites on the maze grid.

const TILE := 64
const KENNEY_TILE := 16
const KENNEY_STRIDE := 17


static func scale_to_tile(tex: Texture2D, tile_fraction: float = 0.5) -> float:
	if tex == null:
		return 1.0
	var target := TILE * tile_fraction
	return target / float(tex.get_width())


static func atlas_region(tex: Texture2D, col: int, row: int) -> AtlasTexture:
	var atlas := AtlasTexture.new()
	atlas.atlas = tex
	atlas.region = Rect2(
		col * KENNEY_STRIDE,
		row * KENNEY_STRIDE,
		KENNEY_TILE,
		KENNEY_TILE
	)
	return atlas
