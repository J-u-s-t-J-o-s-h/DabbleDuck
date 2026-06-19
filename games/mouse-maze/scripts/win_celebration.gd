extends CanvasLayer
## Win overlay: friendly message + confetti burst.

var _panel: PanelContainer
var _label: Label
var _confetti: GPUParticles2D
var _visible := false


func _ready() -> void:
	layer = 10
	_build_ui()
	hide_celebration()


func show_celebration(message: String) -> void:
	_label.text = message
	_panel.visible = true
	_visible = true
	_confetti.emitting = true
	_confetti.amount = 72
	_confetti.explosiveness = 1.0
	_confetti.one_shot = true


func hide_celebration() -> void:
	_panel.visible = false
	_visible = false
	if _confetti:
		_confetti.emitting = false


func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	_confetti = GPUParticles2D.new()
	_confetti.position = Vector2(480, 200)
	_confetti.one_shot = true
	_confetti.amount = 72
	_confetti.lifetime = 1.8
	_confetti.explosiveness = 1.0
	var mat := ParticleProcessMaterial.new()
	mat.direction = Vector3(0, -1, 0)
	mat.spread = 180.0
	mat.initial_velocity_min = 120.0
	mat.initial_velocity_max = 280.0
	mat.gravity = Vector3(0, 280, 0)
	mat.scale_min = 0.2
	mat.scale_max = 0.55
	mat.color = Color(1.0, 0.85, 0.45, 1.0)
	_confetti.process_material = mat
	root.add_child(_confetti)

	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.offset_left = -220
	_panel.offset_right = 220
	_panel.offset_top = -80
	_panel.offset_bottom = 80
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1.0, 0.97, 0.88, 0.95)
	style.corner_radius_top_left = 24
	style.corner_radius_top_right = 24
	style.corner_radius_bottom_left = 24
	style.corner_radius_bottom_right = 24
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color(0.45, 0.72, 0.38, 1.0)
	style.shadow_size = 8
	style.shadow_color = Color(0.2, 0.3, 0.2, 0.25)
	_panel.add_theme_stylebox_override("panel", style)
	root.add_child(_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	_panel.add_child(margin)

	_label = Label.new()
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.add_theme_font_size_override("font_size", 32)
	_label.add_theme_color_override("font_color", Color(0.25, 0.38, 0.22, 1.0))
	margin.add_child(_label)
