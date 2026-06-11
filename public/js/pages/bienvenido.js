(function () {
  const ANUNCIO_CADA = 4; // Insertar un anuncio cada N publicaciones
  let anunciosPool = [];
  let _observerAnuncios = null;

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // ── Crear tarjeta de anuncio inline (dentro del feed) ──
  function crearAnuncioFeed(cancion) {
    const div = document.createElement('div');
    div.className = 'anuncio-feed mb-4';

    const bgStyle = cancion.imagen_url
      ? `style="background-image:url('${escHtml(cancion.imagen_url)}')"` : '';

    const thumbHtml = cancion.imagen_url
      ? `<img src="${escHtml(cancion.imagen_url)}" alt="${escHtml(cancion.nombre)}" class="anuncio-feed-thumb">`
      : `<div class="anuncio-feed-thumb-placeholder">🎵</div>`;

    const esEliteAnuncio = cancion.tipo_plan === 'attoelite' || cancion.rol === 'admin';
    const badgesHtml = [
      esEliteAnuncio ? '<span class="badge-elite-small"><i class="bi bi-gem"></i> AttoElite</span>' : '',
      cancion.insignia_artista
        ? '<span class="badge-artista-small"><i class="bi bi-music-note"></i> Artista</span>' : ''
    ].join(' ');

    div.innerHTML = `
      <div class="anuncio-feed-bg" ${bgStyle}></div>
      <div class="anuncio-feed-overlay"></div>
      <div class="anuncio-feed-content">
        ${thumbHtml}
        <div class="anuncio-feed-info">
          <div class="anuncio-feed-sponsored">
            <span class="anuncio-feed-badge"><i class="bi bi-vinyl-fill"></i> Artista</span>
            en AttoMusic
          </div>
          <div class="anuncio-feed-song">${escHtml(cancion.nombre)}</div>
          <div class="anuncio-feed-artist">@${escHtml(cancion.usuario)} ${badgesHtml}</div>
          ${cancion.genero
            ? `<div class="anuncio-feed-genre"><i class="bi bi-tag-fill"></i> ${escHtml(cancion.genero)}</div>`
            : ''}
          <div class="anuncio-feed-stats">
            <span><i class="bi bi-heart-fill" style="color:#ff4d6d"></i> ${cancion.likes || 0}</span>
            <span><i class="bi bi-chat-fill"></i> ${cancion.comentarios || 0}</span>
          </div>
          <button class="anuncio-feed-btn"><i class="bi bi-play-fill"></i> Escuchar</button>
        </div>
      </div>
    `;

    const navegarArtistas = () => {
      if (window.loadPage) window.loadPage('canciones-artistas.html');
      else window.location.href = 'canciones-artistas.html';
    };

    div.addEventListener('click', (e) => {
      if (!e.target.closest('.anuncio-feed-btn')) navegarArtistas();
    });
    div.querySelector('.anuncio-feed-btn').addEventListener('click', navegarArtistas);

    return div;
  }

  // ── Insertar anuncios que faltan en el feed ──
  function insertarAnunciosSiFaltan() {
    if (!anunciosPool.length) return;

    // No insertar durante búsqueda activa
    const inputBusqueda = document.getElementById('inputBuscador');
    if (inputBusqueda && inputBusqueda.value.trim().length > 0) return;

    const feed = document.getElementById('feedPublicaciones');
    if (!feed) return;

    const pubs = Array.from(feed.querySelectorAll('article.publicacion-item'));
    const anunciosActuales = feed.querySelectorAll('.anuncio-feed').length;
    const anunciosDeseados = Math.floor(pubs.length / ANUNCIO_CADA);

    for (let i = anunciosActuales; i < anunciosDeseados; i++) {
      const posicion = (i + 1) * ANUNCIO_CADA - 1; // tras la pub N*4
      if (posicion < pubs.length) {
        const cancion = anunciosPool[i % anunciosPool.length];
        const card = crearAnuncioFeed(cancion);
        pubs[posicion].insertAdjacentElement('afterend', card);
      }
    }
  }

  // ── Observer: detectar nuevas publicaciones ──
  function observarFeedParaAnuncios() {
    const feed = document.getElementById('feedPublicaciones');
    if (!feed) return;

    if (_observerAnuncios) _observerAnuncios.disconnect();

    _observerAnuncios = new MutationObserver((mutations) => {
      const hayNuevasPubs = mutations.some(m =>
        Array.from(m.addedNodes).some(n =>
          n.nodeType === 1 && n.tagName === 'ARTICLE' && !n.classList.contains('anuncio-feed')
        )
      );
      if (hayNuevasPubs) insertarAnunciosSiFaltan();
    });

    _observerAnuncios.observe(feed, { childList: true });
  }

  // ── Cargar canciones de artistas y preparar pool de anuncios ──
  async function cargarAnunciosCanciones() {
    // VIP no ve anuncios
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        if (usuario && usuario.correo) {
          const vipRes = await fetch(`/api/vip/estado?correo=${encodeURIComponent(usuario.correo)}`);
          if (vipRes.ok) {
            const vipData = await vipRes.json();
            if (vipData.es_vip || vipData.es_admin) return;
          }
        }
      } catch { /* silencioso */ }
    }

    try {
      const res = await fetch('/api/canciones-artista?page=1');
      if (!res.ok) return;
      const canciones = await res.json();
      if (!Array.isArray(canciones) || canciones.length === 0) return;

      anunciosPool = canciones;
      observarFeedParaAnuncios();
      // Insertar en los que ya están en el feed al iniciar
      insertarAnunciosSiFaltan();
    } catch { /* silencioso */ }
  }

  // ── Inicialización de la página ──
  function initBienvenido() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#titulo-noticias', 'Últimas Publicaciones');
    }

    cargarAnunciosCanciones();

    const inputBuscador = document.getElementById('inputBuscador');
    const btnLimpiar    = document.getElementById('btnLimpiar');
    const iconSearch    = document.getElementById('lordIconSearch');

    if (!inputBuscador) return;

    let timeoutBusqueda = null;

    if (iconSearch) {
      iconSearch.addEventListener('click', () => {
        const query = inputBuscador.value.trim();
        if (query.length > 0) window.buscarPublicaciones(query);
        else inputBuscador.focus();
      });
    }

    inputBuscador.addEventListener('input', function (e) {
      const query = e.target.value.trim();
      btnLimpiar.style.display = query.length > 0 ? 'block' : 'none';

      // Limpiar anuncios del feed al buscar
      if (query.length === 0) {
        document.querySelectorAll('.anuncio-feed').forEach(a => a.remove());
      }

      clearTimeout(timeoutBusqueda);
      timeoutBusqueda = setTimeout(() => {
        if (query.length > 0) window.buscarPublicaciones(query);
        else window.cargarPublicaciones();
      }, 500);
    });

    btnLimpiar.addEventListener('click', function () {
      inputBuscador.value = '';
      btnLimpiar.style.display = 'none';
      document.querySelectorAll('.anuncio-feed').forEach(a => a.remove());
      window.cargarPublicaciones();
    });

    inputBuscador.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query.length > 0) window.buscarPublicaciones(query);
      }
    });
  }

  window['init_bienvenido'] = initBienvenido;
  initBienvenido();
})();
