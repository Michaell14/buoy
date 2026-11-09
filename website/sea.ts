// The hero's deep sea: slow teal and cyan currents drawn with WebGL behind the wordmark.
// The picture is soft, so it renders at a reduced size and about 30 frames a second. It stops
// while it is off screen, and holds still when motion is reduced or the visitor pauses it.
// Without WebGL, the band's CSS gradient stays in its place.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
// Where the small text sits, in canvas pixels: the tagline and install block (x0, y0, x1, y1), and the header's height.
uniform vec4 uCalm;
uniform float uHead;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}

const vec3 ABYSS = vec3(0.012, 0.067, 0.075);
const vec3 SEA = vec3(0.016, 0.184, 0.180);
const vec3 TEAL = vec3(0.176, 0.831, 0.749);
const vec3 CYAN = vec3(0.133, 0.827, 0.933);
const vec3 MINT = vec3(0.204, 0.827, 0.600);

const float CALM = 0.65;
const float HEAD_CALM = 0.4;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.06;
  vec3 col = mix(ABYSS, SEA, uv.y * 0.7);
  float n1 = fbm(p * 1.3 + vec2(t, -t * 0.7));
  float n2 = fbm(p * 2.1 + vec2(-t * 1.3, t) + n1);
  vec3 light = TEAL * smoothstep(0.45, 0.85, n2) * 0.5
    + CYAN * smoothstep(0.55, 0.95, n1) * 0.3
    + MINT * smoothstep(0.6, 1.0, fbm(p * 0.9 - t)) * 0.22;
  // The currents settle behind the small text, so it stays readable whatever drifts past.
  vec2 gap = max(max(uCalm.xy - gl_FragCoord.xy, gl_FragCoord.xy - uCalm.zw), 0.0);
  float near = 1.0 - smoothstep(0.0, 0.16 * uRes.y, length(gap));
  float head = smoothstep(uRes.y - uHead - 0.1 * uRes.y, uRes.y - uHead, gl_FragCoord.y);
  col += light * (1.0 - max(CALM * near, HEAD_CALM * head));
  col *= 1.0 - 0.35 * length(p * vec2(0.6, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

/** About as many pixels as a 900 × 450 canvas; the CSS scales it up to fill the band. */
const MAX_PIXELS = 400_000;
const FRAME_MS = 1000 / 30;
/** Seconds into the motion where the picture starts, so the first still frame is already settled. */
const START = 4;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('No shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader failed');
  return shader;
}

export interface SeaOptions {
  /** The band the sea fills. */
  band: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Small text on the sea. The currents settle behind the box around these. */
  calm: HTMLElement[];
  /** The header lying over the top of the sea, where the currents also settle a little. */
  head: HTMLElement;
  /** Pauses and plays the motion. It stays hidden unless the sea is drawing. */
  toggle: HTMLButtonElement;
  /** Starts still, as when the visitor paused it last time. */
  paused: boolean;
  onToggle: (paused: boolean) => void;
}

export function startSea({ band, canvas, calm, head, toggle, paused: pausedBefore, onToggle }: SeaOptions): void {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const program = gl.createProgram();
  if (!program) return;
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Link failed');
  } catch (error) {
    console.warn('Buoy site: the sea is drawn with CSS instead.', error);
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  // One triangle that covers the whole canvas.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, 'uRes');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uCalm = gl.getUniformLocation(program, 'uCalm');
  const uHead = gl.getUniformLocation(program, 'uHead');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The visitor's own choice wins; otherwise reduced motion keeps the sea still.
  let chosen = pausedBefore;
  let paused = chosen || reduce.matches;
  let visible = true;
  let lost = false;
  let raf = 0;
  let clock = START;
  let lastDraw = 0;

  const draw = () => {
    if (lost) return;
    gl.uniform1f(uTime, clock);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const fit = () => {
    const box = band.getBoundingClientRect();
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, box.width * box.height)));
    const w = Math.max(1, Math.round(box.width * scale));
    const h = Math.max(1, Math.round(box.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    // The text box in canvas pixels, which count up from the bottom.
    const rects = calm.map((el) => el.getBoundingClientRect());
    const k = w / Math.max(1, box.width);
    const left = Math.min(...rects.map((r) => r.left)) - box.left;
    const right = Math.max(...rects.map((r) => r.right)) - box.left;
    const top = Math.min(...rects.map((r) => r.top)) - box.top;
    const bottom = Math.max(...rects.map((r) => r.bottom)) - box.top;
    gl.uniform4f(uCalm, left * k, h - bottom * k, right * k, h - top * k);
    gl.uniform1f(uHead, (head.getBoundingClientRect().bottom - box.top) * k);
    draw();
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    // Draw on every other frame at 60 Hz, and every fourth at 120 Hz.
    if (now - lastDraw < FRAME_MS - 4) return;
    // A long gap means the tab was hidden; carry on from where it was rather than jumping ahead.
    clock += Math.min(now - lastDraw, 100) / 1000;
    lastDraw = now;
    draw();
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const play = () => {
    if (raf || paused || !visible || lost) return;
    lastDraw = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const syncToggle = () => {
    const label = paused ? 'Play background motion' : 'Pause background motion';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.dataset.paused = String(paused);
  };
  const setPaused = (next: boolean) => {
    paused = next;
    syncToggle();
    if (paused) stop();
    else play();
  };

  toggle.addEventListener('click', () => {
    chosen = !paused;
    setPaused(chosen);
    onToggle(chosen);
  });
  reduce.addEventListener('change', () => setPaused(chosen || reduce.matches));

  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    stop();
    canvas.classList.remove('is-on');
    toggle.hidden = true;
  });

  const resize = new ResizeObserver(fit);
  for (const el of [band, ...calm]) resize.observe(el);
  // The web font can move the text without changing any of these sizes.
  void document.fonts?.ready.then(fit);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play();
    else stop();
  }).observe(band);

  fit();
  syncToggle();
  toggle.hidden = false;
  canvas.classList.add('is-on');
  play();
}
