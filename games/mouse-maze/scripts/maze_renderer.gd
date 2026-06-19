extends Node2D
## Builds textured garden maze tiles, hedge walls, and scattered decorations.

const TILE := 64

var _floor_tex: Texture2D
var _wall_tex: Texture2D
var _flower_tex: Texture2D
var _mushroom_tex: Texture2D


func _ensure_textures() -> void:
	if _floor_tex == null:
		_floor_tex = load("res://assets/environment/grass_floor.png")
	if _wall_tex == null:
		_wall_tex = load("res://assets/environment/hedge_wall.png")
	if _flower_tex == null:
		_flower_tex = load("res://assets/environment/deco_flower.png")
	if _mushroom_tex == null:
		_mushroom_tex = load("res://assets/environment/deco_mushroom.png")


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
				if randf() < 0.14:
					_add_deco(center)


func _add_floor(center: Vector2) -> void:
	if _floor_tex != null:
		var s := Sprite2D.new()
		s.texture = _floor_tex
		s.centered = true
		s.position = center
		s.scale = Vector2(
			TILE / float(_floor_tex.get_width()),
			TILE / float(_floor_tex.get_height())
		)
		s.z_index = 0
		add_child(s)
	else:
		var rect := ColorRect.new()
		rect.size = Vector2(TILE - 2, TILE - 2)
		rect.position = center - rect.size * 0.5
		rect.color = Color.html("8fd06b")
		add_child(rect)


func _add_wall(center: Vector2) -> void:
	var shadow := Sprite2D.new()
	shadow.texture = _ellipse_texture(48, 24)
	shadow.centered = true
	shadow.position = center + Vector2(4, 10)
	shadow.modulate = Color(0.1, 0.15, 0.1, 0.35)
	shadow.z_index = 1
	add_child(shadow)

	if _wall_tex != null:
		var s := Sprite2D.new()
		s.texture = _wall_tex
		s.centered = true
		s.position = center
		s.scale = Vector2(
			TILE / float(_wall_tex.get_width()),
			TILE / float(_wall_tex.get_height())
		)
		s.z_index = 2
		add_child(s)
	else:
		var rect := ColorRect.new()
		rect.size = Vector2(TILE, TILE)
		rect.position = center - rect.size * 0.5
		rect.color = Color.html("227a3f")
		add_child(rect)


func _add_deco(center: Vector2) -> void:
	var tex: Texture2D = _flower_tex if randf() < 0.55 else _mushroom_tex
	if tex == null:
		return
	var s := Sprite2D.new()
	s.texture = tex
	s.centered = true
	s.position = center + Vector2(randf_range(-6, 6), randf_range(-6, 6))
	var side := TILE * 0.55 / float(tex.get_width())
	s.scale = Vector2(side, side)
	s.z_index = 3
	s.modulate = Color(1, 1, 1, 0.92)
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
