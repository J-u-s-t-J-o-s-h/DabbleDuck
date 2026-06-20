extends RefCounted
## Level + educational-objective definitions for Slither Trail.
##
## Returned from a static func (not a const) because the theme dictionaries hold
## Color/Array values that GDScript will not treat as constant expressions.
##
## Each level bundles: a themed garden (size, colors, lighting, decorations) and
## one educational objective (mode + targets). No timers, no losing — every
## objective ends in a celebration.

static func all() -> Array:
	return [_sunny_garden(), _flower_meadow(), _butterfly_grove(), _forest_trail(), _moonlight_garden()]


static func _sunny_garden() -> Dictionary:
	return {
		"name": "Sunny Garden",
		"mode": "color",
		"objective": "Collect the GREEN apples!",
		"hint": "Munch the green apples. Leave the red ones be!",
		"target_kind": "apple_green",
		"avoid_kind": "apple_red",
		"goal": 5,
		"decoys": 4,
		"cols": 12, "rows": 12, "seed": 101,
		"grass_a": Color(0.44, 0.66, 0.30), "grass_b": Color(0.35, 0.57, 0.25),
		"accent": Color(1.0, 0.50, 0.68), "accent2": Color(1.0, 0.80, 0.30),
		"bush": Color(0.24, 0.52, 0.28), "tree_leaves": Color(0.28, 0.54, 0.28),
		"butterfly": Color(1.0, 0.62, 0.36), "flower_density": 0.55, "tree_count": 6,
		"flyer_count": 6, "night": false,
		"sky_top": Color(0.42, 0.72, 0.95), "sky_horizon": Color(0.85, 0.93, 0.80),
		"ground_horizon": Color(0.74, 0.88, 0.62),
		"ambient_color": Color(1.0, 0.98, 0.90), "ambient_energy": 0.32,
		"sun_color": Color(1.0, 0.95, 0.82), "sun_energy": 1.0,
		"clear_color": Color(0.55, 0.80, 0.95),
	}


static func _flower_meadow() -> Dictionary:
	return {
		"name": "Flower Meadow",
		"mode": "count",
		"objective": "Collect 5 strawberries!",
		"hint": "Count each strawberry as you find it: 1, 2, 3...",
		"target_kind": "strawberry",
		"avoid_kind": "",
		"goal": 5,
		"decoys": 0,
		"cols": 13, "rows": 13, "seed": 202,
		"grass_a": Color(0.48, 0.70, 0.36), "grass_b": Color(0.39, 0.62, 0.29),
		"accent": Color(1.0, 0.46, 0.70), "accent2": Color(0.72, 0.50, 1.0),
		"bush": Color(0.26, 0.54, 0.30), "tree_leaves": Color(0.30, 0.58, 0.32),
		"butterfly": Color(1.0, 0.50, 0.76), "flower_density": 0.9, "tree_count": 5,
		"flyer_count": 8, "night": false,
		"sky_top": Color(0.50, 0.74, 0.96), "sky_horizon": Color(0.96, 0.86, 0.90),
		"ground_horizon": Color(0.82, 0.90, 0.66),
		"ambient_color": Color(1.0, 0.97, 0.92), "ambient_energy": 0.34,
		"sun_color": Color(1.0, 0.93, 0.84), "sun_energy": 1.0,
		"clear_color": Color(0.62, 0.82, 0.95),
	}


static func _butterfly_grove() -> Dictionary:
	return {
		"name": "Butterfly Grove",
		"mode": "shape",
		"objective": "Collect the CIRCLES!",
		"hint": "Gather the round circles. Skip the square ones!",
		"target_kind": "circle",
		"avoid_kind": "square",
		"goal": 5,
		"decoys": 4,
		"cols": 14, "rows": 14, "seed": 303,
		"grass_a": Color(0.42, 0.64, 0.34), "grass_b": Color(0.34, 0.56, 0.29),
		"accent": Color(0.74, 0.52, 1.0), "accent2": Color(0.54, 0.70, 1.0),
		"bush": Color(0.26, 0.52, 0.36), "tree_leaves": Color(0.30, 0.54, 0.36),
		"butterfly": Color(0.66, 0.54, 1.0), "flower_density": 0.7, "tree_count": 7,
		"flyer_count": 12, "night": false,
		"sky_top": Color(0.58, 0.70, 0.96), "sky_horizon": Color(0.90, 0.86, 0.98),
		"ground_horizon": Color(0.78, 0.86, 0.72),
		"ambient_color": Color(0.99, 0.96, 1.0), "ambient_energy": 0.34,
		"sun_color": Color(1.0, 0.94, 0.90), "sun_energy": 0.98,
		"clear_color": Color(0.66, 0.78, 0.96),
	}


static func _forest_trail() -> Dictionary:
	return {
		"name": "Forest Trail",
		"mode": "letter",
		"objective": "Find the letters: A then B then C",
		"hint": "Follow the alphabet in order: A, then B, then C!",
		"sequence": ["A", "B", "C"],
		"decoy_glyphs": ["D", "E"],
		"cols": 15, "rows": 15, "seed": 404,
		"grass_a": Color(0.38, 0.60, 0.30), "grass_b": Color(0.30, 0.52, 0.26),
		"accent": Color(1.0, 0.70, 0.40), "accent2": Color(1.0, 0.86, 0.40),
		"bush": Color(0.24, 0.48, 0.28), "tree_leaves": Color(0.24, 0.50, 0.28),
		"butterfly": Color(1.0, 0.78, 0.42), "flower_density": 0.4, "tree_count": 8,
		"flyer_count": 6, "night": false,
		"sky_top": Color(0.46, 0.64, 0.74), "sky_horizon": Color(0.78, 0.82, 0.70),
		"ground_horizon": Color(0.58, 0.68, 0.50),
		"ambient_color": Color(0.94, 0.92, 0.82), "ambient_energy": 0.34,
		"sun_color": Color(1.0, 0.92, 0.76), "sun_energy": 1.0,
		"clear_color": Color(0.52, 0.66, 0.66),
	}


static func _moonlight_garden() -> Dictionary:
	return {
		"name": "Moonlight Garden",
		"mode": "word",
		"objective": "Spell the word: C-A-T",
		"hint": "Collect the letters in order to spell CAT!",
		"sequence": ["C", "A", "T"],
		"decoy_glyphs": ["O", "S"],
		"word": "CAT",
		"cols": 15, "rows": 15, "seed": 505,
		"grass_a": Color(0.24, 0.34, 0.46), "grass_b": Color(0.20, 0.30, 0.42),
		"accent": Color(0.70, 0.66, 1.0), "accent2": Color(0.56, 0.74, 1.0),
		"bush": Color(0.18, 0.34, 0.42), "tree_leaves": Color(0.18, 0.36, 0.42),
		"butterfly": Color(0.8, 0.8, 1.0), "flower_density": 0.4, "tree_count": 8,
		"flyer_count": 16, "night": true,
		"sky_top": Color(0.10, 0.13, 0.28), "sky_horizon": Color(0.24, 0.26, 0.44),
		"ground_horizon": Color(0.16, 0.22, 0.34),
		"ambient_color": Color(0.55, 0.62, 0.85), "ambient_energy": 0.40,
		"sun_color": Color(0.66, 0.74, 1.0), "sun_energy": 0.60,
		"clear_color": Color(0.10, 0.13, 0.26),
	}
