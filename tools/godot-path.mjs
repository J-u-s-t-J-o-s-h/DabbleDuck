import { findGodotBin } from './godot-resolve.mjs'
const path = findGodotBin()
if (path) {
  console.log(path)
} else {
  console.error('Godot not found. See docs/godot-development.md')
  process.exit(1)
}
