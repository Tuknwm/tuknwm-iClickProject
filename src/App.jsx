import { useState, useRef } from 'react'
import Game from './Game'
import FluidField from './FluidField'
import TextMorph from './TextMorph'
import './App.css'
import { fadeIn } from './sfx'

const SLIDE_MS = 800
const BACK_MS = 700

const TITLE_WORDS = [{ text: 'I CLICK.' }, { text: 'I WIN.', className: 'accent' }]

export default function App() {
  const [page, setPage] = useState('landing')
  const timer = useRef(null)
  const music = useRef(null)

  const play = () => {
    if (page !== 'landing') return
    if (!music.current) {
      music.current = new Audio(`${import.meta.env.BASE_URL}msc/Aura%20Farming%20-%20Mustafa%20Saboori.mp3`)
      music.current.volume = 0.5
      music.current._targetVolume = 0.5
    }
    if (music.current.paused) {
      music.current.play().then(() => fadeIn(music.current)).catch(error => console.warn('Music playback was blocked:', error))
    }
    setPage('sliding')
    timer.current = setTimeout(() => setPage('game'), SLIDE_MS)
  }
  const back = () => {
    if (page !== 'game') return
    setPage('returning')
    timer.current = setTimeout(() => setPage('landing'), BACK_MS)
  }

  const landing = (
    <div className="landing">
      <FluidField className="landing-bg" />
      <main>
        <section className="hero-copy">
          <h1 aria-label="I click. I win.">
            <TextMorph words={TITLE_WORDS} />
          </h1>
          <p>Hit as fast as you can and catch the random 2× rounds to climb the leaderboard.</p>
          <button className="play-btn" onClick={play}>
            Play Now <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
      <a className="github-btn" href="https://github.com/Tuknwm/tuknwm-iClickProject" target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        GitHub
      </a>
      <p className="dummy-note">This website is dummy and has been redesigned</p>
    </div>
  )

  const sliding = page === 'sliding', returning = page === 'returning'
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return (
      <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', color:'#fff', textAlign:'center', padding:'2rem', gap:'1rem', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}><FluidField /></div>
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
          <img src={`${import.meta.env.BASE_URL}icons.png`} alt="" style={{ width:'150px', height:'150px', objectFit:'contain' }} />
          <h1 style={{ fontSize:'1.5rem', margin:0 }}>Not Available on Mobile</h1>
          <p style={{ color:'#ccc', margin:0 }}>Please open on a desktop device for the best experience.</p>
        </div>
      </div>
    )
  }
  return (
    <>
      {page !== 'game' && <div className={`page-slide ${sliding ? 'out' : returning ? 'return' : ''}`}>{landing}</div>}
      {page !== 'landing' && <div className={`page-slide ${sliding ? 'in' : returning ? 'leave' : ''}`}><Game onBack={back} musicAudio={music.current} /></div>}
    </>
  )
}
