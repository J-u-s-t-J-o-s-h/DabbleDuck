extends Node3D
## Procedural low-poly player character. Supports mouse / bunny / turtle, all
## built facing +Z so the shared movement, facing, and animation logic works
## for every character. Reads clearly from the tilted bird's-eye camera.

const StylizedMaterials := preload("res://scripts/stylized_materials.gd")

const SCALE := 2.0

var character_type := "mouse"
var _body: Node3D
var _spot_ring: MeshInstance3D
var _target := Vector3.ZERO
var _moving := false
var _won := false
var _anim_t := 0.0
var _yaw := 0.0
var _yaw_target := 0.0


func _ready() -> void:
	_spot_ring = _disc(0.34, StylizedMaterials.shadow_blob())
	_spot_ring.position = Vector3(0.0, 0.015, 0.0)
	add_child(_spot_ring)
	_make_body()


func set_character(type: String) -> void:
	character_type = type
	if _body:
		_body.queue_free()
		_body = null
	_make_body()


func snap_to_world(world: Vector3) -> void:
	_target = world
	position = world
	_moving = false
	# Reset win state so the character is playable again on a new level.
	_won = false
	if _body:
		_body.position.y = 0.0
		_body.rotation.z = 0.0


func move_to_world(world: Vector3, dir: Vector2i) -> void:
	_target = world
	_moving = true
	face_dir(dir)


func look_toward(world: Vector3) -> void:
	if _moving or _won:
		return
	var flat := Vector3(world.x - global_position.x, 0.0, world.z - global_position.z)
	if flat.length_squared() < 0.0004:
		return
	_yaw_target = atan2(flat.x, flat.z)


func play_win() -> void:
	_won = true
	_moving = false
	_target = position


## Turn to face the pressed direction. Mapping matches the tilted camera:
## model forward is +Z, +Z = toward camera (down), -Z = up, +X = right, -X = left.
func face_dir(dir: Vector2i) -> void:
	match dir:
		Vector2i(0, -1):
			_yaw_target = PI
		Vector2i(0, 1):
			_yaw_target = 0.0
		Vector2i(1, 0):
			_yaw_target = PI * 0.5
		Vector2i(-1, 0):
			_yaw_target = -PI * 0.5


# --- Character construction ----------------------------------------------

func _make_body() -> void:
	_body = Node3D.new()
	_body.scale = Vector3(SCALE, SCALE, SCALE)
	add_child(_body)
	match character_type:
		"bunny":
			_build_bunny()
		"turtle":
			_build_turtle()
		_:
			_build_mouse()


func _build_mouse() -> void:
	var grey := StylizedMaterials.mouse_body()

	var torso := _sphere(0.21, grey)
	torso.scale = Vector3(1.0, 0.82, 1.25)
	torso.position = Vector3(0.0, 0.2, -0.04)
	_body.add_child(torso)

	var belly := _sphere(0.16, StylizedMaterials.mouse_belly())
	belly.scale = Vector3(0.9, 0.6, 1.1)
	belly.position = Vector3(0.0, 0.12, 0.04)
	_body.add_child(belly)

	var head := _sphere(0.17, grey)
	head.scale = Vector3(1.0, 0.95, 1.0)
	head.position = Vector3(0.0, 0.26, 0.18)
	_body.add_child(head)

	for side in [-1.0, 1.0]:
		var ear := _sphere(0.11, grey)
		ear.scale = Vector3(1.0, 1.0, 0.45)
		ear.position = Vector3(0.13 * side, 0.42, 0.12)
		ear.rotation_degrees = Vector3(-12, 18 * side, 0)
		_body.add_child(ear)
		var inner := _disc(0.07, StylizedMaterials.mouse_ear_inner())
		inner.rotation_degrees = Vector3(78, 18 * side, 0)
		inner.position = Vector3(0.13 * side, 0.42, 0.15)
		_body.add_child(inner)

	_add_face(0.08, 0.3, 0.31, 0.038, 0.0, 0.22, 0.4, 0.032)

	for side in [-1.0, 1.0]:
		for i in 2:
			var w := _cylinder(0.005, 0.18, StylizedMaterials.mouse_eye())
			w.rotation_degrees = Vector3(0, 0, 90 + 18 * side)
			w.position = Vector3(0.12 * side, 0.21 + 0.03 * i, 0.34)
			_body.add_child(w)

	var tail := _cylinder(0.02, 0.34, StylizedMaterials.mouse_tail())
	tail.rotation_degrees = Vector3(58, 0, 0)
	tail.position = Vector3(0.0, 0.18, -0.28)
	_body.add_child(tail)


