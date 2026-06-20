extends Node3D
## Mouse Maze 3D — cozy garden maze vertical slice. Orchestrates 3D world, input, SDK.

var _levels: Array = []
var _level_index := 0
var _grid: PackedStringArray = PackedStringArray()

var _rows := 0
var _cols := 0
var _mouse := Vector2i.ZERO
var _cheese := Vector2i.ZERO
var _won := false
var _moves := 0
var _total_moves := 0
var _start_ms := 0
var _started := false
var _player_character := "mouse"

@onready var _world: Node3D = $World/MazeWorld
@onready var _mouse_char: Node3D = $World/MazeWorld/Characters/Mouse
@onready var _cheese_goal: Node3D = $World/MazeWorld/Characters/Cheese
@onready var _camera: Camera3D = $CameraRig/Camera3D
@onready var _camera_rig: Node3D = $CameraRig
@onready var _win_ui: CanvasLayer = $WinUI
@onready var _kid_hud: CanvasLayer = $KidHUD
@onready var _char_select: CanvasLayer = $CharacterSelect
@onready var _audio: Node = $GameAudio
@onready var _celebration_particles: GPUParticles3D = $World/MazeWorld/CelebrationParticles


func _ready() -> void:
	call_deferred("_boot")


func _screenshot_path() -> String:
	var args := OS.get_cmdline_user_args()
	var idx := args.find("--dabble-screenshot")
	if idx >= 0 and idx + 1 < args.size():
		return args[idx + 1]
	return ""


func _boot() -> void:
	_setup_window()

	var levels_script = load("res://scripts/levels.gd")
	_levels = levels_script.all()

	_setup_celebration_particles()
	_kid_hud.move_requested.connect(_try_move)
	if _audio != null and _audio.has_method("configure_from_sdk"):
		_audio.configure_from_sdk()
	_start_ms = Time.get_ticks_msec()

	# Headless contract check / autowin jumps straight to the final level so the
	# completion + finish path is exercised in one pass.
	if DabbleSDK.wants_autowin():
		_level_index = _levels.size() - 1

	var shot_lvl := _shot_level()
	if shot_lvl >= 0:
		_level_index = clampi(shot_lvl, 0, _levels.size() - 1)

	_player_character = _saved_character()
	_load_level(_level_index)

	# Screenshot mode: skip the picker, render the chosen character, exit.
	var shot := _screenshot_path()
	if shot != "":
		var sc := _shot_char()
		if sc != "":
			_player_character = sc
		_mouse_char.set_character(_player_character)
		if _kid_hud.has_method("set_creature_name"):
			_kid_hud.set_creature_name(_player_character)
		_started = true
		if OS.get_cmdline_user_args().has("--dabble-shot-picker"):
			_char_select.show_picker()
		await _capture_screenshot(shot)
		return

	DabbleSDK.emit_visit("play")

	# Headless/autowin: skip the picker, use default character, auto-win.
	if DabbleSDK.wants_autowin():
		_mouse_char.set_character(_player_character)
		_started = true
		DabbleSDK.emit_game_event("mouse-maze.started",
			{"level": _level_index + 1, "character": _player_character})
		await get_tree().create_timer(0.2).timeout
		_win()
		return

	# Interactive: let the child pick a friend before moving.
	_char_select.character_chosen.connect(_on_character_chosen)
	_char_select.show_picker()


func _on_character_chosen(type: String) -> void:
	if _started:
		return
	_player_character = type
	_mouse_char.set_character(type)
	_mouse_char.look_toward(_cheese_goal.global_position)
	if _kid_hud.has_method("set_creature_name"):
		_kid_hud.set_creature_name(type)
	_char_select.hide_picker()
	_started = true
	_audio.play_move()
	DabbleSDK.emit_game_event("mouse-maze.started",
		{"level": _level_index + 1, "character": type})


func _saved_character() -> String:
	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY and prev.has("character"):
		return str(prev["character"])
	return "mouse"


