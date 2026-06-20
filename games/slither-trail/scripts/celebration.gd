extends CanvasLayer
## Big friendly celebration overlay: a warm message panel and a confetti burst.
## Used between levels and at the grand finish. Never shows failure — only joy.

var _panel: PanelContainer
var _label: Label
var _confetti: GPUParticles2D


func _ready() -> void:
	layer = 10
	_build_ui()
	hide_celebration()


func show_celebration(message: String) -> void:
	_label.text = message
	_panel.visible = true
	_confetti.emitting = true
	_confetti.restart()


func hide_celebration() -> void:
	_panel.visible = false
	if _confetti:
		_confetti.emitting = false


func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	_confetti = GPUParticles2D.new()
	_confetti.position = Vector2(640, 160)
	_confetti.one_shot = true
	_confetti.amount = 90
	_confetti.lifetime = 2.0
	_confetti.explosiveness = 0.95
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 160.0
	mat.initial_velocity_max = 360.0
	mat.gravity = Vector3(0, 320, 0)
	mat.scale_min = 0.25
	mat.scale_max = 0.6
	mat.color = Color(1.0, 0.82, 0.42, 1.0)
	_confetti.process_material = mat
	root.add_child(_confetti)

	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.offset_left = -300
	_panel.offset_right = 300
	_panel.offset_top = -90
	_panel.offset_bottom = 90
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.98, 0.90, 0.97)
	style.corner_radius_top_left = 28
	style.corner_radius_top_right = 28
	style.corner_radius_bottom_left = 28
	style.corner_radius_bottom_right = 28
	style.border_width_left = 5
	style.border_width_top = 5
	style.border_width_right = 5
	style.border_width_bottom = 5
	style.border_color = Color(0.48, 0.74, 0.40, 1.0)
	style.shadow_size = 10
	style.shadow_color = Color(0.2, 0.3, 0.2, 0.25)
	_panel.add_theme_stylebox_override("panel", style)
	root.add_child(_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 30)
	margin.add_theme_constant_override("margin_right", 30)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	_panel.add_child(margin)

	_label = Label.new()
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.add_theme_font_size_override("font_size", 40)
	_label.add_theme_color_override("font_color", Color(0.24, 0.40, 0.22, 1.0))
	margin.add_child(_label)
