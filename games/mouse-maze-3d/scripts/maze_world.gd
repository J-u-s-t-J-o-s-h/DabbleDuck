extends Node3D
## Builds a cozy low-poly garden maze from an ASCII grid.
## Walls are leafy hedges with real height so the tilted camera reads as 3D.

const StylizedMaterials := preload("res://scripts/stylized_materials.gd")

const CELL := 1.25
const WALL_H := 1.15

var _grid: PackedStringArray = []
var _rows := 0
var _cols := 0
var _origin := Vector3.ZERO
var _deco_rng := RandomNumberGenerator.new()


func build(grid: PackedStringArray) -> void:
	_clear_maze_geometry()
	_grid = grid
	_rows = grid.size()
	_cols = grid[0].length() if _rows > 0 else 0
	_origin = Vector3(-_cols * CELL * 0.5, 0.0, -_rows * CELL * 0.5)
	_deco_rng.seed = 1337

	_add_ground()
	_add_walls()
	_add_paths()
	_add_landmark_markers()
	_add_border_greenery()


func _clear_maze_geometry() -> void:
	for child in get_children():
		if child.name == "Characters" or child.name == "CelebrationParticles":
			continue
		child.queue_free()


func _is_wall(x: int, y: int) -> bool:
	return _grid[y].substr(x, 1) == "#"


func _cell_floor(x: int, y: int) -> Vector3:
	return _origin + Vector3(
		float(x) * CELL + CELL * 0.5,
		0.0,
		float(y) * CELL + CELL * 0.5
	)


func grid_to_world(grid: Vector2i) -> Vector3:
	return _cell_floor(grid.x, grid.y) + Vector3(0.0, 0.12, 0.0)


func maze_center() -> Vector3:
	return _origin + Vector3(_cols * CELL * 0.5, 0.0, _rows * CELL * 0.5)


func maze_span() -> float:
	return maxf(float(_cols), float(_rows)) * CELL


func _add_ground() -> void:
	# Checkerboard grass so the camera tilt and scale read clearly.
	for y in _rows:
		for x in _cols:
			var tile := _box(
				Vector3(CELL, 0.1, CELL),
				StylizedMaterials.grass_light() if (x + y) % 2 == 0 else StylizedMaterials.grass_deep()
			)
			tile.position = _cell_floor(x, y) + Vector3(0.0, -0.05, 0.0)
			add_child(tile)

	# Outer apron so the board sits on a lawn, not floating squares.
	var pad := 3.0
	var apron := _box(
		Vector3(_cols * CELL + pad * 2.0, 0.08, _rows * CELL + pad * 2.0),
		StylizedMaterials.grass_deep()
	)
	apron.position = maze_center() + Vector3(0.0, -0.12, 0.0)
	add_child(apron)


func _add_walls() -> void:
	for y in _rows:
		for x in _cols:
			if _is_wall(x, y):
				_add_hedge(_cell_floor(x, y))


func _add_hedge(floor_pos: Vector3) -> void:
	# Soil base
	var base := _box(Vector3(CELL * 0.98, 0.18, CELL * 0.98), StylizedMaterials.hedge_base())
	base.position = floor_pos + Vector3(0.0, 0.09, 0.0)
	add_child(base)

	# Leafy body
	var body := _box(Vector3(CELL * 0.9, WALL_H, CELL * 0.9), StylizedMaterials.hedge_body())
	body.position = floor_pos + Vector3(0.0, WALL_H * 0.5 + 0.16, 0.0)
	add_child(body)

	# Bushy rounded top made of a few spheres for a hand-made look.
	var top_mat := StylizedMaterials.hedge_top()
	for offset in [Vector3(-0.26, 0, -0.26), Vector3(0.28, 0, -0.22),
			Vector3(-0.22, 0, 0.27), Vector3(0.24, 0, 0.25), Vector3(0.0, 0.08, 0.0)]:
		var puff := _sphere(0.34, top_mat)
		puff.scale = Vector3(1.0, 0.7, 1.0)
		puff.position = floor_pos + Vector3(offset.x, WALL_H + 0.18 + offset.y, offset.z)
		add_child(puff)


func _add_paths() -> void:
	for y in _rows:
		for x in _cols:
			if _is_wall(x, y):
				continue
			var floor_pos := _cell_floor(x, y)
			_add_path_tile(floor_pos)
			if _grid[y].substr(x, 1) == "." and _deco_rng.randf() < 0.18:
				_add_random_deco(floor_pos)


func _add_path_tile(floor_pos: Vector3) -> void:
	var tile := _box(Vector3(CELL * 0.86, 0.08, CELL * 0.86), StylizedMaterials.path_dirt())
	tile.position = floor_pos + Vector3(0.0, 0.04, 0.0)
	add_child(tile)


