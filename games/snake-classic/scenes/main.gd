extends Node3D
## Classic Snake — the simple, timeless loop: move on a grid, eat apples, grow,
## don't run into the walls or yourself. Kid-friendly presentation (cozy garden
## board, gentle "oops, play again?" instead of a harsh game over) but classic
## mechanics underneath. Speaks the DabbleDuck v1 contract.

const GRID := 14
const CELL := 1.0
const Y := 0.3
const TICK_BASE := 0.20
const TICK_MIN := 0.10

var _cells: Array[Vector2i] = []
var _dir := Vector2i(1, 0)
var _next_dir := Vector2i(1, 0)
var _food := Vector2i.ZERO
var _accum := 0.0
var _running := false
var _dead := false

var _score := 0
var _best := 0
var _games := 0
var _start_ms := 0

var _origin := Vector3.ZERO
var _seg_nodes: Array[MeshInstance3D] = []
var _head_node: Node3D
var _food_node: Node3D
var _rng := RandomNumberGenerator.new()
var _anim_t := 0.0
var _autopilot := false

# Smooth movement: every visual node glides from its previous cell to the new
# one over exactly one tick, giving constant-velocity gliding instead of a snap.
var _head_from := Vector3.ZERO
var _head_to := Vector3.ZERO
var _body_from: Array[Vector3] = []
var _body_to: Array[Vector3] = []
var _tick_dur := TICK_BASE

# Snake color (chosen by the player, remembered in module state).
var _color_name := "green"
var _body_color := Color(0.24, 0.74, 0.38)
var _body_mat: StandardMaterial3D
var _head_mat: StandardMaterial3D
var _picking := false

# Difficulty controls how fast the snake moves (and how much it speeds up as it
# grows). Chosen by the player, remembered in module state.
var _difficulty := "medium"
var _tick_base := TICK_BASE
var _tick_min := TICK_MIN
var _tick_accel := 0.005

@onready var _world: Node3D = $World
@onready var _camera: Camera3D = $CameraRig/Camera3D
@onready var _camera_rig: Node3D = $CameraRig
@onready var _hud: CanvasLayer = $HUD
@onready var _audio: Node = $GameAudio


func _ready() -> void:
	call_deferred("_boot")


func _boot() -> void:
	_setup_window()
	_rng.randomize()
	_origin = Vector3(-GRID * CELL * 0.5, 0.0, -GRID * CELL * 0.5)
	_start_ms = Time.get_ticks_msec()

	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY:
		_best = int(prev.get("highScore", 0))
		_games = int(prev.get("plays", 0))
		_color_name = String(prev.get("color", _color_name))
		_difficulty = String(prev.get("difficulty", _difficulty))
	_set_color(_color_name)
	_set_difficulty(_difficulty)

	_build_board()
	_build_head()
	_build_food()
	_setup_camera()
	if _audio.has_method("configure_from_sdk"):
		_audio.configure_from_sdk()
	_hud.move_requested.connect(_on_dpad)
	_hud.restart_requested.connect(_restart)
	_hud.color_chosen.connect(_on_color_chosen)
	_hud.difficulty_chosen.connect(_on_difficulty_chosen)

	_reset_game()

	var shot := _arg_str("--dabble-screenshot", "")
	if shot != "":
		await _capture_screenshot(shot)
		return

	DabbleSDK.emit_visit("play")

	if DabbleSDK.wants_autowin():
		DabbleSDK.emit_game_event("snake.started", {})
		_score = 6
		_hud.set_score(_score, maxi(_best, _score))
		await get_tree().create_timer(0.15).timeout
		_game_over()
		await get_tree().create_timer(0.1).timeout
		DabbleSDK.finish(_summary())
		return

	# Let the child pick a snake color first; the start prompt follows the choice.
	_picking = true
	_hud.show_color_picker(_palette(), _color_name)


# --- Game logic ----------------------------------------------------------

func _reset_game() -> void:
	var c := GRID / 2
	_cells = [Vector2i(c, c), Vector2i(c - 1, c), Vector2i(c - 2, c)]
	_dir = Vector2i(1, 0)
	_next_dir = Vector2i(1, 0)
	_score = 0
	_dead = false
	_running = false
	_accum = 0.0
	_tick_dur = _tick()
	_spawn_food()
	_layout_snap()
	_hud.set_score(_score, _best)


