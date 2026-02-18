// public/js/explorar.js
(function () {
  'use strict';

  const usuarioActual = window.getUsuarioActual ? window.getUsuarioActual() : null;
  const correoActual = usuarioActual?.correo || null;

  //console.log('explorar.js cargado, usuario:', correoActual);

  // ========== PERFILES POPULARES ==========
  window.cargarPerfilesPopulares = async function () {
    //console.log('Cargando perfiles populares...');
    const container = document.getElementById('listaPerfilesPopulares');

    if (!container) {
      console.error(' No se encontró el contenedor listaPerfilesPopulares');
      return;
    }

    try {
      container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Cargando perfiles...</p></div>';

      const res = await fetch('/api/usuarios/populares?limit=20');
      //console.log(' Respuesta fetch perfiles:', res.status);

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const usuarios = await res.json();
      //console.log(' Usuarios recibidos:', usuarios.length);

      container.innerHTML = '';

      if (usuarios.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-5">No hay usuarios disponibles</p>';
        return;
      }

      usuarios.forEach((user, index) => {
        const card = crearTarjetaUsuario(user, index + 1);
        container.appendChild(card);
      });

      //console.log('Perfiles cargados correctamente');

    } catch (err) {
      console.error(' Error cargando perfiles populares:', err);
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle"></i>
          <p class="mb-0">Error al cargar perfiles: ${err.message}</p>
        </div>
      `;
    }
  };

  function crearTarjetaUsuario(user, posicion) {
    const div = document.createElement('div');
    div.className = 'perfil-card mb-3 fade-in';

    const esTuPerfil = correoActual && user.correo === correoActual;
    const medallaIcon = posicion <= 3 ? getMedallaIcon(posicion) : `<span class="posicion-numero">#${posicion}</span>`;

    // LOGICA DEL FONDO: Si no hay fondo_perfil, usamos el degradado morado por defecto
    const fondoStyle = user.fondo_perfil
      ? `background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${user.fondo_perfil}');`
      : `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`;

    div.innerHTML = `
      <div class="perfil-card-banner" style="${fondoStyle}"></div>
      
      <div class="perfil-card-content">
        <div class="perfil-ranking">${medallaIcon}</div>
        
        <div class="perfil-avatar-container">
          ${user.foto ?
        `<img src="${user.foto}" alt="${window.escapeHtml(user.usuario)}" class="perfil-avatar-img">` :
        `<div class="perfil-avatar-placeholder">${user.usuario.charAt(0).toUpperCase()}</div>`
      }
        </div>
        
        <div class="perfil-info">
          <h5 class="perfil-username">@${window.escapeHtml(user.usuario)}</h5>
          <p class="perfil-stats">
            <i class="bi bi-people-fill"></i> ${user.num_seguidores} seguidores
          </p>
        </div>
        
        <div class="perfil-actions">
          ${!esTuPerfil && correoActual ? `
            <button class="btn-seguir-perfil" data-id-usuario="${user.id_usuario}">
              <i class="bi bi-person-plus"></i>
              <span>Seguir</span>
            </button>
          ` : ''}
          <a href="perfil-usuario.html?id=${user.id_usuario}" class="btn-ver-perfil load-page-perfil" data-id="${user.id_usuario}">
            <i class="bi bi-eye"></i>
          </a>
        </div>
      </div>
    `;

    // Event listeners
    const btnSeguir = div.querySelector('.btn-seguir-perfil');
    if (btnSeguir) {
      verificarSiguiendoPerfil(user.id_usuario, btnSeguir);
      btnSeguir.addEventListener('click', () => toggleSeguirPerfil(user.id_usuario, btnSeguir));
    }

    return div;
  }

  function getMedallaIcon(posicion) {
    const medallas = {
      1: '<i class="bi bi-trophy-fill" style="color: #FFD700; font-size: 1.5rem;"></i>',
      2: '<i class="bi bi-trophy-fill" style="color: #C0C0C0; font-size: 1.3rem;"></i>',
      3: '<i class="bi bi-trophy-fill" style="color: #CD7F32; font-size: 1.2rem;"></i>'
    };
    return medallas[posicion] || '';
  }

  async function verificarSiguiendoPerfil(idUsuario, btnElement) {
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

  async function toggleSeguirPerfil(idUsuario, btnElement) {
    if (!correoActual) {
      if (window.mostrarToast) {
        window.mostrarToast('Debes iniciar sesión para seguir usuarios', 'error');
      } else {
        alert('Debes iniciar sesión para seguir usuarios');
      }
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
        if (window.mostrarToast) {
          window.mostrarToast(data.message, 'success');
        }
      }
    } catch (err) {
      console.error('Error al seguir:', err);
      if (window.mostrarToast) {
        window.mostrarToast('Error de conexión', 'error');
      }
    }
  }

  // ========== PUBLICACIONES DESTACADAS ==========
  window.cargarPublicacionesDestacadas = async function () {
    //console.log('Cargando publicaciones destacadas...');
    const container = document.getElementById('listaPublicacionesDestacadas');

    if (!container) {
      console.error(' No se encontró el contenedor listaPublicacionesDestacadas');
      return;
    }

    try {
      container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Cargando publicaciones...</p></div>';

      const res = await fetch('/api/publicaciones/destacadas?limit=20');
      //console.log('Respuesta fetch destacadas:', res.status);

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const publicaciones = await res.json();
      //console.log(' Publicaciones recibidas:', publicaciones.length);

      container.innerHTML = '';

      if (publicaciones.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-star" style="font-size: 4rem; color: #ccc;"></i>
            <p class="text-muted mt-3">No hay publicaciones destacadas aún</p>
          </div>
        `;
        return;
      }

      const escapeHtml = window.escapeHtml || ((text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      });

      const formatearFecha = window.formatearFecha || ((fecha) => {
        return fecha.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      });

      publicaciones.forEach(pub => {
        const article = document.createElement('article');
        article.className = 'publicacion-item mb-4 fade-in';

        const fecha = new Date(pub.fecha_pub);
        const fechaFormateada = formatearFecha(fecha);

        article.innerHTML = `
          <div class="pub-header">
            <div class="pub-user-info">
              <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-user-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
                ${pub.foto ?
            `<img src="${pub.foto}" alt="${escapeHtml(pub.usuario)}" class="pub-avatar-img">` :
            `<div class="pub-avatar">${pub.usuario.charAt(0).toUpperCase()}</div>`
          }
              </a>
              <div style="flex: 1;">
                <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-username-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
                  <strong class="pub-username">@${escapeHtml(pub.usuario)}</strong>
                </a>
                <small class="pub-fecha">${fechaFormateada}</small>
              </div>
            </div>
          </div>
          
          <div class="pub-content">
            <p class="pub-text">${escapeHtml(pub.publicacion)}</p>
          </div>
          
          ${pub.cancion ? `
            <div class="pub-cancion">
              ${pub.imagen_cancion ?
              `<img src="${pub.imagen_cancion}" alt="cover" class="pub-cancion-img">` :
              ''
            }
              <div class="pub-cancion-info">
                <strong class="pub-cancion-nombre">${escapeHtml(pub.cancion)}</strong>
                <p class="pub-cancion-artista">${escapeHtml(pub.artista || '')}</p>
              </div>
            </div>
          ` : ""}
          
          <div class="pub-stats">
            <span><i class="bi bi-heart-fill text-danger"></i> ${pub.likes || 0}</span>
            <span><i class="bi bi-chat-fill text-primary"></i> ${pub.comentarios || 0}</span>
          </div>
        `;

        container.appendChild(article);
      });

      //console.log(' Publicaciones destacadas cargadas');

    } catch (err) {
      console.error(' Error cargando publicaciones destacadas:', err);
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle"></i>
          <p class="mb-0">Error al cargar publicaciones: ${err.message}</p>
        </div>
      `;
    }
  };

  // ========== PUBLICACIONES DE SIGUIENDO ==========
  window.cargarPublicacionesSiguiendo = async function () {
    //console.log(' Cargando publicaciones de seguidos...');
    const container = document.getElementById('listaPublicacionesSiguiendo');

    if (!container) {
      console.error(' No se encontró el contenedor listaPublicacionesSiguiendo');
      return;
    }

    if (!correoActual) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-person-x" style="font-size: 4rem; color: #ccc;"></i>
          <p class="text-muted mt-3">Debes iniciar sesión para ver esta sección</p>
        </div>
      `;
      return;
    }

    try {
      container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Cargando publicaciones...</p></div>';

      const res = await fetch(`/api/publicaciones/siguiendo?correo=${encodeURIComponent(correoActual)}`);
      //console.log(' Respuesta fetch siguiendo:', res.status);

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const publicaciones = await res.json();
      //console.log(' Publicaciones de seguidos recibidas:', publicaciones.length);

      container.innerHTML = '';

      if (publicaciones.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5">
            <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
            <p class="text-muted mt-3">Los usuarios que sigues no han publicado nada aún</p>
            <small class="text-muted">Comienza a seguir a más usuarios para ver sus publicaciones aquí</small>
          </div>
        `;
        return;
      }

      const escapeHtml = window.escapeHtml || ((text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      });

      const formatearFecha = window.formatearFecha || ((fecha) => {
        return fecha.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      });

      publicaciones.forEach(pub => {
        if (window.PublicacionCard) {
          const card = new window.PublicacionCard(pub, {
            mostrarBotonesInteraccion: false, // No tenemos cache de likes aquí
            mostrarBotonSeguir: false, // Ya estamos en destacados o siguiendo
            esPerfilPropio: false, // Asumimos false
            correoActual: correoActual
          });
          container.appendChild(card.element);
        }
      });

      //console.log(' Publicaciones de seguidos cargadas');

    } catch (err) {
      console.error(' Error cargando publicaciones de seguidos:', err);
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle"></i>
          <p class="mb-0">Error al cargar publicaciones: ${err.message}</p>
        </div>
      `;
    }
  };

  document.addEventListener("shown.bs.tab", function (e) {
    const target = e.target.getAttribute("data-bs-target");

    if (target === "#seccion-perfiles") cargarPerfilesPopulares();
    if (target === "#seccion-destacadas") cargarPublicacionesDestacadas();
    if (target === "#seccion-siguiendo") cargarPublicacionesSiguiendo();
  });

  // Ejecutar la comprobación del tab activo (sea que DOMContentLoaded ya pasó o no)
  function cargarSeccionInicialSiCorresponde() {
    try {
      //console.log(' Comprobando tab activo al inicio...');
      const activeTab = document.querySelector(".nav-link.active");

      if (!activeTab) {
        console.warn(' No se encontró .nav-link.active');
        return;
      }

      const target = activeTab.getAttribute("data-bs-target");
      //console.log('➡ Tab activo detectado:', activeTab.id || activeTab.textContent.trim(), '->', target);

      if (target === "#seccion-perfiles") {
        cargarPerfilesPopulares();
      } else if (target === "#seccion-destacadas") {
        cargarPublicacionesDestacadas();
      } else if (target === "#seccion-siguiendo") {
        cargarPublicacionesSiguiendo();
      } else {
        //console.log('ℹ Ninguna sección a cargar para target:', target);
      }
    } catch (err) {
      console.error(' Error en cargarSeccionInicialSiCorresponde:', err);
    }
  }

  // Si el DOM ya se cargó, ejecutar ahora; si no, esperar DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarSeccionInicialSiCorresponde);
  } else {
    // DOM ya listo — ejecutar inmediatamente
    cargarSeccionInicialSiCorresponde();
  }

  // Re-ejecutar la carga inicial si se vuelve a la sección Explorar
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      //console.log(" Volviste a esta sección — revisando tab activo...");
      cargarSeccionInicialSiCorresponde();
    }
  });

  window.init_explorar = function () {
    //console.log(" Reinicializando explorar.js...");
    cargarSeccionInicialSiCorresponde();
  };

  // Listener global para cargar el perfil como SPA
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".load-page-perfil");
    if (!link) return;

    e.preventDefault();

    const idUsuario = link.getAttribute("data-id") ||
      link.getAttribute("data-id-usuario") ||
      new URL(link.href).searchParams.get("id");

    if (!idUsuario) {
      console.error(" No se encontró el ID de usuario en load-page-perfil");
      return;
    }

    if (typeof loadPage === "function") {
      loadPage(`perfil-usuario.html?id=${idUsuario}`);
    } else {
      console.warn(" loadPage no está disponible, abriendo normal");
      window.location.href = `perfil-usuario.html?id=${idUsuario}`;
    }
  });


})();