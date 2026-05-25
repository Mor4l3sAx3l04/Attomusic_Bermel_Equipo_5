(function () {
  'use strict';

  function initParaTi() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#titulo-siguiendo', 'Para Ti');
    }

    const usuarioActual = window.getUsuarioActual ? window.getUsuarioActual() : null;

    if (!usuarioActual) {
      const wrapper = document.querySelector('[style*="max-width:900px"]');
      if (wrapper) {
        wrapper.innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <h3 style="color:#5a189a;">Inicia sesión para ver recomendaciones personalizadas</h3>
            <p style="color:#777;">Descubre música y personas con gustos similares a los tuyos</p>
          </div>
        `;
      }
      return;
    }

    async function cargarRecomendaciones() {
      const feed = document.getElementById('recomendaciones-feed');
      feed.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Analizando tus gustos...</p></div>';

      try {
        const res = await fetch(`/api/recomendaciones?correo=${encodeURIComponent(usuarioActual.correo)}&limit=20`);
        const data = await res.json();
        if (!res.ok) throw new Error('Error cargando recomendaciones');

        feed.innerHTML = '';

        if (data.recommendations.length === 0) {
          feed.innerHTML = `
            <div class="text-center p-5">
              <p style="color:#777;">Interactúa con publicaciones para recibir recomendaciones personalizadas 🎵</p>
            </div>
          `;
          return;
        }

        if (data.topArtists && data.topArtists.length > 0) {
          feed.innerHTML += `
            <div style="background:#f3e8ff;padding:16px;border-radius:12px;margin-bottom:24px;">
              <strong style="color:#5a189a;">🎤 Basado en tus artistas favoritos:</strong>
              <div style="margin-top:8px;color:#777;">${data.topArtists.join(', ')}</div>
            </div>
          `;
        }

        data.recommendations.forEach(pub => {
          if (window.PublicacionCard) {
            const card = new window.PublicacionCard(pub, {
              correoActual: usuarioActual.correo,
              mostrarBotonesInteraccion: true,
              mostrarBotonSeguir: true
            });
            feed.appendChild(card.element);
          }
        });
      } catch (err) {
        console.error('Error:', err);
        feed.innerHTML = '<div class="alert alert-danger">Error al cargar recomendaciones</div>';
      }
    }

    async function cargarUsuariosSimilares() {
      const container = document.getElementById('usuarios-similares');
      container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';

      try {
        const res = await fetch(`/api/recomendaciones/usuarios?correo=${encodeURIComponent(usuarioActual.correo)}&limit=15`);
        const data = await res.json();
        if (!res.ok) throw new Error('Error cargando usuarios');

        container.innerHTML = '';

        if (data.recommendations.length === 0) {
          container.innerHTML = '<div class="text-center p-5"><p style="color:#777;">No hay usuarios similares aún</p></div>';
          return;
        }

        if (data.topArtists && data.topArtists.length > 0) {
          container.innerHTML += `
            <div style="background:#f3e8ff;padding:16px;border-radius:12px;margin-bottom:24px;">
              <strong style="color:#5a189a;">🎵 Usuarios que escuchan:</strong>
              <div style="margin-top:8px;color:#777;">${data.topArtists.join(', ')}</div>
            </div>
          `;
        }

        data.recommendations.forEach(user => container.appendChild(crearTarjetaUsuario(user)));
      } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<div class="alert alert-danger">Error al cargar usuarios</div>';
      }
    }

    function crearTarjetaUsuario(user) {
      const div = document.createElement('div');
      div.className = 'perfil-card mb-3 fade-in';

      const escapeHtml = window.escapeHtml || ((text) => {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
      });

      div.innerHTML = `
        <div class="perfil-card-content">
          <div class="perfil-avatar-container">
            ${user.foto
              ? `<img src="${user.foto}" alt="${escapeHtml(user.usuario)}" class="perfil-avatar-img">`
              : `<div class="perfil-avatar-placeholder">${user.usuario.charAt(0).toUpperCase()}</div>`}
          </div>
          <div class="perfil-info">
            <h5 class="perfil-username">@${escapeHtml(user.usuario)}</h5>
            <p class="perfil-stats">
              ${user.artistas_comunes ? `<i class="bi bi-music-note-beamed"></i> ${user.artistas_comunes} artistas en común<br>` : ''}
              <i class="bi bi-people-fill"></i> ${user.seguidores || 0} seguidores
            </p>
          </div>
          <div class="perfil-actions">
            <button class="btn-seguir-perfil-similar" data-id-usuario="${user.id_usuario}">
              <i class="bi bi-person-plus"></i>
              <span>Seguir</span>
            </button>
            <button class="btn-ver-perfil load-page-perfil" data-id-usuario="${user.id_usuario}">
              <i class="bi bi-eye"></i> Ver perfil
            </button>
          </div>
        </div>
      `;

      const btnSeguir = div.querySelector('.btn-seguir-perfil-similar');
      const btnVer = div.querySelector('.btn-ver-perfil');

      if (btnSeguir) {
        verificarSiguiendo(user.id_usuario, btnSeguir);
        btnSeguir.addEventListener('click', () => toggleSeguir(user.id_usuario, btnSeguir));
      }

      if (btnVer) {
        btnVer.addEventListener('click', function () {
          const id = this.getAttribute('data-id-usuario');
          if (typeof loadPage === 'function') loadPage(`perfil-usuario.html?id=${id}`);
          else window.location.href = `perfil-usuario.html?id=${id}`;
        });
      }

      return div;
    }

    async function verificarSiguiendo(idUsuario, btn) {
      if (!usuarioActual) return;
      try {
        const res = await fetch(`/api/siguiendo/${idUsuario}?correo=${encodeURIComponent(usuarioActual.correo)}`);
        const data = await res.json();
        if (data.siguiendo) {
          btn.classList.add('siguiendo');
          btn.querySelector('i').className = 'bi bi-person-check-fill';
          btn.querySelector('span').textContent = 'Siguiendo';
        }
      } catch (err) { console.error('Error verificando seguimiento:', err); }
    }

    async function toggleSeguir(idUsuario, btn) {
      if (!usuarioActual) {
        if (window.mostrarToast) window.mostrarToast('Debes iniciar sesión para seguir usuarios', 'error');
        return;
      }
      try {
        const res = await fetch(`/api/seguir/${idUsuario}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: usuarioActual.correo })
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
          if (window.mostrarToast) window.mostrarToast(data.message, 'success');
        }
      } catch (err) {
        console.error('Error al seguir:', err);
        if (window.mostrarToast) window.mostrarToast('Error de conexión', 'error');
      }
    }

    async function cargarAnalisis() {
      const container = document.getElementById('analisis-gustos');
      container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';

      try {
        const res = await fetch(`/api/recomendaciones/analisis?correo=${encodeURIComponent(usuarioActual.correo)}`);
        const data = await res.json();
        if (!res.ok) throw new Error('Error cargando análisis');

        container.innerHTML = '';

        if (data.totalInteractions === 0) {
          container.innerHTML = `
            <div class="text-center p-5">
              <h4 style="color:#5a189a;">👋 ¡Bienvenido!</h4>
              <p style="color:#777;">Empieza a interactuar con publicaciones para ver tu análisis musical</p>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div class="analisis-panel" style="padding:24px;border-radius:12px;margin-bottom:24px;">
            <h4 style="color:#5a189a;margin-bottom:16px;">📊 Tu Actividad Musical</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;">
              <div style="text-align:center;">
                <div class="analisis-accent" style="font-size:2rem;color:#ba01ff;font-weight:900;">${data.recentActivity.posts}</div>
                <div style="color:#777;font-size:0.9rem;">Publicaciones</div>
              </div>
              <div style="text-align:center;">
                <div class="analisis-accent" style="font-size:2rem;color:#ba01ff;font-weight:900;">${data.recentActivity.likes}</div>
                <div style="color:#777;font-size:0.9rem;">Likes</div>
              </div>
              <div style="text-align:center;">
                <div class="analisis-accent" style="font-size:2rem;color:#ba01ff;font-weight:900;">${data.recentActivity.comments}</div>
                <div style="color:#777;font-size:0.9rem;">Comentarios</div>
              </div>
            </div>
          </div>
          <h5 style="color:#5a189a;margin-bottom:16px;">🎤 Tus Artistas Favoritos</h5>
          <div style="display:grid;gap:12px;">
            ${data.topArtists.map((item, i) => `
              <div class="analisis-item" style="padding:16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div>
                  <span class="analisis-accent" style="color:#ba01ff;font-weight:700;margin-right:8px;">#${i + 1}</span>
                  <span style="color:#333;">${item.artist}</span>
                </div>
                <span style="color:#777;font-size:0.9rem;">${Math.round(item.score)} puntos</span>
              </div>
            `).join('')}
          </div>
        `;
      } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<div class="alert alert-danger">Error al cargar análisis</div>';
      }
    }

    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
      tab.addEventListener('shown.bs.tab', (e) => {
        const target = e.target.getAttribute('data-bs-target');
        if (target === '#tab-publicaciones') cargarRecomendaciones();
        if (target === '#tab-usuarios') cargarUsuariosSimilares();
        if (target === '#tab-analisis') cargarAnalisis();
      });
    });

    cargarRecomendaciones();
  }

  window['init_para-ti'] = initParaTi;
  initParaTi();
})();