func _add_random_deco(floor_pos: Vector3) -> void:
	match _deco_rng.randi_range(0, 2):
		0:
			_add_flower(floor_pos)
		1:
			_add_mushroom(floor_pos)
		_:
			_add_pebble(floor_pos)


func _add_flower(floor_pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = floor_pos + Vector3(_jit(), 0.08, _jit())
	add_child(root)
	var stem := _cylinder(0.025, 0.18, StylizedMaterials.bush())
	stem.position.y = 0.09
	root.add_child(stem)
	var petal_mat := StylizedMaterials.flower_petal() if _deco_rng.randf() < 0.6 else StylizedMaterials.flower_petal_alt()
	for i in 5:
		var ang := TAU * float(i) / 5.0
		var petal := _sphere(0.05, petal_mat)
		petal.scale = Vector3(1.0, 0.5, 1.4)
		petal.position = Vector3(cos(ang) * 0.07, 0.2, sin(ang) * 0.07)
		root.add_child(petal)
	var center := _sphere(0.045, StylizedMaterials.flower_center())
	center.position.y = 0.21
	root.add_child(center)


func _add_mushroom(floor_pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = floor_pos + Vector3(_jit(), 0.08, _jit())
	add_child(root)
	var stem := _cylinder(0.05, 0.14, StylizedMaterials.mushroom_stem())
	stem.position.y = 0.07
	root.add_child(stem)
	var cap := _sphere(0.13, StylizedMaterials.mushroom_cap())
	cap.scale = Vector3(1.0, 0.62, 1.0)
	cap.position.y = 0.16
	root.add_child(cap)
	for i in 3:
		var spot := _sphere(0.025, StylizedMaterials.mushroom_spot())
		var ang := TAU * float(i) / 3.0 + 0.5
		spot.position = Vector3(cos(ang) * 0.07, 0.2, sin(ang) * 0.07)
		root.add_child(spot)


func _add_pebble(floor_pos: Vector3) -> void:
	var pebble := _sphere(0.08, StylizedMaterials.pebble())
	pebble.scale = Vector3(1.2, 0.7, 1.0)
	pebble.position = floor_pos + Vector3(_jit(), 0.12, _jit())
	add_child(pebble)


func _jit() -> float:
	return _deco_rng.randf_range(-0.22, 0.22)


# --- Start / goal landmarks ----------------------------------------------

func _add_landmark_markers() -> void:
	for y in _rows:
		for x in _cols:
			var ch := _grid[y].substr(x, 1)
			var floor_pos := _cell_floor(x, y)
			if ch == "M":
				_add_marker_ring(floor_pos, StylizedMaterials.start_marker(), CELL * 0.42)
			elif ch == "C":
				_add_marker_ring(floor_pos, StylizedMaterials.goal_marker(), CELL * 0.46)


func _add_marker_ring(floor_pos: Vector3, mat: StandardMaterial3D, radius: float) -> void:
	var ring := _flat_disc(radius, mat)
	ring.position = floor_pos + Vector3(0.0, 0.1, 0.0)
	add_child(ring)


# --- Border greenery ------------------------------------------------------

func _add_border_greenery() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 9001
	var margin := 1.1
	for x in range(_cols):
		if rng.randf() > 0.5:
			continue
		var north := Vector3(_origin.x + float(x) * CELL + CELL * 0.5, 0.0, _origin.z - margin)
		var south := Vector3(north.x, 0.0, _origin.z + float(_rows) * CELL + margin)
		_add_bush(north, rng)
		_add_bush(south, rng)
	for y in range(_rows):
		if rng.randf() > 0.5:
			continue
		var west := Vector3(_origin.x - margin, 0.0, _origin.z + float(y) * CELL + CELL * 0.5)
		var east := Vector3(_origin.x + float(_cols) * CELL + margin, 0.0, west.z)
		_add_bush(west, rng)
		_add_bush(east, rng)


func _add_bush(pos: Vector3, rng: RandomNumberGenerator) -> void:
	var root := Node3D.new()
	root.position = pos + Vector3(rng.randf_range(-0.15, 0.15), 0.0, rng.randf_range(-0.15, 0.15))
	add_child(root)
	var n := rng.randi_range(2, 3)
	for i in n:
		var puff := _sphere(rng.randf_range(0.22, 0.32), StylizedMaterials.bush())
		puff.scale = Vector3(1.0, 0.8, 1.0)
		puff.position = Vector3(rng.randf_range(-0.2, 0.2), rng.randf_range(0.16, 0.28), rng.randf_range(-0.2, 0.2))
		root.add_child(puff)


# --- Mesh helpers ---------------------------------------------------------

func _box(size: Vector3, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
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
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return node


func _cylinder(radius: float, height: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	node.mesh = mesh
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return node


func _flat_disc(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = 0.04
	node.mesh = mesh
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node