func _restart() -> void:
	_reset_game()
	_hud.show_message("Press an arrow key\nto start!", false)


func _process(delta: float) -> void:
	_anim_t += delta
	if _autopilot and _running and not _dead:
		_next_dir = _autopilot_dir()
	if _running and not _dead:
		_accum += delta
		while _accum >= _tick_dur:
			_accum -= _tick_dur
			_step()
			if _dead:
				break
	_animate(delta)


func _tick() -> float:
	return maxf(_tick_min, _tick_base - float(_score) * _tick_accel)


func _step() -> void:
	_dir = _next_dir
	var new_head: Vector2i = _cells[0] + _dir

	var will_grow := new_head == _food
	if _hits_wall(new_head) or _hits_body(new_head, will_grow):
		_game_over()
		return

	var prev_count := _cells.size()
	_cells.insert(0, new_head)
	if will_grow:
		_score += 1
		_audio.play_eat(_score)
		DabbleSDK.emit_game_event("snake.eat", {"score": _score})
		_hud.set_score(_score, maxi(_best, _score))
		if _all_filled():
			_game_over()
			return
		_spawn_food()
	else:
		_cells.pop_back()
	_begin_interp(prev_count)


func _hits_wall(cell: Vector2i) -> bool:
	return cell.x < 0 or cell.y < 0 or cell.x >= GRID or cell.y >= GRID


func _hits_body(cell: Vector2i, will_grow: bool) -> bool:
	# The tail cell is free to move into (it slides away) unless we're growing.
	var last := _cells.size() - 1
	for i in _cells.size():
		if not will_grow and i == last:
			continue
		if _cells[i] == cell:
			return true
	return false


func _all_filled() -> bool:
	return _cells.size() >= GRID * GRID


func _spawn_food() -> void:
	if _all_filled():
		return
	for attempt in 400:
		var p := Vector2i(_rng.randi_range(0, GRID - 1), _rng.randi_range(0, GRID - 1))
		if not _cells.has(p):
			_food = p
			return


func _game_over() -> void:
	if _dead:
		return
	_dead = true
	_running = false
	_games += 1
	_best = maxi(_best, _score)
	_audio.play_oops()

	DabbleSDK.emit_completion("games", 1)
	DabbleSDK.emit_game_event("snake.gameover", {
		"score": _score, "best": _best, "ms": Time.get_ticks_msec() - _start_ms
	})
	if _score >= 1:
		DabbleSDK.request_badge("snake-first-apple", "First Apple", "🍎")
	if _score >= 5:
		DabbleSDK.request_badge("snake-snacker", "Snake Snacker", "🐍")
	if _score >= 10:
		DabbleSDK.request_badge("snake-star", "Snake Star", "⭐")
	DabbleSDK.save_module_state(_state())

	var win := _all_filled()
	var msg := "You filled the board! 🎉\nScore: %d" % _score if win else "Oops!\nScore: %d    Best: %d" % [_score, _best]
	_hud.show_message(msg, true)


func _state() -> Dictionary:
	return {"plays": _games, "highScore": _best, "color": _color_name, "difficulty": _difficulty}


func _summary() -> Dictionary:
	return {"completions": {"games": 1}, "moduleState": _state()}


# --- Input ---------------------------------------------------------------

func _input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	if event.keycode == KEY_ESCAPE:
		DabbleSDK.finish(_summary())
		return
	if _picking:
		return
	if _dead:
		if event.keycode in [KEY_SPACE, KEY_ENTER, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_W, KEY_A, KEY_S, KEY_D]:
			_restart()
		return
	var dir := _key_dir(event.keycode)
	if dir != Vector2i.ZERO:
		_steer(dir)


func _key_dir(keycode: int) -> Vector2i:
	match keycode:
		KEY_UP, KEY_W: return Vector2i(0, -1)
		KEY_DOWN, KEY_S: return Vector2i(0, 1)
		KEY_LEFT, KEY_A: return Vector2i(-1, 0)
		KEY_RIGHT, KEY_D: return Vector2i(1, 0)
	return Vector2i.ZERO


func _on_dpad(dir: Vector2i) -> void:
	if _picking:
		return
	if _dead:
		_restart()
		return
	_steer(dir)