func _load_level(index: int) -> void:
	_grid = _levels[index]
	_won = false
	_moves = 0
	_rows = _grid.size()
	_cols = _grid[0].length()
	for y in _rows:
		var line := _grid[y]
		for x in line.length():
			match line[x]:
				"M":
					_mouse = Vector2i(x, y)
				"C":
					_cheese = Vector2i(x, y)

	_world.build(_grid)
	_mouse_char.snap_to_world(_world.grid_to_world(_mouse))
	_cheese_goal.set_world_pos(_world.grid_to_world(_cheese))
	_mouse_char.look_toward(_cheese_goal.global_position)

	_setup_camera()
	_kid_hud.setup(_grid, _mouse, _cheese)
	if _kid_hud.has_method("set_level"):
		_kid_hud.set_level(index + 1, _levels.size())


func _setup_window() -> void:
	if DabbleSDK.is_headless():
		return
	var win := get_window()
	if win == null:
		return
	# Render 1:1 pixels — no viewport upscaling blur on widescreen monitors.
	win.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	if _screenshot_path() != "":
		win.mode = Window.MODE_WINDOWED
		win.size = Vector2i(1280, 720)
		return
	if not OS.has_feature("editor"):
		win.borderless = true
		win.mode = Window.MODE_EXCLUSIVE_FULLSCREEN
	else:
		win.mode = Window.MODE_MAXIMIZED


func _setup_camera() -> void:
	var center: Vector3 = _world.global_position + _world.maze_center()
	var span: float = _world.maze_span()
	_camera_rig.global_position = center
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	# Tilted bird's-eye: walls show real height, yet "up" still means "away".
	_camera.position = Vector3(0.0, span * 1.35, span * 0.95)
	_camera.look_at(center, Vector3.UP)
	_camera.size = span * 1.32
	_camera.keep_aspect = Camera3D.KEEP_HEIGHT
	_camera.near = 0.05
	_camera.far = 300.0


func _shot_char() -> String:
	var args := OS.get_cmdline_user_args()
	var idx := args.find("--dabble-shot-char")
	if idx >= 0 and idx + 1 < args.size():
		return args[idx + 1]
	return ""


func _shot_level() -> int:
	var args := OS.get_cmdline_user_args()
	var idx := args.find("--dabble-shot-level")
	if idx >= 0 and idx + 1 < args.size():
		return int(args[idx + 1]) - 1
	return -1


func _shot_dir() -> Vector2i:
	var args := OS.get_cmdline_user_args()
	var idx := args.find("--dabble-shot-dir")
	if idx >= 0 and idx + 1 < args.size():
		match args[idx + 1]:
			"u": return Vector2i(0, -1)
			"d": return Vector2i(0, 1)
			"l": return Vector2i(-1, 0)
			"r": return Vector2i(1, 0)
	return Vector2i.ZERO


func _capture_screenshot(path: String) -> void:
	# Let lighting, shadows, and a move settle before grabbing the frame.
	for i in 8:
		await get_tree().process_frame
	# Test the real level-transition path: win, advance, then prove movement works.
	if OS.get_cmdline_user_args().has("--dabble-shot-advance"):
		var before := _level_index
		_win()
		# Wait for the celebration + next level to load.
		while _level_index == before:
			await get_tree().process_frame
		for i in 30:
			await get_tree().process_frame
		var moved_from := _mouse
		_try_move(Vector2i(0, 1))
		for i in 30:
			await get_tree().process_frame
		print("[advance-test] level=%d moved_from=%s to=%s moved=%s" % [
			_level_index + 1, str(moved_from), str(_mouse), str(moved_from != _mouse)])
	var dir := _shot_dir()
	if OS.get_cmdline_user_args().has("--dabble-shot-move"):
		dir = Vector2i(0, 1)
	if dir != Vector2i.ZERO:
		_try_move(dir)
		for i in 28:
			await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("[screenshot] saved ", path)
	get_tree().quit(0)


func _setup_environment() -> void:
	pass


