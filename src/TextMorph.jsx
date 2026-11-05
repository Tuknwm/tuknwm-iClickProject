import { useId } from 'react'

const FADE_OUT = 0.45
const FADE_IN = 0.15

export default function TextMorph({ words, morph = 1, hold = 1.6, ease = 'ease-in-out' }) {
  const id = useId().replace(/:/g, '')
  const animName = `tm-rot-${id}`
  const gooName = `tm-goo-${id}`
  const cleanName = `tm-clean-${id}`
  const filterId = `tm-thr-${id}`

  const slot = morph + hold
  const cycle = slot * words.length
  const pct = s => Math.min(100, (s / cycle) * 100).toFixed(4)
  const p = s => Math.min(100, Math.max(0, (s / slot) * 100)).toFixed(4) // within one slot
  const keyframes = `
@keyframes ${animName} {
  0%   { opacity: 0; filter: blur(20px); transform: translate(-50%, -50%) scale(0.8); }
  ${pct(morph)}%, ${pct(morph + hold)}% { opacity: 1; filter: blur(0px); transform: translate(-50%, -50%) scale(1); }
  ${pct(2 * morph + hold)}%, 100% { opacity: 0; filter: blur(20px); transform: translate(-50%, -50%) scale(1.2); }
}
@keyframes ${gooName} {
  0%, ${p(morph - FADE_OUT)}% { opacity: 1; }
  ${p(morph + FADE_OUT / 2)}%, ${p(slot - FADE_IN)}% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ${cleanName} {
  0%, ${p(morph - FADE_OUT)}% { opacity: 0; }
  ${p(morph + FADE_OUT / 2)}%, ${p(slot - FADE_IN)}% { opacity: 1; }
  100% { opacity: 0; }
}`
  const longest = words.reduce((a, w) => (w.text.length > a.length ? w.text : a), '')

  const layer = () => words.map((w, i) => (
    <span
      key={i}
      className={w.className}
      style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', opacity: 0, whiteSpace: 'nowrap',
        animation: `${animName} ${cycle}s ${(slot * i).toFixed(3)}s infinite ${ease}`,
        willChange: 'opacity, filter, transform',
      }}
    >{w.text}</span>
  ))

  return (
    <span className="text-morph" aria-hidden="true">
      <style>{keyframes}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id={filterId}>
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ visibility: 'hidden', whiteSpace: 'nowrap' }}>{longest}</span>
        <span style={{ position: 'absolute', inset: 0, animation: `${cleanName} ${slot}s infinite` }}>{layer()}</span>
        <span style={{ position: 'absolute', inset: 0, filter: `url(#${filterId})`, animation: `${gooName} ${slot}s infinite` }}>{layer()}</span>
      </span>
    </span>
  )
}
