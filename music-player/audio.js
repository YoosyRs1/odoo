/*
 * Auralia · motor de audio
 * - SynthEngine: genera música real (pads, bajo, arpegio, percusión) con Web Audio API.
 * - FileEngine: reproduce archivos de audio locales que añada el usuario.
 * Ambos comparten el mismo AudioContext, analizador (visualizador) y control de volumen.
 */

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

/* ------------------------------ pistas ------------------------------ */

export const TRACKS = [
  {
    id: 'amanecer',
    title: 'Amanecer Neón',
    artist: 'Auralia · sintetizado en vivo',
    bpm: 84,
    root: 57,
    scale: 'minor',
    duration: 212,
    gradient: ['#7c3aed', '#22d3ee'],
    mix: { pad: 0.9, bass: 0.9, arp: 0.6, drums: 0.5 },
    pad: { wave: 'sawtooth', cutoff: 1250, detune: 8 },
    bass: { wave: 'sine', cutoff: 520 },
    arp: { wave: 'triangle', octave: 12, decay: 0.4, delay: 0.28 },
    progression: [0, 5, 3, 4],
    patterns: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      bassSteps: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      arpSteps: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
    },
  },
  {
    id: 'lluvia',
    title: 'Lluvia de Cristal',
    artist: 'Auralia · sintetizado en vivo',
    bpm: 68,
    root: 50,
    scale: 'dorian',
    duration: 236,
    gradient: ['#0ea5e9', '#6366f1'],
    mix: { pad: 1.0, bass: 0.6, arp: 0.5, drums: 0.22 },
    pad: { wave: 'triangle', cutoff: 900, detune: 12 },
    bass: { wave: 'sine', cutoff: 400 },
    arp: { wave: 'sine', octave: 24, decay: 0.9, delay: 0.45 },
    progression: [0, 3, 4, 3],
    patterns: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
      bassSteps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      arpSteps: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    },
  },
  {
    id: 'pulso',
    title: 'Pulso Nocturno',
    artist: 'Auralia · sintetizado en vivo',
    bpm: 118,
    root: 53,
    scale: 'minor',
    duration: 224,
    gradient: ['#f43f5e', '#8b5cf6'],
    mix: { pad: 0.55, bass: 1.0, arp: 0.5, drums: 0.85 },
    pad: { wave: 'sawtooth', cutoff: 700, detune: 14 },
    bass: { wave: 'square', cutoff: 620 },
    arp: { wave: 'sawtooth', octave: 12, decay: 0.22, delay: 0.2 },
    progression: [0, 6, 5, 4],
    patterns: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bassSteps: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      arpSteps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    },
  },
  {
    id: 'ruta',
    title: 'Ruta Estelar',
    artist: 'Auralia · sintetizado en vivo',
    bpm: 104,
    root: 48,
    scale: 'minor',
    duration: 208,
    gradient: ['#22d3ee', '#a855f7'],
    mix: { pad: 0.7, bass: 0.95, arp: 0.8, drums: 0.7 },
    pad: { wave: 'sawtooth', cutoff: 1400, detune: 10 },
    bass: { wave: 'sawtooth', cutoff: 700 },
    arp: { wave: 'square', octave: 24, decay: 0.18, delay: 0.35 },
    progression: [0, 5, 3, 4],
    patterns: {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      bassSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      arpSteps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  },
  {
    id: 'bosque',
    title: 'Bosque de Niebla',
    artist: 'Auralia · sintetizado en vivo',
    bpm: 76,
    root: 55,
    scale: 'major',
    duration: 232,
    gradient: ['#10b981', '#84cc16'],
    mix: { pad: 0.95, bass: 0.75, arp: 0.4, drums: 0.35 },
    pad: { wave: 'triangle', cutoff: 1000, detune: 7 },
    bass: { wave: 'sine', cutoff: 460 },
    arp: { wave: 'triangle', octave: 12, decay: 0.5, delay: 0.32 },
    progression: [0, 4, 5, 3],
    patterns: {
      kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      bassSteps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      arpSteps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    },
  },
];

/* --------------------------- utilidades --------------------------- */

function makeNoiseBuffer(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function makeImpulse(ctx, seconds = 2.8, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buffer;
}

/** Grafo compartido: contexto, analizador (visualizador) y volumen general. */
export function createAudioGraph() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtor();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;
  const volumeGain = ctx.createGain();
  volumeGain.gain.value = 0.75;
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(volumeGain);
  volumeGain.connect(analyser);
  analyser.connect(ctx.destination);
  return { ctx, analyser, master, volumeGain };
}

