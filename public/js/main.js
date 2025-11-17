//Función para mostrar notificaciones
function showToast(message, type = "success") {
const toast = document.getElementById("toast");
toast.textContent = message;
toast.className = `toast show ${type}`;
setTimeout(() => {
toast.className = "toast";
}, 3000);
}

//Sanitización y validación global
function sanitizeInput(str) {
if (typeof str !== "string") return "";
str = str.replace(/<[^>]*>?/gm, "");
str = str.replace(/(javascript:|data:|vbscript:)/gi, "");
str = str.replace(/<\?(php)?[\s\S]*?\?>/gi, "");
str = str.replace(/<style[\s\S]*?<\/style>/gi, "");
str = str.replace(/<script[\s\S]*?<\/script>/gi, "");
str = str.trim().replace(/\s{2,}/g, " ");
return str;
}

function isNotEmpty(str) {
return typeof str === "string" && str.trim().length > 0;
}

function allowOnlyNumbers(e) {
if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab") {
    e.preventDefault();
}
}

document.addEventListener("DOMContentLoaded", function () {
//Inicializar tooltips de Bootstrap
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    new bootstrap.Tooltip(tooltipTriggerEl);
});

//Carga inicial
loadPage('bienvenido.html');

//Buscador
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");

if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
    if (!searchInput.classList.contains("active")) {
        searchInput.classList.add("active");
        searchInput.focus();
    } else {
        const query = sanitizeInput(searchInput.value.trim());
        if (isNotEmpty(query)) {
        loadPage(`buscador.html?q=${encodeURIComponent(query)}&type=track,artist,album`);
        } else {
        searchInput.classList.add("is-invalid");
        }
    }
    });

    searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const query = sanitizeInput(searchInput.value);
        if (isNotEmpty(query)) {
        loadPage(`buscador.html?q=${encodeURIComponent(query)}&type=track,artist,album`);
        } else {
        searchInput.classList.add("is-invalid");
        }
    }
    });

    searchInput.addEventListener("blur", function() {
    if (isNotEmpty(this.value)) {
        this.classList.remove("is-invalid");
    }
    });
}

//Formularios (registro/login/comentarios) 
document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", function(e) {
    let valid = true;
    this.querySelectorAll("input, textarea").forEach(input => {
        input.value = sanitizeInput(input.value);
        if (!isNotEmpty(input.value)) {
        valid = false;
        input.classList.add("is-invalid");
        setTimeout(() => input.classList.remove("is-invalid"), 5000);
        } else {
        input.classList.remove("is-invalid");
        }
        if (input.type === "number" && !/^\d+$/.test(input.value)) {
        valid = false;
        input.classList.add("is-invalid");
        setTimeout(() => input.classList.remove("is-invalid"), 2000);
        }
    });
    if (!valid) {
        e.preventDefault();
        alert("Por favor, completa todos los campos correctamente.");
    }
    });

// Validación en tiempo real para números
    form.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener("keypress", allowOnlyNumbers);
    });

// Quitar el rojo al interactuar
    form.querySelectorAll("input, textarea").forEach(input => {
    input.addEventListener("input", function() {
        if (isNotEmpty(this.value)) this.classList.remove("is-invalid");
    });
    input.addEventListener("focus", function() {
        this.classList.remove("is-invalid");
    });
    });
});

//Animación de labels y toggles de contraseñas
const inputs = document.querySelectorAll('.input-animated');
inputs.forEach(input => {
    const label = input.parentElement.querySelector('.label-animated');
    const border = input.parentElement.querySelector('.input-border');

    input.addEventListener('focus', function() {
    if (label) {
        label.style.top = '-10px';
        label.style.fontSize = '0.85rem';
        label.style.color = '#ba01ff';
        label.style.fontWeight = '600';
    }
    if (border) border.style.width = '100%';
    this.style.borderColor = '#00dffc';
    this.style.boxShadow = '0 0 0 3px rgba(0,223,252,0.1)';
    });

    input.addEventListener('blur', function() {
    if (this.value === '' && label) {
        label.style.top = '50%';
        label.style.fontSize = '1rem';
        label.style.color = '#999';
        label.style.fontWeight = '400';
    }
    if (border) border.style.width = '0%';
    this.style.borderColor = '#ba01ff';
    this.style.boxShadow = 'none';
    });

    if (input.value !== '' && label) {
    label.style.top = '-10px';
    label.style.fontSize = '0.85rem';
    label.style.color = '#ba01ff';
    label.style.fontWeight = '600';
    }
});

