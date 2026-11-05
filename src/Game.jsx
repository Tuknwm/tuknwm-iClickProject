import { useState, useEffect, useRef, useCallback } from 'react'
import BackgroundBoxes from './BackgroundBoxes'
import FluidField from './FluidField'
import { playSound, fadeIn, ctx as audioCtx, masterGain } from './sfx'
import './Game.css'

const MOUSE_MODES = [
  { id: 'left',     label: 'Left Click' },
  { id: 'right',    label: 'Right Click' },
  { id: 'sequence', label: 'Left → Right' },
  { id: 'both',     label: 'Left + Right' },
]
const KEY_MODES = [
  { id: 'space',  label: 'Space',          keys: [' '] },
  { id: 'ad',     label: 'A → D',          keys: ['a', 'd'] },
  { id: 'awds',   label: 'A → W → D → S',  keys: ['a', 'w', 'd', 's'] },
  { id: 'custom', label: 'Custom Keys' },
]
const HITS_PER_SEC = { left: 13, right: 11, sequence: 7, both: 6, space: 12, ad: 9, awds: 5, custom: 9 }
const boards = {}
function leaderboard(mode, timer, ev = true) {
  const id = `${mode}|${timer}|${ev ? 'ev' : 'noev'}`
  if (boards[id]) return boards[id]
  let seed = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const a = ['ra', 'ki', 'zu', 'no', 'vel', 'mi', 'tor', 'sa', 'len', 'qi', 'bo', 'ar', 'dex', 'yu', 'fen']
  const top = HITS_PER_SEC[mode] * (timer === 'free' ? 60 : timer) * (1.25 + rand() * 0.3)
  let score = Math.round(top)
  const step = top / 160
  return (boards[id] = Array.from({ length: 100 }, () => {
    const pick = () => a[(rand() * a.length) | 0]
    const name = pick() + pick() + (rand() < 0.5 ? `_${(rand() * 99) | 0}` : '')
    score = Math.max(1, score - Math.round(rand() * step * 1.6))
    return { name, score }
  }))
}
const GROW_FROM = 4
const GROW_STEP = 0.12
const GO_DETUNE = 700
const START_DETUNE = 1200
const TIMESUP_ON = false
const TIMESUP_HIT = 18
const COUNTDOWN_S = 3
const LATE_START = { 10: 6 }
const FADE_S = 4
const SWELL_MS = 600
const CELEBRATE_MS = 1800
const CONFETTI = Array.from({ length: 56 }, (_, i) => {
  const a = (i / 56) * Math.PI * 2 + Math.random() * 0.4
  const d = 160 + Math.random() * 260
  return {
    x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7 - 60,
    r: (Math.random() - 0.5) * 720, delay: Math.random() * 0.15,
    c: ['#fafafa', '#d4d4d8', '#ffffff', '#a1a1aa'][i % 4],
  }
})
const MESSAGES = [['PRESS', 'START'], ['ICLICK']]
const TRACKS = [
  'Aura Farming - Mustafa Saboori',
  'ABOVE THE CLOUDS - HDN',
  'Cryon Ultra Slowed - SR2X',
  'DESTELLO - HDN',
  'LUZ - HDN',
  'ONTHEFLOOR X HARDTEKK - floorage',
  'X-SUMMER - Vietnam Phxnk Media',
]
function MusicVisualizer({ audio, active }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => {
    const canvas = canvasRef.current
    const c = canvas.getContext('2d')
    if (!audio) { c.clearRect(0, 0, canvas.width, canvas.height); return }
    if (!audio._vizAnalyser) {
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 32
      const src = audioCtx.createMediaElementSource(audio)
      src.connect(analyser)
      analyser.connect(masterGain)
      audio._vizAnalyser = analyser
      const bassAnalyser = audioCtx.createAnalyser()
      bassAnalyser.fftSize = 4096
      src.connect(bassAnalyser)
      bassAnalyser.connect(masterGain)
      audio._bassAnalyser = bassAnalyser
    }
    const analyser = audio._vizAnalyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    const decay = new Float32Array(7)
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < 7; i++) {
          const live = activeRef.current ? data[i] / 255 : 0
        decay[i] = live > decay[i] ? live : decay[i] * 0.85
      }
      c.clearRect(0, 0, canvas.width, canvas.height)
      const bw = canvas.width / 7
      for (let i = 0; i < 7; i++) {
        if (decay[i] < 0.01) continue
        const h = decay[i] * canvas.height
        c.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * decay[i]})`
        c.fillRect(i * bw + 0.5, canvas.height - h, bw - 1, h)
      }
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [audio, active])
  return <canvas ref={canvasRef} className="music-viz" width={56} height={40} />
}

const keyName = k => (k === ' ' ? 'Space' : k.toUpperCase())
const TIMERS = [5, 10, 'free']
const RATINGS = {
  5:  [{ min: 50, label: 'Incredible!' }, { min: 35, label: 'Really fast!' }, { min: 22, label: 'Not bad' }, { min: 0, label: 'Keep practicing!' }],
  10: [{ min: 90, label: 'Incredible!' }, { min: 65, label: 'Really fast!' }, { min: 40, label: 'Not bad' }, { min: 0, label: 'Keep practicing!' }],
}
const getRating = (t, s) => RATINGS[t]?.find(r => s >= r.min)?.label ?? null
const EVENT_FIRST_MS = 4000
const EVENT_MIN_GAP = 3
const EVENT_MAX_GAP = 8
const EVENT_MIN_DUR = 3
const EVENT_MAX_DUR = 5

export default function Game({ onBack, musicAudio = null }) {
  const [input, setInput] = useState('mouse')
  const [mouseMode, setMouseMode] = useState('left')
  const [keyMode, setKeyMode] = useState('space')
  const [customKeys, setCustomKeys] = useState(['j', 'l'])
  const [binding, setBinding] = useState(null)
  const [keyIdx, setKeyIdx] = useState(0)
  const [timer, setTimer] = useState(10)
  const [phase, setPhase] = useState('settings')
  const [panelOpen, setPanelOpen] = useState(true)
  const [countdown, setCountdown] = useState(3)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [fireActive, setFireActive] = useState(false)
  const [eventTimeLeft, setEventTimeLeft] = useState(null)
  const [eventDisplay, setEventDisplay] = useState(null)
  const [eventEnabled, setEventEnabled] = useState(true)
  const [impact, setImpact] = useState(false)
  const [resuming, setResuming] = useState(false)
  const baseScoreRef = useRef(0)
  const eventFinalRef = useRef(0) // frozen bonus shown while it merges back
  const mergeTimerRef = useRef(null)
  const celebrateTimer = useRef(null)
  const sfx = useRef(null)
  const sfxStarted = useRef(false)
  const sfxLoop = useRef(false)
  const sfxFade = useRef(null)
  const playClick = useCallback(() => playSound('Click'), [])

  useEffect(() => {
    if (!TIMESUP_ON) return
    sfx.current = new Audio(`${import.meta.env.BASE_URL}FX/TimesUp.mp3`)
    sfx.current.preload = 'auto'
    const a = sfx.current
    const loop = () => { if (sfxLoop.current && a.currentTime >= TIMESUP_HIT - 0.5) a.currentTime = 0 }
    a.addEventListener('timeupdate', loop)
    return () => { a.pause(); a.removeEventListener('timeupdate', loop) }
  }, [])
  const [musicIdx, setMusicIdx] = useState(() => {
    if (!musicAudio?.src) return 0
    const idx = TRACKS.findIndex(t => musicAudio.src.includes(encodeURIComponent(t)))
    return idx >= 0 ? idx : 0
  })
  const [musicPaused, setMusicPaused] = useState(true)
  const musicRef = useRef(musicAudio)
  if (!musicRef.current) {
    const a = new Audio()
    a.volume = 0.5
    a._targetVolume = 0.5
    musicRef.current = a
  }
  useEffect(() => {
    if (musicAudio && !musicAudio.paused) setMusicPaused(false)
  }, [musicAudio])
  musicRef.current.onended = () => {
    setMusicIdx(i => {
      const next = (i + 1) % TRACKS.length
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      musicRef.current.src = `${base}/msc/${encodeURIComponent(TRACKS[next])}.mp3`
      musicRef.current.play().then(() => fadeIn(musicRef.current)).catch(() => {})
      return next
    })
  }

  const musicPlay = useCallback((idx) => {
    const a = musicRef.current
    if (!a) return
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    const src = `${base}/msc/${encodeURIComponent(TRACKS[idx])}.mp3`
    a.src = src
    a.load()
    a.play().then(() => fadeIn(a)).catch(() => {})
    setMusicPaused(false)
  }, [])

  const [musicMuted, setMusicMuted] = useState(false)
  const musicToggle = useCallback(() => {
    const a = musicRef.current
    if (!a) return
    if (a.paused) { a.play().catch(() => {}); setMusicPaused(false) }
    else { a.pause(); setMusicPaused(true) }
  }, [])
  const musicMuteToggle = useCallback(() => {
    const muted = masterGain.gain.value !== 0
    masterGain.gain.value = muted ? 0 : 1
    setMusicMuted(muted)
  }, [])

  const musicNext = useCallback(() => {
    const next = (musicIdx + 1) % TRACKS.length
    setMusicIdx(next)
    musicPlay(next)
  }, [musicIdx, musicPlay])

  const musicPrev = useCallback(() => {
    const prev = (musicIdx - 1 + TRACKS.length) % TRACKS.length
    setMusicIdx(prev)
    musicPlay(prev)
  }, [musicIdx, musicPlay])

  const trackRef = useRef(null)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const span = el.firstElementChild
    if (!span) return
    const overflow = span.scrollWidth - el.clientWidth
    span.style.setProperty('--overflow', overflow > 0 ? `-${overflow}px` : '0px')
    span.style.animationPlayState = overflow > 0 ? 'running' : 'paused'
  }, [musicIdx])

  const [popups, setPopups] = useState([])
  const [bests, setBests] = useState({})
  const [clickFlash, setClickFlash] = useState(null)
  const flashTimer = useRef(null)

  const phaseRef = useRef('settings')
  const scoreRef = useRef(0)
  const multiplierRef = useRef(1)
  const eventDuration = useRef(0)
  const eventScheduleRef = useRef(null)
  const firstEventRef = useRef(true)
  const seqRef = useRef('left')
  const bothRef = useRef({ l: false, r: false })
  const mouseModeRef = useRef('left')
  const keyIdxRef = useRef(0)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { mouseModeRef.current = mouseMode }, [mouseMode])

  const flash = useCallback((side) => {
    clearTimeout(flashTimer.current)
    setClickFlash(prev => (prev && prev !== side ? 'both' : side))
    flashTimer.current = setTimeout(() => setClickFlash(null), 180)
  }, [])

  const paused = phase === 'paused'
  const modeId = input === 'mouse' ? mouseMode : keyMode
  const runId = `${modeId}|${timer}|${eventEnabled ? 'ev' : 'noev'}`
  const best = bests[runId]
  const rank = best === undefined ? null : leaderboard(modeId, timer, eventEnabled).filter(p => p.score > best).length + 1
  const elapsed = timer === 'free' || timeLeft === null ? 0
    : phase === 'playing' ? Math.min(1, (timer - timeLeft + 1) / timer)
    : phase === 'paused' || (phase === 'countdown' && resuming) ? (timer - timeLeft) / timer : 0
  const grow = timer !== 'free' && phase === 'playing' && timeLeft <= GROW_FROM
    ? 1 + (GROW_FROM + 1 - timeLeft) * GROW_STEP : 1
  const keys = keyMode === 'custom' ? customKeys : KEY_MODES.find(m => m.id === keyMode).keys
  const modeLabel = input === 'mouse'
    ? MOUSE_MODES.find(m => m.id === mouseMode).label
    : keys.map(keyName).join(' → ')

  const bonus = eventDisplay === 'active' ? (score - baseScoreRef.current) / 2
    : eventDisplay === 'merging' ? eventFinalRef.current : 0

  const spawnPopup = useCallback((pts, x, y) => {
    const id = Date.now() + Math.random()
    setPopups(p => [...p, { id, pts, x, y }])
    setTimeout(() => setPopups(p => p.filter(v => v.id !== id)), 700)
  }, [])

  const hitTimes = useRef([])
  const [cps, setCps] = useState(0)
  const [finalCps, setFinalCps] = useState(0)
  const gameStartRef = useRef(null)
  const [finalTime, setFinalTime] = useState(null)
  const registerHit = useCallback((x, y) => {
    if (phaseRef.current !== 'playing') return
    const pts = multiplierRef.current
    scoreRef.current += pts
    setScore(scoreRef.current)
    spawnPopup(pts, x, y)
    const now = performance.now()
    hitTimes.current.push(now)
    hitTimes.current = hitTimes.current.filter(t => now - t <= 1000)
    setCps(hitTimes.current.length)
  }, [spawnPopup])

  useEffect(() => {
    if (phase !== 'playing' || input !== 'mouse') return
    const area = document.getElementById('game-area')
    if (!area) return

    const down = (e) => {
      if (phaseRef.current !== 'playing' || e.target.closest('button')) return
      const x = e.clientX, y = e.clientY
      const mode = mouseModeRef.current

      if (e.button === 0 || e.button === 2) playClick()
      if ((e.buttons & 3) === 3) flash('both')
      else if (e.button === 0) flash('left')
      else if (e.button === 2) flash('right')

      if (mode === 'left' && e.button === 0) {
        registerHit(x, y)
      } else if (mode === 'right' && e.button === 2) {
        registerHit(x, y)
      } else if (mode === 'sequence') {
        if (seqRef.current === 'left' && e.button === 0) {
          seqRef.current = 'right'
        } else if (seqRef.current === 'right' && e.button === 2) {
          seqRef.current = 'left'; registerHit(x, y)
        }
      } else if (mode === 'both') {
        if (e.button === 0) bothRef.current.l = true
        if (e.button === 2) bothRef.current.r = true
        if (bothRef.current.l && bothRef.current.r) {
          bothRef.current = { l: false, r: false }
          registerHit(x, y)
        }
      }
    }

    const up = (e) => {
      if (e.button === 0) bothRef.current.l = false
      if (e.button === 2) bothRef.current.r = false
    }

    const ctx = (e) => e.preventDefault()

    area.addEventListener('mousedown', down)
    area.addEventListener('mouseup', up)
    area.addEventListener('contextmenu', ctx)
    return () => {
      area.removeEventListener('mousedown', down)
      area.removeEventListener('mouseup', up)
      area.removeEventListener('contextmenu', ctx)
    }
  }, [phase, input, registerHit, flash, playClick])

  useEffect(() => {
    if (phase !== 'playing' || input !== 'keyboard') return
    const down = (e) => {
      const k = e.key.toLowerCase()
      if (!keys.includes(k)) return
      e.preventDefault()
      if (e.repeat) return
      playClick()
      let i = keyIdxRef.current
      if (k === keys[i]) i++
      else if (k === keys[0]) i = 1
      else return
      if (i === keys.length) {
        i = 0
        registerHit(
          window.innerWidth / 2 + (Math.random() - 0.5) * 420,
          window.innerHeight / 2 + (Math.random() - 0.5) * 320,
        )
      }
      keyIdxRef.current = i
      setKeyIdx(i)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [phase, input, keys, registerHit, playClick])

  useEffect(() => {
    if (binding === null) return
    const down = (e) => {
      e.preventDefault()
      if (e.key === 'Escape') return setBinding(null)
      const k = e.key.toLowerCase()
      if (k.length !== 1 || k === customKeys[1 - binding]) return
      setCustomKeys(c => c.map((v, i) => (i === binding ? k : v)))
      setBinding(null)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [binding, customKeys])

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return
    const down = (e) => {
      if (e.key !== 'Escape') return
      if (phase === 'playing') {
        pause()
      } else {
        handleResume()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [phase])

  useEffect(() => {
    const area = document.getElementById('game-area')
    if (!area || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = null, x = 0, y = 0
    const move = (e) => {
      x = (e.clientX / window.innerWidth) * 2 - 1
      y = (e.clientY / window.innerHeight) * 2 - 1
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = null
        area.style.setProperty('--tx', x.toFixed(3))
        area.style.setProperty('--ty', y.toFixed(3))
      })
    }
    window.addEventListener('pointermove', move)
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const a = sfx.current
    if (!a) return
    if (phase === 'paused') { a.pause(); return }
    const start = (at, fade) => {
      sfxStarted.current = true
      a.currentTime = at
      clearInterval(sfxFade.current)
      a.volume = fade ? 0 : 1
      a.play().catch(() => {})
      if (!fade) return
      sfxFade.current = setInterval(() => {
        const k = Math.min(1, Math.max(0, (a.currentTime - at) / FADE_S))
        a.volume = k * k // slow at first, rising toward normal
        if (k === 1) clearInterval(sfxFade.current)
      }, 30)
    }
    const late = LATE_START[timer]
    if (late && phase === 'playing' && !sfxStarted.current && timeLeft === late) {
      start(TIMESUP_HIT - late, true)
      return
    }
    if (phase === 'countdown' && !resuming && !sfxStarted.current && !late) {
      sfxLoop.current = timer === 'free'
      start(timer === 'free' ? 0 : Math.max(0, TIMESUP_HIT - timer - COUNTDOWN_S), false)
      return
    }
    if (phase === 'playing' && sfxStarted.current && a.paused) a.play().catch(() => {})
  }, [phase, resuming, timer, timeLeft])

  const stopSfx = () => {
    sfx.current?.pause()
    clearInterval(sfxFade.current)
    sfxStarted.current = false
    sfxLoop.current = false
  }

  useEffect(() => {
    if (phase !== 'countdown') return
    playSound('Count', { detune: countdown === 0 ? GO_DETUNE : 0 })
    if (countdown === 0 && resuming) {
      setResuming(false)
      setPhase('playing')
      return
    }
    if (countdown === 0) {
      scoreRef.current = 0
      multiplierRef.current = 1
      seqRef.current = 'left'
      bothRef.current = { l: false, r: false }
      keyIdxRef.current = 0
      firstEventRef.current = true
      setKeyIdx(0)
      setScore(0)
      hitTimes.current = []; setCps(0)
      gameStartRef.current = performance.now()
      setFireActive(false)
      setPhase('playing')
      if (timer !== 'free') setTimeLeft(timer)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown, timer, resuming])

  useEffect(() => {
    if (phase !== 'playing' || timer === 'free') return
    if (timeLeft <= 0) { handleEnd(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, timer])

  const scheduleEvent = useCallback((delayMs) => {
    const ms = delayMs ?? (EVENT_MIN_GAP + Math.random() * (EVENT_MAX_GAP - EVENT_MIN_GAP)) * 1000
    eventScheduleRef.current = setTimeout(() => {
      const dur = EVENT_MIN_DUR + Math.floor(Math.random() * (EVENT_MAX_DUR - EVENT_MIN_DUR + 1))
      eventDuration.current = dur
      baseScoreRef.current = scoreRef.current
      firstEventRef.current = false
      multiplierRef.current = 2
      setFireActive(true)
      setEventTimeLeft(dur)
      setEventDisplay('active')
    }, ms)
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || !eventEnabled) return
    if (multiplierRef.current !== 2) scheduleEvent(firstEventRef.current ? EVENT_FIRST_MS : undefined)
    return () => clearTimeout(eventScheduleRef.current)
  }, [phase, scheduleEvent, eventEnabled])

  useEffect(() => {
    if (phase !== 'playing' || eventTimeLeft === null) return
    if (eventTimeLeft <= 0) {
      multiplierRef.current = 1
      setFireActive(false)
      setEventTimeLeft(null)
      eventFinalRef.current = (scoreRef.current - baseScoreRef.current) / 2
      setEventDisplay('merging')
      mergeTimerRef.current = setTimeout(() => {
        setEventDisplay(null)
        setImpact(true)
        playSound('Explosion')
        mergeTimerRef.current = setTimeout(() => setImpact(false), 700)
      }, 450)
      scheduleEvent()
      return
    }
    const t = setTimeout(() => setEventTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, eventTimeLeft, scheduleEvent])

  const handleStart = () => {
    stopSfx()
    document.activeElement?.blur()
    setBinding(null)
    setPanelOpen(false)
    if (musicRef.current?.paused) musicPlay(musicIdx)
    setTimeout(() => { setCountdown(3); setPhase('countdown') }, 450)
  }

  function pause() {
    document.activeElement?.blur()
    setPanelOpen(true)
    setPhase('paused')
  }

  function handleEnd() {
    clearInterval(sfxFade.current)
    if (sfx.current) {
      const a = sfx.current, from = a.volume, t0 = performance.now()
      sfxFade.current = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / SWELL_MS)
        a.volume = from + (1 - from) * (1 - (1 - k) ** 3) // ease-out
        if (k === 1) clearInterval(sfxFade.current)
      }, 20)
    }
    if ((timer === 'free' || timeLeft > 0) && sfx.current) {
      sfxLoop.current = false
      sfx.current.currentTime = TIMESUP_HIT
      sfx.current.play().catch(() => {})
    }
    sfxStarted.current = false
    setBests(b => (scoreRef.current > (b[runId] ?? -1) ? { ...b, [runId]: scoreRef.current } : b))
    clearTimeout(eventScheduleRef.current)
    clearTimeout(mergeTimerRef.current)
    multiplierRef.current = 1
    setFireActive(false)
    setEventTimeLeft(null)
    setEventDisplay(null)
    setImpact(false)
    setPanelOpen(false)
    setFinalCps(cps)
    setFinalTime(timer === 'free' ? Math.round((performance.now() - (gameStartRef.current ?? 0)) / 1000) : timer)
    setPhase('result')
    celebrateTimer.current = setTimeout(() => setPanelOpen(true), CELEBRATE_MS)
  }

  function handleResume() {
    document.activeElement?.blur()
    setResuming(true)
    setPanelOpen(false)
    setCountdown(3)
    setPhase('countdown')
  }

  const resetRun = () => {
    clearTimeout(eventScheduleRef.current)
    clearTimeout(mergeTimerRef.current)
    multiplierRef.current = 1
    setScore(0)
    setTimeLeft(null)
    setFireActive(false)
    setEventTimeLeft(null)
    setEventDisplay(null)
    setImpact(false)
    setPopups([])
  }

  const handleRestartRun = () => {
    stopSfx()
    document.activeElement?.blur()
    resetRun()
    setPanelOpen(false)
    setCountdown(3)
    setPhase('countdown')
  }

  return (
    <div id="game-root" className={fireActive ? 'fire' : ''}>
      <aside id="settings-panel" className={panelOpen ? 'open' : 'closed'}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Settings</h2>

        <div className={`setting-group ${paused ? 'locked' : ''}`}>
          <label>Game Mode</label>
          <div className="chips">
            {['mouse', 'keyboard'].map(v => (
              <div
                key={v}
                className={`chip ${input === v ? 'active' : ''}`}
                onClick={() => { setInput(v); setBinding(null) }}
              >{v === 'mouse' ? 'Mouse' : 'Keyboard'}</div>
            ))}
          </div>
        </div>

        <div className={`setting-group ${paused ? 'locked' : ''}`}>
          <label>{input === 'mouse' ? 'Click Type' : 'Key Type'}</label>
          <div className="chips col">
            {(input === 'mouse' ? MOUSE_MODES : KEY_MODES).map(m => {
              const active = (input === 'mouse' ? mouseMode : keyMode) === m.id
              return (
                <div
                  key={m.id}
                  className={`chip ${active ? 'active' : ''}`}
                  onClick={() => (input === 'mouse' ? setMouseMode : setKeyMode)(m.id)}
                >{m.label}</div>
              )
            })}
          </div>
          {input === 'keyboard' && keyMode === 'custom' && (
            <div className="key-bind">
              {customKeys.map((k, i) => (
                <button
                  key={i}
                  className={`key-cap ${binding === i ? 'listening' : ''}`}
                  onClick={() => setBinding(binding === i ? null : i)}
                >{binding === i ? 'Press a key' : keyName(k)}</button>
              ))}
              <span className="key-help">Click a key, then press the one you want</span>
            </div>
          )}
        </div>

        <div className={`setting-group ${paused ? 'locked' : ''}`}>
          <label>Timer</label>
          <div className="chips">
            {TIMERS.map(t => (
              <div
                key={t}
                className={`chip ${timer === t ? 'active' : ''}`}
                onClick={() => setTimer(t)}
              >{t === 'free' ? 'Free' : `${t}s`}</div>
            ))}
          </div>
        </div>

        <div className={`setting-group ${paused ? 'locked' : ''}`}>
          <label>2× Event</label>
          <div className="chips">
            <div className={`chip ${eventEnabled ? 'active' : ''}`} onClick={() => setEventEnabled(true)}>On</div>
            <div className={`chip ${!eventEnabled ? 'active' : ''}`} onClick={() => setEventEnabled(false)}>Off</div>
          </div>
        </div>

        <div className="panel-bottom">
        <div className="music-player">
          <MusicVisualizer audio={musicRef.current} active={!musicPaused} />
          <div className="music-info">
            <div className="music-track" ref={trackRef}>
              <span>{TRACKS[musicIdx]}</span>
            </div>
            <div className="music-controls">
              <button className="music-btn" onClick={musicPrev} aria-label="Previous" disabled={TRACKS.length < 2}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="2" height="12"/><polygon points="12,1 2,7 12,13"/></svg>
              </button>
              <button className="music-btn" onClick={musicToggle} aria-label={musicPaused ? 'Play' : 'Pause'}>
                {musicPaused
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="2,1 13,7 2,13"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12"/><rect x="8.5" y="1" width="3.5" height="12"/></svg>
                }
              </button>
              <button className="music-btn" onClick={musicNext} aria-label="Next" disabled={TRACKS.length < 2}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="12" y="1" width="2" height="12"/><polygon points="2,1 12,7 2,13"/></svg>
              </button>
              <button className="music-btn" onClick={musicMuteToggle} aria-label={musicMuted ? 'Unmute' : 'Mute'}>
                {musicMuted
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="1,4 5,4 9,1 9,13 5,10 1,10"/><line x1="11" y1="4" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="14" y1="4" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="1,4 5,4 9,1 9,13 5,10 1,10"/><path d="M11,5 Q13,7 11,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12.5,3 Q15.5,7 12.5,11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </button>
            </div>
          </div>
        </div>

        {paused
          ? <button className="start-btn" onClick={handleResume}>Resume</button>
          : <button className="start-btn" data-hover-detune={START_DETUNE} onClick={handleStart}>Start</button>}
        </div>
      </aside>

      <aside id="leaderboard-panel" className={panelOpen ? 'open' : 'closed'}>
        <div className="lb-head">
          <h2>Leaderboard</h2>
          <span>Top 100</span>
        </div>
        <div className="lb-filter">{modeLabel} · {timer === 'free' ? 'Free' : `${timer}s`} · {eventEnabled ? '2× On' : '2× Off'}</div>
        <ol key={runId} className="lb-list">
          {leaderboard(modeId, timer, eventEnabled).map((p, i) => (
            <li key={i} style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{p.name}</span>
              <span className="lb-score">{p.score}</span>
            </li>
          ))}
        </ol>
        <div className="lb-you">
          <span className="lb-rank">{best === undefined ? '–' : rank > 100 ? '100+' : rank}</span>
          <span className="lb-name">You<small>{best === undefined ? 'Play to set a score' : 'Your best'}</small></span>
          <span className="lb-score">{best ?? '–'}</span>
        </div>
      </aside>

      <div
        id="game-area"
        className={`${phase === 'playing' ? `active mode-${mouseMode}` : ''} ${phase === 'countdown' ? 'counting' : ''} ${impact ? 'quake' : ''}`}
        style={{ userSelect: 'none', '--grid-hole': 1 - elapsed }}
      >
        <FluidField className="play-fluid" glow={0.45} />
        <div className="aurora" aria-hidden="true"><span /><span /><span /></div>
        <BackgroundBoxes messages={phase === 'settings' ? MESSAGES : null} analyser={musicRef.current?._bassAnalyser ?? null} />

        {phase === 'countdown' && !resuming && (
          <div className="center-display">
            <svg className="score-ring countdown-ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle className="ring-dash" cx="100" cy="100" r="98" />
              <circle className="ring-track" cx="100" cy="100" r="90" />
            </svg>
            <span key={countdown} className="countdown-num">{countdown === 0 ? 'GO!' : countdown}</span>
          </div>
        )}

        {paused && (
          <button className="restart-btn end-btn" onClick={handleEnd}>End</button>
        )}
        {paused && (
          <button className="restart-btn is-restart" onClick={handleRestartRun}>Restart</button>
        )}
        {phase === 'playing' && (
          <button className="restart-btn" onClick={pause}>Pause</button>
        )}

        {resuming && phase === 'countdown' && (
          <div key={countdown} className="resume-count">{countdown || 'GO!'}</div>
        )}

        {(phase === 'playing' || paused || resuming) && (
          <>
            <div className="hud-top">
              <span>{modeLabel}</span>
              <span className="hud-time">{timer === 'free' ? '∞' : `${timeLeft}s`}</span>
            </div>
            <div className="center-display">
              <svg className="score-ring" viewBox="0 0 200 200" aria-hidden="true">
                <circle className="ring-dash" cx="100" cy="100" r="98" />
                <circle className="ring-track" cx="100" cy="100" r="90" />
                {eventTimeLeft !== null && (
                  <circle
                    className="ring-event"
                    cx="100" cy="100" r="90"
                    pathLength="1"
                    style={{ strokeDashoffset: 1 - eventTimeLeft / eventDuration.current }}
                  />
                )}
              </svg>
              {impact && <span className="shockwave" aria-hidden="true" />}
              {cps > 0 && <div className="cps-indicator">{cps} <span>CPS</span></div>}
              <div className="score-grow" style={{ '--grow': grow }}>
                <div
                  key={impact ? 'impact' : score}
                  className={`score-display ${impact ? 'impact' : 'pop'} ${eventDisplay ? 'dim' : ''}`}
                >{score - bonus}</div>
              </div>
              {eventDisplay && (
                <div className={`event-score ${eventDisplay}`}>
                  <span className="event-tag">2× bonus</span>
                  <span key={eventDisplay === 'active' ? score : 'final'} className="event-num">
                    +{bonus}
                  </span>
                </div>
              )}
              <div className="score-label">points</div>
              {input === 'mouse' && (
                <svg className={`mouse-ind${clickFlash ? ` flash-${clickFlash}` : ''}`} viewBox="0 0 44 66" fill="none" aria-hidden="true">
                  <rect x="1.5" y="1.5" width="41" height="63" rx="20.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                  <path className="ml" d="M1.5 22 A20.5 20.5 0 0 1 22 1.5 L22 22 Z" />
                  <path className="mr" d="M22 1.5 A20.5 20.5 0 0 1 42.5 22 L22 22 Z" />
                  <line x1="22" y1="1.5" x2="22" y2="22" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <rect className="mw" x="19" y="26" width="6" height="14" rx="3" />
                </svg>
              )}
              {input === 'keyboard' && keys.length > 1 && (
                <div className="key-seq">
                  {keys.map((k, i) => (
                    <span key={i} className={i === keyIdx ? 'next' : ''}>{keyName(k)}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="confetti" aria-hidden="true">
              {CONFETTI.map((p, i) => (
                <span key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, '--c': p.c, animationDelay: `${p.delay}s` }} />
              ))}
            </div>
            <div className="center-display celebrate" style={{ '--from': timer === 'free' ? 1 : 1 + GROW_FROM * GROW_STEP }}>
              <span className="shockwave" aria-hidden="true" />
              <div className="result-label">Final Score</div>
              <div className="result-score-row">
                {finalCps > 0 && <span className="result-cps">{finalCps}<br/><span>CPS</span></span>}
                <div className="score-display">{score}</div>
                {finalTime !== null && <span className="result-cps result-cps-right">{finalTime}<br/><span>SEC</span></span>}
              </div>
              {getRating(timer, score) && <div className="result-rating">{getRating(timer, score)}</div>}
            </div>
          </>
        )}

        {popups.map(p => (
          <div key={p.id} style={{ '--h': Math.floor(p.id * 997) % 360 }}>
            <span className={`ripple ${p.pts > 1 ? 'double' : ''}`} style={{ left: p.x, top: p.y }} />
            <div
              className={`point-popup ${p.pts > 1 ? 'double' : ''}`}
              style={{ left: p.x, top: p.y }}
            >+{p.pts}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
