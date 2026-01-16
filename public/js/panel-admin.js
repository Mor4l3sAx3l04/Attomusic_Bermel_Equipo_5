// Variables globales
let usuarioActualBaneo = null;

// Inicializar el panel admin
function init_panel_admin() {
  //console.log('🔧 Inicializando panel admin...');
  
  verificarAccesoAdmin();
  cargarPublicacionesReportadas();
  
  // Event listeners para búsqueda en tiempo real
  const buscarPub = document.getElementById('buscarPublicacion');
  if (buscarPub) {
    buscarPub.addEventListener('input', filtrarPublicaciones);
  }
  
  const buscarUser = document.getElementById('buscarUsuario');
  if (buscarUser) {
    buscarUser.addEventListener('input', filtrarUsuarios);
  }
  
  const filtroRol = document.getElementById('filtroRol');
  if (filtroRol) {
    filtroRol.addEventListener('change', filtrarUsuarios);
  }
  
  // Cargar datos cuando se cambia de tab
  document.getElementById('publicaciones-tab')?.addEventListener('shown.bs.tab', cargarTodasPublicaciones);
  document.getElementById('usuarios-tab')?.addEventListener('shown.bs.tab', cargarUsuarios);
}

// Verificar que el usuario sea admin
async function verificarAccesoAdmin() {
  const usuario = window.getUsuarioActual();
  
  if (!usuario) {
    window.mostrarToast("Debes iniciar sesión", "error");
    setTimeout(() => loadPage('bienvenido.html'), 2000);
    return;
  }
  
  try {
    const res = await fetch(`/api/usuario/${usuario.correo}/rol`);
    const data = await res.json();
    
    if (!res.ok || data.rol !== 'admin') {
      window.mostrarToast("No tienes permisos de administrador", "error");
      setTimeout(() => loadPage('bienvenido.html'), 2000);
    }
  } catch (err) {
    console.error("Error verificando rol:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

// ========================================
// SECCIÓN 1: PUBLICACIONES REPORTADAS
// ========================================

async function cargarPublicacionesReportadas() {
  const lista = document.getElementById('listaReportes');
  lista.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
  
  try {
    const res = await fetch('/api/admin/reportes');
    const reportes = await res.json();
    
    document.getElementById('badge-reportes').textContent = reportes.length;
    
    if (reportes.length === 0) {
      lista.innerHTML = `
        <div class="text-center p-5">
          <i class="bi bi-check-circle-fill" style="font-size: 4rem; color: #4CAF50;"></i>
          <h3 class="mt-3">¡Todo limpio!</h3>
          <p class="text-muted">No hay publicaciones reportadas en este momento</p>
        </div>
      `;
      return;
    }
    
    lista.innerHTML = '';
    reportes.forEach(reporte => {
      const card = crearCardReporte(reporte);
      lista.appendChild(card);
    });
    
  } catch (err) {
    console.error("Error cargando reportes:", err);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar reportes</div>';
  }
}

function crearCardReporte(reporte) {
  const div = document.createElement('div');
  div.className = 'reporte-card';
  div.dataset.reporteId = reporte.id_publicacion;
  
  const fecha = new Date(reporte.fecha_pub);
  
  div.innerHTML = `
    <div class="reporte-header">
      <div class="reporte-info">
        <div class="reporte-usuario">
          <i class="bi bi-person-circle"></i>
          ${window.escapeHtml(reporte.usuario)}
        </div>
        <div class="reporte-fecha">
          <i class="bi bi-calendar"></i>
          ${fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div class="reporte-contador">
        <i class="bi bi-flag-fill"></i>
        ${reporte.num_reportes} reporte${reporte.num_reportes !== 1 ? 's' : ''}
      </div>
    </div>
    
    <div class="reporte-contenido">
      ${window.escapeHtml(reporte.publicacion)}
    </div>
    
    <div class="reporte-acciones">
      <button class="btn-action btn-resolver" onclick="resolverReporte(${reporte.id_publicacion})">
        <i class="bi bi-check-circle"></i>
        Marcar como Resuelto
      </button>
      <button class="btn-action btn-eliminar" onclick="eliminarPublicacionAdmin(${reporte.id_publicacion})">
        <i class="bi bi-trash"></i>
        Eliminar Publicación
      </button>
    </div>
  `;
  
  return div;
}

async function resolverReporte(idPublicacion) {
  if (!confirm('¿Marcar este reporte como resuelto?')) return;
  
  try {
    const res = await fetch(`/api/admin/reporte/${idPublicacion}/resolver`, {
      method: 'POST'
    });
    
    if (res.ok) {
      window.mostrarToast("Reporte resuelto", "success");
      cargarPublicacionesReportadas();
    } else {
      window.mostrarToast("Error al resolver reporte", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

async function limpiarReportesResueltos() {
  if (!confirm('¿Eliminar todos los reportes marcados como resueltos?')) return;
  
  try {
    const res = await fetch('/api/admin/reportes/limpiar', {
      method: 'DELETE'
    });
    
    if (res.ok) {
      window.mostrarToast("Reportes limpiados", "success");
      cargarPublicacionesReportadas();
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

// ========================================
// SECCIÓN 2: TODAS LAS PUBLICACIONES
// ========================================

async function cargarTodasPublicaciones() {
  const lista = document.getElementById('listaPublicaciones');
  lista.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
  
  try {
    const res = await fetch('/api/admin/publicaciones');
    const publicaciones = await res.json();
    
    document.getElementById('badge-publicaciones').textContent = publicaciones.length;
    
    if (publicaciones.length === 0) {
      lista.innerHTML = '<div class="text-center p-5 text-muted">No hay publicaciones</div>';
      return;
    }
    
    lista.innerHTML = '';
    publicaciones.forEach(pub => {
      const card = crearCardPublicacion(pub);
      lista.appendChild(card);
    });
    
  } catch (err) {
    console.error("Error cargando publicaciones:", err);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar publicaciones</div>';
  }
}

function crearCardPublicacion(pub) {
  const div = document.createElement('div');
  div.className = 'publicacion-card';
  div.dataset.pubId = pub.id_publicacion;
  
  const fecha = new Date(pub.fecha_pub);
  
  div.innerHTML = `
    <div class="reporte-header">
      <div class="reporte-info">
        <div class="reporte-usuario">
          <i class="bi bi-person-circle"></i>
          ${window.escapeHtml(pub.usuario)}
        </div>
        <div class="reporte-fecha">
          <i class="bi bi-calendar"></i>
          ${fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge bg-info">
          <i class="bi bi-heart-fill"></i> ${pub.likes || 0}
        </span>
        <span class="badge bg-secondary">
          <i class="bi bi-chat-fill"></i> ${pub.comentarios || 0}
        </span>
      </div>
    </div>
    
    <div class="reporte-contenido">
      ${window.escapeHtml(pub.publicacion)}
    </div>
    
    <div class="reporte-acciones">
      <button class="btn-action btn-eliminar" onclick="eliminarPublicacionAdmin(${pub.id_publicacion})">
        <i class="bi bi-trash"></i>
        Eliminar
      </button>
    </div>
  `;
  
  return div;
}

async function eliminarPublicacionAdmin(idPublicacion) {
  if (!confirm('¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.')) return;
  
  try {
    const res = await fetch(`/api/admin/publicacion/${idPublicacion}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      window.mostrarToast("Publicación eliminada", "success");
      
      // Actualizar ambas listas
      cargarPublicacionesReportadas();
      cargarTodasPublicaciones();
    } else {
      window.mostrarToast("Error al eliminar publicación", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

function filtrarPublicaciones() {
  const busqueda = document.getElementById('buscarPublicacion').value.toLowerCase();
  const cards = document.querySelectorAll('.publicacion-card');
  
  cards.forEach(card => {
    const texto = card.textContent.toLowerCase();
    card.style.display = texto.includes(busqueda) ? 'block' : 'none';
  });
}

// ========================================
// SECCIÓN 3: GESTIÓN DE USUARIOS
// ========================================

async function cargarUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  lista.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
  
  try {
    const res = await fetch('/api/admin/usuarios');
    const usuarios = await res.json();
    
    document.getElementById('badge-usuarios').textContent = usuarios.length;
    
    if (usuarios.length === 0) {
      lista.innerHTML = '<div class="text-center p-5 text-muted">No hay usuarios</div>';
      return;
    }
    
    lista.innerHTML = '';
    usuarios.forEach(user => {
      const card = crearCardUsuario(user);
      lista.appendChild(card);
    });
    
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar usuarios</div>';
  }
}

function crearCardUsuario(user) {
  const div = document.createElement('div');
  div.className = 'usuario-card';
  div.dataset.userId = user.id_usuario;
  div.dataset.userRol = user.rol;
  
  const estaActivo = !user.fecha_baneo || new Date(user.fecha_baneo) < new Date();
  
  if (!estaActivo) {
    div.classList.add('usuario-baneado');
  }
  
  const fechaReg = new Date(user.fecha_reg);
  
  div.innerHTML = `
    ${user.foto ? 
      `<img src="${user.foto}" alt="${window.escapeHtml(user.usuario)}" class="usuario-avatar">` :
      `<div class="usuario-avatar-text">${user.usuario.charAt(0).toUpperCase()}</div>`
    }
    
    <div class="usuario-info">
      <p class="usuario-nombre">${window.escapeHtml(user.usuario)}</p>
      <p class="usuario-correo">${window.escapeHtml(user.correo)}</p>
      <div>
        <span class="usuario-rol ${user.rol}">
          <i class="bi bi-${user.rol === 'admin' ? 'shield-fill-check' : 'person'}"></i>
          ${user.rol === 'admin' ? 'Administrador' : 'Usuario'}
        </span>
        ${!estaActivo ? `
          <span class="badge-baneado ms-2">
            <i class="bi bi-ban"></i>
            Baneado hasta ${new Date(user.fecha_baneo).toLocaleDateString('es-MX')}
          </span>
        ` : ''}
      </div>
      <small class="text-muted d-block mt-1">
        <i class="bi bi-calendar-check"></i>
        Registro: ${fechaReg.toLocaleDateString('es-MX')}
      </small>
    </div>
    
    <div class="usuario-acciones">
      <button class="btn-action btn-cambiar-rol" onclick="cambiarRolUsuario(${user.id_usuario}, '${user.rol}')">
        <i class="bi bi-arrow-repeat"></i>
        ${user.rol === 'admin' ? 'Hacer Usuario' : 'Hacer Admin'}
      </button>
      
      ${estaActivo ? `
        <button class="btn-action btn-banear" onclick="abrirModalBaneo(${user.id_usuario}, '${window.escapeHtml(user.usuario)}')">
          <i class="bi bi-clock-history"></i>
          Banear
        </button>
      ` : `
        <button class="btn-action btn-resolver" onclick="desbanearUsuario(${user.id_usuario})">
          <i class="bi bi-check-circle"></i>
          Desbanear
        </button>
      `}
      
      <button class="btn-action btn-eliminar" onclick="eliminarUsuario(${user.id_usuario}, '${window.escapeHtml(user.usuario)}')">
        <i class="bi bi-trash"></i>
        Eliminar
      </button>
    </div>
  `;
  
  return div;
}

async function cambiarRolUsuario(idUsuario, rolActual) {
  const nuevoRol = rolActual === 'admin' ? 'usuario' : 'admin';
  const textoRol = nuevoRol === 'admin' ? 'administrador' : 'usuario';
  
  if (!confirm(`¿Cambiar este usuario a ${textoRol}?`)) return;
  
  try {
    const res = await fetch(`/api/admin/usuario/${idUsuario}/rol`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoRol })
    });
    
    if (res.ok) {
      window.mostrarToast(`Rol cambiado a ${textoRol}`, "success");
      cargarUsuarios();
    } else {
      window.mostrarToast("Error al cambiar rol", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

function abrirModalBaneo(idUsuario, nombreUsuario) {
  usuarioActualBaneo = idUsuario;
  document.getElementById('baneoUsuarioNombre').textContent = nombreUsuario;
  document.getElementById('baneoDias').value = 7;
  document.getElementById('baneoMotivo').value = '';
  
  const modal = new bootstrap.Modal(document.getElementById('modalBaneo'));
  modal.show();
}

async function confirmarBaneo() {
  const dias = parseInt(document.getElementById('baneoDias').value);
  const motivo = document.getElementById('baneoMotivo').value.trim();
  
  if (!dias || dias < 1) {
    window.mostrarToast("Ingresa un número de días válido", "error");
    return;
  }
  
  if (!motivo) {
    window.mostrarToast("Debes ingresar un motivo", "error");
    return;
  }
  
  try {
    const res = await fetch(`/api/admin/usuario/${usuarioActualBaneo}/banear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias, motivo })
    });
    
    if (res.ok) {
      window.mostrarToast("Usuario baneado correctamente", "success");
      bootstrap.Modal.getInstance(document.getElementById('modalBaneo')).hide();
      cargarUsuarios();
    } else {
      window.mostrarToast("Error al banear usuario", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

async function desbanearUsuario(idUsuario) {
  if (!confirm('¿Desbanear a este usuario?')) return;
  
  try {
    const res = await fetch(`/api/admin/usuario/${idUsuario}/desbanear`, {
      method: 'POST'
    });
    
    if (res.ok) {
      window.mostrarToast("Usuario desbaneado", "success");
      cargarUsuarios();
    } else {
      window.mostrarToast("Error al desbanear", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

async function eliminarUsuario(idUsuario, nombreUsuario) {
  if (!confirm(`¿Estás seguro de eliminar al usuario "${nombreUsuario}"? Esta acción no se puede deshacer y eliminará todas sus publicaciones.`)) return;
  
  try {
    const res = await fetch(`/api/admin/usuario/${idUsuario}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      window.mostrarToast("Usuario eliminado", "success");
      cargarUsuarios();
    } else {
      window.mostrarToast("Error al eliminar usuario", "error");
    }
  } catch (err) {
    console.error("Error:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

function filtrarUsuarios() {
  const busqueda = document.getElementById('buscarUsuario').value.toLowerCase();
  const rolFiltro = document.getElementById('filtroRol').value;
  const cards = document.querySelectorAll('.usuario-card');
  
  cards.forEach(card => {
    const texto = card.textContent.toLowerCase();
    const rol = card.dataset.userRol;
    
    const cumpleBusqueda = texto.includes(busqueda);
    const cumpleRol = !rolFiltro || rol === rolFiltro;
    
    card.style.display = (cumpleBusqueda && cumpleRol) ? 'flex' : 'none';
  });
}

// Inicializar cuando se cargue el documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init_panel_admin);
} else {
  init_panel_admin();
}