//Toggle de contraseñas (login y registro)
function setupPasswordToggle(buttonSelector, inputId) {
    const btn = document.querySelector(buttonSelector);
    const input = document.getElementById(inputId);
    if (btn && input) {
    btn.addEventListener('click', function() {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = this.querySelector('i');
        icon.classList.toggle('bi-eye-slash');
        icon.classList.toggle('bi-eye');
    });
    }
}
setupPasswordToggle('.btn-eye-login', 'loginPassword');
setupPasswordToggle('#togglePassword', 'registerPassword');
});

//Carga dinámica de páginas
function loadPage(url) {
  let pagePath = url;
  if (!url.startsWith('http')) {
    pagePath = '/' + url.replace(/^\/?/, '');
  }

  const urlObj = new URL(pagePath, window.location.origin);
  const params = urlObj.search;

  fetch(urlObj.pathname)
    .then(res => res.text())
    .then(html => {
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = html;
      window.scrollTo(0, 0);

    setTimeout(() => {
        if (typeof aplicarColoresIconos === 'function') {
            aplicarColoresIconos();
        }
    }, 300);

      const scripts = mainContent.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          if (urlObj.pathname.endsWith('buscador.html')) {
            newScript.textContent = `window._searchParams = '${params}';\n` + oldScript.textContent;
          } else {
            newScript.textContent = oldScript.textContent;
          }
        }
        document.body.appendChild(newScript);
        setTimeout(() => newScript.remove(), 1000);
      });

//Forzar colores después de cargar
      setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const colorIconos = isDark ? '#aaa' : '#5a189a';
        
        document.querySelectorAll('.btn-icon-action, .pub-btn, .pub-stats i, .perfil-fecha i, .section-title i').forEach(el => {
          if (!el.closest('.pub-btn-like.liked')) {
            el.style.color = colorIconos;
          }
        });
      }, 200);
    })
    .catch(() => {
      document.getElementById('main-content').innerHTML =
        '<div style="padding:40px;text-align:center;color:#ba01ff;font-size:2rem;">No se pudo cargar la página.</div>';
    });
}

//Asignar eventos a los links dinámicos
document.addEventListener("DOMContentLoaded", function () {
document.querySelectorAll(".load-page").forEach(link => {
    link.addEventListener("click", function(e) {
    e.preventDefault();
    const href = this.getAttribute("href");
    if (href !== "#") loadPage(href);
    });
});
});

//REGISTRO
const formRegistro = document.getElementById("registroForm");
if (formRegistro) {
formRegistro.addEventListener("submit", async function (e) {
e.preventDefault();

const usuario = document.getElementById("registerName").value.trim();
const correo = document.getElementById("registerEmail").value.trim();
const contrasena = document.getElementById("registerPassword").value.trim();

if (!usuario || !correo || !contrasena) {
    showToast("Por favor llena todos los campos.", "error");
    return;
}

try {
    const response = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, correo, contrasena }),
    });

    const data = await response.json();

    if (response.ok) {
    showToast(data.message || "Usuario registrado correctamente", "success");
    bootstrap.Modal.getInstance(document.getElementById("registroModal")).hide();
    this.reset();

    localStorage.setItem("usuario", JSON.stringify({ usuario, correo }));
    actualizarInterfaz();

    } else {
    showToast(data.error || "Error al registrar usuario", "error");
    }
} catch (err) {
    console.error(err);
    showToast("Error de conexión con el servidor", "error");
}
});
}

//LOGIN
const formLogin = document.getElementById("loginForm");
if (formLogin) {
    formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const usuario = document.getElementById("loginUser").value.trim();
    const contrasena = document.getElementById("loginPassword").value.trim();

    if (!usuario || !contrasena) {
        showToast("Por favor ingresa tus datos.", "error");
        return;
    }

    try {
        const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
        });

        const data = await response.json();

        if (response.ok) {
        showToast(data.message || "Inicio de sesión exitoso", "success");
        bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
        this.reset();

        localStorage.setItem("usuario", JSON.stringify({ usuario: data.user.usuario, correo: data.user.correo }));
        actualizarInterfaz();

        } else {
        showToast(data.error || "Usuario o contraseña incorrectos", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error al conectar con el servidor", "error");
    }
    });
}

