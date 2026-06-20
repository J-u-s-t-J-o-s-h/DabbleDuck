extends Node3D
## Slither Trail — a cozy educational garden adventure. Orchestrates the themed
## world, the friendly snake, the collectibles for each learning objective, the
## HUD, audio, celebrations, and the DabbleDuck session/progress contract.

const Levels := preload("res://scripts/levels.gd")
const CollectibleScript := preload("res://scripts/collectible.gd")

const PICKUP := 0.95
const GROW_PER := 2
const START_LENGTH := 4

const PRAISE := ["Yum!", "Great!", "Nice!", "Wow!", "Yay!", "Awesome!"]

var _levels: Array = []
var _level_index := 0
var _level: Dictionary = {}

var _items: Array = []
var _need := 0
var _got := 0
var _sequence: Array = []
var _seq_idx := 0
var _combo := 0
var _oops_until := 0.0

var _started := false
var _complete := false
var _autopilot := false
var _start_ms := 0

# Session-wide tallies reported to DabbleDuck.
var _total_items := 0
var _longest := START_LENGTH
var _levels_completed := 0
var _objectives: Array = []

@onready var _garden: Node3D = $World/Garden
@onready var _snake: Node3D = $World/Snake
@onready var _items_root: Node3D = $World/Items
@onready var _collect_particles: GPUParticles3D = $World/CollectParticles
@onready var _camera: Camera3D = $CameraRig/Camera3D
@onready var _camera_rig: Node3D = $CameraRig
@onready var _hud: CanvasLayer = $HUD
@onready var _celebration: CanvasLayer = $Celebration
@onready var _audio: Node = $GameAudio
@onready var _world_env: WorldEnvironment = $WorldEnvironment
@onready var _sun: DirectionalLight3D = $SunLight


func _ready() -> void:
	call_deferred("_boot")


func _boot() -> void:
	_setup_window()
	_setup_collect_particles()
	_levels = Levels.all()
	_hud.move_requested.connect(_on_dpad)
	if _audio.has_method("configure_from_sdk"):
		_audio.configure_from_sdk()
	_start_ms = Time.get_ticks_msec()

	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY:
		_total_items = int(prev.get("totalItems", 0))
		_longest = maxi(START_LENGTH, int(prev.get("longestSnake", START_LENGTH)))

	# Headless / autowin: complete the final level's objective straight away so
	# the full completion + finish contract is exercised in one pass.
	if DabbleSDK.wants_autowin():
		_level_index = _levels.size() - 1

	var shot_level := _arg_int("--dabble-shot-level", -1)
	if shot_level >= 0:
		_level_index = clampi(shot_level - 1, 0, _levels.size() - 1)

	_load_level(_level_index)

	# Screenshot mode: render the level (optionally auto-playing) and exit.
	var shot := _arg_str("--dabble-screenshot", "")
	if shot != "":
		await _capture_screenshot(shot)
		return

	DabbleSDK.emit_visit("play")

	if DabbleSDK.wants_autowin():
		DabbleSDK.emit_game_event("slither.started",
			{"level": _level_index + 1, "mode": str(_level.get("mode", ""))})
		await get_tree().create_timer(0.15).timeout
		_force_complete()
		return

	_started = true
	_snake.set_active(true)
	DabbleSDK.emit_game_event("slither.started",
		{"level": _level_index + 1, "mode": str(_level.get("mode", ""))})


# --- Level loading -------------------------------------------------------

func _load_level(index: int) -> void:
	_level = _levels[index]
	_complete = false
	_got = 0
	_seq_idx = 0
	_combo = 0
	_sequence = _level.get("sequence", [])

	_garden.build(_level)
	_apply_environment(_level)
	_setup_camera()

	# Snake starts at the garden center, heading "up" (away from camera).
	_snake.set_bounds(_garden.play_bounds_min(), _garden.play_bounds_max())
	_snake.reset(Vector3.ZERO, Vector2i(0, -1), START_LENGTH)
	_snake.set_active(false)

	_clear_items()
	_spawn_for_level(_level)

	_hud.set_level(_level, index + 1, _levels.size())
	_refresh_hud_progress()
	_hud.set_stats(_snake.length(), _total_items)


