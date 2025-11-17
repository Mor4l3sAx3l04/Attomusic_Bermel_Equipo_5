// feed-publicaciones.js

(function() {
  'use strict';

  let usuarioActual = window.getUsuarioActual();
  const correoActual = usuarioActual?.correo || null;

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
            ${pub.foto ? 
              `<img src="${pub.foto}" alt="${window.escapeHtml(pub.usuario)}" class="pub-avatar-img">` :
              `<div class="pub-avatar">${pub.usuario.charAt(0).toUpperCase()}</div>`
            }
            <div style="flex: 1;">
              <strong class="pub-username">@${window.escapeHtml(pub.usuario)}</strong>
              <small class="pub-fecha">${fechaFormateada}</small>
            </div>
            ${correoActual && pub.correo !== correoActual ? `
              <button class="btn-seguir" data-id-usuario="${pub.id_usuario}" data-correo="${pub.correo}">
                <i class="bi bi-person-plus"></i>
                <span>Seguir</span>
              </button>
            ` : ''}
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
          <button class="pub-btn pub-btn-like" data-id="${pub.id_publicacion}">
            <i class="bi bi-heart"></i>
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
          btnElement.classList.add('liked');
          icon.className = 'bi bi-heart-fill';
          count.textContent = currentCount + 1;
        } else {
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

// Auto-ejecutar si existe el feed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.getElementById("feedPublicaciones")) {
        window.cargarPublicaciones();
      }
    });
  } else {
    if (document.getElementById("feedPublicaciones")) {
      window.cargarPublicaciones();
    }
  }

  async function verificarSiguiendo(idUsuario, btnElement) {
  if (!correoActual) return;

  try {
    const res = await fetch(`/api/siguiendo/${idUsuario}?correo=${encodeURIComponent(correoActual)}`);
    const data = await res.json();

    if (data.siguiendo) {
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
        btnElement.classList.add('siguiendo');
        btnElement.querySelector('i').className = 'bi bi-person-check-fill';
        btnElement.querySelector('span').textContent = 'Siguiendo';
      } else {
        btnElement.classList.remove('siguiendo');
        btnElement.querySelector('i').className = 'bi bi-person-plus';
        btnElement.querySelector('span').textContent = 'Seguir';
      }
      window.mostrarToast(data.message, 'success');
    } else {
      window.mostrarToast(data.error || 'Error al seguir', 'error');
    }
  } catch (err) {
    console.error('Error al seguir:', err);
    window.mostrarToast('Error de conexión', 'error');
  }
}

})();