// utils.js - Funciones compartidas

// Obtener usuario actual
window.getUsuarioActual = function () {
  try {
    const usuarioLS = JSON.parse(localStorage.getItem("usuario"));
    return usuarioLS;
  } catch (err) {
    console.warn("No se pudo obtener usuario del localStorage");
    return null;
  }
}

// Formatear fecha
window.formatearFecha = function (fecha) {
  const ahora = new Date();
  const diff = Math.floor((ahora - fecha) / 1000);

  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`;

  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Escapar HTML
window.escapeHtml = function (str) {
  if (!str && str !== 0) return "";
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Función mostrarToast eliminada para evitar conflictos con toast-musical.js

// Crear placeholder de imagen
window.crearImagenPlaceholder = function () {
  return `<div class="pub-cancion-img-placeholder">🎵</div>`;
}