func _spawn_for_level(level: Dictionary) -> void:
	var mode := str(level.get("mode", "color"))
	match mode:
		"count":
			_need = int(level.get("goal", 5))
			for i in _need:
				_spawn_item({"kind": str(level.get("target_kind", "strawberry")), "target": true})
		"color", "shape":
			_need = int(level.get("goal", 5))
			for i in _need:
				_spawn_item({"kind": str(level.get("target_kind", "apple_green")), "target": true})
			for i in int(level.get("decoys", 0)):
				_spawn_item({"kind": str(level.get("avoid_kind", "apple_red")), "target": false})
		"letter", "word":
			_need = _sequence.size()
			for i in _sequence.size():
				_spawn_item({"kind": "letter", "glyph": str(_sequence[i]), "target": true, "seq_index": i})
			for g in level.get("decoy_glyphs", []):
				_spawn_item({"kind": "letter", "glyph": str(g), "target": false})
			_update_letter_highlight()


func _spawn_item(config: Dictionary) -> void:
	var item := CollectibleScript.new()
	item.setup(config)
	item.position = _free_point()
	_items_root.add_child(item)
	_items.append(item)


func _free_point() -> Vector3:
	var best: Vector3 = _garden.random_spawn_point(_rng())
	for attempt in 40:
		var p: Vector3 = _garden.random_spawn_point(_rng())
		if Vector2(p.x, p.z).length() < 2.6:
			continue
		var ok := true
		for it in _items:
			if Vector2(it.position.x - p.x, it.position.z - p.z).length() < 1.7:
				ok = false
				break
		if ok:
			return p
	return best


var _rng_inst: RandomNumberGenerator


func _rng() -> RandomNumberGenerator:
	if _rng_inst == null:
		_rng_inst = RandomNumberGenerator.new()
		_rng_inst.seed = int(_level.get("seed", 1)) * 7 + 13
	return _rng_inst


func _clear_items() -> void:
	for it in _items:
		if is_instance_valid(it):
			it.queue_free()
	_items.clear()
	_rng_inst = null


# --- Input ---------------------------------------------------------------

func _input(event: InputEvent) -> void:
	if not _started or _complete:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_UP, KEY_W: _snake.set_direction(Vector2i(0, -1))
			KEY_DOWN, KEY_S: _snake.set_direction(Vector2i(0, 1))
			KEY_LEFT, KEY_A: _snake.set_direction(Vector2i(-1, 0))
			KEY_RIGHT, KEY_D: _snake.set_direction(Vector2i(1, 0))
			KEY_ESCAPE: _quit()


func _on_dpad(dir: Vector2i) -> void:
	if _started and not _complete:
		_snake.set_direction(dir)


func _quit() -> void:
	DabbleSDK.finish(_summary())


# --- Per-frame collection ------------------------------------------------

func _process(_delta: float) -> void:
	if not _started or _complete:
		return
	if _autopilot:
		_drive_autopilot()
	_check_pickups()


func _check_pickups() -> void:
	var head: Vector3 = _snake.head_position()
	for it in _items:
		if not is_instance_valid(it) or it.get("collected"):
			continue
		var d := Vector2(it.position.x - head.x, it.position.z - head.z).length()
		if d <= PICKUP:
			_touch_item(it)


func _touch_item(it: Node) -> void:
	var mode := str(_level.get("mode", "color"))
	if mode == "letter" or mode == "word":
		var needed := str(_sequence[_seq_idx]) if _seq_idx < _sequence.size() else ""
		if it.is_target and it.glyph == needed:
			_collect_good(it)
			_seq_idx += 1
			_update_letter_highlight()
			_refresh_hud_progress()
			if _seq_idx >= _sequence.size():
				_level_complete()
		else:
			_gentle_miss("Find %s first!" % needed)
	else:
		if it.is_target:
			_collect_good(it)
			_got += 1
			_refresh_hud_progress()
			if _got >= _need:
				_level_complete()
		else:
			var look_for := _target_word()
			_gentle_miss("Oops! Look for the %s!" % look_for)
			# Move the avoided item somewhere new so the field stays lively.
			it.position = _free_point()


func _collect_good(it: Node) -> void:
	it.set("collected", true)
	it.play_collect()
	_snake.grow(GROW_PER)
	_combo += 1
	_total_items += 1
	_longest = maxi(_longest, _snake.length())
	_audio.play_collect(_combo)
	_burst(it.position)
	_hud.set_stats(_snake.length(), _total_items)
	if _combo % 2 == 0:
		_hud.show_toast(PRAISE[randi() % PRAISE.size()])
	DabbleSDK.emit_game_event("slither.collected",
		{"kind": str(it.kind), "total": _total_items, "length": _snake.length()})
	_free_item_later(it)


