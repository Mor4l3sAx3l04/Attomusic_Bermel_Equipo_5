// ===== SISTEMA 3D PARA MODALES DE LOGIN Y REGISTRO =====

(function() {
  'use strict';

  // Variables globales
  let modal3dContainer = null;
  let loginCard3d = null;
  let currentModalType = 'login'; // 'login' o 'registro'

  // Inicializar al cargar el DOM
  document.addEventListener('DOMContentLoaded', function() {
    crearModal3D();
    setupEventListeners();
  });

  // Crear estructura HTML del modal 3D
  function crearModal3D() {
    const html = `
      <div id="modal3dContainer" class="modal-3d-container">
        <div class="particles-3d" id="particles3d"></div>
        
        <button class="btn-close-3d" id="btnClose3d">
          <i class="bi bi-x-lg"></i>
        </button>

        <div class="container-3d">
          <div class="login-card-3d" id="loginCard3d">
            <div class="glass-panel-3d">
              <!-- Lado izquierdo - Formulario -->
              <div class="login-section-3d">
                <div class="logo-3d">
                  <div class="logo-icon-3d">
                    <img alt="Icono" src="images/iconowhite.png">
                  </div>
                  <div class="logo-text-3d">ATTOMUSIC</div>
                </div>

                <h2 class="form-title-3d" id="formTitle3d">Login</h2>

                <!-- Contenedor dinámico del formulario -->
                <div id="formContainer3d"></div>

              </div>

              <!-- Lado derecho - Welcome -->
              <div class="welcome-section-3d">
                <h1 class="welcome-text-3d" id="welcomeText3d">
                  WELCOME<br>BACK!
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    
    modal3dContainer = document.getElementById('modal3dContainer');
    loginCard3d = document.getElementById('loginCard3d');
    
    crearParticulas();
    setup3DEffect();
  }

  // Crear partículas animadas
  function crearParticulas() {
    const particlesContainer = document.getElementById('particles3d');
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle-3d';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // Configurar efecto 3D con mouse
  function setup3DEffect() {
    const container = document.querySelector('.container-3d');
    
    // Solo activar efecto 3D en pantallas grandes
    if (window.innerWidth > 768) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Reactivar/desactivar en resize
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
      } else {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        // Resetear transformación en móvil
        if (loginCard3d) {
          loginCard3d.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
        }
      }
    });
  }

  function handleMouseMove(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    loginCard3d.style.transform = `
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
      translateZ(20px)
    `;
  }

  function handleMouseLeave() {
    loginCard3d.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
  }

  // Configurar event listeners
  function setupEventListeners() {
    // Interceptar clicks en botones de login/registro originales
    document.addEventListener('click', function(e) {
      if (e.target.matches('#btn-login') || e.target.closest('#btn-login')) {
        e.preventDefault();
        mostrarModal3D('login');
      } else if (e.target.matches('#btn-register') || e.target.closest('#btn-register')) {
        e.preventDefault();
        mostrarModal3D('registro');
      }
    });

    // Cerrar modal
    const btnClose = document.getElementById('btnClose3d');
    if (btnClose) {
      btnClose.addEventListener('click', cerrarModal3D);
    }

    // Cerrar al hacer click fuera
    modal3dContainer.addEventListener('click', function(e) {
      if (e.target === modal3dContainer) {
        cerrarModal3D();
      }
    });

    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal3dContainer.classList.contains('show')) {
        cerrarModal3D();
      }
    });
  }

  // Mostrar modal 3D
  function mostrarModal3D(tipo) {
    currentModalType = tipo;
    
    if (tipo === 'login') {
      cargarFormularioLogin();
      document.getElementById('formTitle3d').textContent = 'Login';
      document.getElementById('welcomeText3d').innerHTML = 'WELCOME<br>BACK!';
    } else if (tipo === 'registro') {
      cargarFormularioRegistro();
      document.getElementById('formTitle3d').textContent = 'Registro';
      document.getElementById('welcomeText3d').innerHTML = 'JOIN<br>US!';
    } else if (tipo === 'reset') {
      cargarFormularioReset();
      document.getElementById('formTitle3d').textContent = 'Restablecer';
      document.getElementById('welcomeText3d').innerHTML = 'RESET<br>PASSWORD!';
    }
    
    modal3dContainer.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // Cerrar modal 3D
  function cerrarModal3D() {
    modal3dContainer.classList.remove('show');
    document.body.style.overflow = '';
    
    // Limpiar formulario
    const formContainer = document.getElementById('formContainer3d');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
  }

  // Cargar formulario de login
  function cargarFormularioLogin() {
    const html = `
      <form id="loginForm3d">
        <div class="input-group-3d" id="usernameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input 
            type="text" 
            class="form-input-3d" 
            id="username3d" 
            name="usuario"
            placeholder="Usuario"
            required
          >
          <div class="error-message-3d">Por favor ingresa tu usuario</div>
        </div>

        <div class="input-group-3d" id="passwordGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input 
            type="password" 
            class="form-input-3d" 
            id="password3d" 
            name="contrasena"
            placeholder="Contraseña"
            required
          >
          <button type="button" class="toggle-password-3d" id="togglePassword3d">
            <i class="bi bi-eye-slash"></i>
          </button>
          <div class="error-message-3d">Por favor ingresa tu contraseña</div>
        </div>

        <button type="submit" class="btn-login-3d" id="btnLogin3d">
          Iniciar Sesión
        </button>
      </form>

      <div class="form-links-3d">
        <a class="form-link-3d" id="linkForgot3d">¿Olvidaste tu contraseña?</a>
        <a class="form-link-3d primary" id="linkRegister3d">
          ¿No tienes cuenta? <strong>Regístrate aquí</strong>
        </a>
      </div>
    `;
    
    document.getElementById('formContainer3d').innerHTML = html;
    setupFormHandlers();
  }

  // Cargar formulario de registro
  function cargarFormularioRegistro() {
    const html = `
      <form id="registerForm3d">
        <div class="input-group-3d" id="nameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input 
            type="text" 
            class="form-input-3d" 
            id="name3d" 
            name="usuario"
            placeholder="Nombre completo"
            required
          >
          <div class="error-message-3d">Por favor ingresa tu nombre</div>
        </div>

        <div class="input-group-3d" id="emailGroup3d">
          <i class="bi bi-envelope-fill input-icon-3d"></i>
          <input 
            type="email" 
            class="form-input-3d" 
            id="email3d" 
            name="correo"
            placeholder="Correo electrónico"
            required
          >
          <div class="error-message-3d">Por favor ingresa un correo válido</div>
        </div>

        <div class="input-group-3d" id="passwordRegGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input 
            type="password" 
            class="form-input-3d" 
            id="passwordReg3d" 
            name="contrasena"
            placeholder="Contraseña"
            required
          >
          <button type="button" class="toggle-password-3d" id="togglePasswordReg3d">
            <i class="bi bi-eye-slash"></i>
          </button>
          <div class="error-message-3d">Por favor ingresa una contraseña</div>
        </div>

        <button type="submit" class="btn-login-3d" id="btnRegister3d">
          Crear Cuenta
        </button>
      </form>

      <div class="form-links-3d">
        <a class="form-link-3d primary" id="linkLogin3d">
          ¿Ya tienes cuenta? <strong>Inicia sesión</strong>
        </a>
      </div>
    `;
    
    document.getElementById('formContainer3d').innerHTML = html;
    setupFormHandlers();
  }

  // Cargar formulario de restablecer contraseña
  function cargarFormularioReset() {
    const html = `
      <p class="info-text-3d">
        Ingresa tus datos para restablecer tu contraseña
      </p>
      
      <form id="resetForm3d">
        <div class="input-group-3d" id="resetNameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input 
            type="text" 
            class="form-input-3d" 
            id="resetName3d" 
            placeholder="Nombre de usuario"
            required
          >
          <div class="error-message-3d">Por favor ingresa tu nombre de usuario</div>
        </div>

        <div class="input-group-3d" id="resetEmailGroup3d">
          <i class="bi bi-envelope-fill input-icon-3d"></i>
          <input 
            type="email" 
            class="form-input-3d" 
            id="resetEmail3d" 
            placeholder="Correo electrónico"
            required
          >
          <div class="error-message-3d">Por favor ingresa tu correo</div>
        </div>

        <div class="input-group-3d" id="resetPasswordGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input 
            type="password" 
            class="form-input-3d" 
            id="resetPassword3d" 
            placeholder="Nueva contraseña"
            required
          >
          <button type="button" class="toggle-password-3d" id="toggleResetPassword3d">
            <i class="bi bi-eye-slash"></i>
          </button>
          <div class="error-message-3d">Por favor ingresa una nueva contraseña</div>
        </div>

        <button type="submit" class="btn-login-3d" id="btnReset3d">
          Restablecer Contraseña
        </button>
      </form>

      <div class="form-links-3d">
        <a class="form-link-3d primary" id="linkBackToLogin3d">
          ¿Recordaste tu contraseña? <strong>Inicia sesión</strong>
        </a>
      </div>
    `;
    
    document.getElementById('formContainer3d').innerHTML = html;
    setupFormHandlers();
  }

  // Configurar manejadores de formulario
  function setupFormHandlers() {
    // Toggle de contraseña
    const toggleBtns = document.querySelectorAll('.toggle-password-3d');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const icon = this.querySelector('i');
        
        if (input.type === 'password') {
          input.type = 'text';
          icon.className = 'bi bi-eye';
        } else {
          input.type = 'password';
          icon.className = 'bi bi-eye-slash';
        }
      });
    });

    // Limpiar errores al escribir
    const inputs = document.querySelectorAll('.form-input-3d');
    inputs.forEach(input => {
      input.addEventListener('input', function() {
        this.parentElement.classList.remove('error');
      });

      input.addEventListener('focus', function() {
        this.parentElement.classList.remove('error');
      });
    });

    // Submit de login
    const loginForm = document.getElementById('loginForm3d');
    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleLogin();
      });
    }

    // Submit de registro
    const registerForm = document.getElementById('registerForm3d');
    if (registerForm) {
      registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleRegister();
      });
    }

    // Submit de reset
    const resetForm = document.getElementById('resetForm3d');
    if (resetForm) {
      resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleReset();
      });
    }

    // Link para cambiar a registro
    const linkRegister = document.getElementById('linkRegister3d');
    if (linkRegister) {
      linkRegister.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarModal3D('registro');
      });
    }

    // Link para cambiar a login
    const linkLogin = document.getElementById('linkLogin3d');
    if (linkLogin) {
      linkLogin.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarModal3D('login');
      });
    }

    // Link para volver a login desde reset
    const linkBackToLogin = document.getElementById('linkBackToLogin3d');
    if (linkBackToLogin) {
      linkBackToLogin.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarModal3D('login');
      });
    }

    // Link para olvidó contraseña
    const linkForgot = document.getElementById('linkForgot3d');
    if (linkForgot) {
      linkForgot.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarModal3D('reset');
      });
    }
  }

  // Manejar login
  async function handleLogin() {
    const usernameGroup = document.getElementById('usernameGroup3d');
    const passwordGroup = document.getElementById('passwordGroup3d');
    const usernameInput = document.getElementById('username3d');
    const passwordInput = document.getElementById('password3d');
    const btnLogin = document.getElementById('btnLogin3d');

    // Limpiar errores
    usernameGroup.classList.remove('error');
    passwordGroup.classList.remove('error');

    const usuario = usernameInput.value.trim();
    const contrasena = passwordInput.value.trim();

    let hasError = false;

    if (!usuario) {
      usernameGroup.classList.add('error');
      hasError = true;
    }

    if (!contrasena) {
      passwordGroup.classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    // Mostrar loading
    btnLogin.classList.add('loading');
    btnLogin.textContent = '';

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || "Inicio de sesión exitoso", "success");
        
        localStorage.setItem("usuario", JSON.stringify({ 
          usuario: data.user.usuario, 
          correo: data.user.correo 
        }));

        sessionStorage.setItem('correo', data.user.correo);
        sessionStorage.setItem('usuario', data.user.usuario);
        sessionStorage.setItem('id_usuario', data.user.id_usuario);
        sessionStorage.setItem('rol', data.user.rol);

        cerrarModal3D();
        
        // Actualizar interfaz después de cerrar
        setTimeout(() => {
          if (typeof actualizarInterfaz === 'function') {
            actualizarInterfaz();
          }
        }, 300);

      } else {
        btnLogin.classList.remove('loading');
        btnLogin.textContent = 'Iniciar Sesión';
        showToast(data.error || "Usuario o contraseña incorrectos", "error");
      }
    } catch (err) {
      console.error(err);
      btnLogin.classList.remove('loading');
      btnLogin.textContent = 'Iniciar Sesión';
      showToast("Error al conectar con el servidor", "error");
    }
  }

  // Manejar registro
  async function handleRegister() {
    const nameGroup = document.getElementById('nameGroup3d');
    const emailGroup = document.getElementById('emailGroup3d');
    const passwordGroup = document.getElementById('passwordRegGroup3d');
    const nameInput = document.getElementById('name3d');
    const emailInput = document.getElementById('email3d');
    const passwordInput = document.getElementById('passwordReg3d');
    const btnRegister = document.getElementById('btnRegister3d');

    // Limpiar errores
    nameGroup.classList.remove('error');
    emailGroup.classList.remove('error');
    passwordGroup.classList.remove('error');

    const usuario = nameInput.value.trim();
    const correo = emailInput.value.trim();
    const contrasena = passwordInput.value.trim();

    let hasError = false;

    if (!usuario) {
      nameGroup.classList.add('error');
      hasError = true;
    }

    if (!correo || !correo.includes('@')) {
      emailGroup.classList.add('error');
      hasError = true;
    }

    if (!contrasena) {
      passwordGroup.classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    // Mostrar loading
    btnRegister.classList.add('loading');
    btnRegister.textContent = '';

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, correo, contrasena }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || "Usuario registrado correctamente", "success");
        
        localStorage.setItem("usuario", JSON.stringify({ usuario, correo }));
        sessionStorage.setItem('correo', correo);
        sessionStorage.setItem('usuario', usuario);

        cerrarModal3D();
        
        // Actualizar interfaz después de cerrar
        setTimeout(() => {
          if (typeof actualizarInterfaz === 'function') {
            actualizarInterfaz();
          }
        }, 300);

      } else {
        btnRegister.classList.remove('loading');
        btnRegister.textContent = 'Crear Cuenta';
        showToast(data.error || "Error al registrar usuario", "error");
      }
    } catch (err) {
      console.error(err);
      btnRegister.classList.remove('loading');
      btnRegister.textContent = 'Crear Cuenta';
      showToast("Error de conexión con el servidor", "error");
    }
  }

  // Manejar reset de contraseña
  async function handleReset() {
    const nameGroup = document.getElementById('resetNameGroup3d');
    const emailGroup = document.getElementById('resetEmailGroup3d');
    const passwordGroup = document.getElementById('resetPasswordGroup3d');
    const nameInput = document.getElementById('resetName3d');
    const emailInput = document.getElementById('resetEmail3d');
    const passwordInput = document.getElementById('resetPassword3d');
    const btnReset = document.getElementById('btnReset3d');

    // Limpiar errores
    nameGroup.classList.remove('error');
    emailGroup.classList.remove('error');
    passwordGroup.classList.remove('error');

    const nombre = nameInput.value.trim();
    const correo = emailInput.value.trim();
    const nuevaContrasena = passwordInput.value.trim();

    let hasError = false;

    if (!nombre) {
      nameGroup.classList.add('error');
      hasError = true;
    }

    if (!correo || !correo.includes('@')) {
      emailGroup.classList.add('error');
      hasError = true;
    }

    if (!nuevaContrasena) {
      passwordGroup.classList.add('error');
      hasError = true;
    }

    if (nuevaContrasena && nuevaContrasena.length < 6) {
      passwordGroup.classList.add('error');
      passwordGroup.querySelector('.error-message-3d').textContent = 'La contraseña debe tener al menos 6 caracteres';
      hasError = true;
    }

    if (hasError) return;

    // Mostrar loading
    btnReset.classList.add('loading');
    btnReset.textContent = '';

    try {
      const response = await fetch("/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, nuevaContrasena }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || "Contraseña actualizada correctamente", "success");
        cerrarModal3D();
        
        // Mostrar login después de 1 segundo
        setTimeout(() => {
          mostrarModal3D('login');
        }, 1000);

      } else {
        btnReset.classList.remove('loading');
        btnReset.textContent = 'Restablecer Contraseña';
        showToast(data.error || "No se pudo actualizar la contraseña", "error");
      }
    } catch (err) {
      console.error(err);
      btnReset.classList.remove('loading');
      btnReset.textContent = 'Restablecer Contraseña';
      showToast("Error de conexión con el servidor", "error");
    }
  }

})();