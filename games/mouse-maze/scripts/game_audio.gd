extends Node
## Lightweight procedural audio — no external files required. Respects DabbleSDK.

var _move_player: AudioStreamPlayer
var _sparkle_player: AudioStreamPlayer
var _win_player: AudioStreamPlayer
var _music_player: AudioStreamPlayer
var _enabled := true
var _music_t := 0.0


func _ready() -> void:
	_move_player = _make_player(_tone_stream(420, 0.08, 0.12))
	_sparkle_player = _make_player(_tone_stream(880, 0.12, 0.1))
	_win_player = _make_player(_fanfare_stream())
	_music_player = _make_player(_ambient_stream())
	_music_player.volume_db = -18.0
	add_child(_move_player)
	add_child(_sparkle_player)
	add_child(_win_player)
	add_child(_music_player)


func configure_from_sdk() -> void:
	_enabled = DabbleSDK.sound_enabled()
	if _enabled and not DabbleSDK.is_headless():
		_music_player.play()
	else:
		_music_player.stop()


func play_move() -> void:
	if not _enabled:
		return
	_move_player.play()


func play_sparkle() -> void:
	if not _enabled:
		return
	_sparkle_player.play()


func play_win() -> void:
	if not _enabled:
		return
	_win_player.play()


func _process(delta: float) -> void:
	if not _enabled or not _music_player.playing:
		return
	_music_t += delta
	# Gentle volume swell on the looping ambient bed.
	_music_player.volume_db = -20.0 + sin(_music_t * 0.4) * 1.5


func _make_player(stream: AudioStream) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.stream = stream
	return p


func _tone_stream(freq: float, duration: float, volume: float) -> AudioStreamWAV:
	var rate := 22050
	var count := int(rate * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in count:
		var t := float(i) / rate
		var env := 1.0 - t / duration
		var sample := sin(TAU * freq * t) * volume * env
		var v := int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data[i * 2] = v & 0xff
		data[i * 2 + 1] = (v >> 8) & 0xff
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav


func _fanfare_stream() -> AudioStreamWAV:
	var notes := [523.25, 659.25, 783.99, 1046.5]
	var rate := 22050
	var per := int(rate * 0.18)
	var total := per * notes.size()
	var data := PackedByteArray()
	data.resize(total * 2)
	var idx := 0
	for n in notes:
		for i in per:
			var t := float(i) / rate
			var env := 1.0 - float(i) / per
			var sample := sin(TAU * n * t) * 0.14 * env
			var v := int(clamp(sample * 32767.0, -32768.0, 32767.0))
			data[idx * 2] = v & 0xff
			data[idx * 2 + 1] = (v >> 8) & 0xff
			idx += 1
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav


func _ambient_stream() -> AudioStreamWAV:
	var rate := 22050
	var duration := 4.0
	var count := int(rate * duration)
	var data := PackedByteArray()
	data.resize(count * 2)
	var notes: Array[float] = [392.0, 440.0, 523.25, 587.33]
	for i in count:
		var t := float(i) / rate
		var note: float = notes[int(t * 2.0) % notes.size()]
		var sample := sin(TAU * note * t) * 0.04 + sin(TAU * (note / 2.0) * t) * 0.03
		var v := int(clamp(sample * 32767.0, -32768.0, 32767.0))
		data[i * 2] = v & 0xff
		data[i * 2 + 1] = (v >> 8) & 0xff
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = count
	return wav