func _steer(dir: Vector2i) -> void:
	# Can't reverse straight back onto the neck.
	if _cells.size() > 1 and dir == -_dir:
		return
	_next_dir = dir
	if not _running:
		_running = true
		_tick_dur = _tick()
		_accum = _tick_dur
		_hud.hide_message()


func _on_color_chosen(name: String) -> void:
	_set_color(name)
	DabbleSDK.emit_game_event("snake.color", {"color": name})
	# Colour picked -> now choose how fast the snake should go.
	_hud.show_difficulty_picker(_difficulties(), _difficulty)


func _on_difficulty_chosen(name: String) -> void:
	_set_difficulty(name)
	_hud.hide_color_picker()
	_picking = false
	DabbleSDK.emit_game_event("snake.difficulty", {"difficulty": name})
	if not _dead and not _running:
		_hud.show_message("Press an arrow key\nto start!", false)


# --- Visuals -------------------------------------------------------------

func _cell_world(cell: Vector2i) -> Vector3:
	return _origin + Vector3(float(cell.x) * CELL + CELL * 0.5, Y, float(cell.y) * CELL + CELL * 0.5)


func _ensure_body(count: int) -> void:
	while _seg_nodes.size() < count:
		var seg := _sphere(0.4, _body_mat)
		_world.add_child(seg)
		_seg_nodes.append(seg)
	for i in _seg_nodes.size():
		_seg_nodes[i].visible = i < count


func _layout_snap() -> void:
	# Place everything directly on its current cell (used on reset / screenshots).
	var body := _cells.size() - 1
	_ensure_body(body)
	_head_to = _cell_world(_cells[0])
	_head_from = _head_to
	if _head_node:
		_head_node.position = _head_to
	_body_from.resize(body)
	_body_to.resize(body)
	for i in body:
		var p := _cell_world(_cells[i + 1])
		_body_to[i] = p
		_body_from[i] = p
		_seg_nodes[i].position = p
	_tick_dur = _tick()


func _begin_interp(prev_count: int) -> void:
	# Start a fresh glide: each node travels from where it visually is now to its
	# new cell over one tick. Newly grown segments simply appear at their spot.
	var body := _cells.size() - 1
	var prev_body := prev_count - 1
	_ensure_body(body)
	_head_from = _head_node.position
	_head_to = _cell_world(_cells[0])
	_body_from.resize(body)
	_body_to.resize(body)
	for i in body:
		_body_to[i] = _cell_world(_cells[i + 1])
		if i < prev_body and i < _seg_nodes.size():
			_body_from[i] = _seg_nodes[i].position
		else:
			_body_from[i] = _body_to[i]
	_tick_dur = _tick()


func _animate(delta: float) -> void:
	if _head_node:
		var t := 1.0
		if _running and not _dead and _tick_dur > 0.0:
			t = clampf(_accum / _tick_dur, 0.0, 1.0)
		_head_node.position = _head_from.lerp(_head_to, t)
		_head_node.rotation.y = lerp_angle(_head_node.rotation.y, atan2(float(_dir.x), float(_dir.y)), minf(1.0, delta * 12.0))
		_head_node.rotation.z = sin(_anim_t * 22.0) * 0.12 if _dead else 0.0
		var body := _cells.size() - 1
		for i in body:
			if i < _seg_nodes.size() and i < _body_from.size():
				_seg_nodes[i].position = _body_from[i].lerp(_body_to[i], t)
	if _food_node:
		_food_node.position = _cell_world(_food) + Vector3(0, 0.12 + sin(_anim_t * 3.0) * 0.08, 0)
		_food_node.rotation.y = _anim_t * 1.2


# --- Snake color ---------------------------------------------------------

func _palette() -> Array:
	return [
		{"name": "green", "color": Color(0.24, 0.74, 0.38)},
		{"name": "blue", "color": Color(0.30, 0.62, 0.95)},
		{"name": "purple", "color": Color(0.66, 0.46, 0.95)},
		{"name": "orange", "color": Color(0.97, 0.58, 0.24)},
		{"name": "pink", "color": Color(1.0, 0.50, 0.74)},
		{"name": "yellow", "color": Color(0.98, 0.83, 0.28)},
	]


func _color_for(name: String) -> Color:
	for entry in _palette():
		if entry["name"] == name:
			return entry["color"]
	return Color(0.24, 0.74, 0.38)


