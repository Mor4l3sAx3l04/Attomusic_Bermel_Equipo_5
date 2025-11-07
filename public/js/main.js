// ==== Función para mostrar notificaciones ====
function showToast(message, type = "success") {
const toast = document.getElementById("toast");
toast.textContent = message;
toast.className = `toast show ${type}`;
setTimeout(() => {
toast.className = "toast";
}, 3000);
}

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