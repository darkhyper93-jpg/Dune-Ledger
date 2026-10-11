/**
 * Música de caravana generada en el momento (sin archivos): un bordón
 * grave, un laúd pulsado que improvisa en escala hiyaz sobre re (la de
 * tantas canciones del desierto) y un pandero con el ritmo maqsum
 * (dum-tek-tek-dum-tek). Nunca suena igual dos veces y no pesa nada.
 *
 * Se programa por adelantado con un reloj de Web Audio (no con timers
 * exactos), así no se atrasa aunque el celular esté ocupado.
 */

import { musicOutput } from './audio.js';

/** Escala hiyaz sobre re3, en semitonos desde la tónica. */
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
const ROOT = 146.83; // re3
const BEAT = 60 / 84; // negra a 84 por minuto
/** Maqsum en corcheas: D = dum (grave), T = tek (agudo), . = silencio. */
const MAQSUM = ['D', 'T', '.', 'T', 'D', '.', 'T', '.'];

let timer = null;
let nextTime = 0;
let step = 0;
let degree = 0;
let drone = null;
let noise = null;

const hz = (semi) => ROOT * 2 ** (semi / 12);

/** Una nota de laúd: ataque seco, cuerda que se apaga, un poco de brillo. */
function pluck(ctx, out, at, freq, vel) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 6, at);
  f.frequency.exponentialRampToValueAtTime(freq * 1.2, at + 0.35);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.18 * vel, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  o.connect(f).connect(g).connect(out);
  o.start(at);
  o.stop(at + 1);
}

/** Golpe de pandero: dum (tono que cae) o tek (ruido agudo y corto). */
function drum(ctx, out, at, kind) {
  const g = ctx.createGain();
  if (kind === 'D') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(55, at + 0.18);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.32);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 2400;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.16, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + 0.08);
}

/** El bordón: re y la graves, apenas desafinados, que respiran despacio. */
function startDrone(ctx, out) {
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.gain.setTargetAtTime(0.07, ctx.currentTime, 2);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 380;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 120;
  lfo.connect(lfoGain).connect(f.frequency);
  const oscs = [hz(-12), hz(-12) * 1.003, hz(-5)].map((freq) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.connect(f);
    o.start();
    return o;
  });
  f.connect(g).connect(out);
  lfo.start();
  return { g, stop: () => { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); setTimeout(() => [...oscs, lfo].forEach((o) => o.stop()), 2000); } };
}

/** Elige la próxima nota: pasos cortos por la escala, con algún salto. */
function nextDegree() {
  const r = Math.random();
  const move = r < 0.4 ? 1 : r < 0.8 ? -1 : r < 0.9 ? 2 : -2;
  degree = Math.max(0, Math.min(HIJAZ.length - 1, degree + move));
  if (degree === HIJAZ.length - 1 && Math.random() < 0.5) degree -= 2;
  return degree;
}

/** Programa las corcheas que entran en el próximo medio segundo. */
function schedule() {
  const o = musicOutput();
  if (!o) return;
  const { ctx, out } = o;
  while (nextTime < ctx.currentTime + 0.5) {
    const hit = MAQSUM[step % MAQSUM.length];
    if (hit !== '.') drum(ctx, out, nextTime, hit);
    // El laúd toca en la mitad de las corcheas, y descansa cada 4 compases.
    const bar = Math.floor(step / 8);
    if (bar % 4 !== 3 && Math.random() < 0.55) {
      const accent = step % 8 === 0 ? 1 : 0.7;
      pluck(ctx, out, nextTime, hz(HIJAZ[nextDegree()]), accent);
    } else if (bar % 4 === 3 && step % 8 === 0) {
      pluck(ctx, out, nextTime, hz(0), 0.8); // vuelve a la tónica
      degree = 0;
    }
    nextTime += BEAT / 2;
    step++;
  }
}

/** Empieza la música (si hay audio desbloqueado y volumen). */
export function startMusic() {
  const o = musicOutput();
  if (!o || timer || o.volume <= 0) return;
  const { ctx, out } = o;
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  drone = startDrone(ctx, out);
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  timer = setInterval(schedule, 120);
  schedule();
}

/** Para la música con un fundido corto. */
export function stopMusic() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  drone?.stop();
  drone = null;
}

/** Dice si la música está sonando. */
export function musicPlaying() {
  return timer !== null;
}
