// ===== SISTEMA 3D PARA MODALES DE LOGIN Y REGISTRO =====

(function() {
  'use strict';

  // Variables globales
  let modal3dContainer = null;
  let loginCard3d = null;
  let currentModalType = 'login';
  let resetPendingEmail = null;

  document.addEventListener('DOMContentLoaded', function() {
    crearModal3D();
    setupEventListeners();
    procesarGoogleLoginPendiente();
  });

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
              <div class="login-section-3d">
                <div class="logo-3d">
                  <div class="logo-icon-3d">
                    <img alt="Icono" src="images/iconowhite.png">
                  </div>
                  <div class="logo-text-3d">ATTOMUSIC</div>
                </div>
                <h2 class="form-title-3d" id="formTitle3d">Login</h2>
                <div id="formContainer3d"></div>
              </div>
              <div class="welcome-section-3d">
                <div class="music-mascots-3d" aria-hidden="true">
                  <div class="music-mascot mascot-one">
                    <span class="mascot-head"></span><span class="mascot-body"></span><span class="mascot-arm left"></span><span class="mascot-arm right"></span><span class="mascot-leg left"></span><span class="mascot-leg right"></span>
                  </div>
                  <div class="music-mascot mascot-two">
                    <span class="mascot-head"></span><span class="mascot-body"></span><span class="mascot-arm left"></span><span class="mascot-arm right"></span><span class="mascot-leg left"></span><span class="mascot-leg right"></span>
                  </div>
                  <div class="music-note note-one">♪</div>
                  <div class="music-note note-two">♫</div>
                  <div class="music-note note-three">♬</div>
                </div>
                <h1 class="welcome-text-3d" id="welcomeText3d">WELCOME<br>BACK!</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estilos del medidor (inline para no depender de archivos externos) -->
      <style>
        /* ── Medidor de seguridad ── */
        .pass-strength-wrap {
          margin: 8px 0 4px;
          display: none;
        }
        .pass-strength-wrap.visible { display: block; }
        .pass-strength-bar-bg {
          height: 5px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .pass-strength-bar {
          height: 100%;
          border-radius: 99px;
          width: 0%;
          transition: width 0.35s ease, background 0.35s ease;
        }
        .pass-strength-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.03em;
        }
        .pass-reqs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          margin-top: 8px;
        }
        .pass-req {
          font-size: 0.71rem;
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255,255,255,0.35);
          transition: color 0.2s;
        }
        .pass-req.ok { color: #22c55e; }
        .pass-req i { font-size: 0.62rem; }

        /* ── Feedback de correo y confirmación ── */
        .av-feedback-3d {
          font-size: 0.73rem;
          font-weight: 600;
          margin: 4px 0 6px 2px;
          min-height: 14px;
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal3dContainer = document.getElementById('modal3dContainer');
    loginCard3d = document.getElementById('loginCard3d');
    crearParticulas();
    setup3DEffect();
  }

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

  function setup3DEffect() {
    const container = document.querySelector('.container-3d');
    if (window.innerWidth > 768) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
      } else {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        if (loginCard3d) loginCard3d.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
      }
    });
  }

  function handleMouseMove(e) {
    const rect = this.getBoundingClientRect();
    const rotateX = (e.clientY - rect.top - rect.height / 2) / 20;
    const rotateY = (rect.width / 2 - (e.clientX - rect.left)) / 20;
    loginCard3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  }

  function handleMouseLeave() {
    loginCard3d.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
  }

  function setupEventListeners() {
    document.addEventListener('click', function(e) {
      if (e.target.matches('#btn-login') || e.target.closest('#btn-login')) {
        e.preventDefault();
        mostrarModal3D('login');
      } else if (e.target.matches('#btn-register') || e.target.closest('#btn-register')) {
        e.preventDefault();
        mostrarModal3D('registro');
      }
    });

    document.getElementById('btnClose3d').addEventListener('click', cerrarModal3D);

    modal3dContainer.addEventListener('click', function(e) {
      if (e.target === modal3dContainer) cerrarModal3D();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal3dContainer.classList.contains('show')) cerrarModal3D();
    });
  }

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
      resetPendingEmail = null;
      cargarFormularioReset();
      document.getElementById('formTitle3d').textContent = 'Restablecer';
      document.getElementById('welcomeText3d').innerHTML = 'RESET<br>PASSWORD!';
    }
    modal3dContainer.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal3D() {
    modal3dContainer.classList.remove('show');
    document.body.style.overflow = '';
    document.getElementById('formContainer3d').innerHTML = '';
  }

  // ────────────────────────────────────────────────────────────
  // HELPERS DE VALIDACIÓN
  // ────────────────────────────────────────────────────────────

  function validarCorreo(correo) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(correo.trim());
  }

  function analizarPassword(pwd) {
    const reqs = {
      len:     pwd.length >= 8,
      upper:   /[A-Z]/.test(pwd),
      lower:   /[a-z]/.test(pwd),
      num:     /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };
    const score = Object.values(reqs).filter(Boolean).length;
    const niveles = [
      null,
      { label: 'Muy débil',  color: '#ef4444', w: '20%' },
      { label: 'Débil',      color: '#f97316', w: '40%' },
      { label: 'Regular',    color: '#eab308', w: '60%' },
      { label: 'Buena',      color: '#3b82f6', w: '80%' },
      { label: 'Fuerte 💪',  color: '#22c55e', w: '100%' }
    ];
    return { reqs, score, nivel: niveles[score] || niveles[1] };
  }

  function actualizarMedidor(pwd, prefijo) {
    const wrap  = document.getElementById(prefijo + '-sw');
    const bar   = document.getElementById(prefijo + '-bar');
    const label = document.getElementById(prefijo + '-label');
    if (!wrap) return;

    if (!pwd) { wrap.classList.remove('visible'); return; }
    wrap.classList.add('visible');

    const { reqs, nivel } = analizarPassword(pwd);
    bar.style.width      = nivel.w;
    bar.style.background = nivel.color;
    label.textContent    = nivel.label;
    label.style.color    = nivel.color;

    ['len','upper','lower','num','special'].forEach(key => {
      const el = document.getElementById(prefijo + '-req-' + key);
      if (!el) return;
      el.classList.toggle('ok', reqs[key]);
      el.querySelector('i').className = reqs[key] ? 'bi bi-check-circle-fill' : 'bi bi-circle-fill';
    });
  }

  // HTML del medidor reutilizable
  function htmlMedidor(prefijo) {
    return `
      <div class="pass-strength-wrap" id="${prefijo}-sw">
        <div class="pass-strength-bar-bg">
          <div class="pass-strength-bar" id="${prefijo}-bar"></div>
        </div>
        <span class="pass-strength-label" id="${prefijo}-label"></span>
        <div class="pass-reqs">
          <span class="pass-req" id="${prefijo}-req-len"><i class="bi bi-circle-fill"></i>8 caracteres mínimo</span>
          <span class="pass-req" id="${prefijo}-req-upper"><i class="bi bi-circle-fill"></i>Una mayúscula</span>
          <span class="pass-req" id="${prefijo}-req-lower"><i class="bi bi-circle-fill"></i>Una minúscula</span>
          <span class="pass-req" id="${prefijo}-req-num"><i class="bi bi-circle-fill"></i>Un número</span>
          <span class="pass-req" id="${prefijo}-req-special"><i class="bi bi-circle-fill"></i>Un símbolo (!@#...)</span>
        </div>
      </div>`;
  }

  function htmlGoogleButton() {
    return `
      <button type="button" class="btn-google-3d" id="btnGoogle3d">
        <span class="google-mark-3d">G</span>
        Continuar con Google
      </button>
      <div class="auth-divider-3d"><span>o</span></div>`;
  }

  async function procesarGoogleLoginPendiente() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('google_login');
    if (!code) return;

    try {
      const response = await fetch(`/auth/google/session/${encodeURIComponent(code)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Google login failed');

      localStorage.setItem("usuario", JSON.stringify({ usuario: data.user.usuario, correo: data.user.correo }));
      sessionStorage.setItem('correo', data.user.correo);
      sessionStorage.setItem('usuario', data.user.usuario);
      sessionStorage.setItem('id_usuario', data.user.id_usuario);
      sessionStorage.setItem('rol', data.user.rol);
      showToast(data.message || 'Inicio de sesion con Google exitoso', 'success');
      if (typeof actualizarInterfaz === 'function') actualizarInterfaz();
    } catch (err) {
      console.error(err);
      showToast('No se pudo completar el inicio con Google', 'error');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // ────────────────────────────────────────────────────────────
  // FORMULARIO LOGIN (sin cambios funcionales)
  // ────────────────────────────────────────────────────────────

  function cargarFormularioLogin() {
    document.getElementById('formContainer3d').innerHTML = `
      <form id="loginForm3d">
        <div class="input-group-3d" id="usernameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input type="text" class="form-input-3d" id="username3d" name="usuario" placeholder="Usuario" required>
          <div class="error-message-3d">Por favor ingresa tu usuario</div>
        </div>
        <div class="input-group-3d" id="passwordGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input type="password" class="form-input-3d" id="password3d" name="contrasena" placeholder="Contraseña" required>
          <button type="button" class="toggle-password-3d" id="togglePassword3d"><i class="bi bi-eye-slash"></i></button>
          <div class="error-message-3d">Por favor ingresa tu contraseña</div>
        </div>
        <button type="submit" class="btn-login-3d" id="btnLogin3d">Iniciar Sesión</button>
      </form>
      ${htmlGoogleButton()}
      <div class="form-links-3d">
        <a class="form-link-3d" id="linkForgot3d">¿Olvidaste tu contraseña?</a>
        <a class="form-link-3d primary" id="linkRegister3d">¿No tienes cuenta? <strong>Regístrate aquí</strong></a>
      </div>`;
    setupFormHandlers();
  }

  // ────────────────────────────────────────────────────────────
  // FORMULARIO REGISTRO ← con medidor + confirmación + correo
  // ────────────────────────────────────────────────────────────

  function cargarFormularioRegistro() {
    document.getElementById('formContainer3d').innerHTML = `
      <form id="registerForm3d" novalidate>

        <!-- Nombre -->
        <div class="input-group-3d" id="nameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input type="text" class="form-input-3d" id="name3d" name="usuario" placeholder="Nombre completo" required>
          <div class="error-message-3d">Por favor ingresa tu nombre</div>
        </div>

        <!-- Correo + feedback -->
        <div class="input-group-3d" id="emailGroup3d">
          <i class="bi bi-envelope-fill input-icon-3d"></i>
          <input type="email" class="form-input-3d" id="email3d" name="correo" placeholder="Correo electrónico" required>
          <div class="error-message-3d">Por favor ingresa un correo válido</div>
        </div>
        <div class="av-feedback-3d" id="reg-email-fb"></div>

        <!-- Contraseña + medidor -->
        <div class="input-group-3d" id="passwordRegGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input type="password" class="form-input-3d" id="passwordReg3d" name="contrasena" placeholder="Contraseña" required>
          <button type="button" class="toggle-password-3d" id="togglePasswordReg3d"><i class="bi bi-eye-slash"></i></button>
          <div class="error-message-3d">Por favor ingresa una contraseña segura</div>
        </div>
        ${htmlMedidor('reg')}

        <!-- Confirmar contraseña -->
        <div class="input-group-3d" id="confirmGroup3d">
          <i class="bi bi-shield-lock-fill input-icon-3d"></i>
          <input type="password" class="form-input-3d" id="confirmReg3d" placeholder="Confirmar contraseña" required>
          <button type="button" class="toggle-password-3d" id="toggleConfirmReg3d"><i class="bi bi-eye-slash"></i></button>
          <div class="error-message-3d">Las contraseñas no coinciden</div>
        </div>
        <div class="av-feedback-3d" id="reg-confirm-fb"></div>

        <button type="submit" class="btn-login-3d" id="btnRegister3d">Crear Cuenta</button>
      </form>
      ${htmlGoogleButton()}
      <div class="form-links-3d">
        <a class="form-link-3d primary" id="linkLogin3d">¿Ya tienes cuenta? <strong>Inicia sesión</strong></a>
      </div>`;

    setupFormHandlers();

    // Eventos en tiempo real — contraseña
    const passInput    = document.getElementById('passwordReg3d');
    const confirmInput = document.getElementById('confirmReg3d');
    const emailInput   = document.getElementById('email3d');

    passInput.addEventListener('input', () => {
      actualizarMedidor(passInput.value, 'reg');
      if (confirmInput.value) actualizarConfirmFeedback();
    });

    confirmInput.addEventListener('input', actualizarConfirmFeedback);

    function actualizarConfirmFeedback() {
      const fb = document.getElementById('reg-confirm-fb');
      if (!confirmInput.value) { fb.textContent = ''; return; }
      const ok = passInput.value === confirmInput.value;
      fb.textContent = ok ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden';
      fb.style.color = ok ? '#22c55e' : '#ef4444';
    }

    // Eventos en tiempo real — correo
    emailInput.addEventListener('input', () => {
      const fb = document.getElementById('reg-email-fb');
      if (!emailInput.value) { fb.textContent = ''; return; }
      const ok = validarCorreo(emailInput.value);
      fb.textContent = ok ? '✓ Correo válido' : '✗ Ingresa un correo válido (ej: usuario@gmail.com)';
      fb.style.color = ok ? '#22c55e' : '#ef4444';
    });
  }

  // ────────────────────────────────────────────────────────────
  // FORMULARIO RESTABLECER ← con medidor + correo
  // ────────────────────────────────────────────────────────────

  function cargarFormularioReset() {
    document.getElementById('formContainer3d').innerHTML = `
      <p class="info-text-3d" id="resetInfo3d">Ingresa tus datos para recibir un codigo de confirmacion</p>
      <form id="resetForm3d" novalidate>

        <!-- Nombre -->
        <div class="input-group-3d" id="resetNameGroup3d">
          <i class="bi bi-person-fill input-icon-3d"></i>
          <input type="text" class="form-input-3d" id="resetName3d" placeholder="Nombre de usuario" required>
          <div class="error-message-3d">Por favor ingresa tu nombre de usuario</div>
        </div>

        <!-- Correo + feedback -->
        <div class="input-group-3d" id="resetEmailGroup3d">
          <i class="bi bi-envelope-fill input-icon-3d"></i>
          <input type="email" class="form-input-3d" id="resetEmail3d" placeholder="Correo electrónico" required>
          <div class="error-message-3d">Por favor ingresa tu correo</div>
        </div>
        <div class="av-feedback-3d" id="reset-email-fb"></div>

        <!-- Nueva contraseña + medidor -->
        <div class="input-group-3d" id="resetPasswordGroup3d">
          <i class="bi bi-lock-fill input-icon-3d"></i>
          <input type="password" class="form-input-3d" id="resetPassword3d" placeholder="Nueva contraseña" required>
          <button type="button" class="toggle-password-3d" id="toggleResetPassword3d"><i class="bi bi-eye-slash"></i></button>
          <div class="error-message-3d">La contraseña es muy débil</div>
        </div>
        ${htmlMedidor('reset')}

        <div class="input-group-3d" id="resetCodeGroup3d" style="display:none;">
          <i class="bi bi-key-fill input-icon-3d"></i>
          <input type="text" inputmode="numeric" maxlength="6" class="form-input-3d" id="resetCode3d" placeholder="Codigo de 6 digitos">
          <div class="error-message-3d">Ingresa el codigo de 6 digitos</div>
        </div>

        <button type="submit" class="btn-login-3d" id="btnReset3d">Enviar Codigo</button>
      </form>
      <div class="form-links-3d">
        <a class="form-link-3d primary" id="linkBackToLogin3d">¿Recordaste tu contraseña? <strong>Inicia sesión</strong></a>
      </div>`;

    setupFormHandlers();

    // Medidor en tiempo real
    const passInput  = document.getElementById('resetPassword3d');
    const emailInput = document.getElementById('resetEmail3d');

    passInput.addEventListener('input', () => actualizarMedidor(passInput.value, 'reset'));

    emailInput.addEventListener('input', () => {
      const fb = document.getElementById('reset-email-fb');
      if (!emailInput.value) { fb.textContent = ''; return; }
      const ok = validarCorreo(emailInput.value);
      fb.textContent = ok ? '✓ Correo válido' : '✗ Ingresa un correo válido (ej: usuario@gmail.com)';
      fb.style.color = ok ? '#22c55e' : '#ef4444';
    });
  }

  // ────────────────────────────────────────────────────────────
  // SETUP HANDLERS (toggles + submit routing)
  // ────────────────────────────────────────────────────────────

  function setupFormHandlers() {
    // Toggle visibilidad de contraseñas
    document.querySelectorAll('.toggle-password-3d').forEach(btn => {
      btn.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const icon  = this.querySelector('i');
        input.type  = input.type === 'password' ? 'text' : 'password';
        icon.className = input.type === 'password' ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    });

    // Limpiar error al escribir
    document.querySelectorAll('.form-input-3d').forEach(input => {
      input.addEventListener('input',  () => input.parentElement.classList.remove('error'));
      input.addEventListener('focus',  () => input.parentElement.classList.remove('error'));
    });

    // Submit handlers
    const loginForm    = document.getElementById('loginForm3d');
    const registerForm = document.getElementById('registerForm3d');
    const resetForm    = document.getElementById('resetForm3d');

    if (loginForm)    loginForm.addEventListener('submit',    e => { e.preventDefault(); handleLogin(); });
    if (registerForm) registerForm.addEventListener('submit', e => { e.preventDefault(); handleRegister(); });
    if (resetForm)    resetForm.addEventListener('submit',    e => { e.preventDefault(); handleReset(); });

    // Links de navegación entre formularios
    const linkRegister    = document.getElementById('linkRegister3d');
    const linkLogin       = document.getElementById('linkLogin3d');
    const linkForgot      = document.getElementById('linkForgot3d');
    const linkBackToLogin = document.getElementById('linkBackToLogin3d');

    if (linkRegister)    linkRegister.addEventListener('click',    e => { e.preventDefault(); mostrarModal3D('registro'); });
    if (linkLogin)       linkLogin.addEventListener('click',       e => { e.preventDefault(); mostrarModal3D('login'); });
    if (linkForgot)      linkForgot.addEventListener('click',      e => { e.preventDefault(); mostrarModal3D('reset'); });
    if (linkBackToLogin) linkBackToLogin.addEventListener('click', e => { e.preventDefault(); mostrarModal3D('login'); });

    const googleBtn = document.getElementById('btnGoogle3d');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        window.location.href = '/auth/google';
      });
    }
  }

  // ────────────────────────────────────────────────────────────
  // HANDLERS DE PETICIONES AL BACKEND
  // ────────────────────────────────────────────────────────────

  async function handleLogin() {
    const usernameGroup = document.getElementById('usernameGroup3d');
    const passwordGroup = document.getElementById('passwordGroup3d');
    const usernameInput = document.getElementById('username3d');
    const passwordInput = document.getElementById('password3d');
    const btnLogin      = document.getElementById('btnLogin3d');

    usernameGroup.classList.remove('error');
    passwordGroup.classList.remove('error');

    const usuario    = usernameInput.value.trim();
    const contrasena = passwordInput.value.trim();
    let hasError = false;

    if (!usuario)    { usernameGroup.classList.add('error'); hasError = true; }
    if (!contrasena) { passwordGroup.classList.add('error'); hasError = true; }
    if (hasError) return;

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
        localStorage.setItem("usuario", JSON.stringify({ usuario: data.user.usuario, correo: data.user.correo }));
        sessionStorage.setItem('correo',      data.user.correo);
        sessionStorage.setItem('usuario',     data.user.usuario);
        sessionStorage.setItem('id_usuario',  data.user.id_usuario);
        sessionStorage.setItem('rol',         data.user.rol);
        cerrarModal3D();
        setTimeout(() => { if (typeof actualizarInterfaz === 'function') actualizarInterfaz(); }, 300);
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

  async function handleRegister() {
    const nameGroup     = document.getElementById('nameGroup3d');
    const emailGroup    = document.getElementById('emailGroup3d');
    const passwordGroup = document.getElementById('passwordRegGroup3d');
    const confirmGroup  = document.getElementById('confirmGroup3d');
    const nameInput     = document.getElementById('name3d');
    const emailInput    = document.getElementById('email3d');
    const passwordInput = document.getElementById('passwordReg3d');
    const confirmInput  = document.getElementById('confirmReg3d');
    const btnRegister   = document.getElementById('btnRegister3d');

    nameGroup.classList.remove('error');
    emailGroup.classList.remove('error');
    passwordGroup.classList.remove('error');
    confirmGroup.classList.remove('error');

    const usuario    = nameInput.value.trim();
    const correo     = emailInput.value.trim();
    const contrasena = passwordInput.value;
    const confirm    = confirmInput.value;
    const { score }  = analizarPassword(contrasena);

    let error = null;

    if (!usuario) {
      nameGroup.classList.add('error');
      error = 'El nombre de usuario es obligatorio.';
    } else if (!validarCorreo(correo)) {
      emailGroup.classList.add('error');
      error = 'El correo electrónico no es válido.';
    } else if (score < 3) {
      passwordGroup.classList.add('error');
      error = 'La contraseña es muy débil. Agrega mayúsculas, números o símbolos.';
    } else if (contrasena !== confirm) {
      confirmGroup.classList.add('error');
      error = 'Las contraseñas no coinciden.';
    }

    if (error) { showToast(error, 'error'); return; }

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
        sessionStorage.setItem('correo',  correo);
        sessionStorage.setItem('usuario', usuario);
        cerrarModal3D();
        setTimeout(() => { if (typeof actualizarInterfaz === 'function') actualizarInterfaz(); }, 300);
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

  async function handleReset() {
    const nameGroup     = document.getElementById('resetNameGroup3d');
    const emailGroup    = document.getElementById('resetEmailGroup3d');
    const passwordGroup = document.getElementById('resetPasswordGroup3d');
    const codeGroup     = document.getElementById('resetCodeGroup3d');
    const nameInput     = document.getElementById('resetName3d');
    const emailInput    = document.getElementById('resetEmail3d');
    const passwordInput = document.getElementById('resetPassword3d');
    const codeInput     = document.getElementById('resetCode3d');
    const btnReset      = document.getElementById('btnReset3d');

    nameGroup.classList.remove('error');
    emailGroup.classList.remove('error');
    passwordGroup.classList.remove('error');
    codeGroup.classList.remove('error');

    const nombre          = nameInput.value.trim();
    const correo          = emailInput.value.trim();
    const nuevaContrasena = passwordInput.value;
    const codigo          = codeInput.value.trim();
    const { score }       = analizarPassword(nuevaContrasena);

    let error = null;

    if (!resetPendingEmail && !nombre) {
      nameGroup.classList.add('error');
      error = 'El nombre de usuario es obligatorio.';
    } else if (!resetPendingEmail && !validarCorreo(correo)) {
      emailGroup.classList.add('error');
      error = 'El correo electronico no es valido.';
    } else if (!resetPendingEmail && score < 3) {
      passwordGroup.classList.add('error');
      error = 'La contrasena es muy debil. Agrega mayusculas, numeros o simbolos.';
    } else if (resetPendingEmail && !/^\d{6}$/.test(codigo)) {
      codeGroup.classList.add('error');
      error = 'Ingresa el codigo de confirmacion de 6 digitos.';
    }

    if (error) { showToast(error, 'error'); return; }

    btnReset.classList.add('loading');
    btnReset.textContent = '';

    try {
      const endpoint = resetPendingEmail ? '/reset-password/confirm' : '/reset-password/request';
      const payload = resetPendingEmail ? { correo: resetPendingEmail, codigo } : { nombre, correo, nuevaContrasena };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        if (!resetPendingEmail) {
          resetPendingEmail = correo;
          document.getElementById('resetInfo3d').textContent = data.devCode
            ? `Codigo de prueba: ${data.devCode}. En produccion llegara por correo.`
            : 'Revisa tu correo e ingresa el codigo de 6 digitos.';
          codeGroup.style.display = 'block';
          nameInput.disabled = true;
          emailInput.disabled = true;
          passwordInput.disabled = true;
          btnReset.classList.remove('loading');
          btnReset.textContent = 'Confirmar Codigo';
          showToast(data.message || 'Codigo enviado', 'success');
        } else {
          showToast(data.message || 'Contrasena actualizada correctamente', 'success');
          resetPendingEmail = null;
          cerrarModal3D();
          setTimeout(() => mostrarModal3D('login'), 1000);
        }
      } else {
        btnReset.classList.remove('loading');
        btnReset.textContent = resetPendingEmail ? 'Confirmar Codigo' : 'Enviar Codigo';
        showToast(data.error || 'No se pudo actualizar la contrasena', 'error');
      }
    } catch (err) {
      console.error(err);
      btnReset.classList.remove('loading');
      btnReset.textContent = resetPendingEmail ? 'Confirmar Codigo' : 'Enviar Codigo';
      showToast('Error de conexion con el servidor', 'error');
    }
  }

})();
