(function () {
  async function initPerfilUsuario() {
    const usuarioActual = window.getUsuarioActual ? window.getUsuarioActual() : null;
    const correoActual = usuarioActual?.correo || null;
    let idUsuario = window._perfilUsuarioId || new URLSearchParams(window.location.search).get('id');

    if (!idUsuario) {
      if (window.mostrarToast) window.mostrarToast('Usuario no especificado', 'error');
      return;
    }

    async function cargarPerfil() {
      try {
        const res = await fetch(`/api/perfil-publico/${idUsuario}`);
        const perfilData = await res.json();

        const headerEl = document.getElementById('headerFondo');
        if (headerEl) {
          headerEl.style.backgroundImage = perfilData.fondo_perfil
            ? `linear-gradient(135deg, rgba(102,126,234,0.7), rgba(118,75,162,0.7)), url('${perfilData.fondo_perfil}')`
            : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
        }

        const avatarContainer = document.getElementById('perfilAvatar');
        avatarContainer.innerHTML = perfilData.foto
          ? `<img src="${perfilData.foto}" class="perfil-avatar">`
          : `<div class="perfil-avatar-placeholder">${perfilData.usuario.charAt(0).toUpperCase()}</div>`;

        // Actualizar nombre sin borrar las insignias
        const h2Usuario = document.getElementById('perfilUsuario');
        h2Usuario.childNodes[0].textContent = '@' + perfilData.usuario + ' ';
        document.getElementById('perfilCorreo').textContent = perfilData.correo;

        // Mostrar título de ranking (Rey / Príncipe / Caballero de la Música)
        const badgeTitulo = document.getElementById('badge-titulo-real');
        if (badgeTitulo) {
          const titulos = { 1: 'Rey de la Música', 2: 'Príncipe de la Música', 3: 'Caballero de la Música' };
          const titulo = titulos[perfilData.posicion_ranking];
          if (titulo) {
            badgeTitulo.innerHTML = `<span class="titulo-real titulo-real-${perfilData.posicion_ranking} titulo-real-perfil">${titulo}</span>`;
            badgeTitulo.style.display = 'block';
          } else {
            badgeTitulo.style.display = 'none';
            badgeTitulo.innerHTML = '';
          }
        }

        // Mostrar insignias VIP/Artista
        const esVip = perfilData.es_vip || perfilData.rol === 'admin';
        if (esVip) {
          const badgeVip = document.getElementById('badge-vip-pub');
          if (badgeVip) badgeVip.style.display = 'inline-flex';
        }
        if (perfilData.insignia_artista) {
          const badgeArt = document.getElementById('badge-artista-pub');
          if (badgeArt) badgeArt.style.display = 'inline-flex';
        }

        // Mostrar tab de canciones si el usuario tiene canciones publicadas
        if (esVip || perfilData.insignia_artista) {
          cargarCancionesPublicas(idUsuario);
        }

        const fecha = new Date(perfilData.fecha_reg);
        document.getElementById('perfilFecha').textContent =
          'Se unió en ' + fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const esElite = perfilData.tipo_plan === 'attoelite' || perfilData.rol === 'admin';
        if (esElite) {
          verificarPaginaArtista(idUsuario);
        }

        const btnContainer = document.getElementById('btnSeguirContainer');
        if (correoActual && correoActual !== perfilData.correo) {
          btnContainer.innerHTML = `<button id="btnSeguirPerfil" class="btn-seguir-perfil">Seguir</button>`;
          verificarSiguiendo();
          document.getElementById('btnSeguirPerfil').onclick = toggleSeguir;
        } else if (correoActual === perfilData.correo) {
          btnContainer.innerHTML = `<a href="perfiles.html" class="btn-seguir-perfil load-page"><i class="bi bi-pencil"></i> Editar perfil</a>`;
        }
      } catch (err) {
        console.error('Error cargando el perfil:', err);
      }
    }

    async function verificarPaginaArtista(idUsr) {
      try {
        const res = await fetch(`/api/pagina-artista/${idUsr}`);
        if (!res.ok) return;
        const paginaData = await res.json();
        if (!paginaData || !paginaData.id_pagina) return;

        const btnContainer = document.getElementById('btnVerPaginaArtista');
        if (!btnContainer) return;
        btnContainer.style.display = 'block';
        btnContainer.onclick = () => {
          if (window.loadPage) window.loadPage(`pagina-artista.html?id=${idUsr}`);
        };
      } catch (err) {
        console.error('Error verificando página artista:', err);
      }
    }

    function crearPublicacion(pub) {
      if (window.PublicacionCard) {
        const isOwn = correoActual && pub.correo === correoActual;
        const card = new window.PublicacionCard(pub, {
          esPerfilPropio: isOwn,
          correoActual,
          mostrarBotonesInteraccion: true,
          mostrarBotonSeguir: false,
          mostrarOpcionesAdmin: isOwn
        });
        return card.element;
      }
      const div = document.createElement('div');
      div.textContent = 'Error cargando componente';
      return div;
    }

    async function cargarPublicaciones() {
      try {
        const res = await fetch(`/api/usuario/${idUsuario}/publicaciones`);
        const publicaciones = await res.json();
        document.getElementById('statPublicaciones').textContent = publicaciones.length;
        const container = document.getElementById('publicacionesUsuario');
        container.innerHTML = '';

        if (publicaciones.length === 0) {
          container.innerHTML = '<p class="text-center text-muted">No hay publicaciones.</p>';
          return;
        }
        publicaciones.forEach(pub => container.appendChild(crearPublicacion(pub)));
      } catch (err) { console.error(err); }
    }

    async function cargarEstadisticas() {
      const res = await fetch(`/api/usuario-stats/${idUsuario}`);
      const stats = await res.json();
      document.getElementById('statSeguidores').textContent = stats.seguidores;
      document.getElementById('statSeguidos').textContent = stats.seguidos;
    }

    async function verificarSiguiendo() {
      const res = await fetch(`/api/siguiendo-usuario/${idUsuario}?correo=${encodeURIComponent(correoActual)}`);
      const data = await res.json();
      const btn = document.getElementById('btnSeguirPerfil');
      if (data.siguiendo && btn) {
        btn.classList.add('siguiendo');
        btn.innerHTML = '<i class="bi bi-person-check-fill"></i> Siguiendo';
      }
    }

    async function toggleSeguir() {
      const res = await fetch(`/api/seguir/${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoActual })
      });
      if (res.ok) {
        verificarSiguiendo();
        cargarEstadisticas();
      }
    }

    async function cargarCancionesPublicas(idUsr) {
      try {
        const res = await fetch(`/api/canciones-artista/usuario/${idUsr}`);
        const canciones = await res.json();

        // Mostrar tabs siempre que el usuario sea VIP/artista
        const tabsEl = document.getElementById('tabs-pub-canciones');
        const tituloPub = document.getElementById('titulo-pub-pub');
        if (tabsEl) tabsEl.style.display = 'block';
        if (tituloPub) tituloPub.style.display = 'none';

        const container = document.getElementById('cancionesUsuarioPub');
        if (!container) return;
        container.innerHTML = '';

        if (!Array.isArray(canciones) || canciones.length === 0) {
          container.innerHTML = '<p class="text-center text-muted py-4">Este artista aún no ha publicado canciones.</p>';
          return;
        }

        canciones.forEach(c => {
          const div = document.createElement('div');
          div.className = 'ca-mini-card';
          const cover = c.imagen_url
            ? `<img src="${window.escapeHtml ? window.escapeHtml(c.imagen_url) : c.imagen_url}" class="ca-mini-cover" alt="portada">`
            : `<div class="ca-mini-cover-placeholder">🎵</div>`;

          div.innerHTML = `
            ${cover}
            <div class="ca-mini-info">
              <div class="ca-mini-name">${window.escapeHtml ? window.escapeHtml(c.nombre) : c.nombre}</div>
              ${c.genero ? `<div class="ca-mini-genre"><i class="bi bi-tag-fill"></i> ${window.escapeHtml ? window.escapeHtml(c.genero) : c.genero}</div>` : ''}
              <div style="font-size:0.75rem;color:#999;margin-top:2px;"><i class="bi bi-heart-fill" style="color:#e63b6f;"></i> ${c.likes || 0} &nbsp;<i class="bi bi-chat-fill"></i> ${c.comentarios || 0}</div>
            </div>
            <button class="ca-mini-play" data-id="${c.id_cancion}" title="Reproducir"><i class="bi bi-play-fill"></i></button>
            <audio id="pub-audio-${c.id_cancion}" preload="none" style="display:none;"></audio>
          `;

          const btn = div.querySelector('.ca-mini-play');
          const audioEl = div.querySelector(`#pub-audio-${c.id_cancion}`);
          btn.addEventListener('click', async () => {
            if (!audioEl.src || audioEl.src === window.location.href) {
              btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
              try {
                const r = await fetch(`/api/canciones-artista/${c.id_cancion}/audio`);
                const d = await r.json();
                audioEl.src = d.audio_data;
              } catch { btn.innerHTML = '<i class="bi bi-play-fill"></i>'; return; }
            }
            if (audioEl.paused) {
              audioEl.play().catch(() => {});
              btn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            } else {
              audioEl.pause();
              btn.innerHTML = '<i class="bi bi-play-fill"></i>';
            }
            audioEl.onended = () => { btn.innerHTML = '<i class="bi bi-play-fill"></i>'; };
          });

          container.appendChild(div);
        });
      } catch (err) {
        console.error('Error cargando canciones públicas:', err);
      }
    }

    window.tabPerfilPublico = function (tab) {
      const pubDiv = document.getElementById('publicacionesUsuario');
      const canDiv = document.getElementById('cancionesUsuarioPub');
      const tabPub = document.getElementById('tab-pub-pub');
      const tabCan = document.getElementById('tab-pub-can');
      if (tab === 'publicaciones') {
        if (pubDiv) pubDiv.style.display = 'block';
        if (canDiv) canDiv.style.display = 'none';
        if (tabPub) tabPub.classList.add('active');
        if (tabCan) tabCan.classList.remove('active');
      } else {
        if (pubDiv) pubDiv.style.display = 'none';
        if (canDiv) { canDiv.style.display = 'flex'; canDiv.style.flexDirection = 'column'; }
        if (tabPub) tabPub.classList.remove('active');
        if (tabCan) tabCan.classList.add('active');
      }
    };

    await cargarPerfil();
    await cargarEstadisticas();
    await cargarPublicaciones();
  }

  window['init_perfil-usuario'] = initPerfilUsuario;
  initPerfilUsuario();
})();
