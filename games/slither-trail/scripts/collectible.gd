extends Node3D
## A single collectible item in the garden. Built procedurally from a config so
## one class covers apples (color mode), strawberries (counting), circles/squares
## (shapes) and letter tiles (letters/words). Items gently bob and spin, glow
## softly, and play a happy pop when collected.

const SlitherMaterials := preload("res://scripts/stylized_materials.gd")

var kind := ""          # apple_green | apple_red | strawberry | circle | square | letter
var glyph := ""         # for letter tiles
var is_target := false  # true = good to collect, false = gently encourage avoiding
var seq_index := -1     # ordering for letter / word modes

var _t := 0.0
var _spin := 0.0
var _bob_amp := 0.12
var _collected := false
var _content: Node3D
var _glow: MeshInstance3D
var _label: Label3D


func setup(config: Dictionary) -> void:
	kind = str(config.get("kind", "apple_green"))
	glyph = str(config.get("glyph", ""))
	is_target = bool(config.get("target", true))
	seq_index = int(config.get("seq_index", -1))
	_spin = randf_range(0.0, TAU)

	_glow = _disc(0.46, SlitherMaterials.collectible_glow())
	_glow.position = Vector3(0, 0.04, 0)
	add_child(_glow)

	# A little cream pedestal lifts each item so it reads clearly above the grass.
	var pedestal := _cylinder_shape(0.26, 0.1, SlitherMaterials.make(Color(1.0, 0.99, 0.9)))
	pedestal.position = Vector3(0, 0.1, 0)
	add_child(pedestal)

	_content = Node3D.new()
	_content.position = Vector3(0, 0.5, 0)
	_content.scale = Vector3(1.2, 1.2, 1.2)
	add_child(_content)

	match kind:
		"apple_green": _build_apple(SlitherMaterials.apple_green())
		"apple_red": _build_apple(SlitherMaterials.apple_red())
		"strawberry": _build_strawberry()
		"circle": _build_circle()
		"square": _build_square()
		"letter": _build_letter()
		_: _build_apple(SlitherMaterials.apple_green())


func set_next(on: bool) -> void:
	# Highlight the next letter/word tile the child should look for.
	if _label:
		_label.modulate = Color(0.85, 0.45, 0.1) if on else Color(0.25, 0.3, 0.35)
	if kind == "letter":
		for c in _content.get_children():
			if c is MeshInstance3D and (c as MeshInstance3D).mesh is BoxMesh:
				(c as MeshInstance3D).material_override = (
					SlitherMaterials.letter_tile_next() if on else SlitherMaterials.letter_tile()
				)
	_bob_amp = 0.2 if on else 0.12


func play_collect() -> void:
	_collected = true
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(_content, "scale", Vector3(1.6, 1.6, 1.6), 0.12)
	tween.tween_property(self, "position:y", position.y + 0.6, 0.25).set_trans(Tween.TRANS_SINE)
	tween.chain().tween_property(_content, "scale", Vector3.ZERO, 0.18)


func _process(delta: float) -> void:
	_t += delta
	if _collected:
		return
	_content.position.y = 0.55 + sin(_t * 2.4 + _spin) * _bob_amp
	_content.rotation.y = _t * 0.9 + _spin
	if _glow:
		var p := 1.0 + sin(_t * 3.0 + _spin) * 0.12
		_glow.scale = Vector3(p, 1.0, p)


# --- Builders ------------------------------------------------------------

func _build_apple(mat: StandardMaterial3D) -> void:
	var body := _sphere(0.26, mat)
	body.scale = Vector3(1.0, 0.92, 1.0)
	_content.add_child(body)
	var dimple := _sphere(0.06, mat)
	dimple.scale = Vector3(1.0, 0.4, 1.0)
	dimple.position = Vector3(0, 0.22, 0)
	_content.add_child(dimple)
	var stem := _cylinder(0.02, 0.12, SlitherMaterials.apple_stem())
	stem.position = Vector3(0, 0.3, 0)
	_content.add_child(stem)
	var leaf := _sphere(0.07, SlitherMaterials.leaf())
	leaf.scale = Vector3(1.4, 0.3, 0.8)
	leaf.position = Vector3(0.1, 0.32, 0)
	leaf.rotation_degrees = Vector3(0, 0, -30)
	_content.add_child(leaf)


func _build_strawberry() -> void:
	var berry := _cone(0.26, 0.42, SlitherMaterials.strawberry())
	berry.position = Vector3(0, -0.02, 0)
	_content.add_child(berry)
	# Seeds dotted around the berry.
	for i in 8:
		var ang := TAU * float(i) / 8.0
		var r := 0.18 - float(i % 2) * 0.04
		var seed := _sphere(0.022, SlitherMaterials.strawberry_seed())
		seed.position = Vector3(cos(ang) * r, 0.02 - float(i % 3) * 0.06, sin(ang) * r)
		_content.add_child(seed)
	# Leafy green crown on top.
	for i in 5:
		var ang2 := TAU * float(i) / 5.0
		var leaf := _sphere(0.07, SlitherMaterials.leaf())
		leaf.scale = Vector3(1.2, 0.3, 0.7)
		leaf.position = Vector3(cos(ang2) * 0.1, 0.2, sin(ang2) * 0.1)
		leaf.rotation_degrees = Vector3(0, rad_to_deg(ang2), 18)
		_content.add_child(leaf)


func _build_circle() -> void:
	# A thin disc lying flat — reads clearly as a circle from the tilted camera.
	var disc := _cylinder_shape(0.3, 0.12, SlitherMaterials.shape_circle())
	_content.add_child(disc)


func _build_square() -> void:
	var box := _box(Vector3(0.52, 0.12, 0.52), SlitherMaterials.shape_square())
	_content.add_child(box)


func _build_letter() -> void:
	var tile := _box(Vector3(0.5, 0.12, 0.5), SlitherMaterials.letter_tile())
	_content.add_child(tile)
	_label = Label3D.new()
	_label.text = glyph
	_label.font_size = 160
	_label.modulate = Color(0.25, 0.3, 0.35)
	_label.outline_size = 18
	_label.outline_modulate = Color(1, 1, 1)
	_label.pixel_size = 0.004
	_label.rotation_degrees = Vector3(-90, 0, 0)
	_label.position = Vector3(0, 0.08, 0)
	_label.billboard = BaseMaterial3D.BILLBOARD_DISABLED
	_label.no_depth_test = true
	_content.add_child(_label)


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
	return _cylinder_shape(radius, height, mat)


func _cylinder_shape(radius: float, height: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	node.mesh = mesh
	node.material_override = mat
	return node


func _cone(radius: float, height: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.0
	mesh.bottom_radius = radius
	mesh.height = height
	node.mesh = mesh
	node.material_override = mat
	node.rotation_degrees = Vector3(180, 0, 0)
	return node


func _box(size: Vector3, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
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
