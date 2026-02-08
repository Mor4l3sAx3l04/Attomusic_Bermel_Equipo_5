// feed-publicaciones.js OPTIMIZADO CON INFINITE SCROLL

(function() {
  'use strict';

  let usuarioActual = window.getUsuarioActual();
  const correoActual = usuarioActual?.correo || null;

  // ========== CONFIGURACIÓN DE PAGINACIÓN ==========
  const PUBLICACIONES_POR_PAGINA = 10;
  let paginaActual = 0;
  let cargando = false;
  let hayMasPublicaciones = true;
  let todasLasPublicaciones = []; // Caché local
  let ultimaPeticion = 0;
  const TIEMPO_MIN_ENTRE_PETICIONES = 2000; // 2 segundos entre peticiones

  // Cache de likes y seguidos del usuario
  let userLikesCache = new Set();
  let usuariosSeguidosCache = new Set();

  // ========== CACHÉ Y OPTIMIZACIÓN ==========
  
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

  // ========== INFINITE SCROLL ==========

  function setupInfiniteScroll() {
    const feed = document.getElementById("feedPublicaciones");
    if (!feed) return;

    // Remover observer anterior si existe
    if (window._scrollObserver) {
      window._scrollObserver.disconnect();
    }

    // Crear o actualizar elemento de loading
    let loadingDiv = document.getElementById('loading-more');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'loading-more';
      loadingDiv.className = 'text-center py-4';
      
      // IMPORTANTE: Insertar DESPUÉS del feed, no dentro
      if (feed.parentElement) {
        feed.parentElement.appendChild(loadingDiv);
      }
    }

    loadingDiv.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando más...</span>
      </div>
      <p class="text-muted mt-2">Cargando más publicaciones...</p>
    `;
    loadingDiv.style.display = 'none';

    // Intersection Observer mejorado
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !cargando && hayMasPublicaciones) {
          ('🔄 Intersection Observer activado - Cargando más...');
          cargarSiguientePagina();
        }
      });
    }, {
      root: null,
      rootMargin: '100px', // Reducido de 200px a 100px
      threshold: 0.1
    });

    observer.observe(loadingDiv);
    window._scrollObserver = observer;

    // FALLBACK: Detectar scroll manual por si el Observer falla
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        // Si está a 300px del final
        if (scrollHeight - scrollTop - clientHeight < 300) {
          if (!cargando && hayMasPublicaciones) {
            //console.log(' Scroll fallback activado - Cargando más...');
            cargarSiguientePagina();
          }
        }
      }, 100);
    });
  }

  // ========== BÚSQUEDA ==========
  
  window.buscarPublicaciones = async function(query) {
    const feed = document.getElementById("feedPublicaciones");
    
    if (!query || query.trim().length === 0) {
      // Si se limpia la búsqueda, resetear y cargar desde caché
      paginaActual = 0;
      hayMasPublicaciones = true;
      feed.innerHTML = "";
      renderizarPublicacionesPaginadas();
      return;
    }

    // Control de rate limiting
    const ahora = Date.now();
    if (ahora - ultimaPeticion < TIEMPO_MIN_ENTRE_PETICIONES) {
      //console.log('Esperando antes de hacer búsqueda...');
      return;
    }
    ultimaPeticion = ahora;

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

      // Renderizar resultados de búsqueda
      data.forEach(pub => {
        const article = crearPublicacion(pub, false);
        feed.appendChild(article);
      });

    } catch (err) {
      console.error("Error en búsqueda:", err);
      feed.innerHTML = `<p class="text-danger">Error al buscar publicaciones.</p>`;
    }
  }

  // ========== CARGA INICIAL Y PAGINADA ==========

    window.cargarPublicaciones = async function(filtroCorreo = null) {
    const feed = document.getElementById("feedPublicaciones") || document.getElementById("misPublicaciones");
    
    if (!feed) {
      console.error("No se encontró el contenedor de publicaciones");
      return;
    }

    try {
      feed.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
      
      // Resetear estado
      paginaActual = 0;
      hayMasPublicaciones = true;
      todasLasPublicaciones = []; // Limpiar caché
      
      // Si es perfil, cargar todas de una vez (sin cambios)
      if (filtroCorreo) {
        const url = `/api/perfil/${filtroCorreo}/publicaciones`;
        const res = await fetch(url);
        
        if (!res.ok) {
          console.error("Error al cargar publicaciones:", res.status);
          feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones</p>`;
          return;
        }

        const data = await res.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          feed.innerHTML = `<div class="text-center py-5"><i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i><p class="text-muted mt-3">Aún no tienes publicaciones</p></div>`;
          return;
        }

        feed.innerHTML = "";
        data.forEach(pub => {
          const article = crearPublicacion(pub, true);
          feed.appendChild(article);
        });
        
      } else {
        // Feed principal: cargar primera página desde el servidor
        feed.innerHTML = "";
        await cargarSiguientePagina();
        setupInfiniteScroll();
      }

    } catch (err) {
      console.error("Error cargando publicaciones:", err);
      feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones.</p>`;
    }
  }

 // Cargar siguiente página DESDE EL SERVIDOR
  async function cargarSiguientePagina() {
    if (cargando || !hayMasPublicaciones) {
      //console.log(` Carga bloqueada - Cargando: ${cargando}, Hay más: ${hayMasPublicaciones}`);
      return;
    }

    // Control de rate limiting
    const ahora = Date.now();
    if (ahora - ultimaPeticion < TIEMPO_MIN_ENTRE_PETICIONES) {
      //console.log('Esperando antes de cargar más publicaciones...');
      return;
    }
    ultimaPeticion = ahora;

    cargando = true;
    const loadingDiv = document.getElementById('loading-more');
    if (loadingDiv) {
      loadingDiv.style.display = 'block';
    }

    //console.log(` Solicitando página ${paginaActual}...`);

    try {
      //  PETICIÓN AL BACKEND con paginación
      const url = `/api/publicaciones?pagina=${paginaActual}&limite=${PUBLICACIONES_POR_PAGINA}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      //console.log('Datos recibidos:', data);
      
      // Renderizar publicaciones
      const feed = document.getElementById("feedPublicaciones");
      if (!feed) {
        console.error('Feed no encontrado');
        return;
      }

      if (data.publicaciones && data.publicaciones.length > 0) {
        //console.log(`Renderizando ${data.publicaciones.length} publicaciones...`);
        
        data.publicaciones.forEach(pub => {
          const article = crearPublicacion(pub, false);
          feed.appendChild(article);
        });

        paginaActual++;
        hayMasPublicaciones = data.hayMas;
        
        //console.log(`Página ${paginaActual - 1} cargada | Total mostrado: ${paginaActual * PUBLICACIONES_POR_PAGINA} | Hay más: ${hayMasPublicaciones}`);
        
      } else {
        //console.log(' No hay más publicaciones en la respuesta');
        hayMasPublicaciones = false;
      }

      // Actualizar UI del loading
      if (!hayMasPublicaciones && loadingDiv) {
        loadingDiv.innerHTML = '<p class="text-muted">✓ No hay más publicaciones</p>';
        setTimeout(() => {
          loadingDiv.style.display = 'none';
        }, 2000);
      } else if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

    } catch (err) {
      console.error('Error cargando siguiente página:', err);
      hayMasPublicaciones = false;
      if (window.mostrarToast) {
        window.mostrarToast('Error al cargar más publicaciones', 'error');
      }
    } finally {
      cargando = false;
    }
  }

  // ========== CREAR PUBLICACIÓN HTML ==========

  function crearPublicacion(pub, esPerfilPropio = false) {
    console.log("Datos de la publicación:",pub);
    const article = document.createElement("article");
    article.className = "publicacion-item mb-4 fade-in";

    if (pub.fondo_publicaciones) {
        article.style.backgroundImage = `url(${pub.fondo_publicaciones})`;
        article.style.backgroundSize = "cover";
        article.style.backgroundPosition = "center";
        article.classList.add("has-custom-bg"); // Clase para estilos CSS
    }

    article.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.3)";
    
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
                <div id="error-comentario-${pub.id_publicacion}" class="error-comentario" style="color:red; display:none;"></div>
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

  // ========== LIKES ==========

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

  // ========== COMENTARIOS ==========

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
    const errorDiv = document.getElementById(`error-comentario-${idPublicacion}`);
    
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

      if (!res.ok) {
        errorDiv.textContent = data.error;
        errorDiv.style.display = "block";
        return;
      }
      
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

  // ========== REPORTES ==========

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

  // ========== SEGUIR/DEJAR DE SEGUIR ==========

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

  window.crearPublicacionHTML = crearPublicacion;

  // ========== INICIALIZACIÓN ==========

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

})();