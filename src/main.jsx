import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './index.css'
import App from './App.jsx'
import { playSound } from './sfx'

for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
  window.addEventListener(type, e => e.preventDefault())
}

const PRESSABLE = '#game-root button, #game-root .chip'

document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.(`${PRESSABLE}, .play-btn`)
  if (!el || el.contains(e.relatedTarget) || el.disabled) return
  if (el.dataset.hoverDetune) playSound('Count', { detune: +el.dataset.hoverDetune, volume: 0.35 })
  else playSound('Select', { volume: 0.35 })
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
