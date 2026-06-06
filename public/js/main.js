//Función showToast eliminada para usar la versión musical global

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
    function realizarBusqueda() {
      const query = sanitizeInput(searchInput.value.trim());
      if (isNotEmpty(query)) {
        loadPage(`buscador.html?q=${encodeURIComponent(query)}&type=track,artist,album`);
        searchInput.classList.remove("is-invalid");
      } else {
        searchInput.classList.add("is-invalid");
      }
    }

    searchBtn.addEventListener("click", () => {
      if (!searchInput.classList.contains("active")) {
        searchInput.classList.add("active");
        searchInput.focus();
      } else {
        realizarBusqueda();
      }
    });

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        realizarBusqueda();
      }
    });

    searchInput.addEventListener("input", function () {
      if (this.value.trim().length > 0) {
        this.classList.remove("is-invalid");
      }
    });

    searchInput.addEventListener("blur", function () {
      if (isNotEmpty(this.value)) {
        this.classList.remove("is-invalid");
      }
    });
  }

  //Formularios (registro/login/comentarios)
  document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", function (e) {
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
        showToast("Por favor, completa todos los campos correctamente.", "error");
      }
    });

    form.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener("keypress", allowOnlyNumbers);
    });

    form.querySelectorAll("input, textarea").forEach(input => {
      input.addEventListener("input", function () {
        if (isNotEmpty(this.value)) this.classList.remove("is-invalid");
      });
      input.addEventListener("focus", function () {
        this.classList.remove("is-invalid");
      });
    });
  });

  //Animación de labels y toggles de contraseñas
  const inputs = document.querySelectorAll('.input-animated');
  inputs.forEach(input => {
    const label = input.parentElement.querySelector('.label-animated');
    const border = input.parentElement.querySelector('.input-border');

    input.addEventListener('focus', function () {
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

    input.addEventListener('blur', function () {
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
      btn.addEventListener('click', function () {
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
window._loadedScripts = window._loadedScripts || new Set();

function loadPage(url) {
  let pagePath = url;
  if (!url.startsWith('http')) {
    pagePath = '/' + url.replace(/^\/?/, '');
  }

  const urlObj = new URL(pagePath, window.location.origin);
  const params = urlObj.search;

  fetch(urlObj.pathname)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = html;
      window.scrollTo(0, 0);

      const urlParams = new URLSearchParams(params);
      if (urlObj.pathname.includes('perfil-usuario.html') && urlParams.get('id')) {
        window._perfilUsuarioId = urlParams.get('id');
      }

      if (urlObj.pathname.includes('pagina-artista.html') && urlParams.get('id')) {
        window._paginaArtistaId = urlParams.get('id');
      }

      if (urlObj.pathname.includes('buscador.html')) {
        window._searchParams = params;
      }

      const scripts = Array.from(mainContent.querySelectorAll('script'));
      const externalScripts = scripts.filter(s => s.src);
      const inlineScripts = scripts.filter(s => !s.src);

      Promise.all(
        externalScripts.map(oldScript => {
          return new Promise((resolve, reject) => {
            const src = oldScript.src;

            if (window._loadedScripts.has(src)) {
              const scriptName = src.split('/').pop().replace('.js', '');
              const initFn = window[`init_${scriptName}`];
              if (typeof initFn === 'function') {
                initFn();
              }
              resolve();
              return;
            }

            const newScript = document.createElement('script');
            newScript.src = src;
            newScript.async = false;

            newScript.onload = () => {
              window._loadedScripts.add(src);
              resolve();
            };

            newScript.onerror = () => {
              console.error(' Error cargando:', src);
              reject(new Error(`Failed to load ${src}`));
            };

            document.head.appendChild(newScript);
          });
        })
      )
        .then(() => {
          inlineScripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.textContent = oldScript.textContent;
            document.body.appendChild(newScript);
          });

          setTimeout(() => {
            if (typeof aplicarColoresIconos === 'function') {
              aplicarColoresIconos();
            }
          }, 300);
        })
        .catch(error => {
          console.error(' Error cargando scripts:', error);
        });
    })
    .catch(error => {
      console.error(' Error fetch:', error);
      document.getElementById('main-content').innerHTML =
        '<div style="padding:40px;text-align:center;color:#ba01ff;font-size:2rem;">No se pudo cargar la página.</div>';
    });
}

// Event delegation para links dinámicos
document.addEventListener("click", function (e) {
  const link = e.target.closest(".load-page");
  if (link) {
    e.preventDefault();
    const href = link.getAttribute("href");
    if (href && href !== "#") {
      loadPage(href);
    }
  }
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
        sessionStorage.setItem('correo', correo);
        sessionStorage.setItem('usuario', usuario);

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

        localStorage.setItem("usuario", JSON.stringify({
          usuario: data.user.usuario,
          correo: data.user.correo
        }));

        sessionStorage.setItem('correo', data.user.correo);
        sessionStorage.setItem('usuario', data.user.usuario);
        sessionStorage.setItem('id_usuario', data.user.id_usuario);
        sessionStorage.setItem('rol', data.user.rol);

        actualizarInterfaz();
        // Las notificaciones las inicia actualizarInterfaz() automáticamente

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
      const response = await fetch("/reset-password/request", {
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

  const btnEyeReset = document.querySelector('.btn-eye-reset');
  const resetPasswordInput = document.getElementById('resetPassword');
  if (btnEyeReset && resetPasswordInput) {
    btnEyeReset.addEventListener('click', function () {
      const isPassword = resetPasswordInput.type === 'password';
      resetPasswordInput.type = isPassword ? 'text' : 'password';
      const icon = this.querySelector('i');
      icon.classList.toggle('bi-eye-slash');
      icon.classList.toggle('bi-eye');
    });
  }
}

// ─────────────────────────────────────────────────────────
// actualizarInterfaz: muestra/oculta campanita + perfil + VIP
// ─────────────────────────────────────────────────────────
async function actualizarInterfaz() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const btnLogin        = document.getElementById("btn-login");
  const btnRegister     = document.getElementById("btn-register");
  const perfilContainer = document.getElementById("perfil-container");
  const perfilNombre    = document.getElementById("perfil-nombre");
  const notifWrap       = document.getElementById("notif-wrap");
  const upgradeWrap     = document.getElementById("btn-upgrade-wrap");
  const vipBadge        = document.getElementById("navbar-vip-badge");

  if (usuario) {
    try {
      const res = await fetch(`/api/perfil/${usuario.correo}`);
      if (res.ok) {
        const data = await res.json();

        const perfilPic = perfilContainer.querySelector('.profile-pic');
        if (perfilPic && data.foto) perfilPic.src = data.foto;

        const panelAdminLink = document.getElementById('panel-admin-link');
        if (panelAdminLink) {
          panelAdminLink.style.display = data.rol === 'admin' ? 'block' : 'none';
        }

        // Guardar id_usuario siempre (no solo al login)
        if (data.id_usuario) sessionStorage.setItem('id_usuario', String(data.id_usuario));

        // Estado VIP / Plan
        const esVip = data.es_vip || data.rol === 'admin';
        const tipoPlan = data.rol === 'admin' ? 'attoelite' : (data.tipo_plan || null);
        const esElite = tipoPlan === 'attoelite';
        sessionStorage.setItem('es_vip', esVip ? 'true' : 'false');
        sessionStorage.setItem('tipo_plan', tipoPlan || '');
        sessionStorage.setItem('es_elite', esElite ? 'true' : 'false');

        // Badges en navbar
        const eliteBadge = document.getElementById('navbar-elite-badge');
        if (vipBadge) vipBadge.style.display = (esVip && !esElite) ? 'inline-flex' : 'none';
        if (eliteBadge) eliteBadge.style.display = esElite ? 'inline-flex' : 'none';

        // Botón "Mejorar Experiencia" solo si NO tiene plan activo
        if (upgradeWrap) {
          upgradeWrap.style.cssText = esVip
            ? "display: none !important;"
            : "display: flex !important; align-items: center;";
        }

        // Mostrar opción de cancelar plan en el dropdown
        actualizarDropdownVip(esVip, data.rol, tipoPlan);
      }
    } catch (err) {
      console.warn("No se pudo cargar la foto del perfil");
    }

    btnLogin.style.display    = "none";
    btnRegister.style.display = "none";
    perfilContainer.style.display = "inline-block";
    perfilNombre.textContent  = usuario.usuario;

    if (notifWrap) notifWrap.style.cssText = "display: flex !important; align-items: center;";
    if (window.Notificaciones) window.Notificaciones.iniciar();

    // Mostrar carrito y actualizar badge
    const carritoWrap = document.getElementById('carrito-wrap');
    if (carritoWrap) carritoWrap.style.cssText = "display: flex !important; align-items: center;";
    try {
      const carrito = JSON.parse(localStorage.getItem('attomusic_carrito')) || [];
      const total = carrito.reduce((s, i) => s + (i.cantidad || 1), 0);
      const badge = document.getElementById('carrito-badge');
      if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'flex' : 'none'; }
    } catch { /* sin carrito */ }

  } else {
    btnLogin.style.display    = "inline-block";
    btnRegister.style.display = "inline-block";
    perfilContainer.style.display = "none";

    if (notifWrap) notifWrap.style.cssText = "display: none !important;";
    if (upgradeWrap) upgradeWrap.style.cssText = "display: none !important;";
    const carritoWrap = document.getElementById('carrito-wrap');
    if (carritoWrap) carritoWrap.style.cssText = "display: none !important;";
    if (vipBadge) vipBadge.style.display = 'none';
    if (window.Notificaciones) window.Notificaciones.detener();

    sessionStorage.removeItem('es_vip');
  }
}

function actualizarDropdownVip(esVip, rol, tipoPlan) {
  const viejo = document.getElementById('dropdown-vip-item');
  if (viejo) viejo.remove();
  const viejoElite = document.getElementById('dropdown-elite-item');
  if (viejoElite) viejoElite.remove();

  const dropdown = document.querySelector('#perfil-container .dropdown-menu');
  if (!dropdown) return;

  const divider = dropdown.querySelector('.dropdown-divider');
  const insertTarget = divider ? divider.parentElement : null;

  if (esVip && rol !== 'admin') {
    const esElite = tipoPlan === 'attoelite';
    const planLabel = esElite ? 'AttoElite' : 'AttoPlus';
    const planIcon = esElite ? 'bi-gem' : 'bi-crown';
    const planColor = esElite ? '#FF8C00' : '#ba01ff';

    // Opción cancelar plan
    const liCancel = document.createElement('li');
    liCancel.id = 'dropdown-vip-item';
    liCancel.innerHTML = `<a class="dropdown-item" href="#" id="btn-cancelar-vip" style="color:${planColor};font-weight:600;">
      <i class="bi ${planIcon} me-1"></i>Cancelar ${planLabel}
    </a>`;
    if (insertTarget) dropdown.insertBefore(liCancel, insertTarget);
    else dropdown.appendChild(liCancel);

    document.getElementById('btn-cancelar-vip').addEventListener('click', async (e) => {
      e.preventDefault();
      if (!await attoConfirm(`Tu insignia y canciones publicadas se mantienen.`, { title: `¿Cancelar ${planLabel}?`, confirmText: 'Sí, cancelar', cancelText: 'No, quedarse', icon: 'warning' })) return;
      await cancelarVip();
    });

    // Si es AttoElite, agregar enlace a "Mi página artista"
    if (esElite) {
      const liPagina = document.createElement('li');
      liPagina.id = 'dropdown-elite-item';
      const idUsuario = sessionStorage.getItem('id_usuario');
      liPagina.innerHTML = `<a class="dropdown-item load-page" href="pagina-artista.html?id=${idUsuario}" style="color:#FF8C00;font-weight:600;">
        <i class="bi bi-person-lines-fill me-1"></i>Mi Página Artista
      </a>`;
      if (insertTarget) dropdown.insertBefore(liPagina, insertTarget);
      else dropdown.appendChild(liPagina);
    }
  }
}

// ─────────────────────────────────────────────────────────
// Cerrar sesión
// ─────────────────────────────────────────────────────────
document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("usuario");
  sessionStorage.removeItem('correo');
  sessionStorage.removeItem('usuario');
  sessionStorage.removeItem('id_usuario');
  sessionStorage.removeItem('rol');

  showToast("Sesión cerrada correctamente", "success");
  actualizarInterfaz(); // esto ya llama a Notificaciones.detener() internamente
});

// Al cargar la página, verificar sesión
window.addEventListener("DOMContentLoaded", actualizarInterfaz);

//GESTIÓN DE PERFIL
window.cargarPerfil = async function () {
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

      const badgeTituloPropio = document.getElementById('badge-titulo-real-propio');
      if (badgeTituloPropio) {
        const titulos = { 1: 'Rey de la Música', 2: 'Príncipe de la Música', 3: 'Caballero de la Música' };
        const titulo = titulos[data.posicion_ranking];
        if (titulo) {
          badgeTituloPropio.innerHTML = `<span class="titulo-real titulo-real-${data.posicion_ranking} titulo-real-perfil">${titulo}</span>`;
          badgeTituloPropio.style.display = 'block';
        } else {
          badgeTituloPropio.style.display = 'none';
        }
      }

      const perfilContainer = document.querySelector(".perfil-container");
      const perfilHeader = document.querySelector(".perfil-header");
      if (perfilContainer) {
        perfilContainer.style.backgroundImage = "";
        perfilContainer.style.backgroundSize = "";
        perfilContainer.style.backgroundPosition = "";
        perfilContainer.classList.remove("con-fondo-personalizado");
      }
      if (perfilHeader && data.fondo_perfil) {
        perfilHeader.style.backgroundImage = `url(${data.fondo_perfil})`;
        perfilHeader.classList.add("con-fondo-personalizado");
      } else if (perfilHeader) {
        perfilHeader.style.backgroundImage = "";
        perfilHeader.classList.remove("con-fondo-personalizado");
      }

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
      window.fondoPerfilAjustado = data.fondo_perfil || "";
      window.fondoPostsAjustado = data.fondo_publicaciones || "";
      prepararPreviewFondo("imgPreviewPerfil", data.fondo_perfil);
      prepararPreviewFondo("imgPreviewPosts", data.fondo_publicaciones);

      setTimeout(actualizarLabelsInput, 100);

      window.cargarPublicaciones(usuarioActual.correo);
    } else {
      window.mostrarToast(data.error || "Error al cargar perfil", "error");
    }
  } catch (err) {
    console.error("Error cargando perfil:", err);
    window.mostrarToast("Error de conexión", "error");
  }
}

window.guardarEstilos = async function (e) {
  if (e) e.preventDefault();

  const usuarioActual = window.getUsuarioActual();
  const imgPerfil = window.fondoPerfilAjustado || "";
  const imgPosts  = window.fondoPostsAjustado || "";

  const body = { correo: usuarioActual.correo };
  if (imgPerfil) body.fondo_perfil = imgPerfil;
  if (imgPosts)  body.fondo_publicaciones = imgPosts;

  try {
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      window.showToast("¡Estilos actualizados! Recargando...", "success");
      bootstrap.Modal.getInstance(document.getElementById("modalEstilos")).hide();
      await window.cargarPerfil();
    } else {
      window.showToast("Error al guardar estilos", "error");
    }
  } catch (err) {
    console.error(err);
    window.showToast("Error de conexión", "error");
  }
}