//RESTABLECER CONTRASEÑA
const formReset = document.getElementById("resetForm");
if (formReset) {
    formReset.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombre = document.getElementById("resetName").value.trim();
    const correo = document.getElementById("resetEmail").value.trim();
    const nuevaContrasena = document.getElementById("resetPassword").value.trim();

    if (!nombre || !correo || !nuevaContrasena) {
        showToast("Por favor completa todos los campos.", "error");
        return;
    }

    if (nuevaContrasena.length < 6) {
        showToast("La contraseña debe tener al menos 6 caracteres.", "error");
        return;
    }

    try {
        const response = await fetch("/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, correo, nuevaContrasena }),
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || "Contraseña actualizada correctamente", "success");
            bootstrap.Modal.getInstance(document.getElementById("resetModal")).hide();
            this.reset();
        } else {
            showToast(data.error || "No se pudo actualizar la contraseña", "error");
        }
        } catch (err) {
        console.error(err);
        showToast("Error de conexión con el servidor", "error");
        }
    });

// Toggle para mostrar/ocultar contraseña
    const btnEyeReset = document.querySelector('.btn-eye-reset');
    const resetPasswordInput = document.getElementById('resetPassword');
    if (btnEyeReset && resetPasswordInput) {
    btnEyeReset.addEventListener('click', function() {
        const isPassword = resetPasswordInput.type === 'password';
        resetPasswordInput.type = isPassword ? 'text' : 'password';
        const icon = this.querySelector('i');
        icon.classList.toggle('bi-eye-slash');
        icon.classList.toggle('bi-eye');
    });
    }
}

async function actualizarInterfaz() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const perfilContainer = document.getElementById("perfil-container");
  const perfilNombre = document.getElementById("perfil-nombre");

  if (usuario) {
// Obtener foto del usuario desde el backend
    try {
      const res = await fetch(`/api/perfil/${usuario.correo}`);
      if (res.ok) {
        const data = await res.json();
        
// Actualizar foto en el dropdown
        const perfilPic = perfilContainer.querySelector('.profile-pic');
        if (perfilPic && data.foto) {
          perfilPic.src = data.foto;
        }
      }
    } catch (err) {
      console.warn("No se pudo cargar la foto del perfil");
    }

// Mostrar perfil y ocultar botones
    btnLogin.style.display = "none";
    btnRegister.style.display = "none";
    perfilContainer.style.display = "inline-block";
    perfilNombre.textContent = usuario.usuario;
  } else {
// Mostrar botones, ocultar perfil
    btnLogin.style.display = "inline-block";
    btnRegister.style.display = "inline-block";
    perfilContainer.style.display = "none";
  }
}

// Cerrar sesión
document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("usuario");
  showToast("Sesión cerrada correctamente", "success");
  actualizarInterfaz();
});

// Al cargar la página, verificar sesión
window.addEventListener("DOMContentLoaded", actualizarInterfaz);

