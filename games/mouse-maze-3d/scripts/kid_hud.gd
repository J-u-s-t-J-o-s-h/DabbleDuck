extends CanvasLayer
## Simple map + arrow pad so 4–5 year olds can see where they are and which way to go.

signal move_requested(dir: Vector2i)

const MAP_SIZE := 168.0
const CELL_PX := MAP_SIZE / 9.0

var _grid: PackedStringArray = []
var _rows := 0
var _cols := 0
var _mouse := Vector2i.ZERO
var _cheese := Vector2i.ZERO
var _map: Control
var _hint: Label
var _level_label: Label


func _ready() -> void:
	layer = 5
	_build_ui()


func setup(grid: PackedStringArray, mouse_pos: Vector2i, cheese_pos: Vector2i) -> void:
	_grid = grid
	_rows = grid.size()
	_cols = grid[0].length() if _rows > 0 else 0
	_mouse = mouse_pos
	_cheese = cheese_pos
	if _map:
		_map.queue_redraw()


func update_positions(mouse_pos: Vector2i, cheese_pos: Vector2i) -> void:
	_mouse = mouse_pos
	_cheese = cheese_pos
	if _map:
		_map.queue_redraw()


func set_level(num: int, total: int) -> void:
	if _level_label:
		_level_label.text = "Level %d of %d" % [num, total]


func set_creature_name(creature: String) -> void:
	if _hint:
		_hint.text = "Help the %s find the cheese!  Use the arrow keys or tap the arrows." % creature


func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	_level_label = Label.new()
	_level_label.text = "Level 1"
	_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_level_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_level_label.offset_top = 14.0
	_level_label.offset_bottom = 50.0
	_level_label.add_theme_font_size_override("font_size", 32)
	_level_label.add_theme_color_override("font_color", Color(0.95, 0.55, 0.18, 1.0))
	_level_label.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.95))
	_level_label.add_theme_constant_override("outline_size", 7)
	root.add_child(_level_label)

	_hint = Label.new()
	_hint.text = "Help the mouse find the cheese!  Use the arrow keys or tap the arrows."
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_hint.offset_top = 56.0
	_hint.offset_bottom = 104.0
	_hint.add_theme_font_size_override("font_size", 26)
	_hint.add_theme_color_override("font_color", Color(0.15, 0.28, 0.12, 1.0))
	_hint.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.95))
	_hint.add_theme_constant_override("outline_size", 6)
	root.add_child(_hint)

	_build_minimap(root)
	_build_dpad(root)


func _build_minimap(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	panel.offset_left = -MAP_SIZE - 36.0
	panel.offset_top = -MAP_SIZE - 48.0
	panel.offset_right = -20.0
	panel.offset_bottom = -20.0
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.92, 0.94)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color(0.35, 0.55, 0.32, 1.0)
	panel.add_theme_stylebox_override("panel", style)
	parent.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	panel.add_child(vbox)

	var title := Label.new()
	title.text = "Map"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color(0.22, 0.38, 0.2, 1.0))
	vbox.add_child(title)

	_map = Control.new()
	_map.custom_minimum_size = Vector2(MAP_SIZE, MAP_SIZE)
	_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_map.draw.connect(_draw_minimap)
	vbox.add_child(_map)

	var legend := Label.new()
	legend.text = "Pink = mouse   Yellow = cheese"
	legend.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	legend.add_theme_font_size_override("font_size", 16)
	legend.add_theme_color_override("font_color", Color(0.35, 0.42, 0.32, 1.0))
	vbox.add_child(legend)


func _draw_minimap() -> void:
	if _rows == 0 or _cols == 0:
		return
	var cell_w := MAP_SIZE / float(_cols)
	var cell_h := MAP_SIZE / float(_rows)
	for y in _rows:
		for x in _cols:
			var ch := _grid[y].substr(x, 1)
			var rect := Rect2(x * cell_w, y * cell_h, cell_w, cell_h)
			if ch == "#":
				_map.draw_rect(rect, Color(0.78, 0.42, 0.18))
			else:
				_map.draw_rect(rect, Color(0.96, 0.84, 0.52))
			_map.draw_rect(rect, Color(0.4, 0.5, 0.35, 0.35), false, 1.0)
	if _cheese != _mouse:
		_draw_dot(_cheese, cell_w, cell_h, Color(1.0, 0.88, 0.15), 0.38)
	_draw_dot(_mouse, cell_w, cell_h, Color(1.0, 0.45, 0.62), 0.42)


func _draw_dot(cell: Vector2i, cell_w: float, cell_h: float, color: Color, scale: float) -> void:
	var center := Vector2(
		(float(cell.x) + 0.5) * cell_w,
		(float(cell.y) + 0.5) * cell_h
	)
	var r := minf(cell_w, cell_h) * scale
	_map.draw_circle(center, r + 2.0, Color(1, 1, 1, 0.9))
	_map.draw_circle(center, r, color)


func _build_dpad(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	panel.offset_left = 24.0
	panel.offset_top = -248.0
	panel.offset_right = 224.0
	panel.offset_bottom = -24.0
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.92, 0.92)
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_left = 20
	style.corner_radius_bottom_right = 20
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color(0.35, 0.55, 0.32, 1.0)
	panel.add_theme_stylebox_override("panel", style)
	parent.add_child(panel)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	panel.add_child(grid)

	_add_spacer(grid)
	_add_arrow(grid, "↑", Vector2i(0, -1))
	_add_spacer(grid)
	_add_arrow(grid, "←", Vector2i(-1, 0))
	_add_spacer(grid)
	_add_arrow(grid, "→", Vector2i(1, 0))
	_add_spacer(grid)
	_add_arrow(grid, "↓", Vector2i(0, 1))
	_add_spacer(grid)


func _add_spacer(grid: GridContainer) -> void:
	var s := Control.new()
	s.custom_minimum_size = Vector2(56, 56)
	grid.add_child(s)


func _add_arrow(grid: GridContainer, glyph: String, dir: Vector2i) -> void:
	var btn := Button.new()
	btn.text = glyph
	btn.custom_minimum_size = Vector2(56, 56)
	btn.add_theme_font_size_override("font_size", 32)
	btn.add_theme_color_override("font_color", Color(0.18, 0.32, 0.16, 1.0))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.88, 0.96, 0.82, 1.0)
	normal.corner_radius_top_left = 14
	normal.corner_radius_top_right = 14
	normal.corner_radius_bottom_left = 14
	normal.corner_radius_bottom_right = 14
	var hover := normal.duplicate()
	hover.bg_color = Color(0.78, 0.92, 0.68, 1.0)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.pressed.connect(func() -> void: move_requested.emit(dir))
	grid.add_child(btn)