window.fondoPerfilAjustado = window.fondoPerfilAjustado || "";
window.fondoPostsAjustado = window.fondoPostsAjustado || "";

function prepararPreviewFondo(previewId, src) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  if (src) {
    preview.src = src;
    preview.style.display = "block";
  } else {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }
}

const cropFondoState = {
  tipo: "perfil",
  src: "",
  img: null,
  zoom: 1,
  baseScale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0
};

window.abrirEditorFondo = function (input, tipo) {
  const file = input.files && input.files[0];
  input.value = "";

  if (!file) return;
  if (!file.type.startsWith("image/")) {
    window.mostrarToast("Selecciona una imagen valida", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    window.mostrarToast("La imagen no puede superar 5MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => iniciarEditorFondo(event.target.result, tipo);
  reader.readAsDataURL(file);
};

function iniciarEditorFondo(src, tipo) {
  const modalEl = document.getElementById("modalAjustarFondo");
  const frame = document.getElementById("cropFrame");
  const img = document.getElementById("cropImage");
  const zoom = document.getElementById("cropZoom");
  const titulo = document.getElementById("cropTitulo");
  const ayuda = document.getElementById("cropAyuda");
  if (!modalEl || !frame || !img || !zoom) return;

  cropFondoState.tipo = tipo;
  cropFondoState.src = src;
  cropFondoState.img = img;
  cropFondoState.zoom = 1;
  cropFondoState.offsetX = 0;
  cropFondoState.offsetY = 0;
  zoom.value = "1";

  frame.classList.toggle("is-post", tipo === "posts");
  if (titulo) titulo.textContent = tipo === "posts" ? "Ajustar fondo de publicaciones" : "Ajustar fondo de perfil";
  if (ayuda) ayuda.textContent = "Arrastra la imagen para elegir que parte se vera y usa el zoom para acercar.";

  img.onload = () => {
    calcularBaseRecorte();
    actualizarVistaRecorte();
  };
  img.src = src;

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
  setTimeout(() => {
    calcularBaseRecorte();
    actualizarVistaRecorte();
  }, 180);
}

function calcularBaseRecorte() {
  const frame = document.getElementById("cropFrame");
  const img = cropFondoState.img;
  if (!frame || !img || !img.naturalWidth || !img.naturalHeight) return;

  const rect = frame.getBoundingClientRect();
  cropFondoState.baseScale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
}

function limitarOffsetRecorte() {
  const frame = document.getElementById("cropFrame");
  const img = cropFondoState.img;
  if (!frame || !img) return;

  const rect = frame.getBoundingClientRect();
  const width = img.naturalWidth * cropFondoState.baseScale * cropFondoState.zoom;
  const height = img.naturalHeight * cropFondoState.baseScale * cropFondoState.zoom;
  const maxX = Math.max(0, (width - rect.width) / 2);
  const maxY = Math.max(0, (height - rect.height) / 2);

  cropFondoState.offsetX = Math.max(-maxX, Math.min(maxX, cropFondoState.offsetX));
  cropFondoState.offsetY = Math.max(-maxY, Math.min(maxY, cropFondoState.offsetY));
}

function actualizarVistaRecorte() {
  const img = cropFondoState.img;
  if (!img || !img.naturalWidth) return;

  limitarOffsetRecorte();
  const width = img.naturalWidth * cropFondoState.baseScale * cropFondoState.zoom;
  img.style.width = `${width}px`;
  img.style.height = "auto";
  img.style.transform = `translate(-50%, -50%) translate(${cropFondoState.offsetX}px, ${cropFondoState.offsetY}px)`;
}

function exportarFondoAjustado() {
  const frame = document.getElementById("cropFrame");
  const img = cropFondoState.img;
  if (!frame || !img || !img.naturalWidth) return "";

  const rect = frame.getBoundingClientRect();
  const outputWidth = 1600;
  const outputHeight = cropFondoState.tipo === "posts" ? 480 : 420;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  const renderScaleX = outputWidth / rect.width;
  const renderScaleY = outputHeight / rect.height;
  const displayWidth = img.naturalWidth * cropFondoState.baseScale * cropFondoState.zoom;
  const displayHeight = img.naturalHeight * cropFondoState.baseScale * cropFondoState.zoom;
  const drawWidth = displayWidth * renderScaleX;
  const drawHeight = displayHeight * renderScaleY;
  const drawX = (outputWidth - drawWidth) / 2 + cropFondoState.offsetX * renderScaleX;
  const drawY = (outputHeight - drawHeight) / 2 + cropFondoState.offsetY * renderScaleY;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL("image/jpeg", 0.86);
}

document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "cropZoom") {
    cropFondoState.zoom = Number(e.target.value) || 1;
    actualizarVistaRecorte();
  }
});

