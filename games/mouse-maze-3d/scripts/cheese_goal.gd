extends Node3D
## Golden cheese wedge goal — a real triangular wedge with holes, plus a gentle
## floating bob and glow so a young player can spot it instantly.

const StylizedMaterials := preload("res://scripts/stylized_materials.gd")

var _root: Node3D
var _light: OmniLight3D
var _anim_t := 0.0
var _collected := false


func _ready() -> void:
	_build()


func set_world_pos(world: Vector3) -> void:
	position = world
	# Reset collected state so the cheese is fresh on a new level.
	_collected = false
	if _root:
		_root.scale = Vector3.ONE
		_root.position.y = 0.35
	if _light:
		_light.light_energy = 0.9


func play_collected() -> void:
	_collected = true
	if _light:
		_light.light_energy = 3.2


func _build() -> void:
	_root = Node3D.new()
	_root.position.y = 0.35
	add_child(_root)

	var depth := 0.44
	var mat := StylizedMaterials.cheese()
	var wedge := MeshInstance3D.new()
	wedge.mesh = _wedge_mesh(0.66, 0.58, depth)
	wedge.material_override = mat
	wedge.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_root.add_child(wedge)

	# Holes on the big side faces.
	var hole_mat := StylizedMaterials.cheese_hole()
	var fz := depth * 0.5 + 0.001
	for p in [Vector3(0.04, 0.18, fz), Vector3(-0.14, 0.08, fz),
			Vector3(0.1, 0.04, -fz), Vector3(-0.07, 0.2, -fz)]:
		var hole := _sphere(0.06, hole_mat)
		hole.scale = Vector3(1, 1, 0.35)
		hole.position = p
		_root.add_child(hole)

	_light = OmniLight3D.new()
	_light.light_color = Color(1.0, 0.84, 0.42)
	_light.light_energy = 0.5
	_light.omni_range = 1.7
	_light.position = Vector3(0, 0.3, 0)
	_root.add_child(_light)


func _process(delta: float) -> void:
	_anim_t += delta
	if _root == null:
		return
	if not _collected:
		_root.position.y = 0.35 + sin(_anim_t * 2.6) * 0.06
		_root.rotation.y += delta * 0.9
	else:
		_root.position.y = lerpf(_root.position.y, 0.9, minf(1.0, delta * 4.0))
		_root.rotation.y += delta * 6.0
		_root.scale = _root.scale.lerp(Vector3(1.3, 1.3, 1.3), minf(1.0, delta * 4.0))


func _wedge_mesh(width: float, depth: float, height: float) -> ArrayMesh:
	# Triangular prism: triangle cross-section in X/Y, extruded along Z.
	var hw := width * 0.5
	var hd := depth * 0.5
	var v := PackedVector3Array([
		Vector3(-hw, 0, hd), Vector3(hw, 0, hd), Vector3(-hw, height, hd),       # front tri
		Vector3(-hw, 0, -hd), Vector3(hw, 0, -hd), Vector3(-hw, height, -hd),    # back tri
	])
	var faces := [
		[0, 1, 2],          # front
		[5, 4, 3],          # back
		[0, 2, 5], [0, 5, 3],   # tall left face
		[1, 4, 5], [1, 5, 2],   # slanted hypotenuse
		[0, 3, 4], [0, 4, 1],   # bottom
	]
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	for f in faces:
		var a: Vector3 = v[f[0]]
		var b: Vector3 = v[f[1]]
		var c: Vector3 = v[f[2]]
		var n := (b - a).cross(c - a).normalized()
		for p in [a, b, c]:
			verts.append(p)
			normals.append(n)
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return mesh


func _sphere(radius: float, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	node.mesh = mesh
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node
