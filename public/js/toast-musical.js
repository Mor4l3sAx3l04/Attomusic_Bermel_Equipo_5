/* ============================================
   TOAST MUSICAL - JavaScript
   Sistema de notificaciones con efectos musicales
   ============================================ */

/**
 * Muestra un toast musical con efectos animados
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duración en milisegundos (default: 3000)
 */
function showMusicalToast(message, type = 'success', duration = 3000) {
  // Eliminar toast anterior si existe
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Crear elemento del toast
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast ${type}`;

  // Crear capa de brillo
  const glow = document.createElement('div');
  glow.className = 'toast-glow';
  toast.appendChild(glow);

  // Crear contenedor de notas musicales que rodean el toast
  const notesContainer = document.createElement('div');
  notesContainer.className = 'toast-notes';
  
  // Crear 16 notas musicales alrededor del toast
  const notes = ['♪', '♫', '♩', '♬'];
  for (let i = 0; i < 16; i++) {
    const note = document.createElement('div');
    note.className = 'toast-note';
    note.textContent = notes[i % 4];
    notesContainer.appendChild(note);
  }
  toast.appendChild(notesContainer);

  // Crear contenedor de partículas
  const particles = document.createElement('div');
  particles.className = 'toast-particles';
  
  // Crear 5 partículas musicales flotantes
  for (let i = 0; i < 5; i++) {
    const particle = document.createElement('div');
    particle.className = 'toast-particle';
    particle.textContent = notes[i % 4];
    particle.style.color = getParticleColor(type);
    particles.appendChild(particle);
  }
  toast.appendChild(particles);

  // Crear contenido del toast
  const content = document.createElement('div');
  content.className = 'toast-content';

  // Icono según el tipo
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = getIconForType(type);
  content.appendChild(icon);

  // Texto del mensaje
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  content.appendChild(text);

  toast.appendChild(content);

  // Agregar al body
  document.body.appendChild(toast);

  // Forzar reflow para activar la animación
  toast.offsetHeight;

  // Mostrar toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Ocultar y eliminar después de la duración
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, duration);
}

/**
 * Obtiene el icono apropiado según el tipo de toast
 * @param {string} type - Tipo de toast
 * @returns {string} HTML del icono
 */
function getIconForType(type) {
  const icons = {
    success: '<i class="bi bi-check-circle-fill"></i>',
    error: '<i class="bi bi-x-circle-fill"></i>',
    info: '<i class="bi bi-info-circle-fill"></i>',
    warning: '<i class="bi bi-exclamation-triangle-fill"></i>'
  };
  return icons[type] || icons.success;
}

/**
 * Obtiene el color de las partículas según el tipo
 * @param {string} type - Tipo de toast
 * @returns {string} Color hexadecimal
 */
function getParticleColor(type) {
  const colors = {
    success: '#d1fae5',
    error: '#fecaca',
    info: '#bae6fd',
    warning: '#fef3c7'
  };
  return colors[type] || colors.success;
}

/**
 * Atajos para tipos específicos de toast
 */
const toastSuccess = (message, duration = 3000) => {
  showMusicalToast(message, 'success', duration);
};

const toastError = (message, duration = 3000) => {
  showMusicalToast(message, 'error', duration);
};

const toastInfo = (message, duration = 3000) => {
  showMusicalToast(message, 'info', duration);
};

const toastWarning = (message, duration = 3000) => {
  showMusicalToast(message, 'warning', duration);
};

/* ============================================
   COMPATIBILIDAD CON EL SISTEMA ANTIGUO
   Mantiene la función showToast() original
   ============================================ */

/**
 * Función compatible con el sistema anterior
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success' o 'error'
 */
/**
 * Función compatible con el sistema anterior
 * Mantiene la función showToast() original y agrega window.mostrarToast
 */
window.showToast = function(message, type = 'success') {
  showMusicalToast(message, type, 3000);
};

// Asegurar que mostrarToast (usado en utils.js y otros) también use el estilo musical
window.mostrarToast = window.showToast;