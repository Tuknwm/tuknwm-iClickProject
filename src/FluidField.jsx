import { useEffect, useRef } from 'react'

const MAX_DPR = 2
const BG = [3 / 255, 3 / 255, 5 / 255]
const BASE = [1, 1, 1]
const ACCENT = [161 / 255, 161 / 255, 170 / 255]
const SPEED = 2, HOVER = 1.85, SCALE = 1.6, WARP = 1, BEAM = 1.54
const GLOW = 0.8

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const SNOISE = `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uScale, uWarp, uBeam, uGlowK, uHover;
uniform vec2  uPtr;
uniform vec3  uBg, uBase, uAccent;

${SNOISE}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x *= uRes.x / max(uRes.y, 1.0);

  vec2 st = uv * 0.7 * uScale;
  st += vec2(snoise(st + uTime * 0.05), snoise(st - uTime * 0.05)) * 0.3 * uWarp;

  vec2 d = uv - uPtr;
  float swirl = exp(-dot(d, d) / 0.06) * uHover;
  st += vec2(-d.y, d.x) * swirl * 1.2;

  float lo = 0.1;
  float hi = max(lo + 0.02, 0.1 + 0.7 * uBeam);
  float beam = smoothstep(lo, hi, snoise(vec2(st.x + st.y * 1.5 - uTime * 0.15, uTime * 0.02)));

  vec3 glow = mix(uBase, uAccent, snoise(uv * 1.5 + uTime * 0.1) * 0.5 + 0.5);

  gl_FragColor = vec4(uBg + glow * beam * 0.7 * uGlowK, 1.0);
}
`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('FluidField shader:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)

export default function FluidField({ className, glow = GLOW }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
    if (!gl) return console.error('FluidField: WebGL unavailable')

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return console.error('FluidField link:', gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = {}
    for (const n of ['uRes', 'uTime', 'uScale', 'uWarp', 'uBeam', 'uGlowK', 'uHover', 'uPtr', 'uBg', 'uBase', 'uAccent']) {
      u[n] = gl.getUniformLocation(prog, n)
    }
    gl.uniform1f(u.uScale, SCALE)
    gl.uniform1f(u.uWarp, WARP)
    gl.uniform1f(u.uBeam, BEAM)
    gl.uniform1f(u.uGlowK, glow)
    gl.uniform3f(u.uBg, ...BG)
    gl.uniform3f(u.uBase, ...BASE)
    gl.uniform3f(u.uAccent, ...ACCENT)

    const ptr = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5, on: 0, onS: 0 }
    let raf = 0, last = performance.now(), clock = 0

    const render = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock = (clock + dt * SPEED) % 31416
      const k = 1 - Math.exp(-dt * 5)
      ptr.x += (ptr.tx - ptr.x) * k
      ptr.y += (ptr.ty - ptr.y) * k
      ptr.onS += (ptr.on - ptr.onS) * k

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const bw = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const bh = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh }
      gl.viewport(0, 0, bw, bh)

      gl.uniform2f(u.uRes, bw, bh)
      gl.uniform1f(u.uTime, clock)
      gl.uniform1f(u.uHover, HOVER * ptr.onS)
      gl.uniform2f(u.uPtr, ptr.x * (bw / Math.max(bh, 1)), 1 - ptr.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }

    const track = (e) => {
      const r = canvas.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      ptr.tx = clamp01((e.clientX - r.left) / r.width)
      ptr.ty = clamp01((e.clientY - r.top) / r.height)
      ptr.on = 1
    }
    const leave = () => { ptr.tx = 0.5; ptr.ty = 0.5; ptr.on = 0 }
    window.addEventListener('pointermove', track)
    document.documentElement.addEventListener('pointerleave', leave)

    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', track)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [glow])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