func _gentle_miss(message: String) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now < _oops_until:
		return
	_oops_until = now + 0.9
	_combo = 0
	_audio.play_oops()
	_hud.show_toast(message)


func _free_item_later(it: Node) -> void:
	await get_tree().create_timer(0.45).timeout
	if is_instance_valid(it):
		_items.erase(it)
		it.queue_free()


func _update_letter_highlight() -> void:
	var needed := str(_sequence[_seq_idx]) if _seq_idx < _sequence.size() else ""
	for it in _items:
		if not is_instance_valid(it) or str(it.kind) != "letter":
			continue
		var is_next: bool = it.is_target and str(it.glyph) == needed and not it.get("collected")
		it.set_next(is_next)


func _refresh_hud_progress() -> void:
	var mode := str(_level.get("mode", "color"))
	if mode == "letter" or mode == "word":
		_hud.set_sequence_progress(_sequence, _seq_idx)
	else:
		_hud.set_count_progress(_got, _need)


func _target_word() -> String:
	match str(_level.get("target_kind", "")):
		"apple_green": return "green apples"
		"circle": return "circles"
		_: return "right ones"


# --- Level completion & progression --------------------------------------

func _level_complete() -> void:
	if _complete:
		return
	_complete = true
	_snake.celebrate()
	_levels_completed = maxi(_levels_completed, _level_index + 1)
	var mode := str(_level.get("mode", ""))
	if not _objectives.has(mode):
		_objectives.append(mode)

	_audio.play_sparkle()
	_burst(_snake.head_position())

	DabbleSDK.emit_completion("games", 1)
	DabbleSDK.emit_game_event("slither.level_complete", {
		"level": _level_index + 1, "mode": mode,
		"length": _snake.length(), "items": _total_items
	})
	_award_badges(mode)

	var is_last := _level_index >= _levels.size() - 1
	if is_last:
		_finish_game()
	else:
		await _advance_level()


func _award_badges(mode: String) -> void:
	if _level_index == 0:
		DabbleSDK.request_badge("slither-snake-scout", "Snake Scout", "🔎")
	match mode:
		"color": DabbleSDK.request_badge("slither-color-collector", "Color Collector", "🍏")
		"count": DabbleSDK.request_badge("slither-counting-champion", "Counting Champion", "🔢")
		"shape": DabbleSDK.request_badge("slither-shape-seeker", "Shape Seeker", "🔵")
		"letter", "word": DabbleSDK.request_badge("slither-letter-learner", "Letter Learner", "🔤")


func _advance_level() -> void:
	_audio.play_win()
	var msgs := ["Great job!  Next garden!", "You found them all!  Keep going!",
			"Fantastic!  On to the next!", "Wonderful!  Another garden awaits!"]
	_celebration.show_celebration(msgs[_level_index % msgs.size()])
	await get_tree().create_timer(1.9).timeout
	_celebration.hide_celebration()
	_level_index += 1
	_load_level(_level_index)
	_started = true
	_snake.set_active(true)
	DabbleSDK.emit_game_event("slither.started",
		{"level": _level_index + 1, "mode": str(_level.get("mode", ""))})


func _finish_game() -> void:
	_audio.play_win()
	_celebration.show_celebration("You're a Garden Explorer!\nYou did it all! 🌟")
	DabbleSDK.request_badge("slither-garden-explorer", "Garden Explorer", "🌻")
	var state := _build_state()
	DabbleSDK.save_module_state(state)
	await get_tree().create_timer(2.0).timeout
	DabbleSDK.finish(_summary())


func _force_complete() -> void:
	# Used by headless/autowin to exercise the contract without simulating play.
	_total_items += _need
	_snake.grow(GROW_PER * _need)
	_longest = maxi(_longest, _snake.length())
	if str(_level.get("mode", "")) in ["letter", "word"]:
		_seq_idx = _sequence.size()
	else:
		_got = _need
	_level_complete()


