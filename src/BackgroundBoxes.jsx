import { useState, useRef, useEffect } from 'react'

const BOX = 28
const FADE_MS = 1000
const MAX_CELLS = 40
const FONT = {
  P: ['11110', '10001', '11110', '10000', '10000'],
  R: ['11110', '10001', '11110', '10100', '10011'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  A: ['01110', '10001', '11111', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '11111'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  K: ['10001', '10010', '11100', '10010', '10001'],
}
const HOLD_MS = 5000
const SWEEP_MS = 2800
const WAVE_W = 260

function spell(lines, cols, rows) {
  const out = []
  const top = Math.floor(rows / 2) - Math.floor((lines.length * 7 - 2) / 2)
  lines.forEach((word, li) => {
    const left = Math.floor(cols / 2) - Math.floor((word.length * 6 - 1) / 2)
    ;[...word].forEach((ch, ci) => FONT[ch].forEach((bits, r) => [...bits].forEach((b, c) => {
      if (b === '1') out.push({ col: left + ci * 6 + c, row: top + li * 7 + r, d: ci * 6 + c })
    })))
  })
  return out
}

export default function BackgroundBoxes({ messages, analyser }) {
  const [cells, setCells] = useState([])
  const id = useRef(0)
  const current = useRef(null)
  const frame = useRef(null)
  const pending = useRef(null)
  const root = useRef(null)
  const [size, setSize] = useState(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!messages) return
    const t = setInterval(() => setStep(n => n + 1), HOLD_MS)
    return () => clearInterval(t)
  }, [messages])


  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(root.current)
    return () => ro.disconnect()
  }, [])

  const release = () => {
    const c = current.current
    if (!c) return
    current.current = null
    setCells(list => list.map(v => (v.id === c.id ? { ...v, fade: true } : v)))
    setTimeout(() => setCells(list => list.filter(v => v.id !== c.id)), FADE_MS)
  }

  const updateCell = (e) => {
    const r = e.target.getBoundingClientRect()
    const col = Math.floor((e.clientX - r.left) / BOX)
    const row = Math.floor((e.clientY - r.top) / BOX)
    const c = current.current
    if (c && c.col === col && c.row === row) return
    release()
    const cell = { id: ++id.current, col, row } // local copy: the updater runs later, when current may be null
    current.current = cell
    setCells(list => [...list.slice(-(MAX_CELLS - 1)), cell])
  }

  const move = (e) => {
    pending.current = { target: e.currentTarget, clientX: e.clientX, clientY: e.clientY }
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const event = pending.current
      pending.current = null
      if (event) updateCell(event)
    })
  }

  const leave = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    pending.current = null
    release()
  }

  return (
    <div ref={root} className="bg-boxes" onPointerMove={move} onPointerLeave={leave} aria-hidden="true">
      {messages && size && (() => {
        const cols = Math.floor(size.w / BOX), rows = Math.floor(size.h / BOX)
        const at = col => {
          const p = (col * BOX + BOX / 2 + WAVE_W / 2) / (size.w + WAVE_W)
          return (Math.acos(1 - 2 * p) / Math.PI) * SWEEP_MS
        }
        const cur = spell(messages[step % messages.length], cols, rows)
        const prev = step > 0 ? spell(messages[(step - 1) % messages.length], cols, rows) : []
        return (
          <>
            <div key={`w${step}`} className="msg-wave" style={{ '--w': `${size.w}px` }} />
            <div className="msg-layer">
            {prev.map(c => (
              <i key={`o${step}-${c.col}-${c.row}`} className="msg out" style={{ left: c.col * BOX, top: c.row * BOX, animationDelay: `${at(c.col)}ms` }} />
            ))}
            {cur.map(c => (
              <i key={`n${step}-${c.col}-${c.row}`} className="msg" style={{ left: c.col * BOX, top: c.row * BOX, animationDelay: `${at(c.col)}ms` }} />
            ))}
            </div>
          </>
        )
      })()}
      {cells.map(c => (
        <span key={c.id} className={c.fade ? 'fade' : ''} style={{ left: c.col * BOX, top: c.row * BOX }} />
      ))}
    </div>
  )
}
