// Variables globales
let usuarioActualBaneo = null;

// Inicializar el panel admin
function init_panel_admin() {
  //console.log(' Inicializando panel admin...');

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
  document.getElementById('cuentas-eliminadas-tab')?.addEventListener('shown.bs.tab', cargarCuentasEliminadas);
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

// Variables temporales para el modal
let idAEliminar = null;
let tipoAEliminar = null; // 'publicacion' o 'usuario'

const modalConfirm = new bootstrap.Modal(document.getElementById('modalConfirmacion'));

// Función que se llama desde los botones de la lista (el icono de basura)
window.prepararEliminacion = function (id, tipo, nombre = "") {
  idAEliminar = id;
  tipoAEliminar = tipo;

  const titulo = tipo === 'usuario' ? "Eliminar Usuario" : "Eliminar Publicación";
  const mensaje = tipo === 'usuario'
    ? `¿Realmente deseas eliminar a "${nombre}"? Se borrarán todos sus datos.`
    : "¿Estás seguro de borrar esta publicación permanentemente?";

  document.getElementById('confirmTitle').innerText = titulo;
  document.getElementById('confirmMessage').innerText = mensaje;

  modalConfirm.show();
};

// El único que borra de verdad es este botón (el del modal)
document.getElementById('btnConfirmarAccion').addEventListener('click', async () => {
  if (!idAEliminar) return;

  const url = tipoAEliminar === 'usuario'
    ? `/api/admin/usuario/${idAEliminar}`
    : `/api/admin/publicacion/${idAEliminar}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      window.mostrarToast(`${tipoAEliminar.charAt(0).toUpperCase() + tipoAEliminar.slice(1)} eliminado`, "success");
      // Recargar las listas
      cargarUsuarios();
      cargarPublicacionesReportadas();
      cargarTodasPublicaciones();
    }
  } catch (err) {
    console.error("Error al eliminar:", err);
  }

  modalConfirm.hide();
  idAEliminar = null; // Limpiar
});

// SECCIÓN 1: PUBLICACIONES REPORTADAS

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
      <button class="btn-action btn-eliminar" onclick="prepararEliminacion(${pub.id_publicacion}, 'publicacion')">
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
// SECCIÓN 2: TODAS LAS PUBLICACIONES

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

// Puente para que PublicacionCard pueda eliminar
window.eliminarPublicacion = function (id) {
  prepararEliminacion(id, 'publicacion');
};

function crearCardPublicacion(pub) {
  if (window.PublicacionCard) {
    // En panel admin mostramos info del usuario y botón eliminar
    // No mostramos likes/comments interactivos, solo contadores (que ya vienen en el footer por defecto si no se ocultan)
    // Pero PublicacionCard por defecto muestra botones de like/comment.
    // Podemos ocultarlos con mostrarBotonesInteraccion: false
    // Y mostrar el de eliminar con mostrarBotonEliminar: true

    const card = new window.PublicacionCard(pub, {
      mostrarBotonesInteraccion: false, // Solo visual
      mostrarBotonSeguir: false,
      mostrarBotonEliminar: true,
      mostrarBotonEditar: false,
      // Hack: para mostrar contadores estáticos, PublicacionCard usa _renderFooter. 
      // Si mostrarBotonesInteraccion es false, muestra stats estáticos. perfecto.
      esPerfilPropio: false // Para no activar modo edición completo
    });

    // Ajustamos un poco el estilo si es necesario, o lo dejamos tal cual.
    // PublicacionCard ya tiene estilos.
    return card.element;
  }

  // Fallback (código original simplificado)
  const div = document.createElement('div');
  div.className = 'publicacion-card';
  div.textContent = 'Error: PublicacionCard no cargado';
  return div;
}

async function eliminarPublicacionAdmin(idPublicacion) {
  pedirConfirmacion(
    "Eliminar Publicación",
    "¿Estás seguro de que quieres borrar esta publicación de forma permanente?",
    async () => {
      try {
        const res = await fetch(`/api/admin/publicacion/${idPublicacion}`, { method: 'DELETE' });
        if (res.ok) {
          window.mostrarToast("Publicación eliminada", "success");
          cargarPublicacionesReportadas();
          cargarTodasPublicaciones();
        }
      } catch (err) {
        console.error("Error:", err);
      }
    }
  );

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
// SECCIÓN 3: GESTIÓN DE USUARIOS

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
      
      <button class="btn-action btn-eliminar" onclick="prepararEliminacion(${user.id_usuario}, 'usuario', '${window.escapeHtml(user.usuario)}')">
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
  pedirConfirmacion(
    "Eliminar Usuario",
    `¿Realmente deseas eliminar a "${nombreUsuario}"? Se borrarán todos sus datos y publicaciones.`,
    async () => {
      try {
        const res = await fetch(`/api/admin/usuario/${idUsuario}`, { method: 'DELETE' });
        if (res.ok) {
          window.mostrarToast("Usuario eliminado del sistema", "success");
          cargarUsuarios();
        }
      } catch (err) {
        console.error("Error:", err);
      }
    }
  );

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

// SECCIÓN 4: CUENTAS ELIMINADAS POR USUARIOS

async function cargarCuentasEliminadas() {
  const lista = document.getElementById('listaCuentasEliminadas');
  if (!lista) return;
  lista.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div><p class="mt-3 text-muted">Cargando registros...</p></div>';

  try {
    const res = await fetch('/api/admin/cuentas-eliminadas');
    const registros = await res.json();

    document.getElementById('badge-cuentas-eliminadas').textContent = registros.length;

    if (registros.length === 0) {
      lista.innerHTML = `
        <div class="text-center p-5">
          <i class="bi bi-person-check-fill" style="font-size: 4rem; color: #4CAF50;"></i>
          <h3 class="mt-3">Sin registros</h3>
          <p class="text-muted">Ningún usuario ha eliminado su cuenta todavía.</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = '';
    registros.forEach(reg => {
      const card = crearCardCuentaEliminada(reg);
      lista.appendChild(card);
    });

  } catch (err) {
    console.error('Error cargando cuentas eliminadas:', err);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar los registros.</div>';
  }
}

function crearCardCuentaEliminada(reg) {
  const div = document.createElement('div');
  div.className = 'usuario-card';
  div.style.borderLeft = '4px solid #ff4d6d';

  const fecha = new Date(reg.fecha_eliminacion);
  const fechaStr = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const inicialLetra = reg.usuario ? reg.usuario.charAt(0).toUpperCase() : '?';

  div.innerHTML = `
    <div class="usuario-avatar-text" style="background: linear-gradient(135deg, #ff4d6d, #c9184a); flex-shrink:0;">
      ${window.escapeHtml(inicialLetra)}
    </div>

    <div class="usuario-info" style="flex:1;">
      <p class="usuario-nombre" style="color:#ff4d6d;">
        <i class="bi bi-person-x-fill me-1"></i>${window.escapeHtml(reg.usuario)}
      </p>
      <p class="usuario-correo">${window.escapeHtml(reg.correo)}</p>
      <div style="margin-top:8px; padding: 10px 14px; background: rgba(255,77,109,0.08); border-radius: 10px; border-left: 3px solid #ff4d6d;">
        <small style="color: rgba(255,255,255,0.5); display:block; margin-bottom:4px;">
          <i class="bi bi-chat-quote-fill me-1"></i>Motivo:
        </small>
        <span style="color: rgba(255,255,255,0.85); font-size:0.93rem;">${window.escapeHtml(reg.motivo)}</span>
      </div>
      <small class="text-muted d-block mt-2">
        <i class="bi bi-calendar-x me-1"></i>Eliminada el: ${fechaStr}
      </small>
    </div>
  `;

  return div;
}

// Inicializar cuando se cargue el documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init_panel_admin);
} else {
  init_panel_admin();
}