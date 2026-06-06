// sidebar-anuncios.js — Carga y renderiza anuncios de artistas AttoElite

(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Comprueba si el usuario tiene algún plan activo (VIP o Elite)
  // Se llama DESPUÉS del fetch para dar tiempo a actualizarInterfaz()
  function esPremium() {
    return sessionStorage.getItem('es_vip') === 'true';
  }

  function crearTarjetaAnuncio(artista) {
    const div = document.createElement('div');
    div.className = 'anuncio-artista-card';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');

    const generos = Array.isArray(artista.generos) ? artista.generos.slice(0, 3) : [];
    const generosHtml = generos.map(g =>
      `<span class="anuncio-genero-chip">${escapeHtml(g)}</span>`
    ).join('');

    const avatarHtml = artista.imagen_portada
      ? `<img src="${escapeHtml(artista.imagen_portada)}" class="anuncio-card-cover" alt="${escapeHtml(artista.nombre_artistico)}">`
      : artista.foto
        ? `<img src="${escapeHtml(artista.foto)}" class="anuncio-card-cover" alt="${escapeHtml(artista.nombre_artistico)}">`
        : `<div class="anuncio-card-cover-placeholder">🎵</div>`;

    div.innerHTML = `
      <span class="anuncio-elite-tag"><i class="bi bi-gem"></i> Elite</span>
      <div class="anuncio-card-header">
        ${avatarHtml}
        <div class="anuncio-card-info">
          <h4>${escapeHtml(artista.nombre_artistico)}</h4>
          <p class="anuncio-usuario">@${escapeHtml(artista.usuario)}</p>
        </div>
      </div>
      ${generosHtml ? `<div class="anuncio-card-generos">${generosHtml}</div>` : ''}
      <div class="anuncio-card-footer">
        <button class="btn-ver-pagina-artista">
          <i class="bi bi-person-lines-fill"></i> Ver página
        </button>
      </div>
    `;

    const accion = () => {
      if (window.loadPage) window.loadPage(`pagina-artista.html?id=${artista.id_usuario}`);
      else window.location.href = `pagina-artista.html?id=${artista.id_usuario}`;
    };

    div.addEventListener('click', accion);
    div.addEventListener('keypress', (e) => { if (e.key === 'Enter') accion(); });

    return div;
  }

  // Oculta la columna sidebar para que el feed tome todo el ancho
  function ocultarSidebar() {
    const wrap = document.getElementById('sidebar-artistas-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  async function cargarAnunciosArtistas(contenedorId, wrapId, modo) {
    try {
      const res = await fetch('/api/pagina-artista/anuncios');
      if (!res.ok) return;
      const artistas = await res.json();

      // Check premium DESPUÉS del fetch — para este momento actualizarInterfaz() ya habrá terminado
      if (esPremium()) {
        ocultarSidebar();
        return;
      }

      if (!Array.isArray(artistas) || artistas.length === 0) return;

      const contenedor = document.getElementById(contenedorId || 'sidebar-anuncios-artistas');
      if (!contenedor) return;

      contenedor.innerHTML = '';

      // Título solo en el sidebar vertical
      if (!modo || modo === 'sidebar') {
        const titulo = document.createElement('div');
        titulo.className = 'sidebar-anuncios-titulo';
        titulo.innerHTML = '<i class="bi bi-gem"></i> Artistas Destacados';
        contenedor.appendChild(titulo);
      }

      artistas.forEach(artista => {
        contenedor.appendChild(crearTarjetaAnuncio(artista));
      });

      // Mostrar el contenedor padre si corresponde
      const sidebarWrap = document.getElementById('sidebar-artistas-wrap');
      if (sidebarWrap) sidebarWrap.style.display = '';

      if (wrapId) {
        const wrap = document.getElementById(wrapId);
        if (wrap) wrap.style.display = 'block';
      }
    } catch {
      // Silencioso — los anuncios son opcionales
    }
  }

  function crearTarjetaMercancia(prod) {
    const div = document.createElement('div');
    div.className = 'anuncio-merch-card';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');

    const z = prod.imagen_zoom || 1;
    const ox = prod.imagen_offset_x || 0;
    const oy = prod.imagen_offset_y || 0;

    const imgHtml = prod.imagen
      ? `<img src="${escapeHtml(prod.imagen)}" class="anuncio-merch-img"
              style="transform:scale(${z}) translate(${ox}%,${oy}%);transform-origin:center;" alt="">`
      : `<div class="anuncio-merch-img-placeholder">🛍️</div>`;

    div.innerHTML = `
      ${imgHtml}
      <div class="anuncio-merch-body">
        <p class="anuncio-merch-nombre">${escapeHtml(prod.nombre)}</p>
        <p class="anuncio-merch-precio">$${parseFloat(prod.precio).toFixed(2)}</p>
        ${!prod.es_admin && prod.nombre_artistico ? `<p class="anuncio-merch-artista">por ${escapeHtml(prod.nombre_artistico)}</p>` : ''}
      </div>
    `;

    const accion = () => {
      if (prod.id_usuario) {
        if (window.loadPage) window.loadPage(`pagina-artista.html?id=${prod.id_usuario}&tab=mercancia`);
        else window.location.href = `pagina-artista.html?id=${prod.id_usuario}&tab=mercancia`;
      }
    };
    div.addEventListener('click', accion);
    div.addEventListener('keypress', (e) => { if (e.key === 'Enter') accion(); });

    return div;
  }

  async function cargarAnunciosMercancia(contenedorId) {
    try {
      const res = await fetch('/api/mercancia/anuncios');
      if (!res.ok) return;
      const productos = await res.json();
      if (!Array.isArray(productos) || productos.length === 0) return;

      const contenedor = document.getElementById(contenedorId || 'sidebar-anuncios-artistas');
      if (!contenedor) return;

      const titulo = document.createElement('div');
      titulo.className = 'sidebar-merch-titulo';
      titulo.innerHTML = '<i class="bi bi-bag-fill"></i> Mercancía';
      contenedor.appendChild(titulo);

      productos.forEach(prod => {
        contenedor.appendChild(crearTarjetaMercancia(prod));
      });
    } catch {
      // Silencioso
    }
  }

  // Auto-inicializar en bienvenido.html (sidebar vertical)
  function init() {
    const contenedor = document.getElementById('sidebar-anuncios-artistas');
    if (!contenedor) return;
    // Sin delay extra — el check de premium ocurre dentro de cargarAnunciosArtistas
    // después del fetch, lo que garantiza que actualizarInterfaz() ya terminó
    cargarAnunciosArtistas('sidebar-anuncios-artistas', null, 'sidebar');
    cargarAnunciosMercancia('sidebar-anuncios-artistas');
  }

  window.cargarAnunciosArtistas = cargarAnunciosArtistas;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})();
