#!/usr/bin/env node
// Copy a curated subset of CC0 assets from tools/_kenney_download staging
// into games/mouse-maze-3d/assets/ for shipping.
//
// Run: npm run assets:mouse-maze-3d
// See docs/assets/asset-registry.md for sources and licenses.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const staging = join(root, 'tools', '_kenney_download')
const dest = join(root, 'games', 'mouse-maze-3d', 'assets')

const copies = [
  {
    src: join(
      staging,
      'food3d/extracted/Ultimate Food Pack - Oct 2019/FBX/Cheese_Singles.fbx'
    ),
    dst: join(dest, 'characters/cheese_singles.fbx'),
    hint: 'Download Quaternius Ultimate Food Pack from OpenGameArt → tools/_kenney_download/food3d/'
  },
  {
    src: join(
      staging,
      'food3d/extracted/Ultimate Food Pack - Oct 2019/FBX/Mushroom.fbx'
    ),
    dst: join(dest, 'environment/mushroom.fbx'),
    hint: 'Same food pack'
  },
  {
    src: join(
      staging,
      'food3d/extracted/Ultimate Food Pack - Oct 2019/FBX/Broccoli.fbx'
    ),
    dst: join(dest, 'environment/bush_broccoli.fbx'),
    hint: 'Same food pack'
  },
  {
    src: join(
      staging,
      'animals/extracted/Animals Pack by Quaternius/FBX/Chick.fbx'
    ),
    dst: join(dest, 'characters/mouse_chick.fbx'),
    hint: 'Download Quaternius 5 Low Poly Animals from OpenGameArt → tools/_kenney_download/animals/'
  },
  {
    src: join(staging, 'audio/extracted/Audio/select_002.ogg'),
    dst: join(dest, 'audio/move.ogg'),
    hint: 'Download Kenney Interface Sounds from OpenGameArt → tools/_kenney_download/audio/'
  },
  {
    src: join(staging, 'audio/extracted/Audio/confirmation_004.ogg'),
    dst: join(dest, 'audio/win.ogg'),
    hint: 'Same Kenney audio pack'
  },
  {
    src: join(staging, 'audio/extracted/Audio/pluck_001.ogg'),
    dst: join(dest, 'audio/sparkle.ogg'),
    hint: 'Same Kenney audio pack'
  },
  {
    src: join(staging, 'audio/extracted/Audio/back_001.ogg'),
    dst: join(dest, 'audio/ambient.ogg'),
    hint: 'Same Kenney audio pack'
  },
  {
    src: join(staging, 'audio/extracted/License.txt'),
    dst: join(dest, 'licenses/kenney-interface-sounds-license.txt'),
    hint: 'Same Kenney audio pack'
  }
]

let ok = 0
let fail = 0

for (const { src, dst, hint } of copies) {
  mkdirSync(dirname(dst), { recursive: true })
  if (!existsSync(src)) {
    console.error(`[MISSING] ${src}\n          ${hint}`)
    fail += 1
    continue
  }
  copyFileSync(src, dst)
  console.log(`[OK] ${dst.replace(root + '\\', '').replace(root + '/', '')}`)
  ok += 1
}

console.log(`\nDone: ${ok} copied, ${fail} missing.`)
if (fail > 0) {
  console.error('See docs/assets/asset-registry.md for download links.')
  process.exit(1)
}