func _build_state() -> Dictionary:
	var plays := 1
	var sessions := 1
	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY:
		plays = int(prev.get("plays", 0)) + 1
		sessions = int(prev.get("sessions", 0)) + 1
	return {
		"plays": plays,
		"sessions": sessions,
		"levelsCompleted": maxi(_levels_completed, _level_index + 1),
		"longestSnake": _longest,
		"totalItems": _total_items,
		"objectivesCompleted": _objectives,
	}


func _summary() -> Dictionary:
	return {"completions": {"games": 1}, "moduleState": _build_state()}


# --- Camera & environment ------------------------------------------------

func _setup_camera() -> void:
	var center: Vector3 = _garden.center()
	var span: float = _garden.span()
	_camera_rig.global_position = center
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.position = Vector3(0.0, span * 1.2, span * 0.88)
	_camera.look_at(center, Vector3.UP)
	_camera.size = span * 1.16
	_camera.keep_aspect = Camera3D.KEEP_HEIGHT
	_camera.near = 0.05
	_camera.far = 400.0


func _apply_environment(level: Dictionary) -> void:
	if _sun:
		_sun.light_color = level.get("sun_color", Color(1, 0.95, 0.84))
		_sun.light_energy = float(level.get("sun_energy", 1.3))
	if _world_env == null or _world_env.environment == null:
		return
	var env := _world_env.environment
	env.ambient_light_color = level.get("ambient_color", Color(0.92, 0.95, 1.0))
	env.ambient_light_energy = float(level.get("ambient_energy", 0.55))
	env.background_color = level.get("clear_color", Color(0.55, 0.8, 0.95))
	var sky := env.sky
	if sky and sky.sky_material is ProceduralSkyMaterial:
		var sm := sky.sky_material as ProceduralSkyMaterial
		sm.sky_top_color = level.get("sky_top", Color(0.42, 0.72, 0.95))
		sm.sky_horizon_color = level.get("sky_horizon", Color(0.85, 0.93, 0.80))
		sm.ground_horizon_color = level.get("ground_horizon", Color(0.74, 0.88, 0.62))
		sm.ground_bottom_color = level.get("ground_horizon", Color(0.5, 0.6, 0.4))


# --- Effects -------------------------------------------------------------

func _setup_collect_particles() -> void:
	if _collect_particles == null:
		return
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 1.4
	mat.initial_velocity_max = 3.4
	mat.gravity = Vector3(0, -3.0, 0)
	mat.scale_min = 0.06
	mat.scale_max = 0.18
	mat.color = Color(1.0, 0.92, 0.5)
	_collect_particles.process_material = mat
	_collect_particles.one_shot = true
	_collect_particles.explosiveness = 1.0
	_collect_particles.amount = 26
	_collect_particles.lifetime = 1.0


func _burst(pos: Vector3) -> void:
	if _collect_particles == null:
		return
	_collect_particles.position = pos + Vector3(0, 0.4, 0)
	_collect_particles.restart()
	_collect_particles.emitting = true


# --- Window / args -------------------------------------------------------

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


# --- Screenshot autopilot ------------------------------------------------

func _capture_screenshot(path: String) -> void:
	_started = true
	var steps := _arg_int("--dabble-shot-steps", 0)
	if steps > 0:
		_autopilot = true
		_snake.set_active(true)
		var frames := steps
		while frames > 0 and not _complete:
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


func _drive_autopilot() -> void:
	var head: Vector3 = _snake.head_position()
	var target = _nearest_target(head)
	if target == null:
		return
	var dx: float = target.position.x - head.x
	var dz: float = target.position.z - head.z
	if absf(dx) > absf(dz):
		_snake.set_direction(Vector2i(signi(int(sign(dx))), 0))
	else:
		_snake.set_direction(Vector2i(0, signi(int(sign(dz)))))


func _nearest_target(head: Vector3):
	var best = null
	var best_d := 1e9
	var needed := ""
	var mode := str(_level.get("mode", ""))
	if mode == "letter" or mode == "word":
		needed = str(_sequence[_seq_idx]) if _seq_idx < _sequence.size() else ""
	for it in _items:
		if not is_instance_valid(it) or it.get("collected") or not it.is_target:
			continue
		if needed != "" and str(it.glyph) != needed:
			continue
		var d := Vector2(it.position.x - head.x, it.position.z - head.z).length()
		if d < best_d:
			best_d = d
			best = it
	return best
