extends Node
## Fun kid-friendly audio: cute squeaks, a soft wall bump, sparkle + fanfare,
## and a gentle looping background tune. Uses CC0 OGG SFX when present and
## procedural synth otherwise. Music is procedural (no CC0 music in local packs).
## Respects DabbleSDK sound settings.

const _SPARKLE := "res://assets/audio/sparkle.ogg"
const _WIN := "res://assets/audio/win.ogg"
const _MUSIC := "res://assets/audio/music.ogg"

const _MUSIC_VOL := -14.0
const _RATE := 22050

var _move_player: AudioStreamPlayer
var _bump_player: AudioStreamPlayer
var _sparkle_player: AudioStreamPlayer
var _win_player: AudioStreamPlayer
var _music_player: AudioStreamPlayer
var _enabled := true
var _move_rng := RandomNumberGenerator.new()


func _ready() -> void:
	_move_rng.randomize()
	# Cute squeak for moves; pitch is randomized per step for liveliness.
	_move_player = _make_player(_squeak_stream())
	_bump_player = _make_player(_bump_stream())
	_sparkle_player = _make_player(_load_or_synth(_SPARKLE, _tone_stream(880.0, 0.12, 0.1)))
	_win_player = _make_player(_load_or_synth(_WIN, _fanfare_stream()))
	_music_player = _make_player(_load_or_synth(_MUSIC, _music_stream()))
	_music_player.volume_db = _MUSIC_VOL
	add_child(_move_player)
	add_child(_bump_player)
	add_child(_sparkle_player)
	add_child(_win_player)
	add_child(_music_player)


func configure_from_sdk() -> void:
	_enabled = DabbleSDK.sound_enabled()
	if _enabled and not DabbleSDK.is_headless():
		_start_music()
	else:
		_music_player.stop()


func play_move() -> void:
	if not _enabled:
		return
	_move_player.pitch_scale = _move_rng.randf_range(0.92, 1.12)
	_move_player.play()


func play_bump() -> void:
	if not _enabled:
		return
	_bump_player.play()


func play_sparkle() -> void:
	if not _enabled:
		return
	_sparkle_player.play()


func play_win() -> void:
	if not _enabled:
		return
	# Duck the music a touch so the fanfare shines.
	_music_player.volume_db = _MUSIC_VOL - 6.0
	_win_player.play()


func _start_music() -> void:
	_music_player.volume_db = -40.0
	_music_player.play()
	var tween := create_tween()
	tween.tween_property(_music_player, "volume_db", _MUSIC_VOL, 1.5)


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

func _squeak_stream() -> AudioStreamWAV:
	# Quick upward chirp — reads as a friendly little mouse "eep".
	var duration := 0.11
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var frac := t / duration
		var freq := lerpf(620.0, 1120.0, frac)
		# Smooth bell envelope (0 at both ends) to avoid clicks.
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * (1.0 - frac * 0.3)
		var sample := sin(TAU * freq * t) * 0.16 * env
		_write_sample(data, i, sample)
	return _wav(data)


func _bump_stream() -> AudioStreamWAV:
	# Soft low "boop" for bumping a hedge — gentle, never harsh.
	var duration := 0.13
	var count := int(_RATE * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / _RATE
		var frac := t / duration
		var freq := lerpf(220.0, 150.0, frac)
		var env := pow(1.0 - frac, 2.0)
		var sample := sin(TAU * freq * t) * 0.18 * env
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
	# Gentle, cheerful C-major-pentatonic loop with a soft I–vi–IV–V bass.
	var beat := 0.4
	var melody := [659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33,
			659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25, 587.33]
	var bass := [130.81, 110.0, 87.31, 98.0]  # C3, A2, F2, G2 (one per 4 beats)
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
		# Plucky envelope: quick attack, full release by end of beat (loop-safe).
		var atk := minf(ti / 0.01, 1.0)
		var rel := pow(1.0 - ti / beat, 1.4)
		var m_env := atk * rel
		var melody_s := (sin(TAU * m_freq * t) + 0.3 * sin(TAU * 2.0 * m_freq * t)) * 0.11 * m_env
		var bass_s := sin(TAU * bs_freq * t) * 0.08 * (atk * pow(1.0 - ti / beat, 0.8))
		_write_sample(data, i, melody_s + bass_s)
	return _wav(data, true)
