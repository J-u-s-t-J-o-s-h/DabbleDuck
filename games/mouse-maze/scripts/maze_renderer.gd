extends Node2D
## Garden maze tiles from Kenney Tiny Dungeon atlas (CC0).

const TILE := 64
const _SpriteUtils := preload("res://scripts/sprite_utils.gd")

var _dungeon_tex: Texture2D
var _floor_atlas: AtlasTexture
var _wall_atlas: AtlasTexture
var _deco_flower: Texture2D
var _deco_mushroom: Texture2D


func _ensure_textures() -> void:
	if _dungeon_tex == null:
		_dungeon_tex = load("res://assets/environment/dungeon_tilemap.png")
	if _floor_atlas == null and _dungeon_tex != null:
		# Tan path floor + stone wall from Kenney Tiny Dungeon sheet.
		_floor_atlas = _SpriteUtils.atlas_region(_dungeon_tex, 1, 1)
		_wall_atlas = _SpriteUtils.atlas_region(_dungeon_tex, 0, 2)
	if _deco_flower == null:
		_deco_flower = load("res://assets/environment/deco_flower.png")
	if _deco_mushroom == null:
		_deco_mushroom = load("res://assets/environment/deco_mushroom.png")


func build(grid: PackedStringArray, origin: Vector2) -> void:
	_ensure_textures()
	for child in get_children():
		child.queue_free()

	var rows := grid.size()
	if rows == 0:
		return

	for y in rows:
		var line := grid[y]
		for x in line.length():
			var cell := line[x]
			var center := origin + Vector2(x * TILE + TILE * 0.5, y * TILE + TILE * 0.5)
			if cell == "#":
				_add_wall(center)
			elif cell == ".":
				_add_floor(center)


func _sprite_from_atlas(atlas: AtlasTexture, center: Vector2, z: int) -> void:
	if atlas == null:
		return
	var s := Sprite2D.new()
	s.texture = atlas
	s.centered = true
	s.position = center
	var scale := TILE / float(_SpriteUtils.KENNEY_TILE)
	s.scale = Vector2(scale, scale)
	s.z_index = z
	add_child(s)


func _add_floor(center: Vector2) -> void:
	_sprite_from_atlas(_floor_atlas, center, 0)


func _add_wall(center: Vector2) -> void:
	var shadow := Sprite2D.new()
	shadow.texture = _ellipse_texture(40, 20)
	shadow.centered = true
	shadow.position = center + Vector2(3, 8)
	shadow.modulate = Color(0.08, 0.12, 0.08, 0.35)
	shadow.z_index = 1
	add_child(shadow)
	_sprite_from_atlas(_wall_atlas, center, 2)


func _add_deco(center: Vector2) -> void:
	var tex: Texture2D = _deco_flower if randf() < 0.5 else _deco_mushroom
	if tex == null:
		return
	var s := Sprite2D.new()
	s.texture = tex
	s.centered = true
	s.position = center + Vector2(randf_range(-4, 4), randf_range(-4, 4))
	var side: float = _SpriteUtils.scale_to_tile(tex, 0.35)
	s.scale = Vector2(side, side)
	s.z_index = 3
	add_child(s)


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
