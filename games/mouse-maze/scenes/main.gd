extends Node2D
## Mouse Maze — minimal but real gameplay.
##
## A grid maze drawn with simple shapes (final 2.5D garden art comes later).
## Move the mouse with arrow keys / WASD to reach the cheese. On success the
## game reports progress to the launcher via DabbleSDK and returns home.

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

@onready var _col_grass := Color.html("6ab04c")
@onready var _col_wall := Color.html("227a3f")
@onready var _col_floor := Color.html("8fd06b")
@onready var _col_mouse := Color.html("9b8579")
@onready var _col_cheese := Color.html("f6c945")


func _ready() -> void:
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
	_origin = ((get_viewport_rect().size - maze_size) * 0.5).round()
	_start_ms = Time.get_ticks_msec()

	DabbleSDK.emit_visit("play")
	DabbleSDK.emit_game_event("mouse-maze.started", {})
	queue_redraw()

	# Headless / automated runs win immediately so the contract is verifiable.
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
	queue_redraw()
	if _mouse == _cheese:
		_win()


func _win() -> void:
	if _won:
		return
	_won = true
	queue_redraw()

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

	await get_tree().create_timer(1.2).timeout
	DabbleSDK.finish({"completions": {"games": 1}, "moduleState": state})


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, get_viewport_rect().size), _col_grass)
	for y in _rows:
		var line := _grid[y]
		for x in line.length():
			var pos := _origin + Vector2(x * TILE, y * TILE)
			var rect := Rect2(pos, Vector2(TILE, TILE))
			if _cell(x, y) == "#":
				draw_rect(rect, _col_wall)
			else:
				draw_rect(rect.grow(-2.0), _col_floor)

	var half := Vector2(TILE, TILE) * 0.5
	var cpos := _origin + Vector2(_cheese.x * TILE, _cheese.y * TILE) + half
	draw_circle(cpos, TILE * 0.28, _col_cheese)

	var mpos := _origin + Vector2(_mouse.x * TILE, _mouse.y * TILE) + half
	draw_circle(mpos + Vector2(-11, -15), 7.0, _col_mouse)
	draw_circle(mpos + Vector2(11, -15), 7.0, _col_mouse)
	draw_circle(mpos, TILE * 0.3, _col_mouse)

	if _won:
		var font := ThemeDB.fallback_font
		draw_string(
			font,
			Vector2(_origin.x, _origin.y - 14.0),
			"You found the cheese!",
			HORIZONTAL_ALIGNMENT_LEFT,
			-1,
			28,
			Color.WHITE
		)
