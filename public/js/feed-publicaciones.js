// feed-publicaciones.js ACTUALIZADO

(function() {
  'use strict';

  let usuarioActual = window.getUsuarioActual();
  const correoActual = usuarioActual?.correo || null;

  // Cache de likes y seguidos del usuario
  let userLikesCache = new Set();
  let usuariosSeguidosCache = new Set();

  // Cargar likes del usuario
  async function cargarLikesCache() {
    if (!correoActual) return;
    
    try {
      const res = await fetch(`/api/usuario/likes?correo=${encodeURIComponent(correoActual)}`);
      if (res.ok) {
        const data = await res.json();
        userLikesCache = new Set(data.likes);
      }
    } catch (err) {
      console.error('Error cargando likes:', err);
    }
  }

  // Cargar usuarios seguidos
  async function cargarUsuariosSeguidosCache() {
    if (!correoActual) return;
    
    try {
      const res = await fetch(`/api/usuario/${correoActual}/seguidos`);
      if (res.ok) {
        const data = await res.json();
        usuariosSeguidosCache = new Set(data.map(u => u.id_usuario));
      }
    } catch (err) {
      console.error('Error cargando seguidos:', err);
    }
  }

  // FUNCIÓN DE BÚSQUEDA
  window.buscarPublicaciones = async function(query) {
    const feed = document.getElementById("feedPublicaciones");
    
    if (!query || query.trim().length === 0) {
      await window.cargarPublicaciones();
      return;
    }

    try {
      feed.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Buscando...</span></div></div>`;
      
      const res = await fetch(`/api/publicaciones/buscar?q=${encodeURIComponent(query)}`);
      
      if (!res.ok) {
        throw new Error('Error en búsqueda');
      }

      const data = await res.json();
      feed.innerHTML = "";
      
      if (!Array.isArray(data) || data.length === 0) {
        feed.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-search" style="font-size: 4rem; color: #ccc;"></i>
            <p class="text-muted mt-3">No se encontraron publicaciones con "${window.escapeHtml(query)}"</p>
          </div>
        `;
        return;
      }

      data.forEach(pub => {
        const article = crearPublicacion(pub, false);
        feed.appendChild(article);
      });

    } catch (err) {
      console.error("Error en búsqueda:", err);
      feed.innerHTML = `<p class="text-danger">Error al buscar publicaciones.</p>`;
    }
  }

  window.cargarPublicaciones = async function(filtroCorreo = null) {
    const feed = document.getElementById("feedPublicaciones") || document.getElementById("misPublicaciones");
    
    if (!feed) {
      console.error("No se encontró el contenedor de publicaciones");
      return;
    }

    try {
      feed.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
      
      const url = filtroCorreo 
        ? `/api/perfil/${filtroCorreo}/publicaciones`
        : '/api/publicaciones';
      
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error("Error al cargar publicaciones:", res.status);
        feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones (status ${res.status})</p>`;
        return;
      }

      const data = await res.json();
      feed.innerHTML = "";
      
      if (!Array.isArray(data) || data.length === 0) {
        if (filtroCorreo) {
          feed.innerHTML = `
            <div class="text-center py-5">
              <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
              <p class="text-muted mt-3">Aún no tienes publicaciones</p>
            </div>
          `;
        } else {
          feed.innerHTML = `<p class="text-muted">Aún no hay publicaciones.</p>`;
        }
        return;
      }

      data.forEach(pub => {
        const article = crearPublicacion(pub, filtroCorreo !== null);
        feed.appendChild(article);
      });

    } catch (err) {
      console.error("Error cargando publicaciones:", err);
      feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones.</p>`;
    }
  }

  function crearPublicacion(pub, esPerfilPropio = false) {
    const article = document.createElement("article");
    article.className = "publicacion-item mb-4 fade-in";
    
    const fecha = new Date(pub.fecha_pub);
    const fechaFormateada = window.formatearFecha(fecha);
    const yaLeDioLike = userLikesCache.has(pub.id_publicacion);

    article.innerHTML = `
      <div class="pub-header">
        ${esPerfilPropio ? `
          <small class="pub-fecha">${fechaFormateada}</small>
          <div class="pub-actions-inline">
            <button class="btn-icon-action" onclick="editarPublicacion(${pub.id_publicacion}, '${window.escapeHtml(pub.publicacion).replace(/'/g, "\\'")}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn-icon-action text-danger" onclick="eliminarPublicacion(${pub.id_publicacion})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        ` : `
          <div class="pub-user-info">
            <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-user-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
              ${pub.foto ? 
                `<img src="${pub.foto}" alt="${window.escapeHtml(pub.usuario)}" class="pub-avatar-img">` :
                `<div class="pub-avatar">${pub.usuario.charAt(0).toUpperCase()}</div>`
              }
            </a>
            <div style="flex: 1;">
              <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-username-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
                <strong class="pub-username">@${window.escapeHtml(pub.usuario)}</strong>
              </a>
              <small class="pub-fecha">${fechaFormateada}</small>
            </div>
            <div class="pub-header-actions">
              ${correoActual && pub.correo !== correoActual ? `
                <button class="btn-seguir" data-id-usuario="${pub.id_usuario}" data-correo="${pub.correo}">
                  <i class="bi bi-person-plus"></i>
                  <span>Seguir</span>
                </button>
              ` : ''}
              ${correoActual ? `
                <button class="btn-icon-action" onclick="mostrarFormReporte(${pub.id_publicacion})">
                  <i class="bi bi-flag"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `}
      </div>
      
      <div class="pub-content">
        <p class="pub-text">${window.escapeHtml(pub.publicacion)}</p>
      </div>
      
      ${pub.cancion ? `
        <div class="pub-cancion">
          ${pub.imagen_cancion ? 
            `<img src="${pub.imagen_cancion}" alt="cover" class="pub-cancion-img">` : 
            window.crearImagenPlaceholder()
          }
          <div class="pub-cancion-info">
            <strong class="pub-cancion-nombre">${window.escapeHtml(pub.cancion)}</strong>
            <p class="pub-cancion-artista">${window.escapeHtml(pub.artista || '')}</p>
            ${pub.album ? `<small class="pub-cancion-album">${window.escapeHtml(pub.album)}</small>` : ''}
          </div>
        </div>
      ` : ""}
      
      ${esPerfilPropio ? `
        <div class="pub-stats">
          <span><i class="bi bi-heart-fill"></i> ${pub.likes || 0}</span>
          <span><i class="bi bi-chat-fill"></i> ${pub.comentarios || 0}</span>
        </div>
      ` : `
        <div class="pub-actions">
          <button class="pub-btn pub-btn-like ${yaLeDioLike ? 'liked' : ''}" data-id="${pub.id_publicacion}">
            <i class="bi bi-heart${yaLeDioLike ? '-fill' : ''}"></i>
            <span class="pub-count">${pub.likes || 0}</span>
          </button>
          
          <button class="pub-btn pub-btn-comment" data-id="${pub.id_publicacion}">
            <i class="bi bi-chat"></i>
            <span class="pub-count">${pub.comentarios || 0}</span>
          </button>
        </div>
        
        <div class="pub-comentarios" id="comentarios-${pub.id_publicacion}" style="display:none;">
          <div class="comentarios-lista"></div>
          ${correoActual ? `
            <div class="comentario-form mt-3">
              <textarea class="form-control form-control-sm mb-2" placeholder="Escribe un comentario..." rows="2" id="txt-comentario-${pub.id_publicacion}"></textarea>
              <button class="btn btn-sm btn-gradient" onclick="enviarComentario(${pub.id_publicacion})">Comentar</button>
            </div>
          ` : '<p class="text-muted small">Inicia sesión para comentar</p>'}
        </div>
      `}
    `;
    
    if (!esPerfilPropio) {
      const btnLike = article.querySelector('.pub-btn-like');
      const btnComment = article.querySelector('.pub-btn-comment');
      
      if (btnLike) {
        btnLike.addEventListener('click', () => toggleLike(pub.id_publicacion, btnLike));
      }
      
      if (btnComment) {
        btnComment.addEventListener('click', () => toggleComentarios(pub.id_publicacion));
      }
    }

    // Event listener para botón de seguir
    if (!esPerfilPropio) {
      const btnSeguir = article.querySelector('.btn-seguir');
      if (btnSeguir) {
        verificarSiguiendo(pub.id_usuario, btnSeguir);
        btnSeguir.addEventListener('click', () => toggleSeguir(pub.id_usuario, btnSeguir));
      }

      // Event listeners para los links de perfil
      const linksPerfilUsuario = article.querySelectorAll('.load-page-perfil');
      linksPerfilUsuario.forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const idUsuario = this.getAttribute('data-id-usuario');
          loadPage(`perfil-usuario.html?id=${idUsuario}`);
        });
      });
    }
    
    return article;
  }

  async function toggleLike(idPublicacion, btnElement) {
    if (!correoActual) {
      window.mostrarToast('Debes iniciar sesión para dar like', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/publicacion/${idPublicacion}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoActual })
      });

      const data = await res.json();
      
      if (res.ok) {
        const icon = btnElement.querySelector('i');
        const count = btnElement.querySelector('.pub-count');
        const currentCount = parseInt(count.textContent) || 0;
        
        if (data.liked) {
          userLikesCache.add(idPublicacion);
          btnElement.classList.add('liked');
          icon.className = 'bi bi-heart-fill';
          count.textContent = currentCount + 1;
        } else {
          userLikesCache.delete(idPublicacion);
          btnElement.classList.remove('liked');
          icon.className = 'bi bi-heart';
          count.textContent = Math.max(0, currentCount - 1);
        }
      } else {
        window.mostrarToast(data.error || 'Error al dar like', 'error');
      }
    } catch (err) {
      console.error('Error al dar like:', err);
      window.mostrarToast('Error de conexión', 'error');
    }
  }

  async function toggleComentarios(idPublicacion) {
    const comentariosDiv = document.getElementById(`comentarios-${idPublicacion}`);
    
    if (comentariosDiv.style.display === 'none') {
      comentariosDiv.style.display = 'block';
      await cargarComentarios(idPublicacion);
    } else {
      comentariosDiv.style.display = 'none';
    }
  }

  async function cargarComentarios(idPublicacion) {
    const lista = document.querySelector(`#comentarios-${idPublicacion} .comentarios-lista`);
    
    try {
      lista.innerHTML = '<p class="text-muted small">Cargando comentarios...</p>';
      
      const res = await fetch(`/api/publicacion/${idPublicacion}/comentarios`);
      const comentarios = await res.json();
      
      if (comentarios.length === 0) {
        lista.innerHTML = '<p class="text-muted small">No hay comentarios aún</p>';
        return;
      }
      
      lista.innerHTML = '';
      comentarios.forEach(com => {
        const div = document.createElement('div');
        div.className = 'comentario-item';
        const fecha = new Date(com.fecha_com);
        div.innerHTML = `
          <div class="comentario-header">
            <strong>@${window.escapeHtml(com.usuario)}</strong>
            <small>${window.formatearFecha(fecha)}</small>
          </div>
          <p class="comentario-text">${window.escapeHtml(com.comentario)}</p>
        `;
        lista.appendChild(div);
      });
    } catch (err) {
      console.error('Error cargando comentarios:', err);
      lista.innerHTML = '<p class="text-danger small">Error al cargar comentarios</p>';
    }
  }

  window.enviarComentario = async function(idPublicacion) {
    if (!correoActual) {
      window.mostrarToast('Debes iniciar sesión para comentar', 'error');
      return;
    }

    const textarea = document.getElementById(`txt-comentario-${idPublicacion}`);
    const comentario = textarea.value.trim();
    
    if (!comentario) {
      window.mostrarToast('Escribe algo para comentar', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/publicacion/${idPublicacion}/comentario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoActual, comentario })
      });

      const data = await res.json();
      
      if (res.ok) {
        textarea.value = '';
        window.mostrarToast('Comentario agregado', 'success');
        await cargarComentarios(idPublicacion);
        
        const btnComment = document.querySelector(`button[data-id="${idPublicacion}"].pub-btn-comment .pub-count`);
        if (btnComment) {
          const count = parseInt(btnComment.textContent) || 0;
          btnComment.textContent = count + 1;
        }
      } else {
        window.mostrarToast(data.error || 'Error al comentar', 'error');
      }
    } catch (err) {
      console.error('Error al comentar:', err);
      window.mostrarToast('Error de conexión', 'error');
    }
  }

  // FUNCIÓN PARA MOSTRAR FORMULARIO DE REPORTE
  window.mostrarFormReporte = function(idPublicacion) {
    if (!correoActual) {
      window.mostrarToast('Debes iniciar sesión para reportar', 'error');
      return;
    }

    const existingModal = document.getElementById('modalReporte');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'modalReporte';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content1">
        <div class="modal-header">
          <h5>Reportar publicación</h5>
          <button class="btn-close-modal" onclick="cerrarModalReporte()">&times;</button>
        </div>
        <div class="modal-body1">
          <p>¿Por qué reportas esta publicación?</p>
          <textarea id="motivoReporte" class="form-control" rows="4" placeholder="Describe el motivo del reporte (mínimo 10 caracteres)"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="cerrarModalReporte()">Cancelar</button>
          <button class="btn btn-danger" onclick="enviarReporte(${idPublicacion})">Reportar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  window.cerrarModalReporte = function() {
    const modal = document.getElementById('modalReporte');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  }

  window.enviarReporte = async function(idPublicacion) {
    const motivo = document.getElementById('motivoReporte').value.trim();

    if (!motivo || motivo.length < 10) {
      window.mostrarToast('El motivo debe tener al menos 10 caracteres', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/publicacion/${idPublicacion}/reportar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoActual, motivo })
      });

      const data = await res.json();

      if (res.ok) {
        window.mostrarToast('Reporte enviado correctamente', 'success');
        window.cerrarModalReporte();
      } else {
        window.mostrarToast(data.error || 'Error al enviar reporte', 'error');
      }
    } catch (err) {
      console.error('Error al reportar:', err);
      window.mostrarToast('Error de conexión', 'error');
    }
  }

  // Auto-ejecutar si existe el feed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
      if (document.getElementById("feedPublicaciones")) {
        await cargarLikesCache();
        await cargarUsuariosSeguidosCache();
        window.cargarPublicaciones();
      }
    });
  } else {
    if (document.getElementById("feedPublicaciones")) {
      (async () => {
        await cargarLikesCache();
        await cargarUsuariosSeguidosCache();
        window.cargarPublicaciones();
      })();
    }
  }

  async function verificarSiguiendo(idUsuario, btnElement) {
    if (!correoActual) return;

    if (usuariosSeguidosCache.has(idUsuario)) {
      btnElement.classList.add('siguiendo');
      btnElement.querySelector('i').className = 'bi bi-person-check-fill';
      btnElement.querySelector('span').textContent = 'Siguiendo';
      return;
    }

    try {
      const res = await fetch(`/api/siguiendo/${idUsuario}?correo=${encodeURIComponent(correoActual)}`);
      const data = await res.json();

      if (data.siguiendo) {
        usuariosSeguidosCache.add(idUsuario);
        btnElement.classList.add('siguiendo');
        btnElement.querySelector('i').className = 'bi bi-person-check-fill';
        btnElement.querySelector('span').textContent = 'Siguiendo';
      }
    } catch (err) {
      console.error('Error verificando seguimiento:', err);
    }
  }

  async function toggleSeguir(idUsuario, btnElement) {
    if (!correoActual) {
      window.mostrarToast('Debes iniciar sesión para seguir usuarios', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/seguir/${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoActual })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.siguiendo) {
          usuariosSeguidosCache.add(idUsuario);
        } else {
          usuariosSeguidosCache.delete(idUsuario);
        }

        document.querySelectorAll(`.btn-seguir[data-id-usuario="${idUsuario}"]`).forEach(btn => {
          if (data.siguiendo) {
            btn.classList.add('siguiendo');
            btn.querySelector('i').className = 'bi bi-person-check-fill';
            btn.querySelector('span').textContent = 'Siguiendo';
          } else {
            btn.classList.remove('siguiendo');
            btn.querySelector('i').className = 'bi bi-person-plus';
            btn.querySelector('span').textContent = 'Seguir';
          }
        });

        window.mostrarToast(data.message, 'success');
      } else {
        window.mostrarToast(data.error || 'Error al seguir', 'error');
      }
    } catch (err) {
      console.error('Error al seguir:', err);
      window.mostrarToast('Error de conexión', 'error');
    }
  }

  window.actualizarCacheSeguidos = function(idUsuario, siguiendo) {
    if (siguiendo) {
      usuariosSeguidosCache.add(idUsuario);
    } else {
      usuariosSeguidosCache.delete(idUsuario);
    }
  };

})();