//GESTIÓN DE PERFIL
window.cargarPerfil = async function() {
  const usuarioActual = window.getUsuarioActual();
  
  if (!usuarioActual || !usuarioActual.correo) {
    window.mostrarToast("Debes iniciar sesión para ver tu perfil", "error");
    setTimeout(() => loadPage('bienvenido.html'), 2000);
    return;
  }

  try {
    const res = await fetch(`/api/perfil/${usuarioActual.correo}`);
    const data = await res.json();

    if (res.ok) {
      document.getElementById("perfilNombre").textContent = data.usuario;
      document.getElementById("perfilCorreo").textContent = data.correo;
      
      const fecha = new Date(data.fecha_reg);
      document.getElementById("perfilFecha").textContent = fecha.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long' 
      });

      if (data.foto) {
        document.getElementById("perfilFoto").src = data.foto;
      }

      document.getElementById("editNombre").value = data.usuario;
      document.getElementById("editCorreo").value = data.correo;

      setTimeout(actualizarLabelsInput, 100);
      
// Cargar publicaciones del usuario
      window.cargarPublicaciones(usuarioActual.correo);
    } else {
      window.mostrarToast(data.error || "Error al cargar perfil", "error");
    }
  } catch (err) {
    console.error("Error cargando perfil:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

window.inicializarPerfil = function() {
  const usuarioActual = window.getUsuarioActual();
  
  if (!usuarioActual) return;

// Cambiar foto
  const btnCambiarFoto = document.getElementById("btnCambiarFoto");
  const inputFoto = document.getElementById("inputFoto");
  
  if (btnCambiarFoto && inputFoto) {
    btnCambiarFoto.onclick = () => {
      const opcion = confirm("¿Deseas tomar una foto con la cámara?\n\nAcepta: Cámara\nCancelar: Seleccionar archivo");
      if (opcion) {
        abrirCamara();
      } else {
        inputFoto.click();
      }
    };

    inputFoto.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) await subirFoto(file);
    };
  }

// Editar perfil
  const formEditarPerfil = document.getElementById("formEditarPerfil");
  if (formEditarPerfil) {
    formEditarPerfil.onsubmit = async (e) => {
      e.preventDefault();
      await actualizarPerfil();
    };
  }

// Editar publicación
  const formEditarPublicacion = document.getElementById("formEditarPublicacion");
  if (formEditarPublicacion) {
    formEditarPublicacion.onsubmit = async (e) => {
      e.preventDefault();
      await guardarEdicionPublicacion();
    };
  }

  setupInputAnimations();
}

async function subirFoto(file) {
  const usuarioActual = window.getUsuarioActual();
  
  if (!file.type.startsWith('image/')) {
    window.mostrarToast("Por favor selecciona una imagen válida", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    window.mostrarToast("La imagen no puede superar 5MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const fotoBase64 = e.target.result;
    
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          correo: usuarioActual.correo,
          foto: fotoBase64
        })
      });

      const data = await res.json();

      if (res.ok) {
        document.getElementById("perfilFoto").src = fotoBase64;
        window.mostrarToast("Foto actualizada correctamente", "success");
      } else {
        window.mostrarToast(data.error || "Error al actualizar foto", "error");
      }
    } catch (err) {
      console.error("Error subiendo foto:", err);
      window.mostrarToast("Error de conexión", "error");
    }
  };
  reader.readAsDataURL(file);
}

async function abrirCamara() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-container">
        <video id="videoCamera" autoplay playsinline style="width:100%;max-width:500px;border-radius:12px;"></video>
        <div class="camera-controls">
          <button class="btn btn-gradient" id="btnCapturar">
            <i class="bi bi-camera"></i> Capturar
          </button>
          <button class="btn btn-secondary" id="btnCancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const video = document.getElementById('videoCamera');
    video.srcObject = stream;

    document.getElementById('btnCapturar').onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        await subirFoto(blob);
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
      }, 'image/jpeg', 0.8);
    };

    document.getElementById('btnCancelar').onclick = () => {
      stream.getTracks().forEach(track => track.stop());
      modal.remove();
    };

  } catch (err) {
    console.error("Error accediendo a la cámara:", err);
    window.mostrarToast("No se pudo acceder a la cámara", "error");
  }
}

async function actualizarPerfil() {
  const usuarioActual = window.getUsuarioActual();
  const nuevoUsuario = document.getElementById("editNombre").value.trim();
  const nuevoCorreo = document.getElementById("editCorreo").value.trim();

  if (!nuevoUsuario || !nuevoCorreo) {
    window.mostrarToast("Completa todos los campos", "error");
    return;
  }

  try {
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        correo: usuarioActual.correo,
        nuevoUsuario,
        nuevoCorreo
      })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("usuario", JSON.stringify({ usuario: nuevoUsuario, correo: nuevoCorreo }));
      window.mostrarToast("Perfil actualizado correctamente", "success");
      bootstrap.Modal.getInstance(document.getElementById("editarPerfilModal")).hide();
      await window.cargarPerfil();
      actualizarInterfaz();
    } else {
      window.mostrarToast(data.error || "Error al actualizar perfil", "error");
    }
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

window.editarPublicacion = function(id, texto) {
  document.getElementById("editPubId").value = id;
  document.getElementById("editPubTexto").value = texto;
  new bootstrap.Modal(document.getElementById("editarPublicacionModal")).show();
}

