    // feed-publicaciones.js
    console.log("✅ feed-publicaciones.js cargado");

    let usuarioActual = null;

    // Obtener usuario actual del localStorage
    try {
    const usuarioLS = JSON.parse(localStorage.getItem("usuario"));
    usuarioActual = usuarioLS?.correo || usuarioLS?.usuario || localStorage.getItem("correoUsuario");
    } catch (err) {
    console.warn("No se pudo obtener usuario del localStorage");
    }

    async function cargarPublicaciones() {
    const feed = document.getElementById("feedPublicaciones");
    
    if (!feed) {
        console.error("❌ No se encontró #feedPublicaciones");
        return;
    }

    try {
        feed.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
        
        const res = await fetch("/api/publicaciones");
        
        if (!res.ok) {
        console.error("❌ Error al cargar publicaciones:", res.status);
        feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones (status ${res.status})</p>`;
        return;
        }

        const data = await res.json();
        feed.innerHTML = "";
        
        if (!Array.isArray(data) || data.length === 0) {
        feed.innerHTML = `<p class="text-muted">Aún no hay publicaciones.</p>`;
        return;
        }

        // Obtener likes del usuario actual
        const userLikes = await obtenerLikesUsuario();

        data.forEach(pub => {
        const article = crearPublicacion(pub, userLikes);
        feed.appendChild(article);
        });

    } catch (err) {
        console.error("❌ Error cargando publicaciones:", err);
        feed.innerHTML = `<p class="text-danger">Error al cargar publicaciones.</p>`;
    }
    }

    async function obtenerLikesUsuario() {
    // Por ahora retornamos un Set vacío, esto se puede mejorar con una ruta específica
    return new Set();
    }

    function crearPublicacion(pub, userLikes) {
    const article = document.createElement("article");
    article.className = "publicacion-item mb-4 fade-in";
    
    const fecha = new Date(pub.fecha_pub);
    const fechaFormateada = formatearFecha(fecha);
    
    const hasLiked = userLikes.has(pub.id_publicacion);
    
    // Obtener imagen de la canción desde Spotify
    const imagenCancion = pub.id_cancion 
        ? `https://i.scdn.co/image/${pub.id_cancion}` 
        : 'images/default-song.png';

    article.innerHTML = `
        <div class="pub-header">
        <div class="pub-user-info">
            <div class="pub-avatar">${pub.usuario.charAt(0).toUpperCase()}</div>
            <div>
            <strong class="pub-username">@${escapeHtml(pub.usuario)}</strong>
            <small class="pub-fecha">${fechaFormateada}</small>
            </div>
        </div>
        </div>
        
        <div class="pub-content">
        <p class="pub-text">${escapeHtml(pub.publicacion)}</p>
        </div>
        
        ${pub.cancion ? `
        <div class="pub-cancion">
            <img src="${pub.imagen_url || pub.imagen_cancion || 'images/default-song.png'}" alt="cover" class="pub-cancion-img" onerror="this.src='images/default-song.png'">
            <div class="pub-cancion-info">
            <strong class="pub-cancion-nombre">${escapeHtml(pub.cancion)}</strong>
            <p class="pub-cancion-artista">${escapeHtml(pub.artista || '')}</p>
            ${pub.album ? `<small class="pub-cancion-album">${escapeHtml(pub.album)}</small>` : ''}
            </div>
        </div>
        ` : ""}
        
        <div class="pub-actions">
        <button class="pub-btn pub-btn-like ${hasLiked ? 'liked' : ''}" data-id="${pub.id_publicacion}">
            <i class="bi bi-heart${hasLiked ? '-fill' : ''}"></i>
            <span class="pub-count">${pub.likes || 0}</span>
        </button>
        
        <button class="pub-btn pub-btn-comment" data-id="${pub.id_publicacion}">
            <i class="bi bi-chat"></i>
            <span class="pub-count">${pub.comentarios || 0}</span>
        </button>
        </div>
        
        <div class="pub-comentarios" id="comentarios-${pub.id_publicacion}" style="display:none;">
        <div class="comentarios-lista"></div>
        ${usuarioActual ? `
            <div class="comentario-form mt-3">
            <textarea class="form-control form-control-sm mb-2" placeholder="Escribe un comentario..." rows="2" id="txt-comentario-${pub.id_publicacion}"></textarea>
            <button class="btn btn-sm btn-gradient" onclick="enviarComentario(${pub.id_publicacion})">Comentar</button>
            </div>
        ` : '<p class="text-muted small">Inicia sesión para comentar</p>'}
        </div>
    `;
    
    // Event listeners
    const btnLike = article.querySelector('.pub-btn-like');
    const btnComment = article.querySelector('.pub-btn-comment');
    
    if (btnLike) {
        btnLike.addEventListener('click', () => toggleLike(pub.id_publicacion, btnLike));
    }
    
    if (btnComment) {
        btnComment.addEventListener('click', () => toggleComentarios(pub.id_publicacion));
    }
    
    return article;
    }

    async function toggleLike(idPublicacion, btnElement) {
    if (!usuarioActual) {
        mostrarToast('Debes iniciar sesión para dar like', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/publicacion/${idPublicacion}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuarioActual })
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
        mostrarToast(data.error || 'Error al dar like', 'error');
        }
    } catch (err) {
        console.error('Error al dar like:', err);
        mostrarToast('Error de conexión', 'error');
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
            <strong>@${escapeHtml(com.usuario)}</strong>
            <small>${formatearFecha(fecha)}</small>
            </div>
            <p class="comentario-text">${escapeHtml(com.comentario)}</p>
        `;
        lista.appendChild(div);
        });
    } catch (err) {
        console.error('Error cargando comentarios:', err);
        lista.innerHTML = '<p class="text-danger small">Error al cargar comentarios</p>';
    }
    }

    async function enviarComentario(idPublicacion) {
    if (!usuarioActual) {
        mostrarToast('Debes iniciar sesión para comentar', 'error');
        return;
    }

    const textarea = document.getElementById(`txt-comentario-${idPublicacion}`);
    const comentario = textarea.value.trim();
    
    if (!comentario) {
        mostrarToast('Escribe algo para comentar', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/publicacion/${idPublicacion}/comentario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuarioActual, comentario })
        });

        const data = await res.json();
        
        if (res.ok) {
        textarea.value = '';
        mostrarToast('Comentario agregado', 'success');
        await cargarComentarios(idPublicacion);
        
        // Actualizar contador
        const btnComment = document.querySelector(`button[data-id="${idPublicacion}"].pub-btn-comment .pub-count`);
        if (btnComment) {
            const count = parseInt(btnComment.textContent) || 0;
            btnComment.textContent = count + 1;
        }
        } else {
        mostrarToast(data.error || 'Error al comentar', 'error');
        }
    } catch (err) {
        console.error('Error al comentar:', err);
        mostrarToast('Error de conexión', 'error');
    }
    }

    function formatearFecha(fecha) {
    const ahora = new Date();
    const diff = Math.floor((ahora - fecha) / 1000); // diferencia en segundos

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;
    
    return fecha.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    }

    function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo} show`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
    }

    // Hacer función global para usar en HTML
    window.enviarComentario = enviarComentario;

    // Ejecutar al cargar la página
    if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarPublicaciones);
    } else {
    cargarPublicaciones();
    }