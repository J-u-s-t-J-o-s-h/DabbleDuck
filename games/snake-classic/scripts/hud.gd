extends CanvasLayer
## Minimal HUD for Classic Snake: score + best, a center message panel (start /
## try-again), and an on-screen arrow pad for touch screens.

signal move_requested(dir: Vector2i)
signal restart_requested
signal color_chosen(name: String)
signal difficulty_chosen(name: String)

var _root: Control
var _score_label: Label
var _msg_panel: PanelContainer
var _msg_label: Label
var _again_btn: Button
var _picker_panel: PanelContainer


func _ready() -> void:
	layer = 5
	_build()


func set_score(score: int, best: int) -> void:
	if _score_label:
		_score_label.text = "Score  %d      Best  %d" % [score, best]


func show_message(text: String, show_button: bool) -> void:
	_msg_label.text = text
	_msg_panel.visible = true
	_again_btn.visible = show_button


func hide_message() -> void:
	_msg_panel.visible = false


func show_color_picker(palette: Array, current: String) -> void:
	hide_message()
	if _picker_panel:
		_picker_panel.queue_free()
		_picker_panel = null

	_picker_panel = PanelContainer.new()
	_picker_panel.set_anchors_preset(Control.PRESET_CENTER)
	_picker_panel.offset_left = -340
	_picker_panel.offset_right = 340
	_picker_panel.offset_top = -180
	_picker_panel.offset_bottom = 180
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.90, 0.98)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		style.set(c, 26)
	style.border_width_left = 5
	style.border_width_top = 5
	style.border_width_right = 5
	style.border_width_bottom = 5
	style.border_color = Color(0.48, 0.74, 0.40, 1.0)
	_picker_panel.add_theme_stylebox_override("panel", style)
	_root.add_child(_picker_panel)

	var margin := MarginContainer.new()
	for m in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		margin.add_theme_constant_override(m, 30)
	_picker_panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 22)
	margin.add_child(vbox)

	var title := _label("Pick your snake!", 40, Color(0.24, 0.40, 0.22))
	vbox.add_child(title)

	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 16)
	grid.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(grid)

	for entry in palette:
		_swatch(grid, String(entry["name"]), entry["color"], entry["name"] == current)


func hide_color_picker() -> void:
	if _picker_panel:
		_picker_panel.visible = false


func _swatch(grid: GridContainer, name: String, color: Color, selected: bool) -> void:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(120, 120)
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		normal.set(c, 60)
	var bw := 8 if selected else 3
	normal.border_width_left = bw
	normal.border_width_top = bw
	normal.border_width_right = bw
	normal.border_width_bottom = bw
	normal.border_color = Color(0.20, 0.30, 0.18, 1.0) if selected else Color(1, 1, 1, 0.85)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", normal)
	btn.add_theme_stylebox_override("pressed", normal)
	btn.pressed.connect(func() -> void: color_chosen.emit(name))
	grid.add_child(btn)


func show_difficulty_picker(options: Array, current: String) -> void:
	hide_message()
	if _picker_panel:
		_picker_panel.queue_free()
		_picker_panel = null

	_picker_panel = PanelContainer.new()
	_picker_panel.set_anchors_preset(Control.PRESET_CENTER)
	_picker_panel.offset_left = -300
	_picker_panel.offset_right = 300
	_picker_panel.offset_top = -210
	_picker_panel.offset_bottom = 210
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.90, 0.98)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		style.set(c, 26)
	style.border_width_left = 5
	style.border_width_top = 5
	style.border_width_right = 5
	style.border_width_bottom = 5
	style.border_color = Color(0.48, 0.74, 0.40, 1.0)
	_picker_panel.add_theme_stylebox_override("panel", style)
	_root.add_child(_picker_panel)

	var margin := MarginContainer.new()
	for m in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		margin.add_theme_constant_override(m, 30)
	_picker_panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)

	var title := _label("How fast?", 40, Color(0.24, 0.40, 0.22))
	vbox.add_child(title)

	for opt in options:
		_difficulty_button(vbox, String(opt["name"]), String(opt["label"]), opt["name"] == current)


