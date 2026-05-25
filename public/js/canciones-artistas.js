// js/canciones-artistas.js
(function () {
  'use strict';

  let paginaActual = 1;
  let cargando = false;
  let finFeed = false;
  let audioActual = null;
  let btnPlayActual = null;

  function getUsuarioActual() {
    if (window.getUsuarioActual) return window.getUsuarioActual();
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return '';
    if (window.formatearFecha) return window.formatearFecha(new Date(fechaStr));
    return new Date(fechaStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escHtml(str) {
    if (window.escapeHtml) return window.escapeHtml(str || '');
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatTiempo(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function crearCard(cancion) {
    const usuario = getUsuarioActual();
    const esVip = cancion.es_vip || cancion.rol === 'admin';
    const article = document.createElement('article');
    article.className = 'ca-card fade-in';
    article.dataset.idCancion = cancion.id_cancion;

    // Fondo personalizado del usuario (el que configura en "Editar estilos" de su perfil)
    if (cancion.fondo_publicaciones) {
      article.style.backgroundImage = `url('${escHtml(cancion.fondo_publicaciones)}')`;
      article.classList.add('ca-card-custom-bg');
    }

    const avatarHtml = cancion.foto
      ? `<img src="${escHtml(cancion.foto)}" alt="${escHtml(cancion.usuario)}" class="ca-avatar">`
      : `<div class="ca-avatar-text">${escHtml(cancion.usuario.charAt(0).toUpperCase())}</div>`;

    const badgesHtml = `
      ${esVip ? '<span class="badge-vip-small"><i class="bi bi-crown-fill"></i> VIP</span>' : ''}
      ${cancion.insignia_artista ? '<span class="badge-artista-small"><i class="bi bi-music-note"></i> Artista</span>' : ''}
    `;

    const followBtnHtml = usuario && cancion.id_usuario !== parseInt(sessionStorage.getItem('id_usuario') || '0')
      ? `<button class="ca-follow-btn" data-id-usuario="${cancion.id_usuario}">
           <i class="bi bi-person-plus"></i><span>Seguir</span>
         </button>`
      : '';

    const coverHtml = cancion.imagen_url
      ? `<img src="${escHtml(cancion.imagen_url)}" alt="portada" class="ca-cover">`
      : `<div class="ca-cover-placeholder">🎵</div>`;

    const descripcionHtml = cancion.descripcion
      ? `<div class="ca-descripcion" id="desc-${cancion.id_cancion}">${escHtml(cancion.descripcion)}</div>`
      : '';

    article.innerHTML = `
      <div class="ca-card-header">
        <a href="#" class="ca-user-link" data-id-usuario="${cancion.id_usuario}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:0.6rem;">
          ${avatarHtml}
          <div class="ca-user-info">
            <div class="ca-username">
              @${escHtml(cancion.usuario)} ${badgesHtml}
            </div>
            <div class="ca-fecha">${formatFecha(cancion.fecha_subida)}</div>
          </div>
        </a>
        <div class="ms-auto">${followBtnHtml}</div>
      </div>

      <div class="ca-player-area">
        ${coverHtml}
        <div class="ca-song-details">
          <div class="ca-song-name">${escHtml(cancion.nombre)}</div>
          ${cancion.genero ? `<div class="ca-song-genre"><i class="bi bi-tag-fill"></i> ${escHtml(cancion.genero)}</div>` : ''}
        </div>
        <button class="ca-play-btn" data-id="${cancion.id_cancion}" title="Reproducir">
          <i class="bi bi-play-fill"></i>
        </button>
        <audio class="ca-audio" id="audio-${cancion.id_cancion}" preload="none"></audio>
      </div>

      <div class="ca-progress-wrap">
        <input type="range" class="ca-progress" id="progress-${cancion.id_cancion}" min="0" max="100" value="0">
      </div>
      <div class="ca-time-display">
        <span id="time-current-${cancion.id_cancion}">0:00</span>
        <span id="time-total-${cancion.id_cancion}">0:00</span>
      </div>

      <div class="ca-actions">
        <button class="ca-btn-action ca-btn-like" data-id="${cancion.id_cancion}">
          <i class="bi bi-heart"></i>
          <span class="ca-like-count">${cancion.likes || 0}</span>
        </button>
        <button class="ca-btn-action ca-btn-comentar" data-id="${cancion.id_cancion}">
          <i class="bi bi-chat"></i>
          <span>${cancion.comentarios || 0}</span>
        </button>
        ${cancion.descripcion ? `
        <button class="ca-btn-action ca-btn-desc" data-id="${cancion.id_cancion}">
          <i class="bi bi-chevron-down"></i>
          <span>Descripción</span>
        </button>` : ''}
      </div>

      ${descripcionHtml}

      <div class="ca-comentarios" id="coms-${cancion.id_cancion}">
        <div class="ca-comentarios-lista" id="lista-coms-${cancion.id_cancion}"></div>
        ${usuario
          ? `<div class="ca-comentario-form">
               <textarea class="ca-comentario-input" rows="1" placeholder="Escribe un comentario..."></textarea>
               <button class="ca-comentario-submit" data-id="${cancion.id_cancion}">Comentar</button>
             </div>`
          : `<p class="text-muted small px-0 pt-2">Inicia sesión para comentar</p>`
        }
      </div>
    `;

    adjuntarEventos(article, cancion, usuario);
    verificarLikeEstado(article, cancion, usuario);
    verificarSeguimiento(article, cancion, usuario);

    return article;
  }

  function adjuntarEventos(article, cancion, usuario) {
    // Navegación a perfil
    article.querySelectorAll('.ca-user-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.dataset.idUsuario;
        if (window.loadPage) window.loadPage(`perfil-usuario.html?id=${id}`);
      });
    });

    // Reproductor
    const btnPlay = article.querySelector('.ca-play-btn');
    const audioEl = article.querySelector('.ca-audio');
    const progressEl = article.querySelector(`#progress-${cancion.id_cancion}`);
    const timeCurrent = article.querySelector(`#time-current-${cancion.id_cancion}`);
    const timeTotal = article.querySelector(`#time-total-${cancion.id_cancion}`);

    btnPlay.addEventListener('click', () => toggleReproducir(cancion.id_cancion, btnPlay, audioEl, progressEl, timeCurrent, timeTotal));

    audioEl.addEventListener('timeupdate', () => {
      if (!audioEl.duration) return;
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      progressEl.value = pct;
      timeCurrent.textContent = formatTiempo(audioEl.currentTime);
    });

    audioEl.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = formatTiempo(audioEl.duration);
    });

    audioEl.addEventListener('ended', () => {
      btnPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
      progressEl.value = 0;
      timeCurrent.textContent = '0:00';
    });

    progressEl.addEventListener('input', () => {
      if (audioEl.duration) {
        audioEl.currentTime = (progressEl.value / 100) * audioEl.duration;
      }
    });

    // Like
    const btnLike = article.querySelector('.ca-btn-like');
    btnLike.addEventListener('click', () => handleLike(cancion.id_cancion, btnLike, usuario));

    // Comentarios
    const btnComentar = article.querySelector('.ca-btn-comentar');
    const comsDiv = article.querySelector(`#coms-${cancion.id_cancion}`);
    btnComentar.addEventListener('click', () => {
      const visible = comsDiv.classList.toggle('visible');
      if (visible) cargarComentarios(cancion.id_cancion, article);
    });

    // Descripción
    const btnDesc = article.querySelector('.ca-btn-desc');
    if (btnDesc) {
      const descDiv = article.querySelector(`#desc-${cancion.id_cancion}`);
      btnDesc.addEventListener('click', () => {
        const visible = descDiv.classList.toggle('visible');
        btnDesc.querySelector('i').className = visible ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
      });
    }

    // Enviar comentario
    const submitBtn = article.querySelector('.ca-comentario-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const textarea = article.querySelector('.ca-comentario-input');
        enviarComentario(cancion.id_cancion, textarea, article, usuario);
      });
    }

    // Follow
    const followBtn = article.querySelector('.ca-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', () => handleFollow(cancion.id_usuario, followBtn, usuario));
    }
  }

  async function toggleReproducir(idCancion, btnPlay, audioEl, progressEl, timeCurrent, timeTotal) {
    // Pausar el audio que esté sonando
    if (audioActual && audioActual !== audioEl) {
      audioActual.pause();
      if (btnPlayActual) btnPlayActual.innerHTML = '<i class="bi bi-play-fill"></i>';
    }

    if (!audioEl.src || audioEl.src === window.location.href) {
      btnPlay.innerHTML = '<i class="bi bi-hourglass-split"></i>';
      try {
        const res = await fetch(`/api/canciones-artista/${idCancion}/audio`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        audioEl.src = data.audio_data;
      } catch (err) {
        if (window.mostrarToast) window.mostrarToast('Error al cargar el audio', 'error');
        btnPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
        return;
      }
    }

    if (audioEl.paused) {
      audioEl.play().catch(() => {});
      btnPlay.innerHTML = '<i class="bi bi-pause-fill"></i>';
      audioActual = audioEl;
      btnPlayActual = btnPlay;
    } else {
      audioEl.pause();
      btnPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
      audioActual = null;
      btnPlayActual = null;
    }
  }

  async function handleLike(idCancion, btnLike, usuario) {
    if (!usuario) {
      if (window.mostrarToast) window.mostrarToast('Inicia sesión para dar like', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/canciones-artista/${idCancion}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario.correo })
      });
      const data = await res.json();
      if (res.ok) {
        const icon = btnLike.querySelector('i');
        const count = btnLike.querySelector('.ca-like-count');
        const n = parseInt(count.textContent) || 0;
        if (data.liked) {
          btnLike.classList.add('liked');
          icon.className = 'bi bi-heart-fill';
          count.textContent = n + 1;
        } else {
          btnLike.classList.remove('liked');
          icon.className = 'bi bi-heart';
          count.textContent = Math.max(0, n - 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function verificarLikeEstado(article, cancion, usuario) {
    if (!usuario) return;
    try {
      const res = await fetch(`/api/canciones-artista/${cancion.id_cancion}/like-estado?correo=${encodeURIComponent(usuario.correo)}`);
      const data = await res.json();
      if (data.liked) {
        const btnLike = article.querySelector('.ca-btn-like');
        btnLike.classList.add('liked');
        btnLike.querySelector('i').className = 'bi bi-heart-fill';
      }
    } catch { /* silenciar */ }
  }

  async function verificarSeguimiento(article, cancion, usuario) {
    const followBtn = article.querySelector('.ca-follow-btn');
    if (!followBtn || !usuario) return;
    try {
      const res = await fetch(`/api/siguiendo/${cancion.id_usuario}?correo=${encodeURIComponent(usuario.correo)}`);
      const data = await res.json();
      if (data.siguiendo) {
        followBtn.classList.add('siguiendo');
        followBtn.querySelector('i').className = 'bi bi-person-check-fill';
        followBtn.querySelector('span').textContent = 'Siguiendo';
      }
    } catch { /* silenciar */ }
  }

  async function handleFollow(idUsuario, btn, usuario) {
    if (!usuario) {
      if (window.mostrarToast) window.mostrarToast('Inicia sesión para seguir', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/seguir/${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario.correo })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.siguiendo) {
          btn.classList.add('siguiendo');
          btn.querySelector('i').className = 'bi bi-person-check-fill';
          btn.querySelector('span').textContent = 'Siguiendo';
        } else {
          btn.classList.remove('siguiendo');
          btn.querySelector('i').className = 'bi bi-person-plus';
          btn.querySelector('span').textContent = 'Seguir';
        }
      }
    } catch (err) { console.error(err); }
  }

  async function cargarComentarios(idCancion, article) {
    const lista = article.querySelector(`#lista-coms-${idCancion}`);
    lista.innerHTML = '<p class="text-muted small">Cargando...</p>';
    try {
      const res = await fetch(`/api/canciones-artista/${idCancion}/comentarios`);
      const coms = await res.json();
      if (coms.length === 0) {
        lista.innerHTML = '<p class="text-muted small">Sin comentarios aún.</p>';
        return;
      }
      lista.innerHTML = '';
      coms.forEach(c => {
        const div = document.createElement('div');
        div.className = 'ca-comentario-item';
        const av = c.foto
          ? `<img src="${escHtml(c.foto)}" class="ca-com-avatar" alt="${escHtml(c.usuario)}">`
          : `<div class="ca-com-avatar-text">${escHtml(c.usuario.charAt(0).toUpperCase())}</div>`;
        div.innerHTML = `
          ${av}
          <div class="ca-com-body">
            <strong>@${escHtml(c.usuario)}</strong>
            <small class="ms-1">${formatFecha(c.fecha)}</small>
            <p>${escHtml(c.comentario)}</p>
          </div>`;
        lista.appendChild(div);
      });
    } catch (err) {
      lista.innerHTML = '<p class="text-danger small">Error al cargar comentarios.</p>';
    }
  }

  async function enviarComentario(idCancion, textarea, article, usuario) {
    if (!usuario) return;
    const texto = textarea.value.trim();
    if (!texto) return;
    try {
      const res = await fetch(`/api/canciones-artista/${idCancion}/comentario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario.correo, comentario: texto })
      });
      if (res.ok) {
        textarea.value = '';
        cargarComentarios(idCancion, article);
        const btnComentar = article.querySelector('.ca-btn-comentar');
        const countSpan = btnComentar.querySelector('span');
        countSpan.textContent = (parseInt(countSpan.textContent) || 0) + 1;
        if (window.mostrarToast) window.mostrarToast('Comentario agregado', 'success');
      }
    } catch (err) { console.error(err); }
  }

  async function cargarFeed() {
    if (cargando || finFeed) return;
    cargando = true;
    const spinner = document.getElementById('ca-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
      const res = await fetch(`/api/canciones-artista?page=${paginaActual}`);
      const canciones = await res.json();
      const container = document.getElementById('ca-feed-container');

      if (!Array.isArray(canciones) || canciones.length === 0) {
        if (paginaActual === 1) {
          container.innerHTML = `
            <div class="ca-empty">
              <i class="bi bi-music-note-beamed"></i>
              <p>Aún no hay canciones publicadas.</p>
              <p class="small">Los usuarios AttoPlus podrán publicar su música aquí.</p>
            </div>`;
        } else {
          const fin = document.getElementById('ca-fin-feed');
          if (fin) fin.style.display = 'block';
        }
        finFeed = true;
      } else {
        canciones.forEach(c => container.appendChild(crearCard(c)));
        if (canciones.length < 10) {
          finFeed = true;
          const fin = document.getElementById('ca-fin-feed');
          if (fin) fin.style.display = 'block';
        }
        paginaActual++;
      }
    } catch (err) {
      console.error('Error cargando feed:', err);
    } finally {
      cargando = false;
      const spinner = document.getElementById('ca-spinner');
      if (spinner) spinner.style.display = 'none';
    }
  }

  function iniciar() {
    paginaActual = 1;
    finFeed = false;
    const container = document.getElementById('ca-feed-container');
    if (container) container.innerHTML = '';

    // Animar título igual que otras secciones
    if (window.animarTituloGlobal) {
      window.animarTituloGlobal('#titulo-artistas', 'Artistas en Crecimiento');
    } else {
      const h1 = document.getElementById('titulo-artistas');
      if (h1) h1.textContent = 'Artistas en Crecimiento';
    }

    cargarFeed();

    // Scroll infinito
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !cargando && !finFeed) cargarFeed();
    }, { threshold: 0.1 });

    const sentinel = document.getElementById('ca-fin-feed');
    if (sentinel) observer.observe(sentinel);
  }

  if (document.getElementById('ca-feed-container')) {
    iniciar();
  }

  window['init_canciones-artistas'] = iniciar;

})();