func _set_color(name: String) -> void:
	_color_name = name
	_body_color = _color_for(name)
	if _body_mat == null:
		_body_mat = _mat(_body_color)
	else:
		_body_mat.albedo_color = _body_color
	if _head_mat == null:
		_head_mat = _mat(_body_color.lightened(0.06))
	else:
		_head_mat.albedo_color = _body_color.lightened(0.06)


# --- Difficulty ----------------------------------------------------------

func _difficulties() -> Array:
	# base = seconds per step at score 0; min = fastest cap; accel = speed-up per apple.
	return [
		{"name": "easy", "label": "🐢  Easy", "base": 0.30, "min": 0.20, "accel": 0.0025},
		{"name": "medium", "label": "🙂  Medium", "base": 0.20, "min": 0.12, "accel": 0.005},
		{"name": "hard", "label": "🔥  Hard", "base": 0.14, "min": 0.085, "accel": 0.006},
		{"name": "expert", "label": "⚡  Expert", "base": 0.10, "min": 0.06, "accel": 0.007},
	]


func _set_difficulty(name: String) -> void:
	for d in _difficulties():
		if d["name"] == name:
			_difficulty = name
			_tick_base = d["base"]
			_tick_min = d["min"]
			_tick_accel = d["accel"]
			_tick_dur = _tick()
			return
	# Unknown -> fall back to medium.
	if name != "medium":
		_set_difficulty("medium")


func _build_board() -> void:
	var a := _mat(Color(0.46, 0.70, 0.34))
	var b := _mat(Color(0.38, 0.61, 0.28))
	for y in GRID:
		for x in GRID:
			var tile := _box(Vector3(CELL, 0.1, CELL), a if (x + y) % 2 == 0 else b)
			tile.position = _cell_world(Vector2i(x, y)) + Vector3(0, -0.35, 0)
			_world.add_child(tile)
	var pad := 3.0
	var apron := _box(Vector3(GRID * CELL + pad * 2.0, 0.08, GRID * CELL + pad * 2.0), b)
	apron.position = Vector3(0, -0.42, 0)
	_world.add_child(apron)
	_build_fence()


func _build_fence() -> void:
	var post_mat := _mat(Color(0.70, 0.52, 0.32))
	var rail_mat := _mat(Color(0.80, 0.62, 0.40))
	var half := GRID * CELL * 0.5 + 0.25
	var x := -half
	while x <= half + 0.01:
		_post(Vector3(x, 0, -half), post_mat)
		_post(Vector3(x, 0, half), post_mat)
		x += CELL
	var z := -half + CELL
	while z <= half - CELL + 0.01:
		_post(Vector3(-half, 0, z), post_mat)
		_post(Vector3(half, 0, z), post_mat)
		z += CELL
	for r in [[Vector3(half * 2.0, 0.08, 0.08), Vector3(0, 0.34, -half)],
			[Vector3(half * 2.0, 0.08, 0.08), Vector3(0, 0.34, half)],
			[Vector3(0.08, 0.08, half * 2.0), Vector3(-half, 0.34, 0)],
			[Vector3(0.08, 0.08, half * 2.0), Vector3(half, 0.34, 0)]]:
		var rail := _box(r[0], rail_mat)
		rail.position = r[1]
		_world.add_child(rail)


func _post(pos: Vector3, mat: StandardMaterial3D) -> void:
	var post := _box(Vector3(0.12, 0.5, 0.12), mat)
	post.position = pos + Vector3(0, 0.25, 0)
	_world.add_child(post)


func _build_head() -> void:
	_head_node = Node3D.new()
	_world.add_child(_head_node)
	var skull := _sphere(0.46, _head_mat)
	skull.scale = Vector3(1.0, 0.95, 1.1)
	_head_node.add_child(skull)
	for side in [-1.0, 1.0]:
		var white := _sphere(0.15, _mat(Color(1, 1, 1)))
		white.position = Vector3(0.17 * side, 0.18, 0.22)
		_head_node.add_child(white)
		var pupil := _sphere(0.08, _mat(Color(0.08, 0.09, 0.12)))
		pupil.position = Vector3(0.19 * side, 0.18, 0.33)
		_head_node.add_child(pupil)
	# Little smile.
	var mouth := _sphere(0.05, _mat(Color(0.08, 0.09, 0.12)))
	mouth.scale = Vector3(2.4, 0.5, 0.6)
	mouth.position = Vector3(0, -0.05, 0.40)
	_head_node.add_child(mouth)