document.addEventListener("pointerdown", (e) => {
  const frame = e.target && e.target.closest ? e.target.closest("#cropFrame") : null;
  if (!frame) return;
  cropFondoState.dragging = true;
  cropFondoState.startX = e.clientX;
  cropFondoState.startY = e.clientY;
  cropFondoState.startOffsetX = cropFondoState.offsetX;
  cropFondoState.startOffsetY = cropFondoState.offsetY;
  frame.setPointerCapture(e.pointerId);
});

document.addEventListener("pointermove", (e) => {
  if (!cropFondoState.dragging) return;
  cropFondoState.offsetX = cropFondoState.startOffsetX + e.clientX - cropFondoState.startX;
  cropFondoState.offsetY = cropFondoState.startOffsetY + e.clientY - cropFondoState.startY;
  actualizarVistaRecorte();
});

document.addEventListener("pointerup", () => {
  cropFondoState.dragging = false;
});

document.addEventListener("click", (e) => {
  if (!e.target || e.target.id !== "btnAplicarRecorte") return;

  const ajustado = exportarFondoAjustado();
  if (!ajustado) return;

  if (cropFondoState.tipo === "posts") {
    window.fondoPostsAjustado = ajustado;
    prepararPreviewFondo("imgPreviewPosts", ajustado);
  } else {
    window.fondoPerfilAjustado = ajustado;
    prepararPreviewFondo("imgPreviewPerfil", ajustado);
  }

  const modalEl = document.getElementById("modalAjustarFondo");
  if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
});

