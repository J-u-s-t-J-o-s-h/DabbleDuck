extends Node3D
## Builds a cozy low-poly storybook garden for one level: a checkerboard lawn,
## a friendly fence, scattered flowers / mushrooms / pebbles / bushes / trees,
## and gently fluttering butterflies (or fireflies at night). Everything here is
## decoration — the snake never collides with it, so the world is purely lovely.

const SlitherMaterials := preload("res://scripts/stylized_materials.gd")

const CELL := 1.25
const MARGIN := 1.4   # inner play margin so the snake stays off the fence

var _cols := 12
var _rows := 12
var _origin := Vector3.ZERO
var _rng := RandomNumberGenerator.new()
var _flyers: Array = []
var _t := 0.0


func build(theme: Dictionary) -> void:
	_clear()
	_cols = int(theme.get("cols", 12))
	_rows = int(theme.get("rows", 12))
	_origin = Vector3(-_cols * CELL * 0.5, 0.0, -_rows * CELL * 0.5)
	_rng.seed = int(theme.get("seed", 1234))
	_flyers.clear()

	_add_ground(theme)
	_add_fence(theme)
	_add_trees(theme)
	_add_scatter(theme)
	_add_flyers(theme)


func _clear() -> void:
	for child in get_children():
		child.queue_free()


# --- Geometry the rest of the game needs ---------------------------------

func center() -> Vector3:
	return Vector3.ZERO


func span() -> float:
	return maxf(float(_cols), float(_rows)) * CELL


func play_bounds_min() -> Vector2:
	return Vector2(_origin.x + MARGIN, _origin.z + MARGIN)


func play_bounds_max() -> Vector2:
	return Vector2(-_origin.x - MARGIN, -_origin.z - MARGIN)


func random_spawn_point(rng: RandomNumberGenerator) -> Vector3:
	var bmin := play_bounds_min()
	var bmax := play_bounds_max()
	return Vector3(
		rng.randf_range(bmin.x + 0.6, bmax.x - 0.6),
		0.12,
		rng.randf_range(bmin.y + 0.6, bmax.y - 0.6)
	)


# --- Ground --------------------------------------------------------------

func _add_ground(theme: Dictionary) -> void:
	var a: Color = theme.get("grass_a", Color(0.46, 0.71, 0.34))
	var b: Color = theme.get("grass_b", Color(0.36, 0.62, 0.27))
	var mat_a := SlitherMaterials.make(a)
	var mat_b := SlitherMaterials.make(b)
	for y in _rows:
		for x in _cols:
			var tile := _box(Vector3(CELL, 0.1, CELL), mat_a if (x + y) % 2 == 0 else mat_b)
			tile.position = _tile_center(x, y) + Vector3(0, -0.05, 0)
			add_child(tile)
	# Outer apron lawn so the board rests on grass, not floating squares.
	var pad := 4.0
	var apron := _box(Vector3(_cols * CELL + pad * 2.0, 0.08, _rows * CELL + pad * 2.0), mat_b)
	apron.position = Vector3(0, -0.12, 0)
	add_child(apron)


func _tile_center(x: int, y: int) -> Vector3:
	return _origin + Vector3(float(x) * CELL + CELL * 0.5, 0.0, float(y) * CELL + CELL * 0.5)


# --- Fence boundary ------------------------------------------------------

func _add_fence(theme: Dictionary) -> void:
	var post_mat := SlitherMaterials.fence_post()
	var rail_mat := SlitherMaterials.fence()
	var half_x := _cols * CELL * 0.5 + 0.3
	var half_z := _rows * CELL * 0.5 + 0.3
	var step := CELL
	var x := -half_x
	while x <= half_x + 0.01:
		_add_post(Vector3(x, 0, -half_z), post_mat)
		_add_post(Vector3(x, 0, half_z), post_mat)
		x += step
	var z := -half_z + step
	while z <= half_z - step + 0.01:
		_add_post(Vector3(-half_x, 0, z), post_mat)
		_add_post(Vector3(half_x, 0, z), post_mat)
		z += step
	# Top rails (thin boxes) along each side.
	var rail_n := _box(Vector3(half_x * 2.0, 0.08, 0.08), rail_mat)
	rail_n.position = Vector3(0, 0.42, -half_z)
	add_child(rail_n)
	var rail_s := _box(Vector3(half_x * 2.0, 0.08, 0.08), rail_mat)
	rail_s.position = Vector3(0, 0.42, half_z)
	add_child(rail_s)
	var rail_w := _box(Vector3(0.08, 0.08, half_z * 2.0), rail_mat)
	rail_w.position = Vector3(-half_x, 0.42, 0)
	add_child(rail_w)
	var rail_e := _box(Vector3(0.08, 0.08, half_z * 2.0), rail_mat)
	rail_e.position = Vector3(half_x, 0.42, 0)
	add_child(rail_e)


