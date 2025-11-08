// ==== Función para mostrar notificaciones ====
function showToast(message, type = "success") {
const toast = document.getElementById("toast");
toast.textContent = message;
toast.className = `toast show ${type}`;
setTimeout(() => {
toast.className = "toast";
}, 3000);
}

// --- Sanitización y validación global ---
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
// --- Inicializar tooltips de Bootstrap ---
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    new bootstrap.Tooltip(tooltipTriggerEl);
});

// --- Carga inicial ---
loadPage('bienvenido.html');

// --- Buscador ---
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

// --- Formularios (registro/login/comentarios) ---
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

// --- Animación de labels y toggles de contraseñas ---
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

// --- Toggle de contraseñas (login y registro) ---
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

// --- Carga dinámica de páginas ---
function loadPage(url) {
let pagePath = url;
if (!url.startsWith('http') && !url.startsWith('/')) {
    if (window.location.pathname.includes('/public/')) {
    pagePath = 'public/' + url.replace(/^\/?/, '');
    }
}

const urlObj = new URL(pagePath, window.location.origin);
const params = urlObj.search;

fetch(urlObj.pathname)
    .then(res => res.text())
    .then(html => {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = html;
    window.scrollTo(0, 0);

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
    })
    .catch(() => {
    document.getElementById('main-content').innerHTML =
        '<div style="padding:40px;text-align:center;color:#ba01ff;font-size:2rem;">No se pudo cargar la página.</div>';
    });
}

// --- Asignar eventos a los links dinámicos ---
document.addEventListener("DOMContentLoaded", function () {
document.querySelectorAll(".load-page").forEach(link => {
    link.addEventListener("click", function(e) {
    e.preventDefault();
    const href = this.getAttribute("href");
    if (href !== "#") loadPage(href);
    });
});
});

// ==== REGISTRO ====
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

    localStorage.setItem("usuario", JSON.stringify({ usuario }));
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

// ==== LOGIN ====
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

        localStorage.setItem("usuario", JSON.stringify({ usuario }));
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

// ==== RESTABLECER CONTRASEÑA ====
const formReset = document.getElementById("resetForm");
if (formReset) {
formReset.addEventListener("submit", async function (e) {
e.preventDefault();

const correo = document.getElementById("resetEmail").value.trim();

if (!correo) {
    showToast("Por favor ingresa tu correo electrónico.", "error");
    return;
}

try {
    const response = await fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo }),
    });

    const data = await response.json();

    if (response.ok) {
    showToast(data.message || "Revisa tu correo para restablecer la contraseña", "success");
    bootstrap.Modal.getInstance(document.getElementById("resetModal")).hide();
    this.reset();
    } else {
    showToast(data.error || "No se pudo enviar el correo de recuperación", "error");
    }
} catch (err) {
    console.error(err);
    showToast("Error de conexión con el servidor", "error");
}
});
}

function actualizarInterfaz() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const perfilContainer = document.getElementById("perfil-container");
  const perfilNombre = document.getElementById("perfil-nombre");

  if (usuario) {
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