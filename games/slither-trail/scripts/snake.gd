extends Node3D
## The friendly garden snake. The head moves smoothly across the lawn; the body
## is a trail of segments that follow along the path the head has travelled, so
## the snake curves and slithers naturally and grows in an obvious, happy way.
##
## Built facing +Z (toward the camera's "down"); heading is a unit vector on the
## XZ plane where x = world X and y = world Z, matching the grid arrow mapping.

const SlitherMaterials := preload("res://scripts/stylized_materials.gd")

const HEAD_Y := 0.50
const BODY_Y := 0.42
const RESAMPLE := 0.05          # how often the travelled path is sampled
const SEG_SPACING := 0.50       # gap between body segment centers
const TURN_RATE := 9.0          # how quickly heading eases toward the desired dir
const HEAD_SCALE := 1.85        # the snake is the star — make it big and readable
const SEG_SCALE := 1.7

signal moved(distance: float)

var speed := 3.2
var bounds_min := Vector2(-8, -8)
var bounds_max := Vector2(8, 8)

var _head: Node3D
var _tongue: Node3D
var _shadow: MeshInstance3D
var _seg_nodes: Array[Node3D] = []
var _path: Array[Vector3] = []
var _head_pos := Vector3.ZERO
var _heading := Vector2(0, 1)
var _desired := Vector2(0, 1)
var _length := 4
var _yaw := 0.0
var _anim_t := 0.0
var _won := false
var _active := false


func _ready() -> void:
	_shadow = _disc(0.5, SlitherMaterials.shadow_blob())
	_shadow.position = Vector3(0, 0.02, 0)
	add_child(_shadow)
	_build_head()
	_head.scale = Vector3(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE)


# --- Public API ----------------------------------------------------------

func reset(pos: Vector3, dir: Vector2i, seg_count: int) -> void:
	_head_pos = Vector3(pos.x, HEAD_Y, pos.z)
	var d := Vector2(dir.x, dir.y)
	if d.length_squared() < 0.001:
		d = Vector2(0, 1)
	_heading = d.normalized()
	_desired = _heading
	_length = maxi(2, seg_count)
	_won = false
	_yaw = atan2(_heading.x, _heading.y)
	_path.clear()
	var back := Vector3(-_heading.x, 0, -_heading.y)
	for i in range(1, 420):
		_path.append(_head_pos + back * (float(i) * RESAMPLE))
	_ensure_segments(_length)
	_layout_now()


func set_active(on: bool) -> void:
	_active = on


func set_direction(dir: Vector2i) -> void:
	if dir == Vector2i.ZERO:
		return
	_desired = Vector2(dir.x, dir.y).normalized()


func set_bounds(bmin: Vector2, bmax: Vector2) -> void:
	bounds_min = bmin
	bounds_max = bmax


func head_position() -> Vector3:
	return _head_pos


func length() -> int:
	return _length


func grow(amount: int = 1) -> void:
	_length += amount
	_ensure_segments(_length)


func celebrate() -> void:
	_won = true
	_active = false


# --- Movement ------------------------------------------------------------

func _process(delta: float) -> void:
	_anim_t += delta
	if _active and not _won:
		_advance(delta)
	_animate_head(delta)
	_layout_segments()


func _advance(delta: float) -> void:
	# Ease the heading toward the desired direction for a smooth, slithery turn.
	_heading = _heading.lerp(_desired, minf(1.0, delta * TURN_RATE))
	if _heading.length_squared() < 0.0001:
		_heading = _desired
	_heading = _heading.normalized()

	var step := speed * delta
	var new_pos := _head_pos + Vector3(_heading.x, 0, _heading.y) * step
	# Soft boundary: clamp so the snake gently slides along the fence, never dies.
	new_pos.x = clampf(new_pos.x, bounds_min.x, bounds_max.x)
	new_pos.z = clampf(new_pos.z, bounds_min.y, bounds_max.y)
	new_pos.y = HEAD_Y

	var dist := _head_pos.distance_to(new_pos)
	_head_pos = new_pos
	if dist > 0.0001:
		moved.emit(dist)

	if _path.is_empty() or _head_pos.distance_to(_path[0]) >= RESAMPLE:
		_path.push_front(_head_pos)
	var cap := int(float(_length + 3) * SEG_SPACING / RESAMPLE) + 12
	while _path.size() > cap:
		_path.pop_back()


func _animate_head(delta: float) -> void:
	_yaw = lerp_angle(_yaw, atan2(_heading.x, _heading.y), minf(1.0, delta * 10.0))
	_head.position = Vector3(_head_pos.x, _head_pos.y, _head_pos.z)
	_head.rotation.y = _yaw
	_shadow.position = Vector3(_head_pos.x, 0.02, _head_pos.z)

	if _won:
		# Happy hop + wiggle celebration.
		_head.position.y = _head_pos.y + absf(sin(_anim_t * 9.0)) * 0.22
		_head.rotation.z = sin(_anim_t * 12.0) * 0.16
	else:
		_head.position.y = _head_pos.y + sin(_anim_t * 3.2) * 0.03
		_head.rotation.z = 0.0

	# Tongue flick a few times a second.
	if _tongue:
		var flick: float = fmod(_anim_t, 1.6)
		var out: float = 1.0 if flick < 0.18 or (flick > 0.3 and flick < 0.42) else 0.35
		_tongue.scale.z = lerpf(_tongue.scale.z, out, minf(1.0, delta * 18.0))