async function guardarEdicionPublicacion() {
  const usuarioActual = window.getUsuarioActual();
  const id = document.getElementById("editPubId").value;
  const texto = document.getElementById("editPubTexto").value.trim();

  if (!texto) {
    window.mostrarToast("Escribe algo para publicar", "error");
    return;
  }

  try {
    const res = await fetch(`/api/publicacion/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        correo: usuarioActual.correo,
        publicacion: texto
      })
    });

    const data = await res.json();

    if (res.ok) {
      window.mostrarToast("Publicación actualizada", "success");
      bootstrap.Modal.getInstance(document.getElementById("editarPublicacionModal")).hide();
      window.cargarPublicaciones(usuarioActual.correo);
    } else {
      window.mostrarToast(data.error || "Error al actualizar", "error");
    }
  } catch (err) {
    console.error("Error actualizando publicación:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

window.eliminarPublicacion = async function(id) {
  const usuarioActual = window.getUsuarioActual();
  
  if (!confirm("¿Estás seguro de eliminar esta publicación?")) {
    return;
  }

  try {
    const res = await fetch(`/api/publicacion/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: usuarioActual.correo })
    });

    const data = await res.json();

    if (res.ok) {
      window.mostrarToast("Publicación eliminada", "success");
      window.cargarPublicaciones(usuarioActual.correo);
    } else {
      window.mostrarToast(data.error || "Error al eliminar", "error");
    }
  } catch (err) {
    console.error("Error eliminando publicación:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

function setupInputAnimations() {
  document.querySelectorAll('.input-animated').forEach(input => {
    const label = input.parentElement?.querySelector('.label-animated');
    
    if (!label) return;
    
    input.addEventListener('focus', function() {
      label.style.top = '-10px';
      label.style.fontSize = '0.85rem';
      label.style.color = '#ba01ff';
      label.style.fontWeight = '600';
    });

    input.addEventListener('blur', function() {
      if (this.value === '') {
        label.style.top = '50%';
        label.style.fontSize = '1rem';
        label.style.color = '#999';
        label.style.fontWeight = '400';
      }
    });

    if (input.value !== '') {
      label.style.top = '-10px';
      label.style.fontSize = '0.85rem';
      label.style.color = '#ba01ff';
      label.style.fontWeight = '600';
    }
  });
}

function actualizarLabelsInput() {
  document.querySelectorAll('.input-animated').forEach(input => {
    const label = input.parentElement?.querySelector('.label-animated');
    if (input.value && label) {
      label.style.top = '-10px';
      label.style.fontSize = '0.85rem';
      label.style.color = '#ba01ff';
      label.style.fontWeight = '600';
    }
  });
}

//FORZAR COLORES AL CARGAR Y CAMBIAR DE PÁGINA
function aplicarColoresIconos() {
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  const colorIconos = isDark ? '#aaa' : '#5a189a';
  
// Aplicar colores a todos los iconos de acciones
  document.querySelectorAll('.btn-icon-action, .pub-btn, .pub-stats i, .perfil-fecha i, .section-title i').forEach(el => {
    if (!el.closest('.pub-btn-like.liked')) {
      el.style.color = colorIconos;
    }
  });
}

// Ejecutar al cargar
window.addEventListener('DOMContentLoaded', () => {
  aplicarColoresIconos();
  
// Observar cambios en el tema
  const observer = new MutationObserver(() => {
    aplicarColoresIconos();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme']
  });
});

// Ejecutar cada vez que se carga una página nueva
const originalLoadPage = loadPage;
window.loadPage = function(url) {
  originalLoadPage(url);
  setTimeout(() => {
    aplicarColoresIconos();
  }, 100);
};

// Dentro de loadPage, después de mainContent.innerHTML = html;
setTimeout(() => {
    if (window.aplicarColoresIconos) {
        window.aplicarColoresIconos();
    }
}, 300);

// ===== SISTEMA DE SEGUIDORES (VERSIÓN CORREGIDA) =====
window.mostrarSeguidores = async function() {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  document.getElementById('seguidoresModalTitle').textContent = 'Seguidores';
  const modal = new bootstrap.Modal(document.getElementById('seguidoresModal'));
  modal.show();

  const lista = document.getElementById('seguidoresLista');
  lista.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';

  try {
    const res = await fetch(`/api/usuario/${usuarioActual.correo}/seguidores`);
    const usuarios = await res.json();

    if (usuarios.length === 0) {
      lista.innerHTML = '<p class="text-muted text-center p-4">Aún no tienes seguidores</p>';
      return;
    }

    lista.innerHTML = '';
    const promesas = usuarios.map(user => crearItemUsuario(user));
    const items = await Promise.all(promesas);
    items.forEach(item => lista.appendChild(item));
  } catch (err) {
    console.error('Error cargando seguidores:', err);
    lista.innerHTML = '<p class="text-danger text-center p-4">Error al cargar seguidores</p>';
  }
}

window.mostrarSeguidos = async function() {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  document.getElementById('seguidoresModalTitle').textContent = 'Siguiendo';
  const modal = new bootstrap.Modal(document.getElementById('seguidoresModal'));
  modal.show();

  const lista = document.getElementById('seguidoresLista');
  lista.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';

  try {
    const res = await fetch(`/api/usuario/${usuarioActual.correo}/seguidos`);
    const usuarios = await res.json();

    if (usuarios.length === 0) {
      lista.innerHTML = '<p class="text-muted text-center p-4">Aún no sigues a nadie</p>';
      return;
    }

    lista.innerHTML = '';
    const promesas = usuarios.map(user => crearItemUsuario(user));
    const items = await Promise.all(promesas);
    items.forEach(item => lista.appendChild(item));
  } catch (err) {
    console.error('Error cargando seguidos:', err);
    lista.innerHTML = '<p class="text-danger text-center p-4">Error al cargar seguidos</p>';
  }
}

async function crearItemUsuario(user) {
  const usuarioActual = window.getUsuarioActual();
  const div = document.createElement('div');
  div.className = 'user-list-item';

  const esTuPerfil = usuarioActual && user.correo === usuarioActual.correo;

  let siguiendo = false;
  if (!esTuPerfil && usuarioActual) {
    try {
      const res = await fetch(`/api/siguiendo/${user.id_usuario}?correo=${encodeURIComponent(usuarioActual.correo)}`);
      const data = await res.json();
      siguiendo = data.siguiendo;
    } catch (err) {
      console.error('Error verificando seguimiento:', err);
    }
  }

  div.innerHTML = `
    <div class="user-item-content">
      ${user.foto ? 
        `<img src="${user.foto}" alt="${window.escapeHtml(user.usuario)}" class="user-item-avatar">` :
        `<div class="user-item-avatar-text">${user.usuario.charAt(0).toUpperCase()}</div>`
      }
      <div class="user-item-info">
        <strong>${window.escapeHtml(user.usuario)}</strong>
        <small>${window.escapeHtml(user.correo)}</small>
      </div>
    </div>
    ${!esTuPerfil && usuarioActual ? `
      <button class="btn-seguir-modal ${siguiendo ? 'siguiendo' : ''}" data-id="${user.id_usuario}">
        <i class="bi bi-person-${siguiendo ? 'check-fill' : 'plus'}"></i>
        <span>${siguiendo ? 'Siguiendo' : 'Seguir'}</span>
      </button>
    ` : ''}
  `;

  const btnSeguir = div.querySelector('.btn-seguir-modal');
  if (btnSeguir) {
    btnSeguir.addEventListener('click', async () => {
      await toggleSeguirModal(user.id_usuario, btnSeguir);
    });
  }

  return div;
}

async function toggleSeguirModal(idUsuario, btnElement) {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  try {
    const res = await fetch(`/api/seguir/${idUsuario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: usuarioActual.correo })
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
      
      cargarStatsSeguidores(); // SIN AWAIT
    }
  } catch (err) {
    console.error('Error al seguir:', err);
  }
}

async function cargarStatsSeguidores() {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  try {
    const res = await fetch(`/api/usuario/${usuarioActual.correo}/stats`);
    const data = await res.json();

    const numSeguidores = document.getElementById('numSeguidores');
    const numSeguidos = document.getElementById('numSeguidos');
    
    if (numSeguidores) numSeguidores.textContent = data.seguidores;
    if (numSeguidos) numSeguidos.textContent = data.seguidos;
  } catch (err) {
    console.error('Error cargando stats:', err);
  }
}

// Modificar window.cargarPerfil para agregar stats
const cargarPerfilOriginal = window.cargarPerfil;
window.cargarPerfil = async function() {
  await cargarPerfilOriginal();
  setTimeout(() => {
    cargarStatsSeguidores(); // SIN AWAIT
  }, 500);
}