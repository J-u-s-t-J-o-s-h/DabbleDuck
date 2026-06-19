extends Node2D
## Kenney Tiny Creatures mouse — sized to fit one maze cell.

const TILE := 64
const _SpriteUtils := preload("res://scripts/sprite_utils.gd")

var _sprite: Sprite2D
var _shadow: Sprite2D
var _target := Vector2.ZERO
var _facing := 1.0
var _moving := false
var _won := false
var _anim_t := 0.0
var _base_scale := 1.0


func _ready() -> void:
	_shadow = Sprite2D.new()
	_shadow.texture = _ellipse_texture(36, 18)
	_shadow.centered = true
	_shadow.modulate = Color(0.12, 0.18, 0.12, 0.3)
	_shadow.position = Vector2(0, TILE * 0.18)
	_shadow.z_index = -1
	add_child(_shadow)

	_sprite = Sprite2D.new()
	var tex := load("res://assets/characters/mouse.png") as Texture2D
	_sprite.texture = tex
	_base_scale = _SpriteUtils.scale_to_tile(tex, 0.52)
	_sprite.scale = Vector2(_base_scale * _facing, _base_scale)
	_sprite.z_index = 5
	add_child(_sprite)


func grid_to_world(grid: Vector2i, origin: Vector2) -> Vector2:
	return origin + Vector2(grid.x * TILE + TILE * 0.5, grid.y * TILE + TILE * 0.5)


func snap_to_grid(grid: Vector2i, origin: Vector2) -> void:
	_target = grid_to_world(grid, origin)
	position = _target
	_moving = false


func move_to_grid(grid: Vector2i, origin: Vector2, dir: Vector2i) -> void:
	_target = grid_to_world(grid, origin)
	_moving = true
	if dir.x < 0:
		_facing = -1.0
	elif dir.x > 0:
		_facing = 1.0
	_sprite.scale.x = _base_scale * _facing


func play_win() -> void:
	_won = true
	_moving = false
	_target = position


func _process(delta: float) -> void:
	_anim_t += delta
	if _won:
		var bounce := sin(_anim_t * 14.0) * 6.0
		_sprite.position.y = bounce
		_sprite.rotation = sin(_anim_t * 12.0) * 0.15
		_sprite.scale = Vector2(_base_scale * _facing * 1.08, _base_scale * 1.08)
	elif _moving:
		position = position.lerp(_target, minf(1.0, delta * 16.0))
		if position.distance_to(_target) < 1.5:
			position = _target
			_moving = false
		var hop := sin(_anim_t * 22.0) * 3.0
		_sprite.position.y = hop
		_sprite.rotation = 0.0
	else:
		position = _target
		var breathe := sin(_anim_t * 2.4) * 0.015
		_sprite.scale = Vector2(_base_scale * _facing, _base_scale + breathe)
		_sprite.position.y = sin(_anim_t * 2.4) * 1.0
		_sprite.rotation = 0.0


func _ellipse_texture(w: int, h: int) -> ImageTexture:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var cx := float(w) * 0.5
	var cy := float(h) * 0.5
	for y in h:
		for x in w:
			var nx := (float(x) - cx) / cx
			var ny := (float(y) - cy) / cy
			if nx * nx + ny * ny <= 1.0:
				img.set_pixel(x, y, Color.WHITE)
	return ImageTexture.create_from_image(img)
