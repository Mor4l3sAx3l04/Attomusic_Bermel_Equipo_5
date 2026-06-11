// js/pages/eventos-init.js

(function () {
  'use strict';

  let _pagina = 1;
  let _cargando = false;
  let _finDatos = false;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function esPasado(fechaStr) {
    if (!fechaStr) return false;
    return new Date(fechaStr) < new Date();
  }

  function irAPaginaArtista(idUsuario) {
    if (window.loadPage) {
      window.loadPage('pagina-artista.html?id=' + idUsuario);
    } else {
      window.location.href = 'pagina-artista.html?id=' + idUsuario;
    }
  }

  function renderEventos(eventos) {
    const container = document.getElementById('eventos-container');
    if (!container) return;

    eventos.forEach(ev => {
      const pasado = esPasado(ev.fecha_evento);
      const nombreArtista = ev.nombre_artistico || ev.usuario || 'Artista';
      const inicialAvatar = nombreArtista.charAt(0).toUpperCase();

      const avatarHtml = ev.foto
        ? `<img class="evento-avatar" src="${escapeHtml(ev.foto)}" alt="${escapeHtml(nombreArtista)}">`
        : `<div class="evento-avatar-placeholder">${inicialAvatar}</div>`;

      const card = document.createElement('div');
      card.className = 'evento-card fade-in';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Ver página de ${escapeHtml(nombreArtista)}`);
      card.innerHTML = `
        ${ev.imagen_url ? `<div class="evento-card-imagen"><img src="${escapeHtml(ev.imagen_url)}" alt="${escapeHtml(ev.titulo)}"></div>` : ''}
        <div class="evento-card-artista">
          ${avatarHtml}
          <div class="evento-artista-info">
            <div class="evento-artista-nombre">${escapeHtml(nombreArtista)}</div>
            <div class="evento-artista-usuario">@${escapeHtml(ev.usuario)}</div>
          </div>
          <span class="evento-ir-btn"><i class="bi bi-box-arrow-up-right"></i> Ver artista</span>
        </div>
        <div class="evento-card-body">
          <h3 class="evento-titulo">
            ${escapeHtml(ev.titulo)}
            ${pasado ? '<span class="evento-badge-pasado">Pasado</span>' : ''}
          </h3>
          ${ev.descripcion ? `<p class="evento-descripcion">${escapeHtml(ev.descripcion)}</p>` : ''}
          <div class="evento-meta">
            <span class="evento-meta-item"><i class="bi bi-calendar3"></i>${formatFecha(ev.fecha_evento)}</span>
            ${ev.horario_fin ? `<span class="evento-meta-item"><i class="bi bi-clock"></i>Hasta: ${formatFecha(ev.horario_fin)}</span>` : ''}
            ${ev.direccion ? `<span class="evento-meta-item"><i class="bi bi-geo-alt-fill"></i>${escapeHtml(ev.direccion)}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => irAPaginaArtista(ev.id_usuario));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') irAPaginaArtista(ev.id_usuario); });
      container.appendChild(card);
    });
  }

  async function cargarEventos() {
    if (_cargando || _finDatos) return;
    _cargando = true;

    const spinner = document.getElementById('eventos-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
      const res = await fetch(`/api/eventos?page=${_pagina}`);
      if (!res.ok) throw new Error('Error ' + res.status);
      const datos = await res.json();

      if (spinner) spinner.style.display = 'none';

      if (_pagina === 1 && datos.length === 0) {
        const vacio = document.getElementById('eventos-vacio');
        if (vacio) vacio.style.display = 'block';
        _finDatos = true;
        _cargando = false;
        return;
      }

      renderEventos(datos);
      _pagina++;

      if (datos.length < 20) {
        _finDatos = true;
        const fin = document.getElementById('eventos-fin');
        if (fin) fin.style.display = 'block';
      }
    } catch (err) {
      console.error('Error cargando eventos:', err);
      if (spinner) spinner.style.display = 'none';
    }

    _cargando = false;
  }

  function onScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
      cargarEventos();
    }
  }

  function init() {
    _pagina = 1;
    _cargando = false;
    _finDatos = false;

    const container = document.getElementById('eventos-container');
    if (container) container.innerHTML = '';
    const vacio = document.getElementById('eventos-vacio');
    if (vacio) vacio.style.display = 'none';
    const fin = document.getElementById('eventos-fin');
    if (fin) fin.style.display = 'none';

    cargarEventos();
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll);
  }

  window['init_eventos-init'] = init;
  init();
})();
