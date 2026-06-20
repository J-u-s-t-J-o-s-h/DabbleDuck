extends CanvasLayer
## Big, friendly "pick your friend" screen for young players.

signal character_chosen(type: String)

const CHOICES := [
	{"type": "mouse", "emoji": "🐭", "name": "Mouse", "color": Color(0.78, 0.74, 0.72)},
	{"type": "bunny", "emoji": "🐰", "name": "Bunny", "color": Color(0.97, 0.95, 0.92)},
	{"type": "turtle", "emoji": "🐢", "name": "Turtle", "color": Color(0.46, 0.70, 0.38)},
]

var _root: Control


func _ready() -> void:
	layer = 20
	_build_ui()
	hide_picker()


func show_picker() -> void:
	_root.visible = true


func hide_picker() -> void:
	_root.visible = false


func _build_ui() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)

	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.20, 0.32, 0.20, 0.55)
	_root.add_child(dim)

	var center := VBoxContainer.new()
	center.set_anchors_preset(Control.PRESET_CENTER)
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 28)
	center.offset_left = -440
	center.offset_right = 440
	center.offset_top = -200
	center.offset_bottom = 200
	_root.add_child(center)

	var title := Label.new()
	title.text = "Pick your friend!"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 52)
	title.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	title.add_theme_color_override("font_outline_color", Color(0.2, 0.35, 0.2, 1))
	title.add_theme_constant_override("outline_size", 8)
	center.add_child(title)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 28)
	center.add_child(row)

	for choice in CHOICES:
		row.add_child(_make_card(choice))


func _make_card(choice: Dictionary) -> Button:
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(220, 240)
	btn.focus_mode = Control.FOCUS_NONE

	var base := StyleBoxFlat.new()
	base.bg_color = Color(1.0, 0.99, 0.94, 1.0)
	base.set_corner_radius_all(26)
	base.set_border_width_all(5)
	base.border_color = choice["color"]
	base.shadow_size = 8
	base.shadow_color = Color(0.15, 0.25, 0.15, 0.3)
	var hover := base.duplicate() as StyleBoxFlat
	hover.bg_color = Color(0.92, 0.98, 0.86, 1.0)
	hover.border_color = Color(0.35, 0.62, 0.28, 1.0)
	btn.add_theme_stylebox_override("normal", base)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", hover)
	btn.add_theme_stylebox_override("focus", base)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_theme_constant_override("separation", 10)
	btn.add_child(vbox)

	var emoji := Label.new()
	emoji.text = choice["emoji"]
	emoji.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	emoji.add_theme_font_size_override("font_size", 110)
	vbox.add_child(emoji)

	var name_label := Label.new()
	name_label.text = choice["name"]
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 34)
	name_label.add_theme_color_override("font_color", Color(0.22, 0.36, 0.2, 1.0))
	vbox.add_child(name_label)

	var t: String = choice["type"]
	btn.pressed.connect(func() -> void: character_chosen.emit(t))
	return btn
