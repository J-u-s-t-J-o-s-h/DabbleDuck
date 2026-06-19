extends Node2D
## Mouse Maze — cozy garden maze. Orchestrates visuals, input, and DabbleSDK.

const TILE := 64

var _grid := PackedStringArray([
	"#########",
	"#M..#...#",
	"#.#.#.#.#",
	"#.#...#.#",
	"#.#####.#",
	"#.....#C#",
	"#.###.#.#",
	"#...#...#",
	"#########",
])

var _rows := 0
var _cols := 0
var _origin := Vector2.ZERO
var _mouse := Vector2i.ZERO
var _cheese := Vector2i.ZERO
var _won := false
var _moves := 0
var _start_ms := 0

@onready var _maze_renderer: Node2D = $MazeRoot/MazeRenderer
@onready var _mouse_char: Node2D = $MazeRoot/Characters/Mouse
@onready var _cheese_goal: Node2D = $MazeRoot/Characters/Cheese
@onready var _camera: Camera2D = $Camera2D
@onready var _win_ui: CanvasLayer = $WinUI
@onready var _audio: Node = $GameAudio


func _ready() -> void:
	call_deferred("_boot")


func _boot() -> void:
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

	var maze_size := Vector2(_cols * TILE, _rows * TILE)
	var view := get_viewport_rect().size
	_origin = ((view - maze_size) * 0.5).round()
	$MazeRoot.position = Vector2.ZERO

	_maze_renderer.build(_grid, _origin)
	_mouse_char.snap_to_grid(_mouse, _origin)
	_cheese_goal.set_grid_pos(_cheese, _origin)

	_camera.position = _origin + maze_size * 0.5
	_camera.zoom = Vector2(1.12, 1.12)
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 5.0

	if _audio != null and _audio.has_method("configure_from_sdk"):
		_audio.configure_from_sdk()
	_start_ms = Time.get_ticks_msec()

	DabbleSDK.emit_visit("play")
	DabbleSDK.emit_game_event("mouse-maze.started", {})

	if DabbleSDK.wants_autowin():
		await get_tree().create_timer(0.2).timeout
		_win()


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
	if _won:
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
	var nx := _mouse.x + dir.x
	var ny := _mouse.y + dir.y
	if _is_wall(nx, ny):
		return
	_mouse = Vector2i(nx, ny)
	_moves += 1
	_mouse_char.move_to_grid(_mouse, _origin, dir)
	_audio.play_move()
	_camera.position = _mouse_char.position
	if _mouse == _cheese:
		_win()


func _win() -> void:
	if _won:
		return
	_won = true

	_mouse_char.play_win()
	_cheese_goal.play_collected()
	_audio.play_sparkle()
	_audio.play_win()

	var messages := [
		"You found the cheese!",
		"Great job!",
		"Maze complete!",
	]
	_win_ui.show_celebration(messages[randi() % messages.size()])

	# Gentle camera punch-in for celebration.
	var tween := create_tween()
	tween.tween_property(_camera, "zoom", Vector2(1.22, 1.22), 0.35).set_trans(Tween.TRANS_BACK)

	var elapsed := Time.get_ticks_msec() - _start_ms
	var plays := 1
	var prev = DabbleSDK.module_state()
	if typeof(prev) == TYPE_DICTIONARY and prev.has("plays"):
		plays = int(prev["plays"]) + 1

	DabbleSDK.emit_completion("games", 1)
	DabbleSDK.emit_game_event("mouse-maze.completed", {"moves": _moves, "ms": elapsed})
	DabbleSDK.request_badge("maze-first-cheese", "First Cheese!", "🧀")
	var state := {"plays": plays, "moves": _moves, "lastMs": elapsed}
	DabbleSDK.save_module_state(state)

	await get_tree().create_timer(1.8).timeout
	DabbleSDK.finish({"completions": {"games": 1}, "moduleState": state})
