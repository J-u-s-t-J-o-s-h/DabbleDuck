// ===========================================================================
// Audio service
//
// All game audio is synthesized with the Web Audio API rather than shipping
// audio files. This keeps DabbleDuck local-first (no downloads, no licensing,
// no CSP media-src), while still giving gentle background music and friendly
// sound effects. Audio is optional and adjustable via `setMuted`.
//
// Browsers require a user gesture before an AudioContext can produce sound, so
// callers should invoke `unlock()` from a click/keypress (e.g. starting a
// level) before relying on playback.
// ===========================================================================

const MUTE_KEY = 'dabble.audioMuted'

type Wave = OscillatorType

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicTimer: number | null = null
  private musicStep = 0
  muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      this.muted = false
    }
  }

  /** Lazily create / resume the audio context (call from a user gesture). */
  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        if (!Ctor) return null
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0 : 1
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  /** Unlock audio from a user gesture. */
  unlock(): void {
    this.ensure()
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore storage errors */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 1,
        this.ctx.currentTime,
        0.03
      )
    }
  }

  /** Play a single enveloped tone. */
  private tone(
    freq: number,
    dur: number,
    type: Wave = 'sine',
    vol = 0.2,
    when = 0
  ): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  /** A soft step sound while the mouse moves. */
  move(): void {
    if (this.muted) return
    this.tone(360 + Math.random() * 60, 0.09, 'triangle', 0.1)
  }

  /** A gentle UI click/menu sound. */
  menu(): void {
    if (this.muted) return
    this.tone(540, 0.1, 'sine', 0.16)
    this.tone(720, 0.12, 'sine', 0.1, 0.04)
  }

  /** A bumping sound when running into a wall (kept friendly, not negative). */
  bump(): void {
    if (this.muted) return
    this.tone(150, 0.08, 'square', 0.05)
  }

  /** A happy ascending fanfare when the cheese is found. */
  win(): void {
    if (this.muted) return
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((n, i) => this.tone(n, 0.32, 'triangle', 0.2, i * 0.11))
    // a little sparkle on top
    this.tone(1568, 0.5, 'sine', 0.12, 0.55)
  }

  /** Start a gentle looping background melody (pentatonic, soothing). */
  startMusic(): void {
    if (this.musicTimer != null) return
    this.ensure()
    const scale = [392, 440, 523.25, 587.33, 659.25, 783.99]
    const pattern = [0, 2, 4, 2, 3, 1, 4, 5]
    const step = (): void => {
      if (this.muted) {
        this.musicStep += 1
        return
      }
      const note = scale[pattern[this.musicStep % pattern.length]]
      this.tone(note, 0.55, 'sine', 0.05)
      if (this.musicStep % 4 === 0) {
        this.tone(note / 2, 0.7, 'triangle', 0.035)
      }
      this.musicStep += 1
    }
    step()
    this.musicTimer = window.setInterval(step, 430)
  }

  stopMusic(): void {
    if (this.musicTimer != null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
}

/** Shared singleton used across the app. */
export const audio = new AudioManager()