func _layout_now() -> void:
	_animate_head(0.016)
	_layout_segments()


func _layout_segments() -> void:
	for i in _seg_nodes.size():
		var seg := _seg_nodes[i]
		var active := i < _length
		seg.visible = active
		if not active:
			continue
		var d := float(i + 1) * SEG_SPACING
		var p := _point_at_distance(d)
		# Subtle slither: sway each segment a touch when moving in a line.
		var wob := sin(_anim_t * 6.0 - float(i) * 0.6) * 0.04
		var perp := Vector3(-_heading.y, 0, _heading.x) * wob
		seg.position = Vector3(p.x + perp.x, BODY_Y, p.z + perp.z)
		var taper := lerpf(1.0, 0.55, float(i) / float(maxi(1, _length)))
		seg.scale = Vector3(taper, taper, taper) * SEG_SCALE


func _point_at_distance(d: float) -> Vector3:
	var remaining := d
	var prev := _head_pos
	for i in _path.size():
		var p: Vector3 = _path[i]
		var seg := prev.distance_to(p)
		if seg >= remaining:
			if seg <= 0.00001:
				return p
			return prev.lerp(p, remaining / seg)
		remaining -= seg
		prev = p
	return prev


# --- Construction --------------------------------------------------------

func _ensure_segments(count: int) -> void:
	while _seg_nodes.size() < count:
		var seg := _make_segment(_seg_nodes.size())
		add_child(seg)
		_seg_nodes.append(seg)


func _make_segment(index: int) -> Node3D:
	var node := Node3D.new()
	var body := _sphere(0.26, SlitherMaterials.snake_body())
	body.scale = Vector3(1.05, 0.95, 1.05)
	node.add_child(body)
	# Lighter belly underside.
	var belly := _sphere(0.20, SlitherMaterials.snake_belly())
	belly.scale = Vector3(0.95, 0.55, 0.95)
	belly.position = Vector3(0, -0.08, 0)
	node.add_child(belly)
	# A little back-pattern spot every other segment.
	if index % 2 == 0:
		var spot := _sphere(0.10, SlitherMaterials.snake_pattern())
		spot.scale = Vector3(1.0, 0.5, 1.0)
		spot.position = Vector3(0, 0.2, 0)
		node.add_child(spot)
	return node


func _build_head() -> void:
	_head = Node3D.new()
	add_child(_head)

	var green := SlitherMaterials.snake_body()

	var skull := _sphere(0.34, green)
	skull.scale = Vector3(1.05, 0.98, 1.12)
	skull.position = Vector3(0, 0, 0)
	_head.add_child(skull)

	# Snout / belly highlight on the lower front.
	var snout := _sphere(0.24, SlitherMaterials.snake_belly())
	snout.scale = Vector3(0.9, 0.62, 0.9)
	snout.position = Vector3(0, -0.10, 0.18)
	_head.add_child(snout)

	# Big readable eyes, set high and forward.
	for side in [-1.0, 1.0]:
		var white := _sphere(0.135, SlitherMaterials.snake_eye())
		white.position = Vector3(0.15 * side, 0.16, 0.20)
		_head.add_child(white)
		var pupil := _sphere(0.075, SlitherMaterials.snake_pupil())
		pupil.position = Vector3(0.165 * side, 0.16, 0.30)
		_head.add_child(pupil)
		var glint := _sphere(0.03, SlitherMaterials.snake_glint())
		glint.position = Vector3(0.19 * side, 0.20, 0.34)
		_head.add_child(glint)
		# Rosy cheeks.
		var cheek := _sphere(0.07, SlitherMaterials.snake_cheek())
		cheek.scale = Vector3(1.2, 0.7, 0.6)
		cheek.position = Vector3(0.24 * side, 0.0, 0.18)
		_head.add_child(cheek)

	# Friendly smile — a thin dark curve made of small dark spheres.
	for i in 5:
		var f := (float(i) / 4.0) - 0.5
		var m := _sphere(0.028, SlitherMaterials.snake_pupil())
		m.position = Vector3(f * 0.22, -0.12 - absf(f) * -0.04, 0.34)
		_head.add_child(m)

	# Forked tongue that flicks in and out.
	_tongue = Node3D.new()
	_tongue.position = Vector3(0, -0.10, 0.36)
	_head.add_child(_tongue)
	var stalk := _cylinder(0.018, 0.16, SlitherMaterials.snake_tongue())
	stalk.rotation_degrees = Vector3(90, 0, 0)
	stalk.position = Vector3(0, 0, 0.08)
	_tongue.add_child(stalk)
	for side in [-1.0, 1.0]:
		var fork := _cylinder(0.014, 0.09, SlitherMaterials.snake_tongue())
		fork.rotation_degrees = Vector3(90, 22 * side, 0)
		fork.position = Vector3(0.025 * side, 0, 0.18)
		_tongue.add_child(fork)
	_tongue.scale.z = 0.35


# --- Mesh helpers --------------------------------------------------------

func _sphere(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 14
	mesh.rings = 7
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


func _disc(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = 0.02
	node.mesh = mesh
	node.material_override = mat
	return node
