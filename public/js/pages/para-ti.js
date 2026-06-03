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

        if (window.cargarCacheSeguidos) await window.cargarCacheSeguidos();

        data.recommendations.forEach(pub => {
          if (window.PublicacionCard) {
            const esPropiaPub = pub.correo === usuarioActual.correo;
            const card = new window.PublicacionCard(pub, {
              correoActual: usuarioActual.correo,
              mostrarBotonesInteraccion: true,
              mostrarBotonSeguir: !esPropiaPub,
              esSeguido: window.esSiguiendoA ? window.esSiguiendoA(pub.id_usuario) : false
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

    let _chartActividad = null;
    let _chartArtistas = null;

    async function cargarAnalisis() {
      const container = document.getElementById('analisis-gustos');
      container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';

      // Destruir gráficas previas si existen
      if (_chartActividad) { _chartActividad.destroy(); _chartActividad = null; }
      if (_chartArtistas)  { _chartArtistas.destroy();  _chartArtistas  = null; }

      try {
        const res = await fetch(`/api/recomendaciones/analisis?correo=${encodeURIComponent(usuarioActual.correo)}`);
        const data = await res.json();
        if (!res.ok) throw new Error('Error cargando análisis');

        container.innerHTML = '';

        if (data.totalInteractions === 0) {
          container.innerHTML = `
            <div class="text-center p-5">
              <div style="font-size:3.5rem;margin-bottom:16px;">👋</div>
              <h4 style="color:#5a189a;">¡Bienvenido a tu análisis!</h4>
              <p style="color:#777;">Empieza a interactuar con publicaciones y canciones para ver estadísticas personalizadas de tus gustos musicales.</p>
            </div>`;
          return;
        }

        const act = data.recentActivity;
        const topArtists = data.topArtists || [];
        const avgRating = parseFloat(data.averageRating) || 0;
        const totalSongs = (act.ratings || 0) + (act.songComments || 0);

        // ── Colores top 3 ──
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        const rankEmojis = ['🥇', '🥈', '🥉'];
        const rankLabels = ['Oro', 'Plata', 'Bronce'];

        container.innerHTML = `
          <!-- Resumen rápido -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:28px;">
            ${[
              { n: act.posts,         label: 'Publicaciones',  icon: 'bi-postcard-fill',      color: '#ba01ff' },
              { n: act.likes,         label: 'Likes dados',    icon: 'bi-heart-fill',         color: '#ff4d6d' },
              { n: act.comments,      label: 'Comentarios',    icon: 'bi-chat-fill',           color: '#00dffc' },
              { n: act.ratings || 0,  label: 'Calificaciones', icon: 'bi-star-fill',           color: '#ffd700' },
              { n: act.songComments || 0, label: 'En canciones', icon: 'bi-music-note-beamed', color: '#7c3aed' },
            ].map(s => `
              <div style="background:linear-gradient(135deg,rgba(186,1,255,0.07),rgba(0,223,252,0.07));border-radius:14px;padding:16px 12px;text-align:center;border:1px solid rgba(186,1,255,0.15);">
                <i class="bi ${s.icon}" style="font-size:1.6rem;color:${s.color};display:block;margin-bottom:6px;"></i>
                <div style="font-size:1.8rem;font-weight:900;color:${s.color};">${s.n}</div>
                <div style="color:#777;font-size:0.78rem;margin-top:2px;">${s.label}</div>
              </div>`).join('')}
          </div>

          <!-- Datos extra -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
            <div style="background:linear-gradient(135deg,#ffd70015,#ffd70005);border:1px solid #ffd70040;border-radius:14px;padding:16px;text-align:center;">
              <div style="font-size:0.8rem;color:#999;margin-bottom:4px;">Calificación promedio</div>
              <div style="font-size:2rem;font-weight:900;color:#ffd700;">${avgRating > 0 ? avgRating + ' ★' : '—'}</div>
            </div>
            <div style="background:linear-gradient(135deg,rgba(186,1,255,0.08),rgba(186,1,255,0.02));border:1px solid rgba(186,1,255,0.2);border-radius:14px;padding:16px;text-align:center;">
              <div style="font-size:0.8rem;color:#999;margin-bottom:4px;">Total interacciones</div>
              <div style="font-size:2rem;font-weight:900;color:#ba01ff;">${data.totalInteractions}</div>
            </div>
          </div>

          <!-- Gráfica de actividad -->
          <div style="background:rgba(186,1,255,0.04);border:1px solid rgba(186,1,255,0.12);border-radius:14px;padding:20px;margin-bottom:28px;">
            <h5 style="color:#5a189a;margin-bottom:16px;font-weight:700;"><i class="bi bi-bar-chart-fill me-2" style="color:#ba01ff;"></i>Tu actividad musical</h5>
            <div style="position:relative;height:200px;">
              <canvas id="chart-actividad"></canvas>
            </div>
          </div>

          <!-- Top artistas -->
          ${topArtists.length > 0 ? `
          <div style="background:rgba(0,223,252,0.04);border:1px solid rgba(0,223,252,0.15);border-radius:14px;padding:20px;margin-bottom:28px;">
            <h5 style="color:#5a189a;margin-bottom:16px;font-weight:700;"><i class="bi bi-music-note-list me-2" style="color:#00dffc;"></i>Tus artistas favoritos</h5>
            <div style="position:relative;height:${Math.min(topArtists.length, 8) * 42 + 40}px;">
              <canvas id="chart-artistas"></canvas>
            </div>
          </div>

          <!-- Top 3 con medallas -->
          <div style="margin-bottom:16px;">
            <h5 style="color:#5a189a;margin-bottom:16px;font-weight:700;"><i class="bi bi-trophy-fill me-2" style="color:#ffd700;"></i>Tu podio musical</h5>
            <div style="display:grid;gap:10px;">
              ${topArtists.slice(0, 3).map((item, i) => `
                <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,${rankColors[i]}18,${rankColors[i]}06);border:2px solid ${rankColors[i]}55;position:relative;overflow:hidden;">
                  <div style="font-size:2rem;flex-shrink:0;">${rankEmojis[i]}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:800;font-size:1rem;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.artist}</div>
                    <div style="font-size:0.78rem;color:${rankColors[i]};font-weight:600;">${rankLabels[i]} · ${Math.round(item.score)} pts</div>
                  </div>
                  <!-- Barra de proporción -->
                  <div style="width:80px;height:8px;background:#eee;border-radius:4px;flex-shrink:0;">
                    <div style="height:100%;border-radius:4px;background:${rankColors[i]};width:${Math.min(100, Math.round((item.score / (topArtists[0]?.score || 1)) * 100))}%;transition:width 0.8s ease;"></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- Ranking completo (si hay más de 3) -->
          ${topArtists.length > 3 ? `
          <details style="margin-top:16px;">
            <summary style="cursor:pointer;color:#ba01ff;font-weight:600;padding:10px;border-radius:10px;background:rgba(186,1,255,0.06);list-style:none;display:flex;align-items:center;gap:8px;">
              <i class="bi bi-chevron-down"></i> Ver ranking completo (${topArtists.length} artistas)
            </summary>
            <div style="margin-top:12px;display:grid;gap:8px;">
              ${topArtists.slice(3).map((item, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(186,1,255,0.04);border:1px solid rgba(186,1,255,0.1);">
                  <span style="font-weight:800;color:#ba01ff;min-width:28px;">#${i + 4}</span>
                  <span style="flex:1;color:#333;font-weight:500;">${item.artist}</span>
                  <span style="color:#999;font-size:0.82rem;">${Math.round(item.score)} pts</span>
                </div>`).join('')}
            </div>
          </details>` : ''}
          ` : `
          <div class="text-center p-4" style="color:#999;">
            <i class="bi bi-music-note-beamed" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
            Aún no tienes artistas favoritos registrados. ¡Sigue interactuando con publicaciones!
          </div>`}
        `;

        // ── Renderizar gráfica de actividad ──
        const ctxAct = document.getElementById('chart-actividad');
        if (ctxAct && typeof Chart !== 'undefined') {
          _chartActividad = new Chart(ctxAct, {
            type: 'bar',
            data: {
              labels: ['Publicaciones', 'Likes', 'Comentarios', 'Calificaciones', 'En canciones'],
              datasets: [{
                label: 'Actividad',
                data: [act.posts, act.likes, act.comments, act.ratings || 0, act.songComments || 0],
                backgroundColor: [
                  'rgba(186,1,255,0.75)',
                  'rgba(255,77,109,0.75)',
                  'rgba(0,223,252,0.75)',
                  'rgba(255,215,0,0.75)',
                  'rgba(124,58,237,0.75)'
                ],
                borderColor: ['#ba01ff','#ff4d6d','#00dffc','#ffd700','#7c3aed'],
                borderWidth: 2,
                borderRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, color: '#888', font: { size: 11 } },
                  grid: { color: 'rgba(0,0,0,0.06)' }
                },
                x: { ticks: { color: '#666', font: { size: 11 } }, grid: { display: false } }
              }
            }
          });
        }

        // ── Renderizar gráfica de artistas ──
        const ctxArt = document.getElementById('chart-artistas');
        if (ctxArt && typeof Chart !== 'undefined' && topArtists.length > 0) {
          const top8 = topArtists.slice(0, 8);
          const maxScore = top8[0]?.score || 1;
          _chartArtistas = new Chart(ctxArt, {
            type: 'bar',
            data: {
              labels: top8.map(a => a.artist.length > 20 ? a.artist.slice(0, 18) + '…' : a.artist),
              datasets: [{
                label: 'Puntuación',
                data: top8.map(a => Math.round(a.score)),
                backgroundColor: top8.map((_, i) => {
                  if (i === 0) return 'rgba(255,215,0,0.85)';
                  if (i === 1) return 'rgba(192,192,192,0.85)';
                  if (i === 2) return 'rgba(205,127,50,0.85)';
                  return `rgba(186,1,255,${0.65 - i * 0.06})`;
                }),
                borderColor: top8.map((_, i) => {
                  if (i === 0) return '#ffd700';
                  if (i === 1) return '#c0c0c0';
                  if (i === 2) return '#cd7f32';
                  return '#ba01ff';
                }),
                borderWidth: 2,
                borderRadius: 8,
                indexAxis: 'y'
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: { color: '#888', font: { size: 11 } },
                  grid: { color: 'rgba(0,0,0,0.06)' }
                },
                y: { ticks: { color: '#444', font: { size: 12, weight: '600' } }, grid: { display: false } }
              }
            }
          });
        }

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
