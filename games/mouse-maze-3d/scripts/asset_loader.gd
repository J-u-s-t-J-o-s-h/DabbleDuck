class_name AssetLoader
extends RefCounted
## Helpers for loading shipped CC0 FBX models into the 3D maze.

const MOUSE := "res://assets/characters/mouse_chick.fbx"
const CHEESE := "res://assets/characters/cheese_singles.fbx"
const MUSHROOM := "res://assets/environment/mushroom.fbx"
const BUSH := "res://assets/environment/bush_broccoli.fbx"


static func instance(path: String) -> Node3D:
	if not ResourceLoader.exists(path):
		push_warning("[AssetLoader] Missing model: %s" % path)
		return null
	var packed := load(path) as PackedScene
	if packed == null:
		push_warning("[AssetLoader] Could not load: %s" % path)
		return null
	return packed.instantiate() as Node3D


static func fit_on_ground(node: Node3D, target_height: float) -> void:
	var aabb := _combined_aabb(node)
	if aabb.size.y <= 0.001:
		return
	var scale := target_height / aabb.size.y
	node.scale = Vector3.ONE * scale
	aabb = _combined_aabb(node)
	node.position.y -= aabb.position.y


static func tint(node: Node, color: Color, emission: Color = Color.BLACK, emission_energy: float = 0.0) -> void:
	if node is MeshInstance3D:
		var mesh := node as MeshInstance3D
		var mat := StandardMaterial3D.new()
		mat.albedo_color = color
		mat.roughness = 0.9
		mat.metallic = 0.0
		mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
		if emission != Color.BLACK:
			mat.emission_enabled = true
			mat.emission = emission
			mat.emission_energy_multiplier = emission_energy
		mesh.material_override = mat
	for child in node.get_children():
		tint(child, color, emission, emission_energy)


static func _combined_aabb(node: Node3D) -> AABB:
	var found := false
	var box := AABB()
	for child in node.get_children():
		if child is MeshInstance3D:
			var mesh := child as MeshInstance3D
			if mesh.mesh == null:
				continue
			var local := mesh.mesh.get_aabb()
			local = local * mesh.transform
			box = local if not found else box.merge(local)
			found = true
		elif child is Node3D:
			var sub := _combined_aabb(child as Node3D)
			if sub.size != Vector3.ZERO:
				sub = sub * (child as Node3D).transform
				box = sub if not found else box.merge(sub)
				found = true
	return box if found else AABB(Vector3.ZERO, Vector3.ONE)