window.cargarPublicaciones = async function (correo) {
  const container = document.getElementById("misPublicaciones");
  if (!container) return;

  container.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary"></div></div>';

  try {
    const res  = await fetch(`/api/perfil/${correo}/publicaciones`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error cargando publicaciones');

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<p class="text-center text-muted p-4">Aún no has publicado nada.</p>';
      return;
    }

    data.forEach(pub => {
      if (window.PublicacionCard) {
        const card = new window.PublicacionCard(pub, {
          esPerfilPropio: true,
          correoActual: correo,
          mostrarBotonesInteraccion: true,
          mostrarBotonSeguir: false,
          mostrarBotonEditar: true,
          mostrarBotonEliminar: true
        });
        container.appendChild(card.element);
      }
    });

  } catch (err) {
    console.error("Error cargando mis publicaciones:", err);
    const idUsuario = sessionStorage.getItem('id_usuario');
    if (idUsuario) {
      try {
        const res2  = await fetch(`/api/usuario/${idUsuario}/publicaciones`);
        const data2 = await res2.json();
        if (res2.ok) {
          container.innerHTML = '';
          if (data2.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-4">Aún no has publicado nada.</p>';
            return;
          }
          data2.forEach(pub => {
            if (window.PublicacionCard) {
              const card = new window.PublicacionCard(pub, {
                esPerfilPropio: true,
                correoActual: correo,
                mostrarBotonesInteraccion: true,
                mostrarBotonSeguir: false,
                mostrarBotonEditar: true,
                mostrarBotonEliminar: true
              });
              container.appendChild(card.element);
            }
          });
          return;
        }
      } catch (e) { console.error(e); }
    }
    container.innerHTML = '<div class="alert alert-danger">Error cargando publicaciones</div>';
  }
};

