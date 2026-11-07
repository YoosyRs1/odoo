/* Auralia · interfaz del reproductor */
import { TRACKS, createAudioGraph, SynthEngine, FileEngine } from './audio.js';

const $ = (sel) => document.querySelector(sel);

const shared = createAudioGraph();
shared.volumeGain.gain.value = 0.75;

const state = {
  playlist: TRACKS.map((track) => ({ ...track, kind: 'synth' })),
  index: 0,
  playing: false,
  volume: 0.75,
  muted: false,
  seeking: false,
  engine: null,
  objectUrls: [],
};

const els = {
  playBtn: $('#play-btn'),
  prevBtn: $('#prev-btn'),
  nextBtn: $('#next-btn'),
  muteBtn: $('#mute-btn'),
  volume: $('#volume'),
  progress: $('#progress'),
  curTime: $('#cur-time'),
  durTime: $('#dur-time'),
  title: $('#track-title'),
  artist: $('#track-artist'),
  eyebrow: $('#now-eyebrow'),
  badge: $('#cover-badge'),
  playlist: $('#playlist'),
  trackCount: $('#track-count'),
  fileInput: $('#file-input'),
  dropOverlay: $('#drop-overlay'),
  visualizer: $('#visualizer'),
};

/* ----------------------------- utilidades ----------------------------- */

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function currentTrack() {
  return state.playlist[state.index];
}

function setPlayingUI(playing) {
  state.playing = playing;
  document.body.classList.toggle('is-playing', playing);
  els.playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  els.eyebrow.textContent = playing ? 'Reproduciendo ahora' : 'En pausa';
}

function applyTrackTheme(track) {
  const [c1, c2] = track.gradient || ['#7c3aed', '#22d3ee'];
  document.documentElement.style.setProperty('--c1', c1);
  document.documentElement.style.setProperty('--c2', c2);
}

/* ----------------------------- playlist UI ----------------------------- */