func _difficulty_button(parent: Control, name: String, label: String, selected: bool) -> void:
	var btn := Button.new()
	btn.text = label
	btn.custom_minimum_size = Vector2(360, 64)
	btn.add_theme_font_size_override("font_size", 30)
	btn.add_theme_color_override("font_color", Color(0.16, 0.32, 0.16))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.74, 0.90, 0.62, 1.0) if selected else Color(0.88, 0.96, 0.82, 1.0)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		normal.set(c, 16)
	var bw := 5 if selected else 0
	normal.border_width_left = bw
	normal.border_width_top = bw
	normal.border_width_right = bw
	normal.border_width_bottom = bw
	normal.border_color = Color(0.30, 0.52, 0.28, 1.0)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", normal)
	btn.add_theme_stylebox_override("pressed", normal)
	btn.pressed.connect(func() -> void: difficulty_chosen.emit(name))
	parent.add_child(btn)


func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	_score_label = _label("Score  0      Best  0", 34, Color(0.2, 0.34, 0.2))
	_score_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_score_label.offset_top = 16
	_score_label.offset_bottom = 60
	_root.add_child(_score_label)

	_build_message(_root)
	_build_dpad(_root)


func _build_message(parent: Control) -> void:
	_msg_panel = PanelContainer.new()
	_msg_panel.set_anchors_preset(Control.PRESET_CENTER)
	_msg_panel.offset_left = -300
	_msg_panel.offset_right = 300
	_msg_panel.offset_top = -120
	_msg_panel.offset_bottom = 120
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.90, 0.97)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		style.set(c, 26)
	style.border_width_left = 5
	style.border_width_top = 5
	style.border_width_right = 5
	style.border_width_bottom = 5
	style.border_color = Color(0.48, 0.74, 0.40, 1.0)
	_msg_panel.add_theme_stylebox_override("panel", style)
	parent.add_child(_msg_panel)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 18)
	var margin := MarginContainer.new()
	for m in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		margin.add_theme_constant_override(m, 28)
	margin.add_child(vbox)
	_msg_panel.add_child(margin)

	_msg_label = _label("Press an arrow key\nto start!", 38, Color(0.24, 0.40, 0.22))
	vbox.add_child(_msg_label)

	_again_btn = Button.new()
	_again_btn.text = "▶  Play Again"
	_again_btn.custom_minimum_size = Vector2(240, 64)
	_again_btn.add_theme_font_size_override("font_size", 30)
	_again_btn.add_theme_color_override("font_color", Color(0.16, 0.32, 0.16))
	var bs := StyleBoxFlat.new()
	bs.bg_color = Color(0.80, 0.92, 0.70, 1.0)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		bs.set(c, 16)
	_again_btn.add_theme_stylebox_override("normal", bs)
	_again_btn.add_theme_stylebox_override("hover", bs)
	_again_btn.add_theme_stylebox_override("pressed", bs)
	_again_btn.pressed.connect(func() -> void: restart_requested.emit())
	vbox.add_child(_again_btn)
	_again_btn.visible = false


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.95))
	l.add_theme_constant_override("outline_size", 6)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _build_dpad(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	panel.offset_left = 24.0
	panel.offset_top = -248.0
	panel.offset_right = 224.0
	panel.offset_bottom = -24.0
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.99, 0.92, 0.92)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		style.set(c, 20)
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

	_spacer(grid)
	_arrow(grid, "↑", Vector2i(0, -1))
	_spacer(grid)
	_arrow(grid, "←", Vector2i(-1, 0))
	_spacer(grid)
	_arrow(grid, "→", Vector2i(1, 0))
	_spacer(grid)
	_arrow(grid, "↓", Vector2i(0, 1))
	_spacer(grid)


func _spacer(grid: GridContainer) -> void:
	var s := Control.new()
	s.custom_minimum_size = Vector2(56, 56)
	grid.add_child(s)


func _arrow(grid: GridContainer, glyph: String, dir: Vector2i) -> void:
	var btn := Button.new()
	btn.text = glyph
	btn.custom_minimum_size = Vector2(56, 56)
	btn.add_theme_font_size_override("font_size", 32)
	btn.add_theme_color_override("font_color", Color(0.18, 0.32, 0.16, 1.0))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.88, 0.96, 0.82, 1.0)
	for c in ["corner_radius_top_left", "corner_radius_top_right",
			"corner_radius_bottom_left", "corner_radius_bottom_right"]:
		normal.set(c, 14)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", normal)
	btn.add_theme_stylebox_override("pressed", normal)
	btn.pressed.connect(func() -> void: move_requested.emit(dir))
	grid.add_child(btn)