func _add_post(pos: Vector3, mat: StandardMaterial3D) -> void:
	var post := _box(Vector3(0.12, 0.6, 0.12), mat)
	post.position = pos + Vector3(0, 0.3, 0)
	add_child(post)
	var cap := _sphere(0.09, mat)
	cap.position = pos + Vector3(0, 0.62, 0)
	add_child(cap)


# --- Trees (edges & corners only, never on the play field) ---------------

func _add_trees(theme: Dictionary) -> void:
	var leaf: Color = theme.get("tree_leaves", Color(0.30, 0.60, 0.32))
	var count := int(theme.get("tree_count", 6))
	var half_x := _cols * CELL * 0.5 + 2.0
	var half_z := _rows * CELL * 0.5 + 2.0
	var spots := [
		Vector3(-half_x, 0, -half_z), Vector3(half_x, 0, -half_z),
		Vector3(-half_x, 0, half_z), Vector3(half_x, 0, half_z),
		Vector3(0, 0, -half_z - 0.6), Vector3(0, 0, half_z + 0.6),
		Vector3(-half_x - 0.6, 0, 0), Vector3(half_x + 0.6, 0, 0)
	]
	for i in mini(count, spots.size()):
		_add_tree(spots[i] + Vector3(_jit(0.5), 0, _jit(0.5)), leaf)


func _add_tree(pos: Vector3, leaf_color: Color) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	var h := _rng.randf_range(1.4, 2.1)
	var trunk := _cylinder(0.16, h, SlitherMaterials.tree_trunk())
	trunk.position.y = h * 0.5
	root.add_child(trunk)
	var leaf_mat := SlitherMaterials.make(leaf_color)
	for i in 3:
		var puff := _sphere(_rng.randf_range(0.6, 0.85), leaf_mat)
		puff.scale = Vector3(1.0, 0.9, 1.0)
		puff.position = Vector3(_jit(0.3), h + _rng.randf_range(-0.1, 0.4), _jit(0.3))
		root.add_child(puff)


# --- Scattered small decorations -----------------------------------------

func _add_scatter(theme: Dictionary) -> void:
	var accent: Color = theme.get("accent", Color(1.0, 0.55, 0.72))
	var accent2: Color = theme.get("accent2", Color(0.72, 0.62, 1.0))
	var bush_mat := SlitherMaterials.make(theme.get("bush", Color(0.26, 0.58, 0.30)))
	var area := _cols * _rows
	var flowers := int(area * float(theme.get("flower_density", 0.5)))
	var others := int(area * 0.25)
	for i in flowers:
		_add_flower(_scatter_point(), accent if _rng.randf() < 0.6 else accent2)
	for i in others:
		match _rng.randi_range(0, 2):
			0: _add_mushroom(_scatter_point())
			1: _add_pebble(_scatter_point())
			_: _add_bush(_scatter_point(), bush_mat)


func _scatter_point() -> Vector3:
	# Anywhere on the lawn including a ring just outside the play field.
	var half_x := _cols * CELL * 0.5 + 1.2
	var half_z := _rows * CELL * 0.5 + 1.2
	return Vector3(_rng.randf_range(-half_x, half_x), 0.08, _rng.randf_range(-half_z, half_z))


func _add_flower(pos: Vector3, petal: Color) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	var stem := _cylinder(0.025, 0.2, SlitherMaterials.bush())
	stem.position.y = 0.1
	root.add_child(stem)
	var petal_mat := SlitherMaterials.make(petal)
	for i in 5:
		var ang := TAU * float(i) / 5.0
		var p := _sphere(0.05, petal_mat)
		p.scale = Vector3(1.0, 0.5, 1.4)
		p.position = Vector3(cos(ang) * 0.07, 0.22, sin(ang) * 0.07)
		root.add_child(p)
	var center := _sphere(0.045, SlitherMaterials.flower_center())
	center.position.y = 0.23
	root.add_child(center)