func _build_food() -> void:
	_food_node = Node3D.new()
	_world.add_child(_food_node)
	var apple := _sphere(0.34, _mat(Color(0.90, 0.22, 0.20)))
	apple.scale = Vector3(1.0, 0.92, 1.0)
	_food_node.add_child(apple)
	var stem := _cylinder(0.03, 0.16, _mat(Color(0.45, 0.32, 0.18)))
	stem.position = Vector3(0, 0.34, 0)
	_food_node.add_child(stem)
	var leaf := _sphere(0.1, _mat(Color(0.38, 0.66, 0.30)))
	leaf.scale = Vector3(1.5, 0.3, 0.9)
	leaf.position = Vector3(0.13, 0.36, 0)
	leaf.rotation_degrees = Vector3(0, 0, -30)
	_food_node.add_child(leaf)


func _setup_camera() -> void:
	var span := float(GRID) * CELL
	_camera_rig.global_position = Vector3.ZERO
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.position = Vector3(0.0, span * 1.05, span * 0.42)
	_camera.look_at(Vector3.ZERO, Vector3.UP)
	_camera.size = span * 1.12
	_camera.keep_aspect = Camera3D.KEEP_HEIGHT
	_camera.near = 0.05
	_camera.far = 400.0


# --- Screenshot / autowin helpers ----------------------------------------

func _capture_screenshot(path: String) -> void:
	# Grow the snake a bit and run a short autopilot for a lively action shot.
	_picking = false
	_hud.hide_color_picker()
	var shot_color := _arg_str("--dabble-shot-char", "")
	if shot_color != "":
		_set_color(shot_color)
	_cells = [Vector2i(7, 7), Vector2i(6, 7), Vector2i(5, 7), Vector2i(4, 7), Vector2i(3, 7)]
	_score = 4
	_layout_snap()
	_hud.set_score(_score, maxi(_best, _score))
	_hud.hide_message()
	if "--dabble-shot-picker" in OS.get_cmdline_user_args():
		_hud.show_color_picker(_palette(), _color_name)
	if "--dabble-shot-diff" in OS.get_cmdline_user_args():
		_hud.show_difficulty_picker(_difficulties(), _difficulty)
	var steps := _arg_int("--dabble-shot-steps", 0)
	if steps > 0:
		_running = true
		_autopilot = true
		var frames := steps
		while frames > 0 and not _dead:
			await get_tree().process_frame
			frames -= 1
		_autopilot = false
	for i in 8:
		await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("[screenshot] saved ", path)
	get_tree().quit(0)


func _autopilot_dir() -> Vector2i:
	# Greedy step toward the apple, avoiding reversing and obvious walls/body.
	var head: Vector2i = _cells[0]
	var options: Array[Vector2i] = []
	if _food.x > head.x: options.append(Vector2i(1, 0))
	elif _food.x < head.x: options.append(Vector2i(-1, 0))
	if _food.y > head.y: options.append(Vector2i(0, 1))
	elif _food.y < head.y: options.append(Vector2i(0, -1))
	for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		options.append(d)
	for d in options:
		if d == -_dir:
			continue
		var n := head + d
		if not _hits_wall(n) and not _hits_body(n, n == _food):
			return d
	return _dir


func _setup_window() -> void:
	if DabbleSDK.is_headless():
		return
	var win := get_window()
	if win == null:
		return
	win.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	if _arg_str("--dabble-screenshot", "") != "":
		win.mode = Window.MODE_WINDOWED
		win.size = Vector2i(1280, 720)
		return
	if not OS.has_feature("editor"):
		win.borderless = true
		win.mode = Window.MODE_EXCLUSIVE_FULLSCREEN
	else:
		win.mode = Window.MODE_MAXIMIZED


func _arg_str(flag: String, fallback: String) -> String:
	var args := OS.get_cmdline_user_args()
	var idx := args.find(flag)
	if idx >= 0 and idx + 1 < args.size():
		return args[idx + 1]
	return fallback


func _arg_int(flag: String, fallback: int) -> int:
	var s := _arg_str(flag, "")
	return int(s) if s != "" else fallback


# --- Mesh helpers --------------------------------------------------------

func _mat(color: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.95
	m.metallic = 0.0
	m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	return m


func _box(size: Vector3, mat: StandardMaterial3D) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = mat
	return node


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
