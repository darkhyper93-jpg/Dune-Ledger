/**
 * Sonido generado con Web Audio (sin archivos): monedas al vender y viento
 * durante los viajes. Los volúmenes de efectos y música son separados;
 * la música llega en la etapa de pulido.
 *
 * El contexto de audio se crea recién con el primer toque del jugador,
 * como piden los navegadores.
 */

let ctx = null;
let sfxGain = null;
let volumes = { music: 0.5, sfx: 0.8 };
let wind = null;

/** Crea (o reanuda) el contexto de audio. Devuelve null si no hay Web Audio. */
function ensure() {
  if (!ctx) {
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = volumes.sfx;
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Cambia los volúmenes (0 a 1).
 * @param {{music:number,sfx:number}} v
 */
export function setVolumes(v) {
  volumes = { ...v };
  if (sfxGain) sfxGain.gain.value = volumes.sfx;
}

/** Desbloquea el audio con un gesto del jugador (llamar en un toque). */
export function unlockAudio() {
  ensure();
}

/**
 * Una moneda: un "tin" corto con armónico.
 */
function coin(at, freq) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.76;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.35, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g);
  o2.connect(g);
  g.connect(sfxGain);
  o.start(at);
  o2.start(at);
  o.stop(at + 0.25);
  o2.stop(at + 0.25);
}

/**
 * Monedas al vender: más monedas y más agudas cuanto más ganancia.
 * @param {number} profit ganancia de la venta (puede ser negativa)
 */
export function playCoins(profit) {
  if (!ensure() || volumes.sfx <= 0) return;
  const n = Math.max(1, Math.min(8, Math.ceil(Math.max(0, profit) / 60)));
  const base = profit > 0 ? 1100 + Math.min(900, profit * 2) : 700;
  const t = ctx.currentTime;
  for (let i = 0; i < n; i++) coin(t + i * 0.06, base * (1 + (i % 3) * 0.06));
}

/** Un toque corto para compras y botones. */
export function playTap() {
  if (!ensure() || volumes.sfx <= 0) return;
  coin(ctx.currentTime, 620);
}

/**
 * Viento suave (ruido filtrado) mientras dura un viaje.
 * @param {boolean} on
 */
export function setWind(on) {
  if (!on) {
    if (wind) {
      const w = wind;
      wind = null;
      w.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
      setTimeout(() => w.src.stop(), 600);
    }
    return;
  }
  if (wind || !ensure() || volumes.sfx <= 0) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.3);
  src.connect(filter).connect(gain).connect(sfxGain);
  src.start();
  wind = { src, gain };
}