window.inicializarPerfil = function () {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  const btnCambiarFoto = document.getElementById("btnCambiarFoto");
  const inputFoto      = document.getElementById("inputFoto");
  const formEstilos    = document.getElementById("formEstilos");
  const btnElegirArchivoFoto = document.getElementById("btnElegirArchivoFoto");
  const btnTomarFoto = document.getElementById("btnTomarFoto");
  const modalCambiarFotoEl = document.getElementById("modalCambiarFoto");

  if (formEstilos) formEstilos.onsubmit = window.guardarEstilos;

  if (btnElegirArchivoFoto && inputFoto) {
    btnElegirArchivoFoto.onclick = () => {
      if (modalCambiarFotoEl) bootstrap.Modal.getOrCreateInstance(modalCambiarFotoEl).hide();
      inputFoto.click();
    };
  }

  if (btnTomarFoto) {
    btnTomarFoto.onclick = async () => {
      if (modalCambiarFotoEl) bootstrap.Modal.getOrCreateInstance(modalCambiarFotoEl).hide();
      await abrirCamara();
    };
  }

  if (btnCambiarFoto && inputFoto) {
    btnCambiarFoto.onclick = () => {
      if (modalCambiarFotoEl) {
        bootstrap.Modal.getOrCreateInstance(modalCambiarFotoEl).show();
      } else {
        inputFoto.click();
      }
    };

    inputFoto.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) await subirFoto(file);
      inputFoto.value = "";
    };
  }

  const formEditarPerfil = document.getElementById("formEditarPerfil");
  if (formEditarPerfil) {
    formEditarPerfil.onsubmit = async (e) => {
      e.preventDefault();
      await actualizarPerfil();
    };
  }

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
        body: JSON.stringify({ correo: usuarioActual.correo, foto: fotoBase64 })
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
    const modal  = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-container">
        <video id="videoCamera" autoplay playsinline style="width:100%;max-width:500px;border-radius:12px;"></video>
        <div class="camera-controls">
          <button class="btn btn-gradient" id="btnCapturar"><i class="bi bi-camera"></i> Capturar</button>
          <button class="btn btn-secondary" id="btnCancelar">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const video = document.getElementById('videoCamera');
    video.srcObject = stream;

    document.getElementById('btnCapturar').onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        await subirFoto(blob);
        stream.getTracks().forEach(t => t.stop());
        modal.remove();
      }, 'image/jpeg', 0.8);
    };

    document.getElementById('btnCancelar').onclick = () => {
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    };
  } catch (err) {
    console.error("Error accediendo a la cámara:", err);
    window.mostrarToast("No se pudo acceder a la cámara", "error");
  }
}

async function actualizarPerfil() {
  const usuarioActual = window.getUsuarioActual();
  const nuevoUsuario  = document.getElementById("editNombre").value.trim();
  const nuevoCorreo   = document.getElementById("editCorreo").value.trim();

  if (!nuevoUsuario || !nuevoCorreo) {
    window.mostrarToast("Completa todos los campos", "error");
    return;
  }

  try {
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: usuarioActual.correo, nuevoUsuario, nuevoCorreo })
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

window.editarPublicacion = function (id, texto) {
  document.getElementById("editPubId").value    = id;
  document.getElementById("editPubTexto").value = texto;
  new bootstrap.Modal(document.getElementById("editarPublicacionModal")).show();
}

