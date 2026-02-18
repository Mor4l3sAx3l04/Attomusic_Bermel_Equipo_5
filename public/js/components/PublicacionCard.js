/**
 * Componente reutilizable para tarjetas de publicación
 * Dependencias: utils.js (para formatearFecha, escapeHtml, etc.)
 */
(function () {
    'use strict';

    class PublicacionCard {
        constructor(pub, options = {}) {
            this.pub = pub;
            this.options = {
                esPerfilPropio: false,
                correoActual: null,
                yaLeDioLike: false,
                esSeguido: false,
                mostrarBotonesInteraccion: true, // Likes, comentarios
                mostrarBotonSeguir: true,
                mostrarOpcionesAdmin: false, // Editar/Eliminar (legacy shorthand)
                mostrarBotonEditar: false,
                mostrarBotonEliminar: false,
                mostrarBotonReportar: false,
                ...options
            };

            // Compatibilidad hacia atrás
            if (this.options.mostrarOpcionesAdmin) {
                this.options.mostrarBotonEditar = true;
                this.options.mostrarBotonEliminar = true;
            }

            this.element = this._createElement();
            this._attachEvents();
        }

        _createElement() {
            const article = document.createElement("article");
            article.className = "publicacion-item mb-4 fade-in";

            // Fondo personalizado
            if (this.pub.fondo_publicaciones) {
                article.style.backgroundImage = `url('${this.pub.fondo_publicaciones}')`;
                article.style.backgroundSize = "cover";
                article.style.backgroundPosition = "center";
                article.classList.add("has-custom-bg");
            }

            article.style.boxShadow = "inset 0 0 0 2000px rgba(0, 0, 0, 0.3)";

            const fecha = new Date(this.pub.fecha_pub || this.pub.fechaHora); // Soporte para ambos nombres de campo si varían
            const fechaFormateada = window.formatearFecha ? window.formatearFecha(fecha) : fecha.toLocaleDateString();

            article.innerHTML = `
        <div class="pub-header">
          ${this._renderHeader(fechaFormateada)}
        </div>
        
        <div class="pub-content">
          <p class="pub-text">${window.escapeHtml(this.pub.publicacion)}</p>
        </div>
        
        ${this._renderSongInfo()}
        
        ${this._renderFooter()}
      `;

            return article;
        }

        _renderHeader(fechaFormateada) {
            const { pub, options } = this;

            // Caso: Panel Admin o Perfil Propio (cuando se activan botones de gestión)
            if (options.mostrarBotonEditar || options.mostrarBotonEliminar) {
                return `
            <div class="pub-user-info">
             ${options.esPerfilPropio ? '' : `
              <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-user-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
                ${pub.foto ?
                            `<img src="${pub.foto}" alt="${window.escapeHtml(pub.usuario)}" class="pub-avatar-img">` :
                            `<div class="pub-avatar">${pub.usuario.charAt(0).toUpperCase()}</div>`
                        }
              </a>
             `}
              <div style="flex: 1;">
                 ${options.esPerfilPropio ? '' : `
                <a href="perfil-usuario.html?id=${pub.id_usuario}" class="pub-username-link load-page-perfil" data-id-usuario="${pub.id_usuario}">
                  <strong class="pub-username">@${window.escapeHtml(pub.usuario)}</strong>
                </a>
                `}
                <small class="pub-fecha">${fechaFormateada}</small>
              </div>
              <div class="pub-actions-inline">
                ${options.mostrarBotonEditar ? `
                <button class="btn-icon-action btn-editar" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>` : ''}
                ${options.mostrarBotonEliminar ? `
                <button class="btn-icon-action text-danger btn-eliminar" title="Eliminar">
                  <i class="bi bi-trash"></i>
                </button>` : ''}
              </div>
            </div>
        `;
            }

            return `
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
            ${this._renderFollowButton()}
            ${options.mostrarBotonReportar || (options.correoActual && !options.esPerfilPropio) ? `
              <button class="btn-icon-action btn-reportar" title="Reportar">
                <i class="bi bi-flag"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
        }

        _renderFollowButton() {
            const { pub, options } = this;
            if (!options.mostrarBotonSeguir || !options.correoActual || pub.correo === options.correoActual) return '';

            const isSiguiendo = options.esSeguido;
            return `
        <button class="btn-seguir ${isSiguiendo ? 'siguiendo' : ''}" data-id-usuario="${pub.id_usuario}">
          <i class="bi ${isSiguiendo ? 'bi-person-check-fill' : 'bi-person-plus'}"></i>
          <span>${isSiguiendo ? 'Siguiendo' : 'Seguir'}</span>
        </button>
      `;
        }

        _renderSongInfo() {
            const { pub } = this;
            if (!pub.cancion && !pub.nombre_cancion) return "";

            // Normalizar nombres de campos
            const nombreCancion = pub.cancion || pub.nombre_cancion || pub.nombre;
            const artista = pub.artista;
            const album = pub.album;
            const imagenCancion = pub.imagen_cancion || pub.imagenUrl;

            return `
        <div class="pub-cancion">
          ${imagenCancion ?
                    `<img src="${imagenCancion}" alt="cover" class="pub-cancion-img">` :
                    (window.crearImagenPlaceholder ? window.crearImagenPlaceholder() : '<div class="pub-cancion-icon">🎵</div>')
                }
          <div class="pub-cancion-info">
            <strong class="pub-cancion-nombre">${window.escapeHtml(nombreCancion)}</strong>
            <p class="pub-cancion-artista">${window.escapeHtml(artista || '')}</p>
            ${album ? `<small class="pub-cancion-album">${window.escapeHtml(album)}</small>` : ''}
          </div>
        </div>
      `;
        }

        _renderFooter() {
            const { pub, options } = this;

            if (!options.mostrarBotonesInteraccion) {
                return `
            <div class="pub-stats">
            <span><i class="bi bi-heart-fill"></i> ${pub.likes || 0}</span>
            <span><i class="bi bi-chat-fill"></i> ${pub.comentarios || 0}</span>
            </div>
        `;
            }

            if (options.esPerfilPropio) {
                return `
          <div class="pub-stats">
            <span><i class="bi bi-heart-fill"></i> ${pub.likes || 0}</span>
            <span><i class="bi bi-chat-fill"></i> ${pub.comentarios || 0}</span>
          </div>
        `;
            }

            const likedClass = options.yaLeDioLike ? 'liked' : '';
            const heartIcon = options.yaLeDioLike ? 'bi-heart-fill' : 'bi-heart';

            return `
        <div class="pub-actions">
          <button class="pub-btn pub-btn-like ${likedClass}" data-id="${pub.id_publicacion}">
            <i class="bi ${heartIcon}"></i>
            <span class="pub-count">${pub.likes || 0}</span>
          </button>
          
          <button class="pub-btn pub-btn-comment" data-id="${pub.id_publicacion}">
            <i class="bi bi-chat"></i>
            <span class="pub-count">${pub.comentarios || 0}</span>
          </button>
        </div>
        
        <div class="pub-comentarios" id="comentarios-${pub.id_publicacion}" style="display:none;">
          <div class="comentarios-lista"></div>
          ${options.correoActual ? `
            <div class="comentario-form mt-3">
              <textarea class="form-control form-control-sm mb-2 txt-comentario" placeholder="Escribe un comentario..." rows="2"></textarea>
              <div class="error-comentario" style="color:red; display:none;"></div>
              <button class="btn btn-sm btn-gradient btn-enviar-comentario">Comentar</button>
            </div>
          ` : '<p class="text-muted small">Inicia sesión para comentar</p>'}
        </div>
      `;
        }

        _attachEvents() {
            const { pub, options, element } = this;

            // Eventos de Perfil Propio (Editar/Eliminar)
            if (options.esPerfilPropio || options.mostrarOpcionesAdmin) {
                const btnEditar = element.querySelector('.btn-editar');
                if (btnEditar) {
                    btnEditar.addEventListener('click', () => {
                        if (window.editarPublicacion) window.editarPublicacion(pub.id_publicacion, pub.publicacion);
                    });
                }

                const btnEliminar = element.querySelector('.btn-eliminar');
                if (btnEliminar) {
                    btnEliminar.addEventListener('click', () => {
                        if (window.eliminarPublicacion) window.eliminarPublicacion(pub.id_publicacion);
                    });
                }
            }
            // Eventos de Feed (Like, Comentar, Seguir, Reportar)
            else if (options.mostrarBotonesInteraccion) {
                // Like
                const btnLike = element.querySelector('.pub-btn-like');
                if (btnLike) {
                    btnLike.addEventListener('click', () => this._handleLike(btnLike));
                }

                // Comentarios
                const btnComment = element.querySelector('.pub-btn-comment');
                if (btnComment) {
                    btnComment.addEventListener('click', () => this._toggleComentarios());
                }

                const btnEnviarComentario = element.querySelector('.btn-enviar-comentario');
                if (btnEnviarComentario) {
                    btnEnviarComentario.addEventListener('click', () => this._enviarComentario());
                }

                // Seguir
                const btnSeguir = element.querySelector('.btn-seguir');
                if (btnSeguir) {
                    btnSeguir.addEventListener('click', () => this._handleSeguir(btnSeguir));
                }

                // Reportar
                const btnReportar = element.querySelector('.btn-reportar');
                if (btnReportar) {
                    btnReportar.addEventListener('click', () => {
                        if (window.mostrarFormReporte) window.mostrarFormReporte(pub.id_publicacion);
                    });
                }
            }

            // Navegación a perfil
            element.querySelectorAll('.load-page-perfil').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = link.getAttribute('data-id-usuario');
                    if (window.loadPage) window.loadPage(`perfil-usuario.html?id=${id}`);
                    else window.location.href = `perfil-usuario.html?id=${id}`;
                });
            });
        }

        async _handleLike(btn) {
            if (!this.options.correoActual) {
                if (window.mostrarToast) window.mostrarToast('Debes iniciar sesión para dar like', 'error');
                return;
            }

            const idPublicacion = this.pub.id_publicacion;
            try {
                const res = await fetch(`/api/publicacion/${idPublicacion}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: this.options.correoActual })
                });
                const data = await res.json();

                if (res.ok) {
                    const icon = btn.querySelector('i');
                    const count = btn.querySelector('.pub-count');
                    const currentCount = parseInt(count.textContent) || 0;

                    if (data.liked) {
                        btn.classList.add('liked');
                        icon.className = 'bi bi-heart-fill';
                        count.textContent = currentCount + 1;
                        this.options.yaLeDioLike = true;
                    } else {
                        btn.classList.remove('liked');
                        icon.className = 'bi bi-heart';
                        count.textContent = Math.max(0, currentCount - 1);
                        this.options.yaLeDioLike = false;
                    }
                } else {
                    if (window.mostrarToast) window.mostrarToast(data.error || 'Error al dar like', 'error');
                }
            } catch (err) {
                console.error(err);
            }
        }

        async _toggleComentarios() {
            const comentariosDiv = this.element.querySelector(`#comentarios-${this.pub.id_publicacion}`);
            if (!comentariosDiv) return;

            if (comentariosDiv.style.display === 'none') {
                comentariosDiv.style.display = 'block';
                this._cargarComentarios(comentariosDiv);
            } else {
                comentariosDiv.style.display = 'none';
            }
        }

        async _cargarComentarios(container) {
            const lista = container.querySelector('.comentarios-lista');
            lista.innerHTML = '<p class="text-muted small">Cargando comentarios...</p>';
            try {
                const res = await fetch(`/api/publicacion/${this.pub.id_publicacion}/comentarios`);
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
                    <small>${window.formatearFecha ? window.formatearFecha(fecha) : fecha.toLocaleDateString()}</small>
                  </div>
                  <p class="comentario-text">${window.escapeHtml(com.comentario)}</p>
                `;
                    lista.appendChild(div);
                });
            } catch (err) {
                lista.innerHTML = '<p class="text-danger small">Error al cargar comentarios</p>';
            }
        }

        async _enviarComentario() {
            const textarea = this.element.querySelector('.txt-comentario');
            const errorDiv = this.element.querySelector('.error-comentario');
            const comentario = textarea.value.trim();

            if (!comentario) {
                if (window.mostrarToast) window.mostrarToast('Escribe algo', 'error');
                return;
            }

            try {
                const res = await fetch(`/api/publicacion/${this.pub.id_publicacion}/comentario`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: this.options.correoActual, comentario })
                });
                const data = await res.json();

                if (res.ok) {
                    textarea.value = '';
                    if (window.mostrarToast) window.mostrarToast('Comentario agregado', 'success');
                    this._cargarComentarios(this.element.querySelector(`#comentarios-${this.pub.id_publicacion}`));

                    // Actualizar contador
                    const btnCount = this.element.querySelector('.pub-btn-comment .pub-count');
                    if (btnCount) btnCount.textContent = (parseInt(btnCount.textContent) || 0) + 1;
                } else {
                    errorDiv.textContent = data.error;
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
            }
        }

        async _handleSeguir(btn) {
            if (!this.options.correoActual) {
                if (window.mostrarToast) window.mostrarToast('Inicia sesión para seguir', 'error');
                return;
            }

            try {
                const res = await fetch(`/api/seguir/${this.pub.id_usuario}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: this.options.correoActual })
                });
                const data = await res.json();

                if (res.ok) {
                    if (data.siguiendo) {
                        btn.classList.add('siguiendo');
                        btn.querySelector('i').className = 'bi bi-person-check-fill';
                        btn.querySelector('span').textContent = 'Siguiendo';
                        this.options.esSeguido = true;
                        // Actualizar cache global si existe
                        if (window.actualizarCacheSeguidos) window.actualizarCacheSeguidos(this.pub.id_usuario, true);
                    } else {
                        btn.classList.remove('siguiendo');
                        btn.querySelector('i').className = 'bi bi-person-plus';
                        btn.querySelector('span').textContent = 'Seguir';
                        this.options.esSeguido = false;
                        if (window.actualizarCacheSeguidos) window.actualizarCacheSeguidos(this.pub.id_usuario, false);
                    }
                    if (window.mostrarToast) window.mostrarToast(data.message, 'success');

                    // Actualizar otros botones del mismo usuario en la página
                    document.querySelectorAll(`.btn-seguir[data-id-usuario="${this.pub.id_usuario}"]`).forEach(b => {
                        if (b !== btn) {
                            // Sincronizar estado visual
                            if (data.siguiendo) {
                                b.classList.add('siguiendo');
                                b.querySelector('i').className = 'bi bi-person-check-fill';
                                b.querySelector('span').textContent = 'Siguiendo';
                            } else {
                                b.classList.remove('siguiendo');
                                b.querySelector('i').className = 'bi bi-person-plus';
                                b.querySelector('span').textContent = 'Seguir';
                            }
                        }
                    });

                } else {
                    if (window.mostrarToast) window.mostrarToast(data.error, 'error');
                }
            } catch (err) {
                console.error(err);
            }
        }

    }

    // Exponer a global
    window.PublicacionCard = PublicacionCard;

})();
