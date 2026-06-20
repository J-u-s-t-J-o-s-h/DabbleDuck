extends Node
## DabbleDuck game SDK (GDScript).
##
## Implements the v1 cross-process contract every DabbleDuck game uses to talk
## to the launcher. Kept in sync by hand with src/shared/gameContract.ts.
##
##   launcher --(launch.json)--> game     read-only launch context
##   game     --(events.ndjson)--> launcher  append-only event log
##   game     --(result.json)--> launcher    final summary on clean exit

const CONTRACT_VERSION := 1

const ARG_SESSION := "--dabble-session"
const ARG_AUTOWIN := "--dabble-autowin"

var _session_dir := ""
var _events_path := ""
var _result_path := ""
var _launch: Dictionary = {}
var _active := false


func _ready() -> void:
	var args := _all_args()
	_session_dir = _arg_value(args, ARG_SESSION)
	if _session_dir == "":
		push_warning("[DabbleSDK] No %s argument; running standalone dev mode." % ARG_SESSION)
		return

	_events_path = _session_dir.path_join("events.ndjson")
	_result_path = _session_dir.path_join("result.json")

	var launch_path := _session_dir.path_join("launch.json")
	var f := FileAccess.open(launch_path, FileAccess.READ)
	if f == null:
		push_warning("[DabbleSDK] Could not read launch.json at %s" % launch_path)
		return
	var txt := f.get_as_text()
	f.close()

	var parsed = JSON.parse_string(txt)
	if typeof(parsed) == TYPE_DICTIONARY:
		_launch = parsed
		_active = true
		print("[DabbleSDK] session=%s child=%s" % [str(_launch.get("sessionId", "?")), profile_name()])
	else:
		push_warning("[DabbleSDK] launch.json was not a valid object.")


# --- Command-line helpers --------------------------------------------------

func _all_args() -> PackedStringArray:
	var a := OS.get_cmdline_args()
	a.append_array(OS.get_cmdline_user_args())
	return a


func _arg_value(args: PackedStringArray, flag: String) -> String:
	var idx := args.find(flag)
	if idx >= 0 and idx + 1 < args.size():
		return args[idx + 1]
	return ""


func has_flag(flag: String) -> bool:
	return _all_args().has(flag)


func is_headless() -> bool:
	return DisplayServer.get_name() == "headless"


func wants_autowin() -> bool:
	return is_headless() or has_flag(ARG_AUTOWIN)


# --- Read-only launch context ----------------------------------------------

func profile() -> Dictionary:
	return _launch.get("profile", {})


func profile_name() -> String:
	return str(profile().get("name", "friend"))


func age() -> int:
	return int(profile().get("age", 0))


func settings() -> Dictionary:
	return _launch.get("settings", {})


func sound_enabled() -> bool:
	return bool(settings().get("soundEnabled", true))


func reduced_motion() -> bool:
	return bool(settings().get("reducedMotion", false))


func remaining_seconds() -> int:
	return int(_launch.get("session", {}).get("remainingSeconds", 0))


func module_state() -> Variant:
	return _launch.get("moduleState", null)


# --- Event emission (game -> launcher) -------------------------------------

func _now_iso() -> String:
	return Time.get_datetime_string_from_system(true) + "Z"


func _emit(event: Dictionary) -> void:
	if not _active:
		print("[DabbleSDK] (dev) %s" % JSON.stringify(event))
		return
	event["t"] = _now_iso()
	var line := JSON.stringify(event)
	var f := FileAccess.open(_events_path, FileAccess.READ_WRITE)
	if f == null:
		f = FileAccess.open(_events_path, FileAccess.WRITE)
	if f == null:
		push_error("[DabbleSDK] cannot open events log at %s" % _events_path)
		return
	f.seek_end()
	f.store_line(line)
	f.close()


func emit_visit(activity_id: String) -> void:
	_emit({"type": "activity.visit", "activityId": activity_id})


func emit_completion(completion_type: String, amount: int = 1) -> void:
	_emit({"type": "completion", "completionType": completion_type, "amount": amount})


func emit_game_event(event_name: String, data: Dictionary = {}) -> void:
	_emit({"type": "game.event", "name": event_name, "data": data})


func save_module_state(state: Variant) -> void:
	_emit({"type": "module.state", "state": state})


func request_badge(id: String, label: String, icon: String) -> void:
	_emit({"type": "badge.request", "badge": {"id": id, "label": label, "icon": icon}})


# --- Finish ----------------------------------------------------------------

## Write result.json (if running under the launcher) and quit cleanly.
func finish(summary: Dictionary = {}) -> void:
	if _active:
		var result := {
			"contractVersion": CONTRACT_VERSION,
			"sessionId": _launch.get("sessionId", null),
			"completedCleanly": true,
			"summary": summary,
		}
		var f := FileAccess.open(_result_path, FileAccess.WRITE)
		if f != null:
			f.store_string(JSON.stringify(result))
			f.close()
	get_tree().quit(0)