func _setup_celebration_particles() -> void:
	if _celebration_particles == null:
		return
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 1.2
	mat.initial_velocity_max = 3.0
	mat.gravity = Vector3(0, -2.5, 0)
	mat.scale_min = 0.06
	mat.scale_max = 0.16
	mat.color = Color(1.0, 0.88, 0.42)
	_celebration_particles.process_material = mat
	_celebration_particles.one_shot = true
	_celebration_particles.explosiveness = 1.0



func _cell(x: int, y: int) -> String:
	if y < 0 or y >= _rows:
		return "#"
	var line := _grid[y]
	if x < 0 or x >= line.length():
		return "#"
	return line[x]


func _is_wall(x: int, y: int) -> bool:
	return _cell(x, y) == "#"


func _input(event: InputEvent) -> void:
	if not _started or _won:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var dir := Vector2i.ZERO
		match event.keycode:
			KEY_UP, KEY_W:
				dir = Vector2i(0, -1)
			KEY_DOWN, KEY_S:
				dir = Vector2i(0, 1)
			KEY_LEFT, KEY_A:
				dir = Vector2i(-1, 0)
			KEY_RIGHT, KEY_D:
				dir = Vector2i(1, 0)
			KEY_ESCAPE:
				DabbleSDK.finish({})
				return
		if dir != Vector2i.ZERO:
			_try_move(dir)


func _try_move(dir: Vector2i) -> void:
	if not _started or _won:
		return
	# Always turn to face the pressed direction, even if a hedge blocks the step.
	_mouse_char.face_dir(dir)
	var nx := _mouse.x + dir.x
	var ny := _mouse.y + dir.y
	if _is_wall(nx, ny):
		_audio.play_bump()
		return
	_mouse = Vector2i(nx, ny)
	_moves += 1
	_total_moves += 1
	var world: Vector3 = _world.grid_to_world(_mouse)
	_mouse_char.move_to_world(world, dir)
	_kid_hud.update_positions(_mouse, _cheese)
	_audio.play_move()
	if _mouse == _cheese:
		_win()


func _win() -> void:
	if _won:
		return
	_won = true

	_mouse_char.play_win()
	_cheese_goal.play_collected()
	_audio.play_sparkle()

	if _celebration_particles:
		_celebration_particles.position = _cheese_goal.position + Vector3(0.0, 0.5, 0.0)
		_celebration_particles.emitting = true

	var tween := create_tween()
	tween.tween_property(_camera, "size", _camera.size * 0.92, 0.45).set_trans(Tween.TRANS_BACK)

	var is_last := _level_index >= _levels.size() - 1
	DabbleSDK.emit_completion("games", 1)
	DabbleSDK.emit_game_event("mouse-maze.completed", {
		"level": _level_index + 1, "moves": _moves, "ms": Time.get_ticks_msec() - _start_ms
	})
	DabbleSDK.request_badge("maze-first-cheese", "First Cheese!", "🧀")

	if is_last:
		_finish_game()
	else:
		await _advance_level()


func _advance_level() -> void:
	var msgs := ["Level done!  Next maze!", "Nice!  Here comes another!", "Yay!  Keep going!"]
	_win_ui.show_celebration(msgs[_level_index % msgs.size()])
	await get_tree().create_timer(1.6).timeout
	_win_ui.hide_celebration()
	_level_index += 1
	_load_level(_level_index)
	_audio.play_move()
	DabbleSDK.emit_game_event("mouse-maze.started", {"level": _level_index + 1})


func _finish_game() -> void:
	_audio.play_win()
	var messages := ["You finished all the mazes!", "You found every cheese!", "All done — great job!"]
	_win_ui.show_celebration(messages[randi() % messages.size()])

	var plays := 1
	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY and prev.has("plays"):
		plays = int(prev["plays"]) + 1

	DabbleSDK.request_badge("maze-all-levels", "Maze Master!", "🏆")
	var elapsed := Time.get_ticks_msec() - _start_ms
	var state := {
		"plays": plays, "levels": _levels.size(), "moves": _total_moves,
		"lastMs": elapsed, "character": _player_character
	}
	DabbleSDK.save_module_state(state)

	await get_tree().create_timer(1.8).timeout
	DabbleSDK.finish({"completions": {"games": 1}, "moduleState": state})
