(function mainCanciones() {
  if (window.animarTituloGlobal) {
    animarTituloGlobal('#titulo-buscador', 'Canciones Populares por Género');
  }

  const userEmail = sessionStorage.getItem('userEmail') || sessionStorage.getItem('correo');
  DetalleCancion.init(userEmail);

  const CACHE_KEY = 'attomusic_canciones_cache';
  const CACHE_DURATION = 15 * 60 * 1000;

  function cargarDesdeCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data.canciones;
    } catch (err) {
      console.error('Error leyendo caché:', err);
      return null;
    }
  }

  function guardarEnCache(canciones) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), canciones }));
    } catch (err) {
      console.error('Error guardando caché:', err);
    }
  }

  const generos = [
    { nombre: '🎤 Pop', query: 'pop', limit: 12 },
    { nombre: '🎸 Rock', query: 'rock', limit: 12 },
    { nombre: '🔥 Reggaetón', query: 'Bad Bunny', limit: 12 },
    { nombre: '🎤 Hip Hop', query: 'Eminem', limit: 12 },
    { nombre: '🎹 Electrónica', query: 'electronic', limit: 12 },
    { nombre: '🌟 Indie', query: 'indie', limit: 12 },
    { nombre: '🎷 Jazz', query: 'jazz', limit: 12 },
    { nombre: '🤘 Metal', query: 'Metallica', limit: 12 },
    { nombre: '🤠 Country', query: 'country', limit: 12 },
    { nombre: '🌴 Reggae', query: 'reggae', limit: 12 },
    { nombre: '🎺 Blues', query: 'blues', limit: 12 },
    { nombre: '🪕 Folk', query: 'folk', limit: 12 },
    { nombre: '🎻 Clásica', query: 'classical', limit: 12 },
    { nombre: '🎺 Latina', query: 'latin', limit: 12 },
    { nombre: '💃 Dance', query: 'dance', limit: 12 },
    { nombre: '💙 Soul', query: 'soul', limit: 12 },
    { nombre: '🎵 Funk', query: 'funk', limit: 12 },
    { nombre: '🔊 Trap', query: 'Travis Scott', limit: 12 },
    { nombre: '💜 R&B', query: 'rnb', limit: 12 },
    { nombre: '🎧 Alternativa', query: 'alternative', limit: 12 },
    { nombre: '💥 Punk', query: 'punk', limit: 12 },
    { nombre: '🎺 Ska', query: 'ska', limit: 12 },
    { nombre: '✨ Disco', query: 'disco', limit: 12 },
    { nombre: '🇰🇷 K-Pop', query: 'BTS', limit: 12 },
    { nombre: '🎺 Cumbia', query: 'cumbia', limit: 12 },
    { nombre: '💃 Bachata', query: 'Romeo Santos', limit: 12 },
    { nombre: '🎺 Salsa', query: 'salsa', limit: 12 },
    { nombre: '🎻 Tango', query: 'tango', limit: 12 },
    { nombre: '🎸 Flamenco', query: 'flamenco', limit: 12 },
    { nombre: '🎹 House', query: 'house', limit: 12 }
  ];

  function renderNavGeneros() {
    const select = document.getElementById('select-genero');
    select.innerHTML = '<option value="" disabled selected>Selecciona un género...</option>' +
      generos.map(g => `<option value="genero-${g.nombre.replace(/[^a-zA-Z0-9]/g, '')}">${g.nombre}</option>`).join('');
    select.addEventListener('change', function () {
      const target = document.getElementById(this.value);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  renderNavGeneros();

  async function cargarCancionesPopulares() {
    const cont = document.getElementById('generos-canciones');
    const cancionesCache = cargarDesdeCache();

    if (cancionesCache) {
      renderizarCancionesDesdeCache(cancionesCache);
      return;
    }

    let html = '';
    generos.forEach(genero => {
      const generoId = genero.nombre.replace(/[^a-zA-Z0-9]/g, '');
      html += `
        <h3 id='genero-${generoId}' style='color:#ba01ff;margin-top:32px;'>${genero.nombre}</h3>
        <div id='container-${generoId}' class='genero-container' style='margin-bottom:24px;'>
          <div style='text-align:center;color:#999;padding:20px;'>
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span style='margin-left:8px;'>Cargando...</span>
          </div>
        </div>
      `;
    });
    cont.innerHTML = html;

    const resultados = await Promise.allSettled(generos.map(g => cargarGenero(g)));
    const cache = {};
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        cache[generos[i].nombre.replace(/[^a-zA-Z0-9]/g, '')] = r.value;
      }
    });
    guardarEnCache(cache);
  }

  function renderizarCancionesDesdeCache(cancionesCache) {
    const cont = document.getElementById('generos-canciones');
    let html = '';

    generos.forEach(genero => {
      const generoId = genero.nombre.replace(/[^a-zA-Z0-9]/g, '');
      const tracks = cancionesCache[generoId] || [];

      html += `<h3 id='genero-${generoId}' style='color:#ba01ff;margin-top:32px;'>${genero.nombre}</h3>`;
      html += `<div id='container-${generoId}' class='genero-container' style='margin-bottom:24px;'>`;

      if (tracks.length > 0) {
        html += `<div class='row' style='gap:24px;display:flex;flex-wrap:wrap;'>`;
        tracks.forEach((track, idx) => {
          html += `
            <div class='search-card vertical-card' id='track-${generoId}-${idx}' style='margin-bottom:18px;cursor:pointer;' data-track-id='${track.id}'>
              <img src='${track.album?.images?.[0]?.url || ''}' alt='cover' loading='lazy'>
              <div class='card-info'>
                <h3>${track.name}</h3>
                <p>👩‍🎤 ${track.artists.map(a => a.name).join(', ')}</p>
                <p>📅 ${track.album?.release_date || ''}</p>
                <p>🔥 Popularidad: ${track.popularity}</p>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      } else {
        html += `<div style='color:#999;font-size:1rem;text-align:center;padding:20px;'>No se encontraron canciones para este género.</div>`;
      }
      html += `</div>`;
    });

    cont.innerHTML = html;

    generos.forEach(genero => {
      const generoId = genero.nombre.replace(/[^a-zA-Z0-9]/g, '');
      (cancionesCache[generoId] || []).forEach((track, idx) => {
        const card = document.getElementById(`track-${generoId}-${idx}`);
        if (card) {
          card.addEventListener('click', () => {
            DetalleCancion.mostrar(track.id, 'generos-canciones', () => cargarCancionesPopulares());
          });
        }
      });
    });
  }

  async function cargarGenero(genero) {
    const generoId = genero.nombre.replace(/[^a-zA-Z0-9]/g, '');
    const container = document.getElementById(`container-${generoId}`);
    if (!container) return null;

    try {
      const res = await fetch(`/spotify/search?q=${encodeURIComponent(genero.query)}&type=track&limit=${genero.limit}`);
      if (!res.ok) throw new Error('Error en búsqueda');
      const data = await res.json();
      let tracks = (data.tracks?.items || [])
        .filter(t => t.popularity > 40)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 12);

      if (tracks.length > 0) {
        let html = `<div class='row' style='gap:24px;display:flex;flex-wrap:wrap;'>`;
        tracks.forEach((track, idx) => {
          html += `
            <div class='search-card vertical-card' id='track-${generoId}-${idx}' style='margin-bottom:18px;cursor:pointer;' data-track-id='${track.id}'>
              <img src='${track.album?.images?.[0]?.url || ''}' alt='cover' loading='lazy'>
              <div class='card-info'>
                <h3>${track.name}</h3>
                <p>👩‍🎤 ${track.artists.map(a => a.name).join(', ')}</p>
                <p>📅 ${track.album?.release_date || ''}</p>
                <p>🔥 Popularidad: ${track.popularity}</p>
              </div>
            </div>
          `;
        });
        html += `</div>`;
        container.innerHTML = html;

        tracks.forEach((track, idx) => {
          const card = document.getElementById(`track-${generoId}-${idx}`);
          if (card) {
            card.addEventListener('click', () => {
              DetalleCancion.mostrar(track.id, 'generos-canciones', () => cargarCancionesPopulares());
            });
          }
        });
      } else {
        container.innerHTML = `<div style='color:#999;font-size:1rem;text-align:center;padding:20px;'>No se encontraron canciones para este género.</div>`;
      }
      return tracks;
    } catch (err) {
      console.error(`Error cargando ${genero.nombre}:`, err);
      container.innerHTML = `<div style='color:#ff5555;font-size:1rem;text-align:center;padding:20px;'>Error al cargar canciones</div>`;
      return null;
    }
  }

  cargarCancionesPopulares();

  window['init_canciones'] = mainCanciones;
})();
