import { useEffect, useRef } from 'react'

const CELL = 5

const PALETTE = (() => {
  const stops = [
    [0.00, 0, 0, 0, 0],
    [0.12, 70, 5, 0, 0],
    [0.25, 150, 20, 0, 140],
    [0.45, 230, 70, 0, 220],
    [0.65, 255, 140, 20, 255],
    [0.82, 255, 205, 70, 255],
    [1.00, 255, 250, 215, 255],
  ]
  const out = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let k = 0
    while (t > stops[k + 1][0]) k++
    const [t0, ...a] = stops[k], [t1, ...b] = stops[k + 1]
    const f = (t - t0) / (t1 - t0)
    const [r, g, bl, al] = a.map((v, j) => Math.round(v + (b[j] - v) * f))
    out[i] = (al << 24) | (bl << 16) | (g << 8) | r
  }
  return out
})()

export default function FireBottom({ intense = false }) {
  const canvasRef = useRef(null)
  const intenseRef = useRef(intense)
  useEffect(() => { intenseRef.current = intense }, [intense])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let cols = 0, rows = 0, heat, img, px, raf
    let running = true
    let height = 0.3
    const sparks = []

    const resize = () => {
      cols = Math.ceil(canvas.clientWidth / CELL)
      rows = Math.ceil(canvas.clientHeight / CELL)
      canvas.width = cols
      canvas.height = rows
      heat = new Float32Array(cols * rows)
      img = ctx.createImageData(cols, rows)
      px = new Uint32Array(img.data.buffer)
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = (now) => {
      if (!running) return
      const t = now / 1000
      const isIntense = intenseRef.current
      height += ((isIntense ? 0.75 : 0.32) - height) * 0.04
      const cool = 2 / (rows * height)
      const base = (rows - 1) * cols
      for (let x = 0; x < cols; x++) {
        const n = Math.sin(x * 0.11 + t * 1.7) * 0.5 + Math.sin(x * 0.31 - t * 2.9) * 0.3 + Math.sin(x * 0.053 + t * 0.6) * 0.2
        heat[base + x] = Math.min(1, Math.max(0, 0.78 + n * 0.3 + (Math.random() - 0.5) * 0.25))
      }

      const sway = Math.sin(t * 0.8) * 0.4
      for (let y = 0; y < rows - 1; y++) {
        const row = y * cols, below = row + cols
        for (let x = 0; x < cols; x++) {
          const src = heat[below + x]
          const dx = Math.round(Math.random() * 2 - 1 + sway)
          const dst = Math.min(cols - 1, Math.max(0, x + dx))
          heat[row + dst] = Math.max(0, src - Math.random() * cool)
        }
      }

      if (Math.random() < (isIntense ? 0.6 : 0.25)) {
        sparks.push({ x: Math.random() * cols, y: rows * (1 - height * 0.6), vx: (Math.random() - 0.5) * 0.4, vy: -(Math.random() * 0.6 + 0.4), life: 1 })
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.vx += (Math.random() - 0.5) * 0.08
        s.x += s.vx
        s.y += s.vy
        s.life -= 0.012
        const cx = s.x | 0, cy = s.y | 0
        if (s.life <= 0 || cy < 0 || cx < 0 || cx >= cols) { sparks.splice(i, 1); continue }
        heat[cy * cols + cx] = Math.max(heat[cy * cols + cx], 0.5 + s.life * 0.5)
      }

      for (let i = 0; i < heat.length; i++) px[i] = PALETTE[(heat[i] * 255) | 0]
      ctx.putImageData(img, 0, 0)
      raf = requestAnimationFrame(tick)
    }
    const pause = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const resume = () => {
      if (running) return
      resize()
      running = true
      raf = requestAnimationFrame(tick)
    }
    const visibilityChange = () => {
      if (document.hidden) pause()
      else resume()
    }
    window.addEventListener('blur', pause)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', visibilityChange)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('blur', pause)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', visibilityChange)
    }
  }, [])

  return (
    <div className={`fire-bottom-wrap ${intense ? 'intense' : ''}`} aria-hidden="true">
      <div className="fire-bottom-glow" />
      <canvas ref={canvasRef} className="fire-bottom-canvas" />
    </div>
  )
}
