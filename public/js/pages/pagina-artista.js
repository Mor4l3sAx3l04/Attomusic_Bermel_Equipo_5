// js/pages/pagina-artista.js — Lógica completa de la página de artista AttoElite

(function () {
  'use strict';

  // ──── Estado global de la página ────
  let _idArtista = null;
  let _paginaData = null;
  let _esOwner = false;
  let _tabActual = 'canciones';
  let _mapaEvento = null;
  let _mapaMarker = null;
  let _mapasMini = {};
  let _portadaPaginaBase64 = null;
  let _portadaAlbumBase64 = null;
  let _generosSeleccionados = [];
  let _cancionesArtista = [];
  let _listenersOk = false; // evitar duplicar event listeners

  const GENEROS_DISPONIBLES = [
    'Rock', 'Pop', 'Reggaeton', 'Hip-Hop', 'Trap', 'R&B', 'Jazz',
    'Clásica', 'Electrónica', 'Metal', 'Indie', 'Folk', 'Cumbia',
    'Salsa', 'Bachata', 'Vallenato', 'Regional Mexicano', 'K-Pop', 'Otro'
  ];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatFechaCorta(fechaStr) {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getUsuarioActual() {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  }

  function toast(msg, tipo) {
    if (window.mostrarToast) window.mostrarToast(msg, tipo);
    else if (window.showToast) window.showToast(msg, tipo);
    else console.warn('[toast]', msg);
  }

  // ──── Obtener ID del artista de la URL ────
  function getIdArtista() {
    if (window._paginaArtistaId) return window._paginaArtistaId;
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  // ──── Renderizar badges ────
  function renderBadges(data) {
    const tipoPlan = data.rol === 'admin' ? 'attoelite' : (data.tipo_plan || null);
    const esElite = tipoPlan === 'attoelite';
    const esVip = data.es_vip || data.rol === 'admin';
    const TITULOS = { 1: 'Rey de la Música', 2: 'Príncipe de la Música', 3: 'Caballero de la Música' };
    let html = '';
    if (data.posicion_ranking && TITULOS[data.posicion_ranking]) {
      html += `<span class="titulo-real titulo-real-${data.posicion_ranking}">${TITULOS[data.posicion_ranking]}</span>`;
    }
    if (esElite) {
      html += `<span class="badge-elite-small"><i class="bi bi-gem"></i> AttoElite</span>`;
    } else if (esVip) {
      html += `<span class="badge-vip-small"><i class="bi bi-crown-fill"></i> AttoPlus</span>`;
    }
    if (data.insignia_artista) {
      html += `<span class="badge-artista-small"><i class="bi bi-music-note"></i> Artista</span>`;
    }
    return html;
  }

  // ──── Renderizar página completa del artista ────
  function renderPagina(data) {
    _paginaData = data;
    const root = document.getElementById('artista-page-root');

    const generosHtml = Array.isArray(data.generos) && data.generos.length > 0
      ? data.generos.map(g => `<span class="artista-genero-chip">${escapeHtml(g)}</span>`).join('')
      : '';

    const coverBg = data.imagen_portada || data.fondo_perfil || '';
    const coverHtml = coverBg
      ? `<img src="${escapeHtml(coverBg)}" class="artista-cover-img" alt="Portada">`
      : `<div class="artista-cover-img" style="background:linear-gradient(135deg,#1a0a2e,#0f0f1f);"></div>`;

    const avatarHtml = data.foto
      ? `<img src="${escapeHtml(data.foto)}" class="artista-avatar" alt="${escapeHtml(data.nombre_artistico)}">`
      : `<div class="artista-avatar-placeholder">${(data.nombre_artistico || 'A').charAt(0)}</div>`;

    const adminBar = _esOwner ? `
      <div class="artista-admin-bar">
        <button class="btn-elite-action" id="btn-editar-pagina"><i class="bi bi-pencil-fill"></i> Editar página</button>
        <button class="btn-elite-action" id="btn-nuevo-album"><i class="bi bi-collection-play-fill"></i> Nuevo álbum</button>
        <button class="btn-elite-action" id="btn-nuevo-evento"><i class="bi bi-calendar-plus-fill"></i> Nuevo evento</button>
        <button class="btn-elite-action" id="btn-nuevo-merch"><i class="bi bi-bag-plus-fill"></i> Nuevo producto</button>
      </div>` : '';

    root.innerHTML = `
      <div class="artista-page-card">
        <!-- Cover -->
        <div class="artista-cover-wrap">
          ${coverHtml}
          <div class="artista-cover-overlay"></div>
        </div>

        <!-- Info flotante -->
        <div class="artista-info-flotante">
          <div class="artista-avatar-wrap">${avatarHtml}</div>
          <div class="artista-datos">
            <h1 class="artista-nombre-artistico">${escapeHtml(data.nombre_artistico)}</h1>
            <p class="artista-usuario-real">@${escapeHtml(data.usuario)}</p>
            <div class="artista-badges-row">${renderBadges(data)}</div>
            <div class="artista-stats-row">
              <div class="artista-stat">
                <span class="artista-stat-num">${data.seguidores || 0}</span>
                <span class="artista-stat-label">Seguidores</span>
              </div>
              <div class="artista-stat">
                <span class="artista-stat-num">${data.num_canciones || 0}</span>
                <span class="artista-stat-label">Canciones</span>
              </div>
              <div class="artista-stat">
                <span class="artista-stat-num">${data.num_albums || 0}</span>
                <span class="artista-stat-label">Álbumes</span>
              </div>
              <div class="artista-stat">
                <span class="artista-stat-num">${data.num_eventos || 0}</span>
                <span class="artista-stat-label">Eventos</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bio y géneros -->
        ${data.descripcion ? `<p class="artista-bio">${escapeHtml(data.descripcion)}</p>` : ''}
        ${generosHtml ? `<div class="artista-generos-wrap">${generosHtml}</div>` : ''}

        ${adminBar}

        <!-- Tabs -->
        <ul class="artista-tabs">
          <li><button class="artista-tab-btn activo" data-tab="canciones"><i class="bi bi-music-note-list"></i> Canciones</button></li>
          <li><button class="artista-tab-btn" data-tab="albums"><i class="bi bi-collection-play"></i> Álbumes</button></li>
          <li><button class="artista-tab-btn" data-tab="eventos"><i class="bi bi-calendar-event"></i> Eventos</button></li>
          <li><button class="artista-tab-btn" data-tab="mercancia"><i class="bi bi-bag-fill"></i> Mercancía</button></li>
        </ul>

        <!-- Tab: Canciones -->
        <div class="artista-tab-content activo" id="tab-canciones">
          <div id="lista-canciones"><p class="text-muted text-center py-3">Cargando canciones...</p></div>
        </div>

        <!-- Tab: Álbumes -->
        <div class="artista-tab-content" id="tab-albums">
          <div id="lista-albums"><p class="text-muted text-center py-3">Cargando álbumes...</p></div>
        </div>

        <!-- Tab: Eventos -->
        <div class="artista-tab-content" id="tab-eventos">
          <div id="lista-eventos"><p class="text-muted text-center py-3">Cargando eventos...</p></div>
        </div>

        <!-- Tab: Mercancía -->
        <div class="artista-tab-content" id="tab-mercancia">
          <div id="lista-mercancia"><p class="text-muted text-center py-3">Cargando mercancía...</p></div>
        </div>
      </div>
    `;

    // Eventos de tabs
    root.querySelectorAll('.artista-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
    });

    // Eventos admin
    if (_esOwner) {
      document.getElementById('btn-editar-pagina')?.addEventListener('click', abrirModalEditarPagina);
      document.getElementById('btn-nuevo-album')?.addEventListener('click', () => abrirModalAlbum(null));
      document.getElementById('btn-nuevo-evento')?.addEventListener('click', () => abrirModalEvento(null));
      document.getElementById('btn-nuevo-merch')?.addEventListener('click', () => abrirModalMercancia(null));
    }

    // Auto-switch de tab si viene ?tab=... en la URL
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam && ['canciones','albums','eventos','mercancia'].includes(tabParam)) {
      setTimeout(() => cambiarTab(tabParam), 50);
    } else {
      cargarCanciones();
    }
  }

  function cambiarTab(tab) {
    _tabActual = tab;
    document.querySelectorAll('.artista-tab-btn').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));
    document.querySelectorAll('.artista-tab-content').forEach(c => c.classList.toggle('activo', c.id === `tab-${tab}`));

    if (tab === 'canciones') cargarCanciones();
    else if (tab === 'albums') cargarAlbums();
    else if (tab === 'eventos') cargarEventos();
    else if (tab === 'mercancia') cargarMercancia();
  }

  // ──── TAB CANCIONES ────
  async function cargarCanciones() {
    const lista = document.getElementById('lista-canciones');
    if (!lista) return;
    lista.innerHTML = '<p class="text-muted text-center py-3">Cargando...</p>';
    try {
      const res = await fetch(`/api/canciones-artista/usuario/${_idArtista}`);
      _cancionesArtista = await res.json();
      if (!Array.isArray(_cancionesArtista) || _cancionesArtista.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center py-4">No hay canciones publicadas aún.</p>';
        return;
      }
      lista.innerHTML = '';
      _cancionesArtista.forEach((c, idx) => {
        const item = document.createElement('div');
        item.className = 'artista-cancion-item';
        const coverHtml = c.imagen_url
          ? `<img src="${escapeHtml(c.imagen_url)}" class="artista-cancion-cover" alt="${escapeHtml(c.nombre)}">`
          : `<div class="artista-cancion-cover-placeholder">🎵</div>`;
        item.innerHTML = `
          <span class="artista-cancion-num">${idx + 1}</span>
          ${coverHtml}
          <div class="artista-cancion-info">
            <p class="artista-cancion-nombre">${escapeHtml(c.nombre)}</p>
            <p class="artista-cancion-genero">${escapeHtml(c.genero || '')}</p>
          </div>
          <button class="btn-play-elite" data-id="${c.id_cancion}" title="Reproducir">▶</button>
          <audio data-audio-id="${c.id_cancion}" preload="none" style="display:none;" controls></audio>
        `;
        const btnPlay = item.querySelector('.btn-play-elite');
        btnPlay.addEventListener('click', () => toggleAudioArtista(c.id_cancion, btnPlay, item.querySelector('audio')));
        lista.appendChild(item);
      });
    } catch (err) {
      lista.innerHTML = '<p class="text-danger text-center py-3">Error cargando canciones.</p>';
    }
  }

  // ──── Estado mercancía ────
  let _merchImgBase64 = null;
  let _merchZoom = 1.0;
  let _merchOffsetX = 0;
  let _merchOffsetY = 0;
  let _merchantDragging = false;
  let _merchantDragStart = null;

  let _audioActual = null;
  let _btnAudioActual = null;

  async function toggleAudioArtista(idCancion, btn, audio) {
    if (_audioActual && _audioActual !== audio) {
      _audioActual.pause();
      _audioActual.style.display = 'none';
      if (_btnAudioActual) _btnAudioActual.textContent = '▶';
    }
    if (!audio.src || audio.src === window.location.href) {
      btn.textContent = '⏳';
      btn.disabled = true;
      try {
        const res = await fetch(`/api/canciones-artista/${idCancion}/audio`);
        const data = await res.json();
        if (!data.audio_data) { btn.textContent = '✗'; return; }
        audio.src = data.audio_data;
      } catch { btn.textContent = '✗'; return; }
      btn.disabled = false;
    }
    audio.style.display = 'block';
    audio.play();
    btn.textContent = '⏸';
    _audioActual = audio;
    _btnAudioActual = btn;
    audio.onpause = audio.onended = () => { btn.textContent = '▶'; };
  }

  // ──── TAB ÁLBUMES ────
  async function cargarAlbums() {
    const lista = document.getElementById('lista-albums');
    if (!lista) return;
    lista.innerHTML = '<p class="text-muted text-center py-3">Cargando...</p>';
    try {
      const res = await fetch(`/api/albums/usuario/${_idArtista}`);
      const albums = await res.json();
      if (!Array.isArray(albums) || albums.length === 0) {
        lista.innerHTML = `<p class="text-muted text-center py-4">No hay álbumes creados aún.${_esOwner ? ' <br><button class="btn-elite-action mt-2" onclick="document.getElementById(\'btn-nuevo-album\').click()"><i class=\'bi bi-plus-lg\'></i> Crear primer álbum</button>' : ''}</p>`;
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'artista-albums-grid';
      albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card-elite';
        const coverHtml = album.imagen_portada
          ? `<img src="${escapeHtml(album.imagen_portada)}" class="album-card-cover" alt="${escapeHtml(album.nombre)}">`
          : `<div class="album-card-cover-placeholder">💿</div>`;
        card.innerHTML = `
          ${coverHtml}
          <div class="album-card-info">
            <p class="album-card-nombre">${escapeHtml(album.nombre)}</p>
            <p class="album-card-canciones">${album.num_canciones || 0} canciones</p>
            ${_esOwner ? `
              <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn-elite-action-outline" style="padding:3px 10px;font-size:0.7rem;" data-album-id="${album.id_album}" data-accion="editar"><i class="bi bi-pencil"></i></button>
                <button class="btn-elite-action-outline" style="padding:3px 10px;font-size:0.7rem;color:#ff4d6d;border-color:#ff4d6d;" data-album-id="${album.id_album}" data-accion="eliminar"><i class="bi bi-trash"></i></button>
              </div>` : ''}
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('[data-accion]')) return;
          verAlbum(album);
        });
        card.querySelectorAll('[data-accion]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.accion === 'editar') abrirModalAlbum(album);
            else eliminarAlbum(album.id_album);
          });
        });
        grid.appendChild(card);
      });
      lista.innerHTML = '';
      lista.appendChild(grid);
    } catch (err) {
      lista.innerHTML = '<p class="text-danger text-center py-3">Error cargando álbumes.</p>';
    }
  }

  async function verAlbum(album) {
    document.getElementById('tituloVerAlbum').textContent = album.nombre;
    const contenedor = document.getElementById('ver-album-canciones');
    contenedor.innerHTML = '<p class="text-center py-2">Cargando...</p>';
    const modal = new bootstrap.Modal(document.getElementById('modalVerAlbum'));
    modal.show();
    try {
      const res = await fetch(`/api/albums/${album.id_album}/canciones`);
      const canciones = await res.json();
      if (!Array.isArray(canciones) || canciones.length === 0) {
        contenedor.innerHTML = '<p class="text-center py-2" style="color:rgba(255,255,255,0.5)">Este álbum aún no tiene canciones.</p>';
        return;
      }
      contenedor.innerHTML = '';
      canciones.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'cancion-album-item';
        div.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:rgba(255,255,255,0.4);font-size:0.8rem;width:20px;">${i+1}</span>
            ${c.imagen_url ? `<img src="${escapeHtml(c.imagen_url)}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">` : '<div style="width:36px;height:36px;border-radius:6px;background:rgba(255,165,0,0.15);display:flex;align-items:center;justify-content:center;">🎵</div>'}
            <div>
              <p style="margin:0;font-size:0.88rem;font-weight:600;">${escapeHtml(c.nombre)}</p>
              <p style="margin:0;font-size:0.72rem;color:rgba(255,255,255,0.45);">${escapeHtml(c.genero || '')}</p>
            </div>
          </div>
        `;
        contenedor.appendChild(div);
      });
    } catch { contenedor.innerHTML = '<p class="text-danger text-center py-2">Error cargando canciones.</p>'; }
  }

  // ──── TAB EVENTOS ────
  async function cargarEventos() {
    const lista = document.getElementById('lista-eventos');
    if (!lista) return;
    lista.innerHTML = '<p class="text-muted text-center py-3">Cargando...</p>';
    try {
      const res = await fetch(`/api/eventos/usuario/${_idArtista}`);
      const eventos = await res.json();
      if (!Array.isArray(eventos) || eventos.length === 0) {
        lista.innerHTML = `<p class="text-muted text-center py-4">No hay eventos próximos.</p>`;
        return;
      }
      lista.innerHTML = '';
      const ahora = new Date();
      eventos.forEach(ev => {
        const fechaEvento = new Date(ev.fecha_evento);
        const pasado = fechaEvento < ahora;
        const card = document.createElement('div');
        card.className = 'evento-card-elite';
        if (pasado) card.style.opacity = '0.6';
        const mapId = `mapa-ev-${ev.id_evento}`;
        card.innerHTML = `
          <div class="evento-fecha-badge">
            <i class="bi bi-calendar3"></i> ${formatFechaCorta(ev.fecha_evento)}
            ${pasado ? ' <span style="opacity:0.7">(Pasado)</span>' : ''}
          </div>
          <h3 class="evento-titulo">${escapeHtml(ev.titulo)}</h3>
          ${ev.descripcion ? `<p class="evento-descripcion">${escapeHtml(ev.descripcion)}</p>` : ''}
          <p class="evento-direccion"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(ev.direccion)}</p>
          ${ev.latitud && ev.longitud ? `<div id="${mapId}" class="evento-mapa-mini"></div>` : ''}
          ${_esOwner ? `
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="btn-elite-action-outline" style="padding:4px 12px;font-size:0.78rem;" data-ev-id="${ev.id_evento}" data-accion="editar"><i class="bi bi-pencil"></i> Editar</button>
              <button class="btn-elite-action-outline" style="padding:4px 12px;font-size:0.78rem;color:#ff4d6d;border-color:#ff4d6d;" data-ev-id="${ev.id_evento}" data-accion="eliminar"><i class="bi bi-trash"></i> Eliminar</button>
            </div>` : ''}
        `;
        card.querySelectorAll('[data-accion]').forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.dataset.accion === 'editar') abrirModalEvento(ev);
            else eliminarEvento(ev.id_evento);
          });
        });
        lista.appendChild(card);

        // Mapa mini con Leaflet
        if (ev.latitud && ev.longitud && window.L) {
          setTimeout(() => {
            if (_mapasMini[ev.id_evento]) return;
            const m = L.map(mapId, { zoomControl: false, scrollWheelZoom: false, dragging: false })
              .setView([ev.latitud, ev.longitud], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(m);
            L.marker([ev.latitud, ev.longitud]).addTo(m);
            _mapasMini[ev.id_evento] = m;
          }, 200);
        }
      });
    } catch (err) {
      lista.innerHTML = '<p class="text-danger text-center py-3">Error cargando eventos.</p>';
    }
  }

  // ──── MODALES ────

  function inicializarGenerosPicker(seleccionados) {
    const picker = document.getElementById('generos-picker');
    if (!picker) return;
    picker.innerHTML = '';
    _generosSeleccionados = seleccionados ? [...seleccionados] : [];
    GENEROS_DISPONIBLES.forEach(g => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'genero-toggle' + (_generosSeleccionados.includes(g) ? ' activo' : '');
      btn.textContent = g;
      btn.addEventListener('click', () => {
        if (_generosSeleccionados.includes(g)) {
          _generosSeleccionados = _generosSeleccionados.filter(x => x !== g);
          btn.classList.remove('activo');
        } else if (_generosSeleccionados.length < 5) {
          _generosSeleccionados.push(g);
          btn.classList.add('activo');
        } else {
          toast('Máximo 5 géneros', 'error');
        }
      });
      picker.appendChild(btn);
    });
  }

  function abrirModalEditarPagina() {
    const data = _paginaData;
    document.getElementById('tituloModalPagina').textContent = data ? 'Editar página de artista' : 'Crear mi página de artista';
    document.getElementById('edit-nombre-artistico').value = data?.nombre_artistico || '';
    document.getElementById('edit-descripcion').value = data?.descripcion || '';
    inicializarGenerosPicker(data?.generos || []);
    _portadaPaginaBase64 = null;
    const preview = document.getElementById('portada-preview-img');
    if (data?.imagen_portada) { preview.src = data.imagen_portada; preview.style.display = 'block'; }
    else { preview.src = ''; preview.style.display = 'none'; }
    new bootstrap.Modal(document.getElementById('modalEditarPagina')).show();
  }

  function adjuntarEventListeners() {
    if (_listenersOk) return; // ya adjuntados, evitar duplicados
    _listenersOk = true;
    // ── Portada de página ──
    document.getElementById('input-portada-pagina')?.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast('La imagen no puede superar 5MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        _portadaPaginaBase64 = e.target.result;
        const preview = document.getElementById('portada-preview-img');
        preview.src = _portadaPaginaBase64;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-guardar-pagina')?.addEventListener('click', async () => {
      const nombre = document.getElementById('edit-nombre-artistico').value.trim();
      const descripcion = document.getElementById('edit-descripcion').value.trim();
      if (!nombre) { toast('El nombre artístico es obligatorio', 'error'); return; }
      const usuario = getUsuarioActual();
      if (!usuario) return;
      const body = { correo: usuario.correo, nombre_artistico: nombre, descripcion, generos: _generosSeleccionados };
      if (_portadaPaginaBase64) body.imagen_portada = _portadaPaginaBase64;
      const metodo = _paginaData ? 'PUT' : 'POST';
      try {
        const res = await fetch('/api/pagina-artista', {
          method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
          toast(data.message || 'Página guardada', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modalEditarPagina'))?.hide();
          iniciarPagina();
        } else { toast(data.error || 'Error guardando página', 'error'); }
      } catch { toast('Error de conexión', 'error'); }
    });

    // ── Portada de álbum ──
    document.getElementById('input-portada-album')?.addEventListener('change', function () {
      const file = this.files[0];
      if (!file || file.size > 5 * 1024 * 1024) { toast('Imagen demasiado grande', 'error'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        _portadaAlbumBase64 = e.target.result;
        const p = document.getElementById('album-portada-preview');
        p.src = _portadaAlbumBase64; p.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-guardar-album')?.addEventListener('click', async () => {
      const nombre = document.getElementById('album-nombre').value.trim();
      const descripcion = document.getElementById('album-descripcion').value.trim();
      const idAlbum = document.getElementById('album-editando-id').value;
      if (!nombre) { toast('El nombre del álbum es obligatorio', 'error'); return; }
      const usuario = getUsuarioActual();
      const body = { correo: usuario.correo, nombre, descripcion };
      if (_portadaAlbumBase64) body.imagen_portada = _portadaAlbumBase64;
      try {
        const url = idAlbum ? `/api/albums/${idAlbum}` : '/api/albums';
        const res = await fetch(url, {
          method: idAlbum ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
          toast(data.message || 'Álbum guardado', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modalAlbum'))?.hide();
          cargarAlbums();
        } else { toast(data.error || 'Error', 'error'); }
      } catch { toast('Error de conexión', 'error'); }
    });

    document.getElementById('btn-guardar-evento')?.addEventListener('click', async () => {
      const titulo = document.getElementById('evento-titulo').value.trim();
      const descripcion = document.getElementById('evento-descripcion').value.trim();
      const fecha_evento = document.getElementById('evento-fecha').value;
      const horario_fin = document.getElementById('evento-hora-fin').value;
      const direccion = document.getElementById('evento-direccion').value.trim();
      const latitud = document.getElementById('evento-lat').value;
      const longitud = document.getElementById('evento-lng').value;
      const idEvento = document.getElementById('evento-editando-id').value;
      if (!titulo) { toast('El título es obligatorio', 'error'); return; }
      if (!fecha_evento) { toast('La fecha es obligatoria', 'error'); return; }
      if (!direccion) { toast('La dirección es obligatoria', 'error'); return; }
      const usuario = getUsuarioActual();
      const body = { correo: usuario.correo, titulo, descripcion, fecha_evento, direccion };
      if (horario_fin) body.horario_fin = horario_fin;
      if (latitud) body.latitud = parseFloat(latitud);
      if (longitud) body.longitud = parseFloat(longitud);
      try {
        const url = idEvento ? `/api/eventos/${idEvento}` : '/api/eventos';
        const res = await fetch(url, {
          method: idEvento ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
          toast(data.message || 'Evento guardado', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modalEvento'))?.hide();
          cargarEventos();
        } else { toast(data.error || 'Error', 'error'); }
      } catch { toast('Error de conexión', 'error'); }
    });

    document.getElementById('modalEvento')?.addEventListener('hidden.bs.modal', () => {
      if (_mapaEvento) { _mapaEvento.remove(); _mapaEvento = null; _mapaMarker = null; }
    });

    // ── Imagen de mercancía ──
    document.getElementById('input-merch-imagen')?.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast('La imagen no puede superar 5MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        _merchImgBase64 = e.target.result;
        const preview = document.getElementById('merch-img-preview');
        const placeholder = document.getElementById('merch-img-placeholder');
        const zoomRow = document.getElementById('merch-zoom-row');
        const quitarBtn = document.getElementById('btn-merch-quitar-img');
        preview.src = _merchImgBase64;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        zoomRow.style.display = 'flex';
        quitarBtn.style.display = '';
        _merchZoom = 1.0; _merchOffsetX = 0; _merchOffsetY = 0;
        document.getElementById('merch-zoom-slider').value = 1;
        aplicarTransformMerch();
      };
      reader.readAsDataURL(file);
    });

    // Quitar imagen
    document.getElementById('btn-merch-quitar-img')?.addEventListener('click', () => {
      _merchImgBase64 = null;
      const preview = document.getElementById('merch-img-preview');
      const placeholder = document.getElementById('merch-img-placeholder');
      preview.src = ''; preview.style.display = 'none';
      placeholder.style.display = '';
      document.getElementById('merch-zoom-row').style.display = 'none';
      document.getElementById('btn-merch-quitar-img').style.display = 'none';
    });

    // Slider zoom
    document.getElementById('merch-zoom-slider')?.addEventListener('input', function () {
      _merchZoom = parseFloat(this.value);
      aplicarTransformMerch();
    });

    // Drag para pan en el preview de imagen
    const previewWrap = document.getElementById('merch-img-preview-wrap');
    if (previewWrap) {
      previewWrap.addEventListener('mousedown', (e) => {
        if (!_merchImgBase64) return;
        _merchantDragging = true;
        _merchantDragStart = { x: e.clientX, y: e.clientY, ox: _merchOffsetX, oy: _merchOffsetY };
        previewWrap.classList.add('arrastrando');
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => {
        if (!_merchantDragging || !_merchantDragStart) return;
        const dx = (e.clientX - _merchantDragStart.x) / (previewWrap.offsetWidth || 300) * 100;
        const dy = (e.clientY - _merchantDragStart.y) / (previewWrap.offsetHeight || 200) * 100;
        _merchOffsetX = Math.max(-50, Math.min(50, _merchantDragStart.ox + dx / _merchZoom));
        _merchOffsetY = Math.max(-50, Math.min(50, _merchantDragStart.oy + dy / _merchZoom));
        aplicarTransformMerch();
      });
      window.addEventListener('mouseup', () => {
        _merchantDragging = false;
        previewWrap?.classList.remove('arrastrando');
      });
    }

    // Guardar mercancía
    document.getElementById('btn-guardar-merch')?.addEventListener('click', async () => {
      const nombre = document.getElementById('merch-nombre').value.trim();
      const descripcion = document.getElementById('merch-descripcion').value.trim();
      const precio = document.getElementById('merch-precio').value;
      const stock = document.getElementById('merch-stock').value;
      const idMerch = document.getElementById('merch-editando-id').value;

      if (!nombre) { toast('El nombre del producto es obligatorio', 'error'); return; }
      if (!precio || parseFloat(precio) <= 0) { toast('El precio debe ser mayor a 0', 'error'); return; }

      const usuario = getUsuarioActual();
      if (!usuario) return;

      const body = {
        correo: usuario.correo,
        nombre, descripcion, precio: parseFloat(precio),
        stock: parseInt(stock, 10) || 0,
        imagen_zoom: _merchZoom,
        imagen_offset_x: _merchOffsetX,
        imagen_offset_y: _merchOffsetY
      };

      if (_merchImgBase64 !== null) body.imagen = _merchImgBase64;

      try {
        const url = idMerch ? `/api/mercancia/${idMerch}` : '/api/mercancia';
        const res = await fetch(url, {
          method: idMerch ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
          toast(data.message || 'Producto guardado', 'success');
          bootstrap.Modal.getInstance(document.getElementById('modalMercancia'))?.hide();
          cargarMercancia();
        } else { toast(data.error || 'Error guardando producto', 'error'); }
      } catch { toast('Error de conexión', 'error'); }
    });
  }

  // ── Modal Álbum ──
  function abrirModalAlbum(album) {
    document.getElementById('tituloModalAlbum').textContent = album ? 'Editar álbum' : 'Nuevo álbum';
    document.getElementById('album-editando-id').value = album?.id_album || '';
    document.getElementById('album-nombre').value = album?.nombre || '';
    document.getElementById('album-descripcion').value = album?.descripcion || '';
    _portadaAlbumBase64 = null;
    const preview = document.getElementById('album-portada-preview');
    if (album?.imagen_portada) { preview.src = album.imagen_portada; preview.style.display = 'block'; }
    else { preview.src = ''; preview.style.display = 'none'; }

    // Cargar canciones del artista para poder añadir/quitar del álbum
    renderCancionesParaAlbum(album?.id_album || null);
    new bootstrap.Modal(document.getElementById('modalAlbum')).show();
  }

  async function renderCancionesParaAlbum(idAlbum) {
    const lista = document.getElementById('album-canciones-lista');
    if (!lista) return;
    let enAlbum = [];
    if (idAlbum) {
      try {
        const r = await fetch(`/api/albums/${idAlbum}/canciones`);
        const d = await r.json();
        if (Array.isArray(d)) enAlbum = d.map(c => c.id_cancion);
      } catch {}
    }
    lista.innerHTML = '';
    if (!_cancionesArtista.length) {
      lista.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:0.8rem;text-align:center;padding:8px;">No tienes canciones publicadas aún.</p>';
      return;
    }
    _cancionesArtista.forEach(c => {
      const yaEnAlbum = enAlbum.includes(c.id_cancion);
      const div = document.createElement('div');
      div.className = 'cancion-album-item';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:0.82rem;">${escapeHtml(c.nombre)}</span>
        </div>
        ${idAlbum ? `
          <button class="btn-elite-action${yaEnAlbum ? '-outline' : ''}" style="padding:3px 10px;font-size:0.72rem;"
                  data-cancion-id="${c.id_cancion}" data-en-album="${yaEnAlbum}">
            ${yaEnAlbum ? 'Quitar' : 'Agregar'}
          </button>` : ''}
      `;
      const btn = div.querySelector('[data-cancion-id]');
      if (btn && idAlbum) {
        btn.addEventListener('click', async () => {
          const usuario = getUsuarioActual();
          if (btn.dataset.enAlbum === 'true') {
            const res = await fetch(`/api/albums/${idAlbum}/canciones/${c.id_cancion}?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' });
            if (res.ok) { btn.dataset.enAlbum = 'false'; btn.textContent = 'Agregar'; btn.className = 'btn-elite-action'; }
          } else {
            const res = await fetch(`/api/albums/${idAlbum}/canciones`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ correo: usuario.correo, id_cancion: c.id_cancion })
            });
            if (res.ok) { btn.dataset.enAlbum = 'true'; btn.textContent = 'Quitar'; btn.className = 'btn-elite-action-outline'; }
          }
        });
      }
      lista.appendChild(div);
    });
  }

  async function eliminarAlbum(idAlbum) {
    if (!await attoConfirm('Las canciones del álbum no se eliminarán.', { title: '¿Eliminar álbum?', confirmText: 'Eliminar', icon: 'danger' })) return;
    const usuario = getUsuarioActual();
    const res = await fetch(`/api/albums/${idAlbum}?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' });
    if (res.ok) { toast('Álbum eliminado', 'success'); cargarAlbums(); }
    else { const d = await res.json(); toast(d.error || 'Error', 'error'); }
  }

  // ── Modal Evento + Mapa Leaflet ──
  function abrirModalEvento(evento) {
    document.getElementById('tituloModalEvento').textContent = evento ? 'Editar evento' : 'Nuevo evento';
    document.getElementById('evento-editando-id').value = evento?.id_evento || '';
    document.getElementById('evento-titulo').value = evento?.titulo || '';
    document.getElementById('evento-descripcion').value = evento?.descripcion || '';
    document.getElementById('evento-direccion').value = evento?.direccion || '';
    document.getElementById('evento-lat').value = evento?.latitud || '';
    document.getElementById('evento-lng').value = evento?.longitud || '';
    if (evento?.fecha_evento) {
      document.getElementById('evento-fecha').value = new Date(evento.fecha_evento).toISOString().slice(0, 16);
    } else { document.getElementById('evento-fecha').value = ''; }
    if (evento?.horario_fin) {
      document.getElementById('evento-hora-fin').value = new Date(evento.horario_fin).toISOString().slice(0, 16);
    } else { document.getElementById('evento-hora-fin').value = ''; }

    const modal = new bootstrap.Modal(document.getElementById('modalEvento'));
    modal.show();

    setTimeout(() => inicializarMapaPicker(evento?.latitud, evento?.longitud), 300);
  }

  function inicializarMapaPicker(lat, lng) {
    if (!window.L) return;
    const centroLat = lat || 19.4326;
    const centroLng = lng || -99.1332;

    if (_mapaEvento) {
      _mapaEvento.remove();
      _mapaEvento = null;
      _mapaMarker = null;
    }

    _mapaEvento = L.map('mapa-evento-picker').setView([centroLat, centroLng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(_mapaEvento);

    if (lat && lng) {
      _mapaMarker = L.marker([lat, lng]).addTo(_mapaEvento);
      document.getElementById('coords-info').textContent = `📍 ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
    }

    _mapaEvento.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (_mapaMarker) _mapaEvento.removeLayer(_mapaMarker);
      _mapaMarker = L.marker([lat, lng]).addTo(_mapaEvento);
      document.getElementById('evento-lat').value = lat;
      document.getElementById('evento-lng').value = lng;
      document.getElementById('coords-info').textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    });
  }

  async function eliminarEvento(idEvento) {
    if (!await attoConfirm('Esta acción no se puede deshacer.', { title: '¿Eliminar evento?', confirmText: 'Eliminar', icon: 'danger' })) return;
    const usuario = getUsuarioActual();
    const res = await fetch(`/api/eventos/${idEvento}?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' });
    if (res.ok) { toast('Evento eliminado', 'success'); cargarEventos(); }
    else { const d = await res.json(); toast(d.error || 'Error', 'error'); }
  }

  // ──── TAB MERCANCÍA ────

  function escapeAttr(str) {
    return String(str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  }

  function renderImgMerch(m, cls, style) {
    if (!m.imagen) return `<div class="merch-card-img-placeholder">🛍️</div>`;
    const z = m.imagen_zoom || 1;
    const ox = m.imagen_offset_x || 0;
    const oy = m.imagen_offset_y || 0;
    return `<img src="${escapeAttr(m.imagen)}" class="${cls || ''}" style="${style || ''}transform:scale(${z}) translate(${ox}%,${oy}%);width:100%;height:100%;object-fit:cover;transform-origin:center;" alt="">`;
  }

  async function cargarMercancia() {
    const lista = document.getElementById('lista-mercancia');
    if (!lista) return;
    lista.innerHTML = '<p class="text-muted text-center py-3">Cargando...</p>';
    try {
      const res = await fetch(`/api/mercancia/usuario/${_idArtista}`);
      const productos = await res.json();

      lista.innerHTML = '';

      // Encabezado con botón agregar (solo owner)
      const header = document.createElement('div');
      header.className = 'merch-section-header';
      header.innerHTML = `<h3><i class="bi bi-bag-fill" style="color:#ffa500"></i> Mercancía</h3>`;
      if (_esOwner) {
        const btnNuevo = document.createElement('button');
        btnNuevo.className = 'btn-elite-action';
        btnNuevo.innerHTML = '<i class="bi bi-plus-lg"></i> Nuevo producto';
        btnNuevo.addEventListener('click', () => abrirModalMercancia(null));
        header.appendChild(btnNuevo);
      }
      lista.appendChild(header);

      if (!Array.isArray(productos) || productos.length === 0) {
        lista.innerHTML += `<p class="text-muted text-center py-4">Aún no hay productos disponibles.</p>`;
      } else {
        const grid = document.createElement('div');
        grid.className = 'merch-grid';

        productos.forEach(m => {
          const card = document.createElement('div');
          card.className = 'merch-card';

          const stockAgotado = (m.stock || 0) <= 0;

          card.innerHTML = `
            <div class="merch-card-img-wrap">
              ${renderImgMerch(m)}
              ${m.es_admin ? '<span class="merch-card-admin-tag"><i class="bi bi-gem"></i> AttoMusic</span>' : ''}
              <span class="merch-card-stock-badge ${stockAgotado ? 'agotado' : ''}">
                ${stockAgotado ? 'Agotado' : `Stock: ${m.stock}`}
              </span>
            </div>
            <div class="merch-card-body">
              <p class="merch-card-nombre">${escapeHtml(m.nombre)}</p>
              ${!m.es_admin ? `<p class="merch-card-artista">por ${escapeHtml(m.nombre_artistico || m.usuario || '')}</p>` : ''}
              ${m.descripcion ? `<p class="merch-card-descripcion">${escapeHtml(m.descripcion)}</p>` : ''}
              <div class="merch-card-footer">
                <span class="merch-card-precio">$${parseFloat(m.precio).toFixed(2)}</span>
                <button class="btn-agregar-carrito" data-id="${m.id_mercancia}" ${stockAgotado ? 'disabled' : ''}>
                  <i class="bi bi-bag-plus"></i> ${stockAgotado ? 'Agotado' : 'Agregar'}
                </button>
              </div>
            </div>
            ${_esOwner && !m.es_admin ? `
            <div class="merch-card-acciones">
              <button class="btn-elite-action-outline" style="padding:3px 10px;font-size:0.7rem;" data-merch-id="${m.id_mercancia}" data-accion="editar"><i class="bi bi-pencil"></i></button>
              <button class="btn-elite-action-outline" style="padding:3px 10px;font-size:0.7rem;color:#ff4d6d;border-color:#ff4d6d;" data-merch-id="${m.id_mercancia}" data-accion="eliminar"><i class="bi bi-trash"></i></button>
            </div>` : ''}
          `;

          // Agregar al carrito
          card.querySelector('.btn-agregar-carrito')?.addEventListener('click', (e) => {
            e.stopPropagation();
            agregarAlCarrito(m);
          });

          // Acciones owner
          card.querySelectorAll('[data-accion]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (btn.dataset.accion === 'editar') abrirModalMercancia(m);
              else eliminarMercancia(m.id_mercancia);
            });
          });

          grid.appendChild(card);
        });

        lista.appendChild(grid);
      }

      // Analytics de ventas (solo owner)
      if (_esOwner) {
        lista.appendChild(await renderVentasArtista());
      }

    } catch (err) {
      console.error('Error cargando mercancía:', err);
      lista.innerHTML = '<p class="text-danger text-center py-3">Error cargando mercancía.</p>';
    }
  }

  function agregarAlCarrito(producto) {
    const CARRITO_KEY = 'attomusic_carrito';
    let carrito = [];
    try { carrito = JSON.parse(localStorage.getItem(CARRITO_KEY)) || []; } catch { carrito = []; }

    const idx = carrito.findIndex(i => i.id_mercancia === producto.id_mercancia);
    if (idx >= 0) {
      carrito[idx].cantidad = (carrito[idx].cantidad || 1) + 1;
    } else {
      carrito.push({
        id_mercancia: producto.id_mercancia,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen || null,
        imagen_zoom: producto.imagen_zoom || 1,
        imagen_offset_x: producto.imagen_offset_x || 0,
        imagen_offset_y: producto.imagen_offset_y || 0,
        cantidad: 1,
        id_usuario_artista: producto.id_usuario,
        nombre_artistico: producto.nombre_artistico || producto.usuario || 'AttoMusic'
      });
    }

    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));

    // Actualizar badge en navbar
    const totalItems = carrito.reduce((s, i) => s + (i.cantidad || 1), 0);
    const badge = document.getElementById('carrito-badge');
    if (badge) { badge.textContent = totalItems; badge.style.display = ''; }

    toast(`"${producto.nombre}" agregado al carrito`, 'success');
  }

  async function renderVentasArtista() {
    const wrap = document.createElement('div');
    wrap.className = 'merch-analytics-wrap';
    wrap.innerHTML = `
      <div class="merch-analytics-titulo"><i class="bi bi-graph-up-arrow"></i> Estadísticas de ventas</div>
      <div class="merch-kpi-row" id="merch-kpis"></div>
      <div class="merch-charts-grid" id="merch-charts-grid">
        <div class="merch-chart-card">
          <div class="merch-chart-titulo"><i class="bi bi-bar-chart-fill"></i> Ingresos por mes</div>
          <canvas id="chart-merch-meses" height="200"></canvas>
        </div>
        <div class="merch-chart-card">
          <div class="merch-chart-titulo"><i class="bi bi-bag-fill"></i> Productos más vendidos</div>
          <canvas id="chart-merch-productos" height="200"></canvas>
        </div>
      </div>
    `;

    // Cargar datos
    const usuario = getUsuarioActual();
    if (!usuario) return wrap;

    try {
      const res = await fetch(`/api/mercancia/ventas/${_idArtista}`, {
        headers: { 'X-User-Email': usuario.correo }
      });
      if (!res.ok) return wrap;
      const data = await res.json();
      const r = data.resumen;

      // KPIs
      const kpis = wrap.querySelector('#merch-kpis');
      kpis.innerHTML = `
        <div class="merch-kpi-card">
          <div class="merch-kpi-valor">$${parseFloat(r.ingresos_totales || 0).toFixed(0)}</div>
          <div class="merch-kpi-label">Ingresos totales</div>
        </div>
        <div class="merch-kpi-card">
          <div class="merch-kpi-valor">${r.total_ordenes || 0}</div>
          <div class="merch-kpi-label">Órdenes</div>
        </div>
        <div class="merch-kpi-card">
          <div class="merch-kpi-valor">${r.unidades_vendidas || 0}</div>
          <div class="merch-kpi-label">Unidades vendidas</div>
        </div>
      `;

      // Charts con Chart.js (carga dinámica si no está)
      await cargarChartJs();
      if (!window.Chart) return wrap;

      // Gráfica meses
      const meses = data.por_mes || [];
      if (meses.length) {
        const ctx1 = wrap.querySelector('#chart-merch-meses');
        new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: meses.map(m => m.mes),
            datasets: [{
              label: 'Ingresos ($)',
              data: meses.map(m => m.ingresos || 0),
              backgroundColor: 'rgba(255,165,0,0.6)',
              borderColor: '#ffa500',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
      } else {
        wrap.querySelector('#chart-merch-meses').parentElement.innerHTML = '<p style="color:rgba(255,255,255,0.35);text-align:center;font-size:0.8rem;padding:20px 0;">Sin ventas en los últimos 6 meses</p>';
      }

      // Gráfica productos
      const prods = data.por_producto || [];
      if (prods.length) {
        const ctx2 = wrap.querySelector('#chart-merch-productos');
        new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: prods.map(p => p.nombre),
            datasets: [{
              data: prods.map(p => p.unidades || 0),
              backgroundColor: ['#ffa500','#ba01ff','#00dffc','#ff4d6d','#00c851','#ff6b00','#9b59b6','#3498db']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.55)', font: { size: 10 }, boxWidth: 12 } }
            }
          }
        });
      } else {
        wrap.querySelector('#chart-merch-productos').parentElement.innerHTML = '<p style="color:rgba(255,255,255,0.35);text-align:center;font-size:0.8rem;padding:20px 0;">Sin datos de ventas aún</p>';
      }

    } catch(err) {
      console.error('Error cargando analytics:', err);
    }

    return wrap;
  }

  function cargarChartJs() {
    return new Promise(resolve => {
      if (window.Chart) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  // ──── Modal mercancía ────
  function abrirModalMercancia(prod) {
    document.getElementById('tituloModalMercancia').textContent = prod ? 'Editar producto' : 'Nuevo producto';
    document.getElementById('merch-editando-id').value = prod?.id_mercancia || '';
    document.getElementById('merch-nombre').value = prod?.nombre || '';
    document.getElementById('merch-descripcion').value = prod?.descripcion || '';
    document.getElementById('merch-precio').value = prod?.precio || '';
    document.getElementById('merch-stock').value = prod?.stock ?? 0;

    // Imagen
    _merchImgBase64 = null;
    _merchZoom = prod?.imagen_zoom || 1.0;
    _merchOffsetX = prod?.imagen_offset_x || 0;
    _merchOffsetY = prod?.imagen_offset_y || 0;

    const preview = document.getElementById('merch-img-preview');
    const placeholder = document.getElementById('merch-img-placeholder');
    const zoomRow = document.getElementById('merch-zoom-row');
    const quitarBtn = document.getElementById('btn-merch-quitar-img');
    const slider = document.getElementById('merch-zoom-slider');
    const zoomVal = document.getElementById('merch-zoom-val');

    if (prod?.imagen) {
      _merchImgBase64 = prod.imagen;
      preview.src = prod.imagen;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      zoomRow.style.display = 'flex';
      quitarBtn.style.display = '';
      aplicarTransformMerch();
    } else {
      preview.src = '';
      preview.style.display = 'none';
      placeholder.style.display = '';
      zoomRow.style.display = 'none';
      quitarBtn.style.display = 'none';
    }

    slider.value = _merchZoom;
    zoomVal.textContent = `${_merchZoom.toFixed(1)}×`;

    new bootstrap.Modal(document.getElementById('modalMercancia')).show();
  }

  function aplicarTransformMerch() {
    const preview = document.getElementById('merch-img-preview');
    if (preview) {
      preview.style.transform = `scale(${_merchZoom}) translate(${_merchOffsetX}%,${_merchOffsetY}%)`;
    }
    const zoomVal = document.getElementById('merch-zoom-val');
    if (zoomVal) zoomVal.textContent = `${_merchZoom.toFixed(1)}×`;
  }

  async function eliminarMercancia(id) {
    if (!await attoConfirm('El producto se eliminará permanentemente de tu tienda.', { title: '¿Eliminar producto?', confirmText: 'Eliminar', icon: 'danger' })) return;
    const usuario = getUsuarioActual();
    const res = await fetch(`/api/mercancia/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': usuario.correo }
    });
    if (res.ok) { toast('Producto eliminado', 'success'); cargarMercancia(); }
    else { const d = await res.json(); toast(d.error || 'Error', 'error'); }
  }

  // ──── Inicializar la página ────
  async function iniciarPagina() {
    // Mover modales de la página al <body> para que Bootstrap los maneje correctamente
    ['modalEditarPagina', 'modalAlbum', 'modalEvento', 'modalVerAlbum', 'modalMercancia'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    });

    adjuntarEventListeners();

    _idArtista = getIdArtista();
    if (!_idArtista) {
      document.getElementById('artista-page-root').innerHTML = `
        <div class="artista-not-found">
          <div class="artista-crear-icon">🎵</div>
          <h2>ID de artista no especificado</h2>
        </div>`;
      return;
    }

    const usuario = getUsuarioActual();

    // Detección de owner: primero sessionStorage, luego API como fallback
    let myId = sessionStorage.getItem('id_usuario');
    if (!myId && usuario?.correo) {
      try {
        const r = await fetch(`/api/perfil/${encodeURIComponent(usuario.correo)}`);
        if (r.ok) {
          const d = await r.json();
          myId = String(d.id_usuario);
          sessionStorage.setItem('id_usuario', myId);
        }
      } catch { /* sin fallback */ }
    }
    _esOwner = !!(usuario && myId && String(myId) === String(_idArtista));

    try {
      const res = await fetch(`/api/pagina-artista/${_idArtista}`);
      if (res.status === 404) {
        if (_esOwner) {
          const esElite = sessionStorage.getItem('es_elite') === 'true'
                       || sessionStorage.getItem('tipo_plan') === 'attoelite';

          if (!esElite) {
            // Owner sin plan AttoElite
            document.getElementById('artista-page-root').innerHTML = `
              <div class="artista-page-card">
                <div class="artista-crear-pagina">
                  <div class="artista-crear-icon" style="background:linear-gradient(135deg,#ba01ff,#00dffc);">
                    <i class="bi bi-lock-fill" style="color:white;font-size:1.6rem;"></i>
                  </div>
                  <h2 style="font-size:1.4rem;font-weight:900;margin-bottom:12px;">Exclusivo de AttoElite</h2>
                  <p style="color:var(--text-muted,#666);max-width:380px;margin:0 auto 20px;">
                    Para crear tu página de artista necesitas el plan <strong>AttoElite</strong>.
                  </p>
                </div>
              </div>`;
            return;
          }

          _paginaData = null;
          document.getElementById('artista-page-root').innerHTML = `
            <div class="artista-page-card">
              <div class="artista-crear-pagina">
                <div class="artista-crear-icon"><i class="bi bi-gem"></i></div>
                <h2 class="artista-crear-titulo">¡Crea tu página de artista!</h2>
                <p style="color:var(--text-muted,#666);max-width:460px;margin:0 auto 20px;line-height:1.7;">
                  Como usuario <strong>AttoElite</strong> tienes tu propio espacio premium.<br>
                  Publica canciones, crea álbumes, anuncia eventos y llega a más personas.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:28px;">
                  <span style="background:rgba(255,215,0,0.12);color:#FF8C00;border:1px solid rgba(255,165,0,0.3);border-radius:20px;padding:5px 14px;font-size:0.8rem;font-weight:600;">
                    <i class="bi bi-music-note-list"></i> Canciones
                  </span>
                  <span style="background:rgba(255,215,0,0.12);color:#FF8C00;border:1px solid rgba(255,165,0,0.3);border-radius:20px;padding:5px 14px;font-size:0.8rem;font-weight:600;">
                    <i class="bi bi-collection-play"></i> Álbumes
                  </span>
                  <span style="background:rgba(255,215,0,0.12);color:#FF8C00;border:1px solid rgba(255,165,0,0.3);border-radius:20px;padding:5px 14px;font-size:0.8rem;font-weight:600;">
                    <i class="bi bi-calendar-event"></i> Eventos con mapa
                  </span>
                  <span style="background:rgba(255,215,0,0.12);color:#FF8C00;border:1px solid rgba(255,165,0,0.3);border-radius:20px;padding:5px 14px;font-size:0.8rem;font-weight:600;">
                    <i class="bi bi-bell"></i> Notificaciones a seguidores
                  </span>
                </div>
                <button class="btn-elite-action" id="btn-crear-pagina-primera-vez"
                        style="font-size:1.1rem;padding:14px 36px;border-radius:14px;box-shadow:0 4px 20px rgba(255,165,0,0.35);">
                  <i class="bi bi-plus-lg me-2"></i>Crear mi página ahora
                </button>
              </div>
            </div>`;

          document.getElementById('btn-crear-pagina-primera-vez')
            ?.addEventListener('click', abrirModalEditarPagina);

        } else {
          document.getElementById('artista-page-root').innerHTML = `
            <div class="artista-not-found">
              <div style="margin:0 auto 20px;width:70px;height:70px;border-radius:50%;background:rgba(255,165,0,0.1);display:flex;align-items:center;justify-content:center;font-size:2rem;">🎵</div>
              <h2>Este artista aún no tiene página</h2>
              <p style="color:var(--text-muted,#888)">El artista todavía no ha creado su página de artista.</p>
            </div>`;
        }
        return;
      }

      if (!res.ok) throw new Error('Error del servidor');

      const data = await res.json();
      renderPagina(data);

    } catch (err) {
      console.error('Error cargando página de artista:', err);
      document.getElementById('artista-page-root').innerHTML = `
        <div class="artista-not-found">
          <h2>Error cargando la página</h2>
          <p style="color:var(--text-muted,#888)">No se pudo cargar la página del artista.</p>
        </div>`;
    }
  }

  // Exponer para re-init al navegar (loadPage lo llama si el script ya fue cargado)
  // IMPORTANTE: loadPage() ya setea window._paginaArtistaId antes de llamar aquí, no lo resetear
  window['init_pagina-artista'] = function () {
    _listenersOk = false; // nueva navegación = nuevos elementos en DOM
    iniciarPagina();
  };

  // Arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
  } else {
    iniciarPagina();
  }

})();
