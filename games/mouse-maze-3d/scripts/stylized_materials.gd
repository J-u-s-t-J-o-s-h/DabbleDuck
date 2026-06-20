class_name StylizedMaterials
extends RefCounted
## Shared materials for the cozy low-poly garden look.
## Most surfaces are lightly shaded so the tilted camera reads as real 3D depth.

static func make(color: Color, roughness: float = 0.95, unshaded: bool = false) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = 0.0
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	if unshaded:
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return mat


# --- Ground & maze --------------------------------------------------------

static func grass_deep() -> StandardMaterial3D:
	return make(Color(0.36, 0.62, 0.27))


static func grass_light() -> StandardMaterial3D:
	return make(Color(0.46, 0.71, 0.34))


static func path_dirt() -> StandardMaterial3D:
	return make(Color(0.93, 0.83, 0.58))


static func hedge_body() -> StandardMaterial3D:
	return make(Color(0.22, 0.55, 0.26))


static func hedge_top() -> StandardMaterial3D:
	return make(Color(0.30, 0.66, 0.32))


static func hedge_base() -> StandardMaterial3D:
	return make(Color(0.40, 0.30, 0.20))


# --- Mouse ----------------------------------------------------------------

static func mouse_body() -> StandardMaterial3D:
	return make(Color(0.78, 0.74, 0.72))


static func mouse_belly() -> StandardMaterial3D:
	return make(Color(0.95, 0.93, 0.90))


static func mouse_ear_inner() -> StandardMaterial3D:
	return make(Color(1.0, 0.62, 0.70))


static func mouse_nose() -> StandardMaterial3D:
	return make(Color(1.0, 0.45, 0.55))


static func mouse_eye() -> StandardMaterial3D:
	var m := make(Color(0.06, 0.06, 0.09), 0.3)
	return m


static func mouse_eye_white() -> StandardMaterial3D:
	return make(Color(1, 1, 1))


static func mouse_tail() -> StandardMaterial3D:
	return make(Color(0.92, 0.78, 0.78))


# --- Bunny ----------------------------------------------------------------

static func bunny_body() -> StandardMaterial3D:
	return make(Color(0.97, 0.95, 0.92))


static func bunny_tail() -> StandardMaterial3D:
	return make(Color(1.0, 1.0, 1.0))


# --- Turtle ---------------------------------------------------------------

static func turtle_body() -> StandardMaterial3D:
	return make(Color(0.46, 0.70, 0.38))


static func turtle_shell() -> StandardMaterial3D:
	return make(Color(0.55, 0.40, 0.22))


static func turtle_shell_spot() -> StandardMaterial3D:
	return make(Color(0.70, 0.55, 0.32))


static func mouse_spot_ring() -> StandardMaterial3D:
	var mat := make(Color(1.0, 0.92, 0.35, 0.55), 0.9, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


# --- Cheese & markers -----------------------------------------------------

static func cheese() -> StandardMaterial3D:
	var mat := make(Color(1.0, 0.81, 0.20), 0.7)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.78, 0.18)
	mat.emission_energy_multiplier = 0.18
	return mat


static func cheese_hole() -> StandardMaterial3D:
	return make(Color(0.85, 0.62, 0.10))


static func start_marker() -> StandardMaterial3D:
	var mat := make(Color(0.35, 0.62, 1.0, 0.6), 0.9, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


static func goal_marker() -> StandardMaterial3D:
	var mat := make(Color(1.0, 0.82, 0.12, 0.5), 0.9, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


static func shadow_blob() -> StandardMaterial3D:
	var mat := make(Color(0.05, 0.12, 0.05, 0.22), 1.0, true)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return mat


# --- Decorations ----------------------------------------------------------

static func flower_petal() -> StandardMaterial3D:
	return make(Color(1.0, 0.55, 0.72))


static func flower_petal_alt() -> StandardMaterial3D:
	return make(Color(0.72, 0.62, 1.0))


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
