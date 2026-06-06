(function () {

  // ── VIP: Insignias y controles ──────────────────────────
  window._perfilVipData = null; // cache del estado vip del perfil cargado

  async function cargarInsigniasVip(correo) {
    try {
      const res = await fetch(`/api/perfil/${correo}`);
      if (!res.ok) return;
      const data = await res.json();

      const esAdmin = data.rol === 'admin';
      const tipoPlan = esAdmin ? 'attoelite' : (data.tipo_plan || null);
      const esElite = tipoPlan === 'attoelite';
      const esVip = data.es_vip || esAdmin;
      const esArtista = data.insignia_artista;

      window._perfilVipData = { esVip, esElite, tipoPlan, esArtista, esAdmin };

      // ── Insignias ──
      const wrapInsignias = document.getElementById('perfil-insignias');
      const insElite   = document.getElementById('insignia-elite');
      const insVip     = document.getElementById('insignia-vip');
      const insArtista = document.getElementById('insignia-artista');

      if (esVip || esArtista) {
        if (wrapInsignias) wrapInsignias.style.display = 'flex';
      }
      if (esElite) {
        if (insElite) insElite.style.display = 'inline-flex';
        if (insVip) insVip.style.display = 'none'; // Elite reemplaza AttoPlus
      } else if (esVip) {
        if (insVip) insVip.style.display = 'inline-flex';
      }
      if (insArtista && esArtista) insArtista.style.display = 'inline-flex';

      // ── Botón subir canción y tabs ──
      const btnSubir   = document.getElementById('btn-subir-cancion');
      const tabsWrap   = document.getElementById('perfil-tabs-wrap');
      const tituloNonTab = document.getElementById('titulo-publicaciones-nontab');

      if (esVip) {
        if (btnSubir) btnSubir.style.display = 'inline-block';
        if (tabsWrap) tabsWrap.style.display = 'block';
        if (tituloNonTab) tituloNonTab.style.display = 'none';
      } else {
        if (btnSubir) btnSubir.style.display = 'none';
        if (tabsWrap) tabsWrap.style.display = 'none';
        if (tituloNonTab) tituloNonTab.style.display = 'block';
      }

      // ── Botón Mi Página Artista (solo AttoElite) ──
      const btnPaginaArtista = document.getElementById('btn-pagina-artista');
      if (btnPaginaArtista) {
        btnPaginaArtista.style.display = esElite ? 'inline-block' : 'none';
        if (esElite) {
          btnPaginaArtista.onclick = () => {
            const idUsuario = sessionStorage.getItem('id_usuario') || data.id_usuario;
            if (window.loadPage) window.loadPage(`pagina-artista.html?id=${idUsuario}`);
          };
        }
      }

      // ── Botón Gestionar Suscripción (si tiene plan) ──
      const btnGestionar = document.getElementById('btn-gestionar-suscripcion');
      if (btnGestionar && tipoPlan && !esAdmin) {
        // Actualizar color según plan
        if (esElite) {
          btnGestionar.style.border = '1.5px solid #FF8C00';
          btnGestionar.style.color = '#FF8C00';
        }
        btnGestionar.style.display = 'inline-block';
        btnGestionar.onclick = () => abrirModalSuscripcion(tipoPlan, correo);
      }

    } catch (err) {
      console.error('Error cargando insignias VIP:', err);
    }
  }

  // ── Modal gestionar suscripción ──────────────────────────
  function abrirModalSuscripcion(tipoPlan, correo) {
    const esElite = tipoPlan === 'attoelite';
    const otroPlan = esElite ? 'attoplus' : 'attoelite';
    const otroNombre = esElite ? 'AttoPlus ($4.99/mes)' : 'AttoElite ($9.99/mes)';
    const planNombre = esElite ? 'AttoElite' : 'AttoPlus';
    const planPrecio = esElite ? '$9.99/mes' : '$4.99/mes';

    const icono = document.getElementById('suscripcion-icono');
    const titulo = document.getElementById('suscripcion-titulo');
    const precio = document.getElementById('suscripcion-precio');
    const beneficios = document.getElementById('suscripcion-beneficios');
    const btnCambiar = document.getElementById('btn-cambiar-plan');
    const btnCambiarTexto = document.getElementById('btn-cambiar-plan-texto');

    if (icono) {
      icono.style.background = esElite ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(160deg,#ba01ff,#00dffc)';
      icono.innerHTML = esElite ? '<i class="bi bi-gem" style="color:#1a0800;"></i>' : '<i class="bi bi-crown-fill" style="color:white;"></i>';
    }
    if (titulo) {
      titulo.style.background = esElite ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(160deg,#ba01ff,#00dffc)';
      titulo.style.webkitBackgroundClip = 'text';
      titulo.style.backgroundClip = 'text';
      titulo.style.webkitTextFillColor = 'transparent';
      titulo.textContent = `Plan activo: ${planNombre}`;
    }
    if (precio) precio.textContent = planPrecio;
    if (beneficios) {
      if (esElite) {
        beneficios.innerHTML = `
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;color:rgba(255,255,255,0.75);">
            <li><i class="bi bi-gem" style="color:#FFD700;margin-right:6px;"></i>Insignia AttoElite dorada</li>
            <li><i class="bi bi-music-note-beamed" style="color:#FF8C00;margin-right:6px;"></i>Publicar canciones propias</li>
            <li><i class="bi bi-person-lines-fill" style="color:#FFD700;margin-right:6px;"></i>Página de artista premium</li>
            <li><i class="bi bi-collection-play-fill" style="color:#FF8C00;margin-right:6px;"></i>Álbumes y eventos con mapa</li>
            <li><i class="bi bi-bell-fill" style="color:#FFD700;margin-right:6px;"></i>Notificaciones a seguidores</li>
            <li><i class="bi bi-megaphone-fill" style="color:#FF8C00;margin-right:6px;"></i>Anuncios en la plataforma</li>
          </ul>`;
      } else {
        beneficios.innerHTML = `
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;color:rgba(255,255,255,0.75);">
            <li><i class="bi bi-crown-fill" style="color:#ffd700;margin-right:6px;"></i>Insignia AttoPlus visible</li>
            <li><i class="bi bi-music-note-beamed" style="color:#00dffc;margin-right:6px;"></i>Publicar canciones propias</li>
            <li><i class="bi bi-broadcast" style="color:#ba01ff;margin-right:6px;"></i>Recomendaciones automáticas</li>
          </ul>`;
      }
    }
    if (btnCambiarTexto) {
      btnCambiarTexto.innerHTML = `<i class="bi bi-arrow-left-right me-2"></i>Cambiar a ${otroNombre}`;
    }
    if (btnCambiar) {
      btnCambiar.onclick = () => confirmarCambioPlan(otroPlan, correo);
    }

    const btnCancelar = document.getElementById('btn-cancelar-suscripcion');
    if (btnCancelar) {
      btnCancelar.onclick = () => confirmarCancelacion(correo);
    }

    const modal = new bootstrap.Modal(document.getElementById('modalGestionarSuscripcion'));
    modal.show();
  }

  async function confirmarCambioPlan(nuevoPlan, correo) {
    const planNombre = nuevoPlan === 'attoelite' ? 'AttoElite' : 'AttoPlus';
    const confirmMsg = nuevoPlan === 'attoelite'
      ? `Obtendrás página de artista, álbumes, eventos y mercancía por $9.99/mes.`
      : `Perderás acceso a tu página de artista y eventos. Tu contenido se mantiene.`;
    if (!await attoConfirm(confirmMsg, { title: `¿Cambiar a ${planNombre}?`, confirmText: 'Cambiar plan', icon: 'warning' })) return;

    try {
      const res = await fetch('/api/vip/cambiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, nuevo_plan: nuevoPlan })
      });
      const data = await res.json();
      if (res.ok) {
        if (window.mostrarToast) window.mostrarToast(`${data.message}`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalGestionarSuscripcion'))?.hide();
        if (window.actualizarInterfaz) window.actualizarInterfaz();
        setTimeout(() => cargarInsigniasVip(correo), 800);
      } else {
        if (window.mostrarToast) window.mostrarToast(data.error || 'Error cambiando plan', 'error');
      }
    } catch {
      if (window.mostrarToast) window.mostrarToast('Error de conexión', 'error');
    }
  }

  async function confirmarCancelacion(correo) {
    if (!await attoConfirm('Tu insignia de artista y canciones publicadas se mantienen.', { title: '¿Cancelar suscripción?', confirmText: 'Sí, cancelar', cancelText: 'No, quedarse', icon: 'warning' })) return;

    try {
      const res = await fetch('/api/vip/cancelar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });
      const data = await res.json();
      if (res.ok) {
        if (window.mostrarToast) window.mostrarToast(data.message || 'Suscripción cancelada', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalGestionarSuscripcion'))?.hide();
        if (window.actualizarInterfaz) window.actualizarInterfaz();
        setTimeout(() => cargarInsigniasVip(correo), 800);
      } else {
        if (window.mostrarToast) window.mostrarToast(data.error || 'Error cancelando', 'error');
      }
    } catch {
      if (window.mostrarToast) window.mostrarToast('Error de conexión', 'error');
    }
  }

  // ── Tabs publicaciones / canciones ──────────────────────
  window.mostrarTabPerfil = function (tab) {
    const pubDiv = document.getElementById('misPublicaciones');
    const canDiv = document.getElementById('misCanciones');
    const tabPub = document.getElementById('tab-publicaciones');
    const tabCan = document.getElementById('tab-canciones');

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
      cargarCancionesPerfil();
    }
  };

  async function cargarCancionesPerfil() {
    const container = document.getElementById('misCanciones');
    if (!container) return;

    let idUsuario = sessionStorage.getItem('id_usuario');

    if (!idUsuario) {
      const usuario = window.getUsuarioActual ? window.getUsuarioActual() : null;
      if (!usuario?.correo) return;
      try {
        const r = await fetch(`/api/perfil/${encodeURIComponent(usuario.correo)}`);
        if (r.ok) {
          const d = await r.json();
          idUsuario = d.id_usuario;
          if (idUsuario) sessionStorage.setItem('id_usuario', String(idUsuario));
        }
      } catch { return; }
    }

    if (!idUsuario) return;

    container.innerHTML = '<div class="text-center p-3"><div class="spinner-border" style="color:#ba01ff;"></div></div>';

    try {
      const res = await fetch(`/api/canciones-artista/usuario/${idUsuario}`);
      const canciones = await res.json();

      if (!Array.isArray(canciones) || canciones.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-4">Aún no has publicado ninguna canción. ¡Sube tu primera canción!</p>';
        return;
      }

      container.innerHTML = '';
      canciones.forEach(c => {
        container.appendChild(crearMiniCardCancion(c));
      });
    } catch (err) {
      container.innerHTML = '<div class="alert alert-danger">Error cargando canciones</div>';
    }
  }

  function crearMiniCardCancion(c) {
    const div = document.createElement('div');
    div.className = 'ca-mini-card';

    const cover = c.imagen_url
      ? `<img src="${escHtml(c.imagen_url)}" class="ca-mini-cover" alt="portada">`
      : `<div class="ca-mini-cover-placeholder">🎵</div>`;

    div.innerHTML = `
      ${cover}
      <div class="ca-mini-info">
        <div class="ca-mini-name">${escHtml(c.nombre)}</div>
        ${c.genero ? `<div class="ca-mini-genre"><i class="bi bi-tag-fill"></i> ${escHtml(c.genero)}</div>` : ''}
        <div style="font-size:0.75rem;color:#999;margin-top:2px;"><i class="bi bi-heart-fill" style="color:#e63b6f;"></i> ${c.likes || 0} &nbsp;<i class="bi bi-chat-fill"></i> ${c.comentarios || 0}</div>
      </div>
      <button class="ca-mini-play" data-id="${c.id_cancion}" title="Reproducir">
        <i class="bi bi-play-fill"></i>
      </button>
      <audio id="mini-audio-${c.id_cancion}" preload="none" style="display:none;"></audio>
    `;

    let audioMini = null;
    let playing = false;

    const btn = div.querySelector('.ca-mini-play');
    btn.addEventListener('click', async () => {
      const audioEl = div.querySelector(`#mini-audio-${c.id_cancion}`);
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

    return div;
  }

  function escHtml(str) {
    if (window.escapeHtml) return window.escapeHtml(str || '');
    return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Modal subir canción ──────────────────────────────────
  let _audioBase64 = null;
  let _imagenBase64 = null;

  window.previewPortadaCancion = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (window.mostrarToast) window.mostrarToast('Selecciona una imagen válida', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      _imagenBase64 = e.target.result;
      const preview = document.getElementById('preview-imagen-cancion');
      if (preview) { preview.src = _imagenBase64; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.seleccionarAudioCancion = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a'];
    if (!validTypes.some(t => file.type.includes('audio')) && !file.name.match(/\.(mp3|mp4|wav|m4a|ogg)$/i)) {
      if (window.mostrarToast) window.mostrarToast('Formato de audio no soportado. Usa MP3, WAV o MP4', 'error');
      input.value = '';
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      if (window.mostrarToast) window.mostrarToast('El audio no puede superar 30MB', 'error');
      input.value = '';
      return;
    }
    const nombreEl = document.getElementById('audio-nombre-seleccionado');
    if (nombreEl) nombreEl.textContent = `✓ ${file.name}`;

    const reader = new FileReader();
    reader.onload = (e) => { _audioBase64 = e.target.result; };
    reader.readAsDataURL(file);
  };

  function inicializarFormSubirCancion() {
    const form = document.getElementById('formSubirCancion');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('cancion-nombre').value.trim();
      const descripcion = document.getElementById('cancion-descripcion').value.trim();
      const genero = document.getElementById('cancion-genero').value;
      const btn = document.getElementById('btn-publicar-cancion');

      if (!nombre) { if (window.mostrarToast) window.mostrarToast('El nombre es obligatorio', 'error'); return; }
      if (!_audioBase64) { if (window.mostrarToast) window.mostrarToast('Debes seleccionar un archivo de audio', 'error'); return; }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Publicando...';

      const usuario = window.getUsuarioActual ? window.getUsuarioActual() : JSON.parse(localStorage.getItem('usuario'));

      try {
        const res = await fetch('/api/canciones-artista/subir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo: usuario.correo,
            nombre,
            descripcion: descripcion || undefined,
            genero: genero || undefined,
            imagen_url: _imagenBase64 || undefined,
            audio_data: _audioBase64
          })
        });
        const data = await res.json();

        if (res.ok) {
          if (window.mostrarToast) window.mostrarToast('¡Canción publicada!', 'success');

          // Otorgar insignia artista en UI si es la primera
          if (data.insignia_artista_nueva) {
            const ins = document.getElementById('insignia-artista');
            const wrap = document.getElementById('perfil-insignias');
            if (ins) ins.style.display = 'inline-flex';
            if (wrap) wrap.style.display = 'flex';
            if (window.mostrarToast) window.mostrarToast('¡Obtuviste la insignia Artista en Crecimiento!', 'success');
          }

          // Cerrar modal y limpiar
          const modal = bootstrap.Modal.getInstance(document.getElementById('modalSubirCancion'));
          if (modal) modal.hide();
          _audioBase64 = null;
          _imagenBase64 = null;
          form.reset();
          const preview = document.getElementById('preview-imagen-cancion');
          if (preview) { preview.src = ''; preview.style.display = 'none'; }
          const nombreAudio = document.getElementById('audio-nombre-seleccionado');
          if (nombreAudio) nombreAudio.textContent = 'Toca para seleccionar audio';

          // Recargar tab de canciones
          mostrarTabPerfil('canciones');
        } else {
          if (window.mostrarToast) window.mostrarToast(data.error || 'Error al publicar', 'error');
        }
      } catch (err) {
        console.error(err);
        if (window.mostrarToast) window.mostrarToast('Error de conexión', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Publicar';
      }
    });
  }

  // ── Toggle Notificaciones ────────────────────────────────
  function inicializarToggleNotificaciones() {
    const toggle = document.getElementById('toggleNotificaciones');
    if (!toggle) return;

    const tieneAPI = 'Notification' in window;
    const permisoConcedido = tieneAPI && Notification.permission === 'granted';
    const deshabilitado = localStorage.getItem('attomusic_notif_disabled') === 'true';

    toggle.checked = permisoConcedido && !deshabilitado;

    if (!tieneAPI) {
      toggle.disabled = true;
      const label = toggle.nextElementSibling;
      if (label) label.title = 'Tu navegador no soporta notificaciones push';
      return;
    }

    toggle.addEventListener('change', async () => {
      if (toggle.checked) {
        if (window.Notificaciones) {
          const ok = await window.Notificaciones.habilitar();
          if (!ok) {
            toggle.checked = false;
            if (Notification.permission === 'denied') {
              window.mostrarToast('Las notificaciones están bloqueadas en tu navegador. Permítelas desde la configuración del sitio.', 'error');
            } else {
              window.mostrarToast('No se pudo activar las notificaciones', 'error');
            }
            return;
          }
          window.mostrarToast('Notificaciones activadas', 'success');
        }
      } else {
        if (window.Notificaciones) window.Notificaciones.deshabilitar();
        window.mostrarToast('Notificaciones desactivadas', 'info');
      }
    });
  }

  // ── Hook principal ───────────────────────────────────────
  function initPerfil() {
    document.querySelectorAll('.modal').forEach(modal => {
      document.body.appendChild(modal);
    });

    if (window.cargarPerfil) window.cargarPerfil();
    if (window.inicializarPerfil) window.inicializarPerfil();

    // Cargar insignias y controles VIP después de que se cargue el perfil
    const usuario = window.getUsuarioActual ? window.getUsuarioActual() : JSON.parse(localStorage.getItem('usuario'));
    if (usuario && usuario.correo) {
      cargarInsigniasVip(usuario.correo);
    }

    inicializarFormSubirCancion();
    inicializarToggleNotificaciones();
  }

  window.previewImage = function (input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  let _modalEliminar = null;

  window.abrirModalEliminarCuenta = function () {
    document.getElementById('eliminarContrasena').value = '';
    document.getElementById('eliminarMotivo').value = '';
    if (!_modalEliminar) {
      _modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminarCuenta'));
    }
    _modalEliminar.show();
  };

  window.confirmarEliminarCuenta = async function () {
    const contrasena = document.getElementById('eliminarContrasena').value.trim();
    const motivo     = document.getElementById('eliminarMotivo').value.trim();
    const btn        = document.getElementById('btnConfirmarEliminar');

    if (!contrasena) { window.mostrarToast('Debes ingresar tu contraseña', 'error'); return; }
    if (!motivo)     { window.mostrarToast('El motivo es obligatorio', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

    try {
      const usuario = window.getUsuarioActual();
      if (!usuario) {
        window.mostrarToast('No hay sesión activa', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
        return;
      }

      const res = await fetch('/api/eliminar-cuenta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario.correo, contrasena, motivo })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem('usuario');
        sessionStorage.clear();
        if (_modalEliminar) _modalEliminar.hide();
        window.mostrarToast('Tu cuenta fue eliminada. ¡Hasta luego!', 'success');
        setTimeout(() => { loadPage('bienvenido.html'); }, 2200);
      } else {
        window.mostrarToast(data.message || 'Error al eliminar la cuenta', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
      }
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      window.mostrarToast('Error de conexión', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
    }
  };

  window['init_perfil'] = initPerfil;
  initPerfil();
})();
