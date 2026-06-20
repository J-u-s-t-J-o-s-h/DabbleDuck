extends CanvasLayer
## Friendly heads-up display for 4-5 year olds: level name, the current learning
## objective, a big visual progress tracker (pips for counts, letters for words),
## a gentle encouragement toast, a length/score readout, and an on-screen arrow
## pad for touch screens.

signal move_requested(dir: Vector2i)

var _level_label: Label
var _objective_label: Label
var _pip_row: HBoxContainer
var _toast: Label
var _stat_label: Label
var _toast_tween: Tween
var _level_label_name := ""


func _ready() -> void:
	layer = 5
	_build_ui()


func setup(level: Dictionary) -> void:
	_level_label.text = "%s" % str(level.get("name", "Garden"))
	_objective_label.text = str(level.get("objective", ""))
	_clear_pips()


func set_level(level: Dictionary, num: int, total: int) -> void:
	_level_label_name = str(level.get("name", "Garden"))
	_level_label.text = "Level %d of %d  •  %s" % [num, total, _level_label_name]
	_objective_label.text = str(level.get("objective", ""))
	_clear_pips()


func set_count_progress(current: int, goal: int) -> void:
	_clear_pips()
	for i in goal:
		_add_pip("", i < current, false)


func set_sequence_progress(sequence: Array, collected: int) -> void:
	_clear_pips()
	for i in sequence.size():
		var done := i < collected
		var is_next := i == collected
		_add_pip(str(sequence[i]), done, is_next)


func set_stats(length: int, collected: int) -> void:
	if _stat_label:
		_stat_label.text = "🐍 %d   ⭐ %d" % [length, collected]


func show_toast(message: String) -> void:
	if _toast == null:
		return
	_toast.text = message
	_toast.modulate.a = 1.0
	_toast.scale = Vector2(0.8, 0.8)
	if _toast_tween and _toast_tween.is_running():
		_toast_tween.kill()
	_toast_tween = create_tween()
	_toast_tween.tween_property(_toast, "scale", Vector2(1.0, 1.0), 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	_toast_tween.tween_interval(1.1)
	_toast_tween.tween_property(_toast, "modulate:a", 0.0, 0.5)


# --- UI construction -----------------------------------------------------

func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	var top := VBoxContainer.new()
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.offset_top = 12.0
	top.offset_left = 40.0
	top.offset_right = -40.0
	top.add_theme_constant_override("separation", 4)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top)

	_level_label = _make_label("Level 1", 30, Color(0.98, 0.62, 0.22))
	top.add_child(_level_label)

	_objective_label = _make_label("Explore the garden!", 38, Color(0.16, 0.30, 0.14))
	top.add_child(_objective_label)

	_pip_row = HBoxContainer.new()
	_pip_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_pip_row.add_theme_constant_override("separation", 12)
	_pip_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(_pip_row)

	_toast = _make_label("", 44, Color(0.95, 0.45, 0.62))
	_toast.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_toast.anchor_left = 0.5
	_toast.anchor_right = 0.5
	_toast.offset_left = -360
	_toast.offset_right = 360
	_toast.offset_top = 150
	_toast.offset_bottom = 220
	_toast.pivot_offset = Vector2(360, 35)
	_toast.modulate.a = 0.0
	root.add_child(_toast)

	_build_stats(root)
	_build_dpad(root)


func _build_stats(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -210
	panel.offset_top = 16
	panel.offset_right = -20
	panel.offset_bottom = 70
	panel.add_theme_stylebox_override("panel", _card_style())
	parent.add_child(panel)
	_stat_label = _make_label("🐍 4   ⭐ 0", 28, Color(0.2, 0.34, 0.2))
	_stat_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel.add_child(_stat_label)


func _make_label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.96))
	l.add_theme_constant_override("outline_size", 7)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _clear_pips() -> void:
	if _pip_row == null:
		return
	for c in _pip_row.get_children():
		c.queue_free()


func _add_pip(glyph: String, filled: bool, is_next: bool) -> void:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_left = 14
	style.corner_radius_bottom_right = 14
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	if filled:
		style.bg_color = Color(0.50, 0.82, 0.36, 1.0)
		style.border_color = Color(0.30, 0.6, 0.24, 1.0)
	elif is_next:
		style.bg_color = Color(1.0, 0.92, 0.55, 1.0)
		style.border_color = Color(0.95, 0.7, 0.2, 1.0)
	else:
		style.bg_color = Color(1.0, 0.99, 0.92, 0.9)
		style.border_color = Color(0.6, 0.66, 0.55, 1.0)
	panel.add_theme_stylebox_override("panel", style)

	var label := Label.new()
	label.custom_minimum_size = Vector2(48, 48)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	if glyph == "":
		label.text = "✓" if filled else "●"
	else:
		label.text = glyph
	label.add_theme_font_size_override("font_size", 34)
	var fg := Color(1, 1, 1) if filled else Color(0.3, 0.36, 0.3)
	label.add_theme_color_override("font_color", fg)
	panel.add_child(label)
	_pip_row.add_child(panel)


func _card_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.99, 0.92, 0.94)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color(0.40, 0.6, 0.36, 1.0)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	return style


func _build_dpad(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	panel.offset_left = 24.0
	panel.offset_top = -248.0
	panel.offset_right = 224.0
	panel.offset_bottom = -24.0
	panel.add_theme_stylebox_override("panel", _card_style())
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
