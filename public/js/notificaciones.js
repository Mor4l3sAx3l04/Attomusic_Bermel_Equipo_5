// public/js/notificaciones.js
// Sistema de notificaciones estilo Instagram para AttoMusic

(function () {
  'use strict';

  let pollingInterval = null;

  // ── Configuración visual por tipo ──
  const TIPOS = {
    like: {
      icono: 'bi-heart-fill',
      color: '#ff4d6d',
      texto: 'reaccionó a tu publicación ❤️'
    },
    comentario: {
      icono: 'bi-chat-fill',
      color: '#00dffc',
      texto: 'comentó en tu publicación 💬'
    },
    seguimiento: {
      icono: 'bi-person-plus-fill',
      color: '#ba01ff',
      texto: 'empezó a seguirte ✨'
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

  // ── Badge (número rojo en la campanita) ──
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

  // ── Polling: verificar nuevas notificaciones cada 30s ──
  async function cargarNoLeidas() {
    const usuario = getUsuarioActual();
    if (!usuario) return;

    try {
      const res = await fetch(
        `/api/notificaciones/no-leidas?correo=${encodeURIComponent(usuario.correo)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      actualizarBadge(data.total);
    } catch { /* silencioso */ }
  }

  // ── Cargar y renderizar notificaciones en el panel ──
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
      const res = await fetch(
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

    } catch (err) {
      lista.innerHTML = '<div class="notif-empty"><p>Error al cargar 😕</p></div>';
    }
  }

  // ── Crear elemento HTML de una notificación ──
  function crearItemNotif(n) {
    const config = TIPOS[n.tipo] || { icono: 'bi-bell-fill', color: '#aaa', texto: 'nueva notificación' };
    const div = document.createElement('div');
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
    // Marcar como leída visualmente
    elemento.classList.remove('no-leida');
    const dot = elemento.querySelector('.notif-dot');
    if (dot) dot.remove();

    // Marcar en el servidor (sin await para no bloquear la navegación)
    marcarLeida(n.id_notificacion);

    // Navegar a la publicación o perfil correspondiente
    cerrarPanel();

    if (n.tipo === 'like' || n.tipo === 'comentario') {
      if (n.id_referencia && window.loadPage) {
        // Ir al feed y scrollear a la publicación
        window.loadPage('perfil.html');
        // Guardar el ID para scrollear cuando cargue
        window._notifTargetPost = n.id_referencia;
      }
    } else if (n.tipo === 'seguimiento') {
      if (n.actor_id && window.loadPage) {
        window._perfilUsuarioId = n.actor_id;
        window.loadPage('perfil-usuario.html?id=' + n.actor_id);
      }
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

  // ── Abrir/cerrar panel ──
  function abrirPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.add('abierto');
    cargarNotificaciones();
  }

  function cerrarPanel() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('abierto');
  }

  function togglePanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.contains('abierto') ? cerrarPanel() : abrirPanel();
  }

  // ── Iniciar / detener polling ──
  function iniciarPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    cargarNoLeidas(); // primera carga inmediata
    pollingInterval = setInterval(cargarNoLeidas, 30000); // cada 30 segundos
  }

  function detenerPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // ── Inicialización ──
  function init() {
    const btnNotif     = document.getElementById('btn-notificaciones');
    const btnMarcar    = document.getElementById('notif-marcar-todas');
    const backdrop     = document.getElementById('notif-backdrop');

    if (btnNotif) {
      btnNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
    }

    if (btnMarcar) {
      btnMarcar.addEventListener('click', marcarTodasLeidas);
    }

    // Cerrar al hacer clic fuera
    if (backdrop) {
      backdrop.addEventListener('click', cerrarPanel);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarPanel();
    });

    // Iniciar polling si hay sesión activa
    if (getUsuarioActual()) iniciarPolling();
  }

  // ── API pública ──
  window.Notificaciones = {
    iniciar: iniciarPolling,
    detener: detenerPolling,
    recargar: cargarNoLeidas,
    abrirPanel,
    cerrarPanel
  };

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

})();