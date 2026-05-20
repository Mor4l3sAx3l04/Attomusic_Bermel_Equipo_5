(function initBuscador() {
  if (window.animarTituloGlobal) {
    animarTituloGlobal('#titulo-buscador', 'Resultados de búsqueda');
    animarTituloGlobal('#songs', 'Canciones');
    animarTituloGlobal('#artists', 'Artistas');
    animarTituloGlobal('#albums', 'Álbumes');
  }

  const userEmail = sessionStorage.getItem('userEmail') || sessionStorage.getItem('correo');
  DetalleCancion.init(userEmail);

  async function runSearch() {
    const searchStr = typeof window._searchParams === 'string' ? window._searchParams : window.location.search;
    window._searchParams = searchStr;
    const params = new URLSearchParams(searchStr);
    const q = params.get('q');
    const type = params.get('type') || 'track,artist,album';

    if (!q) {
      document.getElementById('results-tracks').innerHTML = '<p>No se ingresó búsqueda.</p>';
      document.getElementById('results-artists').innerHTML = '';
      document.getElementById('results-albums').innerHTML = '';
      return;
    }

    try {
      const res = await fetch(`/spotify/search?q=${encodeURIComponent(q)}&type=${type}`);
      if (!res.ok) throw new Error('Error en la búsqueda');
      const data = await res.json();

      mostrarTracks(data.tracks?.items || []);
      mostrarArtistas(data.artists?.items || []);
      mostrarAlbums(data.albums?.items || []);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      document.getElementById('results-tracks').innerHTML = "<p style='color:red;'>Error al buscar. Intenta de nuevo.</p>";
    }
  }

  function mostrarTracks(items) {
    const container = document.getElementById('results-tracks');
    container.innerHTML = '';
    if (items.length === 0) { container.innerHTML = '<p>No se encontraron canciones.</p>'; return; }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-card vertical-card';
      let img = item.album?.images?.[0]?.url || item.images?.[0]?.url || '';
      if (img && img.startsWith('icono')) img = 'images/' + img;

      div.innerHTML = `
        <img src="${img}" alt="cover">
        <div class="card-info">
          <h3>${item.name}</h3>
          ${item.artists ? `<p>👩‍🎤 ${item.artists.map(a => a.name).join(', ')}</p>` : ''}
          ${item.album?.release_date ? `<p>📅 ${item.album.release_date}</p>` : ''}
          ${item.popularity !== undefined ? `<p>🔥 Popularidad: ${item.popularity}</p>` : ''}
        </div>
      `;
      div.style.cursor = 'pointer';

      div.addEventListener('click', () => {
        DetalleCancion.mostrar(item.id, 'main-content', () => {
          document.getElementById('main-content').innerHTML = `
            <h2 class="search-results-title">🔎 Resultados de búsqueda</h2>
            <h3 class="search-section-title">Canciones</h3>
            <div id="results-tracks" class="search-results"></div>
            <h3 class="search-section-title">Artistas</h3>
            <div id="results-artists" class="search-results"></div>
            <h3 class="search-section-title">Álbumes</h3>
            <div id="results-albums" class="search-results"></div>
          `;
          runSearch();
        });
      });

      container.appendChild(div);
    });
  }

  function mostrarArtistas(items) {
    const container = document.getElementById('results-artists');
    container.innerHTML = '';
    if (items.length === 0) { container.innerHTML = '<p>No se encontraron artistas.</p>'; return; }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-card vertical-card';
      let img = item.images?.[0]?.url || '';
      if (img && img.startsWith('icono')) img = 'images/' + img;

      div.innerHTML = `
        <img src="${img}" alt="cover">
        <div class="card-info">
          <h3>${item.name}</h3>
          <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;">
            ${item.followers?.total ? `<span style='display:inline-flex;align-items:center;gap:4px;'><span style='font-size:1.2em;'>👥</span> Seguidores: ${item.followers.total.toLocaleString()}</span>` : ''}
            ${item.popularity !== undefined ? `<span style='display:inline-flex;align-items:center;gap:4px;'><span style='font-size:1.2em;'>🔥</span> Popularidad: ${item.popularity}</span>` : ''}
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function mostrarAlbums(items) {
    const container = document.getElementById('results-albums');
    container.innerHTML = '';
    if (items.length === 0) { container.innerHTML = '<p>No se encontraron álbumes.</p>'; return; }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-card vertical-card';
      let img = item.images?.[0]?.url || '';
      if (img && img.startsWith('icono')) img = 'images/' + img;

      div.innerHTML = `
        <img src="${img}" alt="cover">
        <div class="card-info">
          <h3>${item.name}</h3>
          ${item.artists ? `<p>👩‍🎤 ${item.artists.map(a => a.name).join(', ')}</p>` : ''}
          ${item.release_date ? `<p>📅 ${item.release_date}</p>` : ''}
        </div>
      `;
      container.appendChild(div);
    });
  }

  runSearch();

  window['init_buscador'] = initBuscador;
})();
