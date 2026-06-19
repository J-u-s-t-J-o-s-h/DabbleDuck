extends Node2D
## Glowing, bobbing cheese with sparkle particles.

const TILE := 64

var _sprite: Sprite2D
var _glow: PointLight2D
var _sparkles: GPUParticles2D
var _won := false
var _base_scale := 0.22


func _ready() -> void:
	_glow = PointLight2D.new()
	_glow.energy = 0.55
	_glow.texture = _soft_light_texture()
	_glow.texture_scale = 2.2
	_glow.color = Color(1.0, 0.92, 0.55, 1.0)
	_glow.shadow_enabled = false
	add_child(_glow)

	_sprite = Sprite2D.new()
	_sprite.texture = load("res://assets/characters/cheese.png")
	_sprite.scale = Vector2(_base_scale, _base_scale)
	_sprite.z_index = 4
	add_child(_sprite)

	_sparkles = GPUParticles2D.new()
	_sparkles.amount = 24
	_sparkles.lifetime = 1.2
	_sparkles.preprocess = 0.5
	_sparkles.explosiveness = 0.0
	_sparkles.randomness = 0.4
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 8.0
	mat.initial_velocity_max = 22.0
	mat.gravity = Vector3(0, -15, 0)
	mat.scale_min = 0.15
	mat.scale_max = 0.35
	mat.color = Color(1.0, 0.95, 0.6, 0.9)
	_sparkles.process_material = mat
	_sparkles.z_index = 3
	add_child(_sparkles)


func set_grid_pos(grid: Vector2i, origin: Vector2) -> void:
	position = origin + Vector2(grid.x * TILE + TILE * 0.5, grid.y * TILE + TILE * 0.5)


func play_collected() -> void:
	_won = true
	_glow.energy = 1.2
	if _sparkles:
		_sparkles.amount = 48
		_sparkles.explosiveness = 0.85


func _process(_delta: float) -> void:
	var t := Time.get_ticks_msec() * 0.003
	if _won:
		_sprite.rotation = sin(t * 8.0) * 0.2
		_sprite.scale = Vector2(_base_scale * 1.15, _base_scale * 1.15)
	else:
		_sprite.position.y = sin(t * 2.2) * 6.0
		_sprite.rotation = sin(t * 1.5) * 0.05
		_glow.energy = 0.45 + sin(t * 2.0) * 0.15


func _soft_light_texture() -> Texture2D:
	var size := 64
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var center := Vector2(size * 0.5, size * 0.5)
	for y in size:
		for x in size:
			var d := center.distance_to(Vector2(x, y)) / (size * 0.5)
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	return ImageTexture.create_from_image(img)
