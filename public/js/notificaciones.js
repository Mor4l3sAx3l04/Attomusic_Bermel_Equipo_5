// public/js/notificaciones.js
// Sistema de notificaciones estilo Instagram para AttoMusic
// Incluye notificaciones nativas del navegador

(function () {
  'use strict';

  let pollingInterval = null;
  let ultimaNotifVista = null; // ID de la última notif que ya procesamos

  // ── Configuración visual por tipo ──
  const TIPOS = {
    like: {
      icono: 'bi-heart-fill',
      color: '#ff4d6d',
      texto: 'reaccionó a tu publicación ❤️',
      emoji: '❤️'
    },
    comentario: {
      icono: 'bi-chat-fill',
      color: '#00dffc',
      texto: 'comentó en tu publicación 💬',
      emoji: '💬'
    },
    seguimiento: {
      icono: 'bi-person-plus-fill',
      color: '#ba01ff',
      texto: 'empezó a seguirte ✨',
      emoji: '✨'
    }
  };

  // ── Utilidades ──
  function getUsuarioActual() {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1)  return 'ahora';
    if (mins < 60) return `${mins}m`;
    if (hrs  < 24) return `${hrs}h`;
    if (days <  7) return `${days}d`;
    return new Date(fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }

  // ════════════════════════════════════════════════════
  // 🔔 NOTIFICACIONES NATIVAS DEL NAVEGADOR
  // ════════════════════════════════════════════════════

  // Pedir permiso al usuario
  async function pedirPermiso() {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones.');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission === 'denied') {
      console.warn('El usuario bloqueó las notificaciones.');
      return false;
    }

    // 'default' → mostrar el diálogo del navegador
    const permiso = await Notification.requestPermission();
    return permiso === 'granted';
  }

  // Mostrar una notificación nativa del sistema operativo
  function mostrarNotifNativa(notif) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const config = TIPOS[notif.tipo] || { emoji: '🎵', texto: 'nueva notificación' };

    const titulo  = `AttoMusic ${config.emoji}`;
    const cuerpo  = `${notif.actor_nombre} ${notif.mensaje || config.texto}`;

    const n = new Notification(titulo, {
      body: cuerpo,
      icon: '/images/iconowhite.png',   // tu ícono de la app
      badge: '/images/iconowhite.png',
      tag: `attomusic-notif-${notif.id_notificacion}`, // evita duplicados
      requireInteraction: false,        // se cierra sola
      silent: false
    });

    // Al hacer clic en la notificación del sistema, abrir/enfocar la pestaña
    n.onclick = () => {
      window.focus();
      n.close();
      cerrarPanel();
      alClickarNotif(notif, null);
    };

    // Auto-cerrar a los 5 segundos
    setTimeout(() => n.close(), 5000);
  }

  // ════════════════════════════════════════════════════
  // Badge (número rojo en la campanita)
  // ════════════════════════════════════════════════════
  function actualizarBadge(total) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  }

  // ════════════════════════════════════════════════════
  // Polling: verificar nuevas notificaciones
  // ════════════════════════════════════════════════════
  async function cargarNoLeidas() {
    const usuario = getUsuarioActual();
    if (!usuario) return;

    try {
      // Pedir las últimas notificaciones (no solo el conteo)
      const res = await fetch(
        `/api/notificaciones?correo=${encodeURIComponent(usuario.correo)}&limite=10`
      );
      if (!res.ok) return;

      const notifs = await res.json();
      if (!Array.isArray(notifs)) return;

      // Contar las no leídas para el badge
      const noLeidas = notifs.filter(n => !n.leido);
      actualizarBadge(noLeidas.length);

      // Detectar notificaciones NUEVAS (que llegaron desde el último polling)
      if (notifs.length > 0) {
        const masReciente = notifs[0]; // vienen ordenadas por fecha DESC

        if (ultimaNotifVista === null) {
          // Primera carga: guardar la más reciente pero NO notificar
          ultimaNotifVista = masReciente.id_notificacion;
        } else if (masReciente.id_notificacion !== ultimaNotifVista) {
          // Hay notificaciones nuevas desde el último poll
          const nuevas = notifs.filter(n => n.id_notificacion > ultimaNotifVista && !n.leido);
          ultimaNotifVista = masReciente.id_notificacion;

          // Mostrar notificación nativa por cada una (máx 3 para no spamear)
          nuevas.slice(0, 3).forEach(n => mostrarNotifNativa(n));
        }
      }

    } catch { /* silencioso */ }
  }

  // ════════════════════════════════════════════════════
  // Cargar y renderizar notificaciones en el panel
  // ════════════════════════════════════════════════════
  async function cargarNotificaciones() {
    const usuario = getUsuarioActual();
    if (!usuario) return;

    const lista = document.getElementById('notif-lista');
    if (!lista) return;

    lista.innerHTML = `
      <div class="notif-loading">
        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      </div>`;

    try {
      const res    = await fetch(
        `/api/notificaciones?correo=${encodeURIComponent(usuario.correo)}&limite=40`
      );
      const notifs = await res.json();

      if (!Array.isArray(notifs) || notifs.length === 0) {
        lista.innerHTML = `
          <div class="notif-empty">
            <i class="bi bi-bell-slash"></i>
            <p>Sin notificaciones por ahora</p>
          </div>`;
        return;
      }

      lista.innerHTML = '';
      notifs.forEach(n => lista.appendChild(crearItemNotif(n)));

    } catch {
      lista.innerHTML = '<div class="notif-empty"><p>Error al cargar 😕</p></div>';
    }
  }

  // ── Crear elemento HTML de una notificación ──
  function crearItemNotif(n) {
    const config = TIPOS[n.tipo] || { icono: 'bi-bell-fill', color: '#aaa', texto: 'nueva notificación' };
    const div    = document.createElement('div');
    div.className = `notif-item${n.leido ? '' : ' no-leida'}`;
    div.dataset.id = n.id_notificacion;

    const avatarHtml = n.actor_foto
      ? `<img src="${escapeHtml(n.actor_foto)}" class="notif-avatar" alt="${escapeHtml(n.actor_nombre)}">`
      : `<div class="notif-avatar-letra">${(n.actor_nombre || '?').charAt(0).toUpperCase()}</div>`;

    div.innerHTML = `
      <div class="notif-avatar-wrap">
        ${avatarHtml}
        <span class="notif-tipo-badge" style="background:${config.color}">
          <i class="bi ${config.icono}"></i>
        </span>
      </div>
      <div class="notif-content">
        <p class="notif-texto">
          <strong>${escapeHtml(n.actor_nombre)}</strong>
          ${escapeHtml(n.mensaje || config.texto)}
        </p>
        <span class="notif-tiempo">${timeAgo(n.fecha)}</span>
      </div>
      ${!n.leido ? '<span class="notif-dot"></span>' : ''}
    `;

    div.addEventListener('click', () => alClickarNotif(n, div));
    return div;
  }

  // ── Acción al clickar una notificación ──
  async function alClickarNotif(n, elemento) {
    if (elemento) {
      elemento.classList.remove('no-leida');
      const dot = elemento.querySelector('.notif-dot');
      if (dot) dot.remove();
    }

    marcarLeida(n.id_notificacion);
    cerrarPanel();

    if ((n.tipo === 'like' || n.tipo === 'comentario') && window.loadPage) {
      window.loadPage('noticias.html');
      window._notifTargetPost = n.id_referencia;
    } else if (n.tipo === 'seguimiento' && n.actor_id && window.loadPage) {
      window._perfilUsuarioId = n.actor_id;
      window.loadPage('perfil-usuario.html?id=' + n.actor_id);
    }

    cargarNoLeidas();
  }

  async function marcarLeida(id) {
    const usuario = getUsuarioActual();
    if (!usuario) return;
    try {
      await fetch(
        `/api/notificaciones/${id}/leer?correo=${encodeURIComponent(usuario.correo)}`,
        { method: 'PUT' }
      );
    } catch { /* silencioso */ }
  }

  async function marcarTodasLeidas() {
    const usuario = getUsuarioActual();
    if (!usuario) return;
    try {
      await fetch(
        `/api/notificaciones/leer-todas?correo=${encodeURIComponent(usuario.correo)}`,
        { method: 'PUT' }
      );
      document.querySelectorAll('.notif-item.no-leida').forEach(el => {
        el.classList.remove('no-leida');
        const dot = el.querySelector('.notif-dot');
        if (dot) dot.remove();
      });
      actualizarBadge(0);
    } catch (err) {
      console.error('Error marcando todas:', err);
    }
  }

  // ════════════════════════════════════════════════════
  // Abrir / cerrar panel
  // ════════════════════════════════════════════════════
  function abrirPanel() {
    const panel = document.getElementById('notif-panel');
    const backdrop = document.getElementById('notif-backdrop');
    if (!panel) return;
    panel.classList.add('abierto');
    if (backdrop) backdrop.classList.add('activo');
    cargarNotificaciones();
  }

  function cerrarPanel() {
    const panel = document.getElementById('notif-panel');
    const backdrop = document.getElementById('notif-backdrop');
    if (panel) panel.classList.remove('abierto');
    if (backdrop) backdrop.classList.remove('activo');
  }

  function togglePanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.contains('abierto') ? cerrarPanel() : abrirPanel();
  }

  // ════════════════════════════════════════════════════
  // Iniciar / detener polling
  // ════════════════════════════════════════════════════
  function iniciarPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    ultimaNotifVista = null; // resetear para la nueva sesión

    // Pedir permiso para notificaciones nativas al iniciar
    pedirPermiso();

    cargarNoLeidas(); // primera carga inmediata
    pollingInterval = setInterval(cargarNoLeidas, 30000); // cada 30 segundos
  }

  function detenerPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    ultimaNotifVista = null;
    actualizarBadge(0);
  }

  // ════════════════════════════════════════════════════
  // Inicialización de eventos
  // ════════════════════════════════════════════════════
  function init() {
    const btnNotif   = document.getElementById('btn-notificaciones');
    const btnMarcar  = document.getElementById('notif-marcar-todas');
    const backdrop   = document.getElementById('notif-backdrop');

    if (btnNotif) {
      btnNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
    }

    if (btnMarcar) btnMarcar.addEventListener('click', marcarTodasLeidas);

    if (backdrop) backdrop.addEventListener('click', cerrarPanel);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarPanel();
    });

    if (getUsuarioActual()) iniciarPolling();
  }

  // ── API pública ──
  window.Notificaciones = {
    iniciar:     iniciarPolling,
    detener:     detenerPolling,
    recargar:    cargarNoLeidas,
    abrirPanel,
    cerrarPanel,
    pedirPermiso // expuesta por si quieres llamarla manualmente
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})();