import mouseSprite from '../../assets/games/mouse.png'
import cheeseSprite from '../../assets/games/cheese.png'
import grassFloor from '../../assets/games/grass-tile.png'
import hedgeWall from '../../assets/games/hedge-tile.png'
import forestWall from '../../assets/games/forest-wall.png'
import forestFloor from '../../assets/games/forest-floor.png'
import castleWall from '../../assets/games/castle-wall.png'
import castleFloor from '../../assets/games/castle-floor.png'
import moonWall from '../../assets/games/moonlight-wall.png'
import moonFloor from '../../assets/games/moonlight-floor.png'
import decoFlower from '../../assets/games/deco-flower.png'
import decoMushroom from '../../assets/games/deco-mushroom.png'
import decoTorch from '../../assets/games/deco-torch.png'
import decoStar from '../../assets/games/deco-star.png'

// ===========================================================================
// Maze themes and levels
//
// New levels/themes are pure data — add an entry and the level select, themed
// rendering, and progression all pick it up automatically.
// ===========================================================================

export interface MazeTheme {
  id: string
  wall: string
  floor: string
  decoration: string
  /** Solid fallback colors used if an image asset fails to load. */
  wallColor: string
  floorColor: string
  /** Subtle ambient overlay (e.g. moonlight) drawn over the board. */
  ambient?: string
}

export const THEMES: Record<string, MazeTheme> = {
  garden: {
    id: 'garden',
    wall: hedgeWall,
    floor: grassFloor,
    decoration: decoFlower,
    wallColor: '#3f9a3f',
    floorColor: '#cdebac'
  },
  forest: {
    id: 'forest',
    wall: forestWall,
    floor: forestFloor,
    decoration: decoMushroom,
    wallColor: '#2f7d3a',
    floorColor: '#d8a86a'
  },
  castle: {
    id: 'castle',
    wall: castleWall,
    floor: castleFloor,
    decoration: decoTorch,
    wallColor: '#8a8f99',
    floorColor: '#e6dcc2'
  },
  moonlight: {
    id: 'moonlight',
    wall: moonWall,
    floor: moonFloor,
    decoration: decoStar,
    wallColor: '#16264a',
    floorColor: '#1d3b4a',
    ambient: 'rgba(40, 70, 160, 0.22)'
  }
}

export interface MazeLevel {
  id: string
  name: string
  themeId: keyof typeof THEMES
  /** Maze size in cells (size x size). Larger = harder. */
  size: number
  /** Friendly difficulty label shown to children/parents. */
  difficulty: string
}

export const LEVELS: MazeLevel[] = [
  { id: 'garden', name: 'Tiny Garden Maze', themeId: 'garden', size: 6, difficulty: 'Easy' },
  { id: 'forest', name: 'Forest Trail Maze', themeId: 'forest', size: 8, difficulty: 'Medium' },
  { id: 'castle', name: 'Castle Maze', themeId: 'castle', size: 11, difficulty: 'Tricky' },
  { id: 'moonlight', name: 'Moonlight Maze', themeId: 'moonlight', size: 14, difficulty: 'Expert' }
]

export const SPRITES = {
  mouse: mouseSprite,
  cheese: cheeseSprite
}