func _add_mushroom(pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	var stem := _cylinder(0.05, 0.16, SlitherMaterials.mushroom_stem())
	stem.position.y = 0.08
	root.add_child(stem)
	var cap := _sphere(0.13, SlitherMaterials.mushroom_cap())
	cap.scale = Vector3(1.0, 0.62, 1.0)
	cap.position.y = 0.18
	root.add_child(cap)
	for i in 3:
		var spot := _sphere(0.025, SlitherMaterials.mushroom_spot())
		var ang := TAU * float(i) / 3.0 + 0.5
		spot.position = Vector3(cos(ang) * 0.07, 0.22, sin(ang) * 0.07)
		root.add_child(spot)


func _add_pebble(pos: Vector3) -> void:
	var pebble := _sphere(0.09, SlitherMaterials.pebble())
	pebble.scale = Vector3(1.2, 0.6, 1.0)
	pebble.position = pos + Vector3(0, 0.04, 0)
	add_child(pebble)


func _add_bush(pos: Vector3, mat: StandardMaterial3D) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)
	for i in _rng.randi_range(2, 3):
		var puff := _sphere(_rng.randf_range(0.22, 0.34), mat)
		puff.scale = Vector3(1.0, 0.8, 1.0)
		puff.position = Vector3(_jit(0.2), _rng.randf_range(0.16, 0.3), _jit(0.2))
		root.add_child(puff)


# --- Flyers (butterflies / fireflies) ------------------------------------

func _add_flyers(theme: Dictionary) -> void:
	var night: bool = theme.get("night", false)
	var count := int(theme.get("flyer_count", 6))
	for i in count:
		if night:
			_add_firefly()
		else:
			_add_butterfly(theme)


func _add_butterfly(theme: Dictionary) -> void:
	var root := Node3D.new()
	var base := _scatter_point()
	base.y = _rng.randf_range(0.8, 1.8)
	root.position = base
	add_child(root)
	var wing_color: Color = theme.get("butterfly", Color(1.0, 0.62, 0.84))
	var mat := SlitherMaterials.make(wing_color, 0.7)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var body := _cylinder(0.02, 0.16, SlitherMaterials.snake_pupil())
	body.rotation_degrees = Vector3(90, 0, 0)
	root.add_child(body)
	var wl := _wing(mat, -1.0)
	var wr := _wing(mat, 1.0)
	root.add_child(wl)
	root.add_child(wr)
	_flyers.append({
		"node": root, "base": base, "phase": _rng.randf() * TAU,
		"radius": _rng.randf_range(0.6, 1.4), "speed": _rng.randf_range(0.5, 1.1),
		"wl": wl, "wr": wr, "night": false
	})


func _wing(mat: StandardMaterial3D, side: float) -> MeshInstance3D:
	var wing := _sphere(0.12, mat)
	wing.scale = Vector3(0.12, 1.1, 0.7)
	wing.position = Vector3(0.1 * side, 0, 0)
	return wing


func _add_firefly() -> void:
	var base := _scatter_point()
	base.y = _rng.randf_range(0.5, 1.6)
	var dot := _sphere(0.06, SlitherMaterials.firefly())
	dot.position = base
	add_child(dot)
	_flyers.append({
		"node": dot, "base": base, "phase": _rng.randf() * TAU,
		"radius": _rng.randf_range(0.4, 1.0), "speed": _rng.randf_range(0.4, 0.9),
		"wl": null, "wr": null, "night": true
	})


func _process(delta: float) -> void:
	_t += delta
	for f in _flyers:
		var node: Node3D = f["node"]
		if not is_instance_valid(node):
			continue
		var ph: float = f["phase"] + _t * f["speed"]
		var base: Vector3 = f["base"]
		var r: float = f["radius"]
		node.position = base + Vector3(cos(ph) * r, sin(ph * 1.7) * 0.25, sin(ph) * r)
		if f["night"]:
			var pulse := 0.6 + 0.4 * sin(_t * 4.0 + f["phase"])
			var mat := (node as MeshInstance3D).material_override as StandardMaterial3D
			if mat:
				mat.emission_energy_multiplier = pulse * 1.8
		else:
			var flap := sin(_t * 18.0 + f["phase"]) * 60.0
			if f["wl"]:
				(f["wl"] as Node3D).rotation_degrees.y = flap
			if f["wr"]:
				(f["wr"] as Node3D).rotation_degrees.y = -flap


# --- Mesh helpers --------------------------------------------------------

func _jit(amount: float) -> float:
	return _rng.randf_range(-amount, amount)


func _box(size: Vector3, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = mat
	return node


func _sphere(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 12
	mesh.rings = 6
	node.mesh = mesh
	node.material_override = mat
	return node


func _cylinder(radius: float, height: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	node.mesh = mesh
	node.material_override = mat
	return node
