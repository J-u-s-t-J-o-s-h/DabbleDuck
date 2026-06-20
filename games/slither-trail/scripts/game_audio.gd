extends Node
## Lightweight, child-friendly audio for Slither Trail.
##
## A gentle looping music bed, a happy "collect" pluck that rises with a combo,
## a soft "oops" boop (never harsh), a sparkle, a win fanfare, and occasional
## bird chirps for garden ambience. CC0 OGG SFX are used when present, with
## procedural synth fallbacks so the game always has sound. Respects the
## DabbleSDK sound setting.

const _SPARKLE := "res://assets/audio/sparkle.ogg"
const _WIN := "res://assets/audio/win.ogg"
const _MUSIC := "res://assets/audio/music.ogg"

const _MUSIC_VOL := -15.0
const _RATE := 22050

var _music_player: AudioStreamPlayer
var _collect_player: AudioStreamPlayer
var _oops_player: AudioStreamPlayer
var _sparkle_player: AudioStreamPlayer
var _win_player: AudioStreamPlayer
var _chirp_player: AudioStreamPlayer
var _chirp_timer: Timer
var _enabled := true
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	_collect_player = _make_player(_collect_stream())
	_oops_player = _make_player(_oops_stream())
	_sparkle_player = _make_player(_load_or_synth(_SPARKLE, _tone_stream(940.0, 0.12, 0.1)))
	_win_player = _make_player(_load_or_synth(_WIN, _fanfare_stream()))
	_music_player = _make_player(_load_or_synth(_MUSIC, _music_stream()))
	_chirp_player = _make_player(_chirp_stream())
	_chirp_player.volume_db = -20.0
	_music_player.volume_db = _MUSIC_VOL
	add_child(_collect_player)
	add_child(_oops_player)
	add_child(_sparkle_player)
	add_child(_win_player)
	add_child(_music_player)
	add_child(_chirp_player)

	_chirp_timer = Timer.new()
	_chirp_timer.one_shot = true
	_chirp_timer.timeout.connect(_on_chirp)
	add_child(_chirp_timer)


func configure_from_sdk() -> void:
	_enabled = DabbleSDK.sound_enabled()
	if _enabled and not DabbleSDK.is_headless():
		_start_music()
		_schedule_chirp()
	else:
		_music_player.stop()


func play_collect(combo: int = 0) -> void:
	if not _enabled:
		return
	# Pitch rises gently with each item in a row for a satisfying "ladder".
	_collect_player.pitch_scale = clampf(1.0 + float(combo) * 0.06, 1.0, 1.6)
	_collect_player.play()


func play_oops() -> void:
	if not _enabled:
		return
	_oops_player.play()


func play_sparkle() -> void:
	if not _enabled:
		return
	_sparkle_player.play()


func play_win() -> void:
	if not _enabled:
		return
	_music_player.volume_db = _MUSIC_VOL - 6.0
	_win_player.play()


func _start_music() -> void:
	_music_player.volume_db = -40.0
	_music_player.play()
	var tween := create_tween()
	tween.tween_property(_music_player, "volume_db", _MUSIC_VOL, 1.5)


func _schedule_chirp() -> void:
	if _chirp_timer:
		_chirp_timer.start(_rng.randf_range(2.5, 6.0))


func _on_chirp() -> void:
	if _enabled:
		_chirp_player.pitch_scale = _rng.randf_range(0.9, 1.3)
		_chirp_player.play()
	_schedule_chirp()


# --- Asset / player helpers ----------------------------------------------

func _load_or_synth(path: String, fallback: AudioStream) -> AudioStream:
	if ResourceLoader.exists(path):
		var stream := load(path) as AudioStream
		if stream != null:
			return stream
	return fallback


func _make_player(stream: AudioStream) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	return p


func _wav(data: PackedByteArray, looped: bool = false) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = _RATE
	wav.stereo = false
	wav.data = data
	if looped:
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_begin = 0
		wav.loop_end = data.size() / 2
	return wav


func _write_sample(data: PackedByteArray, idx: int, sample: float) -> void:
	var v := int(clamp(sample * 32767.0, -32768.0, 32767.0))
	data[idx * 2] = v & 0xff
	data[idx * 2 + 1] = (v >> 8) & 0xff


# --- Procedural sounds ----------------------------------------------------

func _collect_stream() -> AudioStreamWAV:
	# A bright two-note "blip" — friendly and rewarding.
	var duration := 0.16
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var frac := t / duration
		var freq := 740.0 if frac < 0.5 else 988.0
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * 0.9
		var sample := (sin(TAU * freq * t) + 0.25 * sin(TAU * 2.0 * freq * t)) * 0.16 * env
		_write_sample(data, i, sample)
	return _wav(data)


func _oops_stream() -> AudioStreamWAV:
	# Soft, kind "boop-eep" — a gentle nudge, never a buzzer.
	var duration := 0.22
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var frac := t / duration
		var freq := lerpf(420.0, 300.0, frac)
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * 0.8
		var sample := sin(TAU * freq * t) * 0.14 * env
		_write_sample(data, i, sample)
	return _wav(data)


func _chirp_stream() -> AudioStreamWAV:
	# Tiny bird chirp: a quick up-down whistle.
	var duration := 0.14
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var frac := t / duration
		var freq := 2200.0 + sin(frac * PI) * 700.0
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * 0.7
		var sample := sin(TAU * freq * t) * 0.1 * env
		_write_sample(data, i, sample)
	return _wav(data)


func _tone_stream(freq: float, duration: float, volume: float) -> AudioStreamWAV:
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var env := 1.0 - t / duration
		var sample := sin(TAU * freq * t) * volume * env
		_write_sample(data, i, sample)
	return _wav(data)


func _fanfare_stream() -> AudioStreamWAV:
	var notes := [523.25, 659.25, 783.99, 1046.5]
	var per := int(_RATE * 0.18)
	var total := per * notes.size()
	var data := PackedByteArray()
	data.resize(total * 2)
	var idx := 0
	for n in notes:
		for i in per:
			var t := float(i) / _RATE
			var env := 1.0 - float(i) / per
			var sample := (sin(TAU * n * t) + 0.3 * sin(TAU * 2.0 * n * t)) * 0.12 * env
			_write_sample(data, idx, sample)
			idx += 1
	return _wav(data)


func _music_stream() -> AudioStreamWAV:
	# Gentle, cheerful C-major-pentatonic loop with a soft I-vi-IV-V bass.
	var beat := 0.42
	var melody := [659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33,
			659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25, 587.33]
	var bass := [130.81, 110.0, 87.31, 98.0]
	var beats := melody.size()
	var count := int(_RATE * beat * float(beats))
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var b := int(t / beat)
		var ti := t - float(b) * beat
		var m_freq: float = melody[b % beats]
		var bs_freq: float = bass[(b / 4) % bass.size()]
		var atk := minf(ti / 0.01, 1.0)
		var rel := pow(1.0 - ti / beat, 1.4)
		var m_env := atk * rel
		var melody_s := (sin(TAU * m_freq * t) + 0.3 * sin(TAU * 2.0 * m_freq * t)) * 0.10 * m_env
		var bass_s := sin(TAU * bs_freq * t) * 0.07 * (atk * pow(1.0 - ti / beat, 0.8))
		_write_sample(data, i, melody_s + bass_s)
	return _wav(data, true)