async function guardarEdicionPublicacion() {
  const usuarioActual = window.getUsuarioActual();
  const id    = document.getElementById("editPubId").value;
  const texto = document.getElementById("editPubTexto").value.trim();

  if (!texto) { window.mostrarToast("Escribe algo para publicar", "error"); return; }

  try {
    const res = await fetch(`/api/publicacion/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: usuarioActual.correo, publicacion: texto })
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

window.eliminarPublicacion = async function (id) {
  const usuarioActual = window.getUsuarioActual();
  if (!await attoConfirm('Esta acción no se puede deshacer.', { title: '¿Eliminar publicación?', confirmText: 'Eliminar', icon: 'danger' })) return;

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

    input.addEventListener('focus', function () {
      label.style.top        = '-10px';
      label.style.fontSize   = '0.85rem';
      label.style.color      = '#ba01ff';
      label.style.fontWeight = '600';
    });
    input.addEventListener('blur', function () {
      if (this.value === '') {
        label.style.top        = '50%';
        label.style.fontSize   = '1rem';
        label.style.color      = '#999';
        label.style.fontWeight = '400';
      }
    });
    if (input.value !== '') {
      label.style.top        = '-10px';
      label.style.fontSize   = '0.85rem';
      label.style.color      = '#ba01ff';
      label.style.fontWeight = '600';
    }
  });
}

function actualizarLabelsInput() {
  document.querySelectorAll('.input-animated').forEach(input => {
    const label = input.parentElement?.querySelector('.label-animated');
    if (input.value && label) {
      label.style.top        = '-10px';
      label.style.fontSize   = '0.85rem';
      label.style.color      = '#ba01ff';
      label.style.fontWeight = '600';
    }
  });
}

//FORZAR COLORES AL CARGAR Y CAMBIAR DE PÁGINA
function aplicarColoresIconos() {
  const isDark      = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  const colorIconos = isDark ? '#aaa' : '#5a189a';

  document.querySelectorAll('.btn-icon-action, .pub-btn, .pub-stats i, .perfil-fecha i, .section-title i').forEach(el => {
    if (!el.closest('.pub-btn-like.liked')) {
      el.style.color = colorIconos;
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  aplicarColoresIconos();
  const observer = new MutationObserver(() => { aplicarColoresIconos(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
});

const originalLoadPage = loadPage;
window.loadPage = function (url) {
  originalLoadPage(url);
  setTimeout(() => { aplicarColoresIconos(); }, 100);
};

setTimeout(() => {
  if (window.aplicarColoresIconos) window.aplicarColoresIconos();
}, 300);

//SISTEMA DE SEGUIDORES
window.mostrarSeguidores = async function () {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  document.getElementById('seguidoresModalTitle').textContent = 'Seguidores';
  const modal = new bootstrap.Modal(document.getElementById('seguidoresModal'));
  modal.show();

  const lista = document.getElementById('seguidoresLista');
  lista.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';

  try {
    const res      = await fetch(`/api/usuario/${usuarioActual.correo}/seguidores`);
    const usuarios = await res.json();

    if (usuarios.length === 0) {
      lista.innerHTML = '<p class="text-muted text-center p-4">Aún no tienes seguidores</p>';
      return;
    }

    lista.innerHTML = '';
    const promesas = usuarios.map(user => crearItemUsuario(user));
    const items    = await Promise.all(promesas);
    items.forEach(item => lista.appendChild(item));
  } catch (err) {
    console.error('Error cargando seguidores:', err);
    lista.innerHTML = '<p class="text-danger text-center p-4">Error al cargar seguidores</p>';
  }
}

window.mostrarSeguidos = async function () {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  document.getElementById('seguidoresModalTitle').textContent = 'Siguiendo';
  const modal = new bootstrap.Modal(document.getElementById('seguidoresModal'));
  modal.show();

  const lista = document.getElementById('seguidoresLista');
  lista.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';

  try {
    const res      = await fetch(`/api/usuario/${usuarioActual.correo}/seguidos`);
    const usuarios = await res.json();

    if (usuarios.length === 0) {
      lista.innerHTML = '<p class="text-muted text-center p-4">Aún no sigues a nadie</p>';
      return;
    }

    lista.innerHTML = '';
    const promesas = usuarios.map(user => crearItemUsuario(user));
    const items    = await Promise.all(promesas);
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
      const res  = await fetch(`/api/siguiendo/${user.id_usuario}?correo=${encodeURIComponent(usuarioActual.correo)}`);
      const data = await res.json();
      siguiendo = data.siguiendo;
    } catch (err) {
      console.error('Error verificando seguimiento:', err);
    }
  }

  div.innerHTML = `
    <div class="user-item-content">
      ${user.foto
        ? `<img src="${user.foto}" alt="${window.escapeHtml(user.usuario)}" class="user-item-avatar">`
        : `<div class="user-item-avatar-text">${user.usuario.charAt(0).toUpperCase()}</div>`
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
    const res  = await fetch(`/api/seguir/${idUsuario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: usuarioActual.correo })
    });
    const data = await res.json();

    if (res.ok) {
      if (data.siguiendo) {
        btnElement.classList.add('siguiendo');
        btnElement.querySelector('i').className   = 'bi bi-person-check-fill';
        btnElement.querySelector('span').textContent = 'Siguiendo';
      } else {
        btnElement.classList.remove('siguiendo');
        btnElement.querySelector('i').className   = 'bi bi-person-plus';
        btnElement.querySelector('span').textContent = 'Seguir';
      }
      cargarStatsSeguidores();
    }
  } catch (err) {
    console.error('Error al seguir:', err);
  }
}

async function cargarStatsSeguidores() {
  const usuarioActual = window.getUsuarioActual();
  if (!usuarioActual) return;

  try {
    const res  = await fetch(`/api/usuario/${usuarioActual.correo}/stats`);
    const data = await res.json();

    const numSeguidores = document.getElementById('numSeguidores');
    const numSeguidos   = document.getElementById('numSeguidos');

    if (numSeguidores) numSeguidores.textContent = data.seguidores;
    if (numSeguidos)   numSeguidos.textContent   = data.seguidos;
  } catch (err) {
    console.error('Error cargando stats:', err);
  }
}

const cargarPerfilOriginal = window.cargarPerfil;
window.cargarPerfil = async function () {
  await cargarPerfilOriginal();
  setTimeout(() => { cargarStatsSeguidores(); }, 500);
}

// ─────────────────────────────────────────────────────────
// Funciones Modal AttoPlus / AttoElite
// ─────────────────────────────────────────────────────────

window._planSeleccionado = null; // 'attoplus' | 'attoelite'

window.resetCardHover = function (plan) {
  if (plan === 'attoplus') {
    document.getElementById('card-attoplus').style.borderColor = 'rgba(186,1,255,0.4)';
    document.getElementById('card-attoplus').style.background = 'rgba(186,1,255,0.05)';
  } else {
    document.getElementById('card-attoelite').style.borderColor = 'rgba(255,165,0,0.4)';
    document.getElementById('card-attoelite').style.background = 'rgba(255,165,0,0.05)';
  }
};

window.seleccionarPlan = function (plan) {
  window._planSeleccionado = plan;
  const esElite = plan === 'attoelite';

  // Actualizar paso 1 según el plan elegido
  const iconWrap = document.getElementById('plan-icon-wrap');
  const titulo = document.getElementById('plan-nombre-titulo');
  const subtitulo = document.getElementById('plan-subtitulo');
  const beneficios = document.getElementById('plan-beneficios');
  const precioDisplay = document.getElementById('plan-precio-display');
  const precioBtnSpan = document.getElementById('pago-precio-btn');
  const btnContinuar = document.getElementById('btn-plan-continuar');

  if (esElite) {
    iconWrap.style.background = 'linear-gradient(135deg,#FFD700,#FF8C00)';
    iconWrap.style.boxShadow = '0 8px 24px rgba(255,165,0,0.4)';
    iconWrap.innerHTML = '<i class="bi bi-gem" style="font-size:2rem;color:#1a0800;"></i>';
    titulo.style.cssText = 'font-size:1.8rem;font-weight:900;background:linear-gradient(135deg,#FFD700,#FF8C00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin:0;';
    titulo.textContent = 'AttoElite';
    subtitulo.textContent = 'La experiencia definitiva para artistas serios';
    beneficios.style.borderColor = 'rgba(255,165,0,0.25)';
    beneficios.innerHTML = `
      <p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:#FF8C00;font-weight:700;margin-bottom:14px;">Al activar AttoElite obtendrás:</p>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-gem" style="color:#FFD700;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Insignia <strong>AttoElite</strong> dorada visible en perfil y publicaciones</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-music-note-beamed" style="color:#FF8C00;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Publica <strong>canciones propias</strong> como artista</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-person-lines-fill" style="color:#FFD700;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Crea tu <strong>página de artista</strong> premium con bio, géneros y portada</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-collection-play-fill" style="color:#FF8C00;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Organiza tus canciones en <strong>álbumes</strong></span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-calendar-event-fill" style="color:#FFD700;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Publica <strong>eventos</strong> con ubicación en mapa</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-bell-fill" style="color:#FF8C00;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Tus seguidores reciben <strong>notificaciones</strong> de todo lo que publiques</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-megaphone-fill" style="color:#FFD700;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Tu página aparece como <strong>anuncio</strong> a usuarios no premium</span></li>
      </ul>`;
    precioDisplay.style.cssText = 'font-size:2.8rem;font-weight:900;background:linear-gradient(135deg,#FFD700,#FF8C00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;';
    precioDisplay.textContent = '$9.99';
    if (precioBtnSpan) precioBtnSpan.textContent = '$9.99';
    btnContinuar.style.background = 'linear-gradient(135deg,#FFD700,#FF8C00)';
    btnContinuar.style.color = '#1a0800';
    btnContinuar.style.boxShadow = '0 4px 20px rgba(255,165,0,0.4)';
  } else {
    iconWrap.style.background = 'linear-gradient(160deg,#ba01ff,#00dffc)';
    iconWrap.style.boxShadow = '0 8px 24px rgba(186,1,255,0.4)';
    iconWrap.innerHTML = '<i class="bi bi-crown-fill" style="font-size:2rem;color:white;"></i>';
    titulo.style.cssText = 'font-size:1.8rem;font-weight:900;background:linear-gradient(160deg,#ba01ff,#00dffc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin:0;';
    titulo.textContent = 'AttoPlus';
    subtitulo.textContent = 'Lleva tu experiencia musical al siguiente nivel';
    beneficios.style.borderColor = 'rgba(186,1,255,0.2)';
    beneficios.innerHTML = `
      <p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:#ba01ff;font-weight:700;margin-bottom:14px;">Al activar AttoPlus obtendrás:</p>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-crown-fill" style="color:#ffd700;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Una <strong>insignia AttoPlus</strong> visible en tu perfil y publicaciones</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-music-note-beamed" style="color:#00dffc;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Crea <strong>contenido musical propio</strong> como artista y compártelo con la comunidad</span></li>
        <li style="display:flex;align-items:flex-start;gap:10px;"><i class="bi bi-broadcast" style="color:#ba01ff;margin-top:2px;flex-shrink:0;"></i><span style="font-size:0.9rem;">Tus canciones se <strong>recomiendan automáticamente</strong> a todos los usuarios</span></li>
      </ul>`;
    precioDisplay.style.cssText = 'font-size:2.8rem;font-weight:900;background:linear-gradient(160deg,#ba01ff,#00dffc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;';
    precioDisplay.textContent = '$4.99';
    if (precioBtnSpan) precioBtnSpan.textContent = '$4.99';
    btnContinuar.style.background = 'linear-gradient(160deg,#ba01ff,#00dffc)';
    btnContinuar.style.color = 'white';
    btnContinuar.style.boxShadow = '0 4px 20px rgba(186,1,255,0.4)';
  }

  mostrarPasoPlan();
};

window.mostrarPasoSeleccion = function () {
  document.getElementById('attoplus-paso0').style.display = 'block';
  document.getElementById('attoplus-paso1').style.display = 'none';
  document.getElementById('attoplus-paso2').style.display = 'none';
  document.getElementById('attoplus-paso3').style.display = 'none';
};

window.mostrarPasoPago = function () {
  document.getElementById('attoplus-paso0').style.display = 'none';
  document.getElementById('attoplus-paso1').style.display = 'none';
  document.getElementById('attoplus-paso2').style.display = 'block';
  document.getElementById('attoplus-paso3').style.display = 'none';
};

window.mostrarPasoPlan = function () {
  document.getElementById('attoplus-paso0').style.display = 'none';
  document.getElementById('attoplus-paso1').style.display = 'block';
  document.getElementById('attoplus-paso2').style.display = 'none';
  document.getElementById('attoplus-paso3').style.display = 'none';
};

window.formatarTarjeta = function (input) {
  let val = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
};

window.confirmarPagoAttoPlus = async function () {
  const plan = window._planSeleccionado || 'attoplus';
  const btn = document.getElementById('btn-confirmar-pago');
  const nombre = document.getElementById('pago-nombre').value.trim();
  const tarjeta = document.getElementById('pago-tarjeta').value.replace(/\s/g, '');
  const vence = document.getElementById('pago-vence').value.trim();
  const cvv = document.getElementById('pago-cvv').value.trim();
  const precio = plan === 'attoelite' ? '$9.99' : '$4.99';
  const planNombre = plan === 'attoelite' ? 'AttoElite' : 'AttoPlus';

  if (!nombre || tarjeta.length < 16 || !vence || cvv.length < 3) {
    showToast('Completa todos los datos de pago', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

  try {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const res = await fetch('/api/vip/activar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: usuario.correo, plan })
    });
    const data = await res.json();

    if (res.ok) {
      // Actualizar paso 3 según el plan
      const esElite = plan === 'attoelite';
      document.getElementById('success-icon-wrap').style.background = esElite
        ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(160deg,#ba01ff,#00dffc)';
      document.getElementById('success-icon-wrap').style.boxShadow = esElite
        ? '0 8px 28px rgba(255,165,0,0.45)' : '0 8px 28px rgba(186,1,255,0.45)';
      document.getElementById('success-icon-wrap').innerHTML = esElite
        ? '<i class="bi bi-gem" style="font-size:2.2rem;color:#1a0800;"></i>'
        : '<i class="bi bi-crown-fill" style="font-size:2.2rem;color:white;"></i>';
      document.getElementById('success-titulo').style.cssText = esElite
        ? 'font-size:1.9rem;font-weight:900;background:linear-gradient(135deg,#FFD700,#FF8C00);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;'
        : 'font-size:1.9rem;font-weight:900;background:linear-gradient(160deg,#ba01ff,#00dffc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px;';
      document.getElementById('success-titulo').textContent = `¡Bienvenido a ${planNombre}!`;
      document.getElementById('success-subtitulo').textContent = esElite
        ? 'Ya tienes acceso a todos los beneficios exclusivos de élite.'
        : 'Ya eres un usuario VIP. Disfruta todos los beneficios exclusivos.';

      document.getElementById('attoplus-paso2').style.display = 'none';
      document.getElementById('attoplus-paso3').style.display = 'block';
    } else {
      showToast(data.error || `Error al activar ${planNombre}`, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-lock-fill me-2"></i>Pagar ${precio}`;
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-lock-fill me-2"></i>Pagar ${precio}`;
  }
};

window.cerrarModalVipYActualizar = function () {
  const modal = bootstrap.Modal.getInstance(document.getElementById('modalAttoPlus'));
  if (modal) modal.hide();

  setTimeout(() => {
    document.getElementById('attoplus-paso0').style.display = 'block';
    document.getElementById('attoplus-paso1').style.display = 'none';
    document.getElementById('attoplus-paso2').style.display = 'none';
    document.getElementById('attoplus-paso3').style.display = 'none';
    const btn = document.getElementById('btn-confirmar-pago');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Pagar <span id="pago-precio-btn">$4.99</span>'; }
  }, 400);

  const plan = window._planSeleccionado || 'attoplus';
  const esElite = plan === 'attoelite';
  actualizarInterfaz();
  showToast(esElite ? '¡Bienvenido a AttoElite! 💎' : '¡Bienvenido a AttoPlus! 👑', 'success');
};

async function cancelarVip() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) return;
  try {
    const res = await fetch('/api/vip/cancelar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: usuario.correo })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'AttoPlus cancelado', 'success');
      actualizarInterfaz();
    } else {
      showToast(data.error || 'Error al cancelar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

// Exponer helpers de plan para otras páginas
window.getEstadoVip = function () {
  return sessionStorage.getItem('es_vip') === 'true';
};
window.getEstadoElite = function () {
  return sessionStorage.getItem('es_elite') === 'true';
};
window.getTipoPlan = function () {
  return sessionStorage.getItem('tipo_plan') || null;
};

// Reset del modal al cerrarse
document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalAttoPlus');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      ['attoplus-paso0','attoplus-paso1','attoplus-paso2','attoplus-paso3'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.style.display = i === 0 ? 'block' : 'none';
      });
      const btn = document.getElementById('btn-confirmar-pago');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Pagar <span id="pago-precio-btn">$4.99</span>'; }
    });
  }
});

window.animarTituloGlobal = function (selector, texto) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.innerHTML = '';
  el.classList.add('titulo-wow');

  let i = 0;
  const velocidad = 40;

  function escribir() {
    if (i < texto.length) {
      el.innerHTML += texto.charAt(i);
      i++;
      setTimeout(escribir, velocidad);
    }
  }
  escribir();
};
