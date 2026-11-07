# Auralia · página para escuchar música

Reproductor web con **sesiones generativas en vivo** (pads, bajo, arpegio y percusión
sintetizados con la Web Audio API) y la opción de **añadir tus propios archivos de audio**
(arrastrándolos a la página).

## Contenido

- `index.html` — estructura de la página.
- `styles.css` — diseño (cristal, degradados por pista, responsive).
- `audio.js` — motor de audio: `SynthEngine` (música generativa) y `FileEngine` (archivos locales).
- `app.js` — controles, lista de reproducción, visualizador y atajos de teclado.

## Uso local

Desde la raíz del repositorio:

```bash
PORT=3000 node server.js
```

Y abre <http://localhost:3000>. El servidor sirve la carpeta `music-player/` como `public/`
en la imagen Docker.

## Funciones

- Reproducir / pausar, anterior / siguiente y avance automático de pista.
- Barra de progreso con búsqueda por posición, tiempos y control de volumen / silencio.
- Visualizador de espectro en tiempo real.
- Lista de reproducción con pista activa y ecualizador animado.
- Añadir archivos propios (drag & drop o selector); nunca se suben a un servidor.
- Atajos: `espacio`, `←`/`→` (±5 s), `shift+←`/`shift+→` (pista), `↑`/`↓` (volumen).

> Las cinco pistas incluidas se generan en el navegador con osciladores, filtros y
> reverberación sintética: no requieren archivos de audio ni conexión a internet.
