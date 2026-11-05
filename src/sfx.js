export const ctx = new AudioContext()
export const masterGain = ctx.createGain()
masterGain.connect(ctx.destination)
const buffers = {}

function load(name) {
  buffers[name] ??= fetch(`${import.meta.env.BASE_URL}FX/${name}.mp3`)
    .then(r => r.arrayBuffer())
    .then(b => ctx.decodeAudioData(b))
    .catch(e => { console.error(`${name}.mp3:`, e); return null })
  return buffers[name]
}

export function playSound(name, { detune = 0, volume = 1 } = {}) {
  if (ctx.state === 'suspended') ctx.resume()
  load(name).then(buf => {
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.detune.value = detune
    if (volume !== 1) {
      const gain = ctx.createGain()
      gain.gain.value = volume
      src.connect(gain).connect(masterGain)
    } else {
      src.connect(masterGain)
    }
    src.start()
  })
}

export function fadeIn(audio, secs = 6) {
  if (ctx.state === 'suspended') ctx.resume()
  const target = audio._targetVolume ?? 0.5
  audio.volume = 0
  const start = performance.now()
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / (secs * 1000))
    audio.volume = target * t
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

load('Click')
load('Select')
load('Explosion')
load('Count')
