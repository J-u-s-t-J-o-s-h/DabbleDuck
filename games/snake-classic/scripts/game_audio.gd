extends Node
## Simple, child-friendly audio for Classic Snake: a gentle music loop, a happy
## "eat" blip that rises with your score, and a soft "oops" when the round ends.
## Uses CC0 OGG SFX when present, with procedural synth fallbacks. Respects the
## DabbleSDK sound setting.

const _SPARKLE := "res://assets/audio/sparkle.ogg"
const _WIN := "res://assets/audio/win.ogg"
const _MUSIC := "res://assets/audio/music.ogg"

const _MUSIC_VOL := -16.0
const _RATE := 22050

var _music: AudioStreamPlayer
var _eat: AudioStreamPlayer
var _oops: AudioStreamPlayer
var _enabled := true


func _ready() -> void:
	_eat = _make(_load_or_synth(_SPARKLE, _eat_stream()))
	_oops = _make(_oops_stream())
	_music = _make(_load_or_synth(_MUSIC, _music_stream()))
	_music.volume_db = _MUSIC_VOL
	add_child(_eat)
	add_child(_oops)
	add_child(_music)


func configure_from_sdk() -> void:
	_enabled = DabbleSDK.sound_enabled()
	if _enabled and not DabbleSDK.is_headless():
		_music.volume_db = -40.0
		_music.play()
		var tw := create_tween()
		tw.tween_property(_music, "volume_db", _MUSIC_VOL, 1.5)
	else:
		_music.stop()


func play_eat(score: int = 0) -> void:
	if not _enabled:
		return
	_eat.pitch_scale = clampf(1.0 + float(score) * 0.03, 1.0, 1.7)
	_eat.play()


func play_oops() -> void:
	if not _enabled:
		return
	_oops.play()


# --- Helpers -------------------------------------------------------------

func _load_or_synth(path: String, fallback: AudioStream) -> AudioStream:
	if ResourceLoader.exists(path):
		var s := load(path) as AudioStream
		if s != null:
			return s
	return fallback


func _make(stream: AudioStream) -> AudioStreamPlayer:
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


func _put(data: PackedByteArray, idx: int, sample: float) -> void:
	var v := int(clamp(sample * 32767.0, -32768.0, 32767.0))
	data[idx * 2] = v & 0xff
	data[idx * 2 + 1] = (v >> 8) & 0xff


func _eat_stream() -> AudioStreamWAV:
	var dur := 0.13
	var n := int(_RATE * dur)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var t := float(i) / _RATE
		var frac := t / dur
		var freq := 700.0 if frac < 0.5 else 950.0
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * 0.9
		_put(data, i, (sin(TAU * freq * t) + 0.25 * sin(TAU * 2.0 * freq * t)) * 0.16 * env)
	return _wav(data)


func _oops_stream() -> AudioStreamWAV:
	var dur := 0.3
	var n := int(_RATE * dur)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var t := float(i) / _RATE
		var frac := t / dur
		var freq := lerpf(440.0, 220.0, frac)
		var env := sin(clampf(frac, 0.0, 1.0) * PI) * 0.8
		_put(data, i, sin(TAU * freq * t) * 0.14 * env)
	return _wav(data)


func _music_stream() -> AudioStreamWAV:
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
		_put(data, i, melody_s + bass_s)
	return _wav(data, true)