/* --------------------------- SynthEngine --------------------------- */

export class SynthEngine {
  constructor(shared, track) {
    this.shared = shared;
    this.ctx = shared.ctx;
    this.track = track;
    this.duration = track.duration;
    this.position = 0;
    this.playing = false;
    this.active = new Set();
    this.timer = null;
    this.onended = null;
    this.noise = makeNoiseBuffer(this.ctx, 2);
    this.buildGraph();
  }

  buildGraph() {
    const { ctx } = this;
    const t = this.track;
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(this.shared.master);

    this.padBus = ctx.createGain();
    this.padBus.gain.value = t.mix.pad;
    this.bassBus = ctx.createGain();
    this.bassBus.gain.value = t.mix.bass;
    this.arpBus = ctx.createGain();
    this.arpBus.gain.value = t.mix.arp;
    this.drumBus = ctx.createGain();
    this.drumBus.gain.value = t.mix.drums;
    [this.padBus, this.bassBus, this.arpBus, this.drumBus].forEach((bus) =>
      bus.connect(this.out),
    );

    // Reverb (impulso generado) y delay con realimentación para el arpegio.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.8, 2.6);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.32;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.out);

    const stepDur = 60 / t.bpm / 4;
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = Math.min(1.4, stepDur * 6);
    this.delayFilter = ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2600;
    this.delayGain = ctx.createGain();
    this.delayGain.gain.value = t.arp.delay ?? 0.3;
    this.delay.connect(this.delayFilter);
    this.delayFilter.connect(this.delayGain);
    this.delayGain.connect(this.delay);
    this.delayGain.connect(this.arpBus);
  }

  chordMidis(barIndex) {
    const { root, scale, progression } = this.track;
    const sc = SCALES[scale] || SCALES.minor;
    const degree = progression[((barIndex % progression.length) + progression.length) % progression.length];
    return [0, 2, 4].map((offset) => {
      const idx = degree + offset;
      const octave = Math.floor(idx / sc.length);
      const semis = sc[((idx % sc.length) + sc.length) % sc.length] + 12 * octave;
      return root + semis;
    });
  }

  keep(node) {
    this.active.add(node);
    node.onended = () => this.active.delete(node);
  }

  positionNow() {
    if (!this.playing) return this.position;
    return Math.min(
      this.duration,
      this.startOffset + (this.ctx.currentTime - this.startCtx),
    );
  }

  async play() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(0.0001, now);
    this.out.gain.linearRampToValueAtTime(1, now + 0.15);
    this.startCtx = now;
    this.startOffset = this.position;
    const stepDur = 60 / this.track.bpm / 4;
    this.step = Math.floor(this.position / stepDur);
    this.nextStepTime = now + 0.05;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  pause() {
    if (!this.playing) return;
    this.position = this.positionNow();
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(Math.max(this.out.gain.value, 0.0001), now);
    this.out.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    for (const node of this.active) {
      try {
        node.stop(now + 0.1);
      } catch (_) {
        /* ya detenido */
      }
    }
    this.active.clear();
  }

  seek(seconds) {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.position = Math.max(0, Math.min(this.duration, seconds));
    if (wasPlaying) this.play();
  }

