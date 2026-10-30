/**
 * Web Audio API synthesized notification chimes for Dart Rider
 * Zero external asset dependencies, zero network requests.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Play a double-chime alert when an incoming delivery request arrives
 */
export function playIncomingRequestChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // First tone (D5 - 587.33Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.18)

    // Second tone (A5 - 880Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.12)
    gain2.gain.setValueAtTime(0.25, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.45)
  } catch {
    // Best-effort audio play
  }
}

/**
 * Play a cheerful completion sound when delivery handover completes
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0.18, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.25)
    })
  } catch {
    // Ignore
  }
}

// Audio utility for WhatsApp-style voice note recording and playback
export function formatAudioDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00"
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`
}

// Generates a speech-like modulated WAV audio blob URL as a fallback when microphone access is unavailable
export function generateVoiceNoteFallbackBlob(durationSeconds: number = 3): string {
  const sampleRate = 22050
  const safeDuration = Math.max(1, Math.min(60, durationSeconds))
  const numFrames = Math.floor(sampleRate * safeDuration)
  const buffer = new Float32Array(numFrames)

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate
    const wordEnvelope = Math.sin(Math.PI * ((t % 0.4) / 0.4)) * 0.7 + 0.3
    const fade = Math.min(1, t * 10) * Math.min(1, (safeDuration - t) * 10)

    const f0 = 180 + 15 * Math.sin(2 * Math.PI * 4 * t)
    const s1 = Math.sin(2 * Math.PI * f0 * t)
    const s2 = 0.5 * Math.sin(2 * Math.PI * f0 * 2 * t)
    const s3 = 0.25 * Math.sin(2 * Math.PI * f0 * 3 * t)

    buffer[i] = (s1 + s2 + s3) * wordEnvelope * fade * 0.25
  }

  return encodeWav(buffer, sampleRate)
}

function encodeWav(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, "data")
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
