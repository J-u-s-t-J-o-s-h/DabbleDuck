// Open the Mouse Maze Godot project in the Godot editor.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { findGodotBin } from './godot-resolve.mjs'

const godot = findGodotBin()
if (!godot) {
  console.error(
    'Godot not found.\n' +
      '  Windows: winget install GodotEngine.GodotEngine\n' +
      '  Or set DABBLE_GODOT_BIN to your Godot.exe path.\n' +
      '  See docs/godot-development.md'
  )
  process.exit(1)
}

const project = join(process.cwd(), 'games', 'mouse-maze')
console.log(`Opening ${project} with ${godot}`)
const child = spawn(godot, ['--editor', '--path', project], {
  stdio: 'inherit',
  detached: true
})
child.unref()