  tick() {
    const stepDur = 60 / this.track.bpm / 4;
    const horizon = this.ctx.currentTime + 0.2;
    let guard = 0;
    while (this.nextStepTime < horizon && guard++ < 256) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.nextStepTime += stepDur;
      this.step += 1;
    }
    if (this.positionNow() >= this.duration) {
      this.pause();
      this.position = this.duration;
      if (this.onended) this.onended();
    }
  }

  scheduleStep(step, time) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const beat = 60 / this.track.bpm;
    const barDur = beat * 4;
    const chord = this.chordMidis(bar);
    const p = this.track.patterns;

    if (s === 0) {
      chord.forEach((m) => this.padVoice(m, time, barDur * 0.98));
      this.padVoice(chord[0] + 12, time, barDur * 0.98, 0.45);
    }

    if (p.bassSteps[s]) this.bassVoice(chord[0] - 12, time, 0.85 + Math.random() * 0.15);

    if (p.arpSteps[s]) {
      const order = [0, 1, 2, 1];
      const tone = chord[order[Math.floor(step / 2) % 4]] + this.track.arp.octave;
      this.arpVoice(tone, time, 0.7 + Math.random() * 0.3);
    }

    if (p.kick[s]) this.kickVoice(time, p.kick[s] * 0.9);
    if (p.snare[s]) this.snareVoice(time, p.snare[s] * 0.85);
    if (p.hat[s]) this.hatVoice(time, p.hat[s] * (s % 4 === 0 ? 0.7 : 1));
  }

  padVoice(midi, time, dur, gainScale = 1) {
    const { ctx } = this;
    const spec = this.track.pad;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(spec.cutoff * 0.55, time);
    filter.frequency.linearRampToValueAtTime(spec.cutoff, time + dur * 0.55);

    const gain = ctx.createGain();
    const peak = 0.085 * gainScale;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + Math.min(1.8, dur * 0.45));
    gain.gain.setValueAtTime(peak, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    filter.connect(gain);
    gain.connect(this.padBus);
    const send = ctx.createGain();
    send.gain.value = 0.55;
    gain.connect(send);
    send.connect(this.reverb);

    for (const detune of [-spec.detune, spec.detune]) {
      const osc = ctx.createOscillator();
      osc.type = spec.wave;
      osc.frequency.value = midiToFreq(midi);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + dur + 0.05);
      this.keep(osc);
    }
  }

  bassVoice(midi, time, vel) {
    const { ctx } = this;
    const spec = this.track.bass;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = spec.cutoff;
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    const peak = 0.3 * vel;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

    filter.connect(gain);
    gain.connect(this.bassBus);

    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.value = midiToFreq(midi);
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + 0.5);
    this.keep(osc);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = midiToFreq(midi);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    sub.connect(subGain);
    subGain.connect(filter);
    sub.start(time);
    sub.stop(time + 0.5);
    this.keep(sub);
  }

  arpVoice(midi, time, vel) {
    const { ctx } = this;
    const spec = this.track.arp;
    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.value = midiToFreq(midi);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4600, time);
    filter.frequency.exponentialRampToValueAtTime(1100, time + spec.decay);

    const gain = ctx.createGain();
    const peak = 0.085 * vel;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + spec.decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.arpBus);

    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.45;
    gain.connect(delaySend);
    delaySend.connect(this.delay);

    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.25;
    gain.connect(reverbSend);
    reverbSend.connect(this.reverb);

    osc.start(time);
    osc.stop(time + spec.decay + 0.05);
    this.keep(osc);
  }

  kickVoice(time, vel) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.13);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.5 * vel, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    osc.connect(gain);
    gain.connect(this.drumBus);
    osc.start(time);
    osc.stop(time + 0.32);
    this.keep(osc);
  }

  hatVoice(time, vel) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1.6;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.075 * vel, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumBus);
    src.start(time);
    src.stop(time + 0.09);
    this.keep(src);
  }

  snareVoice(time, vel) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1.15;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1900;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.14 * vel, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.21);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumBus);

    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.4;
    gain.connect(reverbSend);
    reverbSend.connect(this.reverb);

    src.start(time);
    src.stop(time + 0.23);
    this.keep(src);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = 190;
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.linearRampToValueAtTime(0.07 * vel, time + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    body.connect(bodyGain);
    bodyGain.connect(this.drumBus);
    body.start(time);
    body.stop(time + 0.14);
    this.keep(body);
  }

  dispose() {
    this.pause();
    try {
      this.out.disconnect();
    } catch (_) {
      /* ya desconectado */
    }
  }
}

/* ---------------------------- FileEngine ---------------------------- */

export class FileEngine {
  constructor(shared, track) {
    this.shared = shared;
    this.ctx = shared.ctx;
    this.track = track;
    this.playing = false;
    this.onended = null;

    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.src = track.url;
    this.audio.crossOrigin = 'anonymous';

    this.source = this.ctx.createMediaElementSource(this.audio);
    this.source.connect(shared.analyser);
    this.audio.volume = shared.volumeGain.gain.value;

    this.audio.addEventListener('ended', () => {
      this.playing = false;
      if (this.onended) this.onended();
    });
    this.audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(this.audio.duration)) {
        this.track.duration = this.audio.duration;
        if (this.onmetadata) this.onmetadata(this.track);
      }
    });
  }

  get duration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  positionNow() {
    return this.audio.currentTime || 0;
  }

  async play() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await this.audio.play();
    this.playing = true;
  }

  pause() {
    this.audio.pause();
    this.playing = false;
  }

  seek(seconds) {
    if (Number.isFinite(this.audio.duration)) {
      this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, seconds));
    }
  }

  setVolume(value) {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  dispose() {
    this.pause();
    try {
      this.source.disconnect();
    } catch (_) {
      /* sin conexión */
    }
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