func _build_bunny() -> void:
	var white := StylizedMaterials.bunny_body()

	var torso := _sphere(0.22, white)
	torso.scale = Vector3(1.0, 1.0, 1.15)
	torso.position = Vector3(0.0, 0.24, -0.02)
	_body.add_child(torso)

	var head := _sphere(0.16, white)
	head.position = Vector3(0.0, 0.36, 0.16)
	_body.add_child(head)

	# Long upright ears, leaning slightly back and out.
	for side in [-1.0, 1.0]:
		var ear := _sphere(0.075, white)
		ear.scale = Vector3(0.8, 2.7, 0.5)
		ear.position = Vector3(0.08 * side, 0.66, 0.08)
		ear.rotation_degrees = Vector3(-12, 0, 7 * side)
		_body.add_child(ear)
		var inner := _sphere(0.045, StylizedMaterials.mouse_ear_inner())
		inner.scale = Vector3(0.7, 2.3, 0.4)
		inner.position = Vector3(0.08 * side, 0.67, 0.11)
		inner.rotation_degrees = Vector3(-12, 0, 7 * side)
		_body.add_child(inner)

	_add_face(0.07, 0.4, 0.27, 0.038, 0.0, 0.34, 0.3, 0.03)

	# Fluffy round tail.
	var tail := _sphere(0.1, StylizedMaterials.bunny_tail())
	tail.position = Vector3(0.0, 0.22, -0.24)
	_body.add_child(tail)

	# Front feet.
	for side in [-1.0, 1.0]:
		var foot := _sphere(0.07, white)
		foot.scale = Vector3(1.0, 0.5, 1.6)
		foot.position = Vector3(0.1 * side, 0.06, 0.16)
		_body.add_child(foot)


func _build_turtle() -> void:
	var green := StylizedMaterials.turtle_body()

	var torso := _sphere(0.24, green)
	torso.scale = Vector3(1.2, 0.5, 1.3)
	torso.position = Vector3(0.0, 0.14, 0.0)
	_body.add_child(torso)

	# Domed shell.
	var shell := _sphere(0.26, StylizedMaterials.turtle_shell())
	shell.scale = Vector3(1.15, 0.95, 1.2)
	shell.position = Vector3(0.0, 0.2, -0.02)
	_body.add_child(shell)
	for offset in [Vector3(0.0, 0.12, 0.0), Vector3(-0.14, 0.06, 0.02),
			Vector3(0.14, 0.06, 0.02), Vector3(0.0, 0.07, -0.16)]:
		var spot := _sphere(0.07, StylizedMaterials.turtle_shell_spot())
		spot.scale = Vector3(1.0, 0.4, 1.0)
		spot.position = Vector3(0.0, 0.32, 0.0) + offset
		_body.add_child(spot)

	# Head poking forward.
	var head := _sphere(0.12, green)
	head.position = Vector3(0.0, 0.2, 0.34)
	_body.add_child(head)
	_add_face(0.05, 0.24, 0.42, 0.028, 0.0, 0.0, 0.0, 0.0)

	# Stubby legs.
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			var leg := _sphere(0.075, green)
			leg.scale = Vector3(1.0, 0.7, 1.0)
			leg.position = Vector3(0.18 * sx, 0.06, 0.16 * sz)
			_body.add_child(leg)

	var tail := _cylinder(0.03, 0.12, green)
	tail.rotation_degrees = Vector3(70, 0, 0)
	tail.position = Vector3(0.0, 0.12, -0.3)
	_body.add_child(tail)


## Shared eyes (+ optional nose when nose_r > 0).
func _add_face(eye_x: float, eye_y: float, eye_z: float, eye_r: float,
		nose_x: float, nose_y: float, nose_z: float, nose_r: float) -> void:
	for side in [-1.0, 1.0]:
		var eye := _sphere(eye_r, StylizedMaterials.mouse_eye())
		eye.position = Vector3(eye_x * side, eye_y, eye_z)
		_body.add_child(eye)
		var glint := _sphere(eye_r * 0.34, StylizedMaterials.mouse_eye_white())
		glint.position = Vector3((eye_x + 0.01) * side, eye_y + 0.02, eye_z + 0.03)
		_body.add_child(glint)
	if nose_r > 0.0:
		var nose := _sphere(nose_r, StylizedMaterials.mouse_nose())
		nose.position = Vector3(nose_x, nose_y, nose_z)
		_body.add_child(nose)


func _process(delta: float) -> void:
	_anim_t += delta
	_yaw = lerp_angle(_yaw, _yaw_target, minf(1.0, delta * 12.0))
	if _body:
		_body.rotation.y = _yaw

	if _spot_ring:
		var p := 1.0 + sin(_anim_t * 3.0) * 0.05
		_spot_ring.scale = Vector3(p, 1.0, p)

	if _won:
		if _body:
			_body.position.y = absf(sin(_anim_t * 9.0)) * 0.18
			_body.rotation.z = sin(_anim_t * 11.0) * 0.12
	elif _moving:
		position = position.lerp(_target, minf(1.0, delta * 13.0))
		if position.distance_to(_target) < 0.02:
			position = _target
			_moving = false
		if _body:
			_body.position.y = absf(sin(_anim_t * 20.0)) * 0.08
	else:
		position = _target
		if _body:
			_body.position.y = sin(_anim_t * 2.6) * 0.015
			_body.rotation.z = 0.0


func _sphere(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 14
	mesh.rings = 7
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


func _disc(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = 0.02
	node.mesh = mesh
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node
