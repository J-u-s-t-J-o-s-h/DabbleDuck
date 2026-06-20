extends RefCounted
## Maze level definitions for Mouse Maze 3D.
## Legend: '#' hedge wall, '.' path, 'M' mouse start, 'C' cheese goal.
## Each grid must have exactly one M and one C, and C must be reachable from M.
## Built via a static func because PackedStringArray() is not a const expression.

static func all() -> Array:
	return [
		# Level 1 — gentle introduction (9x9).
		PackedStringArray([
			"#########",
			"#M..#...#",
			"#.#.#.#.#",
			"#.#...#.#",
			"#.#####.#",
			"#.....#C#",
			"#.###.#.#",
			"#...#...#",
			"#########",
		]),
		# Level 2 — comb corridors with a single crossover (9x9).
		PackedStringArray([
			"#########",
			"#M..#..C#",
			"#.#.#.#.#",
			"#.#.#.#.#",
			"#.#...#.#",
			"#.#.#.#.#",
			"#.#.#.#.#",
			"#...#...#",
			"#########",
		]),
		# Level 3 — bigger winding maze (11x11).
		PackedStringArray([
			"###########",
			"#M........#",
			"#.#######.#",
			"#.#.....#.#",
			"#.#.###.#.#",
			"#.#.#.#.#.#",
			"#.#.#.#.#.#",
			"#...#.#...#",
			"#####.###.#",
			"#........C#",
			"###########",
		]),
	]
