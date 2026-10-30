// Audio utility for WhatsApp-style voice note recording and playback

export function formatAudioDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00"
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`
}

// Generates a speech-like modulated WAV audio blob URL as a fallback when microphone access is unavailable
export function generateVoiceNoteFallbackBlob(
  durationSeconds: number = 3,
): string {
  const sampleRate = 22050
  const safeDuration = Math.max(1, Math.min(60, durationSeconds))
  const numFrames = Math.floor(sampleRate * safeDuration)
  const buffer = new Float32Array(numFrames)

  // Generate pleasant human-vocal-like harmonic tones with natural cadence and vibrato
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate
    // Modulation envelope mimicking spoken words
    const wordEnvelope = Math.sin(Math.PI * ((t % 0.4) / 0.4)) * 0.7 + 0.3
    const fade = Math.min(1, t * 10) * Math.min(1, (safeDuration - t) * 10)

    // Formant blend (simulated voice note sound)
    const f0 = 180 + 15 * Math.sin(2 * Math.PI * 4 * t) // fundamental pitch with subtle vibrato
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

  /* RIFF identifier */
  writeString(view, 0, "RIFF")
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true)
  /* RIFF type */
  writeString(view, 8, "WAVE")
  /* format chunk identifier */
  writeString(view, 12, "fmt ")
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, 1, true)
  /* channel count (mono) */
  view.setUint16(22, 1, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true)
  /* bits per sample */
  view.setUint16(34, 16, true)
  /* data chunk identifier */
  writeString(view, 36, "data")
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true)

  // Write PCM samples (16-bit)
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
