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

        document.getElementById('perfilUsuario').textContent = '@' + perfilData.usuario;
        document.getElementById('perfilCorreo').textContent = perfilData.correo;

        const fecha = new Date(perfilData.fecha_reg);
        document.getElementById('perfilFecha').textContent =
          'Se unió en ' + fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

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

    await cargarPerfil();
    await cargarEstadisticas();
    await cargarPublicaciones();
  }

  window['init_perfil-usuario'] = initPerfilUsuario;
  initPerfilUsuario();
})();
