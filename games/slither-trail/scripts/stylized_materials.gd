class_name SlitherMaterials
extends RefCounted
## Shared materials for Slither Trail's cozy low-poly storybook garden.
## Most surfaces are lightly shaded so the tilted camera reads as real 3D depth;
## UI-ish accents (glows, rings) are unshaded so they stay bright and readable.

static func make(color: Color, roughness: float = 0.95, unshaded: bool = false) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = 0.0
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	if unshaded:
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return mat


static func emissive(color: Color, energy: float = 0.4) -> StandardMaterial3D:
	var mat := make(color, 0.6)
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = energy
	return mat


static func glow(color: Color) -> StandardMaterial3D:
	var mat := make(color, 0.9, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


# --- Snake ---------------------------------------------------------------

static func snake_body() -> StandardMaterial3D:
	return make(Color(0.24, 0.72, 0.34))


static func snake_belly() -> StandardMaterial3D:
	return make(Color(0.96, 0.97, 0.70))


static func snake_pattern() -> StandardMaterial3D:
	return make(Color(0.14, 0.50, 0.24))


static func snake_cheek() -> StandardMaterial3D:
	return make(Color(1.0, 0.62, 0.66))


static func snake_eye() -> StandardMaterial3D:
	return make(Color(1, 1, 1))


static func snake_pupil() -> StandardMaterial3D:
	return make(Color(0.08, 0.09, 0.13), 0.3)


static func snake_glint() -> StandardMaterial3D:
	return make(Color(1, 1, 1), 0.2, true)


static func snake_tongue() -> StandardMaterial3D:
	return make(Color(0.95, 0.32, 0.44))


static func shadow_blob() -> StandardMaterial3D:
	var mat := make(Color(0.05, 0.12, 0.05, 0.22), 1.0, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return mat


# --- Collectibles --------------------------------------------------------

static func apple_green() -> StandardMaterial3D:
	return make(Color(0.58, 0.88, 0.16))


static func apple_red() -> StandardMaterial3D:
	return make(Color(0.88, 0.22, 0.20))


static func apple_stem() -> StandardMaterial3D:
	return make(Color(0.45, 0.32, 0.18))


static func leaf() -> StandardMaterial3D:
	return make(Color(0.38, 0.66, 0.30))


static func strawberry() -> StandardMaterial3D:
	return make(Color(0.92, 0.20, 0.30))


static func strawberry_seed() -> StandardMaterial3D:
	return make(Color(1.0, 0.94, 0.62))


static func shape_circle() -> StandardMaterial3D:
	return make(Color(0.30, 0.62, 0.95))


static func shape_square() -> StandardMaterial3D:
	return make(Color(0.95, 0.62, 0.25))


static func letter_tile() -> StandardMaterial3D:
	return make(Color(1.0, 0.96, 0.86))


static func letter_tile_next() -> StandardMaterial3D:
	var mat := make(Color(1.0, 0.92, 0.55))
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.86, 0.40)
	mat.emission_energy_multiplier = 0.35
	return mat


static func collectible_glow() -> StandardMaterial3D:
	return glow(Color(1.0, 0.98, 0.70, 0.85))


# --- Ground & environment ------------------------------------------------

static func path_dirt() -> StandardMaterial3D:
	return make(Color(0.90, 0.80, 0.55))


static func fence() -> StandardMaterial3D:
	return make(Color(0.80, 0.62, 0.40))


static func fence_post() -> StandardMaterial3D:
	return make(Color(0.70, 0.52, 0.32))


# --- Decorations ---------------------------------------------------------

static func flower_center() -> StandardMaterial3D:
	return make(Color(1.0, 0.86, 0.30))


static func mushroom_cap() -> StandardMaterial3D:
	return make(Color(0.90, 0.36, 0.34))


static func mushroom_spot() -> StandardMaterial3D:
	return make(Color(1.0, 0.96, 0.92))


static func mushroom_stem() -> StandardMaterial3D:
	return make(Color(0.96, 0.92, 0.84))


static func pebble() -> StandardMaterial3D:
	return make(Color(0.66, 0.64, 0.60))


static func bush() -> StandardMaterial3D:
	return make(Color(0.26, 0.58, 0.30))


static func tree_trunk() -> StandardMaterial3D:
	return make(Color(0.50, 0.36, 0.22))


static func tree_leaves() -> StandardMaterial3D:
	return make(Color(0.30, 0.60, 0.32))


static func butterfly_wing() -> StandardMaterial3D:
	var mat := make(Color(1.0, 0.62, 0.84), 0.7)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


static func firefly() -> StandardMaterial3D:
	return emissive(Color(1.0, 0.95, 0.55), 1.6)