function renderPlaylist() {
  els.playlist.innerHTML = '';
  state.playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = index === state.index ? 'active' : '';
    li.dataset.index = String(index);

    const num = document.createElement('span');
    num.className = 'num';
    if (index === state.index) {
      num.innerHTML = '<span class="eq"><i></i><i></i><i></i><i></i></span>';
    } else {
      num.textContent = String(index + 1);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = track.title;
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = track.artist;
    meta.append(title, sub);

    const dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = track.duration ? formatTime(track.duration) : '—';

    li.append(num, meta, dur);

    if (track.kind === 'file') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Quitar ${track.title}`);
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeTrack(index);
      });
      li.append(remove);
    } else {
      const spacer = document.createElement('span');
      spacer.style.width = '24px';
      li.append(spacer);
    }

    li.addEventListener('click', () => loadTrack(index, true));
    els.playlist.append(li);
  });

  const total = state.playlist.length;
  els.trackCount.textContent = `${total} ${total === 1 ? 'pista' : 'pistas'}`;
}

/* ----------------------------- reproducción ----------------------------- */

function updateTrackMeta() {
  const track = currentTrack();
  if (!track) return;
  els.title.textContent = track.title;
  els.artist.textContent = track.artist;
  els.badge.textContent = track.kind === 'file' ? 'ARCHIVO' : 'EN VIVO';
  els.durTime.textContent = formatTime(track.duration);
  applyTrackTheme(track);
}

function loadTrack(index, autoplay = false) {
  const track = state.playlist[index];
  if (!track) return;

  if (state.engine) {
    state.engine.dispose();
    state.engine = null;
  }

  state.index = index;
  const engine =
    track.kind === 'file' ? new FileEngine(shared, track) : new SynthEngine(shared, track);

  engine.onended = () => nextTrack(true);
  if (engine instanceof FileEngine) {
    engine.setVolume(state.muted ? 0 : state.volume);
    engine.onmetadata = () => {
      updateTrackMeta();
      renderPlaylist();
    };
  }

  state.engine = engine;
  state.seeking = false;
  els.progress.value = '0';
  els.curTime.textContent = '0:00';
  updateTrackMeta();
  renderPlaylist();
  setPlayingUI(false);

  if (autoplay) play();
}

async function play() {
  if (!state.engine) loadTrack(state.index, false);
  try {
    await state.engine.play();
    setPlayingUI(true);
  } catch (error) {
    console.error('No se pudo iniciar la reproducción', error);
    setPlayingUI(false);
  }
}

function pause() {
  if (state.engine) state.engine.pause();
  setPlayingUI(false);
}

function togglePlay() {
  if (state.playing) pause();
  else play();
}

function nextTrack(autoplay = state.playing) {
  const next = (state.index + 1) % state.playlist.length;
  loadTrack(next, autoplay);
}

function prevTrack() {
  const engine = state.engine;
  if (engine && engine.positionNow() > 3) {
    engine.seek(0);
    return;
  }
  const prev = (state.index - 1 + state.playlist.length) % state.playlist.length;
  loadTrack(prev, state.playing);
}

function seekToRatio(ratio) {
  const engine = state.engine;
  if (!engine) return;
  const duration = engine.duration || currentTrack().duration || 0;
  if (!duration) return;
  engine.seek(ratio * duration);
}

function setVolume(value) {
  state.volume = value;
  state.muted = value === 0;
  shared.volumeGain.gain.value = state.muted ? 0 : value;
  if (state.engine instanceof FileEngine) state.engine.setVolume(state.muted ? 0 : value);
  els.volume.value = String(Math.round(value * 100));
  document.body.classList.toggle('is-muted', state.muted);
  els.muteBtn.setAttribute('aria-label', state.muted ? 'Activar sonido' : 'Silenciar');
}

/* ----------------------------- archivos propios ----------------------------- */

function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(
    (file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(file.name),
  );
  if (!files.length) return;

  const firstNew = state.playlist.length;
  files.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    state.objectUrls.push(url);
    const sizeMb = Math.max(0.1, Math.round((file.size / 1048576) * 10) / 10);
    state.playlist.push({
      id: `file-${Date.now()}-${i}`,
      kind: 'file',
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: `Tu biblioteca · ${sizeMb} MB`,
      url,
      duration: 0,
      gradient: ['#f59e0b', '#ef4444'],
    });
  });

  renderPlaylist();
  loadTrack(firstNew, true);
}

function removeTrack(index) {
  const track = state.playlist[index];
  if (!track || track.kind !== 'file') return;

  const wasCurrent = index === state.index;
  const wasPlaying = state.playing;

  if (wasCurrent && state.engine) {
    state.engine.dispose();
    state.engine = null;
  }

  state.playlist.splice(index, 1);
  if (track.url) {
    URL.revokeObjectURL(track.url);
    state.objectUrls = state.objectUrls.filter((url) => url !== track.url);
  }

  if (!state.playlist.length) {
    state.index = 0;
    setPlayingUI(false);
    renderPlaylist();
    return;
  }

  if (index < state.index) state.index -= 1;
  if (wasCurrent) {
    state.index = Math.min(index, state.playlist.length - 1);
    loadTrack(state.index, wasPlaying);
  } else {
    renderPlaylist();
  }
}

/* ----------------------------- visualizador ----------------------------- */

const canvas = els.visualizer;
const ctx2d = canvas.getContext('2d');
const freqData = new Uint8Array(shared.analyser.frequencyBinCount);
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function sizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawVisualizer(time) {
  sizeCanvas();
  const width = canvas.width;
  const height = canvas.height;
  ctx2d.clearRect(0, 0, width, height);

  shared.analyser.getByteFrequencyData(freqData);

  const bars = 56;
  const gap = Math.max(1, width * 0.004);
  const barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
  const track = currentTrack();
  const [c1, c2] = track?.gradient || ['#7c3aed', '#22d3ee'];

  const gradient = ctx2d.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx2d.fillStyle = gradient;

  let energy = 0;
  for (let i = 0; i < bars; i++) {
    const index = Math.floor(Math.pow(i / bars, 1.5) * (freqData.length * 0.62));
    const raw = freqData[index] / 255;
    energy += raw;
    const idle = 0.05 + 0.045 * Math.sin(time / 620 + i * 0.45);
    const value = Math.max(raw, idle);
    const barHeight = Math.max(2 * dpr, value * height * 0.94);
    const x = i * (barWidth + gap);
    const y = height - barHeight;
    const radius = Math.min(barWidth / 2, 3 * dpr);
    ctx2d.beginPath();
    ctx2d.roundRect(x, y, barWidth, barHeight, radius);
    ctx2d.fill();
  }

  ctx2d.globalAlpha = 1;
  return energy;
}

/* ----------------------------- bucle UI ----------------------------- */

let lastUpdate = 0;

function loop(time) {
  drawVisualizer(time);

  const engine = state.engine;
  if (engine && !state.seeking) {
    const duration = engine.duration || currentTrack()?.duration || 0;
    const position = Math.min(engine.positionNow(), duration || 0);
    if (duration > 0) {
      els.progress.value = String(Math.round((position / duration) * 1000));
      els.durTime.textContent = formatTime(duration);
    }
    if (time - lastUpdate > 120) {
      els.curTime.textContent = formatTime(position);
      lastUpdate = time;
    }
  }

  requestAnimationFrame(loop);
}

/* ----------------------------- eventos ----------------------------- */

els.playBtn.addEventListener('click', togglePlay);
els.nextBtn.addEventListener('click', () => nextTrack(true));
els.prevBtn.addEventListener('click', prevTrack);
els.muteBtn.addEventListener('click', () => {
  if (state.muted || state.volume === 0) {
    setVolume(state.volume > 0 ? state.volume : 0.6);
  } else {
    setVolume(0);
  }
});

els.volume.addEventListener('input', (event) => setVolume(Number(event.target.value) / 100));

els.progress.addEventListener('input', (event) => {
  state.seeking = true;
  const duration = state.engine?.duration || currentTrack()?.duration || 0;
  els.curTime.textContent = formatTime((Number(event.target.value) / 1000) * duration);
});

els.progress.addEventListener('change', (event) => {
  seekToRatio(Number(event.target.value) / 1000);
  state.seeking = false;
});

els.fileInput.addEventListener('change', (event) => {
  addFiles(event.target.files);
  event.target.value = '';
});

let dragDepth = 0;
window.addEventListener('dragenter', (event) => {
  if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
  dragDepth += 1;
  els.dropOverlay.classList.add('active');
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) els.dropOverlay.classList.remove('active');
});
window.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  els.dropOverlay.classList.remove('active');
  addFiles(event.dataTransfer?.files);
});

document.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' && document.activeElement.type === 'text') return;

  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
  } else if (event.code === 'ArrowRight' && event.shiftKey) {
    event.preventDefault();
    nextTrack(true);
  } else if (event.code === 'ArrowLeft' && event.shiftKey) {
    event.preventDefault();
    prevTrack();
  } else if (event.code === 'ArrowRight') {
    event.preventDefault();
    const engine = state.engine;
    if (engine) engine.seek(engine.positionNow() + 5);
  } else if (event.code === 'ArrowLeft') {
    event.preventDefault();
    const engine = state.engine;
    if (engine) engine.seek(Math.max(0, engine.positionNow() - 5));
  } else if (event.code === 'ArrowUp') {
    event.preventDefault();
    setVolume(Math.min(1, state.volume + 0.05));
  } else if (event.code === 'ArrowDown') {
    event.preventDefault();
    setVolume(Math.max(0, state.volume - 0.05));
  }
});

window.addEventListener('resize', sizeCanvas);
window.addEventListener('beforeunload', () => {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
});

/* ----------------------------- inicio ----------------------------- */

setVolume(0.75);
loadTrack(0, false);
requestAnimationFrame(loop);
